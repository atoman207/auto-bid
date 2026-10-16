"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Container } from "@/components/container";
import { BiText, CheckCards, Field, RadioCards, SelectField, TextArea, TextField } from "@/components/form-controls";
import { useLang } from "@/components/lang";
import { T } from "@/components/t";
import { bi, pickBi, type Bi, type Lang } from "@/lib/i18n";
import {
  CONSIDERATIONS, CONTACT_METHODS, DESIRED_FIELDS, DURATIONS, EDUCATION_LEVELS, EDUCATION_STATUS, EMPLOYMENT_TYPES,
  FAMILY_OPINIONS, FUTURE_GOALS, GENDERS, HOBBIES, INDUSTRIES, JAPAN_EXPERIENCE, JFT_RESULTS, JLPT_LEVELS, JOB_TYPES,
  LICENSES, LOCATIONS, MAJORS, MONTHS, PREFECTURES, PROVINCES, RESIDENCES, SKILLS, SSW_FIELDS, START_TIMINGS,
  STAY_LENGTHS, STRENGTHS, STRESS_RELIEF, STUDY_METHODS, STUDY_PERIODS, VISA_PLANS, WEAKNESSES, WHY_JAPAN, WHY_JOB,
  WORK_CONDITIONS, yearOptions, type Option,
} from "@/lib/options";
import {
  emptyEducation, emptyForm, emptyWork, validateStep, type EducationForm, type FieldErrors, type FormState,
  type WorkForm,
} from "@/lib/schema";

const DRAFT_KEY = "rirekisho-draft-v1";
export const DONE_KEY = "rirekisho-submitted-v1";

const STEPS: Bi[] = [
  { ja: "基本情報", id: "Data diri" },
  { ja: "連絡先", id: "Kontak" },
  { ja: "学歴", id: "Pendidikan" },
  { ja: "職歴", id: "Pengalaman kerja" },
  { ja: "日本語・資格", id: "Bahasa Jepang & sertifikat" },
  { ja: "希望の条件", id: "Keinginan kerja" },
  { ja: "性格・趣味", id: "Kepribadian & hobi" },
  { ja: "志望動機", id: "Motivasi" },
  { ja: "確認・送信", id: "Periksa & kirim" },
];

const MSG_FAILED = bi("送信できませんでした。時間をおいてもう一度お試しください。", "Gagal mengirim. Silakan coba lagi.");
const MSG_OFFLINE = bi(
  "通信エラーが発生しました。電波の良い場所でもう一度お試しください。",
  "Koneksi bermasalah. Silakan coba lagi di tempat dengan sinyal yang baik.",
);

const YEAR: Bi = { ja: "年", id: "Tahun" };
const MONTH: Bi = { ja: "月", id: "Bulan" };

/** Fields that share one wrapper with another field. */
const ERROR_ANCHOR: Record<string, string> = { birthMonth: "birthYear", birthDay: "birthYear", jlptMonth: "jlptYear" };

type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;
type StepProps = { form: FormState; set: Setter; errors: FieldErrors };
type Draft = { form: Partial<FormState>; step: number; furthest?: number };

function useYears() {
  const year = new Date().getFullYear();
  return {
    birth: yearOptions(1960, year - 15),
    past: yearOptions(1975, year),
    future: yearOptions(1975, year + 5),
  };
}

const DAYS: Option[] = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), ja: `${i + 1}日`, id: String(i + 1) }));

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage may be unavailable (private mode); the form still works
  }
}

// =====================================================================

export function ApplyForm() {
  const router = useRouter();
  const lang = useLang();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState<{ id: string } | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const draft = readStorage<Draft>(DRAFT_KEY);
    const finished = readStorage<{ id: string }>(DONE_KEY);
    // Restoring browser-only state after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft?.form) {
      const s = Math.min(Math.max(0, draft.step ?? 0), STEPS.length - 1);
      setForm({ ...emptyForm(), ...draft.form });
      setStep(s);
      setFurthest(Math.max(s, Math.min(draft.furthest ?? 0, STEPS.length - 1)));
    }
    if (finished?.id) setDone(finished);
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (mounted && !done) writeStorage(DRAFT_KEY, { form, step, furthest } satisfies Draft);
  }, [form, step, furthest, mounted, done]);

  const set: Setter = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const k = String(key);
      if (!Object.keys(e).some((x) => x === k || x.startsWith(`${k}.`))) return e;
      return Object.fromEntries(Object.entries(e).filter(([x]) => x !== k && !x.startsWith(`${k}.`)));
    });
  };

  const goTo = (n: number) => {
    setStep(n);
    setFurthest((f) => Math.max(f, n));
    setServerError("");
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: "start" }));
  };

  const focusFirstError = (errs: FieldErrors) => {
    requestAnimationFrame(() => {
      const keys = Object.keys(errs).map((k) => ERROR_ANCHOR[k] ?? k);
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[id^='f-']"));
      const target = nodes.find((n) => {
        const name = n.id.slice(2);
        return keys.some((k) => k === name || k.startsWith(`${name}.`));
      });
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const next = () => {
    const errs = validateStep(step, form);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(errs);
    goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const submit = async () => {
    for (let s = 0; s < STEPS.length; s++) {
      const errs = validateStep(s, form);
      if (Object.keys(errs).length) {
        setErrors(errs);
        if (s !== step) goTo(s);
        return focusFirstError(errs);
      }
    }
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website: honeypot.current?.value ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; id?: string; error?: string; errors?: FieldErrors; step?: number; duplicate?: boolean;
      };
      if (res.ok && data.ok && data.id) {
        writeStorage(DONE_KEY, { id: data.id, at: Date.now() });
        writeStorage(DRAFT_KEY, null);
        router.replace("/thanks");
        return;
      }
      if (res.status === 400 && data.errors && typeof data.step === "number") {
        setErrors(data.errors);
        goTo(data.step);
        focusFirstError(data.errors);
      }
      setServerError(data.error ?? MSG_FAILED);
    } catch {
      setServerError(MSG_OFFLINE);
    }
    setSubmitting(false);
  };

  if (!mounted) {
    return (
      <Container className="py-20 text-center text-muted">
        <p aria-busy>
          <T ja="読み込み中…" id="Memuat…" />
        </p>
      </Container>
    );
  }

  if (done) return <AlreadySubmitted id={done.id} onReset={() => { writeStorage(DONE_KEY, null); setDone(null); }} />;

  const stepProps: StepProps = { form, set, errors };
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div ref={top} className="scroll-mt-16">
      {/* Phone / tablet progress, below the site header */}
      <div className="sticky top-14 z-20 border-b border-line bg-bg sm:top-16 lg:hidden">
        <Container className="py-3">
          <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
            <span className="truncate font-semibold text-ink">
              <T {...STEPS[step]} />
            </span>
            <span className="shrink-0">
              <T ja={`ステップ ${step + 1} / ${STEPS.length}`} id={`Langkah ${step + 1} dari ${STEPS.length}`} />
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </Container>
      </div>

      <Container className="pb-36 pt-6 lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-14 lg:pb-20 lg:pt-12">
        <aside className="hidden lg:block">
          <StepNav step={step} furthest={furthest} progress={progress} onSelect={goTo} disabled={submitting} />
        </aside>

        <div className="mx-auto w-full max-w-[720px] lg:mx-0">
          <p className="hidden text-[13px] font-semibold text-accent lg:block">
            <T ja={`ステップ ${step + 1} / ${STEPS.length}`} id={`Langkah ${step + 1} dari ${STEPS.length}`} />
          </p>
          <h1 className="text-[24px] font-bold leading-tight lg:mt-1 lg:text-[30px]">
            <BiText {...STEPS[step]} />
          </h1>

          <div className="mt-6 space-y-8 lg:mt-8">
            {step === 0 && <StepBasic {...stepProps} />}
            {step === 1 && <StepContact {...stepProps} />}
            {step === 2 && <StepEducation {...stepProps} />}
            {step === 3 && <StepWork {...stepProps} />}
            {step === 4 && <StepJapanese {...stepProps} />}
            {step === 5 && <StepWishes {...stepProps} />}
            {step === 6 && <StepPersonality {...stepProps} />}
            {step === 7 && <StepMotivation {...stepProps} />}
            {step === 8 && <StepConfirm {...stepProps} goTo={goTo} />}
          </div>

          {/* Honeypot for bots — hidden from people and screen readers. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          {Object.keys(errors).length > 0 && (
            <p role="alert" className="mt-8 rounded-xl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">
              <T ja="赤い項目を確認してください。" id="Silakan periksa bagian yang berwarna merah." />
            </p>
          )}
          {serverError && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">
              {pickBi(serverError, lang)}
            </p>
          )}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur lg:static lg:z-auto lg:mt-10 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
            <div className="mx-auto flex w-full max-w-[720px] gap-3 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:max-w-none lg:justify-between lg:p-0">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  disabled={submitting}
                  className="min-h-[52px] flex-1 rounded-xl border border-line-strong bg-card text-[16px] font-semibold text-ink hover:bg-bg active:bg-line/40 disabled:opacity-50 lg:flex-none lg:px-10"
                >
                  <T ja="戻る" id="Kembali" />
                </button>
              ) : (
                <span className="hidden lg:block" />
              )}
              <button
                type="button"
                onClick={isLast ? submit : next}
                disabled={submitting}
                className="min-h-[52px] flex-[2] rounded-xl bg-accent text-[16px] font-bold text-accent-ink shadow-sm hover:bg-accent-hover active:bg-accent-hover disabled:opacity-60 lg:flex-none lg:px-14"
              >
                {submitting ? (
                  <T ja="送信中…" id="Mengirim…" />
                ) : isLast ? (
                  <T ja="この内容で送信する" id="Kirim data ini" />
                ) : (
                  <T ja="次へ" id="Lanjut" />
                )}
              </button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function StepNav({
  step,
  furthest,
  progress,
  onSelect,
  disabled,
}: {
  step: number;
  furthest: number;
  progress: number;
  onSelect: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <nav className="sticky top-28" aria-label="Steps">
      <p className="text-[13px] font-semibold text-muted">
        <T ja="入力の流れ" id="Langkah pengisian" />
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <ol className="mt-5 space-y-1">
        {STEPS.map((s, i) => {
          const current = i === step;
          const visited = i <= furthest;
          return (
            <li key={s.ja}>
              <button
                type="button"
                disabled={disabled || current || !visited}
                onClick={() => onSelect(i)}
                aria-current={current ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors ${
                  current ? "bg-card font-bold text-ink shadow-sm ring-1 ring-line" : visited ? "text-ink hover:bg-card" : "cursor-default text-faint"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                    current ? "bg-accent text-white" : visited ? "bg-ink text-white" : "border border-line-strong text-faint"
                  }`}
                >
                  {visited && !current ? "✓" : i + 1}
                </span>
                <T {...s} />
              </button>
            </li>
          );
        })}
      </ol>
      <Link href="/" className="mt-6 inline-block px-3 text-[13px] text-muted hover:text-ink hover:underline">
        <T ja="← トップへ戻る" id="← Kembali ke beranda" />
      </Link>
    </nav>
  );
}

function AlreadySubmitted({ id, onReset }: { id: string; onReset: () => void }) {
  return (
    <Container className="py-12 lg:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <h1 className="text-[22px] font-bold leading-snug">
            <T ja="この端末からはすでに送信されています" id="Data dari perangkat ini sudah dikirim" />
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            <T
              ja="ご利用はお一人様1回までです。担当者からの連絡をお待ちください。"
              id="Layanan ini hanya untuk 1 kali per orang. Mohon tunggu kabar dari staf kami."
            />
          </p>
          <p className="mt-4 rounded-lg bg-bg px-3 py-2 font-mono text-[14px]">
            <T ja="受付番号" id="No. pendaftaran" />: {id}
          </p>
          <Link href="/" className="mt-6 inline-flex min-h-[48px] items-center rounded-xl border border-line-strong px-5 font-semibold hover:bg-bg">
            <T ja="トップへ戻る" id="Kembali ke beranda" />
          </Link>
        </div>
        <button type="button" onClick={onReset} className="mt-6 text-left text-[13px] text-muted underline underline-offset-2">
          <T ja="別の人の情報を入力する（家族のスマホを借りている場合など）" id="Isi untuk orang lain (misalnya memakai HP keluarga)" />
        </button>
      </div>
    </Container>
  );
}

// =====================================================================
// Steps
// =====================================================================

function Note({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-muted">{children}</p>;
}

function StepBasic({ form, set, errors }: StepProps) {
  const years = useYears();
  return (
    <>
      <Field
        name="fullName"
        required
        label={{ ja: "氏名（ローマ字）", id: "Nama lengkap (huruf latin)" }}
        hint={{ ja: "パスポートと同じつづりで入力してください。", id: "Tulis sama seperti di paspor." }}
        error={errors.fullName}
      >
        <TextField
          value={form.fullName}
          onChange={(v) => set("fullName", v)}
          placeholder="SITI NURHALIZA"
          autoComplete="name"
          autoCapitalize="characters"
          maxLength={60}
          invalid={!!errors.fullName}
        />
      </Field>

      <Field as="fieldset" name="gender" required label={{ ja: "性別", id: "Jenis kelamin" }} error={errors.gender}>
        <RadioCards name="gender" options={GENDERS} value={form.gender} onChange={(v) => set("gender", v)} columns={3} />
      </Field>

      <Field
        name="birthYear"
        required
        label={{ ja: "生年月日", id: "Tanggal lahir" }}
        error={errors.birthYear || errors.birthMonth || errors.birthDay}
      >
        <div className="grid grid-cols-[1.25fr_1fr_1fr] gap-2 sm:max-w-md">
          <SelectField label={YEAR} placeholder={YEAR} options={years.birth} value={form.birthYear} onChange={(v) => set("birthYear", v)} compact invalid={!!errors.birthYear} />
          <SelectField label={MONTH} placeholder={MONTH} options={MONTHS} value={form.birthMonth} onChange={(v) => set("birthMonth", v)} compact invalid={!!errors.birthMonth} />
          <SelectField label={{ ja: "日", id: "Tanggal" }} placeholder={{ ja: "日", id: "Tgl" }} options={DAYS} value={form.birthDay} onChange={(v) => set("birthDay", v)} compact invalid={!!errors.birthDay} />
        </div>
      </Field>

      <Field name="origin" required label={{ ja: "出身地（州）", id: "Provinsi asal" }} error={errors.origin}>
        <SelectField options={PROVINCES} value={form.origin} onChange={(v) => set("origin", v)} invalid={!!errors.origin} />
      </Field>

      <Field as="fieldset" name="residence" required label={{ ja: "今住んでいる国", id: "Negara tempat tinggal sekarang" }} error={errors.residence}>
        <RadioCards name="residence" options={RESIDENCES} value={form.residence} onChange={(v) => set("residence", v)} columns={3} />
      </Field>

      {form.residence === "indonesia" && (
        <Field name="residenceProvince" required label={{ ja: "今住んでいる州", id: "Provinsi tempat tinggal" }} error={errors.residenceProvince}>
          <SelectField options={PROVINCES} value={form.residenceProvince} onChange={(v) => set("residenceProvince", v)} invalid={!!errors.residenceProvince} />
        </Field>
      )}
      {form.residence === "japan" && (
        <Field name="residencePrefecture" required label={{ ja: "今住んでいる都道府県", id: "Prefektur tempat tinggal" }} error={errors.residencePrefecture}>
          <SelectField options={PREFECTURES} value={form.residencePrefecture} onChange={(v) => set("residencePrefecture", v)} invalid={!!errors.residencePrefecture} />
        </Field>
      )}
      {form.residence === "other" && (
        <Field name="residenceCountry" required label={{ ja: "国の名前", id: "Nama negara" }} error={errors.residenceCountry}>
          <TextField value={form.residenceCountry} onChange={(v) => set("residenceCountry", v)} placeholder="Malaysia" maxLength={40} invalid={!!errors.residenceCountry} />
        </Field>
      )}
      {form.residence && (
        <Field name="city" label={{ ja: "市・町の名前", id: "Nama kota / kabupaten" }} error={errors.city}>
          <TextField value={form.city} onChange={(v) => set("city", v)} placeholder={form.residence === "japan" ? "Nagoya" : "Bandung"} maxLength={60} />
        </Field>
      )}
    </>
  );
}

function StepContact({ form, set, errors }: StepProps) {
  const method = form.contactMethod;
  const valueLabel: Bi =
    method === "whatsapp"
      ? { ja: "WhatsApp の電話番号", id: "Nomor WhatsApp" }
      : method === "line"
        ? { ja: "LINE ID", id: "LINE ID" }
        : { ja: "メールアドレス", id: "Alamat email" };
  return (
    <>
      <div className="rounded-xl bg-accent-soft px-4 py-3 text-[15px] leading-relaxed text-ink">
        <T
          ja="担当者がこの連絡先にご連絡し、履歴書と模範音声をお送りします。"
          id="Staf kami akan menghubungi Anda melalui kontak ini untuk mengirim CV dan audio contoh."
        />
      </div>
      <Field as="fieldset" name="contactMethod" required label={{ ja: "いちばん連絡がとりやすい方法", id: "Cara dihubungi yang paling mudah" }} error={errors.contactMethod}>
        <RadioCards name="contactMethod" options={CONTACT_METHODS} value={form.contactMethod} onChange={(v) => set("contactMethod", v)} columns={3} />
      </Field>
      {method && (
        <Field name="contactValue" required label={valueLabel} error={errors.contactValue}>
          <TextField
            value={form.contactValue}
            onChange={(v) => set("contactValue", v)}
            type={method === "whatsapp" ? "tel" : method === "email" ? "email" : "text"}
            inputMode={method === "whatsapp" ? "tel" : method === "email" ? "email" : "text"}
            autoComplete={method === "whatsapp" ? "tel" : method === "email" ? "email" : "off"}
            autoCapitalize="none"
            placeholder={method === "whatsapp" ? "+62 812 3456 7890" : method === "line" ? "line_id123" : "nama@email.com"}
            maxLength={80}
            invalid={!!errors.contactValue}
          />
        </Field>
      )}
      {method && method !== "email" && (
        <Field name="email" label={{ ja: "メールアドレス", id: "Alamat email" }} error={errors.email}>
          <TextField
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="nama@email.com"
            maxLength={120}
            invalid={!!errors.email}
          />
        </Field>
      )}
    </>
  );
}

function YearMonth({
  name,
  year,
  month,
  years,
  onYear,
  onMonth,
  errors,
}: {
  name: string;
  year: string;
  month: string;
  years: Option[];
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  errors: FieldErrors;
}) {
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-2 sm:max-w-md">
      <SelectField label={YEAR} placeholder={YEAR} options={years} value={year} onChange={onYear} invalid={!!errors[`${name}Year`]} />
      <SelectField label={MONTH} placeholder={MONTH} options={MONTHS} value={month} onChange={onMonth} />
    </div>
  );
}

function EntryCard({ title, onRemove, children }: { title: Bi; onRemove?: () => void; children: ReactNode }) {
  return (
    <div className="space-y-6 rounded-2xl border border-line bg-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-bold">
          <BiText {...title} />
        </h2>
        {onRemove && (
          <button type="button" onClick={onRemove} className="min-h-[40px] rounded-lg px-3 text-[14px] font-semibold text-danger hover:bg-danger-soft">
            <T ja="削除" id="Hapus" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: Bi }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong text-[15px] font-semibold text-ink hover:bg-card active:bg-line/40"
    >
      <span aria-hidden className="text-[20px] leading-none">＋</span>
      <T {...label} />
    </button>
  );
}

function StepEducation({ form, set, errors }: StepProps) {
  const years = useYears();
  const update = (i: number, patch: Partial<EducationForm>) =>
    set("education", form.education.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => set("education", form.education.filter((_, j) => j !== i));
  return (
    <>
      <Note>
        <T
          ja="高校（SMA・SMK）、大学、LPK など、主な学校を入力してください（3つまで）。"
          id="Isi sekolah utama Anda seperti SMA/SMK, kuliah, atau LPK (maksimal 3)."
        />
      </Note>
      {form.education.map((e, i) => {
        const p = `education.${i}`;
        return (
          <EntryCard
            key={i}
            title={{ ja: `学校 ${i + 1}`, id: `Sekolah ${i + 1}` }}
            onRemove={form.education.length > 1 ? () => remove(i) : undefined}
          >
            <Field name={`${p}.level`} required label={{ ja: "学校の種類", id: "Jenis sekolah" }} error={errors[`${p}.level`]}>
              <SelectField options={EDUCATION_LEVELS} value={e.level} onChange={(v) => update(i, { level: v })} invalid={!!errors[`${p}.level`]} />
            </Field>
            <Field name={`${p}.schoolName`} label={{ ja: "学校名", id: "Nama sekolah" }} error={errors[`${p}.schoolName`]}>
              <TextField value={e.schoolName} onChange={(v) => update(i, { schoolName: v })} placeholder="SMK Negeri 1 Bandung" maxLength={80} />
            </Field>
            <Field name={`${p}.major`} required label={{ ja: "専攻・学科", id: "Jurusan" }} error={errors[`${p}.major`]}>
              <SelectField options={MAJORS} value={e.major} onChange={(v) => update(i, { major: v })} invalid={!!errors[`${p}.major`]} />
            </Field>
            <Field name={`${p}.startYear`} required label={{ ja: "入学した年月", id: "Tahun & bulan masuk" }} error={errors[`${p}.startYear`]}>
              <YearMonth name={`${p}.start`} year={e.startYear} month={e.startMonth} years={years.past} onYear={(v) => update(i, { startYear: v })} onMonth={(v) => update(i, { startMonth: v })} errors={errors} />
            </Field>
            <Field as="fieldset" name={`${p}.status`} required label={{ ja: "状況", id: "Status" }} error={errors[`${p}.status`]}>
              <RadioCards name={`${p}.status`} options={EDUCATION_STATUS} value={e.status} onChange={(v) => update(i, { status: v })} columns={2} />
            </Field>
            {e.status !== "enrolled" && (
              <Field
                name={`${p}.endYear`}
                required
                label={e.status === "expected" ? { ja: "卒業予定の年月", id: "Perkiraan lulus" } : { ja: "卒業・修了・退学した年月", id: "Tahun & bulan selesai" }}
                error={errors[`${p}.endYear`]}
              >
                <YearMonth name={`${p}.end`} year={e.endYear} month={e.endMonth} years={years.future} onYear={(v) => update(i, { endYear: v })} onMonth={(v) => update(i, { endMonth: v })} errors={errors} />
              </Field>
            )}
          </EntryCard>
        );
      })}
      {form.education.length < 3 && (
        <AddButton onClick={() => set("education", [...form.education, emptyEducation()])} label={{ ja: "学校を追加", id: "Tambah sekolah" }} />
      )}
    </>
  );
}

function StepWork({ form, set, errors }: StepProps) {
  const years = useYears();
  const lang = useLang();
  const update = (i: number, patch: Partial<WorkForm>) => set("work", form.work.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const remove = (i: number) => set("work", form.work.filter((_, j) => j !== i));
  return (
    <>
      <Field
        as="fieldset"
        name="hasWork"
        required
        label={{ ja: "仕事の経験はありますか？", id: "Apakah Anda punya pengalaman kerja?" }}
        hint={{ ja: "アルバイト・実習・家の仕事も含みます。", id: "Termasuk kerja paruh waktu, magang, dan usaha keluarga." }}
        error={errors.hasWork}
      >
        <RadioCards
          name="hasWork"
          options={[
            { value: "yes", ja: "ある", id: "Ada" },
            { value: "no", ja: "ない", id: "Tidak ada" },
          ]}
          value={form.hasWork}
          onChange={(v) => {
            set("hasWork", v);
            if (v === "yes" && form.work.length === 0) set("work", [emptyWork()]);
          }}
          columns={2}
        />
      </Field>

      {form.hasWork === "yes" && (
        <>
          {errors.work && <p className="text-[14px] font-medium text-danger">{pickBi(errors.work, lang)}</p>}
          {form.work.map((w, i) => {
            const p = `work.${i}`;
            return (
              <EntryCard key={i} title={{ ja: `仕事 ${i + 1}`, id: `Pekerjaan ${i + 1}` }} onRemove={() => remove(i)}>
                <Field name={`${p}.industry`} required label={{ ja: "業種", id: "Bidang usaha" }} error={errors[`${p}.industry`]}>
                  <SelectField options={INDUSTRIES} value={w.industry} onChange={(v) => update(i, { industry: v })} invalid={!!errors[`${p}.industry`]} />
                </Field>
                <Field name={`${p}.jobType`} required label={{ ja: "仕事の内容", id: "Jenis pekerjaan" }} error={errors[`${p}.jobType`]}>
                  <SelectField options={JOB_TYPES} value={w.jobType} onChange={(v) => update(i, { jobType: v })} invalid={!!errors[`${p}.jobType`]} />
                </Field>
                <Field name={`${p}.employment`} required label={{ ja: "働き方", id: "Status kerja" }} error={errors[`${p}.employment`]}>
                  <SelectField options={EMPLOYMENT_TYPES} value={w.employment} onChange={(v) => update(i, { employment: v })} invalid={!!errors[`${p}.employment`]} />
                </Field>
                <Field name={`${p}.company`} label={{ ja: "会社名・お店の名前", id: "Nama perusahaan / toko" }}>
                  <TextField value={w.company} onChange={(v) => update(i, { company: v })} placeholder="PT Maju Jaya" maxLength={80} />
                </Field>
                <Field name={`${p}.startYear`} required label={{ ja: "働き始めた年月", id: "Mulai bekerja" }} error={errors[`${p}.startYear`]}>
                  <YearMonth name={`${p}.start`} year={w.startYear} month={w.startMonth} years={years.past} onYear={(v) => update(i, { startYear: v })} onMonth={(v) => update(i, { startMonth: v })} errors={errors} />
                </Field>
                <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-line-strong bg-card px-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input type="checkbox" checked={w.current} onChange={(e) => update(i, { current: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
                  <span className="text-[15px] font-medium">
                    <T ja="今もこの仕事をしている" id="Masih bekerja di sini" />
                  </span>
                </label>
                {!w.current && (
                  <Field name={`${p}.endYear`} required label={{ ja: "やめた年月", id: "Berhenti bekerja" }} error={errors[`${p}.endYear`]}>
                    <YearMonth name={`${p}.end`} year={w.endYear} month={w.endMonth} years={years.past} onYear={(v) => update(i, { endYear: v })} onMonth={(v) => update(i, { endMonth: v })} errors={errors} />
                  </Field>
                )}
              </EntryCard>
            );
          })}
          {form.work.length < 3 && (
            <AddButton onClick={() => set("work", [...form.work, emptyWork()])} label={{ ja: "仕事を追加", id: "Tambah pekerjaan" }} />
          )}
        </>
      )}

      <Field as="fieldset" name="japanExperience" required label={{ ja: "日本に住んだことはありますか？", id: "Pernah tinggal di Jepang?" }} error={errors.japanExperience}>
        <RadioCards name="japanExperience" options={JAPAN_EXPERIENCE} value={form.japanExperience} onChange={(v) => set("japanExperience", v)} />
      </Field>
      {form.japanExperience && form.japanExperience !== "none" && (
        <Field as="fieldset" name="japanDuration" required label={{ ja: "日本にいた期間", id: "Berapa lama di Jepang?" }} error={errors.japanDuration}>
          <RadioCards name="japanDuration" options={DURATIONS} value={form.japanDuration} onChange={(v) => set("japanDuration", v)} columns={2} />
        </Field>
      )}
    </>
  );
}

function StepJapanese({ form, set, errors }: StepProps) {
  const years = useYears();
  return (
    <>
      <Field as="fieldset" name="jlpt" required label={{ ja: "日本語能力試験（JLPT）", id: "JLPT" }} error={errors.jlpt}>
        <RadioCards name="jlpt" options={JLPT_LEVELS} value={form.jlpt} onChange={(v) => set("jlpt", v)} columns={3} />
      </Field>
      {form.jlpt && form.jlpt !== "none" && (
        <Field name="jlptYear" required label={{ ja: "JLPT に合格した年月", id: "Tahun & bulan lulus JLPT" }} error={errors.jlptYear}>
          <YearMonth name="jlpt" year={form.jlptYear} month={form.jlptMonth} years={years.past} onYear={(v) => set("jlptYear", v)} onMonth={(v) => set("jlptMonth", v)} errors={errors} />
        </Field>
      )}

      <Field as="fieldset" name="jft" required label={{ ja: "JFT-Basic（国際交流基金日本語基礎テスト）", id: "JFT-Basic" }} error={errors.jft}>
        <RadioCards name="jft" options={JFT_RESULTS} value={form.jft} onChange={(v) => set("jft", v)} />
      </Field>
      {form.jft === "passed" && (
        <Field name="jftYear" required label={{ ja: "JFT-Basic に合格した年", id: "Tahun lulus JFT-Basic" }} error={errors.jftYear}>
          <div className="sm:max-w-xs">
            <SelectField placeholder={YEAR} options={years.past} value={form.jftYear} onChange={(v) => set("jftYear", v)} invalid={!!errors.jftYear} />
          </div>
        </Field>
      )}

      <Field as="fieldset" name="studyPeriod" required label={{ ja: "日本語を勉強した期間", id: "Lama belajar bahasa Jepang" }} error={errors.studyPeriod}>
        <RadioCards name="studyPeriod" options={STUDY_PERIODS} value={form.studyPeriod} onChange={(v) => set("studyPeriod", v)} columns={2} />
      </Field>

      <Field as="fieldset" name="studyMethods" required label={{ ja: "どうやって勉強しましたか（4つまで）", id: "Bagaimana cara Anda belajar? (maks. 4)" }} error={errors.studyMethods}>
        <CheckCards name="studyMethods" options={STUDY_METHODS} values={form.studyMethods} onChange={(v) => set("studyMethods", v)} max={4} />
      </Field>

      <Field
        as="fieldset"
        name="sswPassed"
        label={{ ja: "合格した特定技能の試験", id: "Ujian keterampilan Tokutei Ginou yang sudah lulus" }}
        hint={{ ja: "合格していなければ何も選ばずに次へ進んでください。", id: "Jika belum lulus, lewati saja." }}
        error={errors.sswPassed}
      >
        <CheckCards name="sswPassed" options={SSW_FIELDS} values={form.sswPassed} onChange={(v) => set("sswPassed", v)} max={4} columns={2} />
      </Field>
      {form.sswPassed.length > 0 && (
        <Field name="sswYear" required label={{ ja: "特定技能の試験に合格した年", id: "Tahun lulus ujian Tokutei Ginou" }} error={errors.sswYear}>
          <div className="sm:max-w-xs">
            <SelectField placeholder={YEAR} options={years.past} value={form.sswYear} onChange={(v) => set("sswYear", v)} invalid={!!errors.sswYear} />
          </div>
        </Field>
      )}

      <Field as="fieldset" name="licenses" label={{ ja: "運転免許など", id: "SIM & lisensi" }} error={errors.licenses}>
        <CheckCards
          name="licenses"
          options={LICENSES}
          values={form.licenses}
          onChange={(v) => {
            set("licenses", v);
            set("licenseYears", Object.fromEntries(v.map((l) => [l, form.licenseYears[l] ?? ""])));
          }}
        />
      </Field>
      {form.licenses.map((lic) => {
        const opt = LICENSES.find((l) => l.value === lic);
        if (!opt) return null;
        return (
          <Field key={lic} name={`licenseYears.${lic}`} required label={{ ja: `${opt.ja} を取った年`, id: `Tahun mendapat ${opt.id}` }} error={errors[`licenseYears.${lic}`]}>
            <div className="sm:max-w-xs">
              <SelectField
                placeholder={YEAR}
                options={years.past}
                value={form.licenseYears[lic] ?? ""}
                onChange={(v) => set("licenseYears", { ...form.licenseYears, [lic]: v })}
                invalid={!!errors[`licenseYears.${lic}`]}
              />
            </div>
          </Field>
        );
      })}

      <Field name="otherQualification" label={{ ja: "その他の資格", id: "Sertifikat lainnya" }} error={errors.otherQualification}>
        <TextField
          value={form.otherQualification}
          onChange={(v) => set("otherQualification", v)}
          placeholder={{ ja: "例：TOEIC 500点", id: "Contoh: Sertifikat barista" }}
          maxLength={80}
        />
      </Field>
    </>
  );
}

function StepWishes({ form, set, errors }: StepProps) {
  return (
    <>
      <Field as="fieldset" name="desiredFields" required label={{ ja: "働きたい分野（3つまで）", id: "Bidang kerja yang diinginkan (maks. 3)" }} error={errors.desiredFields}>
        <CheckCards name="desiredFields" options={DESIRED_FIELDS} values={form.desiredFields} onChange={(v) => set("desiredFields", v)} max={3} columns={2} />
      </Field>
      <Field as="fieldset" name="location" required label={{ ja: "働きたい場所", id: "Lokasi kerja yang diinginkan" }} error={errors.location}>
        <RadioCards name="location" options={LOCATIONS} value={form.location} onChange={(v) => set("location", v)} />
      </Field>
      <Field as="fieldset" name="stayLength" required label={{ ja: "日本で働きたい期間", id: "Ingin bekerja di Jepang berapa lama?" }} error={errors.stayLength}>
        <RadioCards name="stayLength" options={STAY_LENGTHS} value={form.stayLength} onChange={(v) => set("stayLength", v)} />
      </Field>
      <Field as="fieldset" name="startTiming" required label={{ ja: "いつから働けますか", id: "Kapan bisa mulai bekerja?" }} error={errors.startTiming}>
        <RadioCards name="startTiming" options={START_TIMINGS} value={form.startTiming} onChange={(v) => set("startTiming", v)} columns={2} />
      </Field>
      <Field as="fieldset" name="visaPlan" required label={{ ja: "予定している在留資格（ビザ）", id: "Jenis visa yang direncanakan" }} error={errors.visaPlan}>
        <RadioCards name="visaPlan" options={VISA_PLANS} value={form.visaPlan} onChange={(v) => set("visaPlan", v)} />
      </Field>
      <Field as="fieldset" name="workConditions" label={{ ja: "できる働き方（いくつでも）", id: "Kondisi kerja yang bisa Anda terima" }} error={errors.workConditions}>
        <CheckCards name="workConditions" options={WORK_CONDITIONS} values={form.workConditions} onChange={(v) => set("workConditions", v)} columns={2} />
      </Field>
      <Field
        as="fieldset"
        name="considerations"
        label={{ ja: "会社に配慮してほしいこと", id: "Hal yang perlu diperhatikan perusahaan" }}
        hint={{ ja: "履歴書の「本人希望欄」に、ていねいな表現で書きます。", id: "Akan ditulis dengan sopan di kolom permintaan pribadi pada CV." }}
        error={errors.considerations}
      >
        <CheckCards name="considerations" options={CONSIDERATIONS} values={form.considerations} onChange={(v) => set("considerations", v)} />
      </Field>
    </>
  );
}

function StepPersonality({ form, set, errors }: StepProps) {
  return (
    <>
      <Field as="fieldset" name="strengths" required label={{ ja: "あなたの長所（3つまで）", id: "Kelebihan Anda (maks. 3)" }} error={errors.strengths}>
        <CheckCards name="strengths" options={STRENGTHS} values={form.strengths} onChange={(v) => set("strengths", v)} max={3} columns={2} />
      </Field>
      <Field
        as="fieldset"
        name="weakness"
        required
        label={{ ja: "あなたの短所（1つ）", id: "Kekurangan Anda (pilih 1)" }}
        hint={{ ja: "面接でよく聞かれます。改善の努力とセットで回答を作ります。", id: "Sering ditanyakan saat wawancara. Jawaban akan dibuat bersama usaha perbaikannya." }}
        error={errors.weakness}
      >
        <RadioCards name="weakness" options={WEAKNESSES} value={form.weakness} onChange={(v) => set("weakness", v)} columns={2} />
      </Field>
      <Field as="fieldset" name="skills" label={{ ja: "得意なこと（3つまで）", id: "Keahlian Anda (maks. 3)" }} error={errors.skills}>
        <CheckCards name="skills" options={SKILLS} values={form.skills} onChange={(v) => set("skills", v)} max={3} columns={2} />
      </Field>
      <Field as="fieldset" name="hobbies" required label={{ ja: "趣味（4つまで）", id: "Hobi (maks. 4)" }} error={errors.hobbies}>
        <CheckCards name="hobbies" options={HOBBIES} values={form.hobbies} onChange={(v) => set("hobbies", v)} max={4} columns={2} />
      </Field>
      <Field as="fieldset" name="stressRelief" required label={{ ja: "ストレスがたまったときは？", id: "Apa yang Anda lakukan saat stres?" }} error={errors.stressRelief}>
        <RadioCards name="stressRelief" options={STRESS_RELIEF} value={form.stressRelief} onChange={(v) => set("stressRelief", v)} columns={2} />
      </Field>
    </>
  );
}

function StepMotivation({ form, set, errors }: StepProps) {
  return (
    <>
      <Field as="fieldset" name="whyJapan" required label={{ ja: "日本で働きたい理由（3つまで）", id: "Alasan ingin bekerja di Jepang (maks. 3)" }} error={errors.whyJapan}>
        <CheckCards name="whyJapan" options={WHY_JAPAN} values={form.whyJapan} onChange={(v) => set("whyJapan", v)} max={3} />
      </Field>
      <Field as="fieldset" name="whyJob" required label={{ ja: "その分野を選んだ理由（2つまで）", id: "Alasan memilih bidang tersebut (maks. 2)" }} error={errors.whyJob}>
        <CheckCards name="whyJob" options={WHY_JOB} values={form.whyJob} onChange={(v) => set("whyJob", v)} max={2} />
      </Field>
      <Field as="fieldset" name="futureGoal" required label={{ ja: "将来の目標", id: "Tujuan di masa depan" }} error={errors.futureGoal}>
        <RadioCards name="futureGoal" options={FUTURE_GOALS} value={form.futureGoal} onChange={(v) => set("futureGoal", v)} />
      </Field>
      <Field as="fieldset" name="familyOpinion" required label={{ ja: "家族は日本で働くことに賛成していますか", id: "Apakah keluarga setuju Anda bekerja di Jepang?" }} error={errors.familyOpinion}>
        <RadioCards name="familyOpinion" options={FAMILY_OPINIONS} value={form.familyOpinion} onChange={(v) => set("familyOpinion", v)} />
      </Field>
      <Field
        name="freeText"
        label={{ ja: "ほかに伝えたいこと", id: "Hal lain yang ingin disampaikan" }}
        hint={{ ja: "インドネシア語で書いてもかまいません。", id: "Boleh ditulis dalam bahasa Indonesia." }}
        error={errors.freeText}
      >
        <TextArea
          value={form.freeText}
          onChange={(v) => set("freeText", v)}
          maxLength={500}
          placeholder={{
            ja: "例：学校でクラス委員をしていました。チームで働くことが好きです。",
            id: "Contoh: Saya pernah menjadi ketua kelas dan suka bekerja dalam tim.",
          }}
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------- confirm

function lab(list: readonly Option[], v: string, lang: Lang): string {
  return list.find((x) => x.value === v)?.[lang] ?? "";
}
function labs(list: readonly Option[], vs: string[], lang: Lang): string {
  return vs
    .map((v) => lab(list, v, lang))
    .filter(Boolean)
    .join(lang === "ja" ? "、" : ", ");
}

type Row = [Bi, string];

function Summary({ title, step, goTo, rows }: { title: Bi; step: number; goTo: (n: number) => void; rows: Row[] }) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-[16px] font-bold">
          <T {...title} />
        </h2>
        <button type="button" onClick={() => goTo(step)} className="min-h-[36px] shrink-0 rounded-lg px-3 text-[14px] font-semibold text-accent hover:bg-accent-soft">
          <T ja="修正" id="Ubah" />
        </button>
      </div>
      <dl className="divide-y divide-line px-4 sm:px-5">
        {rows
          .filter(([, v]) => v.trim())
          .map(([k, v]) => (
            <div key={k.ja} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5 text-[15px] sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">
                <T {...k} />
              </dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

function StepConfirm({ form, set, errors, goTo }: StepProps & { goTo: (n: number) => void }) {
  const lang = useLang();
  const l = (list: readonly Option[], v: string) => lab(list, v, lang);
  const ls = (list: readonly Option[], vs: string[]) => labs(list, vs, lang);
  const residence =
    form.residence === "indonesia"
      ? `${l(PROVINCES, form.residenceProvince)} ${form.city}`
      : form.residence === "japan"
        ? `${l(PREFECTURES, form.residencePrefecture)} ${form.city}`
        : `${form.residenceCountry} ${form.city}`;
  const now = lang === "ja" ? "現在" : "sekarang";
  return (
    <>
      <Note>
        <T
          ja="内容を確認して、問題なければ送信してください。送信後は変更できません。"
          id="Periksa kembali data Anda. Setelah dikirim, data tidak bisa diubah."
        />
      </Note>
      <Summary
        title={STEPS[0]}
        step={0}
        goTo={goTo}
        rows={[
          [{ ja: "氏名", id: "Nama" }, form.fullName],
          [{ ja: "性別", id: "Jenis kelamin" }, l(GENDERS, form.gender)],
          [{ ja: "生年月日", id: "Tanggal lahir" }, form.birthYear ? `${form.birthYear}/${form.birthMonth}/${form.birthDay}` : ""],
          [{ ja: "出身", id: "Asal" }, l(PROVINCES, form.origin)],
          [{ ja: "住所", id: "Tempat tinggal" }, `${l(RESIDENCES, form.residence)} ${residence}`],
        ]}
      />
      <Summary
        title={STEPS[1]}
        step={1}
        goTo={goTo}
        rows={[
          [{ ja: l(CONTACT_METHODS, form.contactMethod) || "連絡先", id: l(CONTACT_METHODS, form.contactMethod) || "Kontak" }, form.contactValue],
          [{ ja: "メール", id: "Email" }, form.contactMethod === "email" ? "" : form.email],
        ]}
      />
      <Summary
        title={STEPS[2]}
        step={2}
        goTo={goTo}
        rows={form.education.map((e, i): Row => [
          { ja: `学校 ${i + 1}`, id: `Sekolah ${i + 1}` },
          [l(EDUCATION_LEVELS, e.level), e.schoolName, l(MAJORS, e.major), `${e.startYear}–${e.endYear}`, l(EDUCATION_STATUS, e.status)]
            .filter(Boolean)
            .join(" · "),
        ])}
      />
      <Summary
        title={STEPS[3]}
        step={3}
        goTo={goTo}
        rows={[
          ...(form.hasWork === "yes"
            ? form.work.map((w, i): Row => [
                { ja: `仕事 ${i + 1}`, id: `Pekerjaan ${i + 1}` },
                [l(INDUSTRIES, w.industry), l(JOB_TYPES, w.jobType), `${w.startYear}–${w.current ? now : w.endYear}`].filter(Boolean).join(" · "),
              ])
            : [[{ ja: "職歴", id: "Pengalaman kerja" }, lang === "ja" ? "なし" : "Tidak ada"] as Row]),
          [{ ja: "日本での経験", id: "Pengalaman di Jepang" }, `${l(JAPAN_EXPERIENCE, form.japanExperience)} ${l(DURATIONS, form.japanDuration)}`],
        ]}
      />
      <Summary
        title={STEPS[4]}
        step={4}
        goTo={goTo}
        rows={[
          [{ ja: "JLPT", id: "JLPT" }, form.jlpt === "none" ? l(JLPT_LEVELS, "none") : `${l(JLPT_LEVELS, form.jlpt)} (${form.jlptYear})`],
          [{ ja: "JFT-Basic", id: "JFT-Basic" }, l(JFT_RESULTS, form.jft)],
          [{ ja: "勉強期間", id: "Lama belajar" }, l(STUDY_PERIODS, form.studyPeriod)],
          [{ ja: "特定技能", id: "Tokutei Ginou" }, ls(SSW_FIELDS, form.sswPassed)],
          [{ ja: "運転免許など", id: "SIM & lisensi" }, ls(LICENSES, form.licenses)],
          [{ ja: "その他", id: "Lainnya" }, form.otherQualification],
        ]}
      />
      <Summary
        title={STEPS[5]}
        step={5}
        goTo={goTo}
        rows={[
          [{ ja: "分野", id: "Bidang" }, ls(DESIRED_FIELDS, form.desiredFields)],
          [{ ja: "場所", id: "Lokasi" }, l(LOCATIONS, form.location)],
          [{ ja: "期間", id: "Lama" }, l(STAY_LENGTHS, form.stayLength)],
          [{ ja: "時期", id: "Mulai" }, l(START_TIMINGS, form.startTiming)],
          [{ ja: "在留資格", id: "Visa" }, l(VISA_PLANS, form.visaPlan)],
          [{ ja: "配慮", id: "Catatan" }, ls(CONSIDERATIONS, form.considerations)],
        ]}
      />
      <Summary
        title={STEPS[6]}
        step={6}
        goTo={goTo}
        rows={[
          [{ ja: "長所", id: "Kelebihan" }, ls(STRENGTHS, form.strengths)],
          [{ ja: "短所", id: "Kekurangan" }, l(WEAKNESSES, form.weakness)],
          [{ ja: "趣味", id: "Hobi" }, ls(HOBBIES, form.hobbies)],
        ]}
      />
      <Summary
        title={STEPS[7]}
        step={7}
        goTo={goTo}
        rows={[
          [{ ja: "理由", id: "Alasan" }, ls(WHY_JAPAN, form.whyJapan)],
          [{ ja: "目標", id: "Tujuan" }, l(FUTURE_GOALS, form.futureGoal)],
          [{ ja: "自由記入", id: "Catatan lain" }, form.freeText],
        ]}
      />

      <div id="f-consent" className="scroll-mt-36">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line-strong bg-card p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft sm:p-5">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-[15px] leading-relaxed">
            <T
              ja="入力した内容を、履歴書の作成と就職支援のご連絡のために利用することに同意します。"
              id="Saya setuju data ini digunakan untuk membuat CV dan untuk menghubungi saya terkait dukungan kerja."
            />
          </span>
        </label>
        {errors.consent && (
          <p role="alert" className="mt-2 text-[14px] font-medium text-danger">
            {pickBi(errors.consent, lang)}
          </p>
        )}
      </div>
    </>
  );
}
