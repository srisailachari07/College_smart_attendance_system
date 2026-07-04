/**
 * summary.js — Attendance Summary Module
 *
 * Provides business helpers to query the attendance_summary table.
 * Contains methods to ensure summary rows, fetch hall statistics,
 * and identify students falling below required thresholds.
 */

import { api } from './api.js';

/**
 * Fetch the attendance summary for a single student.
 *
 * @param {string} studentId — Student UUID
 * @returns {Promise<object|null>} Summary row details
 */
export async function getSummary(studentId) {
  try {
    const { data, error } = await api.Summary.findByStudent(studentId);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`[SmartAttend Summary] Error getting summary for student ${studentId}:`, err);
    return null;
  }
}

/**
 * Ensures that a row exists in the attendance_summary table for the given student.
 * If not, inserts a seed row with 0 present and 0 absent counts.
 * Call this immediately after registering a student.
 *
 * @param {string} studentId — Student UUID
 * @returns {Promise<object>} The active summary row
 */
export async function ensureSummaryRow(studentId) {
  try {
    const { data, error } = await api.Summary.ensure(studentId);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`[SmartAttend Summary] Error ensuring summary row for student ${studentId}:`, err);
    throw err;
  }
}

/**
 * Get summaries for all students assigned to a specific lecture hall.
 * Returns joined student profiles + summaries.
 *
 * @param {string} hall
 * @returns {Promise<object[]>} Array of records
 */
export async function getSummariesByHall(hall) {
  try {
    const { data, error } = await api.Summary.byHall(hall);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[SmartAttend Summary] Error getting summaries for hall ${hall}:`, err);
    return [];
  }
}

/**
 * Get paginated summaries with min/max percentage filters.
 *
 * @param {{ hall?: string, minPct?: number, maxPct?: number, page?: number, limit?: number }} filters
 * @returns {Promise<{ summaries: object[], count: number }>}
 */
export async function getAllSummaries(filters = {}) {
  try {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const { data: list, error: listError } = await api.Summary.all({
      hall: filters.hall,
      minPct: filters.minPct,
      maxPct: filters.maxPct,
      page,
      limit,
    });
    if (listError) throw listError;

    // Count is determined from total student count under same filters
    const { data: count, error: countError } = await api.Students.count({
      hall: filters.hall,
      isActive: true,
    });
    if (countError) throw countError;

    return {
      summaries: list || [],
      count: count || 0,
    };
  } catch (err) {
    console.error('[SmartAttend Summary] Error getting all summaries:', err);
    return { summaries: [], count: 0 };
  }
}

/**
 * Find all students below the low attendance percentage threshold.
 * Used for admin dashboard warnings and low-attendance exports.
 *
 * @param {number} threshold — e.g. 75
 * @param {string|null} hall — optional lecture hall filter
 * @returns {Promise<object[]>}
 */
export async function getBelowThreshold(threshold, hall = null) {
  try {
    const { data, error } = await api.Summary.belowThreshold(threshold, hall);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[SmartAttend Summary] Error getting students below threshold (${threshold}%):`, err);
    return [];
  }
}

// Global attachment for window availability in standard scripts
window.summary = {
  getSummary,
  ensureSummaryRow,
  getSummariesByHall,
  getAllSummaries,
  getBelowThreshold,
};
