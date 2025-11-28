const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch'); // Aggiungi questa dipendenza

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database in memoria
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
    created_at: "2024-01-15T10:00:00.000Z",
    last_price_update: "2024-01-15T10:00:00.000Z"
  }
];

let nextId = 2;

// Servizio per ottenere prezzo da ISIN
async function getPriceByISIN(isin) {
  try {
    // Prima prova con Yahoo Finance
    let price = await getPriceFromYahoo(isin);
    if (price) return price;

    // Poi prova con Alpha Vantage
    price = await getPriceFromAlphaVantage(isin);
    if (price) return price;

    throw new Error('Prezzo non disponibile');
  } catch (error) {
    console.error('Errore nel fetch prezzo:', error);
    throw error;
  }
}

// Yahoo Finance API (non ufficiale ma funziona bene)
async function getPriceFromYahoo(isin) {
  try {
    // Converti ISIN in simbolo Yahoo (per azioni US/IT)
    const symbol = await isinToSymbol(isin);
    if (!symbol) return null;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      return data.chart.result[0].meta.regularMarketPrice;
    }
    return null;
  } catch (error) {
    console.log('Yahoo Finance non disponibile:', error.message);
    return null;
  }
}

// Alpha Vantage API (richiede API key gratuita)
async function getPriceFromAlphaVantage(isin) {
  try {
    const symbol = await isinToSymbol(isin);
    if (!symbol) return null;

    // Usa API key di default per testing (sostituisci con la tua)
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      return parseFloat(data['Global Quote']['05. price']);
    }
    return null;
  } catch (error) {
    console.log('Alpha Vantage non disponibile:', error.message);
    return null;
  }
}

// Converti ISIN in simbolo di borsa
async function isinToSymbol(isin) {
  // Mappatura ISIN -> simboli (aggiungi qui i tuoi ISIN)
  const isinToSymbolMap = {
    'US0378331005': 'AAPL',    // Apple
    'US0231351067': 'AMZN',    // Amazon
    'US88160R1014': 'TSLA',    // Tesla
    'IE00B4L5Y983': 'IWDA.AS', // iShares Core MSCI World
    'IT0005439365': 'ENEL.MI', // Enel
    'IT0003132476': 'G.MI',    // Assicurazioni Generali
    'NL0011821202': 'ASML.AS', // ASML
    'FR0000120578': 'SAN.PA',  // Sanofi
    'DE0007164600': 'SAP.DE',  // SAP
    'CH0012221716': 'ROG.SW',  // Roche
    'IT0005581530': ' ', // MEDIOBANCA TM 24/29
    'IT0005547408': ' ', //BTVAL 13GEN27

  };

  return isinToSymbolMap[isin] || isin; // Se non nella mappa, usa ISIN come fallback
}

// API Routes esistenti...
app.get('/api/investments', (req, res) => {
  res.json(investments);
});

app.post('/api/investments', (req, res) => {
  const newInvestment = {
    id: nextId++,
    ...req.body,
    created_at: new Date().toISOString(),
    last_price_update: new Date().toISOString()
  };
  investments.push(newInvestment);
  res.json({ id: newInvestment.id });
});

// NUOVA ROUTE: Aggiorna prezzo per ISIN
app.put('/api/investments/:id/update-price', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const investment = investments.find(inv => inv.id === id);
    
    if (!investment) {
      return res.status(404).json({ error: 'Investimento non trovato' });
    }

    if (!investment.isin) {
      return res.status(400).json({ error: 'ISIN mancante per questo investimento' });
    }

    const currentPrice = await getPriceByISIN(investment.isin);
    
    // Calcola il nuovo valore corrente
    const newCurrentValue = currentPrice * investment.shares;
    investment.current_value = newCurrentValue;
    investment.last_price_update = new Date().toISOString();

    res.json({
      success: true,
      current_price: currentPrice,
      current_value: newCurrentValue,
      last_update: investment.last_price_update
    });

  } catch (error) {
    console.error('Errore aggiornamento prezzo:', error);
    res.status(500).json({ 
      error: 'Impossibile aggiornare il prezzo',
      details: error.message 
    });
  }
});

// NUOVA ROUTE: Aggiorna tutti i prezzi
app.put('/api/investments/update-all-prices', async (req, res) => {
  try {
    const results = [];
    
    for (const investment of investments) {
      if (investment.isin) {
        try {
          const currentPrice = await getPriceByISIN(investment.isin);
          const newCurrentValue = currentPrice * investment.shares;
          
          investment.current_value = newCurrentValue;
          investment.last_price_update = new Date().toISOString();

          results.push({
            id: investment.id,
            title: investment.title,
            success: true,
            current_price: currentPrice,
            current_value: newCurrentValue
          });

          // Aspetta tra le richieste per non sovraccaricare le API
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          results.push({
            id: investment.id,
            title: investment.title,
            success: false,
            error: error.message
          });
        }
      }
    }

    res.json({
      success: true,
      updated: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Errore nell\'aggiornamento dei prezzi' 
    });
  }
});

// Health check
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server avviato sulla porta ${PORT}`);
  console.log(`✅ Servizio prezzi in tempo reale attivo`);
});