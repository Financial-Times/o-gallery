/* eslint-env mocha */
/* global proclaim */
import SimpleScroller from './../src/js/SimpleScroller.js';

describe('SimpleScroller', function() {
	let containerEl;
	let scroller;

	before(function() {
		const items = document.createElement('ol');
		containerEl = document.createElement('div');
		items.classList.add('o-gallery__items');
		items.style.width = '120px';
		containerEl.appendChild(items);
		for (let i = 0; i < 3; i++) {
			const item = document.createElement('li');
			item.classList.add('o-gallery__item');
			item.style.width = '40px';
			item.style.height = '40px';
			item.style.display = 'inline-block';
			items.appendChild(item);
		}
		document.body.appendChild(containerEl);
	});

	beforeEach(function() {
		scroller = new SimpleScroller(containerEl);
	});

	afterEach(function() {
		scroller.destroy();
	});

	it('should initialise and #destroy', function() {
		proclaim.isTrue(containerEl.children[0].classList.contains('o-gallery__viewport'));
		proclaim.equal(scroller.scrollLeft, 0);
		scroller.destroy();
		proclaim.isTrue(containerEl.children[0].classList.contains('o-gallery__items'));
	});

	it('#contentContainerNode', function() {
		proclaim.isTrue(scroller.contentContainerNode.classList.contains('o-gallery__items'));
	});

	it('#scrollTo', function() {
		const viewportEl = containerEl.querySelector('.o-gallery__viewport');
		viewportEl.style.width = '40px';
		viewportEl.style.overflow = 'hidden';
		scroller.scrollTo(80);
		proclaim.equal(scroller.scrollLeft, 80);
		proclaim.equal(viewportEl.scrollLeft, 80);
	});
});
