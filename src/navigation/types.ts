import { FortuneRecord } from '../domain/types';

export type RootStackParamList = {
  Login: undefined;
  ProfileSetup: { fresh?: boolean } | undefined;
  Question: undefined;
  Cast: { question: string; profile?: FortuneRecord['profile'] };
  Analysis: { record: FortuneRecord; fromHistory?: boolean };
  AIReading: { record: FortuneRecord };
  Save: { record?: FortuneRecord; initialFilter?: 'all' | 'today' | 'week' | 'month' | 'favorite' | 'fulfilled' | 'unfulfilled' } | undefined;
  Profile: undefined;
  ArchiveCenter: { profileId?: string } | undefined;
  ProfileEdit: undefined;
  PhoneBind: undefined;
  EmailBind: undefined;
  Settings: undefined;
  Feedback: undefined;
  About: undefined;
  MemberCenter: undefined;
};
