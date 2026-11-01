import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Trash boundary: mock attempts may only be queried through the repository
  // (and the trash service), because every read must carry `deletedAt: null`.
  // A new query written directly here would silently resurrect deleted mocks
  // in charts, search, or the AI context. `search.ts` is a reviewed exception:
  // its keyset pagination cannot go through the list builders, and it applies
  // the filter itself.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='mockAttempt']",
          message:
            "Query mock attempts through src/lib/repository.ts so the trash filter (deletedAt: null) is applied.",
        },
      ],
    },
  },
  {
    files: [
      "src/lib/repository.ts",
      "src/lib/trash.ts",
      "src/lib/search.ts",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "src/generated/**",
    ".local/**",
    // Workspace tooling and content, not app source (also git-ignored).
    ".agents/**",
    "videos/**",
  ]),
]);
