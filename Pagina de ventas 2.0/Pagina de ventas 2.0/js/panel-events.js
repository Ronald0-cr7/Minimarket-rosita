if (inventoryForm) {
    inventoryForm.addEventListener('submit', (event) => {
        event.preventDefault();
        addOrUpdateInventory();
    });
}

if (salesForm) {
    salesForm.addEventListener('submit', (event) => {
        event.preventDefault();
        addOrUpdateSale();
    });
}

if (inventoryCancelButton) {
    inventoryCancelButton.addEventListener('click', resetInventoryForm);
}

if (salesCancelButton) {
    salesCancelButton.addEventListener('click', resetSalesForm);
}

if (inventoryImage) {
    inventoryImage.addEventListener('change', async () => {
        const file = inventoryImage.files?.[0];
        if (!file) {
            if (inventoryEditingId) {
                setInventoryImagePreview(getProductImage(inventoryEditingId));
            }
            return;
        }

        if (!file.type.startsWith('image/')) {
            setMessage(inventoryFeedback, 'Solo puedes subir archivos de imagen.', true);
            inventoryImage.value = '';
            return;
        }

        try {
            const previewSrc = await readImageFileAsDataUrl(file);
            inventoryRemoveImage = false;
            if (inventoryImageUrl) {
                inventoryImageUrl.value = '';
            }
            setInventoryImagePreview(previewSrc);
            clearMessage(inventoryFeedback);
        } catch (error) {
            setMessage(inventoryFeedback, error.message || 'No se pudo cargar la imagen.', true);
        }
    });
}

if (inventoryImageUrl) {
    inventoryImageUrl.addEventListener('input', () => {
        const value = inventoryImageUrl.value.trim();

        if (!value) {
            if (inventoryEditingId && !inventoryImage?.files?.length) {
                setInventoryImagePreview(getProductImage(inventoryEditingId));
            }
            return;
        }

        if (!isHttpImageUrl(value)) {
            setMessage(inventoryFeedback, 'URL inválida. Usa un enlace http:// o https://', true);
            return;
        }

        inventoryRemoveImage = false;
        if (inventoryImage) {
            inventoryImage.value = '';
        }
        setInventoryImagePreview(value);
        clearMessage(inventoryFeedback);
    });
}

if (inventoryClearImageButton) {
    inventoryClearImageButton.addEventListener('click', () => {
        inventoryRemoveImage = true;
        if (inventoryImage) {
            inventoryImage.value = '';
        }
        if (inventoryImageUrl) {
            inventoryImageUrl.value = '';
        }
        setInventoryImagePreview('');
        setMessage(inventoryFeedback, 'La imagen se quitará al guardar.', false);
    });
}

if (inventorySearch) {
    inventorySearch.addEventListener('input', renderInventoryTable);
}

if (salesSearch) {
    salesSearch.addEventListener('input', renderSalesTable);
}

if (receiptSalesSearch) {
    receiptSalesSearch.addEventListener('input', renderElectronicReceiptSales);
}

if (receiptRecordsDateFrom) {
    receiptRecordsDateFrom.addEventListener('change', renderElectronicReceiptRecords);
}

if (receiptRecordsDateTo) {
    receiptRecordsDateTo.addEventListener('change', renderElectronicReceiptRecords);
}

if (receiptDocType) {
    receiptDocType.addEventListener('change', () => {
        ensureReceiptDraftDefaults(true);
        renderElectronicReceiptDraft();
    });
}

if (receiptSerie) {
    receiptSerie.addEventListener('blur', () => {
        receiptSerie.value = (receiptSerie.value || '').trim().toUpperCase() || getReceiptSeriesByDocType(receiptDocType?.value || 'Boleta');
        receiptCorrelative.value = padReceiptCorrelative(receiptCorrelative.value || getReceiptNextCorrelative(receiptSerie.value));
    });
}

if (receiptCorrelative) {
    receiptCorrelative.addEventListener('blur', () => {
        receiptCorrelative.value = padReceiptCorrelative(receiptCorrelative.value);
    });
}

if (receiptSaveDraftButton) {
    receiptSaveDraftButton.addEventListener('click', saveReceiptDraftDocument);
}

if (receiptEmitButton) {
    receiptEmitButton.addEventListener('click', emitElectronicReceipt);
}

if (receiptEmitPaymentButton) {
    receiptEmitPaymentButton.addEventListener('click', emitPaymentReceipt);
}

if (receiptEmitTicketButton) {
    receiptEmitTicketButton.addEventListener('click', emitSaleTicketReceipt);
}

if (receiptClearDraftButton) {
    receiptClearDraftButton.addEventListener('click', clearReceiptDraft);
}

if (statsApplyRangeButton) {
    statsApplyRangeButton.addEventListener('click', applyCustomStatsRange);
}

if (catalogSearch) {
    catalogSearch.addEventListener('input', renderCatalog);
}

if (salesApplyRangeButton) {
    salesApplyRangeButton.addEventListener('click', renderSalesTable);
}

if (salesDateFrom) {
    salesDateFrom.addEventListener('change', renderSalesTable);
}

if (salesDateTo) {
    salesDateTo.addEventListener('change', renderSalesTable);
}

if (checkoutOrderType) {
    checkoutOrderType.addEventListener('change', () => {
        updateCheckoutModeUI();
        renderCart();
    });
}

if (checkoutUseMyLocationButton) {
    checkoutUseMyLocationButton.addEventListener('click', () => {
        if (!isDeliveryCheckout()) {
            return;
        }
        setCheckoutCurrentLocation();
    });
}

if (checkoutLocationLink) {
    checkoutLocationLink.addEventListener('change', () => {
        syncCheckoutMapFromLink();
        updateCheckoutGoogleMapsButton();
    });
}

if (saleProductId) {
    saleProductId.addEventListener('change', updateSalePreview);
}

if (saleQuantity) {
    saleQuantity.addEventListener('input', updateSalePreview);
}

if (saleIgv) {
    saleIgv.addEventListener('input', updateSalePreview);
}

document.addEventListener('click', (event) => {
    const catalogCategoryButton = event.target.closest('[data-catalog-category]');
    const statsRangeButton = event.target.closest('[data-stats-range]');
    const cartDecreaseButton = event.target.closest('[data-cart-decrease]');
    const cartIncreaseButton = event.target.closest('[data-cart-increase]');
    const addReceiptSaleButton = event.target.closest('[data-add-receipt-sale]');
    const removeReceiptSaleButton = event.target.closest('[data-remove-receipt-sale]');
    const downloadReceiptPdfButton = event.target.closest('[data-download-receipt-pdf]');
    const downloadReceiptFormatButton = event.target.closest('[data-download-receipt-format]');
    const exportReceiptJsonButton = event.target.closest('[data-export-receipt-json]');
    const editReceiptButton = event.target.closest('[data-edit-receipt]');
    const deleteReceiptButton = event.target.closest('[data-delete-receipt]');
    const editProductButton = event.target.closest('[data-edit-product]');
    const deleteProductButton = event.target.closest('[data-delete-product]');
    const editSaleButton = event.target.closest('[data-edit-sale]');
    const deleteSaleButton = event.target.closest('[data-delete-sale]');
    const addCartButton = event.target.closest('[data-add-cart]');
    const buyNowButton = event.target.closest('[data-buy-now]');
    const whatsappProductButton = event.target.closest('[data-whatsapp-product]');
    const removeCartButton = event.target.closest('[data-remove-cart]');
    const viewVoucherButton = event.target.closest('[data-view-voucher]');
    const downloadVoucherButton = event.target.closest('[data-download-voucher]');
    const whatsappPurchaseButton = event.target.closest('[data-whatsapp-purchase]');
    const closeVoucherBackdrop = event.target.closest('[data-close-voucher]');

    if (catalogCategoryButton) {
        setActiveCatalogCategory(catalogCategoryButton.dataset.catalogCategory || CATALOG_CATEGORY_ALL);
        return;
    }

    if (statsRangeButton) {
        setStatsRange(statsRangeButton.dataset.statsRange || 'today');
        return;
    }

    if (addReceiptSaleButton) {
        addSaleToReceiptDraft(addReceiptSaleButton.dataset.addReceiptSale);
        return;
    }

    if (removeReceiptSaleButton) {
        removeSaleFromReceiptDraft(removeReceiptSaleButton.dataset.removeReceiptSale);
        return;
    }

    if (downloadReceiptPdfButton) {
        downloadElectronicReceiptPdfById(downloadReceiptPdfButton.dataset.downloadReceiptPdf);
        return;
    }

    if (downloadReceiptFormatButton) {
        downloadElectronicReceiptPdfById(
            downloadReceiptFormatButton.dataset.receiptId,
            downloadReceiptFormatButton.dataset.downloadReceiptFormat
        );
        return;
    }

    if (exportReceiptJsonButton) {
        exportElectronicReceiptJsonById(exportReceiptJsonButton.dataset.exportReceiptJson);
        return;
    }

    if (editReceiptButton) {
        editElectronicReceipt(editReceiptButton.dataset.editReceipt);
        return;
    }

    if (deleteReceiptButton) {
        const receiptId = deleteReceiptButton.dataset.deleteReceipt;
        showConfirmationModal(
            'Eliminar boleta',
            `¿Estás seguro de eliminar la boleta "${receiptId}"? Esta acción no se puede deshacer.`,
            () => {
                deleteElectronicReceipt(receiptId);
                closeConfirmationModal();
            }
        );
        return;
    }

    if (cartDecreaseButton) {
        const productId = cartDecreaseButton.dataset.cartDecrease;
        const cartItem = state.cart.find((item) => item.productId === productId);
        if (cartItem) {
            updateCartItemQuantity(productId, Math.max(0, Number(cartItem.quantity || 1) - 1));
        }
        return;
    }

    if (cartIncreaseButton) {
        const productId = cartIncreaseButton.dataset.cartIncrease;
        const cartItem = state.cart.find((item) => item.productId === productId);
        const product = state.products.find((p) => p.id === productId);
        if (cartItem && product) {
            const maxStock = Number(product.stock || 0);
            updateCartItemQuantity(productId, Math.min(maxStock, Number(cartItem.quantity || 0) + 1));
        }
        return;
    }

    if (editProductButton) {
        const product = state.products.find((item) => item.id === editProductButton.dataset.editProduct);
        if (product) {
            fillInventoryForm(product);
        }
        return;
    }

    if (deleteProductButton) {
        const productId = deleteProductButton.dataset.deleteProduct;
        const product = state.products.find((item) => item.id === productId);
        if (product) {
            showConfirmationModal(
                'Eliminar producto',
                `¿Estás seguro de que deseas dar de baja "${product.name}"? Esta acción no se puede deshacer.`,
                () => {
                    deleteInventory(productId);
                    closeConfirmationModal();
                }
            );
        }
        return;
    }

    if (editSaleButton) {
        const sale = state.sales.find((item) => item.id === editSaleButton.dataset.editSale);
        if (sale) {
            fillSalesForm(sale);
        }
        return;
    }

    if (deleteSaleButton) {
        const saleId = deleteSaleButton.dataset.deleteSale;
        const sale = state.sales.find((item) => item.id === saleId);
        if (sale) {
            showConfirmationModal(
                'Eliminar venta',
                `¿Estás seguro de que deseas dar de baja la venta "${sale.id}"? El stock se restaurará automáticamente.`,
                () => {
                    deleteSale(saleId);
                    closeConfirmationModal();
                }
            );
        }
        return;
    }

    const editHistorySaleButton = event.target.closest('[data-edit-history-sale]');
    const deleteHistorySaleButton = event.target.closest('[data-delete-history-sale]');

    if (editHistorySaleButton) {
        const sale = state.sales.find((item) => item.id === editHistorySaleButton.dataset.editHistorySale);
        if (sale) {
            fillSalesForm(sale);
            setActiveView('ventas');
        }
        return;
    }

    if (deleteHistorySaleButton) {
        const saleId = deleteHistorySaleButton.dataset.deleteHistorySale;
        const sale = state.sales.find((item) => item.id === saleId);
        if (sale) {
            showConfirmationModal(
                'Eliminar venta',
                `¿Estás seguro de que deseas eliminar la venta "${sale.id}"? El stock se restaurará automáticamente.`,
                () => {
                    deleteSale(saleId);
                    renderHistoryTable();
                    closeConfirmationModal();
                }
            );
        }
        return;
    }

    if (addCartButton) {
        addToCart(addCartButton.dataset.addCart);
        return;
    }

    if (buyNowButton) {
        if (!isClientRole()) {
            setMessage(catalogFeedback, 'Acción no permitida: solo clientes pueden realizar pedidos.', true);
            return;
        }
        buyNow(buyNowButton.dataset.buyNow);
        return;
    }

    if (whatsappProductButton) {
        const product = state.products.find((item) => item.id === whatsappProductButton.dataset.whatsappProduct);
        if (product) {
            openWhatsAppMessage(buildProductWhatsAppMessage(product), catalogFeedback);
        }
        return;
    }

    if (removeCartButton) {
        removeFromCart(removeCartButton.dataset.removeCart);
        return;
    }

    if (viewVoucherButton) {
        const purchase = findPurchaseById(viewVoucherButton.dataset.viewVoucher);
        if (purchase) {
            renderVoucherModal(purchase);
        }
        return;
    }

    if (downloadVoucherButton) {
        const purchase = findPurchaseById(downloadVoucherButton.dataset.downloadVoucher);
        if (purchase) {
            downloadPurchaseVoucherPdf(purchase);
        }
        return;
    }

    if (whatsappPurchaseButton) {
        sendPurchaseWhatsAppConfirmation(whatsappPurchaseButton.dataset.whatsappPurchase);
        return;
    }

    if (closeVoucherBackdrop) {
        closeVoucherModal();
    }
});

navButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveView(button.dataset.view));
});

jumpButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveView(button.dataset.jump));
});

if (historyExportExcelButton) {
    historyExportExcelButton.addEventListener('click', exportHistoryToExcel);
}

if (historyExportCsvButton) {
    historyExportCsvButton.addEventListener('click', exportHistoryToCSV);
}

if (storeProfileForm) {
    storeProfileForm.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!isAdminRole()) {
            setMessage(storeProfileFeedback, 'No tienes permiso para editar esta configuración.', true);
            return;
        }

        const locations = (storeLocationsInput.value || '')
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);

        state.storeProfile = {
            name: storeNameInput.value.trim() || 'Mi tienda',
            description: storeDescriptionInput.value.trim() || 'Descripción no disponible.',
            mapEmbedUrl: storeMapEmbedInput.value.trim(),
            mapLinkUrl: storeMapLinkInput.value.trim(),
            whatsappNumber: sanitizePhoneNumber(storeWhatsAppInput.value.trim()),
            locations: locations.length ? locations : ['Ubicación no especificada']
        };

        saveStoreProfile();
        renderStoreProfile();
        setMessage(storeProfileFeedback, 'Información de tienda guardada correctamente.', false);
    });
}

if (prepareOrderButton) {
    prepareOrderButton.addEventListener('click', prepareOrder);
}

if (proceedPaymentButton) {
    proceedPaymentButton.addEventListener('click', checkoutCart);
}

if (cartGenerateReceiptButton) {
    cartGenerateReceiptButton.addEventListener('click', generateReceiptFromCart);
}

if (clearCartButton) {
    clearCartButton.addEventListener('click', clearCart);
}

if (voucherCloseButton) {
    voucherCloseButton.addEventListener('click', closeVoucherModal);
}

if (voucherDownloadPdfButton) {
    voucherDownloadPdfButton.addEventListener('click', () => {
        const purchase = findPurchaseById(activeVoucherId);
        if (purchase) {
            downloadPurchaseVoucherPdf(purchase);
        }
    });
}

if (voucherWhatsAppButton) {
    voucherWhatsAppButton.addEventListener('click', () => {
        sendPurchaseWhatsAppConfirmation(activeVoucherId);
    });
}

if (confirmationOkButton) {
    confirmationOkButton.addEventListener('click', () => {
        if (confirmationCallback && typeof confirmationCallback === 'function') {
            confirmationCallback();
        }
    });
}

if (confirmationCancelButton) {
    confirmationCancelButton.addEventListener('click', closeConfirmationModal);
}

document.addEventListener('click', (event) => {
    const closeConfirmationBackdrop = event.target.closest('[data-close-confirmation]');
    if (closeConfirmationBackdrop) {
        closeConfirmationModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (voucherModal && !voucherModal.hidden) {
            closeVoucherModal();
        }
        if (confirmationModal && !confirmationModal.hidden) {
            closeConfirmationModal();
        }
    }
});

if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
        event.preventDefault();
        sessionStorage.removeItem(ACCESS_FLAG_KEY);
        sessionStorage.removeItem(USER_ROLE_KEY);
        sessionStorage.removeItem(USER_EMAIL_KEY);
        sessionStorage.removeItem(USER_ID_KEY);
        window.location.href = 'loginadmin.html';
    });
}

(async () => {
    try {
        if (sessionStorage.getItem(ACCESS_FLAG_KEY) !== 'ok') {
            window.location.href = 'loginadmin.html';
            return;
        }

        const savedRole = sessionStorage.getItem(USER_ROLE_KEY);
        if (!savedRole || (savedRole !== ROLE_ADMIN && savedRole !== ROLE_CLIENT)) {
            sessionStorage.removeItem(ACCESS_FLAG_KEY);
            sessionStorage.removeItem(USER_ROLE_KEY);
            sessionStorage.removeItem(USER_EMAIL_KEY);
            sessionStorage.removeItem(USER_ID_KEY);
            window.location.href = 'loginadmin.html';
            return;
        }

        currentRole = savedRole;
        currentUserEmail = sessionStorage.getItem(USER_EMAIL_KEY) || `${savedRole}@local`;
        currentClientId = savedRole === ROLE_CLIENT ? (sessionStorage.getItem(USER_ID_KEY) || '') : '';
        loadCartFromStorage();
        loadPurchasesFromStorage();
        loadReceiptSequencesFromStorage();
        loadReceiptsFromStorage();
        loadStoreProfile();
        fillStoreProfileForm();
        renderStoreProfile();
        updateCheckoutModeUI();
        ensureReceiptDraftDefaults();
        if (statsDateFrom && statsDateTo) {
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6);
            statsDateFrom.value = formatDateInputValue(sevenDaysAgo.toISOString());
            statsDateTo.value = formatDateInputValue(today.toISOString());
            state.statsCustomFrom = statsDateFrom.value;
            state.statsCustomTo = statsDateTo.value;
        }
        if (salesDateFrom && salesDateTo) {
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6);
            salesDateFrom.value = formatDateInputValue(sevenDaysAgo.toISOString());
            salesDateTo.value = formatDateInputValue(today.toISOString());
        }
        applyRolePermissions();

        if (!ensureConfigured()) {
            setOfflineState('Configura SUPABASE_URL y SUPABASE_ANON_KEY para cargar el panel.');
            return;
        }

        loadProductImages();
        await refreshData();
        saleDate.value = toDateTimeLocalValue();
        updateSalePreview();
        updateMetrics();
        updateInsight();
        updateDashboardMetrics();
        setActiveView(isClientRole() ? 'catalogo' : 'inicio');
    } catch (error) {
        setOfflineState(error?.message || 'No se pudo cargar el panel desde Supabase.');
    }
})();