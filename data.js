// data.js — PartHunter
// Live products now come from partner shops' real Shopify feeds via /api/shops.
// Mock data has been removed. These arrays are populated at runtime from the live feed.

// Real source homepages (used as fallback links if a card has no direct product URL).
const SOURCE_URLS = {
  'Name-it Performance': 'https://www.name-it.ae'
  // future shops added automatically via their card.url from /api/shops
};

// Populated live from /api/shops at page load. Start empty.
let CATALOGUE = [];
let FEATURED = [];

// Listings submitted by users this session (resets on reload — demo only).
let USER_LISTINGS = [];
