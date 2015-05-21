/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

// jshint node: true

'use strict';
var dom5 = require('dom5');
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
      dom5.setTextContent(inlineScript, filter(text));
    });
  return dom5.serialize(parsedHtml);
}

/**
 * Transforms all inline styles in `html` with `filter`
 */
function filterInlineStyles(html, filter) {
  var p = dom5.predicates;
  var parsedHtml = dom5.parse(html);
  var isInlineStyle = p.hasTagName('style');
  dom5.queryAll(parsedHtml, isInlineStyle)
    .forEach(function(inlineStyle) {
      var text = dom5.getTextContent(inlineStyle);
      dom5.setTextContent(inlineStyle, filter(text));
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
        var content = espree.parse(text, {
          attachComment: false,
          comments: false
        });
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
        return uglify.minify(text, {
          fromString: true
        }).code;
      });
      file.contents = new Buffer(cleaned);
      this.push(file);
      return cb();
    });
  },

  /**
   * Remove CSS Whitespace
   */
  cleanCss: function cleanCss() {
    return through2.obj(function(file, enc, cb) {
      var cleaned = filterInlineStyles(String(file.contents), function(text) {
        // remove newlines
        return text.replace(/[\r\n]/g, '')
        // remove 2 or more spaces
        // (single spaces can be syntactically significant)
        .replace(/ {2,}/g, '');
      });
      file.contents = new Buffer(cleaned);
      this.push(file);
      return cb();
    });
  }
};

module.exports = exports;
