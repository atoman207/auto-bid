"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/container";
import { useLang } from "@/components/lang";
import { T } from "@/components/t";
import type { Bi } from "@/lib/i18n";

export type ListenItem = {
  key: string;
  ja: string;
  hiragana: string;
  id: string;
  audioUrl: string;
  downloadUrl: string;
};

type Prefs = { kana: boolean; indo: boolean; practice: boolean; rate: number };
const PREFS_KEY = "rirekisho-listen-prefs-v1";
const RATES = [0.75, 0.9, 1, 1.15];

const LABELS = {
  intro: { ja: "自己紹介文", id: "perkenalan diri" },
  question: { ja: "質問", id: "pertanyaan" },
  answer: { ja: "回答", id: "jawaban" },
} satisfies Record<string, Bi>;

function loadPrefs(): Prefs | null {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Prefs) : null;
  } catch {
    return null;
  }
}

export function ListenView({ name, latinName, items }: { name: string; latinName: string; items: ListenItem[] }) {
  const lang = useLang();
  const [prefs, setPrefs] = useState<Prefs>({ kana: true, indo: true, practice: false, rate: 1 });
  const [current, setCurrent] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [failed, setFailed] = useState<string | null>(null);
  const [sequence, setSequence] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement>(null);
  const sequenceRef = useRef(false);
  const currentRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = loadPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser-only preferences
    if (saved) setPrefs((p) => ({ ...p, ...saved }));
  }, []);

  const updatePrefs = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (patch.rate && audioRef.current) audioRef.current.playbackRate = patch.rate;
  };

  const byKey = new Map(items.map((i) => [i.key, i]));
  const intro = byKey.get("intro");
  const pairs = Array.from({ length: 10 }, (_, i) => ({ no: i + 1, q: byKey.get(`q${i + 1}`), a: byKey.get(`a${i + 1}`) })).filter(
    (p) => p.q || p.a,
  );
  const order = items.map((i) => i.key);

  /** Must be called directly from a tap so mobile browsers allow playback. */
  const play = (key: string) => {
    const audio = audioRef.current;
    const item = byKey.get(key);
    if (!audio || !item) return;
    setFailed(null);
    if (currentRef.current === key && audio.src) {
      if (audio.paused) {
        void audio.play().catch(() => setFailed(key));
      } else {
        audio.pause();
      }
      return;
    }
    currentRef.current = key;
    setCurrent(key);
    setStatus("loading");
    audio.src = item.audioUrl;
    audio.playbackRate = prefs.rate;
    void audio.play().catch((e: unknown) => {
      if ((e as { name?: string })?.name !== "AbortError") {
        setFailed(key);
        setStatus("idle");
      }
    });
  };

  const stopAll = () => {
    sequenceRef.current = false;
    setSequence(false);
    audioRef.current?.pause();
  };

  const playAll = () => {
    if (sequence) return stopAll();
    sequenceRef.current = true;
    setSequence(true);
    currentRef.current = null;
    play(order[0]);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlaying = () => setStatus("playing");
    const onWaiting = () => setStatus("loading");
    const onPause = () => setStatus((s) => (s === "loading" ? s : "paused"));
    const onError = () => {
      setFailed(currentRef.current);
      setStatus("idle");
      sequenceRef.current = false;
      setSequence(false);
    };
    const onEnded = () => {
      setStatus("idle");
      if (!sequenceRef.current) return;
      const idx = order.indexOf(currentRef.current ?? "");
      const nextKey = order[idx + 1];
      if (!nextKey) {
        sequenceRef.current = false;
        setSequence(false);
        return;
      }
      setTimeout(() => {
        if (sequenceRef.current) play(nextKey);
      }, 700);
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
    };
  });

  const reveal = (key: string) => setRevealed((s) => new Set(s).add(key));

  // The learning material itself: Japanese, plus hiragana and the translation when switched on.
  const textBlock = (item: ListenItem, hidden: boolean) =>
    hidden ? (
      <button
        type="button"
        onClick={() => reveal(item.key)}
        className="w-full rounded-xl border-2 border-dashed border-line-strong px-4 py-5 text-[14px] text-muted hover:bg-bg active:bg-line/40"
      >
        <T ja="タップして答えを見る" id="Ketuk untuk melihat jawaban" />
      </button>
    ) : (
      <div className="space-y-2">
        <p lang="ja" className="text-[18px] leading-[1.8] text-ink">
          {item.ja}
        </p>
        {prefs.kana && item.hiragana && (
          <p lang="ja" className="text-[15px] leading-[1.9] text-muted">
            {item.hiragana}
          </p>
        )}
        {prefs.indo && item.id && (
          <p lang="id" className="border-l-2 border-accent/40 pl-3 text-[15px] leading-relaxed text-ink/80">
            {item.id}
          </p>
        )}
      </div>
    );

  const player = (item: ListenItem, label: Bi) => {
    const active = current === item.key;
    const isPlaying = active && status === "playing";
    const isLoading = active && status === "loading";
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (sequence) stopAll();
            play(item.key);
          }}
          className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors sm:flex-none sm:px-6 ${
            active ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent hover:bg-accent/15"
          }`}
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          ) : isPlaying ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
            </svg>
          )}
          {isLoading ? (
            <T ja="準備中…" id="Memuat…" />
          ) : isPlaying ? (
            <T ja="一時停止" id="Jeda" />
          ) : (
            <T ja={`${label.ja}を聞く`} id={`Dengar ${label.id}`} />
          )}
        </button>
        <a
          href={item.downloadUrl}
          download
          className="flex min-h-[46px] items-center rounded-xl border border-line-strong px-3.5 text-[13px] font-medium text-muted hover:bg-bg"
          aria-label={lang === "ja" ? `${label.ja}の音声（MP3）をダウンロード` : `Unduh audio ${label.id} (MP3)`}
        >
          MP3
        </a>
      </div>
    );
  };

  return (
    <Container className="pb-24 pt-8 lg:pt-12">
      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="text-[13px] font-semibold text-accent">
            <T ja="面接練習" id="Latihan wawancara" />
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-snug">
            {name || latinName ? (
              <T ja={`${name || latinName} さんの模範音声`} id={`Audio contoh untuk ${latinName || name}`} />
            ) : (
              <T ja="模範音声" id="Audio contoh" />
            )}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            <T
              ja="音声を聞いて、まねして声に出して練習しましょう。速さも変えられます。"
              id="Dengarkan audio, lalu tirukan dengan suara keras. Kecepatan bisa diubah."
            />
          </p>
        </div>

        {/* Controls: sticky toolbar on phones, sticky side panel on desktop */}
        <div className="sticky top-14 z-20 -mx-4 mt-5 border-b border-line bg-bg px-4 py-3 sm:top-16 sm:-mx-6 sm:px-6 lg:top-28 lg:col-start-1 lg:row-start-2 lg:mx-0 lg:mt-6 lg:self-start lg:rounded-2xl lg:border lg:bg-card lg:p-5">
          <div className="flex flex-wrap gap-2">
            <Toggle on={prefs.kana} onClick={() => updatePrefs({ kana: !prefs.kana })} label={{ ja: "ひらがな", id: "Hiragana" }} />
            <Toggle on={prefs.indo} onClick={() => updatePrefs({ indo: !prefs.indo })} label={{ ja: "インドネシア語訳", id: "Terjemahan" }} />
            <Toggle on={prefs.practice} onClick={() => updatePrefs({ practice: !prefs.practice })} label={{ ja: "練習モード", id: "Mode latihan" }} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-[13px] text-muted">
              <T ja="速さ" id="Kecepatan" />
            </span>
            <div className="flex flex-1 gap-1">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updatePrefs({ rate: r })}
                  aria-pressed={prefs.rate === r}
                  className={`min-h-[36px] flex-1 rounded-lg text-[13px] font-semibold ${
                    prefs.rate === r ? "bg-ink text-white" : "bg-card text-muted ring-1 ring-line-strong"
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={playAll}
            className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/80 text-[15px] font-semibold hover:bg-bg"
          >
            {sequence ? <T ja="■ 停止" id="■ Berhenti" /> : <T ja="▶ 最初から全部聞く" id="▶ Putar semua dari awal" />}
          </button>
          {prefs.practice && (
            <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2.5 text-[13px] leading-relaxed">
              <T
                ja="質問を聞いて、自分で答えてから、答えを確認しましょう。"
                id="Dengarkan pertanyaan, jawab sendiri, lalu periksa contoh jawabannya."
              />
            </p>
          )}
        </div>

        <div className="mt-6 space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          {failed && (
            <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">
              <T
                ja="音声を再生できませんでした。少し待ってからもう一度お試しください。"
                id="Audio belum bisa diputar. Silakan coba lagi sebentar lagi."
              />
            </p>
          )}

          {intro && (
            <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
              <h2 className="text-[14px] font-bold tracking-wide text-accent">
                <T ja="自己紹介文" id="Perkenalan diri" />
              </h2>
              <div className="mt-3">{textBlock(intro, false)}</div>
              <div className="mt-4">{player(intro, LABELS.intro)}</div>
            </section>
          )}

          {pairs.map(({ no, q, a }) => (
            <section key={no} className="rounded-2xl border border-line bg-card p-5 sm:p-6">
              <h2 className="text-[14px] font-bold tracking-wide text-accent">
                <T ja={`質問 ${no}`} id={`Pertanyaan ${no}`} />
              </h2>
              {q && (
                <div className="mt-3">
                  <div className="space-y-1.5">
                    <p lang="ja" className="text-[18px] font-semibold leading-[1.7]">
                      {q.ja}
                    </p>
                    {prefs.kana && q.hiragana && (
                      <p lang="ja" className="text-[15px] leading-[1.8] text-muted">
                        {q.hiragana}
                      </p>
                    )}
                    {prefs.indo && q.id && (
                      <p lang="id" className="text-[15px] text-ink/80">
                        {q.id}
                      </p>
                    )}
                  </div>
                  <div className="mt-3">{player(q, LABELS.question)}</div>
                </div>
              )}
              {a && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="mb-2 text-[13px] font-bold text-muted">
                    <T ja="回答例" id="Contoh jawaban" />
                  </p>
                  {textBlock(a, prefs.practice && !revealed.has(a.key))}
                  <div className="mt-4">{player(a, LABELS.answer)}</div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      <audio ref={audioRef} preload="none" className="hidden" />
    </Container>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: Bi }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-[36px] rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
        on ? "bg-ink text-white" : "bg-card text-muted ring-1 ring-line-strong"
      }`}
    >
      {on ? "✓ " : ""}
      <T {...label} />
    </button>
  );
}
