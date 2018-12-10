/*global describe, it, before, beforeEach, afterEach*/

const expect = require('expect.js');
const SimpleScroller = require('./../src/js/SimpleScroller');

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
		expect(containerEl.children[0].classList.contains('o-gallery__viewport')).to.be(true);
		expect(scroller.scrollLeft).to.be(0);
		scroller.destroy();
		expect(containerEl.children[0].classList.contains('o-gallery__items')).to.be(true);
	});

	it('#contentContainerNode', function() {
		expect(scroller.contentContainerNode.classList.contains('o-gallery__items')).to.be(true);
	});

	it('#scrollTo', function() {
		const viewportEl = containerEl.querySelector('.o-gallery__viewport');
		viewportEl.style.width = '40px';
		viewportEl.style.overflow = 'hidden';
		scroller.scrollTo(80);
		expect(scroller.scrollLeft).to.be(80);
		expect(viewportEl.scrollLeft).to.be(80);
	});
});
