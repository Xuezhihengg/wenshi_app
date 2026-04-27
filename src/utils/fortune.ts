import { Solar } from 'lunar-typescript';
import { AnalysisResult, Hexagram, HexagramLine, LunarInfo, SixSpirit, SpiritAnalysis, TrigramName } from '../domain/types';

const TRIGRAMS: Record<
  TrigramName,
  { code: string; element: string; palace: string; lines: [boolean, boolean, boolean] }
> = {
  乾: { code: '111', element: '金', palace: '乾', lines: [true, true, true] },
  兑: { code: '110', element: '金', palace: '兑', lines: [true, true, false] },
  离: { code: '101', element: '火', palace: '离', lines: [true, false, true] },
  震: { code: '100', element: '木', palace: '震', lines: [true, false, false] },
  巽: { code: '011', element: '木', palace: '巽', lines: [false, true, true] },
  坎: { code: '010', element: '水', palace: '坎', lines: [false, true, false] },
  艮: { code: '001', element: '土', palace: '艮', lines: [false, false, true] },
  坤: { code: '000', element: '土', palace: '坤', lines: [false, false, false] },
};

const HEXAGRAM_NAMES: Record<string, string> = {
  '111111': '乾为天',
  '000000': '坤为地',
  '010001': '水雷屯',
  '100010': '山水蒙',
  '010111': '水天需',
  '111010': '天水讼',
  '000010': '地水师',
  '010000': '水地比',
  '110111': '风天小畜',
  '111011': '天泽履',
  '000111': '地天泰',
  '111000': '天地否',
  '111101': '天火同人',
  '101111': '火天大有',
  '001000': '地山谦',
  '000100': '雷地豫',
  '011001': '泽雷随',
  '100110': '山风蛊',
  '000011': '地泽临',
  '110000': '风地观',
  '101001': '火雷噬嗑',
  '100101': '山火贲',
  '100000': '山地剥',
  '000001': '地雷复',
  '111001': '天雷无妄',
  '100111': '山天大畜',
  '100001': '山雷颐',
  '011110': '泽风大过',
  '010010': '坎为水',
  '101101': '离为火',
  '011100': '泽山咸',
  '001110': '雷风恒',
  '111100': '天山遁',
  '001111': '雷天大壮',
  '101000': '火地晋',
  '000101': '地火明夷',
  '110101': '风火家人',
  '101011': '火泽睽',
  '010100': '水山蹇',
  '001010': '雷水解',
  '100011': '山泽损',
  '110001': '风雷益',
  '011111': '泽天夬',
  '111110': '天风姤',
  '011000': '泽地萃',
  '000110': '地风升',
  '011010': '泽水困',
  '010110': '水风井',
  '011101': '泽火革',
  '101110': '火风鼎',
  '001001': '震为雷',
  '100100': '艮为山',
  '110100': '风山渐',
  '001011': '雷泽归妹',
  '001101': '雷火丰',
  '101100': '火山旅',
  '110110': '巽为风',
  '011011': '兑为泽',
  '110010': '风水涣',
  '010011': '水泽节',
  '110011': '风泽中孚',
  '001100': '雷山小过',
  '010101': '水火既济',
  '101010': '火水未济',
};

const SIX_SPIRITS: SixSpirit[] = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];
const FIVE_ELEMENTS = ['木', '火', '土', '金', '水'];
const PALACE_ELEMENTS: Record<TrigramName, string> = {
  乾: '金',
  兑: '金',
  离: '火',
  震: '木',
  巽: '木',
  坎: '水',
  艮: '土',
  坤: '土',
};
const BRANCH_ELEMENTS: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

const BRANCH_OPPOSITIONS: Record<string, string> = {
  子: '午',
  丑: '未',
  寅: '申',
  卯: '酉',
  辰: '戌',
  巳: '亥',
  午: '子',
  未: '丑',
  申: '寅',
  酉: '卯',
  戌: '辰',
  亥: '巳',
};
const BRANCH_COMBINES: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
};
const SAN_HE_GROUPS = [
  { branches: ['申', '子', '辰'], element: '水' },
  { branches: ['亥', '卯', '未'], element: '木' },
  { branches: ['寅', '午', '戌'], element: '火' },
  { branches: ['巳', '酉', '丑'], element: '金' },
];
const CHANG_SHENG_START: Record<string, string> = {
  木: '亥',
  火: '寅',
  土: '申',
  金: '巳',
  水: '申',
};
const CHANG_SHENG_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const ADVANCE_REGRESS: Record<string, { advance?: string; regress?: string }> = {
  亥: { advance: '子' },
  寅: { advance: '卯' },
  巳: { advance: '午' },
  申: { advance: '酉' },
  丑: { regress: '辰' },
  辰: { regress: '未' },
  未: { regress: '戌' },
  戌: { regress: '丑' },
};

const ELEMENTAL_STATUSES = ['死', '囚', '休', '相', '旺'];
const WEAKENING_RELATIONS = new Set(['line-generates-calendar', 'calendar-controls-line', 'line-controls-calendar']);
const STRENGTHENING_RELATIONS = new Set(['same', 'calendar-generates-line']);
const TRIGRAM_NAJIA: Record<TrigramName, string[]> = {
  乾: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
  坤: ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'],
  震: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
  巽: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
  坎: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
  离: ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'],
  艮: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
  兑: ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'],
};
const EIGHT_PALACES: Record<string, { palace: TrigramName; world: number; response: number }> = {
  '111111': { palace: '乾', world: 5, response: 2 },
  '111110': { palace: '乾', world: 0, response: 3 },
  '111100': { palace: '乾', world: 1, response: 4 },
  '111000': { palace: '乾', world: 2, response: 5 },
  '110000': { palace: '乾', world: 3, response: 0 },
  '100000': { palace: '乾', world: 4, response: 1 },
  '101000': { palace: '乾', world: 3, response: 0 },
  '101111': { palace: '乾', world: 2, response: 5 },
  '011011': { palace: '兑', world: 5, response: 2 },
  '011010': { palace: '兑', world: 0, response: 3 },
  '011000': { palace: '兑', world: 1, response: 4 },
  '011100': { palace: '兑', world: 2, response: 5 },
  '010100': { palace: '兑', world: 3, response: 0 },
  '000100': { palace: '兑', world: 4, response: 1 },
  '001100': { palace: '兑', world: 3, response: 0 },
  '001011': { palace: '兑', world: 2, response: 5 },
  '101101': { palace: '离', world: 5, response: 2 },
  '101100': { palace: '离', world: 0, response: 3 },
  '101110': { palace: '离', world: 1, response: 4 },
  '101010': { palace: '离', world: 2, response: 5 },
  '100010': { palace: '离', world: 3, response: 0 },
  '110010': { palace: '离', world: 4, response: 1 },
  '111010': { palace: '离', world: 3, response: 0 },
  '111101': { palace: '离', world: 2, response: 5 },
  '001001': { palace: '震', world: 5, response: 2 },
  '001000': { palace: '震', world: 0, response: 3 },
  '001010': { palace: '震', world: 1, response: 4 },
  '001110': { palace: '震', world: 2, response: 5 },
  '000110': { palace: '震', world: 3, response: 0 },
  '010110': { palace: '震', world: 4, response: 1 },
  '011110': { palace: '震', world: 3, response: 0 },
  '011001': { palace: '震', world: 2, response: 5 },
  '110110': { palace: '巽', world: 5, response: 2 },
  '110111': { palace: '巽', world: 0, response: 3 },
  '110101': { palace: '巽', world: 1, response: 4 },
  '110001': { palace: '巽', world: 2, response: 5 },
  '111001': { palace: '巽', world: 3, response: 0 },
  '101001': { palace: '巽', world: 4, response: 1 },
  '100001': { palace: '巽', world: 3, response: 0 },
  '100110': { palace: '巽', world: 2, response: 5 },
  '010010': { palace: '坎', world: 5, response: 2 },
  '010011': { palace: '坎', world: 0, response: 3 },
  '010001': { palace: '坎', world: 1, response: 4 },
  '010101': { palace: '坎', world: 2, response: 5 },
  '011101': { palace: '坎', world: 3, response: 0 },
  '001101': { palace: '坎', world: 4, response: 1 },
  '000101': { palace: '坎', world: 3, response: 0 },
  '000010': { palace: '坎', world: 2, response: 5 },
  '100100': { palace: '艮', world: 5, response: 2 },
  '100101': { palace: '艮', world: 0, response: 3 },
  '100111': { palace: '艮', world: 1, response: 4 },
  '100011': { palace: '艮', world: 2, response: 5 },
  '101011': { palace: '艮', world: 3, response: 0 },
  '111011': { palace: '艮', world: 4, response: 1 },
  '110011': { palace: '艮', world: 3, response: 0 },
  '110100': { palace: '艮', world: 2, response: 5 },
  '000000': { palace: '坤', world: 5, response: 2 },
  '000001': { palace: '坤', world: 0, response: 3 },
  '000011': { palace: '坤', world: 1, response: 4 },
  '000111': { palace: '坤', world: 2, response: 5 },
  '001111': { palace: '坤', world: 3, response: 0 },
  '011111': { palace: '坤', world: 4, response: 1 },
  '010111': { palace: '坤', world: 3, response: 0 },
  '010000': { palace: '坤', world: 2, response: 5 },
};

const LIU_HE_HEXAGRAMS = new Set(['地天泰', '天地否', '泽水困', '水泽节', '雷地豫', '地雷复', '火山旅', '山火贲']);
const LIU_CHONG_HEXAGRAMS = new Set(['乾为天', '坤为地', '震为雷', '巽为风', '坎为水', '离为火', '艮为山', '兑为泽', '天雷无妄', '雷天大壮']);
const YOU_HUN_HEXAGRAMS = new Set(['火地晋', '雷山小过', '天水讼', '泽风大过', '山雷颐', '地火明夷', '风泽中孚', '水天需']);
const GUI_HUN_HEXAGRAMS = new Set(['火天大有', '雷泽归妹', '天火同人', '泽雷随', '山风蛊', '地水师', '风山渐', '水地比']);

function hexagramMarks(name: string) {
  const marks: string[] = [];
  if (LIU_HE_HEXAGRAMS.has(name)) marks.push('六合');
  if (LIU_CHONG_HEXAGRAMS.has(name)) marks.push('六冲');
  if (YOU_HUN_HEXAGRAMS.has(name)) marks.push('游魂');
  if (GUI_HUN_HEXAGRAMS.has(name)) marks.push('归魂');
  return marks;
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function pick<T>(items: T[], index: number) {
  return items[wrapIndex(index, items.length)];
}

function lineToYinYang(strength: number) {
  return strength === 6 || strength === 8 ? 'yin' : 'yang';
}

function lineLabel(strength: number) {
  switch (strength) {
    case 6:
      return '老阴';
    case 7:
      return '少阳';
    case 8:
      return '少阴';
    case 9:
      return '老阳';
    default:
      return '未知';
  }
}

function stemBranchForLine(index: number, lowerTrigram: TrigramName, upperTrigram: TrigramName) {
  const trigram = index < 3 ? lowerTrigram : upperTrigram;
  return TRIGRAM_NAJIA[trigram][index % 3 + (index < 3 ? 0 : 3)];
}

function sixKinForElement(palaceElement: string, branchElement: string) {
  if (palaceElement === branchElement) {
    return '兄弟';
  }
  const palaceIndex = FIVE_ELEMENTS.indexOf(palaceElement);
  const branchIndex = FIVE_ELEMENTS.indexOf(branchElement);
  if (branchIndex === wrapIndex(palaceIndex + 1, FIVE_ELEMENTS.length)) {
    return '子孙';
  }
  if (branchIndex === wrapIndex(palaceIndex - 1, FIVE_ELEMENTS.length)) {
    return '父母';
  }
  if (branchIndex === wrapIndex(palaceIndex + 2, FIVE_ELEMENTS.length)) {
    return '妻财';
  }
  return '官鬼';
}

function branchElementFromStemBranch(stemBranch: string) {
  return BRANCH_ELEMENTS[stemBranch.slice(1)] ?? '';
}

function generatedElement(element: string) {
  return pick(FIVE_ELEMENTS, FIVE_ELEMENTS.indexOf(element) + 1);
}

function controlledElement(element: string) {
  return pick(FIVE_ELEMENTS, FIVE_ELEMENTS.indexOf(element) + 2);
}

function elementRelation(lineElement: string, calendarElement: string) {
  if (lineElement === calendarElement) return 'same';
  if (generatedElement(calendarElement) === lineElement) return 'calendar-generates-line';
  if (generatedElement(lineElement) === calendarElement) return 'line-generates-calendar';
  if (controlledElement(calendarElement) === lineElement) return 'calendar-controls-line';
  return 'line-controls-calendar';
}

function relationVerb(subjectElement: string | undefined, objectElement: string | undefined) {
  if (!subjectElement || !objectElement) return '关系不明';
  const relation = elementRelation(objectElement, subjectElement);
  if (relation === 'same') return '同气';
  if (relation === 'calendar-generates-line') return '生';
  if (relation === 'calendar-controls-line') return '克';
  if (relation === 'line-generates-calendar') return '泄';
  return '受克';
}

function branchRelationText(sourceBranch: string | undefined, targetBranch: string | undefined) {
  const results: string[] = [];
  if (!sourceBranch || !targetBranch) return results;
  if (BRANCH_OPPOSITIONS[sourceBranch] === targetBranch) results.push('冲');
  if (BRANCH_COMBINES[sourceBranch] === targetBranch) results.push('合');
  if (sourceBranch === targetBranch) results.push('值');
  return results;
}

function changShengStage(element: string | undefined, branch: string | undefined) {
  if (!element || !branch) return '';
  const startBranch = CHANG_SHENG_START[element];
  const startIndex = startBranch ? Object.keys(BRANCH_ELEMENTS).indexOf(startBranch) : -1;
  const branchIndex = Object.keys(BRANCH_ELEMENTS).indexOf(branch);
  if (startIndex < 0 || branchIndex < 0) return '';
  return CHANG_SHENG_STAGES[wrapIndex(branchIndex - startIndex, CHANG_SHENG_STAGES.length)];
}

function keyChangShengText(element: string | undefined, branch: string | undefined) {
  const stage = changShengStage(element, branch);
  return stage === '长生' || stage === '帝旺' || stage === '墓' ? stage : '';
}

function monthElementalStatus(lineElement: string, monthElement: string) {
  const relation = elementRelation(lineElement, monthElement);
  if (relation === 'same') return '旺';
  if (relation === 'calendar-generates-line') return '相';
  if (relation === 'line-generates-calendar') return '休';
  if (relation === 'line-controls-calendar') return '囚';
  return '死';
}

export function calculateElementalStatus(lineElement: string | undefined, lunarInfo: LunarInfo) {
  if (!lineElement) return '休';
  const monthElement = branchElementFromStemBranch(lunarInfo.monthStemBranch);
  const dayElement = branchElementFromStemBranch(lunarInfo.dayStemBranch);
  if (!monthElement || !dayElement) return '休';
  const baseStatus = monthElementalStatus(lineElement, monthElement);
  const dayRelation = elementRelation(lineElement, dayElement);
  const dayDelta = STRENGTHENING_RELATIONS.has(dayRelation) ? 1 : WEAKENING_RELATIONS.has(dayRelation) ? -1 : 0;
  const baseIndex = ELEMENTAL_STATUSES.indexOf(baseStatus);
  return pick(ELEMENTAL_STATUSES, Math.max(0, Math.min(ELEMENTAL_STATUSES.length - 1, baseIndex + dayDelta)));
}

function branchFromStemBranch(stemBranch: string) {
  return stemBranch.slice(1);
}

function isOpposed(branch: string | undefined, calendarBranch: string) {
  return Boolean(branch && BRANCH_OPPOSITIONS[calendarBranch] === branch);
}

function calculateSpecialStatus(
  branch: string | undefined,
  moving: boolean,
  elementalStatus: string | undefined,
  lunarInfo?: LunarInfo
): HexagramLine['specialStatus'] {
  if (!branch || !lunarInfo) return undefined;
  const monthBranch = branchFromStemBranch(lunarInfo.monthStemBranch);
  const dayBranch = branchFromStemBranch(lunarInfo.dayStemBranch);
  if (isOpposed(branch, monthBranch)) return '月破';
  if (!moving && isOpposed(branch, dayBranch) && (elementalStatus === '旺' || elementalStatus === '相')) return '暗动';
  if (lunarInfo.voidBranches.includes(branch)) return '旬空';
  return undefined;
}

function buildLine(
  index: number,
  strength: number,
  lowerTrigram: TrigramName,
  upperTrigram: TrigramName,
  palace: TrigramName,
  worldIndex: number,
  responseIndex: number,
  lunarInfo?: LunarInfo
): HexagramLine {
  const moving = strength === 6 || strength === 9;
  const yinYang = lineToYinYang(strength);
  const stemBranch = stemBranchForLine(index, lowerTrigram, upperTrigram);
  const branch = stemBranch.slice(1);
  const branchElement = BRANCH_ELEMENTS[branch];
  const palaceElement = PALACE_ELEMENTS[palace];
  const sixSpirit = SIX_SPIRITS[index % SIX_SPIRITS.length];
  const elementalStatus = lunarInfo ? calculateElementalStatus(branchElement, lunarInfo) : undefined;
  return {
    index,
    strength: strength as 6 | 7 | 8 | 9,
    moving,
    yinYang,
    label: lineLabel(strength),
    role: index === worldIndex ? 'world' : index === responseIndex ? 'response' : 'normal',
    sixSpirit,
    sixKin: sixKinForElement(palaceElement, branchElement),
    stemBranch,
    branch,
    branchElement,
    elementalStatus,
    specialStatus: calculateSpecialStatus(branch, moving, elementalStatus, lunarInfo),
  };
}

function attachHiddenSpirits(lines: HexagramLine[], palace: TrigramName, lunarInfo?: LunarInfo) {
  const presentSixKins = new Set(lines.map((line) => line.sixKin));
  const palaceElement = PALACE_ELEMENTS[palace];
  const palaceStemBranches = TRIGRAM_NAJIA[palace];
  const purePalaceLines = palaceStemBranches.map((stemBranch, index) => {
    const branch = stemBranch.slice(1);
    const branchElement = BRANCH_ELEMENTS[branch];
    return {
      index,
      sixKin: sixKinForElement(palaceElement, branchElement),
      stemBranch,
      branchElement,
      yinYang: TRIGRAMS[palace].lines[index],
    };
  });
  const missingPureLines = purePalaceLines.filter((line) => !presentSixKins.has(line.sixKin));
  if (missingPureLines.length === 0) return lines;

  return lines.map((line) => {
    const hiddenLine = missingPureLines.find((item) => item.index === line.index);
    if (!hiddenLine) return line;
    if (hiddenLine.sixKin === line.sixKin && hiddenLine.stemBranch === line.stemBranch) return line;
    const branch = hiddenLine.stemBranch.slice(1);
    const elementalStatus = lunarInfo ? calculateElementalStatus(hiddenLine.branchElement, lunarInfo) : undefined;
    return {
      ...line,
      hiddenSpirit: {
        sixKin: hiddenLine.sixKin,
        stemBranch: hiddenLine.stemBranch,
        branchElement: hiddenLine.branchElement,
        yinYang: (hiddenLine.yinYang ? 'yang' : 'yin') as HexagramLine['yinYang'],
        elementalStatus,
        specialStatus: calculateSpecialStatus(branch, false, elementalStatus, lunarInfo),
      },
    };
  });
}

function trigramFromPattern(pattern: boolean[]): TrigramName {
  const key = pattern.map((isYang) => (isYang ? '1' : '0')).join('');
  return (Object.entries(TRIGRAMS).find(([, info]) => info.code === key)?.[0] ?? '乾') as TrigramName;
}

function describeElementRelation(hexagram: Hexagram) {
  const movingCount = hexagram.movingLineIndexes.length;
  if (movingCount >= 3) {
    return '动爻较多，事态变化明显，宜顺势观察后续。';
  }
  if (movingCount === 0) {
    return '静爻为主，局势稳定，重点看日月建与用神。';
  }
  return '动静并见，宜结合世应和用神综合判断。';
}

type UseGodRule = {
  category: string;
  useGod: string;
  keywords: string[];
  reason: string;
  priority: number;
};

const USE_GOD_RULES: UseGodRule[] = [
  {
    category: '财物交易',
    useGod: '妻财',
    keywords: ['钱', '财', '收入', '工资', '奖金', '利润', '投资', '股票', '基金', '生意', '买卖', '交易', '货款', '欠款', '收款', '客户', '订单', '价格', '房租', '租金'],
    reason: '问财物、收益、交易、客户与可支配资源，六爻以妻财爻为用神。',
    priority: 90,
  },
  {
    category: '职位事业',
    useGod: '官鬼',
    keywords: ['工作', '事业', '职位', '岗位', '升职', '晋升', '领导', '老板', '面试', '录用', 'offer', '考公', '公务员', '事业编', '官司', '诉讼', '压力', '麻烦', '风险'],
    reason: '问职位、事业名分、权责压力、官非风险，六爻以官鬼爻为用神。',
    priority: 85,
  },
  {
    category: '考试文书',
    useGod: '父母',
    keywords: ['考试', '考研', '考证', '证书', '学历', '学校', '学习', '论文', '合同', '协议', '签证', '证件', '手续', '文件', '消息', '通知', '房子', '房产', '车', '票据'],
    reason: '问考试证书、合同文书、消息凭据、房车不动产，六爻以父母爻为用神。',
    priority: 80,
  },
  {
    category: '产出子女',
    useGod: '子孙',
    keywords: ['孩子', '子女', '怀孕', '生育', '宝宝', '宠物', '作品', '产品', '项目成果', '结果', '娱乐', '开心', '药', '治疗', '康复', '平安'],
    reason: '问子女、产出成果、医药疗愈、解忧避祸，六爻以子孙爻为用神。',
    priority: 78,
  },
  {
    category: '同辈竞争',
    useGod: '兄弟',
    keywords: ['朋友', '同事', '兄弟', '姐妹', '同学', '同行', '竞争', '竞品', '合伙', '合作伙伴', '团队', '对手', '借钱', '分财'],
    reason: '问同辈、朋友、竞争者、合伙分财，六爻以兄弟爻为用神。',
    priority: 75,
  },
  {
    category: '婚恋男问',
    useGod: '妻财',
    keywords: ['女朋友', '女生', '妻子', '老婆', '结婚', '婚姻', '感情', '恋爱', '复合', '相亲'],
    reason: '男问婚恋或以女性伴侣为对象，传统取妻财爻为用神。',
    priority: 88,
  },
  {
    category: '婚恋女问',
    useGod: '官鬼',
    keywords: ['男朋友', '男生', '丈夫', '老公', '结婚', '婚姻', '感情', '恋爱', '复合', '相亲'],
    reason: '女问婚恋或以男性伴侣为对象，传统取官鬼爻为用神。',
    priority: 88,
  },
];

function linePositionName(index: number) {
  return ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][index] ?? `${index + 1}爻`;
}

function scoreUseGodLine(line: HexagramLine, category: string, isHidden = false) {
  let score = isHidden ? -30 : 0;
  const reasons: string[] = [];

  if (line.moving) {
    score += 50;
    reasons.push('动爻主事情发动');
  }
  if (line.role === 'world') {
    score += 35;
    reasons.push('临世爻，贴近求测者');
  }
  if (line.role === 'response') {
    score += 25;
    reasons.push('临应爻，关涉对方或外部对象');
  }
  if (line.elementalStatus === '旺') {
    score += 20;
    reasons.push('得日月助而旺');
  } else if (line.elementalStatus === '相') {
    score += 12;
    reasons.push('得日月助而相');
  } else if (line.elementalStatus === '休' || line.elementalStatus === '囚' || line.elementalStatus === '死') {
    score -= 10;
  }
  if (line.specialStatus === '月破') {
    score -= 25;
    reasons.push('月破减力');
  } else if (line.specialStatus === '旬空') {
    score -= 15;
    reasons.push('旬空减力');
  } else if (line.specialStatus === '暗动') {
    score += 18;
    reasons.push('暗动可用');
  }
  if (category === '职位事业' || category === '考试文书') {
    if (line.index === 4) {
      score += 10;
      reasons.push('五爻主尊位结果');
    }
  }
  if (category === '财物交易' && line.role === 'world') {
    score += 10;
  }
  if ((category.includes('婚恋') || category === '同辈竞争') && line.role === 'response') {
    score += 10;
  }

  return { line, score, reasons };
}

function choosePrimaryUseGodLine(candidates: HexagramLine[], category: string, isHidden = false) {
  return candidates
    .map((line) => scoreUseGodLine(line, category, isHidden))
    .sort((a, b) => b.score - a.score || b.line.index - a.line.index)[0];
}

function scoreRelatedSpiritLine(line: HexagramLine, useGodLine?: HexagramLine, isHidden = false) {
  let score = isHidden ? -20 : 0;
  if (line.moving) score += 45;
  if (line.role === 'world') score += 20;
  if (line.role === 'response') score += 14;
  if (line.elementalStatus === '旺') score += 18;
  if (line.elementalStatus === '相') score += 10;
  if (line.specialStatus === '暗动') score += 16;
  if (line.specialStatus === '月破') score -= 25;
  if (line.specialStatus === '旬空') score -= 15;
  if (useGodLine && BRANCH_COMBINES[line.branch ?? ''] === useGodLine.branch) score += 8;
  if (useGodLine && BRANCH_OPPOSITIONS[line.branch ?? ''] === useGodLine.branch) score += 6;
  return score;
}

function chooseRelatedSpiritLine(hexagram: Hexagram, sixKin: string, useGodLine?: HexagramLine) {
  const visible = hexagram.lines
    .filter((line) => line.sixKin === sixKin)
    .map((line) => ({ line, isHidden: false, score: scoreRelatedSpiritLine(line, useGodLine) }));
  const hidden = visible.length
    ? []
    : hexagram.lines
        .filter((line) => line.hiddenSpirit?.sixKin === sixKin)
        .map((line) => ({ line, isHidden: true, score: scoreRelatedSpiritLine(line, useGodLine, true) }));
  return [...visible, ...hidden].sort((a, b) => b.score - a.score || b.line.index - a.line.index)[0];
}

function inferUseGod(question: string, hexagram: Hexagram) {
  const normalizedQuestion = question.trim().toLowerCase();
  const matchedRules = USE_GOD_RULES
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((keyword) => normalizedQuestion.includes(keyword.toLowerCase()));
      return { rule, matchedKeywords };
    })
    .filter((item) => item.matchedKeywords.length > 0)
    .sort((a, b) => b.rule.priority + b.matchedKeywords.length - (a.rule.priority + a.matchedKeywords.length));

  const selected = matchedRules[0];
  if (!selected) {
    const worldLine = hexagram.lines.find((line) => line.role === 'world');
    return {
      useGod: worldLine ? `${worldLine.sixKin}（世爻）` : '世爻',
      useGodReason: '问题未命中明确事项类别。六爻断未知或综合事项，先以世爻代表求测者和事情承载点，再结合应爻、动爻与日月分析。',
      useGodLineIndexes: worldLine ? [worldLine.index] : [],
      useGodHiddenLineIndexes: [],
      useGodIsHidden: false,
      questionCategory: '综合事项',
    };
  }

  const visibleCandidates = hexagram.lines.filter((line) => line.sixKin === selected.rule.useGod);
  const hiddenCandidates = visibleCandidates.length ? [] : hexagram.lines.filter((line) => line.hiddenSpirit?.sixKin === selected.rule.useGod);
  const primaryVisible = choosePrimaryUseGodLine(visibleCandidates, selected.rule.category);
  const primaryHidden = primaryVisible ? undefined : choosePrimaryUseGodLine(hiddenCandidates, selected.rule.category, true);
  const primary = primaryVisible ?? primaryHidden;
  const useGodLineIndexes = primaryVisible ? [primaryVisible.line.index] : [];
  const useGodHiddenLineIndexes = primaryHidden ? [primaryHidden.line.index] : [];
  const useGodIsHidden = Boolean(primaryHidden);
  const hasMultipleVisibleCandidates = visibleCandidates.length > 1;
  const hasMultipleHiddenCandidates = hiddenCandidates.length > 1;
  const primaryReasonText = primary?.reasons.length ? primary.reasons.join('，') : '综合动静、世应与旺衰较切题';
  const primaryReason = primary
    ? `${hasMultipleVisibleCandidates || hasMultipleHiddenCandidates ? `${primaryReasonText}，取${linePositionName(primary.line.index)}为主用神。` : ''}`
    : `本卦及伏神中未找到“${selected.rule.useGod}”，后续需以世应和相关动爻辅助判断。`;
  return {
    useGod: useGodIsHidden ? `${selected.rule.useGod}（伏）` : selected.rule.useGod,
    useGodReason: useGodIsHidden
      ? `${selected.rule.reason}本卦明现爻中不见“${selected.rule.useGod}”，故取本宫伏藏之${selected.rule.useGod}为用神。${primaryReason}`
      : `${selected.rule.reason}${primaryReason}`,
    useGodLineIndexes,
    useGodHiddenLineIndexes,
    useGodIsHidden,
    questionCategory: selected.rule.category,
  };
}

function supportingGodFor(useGod: string) {
  switch (useGod) {
    case '兄弟':
      return { original: '父母', enemy: '官鬼', hatred: '妻财' };
    case '子孙':
      return { original: '兄弟', enemy: '父母', hatred: '官鬼' };
    case '妻财':
      return { original: '子孙', enemy: '兄弟', hatred: '父母' };
    case '官鬼':
      return { original: '妻财', enemy: '子孙', hatred: '兄弟' };
    case '父母':
    default:
      return { original: '官鬼', enemy: '妻财', hatred: '子孙' };
  }
}

function lineIdentity(line: HexagramLine, isHidden = false) {
  const hiddenSpirit = isHidden ? line.hiddenSpirit : undefined;
  return {
    index: line.index,
    sixKin: hiddenSpirit?.sixKin ?? line.sixKin,
    stemBranch: hiddenSpirit?.stemBranch ?? line.stemBranch,
    branch: hiddenSpirit?.stemBranch.slice(1) ?? line.branch,
    element: hiddenSpirit?.branchElement ?? line.branchElement,
    elementalStatus: hiddenSpirit?.elementalStatus ?? line.elementalStatus,
    specialStatus: hiddenSpirit?.specialStatus ?? line.specialStatus,
    moving: isHidden ? false : line.moving,
    role: line.role,
  };
}

function spiritLineName(line: HexagramLine | undefined, isHidden = false, fallbackSixKin = '') {
  if (!line) return fallbackSixKin;
  const identity = lineIdentity(line, isHidden);
  const branchText = identity.branch && identity.element ? `${identity.branch}${identity.element}` : identity.stemBranch ?? '';
  return `${identity.sixKin}${branchText}${isHidden ? '（伏）' : ''}`;
}

function spiritLineFullName(line: HexagramLine | undefined, isHidden = false, fallbackSixKin = '') {
  if (!line) return fallbackSixKin;
  return `${linePositionName(line.index)}${spiritLineName(line, isHidden, fallbackSixKin)}`;
}

function changedLineFor(hexagram: Hexagram, line: HexagramLine) {
  return hexagram.changedLines[line.index];
}

function relationToMovingLines(target: ReturnType<typeof lineIdentity>, hexagram: Hexagram, targetTitle: string) {
  const movingLines = hexagram.lines.filter((line) => line.moving && line.index !== target.index);
  if (!movingLines.length) return '';
  return movingLines
    .map((line) => {
      const elementText = relationVerb(line.branchElement, target.element);
      const branchTexts = branchRelationText(line.branch, target.branch);
      const stage = keyChangShengText(target.element, line.branch);
      const extras = [...branchTexts, stage].filter(Boolean).join('、');
      return `${spiritLineFullName(line)}${elementText}${targetTitle}${extras ? `，兼见${extras}` : ''}`;
    })
    .join('；');
}

function relationToChangedSelf(targetLine: HexagramLine, hexagram: Hexagram) {
  if (!targetLine.moving) return '';
  const changedLine = changedLineFor(hexagram, targetLine);
  const elementText = relationVerb(changedLine.branchElement, targetLine.branchElement);
  const branchTexts = branchRelationText(changedLine.branch, targetLine.branch);
  const stage = keyChangShengText(targetLine.branchElement, changedLine.branch);
  const extras: string[] = [];
  if (changedLine.stemBranch === targetLine.stemBranch) extras.push('伏吟');
  if (changedLine.branch === targetLine.branch) extras.push('反吟');
  extras.push(...branchTexts, stage);
  if (targetLine.branch && changedLine.branch) {
    const advanceRegress = ADVANCE_REGRESS[targetLine.branch];
    if (advanceRegress?.advance === changedLine.branch) extras.push('化进神');
    if (advanceRegress?.regress === changedLine.branch) extras.push('化退神');
  }
  return `本爻发动化${spiritLineFullName(changedLine)}，变爻${elementText}本爻${extras.length ? `，见${extras.join('、')}` : ''}。`;
}

function relationToCalendar(target: ReturnType<typeof lineIdentity>, lunarInfo: LunarInfo, targetTitle: string) {
  const monthBranch = branchFromStemBranch(lunarInfo.monthStemBranch);
  const dayBranch = branchFromStemBranch(lunarInfo.dayStemBranch);
  const monthElement = branchElementFromStemBranch(lunarInfo.monthStemBranch);
  const dayElement = branchElementFromStemBranch(lunarInfo.dayStemBranch);
  const monthExtras = [...branchRelationText(monthBranch, target.branch), keyChangShengText(target.element, monthBranch)].filter(Boolean);
  const dayExtras = [...branchRelationText(dayBranch, target.branch), keyChangShengText(target.element, dayBranch)].filter(Boolean);
  const special = target.specialStatus ? `，并见${target.specialStatus}` : '';
  return `月建${lunarInfo.monthStemBranch}${relationVerb(monthElement, target.element)}${targetTitle}${monthExtras.length ? `，${monthExtras.join('、')}` : ''}；日辰${lunarInfo.dayStemBranch}${relationVerb(dayElement, target.element)}${targetTitle}${dayExtras.length ? `，${dayExtras.join('、')}` : ''}；综合为${target.elementalStatus ?? '休'}${special}。`;
}

function sanHeRelation(target: ReturnType<typeof lineIdentity>, hexagram: Hexagram, targetTitle: string) {
  const activeBranches = new Set(hexagram.lines.filter((line) => line.moving || line.role === 'world' || line.role === 'response').map((line) => line.branch).filter(Boolean));
  const groups = SAN_HE_GROUPS.filter((group) => group.branches.every((branch) => activeBranches.has(branch)));
  if (!groups.length) return '';
  return groups
    .map((group) => {
      const includesTarget = target.branch ? group.branches.includes(target.branch) : false;
      const relation = relationVerb(group.element, target.element);
      return `${group.branches.join('')}${group.element}局${includesTarget ? `包含${targetTitle}` : relation + targetTitle}`;
    })
    .join('；');
}

function spiritDetailFor(title: SpiritAnalysis['title'], line: HexagramLine | undefined, isHidden: boolean, hexagram: Hexagram, lunarInfo: LunarInfo) {
  if (!line) return '本卦未见该类六亲，暂以用神与世应为主。';
  const target = lineIdentity(line, isHidden);
  const parts = [
    relationToMovingLines(target, hexagram, title),
  ].filter(Boolean);
  if (title === '用神' && !isHidden) parts.push(relationToChangedSelf(line, hexagram));
  parts.push(relationToCalendar(target, lunarInfo, title));
  const sanHe = sanHeRelation(target, hexagram, title);
  if (sanHe) parts.push(sanHe);
  return parts.filter(Boolean).join('\n');
}

function buildSpiritAnalyses(useGodResult: ReturnType<typeof inferUseGod>, hexagram: Hexagram, lunarInfo: LunarInfo): SpiritAnalysis[] {
  const useGodSixKin = useGodResult.useGod.replace(/（.*?）|\(.*?\)/g, '');
  const useGodLine =
    hexagram.lines.find((line) => useGodResult.useGodLineIndexes.includes(line.index)) ??
    hexagram.lines.find((line) => useGodResult.useGodHiddenLineIndexes.includes(line.index));
  const useGodHidden = useGodResult.useGodIsHidden;
  const related = supportingGodFor(useGodSixKin);
  const originalSelected = chooseRelatedSpiritLine(hexagram, related.original, useGodLine);
  const enemySelected = chooseRelatedSpiritLine(hexagram, related.enemy, useGodLine);
  const hatredSelected = chooseRelatedSpiritLine(hexagram, related.hatred, useGodLine);
  const useGodName = spiritLineFullName(useGodLine, useGodHidden, useGodSixKin);
  const entries: Array<{ title: SpiritAnalysis['title']; sixKin: string; reason: string; selected?: ReturnType<typeof chooseRelatedSpiritLine> }> = [
    { title: '用神', sixKin: useGodSixKin, reason: useGodResult.useGodReason },
    { title: '原神', sixKin: related.original, reason: `原神为生用神之爻，${spiritLineFullName(originalSelected?.line, Boolean(originalSelected?.isHidden), related.original)}为${useGodName}之原神。`, selected: originalSelected },
    { title: '忌神', sixKin: related.enemy, reason: `忌神为克用神之爻，${spiritLineFullName(enemySelected?.line, Boolean(enemySelected?.isHidden), related.enemy)}克制${useGodName}。`, selected: enemySelected },
    { title: '仇神', sixKin: related.hatred, reason: `仇神为生忌神、间接损用神之爻，${spiritLineFullName(hatredSelected?.line, Boolean(hatredSelected?.isHidden), related.hatred)}生${spiritLineFullName(enemySelected?.line, Boolean(enemySelected?.isHidden), related.enemy)}。`, selected: hatredSelected },
  ];

  return entries.map((entry) => {
    const line = entry.title === '用神' ? useGodLine : entry.selected?.line;
    const isHidden = entry.title === '用神' ? useGodHidden : Boolean(entry.selected?.isHidden);
    const identity = line ? lineIdentity(line, isHidden) : undefined;
    return {
      title: entry.title,
      sixKin: entry.sixKin,
      displayName: spiritLineName(line, isHidden, entry.sixKin),
      positionName: line ? linePositionName(line.index) : undefined,
      lineIndex: line?.index,
      isHidden,
      color: identity?.element,
      reason: entry.reason,
      detail: spiritDetailFor(entry.title, line, isHidden, hexagram, lunarInfo),
    };
  });
}

export function generateHexagram(strengths: number[], lunarInfo?: LunarInfo): Hexagram {
  const linePattern = strengths.map((strength) => lineToYinYang(strength) === 'yang');
  const upperTrigram = trigramFromPattern(linePattern.slice(3, 6));
  const lowerTrigram = trigramFromPattern(linePattern.slice(0, 3));
  const code = linePattern
    .slice()
    .reverse()
    .map((isYang) => (isYang ? '1' : '0'))
    .join('');
  const palaceInfo = EIGHT_PALACES[code];
  const palace = palaceInfo.palace;
  const palaceElement = PALACE_ELEMENTS[palace];
  const lines = attachHiddenSpirits(
    strengths.map((strength, index) =>
      buildLine(index, strength, lowerTrigram, upperTrigram, palace, palaceInfo.world, palaceInfo.response, lunarInfo)
    ),
    palace,
    lunarInfo
  );
  const movingLineIndexes = lines.filter((line) => line.moving).map((line) => line.index);
  const changedStrengths = strengths.map((strength) => {
    if (strength === 6) return 7;
    if (strength === 9) return 8;
    return strength;
  });
  const changedPattern = changedStrengths.map((strength) => lineToYinYang(strength) === 'yang');
  const changedUpperTrigram = trigramFromPattern(changedPattern.slice(3, 6));
  const changedLowerTrigram = trigramFromPattern(changedPattern.slice(0, 3));
  const changedCode = changedPattern
    .slice()
    .reverse()
    .map((isYang) => (isYang ? '1' : '0'))
    .join('');
  const changedPalaceInfo = EIGHT_PALACES[changedCode];
  const changedPalace = changedPalaceInfo.palace;
  const changedPalaceElement = PALACE_ELEMENTS[changedPalace];
  const changedLines = changedStrengths.map((strength, index) => ({
    ...buildLine(index, strength, changedLowerTrigram, changedUpperTrigram, changedPalace, changedPalaceInfo.world, changedPalaceInfo.response, lunarInfo),
    moving: false,
  }));
  const name = HEXAGRAM_NAMES[code] ?? `${upperTrigram}${lowerTrigram}`;
  const changedName = HEXAGRAM_NAMES[changedCode] ?? `${changedUpperTrigram}${changedLowerTrigram}`;

  return {
    name,
    changedName,
    marks: hexagramMarks(name),
    changedMarks: hexagramMarks(changedName),
    upperTrigram,
    lowerTrigram,
    changedUpperTrigram,
    changedLowerTrigram,
    palace,
    palaceElement,
    changedPalace,
    changedPalaceElement,
    lines,
    changedLines,
    movingLineIndexes,
  };
}

function staticStrengthsFromMask(mask: number) {
  return Array.from({ length: 6 }, (_, index) => ((mask >> index) & 1 ? 7 : 8));
}

export function generateTestStrengths(kind: '月破' | '暗动', lunarInfo: LunarInfo) {
  for (let mask = 0; mask < 64; mask += 1) {
    const strengths = staticStrengthsFromMask(mask);
    const hexagram = generateHexagram(strengths, lunarInfo);
    if (hexagram.lines.some((line) => line.specialStatus === kind)) {
      return strengths;
    }
  }
  return kind === '月破' ? [7, 7, 7, 7, 7, 7] : [8, 8, 8, 8, 8, 8];
}

export function ensureTestSpecialStatus(hexagram: Hexagram, kind: '月破' | '暗动') {
  if (hexagram.lines.some((line) => line.specialStatus === kind)) {
    return hexagram;
  }
  const targetIndex = hexagram.lines.find((line) => (kind === '暗动' ? !line.moving : true))?.index ?? 0;
  return {
    ...hexagram,
    lines: hexagram.lines.map((line) => (line.index === targetIndex ? { ...line, specialStatus: kind } : line)),
    changedLines: hexagram.changedLines.map((line) => (line.index === targetIndex ? { ...line, specialStatus: kind } : line)),
  };
}

export function generateHiddenSpiritTestStrengths(lunarInfo: LunarInfo) {
  for (let mask = 0; mask < 64; mask += 1) {
    const strengths = staticStrengthsFromMask(mask);
    const hexagram = generateHexagram(strengths, lunarInfo);
    if ([...hexagram.lines, ...hexagram.changedLines].some((line) => line.hiddenSpirit)) {
      return strengths;
    }
  }
  return [7, 8, 7, 8, 7, 8];
}

export function ensureTestHiddenSpirit(hexagram: Hexagram, lunarInfo?: LunarInfo) {
  if ([...hexagram.lines, ...hexagram.changedLines].some((line) => line.hiddenSpirit)) {
    return hexagram;
  }
  const targetLine = hexagram.lines[0];
  const stemBranch = targetLine.stemBranch ?? '甲子';
  const branch = stemBranch.slice(1);
  const branchElement = targetLine.branchElement ?? '水';
  const elementalStatus = lunarInfo ? calculateElementalStatus(branchElement, lunarInfo) : targetLine.elementalStatus;
  const hiddenSpirit = {
    sixKin: '父母',
    stemBranch,
    branchElement,
    yinYang: targetLine.yinYang as HexagramLine['yinYang'],
    elementalStatus,
    specialStatus: calculateSpecialStatus(branch, false, elementalStatus, lunarInfo),
  };
  return {
    ...hexagram,
    lines: hexagram.lines.map((line) => (line.index === targetLine.index ? { ...line, hiddenSpirit } : line)),
  };
}

export function buildLunarInfo(question: string): LunarInfo {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const solar = Solar.fromYmdHms(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  );
  const lunar = solar.getLunar();
  const questionCategory = question.length > 12 ? '复杂事项' : '一般事项';
  const voidText = lunar.getDayXunKongExact2();
  const prevTerm = lunar.getPrevJie(true);
  const nextTerm = lunar.getNextJie(true);

  return {
    datetimeText: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${hour}:${minute}`,
    calendarRule: '北京时间；日辰按子时换日；月建按节气定月',
    dayStemBranch: lunar.getDayInGanZhiExact2(),
    monthStemBranch: lunar.getMonthInGanZhiExact(),
    yearStemBranch: lunar.getYearInGanZhiByLiChun(),
    dayXun: lunar.getDayXunExact2(),
    voidBranches: voidText.split(''),
    prevSolarTerm: `${prevTerm.getName()} ${prevTerm.getSolar().toYmdHms()}`,
    nextSolarTerm: `${nextTerm.getName()} ${nextTerm.getSolar().toYmdHms()}`,
    sixSpirits: SIX_SPIRITS,
    questionCategory,
  };
}

export function analyzeHexagram(question: string, hexagram: Hexagram, lunarInfo: LunarInfo): AnalysisResult {
  const useGodResult = inferUseGod(question, hexagram);
  const useGod = useGodResult.useGod;
  const spiritAnalyses = buildSpiritAnalyses(useGodResult, hexagram, lunarInfo);
  const strength = hexagram.movingLineIndexes.length >= 3 ? '卦动较强，宜先看变爻。' : '卦势中性，重点看日月与用神。';
  const relation = `日建 ${lunarInfo.dayStemBranch}、月建 ${lunarInfo.monthStemBranch} 对卦象形成基础约束。`;
  const sanHe = hexagram.movingLineIndexes.length > 1 ? '存在合力倾向，注意三合与连动。' : '三合局未显著成势。';
  const flyingHidden = hexagram.lines.some((line) => line.hiddenSpirit) ? '伏神可用，飞神需与本爻同看。' : '本卦伏神信息较弱。';
  const progression = hexagram.movingLineIndexes.some((index) => index >= 3) ? '上爻动，后势变化更值得留意。' : '下爻动较多，事情推进偏早期。';

  const items = [
    { title: '用神', value: useGod, detail: '根据问事词自动选取主要观察点。' },
    { title: '旺衰', value: '中等', detail: '结合日月建和动爻数量给出初评。' },
    { title: '生克冲合', value: '需综合判断', detail: relation },
    { title: '三合局', value: '待观察', detail: sanHe },
    { title: '飞伏神', value: '可参考', detail: flyingHidden },
    { title: '进退神', value: '初步判断', detail: progression },
  ];

  return {
    useGod,
    useGodReason: useGodResult.useGodReason,
    useGodLineIndexes: useGodResult.useGodLineIndexes,
    useGodHiddenLineIndexes: useGodResult.useGodHiddenLineIndexes,
    useGodIsHidden: useGodResult.useGodIsHidden,
    spiritAnalyses,
    questionCategory: useGodResult.questionCategory,
    strength,
    relation,
    sanHe,
    flyingHidden,
    progression,
    items,
    summary: describeElementRelation(hexagram),
  };
}

export function createAiPrompt(question: string, hexagram: Hexagram, analysis: AnalysisResult, lunarInfo: LunarInfo) {
  return [
    `问题：${question}`,
    `卦名：${hexagram.name}`,
    `起卦时间：${lunarInfo.datetimeText}`,
    `初步分析：${analysis.summary}`,
    `请基于六爻卦象做简洁解读，给出结论、依据、建议。`,
  ].join('\n');
}
