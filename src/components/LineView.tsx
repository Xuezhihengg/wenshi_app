import { StyleSheet, Text, View } from 'react-native';
import { HexagramLine } from '../domain/types';

export function LineView({ line }: { line: HexagramLine }) {
  const broken = line.yinYang === 'yin';
  return (
    <View style={styles.row}>
      <Text style={styles.meta}>{line.index + 1}</Text>
      <View style={styles.lineWrap}>
        {broken ? <View style={[styles.line, styles.splitLine]} /> : <View style={styles.line} />}
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{line.label}</Text>
        <Text style={styles.sub}>{line.sixSpirit} / {line.sixKin} / {line.role === 'world' ? '世' : line.role === 'response' ? '应' : '用'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meta: {
    width: 18,
    color: '#909090',
    fontSize: 12,
  },
  lineWrap: {
    flex: 1,
  },
  line: {
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
  },
  splitLine: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  info: {
    width: 150,
  },
  label: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  sub: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
});
