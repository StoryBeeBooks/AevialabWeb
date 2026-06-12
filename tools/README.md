# i18n tooling — Simplified Chinese mirror

The site ships a Simplified Chinese (`zh-Hans`) mirror under the `/zh/` path
prefix. Those pages are **pre-generated static files** — there is no runtime
translation, so the live site makes no API calls and stays fast.

## How the bilingual site works

- English pages live at the repo root (`/`, `/science`, `/apps`, …).
- Their Chinese counterparts live under `/zh/` (`/zh/`, `/zh/science`, …) with
  identical markup and a translated body.
- Shared layout fragments have localized variants:
  `components/header.zh.html` and `components/footer.zh.html`.
- `js/layout.js` detects the active language from the URL, loads the matching
  header/footer, and injects an **EN / 中文** toggle into the nav (desktop) and
  the mobile menu. The visitor's last explicit choice is stored in
  `localStorage` (`aevialab_lang`); no automatic redirect is performed.
- Pages marked `<html ... data-no-translate>` opt out of the toggle. The
  site-wide **Privacy Policy** (`/privacy-policy`) and **Terms of Service**
  (`/terms-of-service`) are English-only and stay that way; the `/zh/` tree
  links back to those two English pages.

## Regenerating the Chinese pages

When English source pages change, regenerate the mirror:

```sh
cd tools
npm install                       # first time only (installs cheerio)
cd ..
OPENROUTER_API_KEY=sk-or-... node tools/translate.mjs
```

Optional overrides:

- `OPENROUTER_MODEL` — defaults to `deepseek/deepseek-v4-flash`.

The script parses each page with cheerio (structure-preserving), batch-translates
the unique visible strings + select attributes (`title`, `alt`, `aria-label`,
`placeholder`, `<title>`, `meta[name=description]`) through the OpenRouter API,
rewrites internal links to their `/zh`-prefixed equivalents, sets
`<html lang="zh-Hans">`, and writes the output into `/zh/`.

The API key is read from the environment and never committed to source.

> Note: machine translation can occasionally leave a short inline label in
> English (e.g. text split across `<em>`/`<strong>` tags). Skim the regenerated
> pages and fix any stray strings by hand.
