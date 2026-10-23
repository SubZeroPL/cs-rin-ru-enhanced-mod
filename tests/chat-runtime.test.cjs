const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { chatPage, row } = require('../test-support/chat-fixtures.cjs');
const runtime = fs.readFileSync(path.join(__dirname, '../src/chat-runtime.js'), 'utf8');

function setup(t, initial = chatPage) {
    const dom = new JSDOM('<!doctype html><html><body><button id="rin-chat-toggle"></button><div id="chatDiv"></div><form id="postform"><textarea>Forum draft</textarea></form></body></html>',
        { url: 'https://cs.rin.ru/forum/viewtopic.php?t=42', runScripts: 'outside-only', pretendToBeVisual: true });
    t.after(() => dom.window.close());
    const window = dom.window;
    const timers = new Map();
    const calls = [];
    const reads = [];
    const replies = [];
    let hidden = false, id = 0;
    Object.defineProperty(window.document, 'hidden', { get: () => hidden });
    window.rinText = text => text;
    window.setTimeout = (callback, delay) => { const key = ++id; timers.set(key, { callback, delay }); return key; };
    window.clearTimeout = key => timers.delete(key);
    window.parseForumDocument = html => new window.DOMParser().parseFromString(html, 'text/html');
    window.fetchForumDocument = async (url, signal) => {
        reads.push({ url, signal });
        return typeof initial === 'function' ? initial(url, signal) : window.parseForumDocument(initial);
    };
    window.fetch = async (url, init) => {
        calls.push({ url, init });
        const next = replies.shift();
        if (next instanceof Error) throw next;
        if (typeof next === 'function') return next(url, init);
        return { ok: true, status: 200, text: async () => next ?? '---10' };
    };
    window.eval(runtime);
    const container = window.document.getElementById('chatDiv');
    const url = new window.URL('https://cs.rin.ru/forum/chat.php?lang=ru&sid=test');
    const flush = async () => { await new Promise(resolve => setImmediate(resolve)); };
    const open = () => window.startInlineChat(container, url);
    const tick = async () => {
        const [key, timer] = timers.entries().next().value;
        timers.delete(key); timer.callback(); await flush();
    };
    return { window, document: window.document, container, url, timers, calls, reads, replies, open, flush, tick,
        visibility(value) { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); } };
}

test('chat imports native markup without iframe, executing scripts, global IDs or inline handlers', async t => {
    const ctx = setup(t); await ctx.open();
    const { document, container } = ctx;
    assert.equal(container.querySelector('iframe, script, [onsubmit], [onclick]'), null);
    assert.ok(container.querySelector('#rin-chat-chat [data-rin-chat-id="10"]'));
    assert.equal(document.getElementById('chat'), null);
    assert.equal(document.querySelector('#postform textarea').value, 'Forum draft');
    assert.equal(container.querySelector('[name="form_token"]').value, 'native-token');
    assert.equal(ctx.reads[0].url, ctx.url.href);
    assert.equal(container.querySelector('.rin-chat-actions a').href, ctx.url.href);
    assert.equal(ctx.timers.size, 1);
    assert.equal([...ctx.timers.values()][0].delay, 15000);
    assert.equal(container.querySelector('.rin-chat-status').hidden, true);
    assert.equal(ctx.window.handle_send, undefined);
    assert.equal(ctx.window.jQuery, undefined);
});

test('chat polling uses native metadata, prepends messages once and updates online users and delay', async t => {
    const ctx = setup(t); await ctx.open();
    ctx.replies.push(`${row(11, 'new --- message')}${row(10)}---11---<div>Bob</div>---20---30---1240`);
    await ctx.tick();
    const params = ctx.calls[0].init.body;
    assert.equal(ctx.calls[0].init.method, 'POST');
    assert.equal(ctx.calls[0].init.credentials, 'same-origin');
    assert.equal(params.get('mode'), 'read');
    assert.equal(params.get('last_id'), '10');
    assert.equal(params.get('last_post'), '1234');
    assert.equal(params.get('read_interval'), '15000');
    assert.deepEqual([...ctx.container.querySelectorAll('[data-rin-chat-id]')].map(node => node.dataset.rinChatId), ['11', '10']);
    assert.match(ctx.container.textContent, /new --- message/);
    assert.equal(ctx.container.querySelector('#rin-chat-whois_online').textContent, 'Bob');
    assert.equal([...ctx.timers.values()][0].delay, 30000);
    ctx.replies.push('---11'); await ctx.tick();
    assert.equal(ctx.calls[1].init.body.get('last_time'), '20');
    assert.equal(ctx.calls[1].init.body.get('last_post'), '1240');
    assert.equal(ctx.container.querySelectorAll('[data-rin-chat-id]').length, 2);
});

test('idle reads with empty or whitespace bodies keep polling and preserve cursors before the next message', async t => {
    const ctx = setup(t); await ctx.open();
    ctx.replies.push(`${row(11, 'Before idle')}---11---<div>Alice</div>---20---30---1240`);
    await ctx.tick();
    const state = ctx.container.rinChatState;
    const previousMessage = state.messages.firstElementChild;
    const scroller = state.messages.parentElement;
    state.editor.value = 'Unsent draft'; scroller.scrollTop = 40;
    for (const empty of ['', ' \t\r\n\t ']) {
        ctx.replies.push(empty); await ctx.tick();
        assert.equal(state.failed, false, 'a successful idle read is not an error');
        assert.equal(state.status.hidden, true);
        assert.equal(state.retry.hidden, true);
        assert.equal(ctx.timers.size, 1, 'polling continues after an empty native read');
        assert.equal([...ctx.timers.values()][0].delay, 30000);
        assert.equal(state.lastId, '11');
        assert.equal(state.lastTime, '20');
        assert.equal(state.postTime, '1240');
        assert.equal(state.messages.firstElementChild, previousMessage, 'existing message nodes are untouched');
        assert.equal(state.messages.children.length, 2);
        assert.equal(state.editor.value, 'Unsent draft');
        assert.equal(scroller.scrollTop, 40);
    }
    ctx.replies.push(`${row(12, 'After idle')}---12---<div>Alice and Bob</div>---25---45---1248`);
    await ctx.tick();
    assert.equal(state.lastId, '12'); assert.equal(state.lastTime, '25'); assert.equal(state.postTime, '1248');
    assert.deepEqual([...state.messages.children].map(node => node.dataset.rinChatId), ['12', '11', '10']);
    assert.equal(state.online.textContent, 'Alice and Bob');
    assert.equal([...ctx.timers.values()][0].delay, 45000);
    assert.equal(ctx.calls.length, 4);
    for (const call of ctx.calls.slice(1)) {
        assert.equal(call.init.body.get('mode'), 'read');
        assert.equal(call.init.body.get('last_id'), '11');
        assert.equal(call.init.body.get('last_time'), '20');
        assert.equal(call.init.body.get('last_post'), '1240');
    }
});

test('native response whitespace and numeric separators inside messages cannot corrupt metadata', async t => {
    const ctx = setup(t); await ctx.open();
    ctx.replies.push(`${row(11, 'literal ---123--- text')}---11\n\t---\n<div>Alice ---999--- Bob</div>---20\n---30\n---1240\n`);
    await ctx.tick();
    const state = ctx.container.rinChatState;
    assert.equal(state.lastId, '11'); assert.equal(state.lastTime, '20'); assert.equal(state.postTime, '1240');
    assert.equal(state.delay, 30000);
    assert.match(state.messages.textContent, /literal ---123--- text/);
    assert.equal(state.online.textContent, 'Alice ---999--- Bob');
    assert.equal(state.failed, false);
});

test('a native update with an empty LAST_POST field preserves the previous cursor while updating presence', async t => {
    const ctx = setup(t); await ctx.open();
    ctx.replies.push(`${row(11, 'Updated')}---11\n---<div>Alice online</div>---20---30---\n\t `);
    await ctx.tick();
    const state = ctx.container.rinChatState;
    assert.equal(state.failed, false);
    assert.equal(state.lastId, '11');
    assert.equal(state.lastTime, '20');
    assert.equal(state.postTime, '1234', 'an omitted timestamp does not erase the previous cursor');
    assert.equal(state.online.textContent, 'Alice online');
    assert.equal(state.messages.firstElementChild.dataset.rinChatId, '11');
    assert.equal([...ctx.timers.values()][0].delay, 30000);
    ctx.replies.push(''); await ctx.tick();
    assert.equal(ctx.calls.at(-1).init.body.get('last_post'), '1234');
    assert.equal(ctx.calls.at(-1).init.body.get('last_time'), '20');
    assert.equal(state.failed, false);
});

test('chat honors the same-origin native endpoint with its session while preserving language', async t => {
    const html = chatPage.replace("throw new Error('Downloaded code must never execute');", 'xmlHttp.open("POST", "./chat.php?sid=native-session", true);');
    const ctx = setup(t, html); await ctx.open();
    await ctx.tick();
    const endpoint = new URL(ctx.calls[0].url);
    assert.equal(endpoint.searchParams.get('sid'), 'native-session');
    assert.equal(endpoint.searchParams.get('lang'), 'ru');
});

test('mocked chat submission preserves native tokens and forum draft, blocks double submit, clears only unchanged sent text', async t => {
    const ctx = setup(t); await ctx.open();
    const editor = ctx.container.querySelector('[name="message"]');
    const form = editor.closest('form'); editor.value = 'My message';
    let finish;
    ctx.replies.push(() => new Promise(resolve => { finish = resolve; }));
    form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(ctx.calls.length, 1);
    assert.equal(ctx.calls[0].init.body.get('mode'), 'add');
    assert.equal(ctx.calls[0].init.body.get('message'), 'My message');
    assert.equal(ctx.calls[0].init.body.get('form_token'), 'native-token');
    assert.equal(ctx.calls[0].init.body.get('submit'), 'Submit');
    assert.equal(editor.value, 'My message', 'sending does not erase an unconfirmed draft');
    editor.value = 'Next message';
    finish({ ok: true, text: async () => `${row(11)}---11` }); await ctx.flush();
    assert.equal(editor.value, 'Next message', 'typing during send is preserved');
    ctx.replies.push(`${row(12)}---12`);
    form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true })); await ctx.flush();
    assert.equal(editor.value, '');
    assert.equal(ctx.document.querySelector('#postform textarea').value, 'Forum draft');
});

for (const [label, body] of [['empty', ''], ['whitespace', ' \n\t\r\n']]) {
    test(`a successful HTTP response containing only ${label} content never confirms a submitted message`, async t => {
        const ctx = setup(t); await ctx.open();
        const state = ctx.container.rinChatState;
        state.editor.value = 'Preserve this unconfirmed message';
        ctx.replies.push(body);
        state.form.dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true }));
        await ctx.flush();
        assert.equal(state.editor.value, 'Preserve this unconfirmed message');
        assert.equal(state.failed, true);
        assert.equal(state.status.hidden, false);
        assert.equal(state.retry.hidden, false);
        assert.equal(state.messages.children.length, 1);
        assert.equal(state.lastId, '10');
        assert.equal(ctx.timers.size, 0);
        assert.equal(ctx.calls.length, 1, 'an uncertain submission is never resent automatically');
        assert.equal(ctx.calls[0].init.body.get('mode'), 'add');
    });
}

test('request failure preserves chat draft, stops polling and offers manual retry and native chat', async t => {
    const ctx = setup(t); await ctx.open();
    const editor = ctx.container.querySelector('[name="message"]'); editor.value = 'Keep me';
    ctx.replies.push(new Error('network failure'));
    editor.closest('form').dispatchEvent(new ctx.window.Event('submit', { bubbles: true, cancelable: true })); await ctx.flush();
    assert.equal(editor.value, 'Keep me');
    assert.equal(ctx.timers.size, 0);
    assert.match(ctx.container.querySelector('.rin-chat-status').textContent, /Check the full chat/);
    const retry = ctx.container.querySelector('.rin-chat-actions button'); assert.equal(retry.hidden, false);
    ctx.replies.push(''); retry.click(); await ctx.flush();
    assert.equal(ctx.calls.at(-1).init.body.get('mode'), 'read', 'retry never resends the previous message');
    assert.equal(ctx.timers.size, 1);
    assert.equal(editor.value, 'Keep me');
    assert.equal(ctx.container.rinChatState.failed, false, 'an idle read restores a failed connection');
    assert.equal(ctx.container.querySelector('.rin-chat-status').hidden, true);
    assert.equal(retry.hidden, true);
});

test('a login page returned by a later read remains an error and never replaces the existing chat', async t => {
    const ctx = setup(t); await ctx.open();
    const state = ctx.container.rinChatState;
    const previousMessage = state.messages.firstElementChild;
    state.editor.value = 'Unsent message';
    ctx.replies.push('<!doctype html><html><body><form action="./ucp.php?mode=login"><input name="username"><input type="password" name="password"></form></body></html>');
    await ctx.tick();
    assert.equal(state.failed, true);
    assert.equal(state.status.hidden, false);
    assert.equal(state.retry.hidden, false);
    assert.equal(ctx.timers.size, 0, 'authentication failures do not retry indefinitely');
    assert.equal(state.messages.firstElementChild, previousMessage);
    assert.equal(state.lastId, '10');
    assert.equal(state.editor.value, 'Unsent message');
    assert.equal(ctx.container.querySelector('[name="username"], [type="password"]'), null);
});

test('visibility pauses polling and closing aborts requests, removes timers and preserves unsent draft on reopen', async t => {
    const ctx = setup(t); await ctx.open();
    ctx.container.querySelector('[name="message"]').value = 'Chat draft';
    ctx.visibility(true); assert.equal(ctx.timers.size, 0);
    ctx.visibility(false); assert.equal(ctx.timers.size, 1);
    const state = ctx.container.rinChatState;
    ctx.window.stopInlineChat(ctx.container);
    assert.equal(state.controller.signal.aborted, true);
    assert.equal(ctx.timers.size, 0);
    ctx.visibility(false); assert.equal(ctx.timers.size, 0);
    await ctx.open();
    assert.equal(ctx.container.querySelector('[name="message"]').value, 'Chat draft');
    assert.equal(ctx.timers.size, 1);
});

test('login pages and HTTP error responses show recovery instead of an empty or denied iframe', async t => {
    const ctx = setup(t, '<html><body><form><input name="username"><input type="password"></form></body></html>');
    await ctx.open();
    assert.equal(ctx.container.querySelector('iframe, form'), null);
    assert.match(ctx.container.querySelector('.rin-chat-status').textContent, /sign in/);
    assert.equal(ctx.container.querySelector('.rin-chat-actions button').hidden, false);
    assert.equal(ctx.timers.size, 0);
});

test('closing before initial response finishes never inserts content or starts polling', async t => {
    let finish;
    const ctx = setup(t, () => new Promise(resolve => { finish = resolve; }));
    const loading = ctx.open();
    ctx.window.stopInlineChat(ctx.container); ctx.container.remove();
    finish(ctx.window.parseForumDocument(chatPage)); await loading;
    assert.equal(ctx.container.querySelector('#rin-chat-chat'), null);
    assert.equal(ctx.timers.size, 0);
});

test('mocked native delete removes only the selected chat message after confirmed empty response', async t => {
    const ctx = setup(t); await ctx.open();
    ctx.replies.push(new Error('failure'));
    const button = ctx.container.querySelector('[data-rin-chat-delete="10"]');
    button.click(); await ctx.flush();
    assert.ok(ctx.container.querySelector('[data-rin-chat-id="10"]'));
    ctx.replies.push(''); button.click(); await ctx.flush();
    assert.equal(ctx.calls.at(-1).init.body.get('mode'), 'delete');
    assert.equal(ctx.calls.at(-1).init.body.get('chat_id'), '10');
    assert.equal(ctx.container.querySelector('[data-rin-chat-id="10"]'), null);
});
