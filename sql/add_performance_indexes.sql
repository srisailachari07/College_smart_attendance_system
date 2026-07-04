-- ═══════════════════════════════════════════════════════════════════════════
-- SmartAttend v2.0 — PERFORMANCE & SCALABILITY INDEXES
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Index on faculty(auth_id)
-- Resolves sequential scan in is_faculty_member() and getCurrentRole() checks.
CREATE INDEX IF NOT EXISTS idx_faculty_auth ON public.faculty(auth_id);

-- 2. Index on admins(auth_id)
-- Resolves sequential scan in is_admin() which runs on every RLS policy evaluation.
CREATE INDEX IF NOT EXISTS idx_admins_auth ON public.admins(auth_id);
