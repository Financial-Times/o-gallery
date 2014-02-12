'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        'browserify': {
            demo: {
                files: {
                    'demos/demo-imperative.js': ['./demo-imperative.js']
                },
                options: {
                    transform: ['debowerify']
                }
            }
        },
        'origami-demo': {
            options: {
                modernizr: false,
                main: ['demo.mustache', 'demo-imperative.js'],
                sassExtras: 'demo.scss',
                scriptMode: 'browserify'
            }
        },
        watch: {
            'demo-js': {
                files: ['demo-imperative.js'],
                tasks: ['browserify']
            },
            'origami-demo': {
                files: ['main.scss', 'src/scss/*.scss', 'main.js', 'src/js/*.js', 'demo.scss', 'demo.mustache'],
                tasks: ['demo']
            }
        }
    });

    grunt.loadNpmTasks('grunt-origami-demoer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('demo', '', function() {

        function getSlideshowItems(n) {
            var items = [], c;
            for (c = 0; c < n; c++) {
                items.push({
                    itemContent: '<div class="demo__gallery__item--slideshow">Demo item ' + c + '</div>',
                    itemCaption: "Demo caption " + c + "."
                });
            }
            return items;
        }

        function getThumbnailItems(n) {
            var items = [], c;
            for (c = 0; c < n; c++) {
                items.push({
                    itemContent: '<div class="demo__gallery__item--thumbnail">Thumb item ' + c + '</div>'
                });
            }
            return items;
        }

        var slideshowItems = getSlideshowItems(10),
            thumbnailItems = getThumbnailItems(10);

        grunt.config.set("origami-demo.options.viewModel", {
            items: slideshowItems,
            itemsJSON: JSON.stringify(slideshowItems),
            thumbnailItems: thumbnailItems,
            thumbnailItemsJSON: JSON.stringify(thumbnailItems)
        });
        grunt.task.run('origami-demo');
    });

    grunt.registerTask('default', ['demo', 'browserify']);

};