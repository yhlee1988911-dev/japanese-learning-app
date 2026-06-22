export interface VocabularyItem {
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  meaningEn?: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  pitch?: string;
  pos?: string;
  example?: string;
  chineseExample?: string;
}

export interface LessonData {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  vocabulary: VocabularyItem[];
}

export interface CourseData {
  _id: string;
  title: string;
  description: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  totalLessons: number;
  imageUrl?: string;
}

export const mockCourses: CourseData[] = [
  {
    _id: 'course-1',
    title: 'N5 入門日本語',
    description: '初心者向け、基本的な文法と日常用語を学びます。',
    level: 'N5',
    totalLessons: 5,
    imageUrl: 'https://images.unsplash.com/photo-1514870191636-7094f8f30bb1?auto=format&fit=crop&w=800&q=80'
  },
  {
    _id: 'course-2',
    title: 'N4 初級日本語',
    description: '基礎をマスターし、日常会話をスムーズに進めます。',
    level: 'N4',
    totalLessons: 6,
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80'
  },
  {
    _id: 'course-3',
    title: 'N3 中級日本語',
    description: '複雑な文法を理解し、実務的な日本語を学びます。',
    level: 'N3',
    totalLessons: 5,
    imageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80'
  },
  {
    _id: 'course-4',
    title: 'N2 上級日本語',
    description: 'ビジネスレベルの日本語、複合的な表現を習得します。',
    level: 'N2',
    totalLessons: 5,
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80'
  },
  {
    _id: 'course-5',
    title: 'N1 プロレベル日本語',
    description: '専門的な日本語、文学的表現や複雑な議論に対応します。',
    level: 'N1',
    totalLessons: 4,
    imageUrl: 'https://images.unsplash.com/photo-1507842072343-583f20270319?auto=format&fit=crop&w=800&q=80'
  }
];

export const mockLessons: LessonData[] = [
  // N5 Course
  {
    _id: 'lesson-1',
    courseId: 'course-1',
    title: 'あいさつ（挨拶）',
    description: '基本的な挨拶表現を学びましょう。',
    order: 1,
    level: 'N5',
    vocabulary: [
      { kanji: 'こんにちは', hiragana: 'こんにちは', romaji: 'konnichiwa', meaning: '你好', level: 'N5' },
      { kanji: 'おはよう', hiragana: 'おはよう', romaji: 'ohayou', meaning: '早上好', level: 'N5' },
      { kanji: 'おやすみなさい', hiragana: 'おやすみなさい', romaji: 'oyasuminasai', meaning: '晚安', level: 'N5' },
      { kanji: 'ありがとう', hiragana: 'ありがとう', romaji: 'arigatou', meaning: '谢谢', level: 'N5' },
      { kanji: 'すみません', hiragana: 'すみません', romaji: 'sumimasen', meaning: '对不起/请问', level: 'N5' }
    ]
  },
  {
    _id: 'lesson-2',
    courseId: 'course-1',
    title: '数字（すうじ）',
    description: '1〜100の数字と数え方を学びます。',
    order: 2,
    level: 'N5',
    vocabulary: [
      { kanji: '一', hiragana: 'いち', romaji: 'ichi', meaning: '1', level: 'N5' },
      { kanji: '二', hiragana: 'に', romaji: 'ni', meaning: '2', level: 'N5' },
      { kanji: '三', hiragana: 'さん', romaji: 'san', meaning: '3', level: 'N5' },
      { kanji: '四', hiragana: 'し/よん', romaji: 'shi/yon', meaning: '4', level: 'N5' },
      { kanji: '五', hiragana: 'ご', romaji: 'go', meaning: '5', level: 'N5' },
      { kanji: '十', hiragana: 'じゅう', romaji: 'juu', meaning: '10', level: 'N5' },
      { kanji: '百', hiragana: 'ひゃく', romaji: 'hyaku', meaning: '100', level: 'N5' }
    ]
  },
  {
    _id: 'lesson-3',
    courseId: 'course-1',
    title: '自己紹介（じこしょうかい）',
    description: '自分自身を紹介する表現を学びます。',
    order: 3,
    level: 'N5',
    vocabulary: [
      { kanji: '私', hiragana: 'わたし', romaji: 'watashi', meaning: '我', level: 'N5' },
      { kanji: '名前', hiragana: 'なまえ', romaji: 'namae', meaning: '名字', level: 'N5' },
      { kanji: '学生', hiragana: 'がくせい', romaji: 'gakusei', meaning: '学生', level: 'N5' },
      { kanji: '仕事', hiragana: 'しごと', romaji: 'shigoto', meaning: '工作', level: 'N5' },
      { kanji: '国', hiragana: 'くに', romaji: 'kuni', meaning: '国家', level: 'N5' }
    ]
  },
  {
    _id: 'lesson-4',
    courseId: 'course-1',
    title: '日常用語（にちじょうようご）',
    description: '毎日使う基本的な用語を学びます。',
    order: 4,
    level: 'N5',
    vocabulary: [
      { kanji: '水', hiragana: 'みず', romaji: 'mizu', meaning: '水', level: 'N5' },
      { kanji: '食べ物', hiragana: 'たべもの', romaji: 'tabemono', meaning: '食物', level: 'N5' },
      { kanji: '飲み物', hiragana: 'のみもの', romaji: 'nomimono', meaning: '饮料', level: 'N5' },
      { kanji: '猫', hiragana: 'ねこ', romaji: 'neko', meaning: '猫', level: 'N5' },
      { kanji: '犬', hiragana: 'いぬ', romaji: 'inu', meaning: '狗', level: 'N5' }
    ]
  },
  {
    _id: 'lesson-5',
    courseId: 'course-1',
    title: '時間表現（じかんひょうげん）',
    description: '時間や日付の表現を学びます。',
    order: 5,
    level: 'N5',
    vocabulary: [
      { kanji: '今日', hiragana: 'きょう', romaji: 'kyou', meaning: '今天', level: 'N5' },
      { kanji: '明日', hiragana: 'あした', romaji: 'ashita', meaning: '明天', level: 'N5' },
      { kanji: '昨日', hiragana: 'きのう', romaji: 'kinou', meaning: '昨天', level: 'N5' },
      { kanji: '朝', hiragana: 'あさ', romaji: 'asa', meaning: '早上', level: 'N5' },
      { kanji: '夜', hiragana: 'よる', romaji: 'yoru', meaning: '晚上', level: 'N5' }
    ]
  },
  
  // N4 Course
  {
    _id: 'lesson-6',
    courseId: 'course-2',
    title: '家族（かぞく）',
    description: '家族メンバーを表す言葉を学びます。',
    order: 1,
    level: 'N4',
    vocabulary: [
      { kanji: '父', hiragana: 'ちち', romaji: 'chichi', meaning: '父亲', level: 'N4' },
      { kanji: '母', hiragana: 'はは', romaji: 'haha', meaning: '母亲', level: 'N4' },
      { kanji: '兄', hiragana: 'あに', romaji: 'ani', meaning: '哥哥', level: 'N4' },
      { kanji: '姉', hiragana: 'あね', romaji: 'ane', meaning: '姐姐', level: 'N4' },
      { kanji: '弟', hiragana: 'おとうと', romaji: 'otouto', meaning: '弟弟', level: 'N4' },
      { kanji: '妹', hiragana: 'いもうと', romaji: 'imouto', meaning: '妹妹', level: 'N4' }
    ]
  },
  {
    _id: 'lesson-7',
    courseId: 'course-2',
    title: '動詞基礎（どうしきそ）',
    description: '基本的な動詞の活用を学びます。',
    order: 2,
    level: 'N4',
    vocabulary: [
      { kanji: '食べる', hiragana: 'たべる', romaji: 'taberu', meaning: '吃', level: 'N4' },
      { kanji: '飲む', hiragana: 'のむ', romaji: 'nomu', meaning: '喝', level: 'N4' },
      { kanji: '読む', hiragana: 'よむ', romaji: 'yomu', meaning: '读', level: 'N4' },
      { kanji: '書く', hiragana: 'かく', romaji: 'kaku', meaning: '写', level: 'N4' },
      { kanji: '聞く', hiragana: 'きく', romaji: 'kiku', meaning: '听', level: 'N4' },
      { kanji: '見る', hiragana: 'みる', romaji: 'miru', meaning: '看', level: 'N4' }
    ]
  },
  {
    _id: 'lesson-8',
    courseId: 'course-2',
    title: '形容詞（けいようし）',
    description: '基本的な形容詞を学びます。',
    order: 3,
    level: 'N4',
    vocabulary: [
      { kanji: '大きい', hiragana: 'おおきい', romaji: 'ookii', meaning: '大', level: 'N4' },
      { kanji: '小さい', hiragana: 'ちいさい', romaji: 'chiisai', meaning: '小', level: 'N4' },
      { kanji: '新しい', hiragana: 'あたらしい', romaji: 'atarashii', meaning: '新', level: 'N4' },
      { kanji: '古い', hiragana: 'ふるい', romaji: 'furui', meaning: '旧', level: 'N4' },
      { kanji: '美しい', hiragana: 'うつくしい', romaji: 'utsukushii', meaning: '美', level: 'N4' }
    ]
  },
  {
    _id: 'lesson-9',
    courseId: 'course-2',
    title: '過去形（かこけい）',
    description: '過去形の基本を学びます。',
    order: 4,
    level: 'N4',
    vocabulary: [
      { kanji: '行った', hiragana: 'いった', romaji: 'itta', meaning: '去了（过去式）', level: 'N4' },
      { kanji: '来た', hiragana: 'きた', romaji: 'kita', meaning: '来了', level: 'N4' },
      { kanji: 'した', hiragana: 'した', romaji: 'shita', meaning: '做了', level: 'N4' },
      { kanji: '食べた', hiragana: 'たべた', romaji: 'tabeta', meaning: '吃了', level: 'N4' },
      { kanji: '飲んだ', hiragana: 'のんだ', romaji: 'nonda', meaning: '喝了', level: 'N4' }
    ]
  },
  {
    _id: 'lesson-10',
    courseId: 'course-2',
    title: '場所表現（ばしょひょうげん）',
    description: '場所や方向を示す表現を学びます。',
    order: 5,
    level: 'N4',
    vocabulary: [
      { kanji: '上', hiragana: 'うえ', romaji: 'ue', meaning: '上面', level: 'N4' },
      { kanji: '下', hiragana: 'した', romaji: 'shita', meaning: '下面', level: 'N4' },
      { kanji: '前', hiragana: 'まえ', romaji: 'mae', meaning: '前面', level: 'N4' },
      { kanji: '後ろ', hiragana: 'うしろ', romaji: 'ushiro', meaning: '后面', level: 'N4' },
      { kanji: '中', hiragana: 'なか', romaji: 'naka', meaning: '中间', level: 'N4' }
    ]
  },
  {
    _id: 'lesson-11',
    courseId: 'course-2',
    title: '日本文化（にほんぶんか）',
    description: '日本の伝統的な文化用語を学びます。',
    order: 6,
    level: 'N4',
    vocabulary: [
      { kanji: '着物', hiragana: 'きもの', romaji: 'kimono', meaning: '和服', level: 'N4' },
      { kanji: '寿司', hiragana: 'すし', romaji: 'sushi', meaning: '寿司', level: 'N4' },
      { kanji: '茶', hiragana: 'ちゃ', romaji: 'cha', meaning: '茶', level: 'N4' },
      { kanji: '武道', hiragana: 'ぶどう', romaji: 'budou', meaning: '武道', level: 'N4' },
      { kanji: '祭り', hiragana: 'まつり', romaji: 'matsuri', meaning: '节日/祭祀', level: 'N4' }
    ]
  },

  // N3 Course
  {
    _id: 'lesson-12',
    courseId: 'course-3',
    title: '複雑な文法（ふくざつなぶんぽう）',
    description: '中級の文法構造を学びます。',
    order: 1,
    level: 'N3',
    vocabulary: [
      { kanji: '〜ので', hiragana: '〜ので', romaji: '~node', meaning: '因为', level: 'N3' },
      { kanji: '〜のに', hiragana: '〜のに', romaji: '~noni', meaning: '虽然', level: 'N3' },
      { kanji: '〜によって', hiragana: '〜によって', romaji: '~niyotte', meaning: '根据', level: 'N3' },
      { kanji: '〜ながら', hiragana: '〜ながら', romaji: '~nagara', meaning: '一边...一边', level: 'N3' },
      { kanji: '〜ても', hiragana: '〜ても', romaji: '~temo', meaning: '即使', level: 'N3' }
    ]
  },
  {
    _id: 'lesson-13',
    courseId: 'course-3',
    title: '敬語（けいご）',
    description: '敬語表現を学びます。',
    order: 2,
    level: 'N3',
    vocabulary: [
      { kanji: 'おる', hiragana: 'おられます', romaji: 'orareru', meaning: '在（敬语）', level: 'N3' },
      { kanji: 'いる', hiragana: 'いらっしゃいます', romaji: 'irasshaimasu', meaning: '在（最高敬语）', level: 'N3' },
      { kanji: 'いう', hiragana: 'おっしゃいます', romaji: 'osshaimasu', meaning: '说（敬语）', level: 'N3' },
      { kanji: 'する', hiragana: 'なさいます', romaji: 'nasaimasu', meaning: '做（敬语）', level: 'N3' },
      { kanji: 'あげる', hiragana: 'さしあげます', romaji: 'sashiagemasu', meaning: '给（敬语）', level: 'N3' }
    ]
  },
  {
    _id: 'lesson-14',
    courseId: 'course-3',
    title: 'ビジネス用語（ようご）',
    description: 'ビジネスで使う用語を学びます。',
    order: 3,
    level: 'N3',
    vocabulary: [
      { kanji: '企画', hiragana: 'きかく', romaji: 'kikaku', meaning: '企划', level: 'N3' },
      { kanji: '報告', hiragana: 'ほうこく', romaji: 'houkoku', meaning: '报告', level: 'N3' },
      { kanji: '会議', hiragana: 'かいぎ', romaji: 'kaigi', meaning: '会议', level: 'N3' },
      { kanji: '提案', hiragana: 'ていあん', romaji: 'teian', meaning: '建议', level: 'N3' },
      { kanji: '契約', hiragana: 'けいやく', romaji: 'keiyaku', meaning: '合同', level: 'N3' }
    ]
  },
  {
    _id: 'lesson-15',
    courseId: 'course-3',
    title: '社会問題（しゃかいもんだい）',
    description: '社会的な話題に関する用語を学びます。',
    order: 4,
    level: 'N3',
    vocabulary: [
      { kanji: '環境', hiragana: 'かんきょう', romaji: 'kankyou', meaning: '环境', level: 'N3' },
      { kanji: '技術', hiragana: 'ぎじゅつ', romaji: 'gijutsu', meaning: '技术', level: 'N3' },
      { kanji: '経済', hiragana: 'けいざい', romaji: 'keizai', meaning: '经济', level: 'N3' },
      { kanji: '医療', hiragana: 'いりょう', romaji: 'iryou', meaning: '医疗', level: 'N3' },
      { kanji: '教育', hiragana: 'きょういく', romaji: 'kyouiku', meaning: '教育', level: 'N3' }
    ]
  },
  {
    _id: 'lesson-16',
    courseId: 'course-3',
    title: '文学表現（ぶんがくひょうげん）',
    description: '文学や芸術に関する表現を学びます。',
    order: 5,
    level: 'N3',
    vocabulary: [
      { kanji: '物語', hiragana: 'ものがたり', romaji: 'monogatari', meaning: '故事', level: 'N3' },
      { kanji: '詩', hiragana: 'し', romaji: 'shi', meaning: '诗', level: 'N3' },
      { kanji: '絵画', hiragana: 'かいが', romaji: 'kaiga', meaning: '绘画', level: 'N3' },
      { kanji: '音楽', hiragana: 'おんがく', romaji: 'ongaku', meaning: '音乐', level: 'N3' },
      { kanji: '演劇', hiragana: 'えんげき', romaji: 'engeki', meaning: '戏剧', level: 'N3' }
    ]
  },

  // N2 Course
  {
    _id: 'lesson-17',
    courseId: 'course-4',
    title: '高度な文法（こうどなぶんぽう）',
    description: 'ビジネスレベルの複雑な文法を学びます。',
    order: 1,
    level: 'N2',
    vocabulary: [
      { kanji: '〜のみならず', hiragana: '〜のみならず', romaji: '~nominorazu', meaning: '不仅...而且', level: 'N2' },
      { kanji: '〜ばかりか', hiragana: '〜ばかりか', romaji: '~bakrika', meaning: '不仅...还', level: 'N2' },
      { kanji: '〜を問わず', hiragana: '〜をとわず', romaji: '~wo towazu', meaning: '不论', level: 'N2' },
      { kanji: '〜に至る', hiragana: '〜にいたる', romaji: '~ni itaru', meaning: '达到...程度', level: 'N2' },
      { kanji: '〜足らず', hiragana: '〜たらず', romaji: '~tarazu', meaning: '不足...', level: 'N2' }
    ]
  },
  {
    _id: 'lesson-18',
    courseId: 'course-4',
    title: '新聞・ニュース用語',
    description: 'ニュースや新聞で使われる用語を学びます。',
    order: 2,
    level: 'N2',
    vocabulary: [
      { kanji: '報道', hiragana: 'ほうどう', romaji: 'houdou', meaning: '报道', level: 'N2' },
      { kanji: '速報', hiragana: 'そくほう', romaji: 'sokuhou', meaning: '快讯', level: 'N2' },
      { kanji: '見解', hiragana: 'けんかい', romaji: 'kenkai', meaning: '见解', level: 'N2' },
      { kanji: '動向', hiragana: 'どうこう', romaji: 'doukou', meaning: '动向', level: 'N2' },
      { kanji: '懸念', hiragana: 'けねん', romaji: 'kenen', meaning: '担忧', level: 'N2' }
    ]
  },
  {
    _id: 'lesson-19',
    courseId: 'course-4',
    title: 'ビジネス表現',
    description: 'ビジネス現場で使う表現とマナーを学びます。',
    order: 3,
    level: 'N2',
    vocabulary: [
      { kanji: '提出', hiragana: 'ていしゅつ', romaji: 'teishutsu', meaning: '提交', level: 'N2' },
      { kanji: '承認', hiragana: 'しょうにん', romaji: 'shounin', meaning: '批准', level: 'N2' },
      { kanji: '却下', hiragana: 'きゃっか', romaji: 'kyakka', meaning: '驳回', level: 'N2' },
      { kanji: '対応', hiragana: 'たいおう', romaji: 'taiou', meaning: '应对', level: 'N2' },
      { kanji: '進捗', hiragana: 'しんちょく', romaji: 'shinchoku', meaning: '进展', level: 'N2' }
    ]
  },
  {
    _id: 'lesson-20',
    courseId: 'course-4',
    title: '論文・学術用語',
    description: '学術的な論文で使われる用語を学びます。',
    order: 4,
    level: 'N2',
    vocabulary: [
      { kanji: '論述', hiragana: 'ろんじゅつ', romaji: 'ronjutsu', meaning: '论述', level: 'N2' },
      { kanji: '検証', hiragana: 'けんしょう', romaji: 'kenshou', meaning: '验证', level: 'N2' },
      { kanji: '考察', hiragana: 'こうさつ', romaji: 'kousatsu', meaning: '考察', level: 'N2' },
      { kanji: '結論', hiragana: 'けつろん', romaji: 'ketsuron', meaning: '结论', level: 'N2' },
      { kanji: '前提', hiragana: 'ぜんてい', romaji: 'zentei', meaning: '前提', level: 'N2' }
    ]
  },
  {
    _id: 'lesson-21',
    courseId: 'course-4',
    title: '感情・心情表現',
    description: '複雑な心情や感情を表現する言葉を学びます。',
    order: 5,
    level: 'N2',
    vocabulary: [
      { kanji: '惆悵', hiragana: 'ちょうちょう', romaji: 'chouchou', meaning: '怅然若失', level: 'N2' },
      { kanji: '感慨', hiragana: 'かんがい', romaji: 'kangai', meaning: '感慨', level: 'N2' },
      { kanji: '忸怩', hiragana: 'にゅうじ', romaji: 'nyuuji', meaning: '羞愧', level: 'N2' },
      { kanji: '悦楽', hiragana: 'えつらく', romaji: 'etsuraku', meaning: '喜悦', level: 'N2' },
      { kanji: '苦悩', hiragana: 'くのう', romaji: 'kunou', meaning: '痛苦', level: 'N2' }
    ]
  },

  // N1 Course
  {
    _id: 'lesson-22',
    courseId: 'course-5',
    title: '古文・文語表現',
    description: '古典的な日本語表現を学びます。',
    order: 1,
    level: 'N1',
    vocabulary: [
      { kanji: '〜けり', hiragana: '〜けり', romaji: '~keri', meaning: '（古文助动词）过去式', level: 'N1' },
      { kanji: '〜む', hiragana: '〜む', romaji: '~mu', meaning: '（古文）将来/意图', level: 'N1' },
      { kanji: '〜ぬ', hiragana: '〜ぬ', romaji: '~nu', meaning: '（古文）否定', level: 'N1' },
      { kanji: '哉', hiragana: 'かな', romaji: 'kana', meaning: '（感叹词）啊', level: 'N1' },
      { kanji: '抑', hiragana: 'そもそも', romaji: 'somosomo', meaning: '（古文）本来', level: 'N1' }
    ]
  },
  {
    _id: 'lesson-23',
    courseId: 'course-5',
    title: '専門知識・科学用語',
    description: '医学・科学・技術分野の専門用語を学びます。',
    order: 2,
    level: 'N1',
    vocabulary: [
      { kanji: '病態', hiragana: 'びょうたい', romaji: 'byoutai', meaning: '病理状态', level: 'N1' },
      { kanji: '薬剤', hiragana: 'やくざい', romaji: 'yakuzai', meaning: '药剂', level: 'N1' },
      { kanji: '有機', hiragana: 'ゆうき', romaji: 'yuuki', meaning: '有机', level: 'N1' },
      { kanji: '無機', hiragana: 'むき', romaji: 'muki', meaning: '无机', level: 'N1' },
      { kanji: '触媒', hiragana: 'しょくばい', romaji: 'shokubai', meaning: '催化剂', level: 'N1' }
    ]
  },
  {
    _id: 'lesson-24',
    courseId: 'course-5',
    title: '社会哲学思想',
    description: '社会・哲学・思想に関する高度な用語を学びます。',
    order: 3,
    level: 'N1',
    vocabulary: [
      { kanji: '弁証法', hiragana: 'べんしょうほう', romaji: 'benshouhou', meaning: '辩证法', level: 'N1' },
      { kanji: '存在論', hiragana: 'そんざいろん', romaji: 'sonzairon', meaning: '本体论', level: 'N1' },
      { kanji: '相対性', hiragana: 'そうたいせい', romaji: 'soutaisei', meaning: '相对性', level: 'N1' },
      { kanji: '客観', hiragana: 'きゃっかん', romaji: 'kyakkan', meaning: '客观', level: 'N1' },
      { kanji: '主観', hiragana: 'しゅかん', romaji: 'shukan', meaning: '主观', level: 'N1' }
    ]
  },
  {
    _id: 'lesson-25',
    courseId: 'course-5',
    title: '文学的表現・修辞法',
    description: '文学的な表現技法や修辞法を学びます。',
    order: 4,
    level: 'N1',
    vocabulary: [
      { kanji: '比喩', hiragana: 'ひゆ', romaji: 'hiyu', meaning: '比喻', level: 'N1' },
      { kanji: '隠喩', hiragana: 'いんゆ', romaji: 'inyu', meaning: '隐喻', level: 'N1' },
      { kanji: '風刺', hiragana: 'ふうし', romaji: 'fuushi', meaning: '讽刺', level: 'N1' },
      { kanji: '反語', hiragana: 'はんご', romaji: 'hango', meaning: '反问', level: 'N1' },
      { kanji: '擬人法', hiragana: 'ぎじんほう', romaji: 'gijinhou', meaning: '拟人法', level: 'N1' }
    ]
  }
];

export const getMockLessonsByCourse = (courseId: string) =>
  mockLessons.filter(lesson => lesson.courseId === courseId);

export const getMockLessonById = (lessonId: string) =>
  mockLessons.find(lesson => lesson._id === lessonId) || null;

export const getMockVocabularyByCourse = (courseId: string) =>
  getMockLessonsByCourse(courseId).flatMap(lesson =>
    lesson.vocabulary.map(v => ({ ...v, lessonId: lesson._id, lessonTitle: lesson.title }))
  );

export const getMockVocabularyByLesson = (lessonId: string) => {
  const lesson = getMockLessonById(lessonId);
  return lesson ? lesson.vocabulary : [];
};

export const getMockProgress = (courseId: string) => ({
  courseId,
  completedLessons: [],
  currentLessonId: getMockLessonsByCourse(courseId)?.[0]?._id || null,
  progressPercentage: 0,
  score: 0,
  streak: 0,
  lastActivityDate: new Date(),
  updatedAt: new Date()
});
