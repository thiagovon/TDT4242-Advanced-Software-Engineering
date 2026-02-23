// ReflectionContext — R-5
// Exposes reflection validity status as read-only shared state.
// ReviewAggregator consumes isValid to gate the submission button.
// ReflectionModule owns the write path via its local React Hook Form state
// and calls setReflectionState after validation.

import { createContext, useContext, useState, ReactNode } from 'react';

interface ReflectionState {
  prompt1: string;
  prompt2: string;
  /** true only when both prompts meet ≥25 word requirement and pass repetition check */
  isValid: boolean;
  wordCountPrompt1: number;
  wordCountPrompt2: number;
}

interface ReflectionContextValue {
  reflection: ReflectionState;
  setReflectionState: (state: ReflectionState) => void;
}

const ReflectionContext = createContext<ReflectionContextValue | null>(null);

const INITIAL_STATE: ReflectionState = {
  prompt1: '',
  prompt2: '',
  isValid: false,
  wordCountPrompt1: 0,
  wordCountPrompt2: 0,
};

export function ReflectionProvider({ children }: { children: ReactNode }) {
  const [reflection, setReflectionState] = useState<ReflectionState>(INITIAL_STATE);
  return (
    <ReflectionContext.Provider value={{ reflection, setReflectionState }}>
      {children}
    </ReflectionContext.Provider>
  );
}

/** Read-only hook for any component that needs reflection validity */
export function useReflection(): ReflectionState {
  const ctx = useContext(ReflectionContext);
  if (!ctx) throw new Error('useReflection must be used within ReflectionProvider');
  return ctx.reflection;
}

/** Write hook — used by ReflectionModule only */
export function useSetReflection(): (state: ReflectionState) => void {
  const ctx = useContext(ReflectionContext);
  if (!ctx) throw new Error('useSetReflection must be used within ReflectionProvider');
  return ctx.setReflectionState;
}
