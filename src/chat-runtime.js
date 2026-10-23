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
    const scroller = state.messages.parentElement;
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
