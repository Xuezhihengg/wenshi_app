import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Keyboard, PanResponder, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { bindAccount, sendBindCode } from '../api/client';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/AppTheme';
import { useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailBind'>;

export function EmailBindScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  const edgeSwipeActive = useRef(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [bound, setBound] = useState(false);
  const [codeStage, setCodeStage] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textStageOpacity = useRef(new Animated.Value(1)).current;
  const buttonEnabledProgress = useRef(new Animated.Value(0)).current;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSendCode = emailValid && countdown === 0;
  const canBind = emailValid && code.trim().length === 6;
  const inputLabel = codeStage ? t('bind.code') : t('bind.email');
  const inputValue = codeStage ? code : email;
  const inputPlaceholder = codeStage ? t('bind.codePlaceholder') : t('bind.emailPlaceholder');
  const keyboardType = codeStage ? 'number-pad' : 'email-address';
  const inputMaxLength = codeStage ? 6 : undefined;
  const buttonDisabled = submitting || (codeStage ? !canBind : !canSendCode);
  const buttonText = codeStage ? (bound ? t('common.enabled') : t('common.confirm')) : t('bind.code');
  const maskedEmail = email.trim().replace(/^(.{1,3})(.*)(@.*)$/, (_, prefix: string, middle: string, suffix: string) => {
    if (!middle) return `${prefix}****${suffix}`;
    return `${prefix}****${suffix}`;
  });
  const buttonBackgroundColor = buttonEnabledProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.faintText, colors.inverse],
  });
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

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    Animated.timing(buttonEnabledProgress, {
      toValue: buttonDisabled ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [buttonDisabled, buttonEnabledProgress]);

  const fadeTextTo = (afterFadeOut: () => void) => {
    textStageOpacity.stopAnimation();
    Animated.timing(textStageOpacity, {
      toValue: 0,
      duration: 130,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      afterFadeOut();
      Animated.timing(textStageOpacity, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  };

  const friendlyError = (error: unknown) => {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes('429')) return '验证码发送太频繁，请稍后再试。';
    if (raw.includes('409')) return '这个邮箱已经被注册过了。';
    if (raw.includes('502')) return '邮件服务暂时不可用，请稍后再试。';
    return '请求失败，请稍后再试。';
  };

  const sendCode = async () => {
    if (!canSendCode) {
      setMessage(email.trim() ? '请输入正确的邮箱地址。' : '请先输入邮箱。');
      return;
    }
    setSubmitting(true);
    try {
      const response = await sendBindCode(email.trim(), 'email');
      const nextCountdown = Math.min(60, Math.max(1, response.expires_in_seconds || 60));
      fadeTextTo(() => {
        setMessage('');
        setCodeStage(true);
        setCode('');
        setBound(false);
        setCountdown(nextCountdown);
      });
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const bindEmail = async () => {
    if (!canBind) {
      Alert.alert(t('bind.invalidCodeTitle'), t('bind.invalidCodeBody'));
      return;
    }
    setSubmitting(true);
    try {
      await bindAccount(email.trim(), 'email', code.trim());
      setBound(true);
      setMessage('');
      Keyboard.dismiss();
      Alert.alert(t('bind.emailSuccessTitle'), t('bind.emailSuccessBody'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      setMessage(error instanceof Error && error.message.includes('401') ? '验证码不正确或已过期。' : friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!codeStage || countdown > 0) return;
    setSubmitting(true);
    try {
      const response = await sendBindCode(email.trim(), 'email');
      setMessage('');
      setCode('');
      setBound(false);
      setCountdown(Math.min(60, Math.max(1, response.expires_in_seconds || 60)));
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const changeEmail = () => {
    fadeTextTo(() => {
      setCodeStage(false);
      setCode('');
      setBound(false);
      setCountdown(0);
    });
  };

  const handlePrimaryAction = () => {
    if (codeStage) {
      bindEmail();
      return;
    }
    sendCode();
  };

  const handleInputChange = (value: string) => {
    setMessage('');
    setBound(false);
    if (codeStage) {
      setCode(value);
      return;
    }
    setEmail(value);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      <View style={styles.edgeBackGestureArea} {...edgeBackPanResponder.panHandlers} />
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('bind.emailTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.faintText }]}>{t('bind.emailSubtitle')}</Text>

        <View style={styles.inputBlock}>
          <Animated.Text style={[styles.inputLabel, { color: colors.text, opacity: textStageOpacity }]}>{inputLabel}</Animated.Text>
          <View style={[styles.inputFrame, { backgroundColor: colors.cardMuted }]}>
            <Animated.View style={[styles.inputTextLayer, { opacity: textStageOpacity }]}>
              <TextInput
                value={inputValue}
                onChangeText={handleInputChange}
                placeholder={inputPlaceholder}
                placeholderTextColor={colors.faintText}
                keyboardType={keyboardType}
                autoCapitalize="none"
                maxLength={inputMaxLength}
                style={[styles.input, { color: colors.text }, codeStage ? styles.inputWithCountdown : null]}
              />
            </Animated.View>
            {codeStage ? (
              countdown > 0 ? (
                <Text style={[styles.countdownText, { color: colors.faintText }]}>{countdown}s</Text>
              ) : (
                <Pressable style={styles.resendHitArea} onPress={resendCode}>
                  <Text style={styles.resendText}>{t('bind.resend')}</Text>
                </Pressable>
              )
            ) : null}
          </View>
        </View>

        <Animated.View style={[styles.codeButton, { backgroundColor: buttonBackgroundColor }]}>
          <Pressable style={styles.codeButtonHitArea} onPress={handlePrimaryAction}>
            <Animated.Text style={[styles.codeButtonText, { color: colors.inverseText, opacity: textStageOpacity }]}>{buttonText}</Animated.Text>
          </Pressable>
        </Animated.View>

        {codeStage ? (
          <View style={styles.sentInfoBlock}>
            <Text style={styles.sentInfoText}>{t('bind.sentTo')} {maskedEmail}</Text>
            <Pressable onPress={changeEmail} hitSlop={8}>
              <Text style={[styles.changeEmailText, { color: colors.mutedText }]}>{t('bind.changeEmail')}</Text>
            </Pressable>
          </View>
        ) : null}

        {message ? <Text style={[styles.message, bound ? styles.successMessage : null]}>{message}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  content: { flex: 1, paddingTop: 168, paddingHorizontal: 24, alignItems: 'stretch' },
  title: { color: '#000', fontSize: 30, fontWeight: '900', textAlign: 'left' },
  subtitle: { color: '#777', fontSize: 13, fontWeight: '800', marginTop: 8, textAlign: 'left' },
  inputBlock: { marginTop: 28, gap: 8 },
  inputLabel: { color: '#111', fontSize: 12, fontWeight: '900' },
  inputFrame: { position: 'relative', height: 54, borderRadius: 16, backgroundColor: '#f4f4f4' },
  inputTextLayer: { flex: 1 },
  input: {
    height: 54,
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },
  inputWithCountdown: { paddingRight: 64 },
  countdownText: { position: 'absolute', right: 16, top: 17, color: '#777', fontSize: 13, fontWeight: '900' },
  resendHitArea: { position: 'absolute', right: 8, top: 7, height: 40, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  resendText: { color: '#1f7a3f', fontSize: 13, fontWeight: '900' },
  codeButton: {
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 32,
  },
  codeButtonHitArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  sentInfoBlock: { alignItems: 'center', gap: 7, marginTop: 13 },
  sentInfoText: { color: '#1f7a3f', fontSize: 12, fontWeight: '900' },
  changeEmailText: { color: '#555', fontSize: 12, fontWeight: '900', textDecorationLine: 'underline' },
  message: { color: '#c23a2b', fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 12 },
  successMessage: { color: '#1f7a3f' },
});
