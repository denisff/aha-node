var Ahapacket = require('./ahapacket');

var AHASwitch = function() {
        this.SetOn();
    };

AHASwitch.prototype = {
    this.AHA_NV_TYPE_SWITCH = 0;
    this.AHA_TYP_SWITCH_ON = 0x1;
    this.AHA_TYP_SWITCH_OFF = 0x0;
    this.AHA_NV_DIR_INPUT = 0;
    this.AHA_NV_DIR_OUTPUT = 1;
    this.value = 0x0;
    this.state = 0x0;
}

Class.prototype.SetOn = function() {
    this.value = this.AHA_TYP_SWITCH_ON;
    this.state = this.AHA_TYP_SWITCH_ON;
};

Class.prototype.SetOff = function() {
    this.value = this.AHA_TYP_SWITCH_OFF;
    this.state = this.AHA_TYP_SWITCH_OFF;
};

Class.prototype.SetCanMessage = function(nodeAdr, cidDir, cidNvBnd) {
    var canMessage = new Ahapacket();
    canMessage.createCanMessage(Ahapacket.CID_PRI_LOW, Ahapacket.CID_TYP_NV, nodeAdr, Ahapacket.NULL_NODE_DST, cidDir, cidNvBnd, Ahapacket.NULL_EM);
    canMessage.addU8(this.state);
    canMessage.addU8(this.value);
    return canMessage;
};

module.exports = AHASwitch;