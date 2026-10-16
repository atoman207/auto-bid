"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { pickBi } from "@/lib/i18n";
import { resultCsvRows, toCsv, type DemoResult, type DemoText } from "@/lib/demo-types";
import { useLang } from "./lang";
import { T } from "./t";

export type ModalState =
  | { status: "loading" }
  | { status: "error"; message: string; code?: string }
  | { status: "done"; result: DemoResult };

// ---------------------------------------------------------------- audio

type Playback = { key: string; status: "loading" | "playing" | "paused" | "error" } | null;

/** A tiny silent WAV, played inside the tap so mobile browsers allow the real audio afterwards. */
function silentWavUrl(): string {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function usePlayer(rate: number) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const silent = useRef<string | null>(null);
  const cache = useRef(new Map<string, string>());
  const current = useRef<string | null>(null);
  const [state, setState] = useState<Playback>(null);

  const element = () => {
    if (!audio.current) {
      const el = new Audio();
      el.addEventListener("ended", () => setState((s) => (s ? { ...s, status: "paused" } : s)));
      el.addEventListener("pause", () => setState((s) => (s && s.status === "playing" ? { ...s, status: "paused" } : s)));
      el.addEventListener("playing", () => setState((s) => (s ? { ...s, status: "playing" } : s)));
      audio.current = el;
    }
    return audio.current;
  };

  const stop = useCallback(() => {
    audio.current?.pause();
    current.current = null;
    setState(null);
  }, []);

  /** Must be called from a tap. */
  const toggle = async (key: string, url: string) => {
    const el = element();
    if (current.current === key && state && (state.status === "playing" || state.status === "paused")) {
      if (el.paused) {
        el.currentTime = el.ended ? 0 : el.currentTime;
        void el.play();
      } else el.pause();
      return;
    }
    current.current = key;
    setState({ key, status: "loading" });
    // unlock playback within the gesture
    silent.current ??= silentWavUrl();
    el.src = silent.current;
    void el.play().catch(() => undefined);
    try {
      let src = cache.current.get(url);
      if (!src) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        src = URL.createObjectURL(await res.blob());
        cache.current.set(url, src);
      }
      if (current.current !== key) return; // another button was tapped meanwhile
      el.src = src;
      el.playbackRate = rate;
      await el.play();
      setState({ key, status: "playing" });
    } catch {
      if (current.current === key) setState({ key, status: "error" });
    }
  };

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const urls = cache.current;
    return () => {
      audio.current?.pause();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return { state, toggle, stop };
}

// ---------------------------------------------------------------- modal

type Tab = "qa" | "intro" | "resume";

export function ResultModal({ state, onClose, onRetry }: { state: ModalState; onClose: () => void; onRetry: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lang = useLang();
  const [tab, setTab] = useState<Tab>("qa");
  const [kana, setKana] = useState(true);
  const [indo, setIndo] = useState(true);
  const [rate, setRate] = useState(1);
  const player = usePlayer(rate);
  const loading = state.status === "loading";

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, []);

  const close = () => {
    player.stop();
    dialog.current?.close();
    onClose();
  };

  const downloadCsv = (result: DemoResult) => {
    const blob = new Blob([toCsv(resultCsvRows(result, lang))], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = result.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "result";
    a.href = url;
    a.download = `rirekisho_${safe}_${result.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const play = (key: string, text: DemoText, label: { ja: string; id: string }) => {
    const s = player.state?.key === key ? player.state.status : null;
    return (
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void player.toggle(key, text.audio)}
          className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-colors ${
            s === "playing" ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent hover:bg-accent/15"
          }`}
        >
          {s === "loading" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          ) : s === "playing" ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
            </svg>
          )}
          {s === "loading" ? (
            <T ja="音声を準備中…" id="Menyiapkan audio…" />
          ) : s === "playing" ? (
            <T ja="一時停止" id="Jeda" />
          ) : (
            <T ja={`${label.ja}を聞く`} id={`Dengar ${label.id}`} />
          )}
        </button>
        <a href={`${text.audio}&download=1`} className="inline-flex min-h-[42px] items-center rounded-xl border border-line-strong px-3 text-[13px] font-medium text-muted hover:bg-bg">
          MP3
        </a>
        {s === "error" && (
          <span role="alert" className="text-[13px] text-danger">
            <T ja="再生できませんでした" id="Gagal diputar" />
          </span>
        )}
      </div>
    );
  };

  const texts = (t: DemoText, big = false) => (
    <div className="space-y-1.5">
      <p lang="ja" className={big ? "text-[17px] font-semibold leading-[1.75]" : "text-[16px] leading-[1.8]"}>
        {t.ja}
      </p>
      {kana && t.hiragana && (
        <p lang="ja" className="text-[14px] leading-[1.8] text-muted">
          {t.hiragana}
        </p>
      )}
      {indo && t.id && (
        <p lang="id" className="border-l-2 border-accent/40 pl-3 text-[14px] leading-relaxed text-ink/80">
          {t.id}
        </p>
      )}
    </div>
  );

  return (
    <dialog
      ref={dialog}
      aria-labelledby="result-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) close();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-ink/60 backdrop:backdrop-blur-[2px] sm:m-auto sm:h-[min(92dvh,940px)] sm:w-[min(900px,calc(100vw-48px))]"
    >
      <div className="flex h-full flex-col overflow-hidden bg-card sm:rounded-2xl sm:shadow-2xl">
        {/* header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-accent">
              <T ja="デモ版・AIの作成結果" id="Versi demo · Hasil AI" />
            </p>
            <h2 id="result-title" className="truncate text-[18px] font-bold sm:text-[20px]">
              {state.status === "done" ? (
                <T ja={`${state.result.nameKana || state.result.name} さんの面接練習`} id={`Latihan wawancara ${state.result.name}`} />
              ) : (
                <T ja="AIが作成しています" id="AI sedang membuat teks" />
              )}
            </h2>
          </div>
          {!loading && (
            <button type="button" onClick={close} aria-label={lang === "ja" ? "閉じる" : "Tutup"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-ink">
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {state.status === "loading" && <Loading />}

        {state.status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-[24px] font-bold text-danger">!</div>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed">{pickBi(state.message, lang)}</p>
            {state.code && (
              <p className="mt-2 font-mono text-[12px] text-muted">
                <T ja="エラーコード" id="Kode error" />: {state.code}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={close} className="min-h-[46px] rounded-xl border border-line-strong px-6 font-semibold hover:bg-bg">
                <T ja="閉じる" id="Tutup" />
              </button>
              <button type="button" onClick={onRetry} className="min-h-[46px] rounded-xl bg-accent px-6 font-semibold text-accent-ink hover:bg-accent-hover">
                <T ja="もう一度作成する" id="Coba lagi" />
              </button>
            </div>
          </div>
        )}

        {state.status === "done" && (
          <>
            {/* tabs & display options */}
            <div className="shrink-0 border-b border-line bg-bg/60 px-4 pt-3 sm:px-6">
              <div role="tablist" className="flex gap-1 overflow-x-auto">
                {(
                  [
                    ["qa", { ja: "面接（10問）", id: "Wawancara (10)" }],
                    ["intro", { ja: "自己紹介文", id: "Perkenalan diri" }],
                    ["resume", { ja: "履歴書", id: "CV" }],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => {
                      player.stop();
                      setTab(key);
                    }}
                    className={`shrink-0 rounded-t-lg border-b-2 px-3 py-2.5 text-[14px] font-semibold ${
                      tab === key ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    <T {...label} />
                  </button>
                ))}
              </div>
            </div>
            {tab !== "resume" && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 sm:px-6">
                <Chip on={kana} onClick={() => setKana(!kana)} label={{ ja: "ひらがな", id: "Hiragana" }} />
                <Chip on={indo} onClick={() => setIndo(!indo)} label={{ ja: "インドネシア語訳", id: "Terjemahan" }} />
                <span className="ml-auto flex items-center gap-1 text-[12px] text-muted">
                  <T ja="速さ" id="Kecepatan" />
                  {[0.8, 1, 1.15].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRate(r)}
                      aria-pressed={rate === r}
                      className={`min-h-[32px] rounded-lg px-2.5 font-semibold ${rate === r ? "bg-ink text-white" : "bg-card ring-1 ring-line-strong"}`}
                    >
                      {r}x
                    </button>
                  ))}
                </span>
              </div>
            )}

            {/* body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              {tab === "qa" && (
                <ol className="space-y-4">
                  {state.result.qa.map(({ no, question, answer }) => (
                    <li key={no} className="rounded-2xl border border-line p-4 sm:p-5">
                      <p className="text-[13px] font-bold text-accent">
                        <T ja={`質問 ${no}`} id={`Pertanyaan ${no}`} />
                      </p>
                      <div className="mt-2">{texts(question, true)}</div>
                      {play(`q${no}`, question, { ja: "質問", id: "pertanyaan" })}
                      <div className="mt-4 border-t border-line pt-4">
                        <p className="mb-2 text-[12px] font-bold text-muted">
                          <T ja="回答例" id="Contoh jawaban" />
                        </p>
                        {texts(answer)}
                        {play(`a${no}`, answer, { ja: "回答", id: "jawaban" })}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {tab === "intro" && (
                <div className="rounded-2xl border border-line p-4 sm:p-5">
                  <p className="text-[13px] font-bold text-accent">
                    <T ja="自己紹介文（履歴書用）" id="Perkenalan diri (untuk CV)" />
                  </p>
                  <div className="mt-2">{texts(state.result.intro)}</div>
                  {play("intro", state.result.intro, { ja: "自己紹介文", id: "perkenalan diri" })}
                </div>
              )}

              {tab === "resume" && <ResumeView result={state.result} />}
            </div>

            {/* footer */}
            <div className="flex shrink-0 flex-col gap-2 border-t border-line px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:px-6 sm:pb-4">
              <p className="text-[12px] text-muted sm:flex-1">
                {state.result.saved ? (
                  <T ja="この結果はスプレッドシートにも保存されます。" id="Hasil ini juga disimpan ke spreadsheet." />
                ) : (
                  <T ja="デモ版のため、結果は保存されません。必要な場合はCSVをダウンロードしてください。" id="Versi demo: hasil tidak disimpan. Unduh CSV jika diperlukan." />
                )}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={close} className="min-h-[48px] flex-1 rounded-xl border border-line-strong px-5 font-semibold hover:bg-bg sm:flex-none">
                  <T ja="閉じる" id="Tutup" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv(state.result)}
                  className="inline-flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-ink hover:bg-accent-hover sm:flex-none"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
                    <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <T ja="CSVをダウンロード" id="Unduh CSV" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: { ja: string; id: string } }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-[34px] rounded-full px-3 text-[13px] font-semibold ${on ? "bg-ink text-white" : "bg-card text-muted ring-1 ring-line-strong"}`}
    >
      {on ? "✓ " : ""}
      <T {...label} />
    </button>
  );
}

const STEPS = [
  { ja: "名前と住所を日本語に変換", id: "Mengubah nama & alamat ke bahasa Jepang" },
  { ja: "自己紹介文を作成", id: "Membuat perkenalan diri" },
  { ja: "面接の回答例を10問作成", id: "Membuat 10 contoh jawaban wawancara" },
  { ja: "ひらがな・インドネシア語を確認", id: "Memeriksa hiragana & terjemahan" },
];

function Loading() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const active = Math.min(STEPS.length - 1, Math.floor(seconds / 8));
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10" aria-busy aria-live="polite">
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-accent/20 border-t-accent" aria-hidden />
      <p className="mt-5 text-[16px] font-semibold">
        <T ja="AIが文章を作成しています…" id="AI sedang membuat teks…" />
      </p>
      <p className="mt-1 text-[13px] text-muted">
        <T ja={`約20〜40秒かかります（${seconds}秒経過）`} id={`Butuh ± 20–40 detik (${seconds} detik)`} />
      </p>
      <ol className="mt-6 w-full max-w-sm space-y-2">
        {STEPS.map((s, i) => (
          <li key={s.ja} className={`flex items-center gap-3 text-[14px] ${i <= active ? "text-ink" : "text-faint"}`}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                i < active ? "bg-ok text-white" : i === active ? "bg-accent text-white" : "border border-line-strong"
              }`}
            >
              {i < active ? "✓" : i + 1}
            </span>
            <T {...s} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Row({ label, children }: { label: { ja: string; id: string }; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-[13px] font-semibold text-muted">
        <T {...label} />
      </dt>
      <dd lang="ja" className="whitespace-pre-line text-[15px] leading-relaxed">
        {children}
      </dd>
    </div>
  );
}

function YearTable({ rows }: { rows: DemoResult["history"] }) {
  return (
    <table className="w-full text-[14px]">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line last:border-0">
            <td className="w-14 py-2 pr-2 text-center text-muted">{r.year}</td>
            <td className="w-8 py-2 pr-2 text-center text-muted">{r.month}</td>
            <td lang="ja" className="py-2">
              {r.text}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResumeView({ result }: { result: DemoResult }) {
  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-bg px-4 py-3 text-[13px] leading-relaxed text-muted">
        <T
          ja="履歴書に入る主な内容です（日本語）。正式な履歴書は担当者が確認・修正してからお渡しします。"
          id="Isi utama CV dalam bahasa Jepang. CV resmi akan diperiksa dan diperbaiki staf kami sebelum diberikan."
        />
      </p>
      <dl>
        <Row label={{ ja: "氏名", id: "Nama" }}>
          {result.name}
          <span className="block text-[13px] text-muted">{result.nameKana}</span>
        </Row>
        <Row label={{ ja: "現住所", id: "Alamat" }}>{result.address}</Row>
        <Row label={{ ja: "志望の動機", id: "Motivasi" }}>{result.motivation}</Row>
        <Row label={{ ja: "趣味・特技", id: "Hobi & keahlian" }}>{result.hobbies}</Row>
        <Row label={{ ja: "本人希望", id: "Permintaan pribadi" }}>{result.request}</Row>
      </dl>
      <section>
        <h3 className="mb-2 text-[14px] font-bold">
          <T ja="学歴・職歴" id="Pendidikan & pekerjaan" />
        </h3>
        <div className="rounded-xl border border-line px-3">
          <YearTable rows={result.history} />
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-[14px] font-bold">
          <T ja="免許・資格" id="Sertifikat & lisensi" />
        </h3>
        <div className="rounded-xl border border-line px-3">
          <YearTable rows={result.licenses} />
        </div>
      </section>
    </div>
  );
}
