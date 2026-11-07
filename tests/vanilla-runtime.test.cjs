const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const base = 'https://cs.rin.ru/forum/';
const post = id => `<table class="tablebg" data-post="${id}"><tbody><tr><td><a name="p${id}"></a>` +
    `<b class="postauthor">Автор ${id}</b></td><td><a href="./viewtopic.php?p=${id}#p${id}">` +
    '<img src="./styles/rinDark/imageset/icon_post_target.gif" alt="Сообщение"></a></td></tr>' +
    `<tr><td colspan="2"><div class="postbody">Message ${id}</div></td></tr></tbody></table>`;

function navigation(current, links, { total = 165, russian = true, topicId = 42 } = {}) {
    return '<table><tbody><tr><td class="nav">' + (russian ? 'Страница ' : 'Page ') +
        `<strong>${current}</strong> ${russian ? 'из' : 'of'} <strong>${total}</strong></td>` +
        '<td class="gensmall"><a href="#" onclick="jumpto(); return false;" title="Перейти на страницу…">' +
        (russian ? 'Перейти на страницу' : 'Go to page') + '</a> ' +
        links.map(number => `<a href="./viewtopic.php?lang=${russian ? 'ru' : 'en'}&amp;t=${topicId}&amp;start=${(number - 1) * 15}#p${number}">${number}</a>`).join(', ') +
        ` <strong>${current}</strong></td></tr></tbody></table>`;
}

function topic(current, links, ids, options) {
    return '<div id="pageheader"><strong>Просмотр темы</strong><a class="titles" href="./viewtopic.php?f=10&amp;t=42">Topic</a></div>' +
        navigation(current, links, options) + `<div id="pagecontent">${ids.map(post).join('')}</div>`;
}

function setup(t, html = '', settings = {}) {
    const dom = new JSDOM(html, { url: base + (settings.path || 'viewtopic.php?t=42&lang=ru'), pretendToBeVisual: true });
    t.after(() => dom.window.close());
    const { window } = dom;
    const frames = [];
    const timers = new Map();
    let timerId = 0;
    let hidden = false;
    const notices = [];
    const warnings = [];
    const enhanced = [];
    const storage = new Map();
    window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
    window.scrollBy = () => {};
    Object.defineProperties(window, {
        scrollY: { configurable: true, writable: true, value: 1400 },
        innerHeight: { configurable: true, writable: true, value: 800 },
    });
    Object.defineProperty(window.document.documentElement, 'scrollHeight', { configurable: true, value: 2000 });
    Object.defineProperty(window.document, 'hidden', { configurable: true, get: () => hidden });
    const ctx = {
        window, document: window.document, URL, URLSearchParams,
        DOMParser: window.DOMParser, NodeFilter: window.NodeFilter, Event: window.Event,
        getComputedStyle: window.getComputedStyle.bind(window), AbortController,
        FORUM_BASE_URL: base,
        options: { infinite_scrolling: true, display_ajax_loader: false, dynamic_function: true,
            add_profile_button: true, ui_language: 'auto', title_format: '%C %S - %T', ...settings.options },
        console: { warn: (...args) => warnings.push(args), log: () => {} },
        fetch: () => assert.fail('Unexpected network request'),
        GM_notification: (...args) => notices.push(args),
        GM_getValue: (key, fallback) => storage.has(key) ? storage.get(key) : fallback,
        GM_setValue: (key, value) => storage.set(key, value),
        setInterval: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
        clearInterval: id => timers.delete(id),
        setTimeout: () => assert.fail('An immediate retry or unrelated timer was scheduled'),
        clearTimeout: () => {},
        enhanceContent: (root, page) => enhanced.push({ root, page }),
        colorizeThePages: () => {}, changeColorOfNewMessage: () => {}, colorizeFriendsMe: () => {},
        updateDynamicContent: () => {},
        ...settings.globals,
    };
    ctx.parse = value => new window.DOMParser().parseFromString(value, 'text/html');
    ctx.flush = async () => {
        while (frames.length) frames.shift()(0);
        await new Promise(resolve => setImmediate(resolve));
    };
    ctx.scroll = async () => { window.dispatchEvent(new window.Event('scroll')); await ctx.flush(); };
    ctx.setHidden = value => { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); };
    ctx.timers = timers; ctx.notices = notices; ctx.warnings = warnings;
    ctx.enhanced = enhanced; ctx.storage = storage;
    return ctx;
}

test('quick reply toggle remains independent of the chat toolbar and preserves the reply draft', t => {
    const ctx = setup(t, '<div id="rin-toolbar"><button>Chat</button></div><form id="postform"><textarea name="message">Draft</textarea></form>',
        { options: { quick_reply: true, ui_language: 'en' } });
    loadFunctions(ctx, ['setupQuickReplyPanel']);
    ctx.setupQuickReplyPanel();
    ctx.setupQuickReplyPanel();
    const button = ctx.document.getElementById('rin-quick-reply-toggle');
    const panel = ctx.document.getElementById('postform');
    assert.equal(ctx.document.querySelectorAll('#rin-quick-reply-toggle').length, 1);
    assert.equal(button.parentElement, ctx.document.body);
    assert.equal(ctx.document.querySelector('#rin-toolbar').children.length, 1);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    button.click();
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(button.textContent, 'Hide Quick Reply Panel');
    assert.equal(panel.classList.contains('rin-quick-reply-open'), true);
    button.click();
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(button.textContent, 'Show Quick Reply Panel');
    assert.equal(panel.classList.contains('rin-quick-reply-open'), false);
    assert.equal(panel.querySelector('textarea').value, 'Draft');
});

test('Russian and English logout labels preserve the entire bracketed username; guests need no menu', t => {
    for (const prefix of ['Выход', 'Logout']) {
        const ctx = setup(t, '<div id="menubar"><a href="./ucp.php?mode=logout&amp;sid=test">' +
            `${prefix} [ Иван [RIN] &amp; 50% ]</a></div>`);
        loadFunctions(ctx, ['CONNECTED', 'USERNAME']);
        assert.equal(vm.runInContext('CONNECTED', ctx), true);
        assert.equal(vm.runInContext('USERNAME', ctx), 'Иван [RIN] & 50%');
    }
    for (const html of ['', '<div id="menubar"><a href="./ucp.php?mode=login">Вход</a></div>']) {
        const ctx = setup(t, html);
        loadFunctions(ctx, ['CONNECTED', 'USERNAME']);
        assert.equal(vm.runInContext('CONNECTED', ctx), false);
        assert.equal(vm.runInContext('USERNAME', ctx), '');
    }
});

test('runtime language uses lang or xml:lang, honors overrides and preserves substituted user text', t => {
    const ctx = setup(t, '<html lang="ru-RU"><body></body></html>');
    loadFunctions(ctx, ['rinText']);
    assert.equal(ctx.rinText('Show Chat'), 'Показать чат');
    const name = 'Иван $& {count} %p';
    assert.equal(ctx.rinText('Add {name} as a friend', { name }), `Добавить ${name} в друзья`);
    ctx.options.ui_language = 'en';
    assert.equal(ctx.rinText('Show Chat'), 'Show Chat');
    ctx.options.ui_language = 'auto';
    ctx.document.documentElement.removeAttribute('lang');
    ctx.document.documentElement.setAttribute('xml:lang', 'ru');
    assert.equal(ctx.rinText('Search'), 'Поиск');
    ctx.document.documentElement.setAttribute('xml:lang', 'en');
    assert.equal(ctx.rinText('Search'), 'Search');
    ctx.options.ui_language = 'ru';
    assert.equal(ctx.rinText('Search'), 'Поиск');
});

test('title formatting keeps Russian section text and complete hyphenated topic titles', t => {
    const ctx = setup(t, '<title>CS RIN - Steam Underground • Просмотр темы - Original - suffix</title>' +
        '<div id="pageheader"><a class="titles" href="./viewtopic.php?t=42">[Release] Игра - Deluxe - 2026</a></div>',
        { options: { title_format: '%C %S | %RT' } });
    loadFunctions(ctx, ['setupPageTitle']);
    ctx.setupPageTitle();
    assert.equal(ctx.document.title, 'CS RIN - Steam Underground • Просмотр темы | Игра - Deluxe - 2026');
});

test('profile insertion requires the exact username and a numeric native profile, including search fallback', async t => {
    const menu = '<div id="menubar"><a id="native-ucp" href="./ucp.php"><img src="./styles/rinDark/theme/images/icon_mini_profile.gif" alt="*">Личный раздел</a>' +
        ' &nbsp;:: &nbsp;<a id="native-inbox" href="./ucp.php?i=pm&folder=inbox">Личные сообщения</a></div>';
    const decoys = '<a href="./memberlist.php?mode=viewprofile&amp;u=2">Анна Мария</a>' +
        '<a href="https://example.org/forum/memberlist.php?mode=viewprofile&amp;u=3">Анна</a>' +
        '<a href="./memberlist.php?mode=searchuser&amp;u=4">Анна</a>' +
        '<a href="./memberlist.php?mode=viewprofile&amp;u=invalid">Анна</a>';
    const ctx = setup(t, menu + decoys, { globals: { CONNECTED: true, USERNAME: 'Анна' } });
    const requests = [];
    ctx.fetchForumDocument = async href => {
        requests.push(href);
        return ctx.parse(decoys + '<a href="./memberlist.php?mode=viewprofile&amp;u=55">Анна</a>');
    };
    loadFunctions(ctx, ['addProfileButton']);
    await ctx.addProfileButton();
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0]).searchParams.get('username'), 'Анна');
    assert.equal(new URL(ctx.document.getElementById('profile_link').href).searchParams.get('u'), '55');
    const profile = ctx.document.getElementById('profile_link');
    assert.equal(profile.previousElementSibling.id, 'native-ucp');
    assert.equal(profile.nextElementSibling.id, 'native-inbox');
    assert.equal(profile.querySelector('img').src, ctx.document.querySelector('#native-ucp img').src);
    assert.notEqual(profile.querySelector('img'), ctx.document.querySelector('#native-ucp img'));
    assert.equal(profile.querySelector('img').width, 12);
    assert.equal(profile.querySelector('img').height, 13);
    assert.equal(profile.nextSibling.textContent, ' \u00a0:: \u00a0');
    await ctx.addProfileButton();
    assert.equal(requests.length, 1, 'a verified exact-match profile is reused');
    assert.equal(ctx.document.querySelectorAll('#profile_link').length, 1);
});

test('menu colors recognize native rules and FAQ icons without overwriting unread private messages', t => {
    const ctx = setup(t, '<div id="logodesc"><h1>CS RIN</h1></div><div id="menubar">' +
        '<a id="rules" href="./viewtopic.php?f=10&t=44034"><img src="./styles/rinDark/theme/images/icon_mini_rules.gif">Правила</a>' +
        '<a id="faq" href="./viewtopic.php?f=10&t=98158"><img src="./styles/rinDark/theme/images/icon_mini_faq.gif">Вопросы</a>' +
        '<a id="ucp" href="./ucp.php">Личный раздел</a><a id="inbox" style="color:red" href="./ucp.php?i=pm&folder=inbox">1 сообщение</a>' +
        '<a id="login" href="./ucp.php?mode=login">Вход</a><a id="search" href="./search.php">Поиск</a>' +
        '<a id="foreign" href="https://example.org/search.php">External</a></div>',
    { options: { colorize_the_page: true }, globals: { Math: Object.assign(Object.create(Math), { random: () => 0.25 }) } });
    loadFunctions(ctx, ['colorizeThePages']);
    ctx.colorizeThePages();
    const colorOf = id => ctx.document.getElementById(id).style.color;
    assert.equal(colorOf('rules'), 'rgb(255, 160, 122)');
    assert.equal(colorOf('faq'), 'rgb(144, 238, 144)');
    assert.equal(colorOf('ucp'), 'rgb(135, 206, 235)');
    assert.equal(colorOf('inbox'), 'red');
    assert.equal(colorOf('login'), 'rgb(255, 0, 0)');
    assert.equal(colorOf('search'), 'rgb(135, 206, 250)');
    assert.equal(colorOf('foreign'), '');
    assert.equal(ctx.document.querySelector('#logodesc h1').style.color, 'rgb(63, 255, 255)');
});

test('topic tags retain their original colors and bracket sizing without rebuilding native icons', t => {
    const ctx = setup(t, '<div style="background:rgb(30,30,30)"><a class="topictitle" href="./viewtopic.php?t=42">' +
        '<img src="./icon.gif">[Steam] Game [GOG]</a></div>', { options: { custom_tags: true } });
    loadFunctions(ctx, ['tagify', 'colorize']);
    const title = ctx.document.querySelector('.topictitle');
    const icon = title.querySelector('img');
    ctx.tagify();
    const tags = [...title.children].filter(node => node.tagName === 'SPAN');
    assert.equal(title.querySelector('img'), icon);
    assert.equal(title.textContent, '[Steam] Game [GOG]');
    assert.equal(tags.length, 2);
    assert.deepEqual(tags.map(node => node.style.fontSize), ['', '']);
    assert.deepEqual(tags.map(node => node.querySelector('span').textContent), ['Steam', 'GOG']);
    assert.deepEqual(tags.map(node => node.querySelector('span').style.fontSize), ['0.9em', '0.9em']);
    for (const [tag, color] of [['[Steam]', '#d3dec6'], ['[GOG]', '#7bf98f'], ['[Linux]', '#fe5dc2'], ['[Info]', '#5b96bb']]) {
        assert.equal(ctx.colorize(tag, title.parentElement), color);
    }
    assert.equal(ctx.colorize('', null), '#a9cfff', 'a zero hash and missing background cannot cause an infinite loop');
    ctx.tagify();
    assert.equal(title.querySelector('img'), icon);
    assert.deepEqual([...title.children].filter(node => node.tagName === 'SPAN'), tags);
});

test('friends legend returns only to the native group legend on the board index', async t => {
    const groups = '<span class="gensmall" id="groups">Группы: <a href="./memberlist.php?mode=group&g=5">Администраторы</a></span>';
    const quoted = '<div class="postbody"><span class="gensmall"><a href="./memberlist.php?mode=group&g=4">Copied legend</a></span></div>';
    for (const [path, html, expected] of [['index.php', quoted + groups, 1], ['', groups, 1],
        ['viewforum.php?f=14', groups, 0], ['index.php', quoted, 0],
        ['index.php', groups.replace('./memberlist.php', 'https://example.org/forum/memberlist.php'), 0]]) {
        const ctx = setup(t, html, { path: path || './', options: { colorize_friends_me: 3, ui_language: 'ru' },
            globals: { FRIENDS_LIST: ['Алиса'], USERNAME: 'Иван', retrievesFriendsLists: async () => {} } });
        loadFunctions(ctx, ['colorizeFriendsMe']);
        await ctx.colorizeFriendsMe();
        await ctx.colorizeFriendsMe();
        const legends = ctx.document.querySelectorAll('.rin-friends-legend');
        assert.equal(legends.length, expected);
        if (expected) {
            assert.equal(legends[0].parentElement.id, 'groups');
            assert.equal(legends[0].textContent, 'Друзья');
            assert.equal(legends[0].style.color, 'rgb(244, 22, 155)');
            assert.equal(new URL(legends[0].href).searchParams.get('mode'), 'friends');
        }
    }
});

test('pagination chooses the active numeric page without depending on English labels or fragments', t => {
    for (const russian of [true, false]) {
        const ctx = setup(t, topic(155, [1, 154, 156, 165], [100], { russian }));
        loadFunctions(ctx, ['getPagination']);
        const page = ctx.getPagination();
        assert.equal(page.current, 155, 'the total count and translated View topic heading are not the current page');
        assert.deepEqual(Array.from(page.links.keys()), [1, 154, 156, 165]);
        const next = new URL(page.links.get(156));
        assert.equal(next.searchParams.get('start'), '2325');
        assert.equal(next.searchParams.get('t'), '42');
        assert.equal(next.hash, '#p156');
        const last = ctx.getPagination(ctx.parse(topic(165, [1, 164], [101], { russian })));
        assert.equal(last.current, 165);
        assert.equal(Array.from(last.links.keys()).some(number => number > last.current), false);
    }
});

test('pagination ignores message-body lookalikes, foreign routes and missing navigation', t => {
    const html = '<div class="postbody">' + navigation(99, [98, 100]) + '</div>' +
        '<div><strong>5</strong><a href="https://example.org/forum/viewtopic.php?start=90">6</a>' +
        '<a href="./viewforum.php?f=10&start=90">6</a><a href="./viewtopic.php?t=42&start=oops">6</a></div>';
    const ctx = setup(t, html);
    loadFunctions(ctx, ['getPagination', 'setupInfiniteScroll']);
    assert.equal(ctx.getPagination(), null);
    assert.doesNotThrow(() => ctx.setupInfiniteScroll());
    assert.equal(ctx.document.querySelector('[name="page_nav"]'), null);
});

test('scrolling serializes loads, appends unique posts and stops permanently at the last page', async t => {
    const ctx = setup(t, topic(1, [2, 3], [100], { total: 3 }));
    const requests = [];
    let release;
    ctx.fetchForumDocument = href => {
        requests.push(href);
        if (requests.length === 1) return new Promise(resolve => { release = () => resolve(ctx.parse(topic(2, [1, 3], [100, 200], { total: 3 }))); });
        return Promise.resolve(ctx.parse(topic(3, [1, 2], [300], { total: 3 })));
    };
    loadFunctions(ctx, ['setupInfiniteScroll']);
    ctx.setupInfiniteScroll();
    await ctx.scroll();
    await ctx.scroll();
    assert.equal(requests.length, 1, 'a pending request blocks repeated scroll events');
    release(); await ctx.flush();
    await ctx.scroll();
    for (let i = 0; i < 5; i++) await ctx.scroll();
    assert.equal(requests.length, 2);
    assert.deepEqual([...ctx.document.querySelectorAll('#pagecontent > table')].map(node => node.dataset.post), ['100', '200', '300']);
    assert.equal(ctx.enhanced.length, 2);
    assert.equal(vm.runInContext('rinPaginationState.exhaustedAfter', ctx), true);
});

test('a repeated server page cannot generate the same offset request indefinitely', async t => {
    const ctx = setup(t, topic(1, [2], [100], { total: 2 }));
    let requests = 0;
    ctx.fetchForumDocument = async () => { requests++; return ctx.parse(topic(1, [2], [100], { total: 2 })); };
    loadFunctions(ctx, ['setupInfiniteScroll']);
    ctx.setupInfiniteScroll();
    for (let i = 0; i < 5; i++) await ctx.scroll();
    assert.equal(requests, 1);
    assert.equal(ctx.document.querySelectorAll('#pagecontent > table').length, 1);
    assert.equal(vm.runInContext('rinPaginationState.exhaustedAfter', ctx), true);
});

test('backward scrolling prepends once and preserves every original post header', async t => {
    const ctx = setup(t, topic(2, [1, 3], [200], { total: 3 }));
    let requests = 0;
    ctx.window.scrollY = 0;
    ctx.fetchForumDocument = async () => { requests++; return ctx.parse(topic(1, [2, 3], [100], { total: 3 })); };
    loadFunctions(ctx, ['setupInfiniteScroll']);
    ctx.setupInfiniteScroll();
    for (let i = 0; i < 4; i++) {
        ctx.window.dispatchEvent(new ctx.window.WheelEvent('wheel', { deltaY: -700 }));
        await ctx.flush();
    }
    assert.equal(requests, 1);
    assert.deepEqual([...ctx.document.querySelectorAll('#pagecontent > table')].map(node => node.dataset.post), ['100', '200']);
    assert.deepEqual([...ctx.document.querySelectorAll('#pagecontent .postauthor')].map(node => node.textContent), ['Автор 100', 'Автор 200']);
    assert.ok(ctx.document.querySelector('a[name="p200"]'), 'the native row anchoring the existing page is not removed');
    assert.equal(vm.runInContext('rinPaginationState.exhaustedBefore', ctx), true);
});

test('HTTP 429 halts infinite scrolling without immediate or repeated-event retries', async t => {
    const ctx = setup(t, topic(1, [2], [100], { total: 2 }));
    let requests = 0;
    ctx.fetch = async () => { requests++; return { ok: false, status: 429 }; };
    loadFunctions(ctx, ['setupInfiniteScroll']);
    ctx.setupInfiniteScroll();
    for (let i = 0; i < 5; i++) await ctx.scroll();
    assert.equal(requests, 1);
    assert.equal(vm.runInContext('rinPaginationState.halted', ctx), true);
    assert.equal(ctx.notices.length, 1);
    assert.equal(ctx.timers.size, 0);
});

test('dynamic refresh maintains one timer, prevents concurrent requests and aborts while hidden', async t => {
    const ctx = setup(t);
    const requests = [];
    ctx.fetch = (_href, request) => new Promise((resolve, reject) => {
        requests.push({ request, resolve });
        request.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    });
    loadFunctions(ctx, ['allDynamicFunction', 'dynamicFunction', 'startUpdating']);
    ctx.allDynamicFunction(); ctx.allDynamicFunction(); ctx.startUpdating();
    assert.equal(ctx.timers.size, 1);
    assert.equal([...ctx.timers.values()][0].delay, 60000);
    const first = ctx.dynamicFunction();
    const second = ctx.dynamicFunction();
    assert.equal(requests.length, 1);
    ctx.setHidden(true);
    await Promise.all([first, second]);
    assert.equal(requests[0].request.signal.aborted, true);
    assert.equal(ctx.timers.size, 0);
    await ctx.dynamicFunction();
    assert.equal(requests.length, 1, 'no request starts while hidden');
    ctx.setHidden(false);
    assert.equal(requests.length, 2);
    assert.equal(ctx.timers.size, 1);
    requests[1].resolve({ ok: true, status: 200, text: async () => '<html><body></body></html>' });
    await ctx.flush();
    ctx.window.dispatchEvent(new ctx.window.Event('pagehide'));
    assert.equal(ctx.timers.size, 0);
});

test('forum fetching rejects errors once, preserves language and records the response identity', async t => {
    const ctx = setup(t);
    const requests = [];
    ctx.fetch = async (href, init) => {
        requests.push({ href, init });
        return { ok: true, status: 200, url: `${base}viewtopic.php?lang=ru&t=42`, text: async () => '<p>Native content</p>' };
    };
    loadFunctions(ctx, ['fetchForumDocument']);
    const doc = await ctx.fetchForumDocument('./viewtopic.php?p=123#p123');
    assert.equal(new URL(requests[0].href).searchParams.get('lang'), 'ru');
    assert.equal(requests[0].init.credentials, 'same-origin');
    assert.equal(doc.rinSourceUrl, `${base}viewtopic.php?lang=ru&t=42`);
    assert.equal(doc.rinRequestUrl, requests[0].href);
    ctx.fetch = async () => { requests.push('rejected'); return { ok: false, status: 429 }; };
    await assert.rejects(ctx.fetchForumDocument('./viewtopic.php?t=42'), /HTTP 429/);
    assert.equal(requests.length, 2);
});

test('a 429 response stops dynamic polling until reload, including visibility-triggered refreshes', async t => {
    const ctx = setup(t);
    let requests = 0;
    ctx.fetch = async () => { requests++; return { ok: false, status: 429 }; };
    loadFunctions(ctx, ['allDynamicFunction', 'dynamicFunction', 'startUpdating']);
    ctx.allDynamicFunction();
    assert.equal(ctx.timers.size, 1);
    await ctx.dynamicFunction();
    assert.equal(requests, 1);
    assert.equal(ctx.timers.size, 0, 'the periodic timer is stopped after rate limiting');
    ctx.setHidden(true);
    ctx.setHidden(false);
    ctx.startUpdating();
    await ctx.dynamicFunction();
    await ctx.flush();
    assert.equal(ctx.timers.size, 0);
    assert.equal(requests, 1, 'returning to the tab must not retry a blocked session');
});

test('refresh updates the native online panel and leaves unrelated tables and missing panels intact', async t => {
    const panel = name => '<table id="online"><tbody><tr><td><img src="./styles/rinDark/imageset/whosonline.gif"></td>' +
        `<td><a href="./memberlist.php?mode=viewprofile&u=5">${name}</a></td></tr></tbody></table>`;
    const ctx = setup(t, '<div id="wrapcentre">' + panel('Alice') +
        '<table id="unrelated"><tbody><tr><td>Preserve this content</td></tr></tbody></table></div>');
    let updates = 0;
    ctx.updateDynamicContent = () => { updates++; };
    loadFunctions(ctx, ['dynamicFunction']);
    const originalPanel = ctx.document.getElementById('online');
    await ctx.dynamicFunction(ctx.parse('<div id="wrapcentre">' + panel('Борис') + '</div>'));
    assert.equal(ctx.document.getElementById('online'), originalPanel);
    assert.equal(originalPanel.querySelector('a').textContent, 'Борис');
    assert.equal(ctx.document.getElementById('unrelated').textContent, 'Preserve this content');
    await ctx.dynamicFunction(ctx.parse('<div id="wrapcentre"><p>Missing online panel</p></div>'));
    assert.equal(originalPanel.querySelector('a').textContent, 'Борис');
    assert.equal(updates, 2);
});
