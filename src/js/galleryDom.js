'use strict';

/*global exports*/
function emptyElement(targetEl) {
	for (var i = 0; i < targetEl.children.length; i++) {
		targetEl.removeChild(targetEl.children[i]);
	}
}

function createElement(nodeName, content, classes) {
	var el = document.createElement(nodeName);
	el.innerHTML = content;
	el.setAttribute("class", classes);
	return el;
}

function wrapElement(targetEl, wrapEl) {
	var parentEl = targetEl.parentNode;
	wrapEl.appendChild(targetEl);
	parentEl.appendChild(wrapEl);
}

function unwrapElement(targetEl) {
	var wrappingEl = targetEl.parentNode;
	var wrappingElParent = wrappingEl.parentNode;
	while (wrappingEl.childNodes.length > 0) {
		wrappingElParent.appendChild(wrappingEl.childNodes[0]);
	}
	wrappingElParent.removeChild(wrappingEl);
}

function createItemsList(containerEl) {
	var itemsList = createElement("ol", "", "o-gallery__items");
	containerEl.appendChild(itemsList);
	return itemsList;
}

function createItems(containerEl, items) {
	var itemEl;
	var itemEls = [];
	for (var i = 0; i < items.length; i++) {
		itemEl = createElement("li", "&nbsp;", "o-gallery__item");
		if (items[i].selected) {
			itemEl.setAttribute('aria-selected', 'true');
		}
		containerEl.appendChild(itemEl);
		itemEls.push(itemEl);
	}
	return itemEls;
}

function insertItemContent(config, item, itemEl) {
	emptyElement(itemEl);
	var contentEl = createElement("div", item.content, "o-gallery__item__content");
	itemEl.appendChild(contentEl);
	if (config.captions) {
		var captionEl = createElement("div", item.caption || "", "o-gallery__item__caption");
		itemEl.appendChild(captionEl);
	}
}

function setPropertyIfAttributeExists(obj, propName, el, attrName) {
	var v = el.getAttribute(attrName);
	if (v !== null) {
		if (v === "true") {
			v = true;
		} else if (v === "false") {
			v = false;
		}
		obj[propName] = v;
	}
}

function getPropertiesFromAttributes(el, map) {
	var obj = {};
	var prop;
	for (prop in map) {
		if (map.hasOwnProperty(prop)) {
			setPropertyIfAttributeExists(obj, prop, el, map[prop]);
		}
	}
	return obj;
}

function setAttributesFromProperties(el, obj, map, excl) {
	var exclude = excl || [];
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop) && exclude.indexOf(prop) < 0) {
			el.setAttribute(map[prop], obj[prop]);
		}
	}
}

exports.emptyElement = emptyElement;
exports.createElement = createElement;
exports.wrapElement = wrapElement;
exports.unwrapElement = unwrapElement;
exports.createItemsList = createItemsList;
exports.createItems = createItems;
exports.insertItemContent = insertItemContent;
exports.setAttributesFromProperties = setAttributesFromProperties;
exports.getPropertiesFromAttributes = getPropertiesFromAttributes;
