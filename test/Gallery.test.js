/*global describe, it*/
'use strict';

var expect = require('expect.js');

var Gallery = require('./../src/js/Gallery');

describe('Gallery', function() {

	var galleryConfig = {
		title: 'Ukraine: diplomacy and tension',
		items: [
			{
				'content': '<img alt="" src="http://im.ft-stat">',
				'caption': 'Ukrainian soldiers guard a gate',
				'selected': true
			},
			{
				'content': '<img alt="" src="http://im.ft-stat">',
				'caption': 'Ukrainian soldiers guard a gate'
			}
		],
		captionMinHeight: 30,
		captionMaxHeight: 60
	};

	var thumbnailConfig = {
		items: [
			{
				'content': '<img src="http://im.ft-">',
				'selected': true
			},
			{
				'content': '<img src="http://im.ft-">'
			}

		],
		multipleItemsPerPage: true,
		captions: false
	};

	function generateGallery() {
		var galleryEl = document.createElement('div');
		galleryEl.style.width = '600px';
		galleryEl.style.maxWidth = '600px';
		document.body.appendChild(galleryEl);
		return galleryEl;
	}

	function destroyGallery(gallery) {
		gallery.destroy();
		gallery.getGalleryElement().parentNode.removeChild(gallery.getGalleryElement());
	}


	it('should initialise gallery', function(done) {
		var galleryEl = generateGallery();
		var gallery;
		galleryEl.addEventListener('oGallery.ready', function(e) {
			expect(e.detail.gallery instanceof Gallery).to.be(true);
			expect(galleryEl.classList.contains('o-gallery')).to.be(true);
			expect(galleryEl.getAttribute('data-o-gallery--js')).to.not.be(null);
			expect(galleryEl.querySelector('.o-gallery__viewport')).to.not.be(null);
			expect(galleryEl.querySelector('.o-gallery__control')).to.not.be(null);
			done();
		});
		gallery = new Gallery(galleryEl, galleryConfig);

		// Don't run destroy in the event callback since the constructor will not yet have returned
		destroyGallery(gallery);
	});

	it('#showItem', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(608);
		galleryEl.addEventListener('oGallery.scrollEnd', function(evt) {
			expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(8);

			destroyGallery(gallery);
			done();
		});
		gallery.showItem(1);
	});

	it('#showPrevItem', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(608);
		galleryEl.addEventListener('oGallery.scrollEnd', function(evt) {
			expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(8);

			destroyGallery(gallery);
			done();
		});
		gallery.showPrevItem();
	});

	it('#showNextItem', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(608);
		galleryEl.addEventListener('oGallery.scrollEnd', function(evt) {
			expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(8);

			destroyGallery(gallery);
			done();
		});
		gallery.showNextItem();
	});

	it('#showPrevPage', function(done) {
		var galleryEl = generateGallery();
		var myConfig = JSON.parse(JSON.stringify(galleryConfig));
		myConfig.items[0].selected = false;
		myConfig.items[1].selected = true;
		var gallery = new Gallery(galleryEl, myConfig);
		galleryEl.addEventListener('oGallery.scrollEnd', function(evt) {
			expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(608);

			destroyGallery(gallery);
			done();
		});
		gallery.showPrevPage();
	});

	it('#showNextPage', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(608);
		galleryEl.addEventListener('oGallery.scrollEnd', function(evt) {
			expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left).to.be(8);

			destroyGallery(gallery);
			done();
		});
		gallery.showNextPage();
	});

	it('#getSelectedItem', function() {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		expect(gallery.getSelectedItem()).to.be(0);
		destroyGallery(gallery);
	});

	it('#selectItem', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			expect(e.detail.source).to.be('test');
			expect(e.detail.itemID).to.be(1);
			expect(galleryEl.querySelectorAll('.o-gallery__item')[1].getAttribute('aria-selected')).to.be('true');

			destroyGallery(gallery);
			done();
		});
		gallery.selectItem(1, false, 'test');
	});

	it('#selectPrevItem', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		var expectedSelectedItem = (gallery.getSelectedItem() - 1 >= 0) ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			expect(e.detail.source).to.be('test');
			expect(e.detail.itemID).to.be(expectedSelectedItem);
			expect(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected')).to.be('true');

			destroyGallery(gallery);
			done();
		});
		gallery.selectPrevItem(false, 'test');
	});

	it('#selectNextItem', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		var expectedSelectedItem = (gallery.getSelectedItem() + 1 > 1) ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			expect(e.detail.source).to.be('test');
			expect(e.detail.itemID).to.be(expectedSelectedItem);
			expect(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected')).to.be('true');

			destroyGallery(gallery);
			done();
		});
		gallery.selectNextItem(false, 'test');
	});

	it('#next', function(done) {
		var galleryEl = generateGallery();
		var  gallery = new Gallery(galleryEl, galleryConfig);
		var expectedSelectedItem = (gallery.getSelectedItem() + 1 > 1) ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			expect(e.detail.source).to.be('user');
			expect(e.detail.itemID).to.be(expectedSelectedItem);
			expect(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected')).to.be('true');

			destroyGallery(gallery);
			done();
		});
		gallery.next(true);
	});

	it('#prev', function(done) {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		var expectedSelectedItem = (gallery.getSelectedItem() - 1 >= 0) ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			expect(e.detail.source).to.be('user');
			expect(e.detail.itemID).to.be(expectedSelectedItem);
			expect(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected')).to.be('true');

			destroyGallery(gallery);
			done();
		});
		gallery.prev();
	});

	it('#getSyncID', function() {
		var galleryEl = generateGallery();
		var myConfig = JSON.parse(JSON.stringify(galleryConfig));
		myConfig.syncID = 'testId';
		var gallery = new Gallery(galleryEl, myConfig);
		expect(gallery.getSyncID()).to.be('testId');
		destroyGallery(gallery);
	});

	it('#syncWith', function() {
		var thumbnailEl = generateGallery();
		var thumbnail = new Gallery(thumbnailEl, thumbnailConfig);
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		thumbnail.syncWith(gallery);
		gallery.selectItem(1, true, 'user');
		expect(thumbnailEl.querySelectorAll('.o-gallery__item')[1].getAttribute('aria-selected')).to.be('true');
		destroyGallery(gallery);
		destroyGallery(thumbnail);
	});

	it('#onResize', function() {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		galleryEl.style.maxWidth = '400px';
		gallery.onResize();
		expect(galleryEl.querySelector('.o-gallery__item').style.width).to.be('400px');
		destroyGallery(gallery);
	});

	it('#getGalleryElement', function() {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		expect(gallery.getGalleryElement()).to.be(galleryEl);
		destroyGallery(gallery);
	});

	it('#destroy', function() {
		var galleryEl = generateGallery();
		var gallery = new Gallery(galleryEl, galleryConfig);
		gallery.destroy();

		expect(galleryEl.getAttribute('data-o-gallery--js')).to.be(null);
		expect(galleryEl.querySelector('.o-gallery__viewport')).to.be(null);
		expect(galleryEl.querySelector('.o-gallery__control')).to.be(null);

		var thumbnailEl = generateGallery();
		var thumbnail = new Gallery(thumbnailEl, thumbnailConfig);
		thumbnail.destroy();

		expect(thumbnailEl.getAttribute('data-o-gallery--js')).to.be(null);
		expect(thumbnailEl.querySelector('.o-gallery__viewport')).to.be(null);
		expect(thumbnailEl.querySelector('.o-gallery__control')).to.be(null);
	});
});
