# Aevia Lab

The website for **Aevia Lab** — research at the intersection of computational biology
and precision nutrition.

## Stack

- Pure HTML5, CSS3, vanilla JavaScript
- No frameworks, no build tools, no dependencies
- Designed for static hosting on **GitHub Pages**

## Structure

```
index.html              Homepage — hero, pillars, modalities, applications
science/                The Science — pillars deep-dive
about/                  Mission and operating principles
apps/                   Application suite (placeholders)
  aevia-one/            App 01 — Nutritional Telemetry
  aevia-two/            App 02 — Circadian Metabolism
  aevia-three/          App 03 — Targeted Intervention
faq/                    Frequently asked questions
policies/               Hub for all legal pages
privacy-policy/
terms-of-service/
disclaimer/             Regulatory & scientific disclaimer
cookies-policy/
accessibility/

components/             Header & footer fragments injected by JS
css/style.css           Single shared design system
js/layout.js            Header/footer injection, scroll effects, cookie bar
CNAME                   Custom domain for GitHub Pages
```

## Deploying on GitHub Pages

This site uses **root-absolute paths** (`/css/style.css`, `/components/header.html`).
That means it must be served from the **root of a domain**, not from a sub-path
like `https://<user>.github.io/AevialabWeb/`.

Two supported deployment modes:

1. **Custom domain** (recommended).
   - Edit the [CNAME](CNAME) file to your domain (e.g. `aevialab.com`).
   - In the repo: **Settings → Pages → Custom domain** → enter the same domain.
   - Configure DNS as instructed by GitHub.

2. **User/organization page**.
   - Rename the repo to `<username>.github.io`.
   - The site will then serve at `https://<username>.github.io/`.

If you must serve under `https://<user>.github.io/AevialabWeb/`, every absolute
path in HTML and the component-injection script will need to be rewritten with
the `/AevialabWeb` prefix.

## Editing content

- **Adding an application.** Duplicate `apps/aevia-one/` to a new folder, update
  the title/copy, and add a card to `apps/index.html` and a banner to
  `index.html`.
- **Updating navigation.** Edit `components/header.html` (and the mobile menu
  block within it) and `components/footer.html`. Changes propagate to every page.
- **Updating brand colour.** Adjust `--color-accent`, `--color-accent-hover`,
  `--color-accent-light` and `--color-accent-gradient` in `css/style.css`.

## License

© 2026 Aevia Lab. All rights reserved.
