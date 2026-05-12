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
  timeStemBranch: string;
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
  verdict: string;
  strengthLabel: string;
  evidenceTags: string[];
  reason: string;
  detail: string;
};

export type UnionLineRef = {
  index: number;
  positionName: string;
  branch: string;
  element: string;
  sixKin: string;
  moving: boolean;
  role: LineRole;
  specialStatus?: '月破' | '暗动' | '旬空';
  source: 'line' | 'day' | 'month';
};

export type UnionPattern = {
  id: string;
  kind: '三合' | '半合' | '六合' | '六冲' | '卦象';
  name: string;
  element?: string;
  status: '成势' | '待引' | '合住' | '冲破' | '提示';
  verdict: string;
  impact: string;
  relationToUseGod: string;
  participants: UnionLineRef[];
  evidence: string[];
  weakPoints: string[];
};

export type UnionAnalysis = {
  verdict: string;
  summary: string;
  dominantElement?: string;
  patterns: UnionPattern[];
  rules: string[];
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
  unionAnalysis: UnionAnalysis;
  flyingHidden: string;
  progression: string;
  items: AnalysisItem[];
  summary: string;
  aiReadingStructured?: AIReading;
};

export type AIReadingTimelineItem = {
  type: 'cast' | 'expected' | 'note' | string;
  label: string;
  time_text: string;
  detail?: string | null;
};

export type AIReadingPoint = {
  claim: string;
  evidence: string[];
  explanation: string;
};

export type AIReading = {
  verdict: string;
  expected_time_text?: string | null;
  timeline: AIReadingTimelineItem[];
  points: AIReadingPoint[];
  status: string;
  generated_at?: string;
  model?: string | null;
  lang?: 'zh' | 'en' | null;
};

export type FortuneRecord = {
  id: string;
  question: string;
  createdAt: string;
  profile?: DivinationProfile;
  hexagram: Hexagram;
  lunarInfo: LunarInfo;
  analysis: AnalysisResult;
  aiReading: string;
  favorite?: boolean;
  verificationNotes?: Array<{
    id: number;
    fulfilled: boolean;
    note: string;
    createdAt: string;
  }>;
};

export type DivinationProfile = {
  id: string;
  remoteId?: string;
  name: string;
  relation: string;
  gender: '男' | '女' | '未填写';
  birthday: string;
  avatarUri?: string;
};
