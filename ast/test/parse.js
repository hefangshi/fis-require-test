/*jslint plusplus: true */
/*global define, java */

var assert = require("should"),
    parse = require('../lib/vendor/parse.js'),
    transform = require('../lib/transform.js'),
    fs = require('fs');

describe('parse', function () {
    it('test', function () {
        var content = fs.readFileSync(__dirname + '/data/gauge.js').toString();
        var result = parse('amd', null, content);
        console.log(result);
    });
});

describe('transform', function () {
    it('test', function () {
        var content = fs.readFileSync(__dirname + '/data/amd.js').toString();
        var result = transform('amd', null, content);
        console.log(result);
    });
});