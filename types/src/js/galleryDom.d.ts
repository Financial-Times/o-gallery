declare namespace _default {
    export { emptyElement };
    export { createElement };
    export { wrapElement };
    export { unwrapElement };
    export { createItemsList };
    export { createItems };
    export { insertItemContent };
    export { setAttributesFromProperties };
    export { getPropertiesFromAttributes };
}
export default _default;
declare function emptyElement(targetEl: any): void;
declare function createElement(nodeName: any, content: any, classes: any): any;
declare function wrapElement(targetEl: any, wrapEl: any): void;
declare function unwrapElement(targetEl: any): void;
declare function createItemsList(containerEl: any): any;
declare function createItems(containerEl: any, items: any): any[];
declare function insertItemContent(config: any, item: any, itemEl: any): void;
declare function setAttributesFromProperties(el: any, obj: any, map: any, excl: any): void;
declare function getPropertiesFromAttributes(el: any, map: any): {};
