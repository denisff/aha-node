var colors = require('colors'),
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
var Class = function (options) {
    this.debug = options && options.debug || false;
    this.portUSB = options && options.portUSB || "/dev/ttyUSB0";
    this.baudrate = options && options.baudrate || 115200;
    this.sentqueue = options && options.sentqueue;
    this.receivedqueue = options && options.receivedqueue;
    this.log('info', 'initializing');
    this.log('debug', 'debug:' + this.debug);
    this.log('debug', 'portUSB:' + this.portUSB);
    this.log('debug', 'baudrate:' + this.baudrate);
    this.serialPort = new serial.SerialPort(this.portUSB, {
      baudrate: this.baudrate
    });

    this.log('debug', 'SerialPort ouvert:');

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
    var self = this;

    this.serialPort.on("data", function (data) {
      // loop on data received
      var datalen = data.length;

      for (var i = 0; i < datalen; i++) {
        var bIn = data.charCodeAt(i);
        this.processData(bIn);
      }
    });

    this.serialPort.on("close", function () {
      self.log('info', "SerialPort ferme.");
    });
    };

Class.prototype.processData = function (char) {
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
        this.log('warn', 'Message too big');
      }
    }
  }
};

Class.prototype.processFrame = function (frame) {
  // processFrame
  var framelen = frame.length;
  var messCRC;
  if (framelen < 3) {
    // less than 3 bytes so wrong message
    this.log('warn', 'less than 3 bytes so wrong message');
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
    this.log('warn', 'CRC Error');
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
  // end processFrame
};

Class.prototype.handleInformationFrame = function (frame, framelen) {
  if (framelen - 3 > 0) {
    // create CAN message
    var canMessage = new Ahapacket().loadCanMessage(frame.slice(1, framelen - 3));
    this.fromarduino.push(canMessage);
    this.writeFrame(this.S_FRAME_RR);
  }
};

Class.prototype.handleUnnumberedFrame = function (frame) {
  switch (frame[0]) {
  case this.U_FRAME_SABM:
    if (!this.linkUp) {
      this.linkup = true;
      this.writeFrame(this.U_FRAME_UA);
    }
    else {
      this.writeFrame(this.U_FRAME_DM);
    }
    break;
  case this.U_FRAME_DM:
    this.linkup = false;
    //startXMit(true);
    break;
  case this.U_FRAME_UA:
    if (this.lastControlByte === this.U_FRAME_SABM) {
      if (!this.linkUp) return;
      if (this.sentqueue.length > 0) {
        this.log("INFO", "SEND I_FRAME_DATA");
        this.writeIFrameData(this.sentqueue[0]);
      }
      else {
        this.log("INFO", "SEND U_FRAME_DISC");
        this.writeFrame(this.U_FRAME_DISC);
      }
    }
    else {
      this.linkup = false;
      //startXMit(false);
    }
    break;
  case this.U_FRAME_DISC:
    this.writeFrame(this.U_FRAME_UA);
    this.linkup = false;
    break;
  default:
    this.writeFrame(this.U_FRAME_DISC);
    break;
  }
};

Class.prototype.handleSupervisoryFrame = function (frame) {
  switch (frame[0]) {
  case this.S_FRAME_RR:
    // RR receive ready, packet have only one frame so send
    // DISC
    this.sentqueue.shift();
    this.writeFrame(this.U_FRAME_DISC);
    break;
  case this.S_FRAME_RNR:
    // RNR receive not ready
    this.writeFrame(this.U_FRAME_DISC);
    break;
  case this.S_FRAME_REJ:
    // REJ rejected
    //sendFrame(I_FRAME_DATA, sentQueue.peek());
    this.writeIFrameData(this.sentqueue[0]);
    break;
  default:
    this.writeFrame(this.U_FRAME_DISC);
    break;
  }
};

Class.prototype.writeFrame = function (frame) {
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

Class.prototype.writeIFrameData = function (canMessage) {
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
/*
 * EventEmitter, I choose you!
 */
//util.inherits(Board, events.EventEmitter);
/*
 * Logger utility function
 */
Class.prototype.log = function (level, message) {
  if (this.debug) {
    console.log(String(+new Date()).grey + ' aha '.blue + level.magenta + ' ' + message);
  }
};

module.exports = Class;