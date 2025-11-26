const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database setup - usa percorso assoluto per produzione
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/investments.db' 
  : './server/investments.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Errore apertura database:', err.message);
  } else {
    console.log('Connesso al database SQLite:', dbPath);
    initializeDatabase();
  }
});

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
  )`);

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
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
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
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
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

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});