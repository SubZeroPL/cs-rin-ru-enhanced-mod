const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const functionNames = ['addLinkToQuote', 'AddLinkQuote', 'linkQuoteAuthors', 'collapseQuotes',
    'functionsCalledByInfiniteScrolls', 'previewElement', 'getTopicLinkContext',
    'getFullPathPostLink', 'addFullPathPostLinks'];
const base = 'https://cs.rin.ru/forum/';
const onion = 'csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion';
const permalink = id => `${base}viewtopic.php?p=${id}#p${id}`;

function quote(id = '123', title = 'Alice wrote:', href = permalink(id)) {
    return `<div class="quotetitle">${title}</div><div class="quotecontent">\n` +
        `<a class="postlink-local" href="${href}">Source</a>\n<br>Quoted text</div>`;
}

function setup(t, html = '', settings = {}) {
    const dom = new JSDOM(html, { url: settings.url || `${base}viewtopic.php?t=42` });
    t.after(() => dom.window.close());
    const { window } = dom;
    const timers = [];
    const context = {
        window, document: window.document, DOMParser: window.DOMParser, URL, URLSearchParams, console,
        FORUM_BASE_URL: settings.base || base,
        options: { add_link_quote: true, collapse_quotes: false, topic_preview_timeout: 0, ...settings.options },
        setTimeout: callback => timers.push(callback), clearTimeout: () => {},
        fetchForumDocument: async () => assert.fail('Unexpected request'),
    };
    for (const name of ['dynamicFunction', 'mentionify', 'quotify', 'tagify', 'hideScs',
        'setupTopicPreview', 'setupPostPreview', 'setupProfilePreview', 'addLink', 'steamDBLink',
        'addUsersTag', 'changeTopicLink', 'colorizeFriendsMe', 'showAllSpoilers', 'setupQuoteExtras', 'addFriendButtons']) context[name] = () => {};
    loadFunctions(context, functionNames);
    context.flushTimers = async () => { await Promise.resolve(); while (timers.length) await timers.shift()(); };
    return context;
}

function assertNestedBBCode(message) {
    const stack = [];
    for (const [, closing, tag] of message.matchAll(/\[(\/)?(quote|url)(?:=[^\]]*)?\]/g)) {
        if (closing) assert.equal(stack.pop(), tag, 'BBCode closes in nesting order');
        else stack.push(tag);
    }
    assert.deepEqual(stack, []);
}

test('generated quotes keep a plain author and a valid Source link inside the body', t => {
    const ctx = setup(t);
    for (const message of ['[quote="Alice"]Hello[/quote]',
        'Before\n[quote="Élodie & Bob"][quote="Other"]Nested[/quote]Reply[/quote]',
        '[quote]Anonymous[/quote]']) {
        const result = ctx.addLinkToQuote(message, '123');
        const opening = message.match(/\[quote[^\]]*\]/)[0];
        assert.ok(result.includes(`${opening}[url=${permalink('123')}]Source[/url]\n`));
        assert.equal(result.match(/\]Source\[\/url\]/g).length, 1);
        assert.equal(result.replace(`[url=${permalink('123')}]Source[/url]\n`, ''), message);
        assertNestedBBCode(result);
    }
    assert.equal(ctx.addLinkToQuote('Unquoted text', '123'), 'Unquoted text');
});

test('normal quote form adds the same valid fallback', t => {
    const ctx = setup(t, '<textarea name="message">[quote="Alice"]Hello[/quote]</textarea>',
        { url: `${base}posting.php?mode=quote&p=123` });
    ctx.AddLinkQuote();
    assert.equal(ctx.document.querySelector('textarea').value,
        `[quote="Alice"][url=${permalink('123')}]Source[/url]\nHello[/quote]`);
});

test('private-message quote forms never receive public post links, with or without a SID', t => {
    for (const sid of ['', '&sid=session']) {
        const message = '[quote="Alice"]Private reply[/quote]';
        const ctx = setup(t, `<textarea name="message">${message}</textarea>`,
            { url: `${base}ucp.php?i=pm&mode=compose&action=quote&p=123${sid}` });
        ctx.AddLinkQuote();
        assert.equal(ctx.document.querySelector('textarea').value, message);
    }
});

test('quote form respects the option and leaves edits and post/private-message previews alone', t => {
    for (const [query, options] of [['mode=quote&p=123', { add_link_quote: false }],
        ['mode=edit&p=123'], ['mode=reply&p=123&t=42'], ['mode=compose&p=123&sid=session'], ['mode=reply']]) {
        const ctx = setup(t, '<textarea name="message">[quote="Alice"]Hello[/quote]</textarea>',
            { url: `${base}posting.php?${query}`, options });
        const textarea = ctx.document.querySelector('textarea');
        const before = textarea.value;
        ctx.AddLinkQuote();
        assert.equal(textarea.value, before, query);
    }
    assert.doesNotThrow(() => setup(t).AddLinkQuote());
});

test('enhancement preserves the forum title markup and color, hiding only the fallback line', t => {
    const ctx = setup(t, quote('123', '<span style="color: #dd3344"><strong>Alice &amp; Bob</strong></span> a écrit :'));
    const title = ctx.document.querySelector('.quotetitle');
    const oldMarkup = title.innerHTML;
    const oldText = title.textContent;
    const source = ctx.document.querySelector('.quotecontent a');
    const lineBreak = ctx.document.querySelector('br');
    assert.equal(source.hidden, false, 'no-script fallback remains visible');
    assert.equal(lineBreak.hidden, false);
    ctx.linkQuoteAuthors();
    const author = title.querySelector('a');
    assert.equal(author.href, permalink('123'));
    assert.equal(author.innerHTML, oldMarkup);
    assert.equal(title.textContent, oldText);
    assert.equal(author.style.color, 'inherit');
    assert.equal(source.hidden, true);
    assert.equal(lineBreak.hidden, true);
    assert.ok(ctx.document.querySelector('.quotecontent').textContent.includes('Quoted text'));
    const enhancedMarkup = ctx.document.body.innerHTML;
    ctx.linkQuoteAuthors();
    ctx.linkQuoteAuthors();
    assert.equal(ctx.document.body.innerHTML, enhancedMarkup, 'enhancement is idempotent');
});

test('disabled option leaves the complete fallback and original header visible', t => {
    const ctx = setup(t, quote(), { options: { add_link_quote: false } });
    const before = ctx.document.body.innerHTML;
    ctx.linkQuoteAuthors();
    assert.equal(ctx.document.body.innerHTML, before);
    assert.equal(ctx.document.querySelector('.quotecontent a').hidden, false);
});

test('absolute, relative and onion post permalinks are supported', t => {
    for (const href of [permalink('123'), './viewtopic.php?p=123#p123',
        'viewtopic.php?f=10&p=123#p123', `/forum/viewtopic.php?p=123#p123`,
        `http://${onion}/forum/viewtopic.php?p=123#p123`]) {
        const ctx = setup(t, quote('123', 'Alice wrote:', href));
        ctx.linkQuoteAuthors();
        assert.equal(ctx.document.querySelector('.quotetitle a')?.href, new URL(href, base).href, href);
        assert.equal(ctx.document.querySelector('.quotecontent a').hidden, true, href);
    }
    const onionBase = `http://${onion}/forum/`;
    const ctx = setup(t, quote('123', 'Alice wrote:', './viewtopic.php?p=123#p123'),
        { base: onionBase, url: `${onionBase}viewtopic.php?t=42` });
    ctx.linkQuoteAuthors();
    assert.equal(ctx.document.querySelector('.quotetitle a').href, `${onionBase}viewtopic.php?p=123#p123`);
});

test('untrusted or malformed source destinations leave fallback and title untouched', t => {
    for (const href of ['https://example.org/forum/viewtopic.php?p=123#p123',
        'https://cs.rin.ru.evil.example/forum/viewtopic.php?p=123#p123',
        'javascript:alert(1)', 'http://[', 'https://cs.rin.ru:8080/forum/viewtopic.php?p=123#p123',
        'https://alice@cs.rin.ru/forum/viewtopic.php?p=123#p123',
        `${base}memberlist.php?p=123#p123`, 'https://cs.rin.ru/viewtopic.php?p=123#p123',
        `${base}viewtopic.php?p=abc#pabc`, `${base}viewtopic.php?p=-1#p-1`,
        `${base}viewtopic.php?p=#p`, `${base}viewtopic.php?t=123#p123`,
        `${base}viewtopic.php?p=123#p456`, `${base}viewtopic.php?p=123`,
        `${base}viewtopic.php?p=123#unread`]) {
        const ctx = setup(t, quote('123', 'Alice wrote:', href));
        const before = ctx.document.body.innerHTML;
        ctx.linkQuoteAuthors();
        assert.equal(ctx.document.body.innerHTML, before, href);
    }
});

test('existing links, unknown structure and non-leading Source links are left alone', t => {
    for (const html of [quote('123', '<a href="/forum/memberlist.php?u=1">Alice</a> wrote:'),
        quote('123', ''), quote().replace('quotetitle', 'unknown-title'),
        quote().replace('<div class="quotetitle">Alice wrote:</div>', ''),
        quote().replace('<div class="quotecontent">', '<hr><div class="quotecontent">'),
        quote().replace('\n<a', 'Text before the source<a'),
        quote().replace('>Source</a>', '>Other label</a>'),
        quote().replace('\n<a', '<p><a').replace('</a>\n<br>', '</a></p><br>'),
        `<div class="quotetitle">Alice wrote:</div><div class="quotecontent">No source</div>`]) {
        const ctx = setup(t, html);
        const before = ctx.document.body.innerHTML;
        ctx.linkQuoteAuthors();
        assert.equal(ctx.document.body.innerHTML, before);
    }
    const ctx = setup(t, quote());
    const legacyLink = ctx.document.createElement('a');
    legacyLink.href = permalink('999');
    legacyLink.append(...ctx.document.body.childNodes);
    ctx.document.body.append(legacyLink);
    const before = ctx.document.body.innerHTML;
    ctx.linkQuoteAuthors();
    assert.equal(ctx.document.body.innerHTML, before, 'a legacy anchor around the quote is preserved');
});

test('nested quotes use their own leading source without borrowing a descendant link', t => {
    const ctx = setup(t, '<div class="quotetitle">Outer without source wrote:</div>' +
        `<div class="quotecontent">${quote('456', 'Inner wrote:')}</div>` +
        quote('123', 'Outer with source wrote:').replace('Quoted text', quote('789', 'Second inner wrote:')));
    ctx.linkQuoteAuthors();
    const titles = [...ctx.document.querySelectorAll('.quotetitle')];
    assert.equal(titles[0].querySelector('a'), null);
    assert.deepEqual(titles.slice(1).map(title => title.querySelector('a').href),
        ['456', '123', '789'].map(permalink));
    assert.ok([...ctx.document.querySelectorAll('.quotecontent > a')].every(source => source.hidden));
});

test('infinite scroll enhances new quotes before collapsing them and remains repeatable', t => {
    const ctx = setup(t, quote('123'), { options: { collapse_quotes: true } });
    ctx.functionsCalledByInfiniteScrolls(ctx.document);
    assert.equal(ctx.document.querySelector('.quotetitle a').href, permalink('123'));
    assert.equal(ctx.document.querySelector('.quotecontent').style.display, 'none');
    assert.equal(ctx.document.querySelector('a.postlink-local').hidden, true);
    const firstButton = ctx.document.querySelector('input');
    assert.equal(firstButton.value, 'Show');
    firstButton.dispatchEvent(new ctx.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(firstButton.value, 'Hide');
    assert.equal(ctx.document.querySelector('a.postlink-local').hidden, true);
    ctx.document.body.insertAdjacentHTML('beforeend', quote('456', 'Bob wrote:'));
    ctx.functionsCalledByInfiniteScrolls(ctx.document);
    ctx.functionsCalledByInfiniteScrolls(ctx.document);
    assert.deepEqual([...ctx.document.querySelectorAll('.quotetitle a')].map(link => link.href),
        ['123', '456'].map(permalink));
    assert.equal(ctx.document.querySelectorAll('input').length, 2, 'one collapse toggle per quote');
    assert.equal(firstButton.value, 'Hide', 'existing collapse state is retained');
    assert.ok([...ctx.document.querySelectorAll('a.postlink-local')].every(source => source.hidden));
});

test('hover previews enhance fetched quotes on creation and replacement', async t => {
    const ctx = setup(t, '<a id="preview-trigger" href="#">Preview</a>');
    const trigger = ctx.document.querySelector('#preview-trigger');
    let id = '123';
    ctx.fetchForumDocument = async url => {
        assert.equal(url, `${base}viewtopic.php?t=42`);
        return new ctx.DOMParser().parseFromString('<div><div id="pagecontent"><table class="tablebg"><tbody><tr><td>' +
            `<a name="p${id}"></a><b class="postauthor">Bob</b></td></tr><tr><td><div class="postbody">` +
            quote(id) + '</div></td></tr></tbody></table></div></div>', 'text/html');
    };
    ctx.previewElement(trigger, `${base}viewtopic.php?t=42`, () => 0);
    for (const postId of ['123', '456']) {
        id = postId;
        trigger.dispatchEvent(new ctx.window.MouseEvent('mouseover', { bubbles: true }));
        await ctx.flushTimers();
        const preview = ctx.document.querySelector('#topic_preview');
        assert.equal(ctx.document.querySelectorAll('#topic_preview').length, 1);
        assert.equal(preview.querySelector('.quotetitle a').href, permalink(postId));
        assert.equal(preview.querySelector('.quotecontent a').hidden, true);
    }
});
