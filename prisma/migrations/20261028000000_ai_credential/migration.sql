BEGIN;

-- Per-user AI provider credentials entered through the web UI.
--
-- Additive only: no existing table is altered. Ownership is the opaque Neon
-- Auth user id; there is deliberately no foreign key into neon_auth.
--
-- "apiKeyEnc" holds an AES-256-GCM envelope (v1.<iv>.<tag>.<ciphertext>)
-- produced by src/lib/ai/crypto.ts under AI_CREDENTIAL_SECRET. The plaintext
-- key is never stored, returned to a client, logged, or included in a backup.
-- "keyHint" is the last 4 characters, for display only.

CREATE TABLE "ssc_insight"."AiCredential" (
  "userId" TEXT NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "baseUrl" VARCHAR(300) NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "apiKeyEnc" TEXT NOT NULL,
  "keyHint" VARCHAR(8) NOT NULL DEFAULT '',
  "jsonMode" BOOLEAN NOT NULL DEFAULT true,
  "allowHttp" BOOLEAN NOT NULL DEFAULT false,
  "allowPrivate" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiCredential_pkey" PRIMARY KEY ("userId")
);

COMMIT;
