/**
 * Keewatin Self Storage — StorEdge Availability Scraper
 * ─────────────────────────────────────────────────────
 * Run from the keewatin-website folder:
 *   node scraper.js
 *
 * What it does:
 *   1. Opens the StorEdge rental portal in a headless browser
 *   2. Reads each unit's name, price, and availability
 *   3. Writes the result to data/availability.json
 *   4. Your website reads that file and shows live badges
 *
 * First time setup (run once):
 *   npm install puppeteer
 *
 * Schedule it automatically (optional):
 *   crontab -e  →  add:  0 * * * * cd /path/to/keewatin-website && node scraper.js
 *   (runs every hour on the hour)
 */

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

const RENT_URL = [
  'https://rental-center.storedge.com/?',
  'companyId=ef2375f3-b212-4670-bbc0-be544f6614b6',
  '&facilityId=4e5d19f2-a80f-45d0-ba9f-e13f89f04275',
  '#/move-in'
].join('');

const OUT_FILE = path.join(__dirname, 'data', 'availability.json');

// Maps StorEdge unit name → our key
const UNIT_KEY_MAP = {
  '8 x 10':  '8x10',
  '8x10':    '8x10',
  '10 x 10': '10x10',
  '10x10':   '10x10',
  '12 x 10': '12x10',
  '12x10':   '12x10',
  '10 x 24': '10x24',
  '10x24':   '10x24',
};

(async () => {
  console.log('🔍 Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  console.log('🌐 Loading StorEdge rental center...');
  await page.goto(RENT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000)); // let Angular finish rendering

  // ── Extract unit cards ──────────────────────────────────────────────────────
  const scraped = await page.evaluate(() => {
    const results = [];

    // StorEdge renders unit-type cards — try several selector patterns
    const selectors = [
      '.unit-type-card', '.unit-card', '[class*="unit-type"]',
      '.available-unit', '.panel', '[class*="UnitType"]'
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = [...document.querySelectorAll(sel)];
      if (cards.length > 0) break;
    }

    // Fallback: grab all visible text and look for size/price pairs
    if (cards.length === 0) {
      const allText = document.body.innerText;
      return { fallbackText: allText.slice(0, 5000), cards: [] };
    }

    cards.forEach(card => {
      const text      = card.innerText || '';
      const available = !/not available/i.test(text) &&
                        !/unavailable/i.test(text) &&
                        !!card.querySelector('button:not([disabled])');
      const sizeMatch  = text.match(/(\d+\s*[x×]\s*\d+)/i);
      const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
      results.push({
        rawText:   text.trim().slice(0, 200),
        size:      sizeMatch  ? sizeMatch[1].replace(/\s/g,'').toLowerCase() : null,
        price:     priceMatch ? '$' + priceMatch[1] : null,
        available
      });
    });

    return { cards: results, fallbackText: null };
  });

  await browser.close();

  // ── Parse results ───────────────────────────────────────────────────────────
  console.log(`\n📦 Found ${scraped.cards.length} unit card(s)\n`);

  // Load existing JSON to preserve any manual overrides
  let existing = { units: {} };
  try { existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); } catch {}

  const units = { ...existing.units };

  if (scraped.cards.length > 0) {
    scraped.cards.forEach(card => {
      if (!card.size) return;
      // Normalise key: "8x10", "10x10" etc
      const normalised = card.size.replace(/[^0-9x]/gi, '');
      const key = UNIT_KEY_MAP[normalised] || UNIT_KEY_MAP[card.rawText.match(/\d+\s*[x×]\s*\d+/i)?.[0]?.replace(/\s/g,'')] || null;
      if (!key) return;

      units[key] = {
        ...units[key],
        available: card.available,
        price:     card.price || units[key]?.price,
        lastSeen:  new Date().toISOString()
      };

      const status = card.available ? '🟢 AVAILABLE' : '🔴 Not Available';
      console.log(`  ${key.padEnd(6)}  ${(card.price || '?').padEnd(6)}  ${status}`);
    });
  } else if (scraped.fallbackText) {
    // Page didn't render expected selectors — print raw text for debugging
    console.log('⚠️  Could not find unit cards. Raw page text:');
    console.log(scraped.fallbackText.slice(0, 1000));
  }

  // ── Write output ────────────────────────────────────────────────────────────
  const output = {
    lastUpdated: new Date().toISOString(),
    facilityId:  '4e5d19f2-a80f-45d0-ba9f-e13f89f04275',
    units
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Saved to data/availability.json`);
  console.log(`   ${new Date().toLocaleString()}\n`);
})().catch(err => {
  console.error('❌ Scraper error:', err.message);
  process.exit(1);
});
