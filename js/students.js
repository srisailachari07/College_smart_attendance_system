/**
 * students.js — Student Management Business Logic
 *
 * Implements CRUD actions, sequence-based ID retrieval, duplicate checks,
 * deactivation, and summary initialization.
 * All data queries are routed through api.Students.
 */

import { api } from './api.js';
import { audit } from './audit.js';
import { ensureSummaryRow } from './summary.js';

/**
 * Register a new student.
 * Initializes the attendance_summary record automatically.
 * Logs the event.
 *
 * @param {{ name: string, mobile: string, hall: string, rollNumber?: string }} data
 * @returns {Promise<object>} Generated student record from DB
 */
export async function createStudent({ name, mobile = null, hall, rollNumber } = {}) {
  try {
    const cleanedMobile = mobile ? mobile.trim() : null;
    
    // 1. Call API create (which calls register_student RPC)
    const { data: student, error } = await api.Students.create({
      student_name: name.trim(),
      mobile_number: cleanedMobile,
      lecture_hall: hall,
      roll_number: rollNumber ? rollNumber.trim() : null
    });

    if (error) throw error;
    return student;
  } catch (err) {
    console.error('[SmartAttend Students] Error creating student:', err);
    throw err;
  }
}

/**
 * Update an existing student's details.
 * Logs updated fields in the audit log.
 *
 * @param {string} id — Student UUID
 * @param {{ student_name?: string, mobile_number?: string, lecture_hall?: string, roll_number?: string }} updates
 * @returns {Promise<object>} Updated student record
 */
export async function updateStudent(id, updates = {}) {
  try {
    // Fetch original to compute diff for audit log
    const { data: original, error: fetchError } = await api.Students.findById(id);
    if (fetchError || !original) {
      throw new Error(fetchError?.message || 'Student not found');
    }

    const cleanedUpdates = {};
    const changedFields = [];

    // Sanitize inputs and track diffs
    if (updates.student_name !== undefined) {
      const val = updates.student_name.trim();
      cleanedUpdates.student_name = val;
      if (val !== original.student_name) changedFields.push('student_name');
    }
    if (updates.mobile_number !== undefined) {
      const val = updates.mobile_number ? updates.mobile_number.trim() : null;
      cleanedUpdates.mobile_number = val;
      if (val !== original.mobile_number) changedFields.push('mobile_number');
    }
    if (updates.lecture_hall !== undefined) {
      const val = updates.lecture_hall;
      cleanedUpdates.lecture_hall = val;
      if (val !== original.lecture_hall) changedFields.push('lecture_hall');
    }
    if (updates.roll_number !== undefined) {
      const val = updates.roll_number ? updates.roll_number.trim() : null;
      cleanedUpdates.roll_number = val;
      if (val !== original.roll_number) changedFields.push('roll_number');
    }

    if (changedFields.length === 0) {
      return original; // No changes to make
    }

    // Apply updates
    const { data: updated, error } = await api.Students.update(id, cleanedUpdates);
    if (error) throw error;

    // Log the update
    await audit.log({
      action: 'STUDENT_UPDATED',
      targetType: 'student',
      targetId: id,
      details: {
        student_id: updated.student_id,
        changed_fields: changedFields,
      },
    });

    return updated;
  } catch (err) {
    console.error(`[SmartAttend Students] Error updating student ${id}:`, err);
    throw err;
  }
}

/**
 * Soft-deactivates a student account.
 * Re-computes summary is not required. Account remains in DB to preserve integrity of history.
 * Logs deactivation.
 *
 * @param {string} id — Student UUID
 * @returns {Promise<object>} Deactivated student record
 */
export async function deactivateStudent(id) {
  try {
    const { data: student, error } = await api.Students.deactivate(id);
    if (error) throw error;

    await audit.log({
      action: 'STUDENT_DEACTIVATED',
      targetType: 'student',
      targetId: id,
      details: {
        student_id: student.student_id,
        student_name: student.student_name,
      },
    });

    return student;
  } catch (err) {
    console.error(`[SmartAttend Students] Error deactivating student ${id}:`, err);
    throw err;
  }
}

/**
 * Soft-activates a student account.
 * Logs activation.
 *
 * @param {string} id — Student UUID
 * @returns {Promise<object>} Activated student record
 */
export async function activateStudent(id) {
  try {
    const { data: student, error } = await api.Students.activate(id);
    if (error) throw error;

    await audit.log({
      action: 'STUDENT_UPDATED',
      targetType: 'student',
      targetId: id,
      details: {
        student_id: student.student_id,
        student_name: student.student_name,
        action: 'activated'
      },
    });

    return student;
  } catch (err) {
    console.error(`[SmartAttend Students] Error activating student ${id}:`, err);
    throw err;
  }
}

/**
 * Retrieves a filtered, paginated list of students.
 *
 * @param {{ hall?: string, search?: string, isActive?: boolean, page?: number, limit?: number }} filters
 * @returns {Promise<{ students: object[], count: number }>}
 */
export async function getStudents(filters = {}) {
  try {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const { data: list, error: listError } = await api.Students.list({
      hall: filters.hall,
      search: filters.search,
      isActive: filters.isActive,
      page,
      limit,
    });
    if (listError) throw listError;

    const { data: count, error: countError } = await api.Students.count({
      hall: filters.hall,
      isActive: filters.isActive,
    });
    if (countError) throw countError;

    return {
      students: list || [],
      count: count || 0,
    };
  } catch (err) {
    console.error('[SmartAttend Students] Error listing students:', err);
    return { students: [], count: 0 };
  }
}

/**
 * Check if a mobile number is already registered under another student.
 * Useful for real-time form validation.
 *
 * @param {string} mobile
 * @param {string|null} excludeId — Skip this student UUID (useful when editing details)
 * @returns {Promise<boolean>} True if duplicate exists, False otherwise
 */
export async function checkMobileDuplicate(mobile, excludeId = null) {
  try {
    const { data: isDuplicate, error } = await api.Students.checkMobileDuplicate(mobile, excludeId);
    if (error) throw error;
    return !!isDuplicate;
  } catch (err) {
    console.error('[SmartAttend Students] Error checking mobile uniqueness:', err);
    return false;
  }
}

/**
 * Look up a student profile by mobile number.
 * Returns the student record, or null if not found.
 * Throws if an API/RLS error occurs so callers can show the real error.
 *
 * @param {string} mobile
 * @returns {Promise<object|null>} Student record, or null if not found
 */
export async function getStudentByMobile(mobile) {
  try {
    const { data, error } = await api.Students.findByMobile(mobile.trim());
    if (error) {
      // Log the real error and re-throw so the UI can show a proper message
      console.error('[SmartAttend Students] findByMobile API error:', error);
      throw new Error(error.message || 'Database lookup failed. Please try again.');
    }
    return data; // null if not found (maybeSingle returns null when no row)
  } catch (err) {
    console.error('[SmartAttend Students] Error finding student by mobile:', err);
    throw err; // re-throw so callers can display the real error
  }
}

/**
 * Look up a student profile by institutional Student ID.
 * Returns the student record, or null if not found.
 *
 * @param {string} studentId
 * @returns {Promise<object|null>} Student record, or null if not found
 */
export async function getStudentByStudentId(studentId) {
  try {
    const { data, error } = await api.Students.findByStudentId(studentId.trim());
    if (error) {
      console.error('[SmartAttend Students] findByStudentId API error:', error);
      throw new Error(error.message || 'Database lookup failed. Please try again.');
    }
    return data;
  } catch (err) {
    console.error('[SmartAttend Students] Error finding student by student_id:', err);
    throw err;
  }
}

/**
 * Retrieve an active student profile by University Roll Number.
 *
 * @param {string} rollNumber
 * @returns {Promise<object|null>} Student record
 */
export async function getStudentByRollNumber(rollNumber) {
  try {
    const { data, error } = await api.Students.findByRollNumber(rollNumber.trim());
    if (error) {
      console.error('[SmartAttend Students] findByRollNumber API error:', error);
      throw new Error(error.message || 'Database lookup failed. Please try again.');
    }
    return data;
  } catch (err) {
    console.error('[SmartAttend Students] Error finding student by roll number:', err);
    throw err;
  }
}


/**
 * Delete a student profile permanently (cascades database-wise).
 * Logs the deletion under STUDENT_DEACTIVATED with details.
 *
 * @param {string} id — Student UUID
 * @returns {Promise<object>} Deleted student record
 */
export async function deleteStudent(id) {
  try {
    // 1. Fetch original record to get name/ID for audit log
    const { data: student, error: fetchError } = await api.Students.findById(id);
    if (fetchError || !student) {
      throw new Error(fetchError?.message || 'Student not found');
    }

    // 2. Perform delete
    const { data: deleted, error } = await api.Students.delete(id);
    if (error) throw error;

    // 3. Log deactivation/deletion
    await audit.log({
      action: 'STUDENT_DEACTIVATED',
      targetType: 'student',
      targetId: id,
      details: {
        student_id: student.student_id,
        student_name: student.student_name,
        action: 'deleted'
      },
    });

    return deleted;
  } catch (err) {
    console.error(`[SmartAttend Students] Error deleting student ${id}:`, err);
    throw err;
  }
}

/**
 * Permanently deletes multiple students in a single transaction.
 *
 * @param {Array<string>} idsArray - Array of student UUIDs
 */
export async function deleteMultipleStudents(idsArray) {
  try {
    const { data, error } = await api.Students.deleteMultiple(idsArray);
    if (error) throw error;

    await audit.log({
      action: 'STUDENT_DEACTIVATED',
      targetType: 'student',
      details: {
        action: 'bulk_deleted',
        count: idsArray.length
      },
    });

    return data;
  } catch (err) {
    console.error('[SmartAttend Students] Error bulk deleting students:', err);
    throw err;
  }
}

/**
 * Resets all student profiles in the database.
 */
export async function resetAllStudents() {
  try {
    const { data, error } = await api.Students.resetAll();
    if (error) throw error;

    await audit.log({
      action: 'STUDENT_DEACTIVATED',
      targetType: 'student',
      details: {
        action: 'reset_all_students'
      },
    });

    return data;
  } catch (err) {
    console.error('[SmartAttend Students] Error resetting all students:', err);
    throw err;
  }
}

// Global attachment for compatibility with traditional script tags
window.students = {
  createStudent,
  updateStudent,
  deactivateStudent,
  activateStudent,
  getStudents,
  checkMobileDuplicate,
  getStudentByMobile,
  getStudentByStudentId,
  getStudentByRollNumber,
  deleteStudent,
  deleteMultipleStudents,
  resetAllStudents,
};
