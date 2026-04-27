import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;

export function QuestionScreen({ navigation }: Props) {
  const [question, setQuestion] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>您好，今天想问什么</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="请输入所问之事"
          placeholderTextColor="#8a8a8a"
          style={styles.input}
          multiline
        />
        <Pressable
          style={[styles.button, !question.trim() && styles.buttonDisabled]}
          disabled={!question.trim()}
          onPress={() => navigation.navigate('Cast', { question: question.trim() })}
        >
          <Text style={styles.buttonText}>开始起卦</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20, justifyContent: 'center', gap: 18 },
  title: { color: '#000', fontSize: 30, fontWeight: '800', lineHeight: 40 },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#000',
    color: '#000',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    fontSize: 16,
  },
  button: {
    height: 52,
    borderRadius: 6,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
