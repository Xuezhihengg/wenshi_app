import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/AppTheme';

type Props = PropsWithChildren<{ title: string; subtitle?: string }>;

export function Section({ title, subtitle, children }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    padding: 16,
    gap: 10,
  },
  title: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#555',
    fontSize: 12,
    lineHeight: 18,
  },
  body: {
    gap: 8,
  },
});
