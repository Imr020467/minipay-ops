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

type Wallet struct {
	ID       int64  `json:"id"`
	UserID   int64  `json:"user_id"`
	Balance  string `json:"balance"`
	Currency string `json:"currency"`
}
type TransferRequest struct {
	FromWalletID int64  `json:"from_wallet_id"`
	ToWalletID   int64  `json:"to_wallet_id"`
	Amount       string `json:"amount"`
}
type Transaction struct {
	ID        int64     `json:"id"`
	Type      string    `json:"type"`
	Amount    string    `json:"amount"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
type DepositRequest struct {
	WalletID int64  `json:"wallet_id"`
	Amount   string `json:"amount"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := map[string]string{
		"status":  "success",
		"message": "MiniPay Ops backend is running",
	}

	json.NewEncoder(w).Encode(response)
}

func walletHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		idText := strings.TrimPrefix(r.URL.Path, "/api/wallets/")
		walletID, err := strconv.ParseInt(idText, 10, 64)

		if err != nil || walletID <= 0 {
			http.Error(w, "Invalid wallet ID", http.StatusBadRequest)
			return
		}

		var wallet Wallet

		err = db.QueryRowContext(
			r.Context(),
			`SELECT id, user_id, balance::text, currency
			 FROM wallets
			 WHERE id = $1`,
			walletID,
		).Scan(
			&wallet.ID,
			&wallet.UserID,
			&wallet.Balance,
			&wallet.Currency,
		)

		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		if err != nil {
			log.Printf("Wallet query failed: %v", err)
			http.Error(w, "Internal server error",
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(wallet)
	}
}
func transactionsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed",
				http.StatusMethodNotAllowed)
			return
		}

		rows, err := db.QueryContext(
			r.Context(),
			`SELECT id, transaction_type, amount::text,
                    status, created_at
             FROM transactions
             ORDER BY created_at DESC, id DESC
             LIMIT 100`,
		)

		if err != nil {
			log.Printf("Transaction query failed: %v", err)
			http.Error(w, "Internal server error",
				http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		transactions := make([]Transaction, 0)

		for rows.Next() {
			var t Transaction

			if err := rows.Scan(
				&t.ID,
				&t.Type,
				&t.Amount,
				&t.Status,
				&t.CreatedAt,
			); err != nil {
				log.Printf("Transaction scan failed: %v", err)
				http.Error(w, "Internal server error",
					http.StatusInternalServerError)
				return
			}

			transactions = append(transactions, t)
		}

		if err := rows.Err(); err != nil {
			log.Printf("Transaction rows failed: %v", err)
			http.Error(w, "Internal server error",
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(transactions)
	}
}

func depositHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "Method not allowed",
				http.StatusMethodNotAllowed)
			return
		}

		var req DepositRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON request",
				http.StatusBadRequest)
			return
		}

		if req.WalletID <= 0 {
			http.Error(w, "Invalid wallet ID",
				http.StatusBadRequest)
			return
		}

		amountValue, err := strconv.ParseFloat(req.Amount, 64)
		if err != nil || amountValue <= 0 ||
			amountValue > 9999999999.99 {
			http.Error(w, "Invalid deposit amount",
				http.StatusBadRequest)
			return
		}

		// Require a decimal format with at most 2 decimal places.
		validAmount := regexp.MustCompile(`^[0-9]+(\.[0-9]{1,2})?$`)
		if !validAmount.MatchString(req.Amount) {
			http.Error(w, "Amount must have at most 2 decimal places",
				http.StatusBadRequest)
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
			req.WalletID,
		).Scan(&balance, &currency)

		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Wallet not found",
				http.StatusNotFound)
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
			req.WalletID,
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
			"wallet_id":      req.WalletID,
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

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON",
				http.StatusBadRequest)
			return
		}

		if req.FromWalletID <= 0 ||
			req.ToWalletID <= 0 ||
			req.FromWalletID == req.ToWalletID {
			http.Error(w, "Invalid wallet IDs",
				http.StatusBadRequest)
			return
		}

		amountPattern := regexp.MustCompile(`^[0-9]{1,10}(\.[0-9]{1,2})?$`)
		if !amountPattern.MatchString(req.Amount) ||
			strings.Trim(req.Amount, "0.") == "" {
			http.Error(w, "Invalid transfer amount",
				http.StatusBadRequest)
			return
		}

		ctx := r.Context()

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
			req.FromWalletID,
			req.ToWalletID,
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
			http.Error(w, "Wallet not found",
				http.StatusNotFound)
			return
		}

		if currencies[req.FromWalletID] != currencies[req.ToWalletID] {
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
			req.FromWalletID,
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
			req.ToWalletID,
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
			req.FromWalletID,
			req.ToWalletID,
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
			"from_wallet_id": req.FromWalletID,
			"to_wallet_id":   req.ToWalletID,
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

	dsn := (&url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword("postgres", password),
		Host:     "localhost:5432",
		Path:     "/minipay_ops",
		RawQuery: "sslmode=disable",
	}).String()

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal("Could not open database: ", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Could not connect to PostgreSQL: ", err)
	}

	log.Println("Connected to minipay_ops successfully")

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/wallets/", walletHandler(db))
	http.HandleFunc("/api/transactions", transactionsHandler(db))
	http.HandleFunc("/api/deposits", depositHandler(db))
	http.HandleFunc("/api/transfers", transferHandler(db))

	log.Println("Server running at http://localhost:8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
