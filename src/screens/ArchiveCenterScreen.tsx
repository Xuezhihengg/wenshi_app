import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Keyboard, Modal, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppMoreMenu } from '../components/AppMoreMenu';
import { LineIcon } from '../components/LineIcon';
import { DivinationProfile } from '../domain/types';
import { RootStackParamList } from '../navigation/types';
import { deleteProfile, listProfiles, profileInitial, PROFILE_RELATION_TAGS, saveProfiles, setSelectedProfileId, updateProfile } from '../storage/profileStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../theme/AppTheme';
import { TranslationKey, useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'ArchiveCenter'>;
type CalendarMode = 'solar' | 'lunar';
type EditingMode = 'create' | 'edit';

const YEARS = Array.from({ length: 81 }, (_, index) => 1960 + index);
const SOLAR_MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
const SOLAR_DAYS = Array.from({ length: 31 }, (_, index) => `${index + 1}日`);
const SOLAR_HOURS = Array.from({ length: 24 }, (_, index) => `${index}时`);
const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
const LUNAR_HOURS = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
const PICKER_ITEM_HEIGHT = 34;
const PICKER_VISIBLE_ROWS = 5;
const PICKER_VERTICAL_PADDING = PICKER_ITEM_HEIGHT * 2;
const PROFILE_GROUP_GAP = 10;
const PROFILE_GROUP_SPACING = 12;
const LUNAR_MONTH_EN: Record<string, string> = {
  正月: '1st lunar month',
  二月: '2nd lunar month',
  三月: '3rd lunar month',
  四月: '4th lunar month',
  五月: '5th lunar month',
  六月: '6th lunar month',
  七月: '7th lunar month',
  八月: '8th lunar month',
  九月: '9th lunar month',
  十月: '10th lunar month',
  冬月: '11th lunar month',
  腊月: '12th lunar month',
};
const LUNAR_DAY_EN: Record<string, string> = {
  初一: 'day 1',
  初二: 'day 2',
  初三: 'day 3',
  初四: 'day 4',
  初五: 'day 5',
  初六: 'day 6',
  初七: 'day 7',
  初八: 'day 8',
  初九: 'day 9',
  初十: 'day 10',
  十一: 'day 11',
  十二: 'day 12',
  十三: 'day 13',
  十四: 'day 14',
  十五: 'day 15',
  十六: 'day 16',
  十七: 'day 17',
  十八: 'day 18',
  十九: 'day 19',
  二十: 'day 20',
  廿一: 'day 21',
  廿二: 'day 22',
  廿三: 'day 23',
  廿四: 'day 24',
  廿五: 'day 25',
  廿六: 'day 26',
  廿七: 'day 27',
  廿八: 'day 28',
  廿九: 'day 29',
  三十: 'day 30',
};
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function profileRelationGroup(profile: DivinationProfile) {
  return PROFILE_RELATION_TAGS.includes(profile.relation as typeof PROFILE_RELATION_TAGS[number]) ? profile.relation : '其他';
}

function relationLabelKey(relation: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    本人: 'relation.self',
    父母: 'relation.parents',
    子女: 'relation.children',
    伴侣: 'relation.partner',
    亲属: 'relation.relatives',
    朋友: 'relation.friends',
    同事: 'relation.colleagues',
    合作方: 'relation.partnerBusiness',
    客户: 'relation.client',
    其他: 'relation.other',
  };
  return map[relation] ?? 'relation.other';
}

function genderLabelKey(gender: string): TranslationKey {
  if (gender === '男') return 'profileEdit.genderMale';
  if (gender === '女') return 'profileEdit.genderFemale';
  return 'profileEdit.genderOther';
}

function numberFromChineseUnit(value: string, unit: '年' | '月' | '日' | '时') {
  const parsed = Number.parseInt(value.replace(unit, ''), 10);
  return Number.isNaN(parsed) ? value : parsed;
}

function formatBirthdayForDisplay(value: string, language: 'zh' | 'en', t: (key: TranslationKey) => string) {
  if (!value || value === '未填写' || value === 'Unfilled') return language === 'en' ? t('archive.unfilled') : '未填写';
  if (language !== 'en') return value;
  const parts = value.trim().split(/\s+/);
  if (parts.length < 5) return value;
  const [mode, yearValue, monthValue, dayValue, hourValue] = parts;
  if (mode === '公历') {
    return `${t('profileEdit.solar')} ${numberFromChineseUnit(yearValue, '年')}, ${numberFromChineseUnit(monthValue, '月')}/${numberFromChineseUnit(dayValue, '日')} ${numberFromChineseUnit(hourValue, '时')}:00`;
  }
  if (mode === '农历') {
    return `${t('profileEdit.lunar')} ${numberFromChineseUnit(yearValue, '年')}, ${LUNAR_MONTH_EN[monthValue] ?? monthValue} ${LUNAR_DAY_EN[dayValue] ?? dayValue} ${hourValue}`;
  }
  return value;
}

function calendarPickerDisplayValue(value: string, language: 'zh' | 'en') {
  if (language !== 'en') return value;
  if (LUNAR_HOURS.includes(value)) return value;
  if (value.endsWith('年')) return `${numberFromChineseUnit(value, '年')}`;
  if (value.endsWith('月')) return `${numberFromChineseUnit(value, '月')}`;
  if (value.endsWith('日')) return `${numberFromChineseUnit(value, '日')}`;
  if (value.endsWith('时')) return `${numberFromChineseUnit(value, '时')}:00`;
  return LUNAR_MONTH_EN[value] ?? LUNAR_DAY_EN[value] ?? value;
}

function PickerColumn({
  values,
  selected,
  onSelect,
  displayValue,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  displayValue?: (value: string) => string;
}) {
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const valuesKey = values.join('|');

  useEffect(() => {
    const selectedIndex = Math.max(0, values.indexOf(selected));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * PICKER_ITEM_HEIGHT, animated: false });
    });
  }, [selected, valuesKey]);

  const selectByOffset = (offsetY: number) => {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / PICKER_ITEM_HEIGHT)));
    onSelect(values[index]);
  };

  const selectByTap = (value: string) => {
    const index = Math.max(0, values.indexOf(value));
    onSelect(value);
    scrollRef.current?.scrollTo({ y: index * PICKER_ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.pickerColumnWrap}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.pickerColumn}
        contentContainerStyle={styles.pickerColumnContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={PICKER_ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onScrollEndDrag={(event) => selectByOffset(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(event) => selectByOffset(event.nativeEvent.contentOffset.y)}
      >
        {values.map((value, index) => {
          const inputRange = [
            (index - 1) * PICKER_ITEM_HEIGHT,
            index * PICKER_ITEM_HEIGHT,
            (index + 1) * PICKER_ITEM_HEIGHT,
          ];
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.96, 1.08, 0.96],
            extrapolate: 'clamp',
          });
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.45, 1, 0.45],
            extrapolate: 'clamp',
          });
          return (
            <Pressable key={value} style={styles.pickerOption} onPress={() => selectByTap(value)}>
              <Animated.Text style={[styles.pickerOptionText, { color: colors.text, opacity, transform: [{ scale }] }]}>{displayValue ? displayValue(value) : value}</Animated.Text>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

function ProfileAvatar({ profile, size = 52 }: { profile: DivinationProfile; size?: number }) {
  const { darkMode } = useAppTheme();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: darkMode ? '#2a2a2f' : '#f5f5f5' }]}>
      {profile.avatarUri ? (
        <Image source={{ uri: profile.avatarUri }} style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <Text style={[styles.avatarText, { color: darkMode ? '#fff' : '#111', fontSize: Math.round(size * 0.36) }]}>{profileInitial(profile.name)}</Text>
      )}
    </View>
  );
}

function AnimatedChoiceTag({
  label,
  active,
  onPress,
  style,
  textStyle,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: object;
  textStyle?: object;
}) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.cardMuted, colors.inverse],
  });
  const color = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.mutedText, colors.inverseText],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  return (
    <AnimatedPressable style={[style, { backgroundColor, transform: [{ scale }] }]} onPress={onPress}>
      <Animated.Text pointerEvents="none" style={[textStyle, { color }]}>{label}</Animated.Text>
    </AnimatedPressable>
  );
}

function ArchiveCard({
  profile,
  expanded,
  deleting,
  trailingSpace,
  onPress,
  onEdit,
  onDelete,
  onDeleteAnimationEnd,
}: {
  profile: DivinationProfile;
  expanded: boolean;
  deleting: boolean;
  trailingSpace: number;
  onPress: () => void;
  onEdit: (profile: DivinationProfile) => void;
  onDelete: (profile: DivinationProfile) => void;
  onDeleteAnimationEnd: (profile: DivinationProfile) => void;
}) {
  const { colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const isSelf = profile.id === 'self';
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const deleteProgress = useRef(new Animated.Value(1)).current;
  const cardHeightRef = useRef(0);
  const [detailContentHeight, setDetailContentHeight] = useState(0);
  const [cardContentHeight, setCardContentHeight] = useState(expanded ? (isSelf ? 178 : 232) : 78);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: expanded ? 300 : 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [expanded, progress]);

  useEffect(() => {
    if (!deleting) {
      deleteProgress.setValue(1);
      return;
    }
    Animated.timing(deleteProgress, {
      toValue: 0,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onDeleteAnimationEnd(profile);
    });
  }, [deleteProgress, deleting, onDeleteAnimationEnd, profile]);

  const detailHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, detailContentHeight],
  });
  const deletingHeight = deleteProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cardContentHeight],
  });
  const marginBottom = deleteProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trailingSpace],
  });
  const opacity = deleteProgress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.08, 1],
  });
  const translateX = deleteProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const detailOpacity = progress.interpolate({
    inputRange: [0, 0.28, 1],
    outputRange: [0, 0.45, 1],
  });
  const detailTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });
  const dividerOpacity = progress.interpolate({
    inputRange: [0, 0.36, 1],
    outputRange: [0, 0.25, 1],
  });
  const dividerScaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  const deleteStyle = deleting ? {
    height: deletingHeight,
    marginBottom,
    opacity,
    transform: [{ translateX }],
  } : { marginBottom: trailingSpace };

  return (
    <Animated.View style={[styles.archiveCardShell, deleteStyle]}>
    <Animated.View
      style={[styles.archiveCard, { backgroundColor: colors.card }]}
      onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;
        if (!deleting && Math.abs(nextHeight - cardHeightRef.current) > 0.5) {
          cardHeightRef.current = nextHeight;
          setCardContentHeight(nextHeight);
        }
      }}
    >
      <Pressable style={styles.archiveHeader} onPress={onPress} disabled={deleting}>
        <ProfileAvatar profile={profile} />
        <View style={styles.archiveTitleWrap}>
          <Text style={[styles.archiveName, { color: colors.text }]}>{profile.name}</Text>
          <Text style={[styles.archiveSubtitle, { color: colors.faintText }]}>{profile.relation ? t(relationLabelKey(profile.relation)) : t('archive.noRelation')}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
          <Text style={[styles.archiveArrow, { color: colors.mutedText }]}>›</Text>
        </Animated.View>
      </Pressable>
      <Animated.View style={[styles.archiveDetailWrap, { height: detailHeight }]}>
        <View
          style={styles.archiveDetailMeasure}
          onLayout={(event) => setDetailContentHeight(event.nativeEvent.layout.height)}
        >
        <Animated.View style={[styles.detailInner, { opacity: detailOpacity, transform: [{ translateY: detailTranslateY }] }]}>
        <Animated.View style={[styles.detailDivider, { backgroundColor: colors.divider, opacity: dividerOpacity, transform: [{ scaleX: dividerScaleX }] }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.faintText }]}>{t('archive.name')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{profile.name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.faintText }]}>{t('archive.relation')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{t(relationLabelKey(profile.relation))}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.faintText }]}>{t('profileEdit.gender')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{t(genderLabelKey(profile.gender))}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.faintText }]}>{t('profileEdit.birthday')}</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{formatBirthdayForDisplay(profile.birthday, language, t)}</Text>
        </View>
        {!isSelf ? (
          <View style={styles.profileActionRow}>
            <Pressable style={[styles.editProfileButton, { backgroundColor: colors.control }]} onPress={() => onEdit(profile)} disabled={deleting}>
              <LineIcon name="edit" size={14} />
              <Text style={[styles.editProfileText, { color: colors.text }]}>{t('common.edit')}</Text>
            </Pressable>
            <Pressable style={styles.deleteProfileButton} onPress={() => onDelete(profile)} disabled={deleting}>
              <LineIcon name="trash" size={14} color="#d23b32" />
              <Text style={styles.deleteProfileText}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        ) : null}
        </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
    </Animated.View>
  );
}

function ArchiveGroup({
  relation,
  profiles,
  expandedId,
  deletingProfileIds,
  onSelect,
  onEdit,
  onDelete,
  onDeleteAnimationEnd,
}: {
  relation: string;
  profiles: DivinationProfile[];
  expandedId?: string;
  deletingProfileIds: string[];
  onSelect: (profile: DivinationProfile) => void;
  onEdit: (profile: DivinationProfile) => void;
  onDelete: (profile: DivinationProfile) => void;
  onDeleteAnimationEnd: (profile: DivinationProfile) => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  const allDeleting = profiles.length > 0 && profiles.every((profile) => deletingProfileIds.includes(profile.id));
  const progress = useRef(new Animated.Value(allDeleting ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: allDeleting ? 0 : 1,
      duration: allDeleting ? 300 : 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [allDeleting, progress]);

  const headerHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 26],
  });
  const headerOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.15, 1],
  });
  const dividerScaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });
  const groupMarginBottom = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROFILE_GROUP_SPACING],
  });

  return (
    <Animated.View style={[styles.profileGroup, { marginBottom: groupMarginBottom }]}>
      <Animated.View style={[styles.groupHeader, { height: headerHeight, opacity: headerOpacity }]}>
        <Text style={[styles.groupTitle, { color: colors.mutedText }]}>{t(relationLabelKey(relation))}</Text>
        <Animated.View style={[styles.groupDivider, { backgroundColor: colors.divider, transform: [{ scaleX: dividerScaleX }] }]} />
      </Animated.View>
      {profiles.map((profile, index) => {
        const deleting = deletingProfileIds.includes(profile.id);
        const isLastProfile = index === profiles.length - 1;
        return (
          <ArchiveCard
            key={profile.id}
            profile={profile}
            expanded={expandedId === profile.id}
            deleting={deleting}
            trailingSpace={isLastProfile ? 0 : PROFILE_GROUP_GAP}
            onPress={() => onSelect(profile)}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeleteAnimationEnd={onDeleteAnimationEnd}
          />
        );
      })}
    </Animated.View>
  );
}

export function ArchiveCenterScreen({ route, navigation }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const [profiles, setProfiles] = useState<DivinationProfile[]>([]);
  const [expandedId, setExpandedId] = useState(route.params?.profileId);
  const [editingProfile, setEditingProfile] = useState<DivinationProfile | undefined>();
  const [editingMode, setEditingMode] = useState<EditingMode>('edit');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deletingProfileIds, setDeletingProfileIds] = useState<string[]>([]);
  const [birthdayPickerExpanded, setBirthdayPickerExpanded] = useState(false);
  const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('solar');
  const [calendarSwitchWidth, setCalendarSwitchWidth] = useState(0);
  const [year, setYear] = useState('2026年');
  const [solarMonth, setSolarMonth] = useState('3月');
  const [solarDay, setSolarDay] = useState('5日');
  const [solarHour, setSolarHour] = useState('12时');
  const [lunarMonth, setLunarMonth] = useState('二月');
  const [lunarDay, setLunarDay] = useState('十五');
  const [lunarHour, setLunarHour] = useState('子时');
  const calendarSwitchProgress = useRef(new Animated.Value(0)).current;
  const birthdayPickerFade = useRef(new Animated.Value(0)).current;
  const editModalProgress = useRef(new Animated.Value(0)).current;
  const editScrollRef = useRef<ScrollView | null>(null);
  const editModalClosingRef = useRef(false);
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

  const refresh = async () => {
    const loaded = await listProfiles();
    setProfiles(loaded);
    setExpandedId((current) => current ?? route.params?.profileId ?? loaded[0]?.id);
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const selectProfile = async (profile: DivinationProfile) => {
    setExpandedId((current) => (current === profile.id ? undefined : profile.id));
    await setSelectedProfileId(profile.id);
  };

  const resetBirthdayPicker = () => {
    setBirthdayPickerExpanded(false);
    setBirthdayPickerVisible(false);
    birthdayPickerFade.stopAnimation();
    birthdayPickerFade.setValue(0);
  };

  const showEditModal = (profile: DivinationProfile, mode: EditingMode) => {
    setEditingMode(mode);
    setEditingProfile(profile);
    resetBirthdayPicker();
    editModalProgress.stopAnimation();
    editModalProgress.setValue(0);
    editModalClosingRef.current = false;
    setEditModalVisible(true);
    requestAnimationFrame(() => {
      editScrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(editModalProgress, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const openCreateProfile = () => {
    const nextIndex = profiles.length + 1;
    showEditModal({
      id: `profile-${Date.now()}`,
      name: `${t('archive.defaultName')}${nextIndex}`,
      relation: '其他',
      gender: '其他',
      birthday: '未填写',
    }, 'create');
  };

  const selectedMonth = calendarMode === 'solar' ? solarMonth : lunarMonth;
  const selectedDay = calendarMode === 'solar' ? solarDay : lunarDay;
  const selectedHour = calendarMode === 'solar' ? solarHour : lunarHour;
  const solarBirthdayRaw = `公历 ${year} ${solarMonth} ${solarDay} ${solarHour}`;
  const lunarBirthdayRaw = `农历 ${year} ${lunarMonth} ${lunarDay} ${lunarHour}`;
  const solarBirthday = formatBirthdayForDisplay(solarBirthdayRaw, language, t);
  const lunarBirthday = formatBirthdayForDisplay(lunarBirthdayRaw, language, t);
  const selectedBirthday = `${calendarMode === 'solar' ? '公历' : '农历'} ${year} ${selectedMonth} ${selectedDay} ${selectedHour}`;
  const displayCalendarValue = useCallback((value: string) => calendarPickerDisplayValue(value, language), [language]);

  useEffect(() => {
    Animated.timing(calendarSwitchProgress, {
      toValue: calendarMode === 'solar' ? 0 : 1,
      duration: 420,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [calendarMode, calendarSwitchProgress]);

  const switchCalendarMode = (mode: CalendarMode) => {
    if (mode === calendarMode) return;
    setCalendarMode(mode);
  };

  const openEditProfile = (profile: DivinationProfile) => {
    showEditModal(profile, 'edit');
  };

  const closeEditProfile = () => {
    if (editModalClosingRef.current) return;
    editModalClosingRef.current = true;
    Keyboard.dismiss();
    editModalProgress.stopAnimation();
    Animated.timing(editModalProgress, {
      toValue: 0,
      duration: 170,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setEditModalVisible(false);
      setEditingProfile(undefined);
      setEditingMode('edit');
      resetBirthdayPicker();
      editModalClosingRef.current = false;
    });
  };

  const updateEditingBirthday = (birthday: string) => {
    setEditingProfile((current) => current ? { ...current, birthday } : current);
  };

  useEffect(() => {
    if (birthdayPickerExpanded) updateEditingBirthday(selectedBirthday);
  }, [birthdayPickerExpanded, selectedBirthday]);

  const toggleBirthdayPicker = () => {
    Keyboard.dismiss();
    if (!birthdayPickerExpanded) {
      updateEditingBirthday(selectedBirthday);
      setBirthdayPickerVisible(true);
      setBirthdayPickerExpanded(true);
      birthdayPickerFade.stopAnimation();
      birthdayPickerFade.setValue(0);
      setTimeout(() => editScrollRef.current?.scrollToEnd({ animated: true }), 10);
      Animated.timing(birthdayPickerFade, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    setBirthdayPickerExpanded(false);
    birthdayPickerFade.stopAnimation();
    Animated.timing(birthdayPickerFade, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      requestAnimationFrame(() => editScrollRef.current?.scrollTo({ y: 0, animated: true }));
      setTimeout(() => setBirthdayPickerVisible(false), 320);
    });
  };

  const saveEditingProfile = async () => {
    if (!editingProfile) return;
    const normalizedProfile = {
      ...editingProfile,
      name: editingProfile.name.trim() || t('archive.unnamed'),
      relation: profileRelationGroup(editingProfile),
      birthday: editingProfile.birthday.trim() || '未填写',
    };
    if (editingMode === 'create') {
      const nextProfiles = [...profiles, normalizedProfile];
      await saveProfiles(nextProfiles);
      setProfiles(nextProfiles);
      await setSelectedProfileId(normalizedProfile.id);
    } else {
      await updateProfile(normalizedProfile);
      setProfiles((current) => current.map((profile) => (profile.id === normalizedProfile.id ? normalizedProfile : profile)));
    }
    setExpandedId(normalizedProfile.id);
    closeEditProfile();
  };

  const deleteArchive = (profile: DivinationProfile) => {
    if (profile.id === 'self') return;
    Alert.alert(t('archive.deleteTitle'), `${t('archive.deleteBodyPrefix')}${profile.name}${t('archive.deleteBodySuffix')}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setDeletingProfileIds((current) => (current.includes(profile.id) ? current : [...current, profile.id]));
        },
      },
    ]);
  };

  const finishDeleteArchive = useCallback(async (profile: DivinationProfile) => {
    await deleteProfile(profile.id);
    setDeletingProfileIds((current) => current.filter((id) => id !== profile.id));
    setProfiles((current) => current.filter((item) => item.id !== profile.id));
  }, []);

  const pickAvatarFromLibrary = async () => {
    if (!editingProfile) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profileEdit.albumDeniedTitle'), t('archive.albumDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.86,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setEditingProfile((current) => current ? { ...current, avatarUri: result.assets[0].uri } : current);
    }
  };

  const groupedProfiles = PROFILE_RELATION_TAGS
    .map((relation) => ({
      relation,
      profiles: profiles.filter((profile) => profileRelationGroup(profile) === relation),
    }))
    .filter((group) => group.profiles.length);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>‹</Text>
        </Pressable>
        <Text pointerEvents="none" style={[styles.navTitle, { color: colors.text }]}>{t('archive.title')}</Text>
        <AppMoreMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {groupedProfiles.map((group) => (
          <ArchiveGroup
            key={group.relation}
            relation={group.relation}
            profiles={group.profiles}
            expandedId={expandedId}
            deletingProfileIds={deletingProfileIds}
            onSelect={selectProfile}
            onEdit={openEditProfile}
            onDelete={deleteArchive}
            onDeleteAnimationEnd={finishDeleteArchive}
          />
        ))}
      </ScrollView>
      <View style={styles.fixedAddWrap} pointerEvents="box-none">
        <Pressable style={[styles.addCard, { backgroundColor: colors.inverse }]} onPress={openCreateProfile}>
          <Text style={[styles.addTitle, { color: colors.inverseText }]}>{t('archive.addTitle')}</Text>
          <Text style={[styles.addSubtitle, { color: colors.inverseText, opacity: 0.66 }]}>{t('archive.addSubtitle')}</Text>
        </Pressable>
      </View>
      <Modal visible={editModalVisible} transparent animationType="none" onRequestClose={closeEditProfile}>
        <Animated.View style={[styles.modalBackdrop, { backgroundColor: colors.overlay, opacity: editModalProgress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditProfile} />
          <Animated.View
            style={[
              styles.editModalCard,
              {
                backgroundColor: colors.card,
                transform: [{
                  scale: editModalProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: colors.text }]}>{editingMode === 'create' ? t('archive.addTitle') : t('archive.editTitle')}</Text>
              <Pressable style={[styles.closeButton, { backgroundColor: colors.control }]} onPress={closeEditProfile}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
              </Pressable>
            </View>
            <ScrollView ref={editScrollRef} style={styles.editModalScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalContent}>
            {editingProfile && editingProfile.id !== 'self' ? (
              <Pressable style={styles.avatarEditCenter} onPress={pickAvatarFromLibrary}>
                <ProfileAvatar profile={editingProfile} size={84} />
                <View style={[styles.avatarCameraBadge, { backgroundColor: darkMode ? '#050505' : colors.inverse, borderColor: colors.card }]}>
                  <LineIcon name="camera" size={13} color="#fff" />
                </View>
              </Pressable>
            ) : null}
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedText }]}>{t('archive.name')}</Text>
              <TextInput
                value={editingProfile?.name ?? ''}
                onChangeText={(name) => setEditingProfile((current) => current ? { ...current, name } : current)}
                placeholder={t('archive.namePlaceholder')}
                placeholderTextColor={colors.faintText}
                style={[styles.editInput, { backgroundColor: colors.cardMuted, color: colors.text }]}
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedText }]}>{t('archive.relation')}</Text>
              <View style={styles.relationTagWrap}>
                {PROFILE_RELATION_TAGS.map((relation) => {
                  const active = profileRelationGroup(editingProfile ?? { relation: '其他' } as DivinationProfile) === relation;
                  return (
                    <AnimatedChoiceTag
                      key={relation}
                      label={t(relationLabelKey(relation))}
                      active={active}
                      style={styles.relationTag}
                      textStyle={styles.relationTagText}
                      onPress={() => setEditingProfile((current) => current ? { ...current, relation } : current)}
                    />
                  );
                })}
              </View>
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedText }]}>{t('profileEdit.gender')}</Text>
              <View style={styles.genderRow}>
                {(['男', '女', '其他'] as const).map((gender) => (
                  <AnimatedChoiceTag
                    key={gender}
                    label={t(genderLabelKey(gender))}
                    active={editingProfile?.gender === gender}
                    style={styles.genderOption}
                    textStyle={styles.genderOptionText}
                    onPress={() => setEditingProfile((current) => current ? { ...current, gender } : current)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, { color: colors.mutedText }]}>{t('profileEdit.birthday')}</Text>
              <Pressable
                style={[styles.dateValueButton, { backgroundColor: colors.cardMuted }]}
                onPress={toggleBirthdayPicker}
              >
                {birthdayPickerExpanded ? (
                  <View style={styles.dateValueTextWrap}>
                    <Animated.Text
                      numberOfLines={1}
                      style={[
                        styles.dateValueText,
                        {
                          color: colors.text,
                          opacity: calendarSwitchProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          }),
                        },
                      ]}
                    >
                      {solarBirthday}
                    </Animated.Text>
                    <Animated.Text
                      numberOfLines={1}
                      style={[
                        styles.dateValueText,
                        styles.dateValueTextLayer,
                        {
                          opacity: calendarSwitchProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          }),
                        },
                      ]}
                    >
                      {lunarBirthday}
                    </Animated.Text>
                  </View>
                ) : (
                  <Text numberOfLines={1} style={[styles.dateValueText, { color: colors.text }]}>{formatBirthdayForDisplay(editingProfile?.birthday || selectedBirthday, language, t)}</Text>
                )}
                <Animated.View
                  style={[
                    styles.dateToggleMark,
                    { transform: [{ rotate: birthdayPickerExpanded ? '180deg' : '0deg' }] },
                  ]}
                >
                  <LineIcon name="chevronDown" size={15} color={colors.mutedText} />
                </Animated.View>
              </Pressable>
            </View>
            {birthdayPickerVisible ? (
              <Animated.View
                style={[
                  styles.inlineCalendar,
                  {
                    opacity: birthdayPickerFade,
                  },
                ]}
              >
                  <View style={[styles.calendarSwitch, { backgroundColor: colors.control }]} onLayout={(event) => setCalendarSwitchWidth(event.nativeEvent.layout.width)}>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.calendarSlider,
                        {
                          transform: [{
                            translateX: calendarSwitchProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, Math.max(0, (calendarSwitchWidth - 12) / 2)],
                            }),
                          }],
                        },
                      ]}
                    />
                    {(['solar', 'lunar'] as CalendarMode[]).map((mode) => (
                      <Pressable key={mode} style={styles.calendarOption} onPress={() => switchCalendarMode(mode)}>
                        <Text style={[styles.calendarText, { color: calendarMode === mode ? '#0f5f2d' : colors.mutedText }, calendarMode === mode ? styles.calendarTextActive : null]}>{mode === 'solar' ? t('profileEdit.solar') : t('profileEdit.lunar')}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.pickerRow}>
                    <View style={styles.pickerBackgroundRow}>
                      <View style={[styles.pickerColumnBackground, { backgroundColor: colors.cardMuted }]} />
                      <View style={[styles.pickerColumnBackground, { backgroundColor: colors.cardMuted }]} />
                      <View style={[styles.pickerColumnBackground, { backgroundColor: colors.cardMuted }]} />
                      <View style={[styles.pickerColumnBackground, { backgroundColor: colors.cardMuted }]} />
                    </View>
                    <LinearGradient
                      pointerEvents="none"
                      colors={darkMode ? ['rgba(13,13,15,0)', '#4b3f18', '#6c5517', '#4b3f18', 'rgba(13,13,15,0)'] : ['rgba(255,255,255,0)', '#fff8d6', '#fff0a8', '#fff8d6', 'rgba(255,255,255,0)']}
                      locations={[0, 0.03, 0.5, 0.97, 1]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.pickerCenterBand}
                    />
                    <Animated.View
                      pointerEvents={calendarMode === 'solar' ? 'auto' : 'none'}
                      style={[
                        styles.pickerColumnsLayer,
                        {
                          opacity: calendarSwitchProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          }),
                        },
                      ]}
                    >
                      <PickerColumn values={YEARS.map((item) => `${item}年`)} selected={year} onSelect={setYear} displayValue={displayCalendarValue} />
                      <PickerColumn values={SOLAR_MONTHS} selected={solarMonth} onSelect={setSolarMonth} displayValue={displayCalendarValue} />
                      <PickerColumn values={SOLAR_DAYS} selected={solarDay} onSelect={setSolarDay} displayValue={displayCalendarValue} />
                      <PickerColumn values={SOLAR_HOURS} selected={solarHour} onSelect={setSolarHour} displayValue={displayCalendarValue} />
                    </Animated.View>
                    <Animated.View
                      pointerEvents={calendarMode === 'lunar' ? 'auto' : 'none'}
                      style={[
                        styles.pickerColumnsLayer,
                        {
                          opacity: calendarSwitchProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          }),
                        },
                      ]}
                    >
                      <PickerColumn values={YEARS.map((item) => `${item}年`)} selected={year} onSelect={setYear} displayValue={displayCalendarValue} />
                      <PickerColumn values={LUNAR_MONTHS} selected={lunarMonth} onSelect={setLunarMonth} displayValue={displayCalendarValue} />
                      <PickerColumn values={LUNAR_DAYS} selected={lunarDay} onSelect={setLunarDay} displayValue={displayCalendarValue} />
                      <PickerColumn values={LUNAR_HOURS} selected={lunarHour} onSelect={setLunarHour} displayValue={displayCalendarValue} />
                    </Animated.View>
                  </View>
              </Animated.View>
            ) : null}
            </ScrollView>
            <View style={[styles.editModalFooter, { backgroundColor: colors.card }]}>
              <Pressable style={[styles.saveEditButton, { backgroundColor: colors.inverse }]} onPress={saveEditingProfile}>
                <Text style={[styles.saveEditButtonText, { color: colors.inverseText }]}>{t('archive.save')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
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
  content: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 116 },
  profileGroup: { overflow: 'hidden' },
  groupHeader: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginTop: 2 },
  groupTitle: { color: '#666', fontSize: 12, fontWeight: '900' },
  groupDivider: { flex: 1, height: 1, backgroundColor: '#dddddd' },
  archiveCardShell: { overflow: 'hidden' },
  archiveCard: { ...CARD_SHADOW, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden' },
  archiveHeader: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15 },
  avatar: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { backgroundColor: '#111' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  archiveTitleWrap: { flex: 1, gap: 4 },
  archiveName: { color: '#111', fontSize: 17, fontWeight: '900' },
  archiveSubtitle: { color: '#777', fontSize: 12, fontWeight: '800' },
  archiveArrow: { color: '#555', fontSize: 26, fontWeight: '600' },
  archiveDetailWrap: { overflow: 'hidden' },
  archiveDetailMeasure: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 15 },
  detailInner: { paddingBottom: 12 },
  detailDivider: { height: 1, backgroundColor: '#ededed', marginBottom: 8 },
  detailRow: { height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLabel: { color: '#777', fontSize: 12, fontWeight: '800' },
  detailValue: { color: '#111', fontSize: 12, fontWeight: '900' },
  profileActionRow: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  editProfileButton: { flex: 1, height: 38, borderRadius: 15, backgroundColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  editProfileText: { color: '#111', fontSize: 12, fontWeight: '900' },
  deleteProfileButton: { flex: 1, height: 38, borderRadius: 15, backgroundColor: '#fff0ee', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteProfileText: { color: '#d23b32', fontSize: 12, fontWeight: '900' },
  fixedAddWrap: { position: 'absolute', left: 18, right: 18, bottom: 26, zIndex: 35, elevation: 35 },
  addCard: { ...CARD_SHADOW, height: 62, borderRadius: 20, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  addSubtitle: { color: '#cfcfcf', fontSize: 11, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  editModalCard: { width: '100%', height: '70%', borderRadius: 24, backgroundColor: '#fff', padding: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  editModalHeader: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editModalTitle: { color: '#111', fontSize: 18, fontWeight: '900' },
  closeButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: '#111', fontSize: 22, fontWeight: '700', lineHeight: 25, marginTop: -2 },
  editModalScroll: { flex: 1 },
  editModalContent: { paddingTop: 14, gap: 14, paddingBottom: 16 },
  avatarEditCenter: { alignSelf: 'center', alignItems: 'center', marginTop: 2, marginBottom: 4, position: 'relative' },
  avatarCameraBadge: { position: 'absolute', right: 1, bottom: 1, width: 26, height: 26, borderRadius: 13, backgroundColor: '#111', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  editField: { gap: 7 },
  editLabel: { color: '#555', fontSize: 12, fontWeight: '900' },
  editInput: { height: 44, borderRadius: 14, backgroundColor: '#f4f4f4', paddingHorizontal: 13, color: '#111', fontSize: 14, fontWeight: '800' },
  relationTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relationTag: { height: 34, paddingHorizontal: 13, borderRadius: 17, backgroundColor: '#f4f4f4', alignItems: 'center', justifyContent: 'center' },
  relationTagText: { color: '#666', fontSize: 12, fontWeight: '900' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderOption: { flex: 1, height: 38, borderRadius: 13, backgroundColor: '#f4f4f4', alignItems: 'center', justifyContent: 'center' },
  genderOptionText: { color: '#666', fontSize: 13, fontWeight: '900' },
  dateValueButton: { height: 44, borderRadius: 14, backgroundColor: '#f4f4f4', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateValueText: { flex: 1, color: '#111', fontSize: 14, fontWeight: '800' },
  dateValueTextWrap: { flex: 1, height: 18, justifyContent: 'center', position: 'relative' },
  dateValueTextLayer: { position: 'absolute', left: 0, right: 0, top: 0 },
  dateToggleMark: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  inlineCalendar: { gap: 10, paddingTop: 10 },
  calendarSwitch: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 14, padding: 4, gap: 4, position: 'relative', overflow: 'hidden' },
  calendarSlider: { position: 'absolute', left: 4, top: 4, bottom: 4, width: '50%', borderRadius: 11, backgroundColor: '#dceee1' },
  calendarOption: { flex: 1, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  calendarText: { color: '#555', fontSize: 13, fontWeight: '900' },
  calendarTextActive: { color: '#0f5f2d' },
  pickerRow: { height: PICKER_ITEM_HEIGHT * PICKER_VISIBLE_ROWS, position: 'relative' },
  pickerBackgroundRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 8, zIndex: 0, elevation: 0 },
  pickerColumnBackground: { flex: 1, borderRadius: 14, backgroundColor: '#f5f5f5' },
  pickerCenterBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PICKER_VERTICAL_PADDING,
    height: PICKER_ITEM_HEIGHT,
    zIndex: 2,
    elevation: 2,
  },
  pickerColumnsLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 8, zIndex: 3, elevation: 3 },
  pickerColumnWrap: { flex: 1, overflow: 'hidden', position: 'relative', zIndex: 4, elevation: 4 },
  pickerColumn: { flex: 1 },
  pickerColumnContent: { paddingVertical: PICKER_VERTICAL_PADDING },
  pickerOption: { height: PICKER_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pickerOptionText: { width: '100%', color: '#000', fontSize: 12, fontWeight: '900', lineHeight: 16, textAlign: 'center', includeFontPadding: false },
  editModalFooter: { paddingTop: 12, backgroundColor: '#fff' },
  saveEditButton: { height: 46, borderRadius: 16, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  saveEditButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
