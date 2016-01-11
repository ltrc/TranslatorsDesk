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
var sentenceNumber = 1 			// Stores the ID of the sentence that has been translated via the full pipeline mode.
var GLOBAL_sentence_id; 		// Stores the ID of the sentence that is currently being acted upon, by the intermediate pipeline run interface.
var GLOBAL_intermediate_index; 	// Stores the index of the module that is currently selected in the intermediate pipeline run interface.
								// TODO: Streamline the above variables. Debate whether globals are really required for doing this. 

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
	  viewportMargin: 10,
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

	editor.currentWord = editor.getCurrentWord();
	editor.currentWordRange = editor.getCurrentWordRange();
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
		lang: get_editor_language_menu(this).val()
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

/**
 * Returns the language list select object
 */
function get_editor_language_menu(editor){
	var editor_id = get_editor_id(editor);
	// if (editor_id == 0) {
		// return $('#src_selector');
	// }
	return $("#codemirror_menu_"+editor_id).find(".translators_desk_language_list");

}

/**
 * Returns the TARGET language list select object 
 */
function get_target_language(editor){
	var editor_id = get_editor_id(editor);
	return $("#codemirror_menu_"+editor_id).find(".translators_desk_language_list_target");
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
				// $('<option>').val(key).text(value.autonym).appendTo(get_target_language(editor)); TODO: Use this to populate target language select

			} 
		}else{
			//If a default list of languages is not submitted, then render all the available languages
			$('<option>').val(key).text(value.autonym).appendTo(get_editor_language_menu(editor));
			// $('<option>').val(key).text(value.autonym).appendTo(get_target_language(editor)); TODO: See last^

		}
	})
	$(".translators_desk_language_list").change(function(){
		console.log($(this).val());
		set_editor_language(get_corresponding_editor_from_menu_item($(this)), $(this).val());
	});
	// $(".translators_desk_language_list_target").change(function(){	TODO: Use this to change the language in editor 2, the target language editor.
	// 	console.log($(this).val());
	// 	set_editor_language(editors[1], $(this).val());
	// });
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
	socket.on('translators_desk_get_translation_response', function(msg) {
   		var response = JSON.parse(msg);
   		var result = JSON.parse(response["result"]);
    	TranslationResults[sentenceNumber] = result;
   		if (response["type"] == "full") {
   			generateResultSentence(result, Infinity);
    		sentenceNumber += 1;
   		}
   		else if (response["type"] == "intermediate") {
   			generateResultSentence(result, parseInt(response["sentence_id"]));
   		}
    });
}

/**
 * Sets up the intermediate output editor to show output from a particular module.
 */
function showIntermediateOutput(index, sentenceNumber) {
	editors[2].setValue("");
    editors[2].replaceRange(TranslationResults[sentenceNumber][index]+"\n", {line: Infinity});
    GLOBAL_intermediate_index = index.split('-')[1];
    GLOBAL_sentence_id = sentenceNumber;
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
 * Generates the target sentence using final wordgenerator module output from the pipeline. 
 */
function generateResultSentence(result, line_number) {
    var worgGenOut = result["wordgenerator-23"].split('\n'); // FIX: has a hardcoded value of 23. Earlier code of Object.keys(result).length didnt work for intermediate outputs. 
    var tgt_txt = "";
    for (var i in worgGenOut) {
        var ssf = worgGenOut[i].split("\t")
        if (ssf[0].match(/\d+.\d+/)) {
            tgt_txt += ssf[1] + " ";
        }
    }
    console.log(tgt_txt);
    if (line_number != Infinity) {
    	var existingLine = editors[1].getLine(line_number-1);
	    editors[1].replaceRange(tgt_txt, {line: line_number-1, ch: 0}, {line:line_number-1, ch: existingLine.length-1});
	}
	else {
	    editors[1].replaceRange(tgt_txt+"\n", {line: Infinity});
	}
}


/**
 * Fetches the translation for one particular sentence using socket.
 */
function fetchTranslation(sentence, src, tgt, start, end, type) {
	if (type == "full") {
		$('#intermediate_results #sentence_selector').append("<option>"+GLOBAL_sentence_id+": "+sentence.substring(0,60)+" ...</option>");
	}

	socket.emit("translators_desk_get_translation_query", {
			data: sentence,
			src: get_editor_language_menu(editors[0]).val(),
			tgt: get_target_language(editors[0]).val(), // TODO: Fix this hardcoded value. 
			start: start, 
			end: end,
			type: type, 
			sentence_id: GLOBAL_sentence_id
	});
}

/**
 * Splits the source text into sentences so they can be translated one by one by fetchTranslation.
 */
function getSourceSentences(editor) {
    var sentences = editor.getValue().replace(/(\r\n|\n|\r)/gm,"").split('।');
	editors[0].setValue("");

    for (i = 0; i < sentences.length; i++) {
        sentences[i] = sentences[i].trim();
        if (sentences[i].length > 0) {
    		editors[0].replaceRange(sentences[i]+"\n", {line: Infinity});
    		GLOBAL_sentence_id = i;
            fetchTranslation(sentences[i], "hin", "pan", 1, 23, "full"); //TODO: Fix this hardcoded value. 
        }
    }
}


/**
 * Clears the value in all editor instances. 
 */
function clearAllEditors() {
	for (var i=1; i<editors.length; i++) {
		editors[i].setValue("");
	}
}

/**
 * Loads the list of modules whose output is available for display as intermediate module output.
 */
function load_output_selectors(sentence_id) {
	sentence_details = TranslationResults[parseInt(sentence_id) + 1];
	$('#intermediate_results #output_selector').html('');
	$.each(sentence_details, function(index, value) {
		var sentenceNumber = parseInt(sentence_id)+1;
    	$('#intermediate_results #output_selector').append("<li onclick='showIntermediateOutput(\""+index+"\", \""+sentenceNumber+"\")'>"+index.split('-')[0]+"</li>");
    });
	editors[2].setValue("");
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
										defaultLanguage: lang,			// TODO: Put target language here programatically. 
										defaultIM: "hi-phonetic",
										// languages: ['en','hi','pa', 'te', 'ta', 'ur']
										languages: ['en','hi','pa', 'te', 'ta', 'ur']
									}
			);
		});
}

function getLangPairs(response) {
	response = JSON.parse(response);
	console.log(response);
	$.each(response, function(key, val) {
		LangPairs[LangFormatMapping[key]] = val;
	});
	$.each(LangPairs, function(key, val) {
		$('#src_selector').append("<li><a href='#'>"+key+"</a></li>");
	});
			$("#src_selector li a").click(function(){
		  var selText = $(this).text();
		  // selText = LangFormatMapping[selText];
		  console.log(selText);
		  $('#sourceLanguage').html(selText+'<span class="caret"></span>');
			// set_editor_language(editors[0], selText[0].toLowerCase()+selText[1]);


		  $('#tgt_selector').html("");

		  $.each(LangPairs[selText], function(key, val) {
		    $('#tgt_selector').append("<li><a href='#'>"+LangFormatMapping[val]+"</a></li>");
		  });
		  
		  $("#tgt_selector li a").click(function(){
		  var selText = $(this).text();
		  console.log(selText);
		  $('#targetLanguage').html(selText+'<span class="caret"></span>');
		});
		});

		
}

function verifyFileStateChange(result) {
	if (window.translationStatus!='GENERATING_TRANSLATED_PO_FILE:::COMPLETE' && !window.translationStatus.startsWith('OUTPUT_FILE_GENERATED')) {
		fileStateChange(result);
	}
}

function fileStateChange(result) {
	console.log(result[0]);
	
	// if (currentTranslationStatus!=result[0]) {
		currentTranslationStatus = result[0];
		$('#translation_status').text(currentTranslationStatus);
	// }

	if (result[0]!='GENERATING_TRANSLATED_PO_FILE:::COMPLETE' && !result[0].startsWith('OUTPUT_FILE_GENERATED')) {
	    socket.emit('translators_desk_check_file_state', {uid: window.uid, fileName: window.fileName});	
	}
	else {
		window.location.reload();
	}
}


$(document).ready(function(){
    $('<div id="codemirror_block_1" td-editor-id=1 class="codemirror_block raw_text"></div>').insertAfter('#translators-desk-dropzone');
	get_editors_on_page();
	console.log('Initializing socket IO');
	setupSocketIO();
	if(editors.length > 0){
		init_editors(false, "hi");
	}
	socket.emit("translators_desk_get_lang_pairs");
	socket.on("translators_desk_get_lang_pairs_response", getLangPairs);

	if (window.uid) {
	    socket.emit('translators_desk_check_file_state', {uid: window.uid, fileName: window.fileName});
	    socket.on('translators_desk_file_state_change', verifyFileStateChange);		
	}

	// get_editor_textarea(editors[0]).attr("placeholder", "Type your answer here");
	// editors[0].setPlaceholder("hi");
	// TODO: This block ideally doesnt belong here, as it is 
	// not specific to individual CodeMirror instances
	// $('#intermediate_results #sentence_selector').change(function() {
	// 	load_output_selectors(this.value.split(':')[0]);
	// });

	// $('#translators_desk_play_from_intermediate_btn').click(function() {
	// 	$('#intermediate_dialog').dialog("close");
	// 	fetchTranslation(editors[2].getValue(), 'hin', 'pan', GLOBAL_intermediate_index, 23, "intermediate");
	// });

	// $('#translators_desk_show_intermediates_btn').click(function() {
	// 	$('#intermediate_results').show();
	// 	$('#intermediate_dialog').dialog("open");
	// });

	// $('#intermediate_dialog').dialog({
	// 	height: $(window).height()/1.5,
	// 	width: $(window).width()/1.5,
	// 	show: { effect: "explode", duration: 500 },
	// 	hide: { effect: "explode", duration: 500 },
	// 	position: { my: "center", at: "center" },
	// 	autoOpen: false
	// });

	// $("#translators_desk_translate_btn").click(function(){
	// 	$('#translators_desk_show_intermediates_btn').show();
	// 	var editor = get_corresponding_editor_from_menu_item($(this));
	// 	clearAllEditors();
	// 	TranslationResults = {}
	// 	$('#intermediate_results #sentence_selector').html('<option>Select a sentence</option>');

	// 	//Meta data about the text collected and ready to be saved
	// 	console.log(collectTextMetaDataBeforeSave(editor));
	// 	getSourceSentences(editor);
	// });
})