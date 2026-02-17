const FALLBACK_PLATFORM_COLORS: Record<string, string> = {
  megatix: "#FF6B6B",
  ticketmelon: "#4ECDC4",
  residentadvisor: "#95E1D3",
  "resident-advisor": "#95E1D3",
  atdoor: "#F38181",
  "at-door": "#F38181",
};

export function platformColor(name: string, colorHex?: string | null) {
  if (colorHex) return colorHex;
  const key = name.trim().toLowerCase().replace(/\s+/g, "");
  return FALLBACK_PLATFORM_COLORS[key] ?? "#94A3B8";
}
