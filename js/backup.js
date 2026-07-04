/**
 * backup.js — Database Backup Engine v1
 *
 * Implements backup exports of all database tables (students, faculty,
 * sessions, records, settings, audit_logs) as ZIP-packed CSV files.
 * Uses JSZip dynamically loaded via CDN.
 */

import { api } from './api.js';
import { audit } from './audit.js';

// Dynamic script loader for JSZip
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => reject(new Error('Failed to load JSZip from CDN.'));
    document.head.appendChild(script);
  });
}

/**
 * Helper to convert array of objects into standard CSV string content.
 *
 * @param {object[]} array
 * @returns {string}
 */
function convertToCSV(array) {
  if (!array || array.length === 0) return '';
  
  const headers = Object.keys(array[0]);
  let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
  
  array.forEach(row => {
    const line = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      val = String(val);
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvContent += line.join(',') + '\n';
  });
  
  return csvContent;
}

export const backupManager = {
  /**
   * Generates a ZIP archive containing all records as CSV files and triggers download.
   */
  async createBackup() {
    window.utils.showLoader('Loading ZIP Engine...');
    
    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();

      // 1. Fetch Students
      window.utils.showLoader('Exporting Students table...');
      const { data: students } = await api.Students.list({ limit: 100000 });
      zip.file('students.csv', convertToCSV(students || []));

      // 2. Fetch Faculty
      window.utils.showLoader('Exporting Faculty table...');
      const { data: faculty } = await api.Faculty.list({ limit: 1000 });
      zip.file('faculty.csv', convertToCSV(faculty || []));

      // 3. Fetch Sessions
      window.utils.showLoader('Exporting Sessions table...');
      const { data: sessions } = await api.Sessions.listByDateRange('2000-01-01', '2100-01-01');
      zip.file('attendance_sessions.csv', convertToCSV(sessions || []));

      // 4. Fetch Records
      window.utils.showLoader('Exporting Attendance Records...');
      const { data: records } = await api.Records.listAll();
      zip.file('attendance_records.csv', convertToCSV(records || []));

      // 5. Fetch Settings
      window.utils.showLoader('Exporting System Settings...');
      const { data: settings } = await api.Settings.getAll();
      zip.file('settings.csv', convertToCSV(settings || []));

      // 6. Fetch Audit Logs
      window.utils.showLoader('Exporting Audit Trails...');
      const { data: auditLogs } = await api.Audit.list({ limit: 10000 });
      zip.file('audit_logs.csv', convertToCSV(auditLogs || []));

      // Generate the ZIP blob
      window.utils.showLoader('Compressing ZIP archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Trigger download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `smartattend_backup_${timestamp}.zip`;

      const link = document.createElement('a');
      const url = URL.createObjectURL(content);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log backup creation to audit log
      await audit.log({
        action: 'BACKUP_CREATED',
        targetType: 'backup',
        targetId: null,
        details: { filename: filename, records_exported: records?.length || 0 }
      });

      window.utils.hideLoader();
      window.utils.showSuccess('System backup archive created successfully!');

    } catch (err) {
      window.utils.hideLoader();
      console.error('Backup error:', err);
      window.utils.showError('Unable to generate database ZIP backup.');
      throw err;
    }
  }
};

// Global attachment
window.backupManager = backupManager;
