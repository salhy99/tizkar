# Quota Enforcement Architecture

This document describes the atomic database-level quota enforcement for media uploads and RSVP submissions in the TIZKAR platform.

## Overview

To prevent Time-Of-Check to Time-Of-Use (TOCTOU) race conditions when concurrent requests attempt to consume limited capacity, TIZKAR utilizes PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) and atomic mutations.

## 1. Media Reservation Lifecycle

Media uploads are handled in a 3-step transactional process:

1. **Reserve (`reserve_media_upload_slot`)**
   - Acquires lock on the target `invitation`.
   - Counts existing canonical usage (the JSONB `gallery` length) + currently active `RESERVED` and `CONFIRMED` slots.
   - If below `max_images` quota, inserts a `RESERVED` row with a 15-minute expiration into `invitation_media_reservations`.
   - Returns the `reservation_id`.

2. **Upload**
   - Client receives a Signed Upload URL containing the `reservation_id` within the Storage path.
   - Client uploads the file to Supabase Storage.

3. **Commit (`commit_media_upload_atomic`)**
   - Locks the target `invitation` and the draft `invitation_versions` row.
   - Verifies the `reservation_id` is valid, belongs to the invitation, and is unexpired.
   - Idempotently uses `jsonb_set` to append the finalized Storage path into the canonical `gallery` JSON array.
   - Atomically deletes the reservation row, transitioning the quota consumption natively from "Temporary" to "Canonical".
   - This exact handoff avoids any over/under counting window.

### Failure Behavior
- If the Storage upload fails, the client never proceeds to the commit step.
- The `RESERVED` slot will naturally expire after 15 minutes, restoring the user's available quota without intervention.

## 2. Editor Autosave Concurrency

Since the React-based editor sends the full JSON state during autosave, an atomic update mutation was implemented to prevent "Lost Updates" where an autosave overwrites a concurrently committed media file.

- **`update_invitation_data_atomic`**: Merges incoming JSONB data at the top level using the Postgres `||` operator, guaranteeing that isolated modifications to unrelated fields (like `title` or `date`) do not erase concurrently inserted `gallery` paths.

## 3. RSVP Quota Semantics

RSVPs are limited by a canonical package configuration. 

- **`submit_invitation_rsvp_atomic`**: Locks the invitation row and performs a transactional `COUNT(*)` over `invitation_rsvps`.
- The RSVP quota unit is the absolute number of row-based submissions (forms filled).
- `guest_count` is recorded but does not consume additional quota limits.
- Premium packages utilize a sentinel value of `-1` for `max_rsvps`, which the RPC gracefully handles as mathematically unlimited.

## 4. Entitlement Authority

Client browsers maintain **zero authority** over limit evaluations. 
- All requests flow through `src/actions/storage.ts` and `src/actions/rsvps.ts` Server Actions.
- The server computes exact numerical bounds dynamically using `getInvitationEntitlements()`, injecting the static constraints directly into the RPC layer.

## 5. Security & Access Control

All functions are strictly isolated from client execution.

- **`SECURITY DEFINER`**: Elevates privileges momentarily inside the RPC.
- **`SET search_path = public`**: Prevents schema manipulation attacks.
- **`REVOKE EXECUTE FROM PUBLIC, anon, authenticated`**: Enforces strict denial for all public REST / GraphQL endpoints.
- **`GRANT EXECUTE TO service_role`**: Only the trusted Node.js server context is permitted to execute quota operations.
