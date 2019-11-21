import oGallery from './src/js/Gallery';

const constructAll = function() {
	oGallery.init();
	document.removeEventListener('o.DOMContentLoaded', constructAll);
};

document.addEventListener('o.DOMContentLoaded', constructAll);

export default oGallery;
