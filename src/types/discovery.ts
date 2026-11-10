export type Visibility = 'public' | 'private';
// The server stores open | closed | secure; the other two are what earlier mock data used.
export type AccessMode = 'open' | 'closed' | 'secure' | 'invite_only' | 'approval_required';

/**
 * Position fields on a hydrated item. resolve_many is expected to return the entity's coordinates so the
 * map can plot it; the exact key names are read tolerantly in utils/discoveryCoords.ts.
 */
type Positioned = { latitude?: number; longitude?: number };

export type SpaceItem = Positioned & {
  type: 'space';
  entity_id: string;
  name: string;
  profile_url: string;
  visibility: Visibility;
  access_mode: AccessMode;
  geo_score: number;
  social_score: number;
  popularity_score: number;
  temporal_score: number;
  final_score: number;
  neighbour_visit_count: number;
  is_member: boolean;
};

export type UserItem = Positioned & {
  type: 'user';
  entity_id: string;
  username: string;
  display_name: string;
  profile_pic_url: string;
  bio: string;
  is_amigo: boolean;
  /** Only known for people found by location; a name search doesn't have it. */
  distance_meters?: number;
  similarity_score: number;
  shared_space_count?: number;
  are_amigos: boolean;
  /** Set locally after a request is sent from this card. */
  request_sent?: boolean;
};

export type StoreItem = Positioned & {
  type: 'store';
  /** Echoed back by resolve_many from the request; the UI never displays it. */
  entity_id?: string;
  name: string;
  category: string;
  logo_url: string;
  isOpen: boolean;
  rating: number;
};

export type DiscoveryItem = SpaceItem | UserItem | StoreItem;

export type DiscoveryResponse = {
  status: boolean;
  data: DiscoveryItem[];
};
