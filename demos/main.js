require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"hjDe2K":[function(require,module,exports){
var Gallery = require('./src/js/Gallery'),
    galleryConstructor = require('./src/js/galleryConstructor');

module.exports = {
    Gallery: Gallery,
    constructFromPage: function() {
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

var galleryDOM = require('./galleryDOM.js');

function Gallery(config) {
    console.log("Constructed Gallery from " + (isDataSource() ? "JS" : "HTML"), config);

    var containerEl = config.container,
        viewportEl,
        allItemsEl,
        itemEls,
        multipleItemsPerPage = config.multipleItemsPerPage || containerEl.getAttribute("data-o-gallery-multipleitemsperpage") || false,
        selectedItemIndex,
        shownItemIndex,
        debounceOnResize;

    function isDataSource() {
        return (config.model && config.model.items && config.model.items.length > 0);
    }

    function setWidths() {
        var i, l, totalWidth = 0;
        if (!multipleItemsPerPage) {
            for (i = 0, l = itemEls.length; i < l; i++) {
                itemEls[i].style.width = containerEl.clientWidth + "px";
            }
        }
        for (i = 0, l = itemEls.length; i < l; i++) {
            totalWidth += parseInt(itemEls[i].clientWidth, 0); // items may be varying widths?
        }
        allItemsEl.style.width = totalWidth + "px";
    }

    function isValidItem(n) {
        return (typeof n === "number" && n > -1 && n < itemEls.length);
    }

    function getSelectedItem() {
        var selectedItem = 0, c, l;
        if (isDataSource()) {
            for (c = 0, l = config.model.items.length; c < l; c++) {
                if (config.model.items.selected) {
                    selectedItem = c;
                    break;
                }
            }
        } else {
            for (c = 0, l = itemEls.length; c < l; c++) {
                if (itemEls[c].className.indexOf("o-gallery__item--selected") > 0) {
                    selectedItem = c;
                    break;
                }
            }
        }
        return selectedItem;
    }

    // Separate this out somewhere else?
    function addUiControls() {
        var prevControlDiv = galleryDOM.getPrevControl(),
            nextControlDiv = galleryDOM.getNextControl();
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);

        prevControlDiv.addEventListener("click", prev);
        nextControlDiv.addEventListener("click", next);
    }

    function showItem(n) {
        if (isValidItem(n)) {
            // TODO: Build HTML item content from JS data, if JS data exists
            shownItemIndex = n;
            viewportEl.scrollLeft = itemEls[n].offsetLeft;
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

    // TODO: Make this and showNextPage more DRY
    function showPrevPage() {
        var newX = viewportEl.scrollLeft - parseInt(containerEl.clientWidth, 0),
            maxX = parseInt(allItemsEl.clientWidth) - parseInt(viewportEl.clientWidth, 0);
        newX = (newX < 0) ? 0 : newX;
        if (newX === viewportEl.scrollLeft) { // wrap if at extreme left
            newX = maxX;
        }
        viewportEl.scrollLeft = newX;
    }

    function showNextPage() {
        var newX = viewportEl.scrollLeft + parseInt(containerEl.clientWidth, 0),
            maxX = parseInt(allItemsEl.clientWidth) - parseInt(viewportEl.clientWidth, 0);
        newX = Math.min(newX, maxX);
        if (newX === viewportEl.scrollLeft) { // wrap if at extreme right
            newX = 0;
        }
        viewportEl.scrollLeft = newX;
    }

    function selectItem(n, show) {
        if (isValidItem(n)) {
            selectedItemIndex = n;
            for (var c = 0, l = itemEls.length; c < l; c++) {
                if (c == selectedItemIndex) {
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
        if (!multipleItemsPerPage) { // correct alignment of item in view
            showItem(shownItemIndex);
        }
    }

    if (isDataSource()) {
        // container element will contain 'poster/fallback content'
        containerEl.className = containerEl.className + " o-gallery";
        // Set origami attributes on containerEl
        allItemsEl = galleryDOM.createItemsList(containerEl);
        itemEls = galleryDOM.createItems(allItemsEl, config.model.items.length);
        // Loop over data items, construct <li> for each one
    } else {
        // container element contains gallery markup
        allItemsEl = containerEl.querySelector(".o-gallery__items");
        viewportEl = galleryDOM.createViewport(allItemsEl);
        itemEls = containerEl.querySelectorAll(".o-gallery__item");
        selectedItemIndex = getSelectedItem();
        shownItemIndex = selectedItemIndex;
        setWidths();
        window.addEventListener("resize", function() {
            clearTimeout(debounceOnResize);
            debounceOnResize = setTimeout(onResize, 500); // Also call on item content insert (for JS source)?
        });
        showItem(selectedItemIndex);
    }
    // In either case, create UI controls, add selected class, add js class
    addUiControls();

    this.showItem = showItem;
    this.getSelectedItem = getSelectedItem;
    this.showPrevItem = showPrevItem;
    this.showNextItem = showNextItem;
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
function createViewport(targetEl) {
    var parentEl = targetEl.parentNode,
        viewportEl = document.createElement('div');
    viewportEl.setAttribute("class", "o-gallery__viewport");
    viewportEl.appendChild(targetEl);
    parentEl.appendChild(viewportEl);
    return viewportEl;
}

function createElement(nodeName, content, classes) {
    var el = document.createElement(nodeName),
        cont = document.createTextNode(content);
    el.setAttribute("class", classes);
    el.appendChild(cont);
    return el;
}

function createItemsList(containerEl) {
    var itemsList = createElement("ol", "", "o-gallery__items");
    containerEl.appendChild(itemsList);
    return itemsList;
}

function createItems(containerEl, n) {
    for (var c = 0; c < n; c++) {
        containerEl.appendChild(createElement("li", "", "o-gallery__item"));
    }
    return containerEl.querySelectorAll(".o-gallery__item");
}

function getPrevControl() {
    return createElement("div", "PREV", "o-gallery__control o-gallery__control--prev");
}
function getNextControl() {
    return createElement("div", "NEXT", "o-gallery__control o-gallery__control--next");
}

module.exports = {
    createItemsList: createItemsList,
    createItems: createItems,
    createViewport: createViewport,
    getPrevControl: getPrevControl,
    getNextControl: getNextControl
};
},{}]},{},["hjDe2K"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3Rvci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBHYWxsZXJ5ID0gcmVxdWlyZSgnLi9zcmMvanMvR2FsbGVyeScpLFxuICAgIGdhbGxlcnlDb25zdHJ1Y3RvciA9IHJlcXVpcmUoJy4vc3JjL2pzL2dhbGxlcnlDb25zdHJ1Y3RvcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBHYWxsZXJ5OiBHYWxsZXJ5LFxuICAgIGNvbnN0cnVjdEZyb21QYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGdhbGxlcnlDb25zdHJ1Y3RvcihHYWxsZXJ5KTtcbiAgICB9XG59OyIsIi8qXG4gICAgQUxXQVlTOiBKUyBjb25maWcgdGFrZXMgcHJlY2VkZW5jZSBvdmVyIEhUTUwgc291cmNlXG5cblxuICAgIElOSVRJQUxJU0FUSU9OOlxuICAgICAgICAxLiBbb3B0aW9uYWxdIElmIGNvbnN0cnVjdGluZyBmcm9tIEpTIGNvbmZpZzpcbiAgICAgICAgICAgIDEuIEJ1aWxkIEhUTUwgaXRlbSBjb250YWluZXJzIGZyb20gSlMgY29uZmlnXG4gICAgICAgICAgICAyLiBBZGQvdXBkYXRlIEhUTUwgZGF0YSBhdHRyaWJ1dGVzIGZyb20gSlMgY29uZmlnIChzbyBIVE1MIGlzIGluIHN5bmMgd2l0aCBkYXRhKVxuICAgICAgICAgICAgMy4gQnVpbGQgc2VsZWN0ZWQgKCsgbmV4dC9wcmV2KSBpdGVtIEhUTUwgZnJvbSBKUyBjb25maWdcblxuICAgICAgICAyLiBCdWlsZCBKUyBjb25maWcgZnJvbSBIVE1MIChleGNlcHQgaXRlbSBkYXRhKSwgZG9uJ3Qgb3ZlcndyaXRlIGFueXRoaW5nIGFscmVhZHkgaW4gdGhlIEpTIGNvbmZpZ1xuXG4gICAgU0VUVVBcbiAgICAgICAgMS4gQnVpbGQgVUkgY29udHJvbHNcbiAgICAgICAgMi4gQmluZCBVSSBldmVudHNcbiAgICAgICAgMy4gTGlzdGVuIGZvciBldmVudHMgZnJvbSBvdGhlciBHYWxsZXJpZXNcblxuICAgIFJVTk5JTkdcbiAgICAgICAgMS4gQnVpbGQgaXRlbSBjb250ZW50IG9uIGRlbWFuZCAoc2VsZWN0ZWQgKyBuZXh0L3ByZXYgaXRlbSksIGlmIGl0IGV4aXN0cyBpbiBKU09OIGNvbmZpZ1xuICAgICAgICAyLiBFbWl0IGV2ZW50c1xuXG4gKi9cblxudmFyIGdhbGxlcnlET00gPSByZXF1aXJlKCcuL2dhbGxlcnlET00uanMnKTtcblxuZnVuY3Rpb24gR2FsbGVyeShjb25maWcpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNvbnN0cnVjdGVkIEdhbGxlcnkgZnJvbSBcIiArIChpc0RhdGFTb3VyY2UoKSA/IFwiSlNcIiA6IFwiSFRNTFwiKSwgY29uZmlnKTtcblxuICAgIHZhciBjb250YWluZXJFbCA9IGNvbmZpZy5jb250YWluZXIsXG4gICAgICAgIHZpZXdwb3J0RWwsXG4gICAgICAgIGFsbEl0ZW1zRWwsXG4gICAgICAgIGl0ZW1FbHMsXG4gICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlID0gY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlIHx8IGNvbnRhaW5lckVsLmdldEF0dHJpYnV0ZShcImRhdGEtby1nYWxsZXJ5LW11bHRpcGxlaXRlbXNwZXJwYWdlXCIpIHx8IGZhbHNlLFxuICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgc2hvd25JdGVtSW5kZXgsXG4gICAgICAgIGRlYm91bmNlT25SZXNpemU7XG5cbiAgICBmdW5jdGlvbiBpc0RhdGFTb3VyY2UoKSB7XG4gICAgICAgIHJldHVybiAoY29uZmlnLm1vZGVsICYmIGNvbmZpZy5tb2RlbC5pdGVtcyAmJiBjb25maWcubW9kZWwuaXRlbXMubGVuZ3RoID4gMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0V2lkdGhzKCkge1xuICAgICAgICB2YXIgaSwgbCwgdG90YWxXaWR0aCA9IDA7XG4gICAgICAgIGlmICghbXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGl0ZW1FbHNbaV0uc3R5bGUud2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggKz0gcGFyc2VJbnQoaXRlbUVsc1tpXS5jbGllbnRXaWR0aCwgMCk7IC8vIGl0ZW1zIG1heSBiZSB2YXJ5aW5nIHdpZHRocz9cbiAgICAgICAgfVxuICAgICAgICBhbGxJdGVtc0VsLnN0eWxlLndpZHRoID0gdG90YWxXaWR0aCArIFwicHhcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkSXRlbShuKSB7XG4gICAgICAgIHJldHVybiAodHlwZW9mIG4gPT09IFwibnVtYmVyXCIgJiYgbiA+IC0xICYmIG4gPCBpdGVtRWxzLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRJdGVtKCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gMCwgYywgbDtcbiAgICAgICAgaWYgKGlzRGF0YVNvdXJjZSgpKSB7XG4gICAgICAgICAgICBmb3IgKGMgPSAwLCBsID0gY29uZmlnLm1vZGVsLml0ZW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcubW9kZWwuaXRlbXMuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gYztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW1FbHNbY10uY2xhc3NOYW1lLmluZGV4T2YoXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSBjO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkSXRlbTtcbiAgICB9XG5cbiAgICAvLyBTZXBhcmF0ZSB0aGlzIG91dCBzb21ld2hlcmUgZWxzZT9cbiAgICBmdW5jdGlvbiBhZGRVaUNvbnRyb2xzKCkge1xuICAgICAgICB2YXIgcHJldkNvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmdldFByZXZDb250cm9sKCksXG4gICAgICAgICAgICBuZXh0Q29udHJvbERpdiA9IGdhbGxlcnlET00uZ2V0TmV4dENvbnRyb2woKTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQocHJldkNvbnRyb2xEaXYpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChuZXh0Q29udHJvbERpdik7XG5cbiAgICAgICAgcHJldkNvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHByZXYpO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgbmV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0l0ZW0obikge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IEJ1aWxkIEhUTUwgaXRlbSBjb250ZW50IGZyb20gSlMgZGF0YSwgaWYgSlMgZGF0YSBleGlzdHNcbiAgICAgICAgICAgIHNob3duSXRlbUluZGV4ID0gbjtcbiAgICAgICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dQcmV2SXRlbSgpIHtcbiAgICAgICAgdmFyIHByZXYgPSAoc2hvd25JdGVtSW5kZXggLSAxID49IDApID8gc2hvd25JdGVtSW5kZXggLSAxIDogaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICBzaG93SXRlbShwcmV2KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93TmV4dEl0ZW0oKSB7XG4gICAgICAgIHZhciBuZXh0ID0gKHNob3duSXRlbUluZGV4ICsgMSA8IGl0ZW1FbHMubGVuZ3RoKSA/IHNob3duSXRlbUluZGV4ICsgMSA6IDA7XG4gICAgICAgIHNob3dJdGVtKG5leHQpO1xuICAgIH1cblxuICAgIC8vIFRPRE86IE1ha2UgdGhpcyBhbmQgc2hvd05leHRQYWdlIG1vcmUgRFJZXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZQYWdlKCkge1xuICAgICAgICB2YXIgbmV3WCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCAtIHBhcnNlSW50KGNvbnRhaW5lckVsLmNsaWVudFdpZHRoLCAwKSxcbiAgICAgICAgICAgIG1heFggPSBwYXJzZUludChhbGxJdGVtc0VsLmNsaWVudFdpZHRoKSAtIHBhcnNlSW50KHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIDApO1xuICAgICAgICBuZXdYID0gKG5ld1ggPCAwKSA/IDAgOiBuZXdYO1xuICAgICAgICBpZiAobmV3WCA9PT0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0KSB7IC8vIHdyYXAgaWYgYXQgZXh0cmVtZSBsZWZ0XG4gICAgICAgICAgICBuZXdYID0gbWF4WDtcbiAgICAgICAgfVxuICAgICAgICB2aWV3cG9ydEVsLnNjcm9sbExlZnQgPSBuZXdYO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0UGFnZSgpIHtcbiAgICAgICAgdmFyIG5ld1ggPSB2aWV3cG9ydEVsLnNjcm9sbExlZnQgKyBwYXJzZUludChjb250YWluZXJFbC5jbGllbnRXaWR0aCwgMCksXG4gICAgICAgICAgICBtYXhYID0gcGFyc2VJbnQoYWxsSXRlbXNFbC5jbGllbnRXaWR0aCkgLSBwYXJzZUludCh2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCAwKTtcbiAgICAgICAgbmV3WCA9IE1hdGgubWluKG5ld1gsIG1heFgpO1xuICAgICAgICBpZiAobmV3WCA9PT0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0KSB7IC8vIHdyYXAgaWYgYXQgZXh0cmVtZSByaWdodFxuICAgICAgICAgICAgbmV3WCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gbmV3WDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKG4sIHNob3cpIHtcbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGMgPT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUVsc1tjXS5jbGFzc05hbWUgPSBpdGVtRWxzW2NdLmNsYXNzTmFtZSArIFwiIG8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpdGVtRWxzW2NdLmNsYXNzTmFtZSA9IGl0ZW1FbHNbY10uY2xhc3NOYW1lLnJlcGxhY2UoL1xcYm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcXGIvLCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdFByZXZJdGVtKHNob3cpIHtcbiAgICAgICAgdmFyIHByZXYgPSAoc2VsZWN0ZWRJdGVtSW5kZXggLSAxID49IDApID8gc2VsZWN0ZWRJdGVtSW5kZXggLSAxIDogaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICBzZWxlY3RJdGVtKHByZXYsIHNob3cpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdE5leHRJdGVtKHNob3cpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2VsZWN0SXRlbShuZXh0LCBzaG93KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmV2KCkge1xuICAgICAgICBpZiAobXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dQcmV2UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0UHJldkl0ZW0odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICBpZiAobXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dOZXh0UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0TmV4dEl0ZW0odHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghbXVsdGlwbGVJdGVtc1BlclBhZ2UpIHsgLy8gY29ycmVjdCBhbGlnbm1lbnQgb2YgaXRlbSBpbiB2aWV3XG4gICAgICAgICAgICBzaG93SXRlbShzaG93bkl0ZW1JbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgLy8gY29udGFpbmVyIGVsZW1lbnQgd2lsbCBjb250YWluICdwb3N0ZXIvZmFsbGJhY2sgY29udGVudCdcbiAgICAgICAgY29udGFpbmVyRWwuY2xhc3NOYW1lID0gY29udGFpbmVyRWwuY2xhc3NOYW1lICsgXCIgby1nYWxsZXJ5XCI7XG4gICAgICAgIC8vIFNldCBvcmlnYW1pIGF0dHJpYnV0ZXMgb24gY29udGFpbmVyRWxcbiAgICAgICAgYWxsSXRlbXNFbCA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKTtcbiAgICAgICAgaXRlbUVscyA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXMoYWxsSXRlbXNFbCwgY29uZmlnLm1vZGVsLml0ZW1zLmxlbmd0aCk7XG4gICAgICAgIC8vIExvb3Agb3ZlciBkYXRhIGl0ZW1zLCBjb25zdHJ1Y3QgPGxpPiBmb3IgZWFjaCBvbmVcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjb250YWluZXIgZWxlbWVudCBjb250YWlucyBnYWxsZXJ5IG1hcmt1cFxuICAgICAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgICAgICB2aWV3cG9ydEVsID0gZ2FsbGVyeURPTS5jcmVhdGVWaWV3cG9ydChhbGxJdGVtc0VsKTtcbiAgICAgICAgaXRlbUVscyA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xuICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgICAgICBzaG93bkl0ZW1JbmRleCA9IHNlbGVjdGVkSXRlbUluZGV4O1xuICAgICAgICBzZXRXaWR0aHMoKTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoZGVib3VuY2VPblJlc2l6ZSk7XG4gICAgICAgICAgICBkZWJvdW5jZU9uUmVzaXplID0gc2V0VGltZW91dChvblJlc2l6ZSwgNTAwKTsgLy8gQWxzbyBjYWxsIG9uIGl0ZW0gY29udGVudCBpbnNlcnQgKGZvciBKUyBzb3VyY2UpP1xuICAgICAgICB9KTtcbiAgICAgICAgc2hvd0l0ZW0oc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgIH1cbiAgICAvLyBJbiBlaXRoZXIgY2FzZSwgY3JlYXRlIFVJIGNvbnRyb2xzLCBhZGQgc2VsZWN0ZWQgY2xhc3MsIGFkZCBqcyBjbGFzc1xuICAgIGFkZFVpQ29udHJvbHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FsbGVyeTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKEdhbGxlcnkpIHtcbiAgICB2YXIgZ0VscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1vLWNvbXBvbmVudD1vLWdhbGxlcnldXCIpLFxuICAgICAgICBnYWxsZXJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGdFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGdhbGxlcmllcy5wdXNoKG5ldyBHYWxsZXJ5KHtcbiAgICAgICAgICAgIGNvbnRhaW5lcjogZ0Vsc1tjXVxuICAgICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiBnYWxsZXJpZXM7XG59IiwiZnVuY3Rpb24gY3JlYXRlVmlld3BvcnQodGFyZ2V0RWwpIHtcbiAgICB2YXIgcGFyZW50RWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB2aWV3cG9ydEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmlld3BvcnRFbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcIm8tZ2FsbGVyeV9fdmlld3BvcnRcIik7XG4gICAgdmlld3BvcnRFbC5hcHBlbmRDaGlsZCh0YXJnZXRFbCk7XG4gICAgcGFyZW50RWwuYXBwZW5kQ2hpbGQodmlld3BvcnRFbCk7XG4gICAgcmV0dXJuIHZpZXdwb3J0RWw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQobm9kZU5hbWUsIGNvbnRlbnQsIGNsYXNzZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKSxcbiAgICAgICAgY29udCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNvbnRlbnQpO1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMpO1xuICAgIGVsLmFwcGVuZENoaWxkKGNvbnQpO1xuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKSB7XG4gICAgdmFyIGl0ZW1zTGlzdCA9IGNyZWF0ZUVsZW1lbnQoXCJvbFwiLCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbXNcIik7XG4gICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoaXRlbXNMaXN0KTtcbiAgICByZXR1cm4gaXRlbXNMaXN0O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtcyhjb250YWluZXJFbCwgbikge1xuICAgIGZvciAodmFyIGMgPSAwOyBjIDwgbjsgYysrKSB7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbVwiKSk7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbn1cblxuZnVuY3Rpb24gZ2V0UHJldkNvbnRyb2woKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJQUkVWXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tcHJldlwiKTtcbn1cbmZ1bmN0aW9uIGdldE5leHRDb250cm9sKCkge1xuICAgIHJldHVybiBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiTkVYVFwiLCBcIm8tZ2FsbGVyeV9fY29udHJvbCBvLWdhbGxlcnlfX2NvbnRyb2wtLW5leHRcIik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZUl0ZW1zTGlzdDogY3JlYXRlSXRlbXNMaXN0LFxuICAgIGNyZWF0ZUl0ZW1zOiBjcmVhdGVJdGVtcyxcbiAgICBjcmVhdGVWaWV3cG9ydDogY3JlYXRlVmlld3BvcnQsXG4gICAgZ2V0UHJldkNvbnRyb2w6IGdldFByZXZDb250cm9sLFxuICAgIGdldE5leHRDb250cm9sOiBnZXROZXh0Q29udHJvbFxufTsiXX0=
