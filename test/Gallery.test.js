/* eslint-env mocha */
/* global proclaim */
import Gallery from './../src/js/Gallery';

describe('Gallery', function() {

	const galleryConfig = {
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

	const thumbnailConfig = {
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
		const galleryEl = document.createElement('div');
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
		const galleryEl = generateGallery();
		let gallery;

		galleryEl.addEventListener('oGallery.ready', function(e) {
			proclaim.isTrue(e.detail.gallery instanceof Gallery);
			proclaim.isTrue(galleryEl.classList.contains('o-gallery'));
			proclaim.isNotNull(galleryEl.getAttribute('data-o-gallery--js'));
			proclaim.isNotNull(galleryEl.querySelector('.o-gallery__viewport'));
			proclaim.isNotNull(galleryEl.querySelector('.o-gallery__control'));
			done();
		});
		gallery = new Gallery(galleryEl, galleryConfig);

		// Don't run destroy in the event callback since the constructor will not yet have returned
		destroyGallery(gallery);
	});

	it('#showItem', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 608);
		galleryEl.addEventListener('oGallery.scrollEnd', function() {
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 8);

			destroyGallery(gallery);
			done();
		});
		gallery.showItem(1);
	});

	it('#showPrevItem', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 608);
		galleryEl.addEventListener('oGallery.scrollEnd', function() {
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 8);

			destroyGallery(gallery);
			done();
		});
		gallery.showPrevItem();
	});

	it('#showNextItem', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 608);
		galleryEl.addEventListener('oGallery.scrollEnd', function() {
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 8);

			destroyGallery(gallery);
			done();
		});
		gallery.showNextItem();
	});

	it('#showPrevPage', function(done) {
		const galleryEl = generateGallery();
		const myConfig = JSON.parse(JSON.stringify(galleryConfig));
		myConfig.items[0].selected = false;
		myConfig.items[1].selected = true;
		const gallery = new Gallery(galleryEl, myConfig);
		galleryEl.addEventListener('oGallery.scrollEnd', function() {
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 608);

			destroyGallery(gallery);
			done();
		});
		gallery.showPrevPage();
	});

	it('#showNextPage', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 608);
		galleryEl.addEventListener('oGallery.scrollEnd', function() {
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getBoundingClientRect().left, 8);

			destroyGallery(gallery);
			done();
		});
		gallery.showNextPage();
	});

	it('#getSelectedItem', function() {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		proclaim.equal(gallery.getSelectedItem(), 0);
		destroyGallery(gallery);
	});

	it('#selectItem', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			proclaim.equal(e.detail.source, 'test');
			proclaim.equal(e.detail.itemID, 1);
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[1].getAttribute('aria-selected'), 'true');

			destroyGallery(gallery);
			done();
		});
		gallery.selectItem(1, false, 'test');
	});

	it('#selectPrevItem', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		const expectedSelectedItem = gallery.getSelectedItem() - 1 >= 0 ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			proclaim.equal(e.detail.source, 'test');
			proclaim.equal(e.detail.itemID, expectedSelectedItem);
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected'), 'true');

			destroyGallery(gallery);
			done();
		});
		gallery.selectPrevItem(false, 'test');
	});

	it('#selectNextItem', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		const expectedSelectedItem = gallery.getSelectedItem() + 1 > 1 ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			proclaim.equal(e.detail.source, 'test');
			proclaim.equal(e.detail.itemID, expectedSelectedItem);
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected'), 'true');

			destroyGallery(gallery);
			done();
		});
		gallery.selectNextItem(false, 'test');
	});

	it('#next', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		const expectedSelectedItem = gallery.getSelectedItem() + 1 > 1 ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			proclaim.equal(e.detail.source, 'user');
			proclaim.equal(e.detail.itemID, expectedSelectedItem);
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected'), 'true');

			destroyGallery(gallery);
			done();
		});
		gallery.next(true);
	});

	it('#prev', function(done) {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		const expectedSelectedItem = gallery.getSelectedItem() - 1 >= 0 ? 0 : 1;
		galleryEl.addEventListener('oGallery.itemSelect', function(e) {
			proclaim.equal(e.detail.source, 'user');
			proclaim.equal(e.detail.itemID, expectedSelectedItem);
			proclaim.equal(galleryEl.querySelectorAll('.o-gallery__item')[expectedSelectedItem].getAttribute('aria-selected'), 'true');

			destroyGallery(gallery);
			done();
		});
		gallery.prev();
	});

	it('#getSyncID', function() {
		const galleryEl = generateGallery();
		const myConfig = JSON.parse(JSON.stringify(galleryConfig));
		myConfig.syncID = 'testId';
		const gallery = new Gallery(galleryEl, myConfig);
		proclaim.equal(gallery.getSyncID(), 'testId');
		destroyGallery(gallery);
	});

	it('#syncWith', function() {
		const thumbnailEl = generateGallery();
		const thumbnail = new Gallery(thumbnailEl, thumbnailConfig);
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		thumbnail.syncWith(gallery);
		gallery.selectItem(1, true, 'user');
		proclaim.equal(thumbnailEl.querySelectorAll('.o-gallery__item')[1].getAttribute('aria-selected'), 'true');
		destroyGallery(gallery);
		destroyGallery(thumbnail);
	});

	it('#onResize', function() {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		galleryEl.style.maxWidth = '400px';
		gallery.onResize();
		proclaim.equal(galleryEl.querySelector('.o-gallery__item').style.width, '400px');
		destroyGallery(gallery);
	});

	it('#getGalleryElement', function() {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		proclaim.equal(gallery.getGalleryElement(), galleryEl);
		destroyGallery(gallery);
	});

	it('#destroy', function() {
		const galleryEl = generateGallery();
		const gallery = new Gallery(galleryEl, galleryConfig);
		gallery.destroy();

		proclaim.equal(galleryEl.getAttribute('data-o-gallery--js'), null);
		proclaim.equal(galleryEl.querySelector('.o-gallery__viewport'), null);
		proclaim.equal(galleryEl.querySelector('.o-gallery__control'), null);

		const thumbnailEl = generateGallery();
		const thumbnail = new Gallery(thumbnailEl, thumbnailConfig);
		thumbnail.destroy();

		proclaim.equal(thumbnailEl.getAttribute('data-o-gallery--js'), null);
		proclaim.equal(thumbnailEl.querySelector('.o-gallery__viewport'), null);
		proclaim.equal(thumbnailEl.querySelector('.o-gallery__control'), null);
	});
});
