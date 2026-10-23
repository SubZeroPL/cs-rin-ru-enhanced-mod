const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');
const { forumPage } = require('../test-support/forum-fixtures.cjs');

function setup(t, { enabled = true } = {}) {
    const dom = new JSDOM(forumPage(1, [101, 102]), {
        url: 'https://cs.rin.ru/forum/viewforum.php?f=14', pretendToBeVisual: true,
    });
    t.after(() => dom.window.close());
    const { window } = dom;
    const frames = [];
    const positions = new Map([['10', 300], ['101', 350], ['102', 400]]);
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        const top = positions.get(this.dataset.topic) ?? -100;
        return { top, bottom: top + 40, height: 40, left: 0, right: 800, width: 800 };
    };
    window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
    window.scrollBy = () => {};
    Object.defineProperties(window, {
        innerHeight: { configurable: true, writable: true, value: 800 },
        scrollY: { configurable: true, writable: true, value: 0 },
    });
    Object.defineProperty(window.document.documentElement, 'scrollHeight', { configurable: true, value: 2500 });
    const requests = [];
    const enhanced = [];
    const ctx = {
        window, document: window.document, URL, URLSearchParams,
        getComputedStyle: window.getComputedStyle.bind(window),
        FORUM_BASE_URL: 'https://cs.rin.ru/forum/',
        options: { infinite_scrolling: enabled },
        functionsCalledByInfiniteScrolls: (page, node) => enhanced.push(node),
        fetchForumDocument: async href => {
            requests.push(href);
            return new window.DOMParser().parseFromString(forumPage(2, [103, 104]), 'text/html');
        },
        notifyRin: () => assert.fail('No pagination error is expected'),
        console: { warn: () => assert.fail('No pagination warning is expected') },
    };
    const scroll = async () => {
        window.dispatchEvent(new window.Event('scroll'));
        while (frames.length) frames.shift()(0);
        await new Promise(resolve => setImmediate(resolve));
    };
    loadFunctions(ctx, ['setupInfiniteScroll']);
    return { ctx, window, document: window.document, positions, requests, enhanced, scroll };
}

function newTopicLinks(document) {
    return Array.from(document.querySelectorAll('a[href]')).filter(anchor => {
        const url = new URL(anchor.href);
        return url.pathname.endsWith('/posting.php') && url.searchParams.get('mode') === 'post';
    });
}

function assertTopicRowsVisible(window, rows) {
    for (const row of rows) {
        assert.ok(row.isConnected, 'the native topic row remains attached');
        for (let element = row; element; element = element.parentElement) {
            assert.equal(element.hidden, false);
            assert.notEqual(window.getComputedStyle(element).display, 'none');
        }
    }
}

test('native forum navigation remains a table without duplicating new-topic controls or hiding topic rows', t => {
    const { ctx, window, document } = setup(t);
    const links = newTopicLinks(document);
    const rows = Array.from(document.querySelectorAll('tr[data-topic]'));
    const subscribe = document.getElementById('forum-subscribe');
    ctx.setupInfiniteScroll();
    const navigation = document.querySelector('.rin-page-nav');
    assert.ok(navigation);
    assert.deepEqual(newTopicLinks(document), links, 'reuse both existing native actions instead of cloning another one');
    assert.equal(document.querySelectorAll('a.topictitle').length, 3);
    assertTopicRowsVisible(window, rows);
    assert.ok(subscribe.isConnected);
    assert.equal(navigation.querySelector('div > td, div > tr'), null);
    assert.equal(navigation.querySelectorAll('table tr > td').length, 4, 'preserve the four-cell native layout');
    assert.match(navigation.textContent, /Page\s+1\s+of\s+2/);
});

test('forum scrolling appends unique topics and updates the visible-page navigation without duplicating controls', async t => {
    const { ctx, window, document, positions, requests, enhanced, scroll } = setup(t);
    const originalRows = Array.from(document.querySelectorAll('tr[data-topic]'));
    const nativeActionCount = newTopicLinks(document).length;
    ctx.setupInfiniteScroll();
    window.scrollY = 1500;
    await scroll();
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0]).searchParams.get('start'), '100');
    assert.deepEqual(Array.from(document.querySelectorAll('tr[data-topic]'), row => row.dataset.topic), ['10', '101', '102', '103', '104']);
    assert.equal(enhanced.length, 2, 'the repeated announcement is not appended or enhanced again');
    assertTopicRowsVisible(window, originalRows);
    for (const id of ['10', '101', '102']) positions.set(id, -100);
    positions.set('103', 20);
    positions.set('104', 70);
    await scroll();
    assert.match(document.querySelector('.rin-page-nav').textContent, /Page\s+2\s+of\s+2/);
    assert.equal(newTopicLinks(document).length, nativeActionCount);
    assert.equal(document.querySelectorAll('.rin-page-nav').length, 1);
    assert.equal(document.querySelector('.rin-page-nav div > td, .rin-page-nav div > tr'), null);
    for (let i = 0; i < 3; i++) await scroll();
    assert.equal(requests.length, 1, 'the final page does not trigger repeated requests');
    positions.set('10', 20);
    positions.set('103', 500);
    await scroll();
    assert.match(document.querySelector('.rin-page-nav').textContent, /Page\s+1\s+of\s+2/);
    assert.equal(newTopicLinks(document).length, nativeActionCount);
    assertTopicRowsVisible(window, originalRows);
});

test('disabled infinite scrolling leaves native forum navigation and topic rows unchanged', t => {
    const { ctx, document } = setup(t, { enabled: false });
    const original = document.getElementById('pagecontent').innerHTML;
    ctx.setupInfiniteScroll();
    assert.equal(document.querySelector('.rin-page-nav'), null);
    assert.equal(document.getElementById('pagecontent').innerHTML, original);
});
