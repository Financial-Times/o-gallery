var Gallery = require('./src/js/Gallery');

var gEls = document.querySelectorAll("[data-o-component=o-gallery]");

for (var c = 0, l = gEls.length; c < l; c++) {
    new Gallery({
        container: gEls[c]
    });
}