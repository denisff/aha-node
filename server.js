var Board = require('./board');
var logule = require('logule');

var sentqueue = [];
var receivedqueue = [];


var board = new Board({
  debug: true,
  portUSB: "/dev/ttyUSB0",
  baudrate: 115200,
  sentqueue: sentqueue,
  receivedqueue: receivedqueue
});

board.listen();

logule.line("Starting...");