const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');
const steam = (id = '123', suffix = '/') => `<a class="postlink" href="https://store.steampowered.com/app/${id}${suffix}">Steam Store</a>`;
const native = (href = 'https://steamdb.info/app/123/') => `<br><strong>SteamDB Page:</strong> <a href="${href}" target="_blank" rel="nofollow">Details for this game</a>`;
const post = html => `<div class="postbody">${html}</div>`;
const quote = html => `<div class="quotecontent">${html}</div>`;
const dbLinks = root => [...root.querySelectorAll('a[href]')].filter(a => new URL(a.href).hostname === 'steamdb.info');

function setup(t, html = '', enabled = true) {
    const dom = new JSDOM(html, { url: 'https://cs.rin.ru/forum/viewtopic.php?t=42' });
    t.after(() => dom.window.close());
    const ctx = { document: dom.window.document, URL, options: { steam_db_link: enabled } };
    loadFunctions(ctx, ['getSteamAppId', 'steamDBLink']);
    return ctx;
}

test('Steam app IDs are parsed from exact hosts and numeric app paths', t => {
    const ctx = setup(t);
    for (const host of ['store.steampowered.com', 'steamdb.info']) {
        for (const url of [`https://${host}/app/123`, `http://${host}/app/123/`,
            `https://${host}/app/123/Game_Name/?l=french#details`, `https://${host}/app/123?utm_source=forum`]) {
            assert.equal(ctx.getSteamAppId(url, host), '123', url);
        }
        for (const url of [`https://${host}.example.org/app/123/`, `https://evil.example/app/123/`,
            `https://${host}/bundle/123/`, `https://${host}/app/123abc/`, `https://${host}/app/-123/`,
            `https://${host}/app/`, `javascript:https://${host}/app/123/`, `ftp://${host}/app/123/`,
            `https://user@${host}/app/123/`, `https://${host}:8080/app/123/`, 'http://[', '/app/123/']) {
            assert.equal(ctx.getSteamAppId(url, host), null, url);
        }
    }
});

test('old posts receive one canonical link with the native bold label and no logo', t => {
    const ctx = setup(t, post(steam('123', '/Game_Name/?l=french')));
    const storeBefore = ctx.document.querySelector('a').outerHTML;
    ctx.steamDBLink();
    const links = dbLinks(ctx.document);
    assert.equal(links.length, 1);
    assert.equal(links[0].href, 'https://steamdb.info/app/123/');
    assert.equal(links[0].textContent, links[0].href);
    const label = links[0].previousElementSibling;
    assert.equal(label.textContent.trim(), 'SteamDB Page:');
    assert.equal(label.style.fontWeight, 'bold');
    assert.equal(label.previousElementSibling.tagName, 'BR');
    assert.equal(ctx.document.querySelector('a').outerHTML, storeBefore);
    assert.equal(ctx.document.querySelector('svg, img, .octicon-steamdb'), null);
    const enhanced = ctx.document.body.innerHTML;
    ctx.steamDBLink();
    ctx.steamDBLink();
    assert.equal(ctx.document.body.innerHTML, enhanced);
});

test('native links with descriptive labels and URL variations remain byte-for-byte intact', t => {
    for (const href of ['https://steamdb.info/app/123', 'http://steamdb.info/app/123/',
        'https://steamdb.info/app/123/?utm_source=forum#info', 'https://steamdb.info/app/123/charts/']) {
        const ctx = setup(t, post(steam() + native(href)));
        const before = ctx.document.body.innerHTML;
        ctx.steamDBLink();
        ctx.steamDBLink();
        assert.equal(ctx.document.body.innerHTML, before, href);
        assert.equal(dbLinks(ctx.document).length, 1);
    }
});

test('repeated Store links deduplicate by app ID and two different apps each get a link', t => {
    const ctx = setup(t, post(steam('123', '?l=english') + ' ' + steam('123', '/Game_Name/') + '<br>' + steam('456')));
    ctx.steamDBLink();
    assert.deepEqual(dbLinks(ctx.document).map(a => a.href).sort(),
        ['https://steamdb.info/app/123/', 'https://steamdb.info/app/456/']);
    ctx.steamDBLink();
    assert.equal(dbLinks(ctx.document).length, 2);
    const mixed = setup(t, post(steam('123') + native() + '<br>' + steam('456')));
    const nativeBefore = mixed.document.querySelector('a[target]').outerHTML;
    mixed.steamDBLink();
    assert.equal(dbLinks(mixed.document).length, 2);
    assert.equal(mixed.document.querySelector('a[target]').outerHTML, nativeBefore);
});

test('links in separate posts and nested quotes cannot suppress one another', t => {
    const ctx = setup(t, post(steam() + quote(steam() + native())) + post(steam() + native() + quote(steam())));
    const nativeLinks = [...ctx.document.querySelectorAll('a[target]')].map(a => a.outerHTML);
    ctx.steamDBLink();
    const scopes = [...ctx.document.querySelectorAll('.postbody, .quotecontent')];
    for (const scope of scopes) {
        assert.equal(dbLinks(scope).filter(a => a.closest('.postbody, .quotecontent') === scope).length, 1);
    }
    assert.deepEqual([...ctx.document.querySelectorAll('a[target]')].map(a => a.outerHTML), nativeLinks);
    assert.equal(dbLinks(ctx.document).length, 4);
});

test('same-line placement stays within the current post scope', t => {
    const ctx = setup(t, post(`${steam()} <a id="wiki" class="postlink" href="https://example.org/wiki">Wiki</a><br>Text`) + post(steam('456')));
    ctx.document.querySelectorAll('a').forEach(a => { a.getBoundingClientRect = () => ({ y: 100 }); });
    ctx.steamDBLink();
    const wiki = ctx.document.querySelector('#wiki');
    assert.equal(wiki.nextElementSibling.tagName, 'BR');
    assert.equal(wiki.nextElementSibling.nextElementSibling.textContent.trim(), 'SteamDB Page:');
    const posts = ctx.document.querySelectorAll('.postbody');
    assert.deepEqual(dbLinks(posts[0]).map(a => a.href), ['https://steamdb.info/app/123/']);
    assert.deepEqual(dbLinks(posts[1]).map(a => a.href), ['https://steamdb.info/app/456/']);
});

test('parent fallback scopes and dynamically appended posts remain independent and repeatable', t => {
    const ctx = setup(t, `<p>${steam()}</p><p>${steam()}</p>`);
    ctx.steamDBLink();
    assert.equal(dbLinks(ctx.document).length, 2);
    ctx.document.body.insertAdjacentHTML('beforeend', post(steam()));
    ctx.steamDBLink();
    ctx.steamDBLink();
    assert.equal(dbLinks(ctx.document).length, 3);
    assert.equal(dbLinks(ctx.document.querySelector('.postbody')).length, 1);
});

test('disabled mode and non-Steam/non-app links produce no mutation', t => {
    const disabled = setup(t, post(steam()), false);
    const before = disabled.document.body.innerHTML;
    disabled.steamDBLink();
    assert.equal(disabled.document.body.innerHTML, before);
    for (const href of ['https://store.steampowered.com.example.org/app/123/', 'https://store.steampowered.com/bundle/123/',
        'https://store.steampowered.com/app/not-an-id/', 'javascript:alert(1)', 'https://steamdb.info/app/123/']) {
        const ctx = setup(t, post(`<a class="postlink" href="${href}">Link</a>`));
        const original = ctx.document.body.innerHTML;
        ctx.steamDBLink();
        assert.equal(ctx.document.body.innerHTML, original, href);
    }
});
