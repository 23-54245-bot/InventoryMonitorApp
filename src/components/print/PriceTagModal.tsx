import * as Print from "expo-print";
import { useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Menu, Surface, Text, useTheme } from "react-native-paper";
import { SvgXml } from "react-native-svg";

import type { Product } from "../../data/freshmart";
import { showAlert } from "../../lib/alert";
import { createCode128BarcodeSvg, createPriceLabelHtml, priceLabelSizes, type PriceLabelSize } from "../../lib/barcode";
import { translate } from "../../lib/i18n";

export function PriceTagModal({ product, visible, language, onDismiss }: { product: Product | null; visible: boolean; language: string; onDismiss: () => void }) {
	const theme = useTheme();
	const [size, setSize] = useState<PriceLabelSize>("standard");
	const [sizeMenuVisible, setSizeMenuVisible] = useState(false);
	const [printing, setPrinting] = useState(false);
	const barcodeSvg = (() => {
		if (!product?.sku.trim()) return "";
		try {
			return createCode128BarcodeSvg(product.sku);
		} catch {
			return "";
		}
	})();
	const selectedSize = priceLabelSizes[size];

	const printLabel = async () => {
		if (!product || !barcodeSvg) {
			showAlert("Barcode Error", "This SKU cannot be encoded as a Code 128 barcode. Use letters, numbers, and basic punctuation.");
			return;
		}

		setPrinting(true);
		try {
			const html = createPriceLabelHtml(product, barcodeSvg, size);
			if (Platform.OS === "web") {
				await Print.printToFileAsync({ html });
			} else {
				await Print.printAsync({ html });
			}
		} catch (error) {
			showAlert("Print Error", error instanceof Error ? error.message : "Could not open the print dialog.");
		} finally {
			setPrinting(false);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
			<View style={styles.backdrop}>
				<Surface style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
					<View style={styles.header}>
						<View style={styles.headerText}>
							<Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>{translate(language, "printBarcodeSkuLabel")}</Text>
							<Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{product?.name ?? ""}</Text>
						</View>
						<IconButton icon="close" accessibilityLabel="Close" onPress={onDismiss} />
					</View>

					<ScrollView contentContainerStyle={styles.body}>
						<Text style={[styles.sku, { color: theme.colors.onSurface }]}>{translate(language, "productSku")}: {product?.sku ?? ""}</Text>
						{barcodeSvg ? <SvgXml xml={barcodeSvg} width="100%" height={84} /> : (
							<Text style={{ color: theme.colors.error }}>This SKU cannot be encoded as Code 128.</Text>
						)}
						<Text style={[styles.sizeLabel, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "tagSizeLabel")}</Text>
						<Menu
							visible={sizeMenuVisible}
							onDismiss={() => setSizeMenuVisible(false)}
							anchor={<Button mode="outlined" icon="chevron-down" onPress={() => setSizeMenuVisible(true)}>{translate(language, selectedSize.labelKey)}</Button>}
						>
							{(Object.entries(priceLabelSizes) as [PriceLabelSize, typeof selectedSize][]).map(([value, option]) => (
								<Menu.Item
									key={value}
									title={translate(language, option.labelKey)}
									leadingIcon={value === size ? "check" : undefined}
									onPress={() => { setSize(value); setSizeMenuVisible(false); }}
								/>
							))}
						</Menu>
					</ScrollView>

					<View style={styles.footer}>
						<Button mode="text" onPress={onDismiss}>{translate(language, "cancelButton")}</Button>
						<Button mode="contained" icon="printer-outline" loading={printing} disabled={!barcodeSvg || printing} onPress={() => { void printLabel(); }}>
							{translate(language, "printBarcodeSkuLabel")}
						</Button>
					</View>
				</Surface>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.48)" },
	dialog: { width: "100%", maxWidth: 460, maxHeight: "90%", borderRadius: 12, overflow: "visible" },
	header: { flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingTop: 8 },
	headerText: { flex: 1, minWidth: 0 },
	body: { alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
	sku: { fontSize: 16, fontWeight: "800" },
	sizeLabel: { alignSelf: "flex-start", fontSize: 13, fontWeight: "700", marginTop: 6 },
	footer: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
});
