const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, tmpdir, run } = require('./helpers');

test('--help prints usage', () => {
	const r = run(['--help']);
	assert.equal(r.status, 0);
	assert.match(r.stdout, /Usage: innnvoice/);
	assert.match(r.stdout, /innnvoice init/);
	assert.match(r.stdout, /innnvoice html/);
});

test('a missing template suggests init', () => {
	const r = run([], tmpdir());
	assert.equal(r.status, 1);
	assert.match(r.stderr, /Template not found/);
	assert.match(r.stderr, /innnvoice init/);
});

test('init creates innnvoice.json once, --force overwrites', () => {
	const cwd = tmpdir();
	const first = run(['init'], cwd);
	assert.equal(first.status, 0, first.stderr);
	assert.equal(fs.readFileSync(path.join(cwd, 'innnvoice.json'), 'utf8'), fs.readFileSync(path.join(root, 'innnvoice.json'), 'utf8'));

	fs.writeFileSync(path.join(cwd, 'innnvoice.json'), '{"mine":true}');
	const again = run(['init'], cwd);
	assert.equal(again.status, 1);
	assert.match(again.stderr, /already exists/);
	assert.equal(fs.readFileSync(path.join(cwd, 'innnvoice.json'), 'utf8'), '{"mine":true}');

	assert.equal(run(['init', '--force'], cwd).status, 0);
	assert.notEqual(fs.readFileSync(path.join(cwd, 'innnvoice.json'), 'utf8'), '{"mine":true}');
});

test('renders to the template output path and refuses to overwrite', () => {
	const cwd = tmpdir();
	run(['init'], cwd);
	const r = run(['2026-09'], cwd);
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /✓ 2026-Acme-Sep · 01 Sep 2026 · USD 0\.00 · PAID/);
	const out = path.join(cwd, 'invoices/2026/9-2026-Acme-Sep.pdf');
	assert.ok(fs.readFileSync(out, 'latin1').startsWith('%PDF-1.4'));

	const again = run(['2026-09'], cwd);
	assert.equal(again.status, 1);
	assert.match(again.stderr, /already exists\. Pass --force/);
	assert.equal(run(['2026-09', '--force'], cwd).status, 0);
});

test('status flags, amounts and drafts', () => {
	const cwd = tmpdir();
	run(['init'], cwd);

	const due = run(['2026-09', '--due', '--amount', '4200', '--paid-amount', '200', '-o', 'due.pdf'], cwd);
	assert.match(due.stdout, /USD 4,000\.00 · DUE/);

	const draft = run(['2026-09', '--draft'], cwd);
	assert.equal(draft.status, 0, draft.stderr);
	assert.ok(fs.existsSync(path.join(cwd, 'invoices/2026/9-2026-Acme-Sep-DRAFT.pdf')));

	const both = run(['2026-09', '--due', '--draft'], cwd);
	assert.equal(both.status, 1);
	assert.match(both.stderr, /Pick one status, got: --due --draft/);
});

test('output is relative to the template, --out is relative to cwd', () => {
	const cwd = tmpdir();
	fs.mkdirSync(path.join(cwd, 'clients'));
	fs.writeFileSync(path.join(cwd, 'clients/acme.json'), JSON.stringify({ output: 'acme-{MM}.pdf', items: [{ rate: 1 }] }));

	assert.equal(run(['2026-09', '-t', 'clients/acme.json'], cwd).status, 0);
	assert.ok(fs.existsSync(path.join(cwd, 'clients/acme-09.pdf')));

	assert.equal(run(['2026-09', '-t', 'clients/acme.json', '-o', 'here.pdf'], cwd).status, 0);
	assert.ok(fs.existsSync(path.join(cwd, 'here.pdf')));
});

test('bad input exits 1 with a message', () => {
	const cwd = tmpdir();
	fs.writeFileSync(path.join(cwd, 'innnvoice.json'), '{ nope');
	assert.match(run([], cwd).stderr, /Could not parse/);

	fs.writeFileSync(path.join(cwd, 'innnvoice.json'), JSON.stringify({ items: [{ rate: 1 }] }));
	const r = run(['2026-13'], cwd);
	assert.equal(r.status, 1);
	assert.match(r.stderr, /✗ Invalid date "2026-13"/);
});

test('long templates warn on stderr but still render', () => {
	const cwd = tmpdir();
	const items = Array.from({ length: 40 }, (_, i) => ({ description: `Line ${i}`, rate: 1 }));
	fs.writeFileSync(path.join(cwd, 'innnvoice.json'), JSON.stringify({ items }));
	const r = run(['2026-09'], cwd);
	assert.equal(r.status, 0);
	assert.match(r.stderr, /! Content runs past the bottom of the page/);
});

test('html copies the browser editor', () => {
	const cwd = tmpdir();
	const r = run(['html'], cwd);
	assert.equal(r.status, 0, r.stderr);
	assert.equal(fs.readFileSync(path.join(cwd, 'innnvoice.html'), 'utf8'), fs.readFileSync(path.join(root, 'innnvoice.html'), 'utf8'));
	assert.equal(run(['html'], cwd).status, 1);
	assert.equal(run(['html', '-o', 'editor.html'], cwd).status, 0);
	assert.ok(fs.existsSync(path.join(cwd, 'editor.html')));
});
