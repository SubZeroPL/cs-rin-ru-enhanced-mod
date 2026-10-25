const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const base = 'https://cs.rin.ru/forum/';
const searchUrl = start => `${base}search.php?author_id=42&sr=posts&start=${start}`;

function result(id) {
    return `<tr class="row2"><td colspan="2"><p class="topictitle"><a name="p${id}" id="p${id}"></a>` +
        'Forum: <a href="./viewforum.php?f=14">Forum</a> Topic: <a href="./viewtopic.php?f=14&t=42">Same topic</a></p></td></tr>' +
        `<tr class="row1"><td><b class="postauthor">Author</b></td><td><table><tr><td class="gensmall">` +
        `<a href="./viewtopic.php?f=14&t=42&p=${id}#p${id}">Same subject</a> Posted: same date</td></tr></table></td></tr>` +
        '<tr class="row1"><td><span class="postdetails">Replies: 20 Views: 100</span></td>' +
        '<td><table><tr><td class="postbody">Thank you</td></tr></table></td></tr>' +
        '<tr><td class="spacer" colspan="2"><img src="images/spacer.gif" height="1"></td></tr>';
}

function page(current, ids) {
    const pager = current === 1
        ? '<strong>1</strong>, <a href="./search.php?author_id=42&sr=posts&start=15">2</a>'
        : '<a href="./search.php?author_id=42&sr=posts">1</a>, <strong>2</strong>';
    return '<div id="wrapcentre"><form method="post"><table class="tablebg"><tbody>' +
        '<tr><th>Author</th><th>Message</th></tr>' + ids.map(result).join('') +
        '<tr><td class="cat" colspan="2"><select name="sk"><option value="t">Time</option></select></td></tr>' +
        `</tbody></table></form><div class="nav"><a href="#">Go to page</a> ${pager}</div></div>`;
}

function setup(t, ids = [101], next = [102]) {
    const dom = new JSDOM(page(1, ids), { url: searchUrl(0), pretendToBeVisual: true });
    t.after(() => dom.window.close());
    const { window } = dom;
    const frames = [];
    const positions = new Map();
    window.requestAnimationFrame = callback => frames.push(callback);
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        const top = positions.get(this.dataset.rinSearchPost) ?? 100;
        return { top, bottom: top + 30, height: 30, left: 0, right: 800, width: 800 };
    };
    window.scrollBy = () => {};
    Object.defineProperties(window, {
        innerHeight: { configurable: true, value: 800 },
        scrollY: { configurable: true, writable: true, value: 1500 },
    });
    Object.defineProperty(window.document.documentElement, 'scrollHeight', { configurable: true, value: 2500 });
    const requests = [];
    const enhanced = [];
    const ctx = {
        window, document: window.document, URL, FORUM_BASE_URL: base,
        options: { infinite_scrolling: true }, getComputedStyle: window.getComputedStyle.bind(window),
        fetchForumDocument: async href => {
            requests.push(href);
            const doc = new window.DOMParser().parseFromString(page(2, next), 'text/html');
            doc.rinSourceUrl = href;
            return doc;
        },
        functionsCalledByInfiniteScrolls: (doc, item) => enhanced.push(item),
        notifyRin: () => assert.fail('No pagination error expected'),
        console: { warn: () => assert.fail('No pagination warning expected') },
    };
    loadFunctions(ctx, ['getContentItems', 'contentItemKey', 'setupInfiniteScroll']);
    const scroll = async () => {
        window.dispatchEvent(new window.Event('scroll'));
        while (frames.length) frames.shift()();
        await new Promise(resolve => setImmediate(resolve));
    };
    return { ctx, window, document: window.document, requests, enhanced, positions, scroll };
}

test('post search keeps each native four-row result with stable keys even when all visible text repeats', t => {
    const { ctx, document } = setup(t, [101, 102]);
    const nativeRows = Array.from(document.querySelector('table.tablebg').tBodies[0].rows);
    const items = ctx.getContentItems();
    assert.deepEqual(Array.from(items), nativeRows.slice(1, -1));
    assert.deepEqual(Array.from(items, ctx.contentItemKey), [
        'search-post:101:0', 'search-post:101:1', 'search-post:101:2', 'search-post:101:3',
        'search-post:102:0', 'search-post:102:1', 'search-post:102:2', 'search-post:102:3',
    ]);
    assert.equal(items.filter(row => row.querySelector('.postbody')).length, 2);
    assert.equal(items.filter(row => row.querySelector('.spacer')).length, 2);
});

test('scrolling post-search results retains identical bodies and spacers inside the original table', async t => {
    const { ctx, document, requests, enhanced, positions, scroll } = setup(t);
    const table = document.querySelector('table.tablebg');
    const form = table.closest('form');
    const sort = table.querySelector('.cat');
    const originalRows = Array.from(table.tBodies[0].rows);
    ctx.setupInfiniteScroll();
    await scroll();
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0]).searchParams.get('start'), '15');
    assert.equal(document.querySelectorAll('.postbody').length, 2);
    assert.equal(document.querySelectorAll('.spacer').length, 2);
    assert.equal(table.rows.length, 10);
    assert.ok(originalRows.every(row => row.isConnected));
    assert.equal(enhanced.length, 4);
    assert.ok(enhanced.every(row => row.parentElement === table.tBodies[0] && row.closest('form') === form));
    assert.equal(table.rows[table.rows.length - 1].firstElementChild, sort);
    assert.equal(document.querySelectorAll('[name="sk"]').length, 1);
    positions.set('101', -100); positions.set('102', 20);
    await scroll();
    assert.equal(document.querySelector('.rin-page-nav').dataset.page, '2');
    positions.set('101', 20); positions.set('102', 300);
    await scroll();
    assert.equal(document.querySelector('.rin-page-nav').dataset.page, '1');
    assert.equal(requests.length, 1);
});

test('an overlapping post is deduplicated as a complete result while a different identical post remains', async t => {
    const { ctx, document, enhanced, scroll } = setup(t, [101], [101, 102]);
    ctx.setupInfiniteScroll();
    await scroll();
    assert.equal(document.querySelectorAll('#p101').length, 1);
    assert.equal(document.querySelectorAll('#p102').length, 1);
    assert.equal(document.querySelectorAll('.postbody').length, 2);
    assert.equal(document.querySelectorAll('.spacer').length, 2);
    assert.equal(enhanced.length, 4);
    assert.deepEqual(Array.from(ctx.getContentItems(), row => row.dataset.rinSearchPost),
        ['101', '101', '101', '101', '102', '102', '102', '102']);
});

test('ignored post placeholders and their spacers survive without inventing message content', t => {
    const { ctx, window } = setup(t);
    const ignored = '<tr class="row2"><td class="gensmall" colspan="2">Ignored post</td></tr>' +
        '<tr><td class="spacer" colspan="2"></td></tr>';
    const doc = new window.DOMParser().parseFromString(page(2, []).replace('<tr><td class="cat"', ignored + '<tr><td class="cat"'), 'text/html');
    doc.rinSourceUrl = searchUrl(15);
    const rows = ctx.getContentItems(doc);
    assert.equal(rows.length, 2);
    assert.deepEqual(Array.from(rows, ctx.contentItemKey), ['search-post:ignored:15:0:0', 'search-post:ignored:15:0:1']);
    assert.equal(rows.some(row => row.querySelector('.postbody')), false);
});

test('topic search keeps its original single-row result selection', t => {
    const { ctx, document } = setup(t);
    document.querySelector('table.tablebg').innerHTML = '<tr><th>Topics</th></tr>' +
        '<tr valign="middle"><td class="row1"><a class="topictitle" href="./viewtopic.php?t=42">Topic</a></td></tr>' +
        '<tr><td class="cat">Sort</td></tr>';
    const rows = ctx.getContentItems();
    assert.equal(rows.length, 1);
    assert.equal(ctx.contentItemKey(rows[0]), 'topic:42');
    assert.equal(rows[0].hasAttribute('data-rin-search-post'), false);
});
