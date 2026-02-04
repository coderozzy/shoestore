import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

export const pdfService = {
    generateDailyReport: (date, salesData, dailySummary) => {
        const doc = new jsPDF();

        // Add font support for Turkish characters if needed (standard fonts might limit this, 
        // but let's try with default and encode properly or just use standard Latin for now. 
        // Ideally we'd add a custom font but for simplicity we'll use default)

        // Header
        doc.setFontSize(22);
        doc.text('End of Day Report', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Date: ${new Date(date).toLocaleDateString('en-US')}`, 105, 30, { align: 'center' });

        // Summary
        const totalSales = dailySummary.salesCount || 0;
        const totalRevenue = dailySummary.totalRevenue || 0;

        doc.setFontSize(14);
        doc.text('Summary', 14, 45);

        doc.setFontSize(11);
        doc.text(`Total Sales Count: ${totalSales}`, 14, 55);
        doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 14, 62);

        // Sales Table
        doc.setFontSize(14);
        doc.text('Sales Details', 14, 75);

        const tableColumn = ["Product", "Color", "Size", "Price", "Qty", "Total"];
        const tableRows = [];

        salesData.forEach(item => {
            const productData = [
                item.modelName,
                item.color,
                // If size data is aggregated it might be mixed, but assuming salesData has granularity or we list models
                // The current salesData from analytics is grouped by product (model+color). 
                // We don't have size breakdown in the main chart data, so we'll skip size or put '-'
                "-",
                formatCurrency(item.unitPrice),
                item.salesCount,
                formatCurrency(item.totalRevenue)
            ];
            tableRows.push(productData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 80,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [66, 66, 66] }
        });

        // Footer
        const finalY = doc.lastAutoTable.finalY || 80;
        doc.text('Signature / Approval', 150, finalY + 30);
        doc.line(150, finalY + 40, 190, finalY + 40);

        // Save
        const fileName = `End_of_Day_Report_${new Date(date).toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }
};

export default pdfService;
