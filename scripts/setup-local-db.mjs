import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
// Local development only: reuse an explicitly signed-in Firebase CLI account.
// The OAuth client below is the Firebase CLI's public installed-application client.
const destination = resolve(".local/google-credentials.json");
await mkdir(resolve(".local"), { recursive: true });
try {
  await access(destination);
  console.log("Existing local database credentials preserved.");
} catch {
  const config = JSON.parse(
    await readFile(
      join(homedir(), ".config/configstore/firebase-tools.json"),
      "utf8",
    ),
  );
  if (!config.tokens?.refresh_token)
    throw new Error(
      "Sign in using firebase login first, or configure Google Application Default Credentials.",
    );
  await writeFile(
    destination,
    JSON.stringify({
      type: "authorized_user",
      client_id:
        "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
      client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
      refresh_token: config.tokens.refresh_token,
    }),
    { mode: 0o600 },
  );
  console.log(
    "Local database credentials configured from your existing Firebase CLI sign-in.",
  );
}
try {
  await access(".env.local");
  console.log("Existing .env.local preserved.");
} catch {
  const template = await readFile(".env.example", "utf8");
  await writeFile(
    ".env.local",
    `${template}\nGOOGLE_APPLICATION_CREDENTIALS=${JSON.stringify(destination.replaceAll("\\", "/"))}\n`,
    { mode: 0o600 },
  );
  console.log("Created ignored .env.local.");
}
