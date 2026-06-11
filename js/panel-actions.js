function addToCart(productId) {
    const product = state.products.find((item) => item.id === productId);
    const expirationInfo = getProductExpirationInfo(product);

    if (!product || Number(product.stock || 0) <= 0) {
        setMessage(catalogFeedback, 'El producto no tiene stock disponible.', true);
        return;
    }

    if (expirationInfo.isExpired) {
        setMessage(catalogFeedback, 'No puedes agregar al carrito un producto vencido.', true);
        return;
    }

    const currentCartItem = state.cart.find((item) => item.productId === productId);
    const currentQty = currentCartItem ? Number(currentCartItem.quantity || 0) : 0;

    if (currentQty + 1 > Number(product.stock || 0)) {
        setMessage(catalogFeedback, 'No puedes agregar más unidades que el stock disponible.', true);
        return;
    }

    if (currentCartItem) {
        currentCartItem.quantity += 1;
    } else {
        state.cart.push({ productId, quantity: 1 });
    }

    setMessage(catalogFeedback, 'Producto agregado al carrito.');
    saveCartToStorage();
    renderCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter((item) => item.productId !== productId);
    saveCartToStorage();
    renderCart();
}

function clearCart() {
    state.cart = [];
    state.deliveryShippingCost = 0;
    state.deliveryShippingSignature = '';
    saveCartToStorage();
    clearMessage(catalogFeedback);
    renderCart();
}

function getCartReceiptTypeLabel(format) {
    if (format === 'payment') {
        return 'Boleta de compras';
    }

    if (format === 'sale-ticket') {
        return 'Boleta ticket';
    }

    return 'Boleta electrónica';
}

function buildReceiptFromCart(documentFormat = 'electronic') {
    if (!state.cart.length) {
        throw new Error('Agrega productos al carrito antes de generar la boleta.');
    }

    const detailedItems = state.cart.map((cartItem) => {
        const product = state.products.find((item) => item.id === cartItem.productId);
        if (!product) {
            return null;
        }

        const quantity = Number(cartItem.quantity || 0);
        const unitPrice = Number(product.price || 0);
        const total = quantity * unitPrice;
        const subtotal = total / 1.18;
        const igv = total - subtotal;

        return {
            saleId: `CRT-${product.id}-${Date.now()}`,
            productId: product.id,
            description: product.name,
            quantity,
            unitPrice,
            subtotal,
            igv,
            total
        };
    }).filter(Boolean);

    if (!detailedItems.length) {
        throw new Error('No se encontraron productos válidos para generar la boleta.');
    }

    const subtotal = detailedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const igv = detailedItems.reduce((sum, item) => sum + Number(item.igv || 0), 0);
    const total = detailedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const serie = getReceiptSeriesByDocType('Boleta');
    const correlative = padReceiptCorrelative(getReceiptNextCorrelative(serie));
    const nowIso = new Date().toISOString();

    return {
        id: `${serie}-${correlative}`,
        docType: 'Boleta',
        docTypeCode: '03',
        documentFormat,
        typeLabel: getCartReceiptTypeLabel(documentFormat),
        serie,
        correlative,
        issueDate: nowIso,
        seller: currentUserEmail || 'Vendedor',
        paymentMethod: getCheckoutPaymentMethod(),
        issuer: {
            ruc: '10411336234',
            name: (state.storeProfile?.name || 'OBREGON CABRERA EULOGIO').toUpperCase(),
            address: (state.storeProfile?.locations?.[0] || 'AMAZONAS - CHACHAPOYAS - CHACHAPOYAS').toUpperCase()
        },
        client: {
            docType: '0',
            docNumber: '',
            name: 'CLIENTE VARIOS'
        },
        items: detailedItems,
        subtotal,
        igv,
        total,
        status: 'emitido',
        createdAt: nowIso,
        source: 'catalog-cart',
        sunatLike: {
            ublVersion: '2.1',
            operationType: '0101',
            documentType: '03',
            currency: 'PEN',
            emisor: {
                ruc: '10411336234',
                razonSocial: state.storeProfile?.name || 'NOVA GEST STORE',
                direccion: state.storeProfile?.locations?.[0] || 'LIMA'
            }
        }
    };
}

async function generateReceiptFromCart() {
    try {
        const format = cartReceiptType?.value || 'electronic';
        const receipt = buildReceiptFromCart(format);
        await upsertReceipt(receipt);
        bumpReceiptSequence(receipt.serie);
        renderElectronicReceiptRecords();
        downloadElectronicReceiptPdf(receipt);
        setMessage(catalogFeedback, `${receipt.typeLabel || 'Boleta'} generada y guardada: ${receipt.id}`);
    } catch (error) {
        setMessage(catalogFeedback, error.message || 'No se pudo generar la boleta desde el carrito.', true);
    }
}

function getCheckoutPaymentMethod() {
    return checkoutPaymentMethod?.value?.trim() || 'Efectivo';
}

function getCheckoutOrderType() {
    return checkoutOrderType?.value === 'delivery' ? 'delivery' : 'store';
}

function getCheckoutDeliveryAddress() {
    const fallback = state.storeProfile?.locations?.[0] || 'Recojo en tienda';
    return checkoutDeliveryAddress?.value?.trim() || fallback;
}

function getCheckoutLocationMapLink() {
    return checkoutLocationLink?.value?.trim() || '';
}

function getCartPricingSummary() {
    const detailedItems = state.cart.map((item) => {
        const product = state.products.find((p) => p.id === item.productId);
        return product ? { item, product } : null;
    }).filter(Boolean);

    const subtotal = detailedItems.reduce((sum, entry) => sum + Number(entry.item.quantity || 0) * Number(entry.product.price || 0), 0);
    const shippingCost = getDeliveryShippingCost(detailedItems);
    const total = subtotal + shippingCost;

    return { subtotal, shippingCost, total };
}

function prepareOrder() {
    if (!state.cart.length) {
        setMessage(catalogFeedback, 'Agrega productos al carrito antes de realizar el pedido.', true);
        return null;
    }

    const orderType = getCheckoutOrderType();
    const locationLink = getCheckoutLocationMapLink();
    if (orderType === 'delivery' && !isValidGoogleMapsLink(locationLink)) {
        setMessage(catalogFeedback, 'Ingresa un link válido de Google Maps para la entrega.', true);
        return null;
    }

    const paymentMethod = getCheckoutPaymentMethod();
    const deliveryAddress = getCheckoutDeliveryAddress();
    const pricing = getCartPricingSummary();

    setMessage(
        catalogFeedback,
        `Pedido listo: Subtotal ${formatCurrency(pricing.subtotal)}, Envío ${formatCurrency(pricing.shippingCost)}, Total ${formatCurrency(pricing.total)}. Ahora presiona "Proceder pago".`,
        false
    );

    return {
        orderType,
        paymentMethod,
        deliveryAddress,
        locationMapLink: orderType === 'delivery' ? locationLink : '',
        ...pricing
    };
}

function buildPurchaseVoucher(items, paymentMethod, deliveryAddress, locationMapLink = '', orderType = 'store', options = {}) {
    const normalizedItems = (items || []).map((item) => ({
        productId: item.productId || '',
        productName: item.productName || '',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0)
    }));

    const subtotal = normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const shippingCost = Number.isFinite(Number(options.shippingCost))
        ? Number(options.shippingCost)
        : (normalizedItems.length && orderType === 'delivery'
            ? getDeliveryShippingCost(normalizedItems, normalizedItems.map((item) => `${item.productId}:${item.quantity}:${item.total}`).join('|'))
            : 0);

    return {
        id: options.id || `PED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: options.date || new Date().toISOString(),
        paymentMethod,
        deliveryAddress,
        locationMapLink,
        orderType,
        receiptId: options.receiptId || '',
        saleIds: Array.isArray(options.saleIds) ? Array.from(new Set(options.saleIds.filter(Boolean))) : [],
        items: normalizedItems,
        subtotal,
        shippingCost,
        total: subtotal + shippingCost
    };
}

function buildPurchaseVoucherFromCart(existingPurchase) {
    const items = state.cart
        .map((cartItem) => {
            const product = state.products.find((item) => item.id === cartItem.productId);
            if (!product) {
                return null;
            }

            const quantity = Math.max(1, Number(cartItem.quantity || 0));
            const unitPrice = Number(product.price || 0);

            return {
                productId: product.id,
                productName: product.name,
                quantity,
                unitPrice,
                total: quantity * unitPrice
            };
        })
        .filter(Boolean);

    if (!items.length) {
        throw new Error('Agrega productos al carrito antes de actualizar la compra.');
    }

    const paymentMethod = getCheckoutPaymentMethod();
    const deliveryAddress = getCheckoutDeliveryAddress();
    const orderType = getCheckoutOrderType();
    const locationMapLink = orderType === 'delivery' ? getCheckoutLocationMapLink() : '';

    return buildPurchaseVoucher(
        items,
        paymentMethod,
        deliveryAddress,
        locationMapLink,
        orderType,
        {
            id: existingPurchase?.id || undefined,
            date: existingPurchase?.date || new Date().toISOString(),
            receiptId: existingPurchase?.receiptId || '',
            shippingCost: existingPurchase?.shippingCost || 0
        }
    );
}

    function buildAutomaticReceiptFromPurchase(purchase) {
        const source = normalizePurchaseRecord(purchase);
        if (!source) {
            throw new Error('No se pudo preparar la boleta automática del pedido.');
        }

        const baseItems = (Array.isArray(source.items) ? source.items : []).map((item) => {
            const lineTotal = Number(item.total || 0);
            const subtotal = lineTotal / 1.18;
            return {
                productId: item.productId || '',
                description: item.productName || 'Producto',
                quantity: Number(item.quantity || 0),
                unitPrice: Number(item.unitPrice || 0),
                subtotal,
                igv: lineTotal - subtotal,
                total: lineTotal
            };
        });

        if (Number(source.shippingCost || 0) > 0) {
            baseItems.push({
                productId: 'DELIVERY',
                description: 'Costo de delivery',
                quantity: 1,
                unitPrice: Number(source.shippingCost || 0),
                subtotal: Number(source.shippingCost || 0),
                igv: 0,
                total: Number(source.shippingCost || 0)
            });
        }

        const subtotal = baseItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
        const igv = baseItems.reduce((sum, item) => sum + Number(item.igv || 0), 0);
        const total = baseItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const serie = getReceiptSeriesByDocType('Boleta');
        const correlative = padReceiptCorrelative(getReceiptNextCorrelative(serie));
        const nowIso = new Date().toISOString();

        return {
            id: `${serie}-${correlative}`,
            docType: 'Boleta',
            docTypeCode: '03',
            documentFormat: 'electronic',
            typeLabel: 'Boleta electrónica',
            serie,
            correlative,
            issueDate: nowIso,
            seller: currentUserEmail || 'Vendedor',
            paymentMethod: source.paymentMethod || getCheckoutPaymentMethod(),
            issuer: {
                ruc: '10411336234',
                name: (state.storeProfile?.name || 'OBREGON CABRERA EULOGIO').toUpperCase(),
                address: (state.storeProfile?.locations?.[0] || 'AMAZONAS - CHACHAPOYAS - CHACHAPOYAS').toUpperCase()
            },
            client: {
                docType: '0',
                docNumber: '',
                name: 'CLIENTE VARIOS'
            },
            saleIds: baseItems.map((item) => item.saleId).filter(Boolean),
            items: baseItems,
            subtotal,
            igv,
            total,
            status: 'emitido',
            createdAt: nowIso,
            source: 'purchase-checkout',
            purchaseId: source.id,
            sunatLike: {
                ublVersion: '2.1',
                operationType: '0101',
                documentType: '03',
                currency: 'PEN',
                emisor: {
                    ruc: '10411336234',
                    razonSocial: state.storeProfile?.name || 'NOVA GEST STORE',
                    direccion: state.storeProfile?.locations?.[0] || 'LIMA'
                }
            }
        };
    }

    function sendPurchaseWhatsAppConfirmation(purchaseId) {
        const purchase = findPurchaseById(purchaseId);
        if (!purchase) {
            setMessage(catalogFeedback, 'No se encontró el pedido para confirmar por WhatsApp.', true);
            return false;
        }

        return openWhatsAppMessage(buildPurchaseWhatsAppMessage(purchase), catalogFeedback);
    }

function editPurchaseFromHistory(purchaseId) {
    const purchase = findPurchaseById(purchaseId);
    if (!purchase) {
        setMessage(catalogFeedback, 'No se encontró la compra para editar.', true);
        return;
    }

    if (!loadPurchaseIntoCart(purchase)) {
        setMessage(catalogFeedback, 'No se pudo cargar la compra en el carrito.', true);
        return;
    }

    renderPurchaseHistory();
    setMessage(catalogFeedback, `Compra ${purchase.id} cargada para edición. Actualiza el carrito y pulsa Actualizar.`, false);
}

async function updatePurchaseFromHistory(purchaseId) {
    const purchase = findPurchaseById(purchaseId);
    if (!purchase) {
        setMessage(catalogFeedback, 'No se encontró la compra para actualizar.', true);
        return;
    }

    if (state.purchaseEditingId && state.purchaseEditingId !== purchase.id) {
        setMessage(catalogFeedback, 'Primero edita la compra que deseas actualizar.', true);
        return;
    }

    try {
        const updatedPurchase = buildPurchaseVoucherFromCart(purchase);
        replacePurchaseRecord(updatedPurchase);
        setPurchaseEditingId('');
        renderPurchaseHistory();
        setMessage(catalogFeedback, `Compra ${updatedPurchase.id} actualizada correctamente.`, false);
    } catch (error) {
        setMessage(catalogFeedback, error.message || 'No se pudo actualizar la compra.', true);
    }
}

function deletePurchaseFromHistory(purchaseId) {
    const purchase = findPurchaseById(purchaseId);
    if (!purchase) {
        setMessage(catalogFeedback, 'No se encontró la compra para eliminar.', true);
        return;
    }

    const removed = deletePurchaseRecord(purchase.id);
    if (!removed) {
        setMessage(catalogFeedback, 'No se pudo eliminar la compra.', true);
        return;
    }

    if (state.purchaseEditingId === purchase.id) {
        clearCart();
    }

    renderPurchaseHistory();
    setMessage(catalogFeedback, `Compra ${purchase.id} eliminada correctamente.`, false);
}

function findPurchaseById(purchaseId) {
    if (!Array.isArray(state.purchases) || !state.purchases.length) {
        return null;
    }

    if (!purchaseId) {
        return state.purchases[0] || null;
    }

    return state.purchases.find((purchase) => purchase.id === purchaseId) || state.purchases[0] || null;
}

function downloadPurchaseVoucherPdf(purchase) {
    if (!purchase) {
        return;
    }

    if (!window.jspdf?.jsPDF) {
        alert('No se pudo cargar la librería de PDF.');
        return;
    }

    const items = Array.isArray(purchase.items) ? purchase.items : [];
    const doc = new window.jspdf.jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

    doc.setFillColor(14, 165, 233);
    doc.roundedRect(40, 40, 515, 80, 14, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(state.storeProfile?.name || 'NovaGest', 297, 74, { align: 'center' });
    doc.setFontSize(13);
    doc.text('Voucher de Pedido', 297, 96, { align: 'center' });

    doc.setTextColor(22, 28, 36);
    doc.setFontSize(12);
    const startY = 150;
    const orderTypeLabel = purchase.orderType === 'delivery' ? 'Pedido delivery' : 'Compra en tienda';
    const locationLabel = purchase.orderType === 'delivery'
        ? (purchase.locationMapLink || 'No registrada')
        : 'No requerida (compra en tienda)';
    doc.text(`ID Pedido: ${purchase.id || '-'}`, 58, startY);
    doc.text(`Fecha: ${new Date(purchase.date).toLocaleString('es-PE')}`, 58, startY + 24);
    doc.text(`Modalidad: ${orderTypeLabel}`, 58, startY + 48);
    doc.text(`Entrega: ${purchase.deliveryAddress || 'Recojo en tienda'}`, 58, startY + 72);
    doc.text(`Método de pago: ${purchase.paymentMethod || 'Efectivo'}`, 58, startY + 96);
    doc.text(`Ubicación: ${locationLabel}`, 58, startY + 120);

    doc.autoTable({
        startY: startY + 146,
        head: [['Producto', 'Cantidad', 'Precio Unitario', 'Total']],
        body: items.map((item) => [
            item.productName || '',
            String(Number(item.quantity || 0)),
            formatCurrency(item.unitPrice || 0),
            formatCurrency(item.total || 0)
        ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [14, 165, 233] }
    });

    const finalY = doc.lastAutoTable?.finalY || 430;
    const shippingCost = Number(purchase.shippingCost || 0);
    const total = Number(purchase.total || 0);
    doc.setFontSize(12);
    doc.text(`Subtotal: ${formatCurrency(purchase.subtotal || 0)}`, 420, finalY + 24, { align: 'right' });
    doc.text(`Envío: ${formatCurrency(shippingCost)}`, 420, finalY + 44, { align: 'right' });
    doc.setFontSize(17);
    doc.setTextColor(14, 165, 233);
    doc.text(`Total pagado: ${formatCurrency(total)}`, 420, finalY + 72, { align: 'right' });

    doc.setTextColor(95, 112, 130);
    doc.setFontSize(11);
    doc.text('Gracias por tu compra.', 297, finalY + 104, { align: 'center' });
    doc.save(`voucher-${purchase.id || getReportFileSuffix()}.pdf`);
}

async function registerQuickSale(product, quantity, paymentMethod) {
    const expirationInfo = getProductExpirationInfo(product);
    const stock = Number(product.stock || 0);
    if (expirationInfo.isExpired) {
        throw new Error(`El producto ${product.name} está vencido y no se puede vender.`);
    }

    if (quantity > stock) {
        throw new Error(`Stock insuficiente para ${product.name}.`);
    }

    const unitPrice = Number(product.price || 0);
    const subtotal = quantity * unitPrice;
    const igv = 18;
    const igvAmount = subtotal * (igv / 100);
    const total = subtotal;

    const salePayload = {
        id: `VTA-RAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        product_id: product.id,
        product_name: product.name,
        date: new Date().toISOString(),
        quantity,
        payment_method: paymentMethod,
        igv,
        unit_price: unitPrice,
        subtotal,
        igv_amount: igvAmount,
        total
    };

    const stockError = await updateProductStock(product.id, stock - quantity);
    if (stockError) {
        throw new Error(stockError.message || 'No se pudo actualizar el stock.');
    }

    const { error: insertError } = await supabaseClient.from('sales').insert(salePayload);
    if (insertError) {
        await updateProductStock(product.id, stock);
        throw new Error(insertError.message || 'No se pudo guardar la compra.');
    }

    return {
        id: salePayload.id,
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        total,
        date: salePayload.date
    };
}

async function buyNow(productId) {
    if (!isAdminRole() && !isClientRole()) {
        setMessage(catalogFeedback, 'Acción no permitida: sesión inválida para realizar compras.', true);
        return;
    }

    const product = state.products.find((item) => item.id === productId);
    if (!product) {
        setMessage(catalogFeedback, 'Producto no encontrado.', true);
        return;
    }

    if (getProductExpirationInfo(product).isExpired) {
        setMessage(catalogFeedback, 'No puedes comprar un producto vencido.', true);
        return;
    }

    try {
        const orderType = getCheckoutOrderType();
        const locationMapLink = orderType === 'delivery' ? getCheckoutLocationMapLink() : '';
        const purchaseLine = await registerQuickSale(product, 1, getCheckoutPaymentMethod());
        const voucher = buildPurchaseVoucher([purchaseLine], getCheckoutPaymentMethod(), getCheckoutDeliveryAddress(), locationMapLink, orderType, {
            saleIds: [purchaseLine.id],
            shippingCost: orderType === 'delivery'
                ? getDeliveryShippingCost([purchaseLine], `${purchaseLine.id || product.id}:${purchaseLine.total}`)
                : 0
        });
        const receipt = buildAutomaticReceiptFromPurchase(voucher);
        voucher.receiptId = receipt.id;
        addPurchaseRecords([voucher]);
        await upsertReceipt(receipt);
        const shouldOpenWhatsApp = isClientRole() && orderType === 'delivery';
        if (shouldOpenWhatsApp) {
            openWhatsAppMessage(buildPurchaseWhatsAppMessage(voucher), catalogFeedback);
        }
        setMessage(catalogFeedback, 'Compra realizada correctamente.');
        await refreshData();
    } catch (error) {
        setMessage(catalogFeedback, error.message || 'No se pudo completar la compra.', true);
    }
}

async function checkoutCart() {
    if (!isAdminRole() && !isClientRole()) {
        setMessage(catalogFeedback, 'Acción no permitida: sesión inválida para realizar compras.', true);
        return;
    }
    const preparedOrder = prepareOrder();
    if (!preparedOrder) {
        return;
    }

    try {
        const completedPurchases = [];
        const paymentMethod = preparedOrder.paymentMethod;
        for (const cartItem of state.cart) {
            const product = state.products.find((item) => item.id === cartItem.productId);
            if (!product) {
                throw new Error('Uno de los productos del carrito ya no existe.');
            }

            if (getProductExpirationInfo(product).isExpired) {
                throw new Error(`El producto ${product.name} está vencido y no se puede vender.`);
            }

            const purchase = await registerQuickSale(product, Number(cartItem.quantity || 0), paymentMethod);
            completedPurchases.push(purchase);
            await loadState();
        }

        const voucher = buildPurchaseVoucher(
            completedPurchases,
            paymentMethod,
            preparedOrder.deliveryAddress,
            preparedOrder.locationMapLink,
            preparedOrder.orderType,
            {
                saleIds: completedPurchases.map((purchase) => purchase.id),
                shippingCost: preparedOrder.shippingCost
            }
        );
        const receipt = buildAutomaticReceiptFromPurchase(voucher);
        voucher.receiptId = receipt.id;
        addPurchaseRecords([voucher]);
        await upsertReceipt(receipt);
        renderVoucherModal(voucher);
        const shouldOpenWhatsApp = isClientRole() && preparedOrder.orderType === 'delivery';
        if (shouldOpenWhatsApp) {
            openWhatsAppMessage(buildPurchaseWhatsAppMessage(voucher), catalogFeedback);
        }
        clearCart();
        setMessage(
            catalogFeedback,
            shouldOpenWhatsApp
                ? 'Compra del carrito completada. Boleta generada y confirmación enviada por WhatsApp.'
                : 'Compra del carrito completada. Boleta generada correctamente.'
        );
        await refreshData();
    } catch (error) {
        setMessage(catalogFeedback, error.message || 'No se pudo procesar el carrito.', true);
    }
}

function getHistoryReportRows() {
    return state.sales.slice().reverse().map((sale) => ({
        id: sale.id,
        producto: sale.productName,
        fecha: formatDateTime(sale.date),
        cantidad: Number(sale.quantity || 0),
        metodo: sale.paymentMethod,
        igv: Number(sale.igvAmount || 0),
        total: Number(sale.total || 0)
    }));
}

function getReportFileSuffix() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function exportHistoryToExcel() {
    if (!state.sales.length) {
        alert('No hay ventas para exportar.');
        return;
    }

    if (!window.XLSX) {
        alert('No se pudo cargar la librería de Excel.');
        return;
    }

    const rows = getHistoryReportRows().map((row) => ({
        'ID Venta': row.id,
        'Producto': row.producto,
        'Fecha': row.fecha,
        'Cantidad': row.cantidad,
        'Método': row.metodo,
        'IGV (S/)': Number(row.igv.toFixed(2)),
        'Total (S/)': Number(row.total.toFixed(2))
    }));

    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'HistorialVentas');
    window.XLSX.writeFile(workbook, `reporte-ventas-${getReportFileSuffix()}.xlsx`);
}

function exportHistoryToPdf() {
    if (!state.sales.length) {
        alert('No hay ventas para exportar.');
        return;
    }

    if (!window.jspdf?.jsPDF) {
        alert('No se pudo cargar la librería de PDF.');
        return;
    }

    const rows = getHistoryReportRows();
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const totalGeneral = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

    doc.setFontSize(14);
    doc.text('Reporte de Ventas - NovaGest', 40, 38);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, 40, 56);
    doc.text(`Total de ventas: ${rows.length} | Total general: ${formatCurrency(totalGeneral)}`, 40, 72);

    doc.autoTable({
        startY: 86,
        head: [['ID Venta', 'Producto', 'Fecha', 'Cantidad', 'Método', 'IGV (S/)', 'Total (S/)']],
        body: rows.map((row) => [
            row.id,
            row.producto,
            row.fecha,
            String(row.cantidad),
            row.metodo,
            formatCurrency(row.igv),
            formatCurrency(row.total)
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [14, 165, 233] }
    });

    doc.save(`reporte-ventas-${getReportFileSuffix()}.pdf`);
}

function setActiveView(viewName) {
    if (isClientRole() && viewName !== 'catalogo' && viewName !== 'informacion') {
        viewName = 'catalogo';
    }

    navButtons.forEach((button) => {
        const active = button.dataset.view === viewName;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    screens.forEach((screen) => {
        const active = screen.dataset.viewPanel === viewName;
        screen.classList.toggle('is-active', active);
        screen.hidden = !active;
    });

    // Si se muestra el catálogo y es modo delivery, inicializar mapa (corrige render en contenedores ocultos)
    if (viewName === 'catalogo') {
        if (isDeliveryCheckout()) {
            try {
                initCheckoutMap();
                setTimeout(() => {
                    checkoutMapInstance?.invalidateSize();
                }, 200);
                updateCheckoutLocationPreview();
                updateCheckoutGoogleMapsButton();
            } catch (err) {
                console.warn('No se pudo inicializar el mapa de checkout:', err);
            }
        }
    }

    if (viewName === 'boletas') {
        ensureReceiptDraftDefaults();
        renderElectronicReceiptSales();
        renderElectronicReceiptDraft();
        renderElectronicReceiptRecords();
    }

    if (viewName === 'estadisticas') {
        renderSalesStatistics();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fillInventoryForm(product) {
    inventoryEditingId = product.id;
    inventoryRemoveImage = false;
    inventoryFormTitle.textContent = 'Editar producto';
    inventoryFormMode.textContent = 'Edición';
    inventoryCancelButton.hidden = false;
    inventoryId.value = product.id;
    inventoryName.value = product.name;
    inventoryStock.value = product.stock;
    inventoryPrice.value = product.price;
    inventoryCategory.value = product.category;
    if (inventoryExpirationDate) {
        inventoryExpirationDate.value = product.fecha_vencimiento || '';
    }
    const existingImage = getProductImage(product.id) || product.imageUrl || '';
    if (inventoryImageUrl) {
        inventoryImageUrl.value = isHttpImageUrl(existingImage) ? existingImage : '';
    }
    if (inventoryImage) {
        inventoryImage.value = '';
    }
    setInventoryImagePreview(existingImage);
    clearMessage(inventoryFeedback);
    setActiveView('inventario');
}

function fillSalesForm(sale) {
    salesEditingId = sale.id;
    salesFormTitle.textContent = 'Editar venta';
    salesFormMode.textContent = 'Edición';
    salesCancelButton.hidden = false;
    saleId.value = sale.id;
    populateSaleProducts(sale.productId);
    saleDate.value = toDateTimeLocalValue(sale.date);
    saleQuantity.value = sale.quantity;
    salePaymentMethod.value = sale.paymentMethod;
    saleIgv.value = sale.igv;
    clearMessage(salesFeedback);
    updateSalePreview();
    setActiveView('ventas');
}

async function addOrUpdateInventory() {
    if (!isAdminRole()) {
        setMessage(inventoryFeedback, 'No tienes permiso para gestionar inventario.', true);
        return;
    }

    const payload = {
        id: inventoryId.value.trim(),
        name: inventoryName.value.trim(),
        stock: Number(inventoryStock.value),
        price: Number(inventoryPrice.value),
        category: inventoryCategory.value.trim(),
        fecha_vencimiento: normalizeDateOnly(inventoryExpirationDate?.value)
    };

    if (!payload.id || !payload.name || !payload.category || !payload.fecha_vencimiento || Number.isNaN(payload.stock) || Number.isNaN(payload.price)) {
        setMessage(inventoryFeedback, 'Completa todos los campos del inventario.', true);
        return;
    }

    const duplicateId = state.products.find((product) => product.id === payload.id && product.id !== inventoryEditingId);

    if (duplicateId) {
        setMessage(inventoryFeedback, 'Ya existe un producto con ese ID.', true);
        return;
    }

    let uploadedImage = '';
    const imageUrlValue = inventoryImageUrl?.value?.trim() || '';
    if (imageUrlValue) {
        if (!isHttpImageUrl(imageUrlValue)) {
            setMessage(inventoryFeedback, 'La URL de imagen debe iniciar con http:// o https://', true);
            return;
        }

        uploadedImage = imageUrlValue;
    }

    const selectedFile = inventoryImage?.files?.[0];
    if (!uploadedImage && selectedFile) {
        if (!selectedFile.type.startsWith('image/')) {
            setMessage(inventoryFeedback, 'Solo puedes subir archivos de imagen.', true);
            return;
        }

        if (selectedFile.size > 2 * 1024 * 1024) {
            setMessage(inventoryFeedback, 'La imagen no debe superar 2 MB.', true);
            return;
        }

        uploadedImage = await readImageFileAsDataUrl(selectedFile);
    }

    if (inventoryEditingId) {
        const index = state.products.findIndex((product) => product.id === inventoryEditingId);

        if (index === -1) {
            setMessage(inventoryFeedback, 'No se encontró el producto a editar.', true);
            return;
        }

        const previousProduct = state.products[index];
        const { error: updateError } = await supabaseClient
            .from(INVENTORY_TABLE_NAME)
            .update(payload)
            .eq('id', inventoryEditingId);

        if (updateError) {
            setMessage(inventoryFeedback, updateError.message, true);
            return;
        }

        const { error: salesNameError } = await supabaseClient
            .from('sales')
            .update({ product_name: payload.name })
            .eq('product_id', payload.id);

        if (salesNameError) {
            await supabaseClient
                .from(INVENTORY_TABLE_NAME)
                .update({
                    id: previousProduct.id,
                    name: previousProduct.name,
                    stock: previousProduct.stock,
                    price: previousProduct.price,
                    category: previousProduct.category,
                    fecha_vencimiento: previousProduct.fecha_vencimiento || null,
                    image_url: previousProduct.imageUrl || null
                })
                .eq('id', payload.id);
            setMessage(inventoryFeedback, salesNameError.message, true);
            return;
        }

        setMessage(inventoryFeedback, 'Inventario actualizado correctamente.');
    } else {
        const { error: insertError } = await supabaseClient
            .from(INVENTORY_TABLE_NAME)
            .insert(payload);

        if (insertError) {
            setMessage(inventoryFeedback, insertError.message, true);
            return;
        }

        setMessage(inventoryFeedback, 'Producto agregado al inventario.');
    }

    const sourceImageId = inventoryEditingId || payload.id;
    const currentImage = getProductImage(sourceImageId);
    let nextImage = currentImage;

    if (sourceImageId !== payload.id) {
        setProductImage(sourceImageId, '');
    }

    if (uploadedImage) {
        nextImage = uploadedImage;
    } else if (inventoryRemoveImage) {
        nextImage = '';
    } else {
        nextImage = currentImage;
    }

    setProductImage(payload.id, nextImage);
    await persistProductImageInSupabase(payload.id, nextImage);

    inventoryRemoveImage = false;

    await refreshData();
    resetInventoryForm();
}

async function deleteInventory(id) {
    if (!isAdminRole()) {
        setMessage(inventoryFeedback, 'No tienes permiso para dar de baja productos.', true);
        return;
    }

    const product = state.products.find((item) => item.id === id);

    if (!product) {
        return;
    }

    if (inventoryEditingId === id) {
        resetInventoryForm();
    }

    const { error } = await supabaseClient
        .from(INVENTORY_TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) {
        setMessage(inventoryFeedback, error.message, true);
        return;
    }

    setProductImage(id, '');

    await refreshData();
}

async function updateProductStock(productId, nextStock) {
    const { error } = await supabaseClient
        .from(INVENTORY_TABLE_NAME)
        .update({ stock: nextStock })
        .eq('id', productId);

    return error;
}

async function addOrUpdateSale() {
    if (!isAdminRole()) {
        setMessage(salesFeedback, 'No tienes permiso para registrar ventas desde este módulo.', true);
        return;
    }

    const preview = getSalePreviewData();

    if (!preview) {
        setMessage(salesFeedback, 'Selecciona un producto válido.', true);
        return;
    }

    if (getProductExpirationInfo(preview.product).isExpired) {
        setMessage(salesFeedback, 'No puedes registrar ventas de un producto vencido.', true);
        return;
    }

    const salePayload = {
        id: saleId.value.trim(),
        productId: preview.product.id,
        productName: preview.product.name,
        date: toIsoFromDateTimeLocal(saleDate.value),
        quantity: preview.quantity,
        paymentMethod: salePaymentMethod.value,
        igv: Number(saleIgv.value || 0),
        unitPrice: preview.unitPrice,
        subtotal: preview.subtotal,
        igvAmount: preview.igvAmount,
        total: preview.total
    };

    if (!salePayload.id || !salePayload.paymentMethod) {
        setMessage(salesFeedback, 'Completa el ID y el método de pago.', true);
        return;
    }

    const duplicateId = state.sales.find((sale) => sale.id === salePayload.id && sale.id !== salesEditingId);

    if (duplicateId) {
        setMessage(salesFeedback, 'Ya existe una venta con ese ID.', true);
        return;
    }

    if (salesEditingId) {
        const index = state.sales.findIndex((sale) => sale.id === salesEditingId);

        if (index === -1) {
            setMessage(salesFeedback, 'No se encontró la venta a editar.', true);
            return;
        }

        const previousSale = state.sales[index];
        const targetProduct = state.products.find((product) => product.id === salePayload.productId);
        if (!targetProduct) {
            setMessage(salesFeedback, 'El producto seleccionado no existe en inventario.', true);
            return;
        }

        const sameProduct = previousSale.productId === salePayload.productId;
        let previousProduct = null;
        const originalTargetStock = Number(targetProduct.stock || 0);
        const originalPreviousStock = sameProduct ? null : Number(state.products.find((product) => product.id === previousSale.productId)?.stock || 0);

        if (!sameProduct) {
            previousProduct = state.products.find((product) => product.id === previousSale.productId);
            if (previousProduct) {
                const restoreError = await updateProductStock(previousProduct.id, Number(previousProduct.stock || 0) + Number(previousSale.quantity || 0));
                if (restoreError) {
                    setMessage(salesFeedback, restoreError.message, true);
                    return;
                }
            }
        }

        const availableStock = sameProduct
            ? Number(targetProduct.stock || 0) + Number(previousSale.quantity || 0)
            : Number(targetProduct.stock || 0);

        if (Number(salePayload.quantity) > availableStock) {
            if (!sameProduct && previousProduct) {
                await updateProductStock(previousProduct.id, Number(previousProduct.stock || 0));
            }
            setMessage(salesFeedback, 'No hay stock suficiente para actualizar la venta.', true);
            return;
        }

        const nextStock = sameProduct
            ? availableStock - Number(salePayload.quantity)
            : Number(targetProduct.stock || 0) - Number(salePayload.quantity);

        const stockError = await updateProductStock(targetProduct.id, nextStock);
        if (stockError) {
            if (!sameProduct && previousProduct) {
                await updateProductStock(previousProduct.id, Number(previousProduct.stock || 0));
            }
            setMessage(salesFeedback, stockError.message, true);
            return;
        }

        const { error: updateSaleError } = await supabaseClient
            .from('sales')
            .update({
                product_id: salePayload.productId,
                product_name: salePayload.productName,
                date: salePayload.date,
                quantity: salePayload.quantity,
                payment_method: salePayload.paymentMethod,
                igv: salePayload.igv,
                unit_price: salePayload.unitPrice,
                subtotal: salePayload.subtotal,
                igv_amount: salePayload.igvAmount,
                total: salePayload.total
            })
            .eq('id', salesEditingId);

        if (updateSaleError) {
            await updateProductStock(targetProduct.id, originalTargetStock);
            if (!sameProduct && previousProduct && originalPreviousStock !== null) {
                await updateProductStock(previousProduct.id, originalPreviousStock);
            }
            setMessage(salesFeedback, updateSaleError.message, true);
            return;
        }

        setMessage(salesFeedback, 'Venta actualizada correctamente.');
    } else {
        const targetProduct = state.products.find((product) => product.id === salePayload.productId);

        if (!targetProduct) {
            setMessage(salesFeedback, 'Selecciona un producto válido.', true);
            return;
        }

        if (salePayload.quantity > Number(targetProduct.stock)) {
            setMessage(salesFeedback, 'No hay stock suficiente para registrar la venta.', true);
            return;
        }

        const stockError = await updateProductStock(targetProduct.id, Number(targetProduct.stock || 0) - Number(salePayload.quantity));
        if (stockError) {
            setMessage(salesFeedback, stockError.message, true);
            return;
        }

        const { error: insertError } = await supabaseClient
            .from('sales')
            .insert({
                id: salePayload.id,
                product_id: salePayload.productId,
                product_name: salePayload.productName,
                date: salePayload.date,
                quantity: salePayload.quantity,
                payment_method: salePayload.paymentMethod,
                igv: salePayload.igv,
                unit_price: salePayload.unitPrice,
                subtotal: salePayload.subtotal,
                igv_amount: salePayload.igvAmount,
                total: salePayload.total
            });

        if (insertError) {
            await updateProductStock(targetProduct.id, Number(targetProduct.stock || 0));
            setMessage(salesFeedback, insertError.message, true);
            return;
        }

        setMessage(salesFeedback, 'Venta registrada correctamente.');
    }

    await refreshData();
    resetSalesForm();
}

async function deleteSale(id) {
    if (!isAdminRole()) {
        setMessage(salesFeedback, 'No tienes permiso para dar de baja ventas.', true);
        return;
    }

    const sale = state.sales.find((item) => item.id === id);

    if (!sale) {
        return;
    }

    const product = state.products.find((item) => item.id === sale.productId);
    if (product) {
        const stockError = await updateProductStock(product.id, Number(product.stock || 0) + Number(sale.quantity || 0));
        if (stockError) {
            setMessage(salesFeedback, stockError.message, true);
            return;
        }
    }

    if (salesEditingId === id) {
        resetSalesForm();
    }

    const { error } = await supabaseClient
        .from('sales')
        .delete()
        .eq('id', id);

    if (error) {
        setMessage(salesFeedback, error.message, true);
        return;
    }

    await refreshData();
}

function addSaleToReceiptDraft(saleId) {
    if (!saleId) {
        return;
    }

    const exists = state.sales.some((sale) => sale.id === saleId);
    if (!exists) {
        setMessage(receiptFeedback, 'La venta seleccionada ya no existe.', true);
        return;
    }

    const current = new Set(state.receiptDraftSaleIds || []);
    if (current.has(saleId)) {
        current.delete(saleId);
    } else {
        current.add(saleId);
    }

    state.receiptDraftSaleIds = Array.from(current);
    clearMessage(receiptFeedback);
    renderElectronicReceiptSales();
    renderElectronicReceiptDraft();
}

function removeSaleFromReceiptDraft(saleId) {
    state.receiptDraftSaleIds = (state.receiptDraftSaleIds || []).filter((id) => id !== saleId);
    renderElectronicReceiptSales();
    renderElectronicReceiptDraft();
}

function clearReceiptDraft() {
    state.receiptDraftSaleIds = [];
    renderElectronicReceiptSales();
    renderElectronicReceiptDraft();
    clearMessage(receiptFeedback);
}

function buildElectronicReceiptPayload(status, documentFormat = 'electronic') {
    ensureReceiptDraftDefaults();

    const totals = getReceiptDraftTotals();
    if (!totals.selectedSales.length) {
        throw new Error('Agrega al menos una venta al detalle del comprobante.');
    }

    const docType = receiptDocType?.value || 'Boleta';
    const serie = (receiptSerie?.value || getReceiptSeriesByDocType(docType)).trim().toUpperCase();
    const correlative = padReceiptCorrelative(receiptCorrelative?.value || getReceiptNextCorrelative(serie));
    const docTypeCode = docType === 'Factura' ? '01' : '03';

    return {
        id: `${serie}-${correlative}`,
        docType,
        documentFormat,
        docTypeCode,
        serie,
        correlative,
        issueDate: new Date().toISOString(),
        seller: (receiptSeller?.value || currentUserEmail || 'Vendedor').trim(),
        paymentMethod: receiptPaymentMethod?.value || 'Contado',
        issuer: {
            ruc: (receiptIssuerRuc?.value || '10411336234').trim(),
            name: (receiptIssuerName?.value || state.storeProfile?.name || 'OBREGON CABRERA EULOGIO').trim().toUpperCase(),
            address: (receiptIssuerAddress?.value || state.storeProfile?.locations?.[0] || 'AMAZONAS - CHACHAPOYAS - CHACHAPOYAS').trim().toUpperCase()
        },
        client: {
            docType: receiptClientDocType?.value || '0',
            docNumber: (receiptClientDocNumber?.value || '').trim(),
            name: (receiptClientName?.value || 'CLIENTE VARIOS').trim() || 'CLIENTE VARIOS'
        },
        saleIds: totals.selectedSales.map((sale) => sale.id),
        items: totals.selectedSales.map((sale) => ({
            saleId: sale.id,
            productId: sale.productId,
            description: sale.productName,
            quantity: Number(sale.quantity || 0),
            unitPrice: Number(sale.unitPrice || 0),
            subtotal: Number(sale.subtotal || sale.total || 0),
            igv: Number(sale.igvAmount || 0),
            total: Number(sale.total || 0)
        })),
        subtotal: totals.subtotal,
        igv: totals.igvAmount,
        total: totals.total,
        status,
        createdAt: new Date().toISOString(),
        sunatLike: {
            ublVersion: '2.1',
            operationType: '0101',
            documentType: docTypeCode,
            currency: 'PEN',
            emisor: {
                ruc: (receiptIssuerRuc?.value || '10411336234').trim(),
                razonSocial: (receiptIssuerName?.value || state.storeProfile?.name || 'NOVA GEST STORE').trim(),
                direccion: (receiptIssuerAddress?.value || state.storeProfile?.locations?.[0] || 'LIMA').trim()
            }
        }
    };
}

async function upsertReceipt(receipt) {
    const index = state.receipts.findIndex((item) => item.id === receipt.id);
    if (index >= 0) {
        state.receipts[index] = normalizeReceiptRecord(receipt) || receipt;
    } else {
        state.receipts.push(normalizeReceiptRecord(receipt) || receipt);
    }
    saveReceiptsToStorage();
    await saveReceiptToSupabase(receipt);
}

async function saveReceiptDraftDocument() {
    try {
        const receipt = buildElectronicReceiptPayload('borrador', 'electronic');
        await upsertReceipt(receipt);
        setMessage(receiptFeedback, `Borrador guardado: ${receipt.id}`);
        renderElectronicReceiptRecords();
    } catch (error) {
        setMessage(receiptFeedback, error.message || 'No se pudo guardar el borrador.', true);
    }
}

function emitElectronicReceipt() {
    emitReceiptByFormat('electronic');
}

function emitPaymentReceipt() {
    emitReceiptByFormat('payment');
}

function emitSaleTicketReceipt() {
    emitReceiptByFormat('sale-ticket');
}

async function emitReceiptByFormat(documentFormat) {
    try {
        const receipt = buildElectronicReceiptPayload('emitido', documentFormat);

        if (documentFormat === 'electronic') {
            if (!receipt.issuer?.ruc || String(receipt.issuer.ruc).replace(/\D/g, '').length < 11) {
                throw new Error('Para boleta electrónica debes ingresar un RUC válido de 11 dígitos.');
            }

            if (!receipt.issuer?.name || !receipt.issuer?.address) {
                throw new Error('Completa razón social y dirección fiscal del emisor.');
            }
        }

        await upsertReceipt(receipt);
        bumpReceiptSequence(receipt.serie);
        state.receiptDraftSaleIds = [];
        ensureReceiptDraftDefaults(true);
        renderElectronicReceiptSales();
        renderElectronicReceiptDraft();
        renderElectronicReceiptRecords();
        setMessage(receiptFeedback, `Documento emitido correctamente: ${receipt.id}`);
        downloadElectronicReceiptPdf(receipt);
    } catch (error) {
        setMessage(receiptFeedback, error.message || 'No se pudo emitir el documento.', true);
    }
}

function getReceiptById(receiptId) {
    return state.receipts.find((receipt) => receipt.id === receiptId) || null;
}

function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function getReceiptTaxSummary(receipt) {
    const items = Array.isArray(receipt?.items) ? receipt.items : [];

    const gravadas = items.reduce((sum, item) => {
        const quantity = Number(item?.quantity || 0);
        const unitPrice = Number(item?.unitPrice || 0);
        const lineIgv = Number(item?.igv || 0);
        // Regla solicitada: OP. GRAVADAS = cantidad * precio - IGV (por ítem)
        return sum + ((quantity * unitPrice) - lineIgv);
    }, 0);

    const igv = items.reduce((sum, item) => sum + Number(item?.igv || 0), 0);
    const total = Number(receipt?.total || 0);

    return {
        gravadas: Number(gravadas.toFixed(2)),
        igv: Number(igv.toFixed(2)),
        total: Number(total.toFixed(2))
    };
}

function buildReceiptSunatLikeJson(receipt) {
    const taxSummary = getReceiptTaxSummary(receipt);

    return {
        ublVersion: receipt.sunatLike?.ublVersion || '2.1',
        tipoOperacion: receipt.sunatLike?.operationType || '0101',
        tipoDoc: receipt.docTypeCode,
        serie: receipt.serie,
        correlativo: receipt.correlative,
        fechaEmision: receipt.issueDate,
        tipoMoneda: receipt.sunatLike?.currency || 'PEN',
        emisor: receipt.sunatLike?.emisor || {
            ruc: '00000000000',
            razonSocial: state.storeProfile?.name || 'NOVA GEST STORE',
            direccion: state.storeProfile?.locations?.[0] || 'LIMA'
        },
        cliente: {
            tipoDoc: receipt.client?.docType || '0',
            numDoc: receipt.client?.docNumber || '',
            rznSocial: receipt.client?.name || 'CLIENTE VARIOS'
        },
        mtoOperGravadas: taxSummary.gravadas,
        mtoIGV: taxSummary.igv,
        valorVenta: taxSummary.gravadas,
        totalImpuestos: taxSummary.igv,
        subTotal: taxSummary.total,
        mtoImpVenta: taxSummary.total,
        details: (receipt.items || []).map((item) => ({
            codProducto: item.productId || item.saleId || '',
            descripcion: item.description || '',
            cantidad: Number(item.quantity || 0),
            mtoValorUnitario: Number(item.unitPrice || 0),
            mtoValorVenta: Number(item.subtotal || 0),
            igv: Number(item.igv || 0),
            mtoPrecioUnitario: Number(item.unitPrice || 0),
            mtoValorReferencialUnitario: Number(item.unitPrice || 0)
        }))
    };
}

function exportElectronicReceiptJson(receipt) {
    if (!receipt) {
        return;
    }

    const payload = buildReceiptSunatLikeJson(receipt);
    downloadTextFile(`sunat-like-${receipt.id}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}

function downloadElectronicReceiptPdf(receipt) {
    if (!receipt) {
        return;
    }

    if (!window.jspdf?.jsPDF) {
        alert('No se pudo cargar la librería de PDF.');
        return;
    }

    const isTicketFormat = receipt.documentFormat === 'sale-ticket';
    const doc = isTicketFormat
        ? createTicketReceiptDocument(receipt)
        : new window.jspdf.jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const items = Array.isArray(receipt.items) ? receipt.items : [];

    if (isTicketFormat) {
        renderSaleTicketReceiptPdf(doc, receipt, items);
        doc.save(`boleta-ticket-${receipt.id || getReportFileSuffix()}.pdf`);
        return;
    }

    if (receipt.documentFormat === 'payment') {
        renderPaymentReceiptPdf(doc, receipt, items);
        doc.save(`boleta-pago-${receipt.id || getReportFileSuffix()}.pdf`);
        return;
    }

    renderSunatLikeElectronicReceiptPdf(doc, receipt, items);
    doc.save(`boleta-electronica-${receipt.id || getReportFileSuffix()}.pdf`);
}

function createTicketReceiptDocument(receipt) {
    const items = Array.isArray(receipt.items) ? receipt.items : [];
    const baseHeight = 340;
    const itemHeight = 46;
    const footerHeight = 150;
    const calculatedHeight = Math.max(700, baseHeight + (items.length * itemHeight) + footerHeight);
    return new window.jspdf.jsPDF({ orientation: 'p', unit: 'pt', format: [226, calculatedHeight] });
}

function renderSunatLikeElectronicReceiptPdf(doc, receipt, items) {
    const issueDate = new Date(receipt.issueDate || Date.now());
    const taxSummary = getReceiptTaxSummary(receipt);
    const gravadas = taxSummary.gravadas;
    const igv = taxSummary.igv;
    const total = taxSummary.total;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(receipt.issuer?.name || 'EMISOR', 215, 72, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('-', 215, 90, { align: 'center' });
    doc.text(receipt.issuer?.address || 'LIMA', 215, 112, { align: 'center' });

    doc.rect(410, 32, 150, 82);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`R.U.C.: ${receipt.issuer?.ruc || '-'}`, 485, 48, { align: 'center' });
    doc.setFillColor(16, 16, 16);
    doc.rect(410, 56, 150, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('BOLETA DE VENTA ELECTRONICA', 485, 70, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(receipt.id || '-', 485, 94, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.rect(40, 150, 270, 18);
    doc.text('Sobre el documento', 48, 163);
    doc.rect(40, 168, 270, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Fecha de emisión:', 48, 184);
    doc.text(issueDate.toISOString().slice(0, 10), 165, 184);
    doc.text('Forma de pago:', 48, 201);
    doc.text(receipt.paymentMethod || 'Contado', 165, 201);

    doc.autoTable({
        startY: 220,
        head: [['Item', 'Producto', 'Cantidad', 'Valor Unitario (*)', 'Descuento (*)', 'IGV', 'Importe de Venta (**)']],
        body: items.map((item, index) => [
            String(index + 1),
            item.description || 'Producto',
            String(Number(item.quantity || 0)),
            formatCurrency(item.unitPrice || 0),
            formatCurrency(0),
            formatCurrency(item.igv || 0),
            formatCurrency(item.total || 0)
        ]),
        styles: { fontSize: 9, cellPadding: 4, lineColor: [30, 30, 30], lineWidth: 0.6 },
        headStyles: { fillColor: [245, 245, 245], textColor: 0, lineColor: [30, 30, 30], lineWidth: 0.7 },
        columnStyles: {
            0: { halign: 'center', cellWidth: 32 },
            1: { cellWidth: 212 },
            2: { halign: 'center', cellWidth: 50 },
            3: { halign: 'right', cellWidth: 75 },
            4: { halign: 'right', cellWidth: 70 },
            5: { halign: 'right', cellWidth: 60 },
            6: { halign: 'right', cellWidth: 61 }
        }
    });

    let finalY = doc.lastAutoTable?.finalY || 360;
    doc.setFontSize(8);
    doc.text('(*) Sin IGV, (**) Con IGV', 42, finalY + 12);

    const totalsX = 372;
    let totalsY = finalY + 22;
    const totalsRows = [
        ['Gravadas', formatCurrency(gravadas)],
        ['Exoneradas', formatCurrency(0)],
        ['Inafectas', formatCurrency(0)],
        ['Gratuitas', formatCurrency(0)],
        ['ICBPER', formatCurrency(0)],
        ['Recargo por consumo (0%)', formatCurrency(0)],
        ['IGV', formatCurrency(igv)],
        ['Importe Total', formatCurrency(total)]
    ];

    const requiredHeight = 240;
    if ((totalsY + requiredHeight) > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        finalY = 38;
        totalsY = 54;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`SON: ${toSpanishAmountText(total)} SOLES`, 42, totalsY + 12);

    doc.autoTable({
        startY: totalsY,
        margin: { left: totalsX },
        tableWidth: 188,
        body: totalsRows,
        styles: { fontSize: 10, cellPadding: 6, lineColor: [30, 30, 30], lineWidth: 0.6 },
        columnStyles: {
            0: { cellWidth: 95 },
            1: { cellWidth: 93, halign: 'right' }
        }
    });

    const footerY = Math.max((doc.lastAutoTable?.finalY || (totalsY + 140)) + 20, totalsY + 120);
    doc.setFontSize(10);
    doc.text('REPRESENTACION IMPRESA DE LA BOLETA DE VENTA ELECTRONICA', 42, footerY);
}

function renderPaymentReceiptPdf(doc, receipt, items) {
    const issueDate = new Date(receipt.issueDate || Date.now());
    const total = Number(receipt.total || 0);

    doc.setFillColor(22, 163, 74);
    doc.roundedRect(40, 34, 515, 74, 10, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('BOLETA DE PAGO', 56, 70);
    doc.setFontSize(12);
    doc.text(`${receipt.id || '-'}`, 56, 90);

    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Emisor: ${receipt.issuer?.name || '-'}`, 56, 132);
    doc.text(`RUC: ${receipt.issuer?.ruc || '-'}`, 56, 150);
    doc.text(`Fecha: ${issueDate.toLocaleString('es-PE')}`, 56, 168);
    doc.text(`Cliente: ${receipt.client?.name || 'CLIENTE VARIOS'}`, 56, 186);
    doc.text(`Forma de pago: ${receipt.paymentMethod || 'Contado'}`, 56, 204);

    doc.autoTable({
        startY: 226,
        head: [['Item', 'Concepto', 'Cantidad', 'Precio Unitario', 'Importe']],
        body: items.map((item, index) => [
            String(index + 1),
            item.description || 'Producto',
            String(Number(item.quantity || 0)),
            formatCurrency(item.unitPrice || 0),
            formatCurrency(item.total || 0)
        ]),
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [22, 163, 74] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 40 },
            1: { cellWidth: 255 },
            2: { halign: 'center', cellWidth: 70 },
            3: { halign: 'right', cellWidth: 110 },
            4: { halign: 'right', cellWidth: 80 }
        }
    });

    const finalY = doc.lastAutoTable?.finalY || 420;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Total pagado: ${formatCurrency(total)}`, 420, finalY + 28, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Comprobante de pago interno.', 56, finalY + 56);
}

function renderSaleTicketReceiptPdf(doc, receipt, items) {
    const issueDate = new Date(receipt.issueDate || Date.now());
    const taxSummary = getReceiptTaxSummary(receipt);
    const gravadas = taxSummary.gravadas;
    const igv = taxSummary.igv;
    const total = taxSummary.total;
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const usableWidth = pageWidth - 24;
    let y = 22;

    const drawCentered = (text, size = 9, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.text(String(text || ''), centerX, y, { align: 'center' });
        y += size + 4;
    };

    const drawDivider = () => {
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.text('----------------------------------------', 12, y);
        y += 10;
    };

    const drawLine = (left, right, bold = false) => {
        doc.setFont('courier', bold ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        const leftText = String(left || '');
        const rightText = String(right || '');
        doc.text(leftText.length > 0 ? leftText : ' ', 12, y);
        if (rightText) {
            doc.text(rightText, pageWidth - 12, y, { align: 'right' });
        }
        y += 10;
    };

    drawCentered(receipt.issuer?.name || 'PUNTO DE VENTA', 10, true);
    drawCentered('Sucursal Punto de Venta', 9, false);
    drawCentered(receipt.issuer?.ruc || '-', 10, false);
    y += 2;
    drawLine(`RUC: ${receipt.issuer?.ruc || '-'}`, '');
    drawLine('BOLETA DE VENTA ELECTRONICA:', receipt.id || '-');
    drawLine(`Fecha: ${issueDate.toISOString().slice(0, 10)} Hora: ${issueDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`, '');
    drawLine(`Cajero: ${receipt.seller || '-'}`, '');
    drawDivider();
    drawLine('----------------PRODUCTOS----------------', '');
    y += 2;

    items.forEach((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const lineTotal = Number(item.total || 0);
        const name = (item.description || 'Producto Libre').slice(0, 22);
        drawLine(name, `${quantity} Un x ${unitPrice.toFixed(2)}`);
        drawLine('', `S/${lineTotal.toFixed(2)}`);
        y += 4;
    });

    drawDivider();
    drawLine('OP. GRAVADAS', `S/${gravadas.toFixed(2)}`, true);
    drawLine('I.G.V', `S/${igv.toFixed(2)}`, true);
    drawLine('IMPORTE TOTAL', `S/${total.toFixed(2)}`, true);
    drawLine(`SON: ${toSpanishAmountText(total)} SOLES`, '');
    drawLine(receipt.paymentMethod || 'Efectivo', `S/${total.toFixed(2)}`);
    y += 6;

    drawPseudoQr(doc, (pageWidth - 74) / 2, y, 74, receipt.id || `TK-${Date.now()}`);
    y += 86;
    drawCentered('Gracias por su compra', 9, false);
}

function drawPseudoQr(doc, x, y, size, seedText) {
    const modules = 21;
    const moduleSize = size / modules;

    const drawFinder = (fx, fy) => {
        doc.rect(x + (fx * moduleSize), y + (fy * moduleSize), moduleSize * 7, moduleSize * 7);
        doc.rect(x + ((fx + 1) * moduleSize), y + ((fy + 1) * moduleSize), moduleSize * 5, moduleSize * 5);
        doc.setFillColor(0, 0, 0);
        doc.rect(x + ((fx + 2) * moduleSize), y + ((fy + 2) * moduleSize), moduleSize * 3, moduleSize * 3, 'F');
    };

    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    let hash = 0;
    const text = String(seedText || 'QR');
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }

    for (let row = 0; row < modules; row += 1) {
        for (let col = 0; col < modules; col += 1) {
            const inFinderTopLeft = row < 7 && col < 7;
            const inFinderTopRight = row < 7 && col >= modules - 7;
            const inFinderBottomLeft = row >= modules - 7 && col < 7;
            if (inFinderTopLeft || inFinderTopRight || inFinderBottomLeft) {
                continue;
            }

            const bit = ((row * 31 + col * 17 + hash) % 7) < 3;
            if (bit) {
                doc.setFillColor(0, 0, 0);
                doc.rect(x + (col * moduleSize), y + (row * moduleSize), moduleSize, moduleSize, 'F');
            }
        }
    }
}

function toSpanishAmountText(amount) {
    const value = Number(amount || 0);
    const integerPart = Math.floor(Math.abs(value));
    const decimalPart = Math.round((Math.abs(value) - integerPart) * 100);

    const units = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const convertTens = (n) => {
        if (n < 10) {
            return units[n];
        }
        if (n < 20) {
            return teens[n - 10];
        }
        if (n < 30) {
            if (n === 20) {
                return 'VEINTE';
            }
            return `VEINTI${units[n - 20]}`;
        }
        const ten = Math.floor(n / 10);
        const unit = n % 10;
        return unit ? `${tens[ten]} Y ${units[unit]}` : tens[ten];
    };

    const convertHundreds = (n) => {
        if (n === 0) {
            return '';
        }
        if (n === 100) {
            return 'CIEN';
        }
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        return `${hundreds[hundred]} ${convertTens(remainder)}`.trim();
    };

    let words = '';
    if (integerPart >= 1000) {
        const thousands = Math.floor(integerPart / 1000);
        const remainder = integerPart % 1000;
        words = `${thousands === 1 ? 'MIL' : `${convertHundreds(thousands)} MIL`} ${convertHundreds(remainder)}`.trim();
    } else {
        words = convertHundreds(integerPart);
    }

    if (!words) {
        words = 'CERO';
    }

    return `${words} CON ${String(decimalPart).padStart(2, '0')}/100`;

    doc.setFillColor(22, 163, 74);
    doc.roundedRect(40, 40, 515, 82, 12, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(state.storeProfile?.name || 'NovaGest', 56, 76);
    doc.setFontSize(12);
    doc.text(`${receipt.docType || 'Boleta'} electrónica`, 56, 98);
    doc.text(`${receipt.id || '-'}`, 425, 98);

    doc.setTextColor(22, 28, 36);
    doc.setFontSize(11);
    doc.text(`Fecha emisión: ${new Date(receipt.issueDate || Date.now()).toLocaleString('es-PE')}`, 56, 148);
    doc.text(`Vendedor: ${receipt.seller || '-'}`, 56, 166);
    doc.text(`Cliente: ${receipt.client?.name || 'CLIENTE VARIOS'}`, 56, 184);
    doc.text(`Doc cliente: ${receipt.client?.docNumber || '-'}`, 56, 202);

    doc.autoTable({
        startY: 220,
        head: [['Descripción', 'Cant.', 'P. Unit.', 'Subtotal', 'IGV', 'Total']],
        body: items.map((item) => [
            item.description || '',
            String(Number(item.quantity || 0)),
            formatCurrency(item.unitPrice || 0),
            formatCurrency(item.subtotal || 0),
            formatCurrency(item.igv || 0),
            formatCurrency(item.total || 0)
        ]),
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [22, 163, 74] }
    });

    const finalY = doc.lastAutoTable?.finalY || 420;
    doc.setFontSize(12);
    doc.text(`Subtotal: ${formatCurrency(receipt.subtotal || 0)}`, 420, finalY + 24, { align: 'right' });
    doc.text(`IGV: ${formatCurrency(receipt.igv || 0)}`, 420, finalY + 44, { align: 'right' });
    doc.setFontSize(16);
    doc.setTextColor(22, 163, 74);
    doc.text(`Total: ${formatCurrency(receipt.total || 0)}`, 420, finalY + 70, { align: 'right' });

    doc.setTextColor(95, 112, 130);
    doc.setFontSize(10);
    doc.text('Documento Nivel A (representación impresa).', 56, finalY + 98);
    doc.save(`boleta-${receipt.id || getReportFileSuffix()}.pdf`);
}

function exportElectronicReceiptJsonById(receiptId) {
    const receipt = getReceiptById(receiptId);
    if (!receipt) {
        setMessage(receiptFeedback, 'No se encontró el documento seleccionado.', true);
        return;
    }

    exportElectronicReceiptJson(receipt);
}

function getReceiptLinkedSaleIds(receipt) {
    const explicitIds = Array.isArray(receipt?.saleIds) ? receipt.saleIds : [];
    const itemIds = Array.isArray(receipt?.items)
        ? receipt.items.map((item) => item.saleId).filter(Boolean)
        : [];

    return Array.from(new Set([...explicitIds, ...itemIds].filter(Boolean)));
}

async function deleteSalesLinkedToReceipt(receipt) {
    const saleIds = getReceiptLinkedSaleIds(receipt);
    if (!saleIds.length) {
        return;
    }

    const targetSales = saleIds.map((saleId) => state.sales.find((sale) => sale.id === saleId)).filter(Boolean);
    if (!targetSales.length) {
        return;
    }

    const stockSnapshots = new Map();
    const quantityByProduct = new Map();

    targetSales.forEach((sale) => {
        quantityByProduct.set(sale.productId, Number(quantityByProduct.get(sale.productId) || 0) + Number(sale.quantity || 0));

        if (!stockSnapshots.has(sale.productId)) {
            const product = state.products.find((item) => item.id === sale.productId);
            stockSnapshots.set(sale.productId, Number(product?.stock || 0));
        }
    });

    try {
        for (const [productId, quantity] of quantityByProduct.entries()) {
            const product = state.products.find((item) => item.id === productId);
            if (!product) {
                continue;
            }

            const nextStock = Number(product.stock || 0) + Number(quantity || 0);
            const stockError = await updateProductStock(productId, nextStock);
            if (stockError) {
                throw new Error(stockError.message || 'No se pudo restaurar el stock de las ventas asociadas.');
            }
        }

        const { error } = await supabaseClient
            .from('sales')
            .delete()
            .in('id', saleIds);

        if (error) {
            throw error;
        }
    } catch (error) {
        for (const [productId, previousStock] of stockSnapshots.entries()) {
            await updateProductStock(productId, previousStock);
        }

        throw error;
    }
}

function editElectronicReceipt(receiptId) {
    const receipt = getReceiptById(receiptId);
    if (!receipt) {
        setMessage(receiptFeedback, 'No se encontró la boleta para editar.', true);
        return;
    }

    if (receiptDocType) {
        receiptDocType.value = receipt.docType || 'Boleta';
    }
    if (receiptSerie) {
        receiptSerie.value = receipt.serie || getReceiptSeriesByDocType(receipt.docType || 'Boleta');
    }
    if (receiptCorrelative) {
        receiptCorrelative.value = padReceiptCorrelative(receipt.correlative || '1');
    }
    if (receiptSeller) {
        receiptSeller.value = receipt.seller || '';
    }
    if (receiptIssuerRuc) {
        receiptIssuerRuc.value = receipt.issuer?.ruc || '';
    }
    if (receiptIssuerName) {
        receiptIssuerName.value = receipt.issuer?.name || '';
    }
    if (receiptIssuerAddress) {
        receiptIssuerAddress.value = receipt.issuer?.address || '';
    }
    if (receiptClientDocType) {
        receiptClientDocType.value = receipt.client?.docType || '0';
    }
    if (receiptClientDocNumber) {
        receiptClientDocNumber.value = receipt.client?.docNumber || '';
    }
    if (receiptClientName) {
        receiptClientName.value = receipt.client?.name || '';
    }
    if (receiptPaymentMethod) {
        receiptPaymentMethod.value = receipt.paymentMethod || 'Contado';
    }

    state.receiptDraftSaleIds = getReceiptLinkedSaleIds(receipt);

    setActiveView('boletas');
    renderElectronicReceiptSales();
    renderElectronicReceiptDraft();
    setMessage(receiptFeedback, `Boleta cargada para edición: ${receipt.id}`);
}

async function deleteElectronicReceipt(receiptId) {
    const receipt = getReceiptById(receiptId);
    if (!receipt) {
        setMessage(receiptFeedback, 'No se encontró la boleta a eliminar.', true);
        return;
    }

    try {
        await deleteSalesLinkedToReceipt(receipt);
        state.receipts = state.receipts.filter((item) => item.id !== receiptId);
        saveReceiptsToStorage();
        await deleteReceiptFromSupabase(receiptId);
        await refreshData();
        renderElectronicReceiptRecords();
        setMessage(receiptFeedback, `Boleta eliminada y ventas asociadas revertidas: ${receiptId}`);
    } catch (error) {
        setMessage(receiptFeedback, error.message || 'No se pudo eliminar la boleta y sus ventas asociadas.', true);
    }
}

function downloadElectronicReceiptPdfById(receiptId, formatOverride = '') {
    const receipt = getReceiptById(receiptId);
    if (!receipt) {
        setMessage(receiptFeedback, 'No se encontró el documento seleccionado.', true);
        return;
    }

    downloadElectronicReceiptPdf({
        ...receipt,
        documentFormat: formatOverride || receipt.documentFormat
    });
}

function setStatsRange(range) {
    state.statsRange = range;
    renderSalesStatistics();
}

function applyCustomStatsRange() {
    state.statsRange = 'custom';
    state.statsCustomFrom = statsDateFrom?.value || '';
    state.statsCustomTo = statsDateTo?.value || '';

    if (!state.statsCustomFrom || !state.statsCustomTo) {
        alert('Completa fecha inicio y fin para el rango personalizado.');
        return;
    }

    renderSalesStatistics();
}