import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "react-native-paper";
import Svg, { Circle, Line, Path } from "react-native-svg";

function buildSmoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) {
    return "";
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function TrendLineChart({ labels, first, second, third, firstColor, secondColor, thirdColor }: { labels: string[]; first: number[]; second: number[]; third?: number[]; firstColor: string; secondColor: string; thirdColor?: string }) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const width = Math.min(containerWidth, 520);
  const height = 160;
  const padding = 12;
  const axisBand = 24;
  const plotBottom = height - axisBand;
  const plotHeight = plotBottom - padding;
  const values = [...first, ...second, ...(third ?? [])];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const valueRange = Math.max(max - min, 1);
  const gridLineCount = 3;

  const toPoints = (series: number[]) =>
    series.map((value, index) => ({
      x: padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2),
      y: plotBottom - ((value - min) / valueRange) * plotHeight,
    }));

  const firstPoints = toPoints(first);
  const secondPoints = toPoints(second);
  const thirdPoints = third ? toPoints(third) : [];
  const [selection, setSelection] = useState<{ index: number; series: "in" | "out" } | null>(null);
  const selectedPoint = selection ? (selection.series === "in" ? firstPoints[selection.index] : secondPoints[selection.index]) : null;

  useFocusEffect(useCallback(() => () => setSelection(null), []));

  return (
    <View style={styles.chartWrap} onLayout={({ nativeEvent }) => setContainerWidth(Math.round(nativeEvent.layout.width))}>
      <View style={[styles.svgWrap, { width }]}>
      {width > 0 ? <Svg width={width} height={height}>
        {Array.from({ length: gridLineCount }).map((_, index) => {
          const y = padding + (index / (gridLineCount - 1)) * plotHeight;
          return <Line key={index} x1={padding} x2={width - padding} y1={y} y2={y} stroke={theme.colors.outline} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />;
        })}
        {thirdPoints.length ? <Path d={buildSmoothPath(thirdPoints)} fill="none" stroke={thirdColor} strokeWidth={2} strokeDasharray="5 5" /> : null}
        <Path d={buildSmoothPath(firstPoints)} fill="none" stroke={firstColor} strokeWidth={3} strokeLinecap="round" />
        <Path d={buildSmoothPath(secondPoints)} fill="none" stroke={secondColor} strokeWidth={3} strokeLinecap="round" />
        {firstPoints.map((point, index) => <Circle key={`first-${index}`} cx={point.x} cy={point.y} r={5} fill={firstColor} />)}
        {secondPoints.map((point, index) => <Circle key={`second-${index}`} cx={point.x} cy={point.y} r={5} fill={secondColor} />)}
        {thirdPoints.map((point, index) => <Circle key={`third-${index}`} cx={point.x} cy={point.y} r={3} fill={thirdColor} />)}
      </Svg> : null}
      {firstPoints.map((point, index) => <Pressable key={`first-hit-${index}`} onPress={() => setSelection((current) => current?.index === index && current.series === "in" ? null : { index, series: "in" })} style={[styles.pointHit, { left: point.x - 10, top: point.y - 10 }]} />)}
      {secondPoints.map((point, index) => <Pressable key={`second-hit-${index}`} onPress={() => setSelection((current) => current?.index === index && current.series === "out" ? null : { index, series: "out" })} style={[styles.pointHit, { left: point.x - 10, top: point.y - 10 }]} />)}
      {selectedPoint && selection ? <View style={[styles.tooltip, { left: Math.max(8, Math.min(selectedPoint.x - 42, width - 96)), top: Math.max(6, selectedPoint.y - 78) }]}><Text style={styles.tooltipDay}>{labels[selection.index]}</Text><Text style={[styles.tooltipLine, { color: selection.series === "in" ? firstColor : secondColor }]}>{selection.series === "in" ? "Stock In" : "Stock Out"}: {selection.series === "in" ? first[selection.index] : second[selection.index]}</Text></View> : null}
      </View>
      <View style={[styles.chartLabels, { width }]}>{labels.map((label) => <Text key={label} style={[styles.dayLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>)}</View>
    </View>
  );
}

export function TrendLegend({ firstColor, secondColor, firstLabel = "Stock In", secondLabel = "Stock Out", thirdColor, thirdLabel }: { firstColor: string; secondColor: string; firstLabel?: string; secondLabel?: string; thirdColor?: string; thirdLabel?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: firstColor }]} /><Text style={{ color: theme.colors.onSurfaceVariant }}>{firstLabel}</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: secondColor }]} /><Text style={{ color: theme.colors.onSurfaceVariant }}>{secondLabel}</Text></View>
      {thirdColor && thirdLabel ? <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: thirdColor }]} /><Text style={{ color: theme.colors.onSurfaceVariant }}>{thirdLabel}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: { width: "100%", alignItems: "center", marginTop: 8 },
  svgWrap: { position: "relative" },
  pointHit: { position: "absolute", width: 20, height: 20 },
  tooltip: { position: "absolute", minWidth: 86, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: "#ffffff", shadowColor: "#19324a", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  tooltipDay: { color: "#19324a", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  tooltipLine: { fontSize: 11, lineHeight: 17 },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, marginTop: 6, minHeight: 18 },
  dayLabel: { fontSize: 10, textAlign: "center" },
  legendRow: { flexDirection: "row", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
});
