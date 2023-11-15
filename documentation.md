# Special Search

search (within)
 - all = Post subjects and message text. msgonly = Message text only. titleonly = Topic titles only. topics = First post of topics only
sort (results by)
 - a = author. t = post time. f = forum. i = topic title. s = post subject
sortad (sort results by)
 - a = ascending. d = descending
display (results as)
 - topics = topics. posts = posts
returnchar (return first # characters of posts)
 - 100 = 200. 200 = 200 etc... -1 = all
author
 - any user of cs.rin for exemple: Redpoint, SubZeroPL etc... Use * as a wildcard for partial matches. For every user just let it blank exemple: -author %
date (Limit results to previous)
 - any number in day for exemple: 1, 7, 14, 30, 90, 180, 365. For every day put the number 0
searchsub (search subforums)
 - 1 = Yes. 0 = No
terms
 - any =  Search for all terms or use query as entered. all =  Search for all terms or use query as entered

No parameters are mandatory. Parameters not specified will take their default value.
You can put spaces between each parameter - it doesn't matter.
You can put the parameters in any order you like.
Exemple: search %all -sort %t -sortad %d -display %topics -returnchar %300 -author % -date %0 -searchsub %1 -terms %all
Example: terms %all -search %all -sortad %d -author %Altansar
Example: terms%all-search%all-sortad%d-author%Altansar
