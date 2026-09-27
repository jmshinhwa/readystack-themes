-- 014_patients.sql : patient portal accounts and clinical notes
CREATE TABLE patients (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    full_name        VARCHAR(200) NOT NULL,
    date_of_birth    DATE,
    national_id      VARCHAR(32),
    password         VARCHAR(255) NOT NULL,
    ip_address       INET,
    stripe_customer_id VARCHAR(64),
    is_deleted       BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE visits (
    id               BIGSERIAL PRIMARY KEY,
    patient_id       BIGINT REFERENCES patients(id),
    diagnosis        TEXT,
    visited_at       TIMESTAMP NOT NULL
);

CREATE TABLE patients_audit (
    audit_id         BIGSERIAL PRIMARY KEY,
    changed_at       TIMESTAMP DEFAULT now()
);
