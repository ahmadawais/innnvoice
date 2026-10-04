const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, loadCore, renderInvoice, sample } = require('./helpers');

const html = fs.readFileSync(path.join(root, 'innnvoice.html'), 'utf8');

test('innnvoice.html is in sync with innnvoice and innnvoice.json', () => {
	const r = spawnSync(process.execPath, [path.join(root, 'scripts/build-html.js'), '--check'], { encoding: 'utf8' });
	assert.equal(r.status, 0, r.stderr);
});

test('the page renders the same PDF as the CLI', () => {
	const fromHtml = loadCore(html);
	const opts = { date: '2026-09', status: 'due', note: true, bank: true, now: new Date(2026, 8, 1) };
	assert.deepEqual(fromHtml(sample(), opts), renderInvoice(sample(), opts));
});

test('the embedded sample is innnvoice.json', () => {
	const json = /const SAMPLE = ([\s\S]*?);\n\/\/ <\/sample>/.exec(html)[1];
	assert.deepEqual(JSON.parse(json), sample());
});

test('the page script parses and loads nothing external', () => {
	const script = /<script>([\s\S]*)<\/script>/.exec(html)[1];
	assert.doesNotThrow(() => new Function(script));
	assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|@import|https?:\/\/(?!www\.w3\.org)/);
});
