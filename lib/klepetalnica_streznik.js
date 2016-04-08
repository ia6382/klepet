/*
  odgovorja na zahteve
*/

var socketio = require('socket.io');
var io;
var stevilkaGosta = 1;
var vzdevkiGledeNaSocket = {};
var uporabljeniVzdevki = [];
var trenutniKanal = {};

exports.listen = function(streznik) {
  io = socketio.listen(streznik);
  io.set('log level', 1);
  io.sockets.on('connection', function (socket) {
    stevilkaGosta = dodeliVzdevekGostu(socket, stevilkaGosta, vzdevkiGledeNaSocket, uporabljeniVzdevki);
    pridruzitevKanalu(socket, 'Skedenj');
    obdelajPosredovanjeSporocila(socket, vzdevkiGledeNaSocket);
    obdelajDregljaj(socket, vzdevkiGledeNaSocket);
    obdelajZahtevoZaSprememboVzdevka(socket, vzdevkiGledeNaSocket, uporabljeniVzdevki);
    obdelajPridruzitevKanalu(socket);
    socket.on('kanali', function() {
      socket.emit('kanali', io.sockets.manager.rooms);
    });
    socket.on('uporabniki', function(kanal) {
      var uporabnikiNaKanalu = io.sockets.clients(kanal.kanal);
      var uporabniki = [];
      for (var i=0; i < uporabnikiNaKanalu.length; i++) {
        uporabniki[i] = vzdevkiGledeNaSocket[uporabnikiNaKanalu[i].id];
      }
      socket.to(kanal.kanal).emit('uporabniki', uporabniki);
    });
    obdelajOdjavoUporabnika(socket, vzdevkiGledeNaSocket, uporabljeniVzdevki);
  });
};

function dodeliVzdevekGostu(socket, stGosta, vzdevki, uporabljeniVzdevki) {
  var vzdevek = 'Gost' + stGosta;
  vzdevki[socket.id] = vzdevek;
  socket.emit('vzdevekSpremembaOdgovor', {
    uspesno: true,
    vzdevek: vzdevek
  });
  uporabljeniVzdevki.push(vzdevek);
  return stGosta + 1;
}

function pridruzitevKanalu(socket, kanal) {
  socket.join(kanal);
  trenutniKanal[socket.id] = kanal;
  socket.emit('pridruzitevOdgovor', {kanal: kanal});
  socket.broadcast.to(kanal).emit('sporocilo', {
    besedilo: vzdevkiGledeNaSocket[socket.id] + ' se je pridružil kanalu ' + kanal + '.'
  });

  var uporabnikiNaKanalu = io.sockets.clients(kanal);
  if (uporabnikiNaKanalu.length > 1) {
    var uporabnikiNaKanaluPovzetek = 'Trenutni uporabniki na kanalu ' + kanal + ': ';
    for (var i in uporabnikiNaKanalu) {
      var uporabnikSocketId = uporabnikiNaKanalu[i].id;
      if (uporabnikSocketId != socket.id) {
        if (i > 0) {
          uporabnikiNaKanaluPovzetek += ', ';
        }
        uporabnikiNaKanaluPovzetek += vzdevkiGledeNaSocket[uporabnikSocketId];
      }
    }
    uporabnikiNaKanaluPovzetek += '.';
    socket.emit('sporocilo', {besedilo: uporabnikiNaKanaluPovzetek});
  }
}

function obdelajZahtevoZaSprememboVzdevka(socket, vzdevkiGledeNaSocket, uporabljeniVzdevki) {
  socket.on('vzdevekSpremembaZahteva', function(vzdevek) {
    if (vzdevek.indexOf('Gost') == 0) {
      socket.emit('vzdevekSpremembaOdgovor', {
        uspesno: false,
        sporocilo: 'Vzdevki se ne morejo začeti z "Gost".'
      });
    } else {
      if (uporabljeniVzdevki.indexOf(vzdevek) == -1) {
        var prejsnjiVzdevek = vzdevkiGledeNaSocket[socket.id];
        var prejsnjiVzdevekIndeks = uporabljeniVzdevki.indexOf(prejsnjiVzdevek);
        uporabljeniVzdevki.push(vzdevek);
        vzdevkiGledeNaSocket[socket.id] = vzdevek;
        delete uporabljeniVzdevki[prejsnjiVzdevekIndeks];
        socket.emit('vzdevekSpremembaOdgovor', {
          uspesno: true,
          vzdevek: vzdevek
        });
        socket.broadcast.to(trenutniKanal[socket.id]).emit('sporocilo', {
          besedilo: prejsnjiVzdevek + ' se je preimenoval v ' + vzdevek + '.'
        });
      } else {
        socket.emit('vzdevekSpremembaOdgovor', {
          uspesno: false,
          sporocilo: 'Vzdevek je že v uporabi.'
        });
      }
    }
  });
}

function obdelajPosredovanjeSporocila(socket) {
  socket.on('sporocilo', function (sporocilo) {
    if (sporocilo.kanal) {
      socket.broadcast.to(sporocilo.kanal).emit('sporocilo', {
        besedilo: vzdevkiGledeNaSocket[socket.id] + ': ' + sporocilo.besedilo
      });
    } else if (sporocilo.vzdevek) {
      var socketIdNaslovnika = null;
      for (var id in vzdevkiGledeNaSocket) {
       if (sporocilo.vzdevek == vzdevkiGledeNaSocket[id]) {
         socketIdNaslovnika = id;
         break;
       }
      }
      if (socketIdNaslovnika) {
       if (socketIdNaslovnika == socket.id) {
         io.sockets.sockets[socket.id].emit('sporocilo', {
           besedilo: "Sporočila '" + sporocilo.besedilo + "' uporabniku z vzdevkom '" + sporocilo.vzdevek + "' ni bilo mogoče posredovati."
         });
       } else {
         io.sockets.sockets[socketIdNaslovnika].emit('sporocilo', {
           besedilo: vzdevkiGledeNaSocket[socket.id] + ' (zasebno): ' + sporocilo.besedilo
         });
       }
      } else {
       io.sockets.sockets[socket.id].emit('sporocilo', {
         besedilo: "Sporočila '" + sporocilo.besedilo + "' uporabniku z vzdevkom '" + sporocilo.vzdevek + "' ni bilo mogoče posredovati."
       });
      }
    }
  });
}

function obdelajDregljaj(socket) {
  socket.on('dregljaj', function (dregljaj) {
    if (dregljaj.vzdevek) {
      var socketIdNaslovnika = null;
      for (var id in vzdevkiGledeNaSocket) {
       if (dregljaj.vzdevek == vzdevkiGledeNaSocket[id]) {
         socketIdNaslovnika = id;
         break;
       }
      }
      if (socketIdNaslovnika) {
       io.sockets.sockets[socketIdNaslovnika].emit('dregljaj', { dregljaj: true });
      } else {
       io.sockets.sockets[socket.id].emit('sporocilo', {
         besedilo: "Dregljaja uporabniku z vzdevkom '" + dregljaj.vzdevek + "' ni bilo mogoče posredovati."
       });
      }
    }
  });
}

function obdelajPridruzitevKanalu(socket) {
  socket.on('pridruzitevZahteva', function(kanal) {
    socket.leave(trenutniKanal[socket.id]);
    pridruzitevKanalu(socket, kanal.novKanal);
  });
}

function obdelajOdjavoUporabnika(socket) {
  socket.on('odjava', function() {
    var vzdevekIndeks = uporabljeniVzdevki.indexOf(vzdevkiGledeNaSocket[socket.id]);
    delete uporabljeniVzdevki[vzdevekIndeks];
    delete vzdevkiGledeNaSocket[socket.id];
  });
}
