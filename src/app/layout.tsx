import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "サポーターマッチング",
  description: "議員・スタッフが活動に協力してほしいサポーターを検索し、連絡できるサービス",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
