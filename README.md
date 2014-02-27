# o-gallery

A configurable content carousel. Can be used for slideshows and thumbnail strips, for example.

## Definitions

* **Item**: One of many objects to be displayed in the gallery.  Likely to be an image.  Must support being forcibly scaled to any size.
* **Page**: A set of items that may be displayed in the frame at the same time (for normal slideshows, pages are likely to contain only one item, while thumbnail strips will contain more than one)
* **Viewport**: A fixed element through which the items move.
* **Shown**: only means _in view_.
* **Selected**: only means _chosen_.

A _shown_ item does not necessarily have to be _selected_, and vice versa.

## Creating Galleries

Gallery content can come from either HTML already in the DOM, or data passed explicitly to Gallery javascript via a configuration object.

In both cases there must be an HTML element already in the DOM to construct the Gallery in.

Galleries can be constructed in three ways:

1. Declaratively from HTML source
2. Imperatively from HTML source
3. Imperatively from JS data

### 1. Declaratively from HTML source

With the HTML already in the page, the following method can be called to search for Gallery HTML elements and automatically construct a Gallery for each one:

    var galleries = Gallery.createAllIn();
    
Any gallery objects that are constructed will be returned;
    
Optionally, a DOM element can be passed to limit the search to a particular area of the page:

    var galleries = Gallery.createAllIn(document.getElementByClassName(".ft-article-body")[0];
    
### 2. Imperatively from HTML source.

With the HTML already in the page, a Gallery object can be constructed like so:

    var gallery1 = new Gallery(document.getElementById('#gallery1');
    
An optional configuration object can be passed as second argument:
    
    var gallery2 = new Gallery(document.getElementById('#gallery2', {
        // config options
    });

### 3. Imperatively from JS data

With just an HTML container element already in the page, a Gallery object can be constructed by passing the content as data via the config object:

    var gallery = new Gallery(document.getElementById('#gallery', {
        items: [
            // content objects
        ]
    });

## Configuration

Galleries can be configured by HTML data-attributes or the JS configuration object, or a combination of the two. Where both are supplied, the JS values will take precedence.

Once the config options have been gathered, the HTML data-attributes are added/updated to show the configuration actually in use.

### Multiple items per page

Data attribute: `data-o-gallery-multipleitemsperpage`

JS property: `multipleItemsPerPage`

Type: `Boolean`

Default: `false`

Sets whether multiple items should be allowed to show per page. For example a normal slideshow would set this to `false`, but its thumbnail strip would set it to `true`.

### Sync ID

Data attribute: `data-o-gallery-syncid`

JS property: `syncID`

Type: `String`

Default: `o-gallery-[timestamp]`

Sets the ID used in events fired and listened to by a Gallery instance. Setting two Gallery objects to the same sync ID will cause them to control each other - for example where Gallery 1 is a slideshow, and Gallery 2 is its thumbnail strip.

### Touch

Data attribute: `data-o-gallery-touch`

JS property: `touch`

Type: `Boolean`

Default: `false`

Controls whether touch events will be listened to. See [ftscroller](https://github.com/ftlabs/ftscroller) for more details.

### Captions

Data attribute: `data-o-gallery-captions`

JS property: `captions`

Type: `Boolean`

Default: `true`

Whether captions will be shown at all. With this set to true, a blank area will always be shown for every item, even if there is no caption data for an item.

### Caption min/max height

Data attribute: `data-o-gallery-captionminheight`, `data-o-gallery-captionmaxheight`

JS property: `data-o-gallery-captionmaxheight`, `captionMaxHeight`

Type: `Integer`

Default: `24`, `52`

The height constraints of the caption area. The min value is used to position the caption area below the gallery item. If the content of the caption forces the caption height to increase, then it will increase upwards, in front of the gallery item, up to the maximum height set.

### Window resize

Data attribute: `data-o-gallery-windowresize`

JS property: `windowResize`

Type: `Boolean`

Default: `true`

Galleries have to reset their display widths when their size changes. By default this will be done by listening to the window onResize event, but this can be turned off in favour of calling the `onResize()` method when necessary.

## Events

The following events will be dispatched on the Gallery's root DOM element:

* `oGalleryReady`: The Gallery has initialised and made all required DOM changes
* `oGalleryItemSelected`: The selected item in the gallery has changed. Passes two arguments: the index of the newly active item, and what triggered the change ('user' or 'sync')

## API

Note that _showing_ and _selecting_ are two separate concepts and are independent of each other.

There must always be one item selected, even if the _selected_ state is not made visible in the UI.

Each gallery _item_ has an index number. _Pages_ do not have index numbers as the number of pages can vary when a gallery has a variable width (e.g. in a responsive layout).

* `showItem(idx)`: Navigates the gallery to the specified item index (starting from zero)
* `showNextItem()`: Navigates the gallery forward one item (or to the first item if currently on the last)
* `showPrevItem()`: Navigates the gallery backwards one item (or to the last item if currently on the last)
* `showNextPage()`: Navigates the gallery forward one page (or to the first page if currently on the last)
* `showPrevPage()`: Navigates the gallery backward one page (or to the last page if currently on the first)
* `selectItem(idx, show)`: Selects item, and optionally shows it too.
* `selectNextItem(show)`: Selects next item, and optionally shows it too.
* `selectPrevItem(show)`: Selects previous item, and optionally shows it too.
* `getSelectedItem()`: Returns the index of the currently selected item (integer)

The desired behaviour of the left & right UI controls for single- and multiple-item-per-page galleries will be different. For example, in a slideshow (single item per page), the right arrow control should select _and_ show the next item, but in a thumbnail strip (multiple items per page), it should show the next page without affecting what it selected.

The following simplified methods are provided to handle this logic:

* `next()`:
    * multiple: false - `selectNextItem(true); // select & show`
    * multiple: true - `showNextPage(); // doesn't affect selection`
* `prev()`:
    * multiple: false - `selectPrevItem(true); // select & show`
    * multiple: true - `showPrevPage(); // doesn't affect selection`

These method may be useful for adding keyboard control to a Gallery.

## CSS classes

A `o-gallery__item--selected` class is applied to only the selected Gallery item. It is up to a product to use this class to apply styles as required. This class is only likely to be useful when `multipleItemsPerPage` is set to true.