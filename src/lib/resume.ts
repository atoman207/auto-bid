import "server-only";
import {
  CONSIDERATIONS, CONTACT_METHODS, DESIRED_FIELDS, DURATIONS, EDUCATION_LEVELS, EDUCATION_STATUS, EMPLOYMENT_TYPES,
  FAMILY_OPINIONS, FUTURE_GOALS, GENDERS, HOBBIES, INDUSTRIES, JAPAN_EXPERIENCE, JLPT_LEVELS, JOB_TYPES, LICENSES,
  LOCATIONS, MAJORS, PREFECTURES, PROVINCES, SKILLS, SSW_FIELDS, START_TIMINGS, STAY_LENGTHS, STRENGTHS,
  STRESS_RELIEF, STUDY_METHODS, STUDY_PERIODS, VISA_PLANS, WEAKNESSES, WHY_JAPAN, WHY_JOB, WORK_CONDITIONS,
  labelJa, labelsJa,
} from "./options";
import type { ProfileInput } from "./schema";
import { ageOn, formatJst, jstParts } from "./text";

export type HistoryRow = { year: string; month: string; text: string; align?: "LEFT" | "CENTER" | "RIGHT" };

export const HISTORY_ROWS = 16;
export const LICENSE_ROWS = 6;

const join = (list: string[], sep = "、") => list.filter(Boolean).join(sep);

export function birthLine(p: ProfileInput, today: Date): string {
  const age = ageOn({ year: Number(p.birthYear), month: Number(p.birthMonth), day: Number(p.birthDay) }, today);
  return `${p.birthYear}年 ${p.birthMonth}月 ${p.birthDay}日生（満 ${age} 歳）`;
}

export function ageOf(p: ProfileInput, today: Date): number {
  return ageOn({ year: Number(p.birthYear), month: Number(p.birthMonth), day: Number(p.birthDay) }, today);
}

export function genderJa(p: ProfileInput): string {
  return p.gender === "none" ? "" : labelJa(GENDERS, p.gender);
}

export function nationalityLine(p: ProfileInput): string {
  return `インドネシア（${labelJa(PROVINCES, p.origin)}出身）`;
}

/** Address as the user gave it; the AI converts it into proper Japanese. */
export function residenceDescription(p: ProfileInput): string {
  if (p.residence === "indonesia") return `インドネシア ${labelJa(PROVINCES, p.residenceProvince)} ${p.city}`.trim();
  if (p.residence === "japan") return `日本 ${labelJa(PREFECTURES, p.residencePrefecture)} ${p.city}`.trim();
  return `${p.residenceCountry} ${p.city}`.trim();
}

export function phoneLine(p: ProfileInput): string {
  return p.contactMethod === "whatsapp" ? p.contactValue : "";
}

export function emailLine(p: ProfileInput): string {
  if (p.contactMethod === "email") return p.contactValue;
  return p.email;
}

export function contactLine(p: ProfileInput): string {
  const method = labelJa(CONTACT_METHODS, p.contactMethod);
  const main = p.contactMethod === "line" ? `LINE ID：${p.contactValue}` : `${method}：${p.contactValue}`;
  return main;
}

// ------------------------------------------------------------------ 学歴・職歴

function majorPhrase(e: ProfileInput["education"][number]): string {
  if (!e.major || e.major === "none") return "";
  if (e.major === "ipa") return "理系コース";
  if (e.major === "ips") return "文系コース";
  const label = labelJa(MAJORS, e.major);
  if (e.level === "lpk") return e.major === "japanese" ? "日本語コース" : `${label}コース`;
  if (e.level === "s1" || e.level === "s2" || e.level === "diploma") return `${label}専攻`;
  return `${label}科`;
}

function schoolLabel(e: ProfileInput["education"][number]): string {
  const level = e.level === "lpk" ? "職業訓練機関" : labelJa(EDUCATION_LEVELS, e.level).replace(/（.*?）/, "");
  const major = majorPhrase(e);
  if (e.schoolName) return `${e.schoolName}（${level}）${major ? ` ${major}` : ""}`;
  return `${labelJa(EDUCATION_LEVELS, e.level)}${major ? ` ${major}` : ""}`;
}

/** How a workplace of each industry is named on a résumé when no company name was given. */
const WORKPLACE: Record<string, string> = {
  manufacturing: "製造会社（工場）",
  food_manufacturing: "食品製造会社",
  construction: "建設会社",
  care: "介護施設",
  medical: "医療機関",
  restaurant: "飲食店",
  hotel: "ホテル",
  retail: "小売店",
  agriculture: "農園・農業法人",
  fishery: "水産会社",
  logistics: "物流会社",
  automotive: "自動車整備工場",
  cleaning: "ビルメンテナンス会社",
  office: "一般企業",
  it: "IT企業",
  education: "教育機関",
  shipbuilding: "造船会社",
  other: "民間企業",
};

function workStartText(w: ProfileInput["work"][number]): string {
  const industry = labelJa(INDUSTRIES, w.industry);
  const place = w.company ? `${w.company}（${industry}）` : (WORKPLACE[w.industry] ?? industry);
  switch (w.employment) {
    case "contract":
      return `${place}　入社（契約社員）`;
    case "parttime":
      return `${place}　アルバイトとして勤務`;
    case "intern_jp":
      return `${place}（日本）　技能実習生として入社`;
    case "ssw_jp":
      return `${place}（日本）　特定技能外国人として入社`;
    case "family":
      return `家業（${industry}）に従事`;
    case "internship":
      return `${place}　インターンシップ（実習）`;
    default:
      return `${place}　入社（正社員）`;
  }
}

function workEndText(w: ProfileInput["work"][number]): string {
  if (w.employment === "intern_jp") return "技能実習修了により退職";
  if (w.employment === "internship") return "実習修了";
  if (w.employment === "family") return "家業の手伝いを終了";
  return "一身上の都合により退職";
}

function educationRows(p: ProfileInput): HistoryRow[] {
  const sorted = [...p.education].sort((a, b) => Number(a.startYear) - Number(b.startYear));
  const rows: HistoryRow[] = [];
  for (const e of sorted) {
    const name = schoolLabel(e);
    const isTraining = e.level === "lpk";
    rows.push({ year: e.startYear, month: e.startMonth, text: `${name}　${isTraining ? "入校" : "入学"}` });
    if (e.status === "enrolled") {
      rows.push({ year: "", month: "", text: `${name}　在学中` });
    } else {
      const status = labelJa(EDUCATION_STATUS, e.status);
      rows.push({ year: e.endYear, month: e.endMonth, text: `${name}　${status}` });
    }
  }
  return rows;
}

function workRows(p: ProfileInput): HistoryRow[] {
  if (p.hasWork !== "yes" || p.work.length === 0) return [{ year: "", month: "", text: "なし" }];
  const sorted = [...p.work].sort((a, b) => Number(a.startYear) - Number(b.startYear));
  const rows: HistoryRow[] = [];
  for (const w of sorted) {
    rows.push({ year: w.startYear, month: w.startMonth, text: workStartText(w) });
    rows.push({ year: "", month: "", text: `　${labelJa(JOB_TYPES, w.jobType)}を担当` });
    if (w.current) rows.push({ year: "", month: "", text: "現在に至る" });
    else rows.push({ year: w.endYear, month: w.endMonth, text: workEndText(w) });
  }
  return rows;
}

export function historyRows(p: ProfileInput): HistoryRow[] {
  const edu = educationRows(p);
  const work = workRows(p);
  let rows: HistoryRow[] = [
    { year: "", month: "", text: "学歴", align: "CENTER" },
    ...edu,
    { year: "", month: "", text: "職歴", align: "CENTER" },
    ...work,
  ];
  // keep within the template; drop the "担当" detail lines first if needed
  if (rows.length + 1 > HISTORY_ROWS) rows = rows.filter((r) => !r.text.startsWith("　"));
  if (rows.length + 1 > HISTORY_ROWS) rows = rows.slice(0, HISTORY_ROWS - 1);
  rows.push({ year: "", month: "", text: "以上", align: "RIGHT" });
  return rows;
}

// ------------------------------------------------------------------ 免許・資格

export function licenseRows(p: ProfileInput): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const lic of p.licenses) {
    rows.push({ year: p.licenseYears[lic] ?? "", month: "", text: `${labelJa(LICENSES, lic)}　取得` });
  }
  if (p.jlpt !== "none") {
    rows.push({ year: p.jlptYear, month: p.jlptMonth, text: `日本語能力試験 ${labelJa(JLPT_LEVELS, p.jlpt)}　合格` });
  }
  if (p.jft === "passed") {
    rows.push({ year: p.jftYear, month: "", text: "国際交流基金日本語基礎テスト（JFT-Basic）A2　合格" });
  }
  for (const f of p.sswPassed) {
    rows.push({ year: p.sswYear, month: "", text: `特定技能1号評価試験（${labelJa(SSW_FIELDS, f)}分野）　合格` });
  }
  if (p.otherQualification) rows.push({ year: "", month: "", text: p.otherQualification });
  rows.sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999));
  if (rows.length === 0) return [{ year: "", month: "", text: "特になし" }];
  if (rows.length > LICENSE_ROWS) {
    const head = rows.slice(0, LICENSE_ROWS - 1);
    const rest = rows.slice(LICENSE_ROWS - 1).map((r) => `${r.year ? `${r.year}年 ` : ""}${r.text}`);
    head.push({ year: "", month: "", text: rest.join(" ／ ") });
    return head;
  }
  return rows;
}

// ------------------------------------------------------------------ 趣味・本人希望

export function hobbiesLine(p: ProfileInput): string {
  const hobbies = join(labelsJa(HOBBIES, p.hobbies));
  const skills = join(labelsJa(SKILLS, p.skills));
  return skills ? `趣味：${hobbies}\n特技：${skills}` : `趣味：${hobbies}`;
}

export function requestText(p: ProfileInput): string {
  const lines: string[] = ["貴社の規定に従います。"];
  const fields = labelsJa(DESIRED_FIELDS, p.desiredFields.filter((f) => f !== "undecided"));
  if (fields.length) lines.push(`希望職種：${join(fields)}分野`);
  lines.push(`希望勤務地：${labelJa(LOCATIONS, p.location)}`);
  lines.push(`入社可能時期：${labelJa(START_TIMINGS, p.startTiming)}`);
  const ok = labelsJa(WORK_CONDITIONS, p.workConditions);
  if (ok.length) lines.push(`${join(ok)}も可能です。`);
  const notes: string[] = [];
  if (p.considerations.includes("prayer")) notes.push("休憩時間などに短時間の礼拝（お祈り）の時間をいただけますと幸いです。");
  if (p.considerations.includes("halal")) notes.push("食事はハラール（豚肉・アルコールを使わない食事）を希望します。");
  if (p.considerations.includes("hijab")) notes.push("勤務中のヒジャブ（スカーフ）着用をご配慮いただけますと幸いです。");
  if (p.considerations.includes("fasting")) notes.push("ラマダン期間中は断食を行いますが、業務に支障がないよう体調管理に努めます。");
  if (p.considerations.includes("dorm")) notes.push("寮・社宅の利用を希望します。");
  return [...lines, ...notes].join("\n");
}

// ------------------------------------------------------------------ prompt summary

export function profileSummary(p: ProfileInput, today: Date): string {
  const L: string[] = [];
  L.push("【基本情報】");
  L.push(`- 氏名（ローマ字）: ${p.fullName}`);
  L.push(`- 性別: ${labelJa(GENDERS, p.gender)}`);
  L.push(`- 年齢: ${ageOf(p, today)}歳`);
  L.push(`- 出身: インドネシア ${labelJa(PROVINCES, p.origin)}`);
  L.push(`- 現在住んでいる所: ${residenceDescription(p)}`);

  L.push("【学歴】");
  for (const e of p.education) {
    const period = `${e.startYear}年${e.startMonth ? `${e.startMonth}月` : ""}〜${e.endYear ? `${e.endYear}年${e.endMonth ? `${e.endMonth}月` : ""}` : "現在"}`;
    L.push(`- ${period} ${schoolLabel(e)}（${labelJa(EDUCATION_STATUS, e.status)}）`);
  }

  L.push("【職歴】");
  if (p.hasWork === "yes" && p.work.length) {
    for (const w of p.work) {
      const years = w.current ? `${w.startYear}年〜現在` : `${w.startYear}年〜${w.endYear}年`;
      L.push(
        `- ${years} ${labelJa(INDUSTRIES, w.industry)}で${labelJa(JOB_TYPES, w.jobType)}を担当（${labelJa(EMPLOYMENT_TYPES, w.employment)}）${w.company ? `／会社名: ${w.company}` : ""}`,
      );
    }
  } else {
    L.push("- 職歴なし");
  }
  L.push(
    `- 日本での滞在・就労経験: ${labelJa(JAPAN_EXPERIENCE, p.japanExperience)}${p.japanDuration ? `（${labelJa(DURATIONS, p.japanDuration)}）` : ""}`,
  );

  L.push("【日本語】");
  L.push(`- 日本語能力試験: ${p.jlpt === "none" ? "なし" : `${labelJa(JLPT_LEVELS, p.jlpt)}（${p.jlptYear}年合格）`}`);
  L.push(`- JFT-Basic: ${p.jft === "passed" ? `A2合格（${p.jftYear}年）` : "なし"}`);
  L.push(`- 学習期間: ${labelJa(STUDY_PERIODS, p.studyPeriod)}`);
  L.push(`- 学習方法: ${join(labelsJa(STUDY_METHODS, p.studyMethods))}`);

  L.push("【資格】");
  const lic = labelsJa(LICENSES, p.licenses);
  const ssw = labelsJa(SSW_FIELDS, p.sswPassed).map((f) => `特定技能評価試験（${f}）合格`);
  const all = [...ssw, ...lic, ...(p.otherQualification ? [p.otherQualification] : [])];
  L.push(`- ${all.length ? join(all) : "なし"}`);

  L.push("【希望】");
  L.push(`- 希望分野: ${join(labelsJa(DESIRED_FIELDS, p.desiredFields))}`);
  L.push(`- 希望勤務地: ${labelJa(LOCATIONS, p.location)}`);
  L.push(`- 日本で働きたい期間: ${labelJa(STAY_LENGTHS, p.stayLength)}`);
  L.push(`- 働き始めたい時期: ${labelJa(START_TIMINGS, p.startTiming)}`);
  L.push(`- 予定している在留資格: ${labelJa(VISA_PLANS, p.visaPlan)}`);
  if (p.workConditions.length) L.push(`- 対応できる勤務: ${join(labelsJa(WORK_CONDITIONS, p.workConditions))}`);
  if (p.considerations.length) L.push(`- 配慮してほしいこと: ${join(labelsJa(CONSIDERATIONS, p.considerations))}`);

  L.push("【性格・得意なこと】");
  L.push(`- 長所: ${join(labelsJa(STRENGTHS, p.strengths))}`);
  L.push(`- 短所: ${labelJa(WEAKNESSES, p.weakness)}`);
  if (p.skills.length) L.push(`- 得意なこと: ${join(labelsJa(SKILLS, p.skills))}`);
  L.push(`- 趣味: ${join(labelsJa(HOBBIES, p.hobbies))}`);
  L.push(`- ストレス解消法: ${labelJa(STRESS_RELIEF, p.stressRelief)}`);

  L.push("【志望動機・目標】");
  L.push(`- 日本で働きたい理由: ${join(labelsJa(WHY_JAPAN, p.whyJapan))}`);
  L.push(`- この仕事を選んだ理由: ${join(labelsJa(WHY_JOB, p.whyJob))}`);
  L.push(`- 将来の目標: ${labelJa(FUTURE_GOALS, p.futureGoal)}`);
  L.push(`- 家族の考え: ${labelJa(FAMILY_OPINIONS, p.familyOpinion)}`);

  L.push(`（作成日: ${formatJst(today, false)}）`);
  return L.join("\n");
}

export function todayLine(today: Date): string {
  const t = jstParts(today);
  return `${t.year}年 ${t.month}月 ${t.day}日現在`;
}
