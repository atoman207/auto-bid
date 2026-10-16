import "server-only";
import type { sheets_v4 } from "@googleapis/sheets";
import { GoogleApiError, columnLetter, hex, quoteSheet, sheetsApi, spreadsheetId, withRetry } from "./google";
import {
  HASH_COL, MARKER_COL, NUM_COLS, NUM_ROWS, TEXT_COL, autoHeightSpec, templateRequests,
} from "./sheet-template";
import { estimateCellHeight, formatJst } from "./text";

export const LOG_SHEET = "回答一覧";
export const TEMPLATE_SHEET = "履歴書テンプレート";

export const STATUS = {
  received: "受付済み",
  processing: "生成中",
  done: "完了",
  error: "エラー",
} as const;

export const PROGRESS_OPTIONS = ["未対応", "確認・修正中", "送付済み"] as const;

/** Columns of the submissions log. Matched by header title, so the admin may reorder them. */
export const LOG_COLUMNS = [
  { key: "id", title: "受付ID", width: 130 },
  { key: "createdAt", title: "受付日時", width: 130 },
  { key: "status", title: "生成ステータス", width: 100 },
  { key: "progress", title: "対応状況", width: 110 },
  { key: "name", title: "氏名", width: 170 },
  { key: "contactMethod", title: "連絡方法", width: 80 },
  { key: "contactValue", title: "連絡先", width: 170 },
  { key: "email", title: "メール", width: 170 },
  { key: "desired", title: "希望分野", width: 170 },
  { key: "jlpt", title: "日本語", width: 70 },
  { key: "sheetUrl", title: "履歴書シート", width: 220 },
  { key: "listenUrl", title: "学習ページ（模範音声）", width: 220 },
  { key: "sheetId", title: "シートID", width: 100 },
  { key: "updatedAt", title: "更新日時", width: 130 },
  { key: "error", title: "エラー内容", width: 240 },
  { key: "memo", title: "管理メモ", width: 200 },
  { key: "contactKey", title: "重複チェック用", width: 140 },
  { key: "input", title: "入力データ(JSON)", width: 140 },
] as const;

export type LogKey = (typeof LOG_COLUMNS)[number]["key"];
export type LogRecord = Record<LogKey, string>;

// =====================================================================
// Spreadsheet structure
// =====================================================================

type SheetInfo = { sheetId: number; title: string; index: number };

async function listSheets(): Promise<SheetInfo[]> {
  const res = await withRetry(() =>
    sheetsApi().spreadsheets.get({ spreadsheetId: spreadsheetId(), fields: "properties.title,sheets.properties(sheetId,title,index)" }),
  );
  return (res.data.sheets ?? []).map((s) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title ?? "",
    index: s.properties?.index ?? 0,
  }));
}

export async function spreadsheetTitle(): Promise<{ title: string; sheets: string[] }> {
  const res = await withRetry(() =>
    sheetsApi().spreadsheets.get({ spreadsheetId: spreadsheetId(), fields: "properties.title,sheets.properties.title" }),
  );
  return {
    title: res.data.properties?.title ?? "",
    sheets: (res.data.sheets ?? []).map((s) => s.properties?.title ?? ""),
  };
}

async function batchUpdate(requests: sheets_v4.Schema$Request[]) {
  if (requests.length === 0) return [];
  const res = await withRetry(() =>
    sheetsApi().spreadsheets.batchUpdate({ spreadsheetId: spreadsheetId(), requestBody: { requests } }),
  );
  return res.data.replies ?? [];
}

async function addSheet(title: string, index: number, rows: number, cols: number, tab: string): Promise<number> {
  const replies = await batchUpdate([
    {
      addSheet: {
        properties: { title, index, gridProperties: { rowCount: rows, columnCount: cols }, tabColorStyle: { rgbColor: hex(tab) } },
      },
    },
  ]);
  const id = replies[0]?.addSheet?.properties?.sheetId;
  if (id === undefined || id === null) throw new Error(`シート「${title}」を作成できませんでした`);
  return id;
}

async function createLogSheet(): Promise<number> {
  const sheetId = await addSheet(LOG_SHEET, 0, 1000, LOG_COLUMNS.length, "#c7253e");
  const statusCol = LOG_COLUMNS.findIndex((c) => c.key === "progress");
  await batchUpdate([
    {
      updateCells: {
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
        rows: [
          {
            values: LOG_COLUMNS.map((c) => ({
              userEnteredValue: { stringValue: c.title },
              userEnteredFormat: {
                textFormat: { bold: true, foregroundColor: hex("#ffffff") },
                backgroundColor: hex("#3a3f4b"),
                verticalAlignment: "MIDDLE",
              },
            })),
          },
        ],
        fields: "userEnteredValue,userEnteredFormat",
      },
    },
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 } },
        fields: "gridProperties(frozenRowCount,frozenColumnCount)",
      },
    },
    ...LOG_COLUMNS.map((c, i) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: c.width },
        fields: "pixelSize",
      },
    })),
    {
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: statusCol, endColumnIndex: statusCol + 1 },
        rule: {
          condition: { type: "ONE_OF_LIST", values: PROGRESS_OPTIONS.map((v) => ({ userEnteredValue: v })) },
          showCustomUi: true,
          strict: false,
        },
      },
    },
  ]);
  return sheetId;
}

async function createTemplateSheet(index: number): Promise<number> {
  const sheetId = await addSheet(TEMPLATE_SHEET, index, NUM_ROWS, NUM_COLS, "#888888");
  await batchUpdate(templateRequests(sheetId));
  return sheetId;
}

export type SetupResult = { logSheetId: number; templateSheetId: number; created: string[] };

let structureCache: { logSheetId: number; templateSheetId: number; at: number } | null = null;

/** Makes sure the log and template sheets exist (creating them on first use). */
export async function ensureStructure(options: { recreateTemplate?: boolean } = {}): Promise<SetupResult> {
  if (!options.recreateTemplate && structureCache && Date.now() - structureCache.at < 5 * 60_000) {
    return { logSheetId: structureCache.logSheetId, templateSheetId: structureCache.templateSheetId, created: [] };
  }
  const created: string[] = [];
  const sheets = await listSheets();
  const log = sheets.find((s) => s.title === LOG_SHEET);
  let template = sheets.find((s) => s.title === TEMPLATE_SHEET);

  const logSheetId = log ? log.sheetId : await createLogSheet();
  if (!log) created.push(LOG_SHEET);
  else await ensureLogHeaders();

  if (template && options.recreateTemplate) {
    await batchUpdate([{ deleteSheet: { sheetId: template.sheetId } }]);
    template = undefined;
  }
  let templateSheetId: number;
  if (template) {
    templateSheetId = template.sheetId;
  } else {
    templateSheetId = await createTemplateSheet(1);
    created.push(TEMPLATE_SHEET);
  }
  structureCache = { logSheetId, templateSheetId, at: Date.now() };
  return { logSheetId, templateSheetId, created };
}

export function resetStructureCache() {
  structureCache = null;
}

// =====================================================================
// Submissions log
// =====================================================================

type LogTable = { header: Map<string, number>; rows: string[][] };

async function readLog(): Promise<LogTable> {
  const res = await withRetry(() =>
    sheetsApi().spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${quoteSheet(LOG_SHEET)}!A1:AZ`,
      valueRenderOption: "FORMATTED_VALUE",
    }),
  );
  const values = (res.data.values ?? []) as string[][];
  const headerRow = values[0] ?? [];
  const header = new Map<string, number>();
  headerRow.forEach((title, i) => {
    const col = LOG_COLUMNS.find((c) => c.title === String(title).trim());
    if (col && !header.has(col.key)) header.set(col.key, i);
  });
  return { header, rows: values.slice(1) };
}

/** Adds any missing header columns at the end (e.g. after an app update). */
async function ensureLogHeaders(): Promise<void> {
  const { header } = await readLog();
  const missing = LOG_COLUMNS.filter((c) => !header.has(c.key));
  if (missing.length === 0) return;
  const used = header.size === 0 ? 0 : Math.max(...header.values()) + 1;
  const res = await withRetry(() =>
    sheetsApi().spreadsheets.values.get({ spreadsheetId: spreadsheetId(), range: `${quoteSheet(LOG_SHEET)}!1:1` }),
  );
  const width = Math.max(used, (res.data.values?.[0] ?? []).length);
  await withRetry(() =>
    sheetsApi().spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${quoteSheet(LOG_SHEET)}!${columnLetter(width)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [missing.map((c) => c.title)] },
    }),
  );
}

function toRecord(table: LogTable, row: string[]): LogRecord {
  const rec = {} as LogRecord;
  for (const c of LOG_COLUMNS) {
    const i = table.header.get(c.key);
    rec[c.key] = i === undefined ? "" : String(row[i] ?? "");
  }
  return rec;
}

export async function listSubmissions(): Promise<LogRecord[]> {
  const table = await readLog();
  return table.rows.map((r) => toRecord(table, r)).filter((r) => r.id);
}

export async function findSubmission(id: string): Promise<{ record: LogRecord; rowNumber: number } | null> {
  const table = await readLog();
  const idCol = table.header.get("id");
  if (idCol === undefined) return null;
  const index = table.rows.findIndex((r) => String(r[idCol] ?? "").trim() === id);
  if (index < 0) return null;
  return { record: toRecord(table, table.rows[index]), rowNumber: index + 2 };
}

export async function findByContact(contactKey: string, email: string): Promise<LogRecord | null> {
  const list = await listSubmissions();
  const mail = email.trim().toLowerCase();
  return (
    list.find(
      (r) => r.contactKey === contactKey || (mail !== "" && r.email.trim().toLowerCase() === mail),
    ) ?? null
  );
}

export async function appendSubmission(record: Partial<LogRecord>): Promise<void> {
  const table = await readLog();
  if (table.header.size === 0) throw new Error(`「${LOG_SHEET}」シートの見出し行がありません`);
  const width = Math.max(...table.header.values()) + 1;
  const row = new Array<string>(width).fill("");
  for (const [key, i] of table.header) row[i] = record[key as LogKey] ?? "";
  await withRetry(() =>
    sheetsApi().spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${quoteSheet(LOG_SHEET)}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    }),
  );
}

export async function updateSubmission(id: string, patch: Partial<LogRecord>): Promise<void> {
  const table = await readLog();
  const idCol = table.header.get("id");
  if (idCol === undefined) throw new Error("受付ID列が見つかりません");
  const index = table.rows.findIndex((r) => String(r[idCol] ?? "").trim() === id);
  if (index < 0) throw new Error(`受付ID ${id} が見つかりません`);
  const rowNumber = index + 2;
  const data = Object.entries({ ...patch, updatedAt: formatJst(new Date()) })
    .filter(([key]) => table.header.has(key))
    .map(([key, value]) => ({
      range: `${quoteSheet(LOG_SHEET)}!${columnLetter(table.header.get(key)!)}${rowNumber}`,
      values: [[value ?? ""]],
    }));
  if (data.length === 0) return;
  await withRetry(() =>
    sheetsApi().spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: { valueInputOption: "RAW", data },
    }),
  );
}

// =====================================================================
// Per-person résumé sheets
// =====================================================================

async function readSheetValues(sheetId: number): Promise<string[][]> {
  let res;
  try {
    res = await withRetry(() =>
      sheetsApi().spreadsheets.values.batchGetByDataFilter({
        spreadsheetId: spreadsheetId(),
        requestBody: {
          dataFilters: [{ gridRange: { sheetId } }],
          majorDimension: "ROWS",
          valueRenderOption: "FORMATTED_VALUE",
        },
      }),
    );
  } catch (e) {
    if (e instanceof GoogleApiError && e.status === 400) throw new SheetNotFoundError();
    throw e;
  }
  const range = res.data.valueRanges?.[0];
  if (!range) throw new SheetNotFoundError();
  return ((range.valueRange?.values ?? []) as unknown[][]).map((row) => row.map((v) => String(v ?? "")));
}

export class SheetNotFoundError extends Error {
  constructor() {
    super("履歴書シートが見つかりません（削除された可能性があります）");
  }
}

function cleanTitle(text: string): string {
  return text.replace(/[\[\]*?/\\:']/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

export type CellValue = string | { value: string; align?: "LEFT" | "CENTER" | "RIGHT" };

function stringCell(value: string): sheets_v4.Schema$CellData {
  return value ? { userEnteredValue: { stringValue: value } } : {};
}

/**
 * Copies the template into a new sheet for one person and fills every {{placeholder}}.
 * Returns the new sheet's id.
 */
export async function createResumeSheet(title: string, values: Record<string, CellValue>): Promise<number> {
  const { templateSheetId } = await ensureStructure();
  const existing = new Set((await listSheets()).map((s) => s.title));
  const base = cleanTitle(title) || "履歴書";
  let name = base;
  for (let n = 2; existing.has(name); n++) name = `${base} (${n})`;

  const replies = await batchUpdate([
    { duplicateSheet: { sourceSheetId: templateSheetId, insertSheetIndex: 2, newSheetName: name } },
  ]);
  const sheetId = replies[0]?.duplicateSheet?.properties?.sheetId;
  if (sheetId === undefined || sheetId === null) throw new Error("履歴書シートを作成できませんでした");

  try {
    const { cells, heights, missing } = fillPlaceholders(await readSheetValues(sheetId), values);
    if (missing.length) console.warn(`[createResumeSheet] no value for placeholders: ${missing.join(", ")}`);
    const requests: sheets_v4.Schema$Request[] = cells.map(({ r, c, value, align }) => ({
      updateCells: {
        start: { sheetId, rowIndex: r, columnIndex: c },
        rows: [{ values: [{ ...stringCell(value), ...(align ? { userEnteredFormat: { horizontalAlignment: align } } : {}) }] }],
        fields: align ? "userEnteredValue,userEnteredFormat.horizontalAlignment" : "userEnteredValue",
      },
    }));
    for (const [r, px] of heights) requests.push(rowHeightRequest(sheetId, r, px));
    await batchUpdate(requests);
  } catch (e) {
    // don't leave a half-filled copy behind
    await batchUpdate([{ deleteSheet: { sheetId } }]).catch(() => undefined);
    throw e;
  }
  return sheetId;
}

type FilledCell = { r: number; c: number; value: string; align?: "LEFT" | "CENTER" | "RIGHT" };

/** Replaces every {{key}} in a sheet grid; returns the changed cells and the row heights they need. */
export function fillPlaceholders(
  grid: string[][],
  values: Record<string, CellValue>,
): { cells: FilledCell[]; heights: Map<number, number>; missing: string[] } {
  const cells: FilledCell[] = [];
  const heights = new Map<number, number>();
  const missing = new Set<string>();
  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell.includes("{{")) return;
      let align: FilledCell["align"];
      const whole = /^\{\{([\w.]+)\}\}$/.exec(cell.trim());
      const onlyKey = whole ? whole[1] : null;
      const value = cell.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => {
        const v = values[key];
        if (v === undefined) {
          missing.add(key);
          return "";
        }
        if (typeof v === "string") return v;
        if (onlyKey) align = v.align;
        return v.value;
      });
      cells.push({ r, c, value, align });
      const spec = onlyKey ? autoHeightSpec(onlyKey) : null;
      if (spec) heights.set(r, Math.max(heights.get(r) ?? 0, estimateCellHeight(value, spec.width, 10, spec.min)));
    });
  });
  return { cells, heights, missing: [...missing] };
}

function rowHeightRequest(sheetId: number, row: number, px: number): sheets_v4.Schema$Request {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: row, endIndex: row + 1 },
      properties: { pixelSize: px },
      fields: "pixelSize",
    },
  };
}

export type ResumeItem = {
  key: string;
  ja: string;
  hiragana: string;
  id: string;
  /** Hash of the Japanese text that the current hiragana / Indonesian were made from. */
  syncHash: string;
  rows: { ja?: number; hiragana?: number; id?: number };
};

export type ResumeContent = { name: string; kana: string; items: Record<string, ResumeItem> };

export async function readResume(sheetId: number): Promise<ResumeContent> {
  return parseResumeGrid(await readSheetValues(sheetId));
}

/** Finds the learner texts through the markers in the hidden column. */
export function parseResumeGrid(grid: string[][]): ResumeContent {
  const items: Record<string, ResumeItem> = {};
  let name = "";
  let kana = "";
  grid.forEach((row, r) => {
    const marker = (row[MARKER_COL] ?? "").trim();
    const m = /^(intro|q\d{1,2}|a\d{1,2}|meta)\.(ja|hiragana|id|name|kana)$/.exec(marker);
    if (!m) return;
    const [, key, field] = m;
    const text = (row[TEXT_COL] ?? "").trim();
    if (key === "meta") {
      if (field === "name") name = text;
      if (field === "kana") kana = text;
      return;
    }
    const item = (items[key] ??= { key, ja: "", hiragana: "", id: "", syncHash: "", rows: {} });
    if (field === "ja" || field === "hiragana" || field === "id") {
      item[field] = text;
      item.rows[field] = r;
      if (field === "ja") item.syncHash = (row[HASH_COL] ?? "").trim();
    }
  });
  return { name, kana, items };
}

export type ItemUpdate = { key: string; hiragana?: string; id?: string; syncHash?: string };

/** Writes regenerated readings back to the rows found via the markers and resizes them. */
export async function writeResumeItems(sheetId: number, content: ResumeContent, updates: ItemUpdate[]): Promise<void> {
  const requests: sheets_v4.Schema$Request[] = [];
  const setCell = (row: number, col: number, value: string) =>
    requests.push({
      updateCells: {
        start: { sheetId, rowIndex: row, columnIndex: col },
        rows: [{ values: [stringCell(value)] }],
        fields: "userEnteredValue",
      },
    });

  for (const u of updates) {
    const item = content.items[u.key];
    if (!item) continue;
    const width = autoHeightSpec(`${u.key}.ja`)!;
    if (u.hiragana !== undefined && item.rows.hiragana !== undefined) {
      setCell(item.rows.hiragana, TEXT_COL, u.hiragana);
      requests.push(rowHeightRequest(sheetId, item.rows.hiragana, estimateCellHeight(u.hiragana, width.width, 10, width.min)));
    }
    if (u.id !== undefined && item.rows.id !== undefined) {
      setCell(item.rows.id, TEXT_COL, u.id);
      requests.push(rowHeightRequest(sheetId, item.rows.id, estimateCellHeight(u.id, width.width, 10, width.min)));
    }
    if (u.syncHash !== undefined && item.rows.ja !== undefined) {
      setCell(item.rows.ja, HASH_COL, u.syncHash);
      requests.push(rowHeightRequest(sheetId, item.rows.ja, estimateCellHeight(item.ja, width.width, 10, width.min)));
    }
  }
  await batchUpdate(requests);
}

export async function sheetExists(sheetId: number): Promise<boolean> {
  return (await listSheets()).some((s) => s.sheetId === sheetId);
}
