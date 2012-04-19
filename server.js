var Board = require('./board');
var logule = require('logule');

var sentqueue = [];
var receivedqueue = [];


new Board({
    debug: true,
    portUSB: "/dev/ttyUSB0",
    baudrate: 115200,
    sentqueue: sentqueue,
    receivedqueue: receivedqueue
});

var Ahapacket = require('./ahaprotocol/ahapacket');

var f1 = function() {
        var test1 = new Ahapacket();

        test1.createCanMessage(1, 0, 2, 15, 0, 12, 0);
        logule.debug(test1.toString());
        sentqueue.push(test1);
        sentqueue.push(test1);
    };

setTimeout(
f1, 5000);

logule.info("Starting...");