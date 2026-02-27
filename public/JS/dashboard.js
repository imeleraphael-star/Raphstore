let myChartVendite, myChartCategorie;

// Funzione per creare i grafici
function creaGrafici(datiVendite, datiCategorie) {
    const ctx1 = document.getElementById('chartVendite');
    myChartVendite = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: datiVendite.mesi,
            datasets: [{
                label: "Vendite Mensili (€)",
                data: datiVendite.valori,
                borderWidth: 2,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });

    const ctx2 = document.getElementById('chartCategorie');
    myChartCategorie = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: datiCategorie.categorie,
            datasets: [{
                label: "Vendite per Categoria (€)",
                data: datiCategorie.vendite,
                backgroundColor: ['#FF6384','#36A2EB','#FFCE56'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Aggiornamento dati grafici da server
async function aggiornaGrafici() {
    try {
        const res = await fetch('/api/statistiche');
        const data = await res.json();

        if(myChartVendite) {
            myChartVendite.data.labels = data.mesi;
            myChartVendite.data.datasets[0].data = data.valori;
            myChartVendite.update();
        }

        if(myChartCategorie) {
            myChartCategorie.data.labels = data.categorie;
            myChartCategorie.data.datasets[0].data = data.venditeCategorie;
            myChartCategorie.update();
        }

    } catch(err) {
        console.error("Errore aggiornamento grafici:", err);
    }
}

// Aggiornamento card statistiche
async function aggiornaCardStatistiche() {
    try {
        const res = await fetch('/admin/statistiche');
        const stats = await res.json();

        document.querySelector('.stats-cards .card:nth-child(1) p').innerText = stats.utenti;
        document.querySelector('.stats-cards .card:nth-child(2) p').innerText = stats.ordini;
        document.querySelector('.stats-cards .card:nth-child(3) p').innerText = stats.prodotti;
        document.querySelector('.stats-cards .card:nth-child(4) p').innerText = `€${stats.recavi}`;
    } catch(err) {
        console.error("Errore aggiornamento card:", err);
    }
}

// Funzione iniziale da chiamare quando la sezione dashboard o report viene mostrata
async function inizializzaDashboard() {
    // Dati iniziali di esempio
    const datiVenditeIniziali = { mesi: ["Gen","Feb","Mar","Apr","Mag","Giu"], valori: [1200,1500,1100,1800,2000,1700] };
    const datiCategorieIniziali = { categorie: ["Abbigliamento","Elettronica","Accessori"], vendite: [3500,4200,1800] };

    // Crea grafici
    creaGrafici(datiVenditeIniziali, datiCategorieIniziali);

    // Aggiorna card e grafici dal server
    await aggiornaCardStatistiche();
    await aggiornaGrafici();
}

// Richiama all'apertura della sezione dashboard
document.addEventListener("DOMContentLoaded", () => {
    const dashboardLink = document.querySelector('.menu-link[data-target="dashboard"]');
    dashboardLink.addEventListener('click', () => {
        inizializzaDashboard();
    });

    // Inizializzazione automatica se è la sezione attiva all'apertura
    if(document.getElementById('dashboard').classList.contains('active')) {
        inizializzaDashboard();
    }
});

// Grafico vendite per categoria
const ctx2 = document.getElementById('chartCategorie');
new Chart(ctx2, {
    type: 'bar',
    data: {
        labels: datiCategorie.categorie,
        datasets: [{
            label: "Vendite per Categoria (€)",
            data: datiCategorie.vendite,
            borderWidth: 2
        }]
    }
});

fetch("https://tuo_sito.it/api/statistiche")
  .then(res => res.json())
  .then(data => {
      // qui data.mesi e data.valori arrivano dal server
      myChartVendite.data.labels = data.mesi;
      myChartVendite.data.datasets[0].data = data.valori;
      myChartVendite.update();
  });


document.getElementById("logoutBtn").addEventListener("click", function(e) {
    e.preventDefault();  // blocca il click sul link

    let conferma = confirm("Sei sicuro di voler effettuare il logout?");
    
    if (conferma) {
        // cancella eventuali dati
        localStorage.clear();
        sessionStorage.clear();

        // reindirizza
        window.location.href = "Home.html";
    } 
    // Se NON conferma, non succede nulla
});


async function caricaUtenti() {
  try {
    const response = await fetch('/admin/utenti');
    
    if (!response.ok) {
      throw new Error("Non autorizzato o errore server");
    }

    const utenti = await response.json();
    const tbody = document.getElementById("utentiTableBody");
    tbody.innerHTML = "";

    utenti.forEach(u => {

      const metodoLogin = u.provider === 'google' ? 'Google' : 'Email';

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.nome} ${u.cognome || ''}</td>
        <td>${u.email}</td>
        <td>${metodoLogin}</td>
        <td>${u.telefono || '-'}</td>
        <td>
          <button class="btn-edit" onclick="modificaUtente(${u.id})">Modifica</button>
          <button class="btn-delete" onclick="eliminaUtente(${u.id})">Elimina</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Errore caricamento utenti:", error);
  }
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'utenti') {
    caricaUtenti();
  }
}


async function eliminaUtente(id) {

  const conferma = confirm("Sei sicuro di voler eliminare questo utente?");
  if (!conferma) return;

  try {
    const response = await fetch(`/admin/utenti/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    alert("Utente eliminato!");
    caricaUtenti(); // ricarica tabella

  } catch (error) {
    console.error("Errore:", error);
  }
}

document.getElementById("openModalBtn").addEventListener("click", async () => {

  const nome = prompt("Nome:");
  const cognome = prompt("Cognome:");
  const email = prompt("Email:");
  const password = prompt("Password:");
  const telefono = prompt("Telefono:");

  if (!nome || !email || !password) return;

  try {
    const response = await fetch('/admin/utenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cognome, email, password, telefono })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    alert("Utente aggiunto!");
    caricaUtenti();

  } catch (error) {
    console.error(error);
  }
});


async function modificaUtente(id) {

  const nome = prompt("Nuovo nome:");
  const cognome = prompt("Nuovo cognome:");
  const email = prompt("Nuova email:");
  const telefono = prompt("Nuovo telefono:");

  try {
    const response = await fetch(`/admin/utenti/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cognome, email, telefono })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    alert("Utente aggiornato!");
    caricaUtenti();

  } catch (error) {
    console.error(error);
  }
}

async function caricaProdotti() {
  try {
    const response = await fetch('/admin/prodotti');
    const prodotti = await response.json();

    const tbody = document.getElementById("prodottiTableBody");
    tbody.innerHTML = "";

    prodotti.forEach(p => {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.nome}</td>
        <td>${p.categoria || '-'}</td>
        <td>${p.prezzo} €</td>
        <td>${p.stock || 0}</td>
        <td>
          <button class="btn-modifica" onclick="modificaProdotto(${p.id})">Modifica</button>
          <button class="btn-elimina" onclick="eliminaProdotto(${p.id})">Elimina</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Errore caricamento prodotti:", error);
  }
}


function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'utenti') caricaUtenti();
  if (id === 'prodotti') caricaProdotti();
}

document.querySelector("#prodotti .add-btn")
.addEventListener("click", async () => {

  const nome = prompt("Nome prodotto:");
  const categoria = prompt("Categoria:");
  const prezzo = prompt("Prezzo:");
  const stock = prompt("Stock:");
  const descrizione = prompt("Descrizione:");
  const img = prompt("URL immagine:");

  if (!nome || !prezzo) return;

  await fetch('/admin/prodotti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, categoria, prezzo, stock, descrizione, img })
  });

  caricaProdotti();
});


async function modificaProdotto(id) {

  const nome = prompt("Nuovo nome:");
  const categoria = prompt("Nuova categoria:");
  const prezzo = prompt("Nuovo prezzo:");
  const stock = prompt("Nuovo stock:");
  const descrizione = prompt("Nuova descrizione:");
  const img = prompt("Nuova immagine:");

  await fetch(`/admin/prodotti/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, categoria, prezzo, stock, descrizione, img })
  });

  caricaProdotti();
}

async function eliminaProdotto(id) {

  if (!confirm("Eliminare questo prodotto?")) return;

  await fetch(`/admin/prodotti/${id}`, {
    method: 'DELETE'
  });

  caricaProdotti();
}

async function caricaOrdini() {
  try {
    const response = await fetch('/admin/ordini');
    const ordini = await response.json();

    const tbody = document.querySelector('#ordini tbody');
    tbody.innerHTML = '';

    ordini.forEach(o => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${o.nome_cliente}</td>
        <td>${o.data_ordinazione.split('T')[0]}</td>
        <td>€${o.prezzo_totale}</td>
        <td>
          <select onchange="aggiornaStato(${o.id}, this.value)">
            <option ${o.stato_consegna === 'In attesa' ? 'selected' : ''}>In attesa</option>
            <option ${o.stato_consegna === 'Spedito' ? 'selected' : ''}>Spedito</option>
            <option ${o.stato_consegna === 'Consegnato' ? 'selected' : ''}>Consegnato</option>
            <option ${o.stato_consegna === 'Annullato' ? 'selected' : ''}>Annullato</option>
          </select>
        </td>
        <td>
          <button onclick="eliminaOrdine(${o.id})">🗑️</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Errore caricamento ordini:', err);
  }
}

async function aggiornaStato(id, stato) {
  try {
    await fetch(`/admin/ordini/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato_consegna: stato })
    });

    alert('Stato ordine aggiornato!');
    caricaOrdini();
  } catch (err) {
    console.error(err);
  }
}

async function eliminaOrdine(id) {
  if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;

  try {
    await fetch(`/admin/ordini/${id}`, { method: 'DELETE' });
    alert('Ordine eliminato!');
    caricaOrdini();
  } catch (err) {
    console.error(err);
  }
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'utenti') caricaUtenti();
  if (id === 'prodotti') caricaProdotti();
  if (id === 'ordini') caricaOrdini();
}

async function aggiornaCardStatistiche() {
    try {
        const res = await fetch('/admin/statistiche');
        const stats = await res.json();

        document.getElementById('cardTotaleUtenti').innerText = stats.utenti;
        document.getElementById('cardTotaleOrdini').innerText = stats.ordini;
        document.getElementById('cardTotaleProdotti').innerText = stats.prodotti;
        document.getElementById('cardRecaviTotale').innerText = `€${stats.recavi.toFixed(2)}`;
    } catch(err) {
        console.error("Errore aggiornamento card:", err);
    }
}

async function aggiornaUltimiOrdini() {
  try {
    const res = await fetch('/admin/ordini');
    const allOrdini = await res.json();

    const container = document.querySelector('#cardUltimiOrdini .ordini-list');
    container.innerHTML = '';

    if (allOrdini.length === 0) {
      container.innerHTML = '<p>Nessun ordine ancora effettuato</p>';
      return;
    }

    const ultimiOrdini = allOrdini.slice(-5).reverse();

    ultimiOrdini.forEach(o => {
      const div = document.createElement('div');
      div.className = 'ordine-item';
      div.innerHTML = `
        <strong>Ordine #${o.id}</strong> - ${new Date(o.data_ordinazione).toLocaleDateString()}<br>
        Cliente: ${o.nome_cliente || o.nome} <br>
        Prodotti: ${o.prodotti ? o.prodotti.map(p => `${p.nome} (${p.quantita})`).join(', ') : '-'}<br>
        Totale: €${o.prezzo_totale} - Stato: ${o.stato_consegna || 'In attesa'}
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error('Errore caricamento ultimi ordini:', err);
  }
}

// Chiama la funzione solo quando la sezione dashboard viene mostrata
function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'dashboard') aggiornaUltimiOrdini();
  if (id === 'utenti') caricaUtenti();
  if (id === 'prodotti') caricaProdotti();
  if (id === 'ordini') caricaOrdini();
}

document.addEventListener("DOMContentLoaded", () => {
  aggiornaUltimiOrdini();
});