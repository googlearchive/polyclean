/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
var dom5 = require('dom5')
var escodegen = require('escodegen');
var espree = require('espree');
var through2 = require('through2');
var uglify = require('uglify-js');

/**
 * Transforms all inline scripts in `html` with `filter`.
 */
function filterInlineScript(html, filter) {
  var p = dom5.predicates;
  var parsedHtml = dom5.parse(html);
  var isInlineScript = p.AND(
    p.hasTagName('script'),
    p.NOT(p.hasAttr('src'))
  );
  dom5.queryAll(parsedHtml, isInlineScript)
    .forEach(function(inlineScript) {
      var text = dom5.getTextContent(inlineScript);
      dom5.setTextContent(inlineScript,filter(text));
    });
  return dom5.serialize(parsedHtml);
}

var exports = {
  /**
   * Gulp plugin that removes comments with a parser roundtrip.
   */
  cleanJsComments: function cleanJsComments() {
    return through2.obj(function(file, encoding, cb) {
      var cleaned = filterInlineScript(String(file.contents), function(text) {
          content = espree.parse(text, {attachComment: false, comments: false});
          return escodegen.generate(content);
      });
      file.contents = new Buffer(cleaned);
      this.push(file);
      return cb();
    });
  },

  /**
   * Uglify the stream.
   */
  uglifyJs: function uglifyJs() {
    return through2.obj(function(file, encoding, cb) {
      var cleaned = filterInlineScript(String(file.contents), function(text) {
          return uglify.minify(text, {fromString: true}).code;
      });
      file.contents = new Buffer(cleaned);
      this.push(file);
      return cb();
    });
  }
};

module.exports = exports;