var Board = require('./board');
var logule = require('logule');

//var toarduinoqueue = seqqueue.createQueue(1000);
//var fromarduinoqueue = seqqueue.createQueue(1000);
var toarduinoqueue = [];
var fromarduinoqueue = [];


/*new Board({
  debug: true,
  portUSB: "/dev/ttyUSB0",
  baudrate: 115200,
  toarduino: toarduinoqueue,
  fromarduino: fromarduinoqueue
});*/

var Ahapacket = require('./ahaprotocol/ahapacket');

var f1 = function() {
var test1 = new Ahapacket();
logule.info("test 1 ...");
test1.createCanMessage(1, 0, 2, 15, 0, 12, 0);
logule.info("test 2 ...");
test1.toString();
logule.info("test 3 ...");
var test2 = new Ahapacket();
logule.info("test 4 ...");
test2.extractCanMessage(268566540);
logule.info("test 5 ...");
test2.toString();
};

f1();

logule.line("Starting...");