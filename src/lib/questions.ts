export type Tri = { ja: string; hiragana: string; id: string };

export type InterviewQuestion = Tri & {
  no: number;
  /** Guidance for the AI on what a good answer contains. */
  guide: string;
};

/**
 * The 10 questions most often asked in interviews for Indonesian job seekers in Japan.
 * They are fixed so readings and translations are always correct; the admin can still
 * edit them per person in the spreadsheet.
 */
export const QUESTIONS: InterviewQuestion[] = [
  {
    no: 1,
    ja: "自己紹介をしてください。",
    hiragana: "じこしょうかいを して ください。",
    id: "Silakan perkenalkan diri Anda.",
    guide:
      "1分程度の口頭の自己紹介。名前（カタカナ）・出身・これまでの学歴や仕事・自分の強み・意気込みの順に簡潔に話し、最後は「どうぞよろしくお願いいたします。」で終える。",
  },
  {
    no: 2,
    ja: "なぜ日本で働きたいのですか。",
    hiragana: "なぜ にほんで はたらきたいのですか。",
    id: "Mengapa Anda ingin bekerja di Jepang?",
    guide:
      "入力された「日本で働きたい理由」をもとに、日本で何を学び、どう成長・貢献したいかを述べる。お金だけが目的に聞こえないようにする。",
  },
  {
    no: 3,
    ja: "なぜこの仕事を選んだのですか。",
    hiragana: "なぜ この しごとを えらんだのですか。",
    id: "Mengapa Anda memilih pekerjaan ini?",
    guide:
      "希望分野を選んだ理由を、入力された理由・学歴・職歴と結びつけて述べる。希望分野が「まだ決めていない」場合は、どんな仕事でも学ぶ姿勢があることを前向きに述べる。",
  },
  {
    no: 4,
    ja: "あなたの長所と短所を教えてください。",
    hiragana: "あなたの ちょうしょと たんしょを おしえて ください。",
    id: "Tolong ceritakan kelebihan dan kekurangan Anda.",
    guide:
      "長所を1〜2つ、仕事や学校での場面を一般的な表現で添えて述べる。次に短所を1つ述べ、改善のために努力していることを必ず続ける。",
  },
  {
    no: 5,
    ja: "これまでの仕事の経験について教えてください。",
    hiragana: "これまでの しごとの けいけんに ついて おしえて ください。",
    id: "Tolong ceritakan pengalaman kerja Anda selama ini.",
    guide:
      "職歴がある場合は、業種・仕事内容・期間と、そこで学んだことや日本で活かせることを述べる。職歴がない場合は、学校・実習・家の手伝いなど入力の範囲で学んだことと、仕事への意欲を述べる。",
  },
  {
    no: 6,
    ja: "日本語はどのように勉強しましたか。",
    hiragana: "にほんごは どのように べんきょう しましたか。",
    id: "Bagaimana cara Anda belajar bahasa Jepang?",
    guide: "学習期間・学習方法・取得した資格を述べ、これからも勉強を続けて上のレベルを目指す意欲で締める。",
  },
  {
    no: 7,
    ja: "仕事で失敗したときや困ったときは、どうしますか。",
    hiragana: "しごとで しっぱいした ときや こまった ときは、どう しますか。",
    id: "Apa yang Anda lakukan jika melakukan kesalahan atau mengalami kesulitan dalam pekerjaan?",
    guide:
      "すぐに上司や先輩に報告・連絡・相談する、正直に謝る、メモを取って同じ失敗を繰り返さない、わからないことはそのままにせず質問する、という姿勢を述べる。",
  },
  {
    no: 8,
    ja: "休みの日は何をしていますか。ストレスがたまったときは、どうしますか。",
    hiragana: "やすみの ひは なにを して いますか。ストレスが たまった ときは、どう しますか。",
    id: "Apa yang Anda lakukan di hari libur? Apa yang Anda lakukan saat merasa stres?",
    guide: "入力された趣味とストレス解消法をもとに、健康的で前向きな休日の過ごし方を述べる。",
  },
  {
    no: 9,
    ja: "日本でどのくらい働きたいですか。将来の目標も教えてください。",
    hiragana: "にほんで どのくらい はたらきたいですか。しょうらいの もくひょうも おしえて ください。",
    id: "Berapa lama Anda ingin bekerja di Jepang? Tolong ceritakan juga tujuan Anda di masa depan.",
    guide:
      "入力された希望就労期間と将来の目標をもとに述べる。期間が未定の場合は「できるだけ長く働いて経験を積みたい」など前向きに表現する。",
  },
  {
    no: 10,
    ja: "最後に、何か質問はありますか。",
    hiragana: "さいごに、なにか しつもんは ありますか。",
    id: "Terakhir, apakah ada yang ingin Anda tanyakan?",
    guide:
      "面接の最後の逆質問。「はい、あります。」などで始め、希望分野に合った前向きな質問を1つする（例：入社までに勉強しておいたほうがよいこと、仕事を覚えるまでの流れ、職場で活躍している外国人の先輩について）。給料・休みだけの質問はしない。最後にお礼を言う。",
  },
];

/** Keys of every learner-facing item, in display order. */
export const ITEM_KEYS = ["intro", ...QUESTIONS.flatMap((q) => [`q${q.no}`, `a${q.no}`])] as const;

export function itemLabel(key: string): string {
  if (key === "intro") return "自己紹介文";
  const m = /^([qa])(\d+)$/.exec(key);
  if (!m) return key;
  return m[1] === "q" ? `質問${m[2]}` : `回答${m[2]}`;
}
