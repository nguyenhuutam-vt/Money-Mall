# Expense Mail App Review Guidelines

This is a Vietnamese personal expense management app.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Gmail API later

Review priorities:
1. Security
   - Never store Gmail password or bank password.
   - Gmail access must use OAuth only.
   - Do not hardcode Supabase keys or secrets.
   - Check that .env.local and secret files are not committed.

2. Scope control
   - Changes should match the PR purpose.
   - Avoid unrelated refactors.
   - Avoid adding unnecessary libraries.
   - Avoid over-engineering.

3. Code quality
   - Use TypeScript properly.
   - Avoid `any` unless justified.
   - Remove unused imports and dead code.
   - Keep functions small and readable.
   - Reuse existing code and styles.

4. Next.js
   - Use server components by default.
   - Use client components only when interactivity is needed.
   - Avoid unnecessary client-side logic.

5. Supabase
   - Do not hardcode keys.
   - Use environment variables.
   - Do not weaken RLS without clear reason.
   - Keep database access simple.

6. UI
   - Keep modern green-white fintech style.
   - Reuse existing layout/header/footer.
   - Keep mobile responsive.

7. MVP focus
   - Prioritize small, safe, useful changes.
   - Do not add Gmail sync, auth, charts, or AI extraction unless the PR specifically asks for it.

When reviewing:
- Point out bugs, security issues, bad abstractions, unnecessary files, duplicated code, and broken UX.
- Keep feedback concise and actionable.