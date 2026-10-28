# Mandatory Page Health & Zero White-Screen Rule

You MUST follow this rule strictly on every task:
1. **Never commit, push, or report task completion without verifying that the application builds and the page functions without errors.**
2. Run `npx tsc --noEmit` and `npm run build` before pushing any changes.
3. Verify that all state variables (e.g. `currentUser`) are initialized BEFORE any `useEffect` or hook that references them, avoiding Temporal Dead Zone (TDZ) runtime ReferenceErrors.
4. Keep the root `<ErrorBoundary>` in `src/main.tsx` intact to protect against any unhandled exceptions causing a blank white screen.
5. Refer to `الية_العمل.md` and `طريقة_العمل.md` for full protocol details.
