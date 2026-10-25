// ==UserScript==
// @name            CS.RIN.RU Enhanced
// @name:fr         CS.RIN.RU Amélioré
// @name:pt         CS.RIN.RU Melhorado
// @name:ru         CS.RIN.RU Улучшенный
// @namespace       Royalgamer06
// @version         2.0.0-beta.11
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
    'Open full chat': 'Открыть полный чат', 'Retry': 'Повторить',
    'Chat is unavailable. Open the full chat to sign in or check your access.': 'Чат недоступен. Откройте полный чат, чтобы войти или проверить доступ.',
    'Unable to update chat. Retry or open the full chat.': 'Не удалось обновить чат. Повторите попытку или откройте полный чат.',
    'Unable to confirm the action. Check the full chat before trying again.': 'Не удалось подтвердить действие. Проверьте полный чат перед повторной попыткой.',
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
        loader = document.createElement('img');
        loader.id = 'ajaxload';
        loader.className = 'rin-loading';
        loader.src = getBundledImage('loading');
        loader.width = 40;
        loader.height = 40;
        loader.alt = rinText('Loading');
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-label', rinText('Loading'));
        const wrapper = document.createElement('div');
        wrapper.style.marginLeft = '50%';
        wrapper.append(loader);
        document.body.prepend(wrapper);
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
    image.src = getBundledImage(kind);
    image.width = 90;
    image.height = 20;
    image.alt = rinText(label);
    image.title = rinText(label);
    return image;
}

function showActionFeedback(anchor, message) {
    const tip = document.createElement('span');
    tip.className = 'rin-action-feedback';
    tip.textContent = rinText(message);
    document.body.append(tip);
    const rect = (anchor.querySelector('img') || anchor).getBoundingClientRect();
    const size = tip.getBoundingClientRect();
    tip.style.cssText = `position:absolute;left:${rect.left + window.scrollX + rect.width / 2 - size.width / 2 - 12}px;top:${rect.top + window.scrollY - size.height - 20}px;z-index:10001;`;
    setTimeout(() => tip.remove(), 2400);
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
        document.body.append(document.importNode(template.getElementById('configButton'), true));
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
    let pagination = null;
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
            if (links.size) {
                // The page counter can lead to an entire table row. Prefer the
                // smaller navigation cell/block containing its own current page.
                if (!pagination || (pagination.element !== element && pagination.element.contains(element))) {
                    pagination = { element, current: Number(strong.textContent.trim()), links };
                }
                break;
            }
        }
    }
    if (pagination?.element.matches('table, thead, tbody, tfoot, tr')) {
        const links = Array.from(pagination.element.querySelectorAll('a[href]')).filter(anchor => {
            const expected = pagination.links.get(Number(anchor.textContent.trim()));
            if (!expected) return false;
            try { return expected === new URL(anchor.getAttribute('href'), currentUrl).href; } catch { return false; }
        });
        const cell = links[0]?.closest('td, th');
        if (!cell || !links.every(link => cell.contains(link))) return null;
        pagination.element = cell;
    }
    return pagination;
}

function getPrivateMessageId(row) {
    const marked = Array.from(row.querySelectorAll('input[type="checkbox"][name="marked_msg_id[]"]'))
        .find(input => input.closest('tr') === row && !input.closest('.postbody, .quotecontent, .signature') && /^[1-9]\d*$/.test(input.value));
    // The native selection control also identifies unavailable messages, which
    // can have no view link (or only a reply link).
    return marked?.value || null;
}

function getSearchPostRows(page) {
    const results = [];
    for (const table of page.querySelectorAll('#wrapcentre > form > table.tablebg')) {
        const rows = Array.from(table.tBodies).flatMap(body => Array.from(body.rows));
        // Native post-search results are four sibling rows: topic, author,
        // message and spacer. Keep that structure, including ignored results.
        if (!rows.some(row => row.matches('.row2') && row.cells.length === 1)) continue;
        const groups = [];
        let group = null;
        for (const row of rows) {
            if (row.querySelector(':scope > .cat, :scope > th')) { group = null; continue; }
            if (row.matches('.row2') && row.cells.length === 1) {
                group = [];
                groups.push(group);
            }
            if (group) group.push(row);
        }
        const source = new URL(page.rinSourceUrl || page.rinRequestUrl || window.location.href, FORUM_BASE_URL);
        groups.forEach((groupRows, groupIndex) => {
            let id = getPostId(groupRows[0]);
            if (!id) {
                for (const row of groupRows) {
                    const link = Array.from(row.querySelectorAll('a[href]')).find(anchor => {
                        if (anchor.closest('.postbody, .quotecontent, .signature')) return false;
                        const url = forumLink(anchor.getAttribute('href'), 'viewtopic.php') || forumLink(anchor.getAttribute('href'), 'search.php');
                        return /^[1-9]\d*$/.test(url?.searchParams.get('p'));
                    });
                    if (link) { id = new URL(link.getAttribute('href'), FORUM_BASE_URL).searchParams.get('p'); break; }
                }
            }
            // Some ignored-post placeholders expose no post link at all.
            const key = id || groupRows[0].dataset.rinSearchPost || `ignored:${source.searchParams.get('start') || '0'}:${groupIndex}`;
            groupRows.forEach((row, part) => {
                row.dataset.rinSearchPost = key;
                row.dataset.rinSearchPart = String(part);
                results.push(row);
            });
        });
    }
    return results;
}

function getContentItems(page = document) {
    const path = window.location.pathname;
    if (path.endsWith('/viewtopic.php')) {
        // Ignored-user placeholders occupy a post slot even without a visible .postbody.
        return Array.from(page.querySelectorAll('#pagecontent > table.tablebg')).filter(post => getPostId(post));
    }
    if (path.endsWith('/ucp.php')) {
        const current = new URL(window.location.href);
        if (current.searchParams.get('i') !== 'pm' || current.searchParams.get('mode') === 'compose' || current.searchParams.has('p')) return [];
        // Folder navigation also uses mode=view. Only message rows in the
        // native bulk-action form may serve as infinite-scroll insertion anchors.
        return Array.from(page.querySelectorAll('#pagecontent > form > table.tablebg > tbody > tr'))
            .filter(row => !row.closest('.postbody, #topic_preview') && getPrivateMessageId(row));
    }
    if (path.endsWith('/search.php')) {
        const posts = getSearchPostRows(page);
        if (posts.length) return posts;
    }
    const candidates = page.querySelectorAll('#pagecontent table.tablebg > tbody > tr, #wrapcentre > form > table.tablebg > tbody > tr, #pagecontent > form > table.tablebg > tbody > tr');
    return Array.from(candidates).filter(row => {
        if (row.closest('.postbody, #topic_preview') || row.querySelector(':scope > .cat, :scope > th')) return false;
        if (path.endsWith('/viewforum.php')) return Boolean(row.querySelector('a.topictitle'));
        if (path.endsWith('/memberlist.php')) return Boolean(findForumLink(row, 'memberlist.php', { mode: 'viewprofile' }));
        if (path.endsWith('/search.php')) return Boolean(row.querySelector('a.topictitle, .postbody, a[href*="viewtopic.php"]'));
        return false;
    });
}

function contentItemKey(item) {
    if (window.location.pathname.endsWith('/search.php') && item.dataset.rinSearchPost) {
        return `search-post:${item.dataset.rinSearchPost}:${item.dataset.rinSearchPart}`;
    }
    const messageId = getPrivateMessageId(item);
    if (messageId) return `pm:${messageId}`;
    const topic = item.querySelector('a.topictitle[href]');
    if (topic && !item.querySelector('.postbody')) {
        const url = forumLink(topic.getAttribute('href'), 'viewtopic.php');
        if (url?.searchParams.get('t')) return `topic:${url.searchParams.get('t')}`;
    }
    const postId = getPostId(item);
    if (postId) return `post:${postId}`;
    const profile = findForumLink(item, 'memberlist.php', { mode: 'viewprofile' });
    if (profile && window.location.pathname.endsWith('/memberlist.php')) return `user:${new URL(profile.href).searchParams.get('u')}`;
    return item.textContent.trim().slice(0, 500);
}

let rinPaginationState = null;
function setupInfiniteScroll() {
    if (!options.infinite_scrolling || rinPaginationState) return;
    const pagination = getPagination();
    const items = getContentItems();
    if (!pagination || !items.length) return;
    const navigationElement = pagination.element;
    const sticky = document.createElement('div');
    sticky.setAttribute('name', 'page_nav');
    sticky.className = 'gensmall rin-page-nav';
    sticky.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
    sticky.dataset.page = String(pagination.current);
    // Snapshot before moving just the navigation content. Native table cells,
    // posting buttons and counters stay in place without duplicating the pager.
    pagination.element = navigationElement.cloneNode(true);
    if (navigationElement.matches('td, th')) sticky.append(...navigationElement.childNodes);
    else sticky.append(navigationElement);
    const first = items[0].closest('#pagecontent') || items[0].closest('form') || items[0];
    first.before(sticky);
    let displayedPagination = pagination;
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
        if (page && displayedPagination !== page.pagination) {
            const replacement = document.importNode(page.pagination.element, true);
            if (replacement.matches('td, th')) sticky.replaceChildren(...replacement.childNodes);
            else sticky.replaceChildren(replacement);
            sticky.dataset.page = String(page.pagination.current);
            displayedPagination = page.pagination;
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
        button.append(' ', createActionIcon('mention', 'Reply with mentioning'), ' ');
        bar.append(button);
        if (quickReplyPanel) button.addEventListener('click', event => {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
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
                    const label = document.createElement('span');
                    label.style.fontSize = '0.9em';
                    label.textContent = piece.slice(1, -1);
                    span.append('[', label, ']');
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
    const lower = str.toLowerCase();
    let hash = 0;
    for (let index = 0; index < lower.length; index++) hash = lower.charCodeAt(index) + ((hash << 5) - hash);
    let background = [24, 24, 24];
    while (parentElem) {
        const match = getComputedStyle(parentElem).backgroundColor.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
        if (match) { background = match.slice(1).map(Number); break; }
        parentElem = parentElem.parentElement;
    }
    for (let attempt = 0; attempt < 32; attempt++) {
        const hex = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16).padStart(6, '0');
        if (Math.abs(hexToRgb(hex).reduce((a, b) => a + b, 0) - background.reduce((a, b) => a + b, 0)) >= 300) return `#${hex}`;
        hash = (hash << 5) - hash;
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
        // Only native topic-list rows provide trustworthy last-post metadata.
        // A topic link in a message can share its row with unrelated post links.
        const row = topic.matches('a.topictitle') && !topic.closest('.postbody, .quotecontent, .signature') ? topic.closest('tr') : null;
        const last = Array.from(row?.querySelectorAll('a[href]') || []).filter(link => !link.closest('.postbody, .quotecontent, .signature'))
            .map(link => forumLink(link.getAttribute('href'), 'viewtopic.php'))
            .filter(link => link?.searchParams.has('p') && (!link.searchParams.has('t') || link.searchParams.get('t') === url.searchParams.get('t'))).at(-1);
        if (last) return last.href;
        // Topic links inside messages have no last-post ID: ask phpBB to put
        // the newest post first instead of borrowing another link's target.
        url.searchParams.set('sk', 't'); url.searchParams.set('sd', 'd');
    }
    return url.href;
}

function getTopicPreviewIndex(posts, link) {
    const url = forumLink(link, 'viewtopic.php');
    const postId = url?.searchParams.get('p');
    if (postId) return posts.findIndex(post => getPostId(post) === postId);
    if (options.topic_preview_option === 1) {
        const unread = posts.findIndex(post => Array.from(post.querySelectorAll('a[name="unread"], #unread'))
            .some(marker => !marker.closest('.postbody, .quotecontent, .signature')));
        if (unread >= 0) return unread;
    }
    return options.topic_preview_option === 2 && url?.searchParams.get('sd') !== 'd' ? posts.length - 1 : 0;
}

function setupTopicPreview(root = document) {
    if (!options.topic_preview) return;
    root.querySelectorAll('a.topictitle').forEach(topic => {
        const link = getTopicPreviewLink(topic);
        if (link) previewElement(topic, link, getTopicPreviewIndex);
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
            if (link) previewElement(post, link, getTopicPreviewIndex);
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
        button.append(' ', createActionIcon('copy', 'Copy the link into the clipboard'), ' ');
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
        if (existing) { stopInlineChat(existing); existing.remove(); }
        else { createChatContainer(); void fetchChat(); }
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

async function fetchChat() {
    const container = document.getElementById('chatDiv');
    if (!container) return;
    const url = new URL('chat.php', FORUM_BASE_URL);
    const current = new URL(window.location.href);
    for (const key of ['lang', 'sid']) {
        const value = current.searchParams.get(key);
        if (value) url.searchParams.set(key, value);
    }
    await startInlineChat(container, url);
}

function setupQuickReplyPanel() {
    if (!options.quick_reply || !quickReplyPanel || document.getElementById('rin-quick-reply-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'rin-quick-reply-toggle';
    button.style.cssText = 'position:fixed;bottom:0%;left:0%;min-height:40px;min-width:50px;width:10%;height:3%;z-index:9999;';
    button.textContent = rinText('Show Quick Reply Panel');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') === 'false';
        quickReplyPanel.classList.toggle('rin-quick-reply-open', open);
        button.setAttribute('aria-expanded', String(open));
        button.textContent = rinText(open ? 'Hide Quick Reply Panel' : 'Show Quick Reply Panel');
    });
    document.body.append(button);
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
    const anchor = menu && Array.from(menu.querySelectorAll('a[href]')).find(item => {
        const url = forumLink(item.getAttribute('href'), 'ucp.php');
        return url && !url.searchParams.has('mode') && !url.searchParams.has('i');
    });
    if (!anchor) return;
    const button = document.createElement('a');
    button.id = 'profile_link'; button.href = profile.href;
    const nativeIcon = anchor.querySelector('img[src]');
    if (nativeIcon) {
        const icon = nativeIcon.cloneNode(true); icon.width = 12; icon.height = 13;
        button.append(icon, document.createTextNode(' '));
    }
    button.append(document.createTextNode(rinText('Profile')));
    const nextLink = anchor.nextElementSibling;
    if (nextLink?.matches('a')) nextLink.before(button, document.createTextNode(' \u00a0:: \u00a0'));
    else anchor.after(document.createTextNode(' \u00a0:: \u00a0'), button);
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
    const palette = { 'chat.php': '#98FB98', 'faq.php': '#90EE90', 'memberlist.php': '#4169E1', 'search.php': '#87CEFA' };
    document.querySelectorAll('#menubar a[href]').forEach(link => {
        try {
            const url = new URL(link.getAttribute('href'), FORUM_BASE_URL);
            if (url.origin !== new URL(FORUM_BASE_URL).origin) return;
            const name = url.pathname.split('/').at(-1);
            const icon = link.querySelector('img[src]')?.getAttribute('src').split(/[?#]/)[0].split('/').at(-1);
            if (palette[name]) link.style.color = palette[name];
            if (name === 'ucp.php') {
                const mode = url.searchParams.get('mode');
                if ((!mode && !url.searchParams.has('i')) || mode === 'register') link.style.color = '#87CEEB';
                if (mode === 'logout' || mode === 'login') link.style.color = '#FF0000';
            }
            if (icon === 'icon_mini_rules.gif' || url.searchParams.get('mode') === 'rules') link.style.color = '#FFA07A';
            if (icon === 'icon_mini_faq.gif') link.style.color = '#90EE90';
            if (url.pathname.includes('donat')) link.style.color = '#FFC200';
        } catch { /* Ignore non-URL menu actions. */ }
    });
    const profile = document.getElementById('profile_link');
    if (profile) profile.style.color = '#F08080';
    const heading = document.querySelector('#logodesc h1');
    if (heading) heading.style.color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

async function colorizeFriendsMe(root = document) {
    if (!options.colorize_friends_me) return;
    const path = window.location.pathname;
    if (options.colorize_friends_me > 1 && (path === new URL(FORUM_BASE_URL).pathname || path === new URL('index.php', FORUM_BASE_URL).pathname)) {
        const legend = Array.from(root.querySelectorAll('.gensmall a[href]')).find(link => {
            if (link.closest('.postbody, .quotecontent, .signature, #topic_preview')) return false;
            const group = forumLink(link.getAttribute('href'), 'memberlist.php', { mode: 'group' });
            return group && /^[1-9]\d*$/.test(group.searchParams.get('g'));
        })?.closest('.gensmall');
        if (legend && !findForumLink(legend, 'ucp.php', { i: 'zebra', mode: 'friends' })) {
            const friends = document.createElement('a');
            friends.href = `${FORUM_BASE_URL}ucp.php?i=zebra&mode=friends`;
            friends.className = 'rin-friends-legend'; friends.style.color = color.color_of_friends;
            friends.textContent = rinText('Friends');
            legend.append(document.createTextNode(', '), friends);
        }
    }
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
        if (element.type === 'checkbox') row.append(element, document.createTextNode(' '), label);
        else row.append(label, document.createTextNode(' '), element);
        panel.append(row);
        return row;
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
    addField('By:', author).className = 'rin-search-centered';
    const searchButton = document.createElement('button'); searchButton.id = 'searchButton'; searchButton.type = 'button'; searchButton.textContent = rinText('Search');
    const searchButtonRow = document.createElement('div'); searchButtonRow.className = 'rin-search-centered';
    searchButton.addEventListener('click', searchURL); searchButtonRow.append(searchButton); panel.append(searchButtonRow);
    container.append(searchBar, panel); cell.prepend(container);
    searchBar.addEventListener('focus', () => { panel.hidden = false; });
    searchBar.addEventListener('click', event => { event.stopPropagation(); panel.hidden = false; });
    panel.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', () => { panel.hidden = true; });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') panel.hidden = true; });
    searchBar.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); searchURL(); } });
    if (settings.showFriends && CONNECTED) {
        await retrievesFriendsLists();
        const list = document.createElement('div'); list.id = 'friends-lists-search'; list.hidden = true;
        const title = document.createElement('p'); title.textContent = rinText('Friends ({count}):', { count: FRIENDS_LIST.length }); list.append(title);
        const friends = document.createElement('ul');
        if (!FRIENDS_LIST.length) {
            const empty = document.createElement('li'); empty.textContent = rinText('No friends added yet.'); friends.append(empty);
        }
        for (const friend of FRIENDS_LIST) {
            const item = document.createElement('li'); item.textContent = friend; item.tabIndex = 0; item.setAttribute('role', 'button');
            const selectFriend = () => { author.value = friend; author.focus(); list.hidden = true; };
            item.addEventListener('click', selectFriend);
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectFriend(); }
            });
            friends.append(item);
        }
        list.append(friends); panel.append(list);
        author.addEventListener('click', () => { list.hidden = false; });
        author.addEventListener('focus', () => { list.hidden = false; });
    }
}

loadConfig();
window.addEventListener('message', receiveConfigMessage);
void loadConfigButton();
const quickReplyPanel = document.getElementById('postform');
if (options.script_enabled) {
    GM_addStyle(`
        .rin-loading { position:fixed;width:40px;height:40px;opacity:.5;z-index:2147483647;pointer-events:none; }
        .rin-page-nav { position:sticky;top:0;z-index:900;width:500px;max-width:100%;font-size:1em; }
        .rin-friend-action { margin-top:6px; }
        a.rin-friend-button { display:inline-block; }
        .rin-action-feedback { animation:rin-feedback-fade .4s 2s forwards; }
        @keyframes rin-feedback-fade { to { opacity:0; } }
        .rin-special-search { position:relative;display:inline-block; }
        .rin-search-options { position:absolute;background:#1c1c1c;border-top:.5em solid black;text-align:left;z-index:9999; }
        .rin-search-options > div:not(#friends-lists-search) { padding:.5em; }
        .rin-search-options label { color:white; }
        .rin-search-options .rin-search-centered { display:flex;align-items:center;justify-content:center; }
        .rin-chat-panel { position:fixed;right:0;bottom:0;z-index:9998; }
        .rin-quick-reply-open { position:sticky;bottom:0;z-index:9990; }
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
function getBundledImage(name) {
    return {"mention":"data:image/png;base64,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","copy":"data:image/png;base64,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","loading":"data:image/gif;base64,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"}[name];
}

function getBundledConfig() {
    return { html: "<!doctype html>\n<html lang=\"en\">\n<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>CS.RIN.RU Enhanced · Settings</title><link rel=\"stylesheet\" href=\"./config.css\"><script src=\"./config.js\" defer></script></head>\n<body>\n<div id=\"wholeWindow\" hidden>\n<section id=\"configWindow\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"rin-settings-title\" tabindex=\"-1\">\n<header class=\"rin-settings-header\"><div><h1 id=\"rin-settings-title\" data-i18n=\"settings\">Settings</h1></div><button id=\"rin-config-close\" class=\"rin-icon-button\" type=\"button\" data-i18n-title=\"close\" data-i18n-aria=\"close\" title=\"Close\" aria-label=\"Close\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m6 6 12 12M18 6 6 18\"/></svg></button></header>\n<div class=\"rin-masterbar\"><label class=\"rin-master-switch\" for=\"script_enabled\"><input id=\"script_enabled\" data-option type=\"checkbox\" data-originalValue=\"\"><span data-i18n=\"script_enabled\">Enable enhancements</span></label><div class=\"rin-language\"><label for=\"ui_language\" data-i18n=\"ui_language\">Language</label><select id=\"ui_language\" data-option data-originalValue=\"\"><option value=\"auto\" data-i18n=\"language_auto\">Forum language</option><option value=\"en\">English</option><option value=\"ru\">Русский</option></select></div></div>\n<div id=\"rin-login-note\" class=\"rin-notice\" hidden data-i18n=\"login_note\">Sign in to the forum to use account features.</div>\n<nav class=\"rin-settings-nav\" role=\"tablist\" aria-label=\"Settings sections\" data-i18n-aria=\"sections\">\n<button type=\"button\" role=\"tab\" id=\"rin-tab-general\" aria-controls=\"rin-panel-general\" aria-selected=\"true\" data-panel=\"general\"><span data-i18n=\"general\">General</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-reading\" aria-controls=\"rin-panel-reading\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"reading\"><span data-i18n=\"reading\">Reading</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-replies\" aria-controls=\"rin-panel-replies\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"replies\"><span data-i18n=\"replies\">Replies</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-community\" aria-controls=\"rin-panel-community\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"community\"><span data-i18n=\"community\">Community</span></button>\n<button type=\"button\" role=\"tab\" id=\"rin-tab-search\" aria-controls=\"rin-panel-search\" aria-selected=\"false\" tabindex=\"-1\" data-panel=\"search\"><span data-i18n=\"search\">Search</span></button>\n</nav>\n<form id=\"rin-config-form\" novalidate><fieldset id=\"config\">\n<section class=\"rin-settings-panel\" id=\"rin-panel-general\" role=\"tabpanel\" aria-labelledby=\"rin-tab-general\"><div class=\"rin-section-heading\"><h2 data-i18n=\"general_heading\">Browsing &amp; updates</h2></div>\n<label class=\"rin-setting\" for=\"infinite_scrolling\"><span><span data-i18n=\"infinite_scrolling\">Infinite scrolling</span><small id=\"infinite_scrolling_help\" data-i18n=\"infinite_scrolling_help\">Load the next page as you reach the bottom.</small></span><input id=\"infinite_scrolling\" data-option data-originalValue=\"\" aria-describedby=\"infinite_scrolling_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"dynamic_function\"><span><span data-i18n=\"dynamic_function\">Live forum updates</span><small id=\"dynamic_function_help\" data-i18n=\"dynamic_function_help\">Refresh messages, online users and forum time every minute.</small></span><input id=\"dynamic_function\" data-option data-originalValue=\"\" need-connected=\"true\" aria-describedby=\"dynamic_function_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"dynamic_content\"><span><span data-i18n=\"dynamic_content\">Live topic content</span><small id=\"dynamic_content_help\" data-i18n=\"dynamic_content_help\">Refresh topic content while live forum updates are enabled.</small></span><input id=\"dynamic_content\" data-option data-originalValue=\"\" need-connected=\"true\" aria-describedby=\"dynamic_content_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"colorize_the_page\"><span><span data-i18n=\"colorize_the_page\">Add color to forum elements</span></span><input id=\"colorize_the_page\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"custom_tags\"><span><span data-i18n=\"custom_tags\">Color topic tags</span></span><input id=\"custom_tags\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"display_ajax_loader\"><span><span data-i18n=\"display_ajax_loader\">Show loading indicators</span></span><input id=\"display_ajax_loader\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting rin-setting-stack\"><label for=\"title_format\" data-i18n=\"title_format\">Browser tab title</label><input id=\"title_format\" data-option data-originalValue=\"\" aria-describedby=\"title_format_help\" type=\"text\" spellcheck=\"false\"><small id=\"title_format_help\" data-i18n=\"title_format_help\">%C forum · %S section · %T topic title · %RT title without tags</small></div>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-reading\" role=\"tabpanel\" aria-labelledby=\"rin-tab-reading\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"reading_heading\">Topics &amp; links</h2></div>\n<div class=\"rin-setting\"><label for=\"change_topic_link\" data-i18n=\"change_topic_link\">Open topic titles at</label><select id=\"change_topic_link\" data-option data-originalValue=\"\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"change_topic_link_0\">First post</option><option value=\"1\" data-i18n=\"change_topic_link_1\">First unread post</option><option value=\"2\" data-i18n=\"change_topic_link_2\">Last post</option></select></div>\n<label class=\"rin-setting\" for=\"steam_db_link\"><span><span data-i18n=\"steam_db_link\">Add missing SteamDB links</span><small id=\"steam_db_link_help\" data-i18n=\"steam_db_link_help\">Keep links already provided by the forum.</small></span><input id=\"steam_db_link\" data-option data-originalValue=\"\" aria-describedby=\"steam_db_link_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"copy_link_button\"><span><span data-i18n=\"copy_link_button\">Copy post link button</span></span><input id=\"copy_link_button\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"full_path_post_links\"><span><span data-i18n=\"full_path_post_links\">Include forum and topic in post links</span><small id=\"full_path_post_links_help\" data-i18n=\"full_path_post_links_help\">Keep the topic context when sharing a post.</small></span><input id=\"full_path_post_links\" data-option data-originalValue=\"\" aria-describedby=\"full_path_post_links_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"collapse_quotes\"><span><span data-i18n=\"collapse_quotes\">Collapse quotes by default</span></span><input id=\"collapse_quotes\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"show_all_spoilers\"><span><span data-i18n=\"show_all_spoilers\">Open all spoilers</span></span><input id=\"show_all_spoilers\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"topic_preview\"><span><span data-i18n=\"topic_preview\">Preview topics on hover</span></span><input id=\"topic_preview\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"topic_preview_option\" data-i18n=\"topic_preview_option\">Topic preview opens at</label><select id=\"topic_preview_option\" data-option data-originalValue=\"\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"topic_preview_option_0\">First post</option><option value=\"1\" data-i18n=\"topic_preview_option_1\">First unread post</option><option value=\"2\" data-i18n=\"topic_preview_option_2\">Last post</option></select></div>\n<label class=\"rin-setting\" for=\"post_preview\"><span><span data-i18n=\"post_preview\">Preview individual posts</span></span><input id=\"post_preview\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"profile_preview\"><span><span data-i18n=\"profile_preview\">Preview user profiles</span></span><input id=\"profile_preview\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"topic_preview_timeout\" data-i18n=\"topic_preview_timeout\">Preview delay (seconds)</label><input id=\"topic_preview_timeout\" data-option data-originalValue=\"\" aria-describedby=\"topic_preview_timeout_help\" type=\"number\" min=\"1\" max=\"99\"><small id=\"topic_preview_timeout_help\" data-i18n=\"topic_preview_timeout_help\">Applies to topic, post and profile previews.</small></div>\n<div class=\"rin-setting\"><label for=\"hide_scs\" data-i18n=\"hide_scs\">SCS topic filter</label><select id=\"hide_scs\" data-option data-originalValue=\"\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"hide_scs_0\">Show all topics</option><option value=\"1\" data-i18n=\"hide_scs_1\">Hide all marked topics</option><option value=\"2\" data-i18n=\"hide_scs_2\">Hide green topics</option><option value=\"3\" data-i18n=\"hide_scs_3\">Show only red topics</option></select></div>\n<label class=\"rin-setting\" for=\"apply_in_scs\"><span><span data-i18n=\"apply_in_scs\">Also filter inside Steam Content Sharing</span></span><input id=\"apply_in_scs\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-replies\" role=\"tabpanel\" aria-labelledby=\"rin-tab-replies\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"replies_heading\">Writing replies</h2></div>\n<div class=\"rin-setting rin-setting-stack\"><label for=\"mentioning\" data-i18n=\"mentioning\">Mentioning</label><input id=\"mentioning\" data-option data-originalValue=\"\" aria-describedby=\"mentioning_help\" type=\"text\" spellcheck=\"false\"><small id=\"mentioning_help\" data-i18n=\"mentioning_help\">BBCode supported. %m = username, %u = profile URL, %p = post URL. Leave empty to disable mentions.</small></div>\n<label class=\"rin-setting\" for=\"add_link_quote\"><span><span data-i18n=\"add_link_quote\">Link quote authors to their posts</span><small id=\"add_link_quote_help\" data-i18n=\"add_link_quote_help\">Include a source link in valid quote BBCode.</small></span><input id=\"add_link_quote\" data-option data-originalValue=\"\" need-connected=\"true\" aria-describedby=\"add_link_quote_help\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"quick_reply\"><span><span data-i18n=\"quick_reply\">Floating quick reply panel</span><small id=\"quick_reply_help\" data-i18n=\"quick_reply_help\">Requires quick reply to be enabled in your forum preferences.</small></span><input id=\"quick_reply\" data-option data-originalValue=\"\" aria-describedby=\"quick_reply_help\" type=\"checkbox\"></label>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-community\" role=\"tabpanel\" aria-labelledby=\"rin-tab-community\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"community_heading\">People &amp; messages</h2></div>\n<label class=\"rin-setting\" for=\"friend_buttons\"><span><span data-i18n=\"friend_buttons\">Friend button below author details</span></span><input id=\"friend_buttons\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"colorize_friends_me\" data-i18n=\"colorize_friends_me\">Highlight usernames</label><select id=\"colorize_friends_me\" data-option data-originalValue=\"\" need-connected=\"true\" data-value-type=\"number\"><option value=\"0\" data-i18n=\"colorize_friends_me_0\">No highlighting</option><option value=\"1\" data-i18n=\"colorize_friends_me_1\">My username</option><option value=\"2\" data-i18n=\"colorize_friends_me_2\">My friends</option><option value=\"3\" data-i18n=\"colorize_friends_me_3\">My username and friends</option></select></div>\n<label class=\"rin-setting\" for=\"add_profile_button\"><span><span data-i18n=\"add_profile_button\">Shortcut to my profile</span></span><input id=\"add_profile_button\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"colorize_new_messages\"><span><span data-i18n=\"colorize_new_messages\">Highlight new private messages</span></span><input id=\"colorize_new_messages\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"add_small_shoutbox\"><span><span data-i18n=\"add_small_shoutbox\">Compact chat panel</span></span><input id=\"add_small_shoutbox\" data-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n<label class=\"rin-setting\" for=\"add_users_tag\"><span><span data-i18n=\"add_users_tag\">Show Steam user tags</span></span><input id=\"add_users_tag\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n</section>\n<section class=\"rin-settings-panel\" id=\"rin-panel-search\" role=\"tabpanel\" aria-labelledby=\"rin-tab-search\" hidden><div class=\"rin-section-heading\"><h2 data-i18n=\"search_heading\">Search defaults</h2></div>\n<label class=\"rin-setting\" for=\"special_search\"><span><span data-i18n=\"special_search\">Enable enhanced search</span></span><input id=\"special_search\" data-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"searchTermsSpecificity\" data-i18n=\"searchTermsSpecificity\">Match search terms</label><select id=\"searchTermsSpecificity\" data-search-option data-originalValue=\"\"><option value=\"any\" data-i18n=\"searchTermsSpecificity_any\">Any term</option><option value=\"all\" data-i18n=\"searchTermsSpecificity_all\">All terms</option></select></div>\n<label class=\"rin-setting\" for=\"searchSubforums\"><span><span data-i18n=\"searchSubforums\">Include subforums</span></span><input id=\"searchSubforums\" data-search-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"searchTopicLocation\" data-i18n=\"searchTopicLocation\">Search within</label><select id=\"searchTopicLocation\" data-search-option data-originalValue=\"\"><option value=\"all\" data-i18n=\"searchTopicLocation_all\">Subjects and message text</option><option value=\"msgonly\" data-i18n=\"searchTopicLocation_msgonly\">Message text only</option><option value=\"titleonly\" data-i18n=\"searchTopicLocation_titleonly\">Topic titles only</option><option value=\"firstpost\" data-i18n=\"searchTopicLocation_firstpost\">First posts only</option></select></div>\n<div class=\"rin-setting\"><label for=\"sortResultsBy\" data-i18n=\"sortResultsBy\">Sort results by</label><select id=\"sortResultsBy\" data-search-option data-originalValue=\"\"><option value=\"a\" data-i18n=\"sortResultsBy_a\">Author</option><option value=\"t\" data-i18n=\"sortResultsBy_t\">Post time</option><option value=\"f\" data-i18n=\"sortResultsBy_f\">Forum</option><option value=\"i\" data-i18n=\"sortResultsBy_i\">Topic title</option><option value=\"s\" data-i18n=\"sortResultsBy_s\">Post subject</option></select></div>\n<div class=\"rin-setting\"><label for=\"sortOrderBy\" data-i18n=\"sortOrderBy\">Sort order</label><select id=\"sortOrderBy\" data-search-option data-originalValue=\"\"><option value=\"a\" data-i18n=\"sortOrderBy_a\">Ascending</option><option value=\"d\" data-i18n=\"sortOrderBy_d\">Descending</option></select></div>\n<label class=\"rin-setting\" for=\"showResultsAsPosts\"><span><span data-i18n=\"showResultsAsPosts\">Display results as posts</span></span><input id=\"showResultsAsPosts\" data-search-option data-originalValue=\"\" type=\"checkbox\"></label>\n<div class=\"rin-setting\"><label for=\"limitToPrevious\" data-i18n=\"limitToPrevious\">Only the last (days)</label><input id=\"limitToPrevious\" data-search-option data-originalValue=\"\" aria-describedby=\"limitToPrevious_help\" type=\"number\" min=\"0\"><small id=\"limitToPrevious_help\" data-i18n=\"limitToPrevious_help\">0 = no time limit</small></div>\n<div class=\"rin-setting\"><label for=\"returnFirst\" data-i18n=\"returnFirst\">Post excerpt length (characters)</label><input id=\"returnFirst\" data-search-option data-originalValue=\"\" aria-describedby=\"returnFirst_help\" type=\"number\" min=\"-1\"><small id=\"returnFirst_help\" data-i18n=\"returnFirst_help\">−1 = complete post</small></div>\n<label class=\"rin-setting\" for=\"showFriends\"><span><span data-i18n=\"showFriends\">Suggest friends in author search</span></span><input id=\"showFriends\" data-search-option data-originalValue=\"\" need-connected=\"true\" type=\"checkbox\"></label>\n</section>\n</fieldset></form>\n<div id=\"messages\" class=\"rin-config-status\" role=\"status\" aria-live=\"polite\"></div>\n<footer class=\"rin-settings-footer\"><a class=\"rin-help-link\" href=\"https://cs.rin.ru/forum/viewtopic.php?f=14&amp;t=75717\" target=\"_blank\" rel=\"noopener noreferrer\" data-i18n-title=\"help_title\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.4 9a2.7 2.7 0 0 1 5.2 1c0 2-2.6 2-2.6 4m0 2.5v.1\"/></svg><span data-i18n=\"help\">Help &amp; discussion</span></a><span id=\"rin-preview-badge\" hidden data-i18n=\"preview_badge\">Local preview</span><div class=\"rin-footer-actions\"><button id=\"rin-config-cancel\" type=\"button\" data-i18n=\"cancel\">Cancel</button><button id=\"rin-config-save\" class=\"rin-primary-button\" type=\"submit\" form=\"rin-config-form\" disabled data-i18n=\"save\">Save changes</button></div></footer>\n</section>\n</div>\n<button id=\"configButton\" class=\"rin-forum-button\" type=\"button\" aria-controls=\"configWindow\" aria-expanded=\"false\" title=\"Enhanced settings\" aria-label=\"Enhanced settings\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m9.5 3-.6 2a7 7 0 0 0-1.4.8L5.4 5.3 3 9.5 4.5 11a7 7 0 0 0 0 2L3 14.5l2.4 4.2 2.1-.5a7 7 0 0 0 1.4.8l.6 2h5l.6-2a7 7 0 0 0 1.4-.8l2.1.5 2.4-4.2-1.5-1.5a7 7 0 0 0 0-2L21 9.5l-2.4-4.2-2.1.5a7 7 0 0 0-1.4-.8l-.6-2Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></button>\n</body></html>\n", css: "#wholeWindow {\n    --rin-bg: #1e1e1e; --rin-row: #252525; --rin-line: #454545;\n    --rin-muted: #a7a7a7; --rin-text: #cecece; --rin-accent: #dedede;\n    position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center;\n    padding: 20px; box-sizing: border-box; background: rgb(0 0 0 / 65%);\n    color: var(--rin-text); font: 11px/1.45 Verdana, Tahoma, sans-serif; text-align: left; color-scheme: dark;\n}\n#wholeWindow[hidden], #wholeWindow [hidden], #configButton[hidden], .rin-forum-button[hidden] { display: none !important; }\n#wholeWindow *, #wholeWindow *::before, #wholeWindow *::after { box-sizing: border-box; }\n#wholeWindow #configWindow {\n    display: flex; flex-direction: column; width: min(760px, 100%); max-height: calc(100dvh - 40px);\n    margin: 0; padding: 0; overflow: hidden; border: 1px solid #707070; border-radius: 0;\n    background: var(--rin-bg); outline: none;\n}\n#wholeWindow .rin-settings-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 12px; min-height: 38px; padding: 6px 10px 6px 12px; border-bottom: 1px solid var(--rin-line); background: #282828; }\n#wholeWindow h1 { margin: 0; color: #dedede; font: bold 14px/1.4 Verdana, Tahoma, sans-serif; }\n#wholeWindow .rin-masterbar { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; flex-wrap: wrap; gap: 8px 16px; padding: 8px 12px; background: #222; border-bottom: 1px solid var(--rin-line); }\n#wholeWindow .rin-master-switch, #wholeWindow .rin-language { display: flex; align-items: center; gap: 7px; }\n#wholeWindow .rin-master-switch { font-weight: bold; cursor: pointer; }\n#wholeWindow .rin-language { color: var(--rin-muted); font-size: 10px; }\n#wholeWindow .rin-language select { min-width: 140px; max-width: 205px; }\n#wholeWindow .rin-settings-nav { display: flex; flex-shrink: 0; gap: 0; padding: 0; overflow-x: auto; border-bottom: 1px solid #666; background: #1a1a1a; scrollbar-width: thin; }\n#wholeWindow .rin-settings-nav button { flex: 1 0 auto; min-height: 32px; padding: 7px 12px; border: 0; border-right: 1px solid #3f3f3f; border-radius: 0; background: #222; color: #aaa; font-size: 11px; white-space: nowrap; }\n#wholeWindow .rin-settings-nav button:last-child { border-right: 0; }\n#wholeWindow .rin-settings-nav button:hover { background: #303030; color: #eee; }\n#wholeWindow .rin-settings-nav button[aria-selected=\"true\"] { background: #3a3a3a; color: #eee; font-weight: bold; }\n#wholeWindow #rin-config-form { min-height: 0; overflow-y: auto; scrollbar-color: #666 #222; scrollbar-width: thin; }\n#wholeWindow #config { min-width: 0; margin: 0; padding: 0; border: 0; }\n#wholeWindow .rin-settings-panel { padding: 10px 12px 12px; }\n#wholeWindow .rin-section-heading { margin-bottom: 6px; }\n#wholeWindow h2 { margin: 0; color: #bcbcbc; font-size: 11px; line-height: 1.5; font-weight: bold; }\n#wholeWindow .rin-setting { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 16px; min-height: 32px; margin: 0; padding: 7px 9px; border: 1px solid var(--rin-line); border-bottom-width: 0; background: var(--rin-row); color: var(--rin-text); font-weight: normal; }\n#wholeWindow .rin-setting:last-child { border-bottom-width: 1px; }\n#wholeWindow .rin-setting:nth-of-type(even) { background: #222; }\n#wholeWindow label.rin-setting { flex-wrap: nowrap; cursor: pointer; }\n#wholeWindow label.rin-setting:hover { background: #2b2b2b; }\n#wholeWindow .rin-setting > span, #wholeWindow .rin-setting > label { flex: 1; min-width: 0; }\n#wholeWindow .rin-setting small { display: block; margin-top: 2px; color: var(--rin-muted); font-size: 10px; font-weight: normal; line-height: 1.45; }\n#wholeWindow .rin-setting > small { flex-basis: 100%; margin-top: 0; }\n#wholeWindow .rin-setting:has(#dynamic_content) > span { padding-left: 10px; border-left: 2px solid #555; }\n#wholeWindow .rin-setting[data-rin-disabled=\"true\"] { opacity: .55; }\n#wholeWindow .rin-setting-stack { display: flex; align-items: stretch; flex-direction: column; gap: 4px; }\n#wholeWindow .rin-setting-stack > input { width: 100%; }\n#wholeWindow input, #wholeWindow select, #wholeWindow button { font: inherit; }\n#wholeWindow input[type=\"text\"], #wholeWindow input[type=\"number\"], #wholeWindow select { min-width: 0; min-height: 25px; margin: 0; padding: 3px 6px; border: 1px solid #666; border-radius: 0; background: #161616; color: #ddd; line-height: 1.4; }\n#wholeWindow .rin-setting > select { width: 43%; max-width: 320px; }\n#wholeWindow input[type=\"checkbox\"] { flex: 0 0 auto; width: 14px; height: 14px; margin: 0; accent-color: #bdbdbd; cursor: pointer; }\n#wholeWindow input[type=\"number\"] { width: 72px; }\n#wholeWindow input:disabled, #wholeWindow select:disabled { cursor: not-allowed; }\n#wholeWindow #mentioning, #wholeWindow #title_format { font: 11px/1.5 Consolas, \"Liberation Mono\", monospace; }\n#wholeWindow .rin-notice { flex-shrink: 0; padding: 6px 12px; border-bottom: 1px solid var(--rin-line); background: #2b2921; color: #c5b98d; font-size: 10px; }\n#wholeWindow .rin-config-status { flex-shrink: 0; min-height: 26px; padding: 5px 12px; border-top: 1px solid var(--rin-line); background: #1e1e1e; color: var(--rin-muted); font-size: 10px; }\n#wholeWindow .rin-config-status[data-state=\"changed\"] { color: #d1c394; }\n#wholeWindow .rin-config-status[data-state=\"error\"] { color: #e5a5a5; }\n#wholeWindow .rin-settings-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; flex-shrink: 0; padding: 8px 12px; border-top: 1px solid var(--rin-line); background: #282828; }\n#wholeWindow .rin-footer-actions { display: flex; gap: 6px; margin-left: auto; }\n#wholeWindow button, #wholeWindow .rin-help-link { -webkit-tap-highlight-color: transparent; }\n#wholeWindow button { min-height: 27px; padding: 4px 10px; border: 1px solid #666; border-radius: 0; background: #333; color: #ccc; cursor: pointer; font-weight: normal; line-height: 1.4; }\n#wholeWindow button:hover { background: #404040; border-color: #999; color: #eee; }\n#wholeWindow button:disabled { border-color: #494949; background: #292929; color: #777; cursor: default; }\n#wholeWindow .rin-primary-button:not(:disabled) { border-color: #999; background: #414141; color: #eee; font-weight: bold; }\n#wholeWindow .rin-primary-button:not(:disabled):hover { background: #4b4b4b; }\n#wholeWindow .rin-help-link { display: inline-flex; align-items: center; gap: 5px; color: #aaa; text-decoration: none; font-size: 10px; }\n#wholeWindow .rin-help-link:hover { color: #ddd; text-decoration: underline; }\n#wholeWindow svg, #configButton svg, .rin-forum-button svg { display: block; flex: 0 0 auto; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }\n#wholeWindow .rin-help-link svg { width: 15px; height: 15px; }\n#wholeWindow .rin-icon-button { display: grid; place-items: center; width: 25px; height: 25px; min-height: 25px; padding: 3px; border-color: transparent; background: transparent; }\n#wholeWindow .rin-icon-button:hover { border-color: #666; background: #333; }\n#wholeWindow #rin-preview-badge { color: #999; font: 9px/1.5 Verdana, sans-serif; }\n#wholeWindow :is(button, a, input, select):focus-visible, #configButton:focus-visible, .rin-forum-button:focus-visible { outline: 2px solid #ccc; outline-offset: 2px; }\n#wholeWindow[data-rin-preview=\"true\"] { background: #1e1e1e; }\n#configButton, .rin-forum-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 30px; min-height: 28px; padding: 5px 8px; border: 1px solid #666; border-radius: 0; background: #303030; color: #ccc; font: 11px/1.3 Verdana, Tahoma, sans-serif; cursor: pointer; text-decoration: none; }\n#configButton { position: fixed; top: 5px; right: 5px; bottom: auto; z-index: 2147482000; padding: 5px; }\n#configButton:hover, .rin-forum-button:hover { border-color: #aaa; background: #3c3c3c; color: #eee; }\n.rin-toolbar { position: fixed; right: 0; bottom: 0; z-index: 2147482000; display: flex; align-items: flex-end; gap: 7px; }\n.rin-toolbar #rin-chat-toggle { position: static; margin: 0; min-width: 50px; min-height: 40px; width: 5vw; height: 3vh; }\n.rin-toolbar .rin-forum-button[aria-expanded=\"true\"] { border-color: #aaa; background: #444; }\n#chatDiv.rin-chat-panel { display: flex; flex-direction: column; width: 25%; min-width: min(425px, calc(100vw - 1em)); height: 70%; overflow: hidden; border: .5em solid black; background: #1c1c1c; }\n#chatDiv .rin-chat-actions { position: absolute; top: 3px; right: 4px; display: flex; gap: 3px; z-index: 1; }\n#chatDiv .rin-chat-actions a, #chatDiv .rin-chat-actions button { display: grid; place-items: center; width: 20px; height: 20px; min-height: 0; box-sizing: border-box; margin: 0; padding: 2px; border: 1px solid transparent; border-radius: 0; background: #282828; color: #aaa; cursor: pointer; text-decoration: none; }\n#chatDiv .rin-chat-actions a:hover, #chatDiv .rin-chat-actions button:hover { border-color: #777; background: #333; color: #eee; }\n#chatDiv .rin-chat-actions :focus-visible { outline: 2px solid #ccc; outline-offset: 1px; }\n#chatDiv .rin-chat-actions svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }\n#chatDiv .rin-chat-content { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }\n#chatDiv .rin-chat-content table { width: 100%; }\n#chatDiv .rin-chat-content > table { margin: 0; }\n#chatDiv .rin-chat-content > table > tbody > tr:first-child > th { padding-right: 28px; }\n#chatDiv .rin-chat-content td, #chatDiv .rin-chat-content th { box-sizing: border-box; }\n/* Native chat columns have an inline fixed height; only the enclosing panel should scroll. */\n#chatDiv .shouts { width: 100%; height: auto !important; max-height: none; overflow: visible; }\n#chatDiv .postbody { overflow-wrap: anywhere; }\n#chatDiv form { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin: 0; }\n#chatDiv form [name=\"message\"] { flex: 1 1 200px; min-width: 0; max-width: 100%; box-sizing: border-box; }\n#chatDiv .rin-chat-status { flex-shrink: 0; min-height: 26px; box-sizing: border-box; margin: 0; padding: 6px 55px 6px 8px; color: #c5b98d; background: #26251f; font-size: 11px; }\n#chatDiv [hidden] { display: none !important; }\n@media (max-width: 640px) {\n    #wholeWindow { padding: 8px; }\n    #wholeWindow #configWindow { max-height: calc(100dvh - 16px); }\n    #wholeWindow .rin-settings-header { padding: 6px 8px 6px 10px; }\n    #wholeWindow .rin-masterbar, #wholeWindow .rin-settings-footer { padding: 8px 10px; }\n    #wholeWindow .rin-settings-panel { padding: 8px 8px 10px; }\n    #wholeWindow .rin-settings-nav button { padding: 7px 9px; font-size: 10px; }\n    #wholeWindow .rin-setting { gap: 4px 10px; padding: 7px 8px; }\n    #wholeWindow .rin-setting > select { width: 46%; font-size: 10px; }\n    #wholeWindow .rin-config-status { padding: 5px 10px; }\n    #wholeWindow #rin-preview-badge { display: none; }\n}\n@media (max-width: 390px) {\n    #wholeWindow .rin-setting:has(> select) { align-items: stretch; flex-direction: column; gap: 5px; }\n    #wholeWindow .rin-setting > select { width: 100%; max-width: none; }\n    #wholeWindow .rin-help-link span { display: none; }\n    #wholeWindow .rin-language { width: 100%; justify-content: space-between; }\n}\n" };
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
            "friend_buttons": "Friend button below author details",
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
            "friend_buttons": "Кнопка дружбы под сведениями об авторе",
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
        const postAuthors = Array.from(post.querySelectorAll('.postauthor')).filter(node =>
            !node.closest('.postbody, .quotecontent, .signature') && node.closest('table.tablebg, .post') === post);
        if (postAuthors.length !== 1) continue;
        // The body may contain nested tables. Use its outer row's profile cell, not the footer's Top cell.
        const profilePanel = Array.from(post.querySelectorAll('td.profile')).find(cell =>
            cell.closest('table.tablebg, .post') === post && !cell.querySelector('.postauthor, .postbody') &&
            Array.from(cell.parentElement.cells || []).some(sibling => sibling !== cell && sibling.querySelector('.postbody')));
        if (!profilePanel) continue;
        const profiles = Array.from(post.querySelectorAll('a[href]')).filter(link => {
            if (link.closest('.postbody, .quotecontent, .signature') || link.closest('table.tablebg, .post') !== post) return false;
            const url = rinLiveNativeUrl(link.getAttribute('href'), 'memberlist.php');
            return url?.searchParams.get('mode') === 'viewprofile' &&
                /^[1-9]\d*$/.test(url.searchParams.get('u')) && url.searchParams.get('u') !== '1';
        });
        const profile = profiles.find(link => link.querySelector('img[src*="icon_user_profile"]')) || profiles[0];
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
        let button = post.querySelector('.rin-friend-button');
        if (!button) {
            button = author.ownerDocument.createElement('a');
            button.target = '_blank';
            button.rel = 'noopener';
        }
        let action = profilePanel.querySelector('.rin-friend-action');
        if (!action) {
            action = author.ownerDocument.createElement('div');
            action.className = 'rin-friend-action';
            profilePanel.append(action);
        }
        action.append(button);
        button.className = 'rin-friend-button btnlite';
        button.href = url.href;
        button.title = rinText(isFriend ? 'Remove friend' : 'Add friend');
        button.textContent = button.title;
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
        button.className = 'rin-pm-quote';
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

/* exported startInlineChat */
// The native chat refuses framing (CSP frame-ancestors 'none' / X-Frame-Options: DENY).
// Use its existing DOM and Ajax protocol without evaluating downloaded scripts.
function stopInlineChat(container) {
    const state = container.rinChatState;
    if (!state) return;
    state.closed = true;
    clearTimeout(state.timer);
    state.controller?.abort();
    document.removeEventListener('visibilitychange', state.visibility);
    const toggle = document.getElementById('rin-chat-toggle');
    if (toggle && state.editor) toggle.rinChatDraft = state.editor.value;
}

function prepareChatFragment(root, url) {
    root.querySelectorAll('script, iframe, object, embed, link, meta, base').forEach(node => node.remove());
    for (const node of [root, ...root.querySelectorAll('*')]) {
        if (node.nodeType !== 1) continue;
        // Retain only the native delete action as data, then replace its inline handler.
        const deletion = node.getAttribute('onclick')?.match(/^\s*delete_post\(['"](\d+)['"]\)\s*;?\s*$/);
        if (deletion) { node.dataset.rinChatDelete = deletion[1]; node.setAttribute('href', '#'); }
        if (/^p\d+$/.test(node.id)) node.dataset.rinChatId = node.id.slice(1);
        if (node.id) node.id = 'rin-chat-' + node.id;
        if (node.hasAttribute('for')) node.setAttribute('for', 'rin-chat-' + node.getAttribute('for'));
        for (const attribute of Array.from(node.attributes)) {
            if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
            if (['href', 'src', 'action'].includes(attribute.name)) {
                try {
                    const target = new URL(attribute.value, url);
                    if (!['http:', 'https:'].includes(target.protocol)) node.removeAttribute(attribute.name);
                    else if (!deletion || attribute.name !== 'href') node.setAttribute(attribute.name, target.href);
                } catch { node.removeAttribute(attribute.name); }
            }
        }
        if (node.tagName === 'FORM') node.removeAttribute('name');
    }
    return root;
}

function parseChatReply(text) {
    // Delimiters are top-level text between native message/online divs. Parse only
    // that text, so a user's "---123---" inside a message cannot become metadata.
    const body = parseForumDocument(text).body;
    const elements = Array.from(body.children);
    const framing = Array.from(body.childNodes, node => node.nodeType === 1 ? '\uFFFC' : node.nodeType === 3 ? node.textContent : '').join('');
    const match = framing.match(/^([\s\uFFFC]*)---\s*(\d+)\s*(?:---([\s\uFFFC]*)---\s*(\d+)\s*---\s*(\d+)\s*---\s*(\d*)\s*)?$/);
    if (!match) throw new Error('Unexpected chat response');
    const messageCount = match[1].split('\uFFFC').length - 1;
    if (elements.slice(0, messageCount).some(node => !/^p\d+$/.test(node.id))) throw new Error('Unexpected chat messages');
    return { html: elements.slice(0, messageCount).map(node => node.outerHTML).join(''), lastId: match[2],
        online: match[3] === undefined ? undefined : elements.slice(messageCount).map(node => node.outerHTML).join(''), lastTime: match[4],
        delay: match[5] === undefined ? undefined : Number(match[5]) * 1000, postTime: match[6] || undefined };
}

function scheduleChatRead(state) {
    clearTimeout(state.timer);
    if (state.closed || document.hidden || state.failed || !state.messages) return;
    state.timer = setTimeout(() => { void requestChat(state, 'read'); }, state.delay);
}

function chatFailure(state, message) {
    if (state.closed) return;
    clearTimeout(state.timer);
    state.failed = true;
    state.status.textContent = rinText(message);
    state.status.hidden = false;
    state.retry.hidden = false;
}

async function startInlineChat(container, url) {
    stopInlineChat(container);
    const actions = document.createElement('div'); actions.className = 'rin-chat-actions';
    const link = document.createElement('a');
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener';
    link.title = rinText('Open full chat'); link.setAttribute('aria-label', link.title);
    link.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6M17 3l-9 9M8 4H4v12h12v-4"/></svg>';
    const retry = document.createElement('button'); retry.type = 'button'; retry.hidden = true;
    retry.title = rinText('Retry'); retry.setAttribute('aria-label', retry.title);
    retry.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 8a6 6 0 1 0 0 5M16 3v5h-5"/></svg>';
    actions.append(retry, link);
    const status = document.createElement('p'); status.className = 'rin-chat-status';
    status.setAttribute('role', 'status'); status.textContent = rinText('Loading...');
    const content = document.createElement('div'); content.className = 'rin-chat-content';
    container.replaceChildren(actions, status, content);
    const state = { container, url, status, retry, content, closed: false, pending: false,
        timer: null, controller: new AbortController(), delay: 15000, failed: false };
    container.rinChatState = state;
    retry.addEventListener('click', () => {
        if (!state.messages) { void startInlineChat(container, url); return; }
        state.failed = false; retry.hidden = true;
        void requestChat(state, 'read');
    });
    state.visibility = () => {
        clearTimeout(state.timer);
        if (document.hidden) {
            if (state.pendingMode === 'read') state.controller?.abort();
        } else if (!state.pending && !state.failed) scheduleChatRead(state);
    };
    document.addEventListener('visibilitychange', state.visibility);
    try {
        const page = await fetchForumDocument(url.href, state.controller.signal);
        if (state.closed) return;
        const nativeMessages = page.getElementById('chat');
        const nativeTable = nativeMessages?.closest('table');
        if (!nativeTable) {
            chatFailure(state, 'Chat is unavailable. Open the full chat to sign in or check your access.');
            return;
        }
        const runtime = Array.from(page.scripts).find(script => /\bfunction\s+handle_send\s*\(/.test(script.textContent))?.textContent || '';
        const filename = runtime.match(/\bxmlHttp\.open\(\s*["']POST["']\s*,\s*(['"])([^'"]+)\1/);
        if (filename) {
            const target = new URL(filename[2].replace(/&amp;/g, '&'), url);
            if (target.origin === url.origin && target.pathname === url.pathname && !target.username && !target.password) {
                if (url.searchParams.has('lang') && !target.searchParams.has('lang')) target.searchParams.set('lang', url.searchParams.get('lang'));
                state.url = target;
            }
        }
        const number = (key, fallback) => runtime.match(new RegExp('\\bvar\\s+' + key + '\\s*=\\s*[\'"]?(\\d+)'))?.[1] || fallback;
        state.lastId = number('last_id', String(Math.max(0, ...Array.from(nativeMessages.children, item => Number(item.id.match(/^p(\d+)$/)?.[1]) || 0))));
        state.lastTime = number('last_time', '0');
        state.postTime = number('post_time', '0');
        state.delay = Math.max(15000, Number(number('read_interval', '15000')));
        const table = document.importNode(nativeTable, true);
        state.messages = table.querySelector('#chat');
        state.online = table.querySelector('#whois_online');
        state.editor = table.querySelector('form [name="message"]');
        state.form = state.editor?.closest('form');
        prepareChatFragment(table, state.url);
        content.append(table);
        if (state.editor) state.editor.value = document.getElementById('rin-chat-toggle')?.rinChatDraft || '';
        state.form?.addEventListener('submit', event => {
            event.preventDefault();
            if (state.editor.value.trim()) void requestChat(state, 'add');
        });
        content.addEventListener('click', event => {
            const control = event.target.closest('[data-rin-chat-delete]');
            if (!control || !content.contains(control)) return;
            event.preventDefault();
            void requestChat(state, 'delete', control.dataset.rinChatDelete);
        });
        status.hidden = true;
        scheduleChatRead(state);
    } catch (error) {
        if (error.name !== 'AbortError') chatFailure(state, 'Unable to update chat. Retry or open the full chat.');
    }
}

function updateChatMessages(state, reply) {
    const parsed = parseForumDocument(reply.html);
    const entries = Array.from(parsed.body.children).filter(node => /^p\d+$/.test(node.id));
    if (reply.html.trim() && !entries.length) throw new Error('Missing chat messages');
    const added = entries.filter(node => !Array.from(state.messages.children).some(existing => existing.dataset.rinChatId === node.id.slice(1)))
        .map(node => prepareChatFragment(document.importNode(node, true), state.url));
    const scroller = state.content;
    const previousTop = scroller.scrollTop;
    const previousHeight = scroller.scrollHeight;
    state.messages.prepend(...added);
    if (previousTop > 0) scroller.scrollTop = previousTop + scroller.scrollHeight - previousHeight;
    state.lastId = reply.lastId;
    if (reply.online !== undefined) {
        if (state.online) {
            const online = parseForumDocument(reply.online);
            prepareChatFragment(online.body, state.url);
            state.online.replaceChildren(...Array.from(online.body.childNodes, node => document.importNode(node, true)));
        }
        state.lastTime = reply.lastTime;
        if (reply.postTime !== undefined) state.postTime = reply.postTime;
        state.delay = Math.max(15000, reply.delay);
        const seconds = state.content.querySelector('#rin-chat-update_seconds');
        if (seconds) seconds.textContent = String(state.delay / 1000);
    }
}

async function requestChat(state, mode, messageId) {
    if (state.closed || state.pending) return;
    clearTimeout(state.timer);
    const parameters = new URLSearchParams({ mode, last_id: state.lastId,
        last_time: state.lastTime, last_post: state.postTime, read_interval: String(state.delay) });
    const draft = state.editor?.value;
    if (mode === 'add') {
        if (!draft?.trim() || !state.form) return;
        for (const [name, value] of new FormData(state.form)) parameters.append(name, value);
        const submit = state.form.querySelector('[type="submit"][name]');
        if (submit) parameters.append(submit.name, submit.value);
    }
    if (mode === 'delete') parameters.set('chat_id', messageId);
    state.pending = true; state.pendingMode = mode; state.controller = new AbortController();
    const buttons = Array.from(state.form?.querySelectorAll('[type="submit"]') || []);
    buttons.forEach(button => { button.disabled = true; });
    try {
        const response = await fetch(state.url.href, { method: 'POST', credentials: 'same-origin',
            body: parameters, signal: state.controller.signal });
        if (!response.ok) throw new Error(`Chat HTTP ${response.status}`);
        const text = await response.text();
        if (state.closed) return;
        if (mode === 'delete') {
            // Native deletion returns an empty body. A login/error page must never hide a message.
            if (text.trim()) throw new Error('Unexpected deletion response');
            Array.from(state.messages.children).find(node => node.dataset.rinChatId === messageId)?.remove();
        } else if (mode !== 'read' || text.trim()) {
            // Native reads can return an empty body when nothing has changed.
            // Only add responses need a parsed acknowledgement before clearing the draft.
            updateChatMessages(state, parseChatReply(text));
            if (mode === 'add' && state.editor.value === draft) state.editor.value = '';
        }
        state.failed = false; state.status.hidden = true; state.retry.hidden = true;
    } catch (error) {
        if (error.name !== 'AbortError') chatFailure(state, mode === 'read'
            ? 'Unable to update chat. Retry or open the full chat.'
            : 'Unable to confirm the action. Check the full chat before trying again.');
    } finally {
        state.pending = false; state.pendingMode = null;
        buttons.forEach(button => { button.disabled = false; });
        scheduleChatRead(state);
    }
}

// END BUNDLED ASSETS
