export const COUNTRIES = [
  { code: "", label: "Alle Länder", flag: "🌍" },
  { code: "DE", label: "Deutschland", flag: "🇩🇪" },
  { code: "AT", label: "Österreich", flag: "🇦🇹" },
  { code: "CH", label: "Schweiz", flag: "🇨🇭" },
  { code: "FR", label: "Frankreich", flag: "🇫🇷" },
  { code: "ES", label: "Spanien", flag: "🇪🇸" },
  { code: "IT", label: "Italien", flag: "🇮🇹" },
  { code: "GB", label: "Großbritannien", flag: "🇬🇧" },
  { code: "US", label: "USA", flag: "🇺🇸" },
];

export function countryLabel(code?: string) {
  const c = COUNTRIES.find((x) => x.code === (code || ""));
  return c ? `${c.flag} ${c.label}` : code || "";
}

export const TIER_COLORS: Record<string, string> = {
  free: "#69424B",
  plus: "#E8436E",
  gold: "#CC143C",
  vip: "#8A0F2C",
};

export function tierName(t?: string) {
  return ({ free: "Free", plus: "Sugar Plus", gold: "Sugar Gold", vip: "Sugar VIP" } as Record<string, string>)[t || "free"] || "Free";
}

export function tierRank(t?: string) {
  return ({ free: 0, plus: 1, gold: 2, vip: 3 } as Record<string, number>)[t || "free"] ?? 0;
}

// Sexual orientations, each with its own candy accent color.
export const ORIENTATIONS = [
  { key: "hetero", label: "Hetero", color: "#FF528A" },
  { key: "gay", label: "Schwul / Lesbisch", color: "#22D3EE" },
  { key: "bi", label: "Bisexuell", color: "#C084FC" },
  { key: "pan", label: "Pansexuell", color: "#FBBF24" },
  { key: "ace", label: "Asexuell", color: "#4ADE80" },
  { key: "queer", label: "Queer", color: "#F472B6" },
] as const;

export function orientationLabel(key?: string) {
  return ORIENTATIONS.find((o) => o.key === key)?.label || "";
}

export function orientationColor(key?: string) {
  return ORIENTATIONS.find((o) => o.key === key)?.color || "#FF528A";
}

// Story visibility levels.
export const STORY_VIS = [
  { key: "public", label: "Öffentlich", icon: "globe" },
  { key: "matches", label: "Nur Matches", icon: "users" },
  { key: "private", label: "Privat", icon: "lock" },
] as const;

export function storyVisLabel(key?: string) {
  return STORY_VIS.find((v) => v.key === key)?.label || "Öffentlich";
}

export function storyVisIcon(key?: string): "globe" | "users" | "lock" {
  return (STORY_VIS.find((v) => v.key === key)?.icon || "globe") as "globe" | "users" | "lock";
}

// Preset options to make profile creation quick and consistent.
export const RELIGION_OPTIONS = [
  "Christlich", "Katholisch", "Evangelisch", "Muslimisch", "Jüdisch",
  "Hinduistisch", "Buddhistisch", "Spirituell", "Agnostisch", "Atheistisch", "Andere",
];

export const HOBBY_OPTIONS = [
  "Sport", "Reisen", "Musik", "Kochen", "Gaming", "Lesen", "Fotografie",
  "Tanzen", "Wandern", "Kunst", "Filme", "Yoga", "Mode", "Tiere",
];

export const JOB_OPTIONS = [
  "Student:in", "Angestellte:r", "Selbstständig", "Handwerk", "Gesundheitswesen",
  "IT & Tech", "Kreativ & Design", "Bildung", "Gastronomie", "Management", "Andere",
];

// Text colors for Instagram-style story captions.
export const STORY_TEXT_COLORS = ["#FFFFFF", "#FF528A", "#FDF07B", "#98F5E1", "#22D3EE", "#4A2E3B"];
