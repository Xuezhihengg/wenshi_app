import { Solar } from 'lunar-typescript';
import { AnalysisResult, Hexagram, HexagramLine, LunarInfo, SixSpirit, SpiritAnalysis, TrigramName, UnionAnalysis, UnionLineRef, UnionPattern } from '../domain/types';

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
const SAN_HE_PAIR_NAMES: Record<string, string> = {
  申子: '申子半合水',
  子辰: '子辰半合水',
  亥卯: '亥卯半合木',
  卯未: '卯未半合木',
  寅午: '寅午半合火',
  午戌: '午戌半合火',
  巳酉: '巳酉半合金',
  酉丑: '酉丑半合金',
};
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
    category: '婚恋男问',
    useGod: '妻财',
    keywords: [
      '女朋友', '女友', '女生', '女孩', '女方', '女人', '妻子', '老婆', '太太', '内人', '媳妇', '未婚妻',
      '相亲女', '取妻', '娶妻', '娶她', '嫁给我', '她爱我', '她喜欢我', '她回我', '她联系我',
      '追她', '追求她', '追到她', '挽回她', '让她回心', '她是真心',
    ],
    reason: '男问婚恋或以女性伴侣为对象，传统取妻财爻为用神。',
    priority: 95,
  },
  {
    category: '婚恋女问',
    useGod: '官鬼',
    keywords: [
      '男朋友', '男友', '男生', '男孩', '男方', '男人', '丈夫', '老公', '先生', '夫君', '未婚夫',
      '相亲男', '嫁给他', '嫁人', '出嫁', '他爱我', '他喜欢我', '他回我', '他联系我',
      '追他', '追求他', '挽回他', '让他回心', '他是真心', 'ta是真', '他是不是',
    ],
    reason: '女问婚恋或以男性伴侣为对象，传统取官鬼爻为用神。',
    priority: 95,
  },
  {
    category: '婚恋通用',
    useGod: '妻财',
    keywords: [
      '感情', '恋爱', '复合', '相亲', '约会', '暧昧', '表白', '告白', '心意', '心动', '动心',
      '正缘', '姻缘', '缘分', '桃花', '红鸾', '脱单', '单身', '分手', '挽回', '断联', '冷战',
      '婚姻', '结婚', '婚事', '订婚', '订亲', '订下', '完婚', '迎娶', '出嫁', '终成眷属', '执子之手',
      '蓝颜', '红颜', '前任', '前男友', '前女友', '老情人', '初恋',
      '伴侣', '另一半', '对象', '心上人', '心仪', '喜欢的人', '爱的人', '所爱', '心动的人',
      '在意我', '想我', '念我', '记得我', '联系我', '回我消息', '主动找我',
      '会回我', '回我吗', '今晚他', '今晚她', '今晚ta', '会回复', '会回话',
      '见面', '相见', '约见', '约出来',
      '第三者', '小三', '插足', '出轨', '背叛', '劈腿', '暧昧关系', '婚外情',
      '异地', '异地恋', '远距离',
      '心里', '心里有', '心里没', '心里到底', '心里在想', 'ta心里', '他心里', '她心里',
      '在想什么', '心里想', '心思', '想法', '到底有没有',
      '对我', '对我有', '有意思', '真心', '走心', '走到最后', '修成正果', '成正果',
      '被珍惜', '被冷落', '被忽视', '被接纳', '被认可', '被喜欢', '被爱',
      '配不配', '合不合', '合得来', '合不来', '性格', '性格合', '性格不合',
      '命中的人', '命定', '注定', '命里', '宿命',
      '放下', '放不下', '忘不了', '忘不掉', '念念不忘', '旧情',
      '再见面', '再相遇', '再相见', '能等', '等他', '等她', '等到', '等回来',
      '会回头', '会回来', '回心', '回心转意',
      '更进一步', '在一起', '走到一起',
      '家人接纳', '父母同意', '家里同意', '门当户对',
      '婚后', '夫妻', '夫妇',
    ],
    reason: '问感情、姻缘、桃花等情感事项，男以妻财、女以官鬼；默认先取妻财再综合判断。',
    priority: 88,
  },
  {
    category: '财物交易',
    useGod: '妻财',
    keywords: [
      '钱', '钱财', '财', '财运', '财气', '钱包', '钱袋', '现金',
      '收入', '工资', '薪水', '薪资', '薪酬', '奖金', '提成', '年终奖', '红包', '分红', '分润', '分账',
      '利润', '盈利', '回款', '入账', '到账', '出账', '入款', '收款',
      '投资', '理财', '股票', '股市', '基金', '债券', '期货', '外汇', '黄金', '白银', '虚拟币', '数字货币', '比特币',
      '存款', '存钱', '储蓄', '攒钱', '积蓄', '余额',
      '生意', '买卖', '交易', '订单', '客户', '订金', '尾款', '货款', '欠款', '账款', '应收', '应付',
      '大单', '订货', '签单', '成单',
      '欠债', '还债', '借钱', '借款', '贷款', '房贷', '车贷', '信用卡',
      '价格', '议价', '谈价', '砍价', '出价',
      '房租', '租金', '租赁', '租约',
      '财库', '破财', '漏财',
    ],
    reason: '问财物、收益、交易、客户与可支配资源，六爻以妻财爻为用神。',
    priority: 92,
  },
  {
    category: '职位事业',
    useGod: '官鬼',
    keywords: [
      '工作', '职业', '事业', '事业线', '前程', '前途', '职位', '职务', '岗位', '职级',
      '升职', '晋升', '提拔', '调岗', '调任', '外派', '轮岗',
      '领导', '老板', '上司', '老总', '总监', '主管', '上级',
      '面试', '招聘', '录用', '入职', 'offer', '聘书', '聘用', '聘任',
      '考公', '公务员', '事业编', '编制', '体制', '体制内', '考编',
      '官司', '诉讼', '法院', '起诉', '应诉', '官非', '案件', '判决',
      '权责', '名分', '名声', '名誉', '声誉',
      '压力', '加班', '内卷', '裁员', '降薪', '降职', '辞退', '开除', '炒鱿鱼',
      '风险', '隐患', '坏事', '麻烦事', '是非', '小人作祟',
      '考核', '绩效', 'kpi', '述职', '汇报', '答辩', '面谈',
      '比赛', '竞赛', '名次', '获奖', '冠军', '入选', '中标', '中签',
      '项目', '这个项目', '项目能', '项目不',
      '创业', '创办', '开公司', '当老板',
      '合作', '合作能', '合作伙伴', '联手', '联营',
      '行业', '行业前景', '产业', '赛道', '风口',
      '跳槽', '换工作', '辞职', '出路', '另谋', '出走',
      '接单', '接活', '揽客', '拓展', '开拓', '新市场', '市场', '客源', '渠道',
      '资金链', '现金流', '回笼', '断流',
      '楼市', '股市', '行情', '涨', '跌', '看涨', '看跌',
      '涨薪', '加薪', '调薪',
    ],
    reason: '问职位、事业名分、权责压力、官非风险、竞争名次、项目创业，六爻以官鬼爻为用神。',
    priority: 86,
  },
  {
    category: '考试文书',
    useGod: '父母',
    keywords: [
      '考试', '考研', '考博', '考公', '考编', '考证', '考级',
      '高考', '中考', '会考', '期末', '期中', '月考', '统考', '联考',
      '证书', '证件', '资格证', '学历', '文凭', '毕业证', '学位证',
      '学校', '学业', '学习', '成绩', '分数', '排名', '名次',
      '论文', '毕业论文', '答辩', '查重', '盲审',
      '专业', '志愿', '志愿填报', '报考', '调剂', '推免', '保研', '夏令营',
      '雅思', '托福', '六级', '四级', 'gre', 'gmat',
      '合同', '协议', '签证', '签约', '签字', '盖章', '公证',
      '证件', '手续', '文件', '材料', '资料', '档案', '记录',
      '消息', '通知', '回执', '回复', '批复', '审批',
      '房子', '房产', '不动产', '产证', '过户',
      '车子', '车辆', '车票', '机票', '票据', '发票',
      '学区', '入学', '录取', '录用通知', '通知书',
      '出国', '留学', '深造', '进修',
      '老师', '导师', '老师家', '师父',
      '培训', '辅导', '补习', '课程',
      '复习', '复习方向', '备考', '冲刺',
      '英语', '英语考', '英语成绩', '小语种',
      '奖学金', '助学金', '入学奖',
      '专升本', '专升本能',
    ],
    reason: '问考试证书、合同文书、消息凭据、房车不动产、师长指导，六爻以父母爻为用神。',
    priority: 82,
  },
  {
    category: '产出子女',
    useGod: '子孙',
    keywords: [
      '孩子', '子女', '儿子', '女儿', '宝宝', '小孩', '幼子',
      '怀孕', '生育', '生孩子', '生产', '分娩', '坐月子', '备孕', '试管', '辅助生殖', '冻卵', '取卵',
      '宠物', '猫咪', '狗狗', '小猫', '小狗', '爱宠', '毛孩子',
      '作品', '产品', '出品', '上线', '发布',
      '兴趣', '爱好', '才艺', '娱乐', '休闲', '解忧', '开心',
      '药', '药物', '疗程', '理疗', '康复', '调养', '调理', '保养', '养生',
      '治疗', '诊疗', '中医', '西医', '中药', '西药', '复诊', '康健', '痊愈', '好转', '减轻',
      '保佑', '化解', '逢凶化吉', '消灾', '解灾', '解煞', '化煞',
      '平安', '安康',
    ],
    reason: '问子女、产出成果、医药疗愈、宠物儿孙、解忧避祸，六爻以子孙爻为用神。',
    priority: 80,
  },
  {
    category: '疾病灾患',
    useGod: '官鬼',
    keywords: [
      '病', '生病', '疾病', '病情', '病灶', '病因', '症状', '不适', '难受',
      '癌', '肿瘤', '结节', '炎症', '感染', '术后', '动手术', '做手术', '住院', '住院部',
      '检查', '体检', '复查', '复检', '检测', '化验', '指标', '诊断', '确诊', '排除',
      '手术', '开刀', '麻醉', '插管',
      '失眠', '焦虑', '抑郁', '心理', '精神', '神经', '失控',
      '意外', '事故', '车祸', '受伤', '骨折', '扭伤', '烫伤', '摔伤',
      '灾', '灾祸', '灾难', '凶险', '险境',
      '医生', '主治', '大夫', '医师',
      '转院', '换医院', '换医生', '换大夫',
      '偏方', '土方', '民间方',
      '减肥', '瘦身', '塑形',
    ],
    reason: '问疾病本身、灾祸、意外凶险，六爻以官鬼爻为病灾之主，结合子孙看医药救助。',
    priority: 84,
  },
  {
    category: '同辈竞争',
    useGod: '兄弟',
    keywords: [
      '朋友', '友谊', '挚友', '老友', '故交', '损友', '酒肉朋友',
      '同事', '同僚', '同行', '同伴', '搭档',
      '兄弟', '姐妹', '兄', '弟', '姐', '妹', '哥们', '姐们',
      '同学', '室友', '舍友',
      '竞争', '竞争对手', '对手', '敌手', '对家', '同业', '同业竞争', '竞品',
      '合伙', '合作伙伴', '合伙人', '团队', '战友', '伙伴',
      '借钱给', '借给', '借出', '借出去', '分财', '分钱',
      '小人', '是非', '口舌',
      '贵人', '贵人相助', '助力',
      '家人', '父母关系', '婆媳', '亲戚', '邻里', '邻居', '族亲',
      '聚会', '聚餐', '饭局', '圈子', '社交', '人脉', '人际', '人际关系',
      '矛盾', '冲突', '吵架', '争执', '翻脸', '反目',
      '误会', '误解', '隔阂',
      '理解', '不理解', '理解我', '理解他',
      '深交', '相处', '处好', '处不好',
      '关系', '关系能', '关系会', '关系处',
    ],
    reason: '问同辈、朋友、家人、亲戚邻里、聚会人脉、竞争合伙，六爻以兄弟爻为用神。',
    priority: 75,
  },
  {
    category: '行止迁动',
    useGod: '父母',
    keywords: [
      '出行', '远行', '出差', '出门', '外出', '旅行', '旅游', '出游',
      '搬家', '乔迁', '迁居', '迁址', '租房', '买房', '看房', '换房', '装修', '动土',
      '航班', '飞机', '车票', '高铁', '火车', '邮轮', '航海', '航行', '出海', '远航',
      '快递', '包裹', '送达', '物流', '寄件',
      '丢失', '失物', '遗失', '丢东西', '东西丢了', '钱包丢', '手机丢', '物品不见',
    ],
    reason: '问出行迁动、住房车船、失物寻物，传统多以父母爻为载体凭据看其安否得失。',
    priority: 70,
  },
  {
    category: '尊亲长辈',
    useGod: '父母',
    keywords: [
      '父母健康', '父母身体', '爸爸', '妈妈', '父亲', '母亲', '爹', '娘',
      '爷爷', '奶奶', '外公', '外婆', '姥爷', '姥姥',
      '老人家', '长辈', '尊长',
      '祖上', '祖宗', '先人',
    ],
    reason: '问父母长辈、尊亲祖上的健康安否，六爻以父母爻为用神。',
    priority: 78,
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

function spiritEvidenceTags(line: HexagramLine | undefined, isHidden: boolean) {
  if (!line) return ['未现'];
  const identity = lineIdentity(line, isHidden);
  return [
    isHidden ? '伏神' : '',
    identity.moving ? '动爻' : '',
    identity.role === 'world' ? '临世' : identity.role === 'response' ? '临应' : '',
    identity.elementalStatus ?? '',
    identity.specialStatus ?? '',
  ].filter(Boolean);
}

function spiritStrengthLabel(line: HexagramLine | undefined, isHidden: boolean) {
  if (!line) return '未现';
  const identity = lineIdentity(line, isHidden);
  if (identity.specialStatus === '月破') return '空破';
  if (identity.specialStatus === '旬空') return '受空';
  if (isHidden) return '伏藏待引';
  if (identity.specialStatus === '暗动') return '暗中可用';
  if (identity.elementalStatus === '旺' || identity.elementalStatus === '相') return '有力';
  if (identity.elementalStatus === '囚' || identity.elementalStatus === '死') return '受制';
  return '偏弱';
}

function spiritVerdictFor(title: SpiritAnalysis['title'], line: HexagramLine | undefined, isHidden: boolean) {
  if (!line) {
    if (title === '用神') return '用神未显，事情不宜只看一处，需借世应与动爻综合判断。';
    return `${title}未明现，对局势影响暂弱。`;
  }
  const identity = lineIdentity(line, isHidden);
  const name = spiritLineFullName(line, isHidden);
  const strength = spiritStrengthLabel(line, isHidden);
  if (title === '用神') {
    if (strength === '有力' || strength === '暗中可用') return `${name}为事情核心，当前${strength}，事情有可推进之处。`;
    if (strength === '空破' || strength === '受空') return `${name}为事情核心，但见${identity.specialStatus}，当下不稳，宜防落空或反复。`;
    if (strength === '伏藏待引') return `${name}为事情核心但伏藏未露，需等待引动或外部条件成形。`;
    return `${name}为事情核心，当前${strength}，推进需借助原神或动爻。`;
  }
  if (title === '原神') {
    if (strength === '有力' || strength === '暗中可用') return `${name}能生扶用神，助力较实。`;
    if (strength === '伏藏待引') return `${name}为助力但伏藏，资源未完全到位。`;
    return `${name}虽为助力，但当前${strength}，扶助有限。`;
  }
  if (title === '忌神') {
    if (strength === '有力' || strength === '暗中可用') return `${name}克制用神，是当前主要阻力。`;
    if (strength === '空破' || strength === '受空') return `${name}虽为阻力但已受损，压力有所减轻。`;
    return `${name}为阻力来源，但当前${strength}，杀伤力有限。`;
  }
  if (strength === '有力' || strength === '暗中可用') return `${name}生助忌神，会间接加重阻力。`;
  return `${name}为仇神但当前${strength}，间接影响有限。`;
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
      verdict: spiritVerdictFor(entry.title, line, isHidden),
      strengthLabel: spiritStrengthLabel(line, isHidden),
      evidenceTags: spiritEvidenceTags(line, isHidden),
      reason: entry.reason,
      detail: spiritDetailFor(entry.title, line, isHidden, hexagram, lunarInfo),
    };
  });
}

function unionLineRef(line: HexagramLine): UnionLineRef | undefined {
  if (!line.branch || !line.branchElement) return undefined;
  return {
    index: line.index,
    positionName: linePositionName(line.index),
    branch: line.branch,
    element: line.branchElement,
    sixKin: line.sixKin,
    moving: line.moving,
    role: line.role,
    specialStatus: line.specialStatus,
    source: 'line',
  };
}

function calendarUnionRef(source: 'day' | 'month', stemBranch: string): UnionLineRef {
  const branch = branchFromStemBranch(stemBranch);
  return {
    index: source === 'day' ? -1 : -2,
    positionName: source === 'day' ? '日辰' : '月建',
    branch,
    element: BRANCH_ELEMENTS[branch] ?? '',
    sixKin: source === 'day' ? '日辰' : '月建',
    moving: false,
    role: 'normal',
    source,
  };
}

function unionRefLabel(ref: UnionLineRef) {
  if (ref.source !== 'line') return `${ref.positionName}${ref.branch}${ref.element}`;
  const role = ref.role === 'world' ? '临世' : ref.role === 'response' ? '临应' : '';
  const moving = ref.moving ? '动' : '';
  return `${ref.positionName}${ref.sixKin}${ref.branch}${ref.element}${role || moving ? `（${[role, moving].filter(Boolean).join('、')}）` : ''}`;
}

function unionRefWeight(ref: UnionLineRef, useGodLineIndexes: number[]) {
  let weight = ref.source === 'line' ? 20 : 6;
  if (useGodLineIndexes.includes(ref.index)) weight += 28;
  if (ref.moving) weight += 18;
  if (ref.role === 'world') weight += 12;
  if (ref.role === 'response') weight += 10;
  if (ref.specialStatus === '暗动') weight += 8;
  if (ref.specialStatus === '旬空') weight -= 10;
  if (ref.specialStatus === '月破') weight -= 16;
  if (ref.source === 'month') weight += 8;
  if (ref.source === 'day') weight += 7;
  return weight;
}

function bestUnionRef(branch: string, refs: UnionLineRef[], useGodLineIndexes: number[]) {
  return refs
    .filter((ref) => ref.branch === branch)
    .sort((a, b) => unionRefWeight(b, useGodLineIndexes) - unionRefWeight(a, useGodLineIndexes))[0];
}

function unionRelationToUseGod(element: string | undefined, useGodElement: string | undefined) {
  if (!element || !useGodElement) return '与用神关系不明';
  const verb = relationVerb(element, useGodElement);
  if (verb === '同气') return '与用神同气，增强同类力量';
  if (verb === '生') return '生扶用神，对事情有助';
  if (verb === '克') return '克制用神，形成主要压力';
  if (verb === '泄') return '泄用神之气，事情易被消耗';
  if (verb === '受克') return '受用神所制，阻力可被约束';
  return '与用神关系不明';
}

function unionImpactText(kind: UnionPattern['kind'], status: UnionPattern['status'], relationToUseGod: string) {
  if (kind === '六冲') return relationToUseGod.includes('用神') ? '冲动用神相关位置，事情更易出现变动、分离或反复。' : '冲象主散，提示结构中存在对立和打断。';
  if (kind === '六合') return '六合偏向牵连、绑定与缓和，吉则成其事，凶则拖其身。';
  if (status === '成势') return `${relationToUseGod}；合局已经具备较强牵引力，会放大该五行所代表的方向。`;
  if (status === '待引') return `${relationToUseGod}；半合或由日月补局，已有趋势但仍需外部条件引动。`;
  if (status === '冲破') return `${relationToUseGod}；虽见合意，但被冲、空、破削弱，难以稳定成势。`;
  return relationToUseGod;
}

function unionPatternStatus(weakPoints: string[], completed: boolean, activeCount: number): UnionPattern['status'] {
  if (weakPoints.some((item) => item.includes('冲') || item.includes('月破'))) return '冲破';
  if (completed && activeCount > 0) return '成势';
  if (completed || activeCount > 0) return '待引';
  return '提示';
}

function unionStatusRank(status: UnionPattern['status']) {
  if (status === '成势') return 50;
  if (status === '冲破') return 44;
  if (status === '合住') return 38;
  if (status === '待引') return 30;
  return 12;
}

function unionPatternRank(pattern: UnionPattern, useGodLineIndexes: number[]) {
  const useGodWeight = pattern.participants.some((participant) => useGodLineIndexes.includes(participant.index)) ? 20 : 0;
  const activeWeight = pattern.participants.filter((participant) => participant.moving || participant.role !== 'normal' || participant.source !== 'line').length * 4;
  const kindWeight = pattern.kind === '三合' ? 12 : pattern.kind === '半合' ? 6 : pattern.kind === '六合' ? 5 : pattern.kind === '六冲' ? 8 : 0;
  return unionStatusRank(pattern.status) + useGodWeight + activeWeight + kindWeight;
}

function analyzeUnions(hexagram: Hexagram, lunarInfo: LunarInfo, useGodResult: ReturnType<typeof inferUseGod>): UnionAnalysis {
  const lineRefs = hexagram.lines.map(unionLineRef).filter((ref): ref is UnionLineRef => Boolean(ref));
  const calendarRefs = [calendarUnionRef('month', lunarInfo.monthStemBranch), calendarUnionRef('day', lunarInfo.dayStemBranch)];
  const allRefs = [...lineRefs, ...calendarRefs];
  const useGodLineIndexes = [...useGodResult.useGodLineIndexes, ...useGodResult.useGodHiddenLineIndexes];
  const useGodLine = hexagram.lines.find((line) => useGodLineIndexes.includes(line.index));
  const useGodElement = useGodResult.useGodIsHidden ? useGodLine?.hiddenSpirit?.branchElement : useGodLine?.branchElement;
  const activeLineBranches = new Set(lineRefs.filter((ref) => ref.moving || ref.role === 'world' || ref.role === 'response' || useGodLineIndexes.includes(ref.index) || ref.specialStatus === '暗动').map((ref) => ref.branch));
  const lineBranches = new Set(lineRefs.map((ref) => ref.branch));
  const patterns: UnionPattern[] = [];

  SAN_HE_GROUPS.forEach((group) => {
    const participantRefs = group.branches
      .map((branch) => bestUnionRef(branch, allRefs, useGodLineIndexes))
      .filter((ref): ref is UnionLineRef => Boolean(ref));
    const lineCount = group.branches.filter((branch) => lineBranches.has(branch)).length;
    const activeCount = group.branches.filter((branch) => activeLineBranches.has(branch)).length;
    const completed = lineCount === 3;
    const calendarCompleted = completed && lineCount < 3;
    const hasPair = group.branches
      .slice(0, 2)
      .some((_, index) => {
        const pair = group.branches.slice(index, index + 2);
        return pair.length === 2 && pair.every((branch) => lineBranches.has(branch) || activeLineBranches.has(branch));
      });
    if (!completed && lineCount < 2 && !hasPair) return;
    const weakPoints = participantRefs
      .flatMap((ref) => {
        const points: string[] = [];
        if (ref.specialStatus === '月破') points.push(`${unionRefLabel(ref)}月破，合力不稳`);
        if (ref.specialStatus === '旬空') points.push(`${unionRefLabel(ref)}旬空，合意暂空`);
        const opposed = participantRefs.find((other) => BRANCH_OPPOSITIONS[ref.branch] === other.branch);
        if (opposed) points.push(`${ref.branch}${opposed.branch}相冲，局中自带破绽`);
        return points;
      })
      .filter((item, index, array) => array.indexOf(item) === index);
    const status = unionPatternStatus(weakPoints, completed, activeCount);
    const kind: UnionPattern['kind'] = completed ? '三合' : '半合';
    const relationToUseGod = unionRelationToUseGod(group.element, useGodElement);
    const name = completed ? `${group.branches.join('')}${group.element}局` : SAN_HE_PAIR_NAMES[group.branches.filter((branch) => lineBranches.has(branch)).join('')] ?? `${group.branches.filter((branch) => lineBranches.has(branch)).join('') || group.branches.join('') }半合${group.element}`;
    const evidence = [
      completed ? `三支${group.branches.join('、')}齐备${calendarCompleted ? '，其中由日月补足' : ''}` : `本卦已见${lineCount}支，属于半合或合意待引`,
      activeCount ? `${activeCount}支参与动爻、世应或用神，合力可被事情触发` : '未直接临动爻、世应或用神，合力偏静',
      relationToUseGod,
    ];
    patterns.push({
      id: `sanhe-${group.branches.join('')}`,
      kind,
      name,
      element: group.element,
      status,
      verdict: status === '成势' ? `${name}成势` : status === '冲破' ? `${name}合而不稳` : `${name}待引`,
      impact: unionImpactText(kind, status, relationToUseGod),
      relationToUseGod,
      participants: participantRefs,
      evidence,
      weakPoints,
    });
  });

  lineRefs.forEach((ref) => {
    const targetBranch = BRANCH_COMBINES[ref.branch];
    if (!targetBranch || ref.branch > targetBranch) return;
    const target = bestUnionRef(targetBranch, allRefs, useGodLineIndexes);
    if (!target) return;
    const participants = [ref, target];
    const relationToUseGod = unionRelationToUseGod(ref.element, useGodElement);
    const weakPoints = participants.flatMap((item) => item.specialStatus === '旬空' || item.specialStatus === '月破' ? [`${unionRefLabel(item)}${item.specialStatus}，六合不实`] : []);
    const activeCount = participants.filter((item) => item.moving || item.role !== 'normal' || useGodLineIndexes.includes(item.index) || item.source !== 'line').length;
    patterns.push({
      id: `liuhe-${ref.branch}${target.branch}-${ref.index}-${target.index}`,
      kind: '六合',
      name: `${ref.branch}${target.branch}六合`,
      element: ref.element,
      status: weakPoints.length ? '冲破' : '合住',
      verdict: weakPoints.length ? `${ref.branch}${target.branch}合而不实` : `${ref.branch}${target.branch}相合`,
      impact: unionImpactText('六合', weakPoints.length ? '冲破' : '合住', relationToUseGod),
      relationToUseGod,
      participants,
      evidence: [`${unionRefLabel(ref)}与${unionRefLabel(target)}六合`, activeCount ? '至少一方临动、世应、用神或日月，牵连感较强' : '双方偏静，更多体现背景牵连'],
      weakPoints,
    });
  });

  lineRefs.forEach((ref) => {
    const targetBranch = BRANCH_OPPOSITIONS[ref.branch];
    if (!targetBranch || ref.branch > targetBranch) return;
    const target = bestUnionRef(targetBranch, allRefs, useGodLineIndexes);
    if (!target) return;
    const participants = [ref, target];
    const includesUseGod = participants.some((item) => useGodLineIndexes.includes(item.index));
    patterns.push({
      id: `liuchong-${ref.branch}${target.branch}-${ref.index}-${target.index}`,
      kind: '六冲',
      name: `${ref.branch}${target.branch}相冲`,
      status: '冲破',
      verdict: includesUseGod ? `${ref.branch}${target.branch}冲动用神` : `${ref.branch}${target.branch}冲动结构`,
      impact: unionImpactText('六冲', '冲破', includesUseGod ? '涉及用神' : '未直接涉及用神'),
      relationToUseGod: includesUseGod ? '涉及用神，需重点观察' : '未直接涉及用神',
      participants,
      evidence: [`${unionRefLabel(ref)}与${unionRefLabel(target)}六冲`, includesUseGod ? '冲象触及用神，事情波动更明显' : '冲象在旁支出现，作为结构性扰动参考'],
      weakPoints: ['冲主动、主散、主反复，会削弱稳定合局'],
    });
  });

  if (hexagram.marks?.includes('六合')) {
    patterns.push({
      id: 'mark-liuhe',
      kind: '卦象',
      name: '本卦六合',
      status: '提示',
      verdict: '卦体见六合象',
      impact: '六合卦体主牵连、和合、黏着，需结合用神旺衰判断吉凶。',
      relationToUseGod: '属于卦体背景，不单独判定生克用神',
      participants: [],
      evidence: [`${hexagram.name}列入六合卦`],
      weakPoints: [],
    });
  }
  if (hexagram.marks?.includes('六冲')) {
    patterns.push({
      id: 'mark-liuchong',
      kind: '卦象',
      name: '本卦六冲',
      status: '提示',
      verdict: '卦体见六冲象',
      impact: '六冲卦体主变动、分散、难久，若用神无力则更怕反复。',
      relationToUseGod: '属于卦体背景，不单独判定生克用神',
      participants: [],
      evidence: [`${hexagram.name}列入六冲卦`],
      weakPoints: ['六冲背景会削弱合局稳定性'],
    });
  }

  const sortedPatterns = patterns.sort((a, b) => unionPatternRank(b, useGodLineIndexes) - unionPatternRank(a, useGodLineIndexes));
  const topPattern = sortedPatterns[0];
  const formedSanHePatterns = sortedPatterns.filter((pattern) => pattern.kind === '三合' && pattern.status === '成势');
  const dominantElement = sortedPatterns.find((pattern) => pattern.element)?.element;
  const verdict = formedSanHePatterns.length > 1
    ? '多重合局成势'
    : topPattern
    ? topPattern.status === '成势'
      ? '合局成势'
      : topPattern.status === '冲破'
        ? '合冲并见'
        : topPattern.status === '合住'
          ? '六合牵连'
          : '合意待引'
    : '未见明显合局';
  const summary = formedSanHePatterns.length > 1
    ? `本卦同时见${formedSanHePatterns.length}个三合局成势：${formedSanHePatterns.map((pattern) => pattern.name).join('、')}。需分别看其五行与用神的生克关系，不宜只取一局。`
    : topPattern
    ? `${topPattern.verdict}，${topPattern.impact}`
    : '本卦未见足以成势的三合、六合或关键六冲，合局部分以日月、用神和动爻为辅证。';
  return {
    verdict,
    summary,
    dominantElement,
    patterns: sortedPatterns,
    rules: [
      '三合三支齐备，且动爻、世应、用神或日月参与时，才判为成势。',
      '只见两支按半合处理，不直接等同成局。',
      '日辰、月建可以补局，但必须明示由日月补成。',
      '遇旬空、月破或六冲，合局降级为不稳或冲破。',
      '所有合局最后都要回到与用神的生克关系判断吉凶。',
    ],
  };
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

export function buildLunarInfo(question: string, date = new Date()): LunarInfo {
  const now = date;
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
    timeStemBranch: lunar.getTimeInGanZhi(),
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
  const unionAnalysis = analyzeUnions(hexagram, lunarInfo, useGodResult);
  const strength = hexagram.movingLineIndexes.length >= 3 ? '卦动较强，宜先看变爻。' : '卦势中性，重点看日月与用神。';
  const relation = `日建 ${lunarInfo.dayStemBranch}、月建 ${lunarInfo.monthStemBranch} 对卦象形成基础约束。`;
  const sanHe = unionAnalysis.summary;
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
    unionAnalysis,
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
