const STORAGE_KEYS = {
  customers: 'lesa_customers_v4',
  invoices: 'lesa_invoices_v4',
  extraCategories: 'lesa_extra_categories_v4',
  serviceCategories: 'lesa_service_categories_v4',
  standardProducts: 'lesa_standard_products_v1',
  poleCategories: 'lesa_pole_categories_v1'
};

const ONE_SIDE_BOY_DICT_RATE = 3;
const BOY_DICT_FLAT_RATE = 6;
const KSOK_DICT_RATE = 3;
const TAKHTA_METER_RATE = 0.6;
const ONE_SIDE_BOY_DICT_FIXED_SIDE = 1.52;

// Aktiv filial — biznes datası filiala görə ayrılır (açar + __filialId)
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
  poleCategories: 'lesa_pole_categories_v1'
};

function getAnyStorageData(primaryKey, legacyKey, fallback) {
  const primary = getStorageData(primaryKey, null);
  if (primary !== null) return primary;
  const legacy = getStorageData(legacyKey, null);
  return legacy !== null ? legacy : fallback;
}



function getStandardProducts(){
  const defaults = [
    { id:'boy-dikt', category:'Boy dikt', price:6, unit:'ədəd' },
    { id:'bir-terefi-boy-dikt', category:'Bir tərəfli boy dikt', price:3, unit:'m²' },
    { id:'ksok-dikt', category:'Kəsok dikt', price:3, unit:'m²' },
    { id:'taxta', category:'Taxta', price:0.60, unit:'m' },
    { id:'tekerli-lesa', category:'Təkərli lesa', price:20, unit:'gün' },
    { id:'demir-direk', category:'Dəmir dirək', price:0, unit:'ədəd' },
    { id:'neqliyyat', category:'Nəqliyyat', price:0, unit:'səfər' }
  ];
  const saved = getStorageData(STORAGE_KEYS.standardProducts, null);
  if (!Array.isArray(saved) || !saved.length) return defaults;
  return defaults.map(def => ({...def, ...(saved.find(x => x.id === def.id) || {})}));
}
// DÜZƏLİŞ: Kateqoriyalar səhifəsində (Kind=Standard, SQL) qiymət dəyişdirildikdə
// bura da əks olunsun deyə, əvvəlcə canlı API datasından (standardPriceByName)
// yoxlanılır — yalnız hələ yüklənməyibsə köhnə sessionStorage/hardcoded ehtiyat dəyər işlədilir.
function getStandardPrice(category, fallback){
  if (Object.prototype.hasOwnProperty.call(standardPriceByName, category)) {
    return Number(standardPriceByName[category].price || 0);
  }
  const item=getStandardProducts().find(x=>x.category===category);
  return item ? Number(item.price || 0) : fallback;
}
// Dəmir dirək ölçüləri SQL-dən (Kind=Pole) hydrate olunur — aşağıdakı keşdən gəlir.
let poleCatalogCache = [];
function getPoleCategories(){
  return poleCatalogCache.slice();
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatDateToInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateInvoiceNo() {
  // Ardıcıl avtomatik nömrə: QM-2026-000126 (mövcud nömrələrin sonundakı
  // ən böyük rəqəmdən +1). Sahə redaktə oluna bilən qalır.
  const year = new Date().getFullYear();
  let maxSeq = 0;
  try {
    (Array.isArray(invoices) ? invoices : []).forEach(function (inv) {
      const m = String(inv.invoiceNo || '').match(/(\d+)\s*$/);
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    });
  } catch (e) {}
  return `QM-${year}-${String(maxSeq + 1).padStart(6, '0')}`;
}

function normalizePhone(value) {
  return (value || '').replace(/[^\d+ ]/g, '').trim();
}

function addDaysToDate(dateString, days) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + Number(days || 0));
  return formatDateToInput(d);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
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

function ensureCustomerShape(customer) {
  return { ...customer, history: Array.isArray(customer.history) ? customer.history : [] };
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

  const extensionTotal = (invoice.extensionHistory || []).reduce((sum, x) => sum + Number(x.addedAmount || 0), 0);
  const refundTotal = (invoice.returnHistory || []).reduce((sum, x) => sum + Number(x.refundAmount || 0), 0);
  const baseBorrowAmount = Math.max(Number(invoice.totalAmount || 0) - extensionTotal + refundTotal, 0);
  const entries = [];
  if (baseBorrowAmount > 0) {
    entries.push({ id: `hist-${invoice.id}-base`, date: invoice.createdAt || invoice.invoiceDate || new Date().toISOString(), type: 'Mal götürüb', amount: Number(baseBorrowAmount.toFixed(2)), note: `${invoice.invoiceNo || '-'} üzrə qaimə yaradılıb`, debtChange: Number(baseBorrowAmount.toFixed(2)), depositChange: 0, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo || '', source: 'invoice' });
  }
  (invoice.extensionHistory || []).forEach((entry, index) => {
    const amt = Number(entry.addedAmount || 0); if (amt <= 0) return;
    entries.push({ id: `hist-${invoice.id}-ext-${index}`, date: entry.date || new Date().toISOString(), type: 'Borc əlavə olunub', amount: amt, note: `${invoice.invoiceNo || '-'} üzrə +${entry.months || 1} ay uzadılıb`, debtChange: amt, depositChange: 0, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo || '', source: 'invoice' });
  });
  (invoice.returnHistory || []).forEach((entry, index) => {
    const amt = Number(entry.refundAmount || 0); if (amt <= 0) return;
    entries.push({ id: `hist-${invoice.id}-ret-${index}`, date: entry.date || new Date().toISOString(), type: 'Mal qaytarıb', amount: amt, note: `${invoice.invoiceNo || '-'} üzrə qaytarma`, debtChange: -amt, depositChange: 0, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo || '', source: 'invoice' });
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
  const deposit = Number(invoice.depositAmount || 0);
  if (deposit > 0) entries.push({ id: `hist-${invoice.id}-deposit`, date: invoice.updatedAt || invoice.createdAt || new Date().toISOString(), type: 'Depozit əlavə olunub', amount: deposit, note: `${invoice.invoiceNo || '-'} üzrə depozit`, debtChange: 0, depositChange: deposit, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo || '', source: 'invoice' });

  customers[customerIndex].history = [...(customers[customerIndex].history || []), ...entries.sort((a, b) => new Date(a.date) - new Date(b.date))];
  setStorageData(STORAGE_KEYS.customers, customers);
}

let customers = getAnyStorageData(STORAGE_KEYS.customers, LEGACY_KEYS.customers, []);
let invoices = getAnyStorageData(STORAGE_KEYS.invoices, LEGACY_KEYS.invoices, []).map(invoice => ({
  ...invoice,
  paymentHistory: normalizePaymentHistory(invoice),
  paidAmount: getInvoicePaidAmountFromHistory(invoice)
}));
let extraCategories = getAnyStorageData(STORAGE_KEYS.extraCategories, LEGACY_KEYS.extraCategories, []);
let serviceCategories = getAnyStorageData(STORAGE_KEYS.serviceCategories, LEGACY_KEYS.serviceCategories, []);
let poleCategories = getPoleCategories();
customers = customers.map(ensureCustomerShape);
let items = [];
let editInvoiceId = getQueryParam('id');
let selectedCustomerId = '';

const invoiceDate = document.getElementById('invoiceDate');
const invoiceNo = document.getElementById('invoiceNo');
const selectedCustomerName = document.getElementById('selectedCustomerName');
const customerPhone = document.getElementById('customerPhone');
const customerExtraPhone = document.getElementById('customerExtraPhone');
const customerAddress = document.getElementById('customerAddress');
const invoiceNote = document.getElementById('invoiceNote');
const returnDate = document.getElementById('returnDate');
const pageHeading = document.getElementById('pageHeading');
const pageSubHeading = document.getElementById('pageSubHeading');

const openCustomerPickerBtn = document.getElementById('openCustomerPickerBtn');
const openAddCustomerBtn = document.getElementById('openAddCustomerBtn');
const customerPickerModal = document.getElementById('customerPickerModal');
const closeCustomerPickerBtn = document.getElementById('closeCustomerPickerBtn');
const customerSearchInput = document.getElementById('customerSearchInput');
const customerList = document.getElementById('customerList');
const addCustomerModal = document.getElementById('addCustomerModal');
const closeAddCustomerBtn = document.getElementById('closeAddCustomerBtn');
const newCustomerName = document.getElementById('newCustomerName');
const newCustomerPhone = document.getElementById('newCustomerPhone');
const newCustomerExtraPhone = document.getElementById('newCustomerExtraPhone');
const newCustomerAddress = document.getElementById('newCustomerAddress');
const saveCustomerBtn = document.getElementById('saveCustomerBtn');

const itemCategory = document.getElementById('itemCategory');
const itemVariant = document.getElementById('itemVariant');
const itemQuantity = document.getElementById('itemQuantity');
const itemPrice = document.getElementById('itemPrice');
const itemNote = document.getElementById('itemNote');
const normalItemFields = document.getElementById('normalItemFields');
const taxtaFields = document.getElementById('taxtaFields');
const sheetItemFields = document.getElementById('sheetItemFields');
const lesaFields = document.getElementById('lesaFields');
const tekerliLesaFields = document.getElementById('tekerliLesaFields');
const transportFields = document.getElementById('transportFields');
const demirDirekFields = document.getElementById('demirDirekFields');

const taxtaType = document.getElementById('taxtaType');
const taxtaLength = document.getElementById('taxtaLength');
const taxtaRate = document.getElementById('taxtaRate');
const taxtaQuantity = document.getElementById('taxtaQuantity');
const taxtaPrice = document.getElementById('taxtaPrice');

const sheetSideA = document.getElementById('sheetSideA');
const sheetSideB = document.getElementById('sheetSideB');
const sheetArea = document.getElementById('sheetArea');
const sheetRate = document.getElementById('sheetRate');
const sheetQuantity = document.getElementById('sheetQuantity');
const sheetPrice = document.getElementById('sheetPrice');

const lesaHeadCount = document.getElementById('lesaHeadCount');
const lesaHeadPrice = document.getElementById('lesaHeadPrice');
const lesaLongRodCount = document.getElementById('lesaLongRodCount');
const lesaShortRodCount = document.getElementById('lesaShortRodCount');
const lesaFreeTaxtaCount = document.getElementById('lesaFreeTaxtaCount');
const lesaExtraTaxtaCount = document.getElementById('lesaExtraTaxtaCount');
const lesaExtraTaxtaPrice = document.getElementById('lesaExtraTaxtaPrice');

const tekerliHeadCount = document.getElementById('tekerliHeadCount');
const tekerliRodCount = document.getElementById('tekerliRodCount');
const tekerliVilkaCount = document.getElementById('tekerliVilkaCount');
const tekerliBoardCount = document.getElementById('tekerliBoardCount');
const tekerliExtraBoardCount = document.getElementById('tekerliExtraBoardCount');
const tekerliExtraBoardPrice = document.getElementById('tekerliExtraBoardPrice');
const tekerliDayCount = document.getElementById('tekerliDayCount');
const tekerliDailyPrice = document.getElementById('tekerliDailyPrice');

const demirDirekCategorySelect = document.getElementById('demirDirekCategorySelect');
const demirDirekQuantity = document.getElementById('demirDirekQuantity');
const demirDirekPrice = document.getElementById('demirDirekPrice');
const demirDirekPalesCount = document.getElementById('demirDirekPalesCount');
const demirDirekNote = document.getElementById('demirDirekNote');

const transportType = document.getElementById('transportType');
const transportPrice = document.getElementById('transportPrice');
const transportNote = document.getElementById('transportNote');

const addItemBtn = document.getElementById('addItemBtn');
const itemsTableBody = document.getElementById('itemsTableBody');
const totalAmount = document.getElementById('totalAmount');
const paidAmount = document.getElementById('paidAmount');
const depositAmount = document.getElementById('depositAmount');
const remainingDebt = document.getElementById('remainingDebt');
const saveInvoiceBtnTop = document.getElementById('saveInvoiceBtnTop');

function seedInitialData() {
  /* Seed silindi — bütün data API/SQL Server-dən gəlir (aşağıda hydrate olunur). */
}

function setTodayDefaults() {
  const today = new Date();
  if (!invoiceDate.value) invoiceDate.value = formatDateToInput(today);
  if (!returnDate.value) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    returnDate.value = formatDateToInput(nextMonth);
  }
  // Qaimə nömrəsi avtomatik doldurulmur — istifadəçi özü daxil edir (boş qoyularsa backend verir)
}

function syncReturnDateToNextMonth() {
  if (!invoiceDate.value) return;
  const selected = new Date(invoiceDate.value);
  if (Number.isNaN(selected.getTime())) return;
  selected.setMonth(selected.getMonth() + 1);
  returnDate.value = formatDateToInput(selected);
}

function getCategoryOptions() {
  return [
    { value: '', label: 'Kateqoriya seç' },
    { value: 'Lesa', label: 'Lesa' },
    { value: '60-lıq Lesa', label: '60-lıq Lesa' },
    { value: 'Təkərli lesa', label: 'Təkərli lesa' },
    { value: 'Taxta', label: 'Taxta' },
    { value: 'Dəmir dirək', label: 'Dəmir dirək' },
    { value: 'Bir tərəfli boy dikt', label: 'Bir tərəfli boy dikt' },
    { value: 'Boy dikt', label: 'Boy dikt' },
    { value: 'Kəsok dikt', label: 'Kəsok dikt' },
    { value: 'Nəqliyyat', label: 'Nəqliyyat' },
    { value: 'Əlavə kateqoriya', label: 'Əlavə kateqoriyası' },
    { value: 'Xidmət', label: 'Xidmət kateqoriyası' }
  ];
}

function renderCategorySelect() {
  itemCategory.innerHTML = getCategoryOptions().map(option => `<option value="${option.value}">${option.label}</option>`).join('');
}

function hideAllItemBlocks() {
  normalItemFields.classList.add('hidden');
  taxtaFields.classList.add('hidden');
  sheetItemFields.classList.add('hidden');
  lesaFields.classList.add('hidden');
  tekerliLesaFields.classList.add('hidden');
  transportFields.classList.add('hidden');
  demirDirekFields?.classList.add('hidden');
}

function setVariantOptions(list, selectedId = '') {
  itemVariant.innerHTML = list.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
  if (selectedId) itemVariant.value = selectedId;
}

function setupSheetFieldsByCategory(category) {
  if (category === 'Bir tərəfli boy dikt') {
    sheetSideA.value = ONE_SIDE_BOY_DICT_FIXED_SIDE;
    sheetSideA.readOnly = true;
    sheetRate.value = String(getStandardPrice('Bir tərəfli boy dikt', ONE_SIDE_BOY_DICT_RATE));
    if (!sheetSideB.value) sheetSideB.value = '1.00';
    recalcSheetPrice();
    return;
  }
  if (category === 'Kəsok dikt') {
    sheetSideA.value = '';
    sheetSideA.readOnly = false;
    sheetRate.value = String(getStandardPrice('Kəsok dikt', KSOK_DICT_RATE));
    if (!sheetSideB.value) sheetSideB.value = '0.50';
    recalcSheetPrice();
  }
}

function setQuantityLabel(text) {
  var lbl = document.querySelector('label[for="itemQuantity"]');
  if (lbl) lbl.textContent = text;
}

function refreshCategoryUI() {
  const category = itemCategory.value;
  hideAllItemBlocks();
  setQuantityLabel('Miqdar');

  if (!category) return;
  if (category === 'Lesa' || category === '60-lıq Lesa') { lesaFields.classList.remove('hidden'); updateLesaPreview(); return; }
  if (category === 'Təkərli lesa') { tekerliLesaFields.classList.remove('hidden'); return; }
  if (category === 'Taxta') { taxtaRate.value = formatMoney(getStandardPrice('Taxta', TAKHTA_METER_RATE)); taxtaFields.classList.remove('hidden'); recalcTaxtaPrice(); return; }
  if (category === 'Dəmir dirək') { fillDemirDirekCategorySelect(); demirDirekFields.classList.remove('hidden'); return; }
  if (category === 'Bir tərəfli boy dikt' || category === 'Kəsok dikt') { sheetItemFields.classList.remove('hidden'); setupSheetFieldsByCategory(category); return; }
  if (category === 'Nəqliyyat') { transportFields.classList.remove('hidden'); return; }

  normalItemFields.classList.remove('hidden');
  if (category === 'Boy dikt') {
    setVariantOptions([{ id: 'boy-dikt', name: 'Boy dikt' }], 'boy-dikt');
    itemPrice.value = formatMoney(getStandardPrice('Boy dikt', BOY_DICT_FLAT_RATE));
    itemQuantity.value = '1';
    return;
  }

  if (category === 'Əlavə kateqoriya') {
    setVariantOptions(extraCategories);
    const current = extraCategories.find(x => String(x.id) === String(itemVariant.value)) || extraCategories[0];
    itemPrice.value = current ? formatMoney(current.price) : '0.00';
    itemNote.value = current?.note || '';
    // Günlük tipli əlavə kateqoriyada "Miqdar" = gün sayı
    setQuantityLabel(current && current.type === 'daily' ? 'Gün sayı' : 'Miqdar');
    return;
  }

  if (category === 'Xidmət') {
    setVariantOptions(serviceCategories);
    const current = serviceCategories.find(x => String(x.id) === String(itemVariant.value)) || serviceCategories[0];
    itemPrice.value = current ? formatMoney(current.price) : '0.00';
    itemQuantity.value = '1';
    itemNote.value = current?.note || '';
  }
}

function recalcTaxtaPrice() {
  const length = Number(taxtaLength.value || 0);
  const rate = Number(taxtaRate.value || 0);
  const quantity = Number(taxtaQuantity.value || 0);
  taxtaPrice.value = (length * rate * quantity).toFixed(2);
}

function recalcSheetPrice() {
  const sideA = Number(sheetSideA.value || 0);
  const sideB = Number(sheetSideB.value || 0);
  const rate = Number(sheetRate.value || 0);
  const quantity = Number(sheetQuantity.value || 0);
  const area = sideA * sideB;
  sheetArea.value = area.toFixed(2);
  sheetPrice.value = (area * rate * quantity).toFixed(2);
}

function calculateLesaSubtotal(data) {
  // Qiymət = Başlıq + Əlavə taxta. Adi taxta (lesaFreeTaxta) PULSUZDUR.
  const boardPrice = Number(data.lesaExtraTaxtaPrice || 3);
  return (Number(data.lesaHeadCount || 0) * Number(data.lesaHeadPrice || 0)) + (Number(data.lesaExtraTaxtaCount || 0) * boardPrice);
}

function updateLesaPreview() {
  const el = document.getElementById('lesaSubtotalPreview');
  if (!el) return;
  const g = id => { const e = document.getElementById(id); return e ? e.value : 0; };
  const subtotal = calculateLesaSubtotal({
    lesaHeadCount: g('lesaHeadCount'),
    lesaHeadPrice: g('lesaHeadPrice'),
    lesaExtraTaxtaCount: g('lesaExtraTaxtaCount'),
    lesaExtraTaxtaPrice: g('lesaExtraTaxtaPrice')
  });
  el.value = formatMoney(subtotal);
}

(function () {
  ['lesaHeadCount', 'lesaHeadPrice', 'lesaExtraTaxtaCount', 'lesaExtraTaxtaPrice'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateLesaPreview);
  });
  updateLesaPreview();
})();

function calculateTekerliLesaSubtotal(data) {
  return (Number(data.dayCount || 0) * Number(data.dailyPrice || 0)) + (Number(data.extraBoardCount || 0) * Number(data.extraBoardPrice || 0));
}

function openCustomerPicker() {
  customerPickerModal.classList.remove('hidden');
  customerSearchInput.value = '';
  renderCustomerList(customers);
  setTimeout(() => customerSearchInput.focus(), 50);
}

function closeCustomerPicker() { customerPickerModal.classList.add('hidden'); }
function openAddCustomer() {
  addCustomerModal.classList.remove('hidden');
  newCustomerName.value = '';
  newCustomerPhone.value = '';
  newCustomerExtraPhone.value = '';
  newCustomerAddress.value = '';
}
function closeAddCustomer() { addCustomerModal.classList.add('hidden'); }

function selectCustomer(customer) {
  selectedCustomerId = customer.id || '';
  selectedCustomerName.value = customer.name || '';
  customerPhone.value = customer.phone || '';
  if (customerExtraPhone) customerExtraPhone.value = customer.extraPhone || '';
  customerAddress.value = customer.address || '';
  closeCustomerPicker();
}

function renderCustomerList(list) {
  if (!list.length) {
    customerList.innerHTML = '<div class="customer-list-empty">Müştəri tapılmadı</div>';
    return;
  }

  // Atribut dəyərlərini təhlükəsiz kodla (dırnaq və s. üçün)
  const ea = v => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  customerList.innerHTML = list.map(customer => `
    <button type="button" class="customer-item"
      data-id="${ea(customer.id)}" data-name="${ea(customer.name)}"
      data-phone="${ea(customer.phone)}" data-extra="${ea(customer.extraPhone)}"
      data-address="${ea(customer.address)}">
      <div class="customer-item-name">${ea(customer.name || '-')}</div>
      <div class="customer-item-meta">Telefon: ${ea(customer.phone || '-')}</div>
      <div class="customer-item-meta">Əlavə telefon: ${ea(customer.extraPhone || '-')}</div>
      <div class="customer-item-meta">Ünvan: ${ea(customer.address || '-')}</div>
    </button>
  `).join('');

  customerList.querySelectorAll('.customer-item').forEach(btn => {
    btn.addEventListener('click', () => {
      // Məlumat birbaşa data-* atributlarından — massiv axtarışından asılı deyil
      selectCustomer({
        id: btn.dataset.id,
        name: btn.dataset.name,
        phone: btn.dataset.phone,
        extraPhone: btn.dataset.extra,
        address: btn.dataset.address
      });
    });
  });
}

function filterCustomers() {
  const q = customerSearchInput.value.trim().toLowerCase();
  if (!q) return renderCustomerList(customers);
  renderCustomerList(customers.filter(customer =>
    [customer.name, customer.phone, customer.extraPhone, customer.address, String(customer.id)]
      .join(' ').toLowerCase().includes(q)));
}

function saveCustomer() {
  const name = newCustomerName.value.trim();
  const phone = normalizePhone(newCustomerPhone.value);
  const extraPhone = normalizePhone(newCustomerExtraPhone.value);
  const address = newCustomerAddress.value.trim();
  if (!name || !phone) return alert('Müştərinin adı və telefon nömrəsi mütləqdir.');

  const exists = customers.find(customer => customer.name.toLowerCase() === name.toLowerCase() || customer.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
  if (exists) return alert('Bu müştəri artıq mövcuddur.');

  saveCustomerViaApi({ name, phone, extraPhone, address });
}
async function saveCustomerViaApi(data) {
  let created;
  try { created = await API.customers.create({ name: data.name, phone: data.phone, extraPhone: data.extraPhone, address: data.address, note: '' }); }
  catch (e) { return alert(e.message || 'Müştəri yaradılmadı.'); }
  const customer = { id: created.id, name: created.name, phone: created.phone || '', extraPhone: created.extraPhone || '', address: created.address || '', history: [] };
  customers.push(customer);
  customers.sort((a, b) => a.name.localeCompare(b.name, 'az'));
  customerSearchInput.value = '';
  renderCustomerList(customers);
  selectCustomer(customer);
  closeAddCustomer();
}

function resetInputs() {
  itemQuantity.value = '1';
  itemPrice.value = '';
  itemNote.value = '';
  taxtaType.value = '';
  taxtaLength.value = '';
  taxtaRate.value = formatMoney(TAKHTA_METER_RATE);
  taxtaQuantity.value = '1';
  taxtaPrice.value = '';
  sheetSideA.value = '';
  sheetSideB.value = '';
  sheetArea.value = '';
  sheetRate.value = '';
  sheetQuantity.value = '1';
  sheetPrice.value = '';
  lesaHeadCount.value = '1';
  lesaHeadPrice.value = '5';
  lesaLongRodCount.value = '0';
  lesaShortRodCount.value = '0';
  lesaFreeTaxtaCount.value = '0';
  lesaExtraTaxtaCount.value = '0';
  lesaExtraTaxtaPrice.value = '3';
  tekerliHeadCount.value = '1';
  tekerliRodCount.value = '0';
  tekerliVilkaCount.value = '0';
  tekerliBoardCount.value = '0';
  tekerliExtraBoardCount.value = '0';
  tekerliExtraBoardPrice.value = '2';
  tekerliDayCount.value = '1';
  tekerliDailyPrice.value = formatMoney(getStandardPrice('Təkərli lesa', 20));
  fillDemirDirekCategorySelect();
  demirDirekQuantity.value = '1';
  demirDirekPalesCount.value = '0';
  demirDirekNote.value = '';
  transportType.value = '';
  transportPrice.value = '0';
  transportNote.value = '';
}

function addNormalItem() {
  const category = itemCategory.value;
  const quantity = Number(itemQuantity.value || 0);
  const price = Number(itemPrice.value || 0);
  if (quantity <= 0) return alert('Miqdarı düzgün yaz.');
  if (price < 0) return alert('Qiymət mənfi ola bilməz.');

  let label = category;
  let unit = 'ədəd';
  let variantId = '';
  let fixedFee = false;
  let note = itemNote.value.trim();
  let isDaily = false;
  let dueDate = '';

  if (category === 'Boy dikt') {
    label = 'Boy dikt';
  }

  if (category === 'Əlavə kateqoriya') {
    const selected = extraCategories.find(x => String(x.id) === String(itemVariant.value));
    if (!selected) return alert('Əlavə kateqoriya seç.');
    label = selected.name;
    unit = selected.unit || 'ədəd';
    variantId = selected.id;
    if (!note) note = selected.note || '';
    // Günlük tipli əlavə kateqoriya → Təkərli lesa kimi bitmə tarixi + bildiriş
    if (selected.type === 'daily') {
      if (!invoiceDate.value) return alert('Günlük mal üçün əvvəl tarix seç.');
      isDaily = true;
      dueDate = addDaysToDate(invoiceDate.value, quantity); // Miqdar = gün sayı
      unit = 'gün';
      note = `${note ? note + ' / ' : ''}Günlük mal — ${quantity} gün, vaxtı: ${dueDate}`;
    }
  }

  if (category === 'Xidmət') {
    const selected = serviceCategories.find(x => String(x.id) === String(itemVariant.value));
    if (!selected) return alert('Xidmət seç.');
    label = selected.name;
    unit = selected.unit || 'xidmət';
    variantId = selected.id;
    fixedFee = true;
    if (!note) note = selected.note || '';
  }

  const newItem = {
    id: `item-${Date.now()}-${Math.random()}`,
    category,
    label,
    variantId,
    size: label,
    unit,
    quantity,
    customPrice: price,
    subtotal: quantity * price,
    note,
    isReturnable: category !== 'Xidmət' && category !== 'Nəqliyyat',
    isRecurring: !isDaily && category !== 'Xidmət' && category !== 'Nəqliyyat',
    isFixedFee: fixedFee
  };
  if (isDaily) {
    newItem.rentMode = 'daily';
    newItem.dueDate = dueDate;
    newItem.dayCount = quantity;
    newItem.dailyPrice = price;
  }
  items.push(newItem);

  renderItems();
}

function addTaxtaItem() {
  const type = taxtaType.value;
  const length = Number(taxtaLength.value || 0);
  const rate = Number(taxtaRate.value || 0);
  const quantity = Number(taxtaQuantity.value || 0);
  const totalPrice = Number(taxtaPrice.value || 0);
  if (!type) return alert('Taxta növünü seç.');
  if (length <= 0) return alert('Uzunluğu düzgün yaz.');
  if (quantity <= 0) return alert('Miqdarı düzgün yaz.');

  items.push({
    id: `item-${Date.now()}-${Math.random()}`,
    category: 'Taxta',
    label: 'Taxta',
    size: `${type} / ${length.toFixed(2)} m`,
    unit: 'ədəd',
    quantity,
    customPrice: totalPrice / quantity,
    subtotal: totalPrice,
    note: `1 metr: ${formatMoney(rate)} AZN`,
    isReturnable: true,
    isRecurring: true
  });
  renderItems();
}

function addSheetItem() {
  const category = itemCategory.value;
  const sideA = Number(sheetSideA.value || 0);
  const sideB = Number(sheetSideB.value || 0);
  const rate = Number(sheetRate.value || 0);
  const quantity = Number(sheetQuantity.value || 0);
  const totalPrice = Number(sheetPrice.value || 0);
  const area = Number(sheetArea.value || 0);
  if (sideA <= 0 || sideB <= 0) return alert('Tərəfləri düzgün yaz.');
  if (quantity <= 0) return alert('Miqdarı düzgün yaz.');

  items.push({
    id: `item-${Date.now()}-${Math.random()}`,
    category,
    label: category,
    size: `${sideA.toFixed(2)} x ${sideB.toFixed(2)} m`,
    unit: 'ədəd',
    quantity,
    customPrice: totalPrice / quantity,
    subtotal: totalPrice,
    note: `Sahə: ${area.toFixed(2)} m², 1 m²: ${formatMoney(rate)} AZN`,
    isReturnable: true,
    isRecurring: true
  });
  renderItems();
}

function addLesaItem() {
  const data = {
    id: `item-${Date.now()}-${Math.random()}`,
    category: 'Lesa',
    label: 'Lesa',
    size: 'komplekt',
    unit: 'komplekt',
    quantity: 1,
    lesaHeadCount: Number(lesaHeadCount.value || 0),
    lesaHeadPrice: Number(lesaHeadPrice.value || 0),
    lesaLongRodCount: Number(lesaLongRodCount.value || 0),
    lesaShortRodCount: Number(lesaShortRodCount.value || 0),
    lesaFreeTaxtaCount: Number(lesaFreeTaxtaCount.value || 0),
    lesaExtraTaxtaCount: Number(lesaExtraTaxtaCount.value || 0),
    lesaExtraTaxtaPrice: Number(lesaExtraTaxtaPrice.value || 0),
    isReturnable: true,
    isRecurring: true
  };
  if (data.lesaHeadCount <= 0) return alert('Başlıq sayını yaz.');
  data.subtotal = calculateLesaSubtotal(data);
  data.note = `Başlıq: ${data.lesaHeadCount}, Uzun çubuq: ${data.lesaLongRodCount}, Balaca çubuq: ${data.lesaShortRodCount}, Taxta 5/15 3.00: ${data.lesaFreeTaxtaCount}, Əlavə taxta 5/15 3.00: ${data.lesaExtraTaxtaCount}`;
  items.push(data);
  renderItems();
}

function addTekerliLesaItem() {
  const dayCount = Number(tekerliDayCount.value || 0);
  const dailyPrice = Number(tekerliDailyPrice.value || 0);
  const extraBoardCount = Number(tekerliExtraBoardCount.value || 0);
  const extraBoardPrice = Number(tekerliExtraBoardPrice.value || 0);
  if (dayCount <= 0) return alert('Gün sayını düzgün yaz.');
  if (!invoiceDate.value) return alert('Əvvəl tarix seç.');

  const dueDate = addDaysToDate(invoiceDate.value, dayCount);
  const subtotal = (dayCount * dailyPrice) + (extraBoardCount * extraBoardPrice);
  items.push({
    id: `item-${Date.now()}-${Math.random()}`,
    category: 'Təkərli lesa',
    label: 'Təkərli lesa',
    size: 'komplekt',
    unit: 'komplekt',
    quantity: 1,
    rentMode: 'daily',
    dayCount,
    dueDate,
    headCount: Number(tekerliHeadCount.value || 0),
    rodCount: Number(tekerliRodCount.value || 0),
    vilkaCount: Number(tekerliVilkaCount.value || 0),
    boardCount: Number(tekerliBoardCount.value || 0),
    extraBoardCount,
    extraBoardPrice,
    dailyPrice,
    subtotal,
    note: `Başlıq: ${Number(tekerliHeadCount.value || 0)}, Çubuq: ${Number(tekerliRodCount.value || 0)}, Vilka: ${Number(tekerliVilkaCount.value || 0)}, Taxta: ${Number(tekerliBoardCount.value || 0)}, Əlavə taxta: ${extraBoardCount}, Gün: ${dayCount}, Vaxtı: ${dueDate}`,
    isReturnable: true,
    isRecurring: true
  });
  renderItems();
}


function fillDemirDirekCategorySelect(){
  poleCategories = getPoleCategories();
  if (!demirDirekCategorySelect) return;
  if (!poleCategories.length) {
    demirDirekCategorySelect.innerHTML = '<option value="">Ölçü yoxdur — Kateqoriyalar bölməsindən əlavə et</option>';
    demirDirekPrice.value = '0.00';
    return;
  }
  demirDirekCategorySelect.innerHTML = poleCategories.map(item => `<option value="${item.id}">${item.name} — ${Number(item.price || 0).toFixed(2)} AZN</option>`).join('');
  updateDemirDirekPriceFromCategory();
}
function getSelectedPoleCategory(){
  poleCategories = getPoleCategories();
  return poleCategories.find(x => String(x.id) === String(demirDirekCategorySelect?.value || ''));
}
function updateDemirDirekPriceFromCategory(){
  const item = getSelectedPoleCategory();
  demirDirekPrice.value = item ? Number(item.price || 0).toFixed(2) : '0.00';
}

function addDemirDirekItem() {
  const selectedPole = getSelectedPoleCategory();
  const quantity = Number(demirDirekQuantity.value || 0);
  const price = Number(selectedPole?.price || demirDirekPrice.value || 0);
  const pales = Number(demirDirekPalesCount.value || 0);
  const note = (demirDirekNote.value || '').trim();
  if (!selectedPole) return alert('Dəmir dirək ölçüsünü seç. Ölçüləri Kateqoriyalar bölməsindən əlavə edə bilərsən.');
  if (quantity <= 0) return alert('Dirək sayını düzgün yaz.');
  if (price < 0) return alert('Qiyməti düzgün yaz.');
  if (pales < 0) return alert('Pales sayını düzgün yaz.');
  const size = selectedPole.name || '';
  const subtotal = quantity * price;
  const label = `Dəmir dirək ${size}`.trim();
  const noteParts = [];
  noteParts.push(`Ölçü: ${size}`);
  if (pales > 0) noteParts.push(`Pales: ${pales} ədəd`);
  if (note) noteParts.push(note);
  items.push({
    id: `item-${Date.now()}-${Math.random()}`,
    category: 'Dəmir dirək',
    poleCategoryId: selectedPole.id,
    label,
    poleType: size,
    size,
    unit: 'ədəd',
    quantity,
    customPrice: price,
    subtotal,
    palesCount: pales,
    note: noteParts.join(' / '),
    isReturnable: true,
    isRecurring: true,
    components: [
      { key:'direk', label, quantity, returnedQuantity:0, unit:'ədəd', unitPrice:price },
      ...(pales > 0 ? [{ key:'pales', label:'Pales', quantity:pales, returnedQuantity:0, unit:'ədəd', unitPrice:0 }] : [])
    ]
  });
  renderItems();
}

function addTransportItem() {
  if (!transportType.value) return alert('Nəqliyyat növünü seç.');
  const price = Number(transportPrice.value || 0);
  if (price < 0) return alert('Qiyməti düzgün yaz.');

  const labels = { gedis: 'Gediş', gelis: 'Gəliş', ikisibirde: 'İkisi bir yerdə' };
  items.push({
    id: `item-${Date.now()}-${Math.random()}`,
    category: 'Nəqliyyat',
    label: labels[transportType.value],
    size: labels[transportType.value],
    unit: 'səfər',
    quantity: 1,
    customPrice: price,
    subtotal: price,
    note: transportNote.value.trim(),
    transportType: transportType.value,
    isReturnable: false,
    isRecurring: false,
    isFixedFee: true
  });
  renderItems();
}

function renderItems() {
  if (!items.length) {
    itemsTableBody.innerHTML = '<tr><td colspan="7" class="empty-row">Hələ mal əlavə edilməyib</td></tr>';
    recalcTotals();
    return;
  }

  itemsTableBody.innerHTML = items.map((item, index) => `
    <tr>
      <td>${item.category}</td>
      <td>${item.size || '-'}${item.note ? `<div class="item-note">${item.note}</div>` : ''}</td>
      <td>${item.quantity ?? '-'}</td>
      <td>${item.unit || '-'}</td>
      <td>${item.customPrice != null ? formatMoney(item.customPrice) : '-'}</td>
      <td>${formatMoney(item.subtotal)}</td>
      <td><button type="button" class="remove-btn" onclick="removeItem(${index})">Sil</button></td>
    </tr>
  `).join('');
  recalcTotals();
}

window.removeItem = function(index) {
  items.splice(index, 1);
  renderItems();
};

function recalcTotals() {
  const total = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const paid = Number(paidAmount.value || 0);
  const deposit = Number(depositAmount.value || 0);
  const debt = Math.max(total - paid, 0);
  totalAmount.value = formatMoney(total);
  remainingDebt.value = formatMoney(debt);
}

function validateInvoice() {
  // Qaimə nömrəsi məcburi deyil — boş qoyularsa backend avtomatik təyin edir
  if (!selectedCustomerName.value.trim()) return alert('Müştəri seç.'), false;
  if (!customerPhone.value.trim()) return alert('Müştəri telefonu boşdur.'), false;
  if (!invoiceDate.value || !returnDate.value) return alert('Tarix və ümumi təhvil tarixi mütləqdir.'), false;
  if (!items.length) return alert('Ən azı 1 mal əlavə et.'), false;
  return true;
}

function buildInvoicePayload() {
  const existingInvoice = editInvoiceId ? invoices.find(x => String(x.id) === String(editInvoiceId)) : null;
  const previousPaid = Number(existingInvoice?.paidAmount || 0);
  const nextPaid = Number(paidAmount.value || 0);
  const paymentDiff = Number((nextPaid - previousPaid).toFixed(2));
  const paymentHistory = existingInvoice ? normalizePaymentHistory(existingInvoice) : [];

  if (!existingInvoice && nextPaid > 0) {
    paymentHistory.unshift({
      id: `pay-${Date.now()}`,
      date: new Date().toISOString(),
      amount: nextPaid,
      note: 'İlkin ödəniş',
      direction: 'in'
    });
  }

  if (existingInvoice && paymentDiff !== 0) {
    paymentHistory.unshift({
      id: `pay-${Date.now()}`,
      date: new Date().toISOString(),
      amount: Math.abs(paymentDiff),
      note: paymentDiff > 0 ? 'Qaimə edit zamanı ödəniş əlavə edildi' : 'Qaimə edit zamanı ödəniş düzəlişi',
      direction: paymentDiff > 0 ? 'in' : 'out'
    });
  }

  return {
    id: editInvoiceId || `inv-${Date.now()}`,
    invoiceDate: invoiceDate.value,
    invoiceNo: invoiceNo.value.trim(),
    customerId: selectedCustomerId || (customers.find(c => (c.name || '').trim().toLowerCase() === selectedCustomerName.value.trim().toLowerCase() && (c.phone || '').trim() === customerPhone.value.trim())?.id || ''),
    customer: selectedCustomerName.value.trim(),
    phone: customerPhone.value.trim(),
    extraPhone: customerExtraPhone ? customerExtraPhone.value.trim() : '',
    address: customerAddress.value.trim(),
    note: invoiceNote.value.trim(),
    returnDate: returnDate.value,
    items: cloneData(items),
    totalAmount: Number(totalAmount.value || 0),
    paidAmount: nextPaid,
    paymentHistory,
    depositAmount: Number(depositAmount.value || 0),
    remainingDebt: Number(remainingDebt.value || 0),
    isClosed: editInvoiceId ? (existingInvoice?.isClosed || false) : false,
    updatedAt: new Date().toISOString(),
    createdAt: editInvoiceId ? (existingInvoice?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    extensionHistory: existingInvoice?.extensionHistory || [],
    returnHistory: existingInvoice?.returnHistory || []
  };
}

function saveInvoice() {
  if (!validateInvoice()) return;
  const invoice = buildInvoicePayload();
  const duplicate = invoices.find(item => item.invoiceNo.trim().toLowerCase() === invoice.invoiceNo.toLowerCase() && String(item.id) !== String(invoice.id));
  if (duplicate) return alert('Bu nömrəli qaimə artıq mövcuddur.');

  // Anbar qalığı yoxlaması — BLOKLAMIR, yalnız xəbərdarlıq edir (hər mal ayrıca)
  let shortages = [];
  try { shortages = computeStockShortages(invoice); } catch (e) { shortages = []; }
  if (shortages.length) {
    showStockShortageModal(shortages, function () { commitInvoice(invoice); });
    return;
  }
  commitInvoice(invoice);
}

function showResultModal(message, redirectUrl) {
  const stale = document.getElementById('resultModalOverlay');
  if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

  if (!document.getElementById('resultModalStyles')) {
    const st = document.createElement('style');
    st.id = 'resultModalStyles';
    st.textContent =
      '#resultModalOverlay{animation:rmFade .25s ease;backdrop-filter:blur(2px)}' +
      '@keyframes rmFade{from{opacity:0}to{opacity:1}}' +
      '.rm-card{background:#fff;border-radius:22px;padding:36px 30px 28px;max-width:380px;width:90%;text-align:center;box-shadow:0 24px 70px rgba(2,6,23,.32);animation:rmPop .5s cubic-bezier(.16,1,.3,1)}' +
      '@keyframes rmPop{0%{transform:translateY(18px) scale(.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}' +
      '.rm-check{width:92px;height:92px;margin:0 auto 20px;position:relative}' +
      '.rm-check svg{width:92px;height:92px;position:relative;z-index:1}' +
      '.rm-ring{position:absolute;inset:6px;border-radius:50%;background:rgba(34,197,94,.18);animation:rmRing 1.8s ease-out infinite}' +
      '@keyframes rmRing{0%{transform:scale(.7);opacity:.75}70%{transform:scale(1.3);opacity:0}100%{opacity:0}}' +
      '.rm-check-circle{stroke:#22c55e;stroke-width:2.5;fill:#f0fdf4;stroke-dasharray:166;stroke-dashoffset:166;animation:rmCircle .55s cubic-bezier(.65,0,.45,1) forwards}' +
      '@keyframes rmCircle{to{stroke-dashoffset:0}}' +
      '.rm-check-path{stroke:#22c55e;stroke-width:4;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:48;stroke-dashoffset:48;animation:rmPath .35s cubic-bezier(.65,0,.45,1) .5s forwards}' +
      '@keyframes rmPath{to{stroke-dashoffset:0}}' +
      '.rm-title{margin:0 0 7px;font-size:21px;color:#0f172a;font-weight:700;animation:rmUp .4s ease .2s both}' +
      '.rm-sub{margin:0 0 24px;font-size:13.5px;color:#64748b;animation:rmUp .4s ease .3s both}' +
      '@keyframes rmUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}' +
      '.rm-btn{width:100%;padding:13px;border:none;border-radius:13px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:filter .15s,transform .1s;box-shadow:0 8px 20px rgba(37,99,235,.32);animation:rmUp .4s ease .4s both}' +
      '.rm-btn:hover{filter:brightness(1.07)}' +
      '.rm-btn:active{transform:scale(.98)}' +
      '.rm-bar-wrap{height:5px;background:#eef2f7;border-radius:999px;overflow:hidden;margin-top:6px;animation:rmUp .4s ease .4s both}' +
      '.rm-bar{height:100%;width:0;background:linear-gradient(135deg,#22c55e,#16a34a);animation:rmBar 2.5s linear forwards}' +
      '@keyframes rmBar{to{width:100%}}';
    document.head.appendChild(st);
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'resultModalOverlay';
  overlay.innerHTML =
    '<div class="rm-card">' +
    '  <div class="rm-check"><span class="rm-ring"></span>' +
    '    <svg viewBox="0 0 56 56"><circle class="rm-check-circle" cx="28" cy="28" r="26"/><path class="rm-check-path" d="M17 29 l7 7 l15 -16"/></svg>' +
    '  </div>' +
    '  <h3 class="rm-title">' + message + '</h3>' +
    '  <p class="rm-sub">Dashboard səhifəsinə keçirilirsiniz…</p>' +
    '  <div class="rm-bar-wrap"><div class="rm-bar"></div></div>' +
    '</div>';
  document.body.appendChild(overlay);
  const go = function () { window.location.href = redirectUrl; };
  overlay.addEventListener('click', function (e) { if (e.target === overlay) go(); });
  setTimeout(go, 2500);
}

async function commitInvoice(invoice) {
  const num = v => (v === '' || v === null || v === undefined) ? null : Number(v);
  const dto = {
    invoiceNo: invoice.invoiceNo || null,
    customerId: Number(invoice.customerId) || 0,
    phone: invoice.phone || null,
    extraPhone: invoice.extraPhone || null,
    address: invoice.address || null,
    note: invoice.note || null,
    invoiceDate: invoice.invoiceDate,
    returnDate: invoice.returnDate,
    depositAmount: Number(invoice.depositAmount || 0),
    paidAmount: Number(invoice.paidAmount || 0),
    items: (invoice.items || []).map(it => ({
      category: String(it.category || ''),
      label: (it.label != null && it.label !== '') ? String(it.label) : null,
      variantId: (it.variantId != null && it.variantId !== '') ? String(it.variantId) : null,
      size: (it.size != null && it.size !== '') ? String(it.size) : null,
      unit: (it.unit != null && it.unit !== '') ? String(it.unit) : null,
      quantity: Number(it.quantity || 0), customPrice: Number(it.customPrice || 0), subtotal: Number(it.subtotal || 0),
      note: (it.note != null && it.note !== '') ? String(it.note) : (standardInfoByName[it.category] || null),
      isReturnable: it.isReturnable !== false, isRecurring: it.isRecurring !== false, isFixedFee: !!it.isFixedFee,
      rentMode: it.rentMode || null, dueDate: it.dueDate || null, dayCount: num(it.dayCount), dailyPrice: num(it.dailyPrice),
      lesaHeadCount: num(it.lesaHeadCount), lesaHeadPrice: num(it.lesaHeadPrice), lesaLongRodCount: num(it.lesaLongRodCount),
      lesaShortRodCount: num(it.lesaShortRodCount), lesaFreeTaxtaCount: num(it.lesaFreeTaxtaCount),
      lesaExtraTaxtaCount: num(it.lesaExtraTaxtaCount), lesaExtraTaxtaPrice: num(it.lesaExtraTaxtaPrice),
      headCount: num(it.headCount != null ? it.headCount : it.tekerliHeadCount), rodCount: num(it.rodCount != null ? it.rodCount : it.tekerliRodCount),
      vilkaCount: num(it.vilkaCount), boardCount: num(it.boardCount), extraBoardCount: num(it.extraBoardCount), extraBoardPrice: num(it.extraBoardPrice),
      poleCategoryId: it.poleCategoryId ? Number(it.poleCategoryId) : null, palesCount: num(it.palesCount)
    }))
  };
  let createdId = null;
  try {
    if (editInvoiceId) {
      await API.invoices.update(editInvoiceId, { id: Number(editInvoiceId), ...dto });
    } else {
      const created = await API.invoices.create(dto);
      createdId = created && created.id;
    }
  } catch (e) {
    return alert(e.message || 'Qaimə yadda saxlanmadı.');
  }
  if (editInvoiceId) {
    showResultModal('Qaimə yeniləndi.', '/Home/Index');
  } else {
    showResultModal('Qaimə uğurla yaradıldı.', '/Home/Index');
  }
}

/* ===== Anbar qalığı yoxlaması (bloklamayan xəbərdarlıq) ===== */
function _invUsageMap(list) {
  const usage = {};
  const add = (name, qty, returned) => {
    const n = (name || '-').trim().replace(/\s+/g, ' ');
    const out = Math.max(Number(qty || 0) - Number(returned || 0), 0);
    if (!n || n === '-' || out <= 0) return;
    usage[n] = (usage[n] || 0) + out;
  };
  (list || []).forEach(invoice => {
    if (invoice.isClosed) return;
    (invoice.items || []).forEach(item => {
      if (item.components && Array.isArray(item.components)) {
        item.components.forEach(comp => {
          const compName = comp.name || comp.label || comp.key || '';
          const nm = item.category === 'Dəmir dirək' && (comp.key === 'direk' || /Dəmir dirək/i.test(compName))
            ? `Dəmir dirək ${item.size || item.poleType || compName.replace(/Dəmir dirək/i, '').trim()}`.trim()
            : compName;
          add(nm, comp.quantity || comp.qty || 0, comp.returnedQuantity || 0);
        });
        return;
      }
      if (item.category === 'Lesa') {
        add('Lesa başlıq', item.lesaHeadCount || 0, item.returnedHeadCount || 0);
        add('Lesa uzun çubuq', item.lesaLongRodCount || 0, item.returnedLongRodCount || 0);
        add('Lesa balaca çubuq', item.lesaShortRodCount || 0, item.returnedShortRodCount || 0);
        add('Lesa taxta 5/15 3.00', item.lesaFreeTaxtaCount || 0, item.returnedFreeTaxtaCount || 0);
        add('Lesa əlavə taxta 5/15 3.00', item.lesaExtraTaxtaCount || 0, item.returnedExtraTaxtaCount || 0);
        return;
      }
      if (item.category === 'Təkərli lesa') {
        add('Təkərli lesa başlıq', item.headCount || item.tekerliHeadCount || 0, item.returnedHeadCount || 0);
        add('Təkərli lesa çubuq', item.rodCount || item.tekerliRodCount || 0, item.returnedRodCount || 0);
        add('Təkərli lesa vilka', item.vilkaCount || 0, item.returnedVilkaCount || 0);
        add('Təkərli lesa taxta', item.boardCount || 0, item.returnedBoardCount || 0);
        add('Təkərli lesa əlavə taxta', item.extraBoardCount || 0, item.returnedExtraBoardCount || 0);
        return;
      }
      if (item.category === 'Dəmir dirək') {
        add(`Dəmir dirək ${item.size || item.poleSize || item.poleType || ''}`.trim(), item.quantity || 0, item.returnedQuantity || 0);
        if (Number(item.palesCount || 0) > 0) add('Pales', item.palesCount || 0, item.returnedPalesCount || 0);
        return;
      }
      if (item.isReturnable !== false && item.category && item.category !== 'Xidmət' && item.category !== 'Nəqliyyat') {
        var bName = item.label || item.category;
        var invN = (item.category === 'Taxta' && item.size) ? (bName + ' ' + item.size) : bName;
        add(invN, item.quantity || 0, item.returnedQuantity || 0);
      }

    });
  });
  return usage;
}

function computeStockShortages(newInvoice) {
  let stock = {};
  try { stock = JSON.parse(sessionStorage.getItem(branchKey('lesa_inventory_v1'))) || {}; } catch (e) { stock = {}; }
  // Yalnız anbarda izlənən mallar yoxlanılır (izlənməyən mal üçün yanlış xəbərdarlıq olmasın)
  const others = (invoices || []).filter(inv =>
    String(inv.id) !== String(newInvoice.id) && String(inv.id) !== String(editInvoiceId || ''));
  const otherUsage = _invUsageMap(others);
  const newUsage = _invUsageMap([newInvoice]);
  const shortages = [];
  Object.keys(newUsage).forEach(name => {
    if (!Object.prototype.hasOwnProperty.call(stock, name)) return;
    const available = Number(stock[name] || 0) - Number(otherUsage[name] || 0);
    const need = Number(newUsage[name] || 0);
    if (need > available) shortages.push({ name: name, need: need, available: available });
  });
  return shortages;
}

function showStockShortageModal(shortages, onYes) {
  if (document.getElementById('stockWarnOverlay')) return;
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = shortages.map(s =>
    `<li><strong>${esc(s.name)}</strong> — lazım: ${s.need}, anbarda: ${s.available}</li>`).join('');
  const overlay = document.createElement('div');
  overlay.id = 'stockWarnOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;z-index:2000;padding:18px;';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:14px;max-width:460px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:inherit;">' +
    '<h3 style="margin:0 0 10px;color:#b45309;font-size:18px;">⚠️ Anbarda kifayət qədər mal yoxdur</h3>' +
    '<ul style="margin:0 0 14px;padding-left:18px;color:#334155;font-size:14px;line-height:1.6;">' + rows + '</ul>' +
    '<p style="margin:0 0 18px;color:#64748b;font-size:13px;">Yenə də davam etmək istəyirsiniz? Qalıq mənfi ola bilər.</p>' +
    '<div style="display:flex;justify-content:flex-end;gap:10px;">' +
    '<button id="stockWarnNo" style="padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:600;">Xeyr</button>' +
    '<button id="stockWarnYes" style="padding:9px 16px;border-radius:8px;border:0;background:#dc2626;color:#fff;cursor:pointer;font-weight:700;">Bəli, davam et</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('stockWarnNo').onclick = () => overlay.remove();
  document.getElementById('stockWarnYes').onclick = () => { overlay.remove(); if (typeof onYes === 'function') onYes(); };
}

function loadInvoiceForEdit() {
  if (!editInvoiceId) return;
  const invoice = invoices.find(item => String(item.id) === String(editInvoiceId));
  if (!invoice) return;

  pageHeading.textContent = 'Qaiməni edit et';
  pageSubHeading.textContent = `${invoice.invoiceNo} nömrəli qaimə`;
  invoiceDate.value = invoice.invoiceDate || '';
  invoiceNo.value = invoice.invoiceNo || '';
  selectedCustomerId = invoice.customerId || '';
  selectedCustomerName.value = invoice.customer || '';
  customerPhone.value = invoice.phone || '';
  if (customerExtraPhone) customerExtraPhone.value = invoice.extraPhone || '';
  customerAddress.value = invoice.address || '';
  invoiceNote.value = invoice.note || '';
  returnDate.value = invoice.returnDate || '';
  paidAmount.value = Number(invoice.paidAmount || 0);
  depositAmount.value = Number(invoice.depositAmount || 0);
  items = cloneData(invoice.items || []);
  renderItems();
}

openCustomerPickerBtn.addEventListener('click', openCustomerPicker);
closeCustomerPickerBtn.addEventListener('click', closeCustomerPicker);
customerSearchInput.addEventListener('input', filterCustomers);
openAddCustomerBtn.addEventListener('click', openAddCustomer);
closeAddCustomerBtn.addEventListener('click', closeAddCustomer);
saveCustomerBtn.addEventListener('click', saveCustomer);
customerPickerModal.addEventListener('click', e => { if (e.target === customerPickerModal) closeCustomerPicker(); });
addCustomerModal.addEventListener('click', e => { if (e.target === addCustomerModal) closeAddCustomer(); });
invoiceDate.addEventListener('change', syncReturnDateToNextMonth);
itemCategory.addEventListener('change', refreshCategoryUI);
itemVariant.addEventListener('change', refreshCategoryUI);
demirDirekCategorySelect?.addEventListener('change', updateDemirDirekPriceFromCategory);
taxtaLength.addEventListener('input', recalcTaxtaPrice);
taxtaRate.addEventListener('input', recalcTaxtaPrice);
taxtaQuantity.addEventListener('input', recalcTaxtaPrice);
sheetSideA.addEventListener('input', recalcSheetPrice);
sheetSideB.addEventListener('input', recalcSheetPrice);
sheetRate.addEventListener('input', recalcSheetPrice);
sheetQuantity.addEventListener('input', recalcSheetPrice);
paidAmount.addEventListener('input', recalcTotals);
depositAmount.addEventListener('input', recalcTotals);

addItemBtn.addEventListener('click', () => {
  const category = itemCategory.value;
  if (!category) return alert('Kateqoriya seç.');
  if (category === 'Lesa') return addLesaItem('Lesa'), resetInputs();
  if (category === '60-lıq Lesa') return addLesaItem('60-lıq Lesa'), resetInputs();
  if (category === 'Təkərli lesa') return addTekerliLesaItem(), resetInputs();
  if (category === 'Taxta') return addTaxtaItem(), resetInputs();
  if (category === 'Dəmir dirək') return addDemirDirekItem(), resetInputs();
  if (category === 'Bir tərəfli boy dikt' || category === 'Kəsok dikt') return addSheetItem(), resetInputs();
  if (category === 'Nəqliyyat') return addTransportItem(), resetInputs();
  addNormalItem();
  resetInputs();
  refreshCategoryUI();
});

saveInvoiceBtnTop.addEventListener('click', saveInvoice);

seedInitialData();
renderCategorySelect();
setTodayDefaults();
hideAllItemBlocks();
renderItems();
renderCustomerList(customers);
loadInvoiceForEdit();

// ===== Modul 4b: SQL-dən hydrate (müştərilər + kateqoriyalar) =====
let standardInfoByName = {};
let standardPriceByName = {}; // DÜZƏLİŞ: Kateqoriyalar səhifəsindəki canlı qiymətlər (Kind=Standard)
if (window.API) {
  Promise.all([
    API.customers.list().catch(() => []),
    API.categories.list('Extra').catch(() => []),
    API.categories.list('Service').catch(() => []),
    API.categories.list('Pole').catch(() => []),
    API.categories.list('Standard').catch(() => [])
  ]).then(([cs, ex, sv, po, st]) => {
    customers = cs.map(c => ({ id: c.id, name: c.name, phone: c.phone || '', extraPhone: c.extraPhone || '', address: c.address || '', history: [] }))
                  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'az'));
    extraCategories = ex.map(d => ({ id: d.id, name: d.name, price: Number(d.price || 0), unit: d.unit || '', note: d.note || '', type: d.rentType === 'Daily' ? 'daily' : 'monthly' }));
    serviceCategories = sv.map(d => ({ id: d.id, name: d.name, price: Number(d.price || 0), unit: d.unit || '', note: d.note || '', type: d.rentType === 'Daily' ? 'daily' : 'monthly' }));
    poleCatalogCache = po.map(d => ({ id: d.id, name: d.name, price: Number(d.price || 0), unit: d.unit || 'ədəd' }));
    poleCategories = poleCatalogCache.slice();
    standardInfoByName = {};
    standardPriceByName = {};
    (st || []).forEach(d => {
      if (!d || !d.name) return;
      standardInfoByName[d.name] = (d.info || '').trim();
      standardPriceByName[d.name] = { price: Number(d.price || 0), unit: d.unit || '' };
    });
    renderCustomerList(customers);
    try { if (typeof renderCategorySelect === 'function') renderCategorySelect(); } catch (e) {}
    // Qiymətlər indi hazırdır — əgər kateqoriya artıq seçilibsə (məs. edit rejimində),
    // görünən qiymət sahəsini təzələ ki, köhnə/sabit dəyər qalmasın.
    try { if (typeof refreshCategoryUI === 'function') refreshCategoryUI(); } catch (e) {}
  });
}


/* ===== v7 component-based rental overrides ===== */
function buildLesaComponents(data) {
  return [
    { key:'head', label:'Başlıq', quantity:Number(data.lesaHeadCount||0), returnedQuantity:0, unit:'ədəd', unitPrice:Number(data.lesaHeadPrice||0) },
    { key:'longRod', label:'Uzun çubuq', quantity:Number(data.lesaLongRodCount||0), returnedQuantity:0, unit:'ədəd', unitPrice:0 },
    { key:'shortRod', label:'Balaca çubuq', quantity:Number(data.lesaShortRodCount||0), returnedQuantity:0, unit:'ədəd', unitPrice:0 },
    { key:'freeBoard', label:'Taxta 5/15 3.00 (pulsuz)', quantity:Number(data.lesaFreeTaxtaCount||0), returnedQuantity:0, unit:'ədəd', unitPrice:0 },
    { key:'extraBoard', label:'Əlavə taxta 5/15 3.00', quantity:Number(data.lesaExtraTaxtaCount||0), returnedQuantity:0, unit:'ədəd', unitPrice:Number(data.lesaExtraTaxtaPrice||3) }
  ].filter(x=>x.quantity>0);
}

function buildTekerliComponents() {
  return [
    { key:'head', label:'Başlıq', quantity:Number(tekerliHeadCount.value||0), returnedQuantity:0, unit:'ədəd', unitPrice:0 },
    { key:'rod', label:'Çubuq', quantity:Number(tekerliRodCount.value||0), returnedQuantity:0, unit:'ədəd', unitPrice:0 },
    { key:'vilka', label:'Vilka', quantity:Number(tekerliVilkaCount.value||0), returnedQuantity:0, unit:'ədəd', unitPrice:0 },
    { key:'board', label:'Təkərli lesa taxtası', quantity:Number(tekerliBoardCount.value||0), returnedQuantity:0, unit:'ədəd', unitPrice:0 },
    { key:'extraBoard', label:'Əlavə taxta', quantity:Number(tekerliExtraBoardCount.value||0), returnedQuantity:0, unit:'ədəd', unitPrice:Number(tekerliExtraBoardPrice.value||0) }
  ].filter(x=>x.quantity>0);
}

function itemComponentSummary(item) {
  if (!Array.isArray(item.components) || !item.components.length) return item.note || '';
  return item.components.map(c => `${c.label}: ${Number(c.quantity||0)}`).join(', ');
}

function addLesaItem(categoryLabel = 'Lesa') {
  const data = {
    id: `item-${Date.now()}-${Math.random()}`,
    category: categoryLabel,
    label: categoryLabel,
    size: 'Hissələrlə',
    unit: 'dəst',
    quantity: 1,
    lesaHeadCount: Number(lesaHeadCount.value || 0),
    lesaHeadPrice: Number(lesaHeadPrice.value || 0),
    lesaLongRodCount: Number(lesaLongRodCount.value || 0),
    lesaShortRodCount: Number(lesaShortRodCount.value || 0),
    lesaFreeTaxtaCount: Number(lesaFreeTaxtaCount.value || 0),
    lesaExtraTaxtaCount: Number(lesaExtraTaxtaCount.value || 0),
    lesaExtraTaxtaPrice: Number(lesaExtraTaxtaPrice.value || 0),
    isReturnable: true,
    isRecurring: true
  };
  if (data.lesaHeadCount <= 0) return alert('Başlıq sayını yaz.');
  data.components = buildLesaComponents(data);
  data.subtotal = calculateLesaSubtotal(data);
  data.customPrice = data.subtotal;
  data.note = itemComponentSummary(data);
  items.push(data);
  renderItems();
}

function addTekerliLesaItem() {
  const dayCount = Number(tekerliDayCount.value || 0);
  const dailyPrice = Number(tekerliDailyPrice.value || 0);
  const extraBoardCount = Number(tekerliExtraBoardCount.value || 0);
  const extraBoardPrice = Number(tekerliExtraBoardPrice.value || 0);
  if (dayCount <= 0) return alert('Gün sayını düzgün yaz.');
  if (!invoiceDate.value) return alert('Əvvəl tarix seç.');
  const dueDate = addDaysToDate(invoiceDate.value, dayCount);
  const subtotal = (dayCount * dailyPrice) + (extraBoardCount * extraBoardPrice);
  const data = {
    id: `item-${Date.now()}-${Math.random()}`,
    category: 'Təkərli lesa',
    label: 'Təkərli lesa',
    size: 'Hissələrlə',
    unit: 'dəst',
    quantity: 1,
    rentMode: 'daily',
    dayCount,
    dueDate,
    dailyPrice,
    subtotal,
    customPrice: subtotal,
    note: `Gün: ${dayCount}, Vaxtı: ${dueDate}`,
    isReturnable: true,
    isRecurring: true,
    components: buildTekerliComponents()
  };
  if (!data.components.length) return alert('Ən azı 1 detal sayı yaz.');
  items.push(data);
  renderItems();
}

function renderItems() {
  if (!items.length) {
    itemsTableBody.innerHTML = '<tr><td colspan="7" class="empty-row">Hələ mal əlavə edilməyib</td></tr>';
    recalcTotals();
    return;
  }
  itemsTableBody.innerHTML = items.map((item, index) => {
    const detail = Array.isArray(item.components) && item.components.length
      ? `<div class="item-note">${item.components.map(c=>`${c.label}: ${c.quantity}`).join(' / ')}</div>${item.note ? `<div class="item-note">${item.note}</div>` : ''}`
      : `${item.note ? `<div class="item-note">${item.note}</div>` : ''}`;
    return `
      <tr>
        <td>${item.category}</td>
        <td>${item.size || '-'}${detail}</td>
        <td>${item.quantity ?? '-'}</td>
        <td>${item.unit || '-'}</td>
        <td>${item.customPrice != null ? formatMoney(item.customPrice) : '-'}</td>
        <td>${formatMoney(item.subtotal)}</td>
        <td><button type="button" class="remove-btn" onclick="removeItem(${index})">Sil</button></td>
      </tr>
    `;
  }).join('');
  recalcTotals();
}

function buildInvoicePayload() {
  const oldInvoice = invoices.find(x => String(x.id) === String(editInvoiceId));
  const paymentHistory = normalizePaymentHistory(oldInvoice || {});
  const currentPaid = Number(oldInvoice ? getInvoicePaidAmountFromHistory(oldInvoice) : 0);
  const desiredPaid = Number(paidAmount.value || 0);
  const diff = Number((desiredPaid - currentPaid).toFixed(2));
  if (diff > 0) {
    paymentHistory.unshift({
      id: `pay-${Date.now()}`,
      date: new Date().toISOString(),
      amount: diff,
      note: oldInvoice ? 'Edit zamanı əlavə ödəniş' : 'İlkin ödəniş',
      direction: 'in'
    });
  } else if (diff < 0) {
    paymentHistory.unshift({
      id: `pay-${Date.now()}`,
      date: new Date().toISOString(),
      amount: Math.abs(diff),
      note: 'Edit zamanı ödəniş düzəlişi',
      direction: 'out'
    });
  }
  const normalizedItems = cloneData(items).map(item => ({
    ...item,
    components: Array.isArray(item.components) ? item.components.map(c => ({ ...c, returnedQuantity: Number(c.returnedQuantity || 0) })) : undefined
  }));
  return {
    id: editInvoiceId || `inv-${Date.now()}`,
    invoiceDate: invoiceDate.value,
    invoiceNo: invoiceNo.value.trim(),
    customerId: selectedCustomerId || (customers.find(c => (c.name || '').trim().toLowerCase() === selectedCustomerName.value.trim().toLowerCase() && (c.phone || '').trim() === customerPhone.value.trim())?.id || ''),
    customer: selectedCustomerName.value.trim(),
    phone: customerPhone.value.trim(),
    extraPhone: customerExtraPhone ? customerExtraPhone.value.trim() : '',
    address: customerAddress.value.trim(),
    note: invoiceNote.value.trim(),
    returnDate: returnDate.value,
    items: normalizedItems,
    totalAmount: Number(totalAmount.value || 0),
    paidAmount: Number(desiredPaid.toFixed(2)),
    depositAmount: Number(depositAmount.value || 0),
    remainingDebt: Number(remainingDebt.value || 0),
    isClosed: oldInvoice?.isClosed || false,
    closedAt: oldInvoice?.closedAt || '',
    updatedAt: new Date().toISOString(),
    createdAt: oldInvoice?.createdAt || new Date().toISOString(),
    extensionHistory: oldInvoice?.extensionHistory || [],
    returnHistory: oldInvoice?.returnHistory || [],
    paymentHistory,
    depositReturnedHistory: oldInvoice?.depositReturnedHistory || [],
    closingHistory: oldInvoice?.closingHistory || []
  };
}

async function loadInvoiceForEdit() {
  if (!editInvoiceId) return;
  let invoice;
  try { invoice = await API.invoices.get(editInvoiceId); }
  catch (e) { alert(e.message || 'Redaktə ediləcək qaimə tapılmadı.'); return; }
  pageHeading.textContent = 'Qaiməni edit et';
  pageSubHeading.textContent = `${invoice.invoiceNo} nömrəli qaimə · Unikal ID: ${invoice.id}`;
  invoiceDate.value = (invoice.invoiceDate || '').slice(0, 10);
  invoiceNo.value = invoice.invoiceNo || '';
  selectedCustomerId = invoice.customerId || '';
  selectedCustomerName.value = invoice.customerName || '';
  customerPhone.value = invoice.phone || '';
  if (customerExtraPhone) customerExtraPhone.value = invoice.extraPhone || '';
  customerAddress.value = invoice.address || '';
  invoiceNote.value = invoice.note || '';
  returnDate.value = (invoice.returnDate || '').slice(0, 10);
  paidAmount.value = Number(invoice.paidAmount || 0);
  depositAmount.value = Number(invoice.depositAmount || 0);
  if (totalAmount) totalAmount.value = Number(invoice.totalAmount || 0);
  if (remainingDebt) remainingDebt.value = Number(invoice.remainingDebt || 0);
  items = cloneData(invoice.items || []);
  renderItems();
}
