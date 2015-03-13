/*global describe, it, before, beforeEach, afterEach*/
'use strict';

var expect = require('expect.js');

var SimpleScroller = require('./../src/js/SimpleScroller');

describe('SimpleScroller', function() {

	var containerEl;
	var scroller;

	before(function() {
		containerEl = document.createElement('div');
		var items = document.createElement('ol');
		items.classList.add('o-gallery__items');
		items.style.width = '120px';
		containerEl.appendChild(items);
		for (var i = 0; i < 3; i++) {
			var item = document.createElement('li');
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
		var viewportEl = containerEl.querySelector('.o-gallery__viewport');
		viewportEl.style.width = '40px';
		viewportEl.style.overflow = 'hidden';
		scroller.scrollTo(80);
		expect(scroller.scrollLeft).to.be(80);
		expect(viewportEl.scrollLeft).to.be(80);
	});
});
