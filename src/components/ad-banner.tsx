import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { adUnits, useAds } from '@/lib/ads';

/** The menu banner. It waits for consent and SDK start, and never appears during play. */
export function AdBanner() {
  const ready = useAds((state) => state.ready);
  if (!ready) return null;

  return (
    <View accessibilityLabel="Advertisement" style={styles.container}>
      <BannerAd unitId={adUnits.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
});
