"use client";

import { createContext, useContext, type ReactNode } from "react";
import { pick, pickBi, type Bi } from "@/lib/i18n";
import type { Option } from "@/lib/options";
import { useLang } from "./lang";
import { T } from "./t";

export type { Bi };

/** Text in the selected language (block-level spans for headings and labels). */
export function BiText({ ja, id, className = "" }: Bi & { className?: string }) {
  return (
    <span className={className}>
      <T ja={ja} id={id} />
    </span>
  );
}

/** The label of the surrounding Field, used as the accessible name of its input. */
const FieldLabel = createContext<Bi | null>(null);

function useAccessibleLabel(label?: Bi | string): string {
  const lang = useLang();
  const fromField = useContext(FieldLabel);
  const source = label ?? fromField;
  return source ? pick(source, lang) : "";
}

export function Field({
  name,
  label,
  required = false,
  hint,
  error,
  children,
  as = "div",
}: {
  name: string;
  label: Bi;
  required?: boolean;
  hint?: Bi;
  error?: string;
  children: ReactNode;
  as?: "div" | "fieldset";
}) {
  const lang = useLang();
  const Wrapper = as;
  const LabelTag = as === "fieldset" ? "legend" : "div";
  return (
    <FieldLabel.Provider value={label}>
      <Wrapper id={`f-${name}`} className="scroll-mt-36 border-0 p-0" aria-invalid={error ? true : undefined}>
        <LabelTag className="mb-2 flex w-full items-start justify-between gap-3">
          <span className="text-[16px] font-semibold leading-snug text-ink">
            <T ja={label.ja} id={label.id} />
          </span>
          <span
            className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
              required ? "bg-accent-soft text-accent" : "bg-line/60 text-muted"
            }`}
          >
            {required ? <T ja="必須" id="Wajib" /> : <T ja="任意" id="Opsional" />}
          </span>
        </LabelTag>
        {hint && (
          <p className="-mt-1 mb-2.5 text-[14px] leading-snug text-muted">
            <T ja={hint.ja} id={hint.id} />
          </p>
        )}
        {children}
        {error && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-[14px] font-medium text-danger">
            <span aria-hidden className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger text-[10px] text-white">
              !
            </span>
            {pickBi(error, lang)}
          </p>
        )}
      </Wrapper>
    </FieldLabel.Provider>
  );
}

const cardBase =
  "relative flex min-h-[54px] cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors active:scale-[0.99] " +
  "border-line-strong hover:border-ink/40 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40";

function Indicator({ type }: { type: "radio" | "checkbox" }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-line-strong bg-white transition-colors group-has-[:checked]:border-accent group-has-[:checked]:bg-accent ${
        type === "radio" ? "rounded-full" : "rounded-md"
      }`}
    >
      {type === "radio" ? (
        <span className="h-2 w-2 rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100" />
      ) : (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white opacity-0 group-has-[:checked]:opacity-100">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function OptionText({ option, center = false }: { option: Option; center?: boolean }) {
  return (
    <span className={`min-w-0 text-[15px] font-medium leading-snug text-ink ${center ? "text-center" : "flex-1"}`}>
      <T ja={option.ja} id={option.id} />
    </span>
  );
}

const gridCols = { 1: "grid-cols-1 sm:grid-cols-2", 2: "grid-cols-2", 3: "grid-cols-3" } as const;

export function RadioCards({
  name,
  options,
  value,
  onChange,
  columns = 1,
}: {
  name: string;
  options: readonly Option[];
  value: string;
  onChange: (v: string) => void;
  columns?: 1 | 2 | 3;
}) {
  // Three narrow cards on a phone: stack the indicator above the text.
  const compact = columns === 3 ? "flex-col justify-center gap-1.5 px-1.5 py-3 sm:flex-row sm:justify-start sm:gap-3 sm:px-4" : "";
  return (
    <div role="radiogroup" className={`grid gap-2 ${gridCols[columns]}`}>
      {options.map((opt) => (
        <label key={opt.value} className={`group ${cardBase} ${compact}`}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <Indicator type="radio" />
          <OptionText option={opt} center={columns === 3} />
        </label>
      ))}
    </div>
  );
}

export function CheckCards({
  name,
  options,
  values,
  onChange,
  max,
  columns = 1,
}: {
  name: string;
  options: readonly Option[];
  values: string[];
  onChange: (v: string[]) => void;
  max?: number;
  columns?: 1 | 2;
}) {
  const full = max !== undefined && values.length >= max;
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else if (!full) onChange([...values, v]);
  };
  return (
    <div>
      {max !== undefined && (
        <p className="mb-2 text-[13px] text-muted" aria-live="polite">
          <T ja={`${values.length} / ${max} 選択中`} id={`${values.length} dari ${max} dipilih`} />
        </p>
      )}
      <div className={`grid gap-2 ${gridCols[columns]}`}>
        {options.map((opt) => {
          const checked = values.includes(opt.value);
          const disabled = !checked && full;
          return (
            <label key={opt.value} className={`group ${cardBase} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}>
              <input
                type="checkbox"
                name={name}
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(opt.value)}
                className="sr-only"
              />
              <Indicator type="checkbox" />
              <OptionText option={opt} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

const inputBase =
  "block w-full rounded-xl border bg-card px-3.5 py-3 text-ink shadow-[inset_0_1px_0_rgba(0,0,0,0.02)] outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/25";

export function SelectField({
  value,
  onChange,
  options,
  placeholder = { ja: "選択してください", id: "Pilih" },
  invalid,
  label,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly Option[];
  placeholder?: Bi;
  invalid?: boolean;
  label?: Bi;
  /** Tighter padding for narrow selects (e.g. three in a row). */
  compact?: boolean;
}) {
  const lang = useLang();
  const name = useAccessibleLabel(label);
  return (
    <div className="relative">
      <select
        aria-label={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} appearance-none ${compact ? "!pl-3 pr-7" : "pr-10"} ${invalid ? "border-danger" : "border-line-strong"} ${value ? "" : "text-faint"}`}
      >
        <option value="">{placeholder[lang]}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o[lang]}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted ${compact ? "right-2.5" : "right-3.5"}`}
      >
        <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  invalid,
  label,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
  autoCapitalize,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: Bi | string;
  invalid?: boolean;
  label?: Bi;
  type?: "text" | "email" | "tel";
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
  maxLength?: number;
  autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
}) {
  const lang = useLang();
  const name = useAccessibleLabel(label);
  return (
    <input
      aria-label={name}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      value={value}
      placeholder={placeholder === undefined ? undefined : typeof placeholder === "string" ? placeholder : placeholder[lang]}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} ${invalid ? "border-danger" : "border-line-strong"}`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: Bi;
  maxLength: number;
}) {
  const lang = useLang();
  const name = useAccessibleLabel();
  return (
    <div>
      <textarea
        aria-label={name}
        value={value}
        maxLength={maxLength}
        rows={4}
        placeholder={placeholder?.[lang]}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} min-h-28 resize-y border-line-strong`}
      />
      <p className="mt-1 text-right text-[12px] text-faint">
        {value.length} / {maxLength}
      </p>
    </div>
  );
}
