var logule = require('logule'),
    serial = require('serialport'),
    Crc16 = require('./ahaprotocol/crc16'),
    Ahapacket = require('./ahaprotocol/ahapacket'),
    Buffer = require('buffer').Buffer;
/*
 * The main Arduino constructor
 * Connect to the serial port and bind
 * {
   debug: true,
   portUSB: "/dev/ttyUSB0,
   baudrate: 115200,
   sentqueue: sentqueue,
   receivedqueue: receivedqueue
   }
 */

// Constructor
var Class = function(options) {
        this.debug = options && options.debug || false;
        this.portUSB = options && options.portUSB || "/dev/ttyUSB0";
        this.baudrate = options && options.baudrate || 115200;
        this.sentqueue = options && options.sentqueue;
        this.receivedqueue = options && options.receivedqueue;
        logule.info('initializing');
        logule.debug('debug:' + this.debug);
        logule.debug('portUSB:' + this.portUSB);
        logule.debug('baudrate:' + this.baudrate);
        this.serialPort = new serial.SerialPort(this.portUSB, {
            baudrate: this.baudrate
        });

        logule.debug('SerialPort ouvert:');

        var self = this;
        self.serialPort.on("data", function(data) {
            // loop on data received
            var datalen = data.length;

            for (var i = 0; i < datalen; i++) {
                var bIn = data.readUInt8(i);
                self.processData(bIn);
            }
        });

        self.serialPort.on("close", function() {
            logule.info('SerialPort ferme.');
        });

        self.listen();
    };

// properties and methods
Class.prototype = {
    incrc: new Crc16(),
    outcrc: new Crc16(),
    lastControlByte: 0x11,
    //S_FRAME_RR,
    linkup: false,
    bufferFrame: [],
    inPacket: false,
    unEscaping: false,
    maxPacketSize: 32,
    FRAME_BOUNDARY: 0x7E,
    //126
    ESCAPE_OCTET: 0x7D,
    //125
    ESCAPEXOR_FLAG: 0x20,
    //32
    I_FRAME_BITS: 0x1,
    //1
    S_FRAME_BITS: 0x3,
    //3
    S_FRAME_RR: 0x11,
    //17
    S_FRAME_RNR: 0x15,
    //21
    S_FRAME_REJ: 0x19,
    //25
    U_FRAME_UA: 0x73,
    //115
    U_FRAME_SABM: 0x3F,
    //63
    U_FRAME_DISC: 0x53,
    //83
    U_FRAME_DM: 0x1F,
    //31
    U_FRAME_TEST: 0x33,
    //51
    I_FRAME_DATA: 0x0 //0
};


Class.prototype.listen = function() {
    var self = this;
    setInterval(

    function() {
        if (self.sentqueue.length > 0 && !self.linkup) {
            // send message
            logule.info("SEND U_FRAME_SABM (listen)");
            self.linkup = true;
            self.sendFrame(self.U_FRAME_SABM);
        }
    }, 1000);
};

Class.prototype.processData = function(char) {
    if (char === this.ESCAPE_OCTET) {
        this.unEscaping = true;
        return;
    }

    if (char === this.FRAME_BOUNDARY && !this.unEscaping) {
        if (this.inPacket) {
            // End of packet
            if (this.bufferFrame.length > 0) {
                this.inPacket = false;
                this.processFrame(this.bufferFrame);
            }
        }
        else {
            // Beginning of packet 
            this.bufferFrame = [];
            this.inPacket = true;
        }
    }
    else {
        if (this.unEscaping) {
            char ^= this.ESCAPEXOR_FLAG;
            this.unEscaping = false;
        }

        if (this.bufferFrame.length < this.maxPacketSize) {
            this.bufferFrame.push(char);
        }
        else {
            logule.warn('PROCESSDATA Message too big');
        }
    }

};

Class.prototype.processFrame = function(frame) {
    var framelen = frame.length;
    var messCRC;
    if (framelen < 3) {
        // less than 3 bytes so wrong message
        logule.warn('less than 3 bytes so wrong message');
        return;
    }

    // crc 2 last bytes
    this.incrc.reset();
    for (var icrc = 0; icrc < framelen - 2; icrc++) {
        this.incrc.update(frame[icrc]);
    }
    //message's crc
    messCRC = frame[framelen - 2] & 0xff;
    messCRC += (frame[framelen - 1] & 0xff) << 8;
    if (messCRC != this.incrc.get()) {
        // CRC error
        logule.warn('CRC Error');
        return;
    }

    if ((frame[0] & this.I_FRAME_BITS) === 0x0) {
        this.handleInformationFrame(frame, framelen);
    }
    else if ((frame[0] & this.S_FRAME_BITS) === 0x1) {
        this.handleSupervisoryFrame(frame);
    }
    else {
        this.handleUnnumberedFrame(frame);
    }
};

Class.prototype.handleInformationFrame = function(frame, framelen) {
    if (framelen - 3 > 0) {
        // create CAN message
        var canMessage = new Ahapacket();
        canMessage.loadCanMessage(frame.slice(1, framelen - 2));
        logule.info('GOT I_FRAME (handleInformationFrame)');
        this.receivedqueue.push(canMessage);
        logule.info('SEND S_FRAME_RR (handleInformationFrame)');
        this.sendFrame(this.S_FRAME_RR);
    }
};

Class.prototype.handleUnnumberedFrame = function(frame) {
    switch (frame[0]) {
    case this.U_FRAME_SABM:
        logule.info('GOT U_FRAME_SABM (handleUnnumberedFrame)');
        if (!this.linkUp) {
            this.linkup = true;
            logule.info('SEND U_FRAME_UA (handleUnnumberedFrame)');
            this.sendFrame(this.U_FRAME_UA);
        }
        else {
            logule.info("SEND U_FRAME_DM (handleUnnumberedFrame)");
            this.sendFrame(this.U_FRAME_DM);
        }
        break;
    case this.U_FRAME_DM:
        logule.info('GOT U_FRAME_DM (handleUnnumberedFrame)');
        this.linkup = false;
        break;
    case this.U_FRAME_UA:
        logule.info('GOT U_FRAME_UA (handleUnnumberedFrame)');
        if (this.lastControlByte === this.U_FRAME_SABM) {
            if (!this.linkup) return;
            if (this.sentqueue.length > 0) {
                var canmessage = this.sentqueue[0];
                logule.info('SEND I_FRAME_DATA (handleUnnumberedFrame)');
                this.sendIFrameData(canmessage);
            }
            else {
                logule.info("SEND U_FRAME_DISC (handleUnnumberedFrame)");
                this.sendFrame(this.U_FRAME_DISC);
            }
        }
        else {
            this.linkup = false;
            if (this.sentqueue.length > 0) {
                logule.info("SEND U_FRAME_SABM (handleUnnumberedFrame)");
                this.linkup = true;
                this.sendFrame(this.U_FRAME_SABM);
            }
        }
        break;
    case this.U_FRAME_DISC:
        logule.info('GOT U_FRAME_DISC (handleUnnumberedFrame)');
        logule.info('SEND U_FRAME_UA (handleUnnumberedFrame)');
        this.sendFrame(this.U_FRAME_UA);
        this.linkup = false;
        break;
    default:
        logule.info('GOT ??? ' + frame[0] + ' FRAME (handleUnnumberedFrame)');
        logule.info('SEND U_FRAME_DISC (handleUnnumberedFrame)');
        this.sendFrame(this.U_FRAME_DISC);
        break;
    }
};

Class.prototype.handleSupervisoryFrame = function(frame) {
    switch (frame[0]) {
    case this.S_FRAME_RR:
        // RR receive ready, packet have only one frame so send DISC
        logule.info('GOT S_FRAME_RR (handleSupervisoryFrame)');
        this.sentqueue.shift();
        logule.info("SEND U_FRAME_DISC (handleSupervisoryFrame)");
        this.sendFrame(this.U_FRAME_DISC);
        break;
    case this.S_FRAME_RNR:
        // RNR receive not ready
        logule.info('GOT S_FRAME_RNR (handleSupervisoryFrame)');
        logule.info('SEND U_FRAME_DISC (handleSupervisoryFrame)');
        this.sendFrame(this.U_FRAME_DISC);
        break;
    case this.S_FRAME_REJ:
        // REJ rejected
        logule.info('GOT S_FRAME_REJ (handleSupervisoryFrame)');
        logule.info('SEND I_FRAME_DATA (handleSupervisoryFrame)');
        this.sendIFrameData(this.sentqueue[0]);
        break;
    default:
        logule.info('GOT ??? ' + frame[0] + ' FRAME (handleSupervisoryFrame)');
        logule.info('SEND I_FRAME_DATA (handleSupervisoryFrame)');
        this.sendFrame(this.U_FRAME_DISC);
        break;
    }
};

Class.prototype.sendFrame = function(frame) {
    var packet = new Buffer(5);

    this.lastControlByte = frame;
    packet.writeUInt8(this.FRAME_BOUNDARY, 0);
    packet.writeUInt8(frame, 1);
    this.outcrc.reset();
    this.outcrc.update(frame);
    packet.writeUInt8(this.outcrc.get() & 0xff, 2);
    packet.writeUInt8(this.outcrc.get() >> 8, 3);
    packet.writeUInt8(this.FRAME_BOUNDARY, 4);
    this.serialPort.write(packet);
};

Class.prototype.sendIFrameData = function(canMessage) {
    var datas = canMessage.getdatas();
    var len = datas.length;
    var packet = new Buffer(len + 5);

    this.lastControlByte = this.I_FRAME_DATA;
    packet.writeUInt8(this.FRAME_BOUNDARY, 0);
    packet.writeUInt8(this.I_FRAME_DATA, 1);
    this.outcrc.reset();
    this.outcrc.update(this.I_FRAME_DATA);
    for (var i = 0; i < len; i++) {
        this.outcrc.update(datas[i]);
        packet.writeUInt8(datas[i], 2 + i);
    }
    packet.writeUInt8(this.outcrc.get() & 0xff, 2 + len);
    packet.writeUInt8(this.outcrc.get() >> 8, 3 + len);
    packet.writeUInt8(this.FRAME_BOUNDARY, 4 + len);
    this.serialPort.write(packet);
};

module.exports = Class;