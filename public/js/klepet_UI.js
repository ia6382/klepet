/*
  funkcionalnost odjemalca (obdeluje odgovore, dela izgled, tudi posilja preko klepet.js, sodeluje)
*/


function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } 
  else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementSlika(sporocilo) {
  return sporocilo;
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function divElementVideo(sporocilo) {
  return sporocilo;
}

function izlusciHtmlYT(sporocilo){
  var sepReg = /(https|http)/;
  var tabelaTmp = sporocilo.split(sepReg);
  var tabela = [];
  var j = 0;
  if(tabelaTmp != undefined){
    for(var i = 0;i < tabelaTmp.length; i++){
      if((tabelaTmp[i] == "http") || (tabelaTmp[i] == "https")){
        tabela[j] = tabelaTmp[i].concat(tabelaTmp[i+1]);
        j ++;
      }
    }
  }
  
  var yt;
  var reg = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
  for(var i = 0;i < tabela.length; i++){
    sporocilo = tabela[i];
    yt = sporocilo.match(reg);
    
    if(yt != null){
      var id = yt[1];
      yt = yt[0].replace(reg, function(url) {
          return "<iframe src=\"https://www.youtube.com/embed/"+id+"\" style=\"width:200px; height:150px; padding-left: 20px; border: 0;\" allowfullscreen></iframe>";
      });
    }
    
    if(yt != null){
       $('#sporocila').append(divElementVideo(yt));
    }
  }
}
  
function izlusciHtmlImg(sporocilo){
  var sepReg = /(https|http)/;
  var tabelaTmp = sporocilo.split(sepReg);
  var tabela = [];
  var j = 0;
  if(tabelaTmp != undefined){
    for(var i = 0;i < tabelaTmp.length; i++){
      if((tabelaTmp[i] == "http") || (tabelaTmp[i] == "https")){
        tabela[j] = tabelaTmp[i].concat(tabelaTmp[i+1]);
        j ++;
      }
    }
  }
  
  var img;
  var reg = /(https|http)?:\/\/.*\.(?:png|jpg|gif)/;
  for(var i = 0;i < tabela.length; i++){
    sporocilo = tabela[i];
    img = sporocilo.match(reg);
    
    if(img != null){
      var jeSmesko = img[0].indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
      img = img[0].replace(reg, function(url) {
          return "<img src=\"" + url + "\" style=\"width:200px; padding-left: 20px;\">";
      });
    }
    
    if (jeSmesko) {
      img = null;
    }
    else{
      if(img != null){
       $('#sporocila').append(divElementSlika(img));
      }
    }
    
  }
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
      var HtmlYT = izlusciHtmlYT(sporocilo);
      var htmlImg = izlusciHtmlImg(sporocilo);
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    var HtmlYT = izlusciHtmlYT(sporocilo);
    var htmlImg = izlusciHtmlImg(sporocilo);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    var HtmlYT = izlusciHtmlYT(sporocilo.besedilo);
    var htmlImg = izlusciHtmlImg(sporocilo.besedilo);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val("/zasebno \"" + $(this).text() + "\" ");
      $('#poslji-sporocilo').focus();
    });
  
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

//zadnja verzija

