/* ======================================================
   GESTIONE UNIFICATA INDIRIZZI (LOGGATO / NO-LOGIN)
====================================================== */

// Recupera indirizzi
async function caricaIndirizzi() {
    let indirizzi = [];
    try {
        // 1️⃣ Controllo login
        const res = await fetch('/me');
        const data = await res.json();

        if (data.logged) {
            indirizzi = data.user.indirizzi || [];
        } else {
            indirizzi = JSON.parse(localStorage.getItem('indirizzi')) || [];
        }

        // Popola la pagina (profilo + check-out)
        const indirizziLista = document.getElementById("indirizziLista");
        if (!indirizziLista) return;
        indirizziLista.innerHTML = "";

        if (indirizzi.length === 0) {
            indirizziLista.innerHTML = "<p>Nessun indirizzo salvato</p>";
            return;
        }

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
            btn.addEventListener("click", () => eliminaIndirizzoUnificato(parseInt(btn.dataset.index), data.logged));
        });

    } catch (err) {
        console.error("Errore caricamento indirizzi:", err);
    }
}

// Salva o modifica indirizzo
async function salvaIndirizzoUnificato(payload, editingIndex = null, loggedIn = false) {
    if (loggedIn) {
        try {
            const url = editingIndex !== null ? '/modifica-indirizzo' : '/aggiungi-indirizzo';
            if (editingIndex !== null) payload.id = editingIndex;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

        } catch (err) {
            console.error("Errore salvataggio indirizzo:", err);
            alert("Errore durante il salvataggio. Riprova.");
            return;
        }
    } else {
        // localStorage
        let indirizzi = JSON.parse(localStorage.getItem('indirizzi')) || [];
        if (editingIndex !== null) {
            indirizzi[editingIndex] = payload;
        } else {
            indirizzi.push(payload);
        }
        localStorage.setItem('indirizzi', JSON.stringify(indirizzi));
    }

    // Aggiorna la lista
    caricaIndirizzi();
}

// Elimina indirizzo
async function eliminaIndirizzoUnificato(index, loggedIn = false) {
    if (!confirm("Vuoi davvero eliminare questo indirizzo?")) return;

    if (loggedIn) {
        try {
            const res = await fetch('/elimina-indirizzo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: index })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
        } catch (err) {
            console.error("Errore eliminazione indirizzo:", err);
            alert("Errore durante l'eliminazione. Riprova.");
            return;
        }
    } else {
        let indirizzi = JSON.parse(localStorage.getItem('indirizzi')) || [];
        indirizzi.splice(index, 1);
        localStorage.setItem('indirizzi', JSON.stringify(indirizzi));
    }

    caricaIndirizzi();
}
