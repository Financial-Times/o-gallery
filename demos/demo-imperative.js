(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Demo code. Does what a product will have to do to construct a slideshow from data
var origamiGallery = require('./main.js');

// TODO: Don't put these in the global scope
window.galleries = origamiGallery.constructFromPage();
window.galleries.push(new origamiGallery.Gallery(standaloneGalleryConfig));
window.galleries.push(new origamiGallery.Gallery(slideshowGalleryConfig));
window.galleries.push(new origamiGallery.Gallery(thumbnailGalleryConfig));
},{"./main.js":2}],2:[function(require,module,exports){
/*global require, module*/

var Gallery = require('./src/js/Gallery'),
    galleryConstructor = require('./src/js/galleryConstructor');

module.exports = {
    Gallery: Gallery,
    constructFromPage: function() {
        "use strict";
        return galleryConstructor(Gallery);
    }
};
},{"./src/js/Gallery":3,"./src/js/galleryConstructor":4}],3:[function(require,module,exports){
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
        defaultConfig = {
            multipleItemsPerPage: false,
            captionMinHeight: 10,
            captionMaxHeight: 50,
            touch: false,
            syncID: new Date().getTime()
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
        var prevControlDiv = galleryDOM.getPrevControl(),
            nextControlDiv = galleryDOM.getNextControl();
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);

        prevControlDiv.addEventListener("click", prev);
        nextControlDiv.addEventListener("click", next);
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

    function showItem(n, transition) {
        if (isValidItem(n)) {
            insertItemContent([n]);
            var newScrollLeft = itemEls[n].offsetLeft;
            if (transition !== false) {
                transitionTo(newScrollLeft);
            } else {
                viewportEl.scrollLeft = newScrollLeft;
            }
            shownItemIndex = n;
            insertItemContent(getItemsInPageView(newScrollLeft, newScrollLeft + viewportEl.clientWidth, false));
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
                prevPageItem = prevPageWholeItems.shift() || 0;
            showItem(prevPageItem);
        }
    }

    function showNextPage() {
        if (viewportEl.scrollLeft === allItemsEl.clientWidth - viewportEl.clientWidth) {
            showItem(0);
        } else {
            var currentWholeItemsInView = getItemsInPageView(viewportEl.scrollLeft, viewportEl.scrollLeft + viewportEl.clientWidth),
                lastWholeItemInView = currentWholeItemsInView.pop() || itemEls.length - 1;
            showItem(lastWholeItemInView + 1);
        }
    }

    function selectItem(n, show) {
        if (isValidItem(n)) {
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
        }
    }

    function selectPrevItem(show) {
        var prev = (selectedItemIndex - 1 >= 0) ? selectedItemIndex - 1 : itemEls.length - 1;
        selectItem(prev, show);
    }

    function selectNextItem(show) {
        var next = (selectedItemIndex + 1 < itemEls.length) ? selectedItemIndex + 1 : 0;
        selectItem(next, show);
    }

    function prev() {
        if (config.multipleItemsPerPage) {
            showPrevPage();
        } else {
            selectPrevItem(true);
        }
    }

    function next() {
        if (config.multipleItemsPerPage) {
            showNextPage();
        } else {
            selectNextItem(true);
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
    window.addEventListener("resize", function() {
        clearTimeout(debounceOnResize);
        debounceOnResize = setTimeout(onResize, 500); // Also call on item content insert (for JS source)?
    });
    insertItemContent(selectedItemIndex);
    setWidths();
    showItem(selectedItemIndex, false);
    addUiControls();

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

}

module.exports = Gallery;
},{"./galleryDOM.js":5}],4:[function(require,module,exports){
module.exports = function(Gallery) {
    var gEls = document.querySelectorAll("[data-o-component=o-gallery]"),
        galleries = [];
    for (var c = 0, l = gEls.length; c < l; c++) {
        galleries.push(new Gallery({
            container: gEls[c]
        }));
    }
    return galleries;
}
},{}],5:[function(require,module,exports){
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
},{}]},{},[1])