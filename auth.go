package main

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

var internalSecret = os.Getenv("INTERNAL_API_SECRET")

func checkSecret(r *http.Request) bool {
	got := r.Header.Get("X-Internal-Secret")
	return internalSecret != "" &&
		subtle.ConstantTimeCompare([]byte(got), []byte(internalSecret)) == 1
}

func walletIDFor(ctx context.Context, db *sql.DB, userID int64) (int64, error) {
	var id int64
	err := db.QueryRowContext(
		ctx,
		`SELECT id FROM wallets WHERE user_id = $1 AND currency = 'INR'`,
		userID,
	).Scan(&id)
	return id, err
}

// findOrCreateUser returns the user for a Google account:
// 1. a returning user (matched by Google ID),
// 2. an existing row with the same email (your first account),
// 3. otherwise a brand new user. The database trigger creates the wallet.
func findOrCreateUser(ctx context.Context, db *sql.DB, sub, email, name, picture string) (int64, string, error) {
	for attempt := 0; attempt < 2; attempt++ {
		var id int64
		var status string

		err := db.QueryRowContext(
			ctx,
			`UPDATE users SET avatar_url = $2, updated_at = now()
			 WHERE google_sub = $1 RETURNING id, status`,
			sub, picture,
		).Scan(&id, &status)
		if err == nil {
			return id, status, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return 0, "", err
		}

		err = db.QueryRowContext(
			ctx,
			`UPDATE users SET google_sub = $1, avatar_url = $3, updated_at = now()
			 WHERE LOWER(email) = $2 AND google_sub IS NULL RETURNING id, status`,
			sub, email, picture,
		).Scan(&id, &status)
		if err == nil {
			return id, status, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return 0, "", err
		}

		err = db.QueryRowContext(
			ctx,
			`INSERT INTO users (name, email, google_sub, avatar_url)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT DO NOTHING RETURNING id, status`,
			name, email, sub, picture,
		).Scan(&id, &status)
		if err == nil {
			return id, status, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return 0, "", err
		}
		// Another request created the user first, so loop and find it.
	}
	return 0, "", errors.New("could not find or create user")
}

func syncUserHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if !checkSecret(r) {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Sub     string `json:"sub"`
			Email   string `json:"email"`
			Name    string `json:"name"`
			Picture string `json:"picture"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<16)
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		email := strings.ToLower(strings.TrimSpace(req.Email))
		name := strings.TrimSpace(req.Name)
		if req.Sub == "" || email == "" {
			http.Error(w, "Missing identity", http.StatusBadRequest)
			return
		}
		if name == "" {
			name = email
		}

		userID, status, err := findOrCreateUser(r.Context(), db, req.Sub, email, name, req.Picture)
		if err != nil {
			log.Printf("User sync failed: %v", err)
			http.Error(w, "Could not sign in", http.StatusInternalServerError)
			return
		}
		if status != "active" {
			http.Error(w, "Account suspended", http.StatusForbidden)
			return
		}

		walletID, err := walletIDFor(r.Context(), db, userID)
		if err != nil {
			log.Printf("Wallet lookup failed: %v", err)
			http.Error(w, "Could not sign in", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int64{
			"user_id":   userID,
			"wallet_id": walletID,
		})
	}
}

type ctxKey string

const userIDKey ctxKey = "userID"

// requireUser lets through only requests from the Next.js server, for a
// user who still exists and is active, and stores the user's ID in the
// request. The status check means suspending a user takes effect
// immediately, even if their session cookie is still valid.
func requireUser(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !checkSecret(r) {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		id, err := strconv.ParseInt(r.Header.Get("X-User-ID"), 10, 64)
		if err != nil || id <= 0 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var status string
		err = db.QueryRowContext(
			r.Context(),
			`SELECT status FROM users WHERE id = $1`,
			id,
		).Scan(&status)
		if err != nil || status != "active" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, id)
		next(w, r.WithContext(ctx))
	}
}

func userIDFrom(r *http.Request) int64 {
	id, _ := r.Context().Value(userIDKey).(int64)
	return id
}

func meHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var out struct {
			UserID   int64  `json:"user_id"`
			Name     string `json:"name"`
			Email    string `json:"email"`
			WalletID int64  `json:"wallet_id"`
			Balance  string `json:"balance"`
			Currency string `json:"currency"`
		}

		err := db.QueryRowContext(
			r.Context(),
			`SELECT u.id, COALESCE(u.name, ''), COALESCE(u.email, ''),
			        w.id, w.balance::text, w.currency
			 FROM users u
			 JOIN wallets w ON w.user_id = u.id AND w.currency = 'INR'
			 WHERE u.id = $1`,
			userIDFrom(r),
		).Scan(&out.UserID, &out.Name, &out.Email, &out.WalletID, &out.Balance, &out.Currency)

		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("Me query failed: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
	}
}