/**
 * utils.js — Shared Utility Functions
 *
 * Provides: formatting, validation, settings cache, toast notifications,
 * loading overlay, code generation, sanitization, debounce.
 * All modules import from here for shared helpers.
 *
 * SmartAttend College Smart Attendance System
 */

/* ============================================================
   IMPORTS
   ============================================================ */
import { api } from './api.js?v=2.2';

/* ============================================================
   SETTINGS — In-memory Cache
   ============================================================ */

/** @type {Object|null} */
let _settingsCache = null;

/**
 * Fetches all settings from the database. Caches the result in memory.
 * @returns {Promise<Object>} Map of { key: value }
 */
async function getSettings() {
  if (_settingsCache !== null) return _settingsCache;

  try {
    const { data: rows, error } = await api.Settings.getAll();
    if (error) throw error;
    
    _settingsCache = {};
    if (rows) {
      rows.forEach((row) => {
        _settingsCache[row.key] = row.value;
      });
    }
    return _settingsCache;
  } catch (err) {
    console.error('[utils] getSettings error:', err);
    _settingsCache = {};
    return _settingsCache;
  }
}

/**
 * Returns a single setting value as a string.
 * Fetches all settings if not yet cached.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
async function getSetting(key) {
  const settings = await getSettings();
  return settings[key] ?? null;
}

/**
 * Clears the in-memory settings cache.
 * Call this after an admin saves/updates a setting.
 */
function clearSettingsCache() {
  _settingsCache = null;
}

/* ============================================================
   FORMATTERS
   ============================================================ */

/**
 * Formats a timestamp (ms or Date) to e.g. '02 July 2026'.
 * @param {number|Date} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats a timestamp to e.g. '09:13:42 AM'.
 * @param {number|Date} timestamp
 * @returns {string}
 */
function formatTime(timestamp) {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a timestamp to e.g. '02 July 2026, 09:13:42 AM'.
 * @param {number|Date} timestamp
 * @returns {string}
 */
function formatDateTime(timestamp) {
  return `${formatDate(timestamp)}, ${formatTime(timestamp)}`;
}

/**
 * Formats seconds into MM:SS string, e.g. 272 → '04:32'.
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Formats a decimal value as a percentage string.
 * @param {number} value  e.g. 94.234
 * @returns {string}      e.g. '94.23%'
 */
function formatPercentage(value) {
  return `${Number(value).toFixed(2)}%`;
}

/**
 * Returns '1 student' or '5 students'.
 * @param {number} n
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
function formatCount(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

/* ============================================================
   VALIDATION
   ============================================================ */

/**
 * Validates an Indian mobile number.
 * Rules: exactly 10 digits, first digit 6–9.
 * @param {string} mobile
 * @returns {{ valid: boolean, message: string }}
 */
function validateMobile(mobile) {
  const cleaned = String(mobile).trim();
  if (!cleaned) return { valid: false, message: 'Mobile number is required.' };
  if (!/^\d{10}$/.test(cleaned))
    return { valid: false, message: 'Mobile number must be exactly 10 digits.' };
  if (!/^[6-9]/.test(cleaned))
    return { valid: false, message: 'Mobile number must start with 6, 7, 8, or 9.' };
  return { valid: true, message: '' };
}

/**
 * Validates a student name.
 * Rules: 2–100 chars, letters / spaces / dots / hyphens only.
 * @param {string} name
 * @returns {{ valid: boolean, message: string }}
 */
function validateStudentName(name) {
  const cleaned = String(name).trim();
  if (!cleaned) return { valid: false, message: 'Name is required.' };
  if (cleaned.length < 2)
    return { valid: false, message: 'Name must be at least 2 characters.' };
  if (cleaned.length > 100)
    return { valid: false, message: 'Name must be at most 100 characters.' };
  if (!/^[A-Za-z\s.\-]+$/.test(cleaned))
    return {
      valid: false,
      message: 'Name may only contain letters, spaces, dots, and hyphens.',
    };
  return { valid: true, message: '' };
}

/**
 * Validates a 4-digit numeric attendance code.
 * @param {string} code
 * @returns {{ valid: boolean, message: string }}
 */
function validateAttendanceCode(code) {
  const cleaned = String(code).trim();
  if (!cleaned) return { valid: false, message: 'Attendance code is required.' };
  if (!/^\d{4}$/.test(cleaned))
    return { valid: false, message: 'Attendance code must be exactly 4 digits.' };
  return { valid: true, message: '' };
}

/**
 * Validates an email address.
 * @param {string} email
 * @returns {{ valid: boolean, message: string }}
 */
function validateEmail(email) {
  const cleaned = String(email).trim();
  if (!cleaned) return { valid: false, message: 'Email address is required.' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned))
    return { valid: false, message: 'Please enter a valid email address.' };
  return { valid: true, message: '' };
}

/**
 * Strips HTML tags and trims whitespace.
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  return String(str)
    .replace(/<[^>]*>/g, '')
    .trim();
}

/* ============================================================
   ATTENDANCE CODE GENERATION
   ============================================================ */

/**
 * Generates a random 4-digit numeric attendance code ('0000'–'9999').
 * @returns {string}
 */
function generateCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

/* ============================================================
   DEBOUNCE
   ============================================================ */

/**
 * Returns a debounced version of fn that delays invocation by delay ms.
 * @param {Function} fn
 * @param {number} delay  milliseconds
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

/** @type {HTMLElement|null} */
let _toastContainer = null;

/**
 * Returns (or creates) the fixed toast container in the DOM.
 * @returns {HTMLElement}
 */
function _getToastContainer() {
  if (_toastContainer && document.body.contains(_toastContainer)) {
    return _toastContainer;
  }
  const container = document.createElement('div');
  container.id = 'smartattend-toast-container';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
    pointer-events: none;
  `;
  document.body.appendChild(container);
  _toastContainer = container;
  return container;
}

const _TOAST_STYLES = {
  success: {
    bg: 'linear-gradient(135deg, #14532d, #16a34a)',
    border: '#22c55e',
    icon: 'check_circle',
  },
  error: {
    bg: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
    border: '#ef4444',
    icon: 'error',
  },
  warning: {
    bg: 'linear-gradient(135deg, #78350f, #d97706)',
    border: '#f59e0b',
    icon: 'warning',
  },
  info: {
    bg: 'linear-gradient(135deg, #1e1b4b, #4338ca)',
    border: '#6366f1',
    icon: 'info',
  },
};

/**
 * Shows a toast notification that slides in from the bottom-right.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration  ms before auto-remove
 */
function showToast(message, type = 'info', duration = 3500) {
  const style = _TOAST_STYLES[type] || _TOAST_STYLES.info;
  const container = _getToastContainer();

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 280px;
    max-width: 420px;
    padding: 14px 18px;
    background: ${style.bg};
    border: 1px solid ${style.border};
    border-radius: 14px;
    color: #ffffff;
    font-family: 'Inter', 'Outfit', sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    pointer-events: auto;
    cursor: default;
    transform: translateX(120%);
    opacity: 0;
    transition: transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
    will-change: transform, opacity;
  `;

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:20px;flex-shrink:0;">${style.icon}</span>
    <span style="flex:1;">${sanitize(message)}</span>
    <button onclick="this.parentElement.remove()" style="
      background:none;border:none;color:rgba(255,255,255,0.7);
      cursor:pointer;font-size:18px;line-height:1;padding:0;margin-left:4px;
      display:flex;align-items:center;
    " aria-label="Dismiss">
      <span class="material-symbols-outlined" style="font-size:18px;">close</span>
    </button>
  `;

  container.appendChild(toast);

  // Slide in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });
  });

  // Auto-remove
  const timerId = setTimeout(() => {
    _dismissToast(toast);
  }, duration);

  // Allow manual dismiss without waiting
  toast.querySelector('button').addEventListener('click', () => {
    clearTimeout(timerId);
  });
}

/**
 * Slides a toast out and removes it.
 * @param {HTMLElement} toast
 */
function _dismissToast(toast) {
  toast.style.transform = 'translateX(120%)';
  toast.style.opacity = '0';
  setTimeout(() => toast.remove(), 400);
}

/** Shows a success toast. */
function showSuccess(message) {
  showToast(message, 'success');
}

/** Shows an error toast. */
function showError(message) {
  showToast(message, 'error');
}

/** Shows a warning toast. */
function showWarning(message) {
  showToast(message, 'warning');
}

/** Shows an info toast. */
function showInfo(message) {
  showToast(message, 'info');
}

/* ============================================================
   LOADING OVERLAY
   ============================================================ */

/** @type {HTMLElement|null} */
let _loaderOverlay = null;

/**
 * Shows a full-screen loading overlay with a spinner and message.
 * @param {string} message
 */
function showLoader(message = 'Loading...') {
  if (_loaderOverlay && document.body.contains(_loaderOverlay)) {
    const msgEl = _loaderOverlay.querySelector('#smartattend-loader-msg');
    if (msgEl) msgEl.textContent = message;
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'smartattend-loader-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99998;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: rgba(10, 10, 30, 0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    opacity: 0;
    transition: opacity 0.25s ease;
  `;

  overlay.innerHTML = `
    <div style="
      width: 64px; height: 64px;
      border-radius: 50%;
      border: 4px solid rgba(99,102,241,0.25);
      border-top-color: #6366f1;
      animation: smartattend-spin 0.9s linear infinite;
    "></div>
    <p id="smartattend-loader-msg" style="
      color: #e0e7ff;
      font-family: 'Inter','Outfit',sans-serif;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.02em;
      margin: 0;
    ">${sanitize(message)}</p>
  `;

  // Inject keyframes once
  if (!document.getElementById('smartattend-loader-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'smartattend-loader-style';
    styleEl.textContent = `
      @keyframes smartattend-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(overlay);
  _loaderOverlay = overlay;

  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  });
}

/**
 * Removes the loading overlay with a fade-out animation.
 */
function hideLoader() {
  if (!_loaderOverlay || !document.body.contains(_loaderOverlay)) return;
  const overlay = _loaderOverlay;
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.remove();
    if (_loaderOverlay === overlay) _loaderOverlay = null;
  }, 280);
}

/* ============================================================
   ERROR HANDLING
   ============================================================ */

/**
 * Known error codes → user-friendly messages.
 * Use these codes as keys in error objects: { code: 'WRONG_CODE' }.
 */
const USER_ERRORS = {
  STUDENT_NOT_FOUND: 'Student ID not registered. Please contact the administrator.',
  STUDENT_INACTIVE:
    'Student account is inactive. Please contact the administrator.',
  FACULTY_INACTIVE:
    'Faculty account is inactive. Please contact the administrator.',
  NO_ACTIVE_SESSION:
    'No active attendance session for your lecture hall right now.',
  WRONG_CODE: 'Invalid attendance code. Please check and try again.',
  SESSION_EXPIRED:
    'Attendance session has expired. Please contact your instructor.',
  DUPLICATE_ATTENDANCE: 'Attendance already marked for this session.',
  SERVER_ERROR: 'Unable to connect to the server. Please try again.',
};

/**
 * Logs the raw error and shows a user-friendly toast.
 * @param {Error|Object} error  — may have a .code property
 * @param {string} fallbackMessage — shown if no matching code
 * @returns {string} the user-facing message that was displayed
 */
function handleError(error, fallbackMessage = 'Something went wrong. Please try again.') {
  console.error('[SmartAttend Error Debug Log]', error);

  let userMessage = fallbackMessage;

  if (error) {
    const code = String(error.code || '');
    const msg = String(error.message || '');
    const details = String(error.details || '');

    if (msg) {
      userMessage = msg;
      if (details) {
        userMessage += ` (Details: ${details})`;
      }
      if (code) {
        userMessage += ` [Error Code: ${code}]`;
      }
    } else if (code && USER_ERRORS[code]) {
      userMessage = USER_ERRORS[code];
    } else if (code === '23505') {
      if (msg.includes('students_mobile_number_key') || msg.includes('students_mobile') || msg.includes('mobile_number')) {
        userMessage = 'Mobile number already registered.';
      } else if (msg.includes('faculty_email_key') || msg.includes('faculty_email')) {
        userMessage = 'Faculty email already exists.';
      } else if (msg.includes('faculty_faculty_id_key') || msg.includes('faculty_id')) {
        userMessage = 'Faculty ID already exists.';
      } else if (msg.includes('idx_sessions_unique_active') || msg.includes('attendance_sessions')) {
        userMessage = 'Attendance session already active.';
      } else {
        userMessage = 'Duplicate record already exists.';
      }
    } else if (typeof error === 'string') {
      userMessage = error;
    }
  }

  showError(userMessage);
  return userMessage;
}

/* ============================================================
   LOCAL STORAGE HELPERS
   ============================================================ */

/**
 * Saves a value to localStorage as JSON.
 * @param {string} key
 * @param {*} value
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[utils] saveToStorage failed:', err);
  }
}

/**
 * Reads and JSON-parses a value from localStorage.
 * @param {string} key
 * @param {*} defaultValue  returned if key missing or parse fails
 * @returns {*}
 */
function getFromStorage(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[utils] getFromStorage parse error:', err);
    return defaultValue;
  }
}

/**
 * Removes a key from localStorage.
 * @param {string} key
 */
function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[utils] removeFromStorage failed:', err);
  }
}

/* ============================================================
   DOM HELPERS
   ============================================================ */

/**
 * Makes an element visible by removing the 'hidden' class.
 * @param {HTMLElement} element
 */
function show(element) {
  if (element) element.classList.remove('hidden');
}

/**
 * Hides an element by adding the 'hidden' class.
 * @param {HTMLElement} element
 */
function hide(element) {
  if (element) element.classList.add('hidden');
}

/**
 * Toggles a button between its normal state and a loading state.
 * @param {HTMLButtonElement} button
 * @param {boolean} isLoading
 * @param {string} loadingText
 */
function setLoading(button, isLoading, loadingText = 'Loading...') {
  if (!button) return;

  if (isLoading) {
    // Save original state
    button.dataset.originalText = button.innerHTML;
    button.dataset.originalDisabled = button.disabled ? '1' : '0';
    button.disabled = true;
    button.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <span style="
          display:inline-block;width:16px;height:16px;
          border:2px solid rgba(255,255,255,0.35);
          border-top-color:#fff;
          border-radius:50%;
          animation:smartattend-spin 0.8s linear infinite;
        "></span>
        <span>${sanitize(loadingText)}</span>
      </span>
    `;

    // Ensure spinner keyframes exist
    if (!document.getElementById('smartattend-loader-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'smartattend-loader-style';
      styleEl.textContent = `@keyframes smartattend-spin{to{transform:rotate(360deg)}}`;
      document.head.appendChild(styleEl);
    }
  } else {
    // Restore
    if (button.dataset.originalText !== undefined) {
      button.innerHTML = button.dataset.originalText;
      delete button.dataset.originalText;
    }
    button.disabled = button.dataset.originalDisabled === '1';
    delete button.dataset.originalDisabled;
  }
}

/**
 * Resets all input, select, and textarea elements in a form.
 * @param {HTMLFormElement} formElement
 */
function clearForm(formElement) {
  if (!formElement) return;
  formElement.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });
}

/**
 * Retrieves the list of active lecture halls.
 * Falls back to APP_CONFIG defaults if database settings are empty or invalid.
 * @returns {Promise<Array<{id: string, name: string, status: string}>>}
 */
async function getActiveLectureHalls() {
  try {
    const hallsJson = await getSetting('lecture_halls');
    if (hallsJson) {
      const halls = JSON.parse(hallsJson);
      const active = halls.filter(h => h.status === 'active');
      if (active.length > 0) return active;
    }
  } catch (err) {
    console.warn('[utils] Failed to parse lecture_halls setting, using config defaults:', err);
  }
  const defaults = window.APP_CONFIG?.LECTURE_HALLS || ['LH-01', 'LH-02', 'LH-03', 'LH-04', 'LH-05', 'LH-06'];
  return defaults.map(name => ({ id: name, name: name, status: 'active' }));
}

/* ============================================================
   EXPORTS — attach to window for global access (non-module usage)
   ============================================================ */
window.utils = {
  // Settings
  getSettings,
  getSetting,
  clearSettingsCache,
  getActiveLectureHalls,

  // Formatters
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatPercentage,
  formatCount,

  // Validation
  validateMobile,
  validateStudentName,
  validateAttendanceCode,
  validateEmail,
  sanitize,

  // Code generation
  generateCode,

  // Debounce
  debounce,

  // Toast
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,

  // Loader
  showLoader,
  hideLoader,

  // Error handling
  USER_ERRORS,
  handleError,

  // Storage
  saveToStorage,
  getFromStorage,
  removeFromStorage,

  // DOM helpers
  show,
  hide,
  setLoading,
  clearForm,
};

export {
  getSettings,
  getSetting,
  clearSettingsCache,
  getActiveLectureHalls,
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatPercentage,
  formatCount,
  validateMobile,
  validateStudentName,
  validateAttendanceCode,
  validateEmail,
  sanitize,
  generateCode,
  debounce,
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoader,
  hideLoader,
  USER_ERRORS,
  handleError,
  saveToStorage,
  getFromStorage,
  removeFromStorage,
  show,
  hide,
  setLoading,
  clearForm
};
