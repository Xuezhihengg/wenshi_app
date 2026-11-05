import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Solar } from 'lunar-typescript';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, LayoutAnimation, Modal, PanResponder, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, UIManager, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineIcon } from '../components/LineIcon';
import { generateRemoteAIReading } from '../api/records';
import { ApiRequestError, isGuestMode } from '../api/client';
import { hexagramTextFor, type HexagramTextSection } from '../domain/hexagramTexts';
import { AIReading, HexagramLine, SpiritAnalysis, UnionAnalysis, UnionLineRef, UnionPattern, YinYang } from '../domain/types';
import { RootStackParamList } from '../navigation/types';
import { saveRecord } from '../storage/recordStore';
import { useAppTheme } from '../theme/AppTheme';
import { TranslationKey, useAppLanguage } from '../i18n/AppLanguage';
import { getEffectivePlanLimits, getLocalAIUsageCount, incrementLocalAIUsage } from '../services/membershipLimits';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;
type MetaMode = 'sixKin' | 'sixSpirit';
type SpiritRippleItem = { id: number; lineIndex: number; isHidden: boolean; progress: Animated.Value };
type VerificationNote = { id: number; fulfilled: boolean; note: string; createdAt: string };
const META_COLUMN_WIDTH = 54;
const META_COLUMN_WIDTH_EN = 74;

const ELEMENT_COLORS: Record<string, string> = {
  木: '#1f7a3f',
  火: '#c23a2b',
  土: '#9a6a1f',
  金: '#6d6d6d',
  水: '#1d5f9f',
};

const ELEMENT_LIGHT_COLORS: Record<string, string> = {
  木: '#dceee1',
  火: '#f4ddd7',
  土: '#efe3c8',
  金: '#e2e2e2',
  水: '#d9e9f5',
};

const ELEMENT_DARK_COLORS: Record<string, string> = {
  木: '#1a3528',
  火: '#3a1f1b',
  土: '#3a2f1b',
  金: '#2b2b2b',
  水: '#15293f',
};

const ELEMENT_ORDER = ['木', '火', '土', '金', '水'];

const BRANCH_TO_ELEMENT: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const STEM_TO_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

function inferElementFromText(text: string): string | undefined {
  for (const ch of text) {
    if (ELEMENT_LIGHT_COLORS[ch]) return ch;
  }
  for (const ch of text) {
    if (BRANCH_TO_ELEMENT[ch]) return BRANCH_TO_ELEMENT[ch];
  }
  for (const ch of text) {
    if (STEM_TO_ELEMENT[ch]) return STEM_TO_ELEMENT[ch];
  }
  return undefined;
}

const ELEMENT_PALE_COLORS: Record<string, string> = {
  木: '#bfe3ca',
  火: '#efc0b8',
  土: '#e4c98f',
  金: '#d4d4d4',
  水: '#b9d7ee',
};

const ELEMENT_DARK_CARD_COLORS: Record<string, string> = {
  木: '#11291d',
  火: '#321916',
  土: '#302512',
  金: '#29292d',
  水: '#102334',
};

const UNION_STATUS_COLORS: Record<UnionPattern['status'], string> = {
  成势: '#1f7a3f',
  待引: '#d08a18',
  合住: '#1d5f9f',
  冲破: '#c23a2b',
  提示: '#6f7f8f',
};

const SPIRIT_ELEMENTS: Record<string, string> = {
  青龙: '木',
  朱雀: '火',
  勾陈: '土',
  腾蛇: '土',
  白虎: '金',
  玄武: '水',
};

const MODE_LABEL_KEYS: Record<MetaMode, TranslationKey> = {
  sixKin: 'analysis.sixKin',
  sixSpirit: 'analysis.sixSpirit',
};

const TEXT_SECTION_LABEL_KEYS: Record<HexagramTextSection, TranslationKey> = {
  judgment: 'analysis.judgment',
  tuan: 'analysis.tuan',
  image: 'analysis.image',
};

const TEXT_SECTIONS: HexagramTextSection[] = ['judgment', 'tuan', 'image'];

function formatCompactChineseDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}时`;
}

function formatCompactDateTime(value: string | Date, language: 'zh' | 'en') {
  if (language === 'zh') return formatCompactChineseDateTime(value);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatStemBranchDateTime(lunarInfo: Props['route']['params']['record']['lunarInfo']) {
  return `${lunarInfo.yearStemBranch}年 ${lunarInfo.monthStemBranch}月 ${lunarInfo.dayStemBranch}日${lunarInfo.timeStemBranch ? ` ${lunarInfo.timeStemBranch}时` : ''}`;
}

function formatStemBranchDateTimeLocalized(lunarInfo: Props['route']['params']['record']['lunarInfo'], language: 'zh' | 'en') {
  if (language === 'zh') return formatStemBranchDateTime(lunarInfo);
  return [
    lunarInfo.yearStemBranch,
    lunarInfo.monthStemBranch,
    lunarInfo.dayStemBranch,
    lunarInfo.timeStemBranch,
  ].filter(Boolean).join(' · ');
}

function stripParentheticals(value: string): string {
  return value
    .replace(/[\(（][^\)）]*[\)）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemBranchOfDate(value: string | Date): { month: string; day: string } | undefined {
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return undefined;
    const solar = Solar.fromYmdHms(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    );
    const lunar = solar.getLunar();
    return { month: lunar.getMonthInGanZhiExact(), day: lunar.getDayInGanZhiExact2() };
  } catch {
    return undefined;
  }
}

function profileDisplayName(profile: Props['route']['params']['record']['profile'], fallback: string) {
  const name = profile?.name?.trim();
  return name && name !== '未填写' ? name : fallback;
}

function profileGenderLabel(profile: Props['route']['params']['record']['profile'], t: (key: TranslationKey) => string) {
  if (profile?.gender === '男') return t('profileEdit.genderMale');
  if (profile?.gender === '女') return t('profileEdit.genderFemale');
  return t('profileEdit.genderUnset');
}

const SIX_KIN_EN: Record<string, string> = {
  兄弟: 'Sibling',
  子孙: 'Offspring',
  妻财: 'Wealth',
  官鬼: 'Officer',
  父母: 'Parent',
};

const SIX_SPIRIT_EN: Record<string, string> = {
  青龙: 'Azure Dragon',
  朱雀: 'Vermilion Bird',
  勾陈: 'Gou Chen',
  腾蛇: 'Soaring Snake',
  白虎: 'White Tiger',
  玄武: 'Black Tortoise',
};

const ELEMENT_EN: Record<string, string> = {
  木: 'Wood',
  火: 'Fire',
  土: 'Earth',
  金: 'Metal',
  水: 'Water',
};

const BRANCH_EN: Record<string, string> = {
  子: 'Zi',
  丑: 'Chou',
  寅: 'Yin',
  卯: 'Mao',
  辰: 'Chen',
  巳: 'Si',
  午: 'Wu',
  未: 'Wei',
  申: 'Shen',
  酉: 'You',
  戌: 'Xu',
  亥: 'Hai',
};

const STATUS_EN: Record<string, string> = {
  旺: 'Prosperous',
  相: 'Supported',
  休: 'Resting',
  囚: 'Confined',
  死: 'Weak',
  月破: 'Month Break',
  暗动: 'Hidden Motion',
  旬空: 'Void',
};

const SPIRIT_TITLE_EN: Record<string, string> = {
  用神: 'Focus Spirit',
  原神: 'Source Spirit',
  忌神: 'Adverse Spirit',
  仇神: 'Hostile Spirit',
};

const SPIRIT_TITLE_COMPACT_EN: Record<string, string> = {
  用神: 'Focus',
  原神: 'Source',
  忌神: 'Adverse',
  仇神: 'Hostile',
};

const LINE_POSITION_EN: Record<string, string> = {
  初爻: 'First line',
  二爻: 'Second line',
  三爻: 'Third line',
  四爻: 'Fourth line',
  五爻: 'Fifth line',
  上爻: 'Top line',
};

const UNION_KIND_EN: Record<UnionPattern['kind'], string> = {
  三合: 'Three-Harmony',
  半合: 'Half-Harmony',
  六合: 'Six-Union',
  六冲: 'Six-Clash',
  卦象: 'Hexagram Pattern',
};

const UNION_STATUS_EN: Record<UnionPattern['status'], string> = {
  成势: 'Formed',
  待引: 'Awaiting Trigger',
  合住: 'Binding',
  冲破: 'Broken',
  提示: 'Note',
};

function branchText(branch: string | undefined, language: 'zh' | 'en') {
  if (!branch) return '';
  return language === 'en' ? BRANCH_EN[branch] ?? branch : branch;
}

function elementText(element: string | undefined, language: 'zh' | 'en') {
  if (!element) return '';
  return language === 'en' ? ELEMENT_EN[element] ?? element : element;
}

function sixKinText(sixKin: string | undefined, language: 'zh' | 'en') {
  if (!sixKin) return '';
  return language === 'en' ? SIX_KIN_EN[sixKin] ?? sixKin : sixKin;
}

function linePositionText(positionName: string | undefined, language: 'zh' | 'en', compact = false) {
  if (!positionName) return '';
  if (language === 'zh') return positionName;
  const index = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'].indexOf(positionName);
  if (index >= 0) return compact ? `L${index + 1}` : LINE_POSITION_EN[positionName] ?? `Line ${index + 1}`;
  if (positionName === '日辰') return compact ? 'Day' : 'Day Branch';
  if (positionName === '月建') return compact ? 'Month' : 'Month Branch';
  return translateChineseTerms(positionName, language);
}

function spiritTitleText(title: SpiritAnalysis['title'], language: 'zh' | 'en', compact = false) {
  if (language === 'zh') return title;
  return compact ? SPIRIT_TITLE_COMPACT_EN[title] ?? title : SPIRIT_TITLE_EN[title] ?? title;
}

function spiritStrengthText(strength: string | undefined, language: 'zh' | 'en') {
  if (!strength || language === 'zh') return strength ?? '';
  const map: Record<string, string> = {
    有力: 'Strong',
    偏弱: 'Soft',
    受制: 'Constrained',
    空破: 'Void/Break',
    受空: 'Void',
    伏藏待引: 'Hidden',
    暗中可用: 'Hidden Active',
    未现: 'Not Visible',
    待判断: 'Pending',
  };
  return map[strength] ?? translateChineseTerms(strength, language);
}

function spiritEvidenceText(tag: string, language: 'zh' | 'en') {
  if (language === 'zh') return tag;
  const map: Record<string, string> = {
    动爻: 'Moving',
    临世: 'World',
    临应: 'Response',
    伏神: 'Hidden',
    旺: 'Prosperous',
    相: 'Supported',
    休: 'Resting',
    囚: 'Confined',
    死: 'Weak',
    月破: 'Month Break',
    暗动: 'Hidden Motion',
    旬空: 'Void',
  };
  return map[tag] ?? translateChineseTerms(tag, language);
}

function spiritDisplayNameText(analysis: SpiritAnalysis, language: 'zh' | 'en') {
  if (language === 'zh') return analysis.displayName;
  if (analysis.lineIndex === undefined && analysis.strengthLabel === '未现') return 'Not visible';
  const branch = analysis.displayName.match(/[子丑寅卯辰巳午未申酉戌亥]/)?.[0];
  const element = analysis.displayName.match(/[木火土金水]/)?.[0] ?? analysis.color;
  const hiddenPrefix = analysis.isHidden ? 'Hidden · ' : '';
  const branchElement = branch ? ` · ${branchText(branch, language)} ${elementText(element, language)}` : '';
  return `${hiddenPrefix}${sixKinText(analysis.sixKin, language)}${branchElement}`;
}

function spiritVerdictText(analysis: SpiritAnalysis, language: 'zh' | 'en') {
  if (language === 'zh') return analysis.verdict;
  const title = spiritTitleText(analysis.title, language, true);
  const state = spiritStrengthText(analysis.strengthLabel, language);
  if (analysis.strengthLabel === '未现') return `${title} is not visible; judge through World, Response, and moving lines.`;
  if (analysis.title === '用神') return `The Focus shows the matter’s core condition. Current state: ${state}.`;
  if (analysis.title === '原神') return `Source supports the Focus and shows available help. Current state: ${state}.`;
  if (analysis.title === '忌神') return `Adverse restrains the Focus and marks the main pressure. Current state: ${state}.`;
  return `Hostile feeds the Adverse line and may add indirect pressure. Current state: ${state}.`;
}

function spiritDetailText(analysis: SpiritAnalysis, language: 'zh' | 'en') {
  if (language === 'zh') return analysis.detail;
  if (analysis.strengthLabel === '未现') return 'No clear line is selected for this spirit, so its effect remains secondary.';
  const position = linePositionText(analysis.positionName, language);
  const tags = analysis.evidenceTags.slice(0, 4).map((tag) => spiritEvidenceText(tag, language)).join(', ');
  const tagText = tags ? ` Key signals: ${tags}.` : '';
  return `${spiritDisplayNameText(analysis, language)}${position ? ` at ${position}` : ''}. Read month/day strength, movement, World/Response position, void, and break together.${tagText}`;
}

function spiritReasonText(analysis: SpiritAnalysis | undefined, language: 'zh' | 'en') {
  if (!analysis) return '';
  if (language === 'zh') return analysis.reason;
  if (analysis.title === '用神') return 'The Focus Spirit is selected from the question category and the line most directly representing the matter.';
  if (analysis.title === '原神') return 'The Source Spirit is the line that generates and supports the Focus Spirit.';
  if (analysis.title === '忌神') return 'The Adverse Spirit is the line that restrains the Focus Spirit.';
  return 'The Hostile Spirit supports the Adverse Spirit and can pressure the Focus indirectly.';
}

function unionKindText(kind: UnionPattern['kind'], language: 'zh' | 'en') {
  return language === 'en' ? UNION_KIND_EN[kind] ?? kind : kind;
}

function unionStatusText(status: UnionPattern['status'], language: 'zh' | 'en') {
  return language === 'en' ? UNION_STATUS_EN[status] ?? status : status;
}

function unionPatternNameText(pattern: UnionPattern, language: 'zh' | 'en', compact = false) {
  if (language === 'zh') return pattern.name;
  const branches = pattern.participants
    .filter((participant) => participant.branch)
    .map((participant) => branchText(participant.branch, language))
    .filter((item, index, array) => array.indexOf(item) === index);
  const element = elementText(pattern.element, language);
  if (pattern.kind === '三合') return `${branches.join('-')} ${element} Pattern`;
  if (pattern.kind === '半合') return compact ? `${branches.join('-')} Half` : `${branches.join('-')} Half-Harmony ${element}`;
  if (pattern.kind === '六合') return compact ? `${branches.join('-')} Union` : `${branches.join('-')} Six-Union`;
  if (pattern.kind === '六冲') return compact ? `${branches.join('-')} Clash` : `${branches.join('-')} Six-Clash`;
  return UNION_KIND_EN[pattern.kind] ?? pattern.name;
}

function unionRelationText(relationToUseGod: string, language: 'zh' | 'en') {
  if (language === 'zh') return relationToUseGod;
  if (relationToUseGod.includes('同气')) return 'Same element as the Focus; it reinforces the same field.';
  if (relationToUseGod.includes('生扶')) return 'Generates the Focus; supportive for the matter.';
  if (relationToUseGod.includes('克制')) return 'Restrains the Focus; this is a pressure signal.';
  if (relationToUseGod.includes('泄')) return 'Drains the Focus; the matter may be consumed or delayed.';
  if (relationToUseGod.includes('受用神所制')) return 'Controlled by the Focus; obstacles may be contained.';
  if (relationToUseGod.includes('涉及用神')) return 'Directly touches the Focus and needs close attention.';
  if (relationToUseGod.includes('未直接涉及用神')) return 'Does not directly touch the Focus.';
  if (relationToUseGod.includes('卦体背景')) return 'A background hexagram tendency; judge it with Focus strength.';
  return 'Relationship to the Focus is unclear.';
}

function unionImpactTextForDisplay(pattern: UnionPattern, language: 'zh' | 'en') {
  if (language === 'zh') return pattern.impact;
  const relation = unionRelationText(pattern.relationToUseGod, language);
  if (pattern.kind === '六冲') return `${relation} Clash indicates movement, separation, interruption, or repetition.`;
  if (pattern.kind === '六合') return `${relation} Six-Union suggests binding, attachment, negotiation, or delay.`;
  if (pattern.status === '成势') return `${relation} The ${elementText(pattern.element, language)} pattern is formed and amplifies that element.`;
  if (pattern.status === '待引') return `${relation} A partial structure is present, but it still awaits activation or a missing branch.`;
  if (pattern.status === '冲破') return `${relation} The union intent is weakened by clash, void, or month break.`;
  return relation;
}

function unionEvidenceTextForDisplay(item: string, pattern: UnionPattern, language: 'zh' | 'en') {
  if (language === 'zh') return item;
  if (item === pattern.relationToUseGod) return unionRelationText(item, language);
  if (item.includes('三支')) {
    const branchList = pattern.participants.map((participant) => branchText(participant.branch, language)).filter(Boolean).join(', ');
    return `Required branches are present: ${branchList}.`;
  }
  if (item.includes('本卦已见')) return 'The hexagram contains a partial harmony structure.';
  if (item.includes('参与动爻、世应或用神')) return 'One or more branches touch movement, World/Response, or the Focus.';
  if (item.includes('未直接临动爻')) return 'The structure is present but relatively still.';
  if (item.includes('月破')) return 'Month Break weakens this branch and destabilizes the pattern.';
  if (item.includes('旬空')) return 'Void makes the union intent temporarily insubstantial.';
  if (item.includes('相冲')) return 'An internal clash creates a structural fault.';
  if (item.includes('六合不实')) return 'The Six-Union is present, but not solid.';
  if (item.includes('冲主动')) return 'Clash brings movement, dispersal, and repetition, reducing stability.';
  if (item.includes('六冲背景')) return 'The Six-Clash background weakens union stability.';
  return translateChineseTerms(item, language);
}

function unionHeroTitleText(pattern: UnionPattern | undefined, analysis: UnionAnalysis, language: 'zh' | 'en') {
  if (language === 'zh') return pattern?.verdict ?? analysis.verdict;
  if (!pattern) return 'No clear union pattern';
  return `${unionPatternNameText(pattern, language)} · ${unionStatusText(pattern.status, language)}`;
}

function unionHeroSummaryText(pattern: UnionPattern | undefined, analysis: UnionAnalysis, language: 'zh' | 'en') {
  if (language === 'zh') return pattern?.impact ?? analysis.summary;
  if (!pattern) return 'No structured union signal is strong enough to anchor the reading.';
  return unionImpactTextForDisplay(pattern, language);
}

function unionResultCircleText(pattern: UnionPattern | undefined, hasFormedSanHe: boolean, language: 'zh' | 'en') {
  if (language === 'zh') {
    if (!pattern?.element) return hasFormedSanHe ? '成局' : '未成局';
    return hasFormedSanHe ? `成${pattern.element}局` : `未成${pattern.element}局`;
  }
  if (!pattern?.element) return hasFormedSanHe ? 'Formed' : 'Pending';
  return hasFormedSanHe ? `${elementText(pattern.element, language)}\nFormed` : `${elementText(pattern.element, language)}\nPending`;
}

function translateChineseTerms(text: string | undefined, language: 'zh' | 'en') {
  if (!text || language === 'zh') return text ?? '';
  let result = text;
  Object.entries({
    ...SIX_SPIRIT_EN,
    ...SIX_KIN_EN,
    ...SPIRIT_TITLE_EN,
    ...LINE_POSITION_EN,
    世爻: 'World line',
    应爻: 'Response line',
    伏神: 'Hidden Spirit',
    世: 'World',
    应: 'Response',
    伏: 'hidden',
    月破: 'Month Break',
    暗动: 'Hidden Motion',
    旬空: 'Void',
    三合: 'Three-Harmony',
    半合: 'Half-Combination',
    六合: 'Six-Combination',
    六冲: 'Six-Clash',
    合局: 'Combination',
    合意: 'Combination intent',
    合冲并见: 'Combination and clash both present',
    合局成势: 'Combination pattern formed',
    六合牵连: 'Six-Combination binding',
    未见明显合局: 'No clear combination pattern',
    成势: 'Formed',
    待引: 'Awaiting trigger',
    合住: 'Bound',
    冲破: 'Broken by clash',
    提示: 'Note',
    证据: 'evidence',
    条: '',
    日辰: 'Day officer',
    月建: 'Month officer',
    动: 'Moving',
    半: 'Half',
    归魂: 'Returning Soul',
    游魂: 'Wandering Soul',
    有力: 'Strong',
    偏弱: 'Slightly weak',
    受制: 'Constrained',
    空破: 'Broken/Void',
    受空: 'Void-affected',
    伏藏待引: 'Hidden, awaiting trigger',
    暗中可用: 'Usable in hidden motion',
    未现: 'Not visible',
    待判断: 'Pending',
    动爻: 'Moving',
    临世: 'On World',
    临应: 'On Response',
    变: 'changes to',
    爻: 'line',
  }).forEach(([source, target]) => {
    result = result.split(source).join(target);
  });
  return result;
}

const STATUS_COLORS: Record<string, { background: string; text: string }> = {
  旺: { background: '#d63f31', text: '#fff' },
  相: { background: '#e39b24', text: '#fff' },
  休: { background: '#6f7f8f', text: '#fff' },
  囚: { background: '#7d6a55', text: '#fff' },
  死: { background: '#222', text: '#fff' },
};

const META_SWITCH_DISTANCE = 14;
const COLLAPSIBLE_TOP_HEIGHT = 302;
const COLLAPSE_DISTANCE = 256;
const ESTIMATED_RESULT_NOTE_CARD_HEIGHT = 212;
const INTRO_HEX_COLUMN_WIDTH = 132;
const INTRO_YIN_GAP = 16;
type LayoutRect = { x: number; y: number; width: number; height: number };
const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 5,
};
const LIGHT_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

function nextMode(mode: MetaMode): MetaMode {
  if (mode === 'sixKin') return 'sixSpirit';
  return 'sixKin';
}

function roleText(line: HexagramLine, language: 'zh' | 'en') {
  if (line.role === 'world') return language === 'en' ? 'W' : '世';
  if (line.role === 'response') return language === 'en' ? 'R' : '应';
  return '';
}

function roleLabels(line: HexagramLine, spiritAnalyses: SpiritAnalysis[], language: 'zh' | 'en') {
  return [
    roleText(line, language),
    ...spiritAnalyses
      .filter((analysis) => analysis.lineIndex === line.index && !analysis.isHidden)
      .map((analysis) => spiritShortLabel(analysis.title, language)),
  ].filter(Boolean);
}

function lineColor(line: HexagramLine) {
  return ELEMENT_COLORS[line.branchElement ?? ''] ?? '#000';
}

function spiritAnalysisColor(analysis: SpiritAnalysis | undefined, fallback: string) {
  if (!analysis?.color) return fallback;
  return ELEMENT_COLORS[analysis.color] ?? fallback;
}

function spiritAnalysisBackground(analysis: SpiritAnalysis | undefined, darkMode = false) {
  if (!analysis?.color) return darkMode ? '#202024' : '#f2f2f2';
  if (darkMode) return ELEMENT_DARK_CARD_COLORS[analysis.color] ?? '#202024';
  return ELEMENT_LIGHT_COLORS[analysis.color] ?? '#f2f2f2';
}

function spiritLineColor(lineIndex: number, isHidden: boolean, spiritAnalyses: SpiritAnalysis[]) {
  const analysis = spiritAnalyses.find((item) => item.lineIndex === lineIndex && Boolean(item.isHidden) === isHidden && item.color);
  return analysis?.color ? ELEMENT_COLORS[analysis.color] : undefined;
}

function spiritShortLabel(title: SpiritAnalysis['title'], language: 'zh' | 'en') {
  if (language === 'en') {
    if (title === '用神') return 'U';
    if (title === '原神') return 'S';
    if (title === '忌神') return 'A';
    return 'H';
  }
  return title.slice(0, 1);
}

function spiritColor(line: HexagramLine) {
  return ELEMENT_COLORS[SPIRIT_ELEMENTS[line.sixSpirit]] ?? '#000';
}

function stemBranchColor(stemBranch: string) {
  const branch = stemBranch.slice(1);
  const branchElements: Record<string, string> = {
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
  return ELEMENT_COLORS[branchElements[branch]] ?? '#000';
}

function metaTextForMode(line: HexagramLine, mode: MetaMode, language: 'zh' | 'en') {
  if (mode === 'sixSpirit') {
    return { primary: language === 'en' ? SIX_SPIRIT_EN[line.sixSpirit] ?? line.sixSpirit : line.sixSpirit, secondary: '', color: spiritColor(line) };
  }
  return {
    primary: language === 'en' ? SIX_KIN_EN[line.sixKin] ?? line.sixKin : line.sixKin,
    secondary: `${language === 'en' ? ELEMENT_EN[line.branchElement ?? ''] ?? line.branchElement : line.branchElement} · ${line.stemBranch}`,
    color: lineColor(line),
  };
}

type FullTextBlock = {
  title: string;
  original: string;
  translation?: string;
};

function fullTextBlocks(text: ReturnType<typeof hexagramTextFor>, section: HexagramTextSection, t: (key: TranslationKey) => string, language: 'zh' | 'en'): FullTextBlock[] {
  if (!text) return [{ title: t('analysis.noContent'), original: t('analysis.noContentBody') }];
  const original = text[section] || t('analysis.noContentBody');
  const labelKey = TEXT_SECTION_LABEL_KEYS[section];
  return [{ title: t(labelKey), original }];
}

function hiddenSpiritMetaForMode(line: HexagramLine, mode: MetaMode, language: 'zh' | 'en') {
  const hiddenSpirit = line.hiddenSpirit;
  if (!hiddenSpirit) return undefined;
  if (mode === 'sixSpirit') {
    return { primary: language === 'en' ? SIX_SPIRIT_EN[line.sixSpirit] ?? line.sixSpirit : line.sixSpirit, secondary: '', color: spiritColor(line) };
  }
  return {
    primary: language === 'en' ? SIX_KIN_EN[hiddenSpirit.sixKin] ?? hiddenSpirit.sixKin : `${hiddenSpirit.sixKin}﹙伏﹚`,
    secondary: `${language === 'en' ? ELEMENT_EN[hiddenSpirit.branchElement] ?? hiddenSpirit.branchElement : hiddenSpirit.branchElement} · ${hiddenSpirit.stemBranch}`,
    color: ELEMENT_COLORS[hiddenSpirit.branchElement] ?? '#333',
  };
}

type MetaDisplay = ReturnType<typeof metaTextForMode>;

function MetaDisplayLayer({
  meta,
  primaryStyle,
  secondaryStyle,
  fitText = false,
  width,
}: {
  meta: MetaDisplay | undefined;
  primaryStyle?: object;
  secondaryStyle?: object;
  fitText?: boolean;
  width?: number;
}) {
  if (!meta) return null;
  return (
    <>
      <Text
        numberOfLines={fitText ? 1 : undefined}
        adjustsFontSizeToFit={fitText}
        minimumFontScale={0.72}
        style={[styles.metaPrimary, width ? { width } : null, primaryStyle, { color: meta.color }]}
      >
        {meta.primary}
      </Text>
      {meta.secondary ? (
        <Text
          numberOfLines={fitText ? 1 : undefined}
          adjustsFontSizeToFit={fitText}
          minimumFontScale={0.8}
          style={[styles.metaSecondary, width ? { width } : null, secondaryStyle, { color: meta.color }]}
        >
          {meta.secondary}
        </Text>
      ) : null}
    </>
  );
}

function MetaDisplaySwitcher({
  meta,
  opacity,
  translateX,
  primaryStyle,
  secondaryStyle,
  fitText,
  width,
}: {
  meta: MetaDisplay | undefined;
  opacity: Animated.Value | Animated.AnimatedMultiplication<number>;
  translateX: Animated.Value;
  primaryStyle?: object;
  secondaryStyle?: object;
  fitText?: boolean;
  width?: number;
}) {
  return (
    <Animated.View style={[styles.metaContent, width ? { width } : null, { opacity, transform: [{ translateX }] }]}>
      <MetaDisplayLayer meta={meta} primaryStyle={primaryStyle} secondaryStyle={secondaryStyle} fitText={fitText} width={width} />
    </Animated.View>
  );
}

function hasEffectiveHiddenSpirit(line: HexagramLine) {
  if (!line.hiddenSpirit) return false;
  return !(line.hiddenSpirit.sixKin === line.sixKin && line.hiddenSpirit.stemBranch === line.stemBranch);
}

function HexagramMarkTags({ marks }: { marks?: string[] }) {
  const { colors } = useAppTheme();
  if (!marks?.length) return null;
  return (
    <View style={styles.hexMarkRow}>
      {marks.map((mark) => (
        <Text key={mark} style={[styles.hexMarkText, { color: colors.text }]}>{mark}</Text>
      ))}
    </View>
  );
}

const ANALYSIS_TAB_KEYS: TranslationKey[] = ['analysis.tabReading', 'analysis.tabSpirits', 'analysis.tabUnions', 'analysis.tabVerify'];

function AnalysisPageTabs({ scrollX, pageWidth, onSelect }: { scrollX: Animated.Value; pageWidth: number; onSelect: (index: number) => void }) {
  const { t } = useAppLanguage();
  const slotWidth = 56;
  const pagePositions = ANALYSIS_TAB_KEYS.map((_, index) => pageWidth * index);
  const pillTranslateX = scrollX.interpolate({
    inputRange: pagePositions,
    outputRange: ANALYSIS_TAB_KEYS.map((_, index) => slotWidth * index),
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.analysisTabs}>
      <View style={styles.analysisTabsInner}>
        <Animated.View style={[styles.analysisTabPillShadow, { transform: [{ translateX: pillTranslateX }] }]}>
          <View style={styles.analysisTabPill} />
        </Animated.View>
        {ANALYSIS_TAB_KEYS.map((key, index) => {
          const distance = Animated.divide(Animated.subtract(scrollX, pageWidth * index), pageWidth);
          const titleOpacity = distance.interpolate({
            inputRange: [-0.55, 0, 0.55],
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          const dotOpacity = titleOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
            extrapolate: 'clamp',
          });
          return (
            <Pressable key={key} style={styles.analysisTabSlot} onPress={() => onSelect(index)}>
              <Animated.View pointerEvents="none" style={[styles.analysisTabLayer, { opacity: titleOpacity }]}>
                <Text style={styles.analysisTabText}>{t(key)}</Text>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.analysisTabLayer, { opacity: dotOpacity }]}>
                <View style={styles.analysisTabDot} />
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FullTextPageTabs({
  scrollX,
  pageWidth,
  onSelect,
}: {
  scrollX: Animated.Value;
  pageWidth: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useAppLanguage();
  const slotWidth = 52;
  const pillInputRange = TEXT_SECTIONS.flatMap((_, index) => {
    if (index === TEXT_SECTIONS.length - 1) return [pageWidth * index];
    return [pageWidth * index, pageWidth * (index + 0.18), pageWidth * (index + 0.5), pageWidth * (index + 0.82)];
  });
  const pillOutputRange = TEXT_SECTIONS.flatMap((_, index) => {
    if (index === TEXT_SECTIONS.length - 1) return [slotWidth * index];
    return [slotWidth * index, slotWidth * index + 3, slotWidth * (index + 0.5), slotWidth * (index + 1) - 3];
  });
  const pillTranslateX = scrollX.interpolate({
    inputRange: pillInputRange,
    outputRange: pillOutputRange,
    extrapolate: 'clamp',
  });
  const pagePositions = TEXT_SECTIONS.map((_, pageIndex) => pageWidth * pageIndex);

  return (
    <View style={styles.fullTextTabs}>
      <View style={[styles.fullTextTabsInner, { width: slotWidth * TEXT_SECTIONS.length }]}>
        <Animated.View style={[styles.fullTextTabPill, { transform: [{ translateX: pillTranslateX }] }]} />
        {TEXT_SECTIONS.map((section, index) => {
          const titleOpacity = scrollX.interpolate({
            inputRange: pagePositions,
            outputRange: TEXT_SECTIONS.map((_, pageIndex) => (pageIndex === index ? 1 : 0)),
            extrapolate: 'clamp',
          });
          const inactiveOpacity = scrollX.interpolate({
            inputRange: pagePositions,
            outputRange: TEXT_SECTIONS.map((_, pageIndex) => (pageIndex === index ? 0 : 1)),
            extrapolate: 'clamp',
          });
          return (
            <Pressable key={section} style={[styles.fullTextTabSlot, { width: slotWidth }]} onPress={() => onSelect(index)}>
              <Animated.Text style={[styles.fullTextTabText, { opacity: titleOpacity }]}>
                {t(TEXT_SECTION_LABEL_KEYS[section])}
              </Animated.Text>
              <Animated.Text style={[styles.fullTextTabTextInactive, { opacity: inactiveOpacity }]}>
                {t(TEXT_SECTION_LABEL_KEYS[section])}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SpiritAnalysisBlock({
  analysis,
  fallbackColor,
  onTitlePress,
  onCardPress,
}: {
  analysis: SpiritAnalysis;
  fallbackColor: string;
  onTitlePress: (analysis: SpiritAnalysis, event: GestureResponderEvent) => void;
  onCardPress: (analysis: SpiritAnalysis) => void;
}) {
  const { darkMode, colors } = useAppTheme();
  const { language } = useAppLanguage();
  const color = spiritAnalysisColor(analysis, fallbackColor);
  return (
    <Pressable style={[styles.spiritAnalysisCard, { backgroundColor: spiritAnalysisBackground(analysis, darkMode) }]} onPress={() => onCardPress(analysis)}>
      <View style={styles.useGodRow}>
        <Pressable
          style={styles.spiritTitleLeft}
          onPress={(event) => {
            event.stopPropagation();
            onTitlePress(analysis, event);
          }}
          hitSlop={6}
        >
            <Text style={[styles.summaryTitle, language === 'en' ? styles.summaryTitleEn : null, { color: colors.text }]}>{spiritTitleText(analysis.title, language, language === 'en')}</Text>
            <Text style={[styles.useGodValue, language === 'en' ? styles.useGodValueEn : null, { color }]}>{spiritDisplayNameText(analysis, language)}</Text>
        </Pressable>
        <View style={styles.spiritMetaRight}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={[styles.spiritStrengthPill, language === 'en' ? styles.spiritStrengthPillEn : null, { color, borderColor: color }]}
          >
            {spiritStrengthText(analysis.strengthLabel, language)}
          </Text>
          {analysis.positionName ? <Text style={[styles.spiritPositionText, { color: colors.text }]}>{linePositionText(analysis.positionName, language, language === 'en')}</Text> : null}
        </View>
      </View>
      <Text style={[styles.spiritVerdictText, { color: colors.text }]}>{spiritVerdictText(analysis, language)}</Text>
      <View style={styles.spiritEvidenceRow}>
        {analysis.evidenceTags.slice(0, 4).map((tag) => (
          <Text
            key={tag}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={[styles.spiritEvidenceTag, language === 'en' ? styles.spiritEvidenceTagEn : null, { color, backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.56)' }]}
          >
            {spiritEvidenceText(tag, language)}
          </Text>
        ))}
      </View>
      <Text style={[styles.summaryText, { color: colors.mutedText }]}>{spiritDetailText(analysis, language)}</Text>
    </Pressable>
  );
}

function unionParticipantLabel(participant: UnionLineRef, language: 'zh' | 'en') {
  const branch = branchText(participant.branch, language);
  const element = elementText(participant.element, language);
  if (participant.source !== 'line') return language === 'en' ? `${linePositionText(participant.positionName, language, true)} · ${branch} ${element}` : `${participant.positionName} ${branch}${element}`;
  const badges = [
    participant.role === 'world' ? (language === 'en' ? 'W' : '世') : '',
    participant.role === 'response' ? (language === 'en' ? 'R' : '应') : '',
    participant.moving ? (language === 'en' ? 'M' : '动') : '',
  ].filter(Boolean);
  if (language === 'en') return `${linePositionText(participant.positionName, language, true)} · ${sixKinText(participant.sixKin, language)} · ${branch} ${element}${badges.length ? ` · ${badges.join('/')}` : ''}`;
  return `${participant.positionName} ${participant.sixKin}${branch}${element}${badges.length ? ` · ${badges.join('/')}` : ''}`;
}

function unionParticipantColor(participant: UnionLineRef, fallback: string) {
  return ELEMENT_COLORS[participant.element] ?? fallback;
}

function UnionPatternCard({ pattern }: { pattern: UnionPattern }) {
  const { darkMode, colors } = useAppTheme();
  const { language } = useAppLanguage();
  const statusColor = UNION_STATUS_COLORS[pattern.status] ?? colors.text;
  const elementColor = pattern.element ? ELEMENT_COLORS[pattern.element] ?? statusColor : statusColor;
  const patternBackground = pattern.element ? ELEMENT_LIGHT_COLORS[pattern.element] ?? '#fff' : '#fff';
  return (
    <View style={[styles.unionPatternCard, { backgroundColor: darkMode ? '#202024' : patternBackground }]}>
      <View style={styles.unionPatternHeader}>
        <View style={styles.unionPatternTitleWrap}>
          <Text style={[styles.unionPatternKind, { color: statusColor }]}>{unionKindText(pattern.kind, language)}</Text>
          <Text style={[styles.unionPatternName, language === 'en' ? styles.unionPatternNameEn : null, { color: colors.text }]}>{unionPatternNameText(pattern, language)}</Text>
        </View>
        <View style={[styles.unionStatusPill, { borderColor: statusColor, backgroundColor: darkMode ? '#202024' : patternBackground }]}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.74}
            style={[styles.unionStatusText, language === 'en' ? styles.unionStatusTextEn : null, { color: statusColor }]}
          >
            {unionStatusText(pattern.status, language)}
          </Text>
        </View>
      </View>
      <View style={styles.unionParticipantsRow}>
        {pattern.participants.length ? pattern.participants.map((participant) => (
          <View key={`${pattern.id}-${participant.source}-${participant.index}-${participant.branch}`} style={[styles.unionParticipantPill, { backgroundColor: unionParticipantColor(participant, elementColor) }]}>
            <Text style={[styles.unionParticipantText, language === 'en' ? styles.unionParticipantTextEn : null]}>{unionParticipantLabel(participant, language)}</Text>
          </View>
        )) : (
          <Text style={[styles.unionText, { color: colors.mutedText }]}>{unionEvidenceTextForDisplay(pattern.evidence[0], pattern, language)}</Text>
        )}
      </View>
      <Text style={[styles.unionImpactText, { color: colors.text }]}>{unionImpactTextForDisplay(pattern, language)}</Text>
      <View style={styles.unionEvidenceList}>
        {pattern.evidence.map((item) => (
          <View key={item} style={styles.unionEvidenceRow}>
            <View style={[styles.unionEvidenceDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.unionEvidenceText, { color: colors.mutedText }]}>{unionEvidenceTextForDisplay(item, pattern, language)}</Text>
          </View>
        ))}
        {pattern.weakPoints.map((item) => (
          <View key={item} style={styles.unionEvidenceRow}>
            <View style={[styles.unionEvidenceDot, { backgroundColor: '#c23a2b' }]} />
            <Text style={[styles.unionEvidenceText, { color: colors.mutedText }]}>{unionEvidenceTextForDisplay(item, pattern, language)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function unionTriangleLineStyle(from: { x: number; y: number }, to: { x: number; y: number }, color: string) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const rawLength = Math.sqrt(dx * dx + dy * dy);
  const nodeRadius = 19;
  const lineThickness = 2;
  const unitX = rawLength ? dx / rawLength : 0;
  const unitY = rawLength ? dy / rawLength : 0;
  const start = { x: from.x + unitX * nodeRadius, y: from.y + unitY * nodeRadius };
  const end = { x: to.x - unitX * nodeRadius, y: to.y - unitY * nodeRadius };
  const length = Math.max(0, rawLength - nodeRadius * 2);
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const angle = `${Math.atan2(dy, dx)}rad`;
  return {
    left: mid.x - length / 2,
    top: mid.y - lineThickness / 2,
    width: length,
    backgroundColor: color,
    transform: [{ rotate: angle }],
  };
}

function unionTriangleX(index: number, participantOrder: number) {
  const base = [72, 174, 252][participantOrder] ?? 174;
  return base + (index % 2 === 0 ? -10 : 10);
}

function selectedUnionPattern(analysis: UnionAnalysis) {
  const formed = analysis.patterns.find((pattern) => pattern.kind === '三合' && pattern.status === '成势' && pattern.participants.filter((item) => item.source === 'line').length === 3);
  if (formed) return formed;
  return analysis.patterns.find((pattern) => pattern.kind === '半合' && pattern.participants.filter((item) => item.source === 'line').length >= 2)
    ?? analysis.patterns.find((pattern) => pattern.kind === '三合' || pattern.kind === '半合');
}

function visibleUnionPatterns(analysis: UnionAnalysis) {
  const formedPatterns = analysis.patterns.filter((pattern) => pattern.kind === '三合' && pattern.status === '成势' && pattern.participants.filter((item) => item.source === 'line').length === 3);
  if (formedPatterns.length) return formedPatterns;
  const halfPatterns = analysis.patterns.filter((pattern) => pattern.kind === '半合' && pattern.participants.filter((item) => item.source === 'line').length >= 2);
  if (halfPatterns.length) return halfPatterns.slice(0, 2);
  const fallback = selectedUnionPattern(analysis);
  return fallback ? [fallback] : [];
}

function unionLineSideLabels(line: HexagramLine, spiritAnalyses: SpiritAnalysis[], language: 'zh' | 'en') {
  return [
    roleText(line, language),
    ...spiritAnalyses
      .filter((analysis) => analysis.lineIndex === line.index && !analysis.isHidden)
      .map((analysis) => spiritShortLabel(analysis.title, language)),
  ].filter(Boolean);
}

function UnionHexagramDiagram({
  analysis,
  lines,
  spiritAnalyses,
  activeIndex,
  onChangeIndex,
  transitionProgress,
}: {
  analysis: UnionAnalysis;
  lines: HexagramLine[];
  spiritAnalyses: SpiritAnalysis[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  transitionProgress: Animated.Value;
}) {
  const { darkMode, colors } = useAppTheme();
  const { language } = useAppLanguage();
  const patterns = visibleUnionPatterns(analysis);
  const pattern = patterns[Math.min(activeIndex, Math.max(0, patterns.length - 1))];
  const lineParticipants = pattern?.participants.filter((item) => item.source === 'line').slice(0, 3) ?? [];
  const nodePositions = lineParticipants.map((participant, order) => ({
    participant,
    x: unionTriangleX(participant.index, order),
    y: (5 - participant.index) * 42 + 19,
  }));
  const unionLines = nodePositions.length === 2
    ? [[nodePositions[0], nodePositions[1]] as const]
    : nodePositions.length >= 3
      ? nodePositions.map((position, index) => [position, nodePositions[(index + 1) % nodePositions.length]] as const)
      : [];
  const triangleColor = pattern?.element ? ELEMENT_COLORS[pattern.element] ?? '#555' : '#555';
  const diagramBackground = darkMode ? '#1c1c20' : '#f1f1f1';
  return (
    <View style={[styles.unionDiagramCard, { backgroundColor: diagramBackground }]}>
      <View style={styles.unionDiagramHeader}>
        <Text style={[styles.unionDiagramTitle, { color: colors.text }]}>{language === 'en' ? 'Hexagram Union Map' : '六爻合局图'}</Text>
        <View style={styles.unionDiagramHeaderRight}>
          {patterns.length > 1 ? (
            <View style={styles.unionDiagramSwitch}>
              <Pressable style={styles.unionDiagramSwitchButton} onPress={() => onChangeIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex <= 0}>
                <Text style={[styles.unionDiagramSwitchText, { color: activeIndex <= 0 ? colors.faintText : colors.text }]}>‹</Text>
              </Pressable>
              <Text style={[styles.unionDiagramCountText, { color: colors.mutedText }]}>{Math.min(activeIndex + 1, patterns.length)}/{patterns.length}</Text>
              <Pressable style={styles.unionDiagramSwitchButton} onPress={() => onChangeIndex(Math.min(patterns.length - 1, activeIndex + 1))} disabled={activeIndex >= patterns.length - 1}>
                <Text style={[styles.unionDiagramSwitchText, { color: activeIndex >= patterns.length - 1 ? colors.faintText : colors.text }]}>›</Text>
              </Pressable>
            </View>
          ) : null}
          {pattern ? (
            <Animated.Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[styles.unionDiagramBadge, language === 'en' ? styles.unionDiagramBadgeEn : null, { color: triangleColor, borderColor: triangleColor, backgroundColor: diagramBackground, opacity: transitionProgress }]}
            >
              {pattern.name}
            </Animated.Text>
          ) : null}
        </View>
      </View>
      <View style={styles.unionDiagramCanvas}>
        {unionLines.length ? (
          <Animated.View pointerEvents="none" style={[styles.unionMarkerLayer, { opacity: transitionProgress }]}>
            {unionLines.map(([from, to]) => (
              <View
                key={`${from.participant.index}-${to.participant.index}`}
                style={[styles.unionTriangleLine, unionTriangleLineStyle(from, to, triangleColor)]}
              />
            ))}
          </Animated.View>
        ) : null}
        {[5, 4, 3, 2, 1, 0].map((index) => {
          const line = lines.find((item) => item.index === index);
          const position = nodePositions.find((item) => item.participant.index === index);
          const lineElement = line?.branchElement ?? '';
          const sideLabels = line ? unionLineSideLabels(line, spiritAnalyses, language) : [];
          return (
            <View key={index} style={[styles.unionDiagramLineRow, { top: (5 - index) * 42 }]}>
              <Text style={[styles.unionDiagramLineLabel, language === 'en' ? styles.unionDiagramLineLabelEn : null, { color: colors.mutedText }]}>{linePositionText(['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][index], language, language === 'en')}</Text>
              <View style={[styles.unionHexLine, { backgroundColor: ELEMENT_PALE_COLORS[lineElement] ?? colors.divider }]} />
              {position ? (
                <Animated.View style={[styles.unionBranchNode, { left: position.x - 19, backgroundColor: ELEMENT_COLORS[position.participant.element] ?? triangleColor, opacity: transitionProgress }]}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={styles.unionBranchNodeText}
                  >
                    {position.participant.branch}
                  </Text>
                </Animated.View>
              ) : null}
              <View style={styles.unionDiagramSideLabels}>
                {sideLabels.map((label) => (
                  <Text key={label} style={[styles.unionDiagramSideLabel, { color: colors.text }]}>{label}</Text>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function UnionAnalysisBlock({
  analysis,
  lines,
  spiritAnalyses,
  activePatternIndex,
  transitionProgress,
  onRequestPatternIndex,
}: {
  analysis?: UnionAnalysis;
  lines: HexagramLine[];
  spiritAnalyses: SpiritAnalysis[];
  activePatternIndex: number;
  transitionProgress: Animated.Value;
  onRequestPatternIndex: (index: number) => void;
}) {
  const { darkMode, colors } = useAppTheme();
  const { language } = useAppLanguage();
  if (!analysis) {
    return (
      <View style={[styles.unionCard, { backgroundColor: colors.cardMuted }]}>
        <Text style={[styles.unionTitle, { color: colors.text }]}>{language === 'en' ? 'Combination Analysis' : '合局分析'}</Text>
        <Text style={[styles.unionText, { color: colors.mutedText }]}>{tOrFallback(language, '当前未见结构化合局数据。', 'No structured union analysis is available.')}</Text>
      </View>
    );
  }
  const hasFormedSanHe = analysis.patterns.some((pattern) => pattern.kind === '三合' && pattern.status === '成势');
  const displayPatterns = visibleUnionPatterns(analysis);
  const activePattern = displayPatterns[Math.min(activePatternIndex, Math.max(0, displayPatterns.length - 1))];
  const activeColor = activePattern?.element ? ELEMENT_COLORS[activePattern.element] ?? '#1f7a3f' : (hasFormedSanHe ? '#1f7a3f' : '#6f7f8f');
  const activeLightColor = activePattern?.element ? ELEMENT_LIGHT_COLORS[activePattern.element] ?? colors.cardMuted : colors.cardMuted;
  const heroTitle = unionHeroTitleText(activePattern, analysis, language);
  const heroSummary = unionHeroSummaryText(activePattern, analysis, language);
  const resultCircleText = unionResultCircleText(activePattern, hasFormedSanHe, language);
  return (
    <View style={styles.unionAnalysisWrap}>
      <View style={[styles.unionHeroCard, { backgroundColor: darkMode ? '#202024' : activeLightColor }]}>
        <Animated.View style={[styles.unionHeroHeader, { opacity: transitionProgress }]}>
          <View style={styles.unionHeroTitleWrap}>
            <Text style={[styles.unionTitle, language === 'en' ? styles.unionTitleEn : null, { color: colors.text }]}>{heroTitle}</Text>
            <Text style={[styles.unionText, { color: colors.mutedText }]}>{heroSummary}</Text>
          </View>
          <View style={[styles.unionResultCircle, { backgroundColor: activeColor }]}>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              style={[styles.unionResultCircleText, language === 'en' ? styles.unionResultCircleTextEn : null]}
            >
              {resultCircleText}
            </Text>
          </View>
        </Animated.View>
      </View>
      <UnionHexagramDiagram analysis={analysis} lines={lines} spiritAnalyses={spiritAnalyses} activeIndex={activePatternIndex} onChangeIndex={onRequestPatternIndex} transitionProgress={transitionProgress} />
      {displayPatterns.length ? displayPatterns.map((pattern) => <UnionPatternCard key={pattern.id} pattern={pattern} />) : (
        <View style={[styles.unionPatternCard, { backgroundColor: darkMode ? '#202024' : '#fff' }]}>
          <Text style={[styles.unionPatternName, { color: colors.text }]}>{language === 'en' ? 'No clear union pattern' : '未见明显合局'}</Text>
          <Text style={[styles.unionText, { color: colors.mutedText }]}>{language === 'en' ? 'No structured union signal is strong enough to anchor the reading.' : analysis.summary}</Text>
        </View>
      )}
    </View>
  );
}

function tOrFallback(language: 'zh' | 'en', zh: string, en: string) {
  return language === 'en' ? en : zh;
}

function ResultInfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  const { language } = useAppLanguage();
  return (
    <View style={styles.resultInfoRow}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[styles.resultInfoLabel, language === 'en' ? styles.resultInfoLabelWide : null, { color: colors.mutedText }]}
      >
        {label}
      </Text>
      <Text style={[styles.resultInfoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ReadingTimeline({
  reading,
  recordCreatedAt,
  notes,
  monthStemBranch,
  dayStemBranch,
}: {
  reading: AIReading;
  recordCreatedAt: string;
  notes: VerificationNote[];
  monthStemBranch: string;
  dayStemBranch: string;
}) {
  const { colors, darkMode } = useAppTheme();
  const { language, t } = useAppLanguage();
  const timeline = reading.timeline?.length
    ? reading.timeline
    : [{ type: 'cast', label: t('analysis.timelineCast'), time_text: recordCreatedAt, detail: undefined }];
  const baseItems = timeline.filter((item) => item.type !== 'note');
  const noteItems = notes.map((note) => {
    const sb = stemBranchOfDate(note.createdAt);
    return {
      type: 'note' as const,
      label: note.fulfilled ? t('analysis.fulfilled') : t('analysis.unfulfilled'),
      time_text: note.createdAt,
      fulfilled: note.fulfilled,
      stemBranch: sb,
    };
  });
  const items = [...baseItems, ...noteItems];
  const dotColorFor = (item: { type: string; fulfilled?: boolean }) => {
    if (item.type === 'expected') return '#d08a18';
    if (item.type === 'note') {
      if (item.fulfilled) return darkMode ? '#7fc6a6' : '#3f8a63';
      return darkMode ? '#a8a8a8' : '#888';
    }
    return darkMode ? '#5fb1ff' : '#2563c8';
  };
  const formatStemBranchMonthDay = (month: string, day: string) => {
    if (language === 'zh') return `${month}月 ${day}日`;
    return `${month} · ${day}`;
  };
  const [timelineWidth, setTimelineWidth] = useState(0);
  const minNodeWidth = 72;
  const nodeWidth = timelineWidth > 0 && items.length > 0
    ? Math.max(minNodeWidth, Math.floor(timelineWidth / items.length))
    : minNodeWidth;
  return (
    <View
      style={[styles.aiTimelineCard, { backgroundColor: darkMode ? '#172333' : '#e6f0f8' }]}
      onLayout={(event) => {
        const inner = event.nativeEvent.layout.width - 28;
        if (inner > 0 && Math.abs(inner - timelineWidth) > 0.5) setTimelineWidth(inner);
      }}
    >
      <Text style={[styles.aiSectionTitle, { color: colors.text }]}>{t('analysis.timelineTitle')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={items.length * minNodeWidth > timelineWidth}
        contentContainerStyle={styles.aiTimelineList}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          let label: string;
          let timeText: string;
          if (item.type === 'cast') {
            label = t('analysis.timelineCast');
            timeText = formatStemBranchMonthDay(monthStemBranch, dayStemBranch);
          } else if (item.type === 'note') {
            label = (item as typeof noteItems[number]).label;
            const sb = (item as typeof noteItems[number]).stemBranch;
            timeText = sb
              ? formatStemBranchMonthDay(sb.month, sb.day)
              : formatCompactDateTime(item.time_text, language) || item.time_text;
          } else if (item.type === 'expected') {
            label = t('analysis.timelineExpected');
            timeText = stripParentheticals(item.time_text);
          } else {
            label = (item as { label: string }).label;
            timeText = item.time_text;
          }
          return (
            <View key={`${item.type}-${index}-${item.time_text}`} style={[styles.aiTimelineNode, { width: nodeWidth }]}>
              <View style={styles.aiTimelineNodeHead}>
                <View style={[styles.aiTimelineDot, { backgroundColor: dotColorFor(item) }]} />
                {!isLast ? <View style={[styles.aiTimelineLine, { backgroundColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }]} /> : null}
              </View>
              <Text style={[styles.aiTimelineLabel, { color: colors.text }]} numberOfLines={language === 'en' ? 2 : 1}>{label}</Text>
              <Text style={[styles.aiTimelineTime, { color: colors.mutedText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{timeText}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function AIReadingLoader() {
  const { colors, darkMode } = useAppTheme();
  const { t } = useAppLanguage();
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const phase = useRef(new Animated.Value(0)).current;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phaseKeys: TranslationKey[] = [
    'analysis.aiPhase1',
    'analysis.aiPhase2',
    'analysis.aiPhase3',
    'analysis.aiPhase4',
  ];
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const orbitLoop = Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
    );
    pulseLoop.start();
    orbitLoop.start();
    return () => { pulseLoop.stop(); orbitLoop.stop(); };
  }, [pulse, orbit]);
  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phaseKeys.length);
      Animated.sequence([
        Animated.timing(phase, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(phase, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 1800);
    return () => clearInterval(id);
  }, [phase, phaseKeys.length]);
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const innerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] });
  const orbitRotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const phaseOpacity = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.2, 1] });
  const phaseTranslateY = phase.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const accentA = darkMode ? '#7aa6ff' : '#3a6dd1';
  const accentB = darkMode ? '#c98aff' : '#8a4dd1';
  const accentC = darkMode ? '#5fd2c2' : '#1f9c89';
  return (
    <View style={styles.aiLoaderShadow}>
      <View style={[styles.aiLoaderCard, { backgroundColor: darkMode ? '#16223a' : '#eef2fb' }]}>
        <LinearGradient
          colors={darkMode ? ['rgba(122,166,255,0.18)', 'rgba(201,138,255,0.10)', 'rgba(95,210,194,0.18)'] : ['rgba(58,109,209,0.14)', 'rgba(138,77,209,0.10)', 'rgba(31,156,137,0.14)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.aiLoaderOrb}>
          <Animated.View style={[styles.aiLoaderRing, { borderColor: accentA, transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <Animated.View style={[styles.aiLoaderRing, styles.aiLoaderRingDelay, { borderColor: accentB, transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <Animated.View style={[styles.aiLoaderOrbit, { transform: [{ rotate: orbitRotate }] }]}>
            <View style={[styles.aiLoaderSpark, { backgroundColor: accentA, top: 0, left: '50%', marginLeft: -3 }]} />
            <View style={[styles.aiLoaderSpark, { backgroundColor: accentB, bottom: 0, left: '50%', marginLeft: -3 }]} />
            <View style={[styles.aiLoaderSpark, { backgroundColor: accentC, left: 0, top: '50%', marginTop: -3 }]} />
            <View style={[styles.aiLoaderSpark, { backgroundColor: accentA, right: 0, top: '50%', marginTop: -3 }]} />
          </Animated.View>
          <Animated.View style={[styles.aiLoaderCore, { transform: [{ scale: innerScale }] }]}>
            <LinearGradient
              colors={[accentA, accentB]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiLoaderCoreFill}
            />
          </Animated.View>
        </View>
        <Text style={[styles.aiLoaderTitle, { color: colors.text }]}>{t('analysis.aiGenerating')}</Text>
        <Animated.Text
          style={[
            styles.aiLoaderPhase,
            { color: colors.mutedText, opacity: phaseOpacity, transform: [{ translateY: phaseTranslateY }] },
          ]}
          numberOfLines={3}
        >
          {t(phaseKeys[phaseIndex])}
        </Animated.Text>
      </View>
    </View>
  );
}

function AIRevealView({ index, children }: { index: number; children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 720,
      delay: 120 + index * 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, index]);
  return (
    <Animated.View style={{ opacity: progress }}>
      {children}
    </Animated.View>
  );
}

function AIReadingBlock({
  reading,
  saved,
  loading,
  error,
  recordCreatedAt,
  notes,
  onGenerate,
  onUpgrade,
  monthStemBranch,
  dayStemBranch,
  guestMode,
}: {
  reading?: AIReading;
  saved: boolean;
  loading: boolean;
  error?: string;
  recordCreatedAt: string;
  notes: VerificationNote[];
  onGenerate: () => void;
  onUpgrade: () => void;
  monthStemBranch: string;
  dayStemBranch: string;
  guestMode?: boolean;
}) {
  const { colors, darkMode } = useAppTheme();
  const { language, t } = useAppLanguage();
  const quotaReached = error === t('analysis.aiQuotaReached');
  if (guestMode) {
    return (
      <View style={[styles.aiReadingWrap, styles.aiReadingWrapFill]}>
        <View style={styles.aiEmptyShadow}>
          <View style={[styles.aiEmptyCardFill, { backgroundColor: darkMode ? '#172333' : '#e6f0f8' }]}>
            <Text style={[styles.aiEmptyTitle, { color: colors.text }]}>{t('analysis.guestUnavailableTitle')}</Text>
            <Text style={[styles.aiEmptyBody, { color: colors.mutedText }]}>{t('analysis.guestUnavailableBody')}</Text>
          </View>
        </View>
      </View>
    );
  }
  if (loading && !reading) {
    return (
      <View style={[styles.aiReadingWrap, styles.aiReadingWrapFill]}>
        <AIReadingLoader />
        {error ? <Text style={styles.aiErrorText}>{error}</Text> : null}
      </View>
    );
  }
  if (!reading) {
    return (
      <View style={styles.aiReadingWrap}>
        <View style={[styles.aiEmptyCard, { backgroundColor: darkMode ? '#172333' : '#e6f0f8' }]}>
          <Text style={[styles.aiEmptyTitle, { color: colors.text }]}>{t('analysis.aiEmptyTitle')}</Text>
          {!quotaReached ? (
            <Text style={[styles.aiEmptyBody, { color: colors.mutedText }]}>
              {saved ? t('analysis.aiEmptyBody') : t('analysis.aiUnsavedBody')}
            </Text>
          ) : null}
          {error ? <Text style={styles.aiErrorText}>{error}</Text> : null}
          <Pressable
            disabled={!quotaReached && (!saved || loading)}
            style={[styles.aiGenerateButton, { backgroundColor: (quotaReached || (saved && !loading)) ? colors.inverse : colors.divider }]}
            onPress={quotaReached ? onUpgrade : onGenerate}
          >
            <Text style={[styles.aiGenerateButtonText, { color: (quotaReached || (saved && !loading)) ? colors.inverseText : colors.faintText }]}>
              {quotaReached ? t('analysis.upgradeMembership') : loading ? t('analysis.aiGenerating') : t('analysis.aiGenerate')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.aiReadingWrap}>
      <AIRevealView index={0}>
        <View style={styles.aiVerdictShadow}>
          <View style={[styles.aiVerdictCard, { backgroundColor: darkMode ? '#11291d' : '#dceee1' }]}>
            <LinearGradient
              colors={darkMode ? ['rgba(95,210,194,0.18)', 'rgba(122,166,255,0.10)'] : ['rgba(31,156,137,0.16)', 'rgba(58,109,209,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.aiVerdictHeader}>
              <Text style={[styles.aiVerdictLabel, { color: colors.mutedText }]}>{t('analysis.aiVerdict')}</Text>
            </View>
            <Text
              style={[styles.aiVerdictText, language === 'en' ? styles.aiVerdictTextEn : null, { color: colors.text }]}
              adjustsFontSizeToFit={language === 'en'}
              minimumFontScale={0.7}
            >
              {reading.verdict}
            </Text>
          </View>
        </View>
      </AIRevealView>
      <AIRevealView index={1}>
        <ReadingTimeline
          reading={reading}
          recordCreatedAt={recordCreatedAt}
          notes={notes}
          monthStemBranch={monthStemBranch}
          dayStemBranch={dayStemBranch}
        />
      </AIRevealView>
      <View style={styles.aiPointList}>
        {reading.points.map((point, index) => {
          const inferred = inferElementFromText(`${point.claim} ${point.evidence.join(' ')} ${point.explanation}`);
          const element = inferred ?? ELEMENT_ORDER[index % ELEMENT_ORDER.length];
          const cardBg = darkMode
            ? ELEMENT_DARK_COLORS[element] ?? colors.cardMuted
            : ELEMENT_LIGHT_COLORS[element] ?? colors.cardMuted;
          const tagBg = darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
          return (
            <AIRevealView key={`${point.claim}-${index}`} index={2 + index}>
              <View style={[styles.aiPointCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.aiPointTitle, { color: colors.text }]}>{point.claim}</Text>
                <View style={styles.aiEvidenceRow}>
                  {point.evidence.slice(0, 2).map((evidence) => (
                    <Text
                      key={evidence}
                      numberOfLines={1}
                      style={[styles.aiEvidenceTag, { color: colors.text, backgroundColor: tagBg }]}
                    >
                      {evidence}
                    </Text>
                  ))}
                </View>
                <Text style={[styles.aiPointExplanation, { color: colors.mutedText }]}>{point.explanation}</Text>
              </View>
            </AIRevealView>
          );
        })}
      </View>
      {error ? <Text style={styles.aiErrorText}>{error}</Text> : null}
    </View>
  );
}

function VerificationNoteCard({
  note,
  deleteArmed,
  onArmDelete,
  onUpdate,
  onDelete,
  onFocus,
  language,
  onMeasured,
  onLayoutY,
  keyboardLift,
  keyboardVisible,
}: {
  note: VerificationNote;
  deleteArmed: boolean;
  onArmDelete: (id: number) => void;
  onUpdate: (id: number, patch: Partial<VerificationNote>) => void;
  onDelete: (id: number) => void;
  onFocus: () => void;
  onMeasured?: (height: number) => void;
  onLayoutY?: (y: number, height: number) => void;
  keyboardLift?: Animated.AnimatedInterpolation<number> | Animated.Value;
  keyboardVisible?: boolean;
  language: 'zh' | 'en';
}) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const mountProgress = useRef(new Animated.Value(0)).current;
  const switchProgress = useRef(new Animated.Value(note.fulfilled ? 1 : 0)).current;
  const deleteProgress = useRef(new Animated.Value(deleteArmed ? 1 : 0)).current;
  const [switchWidth, setSwitchWidth] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const indicatorWidth = Math.max(0, (switchWidth - 6) / 2);
  const indicatorTranslateX = switchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [indicatorWidth, 0],
  });
  const fulfilledOpacity = switchProgress;
  const unfulfilledOpacity = switchProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const deleteBackgroundScale = deleteProgress.interpolate({ inputRange: [0, 1], outputRange: [0.74, 1] });
  const deleteBlackOpacity = deleteProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const deleteRedOpacity = deleteProgress;

  useEffect(() => {
    mountProgress.setValue(0);
    Animated.timing(mountProgress, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mountProgress]);

  useEffect(() => {
    Animated.timing(switchProgress, {
      toValue: note.fulfilled ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [note.fulfilled, switchProgress]);

  useEffect(() => {
    Animated.timing(deleteProgress, {
      toValue: deleteArmed ? 1 : 0,
      duration: deleteArmed ? 180 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [deleteArmed, deleteProgress]);

  const opacity = mountProgress;
  const handleDeletePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!deleteArmed) {
      onArmDelete(note.id);
      return;
    }
    Animated.timing(mountProgress, {
      toValue: 0,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDelete(note.id);
    });
  };

  return (
    <Animated.View
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        onMeasured?.(height);
        onLayoutY?.(y, height);
      }}
      style={[styles.resultNoteCard, { opacity, transform: keyboardLift ? [{ translateY: keyboardLift }] : undefined }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.resultNoteBackground,
          { backgroundColor: darkMode ? '#321916' : '#f4ddd7', opacity: unfulfilledOpacity },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.resultNoteBackground,
          { backgroundColor: darkMode ? '#11291d' : '#dceee1', opacity: fulfilledOpacity },
        ]}
      />
      <View style={styles.resultNoteHeader}>
        <View>
          <Text style={[styles.unionTitle, { color: colors.text }]}>{t('analysis.note')}</Text>
          <Text style={[styles.resultNoteTime, { color: colors.faintText }]}>{formatCompactDateTime(note.createdAt, language)}</Text>
        </View>
        <Pressable style={styles.deleteIconButton} onPress={handleDeletePress}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.deleteIconBackground,
              {
                opacity: deleteProgress,
                transform: [{ scale: deleteBackgroundScale }],
              },
            ]}
          />
          <Animated.Text pointerEvents="none" style={[styles.deleteIconText, { color: colors.text, opacity: deleteBlackOpacity }]}>×</Animated.Text>
          <Animated.Text pointerEvents="none" style={[styles.deleteIconText, styles.deleteIconTextArmed, styles.deleteIconOverlayText, { opacity: deleteRedOpacity }]}>×</Animated.Text>
        </Pressable>
      </View>
      <View
        style={[styles.fulfillmentSwitchRow, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
        onLayout={(event) => setSwitchWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fulfillmentSwitchIndicator,
            {
              backgroundColor: colors.card,
              width: indicatorWidth,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />
        <Pressable
          style={styles.fulfillmentSwitchOption}
          onPress={(event) => {
            event.stopPropagation();
            onUpdate(note.id, { fulfilled: true });
          }}
        >
          <Text style={[styles.fulfillmentSwitchText, { color: note.fulfilled ? colors.text : colors.mutedText }]}>{t('analysis.fulfilled')}</Text>
        </Pressable>
        <Pressable
          style={styles.fulfillmentSwitchOption}
          onPress={(event) => {
            event.stopPropagation();
            onUpdate(note.id, { fulfilled: false });
          }}
        >
          <Text style={[styles.fulfillmentSwitchText, { color: !note.fulfilled ? colors.text : colors.mutedText }]}>{t('analysis.unfulfilled')}</Text>
        </Pressable>
      </View>
      <Pressable style={styles.resultNoteInputWrap} onPress={(event) => event.stopPropagation()}>
        <TextInput
          value={note.note}
          onChangeText={(text) => onUpdate(note.id, { note: text })}
          onFocus={() => { setIsFocused(true); onFocus(); }}
          onBlur={() => setIsFocused(false)}
          placeholder={t('analysis.notePlaceholder')}
          placeholderTextColor={colors.faintText}
          multiline
          textAlignVertical="top"
          style={[styles.resultNoteInput, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)', color: colors.text }]}
        />
        {keyboardVisible && !isFocused ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => Keyboard.dismiss()}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function VerificationNoteMeasureCard({ onMeasured }: { onMeasured: (height: number) => void }) {
  const { darkMode, colors } = useAppTheme();
  const { t, language } = useAppLanguage();
  return (
    <View
      pointerEvents="none"
      style={styles.resultNoteMeasureCard}
      onLayout={(event) => {
        const height = event.nativeEvent.layout.height;
        if (height > 0) onMeasured(height);
      }}
    >
      <View style={styles.resultNoteCard}>
        <View style={[styles.resultNoteBackground, { backgroundColor: darkMode ? '#11291d' : '#dceee1' }]} />
        <View style={styles.resultNoteHeader}>
          <View>
            <Text style={[styles.unionTitle, { color: colors.text }]}>{t('analysis.note')}</Text>
            <Text style={[styles.resultNoteTime, { color: colors.faintText }]}>{formatCompactDateTime(new Date(), language)}</Text>
          </View>
          <View style={styles.deleteIconButton}>
            <Text style={[styles.deleteIconText, { color: colors.text }]}>×</Text>
          </View>
        </View>
        <View style={[styles.fulfillmentSwitchRow, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={styles.fulfillmentSwitchOption}>
            <Text style={[styles.fulfillmentSwitchText, { color: colors.text }]}>{t('analysis.fulfilled')}</Text>
          </View>
          <View style={styles.fulfillmentSwitchOption}>
            <Text style={[styles.fulfillmentSwitchText, { color: colors.mutedText }]}>{t('analysis.unfulfilled')}</Text>
          </View>
        </View>
        <View style={styles.resultNoteInputWrap}>
          <TextInput
            value=""
            editable={false}
            placeholder={t('analysis.notePlaceholder')}
            placeholderTextColor={colors.faintText}
            multiline
            textAlignVertical="top"
            style={[styles.resultNoteInput, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)', color: colors.text }]}
          />
        </View>
      </View>
    </View>
  );
}

function SpiritRipple({ progress }: { progress: Animated.Value }) {
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.62, 1], outputRange: [0, 1, 0.78, 0] });
  const scaleX = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const scaleY = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spiritRipple,
        {
          opacity,
          transform: [{ scaleX }, { scaleY }],
        },
      ]}
    />
  );
}

function shortHexagramName(name?: string) {
  if (!name) return '';
  if (name.includes('为')) {
    return name.replace('为', '');
  }
  return name.slice(2);
}

function hexagramPalaceText(name: string | undefined, recordHexagram: Props['route']['params']['record']['hexagram']) {
  if (!name) return '';
  if (name === recordHexagram.name) return `${recordHexagram.palace}宫`;
  if (name === recordHexagram.changedName) return `${recordHexagram.changedPalace ?? ''}宫`;
  return '';
}

function HexLine({ line, muted = false, highlightColor, yinGap }: { line: HexagramLine; muted?: boolean; highlightColor?: string; yinGap?: number }) {
  const { colors } = useAppTheme();
  return <RawHexLine yinYang={line.yinYang} muted={muted} highlightColor={highlightColor} defaultColor={colors.text} mutedColor={colors.faintText} yinGap={yinGap} />;
}

function RawHexLine({ yinYang, muted = false, highlightColor, defaultColor = '#000', mutedColor = '#555', yinGap }: { yinYang: YinYang; muted?: boolean; highlightColor?: string; defaultColor?: string; mutedColor?: string; yinGap?: number }) {
  const strokeStyle = { backgroundColor: highlightColor ?? (muted ? mutedColor : defaultColor) };
  if (yinYang === 'yin') {
    return (
      <View style={[styles.brokenWrap, yinGap === undefined ? null : { gap: yinGap }]}>
        <View style={[styles.strokeHalf, strokeStyle]} />
        <View style={[styles.strokeHalf, strokeStyle]} />
      </View>
    );
  }
  return <View style={[styles.strokeFull, strokeStyle]} />;
}

function ElementalStatusBadge({ status, specialStatus }: { status?: string; specialStatus?: string }) {
  const { language } = useAppLanguage();
  if (specialStatus === '月破') {
    return (
      <View style={[styles.statusBadge, styles.monthBreakBadge]}>
        <Text style={styles.monthBreakText}>破</Text>
      </View>
    );
  }

  if (specialStatus === '暗动') {
    return (
      <View style={[styles.statusBadge, styles.hiddenMoveBadge]}>
        <Text style={styles.hiddenMoveText}>暗</Text>
      </View>
    );
  }

  if (specialStatus === '旬空') {
    return (
      <View style={[styles.statusBadge, styles.voidBadge]}>
        <Text style={styles.voidStatusText}>空</Text>
      </View>
    );
  }

  const normalizedStatus = status && STATUS_COLORS[status] ? status : '休';
  const colors = STATUS_COLORS[normalizedStatus];
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.background }]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.46}
        style={[styles.statusBadgeText, { color: colors.text }]}
      >
        {normalizedStatus}
      </Text>
    </View>
  );
}

function HexPairRow({
  baseLine,
  changedLine,
  hasChanged,
  previousChanged,
  nextChanged,
  showChanged,
  statusColumnWidth,
  statusVisualProgress,
  unchangedChangedLinesProgress,
  metaOpacity,
  metaTranslateX,
  baseMotionLineRef,
  changedMotionLineRef,
  annotationOpacity,
  mode,
  onToggleMode,
  onToggleUnchangedChangedLines,
  activeHiddenSpiritIndex,
  hiddenSpiritOverlayProgress,
  onShowHiddenSpirit,
  onHideHiddenSpirit,
  useGodLineIndexes,
  useGodHiddenLineIndexes,
  useGodColor,
  finalYinGap,
  spiritAnalyses,
  ripples,
  language,
}: {
  baseLine: HexagramLine;
  changedLine: HexagramLine;
  hasChanged: boolean;
  previousChanged: boolean;
  nextChanged: boolean;
  showChanged: boolean;
  statusColumnWidth: Animated.Value;
  statusVisualProgress: Animated.Value;
  unchangedChangedLinesProgress: Animated.Value;
  metaOpacity: Animated.Value;
  metaTranslateX: Animated.Value;
  baseMotionLineRef?: (node: View | null) => void;
  changedMotionLineRef?: (node: View | null) => void;
  annotationOpacity: Animated.Value;
  mode: MetaMode;
  onToggleMode: () => void;
  onToggleUnchangedChangedLines: () => void;
  activeHiddenSpiritIndex?: number;
  hiddenSpiritOverlayProgress: Animated.Value;
  onShowHiddenSpirit: (line: HexagramLine) => void;
  onHideHiddenSpirit: () => void;
  useGodLineIndexes: number[];
  useGodHiddenLineIndexes: number[];
  useGodColor: string;
  finalYinGap: number;
  spiritAnalyses: SpiritAnalysis[];
  ripples: SpiritRippleItem[];
  language: 'zh' | 'en';
}) {
  const { darkMode, colors } = useAppTheme();
  const meta = metaTextForMode(baseLine, mode, language);
  const changedMeta = metaTextForMode(changedLine, mode, language);
  const metaWidth = language === 'en' ? META_COLUMN_WIDTH_EN : META_COLUMN_WIDTH;
  const changedLineOpacity = hasChanged ? 1 : unchangedChangedLinesProgress;
  const statusScale = statusVisualProgress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const isHiddenSpiritActive = activeHiddenSpiritIndex === baseLine.index;
  const hiddenOverlayOpacity = isHiddenSpiritActive ? hiddenSpiritOverlayProgress : 0;
  const hiddenOverlayTranslateX = hiddenSpiritOverlayProgress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });
  const hiddenOverlayTranslateY = hiddenSpiritOverlayProgress.interpolate({ inputRange: [0, 1], outputRange: [20, 32] });
  const canShowHiddenSpirit = hasEffectiveHiddenSpirit(baseLine);
  const hiddenSpirit = baseLine.hiddenSpirit;
  const hiddenMeta = hiddenSpiritMetaForMode(baseLine, mode, language);
  const spiritColor = spiritLineColor(baseLine.index, false, spiritAnalyses);
  const hiddenSpiritColor = spiritLineColor(baseLine.index, true, spiritAnalyses);
  const roleColumnLabels = roleLabels(baseLine, spiritAnalyses, language);
  const baseRipples = ripples.filter((ripple) => ripple.lineIndex === baseLine.index && !ripple.isHidden);
  const hiddenRipples = ripples.filter((ripple) => ripple.lineIndex === baseLine.index && ripple.isHidden);
  const rowStyle = [styles.hexLineRow, (baseRipples.length > 0 || hiddenRipples.length > 0 || isHiddenSpiritActive) ? styles.hexLineRowActive : null];
  const content = (
    <View style={rowStyle}>
      {hasChanged ? (
        <LinearGradient
          pointerEvents="none"
          colors={darkMode
            ? ['rgba(24,24,27,0)', 'rgba(146,93,30,0.22)', 'rgba(206,132,42,0.36)', 'rgba(146,93,30,0.22)', 'rgba(24,24,27,0)']
            : ['#ffffff', '#fff8d6', '#fff0a8', '#fff8d6', '#ffffff']
          }
          locations={[0, 0.12, 0.5, 0.88, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            styles.changedHighlightBackground,
            previousChanged ? styles.changedHighlightConnectedTop : null,
            nextChanged ? styles.changedHighlightConnectedBottom : null,
          ]}
        />
      ) : null}
      <View style={styles.roleColumn}>
        <Animated.View style={[styles.roleLabelRow, { opacity: annotationOpacity }]}>
          {roleColumnLabels.map((label) => (
            <Text key={label} style={[styles.roleText, { color: colors.text }]}>{label}</Text>
          ))}
        </Animated.View>
      </View>
      <View style={styles.hexGroup}>
        <Pressable
          style={styles.hexColumn}
          onPressIn={canShowHiddenSpirit ? () => onShowHiddenSpirit(baseLine) : undefined}
          onPressOut={canShowHiddenSpirit ? onHideHiddenSpirit : undefined}
          disabled={!canShowHiddenSpirit}
        >
          <View ref={baseMotionLineRef} collapsable={false} style={styles.hexMotionMeasure}>
            <View pointerEvents="none" style={styles.rippleAnchor}>
              {baseRipples.map((ripple) => <SpiritRipple key={ripple.id} progress={ripple.progress} />)}
            </View>
            <HexLine line={baseLine} muted={canShowHiddenSpirit} highlightColor={spiritColor} yinGap={finalYinGap} />
          </View>
        </Pressable>
        <Animated.View style={[styles.statusColumn, { width: statusColumnWidth }]}>
          <Animated.View style={{ opacity: Animated.multiply(annotationOpacity, statusVisualProgress), transform: [{ scale: statusScale }] }}>
            <ElementalStatusBadge status={baseLine.elementalStatus} specialStatus={baseLine.specialStatus} />
          </Animated.View>
        </Animated.View>
        <Pressable style={[styles.metaColumn, { width: metaWidth }]} onPress={onToggleMode}>
          <MetaDisplaySwitcher meta={meta} translateX={metaTranslateX} opacity={Animated.multiply(annotationOpacity, metaOpacity)} width={metaWidth} />
        </Pressable>
      </View>
      {canShowHiddenSpirit && !showChanged && hiddenSpirit && isHiddenSpiritActive ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hiddenSpiritDownRow,
            {
              transform: [{ translateY: hiddenOverlayTranslateY }],
            },
          ]}
        >
          <Animated.View style={[styles.hiddenSpiritBackground, { opacity: hiddenOverlayOpacity }]} />
          <View style={[styles.roleColumn, styles.hiddenSpiritForeground]} />
          <View style={[styles.hexGroup, styles.hiddenSpiritForeground]}>
            <View style={styles.hexColumn}>
              <Animated.View style={styles.hiddenSpiritLineContent}>
                <View pointerEvents="none" style={styles.rippleAnchor}>
                  {hiddenRipples.map((ripple) => <SpiritRipple key={ripple.id} progress={ripple.progress} />)}
                </View>
                <Animated.View style={{ opacity: hiddenOverlayOpacity }}>
                  <RawHexLine yinYang={hiddenSpirit.yinYang} muted={!hiddenSpiritColor} highlightColor={hiddenSpiritColor} yinGap={finalYinGap} />
                </Animated.View>
              </Animated.View>
            </View>
            <Animated.View style={[styles.statusColumn, { width: statusColumnWidth }]}>
              <Animated.View style={{ opacity: Animated.multiply(Animated.multiply(annotationOpacity, statusVisualProgress), hiddenOverlayOpacity), transform: [{ scale: statusScale }] }}>
                <ElementalStatusBadge status={hiddenSpirit.elementalStatus} specialStatus={hiddenSpirit.specialStatus} />
              </Animated.View>
            </Animated.View>
            <Pressable style={[styles.metaColumn, styles.hiddenSpiritMetaColumn, { width: metaWidth }]} onPress={onToggleMode}>
              <MetaDisplaySwitcher
                meta={hiddenMeta}
                translateX={metaTranslateX}
                opacity={Animated.multiply(Animated.multiply(annotationOpacity, metaOpacity), hiddenOverlayOpacity)}
                primaryStyle={styles.hiddenSpiritMetaPrimary}
                secondaryStyle={styles.hiddenSpiritMetaSecondary}
                fitText
                width={metaWidth}
              />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
      {showChanged ? (
        <View style={styles.hexGroup}>
          {hiddenSpirit && isHiddenSpiritActive ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.hiddenSpiritOverlay,
                {
                  transform: [{ translateX: hiddenOverlayTranslateX }],
                },
              ]}
            >
              <Animated.View style={[styles.hiddenSpiritBackground, { opacity: hiddenOverlayOpacity }]} />
              <View style={[styles.hexColumn, styles.hiddenSpiritForeground]}>
                <Animated.View style={styles.hiddenSpiritLineContent}>
                  <View pointerEvents="none" style={styles.rippleAnchor}>
                    {hiddenRipples.map((ripple) => <SpiritRipple key={ripple.id} progress={ripple.progress} />)}
                  </View>
                  <Animated.View style={{ opacity: hiddenOverlayOpacity }}>
                    <RawHexLine yinYang={hiddenSpirit.yinYang} muted={!hiddenSpiritColor} highlightColor={hiddenSpiritColor} yinGap={finalYinGap} />
                  </Animated.View>
                </Animated.View>
              </View>
              <Animated.View style={[styles.statusColumn, { width: statusColumnWidth }]}>
                <Animated.View style={{ opacity: Animated.multiply(Animated.multiply(annotationOpacity, statusVisualProgress), hiddenOverlayOpacity), transform: [{ scale: statusScale }] }}>
                  <ElementalStatusBadge status={hiddenSpirit.elementalStatus} specialStatus={hiddenSpirit.specialStatus} />
                </Animated.View>
              </Animated.View>
              <Pressable style={[styles.metaColumn, styles.hiddenSpiritMetaColumn, { width: metaWidth }]} onPress={onToggleMode}>
                <MetaDisplaySwitcher
                  meta={hiddenMeta}
                  translateX={metaTranslateX}
                  opacity={Animated.multiply(Animated.multiply(annotationOpacity, metaOpacity), hiddenOverlayOpacity)}
                  primaryStyle={styles.hiddenSpiritMetaPrimary}
                  secondaryStyle={styles.hiddenSpiritMetaSecondary}
                  fitText
                  width={metaWidth}
                />
              </Pressable>
            </Animated.View>
          ) : null}
          <Pressable
            style={styles.hexColumn}
            onPress={!hasChanged ? onToggleUnchangedChangedLines : undefined}
            disabled={hasChanged}
          >
            <Animated.View ref={changedMotionLineRef} collapsable={false} style={[styles.hexMotionMeasure, { opacity: changedLineOpacity }]}>
              <HexLine line={changedLine} yinGap={finalYinGap} />
            </Animated.View>
          </Pressable>
          <Animated.View style={[styles.statusColumn, { width: statusColumnWidth }]}>
            <Animated.View style={{ opacity: Animated.multiply(Animated.multiply(annotationOpacity, statusVisualProgress), changedLineOpacity), transform: [{ scale: statusScale }] }}>
              <ElementalStatusBadge status={changedLine.elementalStatus} specialStatus={changedLine.specialStatus} />
            </Animated.View>
          </Animated.View>
          <Pressable style={[styles.metaColumn, { width: metaWidth }]} onPress={onToggleMode}>
            <MetaDisplaySwitcher
              meta={changedMeta}
              translateX={metaTranslateX}
              opacity={Animated.multiply(Animated.multiply(annotationOpacity, metaOpacity), changedLineOpacity)}
              width={metaWidth}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return content;
}

export function AnalysisScreen({ navigation, route }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const { record } = route.params;
  const fromHistory = route.params.fromHistory === true;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [metaMode, setMetaMode] = useState<MetaMode>('sixKin');
  const [showStatus, setShowStatus] = useState(false);
  const [hideUnchangedChangedLines, setHideUnchangedChangedLines] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [activeHiddenSpiritIndex, setActiveHiddenSpiritIndex] = useState<number | undefined>();
  const [selectedHexagramTextName, setSelectedHexagramTextName] = useState<string | undefined>();
  const [visibleHexagramTextName, setVisibleHexagramTextName] = useState<string | undefined>();
  const [hexagramTextAnchor, setHexagramTextAnchor] = useState({ x: 20, y: 120 });
  const [fullTextHexagramName, setFullTextHexagramName] = useState<string | undefined>();
  const [selectedSpiritAnalysis, setSelectedSpiritAnalysis] = useState<SpiritAnalysis | undefined>();
  const [spiritReasonAnchor, setSpiritReasonAnchor] = useState({ x: 20, y: 120 });
  const [spiritRipples, setSpiritRipples] = useState<SpiritRippleItem[]>([]);
  const [activeUnionPatternIndex, setActiveUnionPatternIndex] = useState(0);
  const [selectedTextSection, setSelectedTextSection] = useState<HexagramTextSection>('judgment');
  const keyboardBottomPad = useRef(new Animated.Value(0)).current;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState<VerificationNote[]>(record.verificationNotes ?? []);
  const verificationNotesRef = useRef<VerificationNote[]>(record.verificationNotes ?? []);
  const [aiReading, setAiReading] = useState<AIReading | undefined>(record.analysis.aiReadingStructured);
  const [aiReadingLoading, setAiReadingLoading] = useState(false);
  const [aiReadingError, setAiReadingError] = useState<string | undefined>();
  const [pendingVerificationNote, setPendingVerificationNote] = useState<VerificationNote | undefined>();
  const [armedDeleteNoteId, setArmedDeleteNoteId] = useState<number | undefined>();
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [moreMenuMounted, setMoreMenuMounted] = useState(false);
  const [savedRecord, setSavedRecord] = useState(fromHistory);
  const savedRecordRef = useRef(fromHistory);
  const [favorite, setFavorite] = useState(Boolean(record.favorite));
  const favoriteVisualProgress = useRef(new Animated.Value(record.favorite ? 1 : 0)).current;
  const saveToastProgress = useRef(new Animated.Value(0)).current;
  const [unsavedPromptVisible, setUnsavedPromptVisible] = useState(false);
  const [finalYinGap, setFinalYinGap] = useState(INTRO_YIN_GAP);
  const [guestMode, setGuestMode] = useState(false);
  useEffect(() => { isGuestMode().then(setGuestMode); }, []);
  const unionTransitionProgress = useRef(new Animated.Value(1)).current;
  const unionTransitioningRef = useRef(false);
  const unionTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusVisualProgress = useRef(new Animated.Value(0)).current;
  const statusColumnWidth = useRef(new Animated.Value(0)).current;
  const unchangedChangedLinesProgress = useRef(new Animated.Value(1)).current;
  const metaOpacity = useRef(new Animated.Value(1)).current;
  const metaTranslateX = useRef(new Animated.Value(0)).current;
  const metaSwitching = useRef(false);
  const hiddenSpiritOverlayProgress = useRef(new Animated.Value(0)).current;
  const analysisPageScrollX = useRef(new Animated.Value(0)).current;
  const analysisPagerRef = useRef<ScrollView | null>(null);
  const dividerCollapseProgress = useRef(new Animated.Value(0)).current;
  const dividerCollapseValue = useRef(0);
  const dividerGripOpacity = useRef(new Animated.Value(0)).current;
  const fullTextScrollX = useRef(new Animated.Value(0)).current;
  const fullTextPagerRef = useRef<ScrollView | null>(null);
  const hiddenSpiritAutoHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hiddenSpiritAutoHideToken = useRef(0);
  const rippleIdRef = useRef(0);
  const edgeBackGestureActive = useRef(false);
  const introBaseOpacity = useRef(new Animated.Value(0)).current;
  const introTransitionOpacity = useRef(new Animated.Value(0)).current;
  const introChangedOpacity = useRef(new Animated.Value(0)).current;
  const introTextOpacity = useRef(new Animated.Value(1)).current;
  const introHexOpacity = useRef(new Animated.Value(0)).current;
  const introBaseHexScaleX = useRef(new Animated.Value(0.92)).current;
  const introBaseHexScaleY = useRef(new Animated.Value(0.92)).current;
  const introBaseHexTranslateX = useRef(new Animated.Value(0)).current;
  const introBaseHexTranslateY = useRef(new Animated.Value(0)).current;
  const introChangedHexScaleX = useRef(new Animated.Value(0.92)).current;
  const introChangedHexScaleY = useRef(new Animated.Value(0.92)).current;
  const introChangedHexTranslateX = useRef(new Animated.Value(0)).current;
  const introChangedHexTranslateY = useRef(new Animated.Value(0)).current;
  const introOverlayOpacity = useRef(new Animated.Value(1)).current;
  const mainOpacity = useRef(new Animated.Value(0)).current;
  const noteInsertSpacerHeight = useRef(new Animated.Value(0)).current;
  const noteKeyboardLift = useRef(new Animated.Value(0)).current;
  const moreMenuProgress = useRef(new Animated.Value(0)).current;
  const moreBackdropProgress = useRef(new Animated.Value(0)).current;
  const measuredNoteCardHeight = useRef(ESTIMATED_RESULT_NOTE_CARD_HEIGHT);
  const noteScrollRef = useRef<ScrollView | null>(null);
  const noteScrollHeightRef = useRef(0);
  const noteCardYRef = useRef<Record<number, number>>({});
  const noteCardHeightRef = useRef<Record<number, number>>({});
  const keyboardHeightRef = useRef(0);
  const focusedNoteIdRef = useRef<number | undefined>(undefined);
  const addingNoteRef = useRef(false);
  const introBaseHexRef = useRef<View | null>(null);
  const introChangedHexRef = useRef<View | null>(null);
  const baseFinalTopLineRef = useRef<View | null>(null);
  const baseFinalBottomLineRef = useRef<View | null>(null);
  const changedFinalTopLineRef = useRef<View | null>(null);
  const changedFinalBottomLineRef = useRef<View | null>(null);
  const hasChangedHexagram = record.hexagram.movingLineIndexes.length > 0;
  const baseShortName = shortHexagramName(record.hexagram.name);
  const changedShortName = shortHexagramName(record.hexagram.changedName);
  const useGodLineIndexes = record.analysis.useGodLineIndexes ?? [];
  const useGodHiddenLineIndexes = record.analysis.useGodHiddenLineIndexes ?? [];
  const firstUseGodLine = record.hexagram.lines.find((line) => useGodLineIndexes.includes(line.index));
  const firstHiddenUseGodLine = record.hexagram.lines.find((line) => useGodHiddenLineIndexes.includes(line.index));
  const useGodColor = firstUseGodLine
    ? lineColor(firstUseGodLine)
    : firstHiddenUseGodLine?.hiddenSpirit
      ? ELEMENT_COLORS[firstHiddenUseGodLine.hiddenSpirit.branchElement] ?? '#0b3d91'
      : '#0b3d91';
  const selectedHexagramText = hexagramTextFor(visibleHexagramTextName);
  const fullHexagramText = hexagramTextFor(fullTextHexagramName);
  const selectedHexagramPalace = hexagramPalaceText(visibleHexagramTextName, record.hexagram);
  const fullTextHexagramPalace = hexagramPalaceText(fullTextHexagramName, record.hexagram);
  const spiritAnalyses = record.analysis.spiritAnalyses ?? [];
  const hasHexagramMarks = Boolean(record.hexagram.marks?.length || (hasChangedHexagram && record.hexagram.changedMarks?.length));
  const analysisPageWidth = windowWidth;
  const fullTextPageWidth = Math.min(420, windowWidth - 44);
  const collapsibleHeight = dividerCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSIBLE_TOP_HEIGHT, 0],
    extrapolate: 'clamp',
  });
  const collapsibleOpacity = dividerCollapseProgress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  const markRecordSaved = () => {
    savedRecordRef.current = true;
    setSavedRecord(true);
  };

  const syncVerificationNotes = (updater: (notes: VerificationNote[]) => VerificationNote[]) => {
    setVerificationNotes((notes) => {
      const nextNotes = updater(notes);
      verificationNotesRef.current = nextNotes;
      return nextNotes;
    });
  };

  async function saveRecordWithNotes(notes: VerificationNote[]) {
    const saved = await saveRecord({
      ...record,
      analysis: { ...record.analysis, aiReadingStructured: aiReading },
      favorite,
      verificationNotes: notes,
    });
    if (saved.analysis.aiReadingStructured) setAiReading(saved.analysis.aiReadingStructured);
    markRecordSaved();
  }

  useEffect(() => {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
  }, []);

  useEffect(() => () => {
    if (unionTransitionTimerRef.current) {
      clearTimeout(unionTransitionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const scrollFocusedIntoView = (keyboardHeight: number) => {
      const noteId = focusedNoteIdRef.current;
      if (noteId === undefined) return;
      const cardY = noteCardYRef.current[noteId];
      const cardH = noteCardHeightRef.current[noteId] ?? measuredNoteCardHeight.current;
      if (cardY === undefined) return;
      const scrollHeight = noteScrollHeightRef.current || (windowHeight - insets.top);
      const visibleHeight = scrollHeight - keyboardHeight;
      const margin = 24;
      const targetY = Math.max(0, cardY + cardH + margin - visibleHeight);
      noteScrollRef.current?.scrollTo({ y: targetY, animated: true });
    };
    const showSubscription = Keyboard.addListener('keyboardWillShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardVisible(true);
      Animated.timing(keyboardBottomPad, {
        toValue: event.endCoordinates.height,
        duration: event.duration || 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      const lift = -Math.min(Math.max(0, event.endCoordinates.height - insets.bottom) * 0.18, 80);
      Animated.timing(noteKeyboardLift, {
        toValue: lift,
        duration: event.duration || 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      scrollFocusedIntoView(event.endCoordinates.height);
    });
    const didShowSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      keyboardBottomPad.setValue(event.endCoordinates.height);
      scrollFocusedIntoView(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardWillHide', (event) => {
      keyboardHeightRef.current = 0;
      setKeyboardVisible(false);
      Animated.timing(keyboardBottomPad, {
        toValue: 0,
        duration: event.duration || 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      Animated.timing(noteKeyboardLift, {
        toValue: 0,
        duration: event.duration || 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    const didHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      saveRecordWithNotes(verificationNotesRef.current);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      didShowSubscription.remove();
      didHideSubscription.remove();
    };
  }, [insets.top, windowHeight]);

  const measureInWindow = useCallback((node: View | null) =>
    new Promise<LayoutRect | undefined>((resolve) => {
      if (!node) {
        resolve(undefined);
        return;
      }
      node.measureInWindow((x, y, width, height) => {
        if (!width || !height) {
          resolve(undefined);
          return;
        }
        resolve({ x, y, width, height });
      });
    }), []);

  const targetRectFromLines = (rects: (LayoutRect | undefined)[]) => {
    const validRects = rects.filter((rect): rect is LayoutRect => Boolean(rect));
    if (validRects.length < 2) return undefined;
    const targetLeft = Math.min(...validRects.map((rect) => rect.x));
    const targetRight = Math.max(...validRects.map((rect) => rect.x + rect.width));
    const targetTop = Math.min(...validRects.map((rect) => rect.y));
    const targetBottom = Math.max(...validRects.map((rect) => rect.y + rect.height));
    return {
      x: targetLeft,
      y: targetTop,
      width: targetRight - targetLeft,
      height: targetBottom - targetTop,
    };
  };

  const motionBetweenRects = (introRect: LayoutRect | undefined, targetRect: LayoutRect | undefined) => {
    if (!introRect || !targetRect) return undefined;
    const introCenterX = introRect.x + introRect.width / 2;
    const introCenterY = introRect.y + introRect.height / 2;
    const targetCenterX = targetRect.x + targetRect.width / 2;
    const targetCenterY = targetRect.y + targetRect.height / 2;
    return {
      translateX: targetCenterX - introCenterX,
      translateY: targetCenterY - introCenterY,
      scaleX: targetRect.width / introRect.width,
      scaleY: targetRect.height / introRect.height,
    };
  };

  const syncFinalYinGap = useCallback((targetRect: LayoutRect | undefined) => {
    if (!targetRect?.width) return;
    const nextGap = Math.max(8, Math.round((INTRO_YIN_GAP * targetRect.width) / INTRO_HEX_COLUMN_WIDTH));
    setFinalYinGap((currentGap) => (currentGap === nextGap ? currentGap : nextGap));
  }, []);

  const calculateIntroMotion = useCallback(async () => {
    const introBaseRect = await measureInWindow(introBaseHexRef.current);
    const introChangedRect = hasChangedHexagram ? await measureInWindow(introChangedHexRef.current) : undefined;
    const measuredRects = await Promise.all([
      measureInWindow(baseFinalTopLineRef.current),
      measureInWindow(baseFinalBottomLineRef.current),
      hasChangedHexagram ? measureInWindow(changedFinalTopLineRef.current) : undefined,
      hasChangedHexagram ? measureInWindow(changedFinalBottomLineRef.current) : undefined,
    ]);
    const baseTargetRect = targetRectFromLines(measuredRects.slice(0, 2));
    const changedTargetRect = hasChangedHexagram ? targetRectFromLines(measuredRects.slice(2, 4)) : undefined;
    syncFinalYinGap(baseTargetRect);

    return {
      base: motionBetweenRects(introBaseRect, baseTargetRect),
      changed: hasChangedHexagram ? motionBetweenRects(introChangedRect, changedTargetRect) : undefined,
    };
  }, [hasChangedHexagram, measureInWindow, syncFinalYinGap]);

  const openHexagramText = (name: string | undefined, event: GestureResponderEvent) => {
    if (!name) return;
    const { pageX, pageY } = event.nativeEvent;
    setHexagramTextAnchor({
      x: Math.max(12, Math.min(pageX - 120, 96)),
      y: Math.max(128, pageY + 10),
    });
    setVisibleHexagramTextName(name);
    setSelectedHexagramTextName(name);
  };

  const closeHexagramText = () => {
    setSelectedHexagramTextName(undefined);
  };

  const openFullHexagramText = () => {
    if (!visibleHexagramTextName) return;
    setFullTextHexagramName(visibleHexagramTextName);
    setSelectedTextSection('judgment');
    fullTextScrollX.setValue(0);
    setSelectedHexagramTextName(undefined);
  };

  const selectFullTextPage = (index: number) => {
    fullTextPagerRef.current?.scrollTo({ x: fullTextPageWidth * index, animated: true });
    setSelectedTextSection(TEXT_SECTIONS[index]);
  };

  const selectAnalysisPage = (index: number) => {
    analysisPagerRef.current?.scrollTo({ x: analysisPageWidth * index, animated: true });
  };

  const requestUnionPatternIndex = (index: number) => {
    if (index === activeUnionPatternIndex || unionTransitioningRef.current) return;
    unionTransitioningRef.current = true;
    if (unionTransitionTimerRef.current) {
      clearTimeout(unionTransitionTimerRef.current);
      unionTransitionTimerRef.current = undefined;
    }
    Animated.timing(unionTransitionProgress, {
      toValue: 0,
      duration: 130,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      unionTransitionProgress.stopAnimation();
      unionTransitionProgress.setValue(0);
      setActiveUnionPatternIndex(index);
      unionTransitionTimerRef.current = setTimeout(() => {
        Animated.timing(unionTransitionProgress, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          unionTransitioningRef.current = false;
          unionTransitionTimerRef.current = undefined;
        });
      }, 32);
    });
  };

  const startSpiritRipple = (lineIndex: number, isHidden: boolean) => {
    const id = rippleIdRef.current + 1;
    rippleIdRef.current = id;
    const progress = new Animated.Value(0);
    const ripple = { id, lineIndex, isHidden, progress };
    setSpiritRipples((current) => [...current, ripple]);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpiritRipples((current) => current.filter((item) => item.id !== id));
    });
  };

  const focusSpiritLine = (analysis: SpiritAnalysis) => {
    if (analysis.lineIndex === undefined) return;
    Haptics.selectionAsync().catch(() => undefined);
    if (hiddenSpiritAutoHideTimer.current) {
      clearTimeout(hiddenSpiritAutoHideTimer.current);
      hiddenSpiritAutoHideTimer.current = undefined;
    }
    startSpiritRipple(analysis.lineIndex, Boolean(analysis.isHidden));
    if (analysis.isHidden) {
      const line = record.hexagram.lines.find((item) => item.index === analysis.lineIndex);
      if (line) showHiddenSpirit(line);
      const hideToken = hiddenSpiritAutoHideToken.current + 1;
      hiddenSpiritAutoHideToken.current = hideToken;
      hiddenSpiritAutoHideTimer.current = setTimeout(() => {
        if (hiddenSpiritAutoHideToken.current !== hideToken) return;
        hideHiddenSpirit();
        hiddenSpiritAutoHideTimer.current = undefined;
      }, 1450);
      return;
    }
    hideHiddenSpirit();
  };

  const updateVerificationNote = (id: number, patch: Partial<VerificationNote>) => {
    setArmedDeleteNoteId(undefined);
    const nextNotes = verificationNotesRef.current.map((note) => (note.id === id ? { ...note, ...patch } : note));
    verificationNotesRef.current = nextNotes;
    setVerificationNotes(nextNotes);
    saveRecordWithNotes(nextNotes);
  };

  const deleteVerificationNote = (id: number) => {
    setArmedDeleteNoteId(undefined);
    LayoutAnimation.configureNext({
      duration: 320,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    syncVerificationNotes((notes) => {
      const nextNotes = notes.filter((note) => note.id !== id);
      saveRecordWithNotes(nextNotes);
      return nextNotes;
    });
  };

  const addVerificationNote = () => {
    if (addingNoteRef.current) return;
    setArmedDeleteNoteId(undefined);
    addingNoteRef.current = true;
    animateDividerCollapse(1);
    const id = Date.now();
    const createdAt = new Date().toISOString();
    const nextNote = { id, fulfilled: true, note: '', createdAt };
    saveRecordWithNotes([...verificationNotes, nextNote]);
    const targetHeight = measuredNoteCardHeight.current;

    noteInsertSpacerHeight.stopAnimation(() => {
      noteInsertSpacerHeight.setValue(0);
      setPendingVerificationNote(nextNote);
      Animated.timing(noteInsertSpacerHeight, {
        toValue: targetHeight,
        duration: 360,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) {
          addingNoteRef.current = false;
          return;
        }
        syncVerificationNotes((notes) => {
          const nextNotes = [...notes, nextNote];
          return nextNotes;
        });
        setPendingVerificationNote(undefined);
        requestAnimationFrame(() => {
          noteInsertSpacerHeight.setValue(0);
        });
        setTimeout(() => {
          addingNoteRef.current = false;
        }, 380);
      });
    });
  };

  const focusVerificationInput = (noteId?: number) => {
    setArmedDeleteNoteId(undefined);
    animateDividerCollapse(1);
    if (noteId !== undefined) {
      focusedNoteIdRef.current = noteId;
      const keyboardHeight = keyboardHeightRef.current;
      if (keyboardHeight > 0) {
        const cardY = noteCardYRef.current[noteId];
        const cardH = noteCardHeightRef.current[noteId] ?? measuredNoteCardHeight.current;
        if (cardY !== undefined) {
          const scrollHeight = noteScrollHeightRef.current || (windowHeight - insets.top);
          const visibleHeight = scrollHeight - keyboardHeight;
          const margin = 24;
          const targetY = Math.max(0, cardY + cardH + margin - visibleHeight);
          noteScrollRef.current?.scrollTo({ y: targetY, animated: true });
        }
      }
    }
  };

  const openMoreMenu = () => {
    setMoreMenuMounted(true);
    setMoreMenuVisible(true);
    moreMenuProgress.stopAnimation();
    moreBackdropProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(moreBackdropProgress, {
        toValue: 1,
        duration: 380,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(moreMenuProgress, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMoreMenu = () => {
    setMoreMenuVisible(false);
    moreMenuProgress.stopAnimation();
    moreBackdropProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(moreBackdropProgress, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(moreMenuProgress, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMoreMenuMounted(false);
    });
  };

  const toggleMoreMenu = () => {
    if (moreMenuVisible) {
      closeMoreMenu();
      return;
    }
    openMoreMenu();
  };

  const recordForSaving = () => ({
    ...record,
    analysis: { ...record.analysis, aiReadingStructured: aiReading },
    favorite,
    verificationNotes,
  });

  const showSaveToast = () => {
    saveToastProgress.stopAnimation();
    saveToastProgress.setValue(0);
    Animated.sequence([
      Animated.timing(saveToastProgress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(1050),
      Animated.timing(saveToastProgress, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shareRecord = async () => {
    closeMoreMenu();
    await Share.share({
      message: [
        `${language === 'en' ? 'Wenshi casting' : '六爻起卦'}：${record.hexagram.name}${hasChangedHexagram ? ` ${t('analysis.changesTo')} ${record.hexagram.changedName}` : ''}`,
        `${language === 'en' ? 'Question' : '所问'}：${record.question}`,
        `${t('analysis.modernTime')}：${formatCompactChineseDateTime(record.createdAt)}`,
        `${t('analysis.stemBranchTime')}：${formatStemBranchDateTimeLocalized(record.lunarInfo, language)}`,
      ].join('\n'),
    });
  };

  const saveCurrentRecord = async () => {
    closeMoreMenu();
    const saved = await saveRecord(recordForSaving());
    if (saved.analysis.aiReadingStructured) setAiReading(saved.analysis.aiReadingStructured);
    markRecordSaved();
    showSaveToast();
  };

  const saveAndLeave = async () => {
    await saveRecord(recordForSaving());
    markRecordSaved();
    setUnsavedPromptVisible(false);
    navigation.goBack();
  };

  const toggleFavorite = async () => {
    const nextFavorite = !favorite;
    Animated.timing(favoriteVisualProgress, {
      toValue: nextFavorite ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setFavorite(nextFavorite);
    await saveRecord({
      ...record,
      analysis: { ...record.analysis, aiReadingStructured: aiReading },
      favorite: nextFavorite,
      verificationNotes,
    });
    markRecordSaved();
  };

  const generateAIReading = async () => {
    if (!savedRecordRef.current || aiReadingLoading) return;
    const { limits } = await getEffectivePlanLimits();
    if (limits.aiDailyLimit !== undefined) {
      const used = await getLocalAIUsageCount();
      if (used >= limits.aiDailyLimit) {
        setAiReadingError(t('analysis.aiQuotaReached'));
        return;
      }
    }
    setAiReadingLoading(true);
    setAiReadingError(undefined);
    try {
      const reading = await generateRemoteAIReading(record.id, language);
      setAiReading(reading);
      await incrementLocalAIUsage();
      await saveRecord({
        ...record,
        analysis: { ...record.analysis, aiReadingStructured: reading },
        favorite,
        verificationNotes: verificationNotesRef.current,
      });
      markRecordSaved();
    } catch (error) {
      const message = error instanceof ApiRequestError && error.detail?.code === 'ai_quota_exceeded'
        ? t('analysis.aiQuotaReached')
        : error instanceof Error
          ? error.message
          : t('analysis.aiFailed');
      setAiReadingError(message);
    } finally {
      setAiReadingLoading(false);
    }
  };

  const openMemberCenter = () => {
    navigation.navigate('MemberCenter');
  };

  const autoReadingTriggeredRef = useRef(false);
  const initialLanguageRef = useRef(language);
  const readingLanguageMatches = (reading?: AIReading): boolean => {
    if (!reading) return false;
    if (!reading.lang) return true;
    return reading.lang === language;
  };
  useEffect(() => {
    if (autoReadingTriggeredRef.current) return;
    if (guestMode) {
      autoReadingTriggeredRef.current = true;
      return;
    }
    if (aiReadingLoading) return;
    if (aiReading && readingLanguageMatches(aiReading)) {
      autoReadingTriggeredRef.current = true;
      return;
    }
    if (fromHistory) {
      autoReadingTriggeredRef.current = true;
      return;
    }
    autoReadingTriggeredRef.current = true;
    (async () => {
      try {
        if (!savedRecordRef.current) {
          await saveRecordWithNotes(verificationNotesRef.current);
        }
      } catch {
        autoReadingTriggeredRef.current = false;
        return;
      }
      generateAIReading();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestMode]);
  useEffect(() => {
    if (language === initialLanguageRef.current) return;
    initialLanguageRef.current = language;
    if (guestMode) return;
    if (fromHistory) return;
    if (aiReadingLoading) return;
    if (aiReading && readingLanguageMatches(aiReading)) return;
    generateAIReading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const leaveWithoutSaving = () => {
    setUnsavedPromptVisible(false);
    navigation.goBack();
  };

  const closeUnsavedPrompt = () => {
    setUnsavedPromptVisible(false);
  };

  const promptBeforeLeaving = () => {
    if (fromHistory || savedRecordRef.current) {
      navigation.goBack();
      return;
    }
    setUnsavedPromptVisible(true);
  };

  const animateDividerCollapse = (toValue: number) => {
    dividerCollapseValue.current = toValue;
    dividerCollapseProgress.stopAnimation();
    Animated.spring(dividerCollapseProgress, {
      toValue,
      damping: 22,
      stiffness: 180,
      mass: 0.75,
      useNativeDriver: false,
    }).start();
  };

  const showDividerGrip = () => {
    dividerGripOpacity.stopAnimation();
    Animated.timing(dividerGripOpacity, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const hideDividerGrip = () => {
    dividerGripOpacity.stopAnimation();
    Animated.timing(dividerGripOpacity, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const dividerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        showDividerGrip();
        dividerCollapseProgress.stopAnimation((value) => {
          dividerCollapseValue.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const nextValue = Math.max(0, Math.min(1, dividerCollapseValue.current - gesture.dy / COLLAPSE_DISTANCE));
        dividerCollapseProgress.setValue(nextValue);
      },
      onPanResponderRelease: (_, gesture) => {
        const projected = Math.max(0, Math.min(1, dividerCollapseValue.current - (gesture.dy + gesture.vy * 80) / COLLAPSE_DISTANCE));
        animateDividerCollapse(projected > 0.42 ? 1 : 0);
        hideDividerGrip();
      },
      onPanResponderTerminate: () => {
        animateDividerCollapse(dividerCollapseValue.current > 0.5 ? 1 : 0);
        hideDividerGrip();
      },
    })
  ).current;

  const edgeBackPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        edgeBackGestureActive.current = event.nativeEvent.pageX <= 24;
        return false;
      },
      onMoveShouldSetPanResponder: (event, gesture) => {
        const startsAtEdge = edgeBackGestureActive.current || event.nativeEvent.pageX <= 24;
        const horizontalSwipe = gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4;
        return startsAtEdge && horizontalSwipe && !unsavedPromptVisible;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 64 || gesture.vx > 0.45) {
          promptBeforeLeaving();
        }
        edgeBackGestureActive.current = false;
      },
      onPanResponderTerminate: () => {
        edgeBackGestureActive.current = false;
      },
    })
  ).current;

  const openSpiritReason = (analysis: SpiritAnalysis, event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setSpiritReasonAnchor({
      x: Math.max(12, Math.min(pageX - 80, 132)),
      y: Math.max(128, pageY + 12),
    });
    setSelectedSpiritAnalysis(analysis);
  };

  useEffect(() => {
    if (selectedHexagramTextName) return;
    const timer = setTimeout(() => setVisibleHexagramTextName(undefined), 260);
    return () => clearTimeout(timer);
  }, [selectedHexagramTextName]);

  const animateValue = (value: Animated.Value, toValue: number, duration = 240) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const animateStatusVisual = (toValue: number, duration = 220) =>
    Animated.timing(statusVisualProgress, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

  const animateStatusWidth = (toValue: number, duration = 360) =>
    Animated.timing(statusColumnWidth, {
      toValue,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });

  const toggleStatus = () => {
    const nextVisible = !showStatus;
    setShowStatus(nextVisible);
    statusColumnWidth.stopAnimation();
    statusVisualProgress.stopAnimation();
    if (nextVisible) {
      Animated.sequence([
        animateStatusWidth(22, 420),
        Animated.delay(12),
        animateStatusVisual(1, 260),
      ]).start();
      return;
    }
    Animated.sequence([
      animateStatusVisual(0, 280),
      Animated.delay(16),
      animateStatusWidth(0, 460),
    ]).start();
  };

  const toggleUnchangedChangedLines = () => {
    const nextHidden = !hideUnchangedChangedLines;
    setHideUnchangedChangedLines(nextHidden);
    animateValue(unchangedChangedLinesProgress, nextHidden ? 0 : 1);
  };

  const toggleMetaMode = () => {
    if (metaSwitching.current) return;
    metaSwitching.current = true;
    const nextMetaMode = nextMode(metaMode);
    metaOpacity.stopAnimation();
    metaTranslateX.stopAnimation();
    Animated.parallel([
      Animated.timing(metaOpacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(metaTranslateX, {
        toValue: -META_SWITCH_DISTANCE,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        metaOpacity.setValue(1);
        metaTranslateX.setValue(0);
        metaSwitching.current = false;
        return;
      }
      setMetaMode(nextMetaMode);
      metaTranslateX.setValue(META_SWITCH_DISTANCE);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(metaOpacity, {
            toValue: 1,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(metaTranslateX, {
            toValue: 0,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          metaSwitching.current = false;
        });
      });
    });
  };

  const showHiddenSpirit = (line: HexagramLine) => {
    if (!hasEffectiveHiddenSpirit(line)) return;
    setActiveHiddenSpiritIndex(line.index);
    hiddenSpiritOverlayProgress.stopAnimation();
    Animated.timing(hiddenSpiritOverlayProgress, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const hideHiddenSpirit = () => {
    hiddenSpiritOverlayProgress.stopAnimation();
    Animated.timing(hiddenSpiritOverlayProgress, {
      toValue: 0,
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setActiveHiddenSpiritIndex(undefined);
    });
  };

  useEffect(() => {
    let currentIntroAnimation: Animated.CompositeAnimation | undefined;
    let cancelled = false;

    const startAnimation = (animation: Animated.CompositeAnimation) => {
      currentIntroAnimation = animation;
      animation.start();
    };

    const introRevealSequence = Animated.sequence([
      Animated.timing(introBaseOpacity, {
        toValue: 1,
        duration: 540,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introTransitionOpacity, {
        toValue: hasChangedHexagram ? 1 : 0,
        duration: hasChangedHexagram ? 380 : 1,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introChangedOpacity, {
        toValue: hasChangedHexagram ? 1 : 0,
        duration: hasChangedHexagram ? 540 : 1,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(introTextOpacity, {
          toValue: 0,
          duration: 440,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(introHexOpacity, {
          toValue: 1,
          duration: 540,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(introBaseHexScaleX, {
          toValue: 1,
          damping: 18,
          stiffness: 130,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.spring(introBaseHexScaleY, {
          toValue: 1,
          damping: 18,
          stiffness: 130,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.spring(introChangedHexScaleX, {
          toValue: 1,
          damping: 18,
          stiffness: 130,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.spring(introChangedHexScaleY, {
          toValue: 1,
          damping: 18,
          stiffness: 130,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(360),
    ]);

    startAnimation(introRevealSequence);

    introRevealSequence.start(({ finished }) => {
      if (!finished || cancelled) return;
      requestAnimationFrame(async () => {
        if (cancelled) return;
        const motion = await calculateIntroMotion();
        if (cancelled) return;
        const introMotionSequence = Animated.sequence([
          Animated.parallel([
            Animated.timing(introBaseHexTranslateX, {
              toValue: motion?.base?.translateX ?? 0,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introBaseHexTranslateY, {
              toValue: motion?.base?.translateY ?? -138,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introBaseHexScaleX, {
              toValue: motion?.base?.scaleX ?? 1,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introBaseHexScaleY, {
              toValue: motion?.base?.scaleY ?? 1,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexTranslateX, {
              toValue: motion?.changed?.translateX ?? motion?.base?.translateX ?? 0,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexTranslateY, {
              toValue: motion?.changed?.translateY ?? motion?.base?.translateY ?? -138,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexScaleX, {
              toValue: motion?.changed?.scaleX ?? motion?.base?.scaleX ?? 1,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexScaleY, {
              toValue: motion?.changed?.scaleY ?? motion?.base?.scaleY ?? 1,
              duration: 920,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(mainOpacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(introOverlayOpacity, {
              toValue: 0,
              duration: 900,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introHexOpacity, {
              toValue: 0,
              duration: 680,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]);

        currentIntroAnimation = introMotionSequence;
        introMotionSequence.start(({ finished: motionFinished }) => {
          if (!motionFinished || cancelled) return;
          setShowIntro(false);
        });
      });
    });

    return () => {
      cancelled = true;
      currentIntroAnimation?.stop();
      if (hiddenSpiritAutoHideTimer.current) clearTimeout(hiddenSpiritAutoHideTimer.current);
    };
  }, [
    calculateIntroMotion,
    hasChangedHexagram,
    introBaseOpacity,
    introBaseHexScaleX,
    introBaseHexScaleY,
    introBaseHexTranslateX,
    introBaseHexTranslateY,
    introChangedOpacity,
    introChangedHexScaleX,
    introChangedHexScaleY,
    introChangedHexTranslateX,
    introChangedHexTranslateY,
    introHexOpacity,
    introOverlayOpacity,
    introTextOpacity,
    introTransitionOpacity,
    mainOpacity,
  ]);

  useEffect(() => {
    requestAnimationFrame(async () => {
      const baseTopRect = await measureInWindow(baseFinalTopLineRef.current);
      const baseBottomRect = await measureInWindow(baseFinalBottomLineRef.current);
      syncFinalYinGap(targetRectFromLines([baseTopRect, baseBottomRect]));
    });
  }, [measureInWindow, syncFinalYinGap, windowWidth, showStatus, hideUnchangedChangedLines]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <Animated.View pointerEvents={moreMenuVisible ? 'auto' : 'none'} style={[styles.moreMenuBackdrop, { backgroundColor: colors.overlay, opacity: moreBackdropProgress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMoreMenu} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.saveToast,
          {
            top: insets.top + 50,
            opacity: saveToastProgress,
            transform: [
              {
                translateY: saveToastProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.saveToastText}>{t('analysis.saved')}</Text>
      </Animated.View>
      <Animated.View style={[styles.content, { backgroundColor: colors.card, opacity: mainOpacity }]}>
        <View style={styles.header}>
          {hasChangedHexagram ? (
            <View style={styles.titleRow}>
              <Pressable onPress={(event) => openHexagramText(record.hexagram.name, event)}>
                <Text style={[styles.title, { color: colors.text }]}>{record.hexagram.name}</Text>
              </Pressable>
              <Text style={[styles.titleTransition, { color: colors.faintText }]}>{t('analysis.changesTo')}</Text>
              <Pressable onPress={(event) => openHexagramText(record.hexagram.changedName, event)}>
                <Text style={[styles.title, { color: colors.text }]}>{record.hexagram.changedName}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={(event) => openHexagramText(record.hexagram.name, event)}>
              <Text style={[styles.title, { color: colors.text }]}>{record.hexagram.name}</Text>
            </Pressable>
          )}
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>{record.question}</Text>
        </View>
        <Animated.View style={[styles.collapsibleTop, { height: collapsibleHeight, opacity: collapsibleOpacity }]}>
          <View style={styles.dateInfoRow}>
            <Pressable style={styles.dateInfoItem} onPress={toggleStatus}>
              <Text style={[styles.dateInfoLabel, { color: colors.mutedText }]}>{t('analysis.monthBranch')}</Text>
              <Text style={[styles.dateInfoValue, { color: stemBranchColor(record.lunarInfo.monthStemBranch) }]}>{record.lunarInfo.monthStemBranch}</Text>
            </Pressable>
            <Pressable style={styles.dateInfoItem} onPress={toggleStatus}>
              <Text style={[styles.dateInfoLabel, { color: colors.mutedText }]}>{t('analysis.dayBranch')}</Text>
              <View style={styles.dayInfoValueWrap}>
                <Text style={[styles.dateInfoValue, { color: stemBranchColor(record.lunarInfo.dayStemBranch) }]}>{record.lunarInfo.dayStemBranch}</Text>
                <Text style={[styles.dateInfoSub, { color: colors.faintText }]}>{t('analysis.void')} {record.lunarInfo.voidBranches.join('')}</Text>
              </View>
            </Pressable>
          </View>
          <View style={[styles.hexagramStage, { backgroundColor: colors.card }]}>
            <View style={styles.hexHeaderRow}>
              <View style={styles.hexHeaderSide} />
              <View style={styles.hexGroup}>
                <Pressable style={styles.hexHeaderTitleButton} onPress={(event) => openHexagramText(record.hexagram.name, event)}>
                  <Text style={[styles.hexHeaderTitle, { color: colors.text }]}>{language === 'en' ? t('analysis.baseHex') : `${t('analysis.baseHex')} ${baseShortName}`}</Text>
                </Pressable>
                <Pressable style={styles.modeButton} onPress={toggleMetaMode}>
                  <Text style={[styles.modeButtonText, { color: colors.text }]}>{t(MODE_LABEL_KEYS[metaMode])}</Text>
                </Pressable>
              </View>
              {hasChangedHexagram ? (
                <View style={styles.hexGroup}>
                  <Pressable style={styles.hexHeaderTitleButton} onPress={(event) => openHexagramText(record.hexagram.changedName, event)}>
                    <Text style={[styles.hexHeaderTitle, { color: colors.text }]}>{language === 'en' ? t('analysis.changedHex') : `${t('analysis.changedHex')} ${changedShortName}`}</Text>
                  </Pressable>
                  <Pressable style={styles.modeButton} onPress={toggleMetaMode}>
                    <Text style={[styles.modeButtonText, { color: colors.text }]}>{t(MODE_LABEL_KEYS[metaMode])}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <View style={styles.hexagramCore}>
            {record.hexagram.lines
              .slice()
              .reverse()
              .map((line, rowIndex, reversedLines) => {
                const previousLine = reversedLines[rowIndex - 1];
                const nextLine = reversedLines[rowIndex + 1];
                const isTopLine = line.index === 5;
                const isBottomLine = line.index === 0;
                return (
                  <HexPairRow
                    key={`${line.index}-${line.label}`}
                    baseLine={line}
                    changedLine={record.hexagram.changedLines[line.index]}
                    hasChanged={line.moving}
                    previousChanged={Boolean(previousLine?.moving)}
                    nextChanged={Boolean(nextLine?.moving)}
                    showChanged={hasChangedHexagram}
                    statusColumnWidth={statusColumnWidth}
                    statusVisualProgress={statusVisualProgress}
                    unchangedChangedLinesProgress={unchangedChangedLinesProgress}
                    metaOpacity={metaOpacity}
                    metaTranslateX={metaTranslateX}
                    baseMotionLineRef={
                      isTopLine
                        ? (node) => { baseFinalTopLineRef.current = node; }
                        : isBottomLine
                          ? (node) => { baseFinalBottomLineRef.current = node; }
                          : undefined
                    }
                    changedMotionLineRef={
                      isTopLine
                        ? (node) => { changedFinalTopLineRef.current = node; }
                        : isBottomLine
                          ? (node) => { changedFinalBottomLineRef.current = node; }
                          : undefined
                    }
                    annotationOpacity={mainOpacity}
                    mode={metaMode}
                    onToggleMode={toggleMetaMode}
                    onToggleUnchangedChangedLines={toggleUnchangedChangedLines}
                    activeHiddenSpiritIndex={activeHiddenSpiritIndex}
                    hiddenSpiritOverlayProgress={hiddenSpiritOverlayProgress}
                    onShowHiddenSpirit={showHiddenSpirit}
                    onHideHiddenSpirit={hideHiddenSpirit}
                    useGodLineIndexes={useGodLineIndexes}
                    useGodHiddenLineIndexes={useGodHiddenLineIndexes}
                    useGodColor={useGodColor}
                    finalYinGap={finalYinGap}
                    spiritAnalyses={spiritAnalyses}
                    ripples={spiritRipples}
                    language={language}
                  />
                );
              })}
            </View>
            {hasHexagramMarks ? (
              <View style={styles.hexMarkLayoutRow}>
                <View style={styles.hexHeaderSide} />
                <View style={styles.hexGroup}>
                  <View style={styles.hexMarkColumn}>
                    <HexagramMarkTags marks={record.hexagram.marks} />
                  </View>
                  <View style={styles.hexMarkMetaSpacer} />
                </View>
                {hasChangedHexagram ? (
                  <View style={styles.hexGroup}>
                    <View style={styles.hexMarkColumn}>
                      <HexagramMarkTags marks={record.hexagram.changedMarks} />
                    </View>
                    <View style={styles.hexMarkMetaSpacer} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </Animated.View>
        <Animated.View
          {...dividerPanResponder.panHandlers}
          style={styles.dividerDragZone}
        >
          <Animated.View style={[styles.dividerHandleGrip, { opacity: dividerGripOpacity }]} />
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.moreMenuLayer,
          {
            opacity: mainOpacity,
            top: insets.top,
          },
        ]}
      >
        <Pressable
          style={[styles.moreButton, moreMenuVisible ? styles.moreButtonActive : null, { backgroundColor: moreMenuVisible ? (darkMode ? colors.card : colors.inverse) : colors.control }]}
          onPress={toggleMoreMenu}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.moreButtonDots,
              {
                opacity: moreMenuProgress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0, 0] }),
                transform: [
                  {
                    scale: moreMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.moreButtonDot, { backgroundColor: moreMenuVisible && !darkMode ? colors.inverseText : colors.text }]} />
            <View style={[styles.moreButtonDot, { backgroundColor: moreMenuVisible && !darkMode ? colors.inverseText : colors.text }]} />
            <View style={[styles.moreButtonDot, { backgroundColor: moreMenuVisible && !darkMode ? colors.inverseText : colors.text }]} />
          </Animated.View>
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.moreButtonClose,
              {
                color: darkMode ? colors.text : colors.inverseText,
                opacity: moreMenuProgress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] }),
                transform: [
                  {
                    scale: moreMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
                  },
                ],
              },
            ]}
          >
            ×
          </Animated.Text>
        </Pressable>
        {moreMenuMounted ? (
          <Animated.View
            pointerEvents={moreMenuVisible ? 'auto' : 'none'}
            style={[
              styles.moreMenuCard,
              {
                backgroundColor: colors.card,
                opacity: moreMenuProgress,
                transform: [
                  {
                    translateY: moreMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
                  },
                  {
                    scale: moreMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={{
                opacity: moreMenuProgress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
                transform: [
                  {
                    translateY: moreMenuProgress.interpolate({ inputRange: [0, 1], outputRange: [-3, 0] }),
                  },
                ],
              }}
            >
              <Pressable style={styles.moreMenuItem} onPress={shareRecord}>
                <View style={styles.moreMenuIcon}>
                  <LineIcon name="share" size={19} />
                </View>
                <Text style={[styles.moreMenuText, { color: colors.text }]}>{t('analysis.share')}</Text>
              </Pressable>
              <View style={[styles.moreMenuDivider, { backgroundColor: colors.divider }]} />
              <Pressable style={styles.moreMenuItem} onPress={toggleFavorite}>
                <View style={styles.moreMenuIcon}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.favoriteIconLayer,
                      {
                        opacity: favoriteVisualProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                        transform: [{ scale: favoriteVisualProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) }],
                      },
                    ]}
                  >
                    <LineIcon name="star" size={19} />
                  </Animated.View>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.favoriteIconLayer,
                      {
                        opacity: favoriteVisualProgress,
                        transform: [{ scale: favoriteVisualProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
                      },
                    ]}
                  >
                    <FontAwesome name="star" size={18} color="#d59a16" />
                  </Animated.View>
                </View>
                <View style={styles.favoriteTextWrap}>
                  <Animated.Text
                    style={[
                      styles.moreMenuText,
                      { color: colors.text },
                      styles.favoriteTextLayer,
                      { opacity: favoriteVisualProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
                    ]}
                  >
                    {t('analysis.favorite')}
                  </Animated.Text>
                  <Animated.Text
                    style={[
                      styles.moreMenuText,
                      { color: colors.text },
                      styles.favoriteTextLayer,
                      { opacity: favoriteVisualProgress },
                    ]}
                  >
                    {t('analysis.unfavorite')}
                  </Animated.Text>
                </View>
              </Pressable>
              <View style={[styles.moreMenuDivider, { backgroundColor: colors.divider }]} />
              <Pressable style={styles.moreMenuItem} onPress={saveCurrentRecord}>
                <View style={styles.moreMenuIcon}>
                  <LineIcon name="save" size={19} />
                </View>
                <Text style={[styles.moreMenuText, { color: colors.text }]}>{t('analysis.save')}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        ) : null}
      </Animated.View>
      <View pointerEvents="none" style={styles.contentBottomMask} />
      <Animated.View style={[styles.summaryBlock, { backgroundColor: colors.background, opacity: mainOpacity }]}>
        <Animated.ScrollView
          ref={analysisPagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          decelerationRate="fast"
          snapToInterval={analysisPageWidth}
          style={[styles.analysisPager, { width: analysisPageWidth, backgroundColor: colors.background }]}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: analysisPageScrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
            <Animated.ScrollView
              style={[styles.analysisPage, { width: analysisPageWidth, backgroundColor: colors.background }]}
              contentContainerStyle={[styles.analysisPageContent, styles.aiPageContent]}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              <AIReadingBlock
                reading={aiReading}
                saved={savedRecord}
                loading={aiReadingLoading}
                error={aiReadingError}
                recordCreatedAt={record.createdAt}
                notes={verificationNotes}
                onGenerate={generateAIReading}
                onUpgrade={openMemberCenter}
                monthStemBranch={record.lunarInfo.monthStemBranch}
                dayStemBranch={record.lunarInfo.dayStemBranch}
                guestMode={guestMode}
              />
            </Animated.ScrollView>
            <Animated.ScrollView
              style={[styles.analysisPage, { width: analysisPageWidth, backgroundColor: colors.background }]}
              contentContainerStyle={[styles.analysisPageContent, styles.spiritPageContent]}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              <View style={styles.spiritCardList}>
                {spiritAnalyses.map((analysis) => (
                  <SpiritAnalysisBlock
                    key={analysis.title}
                    analysis={analysis}
                    fallbackColor={useGodColor}
                    onTitlePress={openSpiritReason}
                    onCardPress={focusSpiritLine}
                  />
                ))}
              </View>
            </Animated.ScrollView>
            <Animated.ScrollView
              style={[styles.analysisPage, { width: analysisPageWidth, backgroundColor: colors.background }]}
              contentContainerStyle={styles.analysisPageContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              <UnionAnalysisBlock
                analysis={record.analysis.unionAnalysis}
                lines={record.hexagram.lines}
                spiritAnalyses={spiritAnalyses}
                activePatternIndex={activeUnionPatternIndex}
                transitionProgress={unionTransitionProgress}
                onRequestPatternIndex={requestUnionPatternIndex}
              />
            </Animated.ScrollView>
            <Animated.ScrollView
              ref={noteScrollRef as never}
              style={[styles.analysisPage, { width: analysisPageWidth, backgroundColor: colors.background }]}
              contentContainerStyle={styles.analysisPageContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="never"
              keyboardDismissMode="interactive"
              onLayout={(event) => { noteScrollHeightRef.current = event.nativeEvent.layout.height; }}
            >
              <Pressable
                style={styles.resultDismissLayer}
                onPress={() => {
                  setArmedDeleteNoteId(undefined);
                  Keyboard.dismiss();
                }}
              >
              <View style={[styles.resultInfoCard, { backgroundColor: darkMode ? '#172333' : '#e6f0f8' }]}>
                <Text style={[styles.unionTitle, { color: colors.text }]}>{t('analysis.castInfo')}</Text>
                <ResultInfoRow label={t('analysis.modernTime')} value={formatCompactDateTime(record.createdAt, language)} />
                <ResultInfoRow
                  label={t('analysis.stemBranchTime')}
                  value={language === 'en' ? translateChineseTerms(formatStemBranchDateTimeLocalized(record.lunarInfo, language), language) : formatStemBranchDateTimeLocalized(record.lunarInfo, language)}
                />
                <ResultInfoRow label={t('analysis.querent')} value={profileDisplayName(record.profile, t('analysis.unfilled'))} />
                <ResultInfoRow label={t('analysis.gender')} value={profileGenderLabel(record.profile, t)} />
              </View>
              {verificationNotes.map((note) => (
                <VerificationNoteCard
                  key={note.id}
                  note={note}
                  deleteArmed={armedDeleteNoteId === note.id}
                  onArmDelete={setArmedDeleteNoteId}
                  onUpdate={updateVerificationNote}
                  onDelete={deleteVerificationNote}
                  onFocus={() => focusVerificationInput(note.id)}
                  keyboardLift={noteKeyboardLift}
                  keyboardVisible={keyboardVisible}
                  language={language}
                  onMeasured={(height) => {
                    if (height > 0 && !addingNoteRef.current) {
                      measuredNoteCardHeight.current = height;
                    }
                  }}
                  onLayoutY={(y, height) => {
                    noteCardYRef.current[note.id] = y;
                    noteCardHeightRef.current[note.id] = height;
                  }}
                />
              ))}
              {pendingVerificationNote ? <Animated.View style={[styles.resultNotePlaceholder, { height: noteInsertSpacerHeight }]} /> : null}
              <Pressable
                style={[styles.addResultCard, { backgroundColor: colors.inverse }]}
                onPress={(event) => {
                  event.stopPropagation();
                  addVerificationNote();
                }}
              >
                <Text style={[styles.addResultIcon, { color: colors.inverseText }]}>＋</Text>
                <Text style={[styles.addResultText, { color: colors.inverseText }]}>{t('analysis.addNote')}</Text>
              </Pressable>
              </Pressable>
              <Animated.View pointerEvents="none" style={{ height: keyboardBottomPad }} />
            </Animated.ScrollView>
        </Animated.ScrollView>
        <Animated.View style={[styles.analysisTabsOverlay, { opacity: mainOpacity }]}>
          <AnalysisPageTabs scrollX={analysisPageScrollX} pageWidth={analysisPageWidth} onSelect={selectAnalysisPage} />
        </Animated.View>
      </Animated.View>
      <VerificationNoteMeasureCard
        onMeasured={(height) => {
          measuredNoteCardHeight.current = height;
        }}
      />
      {showIntro ? (
        <Animated.View pointerEvents="none" style={[styles.introOverlay, { backgroundColor: colors.background, opacity: introOverlayOpacity }]}>
          <Animated.View style={[styles.introTitleRow, { opacity: introTextOpacity }]}>
            <Animated.Text numberOfLines={1} style={[styles.introTitleText, { color: colors.text, opacity: introBaseOpacity }]}>
              {record.hexagram.name}
            </Animated.Text>
            {hasChangedHexagram ? (
              <>
                <Animated.Text numberOfLines={1} style={[styles.introTransitionText, { color: colors.faintText, opacity: introTransitionOpacity }]}>
                  {t('analysis.changesTo')}
                </Animated.Text>
                <Animated.Text numberOfLines={1} style={[styles.introTitleText, { color: colors.text, opacity: introChangedOpacity }]}>
                  {record.hexagram.changedName}
                </Animated.Text>
              </>
            ) : null}
          </Animated.View>
          <Animated.View
            style={[
              styles.introHexMotion,
              {
                opacity: introHexOpacity,
              },
            ]}
          >
            <View style={styles.introHexStage}>
              <Animated.View
                ref={(node) => { introBaseHexRef.current = node as View | null; }}
                collapsable={false}
                style={[
                  styles.introHexColumn,
                  {
                    transform: [
                      { translateX: introBaseHexTranslateX },
                      { translateY: introBaseHexTranslateY },
                      { scaleX: introBaseHexScaleX },
                      { scaleY: introBaseHexScaleY },
                    ],
                  },
                ]}
              >
                {record.hexagram.lines
                  .slice()
                  .reverse()
                  .map((line) => (
                    <View key={`intro-base-${line.index}`} style={styles.introHexLineRow}>
                      <HexLine line={line} />
                    </View>
                  ))}
              </Animated.View>
              {hasChangedHexagram ? (
                <Animated.View
                  ref={(node) => { introChangedHexRef.current = node as View | null; }}
                  collapsable={false}
                  style={[
                    styles.introHexColumn,
                    {
                      transform: [
                        { translateX: introChangedHexTranslateX },
                        { translateY: introChangedHexTranslateY },
                        { scaleX: introChangedHexScaleX },
                        { scaleY: introChangedHexScaleY },
                      ],
                    },
                  ]}
                >
                  {record.hexagram.changedLines
                    .slice()
                    .reverse()
                    .map((line) => (
                      <View key={`intro-changed-${line.index}`} style={styles.introHexLineRow}>
                        <HexLine line={line} />
                      </View>
                    ))}
                </Animated.View>
              ) : null}
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
      <Modal transparent visible={Boolean(selectedHexagramTextName)} animationType="fade" onRequestClose={closeHexagramText}>
        <Pressable style={styles.textModalBackdrop} onPress={closeHexagramText}>
          <Pressable style={[styles.textModalCard, { left: hexagramTextAnchor.x, top: hexagramTextAnchor.y, backgroundColor: colors.card }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.textModalTitleRow}>
              <Text style={[styles.textModalTitle, { color: colors.text }]}>{visibleHexagramTextName}</Text>
              {selectedHexagramPalace ? <Text style={styles.hexagramPalaceText}>{selectedHexagramPalace}</Text> : null}
            </View>
            <View style={[styles.textModalDivider, { backgroundColor: colors.divider }]} />
            <Text style={[styles.textModalLabel, { color: colors.text }]}>{t('analysis.judgment')}</Text>
            <Text style={[styles.textModalBody, { color: colors.mutedText }]}>{selectedHexagramText?.judgment ?? t('analysis.noJudgment')}</Text>
            <Text style={[styles.textModalLabel, { color: colors.text }]}>{t('analysis.tuan')}</Text>
            <Text style={[styles.textModalBody, { color: colors.mutedText }]}>{selectedHexagramText?.tuan ?? t('analysis.noTuan')}</Text>
            <Pressable onPress={openFullHexagramText}>
              <Text style={styles.textModalLink}>{t('analysis.viewFullText')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={Boolean(selectedSpiritAnalysis)} animationType="fade" onRequestClose={() => setSelectedSpiritAnalysis(undefined)}>
        <Pressable style={styles.textModalBackdrop} onPress={() => setSelectedSpiritAnalysis(undefined)}>
          <Pressable style={[styles.spiritReasonCard, { left: spiritReasonAnchor.x, top: spiritReasonAnchor.y, backgroundColor: colors.card, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.spiritReasonTitle, { color: colors.text }]}>
              {selectedSpiritAnalysis ? `${spiritTitleText(selectedSpiritAnalysis.title, language, language === 'en')} ${spiritDisplayNameText(selectedSpiritAnalysis, language)}` : ''}
            </Text>
            <View style={[styles.textModalDivider, { backgroundColor: colors.divider }]} />
            <Text style={[styles.spiritReasonBody, { color: colors.mutedText }]}>{spiritReasonText(selectedSpiritAnalysis, language)}</Text>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={Boolean(fullTextHexagramName)} animationType="fade" onRequestClose={() => setFullTextHexagramName(undefined)}>
        <View style={[styles.fullTextBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={styles.fullTextDismissLayer} onPress={() => setFullTextHexagramName(undefined)} />
          <View style={[styles.fullTextCard, { backgroundColor: colors.card }]}>
            <View style={styles.fullTextTitleRow}>
              <View style={styles.fullTextTitleNameRow}>
                <Text style={[styles.fullTextTitle, { color: colors.text }]}>{fullTextHexagramName}</Text>
                {fullTextHexagramPalace ? <Text style={styles.hexagramPalaceText}>{fullTextHexagramPalace}</Text> : null}
              </View>
              <Pressable style={[styles.fullTextClose, { backgroundColor: colors.control }]} onPress={() => setFullTextHexagramName(undefined)}>
                <Text style={[styles.fullTextCloseText, { color: colors.text }]}>×</Text>
              </Pressable>
            </View>
            <FullTextPageTabs scrollX={fullTextScrollX} pageWidth={fullTextPageWidth} onSelect={selectFullTextPage} />
            <View style={[styles.fullTextLowerArea, { backgroundColor: colors.cardMuted }]}>
              <Animated.ScrollView
                ref={fullTextPagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                decelerationRate="fast"
                snapToInterval={fullTextPageWidth}
                style={[styles.fullTextPager, { width: fullTextPageWidth }]}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: fullTextScrollX } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
              >
                {TEXT_SECTIONS.map((section) => (
                  <Animated.ScrollView
                    key={section}
                    style={[styles.fullTextBodyWrap, { width: fullTextPageWidth }]}
                    contentContainerStyle={styles.fullTextBodyContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {fullTextBlocks(fullHexagramText, section, t, language).map((block, index) => (
                      <View key={`${section}-${block.title}-${index}`} style={[styles.fullTextBlockCard, { backgroundColor: colors.card }]}>
                        <Text style={styles.fullTextBlockTitle}>{block.title}</Text>
                        <Text style={[styles.fullTextBody, { color: colors.text }]}>{block.original}</Text>
                        {block.translation ? <Text style={[styles.fullTextTranslation, { color: colors.mutedText }]}>{block.translation}</Text> : null}
                      </View>
                    ))}
                  </Animated.ScrollView>
                ))}
              </Animated.ScrollView>
            </View>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={unsavedPromptVisible} animationType="fade" onRequestClose={closeUnsavedPrompt}>
        <View style={[styles.unsavedBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeUnsavedPrompt} />
          <View style={[styles.unsavedCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.unsavedTitle, { color: colors.text }]}>{t('analysis.unsavedTitle')}</Text>
            <Text style={[styles.unsavedBody, { color: colors.mutedText }]}>{t('analysis.unsavedBody')}</Text>
            <View style={styles.unsavedActions}>
              <Pressable style={[styles.unsavedButton, styles.unsavedSecondaryButton, { backgroundColor: colors.control }]} onPress={leaveWithoutSaving}>
                <Text style={[styles.unsavedSecondaryText, { color: colors.text }]}>{t('analysis.leaveWithoutSaving')}</Text>
              </Pressable>
              <Pressable style={[styles.unsavedButton, styles.unsavedPrimaryButton, { backgroundColor: colors.inverse }]} onPress={saveAndLeave}>
                <Text style={[styles.unsavedPrimaryText, { color: colors.inverseText }]}>{t('analysis.save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  introTitleRow: {
    position: 'absolute',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    columnGap: 10,
    paddingHorizontal: 20,
  },
  introTitleText: { color: '#000', fontSize: 28, fontWeight: '900', lineHeight: 36 },
  introTransitionText: { color: '#777', fontSize: 16, fontWeight: '900', lineHeight: 22 },
  introHexMotion: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  introHexStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 42,
  },
  introHexColumn: {
    width: INTRO_HEX_COLUMN_WIDTH,
    gap: 0,
  },
  introHexLineRow: { height: 32, justifyContent: 'center' },
  content: {
    marginHorizontal: 12,
    marginTop: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    zIndex: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  moreMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
    zIndex: 20,
    elevation: 20,
  },
  saveToast: {
    position: 'absolute',
    alignSelf: 'center',
    minWidth: 92,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(17,17,17,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 80,
    elevation: 80,
  },
  saveToastText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  moreMenuLayer: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 190,
    zIndex: 34,
    elevation: 34,
  },
  moreButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 32,
    elevation: 32,
  },
  moreButtonActive: { backgroundColor: '#000' },
  moreButtonDots: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 34,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  moreButtonDot: { width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: '#111' },
  moreButtonClose: {
    position: 'absolute',
    left: 0,
    top: -1,
    width: 34,
    height: 34,
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
    includeFontPadding: false,
  },
  moreMenuCard: {
    ...SOFT_SHADOW,
    position: 'absolute',
    right: 14,
    top: 54,
    width: 140,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 8,
    zIndex: 31,
    elevation: 31,
  },
  moreMenuItem: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  moreMenuIcon: { width: 20, height: 22, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  moreMenuText: { color: '#111', fontSize: 14, fontWeight: '900' },
  favoriteIconLayer: { position: 'absolute', left: 0, right: 0, top: 1, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  favoriteTextWrap: { flex: 1, height: 42, position: 'relative', justifyContent: 'center' },
  favoriteTextLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, lineHeight: 42, textAlignVertical: 'center' },
  moreMenuDivider: { height: 1, backgroundColor: '#ededed', marginHorizontal: 12 },
  header: { gap: 6, paddingRight: 44 },
  title: { color: '#000', fontSize: 28, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, rowGap: 2 },
  titleTransition: { color: '#777', fontSize: 15, fontWeight: '800' },
  subtitle: { color: '#555', fontSize: 13, lineHeight: 20 },
  dateInfoRow: { flexDirection: 'row', gap: 80, alignItems: 'flex-start', justifyContent: 'center' },
  dateInfoItem: { gap: 2, alignItems: 'center' },
  dateInfoLabel: { color: '#666', fontSize: 10, fontWeight: '700' },
  dateInfoValue: { fontSize: 16, fontWeight: '800', lineHeight: 19 },
  dayInfoValueWrap: { position: 'relative' },
  dateInfoSub: { position: 'absolute', left: '100%', bottom: 1, width: 48, color: '#777', fontSize: 9, fontWeight: '600', lineHeight: 10, marginLeft: 2 },
  collapsibleTop: { overflow: 'hidden', gap: 14 },
  hexagramStage: {
    backgroundColor: '#fff',
    paddingTop: 4,
    gap: 8,
  },
  hexHeaderRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  hexHeaderSide: { width: 20 },
  hexHeaderTitleButton: { flex: 1, alignItems: 'center' },
  hexHeaderTitle: { color: '#000', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  modeButton: { width: 54, paddingVertical: 6, alignItems: 'center' },
  modeButtonText: { color: '#000', fontSize: 12, fontWeight: '800' },
  textModalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  textModalCard: {
    ...SOFT_SHADOW,
    position: 'absolute',
    width: 300,
    maxHeight: 420,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 16,
    gap: 10,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  textModalTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  textModalTitle: { color: '#000', fontSize: 18, fontWeight: '900' },
  textModalDivider: { height: 1, backgroundColor: '#e1e1e1' },
  textModalLabel: { color: '#333', fontSize: 14, fontWeight: '900' },
  textModalBody: { color: '#111', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  textModalLink: { color: '#1f7a3f', fontSize: 13, fontWeight: '900', marginTop: 2 },
  fullTextBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  fullTextDismissLayer: { ...StyleSheet.absoluteFillObject },
  fullTextCard: {
    ...SOFT_SHADOW,
    width: '100%',
    maxWidth: 420,
    height: 520,
    maxHeight: '82%',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingTop: 18,
    paddingHorizontal: 0,
    paddingBottom: 0,
    gap: 12,
    overflow: 'hidden',
  },
  fullTextTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18 },
  fullTextTitleNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, flexShrink: 1 },
  fullTextTitle: { color: '#000', fontSize: 24, fontWeight: '900' },
  hexagramPalaceText: { color: '#777', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  fullTextClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eeeeee', alignItems: 'center', justifyContent: 'center' },
  fullTextCloseText: { color: '#555', fontSize: 20, fontWeight: '800', lineHeight: 22, includeFontPadding: false },
  fullTextTabs: { alignItems: 'center', paddingHorizontal: 18 },
  fullTextTabsInner: { height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  fullTextTabPill: { ...LIGHT_SHADOW, position: 'absolute', left: 0, top: 2, width: 52, height: 24, borderRadius: 12, backgroundColor: '#dff3e5' },
  fullTextTabSlot: { height: 28, alignItems: 'center', justifyContent: 'center' },
  fullTextTabText: { position: 'absolute', color: '#0f5f2d', fontSize: 12, fontWeight: '900', lineHeight: 16 },
  fullTextTabTextInactive: { position: 'absolute', color: '#555', fontSize: 12, fontWeight: '800', lineHeight: 16 },
  fullTextLowerArea: { flex: 1, alignItems: 'center', backgroundColor: '#eeeeee', paddingTop: 12 },
  fullTextPager: { flex: 1 },
  fullTextBodyWrap: { flex: 1 },
  fullTextBodyContent: { paddingHorizontal: 18, paddingBottom: 16, gap: 10 },
  fullTextBlockCard: { ...LIGHT_SHADOW, backgroundColor: '#fff', borderRadius: 14, padding: 13, gap: 7 },
  fullTextBlockTitle: { color: '#0f5f2d', fontSize: 12, fontWeight: '900' },
  fullTextBody: { color: '#111', fontSize: 15, lineHeight: 24, fontWeight: '600' },
  fullTextTranslation: { color: '#555', fontSize: 13, lineHeight: 21, fontWeight: '600' },
  hexagramCore: { gap: 0 },
  hexMarkLayoutRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 2, marginTop: -4, marginBottom: -2 },
  hexMarkColumn: { flex: 1, height: 12, justifyContent: 'center', overflow: 'visible' },
  hexMarkMetaSpacer: { width: META_COLUMN_WIDTH, height: 12 },
  hexMarkRow: { minHeight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  hexMarkText: { color: '#000', fontSize: 11, fontWeight: '900', lineHeight: 12, includeFontPadding: false },
  hexLineRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8, height: 32, paddingLeft: 4, paddingRight: 2, overflow: 'visible', zIndex: 1, elevation: 0 },
  hexLineRowActive: { zIndex: 100, elevation: 100 },
  changedHighlightBackground: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  changedHighlightConnectedTop: { marginTop: 0 },
  changedHighlightConnectedBottom: {},
  roleColumn: { width: 20, height: 32, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  roleLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 },
  roleText: { color: '#000', fontSize: 12, fontWeight: '800', lineHeight: 14, includeFontPadding: false },
  hexGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, overflow: 'visible', zIndex: 1 },
  hexColumn: { flex: 1, height: 32, justifyContent: 'center', overflow: 'visible' },
  hexMotionMeasure: { flex: 1, height: 32, justifyContent: 'center', overflow: 'visible' },
  rippleAnchor: { position: 'absolute', left: -3, right: -3, top: -12, bottom: -12, zIndex: 10 },
  spiritRipple: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 13,
    bottom: 13,
    borderWidth: 2,
    borderColor: '#ffd21f',
    borderRadius: 12,
    zIndex: 4,
  },
  statusColumn: { width: 22, height: 32, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { width: 20, height: 20, borderRadius: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  statusBadgeText: { fontSize: 12, fontWeight: '900', lineHeight: 14, includeFontPadding: false },
  specialStatusText: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14, includeFontPadding: false, zIndex: 2 },
  monthBreakText: { color: '#000', fontSize: 12, fontWeight: '900', lineHeight: 14, includeFontPadding: false, zIndex: 2 },
  hiddenMoveText: { color: '#000', fontSize: 12, fontWeight: '900', lineHeight: 14, includeFontPadding: false, zIndex: 2 },
  monthBreakBadge: { backgroundColor: '#c8322a' },
  hiddenMoveBadge: { backgroundColor: '#6f3cc3' },
  voidBadge: { backgroundColor: '#e8e8e8' },
  voidStatusText: { color: '#111', fontSize: 12, fontWeight: '900', lineHeight: 14, includeFontPadding: false },
  strokeFull: { height: 8, borderRadius: 2, backgroundColor: '#000' },
  brokenWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  strokeHalf: { flex: 1, height: 8, borderRadius: 2, backgroundColor: '#000' },
  strokeMuted: { backgroundColor: '#555' },
  hiddenSpiritOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
    overflow: 'visible',
  },
  hiddenSpiritDownRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingLeft: 4,
    paddingRight: 2,
    zIndex: 40,
    elevation: 40,
    overflow: 'visible',
  },
  hiddenSpiritLineContent: { flex: 1, height: 32, justifyContent: 'center', overflow: 'visible' },
  hiddenSpiritBackground: { ...LIGHT_SHADOW, position: 'absolute', left: -12, right: 0, top: 0, bottom: 0, borderRadius: 5, backgroundColor: '#e8f3fb', zIndex: 0 },
  hiddenSpiritForeground: { zIndex: 2 },
  metaColumn: { width: META_COLUMN_WIDTH, height: 32, alignItems: 'center', justifyContent: 'center' },
  metaContent: { width: META_COLUMN_WIDTH, height: 32, alignItems: 'center', justifyContent: 'center' },
  metaPrimary: { fontSize: 12, fontWeight: '800', lineHeight: 14, includeFontPadding: false, textAlign: 'center', flexWrap: 'nowrap', letterSpacing: -0.2 },
  metaSecondary: { fontSize: 9, marginTop: 1, fontWeight: '700', lineHeight: 10, includeFontPadding: false, textAlign: 'center', flexWrap: 'nowrap', letterSpacing: -0.2 },
  hiddenSpiritMetaColumn: { overflow: 'visible', zIndex: 2 },
  hiddenSpiritMetaPrimary: { fontSize: 10, fontWeight: '900', lineHeight: 12, width: META_COLUMN_WIDTH, textAlign: 'center', includeFontPadding: false },
  hiddenSpiritMetaSecondary: { fontSize: 9, fontWeight: '900', lineHeight: 10, width: META_COLUMN_WIDTH, textAlign: 'center', includeFontPadding: false },
  contentBottomMask: {
    height: 0,
    marginHorizontal: 12,
    marginTop: -20,
    marginBottom: -6,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 2,
    elevation: 2,
  },
  summaryBlock: { flex: 1, marginHorizontal: 20, marginTop: -6, paddingTop: 6, alignItems: 'center', overflow: 'visible', backgroundColor: '#f7f7f7', zIndex: 1 },
  dividerDragZone: {
    position: 'absolute',
    bottom: -26,
    left: 12,
    right: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    zIndex: 60,
  },
  dividerHandleGrip: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#d9d9d9' },
  analysisTabsOverlay: { position: 'absolute', top: 40, left: -20, right: -20, zIndex: 80, elevation: 80, alignItems: 'center' },
  analysisTabs: { alignItems: 'center', overflow: 'visible' },
  analysisTabsInner: {
    width: 224,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  analysisTabPillShadow: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 56,
    height: 26,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    zIndex: 0,
  },
  analysisTabPill: { flex: 1, borderRadius: 12, backgroundColor: '#dff3e5' },
  analysisTabSlot: {
    width: 56,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 10,
    elevation: 12,
  },
  analysisTabLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    elevation: 9,
  },
  analysisTabText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },
  analysisTabDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#555' },
  analysisPager: { flex: 1, marginHorizontal: -20, backgroundColor: '#f7f7f7' },
  analysisPage: { flex: 1, backgroundColor: '#f7f7f7' },
  analysisPageContent: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 12, gap: 10 },
  aiPageContent: { flexGrow: 1 },
  resultDismissLayer: { gap: 15 },
  spiritPageContent: { paddingBottom: 24 },
  spiritCardList: { gap: 10 },
  aiReadingWrap: { gap: 10, paddingBottom: 18 },
  aiReadingWrapFill: { flex: 1, paddingBottom: 12 },
  aiEmptyShadow: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  aiEmptyCardFill: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  aiEmptyCard: {
    minHeight: 230,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  aiEmptyTitle: { fontSize: 18, fontWeight: '900', lineHeight: 24, textAlign: 'center' },
  aiEmptyBody: { fontSize: 13, fontWeight: '700', lineHeight: 20, textAlign: 'center' },
  aiGenerateButton: { height: 44, minWidth: 156, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 4 },
  aiGenerateButtonText: { fontSize: 14, fontWeight: '900' },
  aiErrorText: { color: '#c23a2b', fontSize: 12, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
  aiVerdictShadow: {
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  aiVerdictCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  aiVerdictHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  aiVerdictLabel: { fontSize: 11, fontWeight: '900', lineHeight: 15 },
  aiExpectedPill: { maxWidth: 156, borderRadius: 999, backgroundColor: '#d08a18', paddingHorizontal: 9, paddingVertical: 4 },
  aiExpectedPillText: { color: '#fff', fontSize: 10, fontWeight: '900', lineHeight: 13 },
  aiVerdictText: { fontSize: 22, fontWeight: '900', lineHeight: 30 },
  aiVerdictTextEn: { fontSize: 19, lineHeight: 26 },
  aiTimelineCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  aiSectionTitle: { fontSize: 13, fontWeight: '900', lineHeight: 18 },
  aiTimelineList: { flexDirection: 'row', alignItems: 'flex-start', gap: 0, marginTop: 6, paddingRight: 4 },
  aiTimelineNode: { alignItems: 'center', gap: 4 },
  aiTimelineNodeHead: { width: '100%', height: 10, alignItems: 'center', justifyContent: 'center' },
  aiTimelineDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  aiTimelineLine: { position: 'absolute', left: '50%', right: '-50%', top: 4, height: 2 },
  aiTimelineLabel: { fontSize: 12, fontWeight: '900', lineHeight: 17, textAlign: 'center' },
  aiTimelineTime: { fontSize: 10, fontWeight: '800', lineHeight: 14, textAlign: 'center' },
  aiLoaderShadow: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  aiLoaderCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  aiLoaderOrb: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLoaderRing: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
  },
  aiLoaderRingDelay: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  aiLoaderOrbit: {
    position: 'absolute',
    width: 92,
    height: 92,
  },
  aiLoaderSpark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    alignSelf: 'center',
  },
  aiLoaderCore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  aiLoaderCoreFill: {
    flex: 1,
  },
  aiLoaderTitle: { fontSize: 14, fontWeight: '900', lineHeight: 19, textAlign: 'center' },
  aiLoaderPhase: { fontSize: 12, fontWeight: '700', lineHeight: 17, textAlign: 'center', minHeight: 51, paddingHorizontal: 16 },
  aiPointList: { gap: 10 },
  aiPointCard: {
    borderRadius: 15,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  aiPointTitle: { fontSize: 14, fontWeight: '900', lineHeight: 19 },
  aiEvidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiEvidenceTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '900', lineHeight: 13, overflow: 'hidden', maxWidth: '100%' },
  aiPointExplanation: { fontSize: 12, fontWeight: '700', lineHeight: 19 },
  aiRefreshButton: { height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiRefreshButtonText: { fontSize: 13, fontWeight: '900' },
  spiritAnalysisCard: {
    borderRadius: 14,
    padding: 12,
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  useGodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  spiritTitleLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flex: 1, minWidth: 0 },
  spiritMetaRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexShrink: 0 },
  spiritStrengthPill: {
    minWidth: 42,
    maxWidth: 84,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center',
    overflow: 'hidden',
  },
  spiritStrengthPillEn: { minWidth: 48, maxWidth: 88, fontSize: 9 },
  summaryTitle: { color: '#000', fontSize: 13, fontWeight: '800' },
  summaryTitleEn: { fontSize: 12, flexShrink: 0 },
  useGodValue: { fontSize: 13, fontWeight: '900', lineHeight: 24 },
  useGodValueEn: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 18, flexWrap: 'wrap' },
  spiritPositionText: { color: '#000', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  spiritVerdictText: { color: '#111', fontSize: 13, fontWeight: '800', lineHeight: 19 },
  spiritEvidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  spiritEvidenceTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
    overflow: 'hidden',
  },
  spiritEvidenceTagEn: { maxWidth: 110, fontSize: 9 },
  summaryText: { color: '#333', fontSize: 12, lineHeight: 18 },
  unionCard: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    backgroundColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  unionAnalysisWrap: { gap: 10, paddingBottom: 12 },
  unionHeroCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  unionHeroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  unionHeroTitleWrap: { flex: 1, gap: 6 },
  unionTitleEn: { fontSize: 13, lineHeight: 18 },
  unionResultCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  unionResultCircleText: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 16, textAlign: 'center' },
  unionResultCircleTextEn: { width: 56, fontSize: 12, lineHeight: 14 },
  unionHeroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unionHeroTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  unionDiagramCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  unionDiagramHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  unionDiagramTitle: { fontSize: 13, fontWeight: '900', lineHeight: 18, flexShrink: 0 },
  unionDiagramHeaderRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: 1, minWidth: 0 },
  unionDiagramSwitch: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  unionDiagramSwitchButton: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  unionDiagramSwitchText: { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  unionDiagramCountText: { minWidth: 24, fontSize: 10, fontWeight: '900', lineHeight: 13, textAlign: 'center' },
  unionDiagramBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '900', lineHeight: 13, overflow: 'hidden' },
  unionDiagramBadgeEn: { maxWidth: 132, fontSize: 9 },
  unionDiagramCanvas: { height: 252, position: 'relative', overflow: 'visible' },
  unionMarkerLayer: { ...StyleSheet.absoluteFillObject, zIndex: 3 },
  unionDiagramLineRow: { position: 'absolute', left: 0, right: 0, height: 38, flexDirection: 'row', alignItems: 'center' },
  unionDiagramLineLabel: { width: 42, fontSize: 11, fontWeight: '800', lineHeight: 14 },
  unionDiagramLineLabelEn: { width: 34, fontSize: 10 },
  unionHexLine: { width: 236, height: 8, borderRadius: 3 },
  unionTriangleLine: { position: 'absolute', height: 2, borderRadius: 999, transformOrigin: 'center', opacity: 0.5, zIndex: 3 },
  unionBranchNode: {
    position: 'absolute',
    top: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.84)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 5,
  },
  unionBranchNodeText: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 18 },
  unionBranchNodeTextEn: { width: 34, fontSize: 11 },
  unionDiagramSideLabels: { marginLeft: 10, minWidth: 48, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unionDiagramSideLabel: {
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center',
  },
  unionPatternCard: {
    borderRadius: 16,
    padding: 13,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 9,
  },
  unionPatternHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  unionPatternTitleWrap: { flex: 1, gap: 2 },
  unionPatternKind: { fontSize: 10, fontWeight: '900', lineHeight: 13 },
  unionPatternName: { fontSize: 13, fontWeight: '900', lineHeight: 18 },
  unionPatternNameEn: { fontSize: 12, lineHeight: 17 },
  unionStatusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 118 },
  unionStatusText: { fontSize: 10, fontWeight: '900', lineHeight: 13 },
  unionStatusTextEn: { fontSize: 9 },
  unionParticipantsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unionParticipantPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '100%' },
  unionParticipantText: { color: '#fff', fontSize: 10, fontWeight: '900', lineHeight: 14 },
  unionParticipantTextEn: { fontSize: 9, lineHeight: 13 },
  unionImpactText: { fontSize: 12, fontWeight: '800', lineHeight: 18 },
  unionEvidenceList: { gap: 5 },
  unionEvidenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  unionEvidenceDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 6 },
  unionEvidenceText: { flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 17 },
  resultInfoCard: {
    minHeight: 160,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    backgroundColor: '#e6f0f8',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  resultInfoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  resultInfoLabel: { width: 68, color: '#555', fontSize: 12, fontWeight: '800', lineHeight: 18 },
  resultInfoLabelWide: { width: 112 },
  resultInfoValue: { flex: 1, color: '#111', fontSize: 12, fontWeight: '800', lineHeight: 18, textAlign: 'right' },
  resultNoteCard: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  resultNoteMeasureCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: -1000,
    opacity: 0,
    zIndex: -1,
  },
  resultNotePlaceholder: { height: 194 },
  resultNoteBackground: { ...StyleSheet.absoluteFillObject },
  resultNoteFulfilledBackground: { backgroundColor: '#dceee1' },
  resultNoteUnfulfilledBackground: { backgroundColor: '#f4ddd7' },
  resultNoteHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  resultNoteTime: { color: '#666', fontSize: 10, fontWeight: '700', marginTop: 3 },
  deleteIconButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  deleteIconBackground: {
    position: 'absolute',
    left: 1,
    top: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  deleteIconText: {
    position: 'absolute',
    left: 0,
    top: -1,
    width: 30,
    height: 30,
    color: '#111',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
    includeFontPadding: false,
  },
  deleteIconTextArmed: { color: '#d63f31' },
  deleteIconOverlayText: {},
  fulfillmentSwitchRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 13, padding: 4, gap: 4, overflow: 'hidden', position: 'relative' },
  fulfillmentSwitchIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fulfillmentSwitchOption: { flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  fulfillmentSwitchText: { color: '#555', fontSize: 12, fontWeight: '900' },
  fulfillmentActiveText: { color: '#111' },
  resultNoteInputWrap: { position: 'relative' },
  resultNoteInput: { minHeight: 86, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.78)', padding: 12, color: '#111', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  addResultCard: {
    height: 66,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  addResultIcon: { color: '#fff', fontSize: 24, fontWeight: '600', lineHeight: 28 },
  addResultText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  unionTitle: { color: '#000', fontSize: 13, fontWeight: '900' },
  unionText: { color: '#333', fontSize: 12, lineHeight: 19, fontWeight: '600' },
  saveRecordButton: { height: 44, borderRadius: 8, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  saveRecordButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  spiritReasonCard: { ...SOFT_SHADOW, position: 'absolute', width: 260, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8d8d8', padding: 14, gap: 9 },
  spiritReasonTitle: { color: '#000', fontSize: 15, fontWeight: '900' },
  spiritReasonBody: { color: '#222', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  unsavedBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  unsavedCard: {
    ...SOFT_SHADOW,
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    backgroundColor: '#fff',
    padding: 20,
    gap: 12,
  },
  unsavedTitle: { color: '#000', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  unsavedBody: { color: '#444', fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  unsavedActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  unsavedButton: { flex: 1, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  unsavedSecondaryButton: { backgroundColor: '#f1f1f1' },
  unsavedPrimaryButton: { backgroundColor: '#000' },
  unsavedSecondaryText: { color: '#111', fontSize: 14, fontWeight: '900' },
  unsavedPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  edgeBackGestureArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 80,
    elevation: 80,
  },
  analysisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ruleCard: { width: '100%', borderWidth: 1, borderColor: '#000', padding: 12, gap: 4 },
  ruleTitle: { color: '#000', fontSize: 13, fontWeight: '800' },
  ruleText: { color: '#444', fontSize: 11, lineHeight: 17 },
  itemCard: { width: '48%', borderWidth: 1, borderColor: '#000', padding: 12, minHeight: 76, justifyContent: 'space-between' },
  itemTitle: { color: '#555', fontSize: 11, fontWeight: '700' },
  itemValue: { color: '#000', fontSize: 14, fontWeight: '800', lineHeight: 20 },
});
