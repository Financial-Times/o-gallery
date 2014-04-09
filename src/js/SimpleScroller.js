/* global require, module */

var dom = require('./dom');

/**
 * Mimics FTScroller in simplest possible way (without touch interface, transitions or events)
 * Intended for IE8 particularly.
 */

function SimpleScroller(containerEl, config) {
    'use strict';

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
        dom.unwrapElement(viewportEl);
    }

    allItemsEl = containerEl.querySelector('.o-gallery__items');
    viewportEl = dom.createElement('div', '', 'o-gallery__viewport');
    containerEl.appendChild(viewportEl);
    dom.wrapElement(allItemsEl, viewportEl);
    updateProperties();

    this.contentContainerNode = allItemsEl;
    this.scrollTo = scrollTo;
    this.destroy = destroy;

}

module.exports = SimpleScroller;