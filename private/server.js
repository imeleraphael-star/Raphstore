// ==========================
// server.js
// ==========================

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const PORT = 3000;

require('dotenv').config({ path: __dirname + '/.env' });
console.log('dotenv caricato da:', __dirname + '/.env');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);

// 1️⃣ Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const session = require('express-session');

app.use(session({
  secret: 'raphstore_super_secret', // cambialo con una stringa complessa
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true solo con HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2 // 2 ore
  }
}));


const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
},
(accessToken, refreshToken, profile, done) => {

  const email = profile.emails[0].value;
  const googleId = profile.id;
  const nome = profile.name.givenName;

  // Cerca utente
  db.query(
    'SELECT * FROM clienti WHERE email = ?',
    [email],
    (err, results) => {
      if (err) return done(err);

      // 🔹 Utente già esistente
      if (results.length > 0) {
        const user = results[0];
        return done(null, {
          id: user.id,
          nome: user.nome,
          email: user.email
        });
      }

      // 🔹 Nuovo utente Google
      const sql = `
        INSERT INTO clienti (nome, email, google_id, provider)
        VALUES (?, ?, ?, 'google')
      `;

      db.query(sql, [nome, email, googleId], (err, result) => {
        if (err) return done(err);

        done(null, {
          id: result.insertId,
          nome,
          email
        });
      });
    }
  );
}));



// ==========================
// 2️⃣ Connessione al database
// ==========================
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'raphstore'
});

db.connect(err => {
  if (err) {
    console.error('Errore connessione al database:', err);
    return;
  }
  console.log('Connesso al database MySQL raphstore!');
});


// ==========================
// Middleware: richiede login
// ==========================
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Non loggato' });
  }
  next();
}


// ==========================
// 3️⃣ Rotta di test
// ==========================
app.get('/', (req, res) => {
  res.send('Server attivo e collegato al database!');
});

/// ==========================
// 4️⃣ Rotta API per prodotti
// ==========================
app.get('/prodotti', (req, res) => {

  let sql = 'SELECT * FROM prodotti';
  const params = [];

  // ✅ FILTRO OFFERTE
  if (req.query.offerte == '1') {
    sql += ' WHERE sconto > 0';
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Errore SQL:', err);
      return res.status(500).json({ error: 'Errore DB' });
    }

    res.json(results);
  });
});




// ==========================
// 5️⃣ Rotta registrazione COMPLETA
// ==========================
app.post('/register', async (req, res) => {
  const { nome, cognome, email, password, telefono, indirizzo } = req.body;

  if (!nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Dati obbligatori mancanti' });
  }

  try {
    // Controllo email già esistente
    const checkSql = 'SELECT id FROM clienti WHERE email = ?';
    db.query(checkSql, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Errore DB' });
      if (results.length > 0) {
        return res.status(400).json({ error: 'Email già registrata' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Inserimento utente
      const sql = `
        INSERT INTO clienti (nome, cognome, email, password, telefono, indirizzo)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [nome, cognome, email, hashedPassword, telefono, indirizzo],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore nella registrazione' });
          }

          res.json({ message: 'Registrazione completata con successo' });
        }
      );
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});


// ==========================
// 6️⃣ Rotta login
// ==========================
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email o password mancanti' });
  }

  const sql = 'SELECT * FROM clienti WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Errore server' });
    if (results.length === 0) return res.status(400).json({ error: 'Email non trovata' });

    const user = results[0];
    if (!user.password) {
  return res.status(400).json({
    error: 'Questo account usa Google Login'
  });
}

const match = await bcrypt.compare(password.trim(), user.password);
if (!match) {
  return res.status(400).json({ error: 'Password errata' });
}


    // 🔐 Utente autenticato → memorizzo nella sessione
    const isDashboardUser = user.email.endsWith('@raphstore.gmail.com');

req.session.user = {
  id: user.id,
  nome: user.nome,
  email: user.email,
  isDashboardUser
};


    res.json({
      message: 'Login effettuato con successo!',
      user: req.session.user
    });
  });
});

/// ==========================
//  Rotta me(per sapere se l'utente è ancora loggato o no)
// ==========================

app.get('/me', (req, res) => {
    if (!req.session || !req.session.user)
    return res.json({ logged: false });


    const userId = req.session.user.id;

    // Recupera info cliente
    db.query('SELECT * FROM clienti WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Errore DB' });
        const user = results[0];

        // Recupera carte, indirizzi, carrello, ordini con dettagli
        db.query('SELECT * FROM carte WHERE cliente_id = ?', [userId], (err, carte) => {
            db.query('SELECT * FROM indirizzi WHERE cliente_id = ?', [userId], (err, indirizzi) => {
                db.query('SELECT * FROM carrello WHERE cliente_id = ?', [userId], (err, carrello) => {
                    db.query(
                        `SELECT o.*, d.id AS dettaglio_id, d.prodotto_id, d.quantita, d.prezzo_unitario, d.prezzo_totale 
                         FROM ordini o
                         LEFT JOIN dettagli_ordini d ON o.id = d.ordine_id
                         WHERE o.cliente_id = ?`, 
                        [userId], 
                        (err, ordini) => {

                        res.json({
                            logged: true,
                            user: {
                                id: user.id,
                                nome: user.nome,
                                cognome: user.cognome,
                                email: user.email,
                                telefono: user.telefono,
                                indirizzo: user.indirizzo,
                                isDashboardUser: req.session.user.isDashboardUser,
                                carte,
                                indirizzi,
                                carrello,
                                ordini
                            }
                        });
                    });
                });
            });
        });
    });
});

app.post('/me/update', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non autenticato' });

    const userId = req.session.user.id;
    const { nome, cognome, email, telefono, password } = req.body;

    try {
        let sql = 'UPDATE clienti SET nome = ?, cognome = ?, email = ?, telefono = ?';
        const params = [nome, cognome, email, telefono];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql += ', password = ?';
            params.push(hashedPassword);
        }

        sql += ' WHERE id = ?';
        params.push(userId);

        db.query(sql, params, (err) => {
            if (err) return res.status(500).json({ error: 'Errore aggiornamento dati' });

            // Aggiorna sessione
            req.session.user.nome = nome;
            req.session.user.email = email;

            res.json({ message: 'Dati aggiornati con successo' });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Errore server' });
    }
});


// ==========================
//  Rotta aggiornamento password
// ==========================
app.post('/me/update-password', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non autenticato' });

    const userId = req.session.user.id;
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
        return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        const sql = 'UPDATE clienti SET password = ? WHERE id = ?';
        db.query(sql, [hashedPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Errore aggiornamento password' });

            res.json({ message: 'Password aggiornata con successo!' });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Errore server' });
    }
});


// ==========================
// API Dashboard - Lista utenti
// ==========================
app.get('/admin/utenti', (req, res) => {

  // 🔐 Controllo login
  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const sql = `
    SELECT id, nome, cognome, email, telefono, provider, google_id
    FROM clienti
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Errore caricamento utenti:', err);
      return res.status(500).json({ error: 'Errore DB' });
    }

    res.json(results);
  });
});

// ==========================
// ADMIN - Elimina utente
// ==========================
app.delete('/admin/utenti/:id', (req, res) => {

  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const userId = req.params.id;

  // Evita che admin elimini se stesso
  if (userId == req.session.user.id) {
    return res.status(400).json({ error: 'Non puoi eliminare te stesso' });
  }

  const sql = 'DELETE FROM clienti WHERE id = ?';

  db.query(sql, [userId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Errore eliminazione' });
    }

    res.json({ message: 'Utente eliminato con successo' });
  });
});


// ==========================
// ADMIN - Aggiungi utente
// ==========================
app.post('/admin/utenti', async (req, res) => {

  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const { nome, cognome, email, password, telefono } = req.body;

  if (!nome || !email || !password) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO clienti (nome, cognome, email, password, telefono)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [nome, cognome, email, hashedPassword, telefono], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Errore inserimento' });
      }

      res.json({ message: 'Utente aggiunto con successo' });
    });

  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ==========================
// ADMIN - Modifica utente
// ==========================
app.put('/admin/utenti/:id', async (req, res) => {

  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const id = req.params.id;
  const { nome, cognome, email, telefono } = req.body;

  const sql = `
    UPDATE clienti
    SET nome = ?, cognome = ?, email = ?, telefono = ?
    WHERE id = ?
  `;

  db.query(sql, [nome, cognome, email, telefono, id], (err) => {
    if (err) return res.status(500).json({ error: 'Errore modifica' });

    res.json({ message: 'Utente modificato con successo' });
  });
});

// ==========================
// ADMIN - Lista prodotti
// ==========================
app.get('/admin/prodotti', (req, res) => {

  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const sql = 'SELECT * FROM prodotti ORDER BY id DESC';

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Errore DB' });
    }

    res.json(results);
  });
});

// ==========================
// ADMIN - Aggiungi prodotto
// ==========================
app.post('/admin/prodotti', (req, res) => {

  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const { nome, categoria, prezzo, stock, descrizione, img } = req.body;

  if (!nome || !prezzo) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti' });
  }

  const sql = `
    INSERT INTO prodotti (nome, categoria, prezzo, stock, descrizione, img)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [nome, categoria, prezzo, stock, descrizione, img], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Errore inserimento' });
    }

    res.json({ message: 'Prodotto aggiunto con successo' });
  });
});


// ==========================
// ADMIN - Modifica prodotto
// ==========================
app.put('/admin/prodotti/:id', (req, res) => {

  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const id = req.params.id;
  const { nome, categoria, prezzo, stock, descrizione, img } = req.body;

  const sql = `
    UPDATE prodotti
    SET nome = ?, categoria = ?, prezzo = ?, stock = ?, descrizione = ?, img = ?
    WHERE id = ?
  `;

  db.query(sql, [nome, categoria, prezzo, stock, descrizione, img, id], (err) => {
    if (err) return res.status(500).json({ error: 'Errore modifica' });

    res.json({ message: 'Prodotto aggiornato con successo' });
  });
});


// ==========================
// ADMIN - Elimina prodotto
// ==========================
app.delete('/admin/prodotti/:id', (req, res) => {

  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const id = req.params.id;

  const sql = 'DELETE FROM prodotti WHERE id = ?';

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: 'Errore eliminazione' });

    res.json({ message: 'Prodotto eliminato con successo' });
  });
});

// ADMIN - Lista ordini
app.get('/admin/ordini', (req, res) => {
  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const sql = `
    SELECT 
      o.id,
      o.cliente_id,
      o.nome_cliente,
      o.data_ordinazione,
      o.stato_consegna,
      o.prezzo_totale,
      o.metodo_pagamento_id,
      o.indirizzo_id
    FROM ordini o
    ORDER BY o.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Errore DB ordini' });
    res.json(results);
  });
});

// ADMIN - Aggiorna stato ordine
app.put('/admin/ordini/:id', (req, res) => {
  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const id = req.params.id;
  const { stato_consegna } = req.body;

  const sql = 'UPDATE ordini SET stato_consegna = ? WHERE id = ?';
  db.query(sql, [stato_consegna, id], (err) => {
    if (err) return res.status(500).json({ error: 'Errore aggiornamento ordine' });
    res.json({ message: 'Stato ordine aggiornato con successo' });
  });
});


// ADMIN - Elimina ordine
app.delete('/admin/ordini/:id', (req, res) => {
  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const id = req.params.id;

  const sql = 'DELETE FROM ordini WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: 'Errore eliminazione ordine' });
    res.json({ message: 'Ordine eliminato con successo' });
  });
});



// ==========================
//  Rotta CARRELLO (solo utenti loggati)
// ==========================
app.get('/cart', requireLogin, (req, res) => {
  const cliente_id = req.session.user.id;

  const sql = `
    SELECT 
      c.prodotto_id,
      c.quantita,
      p.prezzo,
      (p.prezzo * c.quantita) AS prezzo_totale,
      p.nome,
      p.img
    FROM carrello c
    JOIN prodotti p ON c.prodotto_id = p.id
    WHERE c.cliente_id = ?
  `;

  db.query(sql, [cliente_id], (err, rows) => {
    if (err) {
      console.error('Errore carrello:', err);
      return res.status(500).json({ error: 'Errore DB carrello' });
    }

    res.json(rows);
  });
});





app.post('/aggiungi-carta', (req, res) => {
    const { numero, scadenza, cvv, intestatario, tipo_carta } = req.body;
    const cliente_id = req.session.user.id;

    const sql = 'INSERT INTO carte (cliente_id, numero, scadenza, cvv, intestatario, tipo_carta) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [cliente_id, numero, scadenza, cvv, intestatario, tipo_carta], (err, result) => {
        if (err) return res.status(500).json({ error: 'Errore DB' });
        res.json({ message: 'Carta aggiunta con successo' });
    });
});


// ==========================
// Modifica carta
// ==========================
app.post('/modifica-carta', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non autenticato' });

    const { id, numero, scadenza, cvv, intestatario, tipo_carta } = req.body;
    const cliente_id = req.session.user.id;

    const sql = `
        UPDATE carte 
        SET numero = ?, scadenza = ?, cvv = ?, intestatario = ?, tipo_carta = ?
        WHERE id = ? AND cliente_id = ?
    `;
    db.query(sql, [numero, scadenza, cvv, intestatario, tipo_carta, id, cliente_id], (err) => {
        if (err) return res.status(500).json({ error: 'Errore DB modifica carta' });
        res.json({ message: 'Carta modificata con successo' });
    });
});

// ==========================
// Elimina carta
// ==========================
app.post('/elimina-carta', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non autenticato' });

    const { id } = req.body;
    const cliente_id = req.session.user.id;

    const sql = `DELETE FROM carte WHERE id = ? AND cliente_id = ?`;
    db.query(sql, [id, cliente_id], (err) => {
        if (err) return res.status(500).json({ error: 'Errore DB elimina carta' });
        res.json({ message: 'Carta eliminata con successo' });
    });
});




app.post('/aggiungi-indirizzo', (req, res) => {

    // 🔒 1. Controllo autenticazione
    if (!req.session || !req.session.user || !req.session.user.id) {
        return res.status(401).json({ 
            success: false,
            error: 'Utente non autenticato'
        });
    }

    // 📦 2. Estrazione dati dal body
    const { via, citta, cap, paese, nome_destinatario } = req.body;

    // 🛑 3. Validazione base
    if (!via || !citta || !nome_destinatario) {
        return res.status(400).json({
            success: false,
            error: 'Campi obbligatori mancanti'
        });
    }

    const cliente_id = req.session.user.id;

    const sql = `
        INSERT INTO indirizzi 
        (cliente_id, via, citta, cap, paese, nome_destinatario) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            cliente_id,
            via,
            citta,
            cap || '',
            paese || 'Italia',
            nome_destinatario
        ],
        (err, result) => {

            if (err) {
                console.error('❌ Errore DB aggiungi indirizzo:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Errore database'
                });
            }

            console.log('✅ Indirizzo inserito ID:', result.insertId);

            res.json({
                success: true,
                message: 'Indirizzo aggiunto con successo',
                insertId: result.insertId
            });
        }
    );
});



// Modifica indirizzo
app.post('/modifica-indirizzo', (req, res) => {
    const { id, via, citta, cap, paese, nome_destinatario } = req.body;
    const cliente_id = req.session.user.id;

    const sql = `UPDATE indirizzi 
                 SET via = ?, citta = ?, cap = ?, paese = ?, nome_destinatario = ?
                 WHERE id = ? AND cliente_id = ?`;
    db.query(sql, [via, citta, cap, paese, nome_destinatario, id, cliente_id], (err) => {
        if (err) return res.status(500).json({ error: 'Errore DB modifica indirizzo' });
        res.json({ message: 'Indirizzo modificato con successo' });
    });
});

// Elimina indirizzo
app.post('/elimina-indirizzo', (req, res) => {
    const { id } = req.body;
    const cliente_id = req.session.user.id;

    const sql = `DELETE FROM indirizzi WHERE id = ? AND cliente_id = ?`;
    db.query(sql, [id, cliente_id], (err) => {
        if (err) return res.status(500).json({ error: 'Errore DB elimina indirizzo' });
        res.json({ message: 'Indirizzo eliminato con successo' });
    });
});



app.post('/crea-ordine', requireLogin, (req, res) => {
    const { prezzo_totale, indirizzo_id, metodo_pagamento_id, dettagli } = req.body;
    const cliente_id = req.session.user.id;

    const sqlOrdine = 'INSERT INTO ordini (cliente_id, prezzo_totale, indirizzo_id, metodo_pagamento_id, stato_consegna) VALUES (?, ?, ?, ?, "In elaborazione")';
    db.query(sqlOrdine, [cliente_id, prezzo_totale, indirizzo_id, metodo_pagamento_id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Errore DB' });

        const ordine_id = result.insertId;

        // Inserisci i dettagli dell’ordine
        const sqlDettagli = 'INSERT INTO dettagli_ordini (ordine_id, prodotto_id, quantita, prezzo_unitario, prezzo_totale) VALUES ?';
        const values = dettagli.map(d => [ordine_id, d.prodotto_id, d.quantita, d.prezzo_unitario, d.prezzo_totale]);

        db.query(sqlDettagli, [values], (err) => {
            if (err) return res.status(500).json({ error: 'Errore DB dettagli ordine' });
            res.json({ message: 'Ordine creato con successo' });
        });
    });
});

app.get('/my-orders', requireLogin, (req, res) => {
  const cliente_id = req.session.user.id;

  const sql = `
    SELECT * FROM ordini
    WHERE cliente_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [cliente_id], (err, results) => {
    if (err) {
      console.error('Errore caricamento ordini:', err);
      return res.status(500).json({ error: 'Errore DB' });
    }

    res.json({ ordini: results });
  });
});

// ADMIN - Ultimi ordini (ultimi 10)
app.get('/admin/ordini/latest', (req, res) => {
  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const sql = `
    SELECT o.id, o.cliente_id, c.nome AS nome_cliente, o.data_ordinazione, o.prezzo_totale, o.stato_consegna
    FROM ordini o
    LEFT JOIN clienti c ON o.cliente_id = c.id
    ORDER BY o.id DESC
    LIMIT 10
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Errore DB' });

    // Aggiungi prodotti per ogni ordine
    const ordiniConProdotti = [];

    let count = 0;
    if (results.length === 0) return res.json([]);

    results.forEach(o => {
      db.query(
        'SELECT prodotto_id, quantita, prezzo_unitario, nome FROM dettagli_ordini WHERE ordine_id = ?',
        [o.id],
        (err2, dettagli) => {
          if (err2) return res.status(500).json({ error: 'Errore DB dettagli' });

          o.prodotti = dettagli.map(d => ({
            id: d.prodotto_id,
            nome: d.nome,
            quantita: d.quantita,
            prezzo_unitario: d.prezzo_unitario
          }));

          ordiniConProdotti.push(o);
          count++;

          if (count === results.length) {
            res.json(ordiniConProdotti);
          }
        }
      );
    });
  });
});


app.delete('/ordini/:id', requireLogin, (req, res) => {
  const ordineId = req.params.id;
  const userId = req.session.user.id;

  // ⚠️ ATTENZIONE: nel tuo DB la colonna è cliente_id NON user_id
  const sqlCheck = 'SELECT * FROM ordini WHERE id = ? AND cliente_id = ?';

  db.query(sqlCheck, [ordineId, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Errore server' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }

    // 1️⃣ Elimina dettagli ordine
    db.query(
      'DELETE FROM dettagli_ordini WHERE ordine_id = ?',
      [ordineId],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Errore eliminazione dettagli' });
        }

        // 2️⃣ Elimina ordine
        db.query(
          'DELETE FROM ordini WHERE id = ?',
          [ordineId],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: 'Errore eliminazione ordine' });
            }

            res.json({ message: 'Ordine eliminato con successo' });
          }
        );
      }
    );
  });
});




/// ==========================
//  Rotta Logout
// ==========================
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Errore nel logout' });
    res.json({ message: 'Logout effettuato con successo' });
  });
});


// ==========================
// AGGIUNGI PRODOTTO AL CARRELLO (DB)
// ==========================
app.post('/cart', requireLogin, (req, res) => {
  const cliente_id = req.session.user.id;
  const { prodotto_id, quantita } = req.body;

  // controllo se esiste già
  const checkSql = `
    SELECT * FROM carrello
    WHERE cliente_id = ? AND prodotto_id = ?
  `;

  db.query(checkSql, [cliente_id, prodotto_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Errore DB' });

    // 🔁 prodotto già nel carrello → aggiorna quantità
    if (results.length > 0) {
      const nuovaQuantita = results[0].quantita + quantita;

      const updateSql = `
        UPDATE carrello
        SET quantita = ?, data_aggiornamento = NOW()
        WHERE cliente_id = ? AND prodotto_id = ?
      `;

      db.query(updateSql, [nuovaQuantita, cliente_id, prodotto_id], err => {
        if (err) return res.status(500).json({ error: 'Errore update carrello' });
        res.json({ message: 'Carrello aggiornato' });
      });

    } else {
      // ➕ nuovo prodotto
      const insertSql = `
        INSERT INTO carrello (cliente_id, prodotto_id, quantita, data_aggiornamento)
        VALUES (?, ?, ?, NOW())
      `;

      db.query(insertSql, [cliente_id, prodotto_id, quantita], err => {
        if (err) return res.status(500).json({ error: 'Errore insert carrello' });
        res.json({ message: 'Prodotto aggiunto al carrello' });
      });
    }
  });
});



app.delete('/cart/:id', requireLogin, (req, res) => {
  const cliente_id = req.session.user.id;
  const prodotto_id = req.params.id;

  db.query(
    'DELETE FROM carrello WHERE cliente_id = ? AND prodotto_id = ?',
    [cliente_id, prodotto_id],
    err => {
      if (err) return res.status(500).json({ error: 'Errore DB' });
      res.json({ ok: true });
    }
  );
});


// Aggiungi prodotto alla wishlist
app.post('/wishlist', requireLogin, (req, res) => {
    const cliente_id = req.session.user.id;
    const { prodotto_id } = req.body;

    // Controlla se il prodotto è già nella wishlist
    const checkSql = 'SELECT * FROM wishlist WHERE cliente_id = ? AND prodotto_id = ?';
    db.query(checkSql, [cliente_id, prodotto_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Errore DB' });

        if (results.length > 0) {
            // Prodotto già presente → rimuovi
            const deleteSql = 'DELETE FROM wishlist WHERE cliente_id = ? AND prodotto_id = ?';
            db.query(deleteSql, [cliente_id, prodotto_id], (err) => {
                if (err) return res.status(500).json({ error: 'Errore eliminazione wishlist' });

                // Aggiorna sessione
                if (req.session.user.wishlist) {
                    req.session.user.wishlist = req.session.user.wishlist.filter(id => id !== prodotto_id);
                }

                res.json({ message: 'Prodotto rimosso dalla wishlist' });
            });
        } else {
            // Inserisci prodotto
            const insertSql = 'INSERT INTO wishlist (cliente_id, prodotto_id, data_aggiunta) VALUES (?, ?, NOW())';
            db.query(insertSql, [cliente_id, prodotto_id], (err) => {
                if (err) return res.status(500).json({ error: 'Errore aggiunta wishlist' });

                // Aggiorna sessione
                if (!req.session.user.wishlist) req.session.user.wishlist = [];
                req.session.user.wishlist.push(prodotto_id);

                res.json({ message: 'Prodotto aggiunto alla wishlist' });
            });
        }
    });
});


app.get('/wishlist', requireLogin, (req, res) => {
    const cliente_id = req.session.user.id;

    const sql = `
        SELECT w.prodotto_id, p.nome, p.prezzo, p.img
        FROM wishlist w
        JOIN prodotti p ON w.prodotto_id = p.id
        WHERE w.cliente_id = ?
        ORDER BY w.data_aggiunta DESC
    `;

    db.query(sql, [cliente_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Errore DB' });

        // Salva anche nella sessione
        req.session.user.wishlist = results.map(r => r.prodotto_id);

        res.json({
          logged: true,
          wishlist: results
        });
    });
});


// Rimuovi prodotto dalla wishlist
app.delete('/wishlist/:id', requireLogin, (req, res) => {

    const cliente_id = req.session.user.id;
    const prodotto_id = req.params.id;

    const sql = `
        DELETE FROM wishlist 
        WHERE cliente_id = ? AND prodotto_id = ?
    `;

    db.query(sql, [cliente_id, prodotto_id], (err) => {
        if (err) {
            console.error('Errore eliminazione wishlist:', err);
            return res.status(500).json({ error: 'Errore DB' });
        }

        res.json({ message: 'Prodotto rimosso dalla wishlist' });
    });
});

// ==========================
// 7️⃣ Avvio server
// ==========================
app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});



// Rotta per ottenere un singolo prodotto
app.get('/prodotto/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM prodotti WHERE id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Errore DB SELECT:', err);
            return res.status(500).json({ error: 'Errore nel recupero prodotto' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Prodotto non trovato' });
        }

        res.json(results[0]); // restituisce solo il prodotto trovato
    });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/Login-register.html' }),
  (req, res) => {
    // 🔐 sessione compatibile con il tuo sistema
    req.session.user = req.user;
    res.redirect('/html/Home.html');
  }
);

// ==========================
// ADMIN - Statistiche Dashboard
// ==========================
app.get('/admin/statistiche', (req, res) => {

  // 🔐 Controllo login e permessi
  if (!req.session.user || !req.session.user.isDashboardUser) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  // Inizializza oggetto statistiche
  const stats = {
    utenti: 0,
    prodotti: 0,
    ordini: 0,
    recavi: 0
  };

  // 1️⃣ Totale utenti
  db.query('SELECT COUNT(*) AS totale FROM clienti', (err, result) => {
    if (err) return res.status(500).json({ error: 'Errore DB utenti' });
    stats.utenti = result[0].totale;

    // 2️⃣ Totale prodotti
    db.query('SELECT COUNT(*) AS totale FROM prodotti', (err, result) => {
      if (err) return res.status(500).json({ error: 'Errore DB prodotti' });
      stats.prodotti = result[0].totale;

      // 3️⃣ Totale ordini
      db.query('SELECT COUNT(*) AS totale FROM ordini', (err, result) => {
        if (err) return res.status(500).json({ error: 'Errore DB ordini' });
        stats.ordini = result[0].totale;

        // 4️⃣ Recavi totali
        db.query('SELECT SUM(prezzo_totale) AS totale FROM ordini', (err, result) => {
          if (err) return res.status(500).json({ error: 'Errore DB recavi' });
          stats.recavi = result[0].totale || 0;

          // 🔹 Restituisci JSON completo
          res.json(stats);
        });
      });
    });
  });
});

app.get('/healthz', (req, res) => res.send('OK'));