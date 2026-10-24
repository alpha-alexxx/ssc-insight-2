import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
import { GoogleAuth } from "google-auth-library";
nextEnv.loadEnvConfig(process.cwd());
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/datastore"],
});
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  authMechanismProperties: {
    ALLOWED_HOSTS: [
      "155cc25b-1851-4901-8b33-7de54898dcb4.asia-south1.firestore.goog",
    ],
    OIDC_CALLBACK: async () => ({
      accessToken: await auth.getAccessToken(),
      expiresInSeconds: 3000,
    }),
  },
});
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE || "insight");
  const result = await db.collection("sscMockAttempts").findOne({});
  console.log(JSON.stringify({ connected: true, trackerHasRecords: !!result }));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
