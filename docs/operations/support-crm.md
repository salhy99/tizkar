# Admin Support CRM

## Purpose
The Internal Admin Support CRM is designed to allow authorized administrators to safely open, track, annotate, and resolve operational support cases linked to specific invitations or payment orders within the TIZKAR platform. It functions purely as an internal administrative tool, completely shielded from customer-facing experiences.

## Permissions
Access to the CRM is strictly restricted:
- **Service Role:** Server actions execute data mutations bypassing database RLS, enforcing safety through application logic.
- **Admin Access:** All server actions and API routes implement explicit `requireAdminAccess()` checks.
- **RLS:** Both `support_cases` and `support_case_notes` enforce Row Level Security, inherently denying access to anonymous and normally authenticated users.

## Data Model
- **`support_cases`**: The primary entity tracking support issues. Contains metadata such as `status`, `priority`, `category`, and references to `invitation_id` and `order_id`.
- **`support_case_notes`**: Append-only log of communications and updates linked to a specific case (`case_id`). Enforces immutability to preserve audit trails.

## Status Lifecycle
The case lifecycle follows a controlled state machine:
- `OPEN`: Newly created cases.
- `IN_PROGRESS`: Cases actively being worked on.
- `WAITING_CUSTOMER`: Blocked pending user action/response.
- `WAITING_INTERNAL`: Blocked pending internal team action.
- `RESOLVED`: Issue successfully addressed.
- `CLOSED`: Case finalized (can optionally be reopened).
State transitions generate audit events (`SUPPORT_STATUS_CHANGED`, `SUPPORT_RESOLVED`, `SUPPORT_CLOSED`, `SUPPORT_REOPENED`).

## Priority and Category
- **Priority**: Classifies the urgency of cases (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
- **Category**: Categorizes the root issue area (`PAYMENT`, `RECOVERY`, `EDITOR`, `MEDIA`, `PUBLISH`, `RSVP`, `ACCOUNT`, `TECHNICAL`, `OTHER`).

## Privacy Rules & No-Secret Policy
Administrators are explicitly prohibited from storing sensitive information within CRM notes. This includes:
- Raw Recovery Keys
- Secret Edit Tokens
- User Passwords
- Cookies or Raw Payment Credentials
A visible Arabic warning is injected into the note creation UI reminding admins: "لا تُدخل مفاتيح الاستعادة، رموز التعديل، كلمات المرور أو أي بيانات سرية داخل الملاحظات."

## Payment & Recovery Boundary
- **Payment Boundary**: The CRM only references payment logic (`order_id`) and does not authorize payment mutations. Creating a case against a payment does not change the payment's operational status.
- **Recovery Boundary**: The CRM cannot issue new tokens or provide editor access. It is completely isolated from the authentication layer; any token rotation must happen through the established Admin Authentication functions.

## Audit Semantics
All meaningful actions trigger corresponding insertions into `admin_audit_log`, ensuring a traceable administrative history. Supported events include:
- `SUPPORT_CASE_CREATED`
- `SUPPORT_NOTE_ADDED`
- `SUPPORT_STATUS_CHANGED`
- `SUPPORT_PRIORITY_CHANGED`
- `SUPPORT_RESOLVED`
- `SUPPORT_CLOSED`
- `SUPPORT_REOPENED`
Full note bodies are intentionally excluded from audit payloads to minimize sensitive data sprawl.

## Search and Filter Behavior
- **Search**: Identifiers matching UUID formats automatically scan ID fields (`case_id`, `invitation_id`, `order_id`), while text searches query the `subject` with `ilike`.
- **Filter**: Dropdowns enable quick sorting by `status`, `priority`, and `category`.
- **Pagination**: The CRM list implements page-based pagination mapped to 25 items per page, avoiding unbounded database retrieval overfetching.

## Assignment Status
Database schema fields (`assigned_admin_id`, `assigned_admin_identifier`) exist but assignment operations are classified as `P2` and are currently unexposed. The CRM currently assumes shared responsibility amongst all authorized admins.

## Release and Rollback
The feature is considered Development-proven.
- **Release Strategy**: Deployment to Production involves standard Git merging, as database schemas have been designed in an additive manner.
- **Rollback Strategy**: Since the CRM does not modify the customer UX funnel, it can be entirely disabled in the UI or restricted by toggling access via the `admin-auth` middleware without disrupting platform availability.
