# Sunshine School Super Admin — Security Specification

## 1. Core Data Invariants
1. **Admin Authority Isolation**: Only an existing authorized Super Admin (verified via JWT session against authorized `admins` records) can create additional administrator accounts, approve/reject/suspend teachers, modify `teacherPermissions`, approve/reject/delete posts, advertisements, or live streams, resolve reports, or update `siteSettings`.
2. **Teacher Registration & Status Gate**: Pending, rejected, or suspended teachers cannot create posts, advertisements, or live stream requests.
3. **Granular Teacher Permission Gate**: An approved teacher (`status == 'approved'` and `teacherPermissions.isSuspended == false`) can only create a post, upload photos/videos, submit an advertisement, or request a live stream if the corresponding boolean flag in `teacherPermissions` is `true`.
4. **Fresh Approval on Edit**: When a teacher edits an approved post, its `status` must transition back to `'pending'`, removing it from public visibility until re-approved by a Super Admin.
5. **PII Isolation**: Teacher and public user records containing `email` and `phone` are readable only by the record owner or an authorized Super Admin—never via unauthenticated list endpoints.
6. **Public Visibility Bounds**: Unauthenticated visitors and public users can list/read only `approved` posts, `approved` + `isActive == true` advertisements, `approved`/`scheduled`/`live`/`completed` live streams, and `visible` comments.
7. **Immutable Audit Trail**: `auditLogs` can only be created by verified Super Admins and cannot be modified or deleted.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation on Admin Creation**: Non-admin authenticated user attempts `POST /api/admin/admins` with `{ role: "super_admin" }` -> **DENIED**.
2. **Self-Approval of Teacher Registration**: Pending teacher attempts to change `status: "approved"` -> **DENIED**.
3. **Teacher Permission Self-Grant**: Teacher attempts `PUT /api/admin/teachers/:id/permissions` setting `allowVideoUploads: true` -> **DENIED**.
4. **Suspended Teacher Bypass**: Suspended teacher attempts `POST /api/teacher/posts` even if previous permissions were `true` -> **DENIED**.
5. **Disabled Permission Bypass**: Teacher with `allowAdvertisementSubmission: false` attempts advertisement submission -> **DENIED**.
6. **Direct Post Self-Publish**: Teacher attempts `POST /api/teacher/posts` with `status: "approved"` -> **DENIED**.
7. **Shadow Field Injection**: Teacher sends unexpected admin override fields on `PUT /api/teacher/posts/:id` -> **IGNORED / DENIED**.
8. **Author Identity Spoofing**: Teacher A attempts to edit or impersonate Teacher B's post -> **DENIED**.
9. **Unauthorized Route Access**: Unauthenticated caller attempts `/api/admin/*` or `/api/livekit/*` without valid JWT -> **DENIED (401)**.
10. **PII Blanket Scraping**: Non-admin user attempts `/api/admin/state` -> **DENIED**.
11. **Live Broadcast Hijack**: Teacher attempts to start broadcast when `status` is still `"pending"` -> **DENIED**.
12. **Revoked or Expired JWT Replay**: Caller replays a logged-out or expired JWT against `/api/admin/*` -> **DENIED (401)**.
