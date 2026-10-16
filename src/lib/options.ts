/**
 * Every selectable answer on the form, with its Japanese and Indonesian label.
 * `value` is what gets stored; `ja` is what the AI prompt and the résumé use.
 */
export type Option = { value: string; ja: string; id: string };

const o = (value: string, ja: string, id: string): Option => ({ value, ja, id });

export function values<T extends readonly Option[]>(list: T): [string, ...string[]] {
  return list.map((x) => x.value) as [string, ...string[]];
}

export function labelJa(list: readonly Option[], value: string | undefined | null): string {
  if (!value) return "";
  return list.find((x) => x.value === value)?.ja ?? "";
}

export function labelsJa(list: readonly Option[], vals: readonly string[] | undefined): string[] {
  return (vals ?? []).map((v) => labelJa(list, v)).filter(Boolean);
}

// ---------------------------------------------------------------- basic

export const GENDERS = [
  o("male", "男", "Laki-laki"),
  o("female", "女", "Perempuan"),
  o("none", "回答しない", "Tidak ingin menjawab"),
] as const;

export const PROVINCES = [
  o("aceh", "アチェ州", "Aceh"),
  o("sumut", "北スマトラ州", "Sumatera Utara"),
  o("sumbar", "西スマトラ州", "Sumatera Barat"),
  o("riau", "リアウ州", "Riau"),
  o("kepri", "リアウ諸島州", "Kepulauan Riau"),
  o("jambi", "ジャンビ州", "Jambi"),
  o("sumsel", "南スマトラ州", "Sumatera Selatan"),
  o("babel", "バンカ・ブリトゥン諸島州", "Kepulauan Bangka Belitung"),
  o("bengkulu", "ブンクル州", "Bengkulu"),
  o("lampung", "ランプン州", "Lampung"),
  o("jakarta", "ジャカルタ特別州", "DKI Jakarta"),
  o("jabar", "西ジャワ州", "Jawa Barat"),
  o("banten", "バンテン州", "Banten"),
  o("jateng", "中部ジャワ州", "Jawa Tengah"),
  o("diy", "ジョグジャカルタ特別州", "DI Yogyakarta"),
  o("jatim", "東ジャワ州", "Jawa Timur"),
  o("bali", "バリ州", "Bali"),
  o("ntb", "西ヌサ・トゥンガラ州", "Nusa Tenggara Barat"),
  o("ntt", "東ヌサ・トゥンガラ州", "Nusa Tenggara Timur"),
  o("kalbar", "西カリマンタン州", "Kalimantan Barat"),
  o("kalteng", "中部カリマンタン州", "Kalimantan Tengah"),
  o("kalsel", "南カリマンタン州", "Kalimantan Selatan"),
  o("kaltim", "東カリマンタン州", "Kalimantan Timur"),
  o("kaltara", "北カリマンタン州", "Kalimantan Utara"),
  o("sulut", "北スラウェシ州", "Sulawesi Utara"),
  o("gorontalo", "ゴロンタロ州", "Gorontalo"),
  o("sulteng", "中部スラウェシ州", "Sulawesi Tengah"),
  o("sulbar", "西スラウェシ州", "Sulawesi Barat"),
  o("sulsel", "南スラウェシ州", "Sulawesi Selatan"),
  o("sultra", "南東スラウェシ州", "Sulawesi Tenggara"),
  o("maluku", "マルク州", "Maluku"),
  o("malut", "北マルク州", "Maluku Utara"),
  o("papua", "パプア州", "Papua"),
  o("papbar", "西パプア州", "Papua Barat"),
  o("papbd", "南西パプア州", "Papua Barat Daya"),
  o("papteng", "中部パプア州", "Papua Tengah"),
  o("pappeg", "パプア山岳州", "Papua Pegunungan"),
  o("papsel", "南パプア州", "Papua Selatan"),
] as const;

export const PREFECTURES = [
  o("hokkaido", "北海道", "Hokkaido"), o("aomori", "青森県", "Aomori"), o("iwate", "岩手県", "Iwate"),
  o("miyagi", "宮城県", "Miyagi"), o("akita", "秋田県", "Akita"), o("yamagata", "山形県", "Yamagata"),
  o("fukushima", "福島県", "Fukushima"), o("ibaraki", "茨城県", "Ibaraki"), o("tochigi", "栃木県", "Tochigi"),
  o("gunma", "群馬県", "Gunma"), o("saitama", "埼玉県", "Saitama"), o("chiba", "千葉県", "Chiba"),
  o("tokyo", "東京都", "Tokyo"), o("kanagawa", "神奈川県", "Kanagawa"), o("niigata", "新潟県", "Niigata"),
  o("toyama", "富山県", "Toyama"), o("ishikawa", "石川県", "Ishikawa"), o("fukui", "福井県", "Fukui"),
  o("yamanashi", "山梨県", "Yamanashi"), o("nagano", "長野県", "Nagano"), o("gifu", "岐阜県", "Gifu"),
  o("shizuoka", "静岡県", "Shizuoka"), o("aichi", "愛知県", "Aichi"), o("mie", "三重県", "Mie"),
  o("shiga", "滋賀県", "Shiga"), o("kyoto", "京都府", "Kyoto"), o("osaka", "大阪府", "Osaka"),
  o("hyogo", "兵庫県", "Hyogo"), o("nara", "奈良県", "Nara"), o("wakayama", "和歌山県", "Wakayama"),
  o("tottori", "鳥取県", "Tottori"), o("shimane", "島根県", "Shimane"), o("okayama", "岡山県", "Okayama"),
  o("hiroshima", "広島県", "Hiroshima"), o("yamaguchi", "山口県", "Yamaguchi"), o("tokushima", "徳島県", "Tokushima"),
  o("kagawa", "香川県", "Kagawa"), o("ehime", "愛媛県", "Ehime"), o("kochi", "高知県", "Kochi"),
  o("fukuoka", "福岡県", "Fukuoka"), o("saga", "佐賀県", "Saga"), o("nagasaki", "長崎県", "Nagasaki"),
  o("kumamoto", "熊本県", "Kumamoto"), o("oita", "大分県", "Oita"), o("miyazaki", "宮崎県", "Miyazaki"),
  o("kagoshima", "鹿児島県", "Kagoshima"), o("okinawa", "沖縄県", "Okinawa"),
] as const;

export const RESIDENCES = [
  o("indonesia", "インドネシア", "Indonesia"),
  o("japan", "日本", "Jepang"),
  o("other", "その他の国", "Negara lain"),
] as const;

export const CONTACT_METHODS = [
  o("whatsapp", "WhatsApp", "WhatsApp"),
  o("line", "LINE", "LINE"),
  o("email", "メール", "Email"),
] as const;

// ---------------------------------------------------------------- education

export const EDUCATION_LEVELS = [
  o("smp", "中学校（SMP）", "SMP / MTs"),
  o("sma", "高等学校（SMA）", "SMA / MA"),
  o("smk", "職業高等学校（SMK）", "SMK"),
  o("diploma", "短期大学・専門課程（D1〜D3）", "Diploma (D1–D3)"),
  o("s1", "大学（S1・D4）", "Universitas (S1 / D4)"),
  o("s2", "大学院（S2）", "Pascasarjana (S2)"),
  o("lpk", "職業訓練校・日本語研修機関（LPK）", "LPK (Lembaga Pelatihan Kerja)"),
  o("sd", "小学校（SD）", "SD / MI"),
  o("other", "その他", "Lainnya"),
] as const;

export const MAJORS = [
  o("none", "普通科・専攻なし", "Umum / tidak ada jurusan"),
  o("ipa", "理系（IPA）", "IPA"),
  o("ips", "文系（IPS）", "IPS"),
  o("mechanical", "機械", "Teknik Mesin"),
  o("electrical", "電気・電子", "Teknik Listrik / Elektronika"),
  o("automotive", "自動車", "Otomotif"),
  o("civil", "建築・土木", "Teknik Sipil / Bangunan"),
  o("it", "情報・IT", "Teknik Informatika / IT"),
  o("business", "商業・経営・会計", "Bisnis / Manajemen / Akuntansi"),
  o("nursing", "看護・医療", "Keperawatan / Kesehatan"),
  o("care", "介護・福祉", "Perawatan Lansia / Kesejahteraan Sosial"),
  o("agriculture", "農業", "Pertanian"),
  o("fishery", "水産", "Perikanan"),
  o("tourism", "観光・ホテル", "Pariwisata / Perhotelan"),
  o("culinary", "調理・食品", "Tata Boga / Teknologi Pangan"),
  o("japanese", "日本語・日本文学", "Bahasa / Sastra Jepang"),
  o("education", "教育", "Pendidikan"),
  o("other", "その他", "Lainnya"),
] as const;

export const EDUCATION_STATUS = [
  o("graduated", "卒業", "Lulus"),
  o("expected", "卒業見込み", "Akan lulus"),
  o("enrolled", "在学中", "Masih sekolah / kuliah"),
  o("completed", "修了", "Selesai (pelatihan)"),
  o("dropped", "中途退学", "Tidak selesai"),
] as const;

// ---------------------------------------------------------------- work

export const INDUSTRIES = [
  o("manufacturing", "製造業（工場）", "Manufaktur (pabrik)"),
  o("food_manufacturing", "食品製造", "Produksi makanan"),
  o("construction", "建設", "Konstruksi"),
  o("care", "介護・福祉", "Perawatan lansia / panti"),
  o("medical", "医療・病院", "Medis / rumah sakit"),
  o("restaurant", "飲食店", "Restoran / kafe"),
  o("hotel", "ホテル・宿泊", "Hotel / penginapan"),
  o("retail", "販売・小売", "Toko / retail"),
  o("agriculture", "農業", "Pertanian / perkebunan"),
  o("fishery", "漁業・水産", "Perikanan"),
  o("logistics", "物流・運送", "Logistik / ekspedisi"),
  o("automotive", "自動車整備", "Bengkel otomotif"),
  o("cleaning", "清掃・ビルメンテナンス", "Kebersihan gedung"),
  o("office", "事務・オフィス", "Kantor / administrasi"),
  o("it", "IT", "IT"),
  o("education", "教育", "Pendidikan"),
  o("shipbuilding", "造船", "Galangan kapal"),
  o("other", "その他", "Lainnya"),
] as const;

export const JOB_TYPES = [
  o("production", "製造・組立", "Produksi / perakitan"),
  o("inspection", "検査・品質管理", "Inspeksi / QC"),
  o("machine", "機械操作", "Operator mesin"),
  o("welding", "溶接", "Pengelasan"),
  o("construction_work", "建設作業", "Pekerja konstruksi"),
  o("caregiving", "介護", "Caregiver (perawat lansia)"),
  o("nursing", "看護", "Perawat (medis)"),
  o("cooking", "調理", "Memasak / juru masak"),
  o("service", "接客・ホール", "Pelayanan pelanggan"),
  o("sales", "販売", "Penjualan"),
  o("cleaning", "清掃", "Kebersihan"),
  o("farming", "農作業", "Bertani / berkebun"),
  o("fishing", "漁業・水産加工", "Nelayan / pengolahan ikan"),
  o("driving", "運転・配送", "Sopir / pengiriman"),
  o("warehouse", "倉庫作業", "Gudang"),
  o("mechanic", "整備", "Mekanik"),
  o("office", "事務", "Administrasi"),
  o("it", "IT・プログラミング", "IT / pemrograman"),
  o("teaching", "教師・講師", "Guru / pengajar"),
  o("other", "その他", "Lainnya"),
] as const;

export const EMPLOYMENT_TYPES = [
  o("fulltime", "正社員", "Karyawan tetap"),
  o("contract", "契約社員", "Karyawan kontrak"),
  o("parttime", "アルバイト・パート", "Paruh waktu"),
  o("intern_jp", "技能実習（日本）", "Magang di Jepang (Ginou Jisshu)"),
  o("ssw_jp", "特定技能（日本）", "Tokutei Ginou di Jepang"),
  o("family", "家業・自営業", "Usaha keluarga / wiraswasta"),
  o("internship", "インターンシップ・実習", "Magang / PKL"),
] as const;

export const JAPAN_EXPERIENCE = [
  o("none", "ない", "Belum pernah"),
  o("intern", "技能実習生として", "Sebagai peserta magang (Ginou Jisshu)"),
  o("ssw", "特定技能として", "Sebagai pekerja Tokutei Ginou"),
  o("student", "留学生として", "Sebagai pelajar / mahasiswa"),
  o("other", "その他（旅行・研修など）", "Lainnya (wisata, pelatihan, dll.)"),
] as const;

export const DURATIONS = [
  o("lt1y", "1年未満", "Kurang dari 1 tahun"),
  o("1to3y", "1〜3年", "1–3 tahun"),
  o("3to5y", "3〜5年", "3–5 tahun"),
  o("gt5y", "5年以上", "Lebih dari 5 tahun"),
] as const;

// ---------------------------------------------------------------- Japanese & licenses

export const JLPT_LEVELS = [
  o("none", "持っていない", "Belum punya"),
  o("n5", "N5", "N5"),
  o("n4", "N4", "N4"),
  o("n3", "N3", "N3"),
  o("n2", "N2", "N2"),
  o("n1", "N1", "N1"),
] as const;

export const JFT_RESULTS = [
  o("none", "受けていない・不合格", "Belum ikut / belum lulus"),
  o("passed", "合格（A2）", "Lulus (A2)"),
] as const;

export const STUDY_PERIODS = [
  o("lt6m", "6か月未満", "Kurang dari 6 bulan"),
  o("6to12m", "6か月〜1年", "6 bulan – 1 tahun"),
  o("1to2y", "1〜2年", "1–2 tahun"),
  o("2to3y", "2〜3年", "2–3 tahun"),
  o("gt3y", "3年以上", "Lebih dari 3 tahun"),
] as const;

export const STUDY_METHODS = [
  o("lpk", "LPK・日本語学校", "LPK / sekolah bahasa Jepang"),
  o("school", "学校・大学の授業", "Pelajaran di sekolah / kampus"),
  o("self", "独学（本・アプリ・YouTube）", "Belajar sendiri (buku, aplikasi, YouTube)"),
  o("online", "オンラインレッスン", "Kursus online"),
  o("work_jp", "日本で働きながら", "Sambil bekerja di Jepang"),
  o("friends", "日本人と会話して", "Mengobrol dengan orang Jepang"),
  o("anime", "アニメ・ドラマ・音楽", "Anime, drama, dan lagu"),
] as const;

export const SSW_FIELDS = [
  o("kaigo", "介護", "Perawatan lansia (Kaigo)"),
  o("building_cleaning", "ビルクリーニング", "Kebersihan gedung"),
  o("industrial_products", "工業製品製造業", "Manufaktur produk industri"),
  o("construction", "建設", "Konstruksi"),
  o("shipbuilding", "造船・舶用工業", "Galangan kapal"),
  o("auto_repair", "自動車整備", "Perawatan otomotif"),
  o("aviation", "航空", "Penerbangan (bandara)"),
  o("accommodation", "宿泊", "Perhotelan"),
  o("agriculture", "農業", "Pertanian"),
  o("fishery", "漁業", "Perikanan"),
  o("food_manufacturing", "飲食料品製造業", "Pengolahan makanan & minuman"),
  o("food_service", "外食業", "Restoran (jasa makanan)"),
  o("auto_transport", "自動車運送業", "Pengemudi (transportasi)"),
  o("railway", "鉄道", "Perkeretaapian"),
  o("forestry", "林業", "Kehutanan"),
  o("wood", "木材産業", "Industri kayu"),
] as const;

export const DESIRED_FIELDS = [
  ...SSW_FIELDS,
  o("office_engineer", "技術・事務・通訳など", "Teknik / kantor / penerjemah"),
  o("undecided", "まだ決めていない", "Belum menentukan"),
] as const;

export const LICENSES = [
  o("sim_a", "普通自動車運転免許（インドネシア SIM A）", "SIM A (mobil)"),
  o("sim_c", "普通自動二輪車運転免許（インドネシア SIM C）", "SIM C (motor)"),
  o("sim_b", "大型自動車運転免許（インドネシア SIM B）", "SIM B (truk / bus)"),
  o("forklift", "フォークリフト運転技能（SIO）", "SIO Forklift"),
] as const;

// ---------------------------------------------------------------- wishes

export const LOCATIONS = [
  o("anywhere", "どこでもよい", "Di mana saja boleh"),
  o("urban", "都市部を希望", "Ingin di kota besar"),
  o("rural_ok", "地方でもよい", "Di daerah juga boleh"),
] as const;

export const STAY_LENGTHS = [
  o("1to3y", "1〜3年", "1–3 tahun"),
  o("3to5y", "3〜5年", "3–5 tahun"),
  o("gt5y", "5年以上", "Lebih dari 5 tahun"),
  o("long", "できるだけ長く（永住も考えている）", "Selama mungkin (ingin menetap)"),
  o("undecided", "まだ決めていない", "Belum menentukan"),
] as const;

export const START_TIMINGS = [
  o("asap", "すぐにでも", "Secepatnya"),
  o("3m", "3か月以内", "Dalam 3 bulan"),
  o("6m", "半年以内", "Dalam 6 bulan"),
  o("1y", "1年以内", "Dalam 1 tahun"),
  o("undecided", "未定", "Belum pasti"),
] as const;

export const VISA_PLANS = [
  o("ssw", "特定技能", "Tokutei Ginou (SSW)"),
  o("ikusei", "育成就労・技能実習", "Ikusei Shuro / Ginou Jisshu (magang)"),
  o("engineer", "技術・人文知識・国際業務", "Engineer / Spesialis (Gijinkoku)"),
  o("student", "留学", "Pelajar"),
  o("unknown", "わからない", "Belum tahu"),
] as const;

export const WORK_CONDITIONS = [
  o("overtime", "残業", "Lembur"),
  o("night", "夜勤", "Shift malam"),
  o("weekend", "土日・祝日の勤務", "Kerja di akhir pekan & hari libur"),
  o("shift", "シフト制の勤務", "Kerja shift"),
  o("physical", "体力を使う仕事", "Pekerjaan fisik"),
  o("relocation", "日本国内での転勤", "Dipindah ke kota lain di Jepang"),
] as const;

export const CONSIDERATIONS = [
  o("prayer", "礼拝（お祈り）の時間", "Waktu sholat"),
  o("halal", "ハラールの食事（豚肉・アルコールなし）", "Makanan halal (tanpa babi & alkohol)"),
  o("hijab", "ヒジャブ（スカーフ）の着用", "Memakai hijab"),
  o("fasting", "ラマダン期間の断食", "Puasa Ramadan"),
  o("dorm", "寮・社宅の利用", "Tinggal di asrama / mes"),
] as const;

// ---------------------------------------------------------------- personality

export const STRENGTHS = [
  o("serious", "真面目", "Serius & rajin"),
  o("hardworking", "努力家", "Pekerja keras"),
  o("responsible", "責任感が強い", "Bertanggung jawab"),
  o("cheerful", "明るい", "Ceria"),
  o("teamwork", "協調性がある", "Bisa bekerja sama dalam tim"),
  o("patient", "忍耐強い", "Sabar & tahan banting"),
  o("punctual", "時間を守る", "Tepat waktu"),
  o("careful", "丁寧・几帳面", "Teliti & rapi"),
  o("fast_learner", "覚えるのが早い", "Cepat belajar"),
  o("kind", "思いやりがある", "Baik hati & peduli"),
  o("physical", "体力がある", "Fisik kuat"),
  o("curious", "好奇心旺盛", "Rasa ingin tahu tinggi"),
  o("leadership", "リーダーシップがある", "Berjiwa pemimpin"),
  o("honest", "素直", "Jujur & mau menerima masukan"),
  o("positive", "前向き", "Berpikir positif"),
] as const;

export const WEAKNESSES = [
  o("worrier", "心配性", "Mudah khawatir"),
  o("nervous", "緊張しやすい", "Mudah gugup"),
  o("shy", "人見知り", "Pemalu dengan orang baru"),
  o("stubborn", "頑固", "Keras kepala"),
  o("too_careful", "慎重すぎる", "Terlalu berhati-hati"),
  o("impatient", "せっかち", "Tidak sabaran"),
  o("perfectionist", "完璧主義", "Perfeksionis"),
  o("cant_say_no", "頼まれると断れない", "Sulit menolak permintaan"),
  o("quiet", "口数が少ない", "Pendiam"),
] as const;

export const SKILLS = [
  o("physical_work", "体を使う仕事", "Pekerjaan fisik"),
  o("detailed_work", "細かい作業", "Pekerjaan yang detail"),
  o("cooking", "料理", "Memasak"),
  o("communication", "人と話すこと", "Berkomunikasi dengan orang"),
  o("caring", "お年寄りや子どもの世話", "Merawat lansia / anak"),
  o("computer", "パソコン（Word・Excel）", "Komputer (Word, Excel)"),
  o("driving", "運転", "Mengemudi"),
  o("machines", "機械の操作", "Mengoperasikan mesin"),
  o("english", "英語", "Bahasa Inggris"),
  o("cleaning", "掃除・整理整頓", "Bersih-bersih & merapikan"),
  o("farming", "農作業", "Bertani"),
  o("sports", "スポーツ", "Olahraga"),
] as const;

export const HOBBIES = [
  o("football", "サッカー", "Sepak bola"),
  o("futsal", "フットサル", "Futsal"),
  o("badminton", "バドミントン", "Bulu tangkis"),
  o("volleyball", "バレーボール", "Bola voli"),
  o("jogging", "ジョギング", "Lari / jogging"),
  o("gym", "筋トレ", "Fitness / gym"),
  o("cooking", "料理", "Memasak"),
  o("music", "音楽を聴くこと", "Mendengarkan musik"),
  o("singing", "歌うこと", "Bernyanyi"),
  o("guitar", "ギター", "Bermain gitar"),
  o("dance", "ダンス", "Menari"),
  o("reading", "読書", "Membaca"),
  o("movies", "映画鑑賞", "Menonton film"),
  o("anime", "アニメ・マンガ", "Anime & manga"),
  o("games", "ゲーム", "Main game"),
  o("travel", "旅行", "Jalan-jalan / traveling"),
  o("photo", "写真", "Fotografi"),
  o("fishing", "釣り", "Memancing"),
  o("drawing", "絵を描くこと", "Menggambar"),
  o("handcraft", "手芸", "Kerajinan tangan / menjahit"),
  o("gardening", "ガーデニング", "Berkebun"),
  o("volunteer", "ボランティア", "Kegiatan sosial / relawan"),
  o("japanese_study", "日本語の勉強", "Belajar bahasa Jepang"),
] as const;

export const STRESS_RELIEF = [
  o("sports", "運動する", "Berolahraga"),
  o("music", "音楽を聴く", "Mendengarkan musik"),
  o("talk", "家族や友達と話す", "Mengobrol dengan keluarga / teman"),
  o("sleep", "よく寝る", "Tidur yang cukup"),
  o("cooking", "料理を作る", "Memasak"),
  o("walk", "散歩する", "Jalan-jalan santai"),
  o("prayer", "お祈りをする", "Berdoa / beribadah"),
  o("hobby", "趣味に集中する", "Melakukan hobi"),
] as const;

// ---------------------------------------------------------------- motivation

export const WHY_JAPAN = [
  o("learn_skills", "日本の高い技術を学びたい", "Ingin belajar keterampilan & teknologi Jepang"),
  o("support_family", "家族を支えたい", "Ingin membantu keluarga"),
  o("culture", "日本の文化が好き", "Suka budaya Jepang"),
  o("safe", "安全できれいな国だから", "Jepang negara yang aman & bersih"),
  o("work_style", "日本人の働き方（時間を守る・丁寧さ）を学びたい", "Ingin belajar etos kerja Jepang (tepat waktu, teliti)"),
  o("career", "将来のキャリアのため", "Untuk karier di masa depan"),
  o("use_japanese", "勉強した日本語を活かしたい", "Ingin memakai bahasa Jepang yang sudah dipelajari"),
  o("experience", "外国で生活する経験をしたい", "Ingin pengalaman hidup di luar negeri"),
  o("anime", "アニメやドラマがきっかけで日本が好きになった", "Mulai suka Jepang karena anime / drama"),
] as const;

export const WHY_JOB = [
  o("use_experience", "今までの経験を活かせる", "Bisa memakai pengalaman saya"),
  o("help_people", "人の役に立ちたい", "Ingin membantu orang lain"),
  o("interested", "この仕事に興味がある", "Tertarik dengan pekerjaan ini"),
  o("skill", "専門的な技術を身につけたい", "Ingin punya keahlian khusus"),
  o("like_physical", "体を動かすことが好き", "Suka bergerak / kerja fisik"),
  o("future", "将来性がある仕事だから", "Pekerjaan yang punya masa depan"),
  o("studied", "学校で勉強した分野だから", "Sesuai jurusan sekolah saya"),
  o("family_job", "家族も同じ仕事をしているから", "Keluarga juga bekerja di bidang ini"),
] as const;

export const FUTURE_GOALS = [
  o("leader_jp", "日本で長く働き、リーダーになりたい", "Bekerja lama di Jepang & menjadi pemimpin"),
  o("expert", "資格を取って専門家になりたい", "Mendapat sertifikat & menjadi ahli"),
  o("ssw2", "特定技能2号を取り、日本で働き続けたい", "Mendapat Tokutei Ginou 2 & terus bekerja di Jepang"),
  o("business", "帰国して自分の会社や店を開きたい", "Pulang & membuka usaha sendiri"),
  o("teach", "帰国して日本語や技術を教えたい", "Pulang & mengajarkan bahasa Jepang / keterampilan"),
  o("bridge", "日本とインドネシアの架け橋になりたい", "Menjadi jembatan antara Jepang & Indonesia"),
  o("family_house", "家族のために家を建てたい", "Membangun rumah untuk keluarga"),
] as const;

export const FAMILY_OPINIONS = [
  o("support", "賛成して応援してくれている", "Setuju & mendukung"),
  o("agree", "賛成している", "Setuju"),
  o("discussing", "これから相談する", "Masih akan dibicarakan"),
] as const;

// ---------------------------------------------------------------- dates

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const MONTHS: Option[] = MONTH_NAMES_ID.map((name, i) => o(String(i + 1), `${i + 1}月`, name));

export function yearOptions(from: number, to: number, descending = true): Option[] {
  const list: Option[] = [];
  for (let y = from; y <= to; y++) list.push(o(String(y), `${y}年`, String(y)));
  return descending ? list.reverse() : list;
}
