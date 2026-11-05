import AsyncStorage from '@react-native-async-storage/async-storage';
import { DivinationProfile } from '../domain/types';
import { createRemoteProfile, deleteRemoteProfile, listRemoteProfiles, selectRemoteProfile, updateRemoteProfile } from '../api/profiles';
import { getUserProfile, syncUserProfileFromSelfArchive, userProfileToSelfArchive } from './userProfileStore';
import { getEffectivePlanLimits } from '../services/membershipLimits';

const PROFILES_KEY = 'wenshi.profiles';
const SELECTED_PROFILE_KEY = 'wenshi.selectedProfileId';

export const PROFILE_RELATION_TAGS = ['本人', '父母', '子女', '伴侣', '亲属', '朋友', '同事', '合作方', '客户', '其他'] as const;

export const DEFAULT_PROFILES: DivinationProfile[] = [
  { id: 'self', name: '本人', relation: '本人', gender: '未填写', birthday: '未填写' },
  { id: 'mother', name: '母亲', relation: '父母', gender: '女', birthday: '未填写' },
  { id: 'friend', name: '朋友', relation: '朋友', gender: '未填写', birthday: '未填写' },
];

let memoryProfiles = [...DEFAULT_PROFILES];
let memorySelectedProfileId = DEFAULT_PROFILES[0].id;

export function profileInitial(name?: string) {
  return (name?.trim().slice(0, 1) || '问').toUpperCase();
}

function normalizeProfile(profile: DivinationProfile): DivinationProfile {
  return profile.id === 'self' ? { ...profile, relation: '本人' } : profile;
}

async function persistLocalProfiles(profiles: DivinationProfile[]) {
  memoryProfiles = profiles.map(normalizeProfile);
  try {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(memoryProfiles));
  } catch (error) {
    console.warn('Profile storage unavailable, profiles kept in memory only.', error);
  }
}

async function listLocalProfiles(): Promise<DivinationProfile[]> {
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

async function withSyncedSelfProfile(profiles: DivinationProfile[]) {
  const selfArchive = userProfileToSelfArchive(await getUserProfile());
  const currentSelf = profiles.find((profile) => profile.id === 'self');
  const syncedSelf = { ...selfArchive, remoteId: currentSelf?.remoteId };
  const hasSelf = profiles.some((profile) => profile.id === 'self');
  return hasSelf
    ? profiles.map((profile) => (profile.id === 'self' ? syncedSelf : profile))
    : [syncedSelf, ...profiles];
}

export async function listProfiles(): Promise<DivinationProfile[]> {
  try {
    const remoteProfiles = await listRemoteProfiles();
    const profiles = remoteProfiles.length ? remoteProfiles : await listLocalProfiles();
    const selfProfile = profiles.find((profile) => profile.id === 'self' || profile.relation === '本人');
    if (selfProfile) await syncUserProfileFromSelfArchive(selfProfile);
    await persistLocalProfiles(profiles);
    return profiles;
  } catch (error) {
    console.warn('Remote profiles unavailable, using local profiles.', error);
    return listLocalProfiles();
  }
}

export async function saveProfiles(profiles: DivinationProfile[]) {
  const normalizedProfiles = profiles.map(normalizeProfile);
  await persistLocalProfiles(normalizedProfiles);
  try {
    const selectedId = await getSelectedProfileId();
    const syncedProfiles = await Promise.all(normalizedProfiles.map((profile) => (
      profile.remoteId ? updateRemoteProfile(profile, profile.id === selectedId) : createRemoteProfile(profile, profile.id === selectedId)
    )));
    await persistLocalProfiles(syncedProfiles);
  } catch (error) {
    console.warn('Remote profiles sync unavailable, profiles kept locally.', error);
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
  try {
    const profiles = await listProfiles();
    const profile = profiles.find((item) => item.id === profileId);
    if (profile) {
      const selected = await selectRemoteProfile(profile);
      await persistLocalProfiles(profiles.map((item) => (item.id === profileId ? selected : item)));
    }
  } catch (error) {
    console.warn('Remote profile selection unavailable, selection kept locally.', error);
  }
}

export async function getSelectedProfile() {
  const [profiles, selectedId] = await Promise.all([listProfiles(), getSelectedProfileId()]);
  const selectedProfile = profiles.find((profile) => profile.id === selectedId);
  if (selectedProfile) return selectedProfile;
  const selfProfile = profiles.find((profile) => profile.id === 'self');
  return selfProfile ?? profiles[0] ?? DEFAULT_PROFILES[0];
}

export async function addProfile() {
  const profiles = await listProfiles();
  const nextIndex = profiles.length + 1;
  return createProfile({
    id: `profile-${Date.now()}`,
    name: `档案${nextIndex}`,
    relation: '其他',
    gender: '未填写',
    birthday: '未填写',
  });
}

export async function createProfile(profile: DivinationProfile) {
  const profiles = await listProfiles();
  const { limits, plan } = await getEffectivePlanLimits();
  if (limits.profileLimit !== undefined && profiles.length >= limits.profileLimit) {
    throw new Error(JSON.stringify({
      detail: {
        code: 'profile_limit_exceeded',
        limit: limits.profileLimit,
        used: profiles.length,
        plan,
      },
    }));
  }
  const normalizedProfile = normalizeProfile(profile);
  try {
    const created = await createRemoteProfile(normalizedProfile);
    const nextProfiles = [...profiles, created];
    await persistLocalProfiles(nextProfiles);
    return created;
  } catch (error) {
    console.warn('Remote profile create unavailable, profile kept locally.', error);
    const nextProfiles = [...profiles, normalizedProfile];
    await persistLocalProfiles(nextProfiles);
    return normalizedProfile;
  }
}

export async function updateProfile(profile: DivinationProfile) {
  const profiles = await listProfiles();
  const selectedId = await getSelectedProfileId();
  const normalizedProfile = normalizeProfile(profile);
  try {
    const updated = await updateRemoteProfile(normalizedProfile, normalizedProfile.id === selectedId);
    const nextProfiles = profiles.map((item) => (item.id === normalizedProfile.id ? updated : item));
    if (updated.id === 'self' || updated.relation === '本人') await syncUserProfileFromSelfArchive(updated);
    await persistLocalProfiles(nextProfiles);
    return updated;
  } catch (error) {
    console.warn('Remote profile update unavailable, profile kept locally.', error);
    const nextProfiles = profiles.map((item) => (item.id === normalizedProfile.id ? normalizedProfile : item));
    if (normalizedProfile.id === 'self' || normalizedProfile.relation === '本人') await syncUserProfileFromSelfArchive(normalizedProfile);
    await persistLocalProfiles(nextProfiles);
    return normalizedProfile;
  }
}

export async function deleteProfile(profileId: string) {
  if (profileId === DEFAULT_PROFILES[0].id) return;
  const profiles = await listProfiles();
  const targetProfile = profiles.find((profile) => profile.id === profileId);
  const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
  if (targetProfile) {
    try {
      await deleteRemoteProfile(targetProfile);
    } catch (error) {
      console.warn('Remote profile delete unavailable, profile removed locally only.', error);
    }
  }
  await persistLocalProfiles(nextProfiles.length ? nextProfiles : DEFAULT_PROFILES);
  const selectedId = await getSelectedProfileId();
  if (selectedId === profileId) {
    await setSelectedProfileId(nextProfiles[0]?.id ?? DEFAULT_PROFILES[0].id);
  }
}
