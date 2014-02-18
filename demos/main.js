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
},{}]},{},["hjDe2K"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3Rvci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmdsb2JhbCByZXF1aXJlLCBtb2R1bGUqL1xuXG52YXIgR2FsbGVyeSA9IHJlcXVpcmUoJy4vc3JjL2pzL0dhbGxlcnknKSxcbiAgICBnYWxsZXJ5Q29uc3RydWN0b3IgPSByZXF1aXJlKCcuL3NyYy9qcy9nYWxsZXJ5Q29uc3RydWN0b3InKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgR2FsbGVyeTogR2FsbGVyeSxcbiAgICBjb25zdHJ1Y3RGcm9tUGFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICByZXR1cm4gZ2FsbGVyeUNvbnN0cnVjdG9yKEdhbGxlcnkpO1xuICAgIH1cbn07IiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cblxudmFyIGdhbGxlcnlET00gPSByZXF1aXJlKCcuL2dhbGxlcnlET00uanMnKTtcblxuZnVuY3Rpb24gR2FsbGVyeShjb25maWcpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBjb250YWluZXJFbCA9IGNvbmZpZy5jb250YWluZXIsXG4gICAgICAgIHZpZXdwb3J0RWwsXG4gICAgICAgIGFsbEl0ZW1zRWwsXG4gICAgICAgIGl0ZW1FbHMsXG4gICAgICAgIHRyYW5zaXRpb25EdXJhdGlvbiA9IDMwMCxcbiAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXgsXG4gICAgICAgIHNob3duSXRlbUluZGV4LFxuICAgICAgICBkZWJvdW5jZU9uUmVzaXplLFxuICAgICAgICBkZWZhdWx0Q29uZmlnID0ge1xuICAgICAgICAgICAgbXVsdGlwbGVJdGVtc1BlclBhZ2U6IGZhbHNlLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogMTAsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiA1MCxcbiAgICAgICAgICAgIHRvdWNoOiBmYWxzZSxcbiAgICAgICAgICAgIHN5bmNJRDogbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzRGF0YVNvdXJjZSgpIHtcbiAgICAgICAgcmV0dXJuIChjb25maWcuaXRlbXMgJiYgY29uZmlnLml0ZW1zLmxlbmd0aCA+IDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFdpZHRocygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBsLFxuICAgICAgICAgICAgdG90YWxXaWR0aCA9IDAsXG4gICAgICAgICAgICBpdGVtV2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgaXRlbVdpZHRoID0gcGFyc2VJbnQoaXRlbUVsc1tzZWxlY3RlZEl0ZW1JbmRleF0uY2xpZW50V2lkdGgsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW1FbHNbaV0uc3R5bGUud2lkdGggPSBpdGVtV2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICB0b3RhbFdpZHRoICs9IGl0ZW1XaWR0aDtcbiAgICAgICAgfVxuICAgICAgICBhbGxJdGVtc0VsLnN0eWxlLndpZHRoID0gdG90YWxXaWR0aCArIFwicHhcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkSXRlbShuKSB7XG4gICAgICAgIHJldHVybiAodHlwZW9mIG4gPT09IFwibnVtYmVyXCIgJiYgbiA+IC0xICYmIG4gPCBpdGVtRWxzLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRJdGVtKCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gMCwgYywgbDtcbiAgICAgICAgZm9yIChjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoaXRlbUVsc1tjXS5jbGFzc05hbWUuaW5kZXhPZihcIm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIikgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gYztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFVpQ29udHJvbHMoKSB7XG4gICAgICAgIHZhciBwcmV2Q29udHJvbERpdiA9IGdhbGxlcnlET00uZ2V0UHJldkNvbnRyb2woKSxcbiAgICAgICAgICAgIG5leHRDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5nZXROZXh0Q29udHJvbCgpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5leHRDb250cm9sRGl2KTtcblxuICAgICAgICBwcmV2Q29udHJvbERpdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcHJldik7XG4gICAgICAgIG5leHRDb250cm9sRGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBuZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChuKSB7XG4gICAgICAgIHZhciBpdGVtTnVtcyA9IChuIGluc3RhbmNlb2YgQXJyYXkpID8gbiA6IFtuXTtcbiAgICAgICAgaWYgKGNvbmZpZy5pdGVtcykge1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtTnVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbU51bSA9IGl0ZW1OdW1zW2NdO1xuICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSXRlbShpdGVtTnVtKSAmJiAhY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLml0ZW1zW2l0ZW1OdW1dLCBpdGVtRWxzW2l0ZW1OdW1dKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1dob2xlSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ICsgaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCA8PSByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gKGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsIC0gaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPD0gcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SXRlbXNJblBhZ2VWaWV3KGwsIHIsIHdob2xlKSB7XG4gICAgICAgIHZhciBpdGVtc0luVmlldyA9IFtdLFxuICAgICAgICAgICAgb25seVdob2xlID0gKHR5cGVvZiB3aG9sZSAhPT0gXCJib29sZWFuXCIpID8gdHJ1ZSA6IHdob2xlO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGl0ZW1FbHMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGlmICgob25seVdob2xlICYmIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkgfHwgKCFvbmx5V2hvbGUgJiYgaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtc0luVmlldy5wdXNoKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpdGVtc0luVmlldztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc2l0aW9uVG8obmV3U2Nyb2xsTGVmdCkge1xuICAgICAgICB2YXIgc3RhcnQgPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQsXG4gICAgICAgICAgICBjaGFuZ2UgPSBuZXdTY3JvbGxMZWZ0IC0gc3RhcnQsXG4gICAgICAgICAgICBjdXJyZW50VGltZSA9IDAsXG4gICAgICAgICAgICBpbmNyZW1lbnQgPSAyMCxcbiAgICAgICAgICAgIHRpbWVvdXQ7XG5cbiAgICAgICAgLy8gdCA9IGN1cnJlbnQgdGltZSwgYiA9IHN0YXJ0IHZhbHVlLCBjID0gY2hhbmdlIGluIHZhbHVlLCBkID0gZHVyYXRpb25cbiAgICAgICAgZnVuY3Rpb24gZWFzZUluT3V0UXVhZCh0LCBiLCBjLCBkKSB7XG4gICAgICAgICAgICB0IC89IGQvMjtcbiAgICAgICAgICAgIGlmICh0IDwgMSkgeyByZXR1cm4gYy8yKnQqdCArIGI7IH1cbiAgICAgICAgICAgIHQtLTtcbiAgICAgICAgICAgIHJldHVybiAtYy8yICogKHQqKHQtMikgLSAxKSArIGI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhbmltYXRlU2Nyb2xsKCkge1xuICAgICAgICAgICAgY3VycmVudFRpbWUgKz0gaW5jcmVtZW50O1xuICAgICAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gZWFzZUluT3V0UXVhZChjdXJyZW50VGltZSwgc3RhcnQsIGNoYW5nZSwgdHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA8IHRyYW5zaXRpb25EdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChhbmltYXRlU2Nyb2xsLCBpbmNyZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFuaW1hdGVTY3JvbGwoKTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dJdGVtKG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBpbnNlcnRJdGVtQ29udGVudChbbl0pO1xuICAgICAgICAgICAgdmFyIG5ld1Njcm9sbExlZnQgPSBpdGVtRWxzW25dLm9mZnNldExlZnQ7XG4gICAgICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB0cmFuc2l0aW9uVG8obmV3U2Nyb2xsTGVmdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IG5ld1Njcm9sbExlZnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzaG93bkl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcobmV3U2Nyb2xsTGVmdCwgbmV3U2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldkl0ZW0oKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNob3duSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNob3duSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2hvd0l0ZW0ocHJldik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRJdGVtKCkge1xuICAgICAgICB2YXIgbmV4dCA9IChzaG93bkl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzaG93bkl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzaG93SXRlbShuZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldlBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IDApIHtcbiAgICAgICAgICAgIHNob3dJdGVtKGl0ZW1FbHMubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJldlBhZ2VXaG9sZUl0ZW1zID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCksXG4gICAgICAgICAgICAgICAgcHJldlBhZ2VJdGVtID0gcHJldlBhZ2VXaG9sZUl0ZW1zLnNoaWZ0KCkgfHwgMDtcbiAgICAgICAgICAgIHNob3dJdGVtKHByZXZQYWdlSXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dFBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzaG93SXRlbSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50V2hvbGVJdGVtc0luVmlldyA9IGdldEl0ZW1zSW5QYWdlVmlldyh2aWV3cG9ydEVsLnNjcm9sbExlZnQsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpLFxuICAgICAgICAgICAgICAgIGxhc3RXaG9sZUl0ZW1JblZpZXcgPSBjdXJyZW50V2hvbGVJdGVtc0luVmlldy5wb3AoKSB8fCBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBzaG93SXRlbShsYXN0V2hvbGVJdGVtSW5WaWV3ICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKG4sIHNob3cpIHtcbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1FbHNbY10uY2xhc3NOYW1lID0gaXRlbUVsc1tjXS5jbGFzc05hbWUgKyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUVsc1tjXS5jbGFzc05hbWUgPSBpdGVtRWxzW2NdLmNsYXNzTmFtZS5yZXBsYWNlKC9cXGJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXFxiLywnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNob3cpIHtcbiAgICAgICAgICAgICAgICBzaG93SXRlbShzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RQcmV2SXRlbShzaG93KSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNlbGVjdGVkSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNlbGVjdGVkSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2VsZWN0SXRlbShwcmV2LCBzaG93KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3ROZXh0SXRlbShzaG93KSB7XG4gICAgICAgIHZhciBuZXh0ID0gKHNlbGVjdGVkSXRlbUluZGV4ICsgMSA8IGl0ZW1FbHMubGVuZ3RoKSA/IHNlbGVjdGVkSXRlbUluZGV4ICsgMSA6IDA7XG4gICAgICAgIHNlbGVjdEl0ZW0obmV4dCwgc2hvdyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJldigpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd1ByZXZQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RQcmV2SXRlbSh0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dOZXh0UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0TmV4dEl0ZW0odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7IC8vIGNvcnJlY3QgdGhlIGFsaWdubWVudCBvZiBpdGVtIGluIHZpZXdcbiAgICAgICAgICAgIHNob3dJdGVtKHNob3duSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhuZXdTY3JvbGxMZWZ0LCBuZXdTY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4dGVuZE9iamVjdHMob2Jqcykge1xuICAgICAgICB2YXIgbmV3T2JqID0ge307XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gb2Jqcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBvYmpzW2NdO1xuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld09ialtwcm9wXSA9IG9ialtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld09iajtcbiAgICB9XG5cbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5lbXB0eUVsZW1lbnQoY29udGFpbmVyRWwpO1xuICAgICAgICBjb250YWluZXJFbC5jbGFzc05hbWUgPSBjb250YWluZXJFbC5jbGFzc05hbWUgKyBcIiBvLWdhbGxlcnlcIjtcbiAgICAgICAgYWxsSXRlbXNFbCA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKTtcbiAgICAgICAgaXRlbUVscyA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXMoYWxsSXRlbXNFbCwgY29uZmlnLml0ZW1zKTtcbiAgICB9XG4gICAgY29uZmlnID0gZXh0ZW5kT2JqZWN0cyhbZGVmYXVsdENvbmZpZywgZ2FsbGVyeURPTS5nZXRDb25maWdEYXRhQXR0cmlidXRlcyhjb250YWluZXJFbCksIGNvbmZpZ10pO1xuICAgIGdhbGxlcnlET00uc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoY29udGFpbmVyRWwsIGNvbmZpZyk7XG5cbiAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIHZpZXdwb3J0RWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZVZpZXdwb3J0KGFsbEl0ZW1zRWwpO1xuICAgIGl0ZW1FbHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbiAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgIHNob3duSXRlbUluZGV4ID0gc2VsZWN0ZWRJdGVtSW5kZXg7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWJvdW5jZU9uUmVzaXplKTtcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSA9IHNldFRpbWVvdXQob25SZXNpemUsIDUwMCk7IC8vIEFsc28gY2FsbCBvbiBpdGVtIGNvbnRlbnQgaW5zZXJ0IChmb3IgSlMgc291cmNlKT9cbiAgICB9KTtcbiAgICBpbnNlcnRJdGVtQ29udGVudChzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgc2V0V2lkdGhzKCk7XG4gICAgc2hvd0l0ZW0oc2VsZWN0ZWRJdGVtSW5kZXgsIGZhbHNlKTtcbiAgICBhZGRVaUNvbnRyb2xzKCk7XG5cbiAgICB0aGlzLnNob3dJdGVtID0gc2hvd0l0ZW07XG4gICAgdGhpcy5nZXRTZWxlY3RlZEl0ZW0gPSBnZXRTZWxlY3RlZEl0ZW07XG4gICAgdGhpcy5zaG93UHJldkl0ZW0gPSBzaG93UHJldkl0ZW07XG4gICAgdGhpcy5zaG93TmV4dEl0ZW0gPSBzaG93TmV4dEl0ZW07XG4gICAgdGhpcy5zaG93UHJldlBhZ2UgPSBzaG93UHJldlBhZ2U7XG4gICAgdGhpcy5zaG93TmV4dFBhZ2UgPSBzaG93TmV4dFBhZ2U7XG4gICAgdGhpcy5zZWxlY3RJdGVtID0gc2VsZWN0SXRlbTtcbiAgICB0aGlzLnNlbGVjdFByZXZJdGVtID0gc2VsZWN0UHJldkl0ZW07XG4gICAgdGhpcy5zZWxlY3ROZXh0SXRlbSA9IHNlbGVjdE5leHRJdGVtO1xuICAgIHRoaXMubmV4dCA9IG5leHQ7XG4gICAgdGhpcy5wcmV2ID0gcHJldjtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdhbGxlcnk7IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihHYWxsZXJ5KSB7XG4gICAgdmFyIGdFbHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtby1jb21wb25lbnQ9by1nYWxsZXJ5XVwiKSxcbiAgICAgICAgZ2FsbGVyaWVzID0gW107XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBnRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBnYWxsZXJpZXMucHVzaChuZXcgR2FsbGVyeSh7XG4gICAgICAgICAgICBjb250YWluZXI6IGdFbHNbY11cbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gZ2FsbGVyaWVzO1xufSIsIi8qZ2xvYmFsIG1vZHVsZSovXG5cblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBlbXB0eUVsZW1lbnQodGFyZ2V0RWwpIHtcbiAgICB3aGlsZSAodGFyZ2V0RWwuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YXJnZXRFbC5yZW1vdmVDaGlsZCh0YXJnZXRFbC5maXJzdENoaWxkKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZpZXdwb3J0KHRhcmdldEVsKSB7XG4gICAgdmFyIHBhcmVudEVsID0gdGFyZ2V0RWwucGFyZW50Tm9kZSxcbiAgICAgICAgdmlld3BvcnRFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHZpZXdwb3J0RWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJvLWdhbGxlcnlfX3ZpZXdwb3J0XCIpO1xuICAgIHZpZXdwb3J0RWwuYXBwZW5kQ2hpbGQodGFyZ2V0RWwpO1xuICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKHZpZXdwb3J0RWwpO1xuICAgIHJldHVybiB2aWV3cG9ydEVsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KG5vZGVOYW1lLCBjb250ZW50LCBjbGFzc2VzKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChub2RlTmFtZSk7XG4gICAgZWwuaW5uZXJIVE1MID0gY29udGVudDtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBjbGFzc2VzKTtcbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCkge1xuICAgIHZhciBpdGVtc0xpc3QgPSBjcmVhdGVFbGVtZW50KFwib2xcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGl0ZW1zTGlzdCk7XG4gICAgcmV0dXJuIGl0ZW1zTGlzdDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXMoY29udGFpbmVyRWwsIGl0ZW1zKSB7XG4gICAgdmFyIGl0ZW1DbGFzcztcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBpdGVtQ2xhc3MgPSBcIm8tZ2FsbGVyeV9faXRlbVwiICsgKChpdGVtc1tjXS5zZWxlY3RlZCkgPyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIgOiBcIlwiICk7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBcIiZuYnNwO1wiLCBpdGVtQ2xhc3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChpdGVtLCBpdGVtRWwpIHtcbiAgICBlbXB0eUVsZW1lbnQoaXRlbUVsKTtcbiAgICB2YXIgY29udGVudEVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1Db250ZW50LCBcIm8tZ2FsbGVyeV9faXRlbV9fY29udGVudFwiKTtcbiAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKTtcbiAgICBpZiAoaXRlbS5pdGVtQ2FwdGlvbikge1xuICAgICAgICB2YXIgY2FwdGlvbkVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1DYXB0aW9uLCBcIm8tZ2FsbGVyeV9faXRlbV9fY2FwdGlvblwiKTtcbiAgICAgICAgaXRlbUVsLmFwcGVuZENoaWxkKGNhcHRpb25FbCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcmV2Q29udHJvbCgpIHtcbiAgICByZXR1cm4gY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIlBSRVZcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1wcmV2XCIpO1xufVxuZnVuY3Rpb24gZ2V0TmV4dENvbnRyb2woKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJORVhUXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tbmV4dFwiKTtcbn1cblxuZnVuY3Rpb24gc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMoZWwsIGNvbmZpZykge1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1jb21wb25lbnRcIiwgXCJvLWdhbGxlcnlcIik7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktc3luY2lkXCIsIGNvbmZpZy5zeW5jSUQpO1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtby1nYWxsZXJ5LW11bHRpcGxlaXRlbXNwZXJwYWdlXCIsIGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSk7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiZGF0YS1vLWdhbGxlcnktdG91Y2hcIiwgY29uZmlnLnRvdWNoKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWluaGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0KTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIsIGNvbmZpZy5jYXB0aW9uTWF4SGVpZ2h0KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3BOYW1lLCBlbCwgYXR0ck5hbWUpIHtcbiAgICB2YXIgdiA9IGVsLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgaWYgKHYgIT09IG51bGwpIHtcbiAgICAgICAgb2JqW3Byb3BOYW1lXSA9IHY7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRDb25maWdEYXRhQXR0cmlidXRlcyhlbCkge1xuICAgIHZhciBjb25maWcgPSB7fTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJzeW5jSURcIiwgZWwsIFwiZGF0YS1vLWdhbGxlcnktc3luY2lkXCIpO1xuICAgIHNldFByb3BlcnR5SWZBdHRyaWJ1dGVFeGlzdHMoY29uZmlnLCBcIm11bHRpcGxlSXRlbXNQZXJQYWdlXCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LW11bHRpcGxlaXRlbXNwZXJwYWdlXCIpO1xuICAgIHNldFByb3BlcnR5SWZBdHRyaWJ1dGVFeGlzdHMoY29uZmlnLCBcInRvdWNoXCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LXRvdWNoXCIpO1xuICAgIHNldFByb3BlcnR5SWZBdHRyaWJ1dGVFeGlzdHMoY29uZmlnLCBcImNhcHRpb25NaW5IZWlnaHRcIiwgZWwsIFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1pbmhlaWdodFwiKTtcbiAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKGNvbmZpZywgXCJjYXB0aW9uTWF4SGVpZ2h0XCIsIGVsLCBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25tYXhoZWlnaHRcIik7XG4gICAgcmV0dXJuIGNvbmZpZztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW1wdHlFbGVtZW50OiBlbXB0eUVsZW1lbnQsXG4gICAgY3JlYXRlSXRlbXNMaXN0OiBjcmVhdGVJdGVtc0xpc3QsXG4gICAgY3JlYXRlSXRlbXM6IGNyZWF0ZUl0ZW1zLFxuICAgIGluc2VydEl0ZW1Db250ZW50OiBpbnNlcnRJdGVtQ29udGVudCxcbiAgICBjcmVhdGVWaWV3cG9ydDogY3JlYXRlVmlld3BvcnQsXG4gICAgZ2V0UHJldkNvbnRyb2w6IGdldFByZXZDb250cm9sLFxuICAgIGdldE5leHRDb250cm9sOiBnZXROZXh0Q29udHJvbCxcbiAgICBzZXRDb25maWdEYXRhQXR0cmlidXRlczogc2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXMsXG4gICAgZ2V0Q29uZmlnRGF0YUF0dHJpYnV0ZXM6IGdldENvbmZpZ0RhdGFBdHRyaWJ1dGVzXG59OyJdfQ==
