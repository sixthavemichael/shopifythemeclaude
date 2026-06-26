/* ============================================================
   SIXTH AVE — Theme JavaScript
   Cart drawer, tabs, announcement rotation, product variants
   ============================================================ */

const SixthAve = {

  /* ── INIT ── */
  init() {
    this.initAnnouncement();
    this.initHeader();
    this.initTabs();
    this.initProductPage();
    this.initAccordion();
    this.initCartCount();
  },

  /* ── ANNOUNCEMENT BAR ROTATION ── */
  initAnnouncement() {
    const track = document.querySelector('.sa-ann__track');
    if (!track) return;
    const slides = track.querySelectorAll('.sa-ann__slide');
    if (slides.length < 2) return;
    let current = 0;
    setInterval(() => {
      current = (current + 1) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
    }, 4000);
  },

  /* ── HEADER ── */
  initHeader() {
    const mobileBtn = document.querySelector('.sa-header__mobile-btn');
    const navDrawer = document.querySelector('.sa-nav-drawer');
    if (mobileBtn && navDrawer) {
      mobileBtn.addEventListener('click', () => {
        navDrawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
      navDrawer.querySelector('.sa-nav-drawer__overlay')?.addEventListener('click', () => {
        navDrawer.classList.remove('is-open');
        document.body.style.overflow = '';
      });
      navDrawer.querySelector('.sa-nav-drawer__close')?.addEventListener('click', () => {
        navDrawer.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    }
  },

  /* ── TABS ── */
  initTabs() {
    document.querySelectorAll('.sa-tabs').forEach(tabList => {
      const tabs = tabList.querySelectorAll('.sa-tab');
      const panels = tabList.closest('.sa-tabbed-section')?.querySelectorAll('.sa-tab-panel') || [];
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('is-active'));
          panels.forEach(p => p.classList.remove('is-active'));
          tab.classList.add('is-active');
          if (panels[i]) panels[i].classList.add('is-active');
        });
      });
    });
  },

  /* ── PRODUCT PAGE GALLERY ── */
  initProductPage() {
    const thumbs = document.querySelectorAll('.sa-product__thumb');
    const mainImg = document.querySelector('.sa-product__main-img img');
    if (!thumbs.length || !mainImg) return;

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const src = thumb.dataset.src;
        const srcset = thumb.dataset.srcset;
        if (src) mainImg.src = src;
        if (srcset) mainImg.srcset = srcset;
        thumbs.forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });

    /* Variant selection */
    const variantBtns = document.querySelectorAll('.sa-product__variant-btn');
    const addToCartBtn = document.querySelector('.sa-product__atc-btn');
    const priceEl = document.querySelector('.sa-product__price');

    variantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-unavailable')) return;
        variantBtns.forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');

        const variantId = btn.dataset.variantId;
        const price = btn.dataset.price;
        const available = btn.dataset.available === 'true';

        if (addToCartBtn) {
          addToCartBtn.dataset.variantId = variantId;
          if (!available) {
            addToCartBtn.textContent = 'Sold Out';
            addToCartBtn.disabled = true;
          } else {
            addToCartBtn.textContent = 'Add to Cart';
            addToCartBtn.disabled = false;
          }
        }

        if (priceEl && price) {
          const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 100);
          priceEl.querySelector('.sa-product__price-current').textContent = formatted;
        }
      });
    });

    /* Add to cart */
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', async () => {
        const variantId = addToCartBtn.dataset.variantId;
        if (!variantId) return;
        addToCartBtn.textContent = 'Adding...';
        addToCartBtn.disabled = true;
        try {
          await this.addToCart(variantId, 1);
          addToCartBtn.textContent = 'Added!';
          setTimeout(() => {
            addToCartBtn.textContent = 'Add to Cart';
            addToCartBtn.disabled = false;
          }, 1500);
          this.openCart();
          this.refreshCart();
        } catch (e) {
          addToCartBtn.textContent = 'Error — Try Again';
          addToCartBtn.disabled = false;
        }
      });
    }
  },

  /* ── ACCORDION ── */
  initAccordion() {
    document.querySelectorAll('.sa-product__accordion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = btn.nextElementSibling;
        const isOpen = body.classList.contains('is-open');
        body.classList.toggle('is-open', !isOpen);
        const chevron = btn.querySelector('.sa-accordion-chevron');
        if (chevron) chevron.style.transform = isOpen ? 'rotate(0)' : 'rotate(180deg)';
      });
    });
  },

  /* ── CART COUNT ── */
  initCartCount() {
    this.updateCartCount();
  },

  async updateCartCount() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      const counts = document.querySelectorAll('.sa-header__cart-count');
      counts.forEach(el => {
        el.textContent = cart.item_count;
        el.dataset.count = cart.item_count;
      });
    } catch (e) {}
  },

  /* ── CART API ── */
  async addToCart(variantId, qty = 1, properties = {}) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: qty, properties })
    });
    if (!res.ok) throw new Error('Add to cart failed');
    return res.json();
  },

  async updateQty(key, qty) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    });
    await res.json();
    this.refreshCart();
    this.updateCartCount();
  },

  async refreshCart() {
    try {
      const res = await fetch('/cart?view=drawer', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    } catch (e) {}
    const res = await fetch('/cart.js');
    const cart = await res.json();
    const subtotalEl = document.getElementById('CartSubtotal');
    if (subtotalEl) {
      subtotalEl.textContent = this.formatMoney(cart.total_price);
    }
    this.updateCartCount();
  },

  formatMoney(cents) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  },

  /* ── CART DRAWER ── */
  openCart() {
    const drawer = document.getElementById('CartDrawer');
    if (drawer) {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  },

  closeCart() {
    const drawer = document.getElementById('CartDrawer');
    if (drawer) {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  },

  /* ── SEARCH ── */
  openSearch() {
    const overlay = document.getElementById('SearchOverlay');
    if (overlay) {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(() => overlay.querySelector('input')?.focus(), 100);
    }
  },

  closeSearch() {
    const overlay = document.getElementById('SearchOverlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  },

  /* ── CARD QUICK ADD ── */
  async quickAdd(variantId, btn) {
    if (!variantId) return;
    const orig = btn.textContent;
    btn.textContent = 'Adding...';
    btn.disabled = true;
    try {
      await this.addToCart(variantId, 1);
      btn.textContent = 'Added!';
      this.openCart();
      this.updateCartCount();
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
    } catch (e) {
      btn.textContent = orig;
      btn.disabled = false;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => SixthAve.init());

/* Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    SixthAve.closeCart();
    SixthAve.closeSearch();
    const navDrawer = document.querySelector('.sa-nav-drawer');
    if (navDrawer) navDrawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }
});
