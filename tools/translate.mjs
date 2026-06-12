/**
 * Generate the Simplified Chinese (zh-Hans) mirror of the Aevia Lab site.
 *
 * Strategy:
 *  - Parse each English source file with cheerio (structure-preserving).
 *  - Collect translatable text nodes (skipping <script>/<style>/<code>/<pre>)
 *    plus a curated set of attributes (title/alt/aria-label/placeholder,
 *    <title>, meta[name=description] content).
 *  - Batch-translate the unique strings through the OpenRouter API.
 *  - Write the result into the parallel /zh/ tree, rewriting internal page
 *    links to their /zh-prefixed equivalents (excluding shared assets and the
 *    two pages that must stay English-only).
 *
 * The API key is read from the OPENROUTER_API_KEY environment variable so the
 * secret never lives in source control.
 *
 * Usage (from repo root):
 *   OPENROUTER_API_KEY=... node tools/translate.mjs
 */

import { load } from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash';
const ROOT = process.cwd();

if (!API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable.');
  process.exit(1);
}

/* Full HTML documents to translate into /zh/<same-path>. */
const PAGES = [
  'index.html',
  'accessibility/index.html',
  'apps/index.html',
  'apps/aevia-revive/index.html',
  'apps/aevia-revive/privacy-policy/index.html',
  'apps/aevia-revive/support/index.html',
  'apps/aevia-revive/terms-of-use/index.html',
  'cookies-policy/index.html',
  'disclaimer/index.html',
  'faq/index.html',
  'policies/index.html',
  'science/index.html',
];

/* Shared layout fragments → localized .zh.html variants. */
const FRAGMENTS = [
  { src: 'components/header.html', out: 'components/header.zh.html' },
  { src: 'components/footer.html', out: 'components/footer.zh.html' },
];

/* Routes that must NOT be redirected to /zh (English-only or shared assets). */
const NO_PREFIX = ['/css', '/js', '/assets', '/zh', '/privacy-policy', '/terms-of-service'];

const SKIP_TAGS = new Set(['script', 'style', 'code', 'pre', 'noscript']);
const TRANSLATE_ATTRS = ['title', 'alt', 'aria-label', 'placeholder'];

const hasLetters = (s) => /[A-Za-z]/.test(s);

/* ── Link rewriting ─────────────────────────────────────────────── */
function rewriteLink(href) {
  if (!href || href[0] !== '/') return href; // external / mailto / #anchor / relative
  for (const p of NO_PREFIX) {
    if (href === p || href.startsWith(p + '/') || href.startsWith(p + '#') || href.startsWith(p + '?')) {
      return href; // shared asset or English-only route — leave untouched
    }
  }
  return '/zh' + href;
}

/* ── Text-node collection ───────────────────────────────────────── */
function collectTextNodes(node, out) {
  if (!node) return;
  if (node.type === 'text') {
    if (node.data && node.data.trim()) out.push(node);
    return;
  }
  if (node.type === 'script' || node.type === 'style' || node.type === 'comment' || node.type === 'directive') return;
  if (node.name && SKIP_TAGS.has(node.name.toLowerCase())) return;
  (node.children || []).forEach((c) => collectTextNodes(c, out));
}

function splitWhitespace(str) {
  const lead = str.match(/^\s*/)[0];
  const trail = str.match(/\s*$/)[0];
  const core = str.slice(lead.length, str.length - trail.length);
  return { lead, core, trail };
}

/* ── OpenRouter batch translation ───────────────────────────────── */
async function translateBatch(strings) {
  const sys =
    'You are a professional localizer translating a biotech / wellness company website from English to Simplified Chinese (zh-Hans). Translate naturally, fluently and professionally for a Chinese audience.';
  const user =
    'Translate each string in the following JSON array into Simplified Chinese.\n' +
    'Rules:\n' +
    '1) Return ONLY a JSON array of strings, same length and same order as the input. No prose, no code fences.\n' +
    '2) Keep these proper nouns in their original English form: Aevia Lab, Aevia Revive, West Solution Consulting Corp., USDA, FoodData Central, Health Canada, CNF, Open Food Facts, CloudKit, iCloud, Apple ID, App Store, NPN, iOS.\n' +
    '3) Keep email addresses, URLs, numbers and dates unchanged.\n' +
    '4) Preserve any HTML entities (e.g. &mdash; &nbsp; &amp;) exactly as written.\n' +
    '5) Preserve leading/trailing punctuation and inline symbols.\n' +
    'Input:\n' +
    JSON.stringify(strings);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  let content = json.choices?.[0]?.message?.content || '';
  content = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const arr = JSON.parse(content);
  if (!Array.isArray(arr) || arr.length !== strings.length) {
    throw new Error(`Length mismatch: expected ${strings.length}, got ${Array.isArray(arr) ? arr.length : 'non-array'}`);
  }
  return arr.map((s) => String(s));
}

async function buildDictionary(uniqueStrings) {
  const dict = new Map();
  const CHUNK = 30;
  const list = [...uniqueStrings];
  for (let i = 0; i < list.length; i += CHUNK) {
    const slice = list.slice(i, i + CHUNK);
    let translated;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        translated = await translateBatch(slice);
        break;
      } catch (e) {
        console.warn(`  chunk ${i / CHUNK + 1} attempt ${attempt} failed: ${e.message}`);
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    slice.forEach((s, idx) => dict.set(s, translated[idx]));
    process.stdout.write(`  translated ${Math.min(i + CHUNK, list.length)}/${list.length}\r`);
  }
  process.stdout.write('\n');
  return dict;
}

/* ── Per-file processing ────────────────────────────────────────── */
function loadFile(rel, isDocument) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return load(html, { decodeEntities: false }, isDocument);
}

function collectStrings($, root) {
  const textNodes = [];
  collectTextNodes(root, textNodes);

  const unique = new Set();
  const attrTargets = [];

  for (const n of textNodes) {
    const { core } = splitWhitespace(n.data);
    if (core && hasLetters(core)) unique.add(core);
  }

  $('[title], [alt], [aria-label], [placeholder]').each((_, el) => {
    for (const attr of TRANSLATE_ATTRS) {
      const v = $(el).attr(attr);
      if (v && v.trim() && hasLetters(v)) {
        unique.add(v.trim());
        attrTargets.push({ el, attr });
      }
    }
  });

  const meta = $('meta[name="description"]');
  if (meta.length) {
    const v = meta.attr('content');
    if (v && v.trim() && hasLetters(v)) unique.add(v.trim());
  }

  return { textNodes, unique, attrTargets, meta };
}

function applyTranslation($, parts, dict) {
  for (const n of parts.textNodes) {
    const { lead, core, trail } = splitWhitespace(n.data);
    if (core && dict.has(core)) {
      n.data = lead + dict.get(core) + trail;
    }
  }
  for (const { el, attr } of parts.attrTargets) {
    const v = $(el).attr(attr);
    if (v && dict.has(v.trim())) $(el).attr(attr, dict.get(v.trim()));
  }
  if (parts.meta && parts.meta.length) {
    const v = parts.meta.attr('content');
    if (v && dict.has(v.trim())) parts.meta.attr('content', dict.get(v.trim()));
  }
}

function rewriteLinks($) {
  $('a[href]').each((_, el) => {
    const next = rewriteLink($(el).attr('href'));
    if (next !== undefined) $(el).attr('href', next);
  });
}

function writeOut(rel, content) {
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}

async function main() {
  // Pass 1: collect every unique string across all files (one shared dictionary).
  const allStrings = new Set();
  const loaded = [];

  for (const rel of PAGES) {
    const $ = loadFile(rel, true);
    const parts = collectStrings($, $('html')[0] || $.root()[0]);
    parts.unique.forEach((s) => allStrings.add(s));
    loaded.push({ kind: 'page', rel, $, parts });
  }
  for (const f of FRAGMENTS) {
    const $ = loadFile(f.src, false);
    const parts = collectStrings($, $.root()[0]);
    parts.unique.forEach((s) => allStrings.add(s));
    loaded.push({ kind: 'fragment', rel: f.out, $, parts });
  }

  console.log(`Collected ${allStrings.size} unique strings across ${loaded.length} files.`);
  const dict = await buildDictionary(allStrings);

  // Pass 2: apply, rewrite links, set lang, write output.
  for (const item of loaded) {
    const { $ } = item;
    applyTranslation($, item.parts, dict);
    rewriteLinks($);

    let out;
    if (item.kind === 'page') {
      $('html').attr('lang', 'zh-Hans');
      out = $.html();
      const rel = 'zh/' + item.rel;
      writeOut(rel, out);
      console.log(`  wrote ${rel}`);
    } else {
      out = $.html();
      writeOut(item.rel, out);
      console.log(`  wrote ${item.rel}`);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
