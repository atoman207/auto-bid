import type { Metadata, Viewport } from "next";
import { LANG_BOOT_SCRIPT } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "履歴書AIサポート | Rirekisho AI",
    template: "%s | 履歴書AIサポート",
  },
  description:
    "質問に答えるだけで、日本の履歴書・自己紹介文・面接練習を作成します。/ Jawab pertanyaan, dan kami buatkan CV Jepang (rirekisho), perkenalan diri, dan latihan wawancara.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-lang / lang are corrected by the inline script before paint, hence suppressHydrationWarning.
    <html lang="id" data-lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
