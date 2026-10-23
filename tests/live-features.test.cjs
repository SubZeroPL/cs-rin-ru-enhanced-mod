const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const code = readFileSync(join(__dirname, '..', 'src', 'live-features.js'), 'utf8');
const base = 'https://cs.rin.ru/forum/';
const header = (topic = true, id = 42) => `<div id="pageheader"><a class="titles" href="./${topic ? 'viewtopic.php?t' : 'viewforum.php?f'}=${id}">Example</a></div>`;
const post = (id, author = 'Alice', userId = 10, body = 'Original message') =>
    `<table class="tablebg" data-post="${id}"><tbody><tr><td><a name="p${id}"></a><b class="postauthor">${author}</b></td>` +
    `<td><a href="./memberlist.php?mode=viewprofile&u=${userId}"><img alt="Профиль"></a></td></tr>` +
    `<tr><td colspan="2"><div class="postbody">${body}</div></td></tr></tbody></table>`;
const topic = (ids, extra = '', id = 42) => header(true, id) + `<div id="pagecontent">${ids.map(value => post(value)).join('')}${extra}</div>`;
const row = id => `<tr data-topic="${id}"><td class="row4"><img src="topic_read.gif"></td><td><a class="topictitle" href="./viewtopic.php?f=14&t=${id}">Topic ${id}</a></td></tr>`;
const forum = (ids, extra = '', id = 14) => header(false, id) + `<div id="pagecontent"><table class="tablebg"><tbody>` +
    '<tr><td class="cat" colspan="2">Topics</td></tr>' + ids.map(row).join('') + '<tr><td class="cat" colspan="2">End</td></tr></tbody></table>' + extra + '</div>';
const nav = (current, links = [], topicId = 42) => `<div class="pagination">Страница <strong>${current}</strong>` +
    links.map(number => ` <a href="./viewtopic.php?t=${topicId}&start=${(number - 1) * 15}">${number}</a>`).join('') + '</div>';
const sort = (sd = 'a', sk = 't') => `<select name="sd"><option>${sd}</option></select><select name="sk"><option>${sk}</option></select>`;

function setup(t, html, settings = {}) {
    const dom = new JSDOM(html, { url: base + (settings.path || 'viewtopic.php?t=42') });
    t.after(() => dom.window.close());
    const enhanced = [];
    const translations = {
        'Add friend': 'Добавить в друзья', 'Remove friend': 'Удалить из друзей',
        'More posts are available on the next page.': 'Новые сообщения доступны на следующей странице.',
    };
    let requests = 0;
    dom.window.scrollBy = () => {};
    const ctx = { document: dom.window.document, window: dom.window, URL, BigInt,
        FORUM_BASE_URL: base, CONNECTED: settings.connected ?? true, USERNAME: settings.username || 'Me',
        FRIENDS_LIST: settings.friends || [],
        options: { friend_buttons: true, dynamic_function: true, dynamic_content: true, ...settings.options },
        rinText: (text, vars = {}) => (settings.russian ? translations[text] || text : text).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? ''),
        enhanceContent: (node, page) => enhanced.push({ node, page }),
        contentItemKey: node => node.dataset.topic ? `topic:${node.dataset.topic}` : `post:${node.dataset.post}`,
        fetch: () => { requests++; throw new Error('Live features must not fetch'); },
        GM_xmlhttpRequest: () => { requests++; throw new Error('Live features must not fetch'); },
        // The module consumes the main pagination helper's {current, links} contract.
        getPagination: page => {
            const element = page.querySelector('.pagination');
            return element ? { element, current: Number(element.querySelector('strong').textContent),
                links: new Map(Array.from(element.querySelectorAll('a')).map(link => [Number(link.textContent), new URL(link.getAttribute('href'), base).href])) } : null;
        },
        enhanced, requestCount: () => requests,
    };
    if (settings.paginationState) ctx.rinPaginationState = settings.paginationState;
    vm.createContext(ctx);
    vm.runInContext(code, ctx, { filename: 'live-features.js' });
    ctx.parse = (html, path) => {
        const page = new dom.window.DOMParser().parseFromString(html, 'text/html');
        if (path) page.rinSourceUrl = new URL(path, base).href;
        return page;
    };
    return ctx;
}

test('friend links use native confirmation routes, encode names and never make requests', t => {
    const name = 'Алиса &amp; Bob + 50%';
    const ctx = setup(t, `<div id="pagecontent">${post(1, name)}${post(2, 'Friend', 22)}</div>`, { friends: ['Friend'] });
    ctx.addFriendButtons();
    const links = [...ctx.document.querySelectorAll('.rin-friend-button')];
    const add = new URL(links[0].href);
    const remove = new URL(links[1].href);
    assert.equal(add.pathname, '/forum/ucp.php');
    assert.equal(add.searchParams.get('mode'), 'friends');
    assert.equal(add.searchParams.get('add'), 'Алиса & Bob + 50%');
    assert.equal(remove.searchParams.get('remove'), '1');
    assert.equal(remove.searchParams.get('usernames[]'), '22');
    assert.equal(links[0].textContent, 'Add friend');
    assert.equal(links[1].textContent, 'Remove friend');
    assert.equal(links[0].target, '_blank');
    assert.equal(ctx.requestCount(), 0);
});

test('friend actions skip self, anonymous posts, fake quoted profiles and disconnected users', t => {
    const html = `<div id="pagecontent">${post(1, 'Me')}${post(2, 'Guest', 1)}${post(3, 'Valid', 20,
        '<b class="postauthor">Fake</b><a href="./memberlist.php?mode=viewprofile&u=30">Profile</a>')}</div>`;
    const ctx = setup(t, html);
    ctx.addFriendButtons();
    assert.equal(ctx.document.querySelectorAll('.rin-friend-button').length, 1);
    assert.equal(new URL(ctx.document.querySelector('.rin-friend-button').href).searchParams.get('add'), 'Valid');
    const disconnected = setup(t, html, { connected: false });
    disconnected.addFriendButtons();
    assert.equal(disconnected.document.querySelector('.rin-friend-button'), null);
});

test('friend actions are idempotent, translate and work on a preview root', t => {
    const ctx = setup(t, `<div id="topic_preview">${post(1, 'Алиса', 11)}</div>`, { russian: true });
    const root = ctx.document.getElementById('topic_preview');
    ctx.addFriendButtons(root);
    ctx.FRIENDS_LIST.push('Алиса');
    ctx.addFriendButtons(root);
    assert.equal(root.querySelectorAll('.rin-friend-button').length, 1);
    assert.equal(root.querySelector('.rin-friend-button').textContent, 'Удалить из друзей');
    assert.equal(new URL(root.querySelector('.rin-friend-button').href).searchParams.get('usernames[]'), '11');
});

test('topic refresh appends only new posts while preserving old nodes, listeners, drafts and spoiler state', t => {
    const ctx = setup(t, topic([1, 2], '<form id="postform"><textarea name="message">My draft</textarea></form>'));
    const original = ctx.document.querySelector('[data-post="1"]');
    original.querySelector('.postbody').innerHTML = '<div class="quotecontent" style="display:none">Unchanged</div><button>Click</button>';
    let clicks = 0;
    original.querySelector('button').addEventListener('click', () => clicks++);
    const page = ctx.parse(topic([1, 2, 3]));
    ctx.updateDynamicContent(page);
    ctx.updateDynamicContent(page);
    assert.deepEqual([...ctx.document.querySelectorAll('[data-post]')].map(node => node.dataset.post), ['1', '2', '3']);
    assert.equal(ctx.document.querySelector('[data-post="1"]'), original);
    assert.equal(original.querySelector('.quotecontent').style.display, 'none');
    assert.equal(ctx.document.querySelector('textarea').value, 'My draft');
    original.querySelector('button').click();
    assert.equal(clicks, 1);
    assert.equal(ctx.enhanced.length, 1);
    assert.equal(ctx.enhanced[0].page, page);
    assert.equal(ctx.requestCount(), 0);
});

test('cross-topic, cross-forum, different pages/sorts and preview-only metadata never merge', t => {
    for (const [current, fresh, path] of [
        [topic([1]), topic([1, 2], '', 99), 'viewtopic.php?t=42'],
        [forum([10]), forum([11, 10], '', 99), 'viewforum.php?f=14'],
        [topic([1], nav(1, [2])), topic([16, 17], nav(2, [1])), 'viewtopic.php?t=42'],
        [topic([1], sort('a')), topic([1, 2], sort('d')), 'viewtopic.php?t=42'],
        [topic([1]), `<div id="topic_preview">${header()}</div><div id="pagecontent">${post(1)}${post(2)}</div>`, 'viewtopic.php?t=42'],
    ]) {
        const ctx = setup(t, current, { path });
        ctx.updateDynamicContent(ctx.parse(fresh));
        assert.equal(ctx.enhanced.length, 0);
    }
});

test('a new pagination boundary exposes a native next-page link without fetching it', t => {
    const ctx = setup(t, topic([1, 2]), { russian: true });
    ctx.updateDynamicContent(ctx.parse(topic([1, 2, 3], nav(1, [2]))));
    const notice = ctx.document.querySelector('#rin-live-content-notice a');
    assert.equal(new URL(notice.href).searchParams.get('start'), '15');
    assert.equal(notice.textContent, 'Новые сообщения доступны на следующей странице.');
    assert.equal(ctx.requestCount(), 0);
});

test('refreshing an older topic page cannot insert behind pages already loaded by infinite scrolling', t => {
    const state = { pages: new Map([[1, { items: [] }], [2, { items: [] }]]), max: 2 };
    const ctx = setup(t, topic([1, 2, 16], nav(1, [2])), { paginationState: state });
    ctx.updateDynamicContent(ctx.parse(topic([1, 2, 3], nav(1, [2]))));
    assert.equal(ctx.document.querySelector('[data-post="3"]'), null);
    assert.equal(ctx.enhanced.length, 0);
});

test('new posts on the last loaded page extend the shared pagination items without duplicates', t => {
    const entry = { items: [] };
    const state = { pages: new Map([[1, { items: [] }], [2, entry]]), max: 2, exhaustedAfter: true, keys: new Set() };
    const ctx = setup(t, topic([1, 16, 17], nav(2, [1])), { paginationState: state, path: 'viewtopic.php?t=42&start=15' });
    const fresh = ctx.parse(topic([16, 17, 18], nav(2, [1, 3])));
    ctx.updateDynamicContent(fresh);
    ctx.updateDynamicContent(fresh);
    assert.equal(entry.items.length, 1);
    assert.equal(entry.items[0].dataset.rinPage, '2');
    assert.equal(state.keys.has('post:18'), true);
    assert.equal(state.exhaustedAfter, false);
});

test('forum refresh inserts new topic rows once and leaves categories and existing rows intact', t => {
    const ctx = setup(t, forum([10, 9]), { path: 'viewforum.php?f=14' });
    const existing = ctx.document.querySelector('[data-topic="10"]');
    const cats = [...ctx.document.querySelectorAll('.cat')];
    const fresh = ctx.parse(forum([12, 11, 10, 9]));
    ctx.updateDynamicContent(fresh);
    ctx.updateDynamicContent(fresh);
    assert.deepEqual([...ctx.document.querySelectorAll('[data-topic]')].map(node => node.dataset.topic), ['12', '11', '10', '9']);
    assert.equal(ctx.document.querySelector('[data-topic="10"]'), existing);
    assert.deepEqual([...ctx.document.querySelectorAll('.cat')], cats);
    assert.equal(ctx.enhanced.length, 2);
});

test('forum pages after page one and disabled dynamic features remain unchanged', t => {
    const ctx = setup(t, forum([10, 9], nav(2, [1])), { path: 'viewforum.php?f=14&start=25' });
    ctx.updateDynamicContent(ctx.parse(forum([11, 10], nav(2, [1]))));
    assert.equal(ctx.document.querySelector('[data-topic="11"]'), null);
    for (const flag of ['dynamic_function', 'dynamic_content']) {
        const disabled = setup(t, topic([1]), { options: { [flag]: false } });
        disabled.updateDynamicContent(disabled.parse(topic([1, 2])));
        assert.equal(disabled.document.querySelector('[data-post="2"]'), null);
    }
});

test('forum refresh does not copy category rows or insert announcements into the topics section', t => {
    const section = name => `<tr><td class="row3" colspan="2">${name}</td></tr>`;
    const list = content => header(false, 14) + `<div id="pagecontent"><table class="tablebg"><tbody>${content}</tbody></table></div>`;
    const ctx = setup(t, list(section('Темы') + row(10)), { path: 'viewforum.php?f=14' });
    ctx.updateDynamicContent(ctx.parse(list(section('Объявления') + row(99) + section('Темы') + row(11) + row(10))));
    assert.deepEqual([...ctx.document.querySelectorAll('[data-topic]')].map(node => node.dataset.topic), ['11', '10']);
    assert.equal(ctx.document.querySelectorAll('.row3').length, 1);
});

test('forum inserts keep pagination items in DOM order and register keys before another page load', t => {
    const entry = { items: [] };
    const state = { pages: new Map([[1, entry]]), min: 1, max: 1, keys: new Set(['topic:10', 'topic:9']) };
    const ctx = setup(t, forum([10, 9]), { path: 'viewforum.php?f=14', paginationState: state });
    entry.items.push(...ctx.document.querySelectorAll('[data-topic]'));
    ctx.updateDynamicContent(ctx.parse(forum([12, 11, 10, 9])));
    assert.deepEqual(entry.items.map(node => node.dataset.topic), ['12', '11', '10', '9']);
    assert.equal(state.keys.has('topic:12'), true);
    assert.equal(state.keys.has('topic:11'), true);
    const older = ctx.parse(forum([8])).querySelector('[data-topic]');
    entry.items.at(-1).after(ctx.document.importNode(older, true));
    assert.deepEqual([...ctx.document.querySelectorAll('[data-topic]')].map(node => node.dataset.topic), ['12', '11', '10', '9', '8']);
});

test('forum insertion compensates scrolling around the same visible row and preserves focused drafts', t => {
    const ctx = setup(t, forum([10, 9], '<textarea id="draft">Unsaved text</textarea>'), { path: 'viewforum.php?f=14' });
    const original = ctx.document.querySelector('[data-topic="10"]');
    const positions = [];
    ctx.window.scrollBy = (x, y) => positions.push([x, y]);
    original.getBoundingClientRect = () => {
        const top = [...ctx.document.querySelectorAll('[data-topic]')].indexOf(original) * 100;
        return { top, bottom: top + 100 };
    };
    const draft = ctx.document.getElementById('draft');
    draft.focus();
    ctx.updateDynamicContent(ctx.parse(forum([11, 10, 9])));
    assert.deepEqual(positions, [[0, 100]]);
    assert.equal(ctx.document.activeElement, draft);
    assert.equal(draft.value, 'Unsaved text');
});

test('ignored-user placeholders remain in place ahead of newly appended replies', t => {
    const ignored = '<table class="tablebg" data-post="2"><tbody><tr><td><a name="p2"></a>Message hidden</td></tr></tbody></table>';
    const current = header() + `<div id="pagecontent">${post(1)}${ignored}</div>`;
    const ctx = setup(t, current);
    const placeholder = ctx.document.querySelector('[data-post="2"]');
    ctx.updateDynamicContent(ctx.parse(header() + `<div id="pagecontent">${post(1)}${ignored}${post(3)}</div>`));
    assert.deepEqual([...ctx.document.querySelectorAll('[data-post]')].map(node => node.dataset.post), ['1', '2', '3']);
    assert.equal(ctx.document.querySelector('[data-post="2"]'), placeholder);
});
