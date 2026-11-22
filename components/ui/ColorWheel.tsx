import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/** HSV (h 0–360, s 0–1, v 0–1) → #RRGGBB. */
export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(f(5))}${hex(f(3))}${hex(f(1))}`.toUpperCase();
}

/** #RRGGBB → HSV. */
export function hexToHsv(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}

const SEGMENTS = 72;

interface ColorWheelProps {
  value: string;
  /** Called continuously while dragging. */
  onChange: (hex: string) => void;
  size?: number;
}

/**
 * A round colour picker: around the wheel is the hue, from the centre out the saturation; the bar
 * under it is the brightness. Drag a finger over either.
 */
export function ColorWheel({ value, onChange, size = 240 }: ColorWheelProps) {
  const theme = useTheme();
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value));
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const r = size / 2;

  const update = (next: [number, number, number]) => {
    setHsv(next);
    onChange(hsvToHex(...next));
  };

  // Hue around the circle as many thin wedges (SVG has no conic gradient).
  const wedges = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => {
        const a0 = ((i - 0.6) / SEGMENTS) * 2 * Math.PI;
        const a1 = ((i + 0.6) / SEGMENTS) * 2 * Math.PI;
        const p = (a: number) => `${r + r * Math.cos(a)} ${r + r * Math.sin(a)}`;
        return <Path key={i} d={`M${r} ${r} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`} fill={hsvToHex((i / SEGMENTS) * 360, 1, 1)} />;
      }),
    [r]
  );

  const wheelPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r]
  );
  function pick(x: number, y: number) {
    const dx = x - r;
    const dy = y - r;
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const s = Math.min(1, Math.sqrt(dx * dx + dy * dy) / r);
    update([h, s, hsvRef.current[2] || 1]);
  }

  const [barWidth, setBarWidth] = useState(size);
  const barPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => pickV(e.nativeEvent.locationX),
        onPanResponderMove: (e) => pickV(e.nativeEvent.locationX),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [barWidth]
  );
  function pickV(x: number) {
    const v = Math.max(0.05, Math.min(1, x / barWidth));
    update([hsvRef.current[0], hsvRef.current[1], v]);
  }

  const [h, s, v] = hsv;
  const angle = (h * Math.PI) / 180;
  const knobX = r + Math.cos(angle) * s * r;
  const knobY = r + Math.sin(angle) * s * r;
  const full = hsvToHex(h, s, 1);

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }} {...wheelPan.panHandlers}>
        <Svg width={size} height={size} pointerEvents="none">
          <Defs>
            <RadialGradient id="sat" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {wedges}
          <Circle cx={r} cy={r} r={r} fill="url(#sat)" />
          {/* Brightness darkens the whole wheel, so what you see is what you pick. */}
          <Circle cx={r} cy={r} r={r} fill="#000000" opacity={1 - v} />
          <Circle cx={knobX} cy={knobY} r={13} fill={hsvToHex(h, s, v)} stroke="#FFFFFF" strokeWidth={3} />
        </Svg>
      </View>
      <View style={[styles.bar, { width: size }]} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)} {...barPan.panHandlers}>
        <Svg width="100%" height={28} pointerEvents="none">
          <Defs>
            <LinearGradient id="val" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#000000" />
              <Stop offset="1" stopColor={full} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={28} rx={14} fill="url(#val)" />
          <Circle cx={Math.max(14, Math.min(barWidth - 14, v * barWidth))} cy={14} r={11} fill={hsvToHex(h, s, v)} stroke={theme.dark ? '#FFFFFF' : '#000000'} strokeWidth={2.5} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 16 },
  bar: { height: 28 },
});
