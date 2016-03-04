// function verifyFileStateChange(result) {
// 	console.log(result);
// 	if (window.translationStatus!='GENERATING_TRANSLATED_PO_FILE:::COMPLETE' && !window.translationStatus.startsWith('OUTPUT_FILE_GENERATED')) {
// 		fileStateChange(result);

// 	}
// }

// function fileStateChange(result) {
	
// 	// if (currentTranslationStatus!=result[0]) {
// 		currentTranslationStatus = result[0];
// 		$('#translation_status').text(currentTranslationStatus);
// 	// }
// 	console.log(currentTranslationStatus);
// 	if (!result[0].startsWith('GENERATING_TRANSLATED_PO_FILE:::COMPLETE') && !result[0].startsWith('OUTPUT_FILE_GENERATED')) {
// 		console.log("THIS", result[0])
// 	    if (result[0].startsWith('PIPELINE_ERROR')) {
// 		alert("Pipeline encountered an error. Please try again.");
// 		window.setTimeout(function() {
// 			window.location.href = "/";
// 		}, 1000);
// 	}
// 	else{
// 		socket.emit('translators_desk_check_file_state', {uid: window.uid, fileName: window.fileName});	
// 		}
// 	}
// 	else {
// 		console.log("RELOAD");
// 		window.location.reload();
// 	}
// }

$(document).ready(function(){
	    	count = 0;

		console.log('Found yo.');
	    socket.emit('translators_desk_check_file_state', {uid: window.uid, fileName: window.fileName});
	    socket.emit('translators_desk_get_translation_data', {uid: window.uid, fileName: window.fileName});

	    socket.on('translators_desk_file_state_change', function(result) {
	    	console.log(result);
	    	if (!result[0].startsWith('GENERATING_TRANSLATED_PO_FILE:::COMPLETE') && !result[0].startsWith('OUTPUT_FILE_GENERATED')) {
				// console.log("Checking socket yo");
			    socket.emit('translators_desk_check_file_state', {uid: window.uid, fileName: window.fileName});
				if (result[0].startsWith('TRANSLATING_PO_FILE') && !window.PO_DATA) {
		    		window.location.reload();
		    	}
		    	if (result[0].startsWith('PIPELINE_ERROR')) {
		    		count += 1;
		    		// console.log(count);
		    		if (count > 1000) {
			    		document.location = "/users/account/";
		    		}
		    	}
		    	else {
				    socket.emit('translators_desk_get_translation_data', {uid: window.uid, fileName: window.fileName});
		    	}
	    	}
			
	    });		
	    socket.on('translators_desk_get_translation_data_response', update_po_data);		

});