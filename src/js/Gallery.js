/*global require, module*/

var oDom = require('o-dom'),
    dom = require('./dom'),
    FTScroller = require('ftscroller'),
    SimpleScroller = require('./SimpleScroller');

function Gallery(containerEl, config) {
    "use strict";

    var viewportEl,
        titleEl,
        allItemsEl,
        itemEls,
        selectedItemIndex,
        shownItemIndex,
        debounceOnResize,
        scroller,
        debounceScroll,
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
            captionMaxHeight: "data-o-gallery-captionmaxheight",
            windowResize: "data-o-gallery-windowresize"
        },
        defaultConfig = {
            component: "o-gallery",
            version: "0.0.0",
            multipleItemsPerPage: false,
            captions: true,
            captionMinHeight: 24,
            captionMaxHeight: 52,
            touch: false,
            syncID: "o-gallery-" + new Date().getTime(),
            windowResize: true
        },
        allowTransitions = false;

    function supportsCssTransforms() {
        var htmlEl = document.getElementsByTagName('html')[0];
        return htmlEl.classList.contains("csstransforms") || htmlEl.classList.contains("csstransforms3d") || htmlEl.classList.contains("csstransitions");
    }

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
            if (itemEls[c].classList.contains("o-gallery__item--selected")) {
                selectedItem = c;
                break;
            }
        }
        return selectedItem;
    }

    function selectOnClick(evt) {
        var clickedItemNum = oDom.getIndex(oDom.getClosestMatch(evt.srcElement, ".o-gallery__item"));
        selectItem(clickedItemNum, true, "user");
    }

    function addUiControls() {
        prevControlDiv = dom.createElement("div", "", "o-gallery__control o-gallery__control--prev");
        nextControlDiv = dom.createElement("div", "", "o-gallery__control o-gallery__control--next");
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);
        prevControlDiv.addEventListener("click", prev, false);
        nextControlDiv.addEventListener("click", next, false);
        if (config.multipleItemsPerPage) {
            viewportEl.addEventListener("click", selectOnClick, false);
        }
    }

    function updateControlStates() {
        if (scroller.scrollLeft > 0) {
            prevControlDiv.classList.add("o-gallery__control--show");
        } else {
            prevControlDiv.classList.remove("o-gallery__control--show");
        }
        if (scroller.scrollLeft < allItemsEl.clientWidth - viewportEl.clientWidth) {
            nextControlDiv.classList.add("o-gallery__control--show");
        } else {
            nextControlDiv.classList.remove("o-gallery__control--show");
        }
    }

    function getTitleEl() {
        titleEl = containerEl.querySelector(".o-gallery__title");
        if (titleEl) {
            titleEl.parentNode.removeChild(titleEl);
        } else if (config.title) {
            titleEl = dom.createElement('div', config.title, 'o-gallery__title');
        }
        if (titleEl && config.title) {
            titleEl.innerHTML = config.title;
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
                    dom.insertItemContent(config, config.items[itemNum], itemEls[itemNum]);
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

    function onGalleryCustomEvent(evt) {
        if (evt.srcElement !== containerEl && evt.detail.syncID === config.syncID && evt.detail.source === "user") {
            selectItem(evt.detail.itemID, true);
        }
    }

    function listenForSyncEvents() {
        document.addEventListener("oGallery.itemSelect", onGalleryCustomEvent, false);
    }

    function triggerEvent(name, data) {
        data.syncID = config.syncID;
        if (document.createEvent && containerEl.dispatchEvent) {
            var event = document.createEvent('Event');
            event.initEvent(name, true, true);
            if (data) {
                event.detail = data;
            }
            containerEl.dispatchEvent(event);
        }
    }

    function moveViewport(left) {
        scroller.scrollTo(left, 0, (allowTransitions) ? true : 0);
        insertItemContent(getItemsInPageView(left, left + viewportEl.clientWidth, false));
    }

    function alignItemLeft(n) {
        moveViewport(itemEls[n].offsetLeft);
    }

    function alignItemRight(n) {
        var newScrollLeft = itemEls[n].offsetLeft - (viewportEl.clientWidth - itemEls[n].clientWidth);
        moveViewport(newScrollLeft);
    }

    function bringItemIntoView(n) {
        if (!isValidItem(n)) {
            return;
        }
        var viewportL = scroller.scrollLeft,
            viewportR = viewportL + viewportEl.clientWidth,
            itemL = itemEls[n].offsetLeft,
            itemR = itemL + itemEls[n].clientWidth;
        if (itemL > viewportL && itemR < viewportR) {
            return;
        }
        if (itemL < viewportL) {
            alignItemLeft(n);
        } else if (itemR > viewportR) {
            alignItemRight(n);
        }
    }

    function showItem(n) {
        if (isValidItem(n)) {
            bringItemIntoView(n);
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
        if (scroller.scrollLeft > 0) {
            var prevPageWholeItems = getItemsInPageView(scroller.scrollLeft - viewportEl.clientWidth, scroller.scrollLeft),
                prevPageItem = prevPageWholeItems.pop() || 0;
            alignItemRight(prevPageItem);
        }
    }

    function showNextPage() {
        if (scroller.scrollLeft < allItemsEl.clientWidth - viewportEl.clientWidth) {
            var currentWholeItemsInView = getItemsInPageView(scroller.scrollLeft, scroller.scrollLeft + viewportEl.clientWidth),
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
                        itemEls[c].classList.add("o-gallery__item--selected");
                    } else {
                        itemEls[c].classList.remove("o-gallery__item--selected");
                    }
                }
                triggerEvent("oGallery.itemSelect", {
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
            showItem(shownItemIndex);
        } else {
            var newScrollLeft = scroller.scrollLeft;
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
        dom.setAttributesFromProperties(containerEl, config, propertyAttributeMap, ["items"]);
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

    function onScroll(evt) {
        updateControlStates();
        insertItemContent(getItemsInPageView(evt.scrollLeft, evt.scrollLeft + viewportEl.clientWidth, false));
    }

    function destroy() {
        prevControlDiv.parentNode.removeChild(prevControlDiv);
        prevControlDiv = null;
        nextControlDiv.parentNode.removeChild(nextControlDiv);
        nextControlDiv = null;
        if (config.multipleItemsPerPage) {
            viewportEl.removeEventListener("click", selectOnClick, false);
        }
        scroller.destroy(true);
        for (var prop in propertyAttributeMap) {
            if (propertyAttributeMap.hasOwnProperty(prop)) {
                containerEl.removeAttribute(propertyAttributeMap[prop]);
            }
        }
        document.removeEventListener("oGallery.itemSelect", onGalleryCustomEvent, false);
        if (config.windowResize) {
            window.removeEventListener("resize", resizeHandler, false);
        }
    }

    containerEl.classList.add("o-gallery--js");
    if (isDataSource()) {
        dom.emptyElement(containerEl);
        containerEl.classList.add("o-gallery");
        allItemsEl = dom.createItemsList(containerEl);
        itemEls = dom.createItems(allItemsEl, config.items);
    }
    config = extendObjects([defaultConfig, dom.getPropertiesFromAttributes(containerEl, propertyAttributeMap), config]);
    updateDataAttributes();
    getTitleEl();
    allItemsEl = containerEl.querySelector(".o-gallery__items");
    itemEls = containerEl.querySelectorAll(".o-gallery__item");
    selectedItemIndex = getSelectedItem();
    shownItemIndex = selectedItemIndex;
    if (config.windowResize) {
        window.addEventListener("resize", resizeHandler, false);
    }
    insertItemContent(selectedItemIndex);
    setWidths();
    setCaptionSizes();
    if (supportsCssTransforms()) {
        scroller = new FTScroller(containerEl, {
            scrollbars: false,
            scrollingY: false,
            updateOnWindowResize: true,
            snapping: !config.multipleItemsPerPage,
            /* Can't use fling/inertial scroll as after user input is finished and scroll continues, scroll events are no
             longer fired, and value of scrollLeft doesn't change until scrollend. */
            flinging: false,
            disabledInputMethods: {
                touch: !config.touch,
                scroll: true
            }
        });
        scroller.addEventListener("scroll", function(evt) {
            clearTimeout(debounceScroll);
            debounceScroll = setTimeout(function () {
                onScroll(evt);
            }, 50);
        });
        scroller.addEventListener("scrollend", function(evt) {
            onScroll(evt);
        });
        scroller.addEventListener("segmentwillchange", function() {
            if (!config.multipleItemsPerPage) {
                selectItem(scroller.currentSegment.x, false, "user");
            }
        });
    } else {
        scroller = new SimpleScroller(containerEl);
    }
    viewportEl = scroller.contentContainerNode.parentNode;
    if (titleEl) {
        viewportEl.insertBefore(titleEl, null);
    }
    viewportEl.classList.add("o-gallery__viewport");
    insertItemContent(getItemsInPageView(scroller.scrollLeft, scroller.scrollLeft + viewportEl.clientWidth, false));
    addUiControls();
    showItem(selectedItemIndex);
    if (config.multipleItemsPerPage === true) {
        allowTransitions = true;
    }
    updateControlStates();
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
    this.onResize = onResize;
    this.destroy = destroy;

    triggerEvent("oGallery.ready", {
        gallery: this
    });

}

Gallery.createAllIn = function(el, config) {
    "use strict";
    var conf = config || {},
        gEls,
        galleries = [];
    if (el.querySelectorAll) {
        gEls = el.querySelectorAll("[data-o-component=o-gallery]");
        for (var c = 0, l = gEls.length; c < l; c++) {
            galleries.push(new Gallery(gEls[c], conf));
        }
    }
    return galleries;
};

module.exports = Gallery;