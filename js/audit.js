/**
 * audit.js — Audit Logging Module
 *
 * Centralized audit trail for all state-changing operations.
 * Every significant action in SmartAttend is logged here.
 *
 * 14 Logged Actions:
 *   STUDENT_REGISTERED, FACULTY_LOGIN, ADMIN_LOGIN,
 *   SESSION_STARTED, CODE_REFRESHED, SESSION_CLOSED,
 *   ATTENDANCE_MARKED, STUDENT_ATTENDANCE_REJECTED,
 *   STUDENT_UPDATED, STUDENT_DEACTIVATED,
 *   FACULTY_UPDATED, REPORT_GENERATED,
 *   SETTING_UPDATED, BACKUP_CREATED
 *
 * Note: ATTENDANCE_MARKED and STUDENT_ATTENDANCE_REJECTED are logged
 *       inside the mark_attendance() PostgreSQL RPC function — not here.
 *       All other events are logged from JavaScript.
 */

import api from './api.js';
import auth from './auth.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical action keys used throughout the codebase.
 * Always reference these constants instead of raw strings to avoid typos.
 */
const AUDIT_ACTIONS = {
  STUDENT_REGISTERED:           'STUDENT_REGISTERED',
  FACULTY_LOGIN:                'FACULTY_LOGIN',
  ADMIN_LOGIN:                  'ADMIN_LOGIN',
  SESSION_STARTED:              'SESSION_STARTED',
  CODE_REFRESHED:               'CODE_REFRESHED',
  SESSION_CLOSED:               'SESSION_CLOSED',
  ATTENDANCE_MARKED:            'ATTENDANCE_MARKED',           // Written by DB RPC
  STUDENT_ATTENDANCE_REJECTED:  'STUDENT_ATTENDANCE_REJECTED', // Written by DB RPC
  STUDENT_UPDATED:              'STUDENT_UPDATED',
  STUDENT_DEACTIVATED:          'STUDENT_DEACTIVATED',
  FACULTY_UPDATED:              'FACULTY_UPDATED',
  REPORT_GENERATED:             'REPORT_GENERATED',
  SETTING_UPDATED:              'SETTING_UPDATED',
  BACKUP_CREATED:               'BACKUP_CREATED',
};

/**
 * Human-readable labels for each audit action — used in the UI audit log table.
 */
const ACTION_LABELS = {
  STUDENT_REGISTERED:           'Student Registered',
  FACULTY_LOGIN:                'Faculty Login',
  ADMIN_LOGIN:                  'Admin Login',
  SESSION_STARTED:              'Session Started',
  CODE_REFRESHED:               'Code Refreshed',
  SESSION_CLOSED:               'Session Closed',
  ATTENDANCE_MARKED:            'Attendance Marked',
  STUDENT_ATTENDANCE_REJECTED:  'Attendance Rejected',
  STUDENT_UPDATED:              'Student Updated',
  STUDENT_DEACTIVATED:          'Student Deactivated',
  FACULTY_UPDATED:              'Faculty Updated',
  REPORT_GENERATED:             'Report Generated',
  SETTING_UPDATED:              'Setting Updated',
  BACKUP_CREATED:               'Backup Created',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely resolves the currently authenticated user.
 * Falls back to a "system" actor when no session is present
 * (e.g. automated background tasks or pre-login actions).
 *
 * @returns {{ id: string|null, role: string, name: string }}
 */
async function _resolveActor() {
  try {
    const user = await auth.getCurrentUser();

    if (!user) {
      return { id: null, role: 'system', name: 'System' };
    }

    // Normalise across different user-object shapes the app may produce.
    const id   = user.id   ?? user.user_id   ?? null;
    const role = user.role ?? user.user_role  ?? 'unknown';

    // Prefer a display name, fall back through common fields.
    const name =
      user.name          ??
      user.full_name     ??
      user.display_name  ??
      user.email         ??
      'Unknown';

    return { id, role, name };
  } catch (_err) {
    // auth module itself threw — degrade gracefully.
    return { id: null, role: 'system', name: 'System' };
  }
}

/**
 * Formats a raw JSONB details object into a concise human-readable string.
 * Handles nested objects up to one level deep.
 *
 * @param {object|null|undefined} details
 * @returns {string}
 */
function _formatDetails(details) {
  if (!details || typeof details !== 'object') {
    return details != null ? String(details) : '—';
  }

  const parts = Object.entries(details)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => {
      const label = k
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      if (typeof v === 'object' && !Array.isArray(v)) {
        // Flatten one level of nesting: { old: 'A', new: 'B' } → "A → B"
        const nested = Object.values(v).join(' → ');
        return `${label}: ${nested}`;
      }

      if (Array.isArray(v)) {
        return `${label}: [${v.join(', ')}]`;
      }

      return `${label}: ${v}`;
    });

  return parts.length > 0 ? parts.join(' | ') : '—';
}

/**
 * Returns the current UTC timestamp in ISO-8601 format.
 * Used as the `created_at` field when inserting audit rows.
 *
 * @returns {string}
 */
function _nowISO() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Core audit object
// ---------------------------------------------------------------------------

const audit = {
  // -------------------------------------------------------------------------
  // log()
  // -------------------------------------------------------------------------

  /**
   * Records a single audit event.
   *
   * This function is intentionally resilient — any failure inside it is
   * swallowed and warned about rather than propagated, so that a logging
   * problem can never crash the calling feature.
   *
   * @param {object}      params
   * @param {string}      params.action      - One of AUDIT_ACTIONS.*
   * @param {string|null} [params.targetType] - Entity type affected (e.g. 'student', 'session')
   * @param {string|null} [params.targetId]   - Primary key / identifier of the affected entity
   * @param {object}      [params.details]    - Arbitrary metadata stored as JSONB
   *
   * @returns {Promise<void>}
   */
  async log({ action, targetType = null, targetId = null, details = {} }) {
    try {
      // Validate action early so we catch programmer mistakes during development.
      if (!action || typeof action !== 'string') {
        console.warn('[audit] log() called without a valid action string — skipping.');
        return;
      }

      if (!Object.values(AUDIT_ACTIONS).includes(action)) {
        console.warn(`[audit] Unknown action "${action}" — logging anyway but verify the constant.`);
      }

      // Resolve who is performing this action.
      const actor = await _resolveActor();

      const payload = {
        action,
        actor_id:    actor.id,
        actor_role:  actor.role,
        actor_name:  actor.name,
        target_type: targetType,
        target_id:   targetId != null ? String(targetId) : null,
        details:     details && typeof details === 'object' ? details : {},
        created_at:  _nowISO(),
      };

      await api.Audit.insert(payload);
    } catch (err) {
      // Audit failures must never surface to the user.
      console.warn('[audit] Failed to write audit log entry:', err?.message ?? err);
    }
  },

  // -------------------------------------------------------------------------
  // getLogs()
  // -------------------------------------------------------------------------

  /**
   * Retrieves paginated audit log entries with optional filters.
   *
   * @param {object}      [params]
   * @param {string|null} [params.action]     - Filter by action type
   * @param {string|null} [params.actorRole]  - Filter by actor role ('admin', 'faculty', 'system')
   * @param {string|null} [params.from]       - ISO date string — entries on/after this date
   * @param {string|null} [params.to]         - ISO date string — entries on/before this date
   * @param {number}      [params.page=1]     - 1-based page number
   * @param {number}      [params.limit=100]  - Rows per page (capped by server policy)
   *
   * @returns {Promise<{ data: object[], count: number, error: Error|null }>}
   */
  async getLogs({
    action    = null,
    actorRole = null,
    from      = null,
    to        = null,
    page      = 1,
    limit     = 100,
  } = {}) {
    try {
      // Sanitise pagination inputs.
      const safePage  = Number.isInteger(page)  && page  > 0 ? page  : 1;
      const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 100;

      const filters = {
        action:     action     ?? undefined,
        actor_role: actorRole  ?? undefined,
        from:       from       ?? undefined,
        to:         to         ?? undefined,
        page:       safePage,
        limit:      safeLimit,
      };

      // Remove undefined keys so the API layer doesn't receive spurious params.
      Object.keys(filters).forEach((k) => {
        if (filters[k] === undefined) delete filters[k];
      });

      const result = await api.Audit.list(filters);

      return {
        data:  Array.isArray(result?.data)  ? result.data  : [],
        count: typeof result?.count === 'number' ? result.count : 0,
        error: result?.error ?? null,
      };
    } catch (err) {
      console.warn('[audit] getLogs() encountered an error:', err?.message ?? err);
      return { data: [], count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // -------------------------------------------------------------------------
  // formatLogForDisplay()
  // -------------------------------------------------------------------------

  /**
   * Transforms a raw audit log row (as returned by getLogs) into a
   * display-ready object suitable for rendering in the UI audit table.
   *
   * @param {object} log - A single audit log row from the database
   * @returns {{
   *   timestamp: string,
   *   actor:     string,
   *   action:    string,
   *   target:    string,
   *   details:   string,
   * }}
   */
  formatLogForDisplay(log) {
    if (!log || typeof log !== 'object') {
      return {
        timestamp: '—',
        actor:     '—',
        action:    '—',
        target:    '—',
        details:   '—',
      };
    }

    // --- timestamp -----------------------------------------------------------
    let timestamp = '—';
    const rawTs = log.created_at ?? log.timestamp ?? null;
    if (rawTs) {
      try {
        const d = new Date(rawTs);
        if (!isNaN(d.getTime())) {
          // Format: "02 Jul 2026, 14:59" in local time.
          timestamp = d.toLocaleString('en-IN', {
            day:    '2-digit',
            month:  'short',
            year:   'numeric',
            hour:   '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        }
      } catch (_) {
        timestamp = String(rawTs);
      }
    }

    // --- actor ---------------------------------------------------------------
    const actorName = log.actor_name ?? 'Unknown';
    const actorRole = log.actor_role ?? '';
    const actor = actorRole
      ? `${actorName} [${actorRole.charAt(0).toUpperCase() + actorRole.slice(1)}]`
      : actorName;

    // --- action --------------------------------------------------------------
    const actionKey = log.action ?? '';
    const action    = ACTION_LABELS[actionKey] ?? actionKey ?? '—';

    // --- target --------------------------------------------------------------
    let target = '—';
    const targetType = log.target_type ?? null;
    const targetId   = log.target_id   ?? null;

    if (targetType && targetId) {
      const typeLabel = targetType.charAt(0).toUpperCase() + targetType.slice(1);
      target = `${typeLabel} #${targetId}`;
    } else if (targetType) {
      target = targetType.charAt(0).toUpperCase() + targetType.slice(1);
    } else if (targetId) {
      target = `#${targetId}`;
    }

    // --- details -------------------------------------------------------------
    const rawDetails = log.details ?? log.metadata ?? null;
    let details = '—';
    if (rawDetails !== null && rawDetails !== undefined) {
      if (typeof rawDetails === 'string') {
        // Some backends serialize JSONB as a string — try to parse first.
        try {
          details = _formatDetails(JSON.parse(rawDetails));
        } catch (_) {
          details = rawDetails || '—';
        }
      } else {
        details = _formatDetails(rawDetails);
      }
    }

    return { timestamp, actor, action, target, details };
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { audit, AUDIT_ACTIONS, ACTION_LABELS };
export default audit;
