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

function destroyViewport(viewportEl) {
    var parentEl = viewportEl.parentNode;
    while (viewportEl.childNodes.length > 0) {
        parentEl.appendChild(viewportEl.childNodes[0]);
    }
    parentEl.removeChild(viewportEl);
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

function insertItemContent(config, item, itemEl) {
    emptyElement(itemEl);
    var contentEl = createElement("div", item.itemContent, "o-gallery__item__content");
    itemEl.appendChild(contentEl);
    if (config.captions) {
        var captionEl = createElement("div", item.itemCaption || "", "o-gallery__item__caption");
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
    el.setAttribute("data-o-gallery-captions", config.captions);
    el.setAttribute("data-o-gallery-captionminheight", config.captionMinHeight);
    el.setAttribute("data-o-gallery-captionmaxheight", config.captionMaxHeight);
}

function getConfigDataAttributes(el) {
    var config = {};
    setPropertyIfAttributeExists(config, "syncID", el, "data-o-gallery-syncid");
    setPropertyIfAttributeExists(config, "multipleItemsPerPage", el, "data-o-gallery-multipleitemsperpage");
    setPropertyIfAttributeExists(config, "touch", el, "data-o-gallery-touch");
    setPropertyIfAttributeExists(config, "captions", el, "data-o-gallery-captions");
    setPropertyIfAttributeExists(config, "captionMinHeight", el, "data-o-gallery-captionminheight");
    setPropertyIfAttributeExists(config, "captionMaxHeight", el, "data-o-gallery-captionmaxheight");
    return config;
}

function removeConfigDataAttributes(el) {
    el.removeAttribute("data-o-component");
    el.removeAttribute("data-o-version");
    el.removeAttribute("data-o-gallery-syncid");
    el.removeAttribute("data-o-gallery-multipleitemsperpage");
    el.removeAttribute("data-o-gallery-touch");
    el.removeAttribute("data-o-gallery-captions");
    el.removeAttribute("data-o-gallery-captionminheight");
    el.removeAttribute("data-o-gallery-captionmaxheight");
}

function setPropertyIfAttributeExists(obj, propName, el, attrName) {
    var v = el.getAttribute(attrName);
    if (v !== null) {
        if (v === "true") {
            v = true;
        } else if (v === "false") {
            v = false;
        }
        obj[propName] = v;
    }
}

function getItemNumberFromElement(el) {
    var itemEl = el,
        itemNum = -1;
    while (itemEl.parentNode.className.indexOf("o-gallery__items") === -1) {
        itemEl = itemEl.parentNode;
    }
    var itemEls = itemEl.parentNode.querySelectorAll(".o-gallery__item");
    for (var c = 0, l = itemEls.length; c < l; c++) {
        if (itemEls[c] === itemEl) {
            itemNum = c;
            break;
        }
    }
    return itemNum;
}

module.exports = {
    emptyElement: emptyElement,
    createItemsList: createItemsList,
    createItems: createItems,
    insertItemContent: insertItemContent,
    createViewport: createViewport,
    destroyViewport: destroyViewport,
    getPrevControl: getPrevControl,
    getNextControl: getNextControl,
    setConfigDataAttributes: setConfigDataAttributes,
    getConfigDataAttributes: getConfigDataAttributes,
    removeConfigDataAttributes: removeConfigDataAttributes,
    getItemNumberFromElement: getItemNumberFromElement
};