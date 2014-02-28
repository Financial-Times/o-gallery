// Demo code. Does what a product will have to do to construct a slideshow from data
/*global require, console, standaloneGalleryConfig, slideshowGalleryConfig, thumbnailGalleryConfig*/

var Gallery = require('./../main.js');

if (document.addEventListener) {
    document.addEventListener("oGalleryReady", function (evt) {
        "use strict";
        if (typeof console === "object" && typeof console.log === "function") {
            console.log("Gallery ready", evt.gallery);
        }
    });
}

window.galleries = Gallery.createAllIn(document.body);

var standaloneImperative = new Gallery(document.getElementById("imperative-standalone"), standaloneGalleryConfig),
    slideshowImperative = new Gallery(document.getElementById("imperative-slideshow"), slideshowGalleryConfig),
    thumbnailImperative = new Gallery(document.getElementById("imperative-thumbnails"), thumbnailGalleryConfig);

window.galleries.push(standaloneImperative);
window.galleries.push(slideshowImperative);
window.galleries.push(thumbnailImperative);

if (thumbnailImperative.syncWith) {
    thumbnailImperative.syncWith(slideshowImperative);
}