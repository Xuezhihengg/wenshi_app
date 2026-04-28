import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, SafeAreaView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { FortuneCoin } from '../components/FortuneCoin';
import { RootStackParamList } from '../navigation/types';
import {
  analyzeHexagram,
  buildLunarInfo,
  ensureTestHiddenSpirit,
  ensureTestSpecialStatus,
  generateHexagram,
  generateHiddenSpiritTestStrengths,
  generateTestStrengths,
} from '../utils/fortune';

const COIN_LABELS = ['一', '二', '三'];
const STILLNESS_LINE_POOLS = [
  ['此刻', '放下杂念', '只问真心'],
  ['一念既起', '万象暂息', '只留所问'],
  ['静下来', '听见心里的声音', '让卦自己成形'],
  ['收住纷扰', '照见当下', '以诚起卦'],
  ['不求多念', '不问旁枝', '只问此心'],
  ['心息归一', '所念分明', '六爻将现'],
  ['把世界放轻', '把问题放正', '把答案交给此刻'],
  ['闭一闭心门', '留一线真意', '轻触即起'],
];
const TOUCH_HINTS = [
  '平心静气，轻触第 {n} 次',
  '心念不散，轻触第 {n} 次',
  '只守此问，落下第 {n} 爻',
  '顺其自然，轻触第 {n} 次',
  '意到即可，轻触第 {n} 次',
  '慢慢来，完成第 {n} 次',
  '念定于此，轻触第 {n} 次',
  '以诚相问，轻触第 {n} 次',
];

type Props = NativeStackScreenProps<RootStackParamList, 'Cast'>;
type TouchRipple = { id: number; x: number; y: number; progress: Animated.Value };

function deriveLineStrength(coins: number[]) {
  const total = coins.reduce((sum, value) => sum + value, 0);
  if (total === 6) return 6;
  if (total === 7) return 7;
  if (total === 8) return 8;
  return 9;
}

function isYangLine(strength: number) {
  return strength === 7 || strength === 9;
}

function lineLabel(strength: number) {
  if (strength === 6) return '老阴';
  if (strength === 7) return '少阳';
  if (strength === 8) return '少阴';
  return '老阳';
}

function pickRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function splitHintTemplate(template: string) {
  const [prefix, suffix = ''] = template.split('{n}');
  return { prefix, suffix };
}

function CastLine({ strength, progress }: { strength: number; progress: Animated.Value }) {
  const isOldLine = strength === 6 || strength === 9;
  const opacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });
  const scaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1],
    extrapolate: 'clamp',
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
    extrapolate: 'clamp',
  });
  const lineColor = isOldLine
    ? progress.interpolate({
      inputRange: [0, 0.2, 0.76, 1],
      outputRange: ['#d8a72f', '#d8a72f', '#d8a72f', '#000'],
      extrapolate: 'clamp',
    })
    : '#000';
  const yang = isYangLine(strength);

  return (
    <Animated.View style={[styles.lineRow, { opacity, transform: [{ translateY }] }]}>
      <Animated.View style={[styles.lineShape, { transform: [{ scaleX }] }]}>
        {yang ? (
          <Animated.View style={[styles.yangLine, { backgroundColor: lineColor }]} />
        ) : (
          <View style={styles.yinLineWrap}>
            <Animated.View style={[styles.yinLineSegment, { backgroundColor: lineColor }]} />
            <View style={styles.yinLineGap} />
            <Animated.View style={[styles.yinLineSegment, { backgroundColor: lineColor }]} />
          </View>
        )}
      </Animated.View>
      <Text style={styles.lineLabel}>{lineLabel(strength)}</Text>
    </Animated.View>
  );
}

function TouchRippleView({ ripple }: { ripple: TouchRipple }) {
  const opacity = ripple.progress.interpolate({
    inputRange: [0, 0.14, 0.58, 1],
    outputRange: [0, 0.9, 0.72, 0],
    extrapolate: 'clamp',
  });
  const scale = ripple.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 2.45],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.touchRipple,
        {
          left: ripple.x - 24,
          top: ripple.y - 24,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

export function CastScreen({ navigation, route }: Props) {
  const { question } = route.params;
  const trimmedQuestion = question.trim().toLowerCase();
  const forceStaticHexagram = trimmedQuestion === 'wbg';
  const testSpecialStatus = trimmedQuestion === 'yp' ? '月破' : trimmedQuestion === 'ad' ? '暗动' : undefined;
  const forceHiddenSpiritHexagram = trimmedQuestion === 'fs';
  const [step, setStep] = useState(0);
  const [currentCoins, setCurrentCoins] = useState<(2 | 3)[]>([]);
  const [lineStrengths, setLineStrengths] = useState<number[]>([]);
  const [flipSeed, setFlipSeed] = useState(0);
  const [touchRipples, setTouchRipples] = useState<TouchRipple[]>([]);
  const isCompleting = useRef(false);
  const touchRippleIdRef = useRef(0);
  const touchLayerRef = useRef<View | null>(null);
  const touchLayerOrigin = useRef({ x: 0, y: 0 });
  const stillnessProgress = useRef(new Animated.Value(0)).current;
  const coinProgress = useRef(new Animated.Value(0)).current;
  const hintProgress = useRef(new Animated.Value(0)).current;
  const touchHintOpacity = useRef(new Animated.Value(1)).current;
  const completeHintOpacity = useRef(new Animated.Value(0)).current;
  const lineProgress = useRef(Array.from({ length: 6 }, () => new Animated.Value(0))).current;
  const stillnessLines = useMemo(() => pickRandomItem(STILLNESS_LINE_POOLS), []);
  const hintTemplate = useMemo(() => pickRandomItem(TOUCH_HINTS), []);

  const canTouch = step < 6 && !isCompleting.current;
  const hintParts = useMemo(() => splitHintTemplate(hintTemplate), [hintTemplate]);
  const hintValue = useMemo(() => String(Math.min(step + 1, 6)), [step]);

  useEffect(() => {
    Animated.sequence([
      Animated.stagger(
        520,
        stillnessLines.map((_, index) =>
          Animated.timing(stillnessProgress, {
            toValue: (index + 1) / stillnessLines.length,
            duration: 980,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
      Animated.parallel([
        Animated.timing(coinProgress, {
          toValue: 1,
          duration: 1280,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(hintProgress, {
          toValue: 1,
          duration: 1380,
          delay: 420,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [coinProgress, hintProgress, stillnessLines, stillnessProgress]);

  const completeCast = (finalStrengths: number[]) => {
    if (isCompleting.current) return;
    isCompleting.current = true;
    const castAt = new Date();
    const lunarInfo = buildLunarInfo(question, castAt);
    const resolvedStrengths = forceHiddenSpiritHexagram
      ? generateHiddenSpiritTestStrengths(lunarInfo)
      : testSpecialStatus
        ? generateTestStrengths(testSpecialStatus, lunarInfo)
        : finalStrengths;
    setLineStrengths(resolvedStrengths);
    resolvedStrengths.forEach((_, index) => lineProgress[index].setValue(1));
    const generatedHexagram = generateHexagram(resolvedStrengths, lunarInfo);
    const hexagram = forceHiddenSpiritHexagram
      ? ensureTestHiddenSpirit(generatedHexagram, lunarInfo)
      : testSpecialStatus
        ? ensureTestSpecialStatus(generatedHexagram, testSpecialStatus)
        : generatedHexagram;
    const analysis = analyzeHexagram(question, hexagram, lunarInfo);

    setTimeout(() => {
      navigation.replace('Analysis', {
        record: {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          question,
          createdAt: castAt.toISOString(),
          hexagram,
          lunarInfo,
          analysis,
          aiReading: `AI 解读占位：\n问题：${question}\n卦名：${hexagram.name}\n\n后续可接入大模型接口，将此处替换为正式解卦结果。`,
        },
      });
    }, 680);
  };

  const startTouchFeedback = (event: GestureResponderEvent) => {
    if (!canTouch) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    touchLayerRef.current?.measureInWindow((x, y) => {
      touchLayerOrigin.current = { x, y };
    });
    const id = touchRippleIdRef.current + 1;
    touchRippleIdRef.current = id;
    const progress = new Animated.Value(0);
    const ripple = {
      id,
      x: event.nativeEvent.pageX - touchLayerOrigin.current.x,
      y: event.nativeEvent.pageY - touchLayerOrigin.current.y,
      progress,
    };
    setTouchRipples((current) => [...current, ripple]);
    Animated.timing(progress, {
      toValue: 1,
      duration: 980,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTouchRipples((current) => current.filter((item) => item.id !== id));
    });
  };

  const throwCoins = () => {
    if (!canTouch) return;
    const coins = Array.from({ length: 3 }, () => (Math.random() > 0.5 ? 3 : 2)) as (2 | 3)[];
    const strength = forceStaticHexagram ? (Math.random() > 0.5 ? 7 : 8) : deriveLineStrength(coins);
    const nextStrengths = [...lineStrengths, strength];
    const lineIndex = nextStrengths.length - 1;
    setCurrentCoins(coins);
    setLineStrengths(nextStrengths);
    setFlipSeed((seed) => seed + 1);
    setStep(nextStrengths.length);
    if (nextStrengths.length === 6) {
      Animated.sequence([
        Animated.delay(260),
        Animated.parallel([
          Animated.timing(touchHintOpacity, {
            toValue: 0,
            duration: 360,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(completeHintOpacity, {
            toValue: 1,
            duration: 460,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    lineProgress[lineIndex].setValue(0);
    Animated.timing(lineProgress[lineIndex], {
      toValue: 1,
      duration: 1080,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && nextStrengths.length === 6) {
        completeCast(nextStrengths);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable ref={touchLayerRef} collapsable={false} style={styles.touchLayer} onPressIn={startTouchFeedback} onPress={throwCoins}>
        <View pointerEvents="none" style={styles.touchRippleLayer}>
          {touchRipples.map((ripple) => <TouchRippleView key={ripple.id} ripple={ripple} />)}
        </View>
        <View style={styles.stillnessWrap}>
          {stillnessLines.map((line, index) => {
            const linePoint = (index + 1) / stillnessLines.length;
            const opacity = stillnessProgress.interpolate({
              inputRange: [Math.max(0, linePoint - 0.34), linePoint],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            });
            const translateY = stillnessProgress.interpolate({
              inputRange: [Math.max(0, linePoint - 0.34), linePoint],
              outputRange: [10, 0],
              extrapolate: 'clamp',
            });
            return (
              <Animated.Text key={line} style={[styles.stillnessText, { opacity, transform: [{ translateY }] }]}>
                {line}
              </Animated.Text>
            );
          })}
        </View>

        <Animated.View
          style={[
            styles.coinRow,
            {
              opacity: coinProgress,
              transform: [
                {
                  translateY: coinProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                {
                  scale: coinProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {COIN_LABELS.map((label, index) => (
            <View key={label} style={styles.coinSlot}>
              <FortuneCoin value={currentCoins[index]} index={index} flipSeed={flipSeed} />
            </View>
          ))}
        </Animated.View>

        <View style={styles.castArea}>
          <View style={styles.hexagramStack}>
            {Array.from({ length: 6 }, (_, displayIndex) => {
              const lineIndex = 5 - displayIndex;
              const strength = lineStrengths[lineIndex];
              return (
                <View key={lineIndex} style={styles.lineSlot}>
                  {strength ? <CastLine strength={strength} progress={lineProgress[lineIndex]} /> : null}
                </View>
              );
            })}
          </View>
          <Animated.View
            style={[
              styles.hintWrap,
              {
                opacity: hintProgress,
                transform: [
                  {
                    translateY: hintProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.hintLineStack}>
              <Animated.View style={[styles.hintLine, { opacity: touchHintOpacity }]}>
                <Text style={styles.hintText}>{hintParts.prefix}</Text>
                <Text style={styles.hintText}>{hintValue}</Text>
                <Text style={styles.hintText}>{hintParts.suffix}</Text>
              </Animated.View>
              <Animated.View style={[styles.hintLine, styles.completeHintLine, { opacity: completeHintOpacity }]}>
                <Text style={styles.hintText}>卦象已成，片刻入卦</Text>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  touchLayer: { flex: 1, alignItems: 'center' },
  touchRippleLayer: { ...StyleSheet.absoluteFillObject, overflow: 'visible', zIndex: 20 },
  touchRipple: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffd21f',
    backgroundColor: 'rgba(255, 210, 31, 0.08)',
  },
  stillnessWrap: { position: 'absolute', top: '14%', alignItems: 'center', gap: 7 },
  stillnessText: { color: '#111', fontSize: 13, lineHeight: 22, fontWeight: '600', letterSpacing: 1.5 },
  coinRow: { position: 'absolute', top: '33%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  coinSlot: { width: 92, alignItems: 'center' },
  castArea: { position: 'absolute', top: '54%', alignItems: 'center' },
  hexagramStack: { height: 178, justifyContent: 'flex-end', gap: 8, marginBottom: 16 },
  lineSlot: { width: 244, height: 22, alignItems: 'center', justifyContent: 'center' },
  lineRow: { width: 244, height: 22, alignItems: 'center', justifyContent: 'center' },
  lineShape: { width: 170, height: 12, alignItems: 'center', justifyContent: 'center' },
  yangLine: { width: 170, height: 10, borderRadius: 2, backgroundColor: '#000' },
  yinLineWrap: { width: 170, height: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yinLineSegment: { width: 76, height: 10, borderRadius: 2, backgroundColor: '#000' },
  yinLineGap: { width: 18 },
  lineLabel: { position: 'absolute', right: 0, color: '#777', fontSize: 11, fontWeight: '700' },
  hintWrap: { alignItems: 'center', gap: 7, marginTop: 72 },
  hintLineStack: { minWidth: 220, height: 20, alignItems: 'center', justifyContent: 'center' },
  hintLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  completeHintLine: { position: 'absolute' },
  hintText: { color: '#111', fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
});
