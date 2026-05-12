import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { submitFeedback, uploadFeedbackScreenshot } from '../api/client';
import { LineIcon } from '../components/LineIcon';
import { useAppLanguage } from '../i18n/AppLanguage';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/AppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;
type FeedbackType = 'bug' | 'feature' | 'experience' | 'other';
type ScreenshotItem = { id: string; uri: string };

const FEEDBACK_TYPES: Array<{ key: FeedbackType; labelKey: 'feedback.typeBug' | 'feedback.typeFeature' | 'feedback.typeExperience' | 'feedback.typeOther' }> = [
  { key: 'bug', labelKey: 'feedback.typeBug' },
  { key: 'feature', labelKey: 'feedback.typeFeature' },
  { key: 'experience', labelKey: 'feedback.typeExperience' },
  { key: 'other', labelKey: 'feedback.typeOther' },
];
const MAX_SCREENSHOTS = 4;

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

function FeedbackTypeButton({
  active,
  label,
  english,
  onPress,
}: {
  active: boolean;
  label: string;
  english: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  return (
    <Animated.View
      style={[
        styles.typeButton,
        english ? styles.typeButtonEn : null,
        {
          backgroundColor: activeProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.cardMuted, colors.inverse],
          }),
          borderColor: activeProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.border, colors.inverse],
          }),
          transform: [
            {
              scale: activeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.025],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable style={styles.typeButtonPressable} onPress={onPress}>
        <Animated.Text
          numberOfLines={english ? 2 : 1}
          style={[
            styles.typeButtonText,
            english ? styles.typeButtonTextEn : null,
            {
              color: activeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [colors.text, colors.inverseText],
              }),
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

function ScreenshotThumb({ item, onRemove }: { item: ScreenshotItem; onRemove: () => void }) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const closeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      damping: 15,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const removeWithAnimation = () => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(closeScale, {
        toValue: 0.82,
        damping: 14,
        stiffness: 260,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start(onRemove);
  };

  return (
    <Animated.View
      style={[
        styles.screenshotThumbWrap,
        {
          opacity: progress,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.86, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Image source={{ uri: item.uri }} style={styles.screenshotThumb} />
      <Animated.View style={[styles.removeScreenshot, { backgroundColor: colors.inverse, transform: [{ scale: closeScale }] }]}>
        <Pressable style={styles.removeScreenshotPressable} onPress={removeWithAnimation}>
          <Text style={[styles.removeScreenshotText, { color: colors.inverseText }]}>×</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function ScreenshotPickerButton({ english, onPress }: { english: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  const pressScale = useRef(new Animated.Value(1)).current;

  const animatePress = (pressed: boolean) => {
    Animated.spring(pressScale, {
      toValue: pressed ? 0.96 : 1,
      damping: 14,
      stiffness: 260,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.screenshotPicker,
        english ? styles.screenshotPickerEn : null,
        { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressScale }] },
      ]}
    >
      <Pressable
        style={styles.screenshotPickerPressable}
        onPress={onPress}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
      >
        <LineIcon name="image" size={22} color={colors.text} />
        <Text
          numberOfLines={english ? 2 : 1}
          style={[styles.screenshotPickerText, english ? styles.screenshotPickerTextEn : null, { color: colors.text }]}
        >
          {t('feedback.addScreenshot')}
        </Text>
        <Text style={[styles.screenshotPickerHint, { color: colors.faintText }]}>{t('feedback.optional')}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function FeedbackScreen({ navigation }: Props) {
  const { colors, darkMode } = useAppTheme();
  const { language, t } = useAppLanguage();
  const [type, setType] = useState<FeedbackType>('bug');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = description.trim().length >= 6 && !submitting;
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

  const pickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('feedback.albumDeniedTitle'), t('feedback.albumDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_SCREENSHOTS - screenshots.length),
    });
    if (!result.canceled) {
      setScreenshots((current) => [
        ...current,
        ...result.assets
          .slice(0, MAX_SCREENSHOTS - current.length)
          .map((asset) => ({ id: `${Date.now()}-${asset.assetId || asset.uri}`, uri: asset.uri })),
      ]);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!canSubmit) {
      Alert.alert(t('feedback.incompleteTitle'), t('feedback.incompleteBody'));
      return;
    }
    setSubmitting(true);
    try {
      const screenshotUrls = await Promise.all(screenshots.map((item) => uploadFeedbackScreenshot({ uri: item.uri })));
      await submitFeedback({
        type,
        description: description.trim(),
        screenshotUrls,
        appVersion: '1.0.0',
        platform: Platform.OS,
      });
      Alert.alert(t('feedback.submitSuccessTitle'), t('feedback.submitSuccessBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('feedback.submitFailedTitle'), t('feedback.submitFailedBody'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: colors.controlText }]}>‹</Text>
        </Pressable>
        <Text pointerEvents="none" style={[styles.navTitle, { color: colors.text }]}>{t('feedback.title')}</Text>
      </View>

      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
            <View style={[styles.heroIcon, { backgroundColor: darkMode ? '#1e3a2f' : '#d1fae5' }]}>
              <LineIcon name="message" size={24} color={colors.text} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>{t('feedback.heroTitle')}</Text>
              <Text style={[styles.heroBody, { color: colors.mutedText }]}>{t('feedback.heroBody')}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('feedback.typeTitle')}</Text>
            <View style={[styles.typeGrid, language === 'en' ? styles.typeGridEn : null]}>
              {FEEDBACK_TYPES.map((item) => {
                const active = item.key === type;
                return (
                  <FeedbackTypeButton
                    key={item.key}
                    active={active}
                    english={language === 'en'}
                    label={t(item.labelKey)}
                    onPress={() => setType(item.key)}
                  />
                );
              })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('feedback.descriptionTitle')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('feedback.descriptionPlaceholder')}
              placeholderTextColor={colors.faintText}
              multiline
              textAlignVertical="top"
              style={[styles.descriptionInput, language === 'en' ? styles.descriptionInputEn : null, { backgroundColor: colors.cardMuted, color: colors.text }]}
            />
          </View>

          <View style={styles.screenshotSection}>
            <View style={styles.screenshotHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('feedback.screenshotTitle')}</Text>
              <Text style={[styles.screenshotCount, { color: colors.faintText }]}>{screenshots.length}/{MAX_SCREENSHOTS}</Text>
            </View>
            <Text style={[styles.screenshotHint, { color: colors.faintText }]}>{t('feedback.screenshotHint')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screenshotScroller} contentContainerStyle={styles.screenshotList}>
              {screenshots.map((item) => (
                <ScreenshotThumb
                  key={item.id}
                  item={item}
                  onRemove={() => setScreenshots((current) => current.filter((screenshot) => screenshot.id !== item.id))}
                />
              ))}
              {screenshots.length < MAX_SCREENSHOTS ? (
                <ScreenshotPickerButton english={language === 'en'} onPress={pickScreenshot} />
              ) : null}
            </ScrollView>
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: canSubmit ? colors.inverse : (darkMode ? '#2b2b31' : '#d8d8d8') }]}
            onPress={handleSubmitFeedback}
          >
            <Text style={[styles.submitButtonText, { color: canSubmit ? colors.inverseText : (darkMode ? '#8b8b94' : '#777777') }]}>{submitting ? t('common.wait') : t('feedback.submit')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topLayer: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 40 },
  edgeBackGestureArea: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, zIndex: 45, elevation: 45 },
  backButton: { position: 'absolute', left: 20, top: 60, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 42, elevation: 42 },
  backButtonText: { fontSize: 34, fontWeight: '500', lineHeight: 38, marginTop: -2 },
  navTitle: { position: 'absolute', top: 69, left: 88, right: 88, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  keyboardWrap: { position: 'absolute', left: 0, right: 0, top: 104, bottom: 0 },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 24, gap: 20 },
  heroCard: { ...CARD_SHADOW, borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroTextWrap: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 18, fontWeight: '900' },
  heroBody: { fontSize: 11, fontWeight: '800', lineHeight: 16 },
  card: { ...CARD_SHADOW, borderRadius: 20, padding: 20, gap: 9 },
  sectionTitle: { fontSize: 14, fontWeight: '900' },
  typeGrid: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8 },
  typeGridEn: { flexWrap: 'wrap', gap: 8 },
  typeButton: { flex: 1, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  typeButtonPressable: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  typeButtonEn: { flexBasis: '48%', flexGrow: 1, height: 38, paddingHorizontal: 8 },
  typeButtonText: { fontSize: 11, fontWeight: '900' },
  typeButtonTextEn: { fontSize: 10.5, lineHeight: 13, textAlign: 'center' },
  descriptionInput: { minHeight: 150, borderRadius: 16, padding: 12, fontSize: 13, fontWeight: '800', lineHeight: 19 },
  descriptionInputEn: { minHeight: 120 },
  screenshotSection: { gap: 7, paddingHorizontal: 2 },
  screenshotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenshotCount: { fontSize: 12, fontWeight: '900' },
  screenshotHint: { fontSize: 11, fontWeight: '800', lineHeight: 16, marginTop: -6 },
  screenshotScroller: { marginHorizontal: -20, overflow: 'visible' },
  screenshotList: { gap: 9, paddingHorizontal: 20, paddingVertical: 12 },
  screenshotPicker: { ...CARD_SHADOW, width: 96, height: 96, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 5 },
  screenshotPickerPressable: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 5 },
  screenshotPickerEn: { width: 108 },
  screenshotPickerText: { fontSize: 12, fontWeight: '900' },
  screenshotPickerTextEn: { fontSize: 11, lineHeight: 13, textAlign: 'center', paddingHorizontal: 6 },
  screenshotPickerHint: { fontSize: 11, fontWeight: '800' },
  screenshotThumbWrap: { width: 96, height: 96, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  screenshotThumb: { width: '100%', height: '100%' },
  removeScreenshot: { position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  removeScreenshotPressable: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  removeScreenshotText: { fontSize: 24, fontWeight: '700', lineHeight: 28, marginTop: -2 },
  submitButton: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  submitButtonText: { fontSize: 15, fontWeight: '900' },
});
