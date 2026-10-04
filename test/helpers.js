// Shared test helpers. Loads renderInvoice() straight out of ./innnvoice's <core>
// block, the same code scripts/build-html.js copies into innnvoice.html.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const bin = path.join(root, 'innnvoice');

function loadCore(source = fs.readFileSync(bin, 'utf8')) {
	const start = source.indexOf('function renderInvoice(');
	const end = source.indexOf('\n// </core>');
	return new Function(`${source.slice(start, end)}\nreturn renderInvoice;`)();
}

const renderInvoice = loadCore();

// Bytes → latin1 string, so tests can search PDF text.
const text = pdf => Buffer.from(pdf).toString('latin1');

// PDF text with the creation timestamp masked, for byte comparisons.
const stable = pdf => text(pdf).replace(/CreationDate \(D:\d+\)/, 'CreationDate ()');

const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'innnvoice-test-'));

const run = (args, cwd) => spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });

const sample = () => JSON.parse(fs.readFileSync(path.join(root, 'innnvoice.json'), 'utf8'));

module.exports = { root, bin, loadCore, renderInvoice, text, stable, tmpdir, run, sample };
