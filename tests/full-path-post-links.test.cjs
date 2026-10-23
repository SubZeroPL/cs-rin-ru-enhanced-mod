const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const functionNames = ['getTopicLinkContext', 'getFullPathPostLink', 'addFullPathPostLinks',
    'functionsCalledByInfiniteScrolls', 'previewElement', 'setupPostPreview', 'addLink'];
const base = 'https://cs.rin.ru/forum/';
const onionBase = 'http://csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion/forum/';
const header = (f = '10', t = '20') => `<div id="pageheader"><a class="titles" href="./viewtopic.php?f=${f}&amp;t=${t}">Topic</a></div>`;
const icon = (id = '123', file = 'icon_post_target.gif') =>
    `<a href="./viewtopic.php?p=${id}#p${id}"><img src="./styles/rinDark/imageset/${file}"></a>`;
const post = id => `<table class="tablebg"><tbody><tr><td><a name="p${id}"></a><b class="postauthor">Alice</b></td>` +
    `<td class="gensmall">${icon(id)}</td></tr><tr><td colspan="2"><div class="postbody">Post ${id}</div></td></tr>` +
    `<tr><td></td><td><div class="gensmall"><a href="./posting.php?mode=quote&p=${id}"><img title="Reply with quote"></a></div></td></tr></tbody></table>`;
const response = (posts, context = header('77', '888')) => `<div>${context}<div id="pagecontent">${posts}</div></div>`;

function setup(t, html = '', options = {}, forumBase = base) {
    const dom = new JSDOM(html, { url: `${forumBase}viewtopic.php?f=10&t=20` });
    t.after(() => dom.window.close());
    const timers = [];
    const clipboard = [];
    const ctx = {
        window: dom.window, document: dom.window.document, DOMParser: dom.window.DOMParser,
        URL, URLSearchParams, console, FORUM_BASE_URL: forumBase,
        options: { topic_preview_timeout: 0, ...options },
        navigator: { clipboard: { writeText: value => clipboard.push(value) } }, clipboard,
        setTimeout: callback => timers.push(callback), clearTimeout: () => {},
        fetchForumDocument: async () => assert.fail('Unexpected request'),
    };
    for (const name of ['dynamicFunction', 'mentionify', 'quotify', 'tagify', 'hideScs', 'setupTopicPreview',
        'setupProfilePreview', 'steamDBLink', 'addUsersTag', 'changeTopicLink', 'colorizeFriendsMe',
        'showAllSpoilers', 'linkQuoteAuthors', 'collapseQuotes', 'setupQuoteExtras', 'addFriendButtons']) ctx[name] = () => {};
    loadFunctions(ctx, functionNames);
    ctx.flushTimers = async () => { await Promise.resolve(); while (timers.length) await timers.shift()(); };
    return ctx;
}

test('topic context uses the real title or inline base_url without executing scripts', t => {
    for (const forumBase of [base, onionBase]) {
        const ctx = setup(t, header() + '<script>var base_url = "./viewtopic.php?f=30&amp;t=40";</script>', {}, forumBase);
        assert.equal(ctx.getTopicLinkContext().href, `${forumBase}viewtopic.php?f=10&t=20`);
        ctx.document.querySelector('#pageheader').remove();
        assert.equal(ctx.getTopicLinkContext().href, `${forumBase}viewtopic.php?f=30&t=40`);
        ctx.document.querySelector('script').textContent = "var base_url = './viewtopic.php?f=50&amp;t=60'; throw new Error('never execute');";
        assert.equal(ctx.getTopicLinkContext().href, `${forumBase}viewtopic.php?f=50&t=60`);
    }
});

test('missing, external and malformed context leaves native links unchanged without throwing', t => {
    for (const context of ['', header('bad', '20'), header('10', ''),
        '<div id="pageheader"><a class="titles" href="http://[">Broken</a></div>',
        '<script>var base_url = "https://example.org/forum/viewtopic.php?f=10&t=20";</script>',
        '<script src="remote.js">var base_url = "./viewtopic.php?f=10&t=20";</script>']) {
        const ctx = setup(t, context + icon());
        const before = ctx.document.body.innerHTML;
        assert.equal(ctx.getTopicLinkContext(), null);
        assert.doesNotThrow(() => ctx.addFullPathPostLinks());
        assert.equal(ctx.document.body.innerHTML, before);
    }
});

test('builder includes forum/topic IDs, preserves extra query parameters and hash, and defaults on', t => {
    for (const forumBase of [base, onionBase]) {
        const ctx = setup(t, header(), {}, forumBase);
        const topic = ctx.getTopicLinkContext();
        for (const href of ['./viewtopic.php?p=123&start=40&sid=abc#p123',
            `${forumBase}viewtopic.php?f=10&p=123&start=40&sid=abc#p123`,
            './viewtopic.php?t=20&p=123&start=40&sid=abc#p123']) {
            assert.equal(ctx.getFullPathPostLink(href, topic),
                `${forumBase}viewtopic.php?f=10&t=20&p=123&start=40&sid=abc#p123`);
        }
        assert.equal(ctx.getFullPathPostLink('./viewtopic.php?p=123#unread', topic), `${forumBase}viewtopic.php?f=10&t=20&p=123#unread`);
        ctx.options.full_path_post_links = false;
        assert.equal(ctx.getFullPathPostLink('./viewtopic.php?p=123#p123', topic), './viewtopic.php?p=123#p123');
    }
});

test('builder preserves complete, different-topic, external and invalid post links exactly', t => {
    const ctx = setup(t, header());
    for (const href of ['./viewtopic.php?p=123&t=20&f=10#p123', './viewtopic.php?t=99&p=123#p123',
        './viewtopic.php?f=99&p=123#p123', './viewtopic.php?p=no#pno', './viewtopic.php?t=20',
        'https://example.org/forum/viewtopic.php?p=123#p123', 'javascript:alert(1)', 'http://[',
        'https://alice@cs.rin.ru/forum/viewtopic.php?p=123#p123', './memberlist.php?p=123#p123']) {
        assert.equal(ctx.getFullPathPostLink(href, ctx.getTopicLinkContext()), href);
        assert.equal(ctx.getFullPathPostLink(href, null), href);
    }
});

test('only native post-target icons outside user content are rewritten', t => {
    const excluded = ['postbody', 'signature', 'quotecontent', 'quotetitle', 'codecontent']
        .map(name => `<div class="${name}">${icon()}</div>`).join('');
    const ctx = setup(t, header() + `<section id="native">${icon()}${icon('456', 'icon_post_target_unread.gif')}</section>` +
        `<section id="excluded">${excluded}${icon('123', 'icon_post_target_custom.png')}<a href="./viewtopic.php?p=123#p123">Body link</a></section>`);
    const excludedBefore = ctx.document.querySelector('#excluded').innerHTML;
    ctx.addFullPathPostLinks();
    assert.deepEqual([...ctx.document.querySelectorAll('#native a')].map(a => a.href),
        ['123', '456'].map(id => `${base}viewtopic.php?f=10&t=20&p=${id}#p${id}`));
    assert.equal(ctx.document.querySelector('#excluded').innerHTML, excludedBefore);
    const enhanced = ctx.document.body.innerHTML;
    ctx.addFullPathPostLinks();
    assert.equal(ctx.document.body.innerHTML, enhanced);
    const disabled = setup(t, header() + icon(), { full_path_post_links: false });
    const before = disabled.document.body.innerHTML;
    disabled.addFullPathPostLinks();
    assert.equal(disabled.document.body.innerHTML, before);
});

test('infinite-scroll callbacks rewrite newly appended native links before other processing', t => {
    const ctx = setup(t, header() + icon());
    const seen = [];
    ctx.mentionify = () => seen.push(ctx.document.querySelector('a:last-of-type > img').parentElement.href);
    ctx.functionsCalledByInfiniteScrolls();
    ctx.document.body.insertAdjacentHTML('beforeend', icon('456'));
    ctx.functionsCalledByInfiniteScrolls();
    ctx.functionsCalledByInfiniteScrolls();
    assert.equal(seen.length, 3, 'each enhancement pass reaches the next processing step');
    assert.ok(seen.every(href => href.includes('?f=10&t=20&p=')));
    assert.equal(ctx.document.querySelector('body > a:last-child').href, `${base}viewtopic.php?f=10&t=20&p=456#p456`);
});

test('hover preview uses fetched topic context and p takes priority over t', async t => {
    const href = `${base}viewtopic.php?f=77&t=888&p=222#p222`;
    const ctx = setup(t, header() + `<a class="postlink" href="${href}">Preview</a>`,
        { post_preview: true, topic_preview: true });
    ctx.fetchForumDocument = async url => {
        assert.equal(url, href, 'the specific post parameter must survive');
        return new ctx.DOMParser().parseFromString(response(post('111') + post('222')), 'text/html');
    };
    ctx.setupPostPreview();
    ctx.document.querySelector('a.postlink').dispatchEvent(new ctx.window.MouseEvent('mouseover', { bubbles: true }));
    await assert.doesNotReject(() => ctx.flushTimers());
    const preview = ctx.document.querySelector('#topic_preview');
    assert.equal(preview.querySelector('.postbody').textContent, 'Post 222');
    assert.equal(preview.querySelector('a[href] > img[src*="icon_post_target"]').parentElement.href, href, 'fetched context overrides host-page topic');
    ctx.fetchForumDocument = async () => new ctx.DOMParser().parseFromString(response(post('111')), 'text/html');
    ctx.document.querySelector('a.postlink').dispatchEvent(new ctx.window.MouseEvent('mouseover', { bubbles: true }));
    await assert.doesNotReject(() => ctx.flushTimers(), 'a missing post is safe');
});

test('preview without fetched topic context never borrows the host topic', async t => {
    const ctx = setup(t, header() + '<a id="trigger">Preview</a>');
    ctx.fetchForumDocument = async () => new ctx.DOMParser().parseFromString(response(post('222'), ''), 'text/html');
    ctx.previewElement(ctx.document.querySelector('#trigger'), `${base}viewtopic.php?p=222`, () => 0);
    ctx.document.getElementById('trigger').dispatchEvent(new ctx.window.MouseEvent('mouseover', { bubbles: true }));
    await ctx.flushTimers();
    assert.equal(ctx.document.querySelector('#topic_preview a[href] > img[src*="icon_post_target"]').parentElement.getAttribute('href'), './viewtopic.php?p=222#p222');
});

test('copy-link button uses the full-path builder and respects the disabled option', async t => {
    const html = header() + `<div id="pagecontent">${post('123')}</div>`;
    for (const enabled of [true, false]) {
        const ctx = setup(t, html, { copy_link_button: true, full_path_post_links: enabled });
        ctx.addLink();
        ctx.document.querySelector('.rin-copy-link').dispatchEvent(new ctx.window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await ctx.flushTimers();
        assert.deepEqual(ctx.clipboard, [`${base}viewtopic.php?${enabled ? 'f=10&t=20&' : ''}p=123#p123`]);
    }
});
