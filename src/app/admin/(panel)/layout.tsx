import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { LogoutButton } from "./ui";

export const metadata: Metadata = {
  title: { default: "管理画面", template: "%s | 管理画面" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f4f2]">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <span className="hidden text-[15px] font-bold sm:inline">管理画面</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 whitespace-nowrap text-[14px]">
            <Link href="/admin" className="rounded-lg px-3 py-2 font-medium hover:bg-line/50">
              受付一覧
            </Link>
            <Link href="/admin/setup" className="rounded-lg px-3 py-2 font-medium hover:bg-line/50">
              初期設定・テスト
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
