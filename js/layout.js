/* ── Language helper (shared) ──
   The Simplified Chinese mirror of the site lives under the /zh/ prefix.
   This detects the active language from the URL and computes the matching
   URL in the opposite language for the toggle. */
var AEVIA_LANG = (function () {
  var path = window.location.pathname;
  var isZh = /^\/zh(\/|$)/.test(path);
  function other(p) {
    if (isZh) {
      var stripped = p.replace(/^\/zh(?=\/|$)/, '');
      return stripped === '' ? '/' : stripped;
    }
    return '/zh' + (p === '/' ? '/' : p);
  }
  return { isZh: isZh, otherUrl: other(path) };
})();

(function () {
  'use strict';

  var header = document.getElementById('header-placeholder');
  var footer = document.getElementById('footer-placeholder');
  if (!header && !footer) return;

  var base = document.documentElement.getAttribute('data-base') || '';

  var suffix = AEVIA_LANG.isZh ? '.zh' : '';
  var headerFile = '/components/header' + suffix + '.html';
  var footerFile = '/components/footer' + suffix + '.html';

  function inject(el, path) {
    if (!el) return Promise.resolve();
    return fetch(base + path)
      .then(function (r) { return r.text(); })
      .then(function (html) { el.innerHTML = html; });
  }

  Promise.all([
    inject(header, headerFile),
    inject(footer, footerFile)
  ]).then(function () {
    // Highlight active nav link
    var path = window.location.pathname;
    var links = document.querySelectorAll('.nav__links a, .nav__mobile-menu a');
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      if (href === '/' && path === '/') {
        a.classList.add('active');
      } else if (href === '/zh/' && path === '/zh/') {
        a.classList.add('active');
      } else if (href !== '/' && href !== '/zh/' && href.indexOf('#') === -1 && path.indexOf(href) === 0) {
        a.classList.add('active');
      }
    });

    injectLangToggle();

    // Initialize scroll-driven inset effect after footer is injected
    initSectionInset();
  });

  /* ── Language toggle (EN / 中文) ──
     Injected after the header loads. Hidden on pages that opt out via
     <html data-no-translate> (the site-wide Privacy Policy & Terms of
     Service, which remain English-only). The visitor's last explicit
     choice is stored in localStorage; no automatic redirect is performed. */
  function injectLangToggle() {
    if (document.documentElement.hasAttribute('data-no-translate')) return;

    var targetUrl = AEVIA_LANG.otherUrl;
    var aria = AEVIA_LANG.isZh ? 'Switch to English' : '切换为中文 / Switch to Chinese';
    var toLang = AEVIA_LANG.isZh ? 'en' : 'zh';

    function remember() {
      try { localStorage.setItem('aevialab_lang', toLang); } catch (e) {}
    }

    var navInner = document.querySelector('.nav__inner');
    if (navInner && !document.getElementById('lang-toggle')) {
      var a = document.createElement('a');
      a.id = 'lang-toggle';
      a.className = 'nav__lang';
      a.href = targetUrl;
      a.setAttribute('aria-label', aria);
      a.setAttribute('lang', AEVIA_LANG.isZh ? 'en' : 'zh-Hans');
      a.textContent = AEVIA_LANG.isZh ? 'EN' : '中文';
      a.addEventListener('click', remember);
      var toggleBtn = navInner.querySelector('.nav__mobile-toggle');
      navInner.insertBefore(a, toggleBtn || null);
    }

    var mobile = document.querySelector('.nav__mobile-menu');
    var mobileClose = mobile && mobile.querySelector('.nav__mobile-close');
    if (mobile && !document.getElementById('lang-toggle-mobile')) {
      var m = document.createElement('a');
      m.id = 'lang-toggle-mobile';
      m.className = 'nav__mobile-lang';
      m.href = targetUrl;
      m.setAttribute('aria-label', aria);
      m.setAttribute('lang', AEVIA_LANG.isZh ? 'en' : 'zh-Hans');
      m.textContent = AEVIA_LANG.isZh ? 'English' : '中文';
      m.addEventListener('click', remember);
      mobile.appendChild(m);
    }
  }
})();

/* ── Scroll-driven section inset effect ──
   Every full-width section smoothly gains side margins and rounded
   corners based on its own viewport position. When a section is
   centred in view it sits edge-to-edge; as it scrolls away from
   centre it becomes a card with padding that aligns with the
   solution banners. */
(function () {
  'use strict';

  function initSectionInset() {
    // Collect every full-width section + hero + footer on the homepage
    var targets = Array.prototype.slice.call(
      document.querySelectorAll('.hero, .section, #footer-placeholder')
    );

    // Exclude the solutions section itself — its banners have their own padding
    targets = targets.filter(function (el) {
      return el.id !== 'solutions';
    });

    if (targets.length === 0) return;

    targets.forEach(function (t) {
      if (window.innerWidth > 768) {
        t.style.overflow = 'hidden';
      }
    });

    var ticking = false;

    function isMobile() {
      return window.innerWidth <= 768;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    function update() {
      ticking = false;

      if (isMobile()) {
        targets.forEach(function (t) {
          t.style.marginLeft = '0px';
          t.style.marginRight = '0px';
          t.style.borderRadius = '0px';
          t.style.overflow = '';
        });
        return;
      }

      targets.forEach(function (t) {
        t.style.overflow = 'hidden';
      });

      var vh = window.innerHeight;
      var maxInset = Math.max(16, Math.min(window.innerWidth * 0.03, 48));
      var maxRadius = 32;

      targets.forEach(function (t) {
        var rect = t.getBoundingClientRect();

        // Centre of the element relative to viewport centre
        var elCentre = rect.top + rect.height / 2;
        var vpCentre = vh / 2;

        // Distance from viewport centre, normalised 0→1
        // 0 = element centred in viewport (full-width)
        // 1 = element is off-screen or at viewport edge (max inset)
        var dist = Math.abs(elCentre - vpCentre) / (vh * 0.8);
        var raw = Math.max(0, Math.min(1, dist));

        // smoothstep easing
        var progress = raw * raw * (3 - 2 * raw);

        var inset = progress * maxInset;
        var radius = progress * maxRadius;

        t.style.marginLeft = inset + 'px';
        t.style.marginRight = inset + 'px';
        t.style.borderRadius = radius + 'px';
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  window.initSectionInset = initSectionInset;
})();

/* ── Cookie Consent Bar ──
   Displayed on every page until the visitor makes a choice.
   Choice is stored in localStorage; re-shown if the policy
   version changes or after 1 year. */
(function () {
  'use strict';

  // Match the Effective Date of the Cookies Policy
  var POLICY_VERSION = '2026-05-01';
  var STORAGE_KEY    = 'aevialab_cookie_consent';
  var ONE_YEAR_MS    = 365 * 24 * 60 * 60 * 1000;

  function shouldShow() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return true;
      var stored = JSON.parse(raw);
      if (stored.v !== POLICY_VERSION) return true;
      if (Date.now() - new Date(stored.date).getTime() > ONE_YEAR_MS) return true;
      return false;
    } catch (e) {
      return true;
    }
  }

  function saveChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v:      POLICY_VERSION,
        choice: choice,
        date:   new Date().toISOString()
      }));
    } catch (e) {}
  }

  function dismiss(bar, choice) {
    saveChoice(choice);
    bar.classList.remove('cookie-bar--visible');
    bar.classList.add('cookie-bar--hidden');
    setTimeout(function () {
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    }, 350);
  }

  function init() {
    if (!shouldShow()) return;

    var isZh = window.AEVIA_LANG ? AEVIA_LANG.isZh : /^\/zh(\/|$)/.test(window.location.pathname);
    var cookiesHref = isZh ? '/zh/cookies-policy' : '/cookies-policy';

    var bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', isZh ? 'Cookie 同意' : 'Cookie consent');

    var text = isZh
      ? '我们使用 Cookie 来了解网站的使用情况。点击<strong>全部接受</strong>，即表示您' +
        '同意我们依据<a href="' + cookiesHref + '" class="cookie-bar__link">Cookie 政策</a>使用分析类 Cookie。' +
        '严格必要的 Cookie 始终处于启用状态。'
      : 'We use cookies to understand how our site is used. By clicking ' +
        '<strong>Accept All</strong>, you consent to our use of analytics cookies ' +
        'in accordance with our <a href="' + cookiesHref + '" class="cookie-bar__link">Cookies Policy</a>. ' +
        'Strictly necessary cookies are always active.';

    var necessaryLabel = isZh ? '仅必要' : 'Necessary Only';
    var acceptLabel = isZh ? '全部接受' : 'Accept All';

    bar.innerHTML =
      '<div class="cookie-bar__inner">' +
        '<p class="cookie-bar__text">' + text + '</p>' +
        '<div class="cookie-bar__actions">' +
          '<button class="cookie-bar__btn cookie-bar__btn--secondary" id="wsc-cookie-necessary">' + necessaryLabel + '</button>' +
          '<button class="cookie-bar__btn cookie-bar__btn--primary"   id="wsc-cookie-accept">' + acceptLabel + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(bar);

    // Trigger slide-up animation after insertion
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bar.classList.add('cookie-bar--visible');
      });
    });

    document.getElementById('wsc-cookie-accept').addEventListener('click', function () {
      dismiss(bar, 'all');
    });
    document.getElementById('wsc-cookie-necessary').addEventListener('click', function () {
      dismiss(bar, 'necessary');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
