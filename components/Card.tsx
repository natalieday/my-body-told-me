import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, shadows } from '@/lib/design-system';

interface CardProps {
  children: React.ReactNode;
  color?: string;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, color = colors.neutral.white, style, padding = 20 }: CardProps) {
  return (
    <View style={[styles.card, { backgroundColor: color, padding }, shadows.md, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
  },
});
