var logule = require('logule');
var AhaPacket = require('./ahapacket');

// Constructor
var Class = function(options) {
        this.sentqueue = options && options.sentqueue;
        this.receivedqueue = options && options.receivedqueue;
    };

// properties and methods
Class.prototype = {};

Class.prototype.Process = function(ahaPacket) {
    // log dans base
    var outAhaPacket = new AhaPacket();
    if (ahaPacket.getCidTyp() == AhaPacket.CID_TYP_EM) {
        // Explicit message
        if ((ahaPacket.getCidNodeDst() == AhaPacket.BROADCAST_NODE) || (ahaPacket.getCidNodeDst() == AhaPacket.MASTER_CFG_NODE)) {
            // it s for the master node
            switch (ahaPacket.CidEm) {
            case AhaPacket.CID_EM_NEED_ID:
                // find an id for the card
                var nodeAdr = 1 & 0x7FF;
                // return message CID_EM_NEED_ID
                outAhaPacket.createCanMessage(
                AhaPacket.CID_PRI_HIGH, AhaPacket.CID_TYP_EM, AhaPacket.MASTER_CFG_NODE, ahaPacket.getCidNodeSrc(), AhaPacket.NULL_DIR, AhaPacket.NULL_NV_BND, AhaPacket.CID_EM_SET_ID);
                outAhaPacket.addU8(ahaPacket.datas[0]);
                outAhaPacket.addU8(ahaPacket.datas[1]);
                outAhaPacket.addU8(ahaPacket.datas[2]);
                outAhaPacket.addU8(ahaPacket.datas[3]);
                outAhaPacket.addU8(ahaPacket.datas[4]);
                outAhaPacket.addU8(ahaPacket.datas[5]);
                outAhaPacket.addU16(nodeAdr);
                this.sentqueue.push(outAhaPacket);
                break;
            case AhaPacket.CID_EM_NEED_CFG:
                var bindingID;
                var nodeCfgVersion = 1 & 0xFFFF;
                // send CID_EM_START_CFG
                // Bouton poussoir           Binding     Lampe
                //                              1
                // nviBoutonPoussoirSet(0)   <------     nvoLampeStatus(3)
                //                              2
                // nvoBoutonPoussoirStatus(1) ------>     nviLampeSet(2)
                outAhaPacket.createCanMessage(
                AhaPacket.CID_PRI_HIGH, AhaPacket.CID_TYP_EM, AhaPacket.MASTER_CFG_NODE, ahaPacket.getCidNodeSrc(), AhaPacket.NULL_DIR, AhaPacket.NULL_NV_BND, AhaPacket.CID_EM_START_CFG);
                outAhaPacket.addU8(4); // 4 binding variables
                this.sentqueue.push(outAhaPacket);
                // send CID_EM_SET_CFG
                bindingID = 1 & 0x7FFF;
                outAhaPacket.createCanMessage(
                AhaPacket.CID_PRI_HIGH, AhaPacket.CID_TYP_EM, AhaPacket.MASTER_CFG_NODE, ahaPacket.getCidNodeSrc(), AhaPacket.NULL_DIR, AhaPacket.NULL_NV_BND, AhaPacket.CID_EM_SET_CFG);
                outAhaPacket.addU8(0); // Binding ID 0					
                outAhaPacket.addU8(0); // NVID 0					
                outAhaPacket.addU16(bindingID); // binding 1
                this.sentqueue.push(outAhaPacket);
                outAhaPacket.createCanMessage(
                AhaPacket.CID_PRI_HIGH, AhaPacket.CID_TYP_EM, AhaPacket.MASTER_CFG_NODE, ahaPacket.getCidNodeSrc(), AhaPacket.NULL_DIR, AhaPacket.NULL_NV_BND, AhaPacket.CID_EM_SET_CFG);
                outAhaPacket.addU8(1); // Binding ID 1					
                outAhaPacket.addU8(3); // NVID 3					
                outAhaPacket.addU16(bindingID); // binding 1
                this.sentqueue.push(outAhaPacket);
                bindingID = 2 & 0x7FFF;
                outAhaPacket.createCanMessage(
                AhaPacket.CID_PRI_HIGH, AhaPacket.CID_TYP_EM, AhaPacket.MASTER_CFG_NODE, ahaPacket.getCidNodeSrc(), AhaPacket.NULL_DIR, AhaPacket.NULL_NV_BND, AhaPacket.CID_EM_SET_CFG);
                outAhaPacket.append(2); // Binding ID 2					
                outAhaPacket.append(1); // NVID 1					
                outAhaPacket.addU16(bindingID); // binding 2
                this.sentqueue.push(outAhaPacket);
                outAhaPacket.createCanMessage(
                AhaPacket.CID_PRI_HIGH, AhaPacket.CID_TYP_EM, AhaPacket.MASTER_CFG_NODE, ahaPacket.getCidNodeSrc(), AhaPacket.NULL_DIR, AhaPacket.NULL_NV_BND, AhaPacket.CID_EM_SET_CFG);
                outAhaPacket.addU8(3); // Binding ID 3					
                outAhaPacket.addU8(2); // NVID 2					
                outAhaPacket.addU16(bindingID); // binding 2
                this.sentqueue.push(outAhaPacket);
                // send CID_EM_END_CFG
                outAhaPacket.createCanMessage(
                AhaPacket.CID_PRI_HIGH, AhaPacket.CID_TYP_EM, AhaPacket.MASTER_CFG_NODE, ahaPacket.getCidNodeSrc(), AhaPacket.NULL_DIR, AhaPacket.NULL_NV_BND, AhaPacket.CID_EM_END_CFG);
                outAhaPacket.addU16(nodeCfgVersion); // Cfg Version
                this.sentqueue.push(outAhaPacket);
                break;
            default:
                logule.error("Unknow message %s", ahaPacket.toString());
            }
        }
    }
};

Class.prototype.listen = function() {
    var self = this;
    setInterval(

    function() {
        if (self.receivedqueue.length > 0) {
            // received message
            logule.info('Received message:' + self.receivedqueue[0].toString());
            self.Process(self.receivedqueue[0].toString());
            self.receivedqueue.shift();
        }
    }, 1000);

};

module.exports = Class;