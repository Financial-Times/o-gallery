/*global require, module*/
var oGallery = require('./src/js/Gallery'),
    constructAll = function() {
        'use strict';
        oGallery.createAllIn(document.body);
        document.removeEventListener('o.DOMContentLoaded', constructAll);
    };

document.addEventListener('o.DOMContentLoaded', constructAll);

module.exports = oGallery;
