# Migration Guide

## Migrating from v3 to v4

### JavaScript

o-gallery v4 uses [ES Modules over CommonJS](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/) syntax.

```diff
-const Gallery = require('o-gallery');
+import Gallery from 'o-gallery';
```

However to continue using the CommonJS syntax, without a plugin like [babel-plugin-transform-es2015-modules-commonjs](https://babeljs.io/docs/en/babel-plugin-transform-es2015-modules-commonjs), add `.default`.

```diff
-const Gallery = require('o-gallery');
+const Gallery = require('o-gallery').default;
```

### Sass Mixins

The `oGallery` mixin now outputs all o-gallery styles. All other o-gallery mixins have been removed. Instead include `oGallery` once and use default o-gallery css classes.

### Colour Usecases
All [o-gallery colour usecases](https://github.com/Financial-Times/o-gallery/blob/v3.0.9/src/scss/_color-use-cases.scss) have been removed. Use [o-colors](https://registry.origami.ft.com/components/o-colors) directly.

## Migrating from v2 to v3

This update introduces the new major of o-colors. Updating to this new version will mean updating any other components that you have which are using o-colors. There are no other breaking changes in this release.
