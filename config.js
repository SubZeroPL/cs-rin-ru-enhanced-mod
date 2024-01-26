/* eslint-env jquery */

function getBaseUrl() {
    let path = window.location.origin + window.location.pathname;
    let base = path.slice(0, path.lastIndexOf('/') + 1);
    return base ?? 'https://cs.rin.ru/forum/';
}

const FORUM_BASE_URL = getBaseUrl();

const RELOAD = 0;
const WARNING = 1;

const CONNECTED = document.querySelector("#menubar > table:nth-child(3) > tbody > tr > td:nth-child(2) > a:nth-child(2)").text !== ' Login';

const WARNING_MSG = `
   You need to be <a href='${FORUM_BASE_URL}ucp.php?mode=login' target='blank' class='forum_link'>logged in to the forum</a> to use the greyed-out functions.<br>
   If you don't have an account yet, you need to <a href='${FORUM_BASE_URL}ucp.php?mode=register' target='blank' class='forum_link'>register</a>.
    `;

/*
will match one and only one of the string 'true','1', or 'on' regardless
of capitalization and regardless off surrounding white-space.
*/
function strToBool(s) {
    let regex = /^\s*(true|1|on)\s*$/i;

    return regex.test(s);
}

function showMessage(id, text) {
    const container = $("#messages")[0];
    if ($(`div#msg${id}`).length === 0) {
        const msg = document.createElement('div');
        msg.id = `msg${id}`;
        msg.className = 'message';
        $(msg).html(text);
        container.appendChild(msg);
    }
    $(container).show();
}

function hideMessage(id) {
    $(`div#msg${id}`).remove();
    if ($(".message").length === 0) {
        $("#messages").hide();
    }
}

function showConfigPage() {
    $("#configButton").hide();
    $("#wholeWindow").show();

    $("[data-originalValue]").each((i, e) => {
        switch (e.type) {
            case 'checkbox':
                e.setAttribute("data-originalValue", e.checked);
                break;
            case 'select-one':
            case 'text':
            case 'number':
                e.setAttribute("data-originalValue", e.value);
                break;
        }
    });
    if (!CONNECTED) {
        document.querySelectorAll('[need-connected="true"]').forEach(checkbox => {
            checkbox.disabled = true;
        });
        showMessage(WARNING, WARNING_MSG)
    }

    $("[data-originalValue]").change((e) => {
        let changed = false;
        $("[data-originalValue]").each((i, e) => {
            switch (e.type) {
                case 'checkbox':
                    changed = changed || (e.checked !== strToBool(e.getAttribute("data-originalValue")));
                    break;
                case 'select-one':
                case 'text':
                case 'number':
                    changed = changed || (e.value !== e.getAttribute("data-originalValue"));
                    break;
            }
        });
        if (changed) {
            // Display a warning if something changed in configuration
            showMessage(RELOAD, "Clicking OK will reload current page");
        } else {
            hideMessage(RELOAD);
        }
    });
}

function sendConfig() {
    if ($("#messages").is(":visible")) {
        const special_search = {
            "searchTermsSpecificity": $("#searchTermsSpecificity")[0].value,
            "searchSubforums": $("#searchSubforums")[0].checked,
            "sortResultsBy": $("#sortResultsBy")[0].value,
            "sortOrderBy": $("#sortOrderBy")[0].value,
            "searchTopicLocation": $("#searchTopicLocation")[0].value,
            "showResultsAsPosts": $("#showResultsAsPosts")[0].checked,
            "limitToPrevious": Number($("#limitToPrevious")[0].value),
            "returnFirst": Number($("#returnFirst")[0].value),
            "showFriends": $("#showFriends")[0].checked
        };
        const data = {
            "script_enabled": $("#script_enabled")[0].checked,
            "infinite_scrolling": $("#infinite_scrolling")[0].checked,
            "mentioning": $("#mentioning")[0].checked,
            "steam_db_link": $("#steam_db_link")[0].checked,
            "copy_link_button": $("#copy_link_button")[0].checked,
            "dynamic_function": $("#dynamic_function")[0].checked,
            "add_profile_button": $("#add_profile_button")[0].checked,
            "colorize_new_messages": $("#colorize_new_messages")[0].checked,
            "colorize_the_page": $("#colorize_the_page")[0].checked,
            "display_ajax_loader": $("#display_ajax_loader")[0].checked,
            "custom_tags": $("#custom_tags")[0].checked,
            "add_small_shoutbox": $("#add_small_shoutbox")[0].checked,
            "add_users_tag": $("#add_users_tag")[0].checked,
            "colorize_friends_me": Number($("#colorize_friends_me")[0].value),
            "go_to_unread_posts": Number($("#go_to_unread_posts")[0].value),
            "topic_preview": $("#topic_preview")[0].checked,
            "topic_preview_timeout": Number($("#topic_preview_timeout")[0].value),
            "special_search": $("#special_search")[0].checked,
            "special_search_parameter": special_search,
            "hide_scs": Number($("#hide_scs")[0].value),
            "apply_in_scs": $("#apply_in_scs")[0].checked,
            "title_format": $("#title_format")[0].value
        };
        window.postMessage(data, "/");
        window.location.reload();
    }
    configWindowClose();
}

function configWindowClose() {
    $("#wholeWindow").hide();
    $("#configButton").show();
}

function enableScript() {
    if ($("input#script_enabled")[0].checked) {
        $("fieldset#config").fadeIn();
    } else {
        $("fieldset#config").fadeOut();
    }
}

function openForum() {
    window.open("https://cs.rin.ru/forum/viewtopic.php?f=14&t=75717", "blank");
}

function toggleParams() {
    $('#params').toggle();
}
