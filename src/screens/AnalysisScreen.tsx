import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { hexagramTextFor, type HexagramTextSection } from '../domain/hexagramTexts';
import { HexagramLine, SpiritAnalysis, YinYang } from '../domain/types';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;
type MetaMode = 'sixKin' | 'sixSpirit';
const META_COLUMN_WIDTH = 54;

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

const SPIRIT_ELEMENTS: Record<string, string> = {
  青龙: '木',
  朱雀: '火',
  勾陈: '土',
  腾蛇: '土',
  白虎: '金',
  玄武: '水',
};

const MODE_LABELS: Record<MetaMode, string> = {
  sixKin: '六亲',
  sixSpirit: '六神',
};

const TEXT_SECTION_LABELS: Record<HexagramTextSection, string> = {
  judgment: '卦辞',
  tuan: '彖辞',
  image: '象辞',
  lines: '爻辞',
};

const TEXT_SECTIONS: HexagramTextSection[] = ['judgment', 'tuan', 'image', 'lines'];

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

function roleText(line: HexagramLine) {
  if (line.role === 'world') return '世';
  if (line.role === 'response') return '应';
  return '';
}

function roleLabels(line: HexagramLine, spiritAnalyses: SpiritAnalysis[]) {
  return [
    roleText(line),
    ...spiritAnalyses
      .filter((analysis) => analysis.lineIndex === line.index && !analysis.isHidden)
      .map((analysis) => spiritShortLabel(analysis.title)),
  ].filter(Boolean);
}

function lineColor(line: HexagramLine) {
  return ELEMENT_COLORS[line.branchElement ?? ''] ?? '#000';
}

function spiritAnalysisColor(analysis: SpiritAnalysis | undefined, fallback: string) {
  if (!analysis?.color) return fallback;
  return ELEMENT_COLORS[analysis.color] ?? fallback;
}

function spiritAnalysisBackground(analysis: SpiritAnalysis | undefined) {
  if (!analysis?.color) return '#f2f2f2';
  return ELEMENT_LIGHT_COLORS[analysis.color] ?? '#f2f2f2';
}

function spiritShortLabel(title: SpiritAnalysis['title']) {
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

function metaTextForMode(line: HexagramLine, mode: MetaMode) {
  if (mode === 'sixSpirit') {
    return { primary: line.sixSpirit, secondary: '', color: spiritColor(line) };
  }
  return { primary: line.sixKin, secondary: `${line.branchElement} · ${line.stemBranch}`, color: lineColor(line) };
}

type FullTextBlock = {
  title: string;
  original: string;
  translation?: string;
};

function plainMeaning(original: string, section: HexagramTextSection) {
  if (!original) return '暂无释义。';
  const prefix = TEXT_SECTION_LABELS[section];
  return `${prefix}提示：这段文字说明本卦在当前部分的核心含义。宜结合所问之事、世应、用神、动爻以及日月旺衰综合判断；吉处看其可用之机，凶处看其所警之失。`;
}

function splitImageLines(text: ReturnType<typeof hexagramTextFor>) {
  return text?.image.split('\n').filter(Boolean) ?? [];
}

function splitYaoLines(text: ReturnType<typeof hexagramTextFor>) {
  return text?.lines.split('\n').filter(Boolean) ?? [];
}

function fullTextBlocks(text: ReturnType<typeof hexagramTextFor>, section: HexagramTextSection): FullTextBlock[] {
  if (!text) return [{ title: '暂无内容', original: '暂无内容。' }];
  if (section === 'judgment' || section === 'tuan') {
    const original = text[section] || '暂无内容。';
    return [
      { title: '原文', original },
      { title: '白话释义', original: plainMeaning(original, section) },
    ];
  }
  if (section === 'image') {
    const yaoTitles = splitYaoLines(text).map((line) => line.split('：')[0]).filter(Boolean);
    return splitImageLines(text).map((original, index) => ({
      title: index === 0 ? '大象' : yaoTitles[index - 1] ?? `第 ${index} 爻`,
      original,
      translation: plainMeaning(original, section),
    }));
  }
  return splitYaoLines(text).map((original, index) => ({
    title: original.split('：')[0] || `第 ${index + 1} 爻`,
    original,
    translation: plainMeaning(original, section),
  }));
}

function hiddenSpiritMetaForMode(line: HexagramLine, mode: MetaMode) {
  const hiddenSpirit = line.hiddenSpirit;
  if (!hiddenSpirit) return undefined;
  if (mode === 'sixSpirit') {
    return { primary: line.sixSpirit, secondary: '', color: spiritColor(line) };
  }
  return {
    primary: `${hiddenSpirit.sixKin}﹙伏﹚`,
    secondary: `${hiddenSpirit.branchElement} · ${hiddenSpirit.stemBranch}`,
    color: ELEMENT_COLORS[hiddenSpirit.branchElement] ?? '#333',
  };
}

type MetaDisplay = ReturnType<typeof metaTextForMode>;

function MetaDisplayLayer({
  meta,
  primaryStyle,
  secondaryStyle,
  fitText = false,
}: {
  meta: MetaDisplay | undefined;
  primaryStyle?: object;
  secondaryStyle?: object;
  fitText?: boolean;
}) {
  if (!meta) return null;
  return (
    <>
      <Text
        numberOfLines={fitText ? 1 : undefined}
        adjustsFontSizeToFit={fitText}
        minimumFontScale={0.72}
        style={[styles.metaPrimary, primaryStyle, { color: meta.color }]}
      >
        {meta.primary}
      </Text>
      {meta.secondary ? (
        <Text
          numberOfLines={fitText ? 1 : undefined}
          adjustsFontSizeToFit={fitText}
          minimumFontScale={0.8}
          style={[styles.metaSecondary, secondaryStyle, { color: meta.color }]}
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
}: {
  meta: MetaDisplay | undefined;
  opacity: Animated.Value | Animated.AnimatedMultiplication<number>;
  translateX: Animated.Value;
  primaryStyle?: object;
  secondaryStyle?: object;
  fitText?: boolean;
}) {
  return (
    <Animated.View style={[styles.metaContent, { opacity, transform: [{ translateX }] }]}>
      <MetaDisplayLayer meta={meta} primaryStyle={primaryStyle} secondaryStyle={secondaryStyle} fitText={fitText} />
    </Animated.View>
  );
}

function hasEffectiveHiddenSpirit(line: HexagramLine) {
  if (!line.hiddenSpirit) return false;
  return !(line.hiddenSpirit.sixKin === line.sixKin && line.hiddenSpirit.stemBranch === line.stemBranch);
}

function HexagramMarkTags({ marks }: { marks?: string[] }) {
  if (!marks?.length) return null;
  return (
    <View style={styles.hexMarkRow}>
      {marks.map((mark) => (
        <Text key={mark} style={styles.hexMarkText}>{mark}</Text>
      ))}
    </View>
  );
}

function AnalysisPageTabs({ scrollX, pageWidth }: { scrollX: Animated.Value; pageWidth: number }) {
  const pillTranslateX = scrollX.interpolate({
    inputRange: [0, pageWidth * 0.22, pageWidth * 0.78, pageWidth],
    outputRange: [0, 8, 48, 56],
    extrapolate: 'clamp',
  });
  const firstTitleOpacity = scrollX.interpolate({
    inputRange: [0, pageWidth * 0.45, pageWidth],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const firstDotOpacity = scrollX.interpolate({
    inputRange: [0, pageWidth * 0.45, pageWidth],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });
  const secondDotOpacity = scrollX.interpolate({
    inputRange: [0, pageWidth * 0.55, pageWidth],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });
  const secondTitleOpacity = scrollX.interpolate({
    inputRange: [0, pageWidth * 0.55, pageWidth],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.analysisTabs}>
      <View style={styles.analysisTabsInner}>
        <Animated.View style={[styles.analysisTabPill, { transform: [{ translateX: pillTranslateX }] }]} />
        <View style={styles.analysisTabSlot}>
          <Animated.Text style={[styles.analysisTabText, { opacity: firstTitleOpacity }]}>四神</Animated.Text>
          <Animated.View style={[styles.analysisTabDot, { opacity: firstDotOpacity }]} />
        </View>
        <View style={styles.analysisTabSlot}>
          <Animated.View style={[styles.analysisTabDot, { opacity: secondDotOpacity }]} />
          <Animated.Text style={[styles.analysisTabText, { opacity: secondTitleOpacity }]}>合局</Animated.Text>
        </View>
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
                {TEXT_SECTION_LABELS[section]}
              </Animated.Text>
              <Animated.Text style={[styles.fullTextTabTextInactive, { opacity: inactiveOpacity }]}>
                {TEXT_SECTION_LABELS[section]}
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
  const color = spiritAnalysisColor(analysis, fallbackColor);
  return (
    <Pressable style={[styles.spiritAnalysisCard, { backgroundColor: spiritAnalysisBackground(analysis) }]} onPress={() => onCardPress(analysis)}>
      <Pressable
        style={styles.useGodRow}
        onPress={(event) => {
          event.stopPropagation();
          onTitlePress(analysis, event);
        }}
      >
        <View style={styles.spiritTitleLeft}>
          <Text style={styles.summaryTitle}>{analysis.title}</Text>
          <Text style={[styles.useGodValue, { color }]}>{analysis.displayName}</Text>
        </View>
        {analysis.positionName ? <Text style={styles.spiritPositionText}>{analysis.positionName}</Text> : null}
      </Pressable>
      <Text style={styles.summaryText}>{analysis.detail}</Text>
    </Pressable>
  );
}

function SpiritRipple({ active, progress }: { active: boolean; progress: Animated.Value }) {
  if (!active) return null;
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
  return <RawHexLine yinYang={line.yinYang} muted={muted} highlightColor={highlightColor} yinGap={yinGap} />;
}

function RawHexLine({ yinYang, muted = false, highlightColor, yinGap }: { yinYang: YinYang; muted?: boolean; highlightColor?: string; yinGap?: number }) {
  const strokeStyle = highlightColor ? { backgroundColor: highlightColor } : muted ? styles.strokeMuted : null;
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
  if (specialStatus === '月破') {
    return (
      <View style={[styles.statusBadge, styles.monthBreakBadge]}>
        <View style={styles.monthBreakMoon} />
        <View style={styles.monthBreakMoonCut} />
        <Text style={styles.monthBreakText}>破</Text>
      </View>
    );
  }

  if (specialStatus === '暗动') {
    return (
      <View style={[styles.statusBadge, styles.hiddenMoveBadge]}>
        <View style={styles.hiddenMoveSun} />
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
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>{normalizedStatus}</Text>
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
  rippleLineIndex,
  rippleIsHidden,
  rippleProgress,
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
  rippleLineIndex?: number;
  rippleIsHidden: boolean;
  rippleProgress: Animated.Value;
}) {
  const meta = metaTextForMode(baseLine, mode);
  const changedMeta = metaTextForMode(changedLine, mode);
  const changedLineOpacity = hasChanged ? 1 : unchangedChangedLinesProgress;
  const statusScale = statusVisualProgress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const isHiddenSpiritActive = activeHiddenSpiritIndex === baseLine.index;
  const hiddenOverlayOpacity = isHiddenSpiritActive ? hiddenSpiritOverlayProgress : 0;
  const hiddenOverlayTranslateX = hiddenSpiritOverlayProgress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });
  const hiddenOverlayTranslateY = hiddenSpiritOverlayProgress.interpolate({ inputRange: [0, 1], outputRange: [20, 32] });
  const canShowHiddenSpirit = hasEffectiveHiddenSpirit(baseLine);
  const hiddenSpirit = baseLine.hiddenSpirit;
  const hiddenMeta = hiddenSpiritMetaForMode(baseLine, mode);
  const isUseGodLine = useGodLineIndexes.includes(baseLine.index);
  const isHiddenUseGodLine = useGodHiddenLineIndexes.includes(baseLine.index);
  const hiddenUseGodColor = hiddenSpirit ? ELEMENT_COLORS[hiddenSpirit.branchElement] ?? useGodColor : useGodColor;
  const roleColumnLabels = roleLabels(baseLine, spiritAnalyses);
  const isRippleActive = rippleLineIndex === baseLine.index;
  const showBaseRipple = isRippleActive && !rippleIsHidden;
  const showHiddenRipple = isRippleActive && rippleIsHidden;
  const rowStyle = [styles.hexLineRow, (isRippleActive || isHiddenSpiritActive) ? styles.hexLineRowActive : null];
  const content = (
    <View style={rowStyle}>
      {hasChanged ? (
        <LinearGradient
          pointerEvents="none"
          colors={['#ffffff', '#fff8d6', '#fff0a8', '#fff8d6', '#ffffff']}
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
            <Text key={label} style={styles.roleText}>{label}</Text>
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
              <SpiritRipple active={showBaseRipple} progress={rippleProgress} />
            </View>
            <HexLine line={baseLine} muted={canShowHiddenSpirit} highlightColor={isUseGodLine ? useGodColor : undefined} yinGap={finalYinGap} />
          </View>
        </Pressable>
        <Animated.View style={[styles.statusColumn, { width: statusColumnWidth }]}>
          <Animated.View style={{ opacity: Animated.multiply(annotationOpacity, statusVisualProgress), transform: [{ scale: statusScale }] }}>
            <ElementalStatusBadge status={baseLine.elementalStatus} specialStatus={baseLine.specialStatus} />
          </Animated.View>
        </Animated.View>
        <Pressable style={styles.metaColumn} onPress={onToggleMode}>
          <MetaDisplaySwitcher meta={meta} translateX={metaTranslateX} opacity={Animated.multiply(annotationOpacity, metaOpacity)} />
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
                  <SpiritRipple active={showHiddenRipple} progress={rippleProgress} />
                </View>
                <Animated.View style={{ opacity: hiddenOverlayOpacity }}>
                  <RawHexLine yinYang={hiddenSpirit.yinYang} muted={!isHiddenUseGodLine} highlightColor={isHiddenUseGodLine ? hiddenUseGodColor : undefined} yinGap={finalYinGap} />
                </Animated.View>
              </Animated.View>
            </View>
            <Animated.View style={[styles.statusColumn, { width: statusColumnWidth }]}>
              <Animated.View style={{ opacity: Animated.multiply(Animated.multiply(annotationOpacity, statusVisualProgress), hiddenOverlayOpacity), transform: [{ scale: statusScale }] }}>
                <ElementalStatusBadge status={hiddenSpirit.elementalStatus} specialStatus={hiddenSpirit.specialStatus} />
              </Animated.View>
            </Animated.View>
            <Pressable style={[styles.metaColumn, styles.hiddenSpiritMetaColumn]} onPress={onToggleMode}>
              <MetaDisplaySwitcher
                meta={hiddenMeta}
                translateX={metaTranslateX}
                opacity={Animated.multiply(Animated.multiply(annotationOpacity, metaOpacity), hiddenOverlayOpacity)}
                primaryStyle={styles.hiddenSpiritMetaPrimary}
                secondaryStyle={styles.hiddenSpiritMetaSecondary}
                fitText
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
                    <SpiritRipple active={showHiddenRipple} progress={rippleProgress} />
                  </View>
                  <Animated.View style={{ opacity: hiddenOverlayOpacity }}>
                    <RawHexLine yinYang={hiddenSpirit.yinYang} muted={!isHiddenUseGodLine} highlightColor={isHiddenUseGodLine ? hiddenUseGodColor : undefined} yinGap={finalYinGap} />
                  </Animated.View>
                </Animated.View>
              </View>
              <Animated.View style={[styles.statusColumn, { width: statusColumnWidth }]}>
                <Animated.View style={{ opacity: Animated.multiply(Animated.multiply(annotationOpacity, statusVisualProgress), hiddenOverlayOpacity), transform: [{ scale: statusScale }] }}>
                  <ElementalStatusBadge status={hiddenSpirit.elementalStatus} specialStatus={hiddenSpirit.specialStatus} />
                </Animated.View>
              </Animated.View>
              <Pressable style={[styles.metaColumn, styles.hiddenSpiritMetaColumn]} onPress={onToggleMode}>
                <MetaDisplaySwitcher
                  meta={hiddenMeta}
                  translateX={metaTranslateX}
                  opacity={Animated.multiply(Animated.multiply(annotationOpacity, metaOpacity), hiddenOverlayOpacity)}
                  primaryStyle={styles.hiddenSpiritMetaPrimary}
                  secondaryStyle={styles.hiddenSpiritMetaSecondary}
                  fitText
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
          <Pressable style={styles.metaColumn} onPress={onToggleMode}>
            <MetaDisplaySwitcher
              meta={changedMeta}
              translateX={metaTranslateX}
              opacity={Animated.multiply(Animated.multiply(annotationOpacity, metaOpacity), changedLineOpacity)}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return content;
}

export function AnalysisScreen({ navigation, route }: Props) {
  const { record } = route.params;
  const { width: windowWidth } = useWindowDimensions();
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
  const [rippleLineIndex, setRippleLineIndex] = useState<number | undefined>();
  const [rippleIsHidden, setRippleIsHidden] = useState(false);
  const [selectedTextSection, setSelectedTextSection] = useState<HexagramTextSection>('judgment');
  const [finalYinGap, setFinalYinGap] = useState(INTRO_YIN_GAP);
  const statusVisualProgress = useRef(new Animated.Value(0)).current;
  const statusColumnWidth = useRef(new Animated.Value(0)).current;
  const unchangedChangedLinesProgress = useRef(new Animated.Value(1)).current;
  const metaOpacity = useRef(new Animated.Value(1)).current;
  const metaTranslateX = useRef(new Animated.Value(0)).current;
  const metaSwitching = useRef(false);
  const hiddenSpiritOverlayProgress = useRef(new Animated.Value(0)).current;
  const spiritRippleProgress = useRef(new Animated.Value(0)).current;
  const analysisPageScrollX = useRef(new Animated.Value(0)).current;
  const dividerCollapseProgress = useRef(new Animated.Value(0)).current;
  const dividerCollapseValue = useRef(0);
  const dividerGripOpacity = useRef(new Animated.Value(0)).current;
  const fullTextScrollX = useRef(new Animated.Value(0)).current;
  const fullTextPagerRef = useRef<ScrollView | null>(null);
  const hiddenSpiritAutoHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  const annotationOpacity = useRef(new Animated.Value(0)).current;
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

  const startSpiritRipple = (lineIndex: number, isHidden: boolean) => {
    setRippleLineIndex(lineIndex);
    setRippleIsHidden(isHidden);
    spiritRippleProgress.stopAnimation();
    spiritRippleProgress.setValue(0);
    Animated.timing(spiritRippleProgress, {
      toValue: 1,
      duration: 1380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRippleLineIndex(undefined);
    });
  };

  const focusSpiritLine = (analysis: SpiritAnalysis) => {
    if (analysis.lineIndex === undefined) return;
    if (hiddenSpiritAutoHideTimer.current) {
      clearTimeout(hiddenSpiritAutoHideTimer.current);
      hiddenSpiritAutoHideTimer.current = undefined;
    }
    startSpiritRipple(analysis.lineIndex, Boolean(analysis.isHidden));
    if (analysis.isHidden) {
      const line = record.hexagram.lines.find((item) => item.index === analysis.lineIndex);
      if (line) showHiddenSpirit(line);
      hiddenSpiritAutoHideTimer.current = setTimeout(() => {
        hideHiddenSpirit();
        hiddenSpiritAutoHideTimer.current = undefined;
      }, 1450);
      return;
    }
    hideHiddenSpirit();
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
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introTransitionOpacity, {
        toValue: hasChangedHexagram ? 1 : 0,
        duration: hasChangedHexagram ? 300 : 1,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introChangedOpacity, {
        toValue: hasChangedHexagram ? 1 : 0,
        duration: hasChangedHexagram ? 420 : 1,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(introTextOpacity, {
          toValue: 0,
          duration: 340,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(introHexOpacity, {
          toValue: 1,
          duration: 420,
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
      Animated.delay(260),
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
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introBaseHexTranslateY, {
              toValue: motion?.base?.translateY ?? -138,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introBaseHexScaleX, {
              toValue: motion?.base?.scaleX ?? 1,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introBaseHexScaleY, {
              toValue: motion?.base?.scaleY ?? 1,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexTranslateX, {
              toValue: motion?.changed?.translateX ?? motion?.base?.translateX ?? 0,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexTranslateY, {
              toValue: motion?.changed?.translateY ?? motion?.base?.translateY ?? -138,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexScaleX, {
              toValue: motion?.changed?.scaleX ?? motion?.base?.scaleX ?? 1,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introChangedHexScaleY, {
              toValue: motion?.changed?.scaleY ?? motion?.base?.scaleY ?? 1,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(mainOpacity, {
            toValue: 1,
            duration: 760,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(introOverlayOpacity, {
              toValue: 0,
              duration: 760,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(introHexOpacity, {
              toValue: 0,
              duration: 520,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(annotationOpacity, {
                toValue: 1,
                duration: 600,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
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
    annotationOpacity,
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
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: mainOpacity }]}>
        <Animated.View style={[styles.header, { opacity: annotationOpacity }]}>
          {hasChangedHexagram ? (
            <View style={styles.titleRow}>
              <Pressable onPress={(event) => openHexagramText(record.hexagram.name, event)}>
                <Text style={styles.title}>{record.hexagram.name}</Text>
              </Pressable>
              <Text style={styles.titleTransition}>变</Text>
              <Pressable onPress={(event) => openHexagramText(record.hexagram.changedName, event)}>
                <Text style={styles.title}>{record.hexagram.changedName}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={(event) => openHexagramText(record.hexagram.name, event)}>
              <Text style={styles.title}>{record.hexagram.name}</Text>
            </Pressable>
          )}
          <Text style={styles.subtitle}>{record.question}</Text>
        </Animated.View>
        <Animated.View style={[styles.collapsibleTop, { height: collapsibleHeight, opacity: collapsibleOpacity }]}>
          <Animated.View style={styles.dateInfoRow}>
            <Pressable style={styles.dateInfoItem} onPress={toggleStatus}>
              <Text style={styles.dateInfoLabel}>月建</Text>
              <Text style={[styles.dateInfoValue, { color: stemBranchColor(record.lunarInfo.monthStemBranch) }]}>{record.lunarInfo.monthStemBranch}</Text>
            </Pressable>
            <Pressable style={styles.dateInfoItem} onPress={toggleStatus}>
              <Text style={styles.dateInfoLabel}>日辰</Text>
              <View style={styles.dayInfoValueWrap}>
                <Text style={[styles.dateInfoValue, { color: stemBranchColor(record.lunarInfo.dayStemBranch) }]}>{record.lunarInfo.dayStemBranch}</Text>
                <Text style={styles.dateInfoSub}>旬空 {record.lunarInfo.voidBranches.join('')}</Text>
              </View>
            </Pressable>
          </Animated.View>
          <View style={styles.hexagramStage}>
            <Animated.View style={styles.hexHeaderRow}>
              <View style={styles.hexHeaderSide} />
              <View style={styles.hexGroup}>
                <Pressable style={styles.hexHeaderTitleButton} onPress={(event) => openHexagramText(record.hexagram.name, event)}>
                  <Text style={styles.hexHeaderTitle}>本卦 {baseShortName}</Text>
                </Pressable>
                <Pressable style={styles.modeButton} onPress={toggleMetaMode}>
                  <Text style={styles.modeButtonText}>{MODE_LABELS[metaMode]}</Text>
                </Pressable>
              </View>
              {hasChangedHexagram ? (
                <View style={styles.hexGroup}>
                  <Pressable style={styles.hexHeaderTitleButton} onPress={(event) => openHexagramText(record.hexagram.changedName, event)}>
                    <Text style={styles.hexHeaderTitle}>变卦 {changedShortName}</Text>
                  </Pressable>
                  <Pressable style={styles.modeButton} onPress={toggleMetaMode}>
                    <Text style={styles.modeButtonText}>{MODE_LABELS[metaMode]}</Text>
                  </Pressable>
                </View>
              ) : null}
            </Animated.View>
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
                    annotationOpacity={annotationOpacity}
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
                    rippleLineIndex={rippleLineIndex}
                    rippleIsHidden={rippleIsHidden}
                    rippleProgress={spiritRippleProgress}
                  />
                );
              })}
            </View>
            {hasHexagramMarks ? (
              <Animated.View style={styles.hexMarkLayoutRow}>
                <View style={styles.hexHeaderSide} />
                <View style={styles.hexGroup}>
                  <View style={styles.hexColumn}>
                    <HexagramMarkTags marks={record.hexagram.marks} />
                  </View>
                  <View style={styles.metaColumn} />
                </View>
                {hasChangedHexagram ? (
                  <View style={styles.hexGroup}>
                    <View style={styles.hexColumn}>
                      <HexagramMarkTags marks={record.hexagram.changedMarks} />
                    </View>
                    <View style={styles.metaColumn} />
                  </View>
                ) : null}
              </Animated.View>
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
      <View pointerEvents="none" style={styles.contentBottomMask} />
      <Animated.View style={[styles.summaryBlock, { opacity: annotationOpacity }]}>
        <Animated.View pointerEvents="none" style={[styles.analysisTabsOverlay, { opacity: annotationOpacity }]}>
          <AnalysisPageTabs scrollX={analysisPageScrollX} pageWidth={analysisPageWidth} />
        </Animated.View>
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          decelerationRate="fast"
          snapToInterval={analysisPageWidth}
          style={[styles.analysisPager, { width: analysisPageWidth }]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: analysisPageScrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
            <Animated.ScrollView
              style={[styles.analysisPage, { width: analysisPageWidth }]}
              contentContainerStyle={styles.analysisPageContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              <View style={styles.spiritCardList}>
                {(spiritAnalyses.length
                  ? spiritAnalyses
                  : [
                      {
                        title: '用神' as const,
                        sixKin: record.analysis.useGod,
                        displayName: record.analysis.useGod,
                        reason: record.analysis.useGodReason,
                        detail: record.analysis.summary,
                      },
                    ]
                ).map((analysis) => (
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
              style={[styles.analysisPage, { width: analysisPageWidth }]}
              contentContainerStyle={styles.analysisPageContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              <View style={styles.unionCard}>
                <Text style={styles.unionTitle}>三合六合</Text>
                <Text style={styles.unionText}>{record.analysis.sanHe || '当前未见明显合局。'}</Text>
              </View>
            </Animated.ScrollView>
        </Animated.ScrollView>
      </Animated.View>
      <Animated.View style={[styles.bottomAction, { opacity: annotationOpacity }]}>
        <Pressable style={styles.button} onPress={() => navigation.navigate('AIReading', { record })}>
          <Text style={styles.buttonText}>进入 AI 解卦</Text>
        </Pressable>
      </Animated.View>
      {showIntro ? (
        <Animated.View pointerEvents="none" style={[styles.introOverlay, { opacity: introOverlayOpacity }]}>
          <Animated.View style={[styles.introTitleRow, { opacity: introTextOpacity }]}>
            <Animated.Text numberOfLines={1} style={[styles.introTitleText, { opacity: introBaseOpacity }]}>
              {record.hexagram.name}
            </Animated.Text>
            {hasChangedHexagram ? (
              <>
                <Animated.Text numberOfLines={1} style={[styles.introTransitionText, { opacity: introTransitionOpacity }]}>
                  变
                </Animated.Text>
                <Animated.Text numberOfLines={1} style={[styles.introTitleText, { opacity: introChangedOpacity }]}>
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
          <Pressable style={[styles.textModalCard, { left: hexagramTextAnchor.x, top: hexagramTextAnchor.y }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.textModalTitleRow}>
              <Text style={styles.textModalTitle}>{visibleHexagramTextName}</Text>
              {selectedHexagramPalace ? <Text style={styles.hexagramPalaceText}>{selectedHexagramPalace}</Text> : null}
            </View>
            <View style={styles.textModalDivider} />
            <Text style={styles.textModalLabel}>卦辞</Text>
            <Text style={styles.textModalBody}>{selectedHexagramText?.judgment ?? '暂无卦辞。'}</Text>
            <Text style={styles.textModalLabel}>彖辞</Text>
            <Text style={styles.textModalBody}>{selectedHexagramText?.tuan ?? '暂无彖辞。'}</Text>
            <Pressable onPress={openFullHexagramText}>
              <Text style={styles.textModalLink}>查看全文</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={Boolean(selectedSpiritAnalysis)} animationType="fade" onRequestClose={() => setSelectedSpiritAnalysis(undefined)}>
        <Pressable style={styles.textModalBackdrop} onPress={() => setSelectedSpiritAnalysis(undefined)}>
          <Pressable style={[styles.spiritReasonCard, { left: spiritReasonAnchor.x, top: spiritReasonAnchor.y }]} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.spiritReasonTitle}>{selectedSpiritAnalysis?.title} {selectedSpiritAnalysis?.displayName}</Text>
            <View style={styles.textModalDivider} />
            <Text style={styles.spiritReasonBody}>{selectedSpiritAnalysis?.reason}</Text>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={Boolean(fullTextHexagramName)} animationType="fade" onRequestClose={() => setFullTextHexagramName(undefined)}>
        <View style={styles.fullTextBackdrop}>
          <Pressable style={styles.fullTextDismissLayer} onPress={() => setFullTextHexagramName(undefined)} />
          <View style={styles.fullTextCard}>
            <View style={styles.fullTextTitleRow}>
              <View style={styles.fullTextTitleNameRow}>
                <Text style={styles.fullTextTitle}>{fullTextHexagramName}</Text>
                {fullTextHexagramPalace ? <Text style={styles.hexagramPalaceText}>{fullTextHexagramPalace}</Text> : null}
              </View>
              <Pressable style={styles.fullTextClose} onPress={() => setFullTextHexagramName(undefined)}>
                <Text style={styles.fullTextCloseText}>×</Text>
              </Pressable>
            </View>
            <FullTextPageTabs scrollX={fullTextScrollX} pageWidth={fullTextPageWidth} onSelect={selectFullTextPage} />
            <View style={styles.fullTextLowerArea}>
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
                    {fullTextBlocks(fullHexagramText, section).map((block, index) => (
                      <View key={`${section}-${block.title}-${index}`} style={styles.fullTextBlockCard}>
                        <Text style={styles.fullTextBlockTitle}>{block.title}</Text>
                        <Text style={styles.fullTextBody}>{block.original}</Text>
                        {block.translation ? <Text style={styles.fullTextTranslation}>{block.translation}</Text> : null}
                      </View>
                    ))}
                  </Animated.ScrollView>
                ))}
              </Animated.ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  header: { gap: 6 },
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
    gap: 12,
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
  hexMarkLayoutRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 2, marginTop: -14 , marginBottom: -8},
  hexMarkRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hexMarkText: { color: '#000', fontSize: 11, fontWeight: '900', lineHeight: 14, includeFontPadding: false },
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
  monthBreakMoon: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  monthBreakMoonCut: { position: 'absolute', left: -3, top: -2, width: 13, height: 16, borderRadius: 8, backgroundColor: '#c8322a' },
  hiddenMoveBadge: { backgroundColor: '#6f3cc3' },
  hiddenMoveSun: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#f5a623' },
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
  metaPrimary: { fontSize: 12, fontWeight: '800', lineHeight: 14, includeFontPadding: false },
  metaSecondary: { fontSize: 9, marginTop: 1, fontWeight: '700', lineHeight: 10, includeFontPadding: false },
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
  analysisTabs: { alignItems: 'center' },
  analysisTabsInner: { width: 112, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  analysisTabPill: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 56,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dff3e5',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    zIndex: 2,
  },
  analysisTabSlot: { width: 56, height: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  analysisTabText: { position: 'absolute', color: '#111', fontSize: 12, fontWeight: '900', lineHeight: 16, zIndex: 3 },
  analysisTabDot: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#555', zIndex: 3 },
  analysisPager: { flex: 1, marginHorizontal: -20, backgroundColor: '#f7f7f7' },
  analysisPage: { flex: 1, backgroundColor: '#f7f7f7' },
  analysisPageContent: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 12, gap: 10 },
  spiritCardList: { gap: 10 },
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
  useGodRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  spiritTitleLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 },
  summaryTitle: { color: '#000', fontSize: 13, fontWeight: '800' },
  useGodValue: { fontSize: 13, fontWeight: '900', lineHeight: 24 },
  spiritPositionText: { color: '#000', fontSize: 12, fontWeight: '800', lineHeight: 24 },
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
  unionTitle: { color: '#000', fontSize: 13, fontWeight: '900' },
  unionText: { color: '#333', fontSize: 12, lineHeight: 19, fontWeight: '600' },
  bottomAction: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  spiritReasonCard: { ...SOFT_SHADOW, position: 'absolute', width: 260, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8d8d8', padding: 14, gap: 9 },
  spiritReasonTitle: { color: '#000', fontSize: 15, fontWeight: '900' },
  spiritReasonBody: { color: '#222', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  analysisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ruleCard: { width: '100%', borderWidth: 1, borderColor: '#000', padding: 12, gap: 4 },
  ruleTitle: { color: '#000', fontSize: 13, fontWeight: '800' },
  ruleText: { color: '#444', fontSize: 11, lineHeight: 17 },
  itemCard: { width: '48%', borderWidth: 1, borderColor: '#000', padding: 12, minHeight: 76, justifyContent: 'space-between' },
  itemTitle: { color: '#555', fontSize: 11, fontWeight: '700' },
  itemValue: { color: '#000', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  button: { height: 50, borderRadius: 6, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
