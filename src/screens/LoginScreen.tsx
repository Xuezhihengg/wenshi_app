import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Alert, Keyboard, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthChannel, enableGuestMode, LoginResult, loginWithCode, sendLoginCode } from '../api/client';
import { LineIcon, LineIconName } from '../components/LineIcon';
import { RootStackParamList } from '../navigation/types';
import { setCurrentAccount } from '../storage/userProfileStore';
import { useAppTheme } from '../theme/AppTheme';
import { useAppLanguage, type TranslationKey } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type ProviderAction = {
  key: string;
  icon: keyof typeof FontAwesome.glyphMap | LineIconName;
  brand?: boolean;
};

const PROVIDERS: ProviderAction[] = [
  ...(Platform.OS === 'ios' ? [{ key: 'apple', icon: 'apple' as const, brand: true }] : []),
  { key: 'wechat', icon: 'wechat', brand: true },
  { key: 'google', icon: 'google', brand: true },
  { key: 'guest', icon: 'user' },
];

export function LoginScreen({ navigation }: Props) {
  const { darkMode, colors } = useAppTheme();
  const { t } = useAppLanguage();
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const keyboardLift = useRef(new Animated.Value(0)).current;
  const checkboxProgress = useRef(new Animated.Value(0)).current;
  const buttonProgress = useRef(new Animated.Value(0)).current;
  const buttonPressScale = useRef(new Animated.Value(1)).current;
  const phaseOpacity = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const normalizedAccount = account.trim();
  const accountValid = isValidPhoneOrEmail(normalizedAccount);
  const codeValid = code.trim().length >= 4;
  const canSubmit = agreed && !submitting && (codeRequested ? codeValid : accountValid);

  useEffect(() => {
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [screenOpacity]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      Animated.timing(keyboardLift, {
        toValue: -Math.max(0, event.endCoordinates.height - 72),
        duration: event.duration || 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(keyboardLift, {
        toValue: 0,
        duration: event.duration || 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardLift]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(checkboxProgress, {
        toValue: agreed ? 1 : 0,
        damping: 13,
        stiffness: 220,
        mass: 0.75,
        useNativeDriver: false,
      }),
      Animated.timing(buttonProgress, {
        toValue: canSubmit ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [agreed, buttonProgress, canSubmit, checkboxProgress]);

  useEffect(() => {
    if (!codeRequested || resendSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeRequested, resendSeconds]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(hintOpacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [errorText, hintOpacity]);

  const animateButtonPress = (pressed: boolean) => {
    Animated.spring(buttonPressScale, {
      toValue: pressed ? 0.975 : 1,
      damping: 14,
      stiffness: 260,
      mass: 0.6,
      useNativeDriver: false,
    }).start();
  };

  const switchCodePhase = (nextRequested: boolean) => {
    Animated.timing(phaseOpacity, {
      toValue: 0,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setCodeRequested(nextRequested);
      if (!nextRequested) setCode('');
      if (nextRequested) setResendSeconds(60);
      setErrorText('');
      Animated.timing(phaseOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  };

  const requestCode = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setErrorText('');
    try {
      await sendLoginCode(normalizedAccount, getAuthChannel(normalizedAccount));
      switchCodePhase(true);
    } catch (error) {
      setErrorText(error instanceof Error ? formatAuthError(error.message, t) : t('login.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (resendSeconds > 0) return;
    Keyboard.dismiss();
    setErrorText('');
    try {
      await sendLoginCode(normalizedAccount, getAuthChannel(normalizedAccount));
      setResendSeconds(60);
    } catch (error) {
      setErrorText(error instanceof Error ? formatAuthError(error.message, t) : t('login.sendFailed'));
    }
  };

  const continueToApp = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setErrorText('');
    try {
      const result = await loginWithCode(normalizedAccount, getAuthChannel(normalizedAccount), code.trim());
      await setCurrentAccount(normalizedAccount);
      routeAfterLogin(result);
    } catch (error) {
      setErrorText(error instanceof Error ? formatAuthError(error.message, t) : t('login.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const routeAfterLogin = (result: LoginResult) => {
    if (result.isNewUser) {
      navigation.replace('ProfileSetup', { fresh: true });
    } else if (!result.profileCompleted) {
      navigation.replace('ProfileSetup');
    } else {
      navigation.replace('Question');
    }
  };

  const showProviderUnavailable = (key: string) => {
    const titleKey: TranslationKey =
      key === 'apple' ? 'login.appleUnavailableTitle'
      : key === 'wechat' ? 'login.wechatUnavailableTitle'
      : 'login.googleUnavailableTitle';
    const bodyKey: TranslationKey =
      key === 'apple' ? 'login.appleUnavailableBody'
      : key === 'wechat' ? 'login.wechatUnavailableBody'
      : 'login.googleUnavailableBody';
    Alert.alert(t(titleKey), t(bodyKey), [{ text: t('login.unavailableConfirm') }]);
  };

  const continueAsGuest = () => {
    Alert.alert(
      t('login.guestConfirmTitle'),
      t('login.guestConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('login.guestConfirmOk'),
          onPress: async () => {
            try {
              await enableGuestMode();
              navigation.replace('ProfileSetup', { fresh: true });
            } catch (error) {
              setErrorText(error instanceof Error ? error.message : t('login.failed'));
            }
          },
        },
      ]
    );
  };

  const handleProviderPress = (key: string) => {
    setErrorText('');
    if (key === 'guest') {
      continueAsGuest();
      return;
    }
    showProviderUnavailable(key);
  };

  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <LinearGradient
          pointerEvents="none"
          colors={darkMode ? ['rgba(51, 82, 58, 0.34)', 'rgba(13,13,15,0)'] : ['rgba(219, 239, 224, 0.95)', 'rgba(243,243,243,0)']}
          style={styles.topGlow}
        />

        <Animated.View style={[styles.content, { opacity: screenOpacity }]}>
          <View style={styles.hero}>
            <View style={[styles.logoMark, { backgroundColor: darkMode ? '#203526' : '#b6eac3' }]}> 
              <Text style={[styles.logoText, { color: darkMode ? '#dff3e4' : '#173d22' }]}>问</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('login.slogan')}</Text>
          </View>

          <Animated.View style={[styles.bottomArea, { transform: [{ translateY: keyboardLift }] }]}>
          <View style={[styles.card, { backgroundColor: colors.card }]}> 
            <View style={styles.formBlock}>
              <Animated.Text style={[styles.inputLabel, { color: colors.mutedText, opacity: phaseOpacity }]}>{codeRequested ? t('login.codeLabel') : t('login.accountLabel')}</Animated.Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.cardMuted }]}> 
                <Animated.View style={{ opacity: phaseOpacity }}>
                  <LineIcon name={codeRequested ? 'shield' : 'atSign'} size={18} color={colors.faintText} />
                </Animated.View>
                <Animated.View style={[styles.inputAnimatedWrap, { opacity: phaseOpacity }]}>
                  <TextInput
                    value={codeRequested ? code : account}
                    onChangeText={codeRequested ? setCode : setAccount}
                    placeholder={codeRequested ? t('login.codePlaceholder') : t('login.accountPlaceholder')}
                    placeholderTextColor={colors.faintText}
                    keyboardType={codeRequested ? 'number-pad' : 'email-address'}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.text }]}
                  />
                </Animated.View>
                {codeRequested ? (
                  <Pressable style={styles.resendButton} onPress={resendCode}>
                    <Animated.Text style={[styles.resendText, { color: resendSeconds > 0 ? colors.faintText : colors.text, opacity: phaseOpacity }]}>
                      {resendSeconds > 0 ? `${resendSeconds}s` : t('login.resend')}
                    </Animated.Text>
                  </Pressable>
                ) : null}
              </View>

              {!codeRequested ? (
                <Pressable style={styles.agreementRow} onPress={() => setAgreed((value) => !value)}>
                  <Animated.View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: checkboxProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['rgba(0,0,0,0)', '#111111'],
                        }),
                        borderColor: checkboxProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [colors.faintText, '#111111'],
                        }),
                        transform: [
                          {
                            scale: checkboxProgress.interpolate({
                              inputRange: [0, 0.45, 1],
                              outputRange: [1, 0.88, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Animated.View
                      style={{
                        opacity: checkboxProgress,
                      }}
                    >
                      <Text style={styles.checkboxCheck}>✓</Text>
                    </Animated.View>
                  </Animated.View>
                  <Text style={[styles.agreementText, { color: colors.faintText }]}>
                    {t('login.agreementPrefix')}
                    <Text style={{ color: colors.text }}>{t('login.terms')}</Text>
                    {t('login.agreementMiddle')}
                    <Text style={{ color: colors.text }}>{t('login.privacy')}</Text>
                  </Text>
                </Pressable>
              ) : null}
              {codeRequested || errorText ? (
                <Animated.Text
                  style={[
                    styles.messageHint,
                    {
                      opacity: hintOpacity,
                      color: errorText ? (darkMode ? '#fca5a5' : '#c2413f') : darkMode ? '#82d19b' : '#2d8a4a',
                    },
                  ]}
                >
                  {errorText || t('login.sentTo').replace('{account}', account || t('login.yourAccount'))}
                </Animated.Text>
              ) : null}
            </View>

            <Animated.View
              style={[
                styles.primaryButton,
                {
                  backgroundColor: buttonProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [colors.cardMuted, colors.inverse],
                  }),
                  transform: [{ scale: buttonPressScale }],
                },
              ]}
            >
              <Pressable
                style={styles.primaryButtonPressable}
                onPress={codeRequested ? continueToApp : requestCode}
                onPressIn={() => canSubmit && animateButtonPress(true)}
                onPressOut={() => animateButtonPress(false)}
              >
                <Animated.Text
                  style={[
                    styles.primaryButtonText,
                    {
                      opacity: phaseOpacity,
                      color: buttonProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [colors.faintText, colors.inverseText],
                      }),
                    },
                  ]}
                >
                  {submitting ? t('common.wait') : codeRequested ? t('login.submit') : t('login.getCode')}
                </Animated.Text>
              </Pressable>
            </Animated.View>

            {codeRequested ? (
              <Pressable style={styles.changeAccountButton} onPress={() => switchCodePhase(false)}>
                <Text style={[styles.changeAccountText, { color: colors.mutedText }]}>{t('login.changeAccount')}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.providerRow}>
            {PROVIDERS.map((provider) => (
              <Pressable key={provider.key} style={styles.providerItem} onPress={() => handleProviderPress(provider.key)}>
                <View style={[styles.providerCircle, { backgroundColor: colors.card }]}> 
                  {provider.brand ? (
                    <FontAwesome name={provider.icon as keyof typeof FontAwesome.glyphMap} size={22} color={getProviderIconColor(provider.key, darkMode)} />
                  ) : (
                    <LineIcon name={provider.icon as LineIconName} size={21} color={colors.text} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function getProviderIconColor(key: string, darkMode: boolean) {
  if (key === 'wechat') return '#18c35c';
  if (key === 'google') return '#4285f4';
  if (key === 'apple') return darkMode ? '#ffffff' : '#111111';
  return darkMode ? '#ffffff' : '#111111';
}

function isValidPhoneOrEmail(value: string) {
  const phonePattern = /^1[3-9]\d{9}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return phonePattern.test(value) || emailPattern.test(value);
}

function getAuthChannel(value: string): AuthChannel {
  return value.includes('@') ? 'email' : 'phone';
}

function formatAuthError(message: string, t: (key: 'login.tooFrequent' | 'login.invalidCode' | 'login.smsUnavailable' | 'login.genericFailed') => string) {
  if (message.includes('429') || message.includes('Please wait')) return t('login.tooFrequent');
  if (message.includes('Invalid verification code')) return t('login.invalidCode');
  if (message.includes('SMS provider')) return t('login.smsUnavailable');
  return t('login.genericFailed');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 300 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 68, paddingBottom: 34, justifyContent: 'space-between' },
  hero: { alignItems: 'center' },
  logoMark: {
    width: 120,
    height: 120,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logoText: { fontSize: 48, fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '200', letterSpacing: 1 },
  bottomArea: { paddingBottom: 22 },
  card: { borderRadius: 28, padding: 18, gap: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  formBlock: { gap: 9 },
  inputLabel: { fontSize: 12, fontWeight: '900', marginLeft: 4, marginTop: 4 },
  inputWrap: { height: 52, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputAnimatedWrap: { flex: 1 },
  input: { flex: 1, height: 52, fontSize: 15, fontWeight: '800' },
  resendButton: { paddingLeft: 8, paddingVertical: 8 },
  resendText: { fontSize: 12, fontWeight: '900' },
  agreementRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, marginLeft: 2 },
  checkbox: { width: 17, height: 17, borderRadius: 6, borderWidth: 1.4, alignItems: 'center', justifyContent: 'center' },
  checkboxCheck: { color: '#ffffff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  agreementText: { flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  messageHint: { fontSize: 12, fontWeight: '800', marginLeft: 4, marginTop: -2 },
  primaryButton: { height: 50, borderRadius: 18, overflow: 'hidden' },
  primaryButtonPressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: '900' },
  changeAccountButton: { alignSelf: 'center', paddingVertical: 2 },
  changeAccountText: { fontSize: 13, fontWeight: '800' },
  providerRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 22 },
  providerItem: { alignItems: 'center', minWidth: 54 },
  providerCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
});
