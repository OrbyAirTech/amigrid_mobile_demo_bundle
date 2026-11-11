/**
 * The demo data. Everything here lives in memory and is rebuilt on every app launch, so a demo can always be
 * run again from the same starting point. Names, places and pictures are made up; swap them freely.
 */

export const ME = '2001';
export const CENTER = { lat: 5.6037, lon: -0.187 }; // Accra

const MIN = 60_000;
export const ago = (minutes: number) => new Date(Date.now() - minutes * MIN).toISOString();
export const ahead = (minutes: number) => new Date(Date.now() + minutes * MIN).toISOString();

export const avatar = (n: number) => `https://i.pravatar.cc/300?img=${n}`;
export const photo = (seed: string, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

let counter = 9000;
export const nextId = () => String(++counter);

/* ---- people ---- */
export type DUser = {
  id: string;
  username: string;
  full_name: string;
  display_name: string;
  bio: string;
  pic: string;
  links: string[];
  birthday: string;
  lat: number;
  lon: number;
};

const person = (id: string, username: string, name: string, bio: string, img: number, dLat: number, dLon: number): DUser => ({
  id,
  username,
  full_name: name,
  display_name: name.split(' ')[0],
  bio,
  pic: avatar(img),
  links: [],
  birthday: '1999-04-12',
  lat: CENTER.lat + dLat,
  lon: CENTER.lon + dLon,
});

export const users: DUser[] = [
  person(ME, 'kofi.mensah', 'Kofi Mensah', 'Builder of small things. Coffee, football and Saturday markets.', 12, 0, 0),
  person('2002', 'efua.d', 'Efua Danso', 'Photographer. Chasing golden hour across Accra.', 5, 0.004, 0.003),
  person('2003', 'adwoa.kente', 'Adwoa Owusu', 'Weaver and designer. Kente, with a modern twist.', 47, -0.006, 0.005),
  person('2004', 'nana.yaw', 'Nana Yaw Boadu', 'Full-stack dev. Organiser at Accra Techies.', 33, 0.009, -0.004),
  person('2005', 'zee.musa', 'Zainab Musa', 'Runner. Beach mornings, jollof evenings.', 44, -0.002, 0.011),
  person('2006', 'dan.ofori', 'Daniel Ofori', 'Student at Legon. Robotics club.', 15, 0.012, 0.002),
  person('2007', 'akos.f', 'Akosua Frimpong', 'Food lover. Reviews every kitchen in town.', 29, -0.008, -0.006),
  person('2008', 'sam.tetteh', 'Samuel Tetteh', 'Electronics repair and tinkering.', 52, 0.003, -0.009),
  person('2009', 'lydia.q', 'Lydia Quaye', 'Event host. If there is a party I know about it.', 23, -0.011, 0.001),
  person('2010', 'mike.asante', 'Michael Asante', 'Cyclist and weekend photographer.', 60, 0.007, 0.008),
  person('2011', 'esi.nyarko', 'Esi Nyarko', 'Organic farmer, market regular.', 9, -0.004, -0.012),
  person('2012', 'ibrahim.i', 'Ibrahim Issah', 'Drummer. Always looking for a jam session.', 68, 0.014, -0.007),
];
export const userById = (id: string) => users.find((u) => u.id === id);

/** Who I am friends with, who I've asked, and who has asked me. */
export const amigos = new Set<string>(['2002', '2003', '2004', '2005', '2006', '2009']);
export const sentRequests = new Set<string>(['2010']);
export const incomingRequests: { request_id: string; user_id: string; at: string }[] = [
  { request_id: '8001', user_id: '2007', at: ago(95) },
  { request_id: '8002', user_id: '2011', at: ago(60 * 20) },
];
/** Amigos of other people (for browsing their profile). */
export const amigosOf: Record<string, string[]> = {
  '2002': [ME, '2003', '2005', '2009', '2010', '2012'],
  '2003': [ME, '2002', '2007', '2011'],
  '2004': [ME, '2006', '2008', '2012'],
  '2005': [ME, '2002', '2009', '2010'],
  '2006': [ME, '2004', '2008'],
  '2009': [ME, '2002', '2005', '2007', '2010'],
};

/* ---- grids ---- */
export type DSpace = {
  id: string;
  name: string;
  description: string;
  type: 'event' | 'campus' | 'organization' | 'custom';
  visibility: 'public' | 'private';
  access: 'open' | 'closed' | 'secure';
  creator: string;
  members: string[];
  admins: string[];
  lat: number;
  lon: number;
  radius: number;
  created: string;
  trending: number;
};

const space = (
  id: string,
  name: string,
  description: string,
  type: DSpace['type'],
  creator: string,
  members: string[],
  dLat: number,
  dLon: number,
  trending: number,
  access: DSpace['access'] = 'open',
  visibility: DSpace['visibility'] = 'public',
): DSpace => ({
  id,
  name,
  description,
  type,
  visibility,
  access,
  creator,
  members,
  admins: [creator],
  lat: CENTER.lat + dLat,
  lon: CENTER.lon + dLon,
  radius: 600,
  created: ago(60 * 24 * 40),
  trending,
});

export const spaces: DSpace[] = [
  space('3001', 'Legon Campus Hub', 'Everything happening around campus: lectures, clubs, food spots and late-night study groups.', 'campus', '2006', [ME, '2002', '2004', '2006', '2008', '2012'], 0.016, 0.004, 96),
  space('3002', 'Osu Night Market', 'Street food, music and good company every Friday from 6pm.', 'event', '2009', ['2009', '2002', '2007', '2010'], -0.006, 0.009, 88),
  space('3003', 'Accra Techies', 'Meetups, demos and job leads for builders in Accra.', 'organization', '2004', [ME, '2004', '2006', '2008', '2003'], 0.008, -0.003, 81),
  space('3004', 'Labadi Beach Runners', 'Sunrise runs along the coast. All paces welcome.', 'custom', '2005', [ME, '2005', '2002', '2010', '2009'], -0.012, 0.014, 74),
  space('3005', 'Jamestown Photo Walk', 'Monthly walks with cameras, old lighthouses and fresh fish.', 'custom', '2002', ['2002', '2010', '2003'], -0.009, -0.011, 62),
  space('3006', 'Makola Foodies', 'Where to eat, what to order, who to ask. Invite only.', 'custom', '2007', ['2007', '2011', '2009'], -0.003, -0.002, 55, 'secure', 'private'),
];
/** You run these grids, so Go Live shows in their feed. */
for (const id of ['3001', '3003', '3004']) spaces.find((x) => x.id === id)!.admins.push(ME);
export const spaceById = (id: string) => spaces.find((s) => s.id === id);
export const spaceProfile = (s: DSpace) => photo(`grid-${s.id}`, 300, 300);
export const spaceBanner = (s: DSpace) => photo(`banner-${s.id}`, 900, 400);

/* ---- stores ---- */
export type DProduct = { id: string; name: string; price: number; description: string; photos: string[]; in_stock: boolean; swap: boolean; created: string };
export type DStore = {
  id: string;
  owner: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  open: boolean;
  opens: string;
  closes: string;
  days: string[];
  rating: number;
  rating_count: number;
  sales: number;
  verified: boolean;
  lat: number;
  lon: number;
  created: string;
  products: DProduct[];
};

const product = (id: string, name: string, price: number, description: string, stock = true, swap = false): DProduct => ({
  id,
  name,
  price,
  description,
  photos: [photo(`p-${id}-a`, 700, 700), photo(`p-${id}-b`, 700, 700)],
  in_stock: stock,
  swap,
  created: ago(60 * 24 * 12),
});

const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const stores: DStore[] = [
  {
    id: '4001', owner: '2003', name: 'Adwoa Kente Studio', category: 'Fashion', tags: ['kente', 'handmade', 'tailoring'],
    description: 'Hand-woven kente stoles, bags and made-to-measure outfits.', open: true, opens: '09:00', closes: '18:00', days: WEEK,
    rating: 4.8, rating_count: 126, sales: 412, verified: true, lat: CENTER.lat - 0.006, lon: CENTER.lon + 0.005, created: ago(60 * 24 * 200),
    products: [
      product('5001', 'Kente stole', 180, 'Hand-woven strip kente stole in gold and green.'),
      product('5002', 'Woven clutch', 120, 'Small clutch with a kente front and cotton lining.', true, true),
      product('5003', 'Graduation sash', 95, 'Custom colours, ready in three days.'),
    ],
  },
  {
    id: '4002', owner: '2011', name: 'Fresh Basket Organics', category: 'Groceries', tags: ['organic', 'farm', 'delivery'],
    description: 'Vegetables and fruit from our farm in Dodowa, delivered twice a week.', open: true, opens: '07:00', closes: '17:00', days: [...WEEK, 'sun'],
    rating: 4.6, rating_count: 84, sales: 640, verified: true, lat: CENTER.lat - 0.004, lon: CENTER.lon - 0.012, created: ago(60 * 24 * 150),
    products: [
      product('5004', 'Veggie box (small)', 60, 'Tomatoes, peppers, garden eggs, kontomire and onions.'),
      product('5005', 'Pineapples (3)', 35, 'Sweet, picked this week.'),
      product('5006', 'Free-range eggs (tray)', 55, 'Thirty eggs from our own hens.', false),
    ],
  },
  {
    id: '4003', owner: '2008', name: 'Circuit Corner', category: 'Electronics', tags: ['repairs', 'phones', 'accessories'],
    description: 'Phone repairs, chargers, speakers and spare parts. Same-day screen swaps.', open: false, opens: '10:00', closes: '19:00', days: WEEK,
    rating: 4.4, rating_count: 57, sales: 233, verified: false, lat: CENTER.lat + 0.003, lon: CENTER.lon - 0.009, created: ago(60 * 24 * 90),
    products: [
      product('5007', 'Fast charger 33W', 85, 'USB-C charger with cable, one year warranty.'),
      product('5008', 'Bluetooth speaker', 210, 'Waterproof, twelve hours of battery.', true, true),
      product('5009', 'Screen replacement', 250, 'Most phone models, done while you wait.'),
    ],
  },
  {
    id: '4004', owner: '2007', name: 'Mama Put Kitchen', category: 'Food', tags: ['jollof', 'waakye', 'lunch'],
    description: 'Home-style lunch plates. Order before 11 and we bring it to your door.', open: true, opens: '08:00', closes: '20:00', days: [...WEEK, 'sun'],
    rating: 4.9, rating_count: 301, sales: 1980, verified: true, lat: CENTER.lat - 0.008, lon: CENTER.lon - 0.006, created: ago(60 * 24 * 300),
    products: [
      product('5010', 'Jollof and chicken', 45, 'Smoky party jollof with grilled chicken and shito.'),
      product('5011', 'Waakye special', 40, 'Waakye with fish, egg, spaghetti and gari.'),
      product('5012', 'Banku and tilapia', 70, 'Grilled tilapia, hot pepper and fresh banku.'),
    ],
  },
  {
    id: '4005', owner: ME, name: 'Kofi Prints', category: 'Services', tags: ['printing', 'tees', 'stickers'],
    description: 'Custom tees, stickers and posters for teams, events and small brands.', open: true, opens: '09:00', closes: '17:00', days: WEEK,
    rating: 4.7, rating_count: 22, sales: 61, verified: false, lat: CENTER.lat + 0.001, lon: CENTER.lon + 0.001, created: ago(60 * 24 * 60),
    products: [
      product('5013', 'Custom tee', 70, 'Cotton tee with your design on the front.'),
      product('5014', 'Sticker pack (50)', 40, 'Weatherproof vinyl, any shape.'),
    ],
  },
];
export const storeById = (id: string) => stores.find((s) => s.id === id);
export const storeLogo = (s: DStore) => photo(`store-${s.id}`, 300, 300);
export const storeBanner = (s: DStore) => photo(`storebanner-${s.id}`, 900, 400);

/* ---- posts ---- */
export type DPost = {
  id: string;
  author: string;
  space: string | null;
  parent: string | null;
  content: string;
  media: string[];
  views: number;
  likes: Set<string>;
  created: string;
  stream: string | null;
};

const post = (id: string, author: string, space: string | null, content: string, media: number, minutes: number, likes: string[], parent: string | null = null, stream: string | null = null): DPost => ({
  id,
  author,
  space,
  parent,
  content,
  media: Array.from({ length: media }, (_, i) => photo(`post-${id}-${i}`, 900, 900)),
  views: 40 + Number(id.slice(-2)) * 7,
  likes: new Set(likes),
  created: ago(minutes),
  stream,
});

export const posts: DPost[] = [
  post('6001', '2002', '3004', 'Sunrise at Labadi. Thirty of us today and the sea was perfect.', 2, 25, ['2005', '2009', ME, '2010']),
  post('6002', '2004', '3003', 'Demo night is next Thursday. Bring something you built this month, however small.', 0, 55, ['2006', '2008', ME]),
  post('6003', '2006', '3001', 'Robotics club just got our line follower around the track without a single crash. Come see it in the lab.', 1, 90, ['2004', '2008']),
  post('6004', '2009', '3002', 'Friday market is going to be loud. Two bands, six food stalls, one very good DJ.', 1, 140, ['2002', '2007', '2010', ME]),
  post('6005', '2003', null, 'New batch of kente stoles just landed. Gold and green are going quickly.', 3, 200, ['2002', '2009', ME, '2005']),
  post('6006', '2005', '3004', 'Pace group A, you were flying. See you Saturday at 5:30 sharp.', 0, 260, ['2002', ME]),
  post('6007', '2002', '3005', 'Old lighthouse, fresh light. Next walk is on the 14th.', 2, 330, ['2010', '2003', ME, '2009']),
  post('6008', '2008', '3003', 'Fixed forty screens this week. Ask me anything about phone repairs.', 0, 400, ['2004']),
  post('6009', ME, '3003', 'Shipping the first demo of Amigrid this month. Grids, live streams and a chat that expires. Feedback welcome.', 1, 480, ['2004', '2002', '2006', '2003']),
  post('6010', '2010', null, 'Cycled from Osu to Tema and back before breakfast.', 1, 600, ['2005', '2002']),
  post('6011', '2012', '3001', 'Drum circle on the library steps tonight at 8. Bring anything that makes noise.', 1, 720, ['2006', '2004', ME]),
  post('6012', '2007', null, 'Best waakye in Osu? I have a list and you will not agree with it.', 0, 900, ['2009', '2003']),
  post('6013', '2004', '3003', 'We are live now with a walkthrough of the new API. Join in and ask questions.', 0, 8, ['2006'], null, '7001'),
  // replies
  post('6101', '2004', '3003', 'Count me in. I will bring the line follower from the robotics club.', 0, 40, ['2006'], '6002'),
  post('6102', ME, '3003', 'I will demo the live streaming bit. See you there.', 0, 35, ['2004', '2008'], '6002'),
  post('6103', '2005', '3004', 'Sunrise runs are the only reason I wake up before six.', 0, 20, ['2002'], '6001'),
  post('6104', ME, '3004', 'Beautiful shot. Which lens was that?', 0, 18, ['2002'], '6001'),
];
export const postById = (id: string) => posts.find((p) => p.id === id);

/* ---- events ---- */
export type DEvent = { id: string; space: string; title: string; starts: string; ends: string; creator: string; stream?: string };
export const events: DEvent[] = [
  { id: '9501', space: '3003', title: 'Demo night: build in public', starts: ago(20), ends: ahead(100), creator: '2004', stream: '7001' },
  { id: '9502', space: '3002', title: 'Friday night market', starts: ahead(60 * 5), ends: ahead(60 * 10), creator: '2009' },
  { id: '9503', space: '3004', title: 'Saturday sunrise 5K', starts: ahead(60 * 20), ends: ahead(60 * 22), creator: '2005' },
  { id: '9504', space: '3005', title: 'Lighthouse photo walk', starts: ahead(60 * 24 * 4), ends: ahead(60 * 24 * 4 + 180), creator: '2002' },
  { id: '9505', space: '3001', title: 'Robotics open lab', starts: ahead(60 * 24 * 2), ends: ahead(60 * 24 * 2 + 240), creator: '2006' },
  { id: '9506', space: '3003', title: 'Intro to React Native', starts: ago(60 * 24 * 6), ends: ago(60 * 24 * 6 - 120), creator: '2004' },
];

/* ---- streams ---- */
export type DStream = {
  id: string;
  space: string;
  creator: string;
  title: string;
  status: 'live' | 'ended';
  started: string;
  ended: string | null;
  upvotes: Set<string>;
  viewers: number;
  peak: number;
  total: number;
  post: string | null;
};
export const streams: DStream[] = [
  // Accra Techies
  { id: '7001', space: '3003', creator: '2004', title: 'New API walkthrough', status: 'live', started: ago(8), ended: null, upvotes: new Set(['2006', '2008']), viewers: 37, peak: 41, total: 58, post: '6013' },
  { id: '7004', space: '3003', creator: '2008', title: 'Cracked screen, fixed live', status: 'live', started: ago(14), ended: null, upvotes: new Set(['2004']), viewers: 22, peak: 29, total: 40, post: null },
  { id: '7005', space: '3003', creator: '2003', title: 'Weaving kente, behind the scenes', status: 'live', started: ago(31), ended: null, upvotes: new Set(['2004', '2006', '2008']), viewers: 51, peak: 56, total: 90, post: null },
  // Labadi Beach Runners
  { id: '7002', space: '3004', creator: '2005', title: 'Sunrise run, live from Labadi', status: 'live', started: ago(22), ended: null, upvotes: new Set(['2002', '2009', '2010']), viewers: 64, peak: 70, total: 120, post: null },
  { id: '7008', space: '3004', creator: '2002', title: 'Golden hour on the beach', status: 'live', started: ago(11), ended: null, upvotes: new Set(['2005']), viewers: 33, peak: 38, total: 52, post: null },
  { id: '7009', space: '3004', creator: '2010', title: 'Cooldown ride along the coast', status: 'live', started: ago(4), ended: null, upvotes: new Set<string>(), viewers: 12, peak: 12, total: 15, post: null },
  // Legon Campus Hub
  { id: '7003', space: '3001', creator: '2012', title: 'Drum circle warm-up', status: 'live', started: ago(5), ended: null, upvotes: new Set(['2006']), viewers: 18, peak: 18, total: 21, post: null },
  { id: '7006', space: '3001', creator: '2006', title: 'Line follower test run', status: 'live', started: ago(17), ended: null, upvotes: new Set(['2004', '2012']), viewers: 27, peak: 31, total: 44, post: null },
  // Osu Night Market
  { id: '7010', space: '3002', creator: '2009', title: 'Friday market setup', status: 'live', started: ago(26), ended: null, upvotes: new Set(['2002', '2007']), viewers: 45, peak: 49, total: 77, post: null },
  { id: '7011', space: '3002', creator: '2007', title: 'Street food tour, stall by stall', status: 'live', started: ago(9), ended: null, upvotes: new Set(['2009']), viewers: 29, peak: 33, total: 41, post: null },
];

/* ---- notifications ---- */
export type DNote = { id: string; message: string; read: boolean; at: string; from: string; table: string; ref: string };
export const notes: DNote[] = [
  { id: '9801', message: 'sent you an amigo request', read: false, at: ago(95), from: '2007', table: 'users', ref: '2007' },
  { id: '9802', message: 'liked your post', read: false, at: ago(120), from: '2004', table: 'post', ref: '6009' },
  { id: '9803', message: 'started a live stream in Accra Techies', read: false, at: ago(8), from: '2004', table: 'spaces', ref: '3003' },
  { id: '9804', message: 'replied to your post', read: true, at: ago(300), from: '2002', table: 'post', ref: '6104' },
  { id: '9805', message: 'posted in Labadi Beach Runners', read: true, at: ago(25), from: '2002', table: 'spaces', ref: '3004' },
  { id: '9806', message: 'accepted your amigo request', read: true, at: ago(60 * 30), from: '2006', table: 'users', ref: '2006' },
  { id: '9807', message: 'added you to Accra Techies', read: true, at: ago(60 * 52), from: '2004', table: 'spaces', ref: '3003' },
];

/* ---- account ---- */
export const settings = {
  is_profile_public: true,
  show_email: false,
  show_phone: false,
  show_birthday: true,
  broadcast_location: true,
  notify_email: true,
  notify_sms: false,
  notify_push: true,
  two_factor_enabled: false,
  login_alerts: true,
  theme: 'light',
  language: 'en',
};
export const account = { email: 'kofi@amigrid.demo', phone: '+233 24 000 0000' };

/* ---- chat ---- */
export type DChatMsg = { _id: string; chat_id: string; from: string; to: string; message: string; media_url: string | null; post_id: string | null; read: boolean; timestamp: string };
export type DChat = {
  id: string;
  other: string;
  status: 'active' | 'requested' | 'rejected';
  requested_by: string;
  pinned: boolean;
  expires: string;
  activity: string;
  messages: DChatMsg[];
};

const msg = (chat: string, n: number, from: string, to: string, message: string, minutes: number, read = true): DChatMsg => ({
  _id: `m${chat}-${n}`, chat_id: chat, from, to, message, media_url: null, post_id: null, read, timestamp: ago(minutes),
});

export const chats: DChat[] = [
  {
    id: 'c1', other: '2004', status: 'active', requested_by: ME, pinned: true, expires: ahead(60 * 20), activity: ago(6),
    messages: [
      msg('c1', 1, '2004', ME, 'Hey Kofi, are you presenting at demo night?', 70),
      msg('c1', 2, ME, '2004', 'Yes. Doing the live streaming part.', 66),
      msg('c1', 3, '2004', ME, 'Nice. We are going live in about ten minutes, can you check the audio?', 12),
      msg('c1', 4, ME, '2004', 'On it.', 9),
      msg('c1', 5, '2004', ME, 'Perfect. Thanks man.', 6, false),
    ],
  },
  {
    id: 'c2', other: '2002', status: 'active', requested_by: '2002', pinned: false, expires: ahead(60 * 9), activity: ago(45),
    messages: [
      msg('c2', 1, '2002', ME, 'Sent you the Labadi photos. Which ones do you want for the post?', 120),
      msg('c2', 2, ME, '2002', 'The one with the fishing boats, it is the best.', 100),
      msg('c2', 3, '2002', ME, 'Done. Posted it to the grid.', 45, false),
    ],
  },
  {
    id: 'c3', other: '2005', status: 'active', requested_by: ME, pinned: false, expires: ahead(60 * 14), activity: ago(180),
    messages: [
      msg('c3', 1, ME, '2005', 'Saturday run still on?', 200),
      msg('c3', 2, '2005', ME, '5:30 at the beach car park. Bring water.', 180),
    ],
  },
  {
    // An expired, unpinned chat: shows the "Request talk" button.
    id: 'c4', other: '2006', status: 'active', requested_by: ME, pinned: false, expires: ago(300), activity: ago(60 * 30),
    messages: [
      msg('c4', 1, ME, '2006', 'Is the robotics lab open tomorrow?', 60 * 31),
      msg('c4', 2, '2006', ME, 'Yes, from nine.', 60 * 30),
    ],
  },
  {
    // Someone asking to talk to me: shows in requests.
    id: 'c5', other: '2008', status: 'requested', requested_by: '2008', pinned: false, expires: ahead(60 * 22), activity: ago(30),
    messages: [msg('c5', 1, '2008', ME, 'Hi Kofi, I saw your store. Do you print on caps as well?', 30, false)],
  },
  {
    // A request I sent that has not been answered yet.
    id: 'c6', other: '2009', status: 'requested', requested_by: ME, pinned: false, expires: ahead(60 * 21), activity: ago(120),
    messages: [msg('c6', 1, ME, '2009', 'Hey Lydia, can I list Kofi Prints at the Friday market?', 120)],
  },
];

export const chatSettings = {
  allow_read_receipts: true,
  show_online_status: true,
  mute_all_notifications: false,
  show_message_preview: true,
  theme_preference: 'light',
};
export const blocked = new Set<string>();
export const muted = new Set<string>(['2012']);

/** Short replies the people in the demo chats send back, so a conversation feels alive on camera. */
export const REPLIES = [
  'Ha, nice one.',
  'Sounds good to me.',
  'Let me check and get back to you.',
  'Yes, count me in.',
  'Can you send more details?',
  'Perfect, see you there.',
  'That is exactly what I was thinking.',
  'Love it. Let us do it.',
];
