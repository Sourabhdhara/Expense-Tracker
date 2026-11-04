// ==========================================
// 1. STATE MANAGEMENT
// ==========================================
let transactions = [];
let currentCurrency = '₹';
let filterType = 'all';
let searchTerm = '';
let filterCategory = 'all';
let sortBy = 'date-desc';

// Offline category glyphs (No FontAwesome CDN needed)
const categoryGlyphs = {
  'Food & Dining': '🍔',
  'College & Studies': '📚',
  'Transportation': '🚗',
  'Rent & Housing': '🏠',
  'Utilities': '💡',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Salary / Allowance': '💼',
  'Other': '✨'
};

// Hex palette for dynamic category progress bars
const categoryColors = [
  '#4f46e5', '#10b981', '#f59e0b', 
  '#ef4444', '#06b6d4', '#d946ef', 
  '#8b5cf6', '#f97316', '#14b8a6'
];

// ==========================================
// 2. DOM SELECTORS
// ==========================================
const form = document.getElementById('transaction-form');
const transTitle = document.getElementById('trans-title');
const transAmount = document.getElementById('trans-amount');
const transCategory = document.getElementById('trans-category');
const transDate = document.getElementById('trans-date');
const transactionsList = document.getElementById('transactions-list');
const emptyState = document.getElementById('empty-state');
const totalBalance = document.getElementById('total-balance');
const totalIncome = document.getElementById('total-income');
const totalExpense = document.getElementById('total-expense');
const incomeCount = document.getElementById('income-count');
const expenseCount = document.getElementById('expense-count');
const savingsRateBadge = document.getElementById('savings-rate-badge');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('filter-category');
const sortFilter = document.getElementById('filter-sort');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const categoryBreakdownContainer = document.getElementById('category-breakdown-container');
const currencySelector = document.getElementById('currency-symbol');
const formCurrencyLabel = document.getElementById('form-currency-label');
const filteredCountBadge = document.getElementById('filtered-count-badge');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Modal Elements
const modalContainer = document.getElementById('modal-container');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// Initialize default date to today's date
transDate.valueAsDate = new Date();

// ==========================================
// 3. UI HELPERS & FORMATTERS
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

function formatCurrency(amount) {
  return `${currentCurrency}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function escapeHTML(str) {
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// ==========================================
// 4. STORAGE PERSISTENCE
// ==========================================
function loadTransactions() {
  try {
    const stored = localStorage.getItem('apex_spend_offline_data');
    const storedCurrency = localStorage.getItem('apex_spend_offline_curr');
    if (stored) transactions = JSON.parse(stored);
    if (storedCurrency) {
      currentCurrency = storedCurrency;
      currencySelector.value = currentCurrency;
      formCurrencyLabel.textContent = currentCurrency;
    }
  } catch (err) {
    console.error('Storage access failed:', err);
    transactions = [];
  }
}

function saveTransactions() {
  localStorage.setItem('apex_spend_offline_data', JSON.stringify(transactions));
  localStorage.setItem('apex_spend_offline_curr', currentCurrency);
}

// ==========================================
// 5. CALCULATIONS & DASHBOARD
// ==========================================
function updateMetrics() {
  let incomeSum = 0;
  let expenseSum = 0;
  let incCount = 0;
  let expCount = 0;
  const expenseByCategory = {};

  transactions.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      incomeSum += amt;
      incCount++;
    } else {
      expenseSum += amt;
      expCount++;
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + amt;
    }
  });

  const netBalance = incomeSum - expenseSum;

  totalBalance.textContent = (netBalance < 0 ? '-' : '') + formatCurrency(Math.abs(netBalance));
  totalIncome.textContent = `+${formatCurrency(incomeSum)}`;
  totalExpense.textContent = `-${formatCurrency(expenseSum)}`;
  incomeCount.textContent = `${incCount} record${incCount === 1 ? '' : 's'}`;
  expenseCount.textContent = `${expCount} record${expCount === 1 ? '' : 's'}`;

  const savingsRate = incomeSum > 0 ? Math.round(((incomeSum - expenseSum) / incomeSum) * 100) : 0;
  savingsRateBadge.textContent = `Savings: ${savingsRate}%`;

  renderCategoryBreakdown(expenseByCategory, expenseSum);
}

function renderCategoryBreakdown(expenseMap, totalExp) {
  categoryBreakdownContainer.innerHTML = '';
  const categories = Object.keys(expenseMap);

  if (categories.length === 0 || totalExp === 0) {
    categoryBreakdownContainer.innerHTML = `
      <p class="empty-hint">No expenses recorded yet.</p>
    `;
    return;
  }

  // Sort highest expense first
  categories.sort((a, b) => expenseMap[b] - expenseMap[a]);

  categories.forEach((cat, idx) => {
    const amount = expenseMap[cat];
    const percent = ((amount / totalExp) * 100).toFixed(1);
    const color = categoryColors[idx % categoryColors.length];

    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <div class="breakdown-info">
        <span>${cat}</span>
        <span>${formatCurrency(amount)} (${percent}%)</span>
      </div>
      <div class="breakdown-track">
        <div class="breakdown-fill" style="width: ${percent}%; background-color: ${color};"></div>
      </div>
    `;
    categoryBreakdownContainer.appendChild(row);
  });
}

// ==========================================
// 6. RENDER TRANSACTION LIST
// ==========================================
function renderTransactions() {
  let list = transactions.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  if (filterCategory !== 'all') {
    list = list.filter(item => item.category === filterCategory);
  }

  if (searchTerm.trim() !== '') {
    const query = searchTerm.toLowerCase();
    list = list.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }

  // Sorting
  list.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
    if (sortBy === 'amount-asc') return Number(a.amount) - Number(b.amount);
    return 0;
  });

  filteredCountBadge.textContent = list.length;
  transactionsList.innerHTML = '';

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
  }

  list.forEach(item => {
    const li = document.createElement('li');
    li.className = 'tx-item';

    const isIncome = item.type === 'income';
    const glyph = categoryGlyphs[item.category] || '💰';

    li.innerHTML = `
      <div class="tx-main">
        <div class="tx-category-badge" style="background: ${isIncome ? '#ecfdf5' : '#fef2f2'};">
          ${glyph}
        </div>
        <div class="tx-info">
          <div class="tx-title">${escapeHTML(item.title)}</div>
          <div class="tx-meta">${escapeHTML(item.category)} • ${formatDisplayDate(item.date)}</div>
        </div>
      </div>

      <div class="tx-right">
        <span class="tx-amount ${isIncome ? 'text-emerald' : 'text-rose'}">
          ${isIncome ? '+' : '-'}${formatCurrency(item.amount)}
        </span>
        <button data-id="${item.id}" class="delete-trans-btn" title="Delete Entry">&times;</button>
      </div>
    `;
    transactionsList.appendChild(li);
  });
}

// ==========================================
// 7. EVENT LISTENERS
// ==========================================

// Submit Add Form
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = transTitle.value.trim();
  const amount = parseFloat(transAmount.value);
  const category = transCategory.value;
  const date = transDate.value;
  const type = document.querySelector('input[name="entry-type"]:checked').value;

  if (!title || isNaN(amount) || amount <= 0 || !date) {
    showToast('Please fill out all fields with valid values.', 'danger');
    return;
  }

  const newTransaction = {
    id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 6),
    title,
    amount: Number(amount.toFixed(2)),
    category,
    date,
    type
  };

  transactions.unshift(newTransaction);
  saveTransactions();
  updateMetrics();
  renderTransactions();

  transTitle.value = '';
  transAmount.value = '';
  transDate.valueAsDate = new Date();
  transTitle.focus();

  showToast(`${type === 'income' ? 'Income' : 'Expense'} recorded successfully!`, 'success');
});

// Delete individual transaction
transactionsList.addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-trans-btn');
  if (!btn) return;

  const id = btn.getAttribute('data-id');
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  updateMetrics();
  renderTransactions();
  showToast('Transaction removed', 'info');
});

// Clear All Dialog
clearAllBtn.addEventListener('click', () => {
  if (transactions.length === 0) {
    showToast('No transactions to clear.', 'info');
    return;
  }
  modalContainer.classList.remove('hidden');
});

modalCancelBtn.addEventListener('click', () => {
  modalContainer.classList.add('hidden');
});

modalConfirmBtn.addEventListener('click', () => {
  transactions = [];
  saveTransactions();
  updateMetrics();
  renderTransactions();
  modalContainer.classList.add('hidden');
  showToast('All transaction records cleared.', 'danger');
});

// Live Search
searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderTransactions();
});

// Type Filter Buttons
const typeButtons = document.querySelectorAll('.type-filter-btn');
typeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    typeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterType = btn.getAttribute('data-type-filter');
    renderTransactions();
  });
});

// Dropdown Filters
categoryFilter.addEventListener('change', (e) => {
  filterCategory = e.target.value;
  renderTransactions();
});

sortFilter.addEventListener('change', (e) => {
  sortBy = e.target.value;
  renderTransactions();
});

clearFiltersBtn.addEventListener('click', () => {
  searchTerm = '';
  searchInput.value = '';
  filterType = 'all';
  filterCategory = 'all';
  categoryFilter.value = 'all';
  sortBy = 'date-desc';
  sortFilter.value = 'date-desc';

  typeButtons.forEach((b, idx) => {
    if (idx === 0) b.classList.add('active');
    else b.classList.remove('active');
  });

  renderTransactions();
  showToast('Filters reset', 'info');
});

// Currency Selector
currencySelector.addEventListener('change', (e) => {
  currentCurrency = e.target.value;
  formCurrencyLabel.textContent = currentCurrency;
  saveTransactions();
  updateMetrics();
  renderTransactions();
  showToast(`Currency set to ${currentCurrency}`, 'info');
});

// CSV Export (Zero internet needed)
exportCsvBtn.addEventListener('click', () => {
  if (transactions.length === 0) {
    showToast('No records available to export.', 'info');
    return;
  }

  const headers = ['Date', 'Title', 'Category', 'Type', 'Amount'];
  const rows = transactions.map(t => [
    `"${t.date}"`,
    `"${t.title.replace(/"/g, '""')}"`,
    `"${t.category}"`,
    `"${t.type}"`,
    t.amount
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Apex_Spend_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Transactions exported as CSV!', 'success');
});

// ==========================================
// 8. APP BOOTSTRAP
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  loadTransactions();

  // Pre-seed demo records on initial launch
  if (transactions.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    transactions = [
      {
        id: 'tx_seed_1',
        title: 'Monthly Allowance / Salary',
        amount: 25000.00,
        category: 'Salary / Allowance',
        date: today,
        type: 'income'
      },
      {
        id: 'tx_seed_2',
        title: 'Semester Study Material & Books',
        amount: 3200.00,
        category: 'College & Studies',
        date: today,
        type: 'expense'
      },
      {
        id: 'tx_seed_3',
        title: 'Mess & Food Expenses',
        amount: 1850.50,
        category: 'Food & Dining',
        date: today,
        type: 'expense'
      }
    ];
    saveTransactions();
  }

  updateMetrics();
  renderTransactions();
});
