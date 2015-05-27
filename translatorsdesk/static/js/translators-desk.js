/**
 * holds references to all available CodeMirror instances on the page
 * @type {Array}
 */
var editors = [];
var currentEditor = null;

var currentContextMenuTargetEditor = null;
var ContextMenuObjects = {};
ContextMenuObjects.translators_desk_ner_submenu =
	[
		{
			header: '<span class="translators_desk_context_menu_header">NER</span>'
		},
		{
			text: '<i class="fa fa-plus-circle trasnlators_desk_mark_as_ner"></i> Add NER markers',
			action: function(e){
				window.spm = e;
				var editor = currentContextMenuTargetEditor;
				mark_selection_as_ner(editor);
			}
		},
		{
			text: '<i class="fa fa-minus-circle trasnlators_desk_mark_as_ner"></i> Clear NER markers',
			action: function(e){
				window.spm = e;
				var editor = currentContextMenuTargetEditor;
				unmark_selection_as_ner(editor);
			}
		}		
	]
ContextMenuObjects .translators_desk_selected_text_menu = ContextMenuObjects.translators_desk_ner_submenu;

/**
 * Instantiates all available codemirror_blocks as CodeMirror instances
 */
$(".codemirror_block").each(function(){
	var editor = CodeMirror($(this)[0], {
	  value: "मेरी सखी पिछले पांच साल से यहाँ रह रही है | ",
	  mode: "simple",
	  theme: 'eclipse',
	  lineNumbers: true,
	  lineWrapping: true,
	  styleSelectedText: true,
	  dragDrop: false
	});

	/**
	 * Dynamically adds `get_selected_range` function to the editor instance
	 */
	editor.get_selected_range = function() {
	  return { from: editor.getCursor(true), to: editor.getCursor(false) };
	};
	editors.push(editor);
})

/**
 * Gets the editor_id corresponding to a translators desk menu item
 * @param  menu_item jquery_selector_object
 * @return int
 */
function get_corresponding_editor_id_from_menu_item(menu_item){
	return $(menu_item).parents(".codemirror_menu").attr("td-editor-id");
}
/**
 * Gets the editor object corresponding to a translators desk menu item
 * @param  menu_item jquery_selector_object
 * @return CodeMirror editor object
 */
function get_corresponding_editor_from_menu_item(menu_item){
	var editor_id = parseInt(get_corresponding_editor_id_from_menu_item(menu_item));
	return editors[editor_id-1];
}

/**
 * Gets the editor_id corresponding to a translators desk codemirror element
 * @param  codemirror_element jquery_selector_object
 * @return int
 */
function get_corresponding_editor_id(codemirror_element){
	return $(codemirror_element).parents(".codemirror_block").attr("td-editor-id");
}
/**
 * Gets the editor object corresponding to a translators desk codemirror element
 * @param  codemirror_element jquery_selector_object
 * @return CodeMirror editor object
 */
function get_corresponding_editor(codemirror_element){
	var editor_id = parseInt(get_corresponding_editor_id(codemirror_element));
	return editors[editor_id-1];
}

/**
 * [mark_selection_as_ner description]
 * @param  {CodeMirror} editor             [description]
 * @param  {boolean} snapWordBoundaries [description]
 */
function mark_selection_as_ner(editor){
	if(editor.somethingSelected() && editor.getSelection().trim() != "" ){
		var selected_range = editor.get_selected_range();
		
		//Unmark all previous marks in that range
		unmark_selection_as_ner(editor);

		var selection = editor.markText(selected_range.from, 
			selected_range.to, 
			{
				className: "translators-desk-marker-ner",
				addToHistory: true,
			});
	}else{
			//TODO : Add handler for NER click on no selection 
			console.log("You have not selected text yet");
	}
}

function unmark_selection_as_ner(editor){
	if(editor.somethingSelected() && editor.getSelection().trim() != ""){
		var selected_range = editor.get_selected_range();
		/**
		 * Handle intersections with all previously recorded marks in the range
		 * ** Clear all previous marks in the same range
		 * ** TODO : Handler markers at the beginning and end of selection 
		 */
		var marksInRange = editor.findMarks(selected_range.from, selected_range.to)
		$(marksInRange).each(function(){
			$(this).get(0).clear();
		})
	}
}

/**
 * Collects NER markers from all across the text
 */
function collectNERMarkers(editor){
	return editor.getAllMarks()
}


/**
 * Collects all differente types of markers from all across the text
 */
function collectMarkers(editor){
	return collectNERMarkers(editor);
}


/**
 * Collects all metadata available with the editor as a json object
 */
function collectTextMetaDataBeforeSave(editor){
	return {
		markers: collectMarkers(editor),
		history: editor.getHistory()
	}
}


/**
 * Sets up Translators Desk MenuItem Handlers
 */
function setupTranslatorsDeskMenuItemHandlers(){

	/**
	 * Click Handler for Undo Button
	 */
	$(".td-menu-item-undo").click(function(d){
		var editor = get_corresponding_editor_from_menu_item($(this));
		editor.execCommand("undo");
	});

	/**
	 * Click Handler for Redo Button
	 */
	$(".td-menu-item-redo").click(function(d){
		var editor = get_corresponding_editor_from_menu_item($(this));
		editor.execCommand("redo");
	})
}

function intitContextualMenus(){
	context.init({
		fadeSpeed: 100,
		filter: function ($obj){},
		above: true	,
		compress: false
	});
}

/**
 * Sets up all event handlers required for TextSelection events
 */
function setupTextSelectionHandlers(){
	$(editors).each(function(){
		/**
		 * TODO: 
		 * Look for a proper event listener to detect end of text selection
		 * currently using ` mouseup` to detect end of selection. 
		 */
		var editor = $(this).get(0);
		$(".codemirror_block").mouseup(function(){

			if(editor.somethingSelected() && editor.getSelection().trim() != ""){ 
				// Something will be selected during a mouseup event only 
				// if it is the end of a text selection
				// if a `mousedown` followed by a `mouseup` is done while a 
				// range of text is selected, it will be automatically deselected
				currentContextMenuTargetEditor = editor;
				context.attach(".CodeMirror-selectedtext", ContextMenuObjects.translators_desk_selected_text_menu);
			}
		});
	});
}

$(document).ready(function(){
	setupTranslatorsDeskMenuItemHandlers();
	intitContextualMenus();
	setupTextSelectionHandlers();
	$("#translators_desk_translate_btn").click(function(){
		var editor = get_corresponding_editor_from_menu_item($(this));
		//Meta data about the text collected and ready to be saved
		console.log(collectTextMetaDataBeforeSave(editor));
	});
})