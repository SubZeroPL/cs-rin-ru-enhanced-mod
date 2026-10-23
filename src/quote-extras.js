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
