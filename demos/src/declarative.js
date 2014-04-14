/*global require, console */

require('./polyfills.js');

var Gallery = require('./../../main.js');

if (document.addEventListener) {
    document.addEventListener("oGallery.ready", function (evt) {
        "use strict";
        if (typeof console === "object" && typeof console.log === "function") {
            console.log("Gallery ready", evt.detail.gallery);
            parent && parent.postMessage(JSON.stringify({
                type: 'resize',
                url: location.href,
                height: document.body.scrollHeight
            }), '*');
        }
    });
}

window.galleries = Gallery.createAllIn(document.body);
