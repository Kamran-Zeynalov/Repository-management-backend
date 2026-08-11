const STORAGE_KEYS = {
  customers: 'lesa_customers_v4',
  invoices: 'lesa_invoices_v4',
  extraCategories: 'lesa_extra_categories_v4',
  serviceCategories: 'lesa_service_categories_v4',
  standardProducts: 'lesa_standard_products_v1',
  poleCategories: 'lesa_pole_categories_v1',
  inventory: 'lesa_inventory_v1'
};

// Aktiv filial — bütün biznes datası filiala görə ayrılır (açar + __filialId)
function getActiveBranch() {
  try { return sessionStorage.getItem('kapital_branch') || 'merdekan'; } catch (e) { return 'merdekan'; }
}
function branchKey(key) { return key + '__' + getActiveBranch(); }

function getStorageData(key, fallback) {
  try {
    const raw = sessionStorage.getItem(branchKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error('Storage read error', key, error);
    return fallback;
  }
}

function setStorageData(key, value) {
  sessionStorage.setItem(branchKey(key), JSON.stringify(value));
}

const LEGACY_KEYS = {
  customers: 'lesa_customers_v2',
  invoices: 'lesa_invoices_v2',
  extraCategories: 'lesa_extra_categories_v2',
  serviceCategories: 'lesa_service_categories_v2',
  standardProducts: 'lesa_standard_products_v1',
  poleCategories: 'lesa_pole_categories_v1',
  inventory: 'lesa_inventory_v1'
};

function getAnyStorageData(primaryKey, legacyKey, fallback) {
  const primary = getStorageData(primaryKey, null);
  if (primary !== null) return primary;
  const legacy = getStorageData(legacyKey, null);
  return legacy !== null ? legacy : fallback;
}


function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} AZN`;
}

function formatDate(dateString) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString || '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function normalizePhone(value) {
  return (value || '').replace(/[^\d+ ]/g, '').trim();
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizePaymentHistory(invoice) {
  const list = Array.isArray(invoice?.paymentHistory) ? cloneData(invoice.paymentHistory) : [];
  if (!list.length && Number(invoice?.paidAmount || 0) > 0) {
    list.push({
      id: `pay-legacy-${invoice.id || Date.now()}`,
      date: invoice.updatedAt || invoice.createdAt || invoice.invoiceDate || new Date().toISOString(),
      amount: Number(invoice.paidAmount || 0),
      note: 'İlkin ödəniş',
      direction: 'in'
    });
  }
  return list.map(entry => ({
    id: entry.id || `pay-${Date.now()}-${Math.random()}`,
    date: entry.date || new Date().toISOString(),
    amount: Number(entry.amount || 0),
    note: entry.note || '',
    direction: entry.direction === 'out' ? 'out' : 'in'
  }));
}

function getInvoicePaidAmountFromHistory(invoice) {
  return Number(normalizePaymentHistory(invoice).reduce((sum, entry) => sum + (entry.direction === 'out' ? -Number(entry.amount || 0) : Number(entry.amount || 0)), 0).toFixed(2));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInvoiceEffectiveDate(invoice) {
  return invoice.invoiceDate || (invoice.createdAt ? new Date(invoice.createdAt).toISOString().slice(0, 10) : '');
}

function getCustomerInvoices(customer) {
  return invoices
    .filter(invoice => String(invoice.customerId) === String(customer.id) || (((invoice.customer || '').trim().toLowerCase() === (customer.name || '').trim().toLowerCase()) && ((invoice.phone || '').trim() === (customer.phone || '').trim())))
    .sort((a, b) => new Date(getInvoiceEffectiveDate(a) || 0) - new Date(getInvoiceEffectiveDate(b) || 0));
}

function allocatePaymentAcrossInvoices(customer, amount, { date, note, fromDeposit = false } = {}) {
  let remaining = Number(amount || 0);
  const applied = [];
  const allocationDate = date || new Date().toISOString();
  getCustomerInvoices(customer)
    .filter(invoice => Number(invoice.remainingDebt || 0) > 0)
    .forEach(invoice => {
      if (remaining <= 0) return;
      const debt = Number(invoice.remainingDebt || 0);
      const used = Number(Math.min(debt, remaining).toFixed(2));
      if (used <= 0) return;
  invoice.paymentHistory = normalizePaymentHistory(invoice);
      invoice.paymentHistory.unshift({
        id: `pay-${Date.now()}-${Math.random()}`,
        date: allocationDate,
        amount: used,
        note: note || (fromDeposit ? 'Depozitdən borca köçürüldü' : 'Müştəri ödənişi'),
        direction: 'in'
      });
      invoice.paidAmount = getInvoicePaidAmountFromHistory(invoice);
      recalcInvoiceTotals(invoice);
      invoice.updatedAt = allocationDate;
      applied.push({ invoiceId: invoice.id, invoiceNo: invoice.invoiceNo || '-', amount: used });
      remaining = Number((remaining - used).toFixed(2));
    });

  if (applied.length) {
    applied.forEach(item => {
      const invoice = invoices.find(x => String(x.id) === String(item.invoiceId));
      if (invoice) syncInvoiceCustomerHistory(invoice);
    });
    setStorageData(STORAGE_KEYS.invoices, invoices);
  }

  return {
    usedAmount: Number((Number(amount || 0) - remaining).toFixed(2)),
    remainingAmount: Number(remaining.toFixed(2)),
    applied
  };
}


function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsvValue(value) {
  const safe = String(value ?? '').replace(/"/g, '""');
  return `"${safe}"`;
}

function printSimpleTable(title, headers, rows) {
  const htmlRows = rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html lang="az"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111827}h1{font-size:22px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px 10px;font-size:13px;text-align:left}th{background:#f8fafc} .muted{color:#64748b;font-size:12px;margin-bottom:16px}</style></head><body><h1>${escapeHtml(title)}</h1><div class="muted">Tarix: ${escapeHtml(formatDate(new Date().toISOString()))}</div><table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${htmlRows || `<tr><td colspan="${headers.length}">Məlumat yoxdur</td></tr>`}</tbody></table></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 200);
}

function isDateInSelectedRange(dateString, rangeKey = 'all') {
  if (!dateString || rangeKey === 'all') return true;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (rangeKey === 'today') {
    return date.toDateString() === now.toDateString();
  }
  if (rangeKey === 'month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  return true;
}

function getFilteredDebtInvoices() {
  const q = currentDebtCustomerFilter.trim().toLowerCase();
  const minAmount = Number(currentDebtMinAmount || 0);
  return getOpenDebtInvoices().filter(invoice => {
    const status = getInvoiceStatus(invoice);
    const customerName = String(invoice.customer || getCustomerByInvoice(invoice)?.name || '').toLowerCase();
    const debtText = [customerName, invoice.invoiceNo || '', invoice.phone || '', invoice.address || '', status].join(' ').toLowerCase();
    const matchesText = !q || debtText.includes(q);
    const matchesType = currentDebtTypeFilter === 'all' || (currentDebtTypeFilter === 'overdue' && status === 'Gecikir') || (currentDebtTypeFilter === 'normal' && status !== 'Gecikir');
    const matchesAmount = Number(invoice.remainingDebt || 0) >= minAmount;
    return matchesText && matchesType && matchesAmount;
  });
}

function getFilteredDepositRows() {
  const q = currentDepositCustomerFilter.trim().toLowerCase();
  return [...customers]
    .map(customer => {
      const ledger = getCustomerLedger(customer);
      const customerInvoices = getCustomerInvoices(customer);
      const history = (customer.history || []).filter(entry => Number(entry.depositChange || 0) !== 0 && isDateInSelectedRange(entry.date, currentDepositRangeFilter));
      const added = history.filter(entry => Number(entry.depositChange || 0) > 0).reduce((sum, entry) => sum + Number(entry.depositChange || 0), 0);
      const removed = Math.abs(history.filter(entry => Number(entry.depositChange || 0) < 0).reduce((sum, entry) => sum + Number(entry.depositChange || 0), 0));
      return {
        customer,
        deposit: Number(ledger.deposit || 0),
        debt: Number(ledger.debt || 0),
        activeInvoices: customerInvoices.filter(invoice => !invoice.isClosed).length,
        net: Number((Number(ledger.deposit || 0) - Number(ledger.debt || 0)).toFixed(2)),
        rangeAdded: Number(added.toFixed(2)),
        rangeRemoved: Number(removed.toFixed(2)),
        rangeActivityCount: history.length
      };
    })
    .filter(row => {
      const text = [row.customer.name || '', row.customer.phone || '', row.customer.extraPhone || '', row.customer.address || ''].join(' ').toLowerCase();
      return (row.deposit > 0 || row.debt > 0 || row.rangeActivityCount > 0)
        && (!q || text.includes(q))
       ;
    });
}

function exportDebtsCsv() {
  const rows = getFilteredDebtInvoices();
  const lines = [['Müştəri','Qaimə','Tarix','Qaytarma','Status','Gecikmə (gün)','Borc']];
  rows.forEach(invoice => {
    const status = getInvoiceStatus(invoice);
    const delayDays = status === 'Gecikir' ? Math.max(Math.round((new Date() - new Date(invoice.returnDate)) / 86400000), 0) : 0;
    lines.push([invoice.customer || '-', invoice.invoiceNo || '-', formatDate(getInvoiceEffectiveDate(invoice)), formatDate(invoice.returnDate), status, String(delayDays), String(Number(invoice.remainingDebt || 0).toFixed(2))]);
  });
  downloadTextFile(`borclar-${new Date().toISOString().slice(0,10)}.csv`, lines.map(row => row.map(toCsvValue).join(',')).join('\n'), 'text/csv;charset=utf-8');
}

function exportDepositsCsv() {
  const rows = getFilteredDepositRows();
  const lines = [['Müştəri','Telefon','Depozit','Aktiv borc','Xalis balans','Bu filtrdə depozit əlavə','Bu filtrdə depozit çıxılıb','Aktiv qaimə']];
  rows.forEach(row => {
    lines.push([row.customer.name || '-', row.customer.phone || '-', String(row.deposit.toFixed(2)), String(row.debt.toFixed(2)), String(row.net.toFixed(2)), String(row.rangeAdded.toFixed(2)), String(row.rangeRemoved.toFixed(2)), String(row.activeInvoices)]);
  });
  downloadTextFile(`depozitler-${new Date().toISOString().slice(0,10)}.csv`, lines.map(row => row.map(toCsvValue).join(',')).join('\n'), 'text/csv;charset=utf-8');
}

function printDebtsList() {
  const rows = getFilteredDebtInvoices().map(invoice => {
    const status = getInvoiceStatus(invoice);
    const delayDays = status === 'Gecikir' ? Math.max(Math.round((new Date() - new Date(invoice.returnDate)) / 86400000), 0) : 0;
    return [invoice.customer || '-', invoice.invoiceNo || '-', formatDate(invoice.returnDate), delayDays ? `${delayDays} gün` : 'vaxtında', formatMoney(invoice.remainingDebt)];
  });
  printSimpleTable('Borclar siyahısı', ['Müştəri','Qaimə','Qaytarma','Gecikmə','Borc'], rows);
}

function printDepositsList() {
  const rows = getFilteredDepositRows().map(row => [row.customer.name || '-', row.customer.phone || '-', formatMoney(row.deposit), formatMoney(row.debt), formatMoney(row.net), `${row.rangeActivityCount}`]);
  printSimpleTable('Depozitlər siyahısı', ['Müştəri','Telefon','Depozit','Aktiv borc','Xalis balans','Əməliyyat sayı'], rows);
}

function exportBackupData() {
  const payload = {
    app: 'Lesa Rent',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { customers, invoices, extraCategories, serviceCategories, poleCategories }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lesa-rent-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let invoices = getStorageData(STORAGE_KEYS.invoices, []);
let customers = getStorageData(STORAGE_KEYS.customers, []);
let extraCategories = getStorageData(STORAGE_KEYS.extraCategories, []);
let serviceCategories = getStorageData(STORAGE_KEYS.serviceCategories, []);
let poleCategories = getStorageData(STORAGE_KEYS.poleCategories, []);
let inventoryStock = getStorageData(STORAGE_KEYS.inventory, {});
let currentFilter = '';
let currentInvoiceSearchFilter = '';
let currentCustomerSearchFilter = '';
let currentInventorySearchFilter = '';
let currentStatusFilter = 'all';
let currentFromDate = '';
let currentToDate = '';
let currentDebtCustomerFilter = '';
let currentDebtTypeFilter = 'all';
let currentDebtMinAmount = '';
let currentDepositCustomerFilter = '';
let currentDepositRangeFilter = 'all';
let editingCustomerId = null;
let editingCatalogType = 'extra';
let editingCatalogId = null;
let activeReturnInvoiceId = null;
let activeCustomerTransaction = null;
let activeExtensionInvoiceId = null;
let activeInvoicePaymentId = null;
let activeEditingHistory = null;

const statsGrid = document.getElementById('statsGrid');
const dashboardTable = document.getElementById('dashboardTable');
const invoiceTable = document.getElementById('invoiceTable');
const customersList = document.getElementById('customersList');
const productsTable = document.getElementById('productsTable');
const extraCategoryList = document.getElementById('extraCategoryList');
const serviceCategoryList = document.getElementById('serviceCategoryList');
const poleCategoryList = document.getElementById('poleCategoryList');
const reportsBox = document.getElementById('reportsBox');
const inventorySearchInput = document.getElementById('inventorySearchInput');
const addInventoryItemBtn = document.getElementById('addInventoryItemBtn');
const inventorySummaryGrid = document.getElementById('inventorySummaryGrid');
const inventoryTableBody = document.getElementById('inventoryTableBody');
const alertsBox = document.getElementById('alertsBox');
const searchInput = document.getElementById('searchInput');
const invoiceSearchInput = document.getElementById('invoiceSearchInput');
const customerSearchMainInput = document.getElementById('customerSearchMainInput');
const showAllBtn = document.getElementById('showAllBtn');
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const logoutBtn = document.getElementById('logoutBtn');
const addCustomerQuickBtn = document.getElementById('addCustomerQuickBtn');
const addExtraCategoryBtn = document.getElementById('addExtraCategoryBtn');
const addServiceCategoryBtn = document.getElementById('addServiceCategoryBtn');
const addPoleCategoryBtn = document.getElementById('addPoleCategoryBtn');
const statusFilterSelect = document.getElementById('statusFilterSelect');
const fromDateFilterInput = document.getElementById('fromDateFilterInput');
const toDateFilterInput = document.getElementById('toDateFilterInput');
const clearInvoiceFiltersBtn = document.getElementById('clearInvoiceFiltersBtn');
const exportBackupBtn = document.getElementById('exportBackupBtn');
const importBackupBtn = document.getElementById('importBackupBtn');
const importBackupInput = document.getElementById('importBackupInput');
const debtCustomerFilterInput = document.getElementById('debtCustomerFilterInput');
const debtTypeFilterSelect = document.getElementById('debtTypeFilterSelect');
const debtMinAmountInput = document.getElementById('debtMinAmountInput');
const clearDebtFiltersBtn = document.getElementById('clearDebtFiltersBtn');
const exportDebtCsvBtn = document.getElementById('exportDebtCsvBtn');
const printDebtListBtn = document.getElementById('printDebtListBtn');
const depositCustomerFilterInput = document.getElementById('depositCustomerFilterInput');
const depositRangeFilterSelect = document.getElementById('depositRangeFilterSelect');
const clearDepositFiltersBtn = document.getElementById('clearDepositFiltersBtn');
const exportDepositCsvBtn = document.getElementById('exportDepositCsvBtn');
const printDepositListBtn = document.getElementById('printDepositListBtn');

const customerModal = document.getElementById('customerModal');
const customerModalTitle = document.getElementById('customerModalTitle');
const customerNameInput = document.getElementById('customerNameInput');
const customerPhoneInput = document.getElementById('customerPhoneInput');
const customerExtraPhoneInput = document.getElementById('customerExtraPhoneInput');
const customerAddressInput = document.getElementById('customerAddressInput');
const saveCustomerModalBtn = document.getElementById('saveCustomerModalBtn');

const catalogModal = document.getElementById('catalogModal');
const catalogModalTitle = document.getElementById('catalogModalTitle');
const catalogNameInput = document.getElementById('catalogNameInput');
const catalogPriceInput = document.getElementById('catalogPriceInput');
const catalogUnitInput = document.getElementById('catalogUnitInput');
const catalogNoteInput = document.getElementById('catalogNoteInput');
const saveCatalogModalBtn = document.getElementById('saveCatalogModalBtn');

const poleCategoryModal = document.getElementById('poleCategoryModal');
const poleCategoryModalTitle = document.getElementById('poleCategoryModalTitle');
const poleCategoryNameInput = document.getElementById('poleCategoryNameInput');
const poleCategoryPriceInput = document.getElementById('poleCategoryPriceInput');
const poleCategoryUnitInput = document.getElementById('poleCategoryUnitInput');
const poleCategoryNoteInput = document.getElementById('poleCategoryNoteInput');
const savePoleCategoryBtn = document.getElementById('savePoleCategoryBtn');
let editingPoleCategoryId = null;

const standardProductModal = document.getElementById('standardProductModal');
const standardProductModalTitle = document.getElementById('standardProductModalTitle');
const standardProductNameInput = document.getElementById('standardProductNameInput');
const standardProductPriceInput = document.getElementById('standardProductPriceInput');
const standardProductUnitInput = document.getElementById('standardProductUnitInput');
const standardProductInfoInput = document.getElementById('standardProductInfoInput');
const standardProductNoteInput = document.getElementById('standardProductNoteInput');
const saveStandardProductBtn = document.getElementById('saveStandardProductBtn');
let editingStandardProductId = null;

const inventoryItemModal = document.getElementById('inventoryItemModal');
const inventoryItemModalTitle = document.getElementById('inventoryItemModalTitle');
const inventoryCategorySelect = document.getElementById('inventoryCategorySelect');
const inventoryCustomNameGroup = document.getElementById('inventoryCustomNameGroup');
const inventoryCustomNameInput = document.getElementById('inventoryCustomNameInput');
const inventorySizeGroup = document.getElementById('inventorySizeGroup');
const inventorySizeInput = document.getElementById('inventorySizeInput');
const inventorySizeList = document.getElementById('inventorySizeList');
const inventoryCountInput = document.getElementById('inventoryCountInput');
const inventoryNoteInput = document.getElementById('inventoryNoteInput');
const saveInventoryItemBtn = document.getElementById('saveInventoryItemBtn');
let editingInventoryName = null;

const returnModal = document.getElementById('returnModal');
const returnModalTitle = document.getElementById('returnModalTitle');
const returnItemsBox = document.getElementById('returnItemsBox');
const saveReturnBtn = document.getElementById('saveReturnBtn');
const customerTransactionModal = document.getElementById('customerTransactionModal');
const customerTransactionModalTitle = document.getElementById('customerTransactionModalTitle');
const customerTransactionDateInput = document.getElementById('customerTransactionDateInput');
const customerTransactionAmountInput = document.getElementById('customerTransactionAmountInput');
const customerTransactionNoteInput = document.getElementById('customerTransactionNoteInput');
const saveCustomerTransactionBtn = document.getElementById('saveCustomerTransactionBtn');

const invoicePaymentModal = document.getElementById('invoicePaymentModal');
const invoicePaymentModalTitle = document.getElementById('invoicePaymentModalTitle');
const invoicePaymentDateInput = document.getElementById('invoicePaymentDateInput');
const invoicePaymentAmountInput = document.getElementById('invoicePaymentAmountInput');
const invoicePaymentNoteInput = document.getElementById('invoicePaymentNoteInput');
const saveInvoicePaymentBtn = document.getElementById('saveInvoicePaymentBtn');
const invoiceViewModal = document.getElementById('invoiceViewModal');
const invoiceViewTitle = document.getElementById('invoiceViewTitle');
const invoiceViewBody = document.getElementById('invoiceViewBody');
const invoiceViewPrintBtn = document.getElementById('invoiceViewPrintBtn');
const invoiceViewEditBtn = document.getElementById('invoiceViewEditBtn');
const invoiceViewDeleteBtn = document.getElementById('invoiceViewDeleteBtn');
let activeViewInvoiceId = null;
const invoicePaymentHistoryBox = document.getElementById('invoicePaymentHistoryBox');
const invoicePaymentHistorySummary = document.getElementById('invoicePaymentHistorySummary');

const extensionModal = document.getElementById('extensionModal');
const extensionModalTitle = document.getElementById('extensionModalTitle');
const extensionTypeSelect = document.getElementById('extensionTypeSelect');
const extensionPreviewAmount = document.getElementById('extensionPreviewAmount');
const extensionDiscountInput = document.getElementById('extensionDiscountInput');
const extensionFinalAmount = document.getElementById('extensionFinalAmount');
const extensionPaidNowInput = document.getElementById('extensionPaidNowInput');
const extensionNoteInput = document.getElementById('extensionNoteInput');
const extensionQuoteBox = document.getElementById('extensionQuoteBox');
const saveExtensionBtn = document.getElementById('saveExtensionBtn');


function ensureCustomerShape(customer) {
  return {
    ...customer,
    history: Array.isArray(customer.history) ? customer.history : []
  };
}

function setCustomersAndPersist(list) {
  customers = list.map(ensureCustomerShape);
  setStorageData(STORAGE_KEYS.customers, customers);
}

function refreshCustomerStorageIfNeeded() {
  const normalized = customers.map(ensureCustomerShape);
  if (JSON.stringify(normalized) !== JSON.stringify(customers)) {
    customers = normalized;
    setStorageData(STORAGE_KEYS.customers, customers);
  } else {
    customers = normalized;
  }
}

function formatDateTime(dateString) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString || '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function toDateTimeLocalValue(date = new Date()) {
  const d = new Date(date);
  const pad = v => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getHistoryTypeClass(type) {
  const map = {
    'Mal götürüb': 'borrow',
    'Borc əlavə olunub': 'borrow',
    'Borc ödədi': 'payment',
    'Mal qaytarıb': 'return',
    'Depozit əlavə olunub': 'deposit',
    'Depozit çıxılıb': 'deposit-out',
    'Depozitlə borc ödədi': 'payment',
    'Qaimə bağlanıb': 'system'
  };
  return map[type] || 'system';
}

function amountClass(value) {
  if (Number(value || 0) > 0) return 'plus';
  if (Number(value || 0) < 0) return 'minus';
  return 'neutral';
}

function formatSignedMoney(value) {
  const n = Number(value || 0);
  const prefix = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${prefix}${Math.abs(n).toFixed(2)} AZN`;
}

function getCustomerLedger(customer) {
  const history = Array.isArray(customer.history) ? customer.history : [];
  return history.reduce((acc, entry) => {
    acc.debt += Number(entry.debtChange || 0);
    acc.deposit += Number(entry.depositChange || 0);
    return acc;
  }, { debt: 0, deposit: 0 });
}

function getCustomerByInvoice(invoice) {
  return customers.find(c => String(c.id) === String(invoice.customerId))
    || customers.find(c => (c.name || '').trim().toLowerCase() === (invoice.customer || '').trim().toLowerCase() && (c.phone || '').trim() === (invoice.phone || '').trim());
}

function buildInvoiceHistoryEntries(invoice) {
  const extensionTotal = (invoice.extensionHistory || []).reduce((sum, x) => sum + Number(x.addedAmount || 0), 0);
  const refundTotal = (invoice.returnHistory || []).reduce((sum, x) => sum + Number(x.refundAmount || 0), 0);
  const baseBorrowAmount = Math.max(Number(invoice.totalAmount || 0) - extensionTotal + refundTotal, 0);
  const entries = [];
  const createdDate = invoice.createdAt || invoice.invoiceDate || new Date().toISOString();

  if (baseBorrowAmount > 0) {
    entries.push({
      id: `hist-${invoice.id}-base`,
      date: createdDate,
      type: 'Mal götürüb',
      amount: Number(baseBorrowAmount.toFixed(2)),
      note: `${invoice.invoiceNo || '-'} üzrə qaimə yaradılıb`,
      debtChange: Number(baseBorrowAmount.toFixed(2)),
      depositChange: 0,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice'
    });
  }

  (invoice.extensionHistory || []).forEach((entry, index) => {
    const amt = Number(entry.addedAmount || 0);
    if (amt <= 0) return;
    entries.push({
      id: `hist-${invoice.id}-ext-${index}`,
      date: entry.date || new Date().toISOString(),
      type: 'Borc əlavə olunub',
      amount: amt,
      note: `${invoice.invoiceNo || '-'} üzrə ${entry.mode === 'half' ? '15 gün' : '1 ay'} uzadılıb${entry.note ? ' / ' + entry.note : ''}`,
      debtChange: amt,
      depositChange: 0,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice'
    });
  });


  (invoice.extensionHistory || []).forEach((entry, index) => {
    const paidNow = Number(entry.paidNow || 0);
    if (paidNow <= 0) return;
    entries.push({
      id: `hist-${invoice.id}-ext-paid-${index}`,
      date: entry.date || new Date().toISOString(),
      type: 'Borc ödədi',
      amount: paidNow,
      note: `${invoice.invoiceNo || '-'} üzrə uzatma zamanı ödəniş`,
      debtChange: -paidNow,
      depositChange: 0,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice'
    });
  });

  (invoice.returnHistory || []).forEach((entry, index) => {
    const amt = Number(entry.refundAmount || 0);
    if (amt <= 0) return;
    entries.push({
      id: `hist-${invoice.id}-ret-${index}`,
      date: entry.date || new Date().toISOString(),
      type: 'Mal qaytarıb',
      amount: amt,
      note: `${invoice.invoiceNo || '-'} üzrə qaytarma`,
      debtChange: -amt,
      depositChange: 0,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice'
    });
  });

  normalizePaymentHistory(invoice).forEach((entry, index) => {
    const amt = Number(entry.amount || 0);
    if (amt <= 0) return;
    const direction = entry.direction === 'out' ? 1 : -1;
    entries.push({
      id: `hist-${invoice.id}-paid-${index}`,
      date: entry.date || invoice.updatedAt || invoice.createdAt || new Date().toISOString(),
      type: direction < 0 ? 'Borc ödədi' : 'Ödəniş düzəlişi',
      amount: amt,
      note: entry.note || `${invoice.invoiceNo || '-'} üzrə ödəniş`,
      debtChange: Number((amt * direction).toFixed(2)),
      depositChange: 0,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice'
    });
  });

  const depositAmount = Number(invoice.depositAmount || 0);
  if (depositAmount > 0) {
    entries.push({
      id: `hist-${invoice.id}-deposit`,
      date: invoice.updatedAt || invoice.createdAt || new Date().toISOString(),
      type: 'Depozit əlavə olunub',
      amount: depositAmount,
      note: `${invoice.invoiceNo || '-'} üzrə depozit`,
      debtChange: 0,
      depositChange: depositAmount,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice'
    });
  }

  if (invoice.isClosed) {
    entries.push({
      id: `hist-${invoice.id}-closed`,
      date: invoice.updatedAt || new Date().toISOString(),
      type: 'Qaimə bağlanıb',
      amount: 0,
      note: `${invoice.invoiceNo || '-'} bağlanıb`,
      debtChange: 0,
      depositChange: 0,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice'
    });
  }

  return entries.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function syncInvoiceCustomerHistory(invoice) {
  customers = customers.map(customer => ensureCustomerShape({
    ...customer,
    history: (customer.history || []).filter(entry => !(entry.source === 'invoice' && String(entry.invoiceId) === String(invoice.id)))
  }));

  const customerIndex = customers.findIndex(c => String(c.id) === String(invoice.customerId)) >= 0
    ? customers.findIndex(c => String(c.id) === String(invoice.customerId))
    : customers.findIndex(c => (c.name || '').trim().toLowerCase() === (invoice.customer || '').trim().toLowerCase() && (c.phone || '').trim() === (invoice.phone || '').trim());

  if (customerIndex === -1) {
    setStorageData(STORAGE_KEYS.customers, customers);
    return;
  }

  customers[customerIndex].history = [...(customers[customerIndex].history || []), ...buildInvoiceHistoryEntries(invoice)];
  setStorageData(STORAGE_KEYS.customers, customers);
}

function refreshData() {
  /* sessionStorage/mock qaldırıldı — bütün data API-dən (render funksiyalarında) yüklənir. */
}

function getInvoiceStatus(invoice) {
  if (invoice.isClosed) return 'Bağlanıb';
  const today = new Date();
  const due = new Date(invoice.returnDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today ? 'Gecikir' : 'Aktiv';
}

function getBadgeClass(status) {
  if (status === 'Gecikir') return 'red';
  if (status === 'Aktiv') return 'green';
  return 'amber';
}

function getFilteredInvoices() {
  const q = currentFilter.trim().toLowerCase();
  return invoices.filter(invoice => {
    const status = getInvoiceStatus(invoice);
    const itemsText = (invoice.items || []).map(item => `${item.category} ${item.label || ''} ${item.size || ''} ${item.note || ''}`).join(' ').toLowerCase();
    const textMatched = !q || [invoice.invoiceNo, invoice.customer, invoice.phone, invoice.extraPhone, invoice.address, status, itemsText].join(' ').toLowerCase().includes(q);
    const statusMatched = currentStatusFilter === 'all' || status === currentStatusFilter;
    const invoiceDateValue = getInvoiceEffectiveDate(invoice);
    const fromMatched = !currentFromDate || (invoiceDateValue && invoiceDateValue >= currentFromDate);
    const toMatched = !currentToDate || (invoiceDateValue && invoiceDateValue <= currentToDate);
    return textMatched && statusMatched && fromMatched && toMatched;
  });
}

function getFilteredCustomers() {
  const q = currentFilter.trim().toLowerCase();
  const customerQ = (currentCustomerSearchFilter || '').trim().toLowerCase();
  const sortedCustomers = [...customers]
    .filter(customer => {
      const text = [customer.name || '', customer.phone || '', customer.extraPhone || '', customer.address || ''].join(' ').toLowerCase();
      return !customerQ || text.includes(customerQ);
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'az'));
  if (!q) return sortedCustomers;
  return sortedCustomers.filter(customer => {
    const ledger = getCustomerLedger(customer);
    const customerInvoices = getCustomerInvoices(customer);
    const historyText = (customer.history || []).map(entry => `${entry.type || ''} ${entry.note || ''} ${entry.invoiceNo || ''}`).join(' ');
    const invoiceText = customerInvoices.map(invoice => `${invoice.invoiceNo || ''} ${invoice.customer || ''} ${invoice.phone || ''}`).join(' ');
    return [
      customer.name,
      customer.phone,
      customer.extraPhone,
      customer.address,
      String(ledger.debt || ''),
      String(ledger.deposit || ''),
      historyText,
      invoiceText
    ].join(' ').toLowerCase().includes(q);
  });
}

function getFilteredProductRows(rows) {
  const q = currentFilter.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(row => [row.category, row.info, row.price].join(' ').toLowerCase().includes(q));
}

function isSameOrPast(dateString) {
  const today = new Date();
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return false;
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime();
}

// Vaxtı çatan/keçən BÜTÜN günlük mallar (təkərli lesa + günlük əlavə kateqoriyalar)
function getDueTekerliLesaItems() {
  const result = [];
  invoices.forEach(invoice => {
    if (invoice.isClosed) return;
    (invoice.items || []).forEach(item => {
      if (item.rentMode === 'daily' && item.dueDate && isSameOrPast(item.dueDate)) {
        result.push({
          invoiceId: invoice.id,
          invoiceNo: invoice.invoiceNo || '-',
          customer: invoice.customer || '-',
          phone: invoice.phone || '-',
          dueDate: item.dueDate,
          item: item.label || item.category || 'Günlük mal',
          note: item.note || '',
          subtotal: item.subtotal || 0
        });
      }
    });
  });
  return result;
}

/* ===== Modul 6: Dashboard — SQL Server (API) ===== */
async function renderAlerts() {
  if (!alertsBox) return;
  let notes;
  try { notes = await API.dashboard.notifications(); }
  catch (e) { return; }
  if (!notes.length) { alertsBox.innerHTML = ''; return; }
  alertsBox.innerHTML = `
    <div class="alert-card">
      <h3>⚠️ Bildirişlər</h3>
      <div class="alert-list">
        ${notes.map(n => `
          <div class="alert-item">
            <strong>${escapeHtml(n.message)}</strong>
            ${n.invoiceId ? `<div>Qaimə: <a class="inv-invoice-link" onclick="editInvoice('${n.invoiceId}')" title="Qaiməyə keçid">${escapeHtml(n.invoiceNo || '-')}</a></div>` : ''}
            ${n.customerName ? `<div>Müştəri: ${escapeHtml(n.customerName)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`;

  // Maksimum 4 bildiriş göstər — qalanı üçün yalnız panel daxili şaquli scroll
  const listEl = alertsBox.querySelector('.alert-list');
  if (listEl) {
    const items = listEl.querySelectorAll('.alert-item');
    if (items.length > 4) {
      const maxH = items[4].offsetTop - items[0].offsetTop;
      listEl.style.maxHeight = maxH + 'px';
      listEl.style.overflowY = 'auto';
      listEl.style.paddingRight = '6px';
    }
  }
}

async function renderStats() {
  if (!statsGrid) return;
  let s;
  try { s = await API.dashboard.stats(); }
  catch (e) { return; }
  const stats = [
    { title: 'Ümumi aktiv qaimə sayı', value: s.openInvoiceCount, note: 'Hazırda açıq qaimələr' },
    { title: 'Ümumi borc', value: formatMoney(s.totalDebt), note: 'Bağlanmamış ümumi borc' },
    { title: 'Ümumi depozit', value: formatMoney(s.totalDeposit), note: 'Saxlanılan depozit' },
    { title: 'Ümumi ödəniş', value: formatMoney(s.totalPaid), note: 'Cəmi ödənişlər' },
    { title: 'Müştəri sayı', value: s.customerCount, note: 'Filial üzrə' },
    { title: 'Vaxtı keçmiş qaimələr', value: s.overdueCount, note: 'Gecikən qaimələr' },
    { title: 'Bu gün / yaxın (≤3 gün)', value: `${s.dueTodayCount} / ${s.dueSoonCount}`, note: 'Qaytarma yaxınlaşır' },
    { title: 'Anbar mal növü', value: s.inventoryItemCount, note: 'Anbarda qeydli' }
  ];
  statsGrid.innerHTML = stats.map(stat => `<div class="stat-card"><div class="title">${stat.title}</div><div class="value">${stat.value}</div><div class="note">${stat.note}</div></div>`).join('');
}

async function renderDashboardTable() {
  if (!dashboardTable) return;
  let data;
  try { data = await API.dashboard.overdue(); }
  catch (e) { dashboardTable.innerHTML = '<tr><td colspan="6">Xəta: ' + escapeHtml(e.message || '') + '</td></tr>'; return; }
  if (!data.length) {
    dashboardTable.innerHTML = '<tr><td colspan="6">Gecikən qaimə yoxdur</td></tr>';
    return;
  }
  dashboardTable.innerHTML = data.map(o => `
    <tr>
      <td><strong>${escapeHtml(o.invoiceNo || '-')}</strong></td>
      <td><div>${escapeHtml(o.customerName || '-')}</div><div class="phone-mini">${escapeHtml(o.phone || '-')}</div></td>
      <td>${formatDate(o.returnDate)} <span class="badge red">${o.daysOverdue} gün</span></td>
      <td>${formatMoney(o.remainingDebt)}</td>
      <td><span class="badge red">Gecikir</span></td>
      <td>
        <div class="action-cell">
          <button class="action-btn edit" onclick="editInvoice('${o.invoiceId}')">Edit</button>
          <button class="action-btn print" onclick="printInvoice('${o.invoiceId}')">Çap et</button>
          <button class="action-btn close" onclick="extendInvoiceOneMonth('${o.invoiceId}')">Artır</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getInvoiceItemsHtml(invoice) {
  return (invoice.items || []).map(item => {
    const returned = Number(item.returnedQuantity || 0);
    const available = Math.max(Number(item.quantity || 1) - returned, 0);
    return `<div class="invoice-mini-item">${item.label || item.category}${item.size ? ` / ${item.size}` : ''}${item.note ? ` / ${item.note}` : ''}${returned ? ` / qaytarılıb: ${returned}` : ''}${item.isReturnable ? ` / qalıq: ${available}` : ''}</div>`;
  }).join('');
}

// Təcillilik: gecikmiş(0,qırmızı) → bu gün(1,yaşıl) → ≤3 gün(2,sarı) → qalan(3,boz)
function getInvoiceUrgency(invoice) {
  if (invoice.isClosed) return { rank: 4, cls: 'inv-row-gray' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.returnDate); due.setHours(0, 0, 0, 0);
  if (Number.isNaN(due.getTime())) return { rank: 3, cls: 'inv-row-gray' };
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return { rank: 0, cls: 'inv-row-red' };
  if (diff === 0) return { rank: 1, cls: 'inv-row-green' };
  if (diff <= 3) return { rank: 2, cls: 'inv-row-yellow' };
  return { rank: 3, cls: 'inv-row-gray' };
}

/* ===== Modul 4: Qaimələr — SQL Server (API) ===== */
async function renderInvoiceTable() {
  if (!invoiceTable) return;
  invoiceTable.innerHTML = '<tr><td colspan="11">Yüklənir…</td></tr>';
  let data;
  try {
    // Backend status="open" + axtarış; sıralama backend-də təcililik üzrədir
    data = await API.invoices.list(currentInvoiceSearchFilter || '', 'open');
  } catch (e) {
    invoiceTable.innerHTML = '<tr><td colspan="11">Xəta: ' + escapeHtml(e.message || '') + '</td></tr>';
    return;
  }
  invoices = data;   // qlobal (summary) — digər bölmələr üçün
  const list = data.slice().sort((a, b) => {
    const d = getInvoiceUrgency(a).rank - getInvoiceUrgency(b).rank;
    if (d !== 0) return d;
    return new Date(a.returnDate || 0) - new Date(b.returnDate || 0);
  });
  if (!list.length) {
    invoiceTable.innerHTML = '<tr><td colspan="11">Qaimə yoxdur</td></tr>';
    return;
  }
  invoiceTable.innerHTML = list.map(inv => `
    <tr class="${getInvoiceUrgency(inv).cls}">
      <td><strong>${escapeHtml(inv.invoiceNo || '-')}</strong><div class="phone-mini">ID: ${inv.id}</div></td>
      <td>${escapeHtml(inv.customerName || '-')}</td>
      <td>${escapeHtml(inv.phone || '-')}</td>
      <td>${formatDate(inv.returnDate)}</td>
      <td>${inv.itemCount || 0} mal</td>
      <td>${formatMoney(inv.totalAmount)}</td>
      <td>${formatMoney(inv.paidAmount)}</td>
      <td>${formatMoney(inv.depositAmount)}</td>
      <td>${formatMoney(inv.remainingDebt)}</td>
      <td><span class="badge ${getBadgeClass(getInvoiceStatus(inv))}">${getInvoiceStatus(inv)}</span></td>
      <td>
        <div class="action-cell">
          <button class="action-btn edit" onclick="editInvoice('${inv.id}')">Edit</button>
          <button class="action-btn pay" onclick="openInvoicePaymentModal('${inv.id}')">Ödəniş</button>
          <button class="action-btn return" onclick="openReturnModal('${inv.id}')">Qaytarma</button>
          <button class="action-btn close" onclick="extendInvoiceOneMonth('${inv.id}')">Artır</button>
          <button class="action-btn print" onclick="printInvoice('${inv.id}')">Çap et</button>
          <button class="action-btn delete" onclick="closeInvoice('${inv.id}')">Bağla</button>
        </div>
      </td>
    </tr>
  `).join('');
}


function getChargeableItemsForExtension(invoice, ratio = 1) {
  return (invoice.items || []).filter(item => {
    if (item.category === 'Xidmət' || item.category === 'Nəqliyyat') return false;
    if (item.isRecurring === false) return false;
    if (item.isFixedFee) return false;
    return true;
  }).map(item => {
    const base = Number(item.customPrice || 0) * Number(item.quantity || 0);
    return { ...item, extensionCharge: Number((base * ratio).toFixed(2)) };
  }).filter(item => item.extensionCharge > 0);
}

function getExtensionQuote(invoice, mode = 'month') {
  const ratio = mode === 'half' ? 0.5 : 1;
  const days = mode === 'half' ? 15 : 30;
  const monthsLabel = mode === 'half' ? '15 gün' : '1 ay';
  const items = getChargeableItemsForExtension(invoice, ratio);
  const total = items.reduce((sum, item) => sum + Number(item.extensionCharge || 0), 0);
  return { ratio, days, monthsLabel, items, total: Number(total.toFixed(2)) };
}

async function updateExtensionPreview() {
  if (!activeExtensionInvoiceId) return;
  const mode = extensionTypeSelect.value || 'month';
  let preview;
  try { preview = await API.extensions.preview(activeExtensionInvoiceId, 1, mode); }
  catch (e) { return; }
  const discount = Math.min(Math.max(Number(extensionDiscountInput?.value || 0), 0), Number(preview.suggestedAmount || 0));
  const finalAmount = Math.max(Number(preview.suggestedAmount || 0) - discount, 0);
  if (extensionPreviewAmount) extensionPreviewAmount.value = formatMoney(preview.suggestedAmount);
  if (extensionFinalAmount) extensionFinalAmount.value = formatMoney(finalAmount);
  if (extensionQuoteBox) {
    extensionQuoteBox.innerHTML = `
      <div class="extension-summary-grid">
        <div class="extension-summary-card"><span>Cari bitmə tarixi</span><strong>${formatDate(preview.currentReturnDate)}</strong></div>
        <div class="extension-summary-card"><span>Yeni bitmə tarixi</span><strong>${formatDate(preview.newReturnDate)}</strong></div>
        <div class="extension-summary-card"><span>Uzadılacaq müddət</span><strong>${mode === 'half' ? '15 gün' : '1 ay'}</strong></div>
        <div class="extension-summary-card"><span>Əlavə hesablanacaq məbləğ</span><strong>${formatMoney(preview.suggestedAmount)}</strong></div>
        <div class="extension-summary-card"><span>Endirimdən sonra</span><strong>${formatMoney(finalAmount)}</strong></div>
      </div>`;
  }
}

function toggleCustomerPanel(id, panel) {
  const box = document.getElementById(`${panel}-${id}`);
  if (!box) return;
  box.classList.toggle('hidden');
}

window.toggleCustomerDetail = function(id) { toggleCustomerPanel(id, 'detail'); };
window.toggleCustomerHistory = function(id) { toggleCustomerPanel(id, 'history'); };

function findInvoiceIndex(invoiceId) {
  return invoices.findIndex(item => String(item.id) === String(invoiceId));
}

function updateInvoiceAndSync(invoice) {
  const invoiceIndex = findInvoiceIndex(invoice.id);
  if (invoiceIndex === -1) return false;
  invoice.paymentHistory = normalizePaymentHistory(invoice);
  invoice.paidAmount = getInvoicePaidAmountFromHistory(invoice);
  recalcInvoiceTotals(invoice);
  invoice.updatedAt = new Date().toISOString();
  invoices[invoiceIndex] = invoice;
  syncInvoiceCustomerHistory(invoice);
  setStorageData(STORAGE_KEYS.invoices, invoices);
  return true;
}

function parseHistoryEntryIndex(entryId, token) {
  const match = String(entryId || '').match(new RegExp(`${token}-(\\d+)$`));
  return match ? Number(match[1]) : -1;
}

window.deleteCustomerHistoryEntry = function(customerId, entryId) {
  const customerIndex = customers.findIndex(item => String(item.id) === String(customerId));
  if (customerIndex === -1) return;
  const customer = ensureCustomerShape(customers[customerIndex]);
  const entry = (customer.history || []).find(item => String(item.id) === String(entryId));
  if (!entry) return;

  if (entry.source === 'manual') {
    if (!confirm('Bu əməliyyat silinsin?')) return;
    customer.history = (customer.history || []).filter(item => String(item.id) !== String(entryId));
    customers[customerIndex] = customer;
    setStorageData(STORAGE_KEYS.customers, customers);
    renderAll();
    return;
  }

  if (!entry.invoiceId) return;
  const invoiceIndex = findInvoiceIndex(entry.invoiceId);
  if (invoiceIndex === -1) return;
  const invoice = cloneData(invoices[invoiceIndex]);

  if (entry.type === 'Mal qaytarıb') {
    const idx = parseHistoryEntryIndex(entry.id, 'ret');
    if (idx < 0 || !Array.isArray(invoice.returnHistory) || !invoice.returnHistory[idx]) return;
    if (!confirm('Bu qaytarma əməliyyatı silinsin?')) return;
    invoice.returnHistory.splice(idx, 1);
    invoice.items = (invoice.items || []).map(item => {
      const baseItem = { ...item, returnedQuantity: 0, returnHistory: [] };
      if (baseItem.category === 'Təkərli lesa' && baseItem.rentMode === 'daily') {
        baseItem.subtotal = Number(((Number(baseItem.dayCount || 0) * Number(baseItem.dailyPrice || 0)) + (Number(baseItem.extraBoardCount || 0) * Number(baseItem.extraBoardPrice || 0))).toFixed(2));
      }
      return baseItem;
    });
    updateInvoiceAndSync(invoice);
    renderAll();
    return;
  }

  if (entry.type === 'Borc ödədi' || entry.type === 'Ödəniş düzəlişi') {
    const idx = parseHistoryEntryIndex(entry.id, 'paid');
    if (idx < 0) return;
    invoice.paymentHistory = normalizePaymentHistory(invoice);
    if (!invoice.paymentHistory[idx]) return;
    if (!confirm('Bu ödəniş əməliyyatı silinsin?')) return;
    invoice.paymentHistory.splice(idx, 1);
    updateInvoiceAndSync(invoice);
    renderAll();
    return;
  }

  if (entry.type === 'Depozit əlavə olunub') {
    if (!confirm('Bu qaimə üzrə depozit silinsin?')) return;
    invoice.depositAmount = 0;
    updateInvoiceAndSync(invoice);
    renderAll();
    return;
  }

  alert('Bu əməliyyatı silmək üçün qaiməni edit et.');
};

window.editCustomerHistoryEntry = function(customerId, entryId) {
  const customer = customers.find(item => String(item.id) === String(customerId));
  if (!customer) return;
  const entry = (customer.history || []).find(item => String(item.id) === String(entryId));
  if (!entry) return;
  if (entry.source === 'manual') {
    activeEditingHistory = { customerId, entryId };
    activeCustomerTransaction = null;
    customerTransactionModalTitle.textContent = `Əməliyyatı edit et — ${customer.name}`;
    customerTransactionDateInput.value = toDateTimeLocalValue(entry.date ? new Date(entry.date) : new Date());
    customerTransactionAmountInput.value = Number(entry.amount || 0);
    customerTransactionNoteInput.value = entry.note || '';
    openModal(customerTransactionModal);
    return;
  }
  if (entry.invoiceId) editInvoice(entry.invoiceId);
};

function getCustomerHistoryActions(item, entry) {
  const actions = [];
  if (entry.invoiceId) actions.push(`<button class="action-btn edit" onclick="editInvoice('${entry.invoiceId}')">Qaiməyə bax</button>`);
  if (entry.source === 'manual') {
    actions.push(`<button class="action-btn print" onclick="editCustomerHistoryEntry('${item.id}','${entry.id}')">Edit</button>`);
    actions.push(`<button class="action-btn delete" onclick="deleteCustomerHistoryEntry('${item.id}','${entry.id}')">Sil</button>`);
  } else if (entry.type === 'Borc ödədi' || entry.type === 'Ödəniş düzəlişi' || entry.type === 'Depozit əlavə olunub') {
    actions.push(`<button class="action-btn delete" onclick="deleteCustomerHistoryEntry('${item.id}','${entry.id}')">Sil</button>`);
  }
  return actions.join('');
}


function buildInvoiceProcedureHistoryRows(customer) {
  const invoiceRows = getCustomerInvoices(customer).map(invoice => {
    const entries = buildInvoiceHistoryEntries(invoice);
    const createdEntry = entries.find(entry => entry.type === 'Mal götürüb') || entries[0];
    const totalDebtChange = entries.reduce((sum, entry) => sum + Number(entry.debtChange || 0), 0);
    const totalDepositChange = entries.reduce((sum, entry) => sum + Number(entry.depositChange || 0), 0);
    const noteParts = [];

    const baseBorrow = entries.find(entry => entry.type === 'Mal götürüb');
    if (baseBorrow) noteParts.push(`Mal götürüb: ${formatMoney(baseBorrow.amount)}`);

    const paidTotal = entries
      .filter(entry => entry.type === 'Borc ödədi')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    if (paidTotal > 0) noteParts.push(`Ödəniş: ${formatMoney(paidTotal)}`);

    const depositTotal = entries
      .filter(entry => entry.type === 'Depozit əlavə olunub')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    if (depositTotal > 0) noteParts.push(`Depozit: ${formatMoney(depositTotal)}`);

    const returnTotal = entries
      .filter(entry => entry.type === 'Mal qaytarıb')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    if (returnTotal > 0) noteParts.push(`Qaytarma: ${formatMoney(returnTotal)}`);

    const extensionTotal = entries
      .filter(entry => entry.type === 'Borc əlavə olunub')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    if (extensionTotal > 0) noteParts.push(`Artırma: ${formatMoney(extensionTotal)}`);

    if (invoice.isClosed) noteParts.push('Qaimə bağlanıb');

    return {
      id: `proc-${invoice.id}`,
      date: createdEntry?.date || invoice.createdAt || invoice.invoiceDate || new Date().toISOString(),
      type: 'Qaimə proseduru',
      amount: Number(invoice.totalAmount || 0),
      note: `${invoice.invoiceNo || '-'} — ${noteParts.join(' / ') || 'Qaimə əməliyyatı'}`,
      debtChange: Number(totalDebtChange.toFixed(2)),
      depositChange: Number(totalDepositChange.toFixed(2)),
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || '',
      source: 'invoice-procedure'
    };
  });

  const manualRows = (customer.history || [])
    .filter(entry => entry.source === 'manual')
    .map(entry => ({ ...entry, source: 'manual' }));

  return [...invoiceRows, ...manualRows].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

window.deleteInvoiceCompletely = async function(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!confirm(`${invoice ? (invoice.invoiceNo || 'Bu qaimə') : 'Bu qaimə'} tam silinsin?`)) return;
  try { await API.invoices.remove(invoiceId); }
  catch (e) { return alert(e.message || 'Qaimə silinmədi.'); }
  renderAll();
};

function getCustomerProcedureActions(item, entry) {
  if (entry.source === 'manual') {
    return `
      <div class="action-cell">
        <button class="action-btn print" onclick="editCustomerHistoryEntry('${item.id}','${entry.id}')">Edit</button>
        <button class="action-btn delete" onclick="deleteCustomerHistoryEntry('${item.id}','${entry.id}')">Sil</button>
      </div>
    `;
  }

  if (entry.source === 'invoice-procedure') {
    return `
      <div class="action-cell">
        <button class="action-btn edit" onclick="editInvoice('${entry.invoiceId}')">Qaiməyə bax</button>
        <button class="action-btn print" onclick="editInvoice('${entry.invoiceId}')">Edit</button>
        <button class="action-btn delete" onclick="deleteInvoiceCompletely('${entry.invoiceId}')">Sil</button>
      </div>
    `;
  }

  return '-';
}


function renderCustomers() {
  const filteredCustomers = getFilteredCustomers();
  if (!filteredCustomers.length) {
    customersList.innerHTML = '<div class="simple-item">Müştəri tapılmadı</div>';
    return;
  }
  customersList.className = 'simple-list customer-list-clean';
  customersList.innerHTML = filteredCustomers.map(item => {
    const ledger = getCustomerLedger(item);
    const history = buildInvoiceProcedureHistoryRows(item);
    const customerInvoices = getCustomerInvoices(item);
    const activeInvoiceCount = customerInvoices.filter(invoice => !invoice.isClosed).length;
    const totalPaid = customerInvoices.reduce((sum, invoice) => {
      const paid = buildInvoiceHistoryEntries(invoice)
        .filter(entry => entry.type === 'Borc ödədi')
        .reduce((acc, entry) => acc + Number(entry.amount || 0), 0);
      return sum + paid;
    }, 0) + (item.history || [])
      .filter(entry => entry.source === 'manual' && entry.type === 'Borc ödədi')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    return `
      <div class="customer-row-card">
        <div class="customer-row-top">
          <div class="customer-main-info">
            <div class="customer-name-line">
              <h3>${item.name}</h3>
              <div class="customer-mini-pills">
                <span class="customer-mini-pill debt">Borc: ${formatMoney(ledger.debt)}</span>
                <span class="customer-mini-pill deposit">Depozit: ${formatMoney(ledger.deposit)}</span>
                <span class="customer-mini-pill paid">Ödəniş: ${formatMoney(totalPaid)}</span>
              </div>
            </div>
            <div class="customer-mini-meta">
              <span>Qaimə sayı: ${customerInvoices.length}</span>
              <span>Aktiv: ${activeInvoiceCount}</span>
            </div>
          </div>
          <div class="customer-row-actions">
            <button class="action-btn edit" onclick="toggleCustomerDetail('${item.id}')">Ətraflı</button>
            <button class="action-btn return" onclick="toggleCustomerHistory('${item.id}')">Tarixçə</button>
            <button class="action-btn close" onclick="openCustomerTransactionModal('${item.id}','debt-add')">Borc əlavə et</button>
            <button class="action-btn print" onclick="openCustomerTransactionModal('${item.id}','payment')">Ödəniş et</button>
            <button class="action-btn deposit-pay" onclick="openCustomerTransactionModal('${item.id}','deposit-to-debt')">Depozitlə ödə</button>
            <button class="action-btn edit" onclick="openCustomerModal('${item.id}')">Edit</button>
            <button class="action-btn delete" onclick="deleteCustomer('${item.id}')">Sil</button>
          </div>
        </div>

        <div class="customer-expand-area hidden" id="detail-${item.id}">
          <div class="customer-detail-grid">
            <div class="customer-detail-card"><strong>Telefon</strong><div class="simple-item-sub">${item.phone || '-'}</div></div>
            <div class="customer-detail-card"><strong>Əlavə telefon</strong><div class="simple-item-sub">${item.extraPhone || '-'}</div></div>
            <div class="customer-detail-card"><strong>Ünvan</strong><div class="simple-item-sub">${item.address || '-'}</div></div>
            <div class="customer-detail-card"><strong>Aktiv borc</strong><div class="simple-item-sub">${formatMoney(ledger.debt)}</div></div>
            <div class="customer-detail-card"><strong>Qalan depozit</strong><div class="simple-item-sub">${formatMoney(ledger.deposit)}</div></div>
            <div class="customer-detail-card"><strong>Ümumi ödəniş</strong><div class="simple-item-sub">${formatMoney(totalPaid)}</div></div>
            <div class="customer-detail-card"><strong>Qaimə sayı</strong><div class="simple-item-sub">${customerInvoices.length} / Aktiv: ${activeInvoiceCount}</div></div>
          </div>
          ${(() => {
            const _active = customerInvoices.filter(inv => !inv.isClosed);
            const _closed = customerInvoices.filter(inv => inv.isClosed);
            const _line = inv => `<div class="cust-inv-line"><div><strong>${escapeHtml(inv.invoiceNo || '-')}</strong> <span class="badge ${getBadgeClass(getInvoiceStatus(inv))}">${getInvoiceStatus(inv)}</span></div><div class="simple-item-sub">İcarə: ${formatDate(inv.invoiceDate)} · Qaytarma: ${formatDate(inv.returnDate)}</div><div class="simple-item-sub">Ümumi: ${formatMoney(inv.totalAmount)} · Borc: ${formatMoney(inv.remainingDebt)}</div><button class="action-btn edit" onclick="editInvoice('${inv.id}')">Bax</button></div>`;
            return `<div class="customer-invoice-split">
              <div class="cust-inv-col"><h4>Aktiv qaimələr (${_active.length})</h4>${_active.length ? _active.map(_line).join('') : '<div class="simple-item-sub">Aktiv qaimə yoxdur</div>'}</div>
              <div class="cust-inv-col"><h4>Köhnə qaimələr (${_closed.length})</h4>${_closed.length ? _closed.map(_line).join('') : '<div class="simple-item-sub">Köhnə qaimə yoxdur</div>'}</div>
            </div>`;
          })()}
          <div class="customer-actions-grid">
            <button class="action-btn return" onclick="openCustomerTransactionModal('${item.id}','deposit-add')">Depozit əlavə et</button>
            <button class="action-btn edit" onclick="openCustomerTransactionModal('${item.id}','deposit-remove')">Depozit çıx</button>
            <button class="action-btn deposit-pay" onclick="openCustomerTransactionModal('${item.id}','deposit-to-debt')">Depozitlə borc ödə</button>
          </div>
        </div>

        <div class="customer-expand-area hidden" id="history-${item.id}">
          ${history.length ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tarix</th>
                    <th>Əməliyyat</th>
                    <th>Məbləğ</th>
                    <th>Qeyd</th>
                    <th>Borc dəyişimi</th>
                    <th>Depozit dəyişimi</th>
                    <th>Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.map(entry => `
                    <tr>
                      <td>${formatDateTime(entry.date)}</td>
                      <td><span class="history-type-badge ${entry.source === 'invoice-procedure' ? 'system' : getHistoryTypeClass(entry.type)}">${entry.source === 'invoice-procedure' ? 'Qaimə proseduru' : entry.type}</span></td>
                      <td>${formatMoney(entry.amount || 0)}</td>
                      <td>${entry.note || '-'}${entry.invoiceNo ? `<div class="history-note-muted">Qaimə: ${entry.invoiceNo}</div>` : ''}</td>
                      <td><span class="mono-amount ${amountClass(entry.debtChange)}">${formatSignedMoney(entry.debtChange)}</span></td>
                      <td><span class="mono-amount ${amountClass(entry.depositChange)}">${formatSignedMoney(entry.depositChange)}</span></td>
                      <td>${getCustomerProcedureActions(item, entry)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>` : '<div class="empty-history">Tarixçə yoxdur</div>'}
        </div>
      </div>
    `;
  }).join('');
}


const DEFAULT_STANDARD_PRODUCTS = [
  { id:'lesa', category:'Lesa', info:'Başlıq, uzun çubuq, balaca çubuq, taxta 5/15, əlavə taxta 5/15', price:5, unit:'başlıq', note:'' },
  { id:'lesa-60', category:'60-lıq Lesa', info:'Adi lesa kimi işləyir — ayrıca kateqoriya (aylıq)', price:5, unit:'başlıq', note:'' },
  { id:'demir-direk', category:'Dəmir dirək', info:'Kateqoriya və ölçü ilə: 3.85 / 1.70 / 5.50 və s. Pales sayı ayrıca yazılır', price:0, unit:'ədəd', note:'' },
  { id:'boy-dikt', category:'Boy dikt', info:'Ədəd ilə', price:6, unit:'ədəd', note:'' },
  { id:'bir-terefi-boy-dikt', category:'Bir tərəfli boy dikt', info:'1.52 sabit, m² ilə', price:3, unit:'m²', note:'' },
  { id:'ksok-dikt', category:'Kəsok dikt', info:'İki tərəf yazılır, m² ilə', price:3, unit:'m²', note:'' },
  { id:'taxta', category:'Taxta', info:'5/10 və 5/15, metr ilə', price:0.60, unit:'m', note:'' },
  { id:'tekerli-lesa', category:'Təkərli lesa', info:'Günlük', price:20, unit:'gün', note:'' },
  { id:'neqliyyat', category:'Nəqliyyat', info:'Gediş / Gəliş / İkisi bir yerdə', price:0, unit:'səfər', note:'Sərbəst qiymət' }
];
function getStandardProducts(){
  const saved = getStorageData(STORAGE_KEYS.standardProducts, null);
  if (!Array.isArray(saved) || !saved.length) return cloneData(DEFAULT_STANDARD_PRODUCTS);
  const merged = cloneData(DEFAULT_STANDARD_PRODUCTS).map(def => ({...def, ...(saved.find(x => x.id === def.id) || {})}));
  saved.forEach(item => { if (!merged.find(x => x.id === item.id)) merged.push(item); });
  return merged;
}
function setStandardProducts(list){ setStorageData(STORAGE_KEYS.standardProducts, list); }
function isStandardProductUsed(category){ return invoices.some(inv => (inv.items||[]).some(item => (item.category||'') === category)); }
/* ===== Modul 2: Kateqoriyalar — SQL Server (API) ===== */
// Standart mallar artıq backend Category (Kind=Standard) cədvəlindən gəlir.
let standardCatalog = [];   // son yüklənmiş raw DTO-lar
function catTypeFromRent(rentType){ return rentType === 'Daily' ? 'daily' : 'monthly'; }
function mapCatalogDto(d){ return { id: d.id, name: d.name || '', price: Number(d.price || 0), unit: d.unit || '', note: d.note || '', type: catTypeFromRent(d.rentType) }; }

window.editStandardProduct = function(id){
  const item = standardCatalog.find(x => String(x.id) === String(id));
  if (!item || !standardProductModal) return;
  editingStandardProductId = id;
  standardProductModalTitle.textContent = `${item.name} — edit`;
  standardProductNameInput.value = item.name || '';
  standardProductPriceInput.value = Number(item.price || 0);
  standardProductUnitInput.value = item.unit || '';
  standardProductInfoInput.value = item.info || '';
  standardProductNoteInput.value = item.note || '';
  openModal(standardProductModal);
};
async function saveStandardProductFromModal(){
  if (!editingStandardProductId) return;
  const item = standardCatalog.find(x => String(x.id) === String(editingStandardProductId));
  if (!item) return;
  const price = Number(standardProductPriceInput.value || 0);
  if (Number.isNaN(price) || price < 0) return alert('Qiyməti düzgün yaz.');
  const dto = {
    id: Number(item.id),
    kind: 'Standard',
    name: (standardProductNameInput.value || item.name || '').trim(),
    info: (standardProductInfoInput.value || '').trim(),
    price: price,
    unit: (standardProductUnitInput.value || '').trim(),
    note: (standardProductNoteInput.value || '').trim(),
    rentType: item.rentType || 'Monthly',
    parentId: item.parentId == null ? null : item.parentId
  };
  try { await API.categories.update(item.id, dto); }
  catch (e) { return alert(e.message || 'Yadda saxlanmadı.'); }
  closeModal(standardProductModal);
  editingStandardProductId = null;
  renderProducts();
}
async function renderProducts() {
  if (!productsTable) return;
  productsTable.innerHTML = '<tr><td colspan="4">Yüklənir…</td></tr>';
  let data;
  try { data = await API.categories.list('Standard'); }
  catch (e) { productsTable.innerHTML = '<tr><td colspan="4">Xəta: ' + escapeHtml(e.message || '') + '</td></tr>'; return; }
  standardCatalog = data;
  const rows = data.map(d => ({
    id: d.id,
    category: d.name,
    info: d.info || '',
    note: d.note || '',
    price: Number(d.price || 0),
    unit: d.unit || '',
    priceText: Number(d.price || 0) > 0 ? `${Number(d.price || 0).toFixed(2)} AZN${d.unit ? ' / ' + d.unit : ''}` : (d.note || 'Sərbəst')
  }));
  const filteredRows = getFilteredProductRows(rows);
  productsTable.innerHTML = filteredRows.length
    ? filteredRows.map(row => `<tr><td><strong>${escapeHtml(row.category)}</strong></td><td>${escapeHtml(row.info || '-')}${row.note ? `<div class="simple-item-sub">${escapeHtml(row.note)}</div>` : ''}</td><td>${escapeHtml(row.priceText)}</td><td><div class="action-cell"><button class="action-btn edit" onclick="editStandardProduct('${row.id}')">Edit</button></div></td></tr>`).join('')
    : '<tr><td colspan="4">Məlumat tapılmadı</td></tr>';
}

async function renderCatalogLists() {
  try {
    const [ex, sv, po] = await Promise.all([
      API.categories.list('Extra'),
      API.categories.list('Service'),
      API.categories.list('Pole')
    ]);
    extraCategories = ex.map(mapCatalogDto);
    serviceCategories = sv.map(mapCatalogDto);
    poleCategories = po.map(mapCatalogDto);
  } catch (e) {
    if (extraCategoryList) extraCategoryList.innerHTML = '<div class="simple-item">Xəta: ' + escapeHtml(e.message || '') + '</div>';
    return;
  }
  const renderList = (list, type) => {
    if (!list.length) return '<div class="simple-item">Məlumat yoxdur</div>';
    return list.map(item => `
      <div class="simple-item">
        <div class="simple-item-title">${item.name} <span class="badge ${item.type === 'daily' ? 'violet' : 'blue'}">${item.type === 'daily' ? 'Günlük' : 'Aylıq'}</span></div>
        <div class="simple-item-sub">Qiymət: ${formatMoney(item.price)}</div>
        <div class="simple-item-sub">Vahid: ${item.unit || '-'}</div>
        <div class="simple-item-sub">Qeyd: ${item.note || '-'}</div>
        <div class="action-cell" style="margin-top:10px;">
          <button class="action-btn edit" onclick="openCatalogModal('${type}','${item.id}')">Edit</button>
          <button class="action-btn delete" onclick="deleteCatalogItem('${type}','${item.id}')">Sil</button>
        </div>
      </div>
    `).join('');
  };

  extraCategoryList.innerHTML = renderList(extraCategories, 'extra');
  serviceCategoryList.innerHTML = renderList(serviceCategories, 'service');
  if (poleCategoryList) {
    if (!poleCategories.length) {
      poleCategoryList.innerHTML = '<div class="simple-item">Dəmir dirək ölçüsü yoxdur. + Ölçü əlavə et düyməsi ilə əlavə et.</div>';
    } else {
      poleCategoryList.innerHTML = poleCategories.map(item => `
        <div class="simple-item">
          <div class="simple-item-title">${escapeHtml(item.name || '-')}</div>
          <div class="simple-item-sub">Qiymət: ${formatMoney(item.price)}</div>
          <div class="simple-item-sub">Vahid: ${escapeHtml(item.unit || 'ədəd')}</div>
          <div class="simple-item-sub">Qeyd: ${escapeHtml(item.note || '-')}</div>
          <div class="action-cell" style="margin-top:10px;">
            <button class="action-btn edit" onclick="openPoleCategoryModal('${item.id}')">Edit</button>
            <button class="action-btn delete" onclick="deletePoleCategory('${item.id}')">Sil</button>
          </div>
        </div>
      `).join('');
    }
  }
}

function getPoleCategoryById(id){ return poleCategories.find(x => String(x.id) === String(id)); }
window.openPoleCategoryModal = function(itemId = null){
  editingPoleCategoryId = itemId;
  const item = getPoleCategoryById(itemId);
  if (poleCategoryModalTitle) poleCategoryModalTitle.textContent = item ? 'Dəmir dirək ölçüsünü edit et' : 'Dəmir dirək ölçüsü əlavə et';
  if (poleCategoryNameInput) poleCategoryNameInput.value = item?.name || '';
  if (poleCategoryPriceInput) poleCategoryPriceInput.value = item?.price ?? 0;
  if (poleCategoryUnitInput) poleCategoryUnitInput.value = item?.unit || 'ədəd';
  if (poleCategoryNoteInput) poleCategoryNoteInput.value = item?.note || '';
  const poleStockEl = document.getElementById('poleCategoryStockInput');
  if (poleStockEl) {
    const invName = item ? `Dəmir dirək ${item.name}` : '';
    poleStockEl.value = invName && inventoryStock && inventoryStock[invName] != null ? Number(inventoryStock[invName]) : 0;
  }
  openModal(poleCategoryModal);
};
async function savePoleCategoryFromModal(){
  const name = (poleCategoryNameInput?.value || '').trim();
  const price = Number(poleCategoryPriceInput?.value || 0);
  const unit = (poleCategoryUnitInput?.value || 'ədəd').trim() || 'ədəd';
  const note = (poleCategoryNoteInput?.value || '').trim();
  if (!name) return alert('Ölçünü yaz. Məs: 3.85, 1.70, 5.50');
  if (Number.isNaN(price) || price < 0) return alert('Qiyməti düzgün yaz.');
  const dto = { kind: 'Pole', name, price, unit, note, rentType: 'Monthly' };
  try {
    if (editingPoleCategoryId) await API.categories.update(editingPoleCategoryId, { id: Number(editingPoleCategoryId), ...dto });
    else await API.categories.create(dto);
  } catch (e) {
    return alert(e.message || 'Yadda saxlanmadı.');
  }
  closeModal(poleCategoryModal);
  editingPoleCategoryId = null;
  renderCatalogLists();
};
window.deletePoleCategory = async function(itemId){
  if (!confirm('Bu ölçü silinsin?')) return;
  try { await API.categories.remove(itemId); }
  catch (e) { return alert(e.message || 'Silinmədi.'); }
  renderCatalogLists();
};


function getInventoryDefaults(){ return {}; }
function getInventoryStock(){ return {...(inventoryStock||{})}; }
function saveInventoryStock(stock){ inventoryStock=stock; setStorageData(STORAGE_KEYS.inventory, inventoryStock); }
function getInventoryDefaults(){ return {}; }
function getInventoryStock(){ return {...(inventoryStock||{})}; }
function saveInventoryStock(stock){ inventoryStock=stock; setStorageData(STORAGE_KEYS.inventory, inventoryStock); }
function addInventoryUsage(map, name, qty, returned, invoice = null){
  const n=(name||'-').trim().replace(/\s+/g,' ');
  const totalQty = Number(qty||0);
  const returnedQty = Number(returned||0);
  const outQty = Math.max(totalQty - returnedQty, 0);
  if(!n || n==='-' || outQty<=0) return;
  if(!map[n]) map[n]={name:n,rented:0,holders:[]};
  map[n].rented += outQty;
  if(invoice){
    const existing = map[n].holders.find(h => String(h.invoiceId) === String(invoice.id) && h.customer === (invoice.customer || '-'));
    if(existing){
      existing.qty += outQty;
    } else {
      map[n].holders.push({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo || '-',
        customer: invoice.customer || '-',
        phone: invoice.phone || '',
        qty: outQty,
        returnDate: invoice.returnDate || ''
      });
    }
  }
}
function collectInventoryUsage(){
  const usage={};
  invoices.forEach(invoice=>{
    if(invoice.isClosed) return;
    (invoice.items||[]).forEach(item=>{
      if(item.components && Array.isArray(item.components)){
        item.components.forEach(comp=>{
          const compName = comp.name || comp.label || comp.key || '';
          const nm = item.category === 'Dəmir dirək' && (comp.key === 'direk' || /Dəmir dirək/i.test(compName))
            ? `Dəmir dirək ${item.size || item.poleType || compName.replace(/Dəmir dirək/i,'').trim()}`.trim()
            : compName;
          addInventoryUsage(usage,nm,comp.quantity||comp.qty||0,comp.returnedQuantity||0,invoice);
        });
        return;
      }
      if(item.category==='Lesa'){
        addInventoryUsage(usage,'Lesa başlıq',item.lesaHeadCount||0,item.returnedHeadCount||0,invoice);
        addInventoryUsage(usage,'Lesa uzun çubuq',item.lesaLongRodCount||0,item.returnedLongRodCount||0,invoice);
        addInventoryUsage(usage,'Lesa balaca çubuq',item.lesaShortRodCount||0,item.returnedShortRodCount||0,invoice);
        addInventoryUsage(usage,'Lesa taxta 5/15 3.00',item.lesaFreeTaxtaCount||0,item.returnedFreeTaxtaCount||0,invoice);
        addInventoryUsage(usage,'Lesa əlavə taxta 5/15 3.00',item.lesaExtraTaxtaCount||0,item.returnedExtraTaxtaCount||0,invoice);
        return;
      }
      if(item.category==='Təkərli lesa'){
        addInventoryUsage(usage,'Təkərli lesa başlıq',item.headCount||item.tekerliHeadCount||0,item.returnedHeadCount||0,invoice);
        addInventoryUsage(usage,'Təkərli lesa çubuq',item.rodCount||item.tekerliRodCount||0,item.returnedRodCount||0,invoice);
        addInventoryUsage(usage,'Təkərli lesa vilka',item.vilkaCount||0,item.returnedVilkaCount||0,invoice);
        addInventoryUsage(usage,'Təkərli lesa taxta',item.boardCount||0,item.returnedBoardCount||0,invoice);
        addInventoryUsage(usage,'Təkərli lesa əlavə taxta',item.extraBoardCount||0,item.returnedExtraBoardCount||0,invoice);
        return;
      }
      if(item.category==='Dəmir dirək'){
        addInventoryUsage(usage,`Dəmir dirək ${item.size||item.poleSize||item.poleType||''}`.trim(),item.quantity||0,item.returnedQuantity||0,invoice);
        if(Number(item.palesCount||0)>0) addInventoryUsage(usage,'Pales',item.palesCount||0,item.returnedPalesCount||0,invoice);
        return;
      }
      if(item.isReturnable!==false&&item.category&&item.category!=='Xidmət'&&item.category!=='Nəqliyyat'){
        // Taxta üçün növ/uzunluq (size) anbar adına daxil edilir: "Taxta 5/15 / 3.00 m"
        const baseName = item.label || item.category;
        const invName = (item.category === 'Taxta' && item.size) ? `${baseName} ${item.size}` : baseName;
        addInventoryUsage(usage,invName,item.quantity||0,item.returnedQuantity||0,invoice);
      }
    });
  });
  return usage;
}
/* ===== Modul 3: Anbar — SQL Server (API) ===== */
let inventoryCache = [];     // son yüklənmiş API sətirləri
let editingInventoryId = null;
function formatInventoryHolders(holders){
  if(!holders || !holders.length) return '<span class="inventory-empty-holder">Hazırda heç kimdə deyil</span>';
  return `<div class="inventory-holder-list">${holders.map(h=>`<div class="inventory-holder-item"><strong>${escapeHtml(h.customerName||'')}</strong> — ${Number(h.quantity||0)} ədəd <span class="history-note-muted"><a class="inv-invoice-link" onclick="editInvoice('${h.invoiceId}')" title="Qaiməyə keçid">${escapeHtml(h.invoiceNo||'-')}</a>${h.returnDate ? ' / qaytarma: ' + formatDate(h.returnDate) : ''}</span></div>`).join('')}</div>`;
}
window.toggleInventoryHolders = async function(id){
  const el = document.getElementById('inv-holders-' + id);
  if (!el) return;
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = '<span class="inventory-empty-holder">Yüklənir…</span>';
  let holders;
  try { holders = await API.inventory.holders(id); }
  catch (e) { el.innerHTML = '<span class="inventory-empty-holder">Xəta: ' + escapeHtml(e.message||'') + '</span>'; return; }
  el.innerHTML = formatInventoryHolders(holders);
};
async function renderInventorySection(){
  if(!inventoryTableBody||!inventorySummaryGrid) return;
  inventoryTableBody.innerHTML = '<tr><td colspan="6">Yüklənir…</td></tr>';
  let data;
  try { data = await API.inventory.list(); }
  catch (e) { inventoryTableBody.innerHTML = '<tr><td colspan="6">Xəta: ' + escapeHtml(e.message||'') + '</td></tr>'; return; }
  inventoryCache = data.map(d => ({ id:d.id, name:d.name, total:Number(d.totalCount||0), rented:Number(d.rentedOut||0), available:Number(d.freeCount||0) }));

  const q=(currentInventorySearchFilter||'').trim().toLowerCase();
  const rows = inventoryCache.filter(r => !q || (r.name||'').toLowerCase().includes(q));

  const totalStock=inventoryCache.reduce((s,r)=>s+r.total,0);
  const totalOut=inventoryCache.reduce((s,r)=>s+r.rented,0);
  const lowCount=inventoryCache.filter(r=>r.available<0).length;
  inventorySummaryGrid.innerHTML=`<div class="report-box"><h4>Ümumi anbar sayı</h4><p>${totalStock}</p></div><div class="report-box"><h4>İcarədə olan</h4><p>${totalOut}</p></div><div class="report-box"><h4>Qalıq problemi</h4><p>${lowCount}</p></div>`;
  if(!rows.length){ inventoryTableBody.innerHTML='<tr><td colspan="6">Anbarda mal yoxdur. + Anbara mal əlavə et düyməsi ilə əlavə et.</td></tr>'; return; }
  inventoryTableBody.innerHTML=rows.map(row=>`<tr><td><strong>${escapeHtml(row.name)}</strong></td><td>${row.total}</td><td>${row.rented}</td><td><span class="${row.available<0?'inventory-low':'inventory-positive'}">${row.available}</span></td><td>${row.rented>0 ? `<button class="action-btn edit" onclick="toggleInventoryHolders(${row.id})">Ətraflı</button><div class="inventory-holders-detail hidden" id="inv-holders-${row.id}"></div>` : '<span class="inventory-empty-holder">Hazırda heç kimdə deyil</span>'}</td><td><div class="action-cell"><button class="action-btn edit" onclick="openInventoryItemModal(${row.id})">Edit</button><button class="action-btn delete" onclick="deleteInventoryStock(${row.id})">Sil</button></div></td></tr>`).join('');
}
function getInventoryCategoryOptions(){
  const standard = getStandardProducts().map(x=>x.category).filter(Boolean);
  const lesaParts = ['Lesa başlıq','Lesa uzun çubuq','Lesa balaca çubuq','Lesa taxta 5/15 3.00','Lesa əlavə taxta 5/15 3.00'];
  const tekerliParts = ['Təkərli lesa başlıq','Təkərli lesa çubuq','Təkərli lesa vilka','Təkərli lesa taxta','Təkərli lesa əlavə taxta'];
  const extras = extraCategories.map(x=>x.name).filter(Boolean);
  return Array.from(new Set([...lesaParts, ...tekerliParts, 'Pales', ...standard, ...extras])).filter(name => name && name !== 'Xidmət' && name !== 'Nəqliyyat');
}
function updateInventorySizeUI(){
  const isDirek = inventoryCategorySelect && inventoryCategorySelect.value === 'Dəmir dirək';
  if(inventorySizeGroup) inventorySizeGroup.classList.toggle('hidden', !isDirek);
  if(isDirek && inventorySizeList){
    inventorySizeList.innerHTML = (poleCategories||[]).map(p=>`<option value="${escapeHtml(p.name)}"></option>`).join('');
  }
}
function fillInventoryCategorySelect(selected=''){
  if(!inventoryCategorySelect) return;
  const options = getInventoryCategoryOptions();
  inventoryCategorySelect.innerHTML = `${options.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}<option value="__custom__">Başqa mal / özüm yazım</option>`;
  inventoryCategorySelect.value = options.includes(selected) ? selected : (selected ? '__custom__' : (options[0] || '__custom__'));
  if(inventoryCustomNameGroup) inventoryCustomNameGroup.classList.toggle('hidden', inventoryCategorySelect.value !== '__custom__');
  if(selected && inventoryCategorySelect.value === '__custom__') inventoryCustomNameInput.value = selected;
  updateInventorySizeUI();
}
window.openInventoryItemModal = function(id=null){
  editingInventoryId = id;
  const item = (id != null) ? inventoryCache.find(x => String(x.id) === String(id)) : null;
  inventoryItemModalTitle.textContent = item ? 'Anbar malını edit et' : 'Anbara mal əlavə et';
  if(inventorySizeInput) inventorySizeInput.value = '';
  fillInventoryCategorySelect(item ? item.name : '');
  inventoryCountInput.value = item ? Number(item.total || 0) : '0';
  inventoryNoteInput.value = '';
  if(!item && inventoryCustomNameInput) inventoryCustomNameInput.value = '';
  openModal(inventoryItemModal);
};
window.addInventoryItem = function(){ window.openInventoryItemModal(null); };
async function saveInventoryItemFromModal(){
  const selected = inventoryCategorySelect.value;
  let name;
  if (selected === '__custom__') {
    name = (inventoryCustomNameInput.value || '').trim();
  } else if (selected === 'Dəmir dirək') {
    const size = (inventorySizeInput.value || '').trim();
    if (!size) return alert('Dəmir dirək ölçüsünü yaz (məs: 3.85).');
    name = ('Dəmir dirək ' + size).trim();
  } else {
    name = selected;
  }
  if(!name) return alert('Malın adını seç və ya yaz.');
  const count = Number(inventoryCountInput.value || 0);
  if(Number.isNaN(count) || count < 0) return alert('Sayı düzgün yaz.');
  try {
    if (editingInventoryId != null) await API.inventory.update(editingInventoryId, { id: Number(editingInventoryId), name, totalCount: count });
    else await API.inventory.create({ name, totalCount: count });
  } catch (e) {
    return alert(e.message || 'Yadda saxlanmadı.');
  }
  closeModal(inventoryItemModal);
  editingInventoryId = null;
  renderInventorySection();
}
window.deleteInventoryStock = async function(id){
  if(!confirm('Anbardan silinsin?')) return;
  try { await API.inventory.remove(id); }
  catch (e) { return alert(e.message || 'Silinmədi.'); }
  renderInventorySection();
};


/* ===== Modul 7: Hesabatlar — SQL Server (API) ===== */
async function renderReports() {
  if (!reportsBox) return;
  let inv, deb;
  try {
    [inv, deb] = await Promise.all([API.reports.invoices({}), API.reports.debtors().catch(() => ({ rows: [] }))]);
  } catch (e) { return; }
  const rows = deb.rows || [];
  const topDebtor = rows.slice().sort((a, b) => b.debt - a.debt)[0];
  const topDeposit = rows.slice().sort((a, b) => b.deposit - a.deposit)[0];
  reportsBox.innerHTML = `
    <div class="report-box"><h4>Ümumi qaimə sayı</h4><strong>${inv.count}</strong><small>Bütün qaimələr</small></div>
    <div class="report-box"><h4>Ümumi məbləğ</h4><strong>${formatMoney(inv.totalAmount)}</strong><small>Qaimələrin cəmi</small></div>
    <div class="report-box"><h4>Ödənilən məbləğ</h4><strong>${formatMoney(inv.totalPaid)}</strong><small>Ödənişlərin cəmi</small></div>
    <div class="report-box"><h4>Depozit məbləği</h4><strong>${formatMoney(inv.totalDeposit)}</strong><small>Saxlanılan depozitlər</small></div>
    <div class="report-box"><h4>Qalan borc</h4><strong>${formatMoney(inv.totalDebt)}</strong><small>Bağlanmamış ümumi borc</small></div>
    <div class="report-box"><h4>Ən çox borcu olan müştəri</h4><strong>${escapeHtml(topDebtor?.customerName || '-')}</strong><small>${topDebtor ? `Borc: ${formatMoney(topDebtor.debt)}` : 'Məlumat yoxdur'}</small></div>
    <div class="report-box"><h4>Ən çox depoziti olan müştəri</h4><strong>${escapeHtml(topDeposit?.customerName || '-')}</strong><small>${topDeposit && topDeposit.deposit > 0 ? `Depozit: ${formatMoney(topDeposit.deposit)}` : 'Məlumat yoxdur'}</small></div>
  `;
}

function switchSection(sectionId, clickedLink) {
  pageSections.forEach(section => section.classList.remove('active-section'));
  document.getElementById(sectionId).classList.add('active-section');
  navLinks.forEach(link => link.classList.remove('active'));
  clickedLink.classList.add('active');

  const titles = {
    dashboardSection: ['Dashboard', 'Əsas göstəricilər'],
    invoicesSection: ['Qaimələr', 'Bütün qaimələr'],
    customersSection: ['Müştərilər', 'Müştəri idarəetməsi'],
    debtsSection: ['Borclar', 'Açıq və gecikən borclar'],
    depositsSection: ['Depozitlər', 'Müştəri depozit balansları'],
    inventorySection: ['Anbar', 'Malların qalıq nəzarəti'],
    productsSection: ['Kateqoriyalar', 'Əlavə və xidmət kateqoriyaları'],
    reportsSection: ['Hesabatlar', 'Ümumi statistika'],
    usersSection: ['İşçilər', 'İşçi idarəetməsi'],
    branchesSection: ['Filiallar', 'Filialların idarə edilməsi']
  };
  var t = titles[sectionId] || ['', ''];
  pageTitle.textContent = t[0];
  pageSubtitle.textContent = t[1];
}

function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

window.openCustomerModal = function(customerId = null) {
  editingCustomerId = customerId;
  if (customerId) {
    const customer = customers.find(item => String(item.id) === String(customerId));
    if (!customer) return;
    customerModalTitle.textContent = 'Müştərini edit et';
    customerNameInput.value = customer.name || '';
    customerPhoneInput.value = customer.phone || '';
    customerExtraPhoneInput.value = customer.extraPhone || '';
    customerAddressInput.value = customer.address || '';
    const cNote = document.getElementById('customerNoteInput');
    if (cNote) cNote.value = customer.note || '';
  } else {
    customerModalTitle.textContent = 'Müştəri əlavə et';
    customerNameInput.value = '';
    customerPhoneInput.value = '';
    customerExtraPhoneInput.value = '';
    customerAddressInput.value = '';
    const cNote = document.getElementById('customerNoteInput');
    if (cNote) cNote.value = '';
  }
  openModal(customerModal);
};

async function saveCustomerFromModal() {
  const name = customerNameInput.value.trim();
  const phone = normalizePhone(customerPhoneInput.value);
  const extraPhone = normalizePhone(customerExtraPhoneInput.value);
  const address = customerAddressInput.value.trim();
  const noteEl = document.getElementById('customerNoteInput');
  const note = noteEl ? noteEl.value.trim() : '';
  if (!name || !phone) return alert('Ad və telefon mütləqdir.');

  const dto = { name, phone, extraPhone, address, note };
  try {
    if (editingCustomerId) {
      await API.customers.update(editingCustomerId, { id: Number(editingCustomerId), ...dto });
    } else {
      await API.customers.create(dto);
    }
  } catch (e) {
    return alert(e.message || 'Müştəri yadda saxlanmadı.');
  }

  currentCustomerSearchFilter = '';
  if (customerSearchMainInput) customerSearchMainInput.value = '';
  closeModal(customerModal);
  renderCustomers();
}

window.deleteCustomer = async function(customerId) {
  const customer = customers.find(item => String(item.id) === String(customerId));
  if (!confirm(`${customer ? customer.name : 'Müştəri'} silinsin?`)) return;
  try {
    await API.customers.remove(customerId);
  } catch (e) {
    // Backend qaimə/borc qoruması işləyir → mesajı göstər
    return alert(e.message || 'Müştəri silinmədi.');
  }
  renderCustomers();
};

window.openCatalogModal = function(type, itemId = null) {
  editingCatalogType = type;
  editingCatalogId = itemId;
  const list = type === 'extra' ? extraCategories : serviceCategories;
  const item = list.find(x => String(x.id) === String(itemId));
  catalogModalTitle.textContent = `${type === 'extra' ? 'Əlavə kateqoriya' : 'Xidmət'} ${item ? 'edit' : 'əlavə et'}`;
  catalogNameInput.value = item?.name || '';
  catalogPriceInput.value = item?.price ?? 0;
  catalogUnitInput.value = item?.unit || '';
  catalogNoteInput.value = item?.note || '';
  const catalogTypeEl = document.getElementById('catalogTypeInput');
  if (catalogTypeEl) catalogTypeEl.value = item?.type || 'monthly';
  openModal(catalogModal);
};

async function saveCatalogFromModal() {
  const name = catalogNameInput.value.trim();
  const price = Number(catalogPriceInput.value || 0);
  const unit = catalogUnitInput.value.trim();
  const note = catalogNoteInput.value.trim();
  const catalogTypeEl = document.getElementById('catalogTypeInput');
  const type = catalogTypeEl ? catalogTypeEl.value : 'monthly';
  if (!name) return alert('Ad mütləqdir.');
  if (price < 0) return alert('Qiymət mənfi ola bilməz.');

  const dto = {
    kind: editingCatalogType === 'extra' ? 'Extra' : 'Service',
    name, price, unit, note,
    rentType: type === 'daily' ? 'Daily' : 'Monthly'
  };
  try {
    if (editingCatalogId) await API.categories.update(editingCatalogId, { id: Number(editingCatalogId), ...dto });
    else await API.categories.create(dto);
  } catch (e) {
    return alert(e.message || 'Yadda saxlanmadı.');
  }
  closeModal(catalogModal);
  renderCatalogLists();
}

window.deleteCatalogItem = async function(type, itemId) {
  if (!confirm('Silinsin?')) return;
  try { await API.categories.remove(itemId); }
  catch (e) { return alert(e.message || 'Silinmədi.'); }
  renderCatalogLists();
};

window.editInvoice = function(invoiceId) {
  window.location.href = `/Invoice/Create?id=${encodeURIComponent(invoiceId)}`;
};

function recalcInvoiceTotals(invoice) {
  const total = (invoice.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  invoice.totalAmount = Number(total.toFixed(2));
  invoice.remainingDebt = Number(Math.max(total - Number(invoice.paidAmount || 0), 0).toFixed(2));
}


window.extendInvoiceOneMonth = function(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  activeExtensionInvoiceId = invoiceId;
  extensionModalTitle.textContent = `Müddəti artır — ${invoice.invoiceNo || '-'}`;
  extensionTypeSelect.value = 'month';
  if (extensionDiscountInput) extensionDiscountInput.value = '0';
  extensionPaidNowInput.value = '0';
  extensionNoteInput.value = '';
  updateExtensionPreview();
  openModal(extensionModal);
};

async function saveExtensionOperation() {
  const invoice = invoices.find(item => String(item.id) === String(activeExtensionInvoiceId));
  if (!invoice) return;
  const mode = extensionTypeSelect.value || 'month';
  const paidNow = Number(extensionPaidNowInput.value || 0);
  if (paidNow < 0) return alert('Ödənişi düzgün yaz.');

  // Təkrar hesablama backend-dən (summary-də mallar yoxdur)
  let preview;
  try { preview = await API.extensions.preview(invoice.id, 1, mode); }
  catch (e) { return alert(e.message || 'Hesablama alınmadı.'); }

  const discount = Math.min(Math.max(Number(extensionDiscountInput?.value || 0), 0), Number(preview.suggestedAmount || 0));
  const addedAmount = Math.max(Number(preview.suggestedAmount || 0) - discount, 0);
  const note = extensionNoteInput.value.trim();

  try {
    await API.extensions.extend(invoice.id, { newReturnDate: preview.newReturnDate, addedAmount, paidNow, mode, note });
  } catch (e) {
    return alert(e.message || 'Artırma alınmadı.');
  }

  closeModal(extensionModal);
  activeExtensionInvoiceId = null;
  alert(`${mode === 'half' ? '15 günlük' : '1 aylıq'} artırma tətbiq olundu. Əlavə borc: ${formatMoney(addedAmount)}${discount ? ` / Endirim: ${formatMoney(discount)}` : ''}${paidNow ? ` / Ödəniş: ${formatMoney(paidNow)}` : ''}`);
  renderAll();
};


window.closeInvoice = function(invoiceId) {
  const index = invoices.findIndex(item => String(item.id) === String(invoiceId));
  if (index === -1) return;
  if (invoices[index].isClosed) return;
  if (!confirm(`${invoices[index].invoiceNo} nömrəli qaimə bağlansın?`)) return;
  invoices[index].isClosed = true;
  invoices[index].updatedAt = new Date().toISOString();
  syncInvoiceCustomerHistory(invoices[index]);
  setStorageData(STORAGE_KEYS.invoices, invoices);
  renderAll();
};

window.openReturnModal = function(invoiceId) {
  activeReturnInvoiceId = invoiceId;
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  returnModalTitle.textContent = `Qismən qaytarma — ${invoice.invoiceNo}`;

  const returnableItems = (invoice.items || []).filter(item => item.isReturnable !== false);
  if (!returnableItems.length) {
    returnItemsBox.innerHTML = '<div class="simple-item">Qaytarıla bilən mal yoxdur.</div>';
    openModal(returnModal);
    return;
  }

  returnItemsBox.innerHTML = returnableItems.map(item => {
    const returned = Number(item.returnedQuantity || 0);
    const available = Math.max(Number(item.quantity || 1) - returned, 0);
    return `
      <div class="return-item">
        <h4>${item.label || item.category}</h4>
        <div class="return-row">
          <div>
            <div>Miqdar: ${item.quantity || 1}</div>
            <div>Qaytarılıb: ${returned}</div>
            <div>Qalıq: ${available}</div>
            <div class="history-note">${item.note || ''}</div>
          </div>
          <div class="form-group">
            <label>Qaytarılacaq miqdar</label>
            <input type="number" min="0" max="${available}" step="1" value="0" data-return-qty="${item.id}" />
          </div>
          <div class="form-group">
            <label>Qeyd</label>
            <input type="text" data-return-note="${item.id}" placeholder="İstəyə bağlı" />
          </div>
        </div>
      </div>
    `;
  }).join('');
  openModal(returnModal);
};

function saveReturnOperation() {
  const invoiceIndex = invoices.findIndex(item => String(item.id) === String(activeReturnInvoiceId));
  if (invoiceIndex === -1) return;
  const invoice = cloneData(invoices[invoiceIndex]);
  let changed = false;
  let totalRefund = 0;

  (invoice.items || []).forEach(item => {
    const qtyInput = returnItemsBox.querySelector(`[data-return-qty="${item.id}"]`);
    const noteInput = returnItemsBox.querySelector(`[data-return-note="${item.id}"]`);
    if (!qtyInput) return;
    const qty = Number(qtyInput.value || 0);
    const available = Math.max(Number(item.quantity || 1) - Number(item.returnedQuantity || 0), 0);
    if (qty <= 0) return;
    if (qty > available) {
      qtyInput.value = String(available);
      return;
    }

    const perUnit = Number(item.quantity || 1) > 0 ? Number(item.subtotal || 0) / Number(item.quantity || 1) : Number(item.subtotal || 0);
    const deduction = perUnit * qty;
    item.returnedQuantity = Number(item.returnedQuantity || 0) + qty;
    item.subtotal = Number(Math.max(Number(item.subtotal || 0) - deduction, 0).toFixed(2));
    item.returnHistory = item.returnHistory || [];
    item.returnHistory.unshift({ date: new Date().toISOString(), quantity: qty, note: noteInput?.value?.trim() || '' });
    totalRefund += deduction;
    changed = true;
  });

  if (!changed) return alert('Ən azı 1 mal üçün qaytarılacaq miqdar yaz.');

  invoice.returnHistory = invoice.returnHistory || [];
  invoice.returnHistory.unshift({ date: new Date().toISOString(), refundAmount: Number(totalRefund.toFixed(2)) });
  recalcInvoiceTotals(invoice);
  invoices[invoiceIndex] = invoice;
  syncInvoiceCustomerHistory(invoice);
  setStorageData(STORAGE_KEYS.invoices, invoices);
  closeModal(returnModal);
  alert('Qismən qaytarma tətbiq edildi və qiymətlər yeniləndi.');
  renderAll();
}


window.printInvoice = function(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;

  const escapeHtml = value => String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const customer = getCustomerByInvoice(invoice) || null;
  const extraPhone = customer?.extraPhone || '';
  const noteText = (invoice.note || '').trim();
  const createdAtText = invoice.createdAt ? formatDateTime(invoice.createdAt) : formatDateTime(invoice.invoiceDate);
  const moneyValue = value => Number(value || 0).toFixed(2);
  const logoSrc = "data:image/png;base64,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";

  const rows = [];

  function pushRow(category, name, qty, unit, price, total) {
    if (!qty || Number(qty) <= 0) return;
    rows.push(`
      <tr>
        <td>${escapeHtml(category || '-')}</td>
        <td>${escapeHtml(name || '-')}</td>
        <td class="center">${Number(qty)}</td>
        <td class="center">${escapeHtml(unit || 'ədəd')}</td>
        <td class="money">${moneyValue(price || 0)}</td>
        <td class="money">${moneyValue(total || 0)}</td>
      </tr>
    `);
  }

  (invoice.items || []).forEach((item) => {
    if (item.category === 'Lesa' && Array.isArray(item.components)) {
      const labels = {
        head: 'Başlıq',
        longRod: 'Uzun çubuq',
        shortRod: 'Balaca çubuq',
        freeBoard: 'Taxta 5/15 3.00',
        extraBoard: 'Əlavə taxta'
      };
      item.components.forEach(component => {
        const key = component.key || '';
        const qty = Number(component.quantity || 0);
        const unitPrice = Number(component.unitPrice || 0);
        pushRow('Lesa', labels[key] || component.label || '-', qty, component.unit || 'ədəd', unitPrice, qty * unitPrice);
      });
      return;
    }

    if (item.category === 'Təkərli lesa' && Array.isArray(item.components)) {
      const labels = {
        head: 'Başlıq',
        rod: 'Çubuq',
        vilka: 'Vilka',
        board: 'Taxta',
        wheel: 'Təkər',
        extraBoard: 'Əlavə taxta'
      };
      item.components.forEach(component => {
        const key = component.key || '';
        const qty = Number(component.quantity || 0);
        let unitPrice = Number(component.unitPrice || 0);
        if (!unitPrice && key === 'extraBoard') unitPrice = Number(item.extraBoardPrice || 0);
        pushRow('Təkərli lesa', labels[key] || component.label || '-', qty, component.unit || 'ədəd', unitPrice, qty * unitPrice);
      });
      if (Number(item.dayCount || 0) > 0) {
        pushRow('Təkərli lesa', `İcarə müddəti (${Number(item.dayCount || 0)} gün)`, Number(item.dayCount || 0), 'gün', Number(item.dailyPrice || 0), Number(item.dayCount || 0) * Number(item.dailyPrice || 0));
      }
      return;
    }

    if (item.category === 'Taxta' && (item.size || item.label)) {
      pushRow('Taxta', item.size || item.label || '-', Number(item.quantity || 1), item.unit || 'ədəd', Number(item.customPrice || 0), Number(item.subtotal || 0));
      return;
    }

    pushRow(item.category || '-', item.label || item.size || '-', Number(item.quantity || 1), item.unit || '-', Number(item.customPrice || 0), Number(item.subtotal || 0));
  });

  const rowsHtml = rows.join('') || `<tr><td colspan="6" class="empty">Məlumat yoxdur</td></tr>`;

  const printWindow = window.open('', '_blank', 'width=1100,height=900');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="az">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(invoice.invoiceNo || 'Qaimə')}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body { font-family: Arial, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sheet { width: 100%; padding: 0; }
        .top-head {
          display: grid;
          grid-template-columns: 1.6fr 0.95fr;
          gap: 14px;
          align-items: start;
          border-bottom: 1px solid #222;
          padding-bottom: 10px;
          margin-bottom: 16px;
        }
        .brand-wrap { display: flex; align-items: flex-start; min-height: 110px; }
        .brand-logo {
          width: 330px;
          height: auto;
          display: block;
          object-fit: contain;
        }
        .contact-box {
          padding-top: 10px;
          text-align: left;
          font-size: 13px;
          line-height: 1.55;
        }
        .contact-box .label { font-weight: 700; margin-bottom: 2px; }
        .doc-top { margin-bottom: 14px; }
        .doc-line {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 2px;
        }
        .doc-line strong {
          display: inline-block;
          min-width: 122px;
          font-weight: 700;
        }
        .doc-line .sep { display: inline-block; width: 14px; text-align: center; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th, td {
          border: 1px solid #222;
          padding: 8px 10px;
          font-size: 14px;
          vertical-align: top;
        }
        th {
          text-align: center;
          font-weight: 700;
        }
        td.center { text-align: center; }
        td.money { text-align: right; white-space: nowrap; }
        .empty { text-align: center; color: #555; padding: 18px 8px; }
        .totals-wrap {
          width: 360px;
          margin-left: auto;
          margin-top: 14px;
        }
        .totals-table {
          width: 100%;
          border-collapse: collapse;
        }
        .totals-table td {
          border: none;
          padding: 4px 0;
          font-size: 15px;
        }
        .totals-table td:last-child {
          text-align: right;
          font-weight: 700;
          white-space: nowrap;
        }
        .note-block {
          margin-top: 14px;
          font-size: 15px;
          line-height: 1.5;
        }
        .issued {
          margin-top: 22px;
          text-align: right;
          color: #444;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="top-head">
          <div class="brand-wrap">
            <img src="${logoSrc}" alt="Kapital A.S. MMC" class="brand-logo" />
          </div>
          <div class="contact-box">
            <div class="label">Əlaqə:</div>
            <div>050-756-65-83</div>
            <div>050-210-36-11</div>
            <div>012-525-37-56</div>
            <div>kapital.as.123@mail.ru</div>
            <div>Mərdəkan</div>
          </div>
        </div>

        <div class="doc-top">
          <div class="doc-line"><strong>Əməliyyat</strong><span class="sep">:</span> Malın icarəyə verilməsi</div>
          <div class="doc-line"><strong>Tarix</strong><span class="sep">:</span> ${escapeHtml(formatDate(invoice.invoiceDate))}</div>
          <div class="doc-line"><strong>Qaimə №</strong><span class="sep">:</span> ${escapeHtml(invoice.invoiceNo || '-')}</div>
          <div class="doc-line"><strong>Şəxs</strong><span class="sep">:</span> ${escapeHtml(invoice.customer || '-')}</div>
          <div class="doc-line"><strong>Ünvan</strong><span class="sep">:</span> ${escapeHtml(invoice.address || '-')}</div>
          <div class="doc-line"><strong>Əlaqə n.</strong><span class="sep">:</span> ${escapeHtml(invoice.phone || '-')}${extraPhone ? ` / ${escapeHtml(extraPhone)}` : ''}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:22%;">Kateqoriya</th>
              <th>Malın adı</th>
              <th style="width:11%;">Miqdar</th>
              <th style="width:13%;">Ölçü vahidi</th>
              <th style="width:14%;">İcarə qiyməti</th>
              <th style="width:14%;">Məbləğ</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="totals-wrap">
          <table class="totals-table">
            <tr><td>Ümumi məbləğ:</td><td>${moneyValue(invoice.totalAmount)} AZN</td></tr>
            <tr><td>Depozit:</td><td>${moneyValue(invoice.depositAmount)} AZN</td></tr>
            <tr><td>Ödənilən:</td><td>${moneyValue(invoice.paidAmount)} AZN</td></tr>
          </table>
        </div>

        ${noteText ? `<div class="note-block"><strong>Qeyd:</strong> ${escapeHtml(noteText)}</div>` : ''}

        <div class="issued">Qaimə çıxarılıb: ${escapeHtml(createdAtText)}</div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 250);
        };
      <\/script>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
};

function renderInvoicePaymentHistory(invoice) {
  const history = normalizePaymentHistory(invoice).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  invoicePaymentHistorySummary.textContent = `Cəmi ödəniş: ${formatMoney(getInvoicePaidAmountFromHistory(invoice))}`;
  if (!history.length) {
    invoicePaymentHistoryBox.innerHTML = '<div class="empty-history">Ödəniş tarixçəsi yoxdur</div>';
    return;
  }
  invoicePaymentHistoryBox.innerHTML = history.map(entry => `
    <div class="invoice-payment-item">
      <div class="invoice-payment-top">
        <strong>${entry.direction === 'out' ? 'Düzəliş / çıxılma' : 'Ödəniş'}</strong>
        <span class="mono-amount ${entry.direction === 'out' ? 'plus' : 'minus'}">${entry.direction === 'out' ? '-' : '+'}${formatMoney(entry.amount)}</span>
      </div>
      <div class="invoice-payment-note">${entry.note || '-'}</div>
      <div class="invoice-payment-meta">${formatDateTime(entry.date)}</div>
    </div>
  `).join('');
}

window.openInvoicePaymentModal = function(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  activeInvoicePaymentId = invoiceId;
  invoicePaymentModalTitle.textContent = `Qaimə ödənişi — ${invoice.invoiceNo || '-'}`;
  invoicePaymentDateInput.value = toDateTimeLocalValue();
  invoicePaymentAmountInput.value = '';
  invoicePaymentNoteInput.value = '';
  renderInvoicePaymentHistory(invoice);
  openModal(invoicePaymentModal);
};

async function saveInvoicePayment() {
  const invoice = invoices.find(item => String(item.id) === String(activeInvoicePaymentId));
  if (!invoice) return;
  const amount = Number(invoicePaymentAmountInput.value || 0);
  if (amount <= 0) return alert('Məbləği düzgün yaz.');
  const date = invoicePaymentDateInput.value ? new Date(invoicePaymentDateInput.value).toISOString() : new Date().toISOString();
  const note = invoicePaymentNoteInput.value.trim();
  try {
    await API.payments.add({ invoiceId: Number(invoice.id), amount, direction: 'In', date, note: note || 'Qaimə ödənişi' });
  } catch (e) {
    return alert(e.message || 'Ödəniş alınmadı.');
  }
  invoicePaymentAmountInput.value = '';
  invoicePaymentNoteInput.value = '';
  closeModal(invoicePaymentModal);
  renderAll();
}

window.openCustomerTransactionModal = function(customerId, actionType) {
  const customer = customers.find(item => String(item.id) === String(customerId));
  if (!customer) return;
  activeEditingHistory = null;
  activeCustomerTransaction = { customerId, actionType };
  const titles = {
    'debt-add': 'Müştəriyə borc əlavə et',
    payment: 'Müştərinin borc ödənişi',
    'deposit-add': 'Müştəriyə depozit əlavə et',
    'deposit-remove': 'Müştərinin depozitini çıx',
    'deposit-to-debt': 'Depozitlə borc ödə'
  };
  customerTransactionModalTitle.textContent = `${titles[actionType] || 'Müştəri əməliyyatı'} — ${customer.name}`;
  customerTransactionDateInput.value = toDateTimeLocalValue();
  customerTransactionAmountInput.value = '';
  customerTransactionNoteInput.value = '';
  openModal(customerTransactionModal);
};

function saveCustomerTransaction() {
  if (activeEditingHistory) {
    const customerIndex = customers.findIndex(item => String(item.id) === String(activeEditingHistory.customerId));
    if (customerIndex === -1) return;
    const customer = ensureCustomerShape(customers[customerIndex]);
    const entryIndex = (customer.history || []).findIndex(item => String(item.id) === String(activeEditingHistory.entryId));
    if (entryIndex === -1) return;
    const amount = Number(customerTransactionAmountInput.value || 0);
    if (amount <= 0) return alert('Məbləği düzgün yaz.');
    const date = customerTransactionDateInput.value ? new Date(customerTransactionDateInput.value).toISOString() : new Date().toISOString();
    const note = customerTransactionNoteInput.value.trim();
    const currentEntry = customer.history[entryIndex];
    customer.history[entryIndex] = {
      ...currentEntry,
      amount,
      date,
      note,
      debtChange: currentEntry.debtChange < 0 ? -amount : currentEntry.debtChange > 0 ? amount : 0,
      depositChange: currentEntry.depositChange < 0 ? -amount : currentEntry.depositChange > 0 ? amount : 0
    };
    customers[customerIndex] = customer;
    setStorageData(STORAGE_KEYS.customers, customers);
    activeEditingHistory = null;
    closeModal(customerTransactionModal);
    renderAll();
    return;
  }
  if (!activeCustomerTransaction) return;
  const index = customers.findIndex(item => String(item.id) === String(activeCustomerTransaction.customerId));
  if (index === -1) return;
  const amount = Number(customerTransactionAmountInput.value || 0);
  if (amount <= 0) return alert('Məbləği düzgün yaz.');
  const date = customerTransactionDateInput.value ? new Date(customerTransactionDateInput.value).toISOString() : new Date().toISOString();
  const note = customerTransactionNoteInput.value.trim();
  const actionType = activeCustomerTransaction.actionType;
  const customer = ensureCustomerShape(customers[index]);
  const ledger = getCustomerLedger(customer);

  if ((actionType === 'payment' || actionType === 'deposit-to-debt') && ledger.debt <= 0) {
    return alert('Müştərinin ödənəcək borcu yoxdur.');
  }
  if (amount > ledger.debt && (actionType === 'payment' || actionType === 'deposit-to-debt')) {
    return alert(`Borcdan artıq yazmaq olmaz. Maksimum: ${formatMoney(ledger.debt)}`);
  }
  if (actionType === 'deposit-remove' && amount > ledger.deposit) {
    return alert(`Depozit kifayət etmir. Maksimum: ${formatMoney(ledger.deposit)}`);
  }
  if (actionType === 'deposit-to-debt' && amount > ledger.deposit) {
    return alert(`Depozit kifayət etmir. Maksimum: ${formatMoney(ledger.deposit)}`);
  }

  let manualEntry = null;

  if (actionType === 'payment' || actionType === 'deposit-to-debt') {
    const allocation = allocatePaymentAcrossInvoices(customer, amount, {
      date,
      note: note || (actionType === 'deposit-to-debt' ? 'Depozitdən borca köçürüldü' : 'Müştəri ödənişi'),
      fromDeposit: actionType === 'deposit-to-debt'
    });
    const leftover = Number((amount - allocation.usedAmount).toFixed(2));
    if (actionType === 'payment' && leftover > 0) {
      manualEntry = {
        id: `hist-manual-${Date.now()}`,
        date,
        type: 'Borc ödədi',
        amount: leftover,
        note: note || 'Manual borc ödənişi',
        debtChange: -leftover,
        depositChange: 0,
        source: 'manual'
      };
    }
    if (actionType === 'deposit-to-debt') {
      const appliedInvoicesText = allocation.applied.length ? ` / Qaimələr: ${allocation.applied.map(x => `${x.invoiceNo} (${formatMoney(x.amount)})`).join(', ')}` : '';
      manualEntry = {
        id: `hist-manual-${Date.now()}`,
        date,
        type: 'Depozitlə borc ödədi',
        amount,
        note: `${note || 'Depozitdən borca köçürüldü'}${appliedInvoicesText}`,
        debtChange: leftover > 0 ? -leftover : 0,
        depositChange: -amount,
        source: 'manual'
      };
    }
  } else {
    const config = {
      'debt-add': { type: 'Borc əlavə olunub', debtChange: amount, depositChange: 0 },
      'deposit-add': { type: 'Depozit əlavə olunub', debtChange: 0, depositChange: amount },
      'deposit-remove': { type: 'Depozit çıxılıb', debtChange: 0, depositChange: -amount }
    }[actionType];
    manualEntry = {
      id: `hist-manual-${Date.now()}`,
      date,
      type: config.type,
      amount,
      note,
      debtChange: config.debtChange,
      depositChange: config.depositChange,
      source: 'manual'
    };
  }

  if (manualEntry) customer.history.unshift(manualEntry);
  customers[index] = customer;
  setStorageData(STORAGE_KEYS.customers, customers);
  closeModal(customerTransactionModal);
  activeCustomerTransaction = null;
  activeEditingHistory = null;
  renderAll();
}

function renderAll() {
  refreshData();
  renderAlerts();
  renderStats();
  renderDashboardTable();
  renderInvoiceTable();
  renderCustomers();
  renderDebtsSection();
  renderDepositsSection();
  renderInventorySection();
  renderProducts();
  renderCatalogLists();
  renderReports();
}

inventorySearchInput?.addEventListener('input', e => { currentInventorySearchFilter = e.target.value; renderInventorySection(); });
addInventoryItemBtn?.addEventListener('click', () => window.addInventoryItem());

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchSection(link.dataset.section, link);
  });
});

showAllBtn.addEventListener('click', () => {
  const invoicesLink = document.querySelector('[data-section="invoicesSection"]');
  switchSection('invoicesSection', invoicesLink);
});

searchInput?.addEventListener('input', e => {
  currentFilter = e.target.value;
  renderAll();
});

invoiceSearchInput?.addEventListener('input', e => {
  currentInvoiceSearchFilter = e.target.value;
  renderInvoiceTable();
  renderDashboardTable();
});

customerSearchMainInput?.addEventListener('input', e => {
  currentCustomerSearchFilter = e.target.value;
  renderCustomers();
});

statusFilterSelect?.addEventListener('change', e => {
  currentStatusFilter = e.target.value;
  renderAll();
});

fromDateFilterInput?.addEventListener('change', e => {
  currentFromDate = e.target.value;
  renderAll();
});

toDateFilterInput?.addEventListener('change', e => {
  currentToDate = e.target.value;
  renderAll();
});

clearInvoiceFiltersBtn?.addEventListener('click', () => {
  currentStatusFilter = 'all';
  currentInvoiceSearchFilter = '';
  currentFromDate = '';
  currentToDate = '';
  if (statusFilterSelect) statusFilterSelect.value = 'all';
  if (invoiceSearchInput) invoiceSearchInput.value = '';
  if (fromDateFilterInput) fromDateFilterInput.value = '';
  if (toDateFilterInput) toDateFilterInput.value = '';
  renderAll();
});

exportBackupBtn?.addEventListener('click', exportBackupData);
importBackupBtn?.addEventListener('click', () => importBackupInput?.click());
debtCustomerFilterInput?.addEventListener('input', e => { currentDebtCustomerFilter = e.target.value; renderDebtsSection(); });
debtTypeFilterSelect?.addEventListener('change', e => { currentDebtTypeFilter = e.target.value; renderDebtsSection(); });
debtMinAmountInput?.addEventListener('input', e => { currentDebtMinAmount = e.target.value; renderDebtsSection(); });
clearDebtFiltersBtn?.addEventListener('click', () => {
  currentDebtCustomerFilter = '';
  currentDebtTypeFilter = 'all';
  currentDebtMinAmount = '';
  if (debtCustomerFilterInput) debtCustomerFilterInput.value = '';
  if (debtTypeFilterSelect) debtTypeFilterSelect.value = 'all';
  if (debtMinAmountInput) debtMinAmountInput.value = '';
  renderDebtsSection();
});
exportDebtCsvBtn?.addEventListener('click', exportDebtsCsv);
printDebtListBtn?.addEventListener('click', printDebtsList);
depositCustomerFilterInput?.addEventListener('input', e => { currentDepositCustomerFilter = e.target.value; renderDepositsSection(); });
depositRangeFilterSelect?.addEventListener('change', e => { currentDepositRangeFilter = e.target.value; renderDepositsSection(); });
clearDepositFiltersBtn?.addEventListener('click', () => {
  currentDepositCustomerFilter = '';
  currentDepositRangeFilter = 'all';
  if (depositCustomerFilterInput) depositCustomerFilterInput.value = '';
  if (depositRangeFilterSelect) depositRangeFilterSelect.value = 'all';
  renderDepositsSection();
});
exportDepositCsvBtn?.addEventListener('click', exportDepositsCsv);
printDepositListBtn?.addEventListener('click', printDepositsList);
importBackupInput?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed?.data || parsed;
    if (!Array.isArray(data.customers) || !Array.isArray(data.invoices) || !Array.isArray(data.extraCategories) || !Array.isArray(data.serviceCategories)) {
      throw new Error('Struktur yanlışdır');
    }
    if (!confirm('Cari məlumatlar import edilən backup ilə əvəz olunsun?')) return;
    setStorageData(STORAGE_KEYS.customers, data.customers);
    setStorageData(STORAGE_KEYS.invoices, data.invoices);
    setStorageData(STORAGE_KEYS.extraCategories, data.extraCategories);
    setStorageData(STORAGE_KEYS.serviceCategories, data.serviceCategories);
    if (Array.isArray(data.poleCategories)) setStorageData(STORAGE_KEYS.poleCategories, data.poleCategories);
    renderAll();
    alert('Backup uğurla import edildi.');
  } catch (error) {
    alert(`Import alınmadı: ${error.message}`);
  } finally {
    e.target.value = '';
  }
});

addCustomerQuickBtn.addEventListener('click', () => window.openCustomerModal());
addExtraCategoryBtn.addEventListener('click', () => window.openCatalogModal('extra'));
addServiceCategoryBtn.addEventListener('click', () => window.openCatalogModal('service'));
addPoleCategoryBtn?.addEventListener('click', () => window.openPoleCategoryModal());
savePoleCategoryBtn?.addEventListener('click', savePoleCategoryFromModal);
saveCustomerModalBtn.addEventListener('click', saveCustomerFromModal);
saveCatalogModalBtn.addEventListener('click', saveCatalogFromModal);
saveStandardProductBtn?.addEventListener('click', saveStandardProductFromModal);
saveInventoryItemBtn?.addEventListener('click', saveInventoryItemFromModal);
inventoryCategorySelect?.addEventListener('change', () => { inventoryCustomNameGroup?.classList.toggle('hidden', inventoryCategorySelect.value !== '__custom__'); updateInventorySizeUI(); });
saveReturnBtn.addEventListener('click', saveReturnOperation);
saveCustomerTransactionBtn.addEventListener('click', saveCustomerTransaction);
saveInvoicePaymentBtn.addEventListener('click', saveInvoicePayment);
extensionTypeSelect.addEventListener('change', updateExtensionPreview);
extensionDiscountInput?.addEventListener('input', updateExtensionPreview);
saveExtensionBtn.addEventListener('click', saveExtensionOperation);

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = document.getElementById(btn.dataset.closeModal);
    if (modal === customerTransactionModal) {
      activeCustomerTransaction = null;
      activeEditingHistory = null;
    }
    if (modal) closeModal(modal);
  });
});

[customerModal, catalogModal, poleCategoryModal, standardProductModal, inventoryItemModal, returnModal, customerTransactionModal, invoicePaymentModal, extensionModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      if (modal === customerTransactionModal) {
        activeCustomerTransaction = null;
        activeEditingHistory = null;
      }
      closeModal(modal);
    }
  });
});

refreshData();
setStorageData(STORAGE_KEYS.invoices, invoices);
invoices.forEach(syncInvoiceCustomerHistory);
renderAll();


/* ===== v7 closure and component-return overrides ===== */
function getInvoicePenaltyTotal(invoice) {
  return Number(((invoice.closingHistory || []).reduce((sum, x) => sum + Number(x.penaltyAmount || 0), 0)).toFixed(2));
}

function recalcInvoiceTotals(invoice) {
  invoice.paymentHistory = normalizePaymentHistory(invoice);
  invoice.paidAmount = getInvoicePaidAmountFromHistory(invoice);
  const itemsTotal = (invoice.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const penaltyTotal = getInvoicePenaltyTotal(invoice);
  invoice.totalAmount = Number((itemsTotal + penaltyTotal).toFixed(2));
  invoice.remainingDebt = Number(Math.max(invoice.totalAmount - Number(invoice.paidAmount || 0), 0).toFixed(2));
  if (isInvoiceFullyReturned(invoice) && invoice.remainingDebt <= 0) {
    invoice.isClosed = true;
    invoice.closedAt = invoice.closedAt || new Date().toISOString();
  }
}

function itemRemainingText(item) {
  if (Array.isArray(item.components) && item.components.length) {
    return item.components.map(c => `${c.label}: ${Math.max(Number(c.quantity||0)-Number(c.returnedQuantity||0),0)}`).join(' / ');
  }
  const remaining = Math.max(Number(item.quantity || 1) - Number(item.returnedQuantity || 0), 0);
  return `Qalıq: ${remaining}`;
}

function isItemFullyReturned(item) {
  if (item.isReturnable === false) return true;
  if (Array.isArray(item.components) && item.components.length) {
    return item.components.every(c => Number(c.returnedQuantity || 0) >= Number(c.quantity || 0));
  }
  return Number(item.returnedQuantity || 0) >= Number(item.quantity || 1);
}

function isInvoiceFullyReturned(invoice) {
  const returnables = (invoice.items || []).filter(item => item.isReturnable !== false);
  if (!returnables.length) return true;
  return returnables.every(isItemFullyReturned);
}

function getProcedureNote(invoice) {
  const parts = [];
  const firstPayment = normalizePaymentHistory(invoice).filter(x => x.direction !== 'out').reduce((s,x)=>s+Number(x.amount||0),0);
  parts.push(`Mal: ${formatMoney((invoice.items||[]).reduce((s,x)=>s+Number(x.subtotal||0),0))}`);
  if (firstPayment > 0) parts.push(`Ödəniş: ${formatMoney(firstPayment)}`);
  if (Number(invoice.depositAmount || 0) > 0) parts.push(`Depozit: ${formatMoney(invoice.depositAmount)}`);
  if ((invoice.returnHistory || []).length) parts.push(`Qaytarma: ${(invoice.returnHistory||[]).length} dəfə`);
  if (getInvoicePenaltyTotal(invoice) > 0) parts.push(`Cərimə: ${formatMoney(getInvoicePenaltyTotal(invoice))}`);
  if (invoice.isClosed) parts.push('Qaimə bağlanıb');
  return `${invoice.invoiceNo || '-'} — ${parts.join(' / ')}`;
}

function buildInvoiceHistoryEntries(invoice) {
  const createdDate = invoice.createdAt || invoice.invoiceDate || new Date().toISOString();
  const entries = [{
    id: `hist-${invoice.id}-procedure`,
    date: createdDate,
    type: 'Qaimə proseduru',
    amount: Number(invoice.totalAmount || 0),
    note: getProcedureNote(invoice),
    debtChange: Number((invoice.totalAmount - Number(invoice.paidAmount || 0)).toFixed(2)),
    depositChange: Number((Number(invoice.depositAmount || 0) - (invoice.depositReturnedHistory || []).reduce((s,x)=>s+Number(x.amount||0),0)).toFixed(2)),
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo || '',
    source: 'invoice'
  }];
  return entries;
}

function getFilteredInvoices() {
  const q = (currentInvoiceSearchFilter || '').trim().toLowerCase();
  const now = Date.now();
  return invoices.filter(invoice => {
    const status = getInvoiceStatus(invoice);
    const itemsText = (invoice.items || []).map(item => `${item.category} ${item.label || ''} ${item.size || ''} ${item.note || ''} ${itemRemainingText(item)}`).join(' ').toLowerCase();
    const textMatched = !q || [invoice.invoiceNo, invoice.customer, invoice.phone, invoice.extraPhone, invoice.address, status, itemsText].join(' ').toLowerCase().includes(q);
    const statusMatched = currentStatusFilter === 'all' || status === currentStatusFilter;
    const invoiceDateValue = getInvoiceEffectiveDate(invoice);
    const fromMatched = !currentFromDate || (invoiceDateValue && invoiceDateValue >= currentFromDate);
    const toMatched = !currentToDate || (invoiceDateValue && invoiceDateValue <= currentToDate);
    const hiddenClosed = currentStatusFilter !== 'Bağlanıb' && invoice.isClosed && invoice.closedAt && (now - new Date(invoice.closedAt).getTime() > 24*60*60*1000);
    return textMatched && statusMatched && fromMatched && toMatched && !hiddenClosed;
  });
}

function getInvoiceItemsHtml(invoice) {
  return (invoice.items || []).map(item => {
    const extra = Array.isArray(item.components) && item.components.length
      ? item.components.map(c => `${c.label}: ${Math.max(Number(c.quantity||0)-Number(c.returnedQuantity||0),0)}/${Number(c.quantity||0)}`).join(' / ')
      : itemRemainingText(item);
    return `<div class="invoice-mini-item">${item.label || item.category}${item.size ? ` / ${item.size}` : ''}${item.note ? ` / ${item.note}` : ''}${extra ? ` / ${extra}` : ''}</div>`;
  }).join('');
}

function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

window.openReturnModal = function(invoiceId) {
  activeReturnInvoiceId = invoiceId;
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  returnModalTitle.textContent = `Qaytarma — ${invoice.invoiceNo}`;
  const returnableItems = (invoice.items || []).filter(item => item.isReturnable !== false && !isItemFullyReturned(item));
  if (!returnableItems.length) {
    returnItemsBox.innerHTML = '<div class="simple-item">Qaytarıla bilən açıq mal yoxdur.</div>';
    openModal(returnModal);
    return;
  }
  returnItemsBox.innerHTML = returnableItems.map(item => {
    if (Array.isArray(item.components) && item.components.length) {
      return `
        <div class="return-item">
          <h4>${item.label || item.category}</h4>
          <div class="history-note">${escapeHtml(item.note || '')}</div>
          <div class="return-component-grid">
            ${item.components.map(component => {
              const remaining = Math.max(Number(component.quantity||0) - Number(component.returnedQuantity||0), 0);
              if (remaining <= 0) return '';
              return `
                <div class="return-component-row">
                  <div><strong>${component.label}</strong><div class="history-note">Qalıq: ${remaining} / ${component.quantity}</div></div>
                  <div class="form-group"><label>Qaytarılacaq</label><input type="number" min="0" max="${remaining}" step="1" value="0" data-return-component-qty="${item.id}::${component.key}" /></div>
                  <div class="form-group"><label>Qeyd</label><input type="text" data-return-component-note="${item.id}::${component.key}" placeholder="İstəyə bağlı" /></div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }
    const remaining = Math.max(Number(item.quantity || 1) - Number(item.returnedQuantity || 0), 0);
    return `
      <div class="return-item">
        <h4>${item.label || item.category}</h4>
        <div class="return-row">
          <div><div>Miqdar: ${item.quantity || 1}</div><div>Qalıq: ${remaining}</div><div class="history-note">${item.note || ''}</div></div>
          <div class="form-group"><label>Qaytarılacaq miqdar</label><input type="number" min="0" max="${remaining}" step="1" value="0" data-return-qty="${item.id}" /></div>
          <div class="form-group"><label>Qeyd</label><input type="text" data-return-note="${item.id}" placeholder="İstəyə bağlı" /></div>
        </div>
      </div>`;
  }).join('');
  openModal(returnModal);
};

function saveReturnOperation() {
  const invoiceIndex = invoices.findIndex(item => String(item.id) === String(activeReturnInvoiceId));
  if (invoiceIndex === -1) return;
  const invoice = cloneData(invoices[invoiceIndex]);
  let changed = false;
  let totalRefund = 0;
  const returnRecords = [];
  (invoice.items || []).forEach(item => {
    if (Array.isArray(item.components) && item.components.length) {
      item.components.forEach(component => {
        const qtyInput = returnItemsBox.querySelector(`[data-return-component-qty="${item.id}::${component.key}"]`);
        const noteInput = returnItemsBox.querySelector(`[data-return-component-note="${item.id}::${component.key}"]`);
        if (!qtyInput) return;
        const qty = Number(qtyInput.value || 0);
        const remaining = Math.max(Number(component.quantity||0) - Number(component.returnedQuantity||0), 0);
        if (qty <= 0) return;
        if (qty > remaining) { qtyInput.value = String(remaining); return; }
        component.returnedQuantity = Number(component.returnedQuantity || 0) + qty;
        const deduction = Number((Number(component.unitPrice || 0) * qty).toFixed(2));
        if (deduction > 0) {
          item.subtotal = Number(Math.max(Number(item.subtotal || 0) - deduction, 0).toFixed(2));
          totalRefund += deduction;
        }
        item.returnHistory = item.returnHistory || [];
        item.returnHistory.unshift({ date: new Date().toISOString(), quantity: qty, componentKey: component.key, componentLabel: component.label, note: noteInput?.value?.trim() || '' });
        returnRecords.push(`${component.label}: ${qty}`);
        changed = true;
      });
      return;
    }
    const qtyInput = returnItemsBox.querySelector(`[data-return-qty="${item.id}"]`);
    const noteInput = returnItemsBox.querySelector(`[data-return-note="${item.id}"]`);
    if (!qtyInput) return;
    const qty = Number(qtyInput.value || 0);
    const remaining = Math.max(Number(item.quantity || 1) - Number(item.returnedQuantity || 0), 0);
    if (qty <= 0) return;
    if (qty > remaining) { qtyInput.value = String(remaining); return; }
    const perUnit = Number(item.quantity || 1) > 0 ? Number(item.subtotal || 0) / Number(item.quantity || 1) : Number(item.subtotal || 0);
    const deduction = perUnit * qty;
    item.returnedQuantity = Number(item.returnedQuantity || 0) + qty;
    item.subtotal = Number(Math.max(Number(item.subtotal || 0) - deduction, 0).toFixed(2));
    item.returnHistory = item.returnHistory || [];
    item.returnHistory.unshift({ date: new Date().toISOString(), quantity: qty, note: noteInput?.value?.trim() || '' });
    totalRefund += deduction;
    returnRecords.push(`${item.label || item.category}: ${qty}`);
    changed = true;
  });
  if (!changed) return alert('Ən azı 1 qaytarma yaz.');
  invoice.returnHistory = invoice.returnHistory || [];
  invoice.returnHistory.unshift({ date: new Date().toISOString(), refundAmount: Number(totalRefund.toFixed(2)), note: returnRecords.join(' / ') });
  recalcInvoiceTotals(invoice);
  if (isInvoiceFullyReturned(invoice) && invoice.remainingDebt <= 0) {
    invoice.isClosed = true;
    invoice.closedAt = new Date().toISOString();
  }
  invoices[invoiceIndex] = invoice;
  syncInvoiceCustomerHistory(invoice);
  setStorageData(STORAGE_KEYS.invoices, invoices);
  closeModal(returnModal);
  alert(invoice.isClosed ? 'Qaytarma edildi və qaimə avtomatik bağlandı.' : 'Qaytarma tətbiq edildi.');
  renderAll();
}

window.closeInvoice = function(invoiceId) {
  const index = invoices.findIndex(item => String(item.id) === String(invoiceId));
  if (index === -1) return;
  const invoice = cloneData(invoices[index]);
  if (invoice.isClosed) return alert('Bu qaimə artıq bağlanıb.');
  const customer = getCustomerByInvoice(invoice);
  const ledger = customer ? getCustomerLedger(customer) : { deposit: Number(invoice.depositAmount || 0) };
  const paidNow = Number(prompt('Bağlama zamanı müştəri nə qədər ödədi?', '0') || 0);
  if (Number.isNaN(paidNow) || paidNow < 0) return alert('Ödəniş düzgün deyil.');
  const depositReturned = Number(prompt(`Müştəriyə nə qədər depozit qaytardınız? (Qalıq depozit: ${Number(ledger.deposit || 0).toFixed(2)} AZN)`, '0') || 0);
  if (Number.isNaN(depositReturned) || depositReturned < 0) return alert('Depozit qaytarılması düzgün deyil.');
  if (depositReturned > Number(ledger.deposit || 0)) return alert('Bu qədər depozit yoxdur.');
  const penaltyAmount = Number(prompt('Xarab mal/cərimə məbləği varmı?', '0') || 0);
  if (Number.isNaN(penaltyAmount) || penaltyAmount < 0) return alert('Cərimə düzgün deyil.');
  const note = prompt('Qeyd / cərimə səbəbi', '') || '';
  if (paidNow > 0) {
    invoice.paymentHistory = normalizePaymentHistory(invoice);
    invoice.paymentHistory.unshift({ id:`pay-${Date.now()}`, date:new Date().toISOString(), amount:paidNow, note: note || 'Bağlama zamanı ödəniş', direction:'in' });
  }
  if (depositReturned > 0) {
    invoice.depositReturnedHistory = invoice.depositReturnedHistory || [];
    invoice.depositReturnedHistory.unshift({ id:`depout-${Date.now()}`, date:new Date().toISOString(), amount:depositReturned, note: note || 'Bağlama zamanı depozit qaytarıldı' });
  }
  invoice.closingHistory = invoice.closingHistory || [];
  invoice.closingHistory.unshift({ id:`close-${Date.now()}`, date:new Date().toISOString(), penaltyAmount, paidNow, depositReturned, note });
  invoice.isClosed = true;
  invoice.closedAt = new Date().toISOString();
  invoice.updatedAt = new Date().toISOString();
  recalcInvoiceTotals(invoice);
  invoices[index] = invoice;
  syncInvoiceCustomerHistory(invoice);
  setStorageData(STORAGE_KEYS.invoices, invoices);
  renderAll();
};

/* ===== Modul 1: Müştərilər — SQL Server (API) ===== */
function mapCustomerDto(d) {
  return {
    id: d.id,
    name: d.name || '',
    phone: d.phone || '',
    extraPhone: d.extraPhone || '',
    address: d.address || '',
    note: d.note || '',
    debt: Number(d.debt || 0),
    deposit: Number(d.deposit || 0),
    activeInvoiceCount: Number(d.activeInvoiceCount || 0),
    history: []   // digər bölmələrin crash olmaması üçün
  };
}

// Profil qaimələri üçün sadə status (overdue/today/soon/normal/closed)
function profileInvoiceStatus(inv) {
  if (inv.isClosed) return { label: 'Bağlı', cls: 'closed' };
  const days = Math.round((new Date(inv.returnDate) - new Date(new Date().toDateString())) / 86400000);
  if (days < 0) return { label: 'Gecikir', cls: 'overdue' };
  if (days === 0) return { label: 'Bu gün', cls: 'today' };
  if (days <= 3) return { label: 'Yaxın', cls: 'soon' };
  return { label: 'Normal', cls: 'normal' };
}

async function renderCustomers() {
  if (!customersList) return;
  customersList.className = 'simple-list customer-list-clean';
  customersList.innerHTML = '<div class="simple-item">Yüklənir…</div>';

  let data;
  try {
    data = await API.customers.list();
  } catch (e) {
    customersList.innerHTML = '<div class="simple-item">Xəta: ' + escapeHtml(e.message || 'Yüklənmədi') + '</div>';
    return;
  }
  customers = data.map(mapCustomerDto);

  const q = (currentCustomerSearchFilter || '').trim().toLowerCase();
  const rows = customers
    .filter(c => !q || [c.name, c.phone, c.extraPhone, c.address].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'az'));

  if (!rows.length) {
    customersList.innerHTML = '<div class="simple-item">' + (q ? 'Axtarışa uyğun müştəri tapılmadı' : 'Müştəri yoxdur') + '</div>';
    return;
  }

  customersList.innerHTML = rows.map(item => `
    <div class="customer-row-card">
      <div class="customer-row-top">
        <div class="customer-main-info">
          <div class="customer-name-line">
            <h3>${escapeHtml(item.name)}</h3>
            <div class="customer-mini-pills">
              <span class="customer-mini-pill debt">Borc: ${formatMoney(item.debt)}</span>
              <span class="customer-mini-pill deposit">Depozit: ${formatMoney(item.deposit)}</span>
            </div>
          </div>
          <div class="customer-mini-meta"><span>📞 ${escapeHtml(item.phone || '-')}</span><span>Aktiv qaimə: ${item.activeInvoiceCount}</span></div>
        </div>
        <div class="customer-row-actions">
          <button class="action-btn edit" onclick="toggleCustomerDetail('${item.id}')">Ətraflı</button>
          <button class="action-btn return" onclick="toggleCustomerHistory('${item.id}')">Tarixçə</button>
          <button class="action-btn print" onclick="printCustomerInvoices('${item.id}')">Bütün qaimələri çap et</button>
          <button class="action-btn close" onclick="openCustomerTransactionModal('${item.id}','debt-add')">Borc əlavə et</button>
          <button class="action-btn print" onclick="openCustomerTransactionModal('${item.id}','payment')">Ödəniş et</button>
          <button class="action-btn return" onclick="openCustomerTransactionModal('${item.id}','deposit-to-debt')">Depozitlə ödə</button>
          <button class="action-btn edit" onclick="openCustomerModal('${item.id}')">Edit</button>
          <button class="action-btn delete" onclick="deleteCustomer('${item.id}')">Sil</button>
        </div>
      </div>
      <div class="customer-expand-area hidden" id="detail-${item.id}"></div>
      <div class="customer-expand-area hidden" id="history-${item.id}"></div>
    </div>`).join('');
}

function customerDetailHtml(p) {
  const line = inv => {
    const st = profileInvoiceStatus(inv);
    return `<div class="cust-inv-line"><div><strong>${escapeHtml(inv.invoiceNo || '-')}</strong> <span class="badge ${st.cls}">${st.label}</span></div>` +
      `<div class="simple-item-sub">İcarə: ${formatDate(inv.invoiceDate)} · Qaytarma: ${formatDate(inv.returnDate)}</div>` +
      `<div class="simple-item-sub">Ümumi: ${formatMoney(inv.totalAmount)} · Borc: ${formatMoney(inv.remainingDebt)}</div>` +
      `<button class="action-btn edit" onclick="editInvoice('${inv.id}')">Bax</button></div>`;
  };
  return `
    <div class="customer-detail-grid">
      <div class="customer-detail-card"><strong>Telefon</strong><div class="simple-item-sub">${escapeHtml(p.phone || '-')}</div></div>
      <div class="customer-detail-card"><strong>Əlavə telefon</strong><div class="simple-item-sub">${escapeHtml(p.extraPhone || '-')}</div></div>
      <div class="customer-detail-card"><strong>Ünvan</strong><div class="simple-item-sub">${escapeHtml(p.address || '-')}</div></div>
      <div class="customer-detail-card"><strong>Aktiv borc</strong><div class="simple-item-sub">${formatMoney(p.debt)}</div></div>
      <div class="customer-detail-card"><strong>Qalan depozit</strong><div class="simple-item-sub">${formatMoney(p.deposit)}</div></div>
    </div>
    <div class="customer-invoice-split">
      <div class="cust-inv-col"><h4>Aktiv qaimələr (${p.activeInvoices.length})</h4>${p.activeInvoices.length ? p.activeInvoices.map(line).join('') : '<div class="simple-item-sub">Aktiv qaimə yoxdur</div>'}</div>
      <div class="cust-inv-col"><h4>Köhnə qaimələr (${p.closedInvoices.length})</h4>${p.closedInvoices.length ? p.closedInvoices.map(line).join('') : '<div class="simple-item-sub">Köhnə qaimə yoxdur</div>'}</div>
    </div>
    <div class="customer-actions-grid">
      <button class="action-btn return" onclick="openCustomerTransactionModal('${p.id}','deposit-add')">Depozit əlavə et</button>
      <button class="action-btn edit" onclick="openCustomerTransactionModal('${p.id}','deposit-remove')">Depozit çıx</button>
    </div>`;
}

function customerHistoryHtml(p) {
  if (!p.ledger || !p.ledger.length) return '<div class="empty-history">Tarixçə yoxdur</div>';
  return `<div class="table-wrap"><table>
    <thead><tr><th>Tarix</th><th>Əməliyyat</th><th>Məbləğ</th><th>Qeyd</th><th>Borc dəyişimi</th><th>Depozit dəyişimi</th></tr></thead>
    <tbody>${p.ledger.map(e => `
      <tr>
        <td>${formatDateTime(e.date)}</td>
        <td><span class="history-type-badge system">${escapeHtml(e.type || '')}</span></td>
        <td>${formatMoney(e.amount)}</td>
        <td>${escapeHtml(e.note || '')}${e.invoiceNo ? `<div class="history-note-muted">Qaimə: ${escapeHtml(e.invoiceNo)}</div>` : ''}</td>
        <td><span class="mono-amount ${amountClass(e.debtChange)}">${formatSignedMoney(e.debtChange)}</span></td>
        <td><span class="mono-amount ${amountClass(e.depositChange)}">${formatSignedMoney(e.depositChange)}</span></td>
      </tr>`).join('')}</tbody></table></div>`;
}

async function toggleCustomerPanelApi(id, kind) {
  const panel = document.getElementById((kind === 'detail' ? 'detail-' : 'history-') + id);
  if (!panel) return;
  if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  panel.innerHTML = '<div class="simple-item-sub">Yüklənir…</div>';
  let p;
  try { p = await API.customers.profile(id); }
  catch (e) { panel.innerHTML = '<div class="simple-item-sub">Xəta: ' + escapeHtml(e.message || '') + '</div>'; return; }
  panel.innerHTML = (kind === 'detail') ? customerDetailHtml(p) : customerHistoryHtml(p);
}
window.toggleCustomerDetail = function (id) { toggleCustomerPanelApi(id, 'detail'); };
window.toggleCustomerHistory = function (id) { toggleCustomerPanelApi(id, 'history'); };

async function saveCustomerTransaction() {
  if (!activeCustomerTransaction) return;
  const customerId = Number(activeCustomerTransaction.customerId);
  const amount = Number(customerTransactionAmountInput.value || 0);
  if (amount <= 0) return alert('Məbləği düzgün yaz.');
  const date = customerTransactionDateInput.value ? new Date(customerTransactionDateInput.value).toISOString() : new Date().toISOString();
  const note = customerTransactionNoteInput.value.trim();
  const actionType = activeCustomerTransaction.actionType;
  const dto = { customerId, amount, date, note };

  try {
    if (actionType === 'debt-add') {
      await API.ledger.addDebt(dto);
    } else if (actionType === 'deposit-add') {
      await API.ledger.addDeposit(dto);
    } else if (actionType === 'deposit-remove') {
      await API.ledger.withdrawDeposit(dto);
    } else if (actionType === 'payment') {
      await API.ledger.payDebt(dto);
    } else if (actionType === 'deposit-to-debt') {
      // Depoziti çıx, sonra borca köçür (iki addım)
      await API.ledger.withdrawDeposit(dto);
      await API.ledger.payDebt(dto);
    }
  } catch (e) {
    return alert(e.message || 'Əməliyyat alınmadı.');
  }

  closeModal(customerTransactionModal);
  activeCustomerTransaction = null;
  renderCustomers();
}

(function ensureV7Styles(){
  const style = document.createElement('style');
  style.textContent = `.hidden{display:none !important}.return-component-grid{display:grid;gap:10px}.return-component-row{display:grid;grid-template-columns:1.2fr 170px 1fr;gap:10px;align-items:end}@media (max-width:900px){.return-component-row{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
})();

/* ===== v8 clean close modal ===== */
const invoiceCloseModal = document.getElementById('invoiceCloseModal');
const invoiceCloseModalTitle = document.getElementById('invoiceCloseModalTitle');
const invoiceCloseSummaryNo = document.getElementById('invoiceCloseSummaryNo');
const invoiceCloseSummaryDebt = document.getElementById('invoiceCloseSummaryDebt');
const invoiceCloseSummaryDeposit = document.getElementById('invoiceCloseSummaryDeposit');
const invoiceCloseDateInput = document.getElementById('invoiceCloseDateInput');
const invoiceClosePaidInput = document.getElementById('invoiceClosePaidInput');
const invoiceCloseDepositReturnedInput = document.getElementById('invoiceCloseDepositReturnedInput');
const invoiceClosePenaltyInput = document.getElementById('invoiceClosePenaltyInput');
const invoiceClosePenaltyReasonInput = document.getElementById('invoiceClosePenaltyReasonInput');
const invoiceCloseNoteInput = document.getElementById('invoiceCloseNoteInput');
const invoiceCloseHelperBox = document.getElementById('invoiceCloseHelperBox');
const saveInvoiceCloseBtn = document.getElementById('saveInvoiceCloseBtn');
let activeInvoiceCloseId = null;

function getInvoiceCloseContext(invoice) {
  const customer = getCustomerByInvoice(invoice);
  const ledger = customer ? getCustomerLedger(customer) : { debt: 0, deposit: Number(invoice.depositAmount || 0) };
  return {
    customer,
    ledger,
    availableDeposit: Math.max(Number(ledger.deposit || 0), 0),
    remainingDebt: Math.max(Number(invoice.remainingDebt || 0), 0),
    allReturned: isInvoiceFullyReturned(invoice)
  };
}

function updateInvoiceCloseHelper() {
  if (!activeInvoiceCloseId || !invoiceCloseHelperBox) return;
  const invoice = invoices.find(item => String(item.id) === String(activeInvoiceCloseId));
  if (!invoice) return;
  const ctx = getInvoiceCloseContext(invoice);
  const paidNow = Number(invoiceClosePaidInput.value || 0);
  const depositReturned = Number(invoiceCloseDepositReturnedInput.value || 0);
  const penalty = Number(invoiceClosePenaltyInput.value || 0);
  const projectedDebt = Math.max(ctx.remainingDebt + penalty - paidNow, 0);
  const projectedDeposit = Math.max(ctx.availableDeposit - depositReturned, 0);
  invoiceCloseHelperBox.innerHTML = `
    <div><strong>Hazırki vəziyyət:</strong> Borc ${formatMoney(ctx.remainingDebt)} / Depozit ${formatMoney(ctx.availableDeposit)}</div>
    <div><strong>Bağlamadan sonra:</strong> Borc ${formatMoney(projectedDebt)} / Depozit ${formatMoney(projectedDeposit)}</div>
    <div><strong>Mal vəziyyəti:</strong> ${ctx.allReturned ? 'Bütün qaytarılan mallar tamamlanıb.' : 'Qaimədə hələ qaytarılmamış mallar var.'}</div>
  `;
}

window.closeInvoice = function(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  if (invoice.isClosed) return alert('Bu qaimə artıq bağlanıb.');
  activeInvoiceCloseId = invoiceId;
  invoiceCloseModalTitle.textContent = `Qaiməni bağla — ${invoice.invoiceNo || '-'}`;
  invoiceCloseSummaryNo.textContent = invoice.invoiceNo || '-';
  invoiceCloseSummaryDebt.textContent = formatMoney(invoice.remainingDebt);
  invoiceCloseSummaryDeposit.textContent = formatMoney(invoice.depositAmount);
  invoiceCloseDateInput.value = toDateTimeLocalValue();
  invoiceClosePaidInput.value = Math.max(Number(invoice.remainingDebt || 0), 0).toFixed(2);
  invoiceCloseDepositReturnedInput.value = '0';
  invoiceClosePenaltyInput.value = '0';
  invoiceClosePenaltyReasonInput.value = '';
  invoiceCloseNoteInput.value = '';
  try { if (typeof updateInvoiceCloseHelper === 'function') updateInvoiceCloseHelper(); } catch (e) {}
  openModal(invoiceCloseModal);
};

async function saveInvoiceCloseOperation() {
  const invoice = invoices.find(item => String(item.id) === String(activeInvoiceCloseId));
  if (!invoice) return;
  const closeDate = invoiceCloseDateInput.value ? new Date(invoiceCloseDateInput.value) : new Date();
  if (Number.isNaN(closeDate.getTime())) return alert('Tarix düzgün deyil.');
  const paidNow = Number(invoiceClosePaidInput.value || 0);
  const depositReturned = Number(invoiceCloseDepositReturnedInput.value || 0);
  const penaltyAmount = Number(invoiceClosePenaltyInput.value || 0);
  const penaltyReason = invoiceClosePenaltyReasonInput.value.trim();
  const note = invoiceCloseNoteInput.value.trim();

  if (paidNow < 0 || depositReturned < 0 || penaltyAmount < 0) return alert('Məbləğlər mənfi ola bilməz.');
  if (depositReturned > Number(invoice.depositAmount || 0)) return alert('Bu qədər depozit qaytarmaq olmaz.');
  if (penaltyAmount > 0 && !penaltyReason) return alert('Cərimə səbəbini yaz.');

  const iso = closeDate.toISOString();
  const cid = Number(invoice.customerId);
  try {
    if (penaltyAmount > 0) await API.ledger.addDebt({ customerId: cid, amount: penaltyAmount, date: iso, note: penaltyReason || 'Cərimə' });
    if (paidNow > 0) await API.payments.add({ invoiceId: Number(invoice.id), amount: paidNow, direction: 'In', date: iso, note: note || 'Bağlama ödənişi' });
    if (depositReturned > 0) await API.ledger.withdrawDeposit({ customerId: cid, amount: depositReturned, date: iso, note: note || 'Bağlamada depozit qaytarıldı' });
    await API.invoices.close(invoice.id);
  } catch (e) {
    return alert(e.message || 'Bağlama alınmadı.');
  }

  closeModal(invoiceCloseModal);
  activeInvoiceCloseId = null;
  renderAll();
}

[invoiceClosePaidInput, invoiceCloseDepositReturnedInput, invoiceClosePenaltyInput].forEach(input => {
  if (input) input.addEventListener('input', updateInvoiceCloseHelper);
});
if (saveInvoiceCloseBtn) saveInvoiceCloseBtn.addEventListener('click', saveInvoiceCloseOperation);
if (invoiceCloseModal) {
  invoiceCloseModal.addEventListener('click', e => {
    if (e.target === invoiceCloseModal) closeModal(invoiceCloseModal);
  });
}


function getInvoiceAgeDays(invoice) {
  const value = getInvoiceEffectiveDate(invoice);
  if (!value) return 0;
  const start = new Date(value);
  const today = new Date();
  start.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  return Math.max(Math.round((today - start) / 86400000), 0);
}

function getOpenDebtInvoices() {
  return invoices
    .filter(invoice => !invoice.isClosed && Number(invoice.remainingDebt || 0) > 0)
    .sort((a, b) => Number(b.remainingDebt || 0) - Number(a.remainingDebt || 0));
}

/* ===== Modul 7: Borclar (müştəri əsaslı) — SQL Server (API) ===== */
async function renderDebtsSection() {
  const tbody = document.getElementById('debtTableBody');
  const summary = document.getElementById('debtSummaryGrid');
  if (!tbody || !summary) return;
  tbody.innerHTML = '<tr><td colspan="6">Yüklənir…</td></tr>';
  let list, custs;
  try {
    [list, custs] = await Promise.all([API.invoices.list('', 'open'), API.customers.list().catch(() => [])]);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6">Xəta: ' + escapeHtml(e.message || '') + '</td></tr>'; return;
  }
  const openDebts = list.filter(i => Number(i.remainingDebt || 0) > 0);

  const byCustomer = {};
  openDebts.forEach(i => {
    const cid = String(i.customerId);
    if (!byCustomer[cid]) byCustomer[cid] = { invoices: [], overdueDebt: 0, latest: 0 };
    const g = byCustomer[cid];
    g.invoices.push(i);
    if (i.status === 'overdue') g.overdueDebt += Number(i.remainingDebt || 0);
    const rd = i.returnDate ? new Date(i.returnDate).getTime() : 0;
    if (rd && rd > g.latest) g.latest = rd;
  });

  const rows = (custs || [])
    .map(c => {
      const g = byCustomer[String(c.id)] || { invoices: [], overdueDebt: 0, latest: 0 };
      return { id: c.id, name: c.name, phone: c.phone || '', debt: Number(c.debt || 0), overdue: g.overdueDebt, latest: g.latest, invoices: g.invoices };
    })
    .filter(r => r.debt > 0.005)
    .sort((a, b) => b.debt - a.debt);

  const totalDebt = rows.reduce((s, r) => s + r.debt, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
  const overdueCustomers = rows.filter(r => r.overdue > 0).length;
  const top = rows[0];

  summary.innerHTML = `
    <div class="report-box"><h4>Borclu müştəri</h4><strong>${rows.length}</strong><small>Borcu olan müştərilər</small></div>
    <div class="report-box"><h4>Ümumi borc</h4><strong>${formatMoney(totalDebt)}</strong><small>Bütün müştərilərin borcu</small></div>
    <div class="report-box"><h4>Gecikən borc</h4><strong>${formatMoney(totalOverdue)}</strong><small>${overdueCustomers} müştəri gecikib${top ? ` / Ən çox: ${escapeHtml(top.name)} (${formatMoney(top.debt)})` : ''}</small></div>`;

  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6">Açıq borc yoxdur</td></tr>'; return; }

  tbody.innerHTML = rows.map(r => {
    const hasOverdue = r.overdue > 0;
    const detailRows = r.invoices.length
      ? r.invoices.slice().sort((a, b) => Number(b.remainingDebt || 0) - Number(a.remainingDebt || 0)).map(inv => `
          <tr>
            <td><strong>${escapeHtml(inv.invoiceNo || '-')}</strong></td>
            <td>${formatDate(inv.invoiceDate)}</td>
            <td>${formatDate(inv.returnDate)}</td>
            <td>${inv.status === 'overdue' ? `<span class="badge red">gecikib</span>` : `<span class="badge green">vaxtında</span>`}</td>
            <td><strong>${formatMoney(inv.remainingDebt)}</strong></td>
            <td><div class="action-cell"><button class="action-btn pay" onclick="openInvoicePaymentModal('${inv.id}')">Ödəniş et</button><button class="action-btn edit" onclick="editInvoice('${inv.id}')">Qaimə</button></div></td>
          </tr>`).join('')
      : '<tr><td colspan="6">Bu borc qaiməyə bağlı deyil (manual borc).</td></tr>';
    return `
      <tr class="${hasOverdue ? 'row-risk-high' : ''}">
        <td><strong>${escapeHtml(r.name || '-')}</strong></td>
        <td>${escapeHtml(r.phone || '-')}</td>
        <td><strong>${formatMoney(r.debt)}</strong></td>
        <td>${hasOverdue ? `<span class="balance-negative">${formatMoney(r.overdue)}</span>` : '—'}</td>
        <td>${r.latest ? formatDate(new Date(r.latest).toISOString()) : '—'}</td>
        <td><div class="action-cell">
          <button class="action-btn pay" onclick="openCustomerTransactionModal('${r.id}','payment')">Borcu ödə</button>
          <button class="action-btn edit" onclick="toggleDebtDetail('${r.id}')">Ətraflı bax</button>
        </div></td>
      </tr>
      <tr class="debt-detail-row hidden" id="debt-detail-${r.id}">
        <td colspan="6">
          <div class="table-wrap"><table>
            <thead><tr><th>Qaimə</th><th>Tarix</th><th>Qaytarma</th><th>Status</th><th>Borc</th><th>Əməliyyat</th></tr></thead>
            <tbody>${detailRows}</tbody>
          </table></div>
        </td>
      </tr>`;
  }).join('');
}

window.toggleDebtDetail = function (customerId) {
  var el = document.getElementById('debt-detail-' + customerId);
  if (el) el.classList.toggle('hidden');
};

async function renderDepositsSection() {
  const tbody = document.getElementById('depositTableBody');
  const summary = document.getElementById('depositSummaryGrid');
  if (!tbody || !summary) return;
  tbody.innerHTML = '<tr><td colspan="7">Yüklənir…</td></tr>';
  let data;
  try { data = await API.customers.list(); }
  catch (e) { tbody.innerHTML = '<tr><td colspan="7">Xəta: ' + escapeHtml(e.message || '') + '</td></tr>'; return; }
  const rows = data
    .map(c => ({ id: c.id, name: c.name, phone: c.phone || '', extraPhone: c.extraPhone || '', deposit: Number(c.deposit || 0), debt: Number(c.debt || 0), activeInvoices: Number(c.activeInvoiceCount || 0) }))
    .filter(r => r.deposit > 0)
    .sort((a, b) => b.deposit - a.deposit || b.debt - a.debt);
  const totalDeposit = rows.reduce((s, r) => s + r.deposit, 0);
  const usable = rows.filter(r => r.deposit > 0 && r.debt > 0).length;
  const pure = rows.filter(r => r.deposit > 0 && r.debt <= 0).length;
  summary.innerHTML = `
    <div class="report-box"><h4>Ümumi depozit</h4><strong>${formatMoney(totalDeposit)}</strong><small>Qalan depozit</small></div>
    <div class="report-box"><h4>Depozitlə bağlana bilən</h4><strong>${usable}</strong><small>Borcu+depoziti olan</small></div>
    <div class="report-box"><h4>Təmiz depozit qalığı</h4><strong>${pure}</strong><small>Yalnız depozit qalan</small></div>`;
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7">Depozit məlumatı yoxdur</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => {
    const net = r.deposit - r.debt;
    const cls = net > 0 ? 'balance-positive' : net < 0 ? 'balance-negative' : 'balance-neutral';
    return `
      <tr>
        <td><strong>${escapeHtml(r.name)}</strong></td>
        <td>${escapeHtml(r.phone)}<div class="phone-mini">${escapeHtml(r.extraPhone)}</div></td>
        <td><strong>${formatMoney(r.deposit)}</strong></td>
        <td>${formatMoney(r.debt)}</td>
        <td><span class="${cls}">${formatMoney(Math.abs(net))}${net < 0 ? ' borc qalır' : net > 0 ? ' artıq depozit' : ''}</span></td>
        <td>${r.activeInvoices}</td>
        <td><div class="action-cell"><button class="action-btn deposit-pay" onclick="openCustomerTransactionModal('${r.id}','deposit-to-debt')">Depozitlə ödə</button><button class="action-btn print" onclick="openCustomerTransactionModal('${r.id}','deposit-remove')">Depozit çıx</button></div></td>
      </tr>`;
  }).join('');
}

window.switchToCustomerFromInvoice = function(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice) return;
  const customer = getCustomerByInvoice(invoice);
  const customersLink = document.querySelector('[data-section="customersSection"]');
  switchSection('customersSection', customersLink);
  if (!customer) return;
  const detail = document.getElementById(`detail-${customer.id}`);
  if (detail && detail.classList.contains('hidden')) detail.classList.remove('hidden');
};

/* ===== v19 view / safe actions / zero-filter fixes ===== */
function invoiceViewItemRows(invoice) {
  const rows = [];
  (invoice.items || []).forEach(item => {
    const baseName = item.label || item.category || '-';
    if (item.components && typeof item.components === 'object') {
      Object.entries(item.components).forEach(([key, comp]) => {
        const qty = Number(comp.quantity ?? comp.qty ?? 0);
        if (qty <= 0) return;
        const returned = Number(comp.returnedQuantity || 0);
        const left = Math.max(qty - returned, 0);
        rows.push({
          category: item.category || '-',
          name: comp.label || key,
          qty,
          unit: comp.unit || 'ədəd',
          price: Number(comp.price || comp.customPrice || 0),
          total: Number(comp.subtotal || 0),
          note: returned ? `Qaytarılıb: ${returned}, Qalıq: ${left}` : ''
        });
      });
      return;
    }
    rows.push({
      category: item.category || '-',
      name: item.size || baseName,
      qty: Number(item.quantity || 1),
      unit: item.unit || 'ədəd',
      price: Number(item.customPrice || 0),
      total: Number(item.subtotal || 0),
      note: item.note || ''
    });
  });
  return rows;
}

window.viewInvoice = function(invoiceId) {
  const invoice = invoices.find(item => String(item.id) === String(invoiceId));
  if (!invoice || !invoiceViewModal || !invoiceViewBody) return;
  activeViewInvoiceId = invoiceId;
  if (invoiceViewTitle) invoiceViewTitle.textContent = `Qaiməyə baxış — ${invoice.invoiceNo || '-'}`;
  const customer = getCustomerByInvoice(invoice) || {};
  const rows = invoiceViewItemRows(invoice);
  const status = getInvoiceStatus(invoice);
  invoiceViewBody.innerHTML = `
    <div class="invoice-view-hero"><div><h2>${escapeHtml(invoice.invoiceNo || '-')}</h2><div class="muted">${formatDate(invoice.invoiceDate || invoice.createdAt)} tarixli qaimə</div></div><div class="invoice-view-badges"><span class="badge ${getBadgeClass(status)}">${status}</span><span class="customer-mini-pill debt">Borc: ${formatMoney(invoice.remainingDebt)}</span><span class="customer-mini-pill deposit">Depozit: ${formatMoney(invoice.depositAmount)}</span></div></div>
    <div class="invoice-view-top">
      <div class="invoice-view-card"><h4>Qaimə məlumatı</h4><p><strong>Qaimə №:</strong> ${escapeHtml(invoice.invoiceNo || '-')}</p><p><strong>Tarix:</strong> ${formatDate(invoice.invoiceDate || invoice.createdAt)}</p><p><strong>Qaytarma:</strong> ${formatDate(invoice.returnDate)}</p></div>
      <div class="invoice-view-card"><h4>Müştəri</h4><p><strong>Ad:</strong> ${escapeHtml(invoice.customer || customer.name || '-')}</p><p><strong>Telefon:</strong> ${escapeHtml(invoice.phone || customer.phone || '-')}</p>${customer.extraPhone ? `<p><strong>Əlavə nömrə:</strong> ${escapeHtml(customer.extraPhone)}</p>` : ''}<p><strong>Ünvan:</strong> ${escapeHtml(invoice.address || customer.address || '-')}</p></div>
      <div class="invoice-view-card"><h4>Məbləğ</h4><p><strong>Məbləğ:</strong> ${formatMoney(invoice.totalAmount)}</p><p><strong>Ödənilən:</strong> ${formatMoney(invoice.paidAmount)}</p><p><strong>Depozit:</strong> ${formatMoney(invoice.depositAmount)}</p><p><strong>Son borc:</strong> ${formatMoney(invoice.remainingDebt)}</p></div>
    </div>
    ${invoice.note ? `<div class="invoice-view-card"><h4>Qeyd</h4><p>${escapeHtml(invoice.note)}</p></div>` : ''}
    <div class="table-wrap"><table><thead><tr><th>Kateqoriya</th><th>Malın adı</th><th>Miqdar</th><th>Vahid</th><th>Qiymət</th><th>Məbləğ</th><th>Qeyd</th></tr></thead><tbody>${rows.length ? rows.map(row => `<tr><td>${escapeHtml(row.category)}</td><td><strong>${escapeHtml(row.name)}</strong></td><td>${row.qty}</td><td>${escapeHtml(row.unit)}</td><td>${formatMoney(row.price)}</td><td>${formatMoney(row.total)}</td><td>${escapeHtml(row.note || '-')}</td></tr>`).join('') : '<tr><td colspan="7">Mal yoxdur</td></tr>'}</tbody></table></div>
  `;
  openModal(invoiceViewModal);
};

invoiceViewPrintBtn?.addEventListener('click', () => {
  if (activeViewInvoiceId) printInvoice(activeViewInvoiceId);
});
invoiceViewEditBtn?.addEventListener('click', () => { if (activeViewInvoiceId) editInvoice(activeViewInvoiceId); });
invoiceViewDeleteBtn?.addEventListener('click', () => { if (activeViewInvoiceId) deleteInvoice(activeViewInvoiceId); });
invoiceViewModal?.addEventListener('click', e => { if (e.target === invoiceViewModal) closeModal(invoiceViewModal); });

// ===== Modul 4: Çap — SQL Server (API) override =====
// Qaimə malını çap üçün sətirlərə açır: Lesa/Təkərli lesa komponentləri ayrıca görünür.
function printExpandRows(it){
  const n = v => Number(v || 0);
  const cat = it.category || '';
  const lower = cat.toLowerCase();
  const isTekerli = lower.indexOf('təkərli') !== -1;
  const isLesa = !isTekerli && lower.indexOf('lesa') !== -1 &&
    (n(it.lesaHeadCount) || n(it.lesaLongRodCount) || n(it.lesaShortRodCount) || n(it.lesaFreeTaxtaCount) || n(it.lesaExtraTaxtaCount));
  const rows = [];
  if (isLesa) {
    const comps = [
      ['Başlıq', n(it.lesaHeadCount), n(it.lesaHeadPrice)],
      ['Uzun çubuq', n(it.lesaLongRodCount), 0],
      ['Balaca çubuq', n(it.lesaShortRodCount), 0],
      ['Taxta 5/15 3.00 (pulsuz)', n(it.lesaFreeTaxtaCount), 0],
      ['Əlavə taxta 5/15 3.00', n(it.lesaExtraTaxtaCount), n(it.lesaExtraTaxtaPrice)]
    ];
    comps.forEach(c => { if (c[1] > 0) rows.push({ category: cat, name: c[0], qty: c[1], unit: 'ədəd', price: c[2], total: c[1] * c[2] }); });
    if (rows.length) return rows;
  }
  if (isTekerli) {
    const day = n(it.dayCount), daily = n(it.dailyPrice);
    if (day > 0) rows.push({ category: cat, name: 'İcarə (günlük)', qty: day, unit: 'gün', price: daily, total: day * daily });
    const comps = [
      ['Başlıq', n(it.headCount), 0],
      ['Çubuq', n(it.rodCount), 0],
      ['Vilka', n(it.vilkaCount), 0],
      ['Təkərli lesa taxtası', n(it.boardCount), 0],
      ['Əlavə taxta', n(it.extraBoardCount), n(it.extraBoardPrice)]
    ];
    comps.forEach(c => { if (c[1] > 0) rows.push({ category: cat, name: c[0], qty: c[1], unit: 'ədəd', price: c[2], total: c[1] * c[2] }); });
    if (rows.length) return rows;
  }
  return [{ category: cat, name: it.label || it.size || '', qty: n(it.quantity), unit: it.unit || 'ədəd', price: n(it.customPrice), total: n(it.subtotal), note: it.note || '' }];
}

window.printInvoice = async function(invoiceId){
  let data;
  try { data = await API.invoices.print(invoiceId); }
  catch (e) { return alert(e.message || 'Çap məlumatı yüklənmədi.'); }
  const inv = data.invoice || {};
  const esc = v => String(v ?? '-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const m = v => Number(v || 0).toFixed(2) + ' AZN';
  const rows = (inv.items || []).reduce((a, it) => a.concat(printExpandRows(it)), []).map(r => `<tr><td>${esc(r.category)}</td><td>${esc(r.name)}${r.note ? `<div style="color:#555;font-size:11px">${esc(r.note)}</div>` : ''}</td><td class="center">${r.qty}</td><td class="center">${esc(r.unit)}</td><td class="money">${m(r.price)}</td><td class="money">${m(r.total)}</td></tr>`).join('');
  const w = window.open('', '_blank', 'width=900,height=900');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="az"><head><meta charset="UTF-8"><title>Qaimə ${esc(inv.invoiceNo)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #cbd5e1;padding:6px 8px;font-size:13px;text-align:left}th{background:#f8fafc}.center{text-align:center}.money{text-align:right}.muted{color:#555;font-size:12px}.tot{margin-top:14px;font-size:14px}</style></head><body>`
    + `<h1>${esc(data.companyName)} — Qaimə ${esc(inv.invoiceNo)}</h1>`
    + `<div class="muted">${esc(data.branchName || '')} · Çap: ${formatDate(new Date().toISOString())}</div>`
    + `<p><strong>Müştəri:</strong> ${esc(inv.customerName)} · ${esc(inv.phone || '-')}<br><strong>İcarə:</strong> ${formatDate(inv.invoiceDate)} · <strong>Qaytarma:</strong> ${formatDate(inv.returnDate)}</p>`
    + `<table><thead><tr><th>Kateqoriya</th><th>Ad/Ölçü</th><th>Say</th><th>Vahid</th><th>Qiymət</th><th>Cəm</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Mal yoxdur</td></tr>'}</tbody></table>`
    + `<div class="tot"><strong>Ümumi:</strong> ${m(inv.totalAmount)} · <strong>Ödənilib:</strong> ${m(inv.paidAmount)} · <strong>Depozit:</strong> ${m(inv.depositAmount)} · <strong>Qalıq borc:</strong> ${m(inv.remainingDebt)}</div>`
    + `</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
};

// ===== Modul 5: Qaytarma — SQL Server (API) override =====
let returnInvoiceData = null;
window.openReturnModal = async function(invoiceId){
  activeReturnInvoiceId = invoiceId;
  if (returnItemsBox) returnItemsBox.innerHTML = '<div class="simple-item-sub">Yüklənir…</div>';
  openModal(returnModal);
  let inv;
  try { inv = await API.invoices.get(invoiceId); }
  catch (e) { if (returnItemsBox) returnItemsBox.innerHTML = '<div class="simple-item-sub">Xəta: ' + escapeHtml(e.message || '') + '</div>'; return; }
  returnInvoiceData = inv;
  if (returnModalTitle) returnModalTitle.textContent = `Qaytarma — ${inv.invoiceNo || '-'}`;
  const rows = (inv.items || [])
    .filter(it => it.isReturnable && (Number(it.quantity || 0) - Number(it.returnedQuantity || 0)) > 0)
    .map(it => {
      const remaining = Math.max(Number(it.quantity || 0) - Number(it.returnedQuantity || 0), 0);
      return `<div class="return-item"><h4>${escapeHtml(it.label || it.category)}</h4><div class="return-row"><div><div>Miqdar: ${it.quantity}</div><div>Qalıq: ${remaining}</div></div><div class="form-group"><label>Qaytarılacaq miqdar</label><input type="text" inputmode="numeric" autocomplete="off" value="0" data-return-qty="${it.id}" data-max="${remaining}" oninput="this.value=this.value.replace(/[^0-9]/g,'');if(this.value!==''&&+this.value>+this.dataset.max)this.value=this.dataset.max;" /></div></div></div>`;
    }).join('');
  if (returnItemsBox) returnItemsBox.innerHTML = rows || '<div class="simple-item-sub">Qaytarıla bilən mal yoxdur.</div>';
};
function showSuccessAnim(message, cb) {
  var stale = document.getElementById('successAnimOverlay');
  if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
  if (!document.getElementById('successAnimStyles')) {
    var st = document.createElement('style');
    st.id = 'successAnimStyles';
    st.textContent =
      '#successAnimOverlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.5);backdrop-filter:blur(2px);animation:saFade .25s ease}' +
      '@keyframes saFade{from{opacity:0}to{opacity:1}}' +
      '.sa-card{background:#fff;border-radius:22px;padding:34px 30px 28px;max-width:360px;width:90%;text-align:center;box-shadow:0 24px 70px rgba(2,6,23,.32);animation:saPop .5s cubic-bezier(.16,1,.3,1)}' +
      '@keyframes saPop{0%{transform:translateY(18px) scale(.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}' +
      '.sa-check{width:88px;height:88px;margin:0 auto 18px;position:relative}' +
      '.sa-check svg{width:88px;height:88px;position:relative;z-index:1}' +
      '.sa-ring{position:absolute;inset:6px;border-radius:50%;background:rgba(34,197,94,.18);animation:saRing 1.8s ease-out infinite}' +
      '@keyframes saRing{0%{transform:scale(.7);opacity:.75}70%{transform:scale(1.3);opacity:0}100%{opacity:0}}' +
      '.sa-c{stroke:#22c55e;stroke-width:2.5;fill:#f0fdf4;stroke-dasharray:166;stroke-dashoffset:166;animation:saC .55s cubic-bezier(.65,0,.45,1) forwards}' +
      '@keyframes saC{to{stroke-dashoffset:0}}' +
      '.sa-p{stroke:#22c55e;stroke-width:4;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:48;stroke-dashoffset:48;animation:saP .35s cubic-bezier(.65,0,.45,1) .5s forwards}' +
      '@keyframes saP{to{stroke-dashoffset:0}}' +
      '.sa-title{margin:0;font-size:19px;color:#0f172a;font-weight:700;animation:saUp .4s ease .25s both}' +
      '@keyframes saUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(st);
  }
  var overlay = document.createElement('div');
  overlay.id = 'successAnimOverlay';
  overlay.innerHTML =
    '<div class="sa-card">' +
    '  <div class="sa-check"><span class="sa-ring"></span>' +
    '    <svg viewBox="0 0 56 56"><circle class="sa-c" cx="28" cy="28" r="26"/><path class="sa-p" d="M17 29 l7 7 l15 -16"/></svg>' +
    '  </div>' +
    '  <h3 class="sa-title">' + (message || 'Uğurla tamamlandı') + '</h3>' +
    '</div>';
  document.body.appendChild(overlay);
  var done = false;
  var finish = function () { if (done) return; done = true; if (overlay.parentNode) overlay.parentNode.removeChild(overlay); if (typeof cb === 'function') cb(); };
  overlay.addEventListener('click', finish);
  setTimeout(finish, 1700);
}

function saveReturnOperation(){
  if (!returnInvoiceData) return;
  const items = [];
  (returnInvoiceData.items || []).forEach(it => {
    const qi = returnItemsBox.querySelector(`[data-return-qty="${it.id}"]`);
    if (!qi) return;
    const qty = Number(qi.value || 0);
    if (qty > 0) items.push({ invoiceItemId: Number(it.id), quantity: qty });
  });
  if (!items.length) return alert('Ən azı 1 qaytarma yaz.');
  const invId = returnInvoiceData.id;
  API.returns.partial(invId, { items, refundAmount: 0, note: '' })
    .then(() => { closeModal(returnModal); returnInvoiceData = null; showSuccessAnim('Qaytarma tətbiq edildi.', renderAll); })
    .catch(e => alert(e.message || 'Qaytarma alınmadı.'));
}

// ===== Müştərinin BÜTÜN qaimələri — bir çap sənədi (API) =====
window.printCustomerInvoices = async function(customerId){
  let data;
  try { data = await API.customers.invoicesPrint(customerId); }
  catch (e) { return alert(e.message || 'Çap məlumatı yüklənmədi.'); }
  const list = data.invoices || [];
  if (!list.length) return alert('Bu müştərinin qaiməsi yoxdur.');
  const esc = v => String(v ?? '-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const m = v => Number(v || 0).toFixed(2) + ' AZN';

  const blocks = list.map(inv => {
    const rows = (inv.items || []).reduce((a, it) => a.concat(printExpandRows(it)), []).map(r => `<tr><td>${esc(r.category)}</td><td>${esc(r.name)}${r.note ? `<div style="color:#555;font-size:11px">${esc(r.note)}</div>` : ''}</td><td class="center">${r.qty}</td><td class="center">${esc(r.unit)}</td><td class="money">${m(r.price)}</td><td class="money">${m(r.total)}</td></tr>`).join('');
    return `
      <div class="inv-block">
        <h2>Qaimə ${esc(inv.invoiceNo)}${inv.isClosed ? ' (Bağlı)' : ''}</h2>
        <div class="muted">İcarə: ${formatDate(inv.invoiceDate)} · Qaytarma: ${formatDate(inv.returnDate)}</div>
        <table><thead><tr><th>Kateqoriya</th><th>Ad/Ölçü</th><th>Say</th><th>Vahid</th><th>Qiymət</th><th>Cəm</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">Mal yoxdur</td></tr>'}</tbody></table>
        <div class="tot"><strong>Ümumi:</strong> ${m(inv.totalAmount)} · <strong>Ödənilib:</strong> ${m(inv.paidAmount)} · <strong>Depozit:</strong> ${m(inv.depositAmount)} · <strong>Qalıq borc:</strong> ${m(inv.remainingDebt)}</div>
      </div>`;
  }).join('<hr/>');

  const grandTotal = list.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const grandDebt = list.reduce((s, i) => s + Number(i.remainingDebt || 0), 0);

  const w = window.open('', '_blank', 'width=950,height=950');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="az"><head><meta charset="UTF-8"><title>${esc(data.customerName)} — bütün qaimələr</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 2px}h2{font-size:16px;margin:14px 0 4px}table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #cbd5e1;padding:5px 8px;font-size:12px;text-align:left}th{background:#f8fafc}.center{text-align:center}.money{text-align:right}.muted{color:#555;font-size:12px}.tot{margin-top:6px;font-size:12px}.inv-block{page-break-inside:avoid}hr{border:none;border-top:1px dashed #cbd5e1;margin:14px 0}.grand{margin-top:18px;font-size:14px;border-top:2px solid #111;padding-top:8px}</style></head><body>`
    + `<h1>${esc(data.companyName)} — ${esc(data.customerName)}</h1>`
    + `<div class="muted">${esc(data.branchName || '')} · ${esc(data.phone || '')} · Çap: ${formatDate(new Date().toISOString())} · Qaimə sayı: ${list.length}</div>`
    + blocks
    + `<div class="grand"><strong>YEKUN — Ümumi məbləğ:</strong> ${m(grandTotal)} · <strong>Ümumi qalıq borc:</strong> ${m(grandDebt)}</div>`
    + `</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
};

// Apply v19 overrides after page load.
try { renderAll(); } catch (e) { console.error('v19 render refresh error', e); }

/* Çıxış düyməsi → təsdiq modalı → login */
(function () {
  var logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  function showLogoutConfirm() {
    if (document.getElementById('logoutConfirmOverlay')) return;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'logoutConfirmOverlay';
    overlay.innerHTML =
      '<div class="modal-card logout-modal-card" role="dialog" aria-modal="true" aria-labelledby="logoutConfirmTitle">' +
      '  <div class="logout-modal-icon">\u{1F6AA}</div>' +
      '  <h3 id="logoutConfirmTitle">Çıxış etmək istəyirsiniz?</h3>' +
      '  <p>Sessiyanız bağlanacaq və yenidən giriş etməli olacaqsınız.</p>' +
      '  <div class="modal-actions">' +
      '    <button type="button" class="secondary-btn" id="logoutCancelBtn">Ləğv et</button>' +
      '    <button type="button" class="primary-btn logout-confirm-btn" id="logoutConfirmBtn">Bəli, çıx</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);

    function close() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function onKey(ev) { if (ev.key === 'Escape') close(); }

    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.getElementById('logoutCancelBtn').addEventListener('click', close);
    document.getElementById('logoutConfirmBtn').addEventListener('click', function () {
      if (window.DB && window.DB.logout) window.DB.logout();
      window.location.href = '/Account/Logout';
    });
    var cancelBtn = document.getElementById('logoutCancelBtn');
    if (cancelBtn) cancelBtn.focus();
  }

  logoutBtn.addEventListener('click', function (e) { e.preventDefault(); showLogoutConfirm(); });
})();
