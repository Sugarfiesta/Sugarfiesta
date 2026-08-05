import { useFonts } from "expo-font";

// Candy / kawaii type system: Fredoka (rounded display) + Nunito (soft body).
// Loaded from the fontsource TTF CDN (native-friendly, Expo Go compatible).
export const useAppFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    "Fredoka-Regular":
      "https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-400-normal.ttf",
    "Fredoka-Medium":
      "https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-500-normal.ttf",
    "Fredoka-SemiBold":
      "https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-600-normal.ttf",
    "Fredoka-Bold":
      "https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-700-normal.ttf",
    "Nunito-Regular":
      "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-400-normal.ttf",
    "Nunito-SemiBold":
      "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-600-normal.ttf",
    "Nunito-Bold":
      "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-700-normal.ttf",
  });
