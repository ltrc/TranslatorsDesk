
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

$(document).keyup(function(key) {
	if (key.which == 38 && window.modal_current.prev()) {
		window.modal_current = window.modal_current.prev();
		render_modal();
	}
	else if (key.which == 40 && window.modal_current.next()) {
		window.modal_current = window.modal_current.next();
		render_modal();
	}
});

var confirmOnPageExit = function (e) 
{
    // If we haven't been passed the event get the window.event
    e = e || window.event;

    var message = 'You have unsaved changes. Are you sure you want to leave?';

    // For IE6-8 and Firefox prior to version 4
    if (e) 
    {
        e.returnValue = message;
    }

    // For Chrome, Safari, IE8+ and Opera 12+
    return message;
};



function OpenInNewTab(url) {
      var win = window.open(url, '_blank');
      win.focus();
}

function downloadURI(uri) 
{
    console.log("Attempting to download URI")
    //var link = document.createElement("a");
    //link.href = uri;
    //link.click();
    
    // OpenInNewTab(uri);
    window.location = uri;
}


$("#save_btn").click(function(){
var _D = {};
    _D["uid"] = window.uid;
    _D["fileName"] = window.fileName;
    // _D.data = data;
    window.CORRECTED_DATA = [];
    $('.target-text').each(function(index, valx) {
      var paraid = valx.id.split('_')[1];
      var sentid = valx.id.split('_')[2];
      if (window.corrected_data[paraid+"_"+sentid]) {
        var curr = [parseInt(paraid), parseInt(sentid), window.corrected_data[paraid+"_"+sentid]];  
        window.CORRECTED_DATA.push(curr);
      }
    });

    _D["data"] = JSON.stringify(window.CORRECTED_DATA);
    _D["csrf_token"] = $('#csrf_token').val();
ajaxCall("/save", _D, "POST", true, function(data) {
      }); 
window.onbeforeunload = null;

});


$("#download").click(function(){
  // alert("down");
window.onbeforeunload = null;

  window.downloaded = false;
  var data = []


  $("#po-container .panel-row").each(function(){
    var src = $(this).find(".source-text").text();
    var tgt = $(this).find(".target-text").text();

    data.push({"src":src, "tgt":tgt});
  }).promise().done(function(){


    window.CORRECTED_DATA = [];
    $('.target-text').each(function(index, valx) {
      var paraid = valx.id.split('_')[1];
      var sentid = valx.id.split('_')[2];
      if (window.corrected_data[paraid+"_"+sentid]) {
        var curr = [parseInt(paraid), parseInt(sentid), window.corrected_data[paraid+"_"+sentid]];  
        window.CORRECTED_DATA.push(curr);
      }
    });
    var _D = {};
    _D["uid"] = window.uid;
    _D["fileName"] = window.fileName;
    _D["data"] = JSON.stringify(window.CORRECTED_DATA);
    _D["csrf_token"] = $('#csrf_token').val();

      ajaxCall("/download", _D, "POST", true, function(data) {
        console.log(data);
      }); 

    function checkForLink(){ 
      $.get("/status/"+_D.uid+"/"+_D.fileName, function(data){
          console.log(data);
        if(data.fileReady){
          if(!window.downloaded){
          downloadURI(data.file);
          window.clearInterval(window.downloadCheck);
          window.downloaded = true;
          }
        }
      })
    }
    window.downloadCheck = setInterval( checkForLink, 1000);


  })


});

$('#preview').click(function() {
  if ($(this).html() == '<span class="glyphicon glyphicon-search"></span> Preview') {
    $(this).html('<span class="glyphicon glyphicon-search"></span> Revert');
    $('.source-text').slideUp();
    $('.panel-body').slideUp();  
  }
  else {
    $(this).html('<span class="glyphicon glyphicon-search"></span> Preview');
    $('.source-text').slideDown(); 
  }
});



