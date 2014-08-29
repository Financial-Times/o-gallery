/*global require,module */
'use strict';

var galleryDom = require('./galleryDom');

/**
 * Mimics FTScroller without touch interface, transitions or events
 * Intended for IE8 or other browsers that lack support for CSS transitions
 */
function SimpleScroller(containerEl) {
    
    var self = this,
        allItemsEl,
        viewportEl;

    function updateProperties() {
        self.scrollLeft = viewportEl.scrollLeft;
    }

    function scrollTo(n) {
        viewportEl.scrollLeft = n;
        updateProperties();
    }

    function destroy() {
        galleryDom.unwrapElement(viewportEl);
    }

    allItemsEl = containerEl.querySelector('.o-gallery__items');
    viewportEl = galleryDom.createElement('div', '', 'o-gallery__viewport');
    containerEl.appendChild(viewportEl);
    galleryDom.wrapElement(allItemsEl, viewportEl);
    updateProperties();

    this.contentContainerNode = allItemsEl;
    this.scrollTo = scrollTo;
    this.destroy = destroy;

}

module.exports = SimpleScroller;
