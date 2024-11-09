/* eslint-env jquery */

// ==UserScript==
// @name            CS.RIN.RU Enhanced
// @name:fr         CS.RIN.RU Amélioré
// @name:pt         CS.RIN.RU Melhorado
// @namespace       Royalgamer06
// @version         1.2.2
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
// @grant           GM_addElement
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
Contributor: odusi (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=582752) has created the original function for the special search. We have kindly given his permission to use his work
Contributor: Mandus (https://cs.rin.ru/forum/memberlist.php?mode=viewprofile&u=1487447) has created the original function to copy the link from a message
*/

const BRANCH = "master"
const CONFIG_PAGE_CSS = `https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/${BRANCH}/config.css`;
const CONFIG_PAGE_JS = `https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/${BRANCH}/config.js`;
const CONFIG_PAGE = `https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/${BRANCH}/config.html`

const AJAX_LOADER = `
<div style="margin-left: 50%;">
    <img
        id="ajaxload"
        src="https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/loading.gif"
        style="opacity: 0.5; position: fixed; width: 40px; height: 40px; z-index: 2147483647; display: none;"  alt="Loading"/>
</div>`;

const FORUM_NAME = 'CS.RIN.RU - Steam Underground Community';

const navBarSize = "1.0em";

function getBaseUrl() {
    let path = window.location.origin + window.location.pathname;
    let base = path.slice(0, path.lastIndexOf('/') + 1);
    return base ?? 'https://cs.rin.ru/forum/';
}

const FORUM_BASE_URL = getBaseUrl();

//Contains the list of friends
const FRIENDS_LIST = [];

const CONNECTED = document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2)").lastElementChild.getAttribute("href").match("mode=login") == null

const USERNAME = $("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2) > a:nth-child(2)")[0].textContent.slice(10, -2);

// Declare a promise to wait for the variable to be updated
let updatePromise = null;

//Retrieve friends list
async function retrievesFriendsLists() {
    // Checks if the promise is already being executed
    if (!updatePromise) {
        // Create a new promise
        updatePromise = new Promise(async (resolve, reject) => {
            // Check if the friends list has already been updated
            if (FRIENDS_LIST.length === 0) {
                try {
                    // Performs the query to retrieve the list of friends
                    const response = await fetch(FORUM_BASE_URL + "ucp.php?i=zebra&mode=friends");
                    const text = await response.text();
                    // Parse the answer to extract the list of friends
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(text, "text/html");
                    const friendsListContainer = doc.querySelector('#ucp > table > tbody > tr:nth-child(3) > td.row2 > select');
                    if (friendsListContainer) {
                        FRIENDS_LIST.push(...Array.from(friendsListContainer.children, node => node.innerText));
                    }

                    // Solve the promise
                    resolve();
                } catch (error) {
                    // Reject the promise in case of error
                    reject(error);
                }
            } else {
                // Resolves the promise if the list has already been updated
                resolve();
            }
        });
    }
    // Waits for variable update
    await updatePromise;
}

/*
Configuration array with default values.
*/
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

let options = {
    "script_enabled": true,
    "infinite_scrolling": true,
    "mentioning": 1, //0=nothing, 1=the author, 2=author and the post
    "steam_db_link": true,
    "copy_link_button": true,
    "dynamic_function": true,
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

/*
Color used in this script
*/
let color = {
    "color_of_friends": '#f4169b', "color_of_me": '#ff4c4c'
};

/*
Functions that need to be connected must be added here and you must also add the need-connected="true" tag to them.
*/
function loadConfig() {
    const savedOptions = GM_getValue("options", options);
    options = {...options, ...savedOptions};
    if (!CONNECTED) {
        options.dynamic_function = false;
        options.add_profile_button = false;
        options.colorize_new_messages = false;
        options.add_small_shoutbox = false;
        options.colorize_friends_me = 0;
        options.add_link_quote = false;
        specialSearchParameters.showFriends = false;
    }
}

loadConfig();

window.addEventListener("message", receiveConfigMessage, false);

function receiveConfigMessage(event) {
    if (!event.data) return;
    if (event.data.script_enabled === undefined) return;
    options = event.data;
    GM_setValue("options", options);
    GM_notification("Configuration saved", "Info");
}

function loadConfigButton() {
    GM_xmlhttpRequest({ // JS of config file
        url: CONFIG_PAGE_JS, onerror: (r) => {
            console.log("Error loading config page script: " + r);
            GM_notification("Error loading config page script: " + r, "Error");
        }, onload: (r) => {
            const script = document.createElement('script');
            script.textContent = r.responseText;
            $("body").append(script);
        }
    });
    GM_xmlhttpRequest({ // CSS of config file
        url: CONFIG_PAGE_CSS, onerror: (r) => {
            console.log("Error loading config page script: " + r);
            GM_notification("Error loading config page script: " + r, "Error");
        }, onload: (r) => {
            const script = document.createElement('style');
            script.textContent = r.responseText;
            $("body").append(script);
        }
    });
    GM_xmlhttpRequest({ // HTML of config file
        url: CONFIG_PAGE, onerror: (r) => {
            console.log("Error loading config page: " + r);
            GM_notification("Error loading config page: " + r, "Error");
        }, onload: (r) => {
            $("body").append(r.responseText);
            $("input#script_enabled")[0].checked = options.script_enabled;
            $("input#infinite_scrolling")[0].checked = options.infinite_scrolling;
            $("select#mentioning")[0].options.selectedIndex = options.mentioning;
            $("input#steam_db_link")[0].checked = options.steam_db_link;
            $("input#copy_link_button")[0].checked = options.copy_link_button;
            $("input#dynamic_function")[0].checked = options.dynamic_function;
            $("select#colorize_friends_me")[0].options.selectedIndex = options.colorize_friends_me;
            $("input#add_profile_button")[0].checked = options.add_profile_button;
            $("input#colorize_new_messages")[0].checked = options.colorize_new_messages;
            $("input#colorize_the_page")[0].checked = options.colorize_the_page;
            $("input#display_ajax_loader")[0].checked = options.display_ajax_loader;
            $("input#custom_tags")[0].checked = options.custom_tags;
            $("input#add_small_shoutbox")[0].checked = options.add_small_shoutbox;
            $("input#add_users_tag")[0].checked = options.add_users_tag;
            $("input#show_all_spoilers")[0].checked = options.show_all_spoilers;
            $("input#add_link_quote")[0].checked = options.add_link_quote;
            $("input#quick_reply")[0].checked = options.quick_reply;
            $("input#collapse_quotes")[0].checked = options.collapse_quotes;
            $("select#hide_scs")[0].options.selectedIndex = options.hide_scs;
            $("input#apply_in_scs")[0].checked = options.apply_in_scs;
            $("input#title_format")[0].value = options.title_format;
            $("input#topic_preview")[0].checked = options.topic_preview;
            $("select#topic_preview_option")[0].options.selectedIndex = options.topic_preview_option;
            $("input#topic_preview_timeout")[0].value = options.topic_preview_timeout;
            $("input#post_preview")[0].checked = options.post_preview;
            $("input#profile_preview")[0].checked = options.profile_preview;
            $("input#special_search")[0].checked = options.special_search;
            $("select#change_topic_link")[0].options.selectedIndex = options.change_topic_link;
            const specialSearchParametersJSON = options.special_search_parameter;
            $("select#searchTermsSpecificity")[0].value = specialSearchParametersJSON.searchTermsSpecificity;
            $("input#searchSubforums")[0].checked = specialSearchParametersJSON.searchSubforums;
            $("select#searchTopicLocation")[0].value = specialSearchParametersJSON.searchTopicLocation;
            $("select#sortResultsBy")[0].value = specialSearchParametersJSON.sortResultsBy;
            $("select#sortOrderBy")[0].value = specialSearchParametersJSON.sortOrderBy;
            $("input#showResultsAsPosts")[0].checked = specialSearchParametersJSON.showResultsAsPosts;
            $("input#limitToPrevious")[0].value = specialSearchParametersJSON.limitToPrevious;
            $("input#returnFirst")[0].value = specialSearchParametersJSON.returnFirst;
            $("input#showFriends")[0].checked = specialSearchParametersJSON.showFriends;

            if (!options.script_enabled) {
                $("fieldset#config").hide();
            }
        }
    });
}

loadConfigButton();

if (!options.script_enabled) return;

// Quick reply panel
const quickReplyPanel = document.getElementById("postform");

// Navigation bar
let navBar = $("[title='Click to jump to page…']").parent().parent().first()[0]; // Gets the first navigation bar
if (navBar) {
    const div = document.createElement("div"); // Necessary for search.php
    div.setAttribute("class", "gensmall"); // Necessary for search.php
    div.setAttribute("name", "page_nav"); // Makes it easier for the GM_addStyle function
    div.setAttribute("width", "500"); // Standardised width
    div.innerHTML = navBar.innerHTML; // Copy the navigation bar
    navBar.parentNode.replaceChild(div, navBar); // Replace the existing navigation bar with the modified one
    const ancestor = $(div).closest("#pagecontent, #pageheader"); // #pagecontent for viewforum.php, #pageheader for viewtopic.php
    if (ancestor.length) {
        $("#pagecontent").before(div);
    } else {
        $("[method='post']:not(#search)").get(0).before(div); // For search.php, memberlist.php
    }

    let bgColour = getComputedStyle(document.querySelector("body")).getPropertyValue("background-color");
    let matches = bgColour.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    const bgRgb = [parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])]
    let colour = bgRgb[0] + bgRgb[1] + bgRgb[2] > 600 ? "white" : "black";
    GM_addStyle(`[name="page_nav"] {
        position: sticky !important;
        top: 0px;
        width: 500px;
        background: linear-gradient(90deg, ${colour} 90%, transparent 95%);
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
if (options.infinite_scrolling && $("[title='Click to jump to page…']").length > 0) {
    const styleElement = document.querySelector("style");
    styleElement.textContent = "[name=\"page_nav\"] {font-size:" + navBarSize + ";}" //Increase size of the nav bar
    const selectors = ["#pagecontent > table.tablebg > tbody > tr:has(.row4 > img:not([src*=global], [src*=announce], [src*=sticky]))", // viewforum.php
        "#wrapcentre > form > table.tablebg > tbody > tr[valign='middle']", // search.php
        "#pagecontent > .tablebg:not(:has(tbody > tr > .cat))", // viewtopic.php
        "#wrapcentre > form > table.tablebg > tbody > tr:not(:has(.cat)):not(:first)", // search.php (user messages) and memberlist.php
        "#pagecontent > form > table.tablebg > tbody > tr:not(:first)" // inbox
    ];

    const selector = selectors.find(select => $(select).length !== 0);
    let ajaxDone = true;
    const navElem = $("[title='Click to jump to page…']").first().parent();
    const initialPageElem = $(navElem).find("strong");
    let scrollLength = 0; // How long the user has scrolled when at the top of the page
    const scrollThreshold = 1000; // Approximately 10 clicks of the scroll wheel
    let navElems = {}; // Dictionary for storing nav bar elements for each page (page number: {Html: HTML of that page's nav element})
    navElems[$(navElem).find("strong").text()] = {Html: navElem.html()}; // Add the current nav element to the dictionary

    if (URLContains("viewtopic.php")) {
        if (initialPageElem.next().next().length !== 0) { // If we're not on the last page
            $("[title='Subscribe topic']").first().parents().eq(7).after($(".cat:has(.btnlite)").first().parent().parent().parent());
            $("[title='Reply to topic']").last().parents().eq(4).remove();
        }
    } else if (!URLContains("ucp.php")) {
        $(selector).parent().prepend($(".cat:has(.btnlite)").parent());
    }

    $(selector).attr("page_number", $(navElem).find("strong").text()); // Add page number attribute to initial posts on the page

    function infiniteScroll(e) {
        // Update nav element
        const posts = [...$(selector)]; // Get all posts on page
        const topElement = posts.find(post => window.getComputedStyle(post).display !== "none" && post.getBoundingClientRect().top >= 0); // Get the first element at the top of the screen that is not hidden
        let currentPageNumber = $(navElem).find("strong").text(); // Get the bolded number in the nav bar
        if (topElement) {
            currentPageNumber = $(topElement).attr("page_number"); // Get page number of the top element
            $(navElem).html(navElems[currentPageNumber].Html); // Replace the nav element with the one stored in the dictionary

            // Update number next to "post reply" button in topics
            if (URLContains("viewtopic.php")) {
                const pageIndicator = document.getElementsByClassName("nav")[0];
                pageIndicator.querySelector("strong:nth-child(1)").innerHTML = `${currentPageNumber}`;
            }
        }

        // Min and max page numbers that have already been visited
        const navElemsKeys = Object.keys(navElems).map(Number);
        let earliestPageNumber = Math.min(...navElemsKeys).toString();
        let latestPageNumber = Math.max(...navElemsKeys).toString();
        // Backward scroll
        if ((window.scrollY || window.document.documentElement.scrollTop) === 0 && e.deltaY < 0) {
            scrollLength += Math.abs(e.deltaY);
            if (scrollLength >= scrollThreshold && currentPageNumber === earliestPageNumber && ajaxDone) {
                ajaxDone = false;
                let previousPageElem = $(navElem).find(`:contains('${earliestPageNumber}')`).first().prev().prev(); // Find the previous page
                let previousPageLink = $(previousPageElem).attr("href"); // Get the link to the page
                // If there is no suitable link then stop
                if (!previousPageLink) {
                    ajaxDone = true;
                    return;
                }

                $.get(previousPageLink, function (data) {
                    let currentPage = $(selector); // Posts on current page
                    $($(selector)[0]).before($(selector, data).attr("page_number", $(previousPageElem).text())); // Add the new content to the front as well as page number
                    $(currentPage[0]).find("tbody:first").find("tr:first").remove(); // Remove element from current page - this element will be added back with the new content
                    let scrollPosition = $(currentPage[0]).offset().top + $(currentPage[0]).height() - $(window).height();
                    $("html, body").animate({scrollTop: scrollPosition}, 0); // Move to new content
                    const prevNavElemHTML = $("[title='Click to jump to page…']", data).first().parent().html();
                    navElems[$(previousPageElem).text()] = {Html: prevNavElemHTML};
                    functionsCalledByInfiniteScrolls(data); // Run functions
                    earliestPageNumber = $($.parseHTML(prevNavElemHTML)).find("strong").text();
                    ajaxDone = true;
                });
                scrollLength = 0; // Reset scrollLength
            }
        } else {
            scrollLength = 0; // Reset scrollLength if not actively trying to go to previous page
        }
        // Forward scroll
        if (window.innerHeight + window.scrollY + 1500 >= document.body.scrollHeight && currentPageNumber === latestPageNumber && ajaxDone) {
            ajaxDone = false;
            let nextPageElem = $(navElem).find(`:contains('${latestPageNumber}')`).next().next(); // Find the next page
            let nextPageLink = $(nextPageElem).attr("href"); // Get the link to the page
            // If there is no suitable link then stop
            if (!nextPageLink) {
                if (!document.querySelector("#pagecontent > table:last-child > tbody > tr > td > a > img") && !URLContains("ucp.php")) {
                    const originalElement = document.querySelector("#pagecontent > table:nth-child(1)");
                    const copiedElement = originalElement.cloneNode(true);
                    document.querySelector("#pagecontent").appendChild(copiedElement);
                    //Retrieve the correct nav
                    const element = document.getElementsByClassName("nav")[3];
                    // Replace the first number with the second in the HTML code
                    element.querySelector('strong:nth-child(1)').innerHTML = element.querySelector('strong:nth-child(2)').textContent;
                }
                ajaxDone = true;
                return;
            }

            $.get(nextPageLink, function (data) {
                let newPage = $(selector, data).attr("page_number", $(nextPageElem).text()); // Selected next page content
                $(newPage[0]).find("tbody:first").find("tr:first").remove(); // Remove element from the new content
                $(selector).last().after(newPage) // Add the new page content to the end
                const nextNavElemHTML = $("[title='Click to jump to page…']", data).first().parent().html(); // Get the nav bar of the new page
                navElems[$(nextPageElem).text()] = {Html: nextNavElemHTML}; // Store it for use when the user scrolls over the new content
                functionsCalledByInfiniteScrolls(data); // Run functions
                if ($($.parseHTML(nextNavElemHTML)).find("strong").text()) {
                    latestPageNumber = ($.parseHTML(nextNavElemHTML)).find("strong").text(); // Update position
                }
                ajaxDone = true;
            });
        }
    }

    window.addEventListener("wheel", infiniteScroll);
    window.addEventListener("scroll", infiniteScroll);
}

function functionsCalledByInfiniteScrolls(data) {
    dynamicFunction(data);
    mentionify();
    quotify();
    tagify();
    hideScs();
    setupTopicPreview();
    setupPostPreview();
    setupProfilePreview();
    addLink();
    steamDBLink();
    addUsersTag();
    changeTopicLink();
    colorizeFriendsMe();
    showAllSpoilers();
    collapseQuotes();
}


// CUSTOM TAGS
tagify();
hideScs();

// MENTIONING
if (URLContains("posting.php" && "do=mention") && options.mentioning) {
    const p = URLParam("p");
    const u = URLParam("u");
    const a = URLParam("a");
    let postBody = `@[url=${FORUM_BASE_URL}memberlist.php?mode=viewprofile&u=${u}]${decodeURI(a)}[/url], `;
    if (options.mentioning === 2) { //Author and post
        postBody += `Re: [url=${FORUM_BASE_URL}viewtopic.php?p=${p}#p${p}]Post[/url]. `;
    }
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
    const html = $("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(2)", data).html();
    if ($(html)[0].src.endsWith("theme/images/icon_mini_message.gif")) {
        $("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(" + (2 + options.add_profile_button) + ")").html(html) // Message
    }
    changeColorOfNewMessage();//Colorize messages
    colorizeFriendsMe();
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
    if ($(".postbody").length > 0 && URLContains("viewtopic.php") && options.mentioning >= 1 && document.querySelector('a[href^="./posting.php?mode=reply"] img')) {
        if (!document.querySelector('a[href^="./posting.php?mode=reply"] img').alt.includes('locked')) {
            const replyLink = $("[title='Reply to topic']").parent().attr("href");
            $(".gensmall div+ div:not(:has([title='Reply with mentioning']))").each(function () {
                const postElem = $(this).parents().eq(7);
                const postID = $(postElem).find("a[name]").last().attr("name").slice(1);
                const author = $(postElem).find(".postauthor").text();
                const authorID = $(postElem).find("[title=Profile]").parent().attr("href").split("u=")[1];
                if (!quickReplyPanel) {
                    $(this).append(`<a href='${replyLink}&do=mention&p=${postID}&u=${authorID}&a=${encodeURIComponent(author)}'>
                        <img src="https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/mention-image.png"
                        alt='Reply with mentioning' title='Reply with mentioning'>
                    </a>`);
                } else {
                    $(this).append(`<a href='javascript:void(0);'>
                        <img src="https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/mention-image.png"
                        alt='Reply with mentioning' title='Reply with mentioning'>
                    </a>`);
                    const child = $(this).find("[title='Reply with mentioning']");
                    $(this).find('[title="Reply with mentioning"]').on("click", function () {
                        let postBody = `@[url=${FORUM_BASE_URL}memberlist.php?mode=viewprofile&u=${authorID}]${decodeURI(author)}[/url], `;
                        if (options.mentioning === 2) { //Author and post
                            postBody += `Re: [url=${FORUM_BASE_URL}viewtopic.php?p=${postID}#p${postID}]Post[/url]. `;
                        }
                        $("[name=message]")[0].value += postBody;
                        const mentioned = $('<span class="mentioned">Mentioned!</span>');
                        mentioned.css({
                            'position': 'absolute',
                            'top': child.offset().top - mentioned.outerHeight() - 20,
                            'left': child.offset().left + (child.outerWidth() / 2) - (mentioned.outerWidth() / 2) - 12
                        });
                        $('body').append(mentioned);
                        setTimeout(function () {
                            mentioned.fadeOut();
                        }, 2000);
                    });
                }
            });
        }
    }
}

function tagify() {
    if (options.custom_tags) {
        $(".titles, .topictitle").each(function () {
            const titleElem = this;
            const parentElem = titleElem.parentElement
            if (titleElem.id !== "colorize") {
                titleElem.id = "colorize";
                const tags = $(titleElem).text().match(/\[([^\]]+)]/g);
                if (tags) {
                    tags.forEach(function (tag) {
                        const color = colorize(tag, parentElem);
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

function hexToRgb(hex) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return [r, g, b];
}

function colorize(str, parentElem) {
    let lstr = str.toLowerCase();
    let hash = 0;
    for (let i = 0; i < lstr.length; i++) {
        hash = lstr.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16);
    let rgb = hexToRgb(color);

    while (!getComputedStyle(parentElem).getPropertyValue("background-color").match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)) {
        parentElem = parentElem.parentElement
    }
    let bgColour = getComputedStyle(parentElem).getPropertyValue("background-color");
    let matches = bgColour.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    const bgRgb = [parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])]

    while (Math.abs(rgb[0] + rgb[1] + rgb[2] - (bgRgb[0] + bgRgb[1] + bgRgb[2])) < 300) {
        hash = (hash << 5) - hash;
        color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777216)).toString(16);
        rgb = hexToRgb(color);
    }

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

/*
 * Displays a preview of the post.
 * @param {HTMLElement} element - The element to attach the hover event listener to.
 * @param {string} link - The link to the topic to be previewed.
 * @param {function} getIndex - A predefined function that returns the correct index of the post given a list of posts.
 * These are defined `setup{Type}Preview()` functions.
*/
function previewElement(element, link, getIndex) {
    let tid, showPreview;
    $(element).off("mouseover").on("mouseover", () => {
        showPreview = true;
        $("div#topic_preview").hide();
        tid = setTimeout(() => {
            if (!showPreview) return;

            const previewWidth = window.innerWidth * 0.75;
            const previewHeight = window.innerHeight * 0.75;
            const x = (window.innerWidth / 2) - (previewWidth / 2);
            const y = (window.innerHeight / 2) - (previewHeight / 2) + window.scrollY;

            GM_xmlhttpRequest({
                url: link, onerror: (r) => {
                    console.log("Error loading page: " + r);
                }, onload: (r) => {
                    if (!showPreview) return;
                    const parser = new DOMParser();
                    const dom = parser.parseFromString(r.responseText, "text/html").body.children;
                    const posts = $(dom).find("div#pagecontent table.tablebg");
                    const body = posts[getIndex(posts, link)].outerHTML;
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
    $(element).off("mouseleave").on("mouseleave", () => {
        clearTimeout(tid);
        showPreview = false;
    });
}

function setupTopicPreview() {
    if (!options.topic_preview) return;
    $("a.topictitle").each((_, e) => {
        const topic = $(e)[0];
        const topicLink = topic.href.split("&view=unread")[0].split("&p=")[0];
        let link = options.topic_preview_option === 0 ? topicLink :
            options.topic_preview_option === 1 ? topicLink + "&view=unread#unread" :
                options.topic_preview_option === 2 ? $(topic).parent().next().next().next().next().children().next().children().next().attr("href") :
                    'Invalid option';
        const getIndex = () => options.topic_preview_option === 2 ? posts.length - 2 : 1;
        previewElement(topic, link, getIndex);
    });
}

setupTopicPreview();

function setupPostPreview() {
    if (!options.post_preview) return;
    $("a.postlink-local").each((_, e) => {
        const post = $(e)[0]
        const link = post.href;
        if (!link.includes("viewtopic.php")) return;
        const getIndex = (posts, link) => {
            for (let i = 0; i < posts.length; i++) {
                const postLink = $(posts[i]).find("a[href*='viewtopic.php']:not([class])")[0]
                if (postLink.href === link) {
                    return i;
                }
            }
            return -1;
        }

        previewElement(post, link, getIndex)
    });
}

setupPostPreview()

function setupProfilePreview() {
    if (!options.profile_preview) return;
    $("a.postlink-local").each((_, e) => {
        const profile = $(e)[0]
        const link = profile.href;
        if (!link.includes("memberlist.php")) return;
        const getIndex = () => 0;

        previewElement(profile, link, getIndex)
    });
}

setupProfilePreview()

/*
Made by Redpoint
And adapted for cs.rin.ru enhanced by Altansar
*/
function addUsersTag() {
    if (options.add_users_tag) {
        const steamLink = $('a[href^="https://store.steampowered.com/app/"], a[href^="http://store.steampowered.com/app/"]').first()[0];
        if (steamLink != null) {
            const genreDescription = $(":contains('Genre(s):')").filter((i, e) => $(e).text() === "Genre(s):");
            if (genreDescription.length > 0 && genreDescription.next().next().text() !== "User-defined Tag(s): ") { // If we are on the game presentation page
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
                        if (genreDescription.next().next().text() === "User-defined Tag(s): ") {
                            return;
                        }
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

    let postlinks = $(".postlink");
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
            $(this).append(`<a href='javascript:void(0);'>
                <img src="https://raw.githubusercontent.com/SubZeroPL/cs-rin-ru-enhanced-mod/master/link-image.png"
                alt='Copy the link into the clipboard' title='Copy the link into the clipboard'>
            <a>`);
            const bar = this;
            $(this).find('[title="Copy the link into the clipboard"]').on("click", function () {
                const url = FORUM_BASE_URL + `viewtopic.php?p=${postId}#p${postId}`;
                navigator.clipboard.writeText(url);
                const copied = $('<span class="copied">Copied!</span>');
                const child = $(bar).find("[title='Copy the link into the clipboard']");
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
            colorizeFriendsMe();
        });
}

/*
Made by Altansar
*/
function changeTopicLink() {
    if (options.change_topic_link === 1) {
        document.querySelectorAll(".titles:not(:first-child), .topictitle").forEach(element => {
            if (element.getAttribute("href")) {
                if (!element.getAttribute("href").includes("&view=unread#unread")) {
                    //If we don't already have added unread
                    element.setAttribute("href", element.getAttribute('href') + "&view=unread#unread")
                }
            }
        });
    }

    if (options.change_topic_link === 2) {
        document.querySelectorAll(".titles:not(:first-child), .topictitle").forEach(element => {
            if (element.getAttribute("href")) {
                if (!element.getAttribute("href").includes("&p=")) {
                    element.setAttribute("href", $(element).parent().next().next().next().next().children().next().children().next().attr("href"))
                }
            }
        });
    }
}

changeTopicLink();

function addProfileButton() {
    if (!options.add_profile_button) return;
    let profileLink = GM_getValue("profileLink", null);
    if (!profileLink) {
        if ($(`p.gensmall > :contains(${USERNAME})`).length === 0) {
            GM_xmlhttpRequest({
                method: "GET", url: FORUM_BASE_URL + "viewforum.php?f=10", onload: function (response) {
                    // Parse the response as HTML
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, "text/html");
                    profileLink = $(doc).find(`p.gensmall > :contains(${USERNAME})`)[0].href;
                    GM_setValue("profileLink", profileLink);
                }
            });
        } else {
            profileLink = $(`p.gensmall > :contains(${USERNAME})`)[0].href;
            GM_setValue("profileLink", profileLink);
        }
        GM_setValue("profileLink", profileLink);
    }
    profileLink = GM_getValue("profileLink", null);
    const bar = $(".genmed")[2];
    const a = document.createElement("a");
    a.href = profileLink;
    const img = document.createElement("img");
    img.src = document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(1) > img").src;
    img.width = 12;
    img.height = 13;
    a.appendChild(img);
    a.appendChild(document.createTextNode(" Profile"));
    const sep = document.createTextNode(` ${String.fromCharCode(160)}:: ${String.fromCharCode(160)}`);
    $(bar).find("a")[1].before(a, sep);
}

addProfileButton();

/*
Made by Altansar/
*/
function changeColorOfNewMessage() {
    if (options.colorize_new_messages) {
        const menuBar = document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(" + (2 + options.add_profile_button) + ")");
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
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(1) > a:nth-child(1)").style.color = "#FFA07A"; // Forum Rules
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(1) > a:nth-child(2)").style.color = "#FFC200"; // Donate
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(2) > a:nth-child(1)").style.color = "#98FB98"; // Chat
        document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(2) > a:nth-child(2)").style.color = "#90EE90"; // FAQ
        if (CONNECTED) document.querySelector("#menubar > table:nth-child(1) > tbody > tr > td:nth-child(2) > a:nth-child(3)").style.color = "#4169E1"; // Members
        document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(1)").style.color = "#87CEEB"; // User Control Panel
        if (options.add_profile_button) document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(1) > a:nth-child(2)").style.color = "#F08080"; // Profile
        document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2) > a:nth-child(1)").style.color = "#87CEFA"; // Search
        document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2) > a:nth-child(2)").style.color = "#FF0000"; // Logout
        document.querySelector("#logodesc > table > tbody > tr > td:nth-child(2) > h1").style.color = '#' + Math.floor(Math.random() * 16777215).toString(16); // Random colour for the title
    }
}

colorizeThePages();

//Color friends
async function colorizeFriendsMe() {
    if (options.colorize_friends_me > 0) {
        //Add legends friends
        if ((URLContains("index.php") || (window.location.pathname.startsWith('/forum/') && window.location.pathname.endsWith('/forum/'))) && options.colorize_friends_me > 1) {
            if (document.querySelectorAll(".gensmall")[3].lastElementChild.text !== "Friends") {
                const friends = document.createElement('a');
                friends.setAttribute('href', './ucp.php?i=zebra&mode=friends');
                friends.style.color = color.color_of_friends;
                friends.innerText = 'Friends';
                const selector = document.querySelectorAll(".gensmall")[3];
                selector.append(", ");
                selector.append(friends);
            }
        }
        //Colorize friends
        await retrievesFriendsLists();
        const links = document.querySelectorAll("a[href^='./memberlist.php'], .postauthor, .gen, .postlink-local, .quotetitle");
        links.forEach(link => {
            let nickname = link.innerText;
            if (link.classList.contains('quotetitle')) nickname = nickname.substring(0, nickname.length - 7)
            if (USERNAME === nickname && (options.colorize_friends_me === 1 || options.colorize_friends_me === 3)) {
                link.id = "colorize";
                link.style.color = color.color_of_me;
            }
            if (FRIENDS_LIST.includes(nickname) && options.colorize_friends_me > 1) {
                link.id = "colorize";
                link.style.color = color.color_of_friends;
            }
        });
    }
}

colorizeFriendsMe();

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
    let forumID = "";
    let topicID = "0";

    // Check the searchScope and parse URL if required
    if (searchScope === "thisForum") {
        let urlParams = new URLSearchParams(window.location.search);
        forumID = urlParams.get("f");
        if (forumID) {
            forumID = "&fid%5B%5D=" + forumID;
        }
    }

    if (searchScope === "thisTopic") {
        let urlParams = new URLSearchParams(window.location.search);
        topicID = urlParams.get("t");
    }

    window.location.href = `./search.php?keywords=${encodeURIComponent(searchBar.value).replace(/%20/g, "+")}&terms=${searchTerms}&author=${encodeURIComponent(searchAuthor).replace(/%20/g, "+")}${forumID}&sc=${searchSubforums}&sf=${searchLocation}&sk=${sortResultsBy}&sd=${sortOrderBy}&sr=${showResultsAsPosts}&st=${limitToPrevious}&ch=${returnFirst}&t=${topicID}`;
}

async function specialSearch() {
    if (options.special_search) {
        // Get row to insert searchBar
        const cell = document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2)");
        const container = document.createElement("div");
        container.style.position = "relative";
        container.style.display = "inline-block";

        // Different locations based on which page the user is on
        let searchScopeOptions;
        if (window.location.href.includes("viewtopic.php")) {
            searchScopeOptions = `
                <option value="everywhere">Everywhere</option>
                <option value="thisForum">This forum</option>
                <option value="thisTopic">This topic</option>
            `;
        } else if (window.location.href.includes("viewforum.php")) {
            searchScopeOptions = `
                <option value="everywhere">Everywhere</option>
                <option value="thisForum">This forum</option>
            `;
        } else {
            searchScopeOptions = `
                <option value="everywhere">Everywhere</option>
            `;
        }

        // Getting config values
        let specialSearchParametersJSON = options.special_search_parameter;
        const searchLocationChecked = specialSearchParametersJSON.searchTopicLocation === "titleonly" || specialSearchParametersJSON.searchTopicLocation === "firstpost" ? "checked" : "";
        const showAsPostsChecked = specialSearchParametersJSON.showResultsAsPosts ? "checked" : "";
        const searchTermsSelected = specialSearchParametersJSON.searchTermsSpecificity;

        // Creating search bar and search options
        container.innerHTML = `
            <input id="searchBar" type="text" placeholder="Special search">
            <div id="searchOptions" style="display: none; position: absolute; background-color:#1c1c1c; border-top:0.5em solid black; text-align: left;">
                <div style="padding: 0.5em;">
                    <label for="searchScope" style="color: white;">Search:</label>
                    <select id="searchScope" name="searchScope">
                        ${searchScopeOptions}
                    </select>
                </div>
                <div style="padding: 0.5em;">
                    <label for="searchTerms" style="color: white;">Search for:</label>
                    <select id="searchTerms" name="searchTerms">
                        <option value="any" ${searchTermsSelected === 'any' ? 'selected' : ''}>Any term</option>
                        <option value="all" ${searchTermsSelected === 'all' ? 'selected' : ''}>All terms</option>
                    </select>
                </div>
                <div style="padding: 0.5em;">
                    <input type="checkbox" id="searchLocation" name="searchLocation" value="firstPost" ${searchLocationChecked}>
                    <label for="searchLocation" style="color: white;">Search first post/titles only</label>
                </div>
                <div style="padding: 0.5em;">
                    <input type="checkbox" id="showAsPosts" name="showAsPosts" ${showAsPostsChecked}>
                    <label for="showAsPosts" style="color: white;">Show as posts</label>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; padding: 0.5em;">
                    <label for="searchAuthor" style="color: white;">By: </label>
                    <input type="text" id="searchAuthor" name="searchAuthor" placeholder="Author's name">
                </div>
                <div style="display: flex; align-items: center; justify-content: center; padding: 0.5em;">
                    <button id="searchButton">Search</button>
                </div>
            </div>
            `;

        cell.prepend(container);

        // Getting reference of the search bar and the search options
        const searchBar = document.querySelector("#searchBar");
        const searchOptions = document.querySelector("#searchOptions");

        // Add event listener for search bar
        searchBar.addEventListener("click", function (event) {
            // Makes it so search options will not disappear first
            event.stopPropagation();
            // Toggles the display of search options when search bar is clicked
            searchOptions.style.display = "block";
        });


        // Add event listener for search options so search options will not disappear when clicked on
        searchOptions.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        // Add event listener to document (disappear when anything other than the search bar/options is clicked)
        document.addEventListener("click", function () {
            // Hides the search options when click is outside the search bar
            if (searchOptions.style.display === "block") {
                searchOptions.style.display = "none";
            }
        });

        // Add event listener for the Esc key to hide search options
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") { // Check if the pressed key is Escape
                searchOptions.style.display = "none"; // Hide the search options
            }
        });

        // Redirect to search on Enter key press
        searchBar.addEventListener("keydown", function (ev) {
            if (ev.code === "Enter") {
                searchURL()
            }
        });
        // Add functionality for search button
        document.querySelector("#searchButton").addEventListener("click", searchURL);
        if (specialSearchParametersJSON.showFriends) {
            await retrievesFriendsLists();
            // Retrieve reference to "searchAuthor" input
            const searchAuthorInput = document.querySelector("#searchAuthor");
            // Create friends list
            const friendsClass = document.createElement("class")
            friendsClass.id = "friends-lists-search"
            // Create a new paragraph element
            const friendTitle = document.createElement('p');
            // Add content to paragraph
            friendTitle.textContent = "Friends (" + FRIENDS_LIST.length + "):";
            const friendsLists = document.createElement("ul");
            if (FRIENDS_LIST.length === 0) {
                const friendItem = document.createElement("li");
                friendItem.textContent = "Go make some friends :)";
                friendsLists.appendChild(friendItem);
            }
            // Browse the friends table and create a list item for each word
            FRIENDS_LIST.forEach(friend => {
                const friendItem = document.createElement("li");
                friendItem.textContent = friend;
                // Add a click event listener to each list item
                friendItem.addEventListener("click", function () {
                    searchAuthorInput.value = friend;
                });
                friendsLists.appendChild(friendItem);
            });
            // When you click on search author input
            searchAuthorInput.addEventListener("click", function (event) {
                friendsClass.style.display = "block"; //Display list of friends
            });
            const parentElement = document.getElementById('searchOptions');
            const children = Array.from(parentElement.children);
            const selectedChildren = children.slice(0, children.length - 2);
            // Add event listener to all first child of the special search bar (disappear you click on element on the special search bar who are not the friend list, the button or the input)
            selectedChildren.forEach(option => {
                option.addEventListener('click', function () {
                    friendsClass.style.display = "none"; //Hide the friend lists
                });
            });
            // Add paragraph to specific class
            friendsClass.appendChild(friendTitle);
            friendsClass.appendChild(friendsLists);
            searchOptions.appendChild(friendsClass); // Append the friend list by default
            friendsClass.style.display = "none"; // Hide the friend list by default


            document.addEventListener("click", function () {
                // Hides the search options when click is outside the search bar
                if (searchOptions.style.display === "block") {
                    friendsClass.style.display = "none"; //Hide the friend lists
                }
            });
        }
    }

}

specialSearch();

/*
Originally made by ucsanytaef
And adapted for cs.rin.ru enhanced by Altansar (nothing to adapt xD)
*/
function showAllSpoilers() {
    if (options.show_all_spoilers) { //If show all spoilers is active
        const spoilers = document.querySelectorAll('input[type="button"][value="Show"]');
        spoilers.forEach(spoiler => {
            spoiler.click();
        });
    }
}

showAllSpoilers();


function addLinkToQuote(message, id) {
    const link = `${FORUM_BASE_URL}viewtopic.php?p=${id}#p${id}`;
    const firstQuoteIndex = message.indexOf('[quote');
    const firstQuoteEndIndex = message.indexOf(']', firstQuoteIndex) + 1;
    if (firstQuoteIndex !== -1) {
        const beforeQuote = message.slice(0, firstQuoteIndex);
        const quoteTag = message.slice(firstQuoteIndex, firstQuoteEndIndex);
        const afterQuote = message.slice(firstQuoteEndIndex);
        message = `${beforeQuote}[url=${link}]${quoteTag}[/url]${afterQuote}`;
    }
    return message
}

function AddLinkQuote() {
    if (options.add_link_quote) {
        const searchParams = new URLSearchParams(window.location.search);
        const id = searchParams.get('p');
        const topic = searchParams.get('t'); // A new parameter appears when previewing a post
        const mode = searchParams.get('mode'); // Mode can be reply or edit
        const messageTextArea = document.querySelector('textarea[name="message"]');
        if (messageTextArea && id && !topic && mode !== "edit") { // Make sure the ID exists and the post is not a preview and is not being edited
            messageTextArea.value = addLinkToQuote(messageTextArea.value, id);
        }
    }
}

AddLinkQuote();


// Quick reply panel
if (options.quick_reply && quickReplyPanel) {
    let button = document.createElement("button");
    button.innerHTML = "Show Quick Reply Panel";
    button.style.cssText = "position: fixed; bottom: 0%; left: 0%; min-height: 40px; min-width: 50px; width: 10%; height: 3%; z-index: 9999;";
    button.addEventListener("click", function () {
        if (quickReplyPanel.style.position !== "sticky") {
            quickReplyPanel.style.position = "sticky";
            quickReplyPanel.style.bottom = "0px";
            button.innerHTML = "Hide Quick Reply Panel";
        } else {
            quickReplyPanel.style.position = "static";
            button.innerHTML = "Show Quick Reply Panel";
        }
    });
    document.body.appendChild(button);
}

function quotify() {
    if (quickReplyPanel) {

        $("a:has([title='Reply with quote'])").each(function () {
            const quoteLink = this.href;
            if (!quoteLink.includes("posting.php")) return;
            this.href = "javascript:void(0)";

            const postElem = $(this).parents().eq(7);
            const postID = $(postElem).find("a[name]").last().attr("name").slice(1);
            const author = $(postElem).find(".postauthor").text();
            const authorID = $(postElem).find("[title=Profile]").parent().attr("href").split("u=")[1];

            const child = $(this).find("[title='Reply with quote']");
            $(this).find('[title="Reply with quote"]').on("click", function () {
                console.log(postID);
                console.log(quoteLink);
                GM_xmlhttpRequest({
                    url: quoteLink, onload: function (response) {
                        let postBody = $(response.responseText).find("[name=message]").text();
                        if (options.add_link_quote) {
                            postBody = addLinkToQuote(postBody, postID)
                        }
                        $("[name=message]")[0].value += postBody;
                        const quoted = $('<span class="quoted">Quoted!</span>');
                        quoted.css({
                            'position': 'absolute',
                            'top': child.offset().top - quoted.outerHeight() - 20,
                            'left': child.offset().left + (child.outerWidth() / 2) - (quoted.outerWidth() / 2) - 12
                        });
                        $('body').append(quoted);
                        setTimeout(function () {
                            quoted.fadeOut();
                        }, 2000);
                    }
                });


            });
        });
    }
}

quotify()

function collapseQuotes() {
    if (!options.collapse_quotes) return;
    const quoteDivs = $('.quotecontent');
    quoteDivs.each(function() {
        // Create the new divs
        const outerDiv = $('<div></div>');
        const innerDiv = $('<div style="margin-bottom: 2px;"></div>');
        const button = $('<input value="Show" style="margin: 0px; padding: 0px; width: 60px; font-size: 10px;" type="button">');
        const contentDiv = $('<div style="border: 1px inset; padding: 6px;"></div>');
        const hiddenDiv = $('<div style="display: none;"></div>');

        // Move the original quote content into the hidden div
        hiddenDiv.append($(this).contents());

        // Append elements to create the structure
        innerDiv.append(button);
        contentDiv.append(hiddenDiv);
        outerDiv.append(innerDiv).append(contentDiv);

        // Insert the new structure before the original div
        $(this).before(outerDiv);

        // Remove the original div
        $(this).remove();

        // Add click event to the button
        button.click(function() {
            const hiddenContent = $(this).parent().next().find('div').first();
            if (hiddenContent.css('display') === 'none') {
                hiddenContent.css('display', 'block');
                $(this).val('Hide');
            } else {
                hiddenContent.css('display', 'none');
                $(this).val('Show');
            }
        });
    });
}

collapseQuotes()

/*
function addFriendButton() {
    if(true) {
        if (URLContains("viewtopic.php")) {
            //<a href="ucp.php?i=zebra&amp;add=hal210"><img src="./styles/rinDark/imageset/en/icon_user_profile.gif" alt="Profile" title="Profile"></a>

        }
    }
}
*/
