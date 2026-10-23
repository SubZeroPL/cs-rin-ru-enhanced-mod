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
