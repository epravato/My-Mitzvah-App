import { Platform } from 'react-native';

// Shared colors and spacing so every screen looks consistent.
//
// Style direction is MyFitnessPal, light and clean and data forward, with a blue
// that carries the Jewish side of it. That blue is tekhelet, the biblical dye used
// in tzitzit, so it reads as Jewish without leaning on anything kitschy.

export const colors = {
  background: '#F4F6FA',
  card: '#FFFFFF',
  cardMuted: '#EEF2F8',
  border: '#DFE5EE',

  // Tekhelet blue, the primary action color
  blue: '#1157B8',
  blueDark: '#0A3F8A',
  blueSoft: '#E3EDFB',

  // Warm accent for streaks and milestones
  gold: '#D99B2E',
  goldSoft: '#FBF0DC',

  text: '#141B27',
  textMuted: '#6B7789',
  textFaint: '#9AA5B4',

  success: '#1E9E62',
  successSoft: '#E2F4EC',
};

export const spacing = {
  small: 8,
  medium: 16,
  large: 24,
};

export const radius = {
  small: 8,
  medium: 14,
  large: 22,
};

// The browser draws its own focus ring on text inputs, and it clashes with the
// palette. Screens turn this off and show a blue border instead, so focus is still
// obvious but matches the app.
export const webInputReset =
  Platform.OS === 'web' ? { outlineStyle: 'none' } : {};

// One shadow used everywhere, so cards feel like they belong to the same app.
// Web wants boxShadow, native wants the shadow* props, so each platform gets its own.
export const cardShadow =
  Platform.OS === 'web'
    ? { boxShadow: '0 3px 10px rgba(27, 42, 65, 0.07)' }
    : {
        shadowColor: '#1B2A41',
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      };

// The stronger shadow under the raised center button in the tab bar.
export const buttonShadow =
  Platform.OS === 'web'
    ? { boxShadow: '0 3px 8px rgba(10, 63, 138, 0.35)' }
    : {
        shadowColor: '#0A3F8A',
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
      };
