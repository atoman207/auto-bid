/** Shapes shared by the demo API and the result modal (client-safe). */

export type DemoText = { ja: string; hiragana: string; id: string; audio: string };

export type DemoRow = { year: string; month: string; text: string };

export type DemoResult = {
  id: string;
  createdAt: string;
  name: string;
  nameKana: string;
  address: string;
  motivation: string;
  hobbies: string;
  request: string;
  history: DemoRow[];
  licenses: DemoRow[];
  intro: DemoText;
  qa: { no: number; question: DemoText; answer: DemoText }[];
  /** Also being saved to the Google spreadsheet. */
  saved: boolean;
};

// ---------------------------------------------------------------- CSV

function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** UTF-8 with BOM and CRLF, so Excel (including Japanese Windows) opens it correctly. */
export function toCsv(rows: string[][]): string {
  return `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function resultCsvRows(r: DemoResult, lang: "ja" | "id"): string[][] {
  const L = (ja: string, id: string) => (lang === "ja" ? ja : id);
  const rows: string[][] = [[L("区分", "Bagian"), L("番号", "No."), L("日本語", "Bahasa Jepang"), L("ひらがな", "Hiragana"), L("インドネシア語", "Bahasa Indonesia")]];
  rows.push([L("自己紹介文", "Perkenalan diri"), "", r.intro.ja, r.intro.hiragana, r.intro.id]);
  for (const { no, question, answer } of r.qa) {
    rows.push([L("質問", "Pertanyaan"), String(no), question.ja, question.hiragana, question.id]);
    rows.push([L("回答例", "Contoh jawaban"), String(no), answer.ja, answer.hiragana, answer.id]);
  }
  rows.push([]);
  rows.push([L("履歴書の項目", "Isi CV (rirekisho)"), "", L("内容（日本語）", "Isi (bahasa Jepang)"), "", ""]);
  rows.push([L("氏名", "Nama"), "", r.name, r.nameKana, ""]);
  rows.push([L("現住所", "Alamat"), "", r.address, "", ""]);
  rows.push([L("志望の動機", "Motivasi"), "", r.motivation, "", ""]);
  rows.push([L("趣味・特技", "Hobi & keahlian"), "", r.hobbies, "", ""]);
  rows.push([L("本人希望", "Permintaan pribadi"), "", r.request, "", ""]);
  for (const h of r.history) rows.push([L("学歴・職歴", "Pendidikan & pekerjaan"), [h.year, h.month].filter(Boolean).join("/"), h.text, "", ""]);
  for (const l of r.licenses) rows.push([L("免許・資格", "Sertifikat"), [l.year, l.month].filter(Boolean).join("/"), l.text, "", ""]);
  return rows;
}
