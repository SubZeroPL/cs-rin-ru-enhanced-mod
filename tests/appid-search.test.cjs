const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const menu = '<div id="menubar"><table><tbody><tr><td id="search-cell"><a id="native-search" href="/forum/search.php">Search</a></td></tr></tbody></table></div>';

function setup(t, { html = menu, enabled = true, url = 'https://cs.rin.ru/forum/viewtopic.php?p=123&sid=session', language = 'en' } = {}) {
    const dom = new JSDOM(html, { url });
    t.after(() => dom.window.close());
    dom.window.document.documentElement.lang = language;
    const location = { href: url };
    const ctx = { document: dom.window.document, window: { location }, URL,
        options: { appid_search: enabled, special_search: false, ui_language: 'auto' } };
    loadFunctions(ctx, ['setupAppIdSearch', 'getBaseUrl']);
    ctx.setupAppIdSearch();
    return { ...ctx, browser: dom.window, input: ctx.document.getElementById('rin-appid-input') };
}

test('AppID search is optional, idempotent, independent of enhanced search and preserves native controls', t => {
    assert.equal(setup(t, { enabled: false }).input, null);
    assert.equal(setup(t, { html: '' }).input, null);
    const ctx = setup(t);
    const native = ctx.document.getElementById('native-search');
    ctx.setupAppIdSearch();
    assert.equal(ctx.document.querySelectorAll('#rin-appid-search').length, 1);
    assert.equal(ctx.document.getElementById('native-search'), native);
    assert.equal(native.getAttribute('href'), '/forum/search.php');
    assert.equal(native.parentElement.id, 'search-cell');
    assert.equal(ctx.input.className, 'post');
    assert.equal(ctx.document.querySelector('#rin-appid-search button').className, 'btnlite');
    assert.equal(ctx.document.querySelector('#searchBar'), null);
});

test('AppID search is placed beside an existing enhanced search without replacing it', t => {
    const ctx = setup(t, { html: menu.replace('<a id="native-search"', '<div class="rin-special-search"><input id="searchBar" value="Keep this search"></div><a id="native-search"') });
    assert.equal(ctx.document.getElementById('searchBar').value, 'Keep this search');
    assert.equal(ctx.document.querySelector('.rin-special-search').nextElementSibling.id, 'rin-appid-search');
});

test('button and Enter open the AppID route, accepting pasted whitespace without carrying session parameters', t => {
    for (const action of ['button', 'Enter']) {
        const ctx = setup(t);
        ctx.input.value = ' 000730 ';
        if (action === 'button') ctx.document.querySelector('#rin-appid-search button').click();
        else {
            const event = new ctx.browser.KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
            ctx.input.dispatchEvent(event);
            assert.equal(event.defaultPrevented, true);
        }
        assert.equal(ctx.window.location.href, 'https://cs.rin.ru/app/730');
    }
});

test('invalid AppIDs never navigate and validation clears when the user corrects the value', t => {
    const ctx = setup(t);
    const original = ctx.window.location.href;
    const button = ctx.document.querySelector('#rin-appid-search button');
    for (const value of ['', ' ', '0', '000', '-1', '1.2', '1e3', '730/../../', '730?x=1', 'https://store.steampowered.com/app/730/']) {
        ctx.input.value = value;
        button.click();
        assert.equal(ctx.window.location.href, original, value);
        assert.equal(ctx.input.validity.customError, true, value);
    }
    ctx.input.value = '1091500';
    ctx.input.dispatchEvent(new ctx.browser.Event('input'));
    assert.equal(ctx.input.validationMessage, '');
    button.click();
    assert.equal(ctx.window.location.href, 'https://cs.rin.ru/app/1091500');
});

test('AppID navigation uses the site root and preserves the currently used mirror', t => {
    for (const origin of ['https://cs.rin.ru', 'http://csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion']) {
        const ctx = setup(t, { url: `${origin}/forum/viewtopic.php?t=42` });
        assert.equal(ctx.getBaseUrl(), `${origin}/forum/`);
        ctx.input.value = '570';
        ctx.document.querySelector('#rin-appid-search button').click();
        assert.equal(ctx.window.location.href, `${origin}/app/570`);
    }
});

test('AppID controls and errors follow the Russian interface and ignore composing Enter', t => {
    const ctx = setup(t, { language: 'ru' });
    assert.equal(ctx.input.getAttribute('aria-label'), 'Поиск по AppID Steam');
    assert.equal(ctx.document.querySelector('#rin-appid-search button').textContent, 'Поиск');
    const original = ctx.window.location.href;
    ctx.input.value = '730';
    ctx.input.dispatchEvent(new ctx.browser.KeyboardEvent('keydown', { key: 'Enter', isComposing: true }));
    assert.equal(ctx.window.location.href, original);
    ctx.input.value = 'bad';
    ctx.document.querySelector('#rin-appid-search button').click();
    assert.equal(ctx.input.validationMessage, 'Введите корректный числовой AppID Steam.');
});
