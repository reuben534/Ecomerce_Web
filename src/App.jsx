import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import AuthDialog from './AuthDialog.jsx';

const products = [
  {
    id: 1,
    name: 'Studio wireless headphones',
    category: 'Audio',
    price: 1899,
    oldPrice: 2299,
    rating: 4.9,
    reviews: 128,
    badge: 'BESTSELLER',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
    color: 'sand',
  },
  {
    id: 2,
    name: 'Everyday carry camera',
    category: 'Tech',
    price: 7499,
    rating: 4.8,
    reviews: 84,
    badge: 'JUST IN',
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85',
    color: 'blue',
  },
  {
    id: 3,
    name: 'Form watch, brushed steel',
    category: 'Wearables',
    price: 2499,
    oldPrice: 2999,
    rating: 4.7,
    reviews: 56,
    badge: '−17%',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85',
    color: 'pink',
  },
  {
    id: 4,
    name: 'Soft-angle lounge chair',
    category: 'Home',
    price: 5299,
    rating: 4.9,
    reviews: 39,
    badge: null,
    image:
      'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=85',
    color: 'green',
  },
  {
    id: 5,
    name: 'Pocket-size bluetooth speaker',
    category: 'Audio',
    price: 1199,
    rating: 4.6,
    reviews: 203,
    badge: 'COMMUNITY FAV',
    image:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85',
    color: 'lilac',
  },
  {
    id: 6,
    name: 'Daybreak runner sneakers',
    category: 'Everyday',
    price: 1699,
    rating: 4.8,
    reviews: 91,
    badge: null,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
    color: 'yellow',
  },
  {
    id: 7,
    name: 'Sunday acetate sunglasses',
    category: 'Everyday',
    price: 899,
    oldPrice: 1099,
    rating: 4.5,
    reviews: 47,
    badge: '−18%',
    image:
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85',
    color: 'peach',
  },
  {
    id: 8,
    name: 'Slow morning pour-over set',
    category: 'Home',
    price: 1399,
    rating: 4.9,
    reviews: 116,
    badge: 'SMALL BATCH',
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
    color: 'lilac',
  },
];

const categories = ['Everything', 'Tech', 'Audio', 'Home', 'Wearables', 'Everyday'];

function formatPrice(price) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(price);
}

function ProductCard({ product, onAdd, onWishlist }) {
  return (
    <article className="product-card">
      <div className={`product-image ${product.color}`}>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button
          className="save-button"
          type="button"
          aria-label={`Login to save ${product.name}`}
          onClick={onWishlist}
        >
          <Heart size={17} />
        </button>
        <img src={product.image} alt={product.name} loading="lazy" />
        <button className="quick-add" type="button" onClick={() => onAdd(product)}>
          <Plus size={17} />
          <span>Add to bag</span>
        </button>
      </div>
      <div className="product-info">
        <div className="product-copy">
          <span className="product-category">{product.category}</span>
          <h3>{product.name}</h3>
          <div className="product-rating">
            <span className="rating-star">★</span> {product.rating}{' '}
            <span className="rating-count">({product.reviews})</span>
          </div>
        </div>
        <div className="product-price">
          <strong>{formatPrice(product.price)}</strong>
          {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
        </div>
      </div>
    </article>
  );
}

function CartDrawer({ cart, user, onClose, onQuantityChange, onOrderPlaced, onAuthRequired }) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('standard');
  const [orderReference, setOrderReference] = useState('');
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  function placeDemoOrder(event) {
    event.preventDefault();
    setOrderReference(`SS-DEMO-${Date.now().toString(36).toUpperCase()}`);
    onOrderPlaced();
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="eyebrow">{orderReference ? 'LOCAL PREVIEW' : checkoutOpen ? 'DELIVERY + PAYMENT' : 'YOUR GOOD FINDS'}</span>
            <h2 id="cart-title">{orderReference ? 'Order received' : checkoutOpen ? 'Checkout' : <>Your bag <span>({itemCount})</span></>}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close bag" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {orderReference ? (
          <div className="order-confirmation">
            <div className="confirmation-icon"><Check size={26} /></div>
            <span className="eyebrow">DEMO ORDER CREATED</span>
            <h3>Your order is ready for its next step.</h3>
            <div className="order-reference"><span>Order reference</span><strong>{orderReference}</strong></div>
            <div className="payment-simulated"><Check size={14} /> Payment simulated</div>
            <p>No money moved and no card details were collected. This demo order is not saved to a server and will be lost when you close or refresh this page.</p>
            <button className="button button-dark" type="button" onClick={onClose}>
              Continue shopping <ArrowRight size={16} />
            </button>
          </div>
        ) : checkoutOpen ? (
          <form className="checkout-form" onSubmit={placeDemoOrder}>
            <p className="checkout-disclaimer">Demo only. Payment is simulated in this browser; no card details or real money are involved.</p>

            <div className="checkout-fields">
              <label className="checkout-field field-wide">
                <span>Full name</span>
                <input name="fullName" autoComplete="name" required />
              </label>
              <label className="checkout-field field-wide">
                <span>Phone number</span>
                <input name="phone" type="tel" autoComplete="tel" required />
              </label>
              <label className="checkout-field">
                <span>Province</span>
                <input name="province" autoComplete="address-level1" required />
              </label>
              <label className="checkout-field">
                <span>City</span>
                <input name="city" autoComplete="address-level2" required />
              </label>
              <label className="checkout-field field-wide">
                <span>Street address</span>
                <input name="streetAddress" autoComplete="street-address" required />
              </label>
              <label className="checkout-field field-wide">
                <span>Postal code</span>
                <input name="postalCode" autoComplete="postal-code" required />
              </label>
            </div>

            <fieldset className="delivery-options">
              <legend>Delivery method</legend>
              <label className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="standard"
                  checked={deliveryMethod === 'standard'}
                  onChange={(event) => setDeliveryMethod(event.target.value)}
                />
                <span><strong>Standard delivery</strong><small>3–5 business days</small></span>
              </label>
              <label className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="express"
                  checked={deliveryMethod === 'express'}
                  onChange={(event) => setDeliveryMethod(event.target.value)}
                />
                <span><strong>Express delivery</strong><small>1–2 business days</small></span>
              </label>
            </fieldset>

            <fieldset className="payment-method">
              <legend>Payment method</legend>
              <div className="payment-option">
                <span className="payment-option-icon"><CreditCard size={17} /></span>
                <span className="payment-option-copy"><strong>Demo payment</strong><small>No gateway connected</small></span>
                <span className="payment-tag">SIMULATED</span>
              </div>
              <p>Continue to simulate a successful payment. No payment information is entered or stored.</p>
            </fieldset>

            <div className="checkout-summary">
              <div className="subtotal-line"><span>Merchandise subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <p>Delivery fees and taxes are not calculated in this preview.</p>
            </div>
            <button className="button button-dark checkout-button" type="submit">
              Simulate payment <ArrowRight size={17} />
            </button>
          </form>
        ) : cart.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-icon"><ShoppingBag size={25} /></div>
            <h3>Nothing in here. Yet.</h3>
            <p>Your next everyday favourite is waiting to be found.</p>
            <button className="button button-dark" type="button" onClick={onClose}>
              Explore the edit <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="free-shipping-note">
              <Truck size={16} /> Delivery options will be confirmed at checkout.
            </div>
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img src={item.image} alt="" />
                  <div className="cart-item-details">
                    <span className="product-category">{item.category}</span>
                    <h3>{item.name}</h3>
                    <strong>{formatPrice(item.price)}</strong>
                    <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() => onQuantityChange(item.id, -1)}
                      ><Minus size={13} /></button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        onClick={() => onQuantityChange(item.id, 1)}
                      ><Plus size={13} /></button>
                    </div>
                  </div>
                  <button
                    className="remove-item"
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => onQuantityChange(item.id, -item.quantity)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="drawer-footer">
              <div className="subtotal-line"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <p>Shipping and taxes are not calculated in this preview.</p>
              <button
                className="button button-dark checkout-button"
                type="button"
                onClick={() => user ? setCheckoutOpen(true) : onAuthRequired()}
              >
                Continue to checkout <ArrowRight size={17} />
              </button>
              <span className="checkout-note">Payment step is simulated · no card details requested</span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function App() {
  const [activeCategory, setActiveCategory] = useState('Everything');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('verify')) setAuthOpen(true);
    let active = true;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active) setAuthUser(result?.user ?? null);
      })
      .catch(() => {
        if (active) setAuthUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = activeCategory === 'Everything' || product.category === activeCategory;
      const matchesSearch = !query || `${product.name} ${product.category}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    if (sort === 'price-low') return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === 'price-high') return [...filtered].sort((a, b) => b.price - a.price);
    if (sort === 'rating') return [...filtered].sort((a, b) => b.rating - a.rating);
    return filtered;
  }, [activeCategory, search, sort]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  function addToCart(product) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);
      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
    setToast(`${product.name} added to your bag`);
    window.setTimeout(() => setToast(''), 2400);
  }

  function changeQuantity(productId, amount) {
    setCart((currentCart) => currentCart
      .map((item) => item.id === productId ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  }

  function requestWishlist() {
    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    setToast('Please login or register to use wishlist.');
    window.setTimeout(() => setToast(''), 2400);
  }

  return (
    <div className="app-shell">
      <div className="announcement-bar">
        <span><Sparkles size={14} /> Storefront preview · sample catalog and cart data</span>
        <a href="#the-edit">Meet your next favourite <ArrowRight size={13} /></a>
      </div>

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="SmartShop home">smart<span>shop</span><i>.</i></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-active" href="#the-edit">Shop all</a>
          <a href="#the-edit" onClick={() => setActiveCategory('Tech')}>Tech</a>
          <a href="#the-edit" onClick={() => setActiveCategory('Home')}>Home</a>
          <a href="#the-edit" onClick={() => setActiveCategory('Everyday')}>Everyday</a>
          <a className="nav-sale" href="#the-edit" onClick={() => setSort('price-low')}>Under R1,000</a>
        </nav>
        <div className="header-actions">
          <label className={`search-box${mobileSearchOpen ? ' is-open' : ''}`}>
            <button
              className="mobile-search-toggle"
              type="button"
              aria-label="Open product search"
              aria-expanded={mobileSearchOpen}
              onClick={() => {
                setMobileSearchOpen((open) => !open);
                window.setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
            >
              <Search size={17} />
            </button>
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Search products"
              placeholder="Find something good..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="account-button" type="button" onClick={() => setAuthOpen(true)} aria-label={authUser ? `Account for ${authUser.firstName}` : 'Sign in or create an account'}>
            <UserRound size={18} />
            <span>{authLoading ? 'Account' : authUser ? authUser.firstName : 'Sign in'}</span>
          </button>
          <button className="bag-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartCount} items`}>
            <ShoppingBag size={19} />
            <span className="bag-label">Bag</span>
            <span className="bag-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="kicker-dot" /> THE SMARTSHOP PREVIEW / NO. 01</div>
            <h1 id="hero-title">Good things.<br /><span>Good feeling.</span></h1>
            <p>Thoughtful finds for the everyday. Picked with care, made to be kept.</p>
            <a className="hero-link" href="#the-edit">Explore the edit <ArrowRight size={17} /></a>
            <div className="hero-footnote"><span>01 — 08</span><span className="hero-rule" /><span>THE EVERYDAY UPGRADE</span></div>
          </div>
          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1500&q=90"
              alt="A considered collection of everyday technology and desk essentials"
            />
            <div className="hero-sticker"><span>CURATED</span><strong>for your<br />everyday</strong><Check size={18} /></div>
            <div className="hero-image-caption"><span>THE GOOD STUFF, FOUND.</span><span>EST. 2026</span></div>
          </div>
          <div className="hero-index">SS / 26</div>
        </section>

        <section className="trust-strip" aria-label="Shopping benefits">
          <span><Sparkles size={15} /> A preview collection, picked for the everyday</span>
          <span className="trust-separator">✳</span>
          <span>Sample products · Local cart</span>
          <span className="trust-separator">✳</span>
          <span>Payments and delivery integrations are next</span>
        </section>

        <section className="catalog-section" id="the-edit">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SAMPLE CATALOG / A GOOD PLACE TO START</span>
              <h2>The everyday edit<span>.</span></h2>
            </div>
            <p>Useful, lovely, and just a little unexpected.</p>
          </div>

          <div className="catalog-toolbar">
            <div className="category-tabs" role="group" aria-label="Filter by category">
              {categories.map((category) => (
                <button
                  key={category}
                  className={activeCategory === category ? 'category-tab is-active' : 'category-tab'}
                  type="button"
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <label className="sort-control">
              <ArrowDownUp size={15} />
              <span className="sort-label">Sort:</span>
              <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </label>
          </div>

          <div className="results-line" aria-live="polite">
            <span>{search ? `RESULTS FOR “${search}”` : 'FRESHLY PICKED FOR YOU'}</span>
            <span>{visibleProducts.length} FINDS</span>
          </div>

          {visibleProducts.length > 0 ? (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={addToCart} onWishlist={requestWishlist} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <span className="no-results-icon"><Search size={22} /></span>
              <h3>No finds this time.</h3>
              <p>Try a different search or browse everything.</p>
              <button className="text-button" type="button" onClick={() => { setSearch(''); setActiveCategory('Everything'); }}>
                Clear filters <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>

        <section className="newsletter-band">
          <div className="newsletter-mark"><Sparkles size={22} /></div>
          <div><span className="eyebrow">A GOOD EMAIL, OCCASIONALLY</span><h2>Finds worth opening.</h2></div>
          <form className="newsletter-form" onSubmit={(event) => { event.preventDefault(); setToast('Email signup will be available when notifications are connected.'); window.setTimeout(() => setToast(''), 2600); }}>
            <label className="visually-hidden" htmlFor="newsletter-email">Email address</label>
            <input id="newsletter-email" type="email" placeholder="Your email address" required />
            <button type="submit" aria-label="Subscribe to the newsletter"><ArrowRight size={19} /></button>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <a className="wordmark footer-wordmark" href="#top">smart<span>shop</span><i>.</i></a>
        <span>Good things, found. © 2026 SmartShop</span>
        <a href="#top">Back to top ↑</a>
      </footer>

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
      {cartOpen && <CartDrawer
        cart={cart}
        user={authUser}
        onClose={() => setCartOpen(false)}
        onQuantityChange={changeQuantity}
        onOrderPlaced={() => setCart([])}
        onAuthRequired={() => setAuthOpen(true)}
      />}
      {authOpen && <AuthDialog
        user={authUser}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={setAuthUser}
        onLoggedOut={() => setAuthUser(null)}
      />}
      <button className="floating-filter" type="button" onClick={() => document.getElementById('the-edit')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Browse filters">
        <Search size={18} />
      </button>
    </div>
  );
}

export default App;