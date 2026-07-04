/**
 * exports.js — Client-Side Export Engine for CSV, PDF, and Spreadsheet Formats
 *
 * Implements:
 *   1. CSV download (comma-separated value string download)
 *   2. XLSX/Excel spreadsheet compatibility download
 *   3. PDF printing (opens a formatted print-friendly preview window)
 */

export const exportsEngine = {
  /**
   * Generates and downloads a CSV file.
   *
   * @param {string} filename — name of downloaded file (without extension)
   * @param {string[]} headers — display columns
   * @param {object[]} rows — key-value data list
   */
  exportCSV(filename, headers, rows) {
    if (!rows || rows.length === 0) return;

    // Map headers and rows
    const keys = Object.keys(rows[0]);
    let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

    rows.forEach(row => {
      const line = keys.map(key => {
        let val = row[key];
        if (val === null || val === undefined) val = '';
        val = String(val);
        // Clean and quote
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvContent += line.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, `${filename}.csv`);
    } else {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * Generates and downloads a file compatible with Microsoft Excel.
   * Uses tab-separation for robust encoding compatibility.
   */
  exportXLSX(filename, headers, rows) {
    if (!rows || rows.length === 0) return;

    const keys = Object.keys(rows[0]);
    let content = headers.join('\t') + '\n';

    rows.forEach(row => {
      const line = keys.map(key => {
        let val = row[key];
        if (val === null || val === undefined) val = '';
        return String(val).replace(/\t/g, ' ');
      });
      content += line.join('\t') + '\n';
    });

    // Excel expects UTF-16LE or UTF-8 with BOM
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Formats data into a printable layout and triggers print.
   */
  exportPDF(title, subtitle, headers, rows) {
    if (!rows || rows.length === 0) return;

    const keys = Object.keys(rows[0]);
    
    // Create new print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing PDF generation. Please allow popups.');
      return;
    }

    // Format headers and rows
    let headersHtml = headers.map(h => `<th style="padding: 10px; border-bottom: 2px solid #3525cd; text-align: left; font-size: 11px; text-transform: uppercase;">${h}</th>`).join('');
    let rowsHtml = '';
    
    rows.forEach(row => {
      let cells = keys.map(key => {
        let val = row[key];
        if (val === null || val === undefined) val = '—';
        return `<td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-size: 11px;">${val}</td>`;
      }).join('');
      rowsHtml += `<tr>${cells}</tr>`;
    });

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #191c1e;
            padding: 40px;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #3525cd;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            color: #3525cd;
            margin: 0;
          }
          .subtitle {
            font-size: 12px;
            color: #464555;
            margin: 5px 0 0 0;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #777587;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .footer {
            border-top: 1px solid #E2E8F0;
            padding-top: 20px;
            font-size: 10px;
            color: #777587;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
          <button onclick="window.print();" style="padding: 10px 20px; background: #3525cd; color: white; border: none; border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 12px;">Print / Save PDF</button>
        </div>
        
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <p class="subtitle">${subtitle}</p>
          </div>
          <div class="meta">
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>SmartAttend System</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <p>© 2026 College Smart Attendance System. Confidential Academic Document.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
};

// Global attachment
window.exportsEngine = exportsEngine;
