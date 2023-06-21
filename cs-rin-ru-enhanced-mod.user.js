/* eslint-env jquery */

// ==UserScript==
// @name            CS.RIN.RU Enhanced
// @name:fr         CS.RIN.RU Amélioré
// @name:pt         CS.RIN.RU Melhorado
// @namespace       Royalgamer06
// @version         0.7.16
// @description     Enhance your experience at CS.RIN.RU - Steam Underground Community.
// @description:fr  Améliorez votre expérience sur CS.RIN.RU - Steam Underground Community.
// @description:pt  Melhorar a sua experiência no CS.RIN.RU - Steam Underground Community.
// @author          Royalgamer06 (modified by SubZeroPL)
// @match           *://cs.rin.ru/forum/*
// @match           *://csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion/forum/*
// @require         https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @icon            https://i.ibb.co/p1k6cq6/image.png
// @grant           GM_addStyle
// @grant           GM_xmlhttpRequest
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_deleteValue
// @grant           GM_notification
// @run-at          document-idle
// @homepageURL     https://github.com/SubZeroPL/cs-rin-ru-enhanced-mod
// @supportURL      https://cs.rin.ru/forum/viewtopic.php?f=14&t=75717
// @updateURL       https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/cs-rin-ru-enhanced-mod.user.js
// @downloadURL     https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/cs-rin-ru-enhanced-mod.user.js

// ==/UserScript==

/*
Creator: Royalgamer06 (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=477885)
Contributor: SubZeroPL (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=505897) who has now taken over the project
Contributor: Redpoint (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1365721) has created some functionality
Contributor: Altansar (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1280185) has created some functionality
Contributor: Mandus (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1487447) has created the original function to copy the link from a message
*/

const CONFIG_PAGE = "https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/config.html"

const AJAX_LOADER = `
<div style="margin-left: 50%;">
    <img
        id="ajaxload"
        src="https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/loading.gif"
        style="opacity: 0.5; position: fixed; width: 40px; height: 40px; z-index: 2147483647; display: none;"  alt="Loading"/>
</div>`;

const FORUM_NAME = 'CS.RIN.RU - Steam Underground Community';

function getBaseUrl() {
    let path = window.location.origin + window.location.pathname;
    let base = path.slice(0, path.lastIndexOf('/') + 1);
    return base ?? 'https://cs.rin.ru/forum/';
}

const FORUM_BASE_URL = getBaseUrl();

//Contains the list of friends
const FRIENDS_LIST = [];

//Retrieve friends list
async function retrievesFriendsLists() {
    await fetch(FORUM_BASE_URL + "ucp.php?i=zebra&mode=friends")
        .then(response => response.text())
        .then(text => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html");
            FRIENDS_LIST.push(...Array.from(doc.querySelector('#ucp > table > tbody > tr:nth-child(3) > td.row2 > select').children, node => node.innerText));
        });
}

/*
Configuration array with default values.
*/
let options = {
    "script_enabled": true,
    "infinite_scrolling": true,
    "mentioning": true,
    "dynamic_function": true,
    "colorize_friends": true,
    "colorize_new_messages": true,
    "colorize_the_page": true,
    "display_ajax_loader": true,
    "custom_tags": true,
    "hide_scs": 0, // 0=not hide, 1=hide all, 2=hide only green, 3=show only red
    "apply_in_scs": false,
    "title_format": "%C %S - %T", // %C: CS.RIN.RU - Steam Underground Community •, %S: Section title (e.g. View topic), %T: Page title, %RT Page title without tags
    "topic_preview": false,
    "topic_preview_timeout": 5, // in seconds
    "steam_db_link": true,
    "copy_link_button": true,
    "add_small_shoutbox": true,
    "add_users_tag": true,
    "go_to_unread_posts": 1 //0= dont go, 1=go to, 2=go to + preview
};

function loadConfig() {
    const savedOptions = GM_getValue("options", options);
    options = {...options, ...savedOptions};
}

loadConfig();

window.addEventListener("message", receiveConfigMessage, false);

function receiveConfigMessage(event) {
    options = JSON.parse(event.data);
    GM_setValue("options", options);
    GM_notification("Configuration saved", "Info");
}

function loadConfigButton() {
    GM_xmlhttpRequest({
        url: CONFIG_PAGE, onerror: (r) => {
            console.log("Error loading config page: " + r);
            GM_notification("Error loading config page: " + r, "Error");
        }, onload: (r) => {
            $("body").append(r.responseText);
            $("input#script_enabled")[0].checked = options.script_enabled;
            $("input#infinite_scrolling")[0].checked = options.infinite_scrolling;
            $("input#mentioning")[0].checked = options.mentioning;
            $("input#steam_db_link")[0].checked = options.steam_db_link;
            $("input#copy_link_button")[0].checked = options.copy_link_button;
            $("input#dynamic_function")[0].checked = options.dynamic_function;
            $("input#colorize_friends")[0].checked = options.colorize_friends;
            $("input#colorize_new_messages")[0].checked = options.colorize_new_messages;
            $("input#colorize_the_page")[0].checked = options.colorize_the_page;
            $("input#display_ajax_loader")[0].checked = options.display_ajax_loader;
            $("input#custom_tags")[0].checked = options.custom_tags;
            $("input#add_small_shoutbox")[0].checked = options.add_small_shoutbox;
            $("input#add_users_tag")[0].checked = options.add_users_tag;
            $("select#go_to_unread_posts")[0].options.selectedIndex = options.go_to_unread_posts;
            $("select#hide_scs")[0].options.selectedIndex = options.hide_scs;
            $("input#apply_in_scs")[0].checked = options.apply_in_scs;
            $("input#title_format")[0].value = options.title_format;
            $("input#topic_preview")[0].checked = options.topic_preview;
            $("input#topic_preview_timeout")[0].value = options.topic_preview_timeout;

            if (!options.script_enabled) {
                $("fieldset#config").hide();
            }
        }
    });
}

loadConfigButton();

if (!options.script_enabled) return;

// Navigation bar
let navBar = $("[title='Click to jump to page…']").parent().parent().first()[0]; // Gets the first navigation bar
if (navBar) {
    const td = document.createElement("td"); // Necessary for search.php
    td.setAttribute("class", "gensmall"); // Necessary for search.php
    td.setAttribute("name", "page_nav"); // Makes it easier for the GM_addStyle function
    td.setAttribute("width", "500"); // Standardised width
    td.innerHTML = navBar.innerHTML; // Copy the navigation bar
    navBar.parentNode.replaceChild(td, navBar); // Replace the existing navigation bar with the modified one
    const ancestor = $(td).closest("#pagecontent, #pageheader"); // #pagecontent for viewforum.php, #pageheader for viewtopic.php
    if (ancestor.length) {
        $("#pagecontent").before(td);
    } else {
        $("[method='post']:not(#search)").get(0).before(td); // For search.php, memberlist.php
    }

    GM_addStyle(`[name="page_nav"] {
        position: sticky !important;
        top: 0px;
        width: 500px;
        background: linear-gradient(90deg, black 90%, transparent 95%);
    }`);
}

if (options.display_ajax_loader) {
    $("body").prepend(AJAX_LOADER);
    $.ajaxSetup({
        async: true, beforeSend: function () {
            if ($("#ajaxload")) $("#ajaxload").show();
        }, complete: function () {
            if ($("#ajaxload")) $("#ajaxload").hide();
        }
    });
}

/*
Originally made by RoyalGamer06
Infinite scroll in both directions made by Redpoint
Reply button added by Altansar
INFINITE SCROLLING
*/
if ($("[title='Click to jump to page…']").length > 0 && options.infinite_scrolling) {
    let selector = "#pagecontent > table.tablebg > tbody > tr:has(.row4 > img:not([src*=global], [src*=announce], [src*=sticky]))"; //viewforum.php
    if ($(selector).length === 0) selector = "#wrapcentre > form > table.tablebg > tbody > tr[valign='middle']"; //search.php
    if ($(selector).length === 0) selector = "#pagecontent > form > table.tablebg > tbody > tr:not(:first)"; //inbox
    if ($(selector).length === 0) selector = "#pagecontent > .tablebg:not(:has(tbody > tr > .cat))"; //viewtopic.php
    const navElem = $("[title='Click to jump to page…']").first().parent();
    let nextElem = $(navElem).find("strong").next().next();
    if (URLContains("viewtopic.php")) {
        if (nextElem.length !== 0) //If we're not on the last page
        {
            $("[title='Subscribe topic']").first().parents().eq(7).after($(".cat:has(.btnlite)").parent().parent().parent());
            $("[title='Reply to topic']").last().parents().eq(4).remove();
        }
    } else if (!URLContains("ucp.php")) {
        $(selector).parent().prepend($(".cat:has(.btnlite)").parent());
    }
    if (nextElem.length === 1) { //If there is a next page
        let nextPage = $(nextElem).attr("href");
        let ajaxDone = true;
        $(document).scroll(function () {
            if (window.innerHeight + window.scrollY + 1500 >= document.body.scrollHeight && nextElem.length > 0 && ajaxDone) {
                ajaxDone = false;
                $.get(nextPage, function (data) {
                    let page = $(selector, data);
                    $(page[0]).find("tbody:first").find("tr:first").remove();
                    $(selector).last().after(page);
                    $(navElem).html($("[title='Click to jump to page…']", data).first().parent().html());
                    functionsCalledByInfiniteScrolls(data);
                    nextElem = $(navElem).find("strong").next().next();
                    nextPage = $(nextElem).attr("href");
                    if (nextElem.length === 0 && URLContains("viewtopic.php")) { //if you're on the last page and on viewtopic
                        const originalElement = document.querySelector("#pagecontent > table:nth-child(1)");
                        const copiedElement = originalElement.cloneNode(true);
                        document.querySelector("#pagecontent").appendChild(copiedElement);
                        //Retrieve the correct nav
                        const element = document.getElementsByClassName("nav")[3];
                        // Replace the first number with the second in the HTML code
                        element.querySelector('strong:nth-child(1)').innerHTML = element.querySelector('strong:nth-child(2)').textContent;
                    }
                    ajaxDone = true;
                });
            }
        });
    }

    let prevElem = $(navElem).find("strong").prev().prev();
    if (prevElem.length === 1) { //If there is a prev page
        let prevPage = $(prevElem).attr("href");
        let ajaxDone = true;
        // set a variable to store the scroll position
        let scrollPos = 0;
        // set a variable to store the scroll duration
        let scrollDur = 0;
        // set a variable to store the threshold for logging
        const scrollThresh = 1000; // in milliseconds
        // add an event listener for the wheel event
        window.addEventListener("wheel", function (e) {
            // get the current scroll position
            const currPos = window.scrollY || window.document.documentElement.scrollTop;
            // check if the user is at the top of the page
            if (currPos === 0) {
                // check if the user tries to scroll upwards
                if (e.deltaY < 0) {
                    // increase the scroll duration
                    scrollDur += Math.abs(e.deltaY);
                    // check if the scroll duration exceeds the threshold
                    if (scrollDur >= scrollThresh && prevElem.length > 0 && ajaxDone) {
                        ajaxDone = false;
                        $.get(prevPage, function (data) {
                            let element = $(selector);
                            $(element[0]).find("tbody:first").find("tr:first").remove();
                            $($(selector)[0]).before($(selector, data));
                            let top = $(element[0]).offset().top + $(element[0]).height();
                            const scrollPosition = top - $(window).height();
                            $('html, body').animate({scrollTop: scrollPosition}, 0);
                            $(navElem).html($("[title='Click to jump to page…']", data).first().parent().html());
                            functionsCalledByInfiniteScrolls(data);
                            prevElem = $(navElem).find("strong").prev().prev();
                            prevPage = $(prevElem).attr("href");
                            if (URLContains("viewtopic.php")) {
                                //Retrieve the correct nav
                                const element = document.getElementsByClassName("nav")[0];
                                element.querySelector('strong:nth-child(1)').innerHTML = $(navElem).find("strong").text();
                            }
                            ajaxDone = true;
                        });
                        scrollDur = 0;
                    }
                } else {
                    // reset the scroll duration
                    scrollDur = 0;
                }
            } else {
                // reset the scroll duration
                scrollDur = 0;
            }
            // update the scroll position
            scrollPos = currPos;
        });
    }
}

function functionsCalledByInfiniteScrolls(data) {
    dynamicFunction(data);
    mentionify();
    tagify();
    hideScs();
    setupTopicPreview();
    addLink();
    steamDBLink();
    goToUnreadPosts();
    colorizeFriends();
}


// CUSTOM TAGS
tagify();
hideScs();

// MENTIONING
if (URLContains("posting.php" && "do=mention") && options.mentioning) {
    // const p = URLParam("p");
    const u = URLParam("u");
    const a = URLParam("a");
    const postBody = `@[url=${FORUM_BASE_URL}memberlist.php?mode=viewprofile&u=${u}]${a}[/url], `;
    $("[name=message]").val(postBody);
}
mentionify();

/*
Originally made by RoyalGamer06.
Changes made by Altansar to avoid ban ip
*/
let intervalID;

function allDynamicFunction() {
    if (options.dynamic_function) { //If dynamic function is active
        // set up event listener for visibility change
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") { //If the page becomes visible
                dynamicFunction();
                startUpdating();
            } else { //If the page is not visible
                clearInterval(intervalID); //We stop the counter for the update
            }
        });
        // run on initial pageload
        if (document.visibilityState === "visible") { //If the page is visible
            startUpdating();
        }
    }
}

allDynamicFunction();

function startUpdating() {
    intervalID = setInterval(function () {
        dynamicFunction();
    }, 60000);
}

function dynamicFunction(data) {
    if (data == null) {
        $.get(location.href, function (data) { //Every 60 seconds we update time and user list
            dynamicFunction(data);
        });
    }
    //Call every 60seconds as well as when using infinite scroll
    $("#datebar .gensmall+ .gensmall").html($("#datebar .gensmall+ .gensmall", data).html()); //Time
    $("#wrapcentre > .tablebg").last().html($("#wrapcentre > .tablebg", data).last().html()); //Users
    $("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(2)").html($("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(2)", data).html()); //Message
    changeColorOfNewMessage();//Colorize messages
    colorizeFriends();
    if (URLContains("viewtopic.php")) { //Dynamics posts
        /*
        var actualPostsOnThePage = $("#pagecontent > .tablebg:not(:first, :last)").length;
        var postsOnThePageAfterActualisation = $("#pagecontent > .tablebg:not(:first, :last)", data).length;
        var differenceBetweenBoth=postsOnThePageAfterActualisation-actualPostsOnThePage;
        //W.I.P
        */
        //I don't know what I tried to do, but I don't think it's a good solution.
    }
}

// FUNCTIONS
function mentionify() {
    if ($(".postbody").length > 0 && URLContains("viewtopic.php") && options.mentioning) {
        const replyLink = $("[title='Reply to topic']").parent().attr("href");
        $(".gensmall div+ div:not(:has([title='Reply with mentioning']))").each(function () {
            const postElem = $(this).parents().eq(7);
            const postID = $(postElem).find("a[name]").attr("name").slice(1);
            const author = $(postElem).find(".postauthor").text();
            const authorID = $(postElem).find("[title=Profile]").parent().attr("href").split("u=")[1];
            $(this).append("<a href='" + replyLink + "&do=mention&p=" + postID + "&u=" + authorID + "&a=" + encodeURIComponent(author) + "'><img src='https://i.imgur.com/uTA0dBI.png' alt='Reply with mentioning' title='Reply with mentioning'></a>");
        });
    }
}

function tagify() {
    if (options.custom_tags) {
        $(".titles, .topictitle").each(function () {
            const titleElem = this;
            if (titleElem.id !== "colorize") {
                titleElem.id = "colorize";
                const tags = $(titleElem).text().match(/\[([^\]]+)]/g);
                if (tags) {
                    tags.forEach(function (tag) {
                        const color = colorize(tag);
                        titleElem.innerHTML = titleElem.innerHTML.replace(tag, "<span style='color:" + color + ";'>[</span><span style='color:" + color + ";font-size: 0.9em;'>" + tag.replace(/[\[\]]/g, "") + "</span><span style='color:" + color + ";'>]</span>");
                    });
                }
            }
        });
    }
}

// 0=not hide, 1=hide all, 2=hide only green, 3=show only red
function hideScs() {
    if (options.hide_scs > 0 && (options.apply_in_scs || $("a.titles").html() !== "Steam Content Sharing")) {
        let regex;
        switch (options.hide_scs) {
            case 1:
                regex = /topic_tags\/scs_/;
                break;
            case 2:
                regex = /topic_tags\/scs_on/;
                break;
            case 3:
                regex = /topic_tags\/scs_[oy][^f]/;
                break;
        }
        $(".topictitle img").each(function () {
            if (this.src.match(regex)) {
                this.parentElement.parentElement.parentElement.style.display = "none";
            }
        });
    }
}

function colorize(str) {
    let lstr = str.toLowerCase();
    let hash = 0;
    for (let i = 0; i < lstr.length; i++) {
        hash = lstr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16);
    return '#' + color.padStart(6, '0');
}

function URLContains(match) {
    return window.location.href.indexOf(match) > -1;
}

function URLParam(name) {
    return (location.search.split(name + '=')[1] || '').split('&')[0];
}

/*
Made by SubZeroPL
%RT added by Altansar
Remade to apply to all pages by Redpoint
*/
function setupPageTitle() {
    const currentTitle = document.title;
    const cs = currentTitle.split("•")[0] + " •";
    const remainder = currentTitle.substring(currentTitle.indexOf("•") + 1);
    const fullTitle = remainder.split(/[-•]/);
    let sectionTitle;
    let pageTitle;
    if (fullTitle.length === 1) {
        sectionTitle = "";
        pageTitle = $("a.titles").length > 0 ? $("a.titles").text() : fullTitle[0].trim();

    } else {
        sectionTitle = fullTitle[0].trim();
        pageTitle = $("a.titles").length > 0 ? $("a.titles").text() : fullTitle[1].trim();
    }
    const pageTitleWithoutTags = pageTitle.replace(/\[[^\]]*]/g, '');
    document.title = options.title_format
        .replace("%C", cs)
        .replace("%S", sectionTitle)
        .replace("%T", pageTitle)
        .replace("%RT", pageTitleWithoutTags);
}

setupPageTitle();


/*
Made by SubZeroPL
displays preview of first post from topic that mouse cursor points
*/
function setupTopicPreview() {
    if (!options.topic_preview) return;
    $("a.topictitle").each((_, e) => {
        const topic = $(e)[0];
        let tid;
        $(topic).off("mouseover").on("mouseover", () => {
            showPreview = true;
            $("div#topic_preview").hide();
            tid = setTimeout(() => {
                if (!showPreview) return;
                const previewWidth = window.innerWidth * 0.75;
                const previewHeight = window.innerHeight * 0.75;
                const x = (window.innerWidth / 2) - (previewWidth / 2);
                const y = (window.innerHeight / 2) - (previewHeight / 2) + window.scrollY;
                let link = topic.href;
                if (options.go_to_unread_posts === 1) link = link.substring(0, link.length - 19);
                GM_xmlhttpRequest({
                    url: link, onerror: (r) => {
                        console.log("Error loading page: " + r);
                    }, onload: (r) => {
                        const parser = new DOMParser();
                        const dom = parser.parseFromString(r.responseText, "text/html").body.children;
                        const body = $(dom).find("div#pagecontent table.tablebg")[1].outerHTML;
                        // Use custom parseHTML function instead of $.parseHTML
                        const bodyObj = parser.parseFromString(body, "text/html").body.children[0];
                        if ($("div#topic_preview").length > 0) {
                            const tip = $("div#topic_preview");
                            tip.html(bodyObj);
                            tip.css('left', `${x}px`);
                            tip.css('top', `${y}px`);
                            tip.css('width', `${previewWidth}px`);
                            tip.css('height', `${previewHeight}px`);
                            tip.show();
                            tip.scrollTop(0);
                        } else {
                            const tip = document.createElement('div');
                            tip.id = "topic_preview";
                            tip.appendChild(bodyObj);
                            tip.style.position = "absolute";
                            tip.style.top = `${y}px`;
                            tip.style.left = `${x}px`;
                            tip.style.width = `${previewWidth}px`;
                            tip.style.maxWidth = `${previewWidth}px`;
                            tip.style.height = `${previewHeight}px`;
                            tip.style.maxHeight = `${previewHeight}px`;
                            tip.style.overflow = "auto";
                            $("body").append(tip);
                            $(tip).on("mouseleave", () => {
                                $(tip).hide();
                                clearTimeout(tid);
                            });
                        }
                        addUsersTag();
                        steamDBLink();
                    }
                });
            }, options.topic_preview_timeout * 1000);
        });
        $(topic).off("mouseleave").on("mouseleave", () => {
            showPreview = false;
            clearTimeout(tid);
        });
    });
}

setupTopicPreview();

/*
Made by Redpoint
And adapted for cs.rin.ru enhanced by Altansar
*/
function addUsersTag() {
    if (options.add_users_tag) {
        const steamLink = $('a[href^="https://store.steampowered.com/app/"], a[href^="http://store.steampowered.com/app/"]').first()[0];
        if (steamLink != null) {
            if ($(":contains('Genre(s):')").filter((i, e) => $(e).text() === "Genre(s):").length > 0) { // If we are on the game presentation page
                // Get the link to the Steam game page
                const link = steamLink.href;
                // Send a request to the Steam game page and bypass CSP
                GM_xmlhttpRequest({
                    method: "GET", url: link, onload: function (response) {
                        // Parse the response as HTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, "text/html");
                        // Get the genre tags from the response
                        const tags = doc.querySelectorAll("#glanceCtnResponsiveRight > div.glance_tags_ctn.popular_tags_ctn > div.glance_tags.popular_tags > a.app_tag");
                        // Extract the text content of each tag and join them with a comma and a space
                        const genres = Array.from(tags).map(tag => tag.textContent.trim()).join(", ");
                        // Modify the original page by adding a new line with the genres
                        const br = $('span[style="font-weight: bold"]:contains("Genre(s):")').next()[0];
                        const span = document.createElement("span");
                        span.style.fontWeight = "bold";
                        span.textContent = "User-defined Tag(s): ";
                        const text = document.createTextNode(genres);
                        br.parentNode.insertBefore(document.createElement("br"), br);
                        br.parentNode.insertBefore(span, br);
                        br.parentNode.insertBefore(text, br);
                    }
                });
            }
        }
    }
}

addUsersTag()

/*
Originally made by Altansar
Completely remade by Redpoint
*/
function steamDBLink() {
    if (!options.steam_db_link || this.value === "Show") {
        return;
    }

    let postlinks = document.getElementsByClassName("postlink");
    if (postlinks.length === 0) {
        return;
    }
    for (let i = 0; i < postlinks.length; i++) {
        let steamLink = postlinks[i].href;
        if (steamLink.match("://store.steampowered.com/app")) {
            let slash = steamLink.endsWith('/');
            steamLink = slash ? steamLink.slice(0, -1) : steamLink;

            let splits = steamLink.split("/");
            if (splits[splits.length - 1].match(/^[0-9]+$/)) {
                steamLink = splits[splits.length - 1];
            } else if (splits[splits.length - 2].match(/^[0-9]+$/)) {
                steamLink = splits[splits.length - 2];
            }

            let DBlink = `https://steamdb.info/app/${steamLink}${slash ? '/' : ''}`;
            let j = i;
            while ((j + 1 < postlinks.length) && (postlinks[j].getBoundingClientRect().y === postlinks[j + 1].getBoundingClientRect().y) && (postlinks[j].nextSibling !== null && postlinks[j].nextSibling.tagName !== "BR")) {
                j++;
            }

            if ((j + 1 === postlinks.length) || !postlinks[j + 1].text.match(DBlink)) {
                postlinks[j].insertAdjacentHTML("afterend", "<a href=" + DBlink + " class=\"postlink\" rel=\"nofollow\">" + DBlink + "</a>"); // Write the link (right part)
                postlinks[j].insertAdjacentHTML("afterend", "<br><span style=\"font-weight: bold\">  <svg version=\"1.1\" width=\"1.3em\" height=\"1.3em\" viewBox=\"0 0 128 128\" fill=#bbbbbb class=\"octicon octicon-steamdb\" aria-hidden=\"true\"><path fill-rule=\"evenodd\" d=\"M63.9 0C30.5 0 3.1 11.9.1 27.1l35.6 6.7c2.9-.9 6.2-1.3 9.6-1.3l16.7-10c-.2-2.5 1.3-5.1 4.7-7.2 4.8-3.1 12.3-4.8 19.9-4.8 5.2-.1 10.5.7 15 2.2 11.2 3.8 13.7 11.1 5.7 16.3-5.1 3.3-13.3 5-21.4 4.8l-22 7.9c-.2 1.6-1.3 3.1-3.4 4.5-5.9 3.8-17.4 4.7-25.6 1.9-3.6-1.2-6-3-7-4.8L2.5 38.4c2.3 3.6 6 6.9 10.8 9.8C5 53 0 59 0 65.5c0 6.4 4.8 12.3 12.9 17.1C4.8 87.3 0 93.2 0 99.6 0 115.3 28.6 128 64 128c35.3 0 64-12.7 64-28.4 0-6.4-4.8-12.3-12.9-17 8.1-4.8 12.9-10.7 12.9-17.1 0-6.5-5-12.6-13.4-17.4 8.3-5.1 13.3-11.4 13.3-18.2 0-16.5-28.7-29.9-64-29.9zm22.8 14.2c-5.2.1-10.2 1.2-13.4 3.3-5.5 3.6-3.8 8.5 3.8 11.1 7.6 2.6 18.1 1.8 23.6-1.8s3.8-8.5-3.8-11c-3.1-1-6.7-1.5-10.2-1.5zm.3 1.7c7.4 0 13.3 2.8 13.3 6.2 0 3.4-5.9 6.2-13.3 6.2s-13.3-2.8-13.3-6.2c0-3.4 5.9-6.2 13.3-6.2zM45.3 34.4c-1.6.1-3.1.2-4.6.4l9.1 1.7a10.8 5 0 1 1-8.1 9.3l-8.9-1.7c1 .9 2.4 1.7 4.3 2.4 6.4 2.2 15.4 1.5 20-1.5s3.2-7.2-3.2-9.3c-2.6-.9-5.7-1.3-8.6-1.3zM109 51v9.3c0 11-20.2 19.9-45 19.9-24.9 0-45-8.9-45-19.9v-9.2c11.5 5.3 27.4 8.6 44.9 8.6 17.6 0 33.6-3.3 45.2-8.7zm0 34.6v8.8c0 11-20.2 19.9-45 19.9-24.9 0-45-8.9-45-19.9v-8.8c11.6 5.1 27.4 8.2 45 8.2s33.5-3.1 45-8.2z\"></path></svg> SteamDB:</span> "); // Write left part
            }
        }
    }
}

steamDBLink();

/*
Originally made by mandus
Modified and adapted for cs.rin.ru enhanced by Altansar based on mandus and Royalgamer06 code
*/
function addLink() {
    if ($(".postbody").length > 0 && URLContains("viewtopic.php") && options.copy_link_button) {
        // const replyLink = $("[title='Reply to topic']").parent().attr("href");
        $(".gensmall div+ div:not(:has([title='Copy the link into the clipboard']))").each(function () {
            const postElem = $(this).parents().eq(7);
            const postId = $(postElem).find("a[name]").attr("name").slice(1);
            $(this).append("<a href='javascript:void(0);'><img src='https://i.imgur.com/WlKpJzR.png' alt='Copy the link into the clipboard' title='Copy the link into the clipboard'>");
            const bar = this;
            $(this).find('[title="Copy the link into the clipboard"]').on("click", function () {
                const url = FORUM_BASE_URL + `viewtopic.php?p=${postId}#p${postId}`;
                navigator.clipboard.writeText(url);
                const copied = $('<span class="copied">Copied!</span>');
                const child = $(bar).find("[href='javascript:void(0);']");
                copied.css({
                    'position': 'absolute',
                    'top': child.offset().top - copied.outerHeight() - 20,
                    'left': child.offset().left + (child.outerWidth() / 2) - (copied.outerWidth() / 2) - 12
                });
                $('body').append(copied);
                setTimeout(function () {
                    copied.fadeOut();
                }, 2000);
            });

        });
    }
}

addLink();

/*
Originally made by Redpoint
And adapted for cs.rin.ru enhanced by Altansar
*/
function AddShoutbox() {
    if (options.add_small_shoutbox && !URLContains("chat.php")) {
        // Create a button to show/hide chat
        let button = document.createElement("button");
        button.innerHTML = "Show Chat";
        //button.style.cssText = "position: fixed; bottom: 0%; right: 0%; width: 5%; height: 3%;";
        button.style.cssText = "position: fixed; bottom: 0%; right: 0%; min-height: 40px; min-width: 50px; width: 5%; height: 3%; z-index: 9999;";
        button.addEventListener("click", function () {
            if (document.getElementById("chatDiv") === null) {
                button.innerHTML = "Hide Chat";
                createChatContainer();
                fetchChat();
                GM_setValue("chatActive", true)

            } else {
                document.getElementById("chatDiv").remove();
                button.innerHTML = "Show Chat";
                GM_setValue("chatActive", false)
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (document.getElementById("chatDiv") !== null) {
                const script = document.getElementById("chatDiv").children[1];
                if (document.hidden) {
                    script.setAttribute("data-original-text", script.textContent);
                    script.textContent = "";
                } else {
                    script.textContent = script.getAttribute("data-original-text");
                    script.removeAttribute('data-original-text');
                }
            }
        });
        document.body.appendChild(button);
        const isChatActive = GM_getValue("chatActive", false);
        if (isChatActive) { //open the chat if it was open when last used
            button.click();
        }
    }
}

AddShoutbox();

/*
Made by Altansar
*/
function createChatContainer() {
    // Create a container for the chat
    let chatContainer = document.createElement("div");
    chatContainer.style.cssText = "position: fixed; bottom: 0%; right: 0%; width: 25%; min-width: 425px; height: 70%; overflow-y: scroll; background-color:#1c1c1c; border:0.5em solid black";
    chatContainer.id = "chatDiv";
    document.body.appendChild(chatContainer);
    //Loading text
    const loading = document.createTextNode("Loading...");
    const p = document.createElement("p");
    p.appendChild(loading);
    chatContainer.appendChild(p);
    p.style.cssText = "position: absolute; left: 0; right: 0; top: 20%; transform: translateY(-50%); text-align: center; color: white; font-size: 500%;";
}


/*
Made by Redpoint
*/
function fetchChat() {
    fetch(FORUM_BASE_URL + "chat.php")
        .then(response => response.text())
        .then(text => {
            let chatContainer = document.getElementById("chatDiv");
            chatContainer.innerHTML = "";
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html");
            let originalScript = doc.querySelector("#wrapcentre > script");
            let chatElement = doc.querySelector("#wrapcentre > div > table > tbody");
            if (chatElement) {
                chatContainer.appendChild(chatElement);
            }
            chatContainer.style.backgroundColor = "#1c1c1c";
            let script = document.createElement("script");
            script.innerHTML = originalScript.innerHTML;
            chatContainer.appendChild(script);
        })
        .then(() => {
            colorizeFriends();
        });
}

/*
Made by Altansar
*/
function goToUnreadPosts() {
    if (options.go_to_unread_posts >= 1) {
        document.querySelectorAll(".titles:not(:first-child), .topictitle").forEach(element => {
            if (element.getAttribute('href').substring(element.getAttribute('href').length - 19) !== '&view=unread#unread') { //If we don't already have added unread
                element.setAttribute('href', element.getAttribute('href') + "&view=unread#unread")
            }
        });
    }
}

goToUnreadPosts();

/*
Made by Altansar
*/
function changeColorOfNewMessage() {
    if (options.colorize_new_messages) {
        const menuBar = document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(2)");
        if (!menuBar.text.startsWith(" 0 new messages")) { //If we have a new messages
            menuBar.style.color = "red"; // We colorize in the color wanted by users
        } else {
            menuBar.style.color = "#AAAAAA"; // We decolorize the messages
        }
    }
}

changeColorOfNewMessage();

function colorizeThePages() {
    if (options.colorize_the_page) {
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(1) > a:nth-child(1)").style.color = "#FFA07A" // Forum Rules
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(1) > a:nth-child(2)").style.color = "#FFC200" // Donate
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(2) > a:nth-child(1)").style.color = "#98FB98" // Chat
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(2) > a:nth-child(2)").style.color = "#90EE90" // FAQ
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(2) > a:nth-child(3)").style.color = "#4169E1" // Members
        document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(1)").style.color = "#87CEEB" // User Control Panel
        document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2) > a:nth-child(1)").style.color = "#87CEFA" // Search
        document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2) > a:nth-child(2)").style.color = "#FF0000" // Logout
        document.querySelector("#logodesc > table > tbody > tr > td:nth-child(2) > h1").style.color = '#' + Math.floor(Math.random() * 16777215).toString(16); // Random colour for the title
    }
}

colorizeThePages();

//Color friends pink
async function colorizeFriends() {
    if(options.colorize_friends) {
        //Add legends friends
        if(URLContains("index.php")) {
            if(document.querySelectorAll(".gensmall")[3].lastElementChild.text!=="Friends") {
                const friends = document.createElement('a');
                friends.setAttribute('href', './ucp.php?i=zebra&mode=friends');
                friends.style.color = '#f4169b';
                friends.innerText = 'Friends';
                const selector = document.querySelectorAll(".gensmall")[3];
                selector.append(", ");
                selector.append(friends);
            }
        }
        //Colorize friends
        await retrievesFriendsLists();
        const links = document.querySelectorAll("a[href^='./memberlist.php'], .postauthor, .gen");
        links.forEach(link => {
            if(FRIENDS_LIST.includes(link.innerText)) {
                link.id="colorize";
                link.style.color='#f4169b';
            }
        });
    }
}
colorizeFriends();
