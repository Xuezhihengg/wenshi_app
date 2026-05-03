import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/AppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'AIReading'>;

export function AIReadingScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const { record } = route.params;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>AI 解卦</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{record.hexagram.name}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aiText, { color: colors.text }]}>{record.aiReading}</Text>
        </View>
        <Pressable style={[styles.button, { backgroundColor: colors.inverse }]} onPress={() => navigation.navigate('Save', { record })}>
          <Text style={[styles.buttonText, { color: colors.inverseText }]}>保存本次起卦</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 16 },
  title: { color: '#000', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#555', fontSize: 13 },
  card: { borderWidth: 1, borderColor: '#000', backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  aiText: { color: '#111', fontSize: 14, lineHeight: 22 },
  button: { height: 50, borderRadius: 6, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
