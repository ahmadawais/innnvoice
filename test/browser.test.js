// End-to-end check of innnvoice.html in a real browser via agent-browser
// (https://github.com/vercel-labs/agent-browser). Skipped when it isn't installed.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, tmpdir } = require('./helpers');

const SESSION = ['--session', 'innnvoice-test'];
const installed = spawnSync('agent-browser', ['--version'], { encoding: 'utf8' }).status === 0;

function browser(...args) {
	const r = spawnSync('agent-browser', [...SESSION, ...args], { encoding: 'utf8', timeout: 30_000 });
	assert.equal(r.status, 0, `agent-browser ${args.join(' ')}\n${r.stderr}${r.stdout}`);
	return r.stdout.trim();
}

// `eval` prints its result as JSON; our expressions return JSON strings.
const evaluate = expr => JSON.parse(JSON.parse(browser('eval', `JSON.stringify(${expr})`)));

test('innnvoice.html fills, previews and downloads a PDF', { skip: !installed && 'agent-browser not installed' }, t => {
	t.after(() => spawnSync('agent-browser', [...SESSION, 'close']));
	const url = `file://${path.join(root, 'innnvoice.html')}`;

	browser('open', url);
	browser('eval', 'localStorage.clear()');
	browser('open', url);
	browser('set', 'viewport', '1400', '900');
	browser('wait', '500');

	let state = evaluate("{ balance: document.querySelector('#balance').textContent, error: document.querySelector('#error').textContent, preview: [...document.querySelectorAll('#preview svg text')].some(t => t.textContent === 'Acme Payment') }");
	assert.deepEqual(state, { balance: 'Balance USD 0.00', error: '', preview: true });

	browser('click', 'label[for=s-due]');
	browser('fill', '[data-field=paid]', '1200');
	browser('click', '#add-item');
	browser('fill', '.item:last-child [data-key=description]', 'Extra **design** hours');
	browser('fill', '.item:last-child [data-key=quantity]', '10');
	browser('fill', '.item:last-child [data-key=rate]', '120');
	browser('wait', '600');

	state = evaluate("{ balance: document.querySelector('#balance').textContent, status: tpl.status, items: tpl.items.length, saved: JSON.parse(localStorage.getItem('innnvoice:template')).items.length }");
	assert.deepEqual(state, { balance: 'Balance USD 5,000.00', status: 'due', items: 2, saved: 2 });

	const file = path.join(tmpdir(), 'download.pdf');
	browser('download', '#download', file);
	const pdf = fs.readFileSync(file, 'latin1');
	assert.ok(pdf.startsWith('%PDF-1.4'));
	assert.match(pdf, /\(Due\) Tj/);
	assert.match(pdf, /\(design\) Tj/);
	assert.match(pdf, /\(5,000\.00\) Tj/);

	// Phone width: no horizontal scrolling.
	browser('set', 'viewport', '390', '844');
	browser('wait', '300');
	assert.equal(evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
});
