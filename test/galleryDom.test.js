/*global describe, it*/

const expect = require('expect.js');

const galleryDom = require('./../src/js/galleryDom');

describe('galleryDom', function() {

	it('#emptyElement', function() {
		const div = document.createElement('div');
		div.classList.add('parent');
		const child = document.createElement('p');
		child.classList.add('child');
		div.appendChild(child);
		document.body.appendChild(div);
		expect(document.body.querySelector('.child')).to.not.be(null);
		galleryDom.emptyElement(document.querySelector('.parent'));
		expect(document.body.querySelector('.child')).to.be(null);
	});

	it('#createElement', function() {
		const el = galleryDom.createElement('div', '<p>Test</p>', 'o-gallery');
		expect(el.tagName).to.be('DIV');
		expect(el.innerHTML).to.be('<p>Test</p>');
		expect(el.classList.contains('o-gallery')).to.be(true);
	});

	it('#wrapElement', function() {
		const el = document.createElement('p');
		const wrapper = document.createElement('div');
		document.body.appendChild(el);
		expect(el.parentNode).to.be(document.body);
		galleryDom.wrapElement(el, wrapper);
		expect(el.parentNode).to.not.be(document.body);
		expect(el.parentNode).to.be(wrapper);
		expect(wrapper.parentNode).to.be(document.body);
	});

	it('#unwrapElement', function() {
		const el = document.createElement('p');
		const wrapper = document.createElement('div');
		document.body.appendChild(el);
		galleryDom.wrapElement(el, wrapper);
		expect(el.parentNode).to.be(wrapper);
		galleryDom.unwrapElement(el);
		expect(wrapper.parentNode).to.be(null);
		expect(el.parentNode).to.be(document.body);
	});

	it('#createItemsList', function() {
		const itemsList = galleryDom.createItemsList(document.body);
		expect(itemsList.parentNode).to.be(document.body);
		expect(itemsList.tagName).to.be('OL');
		expect(itemsList.classList.contains('o-gallery__items')).to.be(true);
	});

	it('#createItems', function() {
		const list = galleryDom.createItemsList(document.body);
		const items = galleryDom.createItems(list, [
			{
				content: '<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1" />',
				caption: '<p>Slideshow caption text.</p>',
				selected: true
			},
			{
				content: '<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1" />',
				caption: '<p>Slideshow caption text.</p>',
				selected: false
			}
		]);
		expect(items[0].tagName).to.be('LI');
		expect(items[0].parentNode).to.be(list);
		expect(items[0].classList.contains('o-gallery__item')).to.be(true);
		expect(items[0].getAttribute('aria-selected')).to.be('true');
		expect(items[1].getAttribute('aria-selected')).to.be(null);
	});

	it('#insertItemContent', function() {
		const item = galleryDom.createElement('li', '', 'item-test');
		galleryDom.insertItemContent({
			captions: true
		}, {
			content: '<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1" />',
			caption: '<p>Slideshow caption text.</p>',
			selected: false
		}, item);
		expect(item.children.length).to.be(2);
		expect(item.children[0].classList.contains('o-gallery__item__content')).to.be(true);
		expect(item.children[0].innerHTML).to.be('<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1" />');
		expect(item.children[1].classList.contains('o-gallery__item__caption')).to.be(true);
		expect(item.children[1].innerHTML).to.be('<p>Slideshow caption text.</p>');
	});

	it('#getPropertiesFromAttributes', function() {
		const element = galleryDom.createElement('div', '', '');
		element.setAttribute('aOne', 'true');
		element.setAttribute('aTwo', 'false');
		element.setAttribute('aThree', 'test');
		const object = galleryDom.getPropertiesFromAttributes(element, {
			propOne: 'aOne',
			propTwo: 'aTwo',
			propThree: 'aThree'
		});
		expect(object.propOne).to.be(true);
		expect(object.propTwo).to.be(false);
		expect(object.propThree).to.be('test');
	});

	it('#setAttributesFromProperties', function() {
		const element = galleryDom.createElement('div', '', '');
		const properties = {
			propOne: 'aOne',
			propTwo: 'aTwo',
			propThree: 'aThree'
		};

		const config = {
			propOne: true,
			propTwo: false,
			propThree: 'test'
		};

		galleryDom.setAttributesFromProperties(element, config, properties, ['propTwo']);
		expect(element.getAttribute('aOne')).to.be('true');
		expect(element.getAttribute('aTwo')).to.be(null);
		expect(element.getAttribute('aThree')).to.be('test');
	});
});
