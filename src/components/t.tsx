import type { ReactNode } from "react";

/**
 * Text in both languages; CSS shows only the selected one (see `data-lang` on <html>).
 * Works in Server and Client Components and never flashes the other language.
 */
export function T({ ja, id }: { ja: ReactNode; id: ReactNode }) {
  return (
    <>
      <span className="t-ja" lang="ja">
        {ja}
      </span>
      <span className="t-id" lang="id">
        {id}
      </span>
    </>
  );
}
