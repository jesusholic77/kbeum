# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Internal dashboard for **KB손해보험 충청TC 사업단** (KB Insurance Chungcheong TC division). Reads three Excel workbooks the division produces each day and renders a per-employee view (~309 LCs across 5 branches).

Single-page React app, no backend, no database. The Excel files in the operator's Google Drive folder are the source of truth.

Stack: Vite 5 + React 18 + SheetJS (`xlsx`). No TypeScript, no test framework, no router, no CSS framework — App.jsx uses inline styles throughout.

## Commands

```bash
npm install
npm run dev            # http://localhost:5173, opens browser automatically
npm run build          # production build (NOTE: /data/* won't work in build — see below)
npm run preview        # preview built app
npm run sync-data      # legacy: copies <project root>/*.xlsx → public/ (used by test-loader only)

node scripts/test-loader.cjs   # smoke-test column-index mapping in Node.
                               # Requires public/*.xlsx (run `npm run sync-data` first).
                               # Validates roster count + sample employee + award counts.
```

By default `KB_DATA_DIR` resolves to the project root (the folder holding `vite.config.js`), where the three Excel files live. Override for `dev` and `sync-data` if you keep the data elsewhere:

```powershell
$env:KB_DATA_DIR="D:\다른\폴더"; npm run dev
```

There is **no lint, formatter, or test framework configured** — `test-loader.cjs` is the only automated check. When changing the loader, run it before the dev server.

## Architecture

### Data flow (the part that needs explaining)

```
<project root>/*.xlsx   (TC명단.xlsx, 개인별실적.xlsx, 시상.xlsx)
        │
        ▼  (read on each fetch, no caching)
vite.config.js  ──  kbDataPlugin custom middleware
        │            ├─ /data/<filename>.xlsx   stream from KB_DATA_DIR
        │            └─ /data/_meta             JSON of size+mtime for all 3 files
        ▼
src/lib/excelLoader.js
   • fetchWorkbook(url)   adds ?t=Date.now() + cache:'no-store'
   • parseRoster(wb)      → builds Employee[] from TC명단.xlsx
   • applyPerformance(byCode, wb)   → joins 개인별실적.xlsx by 사원번호
   • applyAwards(byCode, wb)        → joins 시상.xlsx by 사원번호
   • applyDerived(employees)        → 활동달성, 스탠다드, BEST팀, 최우수스컨
        ▼
src/App.jsx  reload() → setData(employees)
```

The middleware in `vite.config.js` is **dev-only** (`configureServer`). A production build will get 404s on `/data/*`. If production is needed, either keep the dev workflow, ship a small Express server with the same middleware, or fall back to the in-app upload button (`loadFromFiles`).

### The Employee object shape

`excelLoader.js` `defaults()` returns the canonical shape (~50 fields, all Korean keys). Every code path — parser, UI, derived metrics — assumes those exact keys. Adding a metric means: add to `defaults()` → populate in one of the `apply*` functions → render in `App.jsx`.

### Excel parsing is column-index based, not header based

`xlsx.utils.sheet_to_json(sheet, { header: 1 })` returns raw `any[][]`. The loader hardcodes column indices and `.slice(N)` to skip header rows. The mapping was reverse-engineered from these specific KB report exports — schema changes upstream will silently produce zeros or wrong values.

Key sheet → column mappings (from `applyPerformance` / `applyAwards`):

| Sheet (in 개인별실적.xlsx) | Header rows | 사원번호 col | Notes |
|---|---|---|---|
| `개인별` | rows 0–6 | col 4 | Cols 7–26 = 전월, **27–46 = 당월**. Loader uses 당월 only. |
| `비콘` | rows 0–4 | col 13 | 출근율(col 18) is 0–1 fraction; multiplied by 100. |
| `DB(당월)` | rows 0–4 | col 4 | Three DB types: 관심(8–13), 우량(14–23), 캠페인(27–30). |
| `신인차월` | rows 0–6 | col 5 | Only fills 가망/재물/활동일 if > 0 (don't overwrite with empty). |
| `보장` | rows 0–3 | col 4 | Counted (one row per 보장분석); used as `max(보장분석, count)`. |

| Sheet (in 시상.xlsx) | 사원번호 col | Note |
|---|---|---|
| `가동시상` | col 4 | `가동시상 = (col 19 == 'Y') \|\| (col 20 == 'Y')` |
| `4월1주브릿지` | col 0 | 매출 col **7** (different from the others) |
| `4월2주브릿지`, `4월3주브릿지` | col 0 | 매출 col 8 |
| `4주브릿지인보험` | col 2 | 매출 col 8 |
| `아침맞이지점` | col 6 | 달성여부 col 11 |
| `인스타BD` | col 3 | 미슐랭 등급 col 10 → `최우수가동` |

When a real schema change is suspected, dump column samples first:

```js
// Run from the project root.
const wb = XLSX.readFile('./개인별실적.xlsx');
console.log(XLSX.utils.sheet_to_json(wb.Sheets['개인별'], { header: 1 })[7]); // first data row
```

### Helper conventions in `excelLoader.js`

- `num(v)`: tolerant numeric coercion — treats `null`, `''`, `'-'`, NaN as `0`.
- `pct(v)`: tolerates both `0–1` and `0–100` forms (auto-detects by `<=1`). KB exports mix the two within the same workbook.
- `yn(v)`: returns `'Y'` or `'N'` only. Use it whenever reading a Y/N column.
- `ach(v)`: same idea but returns `'달성'`/`'미달성'` (the Korean strings the UI checks against).

Use these consistently — the UI does literal string compares (`emp.활동달성 === '달성'`).

### Derived metrics (`applyDerived`)

Computed in JS, not from the spreadsheet:

- `활동달성`: `'달성'` if `활동일 ≥ 15`.
- `스탠다드`: 가동시상 ∧ 스컨시상 ∧ 활동달성 ∧ 희망똑똑 ∧ 인달성율 ≥ 100.
- `BEST팀`: single team with highest mean `인달성율`, excluding `'기타팀'` and teams < 5 people.
- `최우수스컨`: 스컨등급 ∈ {`플래티넘`, `골드`}.

If a real source for any of these appears in a future Excel, replace the derivation rather than add a parallel field.

### Auth

`ACCOUNTS` is hardcoded at the top of `App.jsx` (admin / tc2025). This is a presentation gate, not real auth — the dashboard ships with the data. Don't add features that depend on the role beyond hiding the upload button.

## Files

- `vite.config.js` — Vite + the `kbDataPlugin` middleware.
- `src/App.jsx` — single 1650-line component file. Modal is inline at the bottom; `TeamView` and the card grid are separate sub-components above. All styling is inline objects.
- `src/lib/excelLoader.js` — all parsing logic. **The fragile bit. Treat it as the contract.**
- `scripts/sync-data.cjs` — legacy copy step from before `/data/*` middleware existed; kept because `test-loader.cjs` reads from `public/`.
- `scripts/test-loader.cjs` — Node smoke test, reads `public/*.xlsx` directly with SheetJS (no Vite, no fetch).
- `public/` — empty by design. Don't put Excel files here for runtime use; the middleware serves them straight from `KB_DATA_DIR` (defaults to the project root, which now holds the three `.xlsx` files). `sync-data` does populate `public/` for the smoke test.
- `TC명단.xlsx`, `개인별실적.xlsx`, `시상.xlsx` (at project root) — live data, overwritten by the operator each business day. Don't rename or restructure (column-index parser breaks silently).
