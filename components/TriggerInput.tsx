import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trigger } from '@/lib/trigger-types';
import { colors, typography, spacing, borderRadius } from '@/lib/design-system';

interface TriggerInputProps {
  trigger: Trigger;
  value: number | null;
  onValueChange: (value: number | null, valueText?: string | null) => void;
}

export function TriggerInput({ trigger, value, onValueChange }: TriggerInputProps) {
  if (trigger.input_type === 'binary') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{trigger.label}</Text>
        <View style={styles.binaryRow}>
          <TouchableOpacity
            style={[styles.binaryButton, value === 0 && styles.binaryButtonActive]}
            onPress={() => onValueChange(0, 'No')}
          >
            <Text style={[styles.binaryText, value === 0 && styles.binaryTextActive]}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.binaryButton, value === 1 && styles.binaryButtonActive]}
            onPress={() => onValueChange(1, 'Yes')}
          >
            <Text style={[styles.binaryText, value === 1 && styles.binaryTextActive]}>Yes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (trigger.input_type === 'scale') {
    const options = trigger.options_json as any;
    const min = options?.min ?? 0;
    const max = options?.max ?? 5;
    const labels = options?.labels ?? {};

    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{trigger.label}</Text>
          {value !== null && (
            <Text style={styles.scaleValue}>{value}</Text>
          )}
        </View>
        <View style={styles.scaleRow}>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.scaleButton,
                value === num && styles.scaleButtonActive,
              ]}
              onPress={() => onValueChange(num)}
            >
              <Text
                style={[
                  styles.scaleButtonText,
                  value === num && styles.scaleButtonTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {Object.keys(labels).length > 0 && (
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleLabel}>{labels[String(min)] || ''}</Text>
            <Text style={styles.scaleLabel}>{labels[String(max)] || ''}</Text>
          </View>
        )}
      </View>
    );
  }

  if (trigger.input_type === 'enum') {
    const options = (trigger.options_json as any)?.options ?? [];

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{trigger.label}</Text>
        <View style={styles.enumContainer}>
          {options.map((option: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.enumButton,
                value === index && styles.enumButtonActive,
              ]}
              onPress={() => onValueChange(index, option)}
            >
              <Text
                style={[
                  styles.enumButtonText,
                  value === index && styles.enumButtonTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scaleValue: {
    ...typography.title3,
    color: colors.accent.purple,
  },
  binaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  binaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
  },
  binaryButtonActive: {
    backgroundColor: colors.accent.purple,
  },
  binaryText: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  binaryTextActive: {
    color: colors.neutral.white,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  scaleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  scaleButtonActive: {
    backgroundColor: colors.accent.purple,
  },
  scaleButtonText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.neutral.gray900,
  },
  scaleButtonTextActive: {
    color: colors.neutral.white,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    ...typography.caption,
    color: colors.neutral.gray600,
    fontSize: 11,
  },
  enumContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  enumButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.gray100,
    minHeight: 40,
    justifyContent: 'center',
    flex: 1,
    minWidth: '45%',
  },
  enumButtonActive: {
    backgroundColor: colors.accent.purple,
  },
  enumButtonText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.neutral.gray900,
    textAlign: 'center',
  },
  enumButtonTextActive: {
    color: colors.neutral.white,
  },
});
