function getLangPairs(response) {
	response = JSON.parse(response);
	console.log(response);
	var initValue = "";
	$.each(response, function(key, val) {
		LangPairs[LangFormatMapping[key]] = val;
	});
	$.each(LangPairs, function(key, val) {
		$('#sourceList').append("<li class='anim'>"+key+"</li>");
		initValue = val;
	});
			$("#sourceList li").click(function(){
				$('#sourceList li').removeClass("selected-btn");
				$(this).addClass("selected-btn");
		  var selText = $(this).text();
		  // selText = LangFormatMapping[selText];
		  console.log(selText);
		  $('#sourceLanguage').html(selText);
			set_editor_language(editors[0], selText[0].toLowerCase()+selText[1]);


		  $('#targetList').html("");

		  $.each(LangPairs[selText], function(key, val) {
		    $('#targetList').append("<li>"+LangFormatMapping[val]+"</li>");
			$('#targetLanguage').html(LangFormatMapping[val]);
		  });
		  
		  $("#targetList li").click(function(){
		  var selText = $(this).text();
		  console.log(selText);
		  $('#targetLanguage').html(selText);
		  $('#editor_overlay').fadeOut(function() {
			$('.codemirror_block').removeClass("blur");
			clearAllEditors();
			editors[0].focus();
		});
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
	$('#editor_overlay').css({height: editor_height, width: editor_width});
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
	// $('#dismiss_overlay').click(function(){
		
	// });
	$('#lang_interchange').click(function() {
		var source = $('#sourceLanguage').html();
		var target = $('#targetLanguage').html();
		$('#sourceLanguage').html(target);
		$('#targetLanguage').html(source);
		set_editor_language(editors[0], target[0].toLowerCase()+target[1]);
		clearAllEditors();
	});
	$('.change_lang_btn').click();
})