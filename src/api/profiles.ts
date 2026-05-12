import { DivinationProfile } from '../domain/types';
import { authenticatedRequest } from './client';

type ApiProfile = {
  id: string;
  name: string;
  relation: string;
  gender: '男' | '女' | '未填写';
  birthday: string;
  avatar_url: string | null;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
};

function localIdFor(profile: ApiProfile) {
  return profile.relation === '本人' ? 'self' : profile.id;
}

function fromApiProfile(profile: ApiProfile): DivinationProfile {
  return {
    id: localIdFor(profile),
    remoteId: profile.id,
    name: profile.name,
    relation: profile.relation,
    gender: profile.gender,
    birthday: profile.birthday,
    avatarUri: profile.avatar_url ?? undefined,
  };
}

function toPayload(profile: DivinationProfile, selected = false) {
  return {
    name: profile.name,
    relation: profile.relation,
    gender: profile.gender,
    birthday: profile.birthday,
    avatar_url: profile.avatarUri ?? null,
    is_selected: selected,
  };
}

function remoteId(profile: DivinationProfile) {
  return profile.remoteId && profile.remoteId !== 'self' ? profile.remoteId : undefined;
}

export async function listRemoteProfiles(): Promise<DivinationProfile[]> {
  const profiles = await authenticatedRequest<ApiProfile[]>('/api/v1/profiles');
  return profiles.map(fromApiProfile);
}

export async function createRemoteProfile(profile: DivinationProfile, selected = false): Promise<DivinationProfile> {
  const created = await authenticatedRequest<ApiProfile>('/api/v1/profiles', {
    method: 'POST',
    body: JSON.stringify(toPayload(profile, selected)),
  });
  return fromApiProfile(created);
}

export async function updateRemoteProfile(profile: DivinationProfile, selected = false): Promise<DivinationProfile> {
  const id = remoteId(profile);
  if (!id) return createRemoteProfile(profile, selected);
  const updated = await authenticatedRequest<ApiProfile>(`/api/v1/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toPayload(profile, selected)),
  });
  return fromApiProfile(updated);
}

export async function deleteRemoteProfile(profile: DivinationProfile): Promise<void> {
  const id = remoteId(profile);
  if (!id || profile.id === 'self') return;
  await authenticatedRequest<void>(`/api/v1/profiles/${id}`, { method: 'DELETE' });
}

export async function selectRemoteProfile(profile: DivinationProfile): Promise<DivinationProfile> {
  const id = remoteId(profile);
  if (!id) return updateRemoteProfile(profile, true);
  const selected = await authenticatedRequest<ApiProfile>(`/api/v1/profiles/${id}/select`, { method: 'POST' });
  return fromApiProfile(selected);
}

export async function syncRemoteSelfProfile(profile: DivinationProfile): Promise<DivinationProfile> {
  const profiles = await authenticatedRequest<ApiProfile[]>('/api/v1/profiles');
  const selfProfile = profiles.find((item) => item.relation === '本人');
  if (selfProfile) {
    const updated = await authenticatedRequest<ApiProfile>(`/api/v1/profiles/${selfProfile.id}`, {
      method: 'PATCH',
      body: JSON.stringify(toPayload(profile, selfProfile.is_selected)),
    });
    return fromApiProfile(updated);
  }
  return createRemoteProfile(profile, true);
}
