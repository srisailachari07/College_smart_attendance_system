/**
 * faculty.js — Faculty Management Business Logic
 *
 * Implements CRUD actions, lecture hall assignments, profile loading,
 * and deactivation logic for instructors.
 * All DB queries are routed through api.Faculty.
 */

import { api } from './api.js';
import { audit } from './audit.js';

/**
 * Register a new faculty profile.
 *
 * @param {{ name: string, email: string, hall: string, facultyId: string, authId?: string }} data
 * @returns {Promise<object>} Created faculty record
 */
export async function createFaculty({ name, email, facultyId, password } = {}) {
  try {
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedId = facultyId.trim();

    // Call the database atomic RPC to create auth user and faculty profile
    const { data: faculty, error } = await api.Faculty.createFacultyAccount({
      name: name.trim(),
      facultyId: cleanedId,
      email: cleanedEmail,
      password: password
    });

    if (error) throw error;

    // Write audit log
    await audit.log({
      action: 'FACULTY_UPDATED',
      targetType: 'faculty',
      targetId: faculty.id,
      details: {
        faculty_id: faculty.faculty_id,
        email: faculty.email,
        action: 'created'
      },
    });

    return faculty;
  } catch (err) {
    console.error('[SmartAttend Faculty] Error creating faculty profile:', err);
    throw err;
  }
}

/**
 * Update an existing faculty member's profile.
 * Logs updated fields in the audit log.
 *
 * @param {string} id — Faculty profile UUID
 * @param {{ faculty_name?: string, email?: string, auth_id?: string }} updates
 * @returns {Promise<object>} Updated faculty record
 */
export async function updateFaculty(id, updates = {}) {
  try {
    // 1. Fetch original record to compute diff
    const { data: original, error: fetchError } = await api.Faculty.findById(id);
    if (fetchError || !original) {
      throw new Error(fetchError?.message || 'Faculty member not found');
    }

    const cleanedUpdates = {};
    const changedFields = [];

    if (updates.faculty_name !== undefined) {
      const val = updates.faculty_name.trim();
      cleanedUpdates.faculty_name = val;
      if (val !== original.faculty_name) changedFields.push('faculty_name');
    }
    if (updates.email !== undefined) {
      const val = updates.email.trim().toLowerCase();
      cleanedUpdates.email = val;
      if (val !== original.email) changedFields.push('email');
    }
    if (updates.auth_id !== undefined) {
      cleanedUpdates.auth_id = updates.auth_id;
      if (updates.auth_id !== original.auth_id) changedFields.push('auth_id');
    }

    if (changedFields.length === 0) {
      return original; // No changes to make
    }

    // 2. Perform update
    const { data: updated, error } = await api.Faculty.update(id, cleanedUpdates);
    if (error) throw error;

    // 3. Write audit log
    await audit.log({
      action: 'FACULTY_UPDATED',
      targetType: 'faculty',
      targetId: id,
      details: {
        faculty_id: updated.faculty_id,
        changed_fields: changedFields,
      },
    });

    return updated;
  } catch (err) {
    console.error(`[SmartAttend Faculty] Error updating faculty ${id}:`, err);
    throw err;
  }
}

/**
 * Soft deactivates a faculty member account.
 * Logs deactivation.
 *
 * @param {string} id — Faculty profile UUID
 * @returns {Promise<object>} Deactivated record
 */
export async function deactivateFaculty(id) {
  try {
    const { data: faculty, error } = await api.Faculty.deactivate(id);
    if (error) throw error;

    await audit.log({
      action: 'FACULTY_UPDATED',
      targetType: 'faculty',
      targetId: id,
      details: {
        faculty_id: faculty.faculty_id,
        is_active: false,
      },
    });

    return faculty;
  } catch (err) {
    console.error(`[SmartAttend Faculty] Error deactivating faculty ${id}:`, err);
    throw err;
  }
}

/**
 * Soft activates a faculty member account.
 * Logs activation.
 *
 * @param {string} id — Faculty profile UUID
 * @returns {Promise<object>} Activated record
 */
export async function activateFaculty(id) {
  try {
    const { data: faculty, error } = await api.Faculty.activate(id);
    if (error) throw error;

    await audit.log({
      action: 'FACULTY_UPDATED',
      targetType: 'faculty',
      targetId: id,
      details: {
        faculty_id: faculty.faculty_id,
        is_active: true,
      },
    });

    return faculty;
  } catch (err) {
    console.error(`[SmartAttend Faculty] Error activating faculty ${id}:`, err);
    throw err;
  }
}

/**
 * Fetch all faculty profiles, paginated.
 *
 * @param {{ page?: number, limit?: number, isActive?: boolean }} filters
 * @returns {Promise<{ data: object[], count: number }>}
 */
export async function getFacultyList({ page = 1, limit = 50, isActive = undefined } = {}) {
  try {
    const { data, count, error } = await api.Faculty.list({ page, limit, isActive });
    if (error) throw error;

    return {
      data: data || [],
      count: count !== undefined ? count : (data ? data.length : 0),
    };
  } catch (err) {
    console.error('[SmartAttend Faculty] Error listing faculty:', err);
    return { data: [], count: 0 };
  }
}

/**
 * Load a faculty profile linked to an authenticated user account.
 *
 * @param {string} authId — auth.users UUID
 * @returns {Promise<object|null>} Faculty details or null
 */
export async function loadFacultyProfile(authId) {
  try {
    const { data, error } = await api.Faculty.findByAuthId(authId);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`[SmartAttend Faculty] Error loading profile for auth ${authId}:`, err);
    return null;
  }
}

/**
 * Reset a faculty member's password using RPC reset_faculty_password.
 *
 * @param {string} email
 * @param {string} newPassword
 */
export async function resetFacultyPassword(email, newPassword) {
  try {
    const { data, error } = await api.Auth.resetFacultyPassword(email, newPassword);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SmartAttend Faculty] Error resetting password:', err);
    throw err;
  }
}

/**
 * Permanently delete a faculty profile if no historical dependencies exist.
 *
 * @param {string} id — Faculty profile UUID
 * @returns {Promise<object>} Deleted record representation
 */
export async function deleteFaculty(id) {
  try {
    // 1. Fetch record to get details for audit log
    const { data: faculty, error: fetchErr } = await api.Faculty.findById(id);
    if (fetchErr || !faculty) {
      throw new Error(fetchErr?.message || 'Faculty member not found.');
    }

    // 2. Perform permanent delete (handles active sessions deletion, reassignment, profile delete, and auth user delete)
    const { data: success, error: deleteErr } = await api.Faculty.deletePermanently(id);
    if (deleteErr) throw deleteErr;

    // 3. Write audit log
    await audit.log({
      action: 'FACULTY_UPDATED',
      targetType: 'faculty',
      targetId: id,
      details: {
        faculty_id: faculty.faculty_id,
        email: faculty.email,
        action: 'permanently_deleted',
        historical_records_reassigned: true
      },
    });

    return faculty;
  } catch (err) {
    console.error('[SmartAttend Faculty] Error deleting faculty:', err);
    throw err;
  }
}

/**
 * Permanently deletes multiple faculty members in a single transaction.
 *
 * @param {Array<string>} idsArray - Array of faculty UUIDs
 */
export async function deleteMultipleFaculty(idsArray) {
  try {
    const { data, error } = await api.Faculty.deleteMultiplePermanently(idsArray);
    if (error) throw error;

    await audit.log({
      action: 'FACULTY_UPDATED',
      targetType: 'faculty',
      details: {
        action: 'bulk_permanently_deleted',
        count: idsArray.length
      },
    });

    return data;
  } catch (err) {
    console.error('[SmartAttend Faculty] Error bulk deleting faculty:', err);
    throw err;
  }
}

/**
 * Resets all faculty profiles (except SYSTEM_ARCHIVE) and cleans up logins.
 */
export async function resetAllFaculty() {
  try {
    const { data, error } = await api.Faculty.resetAll();
    if (error) throw error;

    await audit.log({
      action: 'FACULTY_UPDATED',
      targetType: 'faculty',
      details: {
        action: 'reset_all_faculty'
      },
    });

    return data;
  } catch (err) {
    console.error('[SmartAttend Faculty] Error resetting all faculty:', err);
    throw err;
  }
}

// Global window registration
window.faculty = {
  createFaculty,
  updateFaculty,
  deactivateFaculty,
  activateFaculty,
  getFacultyList,
  loadFacultyProfile,
  resetFacultyPassword,
  deleteFaculty,
  deleteMultipleFaculty,
  resetAllFaculty,
};
