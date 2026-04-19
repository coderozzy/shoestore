-- H-8: stamp every JWT with a per-user token_version. Bumping the column
-- instantly revokes all tokens previously issued to that user (logout, staff
-- disable, password change).
ALTER TABLE users
    ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0;
