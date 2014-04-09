/*global exports*/

function emptyElement(targetEl) {
    "use strict";
    while (targetEl.firstChild) {
        targetEl.removeChild(targetEl.firstChild);
    }
}

function createElement(nodeName, content, classes) {
    "use strict";
    var el = document.createElement(nodeName);
    el.innerHTML = content;
    el.setAttribute("class", classes);
    return el;
}

function wrapElement(targetEl, wrapEl) {
    "use strict";
    var parentEl = targetEl.parentNode;
    wrapEl.appendChild(targetEl);
    parentEl.appendChild(wrapEl);
}

function unwrapElement(targetEl) {
    "use strict";
    var wrappingEl = targetEl.parentNode,
        wrappingElParent = wrappingEl.parentNode;
    while (wrappingEl.childNodes.length > 0) {
        wrappingElParent.appendChild(wrappingEl.childNodes[0]);
    }
    wrappingElParent.removeChild(wrappingEl);
}

function hasClass(el, c) {
    "use strict";
    return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1;
}

function addClass(el, c) {
    "use strict";
    if (!hasClass(el, c)) {
        el.className = el.className + " " + c;
    }
}

function removeClass(el, c) {
    "use strict";
    if (hasClass(el, c)) {
        var reg = new RegExp('(\\s|^)' + c + '(\\s|$)');
        el.className = el.className.replace(reg,' ');
    }
}

function createItemsList(containerEl) {
    "use strict";
    var itemsList = createElement("ol", "", "o-gallery__items");
    containerEl.appendChild(itemsList);
    return itemsList;
}

function createItems(containerEl, items) {
    "use strict";
    var itemClass;
    for (var c = 0, l = items.length; c < l; c++) {
        itemClass = "o-gallery__item" + ((items[c].selected) ? " o-gallery__item--selected" : "" );
        containerEl.appendChild(createElement("li", "&nbsp;", itemClass));
    }
    return containerEl.querySelectorAll(".o-gallery__item");
}

function insertItemContent(config, item, itemEl) {
    "use strict";
    emptyElement(itemEl);
    var contentEl = createElement("div", item.content, "o-gallery__item__content");
    itemEl.appendChild(contentEl);
    if (config.captions) {
        var captionEl = createElement("div", item.caption || "", "o-gallery__item__caption");
        itemEl.appendChild(captionEl);
    }
}

function setPropertyIfAttributeExists(obj, propName, el, attrName) {
    "use strict";
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
    "use strict";
    var obj = {},
        prop;
    for (prop in map) {
        if (map.hasOwnProperty(prop)) {
            setPropertyIfAttributeExists(obj, prop, el, map[prop]);
        }
    }
    return obj;
}

function arrayIndexOf(a, v) {
    "use strict";
    var i = -1;
    if (Array.prototype.indexOf) {
        return a.indexOf(v);
    } else {
        for (var c = 0, l = a.length; c < l; c++) {
            if (a[c] === v) {
                i = c;
            }
        }
    }
    return i;
}

function setAttributesFromProperties(el, obj, map, excl) {
    "use strict";
    var exclude = excl || [];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop) && arrayIndexOf(exclude, prop) < 0) {
            el.setAttribute(map[prop], obj[prop]);
        }
    }
}

function getClosest(el, c) {
    "use strict";
    while (!hasClass(el, c) && el.parentNode) {
        el = el.parentNode;
    }
    return el;
}

function getElementIndex(el) {
    "use strict";
    var i = 0;
    while (el = el.previousSibling) {
        if (el.nodeType === 1) {
            ++i;
        }
    }
    return i;
}

exports.emptyElement = emptyElement;
exports.createElement = createElement;
exports.wrapElement = wrapElement;
exports.unwrapElement = unwrapElement;
exports.hasClass = hasClass;
exports.addClass = addClass;
exports.removeClass = removeClass;
exports.createItemsList = createItemsList;
exports.createItems = createItems;
exports.insertItemContent = insertItemContent;
exports.setAttributesFromProperties = setAttributesFromProperties;
exports.getPropertiesFromAttributes = getPropertiesFromAttributes;
exports.getClosest = getClosest;
exports.getElementIndex = getElementIndex;