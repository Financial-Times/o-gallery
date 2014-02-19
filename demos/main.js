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
        defaultConfig = {
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
            if (itemEls[c].className.indexOf("o-gallery__item--selected") > 0) {
                selectedItem = c;
                break;
            }
        }
        return selectedItem;
    }

    function addUiControls() {
        prevControlDiv = galleryDOM.getPrevControl();
        nextControlDiv = galleryDOM.getNextControl();
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);
        prevControlDiv.addEventListener("click", prev);
        nextControlDiv.addEventListener("click", next);

        if (config.multipleItemsPerPage) {
            viewportEl.addEventListener("click", function (evt) {
                var clickedItemNum = galleryDOM.getItemNumberFromElement(evt.srcElement);
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
                    itemEls[c].className = itemEls[c].className + " o-gallery__item--selected";
                } else {
                    itemEls[c].className = itemEls[c].className.replace(/\bo-gallery__item--selected\b/,'');
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

    function setSyncID(id) {
        config.syncID = id;
        galleryDOM.setConfigDataAttributes(containerEl, config);
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
        galleryDOM.destroyViewport(viewportEl);
        galleryDOM.removeConfigDataAttributes(containerEl);
        document.removeEventListener("oGalleryItemSelected", onGalleryCustomEvent);
        window.removeEventListener("resize", resizeHandler);
    }

    if (isDataSource()) {
        galleryDOM.emptyElement(containerEl);
        containerEl.className = containerEl.className + " o-gallery";
        allItemsEl = galleryDOM.createItemsList(containerEl);
        itemEls = galleryDOM.createItems(allItemsEl, config.items);
    }
    config = extendObjects([defaultConfig, galleryDOM.getConfigDataAttributes(containerEl), config]);
    galleryDOM.setConfigDataAttributes(containerEl, config);
    allItemsEl = containerEl.querySelector(".o-gallery__items");
    viewportEl = galleryDOM.createViewport(allItemsEl);
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
},{}]},{},["hjDe2K"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlET00uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOzs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmdsb2JhbCByZXF1aXJlLCBtb2R1bGUqL1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9qcy9HYWxsZXJ5Jyk7IiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cblxudmFyIGdhbGxlcnlET00gPSByZXF1aXJlKCcuL2dhbGxlcnlET00nKTtcblxuZnVuY3Rpb24gR2FsbGVyeShjb25maWcpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBjb250YWluZXJFbCA9IGNvbmZpZy5jb250YWluZXIsXG4gICAgICAgIHZpZXdwb3J0RWwsXG4gICAgICAgIGFsbEl0ZW1zRWwsXG4gICAgICAgIGl0ZW1FbHMsXG4gICAgICAgIHRyYW5zaXRpb25EdXJhdGlvbiA9IDMwMCxcbiAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXgsXG4gICAgICAgIHNob3duSXRlbUluZGV4LFxuICAgICAgICBkZWJvdW5jZU9uUmVzaXplLFxuICAgICAgICBwcmV2Q29udHJvbERpdixcbiAgICAgICAgbmV4dENvbnRyb2xEaXYsXG4gICAgICAgIGRlZmF1bHRDb25maWcgPSB7XG4gICAgICAgICAgICBtdWx0aXBsZUl0ZW1zUGVyUGFnZTogZmFsc2UsXG4gICAgICAgICAgICBjYXB0aW9uczogdHJ1ZSxcbiAgICAgICAgICAgIGNhcHRpb25NaW5IZWlnaHQ6IDI0LFxuICAgICAgICAgICAgY2FwdGlvbk1heEhlaWdodDogNTIsXG4gICAgICAgICAgICB0b3VjaDogZmFsc2UsXG4gICAgICAgICAgICBzeW5jSUQ6IFwiby1nYWxsZXJ5LVwiICsgbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzRGF0YVNvdXJjZSgpIHtcbiAgICAgICAgcmV0dXJuIChjb25maWcuaXRlbXMgJiYgY29uZmlnLml0ZW1zLmxlbmd0aCA+IDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFdpZHRocygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBsLFxuICAgICAgICAgICAgdG90YWxXaWR0aCA9IDAsXG4gICAgICAgICAgICBpdGVtV2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgaXRlbVdpZHRoID0gcGFyc2VJbnQoaXRlbUVsc1tzZWxlY3RlZEl0ZW1JbmRleF0uY2xpZW50V2lkdGgsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW1FbHNbaV0uc3R5bGUud2lkdGggPSBpdGVtV2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICB0b3RhbFdpZHRoICs9IGl0ZW1XaWR0aDtcbiAgICAgICAgfVxuICAgICAgICBhbGxJdGVtc0VsLnN0eWxlLndpZHRoID0gdG90YWxXaWR0aCArIFwicHhcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkSXRlbShuKSB7XG4gICAgICAgIHJldHVybiAodHlwZW9mIG4gPT09IFwibnVtYmVyXCIgJiYgbiA+IC0xICYmIG4gPCBpdGVtRWxzLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRJdGVtKCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gMCwgYywgbDtcbiAgICAgICAgZm9yIChjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoaXRlbUVsc1tjXS5jbGFzc05hbWUuaW5kZXhPZihcIm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIikgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gYztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFVpQ29udHJvbHMoKSB7XG4gICAgICAgIHByZXZDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5nZXRQcmV2Q29udHJvbCgpO1xuICAgICAgICBuZXh0Q29udHJvbERpdiA9IGdhbGxlcnlET00uZ2V0TmV4dENvbnRyb2woKTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQocHJldkNvbnRyb2xEaXYpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChuZXh0Q29udHJvbERpdik7XG4gICAgICAgIHByZXZDb250cm9sRGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwcmV2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG5leHQpO1xuXG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2xpY2tlZEl0ZW1OdW0gPSBnYWxsZXJ5RE9NLmdldEl0ZW1OdW1iZXJGcm9tRWxlbWVudChldnQuc3JjRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgc2VsZWN0SXRlbShjbGlja2VkSXRlbU51bSwgdHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRDYXB0aW9uU2l6ZXMoKSB7XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtRWwgPSBpdGVtRWxzW2NdO1xuICAgICAgICAgICAgaXRlbUVsLnN0eWxlLnBhZGRpbmdCb3R0b20gPSBjb25maWcuY2FwdGlvbk1pbkhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgIHZhciBjYXB0aW9uRWwgPSBpdGVtRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgICAgICBpZiAoY2FwdGlvbkVsKSB7XG4gICAgICAgICAgICAgICAgY2FwdGlvbkVsLnN0eWxlLm1pbkhlaWdodCA9IGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgICAgIGNhcHRpb25FbC5zdHlsZS5tYXhIZWlnaHQgPSBjb25maWcuY2FwdGlvbk1heEhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KG4pIHtcbiAgICAgICAgdmFyIGl0ZW1OdW1zID0gKG4gaW5zdGFuY2VvZiBBcnJheSkgPyBuIDogW25dO1xuICAgICAgICBpZiAoY29uZmlnLml0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1OdW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtTnVtID0gaXRlbU51bXNbY107XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRJdGVtKGl0ZW1OdW0pICYmICFjb25maWcuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2FsbGVyeURPTS5pbnNlcnRJdGVtQ29udGVudChjb25maWcsIGNvbmZpZy5pdGVtc1tpdGVtTnVtXSwgaXRlbUVsc1tpdGVtTnVtXSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5pdGVtc1tpdGVtTnVtXS5pbnNlcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHNldENhcHRpb25TaXplcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhpdGVtTnVtLCBsLCByKSB7XG4gICAgICAgIHJldHVybiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPj0gbCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgKyBpdGVtRWxzW2l0ZW1OdW1dLmNsaWVudFdpZHRoIDw9IHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhpdGVtTnVtLCBsLCByKSB7XG4gICAgICAgIHJldHVybiAoaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgLSBpdGVtRWxzW2l0ZW1OdW1dLmNsaWVudFdpZHRoICYmIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA8PSByKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJdGVtc0luUGFnZVZpZXcobCwgciwgd2hvbGUpIHtcbiAgICAgICAgdmFyIGl0ZW1zSW5WaWV3ID0gW10sXG4gICAgICAgICAgICBvbmx5V2hvbGUgPSAodHlwZW9mIHdob2xlICE9PSBcImJvb2xlYW5cIikgPyB0cnVlIDogd2hvbGU7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgaXRlbUVscy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgaWYgKChvbmx5V2hvbGUgJiYgaXNXaG9sZUl0ZW1JblBhZ2VWaWV3KGMsIGwsIHIpKSB8fCAoIW9ubHlXaG9sZSAmJiBpc0FueVBhcnRPZkl0ZW1JblBhZ2VWaWV3KGMsIGwsIHIpKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zSW5WaWV3LnB1c2goYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZW1zSW5WaWV3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zaXRpb25UbyhuZXdTY3JvbGxMZWZ0KSB7XG4gICAgICAgIHZhciBzdGFydCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIGNoYW5nZSA9IG5ld1Njcm9sbExlZnQgLSBzdGFydCxcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lID0gMCxcbiAgICAgICAgICAgIGluY3JlbWVudCA9IDIwLFxuICAgICAgICAgICAgdGltZW91dDtcbiAgICAgICAgLy8gdCA9IGN1cnJlbnQgdGltZSwgYiA9IHN0YXJ0IHZhbHVlLCBjID0gY2hhbmdlIGluIHZhbHVlLCBkID0gZHVyYXRpb25cbiAgICAgICAgZnVuY3Rpb24gZWFzZUluT3V0UXVhZCh0LCBiLCBjLCBkKSB7XG4gICAgICAgICAgICB0IC89IGQvMjtcbiAgICAgICAgICAgIGlmICh0IDwgMSkgeyByZXR1cm4gYy8yKnQqdCArIGI7IH1cbiAgICAgICAgICAgIHQtLTtcbiAgICAgICAgICAgIHJldHVybiAtYy8yICogKHQqKHQtMikgLSAxKSArIGI7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gYW5pbWF0ZVNjcm9sbCgpIHtcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lICs9IGluY3JlbWVudDtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IGVhc2VJbk91dFF1YWQoY3VycmVudFRpbWUsIHN0YXJ0LCBjaGFuZ2UsIHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPCB0cmFuc2l0aW9uRHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQoYW5pbWF0ZVNjcm9sbCwgaW5jcmVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhbmltYXRlU2Nyb2xsKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25HYWxsZXJ5Q3VzdG9tRXZlbnQoZXZ0KSB7XG4gICAgICAgIGlmIChldnQuc3JjRWxlbWVudCAhPT0gY29udGFpbmVyRWwgJiYgZXZ0LmRldGFpbC5zeW5jSUQgPT09IGNvbmZpZy5zeW5jSUQgJiYgZXZ0LmRldGFpbC5zb3VyY2UgPT09IFwidXNlclwiKSB7XG4gICAgICAgICAgICBzZWxlY3RJdGVtKGV2dC5kZXRhaWwuaXRlbUlELCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbkZvclN5bmNFdmVudHMoKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJvR2FsbGVyeUl0ZW1TZWxlY3RlZFwiLCBvbkdhbGxlcnlDdXN0b21FdmVudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJpZ2dlckV2ZW50KG5hbWUsIGRhdGEpIHtcbiAgICAgICAgZGF0YSA9IGRhdGEgfHwge307XG4gICAgICAgIGRhdGEuc3luY0lEID0gY29uZmlnLnN5bmNJRDtcbiAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KG5hbWUsIHtcbiAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICAgICAgICBjYW5jZWxhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGRldGFpbDogZGF0YVxuICAgICAgICB9KTtcbiAgICAgICAgY29udGFpbmVyRWwuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW92ZVZpZXdwb3J0KGxlZnQsIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKHRyYW5zaXRpb24gIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0cmFuc2l0aW9uVG8obGVmdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aWV3cG9ydEVsLnNjcm9sbExlZnQgPSBsZWZ0O1xuICAgICAgICB9XG4gICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhsZWZ0LCBsZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1MZWZ0KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgbW92ZVZpZXdwb3J0KGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCwgdHJhbnNpdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxpZ25JdGVtUmlnaHQobiwgdHJhbnNpdGlvbikge1xuICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCAtICh2aWV3cG9ydEVsLmNsaWVudFdpZHRoIC0gaXRlbUVsc1tuXS5jbGllbnRXaWR0aCk7XG4gICAgICAgIG1vdmVWaWV3cG9ydChuZXdTY3JvbGxMZWZ0LCB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBicmluZ0l0ZW1JbnRvVmlldyhuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmICghaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmlld3BvcnRMID0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgdmlld3BvcnRSID0gdmlld3BvcnRMICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgIGl0ZW1MID0gaXRlbUVsc1tuXS5vZmZzZXRMZWZ0LFxuICAgICAgICAgICAgaXRlbVIgPSBpdGVtTCArIGl0ZW1FbHNbbl0uY2xpZW50V2lkdGg7XG4gICAgICAgIGlmIChpdGVtTCA+IHZpZXdwb3J0TCAmJiBpdGVtUiA8IHZpZXdwb3J0Uikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdGVtTCA8IHZpZXdwb3J0TCkge1xuICAgICAgICAgICAgYWxpZ25JdGVtTGVmdChuLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtUiA+IHZpZXdwb3J0Uikge1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQobiwgdHJhbnNpdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93SXRlbShuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmIChpc1ZhbGlkSXRlbShuKSkge1xuICAgICAgICAgICAgYnJpbmdJdGVtSW50b1ZpZXcobiwgdHJhbnNpdGlvbik7XG4gICAgICAgICAgICBzaG93bkl0ZW1JbmRleCA9IG47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldkl0ZW0oKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNob3duSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNob3duSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2hvd0l0ZW0ocHJldik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRJdGVtKCkge1xuICAgICAgICB2YXIgbmV4dCA9IChzaG93bkl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzaG93bkl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzaG93SXRlbShuZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldlBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IDApIHtcbiAgICAgICAgICAgIHNob3dJdGVtKGl0ZW1FbHMubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJldlBhZ2VXaG9sZUl0ZW1zID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCksXG4gICAgICAgICAgICAgICAgcHJldlBhZ2VJdGVtID0gcHJldlBhZ2VXaG9sZUl0ZW1zLnBvcCgpIHx8IDA7XG4gICAgICAgICAgICBhbGlnbkl0ZW1SaWdodChwcmV2UGFnZUl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRQYWdlKCkge1xuICAgICAgICBpZiAodmlld3BvcnRFbC5zY3JvbGxMZWZ0ID09PSBhbGxJdGVtc0VsLmNsaWVudFdpZHRoIC0gdmlld3BvcnRFbC5jbGllbnRXaWR0aCkge1xuICAgICAgICAgICAgc2hvd0l0ZW0oMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgY3VycmVudFdob2xlSXRlbXNJblZpZXcgPSBnZXRJdGVtc0luUGFnZVZpZXcodmlld3BvcnRFbC5zY3JvbGxMZWZ0LCB2aWV3cG9ydEVsLnNjcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSxcbiAgICAgICAgICAgICAgICBsYXN0V2hvbGVJdGVtSW5WaWV3ID0gY3VycmVudFdob2xlSXRlbXNJblZpZXcucG9wKCkgfHwgaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgYWxpZ25JdGVtTGVmdChsYXN0V2hvbGVJdGVtSW5WaWV3ICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKG4sIHNob3csIHNvdXJjZSkge1xuICAgICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICAgICAgc291cmNlID0gXCJhcGlcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikgJiYgbiAhPT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbUluZGV4ID0gbjtcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUVsc1tjXS5jbGFzc05hbWUgPSBpdGVtRWxzW2NdLmNsYXNzTmFtZSArIFwiIG8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpdGVtRWxzW2NdLmNsYXNzTmFtZSA9IGl0ZW1FbHNbY10uY2xhc3NOYW1lLnJlcGxhY2UoL1xcYm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcXGIvLCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIHtcbiAgICAgICAgICAgICAgICBpdGVtSUQ6IHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdFByZXZJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgcHJldiA9IChzZWxlY3RlZEl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzZWxlY3RlZEl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNlbGVjdEl0ZW0ocHJldiwgc2hvdywgc291cmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3ROZXh0SXRlbShzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2VsZWN0SXRlbShuZXh0LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dQcmV2UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0UHJldkl0ZW0odHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd05leHRQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3ROZXh0SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7IC8vIGNvcnJlY3QgdGhlIGFsaWdubWVudCBvZiBpdGVtIGluIHZpZXdcbiAgICAgICAgICAgIHNob3dJdGVtKHNob3duSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhuZXdTY3JvbGxMZWZ0LCBuZXdTY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUhhbmRsZXIoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWJvdW5jZU9uUmVzaXplKTtcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSA9IHNldFRpbWVvdXQob25SZXNpemUsIDUwMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kT2JqZWN0cyhvYmpzKSB7XG4gICAgICAgIHZhciBuZXdPYmogPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBvYmpzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG9ianNbY107XG4gICAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3T2JqW3Byb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3T2JqO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFN5bmNJRChpZCkge1xuICAgICAgICBjb25maWcuc3luY0lEID0gaWQ7XG4gICAgICAgIGdhbGxlcnlET00uc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoY29udGFpbmVyRWwsIGNvbmZpZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3luY0lEKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLnN5bmNJRDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzeW5jV2l0aChnYWxsZXJ5SW5zdGFuY2UpIHtcbiAgICAgICAgc2V0U3luY0lEKGdhbGxlcnlJbnN0YW5jZS5nZXRTeW5jSUQoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIG5leHRDb250cm9sRGl2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuICAgICAgICBnYWxsZXJ5RE9NLmRlc3Ryb3lWaWV3cG9ydCh2aWV3cG9ydEVsKTtcbiAgICAgICAgZ2FsbGVyeURPTS5yZW1vdmVDb25maWdEYXRhQXR0cmlidXRlcyhjb250YWluZXJFbCk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJvR2FsbGVyeUl0ZW1TZWxlY3RlZFwiLCBvbkdhbGxlcnlDdXN0b21FdmVudCk7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHJlc2l6ZUhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmIChpc0RhdGFTb3VyY2UoKSkge1xuICAgICAgICBnYWxsZXJ5RE9NLmVtcHR5RWxlbWVudChjb250YWluZXJFbCk7XG4gICAgICAgIGNvbnRhaW5lckVsLmNsYXNzTmFtZSA9IGNvbnRhaW5lckVsLmNsYXNzTmFtZSArIFwiIG8tZ2FsbGVyeVwiO1xuICAgICAgICBhbGxJdGVtc0VsID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpO1xuICAgICAgICBpdGVtRWxzID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtcyhhbGxJdGVtc0VsLCBjb25maWcuaXRlbXMpO1xuICAgIH1cbiAgICBjb25maWcgPSBleHRlbmRPYmplY3RzKFtkZWZhdWx0Q29uZmlnLCBnYWxsZXJ5RE9NLmdldENvbmZpZ0RhdGFBdHRyaWJ1dGVzKGNvbnRhaW5lckVsKSwgY29uZmlnXSk7XG4gICAgZ2FsbGVyeURPTS5zZXRDb25maWdEYXRhQXR0cmlidXRlcyhjb250YWluZXJFbCwgY29uZmlnKTtcbiAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIHZpZXdwb3J0RWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZVZpZXdwb3J0KGFsbEl0ZW1zRWwpO1xuICAgIGl0ZW1FbHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbiAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgIHNob3duSXRlbUluZGV4ID0gc2VsZWN0ZWRJdGVtSW5kZXg7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQoc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgIHNldFdpZHRocygpO1xuICAgIHNldENhcHRpb25TaXplcygpO1xuICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgYWRkVWlDb250cm9scygpO1xuICAgIGxpc3RlbkZvclN5bmNFdmVudHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuICAgIHRoaXMuZ2V0U3luY0lEID0gZ2V0U3luY0lEO1xuICAgIHRoaXMuc3luY1dpdGggPSBzeW5jV2l0aDtcbiAgICB0aGlzLmRlc3Ryb3kgPSBkZXN0cm95O1xuXG4gICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlSZWFkeVwiLCB7XG4gICAgICAgIGdhbGxlcnk6IHRoaXNcbiAgICB9KTtcblxufVxuXG5HYWxsZXJ5LmNyZWF0ZUFsbEluID0gZnVuY3Rpb24oZWwpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgZ0VscyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1vLWNvbXBvbmVudD1vLWdhbGxlcnldXCIpLFxuICAgICAgICBnYWxsZXJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGdFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGdhbGxlcmllcy5wdXNoKG5ldyBHYWxsZXJ5KHtcbiAgICAgICAgICAgIGNvbnRhaW5lcjogZ0Vsc1tjXVxuICAgICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiBnYWxsZXJpZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdhbGxlcnk7IiwiLypnbG9iYWwgbW9kdWxlKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGVtcHR5RWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHdoaWxlICh0YXJnZXRFbC5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhcmdldEVsLnJlbW92ZUNoaWxkKHRhcmdldEVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmlld3BvcnQodGFyZ2V0RWwpIHtcbiAgICB2YXIgcGFyZW50RWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB2aWV3cG9ydEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmlld3BvcnRFbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcIm8tZ2FsbGVyeV9fdmlld3BvcnRcIik7XG4gICAgdmlld3BvcnRFbC5hcHBlbmRDaGlsZCh0YXJnZXRFbCk7XG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQodmlld3BvcnRFbCk7XG4gICAgcmV0dXJuIHZpZXdwb3J0RWw7XG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3lWaWV3cG9ydCh2aWV3cG9ydEVsKSB7XG4gICAgdmFyIHBhcmVudEVsID0gdmlld3BvcnRFbC5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh2aWV3cG9ydEVsLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBwYXJlbnRFbC5hcHBlbmRDaGlsZCh2aWV3cG9ydEVsLmNoaWxkTm9kZXNbMF0pO1xuICAgIH1cbiAgICBwYXJlbnRFbC5yZW1vdmVDaGlsZCh2aWV3cG9ydEVsKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudChub2RlTmFtZSwgY29udGVudCwgY2xhc3Nlcykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZU5hbWUpO1xuICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgY2xhc3Nlcyk7XG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpIHtcbiAgICB2YXIgaXRlbXNMaXN0ID0gY3JlYXRlRWxlbWVudChcIm9sXCIsIFwiXCIsIFwiby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChpdGVtc0xpc3QpO1xuICAgIHJldHVybiBpdGVtc0xpc3Q7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zKGNvbnRhaW5lckVsLCBpdGVtcykge1xuICAgIHZhciBpdGVtQ2xhc3M7XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgaXRlbUNsYXNzID0gXCJvLWdhbGxlcnlfX2l0ZW1cIiArICgoaXRlbXNbY10uc2VsZWN0ZWQpID8gXCIgby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiIDogXCJcIiApO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChjcmVhdGVFbGVtZW50KFwibGlcIiwgXCImbmJzcDtcIiwgaXRlbUNsYXNzKSk7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBpdGVtLCBpdGVtRWwpIHtcbiAgICBlbXB0eUVsZW1lbnQoaXRlbUVsKTtcbiAgICB2YXIgY29udGVudEVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1Db250ZW50LCBcIm8tZ2FsbGVyeV9faXRlbV9fY29udGVudFwiKTtcbiAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKTtcbiAgICBpZiAoY29uZmlnLmNhcHRpb25zKSB7XG4gICAgICAgIHZhciBjYXB0aW9uRWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uaXRlbUNhcHRpb24gfHwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgIGl0ZW1FbC5hcHBlbmRDaGlsZChjYXB0aW9uRWwpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJldkNvbnRyb2woKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJQUkVWXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tcHJldlwiKTtcbn1cbmZ1bmN0aW9uIGdldE5leHRDb250cm9sKCkge1xuICAgIHJldHVybiBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiTkVYVFwiLCBcIm8tZ2FsbGVyeV9fY29udHJvbCBvLWdhbGxlcnlfX2NvbnRyb2wtLW5leHRcIik7XG59XG5cbmZ1bmN0aW9uIHNldENvbmZpZ0RhdGFBdHRyaWJ1dGVzKGVsLCBjb25maWcpIHtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tY29tcG9uZW50XCIsIFwiby1nYWxsZXJ5XCIpO1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1nYWxsZXJ5LXN5bmNpZFwiLCBjb25maWcuc3luY0lEKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiLCBjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpO1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1nYWxsZXJ5LXRvdWNoXCIsIGNvbmZpZy50b3VjaCk7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbnNcIiwgY29uZmlnLmNhcHRpb25zKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWluaGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0KTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWF4SGVpZ2h0KTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoZWwpIHtcbiAgICB2YXIgY29uZmlnID0ge307XG4gICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhjb25maWcsIFwic3luY0lEXCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LXN5bmNpZFwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJtdWx0aXBsZUl0ZW1zUGVyUGFnZVwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJ0b3VjaFwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS10b3VjaFwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJjYXB0aW9uc1wiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9uc1wiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJjYXB0aW9uTWluSGVpZ2h0XCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25taW5oZWlnaHRcIik7XG4gICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhjb25maWcsIFwiY2FwdGlvbk1heEhlaWdodFwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIpO1xuICAgIHJldHVybiBjb25maWc7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNvbmZpZ0RhdGFBdHRyaWJ1dGVzKGVsKSB7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWNvbXBvbmVudFwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tdmVyc2lvblwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1zeW5jaWRcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktbXVsdGlwbGVpdGVtc3BlcnBhZ2VcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktdG91Y2hcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbnNcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1pbmhlaWdodFwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIpO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKG9iaiwgcHJvcE5hbWUsIGVsLCBhdHRyTmFtZSkge1xuICAgIHZhciB2ID0gZWwuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICBpZiAodiAhPT0gbnVsbCkge1xuICAgICAgICBpZiAodiA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgIHYgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgPT09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgdiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIG9ialtwcm9wTmFtZV0gPSB2O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0SXRlbU51bWJlckZyb21FbGVtZW50KGVsKSB7XG4gICAgdmFyIGl0ZW1FbCA9IGVsLFxuICAgICAgICBpdGVtTnVtID0gLTE7XG4gICAgd2hpbGUgKGl0ZW1FbC5wYXJlbnROb2RlLmNsYXNzTmFtZS5pbmRleE9mKFwiby1nYWxsZXJ5X19pdGVtc1wiKSA9PT0gLTEpIHtcbiAgICAgICAgaXRlbUVsID0gaXRlbUVsLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHZhciBpdGVtRWxzID0gaXRlbUVsLnBhcmVudE5vZGUucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBpZiAoaXRlbUVsc1tjXSA9PT0gaXRlbUVsKSB7XG4gICAgICAgICAgICBpdGVtTnVtID0gYztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpdGVtTnVtO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBlbXB0eUVsZW1lbnQ6IGVtcHR5RWxlbWVudCxcbiAgICBjcmVhdGVJdGVtc0xpc3Q6IGNyZWF0ZUl0ZW1zTGlzdCxcbiAgICBjcmVhdGVJdGVtczogY3JlYXRlSXRlbXMsXG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQ6IGluc2VydEl0ZW1Db250ZW50LFxuICAgIGNyZWF0ZVZpZXdwb3J0OiBjcmVhdGVWaWV3cG9ydCxcbiAgICBkZXN0cm95Vmlld3BvcnQ6IGRlc3Ryb3lWaWV3cG9ydCxcbiAgICBnZXRQcmV2Q29udHJvbDogZ2V0UHJldkNvbnRyb2wsXG4gICAgZ2V0TmV4dENvbnRyb2w6IGdldE5leHRDb250cm9sLFxuICAgIHNldENvbmZpZ0RhdGFBdHRyaWJ1dGVzOiBzZXRDb25maWdEYXRhQXR0cmlidXRlcyxcbiAgICBnZXRDb25maWdEYXRhQXR0cmlidXRlczogZ2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMsXG4gICAgcmVtb3ZlQ29uZmlnRGF0YUF0dHJpYnV0ZXM6IHJlbW92ZUNvbmZpZ0RhdGFBdHRyaWJ1dGVzLFxuICAgIGdldEl0ZW1OdW1iZXJGcm9tRWxlbWVudDogZ2V0SXRlbU51bWJlckZyb21FbGVtZW50XG59OyJdfQ==
