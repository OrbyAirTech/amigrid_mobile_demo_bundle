import type { Visibility } from './discovery';

/**
 * Mirrors the C++ `TrendingSpace` struct (trending_engine::rank_trending_spaces).
 * Not personalized, and fully hydrated: a card can render from this alone.
 * std::optional<double> latitude/longitude -> `number | null` here (absent/null when unset).
 */
export type TrendingSpace = {
  id: string;
  name: string;
  description: string;
  profile_url: string; // space avatar/profile image
  profile_banner_url: string; // space cover/banner image
  participant_count: number;
  visibility: Visibility;
  is_explicit: boolean;
  latitude?: number | null;
  longitude?: number | null;
  trending_score: number; // transparency/debugging only, not a UI concern
};

/** Mirrors the C++ `TrendingSpacesResult` struct. */
export type TrendingSpacesResult = {
  status: boolean;
  spaces: TrendingSpace[];
  offset: number;
  limit: number;
};
