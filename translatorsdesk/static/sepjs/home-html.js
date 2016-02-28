
$(document).ready(function(){
	if(editors.length > 0){
		init_editors(false, "hi");
	}
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