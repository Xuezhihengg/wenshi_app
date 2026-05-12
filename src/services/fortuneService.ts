import { analyzeHexagram, buildLunarInfo, createAiPrompt, generateHexagram } from '../utils/fortune';
import { AnalysisResult, FortuneRecord } from '../domain/types';

export function createRecordId() {
  const cryptoObject = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function randomLineStrength(): 6 | 7 | 8 | 9 {
  const roll = Math.floor(Math.random() * 16) + 1;
  if (roll <= 1) return 6;
  if (roll <= 7) return 7;
  if (roll <= 13) return 8;
  return 9;
}

export function createFortuneRecord(question: string, aiReading?: string): FortuneRecord {
  const castAt = new Date();
  const strengths = Array.from({ length: 6 }, () => randomLineStrength());
  const lunarInfo = buildLunarInfo(question, castAt);
  const hexagram = generateHexagram(strengths, lunarInfo);
  const analysis: AnalysisResult = analyzeHexagram(question, hexagram, lunarInfo);
  return {
    id: createRecordId(),
    question,
    createdAt: castAt.toISOString(),
    hexagram,
    lunarInfo,
    analysis,
    aiReading:
      aiReading ??
      `AI 解读占位：\n${createAiPrompt(question, hexagram, analysis, lunarInfo)}\n\n建议后续接入大模型接口替换这里的文本。`,
  };
}
