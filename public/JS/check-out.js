// Carica il carrello dal sessionStorage
function caricaCheckout() {
    const carrello = JSON.parse(sessionStorage.getItem("checkout")) || [];
    const container = document.getElementById("order-items");
    container.innerHTML = "";

    if(carrello.length === 0) {
        container.innerHTML = "<p>Il carrello è vuoto.</p>";
        document.getElementById("subtotal").textContent = "€0.00";
        aggiornaTotale();
        return;
    }

    let subtotal = 0;
    carrello.forEach(p => {
        const itemTotal = p.prezzo * p.quantita;
        subtotal += itemTotal;

        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `
            <img src="${p.img || '../immagini/default.png'}" alt="${p.nome}">
            <div class="item-info">
                <p>${p.nome}</p>
                <small>QTY: ${p.quantita}</small>
            </div>
            <span>€${itemTotal.toFixed(2)}</span>
        `;
        container.appendChild(div);
    });

    document.getElementById("subtotal").textContent = `€${subtotal.toFixed(2)}`;
    aggiornaTotale();
}

// Aggiorna totale comprensivo di spedizione
function aggiornaTotale() {
    const subtotal = parseFloat(document.getElementById("subtotal").textContent.replace("€","")) || 0;
    const shippingSelect = document.getElementById("shippingMethod");
    let shipping = 0;

    if(shippingSelect){
        const match = shippingSelect.options[shippingSelect.selectedIndex].text.match(/€([\d.]+)/);
        if(match) shipping = parseFloat(match[1]);
    }

    document.getElementById("shipping").textContent = `€${shipping.toFixed(2)}`;
    document.getElementById("total").textContent = `€${(subtotal+shipping).toFixed(2)}`;
}


// ================== CARICAMENTO INDIRIZZI E CARTE ==================
async function caricaDatiUtente() {
    const addressListEl = document.getElementById('address-list');
    const paymentListEl = document.getElementById('payment-list');

    addressListEl.innerHTML = '';
    paymentListEl.innerHTML = '';

    try {
        const res = await fetch('/me', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        let addresses = [];
        let cards = [];

        if (data.logged) {
            // Assicurati che siano array validi
            addresses = Array.isArray(data.user.indirizzi) ? data.user.indirizzi : [];
            cards = Array.isArray(data.user.carte) ? data.user.carte : [];
        } else {
            addresses = JSON.parse(localStorage.getItem('addresses')) || [];
            cards = JSON.parse(localStorage.getItem('cards')) || [];
        }

                // ================== MOSTRA INDIRIZZI ==================
if (addresses.length === 0) {
    addressListEl.innerHTML = '<p>Nessun indirizzo salvato</p>';
} else {

    // Rimuove duplicati basati su via + città + cap
    const uniqueAddresses = addresses.filter((v,i,a) => 
        a.findIndex(t => t.via === v.via && t.citta === v.citta && t.cap === v.cap) === i
    );

    uniqueAddresses.forEach((a, i) => {
        const row = document.createElement('div');
        row.className = 'address-card';
        row.innerHTML = `
            <input type="radio" name="address" data-index="${i}" ${i === 0 ? 'checked' : ''}>
            <div style="margin-left:8px;">
                <div style="font-weight:600;">${a.nome_destinatario || a.nome || ''} ${a.cognome || ''}</div>
                <div style="color:#555;">${a.via}, ${a.citta} ${a.cap}</div>
            </div>
            <div class="actions">
                <button class="small-btn edit-address" data-index="${i}">Modifica</button>
                <button class="small-btn delete-address" data-index="${i}">Elimina</button>
            </div>
        `;
        addressListEl.appendChild(row);
    });

    // Eventi elimina
    addressListEl.querySelectorAll('.delete-address').forEach(btn => {
        btn.onclick = async () => {
            const idx = parseInt(btn.dataset.index);
            if (uniqueAddresses[idx].id) {
                await fetch('/elimina-indirizzo', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id: uniqueAddresses[idx].id})
                });
            } else {
                addresses.splice(idx, 1);
                localStorage.setItem('addresses', JSON.stringify(addresses));
            }
            caricaDatiUtente(); // ricarica lista aggiornata
        };
    });

    // Eventi modifica
    addressListEl.querySelectorAll('.edit-address').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index);
            apriFormIndirizzo('edit', idx, uniqueAddresses[idx]);
        };
    });
}



        // ================== MOSTRA CARTE ==================
        if (cards.length === 0) {
            paymentListEl.innerHTML = '<p>Nessuna carta salvata</p>';
        } else {
            cards.forEach((c, i) => {
                const row = document.createElement('div');
                row.className = 'card-item';
                row.innerHTML = `
                    <input type="radio" name="card" data-index="${i}" ${i === 0 ? 'checked' : ''}>
                    <div>${c.nome} - **** ${c.numero.slice(-4)} (Scade: ${c.expiry || ''})</div>
                    <button class="edit-card" data-index="${i}">Modifica</button>
                    <button class="delete-card" data-index="${i}">Elimina</button>
                `;
                paymentListEl.appendChild(row);
            });
        }

    } catch (err) {
        console.error('Errore caricamento dati utente:', err);
        addressListEl.innerHTML = '<p>Errore nel caricamento indirizzi</p>';
        paymentListEl.innerHTML = '<p>Errore nel caricamento carte</p>';
    }
}


function selezionaIndirizzo(id) {
  console.log("Indirizzo selezionato:", id);
  // Qui puoi salvarlo in una variabile o in localStorage
}



function apriFormIndirizzo(mode='add', index=null, dati=null) {

    let modeAddress = { mode: 'add', index: null };
    modeAddress.mode = mode; modeAddress.index = index;
    const form = document.getElementById('new-address-form');
    if (mode === 'edit' && dati) {
        document.getElementById('newName').value = dati.nome_destinatario || '';
        document.getElementById('newSurname').value = '';
        document.getElementById('newStreet').value = dati.via || '';
        document.getElementById('newCity').value = dati.citta || '';
        document.getElementById('newCAP').value = dati.cap || '';
        document.getElementById('saveAddress').textContent = 'Aggiorna indirizzo';
    } else {
        document.getElementById('newName').value = '';
        document.getElementById('newSurname').value = '';
        document.getElementById('newStreet').value = '';
        document.getElementById('newCity').value = '';
        document.getElementById('newCAP').value = '';
        document.getElementById('saveAddress').textContent = 'Salva nuovo indirizzo';
    }
    form.classList.add('open');
}

function chiudiFormIndirizzo() {
    document.getElementById('new-address-form').classList.remove('open');
    modeAddress = { mode: 'add', index: null };
}

document.getElementById('saveAddress').addEventListener('click', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('newName').value.trim();
    const via = document.getElementById('newStreet').value.trim();
    const citta = document.getElementById('newCity').value.trim();
    const cap = document.getElementById('newCAP').value.trim();

    if (!nome || !via || !citta) {
        alert('Compila almeno Nome, Via e Città.');
        return;
    }

    try {
        const res = await fetch('/me');
        const data = await res.json();

        // 🔹 UTENTE LOGGATO → salva nel DB
        if (data.logged) {

            await fetch('/aggiungi-indirizzo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include",
                body: JSON.stringify({
                    nome_destinatario: nome,
                    via,
                    citta,
                    cap,
                    paese: 'Italia'
                })
            });

        } else {
            // 🔹 NON LOGGATO → salva in localStorage
            const addresses = JSON.parse(localStorage.getItem('addresses')) || [];
            addresses.push({ nome, via, citta, cap });
            localStorage.setItem('addresses', JSON.stringify(addresses));
        }

        await caricaDatiUtente();
        chiudiFormIndirizzo();

    } catch (err) {
        console.error('Errore salvataggio indirizzo:', err);
    }
});


document.getElementById('cancelAddress').addEventListener('click', (e) => { e.preventDefault(); chiudiFormIndirizzo(); });
document.getElementById('btnAddAddress').addEventListener('click', () => apriFormIndirizzo());

// ================= CARTE =================
let modeCard = { mode: 'add', index: null };
async function caricaCarte() {
    const container = document.getElementById('payment-list');
    container.innerHTML = '';
    let cards = [];

    // Controlla se l'utente è loggato
    try {
        const res = await fetch('/me');
        const data = await res.json();

        if (data.logged) {
            cards = data.user.carte || [];
        } else {
            cards = JSON.parse(localStorage.getItem('cards')) || [];
        }
    } catch (err) {
        console.error('Errore fetch carte:', err);
        cards = JSON.parse(localStorage.getItem('cards')) || [];
    }

    if (cards.length === 0) {
        container.innerHTML = '<p>Nessuna carta salvata</p>';
        return;
    }

    cards.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'card-item';
        row.innerHTML = `
            <input type="radio" name="card" data-index="${i}" ${i===0 ? 'checked':''}>
            <div>${c.nome} - **** ${c.numero.slice(-4)} (Scade: ${c.expiry})</div>
            <button class="edit-card" data-index="${i}">Modifica</button>
            <button class="delete-card" data-index="${i}">Elimina</button>
        `;
        container.appendChild(row);
    });

    container.querySelectorAll('.delete-card').forEach(btn => {
        btn.onclick = async () => {
            const idx = parseInt(btn.dataset.index);
            if (cards[idx].id) {
                // utente loggato → elimina dal DB
                await fetch('/elimina-carta', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id: cards[idx].id})
                });
            } else {
                // non loggato → elimina dal localStorage
                cards.splice(idx, 1);
                localStorage.setItem('cards', JSON.stringify(cards));
            }
            caricaCarte();
        };
    });

    container.querySelectorAll('.edit-card').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.index);
            apriFormCarta('edit', idx, cards[idx]);
        };
    });
}


function apriFormCarta(mode='add', index=null, dati=null) {
    modeCard.mode = mode; modeCard.index = index;
    const form = document.getElementById('new-card-form');
    if(dati && mode==='edit'){
        document.getElementById('cardName').value = dati.nome || '';
        document.getElementById('cardNumber').value = dati.numero || '';
        document.getElementById('cardExpiry').value = dati.expiry || '';
        document.getElementById('cardCVC').value = dati.cvc || '';
        document.getElementById('saveCard').textContent = 'Aggiorna carta';
    } else {
        document.getElementById('cardName').value='';
        document.getElementById('cardNumber').value='';
        document.getElementById('cardExpiry').value='';
        document.getElementById('cardCVC').value='';
        document.getElementById('saveCard').textContent = 'Salva carta';
    }
    form.classList.add('open');
}

function chiudiFormCarta() { document.getElementById('new-card-form').classList.remove('open'); modeCard={mode:'add',index:null}; }

document.getElementById('saveCard').addEventListener('click', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('cardName').value.trim();
    const numero = document.getElementById('cardNumber').value.trim();
    const expiry = document.getElementById('cardExpiry').value.trim();
    const cvc = document.getElementById('cardCVC').value.trim();

    if (!nome || !numero) { alert('Compila almeno Nome e Numero carta'); return; }

    try {
        // Controlla se l'utente è loggato
        const res = await fetch('/me', { credentials: 'include' });
        const data = await res.json();

        if (data.logged) {
            // Utente loggato → salva nel DB
            await fetch('/aggiungi-carta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nome, numero, expiry, cvc })
            });
        } else {
            // Utente non loggato → salva in localStorage
            const cards = JSON.parse(localStorage.getItem('cards')) || [];
            if (modeCard.mode === 'edit' && Number.isInteger(modeCard.index)) {
                cards[modeCard.index] = { nome, numero, expiry, cvc };
            } else {
                cards.push({ nome, numero, expiry, cvc });
            }
            localStorage.setItem('cards', JSON.stringify(cards));
        }

        await caricaCarte();
        chiudiFormCarta();

    } catch (err) {
        console.error('Errore salvataggio carta:', err);
        alert('Errore durante il salvataggio della carta');
    }
});

document.getElementById('cancelCard').addEventListener('click',(e)=>{ e.preventDefault(); chiudiFormCarta(); });
document.getElementById('btnAddCard').addEventListener('click',()=>apriFormCarta());

// ================= CONFERMA ORDINE =================
document.getElementById("confirmOrder").addEventListener("click", async () => {

    const orderItems = JSON.parse(sessionStorage.getItem("checkout")) || [];
    if (orderItems.length === 0) {
        alert("Non ci sono prodotti nel carrello!");
        return;
    }

    const selectedAddressIndex = document.querySelector('input[name="address"]:checked')?.dataset.index;
    const selectedCardIndex = document.querySelector('input[name="card"]:checked')?.dataset.index;

    if (selectedAddressIndex === undefined) {
        alert("Seleziona un indirizzo!");
        return;
    }

    if (selectedCardIndex === undefined) {
        alert("Seleziona una carta!");
        return;
    }

    try {

        const resUser = await fetch('/me', {
            credentials: 'include'
        });

        const data = await resUser.json();

        // 🔐 UTENTE LOGGATO → SALVA NEL DATABASE
        if (data.logged) {

            const addresses = data.user.indirizzi || [];
            const cards = data.user.carte || [];

            const address = addresses[selectedAddressIndex];
            const card = cards[selectedCardIndex];

            const subtotal = orderItems.reduce((sum, p) => sum + (p.prezzo * p.quantita), 0);
            const shipping = parseFloat(document.getElementById("shipping").textContent.replace("€", "")) || 0;
            const totale = subtotal + shipping;

            const dettagli = orderItems.map(p => ({
                prodotto_id: p.id,
                quantita: p.quantita,
                prezzo_unitario: p.prezzo,
                prezzo_totale: p.prezzo * p.quantita
            }));

            await fetch('/crea-ordine', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prezzo_totale: totale,
                    indirizzo_id: address.id,
                    metodo_pagamento_id: card.id,
                    dettagli
                })
            });

            alert("Ordine salvato nel database!");
        }

        // 👤 NON LOGGATO → LOCALSTORAGE
        else {

            const subtotal = orderItems.reduce((sum, p) => sum + (p.prezzo * p.quantita), 0);
            const shipping = parseFloat(document.getElementById("shipping").textContent.replace("€", "")) || 0;
            const totale = subtotal + shipping;

            const nuovoOrdine = {
                id: Date.now().toString(),
                data: new Date().toLocaleString(),
                stato: "In elaborazione",
                totale: totale,
                articoli: orderItems
            };

            const ordini = JSON.parse(localStorage.getItem("ordiniUtente")) || [];
            ordini.push(nuovoOrdine);
            localStorage.setItem("ordiniUtente", JSON.stringify(ordini));
        }

        sessionStorage.removeItem("checkout");
        window.location.href = "profilo.html";

    } catch (err) {
        console.error("Errore creazione ordine:", err);
        alert("Errore durante la creazione dell'ordine.");
    }

});

// ================= VISUALIZZAZIONE ORDINI =================
function caricaOrdiniProfilo() {
    const container = document.getElementById("orders-body");
    container.innerHTML = "";
    const ordini = JSON.parse(localStorage.getItem("ordiniUtente")) || [];

    if (ordini.length === 0) {
        container.innerHTML = "<p style='text-align:center;padding:20px;'>Nessun ordine effettuato.</p>";
        return;
    }

    ordini.forEach((order) => {
        const div = document.createElement("div");
        div.className = "order-card";

        const prodottiHTML = order.articoli.map(item => `
            <div class="order-product">
                <img src="${item.img || '../immagini/default.png'}" class="order-product-img">
                <div><strong>${item.nome}</strong><br>€${item.prezzo} x ${item.quantita}</div>
            </div>
        `).join("");

        div.innerHTML = `
            <div class="order-header">
                <div><strong>ID:</strong> ${order.id}</div>
                <div><strong>Data:</strong> ${order.data}</div>
                <div><strong>Stato:</strong> ${order.stato}</div>
                <div><strong>Totale Prodotti:</strong> ${order.totaleProdotti}</div>
                <div><strong>Spedizione:</strong> ${order.spedizione}</div>
                <div><strong>Totale:</strong> ${order.totale}</div>
                <button class="btn-delete-order">Elimina ordine</button>
            </div>
            <div class="order-items">${prodottiHTML}</div>
            <div class="order-address"><strong>Indirizzo:</strong> ${order.indirizzo.via} ${order.indirizzo.cognome || ''}, ${order.indirizzo.cap} ${order.indirizzo.citta}</div>
            <div class="order-payment"><strong>Pagamento:</strong> ${order.pagamento.nome} - ${order.pagamento.numero} (${order.pagamento.expiry})</div>
        `;

        // Evento delete basato su ID
        div.querySelector(".btn-delete-order").addEventListener("click", () => {
            if (confirm("Vuoi davvero eliminare questo ordine?")) {
                const ordiniCorrenti = JSON.parse(localStorage.getItem("ordiniUtente")) || [];
                const nuoviOrdini = ordiniCorrenti.filter(o => o.id !== order.id);
                localStorage.setItem("ordiniUtente", JSON.stringify(nuoviOrdini));
                caricaOrdiniProfilo(); // ricarica lista aggiornata
            }
        });

        container.appendChild(div);
    });
}



// ================= STILI =================
const style=document.createElement("style");
style.innerHTML=`
.order-card{border:1px solid #ccc;padding:10px;margin-bottom:10px;border-radius:5px;background:#fafafa;}
.order-header{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;align-items:center;font-size:0.95em;}
.order-items{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;}
.order-product{display:flex;gap:10px;align-items:center;border:1px solid #eee;padding:5px;border-radius:3px;background:#fff;}
.order-product-img{width:50px;height:50px;object-fit:cover;border:1px solid #aaa;border-radius:3px;}
.order-address,.order-payment{font-size:0.85em;margin-bottom:5px;}
.btn-delete-order{margin-left:auto;background:#ff4d4d;color:#fff;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;}
.btn-delete-order:hover{background:#e60000;}
`;
document.head.appendChild(style);

// ================= INIT =================
window.addEventListener('DOMContentLoaded', async () => {
    caricaCheckout();
    await caricaDatiUtente(); // mostra indirizzi e carte + eventi funzionanti
    await caricaCarte(); // carte già funzionanti
    caricaOrdiniProfilo();
});



function salvaMetodoPagamentoCheckout(carta) {
    let cards = JSON.parse(localStorage.getItem("cards")) || [];

    // Cerca se la carta esiste già (match ultimi 4 numeri)
    const last4 = carta.numero.slice(-4);
    const index = cards.findIndex(c => c.numero.slice(-4) === last4);

    if (index >= 0) {
        cards[index] = carta;  // aggiorna
    } else {
        cards.push(carta); // aggiungi nuova
    }

    localStorage.setItem("cards", JSON.stringify(cards));
}


const carta = {
    nome: document.getElementById("pmName").value,
    numero: document.getElementById("pmNumber").value.replace(/\s+/g, ""),
    expiry: document.getElementById("pmExpiry").value,
    cvc: document.getElementById("pmCVC").value
};

salvaMetodoPagamentoCheckout(carta);