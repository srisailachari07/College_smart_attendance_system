/**
 * components.js — Reusable UI Component Library
 *
 * All components use Stitch UI Academic Flux CSS classes.
 * Returns HTML strings (use innerHTML) or DOM elements.
 *
 * SmartAttend College Smart Attendance System
 */

/* ============================================================
   BUTTONS  (return HTML strings)
   ============================================================ */

/**
 * Primary indigo-gradient button.
 * @param {{ label:string, icon?:string|null, id?:string, onclick?:string, disabled?:boolean, type?:string }} opts
 * @returns {string} HTML string
 */
function primaryBtn({
  label,
  icon = null,
  id = '',
  onclick = '',
  disabled = false,
  type = 'button',
} = {}) {
  const idAttr = id ? `id="${id}"` : '';
  const onclickAttr = onclick ? `onclick="${onclick}"` : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const iconHtml = icon
    ? `<span class="material-symbols-outlined" style="font-size:20px;">${icon}</span>`
    : '';
  return `
    <button
      ${idAttr}
      type="${type}"
      class="indigo-gradient font-label-md"
      style="
        display:inline-flex;align-items:center;justify-content:center;gap:8px;
        height:56px;padding:0 28px;border-radius:9999px;border:none;
        color:#fff;cursor:pointer;font-weight:600;font-size:14px;
        letter-spacing:0.03em;
        background:linear-gradient(135deg,#4F46E5,#6366F1);
        box-shadow:0 4px 20px rgba(99,102,241,0.35);
        transition:transform 0.18s ease,box-shadow 0.18s ease,opacity 0.18s ease;
        ${disabled ? 'opacity:0.5;cursor:not-allowed;' : ''}
      "
      onmouseover="if(!this.disabled){this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 28px rgba(99,102,241,0.45)';}"
      onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(99,102,241,0.35)';"
      ${onclickAttr}
      ${disabledAttr}
      aria-label="${label}"
    >
      ${iconHtml}
      <span>${label}</span>
    </button>
  `.trim();
}

/**
 * Secondary ghost / outline button.
 * @param {{ label:string, icon?:string|null, id?:string, onclick?:string, disabled?:boolean }} opts
 * @returns {string} HTML string
 */
function secondaryBtn({
  label,
  icon = null,
  id = '',
  onclick = '',
  disabled = false,
} = {}) {
  const idAttr = id ? `id="${id}"` : '';
  const onclickAttr = onclick ? `onclick="${onclick}"` : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const iconHtml = icon
    ? `<span class="material-symbols-outlined" style="font-size:20px;">${icon}</span>`
    : '';
  return `
    <button
      ${idAttr}
      type="button"
      class="font-label-md"
      style="
        display:inline-flex;align-items:center;justify-content:center;gap:8px;
        height:56px;padding:0 28px;border-radius:9999px;
        border:1.5px solid rgba(99,102,241,0.45);
        color:#a5b4fc;background:rgba(99,102,241,0.06);
        cursor:pointer;font-weight:600;font-size:14px;letter-spacing:0.03em;
        transition:transform 0.18s ease,border-color 0.18s ease,background 0.18s ease;
        ${disabled ? 'opacity:0.5;cursor:not-allowed;' : ''}
      "
      onmouseover="if(!this.disabled){this.style.borderColor='rgba(99,102,241,0.9)';this.style.background='rgba(99,102,241,0.13)';this.style.transform='translateY(-1px)';}"
      onmouseout="this.style.borderColor='rgba(99,102,241,0.45)';this.style.background='rgba(99,102,241,0.06)';this.style.transform='';"
      ${onclickAttr}
      ${disabledAttr}
      aria-label="${label}"
    >
      ${iconHtml}
      <span>${label}</span>
    </button>
  `.trim();
}

/**
 * Destructive solid-red button.
 * @param {{ label:string, icon?:string|null, id?:string, onclick?:string }} opts
 * @returns {string} HTML string
 */
function destructiveBtn({ label, icon = null, id = '', onclick = '' } = {}) {
  const idAttr = id ? `id="${id}"` : '';
  const onclickAttr = onclick ? `onclick="${onclick}"` : '';
  const iconHtml = icon
    ? `<span class="material-symbols-outlined" style="font-size:20px;">${icon}</span>`
    : '';
  return `
    <button
      ${idAttr}
      type="button"
      class="font-label-md"
      style="
        display:inline-flex;align-items:center;justify-content:center;gap:8px;
        height:56px;padding:0 28px;border-radius:9999px;border:none;
        color:#fff;background:linear-gradient(135deg,#991b1b,#dc2626);
        cursor:pointer;font-weight:600;font-size:14px;letter-spacing:0.03em;
        box-shadow:0 4px 18px rgba(220,38,38,0.35);
        transition:transform 0.18s ease,box-shadow 0.18s ease;
      "
      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 26px rgba(220,38,38,0.45)';"
      onmouseout="this.style.transform='';this.style.boxShadow='0 4px 18px rgba(220,38,38,0.35)';"
      ${onclickAttr}
      aria-label="${label}"
    >
      ${iconHtml}
      <span>${label}</span>
    </button>
  `.trim();
}

/**
 * Circular icon-only button.
 * @param {{ icon:string, id?:string, title?:string, onclick?:string }} opts
 * @returns {string} HTML string
 */
function iconBtn({ icon, id = '', title = '', onclick = '' } = {}) {
  const idAttr = id ? `id="${id}"` : '';
  const onclickAttr = onclick ? `onclick="${onclick}"` : '';
  const titleAttr = title ? `title="${title}" aria-label="${title}"` : '';
  return `
    <button
      ${idAttr}
      type="button"
      ${titleAttr}
      class="font-label-md"
      style="
        display:inline-flex;align-items:center;justify-content:center;
        width:48px;height:48px;border-radius:50%;
        border:1.5px solid rgba(99,102,241,0.3);
        color:#a5b4fc;background:rgba(99,102,241,0.08);
        cursor:pointer;transition:background 0.18s ease,transform 0.18s ease;
      "
      onmouseover="this.style.background='rgba(99,102,241,0.18)';this.style.transform='scale(1.07)';"
      onmouseout="this.style.background='rgba(99,102,241,0.08)';this.style.transform='';"
      ${onclickAttr}
    >
      <span class="material-symbols-outlined" style="font-size:22px;">${icon}</span>
    </button>
  `.trim();
}

/* ============================================================
   STATUS BADGES  (return HTML string)
   ============================================================ */

const _BADGE_STYLES = {
  present:  { bg: 'rgba(21,128,61,0.18)',  color: '#4ade80', border: 'rgba(74,222,128,0.3)'  },
  absent:   { bg: 'rgba(185,28,28,0.18)',  color: '#f87171', border: 'rgba(248,113,113,0.3)' },
  active:   { bg: 'rgba(67,56,202,0.2)',   color: '#818cf8', border: 'rgba(129,140,248,0.35)' },
  closed:   { bg: 'rgba(75,85,99,0.2)',    color: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
  warning:  { bg: 'rgba(146,64,14,0.2)',   color: '#fbbf24', border: 'rgba(251,191,36,0.3)'  },
  low:      { bg: 'rgba(154,52,18,0.2)',   color: '#fb923c', border: 'rgba(251,146,60,0.3)'  },
};

/**
 * Status pill badge.
 * @param {string} label
 * @param {'present'|'absent'|'active'|'closed'|'warning'|'low'} type
 * @returns {string} HTML string
 */
function badge(label, type) {
  const s = _BADGE_STYLES[type] || _BADGE_STYLES.closed;
  return `
    <span style="
      display:inline-flex;align-items:center;
      padding:3px 12px;border-radius:9999px;
      background:${s.bg};color:${s.color};
      border:1px solid ${s.border};
      font-size:12px;font-weight:600;letter-spacing:0.04em;
      white-space:nowrap;
    ">${label}</span>
  `.trim();
}

/* ============================================================
   STAT CARD  (return HTML string)
   ============================================================ */

const _CARD_COLORS = {
  primary:   { icon: 'rgba(67,56,202,0.25)',  text: '#818cf8',  glow: 'rgba(99,102,241,0.12)' },
  success:   { icon: 'rgba(21,128,61,0.2)',   text: '#4ade80',  glow: 'rgba(74,222,128,0.10)' },
  error:     { icon: 'rgba(185,28,28,0.2)',   text: '#f87171',  glow: 'rgba(248,113,113,0.10)' },
  warning:   { icon: 'rgba(146,64,14,0.2)',   text: '#fbbf24',  glow: 'rgba(251,191,36,0.08)' },
  secondary: { icon: 'rgba(139,92,246,0.2)',  text: '#c4b5fd',  glow: 'rgba(196,181,253,0.10)' },
};

/**
 * KPI stat card.
 * @param {{ title:string, value:string|number, icon:string, badge?:string|null, color?:string, subtitle?:string|null }} opts
 * @returns {string} HTML string
 */
function statCard({ title, value, icon, badge: bdg = null, color = 'primary', subtitle = null } = {}) {
  const c = _CARD_COLORS[color] || _CARD_COLORS.primary;
  const badgeHtml = bdg ? `<div style="margin-top:8px;">${bdg}</div>` : '';
  const subtitleHtml = subtitle
    ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-weight:500;">${subtitle}</p>`
    : '';
  return `
    <div class="bg-surface-container-lowest soft-bloom" style="
      border-radius:24px;
      border:1px solid rgba(99,102,241,0.15);
      padding:24px;
      display:flex;flex-direction:column;gap:16px;
      box-shadow:0 0 0 1px rgba(99,102,241,0.05), ${c.glow} 0 8px 32px;
      transition:transform 0.22s ease,box-shadow 0.22s ease;
      cursor:default;
    "
    onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.25),${c.glow.replace(')', ',0.18)')} 0 8px 32px';"
    onmouseout="this.style.transform='';this.style.boxShadow='0 0 0 1px rgba(99,102,241,0.05),${c.glow} 0 8px 32px';"
    >
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <p class="font-label-md" style="
            margin:0;font-size:13px;color:#6b7280;font-weight:500;
            text-transform:uppercase;letter-spacing:0.07em;
          ">${title}</p>
          <p class="font-headline-md" style="
            margin:6px 0 0;font-size:32px;font-weight:700;
            color:#e5e7eb;line-height:1.1;
          ">${value}</p>
          ${subtitleHtml}
          ${badgeHtml}
        </div>
        <div style="
          width:48px;height:48px;border-radius:14px;
          background:${c.icon};
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;
        ">
          <span class="material-symbols-outlined" style="font-size:24px;color:${c.text};">${icon}</span>
        </div>
      </div>
    </div>
  `.trim();
}

/* ============================================================
   ACTION CARD  (return HTML string)
   ============================================================ */

/**
 * Bento-grid action card with decorative corner circle, icon, title, desc, arrow CTA.
 * @param {{ title:string, desc:string, icon:string, cta:string, href:string, color?:string }} opts
 * @returns {string} HTML string
 */
function actionCard({ title, desc, icon, cta, href, color = 'primary' } = {}) {
  const c = _CARD_COLORS[color] || _CARD_COLORS.primary;
  return `
    <a href="${href}" style="text-decoration:none;" aria-label="${title}">
      <div class="bg-surface-container-lowest soft-bloom" style="
        border-radius:24px;
        border:1px solid rgba(99,102,241,0.15);
        padding:28px;
        display:flex;flex-direction:column;gap:14px;
        position:relative;overflow:hidden;
        box-shadow:0 0 0 1px rgba(99,102,241,0.05);
        transition:transform 0.22s ease,box-shadow 0.22s ease;
        cursor:pointer;
      "
      onmouseover="this.style.transform='translateY(-8px)';this.style.boxShadow='0 20px 50px rgba(0,0,0,0.3)';"
      onmouseout="this.style.transform='';this.style.boxShadow='0 0 0 1px rgba(99,102,241,0.05)';"
      >
        <!-- Decorative corner circle -->
        <div style="
          position:absolute;top:-28px;right:-28px;
          width:100px;height:100px;border-radius:50%;
          background:${c.icon};opacity:0.7;
          pointer-events:none;
        "></div>

        <!-- Icon box -->
        <div style="
          width:52px;height:52px;border-radius:16px;
          background:${c.icon};
          display:inline-flex;align-items:center;justify-content:center;
          position:relative;z-index:1;
        ">
          <span class="material-symbols-outlined" style="font-size:26px;color:${c.text};">${icon}</span>
        </div>

        <!-- Content -->
        <div style="flex:1;position:relative;z-index:1;">
          <h3 class="font-headline-md" style="
            margin:0 0 6px;font-size:18px;font-weight:700;color:#f3f4f6;
          ">${title}</h3>
          <p class="font-body-sm" style="
            margin:0;font-size:13px;color:#9ca3af;line-height:1.6;
          ">${desc}</p>
        </div>

        <!-- CTA Arrow -->
        <div style="
          display:flex;align-items:center;gap:6px;
          color:${c.text};font-size:13px;font-weight:600;
          position:relative;z-index:1;
        ">
          <span>${cta}</span>
          <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
        </div>
      </div>
    </a>
  `.trim();
}

/* ============================================================
   TOAST  (DOM manipulation)
   ============================================================ */

const _TOAST_CFG = {
  success: { bg: 'linear-gradient(135deg,#14532d,#16a34a)', border: '#22c55e', icon: 'check_circle' },
  error:   { bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', border: '#ef4444', icon: 'error'       },
  warning: { bg: 'linear-gradient(135deg,#78350f,#d97706)', border: '#f59e0b', icon: 'warning'     },
  info:    { bg: 'linear-gradient(135deg,#1e1b4b,#4338ca)', border: '#6366f1', icon: 'info'        },
};

/**
 * Creates the fixed bottom-right toast container if it doesn't exist.
 * @returns {HTMLElement}
 */
function createToastContainer() {
  let container = document.getElementById('smartattend-toast-container');
  if (container) return container;

  container = document.createElement('div');
  container.id = 'smartattend-toast-container';
  container.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:99999;
    display:flex;flex-direction:column;gap:10px;align-items:flex-end;
    pointer-events:none;
  `;
  document.body.appendChild(container);
  return container;
}

/**
 * Creates a toast, appends it to the container, and auto-removes after duration.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration
 * @returns {HTMLElement} the toast element
 */
function toast(message, type = 'info', duration = 3500) {
  const cfg = _TOAST_CFG[type] || _TOAST_CFG.info;
  const container = createToastContainer();

  const el = document.createElement('div');
  el.style.cssText = `
    display:flex;align-items:center;gap:10px;
    min-width:280px;max-width:420px;
    padding:14px 18px;
    background:${cfg.bg};
    border:1px solid ${cfg.border};
    border-radius:14px;
    color:#fff;font-family:'Inter','Outfit',sans-serif;
    font-size:14px;font-weight:500;line-height:1.5;
    box-shadow:0 8px 32px rgba(0,0,0,0.35);
    pointer-events:auto;
    transform:translateX(120%);opacity:0;
    transition:transform 0.38s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;
  `;
  el.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:20px;flex-shrink:0;">${cfg.icon}</span>
    <span style="flex:1;">${message}</span>
    <button
      style="background:none;border:none;color:rgba(255,255,255,0.7);
             cursor:pointer;font-size:18px;line-height:1;padding:0;margin-left:4px;
             display:flex;align-items:center;"
      aria-label="Dismiss"
    >
      <span class="material-symbols-outlined" style="font-size:18px;">close</span>
    </button>
  `;

  const dismiss = () => {
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  };

  const timerId = setTimeout(dismiss, duration);
  el.querySelector('button').addEventListener('click', () => {
    clearTimeout(timerId);
    dismiss();
  });

  container.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });
  });

  return el;
}

/* ============================================================
   LOADING OVERLAY  (DOM manipulation)
   ============================================================ */

/**
 * Creates and shows a full-screen loading overlay.
 * @param {string} message
 * @returns {HTMLElement} the overlay element
 */
function fullLoader(message = 'Loading...') {
  let overlay = document.getElementById('smartattend-full-loader');
  if (overlay) {
    const msg = overlay.querySelector('#smartattend-full-loader-msg');
    if (msg) msg.textContent = message;
    return overlay;
  }

  // Inject spinner keyframes
  if (!document.getElementById('smartattend-loader-style')) {
    const s = document.createElement('style');
    s.id = 'smartattend-loader-style';
    s.textContent = `@keyframes smartattend-spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(s);
  }

  overlay = document.createElement('div');
  overlay.id = 'smartattend-full-loader';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99998;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
    background:rgba(10,10,30,0.72);
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
    opacity:0;transition:opacity 0.25s ease;
  `;
  overlay.innerHTML = `
    <div style="
      width:64px;height:64px;border-radius:50%;
      border:4px solid rgba(99,102,241,0.25);
      border-top-color:#6366f1;
      animation:smartattend-spin 0.9s linear infinite;
    "></div>
    <p id="smartattend-full-loader-msg" style="
      color:#e0e7ff;font-family:'Inter','Outfit',sans-serif;
      font-size:15px;font-weight:500;letter-spacing:0.02em;margin:0;
    ">${message}</p>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => { overlay.style.opacity = '1'; }));
  return overlay;
}

/**
 * Removes the full-screen loading overlay.
 */
function removeLoader() {
  const overlay = document.getElementById('smartattend-full-loader');
  if (!overlay) return;
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 280);
}

/* ============================================================
   CONFIRMATION DIALOG  (returns Promise<boolean>)
   ============================================================ */

/**
 * Shows a glassmorphism confirmation dialog.
 * @param {{ title:string, message:string, confirmLabel?:string, confirmClass?:string, cancelLabel?:string }} opts
 * @returns {Promise<boolean>}
 */
function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmClass = 'destructive',
  cancelLabel = 'Cancel',
} = {}) {
  return new Promise((resolve) => {
    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position:fixed;inset:0;z-index:99997;
      background:rgba(5,5,20,0.65);
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;padding:20px;
      opacity:0;transition:opacity 0.22s ease;
    `;

    const confirmBg =
      confirmClass === 'destructive'
        ? 'linear-gradient(135deg,#991b1b,#dc2626)'
        : 'linear-gradient(135deg,#4F46E5,#6366F1)';
    const confirmShadow =
      confirmClass === 'destructive'
        ? 'rgba(220,38,38,0.35)'
        : 'rgba(99,102,241,0.35)';

    // Dialog card
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background:rgba(17,17,40,0.92);
      border:1px solid rgba(99,102,241,0.25);
      border-radius:24px;
      padding:32px;
      max-width:440px;width:100%;
      box-shadow:0 24px 64px rgba(0,0,0,0.6);
      transform:scale(0.93) translateY(8px);
      transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.22s ease;
      opacity:0;
    `;
    dialog.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:20px;">
        <div style="
          width:44px;height:44px;border-radius:12px;flex-shrink:0;
          background:${confirmClass === 'destructive' ? 'rgba(185,28,28,0.2)' : 'rgba(67,56,202,0.2)'};
          display:flex;align-items:center;justify-content:center;
        ">
          <span class="material-symbols-outlined" style="
            font-size:22px;
            color:${confirmClass === 'destructive' ? '#f87171' : '#818cf8'};
          ">${confirmClass === 'destructive' ? 'delete_forever' : 'help'}</span>
        </div>
        <div>
          <h3 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#f3f4f6;
                     font-family:'Inter','Outfit',sans-serif;">${title}</h3>
          <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;
                    font-family:'Inter','Outfit',sans-serif;">${message}</p>
        </div>
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="sa-dialog-cancel" style="
          height:44px;padding:0 20px;border-radius:9999px;
          border:1.5px solid rgba(99,102,241,0.3);
          color:#a5b4fc;background:rgba(99,102,241,0.06);
          cursor:pointer;font-size:14px;font-weight:600;
          font-family:'Inter','Outfit',sans-serif;
          transition:background 0.18s ease;
        "
        onmouseover="this.style.background='rgba(99,102,241,0.15)';"
        onmouseout="this.style.background='rgba(99,102,241,0.06)';"
        >${cancelLabel}</button>
        <button id="sa-dialog-confirm" style="
          height:44px;padding:0 22px;border-radius:9999px;border:none;
          color:#fff;background:${confirmBg};
          cursor:pointer;font-size:14px;font-weight:600;
          font-family:'Inter','Outfit',sans-serif;
          box-shadow:0 4px 16px ${confirmShadow};
          transition:transform 0.18s ease,box-shadow 0.18s ease;
        "
        onmouseover="this.style.transform='translateY(-1px)';"
        onmouseout="this.style.transform='';"
        >${confirmLabel}</button>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Animate in
    requestAnimationFrame(() => requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      dialog.style.transform = 'scale(1) translateY(0)';
      dialog.style.opacity = '1';
    }));

    const close = (result) => {
      backdrop.style.opacity = '0';
      dialog.style.transform = 'scale(0.93) translateY(8px)';
      dialog.style.opacity = '0';
      setTimeout(() => backdrop.remove(), 280);
      resolve(result);
    };

    dialog.querySelector('#sa-dialog-confirm').addEventListener('click', () => close(true));
    dialog.querySelector('#sa-dialog-cancel').addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });

    // Keyboard: Escape = cancel, Enter = confirm
    const keyHandler = (e) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', keyHandler); close(false); }
      if (e.key === 'Enter')  { document.removeEventListener('keydown', keyHandler); close(true);  }
    };
    document.addEventListener('keydown', keyHandler);
  });
}

/* ============================================================
   PAGINATION  (return HTML string)
   ============================================================ */

/**
 * Renders a Previous/Next + page-number pagination bar.
 * @param {{ currentPage:number, totalPages:number, totalCount:number, limit:number, onPageChange:string }} opts
 * @returns {string} HTML string
 */
function pagination({ currentPage, totalPages, totalCount, limit, onPageChange } = {}) {
  if (!totalPages || totalPages <= 1) return '';

  const from = Math.min((currentPage - 1) * limit + 1, totalCount);
  const to   = Math.min(currentPage * limit, totalCount);

  const btnBase = `
    display:inline-flex;align-items:center;justify-content:center;
    min-width:38px;height:38px;padding:0 10px;border-radius:10px;
    font-size:14px;font-weight:600;cursor:pointer;
    transition:background 0.18s ease,color 0.18s ease;
    font-family:'Inter','Outfit',sans-serif;
  `;

  // Build page number range (show at most 5 pages centered on current)
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    }
  }

  // Insert ellipsis markers
  const pagesWithEllipsis = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) pagesWithEllipsis.push('…');
    pagesWithEllipsis.push(p);
    prev = p;
  }

  const pageButtons = pagesWithEllipsis
    .map((p) => {
      if (p === '…') {
        return `<span style="${btnBase}color:#6b7280;cursor:default;">…</span>`;
      }
      const isActive = p === currentPage;
      return `
        <button
          onclick="${onPageChange}(${p})"
          style="${btnBase}
            ${isActive
              ? 'background:linear-gradient(135deg,#4F46E5,#6366F1);color:#fff;box-shadow:0 2px 10px rgba(99,102,241,0.35);'
              : 'background:rgba(99,102,241,0.06);color:#a5b4fc;border:1.5px solid rgba(99,102,241,0.2);'
            }
          "
          ${isActive ? 'disabled aria-current="page"' : ''}
          aria-label="Page ${p}"
        >${p}</button>
      `;
    })
    .join('');

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return `
    <div style="
      display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
      padding:16px 0;
    ">
      <p style="margin:0;font-size:13px;color:#6b7280;font-family:'Inter','Outfit',sans-serif;">
        Showing <strong style="color:#a5b4fc;">${from}–${to}</strong> of
        <strong style="color:#a5b4fc;">${totalCount}</strong> results
      </p>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <button
          onclick="${!prevDisabled ? `${onPageChange}(${currentPage - 1})` : ''}"
          ${prevDisabled ? 'disabled' : ''}
          style="${btnBase}
            background:rgba(99,102,241,0.06);
            color:${prevDisabled ? '#374151' : '#a5b4fc'};
            border:1.5px solid ${prevDisabled ? 'rgba(55,65,81,0.3)' : 'rgba(99,102,241,0.2)'};
            ${prevDisabled ? 'cursor:not-allowed;' : ''}
          "
          aria-label="Previous page"
        >
          <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
        </button>

        ${pageButtons}

        <button
          onclick="${!nextDisabled ? `${onPageChange}(${currentPage + 1})` : ''}"
          ${nextDisabled ? 'disabled' : ''}
          style="${btnBase}
            background:rgba(99,102,241,0.06);
            color:${nextDisabled ? '#374151' : '#a5b4fc'};
            border:1.5px solid ${nextDisabled ? 'rgba(55,65,81,0.3)' : 'rgba(99,102,241,0.2)'};
            ${nextDisabled ? 'cursor:not-allowed;' : ''}
          "
          aria-label="Next page"
        >
          <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
        </button>
      </div>
    </div>
  `.trim();
}

/* ============================================================
   SEARCH BAR  (return HTML string)
   ============================================================ */

/**
 * Styled search bar with search icon and clear button.
 * @param {{ placeholder:string, id:string, value?:string }} opts
 * @returns {string} HTML string
 */
function searchBar({ placeholder, id, value = '' } = {}) {
  const clearVisible = value ? '' : 'display:none;';
  return `
    <div style="position:relative;display:flex;align-items:center;width:100%;">
      <span class="material-symbols-outlined" style="
        position:absolute;left:16px;top:50%;transform:translateY(-50%);
        font-size:20px;color:#6b7280;pointer-events:none;
      ">search</span>
      <input
        id="${id}"
        type="text"
        placeholder="${placeholder}"
        value="${value}"
        autocomplete="off"
        style="
          width:100%;height:48px;
          padding:0 48px 0 48px;
          background:rgba(99,102,241,0.06);
          border:1.5px solid rgba(99,102,241,0.2);
          border-radius:14px;
          color:#e5e7eb;
          font-size:14px;font-family:'Inter','Outfit',sans-serif;
          outline:none;transition:border-color 0.18s ease,box-shadow 0.18s ease;
          box-sizing:border-box;
        "
        onfocus="this.style.borderColor='rgba(99,102,241,0.7)';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)';"
        onblur="this.style.borderColor='rgba(99,102,241,0.2)';this.style.boxShadow='';"
        oninput="
          var c=document.getElementById('${id}-clear');
          if(c){c.style.display=this.value?'flex':'none';}
        "
      />
      <button
        id="${id}-clear"
        type="button"
        aria-label="Clear search"
        style="
          position:absolute;right:12px;top:50%;transform:translateY(-50%);
          ${clearVisible}
          background:rgba(99,102,241,0.12);border:none;
          width:28px;height:28px;border-radius:50%;
          align-items:center;justify-content:center;
          cursor:pointer;color:#a5b4fc;transition:background 0.15s ease;
        "
        onmouseover="this.style.background='rgba(99,102,241,0.22)';"
        onmouseout="this.style.background='rgba(99,102,241,0.12)';"
        onclick="
          var inp=document.getElementById('${id}');
          if(inp){inp.value='';inp.dispatchEvent(new Event('input'));}
          this.style.display='none';
        "
      >
        <span class="material-symbols-outlined" style="font-size:16px;">close</span>
      </button>
    </div>
  `.trim();
}

/* ============================================================
   EMPTY STATE  (return HTML string)
   ============================================================ */

/**
 * Centered empty-state with icon, title, subtitle, optional action.
 * @param {{ icon:string, title:string, subtitle?:string, actionLabel?:string|null, actionId?:string|null }} opts
 * @returns {string} HTML string
 */
function emptyState({ icon, title, subtitle = '', actionLabel = null, actionId = null } = {}) {
  const actionHtml =
    actionLabel && actionId
      ? primaryBtn({ label: actionLabel, id: actionId })
      : '';

  return `
    <div style="
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:64px 24px;text-align:center;gap:16px;
    ">
      <div style="
        width:72px;height:72px;border-radius:22px;
        background:rgba(99,102,241,0.1);
        border:1px solid rgba(99,102,241,0.2);
        display:flex;align-items:center;justify-content:center;
        margin-bottom:4px;
      ">
        <span class="material-symbols-outlined" style="font-size:34px;color:#818cf8;">${icon}</span>
      </div>
      <h3 style="
        margin:0;font-size:18px;font-weight:700;color:#e5e7eb;
        font-family:'Inter','Outfit',sans-serif;
      ">${title}</h3>
      ${subtitle ? `<p style="margin:0;font-size:14px;color:#6b7280;max-width:360px;line-height:1.6;font-family:'Inter','Outfit',sans-serif;">${subtitle}</p>` : ''}
      ${actionHtml ? `<div style="margin-top:8px;">${actionHtml}</div>` : ''}
    </div>
  `.trim();
}

/* ============================================================
   TABLE  (return HTML string)
   ============================================================ */

/**
 * Full desktop data table with sticky header and hover rows.
 * @param {{ headers:Array<{label:string,key:string,class?:string}>, rows:Array<Object>, id?:string, emptyMessage?:string }} opts
 * @returns {string} HTML string
 */
function dataTable({ headers = [], rows = [], id = '', emptyMessage = 'No data found' } = {}) {
  const idAttr = id ? `id="${id}"` : '';

  const thead = headers
    .map(
      (h) => `
    <th scope="col" class="${h.class || ''}" style="
      padding:14px 20px;text-align:left;font-size:11px;
      font-weight:700;color:#6b7280;text-transform:uppercase;
      letter-spacing:0.08em;white-space:nowrap;
      border-bottom:1px solid rgba(99,102,241,0.12);
      background:rgba(10,10,30,0.6);
    ">${h.label}</th>
  `
    )
    .join('');

  if (!rows.length) {
    return `
      <div ${idAttr} class="bg-surface-container-lowest" style="
        border-radius:24px;border:1px solid rgba(99,102,241,0.15);
        overflow:hidden;
      ">
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>${thead}</tr></thead>
          </table>
        </div>
        ${emptyState({ icon: 'table_rows', title: emptyMessage })}
      </div>
    `.trim();
  }

  const tbody = rows
    .map(
      (row) => `
    <tr style="
      border-bottom:1px solid rgba(99,102,241,0.07);
      transition:background 0.15s ease;
    "
    onmouseover="this.style.background='rgba(99,102,241,0.06)';"
    onmouseout="this.style.background='';"
    >
      ${headers
        .map(
          (h) => `
        <td class="${h.class || ''}" style="
          padding:14px 20px;font-size:14px;color:#d1d5db;
          font-family:'Inter','Outfit',sans-serif;
        ">${row[h.key] !== undefined && row[h.key] !== null ? row[h.key] : '—'}</td>
      `
        )
        .join('')}
    </tr>
  `
    )
    .join('');

  return `
    <div ${idAttr} class="bg-surface-container-lowest" style="
      border-radius:24px;border:1px solid rgba(99,102,241,0.15);
      overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.18);
    ">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </div>
  `.trim();
}

/**
 * Mobile reflow card for a single table row.
 * @param {{ data:Array<{label:string,value:string}>, actions?:Array<{label:string,onclick:string,type?:string}> }} opts
 * @returns {string} HTML string
 */
function mobileCard({ data = [], actions = [] } = {}) {
  const rows = data
    .map(
      (d) => `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:10px 0;border-bottom:1px solid rgba(99,102,241,0.08);">
      <span style="font-size:12px;color:#6b7280;font-weight:600;
                   text-transform:uppercase;letter-spacing:0.06em;">${d.label}</span>
      <span style="font-size:14px;color:#e5e7eb;font-weight:500;text-align:right;">${d.value}</span>
    </div>
  `
    )
    .join('');

  const actionBtns = actions
    .map((a) => {
      if (a.type === 'destructive') return destructiveBtn({ label: a.label, onclick: a.onclick });
      if (a.type === 'secondary')   return secondaryBtn({ label: a.label, onclick: a.onclick });
      return primaryBtn({ label: a.label, onclick: a.onclick });
    })
    .join('');

  return `
    <div class="bg-surface-container-lowest" style="
      border-radius:18px;border:1px solid rgba(99,102,241,0.15);
      padding:18px;margin-bottom:12px;
      box-shadow:0 2px 12px rgba(0,0,0,0.15);
    ">
      ${rows}
      ${actions.length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">${actionBtns}</div>` : ''}
    </div>
  `.trim();
}

/* ============================================================
   FORM COMPONENTS  (return HTML string)
   ============================================================ */

/**
 * Wraps a label, input HTML, and optional error message.
 * @param {{ label:string, inputHtml:string, error?:string|null, required?:boolean }} opts
 * @returns {string} HTML string
 */
function formGroup({ label, inputHtml, error = null, required = false } = {}) {
  const req = required ? `<span style="color:#f87171;margin-left:2px;" aria-hidden="true">*</span>` : '';
  const errHtml = error
    ? `<p role="alert" style="
        margin:6px 0 0;font-size:12px;color:#f87171;
        display:flex;align-items:center;gap:4px;
        font-family:'Inter','Outfit',sans-serif;
      ">
        <span class="material-symbols-outlined" style="font-size:14px;">error</span>
        ${error}
      </p>`
    : '';

  return `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <label style="
        font-size:13px;font-weight:600;color:#9ca3af;
        font-family:'Inter','Outfit',sans-serif;
        display:flex;align-items:center;gap:2px;
      ">${label}${req}</label>
      ${inputHtml}
      ${errHtml}
    </div>
  `.trim();
}

/**
 * Styled select dropdown.
 * @param {{ id:string, name:string, options:Array<{value:string,label:string}>, value?:string, placeholder?:string }} opts
 * @returns {string} HTML string
 */
function selectInput({ id, name, options = [], value = '', placeholder = 'Select...' } = {}) {
  const optionsHtml = [
    `<option value="" disabled ${!value ? 'selected' : ''} style="color:#6b7280;">${placeholder}</option>`,
    ...options.map(
      (o) =>
        `<option value="${o.value}" ${o.value === value ? 'selected' : ''} style="background:#1a1a3e;color:#e5e7eb;">${o.label}</option>`
    ),
  ].join('');

  return `
    <div style="position:relative;display:flex;align-items:center;">
      <select
        id="${id}"
        name="${name}"
        style="
          width:100%;height:48px;padding:0 44px 0 16px;
          background:rgba(99,102,241,0.06);
          border:1.5px solid rgba(99,102,241,0.2);
          border-radius:14px;
          color:${value ? '#e5e7eb' : '#6b7280'};
          font-size:14px;font-family:'Inter','Outfit',sans-serif;
          cursor:pointer;appearance:none;-webkit-appearance:none;
          outline:none;
          transition:border-color 0.18s ease,box-shadow 0.18s ease;
          box-sizing:border-box;
        "
        onfocus="this.style.borderColor='rgba(99,102,241,0.7)';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)';"
        onblur="this.style.borderColor='rgba(99,102,241,0.2)';this.style.boxShadow='';"
        onchange="this.style.color='#e5e7eb';"
      >${optionsHtml}</select>
      <span class="material-symbols-outlined" style="
        position:absolute;right:14px;top:50%;transform:translateY(-50%);
        font-size:20px;color:#6b7280;pointer-events:none;
      ">expand_more</span>
    </div>
  `.trim();
}

/**
 * Styled text input with optional leading icon.
 * @param {{ id:string, name:string, type?:string, placeholder:string, value?:string, icon?:string|null, required?:boolean }} opts
 * @returns {string} HTML string
 */
function textInput({ id, name, type = 'text', placeholder, value = '', icon = null, required = false } = {}) {
  const paddingLeft = icon ? '48px' : '16px';
  const iconHtml = icon
    ? `<span class="material-symbols-outlined" style="
        position:absolute;left:14px;top:50%;transform:translateY(-50%);
        font-size:20px;color:#6b7280;pointer-events:none;
      ">${icon}</span>`
    : '';
  return `
    <div style="position:relative;display:flex;align-items:center;">
      ${iconHtml}
      <input
        id="${id}"
        name="${name}"
        type="${type}"
        placeholder="${placeholder}"
        value="${value}"
        ${required ? 'required' : ''}
        autocomplete="off"
        style="
          width:100%;height:48px;
          padding:0 16px 0 ${paddingLeft};
          background:rgba(99,102,241,0.06);
          border:1.5px solid rgba(99,102,241,0.2);
          border-radius:14px;
          color:#e5e7eb;
          font-size:14px;font-family:'Inter','Outfit',sans-serif;
          outline:none;
          transition:border-color 0.18s ease,box-shadow 0.18s ease;
          box-sizing:border-box;
        "
        onfocus="this.style.borderColor='rgba(99,102,241,0.7)';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)';"
        onblur="this.style.borderColor='rgba(99,102,241,0.2)';this.style.boxShadow='';"
      />
    </div>
  `.trim();
}

/* ============================================================
   EXPORTS — attach to window for global access
   ============================================================ */
window.components = {
  // Buttons
  primaryBtn,
  secondaryBtn,
  destructiveBtn,
  iconBtn,

  // Badge
  badge,

  // Cards
  statCard,
  actionCard,

  // Toast
  createToastContainer,
  toast,

  // Loader
  fullLoader,
  removeLoader,

  // Dialog
  confirmDialog,

  // Pagination
  pagination,

  // Search
  searchBar,

  // Empty state
  emptyState,

  // Table
  dataTable,
  mobileCard,

  // Form
  formGroup,
  selectInput,
  textInput,
};
