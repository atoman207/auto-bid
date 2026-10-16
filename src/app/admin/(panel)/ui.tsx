"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
        router.replace("/admin/login");
        router.refresh();
      }}
      className="rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-line/50"
    >
      ログアウト
    </button>
  );
}

export function CopyButton({ text, label = "コピー", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className={`rounded-lg border border-line-strong bg-card px-3 py-2 text-[13px] font-medium hover:bg-line/40 ${className}`}
    >
      {copied ? "コピーしました" : label}
    </button>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:bg-ink/90"
      : variant === "danger"
        ? "border border-danger/40 bg-card text-danger hover:bg-danger-soft"
        : "border border-line-strong bg-card text-ink hover:bg-line/40";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}
