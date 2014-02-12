(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Demo code. Does what a product will have to do to construct a slideshow from data
var Gallery = require('./src/js/Gallery.js');

var gallery_standalone = new Gallery({
    container: document.getElementById("imperative-standalone")
});

var gallery_slideshow = new Gallery({
    container: document.getElementById("imperative-slideshow")
});

var gallery_thumbnails = new Gallery({
    container: document.getElementById("imperative-thumbnails")
});
},{"./src/js/Gallery.js":2}],2:[function(require,module,exports){
module.exports = function(config) {
    console.log("Constructed Gallery with ", config);
};
},{}]},{},[1])