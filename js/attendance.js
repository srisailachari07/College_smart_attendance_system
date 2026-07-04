/**
 * attendance.js — Attendance Validation & Recording Interface
 *
 * This module connects the frontend to the database RPC for student attendance.
 * All core validation rules (mobile registry, active status, session active,
 * time window expiration, code matching, duplicate protection) are executed
 * securely inside the PostgreSQL RPC function 'mark_attendance'.
 *
 * This JavaScript wrapper calls that RPC and returns user-friendly results.
 */

import { api } from './api.js';

/**
 * Submit student mobile number and session code to mark attendance.
 * Executes completely on the server-side via the mark_attendance database function.
 *
 * Throws a clean, user-facing error message if validation fails.
 *
 * @param {string} rollNumber — Student's University Roll Number
 * @param {string} code — 4-digit numeric code entered by student
 * @param {string} deviceHash — 32-character SHA-256 browser hardware fingerprint
 * @returns {Promise<{
 *   success: boolean,
 *   roll_number: string,
 *   student_name: string,
 *   lecture_hall: string,
 *   session_label: string,
 *   session_date: string,
 *   marked_at: string
 * }>} Success payload
 */
export async function markAttendance(rollNumber, code, deviceHash) {
  try {
    // Call the database validation and execution RPC engine
    const { data, error } = await api.RPC.markAttendance(rollNumber, code, deviceHash);

    // Network or server-level connectivity error (not a validation rejection)
    if (error) {
      console.error('[SmartAttend Attendance] Network/Server DB Error:', error);
      throw new Error('Unable to connect to the server. Please try again.');
    }

    // Business validation rejected inside the database (wrong code, expired session, duplicate, etc.)
    if (!data || !data.success) {
      const errMsg = data?.message || 'Verification failed. Please check details and try again.';
      console.warn(`[SmartAttend Attendance] Submission rejected: ${errMsg} (Code: ${data?.error_code})`);
      throw new Error(errMsg);
    }

    // Success! Return success payload
    return data;
  } catch (err) {
    // Bubble up user-friendly error messages
    throw err;
  }
}

/**
 * Fetch the live roll call of present/absent students for a session.
 * Used by faculty members in the active session viewport.
 *
 * @param {string} sessionId — UUID
 * @returns {Promise<object[]>} List of records joined with student details
 */
export async function getAttendanceBySession(sessionId) {
  try {
    const { data, error } = await api.Records.bySession(sessionId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[SmartAttend Attendance] Error fetching session records for ${sessionId}:`, err);
    return [];
  }
}

/**
 * Retrieve a specific student's attendance records within a date range.
 *
 * @param {string} studentId — UUID
 * @param {{ from?: string, to?: string }} options
 * @returns {Promise<object[]>} Array of records
 */
export async function getStudentHistory(studentId, { from, to } = {}) {
  try {
    const { data, error } = await api.Records.byStudent(studentId, from, to);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[SmartAttend Attendance] Error fetching history for student ${studentId}:`, err);
    return [];
  }
}

// Global attachment for script compatibility
window.attendance = {
  markAttendance,
  getAttendanceBySession,
  getStudentHistory,
};
