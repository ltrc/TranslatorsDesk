# -*- coding: utf-8 -*-
from flask_assets import Bundle, Environment

css = Bundle(
    "libs/bootstrap/dist/css/bootstrap.css",
    "libs/CodeMirror/lib/codemirror.css",
    "libs/jquery.ime/css/jquery.ime.css",
    "libs/CodeMirror/theme/eclipse.css",
    "libs/Context.js/context.bootstrap.css",
    "libs/CodeMirror/addon/hint/show-hint.css",    
    "libs/CodeMirror/addon/dialog/dialog.css",    
    "libs/CodeMirror/addon/search/matchesonscrollbar.css",    
    "libs/dropzone/dist/dropzone.css",
    "css/style.css",
    "css/translators-desk.css",
    "css/dropzone.css",
    filters="cssmin",
    output="public/css/common.css"
)

js = Bundle(
    "libs/jQuery/dist/jquery.js",
    "libs/SocketIO/dist/socket.io.min.js",
    "libs/bootstrap/dist/js/bootstrap.js",
    "libs/jquery.ime/libs/rangy/rangy-core.js",
    "libs/jquery.ime/src/jquery.ime.js",
    "libs/jquery.ime/src/jquery.ime.selector.js",
    "libs/jquery.ime/src/jquery.ime.preferences.js",
    "libs/jquery.ime/src/jquery.ime.inputmethods.js",
    "libs/jQuery-MD5/jquery.md5.js",
    "libs/Context.js/context.js",
    "libs/CodeMirror/lib/codemirror.js",
    "libs/CodeMirror/addon/hint/show-hint.js",
    "libs/CodeMirror/addon/dialog/dialog.js",
    "libs/CodeMirror/addon/search/searchcursor.js",
    "libs/CodeMirror/addon/search/search.js",
    "libs/CodeMirror/addon/scroll/annotatescrollbar.js",
    "libs/CodeMirror/addon/search/matchesonscrollbar.js",
    "libs/dropzone/dist/dropzone.js",
    "js/translators-desk-aspell-hint.js",
    "libs/CodeMirror/addon/display/panel.js",
    "libs/CodeMirror/addon/selection/mark-selection.js",
    "js/translators-desk.js",
    "js/dropzone.js",    
    "js/plugins.js",
    "js/xliffeditor.js",
    filters='jsmin',
    output="public/js/common.js"
)

assets = Environment()

assets.register("js_all", js)
assets.register("css_all", css)
