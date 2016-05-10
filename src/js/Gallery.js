/*global require, module*/
'use strict';

var oDom = require('o-dom'),
	DomDelegate = require('ftdomdelegate'),
	FTScroller = require('ftscroller').FTScroller,
	oViewport = require('o-viewport'),
	galleryDom = require('./galleryDom'),
	SimpleScroller = require('./SimpleScroller');

function Gallery(containerEl, config) {

	var viewportEl;
	var titleEl;
	var allItemsEl;
	var itemEls;
	var selectedItemIndex;
	var shownItemIndex;
	var scroller;
	var debounceScroll;
	var prevControlDiv;
	var nextControlDiv;
	var propertyAttributeMap = {
		component: "data-o-component",
		syncID: "data-o-gallery-syncid",
		multipleItemsPerPage: "data-o-gallery-multipleitemsperpage",
		touch: "data-o-gallery-touch",
		captions: "data-o-gallery-captions",
		captionMinHeight: "data-o-gallery-captionminheight",
		captionMaxHeight: "data-o-gallery-captionmaxheight",
		title: "data-o-gallery-title"
	};
	var defaultConfig = {
		component: "o-gallery",
		multipleItemsPerPage: false,
		captions: true,
		captionMinHeight: 24,
		captionMaxHeight: 52,
		touch: false,
		syncID: "o-gallery-" + new Date().getTime()
	};
	var allowTransitions = false;
	var bodyDomDelegate;
	var containerDomDelegate;

	function supportsCssTransforms() {
		var b = document.body || document.documentElement, s = b.style, p = 'Transition';
		var v = ['', 'Moz', 'webkit', 'Webkit', 'Khtml', 'O', 'ms'];

		for (var i = 0; i < v.length; i++) {
			if (typeof s[v[i] + p] === 'string' || typeof s[v[i] + p.toLowerCase()] === 'string') return true;
		}
		return false;
	}

	function isDataSource() {
		return (config.items && config.items.length > 0);
	}

	function setWidths() {
		var totalWidth = 0;
		var itemWidth;

		if (config.multipleItemsPerPage) {
			itemWidth = parseInt(itemEls[selectedItemIndex].clientWidth, 10);
		} else {
			itemWidth = containerEl.clientWidth;
		}
		for (var i = 0; i < itemEls.length; i++) {
			itemEls[i].style.width = itemWidth + "px";
			totalWidth += itemWidth;
		}
		allItemsEl.style.width = totalWidth + "px";
		// Makes sure Scroller know about the width change
		scroller.updateDimensions();
	}

	function isValidItem(n) {
		return (typeof n === "number" && n > -1 && n < itemEls.length);
	}

	function getSelectedItem() {
		var selectedItem = 0;
		for (var i = 0; i < itemEls.length; i++) {
			if (itemEls[i].getAttribute('aria-selected') === 'true') {
				selectedItem = i;
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
		if (config.title) {
			if (titleEl) {
				titleEl.innerHTML = config.title;
			} else {
				titleEl = galleryDom.createElement('div', config.title, 'o-gallery__title');
				containerEl.appendChild(titleEl);
			}
		}
	}

	function setCaptionSizes() {
		for (var i = 0; i < itemEls.length; i++) {
			var itemEl = itemEls[i];
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
			for (var i = 0; i < itemNums.length; i++) {
				var itemNum = itemNums[i];
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
		var itemsInView = [];
		var onlyWhole = (typeof whole !== "boolean") ? true : whole;
		for (var i = 0; i < itemEls.length; i++) {
			if ((onlyWhole && isWholeItemInPageView(i, l, r)) || (!onlyWhole && isAnyPartOfItemInPageView(i, l, r))) {
				itemsInView.push(i);
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
		var event = new CustomEvent(name, {
			'bubbles': true,
			'cancelable': true,
			'detail': data || {}
		});
		containerEl.dispatchEvent(event);
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
		var viewportL = scroller.scrollLeft;
		var viewportR = viewportL + viewportEl.clientWidth;
		var itemL = itemEls[n].offsetLeft;
		var itemR = itemL + itemEls[n].clientWidth;
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
			var prevPageWholeItems = getItemsInPageView(scroller.scrollLeft - viewportEl.clientWidth, scroller.scrollLeft);
			var prevPageItem = prevPageWholeItems.pop() || 0;
			alignItemRight(prevPageItem);
		}
	}

	function showNextPage() {
		if (scroller.scrollLeft < allItemsEl.clientWidth - viewportEl.clientWidth) {
			var currentWholeItemsInView = getItemsInPageView(scroller.scrollLeft, scroller.scrollLeft + viewportEl.clientWidth);
			var lastWholeItemInView = currentWholeItemsInView.pop();
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
				itemEls[selectedItemIndex].setAttribute('aria-selected', 'false');
				selectedItemIndex = n;
				itemEls[selectedItemIndex].setAttribute('aria-selected', 'true');
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
		for (var i = 0; i < objs.length; i++) {
			var obj = objs[i];
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

	function getSyncID() {
		return config.syncID;
	}

	function syncWith(galleryInstance) {
		config.syncID = galleryInstance.getSyncID();
		updateDataAttributes();
	}

	function onScroll(evt) {
		updateControlStates();
		insertItemContent(getItemsInPageView(evt.scrollLeft, evt.scrollLeft + viewportEl.clientWidth, false));
	}

	function destroy() {
		// Destroy objects before manipulating the dom. Order is important for gallery to be destroyed properly
		// It won't instantiate again nicely if it's the other way round
		containerDomDelegate.destroy();
		bodyDomDelegate.destroy();
		window.removeEventListener("oViewport.resize", onResize, false);
		clearTimeout(debounceScroll);
		scroller.destroy(true);
		prevControlDiv.parentNode.removeChild(prevControlDiv);
		prevControlDiv = null;
		nextControlDiv.parentNode.removeChild(nextControlDiv);
		nextControlDiv = null;
		for (var prop in propertyAttributeMap) {
			if (propertyAttributeMap.hasOwnProperty(prop)) {
				containerEl.removeAttribute(propertyAttributeMap[prop]);
			}
		}
		containerEl.removeAttribute('data-o-gallery--js');
	}

	if (!containerEl) {
		containerEl = document.body;
	} else if (containerEl.nodeType !== 1) {
		containerEl = document.querySelector(containerEl);
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
	allItemsEl = allItemsEl || containerEl.querySelector(".o-gallery__items");
	itemEls = itemEls || containerEl.querySelectorAll(".o-gallery__item");
	selectedItemIndex = getSelectedItem();
	shownItemIndex = selectedItemIndex;

	// Generate an array of item indexes
	insertItemContent(Object.keys(itemEls));
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
			triggerEvent('oGallery.scrollEnd', evt);
		});
		scroller.addEventListener("segmentwillchange", function() {
			if (!config.multipleItemsPerPage) {
				selectItem(scroller.currentSegment.x, false, "user");
			}
		});
	} else {
		scroller = new SimpleScroller(containerEl);
		containerEl.addEventListener("scrollend", function(evt) {
			onScroll(evt);
			triggerEvent('oGallery.scrollEnd', evt);
		});
	}
	viewportEl = scroller.contentContainerNode.parentNode;
	viewportEl.classList.add("o-gallery__viewport");
	if (titleEl && supportsCssTransforms()) {
		// Title needs to be moved into the viewport so it stays visible when pages change
		titleEl.parentNode.removeChild(titleEl);
		viewportEl.appendChild(titleEl);
	}
	addUiControls();
	showItem(selectedItemIndex);
	if (config.multipleItemsPerPage === true) {
		allowTransitions = true;
	}
	updateControlStates();
	listenForSyncEvents();

	// If it's the thumbnails gallery, check that the thumbnails' clientwidth has been set before resizing
	// as this takes time in IE8
	var resizeLimit = 50;
	function forceResize() {
		if (!config.multipleItemsPerPage || parseInt(itemEls[selectedItemIndex].clientWidth, 10) !== 0) {
			onResize();
		} else if (resizeLimit > 0) {
			setTimeout(forceResize, 150);
			resizeLimit--;
		}
	}
	oViewport.listenTo('resize');
	window.addEventListener("oViewport.resize", onResize, false);
	// Force an initial resize in case all images are loaded before o.DOMContentLoaded is fired and the resize event hasn't
	forceResize();

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
	this.getGalleryElement = function() {
		return containerEl;
	};
	this.destroy = destroy;

	triggerEvent("oGallery.ready", {
		gallery: this
	});
}

Gallery.init = function(el, config) {
	var conf = config || {};
	var gEls;
	var galleries = [];
	if (!el) {
		el = document.body;
	} else if (el.nodeType !== 1) {
		el = document.querySelector(el);
	}
	if (el.querySelectorAll) {
		gEls = el.querySelectorAll("[data-o-component~=o-gallery]");
		for (var i = 0; i < gEls.length; i++) {
			if (!gEls[i].hasAttribute('data-o-gallery--js')) {
				galleries.push(new Gallery(gEls[i], conf));
			}
		}
	}
	return galleries;
};

module.exports = Gallery;
