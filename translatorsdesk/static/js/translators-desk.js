/**
 * holds references to all available CodeMirror instances on the page
 * @type {Array}
 */
var editors = [];

/**
 * Instantiates all available codemirror_blocks as CodeMirror instances
 */
$(".codemirror_block").each(function(){
	var editor = CodeMirror($(this)[0], {
	  value: "working !!",
	  mode: "simple",
	  theme : 'eclipse',
	  lineNumbers: true,
	  lineWrapping : true,
	});
	editors.push(editor);
})