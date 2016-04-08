/*
  vzpostavi streznik, streze staticne dat (html, ...)
*/

var http = require('http');
var fs  = require('fs');
var path = require('path');
var mime = require('mime');
var predpomnilnik = {};

function posredujNapako404(odgovor) {
  odgovor.writeHead(404, {'Content-Type': 'text/plain'});
  odgovor.write('Napaka 404: Vira ni mogoče najti.');
  odgovor.end();
}

function posredujDatoteko(odgovor, datotekaPot, datotekaVsebina) {
  odgovor.writeHead(200, {"content-type": mime.lookup(path.basename(datotekaPot))});
  odgovor.end(datotekaVsebina);
}

function posredujStaticnoVsebino(odgovor, predpomnilnik, absolutnaPotDoDatoteke) {
  if (predpomnilnik[absolutnaPotDoDatoteke]) {
    posredujDatoteko(odgovor, absolutnaPotDoDatoteke, predpomnilnik[absolutnaPotDoDatoteke]);
  } else {
    fs.exists(absolutnaPotDoDatoteke, function(datotekaObstaja) {
      if (datotekaObstaja) {
        fs.readFile(absolutnaPotDoDatoteke, function(napaka, datotekaVsebina) {
          if (napaka) {
            posredujNapako404(odgovor);
          } else {
            predpomnilnik[absolutnaPotDoDatoteke] = datotekaVsebina;
            posredujDatoteko(odgovor, absolutnaPotDoDatoteke, datotekaVsebina);
          }
        });
      } else {
        posredujNapako404(odgovor);
      }
    });
  }
}

var streznik = http.createServer(function(zahteva, odgovor) {
  var potDoDatoteke = false;
  predpomnilnik = {}; //Remove - this is developer hack!

  if (zahteva.url == '/') {
    potDoDatoteke = 'public/index.html';
  } else {
    potDoDatoteke = 'public' + zahteva.url;
  }

  var absolutnaPotDoDatoteke = './' + potDoDatoteke;
  posredujStaticnoVsebino(odgovor, predpomnilnik, absolutnaPotDoDatoteke);
});

// Za združljivost razvoja na lokalnem računalniku ali v Cloud9 okolju
if (!process.env.PORT) {
  process.env.PORT = 8080;
}

streznik.listen(process.env.PORT, function() {
  console.log("Strežnik posluša na portu " + process.env.PORT + ".");
});

var klepetalnicaStreznik = require('./lib/klepetalnica_streznik');
klepetalnicaStreznik.listen(streznik);
