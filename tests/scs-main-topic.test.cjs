const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { loadFunctions } = require('../test-support/load-functions.cjs');

const base = 'https://cs.rin.ru/forum/';

function topicHtml({ forumId = '22', topicId = '42', appId = '690830', quoteAppId = null } = {}) {
    const quoted = quoteAppId ? `<div class="quotecontent"><a href="https://store.steampowered.com/app/${quoteAppId}/">Quoted game</a></div>` : '';
    const store = appId ? `<a class="postlink" href="https://store.steampowered.com/app/${appId}/">Steam Store</a>` : '';
    return `<!doctype html><html><body>
        <p class="breadcrumbs"><a href="./viewforum.php?f=${forumId}">Steam Content Sharing</a></p>
        <div id="pageheader"><a class="titles" href="./viewtopic.php?f=${forumId}&amp;t=${topicId}">SCS game</a></div>
        <table><tbody><tr><td id="topic-actions"><a id="reply" href="./posting.php?mode=reply&amp;f=${forumId}&amp;t=${topicId}"><img src="./styles/rinDark/imageset/en/button_topic_reply.gif"></a></td></tr></tbody></table>
        <div id="pagecontent"><table class="tablebg"><tbody>
        <tr><td><a name="p100"></a></td></tr>
        <tr><td><div class="postbody">${quoted}${store}</div></td></tr>
        </tbody></table></div>
    </body></html>`;
}

function setup(t, { html = topicHtml(), url = `${base}viewtopic.php?f=22&t=42`, enabled = true,
    pagination = null, fetchedHtml = null, language = 'en', origin = 'https://cs.rin.ru' } = {}) {
    const dom = new JSDOM(html, { url });
    t.after(() => dom.window.close());
    dom.window.document.documentElement.lang = language;
    const location = { href: url };
    const requests = [];
    const fetchedDoms = [];
    t.after(() => fetchedDoms.forEach(item => item.window.close()));
    const context = {
        document: dom.window.document,
        window: { location },
        URL,
        FORUM_BASE_URL: `${origin}/forum/`,
        options: { scs_main_topic_link: enabled, ui_language: language },
        rinText: text => language === 'ru' && text === 'Main game topic' ? 'Основная тема игры' : text,
        getPagination: () => pagination,
        fetchForumDocument: async requestUrl => {
            requests.push(requestUrl);
            if (fetchedHtml instanceof Error) throw fetchedHtml;
            const fetched = new JSDOM(fetchedHtml || topicHtml(), { url: requestUrl });
            fetchedDoms.push(fetched);
            return fetched.window.document;
        },
        console: { warn() {} },
    };
    loadFunctions(context, ['setupScsMainTopicLink']);
    return { ...context, browser: dom.window, requests };
}

test('SCS game topics receive one native button pointing to the site-root AppID route', async t => {
    const ctx = setup(t);
    await ctx.setupScsMainTopicLink();
    await ctx.setupScsMainTopicLink();
    const buttons = ctx.document.querySelectorAll('.rin-scs-main-topic');
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].tagName, 'INPUT');
    assert.equal(buttons[0].type, 'button');
    assert.ok(buttons[0].classList.contains('btnlite'));
    assert.equal(buttons[0].value, 'Main game topic');
    assert.equal(buttons[0].previousElementSibling.id, 'reply');
    buttons[0].click();
    assert.equal(ctx.window.location.href, 'https://cs.rin.ru/app/690830');
    assert.deepEqual(ctx.requests, []);
});

test('the button is opt-out and never appears outside SCS, outside topics or without a Steam AppID', async t => {
    const cases = [
        { enabled: false },
        { html: topicHtml({ forumId: '14' }), url: `${base}viewtopic.php?f=14&t=42` },
        { html: topicHtml({ appId: null }) },
        { html: '<!doctype html><div id="pageheader"><a class="titles" href="./viewforum.php?f=22">SCS</a></div>', url: `${base}viewforum.php?f=22` },
    ];
    for (const entry of cases) {
        const ctx = setup(t, entry);
        await ctx.setupScsMainTopicLink();
        assert.equal(ctx.document.querySelector('.rin-scs-main-topic'), null);
    }
});

test('only the first post own Store link supplies the AppID, never a quoted game', async t => {
    const ctx = setup(t, { html: topicHtml({ quoteAppId: '730', appId: '570' }) });
    await ctx.setupScsMainTopicLink();
    ctx.document.querySelector('.rin-scs-main-topic').click();
    assert.equal(ctx.window.location.href, 'https://cs.rin.ru/app/570');
});

test('later pages fetch page one and preserve the active forum mirror', async t => {
    const origin = 'http://csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion';
    const url = `${origin}/forum/viewtopic.php?f=22&t=42&start=15`;
    const ctx = setup(t, {
        html: topicHtml({ appId: null }), url, origin,
        pagination: { current: 2 },
        fetchedHtml: topicHtml({ appId: '1091500' }),
    });
    await ctx.setupScsMainTopicLink();
    assert.equal(ctx.requests.length, 1);
    assert.equal(ctx.requests[0], `${origin}/forum/viewtopic.php?f=22&t=42`);
    ctx.document.querySelector('.rin-scs-main-topic').click();
    assert.equal(ctx.window.location.href, `${origin}/app/1091500`);
});

test('Russian labels are translated and a failed page-one request leaves the topic untouched', async t => {
    const russian = setup(t, { language: 'ru' });
    await russian.setupScsMainTopicLink();
    const button = russian.document.querySelector('.rin-scs-main-topic');
    assert.equal(button.value, 'Основная тема игры');
    assert.equal(button.getAttribute('aria-label'), 'Основная тема игры');

    const failed = setup(t, { html: topicHtml({ appId: null }), pagination: { current: 3 }, fetchedHtml: new Error('offline') });
    await failed.setupScsMainTopicLink();
    assert.equal(failed.document.querySelector('.rin-scs-main-topic'), null);
});
