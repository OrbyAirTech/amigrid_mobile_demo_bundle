import { colors } from './colors';

/**
 * Glass recipes. Every surface = blur + translucent tint + top sheen + 1px edge.
 *  - primary: #DBD9DB glass (main buttons)
 *  - light:   white glass (cards, inputs, secondary buttons)
 *  - dark:    #241623 glass (available for emphasis, e.g. destructive/high-contrast actions)
 */
export const glass = {
  primary: {
    tint: 'light',
    blur: 40,
    fill: 'rgba(219, 217, 219, 0.72)',
    border: 'rgba(255, 255, 255, 0.75)',
    sheen: ['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'],
    text: colors.ink,
    shadow: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
    },
  },
  light: {
    tint: 'light',
    blur: 40,
    fill: 'rgba(255, 255, 255, 0.5)',
    border: 'rgba(255, 255, 255, 0.85)',
    sheen: ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'],
    text: colors.ink,
    shadow: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
  },
  /** More see-through than `light`: for controls that hover over scrolling content (feed toggle, FAB). */
  floating: {
    tint: 'light',
    blur: 28,
    fill: 'rgba(255, 255, 255, 0.26)',
    border: 'rgba(255, 255, 255, 0.7)',
    sheen: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'],
    text: colors.ink,
    shadow: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
    },
  },
  dark: {
    tint: 'dark',
    blur: 40,
    fill: 'rgba(36, 22, 35, 0.84)',
    border: 'rgba(255, 255, 255, 0.22)',
    sheen: ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'],
    text: colors.white,
    shadow: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
    },
  },
} as const;

export type GlassTone = keyof typeof glass;
