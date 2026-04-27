export type YinYang = 'yang' | 'yin';

export type LineStrength = 6 | 7 | 8 | 9;

export type LineRole = 'world' | 'response' | 'normal';

export type FiveElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export type SixSpirit = '青龙' | '朱雀' | '勾陈' | '腾蛇' | '白虎' | '玄武';

export type TrigramName =
  | '乾'
  | '兑'
  | '离'
  | '震'
  | '巽'
  | '坎'
  | '艮'
  | '坤';

export type HexagramLine = {
  index: number;
  strength: LineStrength;
  moving: boolean;
  yinYang: YinYang;
  label: string;
  role: LineRole;
  sixSpirit: SixSpirit;
  sixKin: string;
  hiddenSpirit?: {
    sixKin: string;
    stemBranch: string;
    branchElement: string;
    yinYang: YinYang;
    elementalStatus?: string;
    specialStatus?: '月破' | '暗动' | '旬空';
  };
  stemBranch?: string;
  branch?: string;
  branchElement?: string;
  elementalStatus?: string;
  specialStatus?: '月破' | '暗动' | '旬空';
};

export type Hexagram = {
  name: string;
  changedName?: string;
  marks: string[];
  changedMarks: string[];
  upperTrigram: TrigramName;
  lowerTrigram: TrigramName;
  changedUpperTrigram?: TrigramName;
  changedLowerTrigram?: TrigramName;
  palace: string;
  palaceElement: string;
  changedPalace?: string;
  changedPalaceElement?: string;
  lines: HexagramLine[];
  changedLines: HexagramLine[];
  movingLineIndexes: number[];
};

export type LunarInfo = {
  datetimeText: string;
  calendarRule: string;
  dayStemBranch: string;
  monthStemBranch: string;
  yearStemBranch: string;
  dayXun: string;
  voidBranches: string[];
  prevSolarTerm: string;
  nextSolarTerm: string;
  sixSpirits: SixSpirit[];
  questionCategory: string;
};

export type AnalysisItem = {
  title: string;
  value: string;
  detail: string;
};

export type SpiritAnalysis = {
  title: '用神' | '原神' | '忌神' | '仇神';
  sixKin: string;
  displayName: string;
  positionName?: string;
  lineIndex?: number;
  isHidden?: boolean;
  color?: string;
  reason: string;
  detail: string;
};

export type AnalysisResult = {
  useGod: string;
  useGodReason: string;
  useGodLineIndexes: number[];
  useGodHiddenLineIndexes: number[];
  useGodIsHidden: boolean;
  spiritAnalyses: SpiritAnalysis[];
  questionCategory: string;
  strength: string;
  relation: string;
  sanHe: string;
  flyingHidden: string;
  progression: string;
  items: AnalysisItem[];
  summary: string;
};

export type FortuneRecord = {
  id: string;
  question: string;
  createdAt: string;
  hexagram: Hexagram;
  lunarInfo: LunarInfo;
  analysis: AnalysisResult;
  aiReading: string;
};
