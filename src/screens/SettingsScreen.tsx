import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppMoreMenu } from '../components/AppMoreMenu';
import { LineIcon, LineIconName } from '../components/LineIcon';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/AppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SETTINGS: Array<{ icon: LineIconName; label: string; value: string }> = [
  { icon: 'bell', label: '通知设置', value: '关闭' },
  { icon: 'moon', label: '深色模式', value: '跟随系统' },
  { icon: 'language', label: '语言设置', value: '简体中文' },
  { icon: 'info', label: '关于问事', value: 'v1.0' },
];

export function SettingsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topLayer} pointerEvents="box-none">
        <Pressable style={[styles.backButton, { backgroundColor: colors.control }]} onPress={() => navigation.goBack()}>
          {Platform.OS === 'android' ? <LineIcon name="chevronLeft" size={25} color={colors.text} /> : <Text style={[styles.backButtonText, { color: colors.text }]}>‹</Text>}
        </Pressable>
        <AppMoreMenu navigation={navigation} currentScreen="Settings" />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>应用设置</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {SETTINGS.map((item, index) => (
            <View key={item.label}>
              <Pressable style={styles.row}>
                <View style={styles.icon}>
                  <LineIcon name={item.icon} size={21} />
                </View>
                <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.value, { color: colors.faintText }]}>{item.value}</Text>
                <Text style={[styles.arrow, { color: colors.faintText }]}>›</Text>
              </Pressable>
              {index < SETTINGS.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.divider }]} /> : null}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f3f3' },
  topLayer: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 40 },
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
    elevation: 4,
  },
  backButtonText: { color: '#111', fontSize: 34, fontWeight: '500', lineHeight: 38, marginTop: -2, ...Platform.select({ android: { lineHeight: 40, marginTop: 0, includeFontPadding: false, textAlignVertical: 'center' } }) },
  content: { flex: 1, paddingTop: 118, paddingHorizontal: 18, gap: 16 },
  title: { color: '#000', fontSize: 28, fontWeight: '900' },
  card: { ...CARD_SHADOW, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden' },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  icon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: '#111', fontSize: 15, fontWeight: '900' },
  value: { color: '#777', fontSize: 12, fontWeight: '800' },
  arrow: { color: '#777', fontSize: 24, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#ededed', marginLeft: 52 },
});
