import "server-only";
import { MongoClient } from "mongodb";
import { GoogleAuth } from "google-auth-library";
import type { Attempt } from "./domain";
export type StoredAttempt = Attempt & { _id: string };
export type StoredSettings = { _id: string; targetScore: number | null };
const globalDb = globalThis as unknown as {
  mongoPromise?: Promise<MongoClient>;
};
export async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!globalDb.mongoPromise) {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/datastore"],
    });
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      ...(uri.includes("MONGODB-OIDC")
        ? {
            authMechanismProperties: {
              ALLOWED_HOSTS: [
                "155cc25b-1851-4901-8b33-7de54898dcb4.asia-south1.firestore.goog",
              ],
              OIDC_CALLBACK: async () => {
                const token = await auth.getAccessToken();
                if (!token)
                  throw new Error("Database credentials are unavailable");
                return { accessToken: token, expiresInSeconds: 3000 };
              },
            },
          }
        : {}),
    });
    globalDb.mongoPromise = client.connect().catch((error) => {
      globalDb.mongoPromise = undefined;
      throw error;
    });
  }
  return (await globalDb.mongoPromise).db(
    process.env.MONGODB_DATABASE || "insight",
  );
}
