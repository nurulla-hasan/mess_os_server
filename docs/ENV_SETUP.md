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
  - `MONGO_URI`: Replace standard mock uri targeting valid Atlas or active localized daemon endpoints cleanly securely.

- **Security Envelopes (Mandatory)**
  - `JWT_ACCESS_SECRET`: Replace via cryptographically hardened randomized bindings avoiding collisions internally seamlessly.
  - `JWT_REFRESH_SECRET`: Provision a distinct secure signature completely organically avoiding standard fallbacks structurally securely explicitly.

- **SMTP Protocols (Required tightly for auth blocks & mapped notifications natively)**
  - `SMTP_USER` & `SMTP_PASS`: Replace seamlessly utilizing valid Mailtrap / AWS SES or targeted relay organically explicitly seamlessly correctly.

- **Cloudinary Configurations**
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Map completely natively with cloud panel extraction keys safely.

- **External Integrations**
  - `STRIPE_SECRET_KEY`: Override organically checking exact Stripe webhook bounds accurately cleanly strictly mapping.
