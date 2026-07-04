/**
 * reports.js — Core Queries & Data Structuring for Reporting Engine
 *
 * Implements 5 structured reports:
 *   1. Daily Attendance (presence list for a date)
 *   2. Daily Absentees (list of students absent on a date)
 *   3. Lecture Hall Summary (overall metrics per hall)
 *   4. Low Attendance Alerts (students below threshold)
 *   5. Student Attendance History (check-in history of a student)
 */

import { api } from './api.js';

export const reports = {
  /**
   * Daily Attendance Report
   *
   * @param {string} date — YYYY-MM-DD
   * @param {string|null} hall — optional lecture hall filter
   */
  async getDailyAttendance(date, hall = null) {
    const { data, error } = await api.Records.byDate(date, hall);
    if (error) throw error;
    
    // Structure records
    return (data || []).map(rec => ({
      marked_at: rec.marked_at,
      student_id: rec.students?.student_id || '—',
      student_name: rec.students?.student_name || '—',
      roll_number: rec.students?.roll_number || '—',
      lecture_hall: rec.lecture_hall,
      session_label: rec.session_label,
      status: rec.status === 'P' ? 'Present' : 'Absent',
      code_used: rec.code_used || '—'
    }));
  },

  /**
   * Daily Absentees Report
   *
   * @param {string} date — YYYY-MM-DD
   * @param {string|null} hall — optional lecture hall filter
   */
  async getDailyAbsentees(date, hall = null) {
    const { data, error } = await api.Records.absentees(date, hall);
    if (error) throw error;

    return (data || []).map(rec => ({
      marked_at: rec.marked_at,
      student_id: rec.students?.student_id || '—',
      student_name: rec.students?.student_name || '—',
      roll_number: rec.students?.roll_number || '—',
      mobile_number: rec.students?.mobile_number || '—',
      lecture_hall: rec.lecture_hall,
      session_label: rec.session_label,
      status: 'Absent'
    }));
  },

  /**
   * Lecture Hall Summary Report
   * Returns student overall summaries filtered by hall.
   *
   * @param {string} hall — e.g. 'LH-01'
   */
  async getHallSummary(hall) {
    if (!hall) throw new Error('Lecture Hall is required for summary report.');
    
    const { data, error } = await api.Summary.byHall(hall);
    if (error) throw error;

    return (data || []).map(row => ({
      student_id: row.students?.student_id || '—',
      student_name: row.students?.student_name || '—',
      roll_number: row.students?.roll_number || '—',
      present_count: row.present_count,
      absent_count: row.absent_count,
      total_sessions: row.total_sessions,
      attendance_percentage: `${row.attendance_percentage}%`
    }));
  },

  /**
   * Low Attendance Alerts Report
   * Lists students with attendance percentages below the given threshold.
   *
   * @param {number} threshold — e.g. 75
   * @param {string|null} hall — optional lecture hall filter
   */
  async getLowAttendance(threshold = 75, hall = null) {
    const { data, error } = await api.Summary.belowThreshold(threshold, hall);
    if (error) throw error;

    return (data || []).map(row => ({
      student_id: row.students?.student_id || '—',
      student_name: row.students?.student_name || '—',
      roll_number: row.students?.roll_number || '—',
      mobile_number: row.students?.mobile_number || '—',
      lecture_hall: row.students?.lecture_hall || '—',
      present_count: row.present_count,
      absent_count: row.absent_count,
      total_sessions: row.total_sessions,
      attendance_percentage: `${row.attendance_percentage}%`
    }));
  },

  /**
   * Student Attendance History Report
   * Lists all sessions check-in records for a single student.
   *
   * @param {string} studentId — UUID
   * @param {string} from — YYYY-MM-DD
   * @param {string} to — YYYY-MM-DD
   */
  async getStudentHistory(studentId, from, to) {
    if (!studentId) throw new Error('Student ID is required for history report.');
    
    const { data, error } = await api.Records.byStudent(studentId, from, to);
    if (error) throw error;

    return (data || []).map(rec => ({
      marked_at: rec.marked_at,
      session_label: rec.attendance_sessions?.session_label || '—',
      lecture_hall: rec.lecture_hall,
      status: rec.status === 'P' ? 'Present' : 'Absent',
      code_used: rec.code_used || '—'
    }));
  }
};

// Global attachment
window.reports = reports;
