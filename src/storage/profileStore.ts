import AsyncStorage from '@react-native-async-storage/async-storage';
import { DivinationProfile } from '../domain/types';
import { getUserProfile, userProfileToSelfArchive } from './userProfileStore';

const PROFILES_KEY = 'wenshi.profiles';
const SELECTED_PROFILE_KEY = 'wenshi.selectedProfileId';

export const PROFILE_RELATION_TAGS = ['本人', '父母', '子女', '伴侣', '亲属', '朋友', '同事', '合作方', '客户', '其他'] as const;

export const DEFAULT_PROFILES: DivinationProfile[] = [
  { id: 'self', name: '本人', relation: '本人', gender: '其他', birthday: '未填写' },
  { id: 'mother', name: '母亲', relation: '父母', gender: '女', birthday: '未填写' },
  { id: 'friend', name: '朋友', relation: '朋友', gender: '其他', birthday: '未填写' },
];

let memoryProfiles = [...DEFAULT_PROFILES];
let memorySelectedProfileId = DEFAULT_PROFILES[0].id;

export function profileInitial(name?: string) {
  return (name?.trim().slice(0, 1) || '问').toUpperCase();
}

async function withSyncedSelfProfile(profiles: DivinationProfile[]) {
  const selfArchive = userProfileToSelfArchive(await getUserProfile());
  const hasSelf = profiles.some((profile) => profile.id === 'self');
  return hasSelf
    ? profiles.map((profile) => (profile.id === 'self' ? selfArchive : profile))
    : [selfArchive, ...profiles];
}

export async function listProfiles(): Promise<DivinationProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    if (!raw) return withSyncedSelfProfile(DEFAULT_PROFILES);
    const parsed = JSON.parse(raw) as DivinationProfile[];
    return withSyncedSelfProfile(parsed.length ? parsed : DEFAULT_PROFILES);
  } catch (error) {
    console.warn('Profile storage unavailable, using memory profiles.', error);
    return withSyncedSelfProfile(memoryProfiles);
  }
}

export async function saveProfiles(profiles: DivinationProfile[]) {
  memoryProfiles = profiles.map((profile) => (profile.id === 'self' ? DEFAULT_PROFILES[0] : profile));
  try {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(memoryProfiles));
  } catch (error) {
    console.warn('Profile storage unavailable, profiles kept in memory only.', error);
  }
}

export async function getSelectedProfileId() {
  try {
    return (await AsyncStorage.getItem(SELECTED_PROFILE_KEY)) || memorySelectedProfileId;
  } catch (error) {
    console.warn('Profile selection storage unavailable, using memory selection.', error);
    return memorySelectedProfileId;
  }
}

export async function setSelectedProfileId(profileId: string) {
  memorySelectedProfileId = profileId;
  try {
    await AsyncStorage.setItem(SELECTED_PROFILE_KEY, profileId);
  } catch (error) {
    console.warn('Profile selection storage unavailable, selection kept in memory only.', error);
  }
}

export async function getSelectedProfile() {
  const [profiles, selectedId] = await Promise.all([listProfiles(), getSelectedProfileId()]);
  return profiles.find((profile) => profile.id === selectedId) ?? profiles[0] ?? DEFAULT_PROFILES[0];
}

export async function addProfile() {
  const profiles = await listProfiles();
  const nextIndex = profiles.length + 1;
  const profile: DivinationProfile = {
    id: `profile-${Date.now()}`,
    name: `档案${nextIndex}`,
    relation: '其他',
    gender: '其他',
    birthday: '未填写',
  };
  const nextProfiles = [...profiles, profile];
  await saveProfiles(nextProfiles);
  return profile;
}

export async function updateProfile(profile: DivinationProfile) {
  const profiles = await listProfiles();
  const nextProfiles = profiles.map((item) => (item.id === profile.id ? profile : item));
  await saveProfiles(nextProfiles);
  return profile;
}

export async function deleteProfile(profileId: string) {
  if (profileId === DEFAULT_PROFILES[0].id) return;
  const profiles = await listProfiles();
  const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
  await saveProfiles(nextProfiles.length ? nextProfiles : DEFAULT_PROFILES);
  const selectedId = await getSelectedProfileId();
  if (selectedId === profileId) {
    await setSelectedProfileId(nextProfiles[0]?.id ?? DEFAULT_PROFILES[0].id);
  }
}
