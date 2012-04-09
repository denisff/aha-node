var logule = require('logule'),
    serial = require('serialport'),
    Crc16 = require('./ahaprotocol/crc16'),
    Ahapacket = require('./ahaprotocol/ahapacket');
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
        logule.debug( 'baudrate:' + this.baudrate);
        this.serialPort = new serial.SerialPort(this.portUSB, {
            baudrate: this.baudrate
        });

        logule.debug('SerialPort ouvert:');

        this.incrc = new Crc16();
        this.outcrc = new Crc16();
        this.lastControlByte = this.S_FRAME_RR;
        this.linkup = false;
        this.bufferFrame = [];
        this.inPacket = false;
        this.unEscaping = false;
        this.maxPacketSize = 32;

        this.FRAME_BOUNDARY = 0x7E; //126
        this.ESCAPE_OCTET = 0x7D; //125
        this.ESCAPEXOR_FLAG = 0x20; //32
        this.I_FRAME_BITS = 0x1; //1
        this.S_FRAME_BITS = 0x3; //3
        this.S_FRAME_RR = 0x11; //17
        this.S_FRAME_RNR = 0x15; //21
        this.S_FRAME_REJ = 0x19; //25
        this.U_FRAME_UA = 0x73; //115
        this.U_FRAME_SABM = 0x3F; //63
        this.U_FRAME_DISC = 0x53; //83
        this.U_FRAME_DM = 0x1F; //31
        this.U_FRAME_TEST = 0x33; //51
        this.I_FRAME_DATA = 0x0; //0

        this.serialPort.on("data", function(data) {
            // loop on data received
            var datalen = data.length;

            for (var i = 0; i < datalen; i++) {
                var bIn = data.charCodeAt(i);
                processData(bIn);
            }
        });

        this.serialPort.on("close", function() {
            logule.info('SerialPort ferme.');
        });
    };

var processData = function(char) {
    if (char === this.ESCAPE_OCTET) {
        this.unEscaping = true;
        return;
    }

    if (char === this.FRAME_BOUNDARY && !this.unEscaping) {
        if (this.inPacket) {
            // End of packet
            if (this.bufferFrame.length > 0) {
                this.inPacket = false;
                processFrame(this.bufferFrame);
            }
            else {
                // Beginning of packet 
                this.bufferFrame.clear();
                this.inPacket = true;
            }
        }
        else {
            if (this.unEscaping) {
                char ^= this.ESCAPEXOR_FLAG;
                this.unEscaping = false;
            }

            if (this.bufferFrame.length() < this.maxPacketSize) {
                this.bufferFrame.push(char);
            }
            else {
                logule.warn('Message too big');
            }
        }
    }
};

var processFrame = function(frame) {
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
    messCRC = frame[framelen - 2] & 0xff + ((frame[framelen - 1] & 0xff) << 8);
    if (messCRC != this.incrc.get()) {
        // CRC error
        logule.warn('CRC Error');
        return;
    }

    if ((frame[0] & this.I_FRAME_BITS) === 0x0) {
        handleInformationFrame(frame, framelen);
    }
    else if ((frame[0] & this.S_FRAME_BITS) === 0x1) {
        handleSupervisoryFrame(frame);
    }
    else {
        handleUnnumberedFrame(frame);
    }
};

var handleInformationFrame = function(frame, framelen) {
    if (framelen - 3 > 0) {
        // create CAN message
        var canMessage = new Ahapacket().loadCanMessage(frame.slice(1, framelen - 3));

        logule.info('GOT I_FRAME (handleInformationFrame)');
        this.receivedqueue.push(canMessage);
        logule.info('SEND S_FRAME_RR (handleInformationFrame)');
        sendFrame(this.S_FRAME_RR);
    }
};

var handleUnnumberedFrame = function(frame) {
    switch (frame[0]) {
    case this.U_FRAME_SABM:
        logule.info('GOT U_FRAME_SABM (handleUnnumberedFrame)');
        if (!this.linkUp) {
            this.linkup = true;
            logule.info('SEND U_FRAME_UA (handleUnnumberedFrame)');
            sendFrame(this.U_FRAME_UA);
        }
        else {
            logule.info("SEND U_FRAME_DM (handleUnnumberedFrame)");
            sendFrame(this.U_FRAME_DM);
        }
        break;
    case this.U_FRAME_DM:
        logule.info('GOT U_FRAME_DM (handleUnnumberedFrame)');
        this.linkup = false;
        //startXMit(true);
        break;
    case this.U_FRAME_UA:
        logule.info('GOT U_FRAME_UA (handleUnnumberedFrame)');
        if (this.lastControlByte === this.U_FRAME_SABM) {
            // checkxmit
            if (!this.linkUp) return;
            if (this.sentqueue.length > 0) {
                logule.info('SEND I_FRAME_DATA (handleUnnumberedFrame)');
                sendIFrameData(this.sentqueue[0]);
            }
            else {
                logule.info("SEND U_FRAME_DISC (handleUnnumberedFrame)");
                sendFrame(this.U_FRAME_DISC);
            }
            // end checkxmit
        }
        else {
            this.linkup = false;
            //startXMit(false);
        }
        break;
    case this.U_FRAME_DISC:
        logule.info('GOT U_FRAME_DISC (handleUnnumberedFrame)');
        logule.info('SEND U_FRAME_UA (handleUnnumberedFrame)');
        sendFrame(this.U_FRAME_UA);
        this.linkup = false;
        break;
    default:
        logule.info('GOT ??? ' + frame[0] + ' FRAME (handleUnnumberedFrame)');
        logule.info('SEND U_FRAME_DISC (handleUnnumberedFrame)');
        sendFrame(this.U_FRAME_DISC);
        break;
    }
};

var handleSupervisoryFrame = function(frame) {
    switch (frame[0]) {
    case this.S_FRAME_RR:
        // RR receive ready, packet have only one frame so send DISC
        logule.info('GOT S_FRAME_RR (handleSupervisoryFrame)');
        this.sentqueue.shift();
        logule.info("SEND U_FRAME_DISC (handleSupervisoryFrame)");
        sendFrame(this.U_FRAME_DISC);
        break;
    case this.S_FRAME_RNR:
        // RNR receive not ready
        logule.info('GOT S_FRAME_RNR (handleSupervisoryFrame)');
        logule.info('SEND U_FRAME_DISC (handleSupervisoryFrame)');
        sendFrame(this.U_FRAME_DISC);
        break;
    case this.S_FRAME_REJ:
        // REJ rejected
        logule.info('GOT S_FRAME_REJ (handleSupervisoryFrame)');
        logule.info('SEND I_FRAME_DATA (handleSupervisoryFrame)');
        sendIFrameData(this.sentqueue[0]);
        break;
    default:
        logule.info('GOT ??? ' + frame[0] + ' FRAME (handleSupervisoryFrame)');
        logule.info('SEND I_FRAME_DATA (handleSupervisoryFrame)');
        sendFrame(this.U_FRAME_DISC);
        break;
    }
};

var sendFrame = function(frame) {
    var packet = [];

    this.lastControlByte = frame;
    packet.push(this.FRAME_BOUNDARY);
    packet.push(frame);
    this.outcrc.reset();
    this.outcrc.update(frame);
    packet.push(this.outcrc.get() & 0xff);
    packet.push(this.outcrc.get() >> 8);
    packet.push(this.FRAME_BOUNDARY);
    this.serialport.write(packet);
};

var sendIFrameData = function(canMessage) {
    var packet = [];
    var datas = canMessage.getdatas();
    var len = datas.length;

    this.lastControlByte = this.I_FRAME_DATA;
    packet.push(this.FRAME_BOUNDARY);
    packet.push(this.I_FRAME_DISC);
    this.outcrc.reset();
    this.outcrc.update(this.I_FRAME_DATA);
    for (var i = 0; i < len; i++) {
        this.outcrc.update(datas[i]);
        packet.push(datas[i]);
    }
    packet.push(this.outcrc.get() & 0xff);
    packet.push(this.outcrc.get() >> 8);
    packet.push(this.FRAME_BOUNDARY);
    this.serialport.write(packet);
};

module.exports = Class;