document.addEventListener('DOMContentLoaded', () => {

    async function caricaDettaglio() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) return;

        try {
            const res = await fetch(`/prodotto/${id}`);
            if (!res.ok) throw new Error('Errore ' + res.status);
            const p = await res.json();

            const imgEl = document.getElementById('productImage');
            imgEl.src = p.img || '../immagini/default.png';
            imgEl.alt = p.nome;

            const nameEl = document.getElementById('productName');
            nameEl.textContent = p.nome;
            nameEl.dataset.id = p.id;

            document.getElementById('productPrice').textContent = `€${p.prezzo}`;
            document.getElementById('productShortDesc').textContent = p.descrizione;
            document.getElementById('productLongDesc').textContent = p.descrizione;

        } catch(e) {
            console.error('Errore caricamento dettaglio prodotto:', e);
        }
    }

    caricaDettaglio();

    const btnAdd = document.getElementById('btnAdd');
    btnAdd.addEventListener('click', (e) => {
        e.preventDefault();

        const prodotto = {
            id: document.getElementById('productName').dataset.id,
            nome: document.getElementById('productName').textContent,
            prezzo: parseFloat(document.getElementById('productPrice').textContent.replace('€','')),
            quantita: parseInt(document.querySelector('.product-info input[type="number"]').value) || 1,
            img: document.getElementById('productImage').src
        };

        let carrello = JSON.parse(localStorage.getItem('carrello')) || [];
        const esistente = carrello.find(p => p.id == prodotto.id);
        if (esistente) {
            esistente.quantita += prodotto.quantita;
        } else {
            carrello.push(prodotto);
        }

        localStorage.setItem('carrello', JSON.stringify(carrello));
        updateCartCount();

        // Facoltativo: vai al carrello dopo l'aggiunta
        // window.location.href = 'carrello.html';
    });
   


    function updateCartCount() {
    let carrello = JSON.parse(localStorage.getItem("carrello"));

    if (!Array.isArray(carrello)) {
        carrello = [];
        localStorage.setItem("carrello", JSON.stringify(carrello));
    }

    const countElement = document.getElementById("cart-count");
    if (countElement) {
        const totale = carrello.reduce((acc, p) => acc + p.quantita, 0);
        countElement.textContent = totale;
    }
}

updateCartCount();
});