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
