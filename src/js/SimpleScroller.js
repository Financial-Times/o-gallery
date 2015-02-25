/*global require,module */
'use strict';

var galleryDom = require('./galleryDom');

/**
 * Mimics FTScroller without touch interface, transitions or events
 * Intended for IE8 or other browsers that lack support for CSS transitions
 */
function SimpleScroller(containerEl) {

	var scroller = this;
	var allItemsEl;
	var viewportEl;

	function updateProperties() {
		scroller.scrollLeft = viewportEl.scrollLeft;
	}

	function scrollTo(n) {
		viewportEl.scrollLeft = n;
		updateProperties();
		containerEl.dispatchEvent(new CustomEvent('scrollend', {
			x: n
		}));
	}

	function destroy() {
		if (containerEl.querySelector('.o-gallery__viewport')) {
			galleryDom.unwrapElement(allItemsEl);
		}
	}

	allItemsEl = containerEl.querySelector('.o-gallery__items');
	viewportEl = galleryDom.createElement('div', '', 'o-gallery__viewport');
	galleryDom.wrapElement(allItemsEl, viewportEl);
	updateProperties();

	this.contentContainerNode = allItemsEl;
	this.scrollTo = scrollTo;
	this.destroy = destroy;
}

module.exports = SimpleScroller;
