# Prompt: Generate Test Plan for AIGuidebook

You are a QA engineer creating a structured test plan for the **AIGuidebook** system. The AIGuidebook is a student-facing application that helps students generate, review, edit, and submit AI usage declarations based on their logged AI interactions.

---

## Requirements Under Test

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-26 | As a student, I want the AIGuidebook to generate a draft AI usage declaration based on my logged AI interactions, so that I am able to spend less time filling it out manually. |
| FR-27 | As a student, I want the AIGuidebook to provide relevant statistics and insights about my AI usage when I fill out the AI usage declaration, so that I am able to fill out the declaration accurately. |
| FR-28 | As a student, I want to be able to review my AI usage declarations before submitting them, so that I am able to verify they are accurate. |
| FR-29 | As a student, I want to be able to modify my AI usage declarations, so that I am able to correct any mistakes. |
| FR-30 | As a student, I want to be able to add my own reflections to the AI usage declarations, so that I am forced to reflect independently about my own AI usage. |
| FR-32 | As a student, I want to be able to modify the automatically filled in AI declaration forms, so that I can correct any inaccuracies the AIGuidebook has made. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-47 | As a student, I want the AIGuidebook to explain its functionality, so that I understand how to use the features of the program correctly. |
| NFR-48 | As a student, I want the AIGuidebook to have a user-friendly interface, so that I am able to use it easily. |

---

## Your Task

Generate a complete **test plan document** with the following three sections:

---

### Section 1: Test Case Table

Create a table with the following columns:

| Test ID | Test Type | Requirement | Input / Trigger | Expected Output | Test Method | Pass/Fail Criteria | Notes |

Rules for generating test cases:

- **Test ID format**: Use prefixes `UT-XX` (unit test), `IT-XX` (integration test), `ST-XX` (system test), `NFR-XX` (non-functional test).
- **Test types must be balanced**: Include a mix of unit, integration, system, and NFR tests. Aim for roughly 5–8 unit tests, 3–5 integration tests, 2–3 system tests, and 2–4 NFR tests.
- **Every requirement must have at least one test case**. Most functional requirements should have 2+ (including at least one edge case or negative test).
- **Include both positive and negative/edge cases**. For example:
  - FR-26: Test with a populated interaction log AND with an empty interaction log.
  - FR-29: Test a successful edit AND test editing a field to blank (validation).
  - FR-30: Test adding a reflection AND test submitting without a reflection.
  - FR-32: Test modifying an auto-filled field AND test that changes persist after save.
- **Pass/Fail criteria must be specific and measurable**. Never write "works correctly." Instead write exactly what the output should be (e.g., "Draft contains all logged interactions grouped by date" or "Error message 'Reflection cannot be empty' is displayed").
- **Test methods should name tools or approaches**: e.g., Jest unit test, React Testing Library, Cypress E2E, manual heuristic evaluation, automated accessibility check.
- **NFR tests must be concrete**:
  - NFR-47 (Explainability): Check that help text/tooltips/onboarding exists for each major feature, and that help content matches actual behavior.
  - NFR-48 (Usability): Use task completion testing (define a scenario and verify a user can complete it), heuristic evaluation against Nielsen's heuristics, and/or accessibility checks (labels, contrast, keyboard navigation).

---

### Section 2: Coverage Definition

Write a short section (one paragraph per coverage type) defining these targets with justifications:

1. **LOC Coverage: ≥ 65%**
   - Target ≥ 90% on core business logic (draft generation, statistics calculation, declaration persistence, validation).
   - Accept lower coverage on presentational UI components and boilerplate.
   - Justify: testing effort focused where bugs are most likely and impactful.

2. **Branch/Path Coverage: ≥ 70% on core logic**
   - Every conditional in draft generation, edit/save validation, and reflection handling tested for both true and false outcomes.
   - Give concrete examples from the requirements (e.g., empty vs populated interaction log, blank vs filled reflection field).

3. **Requirement Coverage: 100%**
   - Every FR and NFR has at least one mapped test case in the traceability matrix.

4. **Funtion/Method coverage: 80%** 

5. **NFR Coverage: At least one test per NFR category**
   - Explainability tested through presence and accuracy checks on help content.
   - Usability tested through task completion scenarios and heuristic evaluation.

---

### Section 3: Traceability Matrix

Create a table mapping every requirement to its test cases and implementation components:

| Requirement ID | Requirement Summary | Test Case(s) | Implementation Reference |

Rules:
- Every requirement (FR-26 through FR-32, NFR-47, NFR-48) must appear exactly once.
- List all relevant Test IDs from Section 1 for each requirement.
- For implementation reference, use component/file names from the codebase.

---

## Output Format

Produce the full document in clean Markdown with all three sections. Use proper table formatting. Do not include any preamble or meta-commentary — just the test plan content ready to be submitted.
