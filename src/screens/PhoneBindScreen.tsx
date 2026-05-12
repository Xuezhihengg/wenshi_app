import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Keyboard, PanResponder, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { bindAccount, sendBindCode } from '../api/client';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/AppTheme';
import { useAppLanguage } from '../i18n/AppLanguage';

type Props = NativeStackScreenProps<RootStackParamList, 'PhoneBind'>;

export function PhoneBindScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  const edgeSwipeActive = useRef(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');
  const [bound, setBound] = useState(false);
  const [codeStage, setCodeStage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textStageOpacity = useRef(new Animated.Value(1)).current;
  const buttonEnabledProgress = useRef(new Animated.Value(0)).current;
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
  const phoneValid = /^1\d{10}$/.test(phone.trim());
  const canSendCode = phoneValid && countdown === 0;
  const canBind = phoneValid && code.trim().length === 6;
  const inputLabel = codeStage ? t('bind.code') : t('bind.phone');
  const inputValue = codeStage ? code : phone;
  const inputPlaceholder = codeStage ? t('bind.codePlaceholder') : t('bind.phonePlaceholder');
  const keyboardType = codeStage ? 'number-pad' : 'phone-pad';
  const inputMaxLength = codeStage ? 6 : 11;
  const buttonDisabled = submitting || (codeStage ? !canBind : !canSendCode);
  const buttonText = codeStage ? (bound ? t('common.enabled') : t('common.confirm')) : t('bind.code');
  const maskedPhone = phone.trim().replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  const buttonBackgroundColor = buttonEnabledProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.faintText, colors.inverse],
  });

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

  const friendlyError = (error: unknown) => {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes('429')) return '验证码发送太频繁，请稍后再试。';
    if (raw.includes('409')) return '这个手机号已经被注册过了。';
    if (raw.includes('502')) return '短信服务暂时不可用，请稍后再试。';
    return '请求失败，请稍后再试。';
  };

  const sendCode = async () => {
    if (!canSendCode) {
      setMessage(phone.trim() ? '请输入正确的 11 位手机号。' : '请先输入手机号。');
      return;
    }
    setSubmitting(true);
    try {
      const response = await sendBindCode(phone.trim(), 'phone');
      const nextCountdown = Math.min(60, Math.max(1, response.expires_in_seconds || 60));
      textStageOpacity.stopAnimation();
      Animated.timing(textStageOpacity, {
        toValue: 0,
        duration: 130,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setMessage('');
        setCodeStage(true);
        setCode('');
        setBound(false);
        setCountdown(nextCountdown);
        Animated.timing(textStageOpacity, {
          toValue: 1,
          duration: 190,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const bindPhone = async () => {
    if (!canBind) {
      Alert.alert(t('bind.invalidCodeTitle'), t('bind.invalidCodeBody'));
      return;
    }
    setSubmitting(true);
    try {
      await bindAccount(phone.trim(), 'phone', code.trim());
      setBound(true);
      setMessage('');
      Keyboard.dismiss();
      Alert.alert(t('bind.phoneSuccessTitle'), t('bind.phoneSuccessBody'), [
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
      const response = await sendBindCode(phone.trim(), 'phone');
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

  const changePhone = () => {
    textStageOpacity.stopAnimation();
    Animated.timing(textStageOpacity, {
      toValue: 0,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setCodeStage(false);
      setCode('');
      setBound(false);
      setCountdown(0);
      setMessage('');
      Animated.timing(textStageOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  };

  const handlePrimaryAction = () => {
    if (codeStage) {
      bindPhone();
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
    setPhone(value);
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
        <Text style={[styles.title, { color: colors.text }]}>{t('bind.phoneTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.faintText }]}>{t('bind.phoneSubtitle')}</Text>

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
            <Text style={styles.sentInfoText}>{t('bind.sentTo')} {maskedPhone}</Text>
            <Pressable onPress={changePhone} hitSlop={8}>
              <Text style={[styles.changePhoneText, { color: colors.mutedText }]}>{t('bind.changePhone')}</Text>
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
  changePhoneText: { color: '#555', fontSize: 12, fontWeight: '900', textDecorationLine: 'underline' },
  message: { color: '#c23a2b', fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 12 },
  successMessage: { color: '#1f7a3f' },
});
