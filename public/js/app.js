class InvestmentTracker {
    constructor() {
        this.investments = [];
        this.currentInvestment = null;
        this.init();
    }

    init() {
        this.loadInvestments();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('save-investment').addEventListener('click', () => this.saveInvestment());
        document.getElementById('search-input').addEventListener('input', (e) => this.filterInvestments(e.target.value));
        document.getElementById('type-filter').addEventListener('change', (e) => this.filterByType(e.target.value));
        document.getElementById('update-all-prices').addEventListener('click', () => this.updateAllPrices());
    }

    async loadInvestments() {
        try {
            const response = await fetch('/api/investments');
            this.investments = await response.json();
            this.renderInvestments();
            this.updatePortfolioSummary();
        } catch (error) {
            console.error('Errore nel caricamento investimenti:', error);
        }
    }

    renderInvestments() {
        const container = document.getElementById('investments-list');
        container.innerHTML = '';

        this.investments.forEach(investment => {
            const currentValue = investment.current_value || investment.invested_amount;
            const profit = currentValue - investment.invested_amount;
            const profitPercentage = (profit / investment.invested_amount * 100).toFixed(2);
            
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-3';
            card.innerHTML = `
            <div class="card investment-card" data-id="${investment.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <h5 class="card-title">${investment.title}</h5>
                        <span class="badge bg-secondary">${investment.type}</span>
                    </div>
                    <p class="card-text mb-1"><small class="text-muted">ISIN: ${investment.isin || 'N/A'}</small></p>
                    <p class="card-text mb-1">Investito: €${parseFloat(investment.invested_amount).toFixed(2)}</p>
                    <p class="card-text mb-1">Valore attuale: €${parseFloat(currentValue).toFixed(2)}</p>
                    <p class="card-text ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                        ${profit >= 0 ? '+' : ''}€${profit.toFixed(2)} (${profitPercentage}%)
                    </p>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-btn" data-id="${investment.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-success update-price-btn" data-id="${investment.id}" title="Aggiorna prezzo">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-btn" data-id="${investment.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
            container.appendChild(card);
        });

        // Aggiungi event listeners per i pulsanti
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editInvestment(parseInt(btn.dataset.id));
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteInvestment(parseInt(btn.dataset.id));
            });
        });

        document.querySelectorAll('.investment-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-group')) {
                    this.showInvestmentDetails(parseInt(card.dataset.id));
                }
            });
        });
    }

    updatePortfolioSummary() {
        const totalInvested = this.investments.reduce((sum, inv) => sum + parseFloat(inv.invested_amount), 0);
        const totalCurrent = this.investments.reduce((sum, inv) => sum + parseFloat(inv.current_value || inv.invested_amount), 0);
        const totalProfit = totalCurrent - totalInvested;

        document.getElementById('total-invested').textContent = `€${totalInvested.toFixed(2)}`;
        document.getElementById('total-current').textContent = `€${totalCurrent.toFixed(2)}`;
        document.getElementById('total-profit').textContent = `€${totalProfit.toFixed(2)}`;
        document.getElementById('total-profit').className = totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
    }

    filterInvestments(searchTerm) {
        const filtered = this.investments.filter(inv => 
            inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.isin && inv.isin.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (inv.ticker && inv.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderFilteredInvestments(filtered);
    }

    filterByType(type) {
        if (!type) {
            this.renderInvestments();
            return;
        }
        const filtered = this.investments.filter(inv => inv.type === type);
        this.renderFilteredInvestments(filtered);
    }

    renderFilteredInvestments(filteredInvestments) {
        const container = document.getElementById('investments-list');
        container.innerHTML = '';

        filteredInvestments.forEach(investment => {
            // Stesso codice di renderInvestments ma per gli investimenti filtrati
            const currentValue = investment.current_value || investment.invested_amount;
            const profit = currentValue - investment.invested_amount;
            const profitPercentage = (profit / investment.invested_amount * 100).toFixed(2);
            
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-3';
            card.innerHTML = `
                <div class="card investment-card" data-id="${investment.id}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${investment.title}</h5>
                            <span class="badge bg-secondary">${investment.type}</span>
                        </div>
                        <p class="card-text mb-1"><small class="text-muted">ISIN: ${investment.isin || 'N/A'}</small></p>
                        <p class="card-text mb-1">Investito: €${parseFloat(investment.invested_amount).toFixed(2)}</p>
                        <p class="card-text mb-1">Valore attuale: €${parseFloat(currentValue).toFixed(2)}</p>
                        <p class="card-text ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                            ${profit >= 0 ? '+' : ''}€${profit.toFixed(2)} (${profitPercentage}%)
                        </p>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary edit-btn" data-id="${investment.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-btn" data-id="${investment.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Re-attach event listeners
        this.attachCardEventListeners();
    }

    attachCardEventListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editInvestment(parseInt(btn.dataset.id));
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteInvestment(parseInt(btn.dataset.id));
            });
        });

        document.querySelectorAll('.investment-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-group')) {
                    this.showInvestmentDetails(parseInt(card.dataset.id));
                }
            });
        });

        document.querySelectorAll('.update-price-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.updatePrice(parseInt(btn.dataset.id));
            });
        });
    }

    newInvestment() {
        this.currentInvestment = null;
        document.getElementById('modalTitle').textContent = 'Nuovo Investimento';
        document.getElementById('investment-form').reset();
        document.getElementById('investment-id').value = '';
    }

    editInvestment(id) {
        this.currentInvestment = this.investments.find(inv => inv.id === id);
        if (this.currentInvestment) {
            document.getElementById('modalTitle').textContent = 'Modifica Investimento';
            document.getElementById('investment-id').value = this.currentInvestment.id;
            document.getElementById('title').value = this.currentInvestment.title;
            document.getElementById('isin').value = this.currentInvestment.isin || '';
            document.getElementById('ticker').value = this.currentInvestment.ticker || '';
            document.getElementById('invested_amount').value = this.currentInvestment.invested_amount;
            document.getElementById('shares').value = this.currentInvestment.shares;
            document.getElementById('purchase_price').value = this.currentInvestment.purchase_price;
            document.getElementById('purchase_date').value = this.currentInvestment.purchase_date;
            document.getElementById('type').value = this.currentInvestment.type;
            document.getElementById('tax_rate').value = this.currentInvestment.tax_rate;
            
            const modal = new bootstrap.Modal(document.getElementById('investmentModal'));
            modal.show();
        }
    }

    async saveInvestment() {
        const formData = {
            title: document.getElementById('title').value,
            isin: document.getElementById('isin').value,
            ticker: document.getElementById('ticker').value,
            invested_amount: parseFloat(document.getElementById('invested_amount').value),
            shares: parseFloat(document.getElementById('shares').value),
            purchase_price: parseFloat(document.getElementById('purchase_price').value),
            purchase_date: document.getElementById('purchase_date').value,
            type: document.getElementById('type').value,
            tax_rate: parseFloat(document.getElementById('tax_rate').value)
        };

        const id = document.getElementById('investment-id').value;
        const url = id ? `/api/investments/${id}` : '/api/investments';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('investmentModal'));
                modal.hide();
                this.loadInvestments();
            } else {
                alert('Errore nel salvataggio');
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore nel salvataggio');
        }
    }

    async deleteInvestment(id) {
        if (confirm('Sei sicuro di voler eliminare questo investimento?')) {
            try {
                const response = await fetch(`/api/investments/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.loadInvestments();
                } else {
                    alert('Errore nell\'eliminazione');
                }
            } catch (error) {
                console.error('Errore:', error);
                alert('Errore nell\'eliminazione');
            }
        }
    }

    showInvestmentDetails(id) {
        // Qui puoi implementare la visualizzazione dei dettagli completi
        const investment = this.investments.find(inv => inv.id === id);
        if (investment) {
            alert(`Dettagli per: ${investment.title}\nISIN: ${investment.isin || 'N/A'}\nTicker: ${investment.ticker || 'N/A'}`);
        }
    }

    async updatePrice(investmentId) {
  try {
    const response = await fetch(`/api/investments/${investmentId}/update-price`, {
      method: 'PUT'
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Mostra notifica
      this.showNotification(`Prezzo aggiornato: €${result.current_price.toFixed(2)}`, 'success');
      // Ricarica la lista
      this.loadInvestments();
    } else {
      this.showNotification(`Errore: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Errore aggiornamento prezzo:', error);
    this.showNotification('Errore nel collegamento al servizio prezzi', 'error');
  }
}

async updateAllPrices() {
  try {
    this.showNotification('Aggiornamento prezzi in corso...', 'info');
    
    const response = await fetch('/api/investments/update-all-prices', {
      method: 'PUT'
    });
    
    const result = await response.json();
    
    if (result.success) {
      this.showNotification(
        `Prezzi aggiornati: ${result.updated} successi, ${result.failed} falliti`, 
        'success'
      );
      this.loadInvestments();
    } else {
      this.showNotification('Errore nell\'aggiornamento globale', 'error');
    }
  } catch (error) {
    console.error('Errore aggiornamento globale:', error);
    this.showNotification('Errore nel collegamento al servizio prezzi', 'error');
  }
}

showNotification(message, type = 'info') {
  // Crea una notifica temporanea
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; min-width: 300px;';
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notification);
  
  // Rimuovi automaticamente dopo 5 secondi
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}
}

// Inizializza l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.investmentTracker = new InvestmentTracker();
    
    // Apri il modal per nuovo investimento quando si clicca il pulsante
    document.querySelector('[data-bs-target="#investmentModal"]').addEventListener('click', () => {
        window.investmentTracker.newInvestment();
    });
});