/* ===========================
   VARIABILI GLOBALI
=========================== */
let prodotti = [];
let paginaCorrente = 1;
const perPagina = 16;


/* ===========================
   LETTURA PARAMETRI URL
=========================== */
const params = new URLSearchParams(window.location.search);
const soloOfferte = params.get("offerte") === "true";
console.log("soloOfferte:", soloOfferte);


/* ===========================
   CARICA PRODOTTI
=========================== */
async function caricaProdotti() {
    try {
        let url = "/prodotti";

        if (soloOfferte) {
            url += "?offerte=1";
        }

        const res = await fetch(url);

        prodotti = await res.json();
        mostraPagina(1);
    } catch (e) {
        console.error("Errore caricamento prodotti:", e);

    }
}

/* ===========================
   MOSTRA PAGINA PRODOTTI
=========================== */
function mostraPagina(pagina) {
    const container = document.getElementById("products-container");
    container.innerHTML = "";

    const start = (pagina - 1) * perPagina;
    const end = start + perPagina;
    const paginaProdotti = prodotti.slice(start, end);

    paginaProdotti.forEach(p => {
        const div = document.createElement("div");
        div.className = "product-card";

        const img = p.img || "html/immagini/default.png";

        // Calcola prezzo scontato e badge se c'è sconto
        let prezzoScontato = p.prezzo;   // default prezzo normale
        let badge = "";                  // default nessun badge

        if (p.sconto && p.sconto > 0) {
            prezzoScontato = (p.prezzo * (100 - p.sconto) / 100).toFixed(2); // prezzo dopo sconto
            badge = `<div class="badge-offerta">OFFERTA -${p.sconto}%</div>`; // badge rosso
        }


        /* CARD PRODOTTO HTML + CUORE WISHLIST */
        div.innerHTML = `
            <a href="dettagli.html?id=${p.id}">
                <img src="${img}" alt="${p.nome}">
                <h3>${p.nome}</h3>
                <p>${p.descrizione}</p>
                <div class="price">
                    ${p.sconto > 0 ? `<span class="old-price">€${p.prezzo}</span> €${prezzoScontato}` : `€${p.prezzo}`}
                </div>
                ${badge}   
            </a>

            <div class="actions">
                <button class="btn-add-cart">Aggiungi al carrello</button>
                <span class="heart" data-id="${p.id}">♡</span>
            </div>
        `;

        container.appendChild(div);

        /* --- AGGIUNTA AL CARRELLO --- */
        div.querySelector('.btn-add-cart').addEventListener('click', () => {
            aggiungiAlCarrello(p);
        });

        /* --- GESTIONE CUORE/WISHLIST --- */
        const cuore = div.querySelector(".heart");

        // Imposta cuore rosso se già salvato in wishlist
        if (isInWishlist(p.id)) {
            cuore.classList.add("active");
            cuore.textContent = "❤️";
        }

        cuore.addEventListener("click", (e) => {
            e.preventDefault(); // evita apertura del link

            cuore.classList.toggle("active");

            if (cuore.classList.contains("active")) {
                cuore.textContent = "❤️";
            } else {
                cuore.textContent = "♡";
            }

            toggleWishlist(p);
        });
    });

    paginaCorrente = pagina;
document.getElementById("pageNumber").textContent = `${pagina}/3`;

// Mostra/nascondi frecce in base alla pagina corrente
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const maxPage = 3; // totale pagine

if (paginaCorrente === 1) {
    prevBtn.style.display = "none"; // nasconde freccia precedente
} else {
    prevBtn.style.display = "inline-block";
}

if (paginaCorrente === maxPage) {
    nextBtn.style.display = "none"; // nasconde freccia successiva
} else {
    nextBtn.style.display = "inline-block";
}

aggiornaStatoCuori();

}

/* ===========================
   WISHLIST STORAGE FUNZIONI
=========================== */

function toggleWishlist(prodotto) {
    let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
    const index = wishlist.findIndex(item => item.id === prodotto.id);

    if (index !== -1) {
        wishlist.splice(index, 1); // rimuovi
    } else {
        wishlist.push(prodotto);  // aggiungi
    }

    localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

function isInWishlist(id) {
    const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
    return wishlist.some(p => p.id === id);
}

/* ===========================
   AGGIUNGI AL CARRELLO
=========================== */
async function aggiungiAlCarrello(prodotto) {
    try {
        const res = await fetch('/me', { credentials: 'include' });
        const me = await res.json();

        if (me.logged) {
            // LOGGATO → DB
            await fetch('/cart', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prodotto_id: prodotto.id,
                    quantita: 1
                })
            });
        } else {
            throw new Error();
        }
    } catch {
        // NON LOGGATO → localStorage
        let carrello = JSON.parse(localStorage.getItem('carrello')) || [];
        const index = carrello.findIndex(p => p.prodotto_id === prodotto.id);

        if (index !== -1) {
            carrello[index].quantita += 1;
        } else {
            carrello.push({
                prodotto_id: prodotto.id,
                nome: prodotto.nome,
                prezzo: prodotto.prezzo,
                img: prodotto.img || '',
                quantita: 1
            });
        }

        localStorage.setItem('carrello', JSON.stringify(carrello));
    }

    // ✅ Aggiorna contatore in tutte le pagine
    updateCartCount();

    // ✅ Se siamo su carrello.html, aggiorna la tabella
    if (document.getElementById("cart-table")) {
        caricaCarrelloDaLocalStorage();
    }

    // ✅ Sincronizza storage anche per eventuali altre schede aperte
    window.dispatchEvent(new Event('storage'));
}



window.addEventListener("storage", function(event) {
    if (event.key === "wishlist") {
        aggiornaStatoCuori();
    }
});


/* ===========================
   PAGINAZIONE
=========================== */
document.getElementById("nextPage").addEventListener("click", () => {
    const maxPage = Math.ceil(prodotti.length / perPagina);
    if (paginaCorrente < maxPage) mostraPagina(paginaCorrente + 1);
});

document.getElementById("prevPage").addEventListener("click", () => {
    if (paginaCorrente > 1) mostraPagina(paginaCorrente - 1);
});

/* ===========================
   AGGIORNA NUMERO CARRELLO
=========================== */
async function updateCartCount() {
    const countElement = document.getElementById("cart-count");
    if (!countElement) return;

    try {
        const res = await fetch('/me', { credentials: 'include' });

        if (res.ok) {
            // 🔐 LOGGATO → DB
            const r = await fetch('/cart', { credentials: 'include' });
            const carrello = await r.json();
            const totale = carrello.reduce((acc, p) => acc + p.quantita, 0);
            countElement.textContent = totale;
            return;
        }
    } catch {}

    // ❌ NON LOGGATO → localStorage
    const carrello = JSON.parse(localStorage.getItem("carrello")) || [];
    const totale = carrello.reduce((acc, p) => acc + p.quantita, 0);
    countElement.textContent = totale;
}


/* =====================================================
   ⭐ RICERCA DINAMICA – RISULTATI IN TEMPO REALE ⭐
===================================================== */

// ----------------------------
// BARRA DI RICERCA DINAMICA
// ----------------------------
/* ------------- RICERCA DINAMICA (SOSTITUISCI LA VECCHIA PARTE) ------------- */

// elementi
const barraRicerca = document.getElementById("barraRicerca");
const suggestionsBox = document.getElementById("suggestions");
const clearFilterBtn = document.getElementById("clearFilterBtn"); // opzionale, vedi HTML sopra

// Assicurati che 'prodotti' sia l'array globale popolato da caricaProdotti()
if (typeof prodotti === 'undefined') window.prodotti = [];

// Mostra suggerimenti in tempo reale (su tutto l'array 'prodotti')
barraRicerca.addEventListener("input", () => {
    const q = barraRicerca.value.trim().toLowerCase();
    if (!q) {
        suggestionsBox.style.display = "none";
        return;
    }

    // Cerca su tutto l'array prodotti (nome + descrizione)
    const risultati = (prodotti || []).filter(p =>
        (p.nome || "").toLowerCase().includes(q) ||
        (p.descrizione || "").toLowerCase().includes(q)
    );

    if (risultati.length === 0) {
        suggestionsBox.innerHTML = `<div class="suggestion-item">Nessun risultato</div>`;
        suggestionsBox.style.display = "block";
        return;
    }

    suggestionsBox.innerHTML = risultati.slice(0, 10).map(p => `
        <div class="suggestion-item" data-id="${p.id}">
            ${p.nome} ${p.prezzo ? `— €${p.prezzo}` : ''}
        </div>
    `).join("");
    suggestionsBox.style.display = "block";

    // click su suggerimento → dettagli
    suggestionsBox.querySelectorAll(".suggestion-item").forEach(item => {
        item.addEventListener("click", () => {
            const id = item.dataset.id;
            window.location.href = `dettagli.html?id=${id}`;
        });
    });
});

// nascondi suggerimenti se clicchi fuori
document.addEventListener("click", (e) => {
    if (!barraRicerca.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = "none";
    }
});

// Invio nella barra: esegue una ricerca globale e mostra i risultati (ignora paginazione)
barraRicerca.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        cercaProdotto(); // mostra risultati filtrati sulla griglia
    }
});

// Funzione invocabile per cercare e mostrare risultati (su tutto l'array)
function cercaProdotto() {
    const q = barraRicerca.value.trim().toLowerCase();

    // se vuota -> ripristina paginazione
    if (!q) {
        mostraPagina(1);
        if (clearFilterBtn) clearFilterBtn.style.display = "none";
        return;
    }

    // filtra su tutto l'array globale 'prodotti'
    const risultati = (prodotti || []).filter(p =>
        (p.nome || "").toLowerCase().includes(q) ||
        (p.descrizione || "").toLowerCase().includes(q)
    );

    mostraRisultati(risultati);

    if (clearFilterBtn) clearFilterBtn.style.display = "inline-block";
}

// Mostra una lista arbitraria di prodotti (usata per mostrare risultati ricerca)
function mostraRisultati(lista) {
    const container = document.getElementById("products-container");
    container.innerHTML = "";

    if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = "<p>Nessun prodotto trovato.</p>";
        return;
    }

    lista.forEach(p => {
        const div = document.createElement("div");
        div.className = "product-card";

        const img = p.img || "html/immagini/default.png";

        div.innerHTML = `
            <a href="dettagli.html?id=${p.id}">
                <img src="${img}" alt="${p.nome}">
                <h3>${p.nome}</h3>
                <p>${p.descrizione}</p>
                <div class="price">€${p.prezzo}</div>
            </a>
            <div class="card-actions">
                <button class="btn-add-cart">Aggiungi al carrello</button>
                <button class="btn-wishlist" data-id="${p.id}" aria-pressed="false">♡</button>
            </div>
        `;

        container.appendChild(div);

        // evento aggiungi al carrello
        div.querySelector('.btn-add-cart').addEventListener('click', () => {
            aggiungiAlCarrello(p);
        });

        // wishlist: toggle on/off (modifica localStorage 'wishlist' che è un array di id/product)
        const heartBtn = div.querySelector('.btn-wishlist');
        heartBtn.addEventListener('click', () => {
            toggleWishlistItem(p);
            aggiornaCuore(heartBtn, p.id);
        });
        // imposta stato iniziale cuore (se già in wishlist)
        aggiornaCuore(heartBtn, p.id);
    });

    // nascondi navigazione paginazione quando mostri risultati?
    // se vuoi tenere paginazione visibile puoi togliere questa parte
    const pagination = document.querySelector(".pagination");
    if (pagination) pagination.style.display = "none";
}

// ripristina paginazione (mostra pagina 1)
function ripristinaPaginazione() {
    const pagination = document.querySelector(".pagination");
    if (pagination) pagination.style.display = "flex";
    mostraPagina(1);
    if (clearFilterBtn) clearFilterBtn.style.display = "none";
}

// clear filter button (se lo stai mostrando)
if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", () => {
        barraRicerca.value = "";
        ripristinaPaginazione();
    });
}

// wishlist helpers
function getWishlist() {
    return JSON.parse(localStorage.getItem('wishlist')) || [];
}
function setWishlist(arr) {
    localStorage.setItem('wishlist', JSON.stringify(arr));
}
function toggleWishlistItem(prod) {
    // store oggetti interi nella wishlist (o solo id, scegli tu) — qui salvo oggetti
    const list = getWishlist();
    const idx = list.findIndex(x => x.id === prod.id);
    if (idx === -1) {
        // aggiungi
        list.push({ id: prod.id, nome: prod.nome, prezzo: prod.prezzo, img: prod.img || '' });
    } else {
        // rimuovi
        list.splice(idx, 1);
    }
    setWishlist(list);
    // sincronizza il profilo (se vuoi) via localStorage chiave 'wishlist' (già fatto)
}

// aggiorna aspetto cuore
function aggiornaCuore(buttonEl, prodId) {
    const list = getWishlist();
    const exists = list.some(x => x.id === prodId);
    if (exists) {
        buttonEl.textContent = '❤';
        buttonEl.style.color = 'red';
        buttonEl.setAttribute('aria-pressed','true');
    } else {
        buttonEl.textContent = '♡';
        buttonEl.style.color = '';
        buttonEl.setAttribute('aria-pressed','false');
    }
}

// quando carichi una pagina di risultati o la pagina prodotti principale,
// esegui questa funzione per sincronizzare i cuori già presenti
function aggiornaStatoCuori() {
    document.querySelectorAll('.btn-wishlist').forEach(btn => {
        const prodId = btn.dataset.id;
        if (prodId) aggiornaCuore(btn, prodId);
    });
}

// Se la pagina mostra i prodotti via mostraPagina(), chiama aggiornaStatoCuori() alla fine di mostraPagina()
// Esempio: nella tua funzione mostraPagina(pagina) aggiungi dopo il loop:
//    aggiornaStatoCuori();
// e quando caricaProdotti() chiama mostraPagina(1), verranno sincronizzati i cuori.

// Se vuoi: dopo caricamento iniziale, sincronizza i cuori
window.addEventListener("DOMContentLoaded", () => {

    // 1️⃣ Mostra etichetta se arrivo dalla home (offerte)
    if (soloOfferte) {
        const label = document.getElementById("offerteLabel");
        if (label) {
            label.style.display = "block";
        }
    }

    // 2️⃣ Carica prodotti (normali o in offerta)
    caricaProdotti();

    // 3️⃣ Sincronizza wishlist (cuori)
    setTimeout(aggiornaStatoCuori, 50);

    
    updateCartCount();

});