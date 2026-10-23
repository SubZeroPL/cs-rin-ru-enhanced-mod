// ==UserScript==
// @name            CS.RIN.RU Enhanced
// @name:fr         CS.RIN.RU Amélioré
// @name:pt         CS.RIN.RU Melhorado
// @name:ru         CS.RIN.RU Улучшенный
// @namespace       Royalgamer06
// @version         2.0.0-beta.1
// @description     Enhance your experience at CS.RIN.RU - Steam Underground Community.
// @description:fr  Améliorez votre expérience sur CS.RIN.RU - Steam Underground Community.
// @description:pt  Melhorar a sua experiência no CS.RIN.RU - Steam Underground Community.
// @description:ru  Удобная навигация, цитаты, поиск и настройки для форума CS.RIN.RU.
// @author          Royalgamer06 (modified by SubZeroPL)
// @match           *://cs.rin.ru/forum/*
// @match           *://csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion/forum/*
// @grant           GM_addStyle
// @grant           GM_xmlhttpRequest
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_notification
// @connect         store.steampowered.com
// @run-at          document-idle
// @homepageURL     https://github.com/SubZeroPL/cs-rin-ru-enhanced-mod
// @supportURL      https://cs.rin.ru/forum/viewtopic.php?f=14&t=75717
// @updateURL       https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/v2.0/cs-rin-ru-enhanced-mod.user.js
// @downloadURL     https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/v2.0/cs-rin-ru-enhanced-mod.user.js

// ==/UserScript==

/*
Creator: Royalgamer06 (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=477885)
Contributor: SubZeroPL (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=505897) who has now taken over the project
Contributor: Redpoint (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1365721) has created some functionality
Contributor: Altansar (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1280185) has created some functionality
Contributor: odusi (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=582752) has created the original function for the special search. We have kindly given his permission to use his work
Contributor: Mandus (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1487447) has created the original function to copy the link from a message
*/



const FORUM_NAME = 'CS.RIN.RU - Steam Underground Community';
function getBaseUrl() {
    return new URL('./', window.location.href).href;
}
const FORUM_BASE_URL = getBaseUrl();
const logoutLink = Array.from(document.querySelectorAll('#menubar a[href]'))
    .find(link => forumLink(link.getAttribute('href'), 'ucp.php', { mode: 'logout' }));
const CONNECTED = Boolean(logoutLink);
const USERNAME = logoutLink?.textContent.match(/\[\s*([\s\S]*?)\s*\]\s*$/)?.[1] || '';
const SELECTORS = { NEW_MESSAGES: '#menubar a[href*="i=pm"][href*="folder=inbox"]' };
const FRIENDS_LIST = [];
let updatePromise = null;
const color = { color_of_friends: '#f4169b', color_of_me: '#ff4c4c' };

let specialSearchParameters = {
    "searchTermsSpecificity": "any",
    "searchSubforums": true,
    "sortResultsBy": "t",
    "sortOrderBy": "d",
    "searchTopicLocation": "titleonly",
    "showResultsAsPosts": false,
    "limitToPrevious": 0,
    "returnFirst": "300",
    "showFriends": true
};

const DEFAULT_MENTION_TEMPLATE = '[b][url=%u]%m[/url][/b], [url=%p]post[/url]';

let options = {
    "script_enabled": true,
    "ui_language": "auto",
    "infinite_scrolling": true,
    "mentioning": DEFAULT_MENTION_TEMPLATE, // Empty to disable; %m: username, %u: profile URL, %p: post URL
    "steam_db_link": true,
    "copy_link_button": true,
    "full_path_post_links": true,
    "dynamic_function": true,
    "dynamic_content": true,
    "friend_buttons": true,
    "add_profile_button": true,
    "colorize_new_messages": true,
    "colorize_the_page": true,
    "display_ajax_loader": true,
    "custom_tags": true,
    "add_small_shoutbox": true,
    "add_users_tag": true,
    "show_all_spoilers": false,
    "add_link_quote": true,
    "quick_reply": true,
    "collapse_quotes": false,
    "colorize_friends_me": 3, // 0=nothing, 1=your in red, 2=your friends in pink, 3=both
    "change_topic_link": 0, // 0 = first post, 1 = unread post, 2 = last post
    "topic_preview": false,
    "topic_preview_option": 0, // 0 = first post, 1 = unread post, 2 = last post
    "topic_preview_timeout": 5, // in seconds
    "post_preview": false,
    "profile_preview": false,
    "special_search": true,
    "special_search_parameter": specialSearchParameters,
    "hide_scs": 0, // 0=not hide, 1=hide all, 2=hide only green, 3=show only red
    "apply_in_scs": false,
    "title_format": "%C %S - %T" // %C: CS.RIN.RU - Steam Underground Community •, %S: Section title (e.g. View topic), %T: Page title, %RT Page title without tags
};



const RIN_RUSSIAN = {
    'Configuration saved': 'Настройки сохранены', 'Info': 'Информация', 'Error': 'Ошибка',
    'Add friend': 'Добавить в друзья', 'Remove friend': 'Удалить из друзей',
    'Add {name} as a friend': 'Добавить {name} в друзья',
    'Remove {name} from friends': 'Удалить {name} из друзей',
    'New posts are available. Reload this page.': 'Есть новые сообщения. Обновите страницу.',
    'More posts are available on the next page.': 'Новые сообщения доступны на следующей странице.',
    'Configuration could not be loaded.': 'Не удалось загрузить настройки.',
    'Loading': 'Загрузка', 'Loading...': 'Загрузка…', 'Search': 'Поиск',
    'Add quote to reply': 'Добавить цитату в ответ',
    'Reply with mentioning': 'Ответить с упоминанием', 'Mentioned!': 'Упоминание добавлено!',
    'Copy the link into the clipboard': 'Копировать ссылку', 'Copied!': 'Скопировано!',
    'Unable to copy the link.': 'Не удалось скопировать ссылку.',
    'Unable to load the quote.': 'Не удалось загрузить цитату.', 'Quoted!': 'Цитата добавлена!',
    'Show Chat': 'Показать чат', 'Hide Chat': 'Скрыть чат',
    'Show Quick Reply Panel': 'Показать быстрый ответ', 'Hide Quick Reply Panel': 'Скрыть быстрый ответ',
    'Show': 'Показать', 'Hide': 'Скрыть', 'Profile': 'Профиль', 'Friends': 'Друзья',
    'Friends ({count}):': 'Друзья ({count}):', 'No friends added yet.': 'Друзья ещё не добавлены.',
    'Special search': 'Расширенный поиск', 'Search:': 'Искать:', 'Everywhere': 'Везде',
    'This forum': 'В этом форуме', 'This topic': 'В этой теме', 'Search for:': 'Искать:',
    'Any term': 'Любое слово', 'All terms': 'Все слова',
    'Search first post/titles only': 'Только первое сообщение или заголовок', 'Show as posts': 'Показать сообщения',
    'By:': 'Автор:', "Author's name": 'Имя автора',
    'User-defined Tag(s): ': 'Пользовательские метки: ',
    'The current forum or topic could not be identified. Reload the page and try again.': 'Не удалось определить текущий форум или тему. Обновите страницу и повторите попытку.',
    'BBCode supported. %m = username, %u = profile URL, %p = post URL. Leave empty to disable mentions.': 'Поддерживается BBCode. %m — имя, %u — ссылка на профиль, %p — ссылка на сообщение. Оставьте поле пустым, чтобы отключить упоминания.',
    'Additional pages could not be loaded. Reload to retry.': 'Не удалось загрузить следующие страницы. Обновите страницу для повторной попытки.',
    'Automatic refresh stopped after too many requests. Reload later to resume.': 'Автообновление остановлено из-за слишком частых запросов. Обновите страницу позже, чтобы продолжить.',
};

function rinText(english, values = {}) {
    const configured = options.ui_language;
    const pageLanguage = document.documentElement.getAttribute('lang') || document.documentElement.getAttribute('xml:lang') || '';
    const russian = configured === 'ru' || ((!configured || configured === 'auto') && /^ru(?:[-_]|$)/i.test(pageLanguage));
    const text = russian ? RIN_RUSSIAN[english] || english : english;
    return text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
}

function notifyRin(message, title = 'Info') {
    GM_notification(rinText(message), rinText(title));
}

function forumLink(href, filename, params = {}) {
    try {
        const url = new URL(href, FORUM_BASE_URL);
        const base = new URL(FORUM_BASE_URL);
        return url.origin === base.origin && url.pathname === `${base.pathname}${filename}` &&
            !url.username && !url.password && Object.entries(params).every(([key, value]) => url.searchParams.get(key) === value) ? url : null;
    } catch { return null; }
}

function findForumLink(root, filename, params = {}) {
    return Array.from(root.querySelectorAll('a[href]')).find(link => forumLink(link.getAttribute('href'), filename, params)) || null;
}

function parseForumDocument(data) {
    return typeof data === 'string' ? new DOMParser().parseFromString(data, 'text/html') : data;
}

let pendingRequests = 0;
function showAjaxLoader(loading) {
    pendingRequests = Math.max(0, pendingRequests + (loading ? 1 : -1));
    if (!options.display_ajax_loader) return;
    let loader = document.getElementById('ajaxload');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'ajaxload';
        loader.className = 'rin-loading';
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-label', rinText('Loading'));
        loader.innerHTML = '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="42 16"/></svg>';
        document.body.append(loader);
    }
    loader.hidden = pendingRequests === 0;
}

async function fetchForumDocument(url, signal) {
    const target = new URL(url, FORUM_BASE_URL);
    if (target.origin !== new URL(FORUM_BASE_URL).origin) throw new Error('Unexpected forum origin');
    const language = new URL(window.location.href).searchParams.get('lang');
    if (language && !target.searchParams.has('lang')) target.searchParams.set('lang', language);
    showAjaxLoader(true);
    try {
        const response = await fetch(target.href, { credentials: 'same-origin', signal });
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }
        const doc = parseForumDocument(await response.text());
        doc.rinSourceUrl = response.url || target.href;
        doc.rinRequestUrl = target.href;
        return doc;
    } finally { showAjaxLoader(false); }
}

function requestExternalText(url) {
    return new Promise((resolve, reject) => GM_xmlhttpRequest({
        method: 'GET', url,
        onload: response => response.status && (response.status < 200 || response.status >= 300)
            ? reject(new Error(`HTTP ${response.status}`)) : resolve(response.responseText),
        onerror: reject, ontimeout: reject, timeout: 30000,
    }));
}

function createActionIcon(kind, label) {
    const image = document.createElement('img');
    const paths = kind === 'mention'
        ? '<text x="12" y="18" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="20">@</text>'
        : '<path d="M9 15l6-6m-8 4l-2 2a4 4 0 005 5l4-4m-4-8l4-4a4 4 0 015 5l-2 2" fill="none" stroke="currentColor" stroke-width="2"/>';
    image.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" color="#a9bdd8" fill="#a9bdd8">${paths}</svg>`)}`;
    image.width = 20;
    image.height = 20;
    image.alt = rinText(label);
    image.title = rinText(label);
    return image;
}

function showActionFeedback(anchor, message) {
    const tip = document.createElement('span');
    tip.className = 'rin-action-feedback';
    tip.textContent = rinText(message);
    const rect = anchor.getBoundingClientRect();
    tip.style.cssText = `position:absolute;left:${rect.left + window.scrollX}px;top:${rect.top + window.scrollY - 25}px;z-index:10001;`;
    document.body.append(tip);
    setTimeout(() => tip.remove(), 2000);
}

async function retrievesFriendsLists() {
    if (!CONNECTED) return;
    if (!updatePromise) {
        updatePromise = fetchForumDocument('ucp.php?i=zebra&mode=friends').then(doc => {
            const select = doc.querySelector('#ucp select[name="usernames[]"], #ucp select');
            if (select) FRIENDS_LIST.splice(0, FRIENDS_LIST.length, ...Array.from(select.options, item => item.textContent.trim()));
        }).catch(error => { console.warn('CS.RIN.RU Enhanced: friends unavailable', error); });
    }
    await updatePromise;
}

function loadConfig() {
    const savedOptions = GM_getValue('options', {});
    options = normalizeMentionOptions({ ...options, ...savedOptions,
        special_search_parameter: { ...specialSearchParameters, ...savedOptions.special_search_parameter } });
    if (!CONNECTED) {
        for (const key of ['dynamic_function', 'add_profile_button', 'colorize_new_messages', 'add_small_shoutbox', 'add_link_quote']) options[key] = false;
        options.colorize_friends_me = 0;
        options.special_search_parameter.showFriends = false;
    }
}

function receiveConfigMessage(event) {
    if ((event.source && event.source !== window) || !event.data) return;
    if (event.origin && event.origin !== window.location.origin) return;
    const typed = event.data.type === 'rin-enhanced:config';
    const incoming = typed ? event.data.options : event.data;
    if (!incoming || (!typed && incoming.script_enabled === undefined)) return;
    const changes = Object.fromEntries(Object.entries(incoming).filter(([, value]) => value !== undefined));
    if (changes.special_search_parameter) changes.special_search_parameter = { ...options.special_search_parameter, ...changes.special_search_parameter };
    const input = document.querySelector('input#mentioning[type="text"]');
    if ((!typed || Object.hasOwn(changes, 'mentioning')) && typeof changes.mentioning !== 'string' && input) changes.mentioning = input.value;
    options = normalizeMentionOptions({ ...options, ...changes });
    GM_setValue('options', options);
    notifyRin('Configuration saved');
    if (typed) window.location.reload();
}

function initializeMentionTemplateField() {
    let input = document.getElementById('mentioning');
    if (!input) return;
    for (const id of ['mention_author_template', 'mention_post_template']) document.getElementById(id)?.closest('tr')?.remove();
    if (input.tagName === 'SELECT') {
        const replacement = document.createElement('input');
        replacement.id = 'mentioning';
        replacement.type = 'text';
        replacement.setAttribute('data-originalValue', '');
        input.replaceWith(replacement);
        input = replacement;
    }
    input.value = options.mentioning;
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.setAttribute('aria-describedby', 'mentioning_help');
    if (!document.getElementById('mentioning_help')) {
        const help = document.createElement('small');
        help.id = 'mentioning_help';
        help.textContent = rinText('BBCode supported. %m = username, %u = profile URL, %p = post URL. Leave empty to disable mentions.');
        input.after(document.createElement('br'), help);
    }
}

function loadConfigButton() {
    if (document.getElementById('wholeWindow')) return;
    try {
        const { html, css } = getBundledConfig();
        const template = parseForumDocument(html);
        const modal = document.importNode(template.getElementById('wholeWindow'), true);
        modal.dataset.rinInjected = 'true';
        modal.dataset.rinConnected = String(CONNECTED);
        document.body.append(modal);
        getToolbar().append(document.importNode(template.getElementById('configButton'), true));
        GM_addStyle(css);
        initializeMentionTemplateField();
        initializeConfigUI();
        window.RinEnhancedConfig.init(options);
        window.RinEnhancedConfig.setOptions(options);
    } catch (error) { console.warn('CS.RIN.RU Enhanced: configuration unavailable', error); notifyRin('Configuration could not be loaded.', 'Error'); }
}

function normalizeMentionOptions(settings) {
    const normalized = { ...settings };
    // Convert settings saved by older releases into the single editable template.
    if (typeof normalized.mentioning !== 'string') {
        const legacyAuthorTemplate = '[b]@[url=%u]%m[/url][/b]';
        if (normalized.mentioning === 0) {
            normalized.mentioning = '';
        } else if (normalized.mentioning === 2) {
            normalized.mentioning = typeof settings.mention_post_template === 'string'
                ? settings.mention_post_template : `${legacyAuthorTemplate}, Re: [url=%p]Post[/url].`;
        } else if (normalized.mentioning === 1) {
            normalized.mentioning = typeof settings.mention_author_template === 'string'
                ? settings.mention_author_template : legacyAuthorTemplate;
        } else {
            normalized.mentioning = DEFAULT_MENTION_TEMPLATE;
        }
    }
    delete normalized.mention_author_template;
    delete normalized.mention_post_template;
    return normalized;
}

function getTopicLinkContext(page = document) {
    const candidates = [];
    page.querySelectorAll('#pageheader a.titles[href]').forEach(title => {
        if (!title.closest('.postbody, .signature, #topic_preview')) candidates.push(title.getAttribute('href'));
    });
    page.querySelectorAll('script:not([src])').forEach(script => {
        if (script.closest('.postbody, .signature, #topic_preview')) return;
        const match = script.textContent.match(/\bvar\s+base_url\s*=\s*(['"])(.*?)\1/);
        if (match) candidates.push(match[2].replace(/&amp;/g, '&'));
    });
    const forumUrl = new URL(FORUM_BASE_URL);
    for (const href of candidates) {
        try {
            const url = new URL(href, FORUM_BASE_URL);
            if (url.origin === forumUrl.origin && url.pathname === `${forumUrl.pathname}viewtopic.php` && !url.username && !url.password &&
                /^\d+$/.test(url.searchParams.get('f')) && /^\d+$/.test(url.searchParams.get('t'))) return url;
        } catch {
            // Missing or malformed topic context leaves post links unchanged.
        }
    }
    return null;
}

function getFullPathPostLink(href, topicUrl) {
    if (options.full_path_post_links === false || !topicUrl) return href;
    let url;
    try {
        url = new URL(href, FORUM_BASE_URL);
    } catch {
        return href;
    }
    if (url.origin !== topicUrl.origin || url.pathname !== topicUrl.pathname || url.username || url.password ||
        !/^\d+$/.test(url.searchParams.get('p'))) return href;
    // Never substitute the current topic for a link that already names another one.
    for (const name of ['f', 't']) {
        if (url.searchParams.has(name) && url.searchParams.get(name) !== topicUrl.searchParams.get(name)) return href;
    }
    if (url.searchParams.has('f') && url.searchParams.has('t')) return href;
    const params = new URLSearchParams({ f: topicUrl.searchParams.get('f'), t: topicUrl.searchParams.get('t') });
    for (const [name, value] of url.searchParams) {
        if (name !== 'f' && name !== 't') params.append(name, value);
    }
    const language = topicUrl.searchParams.get('lang') || new URL(window.location.href).searchParams.get('lang');
    if (language && !params.has('lang')) params.set('lang', language);
    url.search = params.toString();
    return url.href;
}

function addFullPathPostLinks(root = document, page = document) {
    if (options.full_path_post_links === false) return;
    const topicUrl = getTopicLinkContext(page);
    if (!topicUrl) return;
    root.querySelectorAll('a[href] > img[src*="icon_post_target"]').forEach(icon => {
        if (!/(?:^|\/)icon_post_target(?:_unread)?\.(?:gif|png)$/i.test(icon.getAttribute('src').split(/[?#]/)[0])) return;
        const link = icon.parentElement;
        if (link.closest('.postbody, .signature, .quotecontent, .quotetitle, .codecontent')) return;
        const href = link.getAttribute('href');
        const fullPath = getFullPathPostLink(href, topicUrl);
        if (fullPath !== href) link.setAttribute('href', fullPath);
    });
}

function formatMention(author, authorID, postID) {
    const template = options.mentioning;
    if (typeof template !== 'string' || !template.trim() || !author || !/^\d+$/.test(authorID) || !/^\d+$/.test(postID)) return '';
    const replacements = {
        '%m': author,
        '%u': `${FORUM_BASE_URL}memberlist.php?mode=viewprofile&u=${authorID}`,
        '%p': `${FORUM_BASE_URL}viewtopic.php?p=${postID}#p${postID}`
    };
    const mention = template.replace(/%[a-zA-Z]+/g, token => replacements[token] ?? token);
    return mention && !/\s$/.test(mention) ? `${mention} ` : mention;
}

function initializeMention() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    if (url.pathname !== new URL('posting.php', FORUM_BASE_URL).pathname ||
        params.get('mode') !== 'reply' || params.get('do') !== 'mention') return;
    const message = document.querySelector('[name="message"]');
    if (message && !message.value) {
        message.value = formatMention(params.get('a'), params.get('u'), params.get('p'));
    }
}

function getSteamAppId(href, hostname) {
    try {
        const url = new URL(href);
        if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== hostname || url.username || url.password || url.port) return null;
        return url.pathname.match(/^\/app\/(\d+)(?:\/|$)/)?.[1] ?? null;
    } catch {
        return null;
    }
}

function getSearchContext(page = document) {
    const forumUrl = new URL(FORUM_BASE_URL);
    const currentUrl = new URL(window.location.href);
    const isTopic = currentUrl.pathname === `${forumUrl.pathname}viewtopic.php`;
    const isForum = currentUrl.pathname === `${forumUrl.pathname}viewforum.php`;
    const context = { forumId: null, topicId: null };
    if (currentUrl.origin !== forumUrl.origin || (!isTopic && !isForum)) return context;

    const validId = value => /^[1-9]\d*$/.test(value) ? value : null;
    const nativeUrl = (href, filename) => {
        try {
            const url = new URL(href, FORUM_BASE_URL);
            return url.origin === forumUrl.origin && url.pathname === `${forumUrl.pathname}${filename}` &&
                !url.username && !url.password ? url : null;
        } catch {
            return null;
        }
    };

    // The rendered topic context is present even on permalinks containing only p.
    const topicUrl = isTopic ? getTopicLinkContext(page) : null;
    if (topicUrl && !topicUrl.username && !topicUrl.password) {
        context.forumId = validId(topicUrl.searchParams.get('f'));
        context.topicId = validId(topicUrl.searchParams.get('t'));
    }
    const title = page.querySelector('#pageheader a.titles[href]');
    const titleUrl = title && !title.closest('.postbody, .signature, #topic_preview') ?
        nativeUrl(title.getAttribute('href'), isTopic ? 'viewtopic.php' : 'viewforum.php') : null;
    if (titleUrl) {
        context.forumId ??= validId(titleUrl.searchParams.get('f'));
        if (isTopic) context.topicId ??= validId(titleUrl.searchParams.get('t'));
    }

    // The last breadcrumb names the current forum; earlier ones name its parents.
    if (!context.forumId) {
        page.querySelectorAll('p.breadcrumbs a[href]').forEach(link => {
            if (link.closest('.postbody, .signature, #topic_preview')) return;
            const url = nativeUrl(link.getAttribute('href'), 'viewforum.php');
            const forumId = url && validId(url.searchParams.get('f'));
            if (forumId) context.forumId = forumId;
        });
    }
    context.forumId ??= validId(currentUrl.searchParams.get('f'));
    if (isTopic) context.topicId ??= validId(currentUrl.searchParams.get('t'));
    return context;
}

function addLinkToQuote(message, id) {
    const link = `${FORUM_BASE_URL}viewtopic.php?p=${id}#p${id}`;
    const firstQuoteIndex = message.indexOf('[quote');
    const firstQuoteEndIndex = message.indexOf(']', firstQuoteIndex) + 1;
    if (firstQuoteIndex !== -1) {
        const beforeQuote = message.slice(0, firstQuoteIndex);
        const quoteTag = message.slice(firstQuoteIndex, firstQuoteEndIndex);
        const afterQuote = message.slice(firstQuoteEndIndex);
        if (afterQuote.startsWith(`[url=${link}]Source[/url]`)) return message;
        // Keep the source link inside the quote body; quote names only support plain text.
        message = `${beforeQuote}${quoteTag}[url=${link}]Source[/url]\n${afterQuote}`;
    }
    return message
}

function AddLinkQuote() {
    if (!options.add_link_quote) return;
    const url = forumLink(window.location.href, 'posting.php', { mode: 'quote' });
    if (!url || !/^[1-9]\d*$/.test(url.searchParams.get('p')) || url.searchParams.has('t') ||
        document.querySelector('#preview, #post-preview, .error')) return;
    const editor = document.querySelector('textarea[name="message"]');
    if (editor) editor.value = addLinkToQuote(editor.value, url.searchParams.get('p'));
}

function linkQuoteAuthors(root = document) {
    if (!options.add_link_quote) return;

    const forumUrl = new URL(FORUM_BASE_URL);
    const forumHosts = [forumUrl.hostname, 'cs.rin.ru', 'csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion'];
    root.querySelectorAll('.quotecontent').forEach(content => {
        const title = content.previousElementSibling;
        if (!title || !title.classList.contains('quotetitle') || !title.textContent.trim() || title.querySelector('a') || title.closest('a')) return;

        // Only use this quote's leading Source link, never one from a nested quote.
        const source = Array.from(content.childNodes).find(node => node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim()));
        if (!source || source.nodeType !== 1 || !source.matches('a[href]') || source.textContent.trim() !== 'Source') return;

        let sourceUrl;
        try {
            sourceUrl = new URL(source.getAttribute('href'), FORUM_BASE_URL);
        } catch {
            return;
        }
        const postId = sourceUrl.searchParams.get('p');
        if (!['http:', 'https:'].includes(sourceUrl.protocol) || !forumHosts.includes(sourceUrl.hostname) || sourceUrl.port || sourceUrl.username || sourceUrl.password ||
            sourceUrl.pathname !== `${forumUrl.pathname}viewtopic.php` || !/^\d+$/.test(postId) || sourceUrl.hash !== `#p${postId}`) return;

        const authorLink = title.ownerDocument.createElement('a');
        authorLink.href = sourceUrl.href;
        authorLink.className = 'rin-quote-author-link';
        authorLink.style.color = 'inherit';
        // Keep the forum's title text, formatting and language intact.
        while (title.firstChild) authorLink.appendChild(title.firstChild);
        title.appendChild(authorLink);

        // Hide the fallback only in this browser; it remains in the posted BBCode.
        source.hidden = true;
        let lineBreak = source.nextSibling;
        while (lineBreak && lineBreak.nodeType === 3 && !lineBreak.textContent.trim()) lineBreak = lineBreak.nextSibling;
        if (lineBreak && lineBreak.nodeName === 'BR') lineBreak.hidden = true;
    });
}

function collapseQuotes(root = document) {
    if (!options.collapse_quotes) return;
    // Native spoilers also use .quotecontent, but do not have a .quotetitle.
    root.querySelectorAll('.quotetitle + .quotecontent').forEach(content => {
        if (content.dataset.rinCollapseProcessed) return;
        const title = content.previousElementSibling;
        if (title.querySelector('input, button')) return;

        const expandedDisplay = content.style.display === 'none' ? '' : content.style.display;
        const button = content.ownerDocument.createElement('input');
        button.type = 'button';
        button.value = rinText('Show');
        button.className = 'collapse-quote-btn';
        button.style.cssText = 'display: block; margin: 2px 0; padding: 0; width: 60px; font-size: 10px;';
        button.setAttribute('aria-expanded', 'false');

        // Keep the original nodes and title/content adjacency for native spoiler handlers.
        title.appendChild(button);
        content.dataset.rinCollapseProcessed = 'true';
        content.style.display = 'none';
        button.addEventListener('click', () => {
            const expand = button.getAttribute('aria-expanded') === 'false';
            content.style.display = expand ? expandedDisplay : 'none';
            button.value = rinText(expand ? 'Hide' : 'Show');
            button.setAttribute('aria-expanded', String(expand));
        });
    });
}


function getPostElement(node) {
    let table = node?.closest?.('table.tablebg');
    while (table && !table.querySelector('.postbody')) table = table.parentElement?.closest('table.tablebg');
    return table || null;
}

function getPostId(post) {
    if (!post) return null;
    const anchors = post.querySelectorAll('a[name], [id]');
    for (const anchor of anchors) {
        if (anchor.closest('.postbody, .quotecontent, .signature')) continue;
        const match = (anchor.getAttribute('name') || anchor.id || '').match(/^p(\d+)$/);
        if (match) return match[1];
    }
    for (const icon of post.querySelectorAll('a[href] > img[src*="icon_post_target"]')) {
        if (icon.closest('.postbody, .quotecontent, .signature')) continue;
        const id = forumLink(icon.parentElement.getAttribute('href'), 'viewtopic.php')?.searchParams.get('p');
        if (/^\d+$/.test(id)) return id;
    }
    return null;
}

function getPostActionBar(post) {
    const quote = findForumLink(post, 'posting.php', { mode: 'quote' });
    if (quote && !quote.closest('.postbody, .signature')) return quote.parentElement;
    const native = Array.from(post.querySelectorAll('a[href] > img[src*="icon_post_target"]'))
        .find(icon => !icon.closest('.postbody, .signature'))?.parentElement;
    return native?.closest('.gensmall')?.querySelector('div + div') || null;
}

function getPosts(root = document) {
    const posts = new Set();
    if (root.matches?.('table.tablebg') && root.querySelector('.postbody')) posts.add(root);
    root.querySelectorAll('.postbody').forEach(body => {
        if (body.closest('.quotecontent, .signature')) return;
        const post = getPostElement(body);
        if (post && getPostId(post)) posts.add(post);
    });
    return Array.from(posts);
}

function getPagination(page = document, url = window.location.href) {
    const currentUrl = new URL(url, FORUM_BASE_URL);
    for (const strong of page.querySelectorAll('strong, b')) {
        if (!/^\d+$/.test(strong.textContent.trim()) || strong.closest('.postbody, .signature, #topic_preview, [name="page_nav"]')) continue;
        let element = strong.parentElement;
        for (let depth = 0; element && depth < 3; depth++, element = element.parentElement) {
            if (element.matches('body, #wrapcentre, #pagecontent')) break;
            const links = new Map();
            for (const anchor of element.querySelectorAll('a[href]')) {
                const number = anchor.textContent.trim();
                if (!/^\d+$/.test(number)) continue;
                let target;
                try { target = new URL(anchor.getAttribute('href'), currentUrl); } catch { continue; }
                if (target.origin !== currentUrl.origin || target.pathname !== currentUrl.pathname) continue;
                if (!target.searchParams.has('start') && Number(number) !== 1) continue;
                if (!/^\d+$/.test(target.searchParams.get('start') || '0')) continue;
                links.set(Number(number), target.href);
            }
            if (links.size) return { element, current: Number(strong.textContent.trim()), links };
        }
    }
    return null;
}

function getContentItems(page = document) {
    const path = window.location.pathname;
    if (path.endsWith('/viewtopic.php')) {
        // Ignored-user placeholders occupy a post slot even without a visible .postbody.
        return Array.from(page.querySelectorAll('#pagecontent > table.tablebg')).filter(post => getPostId(post));
    }
    const candidates = page.querySelectorAll('#pagecontent table.tablebg > tbody > tr, #wrapcentre > form > table.tablebg > tbody > tr, #pagecontent > form > table.tablebg > tbody > tr');
    return Array.from(candidates).filter(row => {
        if (row.closest('.postbody, #topic_preview') || row.querySelector(':scope > .cat, :scope > th')) return false;
        if (path.endsWith('/viewforum.php')) return Boolean(row.querySelector('a.topictitle'));
        if (path.endsWith('/memberlist.php')) return Boolean(findForumLink(row, 'memberlist.php', { mode: 'viewprofile' }));
        if (path.endsWith('/ucp.php')) return Array.from(row.querySelectorAll('a[href]')).some(link => forumLink(link.getAttribute('href'), 'ucp.php', { mode: 'view' }));
        if (path.endsWith('/search.php')) return Boolean(row.querySelector('a.topictitle, .postbody, a[href*="viewtopic.php"]'));
        return false;
    });
}

function contentItemKey(item) {
    const topic = item.querySelector('a.topictitle[href]');
    if (topic && !item.querySelector('.postbody')) {
        const url = forumLink(topic.getAttribute('href'), 'viewtopic.php');
        if (url?.searchParams.get('t')) return `topic:${url.searchParams.get('t')}`;
    }
    const postId = getPostId(item);
    if (postId) return `post:${postId}`;
    const profile = findForumLink(item, 'memberlist.php', { mode: 'viewprofile' });
    if (profile && window.location.pathname.endsWith('/memberlist.php')) return `user:${new URL(profile.href).searchParams.get('u')}`;
    const message = findForumLink(item, 'ucp.php', { mode: 'view' });
    if (message) return `pm:${new URL(message.href).searchParams.get('p')}`;
    return item.textContent.trim().slice(0, 500);
}

let rinPaginationState = null;
function setupInfiniteScroll() {
    if (!options.infinite_scrolling) return;
    const pagination = getPagination();
    const items = getContentItems();
    if (!pagination || !items.length) return;
    const sticky = document.createElement('div');
    sticky.setAttribute('name', 'page_nav');
    sticky.className = 'gensmall rin-page-nav';
    sticky.innerHTML = pagination.element.innerHTML;
    const first = items[0].closest('#pagecontent') || items[0].closest('form') || items[0];
    first.before(sticky);
    items.forEach(item => { item.dataset.rinPage = String(pagination.current); });
    const state = {
        pages: new Map([[pagination.current, { items, doc: document, url: window.location.href, pagination }]]),
        loading: false, halted: false, min: pagination.current, max: pagination.current,
        exhaustedBefore: !Array.from(pagination.links.keys()).some(number => number < pagination.current),
        exhaustedAfter: !Array.from(pagination.links.keys()).some(number => number > pagination.current),
        requested: new Set(), keys: new Set(items.map(contentItemKey)),
    };
    rinPaginationState = state;
    let upwardDistance = 0;
    let scheduled = false;
    async function loadPage(direction) {
        const before = direction < 0;
        if (state.loading || state.halted || (before ? state.exhaustedBefore : state.exhaustedAfter)) return;
        const edge = state.pages.get(before ? state.min : state.max);
        const numbers = Array.from(edge.pagination.links.keys()).filter(number => before ? number < state.min : number > state.max);
        const number = before ? Math.max(...numbers) : Math.min(...numbers);
        const href = edge.pagination.links.get(number);
        if (!href || state.pages.has(number)) {
            state[before ? 'exhaustedBefore' : 'exhaustedAfter'] = true;
            return;
        }
        const target = new URL(href, FORUM_BASE_URL);
        target.hash = '';
        target.searchParams.delete('sid');
        const requestKey = target.href;
        if (state.requested.has(requestKey)) {
            state[before ? 'exhaustedBefore' : 'exhaustedAfter'] = true;
            return;
        }
        state.requested.add(requestKey);
        state.loading = true;
        try {
            const doc = await fetchForumDocument(href);
            const nextPagination = getPagination(doc, href);
            const fetchedNumber = nextPagination?.current;
            getContentItems().forEach(item => state.keys.add(contentItemKey(item)));
            const fresh = getContentItems(doc).filter(item => !state.keys.has(contentItemKey(item)));
            if (!nextPagination || fetchedNumber !== number || state.pages.has(fetchedNumber) || !fresh.length) {
                state[before ? 'exhaustedBefore' : 'exhaustedAfter'] = true;
                return;
            }
            const imported = fresh.map(item => document.importNode(item, true));
            const anchor = before ? state.pages.get(state.min).items[0] : state.pages.get(state.max).items.at(-1);
            const previousTop = anchor.getBoundingClientRect().top;
            for (const item of imported) {
                item.dataset.rinPage = String(fetchedNumber);
                state.keys.add(contentItemKey(item));
            }
            if (before) anchor.before(...imported); else anchor.after(...imported);
            state.pages.set(fetchedNumber, { items: imported, doc, url: href, pagination: nextPagination });
            state.min = Math.min(state.min, fetchedNumber);
            state.max = Math.max(state.max, fetchedNumber);
            for (const item of imported) functionsCalledByInfiniteScrolls(doc, item);
            if (before) window.scrollBy(0, anchor.getBoundingClientRect().top - previousTop);
            state.exhaustedBefore = !Array.from(state.pages.get(state.min).pagination.links.keys()).some(pageNumber => pageNumber < state.min);
            state.exhaustedAfter = !Array.from(state.pages.get(state.max).pagination.links.keys()).some(pageNumber => pageNumber > state.max);
        } catch (error) {
            state.halted = true;
            console.warn('CS.RIN.RU Enhanced: pagination stopped', error);
            notifyRin('Additional pages could not be loaded. Reload to retry.', 'Error');
        } finally { state.loading = false; }
    }
    function updateNavigation() {
        scheduled = false;
        const visible = Array.from(state.pages.values()).flatMap(page => page.items)
            .filter(item => item.isConnected && getComputedStyle(item).display !== 'none' && item.getBoundingClientRect().bottom > 0)
            .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
        const page = visible && state.pages.get(Number(visible.dataset.rinPage));
        if (page && sticky.dataset.page !== String(page.pagination.current)) {
            sticky.innerHTML = page.pagination.element.innerHTML;
            sticky.dataset.page = String(page.pagination.current);
        }
        if (window.innerHeight + window.scrollY + 1000 >= document.documentElement.scrollHeight) void loadPage(1);
    }
    window.addEventListener('scroll', () => {
        if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateNavigation); }
    }, { passive: true });
    window.addEventListener('wheel', event => {
        if (window.scrollY <= 0 && event.deltaY < 0) {
            upwardDistance += Math.abs(event.deltaY);
            if (upwardDistance >= 600) { upwardDistance = 0; void loadPage(-1); }
        } else upwardDistance = 0;
    }, { passive: true });
}

let intervalID = null;
let dynamicRequest = null;
let dynamicController = null;
let dynamicBound = false;
let dynamicRateLimited = false;
function allDynamicFunction() {
    if (!options.dynamic_function || dynamicBound || dynamicRateLimited) return;
    dynamicBound = true;
    document.addEventListener('visibilitychange', () => {
        clearInterval(intervalID);
        intervalID = null;
        if (document.hidden) dynamicController?.abort();
        else if (!dynamicRateLimited) { void dynamicFunction(); startUpdating(); }
    });
    window.addEventListener('pagehide', () => { clearInterval(intervalID); dynamicController?.abort(); });
    startUpdating();
}

function startUpdating() {
    clearInterval(intervalID);
    intervalID = null;
    if (options.dynamic_function && !document.hidden && !dynamicRateLimited) intervalID = setInterval(() => void dynamicFunction(), 60000);
}

function getDynamicRefreshUrl() {
    const current = new URL(window.location.href);
    if (!options.dynamic_content || !rinPaginationState?.pages?.size) return current.href;
    const topic = current.pathname.endsWith('/viewtopic.php');
    const forum = current.pathname.endsWith('/viewforum.php');
    if (!topic && !forum) return current.href;
    const page = rinPaginationState.pages.get(topic ? rinPaginationState.max : 1);
    const target = page?.url && forumLink(page.url, topic ? 'viewtopic.php' : 'viewforum.php');
    const context = getSearchContext();
    const id = topic ? context.topicId : context.forumId;
    return target && id && target.searchParams.get(topic ? 't' : 'f') === id ? target.href : current.href;
}

async function dynamicFunction(data) {
    if (!options.dynamic_function || (!data && dynamicRateLimited)) return;
    if (!data && (document.hidden || dynamicRequest)) return dynamicRequest;
    const apply = doc => {
        if (!doc?.querySelector) return;
        const currentTime = document.querySelector('#datebar .gensmall + .gensmall');
        const newTime = doc.querySelector('#datebar .gensmall + .gensmall');
        if (currentTime && newTime) currentTime.replaceChildren(...Array.from(newTime.childNodes, child => document.importNode(child, true)));
        const messages = document.querySelector(SELECTORS.NEW_MESSAGES);
        const incomingMessages = doc.querySelector(SELECTORS.NEW_MESSAGES);
        if (messages && incomingMessages) messages.replaceChildren(...Array.from(incomingMessages.childNodes, child => document.importNode(child, true)));
        const onlinePanel = page => Array.from(page.querySelectorAll('img[src]'))
            .find(image => /(?:^|\/)whosonline\.(?:gif|png)(?:[?#]|$)/i.test(image.getAttribute('src')))?.closest('table');
        const online = onlinePanel(document);
        const incomingOnline = onlinePanel(doc);
        if (online && incomingOnline && !online.querySelector('.postbody, .topictitle, form')) {
            online.replaceChildren(...Array.from(incomingOnline.childNodes, child => document.importNode(child, true)));
        }
        if (typeof updateDynamicContent === 'function') updateDynamicContent(doc);
        changeColorOfNewMessage();
        void colorizeFriendsMe();
    };
    if (data) { apply(parseForumDocument(data)); return; }
    dynamicController = new AbortController();
    dynamicRequest = fetchForumDocument(getDynamicRefreshUrl(), dynamicController.signal).then(apply)
        .catch(error => {
            if (error.status === 429) {
                dynamicRateLimited = true;
                clearInterval(intervalID);
                intervalID = null;
                notifyRin('Automatic refresh stopped after too many requests. Reload later to resume.', 'Info');
            }
            if (error.name !== 'AbortError') console.warn('CS.RIN.RU Enhanced: refresh failed', error);
        })
        .finally(() => { dynamicRequest = null; dynamicController = null; });
    return dynamicRequest;
}

function enhanceContent(root = document, page = document) {
    addFullPathPostLinks(root, page);
    linkQuoteAuthors(root);
    mentionify(root);
    if (typeof setupQuoteExtras === 'function') setupQuoteExtras(root);
    quotify(root);
    tagify(root);
    hideScs(root);
    setupTopicPreview(root);
    setupPostPreview(root);
    setupProfilePreview(root);
    addLink(root, page);
    steamDBLink(root);
    addUsersTag(root);
    changeTopicLink(root);
    void colorizeFriendsMe(root);
    showAllSpoilers(root);
    collapseQuotes(root);
    if (options.friend_buttons && typeof addFriendButtons === 'function') {
        void retrievesFriendsLists().then(() => { if (root === document || root.isConnected) addFriendButtons(root); });
    }
}

function functionsCalledByInfiniteScrolls(data, root = document) {
    const page = data ? parseForumDocument(data) : document;
    enhanceContent(root, page);
}



function mentionify(root = document) {
    if (typeof options.mentioning !== 'string' || !options.mentioning.trim()) return;
    const replyLink = findForumLink(document, 'posting.php', { mode: 'reply' });
    if (!replyLink || /locked/i.test(replyLink.querySelector('img')?.getAttribute('src') || '')) return;
    for (const post of getPosts(root)) {
        const bar = getPostActionBar(post);
        if (!bar || bar.querySelector('.rin-mention-link')) continue;
        const postID = getPostId(post);
        const author = post.querySelector('.postauthor')?.textContent.trim();
        const profile = Array.from(post.querySelectorAll('a[href]')).find(link =>
            !link.closest('.postbody, .quotecontent, .signature') && forumLink(link.getAttribute('href'), 'memberlist.php', { mode: 'viewprofile' }));
        const authorID = profile && forumLink(profile.getAttribute('href'), 'memberlist.php')?.searchParams.get('u');
        if (!author || !/^\d+$/.test(authorID) || !/^\d+$/.test(postID)) continue;
        const url = new URL(replyLink.getAttribute('href'), FORUM_BASE_URL);
        for (const [key, value] of Object.entries({ do: 'mention', p: postID, u: authorID, a: author })) url.searchParams.set(key, value);
        const button = document.createElement('a');
        button.href = url.href;
        button.className = 'rin-mention-link';
        button.append(createActionIcon('mention', 'Reply with mentioning'));
        bar.append(button);
        if (quickReplyPanel) button.addEventListener('click', event => {
            const message = quickReplyPanel.querySelector('[name="message"]');
            if (!message) return;
            event.preventDefault();
            message.value += formatMention(author, authorID, postID);
            message.dispatchEvent(new Event('input', { bubbles: true }));
            showActionFeedback(button, 'Mentioned!');
        });
    }
}

function tagify(root = document) {
    if (!options.custom_tags) return;
    root.querySelectorAll('.titles, .topictitle').forEach(title => {
        if (title.dataset.rinTags) return;
        title.dataset.rinTags = 'true';
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
            const pieces = node.data.split(/(\[[^\]]+\])/g);
            if (pieces.length === 1) continue;
            const fragment = document.createDocumentFragment();
            for (const piece of pieces) {
                if (/^\[[^\]]+\]$/.test(piece)) {
                    const span = document.createElement('span');
                    span.style.color = colorize(piece, title.parentElement);
                    span.style.fontSize = '0.9em';
                    span.textContent = piece;
                    fragment.append(span);
                } else fragment.append(document.createTextNode(piece));
            }
            node.replaceWith(fragment);
        }
    });
}

function hideScs(root = document) {
    if (!options.hide_scs) return;
    const title = document.querySelector('#pageheader a.titles[href]');
    const forumId = title && forumLink(title.getAttribute('href'), 'viewforum.php')?.searchParams.get('f');
    if (!options.apply_in_scs && forumId === '22') return;
    const patterns = { 1: /topic_tags\/scs_/, 2: /topic_tags\/scs_on/, 3: /topic_tags\/scs_[oy][^f]/ };
    const pattern = patterns[options.hide_scs];
    if (!pattern) return;
    root.querySelectorAll('.topictitle img').forEach(image => {
        if (pattern.test(image.src)) {
            const row = image.closest('tr');
            if (row) row.style.display = 'none';
        }
    });
}

function hexToRgb(hex) {
    return [0, 2, 4].map(start => parseInt(hex.padStart(6, '0').slice(start, start + 2), 16));
}

function colorize(str, parentElem) {
    let hash = 0;
    for (const char of str.toLowerCase()) hash = char.charCodeAt(0) + ((hash << 5) - hash);
    let background = [24, 24, 24];
    while (parentElem) {
        const match = getComputedStyle(parentElem).backgroundColor.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
        if (match) { background = match.slice(1).map(Number); break; }
        parentElem = parentElem.parentElement;
    }
    for (let attempt = 0; attempt < 32; attempt++) {
        const hex = Math.floor(Math.abs((Math.sin(hash + attempt * 131) * 10000) % 1) * 16777215).toString(16).padStart(6, '0');
        if (Math.abs(hexToRgb(hex).reduce((a, b) => a + b, 0) - background.reduce((a, b) => a + b, 0)) >= 300) return `#${hex}`;
    }
    return background.reduce((a, b) => a + b, 0) > 384 ? '#234d70' : '#a9cfff';
}

function setupPageTitle() {
    const original = document.title;
    const divider = original.indexOf('•');
    const cs = divider >= 0 ? `${original.slice(0, divider).trim()} •` : FORUM_NAME;
    const remainder = divider >= 0 ? original.slice(divider + 1).trim() : original;
    const split = remainder.indexOf(' - ');
    const section = split >= 0 ? remainder.slice(0, split).trim() : '';
    const title = document.querySelector('#pageheader a.titles')?.textContent.trim() || (split >= 0 ? remainder.slice(split + 3).trim() : remainder);
    const values = { '%C': cs, '%S': section, '%T': title, '%RT': title.replace(/\[[^\]]*\]/g, '') };
    document.title = options.title_format.replace(/%RT|%[CST]/g, token => values[token]);
}

const previewBindings = new WeakMap();
function previewElement(element, link, getIndex) {
    const old = previewBindings.get(element);
    if (old?.link === link) return;
    if (old) { element.removeEventListener('mouseover', old.enter); element.removeEventListener('mouseleave', old.leave); old.leave(); }
    let timer;
    let active = false;
    const leave = () => { active = false; clearTimeout(timer); };
    const enter = event => {
        if (event.relatedTarget && element.contains(event.relatedTarget)) return;
        active = true;
        const existing = document.getElementById('topic_preview');
        if (existing) existing.hidden = true;
        clearTimeout(timer);
        timer = setTimeout(async () => {
            if (!active) return;
            try {
                const sourcePage = await fetchForumDocument(link);
                if (!active || !element.isConnected) return;
                const profile = forumLink(link, 'memberlist.php');
                const posts = profile ? Array.from(sourcePage.querySelectorAll('#pagecontent table.tablebg, #profile, #viewprofile')) : getPosts(sourcePage);
                const selected = posts[getIndex(posts, link)];
                if (!selected) return;
                const bodyObj = document.importNode(selected, true);
                let tip = document.getElementById('topic_preview');
                if (!tip) {
                    tip = document.createElement('div');
                    tip.id = 'topic_preview';
                    tip.className = 'rin-preview';
                    tip.addEventListener('mouseleave', () => { tip.hidden = true; leave(); });
                    document.body.append(tip);
                }
                tip.replaceChildren(bodyObj);
                const width = window.innerWidth * 0.75;
                const height = window.innerHeight * 0.75;
                tip.style.cssText = `position:absolute;left:${(window.innerWidth - width) / 2}px;top:${(window.innerHeight - height) / 2 + window.scrollY}px;width:${width}px;height:${height}px;overflow:auto;z-index:10000;`;
                tip.hidden = false;
                tip.scrollTop = 0;
                addFullPathPostLinks(bodyObj, sourcePage);
                linkQuoteAuthors(bodyObj);
                steamDBLink(bodyObj);
                addUsersTag(bodyObj);
                showAllSpoilers(bodyObj);
                collapseQuotes(bodyObj);
                if (options.friend_buttons && typeof addFriendButtons === 'function') {
                    void retrievesFriendsLists().then(() => { if (bodyObj.isConnected) addFriendButtons(bodyObj); });
                }
            } catch (error) { console.warn('CS.RIN.RU Enhanced: preview unavailable', error); }
        }, Math.max(0, Number(options.topic_preview_timeout) || 0) * 1000);
    };
    previewBindings.set(element, { enter, leave, link });
    element.addEventListener('mouseover', enter);
    element.addEventListener('mouseleave', leave);
}

function getTopicPreviewLink(topic) {
    const url = forumLink(topic.getAttribute('href'), 'viewtopic.php');
    if (!url) return null;
    url.searchParams.delete('p'); url.searchParams.delete('start'); url.searchParams.delete('view'); url.hash = '';
    if (options.topic_preview_option === 1) { url.searchParams.set('view', 'unread'); url.hash = 'unread'; }
    if (options.topic_preview_option === 2) {
        const last = Array.from(topic.closest('tr')?.querySelectorAll('a[href]') || [])
            .map(link => forumLink(link.getAttribute('href'), 'viewtopic.php')).filter(link => link?.searchParams.has('p')).at(-1);
        if (last) return last.href;
    }
    return url.href;
}

function setupTopicPreview(root = document) {
    if (!options.topic_preview) return;
    root.querySelectorAll('a.topictitle').forEach(topic => {
        const link = getTopicPreviewLink(topic);
        if (link) previewElement(topic, link, posts => options.topic_preview_option === 2 ? posts.length - 1 : 0);
    });
}

function setupPostPreview(root = document) {
    if (!options.post_preview) return;
    root.querySelectorAll('a.postlink, a.postlink-local').forEach(post => {
        const url = forumLink(post.getAttribute('href'), 'viewtopic.php');
        if (!url) return;
        const postId = url.searchParams.get('p');
        if (/^\d+$/.test(postId)) previewElement(post, url.href, posts => posts.findIndex(item => getPostId(item) === postId));
        else if (url.searchParams.has('t') && options.topic_preview) {
            const link = getTopicPreviewLink(post);
            if (link) previewElement(post, link, posts => options.topic_preview_option === 2 ? posts.length - 1 : 0);
        }
    });
}

function setupProfilePreview(root = document) {
    if (!options.profile_preview) return;
    root.querySelectorAll('a.postlink-local, a.postlink').forEach(profile => {
        const url = forumLink(profile.getAttribute('href'), 'memberlist.php', { mode: 'viewprofile' });
        if (url) previewElement(profile, url.href, () => 0);
    });
}

const steamTagsRequests = new Map();
function addUsersTag(root = document) {
    if (!options.add_users_tag) return;
    root.querySelectorAll('.postbody').forEach(body => {
        const steam = Array.from(body.querySelectorAll('a[href]')).find(link => getSteamAppId(link.href, 'store.steampowered.com'));
        if (!steam || body.dataset.rinSteamTags) return;
        // These labels belong to the Steam presentation BBCode, not translated navigation.
        const genre = Array.from(body.querySelectorAll('span, b, strong')).find(node => /^(?:Genre\(s\)|Genres?|Жанр(?:ы)?):\s*$/i.test(node.textContent.trim()));
        if (!genre) return;
        body.dataset.rinSteamTags = 'pending';
        if (!steamTagsRequests.has(steam.href)) steamTagsRequests.set(steam.href, requestExternalText(steam.href).then(html => {
            const doc = parseForumDocument(html);
            return Array.from(doc.querySelectorAll('.glance_tags a.app_tag'), tag => tag.textContent.trim()).filter(Boolean).join(', ');
        }).catch(error => { console.warn('CS.RIN.RU Enhanced: Steam tags unavailable', error); return ''; }));
        steamTagsRequests.get(steam.href).then(tags => {
            if (!tags || !genre.isConnected) return;
            const line = document.createElement('span');
            line.className = 'rin-steam-tags';
            const label = document.createElement('strong');
            label.textContent = rinText('User-defined Tag(s): ');
            line.append(label, document.createTextNode(tags));
            let end = genre.nextSibling;
            while (end && end.nodeName !== 'BR') end = end.nextSibling;
            if (end) end.before(document.createElement('br'), line); else genre.parentElement.append(document.createElement('br'), line);
            body.dataset.rinSteamTags = 'done';
        });
    });
}

function steamDBLink(root = document) {
    if (!options.steam_db_link) return;
    const postlinks = Array.from(root.querySelectorAll('a.postlink, a.postlink-local'));
    const getContainer = link => link.closest('.quotecontent, .postbody') || link.parentElement;
    for (let i = 0; i < postlinks.length; i++) {
        const appId = getSteamAppId(postlinks[i].href, 'store.steampowered.com');
        if (!appId) continue;
        const container = getContainer(postlinks[i]);
        if (Array.from(container.querySelectorAll('a[href]')).some(link => getContainer(link) === container && getSteamAppId(link.href, 'steamdb.info') === appId)) continue;
        let j = i;
        while (j + 1 < postlinks.length && getContainer(postlinks[j + 1]) === container &&
            postlinks[j].getBoundingClientRect().y === postlinks[j + 1].getBoundingClientRect().y &&
            postlinks[j].nextSibling !== null && postlinks[j].nextSibling.nodeName !== 'BR') j++;
        const link = document.createElement('a');
        link.href = `https://steamdb.info/app/${appId}/`;
        link.className = 'postlink'; link.rel = 'nofollow'; link.textContent = link.href;
        const label = document.createElement('span');
        label.style.fontWeight = 'bold'; label.textContent = 'SteamDB Page: ';
        postlinks[j].after(document.createElement('br'), label, link);
    }
}

function addLink(root = document, page = document) {
    if (!options.copy_link_button) return;
    for (const post of getPosts(root)) {
        const bar = getPostActionBar(post);
        const postId = getPostId(post);
        if (!bar || !postId || bar.querySelector('.rin-copy-link')) continue;
        const button = document.createElement('a');
        button.href = getFullPathPostLink(`${FORUM_BASE_URL}viewtopic.php?p=${postId}#p${postId}`, getTopicLinkContext(page));
        button.className = 'rin-copy-link';
        button.append(createActionIcon('copy', 'Copy the link into the clipboard'));
        button.addEventListener('click', async event => {
            event.preventDefault();
            try { await navigator.clipboard.writeText(button.href); showActionFeedback(button, 'Copied!'); }
            catch { notifyRin('Unable to copy the link.', 'Error'); }
        });
        bar.append(button);
    }
}



function getToolbar() {
    let toolbar = document.getElementById('rin-toolbar');
    if (!toolbar) {
        toolbar = document.createElement('div'); toolbar.id = 'rin-toolbar'; toolbar.className = 'rin-toolbar';
        document.body.append(toolbar);
    }
    return toolbar;
}

function AddShoutbox() {
    if (!options.add_small_shoutbox || window.location.pathname.endsWith('/chat.php') || document.getElementById('rin-chat-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'rin-chat-toggle'; button.className = 'rin-forum-button';
    button.textContent = rinText('Show Chat');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
        const existing = document.getElementById('chatDiv');
        const open = !existing;
        if (existing) existing.remove(); else { createChatContainer(); fetchChat(); }
        button.textContent = rinText(open ? 'Hide Chat' : 'Show Chat');
        button.setAttribute('aria-expanded', String(open));
        GM_setValue('chatActive', open);
    });
    getToolbar().append(button);
    if (GM_getValue('chatActive', false)) button.click();
}

function createChatContainer() {
    if (document.getElementById('chatDiv')) return;
    const container = document.createElement('div');
    container.id = 'chatDiv';
    container.className = 'rin-chat-panel';
    container.setAttribute('aria-label', rinText('Show Chat'));
    container.textContent = rinText('Loading...');
    document.body.append(container);
}

function fetchChat() {
    const container = document.getElementById('chatDiv');
    if (!container) return;
    // Keep the native chat runtime isolated; extracting and reinjecting its scripts leaked timers.
    const frame = document.createElement('iframe');
    frame.name = 'rin-enhanced-chat';
    const url = new URL('chat.php', FORUM_BASE_URL);
    const language = new URL(window.location.href).searchParams.get('lang');
    if (language) url.searchParams.set('lang', language);
    frame.src = url.href;
    frame.title = rinText('Show Chat');
    frame.style.cssText = 'width:100%;height:100%;border:0;';
    container.replaceChildren(frame);
}

function setupQuickReplyPanel() {
    if (!options.quick_reply || !quickReplyPanel || document.getElementById('rin-quick-reply-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'rin-quick-reply-toggle'; button.className = 'rin-forum-button';
    button.textContent = rinText('Show Quick Reply Panel');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') === 'false';
        quickReplyPanel.classList.toggle('rin-quick-reply-open', open);
        button.setAttribute('aria-expanded', String(open));
        button.textContent = rinText(open ? 'Hide Quick Reply Panel' : 'Show Quick Reply Panel');
    });
    getToolbar().append(button);
}

function changeTopicLink(root = document) {
    if (!options.change_topic_link) return;
    root.querySelectorAll('a.topictitle, #pageheader a.titles').forEach(link => {
        const url = forumLink(link.getAttribute('href'), 'viewtopic.php');
        if (!url) return;
        if (options.change_topic_link === 1) {
            url.searchParams.delete('p'); url.searchParams.delete('start');
            url.searchParams.set('view', 'unread'); url.hash = 'unread'; link.href = url.href;
        } else if (options.change_topic_link === 2) {
            const last = Array.from(link.closest('tr')?.querySelectorAll('a[href]') || [])
                .map(anchor => forumLink(anchor.getAttribute('href'), 'viewtopic.php'))
                .filter(target => /^\d+$/.test(target?.searchParams.get('p'))).at(-1);
            if (last) link.href = last.href;
        }
    });
}

function createProfileLink(link) {
    if (document.getElementById('profile_link')) return;
    const profile = forumLink(link, 'memberlist.php', { mode: 'viewprofile' });
    if (!profile || !/^\d+$/.test(profile.searchParams.get('u'))) return;
    const menu = document.getElementById('menubar');
    const anchor = menu && findForumLink(menu, 'ucp.php');
    if (!anchor) return;
    const button = document.createElement('a');
    button.id = 'profile_link'; button.href = profile.href; button.textContent = rinText('Profile');
    anchor.after(document.createTextNode(' :: '), button);
    colorizeThePages();
}

async function addProfileButton() {
    if (!options.add_profile_button || !CONNECTED || !USERNAME) return;
    const key = `profileLink:${USERNAME}`;
    const saved = GM_getValue(key, null);
    if (saved) { createProfileLink(saved); return; }
    const matchProfile = page => Array.from(page.querySelectorAll('a[href]')).find(link =>
        link.textContent.trim() === USERNAME && /^\d+$/.test(forumLink(link.getAttribute('href'), 'memberlist.php', { mode: 'viewprofile' })?.searchParams.get('u')));
    let profile = matchProfile(document);
    try {
        if (!profile) {
            const url = new URL('memberlist.php', FORUM_BASE_URL);
            url.search = new URLSearchParams({ sk: 'c', sd: 'a', username: USERNAME, mode: 'searchuser' }).toString();
            profile = matchProfile(await fetchForumDocument(url.href));
        }
        if (profile) {
            const href = new URL(profile.getAttribute('href'), FORUM_BASE_URL).href;
            GM_setValue(key, href); createProfileLink(href);
        }
    } catch (error) { console.warn('CS.RIN.RU Enhanced: profile unavailable', error); }
}

function changeColorOfNewMessage() {
    if (!options.colorize_new_messages) return;
    const field = document.querySelector(SELECTORS.NEW_MESSAGES);
    if (field) field.style.color = /\b[1-9]\d*\b/.test(field.textContent) ? 'red' : '';
}

function colorizeThePages() {
    if (!options.colorize_the_page) return;
    const palette = { 'chat.php': '#98FB98', 'faq.php': '#90EE90', 'memberlist.php': '#4169E1', 'ucp.php': '#87CEEB', 'search.php': '#87CEFA' };
    document.querySelectorAll('#menubar a[href]').forEach(link => {
        try {
            const url = new URL(link.getAttribute('href'), FORUM_BASE_URL);
            const name = url.pathname.split('/').at(-1);
            if (palette[name]) link.style.color = palette[name];
            if (url.searchParams.get('mode') === 'logout') link.style.color = '#FF0000';
            if (url.searchParams.get('mode') === 'rules') link.style.color = '#FFA07A';
            if (url.pathname.includes('donat')) link.style.color = '#FFC200';
        } catch { /* Ignore non-URL menu actions. */ }
    });
    const profile = document.getElementById('profile_link');
    if (profile) profile.style.color = '#F08080';
    const heading = document.querySelector('#logodesc h1');
    if (heading) heading.style.color = colorize(heading.textContent, heading.parentElement);
}

async function colorizeFriendsMe(root = document) {
    if (!options.colorize_friends_me) return;
    if (options.colorize_friends_me > 1) await retrievesFriendsLists();
    const names = new Set([...FRIENDS_LIST, USERNAME].filter(Boolean));
    root.querySelectorAll('a[href*="memberlist.php"], .postauthor, .gen, .postlink-local, .quotetitle').forEach(node => {
        let name = node.textContent.trim();
        if (node.classList.contains('quotetitle')) {
            const direct = node.querySelector('.rin-quote-author-link')?.textContent.trim() || name;
            name = Array.from(names).find(candidate => direct === `${candidate} wrote:` || direct === `${candidate} писал(а):` || direct === `${candidate} a écrit :`) || direct;
        }
        if (name === USERNAME && (options.colorize_friends_me === 1 || options.colorize_friends_me === 3)) node.style.color = color.color_of_me;
        else if (FRIENDS_LIST.includes(name) && options.colorize_friends_me > 1) node.style.color = color.color_of_friends;
    });
}

function showAllSpoilers(root = document) {
    if (!options.show_all_spoilers) return;
    root.querySelectorAll('input[type="button"]:not(.collapse-quote-btn)').forEach(button => {
        // Native spoiler handlers use a .quotecontent sibling containing a hidden div.
        const content = button.parentElement?.nextElementSibling;
        if (!content?.classList.contains('quotecontent') || button.closest('.quotetitle')) return;
        const hidden = Array.from(content.children).find(child => child.tagName === 'DIV');
        if (hidden && (hidden.style.display === 'none' || hidden.hidden)) button.click();
    });
}

function quotify(root = document) {
    if (!quickReplyPanel) return;
    root.querySelectorAll('a[href]').forEach(link => {
        const url = forumLink(link.getAttribute('href'), 'posting.php', { mode: 'quote' });
        if (!url || link.dataset.rinQuickQuote || link.closest('.postbody, .signature')) return;
        const postID = url.searchParams.get('p');
        if (!/^\d+$/.test(postID)) return;
        link.dataset.rinQuickQuote = 'true';
        let loading = false;
        link.addEventListener('click', async event => {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const message = quickReplyPanel.querySelector('[name="message"]');
            if (!message) return;
            event.preventDefault();
            if (loading) return;
            loading = true;
            try {
                const doc = await fetchForumDocument(url.href);
                const field = doc.querySelector('textarea[name="message"]');
                if (!field) throw new Error('Quote form missing');
                message.value += options.add_link_quote ? addLinkToQuote(field.value, postID) : field.value;
                message.dispatchEvent(new Event('input', { bubbles: true }));
                showActionFeedback(link, 'Quoted!');
            } catch (error) { console.warn('CS.RIN.RU Enhanced: quote unavailable', error); notifyRin('Unable to load the quote.', 'Error'); }
            finally { loading = false; }
        });
    });
}

function searchURL() {
    const searchBar = document.querySelector("#searchBar");
    // Config values
    const searchSubforums = options.special_search_parameter.searchSubforums;
    const searchTopicLocation = options.special_search_parameter.searchTopicLocation;
    const sortResultsBy = options.special_search_parameter.sortResultsBy;
    const sortOrderBy = options.special_search_parameter.sortOrderBy;
    const limitToPrevious = options.special_search_parameter.limitToPrevious;
    const returnFirst = options.special_search_parameter.returnFirst;
    // Fetch the values from search options
    let searchScope = document.getElementById("searchScope").value; // Everywhere/This forum/This topic
    let searchTerms = document.getElementById("searchTerms").value; // Any/All
    let searchLocation = document.getElementById("searchLocation").checked ? "firstpost" : (searchTopicLocation === "all" || searchTopicLocation === "msgonly") ? searchTopicLocation : "all"; // Search
    let showResultsAsPosts = document.getElementById("showAsPosts").checked ? "posts" : "topics"; // Display
    let searchAuthor = document.getElementById("searchAuthor").value; // Author
    const { forumId, topicId } = getSearchContext();
    if ((searchScope === "thisForum" && !forumId) || (searchScope === "thisTopic" && !topicId)) {
        notifyRin("The current forum or topic could not be identified. Reload the page and try again.", "Search");
        return;
    }

    const params = new URLSearchParams({
        keywords: searchBar.value,
        terms: searchTerms,
        author: searchAuthor,
        sc: searchSubforums,
        sf: searchLocation,
        sk: sortResultsBy,
        sd: sortOrderBy,
        sr: showResultsAsPosts,
        st: limitToPrevious,
        ch: returnFirst,
        t: searchScope === "thisTopic" ? topicId : "0",
    });
    if (searchScope === "thisForum") params.set('fid[]', forumId);
    const url = new URL('search.php', FORUM_BASE_URL);
    const language = new URL(window.location.href).searchParams.get('lang');
    if (language) params.set('lang', language);
    url.search = params.toString();
    window.location.href = url.href;
}


async function specialSearch() {
    if (!options.special_search || document.getElementById('searchBar')) return;
    const menu = document.getElementById('menubar');
    const cell = (menu && findForumLink(menu, 'search.php'))?.closest('td') || menu;
    if (!cell) return;
    const settings = options.special_search_parameter;
    const container = document.createElement('div');
    container.className = 'rin-special-search';
    const searchBar = document.createElement('input');
    searchBar.id = 'searchBar'; searchBar.type = 'text'; searchBar.placeholder = rinText('Special search');
    searchBar.setAttribute('aria-label', rinText('Special search'));
    const panel = document.createElement('div');
    panel.id = 'searchOptions'; panel.hidden = true; panel.className = 'rin-search-options';
    const addField = (labelText, element) => {
        const row = document.createElement('div');
        const label = document.createElement('label'); label.htmlFor = element.id; label.textContent = rinText(labelText);
        row.append(label, document.createTextNode(' '), element); panel.append(row);
    };
    const selectField = (id, values, selected) => {
        const select = document.createElement('select'); select.id = id; select.name = id;
        for (const [value, label] of values) {
            const option = document.createElement('option'); option.value = value; option.textContent = rinText(label); select.append(option);
        }
        if (selected) select.value = selected;
        return select;
    };
    const checkbox = (id, checked) => {
        const input = document.createElement('input'); input.id = id; input.name = id; input.type = 'checkbox'; input.checked = checked; return input;
    };
    const context = getSearchContext();
    const scopes = [['everywhere', 'Everywhere']];
    if (context.forumId) scopes.push(['thisForum', 'This forum']);
    if (context.topicId) scopes.push(['thisTopic', 'This topic']);
    addField('Search:', selectField('searchScope', scopes));
    addField('Search for:', selectField('searchTerms', [['any', 'Any term'], ['all', 'All terms']], settings.searchTermsSpecificity));
    addField('Search first post/titles only', checkbox('searchLocation', ['titleonly', 'firstpost'].includes(settings.searchTopicLocation)));
    addField('Show as posts', checkbox('showAsPosts', settings.showResultsAsPosts));
    const author = document.createElement('input'); author.type = 'text'; author.id = 'searchAuthor'; author.name = 'searchAuthor'; author.placeholder = rinText("Author's name");
    addField('By:', author);
    const searchButton = document.createElement('button'); searchButton.id = 'searchButton'; searchButton.type = 'button'; searchButton.className = 'rin-forum-button'; searchButton.textContent = rinText('Search');
    searchButton.addEventListener('click', searchURL); panel.append(searchButton);
    container.append(searchBar, panel); cell.prepend(container);
    searchBar.addEventListener('click', event => { event.stopPropagation(); panel.hidden = false; });
    panel.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', () => { panel.hidden = true; });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') panel.hidden = true; });
    searchBar.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); searchURL(); } });
    if (settings.showFriends && CONNECTED) {
        await retrievesFriendsLists();
        const list = document.createElement('div'); list.id = 'friends-lists-search'; list.hidden = true;
        const title = document.createElement('p'); title.textContent = rinText('Friends ({count}):', { count: FRIENDS_LIST.length }); list.append(title);
        if (!FRIENDS_LIST.length) list.append(document.createTextNode(rinText('No friends added yet.')));
        for (const friend of FRIENDS_LIST) {
            const button = document.createElement('button'); button.type = 'button'; button.textContent = friend;
            button.addEventListener('click', () => { author.value = friend; list.hidden = true; }); list.append(button);
        }
        panel.append(list); author.addEventListener('click', () => { list.hidden = false; });
    }
}

loadConfig();
window.addEventListener('message', receiveConfigMessage);
if (window.name !== 'rin-enhanced-chat') void loadConfigButton();
const quickReplyPanel = document.getElementById('postform');
if (options.script_enabled && window.name !== 'rin-enhanced-chat') {
    GM_addStyle(`
        .rin-loading { position:fixed;left:50%;top:15%;z-index:10002;color:#a9bdd8;pointer-events:none; }
        .rin-loading svg { animation:rin-spin 1s linear infinite; }
        @keyframes rin-spin { to { transform:rotate(360deg); } }
        .rin-page-nav { position:sticky;top:0;z-index:900;background:Canvas;color:CanvasText;padding:.3em;font-size:1em; }
        .rin-mention-link,.rin-copy-link { display:inline-block;margin-left:4px;vertical-align:middle; }
        .rin-action-feedback { background:#202832;color:#fff;padding:3px 6px;border-radius:3px; }
        .rin-preview { background:Canvas;color:CanvasText;border:1px solid #777;box-shadow:0 4px 20px #0008; }
        .rin-special-search { position:relative;display:inline-block; }
        .rin-search-options { position:absolute;top:100%;right:0;min-width:250px;background:Canvas;color:CanvasText;border:1px solid #777;padding:.5em;z-index:9999; }
        .rin-search-options > div { padding:.35em; }
        .rin-chat-panel { position:fixed;right:1em;bottom:4em;width:min(425px,95vw);height:70vh;z-index:9998;background:Canvas;border:1px solid #777; }
        .rin-quick-reply-open { position:sticky;bottom:3em;z-index:9990; }
    `);
    initializeMention();
    if (typeof applySelectedQuoteToEditor === 'function') applySelectedQuoteToEditor();
    AddLinkQuote();
    enhanceContent();
    setupPageTitle();
    setupInfiniteScroll();
    allDynamicFunction();
    AddShoutbox();
    setupQuickReplyPanel();
    void addProfileButton();
    changeColorOfNewMessage();
    colorizeThePages();
    void specialSearch();
}

// BEGIN BUNDLED ASSETS — generated by npm run build
// Edit config.html/config.css/config.js and src/*.js, then rebuild this block.
function getBundledConfig() {
    return { html: "<!doctype html>\n<html lang=\"en\">\n<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>CS.RIN.RU Enhanced · Settings</title><link rel=\"stylesheet\" href=\"./config.css\"><script src=\"./config.js\" defer></script></head>\n<body>\n<div id=\"wholeWindow\" hidden>\n<section id=\"configWindow\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"rin-settings-title\" tabindex=\"-1\">\n<header class=\"rin-settings-header\"><div><div class=\"rin-settings-brand\">CS.RIN.RU <span>ENHANCED</span></div><h1 id=\"rin-settings-title\" data-i18n=\"settings\">Settings</h1></div><button id=\"rin-config-close\" class=\"rin-icon-button\" type=\"button\" data-i18n-title=\"close\" data-i18n-aria=\"close\" title=\"Close\" aria-label=\"Close\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m6 6 12 12M18 6 6 18\"/></svg></button></header>\n<div class=\"rin-masterbar\"><label class=\"rin-master-switch\" for=\"script_enabled\"><input id=\"script_enabled\" data-option type=\"checkbox\" data-originalValue=\"\"><span data-i18n=\"script_enabled\">Enable enhancements</span></label><div class=\"rin-language\"><label for=\"ui_language\" data-i18n=\"ui_language\">Language</label><select id=\"ui_language\" data-option data-originalValue=\"\"><option value=\"auto\" data-i18n=\"language_auto\">Forum language</option><option value=\"en\">English</option><option value=\"ru\">Русский</option></select></div></div>\n<div id=\"rin-login-note\" class=\"rin-notice\" hidden data-i18n=\"login_note\">Sign in to the forum to use account features.</div>\n<nav class=\"rin-settings-nav\" role=\"tablist\" aria-label=\"Settings sections\" data-i18n-aria=\"sections\">\n<button type=\"button\" role=\"tab\" id=\"rin-tab-general\" aria-controls=\"rin-panel-general\" aria-selected=\"true\" data-panel=\"general\"><span class=\"rin-tab-number\">01</span><span data-i18n=\"general\">General</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-reading\" aria-controls=\"rin-panel-reading\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"reading\"><span class=\"rin-tab-number\">02</span><span data-i18n=\"reading\">Reading</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-replies\" aria-controls=\"rin-panel-replies\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"replies\"><span class=\"rin-tab-number\">03</span><span data-i18n=\"replies\">Replies</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-community\" aria-controls=\"rin-panel-community\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"community\"><span class=\"rin-tab-number\">04</span><span data-i18n=\"community\">Community</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-search\" aria-controls=\"rin-panel-search\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"search\"><span class=\"rin-tab-number\">05</span><span data-i18n=\"search\">Search</span></button>\n</nav>\n<form id=\"rin-config-form\" novalidate><fieldset id=\"config\">\n<section class=\"rin-settings-panel\" id=\"rin-panel-general\" role=\"tabpanel\" aria-labelledby=\"rin-tab-general\"><div class=\"rin-section-heading\"><h2 data-i18n=\"general_heading\">Browsing &amp; updates</h2><p data-i18n=\"general_intro\">Keep the familiar forum, with a few useful improvements.</p></div>\n<label class=\"rin-setting\" for=\"infinite_scrolling\"><span><span data-i18n=\"infinite_scrolling\">Infinite scrolling</span><small id=\"infinite_scrolling_help\" data-i18n=\"infinite_scrolling_help\">Load the next page as you reach the bottom.</small></span><input id=\"infinite_scrolling\" data-option data-originalValue=\"\" aria-describedby=\"infinite_scrolling_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"dynamic_function\"><span><span data-i18n=\"dynamic_function\">Live forum updates</span><small id=\"dynamic_function_help\" data-i18n=\"dynamic_function_help\">Refresh messages, online users and forum time every minute.</small></span><input id=\"dynamic_function\" data-option data-originalValue=\"\" need-connected=\"true\" aria-describedby=\"dynamic_function_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"dynamic_content\"><span><span data-i18n=\"dynamic_content\">Live topic content</span><small id=\"dynamic_content_help\" data-i18n=\"dynamic_content_help\">Refresh topic content while live forum updates are enabled.</small></span><input id=\"dynamic_content\" data-option data-originalValue=\"\" need-connected=\"true\" aria-describedby=\"dynamic_content_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"colorize_the_page\"><span><span data-i18n=\"colorize_the_page\">Add color to forum elements</span></span><input id=\"colorize_the_page\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"custom_tags\"><span><span data-i18n=\"custom_tags\">Color topic tags</span></span><input id=\"custom_tags\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"display_ajax_loader\"><span><span data-i18n=\"display_ajax_loader\">Show loading indicators</span></span><input id=\"display_ajax_loader\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting rin-setting-stack\"><label for=\"title_format\" data-i18n=\"title_format\">Browser tab title</label><input id=\"title_format\" data-option data-originalValue=\"\" aria-describedby=\"title_format_help\" type=\"text\" spellcheck=\"false\"><small id=\"title_format_help\" data-i18n=\"title_format_help\">%C forum · %S section · %T topic title · %RT title without tags</small></div>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-reading\" role=\"tabpanel\" aria-labelledby=\"rin-tab-reading\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"reading_heading\">Topics &amp; links</h2><p data-i18n=\"reading_intro\">Choose where links lead and how posts are displayed.</p></div>\n<div class=\"rin-setting\"><label for=\"change_topic_link\" data-i18n=\"change_topic_link\">Open topic titles at</label><select id=\"change_topic_link\" data-option data-originalValue=\"\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"change_topic_link_0\">First post</option><option value=\"1\" data-i18n=\"change_topic_link_1\">First unread post</option><option value=\"2\" data-i18n=\"change_topic_link_2\">Last post</option></select></div>\n<label class=\"rin-setting\" for=\"steam_db_link\"><span><span data-i18n=\"steam_db_link\">Add missing SteamDB links</span><small id=\"steam_db_link_help\" data-i18n=\"steam_db_link_help\">Keep links already provided by the forum.</small></span><input id=\"steam_db_link\" data-option data-originalValue=\"\" aria-describedby=\"steam_db_link_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"copy_link_button\"><span><span data-i18n=\"copy_link_button\">Copy post link button</span></span><input id=\"copy_link_button\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"full_path_post_links\"><span><span data-i18n=\"full_path_post_links\">Include forum and topic in post links</span><small id=\"full_path_post_links_help\" data-i18n=\"full_path_post_links_help\">Keep the topic context when sharing a post.</small></span><input id=\"full_path_post_links\" data-option data-originalValue=\"\" aria-describedby=\"full_path_post_links_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"collapse_quotes\"><span><span data-i18n=\"collapse_quotes\">Collapse quotes by default</span></span><input id=\"collapse_quotes\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"show_all_spoilers\"><span><span data-i18n=\"show_all_spoilers\">Open all spoilers</span></span><input id=\"show_all_spoilers\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"topic_preview\"><span><span data-i18n=\"topic_preview\">Preview topics on hover</span></span><input id=\"topic_preview\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"topic_preview_option\" data-i18n=\"topic_preview_option\">Topic preview opens at</label><select id=\"topic_preview_option\" data-option data-originalValue=\"\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"topic_preview_option_0\">First post</option><option value=\"1\" data-i18n=\"topic_preview_option_1\">First unread post</option><option value=\"2\" data-i18n=\"topic_preview_option_2\">Last post</option></select></div>\n<label class=\"rin-setting\" for=\"post_preview\"><span><span data-i18n=\"post_preview\">Preview individual posts</span></span><input id=\"post_preview\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"profile_preview\"><span><span data-i18n=\"profile_preview\">Preview user profiles</span></span><input id=\"profile_preview\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"topic_preview_timeout\" data-i18n=\"topic_preview_timeout\">Preview delay (seconds)</label><input id=\"topic_preview_timeout\" data-option data-originalValue=\"\" aria-describedby=\"topic_preview_timeout_help\" type=\"number\" min=\"1\" max=\"99\"><small id=\"topic_preview_timeout_help\" data-i18n=\"topic_preview_timeout_help\">Applies to topic, post and profile previews.</small></div>\n<div class=\"rin-setting\"><label for=\"hide_scs\" data-i18n=\"hide_scs\">SCS topic filter</label><select id=\"hide_scs\" data-option data-originalValue=\"\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"hide_scs_0\">Show all topics</option><option value=\"1\" data-i18n=\"hide_scs_1\">Hide all marked topics</option><option value=\"2\" data-i18n=\"hide_scs_2\">Hide green topics</option><option value=\"3\" data-i18n=\"hide_scs_3\">Show only red topics</option></select></div>\n<label class=\"rin-setting\" for=\"apply_in_scs\"><span><span data-i18n=\"apply_in_scs\">Also filter inside Steam Content Sharing</span></span><input id=\"apply_in_scs\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-replies\" role=\"tabpanel\" aria-labelledby=\"rin-tab-replies\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"replies_heading\">Writing replies</h2><p data-i18n=\"replies_intro\">Useful shortcuts that keep standard forum formatting.</p></div>\n<div class=\"rin-setting rin-setting-stack\"><label for=\"mentioning\" data-i18n=\"mentioning\">Mentioning</label><input id=\"mentioning\" data-option data-originalValue=\"\" aria-describedby=\"mentioning_help\" type=\"text\" spellcheck=\"false\"><small id=\"mentioning_help\" data-i18n=\"mentioning_help\">BBCode supported. %m = username, %u = profile URL, %p = post URL. Leave empty to disable mentions.</small></div>\n<label class=\"rin-setting\" for=\"add_link_quote\"><span><span data-i18n=\"add_link_quote\">Link quote authors to their posts</span><small id=\"add_link_quote_help\" data-i18n=\"add_link_quote_help\">Include a source link in valid quote BBCode.</small></span><input id=\"add_link_quote\" data-option data-originalValue=\"\" need-connected=\"true\" aria-describedby=\"add_link_quote_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"quick_reply\"><span><span data-i18n=\"quick_reply\">Floating quick reply panel</span><small id=\"quick_reply_help\" data-i18n=\"quick_reply_help\">Requires quick reply to be enabled in your forum preferences.</small></span><input id=\"quick_reply\" data-option data-originalValue=\"\" aria-describedby=\"quick_reply_help\" type=\"checkbox\"></label>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-community\" role=\"tabpanel\" aria-labelledby=\"rin-tab-community\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"community_heading\">People &amp; messages</h2><p data-i18n=\"community_intro\">Account features are available while you are signed in.</p></div>\n<label class=\"rin-setting\" for=\"friend_buttons\"><span><span data-i18n=\"friend_buttons\">Friend buttons beside usernames</span></span><input id=\"friend_buttons\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"colorize_friends_me\" data-i18n=\"colorize_friends_me\">Highlight usernames</label><select id=\"colorize_friends_me\" data-option data-originalValue=\"\" need-connected=\"true\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"colorize_friends_me_0\">No highlighting</option><option value=\"1\" data-i18n=\"colorize_friends_me_1\">My username</option><option value=\"2\" data-i18n=\"colorize_friends_me_2\">My friends</option><option value=\"3\" data-i18n=\"colorize_friends_me_3\">My username and friends</option></select></div>\n<label class=\"rin-setting\" for=\"add_profile_button\"><span><span data-i18n=\"add_profile_button\">Shortcut to my profile</span></span><input id=\"add_profile_button\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"colorize_new_messages\"><span><span data-i18n=\"colorize_new_messages\">Highlight new private messages</span></span><input id=\"colorize_new_messages\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"add_small_shoutbox\"><span><span data-i18n=\"add_small_shoutbox\">Compact chat panel</span></span><input id=\"add_small_shoutbox\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"add_users_tag\"><span><span data-i18n=\"add_users_tag\">Show Steam user tags</span></span><input id=\"add_users_tag\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-search\" role=\"tabpanel\" aria-labelledby=\"rin-tab-search\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"search_heading\">Search defaults</h2><p data-i18n=\"search_intro\">Set the starting options for the enhanced search bar.</p></div>\n<label class=\"rin-setting\" for=\"special_search\"><span><span data-i18n=\"special_search\">Enable enhanced search</span></span><input id=\"special_search\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"searchTermsSpecificity\" data-i18n=\"searchTermsSpecificity\">Match search terms</label><select id=\"searchTermsSpecificity\" data-search-option data-originalValue=\"\"><option value=\"any\" data-i18n=\"searchTermsSpecificity_any\">Any term</option><option value=\"all\" data-i18n=\"searchTermsSpecificity_all\">All terms</option></select></div>\n<label class=\"rin-setting\" for=\"searchSubforums\"><span><span data-i18n=\"searchSubforums\">Include subforums</span></span><input id=\"searchSubforums\" data-search-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"searchTopicLocation\" data-i18n=\"searchTopicLocation\">Search within</label><select id=\"searchTopicLocation\" data-search-option data-originalValue=\"\"><option value=\"all\" data-i18n=\"searchTopicLocation_all\">Subjects and message text</option><option value=\"msgonly\" data-i18n=\"searchTopicLocation_msgonly\">Message text only</option><option value=\"titleonly\" data-i18n=\"searchTopicLocation_titleonly\">Topic titles only</option><option value=\"firstpost\" data-i18n=\"searchTopicLocation_firstpost\">First posts only</option></select></div>\n<div class=\"rin-setting\"><label for=\"sortResultsBy\" data-i18n=\"sortResultsBy\">Sort results by</label><select id=\"sortResultsBy\" data-search-option data-originalValue=\"\"><option value=\"a\" data-i18n=\"sortResultsBy_a\">Author</option><option value=\"t\" data-i18n=\"sortResultsBy_t\">Post time</option><option value=\"f\" data-i18n=\"sortResultsBy_f\">Forum</option><option value=\"i\" data-i18n=\"sortResultsBy_i\">Topic title</option><option value=\"s\" data-i18n=\"sortResultsBy_s\">Post subject</option></select></div>\n<div class=\"rin-setting\"><label for=\"sortOrderBy\" data-i18n=\"sortOrderBy\">Sort order</label><select id=\"sortOrderBy\" data-search-option data-originalValue=\"\"><option value=\"a\" data-i18n=\"sortOrderBy_a\">Ascending</option><option value=\"d\" data-i18n=\"sortOrderBy_d\">Descending</option></select></div>\n<label class=\"rin-setting\" for=\"showResultsAsPosts\"><span><span data-i18n=\"showResultsAsPosts\">Display results as posts</span></span><input id=\"showResultsAsPosts\" data-search-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"limitToPrevious\" data-i18n=\"limitToPrevious\">Only the last (days)</label><input id=\"limitToPrevious\" data-search-option data-originalValue=\"\" aria-describedby=\"limitToPrevious_help\" type=\"number\" min=\"0\"><small id=\"limitToPrevious_help\" data-i18n=\"limitToPrevious_help\">0 = no time limit</small></div>\n<div class=\"rin-setting\"><label for=\"returnFirst\" data-i18n=\"returnFirst\">Post excerpt length (characters)</label><input id=\"returnFirst\" data-search-option data-originalValue=\"\" aria-describedby=\"returnFirst_help\" type=\"number\" min=\"-1\"><small id=\"returnFirst_help\" data-i18n=\"returnFirst_help\">−1 = complete post</small></div>\n<label class=\"rin-setting\" for=\"showFriends\"><span><span data-i18n=\"showFriends\">Suggest friends in author search</span></span><input id=\"showFriends\" data-search-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n</section>\n</fieldset></form>\n<div id=\"messages\" class=\"rin-config-status\" role=\"status\" aria-live=\"polite\"></div>\n<footer class=\"rin-settings-footer\"><a class=\"rin-help-link\" href=\"https://cs.rin.ru/forum/viewtopic.php?f=14&amp;t=75717\" target=\"_blank\" rel=\"noopener noreferrer\" data-i18n-title=\"help_title\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.4 9a2.7 2.7 0 0 1 5.2 1c0 2-2.6 2-2.6 4m0 2.5v.1\"/></svg><span data-i18n=\"help\">Help &amp; discussion</span></a><span id=\"rin-preview-badge\" hidden data-i18n=\"preview_badge\">Local preview</span><div class=\"rin-footer-actions\"><button id=\"rin-config-cancel\" type=\"button\" data-i18n=\"cancel\">Cancel</button><button id=\"rin-config-save\" class=\"rin-primary-button\" type=\"submit\" form=\"rin-config-form\" disabled data-i18n=\"save\">Save changes</button></div></footer>\n</section>\n</div>\n<button id=\"configButton\" class=\"rin-forum-button\" type=\"button\" aria-controls=\"configWindow\" aria-expanded=\"false\" title=\"Enhanced settings\" aria-label=\"Enhanced settings\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m9.5 3-.6 2a7 7 0 0 0-1.4.8L5.4 5.3 3 9.5 4.5 11a7 7 0 0 0 0 2L3 14.5l2.4 4.2 2.1-.5a7 7 0 0 0 1.4.8l.6 2h5l.6-2a7 7 0 0 0 1.4-.8l2.1.5 2.4-4.2-1.5-1.5a7 7 0 0 0 0-2L21 9.5l-2.4-4.2-2.1.5a7 7 0 0 0-1.4-.8l-.6-2Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></button>\n</body></html>\n", css: "#wholeWindow {\n    --rin-bg: #20252a; --rin-row: #282e34; --rin-line: #414b54;\n    --rin-muted: #a0aeb9; --rin-text: #e4e9ed; --rin-accent: #9dbfd6;\n    position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center;\n    padding: 24px; box-sizing: border-box; background: rgb(5 8 11 / 78%);\n    color: var(--rin-text); font: 12px/1.5 Tahoma, Verdana, sans-serif; text-align: left; color-scheme: dark;\n}\n#wholeWindow[hidden], #wholeWindow [hidden], #configButton[hidden], .rin-forum-button[hidden] { display: none !important; }\n#wholeWindow *, #wholeWindow *::before, #wholeWindow *::after { box-sizing: border-box; }\n#wholeWindow #configWindow {\n    display: flex; flex-direction: column; width: min(900px, 100%); max-height: min(840px, calc(100dvh - 48px));\n    margin: 0; padding: 0; overflow: hidden; border: 1px solid #687984; border-radius: 3px;\n    background: var(--rin-bg); box-shadow: 0 22px 90px #0009, 0 0 0 4px #080c1055; outline: none;\n}\n#wholeWindow .rin-settings-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 22px 15px; border-bottom: 1px solid #53616b; background: linear-gradient(#384650, #2b353d); }\n#wholeWindow .rin-settings-brand { color: #cedae2; font: bold 12px/1.4 Verdana, sans-serif; letter-spacing: .055em; }\n#wholeWindow .rin-settings-brand span { margin-left: 7px; color: #9fb1bf; font-size: 10px; letter-spacing: .12em; }\n#wholeWindow h1 { margin: 5px 0 0; color: #fff; font: normal 23px/1.2 Tahoma, Verdana, sans-serif; }\n#wholeWindow .rin-masterbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; padding: 12px 22px; background: #242c32; border-bottom: 1px solid var(--rin-line); }\n#wholeWindow .rin-master-switch, #wholeWindow .rin-language { display: flex; align-items: center; gap: 9px; }\n#wholeWindow .rin-master-switch { font-weight: bold; cursor: pointer; }\n#wholeWindow .rin-language { color: var(--rin-muted); font-size: 11px; }\n#wholeWindow .rin-language select { min-width: 155px; max-width: 220px; }\n#wholeWindow .rin-settings-nav { display: flex; flex-shrink: 0; gap: 2px; padding: 0 15px; overflow-x: auto; border-bottom: 1px solid #5c7181; background: #1b2227; scrollbar-width: thin; }\n#wholeWindow .rin-settings-nav button { display: flex; align-items: center; justify-content: center; gap: 7px; flex: 1 0 auto; min-height: 45px; padding: 11px 13px; border: 0; border-bottom: 3px solid transparent; border-radius: 0; background: none; color: #b2c0cb; font-size: 12px; white-space: nowrap; }\n#wholeWindow .rin-settings-nav button:hover { background: #303b44; color: #fff; }\n#wholeWindow .rin-settings-nav button[aria-selected=\"true\"] { border-bottom-color: #a8c4d9; background: #34424d; color: #fff; }\n#wholeWindow .rin-tab-number { font: 10px/1 Consolas, monospace; opacity: .55; }\n#wholeWindow #rin-config-form { min-height: 0; overflow-y: auto; scrollbar-color: #586773 #20252a; scrollbar-width: thin; }\n#wholeWindow #config { min-width: 0; margin: 0; padding: 0; border: 0; }\n#wholeWindow .rin-settings-panel { padding: 17px 22px 23px; }\n#wholeWindow .rin-section-heading { margin-bottom: 10px; }\n#wholeWindow h2 { margin: 0; color: #cfdee8; font-size: 12px; line-height: 1.5; font-weight: bold; }\n#wholeWindow .rin-section-heading p { margin: 3px 0 0; color: var(--rin-muted); font-size: 11px; }\n#wholeWindow .rin-setting { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 5px 22px; min-height: 43px; margin: 0; padding: 10px 12px; border: 1px solid var(--rin-line); border-bottom-width: 0; background: var(--rin-row); color: var(--rin-text); font-weight: normal; }\n#wholeWindow .rin-setting:last-child { border-bottom-width: 1px; }\n#wholeWindow .rin-setting:nth-of-type(even) { background: #252b31; }\n#wholeWindow label.rin-setting { flex-wrap: nowrap; cursor: pointer; }\n#wholeWindow label.rin-setting:hover { background: #303a42; }\n#wholeWindow .rin-setting > span, #wholeWindow .rin-setting > label { flex: 1; min-width: 0; }\n#wholeWindow .rin-setting small { display: block; margin-top: 3px; color: var(--rin-muted); font-size: 10px; font-weight: normal; line-height: 1.5; }\n#wholeWindow .rin-setting > small { flex-basis: 100%; margin-top: 0; }\n#wholeWindow .rin-setting:has(#dynamic_content) > span { padding-left: 13px; border-left: 2px solid #566774; }\n#wholeWindow .rin-setting[data-rin-disabled=\"true\"] { opacity: .53; }\n#wholeWindow .rin-setting-stack { display: flex; align-items: stretch; flex-direction: column; gap: 6px; }\n#wholeWindow .rin-setting-stack > input { width: 100%; }\n#wholeWindow input, #wholeWindow select, #wholeWindow button { font: inherit; }\n#wholeWindow input[type=\"text\"], #wholeWindow input[type=\"number\"], #wholeWindow select { min-width: 0; min-height: 31px; margin: 0; padding: 5px 8px; border: 1px solid #63727e; border-radius: 2px; background: #171e24; color: #eef3f7; line-height: 1.4; }\n#wholeWindow .rin-setting > select { width: 43%; max-width: 340px; }\n#wholeWindow input[type=\"checkbox\"] { flex: 0 0 auto; width: 16px; height: 16px; margin: 0; accent-color: #9cbdd3; cursor: pointer; }\n#wholeWindow input[type=\"number\"] { width: 78px; }\n#wholeWindow input:disabled, #wholeWindow select:disabled { cursor: not-allowed; }\n#wholeWindow #mentioning, #wholeWindow #title_format { font: 12px/1.6 Consolas, \"Liberation Mono\", monospace; }\n#wholeWindow .rin-notice { padding: 8px 22px; border-bottom: 1px solid #665a36; background: #363323; color: #d7cca4; font-size: 11px; }\n#wholeWindow .rin-config-status { flex-shrink: 0; min-height: 32px; padding: 7px 22px; border-top: 1px solid var(--rin-line); background: #1c2329; color: var(--rin-muted); font-size: 11px; }\n#wholeWindow .rin-config-status[data-state=\"changed\"] { color: #d9cca3; }\n#wholeWindow .rin-config-status[data-state=\"error\"] { color: #ffc0b8; }\n#wholeWindow .rin-settings-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; flex-shrink: 0; padding: 12px 22px; border-top: 1px solid #39434c; background: #2b353d; }\n#wholeWindow .rin-footer-actions { display: flex; gap: 8px; margin-left: auto; }\n#wholeWindow button, #wholeWindow .rin-help-link { -webkit-tap-highlight-color: transparent; }\n#wholeWindow button { min-height: 32px; padding: 6px 13px; border: 1px solid #718491; border-radius: 2px; background: linear-gradient(#3c4c58, #2a3741); color: #e6edf2; cursor: pointer; font-weight: normal; line-height: 1.4; }\n#wholeWindow button:hover { background: #435663; border-color: #a6becf; color: #fff; }\n#wholeWindow button:disabled { border-color: #4d5a63; background: #303b43; color: #84929d; cursor: default; }\n#wholeWindow .rin-primary-button:not(:disabled) { border-color: #a8c2d3; background: linear-gradient(#93afc2, #7894a8); color: #101d27; font-weight: bold; text-shadow: 0 1px #ffffff24; }\n#wholeWindow .rin-primary-button:not(:disabled):hover { background: #b0cadb; }\n#wholeWindow .rin-help-link { display: inline-flex; align-items: center; gap: 6px; color: #b3ccdf; text-decoration: none; font-size: 11px; }\n#wholeWindow .rin-help-link:hover { color: #fff; text-decoration: underline; }\n#wholeWindow svg, #configButton svg, .rin-forum-button svg { display: block; flex: 0 0 auto; width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }\n#wholeWindow .rin-help-link svg { width: 17px; height: 17px; }\n#wholeWindow .rin-icon-button { display: grid; place-items: center; width: 32px; height: 32px; padding: 4px; border-color: #637582; background: #25323b; }\n#wholeWindow #rin-preview-badge { padding: 2px 5px; border: 1px solid #566571; color: #a5b5c1; font: 9px/1.5 Verdana, sans-serif; }\n#wholeWindow :is(button, a, input, select):focus-visible, #configButton:focus-visible, .rin-forum-button:focus-visible { outline: 2px solid #c1def1; outline-offset: 3px; }\n#wholeWindow[data-rin-preview=\"true\"] { background: #171d22; background-image: linear-gradient(#ffffff03 1px, transparent 1px); background-size: 100% 4px; }\n#configButton, .rin-forum-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-width: 40px; min-height: 38px; padding: 8px 10px; border: 1px solid #718491; border-radius: 3px; background: linear-gradient(#3b4b57, #26333d); color: #d8e7f1; box-shadow: 0 2px 8px #0006; font: 12px/1.3 Tahoma, Verdana, sans-serif; cursor: pointer; text-decoration: none; }\n#configButton { position: fixed; right: 16px; bottom: 16px; z-index: 2147482000; }\n#configButton:hover, .rin-forum-button:hover { border-color: #b6d1e3; background: #425867; color: #fff; }\n.rin-toolbar { position: fixed; right: 16px; bottom: 16px; z-index: 2147482000; display: flex; align-items: flex-end; gap: 7px; }\n.rin-toolbar #configButton, .rin-toolbar #rin-chat-toggle { position: static; margin: 0; }\n.rin-toolbar .rin-forum-button[aria-expanded=\"true\"] { border-color: #c6dfef; background: #4d6678; }\n@media (max-width: 640px) {\n    #wholeWindow { padding: 8px; }\n    #wholeWindow #configWindow { max-height: calc(100dvh - 16px); }\n    #wholeWindow .rin-settings-header { padding: 14px; }\n    #wholeWindow .rin-masterbar, #wholeWindow .rin-settings-footer { padding: 11px 14px; }\n    #wholeWindow .rin-settings-panel { padding: 13px 10px 17px; }\n    #wholeWindow .rin-settings-nav { padding: 0 4px; }\n    #wholeWindow .rin-settings-nav button { gap: 0; padding: 10px; font-size: 11px; }\n    #wholeWindow .rin-tab-number { display: none; }\n    #wholeWindow .rin-setting { gap: 5px 12px; padding: 10px; }\n    #wholeWindow .rin-setting > select { width: 46%; font-size: 11px; }\n    #wholeWindow .rin-config-status { padding: 7px 14px; }\n    #wholeWindow #rin-preview-badge { display: none; }\n}\n@media (max-width: 390px) {\n    #wholeWindow .rin-setting:has(> select) { align-items: stretch; flex-direction: column; gap: 7px; }\n    #wholeWindow .rin-setting > select { width: 100%; max-width: none; }\n    #wholeWindow .rin-help-link span { display: none; }\n    #wholeWindow .rin-language { width: 100%; justify-content: space-between; }\n}\n" };
}

function initializeConfigUI() {
    (function () {
        'use strict';
        if (window.RinEnhancedConfig?.version === 1) { window.RinEnhancedConfig.init(); return; }
        const I18N = {
        "en": {
            "settings": "Settings",
            "close": "Close",
            "script_enabled": "Enable enhancements",
            "ui_language": "Language",
            "language_auto": "Forum language",
            "login_note": "Sign in to the forum to use account features.",
            "sections": "Settings sections",
            "help": "Help & discussion",
            "help_title": "Open the CS.RIN.RU Enhanced forum topic",
            "preview_badge": "Local preview",
            "cancel": "Cancel",
            "save": "Save changes",
            "settings_button": "Enhanced settings",
            "ready": "Changes apply after saving.",
            "changed": "Unsaved changes. Saving will reload the forum page.",
            "preview_ready": "Preview only. Your forum settings are not changed.",
            "preview_changed": "Unsaved changes in this local preview.",
            "preview_saved": "Preview settings saved on this device.",
            "saving": "Saving settings…",
            "invalid": "Check the highlighted value before saving.",
            "storage_error": "This browser could not save the local preview.",
            "script_paused": "Enhancements will be paused after saving.",
            "signin_required": "Sign in to the forum to use this option.",
            "dynamic_required": "Enable live forum updates to use this option.",
            "general": "General",
            "general_heading": "Browsing & updates",
            "general_intro": "Keep the familiar forum, with a few useful improvements.",
            "reading": "Reading",
            "reading_heading": "Topics & links",
            "reading_intro": "Choose where links lead and how posts are displayed.",
            "replies": "Replies",
            "replies_heading": "Writing replies",
            "replies_intro": "Useful shortcuts that keep standard forum formatting.",
            "community": "Community",
            "community_heading": "People & messages",
            "community_intro": "Account features are available while you are signed in.",
            "search": "Search",
            "search_heading": "Search defaults",
            "search_intro": "Set the starting options for the enhanced search bar.",
            "infinite_scrolling": "Infinite scrolling",
            "infinite_scrolling_help": "Load the next page as you reach the bottom.",
            "dynamic_function": "Live forum updates",
            "dynamic_function_help": "Refresh messages, online users and forum time every minute.",
            "dynamic_content": "Live topic content",
            "dynamic_content_help": "Refresh topic content while live forum updates are enabled.",
            "colorize_the_page": "Add color to forum elements",
            "custom_tags": "Color topic tags",
            "display_ajax_loader": "Show loading indicators",
            "title_format": "Browser tab title",
            "title_format_help": "%C forum · %S section · %T topic title · %RT title without tags",
            "change_topic_link": "Open topic titles at",
            "change_topic_link_0": "First post",
            "change_topic_link_1": "First unread post",
            "change_topic_link_2": "Last post",
            "steam_db_link": "Add missing SteamDB links",
            "steam_db_link_help": "Keep links already provided by the forum.",
            "copy_link_button": "Copy post link button",
            "full_path_post_links": "Include forum and topic in post links",
            "full_path_post_links_help": "Keep the topic context when sharing a post.",
            "collapse_quotes": "Collapse quotes by default",
            "show_all_spoilers": "Open all spoilers",
            "topic_preview": "Preview topics on hover",
            "topic_preview_option": "Topic preview opens at",
            "topic_preview_option_0": "First post",
            "topic_preview_option_1": "First unread post",
            "topic_preview_option_2": "Last post",
            "post_preview": "Preview individual posts",
            "profile_preview": "Preview user profiles",
            "topic_preview_timeout": "Preview delay (seconds)",
            "topic_preview_timeout_help": "Applies to topic, post and profile previews.",
            "hide_scs": "SCS topic filter",
            "hide_scs_0": "Show all topics",
            "hide_scs_1": "Hide all marked topics",
            "hide_scs_2": "Hide green topics",
            "hide_scs_3": "Show only red topics",
            "apply_in_scs": "Also filter inside Steam Content Sharing",
            "mentioning": "Mentioning",
            "mentioning_help": "BBCode supported. %m = username, %u = profile URL, %p = post URL. Leave empty to disable mentions.",
            "add_link_quote": "Link quote authors to their posts",
            "add_link_quote_help": "Include a source link in valid quote BBCode.",
            "quick_reply": "Floating quick reply panel",
            "quick_reply_help": "Requires quick reply to be enabled in your forum preferences.",
            "friend_buttons": "Friend buttons beside usernames",
            "colorize_friends_me": "Highlight usernames",
            "colorize_friends_me_0": "No highlighting",
            "colorize_friends_me_1": "My username",
            "colorize_friends_me_2": "My friends",
            "colorize_friends_me_3": "My username and friends",
            "add_profile_button": "Shortcut to my profile",
            "colorize_new_messages": "Highlight new private messages",
            "add_small_shoutbox": "Compact chat panel",
            "add_users_tag": "Show Steam user tags",
            "special_search": "Enable enhanced search",
            "searchTermsSpecificity": "Match search terms",
            "searchTermsSpecificity_any": "Any term",
            "searchTermsSpecificity_all": "All terms",
            "searchSubforums": "Include subforums",
            "searchTopicLocation": "Search within",
            "searchTopicLocation_all": "Subjects and message text",
            "searchTopicLocation_msgonly": "Message text only",
            "searchTopicLocation_titleonly": "Topic titles only",
            "searchTopicLocation_firstpost": "First posts only",
            "sortResultsBy": "Sort results by",
            "sortResultsBy_a": "Author",
            "sortResultsBy_t": "Post time",
            "sortResultsBy_f": "Forum",
            "sortResultsBy_i": "Topic title",
            "sortResultsBy_s": "Post subject",
            "sortOrderBy": "Sort order",
            "sortOrderBy_a": "Ascending",
            "sortOrderBy_d": "Descending",
            "showResultsAsPosts": "Display results as posts",
            "limitToPrevious": "Only the last (days)",
            "limitToPrevious_help": "0 = no time limit",
            "returnFirst": "Post excerpt length (characters)",
            "returnFirst_help": "−1 = complete post",
            "showFriends": "Suggest friends in author search"
        },
        "ru": {
            "settings": "Настройки",
            "close": "Закрыть",
            "script_enabled": "Включить улучшения",
            "ui_language": "Язык",
            "language_auto": "Язык форума",
            "login_note": "Войдите на форум, чтобы использовать функции аккаунта.",
            "sections": "Разделы настроек",
            "help": "Помощь и обсуждение",
            "help_title": "Открыть тему CS.RIN.RU Enhanced на форуме",
            "preview_badge": "Локальный просмотр",
            "cancel": "Отмена",
            "save": "Сохранить изменения",
            "settings_button": "Настройки Enhanced",
            "ready": "Изменения применятся после сохранения.",
            "changed": "Есть несохранённые изменения. После сохранения страница форума обновится.",
            "preview_ready": "Предварительный просмотр. Настройки форума не изменяются.",
            "preview_changed": "Есть несохранённые изменения в локальном просмотре.",
            "preview_saved": "Настройки просмотра сохранены на этом устройстве.",
            "saving": "Сохранение настроек…",
            "invalid": "Перед сохранением проверьте выделенное значение.",
            "storage_error": "Браузер не смог сохранить настройки локального просмотра.",
            "script_paused": "После сохранения улучшения будут приостановлены.",
            "signin_required": "Войдите на форум, чтобы использовать эту настройку.",
            "dynamic_required": "Сначала включите обновление данных форума.",
            "general": "Основное",
            "general_heading": "Просмотр и обновления",
            "general_intro": "Привычный форум с полезными дополнениями.",
            "reading": "Чтение",
            "reading_heading": "Темы и ссылки",
            "reading_intro": "Выберите, куда ведут ссылки и как отображаются сообщения.",
            "replies": "Ответы",
            "replies_heading": "Написание ответов",
            "replies_intro": "Удобные действия со стандартным форматированием форума.",
            "community": "Общение",
            "community_heading": "Пользователи и сообщения",
            "community_intro": "Функции аккаунта доступны после входа на форум.",
            "search": "Поиск",
            "search_heading": "Параметры поиска",
            "search_intro": "Начальные настройки расширенной строки поиска.",
            "infinite_scrolling": "Бесконечная прокрутка",
            "infinite_scrolling_help": "Загружать следующую страницу при прокрутке вниз.",
            "dynamic_function": "Обновление данных форума",
            "dynamic_function_help": "Обновлять личные сообщения, список пользователей и время каждую минуту.",
            "dynamic_content": "Обновление содержимого темы",
            "dynamic_content_help": "Обновлять тему, когда включено обновление данных форума.",
            "colorize_the_page": "Цветовое оформление элементов форума",
            "custom_tags": "Цветные метки тем",
            "display_ajax_loader": "Показывать индикаторы загрузки",
            "title_format": "Заголовок вкладки браузера",
            "title_format_help": "%C форум · %S раздел · %T название темы · %RT название без меток",
            "change_topic_link": "При открытии темы переходить к",
            "change_topic_link_0": "Первому сообщению",
            "change_topic_link_1": "Первому непрочитанному",
            "change_topic_link_2": "Последнему сообщению",
            "steam_db_link": "Добавлять отсутствующие ссылки SteamDB",
            "steam_db_link_help": "Сохранять ссылки, уже добавленные форумом.",
            "copy_link_button": "Кнопка копирования ссылки на сообщение",
            "full_path_post_links": "Указывать форум и тему в ссылках на сообщения",
            "full_path_post_links_help": "Сохранять контекст темы при отправке ссылки.",
            "collapse_quotes": "Сворачивать цитаты по умолчанию",
            "show_all_spoilers": "Раскрывать все спойлеры",
            "topic_preview": "Предпросмотр тем при наведении",
            "topic_preview_option": "В предпросмотре темы показывать",
            "topic_preview_option_0": "Первое сообщение",
            "topic_preview_option_1": "Первое непрочитанное",
            "topic_preview_option_2": "Последнее сообщение",
            "post_preview": "Предпросмотр отдельных сообщений",
            "profile_preview": "Предпросмотр профилей пользователей",
            "topic_preview_timeout": "Задержка предпросмотра (секунды)",
            "topic_preview_timeout_help": "Для предпросмотра тем, сообщений и профилей.",
            "hide_scs": "Фильтр тем SCS",
            "hide_scs_0": "Показывать все темы",
            "hide_scs_1": "Скрывать все отмеченные темы",
            "hide_scs_2": "Скрывать зелёные темы",
            "hide_scs_3": "Только красные темы",
            "apply_in_scs": "Применять фильтр также в Steam Content Sharing",
            "mentioning": "Упоминание",
            "mentioning_help": "Поддерживается BBCode. %m — имя пользователя, %u — ссылка на профиль, %p — ссылка на сообщение. Оставьте поле пустым, чтобы отключить упоминания.",
            "add_link_quote": "Ссылка на сообщение в имени автора цитаты",
            "add_link_quote_help": "Добавлять ссылку на источник с корректным BBCode цитаты.",
            "quick_reply": "Плавающая панель быстрого ответа",
            "quick_reply_help": "Быстрый ответ должен быть включён в настройках форума.",
            "friend_buttons": "Кнопки друзей рядом с именами",
            "colorize_friends_me": "Выделять имена пользователей",
            "colorize_friends_me_0": "Не выделять",
            "colorize_friends_me_1": "Моё имя",
            "colorize_friends_me_2": "Моих друзей",
            "colorize_friends_me_3": "Моё имя и моих друзей",
            "add_profile_button": "Кнопка перехода в мой профиль",
            "colorize_new_messages": "Выделять новые личные сообщения",
            "add_small_shoutbox": "Компактная панель чата",
            "add_users_tag": "Показывать пользовательские метки Steam",
            "special_search": "Включить расширенный поиск",
            "searchTermsSpecificity": "Совпадение поисковых слов",
            "searchTermsSpecificity_any": "Любое слово",
            "searchTermsSpecificity_all": "Все слова",
            "searchSubforums": "Искать также в подфорумах",
            "searchTopicLocation": "Область поиска",
            "searchTopicLocation_all": "Заголовки и текст сообщений",
            "searchTopicLocation_msgonly": "Только текст сообщений",
            "searchTopicLocation_titleonly": "Только названия тем",
            "searchTopicLocation_firstpost": "Только первые сообщения",
            "sortResultsBy": "Сортировать результаты по",
            "sortResultsBy_a": "Автору",
            "sortResultsBy_t": "Времени сообщения",
            "sortResultsBy_f": "Форуму",
            "sortResultsBy_i": "Названию темы",
            "sortResultsBy_s": "Заголовку сообщения",
            "sortOrderBy": "Порядок сортировки",
            "sortOrderBy_a": "Возрастанию",
            "sortOrderBy_d": "Убыванию",
            "showResultsAsPosts": "Показывать результаты как сообщения",
            "limitToPrevious": "Только за последние (дни)",
            "limitToPrevious_help": "0 — без ограничения по времени",
            "returnFirst": "Длина фрагмента сообщения (символы)",
            "returnFirst_help": "−1 — сообщение целиком",
            "showFriends": "Предлагать друзей при поиске по автору"
        }
    };

        const PREVIEW_STORAGE_KEY = 'rin-enhanced:config-preview:v1';
        const DEFAULTS = {
            script_enabled: true, ui_language: 'auto', infinite_scrolling: true,
            mentioning: '[b][url=%u]%m[/url][/b], [url=%p]post[/url]',
            steam_db_link: true, copy_link_button: true, full_path_post_links: true,
            dynamic_function: true, dynamic_content: true, friend_buttons: true,
            add_profile_button: true, colorize_new_messages: true, colorize_the_page: true,
            display_ajax_loader: true, custom_tags: true, add_small_shoutbox: true,
            add_users_tag: true, show_all_spoilers: false, add_link_quote: true,
            quick_reply: true, collapse_quotes: false, colorize_friends_me: 3, change_topic_link: 0,
            topic_preview: false, topic_preview_option: 0, topic_preview_timeout: 5,
            post_preview: false, profile_preview: false, special_search: true,
            hide_scs: 0, apply_in_scs: false, title_format: '%C %S - %T',
            special_search_parameter: {
                searchTermsSpecificity: 'any', searchSubforums: true, sortResultsBy: 't',
                sortOrderBy: 'd', searchTopicLocation: 'titleonly', showResultsAsPosts: false,
                limitToPrevious: 0, returnFirst: 300, showFriends: true
            }
        };
        let root, dialog, trigger, controller, languageObserver, baseline, savedOptions;
        let preview = false, connected = false, opener = null, originalOverflow = '';
        let statusKey = null;

        function control(id) { return root?.querySelector('#' + id); }

        function isPreview() {
            return root.dataset.rinInjected !== 'true' &&
                (window.location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));
        }

        function detectConnection() {
            if (preview) return true;
            if (root.dataset.rinConnected !== undefined) return root.dataset.rinConnected === 'true';
            return Array.from(document.querySelectorAll('a[href]')).some(link => {
                if (root.contains(link)) return false;
                try {
                    const url = new URL(link.getAttribute('href'), window.location.href);
                    return url.origin === window.location.origin && /\/ucp\.php$/.test(url.pathname) &&
                        url.searchParams.get('mode') === 'logout';
                } catch { return false; }
            });
        }

        function resolveLanguage() {
            const preference = control('ui_language')?.value || 'auto';
            if (preference === 'ru' || preference === 'en') return preference;
            const forumLanguage = document.documentElement.getAttribute('lang') ||
                document.documentElement.getAttribute('xml:lang') ||
                document.documentElement.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang') ||
                root?.dataset.rinLanguage || 'en';
            return /^ru(?:[-_]|$)/i.test(forumLanguage) ? 'ru' : 'en';
        }

        function translate(key) { return I18N[resolveLanguage()][key] || I18N.en[key] || key; }

        function applyLanguage() {
            root.lang = resolveLanguage();
            root.querySelectorAll('[data-i18n]').forEach(element => {
                element.textContent = translate(element.dataset.i18n);
            });
            root.querySelectorAll('[data-i18n-title]').forEach(element => {
                element.title = translate(element.dataset.i18nTitle);
            });
            root.querySelectorAll('[data-i18n-aria]').forEach(element => {
                element.setAttribute('aria-label', translate(element.dataset.i18nAria));
            });
            if (trigger) {
                trigger.title = translate('settings_button');
                trigger.setAttribute('aria-label', translate('settings_button'));
            }
            updateDependencies();
        }

        function readOptions() {
            const values = { special_search_parameter: {} };
            root.querySelectorAll('[data-option], [data-search-option]').forEach(input => {
                const value = input.type === 'checkbox' ? input.checked :
                    input.type === 'number' || input.dataset.valueType === 'number' ? Number(input.value) : input.value;
                const target = input.hasAttribute('data-search-option') ? values.special_search_parameter : values;
                target[input.id] = value;
            });
            return values;
        }

        function writeOptions(settings) {
            root.querySelectorAll('[data-option], [data-search-option]').forEach(input => {
                const values = input.hasAttribute('data-search-option') ? settings.special_search_parameter : settings;
                const fallback = input.hasAttribute('data-search-option') ? DEFAULTS.special_search_parameter : DEFAULTS;
                let value = values?.[input.id] ?? fallback[input.id];
                if (input.type === 'checkbox') input.checked = Boolean(value);
                else {
                    if (input.type === 'number' && !Number.isFinite(Number(value))) value = fallback[input.id];
                    input.value = value === undefined ? '' : String(value);
                    if (input.tagName === 'SELECT' && input.selectedIndex < 0) input.value = String(fallback[input.id]);
                }
                input.setAttribute('data-originalValue', input.type === 'checkbox' ? String(input.checked) : input.value);
            });
        }

        function setOptions(settings = {}) {
            if (!root) init();
            if (!root) return;
            savedOptions = { ...DEFAULTS, ...settings,
                special_search_parameter: { ...DEFAULTS.special_search_parameter, ...settings.special_search_parameter } };
            writeOptions(savedOptions);
            baseline = readOptions();
            statusKey = null;
            applyLanguage();
            updateStatus();
        }

        function getChanges() {
            if (!root || !baseline) return {};
            const current = readOptions();
            const changes = {};
            for (const [key, value] of Object.entries(current)) {
                if (key === 'special_search_parameter') {
                    const nested = {};
                    for (const [name, setting] of Object.entries(value)) {
                        if (setting !== baseline[key]?.[name]) nested[name] = setting;
                    }
                    if (Object.keys(nested).length) changes[key] = nested;
                } else if (value !== baseline[key]) changes[key] = value;
            }
            return changes;
        }

        function updateDependencies() {
            connected = detectConnection();
            control('rin-login-note').hidden = connected;
            root.querySelectorAll('[data-option], [data-search-option]').forEach(input => {
                const needsAccount = input.getAttribute('need-connected') === 'true' && !connected;
                const needsDynamic = input.id === 'dynamic_content' && !control('dynamic_function').checked;
                input.disabled = needsAccount || needsDynamic;
                const row = input.closest('.rin-setting');
                if (row) row.dataset.rinDisabled = String(input.disabled);
                const hint = input.getAttribute('aria-describedby');
                input.title = needsAccount ? translate('signin_required') : needsDynamic ? translate('dynamic_required') :
                    hint ? control(hint)?.textContent || '' : '';
            });
        }

        function updateStatus() {
            if (!root || !baseline) return;
            const changed = Object.keys(getChanges()).length > 0;
            const message = control('messages');
            message.dataset.state = statusKey === 'invalid' || statusKey === 'storage_error' ? 'error' : changed ? 'changed' : 'ready';
            message.textContent = translate(statusKey || (changed ? preview ? 'preview_changed' : 'changed' : preview ? 'preview_ready' : 'ready'));
            control('rin-config-save').disabled = !changed;
        }

        function selectPanel(id, focus = false) {
            root.querySelectorAll('[data-panel]').forEach(tab => {
                const selected = tab.dataset.panel === id;
                tab.setAttribute('aria-selected', String(selected));
                tab.tabIndex = selected ? 0 : -1;
                control('rin-panel-' + tab.dataset.panel).hidden = !selected;
                if (selected && focus) tab.focus();
            });
            control('rin-config-form').scrollTop = 0;
        }

        function open() {
            if (!root) init();
            if (!root || !root.hidden) return;
            opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : trigger;
            originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            root.hidden = false;
            trigger?.setAttribute('aria-expanded', 'true');
            statusKey = null;
            applyLanguage();
            updateStatus();
            control('rin-config-close').focus();
        }

        function close(restore = true) {
            if (!root || root.hidden) return;
            if (restore && baseline) {
                writeOptions(baseline);
                statusKey = null;
                applyLanguage();
                updateStatus();
            }
            root.hidden = true;
            document.body.style.overflow = originalOverflow;
            trigger?.setAttribute('aria-expanded', 'false');
            if (opener?.isConnected) opener.focus();
        }

        function focusableElements() {
            return Array.from(dialog.querySelectorAll('a[href], button, input, select, [tabindex]'))
                .filter(element => !element.disabled && element.tabIndex >= 0 && !element.closest('[hidden]'));
        }

        function onKeydown(event) {
            if (root.hidden) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close();
            } else if (event.key === 'Tab') {
                const elements = focusableElements();
                const first = elements[0], last = elements[elements.length - 1];
                if (!first) { event.preventDefault(); dialog.focus(); return; }
                if (!dialog.contains(document.activeElement) || event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        }

        function save(event) {
            event?.preventDefault();
            const invalid = Array.from(root.querySelectorAll('input[type="number"]')).find(input => !input.disabled && !input.checkValidity());
            if (invalid) {
                statusKey = 'invalid';
                selectPanel(invalid.closest('[role="tabpanel"]').id.replace('rin-panel-', ''));
                invalid.focus();
                updateStatus();
                return;
            }
            const changes = getChanges();
            if (!Object.keys(changes).length) return;
            const current = readOptions();
            if (preview) {
                try { window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(current)); }
                catch {
                    statusKey = 'storage_error';
                    updateStatus();
                    return;
                }
                savedOptions = current;
                baseline = current;
                statusKey = 'preview_saved';
                updateStatus();
            } else {
                window.postMessage({ type: 'rin-enhanced:config', options: changes }, window.location.origin);
                savedOptions = current;
                baseline = current;
                statusKey = 'saving';
                updateStatus();
                close(false);
            }
        }

        function init(settings) {
            const nextRoot = document.getElementById('wholeWindow');
            if (!nextRoot) return api;
            if (root === nextRoot && controller) {
                if (settings) setOptions(settings);
                return api;
            }
            controller?.abort();
            languageObserver?.disconnect();
            root = nextRoot;
            dialog = control('configWindow');
            trigger = document.getElementById('configButton');
            controller = new window.AbortController();
            const listenerOptions = { signal: controller.signal };
            preview = isPreview();
            root.dataset.rinPreview = String(preview);
            root.dataset.rinConfigReady = 'true';
            control('rin-preview-badge').hidden = !preview;
            root.querySelectorAll('input[type="number"]').forEach(input => { input.required = true; });
            trigger?.addEventListener('click', open, listenerOptions);
            control('rin-config-close').addEventListener('click', () => close(), listenerOptions);
            control('rin-config-cancel').addEventListener('click', () => close(), listenerOptions);
            control('rin-config-form').addEventListener('submit', save, listenerOptions);
            root.addEventListener('click', event => { if (event.target === root) close(); }, listenerOptions);
            document.addEventListener('keydown', onKeydown, listenerOptions);
            root.querySelectorAll('[data-panel]').forEach(tab => {
                tab.addEventListener('click', () => selectPanel(tab.dataset.panel), listenerOptions);
                tab.addEventListener('keydown', event => {
                    const tabs = Array.from(root.querySelectorAll('[data-panel]'));
                    const index = tabs.indexOf(tab);
                    let next;
                    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
                    if (event.key === 'Home') next = 0;
                    if (event.key === 'End') next = tabs.length - 1;
                    if (next !== undefined) { event.preventDefault(); selectPanel(tabs[next].dataset.panel, true); }
                }, listenerOptions);
            });
            const onInput = event => {
                if (!event.target.matches('[data-option], [data-search-option]')) return;
                statusKey = null;
                if (event.target.id === 'ui_language') applyLanguage();
                updateDependencies();
                updateStatus();
            };
            root.addEventListener('input', onInput, listenerOptions);
            root.addEventListener('change', onInput, listenerOptions);
            languageObserver = new window.MutationObserver(() => {
                if (control('ui_language').value === 'auto') { applyLanguage(); updateStatus(); }
            });
            languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'xml:lang'] });
            languageObserver.observe(root, { attributes: true, attributeFilter: ['data-rin-language', 'data-rin-connected'] });
            let initial = settings;
            if (!initial && preview) {
                try { initial = JSON.parse(window.localStorage.getItem(PREVIEW_STORAGE_KEY) || 'null'); } catch { initial = null; }
            }
            setOptions(initial && typeof initial === 'object' ? initial : {});
            if (preview) open();
            return api;
        }

        const api = { version: 1, init, setOptions, open, close: () => close(), getValues: readOptions,
            getChanges, getLanguage: resolveLanguage, translate };
        window.RinEnhancedConfig = api;
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
        else init();
    })();

}

/* exported addFriendButtons, updateDynamicContent */
// Native phpBB friend actions display confirm_box before changing the account.
// https://github.com/phpbb/phpbb/blob/3.0.x/phpBB/includes/ucp/ucp_zebra.php
function rinLiveNativeUrl(href, filename) {
    try {
        const base = new URL(FORUM_BASE_URL);
        const url = new URL(href, base);
        return url.origin === base.origin && url.pathname === `${base.pathname}${filename}` &&
            !url.username && !url.password ? url : null;
    } catch {
        return null;
    }
}

function addFriendButtons(root = document) {
    if (!options.friend_buttons || !CONNECTED) return;
    const cleanName = name => String(name).trim().normalize('NFKC').toLowerCase();
    const friends = new Set(FRIENDS_LIST.map(cleanName));
    const authors = Array.from(root.querySelectorAll('.postauthor'));
    if (root.matches?.('.postauthor')) authors.unshift(root);
    for (const author of authors) {
        if (author.closest('.postbody, .quotecontent, .signature')) continue;
        const name = author.textContent.trim();
        if (!name || cleanName(name) === cleanName(USERNAME)) continue;
        const post = author.closest('table.tablebg, .post');
        if (!post) continue;
        const profile = Array.from(post.querySelectorAll('a[href]')).find(link => {
            if (link.closest('.postbody, .quotecontent, .signature')) return false;
            const url = rinLiveNativeUrl(link.getAttribute('href'), 'memberlist.php');
            return url?.searchParams.get('mode') === 'viewprofile' &&
                /^[1-9]\d*$/.test(url.searchParams.get('u')) && url.searchParams.get('u') !== '1';
        });
        if (!profile) continue;
        const profileUrl = rinLiveNativeUrl(profile.getAttribute('href'), 'memberlist.php');
        const userId = profileUrl.searchParams.get('u');
        const isFriend = friends.has(cleanName(name));
        const url = new URL('ucp.php', FORUM_BASE_URL);
        url.searchParams.set('i', 'zebra');
        url.searchParams.set('mode', 'friends');
        if (isFriend) {
            url.searchParams.set('remove', '1');
            url.searchParams.set('usernames[]', userId);
        } else {
            url.searchParams.set('add', name);
        }
        // Preserve SID-based sessions without copying unrelated profile parameters.
        if (profileUrl.searchParams.has('sid')) url.searchParams.set('sid', profileUrl.searchParams.get('sid'));
        let button = author.parentElement.querySelector('.rin-friend-button');
        if (!button) {
            button = author.ownerDocument.createElement('a');
            button.className = 'rin-friend-button gensmall';
            button.style.marginLeft = '0.5em';
            button.target = '_blank';
            button.rel = 'noopener';
            author.after(button);
        }
        button.href = url.href;
        button.textContent = rinText(isFriend ? 'Remove friend' : 'Add friend');
        button.setAttribute('aria-label', rinText(isFriend ? 'Remove {name} from friends' : 'Add {name} as a friend', { name }));
    }
}

function rinLiveIdentity(page, currentUrl) {
    const filename = currentUrl.pathname.split('/').pop();
    if (!['viewtopic.php', 'viewforum.php'].includes(filename)) return null;
    const key = filename === 'viewtopic.php' ? 't' : 'f';
    const candidates = Array.from(page.querySelectorAll('#pageheader a.titles[href]'))
        .filter(link => !link.closest('.postbody, .signature, #topic_preview'))
        .map(link => link.getAttribute('href'));
    for (const script of page.querySelectorAll('script:not([src])')) {
        if (script.closest('.postbody, .signature, #topic_preview')) continue;
        const match = script.textContent.match(/\bvar\s+base_url\s*=\s*(['"])(.*?)\1/);
        if (match) candidates.push(match[2].replace(/&amp;/g, '&'));
    }
    if (page === document) candidates.push(currentUrl.href);
    if (page.rinSourceUrl) candidates.push(page.rinSourceUrl);
    for (const href of candidates) {
        const url = rinLiveNativeUrl(href, filename);
        if (url && /^[1-9]\d*$/.test(url.searchParams.get(key))) return { filename, id: url.searchParams.get(key) };
    }
    return null;
}

function rinLiveSort(page, url, topic) {
    const defaults = { sk: 't', sd: topic ? 'a' : 'd', st: '0' };
    return Object.keys(defaults).map(name => {
        const field = Array.from(page.querySelectorAll(`select[name="${name}"]`))
            .find(select => !select.closest('.postbody, .signature, #topic_preview'));
        return field?.value || url.searchParams.get(name) || defaults[name];
    }).join('|');
}

function rinLiveItems(page, topic) {
    if (topic) {
        return Array.from(page.querySelectorAll('#pagecontent > table.tablebg')).map(node => {
            // Ignored-user placeholders still carry a native post anchor, but no .postbody.
            const anchor = Array.from(node.querySelectorAll('a[name], a[id]')).find(link =>
                !link.closest('.postbody, .quotecontent, .signature') && /^p[1-9]\d*$/.test(link.name || link.id));
            return anchor ? { id: (anchor.name || anchor.id).slice(1), node } : null;
        }).filter(Boolean);
    }
    const seen = new Set();
    return Array.from(page.querySelectorAll('#pagecontent a.topictitle[href]')).map(link => {
        if (link.closest('.postbody, .signature, #topic_preview')) return null;
        const url = rinLiveNativeUrl(link.getAttribute('href'), 'viewtopic.php');
        const id = url?.searchParams.get('t');
        const node = link.closest('tr');
        if (!node || !/^[1-9]\d*$/.test(id) || seen.has(id) || Array.from(node.cells).some(cell => cell.classList.contains('cat'))) return null;
        seen.add(id);
        return { id, node };
    }).filter(Boolean);
}

function rinLiveSection(row) {
    let previous = row.previousElementSibling;
    while (previous) {
        if (!previous.querySelector('a.topictitle') && previous.querySelector('th, td.cat, td.row3[colspan]')) return previous;
        previous = previous.previousElementSibling;
    }
    return row.parentElement;
}

function rinLiveNotice(href, text) {
    const content = document.getElementById('pagecontent');
    if (!content) return;
    let notice = document.getElementById('rin-live-content-notice');
    if (!notice) {
        notice = document.createElement('p');
        notice.id = 'rin-live-content-notice';
        notice.className = 'gensmall';
        content.appendChild(notice);
    }
    const link = document.createElement('a');
    link.href = href;
    link.textContent = rinText(text);
    notice.replaceChildren(link);
}

function rinLiveRegisterItem(state, page, node, id, topic) {
    if (!state) return;
    if (page?.items && !page.items.includes(node)) page.items.push(node);
    const key = typeof contentItemKey === 'function' ? contentItemKey(node) : `${topic ? 'post' : 'topic'}:${id}`;
    state.keys?.add(key);
}

function updateDynamicContent(page) {
    if (!options.dynamic_function || !options.dynamic_content || !page?.querySelectorAll) return;
    const currentUrl = new URL(window.location.href);
    const identity = rinLiveIdentity(document, currentUrl);
    const incomingIdentity = rinLiveIdentity(page, currentUrl);
    if (!identity || !incomingIdentity || identity.filename !== incomingIdentity.filename || identity.id !== incomingIdentity.id) return;
    const topic = identity.filename === 'viewtopic.php';
    const sourceUrl = page.rinSourceUrl ? rinLiveNativeUrl(page.rinSourceUrl, identity.filename) : currentUrl;
    if (!sourceUrl || rinLiveSort(document, currentUrl, topic) !== rinLiveSort(page, sourceUrl, topic)) return;
    const currentPagination = getPagination(document, currentUrl.href);
    const pagination = getPagination(page, sourceUrl.href);
    const pageNumber = pagination?.current || 1;
    const state = typeof rinPaginationState === 'undefined' ? null : rinPaginationState;
    const knownPage = state?.pages?.get(pageNumber);
    if (state?.pages?.size ? !knownPage : pageNumber !== (currentPagination?.current || 1)) return;
    const existing = rinLiveItems(document, topic);
    const incoming = rinLiveItems(page, topic);
    if (!existing.length || !incoming.length) return;
    const byId = new Map(existing.map(item => [item.id, item.node]));
    const missing = incoming.filter(item => !byId.has(item.id));
    const anchor = existing.find(item => item.node.getBoundingClientRect().bottom > 0)?.node;
    const anchorTop = anchor?.getBoundingClientRect().top;
    let added = 0;

    if (topic) {
        // A refresh of an earlier page must never splice posts behind pages loaded by scrolling.
        if (state?.pages?.size && pageNumber !== state.max) return;
        const lastKnown = incoming.findLastIndex(item => byId.has(item.id));
        const suffix = incoming.slice(lastKnown + 1);
        const ordered = lastKnown >= 0 && incoming.slice(0, lastKnown + 1).every(item => byId.has(item.id)) &&
            incoming[lastKnown].id === existing[existing.length - 1].id &&
            suffix.every(item => BigInt(item.id) > BigInt(incoming[lastKnown].id));
        if (missing.length && (!ordered || rinLiveSort(page, sourceUrl, true).split('|')[1] !== 'a')) {
            rinLiveNotice(currentUrl.href, 'New posts are available. Reload this page.');
            return;
        }
        let after = existing[existing.length - 1].node;
        for (const item of suffix) {
            const node = document.importNode(item.node, true);
            node.dataset.rinPage = String(pageNumber);
            after.after(node);
            after = node;
            rinLiveRegisterItem(state, knownPage, node, item.id, true);
            enhanceContent(node, page);
            added++;
        }
        const next = Array.from(pagination?.links || []).filter(([number]) => number > pageNumber).sort((a, b) => a[0] - b[0])[0];
        const currentNext = Array.from(currentPagination?.links || []).some(([number]) => number > pageNumber);
        if (next && (!currentNext || added)) {
            const nextUrl = rinLiveNativeUrl(next[1], identity.filename);
            if (nextUrl?.searchParams.get('t') === identity.id) rinLiveNotice(nextUrl.href, 'More posts are available on the next page.');
        }
        if (knownPage && pagination) {
            knownPage.pagination = pagination;
            if (next) state.exhaustedAfter = false;
        }
    } else {
        // Ranked forum lists shift between pages. Only insert on page one, keeping every existing row.
        if (pageNumber !== 1) return;
        for (let i = incoming.length - 1; i >= 0; i--) {
            const item = incoming[i];
            if (byId.has(item.id)) continue;
            const section = rinLiveSection(item.node);
            const canAnchor = candidate => candidate.node.parentElement === item.node.parentElement &&
                rinLiveSection(candidate.node) === section && byId.has(candidate.id);
            const following = incoming.slice(i + 1).find(canAnchor);
            const preceding = incoming.slice(0, i).reverse().find(canAnchor);
            if (!following && !preceding) continue;
            const node = document.importNode(item.node, true);
            node.dataset.rinPage = '1';
            if (following) byId.get(following.id).before(node);
            else byId.get(preceding.id).after(node);
            byId.set(item.id, node);
            rinLiveRegisterItem(state, knownPage, node, item.id, false);
            enhanceContent(node, page);
            added++;
        }
    }
    if (added && knownPage?.items) {
        // Infinite scrolling uses the first/last stored item as its insertion anchor.
        knownPage.items.sort((left, right) => left === right ? 0 : left.compareDocumentPosition(right) & 4 ? -1 : 1);
    }
    if (added && anchor?.isConnected) {
        const delta = anchor.getBoundingClientRect().top - anchorTop;
        if (delta) window.scrollBy(0, delta);
    }
}

/* exported setupQuoteExtras, applySelectedQuoteToEditor */
// Selection quoting and private-message history use local editor data only.
function selectedQuoteText(body, selection = window.getSelection()) {
    if (!body || !selection || selection.isCollapsed || selection.rangeCount !== 1) return '';
    const range = selection.getRangeAt(0);
    if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) return '';
    return selection.toString().trim();
}

function quoteAuthorAttribute(author) {
    return String(author).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
}

function buildSelectionQuote(text, author, postId = null) {
    const literal = text.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
    let quote = `[quote="${quoteAuthorAttribute(author)}"]${literal}[/quote]\n`;
    if (postId && options.add_link_quote) quote = addLinkToQuote(quote, postId);
    return quote;
}

function appendEditorQuote(editor, quote) {
    if (!editor || editor.disabled || editor.readOnly || !quote) return;
    editor.value += (editor.value && !editor.value.endsWith('\n') ? '\n\n' : '') + quote;
    editor.dispatchEvent(new editor.ownerDocument.defaultView.Event('input', { bubbles: true }));
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(editor.value.length, editor.value.length);
}

function findQuoteBody(link, action = quoteAction(link)) {
    if (action?.kind === 'pm') {
        const decoded = document.getElementById(`message_${action.id}`);
        if (decoded?.previousElementSibling?.matches('.postbody')) return decoded.previousElementSibling;
    }
    for (let parent = link.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (parent.matches('table.tablebg, .post, section')) {
            const body = parent.querySelector('.postbody');
            if (body) return body;
        }
    }
    return null;
}

function findQuoteAuthor(body, action) {
    if (action?.kind === 'pm') {
        const decoded = document.getElementById(`message_${action.id}`);
        const author = decoded?.closest('tr.row1, tr.row2')?.previousElementSibling?.querySelector('.postauthor');
        if (author) return author.textContent.trim();
    }
    return body.closest('table.tablebg, .post, section')?.querySelector('.postauthor')?.textContent.trim() || '';
}

function quoteAction(link) {
    try {
        const url = new URL(link.getAttribute('href'), FORUM_BASE_URL);
        const base = new URL(FORUM_BASE_URL);
        if (url.origin !== base.origin || url.username || url.password) return null;
        const id = url.searchParams.get('p');
        if (!/^[1-9]\d*$/.test(id)) return null;
        if (url.pathname === `${base.pathname}posting.php` && url.searchParams.get('mode') === 'quote') return { kind: 'post', id };
        if (url.pathname === `${base.pathname}ucp.php` && url.searchParams.get('i') === 'pm' &&
            url.searchParams.get('mode') === 'compose' && url.searchParams.get('action') === 'quote') return { kind: 'pm', id };
    } catch { /* Leave unknown native actions alone. */ }
    return null;
}

function setupQuoteExtras(root = document) {
    root.querySelectorAll('a[href]').forEach(link => {
        if (link.dataset.rinSelectionQuote || link.closest('.postbody, .signature, .quotecontent')) return;
        const action = quoteAction(link);
        const body = action && findQuoteBody(link, action);
        if (!body) return;
        link.dataset.rinSelectionQuote = 'true';
        let captured = '';
        link.addEventListener('pointerdown', () => { captured = selectedQuoteText(body); });
        link.addEventListener('click', event => {
            const text = selectedQuoteText(body) || captured;
            captured = '';
            if (!text || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const author = findQuoteAuthor(body, action);
            if (!author) return;
            const quote = buildSelectionQuote(text, author, action.kind === 'post' ? action.id : null);
            const editor = document.querySelector('#postform textarea[name="message"], form[name="postform"] textarea[name="message"]');
            if (editor) {
                if (editor.disabled || editor.readOnly) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                appendEditorQuote(editor, quote);
                return;
            }
            // One navigation only; never save a selection in persistent settings.
            try {
                window.sessionStorage.setItem('rin-enhanced:selected-quote', JSON.stringify({ ...action, quote, created: Date.now() }));
            } catch { /* A blocked storage API leaves the normal full-quote navigation working. */ }
        }, true);
    });
    setupPrivateMessageQuotes(root);
}

function applySelectedQuoteToEditor() {
    const action = quoteAction({ getAttribute: () => window.location.href });
    if (!action) return;
    let pending;
    try {
        pending = JSON.parse(window.sessionStorage.getItem('rin-enhanced:selected-quote'));
        window.sessionStorage.removeItem('rin-enhanced:selected-quote');
    } catch { return; }
    if (!pending || pending.id !== action.id || pending.kind !== action.kind ||
        typeof pending.quote !== 'string' || !Number.isFinite(pending.created) || Date.now() - pending.created > 300000) return;
    const editor = document.querySelector('textarea[name="message"]');
    if (!editor || document.querySelector('#preview, #post-preview, .error')) return;
    // Replace only the first complete server-generated quote, preserving anything after it.
    const source = editor.value;
    if (!/^\s*\[quote(?:=|\])/i.test(source)) return;
    let depth = 0;
    for (const match of source.matchAll(/\[(\/)?quote(?:=[^\]]*)?\]/gi)) {
        depth += match[1] ? -1 : 1;
        if (!depth) {
            editor.value = pending.quote + source.slice(match.index + match[0].length);
            return;
        }
    }
}

function setupPrivateMessageQuotes(root = document) {
    const current = new URL(window.location.href);
    if (!current.pathname.endsWith('/ucp.php') || current.searchParams.get('i') !== 'pm' ||
        current.searchParams.get('mode') !== 'compose') return;
    const editor = document.querySelector('textarea[name="message"]');
    if (!editor) return;
    root.querySelectorAll('[id^="message_"]').forEach(raw => {
        if (!/^message_[1-9]\d*$/.test(raw.id) || raw.dataset.rinPmQuote || raw.closest('.postbody, .quotecontent')) return;
        const row = raw.closest('tr.row1, tr.row2');
        const authorRow = row?.previousElementSibling;
        const author = authorRow?.querySelector('.postauthor')?.textContent.trim();
        if (!author || !raw.textContent.trim()) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rin-forum-button rin-pm-quote';
        button.textContent = rinText('Add quote to reply');
        button.addEventListener('click', () => {
            const selected = selectedQuoteText(raw.previousElementSibling);
            const quote = selected ? buildSelectionQuote(selected, author) :
                `[quote="${quoteAuthorAttribute(author)}"]${raw.textContent}[/quote]\n`;
            appendEditorQuote(editor, quote);
            button.textContent = rinText('Quoted!');
        });
        raw.dataset.rinPmQuote = 'true';
        raw.after(button);
    });
}

// END BUNDLED ASSETS
