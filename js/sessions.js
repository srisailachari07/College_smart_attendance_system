/**
 * sessions.js — Attendance Session Lifecycle Management
 *
 * Implements session startup, code generation, code refresh, and closure.
 * Enforces the core rule: code refresh updates the active code ONLY and
 * does not alter the authoritative database end_time (Mandatory M1).
 */

import { api } from './api.js?v=2.2';
import { audit } from './audit.js?v=2.2';
import { getSetting, generateCode } from './utils.js?v=2.2';

export async function startSession({ label, hall, facultyId } = {}) {
  try {
    // 1. Fetch current attendance window from system settings (fallback to 300 seconds)
    const windowSetting = await getSetting('attendance_window');
    const windowSeconds = parseInt(windowSetting || '300', 10) || 300;

    // 2. Call API create (which calls create_attendance_session RPC)
    const { data: session, error } = await api.Sessions.create({
      lecture_hall: hall,
      session_label: label,
      faculty_id: facultyId,
      window_seconds: windowSeconds,
    });

    if (error) throw error;
    return session;
  } catch (err) {
    console.error('[SmartAttend Sessions] Error starting session:', err);
    throw err;
  }
}

/**
 * Look up the currently active, unexpired session for a lecture hall.
 *
 * @param {string} hall
 * @returns {Promise<object|null>} Active session or null
 */
export async function getActiveSession(hall) {
  try {
    const { data, error } = await api.Sessions.findActive(hall);
    if (error || !data) return null;
    
    // Safety check: ensure local time hasn't passed end_time
    if (new Date(data.end_time) <= new Date()) {
      // Session has expired based on current time — trigger auto-close
      await closeSession(data.id);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error(`[SmartAttend Sessions] Error fetching active session for hall ${hall}:`, err);
    return null;
  }
}

/**
 * Regenerate the 4-digit attendance code for a session.
 * CRITICAL (Mandatory M1): updates the code field ONLY. The original
 * session end_time remains unchanged to prevent unauthorized extension.
 * Logs the event.
 *
 * @param {string} sessionId — UUID
 * @returns {Promise<string>} The newly generated 4-digit code
 */
export async function refreshCode(sessionId) {
  try {
    // Calling updateCode now calls the DB RPC which performs all validation and updates code.
    const { data, error } = await api.Sessions.updateCode(sessionId);
    if (error) throw error;
    return data.attendance_code;
  } catch (err) {
    console.error(`[SmartAttend Sessions] Error refreshing code for session ${sessionId}:`, err);
    throw err;
  }
}

/**
 * Close an active session manually.
 * Invokes the close_session_and_mark_absent PostgreSQL RPC function
 * which atomically updates status to closed, generates absentees,
 * re-computes summary records, and writes logs.
 * Logs the event.
 *
 * @param {string} sessionId — UUID
 * @returns {Promise<object>} Status report containing success and absent_marked count
 */
export async function closeSession(sessionId) {
  try {
    // Invoke database RPC which handles closure atomically
    const { data: report, error } = await api.RPC.closeSession(sessionId);
    if (error) throw error;

    // Fetch session details to compile audit details
    const { data: session } = await api.Sessions.findById(sessionId);
    const presentCount = session ? await getPresentCount(sessionId) : 0;
    const absentCount = report?.absent_marked || 0;

    // Log session closure
    await audit.log({
      action: 'SESSION_CLOSED',
      targetType: 'session',
      targetId: sessionId,
      details: {
        session_label: session?.session_label,
        lecture_hall: session?.lecture_hall,
        present_count: presentCount,
        absent_count: absentCount,
      },
    });

    return report;
  } catch (err) {
    console.error(`[SmartAttend Sessions] Error closing session ${sessionId}:`, err);
    throw err;
  }
}

/**
 * Helper to fetch number of present students in a session.
 */
async function getPresentCount(sessionId) {
  try {
    const { data: records } = await api.Records.bySession(sessionId);
    if (!records) return 0;
    return records.filter(r => r.status === 'P').length;
  } catch (err) {
    return 0;
  }
}

/**
 * Compiles a visual dashboard overview for a session.
 * Returns statistics (Present, Absent, Total) and the scroll list of student check-ins.
 *
 * @param {string} sessionId — UUID
 * @returns {Promise<{ present: number, absent: number, total: number, rollCall: object[] }>}
 */
export async function getSessionSummary(sessionId) {
  try {
    const { data: records, error } = await api.Records.bySession(sessionId);
    if (error) throw error;

    const rollCall = [];
    let present = 0;
    let absent = 0;

    if (records) {
      records.forEach(rec => {
        const studentInfo = rec.students || {};
        if (rec.status === 'P') present++;
        if (rec.status === 'A') absent++;

        rollCall.push({
          record_id: rec.id,
          student_id: studentInfo.student_id,
          student_name: studentInfo.student_name,
          roll_number: studentInfo.roll_number,
          status: rec.status,
          marked_at: rec.marked_at,
        });
      });
    }

    return {
      present,
      absent,
      total: present + absent,
      rollCall: rollCall.sort((a, b) => new Date(b.marked_at) - new Date(a.marked_at)), // newest first
    };
  } catch (err) {
    console.error(`[SmartAttend Sessions] Error getting session summaries for ${sessionId}:`, err);
    return { present: 0, absent: 0, total: 0, rollCall: [] };
  }
}

/**
 * Sets up a client-side timer to trigger close action when session end_time is reached.
 * Note: This is an informational convenience helper for the UI.
 * Database validation against end_time remains the ultimate authority (A3).
 *
 * @param {object} session — Session record containing end_time
 * @param {function} onExpireCallback — Triggered when timer expires
 * @returns {number|null} Timer ID for clearTimeout
 */
export function startAutoCloseTimer(session, onExpireCallback) {
  if (!session || !session.end_time) return null;

  const msRemaining = new Date(session.end_time).getTime() - Date.now();

  if (msRemaining <= 0) {
    // Session is already past its expiration time
    closeSession(session.id).then(() => {
      if (onExpireCallback) onExpireCallback();
    }).catch(err => console.error(err));
    return null;
  }

  // Visual/convenience triggers close once timer elapses
  const timerId = setTimeout(async () => {
    try {
      await closeSession(session.id);
      if (onExpireCallback) onExpireCallback();
    } catch (err) {
      console.error('[SmartAttend Sessions] Auto close timer execution error:', err);
    }
  }, msRemaining);

  return timerId;
}

/**
 * Find any active session for a specific faculty member.
 * Used for session recovery.
 *
 * @param {string} facultyId — UUID
 * @returns {Promise<object|null>} Active session or null
 */
export async function getActiveSessionForFaculty(facultyId) {
  try {
    const { data, error } = await api.Sessions.findActiveForFaculty(facultyId);
    if (error || !data) return null;
    
    // Safety check: ensure local time hasn't passed end_time
    if (new Date(data.end_time) <= new Date()) {
      await closeSession(data.id);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error(`[SmartAttend Sessions] Error fetching active session for faculty ${facultyId}:`, err);
    return null;
  }
}

// Global window registration
window.sessions = {
  startSession,
  getActiveSession,
  getActiveSessionForFaculty,
  refreshCode,
  closeSession,
  getSessionSummary,
  startAutoCloseTimer,
};
