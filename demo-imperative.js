// Demo code. Does what a product will have to do to construct a slideshow from data
/*global require*/
var Gallery = require('./main.js');

document.addEventListener("oGalleryReady", function (evt) {
    console.log("Gallery ready", evt.detail.gallery);
});

window.galleries = Gallery.createAllIn(document.body);

var standaloneImperative = new Gallery(document.getElementById("imperative-standalone"), standaloneGalleryConfig),
    slideshowImperative = new Gallery(document.getElementById("imperative-slideshow"), slideshowGalleryConfig),
    thumbnailImperative = new Gallery(document.getElementById("imperative-thumbnails"), thumbnailGalleryConfig);

window.galleries.push(standaloneImperative);
window.galleries.push(slideshowImperative);
window.galleries.push(thumbnailImperative);

thumbnailImperative.syncWith(slideshowImperative);