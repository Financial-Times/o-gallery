export default Gallery;
declare function Gallery(containerEl: any, config: any): void;
declare class Gallery {
    constructor(containerEl: any, config: any);
    showItem: (n: any) => void;
    getSelectedItem: () => number;
    showPrevItem: () => void;
    showNextItem: () => void;
    showPrevPage: () => void;
    showNextPage: () => void;
    selectItem: (n: any, show: any, source: any) => void;
    selectPrevItem: (show: any, source: any) => void;
    selectNextItem: (show: any, source: any) => void;
    next: () => void;
    prev: () => void;
    getSyncID: () => any;
    syncWith: (galleryInstance: any) => void;
    onResize: () => void;
    getGalleryElement: () => any;
    destroy: () => void;
}
declare namespace Gallery {
    function init(el: any, config: any): Gallery[];
}
