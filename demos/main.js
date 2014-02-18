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

var galleryDOM = require('./galleryDOM.js');

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
            captionMinHeight: 10,
            captionMaxHeight: 50,
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
                selectItem(clickedItemNum, false, "user");
            });
        }
    }

    function insertItemContent(n) {
        var itemNums = (n instanceof Array) ? n : [n];
        if (config.items) {
            for (var c = 0, l = itemNums.length; c < l; c++) {
                var itemNum = itemNums[c];
                if (isValidItem(itemNum) && !config.items[itemNum].inserted) {
                    galleryDOM.insertItemContent(config.items[itemNum], itemEls[itemNum]);
                    config.items[itemNum].inserted = true;
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
},{"./galleryDOM.js":5}],4:[function(require,module,exports){
/*global require, module */
var Gallery = require('./Gallery.js');

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
},{"./Gallery.js":3}],5:[function(require,module,exports){
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

function getConfigDataAttributes(el) {
    var config = {};
    setPropertyIfAttributeExists(config, "syncID", el, "data-o-gallery-syncid");
    setPropertyIfAttributeExists(config, "multipleItemsPerPage", el, "data-o-gallery-multipleitemsperpage");
    setPropertyIfAttributeExists(config, "touch", el, "data-o-gallery-touch");
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
    el.removeAttribute("data-o-gallery-captionminheight");
    el.removeAttribute("data-o-gallery-captionmaxheight");
}

function setPropertyIfAttributeExists(obj, propName, el, attrName) {
    var v = el.getAttribute(attrName);
    if (v !== null) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3Rvci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cblxudmFyIEdhbGxlcnkgPSByZXF1aXJlKCcuL3NyYy9qcy9HYWxsZXJ5JyksXG4gICAgZ2FsbGVyeUNvbnN0cnVjdG9yID0gcmVxdWlyZSgnLi9zcmMvanMvZ2FsbGVyeUNvbnN0cnVjdG9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEdhbGxlcnk6IEdhbGxlcnksXG4gICAgY29uc3RydWN0RnJvbVBhZ2U6IGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICByZXR1cm4gZ2FsbGVyeUNvbnN0cnVjdG9yKGVsIHx8IGRvY3VtZW50KTtcbiAgICB9XG59OyIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5cbnZhciBnYWxsZXJ5RE9NID0gcmVxdWlyZSgnLi9nYWxsZXJ5RE9NLmpzJyk7XG5cbmZ1bmN0aW9uIEdhbGxlcnkoY29uZmlnKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgY29udGFpbmVyRWwgPSBjb25maWcuY29udGFpbmVyLFxuICAgICAgICB2aWV3cG9ydEVsLFxuICAgICAgICBhbGxJdGVtc0VsLFxuICAgICAgICBpdGVtRWxzLFxuICAgICAgICB0cmFuc2l0aW9uRHVyYXRpb24gPSAzMDAsXG4gICAgICAgIHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICBzaG93bkl0ZW1JbmRleCxcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSxcbiAgICAgICAgcHJldkNvbnRyb2xEaXYsXG4gICAgICAgIG5leHRDb250cm9sRGl2LFxuICAgICAgICBkZWZhdWx0Q29uZmlnID0ge1xuICAgICAgICAgICAgbXVsdGlwbGVJdGVtc1BlclBhZ2U6IGZhbHNlLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogMTAsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiA1MCxcbiAgICAgICAgICAgIHRvdWNoOiBmYWxzZSxcbiAgICAgICAgICAgIHN5bmNJRDogXCJvLWdhbGxlcnktXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNEYXRhU291cmNlKCkge1xuICAgICAgICByZXR1cm4gKGNvbmZpZy5pdGVtcyAmJiBjb25maWcuaXRlbXMubGVuZ3RoID4gMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0V2lkdGhzKCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIGwsXG4gICAgICAgICAgICB0b3RhbFdpZHRoID0gMCxcbiAgICAgICAgICAgIGl0ZW1XaWR0aCA9IGNvbnRhaW5lckVsLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBpdGVtV2lkdGggPSBwYXJzZUludChpdGVtRWxzW3NlbGVjdGVkSXRlbUluZGV4XS5jbGllbnRXaWR0aCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaXRlbUVsc1tpXS5zdHlsZS53aWR0aCA9IGl0ZW1XaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggKz0gaXRlbVdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGFsbEl0ZW1zRWwuc3R5bGUud2lkdGggPSB0b3RhbFdpZHRoICsgXCJweFwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWRJdGVtKG4pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgbiA9PT0gXCJudW1iZXJcIiAmJiBuID4gLTEgJiYgbiA8IGl0ZW1FbHMubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZEl0ZW0oKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSAwLCBjLCBsO1xuICAgICAgICBmb3IgKGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGlmIChpdGVtRWxzW2NdLmNsYXNzTmFtZS5pbmRleE9mKFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKSA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSBjO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkVWlDb250cm9scygpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmdldFByZXZDb250cm9sKCk7XG4gICAgICAgIG5leHRDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5nZXROZXh0Q29udHJvbCgpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHByZXYpO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgbmV4dCk7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgdmlld3BvcnRFbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgICAgIHZhciBjbGlja2VkSXRlbU51bSA9IGdhbGxlcnlET00uZ2V0SXRlbU51bWJlckZyb21FbGVtZW50KGV2dC5zcmNFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKGNsaWNrZWRJdGVtTnVtLCBmYWxzZSwgXCJ1c2VyXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChuKSB7XG4gICAgICAgIHZhciBpdGVtTnVtcyA9IChuIGluc3RhbmNlb2YgQXJyYXkpID8gbiA6IFtuXTtcbiAgICAgICAgaWYgKGNvbmZpZy5pdGVtcykge1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtTnVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbU51bSA9IGl0ZW1OdW1zW2NdO1xuICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSXRlbShpdGVtTnVtKSAmJiAhY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLml0ZW1zW2l0ZW1OdW1dLCBpdGVtRWxzW2l0ZW1OdW1dKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1dob2xlSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ICsgaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCA8PSByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gKGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsIC0gaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPD0gcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SXRlbXNJblBhZ2VWaWV3KGwsIHIsIHdob2xlKSB7XG4gICAgICAgIHZhciBpdGVtc0luVmlldyA9IFtdLFxuICAgICAgICAgICAgb25seVdob2xlID0gKHR5cGVvZiB3aG9sZSAhPT0gXCJib29sZWFuXCIpID8gdHJ1ZSA6IHdob2xlO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGl0ZW1FbHMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGlmICgob25seVdob2xlICYmIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkgfHwgKCFvbmx5V2hvbGUgJiYgaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtc0luVmlldy5wdXNoKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpdGVtc0luVmlldztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc2l0aW9uVG8obmV3U2Nyb2xsTGVmdCkge1xuICAgICAgICB2YXIgc3RhcnQgPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQsXG4gICAgICAgICAgICBjaGFuZ2UgPSBuZXdTY3JvbGxMZWZ0IC0gc3RhcnQsXG4gICAgICAgICAgICBjdXJyZW50VGltZSA9IDAsXG4gICAgICAgICAgICBpbmNyZW1lbnQgPSAyMCxcbiAgICAgICAgICAgIHRpbWVvdXQ7XG4gICAgICAgIC8vIHQgPSBjdXJyZW50IHRpbWUsIGIgPSBzdGFydCB2YWx1ZSwgYyA9IGNoYW5nZSBpbiB2YWx1ZSwgZCA9IGR1cmF0aW9uXG4gICAgICAgIGZ1bmN0aW9uIGVhc2VJbk91dFF1YWQodCwgYiwgYywgZCkge1xuICAgICAgICAgICAgdCAvPSBkLzI7XG4gICAgICAgICAgICBpZiAodCA8IDEpIHsgcmV0dXJuIGMvMip0KnQgKyBiOyB9XG4gICAgICAgICAgICB0LS07XG4gICAgICAgICAgICByZXR1cm4gLWMvMiAqICh0Kih0LTIpIC0gMSkgKyBiO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGFuaW1hdGVTY3JvbGwoKSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZSArPSBpbmNyZW1lbnQ7XG4gICAgICAgICAgICB2aWV3cG9ydEVsLnNjcm9sbExlZnQgPSBlYXNlSW5PdXRRdWFkKGN1cnJlbnRUaW1lLCBzdGFydCwgY2hhbmdlLCB0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDwgdHJhbnNpdGlvbkR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGFuaW1hdGVTY3JvbGwsIGluY3JlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYW5pbWF0ZVNjcm9sbCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uR2FsbGVyeUN1c3RvbUV2ZW50KGV2dCkge1xuICAgICAgICBpZiAoZXZ0LnNyY0VsZW1lbnQgIT09IGNvbnRhaW5lckVsICYmIGV2dC5kZXRhaWwuc3luY0lEID09PSBjb25maWcuc3luY0lEICYmIGV2dC5kZXRhaWwuc291cmNlID09PSBcInVzZXJcIikge1xuICAgICAgICAgICAgc2VsZWN0SXRlbShldnQuZGV0YWlsLml0ZW1JRCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5Gb3JTeW5jRXZlbnRzKCkge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwgb25HYWxsZXJ5Q3VzdG9tRXZlbnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyaWdnZXJFdmVudChuYW1lLCBkYXRhKSB7XG4gICAgICAgIGRhdGEgPSBkYXRhIHx8IHt9O1xuICAgICAgICBkYXRhLnN5bmNJRCA9IGNvbmZpZy5zeW5jSUQ7XG4gICAgICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudChuYW1lLCB7XG4gICAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgICAgY2FuY2VsYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBkZXRhaWw6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRhaW5lckVsLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdmVWaWV3cG9ydChsZWZ0LCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdHJhbnNpdGlvblRvKGxlZnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gbGVmdDtcbiAgICAgICAgfVxuICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcobGVmdCwgbGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxpZ25JdGVtTGVmdChuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIG1vdmVWaWV3cG9ydChpdGVtRWxzW25dLm9mZnNldExlZnQsIHRyYW5zaXRpb24pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFsaWduSXRlbVJpZ2h0KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgdmFyIG5ld1Njcm9sbExlZnQgPSBpdGVtRWxzW25dLm9mZnNldExlZnQgLSAodmlld3BvcnRFbC5jbGllbnRXaWR0aCAtIGl0ZW1FbHNbbl0uY2xpZW50V2lkdGgpO1xuICAgICAgICBtb3ZlVmlld3BvcnQobmV3U2Nyb2xsTGVmdCwgdHJhbnNpdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnJpbmdJdGVtSW50b1ZpZXcobiwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAoIWlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZpZXdwb3J0TCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIHZpZXdwb3J0UiA9IHZpZXdwb3J0TCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICBpdGVtTCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCxcbiAgICAgICAgICAgIGl0ZW1SID0gaXRlbUwgKyBpdGVtRWxzW25dLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoaXRlbUwgPiB2aWV3cG9ydEwgJiYgaXRlbVIgPCB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXRlbUwgPCB2aWV3cG9ydEwpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobiwgdHJhbnNpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbVIgPiB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbVJpZ2h0KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0l0ZW0obiwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGJyaW5nSXRlbUludG9WaWV3KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICAgICAgc2hvd25JdGVtSW5kZXggPSBuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZJdGVtKCkge1xuICAgICAgICB2YXIgcHJldiA9IChzaG93bkl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzaG93bkl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNob3dJdGVtKHByZXYpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0SXRlbSgpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2hvd25JdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2hvd25JdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2hvd0l0ZW0obmV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZQYWdlKCkge1xuICAgICAgICBpZiAodmlld3BvcnRFbC5zY3JvbGxMZWZ0ID09PSAwKSB7XG4gICAgICAgICAgICBzaG93SXRlbShpdGVtRWxzLmxlbmd0aCAtIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByZXZQYWdlV2hvbGVJdGVtcyA9IGdldEl0ZW1zSW5QYWdlVmlldyh2aWV3cG9ydEVsLnNjcm9sbExlZnQgLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCB2aWV3cG9ydEVsLnNjcm9sbExlZnQpLFxuICAgICAgICAgICAgICAgIHByZXZQYWdlSXRlbSA9IHByZXZQYWdlV2hvbGVJdGVtcy5wb3AoKSB8fCAwO1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQocHJldlBhZ2VJdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0UGFnZSgpIHtcbiAgICAgICAgaWYgKHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9PT0gYWxsSXRlbXNFbC5jbGllbnRXaWR0aCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpIHtcbiAgICAgICAgICAgIHNob3dJdGVtKDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3ID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCwgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCksXG4gICAgICAgICAgICAgICAgbGFzdFdob2xlSXRlbUluVmlldyA9IGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3LnBvcCgpIHx8IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobGFzdFdob2xlSXRlbUluVmlldyArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0SXRlbShuLCBzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IFwiYXBpXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pICYmIG4gIT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1FbHNbY10uY2xhc3NOYW1lID0gaXRlbUVsc1tjXS5jbGFzc05hbWUgKyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUVsc1tjXS5jbGFzc05hbWUgPSBpdGVtRWxzW2NdLmNsYXNzTmFtZS5yZXBsYWNlKC9cXGJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXFxiLywnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNob3cpIHtcbiAgICAgICAgICAgICAgICBzaG93SXRlbShzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cmlnZ2VyRXZlbnQoXCJvR2FsbGVyeUl0ZW1TZWxlY3RlZFwiLCB7XG4gICAgICAgICAgICAgICAgaXRlbUlEOiBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgICAgICAgICBzb3VyY2U6IHNvdXJjZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RQcmV2SXRlbShzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgdmFyIHByZXYgPSAoc2VsZWN0ZWRJdGVtSW5kZXggLSAxID49IDApID8gc2VsZWN0ZWRJdGVtSW5kZXggLSAxIDogaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICBzZWxlY3RJdGVtKHByZXYsIHNob3csIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0TmV4dEl0ZW0oc2hvdywgc291cmNlKSB7XG4gICAgICAgIHZhciBuZXh0ID0gKHNlbGVjdGVkSXRlbUluZGV4ICsgMSA8IGl0ZW1FbHMubGVuZ3RoKSA/IHNlbGVjdGVkSXRlbUluZGV4ICsgMSA6IDA7XG4gICAgICAgIHNlbGVjdEl0ZW0obmV4dCwgc2hvdywgc291cmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmV2KCkge1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzaG93UHJldlBhZ2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdFByZXZJdGVtKHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dOZXh0UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0TmV4dEl0ZW0odHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZXNpemUoKSB7XG4gICAgICAgIHNldFdpZHRocygpO1xuICAgICAgICBpZiAoIWNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkgeyAvLyBjb3JyZWN0IHRoZSBhbGlnbm1lbnQgb2YgaXRlbSBpbiB2aWV3XG4gICAgICAgICAgICBzaG93SXRlbShzaG93bkl0ZW1JbmRleCwgZmFsc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld1Njcm9sbExlZnQgPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQ7XG4gICAgICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcobmV3U2Nyb2xsTGVmdCwgbmV3U2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNpemVIYW5kbGVyKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoZGVib3VuY2VPblJlc2l6ZSk7XG4gICAgICAgIGRlYm91bmNlT25SZXNpemUgPSBzZXRUaW1lb3V0KG9uUmVzaXplLCA1MDApOyAvLyBBbHNvIGNhbGwgb24gaXRlbSBjb250ZW50IGluc2VydCAoZm9yIEpTIHNvdXJjZSk/XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kT2JqZWN0cyhvYmpzKSB7XG4gICAgICAgIHZhciBuZXdPYmogPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBvYmpzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG9ianNbY107XG4gICAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3T2JqW3Byb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3T2JqO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFN5bmNJRChpZCkge1xuICAgICAgICBjb25maWcuc3luY0lEID0gaWQ7XG4gICAgICAgIGdhbGxlcnlET00uc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoY29udGFpbmVyRWwsIGNvbmZpZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3luY0lEKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLnN5bmNJRDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzeW5jV2l0aChnYWxsZXJ5SW5zdGFuY2UpIHtcbiAgICAgICAgc2V0U3luY0lEKGdhbGxlcnlJbnN0YW5jZS5nZXRTeW5jSUQoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIG5leHRDb250cm9sRGl2LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuICAgICAgICBnYWxsZXJ5RE9NLmRlc3Ryb3lWaWV3cG9ydCh2aWV3cG9ydEVsKTtcbiAgICAgICAgZ2FsbGVyeURPTS5yZW1vdmVDb25maWdEYXRhQXR0cmlidXRlcyhjb250YWluZXJFbCk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJvR2FsbGVyeUl0ZW1TZWxlY3RlZFwiLCBvbkdhbGxlcnlDdXN0b21FdmVudCk7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHJlc2l6ZUhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmIChpc0RhdGFTb3VyY2UoKSkge1xuICAgICAgICBnYWxsZXJ5RE9NLmVtcHR5RWxlbWVudChjb250YWluZXJFbCk7XG4gICAgICAgIGNvbnRhaW5lckVsLmNsYXNzTmFtZSA9IGNvbnRhaW5lckVsLmNsYXNzTmFtZSArIFwiIG8tZ2FsbGVyeVwiO1xuICAgICAgICBhbGxJdGVtc0VsID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpO1xuICAgICAgICBpdGVtRWxzID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtcyhhbGxJdGVtc0VsLCBjb25maWcuaXRlbXMpO1xuICAgIH1cbiAgICBjb25maWcgPSBleHRlbmRPYmplY3RzKFtkZWZhdWx0Q29uZmlnLCBnYWxsZXJ5RE9NLmdldENvbmZpZ0RhdGFBdHRyaWJ1dGVzKGNvbnRhaW5lckVsKSwgY29uZmlnXSk7XG4gICAgZ2FsbGVyeURPTS5zZXRDb25maWdEYXRhQXR0cmlidXRlcyhjb250YWluZXJFbCwgY29uZmlnKTtcbiAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIHZpZXdwb3J0RWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZVZpZXdwb3J0KGFsbEl0ZW1zRWwpO1xuICAgIGl0ZW1FbHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbiAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgIHNob3duSXRlbUluZGV4ID0gc2VsZWN0ZWRJdGVtSW5kZXg7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQoc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgIHNldFdpZHRocygpO1xuICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgYWRkVWlDb250cm9scygpO1xuICAgIGxpc3RlbkZvclN5bmNFdmVudHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuICAgIHRoaXMuZ2V0U3luY0lEID0gZ2V0U3luY0lEO1xuICAgIHRoaXMuc3luY1dpdGggPSBzeW5jV2l0aDtcbiAgICB0aGlzLmRlc3Ryb3kgPSBkZXN0cm95O1xuXG4gICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlSZWFkeVwiLCB7XG4gICAgICAgIGdhbGxlcnk6IHRoaXNcbiAgICB9KTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdhbGxlcnk7IiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlICovXG52YXIgR2FsbGVyeSA9IHJlcXVpcmUoJy4vR2FsbGVyeS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIGdFbHMgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtby1jb21wb25lbnQ9by1nYWxsZXJ5XVwiKSxcbiAgICAgICAgZ2FsbGVyaWVzID0gW107XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBnRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBnYWxsZXJpZXMucHVzaChuZXcgR2FsbGVyeSh7XG4gICAgICAgICAgICBjb250YWluZXI6IGdFbHNbY11cbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gZ2FsbGVyaWVzO1xufTsiLCIvKmdsb2JhbCBtb2R1bGUqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gZW1wdHlFbGVtZW50KHRhcmdldEVsKSB7XG4gICAgd2hpbGUgKHRhcmdldEVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGFyZ2V0RWwucmVtb3ZlQ2hpbGQodGFyZ2V0RWwuZmlyc3RDaGlsZCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVWaWV3cG9ydCh0YXJnZXRFbCkge1xuICAgIHZhciBwYXJlbnRFbCA9IHRhcmdldEVsLnBhcmVudE5vZGUsXG4gICAgICAgIHZpZXdwb3J0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB2aWV3cG9ydEVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwiby1nYWxsZXJ5X192aWV3cG9ydFwiKTtcbiAgICB2aWV3cG9ydEVsLmFwcGVuZENoaWxkKHRhcmdldEVsKTtcbiAgICBwYXJlbnRFbC5hcHBlbmRDaGlsZCh2aWV3cG9ydEVsKTtcbiAgICByZXR1cm4gdmlld3BvcnRFbDtcbn1cblxuZnVuY3Rpb24gZGVzdHJveVZpZXdwb3J0KHZpZXdwb3J0RWwpIHtcbiAgICB2YXIgcGFyZW50RWwgPSB2aWV3cG9ydEVsLnBhcmVudE5vZGU7XG4gICAgd2hpbGUgKHZpZXdwb3J0RWwuY2hpbGROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKHZpZXdwb3J0RWwuY2hpbGROb2Rlc1swXSk7XG4gICAgfVxuICAgIHBhcmVudEVsLnJlbW92ZUNoaWxkKHZpZXdwb3J0RWwpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KG5vZGVOYW1lLCBjb250ZW50LCBjbGFzc2VzKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChub2RlTmFtZSk7XG4gICAgZWwuaW5uZXJIVE1MID0gY29udGVudDtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBjbGFzc2VzKTtcbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCkge1xuICAgIHZhciBpdGVtc0xpc3QgPSBjcmVhdGVFbGVtZW50KFwib2xcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGl0ZW1zTGlzdCk7XG4gICAgcmV0dXJuIGl0ZW1zTGlzdDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXMoY29udGFpbmVyRWwsIGl0ZW1zKSB7XG4gICAgdmFyIGl0ZW1DbGFzcztcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBpdGVtQ2xhc3MgPSBcIm8tZ2FsbGVyeV9faXRlbVwiICsgKChpdGVtc1tjXS5zZWxlY3RlZCkgPyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIgOiBcIlwiICk7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBcIiZuYnNwO1wiLCBpdGVtQ2xhc3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChpdGVtLCBpdGVtRWwpIHtcbiAgICBlbXB0eUVsZW1lbnQoaXRlbUVsKTtcbiAgICB2YXIgY29udGVudEVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1Db250ZW50LCBcIm8tZ2FsbGVyeV9faXRlbV9fY29udGVudFwiKTtcbiAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKTtcbiAgICBpZiAoaXRlbS5pdGVtQ2FwdGlvbikge1xuICAgICAgICB2YXIgY2FwdGlvbkVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1DYXB0aW9uLCBcIm8tZ2FsbGVyeV9faXRlbV9fY2FwdGlvblwiKTtcbiAgICAgICAgaXRlbUVsLmFwcGVuZENoaWxkKGNhcHRpb25FbCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcmV2Q29udHJvbCgpIHtcbiAgICByZXR1cm4gY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIlBSRVZcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1wcmV2XCIpO1xufVxuZnVuY3Rpb24gZ2V0TmV4dENvbnRyb2woKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJORVhUXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tbmV4dFwiKTtcbn1cblxuZnVuY3Rpb24gc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoZWwsIGNvbmZpZykge1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1jb21wb25lbnRcIiwgXCJvLWdhbGxlcnlcIik7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktc3luY2lkXCIsIGNvbmZpZy5zeW5jSUQpO1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1nYWxsZXJ5LW11bHRpcGxlaXRlbXNwZXJwYWdlXCIsIGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSk7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktdG91Y2hcIiwgY29uZmlnLnRvdWNoKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWluaGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0KTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWF4SGVpZ2h0KTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoZWwpIHtcbiAgICB2YXIgY29uZmlnID0ge307XG4gICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhjb25maWcsIFwic3luY0lEXCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LXN5bmNpZFwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJtdWx0aXBsZUl0ZW1zUGVyUGFnZVwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJ0b3VjaFwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS10b3VjaFwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJjYXB0aW9uTWluSGVpZ2h0XCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25taW5oZWlnaHRcIik7XG4gICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhjb25maWcsIFwiY2FwdGlvbk1heEhlaWdodFwiLCBlbCwgXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIpO1xuICAgIHJldHVybiBjb25maWc7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNvbmZpZ0RhdGFBdHRyaWJ1dGVzKGVsKSB7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWNvbXBvbmVudFwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tdmVyc2lvblwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1zeW5jaWRcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktbXVsdGlwbGVpdGVtc3BlcnBhZ2VcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktdG91Y2hcIik7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1pbmhlaWdodFwiKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIpO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKG9iaiwgcHJvcE5hbWUsIGVsLCBhdHRyTmFtZSkge1xuICAgIHZhciB2ID0gZWwuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICBpZiAodiAhPT0gbnVsbCkge1xuICAgICAgICBvYmpbcHJvcE5hbWVdID0gdjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldEl0ZW1OdW1iZXJGcm9tRWxlbWVudChlbCkge1xuICAgIHZhciBpdGVtRWwgPSBlbCxcbiAgICAgICAgaXRlbU51bSA9IC0xO1xuICAgIHdoaWxlIChpdGVtRWwucGFyZW50Tm9kZS5jbGFzc05hbWUuaW5kZXhPZihcIm8tZ2FsbGVyeV9faXRlbXNcIikgPT09IC0xKSB7XG4gICAgICAgIGl0ZW1FbCA9IGl0ZW1FbC5wYXJlbnROb2RlO1xuICAgIH1cbiAgICB2YXIgaXRlbUVscyA9IGl0ZW1FbC5wYXJlbnROb2RlLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgaWYgKGl0ZW1FbHNbY10gPT09IGl0ZW1FbCkge1xuICAgICAgICAgICAgaXRlbU51bSA9IGM7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaXRlbU51bTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW1wdHlFbGVtZW50OiBlbXB0eUVsZW1lbnQsXG4gICAgY3JlYXRlSXRlbXNMaXN0OiBjcmVhdGVJdGVtc0xpc3QsXG4gICAgY3JlYXRlSXRlbXM6IGNyZWF0ZUl0ZW1zLFxuICAgIGluc2VydEl0ZW1Db250ZW50OiBpbnNlcnRJdGVtQ29udGVudCxcbiAgICBjcmVhdGVWaWV3cG9ydDogY3JlYXRlVmlld3BvcnQsXG4gICAgZGVzdHJveVZpZXdwb3J0OiBkZXN0cm95Vmlld3BvcnQsXG4gICAgZ2V0UHJldkNvbnRyb2w6IGdldFByZXZDb250cm9sLFxuICAgIGdldE5leHRDb250cm9sOiBnZXROZXh0Q29udHJvbCxcbiAgICBzZXRDb25maWdEYXRhQXR0cmlidXRlczogc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMsXG4gICAgZ2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXM6IGdldENvbmZpZ0RhdGFBdHRyaWJ1dGVzLFxuICAgIHJlbW92ZUNvbmZpZ0RhdGFBdHRyaWJ1dGVzOiByZW1vdmVDb25maWdEYXRhQXR0cmlidXRlcyxcbiAgICBnZXRJdGVtTnVtYmVyRnJvbUVsZW1lbnQ6IGdldEl0ZW1OdW1iZXJGcm9tRWxlbWVudFxufTsiXX0=
