require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"hjDe2K":[function(require,module,exports){
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
},{"./src/js/Gallery":3,"./src/js/galleryConstructor":4}],"o-gallery":[function(require,module,exports){
module.exports=require('hjDe2K');
},{}],3:[function(require,module,exports){
/*
    ALWAYS: JS config takes precedence over HTML source


    INITIALISATION:
        1. [optional] If constructing from JS config:
            1. Build HTML item containers from JS config
            2. Add/update HTML data attributes from JS config (so HTML is in sync with data)
            3. Build selected (+ next/prev) item HTML from JS config

        2. Build JS config from HTML (except item data), don't overwrite anything already in the JS config

    SETUP
        1. Build UI controls
        2. Bind UI events
        3. Listen for events from other Galleries

    RUNNING
        1. Build item content on demand (selected + next/prev item), if it exists in JSON config
        2. Emit events

 */

/*global require, module*/

var galleryDOM = require('./galleryDOM.js');

function Gallery(config) {
    "use strict";
    console.log("Constructed Gallery from " + (isDataSource() ? "JS" : "HTML"), config);

    // TODO: Set default model
    if (!config.model) {
        config.model = {};
    }

    var containerEl = config.container,
        viewportEl,
        allItemsEl,
        itemEls,
        multipleItemsPerPage = config.model.multipleItemsPerPage || containerEl.getAttribute("data-o-gallery-multipleitemsperpage") || false,
        transitionDuration = 300,
        selectedItemIndex,
        shownItemIndex,
        debounceOnResize;

    function isDataSource() {
        return (config.model && config.model.items && config.model.items.length > 0);
    }

    function setWidths() {
        var i,
            l,
            totalWidth = 0,
            itemWidth = containerEl.clientWidth;
        if (multipleItemsPerPage) {
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
        if (config.model.items) {
            for (var c = 0, l = itemNums.length; c < l; c++) {
                var itemNum = itemNums[c];
                if (isValidItem(itemNum) && !config.model.items[itemNum].inserted) {
                    galleryDOM.insertItemContent(config.model.items[itemNum], itemEls[itemNum]);
                    config.model.items[itemNum].inserted = true;
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
        if (multipleItemsPerPage) {
            showPrevPage();
        } else {
            selectPrevItem(true);
        }
    }

    function next() {
        if (multipleItemsPerPage) {
            showNextPage();
        } else {
            selectNextItem(true);
        }
    }

    function onResize() {
        setWidths();
        if (!multipleItemsPerPage) { // correct the alignment of item in view
            showItem(shownItemIndex);
        } else {
            var newScrollLeft = viewportEl.scrollLeft;
            insertItemContent(getItemsInPageView(newScrollLeft, newScrollLeft + viewportEl.clientWidth, false));
        }
    }

    if (isDataSource()) {
        galleryDOM.emptyElement(containerEl);
        // TODO: Set origami attributes on containerEl
        containerEl.className = containerEl.className + " o-gallery";
        allItemsEl = galleryDOM.createItemsList(containerEl);
        itemEls = galleryDOM.createItems(allItemsEl, config.model.items);
    }

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
    var contentEl = createElement("div", item.itemContent, "o-gallery__item__content"); // TODO: Rename to o-gallery__item__content
    itemEl.appendChild(contentEl);
    if (item.itemCaption) {
        var captionEl = createElement("div", item.itemCaption, "o-gallery__item__caption"); // TODO: Rename to o-gallery__item__caption
        itemEl.appendChild(captionEl);
    }
}

function getPrevControl() {
    return createElement("div", "PREV", "o-gallery__control o-gallery__control--prev");
}
function getNextControl() {
    return createElement("div", "NEXT", "o-gallery__control o-gallery__control--next");
}

module.exports = {
    emptyElement: emptyElement,
    createItemsList: createItemsList,
    createItems: createItems,
    insertItemContent: insertItemContent,
    createViewport: createViewport,
    getPrevControl: getPrevControl,
    getNextControl: getNextControl
};
},{}]},{},["hjDe2K"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3Rvci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cblxudmFyIEdhbGxlcnkgPSByZXF1aXJlKCcuL3NyYy9qcy9HYWxsZXJ5JyksXG4gICAgZ2FsbGVyeUNvbnN0cnVjdG9yID0gcmVxdWlyZSgnLi9zcmMvanMvZ2FsbGVyeUNvbnN0cnVjdG9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEdhbGxlcnk6IEdhbGxlcnksXG4gICAgY29uc3RydWN0RnJvbVBhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgcmV0dXJuIGdhbGxlcnlDb25zdHJ1Y3RvcihHYWxsZXJ5KTtcbiAgICB9XG59OyIsIi8qXG4gICAgQUxXQVlTOiBKUyBjb25maWcgdGFrZXMgcHJlY2VkZW5jZSBvdmVyIEhUTUwgc291cmNlXG5cblxuICAgIElOSVRJQUxJU0FUSU9OOlxuICAgICAgICAxLiBbb3B0aW9uYWxdIElmIGNvbnN0cnVjdGluZyBmcm9tIEpTIGNvbmZpZzpcbiAgICAgICAgICAgIDEuIEJ1aWxkIEhUTUwgaXRlbSBjb250YWluZXJzIGZyb20gSlMgY29uZmlnXG4gICAgICAgICAgICAyLiBBZGQvdXBkYXRlIEhUTUwgZGF0YSBhdHRyaWJ1dGVzIGZyb20gSlMgY29uZmlnIChzbyBIVE1MIGlzIGluIHN5bmMgd2l0aCBkYXRhKVxuICAgICAgICAgICAgMy4gQnVpbGQgc2VsZWN0ZWQgKCsgbmV4dC9wcmV2KSBpdGVtIEhUTUwgZnJvbSBKUyBjb25maWdcblxuICAgICAgICAyLiBCdWlsZCBKUyBjb25maWcgZnJvbSBIVE1MIChleGNlcHQgaXRlbSBkYXRhKSwgZG9uJ3Qgb3ZlcndyaXRlIGFueXRoaW5nIGFscmVhZHkgaW4gdGhlIEpTIGNvbmZpZ1xuXG4gICAgU0VUVVBcbiAgICAgICAgMS4gQnVpbGQgVUkgY29udHJvbHNcbiAgICAgICAgMi4gQmluZCBVSSBldmVudHNcbiAgICAgICAgMy4gTGlzdGVuIGZvciBldmVudHMgZnJvbSBvdGhlciBHYWxsZXJpZXNcblxuICAgIFJVTk5JTkdcbiAgICAgICAgMS4gQnVpbGQgaXRlbSBjb250ZW50IG9uIGRlbWFuZCAoc2VsZWN0ZWQgKyBuZXh0L3ByZXYgaXRlbSksIGlmIGl0IGV4aXN0cyBpbiBKU09OIGNvbmZpZ1xuICAgICAgICAyLiBFbWl0IGV2ZW50c1xuXG4gKi9cblxuLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cblxudmFyIGdhbGxlcnlET00gPSByZXF1aXJlKCcuL2dhbGxlcnlET00uanMnKTtcblxuZnVuY3Rpb24gR2FsbGVyeShjb25maWcpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBjb25zb2xlLmxvZyhcIkNvbnN0cnVjdGVkIEdhbGxlcnkgZnJvbSBcIiArIChpc0RhdGFTb3VyY2UoKSA/IFwiSlNcIiA6IFwiSFRNTFwiKSwgY29uZmlnKTtcblxuICAgIC8vIFRPRE86IFNldCBkZWZhdWx0IG1vZGVsXG4gICAgaWYgKCFjb25maWcubW9kZWwpIHtcbiAgICAgICAgY29uZmlnLm1vZGVsID0ge307XG4gICAgfVxuXG4gICAgdmFyIGNvbnRhaW5lckVsID0gY29uZmlnLmNvbnRhaW5lcixcbiAgICAgICAgdmlld3BvcnRFbCxcbiAgICAgICAgYWxsSXRlbXNFbCxcbiAgICAgICAgaXRlbUVscyxcbiAgICAgICAgbXVsdGlwbGVJdGVtc1BlclBhZ2UgPSBjb25maWcubW9kZWwubXVsdGlwbGVJdGVtc1BlclBhZ2UgfHwgY29udGFpbmVyRWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktbXVsdGlwbGVpdGVtc3BlcnBhZ2VcIikgfHwgZmFsc2UsXG4gICAgICAgIHRyYW5zaXRpb25EdXJhdGlvbiA9IDMwMCxcbiAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXgsXG4gICAgICAgIHNob3duSXRlbUluZGV4LFxuICAgICAgICBkZWJvdW5jZU9uUmVzaXplO1xuXG4gICAgZnVuY3Rpb24gaXNEYXRhU291cmNlKCkge1xuICAgICAgICByZXR1cm4gKGNvbmZpZy5tb2RlbCAmJiBjb25maWcubW9kZWwuaXRlbXMgJiYgY29uZmlnLm1vZGVsLml0ZW1zLmxlbmd0aCA+IDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFdpZHRocygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBsLFxuICAgICAgICAgICAgdG90YWxXaWR0aCA9IDAsXG4gICAgICAgICAgICBpdGVtV2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKG11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBpdGVtV2lkdGggPSBwYXJzZUludChpdGVtRWxzW3NlbGVjdGVkSXRlbUluZGV4XS5jbGllbnRXaWR0aCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaXRlbUVsc1tpXS5zdHlsZS53aWR0aCA9IGl0ZW1XaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggKz0gaXRlbVdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGFsbEl0ZW1zRWwuc3R5bGUud2lkdGggPSB0b3RhbFdpZHRoICsgXCJweFwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWRJdGVtKG4pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgbiA9PT0gXCJudW1iZXJcIiAmJiBuID4gLTEgJiYgbiA8IGl0ZW1FbHMubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZEl0ZW0oKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSAwLCBjLCBsO1xuICAgICAgICBmb3IgKGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGlmIChpdGVtRWxzW2NdLmNsYXNzTmFtZS5pbmRleE9mKFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKSA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSBjO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkVWlDb250cm9scygpIHtcbiAgICAgICAgdmFyIHByZXZDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5nZXRQcmV2Q29udHJvbCgpLFxuICAgICAgICAgICAgbmV4dENvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmdldE5leHRDb250cm9sKCk7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuXG4gICAgICAgIHByZXZDb250cm9sRGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwcmV2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG5leHQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KG4pIHtcbiAgICAgICAgdmFyIGl0ZW1OdW1zID0gKG4gaW5zdGFuY2VvZiBBcnJheSkgPyBuIDogW25dO1xuICAgICAgICBpZiAoY29uZmlnLm1vZGVsLml0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1OdW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtTnVtID0gaXRlbU51bXNbY107XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRJdGVtKGl0ZW1OdW0pICYmICFjb25maWcubW9kZWwuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2FsbGVyeURPTS5pbnNlcnRJdGVtQ29udGVudChjb25maWcubW9kZWwuaXRlbXNbaXRlbU51bV0sIGl0ZW1FbHNbaXRlbU51bV0pO1xuICAgICAgICAgICAgICAgICAgICBjb25maWcubW9kZWwuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhpdGVtTnVtLCBsLCByKSB7XG4gICAgICAgIHJldHVybiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPj0gbCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgKyBpdGVtRWxzW2l0ZW1OdW1dLmNsaWVudFdpZHRoIDw9IHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhpdGVtTnVtLCBsLCByKSB7XG4gICAgICAgIHJldHVybiAoaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgLSBpdGVtRWxzW2l0ZW1OdW1dLmNsaWVudFdpZHRoICYmIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA8PSByKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJdGVtc0luUGFnZVZpZXcobCwgciwgd2hvbGUpIHtcbiAgICAgICAgdmFyIGl0ZW1zSW5WaWV3ID0gW10sXG4gICAgICAgICAgICBvbmx5V2hvbGUgPSAodHlwZW9mIHdob2xlICE9PSBcImJvb2xlYW5cIikgPyB0cnVlIDogd2hvbGU7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgaXRlbUVscy5sZW5ndGg7IGMrKykge1xuICAgICAgICAgICAgaWYgKChvbmx5V2hvbGUgJiYgaXNXaG9sZUl0ZW1JblBhZ2VWaWV3KGMsIGwsIHIpKSB8fCAoIW9ubHlXaG9sZSAmJiBpc0FueVBhcnRPZkl0ZW1JblBhZ2VWaWV3KGMsIGwsIHIpKSkge1xuICAgICAgICAgICAgICAgIGl0ZW1zSW5WaWV3LnB1c2goYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZW1zSW5WaWV3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zaXRpb25UbyhuZXdTY3JvbGxMZWZ0KSB7XG4gICAgICAgIHZhciBzdGFydCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIGNoYW5nZSA9IG5ld1Njcm9sbExlZnQgLSBzdGFydCxcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lID0gMCxcbiAgICAgICAgICAgIGluY3JlbWVudCA9IDIwLFxuICAgICAgICAgICAgdGltZW91dDtcblxuICAgICAgICAvLyB0ID0gY3VycmVudCB0aW1lLCBiID0gc3RhcnQgdmFsdWUsIGMgPSBjaGFuZ2UgaW4gdmFsdWUsIGQgPSBkdXJhdGlvblxuICAgICAgICBmdW5jdGlvbiBlYXNlSW5PdXRRdWFkKHQsIGIsIGMsIGQpIHtcbiAgICAgICAgICAgIHQgLz0gZC8yO1xuICAgICAgICAgICAgaWYgKHQgPCAxKSB7IHJldHVybiBjLzIqdCp0ICsgYjsgfVxuICAgICAgICAgICAgdC0tO1xuICAgICAgICAgICAgcmV0dXJuIC1jLzIgKiAodCoodC0yKSAtIDEpICsgYjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFuaW1hdGVTY3JvbGwoKSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZSArPSBpbmNyZW1lbnQ7XG4gICAgICAgICAgICB2aWV3cG9ydEVsLnNjcm9sbExlZnQgPSBlYXNlSW5PdXRRdWFkKGN1cnJlbnRUaW1lLCBzdGFydCwgY2hhbmdlLCB0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDwgdHJhbnNpdGlvbkR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGFuaW1hdGVTY3JvbGwsIGluY3JlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYW5pbWF0ZVNjcm9sbCgpO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0l0ZW0obiwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGluc2VydEl0ZW1Db250ZW50KFtuXSk7XG4gICAgICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRyYW5zaXRpb25UbyhuZXdTY3JvbGxMZWZ0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gbmV3U2Nyb2xsTGVmdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNob3duSXRlbUluZGV4ID0gbjtcbiAgICAgICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhuZXdTY3JvbGxMZWZ0LCBuZXdTY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dQcmV2SXRlbSgpIHtcbiAgICAgICAgdmFyIHByZXYgPSAoc2hvd25JdGVtSW5kZXggLSAxID49IDApID8gc2hvd25JdGVtSW5kZXggLSAxIDogaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICBzaG93SXRlbShwcmV2KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dEl0ZW0oKSB7XG4gICAgICAgIHZhciBuZXh0ID0gKHNob3duSXRlbUluZGV4ICsgMSA8IGl0ZW1FbHMubGVuZ3RoKSA/IHNob3duSXRlbUluZGV4ICsgMSA6IDA7XG4gICAgICAgIHNob3dJdGVtKG5leHQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dQcmV2UGFnZSgpIHtcbiAgICAgICAgaWYgKHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9PT0gMCkge1xuICAgICAgICAgICAgc2hvd0l0ZW0oaXRlbUVscy5sZW5ndGggLSAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmV2UGFnZVdob2xlSXRlbXMgPSBnZXRJdGVtc0luUGFnZVZpZXcodmlld3BvcnRFbC5zY3JvbGxMZWZ0IC0gdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgdmlld3BvcnRFbC5zY3JvbGxMZWZ0KSxcbiAgICAgICAgICAgICAgICBwcmV2UGFnZUl0ZW0gPSBwcmV2UGFnZVdob2xlSXRlbXMuc2hpZnQoKSB8fCAwO1xuICAgICAgICAgICAgc2hvd0l0ZW0ocHJldlBhZ2VJdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0UGFnZSgpIHtcbiAgICAgICAgaWYgKHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9PT0gYWxsSXRlbXNFbC5jbGllbnRXaWR0aCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpIHtcbiAgICAgICAgICAgIHNob3dJdGVtKDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3ID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCwgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCksXG4gICAgICAgICAgICAgICAgbGFzdFdob2xlSXRlbUluVmlldyA9IGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3LnBvcCgpIHx8IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIHNob3dJdGVtKGxhc3RXaG9sZUl0ZW1JblZpZXcgKyAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdEl0ZW0obiwgc2hvdykge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbUluZGV4ID0gbjtcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUVsc1tjXS5jbGFzc05hbWUgPSBpdGVtRWxzW2NdLmNsYXNzTmFtZSArIFwiIG8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpdGVtRWxzW2NdLmNsYXNzTmFtZSA9IGl0ZW1FbHNbY10uY2xhc3NOYW1lLnJlcGxhY2UoL1xcYm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcXGIvLCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdFByZXZJdGVtKHNob3cpIHtcbiAgICAgICAgdmFyIHByZXYgPSAoc2VsZWN0ZWRJdGVtSW5kZXggLSAxID49IDApID8gc2VsZWN0ZWRJdGVtSW5kZXggLSAxIDogaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICBzZWxlY3RJdGVtKHByZXYsIHNob3cpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdE5leHRJdGVtKHNob3cpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2VsZWN0SXRlbShuZXh0LCBzaG93KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmV2KCkge1xuICAgICAgICBpZiAobXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dQcmV2UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0UHJldkl0ZW0odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICBpZiAobXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dOZXh0UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0TmV4dEl0ZW0odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghbXVsdGlwbGVJdGVtc1BlclBhZ2UpIHsgLy8gY29ycmVjdCB0aGUgYWxpZ25tZW50IG9mIGl0ZW0gaW4gdmlld1xuICAgICAgICAgICAgc2hvd0l0ZW0oc2hvd25JdGVtSW5kZXgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld1Njcm9sbExlZnQgPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQ7XG4gICAgICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcobmV3U2Nyb2xsTGVmdCwgbmV3U2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5lbXB0eUVsZW1lbnQoY29udGFpbmVyRWwpO1xuICAgICAgICAvLyBUT0RPOiBTZXQgb3JpZ2FtaSBhdHRyaWJ1dGVzIG9uIGNvbnRhaW5lckVsXG4gICAgICAgIGNvbnRhaW5lckVsLmNsYXNzTmFtZSA9IGNvbnRhaW5lckVsLmNsYXNzTmFtZSArIFwiIG8tZ2FsbGVyeVwiO1xuICAgICAgICBhbGxJdGVtc0VsID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpO1xuICAgICAgICBpdGVtRWxzID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtcyhhbGxJdGVtc0VsLCBjb25maWcubW9kZWwuaXRlbXMpO1xuICAgIH1cblxuICAgIGFsbEl0ZW1zRWwgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLm8tZ2FsbGVyeV9faXRlbXNcIik7XG4gICAgdmlld3BvcnRFbCA9IGdhbGxlcnlET00uY3JlYXRlVmlld3BvcnQoYWxsSXRlbXNFbCk7XG4gICAgaXRlbUVscyA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xuICAgIHNlbGVjdGVkSXRlbUluZGV4ID0gZ2V0U2VsZWN0ZWRJdGVtKCk7XG4gICAgc2hvd25JdGVtSW5kZXggPSBzZWxlY3RlZEl0ZW1JbmRleDtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlT25SZXNpemUpO1xuICAgICAgICBkZWJvdW5jZU9uUmVzaXplID0gc2V0VGltZW91dChvblJlc2l6ZSwgNTAwKTsgLy8gQWxzbyBjYWxsIG9uIGl0ZW0gY29udGVudCBpbnNlcnQgKGZvciBKUyBzb3VyY2UpP1xuICAgIH0pO1xuICAgIGluc2VydEl0ZW1Db250ZW50KHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICBzZXRXaWR0aHMoKTtcbiAgICBzaG93SXRlbShzZWxlY3RlZEl0ZW1JbmRleCwgZmFsc2UpO1xuICAgIGFkZFVpQ29udHJvbHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FsbGVyeTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKEdhbGxlcnkpIHtcbiAgICB2YXIgZ0VscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1vLWNvbXBvbmVudD1vLWdhbGxlcnldXCIpLFxuICAgICAgICBnYWxsZXJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGdFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGdhbGxlcmllcy5wdXNoKG5ldyBHYWxsZXJ5KHtcbiAgICAgICAgICAgIGNvbnRhaW5lcjogZ0Vsc1tjXVxuICAgICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiBnYWxsZXJpZXM7XG59IiwiLypnbG9iYWwgbW9kdWxlKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGVtcHR5RWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHdoaWxlICh0YXJnZXRFbC5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhcmdldEVsLnJlbW92ZUNoaWxkKHRhcmdldEVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmlld3BvcnQodGFyZ2V0RWwpIHtcbiAgICB2YXIgcGFyZW50RWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB2aWV3cG9ydEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmlld3BvcnRFbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcIm8tZ2FsbGVyeV9fdmlld3BvcnRcIik7XG4gICAgdmlld3BvcnRFbC5hcHBlbmRDaGlsZCh0YXJnZXRFbCk7XG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQodmlld3BvcnRFbCk7XG4gICAgcmV0dXJuIHZpZXdwb3J0RWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQobm9kZU5hbWUsIGNvbnRlbnQsIGNsYXNzZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICBlbC5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMpO1xuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKSB7XG4gICAgdmFyIGl0ZW1zTGlzdCA9IGNyZWF0ZUVsZW1lbnQoXCJvbFwiLCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbXNcIik7XG4gICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoaXRlbXNMaXN0KTtcbiAgICByZXR1cm4gaXRlbXNMaXN0O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtcyhjb250YWluZXJFbCwgaXRlbXMpIHtcbiAgICB2YXIgaXRlbUNsYXNzO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGl0ZW1DbGFzcyA9IFwiby1nYWxsZXJ5X19pdGVtXCIgKyAoKGl0ZW1zW2NdLnNlbGVjdGVkKSA/IFwiIG8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIiA6IFwiXCIgKTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoY3JlYXRlRWxlbWVudChcImxpXCIsIFwiJm5ic3A7XCIsIGl0ZW1DbGFzcykpO1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG59XG5cbmZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KGl0ZW0sIGl0ZW1FbCkge1xuICAgIGVtcHR5RWxlbWVudChpdGVtRWwpO1xuICAgIHZhciBjb250ZW50RWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uaXRlbUNvbnRlbnQsIFwiby1nYWxsZXJ5X19pdGVtX19jb250ZW50XCIpOyAvLyBUT0RPOiBSZW5hbWUgdG8gby1nYWxsZXJ5X19pdGVtX19jb250ZW50XG4gICAgaXRlbUVsLmFwcGVuZENoaWxkKGNvbnRlbnRFbCk7XG4gICAgaWYgKGl0ZW0uaXRlbUNhcHRpb24pIHtcbiAgICAgICAgdmFyIGNhcHRpb25FbCA9IGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgaXRlbS5pdGVtQ2FwdGlvbiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7IC8vIFRPRE86IFJlbmFtZSB0byBvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cbiAgICAgICAgaXRlbUVsLmFwcGVuZENoaWxkKGNhcHRpb25FbCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcmV2Q29udHJvbCgpIHtcbiAgICByZXR1cm4gY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIlBSRVZcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1wcmV2XCIpO1xufVxuZnVuY3Rpb24gZ2V0TmV4dENvbnRyb2woKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJORVhUXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tbmV4dFwiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW1wdHlFbGVtZW50OiBlbXB0eUVsZW1lbnQsXG4gICAgY3JlYXRlSXRlbXNMaXN0OiBjcmVhdGVJdGVtc0xpc3QsXG4gICAgY3JlYXRlSXRlbXM6IGNyZWF0ZUl0ZW1zLFxuICAgIGluc2VydEl0ZW1Db250ZW50OiBpbnNlcnRJdGVtQ29udGVudCxcbiAgICBjcmVhdGVWaWV3cG9ydDogY3JlYXRlVmlld3BvcnQsXG4gICAgZ2V0UHJldkNvbnRyb2w6IGdldFByZXZDb250cm9sLFxuICAgIGdldE5leHRDb250cm9sOiBnZXROZXh0Q29udHJvbFxufTsiXX0=
