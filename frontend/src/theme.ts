export const colors = {
  bg: "#FDFBF7",
  surface: "#FFFFFF",
  surfaceElevated: "#F4F1E8",
  text: "#1A2118",
  textSecondary: "#5C6658",
  textDisabled: "#A1A89D",
  textInverse: "#FFFFFF",
  olive: "#2E412A",
  oliveHover: "#21301E",
  terracotta: "#D96C5B",
  terracottaHover: "#C25D4E",
  gold: "#E6B97A",
  success: "#3E6649",
  warning: "#C78D32",
  error: "#B24040",
  info: "#4A6E82",
  border: "#EBE8DF",
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadow = {
  card: {
    shadowColor: "#2E412A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

export const formatDateBR = (iso: string): string => {
  if (!iso) return "";
  try {
    const [y, m, d] = iso.split("T")[0].split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
};

export const formatDayName = (iso: string): string => {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T12:00:00");
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[d.getDay()];
  } catch {
    return "";
  }
};
