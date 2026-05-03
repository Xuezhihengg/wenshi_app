import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineIcon, LineIconName } from '../components/LineIcon';
import { RootStackParamList } from '../navigation/types';
import { useAppLanguage } from '../i18n/AppLanguage';
import { useAppTheme } from '../theme/AppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

function MiniHexagram({ darkMode }: { darkMode: boolean }) {
  const lineColor = darkMode ? '#f4f4f5' : '#111';
  const mutedLine = darkMode ? '#6a6a72' : '#d8d8d8';
  const rows = [true, false, true, true, false, false];
  return (
    <View style={styles.hexagramWrap}>
      {rows.map((solid, index) => (
        <View key={index} style={styles.hexagramLineRow}>
          {solid ? (
            <View style={[styles.hexagramLine, { backgroundColor: index === 1 ? mutedLine : lineColor }]} />
          ) : (
            <View style={styles.brokenLine}>
              <View style={[styles.brokenSegment, { backgroundColor: index === 4 ? mutedLine : lineColor }]} />
              <View style={[styles.brokenSegment, { backgroundColor: index === 4 ? mutedLine : lineColor }]} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function KeyPointRow({ icon, title, body, index }: { icon: LineIconName; title: string; body: string; index: number }) {
  const { colors, darkMode } = useAppTheme();
  const accents = darkMode
    ? ['#172554', '#173225', '#3a301b']
    : ['#dbeafe', '#d1fae5', '#fff0cc'];
  return (
    <View style={styles.keyPointRow}>
      <View style={[styles.keyPointIcon, { backgroundColor: accents[index % accents.length] }]}>
        <LineIcon name={icon} size={17} color={colors.text} />
      </View>
      <View style={styles.keyPointTextWrap}>
        <Text style={[styles.keyPointTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.keyPointBody, { color: colors.mutedText }]}>{body}</Text>
      </View>
    </View>
  );
}

export function AboutScreen({ navigation }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const introProgress = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 520,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [introProgress]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: colors.controlText }]}>‹</Text>
        </Pressable>
        <Text pointerEvents="none" style={[styles.navTitle, { color: colors.text }]}>{t('about.title')}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.card,
              opacity: introProgress,
              transform: [{
                translateY: introProgress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              }],
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={darkMode ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] : ['rgba(0,0,0,0.055)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.kicker, { color: colors.faintText }]}>{t('about.heroKicker')}</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{t('about.heroTitle')}</Text>
            </View>
            <MiniHexagram darkMode={darkMode} />
          </View>
          <Text style={[styles.heroBody, { color: colors.mutedText }]}>{t('about.heroBody')}</Text>
          <View style={[styles.versionPill, { backgroundColor: colors.cardMuted }]}>
            <Text style={[styles.versionLabel, { color: colors.faintText }]}>{t('about.versionLabel')}</Text>
            <Text style={[styles.versionText, { color: colors.text }]}>{t('about.version')}</Text>
          </View>
        </Animated.View>

        <View style={[styles.keyPointCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.keyPointCardTitle, { color: colors.text }]}>{t('about.sectionsTitle')}</Text>
          <KeyPointRow icon="calendar" title={t('about.sectionCast')} body={t('about.sectionCastBody')} index={0} />
          <View style={[styles.keyPointDivider, { backgroundColor: colors.divider }]} />
          <KeyPointRow icon="settings" title={t('about.sectionAnalyze')} body={t('about.sectionAnalyzeBody')} index={1} />
          <View style={[styles.keyPointDivider, { backgroundColor: colors.divider }]} />
          <KeyPointRow icon="edit" title={t('about.sectionArchive')} body={t('about.sectionArchiveBody')} index={2} />
        </View>

        <View style={[styles.promiseCard, { backgroundColor: darkMode ? '#201d18' : '#fff8e1' }]}>
          <View style={styles.promiseHeader}>
            <LineIcon name="info" size={18} color={darkMode ? '#f4d58a' : '#8a5a00'} />
            <Text style={[styles.promiseTitle, { color: darkMode ? '#f4d58a' : '#6f4800' }]}>{t('about.promiseTitle')}</Text>
          </View>
          <Text style={[styles.promiseBody, { color: darkMode ? '#dcc89a' : '#765a20' }]}>{t('about.promiseBody')}</Text>
        </View>

        <Text style={[styles.footer, { color: colors.faintText }]}>{t('about.footer')}</Text>
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
  content: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 40, gap: 14 },
  heroCard: { ...CARD_SHADOW, borderRadius: 28, backgroundColor: '#fff', padding: 22, overflow: 'hidden', gap: 18 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroTopRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' },
  kicker: { color: '#777', fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 10 },
  heroTitle: { color: '#111', fontSize: 29, fontWeight: '900', lineHeight: 36, maxWidth: 230 },
  heroBody: { color: '#666', fontSize: 13, fontWeight: '800', lineHeight: 22 },
  versionPill: { alignSelf: 'flex-start', height: 32, borderRadius: 16, backgroundColor: '#f4f4f4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  versionLabel: { color: '#777', fontSize: 11, fontWeight: '900' },
  versionText: { color: '#111', fontSize: 12, fontWeight: '900' },
  hexagramWrap: { width: 72, gap: 6, paddingTop: 8 },
  hexagramLineRow: { height: 8, justifyContent: 'center' },
  hexagramLine: { height: 6, borderRadius: 3, backgroundColor: '#111' },
  brokenLine: { flexDirection: 'row', gap: 10 },
  brokenSegment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#111' },
  keyPointCard: { ...CARD_SHADOW, borderRadius: 24, backgroundColor: '#fff', paddingTop: 16, overflow: 'hidden' },
  keyPointCardTitle: { color: '#111', fontSize: 18, fontWeight: '900', paddingHorizontal: 16, marginBottom: 2 },
  keyPointRow: { minHeight: 76, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  keyPointIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f4f4f4', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  keyPointTextWrap: { flex: 1, gap: 4 },
  keyPointTitle: { color: '#111', fontSize: 15, fontWeight: '900' },
  keyPointBody: { color: '#666', fontSize: 12, fontWeight: '800', lineHeight: 18 },
  keyPointDivider: { height: 1, backgroundColor: '#ededed', marginLeft: 64 },
  promiseCard: { borderRadius: 20, backgroundColor: '#fff8e1', padding: 15, gap: 9 },
  promiseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promiseTitle: { color: '#6f4800', fontSize: 15, fontWeight: '900' },
  promiseBody: { color: '#765a20', fontSize: 12, fontWeight: '800', lineHeight: 20 },
  footer: { color: '#777', fontSize: 13, fontWeight: '900', textAlign: 'center', paddingVertical: 6 },
});
