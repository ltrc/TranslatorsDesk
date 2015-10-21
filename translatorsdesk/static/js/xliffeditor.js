
function init(){
  renderLayout();
}

window.sources = []

function renderLayout(){
  if(window.XLIFF){
    document.write(window.XLIFF);
    var source = window.XLIFF.src;
    var target = window.XLIFF.tgt;

    var XML = window.XLIFF.data;
    XML = $($.parseXML(XML));

    XML.find("trans-unit").each(function(idx, obj){
      var _s = $(obj).find("source g");
      var _t = $(obj).find("target g");

      console.log(_s);
    })
  }
}

$(document).ready(function(){
  init();
});