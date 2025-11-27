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

// Database setup ottimizzato per Render
const getDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // Su Render, usa /tmp che è persistente
    return '/tmp/investments.db';
  } else {
    // In sviluppo, usa cartella locale
    return path.join(__dirname, 'investments.db');
  }
};

const dbPath = getDbPath();
console.log(`Database path: ${dbPath}`);

// Assicurati che la directory esista
if (process.env.NODE_ENV === 'production') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let db;

try {
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      // Fallback a database in memoria se persistente fallisce
      console.log('Falling back to in-memory database');
      db = new sqlite3.Database(':memory:', (err) => {
        if (err) {
          console.error('Error with in-memory database:', err.message);
        } else {
          console.log('Connected to in-memory SQLite database');
          initializeDatabase();
        }
      });
    } else {
      console.log(`Connected to SQLite database at: ${dbPath}`);
      initializeDatabase();
    }
  });
} catch (error) {
  console.error('Critical database error:', error);
  // Ultimo fallback
  db = new sqlite3.Database(':memory:');
  initializeDatabase();
}

function initializeDatabase() {
  // Abilita le foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  db.serialize(() => {
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
        console.error('Error creating investments table:', err);
      } else {
        console.log('Investments table ready');
        
        // Inserisci dati di esempio solo se la tabella è vuota
        db.get("SELECT COUNT(*) as count FROM investments", (err, row) => {
          if (!err && row.count === 0) {
            const sampleData = [
              ['Apple Inc.', 'US0378331005', 'AAPL', 5000, 10, 500, '2024-01-15', 'Azione', 26, 'USD', 5200, 'Investimento tecnologico'],
              ['BTP Italia', 'IT0001234567', 'BTPI', 10000, 100, 100, '2024-02-01', 'Obbligazione', 12.5, 'EUR', 10100, 'BTP a tasso variabile']
            ];
            
            const stmt = db.prepare(`INSERT INTO investments (title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, current_value, notes) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            
            sampleData.forEach(data => {
              stmt.run(data, (err) => {
                if (err) console.error('Error inserting sample data:', err);
              });
            });
            
            stmt.finalize();
            console.log('Sample data inserted');
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
  });
}

// API Routes con migliore gestione errori
app.get('/api/investments', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  db.all('SELECT * FROM investments ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Error fetching investments:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
});

app.post('/api/investments', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  const { title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, notes } = req.body;
  
  db.run(
    `INSERT INTO investments (title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, notes],
    function(err) {
      if (err) {
        console.error('Error inserting investment:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/investments/:id', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  const { title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, current_value, notes } = req.body;
  
  db.run(
    `UPDATE investments 
     SET title = ?, isin = ?, ticker = ?, invested_amount = ?, shares = ?, purchase_price = ?, purchase_date = ?, type = ?, tax_rate = ?, currency = ?, current_value = ?, notes = ?
     WHERE id = ?`,
    [title, isin, ticker, invested_amount, shares, purchase_price, purchase_date, type, tax_rate, currency, current_value, notes, req.params.id],
    function(err) {
      if (err) {
        console.error('Error updating investment:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/investments/:id', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  db.run('DELETE FROM investments WHERE id = ?', req.params.id, function(err) {
    if (err) {
      console.error('Error deleting investment:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Health check endpoint migliorato
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected',
    platform: process.platform,
    node_version: process.version
  };
  
  res.json(health);
});

// Route per la homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Route per tutte le altre richieste
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing database connection...');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Avvio server
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${dbPath}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
}); s