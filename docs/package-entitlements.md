# Package Entitlements Engine

## 1. Package Identity
The system uses the stable **plan name** (e.g., `BASIC`, `PLUS`, `PREMIUM`) from the database as the primary package identity. Do not use price or display names for authorization.
The `plan.name` field is the actual immutable machine identifier mapping to the internal code registry.
The database table `plan_features` exists but is kept UNUSED in favor of this strongly-typed Code Registry architecture to prevent unnecessary overhead and complex migrations.

## 2. Entitlement Keys
Capabilities are strictly mapped to semantic keys defined in `PackageEntitlements` in `src/lib/entitlements/registry.ts`:
- `analytics`: (boolean) Grants access to the analytics dashboard.
- `guestManagementPro`: (boolean) Grants access to RSVP tracking and guest exports.
- `premiumTemplates`: (boolean) Grants access to restricted templates.
- `removeBranding`: (boolean) Enables removal of the Tizkar watermark.
- `maxImages`: (number) Total images allowed in the gallery.
- `audioAllowed`: (boolean) Permits background music upload.
- `maxAudioBytes`: (number) Maximum background music file size.
- `invitationDurationDays`: (number) Time until the invitation expires.
- `maxGuestResponses`: (number | null) Caps RSVP limits.
- `storyExport`: (boolean) Enables Instagram Story format export.

## 3. Server Enforcement Locations
Entitlements MUST be enforced on the server for any paid action using `requireInvitationFeature` or `requireInvitationLimit`:
- **Analytics**: `src/actions/analytics.ts` -> `getAnalyticsMetrics()`
- **Guest Management**: `src/actions/rsvps.ts` -> `getInvitationRsvps()`, `deleteRsvp()`
- **RSVP Limits**: `src/actions/rsvps.ts` -> `submitRsvp()` (Counts current responses before insertion)
- **Media Upload Limits**: `src/actions/storage.ts` -> `checkQuota()` and `confirmMediaUpload()`
- **Story Generation**: `src/app/api/invitations/[id]/story/route.tsx`

Do not rely on the client hiding UI elements as a security measure.

## 4. Client Representation & Feature Gate
The client obtains capabilities securely via `getPackageEntitlements()` combined with trusted server state. 
Restricted features in the Editor UI (like Background Audio and Story Export) are wrapped in the `<FeatureGate />` component (`src/components/ui/FeatureGate.tsx`) which provides a premium, non-intrusive upgrade CTA when a capability is locked.

## 5. Activation Lifecycle & Multiple Order Semantics
A selected package does NOT grant entitlements until an order is placed and marked as `PAID`. 
- **No Order / PENDING_PAYMENT / Cancelled newer order**: Resolves to `FREE_PREVIEW` entitlements (or older PAID tier) allowing safe editing and media uploads.
- **Paid**: Resolves to the specific package capabilities via the **latest paid order** (`order by created_at desc limit 1`).
- **Expired**: Entitlements do not bypass the expiration date of an invitation.

## 6. Legacy / Grandfather Behavior & Unknown Packages
If an invitation has no paid order, or a plan cannot be identified, the system safely falls back to `DEFAULT_ENTITLEMENTS` which mimics `FREE_PREVIEW`. 
Legacy paid invitations will automatically inherit the capabilities of their assigned package.
Features like `analytics` and `guestManagementPro` are temporarily enabled globally across all tiers to protect legacy users until a formal business restriction is approved.

## 7. Versioning and Snapshots
The Entitlement engine uses the LIVE Code Registry matching the `plan.name` string snapshot. If the system's policy rules change tomorrow (e.g., BASIC image limit changes from 10 to 5), the old invitation will immediately adopt the new limits for future operations. No complex database-level capability versioning is implemented yet.
*(Note: Duration is the exception, where `order.plan_snapshot.duration_days` remains the single source of truth for computing `expires_at` during publication).*

## 8. Known Limitations
**RSVP Limit Concurrency**: The RSVP limitation check in `submitRsvp` counts existing rows and then inserts. This is not strictly atomic. A highly concurrent attack could potentially exceed the RSVP limit by a small margin due to race conditions.

## 9. Current Commercial Policy Matrix Status
| Capability | FREE_PREVIEW | BASIC | PLUS | PREMIUM | Status |
|---|---:|---:|---:|---:|---|
| Analytics | YES | YES | YES | YES | TEMPORARY |
| Guest Management Pro | YES | YES | YES | YES | TEMPORARY |
| Premium Templates | NO | NO | NO | YES | CONFIRMED |
| Max Images | 5 | 10 | 20 | 50 | CONFIRMED |
| Background Audio | NO | NO | YES | YES | CONFIRMED |
| Max Audio Size | 0 | 0 | 10MB | 10MB | CONFIRMED |
| Story Export | NO | NO | YES | YES | CONFIRMED |
| Branding Removal | NO | NO | NO | YES | CONFIRMED |
| Max RSVP Responses | 50 | 100 | 250 | Unlimited | CONFIRMED |
| Invitation Duration | 120 | 120 | 120 | 120 | CONFIRMED |
