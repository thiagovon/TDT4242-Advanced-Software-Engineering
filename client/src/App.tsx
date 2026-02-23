// App.tsx — Root component
// Provides all React contexts and renders the top-level layout.
// R-7: skip-to-main link, landmark regions, keyboard navigation

import { useState } from 'react';
import { WarningsProvider } from './contexts/WarningsContext';
import { ReflectionProvider } from './contexts/ReflectionContext';
import DraftEditorModule from './modules/DraftEditorModule';
import StatsPanelModule from './modules/StatsPanel';
import ReflectionModule from './modules/ReflectionModule';
import ManualUsageModule from './modules/ManualUsageModule';
import ReviewAggregator from './modules/ReviewAggregator';
import { useVersionHistoryService } from './services/VersionHistoryService';
import HelpSection from './components/HelpSection';
import type { DeclarationEntry } from './types/api';

// TODO: replace with real auth / assignment selector in a later phase
const DEMO_ASSIGNMENT_ID = 'assign-001';
const DEMO_STUDENT_ID = 'student-demo-001';

/** Wizard steps in submission order */
type Step = 'draft' | 'reflection' | 'manual' | 'review';

const STEPS: { id: Step; label: string }[] = [
  { id: 'draft', label: 'Draft Declaration' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'manual', label: 'Manual Entries' },
  { id: 'review', label: 'Review & Submit' },
];

// Inner component that has access to context providers
function AppInner() {
  const [currentStep, setCurrentStep] = useState<Step>('draft');
  // Lifted state so StatsPanel can read real-time entry count (R-2)
  const [entries, setEntries] = useState<DeclarationEntry[]>([]);
  const [manualEntryCount, setManualEntryCount] = useState(0);
  // Declaration ID set after first generate — shared between modules
  const [declarationId, setDeclarationId] = useState<string | null>(null);

  // R-9: mount VersionHistoryService — subscribes to DECLARATION_SNAPSHOT events
  useVersionHistoryService({ declarationId: declarationId ?? '' });

  return (
    <>
      {/* R-7: skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <header
            role="banner"
            style={{
              padding: '1rem 2rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '1.25rem' }}>
                AI Guidebook for Students
              </h1>
              {/* R-6: configurable help section */}
              <HelpSection />
            </div>
          </header>

          {/* Step navigation */}
          <nav aria-label="Declaration wizard steps">
            <ol
              role="list"
              style={{
                display: 'flex',
                gap: 0,
                margin: 0,
                padding: '0 2rem',
                listStyle: 'none',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              {STEPS.map((step, idx) => (
                <li key={step.id}>
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    aria-current={currentStep === step.id ? 'step' : undefined}
                    style={{
                      padding: '0.75rem 1.25rem',
                      border: 'none',
                      borderBottom:
                        currentStep === step.id
                          ? '3px solid var(--color-primary)'
                          : '3px solid transparent',
                      background: 'none',
                      cursor: 'pointer',
                      fontWeight: currentStep === step.id ? 600 : 400,
                      color:
                        currentStep === step.id
                          ? 'var(--color-primary)'
                          : 'var(--color-text-secondary)',
                    }}
                  >
                    {idx + 1}. {step.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {/* Main layout: editor + stats panel side by side on draft step */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: currentStep === 'draft' ? '1fr 320px' : '1fr',
              flex: 1,
              gap: '2rem',
              padding: '2rem',
              maxWidth: '1200px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <main id="main-content" role="main" tabIndex={-1}>
              {currentStep === 'draft' && (
                <DraftEditorModule
                  assignmentId={DEMO_ASSIGNMENT_ID}
                  studentId={DEMO_STUDENT_ID}
                  onEntriesChange={setEntries}
                  onDeclarationCreated={setDeclarationId}
                />
              )}
              {currentStep === 'reflection' && declarationId && (
                <ReflectionModule
                  assignmentId={DEMO_ASSIGNMENT_ID}
                  declarationId={declarationId}
                />
              )}
              {currentStep === 'reflection' && !declarationId && (
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Please generate a draft declaration first.
                </p>
              )}
              {currentStep === 'manual' && declarationId && (
                <ManualUsageModule
                  assignmentId={DEMO_ASSIGNMENT_ID}
                  declarationId={declarationId}
                  onCountChange={setManualEntryCount}
                />
              )}
              {currentStep === 'manual' && !declarationId && (
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Please generate a draft declaration first.
                </p>
              )}
              {currentStep === 'review' && declarationId && (
                <ReviewAggregator declarationId={declarationId} />
              )}
              {currentStep === 'review' && !declarationId && (
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Please generate a draft declaration first.
                </p>
              )}
            </main>

            {/* StatsPanel only shown during draft editing step (R-2) */}
            {currentStep === 'draft' && (
              <StatsPanelModule
                assignmentId={DEMO_ASSIGNMENT_ID}
                entries={entries}
                manualEntryCount={manualEntryCount}
              />
            )}
          </div>
        </div>
    </>
  );
}

// App wraps providers around AppInner so hooks inside can access context
function App() {
  return (
    <WarningsProvider>
      <ReflectionProvider>
        <AppInner />
      </ReflectionProvider>
    </WarningsProvider>
  );
}

export default App;
