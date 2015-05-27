# -*- coding: utf-8 -*-
from flask_assets import Bundle, Environment

css = Bundle(
    "libs/bootstrap/dist/css/bootstrap.css",
    "libs/CodeMirror/lib/codemirror.css",
    "libs/jquery.ime/css/jquery.ime.css",
    "libs/CodeMirror/theme/eclipse.css",
    "libs/Context.js/context.bootstrap.css",
    "css/style.css",
    "css/translators-desk.css",
    filters="cssmin",
    output="public/css/common.css"
)

js = Bundle(
    "libs/jQuery/dist/jquery.js",
    "libs/bootstrap/dist/js/bootstrap.js",
    "libs/jquery.ime/libs/rangy/rangy-core.js",
    "libs/jquery.ime/src/jquery.ime.js",
    "libs/jquery.ime/src/jquery.ime.selector.js",
    "libs/jquery.ime/src/jquery.ime.preferences.js",
    "libs/jquery.ime/src/jquery.ime.inputmethods.js",
    "libs/Context.js/context.js",
    "libs/CodeMirror/lib/codemirror.js",
    "libs/CodeMirror/addon/selection/active-line.js",
    "libs/CodeMirror/addon/display/panel.js",
    "libs/CodeMirror/addon/selection/mark-selection.js",
    "js/translators-desk.js",
    "js/plugins.js",
    filters='jsmin',
    output="public/js/common.js"
)

assets = Environment()

assets.register("js_all", js)
assets.register("css_all", css)
