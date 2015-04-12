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
dom5 = require('dom5')

var exports = {
  /**
   * Gulp plugin that removes comments with a parser roundtrip.
   */
  cleanJsComments: function cleanJsComments() {
    var p = dom5.predicates;
    return through2.obj(function(file, encoding, cb) {
      var parsedHtml = dom5.parse(String(file.contents));
      var isInlineScript = p.AND(
        p.hasTagName('script'),
        p.NOT(p.hasAttr('src'))
      );
      dom5.queryAll(parsedHtml, isInlineScript)
        .forEach(function(inlineScript) {
          var text = dom5.getTextContent(inlineScript);
          content = espree.parse(text, {attachComment: false, comments: false});
          dom5.setTextContent(inlineScript,
            escodegen.generate(content)
            );
        });
      file.contents = new Buffer(dom5.serialize(parsedHtml));
      this.push(file);
      return cb();
    });
  }
};

module.exports = exports;