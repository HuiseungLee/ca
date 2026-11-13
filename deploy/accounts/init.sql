-- Used both on first initialization and by foredu-start.sh to repair an existing
-- database. Never reset credentials or alter an already-existing role.
DO $foredu$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
    -- GoTrue's grants migration references this name even with a custom DB user.
    -- It is only a grant target here, not a new administrator/login account.
    CREATE ROLE postgres NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$foredu$;

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION foredu_auth;
