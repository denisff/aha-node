var Class = function() {
        this.crc = 0xffff;
    };

Class.prototype.reset = function() {
    this.crc = 0xffff;
};

Class.prototype.update = function(d) {
    var data = d & 0xff;
    data ^= this.crc & 0xff;

    data ^= (data << 4) & 0xff;

    this.crc = (((data << 8) | ((this.crc >> 8) & 0xff)) ^ (data >> 4) ^ (data << 3));
};

Class.prototype.get = function() {
    return this.crc;
};

module.exports = Class;