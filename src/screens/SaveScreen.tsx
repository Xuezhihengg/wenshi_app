import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FortuneRecord } from '../domain/types';
import { RootStackParamList } from '../navigation/types';
import { isPersistentStorageAvailable, listRecords, saveRecord } from '../storage/recordStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Save'>;

export function SaveScreen({ route, navigation }: Props) {
  const [records, setRecords] = useState<FortuneRecord[]>([]);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const incoming = route.params?.record;

  const refresh = async () => {
    const loaded = await listRecords();
    setRecords(loaded);
    setStorageAvailable(isPersistentStorageAvailable());
  };

  useEffect(() => {
    if (incoming) {
      saveRecord(incoming).then(refresh);
      navigation.setParams({ record: undefined });
    } else {
      refresh();
    }
  }, [incoming]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>保存记录</Text>
        {!storageAvailable ? <Text style={styles.warning}>当前设备暂不可用持久化存储，本次记录仅临时保留，应用关闭后可能丢失。</Text> : null}
        {records.map((record) => (
          <View key={record.id} style={styles.card}>
            <Text style={styles.cardTitle}>{record.hexagram.name}</Text>
            <Text style={styles.cardSub}>{record.question}</Text>
            <Text style={styles.cardMeta}>{new Date(record.createdAt).toLocaleString()}</Text>
          </View>
        ))}
        {!records.length ? <Text style={styles.empty}>暂无保存记录</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Question')}>
          <Text style={styles.buttonText}>返回问事页</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 96, gap: 12 },
  title: { color: '#000', fontSize: 28, fontWeight: '800' },
  card: { borderWidth: 1, borderColor: '#000', backgroundColor: '#fff', padding: 16, borderRadius: 8, gap: 6 },
  cardTitle: { color: '#000', fontSize: 16, fontWeight: '800' },
  cardSub: { color: '#333', fontSize: 13 },
  cardMeta: { color: '#777', fontSize: 11 },
  empty: { color: '#777', fontSize: 13 },
  warning: { color: '#8a5a00', backgroundColor: '#fff6dc', borderRadius: 8, padding: 10, fontSize: 12, lineHeight: 18 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  button: { height: 50, borderRadius: 6, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
