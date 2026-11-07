const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');
const quote = (body, id = 'outer', style = '') => `<div class="quotetitle" id="${id}-title">Example wrote:</div>` +
    `<div class="quotecontent" id="${id}" style="${style}">${body}</div>`;
const codebox = '<div class="codebox"><div class="codeheader">Code <button class="copy">Copy</button></div>' +
    '<div class="codeholder"><div class="text"><ol><li><a href="https://example.org/file">Example link</a></li></ol></div></div></div>';
const nativeToggle = "if(this.closest('.spoiler').getElementsByTagName('div')[1].getElementsByTagName('div')[0].style.display != 'inline') { this.closest('.spoiler').getElementsByTagName('div')[1].getElementsByTagName('div')[0].style.display='inline';this.value='Hide'; } else {this.closest('.spoiler').getElementsByTagName('div')[1].getElementsByTagName('div')[0].style.display='none';this.value='Show';}";
const spoiler = (body = codebox, open = false) => `<div class="spoiler"><div style="margin-bottom:2px">` +
    `<input type="button" value="${open ? 'Hide' : 'Show'}" onclick="${nativeToggle}"><b>Spoiler</b></div>` +
    `<div class="quotecontent" style="padding:2px"><div style="display:${open ? 'inline' : 'none'}">${body}</div></div></div>`;

function setup(t, html, options = {}) {
    // Only these locally defined fixtures execute scripts, so native inline handlers work as on the forum.
    const dom = new JSDOM(html, { url: 'https://cs.rin.ru/forum/viewtopic.php?t=1', runScripts: 'dangerously' });
    t.after(() => dom.window.close());
    const ctx = { document: dom.window.document, window: dom.window, URL,
        FORUM_BASE_URL: 'https://cs.rin.ru/forum/',
        options: { collapse_quotes: true, show_all_spoilers: false, add_link_quote: true, ...options } };
    for (const name of ['addFullPathPostLinks', 'dynamicFunction', 'mentionify', 'quotify', 'tagify', 'hideScs',
        'setupTopicPreview', 'setupPostPreview', 'setupProfilePreview', 'addLink', 'steamDBLink', 'addUsersTag',
        'changeTopicLink', 'colorizeFriendsMe']) ctx[name] = () => {};
    loadFunctions(ctx, ['collapseQuotes', 'showAllSpoilers', 'linkQuoteAuthors', 'functionsCalledByInfiniteScrolls']);
    return ctx;
}

test('collapsing a quote preserves native spoiler/code structure and its inline toggle', t => {
    const ctx = setup(t, quote(spoiler()));
    const nativeContent = ctx.document.querySelector('.spoiler > .quotecontent');
    const nativeBody = nativeContent.firstElementChild;
    const nativeButton = ctx.document.querySelector('.spoiler input');
    const before = nativeContent.outerHTML;
    ctx.collapseQuotes();
    assert.equal(ctx.document.querySelector('.spoiler > .quotecontent'), nativeContent,
        'the native spoiler quotecontent wrapper must remain the same node');
    assert.equal(nativeContent.outerHTML, before);
    nativeButton.click();
    assert.equal(nativeBody.style.display, 'inline');
    assert.equal(nativeButton.value, 'Hide');
    nativeButton.click();
    assert.equal(nativeBody.style.display, 'none');
    assert.equal(nativeButton.value, 'Show');
});

test('quote toggles retain descendants, listeners and each native spoiler open/closed state', t => {
    const ctx = setup(t, quote(spoiler(codebox, true) + spoiler(codebox, false), 'outer', 'display:inline-block;padding:4px'));
    const content = ctx.document.getElementById('outer');
    const originalNodes = [...content.querySelectorAll('*')];
    const originalMarkup = content.innerHTML;
    const link = content.querySelector('a');
    const copy = content.querySelector('.copy');
    let clicked = 0;
    link.addEventListener('click', event => { event.preventDefault(); clicked++; });
    copy.addEventListener('click', () => clicked++);
    ctx.collapseQuotes();
    const button = ctx.document.querySelector('.collapse-quote-btn');
    assert.equal(content.style.display, 'none');
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    for (let i = 0; i < 3; i++) {
        button.click();
        assert.equal(content.style.display, 'inline-block');
        assert.equal(button.value, 'Hide');
        assert.equal(button.getAttribute('aria-expanded'), 'true');
        link.click();
        copy.click();
        button.click();
        assert.equal(content.style.display, 'none');
    }
    assert.equal(clicked, 6);
    assert.equal(content.innerHTML, originalMarkup);
    assert.ok(originalNodes.every(node => ctx.document.contains(node)));
    assert.equal(content.style.padding, '4px');
    assert.equal(content.previousElementSibling.id, 'outer-title');
});

test('nested quotes inside a native spoiler toggle independently without changing its wrapper', t => {
    const ctx = setup(t, spoiler(quote('Outer text' + quote('Inner text', 'inner'), 'outer'), true));
    const nativeContent = ctx.document.querySelector('.spoiler > .quotecontent');
    const nativeBody = nativeContent.firstElementChild;
    const nativeButton = ctx.document.querySelector('.spoiler input');
    ctx.collapseQuotes();
    const outer = ctx.document.getElementById('outer');
    const inner = ctx.document.getElementById('inner');
    const outerButton = ctx.document.querySelector('#outer-title .collapse-quote-btn');
    const innerButton = ctx.document.querySelector('#inner-title .collapse-quote-btn');
    assert.equal(ctx.document.querySelectorAll('.collapse-quote-btn').length, 2);
    assert.equal(nativeContent.dataset.rinCollapseProcessed, undefined);
    assert.equal(nativeBody.style.display, 'inline');
    outerButton.click();
    assert.equal(outer.style.display, '');
    assert.equal(inner.style.display, 'none');
    innerButton.click();
    assert.equal(inner.style.display, '');
    nativeButton.click();
    assert.equal(nativeBody.style.display, 'none');
    nativeButton.click();
    assert.equal(nativeBody.style.display, 'inline');
    assert.equal(outer.style.display, '');
    assert.equal(inner.style.display, '');
    assert.equal(ctx.document.querySelector('.spoiler > .quotecontent'), nativeContent);
});

test('disabled mode, standalone spoilers and titles with native controls are untouched; roots stay scoped', t => {
    const skipped = spoiler() + '<div class="quotetitle"><input type="button" value="Show">Native header</div>' +
        '<div class="quotecontent">Native content</div><div class="quotecontent">Unpaired content</div>';
    const ctx = setup(t, skipped);
    const before = ctx.document.body.innerHTML;
    ctx.collapseQuotes();
    assert.equal(ctx.document.body.innerHTML, before);
    const disabled = setup(t, quote(spoiler()), { collapse_quotes: false });
    const disabledBefore = disabled.document.body.innerHTML;
    disabled.collapseQuotes();
    assert.equal(disabled.document.body.innerHTML, disabledBefore);
    const scoped = setup(t, `<section id="scope">${quote('Scoped', 'inside', 'display:none')}</section>` + quote('Outside', 'outside'));
    scoped.collapseQuotes(scoped.document.getElementById('scope'));
    assert.equal(scoped.document.getElementById('outside').dataset.rinCollapseProcessed, undefined);
    scoped.document.querySelector('.collapse-quote-btn').click();
    assert.equal(scoped.document.getElementById('inside').style.display, '', 'previous display:none must not prevent opening');
});

test('infinite-scroll processing handles new quotes once and retains previously opened states', t => {
    const ctx = setup(t, quote('First', 'first'));
    ctx.functionsCalledByInfiniteScrolls();
    const first = ctx.document.getElementById('first');
    const firstButton = ctx.document.querySelector('.collapse-quote-btn');
    firstButton.click();
    ctx.document.body.insertAdjacentHTML('beforeend', quote(spoiler(), 'second'));
    ctx.functionsCalledByInfiniteScrolls();
    ctx.functionsCalledByInfiniteScrolls();
    assert.equal(ctx.document.querySelectorAll('.collapse-quote-btn').length, 2);
    assert.equal(firstButton, ctx.document.querySelector('#first-title .collapse-quote-btn'));
    assert.equal(first.style.display, '');
    assert.equal(firstButton.value, 'Hide');
    assert.equal(first.dataset.rinCollapseProcessed, 'true');
    assert.equal(ctx.document.getElementById('second').style.display, 'none');
    assert.ok(ctx.document.querySelector('.spoiler > .quotecontent'));
});

test('show-all-spoilers opens native spoilers without opening collapsed quotes', t => {
    const ctx = setup(t, quote(spoiler()) + spoiler(), { show_all_spoilers: true });
    ctx.collapseQuotes();
    ctx.showAllSpoilers();
    assert.equal(ctx.document.getElementById('outer').style.display, 'none');
    assert.equal(ctx.document.querySelector('.collapse-quote-btn').value, 'Show');
    assert.equal(ctx.document.querySelector('.collapse-quote-btn').getAttribute('aria-expanded'), 'false');
    for (const nativeContent of ctx.document.querySelectorAll('.spoiler > .quotecontent')) {
        assert.equal(nativeContent.firstElementChild.style.display, 'inline');
        assert.equal(nativeContent.previousElementSibling.querySelector('input').value, 'Hide');
    }
});

test('clickable quote titles and fallback hiding coexist with the collapse button', t => {
    const ctx = setup(t, quote('<a class="postlink-local" href="./viewtopic.php?p=123#p123">Source</a><br>Body'));
    ctx.linkQuoteAuthors();
    const titleLink = ctx.document.querySelector('.quotetitle a');
    const sourceLink = ctx.document.querySelector('.quotecontent a');
    ctx.collapseQuotes();
    ctx.linkQuoteAuthors();
    ctx.collapseQuotes();
    const button = ctx.document.querySelector('.collapse-quote-btn');
    assert.equal(ctx.document.querySelector('.quotetitle a'), titleLink);
    assert.equal(titleLink.href, 'https://cs.rin.ru/forum/viewtopic.php?p=123#p123');
    assert.equal(titleLink.contains(button), false);
    assert.equal(sourceLink.hidden, true);
    button.click();
    assert.equal(sourceLink.hidden, true);
    assert.equal(ctx.document.querySelector('.quotecontent').style.display, '');
});
