$(document).ready(function(){
  if(window.PO_DATA){
    console.log(window.PO_DATA)     // fix this 'tgt' key. 
    window.PO_DATA = JSON.parse(window.PO_DATA);
    console.log(window.PO_DATA);
    window.PO_DATA_WORDS1 = {}
    window.PO_DATA_WORDS2 = {}  // Source to target and vice versa
    window.tgt_lang = PO_DATA.data.tgt_lang;

    $(window.PO_DATA.data.entries).each(function(paraid, paradata){
        $(paradata).each(function(idx, data) {
              console.log("Helo");


              var CODEMIRROR_EDITOR_ID = idx+1;    
              var codemirror_menu = '<nav id="codemirror_menu_'+CODEMIRROR_EDITOR_ID+'" td-editor-id='+CODEMIRROR_EDITOR_ID+' class="navbar navbar-default codemirror_menu">\
                                      <div class="container-fluid"><div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">\
                                        <ul class="nav navbar-nav">\
                                          <li><a href="#"><i class="fa fa-undo td-menu-item td-menu-item-undo"></i></a></li>\
                                          <li><a href="#"><i class="fa fa-rotate-right td-menu-item td-menu-item-redo"></i></a></li>\
                                        </ul>\
                                        <ul class="nav navbar-nav navbar-right">\
                                          <div class="navbar-form form-inline" >\
                                          </div>\
                                        </ul>\
                                        </div><!-- /.navbar-collapse -->\
                                      </div><!-- /.container-fluid -->\
                                    </nav>';

              var codemirror_editor = '<div id="codemirror_block_'+CODEMIRROR_EDITOR_ID+'" td-editor-id='+CODEMIRROR_EDITOR_ID+' class="codemirror_block"></div>';
                console.log(data)

                var tgt_str_to_show = "";
                var src_str_to_show = "";
                $.each(data.words, function(index, val) {
                  tgt_str_to_show += "<span id='"+val[1]+"_"+paraid+"_"+idx+"_"+index+"' class='tgt_word'>"+val[1]+"</span> ";
                });

                $.each(data.words, function(index, val) {
                  src_str_to_show += "<span id='"+val[0]+"_"+paraid+"_"+idx+"_"+index+"' class='src_word'>"+val[0]+"</span> ";
                });

                $.each(data.words, function(index, val) {
                  window.PO_DATA_WORDS1[val[0]+"_"+paraid+"_"+idx+"_"+index] = val[1]+"_"+paraid+"_"+idx+"_"+index;
                  window.PO_DATA_WORDS2[val[1]+"_"+paraid+"_"+idx+"_"+index] = val[0]+"_"+paraid+"_"+idx+"_"+index;
                });

                $("#po-container").append('<div class="panel-row"><div class="panel-title"><span class="source-text">\
                  '+src_str_to_show+'</span><span class="target-text">'+tgt_str_to_show+'</span></div><div class="panel-body col-md-12">'+codemirror_menu+codemirror_editor+'</div>\
                  </div>');

        });
          
      // $("#po-container").append("<div class='row data-points'><div class='source col-md-6 text-center'>"+data.src+"</div><div class='col-md-6 text-center'><textarea style='width:100%' class='target expandableTextArea' spellcheck='false'>"+data.tgt+"</textarea></div></div>");
    }).promise().done(function(){
                  var tgtLang = window.tgt_lang; // For the editor language
                  console.log("Target Editor Language: " + tgtLang[0].toLowerCase()+tgtLang[1].toLowerCase());
                  init_editors(true, tgtLang[0].toLowerCase()+tgtLang[1].toLowerCase());
                  // for(var i=0; i<editors.length; i++) {
                    var i = 0;
                    $(window.PO_DATA.data.entries).each(function(index, val) {
                      $(val).each(function(indx, sentval) {
                        editors[i].setValue(sentval.tgt);
                        i = i+1;
                      });
                    });
                  // }

                  $('.panel-title').siblings().hide();
                  var activePanel;
                  $('.panel-title').click(function() {
                      // console.log($(this).siblings());
                      // $('.panel-body').slideUp();
                      $('.target-text').slideDown();
                      // $(this).find('.target-text').slideUp();
                      $(this).siblings().slideToggle();
                      // activePanel = $(this);
                    }); 

                  $('.tgt_word').mouseover(function() {
                    // console.log(this.innerHTML);
                    var word = this.id;
                    var otherword = window.PO_DATA_WORDS2[word];
                    // console.log(word);
                    // console.log(otherword);
                    // console.log(otherword);
                    $(this).addClass("highlight");

                    $('.src_word').removeClass("highlight");
                    $('.source-text #'+otherword).addClass("highlight");
                  });

                  $('.tgt_word').mouseout(function() {
                    $(this).removeClass("highlight");
                    $('.src_word').removeClass("highlight");
                  });

                  $('.src_word').mouseover(function() {
                    // console.log(this.innerHTML);
                    var word = this.id;
                    var otherword = window.PO_DATA_WORDS1[word];
                    // console.log(word);
                    // console.log(otherword);
                    // console.log(otherword);
                    $(this).addClass("highlight");
                    $('.tgt_word').removeClass("highlight");
                    $('.target-text #'+otherword).addClass("highlight");
                  });

                  $('.src_word').mouseout(function() {
                    $(this).removeClass("highlight");
                    $('.tgt_word').removeClass("highlight");
                  });


                  // Not needed anymore: 
                // var elements = document.getElementsByClassName('expandableTextArea');

                // for(var i=0;i<elements.length; i++){
                //     elements[i].addEventListener('keyup', function() {
                //         this.style.overflow = 'hidden';
                //         this.style.height = 0;
                //         this.style.height = this.scrollHeight + 'px';
                //     }, false);      
                // }
    })
  }
})

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

$("#download").click(function(){
  // alert("down");
  window.downloaded = false;
  var data = []

  // editors[parseInt($("#po-container .panel-row .codemirror_block").attr("td-editor-id")) - 1]
  $("#po-container .panel-row").each(function(){
    var src = $(this).find(".source-text").text();
    var tgt = editors[parseInt($(this).find(".codemirror_block").attr("td-editor-id")) - 1].getValue();
    console.log("SEE THIS: ");
    console.log({"src":src, "tgt":tgt});
    data.push({"src":src, "tgt":tgt});
  }).promise().done(function(){
    //Data Collected !!
    //POST as JSON to the URI

    // TEMPORARY FIX !!!!!!!!!!!!!

    window.PO_DATA["data"] = data;


    // FIX ENDS. 

    var _D = {};
    _D.uid = window.uid;
    _D.fileName = window.fileName;
    // _D.data = data;
    _D.data = window.PO_DATA["data"];
    // for (var i=0; i<)

    console.log(data);
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/preview",
      data: JSON.stringify(_D),
      complete: function (data) {
        // window.open(data.responseText);
       downloadURI(data.responseText);
      },
      dataType: "json"
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
  $(this).fadeOut();
  $('.source-text').slideUp();
  $('.panel-body').slideUp();
});


