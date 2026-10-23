const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const html = readFileSync(join(__dirname, '..', 'config.html'), 'utf8');
const script = readFileSync(join(__dirname, '..', 'config.js'), 'utf8');
const css = readFileSync(join(__dirname, '..', 'config.css'), 'utf8');

function setup(t, { preview = false, connected = true, language = 'en' } = {}) {
    const dom = new JSDOM(html, { url: preview ? 'http://localhost:4181/config.html' : 'https://cs.rin.ru/forum/viewtopic.php?t=1', runScripts: 'outside-only', pretendToBeVisual: true });
    t.after(() => dom.window.close());
    const { window } = dom;
    const { document } = window;
    const root = document.getElementById('wholeWindow');
    document.documentElement.lang = language;
    if (!preview) root.dataset.rinInjected = 'true';
    if (connected) document.body.insertAdjacentHTML('beforeend', '<a href="./ucp.php?mode=logout&sid=abc">Выход</a>');
    else document.body.insertAdjacentHTML('beforeend', '<a href="./ucp.php?mode=login">Anmelden</a>');
    const messages = [];
    window.postMessage = (data, origin) => messages.push({ data, origin });
    window.eval(script);
    const api = window.RinEnhancedConfig;
    api.init();
    return { window, document, root, api, messages };
}

function change(ctx, id, value) {
    const field = ctx.document.getElementById(id);
    if (field.type === 'checkbox') field.checked = value;
    else field.value = value;
    field.dispatchEvent(new ctx.window.Event('input', { bubbles: true }));
    field.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
    return field;
}

function submit(ctx) {
    ctx.document.getElementById('rin-config-form').dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));
}

test('settings are self-contained, vanilla and include one mention field plus all new options', t => {
    assert.doesNotMatch(script, /\bjQuery\b|\$\(/);
    assert.doesNotMatch(html, /on(?:click|change|keydown)\s*=|<script[^>]+https?:/i);
    assert.doesNotMatch(css, /@font-face|url\(https?:/i);
    const ctx = setup(t);
    for (const id of ['mentioning', 'ui_language', 'friend_buttons', 'dynamic_content']) {
        assert.equal(ctx.document.querySelectorAll('#' + id).length, 1);
    }
    assert.equal(ctx.document.querySelector('#mentioning').type, 'text');
    assert.equal(ctx.document.querySelector('#mention_author_template, #mention_post_template'), null);
    assert.ok(ctx.document.querySelector('#configButton svg'));
    assert.ok(ctx.document.querySelector('#rin-config-close svg'));
    assert.ok(ctx.document.querySelector('.rin-help-link svg'));
});

test('Russian covers every labeled text and language changes are immediate and reversible', async t => {
    const ctx = setup(t, { language: 'ru-RU' });
    assert.equal(ctx.api.getLanguage(), 'ru');
    for (const element of ctx.root.querySelectorAll('[data-i18n]')) {
        assert.match(element.textContent, /[А-Яа-яЁё]/, element.dataset.i18n);
    }
    ctx.api.open();
    change(ctx, 'ui_language', 'en');
    assert.equal(ctx.root.lang, 'en');
    assert.equal(ctx.document.getElementById('rin-settings-title').textContent, 'Settings');
    ctx.api.close();
    assert.equal(ctx.document.getElementById('ui_language').value, 'auto');
    assert.equal(ctx.root.lang, 'ru');
    ctx.document.documentElement.lang = 'en';
    await new Promise(resolve => ctx.window.setTimeout(resolve, 0));
    assert.equal(ctx.root.lang, 'en');
    ctx.document.documentElement.removeAttribute('lang');
    ctx.document.documentElement.setAttribute('xml:lang', 'ru');
    await new Promise(resolve => ctx.window.setTimeout(resolve, 0));
    assert.equal(ctx.root.lang, 'ru');
});

test('saving sends only changed values with the original types, once, and never reloads', t => {
    const ctx = setup(t);
    ctx.api.init();
    ctx.window.eval(script);
    ctx.api.open();
    submit(ctx);
    assert.equal(ctx.messages.length, 0);
    change(ctx, 'mentioning', '');
    change(ctx, 'friend_buttons', false);
    change(ctx, 'topic_preview_timeout', '8');
    change(ctx, 'searchSubforums', false);
    change(ctx, 'sortOrderBy', 'a');
    submit(ctx);
    assert.equal(ctx.messages.length, 1);
    const payload = JSON.parse(JSON.stringify(ctx.messages[0].data));
    assert.deepEqual(payload, { type: 'rin-enhanced:config', options: { mentioning: '', friend_buttons: false,
        topic_preview_timeout: 8, special_search_parameter: { searchSubforums: false, sortOrderBy: 'a' } } });
    assert.equal(ctx.messages[0].origin, 'https://cs.rin.ru');
    assert.equal(ctx.window.location.pathname, '/forum/viewtopic.php');
    assert.equal(ctx.root.hidden, true);
    ctx.api.open();
    submit(ctx);
    assert.equal(ctx.messages.length, 1);
});

test('cancel and Escape restore fields, focus and the page scroll state', t => {
    const ctx = setup(t);
    const trigger = ctx.document.getElementById('configButton');
    ctx.document.body.style.overflow = 'auto';
    trigger.focus();
    trigger.click();
    const initial = ctx.document.getElementById('mentioning').value;
    change(ctx, 'mentioning', 'Discard %m');
    ctx.document.getElementById('rin-config-cancel').click();
    assert.equal(ctx.document.getElementById('mentioning').value, initial);
    assert.equal(ctx.document.activeElement, trigger);
    assert.equal(ctx.document.body.style.overflow, 'auto');
    trigger.click();
    change(ctx, 'ui_language', 'ru');
    ctx.document.dispatchEvent(new ctx.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    assert.equal(ctx.root.hidden, true);
    assert.equal(ctx.document.getElementById('ui_language').value, 'auto');
    assert.equal(ctx.messages.length, 0);
});

test('focus remains in the dialog and keyboard tabs select their corresponding panels', t => {
    const ctx = setup(t);
    ctx.api.open();
    const first = ctx.document.getElementById('rin-config-close');
    first.focus();
    ctx.document.dispatchEvent(new ctx.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    assert.equal(ctx.document.activeElement.id, 'rin-config-cancel');
    ctx.document.dispatchEvent(new ctx.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    assert.equal(ctx.document.activeElement, first);
    const tab = ctx.document.getElementById('rin-tab-general');
    tab.dispatchEvent(new ctx.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    assert.equal(ctx.document.getElementById('rin-panel-reading').hidden, false);
    assert.equal(ctx.document.getElementById('rin-panel-general').hidden, true);
    assert.equal(ctx.document.activeElement.id, 'rin-tab-reading');
});

test('account detection ignores translated text and dependent controls retain their values', t => {
    const loggedIn = setup(t, { connected: true });
    assert.equal(loggedIn.document.getElementById('friend_buttons').disabled, false);
    change(loggedIn, 'dynamic_function', false);
    assert.equal(loggedIn.document.getElementById('dynamic_content').disabled, true);
    assert.equal(loggedIn.document.getElementById('dynamic_content').checked, true);
    assert.equal(Object.hasOwn(loggedIn.api.getChanges(), 'dynamic_content'), false);
    const loggedOut = setup(t, { connected: false });
    assert.equal(loggedOut.document.getElementById('friend_buttons').disabled, true);
    assert.equal(loggedOut.document.getElementById('rin-login-note').hidden, false);
    assert.equal(loggedOut.document.getElementById('infinite_scrolling').disabled, false);
});

test('local preview opens automatically and saves only to its dedicated browser storage', t => {
    const ctx = setup(t, { preview: true });
    assert.equal(ctx.root.hidden, false);
    assert.equal(ctx.root.dataset.rinPreview, 'true');
    assert.equal(ctx.document.getElementById('rin-preview-badge').hidden, false);
    change(ctx, 'ui_language', 'ru');
    change(ctx, 'mentioning', 'Preview %m');
    submit(ctx);
    assert.equal(ctx.messages.length, 0);
    const stored = JSON.parse(ctx.window.localStorage.getItem('rin-enhanced:config-preview:v1'));
    assert.equal(stored.ui_language, 'ru');
    assert.equal(stored.mentioning, 'Preview %m');
    assert.equal(ctx.window.localStorage.length, 1);
    assert.equal(ctx.root.hidden, false);
});
