/* ----------------------------------------------------
   NAVIGAZIONE PROFILO
---------------------------------------------------- */
const links = document.querySelectorAll('.menu-link');
const sections = document.querySelectorAll('.section');

/* ----------------------------------------------------
   APERTURA SEZIONE DA URL (es. profilo.html#orders)
---------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    // attiva link corretto
    links.forEach(l => {
        l.classList.toggle("active", l.dataset.target === hash);
    });

    // mostra sezione corretta
    sections.forEach(sec => {
        sec.classList.toggle("active", sec.id === hash);
    });

    // scroll morbido
    const targetSection = document.getElementById(hash);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth" });
    }
});


links.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        const target = link.dataset.target;
        sections.forEach(sec => {
            sec.classList.remove('active');
            if (sec.id === target) sec.classList.add('active');
        });
    });
});

/* ----------------------------------------------------
   LOGOUT
---------------------------------------------------- */
document.getElementById("logout").addEventListener("click", function(e) {
    e.preventDefault();
    if (confirm("Vuoi davvero uscire dal tuo account?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "check-out.html";
    }
});

/* ----------------------------------------------------
   CARICAMENTO ORDINI – VERSIONE FINALE FUNZIONANTE
---------------------------------------------------- */



/* ----------------------------------------------------
   METODI DI PAGAMENTO — VERSIONE DEFINITIVA
---------------------------------------------------- */

// DOM elements
const paymentsList = document.getElementById('payments-list');
const addPaymentBtn = document.getElementById('addPaymentBtn');
const paymentModal = document.getElementById('paymentModal');
const paymentModalTitle = document.getElementById('paymentModalTitle');

const pmName = document.getElementById('pmName');
const pmNumber = document.getElementById('pmNumber');
const pmExpiry = document.getElementById('pmExpiry');
const pmCVC = document.getElementById('pmCVC');

const savePaymentBtn = document.getElementById('savePaymentBtn');
const closePaymentModal = document.getElementById('closePaymentModal');

let editingPaymentIndex = null;

/* --------------------------------
   APRI MODAL (aggiungi/modifica)
-------------------------------- */
function openPaymentModal(index = null) {
    editingPaymentIndex = index !== null ? parseInt(index) : null;

    if (editingPaymentIndex !== null) {
        // Modal in modalità modifica
        const cards = JSON.parse(localStorage.getItem('cards')) || [];
        const card = cards[editingPaymentIndex];

        paymentModalTitle.textContent = "Modifica carta";

        pmName.value = card.nome;
        pmNumber.value = card.numero;
        pmExpiry.value = card.expiry;
        pmCVC.value = card.cvc;
    } else {
        // Modal in modalità aggiunta
        paymentModalTitle.textContent = "Aggiungi carta";

        pmName.value = "";
        pmNumber.value = "";
        pmExpiry.value = "";
        pmCVC.value = "";
    }

    paymentModal.classList.remove("hidden");
}

/* --------------------------------
   CHIUDI MODAL
-------------------------------- */
closePaymentModal.addEventListener("click", () => {
    paymentModal.classList.add("hidden");
});

/* --------------------------------
   SALVA CARTA (nuova o modificata)
-------------------------------- */
async function loadPayments() {
    const res = await fetch('/me');
    const data = await res.json();
    const cards = data.user.carte || [];
    
    paymentsList.innerHTML = '';

    if (cards.length === 0) {
        paymentsList.innerHTML = '<p>Nessun metodo di pagamento salvato</p>';
        return;
    }

    cards.forEach((card, index) => {
        const row = document.createElement('div');
        row.className = 'payment-row';
        row.innerHTML = `
            <div class="payment-info">
                <strong>${card.intestatario}</strong> — •••• ${card.numero.slice(-4)}
                <br><small>Scadenza: ${card.scadenza || '—'}</small>
            </div>
            <div class="payment-actions">
                <button class="btn-small edit-pay" data-id="${card.id}">Modifica</button>
                <button class="btn-small delete-pay" data-id="${card.id}">Elimina</button>
            </div>
        `;
        paymentsList.appendChild(row);
    });

    document.querySelectorAll('.delete-pay').forEach(btn => {
        btn.addEventListener('click', () => deleteCard(btn.dataset.id));
    });

    document.querySelectorAll('.edit-pay').forEach(btn => {
        btn.addEventListener('click', () => openPaymentModal(btn.dataset.id));
    });
}

/* --------------------------------
   MODIFICA CARTA
-------------------------------- */

savePaymentBtn.addEventListener("click", async () => {

    console.log("CLICK SALVA CARTA");


    const cardData = {
        numero: pmNumber.value.replace(/\s+/g, ''),
        scadenza: pmExpiry.value,
        cvv: pmCVC.value.trim(),
        intestatario: pmName.value.trim()
    };

    if (!cardData.numero || !cardData.intestatario) {
        alert("Inserisci almeno intestatario e numero carta");
        return;
    }

    const url = editingPaymentIndex !== null ? '/modifica-carta' : '/aggiungi-carta';
    if (editingPaymentIndex !== null) cardData.id = editingPaymentIndex;


    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
    });

    paymentModal.classList.add("hidden");
    loadPayments();
});


/* --------------------------------
   ELIMINA CARTA
-------------------------------- */
async function deleteCard(id) {
    if (!confirm("Vuoi eliminare questa carta?")) return;

    await fetch('/elimina-carta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });

    loadPayments();
}


/* --------------------------------
   AVVIO AUTOMATICO
-------------------------------- */
addPaymentBtn.addEventListener("click", () => openPaymentModal());
document.addEventListener('DOMContentLoaded', loadPayments);



/* ----------------------------------------------------
   PROFILO – MODIFICA SOLO PASSWORD
---------------------------------------------------- */
const passwordInput = document.getElementById("password");
const editBtn = document.getElementById("editBtn");

const sidebarName = document.querySelector(".username");
const sidebarEmail = document.querySelector(".user-email");

editBtn.addEventListener("click", async () => {
    if (editBtn.textContent === "Modifica") {
        // Abilita solo password
        passwordInput.disabled = false;
        passwordInput.focus();
        editBtn.textContent = "Salva";
    } else {
        // Salva la nuova password
        const newPassword = passwordInput.value.trim();
        if (!newPassword) {
            alert("Inserisci una nuova password prima di salvare.");
            return;
        }

        try {
            const res = await fetch('/me/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                alert("Password aggiornata con successo!");
                passwordInput.disabled = true;
                passwordInput.value = ''; // pulisce campo password
                editBtn.textContent = "Modifica";

                // Aggiorna sidebar con dati dell’utente dalla sessione
                const meRes = await fetch('/me');
                const meData = await meRes.json();
                if (meData.logged) {
                    sidebarName.textContent = `${meData.user.nome} ${meData.user.cognome}`;
                    sidebarEmail.textContent = meData.user.email;
                }

            } else {
                alert(data.error || "Errore durante l'aggiornamento della password.");
            }
        } catch (err) {
            console.error(err);
            alert("Errore server, riprova più tardi.");
        }
    }
});


async function caricaOrdiniUtente() {
  try {
    const res = await fetch('/me'); // <-- da qui prendi tutto
    const data = await res.json();

    if (!data.logged) return;

    const ordini = data.user.ordini || [];
    const container = document.getElementById('ordersList');
    container.innerHTML = '';

    if (ordini.length === 0) {
      container.innerHTML = '<p>Nessun ordine trovato</p>';
      return;
    }

    ordini.forEach(ordine => {
      const div = document.createElement('div');
      div.classList.add('ordine-card');

      div.innerHTML = `
        <p><strong>Ordine #${ordine.id}</strong></p>
        <p>Data: ${new Date(ordine.created_at).toLocaleDateString()}</p>
        <p>Totale: € ${ordine.total}</p>
        <button onclick="eliminaOrdine(${ordine.id})">Elimina</button>
        <hr>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error('Errore caricamento ordini:', err);
  }
}


async function eliminaOrdine(id) {
  if (!confirm("Vuoi eliminare questo ordine?")) return;

  try {
    await fetch('/ordini/' + id, { method: 'DELETE' });
    caricaOrdiniUtente();
  } catch (err) {
    console.error("Errore eliminazione:", err);
    alert("Errore eliminazione ordine");
  }
}




/* ----------------------------------------------------
   MOSTRA NASCONDI PASSWORD
---------------------------------------------------- */
const togglePassword = document.getElementById("togglePassword");
const passwordField = document.getElementById("password");

if (togglePassword && passwordField) {
    togglePassword.addEventListener("click", () => {
        const isPassword = passwordField.type === "password";
        passwordField.type = isPassword ? "text" : "password";
        togglePassword.textContent = isPassword ? "🙈" : "👁️";
    });
}


/* ----------------------------------------------------
   GESTIONE INDIRIZZI – VERSIONE SERVER / DATABASE
---------------------------------------------------- */

const indirizziLista = document.getElementById("indirizziLista");
const mainAddress = document.getElementById("mainAddress");

const addAddressBtn = document.getElementById("addAddressBtn");
const addressModal = document.getElementById("addressModal");
const modalTitle = document.getElementById("modalTitle");

const viaInput = document.getElementById("viaInput");
const civicoInput = document.getElementById("civicoInput");
const capInput = document.getElementById("capInput");
const cittaInput = document.getElementById("cittaInput");
const paeseInput = document.getElementById("paeseInput");
const nomeDestInput = document.getElementById("nomeDestInput");

const saveAddressBtn = document.getElementById("saveAddress");
const closeModalBtn = document.getElementById("closeModal");

let editingIndex = null;
let indirizzi = [];

/* --------------------------------
   CARICAMENTO INDIRIZZI DAL SERVER
-------------------------------- */
async function caricaIndirizziProfilo() {
    try {
        const res = await fetch('/me');
        const data = await res.json();

        if (!data.logged) {
            mainAddress.textContent = "Non sei loggato";
            indirizziLista.innerHTML = "<p>Accedi per vedere gli indirizzi.</p>";
            return;
        }

        indirizzi = data.user.indirizzi || [];
        indirizziLista.innerHTML = "";

        if (indirizzi.length === 0) {
            mainAddress.textContent = "Nessun indirizzo";
            indirizziLista.innerHTML = "<p>Nessun indirizzo salvato</p>";
            return;
        }

        // Indirizzo principale = primo elemento
        const principale = indirizzi[0];
        mainAddress.textContent = `${principale.via} ${principale.civico}, ${principale.cap} ${principale.citta} (${principale.paese})`;

        // Lista dinamica
        indirizzi.forEach((ind, i) => {
            const wrapper = document.createElement("div");
            wrapper.className = "address-item";
            wrapper.innerHTML = `
                <div class="address-details">
                    <div><strong>Indirizzo ${i+1}</strong></div>
                    <div>${ind.via} ${ind.civico}</div>
                    <div>${ind.cap} - ${ind.citta}</div>
                    <div>${ind.paese}</div>
                    <div>Destinatario: ${ind.nome_destinatario || '—'}</div>
                </div>
                <div class="address-actions">
                    <button class="btn-secondary edit-address" data-index="${i}">Modifica</button>
                    <button class="btn-secondary delete-address" data-index="${i}">Elimina</button>
                </div>
            `;
            indirizziLista.appendChild(wrapper);
        });

        // Eventi pulsanti
        indirizziLista.querySelectorAll(".edit-address").forEach(btn => {
            btn.addEventListener("click", () => apriModalIndirizzo('edit', parseInt(btn.dataset.index)));
        });
        indirizziLista.querySelectorAll(".delete-address").forEach(btn => {
            btn.addEventListener("click", () => eliminaIndirizzo(parseInt(btn.dataset.index)));
        });

    } catch (err) {
        console.error("Errore caricamento indirizzi:", err);
        alert("Errore caricamento indirizzi. Riprova.");
    }
}

/* --------------------------------
   APRI MODAL AGGIUNTA/MODIFICA
-------------------------------- */
function apriModalIndirizzo(mode='add', index=null) {
    editingIndex = (mode === 'edit' && index !== null) ? index : null;

    if (editingIndex !== null) {
        modalTitle.textContent = "Modifica indirizzo";
        const ind = indirizzi[editingIndex];
        viaInput.value = ind.via || "";
        civicoInput.value = ind.civico || "";
        capInput.value = ind.cap || "";
        cittaInput.value = ind.citta || "";
        paeseInput.value = ind.paese || "";
        nomeDestInput.value = ind.nome_destinatario || "";
    } else {
        modalTitle.textContent = "Aggiungi indirizzo";
        viaInput.value = "";
        civicoInput.value = "";
        capInput.value = "";
        cittaInput.value = "";
        paeseInput.value = "";
        nomeDestInput.value = "";
    }

    addressModal.classList.remove("hidden");
}

/* --------------------------------
   CHIUDI MODAL
-------------------------------- */
closeModalBtn.addEventListener("click", (e) => {
    e.preventDefault();
    addressModal.classList.add("hidden");
    editingIndex = null;
});

/* --------------------------------
   SALVA INDIRIZZO (aggiungi/modifica)
-------------------------------- */
saveAddressBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const payload = {
        via: viaInput.value.trim(),
        civico: civicoInput.value.trim(),
        cap: capInput.value.trim(),
        citta: cittaInput.value.trim(),
        paese: paeseInput.value.trim(),
        nome_destinatario: nomeDestInput.value.trim()
    };

    if (!payload.via || !payload.civico || !payload.cap || !payload.citta || !payload.paese || !payload.nome_destinatario) {
        alert("Compila tutti i campi.");
        return;
    }

    try {
        const url = editingIndex !== null ? '/modifica-indirizzo' : '/aggiungi-indirizzo';
        if (editingIndex !== null) payload.id = indirizzi[editingIndex].id;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        addressModal.classList.add("hidden");
        editingIndex = null;
        caricaIndirizziProfilo();

    } catch (err) {
        console.error("Errore salvataggio indirizzo:", err);
        alert("Errore durante il salvataggio. Riprova.");
    }
});

/* --------------------------------
   ELIMINA INDIRIZZO
-------------------------------- */
async function eliminaIndirizzo(index) {
    if (!confirm("Vuoi davvero eliminare questo indirizzo?")) return;

    try {
        const res = await fetch('/elimina-indirizzo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: indirizzi[index].id })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        caricaIndirizziProfilo();
    } catch (err) {
        console.error("Errore eliminazione indirizzo:", err);
        alert("Errore durante l'eliminazione. Riprova.");
    }
}

/* --------------------------------
   BOTTONE AGGIUNGI
-------------------------------- */
addAddressBtn.addEventListener("click", () => apriModalIndirizzo('add', null));

/* ----------------------------------------------------
   CARICAMENTO INIZIALE
---------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    caricaIndirizziProfilo();
    caricaOrdiniUtente();
    loadWishlistProfile();
});


/* ======================================================
   WISHLIST - CARICAMENTO NEL PROFILO UTENTE
====================================================== */

// Leggi wishlist
function getWishlist() {
    return JSON.parse(localStorage.getItem("wishlist")) || [];
}

// Scrivi wishlist
function saveWishlist(arr) {
    localStorage.setItem("wishlist", JSON.stringify(arr));
}

// Rimuovi elemento dalla wishlist
async function removeFromWishlist(id) {

    // Rimuove dal database
    await fetch('/wishlist/' + id, {
        method: 'DELETE',
        credentials: 'include'
    });

    // Rimuove dal localStorage
    let w = getWishlist();
    w = w.filter(p => p.id !== id);
    saveWishlist(w);

    loadWishlistProfile();
}

// Aggiungi al carrello da wishlist
function addToCartFromWishlist(prodotto) {
    let carrello = JSON.parse(localStorage.getItem("carrello")) || [];

    const index = carrello.findIndex(p => p.id === prodotto.id);
    if (index !== -1) {
        carrello[index].quantita += 1;
    } else {
        carrello.push({ ...prodotto, quantita: 1 });
    }

    localStorage.setItem("carrello", JSON.stringify(carrello));
    alert("Aggiunto al carrello!");
}

// CARICA VISUALIZZAZIONE WISHLIST NEL PROFILO
async function loadWishlistProfile() {

    const container = document.querySelector(".wishlist-container");
    container.innerHTML = "";

    try {

        const res = await fetch('/wishlist');
        credentials: 'include'
        const data = await res.json();

        if (!data.logged) {
            container.innerHTML = "<p>Devi essere loggato.</p>";
            return;
        }

        const wishlist = data.wishlist || [];

        if (wishlist.length === 0) {
            container.innerHTML = "<p>Nessun prodotto in wishlist.</p>";
            return;
        }

        wishlist.forEach(p => {

            const item = document.createElement("div");
            item.className = "wishlist-item";

            item.innerHTML = `
                <img src="${p.img || '../imagini/default.png'}" alt="${p.nome}">
                <div>
                    <h3>${p.nome}</h3>
                    <p>€${p.prezzo}</p>
                </div>
                <div class="actions">
                    <button class="btn-primary add-cart">Aggiungi al carrello</button>
                    <button class="btn-secondary remove-wish">Rimuovi</button>
                </div>
            `;

            container.appendChild(item);

            item.querySelector(".remove-wish").addEventListener("click", () => {
                removeFromWishlist(p.prodotto_id);
            });

        });

    } catch (err) {
        console.error("Errore caricamento wishlist:", err);
        container.innerHTML = "<p>Errore caricamento wishlist</p>";
    }
}

async function toggleWishlist(id) {

    await fetch('/wishlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            prodotto_id: id
        })
    });

}

/* ---- AVVIO AUTOMATICO QUANDO APRI PROFILO ---- */
document.addEventListener("DOMContentLoaded", () => {
    loadWishlistProfile();
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/me');
        const data = await res.json();

        if (!data.logged) return;

        const user = data.user;

        // 🔹 Popola i campi delle informazioni personali
        const fields = {
            nome: user.nome || '',
            cognome: user.cognome || '',
            email: user.email || '',
            telefono: user.telefono || '',
            indirizzo: user.indirizzo || '',
            paese: user.paese || '',
            nome_destinatario: user.nome_destinatario || ''
        };

        for (const id in fields) {
            const el = document.getElementById(id);
            if (el) el.value = fields[id];
        }

        // 🔹 Aggiorna sidebar
        if (sidebarName && sidebarEmail) {
            sidebarName.textContent = `${user.nome || ''} ${user.cognome || ''}`;
            sidebarEmail.textContent = user.email || '';
        }

        // 🔹 Popola indirizzi se presenti
        if (user.indirizzi && user.indirizzi.length > 0) {
            const indirizziContainer = document.getElementById('indirizzi-container');
            if (indirizziContainer) {
                indirizziContainer.innerHTML = '';
                user.indirizzi.forEach(ind => {
                    const div = document.createElement('div');
                    div.classList.add('indirizzo-item');
                    div.textContent = `${ind.via}, ${ind.citta}, ${ind.cap}, ${ind.paese} - ${ind.nome_destinatario}`;
                    indirizziContainer.appendChild(div);
                });
            }
        }

    } catch (err) {
        console.error('Errore nel recupero dati utente', err);
    }
});
