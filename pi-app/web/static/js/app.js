// ── Inactivity Timer ──────────────────────────────────────────────────────────
let inactivityTimer;
const INACTIVITY_MS = 25000;

function resetTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        const active = document.querySelector('.screen.active');
        if (active && active.id !== 'splash-screen' && active.id !== 'processing-screen') {
            showScreen('splash-screen');
        }
    }, INACTIVITY_MS);
}
document.addEventListener('touchstart', resetTimer);
document.addEventListener('click', resetTimer);

// ── Screen Manager ────────────────────────────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        setTimeout(() => { if (!s.classList.contains('active')) s.style.display = 'none'; }, 300);
    });
    const t = document.getElementById(id);
    setTimeout(() => {
        t.style.display = 'flex';
        void t.offsetHeight;
        t.classList.add('active');
    }, 280);
    resetTimer();
}

// ── Splash ────────────────────────────────────────────────────────────────────
document.getElementById('splash-screen').addEventListener('click', () => {
    showScreen('menu-screen');
    loadMenu();
});

// ── Menu State ────────────────────────────────────────────────────────────────
let allDrinks = [];
let selectedCategory = 'All';
let selectedGroup    = 'All';
let currentSnapPage = 0;
let mediaObserver;
let scrollRafPending = false;

function getPageSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    const availableH = h - 140;
    // Increased row height estimation for larger cards
    let rows = Math.floor(availableH / 250);
    if (rows < 1) rows = 1;

    let cols = 1;
    if (w > 1280) {
        cols = Math.floor((w - 300) / 420);
    } else if (w > 900) {
        cols = Math.floor((w - 260) / 360);
    } else if (w > 640) {
        cols = Math.floor((w - 200) / 280);
    }
    
    if (cols < 1) cols = 1;
    
    return cols * rows;
}

// ── Load Data ─────────────────────────────────────────────────────────────────
async function loadMenu() {
    try {
        const res = await fetch('/api/drinks');
        if (!res.ok) throw new Error('API fail');
        allDrinks = await res.json();
    } catch (e) {
        console.warn('API error, empty data', e);
        allDrinks = [];
    }
    renderSidebar();
    renderSnapMenu();
}

// ── Filter ────────────────────────────────────────────────────────────────────
function filterDrinks() {
    return allDrinks.filter(d => {
        const catMatch   = selectedCategory === 'All' || d.category === selectedCategory;
        const groupMatch = selectedGroup    === 'All' || d.ui_group  === selectedGroup;
        return catMatch && groupMatch;
    });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
    const catsEl   = document.getElementById('sidebar-categories');
    const groupsEl = document.getElementById('sidebar-groups');

    // Unique categories from data
    const categories = ['All', ...new Set(allDrinks.map(d => d.category).filter(Boolean))];
    catsEl.innerHTML = categories.map(c => `
        <div class="nav-item ${c === selectedCategory ? 'active' : ''}"
             onclick="selectCategory('${c.replace(/'/g, "\\'")}')">
            ${c === 'All' ? 'All Drinks' : c}
        </div>`).join('');

    // Groups scoped to the selected category
    const scopedDrinks = selectedCategory === 'All'
        ? allDrinks
        : allDrinks.filter(d => d.category === selectedCategory);
    const groups = ['All', ...new Set(scopedDrinks.map(d => d.ui_group).filter(Boolean))];
    groupsEl.innerHTML = groups.map(g => `
        <div class="nav-item ${g === selectedGroup ? 'active' : ''}"
             onclick="selectGroup('${g.replace(/'/g, "\\'")}')">
            ${g === 'All' ? 'All Groups' : g}
        </div>`).join('');
}

// ── Select Handlers ───────────────────────────────────────────────────────────
function selectCategory(cat) {
    selectedCategory = cat;
    selectedGroup    = 'All'; // reset group when category changes
    currentSnapPage = 0;
    renderSidebar();
    renderSnapMenu();
}

function selectGroup(group) {
    selectedGroup = group;
    currentSnapPage = 0;
    renderSidebar();
    renderSnapMenu();
}

function renderMedia(drink) {
    if (!drink.media) {
        return '<div class="media-placeholder">NO MEDIA</div>';
    }

    if (drink.media_type === 'video') {
        return `
            <video muted loop playsinline preload="metadata" data-media-video="1">
                <source src="${drink.media}" type="video/mp4">
            </video>
        `;
    }

    return `<img src="${drink.media}" alt="${drink.name}" loading="lazy" decoding="async">`;
}

function chunkDrinks(items, size) {
    const pages = [];
    for (let i = 0; i < items.length; i += size) {
        pages.push(items.slice(i, i + size));
    }
    return pages;
}

function setupMediaObserver() {
    if (mediaObserver) mediaObserver.disconnect();

    mediaObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            if (!(video instanceof HTMLVideoElement)) return;

            if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, {
        root: document.getElementById('menu-snap-container'),
        threshold: [0.2, 0.65, 0.9],
    });

    document.querySelectorAll('video[data-media-video="1"]').forEach((video) => {
        mediaObserver.observe(video);
    });
}

function scrollToPage(pageIndex) {
    const pages = document.querySelectorAll('.drink-page');
    if (pageIndex >= 0 && pageIndex < pages.length) {
        pages[pageIndex].scrollIntoView({ behavior: 'smooth' });
    }
}

function renderPageIndicator(total, current) {
    const indicator = document.getElementById('page-indicator');
    indicator.innerHTML = '';

    for (let i = 0; i < total; i += 1) {
        const dot = document.createElement('span');
        dot.className = `page-dot${i === current ? ' active' : ''}`;
        dot.onclick = () => scrollToPage(i);
        indicator.appendChild(dot);
    }
}

function updateCurrentSnapPage() {
    const container = document.getElementById('menu-snap-container');
    const pages = document.querySelectorAll('.drink-page');
    if (!container || !pages.length) return;

    const pageHeight = container.clientHeight || 1;
    const nextPage = Math.round(container.scrollTop / pageHeight);
    const boundedPage = Math.max(0, Math.min(nextPage, pages.length - 1));

    if (boundedPage !== currentSnapPage) {
        currentSnapPage = boundedPage;
        renderPageIndicator(pages.length, currentSnapPage);
    }
}

function attachSnapScrollListener() {
    const container = document.getElementById('menu-snap-container');
    if (!container || container.dataset.listenerAttached === '1') return;

    container.addEventListener('scroll', () => {
        if (scrollRafPending) return;
        scrollRafPending = true;
        requestAnimationFrame(() => {
            updateCurrentSnapPage();
            scrollRafPending = false;
        });
    }, { passive: true });

    // Custom JS Continuous Touch Scroll (Fallback for Kiosks)
    let touchStartY = 0;
    
    container.addEventListener('touchstart', (e) => {
        if (!e.touches.length) return;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!e.touches.length) return;
        let currentY = e.touches[0].clientY;
        container.scrollBy(0, touchStartY - currentY);
        touchStartY = currentY;
    }, { passive: true });

    container.dataset.listenerAttached = '1';
}

function renderSnapMenu() {
    const drinks = filterDrinks();
    const pagesEl = document.getElementById('menu-pages');
    const snapContainer = document.getElementById('menu-snap-container');
    const count  = document.getElementById('menu-count');
    const pageSize = getPageSize();
    const drinkPages = chunkDrinks(drinks, pageSize);

    const totalPages = Math.max(1, drinkPages.length);
    if (currentSnapPage >= totalPages) currentSnapPage = totalPages - 1;

    const titleCat   = selectedCategory === 'All' ? 'All Drinks' : selectedCategory;
    const titleGroup = selectedGroup    === 'All' ? '' : ` — ${selectedGroup}`;
    document.getElementById('menu-title-display').textContent = `${titleCat}${titleGroup}`;
    count.textContent = `${drinks.length} drink${drinks.length !== 1 ? 's' : ''} available`;

    if (!drinks.length) {
        pagesEl.innerHTML = `<section class="drink-page"><div class="empty-state"><div style="font-size:2.5rem;">🍹</div><p>No drinks match this filter.</p></div></section>`;
        renderPageIndicator(1, 0);
        attachSnapScrollListener();
        return;
    }

    pagesEl.innerHTML = drinkPages.map((pageItems, pageIndex) => {
        const cardsHtml = pageItems.map((drink) => {
            const isAvail     = drink.available !== false;
            const ingredients = drink.ingredients || [];
            const numericPrice = Number(drink.price);
            const displayPrice = Number.isFinite(numericPrice)
                ? `₹${numericPrice.toFixed(2).replace(/\.00$/, '')}`
                : '₹0';

            const pillsHtml = ingredients.length
                ? ingredients.map((ing) => `<span>${ing.name} ${ing.amount_ml}ml</span>`).join('')
                : '<span class="chip-empty">No ingredients</span>';

            const buttonLabel = isAvail ? displayPrice : (drink.unavailable_reason || 'Out of Stock');

            return `
                <article class="drink-card${isAvail ? '' : ' unavailable'}" data-drink-id="${drink.id}" data-available="${isAvail}">
                    <div class="card-media">
                        ${renderMedia(drink)}
                    </div>
                    <div class="card-content">
                        <div class="top">
                            <h3>${drink.name}</h3>
                        </div>
                        <div class="ingredients">${pillsHtml}</div>
                        <div class="meta">
                            Glass: ${drink.glass || '—'} • Method: ${drink.method || '—'} • Ice: ${drink.has_ice ? 'Yes' : 'No'}
                        </div>
                        <button class="pour-btn" data-drink-id="${drink.id}" ${isAvail ? '' : 'disabled'}>${buttonLabel}</button>
                    </div>
                </article>`;
        }).join('');

        return `
            <section class="drink-page" data-page-index="${pageIndex}">
                <div class="drink-grid">
                    ${cardsHtml}
                </div>
            </section>`;
    }).join('');

    attachSnapScrollListener();
    renderPageIndicator(totalPages, currentSnapPage);
    setupMediaObserver();
    setupCardEvents();  // Attach strict, separated card + button click events

    snapContainer.scrollTop = currentSnapPage * snapContainer.clientHeight;
}

window.addEventListener('resize', () => {
    renderSnapMenu();
});

// ── Card & Button Events (Strict Separation) ──────────────────────────────────
function setupCardEvents() {
    // renderSnapMenu() rebuilds innerHTML every time, so all
    // elements are brand-new — no stale listeners to worry about.

    // ── BUTTON: open extras popup ─────────────────────────────────────────────
    document.querySelectorAll('.pour-btn[data-drink-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();  // 🔥 Strictly blocks card click from firing
            if (!btn.disabled) {
                const id = btn.dataset.drinkId;
                openExtrasPopup(id);
            }
        });
    });

    // ── CARD: navigate to drink details ───────────────────────────────────────
    document.querySelectorAll('.drink-card[data-drink-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            // Hard guard: if the click came from inside .pour-btn, do nothing
            if (e.target.closest('.pour-btn')) return;
            const available = card.dataset.available === 'true';
            if (!available) return;
            const id = card.dataset.drinkId;
            console.log('[Card Click] Drink detail for:', id);
            // Uncomment when drink detail page is ready:
            // window.location.href = `/drink/${id}`;
        });
    });
}
// ── Order & Extras ────────────────────────────────────────────────────────────
let pendingOrder = null;
let selectedExtras = [];
let isOrdering = false;  // Duplicate-order guard

function toggleExtra(extraIdStr) {
    const extraId = Number(extraIdStr);
    const extraObj = pendingOrder.availableExtras?.find(e => e.id === extraId);
    if (!extraObj) return;

    if (selectedExtras.some(e => e.id === extraId)) {
        selectedExtras = selectedExtras.filter(e => e.id !== extraId);
    } else {
        selectedExtras.push(extraObj);
    }
    updateTotal();
}

function updateTotal() {
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
    const total = pendingOrder.drinkPrice + extrasTotal;

    document.getElementById("modal-extras-total").innerText = `₹${extrasTotal.toFixed(2)}`;
    document.getElementById("modal-total-price").innerText = `₹${total.toFixed(2)}`;
}

async function openExtrasPopup(id) {
    const drink = allDrinks.find(d => d.id === id);
    if (!drink) return;

    const numericPrice = Number(drink.price);
    const drinkPrice = Number.isFinite(numericPrice) ? numericPrice : 0;

    pendingOrder = { id, drink, drinkPrice, availableExtras: [] };
    selectedExtras = [];

    const container = document.getElementById('extras-container');
    container.innerHTML = '<p style="text-align: center; color: #666;">Loading extras...</p>';
    
    document.getElementById('modal-drink-price').innerText = `₹${drinkPrice.toFixed(2)}`;
    updateTotal();
    document.getElementById('payment-modal').style.display = 'flex';
    document.getElementById('confirm-payment-btn').disabled = true;

    try {
        const res = await fetch('/api/manual-extras/');
        const extras = await res.json();
        pendingOrder.availableExtras = extras;
        
        if (extras && extras.length > 0) {
            container.innerHTML = extras.map(e => `
                <label style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f9f9f9; border-radius: 6px; cursor: pointer;">
                    <div>
                        <input type="checkbox" onchange="toggleExtra('${e.id}')" style="margin-right: 8px;">
                        ${e.name}
                    </div>
                    <div>₹${Number(e.price || 0).toFixed(2)}</div>
                </label>
            `).join('');
        } else {
            container.innerHTML = '<p style="text-align: center; color: #666;">No extras available.</p>';
        }
    } catch(e) {
        container.innerHTML = '<p style="text-align: center; color: red;">Failed to load extras. <button onclick="openExtrasPopup(\''+id+'\')">Retry</button></p>';
    } finally {
        document.getElementById('confirm-payment-btn').disabled = false;
    }
}

function cancelPayment() {
    pendingOrder = null;
    selectedExtras = [];
    document.getElementById('payment-modal').style.display = 'none';
}

async function handlePaymentConfirm() {
    if (!pendingOrder) return;
    
    const { id, drinkPrice } = pendingOrder;
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
    const totalAmount = drinkPrice + extrasTotal;
    
    const modal = document.getElementById('payment-modal');
    const btn = document.getElementById('confirm-payment-btn');
    
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    let success = false;
    try {
        success = typeof processPayment === 'function' ? await processPayment(totalAmount) : true;
        if (success) {
            modal.style.display = 'none';
            orderDrink(id, drinkPrice, selectedExtras, extrasTotal, totalAmount);
        } else {
            alert('Payment failed. Please try again.');
        }
    } catch (e) {
        console.error('Payment error:', e);
        alert('Payment error occurred.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Proceed to Payment';
    }
}

document.getElementById('confirm-payment-btn')?.addEventListener('click', handlePaymentConfirm);

async function orderDrink(id, drinkPrice = 0, extras = [], extrasTotal = 0, totalPrice = 0) {
    if (isOrdering) return;  // Block duplicate orders
    isOrdering = true;
    showScreen('processing-screen');
    try {
        const res = await fetch('/api/create-order/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                drink_id: id,
                drink_price: drinkPrice,
                extras: extras,
                extras_total: extrasTotal,
                total_price: totalPrice
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('Order failed:', err.detail || res.status);
            document.querySelector('.proc-title').textContent = '⚠️ Order Failed';
            document.querySelector('.proc-sub').textContent   = err.detail || 'Please try again.';
            setTimeout(() => {
                document.querySelector('.proc-title').textContent = 'Preparing Your Drink';
                document.querySelector('.proc-sub').textContent   = 'Please wait while we mix your order...';
                showScreen('menu-screen');
            }, 3000);
            return;
        }
    } catch (e) { console.warn('Order API error', e); }
    finally { isOrdering = false; }  // Always release the lock

    setTimeout(() => {
        renderSnapMenu();
        showScreen('menu-screen');
    }, 5000);
}

// ── Admin redirect ────────────────────────────────────────────────────────────
function goAdmin() { window.location.href = '/login'; }

// ── Boot ──────────────────────────────────────────────────────────────────────
const splash = document.getElementById('splash-screen');
splash.style.display = 'flex';
resetTimer();
