# Neon migration and tooling record

## Selected environment

- Organization `org-old-hill-05909567`; existing project `lingering-mode-47457333`.
- PostgreSQL 18, AWS US East 2, production branch `br-lively-flower-b4272e9b`.
- App tables start empty in `ssc_insight`; no Firebase data was imported or changed.
- Vercel remains the existing `alphaalexxxs-projects/sscinsight` project.

## Agent tooling and configuration

Fetched and followed the exact requested [Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md). A local diagnostic copy is ignored under `.local/`.

`npm i -g neon@latest` installed the Neon CLI. Initial `neon init` required quoting `'postgres,auth'` in PowerShell. The default tooling setup installed the user-level Neon plugin for Claude Code/Desktop, Codex, and VS Code; the GitHub Copilot plugin installer failed. Retrying initialization with `--agent codex` completed the required Codex setup without depending on the unrelated failed installer.

The installed Codex `neon-postgres` plugin version 2.3.0 bundles nine skills, including Neon, Postgres, Auth, and branching, plus the OAuth MCP server at `https://mcp.neon.tech/mcp`. Its manifest and server configuration were verified. No duplicate standalone `neon skills` or `neon mcp` entries were added. Existing configurations were preserved. MCP tools may require refreshing the host session; CLI operations were used here.

The project-local `.neon` link is ignored. `neon.ts` declares Auth and preserves the generated branch policy. A failed initial browser sign-in was retried with user participation; subsequent CLI verification confirmed access to the existing account and project. No substitute project or API key was created.

## Application changes

- Prisma 7.10.1 schema, generated client, Neon adapter, pooled runtime connection and direct migration connection.
- Repository-backed CRUD/settings/analytics and atomic backup restore. Existing JSON contracts and domain calculations retained.
- Optional Google sign-in, signed session cookies, callback-only Next.js proxy, sign-out and guest access.
- Firebase/Mongo runtime dependencies and setup helpers removed; local credentials preserved in ignored files and environment backup.
- Google configuration helper uses a masked secret prompt and stdin; never writes the OAuth secret.
- Prisma generation added to installation/build/CI. Sensitive and generated artifacts excluded from Git/Vercel uploads.
- Readme/product/design docs updated. A transitive Auth Zod dependency is overridden to a patched release; audit returned zero vulnerabilities.

## Provisioning and validation

`neon deploy` reported no infrastructure changes because Postgres and Auth already matched `neon.ts`, then pulled five variables into `.env.local`. Local configuration was backed up first. A cookie secret was generated locally without printing it.

The production origin was added to trusted domains; localhost was already allowed. The Google provider initially used development-only shared keys. User configuration changed it to `standard` with their own Google client ID; no client secret was read or logged by the agent.

An expiring QA branch `ssc-prisma-qa-20261024` was created from production (expires 2026-10-26 16:00 UTC). The reviewed initial migration applied there first; `prisma migrate status` reported the schema up to date. The same migration then applied successfully to production.

The production build passed. Against the built local app and isolated QA branch, `npm run verify:neon` printed:

```text
PASS: Neon persistence, ordered subject replacement, 245/390 sample, Computer exclusion, cross-type analytics, literal filters, CSV/JSON backup round trip, duplicate imports, settings, 404/400/403 responses, anonymous dashboard, Neon Auth session endpoint.
PASS: Disposable mock records removed; original target setting restored.
```

The anonymous Auth session endpoint and OAuth initiation are distinct from completing Google consent. Only report full sign-in/session/sign-out verification after the browser flow succeeds.

## Vercel preparation

The official Vercel CLI was installed and authenticated with user participation. The existing project was linked. The prior deployment is `dpl_DrF5N1VTPTfw6SbA3hd7xT2mpwQ8`; the existing domain remains unchanged.

The previous environment was exported to an ignored local backup; Vercel substitutes placeholders for three sensitive old values, so that export alone cannot restore those values. The original old variables were left intact. New production configuration adds pooled `DATABASE_URL` and the cookie secret as sensitive values, plus the Auth URL and Google-enabled flag. Values were passed over stdin, never printed or committed.

One `npm install --package-lock-only` attempt was blocked by the machine's remote-package policy. No policy was disabled. Dependency installs and audit had already succeeded; the root lockfile install-script flag was synchronized locally without fetching the blocked optional package.
