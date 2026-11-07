const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const base = 'https://cs.rin.ru/forum/';
const post = (id, marker = '', body = `Post ${id}`) => `<table class="tablebg"><tbody><tr><td>${marker}<a name="p${id}"></a></td></tr><tr><td><div class="postbody">${body}</div></td></tr></tbody></table>`;

function setup(t, html, option, posts) {
    const dom = new JSDOM(html, { url: `${base}viewtopic.php?t=1` });
    t.after(() => dom.window.close());
    const timers = [];
    const requests = [];
    const ctx = {
        window: dom.window, document: dom.window.document, URL, URLSearchParams,
        FORUM_BASE_URL: base, options: { topic_preview: true, post_preview: true, topic_preview_option: option, topic_preview_timeout: 0 },
        setTimeout: callback => timers.push(callback), clearTimeout: () => {},
        fetchForumDocument: async link => {
            requests.push(link);
            return new dom.window.DOMParser().parseFromString(`<div id="pagecontent">${posts}</div>`, 'text/html');
        },
        console: { warn: error => assert.fail(String(error)) },
    };
    for (const name of ['addFullPathPostLinks', 'linkQuoteAuthors', 'steamDBLink', 'addUsersTag', 'showAllSpoilers', 'collapseQuotes']) ctx[name] = () => {};
    loadFunctions(ctx, ['setupTopicPreview', 'setupPostPreview']);
    return { ctx, requests, async hover() {
        ctx.setupTopicPreview();
        ctx.setupPostPreview();
        ctx.document.getElementById('target').dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
        while (timers.length) await timers.shift()();
        return ctx.document.querySelector('#topic_preview .postbody')?.textContent;
    } };
}

test('last-post preview of an inline topic link stays in that topic and requests newest-first', async t => {
    const { hover, requests } = setup(t, '<table><tr><td class="postbody"><a id="target" class="postlink-local" href="./viewtopic.php?t=42">Topic</a><a class="postlink-local" href="./viewtopic.php?t=999&p=900#p900">Unrelated post</a></td></tr></table>', 2, post(500) + post(499));
    assert.equal(await hover(), 'Post 500');
    assert.equal(requests.length, 1);
    const url = new URL(requests[0]);
    assert.equal(url.searchParams.get('t'), '42');
    assert.equal(url.searchParams.get('p'), null);
    assert.equal(url.searchParams.get('sk'), 't');
    assert.equal(url.searchParams.get('sd'), 'd');
});

test('native last-post link selects its exact post even with descending account order', async t => {
    const { hover, requests } = setup(t, '<table><tr><td><a id="target" class="topictitle" href="./viewtopic.php?t=42">Topic</a></td><td><a href="./viewtopic.php?t=42&p=500#p500"><img src="./styles/rinDark/imageset/icon_topic_latest.gif"></a></td></tr></table>', 2, post(500) + post(499));
    assert.equal(await hover(), 'Post 500');
    assert.equal(new URL(requests[0]).searchParams.get('p'), '500');
});

test('native topic row cannot redirect a last-post preview to a different explicit topic', async t => {
    const { hover, requests } = setup(t, '<table><tr><td><a id="target" class="topictitle" href="./viewtopic.php?t=42">Topic</a></td><td><a href="./viewtopic.php?t=999&p=900#p900"><img src="./styles/rinDark/imageset/icon_topic_latest.gif"></a></td></tr></table>', 2, post(500));
    assert.equal(await hover(), 'Post 500');
    assert.equal(new URL(requests[0]).searchParams.get('t'), '42');
    assert.equal(new URL(requests[0]).searchParams.get('p'), null);
});

test('first-unread topic preview selects the native unread marker inside a later post', async t => {
    const { hover, requests } = setup(t, '<a id="target" class="topictitle" href="./viewtopic.php?t=42">Topic</a>', 1,
        post(100, '', '<a name="unread"></a>Already read') + post(101, '<a name="unread"></a>') + post(102));
    assert.equal(await hover(), 'Post 101');
    assert.equal(new URL(requests[0]).searchParams.get('view'), 'unread');
});

test('first-unread previews also work on inline topic links', async t => {
    const { hover } = setup(t, '<a id="target" class="postlink-local" href="./viewtopic.php?t=42">Topic</a>', 1,
        post(100) + post(101, '<a id="unread"></a>'));
    assert.equal(await hover(), 'Post 101');
});

test('first-post preview retains its original target and ordinary post links keep their exact ID', async t => {
    const first = setup(t, '<a id="target" class="topictitle" href="./viewtopic.php?t=42">Topic</a>', 0, post(100) + post(101));
    assert.equal(await first.hover(), 'Post 100');
    assert.equal(new URL(first.requests[0]).searchParams.get('sd'), null);
    const exact = setup(t, '<a id="target" class="postlink-local" href="./viewtopic.php?t=42&p=101#p101">Post</a>', 2, post(100) + post(101) + post(102));
    assert.equal(await exact.hover(), 'Post 101');
});
