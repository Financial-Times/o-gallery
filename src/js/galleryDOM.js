/*global module*/

"use strict";

function emptyElement(targetEl) {
    while (targetEl.firstChild) {
        targetEl.removeChild(targetEl.firstChild);
    }
}

function createElement(nodeName, content, classes) {
    var el = document.createElement(nodeName);
    el.innerHTML = content;
    el.setAttribute("class", classes);
    return el;
}

function hasClass(el, c) {
    return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1;
}

function addClass(el, c) {
    if (!hasClass(el, c)) {
        el.className = el.className + " " + c;
    }
}

function removeClass(el, c) {
    if (hasClass(el, c)) {
        var reg = new RegExp('(\\s|^)' + c + '(\\s|$)');
        el.className = el.className.replace(reg,' ');
    }
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

function getPropertiesFromAttributes(el, map) {
    var obj = {},
        prop;
    for (prop in map) {
        if (map.hasOwnProperty(prop)) {
            setPropertyIfAttributeExists(obj, prop, el, map[prop]);
        }
    }
    return obj;
}

function setAttributesFromProperties(el, obj, map, excl) {
    var exclude = excl || [];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop) && exclude.indexOf(prop) < 0) {
            el.setAttribute(map[prop], obj[prop]);
        }
    }
}

function getClosest(el, c) {
    while (!hasClass(el, c)) {
        el = el.parentNode;
    }
    return el;
}

function getElementIndex(el) {
    var i = 0;
    while (el = el.previousSibling) {
        if (el.nodeType === 1) {
            ++i;
        }
    }
    return i;
}

module.exports = {
    emptyElement: emptyElement,
    createElement: createElement,
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    createItemsList: createItemsList,
    createItems: createItems,
    insertItemContent: insertItemContent,
    setAttributesFromProperties: setAttributesFromProperties,
    getPropertiesFromAttributes: getPropertiesFromAttributes,
    getClosest: getClosest,
    getElementIndex: getElementIndex
};