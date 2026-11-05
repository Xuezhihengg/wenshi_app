import { CurrentUser, getCurrentUser, isGuestMode } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MembershipPlan = 'trial' | 'monthly' | 'yearly';

export type PlanLimit = {
  profileLimit: number | undefined;
  aiDailyLimit: number | undefined;
};

export const PLAN_LIMITS: Record<MembershipPlan, PlanLimit> = {
  trial: { profileLimit: 5, aiDailyLimit: 2 },
  monthly: { profileLimit: 20, aiDailyLimit: 20 },
  yearly: { profileLimit: undefined, aiDailyLimit: undefined },
};

function effectivePlanFromUser(user?: CurrentUser): MembershipPlan {
  if (!user || user.membership_status !== 'active') return 'trial';
  if (user.membership_expires_at && new Date(user.membership_expires_at).getTime() <= Date.now()) return 'trial';
  if (user.membership_plan === 'monthly' || user.membership_plan === 'yearly') return user.membership_plan;
  return 'trial';
}

export async function getEffectiveMembershipPlan(): Promise<MembershipPlan> {
  try {
    if (await isGuestMode()) return 'trial';
    return effectivePlanFromUser(await getCurrentUser());
  } catch {
    return 'trial';
  }
}

export async function getEffectivePlanLimits(): Promise<{ plan: MembershipPlan; limits: PlanLimit }> {
  const plan = await getEffectiveMembershipPlan();
  return { plan, limits: PLAN_LIMITS[plan] };
}

export function shanghaiDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

const AI_USAGE_KEY_PREFIX = 'wenshi.aiUsage.';

export async function getLocalAIUsageCount(dateKey = shanghaiDateKey()): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(`${AI_USAGE_KEY_PREFIX}${dateKey}`);
    const count = raw ? Number(raw) : 0;
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

export async function incrementLocalAIUsage(dateKey = shanghaiDateKey()): Promise<number> {
  const nextCount = (await getLocalAIUsageCount(dateKey)) + 1;
  try {
    await AsyncStorage.setItem(`${AI_USAGE_KEY_PREFIX}${dateKey}`, String(nextCount));
  } catch {
    return nextCount;
  }
  return nextCount;
}
