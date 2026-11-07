const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');
const base = 'https://cs.rin.ru/forum/';

function setup(t, path, html = '') {
    const dom = new JSDOM(html, { url: base + path });
    t.after(() => dom.window.close());
    const ctx = { window: dom.window, document: dom.window.document, URL, URLSearchParams,
        FORUM_BASE_URL: base, options: { dynamic_content: true }, rinPaginationState: null };
    loadFunctions(ctx, ['contentItemKey', 'getDynamicRefreshUrl', 'getContentItems']);
    return ctx;
}

test('topic row identity survives a new last post while individual search results remain distinct', t => {
    const ctx = setup(t, 'viewforum.php?f=10', '<table><tbody><tr id="topic"><td>' +
        '<a class="topictitle" href="./viewtopic.php?t=42">Topic</a>' +
        '<a id="last" href="./viewtopic.php?p=100"><img src="icon_post_target.gif"></a></td></tr></tbody></table>');
    const row = ctx.document.getElementById('topic');
    assert.equal(ctx.contentItemKey(row), 'topic:42');
    ctx.document.getElementById('last').href = './viewtopic.php?p=101';
    assert.equal(ctx.contentItemKey(row), 'topic:42');
    row.querySelector('td').insertAdjacentHTML('beforeend', '<div class="postbody">Search result</div>');
    assert.equal(ctx.contentItemKey(row), 'post:101');
});

test('pagination retains ignored-user placeholders as insertion boundaries and loadable items', t => {
    const ctx = setup(t, 'viewtopic.php?t=42', '<div id="pagecontent">' +
        '<table class="tablebg"><tr><td><a name="p1"></a><div class="postbody">Visible</div></td></tr></table>' +
        '<table class="tablebg"><tr><td><a name="p2"></a>Ignored user</td></tr></table></div>');
    assert.deepEqual(Array.from(ctx.getContentItems(), node => ctx.contentItemKey(node)), ['post:1', 'post:2']);
    ctx.document.querySelector('.postbody').closest('table').remove();
    assert.deepEqual(Array.from(ctx.getContentItems(), node => ctx.contentItemKey(node)), ['post:2']);
});

test('live refresh follows the last loaded topic page even when opening a p-only URL', t => {
    const ctx = setup(t, 'viewtopic.php?p=100#p100', '<div id="pageheader"><a class="titles" href="./viewtopic.php?f=10&t=42">Topic</a></div>');
    const latest = base + 'viewtopic.php?f=10&t=42&start=30&lang=ru';
    ctx.rinPaginationState = { max: 3, pages: new Map([[1, { url: ctx.window.location.href }], [3, { url: latest }]]) };
    assert.equal(ctx.getDynamicRefreshUrl(), latest);
    ctx.options.dynamic_content = false;
    assert.equal(ctx.getDynamicRefreshUrl(), ctx.window.location.href);
    ctx.options.dynamic_content = true;
    for (const url of [base + 'viewtopic.php?t=99', 'https://example.org/forum/viewtopic.php?t=42', base + 'search.php?t=42']) {
        ctx.rinPaginationState.pages.set(3, { url });
        assert.equal(ctx.getDynamicRefreshUrl(), ctx.window.location.href);
    }
});

test('forum refresh uses page one only when it is already loaded and belongs to the same forum', t => {
    const ctx = setup(t, 'viewforum.php?f=10&start=30');
    const first = base + 'viewforum.php?f=10';
    ctx.rinPaginationState = { max: 3, pages: new Map([[1, { url: first }], [3, { url: ctx.window.location.href }]]) };
    assert.equal(ctx.getDynamicRefreshUrl(), first);
    ctx.rinPaginationState.pages.delete(1);
    assert.equal(ctx.getDynamicRefreshUrl(), ctx.window.location.href);
    ctx.rinPaginationState.pages.set(1, { url: base + 'viewforum.php?f=11' });
    assert.equal(ctx.getDynamicRefreshUrl(), ctx.window.location.href);
});
