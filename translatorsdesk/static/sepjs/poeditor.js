function update_po_data(entries) {
  console.log(entries);

  entries = JSON.parse(entries);

  $.each(entries, function(ind, para){
    para = JSON.parse(para);
    paraid = para[0];
    idx = para[1];
    words = para[2];
    console.log(words);
    window.sentsDone += 1;
    var tgt_str_to_show = "";
    var src_str_to_show = "";
    $.each(words, function(index, val) {
      tgt_str_to_show += "<span id='"+val[1]+"_"+paraid+"_"+idx+"_"+index+"' class='tgt_word'>"+val[1]+"</span> ";

      src_str_to_show += "<span id='"+val[0]+"_"+paraid+"_"+idx+"_"+index+"' class='src_word'>"+val[0]+"</span> ";

      window.PO_DATA_WORDS1[val[0]+"_"+paraid+"_"+idx+"_"+index] = val[1]+"_"+paraid+"_"+idx+"_"+index;
      window.PO_DATA_WORDS2[val[1]+"_"+paraid+"_"+idx+"_"+index] = val[0]+"_"+paraid+"_"+idx+"_"+index;
    });
    // $('#src_'+paraid+'_'+idx).fadeOut(function() {
      $('#src_'+paraid+'_'+idx).html(src_str_to_show);
    // });
    // $('#src_'+paraid+'_'+idx).fadeIn();
    $('#tgt_'+paraid+'_'+idx).fadeOut(function() {
      $(this).html(tgt_str_to_show);
    });
    $('#tgt_'+paraid+'_'+idx).fadeIn();
  });
    // console.log(words);

  console.log("I got this.");
  make_progress(sentsDone, sentsToGet);
  if (sentsDone == sentsToGet) {
    make_progress(0,100);
  }
}
function process_po_data(entries) {
$.each(entries, function(paraid, paradata){
        $.each(paradata, function(idx, data) {
              
                var tgt_str_to_show = "";
                var src_str_to_show = "";
                console.log("HAHA");
                console.log(data);
                if (data.tgt != null) {
                  $.each(data.words, function(index, val) {
                    // tgt_str_to_show += "<span id='"+val[1]+"_"+paraid+"_"+idx+"_"+index+"' class='tgt_word'>"+val[1]+"</span> ";

                    // src_str_to_show += "<span id='"+val[0]+"_"+paraid+"_"+idx+"_"+index+"' class='src_word'>"+val[0]+"</span> ";
                    src_str_to_show = data.src;
                    tgt_str_to_show = data.tgt;
                    window.PO_DATA_WORDS1[val[0]+"_"+paraid+"_"+idx+"_"+index] = val[1]+"_"+paraid+"_"+idx+"_"+index;
                    window.PO_DATA_WORDS2[val[1]+"_"+paraid+"_"+idx+"_"+index] = val[0]+"_"+paraid+"_"+idx+"_"+index;
                  });
                }
                else {
                  window.sentsToGet += 1;
                  src_str_to_show = data.src;
                  tgt_str_to_show = data.src;
                }

                $("#po-container").append('<div class="panel-row"><div class="panel-title"><span class="source-text" id="src_'+paraid+'_'+idx+'">\
                  '+src_str_to_show+'</span><span class="target-text" id="tgt_'+paraid+'_'+idx+'">'+tgt_str_to_show+'</span></div></div>');
        });
    });
                  var tgtLang = window.tgt_lang; // For the editor language
                  console.log("Target Editor Language: " + tgtLang[0].toLowerCase()+tgtLang[1].toLowerCase());
                  // }
                  console.log("REACHED!!");
                  $('.panel-title').siblings().hide();
                  var activePanel;
                  $('.panel-title').click(function() {
                      event.stopPropagation();
                      $('#po-container').addClass("blur");
                      $('#sentence_overlay').fadeIn(200);
                      $('#sentence_overlay').animate({height: "50%"}, 300);
                      console.log($(this).find('.source-text').text());
                      setup_modal();
                    }); 
                  $('#sentence_overlay #close_btn').click(function() {
                    event.stopPropagation();
                    $('#po-container').removeClass("blur");
                    $('#sentence_overlay').animate({height: "0"}, 300);
                    $('#sentence_overlay').fadeOut(200);
                  });
                  $('#sentence_overlay').click(function() {
                    event.stopPropagation();
                  });
                  $(document).click(function() {
                      $('#po-container').removeClass("blur");
                      $('#sentence_overlay').animate({height: "0"}, 300);
                    $('#sentence_overlay').fadeOut(200);
                  });
                  $('.tgt_word').mouseover(function() {
                    var word = this.id;
                    var otherword = window.PO_DATA_WORDS2[word];
                    $(this).addClass("highlight");

                    $('.src_word').removeClass("highlight");
                    $('.source-text #'+otherword).addClass("highlight");
                  });

                  $('.tgt_word').mouseout(function() {
                    $(this).removeClass("highlight");
                    $('.src_word').removeClass("highlight");
                  });

                  $('.src_word').mouseover(function() {
                    var word = this.id;
                    var otherword = window.PO_DATA_WORDS1[word];
                    $(this).addClass("highlight");
                    $('.tgt_word').removeClass("highlight");
                    $('.target-text #'+otherword).addClass("highlight");
                  });

                  $('.src_word').mouseout(function() {
                    $(this).removeClass("highlight");
                    $('.tgt_word').removeClass("highlight");
                  });
  }


$(document).ready(function(){
  if(window.PO_DATA){
    console.log("HOOHAAH");
    console.log(window.PO_DATA)     // fix this 'tgt' key. 
    window.PO_DATA = JSON.parse(window.PO_DATA);
    console.log(window.PO_DATA);
    window.PO_DATA_WORDS1 = {}
    window.PO_DATA_WORDS2 = {}  // Source to target and vice versa
    window.sentsToGet = 0;
    window.sentsDone = 0;
    if (window.PO_DATA.data) {
      window.tgt_lang = PO_DATA.data.tgt_lang;
      process_po_data(window.PO_DATA.data.entries);
    }
    }
    else {
      console.log("SHOULDNT SEE THIS");
   
    }
    // update_po_data(window.PO_DATA.data.entries);
})

function setup_modal() {
var CODEMIRROR_EDITOR_ID = 0;    
var tgtLang = window.tgt_lang;
  init_editors(false, tgtLang[0].toLowerCase()+tgtLang[1].toLowerCase());
  // editors[0].setSize($(window).width()*0.60,$(window).height()*0.65);
  var offset = $('.codemirror_block').offset();
  var editor_top = offset.top;
  var editor_left = offset.left;
  $('.codemirror_block').width("100%");
  var editor_width = $('.codemirror_block').width();
  $('#word_suggestions').css({width: editor_width});
  $('#word_suggestions').css({top: editor_top-$('#word_suggestions').height()-1, left: editor_left});
  $('#word_suggestions').show();

  var i = 0;
  // $.each(entries, function(index, val) {
  //   $.each(val, function(indx, sentval) {
  //     console.log(sentval.tgt);
  //     if (sentval.tgt!=null) {
  //       editors[i].setValue(sentval.tgt);                          
  //     }
  //     i = i+1;
  //   });
  // });
}

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
    var tgt = $(this).find(".target-text").text();
    // var tgt = editors[parseInt($(this).find(".codemirror_block").attr("td-editor-id")) - 1].getValue();
    console.log("SEE THIS: ");
    console.log({"src":src, "tgt":tgt});
    data.push({"src":src, "tgt":tgt});
  }).promise().done(function(){
    //Data Collected !!
    //POST as JSON to the URI

    // TEMPORARY FIX !!!!!!!!!!!!!

    //window.PO_DATA["data"] = data;


    // FIX ENDS. 

    var _D = {};
    _D.uid = window.uid;
    _D.fileName = window.fileName;
    // _D.data = data;
    _D.data = window.PO_DATA["data"];
    // for (var i=0; i<)

    console.log(data);
    // $.ajax({
    //   type: "POST",
    //   contentType: "application/json; charset=utf-8",
    //   url: "/preview",
    //   data: JSON.stringify(_D),
    //   complete: function (data) {
    //     // window.open(data.responseText);
    //    downloadURI(data.responseText);
    //   },
    //   dataType: "json"
    // });

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
  if ($(this).text() == "Preview") {
    $(this).text("Revert");
    $('.source-text').slideUp();
    $('.panel-body').slideUp();  
  }
  else {
    $(this).text("Preview");
    $('.source-text').slideDown();
    // $('.panel-body').slideUp();  
  }
});


