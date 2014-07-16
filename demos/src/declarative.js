/*global require, console */

require('./polyfills.js');

var Gallery = require('./../../main.js');
window.galleries = Gallery.createAllIn(document.body);
