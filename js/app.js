const EXCHANGE_RATE_PHP = 59.52;
const STORE_KEYS = {
  cart: 'techmint-cart',
  wishlist: 'techmint-wishlist'
};

const PRODUCTS = [
  { id: 1, name: 'AetherBook Pro 14', category: 'Laptop', priceUSD: 1399, image: '../assets/laptop.svg' },
  { id: 2, name: 'MintPods Max', category: 'Audio', priceUSD: 249, image: '../assets/audio.svg' },
  { id: 3, name: 'CyanPhone X', category: 'Mobile', priceUSD: 899, image: '../assets/mobile.svg' },
  { id: 4, name: 'Vector Keys 75', category: 'Accessory', priceUSD: 129, image: '../assets/keyboard.svg' },
  { id: 5, name: 'NovaStation One', category: 'Desktop', priceUSD: 1799, image: '../assets/desktop.svg' },
  { id: 6, name: 'PulseMouse Air', category: 'Accessory', priceUSD: 79, image: '../assets/mouse.svg' },
].map(product => ({ ...product, pricePHP: Math.round(product.priceUSD * EXCHANGE_RATE_PHP) }));

function getAssetPath(path) {
  return location.pathname.includes('/pages/') ? path : path.replace('../', '');
}

function formatPHP(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(amount);
}

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeCart(rawCart) {
  if (!Array.isArray(rawCart)) return [];

  if (rawCart.every(item => typeof item === 'number')) {
    const counts = new Map();
    rawCart.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
    return [...counts.entries()].map(([id, qty]) => ({ id: Number(id), qty }));
  }

  return rawCart
    .filter(item => item && typeof item.id !== 'undefined')
    .map(item => ({ id: Number(item.id), qty: Math.max(1, Number(item.qty) || 1) }));
}

function readCart() {
  const cart = normalizeCart(readStore(STORE_KEYS.cart, []));
  writeStore(STORE_KEYS.cart, cart);
  return cart;
}

function writeCart(cart) {
  writeStore(STORE_KEYS.cart, normalizeCart(cart).filter(item => item.qty > 0));
}

function getCartDetailedItems() {
  return readCart().map(entry => {
    const product = PRODUCTS.find(product => product.id === entry.id);
    return product ? { ...product, qty: entry.qty, lineTotal: product.pricePHP * entry.qty } : null;
  }).filter(Boolean);
}

function getCartCount() {
  return readCart().reduce((sum, item) => sum + item.qty, 0);
}

function getWishlist() {
  const wishlist = readStore(STORE_KEYS.wishlist, []);
  const normalized = Array.isArray(wishlist)
    ? [...new Set(wishlist.map(id => Number(id)).filter(id => Number.isFinite(id)))]
    : [];
  writeStore(STORE_KEYS.wishlist, normalized);
  return normalized;
}

function writeWishlist(wishlist) {
  writeStore(STORE_KEYS.wishlist, [...new Set(wishlist.map(id => Number(id)).filter(id => Number.isFinite(id)))]);
}

function getWishlistDetailedItems() {
  return getWishlist().map(id => PRODUCTS.find(product => product.id === id)).filter(Boolean);
}

function syncCounts() {
  const cartEl = document.getElementById('cartCount');
  const wishEl = document.getElementById('wishlistCount');
  if (cartEl) cartEl.textContent = getCartCount();
  if (wishEl) wishEl.textContent = getWishlist().length;
}

function addToCart(productId) {
  const cart = readCart();
  const item = cart.find(entry => entry.id === productId);
  if (item) item.qty += 1;
  else cart.push({ id: productId, qty: 1 });
  writeCart(cart);
  syncCounts();
  renderMiniCart();
  showToast('Added to cart');
}

function addToWishlist(productId) {
  const wishlist = getWishlist();
  if (wishlist.includes(productId)) {
    showToast('Already in wishlist');
    renderWishlist();
    return;
  }
  wishlist.push(productId);
  writeWishlist(wishlist);
  syncCounts();
  renderWishlist();
  renderProducts();
  showToast('Saved to wishlist');
}

function removeFromWishlist(productId) {
  const wishlist = getWishlist().filter(id => id !== productId);
  writeWishlist(wishlist);
  syncCounts();
  renderWishlist();
  renderProducts();
  showToast('Removed from wishlist');
}

function moveWishlistItemToCart(productId) {
  addToCart(productId);
  removeFromWishlist(productId);
}

function updateCartQty(productId, nextQty) {
  const cart = readCart().map(item => item.id === productId ? { ...item, qty: nextQty } : item).filter(item => item.qty > 0);
  writeCart(cart);
  syncCounts();
  renderMiniCart();
  renderCheckoutPage();
}

function removeFromCart(productId) {
  const cart = readCart().filter(item => item.id !== productId);
  writeCart(cart);
  syncCounts();
  renderMiniCart();
  renderCheckoutPage();
}

function getCartSummary() {
  const items = getCartDetailedItems();
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = items.length ? (subtotal >= 50000 ? 0 : 299) : 0;
  const protection = items.length ? 149 : 0;
  const total = subtotal + shipping + protection;
  return { items, subtotal, shipping, protection, total };
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  let category = params.get('category') || 'All';
  let sort = 'featured';

  const searchInput = document.getElementById('searchInput');

  const run = () => {
    let items = [...PRODUCTS];
    const q = (searchInput?.value || '').toLowerCase().trim();
    if (category !== 'All') items = items.filter(p => p.category === category);
    if (q) items = items.filter(p => [p.name, p.category].some(v => v.toLowerCase().includes(q)));
    if (sort === 'price-asc') items.sort((a, b) => a.pricePHP - b.pricePHP);
    if (sort === 'price-desc') items.sort((a, b) => b.pricePHP - a.pricePHP);
    if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));

    grid.innerHTML = items.map(product => `
      <article class="product-card glass reveal-up">
        <div class="product-media"><img src="${getAssetPath(product.image)}" alt="${product.name}" /></div>
        <div class="product-meta">
          <div class="product-topline">${product.category}</div>
          <h3 class="product-title">${product.name}</h3>
          <div class="price-row">
            <div>
              <div class="price">${formatPHP(product.pricePHP)}</div>
              <div class="price-sub">Fast nationwide delivery</div>
            </div>
            <span class="stock-pill">In stock</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" data-cart="${product.id}">Add to cart</button>
            <button class="btn btn-secondary" data-wishlist="${product.id}">${getWishlist().includes(product.id) ? 'Saved' : 'Wishlist'}</button>
          </div>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('[data-cart]').forEach(btn => btn.addEventListener('click', () => addToCart(Number(btn.dataset.cart))));
    grid.querySelectorAll('[data-wishlist]').forEach(btn => btn.addEventListener('click', () => addToWishlist(Number(btn.dataset.wishlist))));
  };

  setupCustomSelects({
    category: value => { category = value; run(); },
    sort: value => { sort = value; run(); }
  });

  if (category !== 'All') {
    const catSelect = document.querySelector('[data-select="category"]');
    const option = catSelect?.querySelector(`.select-option[data-value="${category}"]`);
    option?.click();
  }

  searchInput?.addEventListener('input', run);
  run();
}

function setupCustomSelects(handlers = {}) {
  document.querySelectorAll('.custom-select').forEach(select => {
    const trigger = select.querySelector('.select-trigger');
    const menu = select.querySelector('.select-menu');
    const label = select.querySelector('.select-label');
    const icon = select.querySelector('.select-icon');
    const key = select.dataset.select;

    trigger?.addEventListener('click', event => {
      event.stopPropagation();
      document.querySelectorAll('.custom-select.open').forEach(other => {
        if (other !== select) {
          other.classList.remove('open');
          other.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
      select.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(select.classList.contains('open')));
    });

    menu?.querySelectorAll('.select-option').forEach(option => {
      option.addEventListener('click', () => {
        menu.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        label.textContent = option.textContent.trim();
        icon.textContent = option.dataset.icon || '•';
        select.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        handlers[key]?.(option.dataset.value);
      });
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.custom-select')) {
      document.querySelectorAll('.custom-select.open').forEach(select => {
        select.classList.remove('open');
        select.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

function renderWishlist() {
  const host = document.getElementById('wishlistItems');
  const summaryHost = document.getElementById('wishlistSummary');
  if (!host) return;

  const items = getWishlistDetailedItems();
  host.innerHTML = items.length ? items.map(item => `
    <div class="drawer-item">
      <img src="${getAssetPath(item.image)}" alt="${item.name}" />
      <div class="drawer-copy">
        <strong>${item.name}</strong>
        <div class="muted">${item.category}</div>
        <div class="muted">${formatPHP(item.pricePHP)}</div>
        <div class="drawer-qty-row">
          <button class="link-btn" data-wishlist-cart="${item.id}">Move to cart</button>
          <button class="link-btn" data-remove-wishlist="${item.id}">Remove</button>
        </div>
      </div>
    </div>
  `).join('') : '<p class="muted">Your wishlist is empty.</p>';

  if (summaryHost) {
    const total = items.reduce((sum, item) => sum + item.pricePHP, 0);
    summaryHost.innerHTML = items.length ? `
      <div class="summary-line"><span>Saved items</span><strong>${items.length}</strong></div>
      <div class="summary-line total"><span>Total value</span><strong>${formatPHP(total)}</strong></div>
      <a class="btn btn-primary btn-block" href="${location.pathname.includes('/pages/') ? 'products.html' : 'pages/products.html'}">Continue shopping</a>
    ` : '<div class="summary-line total"><span>Saved items</span><strong>0</strong></div>';
  }

  host.querySelectorAll('[data-wishlist-cart]').forEach(button => {
    button.addEventListener('click', () => moveWishlistItemToCart(Number(button.dataset.wishlistCart)));
  });

  host.querySelectorAll('[data-remove-wishlist]').forEach(button => {
    button.addEventListener('click', () => removeFromWishlist(Number(button.dataset.removeWishlist)));
  });
}

function renderMiniCart() {
  const host = document.getElementById('miniCartItems');
  const summaryHost = document.getElementById('miniCartSummary');
  if (!host) return;

  const summary = getCartSummary();
  host.innerHTML = summary.items.length ? summary.items.map(item => `
    <div class="drawer-item">
      <img src="${getAssetPath(item.image)}" alt="${item.name}" />
      <div class="drawer-copy">
        <strong>${item.name}</strong>
        <div class="muted">${item.category}</div>
        <div class="drawer-qty-row">
          <button class="qty-btn" data-qty-change="-1" data-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-qty-change="1" data-id="${item.id}" aria-label="Increase quantity">+</button>
          <button class="link-btn" data-remove-item="${item.id}">Remove</button>
        </div>
      </div>
      <strong>${formatPHP(item.lineTotal)}</strong>
    </div>
  `).join('') : '<p class="muted">Your cart is empty.</p>';

  if (summaryHost) {
    summaryHost.innerHTML = summary.items.length ? `
      <div class="summary-line"><span>Subtotal</span><strong>${formatPHP(summary.subtotal)}</strong></div>
      <div class="summary-line"><span>Shipping</span><strong>${summary.shipping ? formatPHP(summary.shipping) : 'Free'}</strong></div>
      <div class="summary-line"><span>Protection</span><strong>${formatPHP(summary.protection)}</strong></div>
      <div class="summary-line total"><span>Total</span><strong>${formatPHP(summary.total)}</strong></div>
      <a class="btn btn-primary btn-block" href="${location.pathname.includes('/pages/') ? 'checkout.html' : 'pages/checkout.html'}">Proceed to shipping</a>
    ` : '<div class="summary-line total"><span>Total</span><strong>₱0</strong></div>';
  }

  host.querySelectorAll('[data-qty-change]').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      const delta = Number(button.dataset.qtyChange);
      const current = readCart().find(item => item.id === id)?.qty || 0;
      updateCartQty(id, current + delta);
    });
  });

  host.querySelectorAll('[data-remove-item]').forEach(button => {
    button.addEventListener('click', () => removeFromCart(Number(button.dataset.removeItem)));
  });
}

function setupDrawer() {
  const cartDrawer = document.getElementById('miniCartDrawer');
  const wishlistDrawer = document.getElementById('wishlistDrawer');

  const closeDrawer = drawer => {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  };

  const openDrawer = (drawer, renderFn, otherDrawer) => {
    if (!drawer) return;
    const willOpen = !drawer.classList.contains('open');
    closeDrawer(otherDrawer);
    drawer.classList.toggle('open', willOpen);
    drawer.setAttribute('aria-hidden', String(!willOpen));
    if (willOpen) renderFn?.();
  };

  document.getElementById('cartBtn')?.addEventListener('click', () => {
    openDrawer(cartDrawer, renderMiniCart, wishlistDrawer);
  });

  document.getElementById('wishlistBtn')?.addEventListener('click', () => {
    openDrawer(wishlistDrawer, renderWishlist, cartDrawer);
  });

  document.querySelectorAll('[data-close-drawer]').forEach(button => {
    button.addEventListener('click', () => closeDrawer(button.closest('.drawer')));
  });
}

function renderCheckoutPage() {
  const shippingForm = document.getElementById('shippingForm');
  const orderItems = document.getElementById('checkoutItems');
  const orderSummary = document.getElementById('checkoutSummary');
  if (!shippingForm || !orderItems || !orderSummary) return;

  const summary = getCartSummary();

  orderItems.innerHTML = summary.items.length ? summary.items.map(item => `
    <article class="checkout-item glass">
      <img src="${getAssetPath(item.image)}" alt="${item.name}" />
      <div>
        <div class="product-topline">${item.category}</div>
        <h3 class="product-title">${item.name}</h3>
        <div class="drawer-qty-row">
          <button class="qty-btn" data-qty-change="-1" data-id="${item.id}">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-qty-change="1" data-id="${item.id}">+</button>
          <button class="link-btn" data-remove-item="${item.id}">Remove</button>
        </div>
      </div>
      <strong>${formatPHP(item.lineTotal)}</strong>
    </article>
  `).join('') : '<div class="glass empty-state"><h3>Your cart is empty</h3><p class="muted">Browse the catalog and add a few favorites to continue.</p><a class="btn btn-primary" href="products.html">Shop now</a></div>';

  orderSummary.innerHTML = `
    <div class="summary-line"><span>Items</span><strong>${summary.items.reduce((sum, item) => sum + item.qty, 0)}</strong></div>
    <div class="summary-line"><span>Subtotal</span><strong>${formatPHP(summary.subtotal)}</strong></div>
    <div class="summary-line"><span>Shipping</span><strong>${summary.shipping ? formatPHP(summary.shipping) : 'Free'}</strong></div>
    <div class="summary-line"><span>Protection</span><strong>${formatPHP(summary.protection)}</strong></div>
    <div class="summary-line total"><span>Grand total</span><strong>${formatPHP(summary.total)}</strong></div>
    <p class="muted tiny-copy">Free shipping unlocks automatically for orders over ${formatPHP(50000)}.</p>
  `;

  const savedShipping = readStore('techmint-shipping', {});
  shippingForm.querySelectorAll('[name]').forEach(field => {
    if (savedShipping[field.name]) field.value = savedShipping[field.name];
  });

  orderItems.querySelectorAll('[data-qty-change]').forEach(button => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      const delta = Number(button.dataset.qtyChange);
      const current = readCart().find(item => item.id === id)?.qty || 0;
      updateCartQty(id, current + delta);
    });
  });

  orderItems.querySelectorAll('[data-remove-item]').forEach(button => {
    button.addEventListener('click', () => removeFromCart(Number(button.dataset.removeItem)));
  });

  shippingForm.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(shippingForm);
    const payload = Object.fromEntries(formData.entries());
    writeStore('techmint-shipping', payload);
    showToast('Shipping details saved');
  });
}

function showToast(message) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'site-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  syncCounts();
  renderProducts();
  renderMiniCart();
  renderWishlist();
  renderCheckoutPage();
  setupDrawer();
});
