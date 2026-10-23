// Native structure/protocol: https://cs.rin.ru/forum/styles/subsilver2/template/chat_body.html
const row = (id, message = 'Message') => `<div id="p${id}"><table class="tablebg"><tbody><tr class="row1"><td>
<a href="javascript:void(${id})" onclick="delete_post('${id}')"><img src="./styles/rinDark/imageset/en/icon_post_delete.gif"></a>
<b class="postauthor"><a href="./memberlist.php?mode=viewprofile&amp;u=8">Alice</a></b> <span class="postbody">${message}</span>
</td></tr></tbody></table></div>`;
const chatPage = `<!doctype html><html><body><div id="wrapcentre"><script>
var last_id = 10; var last_time = 0; var post_time = 1234; var read_interval = 15000;
function handle_send(mode, f) { throw new Error('Downloaded code must never execute'); }
</script><div><table class="tablebg"><tbody><tr><th colspan="2">Chat</th></tr>
<tr><td><form name="text" id="text" onsubmit="return handle_send('add', this);">
<input name="message" id="message"><input type="hidden" name="form_token" value="native-token">
<input type="submit" name="submit" value="Submit"></form></td><td>Online</td></tr>
<tr><td><div class="shouts"><div id="chat">${row(10)}</div></div></td>
<td><div class="shouts"><div id="whois_online"><a href="./memberlist.php?mode=viewprofile&amp;u=8">Alice</a></div></div></td></tr>
<tr style="display: none;"><td><span id="update_seconds">15</span><img id="act_indicator" src="./images/loading.gif"></td></tr>
</tbody></table></div></div></body></html>`;
module.exports = { row, chatPage };
