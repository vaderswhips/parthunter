// data.js — PartHunter mock catalogue
// FEATURED parts are the sponsored slots shops can pay to occupy on the homepage.
// USER_LISTINGS holds parts submitted via the "Sell a part" form (in-session demo).

const SOURCES = [
  'Deep Performance', 'Bin Jumah', 'Dubizzle', 'FMIC UAE',
  'Facebook Marketplace', 'YP Performance', 'Intraco', 'Atomic Shop', 'Prowayparts'
];

// Real homepages for each source. Cards link here until live product feeds
// replace the mock data with actual per-product URLs.
const SOURCE_URLS = {
  'Deep Performance': 'https://www.deepperformance.com',
  'Bin Jumah': 'https://binjumah.net',
  'FMIC UAE': 'https://fmic.ae',
  'YP Performance': 'https://yperformance1.com',
  'Intraco': 'https://intracotrading.com',
  'Atomic Shop': 'https://atomic-shop.ae',
  'Prowayparts': 'https://www.prowayparts.ae',
  'Dubizzle': 'https://www.dubizzle.com',
  'Facebook Marketplace': 'https://www.facebook.com/marketplace'
  // 'Community listing' intentionally omitted — user submissions have no external page.
};

// Featured = paid placement. `featured:true` shows the gold "Featured" badge.
const FEATURED = [
  { n: 'PSR Single Turbo Manifold Kit', src: 'Deep Performance', price: '4,200', emoji: '🌀', condition: 'New', featured: true },
  { n: 'Garrett GTX3076R Gen II', src: 'Bin Jumah', price: '5,800', emoji: '💨', condition: 'New', featured: true },
  { n: 'Front Mount Intercooler 600x300', src: 'FMIC UAE', price: '1,450', emoji: '❄️', condition: 'New', featured: true },
  { n: 'BC Racing BR Coilovers — S14', src: 'YP Performance', price: '3,100', emoji: '🔩', condition: 'New', featured: true },
  { n: '1000cc Injector Set', src: 'Atomic Shop', price: '2,250', emoji: '⛽', condition: 'New', featured: true },
  { n: 'Walbro 460 Fuel Pump', src: 'Intraco', price: '480', emoji: '⛽', condition: 'New', featured: true },
];

// Regular (non-featured) aggregated results, including used finds.
const CATALOGUE = [
  ...FEATURED,
  { n: 'Used RB25DET Loom + ECU', src: 'Dubizzle', price: '1,900', emoji: '🔌', condition: 'Used' },
  { n: 'Work Meister S1 18" (used)', src: 'Facebook Marketplace', price: '4,600', emoji: '🛞', condition: 'Used' },
  { n: 'Z32 AFM (used, tested)', src: 'Dubizzle', price: '350', emoji: '🌬️', condition: 'Used' },
];

// Listings submitted by users this session (resets on reload — demo only).
let USER_LISTINGS = [];
