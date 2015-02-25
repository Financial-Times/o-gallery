/*global require, slideshowGalleryConfig, thumbnailGalleryConfig*/
'use strict';

var Gallery = require('./../../main.js');

var slideshowImperative = new Gallery(document.getElementById("imperative-slideshow"), slideshowGalleryConfig);
var thumbnailImperative = new Gallery(document.getElementById("imperative-thumbnails"), thumbnailGalleryConfig);

thumbnailImperative.syncWith(slideshowImperative);
