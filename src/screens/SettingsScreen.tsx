import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>设置</Text>
        <Text style={styles.subtitle}>这里后续可配置起卦偏好、AI 解卦接口与本地数据选项。</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20, gap: 12 },
  title: { color: '#000', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#555', fontSize: 13, lineHeight: 20 },
});
