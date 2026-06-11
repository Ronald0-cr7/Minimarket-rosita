// ===== HISTORY TABLE RENDERING =====

function getFilteredHistorySales() {
    const dateFromStr = state.historyDateFrom;
    const dateToStr = state.historyDateTo;
    let filtered = state.sales.slice().reverse();

    if (dateFromStr) {
        const dateFrom = new Date(`${dateFromStr}T00:00:00`);
        dateFrom.setHours(0, 0, 0, 0);
        filtered = filtered.filter((sale) => {
            const saleDate = new Date(sale.date);
            return saleDate >= dateFrom;
        });
    }

    if (dateToStr) {
        const dateTo = new Date(`${dateToStr}T23:59:59.999`);
        dateTo.setHours(23, 59, 59, 999);
        filtered = filtered.filter((sale) => {
            const saleDate = new Date(sale.date);
            return saleDate <= dateTo;
        });
    }

    return filtered;
}

function renderHistoryTable() {
    if (!historyTableBody) {
        return;
    }

    const filtered = getFilteredHistorySales();
    
    if (historyCountLabel) {
        historyCountLabel.textContent = `${filtered.length} ventas`;
    }

    if (!state.sales.length) {
        historyTableBody.innerHTML = '<tr><td colspan="5" class="empty-row">Aún no tienes ventas registradas.</td></tr>';
        return;
    }

    if (!filtered.length) {
        historyTableBody.innerHTML = '<tr><td colspan="5" class="empty-row">No hay ventas en el rango de fechas seleccionado.</td></tr>';
        return;
    }

    historyTableBody.innerHTML = filtered.map((sale) => `
        <tr>
            <td>${formatDateTime(sale.date)}</td>
            <td>
                <strong class="table-primary">${escapeHtml(sale.productName)}</strong>
                <span class="table-secondary">${escapeHtml(sale.productId)} • ${sale.quantity}un</span>
            </td>
            <td>${escapeHtml(sale.paymentMethod)}</td>
            <td>${formatCurrency(sale.total)}</td>
            <td>
                <div class="row-actions">
                    <button class="action-button" type="button" data-edit-history-sale="${escapeHtml(sale.id)}">Editar</button>
                    <button class="action-button action-button--danger" type="button" data-delete-history-sale="${escapeHtml(sale.id)}">Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function exportHistoryToCSV() {
    const filtered = getFilteredHistorySales();
    
    if (!filtered.length) {
        alert('No hay registros para descargar en el rango de fechas seleccionado.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Hora,Detalle,Cantidad,Método de Pago,Total\n';

    filtered.forEach((sale) => {
        const hora = formatDateTime(sale.date);
        const detalle = `${sale.productName} (${sale.productId})`;
        const cantidad = sale.quantity;
        const metodo = sale.paymentMethod;
        const total = `S/ ${Number(sale.total || 0).toFixed(2)}`;

        csvContent += `"${hora}","${detalle}",${cantidad},"${metodo}","${total}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportHistoryToExcel() {
    const filtered = getFilteredHistorySales();
    
    if (!filtered.length) {
        alert('No hay registros para descargar en el rango de fechas seleccionado.');
        return;
    }

    let htmlContent = '<table border="1" cellpadding="8">';
    htmlContent += '<thead><tr><th>Hora</th><th>Detalle</th><th>Cantidad</th><th>Método de Pago</th><th>Total</th></tr></thead>';
    htmlContent += '<tbody>';

    filtered.forEach((sale) => {
        const hora = formatDateTime(sale.date);
        const detalle = `${sale.productName} (${sale.productId})`;
        const cantidad = sale.quantity;
        const metodo = sale.paymentMethod;
        const total = `S/ ${Number(sale.total || 0).toFixed(2)}`;

        htmlContent += `<tr><td>${hora}</td><td>${detalle}</td><td>${cantidad}</td><td>${metodo}</td><td>${total}</td></tr>`;
    });

    htmlContent += '</tbody></table>';

    const fileName = `historial_ventas_${new Date().toISOString().split('T')[0]}.xls`;
    const link = document.createElement('a');
    link.setAttribute('href', `data:application/vnd.ms-excel;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportHistoryToPdf() {
    const filtered = getFilteredHistorySales();
    if (!filtered.length) {
        alert('No hay registros para descargar en el rango de fechas seleccionado.');
        return;
    }

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        alert('jsPDF no está disponible. Asegúrate de cargar la librería jspdf.');
        return;
    }

    const doc = new jsPDF();
    const rows = filtered.map((sale) => [
        formatDateTime(sale.date),
        `${sale.productName} (${sale.productId})`,
        String(sale.quantity || 0),
        sale.paymentMethod || '',
        `S/ ${Number(sale.total || 0).toFixed(2)}`
    ]);

    doc.text('Historial de ventas', 14, 16);
    doc.autoTable({
        head: [['Hora', 'Detalle', 'Cantidad', 'Método', 'Total']],
        body: rows,
        startY: 22,
        styles: { fontSize: 9 }
    });

    doc.save(`historial_ventas_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Agregar eventos para el historial
if (historyDateFrom && historyDateTo && historyApplyRangeButton) {
    historyApplyRangeButton.addEventListener('click', () => {
        state.historyDateFrom = historyDateFrom.value;
        state.historyDateTo = historyDateTo.value;
        renderHistoryTable();
    });

    historyDateFrom.addEventListener('change', () => {
        state.historyDateFrom = historyDateFrom.value;
        renderHistoryTable();
    });

    historyDateTo.addEventListener('change', () => {
        state.historyDateTo = historyDateTo.value;
        renderHistoryTable();
    });
}

if (historyExportExcelButton) {
    historyExportExcelButton.addEventListener('click', exportHistoryToExcel);
}

if (historyExportCsvButton) {
    historyExportCsvButton.addEventListener('click', exportHistoryToCSV);
}