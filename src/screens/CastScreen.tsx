import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Cast'>;

function deriveLineStrength(coins: number[]) {
  const total = coins.reduce((sum, value) => sum + value, 0);
  if (total === 6) return 6;
  if (total === 7) return 7;
  if (total === 8) return 8;
  return 9;
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

  const canThrow = step < 6;
  const instruction = useMemo(() => (canThrow ? `第 ${step + 1} 爻` : '卦象已成'), [canThrow, step]);

  const throwCoin = () => {
    if (!canThrow) return;
    const coins = Array.from({ length: 3 }, () => (Math.random() > 0.5 ? 3 : 2)) as (2 | 3)[];
    const strength = forceStaticHexagram ? (Math.random() > 0.5 ? 7 : 8) : deriveLineStrength(coins);
    const nextStrengths = [...lineStrengths, strength];
    setCurrentCoins(coins);
    setLineStrengths(nextStrengths);
    setFlipSeed((seed) => seed + 1);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep === 6) {
      const lunarInfo = buildLunarInfo(question);
      const finalStrengths = forceHiddenSpiritHexagram
        ? generateHiddenSpiritTestStrengths(lunarInfo)
        : testSpecialStatus
          ? generateTestStrengths(testSpecialStatus, lunarInfo)
          : nextStrengths;
      setLineStrengths(finalStrengths);
      const generatedHexagram = generateHexagram(finalStrengths, lunarInfo);
      const hexagram = forceHiddenSpiritHexagram
        ? ensureTestHiddenSpirit(generatedHexagram, lunarInfo)
        : testSpecialStatus
          ? ensureTestSpecialStatus(generatedHexagram, testSpecialStatus)
          : generatedHexagram;
      const analysis = analyzeHexagram(question, hexagram, lunarInfo);
      navigation.replace('Analysis', {
        record: {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          question,
          createdAt: new Date().toISOString(),
          hexagram,
          lunarInfo,
          analysis,
          aiReading: `AI 解读占位：\n问题：${question}\n卦名：${hexagram.name}\n\n后续可接入大模型接口，将此处替换为正式解卦结果。`,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>铜钱起卦</Text>
          <Text style={styles.subtitle}>{question}</Text>
        </View>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.step}>{instruction}</Text>
            <Text style={styles.ghost}>{step}/6</Text>
          </View>
          <View style={styles.coinRow}>
            {COIN_LABELS.map((label, index) => (
              <View key={label} style={styles.coinSlot}>
                <FortuneCoin value={currentCoins[index]} index={index} flipSeed={flipSeed} />
                <Text style={styles.coinText}>铜钱 {label}</Text>
              </View>
            ))}
          </View>
          <Pressable style={[styles.button, !canThrow && styles.buttonDisabled]} onPress={throwCoin} disabled={!canThrow}>
            <Text style={styles.buttonText}>{canThrow ? '摇动铜钱' : '正在入卦'}</Text>
          </Pressable>
        </View>
        <View style={styles.history}>
          {lineStrengths.map((strength, index) => (
            <View key={`${index}-${strength}`} style={styles.historyPill}>
              <Text style={styles.historyText}>第 {index + 1} 爻</Text>
              <Text style={styles.historyValue}>{strength === 6 ? '老阴' : strength === 7 ? '少阳' : strength === 8 ? '少阴' : '老阳'}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20, gap: 18 },
  header: { gap: 8 },
  title: { color: '#000', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#4f4f4f', fontSize: 14, lineHeight: 21 },
  panel: {
    borderWidth: 1,
    borderColor: '#111',
    backgroundColor: '#fff',
    padding: 18,
    gap: 22,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { color: '#000', fontSize: 22, fontWeight: '800' },
  ghost: { color: '#000', fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: '#000', paddingHorizontal: 10, paddingVertical: 4 },
  coinRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  coinSlot: { flex: 1, alignItems: 'center', gap: 8 },
  coinText: { color: '#4a4a4a', fontSize: 12, fontWeight: '600' },
  button: { height: 52, borderRadius: 6, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  history: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyPill: { borderWidth: 1, borderColor: '#000', paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  historyText: { color: '#6b6b6b', fontSize: 11 },
  historyValue: { color: '#000', fontSize: 13, fontWeight: '800' },
});
