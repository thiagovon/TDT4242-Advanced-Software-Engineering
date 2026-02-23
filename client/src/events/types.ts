// Domain event type definitions for AI Guidebook event bus.
// All cross-module communication flows through these typed events.
// R-1: origin metadata, R-4: diffs, R-8: warnings, R-9: snapshots

// ─── Shared domain types ────────────────────────────────────────────────────

/** R-1: Persistent origin metadata tag on every declaration entry */
export type OriginType =
  | 'auto-generated'
  | 'auto-generated-modified'
  | 'manual';

/** R-8: The four warning conditions the IntegrityMonitor can raise */
export type WarningCondition =
  | 'entry_deleted'       // R-8(a): auto-generated entry deleted without manual replacement
  | 'scope_reduced'       // R-8(b): auto-generated entry edited to reduce AI scope
  | 'coverage_low'        // R-8(c): declared interactions < 60% of logged total
  | 'tool_missing';       // R-8(d): logged AI tool not mentioned anywhere in declaration

/** R-9: The four events that trigger a version snapshot */
export type SnapshotTrigger =
  | 'initial_open'   // R-9(a): student first opens the declaration
  | 'review_step'    // R-9(b): student navigates to review step
  | 'submission'     // R-9(c): final submission
  | 'manual_save';   // R-9(d): student explicitly saves a draft

export interface DeclarationEntry {
  id: string;
  declarationId: string;
  assignmentId: string;
  fieldName: string;
  content: string;
  origin: OriginType;
  previousContent?: string; // R-4: preserved previous value for diff tracking
  interactionLogId?: string; // link back to source log entry for auto-generated entries
}

export interface IntegrityWarning {
  id: string;
  condition: WarningCondition;
  message: string;
  relatedEntryId?: string;
  relatedTool?: string;
  raisedAt: string; // ISO timestamp
}

// ─── Domain events ────────────────────────────────────────────────────────────

/**
 * Typed event map consumed by the event bus (mitt).
 * Key = event name, Value = payload shape.
 */
export type DomainEvents = {
  // R-1 / R-4: A field on an auto-generated entry was edited
  FIELD_EDITED: {
    entryId: string;
    fieldName: string;
    previousValue: string;
    newValue: string;
    previousOrigin: OriginType;
    newOrigin: OriginType; // will be 'auto-generated-modified' when editing auto-generated
  };

  // R-4: An auto-generated entry was deleted
  ENTRY_DELETED: {
    entryId: string;
    entry: DeclarationEntry;
    replacedByManualEntryId?: string; // set if student added a manual replacement
  };

  // R-4: A substantive modification was made to an entry (scope, tool names, length)
  ENTRY_MODIFIED: {
    entryId: string;
    previousContent: string;
    newContent: string;
    previousOrigin: OriginType;
    newOrigin: OriginType;
    diffLengthDelta: number; // negative = content was shortened (R-8(b) heuristic)
  };

  // R-9: Triggers an append-only version snapshot
  DECLARATION_SNAPSHOT: {
    declarationId: string;
    assignmentId: string;
    trigger: SnapshotTrigger;
    timestamp: string; // ISO
  };

  // R-8: IntegrityMonitor raised a warning
  INTEGRITY_WARNING_RAISED: {
    warning: IntegrityWarning;
  };

  // R-8: A previously raised warning was resolved or no longer applies
  INTEGRITY_WARNING_CLEARED: {
    warningId: string;
    condition: WarningCondition;
  };

  // R-10: A manual usage entry was added
  MANUAL_ENTRY_ADDED: {
    entryId: string;
    assignmentId: string;
    toolName: string;
  };

  // R-10: A manual usage entry was removed
  MANUAL_ENTRY_REMOVED: {
    entryId: string;
    assignmentId: string;
  };

  // R-5: Reflection text was updated; carries validity status
  REFLECTION_UPDATED: {
    declarationId: string;
    prompt1: string;
    prompt2: string;
    isValid: boolean; // both prompts ≥25 words and no repetition detected
    wordCountPrompt1: number;
    wordCountPrompt2: number;
  };

  // R-13: Student requested draft regeneration
  DRAFT_REGENERATION_REQUESTED: {
    declarationId: string;
    assignmentId: string;
  };

  // R-11: Assignment time period was locked for this student's declaration
  TIME_PERIOD_LOCKED: {
    declarationId: string;
    assignmentId: string;
    periodStart: string; // ISO
    periodEnd: string;   // ISO
  };

  // R-12: An interaction was moved from unassigned queue to an assignment
  INTERACTION_ASSIGNED: {
    interactionId: string;
    assignmentId: string;
    assignedAt: string; // ISO
  };
};
