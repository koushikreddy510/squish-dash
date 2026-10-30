import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  /** Shrinks to fit its label, for rows of buttons. */
  compact?: boolean;
};

export function PillButton({ label, onPress, primary, disabled, compact }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        compact && styles.compact,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.label, primary && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: 220, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999, alignItems: 'center' },
  compact: { minWidth: 0, paddingVertical: 12, paddingHorizontal: 18 },
  primary: { backgroundColor: Colors.blob },
  secondary: { borderWidth: 1, borderColor: Colors.muted },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  label: { color: Colors.text, fontSize: 16, fontWeight: '500' },
  primaryLabel: { color: Colors.blobDark },
});
