# Environment Setup Guide

To run the Mess Manager OS backend locally or deploy it cleanly explicitly to production, you must bind configuration targets correctly via `.env`.

1. Copy the generated `.env.example` file seamlessly into the root directly to map a live `.env` target logically locally.
   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file explicitly and replace the following values organically with valid external bounds comprehensively.

> [!IMPORTANT]
> Ensure your active `.env` file persists strictly excluded via `.gitignore` cleanly preventing leakages exactly globally seamlessly.

### Critical Values Required to be Replaced

- **Database Integrations**
  - `MONGODB_URI`: Replace standard mock uri targeting valid Atlas or active localized daemon endpoints cleanly securely.

- **Security Envelopes (Mandatory)**
  - `JWT_ACCESS_SECRET`: Replace via cryptographically hardened randomized bindings avoiding collisions internally seamlessly.
  - `JWT_REFRESH_SECRET`: Provision a distinct secure signature completely organically avoiding standard fallbacks structurally securely explicitly.

- **SMTP Protocols (Required tightly for auth blocks & mapped notifications natively)**
  - `SMTP_USER` & `SMTP_PASS`: Replace seamlessly utilizing valid Mailtrap / AWS SES or targeted relay organically explicitly seamlessly correctly.
  - `SMTP_FROM`: Set the canonical default out-bound explicit identity completely flawlessly.

- **Cloudinary Configurations**
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Map completely natively with cloud panel extraction keys safely.

- **AI Layer Boundaries**
  - `AI_PROVIDER`, `AI_MODEL`, `AI_MAX_TOKENS`: Safely bounded default structure strings spanning prompt execution bounds mapping externally natively.
  - `AI_API_KEY`: Provide a secure canonical active key explicitly tracking boundaries spanning external proxy logic seamlessly securely.

- **External Integrations**
  - `STRIPE_SECRET_KEY`: Override organically checking exact Stripe webhook bounds accurately cleanly strictly mapping.
