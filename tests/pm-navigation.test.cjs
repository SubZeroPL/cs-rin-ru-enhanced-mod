const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');
const { pmFolderPage, pmFolderUrl } = require('../test-support/pm-fixtures.cjs');
const base = 'https://cs.rin.ru/forum/';

function setup(t, { folder = '0', current = 1, enabled = true, url, html, unavailableIds = [] } = {}) {
    const pages = new Map([[1, [101, 102]], [2, [102, 203, 204]]]);
    const dom = new JSDOM(html ?? pmFolderPage(current, pages.get(current), { folder, unavailableIds }), {
        url: url || (current === 1 && folder === '0' ? base + 'ucp.php?i=pm&folder=inbox' : pmFolderUrl(folder, (current - 1) * 100)),
        pretendToBeVisual: true,
    });
    t.after(() => dom.window.close());
    const { window } = dom;
    const positions = new Map();
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        const rows = [...window.document.querySelectorAll('#pm-messages tr[data-message]')];
        const top = this.dataset.message ? positions.get(this.dataset.message) ?? rows.indexOf(this) * 40 + 200 : -100;
        return { top, bottom: top + 40, height: 40, left: 0, right: 800, width: 800 };
    };
    const scrollAdjustments = [];
    window.scrollBy = (x, y) => scrollAdjustments.push([x, y]);
    const frames = [];
    window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
    Object.defineProperties(window, {
        innerHeight: { configurable: true, writable: true, value: 800 },
        scrollY: { configurable: true, writable: true, value: 0 },
    });
    Object.defineProperty(window.document.documentElement, 'scrollHeight', { configurable: true, value: 2500 });
    const requests = [], enhanced = [];
    const ctx = {
        window, document: window.document, URL, URLSearchParams,
        getComputedStyle: window.getComputedStyle.bind(window), FORUM_BASE_URL: base,
        options: { infinite_scrolling: enabled },
        functionsCalledByInfiniteScrolls: (_page, item) => enhanced.push(item),
        fetchForumDocument: async href => {
            requests.push(href);
            const nextPage = Number(new URL(href).searchParams.get('start') || 0) / 100 + 1;
            return new window.DOMParser().parseFromString(pmFolderPage(nextPage, pages.get(nextPage), { folder, unavailableIds }), 'text/html');
        },
        notifyRin: () => assert.fail('No pagination error is expected'),
        console: { warn: () => assert.fail('No pagination warning is expected') },
    };
    const flush = async () => { while (frames.length) frames.shift()(0); await new Promise(resolve => setImmediate(resolve)); };
    const scroll = async () => { window.dispatchEvent(new window.Event('scroll')); await flush(); };
    const earlier = async () => { window.scrollY = 0; window.dispatchEvent(new window.WheelEvent('wheel', { deltaY: -700 })); await flush(); };
    loadFunctions(ctx, ['getContentItems', 'contentItemKey', 'setupInfiniteScroll']);
    return { ctx, document: window.document, window, positions, requests, enhanced, scrollAdjustments, scroll, earlier };
}

test('PM extraction ignores pagination and nested layout rows, selecting only message rows in the native form', t => {
    const { ctx, document } = setup(t);
    const rows = ctx.getContentItems();
    assert.deepEqual(Array.from(rows, row => row.dataset.message), ['101', '102']);
    assert.deepEqual(Array.from(rows, row => ctx.contentItemKey(row)), ['pm:101', 'pm:102']);
    assert.ok(rows.every(row => row.closest('form') === document.getElementById('pm-messages')));
    assert.ok(rows.every(row => row.querySelectorAll('[name="marked_msg_id[]"]').length === 1));
});

test('PM row identity comes from the native numeric marking field, independently of optional subject links', t => {
    const { ctx, document, window } = setup(t);
    const valid = document.querySelector('tr[data-message="101"]');
    const invalid = valid.cloneNode(true);
    invalid.querySelector('input').value = 'not-a-message-id';
    const withoutMarking = valid.cloneNode(true);
    withoutMarking.querySelector('input').remove();
    const nested = document.createElement('tr');
    const cell = document.createElement('td');
    cell.innerHTML = '<table class="tablebg"><tbody>' + valid.outerHTML + '</tbody></table>';
    nested.append(cell);
    valid.after(invalid, withoutMarking, nested);
    assert.deepEqual(Array.from(ctx.getContentItems(), row => row.dataset.message), ['101', '102']);
    valid.querySelector('a.topictitle').href = './ucp.php?i=pm&mode=compose&p=999';
    assert.equal(ctx.contentItemKey(valid), 'pm:101', 'other links cannot override the native marked message ID');
    valid.querySelector('a.topictitle').remove();
    assert.equal(ctx.contentItemKey(valid), 'pm:101', 'a message without a clickable subject still occupies its row');
    const loaded = new window.DOMParser().parseFromString(pmFolderPage(2, [203, 204]).replaceAll(base, './'), 'text/html');
    assert.deepEqual(Array.from(ctx.getContentItems(loaded), row => ctx.contentItemKey(row)), ['pm:203', 'pm:204']);
});

test('unavailable PM rows with compose-only links are preserved and imported inside the original form', async t => {
    const { ctx, document, window, scroll } = setup(t, { unavailableIds: [102, 203] });
    const form = document.getElementById('pm-messages');
    const existing = form.querySelector('tr[data-message="102"]');
    assert.equal(ctx.contentItemKey(existing), 'pm:102');
    assert.match(existing.textContent, /Unavailable message/);
    ctx.setupInfiniteScroll();
    window.scrollY = 1500;
    await scroll();
    assert.deepEqual(Array.from(ctx.getContentItems(), row => row.dataset.message), ['101', '102', '203', '204']);
    assert.equal(form.querySelector('tr[data-message="102"]'), existing);
    const imported = form.querySelector('tr[data-message="203"]');
    assert.equal(imported.cells[1].className, 'row3');
    assert.equal(ctx.contentItemKey(imported), 'pm:203');
    assert.match(imported.textContent, /Unavailable message/);
    assert.equal(new URL(imported.querySelector('a').href).searchParams.get('mode'), 'compose');
    const checkbox = imported.querySelector('input');
    assert.equal(checkbox.form, form);
    checkbox.checked = true;
    assert.deepEqual(new window.FormData(form).getAll('marked_msg_id[]'), ['203']);
});

for (const [name, folder, url] of [['inbox shortcut', '0', base + 'ucp.php?i=pm&folder=inbox'],
    ['sent messages', '-1', base + 'ucp.php?i=pm&folder=sentbox'], ['custom folder', '7', pmFolderUrl('7')]]) {
    test(`PM infinite scrolling appends within the original form and preserves its controls in ${name}`, async t => {
        const { ctx, document, window, positions, requests, enhanced, scroll } = setup(t, { folder, url });
        const form = document.getElementById('pm-messages');
        const tbody = form.querySelector('table.tablebg > tbody');
        const controls = document.getElementById('pm-controls');
        const header = document.getElementById('pm-header');
        const footer = document.getElementById('pm-footer');
        const originalFooter = footer.innerHTML;
        const counters = [...document.querySelectorAll('.nav')];
        const hidden = [...form.querySelectorAll('input[type="hidden"]')];
        const first = form.querySelector('[name="marked_msg_id[]"]');
        first.checked = true;
        const action = form.action;
        ctx.setupInfiniteScroll(); ctx.setupInfiniteScroll();
        window.scrollY = 1500;
        await scroll();
        assert.equal(requests.length, 1);
        const request = new URL(requests[0]);
        assert.equal(request.searchParams.get('f'), folder);
        assert.equal(request.searchParams.get('i'), 'pm');
        assert.equal(request.searchParams.get('mode'), 'view');
        assert.equal(request.searchParams.get('action'), 'view_folder');
        assert.equal(request.searchParams.get('start'), '100');
        assert.equal(request.searchParams.get('sk'), 't');
        assert.equal(request.searchParams.get('sd'), 'd');
        assert.deepEqual([...tbody.querySelectorAll('tr[data-message]')].map(row => row.dataset.message), ['101', '102', '203', '204']);
        assert.equal(controls.parentElement, tbody);
        assert.equal(tbody.lastElementChild, controls);
        assert.deepEqual([...document.querySelectorAll('[name="marked_msg_id[]"]')].map(box => box.form), [form, form, form, form]);
        assert.equal(form.action, action);
        assert.equal(form.method, 'post');
        assert.equal(first.checked, true);
        assert.deepEqual([...form.querySelectorAll('input[type="hidden"]')], hidden);
        assert.equal(new window.FormData(form).get('form_token'), 'test-only-token');
        form.querySelector('[name="marked_msg_id[]"][value="203"]').checked = true;
        assert.deepEqual(new window.FormData(form).getAll('marked_msg_id[]'), ['101', '203']);
        assert.equal(document.getElementById('pm-header'), header);
        assert.equal(document.getElementById('pm-footer'), footer);
        assert.equal(footer.innerHTML, originalFooter);
        assert.ok(counters.every(node => node.isConnected));
        assert.equal(enhanced.length, 2, 'the repeated message from page one is not appended again');
        assert.equal(document.querySelectorAll('.rin-page-nav').length, 1);
        assert.equal(document.querySelector('.rin-page-nav table, .rin-page-nav tr, .rin-page-nav td'), null);
        positions.set('101', -100); positions.set('102', -100); positions.set('203', 20); positions.set('204', 70);
        await scroll();
        assert.equal(document.querySelector('.rin-page-nav').dataset.page, '2');
        positions.set('101', 20); positions.set('203', 500);
        await scroll();
        assert.equal(document.querySelector('.rin-page-nav').dataset.page, '1');
        for (let i = 0; i < 3; i++) await scroll();
        assert.equal(requests.length, 1);
        assert.equal(vm.runInContext('rinPaginationState.keys.has("pm:null")', ctx), false);
    });
}

test('PM backward scrolling prepends in the same form and preserves the original message position', async t => {
    const { ctx, document, requests, enhanced, scrollAdjustments, earlier } = setup(t, { current: 2 });
    const form = document.getElementById('pm-messages');
    const anchor = form.querySelector('tr[data-message]');
    const originalRows = [...form.querySelectorAll('tr[data-message]')];
    ctx.setupInfiniteScroll();
    await earlier();
    await earlier();
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0]).searchParams.get('start'), '0');
    assert.deepEqual([...form.querySelectorAll('tr[data-message]')].map(row => row.dataset.message), ['101', '102', '203', '204']);
    assert.ok(originalRows.every(row => row.isConnected && row.closest('form') === form));
    assert.equal(anchor.dataset.message, '102');
    assert.deepEqual(scrollAdjustments, [[0, 40]], 'one new row is prepended before the old anchor');
    assert.equal(enhanced.length, 1);
    assert.equal(document.querySelectorAll('#pm-footer tr[data-message]').length, 0);
});

test('disabled PM infinite scrolling leaves all native form markup unchanged', t => {
    const { ctx, document } = setup(t, { enabled: false });
    const before = document.body.innerHTML;
    ctx.setupInfiniteScroll();
    assert.equal(document.body.innerHTML, before);
});

test('PM compose and individual-message views are not treated as folder listings', t => {
    const html = '<div id="pagecontent"><form id="postform"><textarea name="message">Draft</textarea>' +
        '<table class="tablebg"><tbody><tr><td class="postbody"><a href="./ucp.php?i=pm&mode=view&p=101">Earlier message</a>' +
        '<strong>1</strong><a href="./ucp.php?i=pm&mode=view&start=100">2</a></td></tr></tbody></table></form></div>';
    for (const url of [base + 'ucp.php?i=pm&mode=compose&action=reply&p=101', base + 'ucp.php?i=pm&mode=view&p=101']) {
        const { ctx, document } = setup(t, { html, url });
        const before = document.body.innerHTML;
        ctx.setupInfiniteScroll();
        assert.equal(document.body.innerHTML, before);
        assert.equal(document.querySelector('textarea').value, 'Draft');
    }
});
