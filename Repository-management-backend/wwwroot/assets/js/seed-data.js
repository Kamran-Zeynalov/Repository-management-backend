/* =====================================================================
   seed-data.js — FİLİAL ƏSASLI başlanğıc (mock) data.
   Hər filialın datası ayrıca açarlarda saxlanılır: lesa_*__<filialId>.
   dashboard.js / new-invoice.js getActiveBranch()-ə görə həmin açarları
   oxuyur. Beləliklə bir filialın datası digərinə görünmür.

   Saxlama sessionStorage-dadır — sessiya boyu dəyişikliklər qalır, brauzer
   bağlananda təmizlənir (qalıcı saxlama YOXDUR; restart-da ilkin vəziyyət).
   ===================================================================== */
(function () {
  "use strict";

  var SEEDED_FLAG = "lesa_seeded_session";
  var KEYS = {
    customers: "lesa_customers_v4",
    invoices: "lesa_invoices_v4",
    extra: "lesa_extra_categories_v4",
    service: "lesa_service_categories_v4",
    pole: "lesa_pole_categories_v1",
    inventory: "lesa_inventory_v1",
  };

  function read(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function isEmpty(v) {
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "object") return Object.keys(v).length === 0;
    return false;
  }
  function seedKey(fullKey, val) {
    if (isEmpty(read(fullKey))) { try { sessionStorage.setItem(fullKey, JSON.stringify(val)); } catch (e) {} }
  }
  function pay(id, amount, date) {
    return [{ id: id, date: date, amount: amount, note: "İlkin ödəniş", direction: "in" }];
  }
  function item(category, qty, price, opts) {
    return Object.assign({ category: category, size: "", note: "", quantity: qty, unit: "ədəd", customPrice: price, subtotal: Number((qty * price).toFixed(2)) }, opts || {});
  }

  /* ===================================================================
     FİLİAL DATALARI — borc/depozit/ödəniş qaimələrdən avtomatik qurulur,
     ona görə müştəri history-si boş qalır (syncInvoiceCustomerHistory).
     =================================================================== */
  var DATA = {
    /* --------------------------------------------------- MƏRDƏKAN (tam) */
    merdekan: {
      customers: [
        { id: "c1", name: "Bəyaz Tikinti MMC",  phone: "+994 50 555 11 22", extraPhone: "", address: "Mərdəkan, Atatürk pr. 12", note: "Daimi müştəri", history: [] },
        { id: "c2", name: "Akkord İnşaat",       phone: "+994 55 666 22 33", extraPhone: "", address: "Mərdəkan, Şərifzadə 45", note: "", history: [] },
        { id: "c3", name: "Murad Səfərov",       phone: "+994 70 777 33 44", extraPhone: "", address: "Mərdəkan, 18-ci sahə", note: "Fərdi", history: [] },
        { id: "c4", name: "Günay Construction",  phone: "+994 51 888 44 55", extraPhone: "+994 12 488 00 11", address: "Mərdəkan, Babək pr. 88", note: "Böyük layihə", history: [] },
        { id: "c5", name: "Elvin Tağıyev",       phone: "+994 77 999 55 66", extraPhone: "", address: "Mərdəkan, Kənd mərkəzi", note: "", history: [] }
      ],
      invoices: [
        { id: "inv-101", invoiceDate: "2026-05-12", invoiceNo: "QA-101", customerId: "c1", customer: "Bəyaz Tikinti MMC", phone: "+994 50 555 11 22", address: "Mərdəkan, Atatürk pr. 12", note: "Daimi müştəri", returnDate: "2026-07-12", items: [item("Boy dikt", 200, 6), item("Taxta", 500, 0.6, { unit: "m", size: "5/15" })], totalAmount: 1500, paidAmount: 500, paymentHistory: pay("pay-101", 500, "2026-05-20T10:00:00.000Z"), depositAmount: 300, remainingDebt: 1000, isClosed: false, createdAt: "2026-05-12T09:00:00.000Z", updatedAt: "2026-05-20T10:00:00.000Z", extensionHistory: [], returnHistory: [] },
        { id: "inv-102", invoiceDate: "2026-04-28", invoiceNo: "QA-102", customerId: "c2", customer: "Akkord İnşaat", phone: "+994 55 666 22 33", address: "Mərdəkan, Şərifzadə 45", note: "", returnDate: "2026-05-28", items: [item("Boy dikt", 100, 6), item("Ksok dikt", 200, 1, { unit: "m²" })], totalAmount: 800, paidAmount: 0, paymentHistory: [], depositAmount: 0, remainingDebt: 800, isClosed: false, createdAt: "2026-04-28T11:00:00.000Z", updatedAt: "2026-04-28T11:00:00.000Z", extensionHistory: [], returnHistory: [] },
        { id: "inv-103", invoiceDate: "2026-06-01", invoiceNo: "QA-103", customerId: "c3", customer: "Murad Səfərov", phone: "+994 70 777 33 44", address: "Mərdəkan, 18-ci sahə", note: "Fərdi sifariş", returnDate: "2026-07-01", items: [item("Boy dikt", 100, 6)], totalAmount: 600, paidAmount: 600, paymentHistory: pay("pay-103", 600, "2026-06-03T14:00:00.000Z"), depositAmount: 200, remainingDebt: 0, isClosed: false, createdAt: "2026-06-01T09:00:00.000Z", updatedAt: "2026-06-03T14:00:00.000Z", extensionHistory: [], returnHistory: [] },
        { id: "inv-104", invoiceDate: "2026-03-15", invoiceNo: "QA-104", customerId: "c4", customer: "Günay Construction", phone: "+994 51 888 44 55", extraPhone: "+994 12 488 00 11", address: "Mərdəkan, Babək pr. 88", note: "Böyük layihə", returnDate: "2026-04-15", items: [item("Boy dikt", 300, 6), item("Bir tərəfi boy dikt", 200, 1, { unit: "m²", size: "1.52" })], totalAmount: 2000, paidAmount: 700, paymentHistory: pay("pay-104", 700, "2026-04-02T13:00:00.000Z"), depositAmount: 500, remainingDebt: 1300, isClosed: false, createdAt: "2026-03-15T08:30:00.000Z", updatedAt: "2026-04-02T13:00:00.000Z", extensionHistory: [], returnHistory: [] },
        { id: "inv-105", invoiceDate: "2026-06-05", invoiceNo: "QA-105", customerId: "c5", customer: "Elvin Tağıyev", phone: "+994 77 999 55 66", address: "Mərdəkan, Kənd mərkəzi", note: "", returnDate: "2026-07-05", items: [item("Boy dikt", 50, 6), item("Ksok dikt", 100, 1, { unit: "m²" })], totalAmount: 400, paidAmount: 0, paymentHistory: [], depositAmount: 0, remainingDebt: 400, isClosed: false, createdAt: "2026-06-05T10:00:00.000Z", updatedAt: "2026-06-05T10:00:00.000Z", extensionHistory: [], returnHistory: [] },
        { id: "inv-106", invoiceDate: "2026-02-10", invoiceNo: "QA-106", customerId: "c1", customer: "Bəyaz Tikinti MMC", phone: "+994 50 555 11 22", address: "Mərdəkan, Atatürk pr. 12", note: "Tamamlanıb", returnDate: "2026-03-10", items: [item("Boy dikt", 100, 6)], totalAmount: 600, paidAmount: 600, paymentHistory: pay("pay-106", 600, "2026-03-08T12:00:00.000Z"), depositAmount: 0, remainingDebt: 0, isClosed: true, closedAt: "2026-03-10T16:00:00.000Z", createdAt: "2026-02-10T09:00:00.000Z", updatedAt: "2026-03-10T16:00:00.000Z", extensionHistory: [], returnHistory: [] }
      ],
      extra: [
        { id: "ex1", name: "Konuslu birləşdirici", price: 2, unit: "ədəd", note: "Əlavə hissə", type: "monthly" },
        { id: "ex2", name: "Vint-qayka dəsti", price: 0.5, unit: "ədəd", note: "", type: "monthly" }
      ],
      service: [
        { id: "sv1", name: "Quraşdırma", price: 50, unit: "xidmət", note: "Ustalar tərəfindən", type: "monthly" },
        { id: "sv2", name: "Sökülmə", price: 40, unit: "xidmət", note: "", type: "monthly" }
      ],
      pole: [
        { id: "pl1", name: "3.85", price: 8, unit: "ədəd", note: "Standart ölçü" },
        { id: "pl2", name: "1.70", price: 5, unit: "ədəd", note: "" },
        { id: "pl3", name: "5.50", price: 12, unit: "ədəd", note: "Uzun" }
      ],
      inventory: { "Boy dikt": 1000, "Taxta 5/15": 800, "Ksok dikt": 300, "Bir tərəfi boy dikt": 500, "Pales": 400, "Təkərli lesa başlıq": 50 }
    },

    /* --------------------------------------------------- PİRŞAĞI (fərqli) */
    pirsagi: {
      customers: [
        { id: "p1", name: "Cənub İnşaat MMC", phone: "+994 50 333 22 11", extraPhone: "", address: "Pirşağı, Sahil küç. 7", note: "Yeni müştəri", history: [] },
        { id: "p2", name: "Xəzər Tikinti",    phone: "+994 55 444 33 22", extraPhone: "", address: "Pirşağı, Mərkəz", note: "", history: [] },
        { id: "p3", name: "Ramin Quliyev",    phone: "+994 70 555 44 33", extraPhone: "", address: "Pirşağı, 3-cü sahə", note: "Fərdi", history: [] }
      ],
      invoices: [
        { id: "inv-p201", invoiceDate: "2026-06-02", invoiceNo: "PA-201", customerId: "p1", customer: "Cənub İnşaat MMC", phone: "+994 50 333 22 11", address: "Pirşağı, Sahil küç. 7", note: "", returnDate: "2026-07-02", items: [item("Boy dikt", 100, 6), item("Taxta", 500, 0.6, { unit: "m", size: "5/15" })], totalAmount: 900, paidAmount: 400, paymentHistory: pay("pay-p201", 400, "2026-06-05T10:00:00.000Z"), depositAmount: 100, remainingDebt: 500, isClosed: false, createdAt: "2026-06-02T09:00:00.000Z", updatedAt: "2026-06-05T10:00:00.000Z", extensionHistory: [], returnHistory: [] },
        { id: "inv-p202", invoiceDate: "2026-04-20", invoiceNo: "PA-202", customerId: "p2", customer: "Xəzər Tikinti", phone: "+994 55 444 33 22", address: "Pirşağı, Mərkəz", note: "", returnDate: "2026-05-20", items: [item("Boy dikt", 150, 6), item("Ksok dikt", 300, 1, { unit: "m²" })], totalAmount: 1200, paidAmount: 0, paymentHistory: [], depositAmount: 0, remainingDebt: 1200, isClosed: false, createdAt: "2026-04-20T11:00:00.000Z", updatedAt: "2026-04-20T11:00:00.000Z", extensionHistory: [], returnHistory: [] },
        { id: "inv-p203", invoiceDate: "2026-06-08", invoiceNo: "PA-203", customerId: "p3", customer: "Ramin Quliyev", phone: "+994 70 555 44 33", address: "Pirşağı, 3-cü sahə", note: "", returnDate: "2026-07-08", items: [item("Boy dikt", 50, 6), item("Bir tərəfi boy dikt", 200, 1, { unit: "m²", size: "1.52" })], totalAmount: 500, paidAmount: 500, paymentHistory: pay("pay-p203", 500, "2026-06-08T12:00:00.000Z"), depositAmount: 50, remainingDebt: 0, isClosed: false, createdAt: "2026-06-08T09:00:00.000Z", updatedAt: "2026-06-08T12:00:00.000Z", extensionHistory: [], returnHistory: [] }
      ],
      extra: [
        { id: "ex1", name: "Konuslu birləşdirici", price: 2, unit: "ədəd", note: "", type: "monthly" }
      ],
      service: [
        { id: "sv1", name: "Quraşdırma", price: 45, unit: "xidmət", note: "", type: "monthly" }
      ],
      pole: [
        { id: "pl1", name: "3.85", price: 8, unit: "ədəd", note: "" },
        { id: "pl2", name: "2.20", price: 6, unit: "ədəd", note: "" }
      ],
      inventory: { "Boy dikt": 600, "Taxta 5/15": 700, "Ksok dikt": 300, "Bir tərəfi boy dikt": 400 }
    },

    /* --------------------------------------------------- BAKI MƏRKƏZ (kiçik) */
    baku: {
      customers: [
        { id: "b1", name: "Mərkəz Tikinti MMC", phone: "+994 51 666 77 88", extraPhone: "", address: "Bakı, Nizami küç. 1", note: "", history: [] },
        { id: "b2", name: "Tural İnşaat",       phone: "+994 77 888 99 00", extraPhone: "", address: "Bakı, Xətai r.", note: "", history: [] }
      ],
      invoices: [
        { id: "inv-b301", invoiceDate: "2026-06-04", invoiceNo: "BM-301", customerId: "b1", customer: "Mərkəz Tikinti MMC", phone: "+994 51 666 77 88", address: "Bakı, Nizami küç. 1", note: "", returnDate: "2026-07-04", items: [item("Boy dikt", 100, 6), item("Bir tərəfi boy dikt", 100, 1, { unit: "m²", size: "1.52" })], totalAmount: 700, paidAmount: 700, paymentHistory: pay("pay-b301", 700, "2026-06-04T10:00:00.000Z"), depositAmount: 0, remainingDebt: 0, isClosed: false, createdAt: "2026-06-04T09:00:00.000Z", updatedAt: "2026-06-04T10:00:00.000Z", extensionHistory: [], returnHistory: [] }
      ],
      extra: [],
      service: [],
      pole: [{ id: "pl1", name: "3.85", price: 8, unit: "ədəd", note: "" }],
      inventory: { "Boy dikt": 300, "Bir tərəfi boy dikt": 200 }
    }
  };

  /* ----------------------------------------------------------- Seed (sessiyada bir dəfə) */
  if (sessionStorage.getItem(SEEDED_FLAG)) return;
  Object.keys(DATA).forEach(function (branchId) {
    var ds = DATA[branchId];
    seedKey(KEYS.customers + "__" + branchId, ds.customers);
    seedKey(KEYS.invoices + "__" + branchId, ds.invoices);
    seedKey(KEYS.extra + "__" + branchId, ds.extra);
    seedKey(KEYS.service + "__" + branchId, ds.service);
    seedKey(KEYS.pole + "__" + branchId, ds.pole);
    seedKey(KEYS.inventory + "__" + branchId, ds.inventory);
  });
  try { sessionStorage.setItem(SEEDED_FLAG, "1"); } catch (e) {}
})();
