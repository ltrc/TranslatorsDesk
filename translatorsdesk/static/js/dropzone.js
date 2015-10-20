$(function(){
  
  $(document).ready(function(){
    
    document.querySelector("#total-progress").style.opacity = "0";
    //TO-DO : Add better error handling

    if($("#translators-desk-dropzone")){
          var supported_files = ".doc,.docx,.pptx,.csv";
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

              this.on("sending", function(file) {
                // Show the total progress bar when upload starts
                $("#total-progress").css("opacity" , "1");
                // And disable the start button
              });

              // Hide the total progress bar when nothing's uploading anymore
              this.on("queuecomplete", function(progress) {
                $("#total-progress").css("opacity", "0");
              });

              this.on("success", function(response){
                var _response = response.xhr.response;
                console.log(_response);

                alert("File Uploaded !!");
              });
            }
          };
      }

  })


});