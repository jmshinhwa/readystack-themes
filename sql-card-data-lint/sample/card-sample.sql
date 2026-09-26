-- 0007_payments.sql
-- Generated from a prompt: "add card storage for saved payment methods"
BEGIN;

CREATE TABLE customer_cards (
    id            BIGSERIAL PRIMARY KEY,
    customer_id   BIGINT NOT NULL REFERENCES customers (id),
    card_number   VARCHAR(19) NOT NULL,
    cvv           CHAR(4),
    pin_block     CHAR(16),
    track2_data   VARCHAR(40),
    exp_month     SMALLINT,
    exp_year      SMALLINT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_customer_cards_pan ON customer_cards (card_number);

CREATE TABLE payment_audit_log (
    id                BIGSERIAL PRIMARY KEY,
    customer_id       BIGINT NOT NULL,
    card_number       VARCHAR(19),
    gateway_response  JSONB,
    logged_at         TIMESTAMPTZ DEFAULT now()
);

CREATE VIEW v_recent_charges AS
    SELECT c.customer_id, c.card_number, ch.amount, ch.captured_at
    FROM customer_cards c
    JOIN charges ch ON ch.customer_id = c.customer_id;

INSERT INTO customer_cards (customer_id, card_number, cvv, exp_month, exp_year)
VALUES (1, '4111111111111111', '123', 12, 2029);

COMMIT;
