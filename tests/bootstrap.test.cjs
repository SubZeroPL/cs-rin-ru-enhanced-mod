const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const { chatPage } = require('../test-support/chat-fixtures.cjs');

const source = fs.readFileSync(path.join(__dirname, '../cs-rin-ru-enhanced-mod.user.js'), 'utf8');
const base = 'https://cs.rin.ru/forum/';
const fixture = `<!doctype html><html lang="ru" xml:lang="ru"><head>
<title>CS RIN - Steam Underground • Просмотр темы - [Release] Enhanced</title>
<script>var base_url = './viewtopic.php?lang=ru&amp;f=10&amp;t=42';</script></head><body>
<div id="logodesc"><h1>CS RIN - Steam Underground</h1></div>
<div id="menubar"><table><tbody><tr><td><a href="./faq.php">FAQ</a><a href="./chat.php">Чат</a></td></tr></tbody></table>
<table><tbody><tr><td><a href="./ucp.php">Личный раздел</a><a href="./ucp.php?i=pm&amp;folder=inbox">0 новых сообщений</a></td>
<td><a href="./search.php">Поиск</a><a href="./ucp.php?mode=logout&amp;sid=test">Выход [ Тест [RIN] ]</a></td></tr></tbody></table></div>
<div id="datebar"><span class="gensmall">Последнее посещение</span><span class="gensmall">Текущее время</span></div>
<div id="wrapcentre"><p class="breadcrumbs"><a href="./viewforum.php?f=10">Общий форум</a></p>
<div id="pageheader"><a class="titles" href="./viewtopic.php?lang=ru&amp;f=10&amp;t=42">[Release] Enhanced</a></div>
<a id="reply" href="./posting.php?lang=ru&amp;mode=reply&amp;f=10&amp;t=42"><img src="./styles/rinDark/imageset/ru/button_topic_reply.gif" title="Ответить"></a>
<table><tbody><tr><td class="nav">Страница <strong>1</strong> из <strong>2</strong></td><td class="gensmall">
<a onclick="jumpto(); return false;" href="#" title="Перейти на страницу…">Перейти на страницу</a> <strong>1</strong>,
<a href="./viewtopic.php?lang=ru&amp;t=42&amp;start=15">2</a></td></tr></tbody></table>
<div id="pagecontent"><table class="tablebg" id="post-123"><tbody>
<tr><td><a name="p123"></a><b class="postauthor">Алиса</b></td><td class="gensmall">
<div><a id="permalink" href="./viewtopic.php?p=123#p123"><img src="./styles/rinDark/imageset/icon_post_target.gif" title="Сообщение"></a></div>
<div id="actions"><a id="native-quote" href="./posting.php?lang=ru&amp;mode=quote&amp;f=10&amp;p=123"><img src="./styles/rinDark/imageset/ru/icon_post_quote.gif" title="Ответить с цитатой"></a></div></td></tr>
<tr><td><a href="./memberlist.php?mode=viewprofile&amp;u=9"><img src="./styles/rinDark/imageset/ru/icon_user_profile.gif" title="Профиль"></a></td>
<td><div class="postbody">Первый абзац. Выбранный [literal] текст.<br>
<div class="quotetitle">Боб писал(а):</div><div class="quotecontent"><a class="postlink-local" href="./viewtopic.php?p=99#p99">Source</a><br>Quoted earlier text.</div>
</div></td></tr></tbody></table></div>
<form id="postform"><textarea name="message">Мой черновик</textarea></form>
<table class="tablebg" id="online"><tbody><tr><td><img src="./styles/rinDark/imageset/whosonline.gif"></td>
<td><a href="./memberlist.php?mode=viewprofile&amp;u=7">Тест [RIN]</a></td></tr></tbody></table></div>
</body></html>`;

async function boot(t, settings = {}) {
    const browserErrors = [];
    const resources = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => browserErrors.push(error));
    const loader = new class extends ResourceLoader {
        fetch(url) { resources.push(url); return null; }
    }();
    const dom = new JSDOM(settings.html ?? fixture, {
        url: base + (settings.path || 'viewtopic.php?p=123&lang=ru#p123'),
        runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole, resources: loader,
    });
    t.after(() => dom.window.close());
    const { window } = dom;
    const fetches = [];
    const external = [];
    const notices = [];
    const logs = [];
    const writes = [];
    const timers = new Map();
    const intervals = new Map();
    const copied = [];
    const storage = new Map([['options', settings.options || {}]]);
    let timerId = 0;
    window.name = settings.name || '';
    window.addEventListener('error', event => browserErrors.push(event.error || event.message));
    window.console.warn = (...args) => logs.push(args);
    window.console.error = (...args) => logs.push(args);
    window.GM_getValue = (key, fallback) => storage.has(key) ? storage.get(key) : fallback;
    window.GM_setValue = (key, value) => { storage.set(key, value); writes.push({ key, value }); };
    window.GM_deleteValue = key => storage.delete(key);
    window.GM_notification = (...args) => notices.push(args);
    window.GM_addStyle = css => {
        const style = window.document.createElement('style'); style.textContent = css;
        window.document.head.append(style); return style;
    };
    window.GM_addElement = (tag, attrs) => {
        const element = window.document.createElement(tag);
        for (const [key, value] of Object.entries(attrs || {})) element.setAttribute(key, value);
        window.document.body.append(element); return element;
    };
    window.GM_xmlhttpRequest = request => {
        external.push(request.url);
        throw new Error(`Unexpected external request: ${request.url}`);
    };
    window.fetch = async (href, init) => {
        const url = new URL(href, base); fetches.push({ url, init });
        if (url.pathname === '/forum/ucp.php' && url.searchParams.get('i') === 'zebra' && url.searchParams.get('mode') === 'friends') {
            return { ok: true, status: 200, url: url.href, text: async () => '<div id="ucp"><select name="usernames[]"><option>Алиса</option></select></div>' };
        }
        if (url.pathname === '/forum/chat.php') {
            return { ok: true, status: 200, url: url.href, text: async () => chatPage };
        }
        throw new Error(`Unexpected forum request: ${url.href}`);
    };
    window.XMLHttpRequest = class { constructor() { throw new Error('Unexpected XMLHttpRequest'); } };
    window.setTimeout = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; };
    window.clearTimeout = id => timers.delete(id);
    window.setInterval = (callback, delay) => { const id = ++timerId; intervals.set(id, { callback, delay }); return id; };
    window.clearInterval = id => intervals.delete(id);
    window.requestAnimationFrame = callback => window.setTimeout(callback, 16);
    window.cancelAnimationFrame = id => window.clearTimeout(id);
    window.scrollBy = () => {};
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async text => copied.push(text) } });
    const flush = async () => {
        await new Promise(resolve => setImmediate(resolve));
        await new Promise(resolve => setImmediate(resolve));
    };
    assert.equal(window.$, undefined);
    assert.doesNotThrow(() => window.eval(source), 'the complete generated userscript must initialize without TDZ errors');
    await flush();
    const verifyClean = () => {
        assert.deepEqual(browserErrors.map(error => String(error)), [], 'no browser errors');
        assert.deepEqual(logs, [], 'no caught runtime/config errors');
        assert.deepEqual(external, [], 'bundled config and local icons do not call GM_xmlhttpRequest');
        assert.equal([...resources, ...fetches.map(item => item.url.href)].some(url => /(?:raw\.)?github(?:usercontent)?\.com/.test(url)), false);
        assert.equal(window.$, undefined);
        assert.equal(window.jQuery, undefined);
    };
    return { window, document: window.document, fetches, external, resources, notices, writes, storage,
        timers, intervals, copied, flush, verifyClean };
}

test('complete Russian connected bootstrap loads bundled settings, icons, translated controls and native context', async t => {
    const ctx = await boot(t);
    const doc = ctx.document;
    assert.equal(doc.getElementById('wholeWindow').dataset.rinInjected, 'true');
    assert.equal(doc.getElementById('wholeWindow').dataset.rinConfigReady, 'true');
    assert.equal(doc.getElementById('rin-settings-title').textContent, 'Настройки');
    assert.equal(doc.getElementById('configButton').getAttribute('aria-label'), 'Настройки Enhanced');
    assert.equal(doc.querySelectorAll('#wholeWindow').length, 1);
    assert.equal(doc.querySelectorAll('#configButton').length, 1);
    assert.equal(doc.querySelector('#actions .rin-mention-link img').title, 'Ответить с упоминанием');
    assert.match(doc.querySelector('#actions .rin-copy-link img').src, /^data:image\/svg\+xml,/);
    assert.match(doc.querySelector('#actions .rin-mention-link img').src, /^data:image\/svg\+xml,/);
    assert.equal(doc.querySelector('.rin-friend-button').textContent, 'Удалить из друзей');
    assert.equal(new URL(doc.getElementById('profile_link').href).searchParams.get('u'), '7', 'full bracketed username matches the native profile');
    const permalink = new URL(doc.getElementById('permalink').href);
    assert.equal(permalink.searchParams.get('f'), '10');
    assert.equal(permalink.searchParams.get('t'), '42');
    assert.equal(permalink.searchParams.get('lang'), 'ru');
    assert.ok(doc.querySelector('.quotetitle .rin-quote-author-link'));
    assert.equal(doc.getElementById('searchBar').placeholder, 'Расширенный поиск');
    assert.equal(ctx.fetches.length, 1, 'friends list is shared across colorization, search and friend actions');
    assert.equal(ctx.intervals.size, 1);
    assert.equal([...ctx.intervals.values()][0].delay, 60000);
    doc.getElementById('configButton').click();
    assert.equal(doc.getElementById('wholeWindow').hidden, false);
    doc.getElementById('rin-config-close').click();
    assert.equal(doc.getElementById('wholeWindow').hidden, true);
    doc.querySelector('.rin-copy-link').click();
    await ctx.flush();
    assert.equal(ctx.copied.length, 1);
    assert.equal(new URL(ctx.copied[0]).searchParams.get('p'), '123');
    ctx.verifyClean();
});

test('complete bootstrap chat uses the native DOM without an iframe and preserves language', async t => {
    const ctx = await boot(t);
    const button = ctx.document.getElementById('rin-chat-toggle');
    assert.equal(button.textContent, 'Показать чат');
    assert.equal(button.classList.contains('rin-forum-button'), true);
    button.click();
    await ctx.flush();
    assert.equal(ctx.document.querySelector('#chatDiv iframe, #chatDiv script'), null);
    assert.ok(ctx.document.querySelector('#chatDiv #rin-chat-chat'));
    const request = ctx.fetches.find(item => item.url.pathname === '/forum/chat.php');
    assert.equal(request.url.searchParams.get('lang'), 'ru');
    assert.equal(ctx.document.querySelector('#chatDiv .rin-chat-actions a').getAttribute('aria-label'), 'Открыть полный чат');
    assert.equal(button.textContent, 'Скрыть чат');
    assert.equal(ctx.storage.get('chatActive'), true);
    button.click();
    assert.equal(ctx.document.getElementById('chatDiv'), null);
    assert.equal(button.textContent, 'Показать чат');
    assert.equal(ctx.storage.get('chatActive'), false);
    assert.equal(ctx.timers.size, 0, 'closing chat cancels its polling timer');
    await ctx.flush();
    ctx.verifyClean();
});

test('selection quoting integrated with the quick-quote listener keeps the draft and avoids fetching the whole post', async t => {
    const ctx = await boot(t);
    const editor = ctx.document.querySelector('#postform textarea');
    const bodyText = ctx.document.querySelector('#post-123 .postbody').firstChild;
    const start = bodyText.data.indexOf('Выбранный');
    const range = ctx.document.createRange(); range.setStart(bodyText, start); range.setEnd(bodyText, bodyText.length);
    const selection = ctx.window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    const quote = ctx.document.getElementById('native-quote');
    quote.dispatchEvent(new ctx.window.Event('pointerdown'));
    selection.removeAllRanges();
    const click = new ctx.window.MouseEvent('click', { bubbles: true, cancelable: true });
    quote.dispatchEvent(click);
    await ctx.flush();
    assert.equal(click.defaultPrevented, true);
    assert.match(editor.value, /^Мой черновик\n\n\[quote="Алиса"\]/);
    assert.equal(editor.value.includes('Выбранный &#91;literal&#93; текст.'), true);
    assert.equal(editor.value.includes('Первый абзац'), false);
    assert.equal(editor.value.match(/\]Source\[\/url\]/g).length, 1);
    assert.equal(ctx.fetches.length, 1, 'only the startup friends request is allowed');
    assert.equal(ctx.window.sessionStorage.getItem('rin-enhanced:selected-quote'), null);
    ctx.verifyClean();
});

test('minimal guest page still opens settings without account requests or missing-element crashes', async t => {
    const ctx = await boot(t, { html: '<!doctype html><html lang="ru"><head><title>Форум</title></head><body><p>Guest page</p></body></html>', path: 'index.php?lang=ru' });
    assert.ok(ctx.document.getElementById('configButton'));
    ctx.document.getElementById('configButton').click();
    assert.equal(ctx.document.getElementById('wholeWindow').hidden, false);
    assert.equal(ctx.document.getElementById('rin-login-note').hidden, false);
    assert.equal(ctx.document.getElementById('dynamic_function').disabled, true);
    assert.equal(ctx.document.querySelector('#rin-chat-toggle, #profile_link'), null);
    assert.equal(ctx.fetches.length, 0);
    assert.equal(ctx.intervals.size, 0);
    ctx.verifyClean();
});

test('disabled script leaves forum and draft untouched while keeping settings available', async t => {
    const ctx = await boot(t, { options: { script_enabled: false } });
    assert.equal(ctx.document.getElementById('script_enabled').checked, false);
    assert.ok(ctx.document.getElementById('configButton'));
    assert.equal(ctx.document.querySelector('.rin-mention-link, .rin-copy-link, .rin-friend-button, [name="page_nav"], #rin-chat-toggle'), null);
    assert.equal(ctx.document.querySelector('#postform textarea').value, 'Мой черновик');
    assert.equal(ctx.document.getElementById('permalink').getAttribute('href'), './viewtopic.php?p=123#p123');
    assert.equal(ctx.document.querySelector('.quotecontent a').hidden, false);
    assert.equal(ctx.fetches.length, 0);
    assert.equal(ctx.intervals.size, 0);
    ctx.verifyClean();
});

test('native chat page never adds another compact chat toggle', async t => {
    const ctx = await boot(t, { name: 'rin-enhanced-chat', path: 'chat.php?lang=ru' });
    assert.equal(ctx.document.querySelector('#rin-chat-toggle, #chatDiv'), null);
    assert.ok(ctx.document.getElementById('configButton'));
    ctx.verifyClean();
});
