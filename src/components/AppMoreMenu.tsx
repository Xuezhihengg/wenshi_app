import { useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LineIcon, LineIconName } from './LineIcon';
import { useAppTheme } from '../theme/AppTheme';
import { TranslationKey, useAppLanguage } from '../i18n/AppLanguage';

type Props = {
  navigation: {
    navigate: (screen: 'Question' | 'Profile' | 'Save' | 'Settings') => void;
    goBack?: () => void;
    popToTop?: () => void;
  };
  currentScreen?: 'Question' | 'Profile' | 'Save' | 'Settings';
  buttonBackgroundColor?: string;
};

const MENU_ITEMS: Array<{
  screen: 'Question' | 'Profile' | 'Save' | 'Settings';
  destination: 'Question' | 'Profile' | 'Save' | 'Settings';
  icon: LineIconName;
  labelKey: TranslationKey;
}> = [
  { screen: 'Question', destination: 'Question', icon: 'home', labelKey: 'common.home' },
  { screen: 'Profile', destination: 'Profile', icon: 'user', labelKey: 'common.profile' },
  { screen: 'Save', destination: 'Save', icon: 'history', labelKey: 'common.history' },
  { screen: 'Settings', destination: 'Profile', icon: 'settings', labelKey: 'common.settings' },
];

export function AppMoreMenu({ navigation, currentScreen, buttonBackgroundColor }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const backdropProgress = useRef(new Animated.Value(0)).current;

  const open = () => {
    setMounted(true);
    setVisible(true);
    progress.stopAnimation();
    backdropProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(backdropProgress, {
        toValue: 1,
        duration: 380,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const close = () => {
    setVisible(false);
    progress.stopAnimation();
    backdropProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(backdropProgress, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  };

  const toggle = () => {
    if (visible) {
      close();
      return;
    }
    open();
  };

  const navigateTo = (screen: 'Question' | 'Profile' | 'Save' | 'Settings') => {
    close();
    if (screen === 'Question') {
      if (currentScreen === 'Question') return;
      if (navigation.popToTop) {
        navigation.popToTop();
        return;
      }
      if (navigation.goBack) {
        navigation.goBack();
        return;
      }
    }
    navigation.navigate(screen);
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropProgress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.layer}>
        <Pressable style={[styles.button, visible ? styles.buttonActive : null, { backgroundColor: visible ? (darkMode ? colors.card : colors.inverse) : (buttonBackgroundColor ?? colors.control) }]} onPress={toggle}>
          {Platform.OS === 'android' ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.androidIconLayer,
                  {
                    opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0, 0] }),
                    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) }],
                  },
                ]}
              >
                <LineIcon name="moreHorizontal" size={23} color={visible && !darkMode ? colors.inverseText : colors.text} />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.androidIconLayer,
                  {
                    opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] }),
                    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
                  },
                ]}
              >
                <LineIcon name="x" size={23} color={darkMode ? colors.text : colors.inverseText} />
              </Animated.View>
            </>
          ) : (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.dots,
                  {
                    opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0, 0] }),
                    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) }],
                  },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: visible && !darkMode ? colors.inverseText : colors.text }]} />
                <View style={[styles.dot, { backgroundColor: visible && !darkMode ? colors.inverseText : colors.text }]} />
                <View style={[styles.dot, { backgroundColor: visible && !darkMode ? colors.inverseText : colors.text }]} />
              </Animated.View>
              <Animated.Text
                pointerEvents="none"
                style={[
                  styles.closeText,
                  {
                    color: darkMode ? colors.text : colors.inverseText,
                    opacity: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] }),
                    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
                  },
                ]}
              >
                ×
              </Animated.Text>
            </>
          )}
        </Pressable>
        {mounted ? (
          <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                opacity: progress,
                transform: [
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                  { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                ],
              },
            ]}
          >
            <Animated.View
              style={{
                opacity: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
                transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-3, 0] }) }],
              }}
            >
              {MENU_ITEMS.map((item, index) => {
                const active = currentScreen === item.screen;
                return (
                  <View key={item.screen}>
                    <Pressable
                      style={[styles.item, active ? [styles.itemActive, { backgroundColor: colors.inverse }] : null]}
                      onPress={() => active && item.destination === currentScreen ? close() : navigateTo(item.destination)}
                    >
                      <View style={styles.icon}>
                        <LineIcon name={item.icon} size={19} color={active ? colors.inverseText : colors.text} />
                      </View>
                      <Text style={[styles.text, { color: colors.text }, active ? [styles.activeText, { color: colors.inverseText }] : null]}>{t(item.labelKey)}</Text>
                    </Pressable>
                    {index < MENU_ITEMS.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.divider }]} /> : null}
                  </View>
                );
              })}
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)', zIndex: 20, elevation: 20 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, height: 328, zIndex: 34, elevation: 34 },
  button: {
    position: 'absolute',
    right: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 42,
    elevation: 4,
  },
  buttonActive: { backgroundColor: '#000' },
  dots: { position: 'absolute', width: 40, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, ...Platform.select({ android: { transform: [{ translateY: -0.5 }] } }) },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#111' },
  androidIconLayer: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: {
    position: 'absolute',
    top: -1,
    width: 40,
    height: 40,
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 40,
    textAlign: 'center',
    includeFontPadding: false,
    ...Platform.select({ android: { top: 0, textAlignVertical: 'center' } }),
  },
  card: {
    position: 'absolute',
    right: 20,
    top: 106,
    width: 148,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  itemActive: { marginHorizontal: 8, borderRadius: 11, backgroundColor: '#000', paddingHorizontal: 10 },
  icon: { width: 20, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#111', fontSize: 14, fontWeight: '900' },
  activeText: { color: '#fff' },
  divider: { height: 1, backgroundColor: '#ededed', marginHorizontal: 12 },
});
