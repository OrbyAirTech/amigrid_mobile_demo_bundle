export const colors = {
  // Brand
  primary: '#DBD9DB', // replaces every blue detail from the Visily design
  ink: '#241623', // text, icons and dark glass. Sits on top of primary
  // Surfaces
  background: '#F3F1F4',
  iconTile: 'rgba(219, 217, 219, 0.75)',
  // Text
  textPrimary: '#241623',
  textMuted: '#6E6670',
  white: '#FFFFFF',
  danger:'#f98080' ,
  // Screen gradient (top -> bottom)
  screenGradient: ['#E6E2E8', '#F3F1F4', '#F4F3F6', '#E4DFE6'],
  // Soft colour blobs that sit behind the glass so the blur has something to show
  orbs: {
    plum: 'rgba(36, 22, 35, 0.16)',
    mauve: 'rgba(170, 150, 176, 0.42)',
    mist: 'rgba(219, 217, 219, 0.95)',
  },
} as const;
