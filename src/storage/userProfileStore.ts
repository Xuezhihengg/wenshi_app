import AsyncStorage from '@react-native-async-storage/async-storage';
import { DivinationProfile } from '../domain/types';
import { listRemoteProfiles, syncRemoteSelfProfile } from '../api/profiles';

const USER_PROFILE_KEY = 'wenshi.userProfile';
const CURRENT_ACCOUNT_KEY = 'wenshi.currentAccount';

export type UserProfile = {
  nickname: string;
  gender: '未填写' | '男' | '女';
  birthday: string;
  avatarUri?: string;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  nickname: '未命名用户',
  gender: '未填写',
  birthday: '未填写',
};

let memoryUserProfile = { ...DEFAULT_USER_PROFILE };

export function userProfileToSelfArchive(profile: UserProfile): DivinationProfile {
  return {
    id: 'self',
    name: profile.nickname.trim() || DEFAULT_USER_PROFILE.nickname,
    relation: '本人',
    gender: profile.gender,
    birthday: profile.birthday.trim() || DEFAULT_USER_PROFILE.birthday,
    avatarUri: profile.avatarUri,
  };
}

export function selfArchiveToUserProfile(profile: DivinationProfile): UserProfile {
  return {
    nickname: profile.name.trim() || DEFAULT_USER_PROFILE.nickname,
    gender: profile.gender,
    birthday: profile.birthday.trim() || DEFAULT_USER_PROFILE.birthday,
    avatarUri: profile.avatarUri,
  };
}

async function persistUserProfile(profile: UserProfile) {
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

export async function syncUserProfileFromSelfArchive(profile: DivinationProfile): Promise<UserProfile> {
  if (profile.id !== 'self' && profile.relation !== '本人') return getUserProfile();
  return persistUserProfile(selfArchiveToUserProfile(profile));
}

async function getLocalUserProfile(): Promise<UserProfile> {
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

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const profiles = await listRemoteProfiles();
    const selfProfile = profiles.find((profile) => profile.id === 'self' || profile.relation === '本人');
    if (selfProfile) return syncUserProfileFromSelfArchive(selfProfile);
  } catch (error) {
    console.warn('Remote user profile unavailable, using local profile.', error);
  }
  return getLocalUserProfile();
}

export async function saveUserProfile(profile: UserProfile) {
  await persistUserProfile(profile);
  try {
    const remoteSelfProfile = await syncRemoteSelfProfile(userProfileToSelfArchive(memoryUserProfile));
    await syncUserProfileFromSelfArchive(remoteSelfProfile);
  } catch (error) {
    console.warn('Remote user profile sync unavailable, profile kept locally.', error);
  }
  return memoryUserProfile;
}

export async function setCurrentAccount(account: string) {
  try {
    await AsyncStorage.setItem(CURRENT_ACCOUNT_KEY, account);
  } catch (error) {
    console.warn('Current account storage unavailable.', error);
  }
}

export async function clearLocalUserProfile() {
  memoryUserProfile = { ...DEFAULT_USER_PROFILE };
  try {
    await AsyncStorage.multiRemove([USER_PROFILE_KEY, CURRENT_ACCOUNT_KEY]);
  } catch (error) {
    console.warn('User profile cleanup unavailable.', error);
  }
}
