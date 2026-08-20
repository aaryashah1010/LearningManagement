-- Local dev seed data.
--
-- The first teacher account can't come through POST /api/accounts/teachers (it
-- always requires an already-logged-in teacher) — it's seeded directly, per
-- docs/accounts-and-roster.md § Teacher Account Creation. Password: "password".
INSERT INTO teachers (name, email, password_hash) VALUES
    ('Dev Teacher', 'teacher@example.com', '$2b$12$7SZHf8ehFhsKppwPfEQFCeN6SDY9LAq1j1Y/plzIc6Lm9tkeLs2s.');
