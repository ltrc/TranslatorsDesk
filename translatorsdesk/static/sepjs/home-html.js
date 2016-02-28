function getLangPairs(response) {
	response = JSON.parse(response);
	console.log(response);
	var initValue = "";
	$.each(response, function(key, val) {
		LangPairs[LangFormatMapping[key]] = val;
	});
	$.each(LangPairs, function(key, val) {
		$('#sourceList').append("<li>"+key+"</li>");
		initValue = key;
	});

			$("#sourceList li").click(function(){
		  var selText = $(this).text();
		  // selText = LangFormatMapping[selText];
		  console.log(selText);
		  $('#sourceLanguage').html(selText);
			set_editor_language(editors[0], selText[0].toLowerCase()+selText[1]);


		  $('#targetList').html("");

		  $.each(LangPairs[selText], function(key, val) {
		    $('#targetList').append("<li>"+LangFormatMapping[val]+"</li>");
		  });
		  
		  $("#targetList li").click(function(){
		  var selText = $(this).text();
		  console.log(selText);
		  $('#targetLanguage').html(selText);
		});
		});

		
}

$(document).ready(function(){
	if(editors.length > 0){
		init_editors(false, "hi");
	}
	socket.emit("translators_desk_get_lang_pairs");
	socket.on("translators_desk_get_lang_pairs_response", getLangPairs);
	editors[0].setSize($(window).width()*0.60,$(window).height()*0.65);
	
	var editor_height = $('.codemirror_block').height();
	var editor_width =  $('.codemirror_block').width();
	console.log(editor_height, editor_width);
	$('#editor_overlay').css({height: $(window).height()*0.65, width: $(window).width()*0.60});
	$('#editor_overlay').css({maxHeight: editor_height, maxWidth: editor_width});
	var offset = $('.codemirror_block').offset();
	var editor_top = offset.top;
	var editor_left = offset.left
	console.log($('#editor_overlay').height());
	console.log(editor_top, editor_left);

	$('#editor_overlay').css({top: editor_top, left: editor_left});
	$('.change_lang_btn').click(function() {
		$('.codemirror_block').addClass("blur");
		$('#editor_overlay').fadeIn();
	});
	$('#dismiss_overlay').click(function(){
		$('#editor_overlay').fadeOut(function() {
			$('.codemirror_block').removeClass("blur");
		});
	});
	$('#lang_interchange').click(function() {
		var source = $('#sourceLanguage').html();
		var target = $('#targetLanguage').html();
		$('#sourceLanguage').html(target);
		$('#targetLanguage').html(source);
		set_editor_language(editors[0], target[0].toLowerCase()+target[1]);

	});
	$('.change_lang_btn').click();
})