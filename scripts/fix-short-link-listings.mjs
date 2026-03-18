#!/usr/bin/env node
/**
 * Migration script: Fix listings with unexpanded short-link productUrls
 * and offers with third-party affiliate params in affiliateUrl.
 *
 * What it does:
 * 1. Finds all Listings where productUrl contains a short-link domain
 * 2. Expands each short link (up to 2 hops for chain redirects)
 * 3. Cleans tracking params from the expanded URL
 * 4. Re-detects marketplace from expanded URL
 * 5. Updates Listing.productUrl + Listing.externalId if improved
 * 6. Updates Offer.affiliateUrl — strips third-party params
 *
 * Run: node scripts/fix-short-link-listings.mjs [--dry-run]
 */

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

// ── Short link domains (must match canonicalizer.ts) ────────────────────────

const SHORT_LINK_HOSTS = [
  'bit.ly', 'bitly.com', 't.co', 'tinyurl.com', 'goo.gl',
  'cutt.ly', 'rebrand.ly', 'ow.ly', 'is.gd', 'v.gd',
  'short.io', 'bl.ink', 'soo.gd', 'clck.ru', 'rb.gy',
  'go.ly', 'ouo.io', 'linktr.ee',
  'tidd.ly', 'magalu.lu', 'app.magalu.com',
  'divulguei.app', 'tempromo.app.br',
  'amzn.to', 'a.co',
  's.shopee.com.br', 'shopee.com.br/universal-link',
  'mercadolivre.com/sec', 'meli.la',
  'shein.com/universal-link', 'shein.top', 'dl.shein.com',
  's.aliexpress.com', 'a.aliexpress.com', 's.click.aliexpress.com',
];

const REDIRECT_PATH_PATTERNS = [
  /^\/social\//i,
  /^\/sec\//i,
  /^\/go\//i,
  /^\/redirect/i,
];

// ── Tracking params to strip ────────────────────────────────────────────────

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'fbclid', 'gclid', 'gad_source', 'gbraid', 'wbraid',
  'mc_cid', 'mc_eid', '_gl', '_ga',
  'spm', 'pvid', 'scm', 'algo_pvid', 'algo_exp_id',
  'ns', 'aff_fcid', 'aff_fsk', 'aff_platform', 'aff_trace_key',
  'sk', 'aff_id',
  'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pf_rd_p', 'pf_rd_r',
  'linkId', 'smid', 'psc', 'camp', 'creative', 'creativeASIN',
  'ascsubtag', 'geniuslink',
  'gads_t_sig', 'mmp_pid', 'uls_trackid', 'exp_group', '__mobile__',
  'matt_word', 'matt_tool', 'matt_source', 'matt_campaign',
  'forceInApp', 'deal_print_id', 'promotion_id',
]);

// ── Marketplace detection (simplified from parser.ts) ───────────────────────

const MARKETPLACES = [
  {
    slug: 'mercadolivre',
    name: 'Mercado Livre',
    patterns: [/mercadolivre\.com\.br/i, /mercadolibre\.com/i],
    idExtractor: (url) => {
      const match = url.pathname.match(/MLB-?(\d+)/i);
      return match ? `MLB${match[1]}` : null;
    },
  },
  {
    slug: 'amazon-br',
    name: 'Amazon',
    patterns: [/amazon\.com\.br/i],
    idExtractor: (url) => {
      const match = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      return match ? match[1] : null;
    },
  },
  {
    slug: 'shopee',
    name: 'Shopee',
    patterns: [/shopee\.com\.br/i],
    idExtractor: (url) => {
      const match = url.pathname.match(/\/[^/]+\/(\d{5,})\/(\d{5,})/) ||
                    url.pathname.match(/\/product\/(\d+)\/(\d+)/) ||
                    url.pathname.match(/\.(\d+)\.(\d+)/);
      return match ? `${match[1]}.${match[2]}` : null;
    },
  },
];

function detectMarketplace(urlStr) {
  try {
    const url = new URL(urlStr);
    for (const mp of MARKETPLACES) {
      if (mp.patterns.some(p => p.test(url.hostname + url.pathname))) {
        const externalId = mp.idExtractor(url);
        return { slug: mp.slug, name: mp.name, externalId };
      }
    }
  } catch {}
  return null;
}

// ── URL expansion ───────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function expandUrl(url, timeoutMs = 10000) {
  // Strategy 1: HEAD follow
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: '*/*' },
    });
    clearTimeout(timer);
    if (res.url && res.url !== url) return res.url;
  } catch {}

  // Strategy 2: GET manual (Location header)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    clearTimeout(timer);
    const location = res.headers.get('location');
    if (location) {
      return location.startsWith('http') ? location : new URL(location, url).toString();
    }

    // Strategy 3: meta refresh / JS redirect
    if (res.ok || res.status === 200) {
      const html = await res.text().catch(() => '');
      const metaRefresh = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["']\d+;\s*url=([^"']+)/i);
      if (metaRefresh?.[1]) {
        return metaRefresh[1].startsWith('http') ? metaRefresh[1] : new URL(metaRefresh[1], url).toString();
      }
      const jsRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
      if (jsRedirect?.[1] && jsRedirect[1].startsWith('http')) return jsRedirect[1];
    }
  } catch {}

  return url;
}

function isShortLink(urlStr) {
  try {
    const host = new URL(urlStr).hostname;
    return SHORT_LINK_HOSTS.some(h => host.endsWith(h));
  } catch {
    return false;
  }
}

function needsPathExpansion(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return REDIRECT_PATH_PATTERNS.some(p => p.test(parsed.pathname));
  } catch {
    return false;
  }
}

function cleanUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    for (const param of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(param)) {
        parsed.searchParams.delete(param);
      }
    }
    parsed.hash = '';
    if (parsed.protocol === 'http:') parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Extract real destination from ML's /gz/webdevice/config?go= redirect URLs.
 */
function extractGzGo(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.pathname.includes('/gz/webdevice/config')) {
      const go = parsed.searchParams.get('go');
      if (go && go.startsWith('http')) return go;
    }
  } catch {}
  return null;
}

/**
 * Fully expand a URL (up to 3 hops) and clean tracking params.
 * Handles: meli.la → /social/ → /gz/webdevice/config?go= → actual product
 */
async function resolveUrl(url) {
  let current = url;

  // Hop 1
  if (isShortLink(current) || needsPathExpansion(current)) {
    current = await expandUrl(current);
  }

  // Check for /gz/webdevice/config?go= pattern
  const goUrl = extractGzGo(current);
  if (goUrl) current = goUrl;

  // Hop 2 (chain: e.g. meli.la → /social/ → product)
  if (current !== url && (isShortLink(current) || needsPathExpansion(current))) {
    const hop2 = await expandUrl(current);
    if (hop2 !== current) {
      current = hop2;
      // Check again for gz/webdevice
      const goUrl2 = extractGzGo(current);
      if (goUrl2) current = goUrl2;
    }
  }

  // Hop 3 (rare: triple redirect)
  if (current !== url && (isShortLink(current) || needsPathExpansion(current))) {
    const hop3 = await expandUrl(current);
    if (hop3 !== current) current = hop3;
  }

  // Clean tracking params
  current = cleanUrl(current);

  return current;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 Fix short-link listings ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}\n`);

  // Find all listings with short-link productUrls
  const shortDomainConditions = [
    'meli.la', 'bit.ly', 'amzn.to', 'a.co', 'tinyurl.com',
    's.shopee', 'divulguei.app', 'tempromo.app.br',
    'magalu.lu', 'tidd.ly', 'shein.top',
  ];

  const listings = await prisma.listing.findMany({
    where: {
      OR: shortDomainConditions.map(d => ({ productUrl: { contains: d } })),
    },
    include: {
      offers: { select: { id: true, affiliateUrl: true, isActive: true } },
      source: { select: { slug: true } },
    },
  });

  console.log(`Found ${listings.length} listings with short-link productUrls\n`);

  // Also find offers with third-party matt_tool (even if listing URL is fine)
  const thirdPartyOffers = await prisma.offer.findMany({
    where: {
      affiliateUrl: { contains: 'matt_tool' },
      NOT: { id: { in: listings.flatMap(l => l.offers.map(o => o.id)) } },
    },
    select: { id: true, affiliateUrl: true, listingId: true },
  });

  console.log(`Found ${thirdPartyOffers.length} additional offers with third-party matt_tool\n`);

  const stats = {
    listingsUpdated: 0,
    listingsSkipped: 0,
    listingsFailed: 0,
    offersUpdated: 0,
    marketplaceRedetected: 0,
    externalIdImproved: 0,
  };

  // Process listings with short URLs
  const CONCURRENCY = 3;
  for (let i = 0; i < listings.length; i += CONCURRENCY) {
    const batch = listings.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (listing) => {
      const original = listing.productUrl;
      try {
        const resolved = await resolveUrl(original);

        if (resolved === original) {
          console.log(`  ⏭️  ${original.substring(0, 60)} → no change`);
          stats.listingsSkipped++;
          return;
        }

        console.log(`  ✅ ${original.substring(0, 50)} → ${resolved.substring(0, 120)}`);

        // Detect marketplace from resolved URL
        const mp = detectMarketplace(resolved);
        const updates = { productUrl: resolved };

        if (mp?.externalId && listing.externalId?.startsWith('hash:')) {
          updates.externalId = mp.externalId;
          stats.externalIdImproved++;
          console.log(`     📦 externalId: ${listing.externalId.substring(0, 20)} → ${mp.externalId}`);
        }

        if (!DRY_RUN) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: updates,
          });
        }
        stats.listingsUpdated++;

        // Update offers for this listing
        for (const offer of listing.offers) {
          if (!offer.affiliateUrl) continue;
          const cleanedAffiliate = cleanUrl(offer.affiliateUrl);
          // Use the resolved canonical URL as base for affiliate
          const newAffiliateBase = resolved;

          if (cleanedAffiliate !== offer.affiliateUrl || newAffiliateBase !== original) {
            if (!DRY_RUN) {
              await prisma.offer.update({
                where: { id: offer.id },
                data: { affiliateUrl: newAffiliateBase },
              });
            }
            stats.offersUpdated++;
          }
        }
      } catch (err) {
        console.log(`  ❌ ${original.substring(0, 60)} → ERROR: ${err.message}`);
        stats.listingsFailed++;
      }
    }));

    // Rate limit: small delay between batches
    if (i + CONCURRENCY < listings.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Fix standalone offers with third-party matt_tool
  for (const offer of thirdPartyOffers) {
    if (!offer.affiliateUrl) continue;
    const cleaned = cleanUrl(offer.affiliateUrl);
    if (cleaned !== offer.affiliateUrl) {
      if (!DRY_RUN) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: { affiliateUrl: cleaned },
        });
      }
      stats.offersUpdated++;
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Results ${DRY_RUN ? '(DRY RUN — no changes written)' : '(LIVE)'}:`);
  console.log(`   Listings updated:       ${stats.listingsUpdated}`);
  console.log(`   Listings skipped:       ${stats.listingsSkipped}`);
  console.log(`   Listings failed:        ${stats.listingsFailed}`);
  console.log(`   Offers updated:         ${stats.offersUpdated}`);
  console.log(`   ExternalIds improved:   ${stats.externalIdImproved}`);
  console.log(`${'─'.repeat(60)}\n`);

  if (DRY_RUN) {
    console.log('💡 Run without --dry-run to apply changes.\n');
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
