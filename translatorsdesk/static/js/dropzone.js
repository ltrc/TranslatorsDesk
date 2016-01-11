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
              });

              this.on("error", function(){
                $("#add-files").attr("disabled", "false");                
              })
              // Update the total progress bar
              this.on("totaluploadprogress", function(progress) {
                $("#total-progress .progress-bar").css("width" , progress + "%");
              });

              this.on("sending", function(file, xhr, data) {
                data.append("src", $("#sourceLanguage").text());
                data.append("tgt", $("#targetLanguage").text());
                data.append("raw_text", $('#raw_text').text());
                // Show the total progress bar when upload starts
                $("#total-progress").css("opacity" , "1");
                // And disable the start button
              });

              // Hide the total progress bar when nothing's uploading anymore
              this.on("queuecomplete", function(progress) {
                $("#total-progress").css("opacity", "0");
              });

              this.on("success", function(response){
                var _response = JSON.parse(response.xhr.response);
                //TO-DO : Add error handling here
                  document.location = "/translate/"+_response.uuid+"/"+_response.filename 
                  console.log("/translate/"+_response.uuid+"/"+_response.filename ); 
              });
            }
          };
      }

      $('#submit_raw').click(function() {
        console.log(editors[0].getValue());
        console.log(editors[0].getValue());
        $.ajax({
          url: "/upload",
          method: "POST",
          data: { raw_text: editors[0].getValue(), src: $("#sourceLanguage").text(), tgt: $("#targetLanguage").text()  },
          async: true, 
          success: function(_response) {
            console.log(_response);
                //TO-DO : Add error handling here
            document.location = "/translate/"+_response.uuid+"/"+_response.filename 
            console.log("/translate/"+_response.uuid+"/"+_response.filename ); 
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