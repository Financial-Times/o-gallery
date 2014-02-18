// Demo code. Does what a product will have to do to construct a slideshow from data
var origamiGallery = require('./main.js');

document.addEventListener("oGalleryReady", function (evt) {
    console.log("Gallery ready", evt.detail.gallery);
});

window.galleries = origamiGallery.constructFromPage(document.body);

var standaloneImperative = new origamiGallery.Gallery(standaloneGalleryConfig),
    slideshowImperative = new origamiGallery.Gallery(slideshowGalleryConfig),
    thumbnailImperative = new origamiGallery.Gallery(thumbnailGalleryConfig);

window.galleries.push(standaloneImperative);
window.galleries.push(slideshowImperative);
window.galleries.push(thumbnailImperative);

thumbnailImperative.syncWith(slideshowImperative);