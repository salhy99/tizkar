# Media Architecture

## 1. Storage Model
TIZKAR uses Supabase Storage to manage user uploads. Media assets are stored in a private bucket called `invitations_assets`. The bucket structure is as follows:
- `<userId>/<invitationId>/<uuid>.<ext>` for authenticated users.
- `anon/<invitationId>/<uuid>.<ext>` for anonymous editor sessions.

## 2. Object References
Instead of full URLs, `InvitationData` stores the raw storage path (e.g. `anon/inv123/uuid.jpg`). 
When an invitation is viewed publicly, the front-end dynamically resolves these paths against `NEXT_PUBLIC_SUPABASE_URL` to fetch the file.

## 3. Upload Flow
Uploading is securely gatekept via signed URLs:
1. **Request**: The client requests a temporary signed URL using the Server Action `createMediaUploadToken`. The server asserts package entitlements and size constraints.
2. **Upload**: The client uses the signed URL (via `PUT` XHR request) to push the object to Supabase.
3. **Confirm**: The client calls `confirmMediaUpload` to finalize the upload. The server verifies the object exists in Supabase.
4. **Save**: The path is pushed to `InvitationData` and autosaved.

## 4. Quota and Concurrency Races
The `maxImages` and `maxAudioBytes` quota are determined from `getPackageEntitlements`. 
Due to client-side optimistic counting, if multiple tabs upload at once, there is a known race condition where a user could exceed their quota prior to the final autosave. This remains an acceptable P2 risk.

## 5. Deletion & Orphans
Deletions call `deleteMedia` with strict path validation to prevent traversal.
If a file is successfully uploaded but the confirmation fails or the browser closes, the storage object becomes "orphaned." We rely on a background chron job (P2 debt) to periodically clean up files in the `invitations_assets` bucket that are not referenced in any `invitation_data`.

## 6. Audio and Covers
- Audio replacement follows a "replace reference first, then best-effort delete old" strategy to prevent breaking references.
- Cover Images share the same delivery model as gallery images, simply denoted in the JSON model as `coverImage`.
