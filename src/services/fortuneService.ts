import { analyzeHexagram, buildLunarInfo, createAiPrompt, generateHexagram } from '../utils/fortune';
import { AnalysisResult, FortuneRecord } from '../domain/types';

function randomLineStrength(): 6 | 7 | 8 | 9 {
  const roll = Math.floor(Math.random() * 16) + 1;
  if (roll <= 1) return 6;
  if (roll <= 7) return 7;
  if (roll <= 13) return 8;
  return 9;
}

export function createFortuneRecord(question: string, aiReading?: string): FortuneRecord {
  const strengths = Array.from({ length: 6 }, () => randomLineStrength());
  const lunarInfo = buildLunarInfo(question);
  const hexagram = generateHexagram(strengths, lunarInfo);
  const analysis: AnalysisResult = analyzeHexagram(question, hexagram, lunarInfo);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question,
    createdAt: new Date().toISOString(),
    hexagram,
    lunarInfo,
    analysis,
    aiReading:
      aiReading ??
      `AI 解读占位：\n${createAiPrompt(question, hexagram, analysis, lunarInfo)}\n\n建议后续接入大模型接口替换这里的文本。`,
  };
}
