(function() {
  "use strict";
  // console.log("Loaded suggestions yo. ");
  CodeMirror.registerHelper("hint", "translators_desk_aspell", function(editor, options) {
  	console.log("SHOWING HINT!");
    return {list: options.translators_desk_aspell_suggesstions,
            from: editor.currentWordRange.anchor,
            to: editor.currentWordRange.head}
  });

})();