export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 18, lg: 22, xl: 28, pill: 999 } as const;

/** Floating bottom nav: the pill's own height, and where it sits relative to the screen bottom. */
export const NAV_BAR_HEIGHT = 64;
export const navBottom = (insetBottom: number) => Math.max(insetBottom, 12);
/** Total space the floating nav occupies from the bottom edge (use for list padding / overlays). */
export const navOccupied = (insetBottom: number) => NAV_BAR_HEIGHT + navBottom(insetBottom);
