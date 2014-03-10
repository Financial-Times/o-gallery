/*global require, console, slideshowGalleryConfig, thumbnailGalleryConfig*/

var Gallery = require('./../../main.js');

if (document.addEventListener) {
    document.addEventListener("oGalleryReady", function (evt) {
        "use strict";
        if (typeof console === "object" && typeof console.log === "function") {
            console.log("Gallery ready", evt.gallery);
            parent && parent.postMessage(JSON.stringify({
                type: 'resize',
                url: location.href,
                height: document.body.scrollHeight
            }), '*');
        }
    });
}

var slideshowImperative = new Gallery(document.getElementById("imperative-slideshow"), slideshowGalleryConfig),
    thumbnailImperative = new Gallery(document.getElementById("imperative-thumbnails"), thumbnailGalleryConfig);

if (thumbnailImperative.syncWith) {
    thumbnailImperative.syncWith(slideshowImperative);
}
