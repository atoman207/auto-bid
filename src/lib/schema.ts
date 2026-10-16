import { z } from "zod";
import {
  CONSIDERATIONS, CONTACT_METHODS, DESIRED_FIELDS, DURATIONS, EDUCATION_LEVELS, EDUCATION_STATUS,
  EMPLOYMENT_TYPES, FAMILY_OPINIONS, FUTURE_GOALS, GENDERS, HOBBIES, INDUSTRIES, JAPAN_EXPERIENCE,
  JFT_RESULTS, JLPT_LEVELS, JOB_TYPES, LICENSES, LOCATIONS, MAJORS, PREFECTURES, PROVINCES, RESIDENCES,
  SKILLS, SSW_FIELDS, START_TIMINGS, STAY_LENGTHS, STRENGTHS, STRESS_RELIEF, STUDY_METHODS, STUDY_PERIODS,
  VISA_PLANS, WEAKNESSES, WHY_JAPAN, WHY_JOB, WORK_CONDITIONS, values, type Option,
} from "./options";

export const MSG = {
  select: "選択してください / Silakan pilih",
  required: "入力してください / Wajib diisi",
  pickRange: (min: number, max: number) =>
    min === max
      ? `${min}つ選んでください / Pilih ${min}`
      : `${min}〜${max}つ選んでください / Pilih ${min}–${max}`,
  pickMax: (max: number) => `${max}つまで選べます / Maksimal ${max} pilihan`,
};

const CURRENT_YEAR = new Date().getFullYear();

const oneOf = (list: readonly Option[]) => z.enum(values(list), { error: MSG.select });

const manyOf = (list: readonly Option[], min: number, max: number) =>
  z
    .array(z.enum(values(list)))
    .min(min, { error: min === 1 && max > 1 ? `1つ以上選んでください / Pilih minimal 1` : MSG.pickRange(min, max) })
    .max(max, { error: MSG.pickMax(max) })
    .refine((a) => new Set(a).size === a.length, { error: MSG.select });

const yearStr = (min: number, max: number) =>
  z.string().regex(/^\d{4}$/, { error: MSG.select }).refine((v) => Number(v) >= min && Number(v) <= max, {
    error: MSG.select,
  });

const monthStr = z.string().regex(/^(?:[1-9]|1[0-2])$/, { error: MSG.select });
const optionalMonth = z.union([monthStr, z.literal("")]);

const text = (max: number) => z.string().trim().max(max, { error: `${max}文字以内 / Maksimal ${max} karakter` });

// --------------------------------------------------------------- step schemas

const basic = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: MSG.required })
      .max(60, { error: "60文字以内 / Maksimal 60 karakter" })
      .regex(/^[\p{L}\p{M}\s.'’-]+$/u, { error: "文字だけで入力してください / Hanya huruf" }),
    gender: oneOf(GENDERS),
    birthYear: yearStr(1950, CURRENT_YEAR - 14),
    birthMonth: monthStr,
    birthDay: z.string().regex(/^(?:[1-9]|[12]\d|3[01])$/, { error: MSG.select }),
    origin: oneOf(PROVINCES),
    residence: oneOf(RESIDENCES),
    residenceProvince: z.string(),
    residencePrefecture: z.string(),
    residenceCountry: text(40),
    city: text(60),
  })
  .superRefine((v, ctx) => {
    const d = new Date(Number(v.birthYear), Number(v.birthMonth) - 1, Number(v.birthDay));
    if (v.birthYear && v.birthMonth && v.birthDay && d.getMonth() !== Number(v.birthMonth) - 1) {
      ctx.addIssue({ code: "custom", path: ["birthDay"], message: "日付が正しくありません / Tanggal tidak valid" });
    }
    if (v.residence === "indonesia" && !values(PROVINCES).includes(v.residenceProvince)) {
      ctx.addIssue({ code: "custom", path: ["residenceProvince"], message: MSG.select });
    }
    if (v.residence === "japan" && !values(PREFECTURES).includes(v.residencePrefecture)) {
      ctx.addIssue({ code: "custom", path: ["residencePrefecture"], message: MSG.select });
    }
    if (v.residence === "other" && v.residenceCountry.length < 2) {
      ctx.addIssue({ code: "custom", path: ["residenceCountry"], message: MSG.required });
    }
  });

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8") && digits.length <= 13) digits = `62${digits}`;
  return digits;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const contact = z
  .object({
    contactMethod: oneOf(CONTACT_METHODS),
    contactValue: z.string().trim().min(1, { error: MSG.required }).max(80),
    email: z.string().trim().max(120),
  })
  .superRefine((v, ctx) => {
    if (v.contactMethod === "whatsapp") {
      const digits = v.contactValue.replace(/[^\d]/g, "");
      if (!/^\+?[\d\s()-]+$/.test(v.contactValue) || digits.length < 9 || digits.length > 15) {
        ctx.addIssue({
          code: "custom",
          path: ["contactValue"],
          message: "電話番号を正しく入力してください（例：+62 812 3456 7890） / Nomor WhatsApp tidak valid (contoh: +62 812 3456 7890)",
        });
      }
    } else if (v.contactMethod === "line") {
      if (!/^[A-Za-z0-9._\-@+]{3,40}$/.test(v.contactValue)) {
        ctx.addIssue({
          code: "custom",
          path: ["contactValue"],
          message: "LINE ID を正しく入力してください（英数字と . _ -） / LINE ID tidak valid (huruf, angka, . _ -)",
        });
      }
    } else if (v.contactMethod === "email" && !EMAIL_RE.test(v.contactValue)) {
      ctx.addIssue({ code: "custom", path: ["contactValue"], message: "メールアドレスが正しくありません / Email tidak valid" });
    }
    if (v.email && !EMAIL_RE.test(v.email)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "メールアドレスが正しくありません / Email tidak valid" });
    }
  });

const educationEntry = z
  .object({
    level: oneOf(EDUCATION_LEVELS),
    schoolName: text(80),
    major: oneOf(MAJORS),
    startYear: yearStr(1960, CURRENT_YEAR + 1),
    startMonth: optionalMonth,
    endYear: z.union([yearStr(1960, CURRENT_YEAR + 6), z.literal("")]),
    endMonth: optionalMonth,
    status: oneOf(EDUCATION_STATUS),
  })
  .superRefine((v, ctx) => {
    if (v.status !== "enrolled" && !v.endYear) {
      ctx.addIssue({ code: "custom", path: ["endYear"], message: MSG.select });
    }
    if (v.endYear && Number(v.endYear) < Number(v.startYear)) {
      ctx.addIssue({ code: "custom", path: ["endYear"], message: "入学より後の年を選んでください / Harus setelah tahun masuk" });
    }
  });

const education = z.object({
  education: z.array(educationEntry).min(1, { error: MSG.required }).max(3),
});

const workEntry = z
  .object({
    company: text(80),
    industry: oneOf(INDUSTRIES),
    jobType: oneOf(JOB_TYPES),
    employment: oneOf(EMPLOYMENT_TYPES),
    startYear: yearStr(1960, CURRENT_YEAR),
    startMonth: optionalMonth,
    current: z.boolean(),
    endYear: z.union([yearStr(1960, CURRENT_YEAR), z.literal("")]),
    endMonth: optionalMonth,
  })
  .superRefine((v, ctx) => {
    if (!v.current && !v.endYear) ctx.addIssue({ code: "custom", path: ["endYear"], message: MSG.select });
    if (!v.current && v.endYear && Number(v.endYear) < Number(v.startYear)) {
      ctx.addIssue({ code: "custom", path: ["endYear"], message: "開始より後の年を選んでください / Harus setelah tahun mulai" });
    }
  });

const work = z
  .object({
    hasWork: z.enum(["yes", "no"], { error: MSG.select }),
    work: z.array(workEntry).max(3),
    japanExperience: oneOf(JAPAN_EXPERIENCE),
    japanDuration: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.hasWork === "yes" && v.work.length === 0) {
      ctx.addIssue({ code: "custom", path: ["work"], message: "仕事を1つ以上追加してください / Tambahkan minimal 1 pekerjaan" });
    }
    if (v.japanExperience !== "none" && !values(DURATIONS).includes(v.japanDuration)) {
      ctx.addIssue({ code: "custom", path: ["japanDuration"], message: MSG.select });
    }
  });

const japanese = z
  .object({
    jlpt: oneOf(JLPT_LEVELS),
    jlptYear: z.string(),
    jlptMonth: z.string(),
    jft: oneOf(JFT_RESULTS),
    jftYear: z.string(),
    studyPeriod: oneOf(STUDY_PERIODS),
    studyMethods: manyOf(STUDY_METHODS, 1, 4),
    sswPassed: z.array(z.enum(values(SSW_FIELDS))).max(4, { error: MSG.pickMax(4) }),
    sswYear: z.string(),
    licenses: z.array(z.enum(values(LICENSES))).max(4),
    licenseYears: z.record(z.string(), z.string()),
    otherQualification: text(80),
  })
  .superRefine((v, ctx) => {
    const isYear = (y: string) => /^\d{4}$/.test(y) && Number(y) >= 1970 && Number(y) <= CURRENT_YEAR;
    if (v.jlpt !== "none" && !isYear(v.jlptYear)) ctx.addIssue({ code: "custom", path: ["jlptYear"], message: MSG.select });
    if (v.jlpt !== "none" && v.jlptMonth && !/^(?:[1-9]|1[0-2])$/.test(v.jlptMonth)) {
      ctx.addIssue({ code: "custom", path: ["jlptMonth"], message: MSG.select });
    }
    if (v.jft === "passed" && !isYear(v.jftYear)) ctx.addIssue({ code: "custom", path: ["jftYear"], message: MSG.select });
    if (v.sswPassed.length > 0 && !isYear(v.sswYear)) ctx.addIssue({ code: "custom", path: ["sswYear"], message: MSG.select });
    for (const lic of v.licenses) {
      if (!isYear(v.licenseYears[lic] ?? "")) {
        ctx.addIssue({ code: "custom", path: ["licenseYears", lic], message: MSG.select });
      }
    }
  });

const wishes = z.object({
  desiredFields: manyOf(DESIRED_FIELDS, 1, 3),
  location: oneOf(LOCATIONS),
  stayLength: oneOf(STAY_LENGTHS),
  startTiming: oneOf(START_TIMINGS),
  visaPlan: oneOf(VISA_PLANS),
  workConditions: z.array(z.enum(values(WORK_CONDITIONS))).max(WORK_CONDITIONS.length),
  considerations: z.array(z.enum(values(CONSIDERATIONS))).max(CONSIDERATIONS.length),
});

const personality = z.object({
  strengths: manyOf(STRENGTHS, 1, 3),
  weakness: oneOf(WEAKNESSES),
  skills: z.array(z.enum(values(SKILLS))).max(3, { error: MSG.pickMax(3) }),
  hobbies: manyOf(HOBBIES, 1, 4),
  stressRelief: oneOf(STRESS_RELIEF),
});

const motivation = z.object({
  whyJapan: manyOf(WHY_JAPAN, 1, 3),
  whyJob: manyOf(WHY_JOB, 1, 2),
  futureGoal: oneOf(FUTURE_GOALS),
  familyOpinion: oneOf(FAMILY_OPINIONS),
  freeText: text(500),
});

const confirm = z.object({
  consent: z.literal(true, { error: "同意が必要です / Persetujuan diperlukan" }),
});

export const STEP_SCHEMAS = [basic, contact, education, work, japanese, wishes, personality, motivation, confirm] as const;

// --------------------------------------------------------------- types

export type EducationEntry = z.infer<typeof educationEntry>;
export type WorkEntry = z.infer<typeof workEntry>;

export type ProfileInput = z.infer<typeof basic> &
  z.infer<typeof contact> &
  z.infer<typeof education> &
  z.infer<typeof work> &
  z.infer<typeof japanese> &
  z.infer<typeof wishes> &
  z.infer<typeof personality> &
  z.infer<typeof motivation> &
  z.infer<typeof confirm>;

type Loose<T> = T extends string
  ? string
  : T extends boolean
    ? boolean
    : T extends readonly (infer U)[]
      ? Loose<U>[]
      : T extends object
        ? { [K in keyof T]: Loose<T[K]> }
        : T;

/** Shape of the form state on the client (plain strings/arrays until validated). */
export type FormState = Loose<ProfileInput>;
export type EducationForm = Loose<EducationEntry>;
export type WorkForm = Loose<WorkEntry>;

export const emptyEducation = (): EducationForm => ({
  level: "", schoolName: "", major: "", startYear: "", startMonth: "", endYear: "", endMonth: "", status: "",
});

export const emptyWork = (): WorkForm => ({
  company: "", industry: "", jobType: "", employment: "", startYear: "", startMonth: "",
  current: false, endYear: "", endMonth: "",
});

export function emptyForm(): FormState {
  return {
    fullName: "", gender: "", birthYear: "", birthMonth: "", birthDay: "",
    origin: "", residence: "", residenceProvince: "", residencePrefecture: "", residenceCountry: "", city: "",
    contactMethod: "", contactValue: "", email: "",
    education: [emptyEducation()],
    hasWork: "", work: [], japanExperience: "", japanDuration: "",
    jlpt: "", jlptYear: "", jlptMonth: "", jft: "", jftYear: "",
    studyPeriod: "", studyMethods: [], sswPassed: [], sswYear: "",
    licenses: [], licenseYears: {}, otherQualification: "",
    desiredFields: [], location: "", stayLength: "", startTiming: "", visaPlan: "", workConditions: [], considerations: [],
    strengths: [], weakness: "", skills: [], hobbies: [], stressRelief: "",
    whyJapan: [], whyJob: [], futureGoal: "", familyOpinion: "", freeText: "",
    consent: false,
  };
}

// --------------------------------------------------------------- validation

export type FieldErrors = Record<string, string>;

function collect(error: z.ZodError, into: FieldErrors) {
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    // a missing or malformed value (only possible with a hand-made request)
    if (!into[key]) into[key] = issue.code === "invalid_type" ? MSG.required : issue.message;
  }
}

export function validateStep(step: number, data: unknown): FieldErrors {
  const errors: FieldErrors = {};
  const result = STEP_SCHEMAS[step].safeParse(data);
  if (!result.success) collect(result.error, errors);
  return errors;
}

export function validateProfile(data: unknown):
  | { ok: true; data: ProfileInput }
  | { ok: false; errors: FieldErrors; step: number } {
  let merged: Record<string, unknown> = {};
  for (let i = 0; i < STEP_SCHEMAS.length; i++) {
    const result = STEP_SCHEMAS[i].safeParse(data);
    if (!result.success) {
      const errors: FieldErrors = {};
      collect(result.error, errors);
      return { ok: false, errors, step: i };
    }
    merged = { ...merged, ...(result.data as Record<string, unknown>) };
  }
  const profile = merged as ProfileInput;
  if (profile.hasWork === "no") profile.work = [];
  if (profile.japanExperience === "none") profile.japanDuration = "";
  profile.licenseYears = Object.fromEntries(profile.licenses.map((l) => [l, profile.licenseYears[l] ?? ""]));
  profile.fullName = profile.fullName.replace(/\s+/g, " ").trim();
  return { ok: true, data: profile };
}

/** Key used to enforce one submission per person. */
export function contactKey(p: Pick<ProfileInput, "contactMethod" | "contactValue">): string {
  const v = p.contactValue.trim();
  if (p.contactMethod === "whatsapp") return `whatsapp:${normalizePhone(v)}`;
  return `${p.contactMethod}:${v.toLowerCase()}`;
}
