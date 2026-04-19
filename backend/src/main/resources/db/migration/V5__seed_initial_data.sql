-- V5 originally seeded default `admin/admin123` and `staff/admin123` accounts,
-- which was a critical vulnerability (C-2): every fresh deployment shipped with
-- well-known credentials documented in the README.
--
-- Those seeds have been removed. A single admin is now provisioned by
-- AdminBootstrapService at application startup, using BOOTSTRAP_ADMIN_USERNAME /
-- BOOTSTRAP_ADMIN_PASSWORD env vars. The bootstrap only runs when the users
-- table is empty, so replaying this migration on an existing database is safe.
--
-- Any pre-existing `admin` or `staff` accounts with the old hash are disabled
-- here so old deployments that inherited this secret no longer grant access
-- after this migration runs.
UPDATE users
SET enabled = FALSE
WHERE username IN ('admin', 'staff')
  AND password = '$2a$10$5lFw/NWEHzFuTkcMzG.yce/U2rqGY3BPkLAAPFaOGddS4KJxYp4KG';
