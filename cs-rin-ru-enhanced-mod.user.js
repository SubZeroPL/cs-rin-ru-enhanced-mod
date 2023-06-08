/* eslint-env jquery */

// ==UserScript==
// @name         CS.RIN.RU Enhanced (Reddiepoint)
// @name:fr      CS.RIN.RU Amélioré
// @namespace    Royalgamer06
// @version      0.6.4
// @description  Enhance your experience at CS.RIN.RU - Steam Underground Community.
// @description:fr  Améliorez votre expérience sur CS.RIN.RU - Steam Underground Community.
// @author       Royalgamer06 (modified by SubZeroPL)
// @match        *://cs.rin.ru/forum/*
// @match        *://csrinrutkb3tshptdctl5lyei4et35itl22qvk5ktdcat6aeavy6nhid.onion/forum/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @run-at       document-idle
// @homepageURL  https://github.com/SubZeroPL/cs-rin-ru-enhanced-mod
// @supportURL   https://cs.rin.ru/forum/viewtopic.php?f=14&t=75717
// @updateURL    https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/cs-rin-ru-enhanced-mod.user.js
// @downloadURL  https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/cs-rin-ru-enhanced-mod.user.js

// ==/UserScript==

/*
Creator: Royalgamer06 (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=477885)
Contributor: SubZeroPL (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=505897) who has now taken over the project
Contributor: Altansar (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1280185) has created some functionality
Contributor: Redpoint (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1365721) has created some functionality
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
    return base ?? 'http://cs.rin.ru/forum/';
}
const FORUM_BASE_URL = getBaseUrl();

/*
Configuration array with default values.
*/
let options = {
    "script_enabled": true,
    "infinite_scrolling": true,
    "mentioning": true,
    "dynamic_function": true,
    "display_ajax_loader": true,
    "custom_tags": true,
    "hide_scs": 0, // 0=not hide, 1=hide all, 2=hide only green, 3=show only red
    "apply_in_scs": false,
    "topic_title_format": "%F • View topic - %T", // %F - forum name, %T - topic title, %RT - topic title without tags in square brackets
    "topic_preview": false,
    "topic_preview_timeout": 5, // in seconds
    "steam_db_link": true,
    "copy_link_button": true,
    "add_small_shoutbox": true,
    "add_users_tag": true,
    "go_to_unread_posts": true
};

function loadConfig() {
    var savedOptions = GM_getValue("options", options);
    options = { ...options, ...savedOptions };
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
        url: CONFIG_PAGE,
        onerror: (r) => {
            console.log("Error loading config page: " + r);
            GM_notification("Error loading config page: " + r, "Error");
        },
        onload: (r) => {
            $("body").append(r.responseText);
            $("input#script_enabled")[0].checked = options.script_enabled;
            $("input#infinite_scrolling")[0].checked = options.infinite_scrolling;
            $("input#mentioning")[0].checked = options.mentioning;
            $("input#steam_db_link")[0].checked = options.steam_db_link;
            $("input#copy_link_button")[0].checked = options.copy_link_button;
            $("input#dynamic_function")[0].checked = options.dynamic_function;
            $("input#display_ajax_loader")[0].checked = options.display_ajax_loader;
            $("input#custom_tags")[0].checked = options.custom_tags;
            $("input#add_small_shoutbox")[0].checked = options.add_small_shoutbox;
            $("input#add_users_tag")[0].checked = options.add_users_tag;
            $("input#go_to_unread_posts")[0].checked = options.go_to_unread_posts;
            $("select#hide_scs")[0].options.selectedIndex = options.hide_scs;
            $("input#apply_in_scs")[0].checked = options.apply_in_scs;
            $("input#topic_title_format")[0].value = options.topic_title_format;
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
        $("#pageheader").after(td);
    } else {
        $("[method='post']").get(1).before(td); // For search.php and memberlist.php
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
        async: true,
        beforeSend: function () {
            if ($("#ajaxload")) $("#ajaxload").show();
        },
        complete: function () {
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
        if(nextElem.length!==0) //If we're not on the last page
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
                    dynamicFunction(data);
                    mentionify();
                    tagify();
                    hideScs();
                    setupTopicPreview();
                    addLink();
                    steamdbLink();
                    nextElem = $(navElem).find("strong").next().next();
                    nextPage = $(nextElem).attr("href");
                    if(nextElem.length===0&&URLContains("viewtopic.php")) { //if you're on the last page and on viewtopic
                        var originalElement = document.querySelector("#pagecontent > table:nth-child(1)");
                        var copiedElement = originalElement.cloneNode(true);
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

    const prevElem = $(navElem).find("strong").prev().prev();
    if (prevElem.length === 1) { //If there is a prev page
        let prevPage = $(prevElem).attr("href");
        let ajaxDone = true;
        $(document).scroll(function () {
            // set a variable to store the scroll position
            var scrollPos = 0;
            // set a variable to store the scroll duration
            var scrollDur = 0;
            // set a variable to store the threshold for logging
            var scrollThresh = 1000; // 10 clicks of the scroll wheel - each scroll is 100
            // add an event listener for the wheel event
            window.addEventListener("wheel", function(e) {
                // get the current scroll position
                var currPos = window.pageYOffset || window.document.documentElement.scrollTop;
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
                                var scrollPosition = $(element[1]).offset().top - $(window).height();
                                $('html, body').animate({scrollTop: scrollPosition}, 0);
                                $(navElem).html($("[title='Click to jump to page…']", data).first().parent().html());
                                dynamicFunction(data);
                                mentionify();
                                tagify();
                                hideScs();
                                setupTopicPreview();
                                addLink();
                                steamdbLink();
                                prevElem = $(navElem).find("strong").prev().prev();
                                prevPage = $(prevElem).attr("href");
                                if(URLContains("viewtopic.php")) {
                                    //Retrieve the correct nav
                                    const element = document.getElementsByClassName("nav")[0];
                                    element.querySelector('strong:nth-child(1)').innerHTML = $(navElem).find("strong").text();
                                }
                                ajaxDone = true;
                            });
                            scrollDur = 0;
                        }
                    }
                    else {
                        // reset the scroll duration
                        scrollDur = 0;
                    }
                }
                else {
                    // reset the scroll duration
                    scrollDur = 0;
                }
                // update the scroll position
                scrollPos = currPos;
            });
        });
    }
}

// CUSTOM TAGS
tagify();
hideScs();

// MENTIONING
if (URLContains("posting.php" && "do=mention") && options.mentioning) {
    const p = URLParam("p");
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
var intervalID;
function allDynamicFunction() {
    if(options.dynamic_function) { //If at least one dynamic function is active
        // set up event listener for visibility change
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") { //If the page becomes visible
                dynamicFunctionWithoutData();
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
        dynamicFunctionWithoutData();
    }, 60000);
}

function dynamicFunction(data) { //Call every 60seconds as well as when using infinite scroll
    $("#datebar .gensmall+ .gensmall").html($("#datebar .gensmall+ .gensmall", data).html()); //Time
    $("#wrapcentre > .tablebg").last().html($("#wrapcentre > .tablebg", data).last().html()); //Users
    $("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(2) > strong").html($("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(2) > strong", data).html()); //Message
    if(URLContains("viewtopic.php")) { //Dynamics posts
        /*
        var actualPostsOnThePage = $("#pagecontent > .tablebg:not(:first, :last)").length;
        var postsOnThePageAfterActualisation = $("#pagecontent > .tablebg:not(:first, :last)", data).length;
        var differenceBetweenBoth=postsOnThePageAfterActualisation-actualPostsOnThePage;
        //W.I.P
        */
        //I don't know what I tried to do, but I don't think it's a good solution.
    }
}

function dynamicFunctionWithoutData() {
    $.get(location.href, function (data) { //Every 60 seconds we update time and user list
            dynamicFunction(data);
        });
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
            if(titleElem.id !== "colorize")
            {
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
            case 1: regex = /topic_tags\/scs_/;
                break;
            case 2: regex = /topic_tags\/scs_on/;
                break;
            case 3: regex = /topic_tags\/scs_[oy][^f]/;
                break;
        }
        $(".topictitle img").each(function () {
            if (this.src.match(regex))
            {
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
*/
function setupPageTitle() {
    const currentTitle = document.title;
    // CS.RIN.RU - Steam Underground Community • View topic - Suggestion = forum setting (bookmark)
    if (currentTitle.indexOf("View topic") > -1) { // only change titles for topic pages
        const topicTitle = $("a.titles").text();
        const topicTitleWithoutTag = topicTitle.replace(/\[.*?]/g, '').trim();
        const format = options.topic_title_format;
        document.title = format.replace('%F', FORUM_NAME).replace('%T', topicTitle).replace('%RT', topicTitleWithoutTag);
    }
}
setupPageTitle();

let showPreview = true;
let tid = 0;

/*
Made by SubZeroPL
displays preview of first post from topic that mouse cursor points
*/
function setupTopicPreview() {
    if (!options.topic_preview) return;
    $("a.topictitle").each((_, e) => {
        const topic = $(e)[0];
        $(topic).on("mouseover", (m) => {
            showPreview = true;
            $("div#topic_preview").hide();
            tid = setTimeout(() => {
                if (!showPreview) return;
                const previewWidth = window.innerWidth * 0.75;
                const previewHeight = window.innerHeight * 0.75;
                const x = (window.innerWidth / 2) - (previewWidth / 2);
                const y = (window.innerHeight / 2) - (previewHeight / 2) + window.pageYOffset;
                GM_xmlhttpRequest({
                    url: topic.href,
                    onerror: (r) => {
                        console.log("Error loading page: " + r);
                    },
                    onload: (r) => {
                        const dom = $.parseHTML(r.responseText);
                        const body = $(dom).find("div#pagecontent table.tablebg")[1].outerHTML;
                        const bodyObj = $.parseHTML(body)[0];
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
                    }
                });
            }, options.topic_preview_timeout * 1000);
        });
        $(topic).on("mouseleave", () => {
            showPreview = false;
            clearTimeout(tid);
        });
    });
}
setupTopicPreview();

/*
Made by Altansar
*/
function steamdbLinkSpoiler() { //Calls the function every time a spoiler is unfolded
    if(options.steam_db_link) {
        var elements = document.querySelectorAll('button[type="button"],input[type="submit"], input[type="button"], input[value="show"]');
        for(var elementNumber = 0 ;elementNumber < elements.length; ++elementNumber) {
            elements[elementNumber].addEventListener("click", steamdbLink);
        }
    }
}
steamdbLinkSpoiler();

/*
Made by Altansar
in urgent need of a makeover
*/
function steamdbLink() {
    if(this.value === "Show") { //If the text is in a spoiler
        return;
    }
    if (options.steam_db_link) {
        var allLinkOnPage=false;
        if(document.getElementsByClassName("postlink").length !== 0) {
            for(let i=-1; allLinkOnPage === false; i++) { //crosses all the links of the page
                do {
                    i++;
                    if(i === document.getElementsByClassName("postlink").length) {
                        allLinkOnPage=true;
                    }
                }
                while(!allLinkOnPage&&(document.getElementsByClassName("postlink")[i].text.match("://store.steampowered.com/app")==null)); //until you find a steam link or until you have made all the links
                if(!allLinkOnPage) {
                    var slash=false;
                    var steamLink = document.getElementsByClassName("postlink")[i].href;
                    // https://store.steampowered.com/app/1916310/Remnant_Records/
                    if(steamLink.endsWith('/')) {
                        steamLink=steamLink.slice(0,-1);
                        slash=true;
                        //https://store.steampowered.com/app/1916310/Remnant_Records
                    }
                    if(steamLink.substr(steamLink.length-2).match(/[^0-9]/g)) {steamLink=steamLink.substr(0,steamLink.lastIndexOf('/'))}
                    //https://store.steampowered.com/app/1916310
                    var DBlink= "https://steamdb.info/app/" + steamLink.substring(steamLink.lastIndexOf('/')+1);
                    var DBlinkWithoutSlash=DBlink;
                    if(slash === true) {DBlink+='/'} //add the '/' at the end of the link only if it was present in the Steam link. Sorry I'm a maniac, it stresses me to see 2 links close and 1 with the / and the other not)
                    if(document.getElementsByClassName("postlink")[i+1] !== undefined) {
                        for(;(document.getElementsByClassName("postlink")[i].getBoundingClientRect().y === document.getElementsByClassName("postlink")[i+1].getBoundingClientRect().y);) {i++;} //in case there are several links behind the steam link exemple: https://cs.rin.ru/forum/viewtopic.php?f=10&t=97673
                        if(document.getElementsByClassName("postlink")[i+1].text.match(DBlinkWithoutSlash)==null) { //we display the SteamDB link only if it is not already displayed just below the steam link exemple: https://cs.rin.ru/forum/viewtopic.php?f=22&t=59381&hilit=request+thread&start=9787 (message of Cazzarola)
                            document.getElementsByClassName("postlink")[i].insertAdjacentHTML("afterend","<a href=" + DBlink + " class=\"postlink\" rel=\"nofollow\">" + DBlink + "</a>"); //Write the link (right part)
                            document.getElementsByClassName("postlink")[i].insertAdjacentHTML("afterend","<br><span style=\"font-weight: bold\">  <svg version=\"1.1\" width=\"1.3em\" height=\"1.3em\" viewBox=\"0 0 128 128\" fill=#bbbbbb class=\"octicon octicon-steamdb\" aria-hidden=\"true\"><path fill-rule=\"evenodd\" d=\"M63.9 0C30.5 0 3.1 11.9.1 27.1l35.6 6.7c2.9-.9 6.2-1.3 9.6-1.3l16.7-10c-.2-2.5 1.3-5.1 4.7-7.2 4.8-3.1 12.3-4.8 19.9-4.8 5.2-.1 10.5.7 15 2.2 11.2 3.8 13.7 11.1 5.7 16.3-5.1 3.3-13.3 5-21.4 4.8l-22 7.9c-.2 1.6-1.3 3.1-3.4 4.5-5.9 3.8-17.4 4.7-25.6 1.9-3.6-1.2-6-3-7-4.8L2.5 38.4c2.3 3.6 6 6.9 10.8 9.8C5 53 0 59 0 65.5c0 6.4 4.8 12.3 12.9 17.1C4.8 87.3 0 93.2 0 99.6 0 115.3 28.6 128 64 128c35.3 0 64-12.7 64-28.4 0-6.4-4.8-12.3-12.9-17 8.1-4.8 12.9-10.7 12.9-17.1 0-6.5-5-12.6-13.4-17.4 8.3-5.1 13.3-11.4 13.3-18.2 0-16.5-28.7-29.9-64-29.9zm22.8 14.2c-5.2.1-10.2 1.2-13.4 3.3-5.5 3.6-3.8 8.5 3.8 11.1 7.6 2.6 18.1 1.8 23.6-1.8s3.8-8.5-3.8-11c-3.1-1-6.7-1.5-10.2-1.5zm.3 1.7c7.4 0 13.3 2.8 13.3 6.2 0 3.4-5.9 6.2-13.3 6.2s-13.3-2.8-13.3-6.2c0-3.4 5.9-6.2 13.3-6.2zM45.3 34.4c-1.6.1-3.1.2-4.6.4l9.1 1.7a10.8 5 0 1 1-8.1 9.3l-8.9-1.7c1 .9 2.4 1.7 4.3 2.4 6.4 2.2 15.4 1.5 20-1.5s3.2-7.2-3.2-9.3c-2.6-.9-5.7-1.3-8.6-1.3zM109 51v9.3c0 11-20.2 19.9-45 19.9-24.9 0-45-8.9-45-19.9v-9.2c11.5 5.3 27.4 8.6 44.9 8.6 17.6 0 33.6-3.3 45.2-8.7zm0 34.6v8.8c0 11-20.2 19.9-45 19.9-24.9 0-45-8.9-45-19.9v-8.8c11.6 5.1 27.4 8.2 45 8.2s33.5-3.1 45-8.2z\"></path></svg> SteamDB:</span> "); //write left part
                        }
                    }
                    else {
                        document.getElementsByClassName("postlink")[i].insertAdjacentHTML("afterend","<a href=" + DBlink + " class=\"postlink\" rel=\"nofollow\">" + DBlink + "</a>"); //Write the link (right part)
                        document.getElementsByClassName("postlink")[i].insertAdjacentHTML("afterend","<br><span style=\"font-weight: bold\">  <svg version=\"1.1\" width=\"1.3em\" height=\"1.3em\" viewBox=\"0 0 128 128\" fill=#bbbbbb class=\"octicon octicon-steamdb\" aria-hidden=\"true\"><path fill-rule=\"evenodd\" d=\"M63.9 0C30.5 0 3.1 11.9.1 27.1l35.6 6.7c2.9-.9 6.2-1.3 9.6-1.3l16.7-10c-.2-2.5 1.3-5.1 4.7-7.2 4.8-3.1 12.3-4.8 19.9-4.8 5.2-.1 10.5.7 15 2.2 11.2 3.8 13.7 11.1 5.7 16.3-5.1 3.3-13.3 5-21.4 4.8l-22 7.9c-.2 1.6-1.3 3.1-3.4 4.5-5.9 3.8-17.4 4.7-25.6 1.9-3.6-1.2-6-3-7-4.8L2.5 38.4c2.3 3.6 6 6.9 10.8 9.8C5 53 0 59 0 65.5c0 6.4 4.8 12.3 12.9 17.1C4.8 87.3 0 93.2 0 99.6 0 115.3 28.6 128 64 128c35.3 0 64-12.7 64-28.4 0-6.4-4.8-12.3-12.9-17 8.1-4.8 12.9-10.7 12.9-17.1 0-6.5-5-12.6-13.4-17.4 8.3-5.1 13.3-11.4 13.3-18.2 0-16.5-28.7-29.9-64-29.9zm22.8 14.2c-5.2.1-10.2 1.2-13.4 3.3-5.5 3.6-3.8 8.5 3.8 11.1 7.6 2.6 18.1 1.8 23.6-1.8s3.8-8.5-3.8-11c-3.1-1-6.7-1.5-10.2-1.5zm.3 1.7c7.4 0 13.3 2.8 13.3 6.2 0 3.4-5.9 6.2-13.3 6.2s-13.3-2.8-13.3-6.2c0-3.4 5.9-6.2 13.3-6.2zM45.3 34.4c-1.6.1-3.1.2-4.6.4l9.1 1.7a10.8 5 0 1 1-8.1 9.3l-8.9-1.7c1 .9 2.4 1.7 4.3 2.4 6.4 2.2 15.4 1.5 20-1.5s3.2-7.2-3.2-9.3c-2.6-.9-5.7-1.3-8.6-1.3zM109 51v9.3c0 11-20.2 19.9-45 19.9-24.9 0-45-8.9-45-19.9v-9.2c11.5 5.3 27.4 8.6 44.9 8.6 17.6 0 33.6-3.3 45.2-8.7zm0 34.6v8.8c0 11-20.2 19.9-45 19.9-24.9 0-45-8.9-45-19.9v-8.8c11.6 5.1 27.4 8.2 45 8.2s33.5-3.1 45-8.2z\"></path></svg> SteamDB:</span> "); //write left part
                    }

                }
            }
        }
    }
}
steamdbLink();

/*
Originally made by mandus
Modified and adapted for cs.rin.ru enhanced by Altansar based on mandus and Royalgamer06 code
*/
function addLink()
{
    if ($(".postbody").length > 0 && URLContains("viewtopic.php") && options.copy_link_button) {
        const replyLink = $("[title='Reply to topic']").parent().attr("href");
        $(".gensmall div+ div:not(:has([title='Copy the link into the clipboard']))").each(function () {
            const postElem = $(this).parents().eq(7);
            const postId = $(postElem).find("a[name]").attr("name").slice(1);
            $(this).append("<a href='javascript:void(0);'><img src='https://i.imgur.com/WlKpJzR.png' alt='Copy the link into the clipboard' title='Copy the link into the clipboard'>");
            $(this).on("click", function() {
                const url = FORUM_BASE_URL + `viewtopic.php?p=${postId}#p${postId}`;
                navigator.clipboard.writeText(url);
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
    if(options.add_small_shoutbox&&!URLContains("chat.php")) {
        // Create a button to show/hide chat
        let button = document.createElement("button");
        button.innerHTML = "Show Chat";
        //button.style.cssText = "position: fixed; bottom: 0%; right: 0%; width: 5%; height: 3%;";
        button.style.cssText ="position: fixed; bottom: 0%; right: 0%; width: 5%; height: 3%; z-index: 9999;";
        button.addEventListener("click", function() {
            if (document.getElementById("chatDiv")===null) {
                button.innerHTML = "Hide Chat";
                createChatContainer();
                fetchChat();
                GM_setValue ("chatActive", true)

            } else {
                document.getElementById("chatDiv").remove();
                button.innerHTML = "Show Chat";
                GM_setValue ("chatActive", false)
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
        var isChatActive = GM_getValue ("chatActive", false)
        if(isChatActive) { //open the chat if it was open when last used
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
    chatContainer.style.cssText = "position: fixed; bottom: 0%; right: 0%; width: 25%; height: 70%; overflow-y: scroll; background-color:#1c1c1c; border:0.5em solid black";
    chatContainer.id="chatDiv";
    document.body.appendChild(chatContainer);
    //Loading text
    var loading = document.createTextNode("Loading...");
    var p = document.createElement("p");
    p.appendChild(loading);
    chatContainer.appendChild(p);
    p.style.position = "absolute";
    p.style.left = "0";
    p.style.right = "0";
    p.style.top = "20%";
    p.style.transform = "translateY(-50%)";
    p.style.textAlign = "center";
    p.style.color = "white";
    p.style.fontSize = "500%";
}

/*
Made by Redpoint
*/
function fetchChat() {
    fetch(FORUM_BASE_URL+"chat.php")
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
    });
}

/*
Made by Redpoint
And adapted for cs.rin.ru enhanced by Altansar
*/
function addUsersTag()
{
    if(options.add_users_tag) {
        let child = 3;
        if(options.infinite_scrolling) {
            child++;
        }
        if(document.querySelector("#pagecontent > table:nth-child("+child+") > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > div > a:nth-child(10)")!=null) {
            if(document.querySelector("#pagecontent > table:nth-child("+child+") > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > div > a:nth-child(10)").nextElementSibling.nextElementSibling.textContent==='Genre(s):'
               ||document.querySelector("#pagecontent > table:nth-child("+child+") > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > div > a:nth-child(10)").nextElementSibling.nextElementSibling.textContent==='   SteamDB:') { //if we are on the game presentation page
                // Get the link to the Steam game page
                var link = document.querySelector("#pagecontent > table:nth-child("+child+") > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > div > a:nth-child(10)").href;
                // Send a request to the Steam game page and bypass CSP
                GM_xmlhttpRequest({
                    method: "GET",
                    url: link,
                    onload: function(response) {
                        // Parse the response as HTML
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(response.responseText, "text/html");
                        // Get the genre tags from the response
                        var tags = doc.querySelectorAll("#glanceCtnResponsiveRight > div.glance_tags_ctn.popular_tags_ctn > div.glance_tags.popular_tags > a.app_tag");
                        // Extract the text content of each tag and join them with a comma and a space
                        var genres = Array.from(tags).map(tag => tag.textContent.trim()).join(", ");
                        // Modify the original page by adding a new line with the genres
                        var br = document.querySelector("#pagecontent > table:nth-child("+child+") > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td > div > br:nth-child(16)");
                        var span = document.createElement("span");
                        span.style.fontWeight = "bold";
                        span.textContent = "User-defined Tag(s): ";
                        var text = document.createTextNode(genres);
                        br.parentNode.insertBefore(document.createElement("br"), br);
                        br.parentNode.insertBefore(span, br);
                        br.parentNode.insertBefore(text, br);
                    }
                });
            }
        }
    }
}
addUsersTag();

/*
Made by Altansar
*/
function goToUnreadPosts() {
    if(options.go_to_unread_posts&&URLContains("viewforum.php")) {
        document.querySelectorAll("#pagecontent > table.tablebg > tbody > tr > td:nth-child(1 of .row1) > a.topictitle").forEach(element => {
            if(element.getAttribute('href').substring(element.getAttribute('href').length - 19) !== '&view=unread#unread') {
                element.setAttribute('href', element.getAttribute('href') + "&view=unread#unread")
            }
        });

    }
}
goToUnreadPosts();
