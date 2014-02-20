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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlET00uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOzs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2pzL0dhbGxlcnknKTsiLCIvKmdsb2JhbCByZXF1aXJlLCBtb2R1bGUqL1xuXG52YXIgZ2FsbGVyeURPTSA9IHJlcXVpcmUoJy4vZ2FsbGVyeURPTScpO1xuXG5mdW5jdGlvbiBHYWxsZXJ5KGNvbmZpZykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGNvbnRhaW5lckVsID0gY29uZmlnLmNvbnRhaW5lcixcbiAgICAgICAgdmlld3BvcnRFbCxcbiAgICAgICAgYWxsSXRlbXNFbCxcbiAgICAgICAgaXRlbUVscyxcbiAgICAgICAgdHJhbnNpdGlvbkR1cmF0aW9uID0gMzAwLFxuICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgc2hvd25JdGVtSW5kZXgsXG4gICAgICAgIGRlYm91bmNlT25SZXNpemUsXG4gICAgICAgIHByZXZDb250cm9sRGl2LFxuICAgICAgICBuZXh0Q29udHJvbERpdixcbiAgICAgICAgcHJvcGVydHlBdHRyaWJ1dGVNYXAgPSB7XG4gICAgICAgICAgICBjb21wb25lbnQ6IFwiZGF0YS1vLWNvbXBvbmVudFwiLFxuICAgICAgICAgICAgdmVyc2lvbjogXCJkYXRhLW8tdmVyc2lvblwiLFxuICAgICAgICAgICAgc3luY0lEOiBcImRhdGEtby1nYWxsZXJ5LXN5bmNpZFwiLFxuICAgICAgICAgICAgbXVsdGlwbGVJdGVtc1BlclBhZ2U6IFwiZGF0YS1vLWdhbGxlcnktbXVsdGlwbGVpdGVtc3BlcnBhZ2VcIixcbiAgICAgICAgICAgIHRvdWNoOiBcImRhdGEtby1nYWxsZXJ5LXRvdWNoXCIsXG4gICAgICAgICAgICBjYXB0aW9uczogXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9uc1wiLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWluaGVpZ2h0XCIsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25tYXhoZWlnaHRcIlxuICAgICAgICB9LFxuICAgICAgICBkZWZhdWx0Q29uZmlnID0ge1xuICAgICAgICAgICAgY29tcG9uZW50OiBcIm8tZ2FsbGVyeVwiLFxuICAgICAgICAgICAgdmVyc2lvbjogXCIwLjAuMFwiLFxuICAgICAgICAgICAgbXVsdGlwbGVJdGVtc1BlclBhZ2U6IGZhbHNlLFxuICAgICAgICAgICAgY2FwdGlvbnM6IHRydWUsXG4gICAgICAgICAgICBjYXB0aW9uTWluSGVpZ2h0OiAyNCxcbiAgICAgICAgICAgIGNhcHRpb25NYXhIZWlnaHQ6IDUyLFxuICAgICAgICAgICAgdG91Y2g6IGZhbHNlLFxuICAgICAgICAgICAgc3luY0lEOiBcIm8tZ2FsbGVyeS1cIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICAgIH07XG5cbiAgICBmdW5jdGlvbiBpc0RhdGFTb3VyY2UoKSB7XG4gICAgICAgIHJldHVybiAoY29uZmlnLml0ZW1zICYmIGNvbmZpZy5pdGVtcy5sZW5ndGggPiAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRXaWR0aHMoKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgICAgbCxcbiAgICAgICAgICAgIHRvdGFsV2lkdGggPSAwLFxuICAgICAgICAgICAgaXRlbVdpZHRoID0gY29udGFpbmVyRWwuY2xpZW50V2lkdGg7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIGl0ZW1XaWR0aCA9IHBhcnNlSW50KGl0ZW1FbHNbc2VsZWN0ZWRJdGVtSW5kZXhdLmNsaWVudFdpZHRoLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtRWxzW2ldLnN0eWxlLndpZHRoID0gaXRlbVdpZHRoICsgXCJweFwiO1xuICAgICAgICAgICAgdG90YWxXaWR0aCArPSBpdGVtV2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgYWxsSXRlbXNFbC5zdHlsZS53aWR0aCA9IHRvdGFsV2lkdGggKyBcInB4XCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNWYWxpZEl0ZW0obikge1xuICAgICAgICByZXR1cm4gKHR5cGVvZiBuID09PSBcIm51bWJlclwiICYmIG4gPiAtMSAmJiBuIDwgaXRlbUVscy5sZW5ndGgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdGVkSXRlbSgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkSXRlbSA9IDAsIGMsIGw7XG4gICAgICAgIGZvciAoYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgaWYgKGdhbGxlcnlET00uaGFzQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gYztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFVpQ29udHJvbHMoKSB7XG4gICAgICAgIHByZXZDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiUFJFVlwiLCBcIm8tZ2FsbGVyeV9fY29udHJvbCBvLWdhbGxlcnlfX2NvbnRyb2wtLXByZXZcIik7XG4gICAgICAgIG5leHRDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiTkVYVFwiLCBcIm8tZ2FsbGVyeV9fY29udHJvbCBvLWdhbGxlcnlfX2NvbnRyb2wtLW5leHRcIik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuICAgICAgICBwcmV2Q29udHJvbERpdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcHJldik7XG4gICAgICAgIG5leHRDb250cm9sRGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBuZXh0KTtcblxuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICB2aWV3cG9ydEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGNsaWNrZWRJdGVtTnVtID0gZ2FsbGVyeURPTS5nZXRFbGVtZW50SW5kZXgoZ2FsbGVyeURPTS5nZXRDbG9zZXN0KGV2dC5zcmNFbGVtZW50LCBcIm8tZ2FsbGVyeV9faXRlbVwiKSk7XG4gICAgICAgICAgICAgICAgc2VsZWN0SXRlbShjbGlja2VkSXRlbU51bSwgdHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRDYXB0aW9uU2l6ZXMoKSB7XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtRWwgPSBpdGVtRWxzW2NdO1xuICAgICAgICAgICAgaXRlbUVsLnN0eWxlLnBhZGRpbmdCb3R0b20gPSBjb25maWcuY2FwdGlvbk1pbkhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgIHZhciBjYXB0aW9uRWwgPSBpdGVtRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgICAgICBpZiAoY2FwdGlvbkVsKSB7XG4gICAgICAgICAgICAgICAgY2FwdGlvbkVsLnN0eWxlLm1pbkhlaWdodCA9IGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgICAgIGNhcHRpb25FbC5zdHlsZS5tYXhIZWlnaHQgPSBjb25maWcuY2FwdGlvbk1heEhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KG4pIHtcbiAgICAgICAgdmFyIGl0ZW1OdW1zID0gKG4gaW5zdGFuY2VvZiBBcnJheSkgPyBuIDogW25dO1xuICAgICAgICBpZiAoY29uZmlnLml0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1OdW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtTnVtID0gaXRlbU51bXNbY107XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRJdGVtKGl0ZW1OdW0pICYmICFjb25maWcuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2FsbGVyeURPTS5pbnNlcnRJdGVtQ29udGVudChjb25maWcsIGNvbmZpZy5pdGVtc1tpdGVtTnVtXSwgaXRlbUVsc1tpdGVtTnVtXSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5pdGVtc1tpdGVtTnVtXS5pbnNlcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHNldENhcHRpb25TaXplcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhpdGVtTnVtLCBsLCByKSB7XG4gICAgICAgIHJldHVybiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPj0gbCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgKyBpdGVtRWxzW2l0ZW1OdW1dLmNsaWVudFdpZHRoIDw9IHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhpdGVtTnVtLCBsLCByKSB7XG4gICAgICAgIHJldHVybiAoaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgLSBpdGVtRWxzW2l0ZW1OdW1dLmNsaWVudFdpZHRoICYmIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA8PSByKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJdGVtc0luUGFnZVZpZXcobCwgciwgd2hvbGUpIHtcbiAgICAgICAgdmFyIGl0ZW1zSW5WaWV3ID0gW10sXG4gICAgICAgICAgICBvbmx5V2hvbGUgPSAodHlwZW9mIHdob2xlICE9PSBcImJvb2xlYW5cIikgPyB0cnVlIDogd2hvbGU7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgaXRlbUVscy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgaWYgKChvbmx5V2hvbGUgJiYgaXNXaG9sZUl0ZW1JblBhZ2VWaWV3KGMsIGwsIHIpKSB8fCAoIW9ubHlXaG9sZSAmJiBpc0FueVBhcnRPZkl0ZW1JblBhZ2VWaWV3KGMsIGwsIHIpKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zSW5WaWV3LnB1c2goYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZW1zSW5WaWV3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zaXRpb25UbyhuZXdTY3JvbGxMZWZ0KSB7XG4gICAgICAgIHZhciBzdGFydCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIGNoYW5nZSA9IG5ld1Njcm9sbExlZnQgLSBzdGFydCxcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lID0gMCxcbiAgICAgICAgICAgIGluY3JlbWVudCA9IDIwLFxuICAgICAgICAgICAgdGltZW91dDtcbiAgICAgICAgLy8gdCA9IGN1cnJlbnQgdGltZSwgYiA9IHN0YXJ0IHZhbHVlLCBjID0gY2hhbmdlIGluIHZhbHVlLCBkID0gZHVyYXRpb25cbiAgICAgICAgZnVuY3Rpb24gZWFzZUluT3V0UXVhZCh0LCBiLCBjLCBkKSB7XG4gICAgICAgICAgICB0IC89IGQvMjtcbiAgICAgICAgICAgIGlmICh0IDwgMSkgeyByZXR1cm4gYy8yKnQqdCArIGI7IH1cbiAgICAgICAgICAgIHQtLTtcbiAgICAgICAgICAgIHJldHVybiAtYy8yICogKHQqKHQtMikgLSAxKSArIGI7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gYW5pbWF0ZVNjcm9sbCgpIHtcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lICs9IGluY3JlbWVudDtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IGVhc2VJbk91dFF1YWQoY3VycmVudFRpbWUsIHN0YXJ0LCBjaGFuZ2UsIHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPCB0cmFuc2l0aW9uRHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQoYW5pbWF0ZVNjcm9sbCwgaW5jcmVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhbmltYXRlU2Nyb2xsKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25HYWxsZXJ5Q3VzdG9tRXZlbnQoZXZ0KSB7XG4gICAgICAgIGlmIChldnQuc3JjRWxlbWVudCAhPT0gY29udGFpbmVyRWwgJiYgZXZ0LmRldGFpbC5zeW5jSUQgPT09IGNvbmZpZy5zeW5jSUQgJiYgZXZ0LmRldGFpbC5zb3VyY2UgPT09IFwidXNlclwiKSB7XG4gICAgICAgICAgICBzZWxlY3RJdGVtKGV2dC5kZXRhaWwuaXRlbUlELCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbkZvclN5bmNFdmVudHMoKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJvR2FsbGVyeUl0ZW1TZWxlY3RlZFwiLCBvbkdhbGxlcnlDdXN0b21FdmVudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJpZ2dlckV2ZW50KG5hbWUsIGRhdGEpIHtcbiAgICAgICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgICAgIGRhdGEuc3luY0lEID0gY29uZmlnLnN5bmNJRDtcbiAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KG5hbWUsIHtcbiAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICAgICAgICBjYW5jZWxhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGRldGFpbDogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgY29udGFpbmVyRWwuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW92ZVZpZXdwb3J0KGxlZnQsIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKHRyYW5zaXRpb24gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0cmFuc2l0aW9uVG8obGVmdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aWV3cG9ydEVsLnNjcm9sbExlZnQgPSBsZWZ0O1xuICAgICAgICB9XG4gICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhsZWZ0LCBsZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1MZWZ0KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgbW92ZVZpZXdwb3J0KGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCwgdHJhbnNpdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxpZ25JdGVtUmlnaHQobiwgdHJhbnNpdGlvbikge1xuICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCAtICh2aWV3cG9ydEVsLmNsaWVudFdpZHRoIC0gaXRlbUVsc1tuXS5jbGllbnRXaWR0aCk7XG4gICAgICAgIG1vdmVWaWV3cG9ydChuZXdTY3JvbGxMZWZ0LCB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBicmluZ0l0ZW1JbnRvVmlldyhuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmICghaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmlld3BvcnRMID0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgdmlld3BvcnRSID0gdmlld3BvcnRMICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgIGl0ZW1MID0gaXRlbUVsc1tuXS5vZmZzZXRMZWZ0LFxuICAgICAgICAgICAgaXRlbVIgPSBpdGVtTCArIGl0ZW1FbHNbbl0uY2xpZW50V2lkdGg7XG4gICAgICAgIGlmIChpdGVtTCA+IHZpZXdwb3J0TCAmJiBpdGVtUiA8IHZpZXdwb3J0Uikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdGVtTCA8IHZpZXdwb3J0TCkge1xuICAgICAgICAgICAgYWxpZ25JdGVtTGVmdChuLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtUiA+IHZpZXdwb3J0Uikge1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQobiwgdHJhbnNpdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93SXRlbShuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmIChpc1ZhbGlkSXRlbShuKSkge1xuICAgICAgICAgICAgYnJpbmdJdGVtSW50b1ZpZXcobiwgdHJhbnNpdGlvbik7XG4gICAgICAgICAgICBzaG93bkl0ZW1JbmRleCA9IG47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldkl0ZW0oKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNob3duSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNob3duSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2hvd0l0ZW0ocHJldik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRJdGVtKCkge1xuICAgICAgICB2YXIgbmV4dCA9IChzaG93bkl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzaG93bkl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzaG93SXRlbShuZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldlBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IDApIHtcbiAgICAgICAgICAgIHNob3dJdGVtKGl0ZW1FbHMubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJldlBhZ2VXaG9sZUl0ZW1zID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCksXG4gICAgICAgICAgICAgICAgcHJldlBhZ2VJdGVtID0gcHJldlBhZ2VXaG9sZUl0ZW1zLnBvcCgpIHx8IDA7XG4gICAgICAgICAgICBhbGlnbkl0ZW1SaWdodChwcmV2UGFnZUl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRQYWdlKCkge1xuICAgICAgICBpZiAodmlld3BvcnRFbC5zY3JvbGxMZWZ0ID09PSBhbGxJdGVtc0VsLmNsaWVudFdpZHRoIC0gdmlld3BvcnRFbC5jbGllbnRXaWR0aCkge1xuICAgICAgICAgICAgc2hvd0l0ZW0oMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgY3VycmVudFdob2xlSXRlbXNJblZpZXcgPSBnZXRJdGVtc0luUGFnZVZpZXcodmlld3BvcnRFbC5zY3JvbGxMZWZ0LCB2aWV3cG9ydEVsLnNjcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSxcbiAgICAgICAgICAgICAgICBsYXN0V2hvbGVJdGVtSW5WaWV3ID0gY3VycmVudFdob2xlSXRlbXNJblZpZXcucG9wKCkgfHwgaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgYWxpZ25JdGVtTGVmdChsYXN0V2hvbGVJdGVtSW5WaWV3ICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKG4sIHNob3csIHNvdXJjZSkge1xuICAgICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICAgICAgc291cmNlID0gXCJhcGlcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGlmIChzaG93KSB7XG4gICAgICAgICAgICAgICAgc2hvd0l0ZW0obik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiAhPT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uYWRkQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2FsbGVyeURPTS5yZW1vdmVDbGFzcyhpdGVtRWxzW2NdLCBcIm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwge1xuICAgICAgICAgICAgICAgICAgICBpdGVtSUQ6IHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHNvdXJjZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0UHJldkl0ZW0oc2hvdywgc291cmNlKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNlbGVjdGVkSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNlbGVjdGVkSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2VsZWN0SXRlbShwcmV2LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdE5leHRJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgbmV4dCA9IChzZWxlY3RlZEl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzZWxlY3RlZEl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzZWxlY3RJdGVtKG5leHQsIHNob3csIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJldigpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd1ByZXZQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RQcmV2SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzaG93TmV4dFBhZ2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdE5leHRJdGVtKHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzaXplKCkge1xuICAgICAgICBzZXRXaWR0aHMoKTtcbiAgICAgICAgaWYgKCFjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHsgLy8gY29ycmVjdCB0aGUgYWxpZ25tZW50IG9mIGl0ZW0gaW4gdmlld1xuICAgICAgICAgICAgc2hvd0l0ZW0oc2hvd25JdGVtSW5kZXgsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdTY3JvbGxMZWZ0ID0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0O1xuICAgICAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KG5ld1Njcm9sbExlZnQsIG5ld1Njcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzaXplSGFuZGxlcigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlT25SZXNpemUpO1xuICAgICAgICBkZWJvdW5jZU9uUmVzaXplID0gc2V0VGltZW91dChvblJlc2l6ZSwgNTAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHRlbmRPYmplY3RzKG9ianMpIHtcbiAgICAgICAgdmFyIG5ld09iaiA9IHt9O1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IG9ianMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gb2Jqc1tjXTtcbiAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdPYmpbcHJvcF0gPSBvYmpbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdPYmo7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlRGF0YUF0dHJpYnV0ZXMoKSB7XG4gICAgICAgIGdhbGxlcnlET00uc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzKGNvbnRhaW5lckVsLCBjb25maWcsIHByb3BlcnR5QXR0cmlidXRlTWFwLCBbXCJjb250YWluZXJcIiwgXCJpdGVtc1wiXSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0U3luY0lEKGlkKSB7XG4gICAgICAgIGNvbmZpZy5zeW5jSUQgPSBpZDtcbiAgICAgICAgdXBkYXRlRGF0YUF0dHJpYnV0ZXMoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTeW5jSUQoKSB7XG4gICAgICAgIHJldHVybiBjb25maWcuc3luY0lEO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN5bmNXaXRoKGdhbGxlcnlJbnN0YW5jZSkge1xuICAgICAgICBzZXRTeW5jSUQoZ2FsbGVyeUluc3RhbmNlLmdldFN5bmNJRCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgICBwcmV2Q29udHJvbERpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChuZXh0Q29udHJvbERpdik7XG4gICAgICAgIGdhbGxlcnlET00udW53cmFwRWxlbWVudChhbGxJdGVtc0VsKTtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCkge1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5QXR0cmlidXRlTWFwLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyRWwucmVtb3ZlQXR0cmlidXRlKHByb3BlcnR5QXR0cmlidXRlTWFwW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwgb25HYWxsZXJ5Q3VzdG9tRXZlbnQpO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCByZXNpemVIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5lbXB0eUVsZW1lbnQoY29udGFpbmVyRWwpO1xuICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGNvbnRhaW5lckVsLCBcIm8tZ2FsbGVyeVwiKTtcbiAgICAgICAgYWxsSXRlbXNFbCA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKTtcbiAgICAgICAgaXRlbUVscyA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXMoYWxsSXRlbXNFbCwgY29uZmlnLml0ZW1zKTtcbiAgICB9XG4gICAgY29uZmlnID0gZXh0ZW5kT2JqZWN0cyhbZGVmYXVsdENvbmZpZywgZ2FsbGVyeURPTS5nZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXMoY29udGFpbmVyRWwsIHByb3BlcnR5QXR0cmlidXRlTWFwKSwgY29uZmlnXSk7XG4gICAgdXBkYXRlRGF0YUF0dHJpYnV0ZXMoKTtcbiAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIHZpZXdwb3J0RWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX3ZpZXdwb3J0XCIpO1xuICAgIGdhbGxlcnlET00ud3JhcEVsZW1lbnQoYWxsSXRlbXNFbCwgdmlld3BvcnRFbCk7XG4gICAgaXRlbUVscyA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xuICAgIHNlbGVjdGVkSXRlbUluZGV4ID0gZ2V0U2VsZWN0ZWRJdGVtKCk7XG4gICAgc2hvd25JdGVtSW5kZXggPSBzZWxlY3RlZEl0ZW1JbmRleDtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCByZXNpemVIYW5kbGVyKTtcbiAgICBpbnNlcnRJdGVtQ29udGVudChzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgc2V0V2lkdGhzKCk7XG4gICAgc2V0Q2FwdGlvblNpemVzKCk7XG4gICAgc2hvd0l0ZW0oc2VsZWN0ZWRJdGVtSW5kZXgsIGZhbHNlKTtcbiAgICBhZGRVaUNvbnRyb2xzKCk7XG4gICAgbGlzdGVuRm9yU3luY0V2ZW50cygpO1xuXG4gICAgdGhpcy5zaG93SXRlbSA9IHNob3dJdGVtO1xuICAgIHRoaXMuZ2V0U2VsZWN0ZWRJdGVtID0gZ2V0U2VsZWN0ZWRJdGVtO1xuICAgIHRoaXMuc2hvd1ByZXZJdGVtID0gc2hvd1ByZXZJdGVtO1xuICAgIHRoaXMuc2hvd05leHRJdGVtID0gc2hvd05leHRJdGVtO1xuICAgIHRoaXMuc2hvd1ByZXZQYWdlID0gc2hvd1ByZXZQYWdlO1xuICAgIHRoaXMuc2hvd05leHRQYWdlID0gc2hvd05leHRQYWdlO1xuICAgIHRoaXMuc2VsZWN0SXRlbSA9IHNlbGVjdEl0ZW07XG4gICAgdGhpcy5zZWxlY3RQcmV2SXRlbSA9IHNlbGVjdFByZXZJdGVtO1xuICAgIHRoaXMuc2VsZWN0TmV4dEl0ZW0gPSBzZWxlY3ROZXh0SXRlbTtcbiAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIHRoaXMucHJldiA9IHByZXY7XG4gICAgdGhpcy5nZXRTeW5jSUQgPSBnZXRTeW5jSUQ7XG4gICAgdGhpcy5zeW5jV2l0aCA9IHN5bmNXaXRoO1xuICAgIHRoaXMuZGVzdHJveSA9IGRlc3Ryb3k7XG5cbiAgICB0cmlnZ2VyRXZlbnQoXCJvR2FsbGVyeVJlYWR5XCIsIHtcbiAgICAgICAgZ2FsbGVyeTogdGhpc1xuICAgIH0pO1xuXG59XG5cbkdhbGxlcnkuY3JlYXRlQWxsSW4gPSBmdW5jdGlvbihlbCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBnRWxzID0gZWwucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLW8tY29tcG9uZW50PW8tZ2FsbGVyeV1cIiksXG4gICAgICAgIGdhbGxlcmllcyA9IFtdO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gZ0Vscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgZ2FsbGVyaWVzLnB1c2gobmV3IEdhbGxlcnkoe1xuICAgICAgICAgICAgY29udGFpbmVyOiBnRWxzW2NdXG4gICAgICAgIH0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGdhbGxlcmllcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR2FsbGVyeTsiLCIvKmdsb2JhbCBtb2R1bGUqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gZW1wdHlFbGVtZW50KHRhcmdldEVsKSB7XG4gICAgd2hpbGUgKHRhcmdldEVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFyZ2V0RWwucmVtb3ZlQ2hpbGQodGFyZ2V0RWwuZmlyc3RDaGlsZCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB3cmFwRWxlbWVudCh0YXJnZXRFbCwgd3JhcEVsKSB7XG4gICAgdmFyIHBhcmVudEVsID0gdGFyZ2V0RWwucGFyZW50Tm9kZTtcbiAgICB3cmFwRWwuYXBwZW5kQ2hpbGQodGFyZ2V0RWwpO1xuICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKHdyYXBFbCk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcEVsZW1lbnQodGFyZ2V0RWwpIHtcbiAgICB2YXIgd3JhcHBpbmdFbCA9IHRhcmdldEVsLnBhcmVudE5vZGUsXG4gICAgICAgIHdyYXBwaW5nRWxQYXJlbnQgPSB3cmFwcGluZ0VsLnBhcmVudE5vZGU7XG4gICAgd2hpbGUgKHdyYXBwaW5nRWwuY2hpbGROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHdyYXBwaW5nRWxQYXJlbnQuYXBwZW5kQ2hpbGQod3JhcHBpbmdFbC5jaGlsZE5vZGVzWzBdKTtcbiAgICB9XG4gICAgd3JhcHBpbmdFbFBhcmVudC5yZW1vdmVDaGlsZCh3cmFwcGluZ0VsKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudChub2RlTmFtZSwgY29udGVudCwgY2xhc3Nlcykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZU5hbWUpO1xuICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgY2xhc3Nlcyk7XG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBoYXNDbGFzcyhlbCwgYykge1xuICAgIHJldHVybiAoJyAnICsgZWwuY2xhc3NOYW1lICsgJyAnKS5pbmRleE9mKCcgJyArIGMgKyAnICcpID4gLTE7XG59XG5cbmZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjKSB7XG4gICAgaWYgKCFoYXNDbGFzcyhlbCwgYykpIHtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lICsgXCIgXCIgKyBjO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoZWwsIGMpIHtcbiAgICBpZiAoaGFzQ2xhc3MoZWwsIGMpKSB7XG4gICAgICAgIHZhciByZWcgPSBuZXcgUmVnRXhwKCcoXFxcXHN8XiknICsgYyArICcoXFxcXHN8JCknKTtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UocmVnLCcgJyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpIHtcbiAgICB2YXIgaXRlbXNMaXN0ID0gY3JlYXRlRWxlbWVudChcIm9sXCIsIFwiXCIsIFwiby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChpdGVtc0xpc3QpO1xuICAgIHJldHVybiBpdGVtc0xpc3Q7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zKGNvbnRhaW5lckVsLCBpdGVtcykge1xuICAgIHZhciBpdGVtQ2xhc3M7XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgaXRlbUNsYXNzID0gXCJvLWdhbGxlcnlfX2l0ZW1cIiArICgoaXRlbXNbY10uc2VsZWN0ZWQpID8gXCIgby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiIDogXCJcIiApO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChjcmVhdGVFbGVtZW50KFwibGlcIiwgXCImbmJzcDtcIiwgaXRlbUNsYXNzKSk7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBpdGVtLCBpdGVtRWwpIHtcbiAgICBlbXB0eUVsZW1lbnQoaXRlbUVsKTtcbiAgICB2YXIgY29udGVudEVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1Db250ZW50LCBcIm8tZ2FsbGVyeV9faXRlbV9fY29udGVudFwiKTtcbiAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKTtcbiAgICBpZiAoY29uZmlnLmNhcHRpb25zKSB7XG4gICAgICAgIHZhciBjYXB0aW9uRWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uaXRlbUNhcHRpb24gfHwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgIGl0ZW1FbC5hcHBlbmRDaGlsZChjYXB0aW9uRWwpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3BOYW1lLCBlbCwgYXR0ck5hbWUpIHtcbiAgICB2YXIgdiA9IGVsLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgaWYgKHYgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKHYgPT09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICB2ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2ID09PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgIHYgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBvYmpbcHJvcE5hbWVdID0gdjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlcyhlbCwgbWFwKSB7XG4gICAgdmFyIG9iaiA9IHt9LFxuICAgICAgICBwcm9wO1xuICAgIGZvciAocHJvcCBpbiBtYXApIHtcbiAgICAgICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3AsIGVsLCBtYXBbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyhlbCwgb2JqLCBtYXAsIGV4Y2wpIHtcbiAgICB2YXIgZXhjbHVkZSA9IGV4Y2wgfHwgW107XG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSAmJiBleGNsdWRlLmluZGV4T2YocHJvcCkgPCAwKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobWFwW3Byb3BdLCBvYmpbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRDbG9zZXN0KGVsLCBjKSB7XG4gICAgd2hpbGUgKCFoYXNDbGFzcyhlbCwgYykpIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRJbmRleChlbCkge1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoZWwgPSBlbC5wcmV2aW91c1NpYmxpbmcpIHtcbiAgICAgICAgaWYgKGVsLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgICAgICArK2k7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGVtcHR5RWxlbWVudDogZW1wdHlFbGVtZW50LFxuICAgIGNyZWF0ZUVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnQsXG4gICAgaGFzQ2xhc3M6IGhhc0NsYXNzLFxuICAgIGFkZENsYXNzOiBhZGRDbGFzcyxcbiAgICByZW1vdmVDbGFzczogcmVtb3ZlQ2xhc3MsXG4gICAgY3JlYXRlSXRlbXNMaXN0OiBjcmVhdGVJdGVtc0xpc3QsXG4gICAgY3JlYXRlSXRlbXM6IGNyZWF0ZUl0ZW1zLFxuICAgIGluc2VydEl0ZW1Db250ZW50OiBpbnNlcnRJdGVtQ29udGVudCxcbiAgICB3cmFwRWxlbWVudDogd3JhcEVsZW1lbnQsXG4gICAgdW53cmFwRWxlbWVudDogdW53cmFwRWxlbWVudCxcbiAgICBzZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXM6IHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyxcbiAgICBnZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXM6IGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlcyxcbiAgICBnZXRDbG9zZXN0OiBnZXRDbG9zZXN0LFxuICAgIGdldEVsZW1lbnRJbmRleDogZ2V0RWxlbWVudEluZGV4XG59OyJdfQ==
