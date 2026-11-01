package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type TransferRequest struct {
	ToEmail string `json:"to_email"`
	Amount  string `json:"amount"`
}

type DepositRequest struct {
	Amount string `json:"amount"`
}

type Transaction struct {
	ID        int64     `json:"id"`
	Type      string    `json:"type"`
	Amount    string    `json:"amount"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	Direction string    `json:"direction"`
}

// Up to 10 digits, optional 1-2 decimals. Compiled once.
var amountPattern = regexp.MustCompile(`^[0-9]{1,10}(\.[0-9]{1,2})?$`)

func validAmount(s string) bool {
	return amountPattern.MatchString(s) && strings.Trim(s, "0.") != ""
}

// readJSON decodes a small JSON body (64 KB max).
func readJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<16)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return false
	}
	return true
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := map[string]string{
		"status":  "success",
		"message": "MiniPay Ops backend is running",
	}

	json.NewEncoder(w).Encode(response)
}

// queryInt reads an integer query parameter, clamped to [min, max].
func queryInt(r *http.Request, key string, def, min, max int) int {
	v, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil {
		return def
	}
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// transactionsHandler lists the logged-in user's transactions with paging
// and filters:
//
//	?page=1&limit=10
//	&type=deposit|transfer|all
//	&direction=in|out|all
//	&from=<RFC3339 instant, inclusive>&to=<RFC3339 instant, exclusive>
//
// The wallet always comes from the session, never from the query.
// The total number of matching rows is returned in the X-Total-Count header.
func transactionsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		walletID, werr := walletIDFor(r.Context(), db, userIDFrom(r))
		if werr != nil {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		q := r.URL.Query()
		page := queryInt(r, "page", 1, 1, 100000)
		limit := queryInt(r, "limit", 100, 1, 100)
		offset := (page - 1) * limit

		// Build the WHERE clause from fixed fragments only; every value
		// goes in as a numbered parameter ($2, $3, ...), never as text.
		where := []string{"(from_wallet_id = $1 OR to_wallet_id = $1)"}
		args := []any{walletID}
		add := func(cond string, val any) {
			args = append(args, val)
			where = append(where, strings.Replace(cond, "?", "$"+strconv.Itoa(len(args)), 1))
		}

		switch t := q.Get("type"); t {
		case "", "all":
		case "deposit", "transfer":
			add("transaction_type = ?", t)
		default:
			http.Error(w, "Invalid type", http.StatusBadRequest)
			return
		}

		switch d := q.Get("direction"); d {
		case "", "all":
		case "in":
			where = append(where, "to_wallet_id = $1")
		case "out":
			where = append(where, "from_wallet_id = $1")
		default:
			http.Error(w, "Invalid direction", http.StatusBadRequest)
			return
		}

		var fromT, toT time.Time
		if s := q.Get("from"); s != "" {
			t, err := time.Parse(time.RFC3339, s)
			if err != nil {
				http.Error(w, "Invalid from date", http.StatusBadRequest)
				return
			}
			fromT = t
			add("created_at >= ?", t)
		}
		if s := q.Get("to"); s != "" {
			t, err := time.Parse(time.RFC3339, s)
			if err != nil {
				http.Error(w, "Invalid to date", http.StatusBadRequest)
				return
			}
			toT = t
			add("created_at < ?", t)
		}
		if !fromT.IsZero() && !toT.IsZero() && !fromT.Before(toT) {
			http.Error(w, "Invalid date range", http.StatusBadRequest)
			return
		}

		whereSQL := strings.Join(where, " AND ")

		var total int
		err := db.QueryRowContext(
			r.Context(),
			"SELECT COUNT(*) FROM transactions WHERE "+whereSQL,
			args...,
		).Scan(&total)
		if err != nil {
			log.Printf("Transaction count failed: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		listArgs := append(append([]any{}, args...), limit, offset)
		rows, err := db.QueryContext(
			r.Context(),
			`SELECT id, transaction_type, amount::text, status, created_at,
			        CASE WHEN to_wallet_id = $1 THEN 'in' ELSE 'out' END
			 FROM transactions
			 WHERE `+whereSQL+`
			 ORDER BY created_at DESC, id DESC
			 LIMIT $`+strconv.Itoa(len(args)+1)+` OFFSET $`+strconv.Itoa(len(args)+2),
			listArgs...,
		)
		if err != nil {
			log.Printf("Transaction query failed: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		transactions := make([]Transaction, 0)
		for rows.Next() {
			var t Transaction
			if err := rows.Scan(&t.ID, &t.Type, &t.Amount, &t.Status, &t.CreatedAt, &t.Direction); err != nil {
				log.Printf("Transaction scan failed: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			transactions = append(transactions, t)
		}
		if err := rows.Err(); err != nil {
			log.Printf("Transaction rows failed: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Total-Count", strconv.Itoa(total))
		json.NewEncoder(w).Encode(transactions)
	}
}

// depositHandler is a DEMO feature: it creates money out of thin air.
// It is only registered when ALLOW_DEMO_DEPOSITS=true (see main).
func depositHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "Method not allowed",
				http.StatusMethodNotAllowed)
			return
		}

		var req DepositRequest
		if !readJSON(w, r, &req) {
			return
		}

		if !validAmount(req.Amount) {
			http.Error(w, "Invalid deposit amount",
				http.StatusBadRequest)
			return
		}

		// The wallet always comes from the logged-in user, never the body.
		walletID, werr := walletIDFor(r.Context(), db, userIDFrom(r))
		if werr != nil {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			http.Error(w, "Could not begin transaction",
				http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		var balance string
		var currency string

		err = tx.QueryRowContext(
			r.Context(),
			`UPDATE wallets
			 SET balance = balance + $1::numeric
			 WHERE id = $2
			 RETURNING balance::text, currency`,
			req.Amount,
			walletID,
		).Scan(&balance, &currency)

		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("Wallet update failed: %v", err)
			http.Error(w, "Could not update wallet",
				http.StatusInternalServerError)
			return
		}

		var transactionID int64

		err = tx.QueryRowContext(
			r.Context(),
			`INSERT INTO transactions
			    (transaction_type, from_wallet_id, to_wallet_id,
			     amount, status)
			 VALUES ('deposit', NULL, $1, $2::numeric, 'completed')
			 RETURNING id`,
			walletID,
			req.Amount,
		).Scan(&transactionID)
		if err != nil {
			log.Printf("Transaction insert failed: %v", err)
			http.Error(w, "Could not record deposit",
				http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			log.Printf("Deposit commit failed: %v", err)
			http.Error(w, "Could not complete deposit",
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)

		json.NewEncoder(w).Encode(map[string]any{
			"transaction_id": transactionID,
			"wallet_id":      walletID,
			"amount":         req.Amount,
			"balance":        balance,
			"currency":       currency,
			"status":         "completed",
		})
	}
}

func transferHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "Method not allowed",
				http.StatusMethodNotAllowed)
			return
		}

		var req TransferRequest
		if !readJSON(w, r, &req) {
			return
		}

		toEmail := strings.ToLower(strings.TrimSpace(req.ToEmail))
		if toEmail == "" || len(toEmail) > 254 {
			http.Error(w, "Recipient email is required",
				http.StatusBadRequest)
			return
		}
		if !validAmount(req.Amount) {
			http.Error(w, "Invalid transfer amount",
				http.StatusBadRequest)
			return
		}

		ctx := r.Context()

		// Sender wallet comes from the logged-in user, never the body.
		fromID, err := walletIDFor(ctx, db, userIDFrom(r))
		if err != nil {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		// Recipient is resolved server-side by email, active users only.
		// The same generic message is returned for every failure to find
		// them, so this cannot be used to probe which emails exist.
		var toID int64
		err = db.QueryRowContext(
			ctx,
			`SELECT w.id
			 FROM wallets w
			 JOIN users u ON u.id = w.user_id
			 WHERE LOWER(u.email) = $1
			   AND u.status = 'active'
			   AND w.currency = 'INR'`,
			toEmail,
		).Scan(&toID)
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Recipient not found", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("Recipient lookup failed: %v", err)
			http.Error(w, "Database error",
				http.StatusInternalServerError)
			return
		}
		if toID == fromID {
			http.Error(w, "You cannot send money to yourself",
				http.StatusBadRequest)
			return
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Could not start transaction",
				http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// Lock both wallets in ID order to reduce deadlock risk.
		rows, err := tx.QueryContext(
			ctx,
			`SELECT id, currency
			 FROM wallets
			 WHERE id IN ($1, $2)
			 ORDER BY id
			 FOR UPDATE`,
			fromID,
			toID,
		)
		if err != nil {
			log.Printf("Could not lock wallets: %v", err)
			http.Error(w, "Database error",
				http.StatusInternalServerError)
			return
		}

		currencies := make(map[int64]string)
		for rows.Next() {
			var id int64
			var currency string

			if err := rows.Scan(&id, &currency); err != nil {
				rows.Close()
				http.Error(w, "Database error",
					http.StatusInternalServerError)
				return
			}

			currencies[id] = currency
		}

		rowsErr := rows.Err()
		rows.Close()

		if rowsErr != nil {
			log.Printf("Could not read wallets: %v", rowsErr)
			http.Error(w, "Database error",
				http.StatusInternalServerError)
			return
		}

		if len(currencies) != 2 {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		if currencies[fromID] != currencies[toID] {
			http.Error(w, "Wallet currencies do not match",
				http.StatusUnprocessableEntity)
			return
		}

		// Debit the sender only if sufficient funds exist.
		result, err := tx.ExecContext(
			ctx,
			`UPDATE wallets
			 SET balance = balance - $1::numeric
			 WHERE id = $2 AND balance >= $1::numeric`,
			req.Amount,
			fromID,
		)
		if err != nil {
			log.Printf("Sender update failed: %v", err)
			http.Error(w, "Could not update sender",
				http.StatusInternalServerError)
			return
		}

		affected, err := result.RowsAffected()
		if err != nil {
			http.Error(w, "Database error",
				http.StatusInternalServerError)
			return
		}
		if affected != 1 {
			http.Error(w, "Insufficient funds",
				http.StatusUnprocessableEntity)
			return
		}

		// Credit the receiver.
		_, err = tx.ExecContext(
			ctx,
			`UPDATE wallets
			 SET balance = balance + $1::numeric
			 WHERE id = $2`,
			req.Amount,
			toID,
		)
		if err != nil {
			log.Printf("Receiver update failed: %v", err)
			http.Error(w, "Could not update receiver",
				http.StatusInternalServerError)
			return
		}

		// Record the transfer in the same database transaction.
		var transactionID int64
		err = tx.QueryRowContext(
			ctx,
			`INSERT INTO transactions
			    (transaction_type, from_wallet_id, to_wallet_id,
			     amount, status)
			 VALUES ('transfer', $1, $2, $3::numeric, 'completed')
			 RETURNING id`,
			fromID,
			toID,
			req.Amount,
		).Scan(&transactionID)
		if err != nil {
			log.Printf("Could not record transfer: %v", err)
			http.Error(w, "Could not record transfer",
				http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			log.Printf("Transfer commit failed: %v", err)
			http.Error(w, "Could not complete transfer",
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)

		json.NewEncoder(w).Encode(map[string]any{
			"transaction_id": transactionID,
			"to_email":       toEmail,
			"amount":         req.Amount,
			"status":         "completed",
		})
	}
}

func main() {
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		log.Fatal("DB_PASSWORD is not set in this terminal")
	}
	if internalSecret == "" {
		log.Fatal("INTERNAL_API_SECRET is not set in this terminal")
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
		log.Println("WARNING: DB_USER not set, using postgres. " +
			"Switch to a limited role (minipay_app).")
	}

	dsn := (&url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(dbUser, password),
		Host:     "localhost:5432",
		Path:     "/minipay_ops",
		RawQuery: "sslmode=disable",
	}).String()

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal("Could not open database: ", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatal("Could not connect to PostgreSQL: ", err)
	}

	log.Println("Connected to minipay_ops successfully")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/internal/users/sync", syncUserHandler(db))
	mux.HandleFunc("/api/me", requireUser(db, meHandler(db)))
	mux.HandleFunc("/api/transactions", requireUser(db, transactionsHandler(db)))
	mux.HandleFunc("/api/transfers", requireUser(db, transferHandler(db)))

	// Demo-only: lets users add money to their own wallet.
	if os.Getenv("ALLOW_DEMO_DEPOSITS") == "true" {
		mux.HandleFunc("/api/deposits", requireUser(db, depositHandler(db)))
		log.Println("WARNING: demo deposits are ENABLED")
	}

	srv := &http.Server{
		Addr:              "127.0.0.1:8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Println("Server running at http://127.0.0.1:8080")

	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
