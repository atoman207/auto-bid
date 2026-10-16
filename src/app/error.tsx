"use client";

import { useEffect } from "react";
import { ErrorContent } from "@/components/status-views";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorContent onRetry={retry} />;
}
