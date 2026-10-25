# ![Icon of CS.RIN.RU](https://i.ibb.co/zXtW7WD/csrinfavicon32.png) CS RIN RU Enhanced mod
![License](https://img.shields.io/badge/License-UNLICENSE-red) ![Release](https://img.shields.io/github/v/release/SubZeroPL/cs-rin-ru-enhanced-mod) ![OS](https://img.shields.io/badge/OS-Windows%2FmacOS%2FLinux-green)

Enhance your experience at CS.RIN.RU

**v2.0 test branch:** this is `2.0.0-beta.9`. Install this branch using the link below; its automatic updates follow `v2.0`.

The visual redesign is limited to the chat and settings. Existing forum controls retain their original appearance; new friend actions use the forum's native button style below the author's details.

Official forum topic: https://cs.rin.ru/forum/viewtopic.php?f=14&t=75717

## 🔧 Original features
- Enable or disable any of the features in script code.
- Mention somebody when posting (mentioning).
- Dynamically load next pages when browsing the site (infinite_scrolling).
- ~~Dynamically refresh the current time (dynamic_time).~~
- ~~Dynamically refresh Who Is Online (dynamic_who_is_online).~~
- See when something is dynamically loading (display_ajax_loader).
- Custom topic tags (custom_tags).

## 🆕 Added features
- SCS topics filtering (hide_scs).
- Filtering also in SCS section (apply_in_scs).
- Compact forum-styled configuration window with reading, reply, community and search tabs. Open it with the gear icon at the top right, in its original position.
- English and Russian interface (`ui_language`): follow the forum language automatically or choose one in settings. Forum controls are identified by URLs and markup rather than translated labels.
- Option to enable/disable whole script (script_enabled).
- Option for custom title formatting (title_format).
- One custom mention format (mentioning), used in both the quick reply panel and the full editor. Use `%m` for the username, `%u` for the profile URL and `%p` for the post URL. The default is `[b][url=%u]%m[/url][/b], [url=%p]post[/url]`: a bold, clickable name followed by a link to the post. Edit the template to choose what is included, or leave the field empty to disable mentions.
- Topic preview. When checked displays preview of first post from topic that mouse cursor points to with configurable delay (topic_preview).
- Add missing SteamDB links to older posts using the forum's `SteamDB Page:` label (steam_db_link). Existing SteamDB links are preserved without duplication.
- Copy the link of a message (copy_link_button).
- Include forum and topic IDs in native post links and copied post links (full_path_post_links, enabled by default), including on pages loaded by infinite scrolling and in previews. Links inside post text are left unchanged because they can refer to other topics.
- Link quote headers to the original post (add_link_quote). Quotes use valid BBCode with a Source link; the script moves that link to the header for readers with this option enabled, including in previews and dynamically loaded posts. Other readers keep the Source link in the quote body.
- Collapse quotes without changing native spoilers or code blocks inside them (collapse_quotes). Nested quotes keep independent toggles, and loading more posts preserves their open/closed state. Show all spoilers leaves collapsed quotes unchanged.
- Quote only the selected text within a message using its native Quote button. Without a selection, quoting works normally. Quick replies retain the existing draft; opening the full editor transfers the selection for that quote only.
- Add several quotes from private-message history to the current reply without losing the draft or nested BBCode. Each history message gets an Add quote to reply button.
- Forum-styled Show Chat toggle (add_small_shoutbox). The panel uses the forum's native chat requests directly, because the forum blocks iframes. Closing it stops its background activity and preserves the draft for reopening on the same page.
- Adds popular user tags below the official steam tags under a game presentation (add_users_tag).
- Goes to unread posts directly by clicking on a topic title (go_to_unread_posts).
- Dynamically refresh: the current time, who is online, received messages (dynamic_function).
- Add new posts on the last loaded topic page and new topics on the first loaded forum page using the same refresh request (dynamic_content). Existing posts, drafts and expanded spoilers are preserved. If posts move to a new page, a link is shown. Updates pause in hidden tabs; HTTP 429 stops automatic refresh until a later reload.
- Add/remove friend buttons below the author's details in the profile column (friend_buttons), using the forum's native button style and confirmation screen.
- Colors messages in red if you have an unread message (colorize_new_messages).
- Colorize several elements on the page (colorize_the_page).
- Colorize your friends for easy recognition (colorize_friends_me).
- Add a button to access your profile (add_profile_button).
- Verification that the user is connected or not. If he is not, he disables the functions that need to be connected.
- Adds a special search bar configurable in settings, with topic/forum searches available even when arriving through a direct post link (special_search)

## 🧑‍🤝‍🧑 Other related projects
- [CS.RIN.RU-Enhanced-external](https://github.com/Altansar69/CS.RIN.RU-Enhanced-external) - Other script containing everything related to cs.rin.ru but acting on other sites (Steam, SteamDB etc...)

## 📅 TODO (planned features):
see: [issues](https://github.com/SubZeroPL/cs-rin-ru-enhanced-mod/issues)

## 🔨 Installation:
1) Download a script extension like [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2) Click [Install the v2.0 test userscript](https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/v2.0/cs-rin-ru-enhanced-mod.user.js) and confirm installation in your userscript manager.

**Notes:** The script supports automatic updates, which means you don't have to download it again each time it's updated.

*Developed & tested with [Violentmonkey](https://violentmonkey.github.io/) and [Tampermonkey](https://www.tampermonkey.net/)\* on [Firefox](https://www.mozilla.org/) and Chromium ([Brave](https://brave.com/)).*  
\**On some browsers, you may need to [activate developer mode](https://www.quora.com/How-do-I-enable-developer-mode-in-Google-Chrome) to run usescripts via Tampermonkey.*

## 🔢 Versioning
This project is following [semantic versioning schema](https://semver.org/).

## Development

The userscript and settings use native browser APIs without jQuery. Settings HTML, CSS, JavaScript and action icons are bundled locally; opening settings does not fetch assets from GitHub.

After editing `config.html`, `config.css`, `config.js`, or a module in `src/`, run `npm run build` to update the generated block in `cs-rin-ru-enhanced-mod.user.js`. Edit the main runtime above that block directly.

Run `npm test`, `npm run lint` and `npm run build:check` before distributing the userscript. Tests use native phpBB-style DOM fixtures with mocked requests. Account actions and the chat still need a final check in a userscript manager while signed in.

Open `config.html` locally to preview the settings. Preview saves only to its own browser storage and does not change forum preferences.

## 🤝 Credits
- [RoyalGamer06](https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=477885) - Has created the original project (now retired)
- [SubZeroPL](https://github.com/SubZeroPL) - Has taken over the project
- [Reddiepoint](https://github.com/Reddiepoint) - Recurring developer
- [Altansar69](https://github.com/Altansar69) - Recurring developer

*Special thanks to:*
- [odusi](https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=582752) - Created the original special search bar and quick post function
- [mandus](https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1487447) - Create the original copy link function

## 📄 License
This software is under the Unlicense, terms of which are available in [UNLICENSE.txt](UNLICENSE.txt])
