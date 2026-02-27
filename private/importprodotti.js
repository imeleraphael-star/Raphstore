import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'raphstore'
};

// Risolve il percorso assoluto della cartella dello script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importJson() {
    let connection;

    try {
        // Connessione al database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connesso al database');

        // Creazione tabella se non esiste
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS prodotti (
                id INT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                prezzo DECIMAL(10,2) NOT NULL,
                descrizione TEXT,
                img VARCHAR(255)
            )
        `);
        console.log('✅ Tabella "prodotti" pronta');

        // Controllo se il file JSON esiste
        const jsonPath = path.join(__dirname, 'prodotti.json');
        if (!fs.existsSync(jsonPath)) {
            console.error('❌ File prodotti.json non trovato nella cartella dello script!');
            return;
        }

        // Lettura e parsing del file JSON
        const fileData = fs.readFileSync(jsonPath, 'utf-8');
        const prodotti = JSON.parse(fileData);

        if (prodotti.length === 0) {
            console.log('⚠️ Nessun prodotto trovato nel JSON');
            return;
        }

        // Preparazione valori per batch insert
        const values = prodotti.map(p => [
            p.id,
            p.immagine || 'default.png',           // qui prende correttamente "immagine" dal JSON
            p.nome || 'Prodotto senza nome',
            parseFloat(p.prezzo) || 0.00,         // assicura che prezzo sia numero
            p.descrizione || 'Nessuna descrizione'
        ]);

        const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');

        // Query di inserimento batch con ON DUPLICATE KEY UPDATE
        await connection.execute(
            `INSERT INTO prodotti (id, img, nome, prezzo, descrizione)
             VALUES ${placeholders}
             ON DUPLICATE KEY UPDATE
             img = VALUES(img),
             nome = VALUES(nome),
             prezzo = VALUES(prezzo),
             descrizione = VALUES(descrizione)`,
            values.flat()
        );

        console.log(`✅ Importazione completata! ${prodotti.length} prodotti inseriti/aggiornati`);

    } catch (err) {
        console.error('❌ Errore durante l\'importazione:', err);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Connessione chiusa');
        }
    }
}

importJson();
