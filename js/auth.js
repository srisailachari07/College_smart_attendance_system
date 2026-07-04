/**
 * auth.js — Authentication & Route Guard Module
 *
 * Handles faculty and admin authentication flows.
 * Provides route guards for all protected pages.
 * Reads user role from JWT metadata (user_role claim).
 */

import { api } from './api.js';
import { audit } from './audit.js';

// Canonical roles in the system
export const ROLES = {
  FACULTY: 'faculty',
  ADMIN: 'admin',
};

// Cache keys
const USER_CACHE_KEY = 'smartattend_current_user';

/**
 * Checks if the current user is authenticated.
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const { data: session } = await api.Auth.getSession();
  return !!session;
}

/**
 * Checks if the current user has a valid session and the required roles.
 * If not authenticated, redirects to the appropriate login page.
 * If authenticated but unauthorized, redirects to the home page.
 * Called at the very top of protected HTML pages.
 *
 * @param {string[]} allowedRoles — array of strings, e.g. ['admin', 'faculty']
 */
export async function guardRoute(allowedRoles = []) {
  try {
    const { data: session, error } = await api.Auth.getSession();
    
    if (error || !session) {
      console.warn('[SmartAttend Auth] No active session, redirecting to login.');
      redirectToLogin(allowedRoles);
      return;
    }

    const role = await getCurrentRole(session.user);
    if (!role || !allowedRoles.includes(role)) {
      console.error(`[SmartAttend Auth] Access denied. Role "${role}" is not in allowed roles:`, allowedRoles);
      window.location.href = '/index.html';
      return;
    }

    // Load/verify details to populate cache
    await getCurrentUser();
  } catch (err) {
    console.error('[SmartAttend Auth] Route guard error:', err);
    window.location.href = '/index.html';
  }
}

/**
 * Decides where to redirect a user if they are not logged in,
 * based on the roles that were required.
 */
function redirectToLogin(allowedRoles) {
  if (allowedRoles.includes(ROLES.ADMIN) && !allowedRoles.includes(ROLES.FACULTY)) {
    window.location.href = '/admin/login.html';
  } else if (allowedRoles.includes(ROLES.FACULTY)) {
    window.location.href = '/faculty/login.html';
  } else {
    window.location.href = '/index.html';
  }
}

/**
 * Gets the current authenticated user's details.
 * Caches details in sessionStorage to avoid repeated database lookups.
 *
 * @returns {Promise<{ id: string, role: string, name: string, email: string, lectureHall?: string }|null>}
 */
export async function getCurrentUser() {
  try {
    const cachedUser = sessionStorage.getItem(USER_CACHE_KEY);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    const { data: authUser, error: authError } = await api.Auth.getUser();
    if (authError || !authUser) {
      return null;
    }

    const role = await getCurrentRole(authUser);
    let userDetails = {
      id: authUser.id,
      email: authUser.email,
      role: role,
      name: 'System User',
    };

    if (role === ROLES.FACULTY) {
      const { data: facultyRec } = await api.Faculty.findByAuthId(authUser.id);
      if (facultyRec) {
        userDetails = {
          ...userDetails,
          id: facultyRec.id, // Database primary key UUID
          name: facultyRec.faculty_name,
          facultyId: facultyRec.faculty_id,
        };
      }
    } else if (role === ROLES.ADMIN) {
      const { data: adminRec } = await api.Admins.findByAuthId(authUser.id);
      if (adminRec) {
        userDetails = {
          ...userDetails,
          id: adminRec.id, // Database primary key UUID
          name: adminRec.admin_name,
          username: adminRec.username,
        };
      } else {
        // Self-healing: if the admin exists in the public.admins table by email,
        // but their auth_id is out of sync, automatically map it in the database.
        const { data: adminByEmail } = await api.Admins.findByEmail(authUser.email);
        if (adminByEmail) {
          const { data: updatedAdmin } = await window.supabase.from('admins')
            .update({ auth_id: authUser.id })
            .eq('id', adminByEmail.id)
            .select()
            .maybeSingle();
          
          const activeAdmin = updatedAdmin || adminByEmail;
          userDetails = {
            ...userDetails,
            id: activeAdmin.id,
            name: activeAdmin.admin_name,
            username: activeAdmin.username,
          };
        }
      }
    }

    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(userDetails));
    return userDetails;
  } catch (err) {
    console.error('[SmartAttend Auth] Error getting current user details:', err);
    return null;
  }
}

/**
 * Resolve the current user's role from JWT metadata claims,
 * falling back to checking tables if claims are missing.
 *
 * @param {object} user — Supabase auth user object
 * @returns {Promise<string|null>}
 */
export async function getCurrentRole(user = null) {
  try {
    let authUser = user;
    if (!authUser) {
      const { data } = await api.Auth.getUser();
      authUser = data;
    }
    if (!authUser) return null;

    // Check custom claims or metadata in app_metadata/user_metadata
    const metadataRole = authUser.app_metadata?.user_role || authUser.user_metadata?.role;
    if (metadataRole === ROLES.ADMIN || metadataRole === ROLES.FACULTY) {
      return metadataRole;
    }

    // Fallback: Check Admin Table
    const { data: adminCheck } = await api.Admins.findByAuthId(authUser.id);
    if (adminCheck && adminCheck.is_active) {
      return ROLES.ADMIN;
    }

    // Fallback: Check Faculty Table
    const { data: facultyCheck } = await api.Faculty.findByAuthId(authUser.id);
    if (facultyCheck && facultyCheck.is_active) {
      return ROLES.FACULTY;
    }

    return null;
  } catch (err) {
    console.error('[SmartAttend Auth] Error resolving user role:', err);
    return null;
  }
}

/**
 * Faculty login flow.
 * Looks up the faculty email by faculty_id, then signs in.
 * Logs success to audit.
 *
 * @param {string} facultyId
 * @param {string} password
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function facultyLogin(facultyIdOrEmail, password) {
  try {
    let faculty;
    let fetchError;
    
    // Support login using either custom Faculty ID or registered email address
    if (facultyIdOrEmail.trim().includes('@')) {
      const res = await api.Faculty.findByEmail(facultyIdOrEmail.trim().toLowerCase());
      faculty = res.data;
      fetchError = res.error;
    } else {
      const res = await api.Faculty.findByFacultyId(facultyIdOrEmail.trim());
      faculty = res.data;
      fetchError = res.error;
    }

    if (fetchError) {
      return { success: false, message: 'Database query failed: ' + fetchError.message };
    }

    if (!faculty) {
      return { success: false, message: 'Faculty account not found.' };
    }

    if (!faculty.is_active) {
      return { success: false, message: 'Faculty account is inactive. Please contact the administrator.' };
    }

    // 2. Sign in via email
    const { data: authData, error: authError } = await api.Auth.signIn(faculty.email, password);
    if (authError) {
      if (authError.message && authError.message.toLowerCase().includes('credential')) {
        return { success: false, message: 'Incorrect password.' };
      }
      return { success: false, message: authError.message || 'Authentication failed.' };
    }

    // Clear old session caches
    sessionStorage.removeItem(USER_CACHE_KEY);

    // Populate cache with newly authenticated user
    const user = await getCurrentUser();

    // 3. Log login to audit
    if (user) {
      await audit.log({
        action: 'FACULTY_LOGIN',
        targetType: 'session',
        targetId: user.id,
        details: { faculty_id: faculty.faculty_id }
      });
    }

    return { success: true };
  } catch (err) {
    console.error('[SmartAttend Auth] Faculty login error:', err);
    return { success: false, message: 'Network error or database unavailable.' };
  }
}

/**
 * Admin login flow.
 * Looks up the admin email by username or email, then signs in.
 * Logs success to audit.
 *
 * @param {string} usernameOrEmail
 * @param {string} password
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function adminLogin(usernameOrEmail, password) {
  try {
    let admin;
    let fetchError;

    // Support login using either Admin Username or registered email address
    if (usernameOrEmail.trim().includes('@')) {
      const res = await api.Admins.findByEmail(usernameOrEmail.trim().toLowerCase());
      admin = res.data;
      fetchError = res.error;
    } else {
      const res = await api.Admins.findByUsername(usernameOrEmail.trim());
      admin = res.data;
      fetchError = res.error;
    }

    if (fetchError) {
      return { success: false, message: 'Database query failed: ' + fetchError.message };
    }

    if (!admin) {
      return { success: false, message: 'Administrator account not found.' };
    }

    if (!admin.is_active) {
      return { success: false, message: 'Administrator account is inactive.' };
    }

    // 2. Sign in via email
    const { data: authData, error: authError } = await api.Auth.signIn(admin.email, password);
    if (authError) {
      if (authError.message && authError.message.toLowerCase().includes('credential')) {
        return { success: false, message: 'Incorrect password.' };
      }
      return { success: false, message: authError.message || 'Authentication failed.' };
    }

    // Clear old caches
    sessionStorage.removeItem(USER_CACHE_KEY);

    // Populate cache with newly authenticated user
    const user = await getCurrentUser();

    // 3. Log login to audit
    if (user) {
      await audit.log({
        action: 'ADMIN_LOGIN',
        targetType: 'session',
        targetId: user.id,
        details: { username: admin.username }
      });
    }

    return { success: true };
  } catch (err) {
    console.error('[SmartAttend Auth] Admin login error:', err);
    return { success: false, message: 'Network error or database unavailable.' };
  }
}

export async function logout() {
  try {
    const user = await getCurrentUser();
    if (user) {
      console.log(`[SmartAttend Auth] User "${user.name}" logging out.`);
    }

    await api.Auth.signOut();
  } catch (err) {
    console.error('[SmartAttend Auth] Signout error:', err);
  } finally {
    // Clear session storage and all potential Supabase auth tokens
    sessionStorage.clear();
    localStorage.removeItem('sb-admin-auth-token');
    localStorage.removeItem('sb-faculty-auth-token');
    localStorage.removeItem('sb-default-auth-token');
    localStorage.removeItem('sb-gvgaafrfwclmppuqqvac-auth-token');
    
    // Redirect replacing history to prevent back-button reopening
    window.location.replace('/index.html');
  }
}

// Global window attachment for non-module script compatibility
window.auth = {
  ROLES,
  isAuthenticated,
  guardRoute,
  getCurrentUser,
  getCurrentRole,
  facultyLogin,
  adminLogin,
  logout,
};

const auth = {
  ROLES,
  isAuthenticated,
  guardRoute,
  getCurrentUser,
  getCurrentRole,
  facultyLogin,
  adminLogin,
  logout,
};

export default auth;
