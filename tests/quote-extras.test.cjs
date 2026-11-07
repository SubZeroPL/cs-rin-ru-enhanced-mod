const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const code = readFileSync(join(__dirname, '../src/quote-extras.js'), 'utf8');
const base = 'https://cs.rin.ru/forum/';
const post = '<section><span class="postauthor">Алиса</span><div class="postbody">Первый абзац. Selected [literal] text.</div>' +
    '<a id="quote" href="./posting.php?mode=quote&p=123"><img title="Ответить с цитатой"></a></section>';

function setup(t, html, path = 'viewtopic.php?t=42') {
    const dom = new JSDOM(html, { url: base + path });
    t.after(() => dom.window.close());
    const ctx = { window: dom.window, document: dom.window.document, URL, Date,
        FORUM_BASE_URL: base, options: { add_link_quote: true }, rinText: text => text,
        addLinkToQuote: (quote, id) => quote.replace(/^(\[quote[^\]]*\])/, `$1[url=${base}viewtopic.php?p=${id}#p${id}]Source[/url]\n`) };
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return ctx;
}

function select(ctx, node, start = 0, end = node.textContent.length) {
    const range = ctx.document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const selection = ctx.window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

test('selected quoting accepts only text wholly inside one message and escapes literal BBCode', t => {
    const ctx = setup(t, post + '<p id="outside">Outside</p>');
    const body = ctx.document.querySelector('.postbody');
    select(ctx, body.firstChild, 14);
    assert.equal(ctx.selectedQuoteText(body), 'Selected [literal] text.');
    assert.equal(ctx.buildSelectionQuote(ctx.selectedQuoteText(body), 'A"[B]', '123'),
        `[quote="A&quot;&#91;B&#93;"][url=${base}viewtopic.php?p=123#p123]Source[/url]\nSelected &#91;literal&#93; text.[/quote]\n`);
    const range = ctx.window.getSelection().getRangeAt(0);
    range.setEnd(ctx.document.getElementById('outside').firstChild, 7);
    assert.equal(ctx.selectedQuoteText(body), '');
    ctx.window.getSelection().removeAllRanges();
    assert.equal(ctx.selectedQuoteText(body), '');
});

test('selected quick quote captures before focus changes, preserves the draft and binds once', t => {
    const ctx = setup(t, post + '<form id="postform"><textarea name="message">My draft</textarea></form>');
    ctx.setupQuoteExtras(); ctx.setupQuoteExtras();
    const editor = ctx.document.querySelector('textarea');
    const link = ctx.document.getElementById('quote');
    let changes = 0;
    editor.addEventListener('input', () => changes++);
    select(ctx, ctx.document.querySelector('.postbody').firstChild, 14);
    link.dispatchEvent(new ctx.window.Event('pointerdown'));
    ctx.window.getSelection().removeAllRanges();
    const click = new ctx.window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    assert.equal(click.defaultPrevented, true);
    assert.equal(changes, 1);
    assert.match(editor.value, /^My draft\n\n\[quote="Алиса"\]/);
    assert.equal(editor.value.includes('Первый абзац'), false);
    assert.equal(editor.value.match(/Source/g).length, 1);
});

test('full-editor transfer is scoped to the matching action, expires and preserves trailing text', t => {
    const ctx = setup(t, '<textarea name="message">[quote="A"][quote="B"]Old[/quote]Full[/quote]\nExisting reply</textarea>', 'posting.php?mode=quote&p=123');
    const editor = ctx.document.querySelector('textarea');
    const pending = {kind:'post',id:'123',quote:'[quote="A"]Chosen[/quote]\n',created:Date.now()};
    ctx.window.sessionStorage.setItem('rin-enhanced:selected-quote', JSON.stringify(pending));
    ctx.applySelectedQuoteToEditor();
    assert.equal(editor.value, '[quote="A"]Chosen[/quote]\n\nExisting reply');
    assert.equal(ctx.window.sessionStorage.getItem('rin-enhanced:selected-quote'), null);
    for (const extra of [{id:'456'},{kind:'pm'},{created:Date.now()-600000}]) {
        const before = editor.value;
        ctx.window.sessionStorage.setItem('rin-enhanced:selected-quote', JSON.stringify({...pending,...extra}));
        ctx.applySelectedQuoteToEditor();
        assert.equal(editor.value, before);
    }
});

function history(id, author, raw) {
    return `<tr class="row1"><td><span class="postauthor">${author}</span></td></tr>` +
        `<tr class="row2"><td><div class="postbody">Rendered ${id}</div><div id="message_${id}" style="display:none">${raw}</div></td></tr>`;
}

test('multiple private-message quotes preserve nested BBCode and existing drafts without public post URLs', t => {
    const ctx = setup(t, '<form name="postform"><textarea name="message">Черновик</textarea></form><table>' +
        history(1,'Алиса','[quote="Боб"][url=https://example.org]Link[/url][/quote] Reply') +
        history(2,'Боб','Another message') + '</table>', 'ucp.php?i=pm&mode=compose&action=reply&p=1');
    ctx.setupQuoteExtras(); ctx.setupQuoteExtras();
    const buttons = [...ctx.document.querySelectorAll('.rin-pm-quote')];
    assert.equal(buttons.length, 2);
    buttons.forEach(button => button.click());
    const value = ctx.document.querySelector('textarea').value;
    assert.equal(value, 'Черновик\n\n[quote="Алиса"][quote="Боб"][url=https://example.org]Link[/url][/quote] Reply[/quote]\n[quote="Боб"]Another message[/quote]\n');
    assert.equal(value.includes('viewtopic.php'), false);
    assert.equal(value.includes('Source'), false);
    assert.equal(buttons.every(button => button.textContent === 'Quoted!'), true);
});

test('private history selection quotes only that excerpt; view pages and user content gain no buttons', t => {
    const html = '<textarea name="message"></textarea><table>' + history(1,'Alice','Whole raw body') + '</table>';
    const ctx = setup(t, html, 'ucp.php?i=pm&mode=compose&action=reply&p=1');
    ctx.setupPrivateMessageQuotes();
    select(ctx, ctx.document.querySelector('.postbody').firstChild, 0, 8);
    ctx.document.querySelector('.rin-pm-quote').click();
    assert.equal(ctx.document.querySelector('textarea').value, '[quote="Alice"]Rendered[/quote]\n');
    const view = setup(t, html, 'ucp.php?i=pm&mode=view&p=1');
    view.setupPrivateMessageQuotes();
    assert.equal(view.document.querySelector('.rin-pm-quote'), null);
});

test('native PM quote actions resolve their own message in a shared history table', t => {
    const action = id => `<tr class="row1"><td><a id="q${id}" href="./ucp.php?i=pm&mode=compose&action=quote&p=${id}">Quote</a></td></tr>`;
    const ctx = setup(t, '<form name="postform"><textarea name="message">Draft</textarea></form><table class="tablebg">' +
        history(1, 'Alice', 'First') + action(1) + history(2, 'Боб', 'Second') + action(2) + '</table>',
        'ucp.php?i=pm&mode=compose&action=reply&p=1');
    ctx.setupQuoteExtras();
    const link = ctx.document.getElementById('q2');
    assert.equal(ctx.findQuoteBody(link).textContent, 'Rendered 2');
    select(ctx, ctx.findQuoteBody(link).firstChild);
    link.dispatchEvent(new ctx.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(ctx.document.querySelector('textarea').value, 'Draft\n\n[quote="Боб"]Rendered 2[/quote]\n');
});
