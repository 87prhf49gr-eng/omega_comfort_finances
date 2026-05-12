# Comfort Ledger Data Schema v1

Este documento define el esquema relacional para reemplazar persistencia basada en JSON:

- `beta-users.json`
- `beta-sessions.json`
- `waitlist.json`
- `subscriptions.json`
- `push-subscriptions.json`

## Objetivos

- Mantener compatibilidad funcional con el servidor actual.
- Eliminar race conditions de archivos.
- Permitir idempotencia de webhooks y trazabilidad operativa.

## Motor recomendado

- **SQLite** para la primera migración (simple, sin servicio externo).
- Diseñado para poder migrar a Postgres después con cambios mínimos.

## Entidades principales

### 1) `users`

Representa cuentas beta y futuras cuentas administrables.

Campos:

- `id` TEXT PK (ej. `user-uuid`)
- `username_normalized` TEXT UNIQUE NOT NULL
- `display_name` TEXT NOT NULL
- `slot` TEXT NULL
- `pin_salt` TEXT NOT NULL
- `pin_hash` TEXT NOT NULL
- `active` INTEGER NOT NULL DEFAULT 1
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Índices:

- `UNIQUE(username_normalized)`
- `INDEX(active)`

---

### 2) `sessions`

Unifica sesiones beta y onboarding.

Campos:

- `id` TEXT PK
- `kind` TEXT NOT NULL CHECK (`kind IN ('beta','onboarding')`)
- `token_hash` TEXT UNIQUE NOT NULL
- `user_id` TEXT NULL FK -> `users(id)` (solo `kind=beta`)
- `onboarding_profile_json` TEXT NULL (solo `kind=onboarding`)
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL
- `expires_at` TEXT NOT NULL

Índices:

- `UNIQUE(token_hash)`
- `INDEX(expires_at)`
- `INDEX(kind, user_id)`

---

### 3) `waitlist_entries`

Campos:

- `id` TEXT PK
- `email_normalized` TEXT UNIQUE NOT NULL
- `source` TEXT NOT NULL
- `created_at` TEXT NOT NULL

Índices:

- `UNIQUE(email_normalized)`

---

### 4) `subscriptions`

Snapshot de estado por email.

Campos:

- `id` TEXT PK
- `email_normalized` TEXT UNIQUE NOT NULL
- `subscription_id` TEXT NULL
- `customer_id` TEXT NULL
- `variant_id` TEXT NULL
- `plan` TEXT NULL
- `status` TEXT NOT NULL
- `renews_at` TEXT NULL
- `last_event_name` TEXT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Índices:

- `UNIQUE(email_normalized)`
- `INDEX(subscription_id)`
- `INDEX(status)`

---

### 5) `webhook_events`

Idempotencia y auditoría de Lemon.

Campos:

- `id` TEXT PK
- `provider` TEXT NOT NULL DEFAULT `lemonsqueezy`
- `event_id` TEXT NOT NULL
- `event_name` TEXT NOT NULL
- `subscription_id` TEXT NULL
- `email_normalized` TEXT NULL
- `payload_json` TEXT NOT NULL
- `processed` INTEGER NOT NULL DEFAULT 0
- `processed_at` TEXT NULL
- `error_message` TEXT NULL
- `created_at` TEXT NOT NULL

Índices:

- `UNIQUE(provider, event_id)`
- `INDEX(processed, created_at)`

---

### 6) `push_registrations`

Campos:

- `id` TEXT PK
- `owner_key` TEXT NOT NULL
- `session_kind` TEXT NOT NULL CHECK (`session_kind IN ('beta','onboarding')`)
- `beta_user_id` TEXT NULL
- `onboarding_profile_id` TEXT NULL
- `endpoint` TEXT NOT NULL
- `subscription_json` TEXT NOT NULL
- `reminders_json` TEXT NOT NULL
- `sent_json` TEXT NOT NULL DEFAULT '{}'
- `user_agent` TEXT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Índices:

- `UNIQUE(owner_key, endpoint)`
- `INDEX(owner_key)`

---

## DDL inicial (SQLite)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username_normalized TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  slot TEXT,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('beta', 'onboarding')),
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  onboarding_profile_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_kind_user ON sessions(kind, user_id);

CREATE TABLE waitlist_entries (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  subscription_id TEXT,
  customer_id TEXT,
  variant_id TEXT,
  plan TEXT,
  status TEXT NOT NULL,
  renews_at TEXT,
  last_event_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_subscriptions_subscription_id ON subscriptions(subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  subscription_id TEXT,
  email_normalized TEXT,
  payload_json TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  processed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(provider, event_id)
);
CREATE INDEX idx_webhook_events_processed_created ON webhook_events(processed, created_at);

CREATE TABLE push_registrations (
  id TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  session_kind TEXT NOT NULL CHECK (session_kind IN ('beta', 'onboarding')),
  beta_user_id TEXT,
  onboarding_profile_id TEXT,
  endpoint TEXT NOT NULL,
  subscription_json TEXT NOT NULL,
  reminders_json TEXT NOT NULL,
  sent_json TEXT NOT NULL DEFAULT '{}',
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_key, endpoint)
);
CREATE INDEX idx_push_registrations_owner_key ON push_registrations(owner_key);
```
