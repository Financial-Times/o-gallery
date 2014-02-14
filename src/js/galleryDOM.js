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