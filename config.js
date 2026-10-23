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
        "friend_buttons": "Friend buttons beside Profile / PM",
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
        "friend_buttons": "Кнопки друзей рядом с профилем и ЛС",
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
