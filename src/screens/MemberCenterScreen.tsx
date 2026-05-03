import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Animated, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineIcon, LineIconName } from '../components/LineIcon';
import { useAppLanguage } from '../i18n/AppLanguage';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/AppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'MemberCenter'>;

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

const PLAN_CARD_WIDTH = 300;
const PLAN_CARD_HEIGHT = 455;
const PLAN_SIDE_CARD_HEIGHT = 420;
const PLAN_CARD_GAP = 24;
const PLAN_SNAP_INTERVAL = PLAN_CARD_WIDTH + PLAN_CARD_GAP;

type Plan = {
  key: 'free' | 'monthly' | 'yearly';
  icon: LineIconName;
  titleKey: 'member.planFree' | 'member.planMonthly' | 'member.planYearly';
  priceKey: 'member.priceFree' | 'member.priceMonthly' | 'member.priceYearly';
  perks: Array<'member.freeOne' | 'member.freeTwo' | 'member.freeThree' | 'member.monthlyOne' | 'member.monthlyTwo' | 'member.monthlyThree' | 'member.yearlyOne' | 'member.yearlyTwo' | 'member.yearlyThree'>;
};

const PLANS: Plan[] = [
  { key: 'free', icon: 'check', titleKey: 'member.planFree', priceKey: 'member.priceFree', perks: ['member.freeOne', 'member.freeTwo', 'member.freeThree'] },
  { key: 'monthly', icon: 'star', titleKey: 'member.planMonthly', priceKey: 'member.priceMonthly', perks: ['member.monthlyOne', 'member.monthlyTwo', 'member.monthlyThree'] },
  { key: 'yearly', icon: 'crown', titleKey: 'member.planYearly', priceKey: 'member.priceYearly', perks: ['member.yearlyOne', 'member.yearlyTwo', 'member.yearlyThree'] },
];

const MANAGE_ITEMS: Array<{ icon: LineIconName; titleKey: 'member.agreement' | 'member.billing' | 'member.support' }> = [
  { icon: 'shield', titleKey: 'member.agreement' },
  { icon: 'history', titleKey: 'member.billing' },
  { icon: 'mail', titleKey: 'member.support' },
];

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const current = plan.key === 'free';
  const recommended = plan.key === 'monthly';
  const iconTint = ['#2563eb', '#0f9f6e', '#d97706'][index];
  const accent = darkMode
    ? ['#172554', '#063f2d', '#4a2b05'][index]
    : ['#dbeafe', '#d1fae5', '#ffedd5'][index];

  return (
    <View style={[styles.planCard, { height: recommended ? PLAN_CARD_HEIGHT : PLAN_SIDE_CARD_HEIGHT, backgroundColor: accent }]}>
      {current || recommended ? (
        <View style={[styles.planBadge, { backgroundColor: current ? colors.inverse : '#d59a16' }]}>
          <Text style={[styles.planBadgeText, { color: current ? colors.inverseText : '#111' }]}>{t(current ? 'member.badgeCurrent' : 'member.badgeValue')}</Text>
        </View>
      ) : null}
      <View style={styles.planIntroArea}>
        <View style={styles.planIconBubble}>
          <LineIcon name={plan.icon} size={42} color={darkMode ? colors.text : iconTint} />
        </View>
        <View style={styles.planNameBlock}>
          <Text style={[styles.planTitle, { color: darkMode ? colors.text : '#111' }]}>{t(plan.titleKey)}</Text>
          <Text style={[styles.planPrice, { color: darkMode ? colors.text : '#111' }]}>{t(plan.priceKey)}</Text>
        </View>
      </View>
      <View style={styles.perkList}>
        {plan.perks.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <View style={[styles.perkDot, { backgroundColor: recommended ? '#d59a16' : colors.text }]} />
            <Text style={[styles.perkText, { color: darkMode ? colors.mutedText : '#555' }]}>{t(perk)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ManagementRow({ icon, title }: { icon: LineIconName; title: string }) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  return (
    <Pressable style={styles.manageRow}>
      <View style={[styles.manageIcon, { backgroundColor: colors.cardMuted }]}>
        <LineIcon name={icon} size={18} color={colors.text} />
      </View>
      <Text style={[styles.manageText, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.manageStatus, { color: colors.faintText }]}>{t('member.comingSoon')}</Text>
      <Text style={[styles.manageArrow, { color: colors.faintText }]}>›</Text>
    </Pressable>
  );
}

export function MemberCenterScreen({ navigation }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const { width } = useWindowDimensions();
  const planSidePadding = Math.max(18, (width - PLAN_CARD_WIDTH) / 2);
  const edgeSwipeActive = useRef(false);
  const edgeBackPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        edgeSwipeActive.current = event.nativeEvent.pageX <= 24;
        return false;
      },
      onMoveShouldSetPanResponder: (event, gesture) => {
        const startsAtEdge = edgeSwipeActive.current || event.nativeEvent.pageX <= 24;
        return startsAtEdge && gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 64 || gesture.vx > 0.45) navigation.goBack();
        edgeSwipeActive.current = false;
      },
      onPanResponderTerminate: () => {
        edgeSwipeActive.current = false;
      },
    })
  ).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: colors.controlText }]}>‹</Text>
        </Pressable>
        <Text pointerEvents="none" style={[styles.navTitle, { color: colors.text }]}>{t('member.title')}</Text>
      </View>

      <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.identityCard, { backgroundColor: colors.card }]}>
          <LinearGradient
            pointerEvents="none"
            colors={darkMode ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] : ['rgba(0,0,0,0.055)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          <View style={styles.identityTop}>
            <View style={[styles.identityIcon, { backgroundColor: colors.inverse }]}>
              <LineIcon name="check" size={22} color={colors.inverseText} />
            </View>
            <View style={styles.identityTextWrap}>
              <Text style={[styles.identityTitle, { color: colors.text }]}>{t('member.identityCurrent')}</Text>
              <Text style={[styles.identityBody, { color: colors.mutedText }]}>{t('member.identityBrief')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('member.planTitle')}</Text>
          <View style={[styles.sectionLine, { backgroundColor: colors.divider }]} />
        </View>
        <ScrollView
          horizontal
          style={[styles.planScroller, { backgroundColor: colors.background }]}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={PLAN_SNAP_INTERVAL}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={[styles.planScroll, { paddingHorizontal: planSidePadding }]}
        >
          {PLANS.map((plan, index) => <PlanCard key={plan.key} plan={plan} index={index} />)}
        </ScrollView>

        <View style={[styles.manageCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('member.manageTitle')}</Text>
          {MANAGE_ITEMS.map((item, index) => (
            <View key={item.titleKey}>
              <ManagementRow icon={item.icon} title={t(item.titleKey)} />
              {index < MANAGE_ITEMS.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.divider, marginLeft: 68 }]} /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f3f3' },
  topLayer: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 40 },
  edgeBackGestureArea: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, zIndex: 45, elevation: 45 },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 42,
    elevation: 42,
  },
  backButtonText: { color: '#111', fontSize: 34, fontWeight: '500', lineHeight: 38, marginTop: -2 },
  navTitle: { position: 'absolute', top: 69, left: 88, right: 88, color: '#111', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  scroll: { position: 'absolute', left: 0, right: 0, top: 104, bottom: 0 },
  content: { paddingTop: 8, paddingBottom: 40, gap: 8, backgroundColor: 'transparent' },
  identityCard: { ...CARD_SHADOW, marginHorizontal: 18, borderRadius: 26, backgroundColor: '#fff', padding: 20, gap: 14, overflow: 'hidden' },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  identityIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  identityTextWrap: { flex: 1, gap: 3 },
  identityLabel: { color: '#777', fontSize: 11, fontWeight: '900' },
  identityTitle: { color: '#111', fontSize: 22, fontWeight: '900' },
  identityBody: { color: '#666', fontSize: 13, fontWeight: '800', lineHeight: 21 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22 },
  sectionTitle: { color: '#111', fontSize: 22, fontWeight: '900' },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#ededed' },
  planScroller: { marginBottom: 0, overflow: 'visible' },
  planScroll: { gap: PLAN_CARD_GAP, minHeight: PLAN_CARD_HEIGHT + 34, paddingBottom: 20, alignItems: 'center', backgroundColor: 'transparent' },
  planCard: {
    ...CARD_SHADOW,
    width: PLAN_CARD_WIDTH,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 70,
  },
  planIntroArea: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 36 },
  planIconBubble: { height: 52, alignItems: 'center', justifyContent: 'center' },
  planNameBlock: { alignItems: 'center', gap: 10 },
  planTitle: { color: '#111', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  planPrice: { color: '#111', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  planBadge: { position: 'absolute', right: 16, top: 16, height: 25, borderRadius: 13, backgroundColor: '#111', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  planBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  perkList: { width: '60%', marginLeft: 30, gap: 14, alignItems: 'stretch', alignSelf: 'center'}, 
  perkRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 },
  perkDot: { width: 6, height: 7, borderRadius: 3, backgroundColor: '#111' },
  perkText: { flex: 1, color: '#555', fontSize: 13, fontWeight: '800', lineHeight: 20, textAlign: 'left' },
  manageCard: { ...CARD_SHADOW, marginHorizontal: 18, borderRadius: 22, backgroundColor: '#fff', paddingTop: 15, overflow: 'hidden' },
  cardTitle: { color: '#111', fontSize: 15, fontWeight: '900', paddingHorizontal: 16, marginBottom: 2 },
  divider: { height: 1, backgroundColor: '#ededed', marginLeft: 16 },
  manageRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16 },
  manageIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f4f4f4', alignItems: 'center', justifyContent: 'center' },
  manageText: { flex: 1, color: '#111', fontSize: 13, fontWeight: '900' },
  manageStatus: { color: '#777', fontSize: 10, fontWeight: '800' },
  manageArrow: { color: '#777', fontSize: 21, fontWeight: '500' },
});
