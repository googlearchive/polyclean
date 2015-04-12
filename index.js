/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
var escodegen, esprima, through2, transform, traverse;

escodegen = require('escodegen');
espree = require('espree');
through2 = require('through2');

var exports = {
  cleanJsComments: function cleanJsComments() {
    return through2.obj(function(file, encoding, cb) {
      var parsedHtml = espree.parse(String(file.contents));
      file.contents = new Buffer(escodegen.generate(file.ast));
      return cb();
    });
  }
};

module.exports = exports;