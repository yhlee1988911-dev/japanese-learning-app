export type JapaneseLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface SentenceQuestion {
  id: string;
  sentence: string;
  speech: string;
  answers: string[];
  meaning: string;
  meaningEn?: string;
  explanation: string;
  level: JapaneseLevel;
  source?: {
    name: string;
    url: string;
    license: string;
    author?: string;
    translationAuthor?: string;
  };
}

export const sentenceQuestions: SentenceQuestion[] = [
  { id: 'n5-1', sentence: '毎朝、___を飲みます。', speech: '毎朝、水を飲みます。', answers: ['水', 'みず', 'mizu'], meaning: '我每天早上喝水。', explanation: '水（みず）：水', level: 'N5' },
  { id: 'n5-2', sentence: '私は日本語の___です。', speech: '私は日本語の学生です。', answers: ['学生', 'がくせい', 'gakusei'], meaning: '我是学习日语的学生。', explanation: '学生（がくせい）：学生', level: 'N5' },
  { id: 'n5-3', sentence: '___、ありがとうございます。', speech: '先生、ありがとうございます。', answers: ['先生', 'せんせい', 'sensei'], meaning: '老师，谢谢您。', explanation: '先生（せんせい）：老师', level: 'N5' },
  { id: 'n5-4', sentence: '明日は___へ行きます。', speech: '明日は学校へ行きます。', answers: ['学校', 'がっこう', 'gakkou', 'gakko'], meaning: '明天去学校。', explanation: '学校（がっこう）：学校', level: 'N5' },
  { id: 'n4-1', sentence: '週末に本を___つもりです。', speech: '週末に本を読むつもりです。', answers: ['読む', 'よむ', 'yomu'], meaning: '我打算周末读书。', explanation: '読む（よむ）：读', level: 'N4' },
  { id: 'n4-2', sentence: 'このかばんは少し___です。', speech: 'このかばんは少し重いです。', answers: ['重い', 'おもい', 'omoi'], meaning: '这个包有点重。', explanation: '重い（おもい）：沉重', level: 'N4' },
  { id: 'n4-3', sentence: '駅まで歩いて___かかります。', speech: '駅まで歩いて十分かかります。', answers: ['十分', '十分钟', 'じゅっぷん', 'じっぷん', 'juppun', 'jippun'], meaning: '步行到车站需要十分钟。', explanation: '十分（じゅっぷん／じっぷん）：十分钟', level: 'N4' },
  { id: 'n4-4', sentence: '雨が降ったので、傘を___。', speech: '雨が降ったので、傘を持ってきました。', answers: ['持ってきました', 'もってきました', 'mottekimashita'], meaning: '因为下雨了，所以带了伞来。', explanation: '持ってくる：带来', level: 'N4' },
  { id: 'n3-1', sentence: '音楽を___、勉強しています。', speech: '音楽を聞きながら、勉強しています。', answers: ['聞きながら', 'ききながら', 'kikinagara'], meaning: '一边听音乐，一边学习。', explanation: '〜ながら：一边……一边……', level: 'N3' },
  { id: 'n3-2', sentence: '天気予報に___、明日は雪です。', speech: '天気予報によると、明日は雪です。', answers: ['よると', 'yoruto'], meaning: '据天气预报说明天有雪。', explanation: '〜によると：据……所说', level: 'N3' },
  { id: 'n3-3', sentence: '忙しい___、手伝ってくれました。', speech: '忙しいのに、手伝ってくれました。', answers: ['のに', 'noni'], meaning: '明明很忙，却还是帮了我。', explanation: '〜のに：明明……却……', level: 'N3' },
  { id: 'n3-4', sentence: '日本へ来てから、もう三年___。', speech: '日本へ来てから、もう三年経ちました。', answers: ['経ちました', 'たちました', 'tachimashita'], meaning: '来日本后已经过了三年。', explanation: '経つ（たつ）：经过、流逝', level: 'N3' },
  { id: 'n2-1', sentence: '経験に___判断する必要があります。', speech: '経験に基づいて判断する必要があります。', answers: ['基づいて', 'もとづいて', 'motozuite'], meaning: '有必要根据经验作出判断。', explanation: '〜に基づいて：根据……', level: 'N2' },
  { id: 'n2-2', sentence: '努力した___、結果が出なかった。', speech: '努力したにもかかわらず、結果が出なかった。', answers: ['にもかかわらず', 'nimokakawarazu'], meaning: '尽管努力了，却没有取得结果。', explanation: '〜にもかかわらず：尽管……', level: 'N2' },
  { id: 'n2-3', sentence: '計画は変更を___なくなった。', speech: '計画は変更を余儀なくされた。', answers: ['余儀', 'よぎ', 'yogi'], meaning: '计划被迫作出了变更。', explanation: '〜を余儀なくされる：被迫……', level: 'N2' },
  { id: 'n2-4', sentence: 'この問題は専門家でさえ___。', speech: 'この問題は専門家でさえ解決できない。', answers: ['解決できない', 'かいけつできない', 'kaiketsudekinai'], meaning: '这个问题连专家也解决不了。', explanation: '〜でさえ：甚至连……', level: 'N2' },
  { id: 'n1-1', sentence: '彼の発言は誤解を___。', speech: '彼の発言は誤解を招きかねない。', answers: ['招きかねない', 'まねきかねない', 'manekikanenai'], meaning: '他的发言可能会招致误解。', explanation: '〜かねない：有可能导致不好的结果', level: 'N1' },
  { id: 'n1-2', sentence: '状況を___、方針を決定する。', speech: '状況を踏まえて、方針を決定する。', answers: ['踏まえて', 'ふまえて', 'fumaete'], meaning: '根据当前情况决定方针。', explanation: '〜を踏まえて：依据、考虑到……', level: 'N1' },
  { id: 'n1-3', sentence: '彼女の実力は疑う___。', speech: '彼女の実力は疑うべくもない。', answers: ['べくもない', 'bekumonai'], meaning: '她的实力毋庸置疑。', explanation: '〜べくもない：不可能、无须……', level: 'N1' },
  { id: 'n1-4', sentence: '改革は困難を___進められた。', speech: '改革は困難をものともせず進められた。', answers: ['ものともせず', 'monotomosezu'], meaning: '改革不畏困难地推进了。', explanation: '〜をものともせず：不把……当回事', level: 'N1' }
];
