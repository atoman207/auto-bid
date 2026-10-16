import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteFooter } from "@/components/brand";
import { Container } from "@/components/container";
import { T } from "@/components/t";
import { verifyListenToken } from "@/lib/crypto";
import { audioUrl, loadLearner } from "@/lib/learner";
import { SheetNotFoundError } from "@/lib/sheets";
import { ListenView, type ListenItem } from "./listen-view";

export const metadata: Metadata = {
  title: "面接練習 / Latihan wawancara",
  robots: { index: false, follow: false },
};

export default function ListenPage({ params }: PageProps<"/listen/[token]">) {
  return (
    <>
      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          <ListenContent params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

function Loading() {
  return (
    <Container className="py-10" >
      <div className="mx-auto max-w-3xl" aria-busy>
        <p className="text-muted">
          <T ja="読み込み中…" id="Memuat…" />
        </p>
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-line/60" />
          ))}
        </div>
      </div>
    </Container>
  );
}

async function ListenContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const sheetId = verifyListenToken(token);
  if (sheetId === null) notFound();

  let data;
  try {
    data = await loadLearner(sheetId);
  } catch (e) {
    if (e instanceof SheetNotFoundError) notFound();
    throw e;
  }

  const items: ListenItem[] = data.items
    .filter((i) => i.ja)
    .map((i) => ({
      key: i.key,
      ja: i.ja,
      hiragana: i.hiragana,
      id: i.id,
      audioUrl: audioUrl(token, i.key, i.audioHash),
      downloadUrl: audioUrl(token, i.key, i.audioHash, true),
    }));

  return <ListenView name={data.content.kana || data.content.name} latinName={data.content.name} items={items} />;
}
