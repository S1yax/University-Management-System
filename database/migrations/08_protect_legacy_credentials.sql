BEGIN;

-- Some installations also have the upstream password prototype. Keep its data
-- and tests available to database owners while restricting public API roles.
DO $$
DECLARE
    relation text;
    routine text;
    client_role text;
BEGIN
    FOREACH relation IN ARRAY ARRAY['user_credentials', 'password_history'] LOOP
        IF to_regclass(format('%I.%I', current_schema(), relation)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', current_schema(), relation);
        EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', current_schema(), relation);
        FOR client_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
            EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I', current_schema(), relation, client_role);
        END LOOP;
    END LOOP;

    FOREACH routine IN ARRAY ARRAY['set_password(varchar,text,text,integer)', 'login_failed(varchar)', 'login_ok(varchar)'] LOOP
        IF to_regprocedure(format('%I.%s', current_schema(), routine)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%s FROM PUBLIC', current_schema(), routine);
        FOR client_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
            EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%s FROM %I', current_schema(), routine, client_role);
        END LOOP;
    END LOOP;
END;
$$;

COMMIT;
