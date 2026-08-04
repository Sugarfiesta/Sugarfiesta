import { useFonts } from "expo-font";

// Load luxury display + text fonts from the fontsource TTF CDN (native-friendly).
export const useAppFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    "PlayfairDisplay-Regular":
      "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-normal.ttf",
    "PlayfairDisplay-Bold":
      "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.ttf",
    "DMSans-Regular":
      "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-400-normal.ttf",
    "DMSans-Medium":
      "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-500-normal.ttf",
    "DMSans-Bold":
      "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-700-normal.ttf",
  });
