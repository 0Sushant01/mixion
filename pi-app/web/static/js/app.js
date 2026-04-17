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
        void t.offsetHeight;   // force reflow
        t.classList.add('active');
    }, 280);
    resetTimer();
}

// ── Slider value display ──────────────────────────────────────────────────────
function updateVal(el) {
    el.nextElementSibling.textContent = el.value + 'ml';
}

// ── Splash ────────────────────────────────────────────────────────────────────
document.getElementById('splash-screen').addEventListener('click', () => {
    showScreen('menu-screen');
    loadMenu();
});

// ── Menu Data ─────────────────────────────────────────────────────────────────
let allDrinks = [];

async function loadMenu() {
    try {
        const res = await fetch('/api/drinks');
        if (!res.ok) throw new Error('API fail');
        allDrinks = await res.json();
        if (!allDrinks.length) throw new Error('empty');
    } catch (e) {
        console.warn('Using mock data', e);
        allDrinks = [
            { id: 1, name: 'Neon Lime Surge', price: 50, available: true,  ingredients: [{name:'Cola',amount_ml:100},{name:'Lime Juice',amount_ml:30}] },
            { id: 2, name: 'Velvet Crimson',  price: 60, available: false, unavailable_reason: 'Cola low stock', ingredients: [{name:'Cola',amount_ml:80}] },
        ];
    }
    renderGrid(allDrinks);
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderGrid(drinks) {
    const grid  = document.getElementById('menu');
    const count = document.getElementById('menu-count');
    const avail = drinks.filter(d => d.available !== false).length;
    count.textContent = `${drinks.length} drink${drinks.length !== 1 ? 's' : ''} available`;

    grid.innerHTML = '';

    const pillIcons = ['🌿', '🍋', '🍓', '💧', '🫐', '🍊', '🌺', '🍃'];

    drinks.forEach((drink, i) => {
        const imgNum     = ((drink.id - 1) % 2) + 1;
        const isAvail    = drink.available !== false;

        // ── Ingredient pills ─────────────────────────────────────
        const ingredients = drink.ingredients || [];
        let pillsHtml = '';
        if (ingredients.length > 0) {
            pillsHtml = ingredients.map((ing, idx) => {
                const label = typeof ing === 'object'
                    ? `${ing.name} · ${ing.amount_ml}ml`
                    : ing;
                return `<span class="pill">
                    <span class="pill-icon">${pillIcons[idx % pillIcons.length]}</span>
                    ${label}
                </span>`;
            }).join('');
        } else {
            pillsHtml = `<span class="pill pill-empty">— No ingredients set</span>`;
        }

        const priceLabel = drink.price ? `₹${drink.price}` : '';

        // ── Card action area ──────────────────────────────────────
        const footerHtml = isAvail
            ? `${priceLabel ? `<div class="card-price">${priceLabel}</div>` : ''}
               <button class="card-pour-btn" onclick="event.stopPropagation(); orderDrink(${drink.id})">
                   Pour Now &nbsp;›
               </button>`
            : `${priceLabel ? `<div class="card-price card-price-dim">${priceLabel}</div>` : ''}
               <div class="card-unavail-btn">
                   ⚠️ Out of Stock
               </div>`;

        const card = document.createElement('div');
        card.className = `card${isAvail ? '' : ' unavailable'}`;
        card.style.animationDelay = `${i * 0.07}s`;

        card.innerHTML = `
            <div class="card-fav">❤️</div>
            ${!isAvail ? `<div class="card-unavail-overlay"><span class="card-unavail-chip">⚠️ Out of Stock</span></div>` : ''}
            <div class="card-img-wrap">
                <img class="card-img"
                     src="/static/images/${drink.id}.png"
                     onerror="this.onerror=null; this.src='/static/images/drink_1.png'; this.parentElement.style.minHeight='140px';">
            </div>
            <div class="card-body">
                <div class="card-name">${drink.name}</div>
                <div class="card-pills">${pillsHtml}</div>
                <div class="card-desc">
                    A refreshing, handcrafted blend — made fresh for you on demand.
                </div>
                <div class="card-footer">
                    ${footerHtml}
                </div>
            </div>`;

        // Only allow tap on available drinks
        if (isAvail) {
            card.onclick = () => orderDrink(drink.id);
        }
        grid.appendChild(card);
    });
}

// ── Filter ────────────────────────────────────────────────────────────────────
function filterDrinks(filter, el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    renderGrid(allDrinks);
}

// ── Order ─────────────────────────────────────────────────────────────────────
async function orderDrink(id) {
    showScreen('processing-screen');
    try {
        const res = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drink_id: id })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('Order failed:', err.detail || res.status);
            // Show error briefly then return to menu
            document.querySelector('.proc-title').textContent = '⚠️ Order Failed';
            document.querySelector('.proc-sub').textContent   = err.detail || 'Please try again.';
            setTimeout(() => {
                document.querySelector('.proc-title').textContent = 'Preparing Your Drink';
                document.querySelector('.proc-sub').textContent   = 'Please wait while we mix your order...';
                showScreen('menu-screen');
                loadMenu(); // refresh availability
            }, 3000);
            return;
        }
    } catch (e) { console.warn('Order API error', e); }

    // Return to menu after 5s and refresh stock
    setTimeout(() => {
        showScreen('menu-screen');
        loadMenu();
    }, 5000);
}

// ── Admin redirect ────────────────────────────────────────────────────────────
function goAdmin() { window.location.href = '/login'; }

// ── Boot ──────────────────────────────────────────────────────────────────────
const splash = document.getElementById('splash-screen');
splash.style.display = 'flex';
resetTimer();
