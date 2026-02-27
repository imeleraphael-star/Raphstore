// ------------------- UTILITY -------------------
function updateTotal() {
    let totale = 0;
    const rows = document.querySelectorAll('#cart-table tbody tr');
    rows.forEach(row => {
        const subtotalCell = row.querySelector('.td-subtotal');
        if (subtotalCell) totale += parseFloat(subtotalCell.textContent.replace('€','')) || 0;
    });
    document.getElementById('total-price').textContent = '€' + totale.toFixed(2);
}

function updateCartCount(carrello = null) {
    const countElement = document.getElementById('cart-count');
    if (!countElement) return;

    // Se non viene passato nulla, usa localStorage
    if (!carrello) {
        carrello = JSON.parse(localStorage.getItem('carrello')) || [];
    }

    const totale = carrello.reduce((acc, p) => acc + Number(p.quantita || 0), 0);
    countElement.textContent = totale;
}


// ------------------- LOCAL STORAGE -------------------
function caricaCarrelloDaLocalStorage() {
    const tbody = document.querySelector('#cart-table tbody');
    const carrello = JSON.parse(localStorage.getItem('carrello')) || [];
    tbody.innerHTML = '';

    if (!carrello.length) {
        tbody.innerHTML = '<tr><td colspan="5">Carrello vuoto</td></tr>';
        document.getElementById('total-price').textContent = '€0.00';
        return;
    }

    let totale = 0;

    carrello.forEach(item => {
        const subtotal = item.prezzo * item.quantita;
        totale += subtotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${item.img || '../immagini/default.png'}" width="50" style="margin-right: 8px;">
                ${item.nome}
            </td>
            <td>€${item.prezzo}</td>
            <td>
                <button onclick="modificaQuantitaLocal(${item.prodotto_id}, -1)">−</button>
                ${item.quantita}
                <button onclick="modificaQuantitaLocal(${item.prodotto_id}, 1)">+</button>
            </td>
            <td class="td-subtotal">€${subtotal.toFixed(2)}</td>
            <td>
                <button onclick="rimuoviDalCarrello(${item.prodotto_id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-price').textContent = `€${totale.toFixed(2)}`;
}

function modificaQuantitaLocal(id, delta) {
    let carrello = JSON.parse(localStorage.getItem('carrello')) || [];
    const index = carrello.findIndex(p => p.prodotto_id === id);

    if (index === -1) return;

    carrello[index].quantita += delta;

    if (carrello[index].quantita <= 0) {
        carrello.splice(index, 1);
    }

    localStorage.setItem('carrello', JSON.stringify(carrello));
    caricaCarrelloDaLocalStorage();
    updateCartCount(carrello);
}

function rimuoviDalCarrello(id) {
    let carrello = JSON.parse(localStorage.getItem('carrello')) || [];
    carrello = carrello.filter(p => p.prodotto_id !== id);
    localStorage.setItem('carrello', JSON.stringify(carrello));
    caricaCarrelloDaLocalStorage();
    updateCartCount(carrello);
}



async function modificaQtyDB(id, delta) {
    const res = await fetch('/cart', { credentials: 'include' });
    const carrello = await res.json();

    const item = carrello.find(p => p.prodotto_id === id);
    if (!item) return;

    const nuovaQuantita = item.quantita + delta;

    if (nuovaQuantita <= 0) {
        await rimuoviProdottoDB(id);
        return;
    }

    await fetch('/cart', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prodotto_id: id,
            quantita: delta   // 👈 IL SERVER CAPISCE QUESTO
        })
    });

    await caricaCarrelloDalServer();
}


async function rimuoviProdottoDB(id) {
    await fetch(`/cart/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    await caricaCarrelloDalServer();
}


// ------------------- SERVER DB -------------------
async function caricaCarrelloDalServer() {
    const res = await fetch('/cart', { credentials: 'include' });
    if (!res.ok) throw new Error();
    const carrello = await res.json();
    const tbody = document.querySelector('#cart-table tbody');
    tbody.innerHTML = '';

    if (!carrello.length) {
        tbody.innerHTML = '<tr><td colspan="5">Carrello vuoto</td></tr>';
        document.getElementById('total-price').textContent = '€0.00';
        return;
    }

    carrello.forEach(item => {
        const subtotal = item.prezzo_totale;
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><img src="${item.img || '../immagini/default.png'}" width="50"> ${item.nome}</td>
            <td>€${(subtotal / item.quantita).toFixed(2)}</td>
            <td>
                <button onclick="modificaQtyDB(${item.prodotto_id}, -1)">−</button>
                ${item.quantita}
                <button onclick="modificaQtyDB(${item.prodotto_id}, 1)">+</button>
            </td>
            <td class="td-subtotal">€${subtotal.toFixed(2)}</td>
            <td><button onclick="rimuoviProdottoDB(${item.prodotto_id})">X</button></td>
        `;
        tbody.appendChild(tr);
    });

    updateTotal();
    updateCartCount(carrello);
}

async function aggiungiProdottoDB(item) {
    await fetch('/cart/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prodotto_id: item.id, quantita: item.quantita })
    });
}

// ------------------- CHECKOUT -------------------
document.getElementById('btnCheckout').addEventListener('click', async () => {
    try {
        // controlla se l'utente è loggato
        const res = await fetch('/me', { credentials: 'include' });
        const me = await res.json();

        let carrello = [];

        if (me.logged) {
            // LOGGATO → prendi carrello dal DB
            const cartRes = await fetch('/cart', { credentials: 'include' });
            carrello = await cartRes.json();
        } else {
            // NON LOGGATO → usa localStorage
            carrello = JSON.parse(localStorage.getItem('carrello')) || [];
        }

        if (!carrello.length) {
            alert('Carrello vuoto');
            return;
        }

        // salva carrello per checkout e reindirizza
        sessionStorage.setItem('checkout', JSON.stringify(carrello));
        window.location.href = 'check-out.html';

    } catch (e) {
        // fallback in caso di errore fetch → usa localStorage
        const carrelloLS = JSON.parse(localStorage.getItem('carrello')) || [];
        if (!carrelloLS.length) {
            alert('Carrello vuoto');
            return;
        }

        sessionStorage.setItem('checkout', JSON.stringify(carrelloLS));
        window.location.href = 'check-out.html';
    }
});



// ------------------- AVVIO -------------------
document.addEventListener('DOMContentLoaded', () => {
    // Pulisce tabella e totale iniziale
    const tbody = document.querySelector('#cart-table tbody');
    tbody.innerHTML = '';
    document.getElementById('total-price').textContent = '€0.00';

    // Controlla se utente loggato
    fetch('/me', { credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(async me => {
            if (me.logged) {
                // sincronizza carrello locale con DB
                const carrelloLS = JSON.parse(localStorage.getItem('carrello')) || [];
                for (const item of carrelloLS) {
                    await aggiungiProdottoDB(item); // invia al DB
                }
                localStorage.removeItem('carrello');
                await caricaCarrelloDalServer();
            } else {
                throw new Error();
            }
        })
        .catch(() => {
            // NON LOGGATO → carrello locale
            const carrelloLS = JSON.parse(localStorage.getItem('carrello')) || [];
            if (carrelloLS.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">Carrello vuoto</td></tr>';
                document.getElementById('total-price').textContent = '€0.00';
                return;
            }
            caricaCarrelloDaLocalStorage();
        });
});
