var Board = require('./board');

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
console.log("test 1 ...");
test1.createCanMessage(1, 0, 2, 15, 0, 12, 0);
console.log("test 2 ...");
test1.toString();
console.log("test 3 ...");
var test2 = new Ahapacket();
console.log("test 4 ...");
test2.extractCanMessage(268566540);
console.log("test 5 ...");
test2.toString();
};

f1();

console.log("Starting...");