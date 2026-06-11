function renderInventoryTable() {
    const filtered = getFilteredProducts();
    inventoryCountLabel.textContent = `${filtered.length} registros`;
    updateMetrics();
    updateInsight();

    if (!state.products.length) {
        inventoryTableBody.innerHTML = '<tr><td colspan="9" class="empty-row">Todavía no has agregado productos.</td></tr>';
        return;
    }

    if (!filtered.length) {
        inventoryTableBody.innerHTML = '<tr><td colspan="9" class="empty-row">No hay coincidencias para tu búsqueda.</td></tr>';
        return;
    }

    inventoryTableBody.innerHTML = filtered.map((product) => {
        const expirationInfo = getProductExpirationInfo(product);
        const lowStock = Number(product.stock || 0) <= 5;
        const rowClass = [expirationInfo.rowClassName, lowStock ? 'inventory-row--low-stock' : ''].filter(Boolean).join(' ');

        return `
            <tr class="${rowClass}">
                <td>${escapeHtml(product.id)}</td>
                <td>
                    <strong class="table-primary">${escapeHtml(product.name)}</strong>
                </td>
                <td>${escapeHtml(product.stock)}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${escapeHtml(product.category)}</td>
                <td>
                    <span class="status-tag ${lowStock ? 'status-tag--warning' : 'status-tag--success'}">${lowStock ? 'BAJO' : 'DISPONIBLE'}</span>
                </td>
                <td>${escapeHtml(formatDateOnly(product.fecha_vencimiento))}</td>
                <td>
                    <span class="status-tag ${expirationInfo.className}">${escapeHtml(expirationInfo.label)}</span>
                    <small class="inventory-status-note ${expirationInfo.isExpired ? 'inventory-status-note--expired' : 'inventory-status-note--ok'}">${escapeHtml(expirationInfo.warningText)}</small>
                </td>
                <td>
                    <div class="row-actions">
                        <button class="action-button" type="button" data-edit-product="${escapeHtml(product.id)}">Editar</button>
                        <button class="action-button action-button--danger" type="button" data-delete-product="${escapeHtml(product.id)}">Baja</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderSalesTable() {
    const filtered = getFilteredSales();
    salesCountLabel.textContent = `${filtered.length} registros`;

    const clientHistoryRows = isClientRole()
        ? state.purchases.flatMap((purchase) => {
            const items = Array.isArray(purchase.items) ? purchase.items : [];
            return items.map((item, index) => ({
                id: `${purchase.id || 'PED'}-${index + 1}`,
                productName: item.productName || 'Producto',
                date: purchase.date,
                quantity: Number(item.quantity || 0),
                paymentMethod: purchase.paymentMethod || 'Efectivo',
                igvAmount: 0,
                total: Number(item.total || 0)
            }));
        })
        : [];

    historyCountLabel.textContent = isClientRole()
        ? `${clientHistoryRows.length} ventas`
        : `${state.sales.length} ventas`;
    updateMetrics();

    if (!state.sales.length) {
        salesTableBody.innerHTML = '<tr><td colspan="8" class="empty-row">Aún no se han registrado ventas.</td></tr>';
        historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-row">El historial aparecerá aquí.</td></tr>';
        return;
    }

    if (!filtered.length) {
        salesTableBody.innerHTML = '<tr><td colspan="8" class="empty-row">No hay coincidencias para tu búsqueda.</td></tr>';
    } else {
        salesTableBody.innerHTML = filtered.map((sale) => `
            <tr>
                <td>${escapeHtml(sale.id)}</td>
                <td>
                    <strong class="table-primary">${escapeHtml(sale.productName)}</strong>
                    <span class="table-secondary">${escapeHtml(sale.productId)}</span>
                </td>
                <td>${formatDateTime(sale.date)}</td>
                <td>${sale.quantity}</td>
                <td>${escapeHtml(sale.paymentMethod)}</td>
                <td>${formatCurrency(sale.igvAmount)}</td>
                <td>${formatCurrency(sale.total)}</td>
                <td>
                    <div class="row-actions">
                        <button class="action-button" type="button" data-edit-sale="${escapeHtml(sale.id)}">Editar</button>
                        <button class="action-button action-button--danger" type="button" data-delete-sale="${escapeHtml(sale.id)}">Baja</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    const historyRows = isClientRole() ? clientHistoryRows : state.sales.slice().reverse();

    if (!historyRows.length) {
        historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-row">Aún no tienes ventas registradas.</td></tr>';
        return;
    }

    historyTableBody.innerHTML = historyRows.map((sale) => `
        <tr>
            <td>${escapeHtml(sale.id)}</td>
            <td>${escapeHtml(sale.productName)}</td>
            <td>${formatDateTime(sale.date)}</td>
            <td>${sale.quantity}</td>
            <td>${escapeHtml(sale.paymentMethod)}</td>
            <td>${formatCurrency(sale.igvAmount)}</td>
            <td>${formatCurrency(sale.total)}</td>
        </tr>
    `).join('');
}

function renderCatalog() {
    if (!catalogGrid || !catalogCountLabel) {
        return;
    }

    if (catalogCategoryNav) {
        const categoryOptions = getCatalogCategoryOptions();
        const isActiveCategoryValid = categoryOptions.some((option) => option.key === activeCatalogCategory);

        if (!isActiveCategoryValid) {
            activeCatalogCategory = CATALOG_CATEGORY_ALL;
        }

        catalogCategoryNav.innerHTML = categoryOptions.map((option) => {
            const activeClass = option.key === activeCatalogCategory ? ' is-active' : '';
            return `<button class="catalog-category-button${activeClass}" type="button" data-catalog-category="${escapeHtml(option.key)}">${escapeHtml(option.label)}</button>`;
        }).join('');
    }

    const products = getFilteredCatalogProducts();
    catalogCountLabel.textContent = `${products.length} productos`;

    if (!products.length) {
        catalogGrid.innerHTML = '<div class="empty-state">No hay productos para mostrar.</div>';
        return;
    }

    catalogGrid.innerHTML = products.map((product) => {
        const imageSrc = getProductImage(product.id) || product.imageUrl || 'https://images.unsplash.com/photo-1517142089942-ba376ce32a0f?auto=format&fit=crop&w=800&q=80';
        const outOfStock = Number(product.stock || 0) <= 0;
        const expirationInfo = getProductExpirationInfo(product);
        const isExpired = expirationInfo.isExpired;

        return `
            <article class="product-card">
                <img src="${escapeHtml(imageSrc)}" alt="Imagen de ${escapeHtml(product.name)}">
                <h4>${escapeHtml(product.name)}</h4>
                <p class="product-meta">${escapeHtml(product.id)} • ${escapeHtml(product.category)}</p>
                <p class="product-meta">Stock disponible: ${Number(product.stock || 0)}</p>
                <p class="product-meta">Estado: <span class="status-tag ${isExpired ? 'status-tag--danger' : 'status-tag--success'}">${isExpired ? 'VENCIDO' : 'VIGENTE'}</span></p>
                <strong class="product-price">${formatCurrency(product.price)}</strong>
                <div class="row-actions">
                    <button class="action-button" type="button" data-add-cart="${escapeHtml(product.id)}" ${outOfStock || isExpired ? 'disabled' : ''}>Agregar al carrito</button>
                    ${isClientRole() ? `<button class="action-button" type="button" data-buy-now="${escapeHtml(product.id)}" ${outOfStock || isExpired ? 'disabled' : ''}>Comprar ahora</button>` : ''}
                </div>
            </article>
        `;
    }).join('');
}

function renderCart() {
    if (!cartList || !cartCountLabel || !cartTotalAmount) {
        return;
    }

    const detailedItems = state.cart.map((item) => {
        const product = state.products.find((p) => p.id === item.productId);
        return product ? { item, product } : null;
    }).filter(Boolean);

    const itemsCount = detailedItems.reduce((sum, entry) => sum + Number(entry.item.quantity || 0), 0);
    const subtotal = detailedItems.reduce((sum, entry) => sum + Number(entry.item.quantity || 0) * Number(entry.product.price || 0), 0);
    const shippingCost = getDeliveryShippingCost(detailedItems);
    const total = subtotal + shippingCost;

    cartCountLabel.textContent = `${itemsCount} items`;
    cartTotalAmount.textContent = formatCurrency(total);
    if (cartSubtotalAmount) {
        cartSubtotalAmount.textContent = formatCurrency(subtotal);
    }
    if (cartShippingAmount) {
        cartShippingAmount.textContent = formatCurrency(shippingCost);
    }
    if (cartFinalAmount) {
        cartFinalAmount.textContent = formatCurrency(total);
    }

    if (cartDeliveryHint) {
        cartDeliveryHint.textContent = isDeliveryCheckout()
            ? `Activo ${formatCurrency(shippingCost)}`
            : 'Desactivado';
    }

    if (!detailedItems.length) {
        cartList.innerHTML = '<div class="empty-state">Tu carrito está vacío.</div>';
        return;
    }

    cartList.innerHTML = detailedItems.map(({ item, product }) => {
        const maxStock = Number(product.stock || 0);
        const canDecrease = Number(item.quantity || 0) > 1;
        const canIncrease = Number(item.quantity || 0) < maxStock;
        
        return `
            <article class="cart-item">
                <div>
                    <strong>${escapeHtml(product.name)}</strong>
                    <p>${item.quantity} x ${formatCurrency(product.price)} = ${formatCurrency(Number(item.quantity || 0) * Number(product.price || 0))}</p>
                    <p style="font-size: 0.8rem; color: #fde68a; margin-top: 4px;">Stock disponible: ${maxStock}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
                    <div style="display: flex; gap: 4px;">
                        <button class="action-button" type="button" data-cart-decrease="${escapeHtml(product.id)}" ${!canDecrease ? 'disabled' : ''} style="padding: 6px 8px; font-size: 0.85rem;">−</button>
                        <button class="action-button" type="button" data-cart-increase="${escapeHtml(product.id)}" ${!canIncrease ? 'disabled' : ''} style="padding: 6px 8px; font-size: 0.85rem;">+</button>
                    </div>
                    <button class="action-button action-button--danger" type="button" data-remove-cart="${escapeHtml(product.id)}" style="padding: 6px 8px; font-size: 0.85rem;">Quitar</button>
                </div>
            </article>
        `;
    }).join('');
}

function renderPurchaseHistory() {
    if (!purchaseList || !purchaseCountLabel || !purchaseTotalAmount) {
        return;
    }

    const purchases = state.purchases.slice();
    purchaseCountLabel.textContent = `${purchases.length} compras`;

    const totalPurchased = purchases.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
    purchaseTotalAmount.textContent = formatCurrency(totalPurchased);

    if (!purchases.length) {
        purchaseList.innerHTML = '<div class="empty-state">Aún no tienes compras registradas.</div>';
        return;
    }

    purchaseList.innerHTML = purchases.map((purchase) => `
        <article class="cart-item">
            <div>
                <strong>Pedido ${escapeHtml(purchase.id || '')}</strong>
                <p>${escapeHtml((purchase.items || []).map((item) => `${item.productName} x${Number(item.quantity || 0)}`).join(' | '))}</p>
                <p>${escapeHtml(purchase.orderType === 'delivery' ? `Delivery · Envío ${formatCurrency(Number(purchase.shippingCost || 0))}` : 'Compra en tienda')}</p>
                <p>${escapeHtml(formatDateTime(purchase.date))}</p>
            </div>
            <div>
                <strong>${formatCurrency(purchase.total || 0)}</strong>
                <div class="row-actions" style="margin-top:8px;justify-content:flex-end;">
                    <button class="action-button" type="button" data-view-voucher="${escapeHtml(purchase.id || '')}">Voucher</button>
                    <button class="action-button" type="button" data-whatsapp-purchase="${escapeHtml(purchase.id || '')}">WhatsApp</button>
                    <button class="action-button" type="button" data-download-voucher="${escapeHtml(purchase.id || '')}">PDF</button>
                </div>
            </div>
        </article>
    `).join('');
}

function renderVoucherModal(purchase) {
    if (!voucherModal || !voucherBody) {
        return;
    }

    const source = purchase || state.purchases?.[0] || null;

    if (!source) {
        voucherBody.innerHTML = '<div class="empty-state">No se encontró información para mostrar el voucher.</div>';
        voucherModal.hidden = false;
        document.body.style.overflow = 'hidden';
        return;
    }

    const items = Array.isArray(source.items) && source.items.length
        ? source.items
        : [{
            productName: source.productName || 'Producto',
            quantity: Number(source.quantity || 0),
            total: Number(source.total || 0)
        }];

    let formattedDate = '';
    try {
        formattedDate = formatDateTime(source.date || new Date().toISOString());
    } catch (_error) {
        formattedDate = String(source.date || '-');
    }

    const subtotal = Number(source.subtotal || items.reduce((sum, item) => sum + Number(item.total || 0), 0));
    const shippingCost = Number(source.shippingCost || 0);
    const total = Number(source.total || (subtotal + shippingCost));
    const itemsMarkup = items.map((item) => `<li>${escapeHtml(item.productName || 'Producto')} x${Number(item.quantity || 0)} - ${formatCurrency(item.total || 0)}</li>`).join('');
    const orderType = source.orderType === 'delivery' ? 'Pedido delivery' : 'Compra en tienda';
    const locationLabel = source.orderType === 'delivery'
        ? (source.locationMapLink ? `<a href="${escapeHtml(source.locationMapLink)}" target="_blank" rel="noopener">Ver en Google Maps</a>` : 'No registrada')
        : 'No requerida (compra en tienda)';

    voucherBody.innerHTML = `
        <article class="voucher-card">
            <div class="voucher-meta">
                <div><strong>ID Pedido:</strong> ${escapeHtml(source.id || '-')}</div>
                <div><strong>Boleta electrónica:</strong> ${escapeHtml(source.receiptId || 'Pendiente')}</div>
                <div><strong>Fecha:</strong> ${escapeHtml(formattedDate)}</div>
                <div><strong>Modalidad:</strong> ${escapeHtml(orderType)}</div>
                <div><strong>Entrega:</strong> ${escapeHtml(source.deliveryAddress || 'Recojo en tienda')}</div>
                <div><strong>Método:</strong> ${escapeHtml(source.paymentMethod || 'Efectivo')}</div>
                <div style="grid-column: 1 / -1;"><strong>Ubicación:</strong> ${locationLabel}</div>
            </div>
            <hr class="panel-divider">
            <div>
                <strong>Productos:</strong>
                <ul class="voucher-items">${itemsMarkup || '<li>Sin productos registrados.</li>'}</ul>
            </div>
            <div><strong>Subtotal:</strong> ${formatCurrency(subtotal)}</div>
            <div><strong>Envío:</strong> ${formatCurrency(shippingCost)}</div>
            <div class="voucher-total">Total pagado: ${formatCurrency(total)}</div>
            <p class="product-meta" style="text-align:center;">Gracias por tu compra.</p>
        </article>
    `;

    activeVoucherId = source.id || '';
    voucherModal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeVoucherModal() {
    if (!voucherModal) {
        return;
    }

    voucherModal.hidden = true;
    activeVoucherId = '';
    document.body.style.overflow = '';
}

function renderElectronicReceiptSales() {
    if (!receiptSalesTableBody || !receiptSalesCountLabel) {
        return;
    }

    const sales = getFilteredSalesForReceipt();
    const selectedSet = new Set(state.receiptDraftSaleIds || []);
    receiptSalesCountLabel.textContent = `${sales.length} ventas`;

    if (!sales.length) {
        receiptSalesTableBody.innerHTML = '<tr><td colspan="5" class="empty-row">No hay ventas disponibles para agregar.</td></tr>';
        return;
    }

    receiptSalesTableBody.innerHTML = sales.map((sale) => {
        const isSelected = selectedSet.has(sale.id);
        return `
            <tr>
                <td>${escapeHtml(sale.id)}</td>
                <td>${escapeHtml(sale.productName)}</td>
                <td>${formatDateTime(sale.date)}</td>
                <td>${formatCurrency(sale.total)}</td>
                <td>
                    <button class="action-button ${isSelected ? 'action-button--danger' : ''}" type="button" data-add-receipt-sale="${escapeHtml(sale.id)}">
                        ${isSelected ? 'Quitar' : 'Agregar'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderElectronicReceiptDraft() {
    if (!receiptDetailTableBody || !receiptDraftCountLabel) {
        return;
    }

    const totals = getReceiptDraftTotals();
    receiptDraftCountLabel.textContent = `${totals.itemCount} ítems`;

    if (receiptItemsCount) {
        receiptItemsCount.textContent = String(totals.itemCount);
    }
    if (receiptSubtotal) {
        receiptSubtotal.textContent = formatCurrency(totals.subtotal);
    }
    if (receiptIgv) {
        receiptIgv.textContent = formatCurrency(totals.igvAmount);
    }
    if (receiptTotal) {
        receiptTotal.textContent = formatCurrency(totals.total);
    }

    if (!totals.selectedSales.length) {
        receiptDetailTableBody.innerHTML = '<tr><td colspan="6" class="empty-row">Agrega ventas para construir el comprobante.</td></tr>';
        return;
    }

    receiptDetailTableBody.innerHTML = totals.selectedSales.map((sale) => `
        <tr>
            <td>${escapeHtml(sale.id)}</td>
            <td>${escapeHtml(sale.productName)}</td>
            <td>${Number(sale.quantity || 0)}</td>
            <td>${formatCurrency(sale.unitPrice || 0)}</td>
            <td>${formatCurrency(sale.total || 0)}</td>
            <td>
                <button class="action-button action-button--danger" type="button" data-remove-receipt-sale="${escapeHtml(sale.id)}">Quitar</button>
            </td>
        </tr>
    `).join('');
}

function renderElectronicReceiptRecords() {
    if (!receiptRecordsTableBody || !receiptRecordsCountLabel) {
        return;
    }

    const receipts = getFilteredReceiptRecords();
    receiptRecordsCountLabel.textContent = `${receipts.length} documentos`;

    if (!receipts.length) {
        receiptRecordsTableBody.innerHTML = '<tr><td colspan="7" class="empty-row">No hay boletas en el rango de fechas seleccionado.</td></tr>';
        return;
    }

    receiptRecordsTableBody.innerHTML = receipts.map((receipt) => `
        <tr>
            <td>
                <strong class="table-primary">${escapeHtml(receipt.id || '-')}</strong>
                <span class="table-secondary">${escapeHtml(receipt.docType || 'Boleta')}</span>
            </td>
            <td>${escapeHtml(receipt.typeLabel || (receipt.documentFormat === 'payment' ? 'Boleta de pago' : (receipt.documentFormat === 'sale-ticket' ? 'Boleta ticket' : 'Boleta electrónica')))}</td>
            <td>${formatDateTime(receipt.issueDate || receipt.createdAt || new Date().toISOString())}</td>
            <td>${escapeHtml(receipt.client?.name || 'CLIENTE VARIOS')}</td>
            <td>${formatCurrency(receipt.total || 0)}</td>
            <td>
                <span class="status-tag ${receipt.status === 'emitido' ? 'status-tag--success' : 'status-tag--warning'}">
                    ${receipt.status === 'emitido' ? 'Emitido' : 'Borrador'}
                </span>
            </td>
            <td>
                <div class="row-actions">
                    <button class="action-button" type="button" data-download-receipt-format="sale-ticket" data-receipt-id="${escapeHtml(receipt.id || '')}">PDF Ticket</button>
                    <button class="action-button" type="button" data-download-receipt-format="electronic" data-receipt-id="${escapeHtml(receipt.id || '')}">PDF Electrónica</button>
                    <button class="action-button" type="button" data-export-receipt-json="${escapeHtml(receipt.id || '')}">JSON</button>
                    <button class="action-button" type="button" data-edit-receipt="${escapeHtml(receipt.id || '')}">Editar</button>
                    <button class="action-button action-button--danger" type="button" data-delete-receipt="${escapeHtml(receipt.id || '')}">Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderSalesStatistics() {
    if (!statsHourlyTableBody || !statsTotalSales || !statsTotalRevenue || !statsAvgTicket || !statsBestHour) {
        return;
    }

    const filteredSales = getFilteredSalesByStatsRange();
    const parseDayKeyToDate = (value) => {
        if (!value) return null;
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const parts = value.split('-').map((p) => Number(p));
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    };

    const formatShortDate = (value) => {
        const date = parseDayKeyToDate(value);
        if (!date) return '-';
        return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' }).format(date);
    };

    const formatLongDate = (value) => {
        const date = parseDayKeyToDate(value);
        if (!date) return '-';
        return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(date);
    };

    const rowsByDay = {};
    const rowsByHour = {};
    const topProductsMap = {};
    for (let hour = 0; hour < 24; hour += 1) {
        rowsByHour[hour] = { hour, salesCount: 0, units: 0, revenue: 0 };
    }

    filteredSales.forEach((sale) => {
        const saleDate = new Date(sale.date);
        if (Number.isNaN(saleDate.getTime())) {
            return;
        }

        const dayKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;
        const hour = saleDate.getHours();
        const quantity = Number(sale.quantity || 0);
        const revenue = Number(sale.total || 0);
        const productKey = sale.productId || sale.productName || 'PRODUCTO';

        if (!rowsByDay[dayKey]) {
            rowsByDay[dayKey] = { dayKey, dateValue: saleDate.toISOString(), salesCount: 0, units: 0, revenue: 0 };
        }

        rowsByDay[dayKey].salesCount += 1;
        rowsByDay[dayKey].units += quantity;
        rowsByDay[dayKey].revenue += revenue;

        rowsByHour[hour].salesCount += 1;
        rowsByHour[hour].units += quantity;
        rowsByHour[hour].revenue += revenue;

        if (!topProductsMap[productKey]) {
            topProductsMap[productKey] = {
                productName: sale.productName || productKey,
                units: 0,
                revenue: 0
            };
        }

        topProductsMap[productKey].units += quantity;
        topProductsMap[productKey].revenue += revenue;
    });

    const dayRows = Object.values(rowsByDay).sort((a, b) => new Date(a.dayKey).getTime() - new Date(b.dayKey).getTime());
    const hourRows = Object.values(rowsByHour).sort((a, b) => a.hour - b.hour);
    const totalUnits = filteredSales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const avgTicket = filteredSales.length ? totalRevenue / filteredSales.length : 0;
    const bestHour = hourRows.reduce((acc, row) => (row.revenue > acc.revenue ? row : acc), { hour: null, revenue: -1 });
    const bestDay = dayRows.reduce((acc, row) => (row.revenue > acc.revenue ? row : acc), { dayKey: null, revenue: -1 });
    const topProduct = Object.values(topProductsMap).sort((a, b) => b.units - a.units || b.revenue - a.revenue)[0] || null;
    const lastSale = filteredSales.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;

    statsTotalSales.textContent = String(filteredSales.length);
    statsTotalRevenue.textContent = formatCurrency(totalRevenue);
    statsAvgTicket.textContent = formatCurrency(avgTicket);
    statsBestHour.textContent = bestHour.hour === null || bestHour.revenue <= 0
        ? '-'
        : `${formatHourLabel(bestHour.hour)} (${formatCurrency(bestHour.revenue)})`;

    if (statsBestDay) {
        statsBestDay.textContent = bestDay.dayKey && bestDay.revenue > 0
            ? `${formatShortDate(bestDay.dayKey)} (${formatCurrency(bestDay.revenue)})`
            : '-';
    }

    if (statsTopProduct) {
        statsTopProduct.textContent = topProduct
            ? `${topProduct.productName} (${topProduct.units})`
            : '-';
    }

    if (statsTotalUnits) {
        statsTotalUnits.textContent = String(totalUnits);
    }

    if (statsLastSale) {
        statsLastSale.textContent = lastSale ? formatDateTime(lastSale.date) : '-';
    }

    if (statsRangeButtons?.length) {
        statsRangeButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.statsRange === state.statsRange);
        });
    }

    if (statsDateFrom && !statsDateFrom.value && state.statsCustomFrom) {
        statsDateFrom.value = state.statsCustomFrom;
    }
    if (statsDateTo && !statsDateTo.value && state.statsCustomTo) {
        statsDateTo.value = state.statsCustomTo;
    }

    const rangeTextMap = {
        today: 'hoy',
        yesterday: 'ayer',
        last7: 'últimos 7 días',
        last30: 'últimos 30 días',
        custom: `${statsDateFrom?.value || '-'} a ${statsDateTo?.value || '-'}`
    };
    if (statsRangeLabel) {
        statsRangeLabel.textContent = `Rango activo: ${rangeTextMap[state.statsRange] || 'hoy'}`;
    }

    if (statsInsightsList) {
        if (!filteredSales.length) {
            statsInsightsList.innerHTML = '<li>No hay datos suficientes para generar insights en este rango.</li>';
        } else {
            const peakHourLine = bestHour.hour === null ? 'Sin hora pico registrada.' : `Hora pico: ${formatHourLabel(bestHour.hour)} con ${formatCurrency(bestHour.revenue)}.`;
            const bestDayLine = bestDay.dayKey ? `Mejor fecha: ${formatLongDate(bestDay.dayKey)}.` : 'No se detectó un mejor día.';
            const topProductLine = topProduct ? `Producto más movido: ${escapeHtml(topProduct.productName)} (${topProduct.units} unidades).` : 'Sin producto dominante en el rango.';
            const avgLine = `Ticket promedio del rango: ${formatCurrency(avgTicket)}.`;
            statsInsightsList.innerHTML = `
                <li>${peakHourLine}</li>
                <li>${bestDayLine}</li>
                <li>${topProductLine}</li>
                <li>${avgLine}</li>
            `;
        }
    }

    if (statsBarChart && window.Chart) {
        const labels = dayRows.map((row) => formatShortDate(row.dayKey));
        const solesData = dayRows.map((row) => Number(row.revenue.toFixed(2)));
        const dollarsData = dayRows.map((row) => Number((row.revenue / 3.75).toFixed(2)));
        const context = statsBarChart.getContext('2d');

        if (statsBarChartInstance) {
            statsBarChartInstance.destroy();
            statsBarChartInstance = null;
        }

        if (context && labels.length) {
            const gradientSoles = context.createLinearGradient(0, 0, 0, 280);
            gradientSoles.addColorStop(0, 'rgba(14, 165, 233, 0.95)');
            gradientSoles.addColorStop(1, 'rgba(14, 165, 233, 0.25)');

            const gradientUsd = context.createLinearGradient(0, 0, 0, 280);
            gradientUsd.addColorStop(0, 'rgba(16, 185, 129, 0.92)');
            gradientUsd.addColorStop(1, 'rgba(16, 185, 129, 0.24)');

            statsBarChartInstance = new window.Chart(context, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Ventas en soles',
                            data: solesData,
                            borderRadius: 8,
                            borderSkipped: false,
                            backgroundColor: gradientSoles,
                            borderColor: 'rgba(125, 211, 252, 0.9)',
                            borderWidth: 1
                        },
                        {
                            label: 'Ventas en dólares (ref.)',
                            data: dollarsData,
                            borderRadius: 8,
                            borderSkipped: false,
                            backgroundColor: gradientUsd,
                            borderColor: 'rgba(110, 231, 183, 0.85)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 900,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: '#d8e1eb',
                                boxWidth: 14,
                                boxHeight: 14,
                                padding: 16,
                                font: {
                                    family: 'Nunito',
                                    size: 12,
                                    weight: '700'
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label(contextItem) {
                                    const label = contextItem.dataset?.label || '';
                                    const value = Number(contextItem.parsed.y || 0);
                                    const formatted = contextItem.datasetIndex === 0 ? formatCurrency(value) : `$ ${value.toFixed(2)}`;
                                    return `${label}: ${formatted}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#c7d2de',
                                font: {
                                    family: 'Nunito',
                                    size: 11,
                                    weight: '700'
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.08)'
                            },
                            ticks: {
                                color: '#a9b8ca',
                                font: {
                                    family: 'Nunito',
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
        }
    } else if (statsBarChartInstance) {
        statsBarChartInstance.destroy();
        statsBarChartInstance = null;
    }

    if (!filteredSales.length) {
        statsHourlyTableBody.innerHTML = '<tr><td colspan="4" class="empty-row">No hay ventas en el periodo.</td></tr>';
        return;
    }

    statsHourlyTableBody.innerHTML = dayRows
        .map((row) => `
            <tr>
                <td>${formatLongDate(row.dayKey)}</td>
                <td>${row.salesCount}</td>
                <td>${row.units}</td>
                <td>${formatCurrency(row.revenue)}</td>
            </tr>
        `).join('');
}