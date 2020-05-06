/* eslint-env mocha */
/* global proclaim */
import galleryDom from './../src/js/galleryDom';

describe('galleryDom', function() {

	it('#emptyElement', function() {
		const div = document.createElement('div');
		div.classList.add('parent');
		const child = document.createElement('p');
		child.classList.add('child');
		div.appendChild(child);
		document.body.appendChild(div);
		proclaim.isNotNull(document.body.querySelector('.child'));
		galleryDom.emptyElement(document.querySelector('.parent'));
		proclaim.isNull(document.body.querySelector('.child'));
	});

	it('#createElement', function() {
		const el = galleryDom.createElement('div', '<p>Test</p>', 'o-gallery');
		proclaim.equal(el.tagName, 'DIV');
		proclaim.equal(el.innerHTML, '<p>Test</p>');
		proclaim.isTrue(el.classList.contains('o-gallery'));
	});

	it('#wrapElement', function() {
		const el = document.createElement('p');
		const wrapper = document.createElement('div');
		document.body.appendChild(el);
		proclaim.equal(el.parentNode, document.body);
		galleryDom.wrapElement(el, wrapper);
		proclaim.notEqual(el.parentNode, document.body);
		proclaim.equal(el.parentNode, wrapper);
		proclaim.equal(wrapper.parentNode, document.body);
	});

	it('#unwrapElement', function() {
		const el = document.createElement('p');
		const wrapper = document.createElement('div');
		document.body.appendChild(el);
		galleryDom.wrapElement(el, wrapper);
		proclaim.equal(el.parentNode, wrapper);
		galleryDom.unwrapElement(el);
		proclaim.isNull(wrapper.parentNode);
		proclaim.equal(el.parentNode, document.body);
	});

	it('#createItemsList', function() {
		const itemsList = galleryDom.createItemsList(document.body);
		proclaim.equal(itemsList.parentNode, document.body);
		proclaim.equal(itemsList.tagName, 'OL');
		proclaim.isTrue(itemsList.classList.contains('o-gallery__items'));
	});

	it('#createItems', function() {
		const list = galleryDom.createItemsList(document.body);
		const items = galleryDom.createItems(list, [
			{
				content: '<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1">',
				caption: '<p>Slideshow caption text.</p>',
				selected: true
			},
			{
				content: '<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1">',
				caption: '<p>Slideshow caption text.</p>',
				selected: false
			}
		]);
		proclaim.equal(items[0].tagName, 'LI');
		proclaim.equal(items[0].parentNode, list);
		proclaim.isTrue(items[0].classList.contains('o-gallery__item'));
		proclaim.equal(items[0].getAttribute('aria-selected'), 'true');
		proclaim.isNull(items[1].getAttribute('aria-selected'));
	});

	it('#insertItemContent', function() {
		const item = galleryDom.createElement('li', '', 'item-test');
		galleryDom.insertItemContent({
			captions: true
		}, {
			content: '<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1">',
			caption: '<p>Slideshow caption text.</p>',
			selected: false
		}, item);
		proclaim.equal(item.children.length, 2);
		proclaim.isTrue(item.children[0].classList.contains('o-gallery__item__content'));
		proclaim.equal(item.children[0].innerHTML, '<img src="http://ft-static.com/image1.jpg" alt="Slideshow image 1">');
		proclaim.isTrue(item.children[1].classList.contains('o-gallery__item__caption'));
		proclaim.equal(item.children[1].innerHTML, '<p>Slideshow caption text.</p>');
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
		proclaim.isTrue(object.propOne);
		proclaim.equal(object.propTwo, false);
		proclaim.equal(object.propThree, 'test');
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
		proclaim.equal(element.getAttribute('aOne'), 'true');
		proclaim.isNull(element.getAttribute('aTwo'));
		proclaim.equal(element.getAttribute('aThree'), 'test');
	});
});
