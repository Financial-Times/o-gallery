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

"use strict";

var galleryDOM = require('./galleryDOM.js');

function Gallery(config) {
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

    function insertItemsInView() {
        var itemsInView = getItemsInPageView(viewportEl.scrollLeft, viewportEl.scrollLeft + viewportEl.clientWidth, false);
        insertItemContent(itemsInView);
    }

    function showItem(n) {
        if (isValidItem(n)) {
            insertItemContent([n]);
            viewportEl.scrollLeft = itemEls[n].offsetLeft;
            shownItemIndex = n;
            insertItemsInView();
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
            insertItemsInView();
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
    setWidths(); // selectedItem content must have been inserted before setWidths runs
    showItem(selectedItemIndex);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3Rvci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5cbnZhciBHYWxsZXJ5ID0gcmVxdWlyZSgnLi9zcmMvanMvR2FsbGVyeScpLFxuICAgIGdhbGxlcnlDb25zdHJ1Y3RvciA9IHJlcXVpcmUoJy4vc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3RvcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBHYWxsZXJ5OiBHYWxsZXJ5LFxuICAgIGNvbnN0cnVjdEZyb21QYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHJldHVybiBnYWxsZXJ5Q29uc3RydWN0b3IoR2FsbGVyeSk7XG4gICAgfVxufTsiLCIvKlxuICAgIEFMV0FZUzogSlMgY29uZmlnIHRha2VzIHByZWNlZGVuY2Ugb3ZlciBIVE1MIHNvdXJjZVxuXG5cbiAgICBJTklUSUFMSVNBVElPTjpcbiAgICAgICAgMS4gW29wdGlvbmFsXSBJZiBjb25zdHJ1Y3RpbmcgZnJvbSBKUyBjb25maWc6XG4gICAgICAgICAgICAxLiBCdWlsZCBIVE1MIGl0ZW0gY29udGFpbmVycyBmcm9tIEpTIGNvbmZpZ1xuICAgICAgICAgICAgMi4gQWRkL3VwZGF0ZSBIVE1MIGRhdGEgYXR0cmlidXRlcyBmcm9tIEpTIGNvbmZpZyAoc28gSFRNTCBpcyBpbiBzeW5jIHdpdGggZGF0YSlcbiAgICAgICAgICAgIDMuIEJ1aWxkIHNlbGVjdGVkICgrIG5leHQvcHJldikgaXRlbSBIVE1MIGZyb20gSlMgY29uZmlnXG5cbiAgICAgICAgMi4gQnVpbGQgSlMgY29uZmlnIGZyb20gSFRNTCAoZXhjZXB0IGl0ZW0gZGF0YSksIGRvbid0IG92ZXJ3cml0ZSBhbnl0aGluZyBhbHJlYWR5IGluIHRoZSBKUyBjb25maWdcblxuICAgIFNFVFVQXG4gICAgICAgIDEuIEJ1aWxkIFVJIGNvbnRyb2xzXG4gICAgICAgIDIuIEJpbmQgVUkgZXZlbnRzXG4gICAgICAgIDMuIExpc3RlbiBmb3IgZXZlbnRzIGZyb20gb3RoZXIgR2FsbGVyaWVzXG5cbiAgICBSVU5OSU5HXG4gICAgICAgIDEuIEJ1aWxkIGl0ZW0gY29udGVudCBvbiBkZW1hbmQgKHNlbGVjdGVkICsgbmV4dC9wcmV2IGl0ZW0pLCBpZiBpdCBleGlzdHMgaW4gSlNPTiBjb25maWdcbiAgICAgICAgMi4gRW1pdCBldmVudHNcblxuICovXG5cbi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgZ2FsbGVyeURPTSA9IHJlcXVpcmUoJy4vZ2FsbGVyeURPTS5qcycpO1xuXG5mdW5jdGlvbiBHYWxsZXJ5KGNvbmZpZykge1xuICAgIGNvbnNvbGUubG9nKFwiQ29uc3RydWN0ZWQgR2FsbGVyeSBmcm9tIFwiICsgKGlzRGF0YVNvdXJjZSgpID8gXCJKU1wiIDogXCJIVE1MXCIpLCBjb25maWcpO1xuXG4gICAgLy8gVE9ETzogU2V0IGRlZmF1bHQgbW9kZWxcbiAgICBpZiAoIWNvbmZpZy5tb2RlbCkge1xuICAgICAgICBjb25maWcubW9kZWwgPSB7fTtcbiAgICB9XG5cbiAgICB2YXIgY29udGFpbmVyRWwgPSBjb25maWcuY29udGFpbmVyLFxuICAgICAgICB2aWV3cG9ydEVsLFxuICAgICAgICBhbGxJdGVtc0VsLFxuICAgICAgICBpdGVtRWxzLFxuICAgICAgICBtdWx0aXBsZUl0ZW1zUGVyUGFnZSA9IGNvbmZpZy5tb2RlbC5tdWx0aXBsZUl0ZW1zUGVyUGFnZSB8fCBjb250YWluZXJFbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiKSB8fCBmYWxzZSxcbiAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXgsXG4gICAgICAgIHNob3duSXRlbUluZGV4LFxuICAgICAgICBkZWJvdW5jZU9uUmVzaXplO1xuXG4gICAgZnVuY3Rpb24gaXNEYXRhU291cmNlKCkge1xuICAgICAgICByZXR1cm4gKGNvbmZpZy5tb2RlbCAmJiBjb25maWcubW9kZWwuaXRlbXMgJiYgY29uZmlnLm1vZGVsLml0ZW1zLmxlbmd0aCA+IDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFdpZHRocygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBsLFxuICAgICAgICAgICAgdG90YWxXaWR0aCA9IDAsXG4gICAgICAgICAgICBpdGVtV2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKG11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBpdGVtV2lkdGggPSBwYXJzZUludChpdGVtRWxzW3NlbGVjdGVkSXRlbUluZGV4XS5jbGllbnRXaWR0aCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaXRlbUVsc1tpXS5zdHlsZS53aWR0aCA9IGl0ZW1XaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggKz0gaXRlbVdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGFsbEl0ZW1zRWwuc3R5bGUud2lkdGggPSB0b3RhbFdpZHRoICsgXCJweFwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWRJdGVtKG4pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgbiA9PT0gXCJudW1iZXJcIiAmJiBuID4gLTEgJiYgbiA8IGl0ZW1FbHMubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZEl0ZW0oKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSAwLCBjLCBsO1xuICAgICAgICBmb3IgKGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGlmIChpdGVtRWxzW2NdLmNsYXNzTmFtZS5pbmRleE9mKFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKSA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSBjO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkVWlDb250cm9scygpIHtcbiAgICAgICAgdmFyIHByZXZDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5nZXRQcmV2Q29udHJvbCgpLFxuICAgICAgICAgICAgbmV4dENvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmdldE5leHRDb250cm9sKCk7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuXG4gICAgICAgIHByZXZDb250cm9sRGl2LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwcmV2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG5leHQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KG4pIHtcbiAgICAgICAgdmFyIGl0ZW1OdW1zID0gKG4gaW5zdGFuY2VvZiBBcnJheSkgPyBuIDogW25dO1xuICAgICAgICBpZiAoY29uZmlnLm1vZGVsLml0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1OdW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtTnVtID0gaXRlbU51bXNbY107XG4gICAgICAgICAgICAgICAgaWYgKGlzVmFsaWRJdGVtKGl0ZW1OdW0pICYmICFjb25maWcubW9kZWwuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2FsbGVyeURPTS5pbnNlcnRJdGVtQ29udGVudChjb25maWcubW9kZWwuaXRlbXNbaXRlbU51bV0sIGl0ZW1FbHNbaXRlbU51bV0pO1xuICAgICAgICAgICAgICAgICAgICBjb25maWcubW9kZWwuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydEl0ZW1zSW5WaWV3KCkge1xuICAgICAgICB2YXIgaXRlbXNJblZpZXcgPSBnZXRJdGVtc0luUGFnZVZpZXcodmlld3BvcnRFbC5zY3JvbGxMZWZ0LCB2aWV3cG9ydEVsLnNjcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSk7XG4gICAgICAgIGluc2VydEl0ZW1Db250ZW50KGl0ZW1zSW5WaWV3KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93SXRlbShuKSB7XG4gICAgICAgIGlmIChpc1ZhbGlkSXRlbShuKSkge1xuICAgICAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoW25dKTtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIHNob3duSXRlbUluZGV4ID0gbjtcbiAgICAgICAgICAgIGluc2VydEl0ZW1zSW5WaWV3KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldkl0ZW0oKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNob3duSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNob3duSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2hvd0l0ZW0ocHJldik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRJdGVtKCkge1xuICAgICAgICB2YXIgbmV4dCA9IChzaG93bkl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzaG93bkl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzaG93SXRlbShuZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1dob2xlSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ICsgaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCA8PSByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gKGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsIC0gaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPD0gcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SXRlbXNJblBhZ2VWaWV3KGwsIHIsIHdob2xlKSB7XG4gICAgICAgIHZhciBpdGVtc0luVmlldyA9IFtdLFxuICAgICAgICAgICAgb25seVdob2xlID0gKHR5cGVvZiB3aG9sZSAhPT0gXCJib29sZWFuXCIpID8gdHJ1ZSA6IHdob2xlO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGl0ZW1FbHMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGlmICgob25seVdob2xlICYmIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkgfHwgKCFvbmx5V2hvbGUgJiYgaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtc0luVmlldy5wdXNoKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpdGVtc0luVmlldztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldlBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IDApIHtcbiAgICAgICAgICAgIHNob3dJdGVtKGl0ZW1FbHMubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcHJldlBhZ2VXaG9sZUl0ZW1zID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCksXG4gICAgICAgICAgICAgICAgcHJldlBhZ2VJdGVtID0gcHJldlBhZ2VXaG9sZUl0ZW1zLnNoaWZ0KCkgfHwgMDtcbiAgICAgICAgICAgIHNob3dJdGVtKHByZXZQYWdlSXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dFBhZ2UoKSB7XG4gICAgICAgIGlmICh2aWV3cG9ydEVsLnNjcm9sbExlZnQgPT09IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzaG93SXRlbSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50V2hvbGVJdGVtc0luVmlldyA9IGdldEl0ZW1zSW5QYWdlVmlldyh2aWV3cG9ydEVsLnNjcm9sbExlZnQsIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpLFxuICAgICAgICAgICAgICAgIGxhc3RXaG9sZUl0ZW1JblZpZXcgPSBjdXJyZW50V2hvbGVJdGVtc0luVmlldy5wb3AoKSB8fCBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBzaG93SXRlbShsYXN0V2hvbGVJdGVtSW5WaWV3ICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKG4sIHNob3cpIHtcbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1FbHNbY10uY2xhc3NOYW1lID0gaXRlbUVsc1tjXS5jbGFzc05hbWUgKyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUVsc1tjXS5jbGFzc05hbWUgPSBpdGVtRWxzW2NdLmNsYXNzTmFtZS5yZXBsYWNlKC9cXGJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXFxiLywnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNob3cpIHtcbiAgICAgICAgICAgICAgICBzaG93SXRlbShzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RQcmV2SXRlbShzaG93KSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNlbGVjdGVkSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNlbGVjdGVkSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2VsZWN0SXRlbShwcmV2LCBzaG93KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3ROZXh0SXRlbShzaG93KSB7XG4gICAgICAgIHZhciBuZXh0ID0gKHNlbGVjdGVkSXRlbUluZGV4ICsgMSA8IGl0ZW1FbHMubGVuZ3RoKSA/IHNlbGVjdGVkSXRlbUluZGV4ICsgMSA6IDA7XG4gICAgICAgIHNlbGVjdEl0ZW0obmV4dCwgc2hvdyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJldigpIHtcbiAgICAgICAgaWYgKG11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzaG93UHJldlBhZ2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdFByZXZJdGVtKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgaWYgKG11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzaG93TmV4dFBhZ2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdE5leHRJdGVtKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZXNpemUoKSB7XG4gICAgICAgIHNldFdpZHRocygpO1xuICAgICAgICBpZiAoIW11bHRpcGxlSXRlbXNQZXJQYWdlKSB7IC8vIGNvcnJlY3QgdGhlIGFsaWdubWVudCBvZiBpdGVtIGluIHZpZXdcbiAgICAgICAgICAgIHNob3dJdGVtKHNob3duSXRlbUluZGV4KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluc2VydEl0ZW1zSW5WaWV3KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5lbXB0eUVsZW1lbnQoY29udGFpbmVyRWwpO1xuICAgICAgICAvLyBUT0RPOiBTZXQgb3JpZ2FtaSBhdHRyaWJ1dGVzIG9uIGNvbnRhaW5lckVsXG4gICAgICAgIGNvbnRhaW5lckVsLmNsYXNzTmFtZSA9IGNvbnRhaW5lckVsLmNsYXNzTmFtZSArIFwiIG8tZ2FsbGVyeVwiO1xuICAgICAgICBhbGxJdGVtc0VsID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpO1xuICAgICAgICBpdGVtRWxzID0gZ2FsbGVyeURPTS5jcmVhdGVJdGVtcyhhbGxJdGVtc0VsLCBjb25maWcubW9kZWwuaXRlbXMpO1xuICAgIH1cblxuICAgIGFsbEl0ZW1zRWwgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLm8tZ2FsbGVyeV9faXRlbXNcIik7XG4gICAgdmlld3BvcnRFbCA9IGdhbGxlcnlET00uY3JlYXRlVmlld3BvcnQoYWxsSXRlbXNFbCk7XG4gICAgaXRlbUVscyA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xuICAgIHNlbGVjdGVkSXRlbUluZGV4ID0gZ2V0U2VsZWN0ZWRJdGVtKCk7XG4gICAgc2hvd25JdGVtSW5kZXggPSBzZWxlY3RlZEl0ZW1JbmRleDtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlT25SZXNpemUpO1xuICAgICAgICBkZWJvdW5jZU9uUmVzaXplID0gc2V0VGltZW91dChvblJlc2l6ZSwgNTAwKTsgLy8gQWxzbyBjYWxsIG9uIGl0ZW0gY29udGVudCBpbnNlcnQgKGZvciBKUyBzb3VyY2UpP1xuICAgIH0pO1xuICAgIGluc2VydEl0ZW1Db250ZW50KHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICBzZXRXaWR0aHMoKTsgLy8gc2VsZWN0ZWRJdGVtIGNvbnRlbnQgbXVzdCBoYXZlIGJlZW4gaW5zZXJ0ZWQgYmVmb3JlIHNldFdpZHRocyBydW5zXG4gICAgc2hvd0l0ZW0oc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgIGFkZFVpQ29udHJvbHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FsbGVyeTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKEdhbGxlcnkpIHtcbiAgICB2YXIgZ0VscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1vLWNvbXBvbmVudD1vLWdhbGxlcnldXCIpLFxuICAgICAgICBnYWxsZXJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGdFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGdhbGxlcmllcy5wdXNoKG5ldyBHYWxsZXJ5KHtcbiAgICAgICAgICAgIGNvbnRhaW5lcjogZ0Vsc1tjXVxuICAgICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiBnYWxsZXJpZXM7XG59IiwiLypnbG9iYWwgbW9kdWxlKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGVtcHR5RWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHdoaWxlICh0YXJnZXRFbC5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhcmdldEVsLnJlbW92ZUNoaWxkKHRhcmdldEVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmlld3BvcnQodGFyZ2V0RWwpIHtcbiAgICB2YXIgcGFyZW50RWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB2aWV3cG9ydEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmlld3BvcnRFbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcIm8tZ2FsbGVyeV9fdmlld3BvcnRcIik7XG4gICAgdmlld3BvcnRFbC5hcHBlbmRDaGlsZCh0YXJnZXRFbCk7XG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQodmlld3BvcnRFbCk7XG4gICAgcmV0dXJuIHZpZXdwb3J0RWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQobm9kZU5hbWUsIGNvbnRlbnQsIGNsYXNzZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICBlbC5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMpO1xuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKSB7XG4gICAgdmFyIGl0ZW1zTGlzdCA9IGNyZWF0ZUVsZW1lbnQoXCJvbFwiLCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbXNcIik7XG4gICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoaXRlbXNMaXN0KTtcbiAgICByZXR1cm4gaXRlbXNMaXN0O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtcyhjb250YWluZXJFbCwgaXRlbXMpIHtcbiAgICB2YXIgaXRlbUNsYXNzO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGl0ZW1DbGFzcyA9IFwiby1nYWxsZXJ5X19pdGVtXCIgKyAoKGl0ZW1zW2NdLnNlbGVjdGVkKSA/IFwiIG8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIiA6IFwiXCIgKTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoY3JlYXRlRWxlbWVudChcImxpXCIsIFwiJm5ic3A7XCIsIGl0ZW1DbGFzcykpO1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG59XG5cbmZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KGl0ZW0sIGl0ZW1FbCkge1xuICAgIGVtcHR5RWxlbWVudChpdGVtRWwpO1xuICAgIHZhciBjb250ZW50RWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uaXRlbUNvbnRlbnQsIFwiby1nYWxsZXJ5X19pdGVtX19jb250ZW50XCIpOyAvLyBUT0RPOiBSZW5hbWUgdG8gby1nYWxsZXJ5X19pdGVtX19jb250ZW50XG4gICAgaXRlbUVsLmFwcGVuZENoaWxkKGNvbnRlbnRFbCk7XG4gICAgaWYgKGl0ZW0uaXRlbUNhcHRpb24pIHtcbiAgICAgICAgdmFyIGNhcHRpb25FbCA9IGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgaXRlbS5pdGVtQ2FwdGlvbiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7IC8vIFRPRE86IFJlbmFtZSB0byBvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cbiAgICAgICAgaXRlbUVsLmFwcGVuZENoaWxkKGNhcHRpb25FbCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcmV2Q29udHJvbCgpIHtcbiAgICByZXR1cm4gY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIlBSRVZcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1wcmV2XCIpO1xufVxuZnVuY3Rpb24gZ2V0TmV4dENvbnRyb2woKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJORVhUXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tbmV4dFwiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW1wdHlFbGVtZW50OiBlbXB0eUVsZW1lbnQsXG4gICAgY3JlYXRlSXRlbXNMaXN0OiBjcmVhdGVJdGVtc0xpc3QsXG4gICAgY3JlYXRlSXRlbXM6IGNyZWF0ZUl0ZW1zLFxuICAgIGluc2VydEl0ZW1Db250ZW50OiBpbnNlcnRJdGVtQ29udGVudCxcbiAgICBjcmVhdGVWaWV3cG9ydDogY3JlYXRlVmlld3BvcnQsXG4gICAgZ2V0UHJldkNvbnRyb2w6IGdldFByZXZDb250cm9sLFxuICAgIGdldE5leHRDb250cm9sOiBnZXROZXh0Q29udHJvbFxufTsiXX0=
