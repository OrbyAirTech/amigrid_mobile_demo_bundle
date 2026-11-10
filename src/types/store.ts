/** Mirrors the C++ `StoreWithProducts` (GET /store/specific). */
export type StoreProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
  thumbnail_url: string;
  in_stock: boolean;
  swap_allowed: boolean;
  created_at: string;
};

export type StoreDetails = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  category: string;
  tags: string[];
  is_open: boolean;
  opens_at: string;
  closes_at: string;
  days_open: string[];
  rating: number;
  rating_count: number;
  total_sales: number;
  is_verified: boolean;
};

export type StoreOwner = { id: string; username: string; profile_pic_url: string; bio: string };

export type StoreProfile = { status: boolean; owner: StoreOwner; store: StoreDetails; products: StoreProduct[] };

/** GET /store/get_product. The full product, with every photo. */
export type ProductDetail = {
  id: string;
  business_id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  media_url: string[];
  in_stock: boolean;
  swap_allowed: boolean;
  created_at: string;
};

/** One row of GET /store/user (C++ `DigitalBusiness_type`). */
export type UserStore = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  location_wkt: string | null;
  logo_url: string;
  is_verified: boolean;
  is_open: boolean;
  created_at: string;
};
