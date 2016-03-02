/**
 * holds references to all available CodeMirror instances on the page
 * @type {Array}
 */
var editors = [];
var currentEditor = null;
var TranslatorsDeskGlobals = {}
var LangPairs = {}
var currentTranslationStatus = "";
var LangFormatMapping = {
	"hin": "Hindi", 
	"pan": "Panjabi",
	"urd": "Urdu"
}

var TranslationResults = {}		// Stores the result obtained from translations done via the desk.

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

function get_editors_on_page() {
$(".codemirror_block").each(function(){
	var editor = CodeMirror($(this)[0], {
	  value: "",
	  mode: "simple",
	  viewportMargin: 20,
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
}


/**
 * Configures Per-language auto-suggestion query thresholds
 */

TranslatorsDeskGlobals.word_length_query_threshold = {}
TranslatorsDeskGlobals.word_length_query_threshold['en'] = 1
TranslatorsDeskGlobals.word_length_query_threshold['hi'] = 1
TranslatorsDeskGlobals.word_length_query_threshold['pa'] = 1
TranslatorsDeskGlobals.word_length_query_threshold['te'] = 1
TranslatorsDeskGlobals.word_length_query_threshold['ta'] = 1
TranslatorsDeskGlobals.word_length_query_threshold['ur'] = 1

var editor_word_length_query_threshold;
/**
 * Instantiates Translators Desk Word Suggesstion 
 */
CodeMirror.commands.translators_desk_aspell = function(editor) {
	console.log("YAYYY");
	editor_word_length_query_threshold = TranslatorsDeskGlobals.word_length_query_threshold[get_editor_language(editor)]

	editor.currentWord = editor.getCurrentWord();
	editor.currentWordRange = editor.getCurrentWordRange();
	console.log(get_editor_language(editor));
	if(editor.currentWord && editor_word_length_query_threshold && editor.currentWord.trim().length > editor_word_length_query_threshold ){
		//Only consider words of length more than 3
		console.log("CHECKING");
		socket.emit("translators_desk_get_word_suggestion", 
					{
						data: editor.currentWord, 
						lang: get_editor_language(editor)
					})

		var socket_response_listener = function(data){	
			// TODO : The removelistener code is not working now
			// Fix this
			// Remove corresponding event listener
			console.log(data);
			//Display the hint
			var data = JSON.parse(data);
			if (data.spellings) {
				editor.showHint({
								hint: CodeMirror.hint.translators_desk_aspell,
								translators_desk_aspell_suggesstions: data.spellings
							});	
			}
			if (data.synonyms) {
				show_syns(editor, data.synonyms);
			}
			else {
				show_syns(editor, []);
			}
		}	
		socket.on("translators_desk_get_word_suggestion_"+$.md5(editor.currentWord.toLowerCase()), socket_response_listener);
	}
}

/**
 * Returns the current wordRange of the editor
 */
CodeMirror.prototype.getCurrentWordRange = function(){
	return this.findWordAt(this.getCursor());
}
/**
 * Returns the current word the editor is at
 */
CodeMirror.prototype.getCurrentWord = function(){
	var wordRange = this.getCurrentWordRange();
	return  this.getRange(wordRange.anchor, wordRange.head);
}

/**
 * Returns the beginning of the document as Codemirror.Pos object
 * @return {[type]} [description]
 */
CodeMirror.prototype.getDocBeginning = function(){
	return CodeMirror.Pos(0,0)
}

/**
 * Returns the end of the document as Codemirror.Pos object
 * @return {[type]} [description]
 */
CodeMirror.prototype.getDocEnd = function(){
	return CodeMirror.Pos(this.lastLine(),this.getLine(this.lastLine()).length)
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
 * Marks a selected range as NER
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
/**
 * Removes ner-marks from a selection range
 */
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
			if( $(this).get(0).className == "translators-desk-marker-ner"){
				$(this).get(0).clear();
			}
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

CodeMirror.prototype.disable = function(){
	this.setOption("readOnly", true);
	this.setOption("cursorHeight", 0);
}

CodeMirror.prototype.enable = function(){
	this.setOption("readOnly", false);
	this.setOption("cursorHeight", 1);
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
		editor.execCommand("undoSelection");
	});

	/**
	 * Click Handler for Redo Button
	 */
	$(".td-menu-item-redo").click(function(d){
		var editor = get_corresponding_editor_from_menu_item($(this));
		editor.execCommand("redoSelection");
	})


	$(".td-menu-item-spell-check").click(function(d){
		var editor = get_corresponding_editor_from_menu_item($(this));

		if($(this).hasClass("td-menu-item-spell-check-selected")){
			$(this).removeClass("td-menu-item-spell-check-selected");
			editor.spellCheckMode = false;

			//Clear Spelling Mistake Markers
			var marksInRange = editor.findMarks(editor.getDocBeginning(), editor.getDocEnd());
			$(marksInRange).each(function(){
				if( $(this).get(0).className == "translators-desk-marker-spell-error"){
					$(this).get(0).clear();
				}
			})

			editor.enable();

		}else{
			editor.disable();
			$(this).addClass("td-menu-item-spell-check-selected");
			editor.spellCheckMode = true;
			editor.markSpellingMistakes();
		}
	})
}

function getCodeMirrorPosObjectFromLineMatchesAndStringMatches(lineMatches, stringMatches){
	var result = []
	for(var x=0; x<stringMatches.length; x++){
		for(var y=0; y < lineMatches.length; y++){
			if(lineMatches[y] > stringMatches[x] ){
				break
			}
		}
		if(y!=0){
			result.push(CodeMirror.Pos(y, stringMatches[x] - lineMatches[y-1]))
		}else{
			result.push(CodeMirror.Pos(y, stringMatches[x]))
		}
	}
	return result;
}

/**
 * Returns list of index values where the substring occurs in the string
 */
function getIndicesOfMatches(string, word){
	var re = new RegExp(word, "ig");
	var result = []
	while ((match = re.exec(string)) != null) {
	    result.push(match.index);
	}

	return result;
}

/**
 * Given a word, it returns a list of ranges in the document where it occurs
 */
CodeMirror.prototype.getMatchRangesFromWord = function(word){
	var lineMatches = getIndicesOfMatches(this.getValue(), "\n");
	var stringMatches = getIndicesOfMatches(this.getValue(), word);

	var PosListOfMatches = getCodeMirrorPosObjectFromLineMatchesAndStringMatches(lineMatches, stringMatches);
	var RangeList = []
	for(var i=0;i<PosListOfMatches.length; i++){
		RangeList.push(this.findWordAt(PosListOfMatches[i]));
	}

	return RangeList;
}

/**
 * Divides the document into separate words, and
 * emits the spell check query
 * TODO :: maintain an inhouse cache
 * TODO :: not the most efficient implementation, should be replaced
 * by a smart on the fly spell check
 */
CodeMirror.prototype.markSpellingMistakes = function(){
	var words = this.getValue();
	var punctuation_regex = /([\.,!":\?।|])+/g;
	words = words.replace(punctuation_regex, " ");
	words = words.match(/\S+\s*/g);
	socket.emit('spell_check_cache_query', {
		data : JSON.stringify(words),
		lang: get_editor_language(this)
	});
}

/**
 * Marks the list of words as error in the document
 */
CodeMirror.prototype.markWordsAsSpellingMistake = function(words){
	for(var i=0;i < words.length; i++){
		//Find All instances of the word
		var ranges = this.getMatchRangesFromWord(words[i]);

		for(var j=0; j<ranges.length; j++){
			this.markText(ranges[j].anchor, ranges[j].head, {
				className : "translators-desk-marker-spell-error",
				addToHistory : false,
			});
		}
	}
}


function setupSpellCheck(){
	$(editors).each(function(){
		var editor = $(this).get(0);
		socket.on('spell_check_cache_query_response', function(words){
			// Mark all instances of the words in this list as spelling mistake
			editor.markWordsAsSpellingMistake(JSON.parse(words));
		})
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

function get_editor_language(editor) {
	if (window.tgt_lang) {
		var tgtLang = window.tgt_lang;
		return tgtLang[0].toLowerCase()+tgtLang[1].toLowerCase();
	}
	else {
		return $('#sourceLanguage').text()[0].toLowerCase()+$('#sourceLanguage').text()[1];
	}
}

/**
 * Holds the default input methods for supported languages
 */
TranslatorsDeskGlobals.default_input_methods = function(language){
	switch(language){
		case 'hi':
			return 'hi-transliteration'
		case 'pa':
			return 'pa-transliteration'
		case 'te':
			return 'te-transliteration'
		case 'ta':
			return 'ta-transliteration'
		case 'ur':
			return 'ur-transliteration'
		default:
			return false
	}
}

/**
 * Instantiates jquery.ime for regional language inputs
 */
function setupInputMethods(editor, options){
	// build_language_list_menu(editor, options)
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
		// get_editor_language_menu(editor).val(options.defaultLanguage);

		if(options.defaultIM){
			set_editor_input_method(editor, options.defaultIM);
		}
		else {
			set_editor_input_method(editor, TranslatorsDeskGlobals.default_input_methods(options.defaultLanguage));
		}
	}
}

/**
 * Finds the word and word Range at a particular location
 */

CodeMirror.prototype.getWordAt =function(position){
	var wordRange = this.findWordAt(position);
	var word = this.getRange(wordRange.anchor, wordRange.head);
	return {
		word : word,
		wordRange : wordRange
	}
}

/**
 * Updates the internal data store with the latest word at the cursor
 */
function updateCurrentWord(editor){
	var currentWord = editor.getWordAt(editor.getCursor());
	editor.currentWordRange = currentWord.wordRange;
	editor.currentWord = currentWord.word;
}

function setupCursorActivityHandlers(){
	$(editors).each(function(){
		$(this).get(0).on('cursorActivity', function(editor){


			if(editor.spellCheckMode){
				var marksAtPosition = editor.findMarksAt(editor.getCursor());
				$(marksAtPosition).each(function(){
					if( $(this).get(0).className == "translators-desk-marker-spell-error"){
						//Initiate the autocomplete form on cursorActivity on wrongly spelled word
						CodeMirror.commands.translators_desk_aspell(editor);
					}
				})
			}
		});
	});
}
/**
 * Setups up Events Handlers for content change in the editor
 */
function setupCodeMirrorInputReadEventHandlers(){
	$(editors).each(function(){
		$(this).get(0).on("inputRead", function(editor){
			CodeMirror.commands.translators_desk_aspell(editor);
		})
	})
}

function setupChangeHandlers(){
	$(editors).each(function(){
		$(this).get(0).on('beforeChange', function(editor, change){
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

/**
 * Clears the value in all editor instances. 
 */
function clearAllEditors() {
	for (var i=0; i<editors.length; i++) {
		editors[i].setValue("");
	}
}


function init_editors(redoGetEditors, lang) {
		console.log('Preparing editors...');
		if (redoGetEditors == true) {
			get_editors_on_page();
		}
		console.log(editors);
		setupTranslatorsDeskMenuItemHandlers();
		intitContextualMenus();
		setupTextSelectionHandlers();
		setupCursorActivityHandlers();
		setupChangeHandlers();
		setupCodeMirrorInputReadEventHandlers();
		setupSpellCheck();
		$.each(editors, function(index, editor) {
			console.log(index);
			setupInputMethods(editor,
				{
					defaultLanguage: lang,			
					languages: ['en','hi','pa', 'te', 'ta', 'ur']
				}
			);
		});
}

var hero_logo_opts = ["Anuvaad", "अनुवाद", "ترجمہ", "అనువాద"];
var hero_logo_index = -1;

function rotate_hero_logo() {
	$('#hero_logo').fadeOut(function() {
		var newopt = Math.floor(Math.random()*1000) % hero_logo_opts.length;
		while (newopt==hero_logo_index) {
			newopt = Math.floor(Math.random()*1000) % hero_logo_opts.length;
		}
		hero_logo_index = newopt;
		$('#hero_logo').text(hero_logo_opts[newopt]);
		$('#hero_logo').fadeIn();
	});
}

function show_syns(editor, syns) {
	$('#word_suggestions').html("");
	$.each(syns, function(index, val) {
		$('#word_suggestions').append("<li class='anim'>"+val+"</li>");
	});
	if (syns.length==0) {
		$('#word_suggestions').html("<li class='anim'>Word suggestions will appear here</li>");
	}
}


function make_progress(i, n) {
	$('#progressbar').stop().animate({width: ((i%n)*100/n)+"%"}, 100);
}

$(document).ready(function(){
	window.setInterval(rotate_hero_logo, 2000);	
	get_editors_on_page();
	console.log('Initializing socket IO');
	setupSocketIO();
});