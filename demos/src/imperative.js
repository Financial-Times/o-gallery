/*global require, console, slideshowGalleryConfig, thumbnailGalleryConfig*/

var Gallery = require('./../../main.js');

var slideshowImperative = new Gallery(document.getElementById("imperative-slideshow"), slideshowGalleryConfig),
    thumbnailImperative = new Gallery(document.getElementById("imperative-thumbnails"), thumbnailGalleryConfig);

if (thumbnailImperative.syncWith) {
    thumbnailImperative.syncWith(slideshowImperative);
}
