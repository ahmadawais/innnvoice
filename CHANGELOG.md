# Changelog

## 1.0.0 — 2026-10-04

The first stable release. innnvoice makes clean, print-ready A4 PDF invoices from one JSON file, from the terminal or the browser, with zero dependencies.

### Highlights

- **Web editor at [invoice.awais.dev](https://invoice.awais.dev).** Fill in a form, watch the invoice update live, and click **Download PDF**. It's one self-contained, offline file; nothing leaves your browser.
- **`npx innnvoice html`** writes that same editor, `innnvoice.html`, into the current folder.
- **Golden-ratio design.** The editor splits 38.2 / 61.8, spaces in Fibonacci steps and scales type by √φ. It works in light and dark mode, and on phones.
- **One renderer everywhere.** The CLI and the editor share the same PDF code, so a template gives the same invoice in both.

### CLI

- `npx innnvoice init` creates a starter `innnvoice.json` in the current folder.
- `npx innnvoice [YYYY-MM | YYYY-MM-DD]` renders the invoice for that month or day.
- Statuses: `--paid` (default), `--due`, `--unpaid`, `--draft`. Drafts save as `*-DRAFT.pdf`.
- Options: `--amount`, `--paid-amount`, `--due-date`, `--note`, `--bank`, `--out`, `--force`, `--open`, `--template`.
- Templates support line items with quantity × rate, partial payments, any currency code, custom badge colors, `**bold**` text and date placeholders (`{year} {Month} {mon} {month} {MM} {DD}`).
- Bank details and notes stay off the PDF unless you ask for them.
- Never overwrites an existing PDF without `--force`.

### Web editor

- Live preview drawn from the exact PDF drawing operators, so it matches the download in every browser, phones included.
- Import and export `innnvoice.json`, compatible with the CLI.
- Autosaves in your browser. **Reset** returns to the sample invoice.

### Examples

- Nine ready-to-copy templates in [`examples/`](examples): minimal, freelance retainer, agency project, hourly consulting, partial payment, draft quote, EUR design studio, open-source sponsorship and photography session. Each has its JSON, the generated PDF and a preview.

### Quality

- 43 tests on Node's built-in test runner: renderer, CLI, examples, editor sync and an end-to-end browser test.
- `npm publish` runs the full suite first.

### Upgrading from 0.1.x

- No template changes needed. `innnvoice.json` works as before.
- New since 0.1.1: the redesigned editor and its SVG live preview. Rerun `npx innnvoice html --force` to refresh a local copy.
