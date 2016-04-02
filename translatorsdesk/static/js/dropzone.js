$(function(){
  
  $(document).ready(function(){
    
    document.querySelector("#total-progress").style.opacity = "0";
    //TO-DO : Add better error handling

    if($("#translators-desk-dropzone")){
          var supported_files = ".docx,.pptx,.csv,.txt";
          Dropzone.options.translatorsDeskDropzone = {
            dictDefaultMessage : "<b>Drag and Drop the files that you want to translate</b> <br/> Only <i>"+supported_files+"</i> are supported at the moment.",
            maxFilesize: 100, // MB
            maxFiles : 1,
            url : "/upload",
            acceptedFiles : supported_files,
            clickable: ".fileinput-button",
            init: function(){
              this.on("addedfile", function(file){
                //TODO : Fix the state change of this button
                $("#add-files").attr("disabled", "disabled");
                $("#raw_text").attr("disabled", "true");                
                console.log(file);
                var filename = file["name"].split('.');
                if (filename[filename.length-1].toLowerCase() == "inp") {
                  inPage2Unicode(file, {}, function(result) {
                    editors[0].setValue(result);
                    console.log(result);
                    $('#submit_raw').click();
                  });
                }
                // Add detection for inpage
              });

              this.on("error", function(){
                $("#add-files").attr("disabled", "false");                
              })
              // Update the total progress bar
              this.on("totaluploadprogress", function(progress) {
                // $("#total-progress .progress-bar").css("width" , progress + "%");
                make_progress(progress, 100);
                console.log("Progress: "+progress);
              });

              this.on("sending", function(file, xhr, data) {
                data.append("csrf_token", $("#csrf_token").val());
                data.append("src", $("#sourceLanguage").text());
                data.append("tgt", $("#targetLanguage").text());
                data.append("raw_text", $('#raw_text').text());
                // Show the total progress bar when upload starts
                // $("#total-progress").css("opacity" , "1");
                // And disable the start button
              });

              // Hide the total progress bar when nothing's uploading anymore
              this.on("queuecomplete", function(progress) {
                $("#total-progress").css("opacity", "0");
              });

              this.on("success", function(response){
                var i = 0;
                  window.setInterval(function() {
                    i += 1;
                    make_progress(i, 100);
                  }, 100);
                var _response = JSON.parse(response.xhr.response);
                //TO-DO : Add error handling here
                  console.log("/translate/"+_response.uuid+"/"+_response.filename ); 

                  socket.emit('translators_desk_check_file_state', {uid: _response.uuid, fileName: _response.filename});
                  socket.on('translators_desk_file_state_change', function(data) {
                    if (data.length>0 && data[0].startsWith('TRANSLATING_PO_FILE:::BEGIN')) {
                      make_progress(100,100);
                      document.location = "/translate/"+_response.uuid+"/"+_response.filename;
                    }
                    else {
                      socket.emit('translators_desk_check_file_state', {uid: _response.uuid, fileName: _response.filename});
                    }
                  });   
              });
            }
          };
      }

      $('#submit_raw').click(function() {
        console.log(editors[0].getValue());
        var toSend = editors[0].getValue();
        if ($.trim(toSend) == "") {
          return false;
        }
        var i = 0;
                  window.setInterval(function() {
                    i += 1;
                    make_progress(i, 100);
                  }, 100);
        $.ajax({
          url: "/upload",
          method: "POST",
          data: { csrf_token: $("#csrf_token").val(), raw_text: editors[0].getValue(), src: $("#sourceLanguage").text(), tgt: $("#targetLanguage").text()  },
          async: true, 
          success: function(_response) {
            console.log(_response);

                //TO-DO : Add error handling here
            // document.location = "/translate/"+_response.uuid+"/"+_response.filename 
            console.log("/translate/"+_response.uuid+"/"+_response.filename ); 
            socket.emit('translators_desk_check_file_state', {uid: _response.uuid, fileName: _response.filename});
            socket.on('translators_desk_file_state_change', function(data) {
              if (data.length>0 && data[0].startsWith('TRANSLATING_PO_FILE:::BEGIN')) {
                make_progress(100,100);
                document.location = "/translate/"+_response.uuid+"/"+_response.filename 
              }
              else {
                socket.emit('translators_desk_check_file_state', {uid: _response.uuid, fileName: _response.filename});
              }
            });
          }
        });
      });

      // $('#switch_mode').click(function() {
      //   $('.file-group').slideUp(function() {
      //   $('.raw-group').slideDown();
      //   });
      // });
  })
});