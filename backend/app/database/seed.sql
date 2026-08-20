-- Local dev seed data.
--
-- The first account has to be an admin, not a plain teacher — teacher/student
-- creation now requires an already-logged-in admin (POST /api/accounts/teachers,
-- POST /api/accounts/students/bulk), so it's seeded directly, per
-- docs/accounts-and-roster.md § Teacher Account Creation. Password: "password".
INSERT INTO teachers (name, email, password_hash, role) VALUES
    ('Dev Admin', 'admin@example.com', '$2b$12$7SZHf8ehFhsKppwPfEQFCeN6SDY9LAq1j1Y/plzIc6Lm9tkeLs2s.', 'admin');
