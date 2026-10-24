import { Dashboard } from "@/components/dashboard";
export default function Page() {
  return <Dashboard authEnabled={process.env.GOOGLE_AUTH_ENABLED === "true"} />;
}
