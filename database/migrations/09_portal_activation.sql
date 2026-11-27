BEGIN;

CREATE TABLE IF NOT EXISTS portal_account_activation (
    username text PRIMARY KEY REFERENCES portal_credentials(username) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL
);

ALTER TABLE portal_account_activation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON portal_account_activation FROM PUBLIC;

DO $$
DECLARE role_name text;
BEGIN
    FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format('REVOKE ALL ON portal_account_activation FROM %I', role_name);
    END LOOP;
END;
$$;

COMMIT;
