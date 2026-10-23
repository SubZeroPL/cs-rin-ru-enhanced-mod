const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const { loadFunctions } = require('../test-support/load-functions.cjs');
const base = 'https://cs.rin.ru/forum/';
const title = (href = './viewtopic.php?f=14&t=42') => `<div id="pageheader"><a class="titles" href="${href}">Example topic</a></div>`;
const fields = '<input id="searchBar" value="query"><select id="searchScope"><option value="everywhere">Everywhere</option>' +
    '<option value="thisForum">Forum</option><option value="thisTopic">Topic</option></select>' +
    '<select id="searchTerms"><option value="any">Any</option><option value="all">All</option></select>' +
    '<input type="checkbox" id="searchLocation"><input type="checkbox" id="showAsPosts"><input id="searchAuthor" value="Alice">';
const menu = '<div id="menubar"><table></table><table></table><table><tbody><tr><td></td><td></td></tr></tbody></table></div>';

function setup(t, html, path = 'viewtopic.php?p=123', parameters = {}) {
    const url = new URL(path, base);
    const dom = new JSDOM(html, { url: url.href });
    t.after(() => dom.window.close());
    const location = { href: url.href, search: url.search, pathname: url.pathname, origin: url.origin };
    const notifications = [];
    const ctx = { document: dom.window.document, window: { location }, location, URL, URLSearchParams,
        FORUM_BASE_URL: base, FRIENDS_LIST: [], retrievesFriendsLists: async () => {},
        GM_notification: (...args) => notifications.push(args), notifications,
        options: { special_search: true, special_search_parameter: { searchSubforums: true, searchTopicLocation: 'all',
            sortResultsBy: 't', sortOrderBy: 'd', limitToPrevious: 0, returnFirst: 300,
            searchTermsSpecificity: 'any', showResultsAsPosts: false, showFriends: false, ...parameters } } };
    loadFunctions(ctx, ['searchURL', 'specialSearch', 'getTopicLinkContext', 'getSearchContext']);
    return ctx;
}

test('p-only topic URLs search the native topic/forum and never append null to the author', t => {
    const results = {};
    for (const scope of ['thisTopic', 'thisForum']) {
        const ctx = setup(t, title() + fields);
        ctx.document.getElementById('searchScope').value = scope;
        ctx.searchURL();
        const params = new URL(ctx.window.location.href, base).searchParams;
        results[scope] = { topic: params.get('t'), forum: params.get('fid[]'), author: params.get('author') };
    }
    assert.deepEqual(results, {
        thisTopic: { topic: '42', forum: null, author: 'Alice' },
        thisForum: { topic: '0', forum: '14', author: 'Alice' },
    });
});

test('topic context prefers native metadata and supports complete or partial IDs', t => {
    const cases = [
        [title(), 'viewtopic.php?f=99&t=999', '14', '42'],
        ['<script>var base_url = "./viewtopic.php?f=14&amp;t=42";</script>', 'viewtopic.php?p=123', '14', '42'],
        [title('./viewtopic.php?t=42'), 'viewtopic.php?p=123', null, '42'],
        [title('./viewtopic.php?f=14'), 'viewtopic.php?p=123', '14', null],
        ['', 'viewtopic.php?f=14&t=42', '14', '42'],
        ['', 'viewtopic.php?t=42', null, '42'],
        ['', 'viewtopic.php?f=14', '14', null],
        ['', 'viewtopic.php?p=123', null, null],
    ];
    for (const [html, path, forumId, topicId] of cases) {
        const ctx = setup(t, html, path);
        const actual = ctx.getSearchContext();
        assert.deepEqual({ forumId: actual.forumId, topicId: actual.topicId }, { forumId, topicId }, path + html);
    }
});

test('forum context comes from native titles, the last native breadcrumb or the current URL', t => {
    const breadcrumbs = '<table><tbody><tr><td class="row5"><p class="breadcrumbs"><a class="breadcrumbs" href="./index.php">Board index</a> » ' +
        '<a class="breadcrumbs" href="./viewforum.php?f=3">Parent</a> » <a class="breadcrumbs" href="./viewforum.php?f=14">Forum</a>' +
        '</p></td></tr></tbody></table>';
    for (const [html, path] of [[title('./viewforum.php?f=14'), 'viewforum.php'],
        [breadcrumbs, 'viewtopic.php?p=123'], ['', 'viewforum.php?f=14']]) {
        const ctx = setup(t, html, path);
        const actual = ctx.getSearchContext();
        assert.deepEqual({ forumId: actual.forumId, topicId: actual.topicId }, { forumId: '14', topicId: null });
    }
});

test('external URLs, unrelated pages, invalid IDs and links from user content or previews are ignored', t => {
    const fakeLinks = ['postbody', 'signature'].map(name => `<div class="${name}"><p class="breadcrumbs">` +
        '<a href="./viewforum.php?f=14">Linked forum</a></p><a class="titles" href="./viewtopic.php?f=14&t=42">Linked topic</a></div>').join('') +
        '<div id="topic_preview"><p class="breadcrumbs"><a href="./viewforum.php?f=14">Preview forum</a></p></div>' +
        '<div class="nav"><a href="./viewforum.php?f=14">Navigation link</a></div>';
    const nestedMetadata = ['class="postbody"', 'class="signature"', 'id="topic_preview"'].flatMap(attributes =>
        [title('./viewtopic.php?f=99&t=999'), '<script>var base_url = "./viewtopic.php?f=99&t=999";</script>']
            .map(html => [`<div ${attributes}>${html}</div>`, 'viewtopic.php?p=123']));
    for (const [html, path] of [[title('https://example.org/forum/viewtopic.php?f=14&t=42'), 'viewtopic.php?p=123'],
        [title('./search.php?f=14&t=42'), 'viewtopic.php?p=123'], [title('http://['), 'viewtopic.php?p=123'],
        [title('./viewtopic.php?f=0&t=-1'), 'viewtopic.php?f=bad&t=0'],
        ['<script>var base_url = "./viewtopic.php?f=0&t=0";</script>', 'viewtopic.php?p=123'],
        [fakeLinks, 'viewtopic.php?p=123'], [title(), 'search.php?return=viewtopic.php&f=14&t=42'],
        [title(), 'posting.php?f=14&t=42'], [title(), 'viewtopic.php.extra?f=14&t=42'], ...nestedMetadata]) {
        const ctx = setup(t, html, path);
        const actual = ctx.getSearchContext();
        assert.deepEqual({ forumId: actual.forumId, topicId: actual.topicId }, { forumId: null, topicId: null }, path + html);
    }
});

test('special-search UI offers only scopes with available context', async t => {
    for (const [html, path, scopes] of [[title(), 'viewtopic.php?p=123', ['everywhere', 'thisForum', 'thisTopic']],
        [title('./viewtopic.php?t=42'), 'viewtopic.php?p=123', ['everywhere', 'thisTopic']],
        ['', 'viewforum.php?f=14', ['everywhere', 'thisForum']], ['', 'viewtopic.php?p=123', ['everywhere']],
        [title(), 'search.php?return=viewtopic.php&f=14&t=42', ['everywhere']]]) {
        const ctx = setup(t, menu + html, path);
        await ctx.specialSearch();
        assert.deepEqual([...ctx.document.querySelectorAll('#searchScope option')].map(option => option.value), scopes);
    }
    const disabled = setup(t, menu + title());
    disabled.options.special_search = false;
    await disabled.specialSearch();
    assert.equal(disabled.document.getElementById('searchBar'), null);
});

test('topic, forum and global search preserve options and encode terms and authors exactly once', t => {
    const keywords = 'alpha & beta+é / 😀';
    const author = "Élodie + Bob & 50% O'Neil 😀";
    for (const scope of ['thisTopic', 'thisForum', 'everywhere']) {
        const ctx = setup(t, title() + fields, 'viewtopic.php?p=123', { searchSubforums: false,
            searchTopicLocation: 'msgonly', sortResultsBy: 'a', sortOrderBy: 'a', limitToPrevious: 7, returnFirst: 42 });
        ctx.document.getElementById('searchScope').value = scope;
        ctx.document.getElementById('searchBar').value = keywords;
        ctx.document.getElementById('searchAuthor').value = author;
        ctx.document.getElementById('searchTerms').value = 'all';
        ctx.document.getElementById('searchLocation').checked = scope === 'thisTopic';
        ctx.document.getElementById('showAsPosts').checked = scope !== 'thisForum';
        ctx.searchURL();
        const url = new URL(ctx.window.location.href, base);
        assert.equal(url.pathname, '/forum/search.php');
        assert.deepEqual(Object.fromEntries(url.searchParams), {
            keywords, terms: 'all', author, sc: 'false', sf: scope === 'thisTopic' ? 'firstpost' : 'msgonly',
            sk: 'a', sd: 'a', sr: scope === 'thisForum' ? 'topics' : 'posts', st: '7', ch: '42',
            t: scope === 'thisTopic' ? '42' : '0', ...(scope === 'thisForum' ? { 'fid[]': '14' } : {}),
        });
    }
});

test('button and Enter use fresh context; missing selected scopes notify without navigating', async t => {
    for (const event of ['click', 'Enter']) {
        const ctx = setup(t, menu + title());
        await ctx.specialSearch();
        ctx.document.querySelector('#pageheader a.titles').setAttribute('href', './viewtopic.php?f=77&t=88');
        ctx.document.getElementById('searchScope').value = 'thisTopic';
        if (event === 'click') ctx.document.getElementById('searchButton').click();
        else ctx.document.getElementById('searchBar').dispatchEvent(new ctx.document.defaultView.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
        assert.equal(new URL(ctx.window.location.href, base).searchParams.get('t'), '88');
    }
    for (const scope of ['thisTopic', 'thisForum']) {
        const ctx = setup(t, title() + fields);
        ctx.document.getElementById('searchScope').value = scope;
        ctx.document.getElementById('pageheader').remove();
        const before = ctx.window.location.href;
        ctx.searchURL();
        assert.equal(ctx.window.location.href, before);
        assert.equal(ctx.notifications.length, 1);
    }
});
