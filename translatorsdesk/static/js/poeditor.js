$(document).ready(function(){
  if(window.PO_DATA){
    window.PO_DATA = JSON.parse(window.PO_DATA);
    console.log(window.PO_DATA);

    $(window.PO_DATA.data).each(function(idx, data){
      console.log(data)
      $("#po-container").append("<div class='row data-points'><div class='source col-md-6 text-center'>"+data.src+"</div><div class='col-md-6 text-center'><textarea style='width:100%' class='target expandableTextArea' spellcheck='false'>"+data.tgt+"</textarea></div></div>");
    }).promise().done(function(){
    var elements = document.getElementsByClassName('expandableTextArea');

    for(var i=0;i<elements.length; i++){
        elements[i].addEventListener('keyup', function() {
            this.style.overflow = 'hidden';
            this.style.height = 0;
            this.style.height = this.scrollHeight + 'px';
        }, false);      
    }
    })
  }
})

function downloadURI(uri) 
{
    var link = document.createElement("a");
    link.href = uri;
    link.click();
}

$("#preview").click(function(){
  
  var data = []
  $("#po-container .row.data-points").each(function(){
    var src = $(this).find(".source").html();
    var tgt = $(this).find(".target").val();
    data.push({"src":src, "tgt":tgt});
  }).promise().done(function(){
    //Data Collected !!
    //POST as JSON to the URI

    var _D = {};
    _D.uid = window.uid;
    _D.fileName = window.fileName;
    _D.data = data;

    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/preview",
      data: JSON.stringify(_D),
      complete: function (data) {
        // window.open(data.responseText);
        alert(data.responseText);
        downloadURI(data.responseText);
      },
      dataType: "json"
    });


  })


})