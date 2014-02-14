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