# Expense Mail App — Codex Review Guidelines

Vietnamese personal expense management app.
Stack: Next.js App Router · TypeScript · Tailwind CSS · Supabase · Gmail API (planned).

---

## Review focus

Flag serious issues only. Do not nitpick style or formatting.

---

## Checklist

### 1. Secrets & environment
- No hardcoded API keys, tokens, or passwords anywhere in the diff.
- `.env.local` and any secret files must not be committed.
- Supabase keys must come from environment variables only.

### 2. Supabase
- No hardcoded keys or connection strings.
- No unsafe or overly broad database queries.
- Do not weaken Row Level Security (RLS) without a clear, stated reason.

### 3. Next.js
- Use server components by default; client components only when interactivity requires it.
- No broken App Router patterns (missing `use client`, incorrect data-fetching, etc.).

### 4. Code quality
- No `any` unless the reason is explained in a comment.
- No unused imports or dead code.
- No duplicated logic that already exists elsewhere.
- No unnecessary new files or components.

### 5. MVP scope
- The PR should only do what its title and description say.
- Do not add Gmail sync, authentication, charts, or AI extraction unless the PR explicitly asks for it.

### 6. UI
- Layout must be responsive on mobile.
- Keep the green-white fintech visual style consistent.
