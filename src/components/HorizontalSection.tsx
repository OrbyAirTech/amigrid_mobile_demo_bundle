import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactElement } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/theme';

type Props<T> = {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  /** Card width, so the list can snap to one card at a time. */
  cardWidth: number;
  onSeeAll?: () => void;
};

const GAP = spacing.md;

/** Titled row of cards that swipes horizontally and snaps card by card. */
export function HorizontalSection<T>({ icon, title, data, keyExtractor, renderItem, cardWidth, onSeeAll }: Props<T>) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name={icon} size={17} color={colors.ink} />
          <Text style={[typography.cardTitle, styles.title]}>{title}</Text>
        </View>
        <Text style={[typography.caption, styles.seeAll]} onPress={onSeeAll} accessibilityRole="button">
          See all
        </Text>
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderItem(item)}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.textPrimary },
  seeAll: { color: colors.ink, fontFamily: fonts.semibold },
  // Room for the card shadow so it isn't clipped by the scroller.
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
