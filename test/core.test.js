const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { renderInvoice, text, sample } = require('./helpers');

const tpl = (extra = {}) => ({
	from: ['Jane Doe'],
	to: ['Acme Corp.'],
	items: [{ description: 'Work', quantity: 1, rate: 1000 }],
	...extra,
});

test('writes a valid single-page PDF', () => {
	const { pdf } = renderInvoice(tpl(), { date: '2026-09' });
	const str = text(pdf);
	assert.ok(str.startsWith('%PDF-1.4'));
	assert.ok(str.trimEnd().endsWith('%%EOF'));
	assert.match(str, /\/Count 1/);
});

test('xref offsets point at each object', () => {
	const str = text(renderInvoice(tpl(), { date: '2026-09' }).pdf);
	const xref = str.slice(str.lastIndexOf('\nxref\n'));
	const offsets = [...xref.matchAll(/^(\d{10}) 00000 n $/gm)].map(m => Number(m[1]));
	assert.equal(offsets.length, 7);
	offsets.forEach((offset, i) => assert.ok(str.startsWith(`${i + 1} 0 obj`, offset), `object ${i + 1}`));
	const startxref = Number(/startxref\n(\d+)/.exec(str)[1]);
	assert.ok(str.startsWith('xref', startxref));
});

test('stream is uncompressed without deflate and FlateDecode with it', () => {
	const plain = text(renderInvoice(tpl(), { date: '2026-09' }).pdf);
	assert.doesNotMatch(plain, /FlateDecode/);
	assert.match(plain, /\(Work\) Tj/);

	const packed = renderInvoice(tpl(), { date: '2026-09', deflate: zlib.deflateSync }).pdf;
	assert.match(text(packed), /FlateDecode/);
	assert.ok(packed.length < plain.length);
});

test('paid is paid in full by default', () => {
	const r = renderInvoice(tpl({ paid: 300 }), { date: '2026-09' });
	assert.equal(r.status, 'paid');
	assert.equal(r.balance, '0.00');
});

test('due and unpaid use the template paid amount', () => {
	assert.equal(renderInvoice(tpl({ paid: 300 }), { date: '2026-09', status: 'due' }).balance, '700.00');
	assert.equal(renderInvoice(tpl({ paid: 300, status: 'unpaid' }), { date: '2026-09' }).balance, '700.00');
});

test('paidAmount option overrides the template, even when paid', () => {
	assert.equal(renderInvoice(tpl({ paid: 300 }), { date: '2026-09', status: 'due', paidAmount: '100' }).balance, '900.00');
	assert.equal(renderInvoice(tpl(), { date: '2026-09', paidAmount: 250 }).balance, '750.00');
});

test('totals multiply quantity by rate and round to cents', () => {
	const items = [
		{ description: 'Hours', quantity: 12.5, rate: 80 },
		{ description: 'Fee', quantity: 3, rate: 0.1 },
	];
	const r = renderInvoice(tpl({ items }), { date: '2026-09', status: 'due' });
	assert.equal(r.balance, '1,000.30');
});

test('amount option replaces the first item rate', () => {
	assert.equal(renderInvoice(tpl(), { date: '2026-09', status: 'due', amount: '6500' }).balance, '6,500.00');
	assert.equal(renderInvoice(tpl(), { date: '2026-09', status: 'due', amount: '' }).balance, '1,000.00');
});

test('quantity and rate columns only print when quantity is not 1', () => {
	const one = text(renderInvoice(tpl(), { date: '2026-09' }).pdf);
	assert.doesNotMatch(one, /\(1000\.00\) Tj/);
	const many = text(renderInvoice(tpl({ items: [{ description: 'Hours', quantity: 4, rate: 250 }] }), { date: '2026-09' }).pdf);
	assert.match(many, /\(4\) Tj/);
	assert.match(many, /\(250\.00\) Tj/);
});

test('placeholders fill from the invoice date', () => {
	const r = renderInvoice(
		tpl({ invoiceNo: '{year}-{MM}-{DD}/{mon}/{Month}/{month}/{nope}', output: 'out/{year}/{mon}.pdf' }),
		{ date: '2026-03-07' },
	);
	assert.equal(r.invoiceNo, '2026-03-07/Mar/March/3/{nope}');
	assert.equal(r.output, 'out/2026/Mar.pdf');
	assert.equal(r.date, '07 Mar 2026');
});

test('defaults: invoice number, output, currency and the 1st of this month', () => {
	const now = new Date(2026, 9, 18);
	const r = renderInvoice(tpl(), { now });
	assert.equal(r.invoiceNo, '2026-10');
	assert.equal(r.output, 'invoice-2026-10.pdf');
	assert.equal(r.currency, 'USD');
	assert.equal(r.date, '01 Oct 2026');
});

test('template date and due are used when no option is given', () => {
	const str = text(renderInvoice(tpl({ date: '2026-05-02', due: '2026-06-01' })).pdf);
	assert.match(str, /\(02 May 2026\) Tj/);
	assert.match(str, /\(01 Jun 2026\) Tj/);
});

test('draft output gets a -DRAFT suffix', () => {
	assert.equal(renderInvoice(tpl({ output: 'a/b.pdf' }), { date: '2026-09', status: 'draft' }).output, 'a/b-DRAFT.pdf');
	assert.equal(renderInvoice(tpl({ output: 'a/b' }), { date: '2026-09', status: 'draft' }).output, 'a/b-DRAFT.pdf');
});

test('status label and statusColors reach the PDF', () => {
	const str = text(renderInvoice(tpl({ statusColors: { due: '#00ff00' } }), { date: '2026-09', status: 'due' }).pdf);
	assert.match(str, /\(Due\) Tj/);
	assert.match(str, /^0 1 0 rg$/m);
});

test('notes and bank details are hidden unless asked for', () => {
	const t = tpl({ notes: ['NOTE-TEXT'], details: ['BANK-TEXT'], footer: 'FOOTER-TEXT' });
	const hidden = text(renderInvoice(t, { date: '2026-09' }).pdf);
	assert.doesNotMatch(hidden, /NOTE-TEXT|BANK-TEXT|FOOTER-TEXT/);

	const shown = text(renderInvoice(t, { date: '2026-09', note: true, bank: true }).pdf);
	assert.match(shown, /NOTE-TEXT/);
	assert.match(shown, /BANK-TEXT/);
	assert.match(shown, /FOOTER-TEXT/);

	const fromTemplate = text(renderInvoice({ ...t, showNote: true, showBank: true }, { date: '2026-09' }).pdf);
	assert.match(fromTemplate, /NOTE-TEXT/);
	assert.match(fromTemplate, /BANK-TEXT/);
	assert.doesNotMatch(text(renderInvoice({ ...t, showBank: true }, { date: '2026-09', bank: false }).pdf), /BANK-TEXT/);
});

test('**bold** switches to Helvetica-Bold', () => {
	const str = text(renderInvoice(tpl({ items: [{ description: 'plain **BOLDWORD** plain', rate: 1 }] }), { date: '2026-09' }).pdf);
	assert.match(str, /\/F2 [\d.]+ Tf [\d.]+ Tc 1 0 0 -1 [\d.]+ [\d.]+ Tm \(BOLDWORD\) Tj/);
});

test('text is escaped and mapped to WinAnsi', () => {
	const str = text(renderInvoice(tpl({ title: 'A (b) \\ “q” – Müller ✓' }), { date: '2026-09' }).pdf);
	assert.ok(str.includes('(A \\(b\\) \\\\ "q" - M\xfcller ?) Tj'));
});

test('long content warns instead of failing', () => {
	const items = Array.from({ length: 40 }, (_, i) => ({ description: `Line ${i}`, rate: 1 }));
	const r = renderInvoice(tpl({ items }), { date: '2026-09' });
	assert.equal(r.warnings.length, 1);
	assert.equal(renderInvoice(tpl(), { date: '2026-09' }).warnings.length, 0);
});

test('invalid input throws a readable error', () => {
	assert.throws(() => renderInvoice(tpl({ items: [] }), { date: '2026-09' }), /no "items"/);
	assert.throws(() => renderInvoice(tpl(), { date: '2026-13' }), /Invalid date/);
	assert.throws(() => renderInvoice(tpl(), { date: 'Sept' }), /Use YYYY-MM/);
	assert.throws(() => renderInvoice(tpl(), { date: '2026-09', status: 'late' }), /Unknown status/);
	assert.throws(() => renderInvoice(tpl({ items: [{ rate: 'abc' }] }), { date: '2026-09' }), /must be numbers/);
	assert.throws(() => renderInvoice(tpl(), { date: '2026-09', paidAmount: 'x' }), /must be a number/);
});

test('the starter template renders', () => {
	const r = renderInvoice(sample(), { date: '2026-09', note: true, bank: true });
	assert.equal(r.invoiceNo, '2026-Acme-Sep');
	assert.equal(r.warnings.length, 0);
});
