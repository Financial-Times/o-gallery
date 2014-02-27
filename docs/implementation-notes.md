Constructor:

	var g = new oGallery(options);


API:

	g.setup(contel);
	g.destroy();
	g.setSyncId(string);
	g.getSyncId();
	g.syncWith(galleryinstance);


Events:

	contel.addEventListener('oGalleryItemChange');
	contel.addEventListener('oGalleryReady');


Options:

	options := {
		
		container: <DOMElement>,
		model: {
			items: [
				<String>,
				<String>,
				...
			],
			captionMinHeight: <Integer>,
			captionMaxHeight: <Integer>,
			touch: <Boolean>,
			multipleItems: <Boolean>,
			syncID: <String>
		}

	}


Markup:

	<div id='gallerycontainer'>
		<ol class='o-gallery' data-o-component='o-gallery' data-o-version='1.0.0' data-o-gallery-syncid='{{syncID}}' data-o-gallery-captionminheight='{{captionMinHeight}}'>
		    {{#items}}
			    <li>
			    	<div class='o-gallery__slide'>{{{content}}}</div>
			    	<div class='o-gallery__caption'>{{{caption}}}</div>
				</li>
		    {{/items}}
		</ol>
	</div>

	<div id='gallerycontainer'>
		<img src='poster.jpg' />
	</div>



Examples:

	var gFromHTML = new oGallery();
	gFromHTML.setup(el); // reads the gallery data from the dom

	var gFromData = new oGallery([data]);
	gFromData.setup(el); // populates element with gallery html