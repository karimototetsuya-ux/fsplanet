/**
 * F'sPlanet Custom JavaScript
 * Shopify Dawn テーマ カスタム拡張
 * -----------------------------------------------
 * - initFpScrollReveal()   IntersectionObserver scroll animation
 * - initFpHeroSlideshow()  Auto-play hero slider with touch support
 * - initFpWishlist()       Wishlist toggle (local state)
 * - initFpQuickAdd()       Ajax Cart API quick-add
 * - initFpAnnounceBar()    Marquee animation control
 * - initFpMobileMenu()     Mobile drawer navigation
 * - initFpStickyHeader()   Sticky header with shrink effect
 * -----------------------------------------------
 */

'use strict';

/* =====================================================
   Utility
   ===================================================== */
const FP = {
  /** デバウンス */
  debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /** スロットル */
  throttle(fn, limit = 100) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= limit) {
        last = now;
        fn(...args);
      }
    };
  },

  /** prefers-reduced-motion 判定 */
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /** 要素の存在確認付き querySelectorAll */
  $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  },

  /** 要素の存在確認付き querySelector */
  $(selector, root = document) {
    return root.querySelector(selector);
  },

  /** カスタムイベント発火 */
  emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(`fp:${name}`, { detail, bubbles: true }));
  },

  /** フォーカストラップ */
  trapFocus(element) {
    const focusable = element.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    element.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
};

/* =====================================================
   1. Scroll Reveal — IntersectionObserver
   ===================================================== */
function initFpScrollReveal() {
  if (FP.prefersReducedMotion()) return;

  const CLASSES = ['.fp-sr', '.fp-sr-l', '.fp-sr-r', '.fp-sr-scale'];
  const elements = FP.$$(CLASSES.join(', '));
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fp-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  elements.forEach((el) => observer.observe(el));
}

/* =====================================================
   2. Hero Slideshow
   ===================================================== */
function initFpHeroSlideshow() {
  const heroes = FP.$$('.fp-hero');
  if (!heroes.length) return;

  heroes.forEach((hero) => {
    const slider       = FP.$('.fp-hero__slider', hero);
    const slides       = FP.$$('.fp-hero__slide', hero);
    const dots         = FP.$$('.fp-hero__dot', hero);
    const btnPrev      = FP.$('.fp-hero__btn--prev', hero);
    const btnNext      = FP.$('.fp-hero__btn--next', hero);
    const autoplay     = hero.dataset.autoplay !== 'false';
    const speed        = parseInt(hero.dataset.speed || '5000', 10);
    const total        = slides.length;

    if (total <= 1) return;

    let current  = 0;
    let timer    = null;
    let isMoving = false;

    // touch / pointer
    let touchStartX = 0;
    let touchStartY = 0;

    /* --- State ---------------------------------------- */
    function goTo(index, direction = 'next') {
      if (isMoving || index === current) return;
      isMoving = true;

      const prev = current;
      current = (index + total) % total;

      slides[prev].classList.remove('is-active');
      slides[current].classList.add('is-active');

      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === current);
        d.setAttribute('aria-current', i === current ? 'true' : 'false');
      });

      // アニメーション完了後にフラグ解除
      const onEnd = () => {
        isMoving = false;
        slides[prev].removeEventListener('animationend', onEnd);
        slides[current].removeEventListener('animationend', onEnd);
      };
      slides[current].addEventListener('animationend', onEnd, { once: true });
      // フォールバック（アニメーションがない場合）
      setTimeout(() => { isMoving = false; }, 800);

      hero.setAttribute('aria-label', `スライド ${current + 1} / ${total}`);
    }

    function next() { goTo(current + 1, 'next'); }
    function prev() { goTo(current - 1, 'prev'); }

    /* --- Autoplay ------------------------------------- */
    function startAutoplay() {
      if (!autoplay || FP.prefersReducedMotion()) return;
      stopAutoplay();
      timer = setInterval(next, speed);
    }

    function stopAutoplay() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    /* --- Buttons -------------------------------------- */
    btnNext?.addEventListener('click', () => { stopAutoplay(); next(); startAutoplay(); });
    btnPrev?.addEventListener('click', () => { stopAutoplay(); prev(); startAutoplay(); });

    /* --- Dots ----------------------------------------- */
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        stopAutoplay();
        goTo(i);
        startAutoplay();
      });
    });

    /* --- Keyboard ------------------------------------- */
    hero.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { stopAutoplay(); next(); startAutoplay(); }
      if (e.key === 'ArrowLeft')  { stopAutoplay(); prev(); startAutoplay(); }
    });

    /* --- Touch / Swipe -------------------------------- */
    hero.addEventListener('pointerdown', (e) => {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    }, { passive: true });

    hero.addEventListener('pointerup', (e) => {
      const dx = e.clientX - touchStartX;
      const dy = Math.abs(e.clientY - touchStartY);
      if (Math.abs(dx) < 30 || dy > Math.abs(dx)) return;
      stopAutoplay();
      if (dx < 0) next(); else prev();
      startAutoplay();
    }, { passive: true });

    /* --- Pause on hover ------------------------------- */
    hero.addEventListener('mouseenter', stopAutoplay);
    hero.addEventListener('mouseleave', startAutoplay);

    /* --- Visibility API ------------------------------- */
    document.addEventListener('visibilitychange', () => {
      document.hidden ? stopAutoplay() : startAutoplay();
    });

    /* --- Init ----------------------------------------- */
    slides[0]?.classList.add('is-active');
    dots[0]?.classList.add('is-active');
    dots[0]?.setAttribute('aria-current', 'true');
    hero.setAttribute('aria-label', `スライド 1 / ${total}`);
    startAutoplay();
  });
}

/* =====================================================
   3. Announcement Bar — Marquee
   ===================================================== */
function initFpAnnounceBar() {
  const bars = FP.$$('.fp-announce');
  if (!bars.length) return;

  bars.forEach((bar) => {
    const track = FP.$('.fp-announce__track', bar);
    if (!track) return;

    // ホバー時一時停止
    bar.addEventListener('mouseenter', () => {
      track.style.animationPlayState = 'paused';
    });
    bar.addEventListener('mouseleave', () => {
      track.style.animationPlayState = 'running';
    });

    // フォーカス時一時停止（アクセシビリティ）
    bar.addEventListener('focusin', () => {
      track.style.animationPlayState = 'paused';
    });
    bar.addEventListener('focusout', () => {
      track.style.animationPlayState = 'running';
    });

    // prefers-reduced-motion
    if (FP.prefersReducedMotion()) {
      track.style.animation = 'none';
    }
  });
}

/* =====================================================
   4. Wishlist — Local Storage トグル
   ===================================================== */
function initFpWishlist() {
  const STORAGE_KEY = 'fp_wishlist';

  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function setWishlist(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch { /* quota exceeded */ }
  }

  function toggleItem(id) {
    const list = getWishlist();
    const idx  = list.indexOf(id);
    if (idx === -1) list.push(id);
    else list.splice(idx, 1);
    setWishlist(list);
    return idx === -1; // true = added
  }

  function updateButton(btn, isActive) {
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    const label = isActive ? 'ウィッシュリストから削除' : 'ウィッシュリストに追加';
    btn.setAttribute('aria-label', label);
    const icon = FP.$('.fp-prod-wish__icon', btn);
    if (icon) {
      icon.setAttribute('fill', isActive ? 'currentColor' : 'none');
    }
  }

  // 初期状態の復元
  const wishlist = getWishlist();
  FP.$$('.fp-prod-wish').forEach((btn) => {
    const id = btn.dataset.productId;
    if (!id) return;
    updateButton(btn, wishlist.includes(id));

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const added = toggleItem(id);
      updateButton(btn, added);

      // 同じ商品の全ボタンを同期
      FP.$$(`[data-product-id="${id}"]`).forEach((b) => {
        if (b !== btn) updateButton(b, added);
      });

      FP.emit('wishlist:change', { id, added, list: getWishlist() });

      // ミニ通知
      showToast(added ? 'ウィッシュリストに追加しました' : 'ウィッシュリストから削除しました');
    });
  });
}

/* =====================================================
   5. Quick Add — Ajax Cart API
   ===================================================== */
function initFpQuickAdd() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.fp-prod-quick');
    if (!btn) return;
    e.preventDefault();

    const variantId = btn.dataset.variantId;
    if (!variantId) return;

    if (btn.classList.contains('is-loading') || btn.classList.contains('is-added')) return;

    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    const originalText = btn.textContent;
    btn.textContent = '追加中…';

    try {
      const res = await fetch('/cart/add.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body:    JSON.stringify({ id: variantId, quantity: 1 })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      btn.classList.remove('is-loading');
      btn.classList.add('is-added');
      btn.textContent = '✓ 追加済み';
      btn.setAttribute('aria-busy', 'false');

      // カートカウント更新
      const countRes = await fetch('/cart.js');
      const cart = await countRes.json();
      FP.$$('.fp-cart-count, .cart-count').forEach((el) => {
        el.textContent = cart.item_count;
        el.classList.toggle('fp-cart-count--hidden', cart.item_count === 0);
      });

      FP.emit('cart:add', { item: data, cart });
      showToast('カートに追加しました');

      setTimeout(() => {
        btn.classList.remove('is-added');
        btn.textContent = originalText;
      }, 2500);

    } catch (err) {
      console.error('[FP QuickAdd]', err);
      btn.classList.remove('is-loading');
      btn.classList.add('is-error');
      btn.textContent = '在庫切れ';
      btn.setAttribute('aria-busy', 'false');

      setTimeout(() => {
        btn.classList.remove('is-error');
        btn.textContent = originalText;
      }, 3000);
    }
  });
}

/* =====================================================
   6. Mobile Menu Drawer
   ===================================================== */
function initFpMobileMenu() {
  const btnOpen  = FP.$('.fp-menu-btn');
  const btnClose = FP.$('.fp-menu-close');
  const drawer   = FP.$('.fp-menu-drawer');
  const overlay  = FP.$('.fp-menu-overlay');

  if (!drawer) return;

  function openMenu() {
    drawer.classList.add('is-open');
    overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    btnOpen?.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    FP.trapFocus(drawer);
    const firstFocusable = FP.$('a, button', drawer);
    firstFocusable?.focus();
  }

  function closeMenu() {
    drawer.classList.remove('is-open');
    overlay?.classList.remove('is-visible');
    document.body.style.overflow = '';
    btnOpen?.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    btnOpen?.focus();
  }

  btnOpen?.addEventListener('click', openMenu);
  btnClose?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeMenu();
  });

  // アコーディオン型サブメニュー
  FP.$$('.fp-menu-drawer__toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const parent   = toggle.closest('.fp-menu-drawer__item--has-children');
      const submenu  = FP.$('.fp-menu-drawer__submenu', parent);
      const isOpen   = toggle.getAttribute('aria-expanded') === 'true';

      // 他を閉じる
      FP.$$('.fp-menu-drawer__item--has-children.is-open').forEach((item) => {
        item.classList.remove('is-open');
        FP.$('.fp-menu-drawer__toggle', item)?.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        parent?.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* =====================================================
   7. Sticky Header
   ===================================================== */
function initFpStickyHeader() {
  const header = FP.$('.fp-header') || FP.$('header.header');
  if (!header) return;

  const THRESHOLD  = 80;
  const SHRINK_CLS = 'fp-header--scrolled';

  const onScroll = FP.throttle(() => {
    const scrollY = window.scrollY || window.pageYOffset;
    header.classList.toggle(SHRINK_CLS, scrollY > THRESHOLD);
  }, 50);

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* =====================================================
   8. Back to Top Button
   ===================================================== */
function initFpBackToTop() {
  const btn = FP.$('.fp-back-to-top');
  if (!btn) return;

  const onScroll = FP.throttle(() => {
    const visible = (window.scrollY || window.pageYOffset) > 400;
    btn.classList.toggle('is-visible', visible);
    btn.setAttribute('aria-hidden', String(!visible));
  }, 100);

  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: FP.prefersReducedMotion() ? 'auto' : 'smooth' });
    FP.$('h1, [role="main"]')?.focus();
  });

  onScroll();
}

/* =====================================================
   9. Product Image Hover (Secondary Image)
   ===================================================== */
function initFpProductImageHover() {
  if (window.matchMedia('(hover: none)').matches) return; // タッチデバイスはスキップ

  FP.$$('.fp-prod-card').forEach((card) => {
    const primary = FP.$('.fp-prod-img--primary', card);
    const hover   = FP.$('.fp-prod-img--hover', card);
    if (!primary || !hover) return;

    card.addEventListener('mouseenter', () => {
      primary.style.opacity = '0';
      hover.style.opacity   = '1';
    });
    card.addEventListener('mouseleave', () => {
      primary.style.opacity = '1';
      hover.style.opacity   = '0';
    });
  });
}

/* =====================================================
   10. Newsletter Form — Feedback
   ===================================================== */
function initFpNewsletterForm() {
  FP.$$('.fp-newsletter__form').forEach((form) => {
    // Shopify の form.posted_successfully? と form.errors は
    // Liquid 側で制御済みのため、JS では UX 向上のみ担当

    const input  = FP.$('input[type="email"]', form);
    const submit = FP.$('button[type="submit"]', form);

    if (!input || !submit) return;

    // リアルタイムバリデーション
    input.addEventListener('blur', () => {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
      input.setAttribute('aria-invalid', String(!valid && input.value !== ''));
    });

    // 送信中ローディング
    form.addEventListener('submit', () => {
      submit.classList.add('is-loading');
      submit.setAttribute('aria-busy', 'true');
    });
  });
}

/* =====================================================
   11. Lazy Load Images (Intersection Observer fallback)
   ===================================================== */
function initFpLazyImages() {
  if ('loading' in HTMLImageElement.prototype) return; // nativeサポートがあればスキップ

  const images = FP.$$('img[loading="lazy"]');
  if (!images.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          observer.unobserve(img);
        }
      });
    },
    { rootMargin: '200px 0px' }
  );

  images.forEach((img) => observer.observe(img));
}

/* =====================================================
   12. Toast Notification
   ===================================================== */
let toastTimer = null;

function showToast(message, duration = 2800) {
  let toast = FP.$('#fp-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fp-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('is-visible');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, duration);
}

/* =====================================================
   13. Gift Guide Card Hover Effect
   ===================================================== */
function initFpGiftGuide() {
  FP.$$('.fp-gift-card').forEach((card) => {
    const overlay = FP.$('.fp-gift-card__overlay', card);
    if (!overlay) return;

    card.addEventListener('mouseenter', () => overlay.style.opacity = '1');
    card.addEventListener('mouseleave', () => overlay.style.opacity = '');
  });
}

/* =====================================================
   14. Instagram Grid — Hover
   ===================================================== */
function initFpInstagram() {
  FP.$$('.fp-insta-item').forEach((item) => {
    const overlay = FP.$('.fp-insta-overlay', item);
    if (!overlay) return;

    item.addEventListener('mouseenter', () => overlay.classList.add('is-visible'));
    item.addEventListener('mouseleave', () => overlay.classList.remove('is-visible'));

    // キーボードアクセシビリティ
    item.addEventListener('focusin',  () => overlay.classList.add('is-visible'));
    item.addEventListener('focusout', () => overlay.classList.remove('is-visible'));
  });
}

/* =====================================================
   15. Section Visibility Animation Trigger
   ===================================================== */
function initFpSectionEnter() {
  if (FP.prefersReducedMotion()) return;

  const sections = FP.$$('[data-fp-animate]');
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fp-section--entered');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05 }
  );

  sections.forEach((s) => observer.observe(s));
}

/* =====================================================
   16. Cart Drawer (Dawn 互換 イベントリスナー)
   ===================================================== */
document.addEventListener('fp:cart:add', (e) => {
  // Dawn の cart-notification または cart-drawer があれば開く
  const cartNotification = FP.$('cart-notification');
  const cartDrawer       = FP.$('cart-drawer');
  if (cartDrawer) cartDrawer.open?.();
  else if (cartNotification) cartNotification.renderContents?.();
});

/* =====================================================
   Toast スタイル（動的注入）
   ===================================================== */
(function injectToastStyles() {
  if (FP.$('#fp-toast-style')) return;
  const style = document.createElement('style');
  style.id = 'fp-toast-style';
  style.textContent = `
    #fp-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(1rem);
      background: var(--fp-text, #222);
      color: #fff;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-family: var(--fp-f-ja, sans-serif);
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
    }
    #fp-toast.is-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
})();

/* =====================================================
   DOMContentLoaded — 全初期化
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initFpScrollReveal();
  initFpHeroSlideshow();
  initFpAnnounceBar();
  initFpWishlist();
  initFpQuickAdd();
  initFpMobileMenu();
  initFpStickyHeader();
  initFpBackToTop();
  initFpProductImageHover();
  initFpNewsletterForm();
  initFpLazyImages();
  initFpGiftGuide();
  initFpInstagram();
  initFpSectionEnter();
});

/* =====================================================
   Shopify Section Events (theme editor 対応)
   ===================================================== */
document.addEventListener('shopify:section:load', (e) => {
  // テーマエディタでセクションが再ロードされたとき再初期化
  const section = e.target;
  if (!section) return;

  // ヒーローが含まれている場合
  if (FP.$('.fp-hero', section)) initFpHeroSlideshow();

  // Scroll Reveal を再設定
  if (!FP.prefersReducedMotion()) {
    FP.$$('.fp-sr, .fp-sr-l, .fp-sr-r, .fp-sr-scale', section)
      .forEach((el) => el.classList.add('fp-visible'));
  }

  // アナウンスバー
  if (FP.$('.fp-announce', section)) initFpAnnounceBar();
});

document.addEventListener('shopify:section:select', (e) => {
  // セクション選択時、scroll reveal を強制表示
  FP.$$('.fp-sr, .fp-sr-l, .fp-sr-r, .fp-sr-scale', e.target)
    .forEach((el) => el.classList.add('fp-visible'));
});

document.addEventListener('shopify:block:select', (e) => {
  // スライドブロックが選択されたとき、そのスライドを表示
  const slide = e.target;
  if (!slide.classList.contains('fp-hero__slide')) return;
  const hero = slide.closest('.fp-hero');
  if (!hero) return;

  const slides = FP.$$('.fp-hero__slide', hero);
  const index  = slides.indexOf(slide);
  if (index === -1) return;

  slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
  FP.$$('.fp-hero__dot', hero).forEach((d, i) => {
    d.classList.toggle('is-active', i === index);
    d.setAttribute('aria-current', i === index ? 'true' : 'false');
  });
});
