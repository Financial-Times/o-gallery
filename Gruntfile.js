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
                files: ['main.scss', 'src/scss/*.scss', 'main.js', 'src/js/*.js', 'demo.scss', 'demo.mustache', 'Gruntfile.js'],
                tasks: ['demo']
            }
        }
    });

    grunt.loadNpmTasks('grunt-origami-demoer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('demo', '', function() {

        function getCaptionText(n) {
            var ct = "Demo caption text for item " + n + ". ",
                str = "";
            for (var c = 0; c < n; c++) {
                str = str + ct;
            }
            return str;
        }

        function getSlideshowItems(n, sel) {
            var items = [], c;
            for (c = 0; c < n; c++) {
                var item = {
                    itemContent: '<div class="demo__gallery__item--slideshow">Demo item ' + c + '</div>',
                    itemCaption: getCaptionText(c)
                };
                if (c === sel) {
                    item.selected = true;
                }
                items.push(item);
            }
            return items;
        }

        function getThumbnailItems(n, sel) {
            var items = [], c;
            for (c = 0; c < n; c++) {
                var item = {
                    itemContent: '<div class="demo__gallery__item--thumbnail">Thumb item ' + c + '</div>'
                };
                if (c === sel) {
                    item.selected = true;
                }
                items.push(item);
            }
            return items;
        }

        grunt.config.set("origami-demo.options.viewModel", {
            htmlStandaloneItems: getSlideshowItems(10, 3),
            htmlSlideshowItems: getSlideshowItems(20, 3),
            htmlThumbnailItems: getThumbnailItems(20, 3),
            jsonStandaloneItems: JSON.stringify(getSlideshowItems(10, 3)),
            jsonSlideshowItems: JSON.stringify(getSlideshowItems(20, 3)),
            jsonThumbnailItems: JSON.stringify(getThumbnailItems(20, 3))
        });
        grunt.task.run('origami-demo', 'browserify');
    });

    grunt.registerTask('default', ['demo']);

};