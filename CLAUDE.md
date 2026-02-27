# Code Review & Code Smell Analysis — CLAUDE.md

## Purpose

You are an expert code reviewer tasked with performing a **detailed, structured code review** of a React/web application codebase. Your goal is to identify **code smells**, structural weaknesses, and areas for improvement — then provide actionable refactoring suggestions with before/after code examples.

This review serves as part of an academic deliverable that requires **AI-assisted code analysis** as one of the review approaches. All prompts, responses, and decisions (accepted/rejected) must be documented transparently.

---

## Review Scope

Analyse the entire codebase for the following categories of code smells:

### Structural & Complexity
- **Long/complex components** — Components exceeding ~150 lines or with cyclomatic complexity > 10
- **Large classes or modules** — Files doing too many things (violates Single Responsibility)
- **Deeply nested JSX** — More than 3–4 levels of conditional or structural nesting
- **Long parameter lists** — Functions/components accepting more than 3–4 parameters or props

### Duplication & Abstraction
- **Duplicated logic** — Repeated code blocks across components or files
- **Primitive obsession** — Using raw strings/numbers instead of meaningful types, enums, or constants
- **Temporary fields** — State variables or props that are only sometimes used

### Architecture & Separation of Concerns
- **Mixing UI and business logic** — Components that fetch data, transform it, AND render it
- **Shotgun surgery** — A single change requires edits across many unrelated files
- **Feature envy** — A component/function that heavily accesses another module's data

### Maintainability & Hygiene
- **Dead or unreachable code** — Unused imports, commented-out blocks, unreachable branches
- **Excessive or misleading comments** — Comments that restate the obvious or are outdated
- **Missing error handling** — No try/catch, no error boundaries, no loading/error states
- **Inconsistent naming** — Mixed conventions (camelCase vs snake_case, unclear abbreviations)
- **Magic numbers/strings** — Hard-coded values without explanation or constants

### Coverage
- **Coverage**: demonstrates broad and systematic coverage of the codebase, including components, pages, utilities, and data flow. 
- **Quality of code smell identification**: Focus on meaningful structural issues rather than superficial style problems Documented review methodology: The review process is clearly described and reproducible
---

## Review Process

Follow this structured approach for every review:

### Step 1: Codebase Overview
1. List all files and their sizes (lines of code)
2. Identify the project structure and architecture pattern
3. Note the tech stack, dependencies, and frameworks used
4. Summarise the application's purpose and main features

### Step 2: File-by-File Analysis
For each significant file, evaluate:
- **Responsibility**: Does this file do one thing well?
- **Size**: Is it appropriately sized?
- **Complexity**: Are there deeply nested structures or complex conditionals?
- **Dependencies**: Does it import too many things? Are imports used?
- **Error handling**: Are edge cases and errors managed?

### Step 3: Cross-Cutting Concerns
Look across the codebase for:
- Duplicated patterns that could be extracted into shared utilities or hooks
- Inconsistent approaches to the same problem in different files
- Missing abstractions (e.g., no custom hooks for repeated stateful logic)
- Global state management issues

### Step 4: Document Findings
For **each code smell found**, document:

```
### [Code Smell Name]
**File(s):** `path/to/file.tsx`
**Severity:** Critical | Major | Minor
**Category:** Structural | Duplication | Architecture | Maintainability

**Description:**
What the problem is and why it matters.

**Before (Current Code):**
```[language]
// the problematic code
```

**Recommended Fix:**
```[language]
// the improved code
```

**Reasoning:**
Why this change improves the codebase (maintainability, readability, testability, performance).
```

### Step 5: Summary Report
Produce a summary table:

| # | Code Smell | File(s) | Severity | Status |
|---|-----------|---------|----------|--------|
| 1 | Long component | App.tsx | Major | Refactored |
| 2 | Duplicated logic | utils.ts, helpers.ts | Minor | Accepted |
| ... | ... | ... | ... | ... |

---

## AI-Assisted Review Documentation Format

Because this is an AI-assisted review, **every interaction must be documented** in this format:

### Prompt & Response Log

For each review prompt, record:

```
#### Prompt [N]:
> [The exact prompt given to the AI]

#### AI Response Summary:
[Brief summary of what the AI identified]

#### Suggestions Identified:
1. [Suggestion A]
2. [Suggestion B]
3. [Suggestion C]

#### Decision Log:
| Suggestion | Decision | Reasoning |
|-----------|----------|-----------|
| Suggestion A | ✅ Accepted | [Why it was accepted and implemented] |
| Suggestion B | ❌ Rejected | [Why it was rejected — e.g., not applicable, would break functionality, over-engineering] |
| Suggestion C | ⚠️ Partially Accepted | [What was adopted and what was modified] |
```
