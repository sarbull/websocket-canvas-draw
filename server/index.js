(function () {
  const fs = require('fs');
  const bodyParser = require('body-parser');
  const express = require('express');
  const socketio = require('socket.io');
  const PORT = process.env.PORT || 3000;
  const app = express();

  let globalSocket = null;
  let imageBmp = '';

  app.use(bodyParser.json());

  app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.use(express.static('ui'));

  const server = require('http').createServer(app);

  app.post('/update', (req, res) => {
    let newImage = req.body.newImage;

    imageBmp = newImage;

    res.send('updated');
  });

  app.get('/image.png', (req, res) => {
    let base64String = imageBmp; // Not a real image

    // Remove header
    let base64Image = base64String.split(';base64,').pop();

    fs.writeFile('./server/image.png', base64Image, {encoding: 'base64'}, function(err, data) {

      fs.readFile('./server/image.png', function(err, data) {
        if (err) throw err; // Fail if the file can't be read.

        res.writeHead(200, {'Content-Type': 'image/png'});
        res.end(data); // Send the file data to the browser.
      });
    });
  });

  const io = socketio.listen(server);
  let connectedClients = {}; //used to keep a working list of the connections

  io.sockets.on('connection', function (socket) {
    globalSocket = socket;

    //added clients
    socket.on("setClientId", function (data) {
      connectedClients[data.id] = {
        id: data.id, //adds key to a map
        senderName: data.senderName
      }
      console.log(connectedClients);
    });

    //removes clients
    socket.on("deleteSharedById", function (data) {
      delete connectedClients[data.id]; //removes key from map
      socket.broadcast.emit("deleteShared", { id: data.id }); //send to sender
    });

    //erases canvas
    socket.on("eraseRequestById", function (data) {
      socket.broadcast.emit("eraseShared", { id: data.id });
    });

    //returns back a list of clients to the requester
    socket.on("getUserList", function (data) {
      socket.emit("setUserList", connectedClients); //send to sender
    });

    //request to share
    socket.on("requestShare", function (data) {
      socket.broadcast.emit("createNewClient", {
        listenerId: data.listenerId,
        senderId: data.senderId,
        senderName: data.senderName
      });
    });

    //confirm did share
    socket.on("confirmShare", function (data) {
      socket.broadcast.emit("setConfirmShare", {
        isSharing: data.isSharing,
        senderId: data.senderId,
        listenerId: data.listenerId,
        senderName: data.senderName
      });
    });

    //drawing data
    socket.on('drawRequest', function (data) {
      socket.broadcast.emit('draw', {
        x: data.x,
        y: data.y,
        type: data.type,
        isTouchDevice: data.isTouchDevice,
        color: data.color,
        stroke: data.stroke,
        isLineDrawing: data.isLineDrawing,
        isErase: data.isErase,
        id: data.id
      });
    });
  });

  app.get('/send', (req, res) => {
    globalSocket.emit("message", { message: req.query.message });

    res.send('OK');
  });

  server.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))
}).call(this);
