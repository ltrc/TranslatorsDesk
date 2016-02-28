function verifyFileStateChange(result) {
	if (window.translationStatus!='GENERATING_TRANSLATED_PO_FILE:::COMPLETE' && !window.translationStatus.startsWith('OUTPUT_FILE_GENERATED')) {
		fileStateChange(result);
	}
}

function fileStateChange(result) {
	
	// if (currentTranslationStatus!=result[0]) {
		currentTranslationStatus = result[0];
		$('#translation_status').text(currentTranslationStatus);
	// }

	if (result[0]!='GENERATING_TRANSLATED_PO_FILE:::COMPLETE' && !result[0].startsWith('OUTPUT_FILE_GENERATED')) {
	    if (result[0].startsWith('PIPELINE_ERROR')) {
		alert("Pipeline encountered an error. Please try again.");
		window.setTimeout(function() {
			window.location.href = "/";
		}, 1000);
	}
	else{
		socket.emit('translators_desk_check_file_state', {uid: window.uid, fileName: window.fileName});	
		}
	}
	else {
		window.location.reload();
	}
}

$(document).ready(function(){
	if(editors.length > 0){
		init_editors(false, "hi");
	}
	socket.emit("translators_desk_get_lang_pairs");
	socket.on("translators_desk_get_lang_pairs_response", getLangPairs);

	if (window.uid) {
	    socket.emit('translators_desk_check_file_state', {uid: window.uid, fileName: window.fileName});
	    socket.on('translators_desk_file_state_change', verifyFileStateChange);		
	}
});