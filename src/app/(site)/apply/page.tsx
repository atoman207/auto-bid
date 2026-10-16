import type { Metadata } from "next";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "情報の入力 / Isi data",
  robots: { index: false },
};

export default function ApplyPage() {
  return (
    <main className="flex-1">
      <ApplyForm />
    </main>
  );
}
