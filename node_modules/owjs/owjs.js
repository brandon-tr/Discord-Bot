// based on https://github.com/benediktarnold/owfs

/*jshint latedef:nofunc, white:true, node:true, undef:true, unused:true */

var net = require('net'),
    Q = require('q');

var OW_READ =   2; // read from 1-wire bus
var OW_WRITE =  3; // write to 1-wire bus
//UNUSED: var OW_DIR =    4; // list 1-wire bus
//UNUSED: var OW_PRESENT = 6; // Is the specified component recognized and known
var OW_DIRALL = 7; // list 1-wire bus, in one packet string
//UNUSED: var OW_GET =    8; // dirall or read depending on path
//UNUSED: var OW_DIRALLSLASH = 9; // dirall but with directory entries getting a trailing '/'
//UNUSED: var OW_GETSLASH = 10; // dirallslash or read depending on path


/**
 * generate a node type callback call if it's set to a function
 * otherwise return the promise
 */
function nodify(promise, callback) {
    if (typeof callback === 'function') {
        promise.then(function (result) {
            return callback(null, result);
        })
        .catch(callback);

        return;
    }
    else {
        return promise;
    }
}


// test device path for family id
// internal
function familyFilter(family) {
    return function (path) {
        if (path.substring(1, 3) === family) {
            return true;
        }
        else {
            return false;
        }
    };
}


function Client(options) {
    var self = this;

    self.headers = ['version', 'payload', 'ret', 'controlflags', 'size', 'offset'];

    self.option = {
        host: 'localhost',
        port: 4304,
    };

    // set options
    for (var i in options) {
        if (typeof(options[i]) == 'object') {
            self.option[i] = {};
            for (var j in options[i]) {
                self.option[i][j] = options[i][j];
            }
        } else {
            self.option[i] = options[i];
        }
    }


    // define procedures
    self.htonl = function (n) {
        return [
            (n & 0xFF000000) >>> 24,
            (n & 0x00FF0000) >>> 16,
            (n & 0x0000FF00) >>>  8,
            (n & 0x000000FF) >>>  0,
        ];
    };


    self.ntohl = function (b) {
        return ((0xff & b[0]) << 24) |
             ((0xff & b[1]) << 16) |
             ((0xff & b[2]) << 8) |
             ((0xff & b[3]));
    };


    // send raw data to 1-wire and return responding
    // message using a promise if not callback is provided
    self.send = function (path, value, type, callback) {
        var deferred = Q.defer();
        var socket = new net.Socket({ type: 'tcp4' });
        var messages = [];

        socket.on('error', function (error) {
            deferred.reject(new Error(error));
        });

        //finished receiving
        socket.on('end', function () {
            deferred.resolve(messages);
        });

        //receive data
        socket.on('data', function (data) {
            var j = 0, chunk = 4, header = {};
            for (var i = 0; i < 24; i += chunk) {
                var temparray = data.slice(i, i + chunk);
                var value = self.ntohl(temparray);
                header[self.headers[j]] = value;
                j++;
            }
            messages.push({
                header: header,
                payload: data.slice(24).toString('utf8')
            });
        });

        //send stuff
        socket.connect(self.option.port, self.option.host, function () {
            var msg = [];
            path += '\x00';
            if (type === OW_WRITE && (typeof value === 'undefined' || value === null)) {
                throw new Error("Must have a value to write to " + path);
            }
            value = (type == OW_WRITE) ? value.toString() + '\x00' : '';
            // http://owfs.org/index.php?page=owserver-message-types
            msg = msg.concat(
                self.htonl(0),
                self.htonl(path.length + value.length),
                self.htonl(type),
                self.htonl(0x00000020),
                self.htonl(value.length ? value.length : 8192),
                self.htonl(0)
            );
            var buf = new Buffer(msg.length + path.length + value.length);
            new Buffer(msg).copy(buf, 0);
            new Buffer(path + value).copy(buf, msg.length);

            socket.end(buf);
        });

        return nodify(deferred.promise, callback);  
    };


    // return array of dir
    self.list = function (path, callback) {
        var promise;
        if (path instanceof Array) {
            promise = Q.all(path.map(self.list));
        }
        else {
            promise = self.send(path, null, OW_DIRALL)
            .then(function (messages) {
                var message = messages[0];
                if (message.header.ret < 0) {
                    throw new Error(message.header.ret);
                } 
                var str = message.payload;
                str = str.substring(0, str.length - 1); // remove zero-char from end
                return str.split(',');
            });
        }

        return nodify(promise, callback);
    };


    // read value
    self.read = function (path, callback) {
        var promise;
        
        if (path instanceof Array) {
            promise = Q.all(path.map(self.read));
        }
        else {
            promise = self.send(path, null, OW_READ)
            .then(gotMessages);
        }

        function gotMessages(messages) {
            //take the last one only
            var message = messages[messages.length -1];
            
            if (message.header.ret < 0) {
                throw new Error(message.header.ret);  
            } 
            return {path: path, value: message.payload};
        }

        return nodify(promise, callback);
    };


    // write value
    self.write = function (path, value, callback) {
        return nodify(
            self.send(path, value, OW_WRITE)
            .then(function (messages) {
                if (messages[0].header.ret < 0) {
                    throw new Error(messages[0].header.ret);  
                } 
                return true;
            }),
            callback
        );
    };


    // read a specific property from all devices in family
    self.readFamily = function (family, property, callback) {
        if (typeof family !== 'string') {
            family = family.toString();
        }
        function filterDevices(devices) {
            var filtered = devices.filter(familyFilter(family)).map(
                function (element) {
                    return element + '/' + property;
                }
            );

            return self.read(filtered);
        }

        return nodify(
            self.list('/').then(filterDevices),
            callback);
    };


    
}

exports.Client = Client;