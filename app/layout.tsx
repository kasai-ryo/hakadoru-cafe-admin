import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hakadoru Café Admin",
  description: "Admin interface for managing Hakadoru Café listings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
