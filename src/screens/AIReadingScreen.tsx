import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AIReading'>;

export function AIReadingScreen({ navigation, route }: Props) {
  const { record } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI 解卦</Text>
        <Text style={styles.subtitle}>{record.hexagram.name}</Text>
        <View style={styles.card}>
          <Text style={styles.aiText}>{record.aiReading}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Save', { record })}>
          <Text style={styles.buttonText}>保存本次起卦</Text>
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
