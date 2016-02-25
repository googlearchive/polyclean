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
var PluginError = require('plugin-error');

/**
 * Transforms all inline scripts in `html` with `filter`.
 */
function filterInlineScript(html, filter, cb) {
  var p = dom5.predicates;
  var parsedHtml = dom5.parse(html);
  var isInlineScript = p.AND(
    p.hasTagName('script'),
    p.NOT(p.hasAttr('src'))
  );
  dom5.queryAll(parsedHtml, isInlineScript)
    .forEach(function(inlineScript) {
      var text = dom5.getTextContent(inlineScript);
      try {
        dom5.setTextContent(inlineScript, filter(text));
      } catch(e) {
        var err = new PluginError('polyclean', formatError(e, { path: 'Inline Script', contents: new Buffer(text) }));
        cb(err);
      }
    });
  cb(null, dom5.serialize(parsedHtml));
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

/**
 * Format error message with error location
 */
function formatError(err, file, encoding){

  // Get some context
  var context = file.contents.toString(encoding || 'utf-8').split('\n').splice(err.line - 2, 4).map(function(line, index){
    return (err.line - 1 + index) + ': ' + line;
  }).join('\n');

  return { 
    message: [err.message, ' at ', file.path, ':', err.line, ':', err.col, '\n', 'Context:\n', context, '\n'].join(''), 
    stack: err.stack || null
  }
}


var ESPREE_OPTIONS = {
  attachComment: false,
  comments: false
};

var LEFT_ALIGN_OPTIONS = {
  format: {
    indent: {
      style: ''
    }
  }
};

function parse(text) {
  return espree.parse(text, ESPREE_OPTIONS);
}

function codegen(ast, options) {
  return escodegen.generate(ast, options);
}

var exports = {
  /**
   * Gulp plugin that removes comments with a parser roundtrip.
   */
  cleanJsComments: function cleanJsComments() {
    return through2.obj(function(file, encoding, cb) {
      try {
        filterInlineScript(String(file.contents), function(text) {
          return codegen(parse(text));
        }, function(err, cleaned){
          cleaned && (file.contents = new Buffer(cleaned));
          cb(err, file);  
        });
      } catch (e) {
        var err = new PluginError('polyclean', formatError(e, file, encoding));
        cb(err);
      }
    });
  },

  /**
   * Left align all the javascript
   * Leave newlines, as they can be useful for debugging
   */
  leftAlignJs: function leftAlignJs() {
    return through2.obj(function(file, encoding, cb) {
      try {
        filterInlineScript(String(file.contents), function(text) {
          return codegen(parse(text), LEFT_ALIGN_OPTIONS);
        }, function(err, cleaned){
          cleaned && (file.contents = new Buffer(cleaned));
          cb(err, file);  
        });
      } catch (e) {
        var err = new PluginError('polyclean', formatError(e, file, encoding));
        cb(err);
      }
    });
  },

  /**
   * Uglify the stream.
   */
  uglifyJs: function uglifyJs(options) {
    options = options || {};
    options.fromString = true;

    return through2.obj(function(file, encoding, cb) {
      try {
        filterInlineScript(String(file.contents), function(text) {
          return uglify.minify(text, options).code;
        }, function(err, cleaned){
          cleaned && (file.contents = new Buffer(cleaned));
          cb(err, file);  
        });
      } catch (e) {
        var err = new PluginError('polyclean', formatError(e, file, encoding));
        cb(err);
      }
    });
  },

  /**
   * Remove CSS Whitespace from text
   */
  stripCss: function stripCss(text) {
    return text.replace(/[\r\n]/g, '')
      // reduce 2 or more spaces to one
      // and remove all leading and trailing spaces
      .replace(/ {2,}/g, ' ')
      .replace(/(^|[;,\:\{\}]) /g, '$1')
      .replace(/ ($|[;,\{\}])/g, '$1');
  },

  /**
   * Remove CSS Whitespace
   */
  cleanCss: function cleanCss() {
    return through2.obj(function(file, encoding, cb) {
      try {
        var cleaned = filterInlineStyles(String(file.contents), exports.stripCss);
        file.contents = new Buffer(cleaned);
        cb(null, file);
      } catch (e) {
        var err = new PluginError('polyclean', formatError(e, file, encoding));
        cb(err);
      }
    });
  }
};

module.exports = exports;
