-- orders schema, exported from a CockroachDB 24.1 cluster
SET CLUSTER SETTING diagnostics.reporting.enabled = false;

CREATE TABLE orders (
  id INT PRIMARY KEY DEFAULT unique_rowid(),
  customer_id UUID NOT NULL,
  status STRING NOT NULL DEFAULT 'new',
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX orders_customer_idx (customer_id)
);

UPSERT INTO orders (id, customer_id, status, total)
VALUES (1, '4f1c2b7e-0d5a-4c1e-9b3a-2f6e8d7c1a90', 'paid', 42.00);
