// Demo code. Does what a product will have to do to construct a slideshow from data
var origamiGallery = require('./main.js');

// TODO: Don't put these in the global scope
window.galleries = origamiGallery.constructFromPage();
window.galleries.push(new origamiGallery.Gallery(standaloneGalleryConfig));
window.galleries.push(new origamiGallery.Gallery(slideshowGalleryConfig));
window.galleries.push(new origamiGallery.Gallery(thumbnailGalleryConfig));