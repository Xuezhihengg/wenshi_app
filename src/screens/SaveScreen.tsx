import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCallback } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppMoreMenu } from '../components/AppMoreMenu';
import { LineIcon, LineIconName } from '../components/LineIcon';
import { FortuneRecord } from '../domain/types';
import { RootStackParamList } from '../navigation/types';
import { isPersistentStorageAvailable, listRecords, saveRecord, toggleRecordFavorite as toggleStoredRecordFavorite } from '../storage/recordStore';
import { profileInitial } from '../storage/profileStore';
import { useAppTheme } from '../theme/AppTheme';
import { TranslationKey, useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'Save'>;

type HistoryStatus = 'fulfilled' | 'unfulfilled' | 'unnoted';
type HistoryFilter = 'all' | 'today' | 'week' | 'month' | 'favorite' | 'fulfilled' | 'unfulfilled';

const FILTER_TABS: Array<{ key: HistoryFilter; labelKey: TranslationKey }> = [
  { key: 'all', labelKey: 'history.all' },
  { key: 'today', labelKey: 'history.today' },
  { key: 'week', labelKey: 'history.week' },
  { key: 'month', labelKey: 'history.month' },
  { key: 'favorite', labelKey: 'history.favorite' },
  { key: 'fulfilled', labelKey: 'history.fulfilled' },
  { key: 'unfulfilled', labelKey: 'history.unfulfilled' },
];

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

function isSameDay(date: Date, target: Date) {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
}

function isSameMonth(date: Date, target: Date) {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function isSameWeek(date: Date, target: Date) {
  const startOfWeek = new Date(target);
  const day = startOfWeek.getDay() || 7;
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - day + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function searchableDateText(record: FortuneRecord) {
  const date = new Date(record.createdAt);
  const parts: string[] = [];
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const paddedMonth = month.toString().padStart(2, '0');
    const paddedDay = day.toString().padStart(2, '0');
    parts.push(
      `${year}年${month}月${day}日`,
      `${year}-${paddedMonth}-${paddedDay}`,
      `${year}/${month}/${day}`,
      `${month}月${day}日`,
      formatHistoryTime(record.createdAt)
    );
  }
  parts.push(
    record.lunarInfo.datetimeText,
    record.lunarInfo.yearStemBranch,
    record.lunarInfo.monthStemBranch,
    record.lunarInfo.dayStemBranch,
    record.lunarInfo.timeStemBranch,
    `${record.lunarInfo.yearStemBranch}年${record.lunarInfo.monthStemBranch}月${record.lunarInfo.dayStemBranch}日`
  );
  return parts.filter(Boolean).join(' ');
}

function statusForRecord(record: FortuneRecord): HistoryStatus {
  const latestNote = [...(record.verificationNotes ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (!latestNote) return 'unnoted';
  return latestNote.fulfilled ? 'fulfilled' : 'unfulfilled';
}

function isFavoriteRecord(record: FortuneRecord) {
  return Boolean(record.favorite);
}

function hexagramTitle(record: FortuneRecord) {
  const baseName = record.hexagram.name;
  const changedName = record.hexagram.changedName;
  return changedName && changedName !== baseName ? `${baseName} → ${changedName}` : baseName;
}

function StatItem({ icon, title, count, color, onPress }: { icon: keyof typeof FontAwesome.glyphMap; title: string; count: number; color: string; onPress: () => void }) {
  const { darkMode } = useAppTheme();
  return (
    <Pressable style={[styles.statItem, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.statIcon}>
        <FontAwesome name={icon} size={16} color={darkMode ? '#f4f4f5' : '#111'} />
      </View>
      <View style={styles.statTextWrap}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.statTitle, { color: darkMode ? '#b9b9c0' : '#666' }]}>{title}</Text>
        <Text style={[styles.statCount, { color: darkMode ? '#ffffff' : '#000' }]}>{count}</Text>
      </View>
    </Pressable>
  );
}

function HistoryCard({ record, onPress, onToggleFavorite }: { record: FortuneRecord; onPress: () => void; onToggleFavorite: (record: FortuneRecord) => void }) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const status = statusForRecord(record);
  const fulfilled = status === 'fulfilled';
  const unnoted = status === 'unnoted';
  const favorite = isFavoriteRecord(record);
  const favoriteProgress = useRef(new Animated.Value(favorite ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(favoriteProgress, {
      toValue: favorite ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [favorite, favoriteProgress]);

  const defaultBackground = fulfilled ? colors.greenSoft : unnoted ? colors.card : colors.redSoft;
  const backgroundColor = favoriteProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [defaultBackground, darkMode ? '#2b2416' : '#fff7e4'],
  });
  const statusBadgeStyle = fulfilled
    ? [styles.statusBadge, { backgroundColor: darkMode ? '#1c4b30' : '#dceee1' }]
    : unnoted
      ? [styles.statusBadge, { backgroundColor: darkMode ? '#303035' : '#eeeeee' }]
      : [styles.statusBadge, { backgroundColor: darkMode ? '#562321' : '#f8e2df' }];
  const statusTextStyle = fulfilled
    ? [styles.statusBadgeText, { color: darkMode ? '#9ce2b0' : '#1f7a3f' }]
    : unnoted
      ? [styles.statusBadgeText, { color: darkMode ? '#c7c7ce' : '#666' }]
      : [styles.statusBadgeText, { color: darkMode ? '#ffaaa0' : '#c23a2b' }];

  return (
    <Animated.View style={[styles.recordCard, { backgroundColor }]}>
      <Pressable style={styles.recordCardHitArea} onPress={onPress}>
      <View style={styles.recordHeader}>
        <Text numberOfLines={1} style={[styles.recordQuestion, { color: colors.text }]}>{record.question || t('history.untitledQuestion')}</Text>
        <View style={styles.recordActions}>
          <View style={statusBadgeStyle}>
            <Text style={statusTextStyle}>
              {fulfilled ? t('history.fulfilled') : unnoted ? t('history.unnoted') : t('history.unfulfilled')}
            </Text>
          </View>
          <View style={[styles.recordProfileAvatar, { backgroundColor: darkMode ? '#2f2f36' : '#111' }]}>
            {record.profile?.avatarUri ? (
              <Image source={{ uri: record.profile.avatarUri }} style={styles.recordProfileAvatarImage} />
            ) : (
              <Text style={styles.recordProfileAvatarText}>{profileInitial(record.profile?.name)}</Text>
            )}
          </View>
          <Pressable
            style={styles.favoriteButton}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite(record);
            }}
          >
            {favorite ? <FontAwesome name="star" size={18} color="#d59a16" /> : <LineIcon name="star" size={18} color={colors.faintText} />}
          </Pressable>
        </View>
      </View>
      <Text style={[styles.recordTime, { color: colors.faintText }]}>{formatHistoryTime(record.createdAt)}</Text>
      <Text numberOfLines={1} style={[styles.recordHexagram, { color: colors.text }]}>{hexagramTitle(record)}</Text>
      </Pressable>
    </Animated.View>
  );
}

function FilterTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.card, colors.inverse],
  });
  const textColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.faintText, colors.inverseText],
  });

  return (
    <Animated.View style={[styles.filterTab, { backgroundColor }]}>
      <Pressable style={styles.filterTabHitArea} onPress={onPress}>
        <Animated.Text style={[styles.filterTabText, { color: textColor }]}>{label}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

export function SaveScreen({ route, navigation }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const edgeSwipeActive = useRef(false);
  const [records, setRecords] = useState<FortuneRecord[]>([]);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [displayKeyword, setDisplayKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>(route.params?.initialFilter ?? 'all');
  const listOpacity = useRef(new Animated.Value(1)).current;
  const keywordAnimationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const incoming = route.params?.record;
  const incomingFilter = route.params?.initialFilter;
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
        if (gesture.dx > 64 || gesture.vx > 0.45) {
          navigation.goBack();
        }
        edgeSwipeActive.current = false;
      },
      onPanResponderTerminate: () => {
        edgeSwipeActive.current = false;
      },
    })
  ).current;

  const refresh = async () => {
    const loaded = await listRecords();
    setRecords(loaded);
    setStorageAvailable(isPersistentStorageAvailable());
  };

  useEffect(() => {
    if (incoming) {
      saveRecord(incoming).then(refresh);
      navigation.setParams({ record: undefined, initialFilter: incomingFilter });
    } else {
      refresh();
    }
  }, [incoming, incomingFilter]);

  useEffect(() => {
    if (incomingFilter && incomingFilter !== activeFilter) {
      setActiveFilter(incomingFilter);
      navigation.setParams({ initialFilter: undefined });
    }
  }, [activeFilter, incomingFilter, navigation]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  useEffect(() => () => {
    if (keywordAnimationTimer.current) clearTimeout(keywordAnimationTimer.current);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      today: records.filter((record) => isSameDay(new Date(record.createdAt), now)).length,
      favorite: records.filter(isFavoriteRecord).length,
      fulfilled: records.filter((record) => statusForRecord(record) === 'fulfilled').length,
      unfulfilled: records.filter((record) => statusForRecord(record) === 'unfulfilled').length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = displayKeyword.trim().toLowerCase();
    const now = new Date();
    return records.filter((record) => {
      const createdAt = new Date(record.createdAt);
      const status = statusForRecord(record);
      const matchesFilter =
        activeFilter === 'all'
          || (activeFilter === 'today' && isSameDay(createdAt, now))
          || (activeFilter === 'week' && isSameWeek(createdAt, now))
          || (activeFilter === 'month' && isSameMonth(createdAt, now))
          || (activeFilter === 'favorite' && isFavoriteRecord(record))
          || (activeFilter === 'fulfilled' && status === 'fulfilled')
          || (activeFilter === 'unfulfilled' && status === 'unfulfilled');
      if (!matchesFilter) return false;
      if (!query) return true;
      const text = `${record.question} ${record.profile?.name ?? ''} ${record.profile?.relation ?? ''} ${record.hexagram.name} ${record.hexagram.changedName ?? ''} ${searchableDateText(record)}`.toLowerCase();
      return text.includes(query);
    });
  }, [activeFilter, displayKeyword, records]);

  const animateListUpdate = (update: () => void) => {
    listOpacity.stopAnimation();
    if (keywordAnimationTimer.current) clearTimeout(keywordAnimationTimer.current);
    Animated.sequence([
      Animated.timing(listOpacity, {
        toValue: 0,
        duration: 170,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start();
    keywordAnimationTimer.current = setTimeout(update, 150);
  };

  const selectFilter = (filter: HistoryFilter) => {
    if (filter === activeFilter) return;
    animateListUpdate(() => setActiveFilter(filter));
  };

  const changeKeyword = (value: string) => {
    setKeyword(value);
    animateListUpdate(() => setDisplayKeyword(value));
  };

  const toggleRecordFavorite = async (record: FortuneRecord) => {
    const updatedRecord = await toggleStoredRecordFavorite(record);
    setRecords((current) => current.map((item) => (item.id === record.id ? updatedRecord : item)));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>‹</Text>
        </Pressable>
        <Text pointerEvents="none" style={[styles.navTitle, { color: colors.text }]}>{t('history.title')}</Text>
        <AppMoreMenu navigation={navigation} currentScreen="Save" />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!storageAvailable ? <Text style={[styles.warning, { color: darkMode ? '#f2c46d' : '#8a5a00', backgroundColor: darkMode ? '#332813' : '#fff6dc' }]}>{t('history.storageWarning')}</Text> : null}

        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <StatItem icon="calendar" title={t('history.today')} count={stats.today} color={darkMode ? '#162333' : '#e8f1fb'} onPress={() => selectFilter('today')} />
          <StatItem icon="star" title={t('history.favorite')} count={stats.favorite} color={darkMode ? '#2b2416' : '#fff1d8'} onPress={() => selectFilter('favorite')} />
          <StatItem icon="check-circle" title={t('history.fulfilled')} count={stats.fulfilled} color={darkMode ? '#173323' : '#dceee1'} onPress={() => selectFilter('fulfilled')} />
          <StatItem icon="times-circle" title={t('history.unfulfilled')} count={stats.unfulfilled} color={darkMode ? '#351c1d' : '#f8e2df'} onPress={() => selectFilter('unfulfilled')} />
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <LineIcon name="search" size={18} color={colors.faintText} />
          <TextInput
            value={keyword}
            onChangeText={changeKeyword}
            placeholder={t('history.search')}
            placeholderTextColor={colors.faintText}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <View style={styles.filterTabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
            {FILTER_TABS.map((tab) => (
              <FilterTabButton key={tab.key} label={t(tab.labelKey)} active={activeFilter === tab.key} onPress={() => selectFilter(tab.key)} />
            ))}
          </ScrollView>
        </View>

        <Animated.View style={[styles.recordList, { opacity: listOpacity }]}>
          {filteredRecords.map((record) => (
            <HistoryCard
              key={record.id}
              record={record}
              onPress={() => navigation.navigate('Analysis', { record, fromHistory: true })}
              onToggleFavorite={toggleRecordFavorite}
            />
          ))}
          {!filteredRecords.length ? <Text style={[styles.empty, { color: colors.faintText }]}>{records.length ? t('history.noMatch') : t('history.empty')}</Text> : null}
        </Animated.View>
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
  content: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 34, gap: 14 },
  warning: { color: '#8a5a00', backgroundColor: '#fff6dc', borderRadius: 14, padding: 12, fontSize: 12, fontWeight: '800', lineHeight: 18 },
  statsCard: {
    ...CARD_SHADOW,
    minHeight: 76,
    borderRadius: 24,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statItem: { flex: 1, minWidth: 0, minHeight: 54, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 },
  statIcon: { width: 17, alignItems: 'center', justifyContent: 'center', opacity: 0.58 },
  statTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  statTitle: { color: '#777', fontSize: 10, fontWeight: '900' },
  statCount: { color: '#000', fontSize: 17, fontWeight: '900', lineHeight: 19 },
  searchBar: {
    ...CARD_SHADOW,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: '#111', fontSize: 14, fontWeight: '800', height: 48 },
  filterTabsWrap: { marginHorizontal: -18 },
  filterTabs: { gap: 8, paddingHorizontal: 18, alignItems: 'center' },
  filterTab: { height: 32, borderRadius: 16, overflow: 'hidden' },
  filterTabHitArea: { height: 32, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterTabText: { fontSize: 13, fontWeight: '900' },
  recordList: { gap: 12 },
  recordCard: {
    ...CARD_SHADOW,
    borderRadius: 20,
    overflow: 'hidden',
  },
  recordCardHitArea: { padding: 16, gap: 8 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordQuestion: { flex: 1, color: '#111', fontSize: 15, fontWeight: '900' },
  recordActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordProfileAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  recordProfileAvatarImage: { width: 24, height: 24, borderRadius: 12 },
  recordProfileAvatarText: { color: '#fff', fontSize: 10, fontWeight: '900', lineHeight: 12 },
  statusBadge: { height: 24, paddingHorizontal: 9, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusBadgeFulfilled: { backgroundColor: '#dceee1' },
  statusBadgeUnfulfilled: { backgroundColor: '#f8e2df' },
  statusBadgeUnnoted: { backgroundColor: '#eeeeee' },
  statusBadgeText: { fontSize: 11, fontWeight: '900' },
  statusTextFulfilled: { color: '#1f7a3f' },
  statusTextUnfulfilled: { color: '#c23a2b' },
  statusTextUnnoted: { color: '#666' },
  favoriteButton: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  recordTime: { color: '#888', fontSize: 11, fontWeight: '800' },
  recordHexagram: { color: '#000', fontSize: 21, fontWeight: '900', marginTop: 2 },
  empty: { color: '#777', fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 28 },
});
