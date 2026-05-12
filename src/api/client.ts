import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_STORAGE_KEY = 'wenshi.api.tokens';
const GUEST_MODE_KEY = 'wenshi.api.guestMode';
const DEV_PHONE = '13800000001';
const PROD_API_BASE_URL = 'https://wenshi.xin';
const LAN_API_BASE_URL = 'http://172.20.10.12:8000';
const LOCAL_API_BASE_URL = 'http://127.0.0.1:8000';
const ANDROID_EMULATOR_API_BASE_URL = 'http://10.0.2.2:8000';
const REQUEST_TIMEOUT_MS = 15000;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  || (__DEV__
    ? (Platform.OS === 'web'
      ? LOCAL_API_BASE_URL
      : Platform.OS === 'android'
        ? ANDROID_EMULATOR_API_BASE_URL
        : LAN_API_BASE_URL)
    : PROD_API_BASE_URL);

type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  is_new_user?: boolean;
  profile_completed?: boolean;
};

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResult = StoredTokens & { isNewUser: boolean; profileCompleted: boolean };

export type AuthChannel = 'phone' | 'email';

type AppleLoginPayload = {
  appleId?: string | null;
  identityToken: string;
  email?: string | null;
  displayName?: string | null;
};

export type CurrentUser = {
  id: string;
  phone?: string | null;
  email?: string | null;
  apple_id?: string | null;
  wechat_id?: string | null;
  display_name: string;
  avatar_url?: string | null;
  register_provider: 'phone' | 'email' | 'wechat' | 'apple';
  membership_plan: string;
  membership_status: string;
  profile_completed: boolean;
  created_at: string;
  last_login_at?: string | null;
  is_admin: boolean;
};

export type UploadableImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

type FeedbackPayload = {
  type: 'bug' | 'feature' | 'experience' | 'other';
  description: string;
  screenshotUrls: string[];
  appVersion?: string | null;
  platform?: string | null;
  deviceInfo?: Record<string, unknown> | null;
};

async function readTokens(): Promise<StoredTokens | undefined> {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredTokens : undefined;
  } catch {
    return undefined;
  }
}

export async function hasStoredLogin(): Promise<boolean> {
  const tokens = await readTokens();
  return Boolean(tokens?.accessToken && tokens.refreshToken);
}

export async function clearStoredLogin(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function isGuestMode(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(GUEST_MODE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function enableGuestMode(): Promise<void> {
  await AsyncStorage.setItem(GUEST_MODE_KEY, '1');
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function disableGuestMode(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
}

export class GuestModeError extends Error {
  constructor(message = 'Guest mode does not allow remote requests.') {
    super(message);
    this.name = 'GuestModeError';
  }
}

async function writeTokens(tokens: TokenPair) {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }));
}

export async function sendLoginCode(destination: string, channel: AuthChannel) {
  return request<{ message: string; mock_code?: string | null; expires_in_seconds: number }>('/api/v1/auth/code', {
    method: 'POST',
    body: JSON.stringify({ destination, channel, purpose: 'login' }),
  });
}

export async function loginWithCode(destination: string, channel: AuthChannel, code: string): Promise<LoginResult> {
  const tokens = await request<TokenPair>('/api/v1/auth/login/code', {
    method: 'POST',
    body: JSON.stringify({ destination, channel, code }),
  });
  await writeTokens(tokens);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    isNewUser: Boolean(tokens.is_new_user),
    profileCompleted: Boolean(tokens.profile_completed),
  };
}

export async function loginWithApple(payload: AppleLoginPayload): Promise<LoginResult> {
  const tokens = await request<TokenPair>('/api/v1/auth/login/apple', {
    method: 'POST',
    body: JSON.stringify({
      apple_id: payload.appleId || null,
      identity_token: payload.identityToken,
      email: payload.email || null,
      display_name: payload.displayName || null,
    }),
  });
  await writeTokens(tokens);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    isNewUser: Boolean(tokens.is_new_user),
    profileCompleted: Boolean(tokens.profile_completed),
  };
}

export async function sendBindCode(destination: string, channel: AuthChannel) {
  return authenticatedRequest<{ message: string; mock_code?: string | null; expires_in_seconds: number }>('/api/v1/auth/bind/code', {
    method: 'POST',
    body: JSON.stringify({ destination, channel }),
  });
}

export async function bindAccount(destination: string, channel: AuthChannel, code: string): Promise<CurrentUser> {
  return authenticatedRequest<CurrentUser>('/api/v1/auth/bind', {
    method: 'POST',
    body: JSON.stringify({ destination, channel, code }),
  });
}

export async function deactivateAccount(reason?: string): Promise<void> {
  await authenticatedRequest<{ message: string }>('/api/v1/auth/deactivate', {
    method: 'POST',
    body: JSON.stringify({ reason: reason?.trim() || null }),
  });
}

export async function uploadAvatar(image: UploadableImage): Promise<string> {
  const formData = new FormData();
  const mimeType = image.mimeType || 'image/jpeg';
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  formData.append('file', {
    uri: image.uri,
    name: image.fileName || `avatar.${extension}`,
    type: mimeType,
  } as unknown as Blob);
  const result = await authenticatedRequest<{ url: string }>('/api/v1/uploads/avatar', {
    method: 'POST',
    headers: {},
    body: formData,
  });
  return result.url;
}

export async function uploadFeedbackScreenshot(image: UploadableImage): Promise<string> {
  const formData = new FormData();
  const mimeType = image.mimeType || 'image/jpeg';
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  formData.append('file', {
    uri: image.uri,
    name: image.fileName || `feedback.${extension}`,
    type: mimeType,
  } as unknown as Blob);
  const result = await authenticatedRequest<{ url: string }>('/api/v1/uploads/feedback-image', {
    method: 'POST',
    headers: {},
    body: formData,
  });
  return result.url;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  await authenticatedRequest('/api/v1/feedback', {
    method: 'POST',
    body: JSON.stringify({
      type: payload.type,
      description: payload.description,
      screenshot_urls: payload.screenshotUrls,
      app_version: payload.appVersion || null,
      platform: payload.platform || null,
      device_info: payload.deviceInfo || null,
    }),
  });
}

async function request<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  const hasFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(hasFormDataBody ? {} : { 'content-type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed: ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s: ${API_BASE_URL}${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginForDevelopment(): Promise<StoredTokens> {
  const codeResponse = await request<{ mock_code?: string | null }>('/api/v1/auth/code', {
    method: 'POST',
    body: JSON.stringify({ destination: DEV_PHONE, channel: 'phone', purpose: 'login' }),
  });
  if (!codeResponse.mock_code) throw new Error('Development login requires mock verification provider.');
  const tokens = await request<TokenPair>('/api/v1/auth/login/code', {
    method: 'POST',
    body: JSON.stringify({ destination: DEV_PHONE, channel: 'phone', code: codeResponse.mock_code }),
  });
  await writeTokens(tokens);
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}

async function refreshTokens(refreshToken: string): Promise<StoredTokens> {
  const tokens = await request<TokenPair>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  await writeTokens(tokens);
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}

export async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (await isGuestMode()) {
    throw new GuestModeError();
  }
  let tokens = await readTokens();
  if (!tokens) tokens = await loginForDevelopment();
  try {
    return await request<T>(path, options, tokens.accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('401') && !message.includes('Invalid token') && !message.includes('Missing bearer')) {
      throw error;
    }
    tokens = tokens.refreshToken ? await refreshTokens(tokens.refreshToken).catch(loginForDevelopment) : await loginForDevelopment();
    return request<T>(path, options, tokens.accessToken);
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return authenticatedRequest<CurrentUser>('/api/v1/auth/me');
}

export function apiBaseUrl() {
  return API_BASE_URL;
}
