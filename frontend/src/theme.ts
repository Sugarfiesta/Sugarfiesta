// Sugar design tokens — luxurious white / crimson / rose theme.
export const colors = {
  surface: "#FFFFFF",
  onSurface: "#1F0A0E",
  surfaceSecondary: "#FCF9FA",
  onSurfaceSecondary: "#4A2A31",
  surfaceTertiary: "#F5EEF0",
  onSurfaceTertiary: "#69424B",
  surfaceInverse: "#1F0A0E",
  onSurfaceInverse: "#FFFFFF",
  brand: "#CC143C",
  brandPrimary: "#CC143C",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E8436E",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FADEE3",
  onBrandTertiary: "#8A0F2C",
  success: "#128A4A",
  onSuccess: "#FFFFFF",
  warning: "#D97706",
  error: "#B31222",
  onError: "#FFFFFF",
  border: "#EBE3E5",
  borderStrong: "#D6C5C8",
  divider: "#F0E8EA",
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
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const fonts = {
  displayRegular: "PlayfairDisplay-Regular",
  displayBold: "PlayfairDisplay-Bold",
  textRegular: "DMSans-Regular",
  textMedium: "DMSans-Medium",
  textBold: "DMSans-Bold",
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

// Gender-individualized accent: rose for female, crimson otherwise.
export function accentFor(gender?: string) {
  return gender === "female" ? colors.brandSecondary : colors.brandPrimary;
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
