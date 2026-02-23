// WarningsContext — R-8
// Exposes active IntegrityMonitor warnings as read-only shared state.
// Components consume this to render the WarningBanner and adjust
// the confirmation checkbox text in ReviewAggregator.
//
// Write path: IntegrityMonitor subscribes to eventBus and calls setWarnings.
// Read path: any component calls useWarnings().

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { IntegrityWarning } from '../events/types';

interface WarningsState {
  warnings: IntegrityWarning[];
}

type WarningsAction =
  | { type: 'ADD_WARNING'; warning: IntegrityWarning }
  | { type: 'CLEAR_WARNING'; warningId: string }
  | { type: 'CLEAR_ALL' };

function warningsReducer(state: WarningsState, action: WarningsAction): WarningsState {
  switch (action.type) {
    case 'ADD_WARNING':
      // Deduplicate by warningId
      if (state.warnings.some((w) => w.id === action.warning.id)) return state;
      return { warnings: [...state.warnings, action.warning] };
    case 'CLEAR_WARNING':
      return { warnings: state.warnings.filter((w) => w.id !== action.warningId) };
    case 'CLEAR_ALL':
      return { warnings: [] };
  }
}

interface WarningsContextValue {
  /** Read-only list of active integrity warnings (R-8) */
  warnings: IntegrityWarning[];
  /** Called by IntegrityMonitor only — not for direct use by UI components */
  dispatch: React.Dispatch<WarningsAction>;
}

const WarningsContext = createContext<WarningsContextValue | null>(null);

export function WarningsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(warningsReducer, { warnings: [] });
  return (
    <WarningsContext.Provider value={{ warnings: state.warnings, dispatch }}>
      {children}
    </WarningsContext.Provider>
  );
}

export function useWarnings(): Pick<WarningsContextValue, 'warnings'> {
  const ctx = useContext(WarningsContext);
  if (!ctx) throw new Error('useWarnings must be used within WarningsProvider');
  return { warnings: ctx.warnings };
}

/** Internal hook for IntegrityMonitor — not exported to UI consumers */
export function useWarningsDispatch(): React.Dispatch<WarningsAction> {
  const ctx = useContext(WarningsContext);
  if (!ctx) throw new Error('useWarningsDispatch must be used within WarningsProvider');
  return ctx.dispatch;
}
