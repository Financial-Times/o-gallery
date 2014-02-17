/*global require, module*/

var Gallery = require('./src/js/Gallery'),
    galleryConstructor = require('./src/js/galleryConstructor');

module.exports = {
    Gallery: Gallery,
    constructFromPage: function() {
        "use strict";
        return galleryConstructor(Gallery);
    }
};