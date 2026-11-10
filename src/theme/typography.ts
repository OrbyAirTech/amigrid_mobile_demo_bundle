export const fonts = {
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  brand: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  cardBody: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  // Compact scale shared by list rows, headers and cards. Use these instead of per-file fontSize overrides.
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  rowMeta: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
} as const;
