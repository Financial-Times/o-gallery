/*global require, console */
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