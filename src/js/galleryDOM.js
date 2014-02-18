/*global module*/

"use strict";

function emptyElement(targetEl) {
    while (targetEl.firstChild) {
        targetEl.removeChild(targetEl.firstChild);
    }
}

function createViewport(targetEl) {
    var parentEl = targetEl.parentNode,
        viewportEl = document.createElement('div');
    viewportEl.setAttribute("class", "o-gallery__viewport");
    viewportEl.appendChild(targetEl);
    parentEl.appendChild(viewportEl);
    return viewportEl;
}

function createElement(nodeName, content, classes) {
    var el = document.createElement(nodeName);
    el.innerHTML = content;
    el.setAttribute("class", classes);
    return el;
}

function createItemsList(containerEl) {
    var itemsList = createElement("ol", "", "o-gallery__items");
    containerEl.appendChild(itemsList);
    return itemsList;
}

function createItems(containerEl, items) {
    var itemClass;
    for (var c = 0, l = items.length; c < l; c++) {
        itemClass = "o-gallery__item" + ((items[c].selected) ? " o-gallery__item--selected" : "" );
        containerEl.appendChild(createElement("li", "&nbsp;", itemClass));
    }
    return containerEl.querySelectorAll(".o-gallery__item");
}

function insertItemContent(item, itemEl) {
    emptyElement(itemEl);
    var contentEl = createElement("div", item.itemContent, "o-gallery__item__content");
    itemEl.appendChild(contentEl);
    if (item.itemCaption) {
        var captionEl = createElement("div", item.itemCaption, "o-gallery__item__caption");
        itemEl.appendChild(captionEl);
    }
}

function getPrevControl() {
    return createElement("div", "PREV", "o-gallery__control o-gallery__control--prev");
}
function getNextControl() {
    return createElement("div", "NEXT", "o-gallery__control o-gallery__control--next");
}

function setConfigDataAttributes(el, config) {
    el.setAttribute("data-o-component", "o-gallery");
    el.setAttribute("data-o-gallery-syncid", config.syncID);
    el.setAttribute("data-o-gallery-multipleitemsperpage", config.multipleItemsPerPage);
    el.setAttribute("data-o-gallery-touch", config.touch);
    el.setAttribute("data-o-gallery-captionminheight", config.captionMinHeight);
    el.setAttribute("data-o-gallery-captionmaxheight", config.captionMaxHeight);
}

function setPropertyIfAttributeExists(obj, propName, el, attrName) {
    var v = el.getAttribute(attrName);
    if (v !== null) {
        obj[propName] = v;
    }
}

function getConfigDataAttributes(el) {
    var config = {};
    setPropertyIfAttributeExists(config, "syncID", el, "data-o-gallery-syncid");
    setPropertyIfAttributeExists(config, "multipleItemsPerPage", el, "data-o-gallery-multipleitemsperpage");
    setPropertyIfAttributeExists(config, "touch", el, "data-o-gallery-touch");
    setPropertyIfAttributeExists(config, "captionMinHeight", el, "data-o-gallery-captionminheight");
    setPropertyIfAttributeExists(config, "captionMaxHeight", el, "data-o-gallery-captionmaxheight");
    return config;
}

module.exports = {
    emptyElement: emptyElement,
    createItemsList: createItemsList,
    createItems: createItems,
    insertItemContent: insertItemContent,
    createViewport: createViewport,
    getPrevControl: getPrevControl,
    getNextControl: getNextControl,
    setConfigDataAttributes: setConfigDataAttributes,
    getConfigDataAttributes: getConfigDataAttributes
};