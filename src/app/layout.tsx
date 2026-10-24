import type { Metadata } from "next";
import "@fontsource-variable/dm-sans/index.css";
import "@fontsource-variable/source-serif-4/index.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "SSC Insight · Mock tracker",
  description: "A clear view of your SSC CGL Tier 2 preparation.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
