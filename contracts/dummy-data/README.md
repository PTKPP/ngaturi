# Dummy data

Fixture ini hanya untuk unit test dan adapter development eksplisit. Jalur production tidak membaca file ini dan tidak memasang persistence `localStorage`.

- `users.json` dan `routes.json` memodelkan role, status, ownership, dan quota.
- `templates.json` serta `themes.json` harus parity dengan registry renderer dan seed migration Supabase.
- `invitations.json` memakai base invitation stabil, `contentSchemaVersion`, dan content object yang divalidasi schema renderer terkait.

Perubahan kontrak harus mengubah fixture dan test bersama-sama. Data ini bukan credential atau seed production.
