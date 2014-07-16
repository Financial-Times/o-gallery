/*global require, module*/

var oDom = require('o-dom'),
    DomDelegate = require('dom-delegate'),
    FTScroller = require('ftscroller'),
    oViewport = require('o-viewport'),
    galleryDom = require('./galleryDom'),
    SimpleScroller = require('./SimpleScroller');

function Gallery(containerEl, config) {
    "use strict";

    var viewportEl,
        titleEl,
        allItemsEl,
        itemEls,
        selectedItemIndex,
        shownItemIndex,
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
        allowTransitions = false,
        bodyDomDelegate,
        containerDomDelegate;

    // TODO:AB: This should probably use o-useragent
    function supportsCssTransforms() {
        var b = document.body || document.documentElement, s = b.style, p = 'Transition';
        var v = ['', 'Moz', 'webkit', 'Webkit', 'Khtml', 'O', 'ms'];

        for (var i=0; i<v.length; i++) {
            if (typeof s[v[i] + p] == 'string' || typeof s[v[i] + p.toLowerCase()] == 'string') return true;
        }
        return false;
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
            if (itemEls[c].getAttribute('aria-selected') === 'true') {
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
        prevControlDiv = galleryDom.createElement("div", "", "o-gallery__control o-gallery__control--prev");
        nextControlDiv = galleryDom.createElement("div", "", "o-gallery__control o-gallery__control--next");
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);
        containerDomDelegate.on('click', '.o-gallery__control--prev', prev);
        containerDomDelegate.on('click', '.o-gallery__control--next', next);
        if (config.multipleItemsPerPage) {
            containerDomDelegate.on('click', '.o-gallery__viewport', selectOnClick);
        }
    }

    function updateControlStates() {
        prevControlDiv.setAttribute('aria-hidden', String(scroller.scrollLeft <= 0));
        nextControlDiv.setAttribute('aria-hidden', String(scroller.scrollLeft >= allItemsEl.clientWidth - viewportEl.clientWidth));
    }

    function getTitleEl() {
        titleEl = containerEl.querySelector(".o-gallery__title");
        if (titleEl) {
            titleEl.parentNode.removeChild(titleEl);
        } else if (config.title) {
            titleEl = galleryDom.createElement('div', config.title, 'o-gallery__title');
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
                    galleryDom.insertItemContent(config, config.items[itemNum], itemEls[itemNum]);
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
        bodyDomDelegate.on('oGallery.itemSelect', onGalleryCustomEvent);
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
            updateControlStates();
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
                    itemEls[c].setAttribute('aria-selected', String(c === selectedItemIndex));
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
        galleryDom.setAttributesFromProperties(containerEl, config, propertyAttributeMap, ["items"]);
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
        scroller.destroy(true);
        for (var prop in propertyAttributeMap) {
            if (propertyAttributeMap.hasOwnProperty(prop)) {
                containerEl.removeAttribute(propertyAttributeMap[prop]);
            }
        }
        containerDomDelegate.destroy();
        bodyDomDelegate.destroy();
        window.removeEventListener("resize", onResize, false);
        containerEl.removeAttribute('data-o-gallery--js');
    }

    containerEl.setAttribute('data-o-gallery--js', '');
    bodyDomDelegate = new DomDelegate(document.body);
    containerDomDelegate = new DomDelegate(containerEl);
    if (isDataSource()) {
        galleryDom.emptyElement(containerEl);
        containerEl.classList.add("o-gallery");
        allItemsEl = galleryDom.createItemsList(containerEl);
        itemEls = galleryDom.createItems(allItemsEl, config.items);
    }
    config = extendObjects([defaultConfig, galleryDom.getPropertiesFromAttributes(containerEl, propertyAttributeMap), config]);
    updateDataAttributes();
    getTitleEl();
    allItemsEl = containerEl.querySelector(".o-gallery__items");
    itemEls = containerEl.querySelectorAll(".o-gallery__item");
    selectedItemIndex = getSelectedItem();
    shownItemIndex = selectedItemIndex;
    if (config.windowResize) {
        oViewport.listenTo('resize');
        window.addEventListener("oViewport.resize", onResize, false);
    }
    insertItemContent(selectedItemIndex);
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
    setWidths();
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
        gEls = el.querySelectorAll("[data-o-component=o-gallery]:not([data-o-gallery--js])");
        for (var c = 0, l = gEls.length; c < l; c++) {
                galleries.push(new Gallery(gEls[c], conf));
            }
        }
    return galleries;
};

module.exports = Gallery;
