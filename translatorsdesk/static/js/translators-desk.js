/**
 * holds references to all available CodeMirror instances on the page
 * @type {Array}
 */
var editors = [];
var currentEditor = null;
var TranslatorsDeskGlobals = {}


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
	  value: "",
	  mode: "simple",
	  theme: 'eclipse',
	  lineNumbers: true,
	  lineWrapping: true,
	  styleSelectedText: true,
	  dragDrop: false,
	  extraKeys: {"Ctrl-Space": "translators_desk_aspell"}
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
 * Configures Per-language auto-suggestion query thresholds
 */

TranslatorsDeskGlobals.word_length_query_threshold = {}
TranslatorsDeskGlobals.word_length_query_threshold['en'] = 3
TranslatorsDeskGlobals.word_length_query_threshold['hi'] = 2
TranslatorsDeskGlobals.word_length_query_threshold['pa'] = 2
TranslatorsDeskGlobals.word_length_query_threshold['te'] = 2
TranslatorsDeskGlobals.word_length_query_threshold['ta'] = 2

var editor_word_length_query_threshold;
/**
 * Instantiates Translators Desk Word Suggesstion 
 */
CodeMirror.commands.translators_desk_aspell = function(editor) {
	editor_word_length_query_threshold = TranslatorsDeskGlobals.word_length_query_threshold[get_editor_language_menu(editor).val()]
	if(editor.currentWord && editor_word_length_query_threshold && editor.currentWord.trim().length > editor_word_length_query_threshold ){
		//Only consider words of length more than 3
		socket.emit("translanslators_desk_get_word_suggesstion", 
					{
						data: editor.currentWord, 
						lang: get_editor_language_menu(editors[0]).val()
					})

		var socket_response_listener = function(data){	
			// TODO : The removelistener code is not working now
			// Fix this
			// Remove corresponding event listener
			socket.removeListener("translanslators_desk_get_word_suggesstion_"+$.md5(editor.currentWord.toLowerCase()), socket_response_listener )

			//Display the hint
			editor.showHint({
								hint: CodeMirror.hint.translators_desk_aspell,
								translators_desk_aspell_suggesstions: JSON.parse(data)
							});
		}	
		socket.on("translanslators_desk_get_word_suggesstion_"+$.md5(editor.currentWord.toLowerCase()), socket_response_listener);
	}
}


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

function get_editor_id(editor){
	return $(editor.getWrapperElement()).parents(".codemirror_block").attr("td-editor-id");
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


/**
 * Input Methods specific functions for the editor
 */

/**
 * Return the textarea corresponding to an editor instance
 */
function get_editor_textarea(editor){
	return $(editor.getWrapperElement()).find("textarea");
}

/**
 * get the imeselector instance corresponding to an editor instance
 * @param  {[type]} editor [description]
 * @return {[type]}        [description]
 */
function get_editor_ime_selector(editor){
	return get_editor_textarea(editor).data("imeselector");
}

/**
 * Sets editor language when passed the editor instance and language code
 */
function set_editor_language(editor,language_code){
	get_editor_ime_selector(editor).selectLanguage(language_code);
	//Setup the default input method as configured
	if(TranslatorsDeskGlobals.default_input_methods(language_code)){
		set_editor_input_method(editor, TranslatorsDeskGlobals.default_input_methods(language_code))
	}
}

/**
 * Sets the editor input method when passed the editor instance and input method
 */
function set_editor_input_method(editor, input_method){
	get_editor_ime_selector(editor).selectIM(input_method);
}

/**
 * Returns the language list select object
 */
function get_editor_language_menu(editor){
	var editor_id = get_editor_id(editor);
	return $("#codemirror_menu_"+editor_id).find(".translators_desk_language_list");
}


/**
 * builds and renders the language list corresponding to an editor instance and the given options
 */
function build_language_list_menu(editor, options){
	console.log("Building language list menu");

	$.each($.ime.languages, function(key, value){
		if(options.languages){
			//If a default list of languages is submitted, then render only those
			if(options.languages.indexOf(key) != -1){
				$('<option>').val(key).text(value.autonym).appendTo(get_editor_language_menu(editor));
			} 
		}else{
			//If a default list of languages is not submitted, then render all the available languages
			$('<option>').val(key).text(value.autonym).appendTo(get_editor_language_menu(editor));
		}
	})
	$(".translators_desk_language_list").change(function(){
		set_editor_language(get_corresponding_editor_from_menu_item($(this)), $(this).val());
	});
}

/**
 * Holds the default input methods for supported languages
 */
TranslatorsDeskGlobals.default_input_methods = function(language){
	switch(language){
		case 'hi':
			return 'hi-phonetic'
		case 'pa':
			return 'pa-phonetic'
		case 'te':
			return 'te-transliteration'
		case 'ta':
			return 'ta-transliteration'
		case 'ur':
			return 'ur-phonetic'
		default:
			return false
	}
}

/**
 * Instantiates jquery.ime for regional language inputs
 */
function setupInputMethods(editor, options){
	build_language_list_menu(editor, options)
	if(!options.imePath){
		options.imePath = "/static/libs/jquery.ime/";
	}
	console.log(options.languages);
	get_editor_textarea(editor).ime({
		languages: options.languages,
		imePath: options.imePath
	});
	if(options.defaultLanguage){
		set_editor_language(editor, options.defaultLanguage);
		get_editor_language_menu(editor).val(options.defaultLanguage);

		if(options.defaultIM){
			set_editor_input_method(editor, options.defaultIM);
		}
	}
}

function updateCurrentWord(editor){
	editor.currentWordRange = editor.findWordAt(editor.getCursor());
	editor.currentWord = editor.getRange(editor.currentWordRange.anchor, editor.currentWordRange.head);
}

function setupCodeMirroContentChangeEventHandlers(){
	$(editors).each(function(){
		$(this).get(0).on("change", function(editor){
			updateCurrentWord(editor);
			CodeMirror.commands.translators_desk_aspell(editor);
		})
	})
}

/**
 * Sets up Socket IO Event Handlers
 */

function setupSocketEventHandlers(){
	//Test Echo Event receiver
    socket.on('translanslators_desk_echo_response', function(msg) {
        console.log('Received: ' + msg.data );
    });
}

/**
 * Sets up SocketIO connection
 */
function setupSocketIO(){
	var namespace = "/td";
    window.socket = io.connect('http://' + document.domain + ':' + location.port + namespace);

    socket.on('connect', function() {
                console.log("Translators Desk Socket Connected !!");
            });	
    setupSocketEventHandlers();
}

$(document).ready(function(){
	setupSocketIO();
	setupTranslatorsDeskMenuItemHandlers();
	intitContextualMenus();
	setupTextSelectionHandlers();
	setupCodeMirroContentChangeEventHandlers();
	setupInputMethods(editors[0],
								{
									defaultLanguage: "hi",
									defaultIM: "hi-phonetic",
									languages: ['en','hi','pa', 'te', 'ta', 'ur']
								}
		);

	$("#translators_desk_translate_btn").click(function(){
		var editor = get_corresponding_editor_from_menu_item($(this));
		//Meta data about the text collected and ready to be saved
		console.log(collectTextMetaDataBeforeSave(editor));
	});
})