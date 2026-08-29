# TIZKAR Template System

## Overview

TIZKAR templates are registered in a single canonical registry at:

```
src/components/templates/registry.ts
```

Templates are identified by their **slug** (lowercase, hyphenated string). Each template has a **renderer** component and **metadata** that drives access control, catalog display, and feature visibility.

---

## Template Registry

| Slug | Name | Tier | Required Entitlement | Status |
|---|---|---|---|---|
| `layali` | ليالي | Standard | `null` | ACTIVE |
| `modern-glass` | مودرن جلاس | Standard | `null` | ACTIVE |
| `rose-garden` | حديقة الورد | Standard | `null` | ACTIVE |
| `noor` | نور | Premium | `premiumTemplates` | ACTIVE |
| `atheer` | أثير | Premium | `premiumTemplates` | ACTIVE |

---

## Template Definition

```typescript
type TemplateDefinition = {
  id: string
  name: string                           // Arabic display name
  description: string
  thumbnail: string                      // Path to preview image
  status: 'ACTIVE' | 'COMING_SOON' | 'HIDDEN'
  features: TemplateFeatures             // gallery, map, program, parents, music, rsvp
  renderer: React.ComponentType<TemplateRendererProps>
  requiredEntitlement: PackageEntitlementKey | null  // null = Standard
}
```

### `requiredEntitlement`

- `null` → Standard template. Any user may create an invitation with this template.
- `'premiumTemplates'` → Premium template. Requires `PREMIUM` package entitlement at **creation time** (server-authoritative).

**Do not use slug-matching** (`if slug === 'noor'`) to make access decisions. Always read `requiredEntitlement` from the registry.

---

## Authorization Policy

### Template Selection Lifecycle

The chosen policy is **Option B** from the Phase 8.5-A specification:

> Users may **browse and preview** any template, including Premium.
> A Premium template **cannot be created** (stored as an invitation) without the `premiumTemplates` entitlement.
> Enforcement happens **server-side** at `createInvitation()`.

### Authorization Matrix

| Package | Preview Premium in Catalog | Create Invitation with Premium |
|---|---|---|
| `FREE_PREVIEW` | ✅ YES | ❌ NO |
| `BASIC` | ✅ YES | ❌ NO |
| `PLUS` | ✅ YES | ❌ NO |
| `PREMIUM` | ✅ YES | ✅ YES |

### Server Enforcement

Located in: `src/actions/invitations.ts` → `createInvitation()`

Flow:
```
1. Validate template exists in DB
2. Validate template is ACTIVE in DB
3. Look up template in frontend registry
4. IF registryTemplate.requiredEntitlement === 'premiumTemplates':
   a. Require authenticated user (userId)
   b. Query user's most recent PAID order
   c. Resolve entitlements via getPackageEntitlements()
   d. IF !ents.premiumTemplates → return error
5. Continue with invitation creation
```

Client-side UI (catalog lock state, badge) is **supplemental UX** only, never security.

---

## Published Rendering

Template entitlement is **only checked at mutation/creation** — not at public render time.

A legitimately-published invitation using a Premium template will continue to render correctly even if:
- The owner's plan is later downgraded
- The order status changes

This protects users who have validly purchased and published a Premium invitation.

Public rendering reads the stored `invitation_versions.invitation_data` and `template_id` from the database.

---

## Downgrade Behavior

Non-destructive policy:
- If a user's package is downgraded after publishing a Premium invitation, the invitation **continues to render** using the Premium template.
- The user **cannot create new** Premium invitations without re-upgrading.
- Existing invitation data and template assignment are preserved.

---

## Legacy Compatibility

Templates `layali`, `modern-glass`, and `rose-garden` are explicitly `requiredEntitlement: null`. No existing invitation is retroactively affected by the introduction of premium templates.

The `TemplateRenderer` fallback path (`getTemplate('layali')`) remains unchanged for legacy records without a valid template slug.

---

## Inactive / Hidden Templates

Templates with `status: 'HIDDEN'` or `'COMING_SOON'` are rejected by `createInvitation()`:

```typescript
if (!registryTemplate || registryTemplate.status !== 'ACTIVE') {
  return { error: 'هذا القالب قيد التطوير وغير متاح للاستخدام' }
}
```

Existing invitations using a previously-active template that is now hidden will still render correctly (the renderer component is not removed, only the selection gate is blocked).

---

## Media Requirements

All template image and audio assets MUST use:

```typescript
import { getMediaUrl } from '@/lib/media-helpers'
// ...
<img src={getMediaUrl(data.coverImage)} />
```

**Never** construct Supabase `object/public/` URLs directly in template code.  
**Never** call `createSignedUrl` from template components.  
**Never** store signed URLs in `InvitationData`.

---

## Adding a New Template

1. Create `src/components/templates/<slug>/index.tsx` with a named `<Name>Renderer` component.
2. Add to `registry.ts` with appropriate `requiredEntitlement`.
3. If Premium, entitlement enforcement is automatic via the existing `createInvitation` gate.
4. Add a DB record for the template in Development (`templates` table with matching `slug`).
5. Update `registry.test.ts` to cover the new template's metadata and renderer.
6. If `status: 'ACTIVE'`, the template immediately appears in the catalog.

---

## Database Sync

Templates require records in the `templates` table (Development) for the catalog to display them.

For Production: templates are promoted through the standard release process. No schema migration is required — only `INSERT` into the `templates` table if new records are needed.

Current Development templates table must contain slugs: `layali`, `modern-glass`, `rose-garden`, `noor`, `atheer`.
