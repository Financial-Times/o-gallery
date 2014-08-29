/*global require, module*/
'use strict';

var oGallery = require('./src/js/Gallery'),
    constructAll = function() {
        oGallery.init();
        document.removeEventListener('o.DOMContentLoaded', constructAll);
    };

document.addEventListener('o.DOMContentLoaded', constructAll);

module.exports = oGallery;
