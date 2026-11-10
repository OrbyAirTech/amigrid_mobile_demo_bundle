import type { ProductDetail, StoreProduct, StoreProfile, UserStore } from '@/types/store';
import { api, ApiError } from './api/client';

/**
 * GET /store/specific. The store, its owner and the first few products. The server counts each call as a
 * visit, and answers an unknown store with 409 and `status: false`.
 */
export async function fetchStore(storeId: string): Promise<StoreProfile> {
  try {
    const { data } = await api.get<StoreProfile>('/store/specific', { store_id: storeId });
    if (!data?.store?.id) throw new ApiError('This store is unavailable.', 404);
    return { ...data, products: data.products ?? [] };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) throw new ApiError('This store is unavailable.', 404);
    throw e;
  }
}

export const PRODUCT_PAGE = 20;

/** GET /store/specific/products. More of a store's products. The server answers an empty page with 404 or 409. */
export async function fetchProducts(storeId: string, offset: number): Promise<StoreProduct[]> {
  try {
    const { data } = await api.get<{ products?: StoreProduct[] }>('/store/specific/products', { store_id: storeId, offset, limit: PRODUCT_PAGE });
    return data?.products ?? [];
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) return [];
    throw e;
  }
}

/** GET /store/get_product. */
export async function fetchProduct(storeId: string, productId: string): Promise<ProductDetail> {
  try {
    const { data } = await api.get<{ data?: ProductDetail }>('/store/get_product', { store_id: storeId, product_id: productId });
    const p = data?.data;
    if (!p?.id) throw new ApiError('This product is unavailable.', 404);
    return { ...p, id: String(p.id), media_url: p.media_url ?? [] };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) throw new ApiError('This product is unavailable.', 404);
    throw e;
  }
}

/** GET /store/user. The stores one person runs. An empty list can come back as 404 or 409. */
export async function fetchUserStores(userId: string): Promise<UserStore[]> {
  try {
    const { data } = await api.get<{ data?: Array<Partial<UserStore> & { id: string | number; owner_id: string | number }> }>('/store/user', { user_id: userId });
    return (data?.data ?? []).map((r) => ({
      id: String(r.id),
      owner_id: String(r.owner_id),
      name: r.name ?? '',
      description: r.description ?? '',
      location_wkt: r.location_wkt ?? null,
      logo_url: r.logo_url ?? '',
      is_verified: !!r.is_verified,
      is_open: !!r.is_open,
      created_at: r.created_at ?? '',
    }));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) return [];
    throw e;
  }
}

export type NewStore = { name: string; description: string; category: string; location?: { latitude: number; longitude: number } };

/**
 * POST /store. Core reads logo_url, banner_url and tags without checking they are there, so they are always sent
 * (empty). Answers `{status, store}`; a 409 means it was refused.
 */
export async function createStore(input: NewStore): Promise<string> {
  const { data } = await api.post<{ store?: { id?: string | number } }>('/store', {
    name: input.name,
    description: input.description,
    category: input.category,
    logo_url: '',
    banner_url: '',
    tags: [],
    ...(input.location ? { location: input.location } : {}),
  });
  const id = data?.store?.id;
  if (id == null) throw new ApiError('The store couldn’t be created. Check the details and try again.', 409);
  return String(id);
}

export type NewProduct = { name: string; price: number; currency: string; description: string; media_urls: string[]; in_stock: boolean };

let productsVersion = 0;
/** Bumped after a product is added, so an open store screen knows to reload its list. */
export const getProductsVersion = () => productsVersion;

/**
 * POST /store/product. Owner only. Core answers 200 with an empty body, so the caller reloads the list
 * (fetchProducts) to show the new product. The first photo is the thumbnail.
 */
export async function createProduct(storeId: string, input: NewProduct): Promise<void> {
  try {
    await api.post('/store/product', {
      name: input.name,
      price: input.price,
      currency: input.currency,
      description: input.description,
      thumbnail_url: input.media_urls[0] ?? '',
      media_urls: input.media_urls,
      in_stock: input.in_stock,
    }, { query: { store_id: storeId } });
    productsVersion++;
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) throw new ApiError('The product wasn’t added. Only the store owner can add products, and the details must be complete.', 409);
    throw e;
  }
}
