import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandMark } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "管理者ログイン", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <div className="flex items-center gap-2.5">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-[15px] font-bold">履歴書AIサポート</p>
          <p className="text-[12px] text-muted">管理画面</p>
        </div>
      </div>
      <h1 className="mt-8 text-[22px] font-bold">ログイン</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
