// Minimal public phpBB/rinDark structure: controls occupy four separate table cells.
function forumNavigation(current, total = 2) {
    const pages = Array.from({ length: total }, (_, index) => index + 1).map(number =>
        number === current ? `<strong>${number}</strong>` :
            `<a href="./viewforum.php?f=14&amp;start=${(number - 1) * 100}">${number}</a>`).join(', ');
    return '<table class="forum-navigation" width="100%" cellspacing="1"><tbody><tr>' +
        '<td align="left"><a href="./posting.php?mode=post&amp;f=14"><img src="button_topic_new.gif" alt="Post new topic"></a></td>' +
        `<td class="nav">Page <strong>${current}</strong> of <strong>${total}</strong><br></td>` +
        '<td class="gensmall">[ 200 topics ]</td>' +
        `<td class="gensmall" width="100%" align="right"><b><a href="#" onclick="jumpto(); return false;">Go to page</a> ${pages}</b></td>` +
        '</tr></tbody></table>';
}

function forumTopic(id, title = `Topic ${id}`) {
    return `<tr data-topic="${id}"><td class="row1"><a class="topictitle" href="./viewtopic.php?f=14&amp;t=${id}">${title}</a></td>` +
        `<td class="row2"><a href="./viewtopic.php?p=${id}00#p${id}00"><img src="icon_topic_latest.gif" alt="View last post"></a></td></tr>`;
}

function forumPage(current, ids) {
    return '<div id="wrapcentre"><div id="pageheader"><a class="titles" href="./viewforum.php?f=14">Off Topic</a></div>' +
        '<div id="pagecontent">' + forumNavigation(current) +
        '<table class="tablebg"><tbody><tr><th colspan="2">Announcements</th></tr>' +
        forumTopic(10, '[Important] Forum announcement') +
        '<tr><td class="cat" colspan="2">Topics</td></tr>' + ids.map(id => forumTopic(id)).join('') +
        '</tbody></table>' + forumNavigation(current) +
        '<table id="forum-subscribe"><tbody><tr><td><a href="./viewforum.php?f=14&amp;watch=forum">Subscribe forum</a></td></tr></tbody></table>' +
        '</div></div>';
}

module.exports = { forumPage };
