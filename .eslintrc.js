module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "greasemonkey": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "rules": {},
    "overrides": [{
        "files": ["src/*.js"],
        "parserOptions": { "sourceType": "script" },
        "globals": {
            "FORUM_BASE_URL": "readonly", "options": "readonly", "CONNECTED": "readonly",
            "FRIENDS_LIST": "readonly", "USERNAME": "readonly", "rinText": "readonly",
            "contentItemKey": "readonly", "getPagination": "readonly", "rinPaginationState": "readonly",
            "enhanceContent": "readonly", "addLinkToQuote": "readonly"
        }
    }]
};
