// Shared API response types — mirror server DB row shapes

export interface Assignment {
  id: string;
  course_id: string;
  course_name: string;
  title: string;
  description: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface InteractionLog {
  id: string;
  assignment_id: string | null;
  tool_name: string;
  category: string;
  description: string;
  logged_at: string;
  origin_tag: 'student_tagged' | 'inferred' | 'unassigned';
}

export interface DeclarationEntry {
  id: string;
  declaration_id: string;
  interaction_log_id: string | null;
  field_name: string;
  content: string;
  origin: 'auto-generated' | 'auto-generated-modified' | 'manual';
  previous_content: string | null;
  diff_delta: number | null;
  created_at: string;
  updated_at: string;
}

export interface ManualUsageEntry {
  id: string;
  declaration_id: string;
  tool_name: string;
  date_range: string;
  description: string;
  reason: 'external_device' | 'unintegrated_tool' | 'before_logging' | 'other';
  reason_other: string | null;
  created_at: string;
}

export interface Declaration {
  id: string;
  assignment_id: string;
  student_id: string;
  status: 'draft' | 'submitted';
  time_period_locked_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reflection {
  id: string;
  declaration_id: string;
  prompt1: string;
  prompt2: string;
  is_valid: number; // SQLite boolean: 0 | 1
  word_count_p1: number;
  word_count_p2: number;
  updated_at: string;
}

export interface DeclarationFull {
  declaration: Declaration;
  entries: DeclarationEntry[];
  manualEntries: ManualUsageEntry[];
  reflection: Reflection | null;
}
