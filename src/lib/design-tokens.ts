
/**
 * StockTrack Design Tokens
 * Flat minimalism with a single accent color (Wise / Revolut / Linear style).
 */

export const borderRadius = {
  sm: 8,  // chips, small controls, avatar corners
  md: 16, // cards, inputs, list groups
  lg: 24, // bottom sheets, modals, hero banners
} as const;

export const typography = {
  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500" as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800" as const,
  },
} as const;

export const surfaceElevation = {
  card: {
    borderWidth: 1,
    elevation: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  modal: {
    borderWidth: 0,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
} as const;

