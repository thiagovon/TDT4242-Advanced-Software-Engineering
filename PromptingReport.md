Chosen model: Claude Opus 4.6


### Step 1: Requirement disambiguation

#### Prompt:

We are developing the AIGuidebook app

AI Guidebook for Students is a student-centred web application developed to support everyday academic work in an era where generative AI tools such as ChatGPT, GitHub Copilot, and Claude are increasingly embedded in study practices. As students adopt AI tools rapidly, there is a growing need for clear guidance that helps them use AI responsibly, transparently, and in alignment with institutional academic integrity policies. The AI Guidebook provides a structured environment where students can reflect on, document, and manage their AI use while remaining compliant with university-level ethical and academic standards. Functionally, the system shall offer AI usage logging, assignment-level AI declarations, ethical guidelines, and automated compliance checks against institutional rules (e.g., NTNU), combined with a personal dashboard that visualizes usage patterns over time. From a non-functional perspective, the application emphasizes transparency, explainability, privacy-aware data handling, and usability, ensuring that AI support strengthens learning rather than replacing student responsibility.

It will run locally. We want to implement this subsect of requirements. Understand and analyse the requirements. Find any possible ambiguities or potential sources of unintended outcomes. Then you will solve these ambiguities, and propose solutions to help avoid the unintended outcomes, either by refining or adding new requirements. 


#### Response

I'll analyze these requirements systematically, identify ambiguities and potential unintended outcomes, then propose solutions.

---

## Analysis of Requirements

### Requirement 26 – Auto-generate draft AI usage declaration

**Ambiguities:**
- What constitutes a "draft"? How complete should it be? Is it a skeleton with blanks, or a fully filled form?
- What if the student's AI usage logs are incomplete or missing — does it still generate a draft?
- "Based on my logged AI interactions" — what happens with AI usage that wasn't logged (e.g., the student used ChatGPT outside the app)?
- Which assignment does the declaration map to? Is it per-assignment, per-course, or per-period?

**Unintended outcomes:**
- Students may over-trust the draft and submit it without meaningful review, undermining the reflective purpose of declarations.
- If logs are incomplete, the generated draft could be misleadingly incomplete, giving a false impression of low AI usage.
- Students might game the system by selectively logging only "acceptable" interactions, then relying on the auto-generated draft as a legitimacy shield.

---

### Requirement 27 – Provide statistics and insights during declaration

**Ambiguities:**
- "Relevant statistics" is undefined — relevant to what? The assignment? The course? A time period?
- "Insights" is vague — does this mean summaries, pattern detection, warnings, or recommendations?
- When exactly are these shown? Only during declaration form fill-out, or also accessible elsewhere?

**Unintended outcomes:**
- Overwhelming students with too much data could reduce usability rather than improve accuracy.
- If insights include comparative data (e.g., "you used AI more than average"), this could pressure students to under-report.

---

### Requirement 28 – Review declarations before submitting

**Ambiguities:**
- "Before submitting" — submitting to whom or what? Is there an external system, an instructor, or is this internal?
- What does "review" look like concretely? A read-only preview? A diff view against logged data?
- Is there a distinction between reviewing and modifying (Req 29)?

**Unintended outcomes:**
- If the review step is just a confirmation dialog, students may click through it without actually reviewing, rendering it meaningless.

---

### Requirement 29 – Modify declarations

**Ambiguities:**
- Can declarations be modified *after* submission, or only before?
- Is there any versioning or audit trail when modifications are made?
- How does this relate to Requirement 32, which also talks about modifying declarations? These two requirements appear to overlap significantly.

**Unintended outcomes:**
- Without an audit trail, students could submit a declaration, then retroactively alter it to hide AI usage if challenged.
- Unlimited modification could undermine the integrity of the declaration as a record.

---

### Requirement 30 – Add personal reflections

**Ambiguities:**
- "So that I am forced to reflect independently" — is the reflection mandatory or optional? The user story says "I want to be able to" (optional), but the rationale says "forced" (mandatory). This is a direct contradiction.
- What counts as a valid reflection? Is there a minimum length, guiding prompts, or is a single word accepted?
- At what stage are reflections added — during drafting, during review, or at any time?

**Unintended outcomes:**
- If optional, most students will skip it, defeating the pedagogical purpose.
- If mandatory but without quality guidance, students will write minimal placeholder text ("I used AI appropriately") to satisfy the requirement.

---

### Requirement 32 – Modify auto-filled declaration forms

**Ambiguities:**
- This is nearly identical to Requirement 29. The distinction between "modify my AI usage declarations" (29) and "modify the automatically filled in AI declaration forms" (32) is unclear.
- Does Req 32 refer specifically to editing the auto-generated content from Req 26, while Req 29 covers manually created declarations? If so, this should be explicit.

**Unintended outcomes:**
- Having two overlapping requirements risks inconsistent implementation — developers may build two separate editing flows that behave differently, confusing users.
- Students could modify auto-filled content to remove or downplay logged AI usage, effectively contradicting the logged data.

---

### Requirement 47 – Explain functionality

**Ambiguities:**
- "Explain its functionality" — through what mechanism? Tooltips, an onboarding tutorial, a help page, contextual guidance, or all of these?
- When is the explanation shown? On first use? On demand? Contextually?
- What level of explanation — high-level overview or detailed feature-by-feature guidance?

**Unintended outcomes:**
- If implemented as a single help page, students won't read it. If implemented as intrusive pop-ups, it harms usability (conflicting with Req 48).

---

### Requirement 48 – User-friendly interface

**Ambiguities:**
- "User-friendly" is entirely subjective with no measurable criteria.
- No mention of accessibility (screen readers, color contrast, keyboard navigation).
- No target user profile — are we designing for tech-savvy CS students or a general student population?

**Unintended outcomes:**
- Without measurable criteria, this requirement is untestable and could be declared "met" at any quality level.

---

## Proposed Refined and Additional Requirements

### Refined Requirements

**R26 (Refined):**
> As a student, I want the AIGuidebook to generate a draft AI usage declaration for a specific assignment based on my logged AI interactions associated with that assignment, so that I spend less time filling it out manually. The draft shall clearly indicate which parts were auto-generated from logs, and shall display a warning if no AI interactions have been logged for the selected assignment.

**R27 (Refined):**
> As a student, I want the AIGuidebook to display contextual statistics about my AI usage for the relevant assignment (including which AI tools were used, number of interactions, interaction categories, and time span) alongside the declaration form, so that I can fill out the declaration accurately. Statistics shall be presented as a concise summary panel, not as raw data.

**R28 (Refined):**
> As a student, I want to review a complete read-only preview of my AI usage declaration — including auto-generated content, my modifications, and my reflections — before submitting, so that I can verify accuracy. The review step shall require explicit confirmation and shall not be skippable via a single click.

**R29 and R32 (Merged and Refined):**
> As a student, I want to be able to edit all fields of my AI usage declaration — including both auto-generated and manually entered content — before submission, so that I can correct inaccuracies or add missing information. After submission, I want to be able to request a revision, which creates a new version while retaining the original as part of an audit trail.

*Rationale: Merging R29 and R32 eliminates the overlap. Introducing versioning addresses the integrity concern.*

**R30 (Refined):**
> As a student, I am required to add a personal reflection (minimum 50 words) to each AI usage declaration before submission, guided by structured prompts (e.g., "How did AI influence your learning process?" and "What would you have done differently without AI?"), so that I reflect independently on my AI usage. The declaration cannot be submitted without a completed reflection.

**R47 (Refined):**
> As a student, I want the AIGuidebook to provide contextual guidance (tooltips, inline hints, and an accessible help section) that explains each feature at the point of use, so that I understand how to use the application without needing external documentation.

**R48 (Refined):**
> As a student, I want the AIGuidebook to have a user-friendly and accessible interface that meets WCAG 2.1 AA standards, supports keyboard navigation, uses clear and consistent layout patterns, and is usable without prior training, so that all students can use it easily regardless of technical ability or disability.

---

### New Requirements

**R-NEW-1: Completeness warning**
> As a student, I want the AIGuidebook to warn me if my declaration appears to underrepresent my logged AI usage (e.g., if I have deleted auto-generated entries without replacing them), so that I am prompted to ensure my declaration is complete and honest.

*Rationale: Addresses the gaming/under-reporting risk from R26 and R29/32.*

**R-NEW-2: Declaration versioning and audit trail**
> The system shall maintain an immutable version history for each AI usage declaration, recording all modifications with timestamps, so that the integrity of declarations can be verified if needed.

*Rationale: Prevents post-submission tampering and supports academic integrity.*

**R-NEW-3: Unlogged AI usage acknowledgment**
> As a student, I want the declaration form to include a section where I can manually declare AI usage that was not captured by the logging system (e.g., usage on external devices or platforms), so that my declaration reflects all AI usage, not just what was automatically tracked.

*Rationale: Addresses the fundamental gap that auto-generated drafts can only reflect logged interactions, which may be incomplete.*

**R-NEW-4: Declaration scope binding**
> Each AI usage declaration shall be explicitly linked to a specific assignment and course, and shall only draw from AI interaction logs associated with that assignment's defined time period, so that declarations are scoped correctly and do not mix data across assignments.

*Rationale: Resolves the ambiguity in R26 about what a declaration covers.*

---

### Summary of Key Changes

| Issue | Resolution |
|---|---|
| R29 and R32 overlap | Merged into a single requirement with clear pre/post-submission rules |
| R30 contradicts itself (optional vs. forced) | Made mandatory with structured prompts and minimum length |
| R26 silent on incomplete logs | Added completeness warning (R-NEW-1) and unlogged usage field (R-NEW-3) |
| No scoping of declarations | Added explicit assignment binding (R-NEW-4) |
| No audit trail for modifications | Added versioning requirement (R-NEW-2) |
| R48 untestable | Added WCAG 2.1 AA and specific usability criteria |
| R47 vague delivery mechanism | Specified contextual guidance at point of use |