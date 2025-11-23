import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ハカドルカフェ管理者ページ",
  description: "Admin interface for managing ハカドルカフェ listings.",
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
