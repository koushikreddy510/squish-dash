import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { showPrivacyOptions, useAds } from '@/lib/ads';
import { useProgress } from '@/store/progress';

export default function SettingsScreen() {
  const router = useRouter();
  const haptics = useProgress((s) => s.haptics);
  const setHaptics = useProgress((s) => s.setHaptics);
  const analyticsEnabled = useProgress((s) => s.analyticsEnabled);
  const setAnalyticsEnabled = useProgress((s) => s.setAnalyticsEnabled);
  const privacyOptionsRequired = useAds((s) => s.privacyOptionsRequired);

  return (
    <SafeAreaView style={styles.root}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.group}>
        <View style={styles.row}>
          <Text style={styles.label}>Haptics</Text>
          <Switch value={haptics} onValueChange={setHaptics} accessibilityLabel="Haptics" />
        </View>
        {privacyOptionsRequired ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              showPrivacyOptions().catch(() => {});
            }}
            style={[styles.row, styles.rowTop]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Privacy settings</Text>
              <Text style={styles.hint}>Review or change your ad consent</Text>
            </View>
          </Pressable>
        ) : null}
        <View style={[styles.row, styles.rowTop]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Usage & crash data</Text>
            <Text style={styles.hint}>Anonymous, helps us fix problems</Text>
          </View>
          <Switch value={analyticsEnabled} onValueChange={setAnalyticsEnabled} accessibilityLabel="Usage and crash data" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg, padding: 20 },
  back: { paddingBottom: 12 },
  backLabel: { color: Colors.muted, fontSize: 14 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '500', marginBottom: 16 },
  group: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardEdge },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowTop: { borderTopWidth: 1, borderTopColor: Colors.cardEdge },
  label: { color: Colors.text, fontSize: 16 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 2 },
});
