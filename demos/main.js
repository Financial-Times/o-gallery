require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"hjDe2K":[function(require,module,exports){
/*global require, module*/
module.exports = require('./src/js/Gallery');
},{"./src/js/Gallery":3}],"o-gallery":[function(require,module,exports){
module.exports=require('hjDe2K');
},{}],3:[function(require,module,exports){
/*global require, module*/

var galleryDOM = require('./galleryDOM');

function Gallery(containerEl, config) {
    "use strict";

    var viewportEl,
        allItemsEl,
        itemEls,
        transitionDuration = 300,
        selectedItemIndex,
        shownItemIndex,
        debounceOnResize,
        prevControlDiv,
        nextControlDiv,
        propertyAttributeMap = {
            component: "data-o-component",
            version: "data-o-version",
            syncID: "data-o-gallery-syncid",
            multipleItemsPerPage: "data-o-gallery-multipleitemsperpage",
            touch: "data-o-gallery-touch",
            captions: "data-o-gallery-captions",
            captionMinHeight: "data-o-gallery-captionminheight",
            captionMaxHeight: "data-o-gallery-captionmaxheight"
        },
        defaultConfig = {
            component: "o-gallery",
            version: "0.0.0",
            multipleItemsPerPage: false,
            captions: true,
            captionMinHeight: 24,
            captionMaxHeight: 52,
            touch: false,
            syncID: "o-gallery-" + new Date().getTime()
        };

    function isDataSource() {
        return (config.items && config.items.length > 0);
    }

    function setWidths() {
        var i,
            l,
            totalWidth = 0,
            itemWidth = containerEl.clientWidth;
        if (config.multipleItemsPerPage) {
            itemWidth = parseInt(itemEls[selectedItemIndex].clientWidth, 10);
        }
        for (i = 0, l = itemEls.length; i < l; i++) {
            itemEls[i].style.width = itemWidth + "px";
            totalWidth += itemWidth;
        }
        allItemsEl.style.width = totalWidth + "px";
    }

    function isValidItem(n) {
        return (typeof n === "number" && n > -1 && n < itemEls.length);
    }

    function getSelectedItem() {
        var selectedItem = 0, c, l;
        for (c = 0, l = itemEls.length; c < l; c++) {
            if (galleryDOM.hasClass(itemEls[c], "o-gallery__item--selected")) {
                selectedItem = c;
                break;
            }
        }
        return selectedItem;
    }

    function addUiControls() {
        prevControlDiv = galleryDOM.createElement("div", "PREV", "o-gallery__control o-gallery__control--prev");
        nextControlDiv = galleryDOM.createElement("div", "NEXT", "o-gallery__control o-gallery__control--next");
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);
        prevControlDiv.addEventListener("click", prev);
        nextControlDiv.addEventListener("click", next);

        if (config.multipleItemsPerPage) {
            viewportEl.addEventListener("click", function (evt) {
                var clickedItemNum = galleryDOM.getElementIndex(galleryDOM.getClosest(evt.srcElement, "o-gallery__item"));
                selectItem(clickedItemNum, true, "user");
            });
        }
    }

    function setCaptionSizes() {
        for (var c = 0, l = itemEls.length; c < l; c++) {
            var itemEl = itemEls[c];
            itemEl.style.paddingBottom = config.captionMinHeight + "px";
            var captionEl = itemEl.querySelector(".o-gallery__item__caption");
            if (captionEl) {
                captionEl.style.minHeight = config.captionMinHeight + "px";
                captionEl.style.maxHeight = config.captionMaxHeight + "px";
            }
        }
    }

    function insertItemContent(n) {
        var itemNums = (n instanceof Array) ? n : [n];
        if (config.items) {
            for (var c = 0, l = itemNums.length; c < l; c++) {
                var itemNum = itemNums[c];
                if (isValidItem(itemNum) && !config.items[itemNum].inserted) {
                    galleryDOM.insertItemContent(config, config.items[itemNum], itemEls[itemNum]);
                    config.items[itemNum].inserted = true;
                    setCaptionSizes();
                }
            }
        }
    }

    function isWholeItemInPageView(itemNum, l, r) {
        return itemEls[itemNum].offsetLeft >= l && itemEls[itemNum].offsetLeft + itemEls[itemNum].clientWidth <= r;
    }

    function isAnyPartOfItemInPageView(itemNum, l, r) {
        return (itemEls[itemNum].offsetLeft >= l - itemEls[itemNum].clientWidth && itemEls[itemNum].offsetLeft <= r);
    }

    function getItemsInPageView(l, r, whole) {
        var itemsInView = [],
            onlyWhole = (typeof whole !== "boolean") ? true : whole;
        for (var c = 0; c < itemEls.length; c++) {
            if ((onlyWhole && isWholeItemInPageView(c, l, r)) || (!onlyWhole && isAnyPartOfItemInPageView(c, l, r))) {
                itemsInView.push(c);
            }
        }
        return itemsInView;
    }

    function transitionTo(newScrollLeft) {
        var start = viewportEl.scrollLeft,
            change = newScrollLeft - start,
            currentTime = 0,
            increment = 20,
            timeout;
        // t = current time, b = start value, c = change in value, d = duration
        function easeInOutQuad(t, b, c, d) {
            t /= d/2;
            if (t < 1) { return c/2*t*t + b; }
            t--;
            return -c/2 * (t*(t-2) - 1) + b;
        }
        function animateScroll() {
            currentTime += increment;
            viewportEl.scrollLeft = easeInOutQuad(currentTime, start, change, transitionDuration);
            if (currentTime < transitionDuration) {
                clearTimeout(timeout);
                timeout = setTimeout(animateScroll, increment);
            }
        }
        animateScroll();
    }

    function onGalleryCustomEvent(evt) {
        if (evt.srcElement !== containerEl && evt.detail.syncID === config.syncID && evt.detail.source === "user") {
            selectItem(evt.detail.itemID, true);
        }
    }

    function listenForSyncEvents() {
        document.addEventListener("oGalleryItemSelected", onGalleryCustomEvent);
    }

    function triggerEvent(name, data) {
        data = data || {};
        data.syncID = config.syncID;
        var event = new CustomEvent(name, {
            bubbles: true,
            cancelable: false,
            detail: data
        });
        containerEl.dispatchEvent(event);
    }

    function moveViewport(left, transition) {
        if (transition !== false) {
            transitionTo(left);
        } else {
            viewportEl.scrollLeft = left;
        }
        insertItemContent(getItemsInPageView(left, left + viewportEl.clientWidth, false));
    }

    function alignItemLeft(n, transition) {
        moveViewport(itemEls[n].offsetLeft, transition);
    }

    function alignItemRight(n, transition) {
        var newScrollLeft = itemEls[n].offsetLeft - (viewportEl.clientWidth - itemEls[n].clientWidth);
        moveViewport(newScrollLeft, transition);
    }

    function bringItemIntoView(n, transition) {
        if (!isValidItem(n)) {
            return;
        }
        var viewportL = viewportEl.scrollLeft,
            viewportR = viewportL + viewportEl.clientWidth,
            itemL = itemEls[n].offsetLeft,
            itemR = itemL + itemEls[n].clientWidth;
        if (itemL > viewportL && itemR < viewportR) {
            return;
        }
        if (itemL < viewportL) {
            alignItemLeft(n, transition);
        } else if (itemR > viewportR) {
            alignItemRight(n, transition);
        }
    }

    function showItem(n, transition) {
        if (isValidItem(n)) {
            bringItemIntoView(n, transition);
            shownItemIndex = n;
        }
    }

    function showPrevItem() {
        var prev = (shownItemIndex - 1 >= 0) ? shownItemIndex - 1 : itemEls.length - 1;
        showItem(prev);
    }

    function showNextItem() {
        var next = (shownItemIndex + 1 < itemEls.length) ? shownItemIndex + 1 : 0;
        showItem(next);
    }

    function showPrevPage() {
        if (viewportEl.scrollLeft === 0) {
            showItem(itemEls.length - 1);
        } else {
            var prevPageWholeItems = getItemsInPageView(viewportEl.scrollLeft - viewportEl.clientWidth, viewportEl.scrollLeft),
                prevPageItem = prevPageWholeItems.pop() || 0;
            alignItemRight(prevPageItem);
        }
    }

    function showNextPage() {
        if (viewportEl.scrollLeft === allItemsEl.clientWidth - viewportEl.clientWidth) {
            showItem(0);
        } else {
            var currentWholeItemsInView = getItemsInPageView(viewportEl.scrollLeft, viewportEl.scrollLeft + viewportEl.clientWidth),
                lastWholeItemInView = currentWholeItemsInView.pop() || itemEls.length - 1;
            alignItemLeft(lastWholeItemInView + 1);
        }
    }

    function selectItem(n, show, source) {
        if (!source) {
            source = "api";
        }
        if (isValidItem(n)) {
            if (show) {
                showItem(n);
            }
            if (n !== selectedItemIndex) {
                selectedItemIndex = n;
                for (var c = 0, l = itemEls.length; c < l; c++) {
                    if (c === selectedItemIndex) {
                        galleryDOM.addClass(itemEls[c], "o-gallery__item--selected");
                    } else {
                        galleryDOM.removeClass(itemEls[c], "o-gallery__item--selected");
                    }
                }
                triggerEvent("oGalleryItemSelected", {
                    itemID: selectedItemIndex,
                    source: source
                });
            }
        }
    }

    function selectPrevItem(show, source) {
        var prev = (selectedItemIndex - 1 >= 0) ? selectedItemIndex - 1 : itemEls.length - 1;
        selectItem(prev, show, source);
    }

    function selectNextItem(show, source) {
        var next = (selectedItemIndex + 1 < itemEls.length) ? selectedItemIndex + 1 : 0;
        selectItem(next, show, source);
    }

    function prev() {
        if (config.multipleItemsPerPage) {
            showPrevPage();
        } else {
            selectPrevItem(true, "user");
        }
    }

    function next() {
        if (config.multipleItemsPerPage) {
            showNextPage();
        } else {
            selectNextItem(true, "user");
        }
    }

    function onResize() {
        setWidths();
        if (!config.multipleItemsPerPage) { // correct the alignment of item in view
            showItem(shownItemIndex, false);
        } else {
            var newScrollLeft = viewportEl.scrollLeft;
            insertItemContent(getItemsInPageView(newScrollLeft, newScrollLeft + viewportEl.clientWidth, false));
        }
    }

    function resizeHandler() {
        clearTimeout(debounceOnResize);
        debounceOnResize = setTimeout(onResize, 500);
    }

    function extendObjects(objs) {
        var newObj = {};
        for (var c = 0, l = objs.length; c < l; c++) {
            var obj = objs[c];
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    newObj[prop] = obj[prop];
                }
            }
        }
        return newObj;
    }

    function updateDataAttributes() {
        galleryDOM.setAttributesFromProperties(containerEl, config, propertyAttributeMap, ["items"]);
    }

    function setSyncID(id) {
        config.syncID = id;
        updateDataAttributes();
    }

    function getSyncID() {
        return config.syncID;
    }

    function syncWith(galleryInstance) {
        setSyncID(galleryInstance.getSyncID());
    }

    function destroy() {
        prevControlDiv.parentNode.removeChild(prevControlDiv);
        nextControlDiv.parentNode.removeChild(nextControlDiv);
        galleryDOM.unwrapElement(allItemsEl);
        for (var prop in propertyAttributeMap) {
            if (propertyAttributeMap.hasOwnProperty(prop)) {
                containerEl.removeAttribute(propertyAttributeMap[prop]);
            }
        }
        document.removeEventListener("oGalleryItemSelected", onGalleryCustomEvent);
        window.removeEventListener("resize", resizeHandler);
    }

    if (isDataSource()) {
        galleryDOM.emptyElement(containerEl);
        galleryDOM.addClass(containerEl, "o-gallery");
        allItemsEl = galleryDOM.createItemsList(containerEl);
        itemEls = galleryDOM.createItems(allItemsEl, config.items);
    }
    config = extendObjects([defaultConfig, galleryDOM.getPropertiesFromAttributes(containerEl, propertyAttributeMap), config]);
    updateDataAttributes();
    allItemsEl = containerEl.querySelector(".o-gallery__items");
    viewportEl = galleryDOM.createElement("div", "", "o-gallery__viewport");
    galleryDOM.wrapElement(allItemsEl, viewportEl);
    itemEls = containerEl.querySelectorAll(".o-gallery__item");
    selectedItemIndex = getSelectedItem();
    shownItemIndex = selectedItemIndex;
    window.addEventListener("resize", resizeHandler);
    insertItemContent(selectedItemIndex);
    setWidths();
    setCaptionSizes();
    showItem(selectedItemIndex, false);
    addUiControls();
    listenForSyncEvents();

    this.showItem = showItem;
    this.getSelectedItem = getSelectedItem;
    this.showPrevItem = showPrevItem;
    this.showNextItem = showNextItem;
    this.showPrevPage = showPrevPage;
    this.showNextPage = showNextPage;
    this.selectItem = selectItem;
    this.selectPrevItem = selectPrevItem;
    this.selectNextItem = selectNextItem;
    this.next = next;
    this.prev = prev;
    this.getSyncID = getSyncID;
    this.syncWith = syncWith;
    this.destroy = destroy;

    triggerEvent("oGalleryReady", {
        gallery: this
    });

}

Gallery.createAllIn = function(el, config) {
    "use strict";
    var conf = config || {},
        gEls = el.querySelectorAll("[data-o-component=o-gallery]"),
        galleries = [];
    for (var c = 0, l = gEls.length; c < l; c++) {
        galleries.push(new Gallery(gEls[c], conf));
    }
    return galleries;
};

module.exports = Gallery;
},{"./galleryDOM":4}],4:[function(require,module,exports){
/*global module*/

"use strict";

function emptyElement(targetEl) {
    while (targetEl.firstChild) {
        targetEl.removeChild(targetEl.firstChild);
    }
}

function wrapElement(targetEl, wrapEl) {
    var parentEl = targetEl.parentNode;
    wrapEl.appendChild(targetEl);
    parentEl.appendChild(wrapEl);
}

function unwrapElement(targetEl) {
    var wrappingEl = targetEl.parentNode,
        wrappingElParent = wrappingEl.parentNode;
    while (wrappingEl.childNodes.length > 0) {
        wrappingElParent.appendChild(wrappingEl.childNodes[0]);
    }
    wrappingElParent.removeChild(wrappingEl);
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
    wrapElement: wrapElement,
    unwrapElement: unwrapElement,
    setAttributesFromProperties: setAttributesFromProperties,
    getPropertiesFromAttributes: getPropertiesFromAttributes,
    getClosest: getClosest,
    getElementIndex: getElementIndex
};
},{}]},{},["hjDe2K"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlET00uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOzs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvanMvR2FsbGVyeScpOyIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5cbnZhciBnYWxsZXJ5RE9NID0gcmVxdWlyZSgnLi9nYWxsZXJ5RE9NJyk7XG5cbmZ1bmN0aW9uIEdhbGxlcnkoY29udGFpbmVyRWwsIGNvbmZpZykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHZpZXdwb3J0RWwsXG4gICAgICAgIGFsbEl0ZW1zRWwsXG4gICAgICAgIGl0ZW1FbHMsXG4gICAgICAgIHRyYW5zaXRpb25EdXJhdGlvbiA9IDMwMCxcbiAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXgsXG4gICAgICAgIHNob3duSXRlbUluZGV4LFxuICAgICAgICBkZWJvdW5jZU9uUmVzaXplLFxuICAgICAgICBwcmV2Q29udHJvbERpdixcbiAgICAgICAgbmV4dENvbnRyb2xEaXYsXG4gICAgICAgIHByb3BlcnR5QXR0cmlidXRlTWFwID0ge1xuICAgICAgICAgICAgY29tcG9uZW50OiBcImRhdGEtby1jb21wb25lbnRcIixcbiAgICAgICAgICAgIHZlcnNpb246IFwiZGF0YS1vLXZlcnNpb25cIixcbiAgICAgICAgICAgIHN5bmNJRDogXCJkYXRhLW8tZ2FsbGVyeS1zeW5jaWRcIixcbiAgICAgICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlOiBcImRhdGEtby1nYWxsZXJ5LW11bHRpcGxlaXRlbXNwZXJwYWdlXCIsXG4gICAgICAgICAgICB0b3VjaDogXCJkYXRhLW8tZ2FsbGVyeS10b3VjaFwiLFxuICAgICAgICAgICAgY2FwdGlvbnM6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbnNcIixcbiAgICAgICAgICAgIGNhcHRpb25NaW5IZWlnaHQ6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1pbmhlaWdodFwiLFxuICAgICAgICAgICAgY2FwdGlvbk1heEhlaWdodDogXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdENvbmZpZyA9IHtcbiAgICAgICAgICAgIGNvbXBvbmVudDogXCJvLWdhbGxlcnlcIixcbiAgICAgICAgICAgIHZlcnNpb246IFwiMC4wLjBcIixcbiAgICAgICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlOiBmYWxzZSxcbiAgICAgICAgICAgIGNhcHRpb25zOiB0cnVlLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogMjQsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiA1MixcbiAgICAgICAgICAgIHRvdWNoOiBmYWxzZSxcbiAgICAgICAgICAgIHN5bmNJRDogXCJvLWdhbGxlcnktXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNEYXRhU291cmNlKCkge1xuICAgICAgICByZXR1cm4gKGNvbmZpZy5pdGVtcyAmJiBjb25maWcuaXRlbXMubGVuZ3RoID4gMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0V2lkdGhzKCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIGwsXG4gICAgICAgICAgICB0b3RhbFdpZHRoID0gMCxcbiAgICAgICAgICAgIGl0ZW1XaWR0aCA9IGNvbnRhaW5lckVsLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBpdGVtV2lkdGggPSBwYXJzZUludChpdGVtRWxzW3NlbGVjdGVkSXRlbUluZGV4XS5jbGllbnRXaWR0aCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaXRlbUVsc1tpXS5zdHlsZS53aWR0aCA9IGl0ZW1XaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggKz0gaXRlbVdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGFsbEl0ZW1zRWwuc3R5bGUud2lkdGggPSB0b3RhbFdpZHRoICsgXCJweFwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWRJdGVtKG4pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgbiA9PT0gXCJudW1iZXJcIiAmJiBuID4gLTEgJiYgbiA8IGl0ZW1FbHMubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZEl0ZW0oKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSAwLCBjLCBsO1xuICAgICAgICBmb3IgKGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGlmIChnYWxsZXJ5RE9NLmhhc0NsYXNzKGl0ZW1FbHNbY10sIFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKSkge1xuICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9IGM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkSXRlbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRVaUNvbnRyb2xzKCkge1xuICAgICAgICBwcmV2Q29udHJvbERpdiA9IGdhbGxlcnlET00uY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIlBSRVZcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1wcmV2XCIpO1xuICAgICAgICBuZXh0Q29udHJvbERpdiA9IGdhbGxlcnlET00uY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIk5FWFRcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1uZXh0XCIpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHByZXYpO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgbmV4dCk7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgdmlld3BvcnRFbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgICAgIHZhciBjbGlja2VkSXRlbU51bSA9IGdhbGxlcnlET00uZ2V0RWxlbWVudEluZGV4KGdhbGxlcnlET00uZ2V0Q2xvc2VzdChldnQuc3JjRWxlbWVudCwgXCJvLWdhbGxlcnlfX2l0ZW1cIikpO1xuICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oY2xpY2tlZEl0ZW1OdW0sIHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0Q2FwdGlvblNpemVzKCkge1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbUVsID0gaXRlbUVsc1tjXTtcbiAgICAgICAgICAgIGl0ZW1FbC5zdHlsZS5wYWRkaW5nQm90dG9tID0gY29uZmlnLmNhcHRpb25NaW5IZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB2YXIgY2FwdGlvbkVsID0gaXRlbUVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtX19jYXB0aW9uXCIpO1xuICAgICAgICAgICAgaWYgKGNhcHRpb25FbCkge1xuICAgICAgICAgICAgICAgIGNhcHRpb25FbC5zdHlsZS5taW5IZWlnaHQgPSBjb25maWcuY2FwdGlvbk1pbkhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgICAgICBjYXB0aW9uRWwuc3R5bGUubWF4SGVpZ2h0ID0gY29uZmlnLmNhcHRpb25NYXhIZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChuKSB7XG4gICAgICAgIHZhciBpdGVtTnVtcyA9IChuIGluc3RhbmNlb2YgQXJyYXkpID8gbiA6IFtuXTtcbiAgICAgICAgaWYgKGNvbmZpZy5pdGVtcykge1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtTnVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbU51bSA9IGl0ZW1OdW1zW2NdO1xuICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSXRlbShpdGVtTnVtKSAmJiAhY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBjb25maWcuaXRlbXNbaXRlbU51bV0sIGl0ZW1FbHNbaXRlbU51bV0pO1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzZXRDYXB0aW9uU2l6ZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1dob2xlSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ICsgaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCA8PSByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gKGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsIC0gaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPD0gcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SXRlbXNJblBhZ2VWaWV3KGwsIHIsIHdob2xlKSB7XG4gICAgICAgIHZhciBpdGVtc0luVmlldyA9IFtdLFxuICAgICAgICAgICAgb25seVdob2xlID0gKHR5cGVvZiB3aG9sZSAhPT0gXCJib29sZWFuXCIpID8gdHJ1ZSA6IHdob2xlO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGl0ZW1FbHMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGlmICgob25seVdob2xlICYmIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkgfHwgKCFvbmx5V2hvbGUgJiYgaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtc0luVmlldy5wdXNoKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpdGVtc0luVmlldztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc2l0aW9uVG8obmV3U2Nyb2xsTGVmdCkge1xuICAgICAgICB2YXIgc3RhcnQgPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQsXG4gICAgICAgICAgICBjaGFuZ2UgPSBuZXdTY3JvbGxMZWZ0IC0gc3RhcnQsXG4gICAgICAgICAgICBjdXJyZW50VGltZSA9IDAsXG4gICAgICAgICAgICBpbmNyZW1lbnQgPSAyMCxcbiAgICAgICAgICAgIHRpbWVvdXQ7XG4gICAgICAgIC8vIHQgPSBjdXJyZW50IHRpbWUsIGIgPSBzdGFydCB2YWx1ZSwgYyA9IGNoYW5nZSBpbiB2YWx1ZSwgZCA9IGR1cmF0aW9uXG4gICAgICAgIGZ1bmN0aW9uIGVhc2VJbk91dFF1YWQodCwgYiwgYywgZCkge1xuICAgICAgICAgICAgdCAvPSBkLzI7XG4gICAgICAgICAgICBpZiAodCA8IDEpIHsgcmV0dXJuIGMvMip0KnQgKyBiOyB9XG4gICAgICAgICAgICB0LS07XG4gICAgICAgICAgICByZXR1cm4gLWMvMiAqICh0Kih0LTIpIC0gMSkgKyBiO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGFuaW1hdGVTY3JvbGwoKSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZSArPSBpbmNyZW1lbnQ7XG4gICAgICAgICAgICB2aWV3cG9ydEVsLnNjcm9sbExlZnQgPSBlYXNlSW5PdXRRdWFkKGN1cnJlbnRUaW1lLCBzdGFydCwgY2hhbmdlLCB0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDwgdHJhbnNpdGlvbkR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGFuaW1hdGVTY3JvbGwsIGluY3JlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYW5pbWF0ZVNjcm9sbCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uR2FsbGVyeUN1c3RvbUV2ZW50KGV2dCkge1xuICAgICAgICBpZiAoZXZ0LnNyY0VsZW1lbnQgIT09IGNvbnRhaW5lckVsICYmIGV2dC5kZXRhaWwuc3luY0lEID09PSBjb25maWcuc3luY0lEICYmIGV2dC5kZXRhaWwuc291cmNlID09PSBcInVzZXJcIikge1xuICAgICAgICAgICAgc2VsZWN0SXRlbShldnQuZGV0YWlsLml0ZW1JRCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5Gb3JTeW5jRXZlbnRzKCkge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwgb25HYWxsZXJ5Q3VzdG9tRXZlbnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyaWdnZXJFdmVudChuYW1lLCBkYXRhKSB7XG4gICAgICAgIGRhdGEgPSBkYXRhIHx8IHt9O1xuICAgICAgICBkYXRhLnN5bmNJRCA9IGNvbmZpZy5zeW5jSUQ7XG4gICAgICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudChuYW1lLCB7XG4gICAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgICAgY2FuY2VsYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBkZXRhaWw6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRhaW5lckVsLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdmVWaWV3cG9ydChsZWZ0LCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdHJhbnNpdGlvblRvKGxlZnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gbGVmdDtcbiAgICAgICAgfVxuICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcobGVmdCwgbGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxpZ25JdGVtTGVmdChuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIG1vdmVWaWV3cG9ydChpdGVtRWxzW25dLm9mZnNldExlZnQsIHRyYW5zaXRpb24pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFsaWduSXRlbVJpZ2h0KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgdmFyIG5ld1Njcm9sbExlZnQgPSBpdGVtRWxzW25dLm9mZnNldExlZnQgLSAodmlld3BvcnRFbC5jbGllbnRXaWR0aCAtIGl0ZW1FbHNbbl0uY2xpZW50V2lkdGgpO1xuICAgICAgICBtb3ZlVmlld3BvcnQobmV3U2Nyb2xsTGVmdCwgdHJhbnNpdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnJpbmdJdGVtSW50b1ZpZXcobiwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAoIWlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZpZXdwb3J0TCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIHZpZXdwb3J0UiA9IHZpZXdwb3J0TCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICBpdGVtTCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCxcbiAgICAgICAgICAgIGl0ZW1SID0gaXRlbUwgKyBpdGVtRWxzW25dLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoaXRlbUwgPiB2aWV3cG9ydEwgJiYgaXRlbVIgPCB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXRlbUwgPCB2aWV3cG9ydEwpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobiwgdHJhbnNpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbVIgPiB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbVJpZ2h0KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0l0ZW0obiwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGJyaW5nSXRlbUludG9WaWV3KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICAgICAgc2hvd25JdGVtSW5kZXggPSBuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZJdGVtKCkge1xuICAgICAgICB2YXIgcHJldiA9IChzaG93bkl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzaG93bkl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNob3dJdGVtKHByZXYpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0SXRlbSgpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2hvd25JdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2hvd25JdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2hvd0l0ZW0obmV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZQYWdlKCkge1xuICAgICAgICBpZiAodmlld3BvcnRFbC5zY3JvbGxMZWZ0ID09PSAwKSB7XG4gICAgICAgICAgICBzaG93SXRlbShpdGVtRWxzLmxlbmd0aCAtIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByZXZQYWdlV2hvbGVJdGVtcyA9IGdldEl0ZW1zSW5QYWdlVmlldyh2aWV3cG9ydEVsLnNjcm9sbExlZnQgLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCB2aWV3cG9ydEVsLnNjcm9sbExlZnQpLFxuICAgICAgICAgICAgICAgIHByZXZQYWdlSXRlbSA9IHByZXZQYWdlV2hvbGVJdGVtcy5wb3AoKSB8fCAwO1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQocHJldlBhZ2VJdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0UGFnZSgpIHtcbiAgICAgICAgaWYgKHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9PT0gYWxsSXRlbXNFbC5jbGllbnRXaWR0aCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpIHtcbiAgICAgICAgICAgIHNob3dJdGVtKDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3ID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCwgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCksXG4gICAgICAgICAgICAgICAgbGFzdFdob2xlSXRlbUluVmlldyA9IGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3LnBvcCgpIHx8IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobGFzdFdob2xlSXRlbUluVmlldyArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0SXRlbShuLCBzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IFwiYXBpXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgICAgIHNob3dJdGVtKG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG4gIT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBuO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGl0ZW1FbHNbY10sIFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00ucmVtb3ZlQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUlEOiBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdFByZXZJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgcHJldiA9IChzZWxlY3RlZEl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzZWxlY3RlZEl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNlbGVjdEl0ZW0ocHJldiwgc2hvdywgc291cmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3ROZXh0SXRlbShzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2VsZWN0SXRlbShuZXh0LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dQcmV2UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0UHJldkl0ZW0odHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd05leHRQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3ROZXh0SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7IC8vIGNvcnJlY3QgdGhlIGFsaWdubWVudCBvZiBpdGVtIGluIHZpZXdcbiAgICAgICAgICAgIHNob3dJdGVtKHNob3duSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhuZXdTY3JvbGxMZWZ0LCBuZXdTY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUhhbmRsZXIoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWJvdW5jZU9uUmVzaXplKTtcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSA9IHNldFRpbWVvdXQob25SZXNpemUsIDUwMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kT2JqZWN0cyhvYmpzKSB7XG4gICAgICAgIHZhciBuZXdPYmogPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBvYmpzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG9ianNbY107XG4gICAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3T2JqW3Byb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3T2JqO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCkge1xuICAgICAgICBnYWxsZXJ5RE9NLnNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyhjb250YWluZXJFbCwgY29uZmlnLCBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCwgW1wiaXRlbXNcIl0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFN5bmNJRChpZCkge1xuICAgICAgICBjb25maWcuc3luY0lEID0gaWQ7XG4gICAgICAgIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3luY0lEKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLnN5bmNJRDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzeW5jV2l0aChnYWxsZXJ5SW5zdGFuY2UpIHtcbiAgICAgICAgc2V0U3luY0lEKGdhbGxlcnlJbnN0YW5jZS5nZXRTeW5jSUQoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIG5leHRDb250cm9sRGl2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuICAgICAgICBnYWxsZXJ5RE9NLnVud3JhcEVsZW1lbnQoYWxsSXRlbXNFbCk7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gcHJvcGVydHlBdHRyaWJ1dGVNYXApIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eUF0dHJpYnV0ZU1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lckVsLnJlbW92ZUF0dHJpYnV0ZShwcm9wZXJ0eUF0dHJpYnV0ZU1hcFtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKGlzRGF0YVNvdXJjZSgpKSB7XG4gICAgICAgIGdhbGxlcnlET00uZW1wdHlFbGVtZW50KGNvbnRhaW5lckVsKTtcbiAgICAgICAgZ2FsbGVyeURPTS5hZGRDbGFzcyhjb250YWluZXJFbCwgXCJvLWdhbGxlcnlcIik7XG4gICAgICAgIGFsbEl0ZW1zRWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCk7XG4gICAgICAgIGl0ZW1FbHMgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zKGFsbEl0ZW1zRWwsIGNvbmZpZy5pdGVtcyk7XG4gICAgfVxuICAgIGNvbmZpZyA9IGV4dGVuZE9iamVjdHMoW2RlZmF1bHRDb25maWcsIGdhbGxlcnlET00uZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzKGNvbnRhaW5lckVsLCBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCksIGNvbmZpZ10pO1xuICAgIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCk7XG4gICAgYWxsSXRlbXNFbCA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICB2aWV3cG9ydEVsID0gZ2FsbGVyeURPTS5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiXCIsIFwiby1nYWxsZXJ5X192aWV3cG9ydFwiKTtcbiAgICBnYWxsZXJ5RE9NLndyYXBFbGVtZW50KGFsbEl0ZW1zRWwsIHZpZXdwb3J0RWwpO1xuICAgIGl0ZW1FbHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbiAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgIHNob3duSXRlbUluZGV4ID0gc2VsZWN0ZWRJdGVtSW5kZXg7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQoc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgIHNldFdpZHRocygpO1xuICAgIHNldENhcHRpb25TaXplcygpO1xuICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgYWRkVWlDb250cm9scygpO1xuICAgIGxpc3RlbkZvclN5bmNFdmVudHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuICAgIHRoaXMuZ2V0U3luY0lEID0gZ2V0U3luY0lEO1xuICAgIHRoaXMuc3luY1dpdGggPSBzeW5jV2l0aDtcbiAgICB0aGlzLmRlc3Ryb3kgPSBkZXN0cm95O1xuXG4gICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlSZWFkeVwiLCB7XG4gICAgICAgIGdhbGxlcnk6IHRoaXNcbiAgICB9KTtcblxufVxuXG5HYWxsZXJ5LmNyZWF0ZUFsbEluID0gZnVuY3Rpb24oZWwsIGNvbmZpZykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBjb25mID0gY29uZmlnIHx8IHt9LFxuICAgICAgICBnRWxzID0gZWwucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLW8tY29tcG9uZW50PW8tZ2FsbGVyeV1cIiksXG4gICAgICAgIGdhbGxlcmllcyA9IFtdO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gZ0Vscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgZ2FsbGVyaWVzLnB1c2gobmV3IEdhbGxlcnkoZ0Vsc1tjXSwgY29uZikpO1xuICAgIH1cbiAgICByZXR1cm4gZ2FsbGVyaWVzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHYWxsZXJ5OyIsIi8qZ2xvYmFsIG1vZHVsZSovXG5cblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBlbXB0eUVsZW1lbnQodGFyZ2V0RWwpIHtcbiAgICB3aGlsZSAodGFyZ2V0RWwuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YXJnZXRFbC5yZW1vdmVDaGlsZCh0YXJnZXRFbC5maXJzdENoaWxkKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHdyYXBFbGVtZW50KHRhcmdldEVsLCB3cmFwRWwpIHtcbiAgICB2YXIgcGFyZW50RWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlO1xuICAgIHdyYXBFbC5hcHBlbmRDaGlsZCh0YXJnZXRFbCk7XG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQod3JhcEVsKTtcbn1cblxuZnVuY3Rpb24gdW53cmFwRWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHZhciB3cmFwcGluZ0VsID0gdGFyZ2V0RWwucGFyZW50Tm9kZSxcbiAgICAgICAgd3JhcHBpbmdFbFBhcmVudCA9IHdyYXBwaW5nRWwucGFyZW50Tm9kZTtcbiAgICB3aGlsZSAod3JhcHBpbmdFbC5jaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgd3JhcHBpbmdFbFBhcmVudC5hcHBlbmRDaGlsZCh3cmFwcGluZ0VsLmNoaWxkTm9kZXNbMF0pO1xuICAgIH1cbiAgICB3cmFwcGluZ0VsUGFyZW50LnJlbW92ZUNoaWxkKHdyYXBwaW5nRWwpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KG5vZGVOYW1lLCBjb250ZW50LCBjbGFzc2VzKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChub2RlTmFtZSk7XG4gICAgZWwuaW5uZXJIVE1MID0gY29udGVudDtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBjbGFzc2VzKTtcbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjKSB7XG4gICAgcmV0dXJuICgnICcgKyBlbC5jbGFzc05hbWUgKyAnICcpLmluZGV4T2YoJyAnICsgYyArICcgJykgPiAtMTtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGMpIHtcbiAgICBpZiAoIWhhc0NsYXNzKGVsLCBjKSkge1xuICAgICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUgKyBcIiBcIiArIGM7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgYykge1xuICAgIGlmIChoYXNDbGFzcyhlbCwgYykpIHtcbiAgICAgICAgdmFyIHJlZyA9IG5ldyBSZWdFeHAoJyhcXFxcc3xeKScgKyBjICsgJyhcXFxcc3wkKScpO1xuICAgICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShyZWcsJyAnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCkge1xuICAgIHZhciBpdGVtc0xpc3QgPSBjcmVhdGVFbGVtZW50KFwib2xcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGl0ZW1zTGlzdCk7XG4gICAgcmV0dXJuIGl0ZW1zTGlzdDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXMoY29udGFpbmVyRWwsIGl0ZW1zKSB7XG4gICAgdmFyIGl0ZW1DbGFzcztcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBpdGVtQ2xhc3MgPSBcIm8tZ2FsbGVyeV9faXRlbVwiICsgKChpdGVtc1tjXS5zZWxlY3RlZCkgPyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIgOiBcIlwiICk7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBcIiZuYnNwO1wiLCBpdGVtQ2xhc3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChjb25maWcsIGl0ZW0sIGl0ZW1FbCkge1xuICAgIGVtcHR5RWxlbWVudChpdGVtRWwpO1xuICAgIHZhciBjb250ZW50RWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uaXRlbUNvbnRlbnQsIFwiby1nYWxsZXJ5X19pdGVtX19jb250ZW50XCIpO1xuICAgIGl0ZW1FbC5hcHBlbmRDaGlsZChjb250ZW50RWwpO1xuICAgIGlmIChjb25maWcuY2FwdGlvbnMpIHtcbiAgICAgICAgdmFyIGNhcHRpb25FbCA9IGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgaXRlbS5pdGVtQ2FwdGlvbiB8fCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbV9fY2FwdGlvblwiKTtcbiAgICAgICAgaXRlbUVsLmFwcGVuZENoaWxkKGNhcHRpb25FbCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKG9iaiwgcHJvcE5hbWUsIGVsLCBhdHRyTmFtZSkge1xuICAgIHZhciB2ID0gZWwuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICBpZiAodiAhPT0gbnVsbCkge1xuICAgICAgICBpZiAodiA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgIHYgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgPT09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgdiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIG9ialtwcm9wTmFtZV0gPSB2O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzKGVsLCBtYXApIHtcbiAgICB2YXIgb2JqID0ge30sXG4gICAgICAgIHByb3A7XG4gICAgZm9yIChwcm9wIGluIG1hcCkge1xuICAgICAgICBpZiAobWFwLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKG9iaiwgcHJvcCwgZWwsIG1hcFtwcm9wXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzKGVsLCBvYmosIG1hcCwgZXhjbCkge1xuICAgIHZhciBleGNsdWRlID0gZXhjbCB8fCBbXTtcbiAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApICYmIGV4Y2x1ZGUuaW5kZXhPZihwcm9wKSA8IDApIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShtYXBbcHJvcF0sIG9ialtwcm9wXSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldENsb3Nlc3QoZWwsIGMpIHtcbiAgICB3aGlsZSAoIWhhc0NsYXNzKGVsLCBjKSkge1xuICAgICAgICBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gZ2V0RWxlbWVudEluZGV4KGVsKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlIChlbCA9IGVsLnByZXZpb3VzU2libGluZykge1xuICAgICAgICBpZiAoZWwubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICsraTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW1wdHlFbGVtZW50OiBlbXB0eUVsZW1lbnQsXG4gICAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgICBoYXNDbGFzczogaGFzQ2xhc3MsXG4gICAgYWRkQ2xhc3M6IGFkZENsYXNzLFxuICAgIHJlbW92ZUNsYXNzOiByZW1vdmVDbGFzcyxcbiAgICBjcmVhdGVJdGVtc0xpc3Q6IGNyZWF0ZUl0ZW1zTGlzdCxcbiAgICBjcmVhdGVJdGVtczogY3JlYXRlSXRlbXMsXG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQ6IGluc2VydEl0ZW1Db250ZW50LFxuICAgIHdyYXBFbGVtZW50OiB3cmFwRWxlbWVudCxcbiAgICB1bndyYXBFbGVtZW50OiB1bndyYXBFbGVtZW50LFxuICAgIHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllczogc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzLFxuICAgIGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlczogZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzLFxuICAgIGdldENsb3Nlc3Q6IGdldENsb3Nlc3QsXG4gICAgZ2V0RWxlbWVudEluZGV4OiBnZXRFbGVtZW50SW5kZXhcbn07Il19
