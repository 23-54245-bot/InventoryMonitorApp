/**
 * IsometricLogoSplash
 *
 * High-end 3D isometric logo animation for the StockTrack opening screen.
 * Rendered entirely with react-native-svg + react-native-reanimated.
 *
 * Timeline (3 s total):
 *   0.00 – 0.55s  Top face drops in from above            (expo-out, 550 ms)
 *   0.15 – 0.70s  Left face slides in from bottom-left    (expo-out, 550 ms)
 *   0.30 – 0.85s  Right face slides in from bottom-right  (expo-out, 550 ms)
 *   0.78 – 1.04s  Cube micro-spring (scale 1→1.06→1.0)
 *   0.95 – 1.35s  Shine sweep glides across top face
 *   1.10 – 1.52s  "StockTrack" text clips up from below   (expo-out, 420 ms)
 *   1.42 – 1.80s  Tagline fades in
 *   1.80 – 3.00s  Hold
 */

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  ClipPath,
  Defs,
  LinearGradient,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";

// ─── Isometric cube geometry ─────────────────────────────────────────────────
// 160×160 SVG viewport.  Cube sits centred at (80, 86).
const CX = 80;
const CY = 86;
const W  = 54;   // horizontal half-width of a face
const H  = 30;   // half-height step between rows
const D  = 22;   // vertical depth of side faces

const TOP: string =
  `${CX},${CY - D}  ${CX + W},${CY - D + H}  ${CX},${CY - D + 2 * H}  ${CX - W},${CY - D + H}`;
const LEFT: string =
  `${CX - W},${CY - D + H}  ${CX},${CY - D + 2 * H}  ${CX},${CY - D + 2 * H + D}  ${CX - W},${CY - D + H + D}`;
const RIGHT: string =
  `${CX},${CY - D + 2 * H}  ${CX + W},${CY - D + H}  ${CX + W},${CY - D + H + D}  ${CX},${CY - D + 2 * H + D}`;

// Easing
const EXPO = Easing.out(Easing.exp);
const BACK = Easing.out(Easing.back(1.5));

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  backgroundColor?: string;
  primaryColor?: string;
}

export function IsometricLogoSplash({
  backgroundColor = "#F4F4F5",
  primaryColor = "#2563EB",
}: Props) {

  // Top face
  const topTY   = useSharedValue(-70);
  const topOp   = useSharedValue(0);

  // Left face
  const leftTX  = useSharedValue(-48);
  const leftTY  = useSharedValue(38);
  const leftOp  = useSharedValue(0);

  // Right face
  const rightTX = useSharedValue(48);
  const rightTY = useSharedValue(38);
  const rightOp = useSharedValue(0);

  // Cube container
  const cubeScale = useSharedValue(0.84);

  // Shine
  const shineTX = useSharedValue(-90);
  const shineOp = useSharedValue(0);

  // Wordmark
  const wordTY  = useSharedValue(50);
  const wordOp  = useSharedValue(0);

  // Tagline
  const tagOp   = useSharedValue(0);

  // Wrapper
  const wrapOp  = useSharedValue(0);

  useEffect(() => {
    // Fade in container
    wrapOp.value = withTiming(1, { duration: 180, easing: EXPO });

    // ── Top face drops in from above ──
    topOp.value = withDelay(0,   withTiming(1, { duration: 280, easing: EXPO }));
    topTY.value = withDelay(0,   withTiming(0, { duration: 550, easing: EXPO }));

    // ── Left face slides from bottom-left ──
    leftOp.value = withDelay(150, withTiming(1, { duration: 280, easing: EXPO }));
    leftTX.value  = withDelay(150, withTiming(0, { duration: 550, easing: EXPO }));
    leftTY.value  = withDelay(150, withTiming(0, { duration: 550, easing: EXPO }));

    // ── Right face slides from bottom-right ──
    rightOp.value = withDelay(300, withTiming(1, { duration: 280, easing: EXPO }));
    rightTX.value  = withDelay(300, withTiming(0, { duration: 550, easing: EXPO }));
    rightTY.value  = withDelay(300, withTiming(0, { duration: 550, easing: EXPO }));

    // ── Cube micro-spring pop after faces land ──
    cubeScale.value = withDelay(780,
      withSequence(
        withTiming(1.07, { duration: 130, easing: EXPO }),
        withTiming(1.0,  { duration: 230, easing: BACK }),
      )
    );

    // ── Shine sweep across top face ──
    shineOp.value = withDelay(960,
      withSequence(
        withTiming(0.6,  { duration: 100, easing: EXPO }),
        withTiming(0.6,  { duration: 280 }),
        withTiming(0,    { duration: 130, easing: EXPO }),
      )
    );
    shineTX.value = withDelay(960, withTiming(90, { duration: 400, easing: EXPO }));

    // ── Wordmark clips up ──
    wordOp.value = withDelay(1100, withTiming(1, { duration: 300, easing: EXPO }));
    wordTY.value  = withDelay(1100, withTiming(0, { duration: 420, easing: EXPO }));

    // ── Tagline fades in ──
    tagOp.value = withDelay(1420, withTiming(1, { duration: 380, easing: EXPO }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animated styles
  const wrapStyle  = useAnimatedStyle(() => ({ opacity: wrapOp.value }));
  const cubeStyle  = useAnimatedStyle(() => ({ transform: [{ scale: cubeScale.value }] }));

  const topStyle   = useAnimatedStyle(() => ({
    opacity: topOp.value,
    transform: [{ translateY: topTY.value }],
  }));
  const leftStyle  = useAnimatedStyle(() => ({
    opacity: leftOp.value,
    transform: [{ translateX: leftTX.value }, { translateY: leftTY.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: rightOp.value,
    transform: [{ translateX: rightTX.value }, { translateY: rightTY.value }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shineOp.value,
    transform: [{ translateX: shineTX.value }],
  }));
  const wordStyle  = useAnimatedStyle(() => ({
    opacity: wordOp.value,
    transform: [{ translateY: wordTY.value }],
  }));
  const tagStyle   = useAnimatedStyle(() => ({ opacity: tagOp.value }));

  return (
    <Animated.View style={[styles.root, { backgroundColor }, wrapStyle]}>

      {/* ── 3D Isometric Cube ───────────────────────────── */}
      <Animated.View style={[styles.cubeWrap, cubeStyle]}>
        <Svg width={160} height={160} viewBox="0 0 160 160">
          <Defs>
            <LinearGradient id="gTop" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={primaryColor} stopOpacity="1" />
              <Stop offset="1" stopColor={primaryColor} stopOpacity="0.84" />
            </LinearGradient>
            <LinearGradient id="gLeft" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={primaryColor} stopOpacity="0.52" />
              <Stop offset="1" stopColor={primaryColor} stopOpacity="0.42" />
            </LinearGradient>
            <LinearGradient id="gRight" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={primaryColor} stopOpacity="0.70" />
              <Stop offset="1" stopColor={primaryColor} stopOpacity="0.58" />
            </LinearGradient>
            <LinearGradient id="gShine" x1="0" y1="0" x2="1" y2="0.6">
              <Stop offset="0"    stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="1"    stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
            <ClipPath id="clipTop">
              <Polygon points={TOP} />
            </ClipPath>
          </Defs>

          {/* Right face (drawn first = bottom layer) */}
          <Animated.View style={[StyleSheet.absoluteFill, rightStyle]}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Polygon points={RIGHT} fill="url(#gRight)" />
            </Svg>
          </Animated.View>

          {/* Left face */}
          <Animated.View style={[StyleSheet.absoluteFill, leftStyle]}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Polygon points={LEFT} fill="url(#gLeft)" />
            </Svg>
          </Animated.View>

          {/* Top face */}
          <Animated.View style={[StyleSheet.absoluteFill, topStyle]}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Polygon points={TOP} fill="url(#gTop)" />
            </Svg>
          </Animated.View>

          {/* Shine overlay — clipped to top face */}
          <Animated.View style={[StyleSheet.absoluteFill, shineStyle]}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Rect
                x={CX - 100}
                y={CY - D - 8}
                width={52}
                height={(H * 2) + 16}
                fill="url(#gShine)"
                clipPath="url(#clipTop)"
              />
            </Svg>
          </Animated.View>
        </Svg>
      </Animated.View>

      {/* ── Wordmark — clipped upward reveal ─────────────── */}
      <View style={styles.wordClip}>
        <Animated.Text style={[styles.wordmark, { color: primaryColor }, wordStyle]}>
          StockTrack
        </Animated.Text>
      </View>

      {/* ── Tagline ─────────────────────────────────────── */}
      <Animated.Text style={[styles.tagline, tagStyle]}>
        Inventory · Sales · Insights
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cubeWrap: {
    width: 160,
    height: 160,
    marginBottom: 2,
  },
  wordClip: {
    overflow: "hidden",
    height: 50,
    justifyContent: "flex-end",
  },
  wordmark: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 7,
    fontSize: 11.5,
    fontWeight: "500",
    letterSpacing: 1.0,
    color: "#9CA3AF",
  },
});
