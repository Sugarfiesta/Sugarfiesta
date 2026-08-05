// Sugar design tokens — Candy / Kawaii aesthetic (glossy pastels, soft & sweet).
export const colors = {
  surface: "#FFF0F5", // cotton-candy blush
  onSurface: "#4A2E3B", // deep berry — never pure black
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#6B4A57",
  surfaceTertiary: "#FDE4EC",
  onSurfaceTertiary: "#9B7180",
  surfaceInverse: "#4A2E3B",
  onSurfaceInverse: "#FFFFFF",
  brand: "#FF528A",
  brandPrimary: "#FF528A", // candy magenta-pink
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#98F5E1", // mint gummy
  onBrandSecondary: "#0F5F52",
  brandTertiary: "#D4C4FB", // lavender
  onBrandTertiary: "#4A2E3B",
  accentCyan: "#22D3EE",
  accentLemon: "#FDF07B",
  success: "#4ADE80",
  onSuccess: "#0F5132",
  warning: "#FBBF24",
  onWarning: "#594802",
  error: "#FF6B81",
  onError: "#FFFFFF",
  border: "rgba(255,105,180,0.18)",
  borderStrong: "rgba(255,255,255,0.7)",
  divider: "rgba(255,105,180,0.12)",
};

// Candy gradient recipes.
export const gradients = {
  marshmallow: ["#FFF0F5", "#E6F7FA"] as const, // melting-ice-cream background
  cottonCandy: ["#FFD6E8", "#D4C4FB"] as const, // pink -> lavender
  mintLemon: ["#98F5E1", "#FDF07B"] as const,
  glossHighlight: ["rgba(255,255,255,0.65)", "rgba(255,255,255,0)"] as const,
  rainbowRing: ["#FF528A", "#FDF07B", "#98F5E1", "#D4C4FB", "#FF528A"] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
};

export const fonts = {
  displayRegular: "Fredoka-Medium",
  displaySemiBold: "Fredoka-SemiBold",
  displayBold: "Fredoka-Bold",
  textRegular: "Nunito-Regular",
  textMedium: "Nunito-SemiBold",
  textBold: "Nunito-Bold",
};

export const fontScale = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  display: 44,
};

// Colored, glossy candy shadow for gummy buttons / cards.
export function candyShadow(color: string = colors.brandPrimary) {
  return {
    shadowColor: color,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  };
}

// Gender-individualized accent: mint for female, pink otherwise.
export function accentFor(gender?: string) {
  return gender === "female" ? colors.brandPrimary : colors.brandTertiary;
}

export const IMAGES = {
  authHero:
    "https://images.unsplash.com/photo-1519750783826-e2420f4d687f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNDR8MHwxfHNlYXJjaHwxfHxsdXh1cmlvdXMlMjByb21hbnRpYyUyMGFic3RyYWN0JTIwYmx1ciUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzg1ODg1MjcwfDA&ixlib=rb-4.1.0&q=85",
  partnerFemale:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODF8MHwxfHNlYXJjaHwxfHxiZWF1dGlmdWwlMjB5b3VuZyUyMHdvbWFuJTIwY2luZW1hdGljJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzg1ODg1MjcwfDA&ixlib=rb-4.1.0&q=85",
  partnerMale:
    "https://images.unsplash.com/photo-1450133064473-71024230f91b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxoYW5kc29tZSUyMHlvdW5nJTIwbWFuJTIwY2luZW1hdGljJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzg1ODg1MjcwfDA&ixlib=rb-4.1.0&q=85",
  selfDemo:
    "https://images.pexels.com/photos/27328335/pexels-photo-27328335.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  verificationDemo:
    "https://images.unsplash.com/photo-1514582086679-4024becf927e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwc2VsZmllJTIwcGhvdG8lMjBJRCUyMGNhcmQlMjB2ZXJpZmljYXRpb24lMjBtb2NrfGVufDB8fHx8MTc4NTg4NTI3MHww&ixlib=rb-4.1.0&q=85",
};

export function partnerImage(gender?: string) {
  return gender === "male" ? IMAGES.partnerMale : IMAGES.partnerFemale;
}
