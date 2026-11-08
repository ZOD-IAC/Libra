import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from './theme';
export function ProgressRing({
  percent,
  size = 100,
  inverse = false,
}: {
  percent: number;
  size?: number;
  inverse?: boolean;
}) {
  const t = useTheme(),
    radius = (size - 12) / 2,
    circumference = 2 * Math.PI * radius;
  return (
    <View
      accessible
      accessibilityLabel={`${percent} percent complete`}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={inverse ? '#4D745D' : t.line}
          strokeWidth={7}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={inverse ? '#DFE9B4' : t.primary}
          strokeWidth={7}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - percent / 100)}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>
      <Text
        style={{ fontSize: size * 0.24, fontWeight: '500', color: inverse ? '#FFFDEF' : t.ink }}
      >
        {percent}%
      </Text>
    </View>
  );
}
