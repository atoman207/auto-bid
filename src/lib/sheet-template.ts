import "server-only";
import type { sheets_v4 } from "@googleapis/sheets";
import { hex } from "./google";
import { HISTORY_ROWS, LICENSE_ROWS } from "./resume";
import { QUESTIONS } from "./questions";

/**
 * Layout of the résumé template sheet.
 *
 * - Cells containing {{key}} are filled once when a person's sheet is created.
 * - Hidden column I holds a marker ("intro.ja", "a3.hiragana", …) for every
 *   learner text row, so the app can find those rows again even after the admin
 *   inserts or moves rows. Hidden column J holds the sync hash of the Japanese text.
 *
 * The admin may restyle the template freely; keep the {{…}} placeholders and the
 * markers in column I.
 */

export const FONT = "Noto Sans JP";
export const COL_WIDTHS = [72, 44, 150, 150, 80, 104, 52, 100, 110, 110];
export const NUM_COLS = COL_WIDTHS.length;
export const MARKER_COL = 8; // I
export const HASH_COL = 9; // J
export const TEXT_COL = 1; // B

const width = (from: number, to: number) => COL_WIDTHS.slice(from, to + 1).reduce((a, b) => a + b, 0);
export const WIDTH_B_TO_H = width(1, 7);
export const WIDTH_A_TO_H = width(0, 7);

export const QUESTION_BLOCK = 8;
export const SECTION2_FIRST_ROW = 43;
const Q_BASE = 50;
export const NUM_ROWS = Q_BASE + QUESTION_BLOCK * QUESTIONS.length + 4;
/** A1 ranges used for the PDF export links. */
export const RESUME_RANGE = "A1:H42";
export const PRACTICE_RANGE = `A44:H${Q_BASE + QUESTION_BLOCK * QUESTIONS.length - 1}`;

/** Placeholder keys whose rows get their height computed from the text. */
export function autoHeightSpec(key: string): { width: number; min: number } | null {
  if (key === "motivation") return { width: WIDTH_A_TO_H, min: 120 };
  if (key === "request") return { width: WIDTH_A_TO_H, min: 90 };
  if (key === "address") return { width: WIDTH_B_TO_H, min: 30 };
  if (key === "hobbies") return { width: WIDTH_B_TO_H, min: 36 };
  if (/^(intro|q\d+|a\d+)\.(ja|hiragana|id)$/.test(key)) return { width: WIDTH_B_TO_H, min: 26 };
  return null;
}

type H = "LEFT" | "CENTER" | "RIGHT";
type V = "TOP" | "MIDDLE" | "BOTTOM";
type Fmt = { size?: number; bold?: boolean; align?: H; valign?: V; bg?: string; color?: string };
type BorderStyle = "SOLID" | "SOLID_MEDIUM" | "DOTTED" | "NONE";

class Grid {
  private cells = new Map<string, { v: string; f: Fmt }>();
  merges: [number, number, number, number][] = [];
  borders: { r1: number; c1: number; r2: number; c2: number; outer?: BorderStyle; inner?: BorderStyle; bottom?: BorderStyle }[] = [];
  heights = new Map<number, number>();

  put(r: number, c: number, v: string, f: Fmt = {}) {
    this.cells.set(`${r}:${c}`, { v, f });
  }
  get(r: number, c: number) {
    return this.cells.get(`${r}:${c}`);
  }
  merge(r1: number, c1: number, r2: number, c2: number) {
    if (r1 !== r2 || c1 !== c2) this.merges.push([r1, c1, r2, c2]);
  }
  /** Writes a value into the top-left cell and merges the range. */
  area(r1: number, c1: number, r2: number, c2: number, v: string, f: Fmt = {}) {
    this.put(r1, c1, v, f);
    this.merge(r1, c1, r2, c2);
  }
  box(r1: number, c1: number, r2: number, c2: number, outer: BorderStyle = "SOLID_MEDIUM", inner: BorderStyle = "SOLID") {
    this.borders.push({ r1, c1, r2, c2, outer, inner });
  }
  line(r: number, c1: number, c2: number, bottom: BorderStyle) {
    this.borders.push({ r1: r, c1, r2: r, c2, bottom });
  }
  height(r: number, px: number) {
    this.heights.set(r, px);
  }
}

const LABEL: Fmt = { size: 9, align: "CENTER", color: "#444444" };
const SMALL_LABEL: Fmt = { size: 8, align: "CENTER", color: "#444444" };
const HEADER: Fmt = { size: 9, align: "CENTER", bg: "#f1f1f1" };
const SECTION: Fmt = { size: 10, bold: true, bg: "#f1f1f1" };

function buildGrid(): Grid {
  const g = new Grid();

  // ---- title
  g.area(0, 0, 0, 5, "履　歴　書", { size: 18, bold: true, valign: "BOTTOM" });
  g.area(0, 6, 0, 7, "{{today}}", { size: 9, align: "RIGHT", valign: "BOTTOM" });
  g.height(0, 40);

  // ---- personal block (rows 1–9)
  g.put(1, 0, "フリガナ", SMALL_LABEL);
  g.area(1, 1, 1, 5, "{{name_kana}}", { size: 9 });
  g.put(1, MARKER_COL, "meta.kana");
  g.area(2, 0, 3, 0, "氏　名", LABEL);
  g.area(2, 1, 3, 5, "{{name}}", { size: 16 });
  g.put(2, MARKER_COL, "meta.name");
  g.height(2, 26);
  g.height(3, 26);
  g.area(1, 6, 5, 7, "写真をはる位置\n\n縦 36〜40mm\n横 24〜30mm", { size: 8, align: "CENTER", color: "#999999" });
  g.put(4, 0, "生年月日", LABEL);
  g.area(4, 1, 4, 3, "{{birth}}");
  g.put(4, 4, "性別", LABEL);
  g.put(4, 5, "{{gender}}", { align: "CENTER" });
  g.put(5, 0, "国籍", LABEL);
  g.area(5, 1, 5, 5, "{{nationality}}");
  g.put(6, 0, "フリガナ", SMALL_LABEL);
  g.area(6, 1, 6, 7, "{{address_kana}}", { size: 9 });
  g.put(7, 0, "現住所", LABEL);
  g.area(7, 1, 7, 7, "{{address}}");
  g.height(7, 34);
  g.put(8, 0, "電話", LABEL);
  g.area(8, 1, 8, 3, "{{phone}}");
  g.put(8, 4, "E-mail", LABEL);
  g.area(8, 5, 8, 7, "{{email}}");
  g.put(9, 0, "連絡先", LABEL);
  g.area(9, 1, 9, 7, "{{contact}}");
  for (let r = 1; r <= 9; r++) if (!g.heights.has(r)) g.height(r, 26);
  g.box(1, 0, 9, 7);
  g.line(1, 0, 5, "DOTTED");
  g.line(6, 0, 7, "DOTTED");
  g.height(10, 12);

  // ---- 学歴・職歴 (rows 11–27)
  g.put(11, 0, "年", HEADER);
  g.put(11, 1, "月", HEADER);
  g.area(11, 2, 11, 7, "学歴・職歴（各別にまとめて書く）", HEADER);
  for (let i = 0; i < HISTORY_ROWS; i++) {
    const r = 12 + i;
    g.put(r, 0, `{{h${i + 1}.y}}`, { align: "CENTER" });
    g.put(r, 1, `{{h${i + 1}.m}}`, { align: "CENTER" });
    g.area(r, 2, r, 7, `{{h${i + 1}.t}}`);
    g.height(r, 25);
  }
  g.box(11, 0, 11 + HISTORY_ROWS, 7);
  g.height(12 + HISTORY_ROWS, 12);

  // ---- 免許・資格 (rows 29–35)
  const lic = 13 + HISTORY_ROWS; // 29
  g.put(lic, 0, "年", HEADER);
  g.put(lic, 1, "月", HEADER);
  g.area(lic, 2, lic, 7, "免許・資格", HEADER);
  for (let i = 0; i < LICENSE_ROWS; i++) {
    const r = lic + 1 + i;
    g.put(r, 0, `{{l${i + 1}.y}}`, { align: "CENTER" });
    g.put(r, 1, `{{l${i + 1}.m}}`, { align: "CENTER" });
    g.area(r, 2, r, 7, `{{l${i + 1}.t}}`);
    g.height(r, 25);
  }
  g.box(lic, 0, lic + LICENSE_ROWS, 7);
  g.height(lic + LICENSE_ROWS + 1, 12);

  // ---- 志望動機 / 趣味 / 本人希望 (rows 37–41)
  const m = lic + LICENSE_ROWS + 2; // 37
  g.area(m, 0, m, 7, "志望の動機、特技、好きな学科、アピールポイントなど", { size: 9, bg: "#f1f1f1" });
  g.area(m + 1, 0, m + 1, 7, "{{motivation}}", { valign: "TOP" });
  g.height(m + 1, 130);
  g.put(m + 2, 0, "趣味・特技", LABEL);
  g.area(m + 2, 1, m + 2, 7, "{{hobbies}}");
  g.height(m + 2, 40);
  g.area(m + 3, 0, m + 3, 7, "本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他についての希望などがあれば記入）", {
    size: 8,
    bg: "#f1f1f1",
  });
  g.area(m + 4, 0, m + 4, 7, "{{request}}", { valign: "TOP" });
  g.height(m + 4, 110);
  g.box(m, 0, m + 4, 7);
  g.height(m + 5, 28);

  // ---- section 2: 自己紹介文・面接練習 (row 43 onward)
  const s = SECTION2_FIRST_ROW;
  g.area(s, 0, s, 7, "自己紹介文・面接練習シート　／　Perkenalan Diri & Latihan Wawancara", { size: 13, bold: true });
  g.height(s, 34);
  g.area(
    s + 1,
    0,
    s + 1,
    7,
    "※「日本語」の欄を修正したら、管理画面の「変更を反映」で ひらがな・インドネシア語・模範音声 を更新できます。非表示の列 I・J は管理用のため削除しないでください。",
    { size: 8, color: "#666666" },
  );
  g.height(s + 1, 32);

  const triRows = (r: number, key: string, jaLabel: string) => {
    g.put(r, 0, jaLabel, { ...LABEL, bg: "#fafafa" });
    g.area(r, 1, r, 7, `{{${key}.ja}}`);
    g.put(r, MARKER_COL, `${key}.ja`);
    g.put(r, HASH_COL, `{{${key}.hash}}`);
    g.put(r + 1, 0, "ひらがな", { ...LABEL, bg: "#fafafa" });
    g.area(r + 1, 1, r + 1, 7, `{{${key}.hiragana}}`, { color: "#333333" });
    g.put(r + 1, MARKER_COL, `${key}.hiragana`);
    g.put(r + 2, 0, "Indonesia", { ...LABEL, bg: "#fafafa" });
    g.area(r + 2, 1, r + 2, 7, `{{${key}.id}}`, { color: "#333333" });
    g.put(r + 2, MARKER_COL, `${key}.id`);
  };

  g.area(s + 2, 0, s + 2, 7, "■ 自己紹介文（履歴書用）　／　Perkenalan diri", SECTION);
  triRows(s + 3, "intro", "日本語");
  g.box(s + 2, 0, s + 5, 7);
  g.height(s + 6, 16);

  for (const q of QUESTIONS) {
    const b = Q_BASE + (q.no - 1) * QUESTION_BLOCK;
    g.area(b, 0, b, 7, `■ 質問 ${q.no}　／　Pertanyaan ${q.no}`, SECTION);
    triRows(b + 1, `q${q.no}`, "質問");
    triRows(b + 4, `a${q.no}`, "回答例");
    g.box(b, 0, b + 6, 7);
    g.line(b + 3, 0, 7, "SOLID_MEDIUM");
    g.height(b + 7, 16);
  }
  return g;
}

function color(c?: string) {
  return c ? hex(c) : undefined;
}

function cellFormat(f: Fmt): sheets_v4.Schema$CellFormat {
  return {
    textFormat: {
      fontFamily: FONT,
      fontSize: f.size ?? 10,
      bold: f.bold ?? false,
      foregroundColor: color(f.color ?? "#1a1a1a"),
    },
    horizontalAlignment: f.align ?? "LEFT",
    verticalAlignment: f.valign ?? "MIDDLE",
    wrapStrategy: "WRAP",
    padding: { top: 3, bottom: 3, left: 5, right: 5 },
    ...(f.bg ? { backgroundColor: hex(f.bg) } : {}),
  };
}

function border(style: BorderStyle | undefined): sheets_v4.Schema$Border | undefined {
  if (!style) return undefined;
  return { style, color: hex(style === "DOTTED" ? "#888888" : "#333333") };
}

/** All batchUpdate requests that draw the template onto an empty sheet. */
export function templateRequests(sheetId: number): sheets_v4.Schema$Request[] {
  const g = buildGrid();
  const rows: sheets_v4.Schema$RowData[] = [];
  for (let r = 0; r < NUM_ROWS; r++) {
    const values: sheets_v4.Schema$CellData[] = [];
    for (let c = 0; c < NUM_COLS; c++) {
      const cell = g.get(r, c);
      const fmt = cellFormat(cell?.f ?? {});
      if (c >= MARKER_COL) fmt.textFormat = { ...fmt.textFormat, fontSize: 8, foregroundColor: hex("#999999") };
      values.push({
        ...(cell?.v ? { userEnteredValue: { stringValue: cell.v } } : {}),
        userEnteredFormat: fmt,
      });
    }
    rows.push({ values });
  }

  const requests: sheets_v4.Schema$Request[] = [
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { rowCount: NUM_ROWS, columnCount: NUM_COLS, hideGridlines: true } },
        fields: "gridProperties(rowCount,columnCount,hideGridlines)",
      },
    },
    {
      updateCells: {
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
        rows,
        fields: "userEnteredValue,userEnteredFormat",
      },
    },
  ];

  for (const [r1, c1, r2, c2] of g.merges) {
    requests.push({
      mergeCells: {
        range: { sheetId, startRowIndex: r1, endRowIndex: r2 + 1, startColumnIndex: c1, endColumnIndex: c2 + 1 },
        mergeType: "MERGE_ALL",
      },
    });
  }

  for (const b of g.borders) {
    const range = { sheetId, startRowIndex: b.r1, endRowIndex: b.r2 + 1, startColumnIndex: b.c1, endColumnIndex: b.c2 + 1 };
    if (b.bottom) {
      requests.push({ updateBorders: { range, bottom: border(b.bottom) } });
    } else {
      requests.push({
        updateBorders: {
          range,
          top: border(b.outer),
          bottom: border(b.outer),
          left: border(b.outer),
          right: border(b.outer),
          innerHorizontal: border(b.inner),
          innerVertical: border(b.inner),
        },
      });
    }
  }

  COL_WIDTHS.forEach((px, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: "pixelSize",
      },
    });
  });
  for (let r = 0; r < NUM_ROWS; r++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: r, endIndex: r + 1 },
        properties: { pixelSize: g.heights.get(r) ?? 26 },
        fields: "pixelSize",
      },
    });
  }
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: MARKER_COL, endIndex: NUM_COLS },
      properties: { hiddenByUser: true },
      fields: "hiddenByUser",
    },
  });
  return requests;
}
