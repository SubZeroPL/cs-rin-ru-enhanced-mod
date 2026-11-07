// Synthetic inbox/sentbox markup with the same nested tables as the native UCP.
// All names, IDs, message subjects and tokens below are test data.
const base = 'https://cs.rin.ru/forum/';

function pmFolderUrl(folder = '0', start = 0) {
    return `${base}ucp.php?i=pm&mode=view&action=view_folder&f=${folder}&st=0&sk=t&sd=d&start=${start}`;
}

function pmNavigation(current, folder, total = 2) {
    const href = page => pmFolderUrl(folder, (page - 1) * 100).replaceAll('&', '&amp;');
    const pages = Array.from({ length: total }, (_, index) => index + 1).map(page =>
        page === current ? `<strong>${page}</strong>` : `<a href="${href(page)}">${page}</a>`).join(', ');
    return '<table class="pm-navigation" width="100%"><tbody><tr><td>' +
        `<table><tbody><tr><td class="nav">Page <strong>${current}</strong> of <strong>${total}</strong></td>` +
        '<td class="gensmall">[ <b>200</b> Messages ]</td></tr></tbody></table></td><td align="right"><b>' +
        '<a href="#" onclick="jumpto(); return false;">Go to page</a> ' +
        (current > 1 ? `<a href="${href(current - 1)}">Previous</a> ` : '') + pages +
        (current < total ? ` <a href="${href(current + 1)}">Next</a>` : '') + '</b></td></tr></tbody></table>';
}

function pmRow(id, folder = '0') {
    return `<tr data-message="${id}"><td class="row1">Read</td><td class="row1">` +
        `<a class="topictitle" href="${base}ucp.php?i=pm&amp;mode=view&amp;f=${folder}&amp;p=${id}">Test message ${id}</a></td>` +
        `<td class="row1"><a href="${base}memberlist.php?mode=viewprofile&amp;u=7">Test member</a></td>` +
        '<td class="row1">1 Jan 2020</td><td class="row1">' +
        `<input type="checkbox" name="marked_msg_id[]" value="${id}"></td></tr>`;
}

function pmUnavailableRow(id, folder = '0') {
    return `<tr data-message="${id}"><td class="row3">Unavailable</td><td class="row3"><span>Unavailable message</span>` +
        `<a href="${base}ucp.php?i=pm&amp;mode=compose&amp;f=${folder}&amp;p=${id}">Reply</a></td>` +
        '<td class="row3">Test member</td><td class="row3">1 Jan 2020</td><td class="row3">' +
        `<input type="checkbox" name="marked_msg_id[]" value="${id}"></td></tr>`;
}

function pmFolderPage(current, ids, { folder = '0', total = 2, unavailableIds = [] } = {}) {
    const action = pmFolderUrl(folder).replaceAll('&', '&amp;');
    return '<!doctype html><html><body><div id="wrapcentre"><table><tbody><tr><td><div id="pagecontent">' +
        '<table class="tablebg" id="pm-header"><tbody><tr><th>Private messages</th></tr><tr><td class="row1">' +
        pmNavigation(current, folder, total) + '</td></tr></tbody></table>' +
        `<form id="pm-messages" action="${action}" method="post"><table class="tablebg"><tbody>` +
        '<tr><th>Status</th><th>Subject</th><th>Author</th><th>Date</th><th>Mark</th></tr>' +
        ids.map(id => unavailableIds.includes(id) ? pmUnavailableRow(id, folder) : pmRow(id, folder)).join('') +
        '<tr id="pm-controls"><td class="cat" colspan="5"><select name="mark_option"><option value="mark_important">Mark important</option></select>' +
        '<input type="submit" name="submit_mark" value="Go"></td></tr></tbody></table>' +
        `<input type="hidden" name="cur_folder_id" value="${folder}">` +
        '<input type="hidden" name="form_token" value="test-only-token"><input type="hidden" name="creation_time" value="123456"></form>' +
        '<table class="tablebg" id="pm-footer"><tbody><tr><td class="row1">' +
        pmNavigation(current, folder, total) + '<form id="pm-sort"><select name="sk"><option value="t">Time</option></select>' +
        '<input name="sort" type="submit" value="Go"></form></td></tr></tbody></table>' +
        '</div></td></tr></tbody></table></div></body></html>';
}

module.exports = { pmFolderPage, pmFolderUrl, pmRow, pmUnavailableRow };
