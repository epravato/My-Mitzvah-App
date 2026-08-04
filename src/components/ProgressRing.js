// The big circular progress ring on the Today screen, the same idea as the calorie
// ring in MyFitnessPal. Here it tracks how far you are through the 40 day challenge.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

export default function ProgressRing({
  size = 180,
  strokeWidth = 14,
  progress = 0,
  centerValue,
  centerLabel,
  centerCaption,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.blue}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.value}>{centerValue}</Text>
        <Text style={styles.label}>{centerLabel}</Text>
        {centerCaption ? <Text style={styles.caption}>{centerCaption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 48,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  caption: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 4,
  },
});
