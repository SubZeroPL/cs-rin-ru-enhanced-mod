const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const configSource = readFileSync(join(__dirname, '..', 'config.js'), 'utf8');
const configHTML = readFileSync(join(__dirname, '..', 'config.html'), 'utf8');
const base = 'https://cs.rin.ru/forum/';
const profile = `${base}memberlist.php?mode=viewprofile&u=321`;
const permalink = `${base}viewtopic.php?p=123#p123`;
const name = "O'Neil & A+B 50%25 😀 %p";
const defaultTemplate = '[b][url=%u]%m[/url][/b], [url=%p]post[/url]';
const legacyAuthorTemplate = '[b]@[url=%u]%m[/url][/b]';
const legacyPostTemplate = '[b]@[url=%u]%m[/url][/b], Re: [url=%p]Post[/url].';
const defaultMention = `[b][url=${profile}]${name}[/url][/b], [url=${permalink}]post[/url] `;
const buttonSelector = '[title="Reply with mentioning"]';
const oldConfig = '<div id="configWindow"><table><tr><td><select id="mentioning"><option value="1">Author</option></select></td></tr>' +
    '<tr><td><input id="mention_author_template"></td></tr><tr><td><input id="mention_post_template"></td></tr></table></div>';

function setup(t, html = '', options = {}, url = `${base}viewtopic.php?t=42`) {
    const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const saved = [];
    const ctx = { window: dom.window, document: dom.window.document, URL, URLSearchParams, Event: dom.window.Event,
        FORUM_BASE_URL: base, options: { mentioning: defaultTemplate, ...options },
        quickReplyPanel: dom.window.document.querySelector('#postform'),
        setTimeout: () => {}, GM_setValue: (key, value) => saved.push({ key, value }),
        GM_getValue: (_key, fallback) => fallback, CONNECTED: true, specialSearchParameters: {},
        GM_notification: () => {}, saved };
    loadFunctions(ctx, ['formatMention', 'initializeMention', 'mentionify', 'normalizeMentionOptions',
        'loadConfig', 'initializeMentionTemplateField', 'receiveConfigMessage']);
    return ctx;
}

function forumHTML(quick = false, locked = false) {
    return `<a href="./posting.php?mode=reply&t=42&sid=session"><img src="./images/${locked ? 'button_topic_locked' : 'button_topic_reply'}.gif" title="Reply to topic"></a>` +
        '<table class="tablebg"><tbody><tr><td><a name="p123"></a><span class="postauthor"></span>' +
        '<a href="./memberlist.php?mode=viewprofile&u=321&sid=session"><img title="Profile"></a></td>' +
        '<td><div class="gensmall"><div><a href="./viewtopic.php?p=123#p123"><img src="./images/icon_post_target.gif"></a></div>' +
        '<div id="bar"><a href="./posting.php?mode=quote&p=123"><img src="./images/icon_post_quote.gif"></a></div></div></td></tr>' +
        '<tr><td colspan="2"><div class="postbody">Post</div></td></tr></tbody></table>' +
        (quick ? '<textarea name="message">Unrelated</textarea><form id="postform"><textarea name="message">Draft </textarea></form>' : '');
}

function forum(t, options = {}, quick = false, locked = false) {
    const ctx = setup(t, forumHTML(quick, locked), options);
    ctx.document.querySelector('.postauthor').textContent = name;
    return ctx;
}

test('legacy modes migrate into one template without mutating settings or retaining legacy keys', t => {
    const ctx = setup(t);
    for (const [old, expected] of [[{ mentioning: 0 }, ''], [{ mentioning: 1 }, legacyAuthorTemplate],
        [{ mentioning: 2 }, legacyPostTemplate],
        [{ mentioning: 1, mention_author_template: 'Hi %m' }, 'Hi %m'],
        [{ mentioning: 2, mention_post_template: 'Post %p' }, 'Post %p'],
        [{ mentioning: 1, mention_author_template: '' }, ''],
        [{ mentioning: '%p', mention_author_template: 'Ignored', mention_post_template: 'Ignored' }, '%p'],
        [{ mentioning: '' }, ''], [{ mentioning: '  ' }, '  ']]) {
        const settings = { full_path_post_links: false, ...old };
        const before = JSON.stringify(settings);
        const migrated = ctx.normalizeMentionOptions(settings);
        assert.notEqual(migrated, settings);
        assert.equal(migrated.mentioning, expected);
        assert.equal(migrated.full_path_post_links, false);
        assert.equal(Object.hasOwn(migrated, 'mention_author_template'), false);
        assert.equal(Object.hasOwn(migrated, 'mention_post_template'), false);
        assert.equal(JSON.stringify(settings), before);
    }
    ctx.GM_getValue = () => ({ mentioning: 2, mention_post_template: 'Migrated %p' });
    ctx.loadConfig();
    assert.equal(ctx.options.mentioning, 'Migrated %p');
    assert.equal(Object.hasOwn(ctx.options, 'mention_post_template'), false);
});

test('one template determines the output and replaces known tokens once while preserving unknown tokens', t => {
    const ctx = setup(t);
    assert.equal(ctx.formatMention(name, '321', '123'), defaultMention);
    ctx.options.mentioning = '%m | %u | %p | %m | %unknown';
    assert.equal(ctx.formatMention(name, '321', '123'), `${name} | ${profile} | ${permalink} | ${name} | %unknown `);
    for (const template of ['Hi %m ', 'Hi %m\n']) {
        ctx.options.mentioning = template;
        assert.equal(ctx.formatMention(name, '321', '123'), template.replace('%m', name));
    }
    ctx.options.mentioning = '[url=%p]Post[/url]';
    assert.equal(ctx.formatMention(name, '321', '123'), `[url=${permalink}]Post[/url] `);
    for (const template of ['', '  ', '\n\t']) {
        ctx.options.mentioning = template;
        assert.equal(ctx.formatMention(name, '321', '123'), '');
    }
});

test('missing names or nonnumeric IDs are safe and produce no mention', t => {
    const ctx = setup(t);
    for (const args of [['', '321', '123'], [null, '321', '123'], [name, null, '123'],
        [name, '321&sid=x', '123'], [name, '-1', '123'], [name, '321', 'abc'], [name, '321', null]]) {
        assert.equal(ctx.formatMention(...args), '');
    }
});

test('full-reply buttons encode special names once and initialize the same formatted mention', t => {
    for (const [options, expected] of [[{}, defaultMention], [{ mentioning: '@%m → %p' }, `@${name} → ${permalink} `],
        [{ mentioning: '%p' }, `${permalink} `]]) {
        const ctx = forum(t, options);
        ctx.mentionify();
        ctx.mentionify();
        assert.equal(ctx.document.querySelectorAll(buttonSelector).length, 1);
        const url = new URL(ctx.document.querySelector(buttonSelector).parentElement.href);
        assert.equal(url.searchParams.get('a'), name);
        assert.equal(url.searchParams.get('u'), '321');
        assert.equal(url.searchParams.get('p'), '123');
        assert.equal(url.searchParams.get('t'), '42');
        assert.equal(url.searchParams.get('sid'), 'session');
        const reply = setup(t, '<textarea name="message"></textarea>', options, url.href);
        reply.initializeMention();
        reply.initializeMention();
        assert.equal(reply.document.querySelector('textarea').value, expected);
    }
});

test('initialization preserves drafts and ignores wrong routes, absent parameters and empty templates', t => {
    const query = `?mode=reply&do=mention&u=321&p=123&a=${encodeURIComponent(name)}`;
    for (const draft of ['Draft text', ' ']) {
        const ctx = setup(t, '<textarea name="message"></textarea>', {}, `${base}posting.php${query}`);
        ctx.document.querySelector('textarea').value = draft;
        ctx.initializeMention();
        assert.equal(ctx.document.querySelector('textarea').value, draft);
    }
    for (const [url, options] of [[`${base}viewtopic.php${query}`], [`${base}posting.php${query.replace('mode=reply', 'mode=edit')}`],
        [`${base}posting.php${query.replace('do=mention', 'do=other')}`], [`${base}posting.php${query.replace('u=321', 'u=bad')}`],
        [`${base}posting.php?mode=reply&do=mention&p=123`], [`${base}posting.php${query}`, { mentioning: '' }]]) {
        const ctx = setup(t, '<textarea name="message"></textarea>', options, url);
        ctx.initializeMention();
        assert.equal(ctx.document.querySelector('textarea').value, '');
    }
    assert.doesNotThrow(() => setup(t, '', {}, `${base}posting.php${query}`).initializeMention());
});

test('quick reply appends the same format only to its own textarea without duplicate handlers', t => {
    for (const [options, expected] of [[{}, defaultMention], [{ mentioning: '@%m → %p' }, `@${name} → ${permalink} `],
        [{ mentioning: '%p' }, `${permalink} `]]) {
        const ctx = forum(t, options, true);
        ctx.mentionify();
        ctx.mentionify();
        const button = ctx.document.querySelector(buttonSelector);
        const click = new ctx.window.MouseEvent('click', { bubbles: true, cancelable: true });
        let inputEvents = 0;
        ctx.quickReplyPanel.addEventListener('input', () => inputEvents++);
        button.dispatchEvent(click);
        assert.ok(click.defaultPrevented);
        assert.equal(inputEvents, 1);
        assert.equal(ctx.quickReplyPanel.querySelector('textarea').value, `Draft ${expected}`);
        assert.equal(ctx.document.querySelector('textarea').value, 'Unrelated');
        assert.equal(ctx.document.querySelectorAll(buttonSelector).length, 1);
    }
});

test('modified mention clicks preserve native navigation without changing the quick-reply draft', t => {
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
        const ctx = forum(t, {}, true);
        ctx.mentionify();
        const button = ctx.document.querySelector('.rin-mention-link');
        const href = button.href;
        let preventedByMention;
        let changes = 0;
        ctx.quickReplyPanel.addEventListener('input', () => changes++);
        ctx.document.body.addEventListener('click', event => {
            preventedByMention = event.defaultPrevented;
            event.preventDefault(); // JSDOM cannot perform the browser's native navigation.
        });
        button.dispatchEvent(new ctx.window.MouseEvent('click', {
            bubbles: true, cancelable: true, [modifier]: true,
        }));
        assert.equal(preventedByMention, false, modifier);
        assert.equal(ctx.quickReplyPanel.querySelector('textarea').value, 'Draft ', modifier);
        assert.equal(changes, 0, modifier);
        assert.equal(ctx.document.querySelector('.rin-action-feedback'), null, modifier);
        assert.equal(button.href, href, modifier);
        assert.equal(new URL(href).searchParams.get('do'), 'mention');
    }
});

test('a previously cancelled mention click does not append to the quick-reply draft', t => {
    const ctx = forum(t, {}, true);
    ctx.mentionify();
    ctx.document.addEventListener('click', event => event.preventDefault(), true);
    ctx.document.querySelector('.rin-mention-link').dispatchEvent(new ctx.window.MouseEvent('click', {
        bubbles: true, cancelable: true,
    }));
    assert.equal(ctx.quickReplyPanel.querySelector('textarea').value, 'Draft ');
    assert.equal(ctx.document.querySelector('.rin-action-feedback'), null);
});

test('empty or whitespace templates, locked topics and missing metadata add no buttons', t => {
    for (const ctx of [forum(t, { mentioning: '' }), forum(t, { mentioning: ' \n ' }), forum(t, {}, false, true)]) {
        assert.doesNotThrow(() => ctx.mentionify());
        assert.equal(ctx.document.querySelector(buttonSelector), null);
    }
    const incomplete = forum(t);
    incomplete.document.querySelector('[title="Profile"]').parentElement.remove();
    assert.doesNotThrow(() => incomplete.mentionify());
    assert.equal(incomplete.document.querySelector(buttonSelector), null);
});

test('new and old config assets expose exactly one Mentioning input and remove obsolete controls', t => {
    for (const html of [oldConfig, configHTML]) {
        const ctx = setup(t, html);
        ctx.initializeMentionTemplateField();
        ctx.initializeMentionTemplateField();
        assert.equal(ctx.document.querySelectorAll('input#mentioning[type="text"]').length, 1);
        assert.equal(ctx.document.querySelector('select#mentioning, #mention_author_template, #mention_post_template'), null);
        assert.equal(ctx.document.getElementById('mentioning').value, defaultTemplate);
        assert.ok(ctx.document.getElementById('mentioning').hasAttribute('data-originalValue'));
        ctx.options.mentioning = '';
        ctx.initializeMentionTemplateField();
        assert.equal(ctx.document.getElementById('mentioning').value, '');
        if (html === oldConfig) assert.equal(ctx.document.querySelectorAll('tr').length, 1);
    }
    assert.doesNotThrow(() => setup(t).initializeMentionTemplateField());
});

test('old config messages including NaN use the text field while explicit strings win and settings survive', t => {
    const ctx = setup(t, oldConfig, { script_enabled: true, full_path_post_links: false });
    ctx.initializeMentionTemplateField();
    const input = ctx.document.getElementById('mentioning');
    input.value = 'Edited %m → %p';
    for (const data of [{ mentioning: NaN }, { mentioning: 1 }, {}]) {
        ctx.receiveConfigMessage({ data: { script_enabled: true, full_path_post_links: undefined,
            mention_author_template: 'Obsolete', mention_post_template: 'Obsolete', ...data } });
        assert.equal(ctx.options.mentioning, input.value);
        assert.equal(ctx.options.full_path_post_links, false);
        assert.equal(Object.hasOwn(ctx.options, 'mention_author_template'), false);
        assert.equal(Object.hasOwn(ctx.options, 'mention_post_template'), false);
        assert.equal(ctx.saved.at(-1).value, ctx.options);
    }
    ctx.receiveConfigMessage({ data: { script_enabled: true, mentioning: '' } });
    assert.equal(ctx.options.mentioning, '');
    input.remove();
    ctx.receiveConfigMessage({ data: { script_enabled: true } });
    assert.equal(ctx.options.mentioning, '');
    ctx.receiveConfigMessage({ data: { script_enabled: true, mentioning: 2, mention_post_template: 'Legacy %p' } });
    assert.equal(ctx.options.mentioning, 'Legacy %p');
    const count = ctx.saved.length;
    ctx.receiveConfigMessage({ data: null });
    ctx.receiveConfigMessage({ data: { mentioning: 0 } });
    assert.equal(ctx.saved.length, count);
});

test('config.js saves the single string field through its typed API including an empty value', t => {
    const ctx = setup(t, configHTML);
    const uiWindow = ctx.window;
    ctx.document.getElementById('wholeWindow').dataset.rinInjected = 'true';
    const messages = [];
    let reloads = 0;
    uiWindow.postMessage = (data, target) => {
        messages.push(data);
        assert.equal(target, uiWindow.location.origin);
        ctx.receiveConfigMessage({ data, source: ctx.window, origin: target });
    };
    ctx.window = { location: { origin: uiWindow.location.origin, reload: () => reloads++ } };
    uiWindow.eval(configSource);
    const api = uiWindow.RinEnhancedConfig;
    api.init();
    api.setOptions(ctx.options);
    for (const template of ['[i]%m[/i]: %p', '']) {
        api.open();
        const input = ctx.document.getElementById('mentioning');
        input.value = template;
        input.dispatchEvent(new uiWindow.Event('input', { bubbles: true }));
        ctx.document.getElementById('rin-config-form').dispatchEvent(new uiWindow.Event('submit', { bubbles: true, cancelable: true }));
        assert.deepEqual(JSON.parse(JSON.stringify(messages.at(-1))), { type: 'rin-enhanced:config', options: { mentioning: template } });
        assert.equal(ctx.options.mentioning, template);
        assert.equal(ctx.saved.at(-1).value.mentioning, template);
    }
    assert.equal(messages.length, 2);
    assert.equal(reloads, 2);
});
