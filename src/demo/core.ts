import * as db from './db';
import { ME, ago, ahead, nextId, photo } from './db';

/** What a route hands back. `headers` carries tokens, the way the real Core server does. */
export type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };
export type Call = { method: string; path: string; query: Record<string, string>; body: any };

const ok = (extra: object = {}): Reply => ({ body: { status: true, ...extra } });
const fail = (status: number, message: string): Reply => ({ status, body: { status: false, message } });
const empty = (): Reply => fail(409, 'Nothing here yet.');

let tokenCount = 0;
const tokenHeaders = (refresh = true): Record<string, string> => {
  const n = ++tokenCount;
  return { authorization: `Bearer demo-access-${n}`, ...(refresh ? { 'x-refresh-token': `Bearer demo-refresh-${n}` } : null) };
};

const page = <T>(list: T[], q: Record<string, string>) => {
  const offset = Number(q.offset ?? 0) || 0;
  const limit = Number(q.limit ?? 20) || 20;
  return list.slice(offset, offset + limit);
};
const num = (v: string | undefined) => (v === undefined ? NaN : Number(v));

/* ---- shapes ---- */
const amigoUser = (id: string) => {
  const u = db.userById(id)!;
  return { user_id: u.id, username: u.username, profile_pic_url: u.pic, bio: u.bio };
};

const postOut = (p: db.DPost) => {
  const u = db.userById(p.author)!;
  const s = p.space ? db.spaceById(p.space) : undefined;
  const st = p.stream ? db.streams.find((x) => x.id === p.stream) : undefined;
  return {
    status: true,
    id: p.id,
    author_id: u.id,
    author_username: u.username,
    author_display_name: u.display_name,
    author_profile_image: u.pic,
    space_id: s?.id ?? null,
    space_name: s?.name ?? null,
    parent_post_id: p.parent,
    is_reply: !!p.parent,
    content: p.content,
    media_urls: p.media,
    view_count: p.views,
    like_count: p.likes.size,
    location: null,
    stream_id: st?.id ?? null,
    stream_title: st?.title ?? null,
    visibility: s ? 'space' : 'public',
    created_at: p.created,
    updated_at: p.created,
  };
};

const streamOut = (s: db.DStream, forMe = true) => {
  const u = db.userById(s.creator)!;
  return {
    stream_id: s.id,
    space_id: s.space,
    title: s.title,
    status: s.status,
    end_reason: s.status === 'ended' ? 'normal' : null,
    post_id: s.post,
    started_at: s.started,
    ended_at: s.ended,
    upvote_count: s.upvotes.size,
    peak_viewer_count: s.peak,
    total_viewer_count: s.total,
    has_upvoted: forMe && s.upvotes.has(ME),
    creator: { id: u.id, username: u.username, display_name: u.display_name, profile_pic_url: u.pic },
    viewer_count: s.viewers,
  };
};

const spaceData = (s: db.DSpace) => {
  const c = db.userById(s.creator)!;
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    profile_url: db.spaceProfile(s),
    profile_banner_url: db.spaceBanner(s),
    creator_info: { user_id: c.id, username: c.username, profile_pic_url: c.pic, bio: c.bio },
    type: s.type,
    location: `POINT(${s.lon} ${s.lat})`,
    radius_meters: s.radius,
    visibility: s.visibility,
    access_mode: s.access,
    is_system_generated: false,
    space_participant_count: s.members.length,
    created_at: s.created,
  };
};

const eventOut = (e: db.DEvent) => {
  const s = db.spaceById(e.space)!;
  const live = db.streams.find((x) => x.id === e.stream && x.status === 'live');
  return {
    event_id: e.id,
    space_id: s.id,
    space_name: s.name,
    space_profile_url: db.spaceProfile(s),
    title: e.title,
    starts_at: e.starts,
    ends_at: e.ends,
    is_live: !!live,
    live_stream_id: live?.id ?? null,
  };
};

const profileOf = (id: string) => {
  const u = db.userById(id)!;
  const mine = id === ME;
  const theirAmigos = mine ? [...db.amigos] : (db.amigosOf[id] ?? []);
  const shown = id === ME ? db.posts.filter((p) => p.author === id && !p.parent) : db.posts.filter((p) => p.author === id && !p.parent);
  return {
    status: true,
    basicInitial: { user_id: u.id, username: u.username, full_name: u.full_name, profile_pic_url: u.pic, display_name: u.display_name, bio: u.bio, links: u.links, birthday: u.birthday },
    space_count: db.spaces.filter((s) => s.members.includes(id)).length,
    amigos_count: theirAmigos.length,
    notification_count: mine ? db.notes.filter((n) => !n.read).length : 0,
    business_count: db.stores.filter((s) => s.owner === id).length,
    digitalCard_count: 0,
    posts: shown.map((p) => ({ id: p.id, media_urls: p.media, like_count: p.likes.size, created_at: p.created })),
  };
};

const hit = {
  user: (id: string) => {
    const u = db.userById(id)!;
    return { user_id: u.id, username: u.username, display_name: u.display_name, profile_pic_url: u.pic, bio: u.bio, is_amigo: db.amigos.has(u.id) };
  },
  space: (s: db.DSpace) => ({ space_id: s.id, name: s.name, description: s.description, type: s.type, profile_url: db.spaceProfile(s), visibility: s.visibility, access_mode: s.access, participant_count: s.members.length }),
  store: (s: db.DStore) => ({ store_id: s.id, name: s.name, category: s.category, logo_url: db.storeLogo(s), is_open: s.open, rating: s.rating.toFixed(1) }),
};

const distance = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const dLat = (bLat - aLat) * 111_000;
  const dLon = (bLon - aLon) * 111_000 * Math.cos((aLat * Math.PI) / 180);
  return Math.round(Math.hypot(dLat, dLon));
};

const resolveOne = (item: { type: string; entity_id: string } & Record<string, unknown>) => {
  const { type, entity_id } = item;
  if (type === 'user') {
    const u = db.userById(entity_id);
    if (!u) return { ...item, resolved: false };
    return { ...item, resolved: true, username: u.username, display_name: u.display_name, profile_pic_url: u.pic, bio: u.bio, are_amigos: db.amigos.has(u.id), latitude: u.lat, longitude: u.lon };
  }
  if (type === 'space') {
    const s = db.spaceById(entity_id);
    if (!s) return { ...item, resolved: false };
    return {
      ...item, resolved: true, name: s.name, profile_url: db.spaceProfile(s), visibility: s.visibility, access_mode: s.access,
      geo_score: 0.8, social_score: 0.6, popularity_score: s.trending / 100, temporal_score: 0.5, final_score: s.trending / 100,
      neighbour_visit_count: s.members.length * 3, is_member: s.members.includes(ME), latitude: s.lat, longitude: s.lon,
    };
  }
  if (type === 'store') {
    const s = db.storeById(entity_id);
    if (!s) return { ...item, resolved: false };
    return { ...item, resolved: true, name: s.name, category: s.category, logo_url: db.storeLogo(s), is_open: s.open, rating: s.rating.toFixed(1), latitude: s.lat, longitude: s.lon };
  }
  return { ...item, resolved: false };
};

const upcoming = () => db.events.filter((e) => Date.parse(e.ends) > Date.now()).sort((a, b) => Date.parse(a.starts) - Date.parse(b.starts));

/* ---- the router ---- */
export function handleCore(c: Call): Reply {
  const { method: m, path: p, query: q, body: b } = c;
  const is = (method: string, path: string) => m === method && p === path;

  /* auth */
  if (is('POST', '/auth/login')) {
    if (!b?.email && !b?.password && !b?.identifier) return { status: 401, body: { status: false, message: 'Wrong email or password.' } };
    return { body: { status: true, message: 'Welcome back.', settings: { two_factor_enabled: false } }, headers: tokenHeaders() };
  }
  if (is('POST', '/auth/verify_email')) return { body: { status: true, message: 'Code sent.' }, headers: tokenHeaders(false) };
  if (is('POST', '/session-based/verify_email_otp')) return { body: { status: true }, headers: tokenHeaders(false) };
  if (is('POST', '/temp_session/sign-up')) return { body: { status: true }, headers: tokenHeaders() };
  if (is('POST', '/auth/refresh')) return { body: { status: true }, headers: tokenHeaders() };
  if (is('POST', '/session/logout')) return ok();
  if (is('POST', '/session/forgot-password')) return { body: { status: true }, headers: tokenHeaders(false) };
  if (is('POST', '/session/verifyOTP')) return ok();
  if (is('POST', '/session/reset-password')) return { body: { status: true }, headers: tokenHeaders() };
  if (is('POST', '/user/change_email') || is('POST', '/user/change_phone') || is('POST', '/user/toggle_token')) return { body: { status: true }, headers: tokenHeaders(false) };
  if (is('DELETE', '/user/delete_account')) return ok();

  /* user */
  if (is('GET', '/user')) return { body: profileOf(ME) };
  if (is('GET', '/user/users')) return db.userById(q.id) ? { body: profileOf(q.id) } : fail(404, 'User not found.');
  if (is('GET', '/user/get_settings')) return { body: { status: true, ...db.settings } };
  if (is('PUT', '/user/settings')) {
    Object.assign(db.settings, b ?? {});
    return { body: { status: true, ...db.settings } };
  }
  if (is('PUT', '/user/update')) {
    const me = db.userById(ME)!;
    if (typeof b?.username === 'string' && b.username) me.username = b.username;
    if (typeof b?.display_name === 'string') me.display_name = b.display_name;
    if (typeof b?.full_name === 'string') me.full_name = b.full_name;
    if (typeof b?.bio === 'string') me.bio = b.bio;
    if (typeof b?.profile_pic_url === 'string') me.pic = b.profile_pic_url;
    if (typeof b?.birthday === 'string') me.birthday = b.birthday;
    if (Array.isArray(b?.links)) me.links = b.links;
    return ok();
  }
  if (is('GET', '/user/notification')) {
    const rows = page(db.notes, q).map((n) => {
      const u = db.userById(n.from)!;
      return { id: n.id, message: n.message, isRead: n.read, createdAt: n.at, user: { user_id: u.id, username: u.username, display_name: u.display_name, profile_pic_url: u.pic }, ref: { ref_id: n.ref, ref_table: n.table } };
    });
    db.notes.forEach((n) => (n.read = true));
    return rows.length ? { body: { status: true, data: rows } } : empty();
  }

  /* location + discovery */
  if (is('POST', '/engine/location/ping')) return ok();
  if (is('GET', '/engine/discover/spaces')) return { body: { status: true, ranked: db.spaces.filter((s) => s.visibility === 'public' || s.members.includes(ME)).sort((a, b) => b.trending - a.trending).map((s) => ({ entity_id: s.id, entity_type: 'space' })) } };
  if (is('GET', '/engine/discover/stores')) return { body: { status: true, ranked: db.stores.map((s) => ({ entity_id: s.id, entity_type: 'store' })) } };
  if (is('GET', '/engine/nearby/users')) {
    const me = db.userById(ME)!;
    const near = db.users.filter((u) => u.id !== ME).map((u) => ({ user_id: u.id, distance_meters: distance(me.lat, me.lon, u.lat, u.lon), similarity_score: Math.round((0.4 + (Number(u.id) % 7) / 12) * 100) / 100, shared_space_count: db.spaces.filter((s) => s.members.includes(u.id) && s.members.includes(ME)).length }));
    return { body: { status: true, neighbours: near.sort((a, b) => a.distance_meters - b.distance_meters) } };
  }
  if (is('POST', '/search/resolve_many')) {
    const items: any[] = Array.isArray(b?.items) ? b.items : [];
    return { body: { status: true, data: items.map((i) => resolveOne({ ...i, entity_id: String(i.entity_id) })) } };
  }
  if (is('GET', '/engine/trending/spaces')) {
    const rows = page([...db.spaces].filter((s) => s.visibility === 'public').sort((a, b) => b.trending - a.trending), q);
    return {
      body: {
        status: true, offset: num(q.offset) || 0, limit: num(q.limit) || 20,
        spaces: rows.map((s) => ({ id: s.id, name: s.name, description: s.description, profile_url: db.spaceProfile(s), profile_banner_url: db.spaceBanner(s), participant_count: s.members.length, visibility: s.visibility, is_explicit: false, latitude: s.lat, longitude: s.lon, trending_score: s.trending })),
      },
    };
  }
  if (is('GET', '/stream-discovery/counter')) return { body: { status: true, live_grid_count: new Set(db.streams.filter((s) => s.status === 'live').map((s) => s.space)).size, active_events_count: upcoming().length } };
  if (is('GET', '/stream-discovery/grid_event_count')) return { body: { status: true, count_value: upcoming().filter((e) => e.space === q.grid_id).length } };
  if (is('GET', '/stream-discovery/event-discovery')) {
    const rows = page(upcoming(), q).map((e) => {
      const s = db.spaceById(e.space)!;
      const u = db.userById(e.creator)!;
      return {
        event_details: { id: e.id, title: e.title, starts_at: e.starts, ends_at: e.ends, created_at: ago(60 * 24 * 3) },
        space_details: { space_id: s.id, space_name: s.name, space_profile_url: db.spaceProfile(s), space_description: s.description, space_type: s.type, space_is_system_generated: false, visibility: s.visibility },
        creator_details: { creator_id: u.id, creator_username: u.username, creator_display_name: u.display_name, creator_profile_pic_url: u.pic },
      };
    });
    return rows.length ? { body: { status: true, data: rows } } : empty();
  }
  if (is('GET', '/stream-discovery/grid-on-live')) {
    const liveSpaces = [...new Set(db.streams.filter((s) => s.status === 'live').map((s) => s.space))].map((id) => db.spaceById(id)!);
    const rows = page(liveSpaces, q).map((s) => ({ id: s.id, name: s.name, profile_url: db.spaceProfile(s), profile_banner_url: db.spaceBanner(s), description: s.description, type: s.type, is_system_generated: false, visibility: s.visibility, live_stream_count: db.streams.filter((x) => x.space === s.id && x.status === 'live').length }));
    return rows.length ? { body: { status: true, data: rows } } : empty();
  }

  /* search */
  if (m === 'GET' && p.startsWith('/search/') && p !== '/search/resolve_many') {
    const term = (q.term ?? '').trim().toLowerCase();
    const match = (...f: string[]) => !term || f.some((x) => x.toLowerCase().includes(term));
    const users = db.users.filter((u) => u.id !== ME && match(u.username, u.display_name, u.full_name, u.bio)).map((u) => hit.user(u.id));
    const grids = db.spaces.filter((s) => (s.visibility === 'public' || s.members.includes(ME)) && match(s.name, s.description)).map(hit.space);
    const shops = db.stores.filter((s) => match(s.name, s.category, s.description, ...s.tags)).map(hit.store);
    if (p === '/search/all') return { body: { status: true, users: users.slice(0, 6), spaces: grids.slice(0, 6), stores: shops.slice(0, 6) } };
    const list: unknown[] | null = p === '/search/users' ? users : p === '/search/amigos' ? (users as { is_amigo: boolean }[]).filter((u) => u.is_amigo) : p === '/search/spaces' ? grids : p === '/search/stores' ? shops : null;
    if (list) return { body: { status: true, data: page(list, q) } };
  }

  /* grids */
  if (is('GET', '/space/user_space_getter')) {
    const mine = db.spaces.filter((s) => s.members.includes(ME));
    return mine.length ? { body: { status: true, data: page(mine, q).map((s) => ({ id: s.id, name: s.name, description: s.description, participant_count: s.members.length, access_mode: s.access, profile_url: db.spaceProfile(s) })) } } : empty();
  }
  if (is('GET', '/space/data')) {
    const s = db.spaceById(q.space_id);
    return s ? { body: { status: true, data: spaceData(s) } } : fail(404, 'Grid not found.');
  }
  if (is('GET', '/space/participant') || is('GET', '/space/get_admins')) {
    const s = db.spaceById(q.space_id);
    if (!s) return empty();
    const ids = p === '/space/participant' ? s.members : s.admins;
    const rows = page(ids, q).map(amigoUser);
    return rows.length ? { body: { status: true, data: rows } } : empty();
  }
  if (is('PUT', '/space/join')) {
    const s = db.spaceById(q.space_id);
    if (!s) return fail(404, 'Grid not found.');
    if (s.access === 'secure' && !b?.security) return { status: 200, body: { status: false, message: 'This grid needs an access code.' } };
    if (!s.members.includes(ME)) s.members.push(ME);
    return ok();
  }
  if (is('PUT', '/space/leave')) {
    const s = db.spaceById(q.space_id);
    if (s) s.members = s.members.filter((x) => x !== ME);
    return ok();
  }
  if (is('PUT', '/space/add') || is('PUT', '/space/remove') || is('PUT', '/space/make_admin') || is('PUT', '/space/remove_admin')) {
    const s = db.spaceById(q.space_id ?? String(b?.space_id ?? ''));
    const uid = String(q.party_id ?? b?.participant ?? q.user_id ?? '');
    if (!s || !uid) return fail(400, 'Missing grid or user.');
    if (p === '/space/add' && !s.members.includes(uid)) s.members.push(uid);
    if (p === '/space/remove') {
      s.members = s.members.filter((x) => x !== uid);
      s.admins = s.admins.filter((x) => x !== uid);
    }
    if (p === '/space/make_admin' && !s.admins.includes(uid)) s.admins.push(uid);
    if (p === '/space/remove_admin') s.admins = s.admins.filter((x) => x !== uid);
    return ok();
  }

  /* amigos */
  if (is('GET', '/amigo')) {
    const ids = q.id && q.id !== ME ? (db.amigosOf[q.id] ?? []) : [...db.amigos];
    const rows = page(ids.filter((id) => db.userById(id)), q).map(amigoUser);
    return rows.length ? { body: { status: true, data: rows } } : empty();
  }
  if (is('GET', '/amigo/get_request')) {
    const rows = page(db.incomingRequests, q).map((r) => ({ ...amigoUser(r.user_id), request_id: r.request_id, requested_at: r.at }));
    return rows.length ? { body: { status: true, data: rows } } : empty();
  }
  if (is('POST', '/amigo/unfriend')) {
    db.amigos.delete(q.id);
    return ok();
  }
  if (is('PUT', '/amigo/accept_amigo')) {
    const r = db.incomingRequests.find((x) => x.request_id === q.request_id);
    if (r) {
      db.amigos.add(r.user_id);
      db.incomingRequests.splice(db.incomingRequests.indexOf(r), 1);
    }
    return ok();
  }
  if (is('DELETE', '/amigo/cancel_request')) {
    const i = db.incomingRequests.findIndex((x) => x.request_id === q.request_id);
    if (i >= 0) db.incomingRequests.splice(i, 1);
    return ok();
  }
  if (is('POST', '/amigo/send_request')) {
    db.sentRequests.add(q.id);
    return ok();
  }

  /* posts */
  if (is('GET', '/post/amigo_feed')) {
    const rows = db.posts.filter((x) => !x.parent && (db.amigos.has(x.author) || x.author === ME || (x.space && db.spaceById(x.space)?.members.includes(ME)))).sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
    const out = page(rows, q);
    return out.length ? { body: { status: true, data: out.map(postOut) } } : empty();
  }
  if (is('GET', '/post/space')) {
    const rows = db.posts.filter((x) => !x.parent && x.space === q.space_id).sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
    const out = page(rows, q);
    return out.length ? { body: { status: true, data: out.map(postOut) } } : empty();
  }
  if (is('GET', '/post/get_reply')) {
    const rows = db.posts.filter((x) => x.parent === q.parent_post_id).sort((a, b) => Date.parse(a.created) - Date.parse(b.created));
    const out = page(rows, q);
    return out.length ? { body: { status: true, data: out.map(postOut) } } : empty();
  }
  if (is('GET', '/post')) {
    const x = db.postById(q.post_id);
    return x ? { body: postOut(x) } : fail(404, 'Post not found.');
  }
  if (is('POST', '/post/makePost')) {
    const id = nextId();
    db.posts.unshift({ id, author: ME, space: b?.space_id ? String(b.space_id) : null, parent: null, content: String(b?.content ?? ''), media: Array.isArray(b?.mediaUrls) ? b.mediaUrls : [], views: 1, likes: new Set(), created: new Date().toISOString(), stream: null });
    return ok({ id });
  }
  if (is('POST', '/post/reply')) {
    const id = nextId();
    const parent = db.postById(q.post_id);
    db.posts.push({ id, author: ME, space: parent?.space ?? null, parent: q.post_id, content: String(b?.content ?? ''), media: [], views: 1, likes: new Set(), created: new Date().toISOString(), stream: null });
    return ok({ id });
  }
  if (is('POST', '/post/like') || is('POST', '/post/unlike')) {
    const x = db.postById(q.post_id);
    if (x) p.endsWith('unlike') ? x.likes.delete(ME) : x.likes.add(ME);
    return ok();
  }
  if (is('DELETE', '/post/delete')) {
    const i = db.posts.findIndex((x) => x.id === q.post_id);
    if (i >= 0) db.posts.splice(i, 1);
    return ok();
  }

  /* events */
  if (is('GET', '/event/space')) {
    const rows = db.events.filter((e) => e.space === q.space_id && (q.scope === 'past' ? Date.parse(e.ends) <= Date.now() : Date.parse(e.ends) > Date.now()));
    const out = page(rows, q).map(eventOut);
    return out.length ? { body: { status: true, events: out } } : empty();
  }
  if (is('GET', '/event/upcoming')) {
    const out = page(upcoming().filter((e) => db.spaceById(e.space)?.members.includes(ME)), q).map(eventOut);
    return out.length ? { body: { status: true, events: out } } : empty();
  }
  if (is('POST', '/event/create')) {
    const id = nextId();
    db.events.push({ id, space: q.space_id, title: String(b?.title ?? 'Event'), starts: String(b?.starts_at ?? ahead(60)), ends: String(b?.ends_at ?? ahead(120)), creator: ME });
    return ok({ event_id: id });
  }
  if (is('DELETE', '/event/delete')) {
    const i = db.events.findIndex((e) => e.id === q.event_id);
    if (i >= 0) db.events.splice(i, 1);
    return ok();
  }

  /* safety */
  if (is('POST', '/safety/report_user') || is('POST', '/safety/report_issue')) return ok({ message: 'Thanks, we will look into it.' });

  /* stores */
  if (is('GET', '/store/specific')) {
    const s = db.storeById(q.store_id);
    if (!s) return empty();
    const o = db.userById(s.owner)!;
    return {
      body: {
        status: true,
        owner: { id: o.id, username: o.username, profile_pic_url: o.pic, bio: o.bio },
        store: { id: s.id, owner_id: s.owner, name: s.name, description: s.description, logo_url: db.storeLogo(s), banner_url: db.storeBanner(s), category: s.category, tags: s.tags, is_open: s.open, opens_at: s.opens, closes_at: s.closes, days_open: s.days, rating: s.rating, rating_count: s.rating_count, total_sales: s.sales, is_verified: s.verified },
        products: s.products.slice(0, 6).map(productRow),
      },
    };
  }
  if (is('GET', '/store/specific/products')) {
    const s = db.storeById(q.store_id);
    const out = s ? page(s.products, q).map(productRow) : [];
    return out.length ? { body: { status: true, products: out } } : empty();
  }
  if (is('GET', '/store/get_product')) {
    const s = db.storeById(q.store_id);
    const x = s?.products.find((y) => y.id === q.product_id);
    if (!s || !x) return empty();
    return { body: { status: true, data: { id: x.id, business_id: s.id, name: x.name, price: x.price, currency: 'GHS', description: x.description, media_url: x.photos, in_stock: x.in_stock, swap_allowed: x.swap, created_at: x.created } } };
  }
  if (is('GET', '/store/user')) {
    const rows = db.stores.filter((s) => s.owner === q.user_id).map((s) => ({ id: s.id, owner_id: s.owner, name: s.name, description: s.description, location_wkt: `POINT(${s.lon} ${s.lat})`, logo_url: db.storeLogo(s), is_verified: s.verified, is_open: s.open, created_at: s.created }));
    return rows.length ? { body: { status: true, data: rows } } : empty();
  }
  if (is('POST', '/store')) {
    const id = nextId();
    db.stores.push({
      id, owner: ME, name: String(b?.name ?? 'My store'), description: String(b?.description ?? ''), category: String(b?.category ?? 'General'), tags: [], open: true,
      opens: '09:00', closes: '17:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'], rating: 0, rating_count: 0, sales: 0, verified: false,
      lat: db.CENTER.lat, lon: db.CENTER.lon, created: new Date().toISOString(), products: [],
    });
    return { body: { status: true, store: { id } } };
  }
  if (is('POST', '/store/product')) {
    const s = db.storeById(q.store_id);
    if (!s) return fail(404, 'Store not found.');
    const id = nextId();
    const media: string[] = Array.isArray(b?.media_urls) ? b.media_urls.filter(Boolean) : [];
    s.products.unshift({ id, name: String(b?.name ?? 'Product'), price: Number(b?.price ?? 0), description: String(b?.description ?? ''), photos: media.length ? media : [photo(`p-${id}`, 700, 700)], in_stock: b?.in_stock !== false, swap: !!b?.swap_allowed, created: new Date().toISOString() });
    return { status: 200, body: undefined };
  }

  /* streams */
  if (is('GET', '/stream/list')) {
    const rows = db.streams.filter((s) => s.space === q.space_id && (!q.status || s.status === q.status));
    return rows.length ? { body: { status: true, streams: rows.map((s) => streamOut(s)) } } : empty();
  }
  if (is('GET', '/stream/data')) {
    const s = db.streams.find((x) => x.id === q.stream_id);
    return s ? { body: { status: true, stream: streamOut(s), is_creator: s.creator === ME, can_manage: s.creator === ME } } : empty();
  }
  if (is('GET', '/stream/active')) {
    const s = db.streams.find((x) => x.creator === ME && x.status === 'live');
    return s ? { body: { status: true, stream: streamOut(s) } } : empty();
  }
  if (is('GET', '/stream/participants')) {
    const s = db.streams.find((x) => x.id === q.stream_id);
    if (!s) return empty();
    const ids = [s.creator, ...db.spaceById(s.space)!.members.filter((x) => x !== s.creator)].slice(0, 6);
    return { body: { status: true, participants: ids.map((id, i) => { const u = db.userById(id)!; return { user_id: u.id, username: u.username, display_name: u.display_name, profile_pic_url: u.pic, role: i === 0 ? 'publisher' : 'viewer', join_count: 1, first_joined_at: ago(6), last_left_at: null, removed_at: null }; }) } };
  }
  if (is('POST', '/stream/start')) {
    const spaceId = String(b?.space_id ?? q.space_id ?? '');
    const id = nextId();
    db.streams.unshift({ id, space: spaceId, creator: ME, title: String(b?.title ?? 'Live now'), status: 'live', started: new Date().toISOString(), ended: null, upvotes: new Set(), viewers: 1, peak: 1, total: 1, post: null });
    return { body: { status: true, stream_id: id, livekit_url: 'wss://demo.invalid', livekit_token: 'demo' } };
  }
  if (is('POST', '/stream/publisher_token') || is('POST', '/stream/join')) {
    const id = String(b?.stream_id ?? q.stream_id ?? '');
    const s = db.streams.find((x) => x.id === id);
    if (s && p.endsWith('join')) {
      s.viewers++;
      s.total++;
      s.peak = Math.max(s.peak, s.viewers);
    }
    return { body: { status: true, stream_id: id, livekit_url: 'wss://demo.invalid', livekit_token: 'demo' } };
  }
  if (is('POST', '/stream/upvote') || is('DELETE', '/stream/upvote')) {
    const s = db.streams.find((x) => x.id === String(b?.stream_id ?? q.stream_id));
    if (s) m === 'POST' ? s.upvotes.add(ME) : s.upvotes.delete(ME);
    return ok({ upvote_count: s?.upvotes.size ?? 0 });
  }
  if (is('POST', '/stream/remove_participant')) return ok();
  if (is('POST', '/stream/end')) {
    const s = db.streams.find((x) => x.id === String(b?.stream_id ?? q.stream_id));
    if (s) {
      s.status = 'ended';
      s.ended = new Date().toISOString();
    }
    return ok({ stream_status: 'ended' });
  }

  /* uploads: nothing is stored, the "uploaded" file just gets a stand-in picture */
  if (is('POST', '/post/presign_url')) {
    const names: string[] = Array.isArray(b?.filenames) ? b.filenames : ['file'];
    return { body: { status: true, fileUrl: names.map(() => photo(`up-${nextId()}`, 900, 900)), uploadUrl: names.map(() => 'demo://upload') } };
  }

  /* push registration */
  if (m !== 'GET' && p.startsWith('/fire_b_service')) return ok();

  return fail(404, `Not part of the demo: ${m} ${p}`);
}

function productRow(x: db.DProduct) {
  return { id: x.id, name: x.name, price: x.price, currency: 'GHS', thumbnail_url: x.photos[0], in_stock: x.in_stock, swap_allowed: x.swap, created_at: x.created };
}
