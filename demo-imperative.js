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