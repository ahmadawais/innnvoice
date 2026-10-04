// Every committed example PDF must match what the current renderer produces.
// After a layout change, run ./examples/build.sh and commit the results.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { root, renderInvoice, stable } = require('./helpers');

const dir = path.join(root, 'examples');

for (const name of fs.readdirSync(dir)) {
	const json = path.join(dir, name, 'invoice.json');
	if (!fs.existsSync(json)) continue;

	test(`examples/${name} is up to date`, () => {
		const { pdf, warnings } = renderInvoice(JSON.parse(fs.readFileSync(json, 'utf8')), { date: '2026-09', deflate: zlib.deflateSync });
		assert.deepEqual(warnings, []);
		const committed = fs.readFileSync(path.join(dir, name, 'invoice.pdf'));
		assert.ok(stable(pdf) === stable(committed), `examples/${name}/invoice.pdf is stale. Run ./examples/build.sh`);
		assert.ok(fs.existsSync(path.join(dir, name, 'preview.png')), 'missing preview.png');
	});
}
