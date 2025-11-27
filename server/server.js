const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database in memoria (array JavaScript)
let investments = [
  {
    id: 1,
    title: "Apple Inc.",
    isin: "US0378331005",
    ticker: "AAPL",
    invested_amount: 5000,
    shares: 10,
    purchase_price: 500,
    purchase_date: "2024-01-15",
    type: "Azione",
    tax_rate: 26,
    currency: "USD",
    current_value: 5200,
    notes: "Investimento tecnologico",
    created_at: "2024-01-15T10:00:00.000Z"
  },
  {
    id: 2,
    title: "BTP Italia",
    isin: "IT0001234567",
    ticker: "BTPI",
    invested_amount: 10000,
    shares: 100,
    purchase_price: 100,
    purchase_date: "2024-02-01",
    type: "Obbligazione",
    tax_rate: 12.5,
    currency: "EUR",
    current_value: 10100,
    notes: "BTP a tasso variabile",
    created_at: "2024-02-01T09:00:00.000Z"
  }
];

let nextId = 3;

// API Routes
app.get('/api/investments', (req, res) => {
  res.json(investments);
});

app.post('/api/investments', (req, res) => {
  const newInvestment = {
    id: nextId++,
    ...req.body,
    created_at: new Date().toISOString()
  };
  investments.push(newInvestment);
  res.json({ id: newInvestment.id });
});

app.put('/api/investments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = investments.findIndex(inv => inv.id === id);
  
  if (index !== -1) {
    investments[index] = { ...investments[index], ...req.body };
    res.json({ changes: 1 });
  } else {
    res.status(404).json({ error: 'Investment not found' });
  }
});

app.delete('/api/investments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = investments.length;
  investments = investments.filter(inv => inv.id !== id);
  res.json({ deleted: initialLength - investments.length });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    investments_count: investments.length
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
  console.log(`✅ Server avviato sulla porta ${PORT}`);
  console.log(`✅ Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Database in memoria con ${investments.length} investimenti di esempio`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});