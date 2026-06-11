const ACCESS_FLAG_KEY = 'novagest-auth';
const USER_ROLE_KEY = 'novagest-role';
const USER_EMAIL_KEY = 'novagest-email';
const USER_ID_KEY = 'novagest-user-id';
const ROLE_ADMIN = 'admin';
const ROLE_CLIENT = 'cliente';
const PRODUCT_IMAGE_STORAGE_KEY = 'novagest-product-images';
const CART_STORAGE_PREFIX = 'novagest-cart';
const PURCHASE_STORAGE_PREFIX = 'novagest-purchases';
const RECEIPT_STORAGE_KEY = 'novagest-electronic-receipts';
const RECEIPT_SEQUENCE_STORAGE_KEY = 'novagest-receipt-sequences';
const STORE_PROFILE_STORAGE_KEY = 'novagest-store-profile';
const FIXED_SHIPPING_COST = 10;
const DELIVERY_SHIPPING_COST_MAX = 15;
const SUPABASE_URL = 'https://goidjlsaxfzxzlgqvuik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvaWRqbHNheGZ6eHpsZ3F2dWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDM4NjYsImV4cCI6MjA5NjcxOTg2Nn0.Znwtt52qDkvoSCqtdEerJNKThrcFMKqV-B5IB7ZOKCw';
const INVENTORY_TABLE_NAME = 'products';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const THEME_STORAGE_KEY = 'novagest-theme';

function isSupabaseConfigured() {
    const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL);
    const keyOk = SUPABASE_ANON_KEY.length > 20;
    return urlOk && keyOk;
}

if (!supabaseClient || !isSupabaseConfigured()) {
    alert('Configura SUPABASE_URL y SUPABASE_ANON_KEY en panel.html antes de usar el panel.');
}

const sampleProducts = [
    { id: 'PRD-001', name: 'Laptop empresarial', stock: 12, price: 1850, category: 'Tecnología', fecha_vencimiento: '2027-12-31' },
    { id: 'PRD-002', name: 'Mouse inalámbrico', stock: 40, price: 25, category: 'Accesorios', fecha_vencimiento: '2027-12-31' },
    { id: 'PRD-003', name: 'Silla ergonómica', stock: 18, price: 140, category: 'Oficina', fecha_vencimiento: '2027-12-31' }
];

const state = {
    products: [],
    sales: [],
    cart: [],
    purchases: [],
    purchaseEditingId: '',
    receipts: [],
    receiptDraftSaleIds: [],
    receiptSequences: {},
    statsRange: 'today',
    statsCustomFrom: '',
    statsCustomTo: '',
    historyDateFrom: '',
    historyDateTo: '',
    storeProfile: null,
    deliveryShippingCost: 0,
    deliveryShippingSignature: ''
};
const inventoryForm = document.getElementById('inventoryForm');
const salesForm = document.getElementById('salesForm');
const inventoryId = document.getElementById('inventoryId');
const inventoryName = document.getElementById('inventoryName');
const inventoryStock = document.getElementById('inventoryStock');
const inventoryPrice = document.getElementById('inventoryPrice');
const inventoryCategory = document.getElementById('inventoryCategory');
const inventoryExpirationDate = document.getElementById('fecha_vencimiento');
const inventoryImageUrl = document.getElementById('inventoryImageUrl');
const inventoryImage = document.getElementById('inventoryImage');
const inventoryImagePreview = document.getElementById('inventoryImagePreview');
const inventoryClearImageButton = document.getElementById('inventoryClearImageButton');
const inventoryFeedback = document.getElementById('inventoryFeedback');
const inventorySearch = document.getElementById('inventorySearch');
const inventoryTableBody = document.getElementById('inventoryTableBody');
const inventoryCountLabel = document.getElementById('inventoryCountLabel');
const inventoryFormMode = document.getElementById('inventoryFormMode');
const inventoryFormTitle = document.getElementById('inventoryFormTitle');
const inventoryCancelButton = document.getElementById('inventoryCancelButton');

const saleId = document.getElementById('saleId');
const saleProductId = document.getElementById('saleProductId');
const saleDate = document.getElementById('saleDate');
const saleQuantity = document.getElementById('saleQuantity');
const salePaymentMethod = document.getElementById('salePaymentMethod');
const saleIgv = document.getElementById('saleIgv');
const salesFeedback = document.getElementById('salesFeedback');
const salesSearch = document.getElementById('salesSearch');
const salesDateFrom = document.getElementById('salesDateFrom');
const salesDateTo = document.getElementById('salesDateTo');
const salesApplyRangeButton = document.getElementById('salesApplyRangeButton');
const salesTableBody = document.getElementById('salesTableBody');
const historyTableBody = document.getElementById('historyTableBody');
const salesCountLabel = document.getElementById('salesCountLabel');
const historyCountLabel = document.getElementById('historyCountLabel');
const historyExportExcelButton = document.getElementById('historyExportExcel');
const historyExportCsvButton = document.getElementById('historyExportCsv');
const historyDateFrom = document.getElementById('historyDateFrom');
const historyDateTo = document.getElementById('historyDateTo');
const historyApplyRangeButton = document.getElementById('historyApplyRangeButton');
const catalogSearch = document.getElementById('catalogSearch');
const catalogCategoryNav = document.getElementById('catalogCategoryNav');
const catalogGrid = document.getElementById('catalogGrid');
const catalogCountLabel = document.getElementById('catalogCountLabel');
const cartList = document.getElementById('cartList');
const cartCountLabel = document.getElementById('cartCountLabel');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const cartSubtotalAmount = document.getElementById('cartSubtotalAmount');
const cartShippingAmount = document.getElementById('cartShippingAmount');
const cartFinalAmount = document.getElementById('cartFinalAmount');
const cartDeliveryHint = document.getElementById('cartDeliveryHint');
const purchaseList = document.getElementById('purchaseList');
const purchaseCountLabel = document.getElementById('purchaseCountLabel');
const purchaseTotalAmount = document.getElementById('purchaseTotalAmount');
const prepareOrderButton = document.getElementById('prepareOrderButton');
const proceedPaymentButton = document.getElementById('proceedPaymentButton');
const cartReceiptType = document.getElementById('cartReceiptType');
const cartGenerateReceiptButton = document.getElementById('cartGenerateReceiptButton');
const clearCartButton = document.getElementById('clearCartButton');
const checkoutOrderType = document.getElementById('checkoutOrderType');
const checkoutPaymentMethod = document.getElementById('checkoutPaymentMethod');
const checkoutDeliveryAddress = document.getElementById('checkoutDeliveryAddress');
const checkoutLocationField = document.getElementById('checkoutLocationField');
const checkoutLocationLink = document.getElementById('checkoutLocationLink');
const checkoutOpenGoogleMapsButton = document.getElementById('checkoutOpenGoogleMapsButton');
const checkoutUseMyLocationButton = document.getElementById('checkoutUseMyLocationButton');
const checkoutLocationMap = document.getElementById('checkoutLocationMap');
const checkoutLocationPreviewFrame = document.getElementById('checkoutLocationPreviewFrame');
const catalogFeedback = document.getElementById('catalogFeedback');
const voucherModal = document.getElementById('voucherModal');
const voucherBody = document.getElementById('voucherBody');
const voucherCloseButton = document.getElementById('voucherCloseButton');
const voucherDownloadPdfButton = document.getElementById('voucherDownloadPdfButton');
const voucherWhatsAppButton = document.getElementById('voucherWhatsAppButton');
const storeProfileForm = document.getElementById('storeProfileForm');
const storeNameInput = document.getElementById('storeNameInput');
const storeDescriptionInput = document.getElementById('storeDescriptionInput');
const storeMapEmbedInput = document.getElementById('storeMapEmbedInput');
const storeMapLinkInput = document.getElementById('storeMapLinkInput');
const storeWhatsAppInput = document.getElementById('storeWhatsAppInput');
const storeLocationsInput = document.getElementById('storeLocationsInput');
const storeProfileFeedback = document.getElementById('storeProfileFeedback');
const storeTitleDisplay = document.getElementById('storeTitleDisplay');
const storeDescriptionDisplay = document.getElementById('storeDescriptionDisplay');
const storeLocationsList = document.getElementById('storeLocationsList');
const storeMapFrame = document.getElementById('storeMapFrame');
const storeMapLink = document.getElementById('storeMapLink');
const storeWhatsAppLink = document.getElementById('storeWhatsAppLink');
const salesFormMode = document.getElementById('salesFormMode');
const salesFormTitle = document.getElementById('salesFormTitle');
const salesCancelButton = document.getElementById('salesCancelButton');
const saleTotalPreview = document.getElementById('saleTotalPreview');
const saleSummaryPreview = document.getElementById('saleSummaryPreview');
const saleUnitPricePreview = document.getElementById('saleUnitPricePreview');
const saleSubtotalPreview = document.getElementById('saleSubtotalPreview');
const saleIgvAmountPreview = document.getElementById('saleIgvAmountPreview');
const receiptForm = document.getElementById('receiptForm');
const receiptDocType = document.getElementById('receiptDocType');
const receiptSerie = document.getElementById('receiptSerie');
const receiptCorrelative = document.getElementById('receiptCorrelative');
const receiptSeller = document.getElementById('receiptSeller');
const receiptIssuerRuc = document.getElementById('receiptIssuerRuc');
const receiptIssuerName = document.getElementById('receiptIssuerName');
const receiptIssuerAddress = document.getElementById('receiptIssuerAddress');
const receiptClientDocType = document.getElementById('receiptClientDocType');
const receiptClientDocNumber = document.getElementById('receiptClientDocNumber');
const receiptClientName = document.getElementById('receiptClientName');
const receiptPaymentMethod = document.getElementById('receiptPaymentMethod');
const receiptSalesSearch = document.getElementById('receiptSalesSearch');
const receiptSalesTableBody = document.getElementById('receiptSalesTableBody');
const receiptDetailTableBody = document.getElementById('receiptDetailTableBody');
const receiptRecordsTableBody = document.getElementById('receiptRecordsTableBody');
const receiptSalesCountLabel = document.getElementById('receiptSalesCountLabel');
const receiptDraftCountLabel = document.getElementById('receiptDraftCountLabel');
const receiptRecordsCountLabel = document.getElementById('receiptRecordsCountLabel');
const receiptItemsCount = document.getElementById('receiptItemsCount');
const receiptSubtotal = document.getElementById('receiptSubtotal');
const receiptIgv = document.getElementById('receiptIgv');
const receiptTotal = document.getElementById('receiptTotal');
const receiptSaveDraftButton = document.getElementById('receiptSaveDraftButton');
const receiptEmitButton = document.getElementById('receiptEmitButton');
const receiptEmitPaymentButton = document.getElementById('receiptEmitPaymentButton');
const receiptEmitTicketButton = document.getElementById('receiptEmitTicketButton');
const receiptClearDraftButton = document.getElementById('receiptClearDraftButton');
const receiptFeedback = document.getElementById('receiptFeedback');
const receiptRecordsDateFrom = document.getElementById('receiptRecordsDateFrom');
const receiptRecordsDateTo = document.getElementById('receiptRecordsDateTo');
const statsRangeButtons = document.querySelectorAll('[data-stats-range]');
const statsDateFrom = document.getElementById('statsDateFrom');
const statsDateTo = document.getElementById('statsDateTo');
const statsApplyRangeButton = document.getElementById('statsApplyRangeButton');
const statsRangeLabel = document.getElementById('statsRangeLabel');
const statsTotalSales = document.getElementById('statsTotalSales');
const statsTotalRevenue = document.getElementById('statsTotalRevenue');
const statsAvgTicket = document.getElementById('statsAvgTicket');
const statsBestHour = document.getElementById('statsBestHour');
const statsBestDay = document.getElementById('statsBestDay');
const statsTopProduct = document.getElementById('statsTopProduct');
const statsTotalUnits = document.getElementById('statsTotalUnits');
const statsLastSale = document.getElementById('statsLastSale');
const statsBarChart = document.getElementById('statsBarChart');
const statsInsightsList = document.getElementById('statsInsightsList');
const statsHourlyTableBody = document.getElementById('statsHourlyTableBody');
const metricProducts = document.getElementById('metricProducts');
const metricStock = document.getElementById('metricStock');
const metricSales = document.getElementById('metricSales');
const metricRevenue = document.getElementById('metricRevenue');
const metricTodaySales = document.getElementById('metricTodaySales');
const metricAverageTicket = document.getElementById('metricAverageTicket');
const metricTopProduct = document.getElementById('metricTopProduct');
const metricLowStock = document.getElementById('metricLowStock');
const insightHeadline = document.getElementById('insightHeadline');
const insightCopy = document.getElementById('insightCopy');
const confirmationModal = document.getElementById('confirmationModal');
const confirmationTitle = document.getElementById('confirmationTitle');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmationOkButton = document.getElementById('confirmationOkButton');
const confirmationCancelButton = document.getElementById('confirmationCancelButton');
const navButtons = document.querySelectorAll('.nav-link');
const screens = document.querySelectorAll('.screen');
const jumpButtons = document.querySelectorAll('[data-jump]');
const logoutLink = document.querySelector('.topbar-exit');
const statusPill = document.querySelector('.status-pill');

let inventoryEditingId = null;
let salesEditingId = null;
let inventoryRemoveImage = false;
let productImages = {};
let currentRole = ROLE_ADMIN;
let currentUserEmail = '';
let currentClientId = '';
let activeVoucherId = '';
let canUseSupabaseProductImageColumn = true;
let canUseSupabaseClientIdColumn = true;
const CATALOG_CATEGORY_ALL = '__all__';
let activeCatalogCategory = CATALOG_CATEGORY_ALL;
let confirmationCallback = null;
let checkoutMapInstance = null;
let checkoutMapMarker = null;
let statsBarChartInstance = null;

function ensureConfigured() {
    return Boolean(supabaseClient && isSupabaseConfigured());
}

function isAdminRole() {
    return currentRole === ROLE_ADMIN;
}

function isClientRole() {
    return currentRole === ROLE_CLIENT;
}

function applyRolePermissions() {
    if (statusPill) {
        statusPill.textContent = isAdminRole() ? 'Administrador activo' : 'Cliente activo';
    }

    if (checkoutOrderType) {
        Array.from(checkoutOrderType.options).forEach((option) => {
            const isStoreOption = option.value === 'store';
            option.hidden = isClientRole() && isStoreOption;
            option.disabled = isClientRole() && isStoreOption;
        });

        if (isClientRole()) {
            checkoutOrderType.value = 'delivery';
        }
    }

    navButtons.forEach((button) => {
        const view = button.dataset.view;
        const allowed = isAdminRole()
            || view === 'catalogo'
            || view === 'informacion'
            || (isClientRole() && view === 'historial');
        button.hidden = !allowed;
        button.disabled = !allowed;
    });

    jumpButtons.forEach((button) => {
        button.hidden = isClientRole();
    });

    if (storeProfileForm) {
        storeProfileForm.hidden = !isAdminRole();
    }

    // Checkout / ordering controls: solo visibles para clientes
    if (prepareOrderButton) {
        prepareOrderButton.hidden = !isAdminRole() && !isClientRole();
        prepareOrderButton.disabled = !isAdminRole() && !isClientRole();
    }

    if (proceedPaymentButton) {
        proceedPaymentButton.hidden = !isAdminRole() && !isClientRole();
        proceedPaymentButton.disabled = !isAdminRole() && !isClientRole();
        proceedPaymentButton.textContent = isAdminRole() ? 'Generar venta' : 'Proceder al pago';
    }

    if (checkoutDeliveryAddress) {
        checkoutDeliveryAddress.hidden = !isClientRole();
        checkoutDeliveryAddress.disabled = !isClientRole();
    }

    if (checkoutLocationField) {
        checkoutLocationField.hidden = !isClientRole();
    }
}

function getScopedStorageKey(prefix) {
    const scope = (isClientRole() ? currentClientId : currentUserEmail) || currentUserEmail || 'anon';
    return `${prefix}:${scope}`;
}

function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem(getScopedStorageKey(CART_STORAGE_PREFIX));
        const parsed = raw ? JSON.parse(raw) : [];
        state.cart = Array.isArray(parsed) ? parsed.filter((item) => item && item.productId && Number(item.quantity) > 0) : [];
    } catch (_error) {
        state.cart = [];
    }
}

function saveCartToStorage() {
    localStorage.setItem(getScopedStorageKey(CART_STORAGE_PREFIX), JSON.stringify(state.cart));
}

function loadPurchasesFromStorage() {
    try {
        const raw = localStorage.getItem(getScopedStorageKey(PURCHASE_STORAGE_PREFIX));
        const parsed = raw ? JSON.parse(raw) : [];
        state.purchases = Array.isArray(parsed) ? parsed.map(normalizePurchaseRecord) : [];
    } catch (_error) {
        state.purchases = [];
    }
}

function savePurchasesToStorage() {
    const key = getScopedStorageKey(PURCHASE_STORAGE_PREFIX);
    localStorage.setItem(key, JSON.stringify(state.purchases));
}

function loadReceiptsFromStorage() {
    try {
        const raw = localStorage.getItem(RECEIPT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        state.receipts = Array.isArray(parsed) ? parsed.map(normalizeReceiptRecord) : [];
    } catch (_error) {
        state.receipts = [];
    }
}

function saveReceiptsToStorage() {
    localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(state.receipts));
}

function loadReceiptSequencesFromStorage() {
    try {
        const raw = localStorage.getItem(RECEIPT_SEQUENCE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        state.receiptSequences = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
        state.receiptSequences = {};
    }
}

function saveReceiptSequencesToStorage() {
    localStorage.setItem(RECEIPT_SEQUENCE_STORAGE_KEY, JSON.stringify(state.receiptSequences));
}

function normalizeReceiptRecord(receipt) {
    if (!receipt || typeof receipt !== 'object') {
        return null;
    }

    return {
        ...receipt,
        issueDate: receipt.issueDate || receipt.createdAt || new Date().toISOString(),
        createdAt: receipt.createdAt || receipt.issueDate || new Date().toISOString(),
        items: Array.isArray(receipt.items) ? receipt.items : [],
        subtotal: Number(receipt.subtotal || 0),
        igv: Number(receipt.igv || 0),
        total: Number(receipt.total || 0)
    };
}

async function saveReceiptToSupabase(receipt) {
    if (!ensureConfigured() || !receipt) {
        return;
    }

    try {
        const receiptRecord = normalizeReceiptRecord(receipt);
        const { error } = await supabaseClient
            .from('boletas')
            .upsert({
                id: receiptRecord.id,
                serie: receiptRecord.serie || null,
                correlative: receiptRecord.correlative || null,
                document_format: receiptRecord.documentFormat || null,
                doc_type: receiptRecord.docType || null,
                issue_date: receiptRecord.issueDate || receiptRecord.createdAt || new Date().toISOString(),
                seller: receiptRecord.seller || null,
                client_name: receiptRecord.client?.name || null,
                payment_method: receiptRecord.paymentMethod || null,
                subtotal: Number(receiptRecord.subtotal || 0),
                igv: Number(receiptRecord.igv || 0),
                total: Number(receiptRecord.total || 0),
                status: receiptRecord.status || 'emitido',
                boleta_data: receiptRecord,
                created_at: receiptRecord.createdAt || receiptRecord.issueDate || new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) {
            console.warn('No se pudo sincronizar la boleta con Supabase:', error.message || error);
        }
    } catch (err) {
        console.warn('Error al guardar boleta en Supabase:', err);
    }
}

async function loadReceiptsFromSupabase() {
    if (!ensureConfigured()) {
        return [];
    }

    try {
        const { data, error } = await supabaseClient
            .from('boletas')
            .select('*')
            .order('issue_date', { ascending: false });

        if (error) {
            console.warn('No se pudieron cargar las boletas desde Supabase:', error.message || error);
            return [];
        }

        return Array.isArray(data)
            ? data.map((record) => normalizeReceiptRecord(record.boleta_data || record)).filter(Boolean)
            : [];
    } catch (err) {
        console.warn('Error al cargar boletas desde Supabase:', err);
        return [];
    }
}

async function deleteReceiptFromSupabase(receiptId) {
    if (!ensureConfigured() || !receiptId) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('boletas')
            .delete()
            .eq('id', receiptId);

        if (error) {
            console.warn('No se pudo eliminar la boleta en Supabase:', error.message || error);
        }
    } catch (err) {
        console.warn('Error al eliminar boleta en Supabase:', err);
    }
}

function padReceiptCorrelative(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.padStart(8, '0').slice(-8);
}

function getReceiptSeriesByDocType(docType) {
    return docType === 'Factura' ? 'F001' : 'B001';
}

function getReceiptNextCorrelative(serie) {
    const current = Number(state.receiptSequences?.[serie] || 1);
    return current > 0 ? current : 1;
}

function bumpReceiptSequence(serie) {
    state.receiptSequences[serie] = getReceiptNextCorrelative(serie) + 1;
    saveReceiptSequencesToStorage();
}

function ensureReceiptDraftDefaults(forceResetCorrelative = false) {
    if (!receiptDocType || !receiptSerie || !receiptCorrelative) {
        return;
    }

    const nextSerie = getReceiptSeriesByDocType(receiptDocType.value);

    if (!receiptSerie.value.trim() || forceResetCorrelative) {
        receiptSerie.value = nextSerie;
    }

    if (receiptSeller && !receiptSeller.value.trim()) {
        receiptSeller.value = currentUserEmail || 'Vendedor';
    }

    if (!receiptCorrelative.value.trim() || forceResetCorrelative) {
        receiptCorrelative.value = padReceiptCorrelative(getReceiptNextCorrelative(receiptSerie.value.trim().toUpperCase()));
    } else {
        receiptCorrelative.value = padReceiptCorrelative(receiptCorrelative.value);
    }

    if (!receiptClientName?.value?.trim()) {
        receiptClientName.value = 'CLIENTE VARIOS';
    }

    if (receiptIssuerName && !receiptIssuerName.value.trim()) {
        receiptIssuerName.value = (state.storeProfile?.name || 'OBREGON CABRERA EULOGIO').toUpperCase();
    }

    if (receiptIssuerRuc && !receiptIssuerRuc.value.trim()) {
        receiptIssuerRuc.value = '10411336234';
    }

    if (receiptIssuerAddress && !receiptIssuerAddress.value.trim()) {
        receiptIssuerAddress.value = (state.storeProfile?.locations?.[0] || 'AMAZONAS - CHACHAPOYAS - CHACHAPOYAS').toUpperCase();
    }
}

function getSelectedReceiptSales() {
    const selectedSet = new Set(state.receiptDraftSaleIds || []);
    return state.sales.filter((sale) => selectedSet.has(sale.id));
}

function getReceiptSalesSearchQuery() {
    return (receiptSalesSearch?.value || '').trim().toLowerCase();
}

function getFilteredSalesForReceipt() {
    const query = getReceiptSalesSearchQuery();
    const selectedSet = new Set(state.receiptDraftSaleIds || []);

    return state.sales
        .slice()
        .reverse()
        .filter((sale) => {
            if (selectedSet.has(sale.id)) {
                return true;
            }

            if (!query) {
                return true;
            }

            const text = [sale.id, sale.productName, sale.date, sale.paymentMethod, sale.total].join(' ').toLowerCase();
            return text.includes(query);
        });
}

function getReceiptDraftTotals() {
    const selectedSales = getSelectedReceiptSales();
    const subtotal = selectedSales.reduce((sum, sale) => sum + Number(sale.subtotal || sale.total || 0), 0);
    const igvAmount = selectedSales.reduce((sum, sale) => sum + Number(sale.igvAmount || 0), 0);
    const total = selectedSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);

    return {
        selectedSales,
        itemCount: selectedSales.length,
        subtotal,
        igvAmount,
        total
    };
}

function setPurchaseEditingId(purchaseId = '') {
    state.purchaseEditingId = String(purchaseId || '').trim();
}

function replacePurchaseRecord(nextPurchase) {
    const normalizedPurchase = normalizePurchaseRecord(nextPurchase);
    if (!normalizedPurchase) {
        return null;
    }

    const index = state.purchases.findIndex((purchase) => purchase.id === normalizedPurchase.id);
    if (index >= 0) {
        state.purchases[index] = normalizedPurchase;
    } else {
        state.purchases = [normalizedPurchase, ...state.purchases];
    }

    savePurchasesToStorage();
    return normalizedPurchase;
}

function deletePurchaseRecord(purchaseId) {
    const normalizedId = String(purchaseId || '').trim();
    if (!normalizedId) {
        return false;
    }

    const initialLength = state.purchases.length;
    state.purchases = state.purchases.filter((purchase) => purchase.id !== normalizedId);

    if (state.purchaseEditingId === normalizedId) {
        setPurchaseEditingId('');
    }

    if (state.purchases.length === initialLength) {
        return false;
    }

    savePurchasesToStorage();
    return true;
}

function loadPurchaseIntoCart(purchase) {
    const source = normalizePurchaseRecord(purchase);
    if (!source) {
        return false;
    }

    const cartItems = (Array.isArray(source.items) ? source.items : [])
        .map((item) => ({
            productId: item.productId || '',
            quantity: Math.max(1, Number(item.quantity || 0))
        }))
        .filter((item) => item.productId && item.quantity > 0);

    state.cart = cartItems;
    saveCartToStorage();
    setPurchaseEditingId(source.id);
    state.deliveryShippingCost = Number(source.shippingCost || 0);
    state.deliveryShippingSignature = source.orderType === 'delivery' ? getCartSignature() : '';

    if (checkoutPaymentMethod) {
        checkoutPaymentMethod.value = source.paymentMethod || checkoutPaymentMethod.value || 'Efectivo';
    }

    if (checkoutOrderType) {
        checkoutOrderType.value = source.orderType === 'delivery' ? 'delivery' : 'store';
    }

    if (checkoutDeliveryAddress) {
        checkoutDeliveryAddress.value = source.deliveryAddress || checkoutDeliveryAddress.value || 'Recojo en tienda';
    }

    if (checkoutLocationLink) {
        checkoutLocationLink.value = source.locationMapLink || checkoutLocationLink.value || '';
    }

    renderCart();
    updateCheckoutModeUI?.();
    updatePurchaseEditingHint?.(source);
    return true;
}

function formatDateInputValue(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getStatsDateRange() {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (state.statsRange === 'custom') {
        const customFrom = state.statsCustomFrom ? new Date(`${state.statsCustomFrom}T00:00:00`) : null;
        const customTo = state.statsCustomTo ? new Date(`${state.statsCustomTo}T23:59:59`) : null;
        return {
            start: customFrom && !Number.isNaN(customFrom.getTime()) ? customFrom : null,
            end: customTo && !Number.isNaN(customTo.getTime()) ? customTo : null
        };
    }

    if (state.statsRange === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (state.statsRange === 'yesterday') {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (state.statsRange === 'last7') {
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (state.statsRange === 'last30') {
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function getFilteredSalesByStatsRange() {
    const range = getStatsDateRange();

    return state.sales.filter((sale) => {
        const saleDate = new Date(sale.date);
        if (Number.isNaN(saleDate.getTime())) {
            return false;
        }

        if (range.start && saleDate < range.start) {
            return false;
        }

        if (range.end && saleDate > range.end) {
            return false;
        }

        return true;
    });
}

function getFilteredReceiptRecords() {
    const fromVal = (receiptRecordsDateFrom?.value || '').trim();
    const toVal = (receiptRecordsDateTo?.value || '').trim();

    let filtered = state.receipts.slice().sort((a, b) => new Date(b.issueDate || b.createdAt || 0).getTime() - new Date(a.issueDate || a.createdAt || 0).getTime());

    if (!fromVal && !toVal) {
        return filtered;
    }

    const start = fromVal ? new Date(`${fromVal}T00:00:00`) : null;
    const end = toVal ? new Date(`${toVal}T23:59:59.999`) : null;

    return filtered.filter((receipt) => {
        const receiptDate = new Date(receipt.issueDate || receipt.createdAt || 0);
        if (Number.isNaN(receiptDate.getTime())) {
            return false;
        }

        if (start && receiptDate < start) {
            return false;
        }

        if (end && receiptDate > end) {
            return false;
        }

        return true;
    });
}

function formatHourLabel(hour) {
    return `${String(hour).padStart(2, '0')}:00`;
}

function addPurchaseRecords(records) {
    if (!Array.isArray(records) || !records.length) {
        return;
    }

    const normalizedRecords = records.map(normalizePurchaseRecord);
    state.purchases = [...normalizedRecords, ...state.purchases];
    savePurchasesToStorage();
    renderPurchaseHistory();

    normalizedRecords.forEach((purchase) => {
        savePurchaseToSupabase(purchase);
    });
}

function getCartSignature() {
    return state.cart
        .map((item) => `${item.productId}:${Number(item.quantity || 0)}`)
        .join('|');
}

function generateDeliveryShippingCost() {
    return Math.floor(Math.random() * (DELIVERY_SHIPPING_COST_MAX - FIXED_SHIPPING_COST + 1)) + FIXED_SHIPPING_COST;
}

function getDeliveryShippingCost(detailedItems = [], signatureSeed = '') {
    if (!detailedItems.length || getCheckoutOrderType() !== 'delivery') {
        state.deliveryShippingCost = 0;
        state.deliveryShippingSignature = '';
        return 0;
    }

    const signature = String(signatureSeed || getCartSignature() || '').trim() || getCartSignature();
    const currentCost = Number(state.deliveryShippingCost || 0);
    if (state.deliveryShippingSignature !== signature || currentCost < FIXED_SHIPPING_COST || currentCost > DELIVERY_SHIPPING_COST_MAX) {
        state.deliveryShippingCost = generateDeliveryShippingCost();
        state.deliveryShippingSignature = signature;
    }

    return Number(state.deliveryShippingCost || 0);
}

function normalizePurchaseRecord(record) {
    const source = record || {};
    const sourceItems = Array.isArray(source.items) && source.items.length
        ? source.items
        : [{
            productId: source.productId || '',
            productName: source.productName || '',
            quantity: Number(source.quantity || 0),
            unitPrice: Number(source.unitPrice || 0),
            total: Number(source.total || 0)
        }];

    const items = sourceItems.map((item) => ({
        productId: item.productId || '',
        productName: item.productName || '',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || Number(item.quantity || 0) * Number(item.unitPrice || 0))
    }));

    const subtotal = Number(source.subtotal || items.reduce((sum, item) => sum + Number(item.total || 0), 0));

    return {
        id: source.id || `PED-${Date.now()}`,
        date: source.date || new Date().toISOString(),
        paymentMethod: source.paymentMethod || 'Efectivo',
        orderType: source.orderType === 'delivery' ? 'delivery' : 'store',
        deliveryAddress: source.deliveryAddress || state.storeProfile?.locations?.[0] || 'Recojo en tienda',
        locationMapLink: source.locationMapLink || '',
        shippingCost: Number(source.shippingCost || 0),
        receiptId: source.receiptId || '',
        items,
        subtotal,
        total: Number(source.total || subtotal)
    };
}

function getDefaultStoreProfile() {
    return {
        name: 'NovaGest Store',
        description: 'Encuentra productos y confirma tu compra por WhatsApp de forma rápida.',
        mapEmbedUrl: 'https://www.google.com/maps?q=Lima%20Peru&output=embed',
        mapLinkUrl: 'https://maps.google.com/?q=Lima%20Peru',
        whatsappNumber: '51999999999',
        locations: ['Lima, Perú']
    };
}

function sanitizePhoneNumber(phone) {
    return String(phone || '').replace(/\D/g, '');
}

function loadStoreProfile() {
    try {
        const raw = localStorage.getItem(STORE_PROFILE_STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        const defaults = getDefaultStoreProfile();
        state.storeProfile = {
            ...defaults,
            ...saved,
            locations: Array.isArray(saved?.locations) && saved.locations.length ? saved.locations : defaults.locations
        };
    } catch (_error) {
        state.storeProfile = getDefaultStoreProfile();
    }
}

function saveStoreProfile() {
    localStorage.setItem(STORE_PROFILE_STORAGE_KEY, JSON.stringify(state.storeProfile));
}

function fillStoreProfileForm() {
    if (!storeProfileForm || !state.storeProfile) {
        return;
    }

    storeNameInput.value = state.storeProfile.name || '';
    storeDescriptionInput.value = state.storeProfile.description || '';
    storeMapEmbedInput.value = state.storeProfile.mapEmbedUrl || '';
    storeMapLinkInput.value = state.storeProfile.mapLinkUrl || '';
    storeWhatsAppInput.value = state.storeProfile.whatsappNumber || '';
    storeLocationsInput.value = (state.storeProfile.locations || []).join('\n');
}

function buildWhatsAppUrl(message) {
    const phone = sanitizePhoneNumber(state.storeProfile?.whatsappNumber);
    if (!phone) {
        return '';
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function renderStoreProfile() {
    if (!state.storeProfile) {
        return;
    }

    const profile = state.storeProfile;
    const locations = Array.isArray(profile.locations) ? profile.locations.filter(Boolean) : [];

    if (storeTitleDisplay) {
        storeTitleDisplay.textContent = profile.name;
    }

    if (storeDescriptionDisplay) {
        storeDescriptionDisplay.textContent = profile.description;
    }

    if (storeLocationsList) {
        storeLocationsList.innerHTML = locations.length
            ? locations.map((location) => `<li>${escapeHtml(location)}</li>`).join('')
            : '<li>Ubicación no configurada.</li>';
    }

    if (storeMapFrame) {
        storeMapFrame.src = profile.mapEmbedUrl;
    }

    if (storeMapLink) {
        storeMapLink.href = profile.mapLinkUrl || '#';
    }

    if (storeWhatsAppLink) {
        const url = buildWhatsAppUrl(`Hola ${profile.name}, deseo más información sobre sus productos.`);
        storeWhatsAppLink.href = url || '#';
    }

    if (checkoutDeliveryAddress && !checkoutDeliveryAddress.value.trim()) {
        checkoutDeliveryAddress.value = profile.locations?.[0] || 'Recojo en tienda';
    }
}

function buildProductWhatsAppMessage(product) {
    return [
        `Hola ${state.storeProfile?.name || 'tienda'},`,
        'quiero confirmar esta compra:',
        `Producto: ${product.name} (${product.id})`,
        `Precio unitario: ${formatCurrency(product.price)}`,
        'Cantidad: 1',
        `Total a pagar: ${formatCurrency(product.price)}`,
        '',
        '¿Me confirman disponibilidad y método de pago?'
    ].join('\n');
}

function isValidGoogleMapsLink(link) {
    const value = String(link || '').trim();
    if (!value) {
        return false;
    }

    return /^https:\/\/(www\.)?(maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(value);
}

function isDeliveryCheckout() {
    return (checkoutOrderType?.value || 'store') === 'delivery';
}

function buildGoogleMapsLink(lat, lng) {
    return `https://maps.google.com/?q=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
}

function buildGoogleMapsEmbedUrlFromLatLng(lat, lng) {
    return `https://www.google.com/maps?q=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}&output=embed`;
}

function buildGoogleMapsEmbedUrlFromLink(link) {
    const value = String(link || '').trim();
    if (!value) {
        return 'https://www.google.com/maps?q=Lima%20Peru&output=embed';
    }

    return `https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`;
}

function updateCheckoutLocationPreview(lat, lng) {
    if (!checkoutLocationPreviewFrame) {
        return;
    }

    if (typeof lat === 'number' && typeof lng === 'number') {
        checkoutLocationPreviewFrame.src = buildGoogleMapsEmbedUrlFromLatLng(lat, lng);
        return;
    }

    checkoutLocationPreviewFrame.src = buildGoogleMapsEmbedUrlFromLink(checkoutLocationLink?.value);
}

function updateCheckoutGoogleMapsButton() {
    if (!checkoutOpenGoogleMapsButton) {
        return;
    }

    const locationValue = String(checkoutLocationLink?.value || '').trim();
    const mapsUrl = isValidGoogleMapsLink(locationValue)
        ? locationValue
        : (locationValue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationValue)}` : '#');

    checkoutOpenGoogleMapsButton.href = mapsUrl;
    checkoutOpenGoogleMapsButton.setAttribute('aria-disabled', mapsUrl === '#' ? 'true' : 'false');
    checkoutOpenGoogleMapsButton.style.pointerEvents = mapsUrl === '#' ? 'none' : '';
    checkoutOpenGoogleMapsButton.style.opacity = mapsUrl === '#' ? '0.6' : '';
}

function extractCoordinatesFromMapLink(link) {
    const value = String(link || '').trim();
    if (!value) {
        return null;
    }

    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)|[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/i;
    const match = value.match(regex);
    if (!match) {
        return null;
    }

    const lat = Number(match[1] || match[3]);
    const lng = Number(match[2] || match[4]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return null;
    }

    return { lat, lng };
}

function setCheckoutMapLocation(lat, lng, shouldCenter = true) {
    if (!checkoutLocationLink) {
        return;
    }

    checkoutLocationLink.value = buildGoogleMapsLink(lat, lng);
    updateCheckoutLocationPreview(lat, lng);
    updateCheckoutGoogleMapsButton();

    if (!checkoutMapInstance || !window.L) {
        return;
    }

    const nextPoint = [lat, lng];
    if (!checkoutMapMarker) {
        checkoutMapMarker = window.L.marker(nextPoint).addTo(checkoutMapInstance);
    } else {
        checkoutMapMarker.setLatLng(nextPoint);
    }

    if (shouldCenter) {
        checkoutMapInstance.setView(nextPoint, Math.max(15, checkoutMapInstance.getZoom()));
    }
}

function initCheckoutMap() {
    if (!checkoutLocationMap || !window.L || checkoutMapInstance) {
        return;
    }

    const defaultCenter = [-12.0464, -77.0428];
    checkoutMapInstance = window.L.map(checkoutLocationMap, {
        zoomControl: true,
        attributionControl: true
    }).setView(defaultCenter, 13);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(checkoutMapInstance);

    checkoutMapInstance.on('click', (event) => {
        const { lat, lng } = event.latlng;
        setCheckoutMapLocation(lat, lng, false);
        clearMessage(catalogFeedback);
    });

    const coordsFromInput = extractCoordinatesFromMapLink(checkoutLocationLink?.value);
    if (coordsFromInput) {
        setCheckoutMapLocation(coordsFromInput.lat, coordsFromInput.lng);
    } else {
        updateCheckoutLocationPreview();
        updateCheckoutGoogleMapsButton();
    }
}

function syncCheckoutMapFromLink() {
    const coords = extractCoordinatesFromMapLink(checkoutLocationLink?.value);
    if (!coords || !checkoutMapInstance) {
        updateCheckoutLocationPreview();
        updateCheckoutGoogleMapsButton();
        return;
    }

    setCheckoutMapLocation(coords.lat, coords.lng);
}

function setCheckoutCurrentLocation() {
    if (!navigator.geolocation) {
        setMessage(catalogFeedback, 'Tu navegador no soporta geolocalización.', true);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = Number(position.coords.latitude || 0);
            const lng = Number(position.coords.longitude || 0);
            setCheckoutMapLocation(lat, lng);
            clearMessage(catalogFeedback);
        },
        () => {
            setMessage(catalogFeedback, 'No se pudo obtener tu ubicación actual.', true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function updateCheckoutModeUI() {
    const isDelivery = isDeliveryCheckout();

    if (checkoutLocationField) {
        checkoutLocationField.hidden = !isClientRole();
    }

    if (checkoutLocationLink) {
        checkoutLocationLink.required = isDelivery;
        if (!isDelivery) {
            checkoutLocationLink.value = '';
        }
    }

    if (checkoutDeliveryAddress) {
        const deliveryPlaceholder = checkoutDeliveryAddress.dataset.deliveryPlaceholder || 'Ej. Av. Principal 123, Lima';
        const storePlaceholder = checkoutDeliveryAddress.dataset.storePlaceholder || 'Ej. Caja 2 / Mostrador principal';
        checkoutDeliveryAddress.placeholder = isDelivery ? deliveryPlaceholder : storePlaceholder;
    }

    if (isDelivery) {
        initCheckoutMap();
        setTimeout(() => {
            checkoutMapInstance?.invalidateSize();
        }, 0);
        updateCheckoutLocationPreview();
        updateCheckoutGoogleMapsButton();
        if (cartDeliveryHint) {
            cartDeliveryHint.textContent = 'Activo';
        }
    } else {
        state.deliveryShippingCost = 0;
        state.deliveryShippingSignature = '';
        updateCheckoutGoogleMapsButton();
        if (cartDeliveryHint) {
            cartDeliveryHint.textContent = 'Desactivado';
        }
    }
}

function buildCartWhatsAppMessage() {
    const detailedItems = state.cart.map((item) => {
        const product = state.products.find((p) => p.id === item.productId);
        return product ? { item, product } : null;
    }).filter(Boolean);

    const subtotal = detailedItems.reduce((sum, entry) => sum + Number(entry.item.quantity || 0) * Number(entry.product.price || 0), 0);
    const isDelivery = isDeliveryCheckout();
    const shippingCost = getDeliveryShippingCost(detailedItems);
    const total = subtotal + shippingCost;
    const locationLink = isDelivery ? (checkoutLocationLink?.value?.trim() || '-') : 'No aplica (compra en tienda)';

    const lines = [
        `Hola ${state.storeProfile?.name || 'tienda'},`,
        'quiero confirmar mi pedido:'
    ];

    detailedItems.forEach((entry, index) => {
        lines.push(`${index + 1}. ${entry.product.name} x${entry.item.quantity} = ${formatCurrency(Number(entry.item.quantity || 0) * Number(entry.product.price || 0))}`);
    });

    lines.push('');
    lines.push(`Modalidad: ${isDelivery ? 'Pedido delivery' : 'Compra en tienda'}`);
    lines.push(`Subtotal: ${formatCurrency(subtotal)}`);
    lines.push(`Envío: ${formatCurrency(shippingCost)}`);
    lines.push(`Total a pagar: ${formatCurrency(total)}`);
    lines.push(`Método de pago: ${checkoutPaymentMethod?.value || 'Efectivo'}`);
    lines.push(`Entrega: ${checkoutDeliveryAddress?.value || (isDelivery ? 'Pendiente de dirección' : 'Recojo en tienda')}`);
    lines.push(`Ubicación Google Maps: ${locationLink}`);
    lines.push('Por favor confirmen método de pago y entrega.');

    return lines.join('\n');
}

function buildPurchaseWhatsAppMessage(purchase) {
    if (!purchase) {
        return '';
    }

    const items = Array.isArray(purchase.items) ? purchase.items : [];
    const lines = [
        `Hola ${state.storeProfile?.name || 'tienda'},`,
        `confirmo este pedido: ${purchase.id || '-'}`,
        ''
    ];

    items.forEach((item, index) => {
        const quantity = Number(item.quantity || 0);
        const lineTotal = Number(item.total || 0);
        lines.push(`${index + 1}. ${item.productName || 'Producto'} x${quantity} = ${formatCurrency(lineTotal)}`);
    });

    lines.push('');
    lines.push(`Modalidad: ${purchase.orderType === 'delivery' ? 'Pedido delivery' : 'Compra en tienda'}`);
    lines.push(`Boleta electrónica: ${purchase.receiptId || '-'}`);
    lines.push(`Subtotal: ${formatCurrency(Number(purchase.subtotal || 0))}`);
    lines.push(`Envío: ${formatCurrency(Number(purchase.shippingCost || 0))}`);
    lines.push(`Total a pagar: ${formatCurrency(Number(purchase.total || 0))}`);
    lines.push(`Método de pago: ${purchase.paymentMethod || 'Efectivo'}`);
    lines.push(`Entrega: ${purchase.deliveryAddress || 'Recojo en tienda'}`);
    lines.push(`Ubicación Google Maps: ${purchase.orderType === 'delivery' ? (purchase.locationMapLink || '-') : 'No requerida (compra en tienda)'}`);
    lines.push('Por favor confirmen la recepción del pedido.');

    return lines.join('\n');
}

function openWhatsAppMessage(message, feedbackTarget) {
    const url = buildWhatsAppUrl(message);
    if (!url) {
        if (feedbackTarget) {
            setMessage(feedbackTarget, 'Configura primero el número de WhatsApp de la tienda.', true);
        }
        return false;
    }

    const popup = window.open(url, '_blank', 'noopener');
    if (!popup && feedbackTarget) {
        setMessage(feedbackTarget, 'No se pudo abrir WhatsApp automáticamente. Revisa el bloqueo de ventanas emergentes.', true);
    }

    return Boolean(popup);
}

function normalizeProduct(product) {
    return {
        id: product.id,
        name: product.name,
        stock: Number(product.stock || 0),
        price: Number(product.price || 0),
        category: product.category,
        fecha_vencimiento: normalizeDateOnly(product.fecha_vencimiento || product.fechaVencimiento || product.expiration_date || product.expirationDate),
        imageUrl: product.image_url || product.imageUrl || ''
    };
}

function normalizeDateOnly(value) {
    if (!value) {
        return '';
    }

    const raw = String(value).trim();
    if (!raw) {
        return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getLocalDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateOnly(value) {
    const normalized = normalizeDateOnly(value);

    if (!normalized) {
        return 'Sin fecha';
    }

    const date = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? 'Sin fecha'
        : new Intl.DateTimeFormat('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
}

function getProductExpirationInfo(product) {
    const fecha = normalizeDateOnly(product?.fecha_vencimiento);

    if (!fecha) {
        return {
            label: 'SIN FECHA',
            className: 'status-tag--warning',
            rowClassName: '',
            isExpired: false,
            warningText: 'Agrega una fecha de vencimiento'
        };
    }

    const today = getLocalDateInputValue();
    const isExpired = today >= fecha;

    return {
        label: isExpired ? 'VENCIDO' : 'VIGENTE',
        className: isExpired ? 'status-tag--danger' : 'status-tag--success',
        rowClassName: isExpired ? 'inventory-row--expired' : '',
        isExpired,
        warningText: isExpired ? 'Producto vencido' : 'En buen estado'
    };
}

function normalizeSale(sale) {
    return {
        id: sale.id,
        productId: sale.product_id || sale.productId || '',
        productName: sale.product_name || sale.productName || '',
        date: sale.date,
        quantity: Number(sale.quantity || 0),
        paymentMethod: sale.payment_method || sale.paymentMethod || '',
        igv: Number(sale.igv || 0),
        unitPrice: Number(sale.unit_price || sale.unitPrice || 0),
        subtotal: Number(sale.subtotal || 0),
        igvAmount: Number(sale.igv_amount || sale.igvAmount || 0),
        total: Number(sale.total || 0)
    };
}

async function seedSampleProductsIfNeeded(productsCount) {
    if (productsCount > 0) {
        return;
    }

    const { error } = await supabaseClient
        .from(INVENTORY_TABLE_NAME)
        .upsert(sampleProducts, { onConflict: 'id' });

    if (error) {
        throw error;
    }
}

async function loadState() {
    if (!ensureConfigured()) {
        return;
    }

    const [{ data: productRows, error: productsError }, { data: saleRows, error: salesError }] = await Promise.all([
        supabaseClient.from(INVENTORY_TABLE_NAME).select('*').order('id', { ascending: true }),
        supabaseClient.from('sales').select('*').order('date', { ascending: true })
    ]);

    if (productsError) {
        throw productsError;
    }

    if (salesError) {
        throw salesError;
    }

    if (!productRows.length) {
        await seedSampleProductsIfNeeded(productRows.length);
        return loadState();
    }

    state.products = productRows.map(normalizeProduct);
    state.sales = saleRows.map(normalizeSale);

    // Cargar compras del usuario desde Supabase
    const supabasePurchases = await loadPurchasesFromSupabase();
    if (supabasePurchases.length > 0) {
        state.purchases = supabasePurchases.map(normalizePurchaseRecord);
    } else {
        // Si no hay compras en Supabase, cargar del localStorage
        loadPurchasesFromStorage();

        const supabaseReceipts = await loadReceiptsFromSupabase();
        if (supabaseReceipts.length > 0) {
            state.receipts = supabaseReceipts;
        } else {
            loadReceiptsFromStorage();
        }
    }

    let imageCacheChanged = false;
    state.products.forEach((product) => {
        if (!product?.imageUrl) {
            return;
        }

        const key = normalizeProductImageKey(product.id);
        if (!key || productImages[key]) {
            return;
        }

        productImages[key] = product.imageUrl;
        imageCacheChanged = true;
    });

    if (imageCacheChanged) {
        saveProductImages();
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        maximumFractionDigits: 2
    }).format(Number(value || 0));
}

function formatDateTime(value) {
    return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
}

function toDateTimeLocalValue(value) {
    const date = value ? new Date(value) : new Date();
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(value) {
    return value ? new Date(value).toISOString() : new Date().toISOString();
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setMessage(target, message, isError = false) {
    target.textContent = message;
    target.classList.toggle('is-error', Boolean(isError));
    target.classList.add('is-visible');
}

function clearMessage(target) {
    target.textContent = '';
    target.classList.remove('is-visible', 'is-error');
}

function setOfflineState(message) {
    inventoryFeedback.textContent = message;
    inventoryFeedback.classList.add('is-visible', 'is-error');
    salesFeedback.textContent = message;
    salesFeedback.classList.add('is-visible', 'is-error');
}

function normalizeProductImageKey(productId) {
    return String(productId || '').trim().toLowerCase();
}

function loadProductImages() {
    try {
        const raw = localStorage.getItem(PRODUCT_IMAGE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const normalizedEntries = Object.entries(parsed || {})
            .filter(([key, value]) => Boolean(key) && Boolean(value))
            .map(([key, value]) => [normalizeProductImageKey(key), value]);

        productImages = Object.fromEntries(normalizedEntries);

        if (Object.keys(parsed || {}).length !== Object.keys(productImages).length) {
            saveProductImages();
        }
    } catch (_error) {
        productImages = {};
    }
}

function saveProductImages() {
    localStorage.setItem(PRODUCT_IMAGE_STORAGE_KEY, JSON.stringify(productImages));
}

function getProductImage(productId) {
    const key = normalizeProductImageKey(productId);
    return key ? (productImages[key] || '') : '';
}

function setProductImage(productId, imageDataUrl) {
    const key = normalizeProductImageKey(productId);
    if (!key) {
        return;
    }

    if (imageDataUrl) {
        productImages[key] = imageDataUrl;
    } else {
        delete productImages[key];
    }

    saveProductImages();
}

async function persistProductImageInSupabase(productId, imageDataUrl) {
    if (!ensureConfigured() || !canUseSupabaseProductImageColumn || !productId) {
        return;
    }

    const { error } = await supabaseClient
        .from(INVENTORY_TABLE_NAME)
        .update({ image_url: imageDataUrl || null })
        .eq('id', productId);

    if (!error) {
        return;
    }

    const message = String(error.message || '').toLowerCase();
    if (error.code === 'PGRST204' || message.includes('image_url') || message.includes('column')) {
        canUseSupabaseProductImageColumn = false;
        return;
    }

    console.warn('No se pudo sincronizar la imagen con Supabase:', error.message || error);
}

async function savePurchaseToSupabase(purchase) {
    if (!ensureConfigured() || !purchase || !currentClientId || !canUseSupabaseClientIdColumn) {
        return;
    }

    try {
        const { error } = await supabaseClient.from('client_purchases').insert({
            cliente_id: currentClientId,
            purchase_data: purchase,
            created_at: new Date().toISOString()
        });

        const message = String(error?.message || '').toLowerCase();
        if (error && (error.code === 'PGRST204' || message.includes('cliente_id') || message.includes('column'))) {
            canUseSupabaseClientIdColumn = false;
            return;
        }

        if (error) {
            console.warn('No se pudo sincronizar la compra con Supabase:', error.message || error);
            return;
        }
    } catch (err) {
        console.warn('Error al guardar compra en Supabase:', err);
    }
}

async function loadPurchasesFromSupabase() {
    if (!ensureConfigured() || !currentClientId || !canUseSupabaseClientIdColumn) {
        return [];
    }

    try {
        const { data, error } = await supabaseClient
            .from('client_purchases')
            .select('purchase_data')
            .eq('cliente_id', currentClientId)
            .order('created_at', { ascending: false });

        const message = String(error?.message || '').toLowerCase();
        if (error && (error.code === 'PGRST204' || message.includes('cliente_id') || message.includes('column'))) {
            canUseSupabaseClientIdColumn = false;
            return [];
        }

        if (error) {
            console.warn('No se pudo cargar compras desde Supabase:', error.message || error);
            return [];
        }

        return Array.isArray(data) ? data.map((record) => record.purchase_data).filter(Boolean) : [];
    } catch (err) {
        console.warn('Error al cargar compras de Supabase:', err);
        return [];
    }
}

function getCatalogSearchQuery() {
    return (catalogSearch?.value || '').trim().toLowerCase();
}

function normalizeCategory(value) {
    return String(value || '').trim().toLowerCase();
}

function getCatalogCategoryOptions() {
    const categoryMap = new Map();

    state.products.forEach((product) => {
        const rawCategory = String(product.category || '').trim() || 'Sin categoria';
        const key = normalizeCategory(rawCategory) || 'sin categoria';

        if (!categoryMap.has(key)) {
            categoryMap.set(key, rawCategory);
        }
    });

    const sortedCategories = Array.from(categoryMap.entries())
        .sort((first, second) => first[1].localeCompare(second[1], 'es', { sensitivity: 'base' }))
        .map(([key, label]) => ({ key, label }));

    return [{ key: CATALOG_CATEGORY_ALL, label: 'Todos' }, ...sortedCategories];
}

function setActiveCatalogCategory(categoryKey) {
    activeCatalogCategory = categoryKey || CATALOG_CATEGORY_ALL;
    renderCatalog();
}

function getFilteredCatalogProducts() {
    const query = getCatalogSearchQuery();
    const hasSelectedCategory = activeCatalogCategory && activeCatalogCategory !== CATALOG_CATEGORY_ALL;

    if (hasSelectedCategory) {
        const selectedCategoryExists = state.products.some((product) => normalizeCategory(product.category) === activeCatalogCategory);
        if (!selectedCategoryExists) {
            activeCatalogCategory = CATALOG_CATEGORY_ALL;
        }
    }

    return state.products.filter((product) => {
        const matchesCategory = activeCatalogCategory === CATALOG_CATEGORY_ALL
            || normalizeCategory(product.category) === activeCatalogCategory;

        if (!matchesCategory) {
            return false;
        }

        if (!query) {
            return true;
        }

        const text = [product.id, product.name, product.category, product.price].join(' ').toLowerCase();
        return text.includes(query);
    });
}

function readImageFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
        reader.readAsDataURL(file);
    });
}

function isHttpImageUrl(value) {
    if (!value) {
        return false;
    }

    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (_error) {
        return false;
    }
}

function setInventoryImagePreview(src) {
    if (!inventoryImagePreview) {
        return;
    }

    if (!src) {
        inventoryImagePreview.hidden = true;
        inventoryImagePreview.removeAttribute('src');
        return;
    }

    inventoryImagePreview.src = src;
    inventoryImagePreview.hidden = false;
}

async function refreshData() {
    await loadState();
    renderInventoryTable();
    populateSaleProducts(saleProductId.value);
    renderSalesTable();
    renderHistoryTable();
    renderElectronicReceiptSales();
    renderElectronicReceiptDraft();
    renderElectronicReceiptRecords();
    renderSalesStatistics();
    renderCatalog();
    renderCart();
    renderPurchaseHistory();
    renderStoreProfile();
    updateSalePreview();
    updateMetrics();
    updateInsight();
    updateDashboardMetrics();
}

function getProductSearchQuery() {
    return inventorySearch.value.trim().toLowerCase();
}

function getSalesSearchQuery() {
    return salesSearch.value.trim().toLowerCase();
}

function getFilteredProducts() {
    const query = getProductSearchQuery();

    if (!query) {
        return state.products.slice();
    }

    return state.products.filter((product) => {
        const text = [product.id, product.name, product.category, product.fecha_vencimiento, product.stock, product.price].join(' ').toLowerCase();
        return text.includes(query);
    });
}

function getFilteredSales() {
    const query = getSalesSearchQuery();

    // apply text search first
    const base = !query ? state.sales.slice() : state.sales.filter((sale) => {
        const text = [sale.id, sale.productName, sale.date, sale.paymentMethod, sale.igv, sale.igvAmount, sale.quantity, sale.total].join(' ').toLowerCase();
        return text.includes(query);
    });

    // then apply date range filter if provided
    const fromVal = (salesDateFrom?.value || '').trim();
    const toVal = (salesDateTo?.value || '').trim();

    if (!fromVal && !toVal) {
        return base;
    }

    const start = fromVal ? new Date(`${fromVal}T00:00:00`) : null;
    const end = toVal ? new Date(`${toVal}T23:59:59.999`) : null;

    return base.filter((sale) => {
        try {
            const sd = new Date(sale.date);
            if (Number.isNaN(sd.getTime())) return false;
            if (start && sd < start) return false;
            if (end && sd > end) return false;
            return true;
        } catch (_e) {
            return false;
        }
    });
}

function updateMetrics() {
    metricProducts.textContent = state.products.length;
    metricStock.textContent = state.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    metricSales.textContent = state.sales.length;
    metricRevenue.textContent = formatCurrency(state.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0));
}

function updateInsight() {
    if (!state.products.length) {
        insightHeadline.textContent = 'Crea tu primer producto';
        insightCopy.textContent = 'El módulo de ventas se habilita cuando registres inventario.';
        return;
    }

    const totalStock = state.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const lowStock = state.products.filter((product) => Number(product.stock || 0) <= 5).length;

    insightHeadline.textContent = `${state.products.length} productos activos y ${totalStock} unidades en inventario`;
    insightCopy.textContent = lowStock
        ? `Tienes ${lowStock} producto${lowStock === 1 ? '' : 's'} con stock bajo.`
        : 'El inventario está saludable y listo para operar.';
}

function getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysSales = state.sales.filter((sale) => {
        const saleDate = new Date(sale.date);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === today.getTime();
    });
    
    const todaysTotalRevenue = todaysSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    
    const avgTicket = state.sales.length > 0
        ? state.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0) / state.sales.length
        : 0;
    
    const productSalesCount = {};
    const productSalesRevenue = {};
    state.sales.forEach((sale) => {
        const productId = sale.productId;
        productSalesCount[productId] = (productSalesCount[productId] || 0) + Number(sale.quantity || 0);
        productSalesRevenue[productId] = (productSalesRevenue[productId] || 0) + Number(sale.total || 0);
    });
    
    let topProduct = '-';
    if (Object.keys(productSalesCount).length > 0) {
        const topProductId = Object.entries(productSalesCount).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topProductObj = state.products.find((p) => p.id === topProductId);
        topProduct = topProductObj ? `${topProductObj.name} (${productSalesCount[topProductId]} unid.)` : topProductId;
    }
    
    const lowStockCount = state.products.filter((p) => Number(p.stock || 0) <= 5).length;
    
    return {
        todaysSales: todaysSales.length,
        todaysTotalRevenue,
        avgTicket,
        topProduct,
        lowStockCount
    };
}

function updateDashboardMetrics() {
    const metrics = getDashboardMetrics();
    
    if (metricTodaySales) metricTodaySales.textContent = metrics.todaysSales;
    if (metricAverageTicket) metricAverageTicket.textContent = formatCurrency(metrics.avgTicket);
    if (metricTopProduct) metricTopProduct.textContent = metrics.topProduct;
    if (metricLowStock) metricLowStock.textContent = metrics.lowStockCount;
}

function showConfirmationModal(title, message, callback) {
    if (!confirmationModal) return;
    
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;
    confirmationCallback = callback;
    confirmationModal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeConfirmationModal() {
    if (!confirmationModal) return;
    
    confirmationModal.hidden = true;
    confirmationCallback = null;
    document.body.style.overflow = '';
}

function updateCartItemQuantity(productId, newQuantity) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;
    
    const maxStock = Number(product.stock || 0);
    const validQuantity = Math.max(0, Math.min(newQuantity, maxStock));
    
    if (validQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const cartItem = state.cart.find((item) => item.productId === productId);
    if (cartItem) {
        cartItem.quantity = validQuantity;
        saveCartToStorage();
        renderCart();
    }
}

function resetInventoryForm() {
    inventoryEditingId = null;
    inventoryRemoveImage = false;
    inventoryForm.reset();
    if (inventoryExpirationDate) {
        inventoryExpirationDate.value = '';
    }
    if (inventoryImageUrl) {
        inventoryImageUrl.value = '';
    }
    inventoryFormTitle.textContent = 'Nuevo producto';
    inventoryFormMode.textContent = 'Alta';
    inventoryCancelButton.hidden = true;
    setInventoryImagePreview('');
    clearMessage(inventoryFeedback);
}

function resetSalesForm() {
    salesEditingId = null;
    salesForm.reset();
    saleDate.value = toDateTimeLocalValue();
    saleQuantity.value = 1;
    saleIgv.value = 18;
    salesFormTitle.textContent = 'Nueva venta';
    salesFormMode.textContent = 'Alta';
    salesCancelButton.hidden = true;
    clearMessage(salesFeedback);
    populateSaleProducts();
    updateSalePreview();
}

function populateSaleProducts(selectedId = '') {
    saleProductId.innerHTML = '';

    if (!state.products.length) {
        saleProductId.innerHTML = '<option value="">No hay productos registrados</option>';
        saleProductId.disabled = true;
        return;
    }

    saleProductId.disabled = false;
    saleProductId.innerHTML = state.products.map((product) => {
        const expirationInfo = getProductExpirationInfo(product);
        const selected = product.id === selectedId ? ' selected' : '';
        const disabled = expirationInfo.isExpired ? ' disabled' : '';
        const suffix = expirationInfo.isExpired ? ' - VENCIDO' : '';
        return `<option value="${escapeHtml(product.id)}"${selected}${disabled}>${escapeHtml(product.name)} (${escapeHtml(product.id)})${suffix}</option>`;
    }).join('');

    if (selectedId) {
        saleProductId.value = selectedId;
    }
}

function getSalePreviewData() {
    const product = state.products.find((item) => item.id === saleProductId.value);
    const quantity = Math.max(1, Number(saleQuantity.value || 1));
    const igvPercent = Math.max(0, Number(saleIgv.value || 0));

    if (!product) {
        return null;
    }

    if (getProductExpirationInfo(product).isExpired) {
        return null;
    }

    const unitPrice = Number(product.price || 0);
    const subtotal = quantity * unitPrice;
    const igvAmount = subtotal * (igvPercent / 100);
    const total = subtotal;

    return { product, quantity, unitPrice, subtotal, igvAmount, total, igvPercent };
}

function updateSalePreview() {
    const preview = getSalePreviewData();

    if (!preview) {
        saleUnitPricePreview.textContent = formatCurrency(0);
        saleSubtotalPreview.textContent = formatCurrency(0);
        saleIgvAmountPreview.textContent = formatCurrency(0);
        saleTotalPreview.textContent = formatCurrency(0);
        saleSummaryPreview.textContent = 'Selecciona un producto para ver el cálculo.';
        return;
    }

    saleUnitPricePreview.textContent = formatCurrency(preview.unitPrice);
    saleSubtotalPreview.textContent = formatCurrency(preview.subtotal);
    saleIgvAmountPreview.textContent = formatCurrency(preview.igvAmount);
    saleTotalPreview.textContent = formatCurrency(preview.total);
    saleSummaryPreview.textContent = `Stock disponible: ${preview.product.stock} unidades. Total = precio x cantidad.`;
}

// ===== THEME TOGGLE FUNCTIONALITY =====
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const themeButton = document.getElementById('themeToggleButton');
    
    if (theme === 'light') {
        body.classList.add('light-theme');
        if (themeButton) themeButton.textContent = '🌙';
    } else {
        body.classList.remove('light-theme');
        if (themeButton) themeButton.textContent = '☀️';
    }
    
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
    const body = document.body;
    const isLightTheme = body.classList.contains('light-theme');
    const newTheme = isLightTheme ? 'dark' : 'light';
    applyTheme(newTheme);
}

// Inicializar tema cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    const themeButton = document.getElementById('themeToggleButton');
    if (themeButton) {
        themeButton.addEventListener('click', toggleTheme);
    }
});