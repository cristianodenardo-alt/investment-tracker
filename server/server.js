const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database setup - soluzione semplificata per Render
let db;
try {
  // Prova prima con database persistente
  const dbDir = process.env.NODE_ENV === 'production' ? '/tmp' : './server';
  const dbPath = `${dbDir}/investments.db`;
  
  // Assicurati che la directory esista
  if (process.env.NODE_ENV === 'production') {
    if (!fs.existsSync('/tmp')) {
      fs.mkdirSync('/tmp', { recursive: true });
    }
  }
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Errore con database persistente:', err.message);
      // Fallback a database in memoria
      db = new sqlite3.Database(':memory:', (err) => {
        if (err) {
          console.error('Errore anche con database in memoria:', err.message);
        } else {
          console.log('Connesso a database in memoria');
          initializeDatabase();
        }
      });
    } else {
      console.log('Connesso al database SQLite:', dbPath);
      initializeDatabase();
    }
  });
} catch (error) {
  console.error('Errore critico con database:', error);
  // Database in memoria come ultima risorsa
  db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
      console.error('Errore fatale:', err.message);
    } else {
      console.log('Connesso a database in memoria (fallback)');
      initializeDatabase();
    }
  });
}

function initializeDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    isin TEXT,
    ticker TEXT,
    invested_amount REAL,
    shares REAL,
    purchase_price REAL,
    purchase_date TEXT,
    type TEXT,
    tax_rate REAL,
    currency TEXT DEFAULT 'EUR',
    current_value REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Errore creazione tabella investments:', err);
    } else {
      console.log('Tabella investments pronta');
      
      // Inserisci dati di esempio per testing
      db.get("SELECT COUNT(*) as count FROM investments", (err, row) => {
        if (!err && row.count === 0) {
          const sampleData = [
            ['Apple Inc.', 'US0378331005', 'AAPL', 5000, 10, 500, '2024-01-15', 'Azione', 26, 'USD', 5200, 'Investimento tecnologico'],
            ['BTP Italia', 'IT0001234567', 'BTPI', 10000, 100, 100, '2024-02-01', 'Obbligazione', 12.5, 'EUR', 10100, 'BTP a tasso variabile']
          ];
          
          sampleData.forEach(data => {
            db.run(`INSERT INTO investments (title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, current_value, notes) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, data);
          });
          console.log('Dati di esempio inseriti');
        }
      });
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investment_id INTEGER,
    coupon_date TEXT,
    coupon_amount REAL,
    is_paid INTEGER DEFAULT 0,
    FOREIGN KEY(investment_id) REFERENCES investments(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS monthly_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investment_id INTEGER,
    month_year TEXT,
    profit_loss REAL,
    FOREIGN KEY(investment_id) REFERENCES investments(id)
  )`);
}

// API Routes
app.get('/api/investments', (req, res) => {
  db.all('SELECT * FROM investments ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Errore fetch investments:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
});

app.post('/api/investments', (req, res) => {
  const { title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, notes } = req.body;
  
  db.run(
    `INSERT INTO investments (title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, notes],
    function(err) {
      if (err) {
        console.error('Errore inserimento investment:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/investments/:id', (req, res) => {
  const { title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, current_value, notes } = req.body;
  
  db.run(
    `UPDATE investments 
     SET title = ?, isin = ?, ticker = ?, invested_amount = ?, shares = ?, purchase_price = ?, purchase_date = ?, type = ?, tax_rate = ?, currency = ?, current_value = ?, notes = ?
     WHERE id = ?`,
    [title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, current_value, notes, req.params.id],
    function(err) {
      if (err) {
        console.error('Errore aggiornamento investment:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/investments/:id', (req, res) => {
  db.run('DELETE FROM investments WHERE id = ?', req.params.id, function(err) {
    if (err) {
      console.error('Errore eliminazione investment:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Route per la homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Route per tutte le altre richieste
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Gestione errori
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});