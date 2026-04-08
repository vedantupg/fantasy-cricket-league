/**
 * Triggers a haptic vibration on supported devices (Android PWA).
 * iOS does not support the Vibration API — this is a no-op on unsupported platforms.
 *
 * @param pattern - Duration in ms or an array of [vibrate, pause, vibrate, ...] ms values
 */
export const vibrate = (pattern: number | number[] = 8): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};
