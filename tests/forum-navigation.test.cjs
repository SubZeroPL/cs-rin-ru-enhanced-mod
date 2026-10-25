const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');
const { forumPage, topicPage } = require('../test-support/forum-fixtures.cjs');

function setup(t, { enabled = true, topic = false } = {}) {
    const fixture = topic ? topicPage : forumPage;
    const dom = new JSDOM(fixture(1, [101, 102]), {
        url: `https://cs.rin.ru/forum/${topic ? 'viewtopic.php?t=42' : 'viewforum.php?f=14'}`, pretendToBeVisual: true,
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
            return new window.DOMParser().parseFromString(fixture(2, [103, 104]), 'text/html');
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

test('compact forum pagination moves only page links and preserves native posting controls, counters and topic rows', t => {
    const { ctx, window, document } = setup(t);
    const links = newTopicLinks(document);
    const rows = Array.from(document.querySelectorAll('tr[data-topic]'));
    const subscribe = document.getElementById('forum-subscribe');
    const topControls = document.querySelector('.forum-navigation');
    const counters = Array.from(topControls.querySelectorAll('.nav, td:nth-child(3)'));
    const pagers = document.querySelectorAll('[onclick*="jumpto"]').length;
    ctx.setupInfiniteScroll();
    ctx.setupInfiniteScroll();
    const navigation = document.querySelector('.rin-page-nav');
    assert.ok(navigation);
    assert.deepEqual(newTopicLinks(document), links, 'reuse both existing native actions instead of cloning another one');
    assert.equal(document.querySelectorAll('a.topictitle').length, 3);
    assertTopicRowsVisible(window, rows);
    assert.ok(subscribe.isConnected);
    assert.equal(navigation.querySelector('table, tr, td, th, img'), null);
    assert.equal(topControls.querySelectorAll('tr > td').length, 4, 'preserve the four-cell native layout');
    assert.equal(topControls.classList.contains('rin-page-nav'), false);
    assert.deepEqual(Array.from(topControls.querySelectorAll('.nav, td:nth-child(3)')), counters);
    assert.match(topControls.textContent, /Page\s+1\s+of\s+2/);
    assert.equal(navigation.querySelector('strong').textContent, '1');
    assert.match(navigation.textContent, /Go to page.*Next/);
    assert.doesNotMatch(navigation.textContent, /Page\s+\d|topics/);
    assert.equal(document.querySelectorAll('[onclick*="jumpto"]').length, pagers, 'moving the pager does not create another visible copy');
    assert.equal(document.querySelectorAll('.rin-page-nav').length, 1, 'initialization is idempotent');
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
    assert.equal(document.querySelector('.rin-page-nav strong').textContent, '2');
    assert.match(document.querySelector('.rin-page-nav').textContent, /Go to page.*Previous/);
    assert.equal(newTopicLinks(document).length, nativeActionCount);
    assert.equal(document.querySelectorAll('.rin-page-nav').length, 1);
    assert.equal(document.querySelector('.rin-page-nav div > td, .rin-page-nav div > tr'), null);
    for (let i = 0; i < 3; i++) await scroll();
    assert.equal(requests.length, 1, 'the final page does not trigger repeated requests');
    positions.set('10', 20);
    positions.set('103', 500);
    await scroll();
    assert.equal(document.querySelector('.rin-page-nav strong').textContent, '1');
    assert.equal(newTopicLinks(document).length, nativeActionCount);
    assertTopicRowsVisible(window, originalRows);
});

test('compact topic pagination preserves the native reply button and updates after a same-page refresh', async t => {
    const { ctx, window, document, positions, requests, scroll } = setup(t, { topic: true });
    const nativeButtons = Array.from(document.querySelectorAll('a[href*="posting.php"]'));
    const controls = Array.from(document.querySelectorAll('.forum-navigation'));
    const posts = Array.from(document.querySelectorAll('#pagecontent > table'));
    ctx.setupInfiniteScroll();
    window.scrollY = 1500;
    await scroll();
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0]).searchParams.get('start'), '15');
    assertTopicRowsVisible(window, posts);
    positions.set('101', -100); positions.set('102', -100);
    positions.set('103', 20); positions.set('104', 70);
    await scroll();
    assert.equal(document.querySelector('.rin-page-nav strong').textContent, '2');
    assert.deepEqual(Array.from(document.querySelectorAll('a[href*="posting.php"]')), nativeButtons);
    assert.ok(controls.every(node => node.isConnected && !node.classList.contains('rin-page-nav')));
    assert.equal(document.querySelector('.rin-page-nav table, .rin-page-nav td, .rin-page-nav img'), null);
    assert.doesNotMatch(document.querySelector('.rin-page-nav').textContent, /Page\s+\d|topics/);

    const refreshed = new window.DOMParser().parseFromString(topicPage(2, [103, 104]), 'text/html');
    const refreshedPagination = ctx.getPagination(refreshed, 'https://cs.rin.ru/forum/viewtopic.php?t=42&start=15');
    const previous = Array.from(refreshedPagination.element.querySelectorAll('a')).find(anchor => anchor.textContent === 'Previous');
    previous.textContent = 'Предыдущая';
    vm.runInContext('rinPaginationState', ctx).pages.get(2).pagination = refreshedPagination;
    await scroll();
    const pager = document.querySelector('.rin-page-nav');
    assert.match(pager.textContent, /Предыдущая/);
    const refreshedLink = pager.querySelector('a');
    await scroll();
    assert.equal(pager.querySelector('a'), refreshedLink, 'unchanged refreshes do not rebuild controls');
    assert.equal(document.querySelectorAll('.rin-page-nav').length, 1);
    assert.equal(document.querySelectorAll('[onclick*="jumpto"]').length, 2);
});

test('disabled infinite scrolling leaves native forum navigation and topic rows unchanged', t => {
    const { ctx, document } = setup(t, { enabled: false });
    const original = document.getElementById('pagecontent').innerHTML;
    ctx.setupInfiniteScroll();
    assert.equal(document.querySelector('.rin-page-nav'), null);
    assert.equal(document.getElementById('pagecontent').innerHTML, original);
});
