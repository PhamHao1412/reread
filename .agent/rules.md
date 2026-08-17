# Project Engineering Rules & Learned Best Practices

This document contains mandatory architectural guidelines, bug prevention rules, and cross-platform UX standards for this repository.

---

## 1. Mobile & iOS WebKit / PWA Standalone Rules

### 1.1. Auto-Scrolling During Live Token Streaming (AI Chat / AI Explain)
- **Constraint**: `child.scrollIntoView()` fails silently on iOS Safari / WebKit in PWA Standalone mode (Add to Home Screen) inside fixed/modal overlays because WebKit attempts to scroll `document.documentElement` / `window` instead of the scrolling modal container.
- **Rule**: NEVER use `scrollIntoView()` or `behavior: 'smooth'` inside modal stream readers.
- **Standard Pattern**:
  ```tsx
  // ✅ Direct container scrolling synchronized with WebKit layout microtasks:
  useEffect(() => {
    if (activeTab === 'explain' && explainState === 'streaming') {
      const container = sheetContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    }
  }, [explanation, activeTab, explainState]);
  ```
- **CSS Styling for Scroll Containers**:
  ```tsx
  style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
  ```

---

## 2. Service Worker & PWA Caching Invariants

### 2.1. Prevention of White Screen (SPA Stale Hash 404s)
- **Constraint**: When new builds are deployed (e.g. on Vercel), Vite produces new hashed JavaScript files (`index-[hash].js`). If `index.html` is cached using Stale-While-Revalidate, it attempts to load deleted JS bundles, receives 404 HTML fallback, and crashes React with `SyntaxError: Unexpected token '<'`.
- **Rule**: In `sw.js`, all HTML navigation requests (`mode === 'navigate'`, `/`, and `.html`) **MUST ALWAYS use Network-First** strategy. Only fall back to cache when the device is completely offline.

---

## 3. Frontend Environment & API Routing

### 3.1. Dynamic Backend URL Configuration
- **Constraint**: Vite client-side code does not have access to runtime environment variables unless explicitly accessed via `import.meta.env.VITE_*`.
- **Rule**: All API clients and fetch invocations must route through a centralized `formatUrl(path)` utility backed by `(import.meta as any).env?.VITE_API_URL`.
- **Dev / Production Rule**:
  - Local dev overrides belong in `.env.local` (`VITE_API_URL=http://localhost:8003`), which is ignored by git.
  - Do NOT modify `vite.config.ts` proxy configurations for temporary local testing.

---

## 4. Git & Workflow Rules

- **Commit Rule**: Never run `git commit`, `git add`, or `git push` autonomously. Always leave git commits and pushes to the user.
