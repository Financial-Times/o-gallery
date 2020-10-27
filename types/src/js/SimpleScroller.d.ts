export default SimpleScroller;
/**
 * Mimics FTScroller without touch interface, transitions or events
 * Intended for IE8 or other browsers that lack support for CSS transitions
 */
declare function SimpleScroller(containerEl: any): void;
declare class SimpleScroller {
    /**
     * Mimics FTScroller without touch interface, transitions or events
     * Intended for IE8 or other browsers that lack support for CSS transitions
     */
    constructor(containerEl: any);
    contentContainerNode: any;
    scrollTo: (n: any) => void;
    updateDimensions: () => void;
    destroy: () => void;
}
