require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"hjDe2K":[function(require,module,exports){
/*global require, module*/
module.exports = require('./src/js/Gallery');
},{"./src/js/Gallery":3}],"o-gallery":[function(require,module,exports){
module.exports=require('hjDe2K');
},{}],3:[function(require,module,exports){
/*global require, module*/

var galleryDOM = require('./galleryDOM');

function Gallery(config) {
    "use strict";

    var containerEl = config.container,
        viewportEl,
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
        if (isValidItem(n) && n !== selectedItemIndex) {
            selectedItemIndex = n;
            for (var c = 0, l = itemEls.length; c < l; c++) {
                if (c === selectedItemIndex) {
                    galleryDOM.addClass(itemEls[c], "o-gallery__item--selected");
                } else {
                    galleryDOM.removeClass(itemEls[c], "o-gallery__item--selected");
                }
            }
            if (show) {
                showItem(selectedItemIndex);
            }
            triggerEvent("oGalleryItemSelected", {
                itemID: selectedItemIndex,
                source: source
            });
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
        galleryDOM.setAttributesFromProperties(containerEl, config, propertyAttributeMap, ["container", "items"]);
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

Gallery.createAllIn = function(el) {
    "use strict";
    var gEls = el.querySelectorAll("[data-o-component=o-gallery]"),
        galleries = [];
    for (var c = 0, l = gEls.length; c < l; c++) {
        galleries.push(new Gallery({
            container: gEls[c]
        }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlET00uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOzs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvanMvR2FsbGVyeScpOyIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5cbnZhciBnYWxsZXJ5RE9NID0gcmVxdWlyZSgnLi9nYWxsZXJ5RE9NJyk7XG5cbmZ1bmN0aW9uIEdhbGxlcnkoY29uZmlnKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgY29udGFpbmVyRWwgPSBjb25maWcuY29udGFpbmVyLFxuICAgICAgICB2aWV3cG9ydEVsLFxuICAgICAgICBhbGxJdGVtc0VsLFxuICAgICAgICBpdGVtRWxzLFxuICAgICAgICB0cmFuc2l0aW9uRHVyYXRpb24gPSAzMDAsXG4gICAgICAgIHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICBzaG93bkl0ZW1JbmRleCxcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSxcbiAgICAgICAgcHJldkNvbnRyb2xEaXYsXG4gICAgICAgIG5leHRDb250cm9sRGl2LFxuICAgICAgICBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCA9IHtcbiAgICAgICAgICAgIGNvbXBvbmVudDogXCJkYXRhLW8tY29tcG9uZW50XCIsXG4gICAgICAgICAgICB2ZXJzaW9uOiBcImRhdGEtby12ZXJzaW9uXCIsXG4gICAgICAgICAgICBzeW5jSUQ6IFwiZGF0YS1vLWdhbGxlcnktc3luY2lkXCIsXG4gICAgICAgICAgICBtdWx0aXBsZUl0ZW1zUGVyUGFnZTogXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiLFxuICAgICAgICAgICAgdG91Y2g6IFwiZGF0YS1vLWdhbGxlcnktdG91Y2hcIixcbiAgICAgICAgICAgIGNhcHRpb25zOiBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25zXCIsXG4gICAgICAgICAgICBjYXB0aW9uTWluSGVpZ2h0OiBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25taW5oZWlnaHRcIixcbiAgICAgICAgICAgIGNhcHRpb25NYXhIZWlnaHQ6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1heGhlaWdodFwiXG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRDb25maWcgPSB7XG4gICAgICAgICAgICBjb21wb25lbnQ6IFwiby1nYWxsZXJ5XCIsXG4gICAgICAgICAgICB2ZXJzaW9uOiBcIjAuMC4wXCIsXG4gICAgICAgICAgICBtdWx0aXBsZUl0ZW1zUGVyUGFnZTogZmFsc2UsXG4gICAgICAgICAgICBjYXB0aW9uczogdHJ1ZSxcbiAgICAgICAgICAgIGNhcHRpb25NaW5IZWlnaHQ6IDI0LFxuICAgICAgICAgICAgY2FwdGlvbk1heEhlaWdodDogNTIsXG4gICAgICAgICAgICB0b3VjaDogZmFsc2UsXG4gICAgICAgICAgICBzeW5jSUQ6IFwiby1nYWxsZXJ5LVwiICsgbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzRGF0YVNvdXJjZSgpIHtcbiAgICAgICAgcmV0dXJuIChjb25maWcuaXRlbXMgJiYgY29uZmlnLml0ZW1zLmxlbmd0aCA+IDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFdpZHRocygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBsLFxuICAgICAgICAgICAgdG90YWxXaWR0aCA9IDAsXG4gICAgICAgICAgICBpdGVtV2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgaXRlbVdpZHRoID0gcGFyc2VJbnQoaXRlbUVsc1tzZWxlY3RlZEl0ZW1JbmRleF0uY2xpZW50V2lkdGgsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW1FbHNbaV0uc3R5bGUud2lkdGggPSBpdGVtV2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICB0b3RhbFdpZHRoICs9IGl0ZW1XaWR0aDtcbiAgICAgICAgfVxuICAgICAgICBhbGxJdGVtc0VsLnN0eWxlLndpZHRoID0gdG90YWxXaWR0aCArIFwicHhcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkSXRlbShuKSB7XG4gICAgICAgIHJldHVybiAodHlwZW9mIG4gPT09IFwibnVtYmVyXCIgJiYgbiA+IC0xICYmIG4gPCBpdGVtRWxzLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRJdGVtKCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gMCwgYywgbDtcbiAgICAgICAgZm9yIChjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoZ2FsbGVyeURPTS5oYXNDbGFzcyhpdGVtRWxzW2NdLCBcIm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIikpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSBjO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkVWlDb250cm9scygpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJQUkVWXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tcHJldlwiKTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJORVhUXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tbmV4dFwiKTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQocHJldkNvbnRyb2xEaXYpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChuZXh0Q29udHJvbERpdik7XG4gICAgICAgIHByZXZDb250cm9sRGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwcmV2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG5leHQpO1xuXG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2xpY2tlZEl0ZW1OdW0gPSBnYWxsZXJ5RE9NLmdldEVsZW1lbnRJbmRleChnYWxsZXJ5RE9NLmdldENsb3Nlc3QoZXZ0LnNyY0VsZW1lbnQsIFwiby1nYWxsZXJ5X19pdGVtXCIpKTtcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKGNsaWNrZWRJdGVtTnVtLCB0cnVlLCBcInVzZXJcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldENhcHRpb25TaXplcygpIHtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW1FbCA9IGl0ZW1FbHNbY107XG4gICAgICAgICAgICBpdGVtRWwuc3R5bGUucGFkZGluZ0JvdHRvbSA9IGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgdmFyIGNhcHRpb25FbCA9IGl0ZW1FbC5xdWVyeVNlbGVjdG9yKFwiLm8tZ2FsbGVyeV9faXRlbV9fY2FwdGlvblwiKTtcbiAgICAgICAgICAgIGlmIChjYXB0aW9uRWwpIHtcbiAgICAgICAgICAgICAgICBjYXB0aW9uRWwuc3R5bGUubWluSGVpZ2h0ID0gY29uZmlnLmNhcHRpb25NaW5IZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICAgICAgY2FwdGlvbkVsLnN0eWxlLm1heEhlaWdodCA9IGNvbmZpZy5jYXB0aW9uTWF4SGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zZXJ0SXRlbUNvbnRlbnQobikge1xuICAgICAgICB2YXIgaXRlbU51bXMgPSAobiBpbnN0YW5jZW9mIEFycmF5KSA/IG4gOiBbbl07XG4gICAgICAgIGlmIChjb25maWcuaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbU51bXMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW1OdW0gPSBpdGVtTnVtc1tjXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZEl0ZW0oaXRlbU51bSkgJiYgIWNvbmZpZy5pdGVtc1tpdGVtTnVtXS5pbnNlcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLmluc2VydEl0ZW1Db250ZW50KGNvbmZpZywgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLCBpdGVtRWxzW2l0ZW1OdW1dKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc2V0Q2FwdGlvblNpemVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNXaG9sZUl0ZW1JblBhZ2VWaWV3KGl0ZW1OdW0sIGwsIHIpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsICYmIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCArIGl0ZW1FbHNbaXRlbU51bV0uY2xpZW50V2lkdGggPD0gcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0FueVBhcnRPZkl0ZW1JblBhZ2VWaWV3KGl0ZW1OdW0sIGwsIHIpIHtcbiAgICAgICAgcmV0dXJuIChpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPj0gbCAtIGl0ZW1FbHNbaXRlbU51bV0uY2xpZW50V2lkdGggJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0IDw9IHIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEl0ZW1zSW5QYWdlVmlldyhsLCByLCB3aG9sZSkge1xuICAgICAgICB2YXIgaXRlbXNJblZpZXcgPSBbXSxcbiAgICAgICAgICAgIG9ubHlXaG9sZSA9ICh0eXBlb2Ygd2hvbGUgIT09IFwiYm9vbGVhblwiKSA/IHRydWUgOiB3aG9sZTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBpdGVtRWxzLmxlbmd0aDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoKG9ubHlXaG9sZSAmJiBpc1dob2xlSXRlbUluUGFnZVZpZXcoYywgbCwgcikpIHx8ICghb25seVdob2xlICYmIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoYywgbCwgcikpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXNJblZpZXcucHVzaChjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXRlbXNJblZpZXc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhbnNpdGlvblRvKG5ld1Njcm9sbExlZnQpIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgY2hhbmdlID0gbmV3U2Nyb2xsTGVmdCAtIHN0YXJ0LFxuICAgICAgICAgICAgY3VycmVudFRpbWUgPSAwLFxuICAgICAgICAgICAgaW5jcmVtZW50ID0gMjAsXG4gICAgICAgICAgICB0aW1lb3V0O1xuICAgICAgICAvLyB0ID0gY3VycmVudCB0aW1lLCBiID0gc3RhcnQgdmFsdWUsIGMgPSBjaGFuZ2UgaW4gdmFsdWUsIGQgPSBkdXJhdGlvblxuICAgICAgICBmdW5jdGlvbiBlYXNlSW5PdXRRdWFkKHQsIGIsIGMsIGQpIHtcbiAgICAgICAgICAgIHQgLz0gZC8yO1xuICAgICAgICAgICAgaWYgKHQgPCAxKSB7IHJldHVybiBjLzIqdCp0ICsgYjsgfVxuICAgICAgICAgICAgdC0tO1xuICAgICAgICAgICAgcmV0dXJuIC1jLzIgKiAodCoodC0yKSAtIDEpICsgYjtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBhbmltYXRlU2Nyb2xsKCkge1xuICAgICAgICAgICAgY3VycmVudFRpbWUgKz0gaW5jcmVtZW50O1xuICAgICAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gZWFzZUluT3V0UXVhZChjdXJyZW50VGltZSwgc3RhcnQsIGNoYW5nZSwgdHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA8IHRyYW5zaXRpb25EdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChhbmltYXRlU2Nyb2xsLCBpbmNyZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFuaW1hdGVTY3JvbGwoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkdhbGxlcnlDdXN0b21FdmVudChldnQpIHtcbiAgICAgICAgaWYgKGV2dC5zcmNFbGVtZW50ICE9PSBjb250YWluZXJFbCAmJiBldnQuZGV0YWlsLnN5bmNJRCA9PT0gY29uZmlnLnN5bmNJRCAmJiBldnQuZGV0YWlsLnNvdXJjZSA9PT0gXCJ1c2VyXCIpIHtcbiAgICAgICAgICAgIHNlbGVjdEl0ZW0oZXZ0LmRldGFpbC5pdGVtSUQsIHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuRm9yU3luY0V2ZW50cygpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmlnZ2VyRXZlbnQobmFtZSwgZGF0YSkge1xuICAgICAgICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgICAgICAgZGF0YS5zeW5jSUQgPSBjb25maWcuc3luY0lEO1xuICAgICAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQobmFtZSwge1xuICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgZGV0YWlsOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBjb250YWluZXJFbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3ZlVmlld3BvcnQobGVmdCwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRyYW5zaXRpb25UbyhsZWZ0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IGxlZnQ7XG4gICAgICAgIH1cbiAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KGxlZnQsIGxlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFsaWduSXRlbUxlZnQobiwgdHJhbnNpdGlvbikge1xuICAgICAgICBtb3ZlVmlld3BvcnQoaXRlbUVsc1tuXS5vZmZzZXRMZWZ0LCB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1SaWdodChuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIHZhciBuZXdTY3JvbGxMZWZ0ID0gaXRlbUVsc1tuXS5vZmZzZXRMZWZ0IC0gKHZpZXdwb3J0RWwuY2xpZW50V2lkdGggLSBpdGVtRWxzW25dLmNsaWVudFdpZHRoKTtcbiAgICAgICAgbW92ZVZpZXdwb3J0KG5ld1Njcm9sbExlZnQsIHRyYW5zaXRpb24pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJyaW5nSXRlbUludG9WaWV3KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKCFpc1ZhbGlkSXRlbShuKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2aWV3cG9ydEwgPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQsXG4gICAgICAgICAgICB2aWV3cG9ydFIgPSB2aWV3cG9ydEwgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLFxuICAgICAgICAgICAgaXRlbUwgPSBpdGVtRWxzW25dLm9mZnNldExlZnQsXG4gICAgICAgICAgICBpdGVtUiA9IGl0ZW1MICsgaXRlbUVsc1tuXS5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKGl0ZW1MID4gdmlld3BvcnRMICYmIGl0ZW1SIDwgdmlld3BvcnRSKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0ZW1MIDwgdmlld3BvcnRMKSB7XG4gICAgICAgICAgICBhbGlnbkl0ZW1MZWZ0KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW1SID4gdmlld3BvcnRSKSB7XG4gICAgICAgICAgICBhbGlnbkl0ZW1SaWdodChuLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dJdGVtKG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBicmluZ0l0ZW1JbnRvVmlldyhuLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgICAgIHNob3duSXRlbUluZGV4ID0gbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dQcmV2SXRlbSgpIHtcbiAgICAgICAgdmFyIHByZXYgPSAoc2hvd25JdGVtSW5kZXggLSAxID49IDApID8gc2hvd25JdGVtSW5kZXggLSAxIDogaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICBzaG93SXRlbShwcmV2KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dEl0ZW0oKSB7XG4gICAgICAgIHZhciBuZXh0ID0gKHNob3duSXRlbUluZGV4ICsgMSA8IGl0ZW1FbHMubGVuZ3RoKSA/IHNob3duSXRlbUluZGV4ICsgMSA6IDA7XG4gICAgICAgIHNob3dJdGVtKG5leHQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dQcmV2UGFnZSgpIHtcbiAgICAgICAgaWYgKHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9PT0gMCkge1xuICAgICAgICAgICAgc2hvd0l0ZW0oaXRlbUVscy5sZW5ndGggLSAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmV2UGFnZVdob2xlSXRlbXMgPSBnZXRJdGVtc0luUGFnZVZpZXcodmlld3BvcnRFbC5zY3JvbGxMZWZ0IC0gdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgdmlld3BvcnRFbC5zY3JvbGxMZWZ0KSxcbiAgICAgICAgICAgICAgICBwcmV2UGFnZUl0ZW0gPSBwcmV2UGFnZVdob2xlSXRlbXMucG9wKCkgfHwgMDtcbiAgICAgICAgICAgIGFsaWduSXRlbVJpZ2h0KHByZXZQYWdlSXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dFBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzaG93SXRlbSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50V2hvbGVJdGVtc0luVmlldyA9IGdldEl0ZW1zSW5QYWdlVmlldyh2aWV3cG9ydEVsLnNjcm9sbExlZnQsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpLFxuICAgICAgICAgICAgICAgIGxhc3RXaG9sZUl0ZW1JblZpZXcgPSBjdXJyZW50V2hvbGVJdGVtc0luVmlldy5wb3AoKSB8fCBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBhbGlnbkl0ZW1MZWZ0KGxhc3RXaG9sZUl0ZW1JblZpZXcgKyAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdEl0ZW0obiwgc2hvdywgc291cmNlKSB7XG4gICAgICAgIGlmICghc291cmNlKSB7XG4gICAgICAgICAgICBzb3VyY2UgPSBcImFwaVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1ZhbGlkSXRlbShuKSAmJiBuICE9PSBzZWxlY3RlZEl0ZW1JbmRleCkge1xuICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBuO1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgIGlmIChjID09PSBzZWxlY3RlZEl0ZW1JbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGl0ZW1FbHNbY10sIFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLnJlbW92ZUNsYXNzKGl0ZW1FbHNbY10sIFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIHtcbiAgICAgICAgICAgICAgICBpdGVtSUQ6IHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdFByZXZJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgcHJldiA9IChzZWxlY3RlZEl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzZWxlY3RlZEl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNlbGVjdEl0ZW0ocHJldiwgc2hvdywgc291cmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3ROZXh0SXRlbShzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2VsZWN0SXRlbShuZXh0LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dQcmV2UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0UHJldkl0ZW0odHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd05leHRQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3ROZXh0SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7IC8vIGNvcnJlY3QgdGhlIGFsaWdubWVudCBvZiBpdGVtIGluIHZpZXdcbiAgICAgICAgICAgIHNob3dJdGVtKHNob3duSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhuZXdTY3JvbGxMZWZ0LCBuZXdTY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUhhbmRsZXIoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWJvdW5jZU9uUmVzaXplKTtcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSA9IHNldFRpbWVvdXQob25SZXNpemUsIDUwMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kT2JqZWN0cyhvYmpzKSB7XG4gICAgICAgIHZhciBuZXdPYmogPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBvYmpzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG9ianNbY107XG4gICAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3T2JqW3Byb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3T2JqO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCkge1xuICAgICAgICBnYWxsZXJ5RE9NLnNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyhjb250YWluZXJFbCwgY29uZmlnLCBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCwgW1wiY29udGFpbmVyXCIsIFwiaXRlbXNcIl0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFN5bmNJRChpZCkge1xuICAgICAgICBjb25maWcuc3luY0lEID0gaWQ7XG4gICAgICAgIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3luY0lEKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLnN5bmNJRDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzeW5jV2l0aChnYWxsZXJ5SW5zdGFuY2UpIHtcbiAgICAgICAgc2V0U3luY0lEKGdhbGxlcnlJbnN0YW5jZS5nZXRTeW5jSUQoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIG5leHRDb250cm9sRGl2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuICAgICAgICBnYWxsZXJ5RE9NLnVud3JhcEVsZW1lbnQoYWxsSXRlbXNFbCk7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gcHJvcGVydHlBdHRyaWJ1dGVNYXApIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eUF0dHJpYnV0ZU1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lckVsLnJlbW92ZUF0dHJpYnV0ZShwcm9wZXJ0eUF0dHJpYnV0ZU1hcFtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKGlzRGF0YVNvdXJjZSgpKSB7XG4gICAgICAgIGdhbGxlcnlET00uZW1wdHlFbGVtZW50KGNvbnRhaW5lckVsKTtcbiAgICAgICAgZ2FsbGVyeURPTS5hZGRDbGFzcyhjb250YWluZXJFbCwgXCJvLWdhbGxlcnlcIik7XG4gICAgICAgIGFsbEl0ZW1zRWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCk7XG4gICAgICAgIGl0ZW1FbHMgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zKGFsbEl0ZW1zRWwsIGNvbmZpZy5pdGVtcyk7XG4gICAgfVxuICAgIGNvbmZpZyA9IGV4dGVuZE9iamVjdHMoW2RlZmF1bHRDb25maWcsIGdhbGxlcnlET00uZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzKGNvbnRhaW5lckVsLCBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCksIGNvbmZpZ10pO1xuICAgIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCk7XG4gICAgYWxsSXRlbXNFbCA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICB2aWV3cG9ydEVsID0gZ2FsbGVyeURPTS5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiXCIsIFwiby1nYWxsZXJ5X192aWV3cG9ydFwiKTtcbiAgICBnYWxsZXJ5RE9NLndyYXBFbGVtZW50KGFsbEl0ZW1zRWwsIHZpZXdwb3J0RWwpO1xuICAgIGl0ZW1FbHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbiAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgIHNob3duSXRlbUluZGV4ID0gc2VsZWN0ZWRJdGVtSW5kZXg7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQoc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgIHNldFdpZHRocygpO1xuICAgIHNldENhcHRpb25TaXplcygpO1xuICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgYWRkVWlDb250cm9scygpO1xuICAgIGxpc3RlbkZvclN5bmNFdmVudHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuICAgIHRoaXMuZ2V0U3luY0lEID0gZ2V0U3luY0lEO1xuICAgIHRoaXMuc3luY1dpdGggPSBzeW5jV2l0aDtcbiAgICB0aGlzLmRlc3Ryb3kgPSBkZXN0cm95O1xuXG4gICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlSZWFkeVwiLCB7XG4gICAgICAgIGdhbGxlcnk6IHRoaXNcbiAgICB9KTtcblxufVxuXG5HYWxsZXJ5LmNyZWF0ZUFsbEluID0gZnVuY3Rpb24oZWwpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgZ0VscyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1vLWNvbXBvbmVudD1vLWdhbGxlcnldXCIpLFxuICAgICAgICBnYWxsZXJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGdFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGdhbGxlcmllcy5wdXNoKG5ldyBHYWxsZXJ5KHtcbiAgICAgICAgICAgIGNvbnRhaW5lcjogZ0Vsc1tjXVxuICAgICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiBnYWxsZXJpZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdhbGxlcnk7IiwiLypnbG9iYWwgbW9kdWxlKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGVtcHR5RWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHdoaWxlICh0YXJnZXRFbC5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhcmdldEVsLnJlbW92ZUNoaWxkKHRhcmdldEVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gd3JhcEVsZW1lbnQodGFyZ2V0RWwsIHdyYXBFbCkge1xuICAgIHZhciBwYXJlbnRFbCA9IHRhcmdldEVsLnBhcmVudE5vZGU7XG4gICAgd3JhcEVsLmFwcGVuZENoaWxkKHRhcmdldEVsKTtcbiAgICBwYXJlbnRFbC5hcHBlbmRDaGlsZCh3cmFwRWwpO1xufVxuXG5mdW5jdGlvbiB1bndyYXBFbGVtZW50KHRhcmdldEVsKSB7XG4gICAgdmFyIHdyYXBwaW5nRWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB3cmFwcGluZ0VsUGFyZW50ID0gd3JhcHBpbmdFbC5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh3cmFwcGluZ0VsLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB3cmFwcGluZ0VsUGFyZW50LmFwcGVuZENoaWxkKHdyYXBwaW5nRWwuY2hpbGROb2Rlc1swXSk7XG4gICAgfVxuICAgIHdyYXBwaW5nRWxQYXJlbnQucmVtb3ZlQ2hpbGQod3JhcHBpbmdFbCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQobm9kZU5hbWUsIGNvbnRlbnQsIGNsYXNzZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICBlbC5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMpO1xuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGMpIHtcbiAgICByZXR1cm4gKCcgJyArIGVsLmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignICcgKyBjICsgJyAnKSA+IC0xO1xufVxuXG5mdW5jdGlvbiBhZGRDbGFzcyhlbCwgYykge1xuICAgIGlmICghaGFzQ2xhc3MoZWwsIGMpKSB7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZSArIFwiIFwiICsgYztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNsYXNzKGVsLCBjKSB7XG4gICAgaWYgKGhhc0NsYXNzKGVsLCBjKSkge1xuICAgICAgICB2YXIgcmVnID0gbmV3IFJlZ0V4cCgnKFxcXFxzfF4pJyArIGMgKyAnKFxcXFxzfCQpJyk7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKHJlZywnICcpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKSB7XG4gICAgdmFyIGl0ZW1zTGlzdCA9IGNyZWF0ZUVsZW1lbnQoXCJvbFwiLCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbXNcIik7XG4gICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoaXRlbXNMaXN0KTtcbiAgICByZXR1cm4gaXRlbXNMaXN0O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtcyhjb250YWluZXJFbCwgaXRlbXMpIHtcbiAgICB2YXIgaXRlbUNsYXNzO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGl0ZW1DbGFzcyA9IFwiby1nYWxsZXJ5X19pdGVtXCIgKyAoKGl0ZW1zW2NdLnNlbGVjdGVkKSA/IFwiIG8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIiA6IFwiXCIgKTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoY3JlYXRlRWxlbWVudChcImxpXCIsIFwiJm5ic3A7XCIsIGl0ZW1DbGFzcykpO1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG59XG5cbmZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KGNvbmZpZywgaXRlbSwgaXRlbUVsKSB7XG4gICAgZW1wdHlFbGVtZW50KGl0ZW1FbCk7XG4gICAgdmFyIGNvbnRlbnRFbCA9IGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgaXRlbS5pdGVtQ29udGVudCwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NvbnRlbnRcIik7XG4gICAgaXRlbUVsLmFwcGVuZENoaWxkKGNvbnRlbnRFbCk7XG4gICAgaWYgKGNvbmZpZy5jYXB0aW9ucykge1xuICAgICAgICB2YXIgY2FwdGlvbkVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1DYXB0aW9uIHx8IFwiXCIsIFwiby1nYWxsZXJ5X19pdGVtX19jYXB0aW9uXCIpO1xuICAgICAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY2FwdGlvbkVsKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFByb3BlcnR5SWZBdHRyaWJ1dGVFeGlzdHMob2JqLCBwcm9wTmFtZSwgZWwsIGF0dHJOYW1lKSB7XG4gICAgdmFyIHYgPSBlbC5nZXRBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuICAgIGlmICh2ICE9PSBudWxsKSB7XG4gICAgICAgIGlmICh2ID09PSBcInRydWVcIikge1xuICAgICAgICAgICAgdiA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodiA9PT0gXCJmYWxzZVwiKSB7XG4gICAgICAgICAgICB2ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgb2JqW3Byb3BOYW1lXSA9IHY7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXMoZWwsIG1hcCkge1xuICAgIHZhciBvYmogPSB7fSxcbiAgICAgICAgcHJvcDtcbiAgICBmb3IgKHByb3AgaW4gbWFwKSB7XG4gICAgICAgIGlmIChtYXAuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgIHNldFByb3BlcnR5SWZBdHRyaWJ1dGVFeGlzdHMob2JqLCBwcm9wLCBlbCwgbWFwW3Byb3BdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXMoZWwsIG9iaiwgbWFwLCBleGNsKSB7XG4gICAgdmFyIGV4Y2x1ZGUgPSBleGNsIHx8IFtdO1xuICAgIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkgJiYgZXhjbHVkZS5pbmRleE9mKHByb3ApIDwgMCkge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG1hcFtwcm9wXSwgb2JqW3Byb3BdKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0Q2xvc2VzdChlbCwgYykge1xuICAgIHdoaWxlICghaGFzQ2xhc3MoZWwsIGMpKSB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBnZXRFbGVtZW50SW5kZXgoZWwpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUgKGVsID0gZWwucHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgIGlmIChlbC5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgKytpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBlbXB0eUVsZW1lbnQ6IGVtcHR5RWxlbWVudCxcbiAgICBjcmVhdGVFbGVtZW50OiBjcmVhdGVFbGVtZW50LFxuICAgIGhhc0NsYXNzOiBoYXNDbGFzcyxcbiAgICBhZGRDbGFzczogYWRkQ2xhc3MsXG4gICAgcmVtb3ZlQ2xhc3M6IHJlbW92ZUNsYXNzLFxuICAgIGNyZWF0ZUl0ZW1zTGlzdDogY3JlYXRlSXRlbXNMaXN0LFxuICAgIGNyZWF0ZUl0ZW1zOiBjcmVhdGVJdGVtcyxcbiAgICBpbnNlcnRJdGVtQ29udGVudDogaW5zZXJ0SXRlbUNvbnRlbnQsXG4gICAgd3JhcEVsZW1lbnQ6IHdyYXBFbGVtZW50LFxuICAgIHVud3JhcEVsZW1lbnQ6IHVud3JhcEVsZW1lbnQsXG4gICAgc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzOiBzZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXMsXG4gICAgZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzOiBnZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXMsXG4gICAgZ2V0Q2xvc2VzdDogZ2V0Q2xvc2VzdCxcbiAgICBnZXRFbGVtZW50SW5kZXg6IGdldEVsZW1lbnRJbmRleFxufTsiXX0=
