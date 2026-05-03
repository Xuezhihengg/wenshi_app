import AsyncStorage from '@react-native-async-storage/async-storage';
import { DivinationProfile } from '../domain/types';

const USER_PROFILE_KEY = 'wenshi.userProfile';

export type UserProfile = {
  nickname: string;
  gender: '未设置' | '男' | '女';
  birthday: string;
  avatarUri?: string;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  nickname: '未命名用户',
  gender: '未设置',
  birthday: '未填写',
};

let memoryUserProfile = { ...DEFAULT_USER_PROFILE };

export function userProfileToSelfArchive(profile: UserProfile): DivinationProfile {
  return {
    id: 'self',
    name: profile.nickname.trim() || DEFAULT_USER_PROFILE.nickname,
    relation: '本人',
    gender: profile.gender === '未设置' ? '其他' : profile.gender,
    birthday: profile.birthday.trim() || DEFAULT_USER_PROFILE.birthday,
    avatarUri: profile.avatarUri,
  };
}

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return memoryUserProfile;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    memoryUserProfile = { ...DEFAULT_USER_PROFILE, ...parsed };
    return memoryUserProfile;
  } catch (error) {
    console.warn('User profile storage unavailable, using memory profile.', error);
    return memoryUserProfile;
  }
}

export async function saveUserProfile(profile: UserProfile) {
  memoryUserProfile = {
    ...DEFAULT_USER_PROFILE,
    ...profile,
    nickname: profile.nickname.trim() || DEFAULT_USER_PROFILE.nickname,
    birthday: profile.birthday.trim() || DEFAULT_USER_PROFILE.birthday,
  };
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(memoryUserProfile));
  } catch (error) {
    console.warn('User profile storage unavailable, profile kept in memory only.', error);
  }
  return memoryUserProfile;
}
