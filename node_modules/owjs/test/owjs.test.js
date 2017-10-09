
/*
    Tested using a owserver where config was
    server: FAKE = DS18S20,DS18S20,DS18S20,DS2405
*/

/*jshint latedef:nofunc, white:true, node:true, undef:true, unused:true */
/*global describe:true, before:true, it:true */

var owjs = require('../owjs'),
    should = require('should');

var client;
var HOST = process.env.OWFS || '127.0.0.1';

var MAX_DEVICES = 50;
var MAX_TEMP_DEVICES = 10;


describe('owjs', function () {

    before(function () {
    //create the client instance
        client = new owjs.Client({
            host: HOST
        });
    });


    it('send protocoll message', function (done) {
        client.send('/', null, 7)
            .then(onResponse)
            .catch(done);

        function onResponse(messages) {
            should.exist(messages);
            messages.should.be.an.instanceof(Array);
            messages.length.should.equal(1);
            done();
        }
    });


    it('list devices', function (done) {
        client.list('/')
            .then(onResponse)
            .catch(done);

        function onResponse(devices) {
            devices.should.be.an.instanceof(Array);
            devices.length.should.be.within(1, MAX_DEVICES);
            devices.forEach(function (device) {
                device.should.be.a('string');
                // '/10.67C6697351FF'
                device.should.have.length(16);
            });
            
            done();
        }
       
    });


    it('read value', function (done) {
        client.read('/settings/timeout/directory')
        .then(onResponse)
        .catch(done);

        function onResponse(result) {
            result.should.be.a('object');
            result.should.have.property('path', '/settings/timeout/directory');
            result.should.have.property('value', '          60');
            result.value.should.have.length(12);
            done();
        }
    });


    it('write value', function (done) {
        client.list('/')
        .then(function (devices) {
            for (var i = 0; i < devices.length; i++) {
                //if we have a device that is a writable family..
                if (devices[i].substring(0, 3) === '/05') { 
                    return client.write(devices[i] + '/PIO', 100);
                }
            }
        })
        .then(function () {
            done();
        })
        .catch(done);
    });


    it('list device properties', function (done) {
        var length;
        client.list('/')
        .then(function (devices) {
            length = devices.length;
            return client.list(devices);
        })
        .then(function (result) {
            //this should result in an array of arrays.
            result.should.be.an.instanceof(Array);
            result.should.have.length(length);
            result[0].should.be.an.instanceof(Array);
            done();
        })
        .catch(done);
    });


    it('readFamily', function (done) {
        //this might take somtime on a "real" owserver
        //if it doesn't have a fresh value in the cache
        this.timeout(5000);
        client.readFamily(10, 'temperature')
        .then(gotValues)
        .catch(done);

        function gotValues(result) {
            result.should.be.an.instanceof(Array);
            result.length.should.be.within(1, MAX_TEMP_DEVICES);
            var prop = result[0];
            prop.should.be.a('object');
            prop.should.have.property('path');
            prop.should.have.property('value');
            var t = parseFloat(prop.value);
            t.should.be.within(0, 30);
            
            done();
        }
    });


    it('read value using callback', function (done) {
        client.read('/settings/timeout/directory', onResponse);
        

        function onResponse(err, result) {
            should.not.exist(err);
            result.should.be.a('object');
            result.should.have.property('path', '/settings/timeout/directory');
            result.should.have.property('value', '          60');
            result.value.should.have.length(12);
            done();
        }
    });
});
