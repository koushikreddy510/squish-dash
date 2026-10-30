import { StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { Colors } from '@/constants/theme';

type Props = {
  tray: readonly string[];
  /** The tray spells a word right now. */
  valid: boolean;
  onBank: () => void;
  onClear: () => void;
};

/** Collected letters, with buttons to bank a finished word or start over. */
export function TrayBar({ tray, valid, onBank, onClear }: Props) {
  return (
    <View style={styles.wrap}>
      <View
        style={[styles.tray, valid && styles.trayValid]}
        accessibilityLabel={tray.length ? `Tray: ${tray.join('')}` : 'Tray is empty'}>
        <Text style={[styles.letters, valid && { color: Colors.good }]}>{tray.join('')}</Text>
      </View>
      <PillButton compact primary={valid} label="Bank" onPress={onBank} />
      <PillButton compact label="Clear" onPress={onClear} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tray: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.heartOff,
  },
  trayValid: { borderColor: Colors.good },
  letters: { color: Colors.text, fontSize: 24, fontWeight: '500', letterSpacing: 3 },
});
