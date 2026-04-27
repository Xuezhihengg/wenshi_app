import { FortuneRecord } from '../domain/types';

export type RootStackParamList = {
  Question: undefined;
  Cast: { question: string };
  Analysis: { record: FortuneRecord };
  AIReading: { record: FortuneRecord };
  Save: { record?: FortuneRecord } | undefined;
  Profile: undefined;
};
