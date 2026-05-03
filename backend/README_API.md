# RWManage Backend API Reference (concise)

Base URL: http://localhost:3000/api

Authentication: Bearer token via `Authorization: Bearer <token>` (login at `/auth/login`).

Endpoints (summary):

- POST /auth/login
  - Body: { email, password }
  - Response: { success, message, data: { token, user } }

- RW (role RW)
  - GET /rw/cicilan-iuran
  - POST /rw/cicilan-iuran
  - GET /rw/performa-ronda
  - POST /rw/performa-ronda
  - GET /rw/laporan-insiden
  - POST /rw/laporan-insiden (multipart/form-data for foto_bukti)

- RT (role RT)
  - GET /rt/iuran
  - GET /rt/warga
  - POST /rt/warga
  - GET /rt/performa-ronda
  - POST /rt/performa-ronda
  - PATCH /rt/performa-ronda/:performa_id
  - DELETE /rt/performa-ronda/:performa_id
  - GET /rt/laporan-insiden
  - POST /rt/laporan-insiden (multipart/form-data for foto_bukti)
  - PATCH /rt/laporan-insiden/:laporan_id
  - DELETE /rt/laporan-insiden/:laporan_id
  - GET /rt/audit-logs

- Admin / Superadmin
  - GET /admin/audit-logs
  - GET /admin/dashboard/overview
  - GET /admin/dashboard/financial-summary

RBAC notes:
- RT routes are scoped to `req.user.blok_wilayah_id` and return only data in the logged-in RT block / RW scope.
- RW routes remain the broader management surface.
- Audit records are written on create/update/delete operations via the shared audit helper.

Validation: request bodies are validated with Zod schemas in `src/validation/schemas.ts`.

Notes:
- Many create endpoints return HTTP 201 with JSON { success: true, message, data }.
- File uploads expect multipart form fields: `dokumen` (identitas), `foto_bukti` (laporan insiden), etc.
- If you need full request/response examples, see the tests in `frontend/tests/e2e/` for concrete usage.
