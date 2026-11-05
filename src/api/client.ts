import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_STORAGE_KEY = 'wenshi.api.tokens';
const GUEST_MODE_KEY = 'wenshi.api.guestMode';
const DEV_PHONE = '13800000001';
const LOCAL_API_BASE_URL = 'http://127.0.0.1:8000';
const ANDROID_EMULATOR_API_BASE_URL = 'http://10.0.2.2:8000';
const REQUEST_TIMEOUT_MS = 15000;

const CONFIGURED_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
const DEV_API_BASE_URL = Platform.OS === 'android' ? ANDROID_EMULATOR_API_BASE_URL : LOCAL_API_BASE_URL;
const API_BASE_URL = CONFIGURED_API_BASE_URL || (__DEV__ ? DEV_API_BASE_URL : '');
const ENABLE_DEV_LOGIN = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN !== '0';

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is required for production builds.');
}

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

type GoogleLoginPayload = {
  identityToken: string;
};

export type CurrentUser = {
  id: string;
  phone?: string | null;
  email?: string | null;
  apple_id?: string | null;
  wechat_id?: string | null;
  google_id?: string | null;
  display_name: string;
  avatar_url?: string | null;
  register_provider: 'phone' | 'email' | 'wechat' | 'apple' | 'google';
  membership_plan: string;
  membership_status: string;
  membership_expires_at?: string | null;
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

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication is required.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class ApiRequestError extends Error {
  status: number;
  detail?: Record<string, unknown>;

  constructor(message: string, status: number, detail?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.detail = detail;
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

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<LoginResult> {
  const tokens = await request<TokenPair>('/api/v1/auth/login/google', {
    method: 'POST',
    body: JSON.stringify({
      identity_token: payload.identityToken,
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
      const text = await response.text();
      let message = text;
      let detail: Record<string, unknown> | undefined;
      try {
        const parsed = JSON.parse(text) as { detail?: unknown };
        if (typeof parsed.detail === 'string') {
          message = parsed.detail;
        } else if (parsed.detail && typeof parsed.detail === 'object' && !Array.isArray(parsed.detail)) {
          detail = parsed.detail as Record<string, unknown>;
          if (typeof detail.message === 'string') message = detail.message;
        }
      } catch {
        // Non-JSON error body: keep the raw text.
      }
      throw new ApiRequestError(message || `Request failed: ${response.status}`, response.status, detail);
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
  if (!ENABLE_DEV_LOGIN) throw new AuthRequiredError('Development login is disabled.');
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
  if (!tokens) {
    if (!ENABLE_DEV_LOGIN) throw new AuthRequiredError();
    tokens = await loginForDevelopment();
  }
  try {
    return await request<T>(path, options, tokens.accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const unauthorized = error instanceof ApiRequestError && error.status === 401;
    if (!unauthorized && !message.includes('401') && !message.includes('Invalid token') && !message.includes('Missing bearer')) {
      throw error;
    }
    if (tokens.refreshToken) {
      try {
        tokens = await refreshTokens(tokens.refreshToken);
      } catch (refreshError) {
        if (!ENABLE_DEV_LOGIN) throw refreshError;
        tokens = await loginForDevelopment();
      }
    } else if (ENABLE_DEV_LOGIN) {
      tokens = await loginForDevelopment();
    } else {
      throw new AuthRequiredError();
    }
    return request<T>(path, options, tokens.accessToken);
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return authenticatedRequest<CurrentUser>('/api/v1/auth/me');
}

export function apiBaseUrl() {
  return API_BASE_URL;
}
