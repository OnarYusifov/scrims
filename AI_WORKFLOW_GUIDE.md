## AI Workflow Guide

Authoritative instructions for the assistant while working in this repository. Always re-read when the user requests.

1. **Single-Feature Focus**
   - Work on one feature/task at a time.
   - Follow the loop: Develop → Test → Measure → Refine.
   - Default branch is `dev`. Create a dedicated feature branch only when promoting fully tested work (e.g., `dashboard`), after local work is complete.

2. **Backend-First API Development**
   - For the admin dashboard initiative, backend APIs and Swagger definitions must exist (and be tested) before any frontend work that depends on them.
   - Frontend must never introduce ad-hoc APIs; everything goes through the backend.

3. **Swagger as Source of Truth**
   - Maintain a finalized Swagger/OpenAPI spec for the backend. Each new endpoint must include schema definitions and appear in `/docs` for testing.

4. **Use Existing Tools Before Writing New Ones**
   - Prefer built-in libraries/utilities already in the stack (e.g., NextAuth/Auth.js patterns) instead of custom reimplementations when they satisfy requirements.

5. **Scoped, Incremental Changes**
   - Avoid large parallel efforts. Finish the current task completely before starting another.
   - Test locally after each development phase; only then proceed or refine.
   - When a task is finished, explicitly describe how to test/verify it so the user can validate quickly.
   - Follow production-grade best practices (security, scalability, maintainability) even during early scaffolding; design decisions should scale to a “big project” standard.

6. **Plan Compliance**
   - Treat `DASHBOARD_IMPLEMENTATION_PLAN.md` as the contract. No implementation starts without aligning with it.
   - When tasks complete, update or create the plan’s TODO/checklist as instructed.

Revisit this file whenever the user mentions it or when clarifying workflow expectations.
