require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"hjDe2K":[function(require,module,exports){
/*global require, module*/

var Gallery = require('./src/js/Gallery'),
    galleryConstructor = require('./src/js/galleryConstructor');

module.exports = {
    Gallery: Gallery,
    constructFromPage: function(el) {
        "use strict";
        return galleryConstructor(el || document);
    }
};
},{"./src/js/Gallery":3,"./src/js/galleryConstructor":4}],"o-gallery":[function(require,module,exports){
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
        debounceOnResize = setTimeout(onResize, 500); // Also call on item content insert (for JS source)?
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

module.exports = Gallery;
},{"./galleryDOM":5}],4:[function(require,module,exports){
/*global require, module */
var Gallery = require('./Gallery');

module.exports = function(el) {
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
},{"./Gallery":3}],5:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3Rvci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5cbnZhciBHYWxsZXJ5ID0gcmVxdWlyZSgnLi9zcmMvanMvR2FsbGVyeScpLFxuICAgIGdhbGxlcnlDb25zdHJ1Y3RvciA9IHJlcXVpcmUoJy4vc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3RvcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBHYWxsZXJ5OiBHYWxsZXJ5LFxuICAgIGNvbnN0cnVjdEZyb21QYWdlOiBmdW5jdGlvbihlbCkge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgcmV0dXJuIGdhbGxlcnlDb25zdHJ1Y3RvcihlbCB8fCBkb2N1bWVudCk7XG4gICAgfVxufTsiLCIvKmdsb2JhbCByZXF1aXJlLCBtb2R1bGUqL1xuXG52YXIgZ2FsbGVyeURPTSA9IHJlcXVpcmUoJy4vZ2FsbGVyeURPTScpO1xuXG5mdW5jdGlvbiBHYWxsZXJ5KGNvbmZpZykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGNvbnRhaW5lckVsID0gY29uZmlnLmNvbnRhaW5lcixcbiAgICAgICAgdmlld3BvcnRFbCxcbiAgICAgICAgYWxsSXRlbXNFbCxcbiAgICAgICAgaXRlbUVscyxcbiAgICAgICAgdHJhbnNpdGlvbkR1cmF0aW9uID0gMzAwLFxuICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgc2hvd25JdGVtSW5kZXgsXG4gICAgICAgIGRlYm91bmNlT25SZXNpemUsXG4gICAgICAgIHByZXZDb250cm9sRGl2LFxuICAgICAgICBuZXh0Q29udHJvbERpdixcbiAgICAgICAgZGVmYXVsdENvbmZpZyA9IHtcbiAgICAgICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlOiBmYWxzZSxcbiAgICAgICAgICAgIGNhcHRpb25zOiB0cnVlLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogMjQsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiA1MixcbiAgICAgICAgICAgIHRvdWNoOiBmYWxzZSxcbiAgICAgICAgICAgIHN5bmNJRDogXCJvLWdhbGxlcnktXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNEYXRhU291cmNlKCkge1xuICAgICAgICByZXR1cm4gKGNvbmZpZy5pdGVtcyAmJiBjb25maWcuaXRlbXMubGVuZ3RoID4gMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0V2lkdGhzKCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIGwsXG4gICAgICAgICAgICB0b3RhbFdpZHRoID0gMCxcbiAgICAgICAgICAgIGl0ZW1XaWR0aCA9IGNvbnRhaW5lckVsLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBpdGVtV2lkdGggPSBwYXJzZUludChpdGVtRWxzW3NlbGVjdGVkSXRlbUluZGV4XS5jbGllbnRXaWR0aCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaXRlbUVsc1tpXS5zdHlsZS53aWR0aCA9IGl0ZW1XaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggKz0gaXRlbVdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGFsbEl0ZW1zRWwuc3R5bGUud2lkdGggPSB0b3RhbFdpZHRoICsgXCJweFwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWRJdGVtKG4pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgbiA9PT0gXCJudW1iZXJcIiAmJiBuID4gLTEgJiYgbiA8IGl0ZW1FbHMubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZEl0ZW0oKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSAwLCBjLCBsO1xuICAgICAgICBmb3IgKGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGlmIChpdGVtRWxzW2NdLmNsYXNzTmFtZS5pbmRleE9mKFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKSA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSBjO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkVWlDb250cm9scygpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmdldFByZXZDb250cm9sKCk7XG4gICAgICAgIG5leHRDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5nZXROZXh0Q29udHJvbCgpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHByZXYpO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgbmV4dCk7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgdmlld3BvcnRFbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgICAgIHZhciBjbGlja2VkSXRlbU51bSA9IGdhbGxlcnlET00uZ2V0SXRlbU51bWJlckZyb21FbGVtZW50KGV2dC5zcmNFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKGNsaWNrZWRJdGVtTnVtLCB0cnVlLCBcInVzZXJcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldENhcHRpb25TaXplcygpIHtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW1FbCA9IGl0ZW1FbHNbY107XG4gICAgICAgICAgICBpdGVtRWwuc3R5bGUucGFkZGluZ0JvdHRvbSA9IGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgdmFyIGNhcHRpb25FbCA9IGl0ZW1FbC5xdWVyeVNlbGVjdG9yKFwiLm8tZ2FsbGVyeV9faXRlbV9fY2FwdGlvblwiKTtcbiAgICAgICAgICAgIGlmIChjYXB0aW9uRWwpIHtcbiAgICAgICAgICAgICAgICBjYXB0aW9uRWwuc3R5bGUubWluSGVpZ2h0ID0gY29uZmlnLmNhcHRpb25NaW5IZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICAgICAgY2FwdGlvbkVsLnN0eWxlLm1heEhlaWdodCA9IGNvbmZpZy5jYXB0aW9uTWF4SGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zZXJ0SXRlbUNvbnRlbnQobikge1xuICAgICAgICB2YXIgaXRlbU51bXMgPSAobiBpbnN0YW5jZW9mIEFycmF5KSA/IG4gOiBbbl07XG4gICAgICAgIGlmIChjb25maWcuaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbU51bXMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW1OdW0gPSBpdGVtTnVtc1tjXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZEl0ZW0oaXRlbU51bSkgJiYgIWNvbmZpZy5pdGVtc1tpdGVtTnVtXS5pbnNlcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLmluc2VydEl0ZW1Db250ZW50KGNvbmZpZywgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLCBpdGVtRWxzW2l0ZW1OdW1dKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc2V0Q2FwdGlvblNpemVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNXaG9sZUl0ZW1JblBhZ2VWaWV3KGl0ZW1OdW0sIGwsIHIpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsICYmIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCArIGl0ZW1FbHNbaXRlbU51bV0uY2xpZW50V2lkdGggPD0gcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0FueVBhcnRPZkl0ZW1JblBhZ2VWaWV3KGl0ZW1OdW0sIGwsIHIpIHtcbiAgICAgICAgcmV0dXJuIChpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPj0gbCAtIGl0ZW1FbHNbaXRlbU51bV0uY2xpZW50V2lkdGggJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0IDw9IHIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEl0ZW1zSW5QYWdlVmlldyhsLCByLCB3aG9sZSkge1xuICAgICAgICB2YXIgaXRlbXNJblZpZXcgPSBbXSxcbiAgICAgICAgICAgIG9ubHlXaG9sZSA9ICh0eXBlb2Ygd2hvbGUgIT09IFwiYm9vbGVhblwiKSA/IHRydWUgOiB3aG9sZTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBpdGVtRWxzLmxlbmd0aDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoKG9ubHlXaG9sZSAmJiBpc1dob2xlSXRlbUluUGFnZVZpZXcoYywgbCwgcikpIHx8ICghb25seVdob2xlICYmIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoYywgbCwgcikpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXNJblZpZXcucHVzaChjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXRlbXNJblZpZXc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhbnNpdGlvblRvKG5ld1Njcm9sbExlZnQpIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgY2hhbmdlID0gbmV3U2Nyb2xsTGVmdCAtIHN0YXJ0LFxuICAgICAgICAgICAgY3VycmVudFRpbWUgPSAwLFxuICAgICAgICAgICAgaW5jcmVtZW50ID0gMjAsXG4gICAgICAgICAgICB0aW1lb3V0O1xuICAgICAgICAvLyB0ID0gY3VycmVudCB0aW1lLCBiID0gc3RhcnQgdmFsdWUsIGMgPSBjaGFuZ2UgaW4gdmFsdWUsIGQgPSBkdXJhdGlvblxuICAgICAgICBmdW5jdGlvbiBlYXNlSW5PdXRRdWFkKHQsIGIsIGMsIGQpIHtcbiAgICAgICAgICAgIHQgLz0gZC8yO1xuICAgICAgICAgICAgaWYgKHQgPCAxKSB7IHJldHVybiBjLzIqdCp0ICsgYjsgfVxuICAgICAgICAgICAgdC0tO1xuICAgICAgICAgICAgcmV0dXJuIC1jLzIgKiAodCoodC0yKSAtIDEpICsgYjtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBhbmltYXRlU2Nyb2xsKCkge1xuICAgICAgICAgICAgY3VycmVudFRpbWUgKz0gaW5jcmVtZW50O1xuICAgICAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gZWFzZUluT3V0UXVhZChjdXJyZW50VGltZSwgc3RhcnQsIGNoYW5nZSwgdHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA8IHRyYW5zaXRpb25EdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChhbmltYXRlU2Nyb2xsLCBpbmNyZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFuaW1hdGVTY3JvbGwoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkdhbGxlcnlDdXN0b21FdmVudChldnQpIHtcbiAgICAgICAgaWYgKGV2dC5zcmNFbGVtZW50ICE9PSBjb250YWluZXJFbCAmJiBldnQuZGV0YWlsLnN5bmNJRCA9PT0gY29uZmlnLnN5bmNJRCAmJiBldnQuZGV0YWlsLnNvdXJjZSA9PT0gXCJ1c2VyXCIpIHtcbiAgICAgICAgICAgIHNlbGVjdEl0ZW0oZXZ0LmRldGFpbC5pdGVtSUQsIHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuRm9yU3luY0V2ZW50cygpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmlnZ2VyRXZlbnQobmFtZSwgZGF0YSkge1xuICAgICAgICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgICAgICAgZGF0YS5zeW5jSUQgPSBjb25maWcuc3luY0lEO1xuICAgICAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQobmFtZSwge1xuICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgZGV0YWlsOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBjb250YWluZXJFbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3ZlVmlld3BvcnQobGVmdCwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRyYW5zaXRpb25UbyhsZWZ0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IGxlZnQ7XG4gICAgICAgIH1cbiAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KGxlZnQsIGxlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFsaWduSXRlbUxlZnQobiwgdHJhbnNpdGlvbikge1xuICAgICAgICBtb3ZlVmlld3BvcnQoaXRlbUVsc1tuXS5vZmZzZXRMZWZ0LCB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1SaWdodChuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIHZhciBuZXdTY3JvbGxMZWZ0ID0gaXRlbUVsc1tuXS5vZmZzZXRMZWZ0IC0gKHZpZXdwb3J0RWwuY2xpZW50V2lkdGggLSBpdGVtRWxzW25dLmNsaWVudFdpZHRoKTtcbiAgICAgICAgbW92ZVZpZXdwb3J0KG5ld1Njcm9sbExlZnQsIHRyYW5zaXRpb24pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJyaW5nSXRlbUludG9WaWV3KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKCFpc1ZhbGlkSXRlbShuKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2aWV3cG9ydEwgPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQsXG4gICAgICAgICAgICB2aWV3cG9ydFIgPSB2aWV3cG9ydEwgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLFxuICAgICAgICAgICAgaXRlbUwgPSBpdGVtRWxzW25dLm9mZnNldExlZnQsXG4gICAgICAgICAgICBpdGVtUiA9IGl0ZW1MICsgaXRlbUVsc1tuXS5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKGl0ZW1MID4gdmlld3BvcnRMICYmIGl0ZW1SIDwgdmlld3BvcnRSKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0ZW1MIDwgdmlld3BvcnRMKSB7XG4gICAgICAgICAgICBhbGlnbkl0ZW1MZWZ0KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW1SID4gdmlld3BvcnRSKSB7XG4gICAgICAgICAgICBhbGlnbkl0ZW1SaWdodChuLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dJdGVtKG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBicmluZ0l0ZW1JbnRvVmlldyhuLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgICAgIHNob3duSXRlbUluZGV4ID0gbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dQcmV2SXRlbSgpIHtcbiAgICAgICAgdmFyIHByZXYgPSAoc2hvd25JdGVtSW5kZXggLSAxID49IDApID8gc2hvd25JdGVtSW5kZXggLSAxIDogaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICBzaG93SXRlbShwcmV2KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dEl0ZW0oKSB7XG4gICAgICAgIHZhciBuZXh0ID0gKHNob3duSXRlbUluZGV4ICsgMSA8IGl0ZW1FbHMubGVuZ3RoKSA/IHNob3duSXRlbUluZGV4ICsgMSA6IDA7XG4gICAgICAgIHNob3dJdGVtKG5leHQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dQcmV2UGFnZSgpIHtcbiAgICAgICAgaWYgKHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9PT0gMCkge1xuICAgICAgICAgICAgc2hvd0l0ZW0oaXRlbUVscy5sZW5ndGggLSAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmV2UGFnZVdob2xlSXRlbXMgPSBnZXRJdGVtc0luUGFnZVZpZXcodmlld3BvcnRFbC5zY3JvbGxMZWZ0IC0gdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgdmlld3BvcnRFbC5zY3JvbGxMZWZ0KSxcbiAgICAgICAgICAgICAgICBwcmV2UGFnZUl0ZW0gPSBwcmV2UGFnZVdob2xlSXRlbXMucG9wKCkgfHwgMDtcbiAgICAgICAgICAgIGFsaWduSXRlbVJpZ2h0KHByZXZQYWdlSXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dFBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzaG93SXRlbSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50V2hvbGVJdGVtc0luVmlldyA9IGdldEl0ZW1zSW5QYWdlVmlldyh2aWV3cG9ydEVsLnNjcm9sbExlZnQsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpLFxuICAgICAgICAgICAgICAgIGxhc3RXaG9sZUl0ZW1JblZpZXcgPSBjdXJyZW50V2hvbGVJdGVtc0luVmlldy5wb3AoKSB8fCBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBhbGlnbkl0ZW1MZWZ0KGxhc3RXaG9sZUl0ZW1JblZpZXcgKyAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdEl0ZW0obiwgc2hvdywgc291cmNlKSB7XG4gICAgICAgIGlmICghc291cmNlKSB7XG4gICAgICAgICAgICBzb3VyY2UgPSBcImFwaVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1ZhbGlkSXRlbShuKSAmJiBuICE9PSBzZWxlY3RlZEl0ZW1JbmRleCkge1xuICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBuO1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgIGlmIChjID09PSBzZWxlY3RlZEl0ZW1JbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtRWxzW2NdLmNsYXNzTmFtZSA9IGl0ZW1FbHNbY10uY2xhc3NOYW1lICsgXCIgby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1FbHNbY10uY2xhc3NOYW1lID0gaXRlbUVsc1tjXS5jbGFzc05hbWUucmVwbGFjZSgvXFxiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFxcYi8sJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzaG93KSB7XG4gICAgICAgICAgICAgICAgc2hvd0l0ZW0oc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwge1xuICAgICAgICAgICAgICAgIGl0ZW1JRDogc2VsZWN0ZWRJdGVtSW5kZXgsXG4gICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0UHJldkl0ZW0oc2hvdywgc291cmNlKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNlbGVjdGVkSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNlbGVjdGVkSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2VsZWN0SXRlbShwcmV2LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdE5leHRJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgbmV4dCA9IChzZWxlY3RlZEl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzZWxlY3RlZEl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzZWxlY3RJdGVtKG5leHQsIHNob3csIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJldigpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd1ByZXZQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RQcmV2SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzaG93TmV4dFBhZ2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdE5leHRJdGVtKHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzaXplKCkge1xuICAgICAgICBzZXRXaWR0aHMoKTtcbiAgICAgICAgaWYgKCFjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHsgLy8gY29ycmVjdCB0aGUgYWxpZ25tZW50IG9mIGl0ZW0gaW4gdmlld1xuICAgICAgICAgICAgc2hvd0l0ZW0oc2hvd25JdGVtSW5kZXgsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdTY3JvbGxMZWZ0ID0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0O1xuICAgICAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KG5ld1Njcm9sbExlZnQsIG5ld1Njcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzaXplSGFuZGxlcigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlT25SZXNpemUpO1xuICAgICAgICBkZWJvdW5jZU9uUmVzaXplID0gc2V0VGltZW91dChvblJlc2l6ZSwgNTAwKTsgLy8gQWxzbyBjYWxsIG9uIGl0ZW0gY29udGVudCBpbnNlcnQgKGZvciBKUyBzb3VyY2UpP1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4dGVuZE9iamVjdHMob2Jqcykge1xuICAgICAgICB2YXIgbmV3T2JqID0ge307XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gb2Jqcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBvYmpzW2NdO1xuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld09ialtwcm9wXSA9IG9ialtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld09iajtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRTeW5jSUQoaWQpIHtcbiAgICAgICAgY29uZmlnLnN5bmNJRCA9IGlkO1xuICAgICAgICBnYWxsZXJ5RE9NLnNldENvbmZpZ0RhdGFBdHRyaWJ1dGVzKGNvbnRhaW5lckVsLCBjb25maWcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFN5bmNJRCgpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5zeW5jSUQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3luY1dpdGgoZ2FsbGVyeUluc3RhbmNlKSB7XG4gICAgICAgIHNldFN5bmNJRChnYWxsZXJ5SW5zdGFuY2UuZ2V0U3luY0lEKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgICAgIHByZXZDb250cm9sRGl2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocHJldkNvbnRyb2xEaXYpO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgZ2FsbGVyeURPTS5kZXN0cm95Vmlld3BvcnQodmlld3BvcnRFbCk7XG4gICAgICAgIGdhbGxlcnlET00ucmVtb3ZlQ29uZmlnRGF0YUF0dHJpYnV0ZXMoY29udGFpbmVyRWwpO1xuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwgb25HYWxsZXJ5Q3VzdG9tRXZlbnQpO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCByZXNpemVIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5lbXB0eUVsZW1lbnQoY29udGFpbmVyRWwpO1xuICAgICAgICBjb250YWluZXJFbC5jbGFzc05hbWUgPSBjb250YWluZXJFbC5jbGFzc05hbWUgKyBcIiBvLWdhbGxlcnlcIjtcbiAgICAgICAgYWxsSXRlbXNFbCA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKTtcbiAgICAgICAgaXRlbUVscyA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXMoYWxsSXRlbXNFbCwgY29uZmlnLml0ZW1zKTtcbiAgICB9XG4gICAgY29uZmlnID0gZXh0ZW5kT2JqZWN0cyhbZGVmYXVsdENvbmZpZywgZ2FsbGVyeURPTS5nZXRDb25maWdEYXRhQXR0cmlidXRlcyhjb250YWluZXJFbCksIGNvbmZpZ10pO1xuICAgIGdhbGxlcnlET00uc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoY29udGFpbmVyRWwsIGNvbmZpZyk7XG4gICAgYWxsSXRlbXNFbCA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICB2aWV3cG9ydEVsID0gZ2FsbGVyeURPTS5jcmVhdGVWaWV3cG9ydChhbGxJdGVtc0VsKTtcbiAgICBpdGVtRWxzID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG4gICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBnZXRTZWxlY3RlZEl0ZW0oKTtcbiAgICBzaG93bkl0ZW1JbmRleCA9IHNlbGVjdGVkSXRlbUluZGV4O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHJlc2l6ZUhhbmRsZXIpO1xuICAgIGluc2VydEl0ZW1Db250ZW50KHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICBzZXRXaWR0aHMoKTtcbiAgICBzZXRDYXB0aW9uU2l6ZXMoKTtcbiAgICBzaG93SXRlbShzZWxlY3RlZEl0ZW1JbmRleCwgZmFsc2UpO1xuICAgIGFkZFVpQ29udHJvbHMoKTtcbiAgICBsaXN0ZW5Gb3JTeW5jRXZlbnRzKCk7XG5cbiAgICB0aGlzLnNob3dJdGVtID0gc2hvd0l0ZW07XG4gICAgdGhpcy5nZXRTZWxlY3RlZEl0ZW0gPSBnZXRTZWxlY3RlZEl0ZW07XG4gICAgdGhpcy5zaG93UHJldkl0ZW0gPSBzaG93UHJldkl0ZW07XG4gICAgdGhpcy5zaG93TmV4dEl0ZW0gPSBzaG93TmV4dEl0ZW07XG4gICAgdGhpcy5zaG93UHJldlBhZ2UgPSBzaG93UHJldlBhZ2U7XG4gICAgdGhpcy5zaG93TmV4dFBhZ2UgPSBzaG93TmV4dFBhZ2U7XG4gICAgdGhpcy5zZWxlY3RJdGVtID0gc2VsZWN0SXRlbTtcbiAgICB0aGlzLnNlbGVjdFByZXZJdGVtID0gc2VsZWN0UHJldkl0ZW07XG4gICAgdGhpcy5zZWxlY3ROZXh0SXRlbSA9IHNlbGVjdE5leHRJdGVtO1xuICAgIHRoaXMubmV4dCA9IG5leHQ7XG4gICAgdGhpcy5wcmV2ID0gcHJldjtcbiAgICB0aGlzLmdldFN5bmNJRCA9IGdldFN5bmNJRDtcbiAgICB0aGlzLnN5bmNXaXRoID0gc3luY1dpdGg7XG4gICAgdGhpcy5kZXN0cm95ID0gZGVzdHJveTtcblxuICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5UmVhZHlcIiwge1xuICAgICAgICBnYWxsZXJ5OiB0aGlzXG4gICAgfSk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHYWxsZXJ5OyIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSAqL1xudmFyIEdhbGxlcnkgPSByZXF1aXJlKCcuL0dhbGxlcnknKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBnRWxzID0gZWwucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLW8tY29tcG9uZW50PW8tZ2FsbGVyeV1cIiksXG4gICAgICAgIGdhbGxlcmllcyA9IFtdO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gZ0Vscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgZ2FsbGVyaWVzLnB1c2gobmV3IEdhbGxlcnkoe1xuICAgICAgICAgICAgY29udGFpbmVyOiBnRWxzW2NdXG4gICAgICAgIH0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGdhbGxlcmllcztcbn07IiwiLypnbG9iYWwgbW9kdWxlKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGVtcHR5RWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHdoaWxlICh0YXJnZXRFbC5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhcmdldEVsLnJlbW92ZUNoaWxkKHRhcmdldEVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmlld3BvcnQodGFyZ2V0RWwpIHtcbiAgICB2YXIgcGFyZW50RWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB2aWV3cG9ydEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmlld3BvcnRFbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcIm8tZ2FsbGVyeV9fdmlld3BvcnRcIik7XG4gICAgdmlld3BvcnRFbC5hcHBlbmRDaGlsZCh0YXJnZXRFbCk7XG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQodmlld3BvcnRFbCk7XG4gICAgcmV0dXJuIHZpZXdwb3J0RWw7XG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3lWaWV3cG9ydCh2aWV3cG9ydEVsKSB7XG4gICAgdmFyIHBhcmVudEVsID0gdmlld3BvcnRFbC5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh2aWV3cG9ydEVsLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBwYXJlbnRFbC5hcHBlbmRDaGlsZCh2aWV3cG9ydEVsLmNoaWxkTm9kZXNbMF0pO1xuICAgIH1cbiAgICBwYXJlbnRFbC5yZW1vdmVDaGlsZCh2aWV3cG9ydEVsKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudChub2RlTmFtZSwgY29udGVudCwgY2xhc3Nlcykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZU5hbWUpO1xuICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgY2xhc3Nlcyk7XG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpIHtcbiAgICB2YXIgaXRlbXNMaXN0ID0gY3JlYXRlRWxlbWVudChcIm9sXCIsIFwiXCIsIFwiby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChpdGVtc0xpc3QpO1xuICAgIHJldHVybiBpdGVtc0xpc3Q7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zKGNvbnRhaW5lckVsLCBpdGVtcykge1xuICAgIHZhciBpdGVtQ2xhc3M7XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgaXRlbUNsYXNzID0gXCJvLWdhbGxlcnlfX2l0ZW1cIiArICgoaXRlbXNbY10uc2VsZWN0ZWQpID8gXCIgby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiIDogXCJcIiApO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChjcmVhdGVFbGVtZW50KFwibGlcIiwgXCImbmJzcDtcIiwgaXRlbUNsYXNzKSk7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBpdGVtLCBpdGVtRWwpIHtcbiAgICBlbXB0eUVsZW1lbnQoaXRlbUVsKTtcbiAgICB2YXIgY29udGVudEVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1Db250ZW50LCBcIm8tZ2FsbGVyeV9faXRlbV9fY29udGVudFwiKTtcbiAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKTtcbiAgICBpZiAoY29uZmlnLmNhcHRpb25zKSB7XG4gICAgICAgIHZhciBjYXB0aW9uRWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uaXRlbUNhcHRpb24gfHwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgIGl0ZW1FbC5hcHBlbmRDaGlsZChjYXB0aW9uRWwpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJldkNvbnRyb2woKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJQUkVWXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tcHJldlwiKTtcbn1cbmZ1bmN0aW9uIGdldE5leHRDb250cm9sKCkge1xuICAgIHJldHVybiBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiTkVYVFwiLCBcIm8tZ2FsbGVyeV9fY29udHJvbCBvLWdhbGxlcnlfX2NvbnRyb2wtLW5leHRcIik7XG59XG5cbmZ1bmN0aW9uIHNldENvbmZpZ0RhdGFBdHRyaWJ1dGVzKGVsLCBjb25maWcpIHtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tY29tcG9uZW50XCIsIFwiby1nYWxsZXJ5XCIpO1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1nYWxsZXJ5LXN5bmNpZFwiLCBjb25maWcuc3luY0lEKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiLCBjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpO1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1nYWxsZXJ5LXRvdWNoXCIsIGNvbmZpZy50b3VjaCk7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbnNcIiwgY29uZmlnLmNhcHRpb25zKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWluaGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0KTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWF4SGVpZ2h0KTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoZWwpIHtcbiAgICB2YXIgY29uZmlnID0ge307XG4gICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhjb25maWcsIFwic3luY0lEXCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LXN5bmNpZFwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJtdWx0aXBsZUl0ZW1zUGVyUGFnZVwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJ0b3VjaFwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS10b3VjaFwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJjYXB0aW9uc1wiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9uc1wiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJjYXB0aW9uTWluSGVpZ2h0XCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25taW5oZWlnaHRcIik7XG4gICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhjb25maWcsIFwiY2FwdGlvbk1heEhlaWdodFwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIpO1xuICAgIHJldHVybiBjb25maWc7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNvbmZpZ0RhdGFBdHRyaWJ1dGVzKGVsKSB7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWNvbXBvbmVudFwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tdmVyc2lvblwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1zeW5jaWRcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktbXVsdGlwbGVpdGVtc3BlcnBhZ2VcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktdG91Y2hcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbnNcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1pbmhlaWdodFwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIpO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKG9iaiwgcHJvcE5hbWUsIGVsLCBhdHRyTmFtZSkge1xuICAgIHZhciB2ID0gZWwuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICBpZiAodiAhPT0gbnVsbCkge1xuICAgICAgICBpZiAodiA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgIHYgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgPT09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgdiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIG9ialtwcm9wTmFtZV0gPSB2O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0SXRlbU51bWJlckZyb21FbGVtZW50KGVsKSB7XG4gICAgdmFyIGl0ZW1FbCA9IGVsLFxuICAgICAgICBpdGVtTnVtID0gLTE7XG4gICAgd2hpbGUgKGl0ZW1FbC5wYXJlbnROb2RlLmNsYXNzTmFtZS5pbmRleE9mKFwiby1nYWxsZXJ5X19pdGVtc1wiKSA9PT0gLTEpIHtcbiAgICAgICAgaXRlbUVsID0gaXRlbUVsLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHZhciBpdGVtRWxzID0gaXRlbUVsLnBhcmVudE5vZGUucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBpZiAoaXRlbUVsc1tjXSA9PT0gaXRlbUVsKSB7XG4gICAgICAgICAgICBpdGVtTnVtID0gYztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpdGVtTnVtO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBlbXB0eUVsZW1lbnQ6IGVtcHR5RWxlbWVudCxcbiAgICBjcmVhdGVJdGVtc0xpc3Q6IGNyZWF0ZUl0ZW1zTGlzdCxcbiAgICBjcmVhdGVJdGVtczogY3JlYXRlSXRlbXMsXG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQ6IGluc2VydEl0ZW1Db250ZW50LFxuICAgIGNyZWF0ZVZpZXdwb3J0OiBjcmVhdGVWaWV3cG9ydCxcbiAgICBkZXN0cm95Vmlld3BvcnQ6IGRlc3Ryb3lWaWV3cG9ydCxcbiAgICBnZXRQcmV2Q29udHJvbDogZ2V0UHJldkNvbnRyb2wsXG4gICAgZ2V0TmV4dENvbnRyb2w6IGdldE5leHRDb250cm9sLFxuICAgIHNldENvbmZpZ0RhdGFBdHRyaWJ1dGVzOiBzZXRDb25maWdEYXRhQXR0cmlidXRlcyxcbiAgICBnZXRDb25maWdEYXRhQXR0cmlidXRlczogZ2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMsXG4gICAgcmVtb3ZlQ29uZmlnRGF0YUF0dHJpYnV0ZXM6IHJlbW92ZUNvbmZpZ0RhdGFBdHRyaWJ1dGVzLFxuICAgIGdldEl0ZW1OdW1iZXJGcm9tRWxlbWVudDogZ2V0SXRlbU51bWJlckZyb21FbGVtZW50XG59OyJdfQ==
