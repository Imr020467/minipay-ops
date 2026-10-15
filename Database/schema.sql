
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CHECK (balance >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, currency)
);

CREATE TABLE transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN ('transfer', 'deposit', 'withdrawal')),
    from_wallet_id BIGINT REFERENCES wallets(id),
    to_wallet_id BIGINT REFERENCES wallets(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (transaction_type = 'transfer'
            AND from_wallet_id IS NOT NULL
            AND to_wallet_id IS NOT NULL
            AND from_wallet_id <> to_wallet_id)
        OR
        (transaction_type = 'deposit'
            AND from_wallet_id IS NULL
            AND to_wallet_id IS NOT NULL)
        OR
        (transaction_type = 'withdrawal'
            AND from_wallet_id IS NOT NULL
            AND to_wallet_id IS NULL)
    )
);

CREATE INDEX idx_wallets_user_id
    ON wallets(user_id);

CREATE INDEX idx_transactions_from_wallet
    ON transactions(from_wallet_id);

CREATE INDEX idx_transactions_to_wallet
    ON transactions(to_wallet_id);
