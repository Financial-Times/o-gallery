/*global module */

module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({
        'origami-demo': {
            options: {
                modernizr: true,
                scriptMode: 'browserify'
            },
            demos: {
                'declarative': {
                    template: 'declarative.mustache',
                    sass: 'demo.scss',
                    js: 'declarative.js'
                },
                'imperative': {
                    template: 'imperative.mustache',
                    sass: 'demo.scss',
                    js: 'imperative.js'
                }
            }
        },
        watch: {
            'origami-demo': {
                files: ['main.scss', 'src/scss/*.scss', 'main.js', 'src/js/*.js', 'demo.scss', 'demo.mustache', 'demo.js', 'Gruntfile.js'],
                tasks: ['demo']
            }
        }
    });

    grunt.loadNpmTasks('grunt-origami-demoer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('demo', '', function() {

        function getSlideshowData(selected) {
            var data = grunt.file.readJSON('./demo-src/demo-data.json', { encoding: 'utf-8' });
            if (data[selected]) {
                data[selected].selected = true;
            }
            return data;
        }

        function getSlideshowItems(sel) {
            return getSlideshowData(sel).map(function(v) {
                return {
                    content: v.large,
                    caption: v.caption,
                    selected: v.selected
                };
            });
        }

        function getThumbnailItems(sel) {
            return getSlideshowData(sel).map(function(v) {
                return {
                    content: '<div class="demo__gallery__item--thumbnail">' + v.small + '</div>',
                    selected: v.selected
                };
            });
        }

        grunt.config.set("origami-demo.options.viewModel", {
            htmlSlideshowItems: getSlideshowItems(0),
            htmlThumbnailItems: getThumbnailItems(0),
            jsonSlideshowItems: JSON.stringify(getSlideshowItems(0)),
            jsonThumbnailItems: JSON.stringify(getThumbnailItems(0))
        });
        grunt.task.run('origami-demo');
    });

    grunt.registerTask('default', ['demo']);

};