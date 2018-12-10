/*global require, module*/

const oGallery = require('./src/js/Gallery');
const constructAll = function() {
	oGallery.init();
	document.removeEventListener('o.DOMContentLoaded', constructAll);
};

document.addEventListener('o.DOMContentLoaded', constructAll);

module.exports = oGallery;
