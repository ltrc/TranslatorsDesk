function update_po_data(entries) {
	console.log(entries);

	entries = JSON.parse(entries);

	$.each(entries, function(ind, para){
		para = JSON.parse(para);
		paraid = para[0];
		idx = para[1];
		words = para[2];
		console.log(words);
		window.sentsDone += 1;
		window.modal_data[paraid+"_"+idx] = ["", ""];
		var tgt_str_to_show = "";
		var src_str_to_show = "";
		$.each(words, function(index, val) {
			tgt_str_to_show += val[1]+ " ";
			window.modal_data[paraid+"_"+idx][1] += "<span id='"+val[1]+"_"+paraid+"_"+idx+"_"+index+"' class='tgt_word'>"+val[1]+"</span> ";;
			src_str_to_show += val[0]+ " ";
			window.modal_data[paraid+"_"+idx][0] += "<span id='"+val[0]+"_"+paraid+"_"+idx+"_"+index+"' class='src_word'>"+val[0]+"</span> ";
			window.PO_DATA_WORDS1[val[0]+"_"+paraid+"_"+idx+"_"+index] = val[1]+"_"+paraid+"_"+idx+"_"+index;
			window.PO_DATA_WORDS2[val[1]+"_"+paraid+"_"+idx+"_"+index] = val[0]+"_"+paraid+"_"+idx+"_"+index;
		});
		$('#src_'+paraid+'_'+idx).html(src_str_to_show);
		$('#tgt_'+paraid+'_'+idx).fadeOut(function() {
			$(this).html(tgt_str_to_show);
		});
		$('#tgt_'+paraid+'_'+idx).fadeIn();
	});
	make_progress(sentsDone, sentsToGet);
	if (sentsDone == sentsToGet) {
		make_progress(0,100);
	}
	fix_highlighting();
}


function process_po_data(entries) {
	$.each(entries, function(paraid, paradata){
		$.each(paradata, function(idx, data) {
			window.modal_data[paraid+"_"+idx] = ["",""];
			var tgt_str_to_show = "";
			var src_str_to_show = "";
			console.log("HAHA");
			console.log(data);
			if (data.tgt != null) {
				src_str_to_show = data.src;
				tgt_str_to_show = data.tgt;
				var test_tgt = "";
				$.each(data.words, function(index, val) {
					window.modal_data[paraid+"_"+idx][1] += "<span id='"+val[1]+"_"+paraid+"_"+idx+"_"+index+"' class='tgt_word'>"+val[1]+"</span> ";
					window.modal_data[paraid+"_"+idx][0] += "<span id='"+val[0]+"_"+paraid+"_"+idx+"_"+index+"' class='src_word'>"+val[0]+"</span> ";
					window.PO_DATA_WORDS1[val[0]+"_"+paraid+"_"+idx+"_"+index] = val[1]+"_"+paraid+"_"+idx+"_"+index;
					window.PO_DATA_WORDS2[val[1]+"_"+paraid+"_"+idx+"_"+index] = val[0]+"_"+paraid+"_"+idx+"_"+index;
					test_tgt += val[1] + " ";
				});
				console.log("MATCHING: ", test_tgt, tgt_str_to_show, $.trim(test_tgt) != $.trim(tgt_str_to_show));
				if ($.trim(test_tgt) != $.trim(tgt_str_to_show)) {
					console.log(test_tgt);
					console.log(tgt_str_to_show);
					window.modal_data[paraid+"_"+idx][1] = tgt_str_to_show;
				}
			}
			else {
				window.sentsToGet += 1;
				src_str_to_show = data.src;
				tgt_str_to_show = data.src;
			}

			$("#po-container").append('<div class="panel-row"><div class="panel-title" id="para_'+paraid+'_'+idx+'"><span class="source-text" id="src_'+paraid+'_'+idx+'">\
				'+src_str_to_show+'</span><span class="target-text" id="tgt_'+paraid+'_'+idx+'">'+tgt_str_to_show+'</span></div></div>');
		});
	});
	var tgtLang = window.tgt_lang; 
	$('.panel-title').siblings().hide();
	var activePanel;
	$('.panel-title').click(function(event) {
		window.modal_current = $(this).parent();
		event.stopPropagation();
		$('#po-container').addClass("blur");
		$('#sentence_overlay').fadeIn(200);
		$('#modal_prev').text('');
		$('#modal_next').text('');
		$('.toolbar').fadeOut(200);
		$('#modal_prev').fadeIn(200);
		$('#modal_next').fadeIn(200);
		$('#sentence_overlay').animate({height: "50%"}, 300, function() {
			setup_modal();
		});
		render_modal();
	}); 
	$('#sentence_overlay #close_btn').click(function() {
		event.stopPropagation();
		$('#po-container').removeClass("blur");
		$('.toolbar').fadeIn(200);
		$('#sentence_overlay').animate({height: "0"}, 300);
		$('#sentence_overlay').fadeOut(200);
		$('#modal_prev').fadeOut(200);
		$('#modal_next').fadeOut(200);
	});
	$('#sentence_overlay').click(function() {
		event.stopPropagation();
	});
	$(document).click(function() {
		$('#po-container').removeClass("blur");
		$('.toolbar').fadeIn(200);
		$('#sentence_overlay').animate({height: "0"}, 300);
		$('#sentence_overlay').fadeOut(200);
		$('#modal_prev').fadeOut(200);
		$('#modal_next').fadeOut(200);
	});
}


$(document).ready(function(){
	window.modal_data = {};
	window.unsaved = false;
	window.onbeforeunload = null;
	window.corrected_data = {};
	if(window.PO_DATA){
		window.PO_DATA = JSON.parse(window.PO_DATA);
		window.PO_DATA_WORDS1 = {}
		window.PO_DATA_WORDS2 = {}  // Source to target and vice versa
		window.sentsToGet = 0;
		window.sentsDone = 0;
		if (window.PO_DATA.data) {
			window.tgt_lang = PO_DATA.data.tgt_lang;
			window.src_lang = PO_DATA.data.src_lang;
			process_po_data(window.PO_DATA.data.entries);
		}
	}
	else {
		console.log("SHOULDNT SEE THIS");
	}
});


function render_modal() {
	var element = window.modal_current.find('.panel-title');
	try {
		var paraid_prev = element.parent().prev().find('.panel-title').attr('id').split('_')[1];
		var sentid_prev = element.parent().prev().find('.panel-title').attr('id').split('_')[2];
		$('#modal_prev').html(window.modal_data[paraid_prev+"_"+sentid_prev][0]+"<br />"+window.modal_data[paraid_prev+"_"+sentid_prev][1]);
	} catch (err) {
		$('#modal_prev').html("");
	}
	try {
		var paraid_next = element.parent().next().find('.panel-title').attr('id').split('_')[1];
		var sentid_next = element.parent().next().find('.panel-title').attr('id').split('_')[2];
		$('#modal_next').html(window.modal_data[paraid_next+"_"+sentid_next][0]+"<br />"+window.modal_data[paraid_next+"_"+sentid_next][1]);
	} catch (err) {
		$('#modal_next').html("");
	}


	var paraid = element.attr('id').split('_')[1];
	var sentid = element.attr('id').split('_')[2];
	var src_text = element.find('.source-text').text();
	var tgt_text = element.find('.target-text').text();
	$('#modal_src').html(window.modal_data[paraid+"_"+sentid][0]);
	$('#modal_tgt').html(window.modal_data[paraid+"_"+sentid][1]);
	editors[0].setValue(tgt_text);
	editors[0].off("change", update_backend);
	editors[0].on("change", update_backend);
	editors[0].on("keyup", function(cm, change){
		$(editors[0].getWrapperElement()).stop();
	});
	fix_highlighting();
}

function update_backend(){ 
	if ($.trim(editors[0].getValue().replace(/(<([^>]+)>)/ig,"")) != $.trim($('#modal_tgt').html().replace(/(<([^>]+)>)/ig,""))) {
		window.onbeforeunload = confirmOnPageExit;
		window.unsaved = true;
		var element = window.modal_current.find('.panel-title');
		var paraid = element.attr('id').split('_')[1];
		var sentid = element.attr('id').split('_')[2];
		$('#modal_tgt').html(editors[0].getValue());
		window.corrected_data[paraid+"_"+sentid] = editors[0].getValue();
		$('#tgt_'+paraid+'_'+sentid).html(editors[0].getValue());
	}
}

function fix_highlighting() {
	$('.tgt_word').mouseover(function() {
		var word = this.id;
		var otherword = window.PO_DATA_WORDS2[word];
		console.log(word, otherword);
		$(this).addClass("highlight");
		$('.src_word').removeClass("highlight");
		$('.src_word#'+otherword).addClass("highlight");
	});

	$('.tgt_word').mouseout(function() {
		$(this).removeClass("highlight");
		$('.src_word').removeClass("highlight");
	});

	$('.src_word').mouseover(function() {
		var word = this.id;
		var otherword = window.PO_DATA_WORDS1[word];
		console.log(word, otherword);
		$(this).addClass("highlight");
		$('.tgt_word').removeClass("highlight");
		$('.tgt_word#'+otherword).addClass("highlight");
	});

	$('.src_word').mouseout(function() {
		$(this).removeClass("highlight");
		$('.tgt_word').removeClass("highlight");
	});

	$('.tgt_word').click(function() {
		var word = this.innerHTML;
		console.log(word);
		socket.emit("translators_desk_get_word_details", 
		{
			data: word, 
			tgt: window.src_lang, 
			src: window.tgt_lang
		});
		socket.on("translators_desk_get_word_details_"+$.md5(word.toLowerCase()), response_word_suggestion);
	});

	$('.src_word').click(function() {
		var word = this.innerHTML;
		console.log(word);
		socket.emit("translators_desk_get_word_details", 
		{
			data: word, 
			tgt: window.tgt_lang,
			src: window.src_lang
		});
		socket.on("translators_desk_get_word_details_"+$.md5(word.toLowerCase()), response_word_suggestion);
	});

}


function response_word_suggestion(data) {
	data = JSON.parse(data);
	console.log(data);
	$('#modal_details').html("<big>"+data["word"]+": ( "+data["cat"]+" ) "+data["meaning"]+"<br /><i>Example: \""+data["example"]+"\"</i><br />Alternate translations: "+data["alternate"].join(" &bull; "));
}

function setup_modal() {
	var CODEMIRROR_EDITOR_ID = 0;    
	var tgtLang = window.tgt_lang;
	init_editors(false, tgtLang[0].toLowerCase()+tgtLang[1].toLowerCase());
	$('#codemirror_block_1').width("100%");
	var offset = $('.codemirror_block').offset();
	var editor_top = offset.top;
	var editor_left = offset.left;
	var editor_width = $('.codemirror_block').width();
}
