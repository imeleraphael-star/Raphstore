# Progetto-Tecnologie-Internet
# 🛒 RaphStore – Progetto Tecnologie Internet

## 📌 Descrizione del Progetto

RaphStore è un’applicazione web e-commerce sviluppata per il corso di Tecnologie Internet (A.A. 2025/2026).

Il software implementa una piattaforma completa per la vendita online, composta da una parte utente e da una dashboard amministratore.

L’utente può:
- Registrarsi e autenticarsi
- Visualizzare i prodotti
- Aggiungere prodotti al carrello
- Gestire indirizzi di spedizione
- Effettuare ordini
- Visualizzare lo storico degli ordini

L’amministratore può:
- Gestire i prodotti
- Visualizzare gli utenti
- Consultare statistiche generali
- Visualizzare gli ultimi ordini

---

## ⚙️ Tecnologie Utilizzate

### Frontend
- HTML5  
- CSS3  
- JavaScript  

### Backend
- Node.js  
- Express.js  

### Database
- MySQL  

---

## 🏗️ Architettura del Software

Il progetto segue un’architettura client-server:

- Il **frontend** gestisce l’interfaccia grafica e invia richieste HTTP.
- Il **backend** implementa la logica applicativa e le API REST.
- Il **database MySQL** gestisce la persistenza dei dati (utenti, prodotti, ordini, indirizzi).

Il file principale del server è:

server.js

Il progetto è organizzato in cartelle per separare:
- File statici (CSS, JS, immagini)
- Pagine HTML
- Rotte backend
- Logica applicativa

---

## 🚀 Installazione

1. Clonare il repository:

git clone https://github.com/imeleraphael-star/RaphStore.git

2. Entrare nella cartella del progetto:

cd RaphStore

3. Installare le dipendenze:

npm install

4. Assicurarsi che MySQL sia attivo.

5. Creare il database MySQL e configurarlo secondo la struttura utilizzata nel progetto.

---

## ▶️ Avvio del Progetto

Per avviare il server:

node server.js

Il server sarà disponibile all’indirizzo:

http://localhost:3000

---

## 👤 Autore

Progetto sviluppato da TSOMBOU IMELE ANGE RAPHAEL e TAZOVAP WAFFO CHRISTIAN SADEL  
Corso di Tecnologie Internet  
Anno Accademico 2025/2026