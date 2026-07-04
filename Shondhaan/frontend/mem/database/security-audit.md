---
name: Backend Security Audit
description: Findings/fixes from full backend audit — RLS, storage, accepted SECURITY DEFINER warnings
type: feature
---
# Backend Security Audit (2026-04-28)

## Functional bugs fixed (were also security issues)
- `deal_listings`: added public/auth SELECT for `status IN ('active','featured')` so marketplace browsing works. Phone masked via `get_public_deal_listings()` RPC when seller has `hide_phone=true`.
- `role_permissions`: added SELECT for authenticated so `usePermissions` hook works for non-admin staff.

## RLS hardening
- `service_requests`: representatives scoped to `assigned_rep_id = auth.uid()`. Added `assigned_rep_id` column.
- `employer_profiles`: contact email/phone restricted to authenticated.
- `job_applications`: added `user_id` column.

## Storage hardening
- `applications`: upload requires auth + folder=auth.uid().
- `chat-attachments`: upload restricted to own folder.
- `deal-images`: explicit public SELECT, scoped UPDATE, upload to own folder.

## Accepted warnings (DO NOT "fix")
- 37 × SECURITY DEFINER function executable — required for RLS. (`has_role`, `get_my_roles`, `create_notification`, `get_public_deal_listings`, audit/notify triggers, etc.)
- 1 × Public Bucket Allows Listing (`deal-images`) — intentional public marketplace.
