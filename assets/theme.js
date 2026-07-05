/* =============================================
   F'sPlanet — Theme JavaScript
   Shopify 2.0 Compatible
============================================= */

'use strict';

// =============================================
// SCROLL REVEAL
// =============================================
const srObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      srObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -32px 0px' });

function initScrollReveal() {
  document.querySelectorAll('.sr, .sr-l, .sr-r, .sr-scale').forEach(el => srObserver.observe(el));
}

// =============================================
// HEADER SCROLL BEHAVIOR
// =============================================
function initHeader() {
  const hdr = document.querySelector('.header');
  const backTop = document.getElementById('backTop');
  if (!hdr) return;
  window.addEventListener('scroll', () => {
    hdr.classList.toggle('scrolled', window.scrollY > 20);
    if (backTop) backTop.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });
  if (backTop) {
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

// =============================================
// MEGA MENU
// =============================================
function initMegaMenu() {
  const megaMenu = document.getElementById('megaMenu');
  if (!megaMenu) return;
  let megaTimer;
  document.querySelectorAll('.hdr-nav-item[data-mega]').forEach(item => {
    item.addEventListener('mouseenter', () => {
      clearTimeout(megaTimer);
      megaMenu.classList.add('open');
      megaMenu.setAttribute('aria-hidden', 'false');
    });
    item.addEventListener('mouseleave', () => {
      megaTimer = setTimeout(() => {
        megaMenu.classList.remove('open');
        megaMenu.setAttribute('aria-hidden', 'true');
      }, 180);
    });
  });
  megaMenu.addEventListener('mouseenter', () => clearTimeout(megaTimer));
  megaMenu.addEventListener('mouseleave', () => {
    megaTimer = setTimeout(() => {
      megaMenu.classList.remove('open');
      megaMenu.setAttribute('aria-hidden', 'true');
    }, 180);
  });
  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') megaMenu.classList.remove('open');
  });
}

// =============================================
// WISHLIST TOGGLE
// =============================================
function initWishlist() {
  document.querySelectorAll('.prod-wish').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');
      btn.setAttribute('aria-label', btn.classList.contains('active') ? 'お気に入りから削除' : 'お気に入りに追加');
    });
  });
}

// =============================================
// BACK TO TOP FAB
// =============================================
function initFabCart() {
  const fab = document.getElementById('fabCart');
  if (!fab) return;
  fab.addEventListener('click', () => {
    window.location.href = '/cart';
  });
  fab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = '/cart';
    }
  });
}

// =============================================
// MOBILE MENU TOGGLE
// =============================================
function initMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileOverlay');
  if (!toggle || !drawer) return;

  toggle.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    drawer.classList.toggle('open', !isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  }
}

// =============================================
// INIT ALL
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initHeader();
  initMegaMenu();
  initWishlist();
  initFabCart();
  initMobileMenu();
});
