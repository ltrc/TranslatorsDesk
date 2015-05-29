(function() {
  "use strict";

  CodeMirror.registerHelper("hint", "translators_desk_aspell", function(editor, options) {
    return {list: options.translators_desk_aspell_suggesstions,
            from: editor.currentWordRange.anchor,
            to: editor.currentWordRange.head}
  });

})();