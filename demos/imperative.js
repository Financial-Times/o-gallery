require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"0Aq4KK":[function(require,module,exports){
/*global require, console, slideshowGalleryConfig, thumbnailGalleryConfig*/

var Gallery = require('./../main.js');

if (document.addEventListener) {
    document.addEventListener("oGalleryReady", function (evt) {
        "use strict";
        if (typeof console === "object" && typeof console.log === "function") {
            console.log("Gallery ready", evt.gallery);
            parent && parent.postMessage(JSON.stringify({
                type: 'resize',
                url: location.href,
                height: document.body.scrollHeight
            }), '*');
        }
    });
}

var slideshowImperative = new Gallery(document.getElementById("imperative-slideshow"), slideshowGalleryConfig),
    thumbnailImperative = new Gallery(document.getElementById("imperative-thumbnails"), thumbnailGalleryConfig);

if (thumbnailImperative.syncWith) {
    thumbnailImperative.syncWith(slideshowImperative);
}

},{"./../main.js":3}],"o-gallery":[function(require,module,exports){
module.exports=require('0Aq4KK');
},{}],3:[function(require,module,exports){
/*global require, module*/
module.exports = require('./src/js/Gallery');
},{"./src/js/Gallery":5}],4:[function(require,module,exports){
/**
 * FTScroller: touch and mouse-based scrolling for DOM elements larger than their containers.
 *
 * While this is a rewrite, it is heavily inspired by two projects:
 * 1) Uxebu TouchScroll (https://github.com/davidaurelio/TouchScroll), BSD licensed:
 *    Copyright (c) 2010 uxebu Consulting Ltd. & Co. KG
 *    Copyright (c) 2010 David Aurelio
 * 2) Zynga Scroller (https://github.com/zynga/scroller), MIT licensed:
 *    Copyright 2011, Zynga Inc.
 *    Copyright 2011, Deutsche Telekom AG
 *
 * Includes CubicBezier:
 *
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2010 David Aurelio. All Rights Reserved.
 * Copyright (C) 2010 uxebu Consulting Ltd. & Co. KG. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC., DAVID AURELIO, AND UXEBU
 * CONSULTING LTD. & CO. KG ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL APPLE INC. OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * @copyright The Financial Times Ltd [All rights reserved]
 * @codingstandard ftlabs-jslint
 * @version 0.3.0
 */
/**
 * @license FTScroller is (c) 2012 The Financial Times Ltd [All rights reserved] and licensed under the MIT license.
 *
 * Inspired by Uxebu TouchScroll, (c) 2010 uxebu Consulting Ltd. & Co. KG and David Aurelio, which is BSD licensed (https://github.com/davidaurelio/TouchScroll)
 * Inspired by Zynga Scroller, (c) 2011 Zynga Inc and Deutsche Telekom AG, which is MIT licensed (https://github.com/zynga/scroller)
 * Includes CubicBezier, (c) 2008 Apple Inc [All rights reserved], (c) 2010 David Aurelio and uxebu Consulting Ltd. & Co. KG. [All rights reserved], which is 2-clause BSD licensed (see above or https://github.com/davidaurelio/TouchScroll).
 */

/*jslint nomen: true, vars: true, browser: true, continue: true, white: true*/
/*globals FTScrollerOptions*/

var FTScroller, CubicBezier;

(function () {
	'use strict';

	// Global flag to determine if any scroll is currently active.  This prevents
	// issues when using multiple scrollers, particularly when they're nested.
	var _ftscrollerMoving = false;

	// Determine whether pointer events or touch events can be used
	var _trackPointerEvents = window.navigator.msPointerEnabled;
	if ('propertyIsEnumerable' in window || 'hasOwnProperty' in window.document) {
		var _trackTouchEvents = !_trackPointerEvents && (window.propertyIsEnumerable('ontouchstart') || window.document.hasOwnProperty('ontouchstart'));
	} else {
		var _trackTouchEvents = false;
	}

	// Determine whether to use modern hardware acceleration rules or dynamic/toggleable rules.
	// Certain older browsers - particularly Android browsers - have problems with hardware
	// acceleration, so being able to toggle the behaviour dynamically via a CSS cascade is desirable.
	if ('hasOwnProperty' in window) {
		var _useToggleableHardwareAcceleration = !window.hasOwnProperty('ArrayBuffer');
	} else {
		var _useToggleableHardwareAcceleration = false;
	}

	// Feature detection
	var _canClearSelection = (window.Selection && window.Selection.prototype.removeAllRanges);

	// Determine the browser engine and prefix, trying to use the unprefixed version where available.
	var _vendorCSSPrefix, _vendorStylePropertyPrefix, _vendorTransformLookup;
	if (document.createElement('div').style.transform !== undefined) {
		_vendorCSSPrefix = '';
		_vendorStylePropertyPrefix = '';
		_vendorTransformLookup = 'transform';
	} else if (window.opera && Object.prototype.toString.call(window.opera) === '[object Opera]') {
		_vendorCSSPrefix = '-o-';
		_vendorStylePropertyPrefix = 'O';
		_vendorTransformLookup = 'OTransform';
	} else if (document.documentElement.style.MozTransform !== undefined) {
		_vendorCSSPrefix = '-moz-';
		_vendorStylePropertyPrefix = 'Moz';
		_vendorTransformLookup = 'MozTransform';
	} else if (document.documentElement.style.webkitTransform !== undefined) {
		_vendorCSSPrefix = '-webkit-';
		_vendorStylePropertyPrefix = 'webkit';
		_vendorTransformLookup = '-webkit-transform';
	} else if (typeof navigator.cpuClass === 'string') {
		_vendorCSSPrefix = '-ms-';
		_vendorStylePropertyPrefix = 'ms';
		_vendorTransformLookup = '-ms-transform';
	}

	// If hardware acceleration is using the standard path, but perspective doesn't seem to be supported,
	// 3D transforms likely aren't supported either
	if (!_useToggleableHardwareAcceleration && document.createElement('div').style[_vendorStylePropertyPrefix + (_vendorStylePropertyPrefix ? 'P' : 'p') + 'erspective'] === undefined) {
		_useToggleableHardwareAcceleration = true;
	}

	// Style prefixes
	var _transformProperty = _vendorStylePropertyPrefix + (_vendorStylePropertyPrefix ? 'T' : 't') + 'ransform';
	var _transitionProperty = _vendorStylePropertyPrefix + (_vendorStylePropertyPrefix ? 'T' : 't') + 'ransition';
	var _translateRulePrefix = _useToggleableHardwareAcceleration ? 'translate(' : 'translate3d(';
	var _transformPrefixes = { x: '', y: '0,' };
	var _transformSuffixes = { x: ',0' + (_useToggleableHardwareAcceleration ? ')' : ',0)'), y: (_useToggleableHardwareAcceleration ? ')' : ',0)') };

	// Constants.  Note that the bezier curve should be changed along with the friction!
	var _kFriction = 0.998;
	var _kMinimumSpeed = 0.01;

	// Create a global stylesheet to set up stylesheet rules and track dynamic entries
	(function () {
		var stylesheetContainerNode = document.getElementsByTagName('head')[0] || document.documentElement;
		var newStyleNode = document.createElement('style');
		var hardwareAccelerationRule;
		var _styleText;
		newStyleNode.type = 'text/css';

		// Determine the hardware acceleration logic to use
		if (_useToggleableHardwareAcceleration) {
			hardwareAccelerationRule = _vendorCSSPrefix + 'transform-style: preserve-3d;';
		} else {
			hardwareAccelerationRule = _vendorCSSPrefix + 'transform: translateZ(0);';
		}

		// Add our rules
		_styleText = [
			'.ftscroller_container { overflow: hidden; position: relative; max-height: 100%; -webkit-tap-highlight-color: rgba(0, 0, 0, 0); -ms-touch-action: none }',
			'.ftscroller_hwaccelerated { ' + hardwareAccelerationRule  + ' }',
			'.ftscroller_x, .ftscroller_y { position: relative; min-width: 100%; min-height: 100%; overflow: hidden }',
			'.ftscroller_x { display: inline-block }',
			'.ftscroller_scrollbar { pointer-events: none; position: absolute; width: 5px; height: 5px; border: 1px solid rgba(255, 255, 255, 0.15); -webkit-border-radius: 3px; border-radius: 6px; opacity: 0; ' + _vendorCSSPrefix + 'transition: opacity 350ms; z-index: 10; -webkit-box-sizing: content-box; -moz-box-sizing: content-box; box-sizing: content-box }',
			'.ftscroller_scrollbarx { bottom: 2px; left: 2px }',
			'.ftscroller_scrollbary { right: 2px; top: 2px }',
			'.ftscroller_scrollbarinner { height: 100%; background: rgba(0,0,0,0.5); -webkit-border-radius: 2px; border-radius: 4px / 6px }',
			'.ftscroller_scrollbar.active { opacity: 1; ' + _vendorCSSPrefix + 'transition: none; -o-transition: all 0 none }'
		];

		if (newStyleNode.styleSheet) {
			newStyleNode.styleSheet.cssText = _styleText.join('\n');
		} else {
			newStyleNode.appendChild(document.createTextNode(_styleText.join('\n')));
		}

		// Add the stylesheet
		stylesheetContainerNode.insertBefore(newStyleNode, stylesheetContainerNode.firstChild);
	}());

	/**
	 * Master constructor for the scrolling function, including which element to
	 * construct the scroller in, and any scrolling options.
	 * Note that app-wide options can also be set using a global FTScrollerOptions
	 * object.
	 */
	FTScroller = function (domNode, options) {
		var key;
		var destroy, setSnapSize, scrollTo, scrollBy, updateDimensions, addEventListener, removeEventListener, _startScroll, _updateScroll, _endScroll, _finalizeScroll, _interruptScroll, _flingScroll, _snapScroll, _getSnapPositionForIndexes, _getSnapIndexForPosition, _limitToBounds, _initializeDOM, _existingDOMValid, _domChanged, _updateDimensions, _updateScrollbarDimensions, _updateElementPosition, _updateSegments, _setAxisPosition, _getPosition, _scheduleAxisPosition, _fireEvent, _childFocused, _modifyDistanceBeyondBounds, _distancesBeyondBounds, _startAnimation, _scheduleRender, _cancelAnimation, _toggleEventHandlers, _onTouchStart, _onTouchMove, _onTouchEnd, _onMouseDown, _onMouseMove, _onMouseUp, _onPointerDown, _onPointerMove, _onPointerUp, _onPointerCancel, _onPointerCaptureEnd, _onClick, _onMouseScroll, _captureInput, _releaseInputCapture, _getBoundingRect;


		/* Note that actual object instantiation occurs at the end of the closure to avoid jslint errors */


		/*                         Options                       */

		var _instanceOptions = {

			// Whether to display scrollbars as appropriate
			scrollbars: true,

			// Enable scrolling on the X axis if content is available
			scrollingX: true,

			// Enable scrolling on the Y axis if content is available
			scrollingY: true,

			// The initial movement required to trigger a scroll, in pixels; this is the point at which
			// the scroll is exclusive to this particular FTScroller instance.
			scrollBoundary: 1,

			// The initial movement required to trigger a visual indication that scrolling is occurring,
			// in pixels.  This is enforced to be less than or equal to the scrollBoundary, and is used to
			// define when the scroller starts drawing changes in response to an input, even if the scroll
			// is not treated as having begun/locked yet.
			scrollResponseBoundary: 1,

			// Whether to always enable scrolling, even if the content of the scroller does not
			// require the scroller to function.  This makes the scroller behave more like an
			// element set to "overflow: scroll", with bouncing always occurring if enabled.
			alwaysScroll: false,

			// The content width to use when determining scroller dimensions.  If this
			// is false, the width will be detected based on the actual content.
			contentWidth: undefined,

			// The content height to use when determining scroller dimensions.  If this
			// is false, the height will be detected based on the actual content.
			contentHeight: undefined,

			// Enable snapping of content to 'pages' or a pixel grid
			snapping: false,

			// Define the horizontal interval of the pixel grid; snapping must be enabled for this to
			// take effect.  If this is not defined, snapping will use intervals based on container size.
			snapSizeX: undefined,

			// Define the vertical interval of the pixel grid; snapping must be enabled for this to
			// take effect.  If this is not defined, snapping will use intervals based on container size.
			snapSizeY: undefined,

			// Control whether snapping should be fully paginated, only ever flicking to the next page
			// and not beyond.  Snapping needs to be enabled for this to take effect.
			paginatedSnap: false,

			// Allow scroll bouncing and elasticity near the ends and grid
			bouncing: true,

			// Allow a fast scroll to continue with momentum when released
			flinging: true,

			// Automatically detects changes to the contained markup and
			// updates its dimensions whenever the content changes. This is
			// set to false if a contentWidth or contentHeight are supplied.
			updateOnChanges: true,

			// Automatically catches changes to the window size and updates
			// its dimensions.
			updateOnWindowResize: false,

			// The alignment to use if the content is smaller than the container;
			// this also applies to initial positioning of scrollable content.
			// Valid alignments are -1 (top or left), 0 (center), and 1 (bottom or right).
			baseAlignments: { x: -1, y: -1 },

			// Whether to use a window scroll flag, eg window.foo, to control whether
			// to allow scrolling to start or now.  If the window flag is set to true,
			// this element will not start scrolling; this element will also toggle
			// the variable while scrolling
			windowScrollingActiveFlag: undefined,

			// Instead of always using translate3d for transforms, a mix of translate3d
			// and translate with a hardware acceleration class used to trigger acceleration
			// is used; this is to allow CSS inheritance to be used to allow dynamic
			// disabling of backing layers on older platforms.
			hwAccelerationClass: 'ftscroller_hwaccelerated',

			// While use of requestAnimationFrame is highly recommended on platforms
			// which support it, it can result in the animation being a further half-frame
			// behind the input method, increasing perceived lag slightly.  To disable this,
			// set this property to false.
			enableRequestAnimationFrameSupport: true,

			// Set the maximum time (ms) that a fling can take to complete; if
			// this is not set, flings will complete instantly
			maxFlingDuration: 1000,

			// Whether to disable any input methods; on some multi-input devices
			// custom behaviour may be desired for some scrollers.  Use with care!
			disabledInputMethods: {
				mouse: false,
				touch: false,
				scroll: false
			},

			// Define a scrolling class to be added to the scroller container
			// when scrolling is active.  Note that this can cause a relayout on
			// scroll start if defined, but allows custom styling in response to scrolls
			scrollingClassName: undefined,

			// Bezier curves defining the feel of the fling (momentum) deceleration,
			// the bounce decleration deceleration (as a fling exceeds the bounds),
			// and the bounce bezier (used for bouncing back).
			flingBezier: new CubicBezier(0.103, 0.389, 0.307, 0.966),
			bounceDecelerationBezier: new CubicBezier(0, 0.5, 0.5, 1),
			bounceBezier: new CubicBezier(0.7, 0, 0.9, 0.6)
		};


		/*                     Local variables                   */

		// Cache the DOM node and set up variables for other nodes
		var _publicSelf;
		var _self = this;
		var _scrollableMasterNode = domNode;
		var _containerNode;
		var _contentParentNode;
		var _scrollNodes = { x: null, y: null };
		var _scrollbarNodes = { x: null, y: null };

		// Dimensions of the container element and the content element
		var _metrics = {
			container: { x: null, y: null },
			content: { x: null, y: null, rawX: null, rawY: null },
			scrollEnd: { x: null, y: null }
		};

		// Snapping details
		var _snapGridSize = {
			x: false,
			y: false,
			userX: false,
			userY: false
		};
		var _snapIndex = {
			x: 0,
			y: 0
		};
		var _baseSegment = { x: 0, y: 0 };
		var _activeSegment = { x: 0, y: 0 };

		// Track the identifier of any input being tracked
		var _inputIdentifier = false;
		var _inputIndex = 0;
		var _inputCaptured = false;

		// Current scroll positions and tracking
		var _isScrolling = false;
		var _isDisplayingScroll = false;
		var _isAnimating = false;
		var _baseScrollPosition = { x: 0, y: 0 };
		var _lastScrollPosition = { x: 0, y: 0 };
		var _targetScrollPosition = { x: 0, y: 0 };
		var _scrollAtExtremity = { x: null, y: null };
		var _preventClick = false;
		var _timeouts = [];
		var _hasBeenScrolled = false;

		// Gesture details
		var _baseScrollableAxes = {};
		var _scrollableAxes = { x: true, y: true };
		var _gestureStart = { x: 0, y: 0, t: 0 };
		var _cumulativeScroll = { x: 0, y: 0 };
		var _eventHistory = [];

		// Allow certain events to be debounced
		var _domChangeDebouncer = false;
		var _scrollWheelEndDebouncer = false;

		// Performance switches on browsers supporting requestAnimationFrame
		var _animationFrameRequest = false;
		var _reqAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || false;
		var _cancelAnimationFrame = window.cancelAnimationFrame || window.cancelRequestAnimationFrame || window.mozCancelAnimationFrame || window.mozCancelRequestAnimationFrame || window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame || window.msCancelAnimationFrame || window.msCancelRequestAnimationFrame || false;

		// Event listeners
		var _eventListeners = {
			'scrollstart': [],
			'scroll': [],
			'scrollend': [],
			'segmentwillchange': [],
			'segmentdidchange': [],
			'reachedstart': [],
			'reachedend': [],
			'scrollinteractionend': []
		};

		// MutationObserver instance, when supported and if DOM change sniffing is enabled
		var _mutationObserver;


		/* Parsing supplied options */

		// Override default instance options with global - or closure'd - options
		if (typeof FTScrollerOptions === 'object' && FTScrollerOptions) {
			for (key in FTScrollerOptions) {
				if (FTScrollerOptions.hasOwnProperty(key) && _instanceOptions.hasOwnProperty(key)) {
					_instanceOptions[key] = FTScrollerOptions[key];
				}
			}
		}

		// Override default and global options with supplied options
		if (options) {
			for (key in options) {
				if (options.hasOwnProperty(key) && _instanceOptions.hasOwnProperty(key)) {
					_instanceOptions[key] = options[key];
				}
			}

			// If snap grid size options were supplied, store them
			if (options.hasOwnProperty('snapSizeX') && !isNaN(options.snapSizeX)) {
				_snapGridSize.userX = _snapGridSize.x = options.snapSizeX;
			}
			if (options.hasOwnProperty('snapSizeY') && !isNaN(options.snapSizeY)) {
				_snapGridSize.userY = _snapGridSize.y = options.snapSizeY;
			}

			// If content width and height were defined, disable updateOnChanges for performance
			if (options.contentWidth && options.contentHeight) {
				options.updateOnChanges = false;
			}
		}

		// Validate the scroll response parameter
		_instanceOptions.scrollResponseBoundary = Math.min(_instanceOptions.scrollBoundary, _instanceOptions.scrollResponseBoundary);

		// Update base scrollable axes
		if (_instanceOptions.scrollingX) {
			_baseScrollableAxes.x = true;
		}
		if (_instanceOptions.scrollingY) {
			_baseScrollableAxes.y = true;
		}

		// Only enable animation frame support if the instance options permit it
		_reqAnimationFrame = _instanceOptions.enableRequestAnimationFrameSupport && _reqAnimationFrame;
		_cancelAnimationFrame = _reqAnimationFrame && _cancelAnimationFrame;


		/*                    Scoped Functions                   */

		/**
		 * Unbinds all event listeners to prevent circular references preventing items
		 * from being deallocated, and clean up references to dom elements. Pass in
		 * "removeElements" to also remove FTScroller DOM elements for special reuse cases.
		 */
		destroy = function destroy(removeElements) {
			var i, l;

			_toggleEventHandlers(false);
			_cancelAnimation();
			if (_domChangeDebouncer) {
				window.clearTimeout(_domChangeDebouncer);
				_domChangeDebouncer = false;
			}
			for (i = 0, l = _timeouts.length; i < l; i = i + 1) {
				window.clearTimeout(_timeouts[i]);
			}
			_timeouts.length = 0;

			// Destroy DOM elements if required
			if (removeElements && _scrollableMasterNode) {
				while (_contentParentNode.firstChild) {
					_scrollableMasterNode.appendChild(_contentParentNode.firstChild);
				}
				_scrollableMasterNode.removeChild(_containerNode);
			}

			_scrollableMasterNode = null;
			_containerNode = null;
			_contentParentNode = null;
			_scrollNodes.x = null;
			_scrollNodes.y = null;
			_scrollbarNodes.x = null;
			_scrollbarNodes.y = null;
			for (i in _eventListeners) {
				if (_eventListeners.hasOwnProperty(i)) {
					_eventListeners[i].length = 0;
				}
			}

			// If this is currently tracked as a scrolling instance, clear the flag
			if (_ftscrollerMoving && _ftscrollerMoving === _self) {
				_ftscrollerMoving = false;
				if (_instanceOptions.windowScrollingActiveFlag) {
					window[_instanceOptions.windowScrollingActiveFlag] = false;
				}
			}
		};

		/**
		 * Configures the snapping boundaries within the scrolling element if
		 * snapping is active.  If this is never called, snapping defaults to
		 * using the bounding box, eg page-at-a-time.
		 */
		setSnapSize = function setSnapSize(width, height) {
			_snapGridSize.userX = width;
			_snapGridSize.userY = height;
			_snapGridSize.x = width;
			_snapGridSize.y = height;

			// Ensure the content dimensions conform to the grid
			_metrics.content.x = Math.ceil(_metrics.content.rawX / width) * width;
			_metrics.content.y = Math.ceil(_metrics.content.rawY / height) * height;
			_metrics.scrollEnd.x = _metrics.container.x - _metrics.content.x;
			_metrics.scrollEnd.y = _metrics.container.y - _metrics.content.y;
			_updateScrollbarDimensions();

			// Snap to the new grid if necessary
			_snapScroll();
			_updateSegments(true);
		};

		/**
		 * Scroll to a supplied position, including whether or not to animate the
		 * scroll and how fast to perform the animation (pass in true to select a
		 * dynamic duration).  The inputs will be constrained to bounds and snapped.
		 * If false is supplied for a position, that axis will not be scrolled.
		 */
		scrollTo = function scrollTo(left, top, animationDuration) {
			var targetPosition, duration, positions, axis, maxDuration = 0, scrollPositionsToApply = {};

			// If a manual scroll is in progress, cancel it
			_endScroll(Date.now());

			// Move supplied coordinates into an object for iteration, also inverting the values into
			// our coordinate system
			positions = {
				x: -left,
				y: -top
			};

			for (axis in _baseScrollableAxes) {
				if (_baseScrollableAxes.hasOwnProperty(axis)) {
					targetPosition = positions[axis];
					if (targetPosition === false) {
						continue;
					}

					// Constrain to bounds
					targetPosition = Math.min(0, Math.max(_metrics.scrollEnd[axis], targetPosition));

					// Snap if appropriate
					if (_instanceOptions.snapping && _snapGridSize[axis]) {
						targetPosition = Math.round(targetPosition / _snapGridSize[axis]) * _snapGridSize[axis];
					}

					// Get a duration
					duration = animationDuration || 0;
					if (duration === true) {
						duration = Math.sqrt(Math.abs(_baseScrollPosition[axis] - targetPosition)) * 20;
					}

					// Trigger the position change
					_setAxisPosition(axis, targetPosition, duration);
					scrollPositionsToApply[axis] = targetPosition;
					maxDuration = Math.max(maxDuration, duration);
				}
			}

			// If the scroll had resulted in a change in position, perform some additional actions:
			if (_baseScrollPosition.x !== positions.x || _baseScrollPosition.y !== positions.y) {

				// Mark a scroll as having ever occurred
				_hasBeenScrolled = true;

				// If an animation duration is present, fire a scroll start event and a
				// scroll event for any listeners to act on
				_fireEvent('scrollstart', _getPosition());
				_fireEvent('scroll', _getPosition());
			}

			if (maxDuration) {
				_timeouts.push(setTimeout(function () {
					var anAxis;
					for (anAxis in scrollPositionsToApply) {
						if (scrollPositionsToApply.hasOwnProperty(anAxis)) {
							_lastScrollPosition[anAxis] = scrollPositionsToApply[anAxis];
						}
					}
					_finalizeScroll();
				}, maxDuration));
			} else {
				_finalizeScroll();
			}
		};

		/**
		 * Alter the current scroll position, including whether or not to animate
		 * the scroll and how fast to perform the animation (pass in true to
		 * select a dynamic duration).  The inputs will be checked against the
		 * current position.
		 */
		scrollBy = function scrollBy(horizontal, vertical, animationDuration) {

			// Wrap the scrollTo function for simplicity
			scrollTo(parseFloat(horizontal) - _baseScrollPosition.x, parseFloat(vertical) - _baseScrollPosition.y, animationDuration);
		};

		/**
		 * Provide a public method to detect changes in dimensions for either the content or the
		 * container.
		 */
		updateDimensions = function updateDimensions(contentWidth, contentHeight, ignoreSnapScroll) {
			options.contentWidth = contentWidth || options.contentWidth;
			options.contentHeight = contentHeight || options.contentHeight;

			// Currently just wrap the private API
			_updateDimensions(!!ignoreSnapScroll);
		};

		/**
		 * Add an event handler for a supported event.  Current events include:
		 * scroll - fired whenever the scroll position changes
		 * scrollstart - fired when a scroll movement starts
		 * scrollend - fired when a scroll movement ends
		 * segmentwillchange - fired whenever the segment changes, including during scrolling
		 * segmentdidchange - fired when a segment has conclusively changed, after scrolling.
		 */
		addEventListener = function addEventListener(eventname, eventlistener) {

			// Ensure this is a valid event
			if (!_eventListeners.hasOwnProperty(eventname)) {
				return false;
			}

			// Add the listener
			_eventListeners[eventname].push(eventlistener);
			return true;
		};

		/**
		 * Remove an event handler for a supported event.  The listener must be exactly the same as
		 * an added listener to be removed.
		 */
		removeEventListener = function removeEventListener(eventname, eventlistener) {
			var i;

			// Ensure this is a valid event
			if (!_eventListeners.hasOwnProperty(eventname)) {
				return false;
			}

			for (i = _eventListeners[eventname].length; i >= 0; i = i - 1) {
				if (_eventListeners[eventname][i] === eventlistener) {
					_eventListeners[eventname].splice(i, 1);
				}
			}
			return true;
		};

		/**
		 * Start a scroll tracking input - this could be mouse, webkit-style touch,
		 * or ms-style pointer events.
		 */
		_startScroll = function _startScroll(inputX, inputY, inputTime, rawEvent) {
			var triggerScrollInterrupt = _isAnimating;

			// Opera fix
			if (inputTime <= 0) {
				inputTime = Date.now();
			}

			// If a window scrolling flag is set, and evaluates to true, don't start checking touches
			if (_instanceOptions.windowScrollingActiveFlag && window[_instanceOptions.windowScrollingActiveFlag]) {
				return false;
			}

			// If an animation is in progress, stop the scroll.
			if (triggerScrollInterrupt) {
				_interruptScroll();
			} else {

				// Allow clicks again, but only if a scroll was not interrupted
				_preventClick = false;
			}

			// Store the initial event coordinates
			_gestureStart.x = inputX;
			_gestureStart.y = inputY;
			_gestureStart.t = inputTime;
			_targetScrollPosition.x = _lastScrollPosition.x;
			_targetScrollPosition.y = _lastScrollPosition.y;

			// Clear event history and add the start touch
			_eventHistory.length = 0;
			_eventHistory.push({ x: inputX, y: inputY, t: inputTime });

			if (triggerScrollInterrupt) {
				_updateScroll(inputX, inputY, inputTime, rawEvent, triggerScrollInterrupt);
			}

			return true;
		};

		/**
		 * Continue a scroll as a result of an updated position
		 */
		_updateScroll = function _updateScroll(inputX, inputY, inputTime, rawEvent, scrollInterrupt) {
			var axis, otherScrollerActive, distancesBeyondBounds;
			var initialScroll = false;
			var gesture = {
				x: inputX - _gestureStart.x,
				y: inputY - _gestureStart.y
			};

			// Opera fix
			if (inputTime <= 0) {
				inputTime = Date.now();
			}

			// Update base target positions
			_targetScrollPosition.x = _baseScrollPosition.x + gesture.x;
			_targetScrollPosition.y = _baseScrollPosition.y + gesture.y;

			// If scrolling has not yet locked to this scroller, check whether to stop scrolling
			if (!_isScrolling) {

				// Check the internal flag to determine if another FTScroller is scrolling
				if (_ftscrollerMoving && _ftscrollerMoving !== _self) {
					otherScrollerActive = true;
				}

				// Otherwise, check the window scrolling flag to see if anything else has claimed scrolling
				else if (_instanceOptions.windowScrollingActiveFlag && window[_instanceOptions.windowScrollingActiveFlag]) {
					otherScrollerActive = true;
				}

				// If another scroller was active, clean up and stop processing.
				if (otherScrollerActive) {
					_inputIdentifier = false;
					_releaseInputCapture();
					if (_isDisplayingScroll) {
						_cancelAnimation();
						if (!_snapScroll(true)) {
							_finalizeScroll(true);
						}
					}
					return;
				}
			}

			// If not yet displaying a scroll, determine whether that triggering boundary
			// has been exceeded
			if (!_isDisplayingScroll) {

				// Determine scroll distance beyond bounds
				distancesBeyondBounds = _distancesBeyondBounds(_targetScrollPosition);

				// Determine whether to prevent the default scroll event - if the scroll could still
				// be triggered, prevent the default to avoid problems (particularly on PlayBook)
				if (_instanceOptions.bouncing || scrollInterrupt || (_scrollableAxes.x && gesture.x && distancesBeyondBounds.x < 0) || (_scrollableAxes.y && gesture.y && distancesBeyondBounds.y < 0)) {
					rawEvent.preventDefault();
				}

				// Check scrolled distance against the boundary limit to see if scrolling can be triggered.
				// If the scroll has been interrupted, trigger at once
				if (!scrollInterrupt && (!_scrollableAxes.x || Math.abs(gesture.x) < _instanceOptions.scrollResponseBoundary) && (!_scrollableAxes.y || Math.abs(gesture.y) < _instanceOptions.scrollResponseBoundary)) {
					return;
				}

				// If bouncing is disabled, and already at an edge and scrolling beyond the edge, ignore the scroll for
				// now - this allows other scrollers to claim if appropriate, allowing nicer nested scrolls.
				if (!_instanceOptions.bouncing && !scrollInterrupt && (!_scrollableAxes.x || !gesture.x || distancesBeyondBounds.x > 0) && (!_scrollableAxes.y || !gesture.y || distancesBeyondBounds.y > 0)) {

					// Prevent the original click now that scrolling would be triggered
					_preventClick = true;

					return;
				}

				// Trigger the start of visual scrolling
				_startAnimation();
				_isDisplayingScroll = true;
				_hasBeenScrolled = true;
				_isAnimating = true;
				initialScroll = true;
			} else {

				// Prevent the event default.  It is safe to call this in IE10 because the event is never
				// a window.event, always a "true" event.
				rawEvent.preventDefault();
			}

			// If not yet locked to a scroll, determine whether to do so
			if (!_isScrolling) {

				// If the gesture distance has exceeded the scroll lock distance, or snapping is active
				// and the scroll has been interrupted, enter exclusive scrolling.
				if ((scrollInterrupt && _instanceOptions.snapping) || (_scrollableAxes.x && Math.abs(gesture.x) >= _instanceOptions.scrollBoundary) || (_scrollableAxes.y && Math.abs(gesture.y) >= _instanceOptions.scrollBoundary)) {

					_isScrolling = true;
					_ftscrollerMoving = _self;
					if (_instanceOptions.windowScrollingActiveFlag) {
						window[_instanceOptions.windowScrollingActiveFlag] = _self;
					}
					_fireEvent('scrollstart', _getPosition());
				}
			}

			// Cancel text selections while dragging a cursor
			if (_canClearSelection) {
				window.getSelection().removeAllRanges();
			}

			// Update axes target positions if beyond bounds
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {
					if (_targetScrollPosition[axis] > 0) {
						_targetScrollPosition[axis] = _modifyDistanceBeyondBounds(_targetScrollPosition[axis], axis);
					} else if (_targetScrollPosition[axis] < _metrics.scrollEnd[axis]) {
						_targetScrollPosition[axis] = _metrics.scrollEnd[axis] + _modifyDistanceBeyondBounds(_targetScrollPosition[axis] - _metrics.scrollEnd[axis], axis);
					}
				}
			}

			// Trigger a scroll position update for platforms not using requestAnimationFrames
			if (!_reqAnimationFrame) {
				_scheduleRender();
			}

			// To aid render/draw coalescing, perform other one-off actions here
			if (initialScroll) {
				if (_instanceOptions.scrollingClassName) {
					_containerNode.className += ' ' + _instanceOptions.scrollingClassName;
				}
				if (_instanceOptions.scrollbars) {
					for (axis in _scrollableAxes) {
						if (_scrollableAxes.hasOwnProperty(axis)) {
							_scrollbarNodes[axis].className += ' active';
						}
					}
				}
			}

			// Add an event to the event history, keeping it around twenty events long
			_eventHistory.push({ x: inputX, y: inputY, t: inputTime });
			if (_eventHistory.length > 30) {
				_eventHistory.splice(0, 15);
			}
		};

		/**
		 * Complete a scroll with a final event time if available (it may
		 * not be, depending on the input type); this may continue the scroll
		 * with a fling and/or bounceback depending on options.
		 */
		_endScroll = function _endScroll(inputTime, rawEvent) {
			_inputIdentifier = false;
			_releaseInputCapture();
			_cancelAnimation();

			_fireEvent('scrollinteractionend', {});

			if (!_isScrolling) {
				if (!_snapScroll(true) && _isDisplayingScroll) {
					_finalizeScroll(true);
				}
				return;
			}

			// Modify the last movement event to include the end event time
			_eventHistory[_eventHistory.length - 1].t = inputTime;

			// Update flags
			_isScrolling = false;
			_isDisplayingScroll = false;
			_ftscrollerMoving = false;
			if (_instanceOptions.windowScrollingActiveFlag) {
				window[_instanceOptions.windowScrollingActiveFlag] = false;
			}

			// Prevent clicks and stop the event default.  It is safe to call this in IE10 because
			// the event is never a window.event, always a "true" event.
			_preventClick = true;
			if (rawEvent) {
				rawEvent.preventDefault();
			}

			// Trigger a fling or bounceback if necessary
			if (!_flingScroll() && !_snapScroll()) {
				_finalizeScroll();
			}
		};

		/**
		 * Remove the scrolling class, cleaning up display.
		 */
		_finalizeScroll = function _finalizeScroll(scrollCancelled) {
			var i, l, axis, scrollEvent, scrollRegex;

			_isAnimating = false;
			_isDisplayingScroll = false;

			// Remove scrolling class if set
			if (_instanceOptions.scrollingClassName) {
				scrollRegex = new RegExp('(?:^|\\s)' + _instanceOptions.scrollingClassName + '(?!\\S)', 'g');
				_containerNode.className = _containerNode.className.replace(scrollRegex, '');
			}
			if (_instanceOptions.scrollbars) {
				for (axis in _scrollableAxes) {
					if (_scrollableAxes.hasOwnProperty(axis)) {
						_scrollbarNodes[axis].className = _scrollbarNodes[axis].className.replace(/ ?active/g, '');
					}
				}
			}

			// Store final position if scrolling occurred
			_baseScrollPosition.x = _lastScrollPosition.x;
			_baseScrollPosition.y = _lastScrollPosition.y;

			scrollEvent = _getPosition();

			if (!scrollCancelled) {
				_fireEvent('scroll', scrollEvent);
				_updateSegments(true);
			}

			// Always fire the scroll end event, including an argument indicating whether
			// the scroll was cancelled
			scrollEvent.cancelled = scrollCancelled;
			_fireEvent('scrollend', scrollEvent);

			// Restore transitions
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {
					_scrollNodes[axis].style[_transitionProperty] = '';
					if (_instanceOptions.scrollbars) {
						_scrollbarNodes[axis].style[_transitionProperty] = '';
					}
				}
			}

			// Clear any remaining timeouts
			for (i = 0, l = _timeouts.length; i < l; i = i + 1) {
				window.clearTimeout(_timeouts[i]);
			}
			_timeouts.length = 0;
		};

		/**
		 * Interrupt a current scroll, allowing a start scroll during animation to trigger a new scroll
		 */
		_interruptScroll = function _interruptScroll() {
			var axis, i, l;

			_isAnimating = false;

			// Update the stored base position
			_updateElementPosition();

			// Ensure the parsed positions are set, also clearing transitions
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {
					_setAxisPosition(axis, _baseScrollPosition[axis], 16, _instanceOptions.bounceDecelerationBezier);
				}
			}

			// Update segment tracking if snapping is active
			_updateSegments(false);

			// Clear any remaining timeouts
			for (i = 0, l = _timeouts.length; i < l; i = i + 1) {
				window.clearTimeout(_timeouts[i]);
			}
			_timeouts.length = 0;
		};

		/**
		 * Determine whether a scroll fling or bounceback is required, and set up the styles and
		 * timeouts required.
		 */
		_flingScroll = function _flingScroll() {
			var i, axis, movementTime, movementSpeed, lastPosition, comparisonPosition, flingDuration, flingDistance, flingPosition, bounceDelay, bounceDistance, bounceDuration, bounceTarget, boundsBounce, modifiedDistance, flingBezier, timeProportion, boundsCrossDelay, flingStartSegment, beyondBoundsFlingDistance, baseFlingComponent;
			var maxAnimationTime = 0;
			var moveRequired = false;
			var scrollPositionsToApply = {};

			// If we only have the start event available, or flinging is disabled,
			// or the scroll was triggered by a scrollwheel, no action required.
			if (_eventHistory.length === 1 || !_instanceOptions.flinging || _inputIdentifier === 'scrollwheel') {
				return false;
			}

			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {
					bounceDuration = 350;
					bounceDistance = 0;
					boundsBounce = false;
					bounceTarget = false;
					boundsCrossDelay = undefined;

					// Re-set a default bezier curve for the animation for potential modification
					flingBezier = _instanceOptions.flingBezier;

					// Get the last movement speed, in pixels per millisecond.  To do this, look at the events
					// in the last 100ms and average out the speed, using a minimum number of two points.
					lastPosition = _eventHistory[_eventHistory.length - 1];
					comparisonPosition = _eventHistory[_eventHistory.length - 2];
					for (i = _eventHistory.length - 3; i >= 0; i = i - 1) {
						if (lastPosition.t - _eventHistory[i].t > 100) {
							break;
						}
						comparisonPosition = _eventHistory[i];
					}

					// Get the last movement time.  If this is zero - as can happen with
					// some scrollwheel events on some platforms - increase it to 16ms as
					// if the movement occurred over a single frame at 60fps.
					movementTime = lastPosition.t - comparisonPosition.t;
					if (!movementTime) {
						movementTime = 16;
					}

					// Derive the movement speed
					movementSpeed = (lastPosition[axis] - comparisonPosition[axis]) / movementTime;

					// If there is little speed, no further action required except for a bounceback, below.
					if (Math.abs(movementSpeed) < _kMinimumSpeed) {
						flingDuration = 0;
						flingDistance = 0;

					} else {


						/* Calculate the fling duration.  As per TouchScroll, the speed at any particular
						point in time can be calculated as:
							{ speed } = { initial speed } * ({ friction } to the power of { duration })
						...assuming all values are in equal pixels/millisecond measurements.  As we know the
						minimum target speed, this can be altered to:
							{ duration } = log( { speed } / { initial speed } ) / log( { friction } )
						*/

						flingDuration = Math.log(_kMinimumSpeed / Math.abs(movementSpeed)) / Math.log(_kFriction);


						/* Calculate the fling distance (before any bouncing or snapping).  As per
						TouchScroll, the total distance covered can be approximated by summing
						the distance per millisecond, per millisecond of duration - a divergent series,
						and so rather tricky to model otherwise!
						So using values in pixels per millisecond:
							{ distance } = { initial speed } * (1 - ({ friction } to the power
								of { duration + 1 }) / (1 - { friction })
						*/

						flingDistance = movementSpeed * (1 - Math.pow(_kFriction, flingDuration + 1)) / (1 - _kFriction);
					}

					// Determine a target fling position
					flingPosition = Math.floor(_lastScrollPosition[axis] + flingDistance);

					// If bouncing is disabled, and the last scroll position and fling position are both at a bound,
					// reset the fling position to the bound
					if (!_instanceOptions.bouncing) {
						if (_lastScrollPosition[axis] === 0 && flingPosition > 0) {
							flingPosition = 0;
						} else if (_lastScrollPosition[axis] === _metrics.scrollEnd[axis] && flingPosition < _lastScrollPosition[axis]) {
							flingPosition = _lastScrollPosition[axis];
						}
					}

					// In paginated snapping mode, determine the page to snap to - maximum
					// one page in either direction from the current page.
					if (_instanceOptions.paginatedSnap && _instanceOptions.snapping) {
						flingStartSegment = -_lastScrollPosition[axis] / _snapGridSize[axis];
						if (_baseSegment[axis] < flingStartSegment) {
							flingStartSegment = Math.floor(flingStartSegment);
						} else {
							flingStartSegment = Math.ceil(flingStartSegment);
						}

						// If the target position will end up beyond another page, target that page edge
						if (flingPosition > -(flingStartSegment - 1) * _snapGridSize[axis]) {
							bounceDistance = flingPosition + (flingStartSegment - 1) * _snapGridSize[axis];
						} else if (flingPosition < -(flingStartSegment + 1) * _snapGridSize[axis]) {
							bounceDistance = flingPosition + (flingStartSegment + 1) * _snapGridSize[axis];

						// Otherwise, if the movement speed was above the minimum velocity, continue
						// in the move direction.
						} else if (Math.abs(movementSpeed) > _kMinimumSpeed) {

							// Determine the target segment
							if (movementSpeed < 0) {
								flingPosition = Math.floor(_lastScrollPosition[axis] / _snapGridSize[axis]) * _snapGridSize[axis];
							} else {
								flingPosition = Math.ceil(_lastScrollPosition[axis] / _snapGridSize[axis]) * _snapGridSize[axis];
							}

							flingDuration = Math.min(_instanceOptions.maxFlingDuration, flingDuration * (flingPosition - _lastScrollPosition[axis]) / flingDistance);
						}

					// In non-paginated snapping mode, snap to the nearest grid location to the target
					} else if (_instanceOptions.snapping) {
						bounceDistance = flingPosition - (Math.round(flingPosition / _snapGridSize[axis]) * _snapGridSize[axis]);
					}

					// Deal with cases where the target is beyond the bounds
					if (flingPosition - bounceDistance > 0) {
						bounceDistance = flingPosition;
						boundsBounce = true;
					} else if (flingPosition - bounceDistance < _metrics.scrollEnd[axis]) {
						bounceDistance = flingPosition - _metrics.scrollEnd[axis];
						boundsBounce = true;
					}

					// Amend the positions and bezier curve if necessary
					if (bounceDistance) {

						// If the fling moves the scroller beyond the normal scroll bounds, and
						// the bounce is snapping the scroll back after the fling:
						if (boundsBounce && _instanceOptions.bouncing && flingDistance) {
							flingDistance = Math.floor(flingDistance);

							if (flingPosition > 0) {
								beyondBoundsFlingDistance = flingPosition - Math.max(0, _lastScrollPosition[axis]);
							} else {
								beyondBoundsFlingDistance = flingPosition - Math.min(_metrics.scrollEnd[axis], _lastScrollPosition[axis]);
							}
							baseFlingComponent = flingDistance - beyondBoundsFlingDistance;

							// Determine the time proportion the original bound is along the fling curve
							if (!flingDistance || !flingDuration) {
								timeProportion = 0;
							} else {
								timeProportion = flingBezier._getCoordinateForT(flingBezier.getTForY((flingDistance - beyondBoundsFlingDistance) / flingDistance, 1 / flingDuration), flingBezier._p1.x, flingBezier._p2.x);
								boundsCrossDelay = timeProportion * flingDuration;
							}

							// Eighth the distance beyonds the bounds
							modifiedDistance = Math.ceil(beyondBoundsFlingDistance / 8);

							// Further limit the bounce to half the container dimensions
							if (Math.abs(modifiedDistance) > _metrics.container[axis] / 2) {
								if (modifiedDistance < 0) {
									modifiedDistance = -Math.floor(_metrics.container[axis] / 2);
								} else {
									modifiedDistance = Math.floor(_metrics.container[axis] / 2);
								}
							}

							if (flingPosition > 0) {
								bounceTarget = 0;
							} else {
								bounceTarget = _metrics.scrollEnd[axis];
							}

							// If the entire fling is a bounce, modify appropriately
							if (timeProportion === 0) {
								flingDuration = flingDuration / 6;
								flingPosition = _lastScrollPosition[axis] + baseFlingComponent + modifiedDistance;
								bounceDelay = flingDuration;

							// Otherwise, take a new curve and add it to the timeout stack for the bounce
							} else {

								// The new bounce delay is the pre-boundary fling duration, plus a
								// sixth of the post-boundary fling.
								bounceDelay = (timeProportion + ((1 - timeProportion) / 6)) * flingDuration;

								_scheduleAxisPosition(axis, (_lastScrollPosition[axis] + baseFlingComponent + modifiedDistance), ((1 - timeProportion) * flingDuration / 6), _instanceOptions.bounceDecelerationBezier, boundsCrossDelay);

								// Modify the fling to match, clipping to prevent over-fling
								flingBezier = flingBezier.divideAtX(bounceDelay / flingDuration, 1 / flingDuration)[0];
								flingDuration = bounceDelay;
								flingPosition = (_lastScrollPosition[axis] + baseFlingComponent + modifiedDistance);
							}

						// If the fling requires snapping to a snap location, and the bounce needs to
						// reverse the fling direction after the fling completes:
						} else if ((flingDistance < 0 && bounceDistance < flingDistance) || (flingDistance > 0 && bounceDistance > flingDistance)) {

							// Shorten the original fling duration to reflect the bounce
							flingPosition = flingPosition - Math.floor(flingDistance / 2);
							bounceDistance = bounceDistance - Math.floor(flingDistance / 2);
							bounceDuration = Math.sqrt(Math.abs(bounceDistance)) * 50;
							bounceTarget = flingPosition - bounceDistance;
							flingDuration = 350;
							bounceDelay = flingDuration * 0.97;

						// If the bounce is truncating the fling, or continuing the fling on in the same
						// direction to hit the next boundary:
						} else {
							flingPosition = flingPosition - bounceDistance;

							// If there was no fling distance originally, use the bounce details
							if (!flingDistance) {
								flingDuration = bounceDuration;

							// If truncating the fling at a snapping edge:
							} else if ((flingDistance < 0 && bounceDistance < 0) || (flingDistance > 0 && bounceDistance > 0)) {
								timeProportion = flingBezier._getCoordinateForT(flingBezier.getTForY((Math.abs(flingDistance) - Math.abs(bounceDistance)) / Math.abs(flingDistance), 1 / flingDuration), flingBezier._p1.x, flingBezier._p2.x);
								flingBezier = flingBezier.divideAtX(timeProportion, 1 / flingDuration)[0];
								flingDuration = Math.round(flingDuration * timeProportion);

							// If extending the fling to reach the next snapping boundary, no further
							// action is required.
							}

							bounceDistance = 0;
							bounceDuration = 0;
						}
					}

					// If no fling or bounce is required, continue
					if (flingPosition === _lastScrollPosition[axis] && !bounceDistance) {
						continue;
					}
					moveRequired = true;

					// Perform the fling
					_setAxisPosition(axis, flingPosition, flingDuration, flingBezier, boundsCrossDelay);

					// Schedule a bounce if appropriate
					if (bounceDistance && bounceDuration) {
						_scheduleAxisPosition(axis, bounceTarget, bounceDuration, _instanceOptions.bounceBezier, bounceDelay);
					}

					maxAnimationTime = Math.max(maxAnimationTime, bounceDistance ? (bounceDelay + bounceDuration) : flingDuration);
					scrollPositionsToApply[axis] = (bounceTarget === false) ? flingPosition : bounceTarget;
				}
			}

			if (moveRequired && maxAnimationTime) {
				_timeouts.push(setTimeout(function () {
					var anAxis;

					// Update the stored scroll position ready for finalising
					for (anAxis in scrollPositionsToApply) {
						if (scrollPositionsToApply.hasOwnProperty(anAxis)) {
							_lastScrollPosition[anAxis] = scrollPositionsToApply[anAxis];
						}
					}

					_finalizeScroll();
				}, maxAnimationTime));
			}

			return moveRequired;
		};

		/**
		 * Bounce back into bounds if necessary, or snap to a grid location.
		 */
		_snapScroll = function _snapScroll(scrollCancelled) {
			var axis;
			var snapDuration = scrollCancelled ? 100 : 350;
			var targetPosition = _lastScrollPosition;

			// Get the current position and see if a snap is required
			if (_instanceOptions.snapping) {

				// Store current snap index
				_snapIndex = _getSnapIndexForPosition(targetPosition);
				targetPosition = _getSnapPositionForIndexes(_snapIndex, targetPosition);
			}
			targetPosition = _limitToBounds(targetPosition);

			var snapRequired = false;
			for (axis in _baseScrollableAxes) {
				if (_baseScrollableAxes.hasOwnProperty(axis)) {
					if (targetPosition[axis] !== _lastScrollPosition[axis]) {
						snapRequired = true;
					}
				}
			}
			if (!snapRequired) {
				return false;
			}

			// Perform the snap
			for (axis in _baseScrollableAxes) {
				if (_baseScrollableAxes.hasOwnProperty(axis)) {
					_setAxisPosition(axis, targetPosition[axis], snapDuration);
				}
			}

			_timeouts.push(setTimeout(function () {

				// Update the stored scroll position ready for finalizing
				_lastScrollPosition = targetPosition;

				_finalizeScroll(scrollCancelled);
			}, snapDuration));

			return true;
		};

		/**
		 * Get an appropriate snap index for a supplied point.
		 */
		_getSnapIndexForPosition = function _getSnapIndexForPosition(coordinates) {
			var axis;
			var indexes = {x: 0, y: 0};
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis) && _snapGridSize[axis]) {
					indexes[axis] = Math.round(coordinates[axis] / _snapGridSize[axis]);
				}
			}
			return indexes;
		};

		/**
		 * Get an appropriate snap point for a supplied index.
		 */
		_getSnapPositionForIndexes = function _getSnapPositionForIndexes(indexes, currentCoordinates) {
			var axis;
			var coordinatesToReturn = {
				x: currentCoordinates.x,
				y: currentCoordinates.y
			};
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {
					coordinatesToReturn[axis] = indexes[axis] * _snapGridSize[axis];
				}
			}
			return coordinatesToReturn;
		};

		/**
		 * Limit coordinates within the bounds of the scrollable viewport.
		 */
		_limitToBounds = function _limitToBounds(coordinates) {
			var axis;
			var coordinatesToReturn = { x: coordinates.x, y: coordinates.y };

			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {

					// If the coordinate is beyond the edges of the scroller, use the closest edge
					if (coordinates[axis] > 0) {
						coordinatesToReturn[axis] = 0;
						continue;
					}
					if (coordinates[axis] < _metrics.scrollEnd[axis]) {
						coordinatesToReturn[axis] = _metrics.scrollEnd[axis];
						continue;
					}
				}
			}

			return coordinatesToReturn;
		};


		/**
		 * Sets up the DOM around the node to be scrolled.
		 */
		_initializeDOM = function _initializeDOM() {
			var offscreenFragment, offscreenNode, scrollYParent;

			// Check whether the DOM is already present and valid - if so, no further action required.
			if (_existingDOMValid()) {
				return;
			}

			// Otherwise, the DOM needs to be created inside the originally supplied node.  The node
			// has a container inserted inside it - which acts as an anchor element with constraints -
			// and then the scrollable layers as appropriate.

			// Create a new document fragment to temporarily hold the scrollable content
			offscreenFragment = _scrollableMasterNode.ownerDocument.createDocumentFragment();
			offscreenNode = document.createElement('DIV');
			offscreenFragment.appendChild(offscreenNode);

			// Drop in the wrapping HTML
			offscreenNode.innerHTML = FTScroller.prototype.getPrependedHTML(!_instanceOptions.scrollingX, !_instanceOptions.scrollingY, _instanceOptions.hwAccelerationClass) + FTScroller.prototype.getAppendedHTML(!_instanceOptions.scrollingX, !_instanceOptions.scrollingY, _instanceOptions.hwAccelerationClass, _instanceOptions.scrollbars);

			// Update references as appropriate
			_containerNode = offscreenNode.firstElementChild;
			scrollYParent = _containerNode;
			if (_instanceOptions.scrollingX) {
				_scrollNodes.x = _containerNode.firstElementChild;
				scrollYParent = _scrollNodes.x;
				if (_instanceOptions.scrollbars) {
					_scrollbarNodes.x = _containerNode.getElementsByClassName('ftscroller_scrollbarx')[0];
				}
			}
			if (_instanceOptions.scrollingY) {
				_scrollNodes.y = scrollYParent.firstElementChild;
				if (_instanceOptions.scrollbars) {
					_scrollbarNodes.y = _containerNode.getElementsByClassName('ftscroller_scrollbary')[0];
				}
				_contentParentNode = _scrollNodes.y;
			} else {
				_contentParentNode = _scrollNodes.x;
			}

			// Take the contents of the scrollable element, and copy them into the new container
			while (_scrollableMasterNode.firstChild) {
				_contentParentNode.appendChild(_scrollableMasterNode.firstChild);
			}

			// Move the wrapped elements back into the document
			_scrollableMasterNode.appendChild(_containerNode);
		};

		/**
		 * Attempts to use any existing DOM scroller nodes if possible, returning true if so;
		 * updates all internal element references.
		 */
		_existingDOMValid = function _existingDOMValid() {
			var scrollerContainer, layerX, layerY, yParent, scrollerX, scrollerY, candidates, i, l;

			// Check that there's an initial child node, and make sure it's the container class
			scrollerContainer = _scrollableMasterNode.firstElementChild;
			if (!scrollerContainer || scrollerContainer.className.indexOf('ftscroller_container') === -1) {
				return;
			}

			// If x-axis scrolling is enabled, find and verify the x scroller layer
			if (_instanceOptions.scrollingX) {

				// Find and verify the x scroller layer
				layerX = scrollerContainer.firstElementChild;
				if (!layerX || layerX.className.indexOf('ftscroller_x') === -1) {
					return;
				}
				yParent = layerX;

				// Find and verify the x scrollbar if enabled
				if (_instanceOptions.scrollbars) {
					candidates = scrollerContainer.getElementsByClassName('ftscroller_scrollbarx');
					if (candidates) {
						for (i = 0, l = candidates.length; i < l; i = i + 1) {
							if (candidates[i].parentNode === scrollerContainer) {
								scrollerX = candidates[i];
								break;
							}
						}
					}
					if (!scrollerX) {
						return;
					}
				}
			} else {
				yParent = scrollerContainer;
			}

			// If y-axis scrolling is enabled, find and verify the y scroller layer
			if (_instanceOptions.scrollingY) {

				// Find and verify the x scroller layer
				layerY = yParent.firstElementChild;
				if (!layerY || layerY.className.indexOf('ftscroller_y') === -1) {
					return;
				}

				// Find and verify the y scrollbar if enabled
				if (_instanceOptions.scrollbars) {
					candidates = scrollerContainer.getElementsByClassName('ftscroller_scrollbary');
					if (candidates) {
						for (i = 0, l = candidates.length; i < l; i = i + 1) {
							if (candidates[i].parentNode === scrollerContainer) {
								scrollerY = candidates[i];
								break;
							}
						}
					}
					if (!scrollerY) {
						return;
					}
				}
			}

			// Elements found and verified - update the references and return success
			_containerNode = scrollerContainer;
			if (layerX) {
				_scrollNodes.x = layerX;
			}
			if (layerY) {
				_scrollNodes.y = layerY;
			}
			if (scrollerX) {
				_scrollbarNodes.x = scrollerX;
			}
			if (scrollerY) {
				_scrollbarNodes.y = scrollerY;
			}
			if (_instanceOptions.scrollingY) {
				_contentParentNode = layerY;
			} else {
				_contentParentNode = layerX;
			}
			return true;
		};

		_domChanged = function _domChanged(e) {

			// If the timer is active, clear it
			if (_domChangeDebouncer) {
				window.clearTimeout(_domChangeDebouncer);
			}

			// React to resizes at once
			if (e && e.type === 'resize') {
				_updateDimensions();

			// For other changes, which may occur in groups, set up the DOM changed timer
			} else {
				_domChangeDebouncer = setTimeout(function () {
					_updateDimensions();
				}, 100);
			}
		};

		_updateDimensions = function _updateDimensions(ignoreSnapScroll) {
			var axis;

			// Only update dimensions if the container node exists (DOM elements can go away if
			// the scroller instance is not destroyed correctly)
			if (!_containerNode || !_contentParentNode) {
				return false;
			}

			if (_domChangeDebouncer) {
				window.clearTimeout(_domChangeDebouncer);
				_domChangeDebouncer = false;
			}
			var containerWidth, containerHeight, startAlignments;

			// If a manual scroll is in progress, cancel it
			_endScroll(Date.now());

			// Calculate the starting alignment for comparison later
			startAlignments = { x: false, y: false };
			for (axis in startAlignments) {
				if (startAlignments.hasOwnProperty(axis)) {
					if (_lastScrollPosition[axis] === 0) {
						startAlignments[axis] = -1;
					} else if (_lastScrollPosition[axis] <= _metrics.scrollEnd[axis]) {
						startAlignments[axis] = 1;
					} else if (_lastScrollPosition[axis] * 2 <= _metrics.scrollEnd[axis] + 5 && _lastScrollPosition[axis] * 2 >= _metrics.scrollEnd[axis] - 5) {
						startAlignments[axis] = 0;
					}
				}
			}

			containerWidth = _containerNode.offsetWidth;
			containerHeight = _containerNode.offsetHeight;

			// Grab the dimensions
			var rawScrollWidth = options.contentWidth || _contentParentNode.offsetWidth;
			var rawScrollHeight = options.contentHeight || _contentParentNode.offsetHeight;
			var scrollWidth = rawScrollWidth;
			var scrollHeight = rawScrollHeight;
			var targetPosition = { x: false, y: false };

			// Update snap grid
			if (!_snapGridSize.userX) {
				_snapGridSize.x = containerWidth;
			}
			if (!_snapGridSize.userY) {
				_snapGridSize.y = containerHeight;
			}

			// If there is a grid, conform to the grid
			if (_instanceOptions.snapping) {
				if (_snapGridSize.userX) {
					scrollWidth = Math.ceil(scrollWidth / _snapGridSize.userX) * _snapGridSize.userX;
				} else {
					scrollWidth = Math.ceil(scrollWidth / _snapGridSize.x) * _snapGridSize.x;
				}
				if (_snapGridSize.userY) {
					scrollHeight = Math.ceil(scrollHeight / _snapGridSize.userY) * _snapGridSize.userY;
				} else {
					scrollHeight = Math.ceil(scrollHeight / _snapGridSize.y) * _snapGridSize.y;
				}
			}

			// If no details have changed, return.
			if (_metrics.container.x === containerWidth && _metrics.container.y === containerHeight && _metrics.content.x === scrollWidth && _metrics.content.y === scrollHeight) {
				return;
			}

			// Update the sizes
			_metrics.container.x = containerWidth;
			_metrics.container.y = containerHeight;
			_metrics.content.x = scrollWidth;
			_metrics.content.rawX = rawScrollWidth;
			_metrics.content.y = scrollHeight;
			_metrics.content.rawY = rawScrollHeight;
			_metrics.scrollEnd.x = containerWidth - scrollWidth;
			_metrics.scrollEnd.y = containerHeight - scrollHeight;

			_updateScrollbarDimensions();

			if (!ignoreSnapScroll && _instanceOptions.snapping) {

		        // Ensure bounds are correct
				_updateSegments();
				targetPosition = _getSnapPositionForIndexes(_snapIndex, _lastScrollPosition);
			}

			// Apply base alignment if appropriate
			for (axis in targetPosition) {
				if (targetPosition.hasOwnProperty(axis)) {

					// If the container is smaller than the content, determine whether to apply the
					// alignment.  This occurs if a scroll has never taken place, or if the position
					// was previously at the correct "end" and can be maintained.
					if (_metrics.container[axis] < _metrics.content[axis]) {
						if (_hasBeenScrolled && _instanceOptions.baseAlignments[axis] !== startAlignments[axis]) {
							continue;
						}
					}

					// Apply the alignment
					if (_instanceOptions.baseAlignments[axis] === 1) {
						targetPosition[axis] = _metrics.scrollEnd[axis];
					} else if (_instanceOptions.baseAlignments[axis] === 0) {
						targetPosition[axis] = Math.floor(_metrics.scrollEnd[axis] / 2);
					} else if (_instanceOptions.baseAlignments[axis] === -1) {
						targetPosition[axis] = 0;
					}
				}
			}
			if (_instanceOptions.scrollingX && targetPosition.x !== false) {
				_setAxisPosition('x', targetPosition.x, 0);
				_baseScrollPosition.x = targetPosition.x;
			}
			if (_instanceOptions.scrollingY && targetPosition.y !== false) {
				_setAxisPosition('y', targetPosition.y, 0);
				_baseScrollPosition.y = targetPosition.y;
			}

		};

		_updateScrollbarDimensions = function _updateScrollbarDimensions() {

			// Update scrollbar sizes
			if (_instanceOptions.scrollbars) {
				if (_instanceOptions.scrollingX) {
					_scrollbarNodes.x.style.width = Math.max(6, Math.round(_metrics.container.x * (_metrics.container.x / _metrics.content.x) - 4)) + 'px';
				}
				if (_instanceOptions.scrollingY) {
					_scrollbarNodes.y.style.height = Math.max(6, Math.round(_metrics.container.y * (_metrics.container.y / _metrics.content.y) - 4)) + 'px';
				}
			}

			// Update scroll caches
			_scrollableAxes = {};
			if (_instanceOptions.scrollingX && (_metrics.content.x > _metrics.container.x || _instanceOptions.alwaysScroll)) {
				_scrollableAxes.x = true;
			}
			if (_instanceOptions.scrollingY && (_metrics.content.y > _metrics.container.y || _instanceOptions.alwaysScroll)) {
				_scrollableAxes.y = true;
			}
		};

		_updateElementPosition = function _updateElementPosition() {
			var axis, computedStyle, splitStyle;

			// Retrieve the current position of each active axis.
			// Custom parsing is used instead of native matrix support for speed and for
			// backwards compatibility.
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {
					computedStyle = window.getComputedStyle(_scrollNodes[axis], null)[_vendorTransformLookup];
					splitStyle = computedStyle.split(', ');

					// For 2d-style transforms, pull out elements four or five
					if (splitStyle.length === 6) {
						_baseScrollPosition[axis] = parseInt(splitStyle[(axis === 'y') ? 5 : 4], 10);

					// For 3d-style transforms, pull out elements twelve or thirteen
					} else {
						_baseScrollPosition[axis] = parseInt(splitStyle[(axis === 'y') ? 13 : 12], 10);
					}
					_lastScrollPosition[axis] = _baseScrollPosition[axis];
				}
			}
		};

		_updateSegments = function _updateSegments(scrollFinalised) {
			var axis;
			var newSegment = { x: 0, y: 0 };

			// If snapping is disabled, return without any further action required
			if (!_instanceOptions.snapping) {
				return;
			}

			// Calculate the new segments
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {
					newSegment[axis] = Math.max(0, Math.min(Math.ceil(_metrics.content[axis] / _snapGridSize[axis]) - 1, Math.round(-_lastScrollPosition[axis] / _snapGridSize[axis])));
				}
			}

			// In all cases update the active segment if appropriate
			if (newSegment.x !== _activeSegment.x || newSegment.y !== _activeSegment.y) {
				_activeSegment.x = newSegment.x;
				_activeSegment.y = newSegment.y;
				_fireEvent('segmentwillchange', { segmentX: newSegment.x, segmentY: newSegment.y });
			}

			// If the scroll has been finalised, also update the base segment
			if (scrollFinalised) {
				if (newSegment.x !== _baseSegment.x || newSegment.y !== _baseSegment.y) {
					_baseSegment.x = newSegment.x;
					_baseSegment.y = newSegment.y;
					_fireEvent('segmentdidchange', { segmentX: newSegment.x, segmentY: newSegment.y });
				}
			}
		};

		_setAxisPosition = function _setAxisPosition(axis, position, animationDuration, animationBezier, boundsCrossDelay) {
			var transitionCSSString, newPositionAtExtremity = null;

			// Only update position if the axis node exists (DOM elements can go away if
			// the scroller instance is not destroyed correctly)
			if (!_scrollNodes[axis]) {
				return false;
			}

			// Determine the transition property to apply to both the scroll element and the scrollbar
			if (animationDuration) {
				if (!animationBezier) {
					animationBezier = _instanceOptions.flingBezier;
				}

				transitionCSSString = _vendorCSSPrefix + 'transform ' + animationDuration + 'ms ' + animationBezier.toString();
			} else {
				transitionCSSString = '';
			}

			// Apply the transition property to elements
			_scrollNodes[axis].style[_transitionProperty] = transitionCSSString;
			if (_instanceOptions.scrollbars) {
				_scrollbarNodes[axis].style[_transitionProperty] = transitionCSSString;
			}

			// Update the positions
			_scrollNodes[axis].style[_transformProperty] = _translateRulePrefix + _transformPrefixes[axis] + position + 'px' + _transformSuffixes[axis];
			if (_instanceOptions.scrollbars) {
				_scrollbarNodes[axis].style[_transformProperty] = _translateRulePrefix + _transformPrefixes[axis] + (-position * _metrics.container[axis] / _metrics.content[axis]) + 'px' + _transformSuffixes[axis];
			}

			// Determine whether the scroll is at an extremity.
			if (position >= 0) {
				newPositionAtExtremity = 'start';
			} else if (position <= _metrics.scrollEnd[axis]) {
				newPositionAtExtremity = 'end';
			}

			// If the extremity status has changed, fire an appropriate event
			if (newPositionAtExtremity !== _scrollAtExtremity[axis]) {
				if (newPositionAtExtremity !== null) {
					if (animationDuration) {
						_timeouts.push(setTimeout(function() {
							_fireEvent('reached' + newPositionAtExtremity, { axis: axis });
						}, boundsCrossDelay || animationDuration));
					} else {
						_fireEvent('reached' + newPositionAtExtremity, { axis: axis });
					}
				}
				_scrollAtExtremity[axis] = newPositionAtExtremity;
			}

			// Update the recorded position if there's no duration
			if (!animationDuration) {
				_lastScrollPosition[axis] = position;
			}
		};

		/**
		 * Retrieve the current position as an object with scrollLeft and scrollTop
		 * properties.
		 */
		_getPosition = function _getPosition() {
			return {
				scrollLeft: -_lastScrollPosition.x,
				scrollTop: -_lastScrollPosition.y
			};
		};

		_scheduleAxisPosition = function _scheduleAxisPosition(axis, position, animationDuration, animationBezier, afterDelay) {
			_timeouts.push(setTimeout(function () {
				_setAxisPosition(axis, position, animationDuration, animationBezier);
			}, afterDelay));
		};

		_fireEvent = function _fireEvent(eventName, eventObject) {
			var i, l;
			eventObject.srcObject = _publicSelf;

			// Iterate through any listeners
			for (i = 0, l = _eventListeners[eventName].length; i < l; i = i + 1) {

				// Execute each in a try/catch
				try {
					_eventListeners[eventName][i](eventObject);
				} catch (error) {
					if (window.console && window.console.error) {
						window.console.error(error.message + ' (' + error.sourceURL + ', line ' + error.line + ')');
					}
				}
			}
		};

		/**
		 * Update the scroll position so that the child element is in view.
		 */
		_childFocused = function _childFocused(event) {
			var offset, axis, visibleChildPortion;
			var focusedNodeRect = _getBoundingRect(event.target);
			var containerRect = _getBoundingRect(_containerNode);
			var edgeMap = { x: 'left', y: 'top' };
			var opEdgeMap = { x: 'right', y: 'bottom' };
			var dimensionMap = { x: 'width', y: 'height' };

			// If an input is currently being tracked, ignore the focus event
			if (_inputIdentifier !== false) {
				return;
			}

			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis)) {

					// If the focussed node is entirely in view, there is no need to center it
					if (focusedNodeRect[edgeMap[axis]] >= containerRect[edgeMap[axis]] && focusedNodeRect[opEdgeMap[axis]] <= containerRect[opEdgeMap[axis]]) {
						continue;
					}

					// If the focussed node is larger than the container...
					if (focusedNodeRect[dimensionMap[axis]] > containerRect[dimensionMap[axis]]) {

						visibleChildPortion = focusedNodeRect[dimensionMap[axis]] - Math.max(0, containerRect[edgeMap[axis]] - focusedNodeRect[edgeMap[axis]]) - Math.max(0, focusedNodeRect[opEdgeMap[axis]] - containerRect[opEdgeMap[axis]]);

						// If more than half a container's portion of the focussed node is visible, there's no need to center it
						if (visibleChildPortion >= (containerRect[dimensionMap[axis]] / 2)) {
							continue;
						}
					}

					// Set the target offset to be in the middle of the container, or as close as bounds permit
					offset = -Math.round((focusedNodeRect[dimensionMap[axis]] / 2) - _lastScrollPosition[axis] + focusedNodeRect[edgeMap[axis]] - containerRect[edgeMap[axis]]  - (containerRect[dimensionMap[axis]] / 2));
					offset = Math.min(0, Math.max(_metrics.scrollEnd[axis], offset));

					// Perform the scroll
					_setAxisPosition(axis, offset, 0);
					_baseScrollPosition[axis] = offset;
				}
			}

			_fireEvent('scroll', _getPosition());
		};

		/**
		 * Given a relative distance beyond the element bounds, returns a modified version to
		 * simulate bouncy/springy edges.
		 */
		_modifyDistanceBeyondBounds = function _modifyDistanceBeyondBounds(distance, axis) {
			if (!_instanceOptions.bouncing) {
				return 0;
			}
			var e = Math.exp(distance / _metrics.container[axis]);
			return Math.round(_metrics.container[axis] * 0.6 * (e - 1) / (e + 1));
		};

		/**
		 * Given positions for each enabled axis, returns an object showing how far each axis is beyond
		 * bounds. If within bounds, -1 is returned; if at the bounds, 0 is returned.
		 */
		_distancesBeyondBounds = function _distancesBeyondBounds(positions) {
			var axis, position;
			var distances = {};
			for (axis in positions) {
				if (positions.hasOwnProperty(axis)) {
					position = positions[axis];

					// If the position is to the left/top, no further modification required
					if (position >= 0) {
						distances[axis] = position;

					// If it's within the bounds, use -1
					} else if (position > _metrics.scrollEnd[axis]) {
						distances[axis] = -1;

					// Otherwise, amend by the distance of the maximum edge
					} else {
						distances[axis] = _metrics.scrollEnd[axis] - position;
					}
				}
			}
			return distances;
		};

		/**
		 * On platforms which support it, use RequestAnimationFrame to group
		 * position updates for speed.  Starts the render process.
		 */
		_startAnimation = function _startAnimation() {
			if (_reqAnimationFrame) {
				_cancelAnimation();
				_animationFrameRequest = _reqAnimationFrame(_scheduleRender);
			}
		};

		/**
		 * On platforms which support RequestAnimationFrame, provide the rendering loop.
		 * Takes two arguments; the first is the render/position update function to
		 * be called, and the second is a string controlling the render type to
		 * allow previous changes to be cancelled - should be 'pan' or 'scroll'.
		 */
		_scheduleRender = function _scheduleRender() {
			var axis, positionUpdated;

			// If using requestAnimationFrame schedule the next update at once
			if (_reqAnimationFrame) {
				_animationFrameRequest = _reqAnimationFrame(_scheduleRender);
			}

			// Perform the draw.
			for (axis in _scrollableAxes) {
				if (_scrollableAxes.hasOwnProperty(axis) && _targetScrollPosition[axis] !== _lastScrollPosition[axis]) {
					_setAxisPosition(axis, _targetScrollPosition[axis]);
					positionUpdated = true;
				}
			}

			// If full, locked scrolling has enabled, fire any scroll and segment change events
			if (_isScrolling && positionUpdated) {
				_fireEvent('scroll', _getPosition());
				_updateSegments(false);
			}
		};

		/**
		 * Stops the animation process.
		 */
		_cancelAnimation = function _cancelAnimation() {
			if (_animationFrameRequest === false || !_cancelAnimationFrame) {
				return;
			}

			_cancelAnimationFrame(_animationFrameRequest);
			_animationFrameRequest = false;
		};

		/**
		 * Register or unregister event handlers as appropriate
		 */
		_toggleEventHandlers = function _toggleEventHandlers(enable) {
			var MutationObserver;

			// Only remove the event if the node exists (DOM elements can go away)
			if (!_containerNode) {
				return;
			}

			if (enable) {
				_containerNode._ftscrollerToggle = _containerNode.addEventListener;
			} else {
				_containerNode._ftscrollerToggle = _containerNode.removeEventListener;
			}

			if (_trackPointerEvents) {
				_containerNode._ftscrollerToggle('MSPointerDown', _onPointerDown, true);
				_containerNode._ftscrollerToggle('MSPointerMove', _onPointerMove, true);
				_containerNode._ftscrollerToggle('MSPointerUp', _onPointerUp, true);
				_containerNode._ftscrollerToggle('MSPointerCancel', _onPointerCancel, true);
			} else {
				if (_trackTouchEvents && !_instanceOptions.disabledInputMethods.touch) {
					_containerNode._ftscrollerToggle('touchstart', _onTouchStart, true);
					_containerNode._ftscrollerToggle('touchmove', _onTouchMove, true);
					_containerNode._ftscrollerToggle('touchend', _onTouchEnd, true);
					_containerNode._ftscrollerToggle('touchcancel', _onTouchEnd, true);
				}
				if (!_instanceOptions.disabledInputMethods.mouse) {
					_containerNode._ftscrollerToggle('mousedown', _onMouseDown, true);
					if (!enable) {
						document.removeEventListener('mousemove', _onMouseMove, true);
						document.removeEventListener('mouseup', _onMouseUp, true);
					}
				}
			}
			if (!_instanceOptions.disabledInputMethods.scroll) {
				_containerNode._ftscrollerToggle('DOMMouseScroll', _onMouseScroll, false);
				_containerNode._ftscrollerToggle('mousewheel', _onMouseScroll, false);
			}

			// Add a click listener.  On IE, add the listener to the document, to allow
			// clicks to be cancelled if a scroll ends outside the bounds of the container; on
			// other platforms, add to the container node.
			if (_trackPointerEvents) {
				if (enable) {
					document.addEventListener('click', _onClick, true);
				} else {
					document.removeEventListener('click', _onClick, true);
				}
			} else {
				_containerNode._ftscrollerToggle('click', _onClick, true);
			}

			// Watch for changes inside the contained element to update bounds - de-bounced slightly.
			if (enable) {
				_contentParentNode.addEventListener('focus', _childFocused, true);
				if (_instanceOptions.updateOnChanges) {

					// Try and reuse the old, disconnected observer instance if available
					// Otherwise, check for support before proceeding
					if (!_mutationObserver) {
						MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window[_vendorStylePropertyPrefix + 'MutationObserver'];
						if (MutationObserver) {
							_mutationObserver = new MutationObserver(_domChanged);
						}
					}

					if (_mutationObserver) {
						_mutationObserver.observe(_contentParentNode, {
							childList: true,
							characterData: true,
							subtree: true
						});
					} else {
						_contentParentNode.addEventListener('DOMSubtreeModified', function (e) {


							// Ignore changes to nested FT Scrollers - even updating a transform style
							// can trigger a DOMSubtreeModified in IE, causing nested scrollers to always
							// favour the deepest scroller as parent scrollers 'resize'/end scrolling.
							if (e && (e.srcElement === _contentParentNode || e.srcElement.className.indexOf('ftscroller_') !== -1)) {
								return;
							}

							_domChanged();
						}, true);
					}
					_contentParentNode.addEventListener('load', _domChanged, true);
				}
				if (_instanceOptions.updateOnWindowResize) {
					window.addEventListener('resize', _domChanged, true);
				}
			} else {
				_contentParentNode.removeEventListener('focus', _childFocused, true);
				if (_mutationObserver) {
					_mutationObserver.disconnect();
				} else {
					_contentParentNode.removeEventListener('DOMSubtreeModified', _domChanged, true);
				}
				_contentParentNode.removeEventListener('load', _domChanged, true);
				window.removeEventListener('resize', _domChanged, true);
			}

			delete _containerNode._ftscrollerToggle;
		};

		/**
		 * Touch event handlers
		 */
		_onTouchStart = function _onTouchStart(startEvent) {
			var i, l, touchEvent;

			// If a touch is already active, ensure that the index
			// is mapped to the correct finger, and return.
			if (_inputIdentifier) {
				for (i = 0, l = startEvent.touches.length; i < l; i = i + 1) {
					if (startEvent.touches[i].identifier === _inputIdentifier) {
						_inputIndex = i;
					}
				}
				return;
			}

			// Track the new touch's identifier, reset index, and pass
			// the coordinates to the scroll start function.
			touchEvent = startEvent.touches[0];
			_inputIdentifier = touchEvent.identifier;
			_inputIndex = 0;
			_startScroll(touchEvent.clientX, touchEvent.clientY, startEvent.timeStamp, startEvent);
		};
		_onTouchMove = function _onTouchMove(moveEvent) {
			if (_inputIdentifier === false) {
				return;
			}

			// Get the coordinates from the appropriate touch event and
			// pass them on to the scroll handler
			var touchEvent = moveEvent.touches[_inputIndex];
			_updateScroll(touchEvent.clientX, touchEvent.clientY, moveEvent.timeStamp, moveEvent);
		};
		_onTouchEnd = function _onTouchEnd(endEvent) {
			var i, l;

			// Check whether the original touch event is still active,
			// if it is, update the index and return.
			if (endEvent.touches) {
				for (i = 0, l = endEvent.touches.length; i < l; i = i + 1) {
					if (endEvent.touches[i].identifier === _inputIdentifier) {
						_inputIndex = i;
						return;
					}
				}
			}

			// Complete the scroll.  Note that touch end events
			// don't capture coordinates.
			_endScroll(endEvent.timeStamp, endEvent);
		};

		/**
		 * Mouse event handlers
		 */
		_onMouseDown = function _onMouseDown(startEvent) {

			// Don't track the right mouse buttons, or a context menu
			if ((startEvent.button && startEvent.button === 2) || startEvent.ctrlKey) {
				return;
			}

			// Capture if possible
			if (_containerNode.setCapture) {
				_containerNode.setCapture();
			}

			// Add move & up handlers to the *document* to allow handling outside the element
			document.addEventListener('mousemove', _onMouseMove, true);
			document.addEventListener('mouseup', _onMouseUp, true);

			_inputIdentifier = startEvent.button || 1;
			_inputIndex = 0;
			_startScroll(startEvent.clientX, startEvent.clientY, startEvent.timeStamp, startEvent);
		};
		_onMouseMove = function _onMouseMove(moveEvent) {
			if (!_inputIdentifier) {
				return;
			}

			_updateScroll(moveEvent.clientX, moveEvent.clientY, moveEvent.timeStamp, moveEvent);
		};
		_onMouseUp = function _onMouseUp(endEvent) {
			if (endEvent.button && endEvent.button !== _inputIdentifier) {
				return;
			}

			document.removeEventListener('mousemove', _onMouseMove, true);
			document.removeEventListener('mouseup', _onMouseUp, true);

			// Release capture if possible
			if (_containerNode.releaseCapture) {
				_containerNode.releaseCapture();
			}

			_endScroll(endEvent.timeStamp, endEvent);
		};

		/**
		 * Pointer event handlers
		 */
		_onPointerDown = function _onPointerDown(startEvent) {

			// If there is already a pointer event being tracked, ignore subsequent.
			if (_inputIdentifier) {
				return;
			}

			// Disable specific input types if specified in the config.  Separate
			// out touch and other events (eg treat both pen and mouse as "mouse")
			if (startEvent.pointerType === startEvent.MSPOINTER_TYPE_TOUCH) {
				if (_instanceOptions.disabledInputMethods.touch) {
					return;
				}
			} else if (_instanceOptions.disabledInputMethods.mouse) {
				return;
			}

			_inputIdentifier = startEvent.pointerId;
			_captureInput();
			_startScroll(startEvent.clientX, startEvent.clientY, startEvent.timeStamp, startEvent);
		};
		_onPointerMove = function _onPointerMove(moveEvent) {
			if (_inputIdentifier !== moveEvent.pointerId) {
				return;
			}
			_updateScroll(moveEvent.clientX, moveEvent.clientY, moveEvent.timeStamp, moveEvent);
		};
		_onPointerUp = function _onPointerUp(endEvent) {
			if (_inputIdentifier !== endEvent.pointerId) {
				return;
			}

			_endScroll(endEvent.timeStamp, endEvent);
		};
		_onPointerCancel = function _onPointerCancel(endEvent) {
			_endScroll(endEvent.timeStamp, endEvent);
		};
		_onPointerCaptureEnd = function _onPointerCaptureEnd(event) {
			_endScroll(event.timeStamp, event);
		};


		/**
		 * Prevents click actions if appropriate
		 */
		_onClick = function _onClick(clickEvent) {

			// If a scroll action hasn't resulted in the next scroll being prevented, and a scroll
			// isn't currently in progress with a different identifier, allow the click
			if (!_preventClick && !_inputIdentifier) {
				return true;
			}

			// Prevent clicks using the preventDefault() and stopPropagation() handlers on the event;
			// this is safe even in IE10 as this is always a "true" event, never a window.event.
			clickEvent.preventDefault();
			clickEvent.stopPropagation();
			if (!_inputIdentifier) {
				_preventClick = false;
			}
			return false;
		};


		/**
		 * Process scroll wheel/input actions as scroller scrolls
		 */
		_onMouseScroll = function _onMouseScroll(event) {
			var scrollDeltaX, scrollDeltaY;
			if (_inputIdentifier !== 'scrollwheel') {
				if (_inputIdentifier !== false) {
					return true;
				}
				_inputIdentifier = 'scrollwheel';
				_cumulativeScroll.x = 0;
				_cumulativeScroll.y = 0;

				// Start a scroll event
				if (!_startScroll(event.clientX, event.clientY, Date.now(), event)) {
					return;
				}
			}

			// Convert the scrollwheel values to a scroll value
			if (event.wheelDelta) {
				if (event.wheelDeltaX) {
					scrollDeltaX = event.wheelDeltaX / 2;
					scrollDeltaY = event.wheelDeltaY / 2;
				} else {
					scrollDeltaX = 0;
					scrollDeltaY = event.wheelDelta / 2;
				}
			} else {
				if (event.axis && event.axis === event.HORIZONTAL_AXIS) {
					scrollDeltaX = event.detail * -10;
					scrollDeltaY = 0;
				} else {
					scrollDeltaX = 0;
					scrollDeltaY = event.detail * -10;
				}
			}

			// If the scroller is constrained to an x axis, convert y scroll to allow single-axis scroll
			// wheels to scroll constrained content.
			if (!_instanceOptions.scrollingY && !scrollDeltaX) {
				scrollDeltaX = scrollDeltaY;
				scrollDeltaY = 0;
			}

			_cumulativeScroll.x = Math.round(_cumulativeScroll.x + scrollDeltaX);
			_cumulativeScroll.y = Math.round(_cumulativeScroll.y + scrollDeltaY);

			_updateScroll(_gestureStart.x + _cumulativeScroll.x, _gestureStart.y + _cumulativeScroll.y, event.timeStamp, event);

			// End scrolling state
			if (_scrollWheelEndDebouncer) {
				clearTimeout(_scrollWheelEndDebouncer);
			}
			_scrollWheelEndDebouncer = setTimeout(function () {
				_inputIdentifier = false;
				_releaseInputCapture();
				_isScrolling = false;
				_isDisplayingScroll = false;
				_ftscrollerMoving = false;
				if (_instanceOptions.windowScrollingActiveFlag) {
					window[_instanceOptions.windowScrollingActiveFlag] = false;
				}
				_cancelAnimation();
				if (!_snapScroll()) {
					_finalizeScroll();
				}
			}, 300);
		};

		/**
		 * Capture and release input support, particularly allowing tracking
		 * of Metro pointers outside the docked view.
		 */
		_captureInput = function _captureInput() {
			if (_inputCaptured || _inputIdentifier === false || _inputIdentifier === 'scrollwheel') {
				return;
			}
			if (_trackPointerEvents) {
				_containerNode.msSetPointerCapture(_inputIdentifier);
				_containerNode.addEventListener('MSLostPointerCapture', _onPointerCaptureEnd, false);
			}
			_inputCaptured = true;
		};
		_releaseInputCapture = function _releaseInputCapture() {
			if (!_inputCaptured) {
				return;
			}
			if (_trackPointerEvents) {
				_containerNode.removeEventListener('MSLostPointerCapture', _onPointerCaptureEnd, false);
				_containerNode.msReleasePointerCapture(_inputIdentifier);
			}
			_inputCaptured = false;
		};

		/**
		 * Utility function acting as a getBoundingClientRect polyfill.
		 */
		_getBoundingRect = function _getBoundingRect(anElement) {
			if (anElement.getBoundingClientRect) {
				return anElement.getBoundingClientRect();
			}

			var x = 0, y = 0, eachElement = anElement;
			while (eachElement) {
				x = x + eachElement.offsetLeft - eachElement.scrollLeft;
				y = y + eachElement.offsetTop - eachElement.scrollTop;
				eachElement = eachElement.offsetParent;
			}
			return { left: x, top: y, width: anElement.offsetWidth, height: anElement.offsetHeight };
		};


		/*                     Instantiation                     */

		// Set up the DOM node if appropriate
		_initializeDOM();

		// Update sizes
		_updateDimensions();

		// Set up the event handlers
		_toggleEventHandlers(true);

		// Define a public API to be returned at the bottom - this is the public-facing interface.
		_publicSelf = {
			destroy: destroy,
			setSnapSize: setSnapSize,
			scrollTo: scrollTo,
			scrollBy: scrollBy,
			updateDimensions: updateDimensions,
			addEventListener: addEventListener,
			removeEventListener: removeEventListener
		};
		
		if (Object.defineProperties) {
			Object.defineProperties(_publicSelf, {
				'scrollHeight': {
					get: function() { return _metrics.content.y; },
					set: function(value) { throw new SyntaxError('scrollHeight is currently read-only - ignoring ' + value); }
				},
				'scrollLeft': {
					get: function() { return -_lastScrollPosition.x; },
					set: function(value) { scrollTo(value, false, false); return -_lastScrollPosition.x; }
				},
				'scrollTop': {
					get: function() { return -_lastScrollPosition.y; },
					set: function(value) { scrollTo(false, value, false); return -_lastScrollPosition.y; }
				},
				'scrollWidth': {
					get: function() { return _metrics.content.x; },
					set: function(value) { throw new SyntaxError('scrollWidth is currently read-only - ignoring ' + value); }
				},
				'segmentCount': {
					get: function() {
						if (!_instanceOptions.snapping) {
							return { x: NaN, y: NaN };
						}
						return {
							x: Math.ceil(_metrics.content.x / _snapGridSize.x),
							y: Math.ceil(_metrics.content.y / _snapGridSize.y)
						};
					},
					set: function(value) { throw new SyntaxError('segmentCount is currently read-only - ignoring ' + value); }
				},
				'currentSegment': {
					get: function() { return { x: _activeSegment.x, y: _activeSegment.y }; },
					set: function(value) { throw new SyntaxError('currentSegment is currently read-only - ignoring ' + value); }
				},
				'contentContainerNode': {
					get: function() { return _contentParentNode; },
					set: function(value) { throw new SyntaxError('contentContainerNode is currently read-only - ignoring ' + value); }
				}
			});
		};
		
		// Return the public interface.
		return _publicSelf;
	};


	/*          Prototype Functions and Properties           */

	/**
	 * The HTML to prepend to the scrollable content to wrap it. Used internally,
	 * and may be used to pre-wrap scrollable content.  Axes can optionally
	 * be excluded for speed improvements.
	 */
	FTScroller.prototype.getPrependedHTML = function (excludeXAxis, excludeYAxis, hwAccelerationClass) {
		if (!hwAccelerationClass) {
			if (typeof FTScrollerOptions === 'object' && FTScrollerOptions.hwAccelerationClass) {
				hwAccelerationClass = FTScrollerOptions.hwAccelerationClass;
			} else {
				hwAccelerationClass = 'ftscroller_hwaccelerated';
			}
		}

		var output = '<div class="ftscroller_container">';
		if (!excludeXAxis) {
			output += '<div class="ftscroller_x ' + hwAccelerationClass + '">';
		}
		if (!excludeYAxis) {
			output += '<div class="ftscroller_y ' + hwAccelerationClass + '">';
		}

		return output;
	};

	/**
	 * The HTML to append to the scrollable content to wrap it; again, used internally,
	 * and may be used to pre-wrap scrollable content.
	 */
	FTScroller.prototype.getAppendedHTML = function (excludeXAxis, excludeYAxis, hwAccelerationClass, scrollbars) {
		if (!hwAccelerationClass) {
			if (typeof FTScrollerOptions === 'object' && FTScrollerOptions.hwAccelerationClass) {
				hwAccelerationClass = FTScrollerOptions.hwAccelerationClass;
			} else {
				hwAccelerationClass = 'ftscroller_hwaccelerated';
			}
		}

		var output = '';
		if (!excludeXAxis) {
			output += '</div>';
		}
		if (!excludeYAxis) {
			output += '</div>';
		}
		if (scrollbars) {
			if (!excludeXAxis) {
				output += '<div class="ftscroller_scrollbar ftscroller_scrollbarx ' + hwAccelerationClass + '"><div class="ftscroller_scrollbarinner"></div></div>';
			}
			if (!excludeYAxis) {
				output += '<div class="ftscroller_scrollbar ftscroller_scrollbary ' + hwAccelerationClass + '"><div class="ftscroller_scrollbarinner"></div></div>';
			}
		}
		output += '</div>';

		return output;
	};
}());


(function () {
	'use strict';

	function _throwRangeError(name, value) {
		throw new RangeError('"' + name + '" must be a number between 0 and 1. ' + 'Got ' + value + ' instead.');
	}

	/**
	 * Represents a two-dimensional cubic bezier curve with the starting
	 * point (0, 0) and the end point (1, 1). The two control points p1 and p2
	 * have x and y coordinates between 0 and 1.
	 *
	 * This type of bezier curves can be used as CSS transform timing functions.
	 */
	CubicBezier = function (p1x, p1y, p2x, p2y) {
		if (!(p1x >= 0 && p1x <= 1)) {
			_throwRangeError('p1x', p1x);
		}
		if (!(p1y >= 0 && p1y <= 1)) {
			_throwRangeError('p1y', p1y);
		}
		if (!(p2x >= 0 && p2x <= 1)) {
			_throwRangeError('p2x', p2x);
		}
		if (!(p2y >= 0 && p2y <= 1)) {
			_throwRangeError('p2y', p2y);
		}

		// Control points
		this._p1 = { x: p1x, y: p1y };
		this._p2 = { x: p2x, y: p2y };
	};

	CubicBezier.prototype._getCoordinateForT = function (t, p1, p2) {
		var c = 3 * p1,
			b = 3 * (p2 - p1) - c,
			a = 1 - c - b;

		return ((a * t + b) * t + c) * t;
	};

	CubicBezier.prototype._getCoordinateDerivateForT = function (t, p1, p2) {
		var c = 3 * p1,
			b = 3 * (p2 - p1) - c,
			a = 1 - c - b;

		return (3 * a * t + 2 * b) * t + c;
	};

	CubicBezier.prototype._getTForCoordinate = function (c, p1, p2, epsilon) {
		if (!isFinite(epsilon) || epsilon <= 0) {
			throw new RangeError('"epsilon" must be a number greater than 0.');
		}
		var t2, i, c2, d2;

		// First try a few iterations of Newton's method -- normally very fast.
		for (t2 = c, i = 0; i < 8; i = i + 1) {
			c2 = this._getCoordinateForT(t2, p1, p2) - c;
			if (Math.abs(c2) < epsilon) {
				return t2;
			}
			d2 = this._getCoordinateDerivateForT(t2, p1, p2);
			if (Math.abs(d2) < 1e-6) {
				break;
			}
			t2 = t2 - c2 / d2;
		}

		// Fall back to the bisection method for reliability.
		t2 = c;
		var t0 = 0,
			t1 = 1;

		if (t2 < t0) {
			return t0;
		}
		if (t2 > t1) {
			return t1;
		}

		while (t0 < t1) {
			c2 = this._getCoordinateForT(t2, p1, p2);
			if (Math.abs(c2 - c) < epsilon) {
				return t2;
			}
			if (c > c2) {
				t0 = t2;
			} else {
				t1 = t2;
			}
			t2 = (t1 - t0) * 0.5 + t0;
		}

		// Failure.
		return t2;
	};

	/**
	 * Computes the point for a given t value.
	 *
	 * @param {number} t
	 * @returns {Object} Returns an object with x and y properties
	 */
	CubicBezier.prototype.getPointForT = function (t) {

		// Special cases: starting and ending points
		if (t === 0 || t === 1) {
			return { x: t, y: t };
		}

		// Check for correct t value (must be between 0 and 1)
		if (t < 0 || t > 1) {
			_throwRangeError('t', t);
		}

		return {
			x: this._getCoordinateForT(t, this._p1.x, this._p2.x),
			y: this._getCoordinateForT(t, this._p1.y, this._p2.y)
		};
	};

	CubicBezier.prototype.getTForX = function (x, epsilon) {
		return this._getTForCoordinate(x, this._p1.x, this._p2.x, epsilon);
	};

	CubicBezier.prototype.getTForY = function (y, epsilon) {
		return this._getTForCoordinate(y, this._p1.y, this._p2.y, epsilon);
	};

	/**
	 * Computes auxiliary points using De Casteljau's algorithm.
	 *
	 * @param {number} t must be greater than 0 and lower than 1.
	 * @returns {Object} with members i0, i1, i2 (first iteration),
	 *    j1, j2 (second iteration) and k (the exact point for t)
	 */
	CubicBezier.prototype._getAuxPoints = function (t) {
		if (t <= 0 || t >= 1) {
			_throwRangeError('t', t);
		}


		/* First series of auxiliary points */

		// First control point of the left curve
		var i0 = {
				x: t * this._p1.x,
				y: t * this._p1.y
			},
			i1 = {
				x: this._p1.x + t * (this._p2.x - this._p1.x),
				y: this._p1.y + t * (this._p2.y - this._p1.y)
			},

			// Second control point of the right curve
			i2  = {
				x: this._p2.x + t * (1 - this._p2.x),
				y: this._p2.y + t * (1 - this._p2.y)
			};


		/* Second series of auxiliary points */

		// Second control point of the left curve
		var j0 = {
				x: i0.x + t * (i1.x - i0.x),
				y: i0.y + t * (i1.y - i0.y)
			},

			// First control point of the right curve
			j1 = {
				x: i1.x + t * (i2.x - i1.x),
				y: i1.y + t * (i2.y - i1.y)
			};

		// The division point (ending point of left curve, starting point of right curve)
		var k = {
				x: j0.x + t * (j1.x - j0.x),
				y: j0.y + t * (j1.y - j0.y)
			};

		return {
			i0: i0,
			i1: i1,
			i2: i2,
			j0: j0,
			j1: j1,
			k: k
		};
	};

	/**
	 * Divides the bezier curve into two bezier functions.
	 *
	 * De Casteljau's algorithm is used to compute the new starting, ending, and
	 * control points.
	 *
	 * @param {number} t must be greater than 0 and lower than 1.
	 *     t === 1 or t === 0 are the starting/ending points of the curve, so no
	 *     division is needed.
	 *
	 * @returns {CubicBezier[]} Returns an array containing two bezier curves
	 *     to the left and the right of t.
	 */
	CubicBezier.prototype.divideAtT = function (t) {
		if (t < 0 || t > 1) {
			_throwRangeError('t', t);
		}

		// Special cases t = 0, t = 1: Curve can be cloned for one side, the other
		// side is a linear curve (with duration 0)
		if (t === 0 || t === 1) {
			var curves = [];
			curves[t] = CubicBezier.linear();
			curves[1 - t] = this.clone();
			return curves;
		}

		var left = {},
			right = {},
			points = this._getAuxPoints(t);

		var i0 = points.i0,
			i2 = points.i2,
			j0 = points.j0,
			j1 = points.j1,
			k = points.k;

		// Normalize derived points, so that the new curves starting/ending point
		// coordinates are (0, 0) respectively (1, 1)
		var factorX = k.x,
			factorY = k.y;

		left.p1 = {
			x: i0.x / factorX,
			y: i0.y / factorY
		};
		left.p2 = {
			x: j0.x / factorX,
			y: j0.y / factorY
		};

		right.p1 = {
			x: (j1.x - factorX) / (1 - factorX),
			y: (j1.y - factorY) / (1 - factorY)
		};

		right.p2 = {
			x: (i2.x - factorX) / (1 - factorX),
			y: (i2.y - factorY) / (1 - factorY)
		};

		return [
			new CubicBezier(left.p1.x, left.p1.y, left.p2.x, left.p2.y),
			new CubicBezier(right.p1.x, right.p1.y, right.p2.x, right.p2.y)
		];
	};

	CubicBezier.prototype.divideAtX = function (x, epsilon) {
		if (x < 0 || x > 1) {
			_throwRangeError('x', x);
		}

		var t = this.getTForX(x, epsilon);
		return this.divideAtT(t);
	};

	CubicBezier.prototype.divideAtY = function (y, epsilon) {
		if (y < 0 || y > 1) {
			_throwRangeError('y', y);
		}

		var t = this.getTForY(y, epsilon);
		return this.divideAtT(t);
	};

	CubicBezier.prototype.clone = function () {
		return new CubicBezier(this._p1.x, this._p1.y, this._p2.x, this._p2.y);
	};

	CubicBezier.prototype.toString = function () {
		return "cubic-bezier(" + [
			this._p1.x,
			this._p1.y,
			this._p2.x,
			this._p2.y
		].join(", ") + ")";
	};

	CubicBezier.linear = function () {
		return new CubicBezier();
	};

	CubicBezier.ease = function () {
		return new CubicBezier(0.25, 0.1, 0.25, 1.0);
	};
	CubicBezier.linear = function () {
		return new CubicBezier(0.0, 0.0, 1.0, 1.0);
	};
	CubicBezier.easeIn = function () {
		return new CubicBezier(0.42, 0, 1.0, 1.0);
	};
	CubicBezier.easeOut = function () {
		return new CubicBezier(0, 0, 0.58, 1.0);
	};
	CubicBezier.easeInOut = function () {
		return new CubicBezier(0.42, 0, 0.58, 1.0);
	};
}());

// If a CommonJS environment is present, add our exports; make the check in a jslint-compatible method.
var module;
if (module !== undefined && module.exports) {
	module.exports = function(domNode, options) {
		'use strict';
		return new FTScroller(domNode, options);
	};

	module.exports.FTScroller = FTScroller;
	module.exports.CubicBezier = CubicBezier;
}
},{}],5:[function(require,module,exports){
/*global require, module*/

var galleryDOM = require('./galleryDOM'),
    FTScroller = require('FTScroller'),
    SimpleScroller = require('./SimpleScroller');

function Gallery(containerEl, config) {
    "use strict";

    if (!document.querySelectorAll) {
        return;
    }

    var viewportEl,
        allItemsEl,
        itemEls,
        selectedItemIndex,
        shownItemIndex,
        debounceOnResize,
        scroller,
        debounceScroll,
        transitionInProgress = false,
        prevControlDiv,
        nextControlDiv,
        propertyAttributeMap = {
            component: "data-o-component",
            version: "data-o-version",
            syncID: "data-o-gallery-syncid",
            multipleItemsPerPage: "data-o-gallery-multipleitemsperpage",
            touch: "data-o-gallery-touch",
            captions: "data-o-gallery-captions",
            captionMinHeight: "data-o-gallery-captionminheight",
            captionMaxHeight: "data-o-gallery-captionmaxheight",
            windowResize: "data-o-gallery-windowresize"
        },
        defaultConfig = {
            component: "o-gallery",
            version: "0.0.0",
            multipleItemsPerPage: false,
            captions: true,
            captionMinHeight: 24,
            captionMaxHeight: 52,
            touch: false,
            syncID: "o-gallery-" + new Date().getTime(),
            windowResize: true
        };

    function supportsCssTransforms() {
        var htmlEl = document.getElementsByTagName('html')[0];
        return galleryDOM.hasClass(htmlEl, "csstransforms") || galleryDOM.hasClass(htmlEl, "csstransforms3d") || galleryDOM.hasClass(htmlEl, "csstransitions");
    }

    function isDataSource() {
        return (config.items && config.items.length > 0);
    }

    function setWidths() {
        var i,
            l,
            totalWidth = 0,
            itemWidth = containerEl.clientWidth;
        if (config.multipleItemsPerPage) {
            itemWidth = parseInt(itemEls[selectedItemIndex].clientWidth, 10);
        }
        for (i = 0, l = itemEls.length; i < l; i++) {
            itemEls[i].style.width = itemWidth + "px";
            totalWidth += itemWidth;
        }
        allItemsEl.style.width = totalWidth + "px";
    }

    function isValidItem(n) {
        return (typeof n === "number" && n > -1 && n < itemEls.length);
    }

    function getSelectedItem() {
        var selectedItem = 0, c, l;
        for (c = 0, l = itemEls.length; c < l; c++) {
            if (galleryDOM.hasClass(itemEls[c], "o-gallery__item--selected")) {
                selectedItem = c;
                break;
            }
        }
        return selectedItem;
    }

    function addUiControls() {
        prevControlDiv = galleryDOM.createElement("div", "", "o-gallery__control o-gallery__control--prev");
        nextControlDiv = galleryDOM.createElement("div", "", "o-gallery__control o-gallery__control--next");
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);
        galleryDOM.listenForEvent(prevControlDiv, "click", prev);
        galleryDOM.listenForEvent(nextControlDiv, "click", next);
        if (config.multipleItemsPerPage) {
            galleryDOM.listenForEvent(viewportEl, "click", function (evt) {
                var clickedItemNum = galleryDOM.getElementIndex(galleryDOM.getClosest(evt.srcElement, "o-gallery__item"));
                selectItem(clickedItemNum, true, "user");
            });
        }
    }

    function setCaptionSizes() {
        for (var c = 0, l = itemEls.length; c < l; c++) {
            var itemEl = itemEls[c];
            itemEl.style.paddingBottom = config.captionMinHeight + "px";
            var captionEl = itemEl.querySelector(".o-gallery__item__caption");
            if (captionEl) {
                captionEl.style.minHeight = config.captionMinHeight + "px";
                captionEl.style.maxHeight = config.captionMaxHeight + "px";
            }
        }
    }

    function insertItemContent(n) {
        var itemNums = (n instanceof Array) ? n : [n];
        if (config.items) {
            for (var c = 0, l = itemNums.length; c < l; c++) {
                var itemNum = itemNums[c];
                if (isValidItem(itemNum) && !config.items[itemNum].inserted) {
                    galleryDOM.insertItemContent(config, config.items[itemNum], itemEls[itemNum]);
                    config.items[itemNum].inserted = true;
                    setCaptionSizes();
                }
            }
        }
    }

    function isWholeItemInPageView(itemNum, l, r) {
        return itemEls[itemNum].offsetLeft >= l && itemEls[itemNum].offsetLeft + itemEls[itemNum].clientWidth <= r;
    }

    function isAnyPartOfItemInPageView(itemNum, l, r) {
        return (itemEls[itemNum].offsetLeft >= l - itemEls[itemNum].clientWidth && itemEls[itemNum].offsetLeft <= r);
    }

    function getItemsInPageView(l, r, whole) {
        var itemsInView = [],
            onlyWhole = (typeof whole !== "boolean") ? true : whole;
        for (var c = 0; c < itemEls.length; c++) {
            if ((onlyWhole && isWholeItemInPageView(c, l, r)) || (!onlyWhole && isAnyPartOfItemInPageView(c, l, r))) {
                itemsInView.push(c);
            }
        }
        return itemsInView;
    }

    function onGalleryCustomEvent(evt) {
        if (evt.srcElement !== containerEl && evt.syncID === config.syncID && evt.oGallerySource === "user") {
            selectItem(evt.itemID, true);
        }
    }

    function listenForSyncEvents() {
        if (document.addEventListener) {
            document.addEventListener("oGalleryItemSelected", onGalleryCustomEvent);
        }
    }

    function triggerEvent(name, data) {
        if (document.createEvent && containerEl.dispatchEvent) {
            var event = document.createEvent('Event');
            event.initEvent(name, true, true);
            event.syncID = config.syncID;
            event.gallery = data.gallery;
            event.itemID = data.itemID;
            event.oGallerySource = data.source;
            containerEl.dispatchEvent(event);
        }
    }

    function moveViewport(left, transition) {
        scroller.scrollTo(left, 0, transition !== false);
        insertItemContent(getItemsInPageView(left, left + viewportEl.clientWidth, false));
    }

    function alignItemLeft(n, transition) {
        moveViewport(itemEls[n].offsetLeft, transition);
    }

    function alignItemRight(n, transition) {
        var newScrollLeft = itemEls[n].offsetLeft - (viewportEl.clientWidth - itemEls[n].clientWidth);
        moveViewport(newScrollLeft, transition);
    }

    function bringItemIntoView(n, transition) {
        if (!isValidItem(n)) {
            return;
        }
        var viewportL = scroller.scrollLeft,
            viewportR = viewportL + viewportEl.clientWidth,
            itemL = itemEls[n].offsetLeft,
            itemR = itemL + itemEls[n].clientWidth;
        if (itemL > viewportL && itemR < viewportR) {
            return;
        }
        if (itemL < viewportL) {
            alignItemLeft(n, transition);
        } else if (itemR > viewportR) {
            alignItemRight(n, transition);
        }
    }

    function showItem(n, transition) {
        if (isValidItem(n)) {
            bringItemIntoView(n, transition);
            shownItemIndex = n;
        }
    }

    function showPrevItem() {
        var prev = (shownItemIndex - 1 >= 0) ? shownItemIndex - 1 : itemEls.length - 1;
        showItem(prev);
    }

    function showNextItem() {
        var next = (shownItemIndex + 1 < itemEls.length) ? shownItemIndex + 1 : 0;
        showItem(next);
    }

    function showPrevPage() {
        if (scroller.scrollLeft === 0) {
            showItem(itemEls.length - 1);
        } else {
            var prevPageWholeItems = getItemsInPageView(scroller.scrollLeft - viewportEl.clientWidth, scroller.scrollLeft),
                prevPageItem = prevPageWholeItems.pop() || 0;
            alignItemRight(prevPageItem);
        }
    }

    function showNextPage() {
        if (scroller.scrollLeft === allItemsEl.clientWidth - viewportEl.clientWidth) {
            showItem(0);
        } else {
            var currentWholeItemsInView = getItemsInPageView(scroller.scrollLeft, scroller.scrollLeft + viewportEl.clientWidth),
                lastWholeItemInView = currentWholeItemsInView.pop() || itemEls.length - 1;
            alignItemLeft(lastWholeItemInView + 1);
        }
    }

    function selectItem(n, show, source) {
        if (!source) {
            source = "api";
        }
        if (isValidItem(n)) {
            if (show) {
                showItem(n);
            }
            if (n !== selectedItemIndex) {
                selectedItemIndex = n;
                for (var c = 0, l = itemEls.length; c < l; c++) {
                    if (c === selectedItemIndex) {
                        galleryDOM.addClass(itemEls[c], "o-gallery__item--selected");
                    } else {
                        galleryDOM.removeClass(itemEls[c], "o-gallery__item--selected");
                    }
                }
                triggerEvent("oGalleryItemSelected", {
                    itemID: selectedItemIndex,
                    source: source
                });
            }
        }
    }

    function selectPrevItem(show, source) {
        var prev = (selectedItemIndex - 1 >= 0) ? selectedItemIndex - 1 : itemEls.length - 1;
        selectItem(prev, show, source);
    }

    function selectNextItem(show, source) {
        var next = (selectedItemIndex + 1 < itemEls.length) ? selectedItemIndex + 1 : 0;
        selectItem(next, show, source);
    }

    function prev() {
        if (transitionInProgress) {
            return;
        }
        if (config.multipleItemsPerPage) {
            showPrevPage();
        } else {
            selectPrevItem(true, "user");
        }
    }

    function next() {
        if (transitionInProgress) {
            return;
        }
        if (config.multipleItemsPerPage) {
            showNextPage();
        } else {
            selectNextItem(true, "user");
        }
    }

    function onResize() {
        setWidths();
        if (!config.multipleItemsPerPage) { // correct the alignment of item in view
            showItem(shownItemIndex, false);
        } else {
            var newScrollLeft = scroller.scrollLeft;
            insertItemContent(getItemsInPageView(newScrollLeft, newScrollLeft + viewportEl.clientWidth, false));
        }
    }

    function resizeHandler() {
        clearTimeout(debounceOnResize);
        debounceOnResize = setTimeout(onResize, 500);
    }

    function extendObjects(objs) {
        var newObj = {};
        for (var c = 0, l = objs.length; c < l; c++) {
            var obj = objs[c];
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    newObj[prop] = obj[prop];
                }
            }
        }
        return newObj;
    }

    function updateDataAttributes() {
        galleryDOM.setAttributesFromProperties(containerEl, config, propertyAttributeMap, ["items"]);
    }

    function setSyncID(id) {
        config.syncID = id;
        updateDataAttributes();
    }

    function getSyncID() {
        return config.syncID;
    }

    function syncWith(galleryInstance) {
        setSyncID(galleryInstance.getSyncID());
    }

    function onScroll(evt) {
        insertItemContent(getItemsInPageView(evt.scrollLeft, evt.scrollLeft + viewportEl.clientWidth, false));
    }

    function destroy() {
        prevControlDiv.parentNode.removeChild(prevControlDiv);
        prevControlDiv = null;
        nextControlDiv.parentNode.removeChild(nextControlDiv);
        nextControlDiv = null;
        scroller.destroy(true);
        for (var prop in propertyAttributeMap) {
            if (propertyAttributeMap.hasOwnProperty(prop)) {
                containerEl.removeAttribute(propertyAttributeMap[prop]);
            }
        }
        if (document.removeEventListener) {
            document.removeEventListener("oGalleryItemSelected", onGalleryCustomEvent);
        }
        if (config.windowResize) {
            galleryDOM.unlistenForEvent(window, "resize", resizeHandler);
        }
    }

    galleryDOM.addClass(containerEl, "o-gallery--js");
    if (isDataSource()) {
        galleryDOM.emptyElement(containerEl);
        galleryDOM.addClass(containerEl, "o-gallery");
        allItemsEl = galleryDOM.createItemsList(containerEl);
        itemEls = galleryDOM.createItems(allItemsEl, config.items);
    }
    config = extendObjects([defaultConfig, galleryDOM.getPropertiesFromAttributes(containerEl, propertyAttributeMap), config]);
    updateDataAttributes();
    allItemsEl = containerEl.querySelector(".o-gallery__items");
    itemEls = containerEl.querySelectorAll(".o-gallery__item");
    selectedItemIndex = getSelectedItem();
    shownItemIndex = selectedItemIndex;
    if (config.windowResize) {
        galleryDOM.listenForEvent(window, "resize", resizeHandler);
    }
    insertItemContent(selectedItemIndex);
    setWidths();
    setCaptionSizes();
    if (supportsCssTransforms()) {
        scroller = new FTScroller(containerEl, {
            scrollbars: false,
            scrollingY: false,
            updateOnWindowResize: true,
            snapping: !config.multipleItemsPerPage,
            /* Can't use fling/inertial scroll as after user input is finished and scroll continues, scroll events are no
             longer fired, and value of scrollLeft doesn't change until scrollend. */
            flinging: false,
            disableInputMethods: {
                touch: !config.touch,
                scroll: true
            }
        });
        scroller.addEventListener("scrollstart", function() {
            transitionInProgress = true;
        });
        scroller.addEventListener("scroll", function(evt) {
            clearTimeout(debounceScroll);
            debounceScroll = setTimeout(function () {
                onScroll(evt);
            }, 50);
        });
        scroller.addEventListener("scrollend", function(evt) {
            transitionInProgress = false;
            onScroll(evt);
        });
        scroller.addEventListener("segmentwillchange", function() {
            if (!config.multipleItemsPerPage) {
                selectItem(scroller.currentSegment.x, false, "user");
            }
        });
    } else {
        scroller = new SimpleScroller(containerEl, {});
    }
    viewportEl = scroller.contentContainerNode.parentNode;
    galleryDOM.addClass(viewportEl, "o-gallery__viewport");
    insertItemContent(getItemsInPageView(scroller.scrollLeft, scroller.scrollLeft + viewportEl.clientWidth, false));
    showItem(selectedItemIndex, false);
    addUiControls();
    listenForSyncEvents();

    this.showItem = showItem;
    this.getSelectedItem = getSelectedItem;
    this.showPrevItem = showPrevItem;
    this.showNextItem = showNextItem;
    this.showPrevPage = showPrevPage;
    this.showNextPage = showNextPage;
    this.selectItem = selectItem;
    this.selectPrevItem = selectPrevItem;
    this.selectNextItem = selectNextItem;
    this.next = next;
    this.prev = prev;
    this.getSyncID = getSyncID;
    this.syncWith = syncWith;
    this.onResize = onResize;
    this.destroy = destroy;

    triggerEvent("oGalleryReady", {
        gallery: this
    });

}

Gallery.createAllIn = function(el, config) {
    "use strict";
    var conf = config || {},
        gEls,
        galleries = [];
    if (el.querySelectorAll) {
        gEls = el.querySelectorAll("[data-o-component=o-gallery]");
        for (var c = 0, l = gEls.length; c < l; c++) {
            galleries.push(new Gallery(gEls[c], conf));
        }
    }
    return galleries;
};

module.exports = Gallery;
},{"./SimpleScroller":6,"./galleryDOM":7,"FTScroller":4}],6:[function(require,module,exports){
/* global require, module */

var galleryDOM = require('./galleryDOM');

/**
 * Mimics FTScroller in simplest possible way (without touch interface, transitions or events)
 * Intended for IE8 particularly.
 */

function SimpleScroller(containerEl, config) {
    'use strict';

    var self = this,
        allItemsEl,
        viewportEl;

    function updateProperties() {
        self.scrollLeft = viewportEl.scrollLeft;
    }

    function scrollTo(n) {
        viewportEl.scrollLeft = n;
        updateProperties();
    }

    function destroy() {
        galleryDOM.unwrapElement(viewportEl);
    }

    allItemsEl = containerEl.querySelector('.o-gallery__items');
    viewportEl = galleryDOM.createElement('div', '', 'o-gallery__viewport');
    containerEl.appendChild(viewportEl);
    galleryDOM.wrapElement(allItemsEl, viewportEl);
    updateProperties();

    this.contentContainerNode = allItemsEl;
    this.scrollTo = scrollTo;
    this.destroy = destroy;

}

module.exports = SimpleScroller;
},{"./galleryDOM":7}],7:[function(require,module,exports){
/*global module*/

"use strict";

function emptyElement(targetEl) {
    while (targetEl.firstChild) {
        targetEl.removeChild(targetEl.firstChild);
    }
}

function createElement(nodeName, content, classes) {
    var el = document.createElement(nodeName);
    el.innerHTML = content;
    el.setAttribute("class", classes);
    return el;
}

function wrapElement(targetEl, wrapEl) {
    var parentEl = targetEl.parentNode;
    wrapEl.appendChild(targetEl);
    parentEl.appendChild(wrapEl);
}

function unwrapElement(targetEl) {
    var wrappingEl = targetEl.parentNode,
        wrappingElParent = wrappingEl.parentNode;
    while (wrappingEl.childNodes.length > 0) {
        wrappingElParent.appendChild(wrappingEl.childNodes[0]);
    }
    wrappingElParent.removeChild(wrappingEl);
}

function hasClass(el, c) {
    return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1;
}

function addClass(el, c) {
    if (!hasClass(el, c)) {
        el.className = el.className + " " + c;
    }
}

function removeClass(el, c) {
    if (hasClass(el, c)) {
        var reg = new RegExp('(\\s|^)' + c + '(\\s|$)');
        el.className = el.className.replace(reg,' ');
    }
}

function createItemsList(containerEl) {
    var itemsList = createElement("ol", "", "o-gallery__items");
    containerEl.appendChild(itemsList);
    return itemsList;
}

function createItems(containerEl, items) {
    var itemClass;
    for (var c = 0, l = items.length; c < l; c++) {
        itemClass = "o-gallery__item" + ((items[c].selected) ? " o-gallery__item--selected" : "" );
        containerEl.appendChild(createElement("li", "&nbsp;", itemClass));
    }
    return containerEl.querySelectorAll(".o-gallery__item");
}

function insertItemContent(config, item, itemEl) {
    emptyElement(itemEl);
    var contentEl = createElement("div", item.content, "o-gallery__item__content");
    itemEl.appendChild(contentEl);
    if (config.captions) {
        var captionEl = createElement("div", item.caption || "", "o-gallery__item__caption");
        itemEl.appendChild(captionEl);
    }
}

function setPropertyIfAttributeExists(obj, propName, el, attrName) {
    var v = el.getAttribute(attrName);
    if (v !== null) {
        if (v === "true") {
            v = true;
        } else if (v === "false") {
            v = false;
        }
        obj[propName] = v;
    }
}

function getPropertiesFromAttributes(el, map) {
    var obj = {},
        prop;
    for (prop in map) {
        if (map.hasOwnProperty(prop)) {
            setPropertyIfAttributeExists(obj, prop, el, map[prop]);
        }
    }
    return obj;
}

function arrayIndexOf(a, v) {
    var i = -1;
    if (Array.prototype.indexOf) {
        return a.indexOf(v);
    } else {
        for (var c = 0, l = a.length; c < l; c++) {
            if (a[c] === v) {
                i = c;
            }
        }
    }
    return i;
}

function setAttributesFromProperties(el, obj, map, excl) {
    var exclude = excl || [];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop) && arrayIndexOf(exclude, prop) < 0) {
            el.setAttribute(map[prop], obj[prop]);
        }
    }
}

function getClosest(el, c) {
    while (!hasClass(el, c) && el.parentNode) {
        el = el.parentNode;
    }
    return el;
}

function getElementIndex(el) {
    var i = 0;
    while (el = el.previousSibling) {
        if (el.nodeType === 1) {
            ++i;
        }
    }
    return i;
}

function listenForEvent(el, name, handler) {
    if (el.addEventListener) {
        el.addEventListener(name, handler, false);
    } else if (el.attachEvent) {
        el.attachEvent("on" + name, handler);
    }
}

function unlistenForEvent(el, name, handler) {
    if (el.removeEventListener) {
        el.removeEventListener(name, handler, false);
    } else if (el.detachEvent) {
        el.detachEvent("on" + name, handler);
    }
}

module.exports = {
    emptyElement: emptyElement,
    createElement: createElement,
    wrapElement: wrapElement,
    unwrapElement: unwrapElement,
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    createItemsList: createItemsList,
    createItems: createItems,
    insertItemContent: insertItemContent,
    setAttributesFromProperties: setAttributesFromProperties,
    getPropertiesFromAttributes: getPropertiesFromAttributes,
    getClosest: getClosest,
    getElementIndex: getElementIndex,
    listenForEvent: listenForEvent,
    unlistenForEvent: unlistenForEvent
};
},{}]},{},["0Aq4KK"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvZGVtby1zcmMvaW1wZXJhdGl2ZS5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L21haW4uanMiLCIvVXNlcnMvZGFuc2VhcmxlL1dvcmtzcGFjZS9GVC9PcmlnYW1pL28tZ2FsbGVyeS9ub2RlX21vZHVsZXMvRlRTY3JvbGxlci9saWIvZnRzY3JvbGxlci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9HYWxsZXJ5LmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL1NpbXBsZVNjcm9sbGVyLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL2dhbGxlcnlET00uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2c0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qZ2xvYmFsIHJlcXVpcmUsIGNvbnNvbGUsIHNsaWRlc2hvd0dhbGxlcnlDb25maWcsIHRodW1ibmFpbEdhbGxlcnlDb25maWcqL1xuXG52YXIgR2FsbGVyeSA9IHJlcXVpcmUoJy4vLi4vbWFpbi5qcycpO1xuXG5pZiAoZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJvR2FsbGVyeVJlYWR5XCIsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgY29uc29sZS5sb2cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHYWxsZXJ5IHJlYWR5XCIsIGV2dC5nYWxsZXJ5KTtcbiAgICAgICAgICAgIHBhcmVudCAmJiBwYXJlbnQucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZXNpemUnLFxuICAgICAgICAgICAgICAgIHVybDogbG9jYXRpb24uaHJlZixcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0XG4gICAgICAgICAgICB9KSwgJyonKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG52YXIgc2xpZGVzaG93SW1wZXJhdGl2ZSA9IG5ldyBHYWxsZXJ5KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW1wZXJhdGl2ZS1zbGlkZXNob3dcIiksIHNsaWRlc2hvd0dhbGxlcnlDb25maWcpLFxuICAgIHRodW1ibmFpbEltcGVyYXRpdmUgPSBuZXcgR2FsbGVyeShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImltcGVyYXRpdmUtdGh1bWJuYWlsc1wiKSwgdGh1bWJuYWlsR2FsbGVyeUNvbmZpZyk7XG5cbmlmICh0aHVtYm5haWxJbXBlcmF0aXZlLnN5bmNXaXRoKSB7XG4gICAgdGh1bWJuYWlsSW1wZXJhdGl2ZS5zeW5jV2l0aChzbGlkZXNob3dJbXBlcmF0aXZlKTtcbn1cbiIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2pzL0dhbGxlcnknKTsiLCIvKipcclxuICogRlRTY3JvbGxlcjogdG91Y2ggYW5kIG1vdXNlLWJhc2VkIHNjcm9sbGluZyBmb3IgRE9NIGVsZW1lbnRzIGxhcmdlciB0aGFuIHRoZWlyIGNvbnRhaW5lcnMuXHJcbiAqXHJcbiAqIFdoaWxlIHRoaXMgaXMgYSByZXdyaXRlLCBpdCBpcyBoZWF2aWx5IGluc3BpcmVkIGJ5IHR3byBwcm9qZWN0czpcclxuICogMSkgVXhlYnUgVG91Y2hTY3JvbGwgKGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGF1cmVsaW8vVG91Y2hTY3JvbGwpLCBCU0QgbGljZW5zZWQ6XHJcbiAqICAgIENvcHlyaWdodCAoYykgMjAxMCB1eGVidSBDb25zdWx0aW5nIEx0ZC4gJiBDby4gS0dcclxuICogICAgQ29weXJpZ2h0IChjKSAyMDEwIERhdmlkIEF1cmVsaW9cclxuICogMikgWnluZ2EgU2Nyb2xsZXIgKGh0dHBzOi8vZ2l0aHViLmNvbS96eW5nYS9zY3JvbGxlciksIE1JVCBsaWNlbnNlZDpcclxuICogICAgQ29weXJpZ2h0IDIwMTEsIFp5bmdhIEluYy5cclxuICogICAgQ29weXJpZ2h0IDIwMTEsIERldXRzY2hlIFRlbGVrb20gQUdcclxuICpcclxuICogSW5jbHVkZXMgQ3ViaWNCZXppZXI6XHJcbiAqXHJcbiAqIENvcHlyaWdodCAoQykgMjAwOCBBcHBsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXHJcbiAqIENvcHlyaWdodCAoQykgMjAxMCBEYXZpZCBBdXJlbGlvLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTAgdXhlYnUgQ29uc3VsdGluZyBMdGQuICYgQ28uIEtHLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKlxyXG4gKiBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXRcclxuICogbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zXHJcbiAqIGFyZSBtZXQ6XHJcbiAqIDEuIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0XHJcbiAqICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cclxuICogMi4gUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcclxuICogICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZVxyXG4gKiAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxyXG4gKlxyXG4gKiBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIEFQUExFIElOQy4sIERBVklEIEFVUkVMSU8sIEFORCBVWEVCVVxyXG4gKiBDT05TVUxUSU5HIExURC4gJiBDTy4gS0cgYGBBUyBJUycnIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEXHJcbiAqIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRCBXQVJSQU5USUVTIE9GXHJcbiAqIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQVJFIERJU0NMQUlNRUQuXHJcbiAqIElOIE5PIEVWRU5UIFNIQUxMIEFQUExFIElOQy4gT1IgQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCxcclxuICogSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXHJcbiAqIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUlxyXG4gKiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTilcclxuICogSE9XRVZFUiBDQVVTRUQgQU5EIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULFxyXG4gKiBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkdcclxuICogSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFXHJcbiAqIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxyXG4gKlxyXG4gKiBAY29weXJpZ2h0IFRoZSBGaW5hbmNpYWwgVGltZXMgTHRkIFtBbGwgcmlnaHRzIHJlc2VydmVkXVxyXG4gKiBAY29kaW5nc3RhbmRhcmQgZnRsYWJzLWpzbGludFxyXG4gKiBAdmVyc2lvbiAwLjMuMFxyXG4gKi9cclxuLyoqXHJcbiAqIEBsaWNlbnNlIEZUU2Nyb2xsZXIgaXMgKGMpIDIwMTIgVGhlIEZpbmFuY2lhbCBUaW1lcyBMdGQgW0FsbCByaWdodHMgcmVzZXJ2ZWRdIGFuZCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXHJcbiAqXHJcbiAqIEluc3BpcmVkIGJ5IFV4ZWJ1IFRvdWNoU2Nyb2xsLCAoYykgMjAxMCB1eGVidSBDb25zdWx0aW5nIEx0ZC4gJiBDby4gS0cgYW5kIERhdmlkIEF1cmVsaW8sIHdoaWNoIGlzIEJTRCBsaWNlbnNlZCAoaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkYXVyZWxpby9Ub3VjaFNjcm9sbClcclxuICogSW5zcGlyZWQgYnkgWnluZ2EgU2Nyb2xsZXIsIChjKSAyMDExIFp5bmdhIEluYyBhbmQgRGV1dHNjaGUgVGVsZWtvbSBBRywgd2hpY2ggaXMgTUlUIGxpY2Vuc2VkIChodHRwczovL2dpdGh1Yi5jb20venluZ2Evc2Nyb2xsZXIpXHJcbiAqIEluY2x1ZGVzIEN1YmljQmV6aWVyLCAoYykgMjAwOCBBcHBsZSBJbmMgW0FsbCByaWdodHMgcmVzZXJ2ZWRdLCAoYykgMjAxMCBEYXZpZCBBdXJlbGlvIGFuZCB1eGVidSBDb25zdWx0aW5nIEx0ZC4gJiBDby4gS0cuIFtBbGwgcmlnaHRzIHJlc2VydmVkXSwgd2hpY2ggaXMgMi1jbGF1c2UgQlNEIGxpY2Vuc2VkIChzZWUgYWJvdmUgb3IgaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkYXVyZWxpby9Ub3VjaFNjcm9sbCkuXHJcbiAqL1xyXG5cclxuLypqc2xpbnQgbm9tZW46IHRydWUsIHZhcnM6IHRydWUsIGJyb3dzZXI6IHRydWUsIGNvbnRpbnVlOiB0cnVlLCB3aGl0ZTogdHJ1ZSovXHJcbi8qZ2xvYmFscyBGVFNjcm9sbGVyT3B0aW9ucyovXHJcblxyXG52YXIgRlRTY3JvbGxlciwgQ3ViaWNCZXppZXI7XHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0Ly8gR2xvYmFsIGZsYWcgdG8gZGV0ZXJtaW5lIGlmIGFueSBzY3JvbGwgaXMgY3VycmVudGx5IGFjdGl2ZS4gIFRoaXMgcHJldmVudHNcclxuXHQvLyBpc3N1ZXMgd2hlbiB1c2luZyBtdWx0aXBsZSBzY3JvbGxlcnMsIHBhcnRpY3VsYXJseSB3aGVuIHRoZXkncmUgbmVzdGVkLlxyXG5cdHZhciBfZnRzY3JvbGxlck1vdmluZyA9IGZhbHNlO1xyXG5cclxuXHQvLyBEZXRlcm1pbmUgd2hldGhlciBwb2ludGVyIGV2ZW50cyBvciB0b3VjaCBldmVudHMgY2FuIGJlIHVzZWRcclxuXHR2YXIgX3RyYWNrUG9pbnRlckV2ZW50cyA9IHdpbmRvdy5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZDtcclxuXHRpZiAoJ3Byb3BlcnR5SXNFbnVtZXJhYmxlJyBpbiB3aW5kb3cgfHwgJ2hhc093blByb3BlcnR5JyBpbiB3aW5kb3cuZG9jdW1lbnQpIHtcclxuXHRcdHZhciBfdHJhY2tUb3VjaEV2ZW50cyA9ICFfdHJhY2tQb2ludGVyRXZlbnRzICYmICh3aW5kb3cucHJvcGVydHlJc0VudW1lcmFibGUoJ29udG91Y2hzdGFydCcpIHx8IHdpbmRvdy5kb2N1bWVudC5oYXNPd25Qcm9wZXJ0eSgnb250b3VjaHN0YXJ0JykpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR2YXIgX3RyYWNrVG91Y2hFdmVudHMgPSBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vIERldGVybWluZSB3aGV0aGVyIHRvIHVzZSBtb2Rlcm4gaGFyZHdhcmUgYWNjZWxlcmF0aW9uIHJ1bGVzIG9yIGR5bmFtaWMvdG9nZ2xlYWJsZSBydWxlcy5cclxuXHQvLyBDZXJ0YWluIG9sZGVyIGJyb3dzZXJzIC0gcGFydGljdWxhcmx5IEFuZHJvaWQgYnJvd3NlcnMgLSBoYXZlIHByb2JsZW1zIHdpdGggaGFyZHdhcmVcclxuXHQvLyBhY2NlbGVyYXRpb24sIHNvIGJlaW5nIGFibGUgdG8gdG9nZ2xlIHRoZSBiZWhhdmlvdXIgZHluYW1pY2FsbHkgdmlhIGEgQ1NTIGNhc2NhZGUgaXMgZGVzaXJhYmxlLlxyXG5cdGlmICgnaGFzT3duUHJvcGVydHknIGluIHdpbmRvdykge1xyXG5cdFx0dmFyIF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPSAhd2luZG93Lmhhc093blByb3BlcnR5KCdBcnJheUJ1ZmZlcicpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHR2YXIgX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiA9IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gRmVhdHVyZSBkZXRlY3Rpb25cclxuXHR2YXIgX2NhbkNsZWFyU2VsZWN0aW9uID0gKHdpbmRvdy5TZWxlY3Rpb24gJiYgd2luZG93LlNlbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQWxsUmFuZ2VzKTtcclxuXHJcblx0Ly8gRGV0ZXJtaW5lIHRoZSBicm93c2VyIGVuZ2luZSBhbmQgcHJlZml4LCB0cnlpbmcgdG8gdXNlIHRoZSB1bnByZWZpeGVkIHZlcnNpb24gd2hlcmUgYXZhaWxhYmxlLlxyXG5cdHZhciBfdmVuZG9yQ1NTUHJlZml4LCBfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCwgX3ZlbmRvclRyYW5zZm9ybUxvb2t1cDtcclxuXHRpZiAoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGUudHJhbnNmb3JtICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnJztcclxuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJyc7XHJcblx0XHRfdmVuZG9yVHJhbnNmb3JtTG9va3VwID0gJ3RyYW5zZm9ybSc7XHJcblx0fSBlbHNlIGlmICh3aW5kb3cub3BlcmEgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5vcGVyYSkgPT09ICdbb2JqZWN0IE9wZXJhXScpIHtcclxuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnLW8tJztcclxuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJ08nO1xyXG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICdPVHJhbnNmb3JtJztcclxuXHR9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5Nb3pUcmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0X3ZlbmRvckNTU1ByZWZpeCA9ICctbW96LSc7XHJcblx0XHRfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA9ICdNb3onO1xyXG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICdNb3pUcmFuc2Zvcm0nO1xyXG5cdH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLndlYmtpdFRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRfdmVuZG9yQ1NTUHJlZml4ID0gJy13ZWJraXQtJztcclxuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJ3dlYmtpdCc7XHJcblx0XHRfdmVuZG9yVHJhbnNmb3JtTG9va3VwID0gJy13ZWJraXQtdHJhbnNmb3JtJztcclxuXHR9IGVsc2UgaWYgKHR5cGVvZiBuYXZpZ2F0b3IuY3B1Q2xhc3MgPT09ICdzdHJpbmcnKSB7XHJcblx0XHRfdmVuZG9yQ1NTUHJlZml4ID0gJy1tcy0nO1xyXG5cdFx0X3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPSAnbXMnO1xyXG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICctbXMtdHJhbnNmb3JtJztcclxuXHR9XHJcblxyXG5cdC8vIElmIGhhcmR3YXJlIGFjY2VsZXJhdGlvbiBpcyB1c2luZyB0aGUgc3RhbmRhcmQgcGF0aCwgYnV0IHBlcnNwZWN0aXZlIGRvZXNuJ3Qgc2VlbSB0byBiZSBzdXBwb3J0ZWQsXHJcblx0Ly8gM0QgdHJhbnNmb3JtcyBsaWtlbHkgYXJlbid0IHN1cHBvcnRlZCBlaXRoZXJcclxuXHRpZiAoIV91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gJiYgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jykuc3R5bGVbX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggKyAoX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPyAnUCcgOiAncCcpICsgJ2Vyc3BlY3RpdmUnXSA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID0gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdC8vIFN0eWxlIHByZWZpeGVzXHJcblx0dmFyIF90cmFuc2Zvcm1Qcm9wZXJ0eSA9IF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ICsgKF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID8gJ1QnIDogJ3QnKSArICdyYW5zZm9ybSc7XHJcblx0dmFyIF90cmFuc2l0aW9uUHJvcGVydHkgPSBfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCArIChfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA/ICdUJyA6ICd0JykgKyAncmFuc2l0aW9uJztcclxuXHR2YXIgX3RyYW5zbGF0ZVJ1bGVQcmVmaXggPSBfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID8gJ3RyYW5zbGF0ZSgnIDogJ3RyYW5zbGF0ZTNkKCc7XHJcblx0dmFyIF90cmFuc2Zvcm1QcmVmaXhlcyA9IHsgeDogJycsIHk6ICcwLCcgfTtcclxuXHR2YXIgX3RyYW5zZm9ybVN1ZmZpeGVzID0geyB4OiAnLDAnICsgKF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPyAnKScgOiAnLDApJyksIHk6IChfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID8gJyknIDogJywwKScpIH07XHJcblxyXG5cdC8vIENvbnN0YW50cy4gIE5vdGUgdGhhdCB0aGUgYmV6aWVyIGN1cnZlIHNob3VsZCBiZSBjaGFuZ2VkIGFsb25nIHdpdGggdGhlIGZyaWN0aW9uIVxyXG5cdHZhciBfa0ZyaWN0aW9uID0gMC45OTg7XHJcblx0dmFyIF9rTWluaW11bVNwZWVkID0gMC4wMTtcclxuXHJcblx0Ly8gQ3JlYXRlIGEgZ2xvYmFsIHN0eWxlc2hlZXQgdG8gc2V0IHVwIHN0eWxlc2hlZXQgcnVsZXMgYW5kIHRyYWNrIGR5bmFtaWMgZW50cmllc1xyXG5cdChmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgc3R5bGVzaGVldENvbnRhaW5lck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcclxuXHRcdHZhciBuZXdTdHlsZU5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG5cdFx0dmFyIGhhcmR3YXJlQWNjZWxlcmF0aW9uUnVsZTtcclxuXHRcdHZhciBfc3R5bGVUZXh0O1xyXG5cdFx0bmV3U3R5bGVOb2RlLnR5cGUgPSAndGV4dC9jc3MnO1xyXG5cclxuXHRcdC8vIERldGVybWluZSB0aGUgaGFyZHdhcmUgYWNjZWxlcmF0aW9uIGxvZ2ljIHRvIHVzZVxyXG5cdFx0aWYgKF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24pIHtcclxuXHRcdFx0aGFyZHdhcmVBY2NlbGVyYXRpb25SdWxlID0gX3ZlbmRvckNTU1ByZWZpeCArICd0cmFuc2Zvcm0tc3R5bGU6IHByZXNlcnZlLTNkOyc7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRoYXJkd2FyZUFjY2VsZXJhdGlvblJ1bGUgPSBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zZm9ybTogdHJhbnNsYXRlWigwKTsnO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBvdXIgcnVsZXNcclxuXHRcdF9zdHlsZVRleHQgPSBbXHJcblx0XHRcdCcuZnRzY3JvbGxlcl9jb250YWluZXIgeyBvdmVyZmxvdzogaGlkZGVuOyBwb3NpdGlvbjogcmVsYXRpdmU7IG1heC1oZWlnaHQ6IDEwMCU7IC13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwKTsgLW1zLXRvdWNoLWFjdGlvbjogbm9uZSB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX2h3YWNjZWxlcmF0ZWQgeyAnICsgaGFyZHdhcmVBY2NlbGVyYXRpb25SdWxlICArICcgfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl94LCAuZnRzY3JvbGxlcl95IHsgcG9zaXRpb246IHJlbGF0aXZlOyBtaW4td2lkdGg6IDEwMCU7IG1pbi1oZWlnaHQ6IDEwMCU7IG92ZXJmbG93OiBoaWRkZW4gfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl94IHsgZGlzcGxheTogaW5saW5lLWJsb2NrIH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyIHsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgd2lkdGg6IDVweDsgaGVpZ2h0OiA1cHg7IGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSk7IC13ZWJraXQtYm9yZGVyLXJhZGl1czogM3B4OyBib3JkZXItcmFkaXVzOiA2cHg7IG9wYWNpdHk6IDA7ICcgKyBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zaXRpb246IG9wYWNpdHkgMzUwbXM7IHotaW5kZXg6IDEwOyAtd2Via2l0LWJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAtbW96LWJveC1zaXppbmc6IGNvbnRlbnQtYm94OyBib3gtc2l6aW5nOiBjb250ZW50LWJveCB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX3Njcm9sbGJhcnggeyBib3R0b206IDJweDsgbGVmdDogMnB4IH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyeSB7IHJpZ2h0OiAycHg7IHRvcDogMnB4IH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyaW5uZXIgeyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsMC41KTsgLXdlYmtpdC1ib3JkZXItcmFkaXVzOiAycHg7IGJvcmRlci1yYWRpdXM6IDRweCAvIDZweCB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX3Njcm9sbGJhci5hY3RpdmUgeyBvcGFjaXR5OiAxOyAnICsgX3ZlbmRvckNTU1ByZWZpeCArICd0cmFuc2l0aW9uOiBub25lOyAtby10cmFuc2l0aW9uOiBhbGwgMCBub25lIH0nXHJcblx0XHRdO1xyXG5cclxuXHRcdGlmIChuZXdTdHlsZU5vZGUuc3R5bGVTaGVldCkge1xyXG5cdFx0XHRuZXdTdHlsZU5vZGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gX3N0eWxlVGV4dC5qb2luKCdcXG4nKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG5ld1N0eWxlTm9kZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShfc3R5bGVUZXh0LmpvaW4oJ1xcbicpKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHRoZSBzdHlsZXNoZWV0XHJcblx0XHRzdHlsZXNoZWV0Q29udGFpbmVyTm9kZS5pbnNlcnRCZWZvcmUobmV3U3R5bGVOb2RlLCBzdHlsZXNoZWV0Q29udGFpbmVyTm9kZS5maXJzdENoaWxkKTtcclxuXHR9KCkpO1xyXG5cclxuXHQvKipcclxuXHQgKiBNYXN0ZXIgY29uc3RydWN0b3IgZm9yIHRoZSBzY3JvbGxpbmcgZnVuY3Rpb24sIGluY2x1ZGluZyB3aGljaCBlbGVtZW50IHRvXHJcblx0ICogY29uc3RydWN0IHRoZSBzY3JvbGxlciBpbiwgYW5kIGFueSBzY3JvbGxpbmcgb3B0aW9ucy5cclxuXHQgKiBOb3RlIHRoYXQgYXBwLXdpZGUgb3B0aW9ucyBjYW4gYWxzbyBiZSBzZXQgdXNpbmcgYSBnbG9iYWwgRlRTY3JvbGxlck9wdGlvbnNcclxuXHQgKiBvYmplY3QuXHJcblx0ICovXHJcblx0RlRTY3JvbGxlciA9IGZ1bmN0aW9uIChkb21Ob2RlLCBvcHRpb25zKSB7XHJcblx0XHR2YXIga2V5O1xyXG5cdFx0dmFyIGRlc3Ryb3ksIHNldFNuYXBTaXplLCBzY3JvbGxUbywgc2Nyb2xsQnksIHVwZGF0ZURpbWVuc2lvbnMsIGFkZEV2ZW50TGlzdGVuZXIsIHJlbW92ZUV2ZW50TGlzdGVuZXIsIF9zdGFydFNjcm9sbCwgX3VwZGF0ZVNjcm9sbCwgX2VuZFNjcm9sbCwgX2ZpbmFsaXplU2Nyb2xsLCBfaW50ZXJydXB0U2Nyb2xsLCBfZmxpbmdTY3JvbGwsIF9zbmFwU2Nyb2xsLCBfZ2V0U25hcFBvc2l0aW9uRm9ySW5kZXhlcywgX2dldFNuYXBJbmRleEZvclBvc2l0aW9uLCBfbGltaXRUb0JvdW5kcywgX2luaXRpYWxpemVET00sIF9leGlzdGluZ0RPTVZhbGlkLCBfZG9tQ2hhbmdlZCwgX3VwZGF0ZURpbWVuc2lvbnMsIF91cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zLCBfdXBkYXRlRWxlbWVudFBvc2l0aW9uLCBfdXBkYXRlU2VnbWVudHMsIF9zZXRBeGlzUG9zaXRpb24sIF9nZXRQb3NpdGlvbiwgX3NjaGVkdWxlQXhpc1Bvc2l0aW9uLCBfZmlyZUV2ZW50LCBfY2hpbGRGb2N1c2VkLCBfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMsIF9kaXN0YW5jZXNCZXlvbmRCb3VuZHMsIF9zdGFydEFuaW1hdGlvbiwgX3NjaGVkdWxlUmVuZGVyLCBfY2FuY2VsQW5pbWF0aW9uLCBfdG9nZ2xlRXZlbnRIYW5kbGVycywgX29uVG91Y2hTdGFydCwgX29uVG91Y2hNb3ZlLCBfb25Ub3VjaEVuZCwgX29uTW91c2VEb3duLCBfb25Nb3VzZU1vdmUsIF9vbk1vdXNlVXAsIF9vblBvaW50ZXJEb3duLCBfb25Qb2ludGVyTW92ZSwgX29uUG9pbnRlclVwLCBfb25Qb2ludGVyQ2FuY2VsLCBfb25Qb2ludGVyQ2FwdHVyZUVuZCwgX29uQ2xpY2ssIF9vbk1vdXNlU2Nyb2xsLCBfY2FwdHVyZUlucHV0LCBfcmVsZWFzZUlucHV0Q2FwdHVyZSwgX2dldEJvdW5kaW5nUmVjdDtcclxuXHJcblxyXG5cdFx0LyogTm90ZSB0aGF0IGFjdHVhbCBvYmplY3QgaW5zdGFudGlhdGlvbiBvY2N1cnMgYXQgdGhlIGVuZCBvZiB0aGUgY2xvc3VyZSB0byBhdm9pZCBqc2xpbnQgZXJyb3JzICovXHJcblxyXG5cclxuXHRcdC8qICAgICAgICAgICAgICAgICAgICAgICAgIE9wdGlvbnMgICAgICAgICAgICAgICAgICAgICAgICovXHJcblxyXG5cdFx0dmFyIF9pbnN0YW5jZU9wdGlvbnMgPSB7XHJcblxyXG5cdFx0XHQvLyBXaGV0aGVyIHRvIGRpc3BsYXkgc2Nyb2xsYmFycyBhcyBhcHByb3ByaWF0ZVxyXG5cdFx0XHRzY3JvbGxiYXJzOiB0cnVlLFxyXG5cclxuXHRcdFx0Ly8gRW5hYmxlIHNjcm9sbGluZyBvbiB0aGUgWCBheGlzIGlmIGNvbnRlbnQgaXMgYXZhaWxhYmxlXHJcblx0XHRcdHNjcm9sbGluZ1g6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBFbmFibGUgc2Nyb2xsaW5nIG9uIHRoZSBZIGF4aXMgaWYgY29udGVudCBpcyBhdmFpbGFibGVcclxuXHRcdFx0c2Nyb2xsaW5nWTogdHJ1ZSxcclxuXHJcblx0XHRcdC8vIFRoZSBpbml0aWFsIG1vdmVtZW50IHJlcXVpcmVkIHRvIHRyaWdnZXIgYSBzY3JvbGwsIGluIHBpeGVsczsgdGhpcyBpcyB0aGUgcG9pbnQgYXQgd2hpY2hcclxuXHRcdFx0Ly8gdGhlIHNjcm9sbCBpcyBleGNsdXNpdmUgdG8gdGhpcyBwYXJ0aWN1bGFyIEZUU2Nyb2xsZXIgaW5zdGFuY2UuXHJcblx0XHRcdHNjcm9sbEJvdW5kYXJ5OiAxLFxyXG5cclxuXHRcdFx0Ly8gVGhlIGluaXRpYWwgbW92ZW1lbnQgcmVxdWlyZWQgdG8gdHJpZ2dlciBhIHZpc3VhbCBpbmRpY2F0aW9uIHRoYXQgc2Nyb2xsaW5nIGlzIG9jY3VycmluZyxcclxuXHRcdFx0Ly8gaW4gcGl4ZWxzLiAgVGhpcyBpcyBlbmZvcmNlZCB0byBiZSBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gdGhlIHNjcm9sbEJvdW5kYXJ5LCBhbmQgaXMgdXNlZCB0b1xyXG5cdFx0XHQvLyBkZWZpbmUgd2hlbiB0aGUgc2Nyb2xsZXIgc3RhcnRzIGRyYXdpbmcgY2hhbmdlcyBpbiByZXNwb25zZSB0byBhbiBpbnB1dCwgZXZlbiBpZiB0aGUgc2Nyb2xsXHJcblx0XHRcdC8vIGlzIG5vdCB0cmVhdGVkIGFzIGhhdmluZyBiZWd1bi9sb2NrZWQgeWV0LlxyXG5cdFx0XHRzY3JvbGxSZXNwb25zZUJvdW5kYXJ5OiAxLFxyXG5cclxuXHRcdFx0Ly8gV2hldGhlciB0byBhbHdheXMgZW5hYmxlIHNjcm9sbGluZywgZXZlbiBpZiB0aGUgY29udGVudCBvZiB0aGUgc2Nyb2xsZXIgZG9lcyBub3RcclxuXHRcdFx0Ly8gcmVxdWlyZSB0aGUgc2Nyb2xsZXIgdG8gZnVuY3Rpb24uICBUaGlzIG1ha2VzIHRoZSBzY3JvbGxlciBiZWhhdmUgbW9yZSBsaWtlIGFuXHJcblx0XHRcdC8vIGVsZW1lbnQgc2V0IHRvIFwib3ZlcmZsb3c6IHNjcm9sbFwiLCB3aXRoIGJvdW5jaW5nIGFsd2F5cyBvY2N1cnJpbmcgaWYgZW5hYmxlZC5cclxuXHRcdFx0YWx3YXlzU2Nyb2xsOiBmYWxzZSxcclxuXHJcblx0XHRcdC8vIFRoZSBjb250ZW50IHdpZHRoIHRvIHVzZSB3aGVuIGRldGVybWluaW5nIHNjcm9sbGVyIGRpbWVuc2lvbnMuICBJZiB0aGlzXHJcblx0XHRcdC8vIGlzIGZhbHNlLCB0aGUgd2lkdGggd2lsbCBiZSBkZXRlY3RlZCBiYXNlZCBvbiB0aGUgYWN0dWFsIGNvbnRlbnQuXHJcblx0XHRcdGNvbnRlbnRXaWR0aDogdW5kZWZpbmVkLFxyXG5cclxuXHRcdFx0Ly8gVGhlIGNvbnRlbnQgaGVpZ2h0IHRvIHVzZSB3aGVuIGRldGVybWluaW5nIHNjcm9sbGVyIGRpbWVuc2lvbnMuICBJZiB0aGlzXHJcblx0XHRcdC8vIGlzIGZhbHNlLCB0aGUgaGVpZ2h0IHdpbGwgYmUgZGV0ZWN0ZWQgYmFzZWQgb24gdGhlIGFjdHVhbCBjb250ZW50LlxyXG5cdFx0XHRjb250ZW50SGVpZ2h0OiB1bmRlZmluZWQsXHJcblxyXG5cdFx0XHQvLyBFbmFibGUgc25hcHBpbmcgb2YgY29udGVudCB0byAncGFnZXMnIG9yIGEgcGl4ZWwgZ3JpZFxyXG5cdFx0XHRzbmFwcGluZzogZmFsc2UsXHJcblxyXG5cdFx0XHQvLyBEZWZpbmUgdGhlIGhvcml6b250YWwgaW50ZXJ2YWwgb2YgdGhlIHBpeGVsIGdyaWQ7IHNuYXBwaW5nIG11c3QgYmUgZW5hYmxlZCBmb3IgdGhpcyB0b1xyXG5cdFx0XHQvLyB0YWtlIGVmZmVjdC4gIElmIHRoaXMgaXMgbm90IGRlZmluZWQsIHNuYXBwaW5nIHdpbGwgdXNlIGludGVydmFscyBiYXNlZCBvbiBjb250YWluZXIgc2l6ZS5cclxuXHRcdFx0c25hcFNpemVYOiB1bmRlZmluZWQsXHJcblxyXG5cdFx0XHQvLyBEZWZpbmUgdGhlIHZlcnRpY2FsIGludGVydmFsIG9mIHRoZSBwaXhlbCBncmlkOyBzbmFwcGluZyBtdXN0IGJlIGVuYWJsZWQgZm9yIHRoaXMgdG9cclxuXHRcdFx0Ly8gdGFrZSBlZmZlY3QuICBJZiB0aGlzIGlzIG5vdCBkZWZpbmVkLCBzbmFwcGluZyB3aWxsIHVzZSBpbnRlcnZhbHMgYmFzZWQgb24gY29udGFpbmVyIHNpemUuXHJcblx0XHRcdHNuYXBTaXplWTogdW5kZWZpbmVkLFxyXG5cclxuXHRcdFx0Ly8gQ29udHJvbCB3aGV0aGVyIHNuYXBwaW5nIHNob3VsZCBiZSBmdWxseSBwYWdpbmF0ZWQsIG9ubHkgZXZlciBmbGlja2luZyB0byB0aGUgbmV4dCBwYWdlXHJcblx0XHRcdC8vIGFuZCBub3QgYmV5b25kLiAgU25hcHBpbmcgbmVlZHMgdG8gYmUgZW5hYmxlZCBmb3IgdGhpcyB0byB0YWtlIGVmZmVjdC5cclxuXHRcdFx0cGFnaW5hdGVkU25hcDogZmFsc2UsXHJcblxyXG5cdFx0XHQvLyBBbGxvdyBzY3JvbGwgYm91bmNpbmcgYW5kIGVsYXN0aWNpdHkgbmVhciB0aGUgZW5kcyBhbmQgZ3JpZFxyXG5cdFx0XHRib3VuY2luZzogdHJ1ZSxcclxuXHJcblx0XHRcdC8vIEFsbG93IGEgZmFzdCBzY3JvbGwgdG8gY29udGludWUgd2l0aCBtb21lbnR1bSB3aGVuIHJlbGVhc2VkXHJcblx0XHRcdGZsaW5naW5nOiB0cnVlLFxyXG5cclxuXHRcdFx0Ly8gQXV0b21hdGljYWxseSBkZXRlY3RzIGNoYW5nZXMgdG8gdGhlIGNvbnRhaW5lZCBtYXJrdXAgYW5kXHJcblx0XHRcdC8vIHVwZGF0ZXMgaXRzIGRpbWVuc2lvbnMgd2hlbmV2ZXIgdGhlIGNvbnRlbnQgY2hhbmdlcy4gVGhpcyBpc1xyXG5cdFx0XHQvLyBzZXQgdG8gZmFsc2UgaWYgYSBjb250ZW50V2lkdGggb3IgY29udGVudEhlaWdodCBhcmUgc3VwcGxpZWQuXHJcblx0XHRcdHVwZGF0ZU9uQ2hhbmdlczogdHJ1ZSxcclxuXHJcblx0XHRcdC8vIEF1dG9tYXRpY2FsbHkgY2F0Y2hlcyBjaGFuZ2VzIHRvIHRoZSB3aW5kb3cgc2l6ZSBhbmQgdXBkYXRlc1xyXG5cdFx0XHQvLyBpdHMgZGltZW5zaW9ucy5cclxuXHRcdFx0dXBkYXRlT25XaW5kb3dSZXNpemU6IGZhbHNlLFxyXG5cclxuXHRcdFx0Ly8gVGhlIGFsaWdubWVudCB0byB1c2UgaWYgdGhlIGNvbnRlbnQgaXMgc21hbGxlciB0aGFuIHRoZSBjb250YWluZXI7XHJcblx0XHRcdC8vIHRoaXMgYWxzbyBhcHBsaWVzIHRvIGluaXRpYWwgcG9zaXRpb25pbmcgb2Ygc2Nyb2xsYWJsZSBjb250ZW50LlxyXG5cdFx0XHQvLyBWYWxpZCBhbGlnbm1lbnRzIGFyZSAtMSAodG9wIG9yIGxlZnQpLCAwIChjZW50ZXIpLCBhbmQgMSAoYm90dG9tIG9yIHJpZ2h0KS5cclxuXHRcdFx0YmFzZUFsaWdubWVudHM6IHsgeDogLTEsIHk6IC0xIH0sXHJcblxyXG5cdFx0XHQvLyBXaGV0aGVyIHRvIHVzZSBhIHdpbmRvdyBzY3JvbGwgZmxhZywgZWcgd2luZG93LmZvbywgdG8gY29udHJvbCB3aGV0aGVyXHJcblx0XHRcdC8vIHRvIGFsbG93IHNjcm9sbGluZyB0byBzdGFydCBvciBub3cuICBJZiB0aGUgd2luZG93IGZsYWcgaXMgc2V0IHRvIHRydWUsXHJcblx0XHRcdC8vIHRoaXMgZWxlbWVudCB3aWxsIG5vdCBzdGFydCBzY3JvbGxpbmc7IHRoaXMgZWxlbWVudCB3aWxsIGFsc28gdG9nZ2xlXHJcblx0XHRcdC8vIHRoZSB2YXJpYWJsZSB3aGlsZSBzY3JvbGxpbmdcclxuXHRcdFx0d2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZzogdW5kZWZpbmVkLFxyXG5cclxuXHRcdFx0Ly8gSW5zdGVhZCBvZiBhbHdheXMgdXNpbmcgdHJhbnNsYXRlM2QgZm9yIHRyYW5zZm9ybXMsIGEgbWl4IG9mIHRyYW5zbGF0ZTNkXHJcblx0XHRcdC8vIGFuZCB0cmFuc2xhdGUgd2l0aCBhIGhhcmR3YXJlIGFjY2VsZXJhdGlvbiBjbGFzcyB1c2VkIHRvIHRyaWdnZXIgYWNjZWxlcmF0aW9uXHJcblx0XHRcdC8vIGlzIHVzZWQ7IHRoaXMgaXMgdG8gYWxsb3cgQ1NTIGluaGVyaXRhbmNlIHRvIGJlIHVzZWQgdG8gYWxsb3cgZHluYW1pY1xyXG5cdFx0XHQvLyBkaXNhYmxpbmcgb2YgYmFja2luZyBsYXllcnMgb24gb2xkZXIgcGxhdGZvcm1zLlxyXG5cdFx0XHRod0FjY2VsZXJhdGlvbkNsYXNzOiAnZnRzY3JvbGxlcl9od2FjY2VsZXJhdGVkJyxcclxuXHJcblx0XHRcdC8vIFdoaWxlIHVzZSBvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgaXMgaGlnaGx5IHJlY29tbWVuZGVkIG9uIHBsYXRmb3Jtc1xyXG5cdFx0XHQvLyB3aGljaCBzdXBwb3J0IGl0LCBpdCBjYW4gcmVzdWx0IGluIHRoZSBhbmltYXRpb24gYmVpbmcgYSBmdXJ0aGVyIGhhbGYtZnJhbWVcclxuXHRcdFx0Ly8gYmVoaW5kIHRoZSBpbnB1dCBtZXRob2QsIGluY3JlYXNpbmcgcGVyY2VpdmVkIGxhZyBzbGlnaHRseS4gIFRvIGRpc2FibGUgdGhpcyxcclxuXHRcdFx0Ly8gc2V0IHRoaXMgcHJvcGVydHkgdG8gZmFsc2UuXHJcblx0XHRcdGVuYWJsZVJlcXVlc3RBbmltYXRpb25GcmFtZVN1cHBvcnQ6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBTZXQgdGhlIG1heGltdW0gdGltZSAobXMpIHRoYXQgYSBmbGluZyBjYW4gdGFrZSB0byBjb21wbGV0ZTsgaWZcclxuXHRcdFx0Ly8gdGhpcyBpcyBub3Qgc2V0LCBmbGluZ3Mgd2lsbCBjb21wbGV0ZSBpbnN0YW50bHlcclxuXHRcdFx0bWF4RmxpbmdEdXJhdGlvbjogMTAwMCxcclxuXHJcblx0XHRcdC8vIFdoZXRoZXIgdG8gZGlzYWJsZSBhbnkgaW5wdXQgbWV0aG9kczsgb24gc29tZSBtdWx0aS1pbnB1dCBkZXZpY2VzXHJcblx0XHRcdC8vIGN1c3RvbSBiZWhhdmlvdXIgbWF5IGJlIGRlc2lyZWQgZm9yIHNvbWUgc2Nyb2xsZXJzLiAgVXNlIHdpdGggY2FyZSFcclxuXHRcdFx0ZGlzYWJsZWRJbnB1dE1ldGhvZHM6IHtcclxuXHRcdFx0XHRtb3VzZTogZmFsc2UsXHJcblx0XHRcdFx0dG91Y2g6IGZhbHNlLFxyXG5cdFx0XHRcdHNjcm9sbDogZmFsc2VcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcdC8vIERlZmluZSBhIHNjcm9sbGluZyBjbGFzcyB0byBiZSBhZGRlZCB0byB0aGUgc2Nyb2xsZXIgY29udGFpbmVyXHJcblx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nIGlzIGFjdGl2ZS4gIE5vdGUgdGhhdCB0aGlzIGNhbiBjYXVzZSBhIHJlbGF5b3V0IG9uXHJcblx0XHRcdC8vIHNjcm9sbCBzdGFydCBpZiBkZWZpbmVkLCBidXQgYWxsb3dzIGN1c3RvbSBzdHlsaW5nIGluIHJlc3BvbnNlIHRvIHNjcm9sbHNcclxuXHRcdFx0c2Nyb2xsaW5nQ2xhc3NOYW1lOiB1bmRlZmluZWQsXHJcblxyXG5cdFx0XHQvLyBCZXppZXIgY3VydmVzIGRlZmluaW5nIHRoZSBmZWVsIG9mIHRoZSBmbGluZyAobW9tZW50dW0pIGRlY2VsZXJhdGlvbixcclxuXHRcdFx0Ly8gdGhlIGJvdW5jZSBkZWNsZXJhdGlvbiBkZWNlbGVyYXRpb24gKGFzIGEgZmxpbmcgZXhjZWVkcyB0aGUgYm91bmRzKSxcclxuXHRcdFx0Ly8gYW5kIHRoZSBib3VuY2UgYmV6aWVyICh1c2VkIGZvciBib3VuY2luZyBiYWNrKS5cclxuXHRcdFx0ZmxpbmdCZXppZXI6IG5ldyBDdWJpY0JlemllcigwLjEwMywgMC4zODksIDAuMzA3LCAwLjk2NiksXHJcblx0XHRcdGJvdW5jZURlY2VsZXJhdGlvbkJlemllcjogbmV3IEN1YmljQmV6aWVyKDAsIDAuNSwgMC41LCAxKSxcclxuXHRcdFx0Ym91bmNlQmV6aWVyOiBuZXcgQ3ViaWNCZXppZXIoMC43LCAwLCAwLjksIDAuNilcclxuXHRcdH07XHJcblxyXG5cclxuXHRcdC8qICAgICAgICAgICAgICAgICAgICAgTG9jYWwgdmFyaWFibGVzICAgICAgICAgICAgICAgICAgICovXHJcblxyXG5cdFx0Ly8gQ2FjaGUgdGhlIERPTSBub2RlIGFuZCBzZXQgdXAgdmFyaWFibGVzIGZvciBvdGhlciBub2Rlc1xyXG5cdFx0dmFyIF9wdWJsaWNTZWxmO1xyXG5cdFx0dmFyIF9zZWxmID0gdGhpcztcclxuXHRcdHZhciBfc2Nyb2xsYWJsZU1hc3Rlck5vZGUgPSBkb21Ob2RlO1xyXG5cdFx0dmFyIF9jb250YWluZXJOb2RlO1xyXG5cdFx0dmFyIF9jb250ZW50UGFyZW50Tm9kZTtcclxuXHRcdHZhciBfc2Nyb2xsTm9kZXMgPSB7IHg6IG51bGwsIHk6IG51bGwgfTtcclxuXHRcdHZhciBfc2Nyb2xsYmFyTm9kZXMgPSB7IHg6IG51bGwsIHk6IG51bGwgfTtcclxuXHJcblx0XHQvLyBEaW1lbnNpb25zIG9mIHRoZSBjb250YWluZXIgZWxlbWVudCBhbmQgdGhlIGNvbnRlbnQgZWxlbWVudFxyXG5cdFx0dmFyIF9tZXRyaWNzID0ge1xyXG5cdFx0XHRjb250YWluZXI6IHsgeDogbnVsbCwgeTogbnVsbCB9LFxyXG5cdFx0XHRjb250ZW50OiB7IHg6IG51bGwsIHk6IG51bGwsIHJhd1g6IG51bGwsIHJhd1k6IG51bGwgfSxcclxuXHRcdFx0c2Nyb2xsRW5kOiB7IHg6IG51bGwsIHk6IG51bGwgfVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBTbmFwcGluZyBkZXRhaWxzXHJcblx0XHR2YXIgX3NuYXBHcmlkU2l6ZSA9IHtcclxuXHRcdFx0eDogZmFsc2UsXHJcblx0XHRcdHk6IGZhbHNlLFxyXG5cdFx0XHR1c2VyWDogZmFsc2UsXHJcblx0XHRcdHVzZXJZOiBmYWxzZVxyXG5cdFx0fTtcclxuXHRcdHZhciBfc25hcEluZGV4ID0ge1xyXG5cdFx0XHR4OiAwLFxyXG5cdFx0XHR5OiAwXHJcblx0XHR9O1xyXG5cdFx0dmFyIF9iYXNlU2VnbWVudCA9IHsgeDogMCwgeTogMCB9O1xyXG5cdFx0dmFyIF9hY3RpdmVTZWdtZW50ID0geyB4OiAwLCB5OiAwIH07XHJcblxyXG5cdFx0Ly8gVHJhY2sgdGhlIGlkZW50aWZpZXIgb2YgYW55IGlucHV0IGJlaW5nIHRyYWNrZWRcclxuXHRcdHZhciBfaW5wdXRJZGVudGlmaWVyID0gZmFsc2U7XHJcblx0XHR2YXIgX2lucHV0SW5kZXggPSAwO1xyXG5cdFx0dmFyIF9pbnB1dENhcHR1cmVkID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gQ3VycmVudCBzY3JvbGwgcG9zaXRpb25zIGFuZCB0cmFja2luZ1xyXG5cdFx0dmFyIF9pc1Njcm9sbGluZyA9IGZhbHNlO1xyXG5cdFx0dmFyIF9pc0Rpc3BsYXlpbmdTY3JvbGwgPSBmYWxzZTtcclxuXHRcdHZhciBfaXNBbmltYXRpbmcgPSBmYWxzZTtcclxuXHRcdHZhciBfYmFzZVNjcm9sbFBvc2l0aW9uID0geyB4OiAwLCB5OiAwIH07XHJcblx0XHR2YXIgX2xhc3RTY3JvbGxQb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xyXG5cdFx0dmFyIF90YXJnZXRTY3JvbGxQb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xyXG5cdFx0dmFyIF9zY3JvbGxBdEV4dHJlbWl0eSA9IHsgeDogbnVsbCwgeTogbnVsbCB9O1xyXG5cdFx0dmFyIF9wcmV2ZW50Q2xpY2sgPSBmYWxzZTtcclxuXHRcdHZhciBfdGltZW91dHMgPSBbXTtcclxuXHRcdHZhciBfaGFzQmVlblNjcm9sbGVkID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gR2VzdHVyZSBkZXRhaWxzXHJcblx0XHR2YXIgX2Jhc2VTY3JvbGxhYmxlQXhlcyA9IHt9O1xyXG5cdFx0dmFyIF9zY3JvbGxhYmxlQXhlcyA9IHsgeDogdHJ1ZSwgeTogdHJ1ZSB9O1xyXG5cdFx0dmFyIF9nZXN0dXJlU3RhcnQgPSB7IHg6IDAsIHk6IDAsIHQ6IDAgfTtcclxuXHRcdHZhciBfY3VtdWxhdGl2ZVNjcm9sbCA9IHsgeDogMCwgeTogMCB9O1xyXG5cdFx0dmFyIF9ldmVudEhpc3RvcnkgPSBbXTtcclxuXHJcblx0XHQvLyBBbGxvdyBjZXJ0YWluIGV2ZW50cyB0byBiZSBkZWJvdW5jZWRcclxuXHRcdHZhciBfZG9tQ2hhbmdlRGVib3VuY2VyID0gZmFsc2U7XHJcblx0XHR2YXIgX3Njcm9sbFdoZWVsRW5kRGVib3VuY2VyID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gUGVyZm9ybWFuY2Ugc3dpdGNoZXMgb24gYnJvd3NlcnMgc3VwcG9ydGluZyByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcclxuXHRcdHZhciBfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gZmFsc2U7XHJcblx0XHR2YXIgX3JlcUFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IGZhbHNlO1xyXG5cdFx0dmFyIF9jYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cuY2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubW96Q2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0Q2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBmYWxzZTtcclxuXHJcblx0XHQvLyBFdmVudCBsaXN0ZW5lcnNcclxuXHRcdHZhciBfZXZlbnRMaXN0ZW5lcnMgPSB7XHJcblx0XHRcdCdzY3JvbGxzdGFydCc6IFtdLFxyXG5cdFx0XHQnc2Nyb2xsJzogW10sXHJcblx0XHRcdCdzY3JvbGxlbmQnOiBbXSxcclxuXHRcdFx0J3NlZ21lbnR3aWxsY2hhbmdlJzogW10sXHJcblx0XHRcdCdzZWdtZW50ZGlkY2hhbmdlJzogW10sXHJcblx0XHRcdCdyZWFjaGVkc3RhcnQnOiBbXSxcclxuXHRcdFx0J3JlYWNoZWRlbmQnOiBbXSxcclxuXHRcdFx0J3Njcm9sbGludGVyYWN0aW9uZW5kJzogW11cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gTXV0YXRpb25PYnNlcnZlciBpbnN0YW5jZSwgd2hlbiBzdXBwb3J0ZWQgYW5kIGlmIERPTSBjaGFuZ2Ugc25pZmZpbmcgaXMgZW5hYmxlZFxyXG5cdFx0dmFyIF9tdXRhdGlvbk9ic2VydmVyO1xyXG5cclxuXHJcblx0XHQvKiBQYXJzaW5nIHN1cHBsaWVkIG9wdGlvbnMgKi9cclxuXHJcblx0XHQvLyBPdmVycmlkZSBkZWZhdWx0IGluc3RhbmNlIG9wdGlvbnMgd2l0aCBnbG9iYWwgLSBvciBjbG9zdXJlJ2QgLSBvcHRpb25zXHJcblx0XHRpZiAodHlwZW9mIEZUU2Nyb2xsZXJPcHRpb25zID09PSAnb2JqZWN0JyAmJiBGVFNjcm9sbGVyT3B0aW9ucykge1xyXG5cdFx0XHRmb3IgKGtleSBpbiBGVFNjcm9sbGVyT3B0aW9ucykge1xyXG5cdFx0XHRcdGlmIChGVFNjcm9sbGVyT3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIF9pbnN0YW5jZU9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRcdFx0X2luc3RhbmNlT3B0aW9uc1trZXldID0gRlRTY3JvbGxlck9wdGlvbnNba2V5XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBPdmVycmlkZSBkZWZhdWx0IGFuZCBnbG9iYWwgb3B0aW9ucyB3aXRoIHN1cHBsaWVkIG9wdGlvbnNcclxuXHRcdGlmIChvcHRpb25zKSB7XHJcblx0XHRcdGZvciAoa2V5IGluIG9wdGlvbnMpIHtcclxuXHRcdFx0XHRpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIF9pbnN0YW5jZU9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRcdFx0X2luc3RhbmNlT3B0aW9uc1trZXldID0gb3B0aW9uc1trZXldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgc25hcCBncmlkIHNpemUgb3B0aW9ucyB3ZXJlIHN1cHBsaWVkLCBzdG9yZSB0aGVtXHJcblx0XHRcdGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KCdzbmFwU2l6ZVgnKSAmJiAhaXNOYU4ob3B0aW9ucy5zbmFwU2l6ZVgpKSB7XHJcblx0XHRcdFx0X3NuYXBHcmlkU2l6ZS51c2VyWCA9IF9zbmFwR3JpZFNpemUueCA9IG9wdGlvbnMuc25hcFNpemVYO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KCdzbmFwU2l6ZVknKSAmJiAhaXNOYU4ob3B0aW9ucy5zbmFwU2l6ZVkpKSB7XHJcblx0XHRcdFx0X3NuYXBHcmlkU2l6ZS51c2VyWSA9IF9zbmFwR3JpZFNpemUueSA9IG9wdGlvbnMuc25hcFNpemVZO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBjb250ZW50IHdpZHRoIGFuZCBoZWlnaHQgd2VyZSBkZWZpbmVkLCBkaXNhYmxlIHVwZGF0ZU9uQ2hhbmdlcyBmb3IgcGVyZm9ybWFuY2VcclxuXHRcdFx0aWYgKG9wdGlvbnMuY29udGVudFdpZHRoICYmIG9wdGlvbnMuY29udGVudEhlaWdodCkge1xyXG5cdFx0XHRcdG9wdGlvbnMudXBkYXRlT25DaGFuZ2VzID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBWYWxpZGF0ZSB0aGUgc2Nyb2xsIHJlc3BvbnNlIHBhcmFtZXRlclxyXG5cdFx0X2luc3RhbmNlT3B0aW9ucy5zY3JvbGxSZXNwb25zZUJvdW5kYXJ5ID0gTWF0aC5taW4oX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxCb3VuZGFyeSwgX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxSZXNwb25zZUJvdW5kYXJ5KTtcclxuXHJcblx0XHQvLyBVcGRhdGUgYmFzZSBzY3JvbGxhYmxlIGF4ZXNcclxuXHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1gpIHtcclxuXHRcdFx0X2Jhc2VTY3JvbGxhYmxlQXhlcy54ID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kpIHtcclxuXHRcdFx0X2Jhc2VTY3JvbGxhYmxlQXhlcy55ID0gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPbmx5IGVuYWJsZSBhbmltYXRpb24gZnJhbWUgc3VwcG9ydCBpZiB0aGUgaW5zdGFuY2Ugb3B0aW9ucyBwZXJtaXQgaXRcclxuXHRcdF9yZXFBbmltYXRpb25GcmFtZSA9IF9pbnN0YW5jZU9wdGlvbnMuZW5hYmxlUmVxdWVzdEFuaW1hdGlvbkZyYW1lU3VwcG9ydCAmJiBfcmVxQW5pbWF0aW9uRnJhbWU7XHJcblx0XHRfY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBfcmVxQW5pbWF0aW9uRnJhbWUgJiYgX2NhbmNlbEFuaW1hdGlvbkZyYW1lO1xyXG5cclxuXHJcblx0XHQvKiAgICAgICAgICAgICAgICAgICAgU2NvcGVkIEZ1bmN0aW9ucyAgICAgICAgICAgICAgICAgICAqL1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogVW5iaW5kcyBhbGwgZXZlbnQgbGlzdGVuZXJzIHRvIHByZXZlbnQgY2lyY3VsYXIgcmVmZXJlbmNlcyBwcmV2ZW50aW5nIGl0ZW1zXHJcblx0XHQgKiBmcm9tIGJlaW5nIGRlYWxsb2NhdGVkLCBhbmQgY2xlYW4gdXAgcmVmZXJlbmNlcyB0byBkb20gZWxlbWVudHMuIFBhc3MgaW5cclxuXHRcdCAqIFwicmVtb3ZlRWxlbWVudHNcIiB0byBhbHNvIHJlbW92ZSBGVFNjcm9sbGVyIERPTSBlbGVtZW50cyBmb3Igc3BlY2lhbCByZXVzZSBjYXNlcy5cclxuXHRcdCAqL1xyXG5cdFx0ZGVzdHJveSA9IGZ1bmN0aW9uIGRlc3Ryb3kocmVtb3ZlRWxlbWVudHMpIHtcclxuXHRcdFx0dmFyIGksIGw7XHJcblxyXG5cdFx0XHRfdG9nZ2xlRXZlbnRIYW5kbGVycyhmYWxzZSk7XHJcblx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcclxuXHRcdFx0aWYgKF9kb21DaGFuZ2VEZWJvdW5jZXIpIHtcclxuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF9kb21DaGFuZ2VEZWJvdW5jZXIpO1xyXG5cdFx0XHRcdF9kb21DaGFuZ2VEZWJvdW5jZXIgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gX3RpbWVvdXRzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX3RpbWVvdXRzW2ldKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRfdGltZW91dHMubGVuZ3RoID0gMDtcclxuXHJcblx0XHRcdC8vIERlc3Ryb3kgRE9NIGVsZW1lbnRzIGlmIHJlcXVpcmVkXHJcblx0XHRcdGlmIChyZW1vdmVFbGVtZW50cyAmJiBfc2Nyb2xsYWJsZU1hc3Rlck5vZGUpIHtcclxuXHRcdFx0XHR3aGlsZSAoX2NvbnRlbnRQYXJlbnROb2RlLmZpcnN0Q2hpbGQpIHtcclxuXHRcdFx0XHRcdF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5hcHBlbmRDaGlsZChfY29udGVudFBhcmVudE5vZGUuZmlyc3RDaGlsZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5yZW1vdmVDaGlsZChfY29udGFpbmVyTm9kZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF9zY3JvbGxhYmxlTWFzdGVyTm9kZSA9IG51bGw7XHJcblx0XHRcdF9jb250YWluZXJOb2RlID0gbnVsbDtcclxuXHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlID0gbnVsbDtcclxuXHRcdFx0X3Njcm9sbE5vZGVzLnggPSBudWxsO1xyXG5cdFx0XHRfc2Nyb2xsTm9kZXMueSA9IG51bGw7XHJcblx0XHRcdF9zY3JvbGxiYXJOb2Rlcy54ID0gbnVsbDtcclxuXHRcdFx0X3Njcm9sbGJhck5vZGVzLnkgPSBudWxsO1xyXG5cdFx0XHRmb3IgKGkgaW4gX2V2ZW50TGlzdGVuZXJzKSB7XHJcblx0XHRcdFx0aWYgKF9ldmVudExpc3RlbmVycy5oYXNPd25Qcm9wZXJ0eShpKSkge1xyXG5cdFx0XHRcdFx0X2V2ZW50TGlzdGVuZXJzW2ldLmxlbmd0aCA9IDA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB0aGlzIGlzIGN1cnJlbnRseSB0cmFja2VkIGFzIGEgc2Nyb2xsaW5nIGluc3RhbmNlLCBjbGVhciB0aGUgZmxhZ1xyXG5cdFx0XHRpZiAoX2Z0c2Nyb2xsZXJNb3ZpbmcgJiYgX2Z0c2Nyb2xsZXJNb3ZpbmcgPT09IF9zZWxmKSB7XHJcblx0XHRcdFx0X2Z0c2Nyb2xsZXJNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnKSB7XHJcblx0XHRcdFx0XHR3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIENvbmZpZ3VyZXMgdGhlIHNuYXBwaW5nIGJvdW5kYXJpZXMgd2l0aGluIHRoZSBzY3JvbGxpbmcgZWxlbWVudCBpZlxyXG5cdFx0ICogc25hcHBpbmcgaXMgYWN0aXZlLiAgSWYgdGhpcyBpcyBuZXZlciBjYWxsZWQsIHNuYXBwaW5nIGRlZmF1bHRzIHRvXHJcblx0XHQgKiB1c2luZyB0aGUgYm91bmRpbmcgYm94LCBlZyBwYWdlLWF0LWEtdGltZS5cclxuXHRcdCAqL1xyXG5cdFx0c2V0U25hcFNpemUgPSBmdW5jdGlvbiBzZXRTbmFwU2l6ZSh3aWR0aCwgaGVpZ2h0KSB7XHJcblx0XHRcdF9zbmFwR3JpZFNpemUudXNlclggPSB3aWR0aDtcclxuXHRcdFx0X3NuYXBHcmlkU2l6ZS51c2VyWSA9IGhlaWdodDtcclxuXHRcdFx0X3NuYXBHcmlkU2l6ZS54ID0gd2lkdGg7XHJcblx0XHRcdF9zbmFwR3JpZFNpemUueSA9IGhlaWdodDtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSB0aGUgY29udGVudCBkaW1lbnNpb25zIGNvbmZvcm0gdG8gdGhlIGdyaWRcclxuXHRcdFx0X21ldHJpY3MuY29udGVudC54ID0gTWF0aC5jZWlsKF9tZXRyaWNzLmNvbnRlbnQucmF3WCAvIHdpZHRoKSAqIHdpZHRoO1xyXG5cdFx0XHRfbWV0cmljcy5jb250ZW50LnkgPSBNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudC5yYXdZIC8gaGVpZ2h0KSAqIGhlaWdodDtcclxuXHRcdFx0X21ldHJpY3Muc2Nyb2xsRW5kLnggPSBfbWV0cmljcy5jb250YWluZXIueCAtIF9tZXRyaWNzLmNvbnRlbnQueDtcclxuXHRcdFx0X21ldHJpY3Muc2Nyb2xsRW5kLnkgPSBfbWV0cmljcy5jb250YWluZXIueSAtIF9tZXRyaWNzLmNvbnRlbnQueTtcclxuXHRcdFx0X3VwZGF0ZVNjcm9sbGJhckRpbWVuc2lvbnMoKTtcclxuXHJcblx0XHRcdC8vIFNuYXAgdG8gdGhlIG5ldyBncmlkIGlmIG5lY2Vzc2FyeVxyXG5cdFx0XHRfc25hcFNjcm9sbCgpO1xyXG5cdFx0XHRfdXBkYXRlU2VnbWVudHModHJ1ZSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogU2Nyb2xsIHRvIGEgc3VwcGxpZWQgcG9zaXRpb24sIGluY2x1ZGluZyB3aGV0aGVyIG9yIG5vdCB0byBhbmltYXRlIHRoZVxyXG5cdFx0ICogc2Nyb2xsIGFuZCBob3cgZmFzdCB0byBwZXJmb3JtIHRoZSBhbmltYXRpb24gKHBhc3MgaW4gdHJ1ZSB0byBzZWxlY3QgYVxyXG5cdFx0ICogZHluYW1pYyBkdXJhdGlvbikuICBUaGUgaW5wdXRzIHdpbGwgYmUgY29uc3RyYWluZWQgdG8gYm91bmRzIGFuZCBzbmFwcGVkLlxyXG5cdFx0ICogSWYgZmFsc2UgaXMgc3VwcGxpZWQgZm9yIGEgcG9zaXRpb24sIHRoYXQgYXhpcyB3aWxsIG5vdCBiZSBzY3JvbGxlZC5cclxuXHRcdCAqL1xyXG5cdFx0c2Nyb2xsVG8gPSBmdW5jdGlvbiBzY3JvbGxUbyhsZWZ0LCB0b3AsIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcblx0XHRcdHZhciB0YXJnZXRQb3NpdGlvbiwgZHVyYXRpb24sIHBvc2l0aW9ucywgYXhpcywgbWF4RHVyYXRpb24gPSAwLCBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5ID0ge307XHJcblxyXG5cdFx0XHQvLyBJZiBhIG1hbnVhbCBzY3JvbGwgaXMgaW4gcHJvZ3Jlc3MsIGNhbmNlbCBpdFxyXG5cdFx0XHRfZW5kU2Nyb2xsKERhdGUubm93KCkpO1xyXG5cclxuXHRcdFx0Ly8gTW92ZSBzdXBwbGllZCBjb29yZGluYXRlcyBpbnRvIGFuIG9iamVjdCBmb3IgaXRlcmF0aW9uLCBhbHNvIGludmVydGluZyB0aGUgdmFsdWVzIGludG9cclxuXHRcdFx0Ly8gb3VyIGNvb3JkaW5hdGUgc3lzdGVtXHJcblx0XHRcdHBvc2l0aW9ucyA9IHtcclxuXHRcdFx0XHR4OiAtbGVmdCxcclxuXHRcdFx0XHR5OiAtdG9wXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX2Jhc2VTY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfYmFzZVNjcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IHBvc2l0aW9uc1theGlzXTtcclxuXHRcdFx0XHRcdGlmICh0YXJnZXRQb3NpdGlvbiA9PT0gZmFsc2UpIHtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ29uc3RyYWluIHRvIGJvdW5kc1xyXG5cdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBNYXRoLm1pbigwLCBNYXRoLm1heChfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10sIHRhcmdldFBvc2l0aW9uKSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gU25hcCBpZiBhcHByb3ByaWF0ZVxyXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcgJiYgX3NuYXBHcmlkU2l6ZVtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IE1hdGgucm91bmQodGFyZ2V0UG9zaXRpb24gLyBfc25hcEdyaWRTaXplW2F4aXNdKSAqIF9zbmFwR3JpZFNpemVbYXhpc107XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gR2V0IGEgZHVyYXRpb25cclxuXHRcdFx0XHRcdGR1cmF0aW9uID0gYW5pbWF0aW9uRHVyYXRpb24gfHwgMDtcclxuXHRcdFx0XHRcdGlmIChkdXJhdGlvbiA9PT0gdHJ1ZSkge1xyXG5cdFx0XHRcdFx0XHRkdXJhdGlvbiA9IE1hdGguc3FydChNYXRoLmFicyhfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdIC0gdGFyZ2V0UG9zaXRpb24pKSAqIDIwO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFRyaWdnZXIgdGhlIHBvc2l0aW9uIGNoYW5nZVxyXG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCB0YXJnZXRQb3NpdGlvbiwgZHVyYXRpb24pO1xyXG5cdFx0XHRcdFx0c2Nyb2xsUG9zaXRpb25zVG9BcHBseVtheGlzXSA9IHRhcmdldFBvc2l0aW9uO1xyXG5cdFx0XHRcdFx0bWF4RHVyYXRpb24gPSBNYXRoLm1heChtYXhEdXJhdGlvbiwgZHVyYXRpb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIHNjcm9sbCBoYWQgcmVzdWx0ZWQgaW4gYSBjaGFuZ2UgaW4gcG9zaXRpb24sIHBlcmZvcm0gc29tZSBhZGRpdGlvbmFsIGFjdGlvbnM6XHJcblx0XHRcdGlmIChfYmFzZVNjcm9sbFBvc2l0aW9uLnggIT09IHBvc2l0aW9ucy54IHx8IF9iYXNlU2Nyb2xsUG9zaXRpb24ueSAhPT0gcG9zaXRpb25zLnkpIHtcclxuXHJcblx0XHRcdFx0Ly8gTWFyayBhIHNjcm9sbCBhcyBoYXZpbmcgZXZlciBvY2N1cnJlZFxyXG5cdFx0XHRcdF9oYXNCZWVuU2Nyb2xsZWQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHQvLyBJZiBhbiBhbmltYXRpb24gZHVyYXRpb24gaXMgcHJlc2VudCwgZmlyZSBhIHNjcm9sbCBzdGFydCBldmVudCBhbmQgYVxyXG5cdFx0XHRcdC8vIHNjcm9sbCBldmVudCBmb3IgYW55IGxpc3RlbmVycyB0byBhY3Qgb25cclxuXHRcdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGxzdGFydCcsIF9nZXRQb3NpdGlvbigpKTtcclxuXHRcdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGwnLCBfZ2V0UG9zaXRpb24oKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChtYXhEdXJhdGlvbikge1xyXG5cdFx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0dmFyIGFuQXhpcztcclxuXHRcdFx0XHRcdGZvciAoYW5BeGlzIGluIHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkpIHtcclxuXHRcdFx0XHRcdFx0aWYgKHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkuaGFzT3duUHJvcGVydHkoYW5BeGlzKSkge1xyXG5cdFx0XHRcdFx0XHRcdF9sYXN0U2Nyb2xsUG9zaXRpb25bYW5BeGlzXSA9IHNjcm9sbFBvc2l0aW9uc1RvQXBwbHlbYW5BeGlzXTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKCk7XHJcblx0XHRcdFx0fSwgbWF4RHVyYXRpb24pKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRfZmluYWxpemVTY3JvbGwoKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEFsdGVyIHRoZSBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbiwgaW5jbHVkaW5nIHdoZXRoZXIgb3Igbm90IHRvIGFuaW1hdGVcclxuXHRcdCAqIHRoZSBzY3JvbGwgYW5kIGhvdyBmYXN0IHRvIHBlcmZvcm0gdGhlIGFuaW1hdGlvbiAocGFzcyBpbiB0cnVlIHRvXHJcblx0XHQgKiBzZWxlY3QgYSBkeW5hbWljIGR1cmF0aW9uKS4gIFRoZSBpbnB1dHMgd2lsbCBiZSBjaGVja2VkIGFnYWluc3QgdGhlXHJcblx0XHQgKiBjdXJyZW50IHBvc2l0aW9uLlxyXG5cdFx0ICovXHJcblx0XHRzY3JvbGxCeSA9IGZ1bmN0aW9uIHNjcm9sbEJ5KGhvcml6b250YWwsIHZlcnRpY2FsLCBhbmltYXRpb25EdXJhdGlvbikge1xyXG5cclxuXHRcdFx0Ly8gV3JhcCB0aGUgc2Nyb2xsVG8gZnVuY3Rpb24gZm9yIHNpbXBsaWNpdHlcclxuXHRcdFx0c2Nyb2xsVG8ocGFyc2VGbG9hdChob3Jpem9udGFsKSAtIF9iYXNlU2Nyb2xsUG9zaXRpb24ueCwgcGFyc2VGbG9hdCh2ZXJ0aWNhbCkgLSBfYmFzZVNjcm9sbFBvc2l0aW9uLnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBQcm92aWRlIGEgcHVibGljIG1ldGhvZCB0byBkZXRlY3QgY2hhbmdlcyBpbiBkaW1lbnNpb25zIGZvciBlaXRoZXIgdGhlIGNvbnRlbnQgb3IgdGhlXHJcblx0XHQgKiBjb250YWluZXIuXHJcblx0XHQgKi9cclxuXHRcdHVwZGF0ZURpbWVuc2lvbnMgPSBmdW5jdGlvbiB1cGRhdGVEaW1lbnNpb25zKGNvbnRlbnRXaWR0aCwgY29udGVudEhlaWdodCwgaWdub3JlU25hcFNjcm9sbCkge1xyXG5cdFx0XHRvcHRpb25zLmNvbnRlbnRXaWR0aCA9IGNvbnRlbnRXaWR0aCB8fCBvcHRpb25zLmNvbnRlbnRXaWR0aDtcclxuXHRcdFx0b3B0aW9ucy5jb250ZW50SGVpZ2h0ID0gY29udGVudEhlaWdodCB8fCBvcHRpb25zLmNvbnRlbnRIZWlnaHQ7XHJcblxyXG5cdFx0XHQvLyBDdXJyZW50bHkganVzdCB3cmFwIHRoZSBwcml2YXRlIEFQSVxyXG5cdFx0XHRfdXBkYXRlRGltZW5zaW9ucyghIWlnbm9yZVNuYXBTY3JvbGwpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEFkZCBhbiBldmVudCBoYW5kbGVyIGZvciBhIHN1cHBvcnRlZCBldmVudC4gIEN1cnJlbnQgZXZlbnRzIGluY2x1ZGU6XHJcblx0XHQgKiBzY3JvbGwgLSBmaXJlZCB3aGVuZXZlciB0aGUgc2Nyb2xsIHBvc2l0aW9uIGNoYW5nZXNcclxuXHRcdCAqIHNjcm9sbHN0YXJ0IC0gZmlyZWQgd2hlbiBhIHNjcm9sbCBtb3ZlbWVudCBzdGFydHNcclxuXHRcdCAqIHNjcm9sbGVuZCAtIGZpcmVkIHdoZW4gYSBzY3JvbGwgbW92ZW1lbnQgZW5kc1xyXG5cdFx0ICogc2VnbWVudHdpbGxjaGFuZ2UgLSBmaXJlZCB3aGVuZXZlciB0aGUgc2VnbWVudCBjaGFuZ2VzLCBpbmNsdWRpbmcgZHVyaW5nIHNjcm9sbGluZ1xyXG5cdFx0ICogc2VnbWVudGRpZGNoYW5nZSAtIGZpcmVkIHdoZW4gYSBzZWdtZW50IGhhcyBjb25jbHVzaXZlbHkgY2hhbmdlZCwgYWZ0ZXIgc2Nyb2xsaW5nLlxyXG5cdFx0ICovXHJcblx0XHRhZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gYWRkRXZlbnRMaXN0ZW5lcihldmVudG5hbWUsIGV2ZW50bGlzdGVuZXIpIHtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSB0aGlzIGlzIGEgdmFsaWQgZXZlbnRcclxuXHRcdFx0aWYgKCFfZXZlbnRMaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkoZXZlbnRuYW1lKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRfZXZlbnRMaXN0ZW5lcnNbZXZlbnRuYW1lXS5wdXNoKGV2ZW50bGlzdGVuZXIpO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBSZW1vdmUgYW4gZXZlbnQgaGFuZGxlciBmb3IgYSBzdXBwb3J0ZWQgZXZlbnQuICBUaGUgbGlzdGVuZXIgbXVzdCBiZSBleGFjdGx5IHRoZSBzYW1lIGFzXHJcblx0XHQgKiBhbiBhZGRlZCBsaXN0ZW5lciB0byBiZSByZW1vdmVkLlxyXG5cdFx0ICovXHJcblx0XHRyZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudG5hbWUsIGV2ZW50bGlzdGVuZXIpIHtcclxuXHRcdFx0dmFyIGk7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgdGhpcyBpcyBhIHZhbGlkIGV2ZW50XHJcblx0XHRcdGlmICghX2V2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KGV2ZW50bmFtZSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZvciAoaSA9IF9ldmVudExpc3RlbmVyc1tldmVudG5hbWVdLmxlbmd0aDsgaSA+PSAwOyBpID0gaSAtIDEpIHtcclxuXHRcdFx0XHRpZiAoX2V2ZW50TGlzdGVuZXJzW2V2ZW50bmFtZV1baV0gPT09IGV2ZW50bGlzdGVuZXIpIHtcclxuXHRcdFx0XHRcdF9ldmVudExpc3RlbmVyc1tldmVudG5hbWVdLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogU3RhcnQgYSBzY3JvbGwgdHJhY2tpbmcgaW5wdXQgLSB0aGlzIGNvdWxkIGJlIG1vdXNlLCB3ZWJraXQtc3R5bGUgdG91Y2gsXHJcblx0XHQgKiBvciBtcy1zdHlsZSBwb2ludGVyIGV2ZW50cy5cclxuXHRcdCAqL1xyXG5cdFx0X3N0YXJ0U2Nyb2xsID0gZnVuY3Rpb24gX3N0YXJ0U2Nyb2xsKGlucHV0WCwgaW5wdXRZLCBpbnB1dFRpbWUsIHJhd0V2ZW50KSB7XHJcblx0XHRcdHZhciB0cmlnZ2VyU2Nyb2xsSW50ZXJydXB0ID0gX2lzQW5pbWF0aW5nO1xyXG5cclxuXHRcdFx0Ly8gT3BlcmEgZml4XHJcblx0XHRcdGlmIChpbnB1dFRpbWUgPD0gMCkge1xyXG5cdFx0XHRcdGlucHV0VGltZSA9IERhdGUubm93KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIGEgd2luZG93IHNjcm9sbGluZyBmbGFnIGlzIHNldCwgYW5kIGV2YWx1YXRlcyB0byB0cnVlLCBkb24ndCBzdGFydCBjaGVja2luZyB0b3VjaGVzXHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcgJiYgd2luZG93W19pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZ10pIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIGFuIGFuaW1hdGlvbiBpcyBpbiBwcm9ncmVzcywgc3RvcCB0aGUgc2Nyb2xsLlxyXG5cdFx0XHRpZiAodHJpZ2dlclNjcm9sbEludGVycnVwdCkge1xyXG5cdFx0XHRcdF9pbnRlcnJ1cHRTY3JvbGwoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0Ly8gQWxsb3cgY2xpY2tzIGFnYWluLCBidXQgb25seSBpZiBhIHNjcm9sbCB3YXMgbm90IGludGVycnVwdGVkXHJcblx0XHRcdFx0X3ByZXZlbnRDbGljayA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTdG9yZSB0aGUgaW5pdGlhbCBldmVudCBjb29yZGluYXRlc1xyXG5cdFx0XHRfZ2VzdHVyZVN0YXJ0LnggPSBpbnB1dFg7XHJcblx0XHRcdF9nZXN0dXJlU3RhcnQueSA9IGlucHV0WTtcclxuXHRcdFx0X2dlc3R1cmVTdGFydC50ID0gaW5wdXRUaW1lO1xyXG5cdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb24ueCA9IF9sYXN0U2Nyb2xsUG9zaXRpb24ueDtcclxuXHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uLnkgPSBfbGFzdFNjcm9sbFBvc2l0aW9uLnk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBldmVudCBoaXN0b3J5IGFuZCBhZGQgdGhlIHN0YXJ0IHRvdWNoXHJcblx0XHRcdF9ldmVudEhpc3RvcnkubGVuZ3RoID0gMDtcclxuXHRcdFx0X2V2ZW50SGlzdG9yeS5wdXNoKHsgeDogaW5wdXRYLCB5OiBpbnB1dFksIHQ6IGlucHV0VGltZSB9KTtcclxuXHJcblx0XHRcdGlmICh0cmlnZ2VyU2Nyb2xsSW50ZXJydXB0KSB7XHJcblx0XHRcdFx0X3VwZGF0ZVNjcm9sbChpbnB1dFgsIGlucHV0WSwgaW5wdXRUaW1lLCByYXdFdmVudCwgdHJpZ2dlclNjcm9sbEludGVycnVwdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIENvbnRpbnVlIGEgc2Nyb2xsIGFzIGEgcmVzdWx0IG9mIGFuIHVwZGF0ZWQgcG9zaXRpb25cclxuXHRcdCAqL1xyXG5cdFx0X3VwZGF0ZVNjcm9sbCA9IGZ1bmN0aW9uIF91cGRhdGVTY3JvbGwoaW5wdXRYLCBpbnB1dFksIGlucHV0VGltZSwgcmF3RXZlbnQsIHNjcm9sbEludGVycnVwdCkge1xyXG5cdFx0XHR2YXIgYXhpcywgb3RoZXJTY3JvbGxlckFjdGl2ZSwgZGlzdGFuY2VzQmV5b25kQm91bmRzO1xyXG5cdFx0XHR2YXIgaW5pdGlhbFNjcm9sbCA9IGZhbHNlO1xyXG5cdFx0XHR2YXIgZ2VzdHVyZSA9IHtcclxuXHRcdFx0XHR4OiBpbnB1dFggLSBfZ2VzdHVyZVN0YXJ0LngsXHJcblx0XHRcdFx0eTogaW5wdXRZIC0gX2dlc3R1cmVTdGFydC55XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBPcGVyYSBmaXhcclxuXHRcdFx0aWYgKGlucHV0VGltZSA8PSAwKSB7XHJcblx0XHRcdFx0aW5wdXRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGJhc2UgdGFyZ2V0IHBvc2l0aW9uc1xyXG5cdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb24ueCA9IF9iYXNlU2Nyb2xsUG9zaXRpb24ueCArIGdlc3R1cmUueDtcclxuXHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uLnkgPSBfYmFzZVNjcm9sbFBvc2l0aW9uLnkgKyBnZXN0dXJlLnk7XHJcblxyXG5cdFx0XHQvLyBJZiBzY3JvbGxpbmcgaGFzIG5vdCB5ZXQgbG9ja2VkIHRvIHRoaXMgc2Nyb2xsZXIsIGNoZWNrIHdoZXRoZXIgdG8gc3RvcCBzY3JvbGxpbmdcclxuXHRcdFx0aWYgKCFfaXNTY3JvbGxpbmcpIHtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgdGhlIGludGVybmFsIGZsYWcgdG8gZGV0ZXJtaW5lIGlmIGFub3RoZXIgRlRTY3JvbGxlciBpcyBzY3JvbGxpbmdcclxuXHRcdFx0XHRpZiAoX2Z0c2Nyb2xsZXJNb3ZpbmcgJiYgX2Z0c2Nyb2xsZXJNb3ZpbmcgIT09IF9zZWxmKSB7XHJcblx0XHRcdFx0XHRvdGhlclNjcm9sbGVyQWN0aXZlID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIE90aGVyd2lzZSwgY2hlY2sgdGhlIHdpbmRvdyBzY3JvbGxpbmcgZmxhZyB0byBzZWUgaWYgYW55dGhpbmcgZWxzZSBoYXMgY2xhaW1lZCBzY3JvbGxpbmdcclxuXHRcdFx0XHRlbHNlIGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcgJiYgd2luZG93W19pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZ10pIHtcclxuXHRcdFx0XHRcdG90aGVyU2Nyb2xsZXJBY3RpdmUgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gSWYgYW5vdGhlciBzY3JvbGxlciB3YXMgYWN0aXZlLCBjbGVhbiB1cCBhbmQgc3RvcCBwcm9jZXNzaW5nLlxyXG5cdFx0XHRcdGlmIChvdGhlclNjcm9sbGVyQWN0aXZlKSB7XHJcblx0XHRcdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gZmFsc2U7XHJcblx0XHRcdFx0XHRfcmVsZWFzZUlucHV0Q2FwdHVyZSgpO1xyXG5cdFx0XHRcdFx0aWYgKF9pc0Rpc3BsYXlpbmdTY3JvbGwpIHtcclxuXHRcdFx0XHRcdFx0X2NhbmNlbEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdFx0XHRpZiAoIV9zbmFwU2Nyb2xsKHRydWUpKSB7XHJcblx0XHRcdFx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKHRydWUpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBub3QgeWV0IGRpc3BsYXlpbmcgYSBzY3JvbGwsIGRldGVybWluZSB3aGV0aGVyIHRoYXQgdHJpZ2dlcmluZyBib3VuZGFyeVxyXG5cdFx0XHQvLyBoYXMgYmVlbiBleGNlZWRlZFxyXG5cdFx0XHRpZiAoIV9pc0Rpc3BsYXlpbmdTY3JvbGwpIHtcclxuXHJcblx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHNjcm9sbCBkaXN0YW5jZSBiZXlvbmQgYm91bmRzXHJcblx0XHRcdFx0ZGlzdGFuY2VzQmV5b25kQm91bmRzID0gX2Rpc3RhbmNlc0JleW9uZEJvdW5kcyhfdGFyZ2V0U2Nyb2xsUG9zaXRpb24pO1xyXG5cclxuXHRcdFx0XHQvLyBEZXRlcm1pbmUgd2hldGhlciB0byBwcmV2ZW50IHRoZSBkZWZhdWx0IHNjcm9sbCBldmVudCAtIGlmIHRoZSBzY3JvbGwgY291bGQgc3RpbGxcclxuXHRcdFx0XHQvLyBiZSB0cmlnZ2VyZWQsIHByZXZlbnQgdGhlIGRlZmF1bHQgdG8gYXZvaWQgcHJvYmxlbXMgKHBhcnRpY3VsYXJseSBvbiBQbGF5Qm9vaylcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5ib3VuY2luZyB8fCBzY3JvbGxJbnRlcnJ1cHQgfHwgKF9zY3JvbGxhYmxlQXhlcy54ICYmIGdlc3R1cmUueCAmJiBkaXN0YW5jZXNCZXlvbmRCb3VuZHMueCA8IDApIHx8IChfc2Nyb2xsYWJsZUF4ZXMueSAmJiBnZXN0dXJlLnkgJiYgZGlzdGFuY2VzQmV5b25kQm91bmRzLnkgPCAwKSkge1xyXG5cdFx0XHRcdFx0cmF3RXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIHNjcm9sbGVkIGRpc3RhbmNlIGFnYWluc3QgdGhlIGJvdW5kYXJ5IGxpbWl0IHRvIHNlZSBpZiBzY3JvbGxpbmcgY2FuIGJlIHRyaWdnZXJlZC5cclxuXHRcdFx0XHQvLyBJZiB0aGUgc2Nyb2xsIGhhcyBiZWVuIGludGVycnVwdGVkLCB0cmlnZ2VyIGF0IG9uY2VcclxuXHRcdFx0XHRpZiAoIXNjcm9sbEludGVycnVwdCAmJiAoIV9zY3JvbGxhYmxlQXhlcy54IHx8IE1hdGguYWJzKGdlc3R1cmUueCkgPCBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbFJlc3BvbnNlQm91bmRhcnkpICYmICghX3Njcm9sbGFibGVBeGVzLnkgfHwgTWF0aC5hYnMoZ2VzdHVyZS55KSA8IF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsUmVzcG9uc2VCb3VuZGFyeSkpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIGJvdW5jaW5nIGlzIGRpc2FibGVkLCBhbmQgYWxyZWFkeSBhdCBhbiBlZGdlIGFuZCBzY3JvbGxpbmcgYmV5b25kIHRoZSBlZGdlLCBpZ25vcmUgdGhlIHNjcm9sbCBmb3JcclxuXHRcdFx0XHQvLyBub3cgLSB0aGlzIGFsbG93cyBvdGhlciBzY3JvbGxlcnMgdG8gY2xhaW0gaWYgYXBwcm9wcmlhdGUsIGFsbG93aW5nIG5pY2VyIG5lc3RlZCBzY3JvbGxzLlxyXG5cdFx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5ib3VuY2luZyAmJiAhc2Nyb2xsSW50ZXJydXB0ICYmICghX3Njcm9sbGFibGVBeGVzLnggfHwgIWdlc3R1cmUueCB8fCBkaXN0YW5jZXNCZXlvbmRCb3VuZHMueCA+IDApICYmICghX3Njcm9sbGFibGVBeGVzLnkgfHwgIWdlc3R1cmUueSB8fCBkaXN0YW5jZXNCZXlvbmRCb3VuZHMueSA+IDApKSB7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUHJldmVudCB0aGUgb3JpZ2luYWwgY2xpY2sgbm93IHRoYXQgc2Nyb2xsaW5nIHdvdWxkIGJlIHRyaWdnZXJlZFxyXG5cdFx0XHRcdFx0X3ByZXZlbnRDbGljayA9IHRydWU7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gVHJpZ2dlciB0aGUgc3RhcnQgb2YgdmlzdWFsIHNjcm9sbGluZ1xyXG5cdFx0XHRcdF9zdGFydEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdF9pc0Rpc3BsYXlpbmdTY3JvbGwgPSB0cnVlO1xyXG5cdFx0XHRcdF9oYXNCZWVuU2Nyb2xsZWQgPSB0cnVlO1xyXG5cdFx0XHRcdF9pc0FuaW1hdGluZyA9IHRydWU7XHJcblx0XHRcdFx0aW5pdGlhbFNjcm9sbCA9IHRydWU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdC8vIFByZXZlbnQgdGhlIGV2ZW50IGRlZmF1bHQuICBJdCBpcyBzYWZlIHRvIGNhbGwgdGhpcyBpbiBJRTEwIGJlY2F1c2UgdGhlIGV2ZW50IGlzIG5ldmVyXHJcblx0XHRcdFx0Ly8gYSB3aW5kb3cuZXZlbnQsIGFsd2F5cyBhIFwidHJ1ZVwiIGV2ZW50LlxyXG5cdFx0XHRcdHJhd0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIG5vdCB5ZXQgbG9ja2VkIHRvIGEgc2Nyb2xsLCBkZXRlcm1pbmUgd2hldGhlciB0byBkbyBzb1xyXG5cdFx0XHRpZiAoIV9pc1Njcm9sbGluZykge1xyXG5cclxuXHRcdFx0XHQvLyBJZiB0aGUgZ2VzdHVyZSBkaXN0YW5jZSBoYXMgZXhjZWVkZWQgdGhlIHNjcm9sbCBsb2NrIGRpc3RhbmNlLCBvciBzbmFwcGluZyBpcyBhY3RpdmVcclxuXHRcdFx0XHQvLyBhbmQgdGhlIHNjcm9sbCBoYXMgYmVlbiBpbnRlcnJ1cHRlZCwgZW50ZXIgZXhjbHVzaXZlIHNjcm9sbGluZy5cclxuXHRcdFx0XHRpZiAoKHNjcm9sbEludGVycnVwdCAmJiBfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB8fCAoX3Njcm9sbGFibGVBeGVzLnggJiYgTWF0aC5hYnMoZ2VzdHVyZS54KSA+PSBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbEJvdW5kYXJ5KSB8fCAoX3Njcm9sbGFibGVBeGVzLnkgJiYgTWF0aC5hYnMoZ2VzdHVyZS55KSA+PSBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbEJvdW5kYXJ5KSkge1xyXG5cclxuXHRcdFx0XHRcdF9pc1Njcm9sbGluZyA9IHRydWU7XHJcblx0XHRcdFx0XHRfZnRzY3JvbGxlck1vdmluZyA9IF9zZWxmO1xyXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZykge1xyXG5cdFx0XHRcdFx0XHR3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSA9IF9zZWxmO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsc3RhcnQnLCBfZ2V0UG9zaXRpb24oKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDYW5jZWwgdGV4dCBzZWxlY3Rpb25zIHdoaWxlIGRyYWdnaW5nIGEgY3Vyc29yXHJcblx0XHRcdGlmIChfY2FuQ2xlYXJTZWxlY3Rpb24pIHtcclxuXHRcdFx0XHR3aW5kb3cuZ2V0U2VsZWN0aW9uKCkucmVtb3ZlQWxsUmFuZ2VzKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBheGVzIHRhcmdldCBwb3NpdGlvbnMgaWYgYmV5b25kIGJvdW5kc1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0aWYgKF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSA+IDApIHtcclxuXHRcdFx0XHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdID0gX21vZGlmeURpc3RhbmNlQmV5b25kQm91bmRzKF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSwgYXhpcyk7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSA8IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gPSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10gKyBfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMoX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdIC0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdLCBheGlzKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRyaWdnZXIgYSBzY3JvbGwgcG9zaXRpb24gdXBkYXRlIGZvciBwbGF0Zm9ybXMgbm90IHVzaW5nIHJlcXVlc3RBbmltYXRpb25GcmFtZXNcclxuXHRcdFx0aWYgKCFfcmVxQW5pbWF0aW9uRnJhbWUpIHtcclxuXHRcdFx0XHRfc2NoZWR1bGVSZW5kZXIoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVG8gYWlkIHJlbmRlci9kcmF3IGNvYWxlc2NpbmcsIHBlcmZvcm0gb3RoZXIgb25lLW9mZiBhY3Rpb25zIGhlcmVcclxuXHRcdFx0aWYgKGluaXRpYWxTY3JvbGwpIHtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdDbGFzc05hbWUpIHtcclxuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLmNsYXNzTmFtZSArPSAnICcgKyBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ0NsYXNzTmFtZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLmNsYXNzTmFtZSArPSAnIGFjdGl2ZSc7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBhbiBldmVudCB0byB0aGUgZXZlbnQgaGlzdG9yeSwga2VlcGluZyBpdCBhcm91bmQgdHdlbnR5IGV2ZW50cyBsb25nXHJcblx0XHRcdF9ldmVudEhpc3RvcnkucHVzaCh7IHg6IGlucHV0WCwgeTogaW5wdXRZLCB0OiBpbnB1dFRpbWUgfSk7XHJcblx0XHRcdGlmIChfZXZlbnRIaXN0b3J5Lmxlbmd0aCA+IDMwKSB7XHJcblx0XHRcdFx0X2V2ZW50SGlzdG9yeS5zcGxpY2UoMCwgMTUpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQ29tcGxldGUgYSBzY3JvbGwgd2l0aCBhIGZpbmFsIGV2ZW50IHRpbWUgaWYgYXZhaWxhYmxlIChpdCBtYXlcclxuXHRcdCAqIG5vdCBiZSwgZGVwZW5kaW5nIG9uIHRoZSBpbnB1dCB0eXBlKTsgdGhpcyBtYXkgY29udGludWUgdGhlIHNjcm9sbFxyXG5cdFx0ICogd2l0aCBhIGZsaW5nIGFuZC9vciBib3VuY2ViYWNrIGRlcGVuZGluZyBvbiBvcHRpb25zLlxyXG5cdFx0ICovXHJcblx0XHRfZW5kU2Nyb2xsID0gZnVuY3Rpb24gX2VuZFNjcm9sbChpbnB1dFRpbWUsIHJhd0V2ZW50KSB7XHJcblx0XHRcdF9pbnB1dElkZW50aWZpZXIgPSBmYWxzZTtcclxuXHRcdFx0X3JlbGVhc2VJbnB1dENhcHR1cmUoKTtcclxuXHRcdFx0X2NhbmNlbEFuaW1hdGlvbigpO1xyXG5cclxuXHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsaW50ZXJhY3Rpb25lbmQnLCB7fSk7XHJcblxyXG5cdFx0XHRpZiAoIV9pc1Njcm9sbGluZykge1xyXG5cdFx0XHRcdGlmICghX3NuYXBTY3JvbGwodHJ1ZSkgJiYgX2lzRGlzcGxheWluZ1Njcm9sbCkge1xyXG5cdFx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE1vZGlmeSB0aGUgbGFzdCBtb3ZlbWVudCBldmVudCB0byBpbmNsdWRlIHRoZSBlbmQgZXZlbnQgdGltZVxyXG5cdFx0XHRfZXZlbnRIaXN0b3J5W19ldmVudEhpc3RvcnkubGVuZ3RoIC0gMV0udCA9IGlucHV0VGltZTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBmbGFnc1xyXG5cdFx0XHRfaXNTY3JvbGxpbmcgPSBmYWxzZTtcclxuXHRcdFx0X2lzRGlzcGxheWluZ1Njcm9sbCA9IGZhbHNlO1xyXG5cdFx0XHRfZnRzY3JvbGxlck1vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnKSB7XHJcblx0XHRcdFx0d2luZG93W19pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZ10gPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUHJldmVudCBjbGlja3MgYW5kIHN0b3AgdGhlIGV2ZW50IGRlZmF1bHQuICBJdCBpcyBzYWZlIHRvIGNhbGwgdGhpcyBpbiBJRTEwIGJlY2F1c2VcclxuXHRcdFx0Ly8gdGhlIGV2ZW50IGlzIG5ldmVyIGEgd2luZG93LmV2ZW50LCBhbHdheXMgYSBcInRydWVcIiBldmVudC5cclxuXHRcdFx0X3ByZXZlbnRDbGljayA9IHRydWU7XHJcblx0XHRcdGlmIChyYXdFdmVudCkge1xyXG5cdFx0XHRcdHJhd0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRyaWdnZXIgYSBmbGluZyBvciBib3VuY2ViYWNrIGlmIG5lY2Vzc2FyeVxyXG5cdFx0XHRpZiAoIV9mbGluZ1Njcm9sbCgpICYmICFfc25hcFNjcm9sbCgpKSB7XHJcblx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBSZW1vdmUgdGhlIHNjcm9sbGluZyBjbGFzcywgY2xlYW5pbmcgdXAgZGlzcGxheS5cclxuXHRcdCAqL1xyXG5cdFx0X2ZpbmFsaXplU2Nyb2xsID0gZnVuY3Rpb24gX2ZpbmFsaXplU2Nyb2xsKHNjcm9sbENhbmNlbGxlZCkge1xyXG5cdFx0XHR2YXIgaSwgbCwgYXhpcywgc2Nyb2xsRXZlbnQsIHNjcm9sbFJlZ2V4O1xyXG5cclxuXHRcdFx0X2lzQW5pbWF0aW5nID0gZmFsc2U7XHJcblx0XHRcdF9pc0Rpc3BsYXlpbmdTY3JvbGwgPSBmYWxzZTtcclxuXHJcblx0XHRcdC8vIFJlbW92ZSBzY3JvbGxpbmcgY2xhc3MgaWYgc2V0XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ0NsYXNzTmFtZSkge1xyXG5cdFx0XHRcdHNjcm9sbFJlZ2V4ID0gbmV3IFJlZ0V4cCgnKD86XnxcXFxccyknICsgX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdDbGFzc05hbWUgKyAnKD8hXFxcXFMpJywgJ2cnKTtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5jbGFzc05hbWUgPSBfY29udGFpbmVyTm9kZS5jbGFzc05hbWUucmVwbGFjZShzY3JvbGxSZWdleCwgJycpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlc1theGlzXS5jbGFzc05hbWUgPSBfc2Nyb2xsYmFyTm9kZXNbYXhpc10uY2xhc3NOYW1lLnJlcGxhY2UoLyA/YWN0aXZlL2csICcnKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0b3JlIGZpbmFsIHBvc2l0aW9uIGlmIHNjcm9sbGluZyBvY2N1cnJlZFxyXG5cdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uLnggPSBfbGFzdFNjcm9sbFBvc2l0aW9uLng7XHJcblx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb24ueSA9IF9sYXN0U2Nyb2xsUG9zaXRpb24ueTtcclxuXHJcblx0XHRcdHNjcm9sbEV2ZW50ID0gX2dldFBvc2l0aW9uKCk7XHJcblxyXG5cdFx0XHRpZiAoIXNjcm9sbENhbmNlbGxlZCkge1xyXG5cdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbCcsIHNjcm9sbEV2ZW50KTtcclxuXHRcdFx0XHRfdXBkYXRlU2VnbWVudHModHJ1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFsd2F5cyBmaXJlIHRoZSBzY3JvbGwgZW5kIGV2ZW50LCBpbmNsdWRpbmcgYW4gYXJndW1lbnQgaW5kaWNhdGluZyB3aGV0aGVyXHJcblx0XHRcdC8vIHRoZSBzY3JvbGwgd2FzIGNhbmNlbGxlZFxyXG5cdFx0XHRzY3JvbGxFdmVudC5jYW5jZWxsZWQgPSBzY3JvbGxDYW5jZWxsZWQ7XHJcblx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbGVuZCcsIHNjcm9sbEV2ZW50KTtcclxuXHJcblx0XHRcdC8vIFJlc3RvcmUgdHJhbnNpdGlvbnNcclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdF9zY3JvbGxOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNpdGlvblByb3BlcnR5XSA9ICcnO1xyXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXNbYXhpc10uc3R5bGVbX3RyYW5zaXRpb25Qcm9wZXJ0eV0gPSAnJztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENsZWFyIGFueSByZW1haW5pbmcgdGltZW91dHNcclxuXHRcdFx0Zm9yIChpID0gMCwgbCA9IF90aW1lb3V0cy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF90aW1lb3V0c1tpXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0X3RpbWVvdXRzLmxlbmd0aCA9IDA7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogSW50ZXJydXB0IGEgY3VycmVudCBzY3JvbGwsIGFsbG93aW5nIGEgc3RhcnQgc2Nyb2xsIGR1cmluZyBhbmltYXRpb24gdG8gdHJpZ2dlciBhIG5ldyBzY3JvbGxcclxuXHRcdCAqL1xyXG5cdFx0X2ludGVycnVwdFNjcm9sbCA9IGZ1bmN0aW9uIF9pbnRlcnJ1cHRTY3JvbGwoKSB7XHJcblx0XHRcdHZhciBheGlzLCBpLCBsO1xyXG5cclxuXHRcdFx0X2lzQW5pbWF0aW5nID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHN0b3JlZCBiYXNlIHBvc2l0aW9uXHJcblx0XHRcdF91cGRhdGVFbGVtZW50UG9zaXRpb24oKTtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSB0aGUgcGFyc2VkIHBvc2l0aW9ucyBhcmUgc2V0LCBhbHNvIGNsZWFyaW5nIHRyYW5zaXRpb25zXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIF9iYXNlU2Nyb2xsUG9zaXRpb25bYXhpc10sIDE2LCBfaW5zdGFuY2VPcHRpb25zLmJvdW5jZURlY2VsZXJhdGlvbkJlemllcik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgc2VnbWVudCB0cmFja2luZyBpZiBzbmFwcGluZyBpcyBhY3RpdmVcclxuXHRcdFx0X3VwZGF0ZVNlZ21lbnRzKGZhbHNlKTtcclxuXHJcblx0XHRcdC8vIENsZWFyIGFueSByZW1haW5pbmcgdGltZW91dHNcclxuXHRcdFx0Zm9yIChpID0gMCwgbCA9IF90aW1lb3V0cy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF90aW1lb3V0c1tpXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0X3RpbWVvdXRzLmxlbmd0aCA9IDA7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogRGV0ZXJtaW5lIHdoZXRoZXIgYSBzY3JvbGwgZmxpbmcgb3IgYm91bmNlYmFjayBpcyByZXF1aXJlZCwgYW5kIHNldCB1cCB0aGUgc3R5bGVzIGFuZFxyXG5cdFx0ICogdGltZW91dHMgcmVxdWlyZWQuXHJcblx0XHQgKi9cclxuXHRcdF9mbGluZ1Njcm9sbCA9IGZ1bmN0aW9uIF9mbGluZ1Njcm9sbCgpIHtcclxuXHRcdFx0dmFyIGksIGF4aXMsIG1vdmVtZW50VGltZSwgbW92ZW1lbnRTcGVlZCwgbGFzdFBvc2l0aW9uLCBjb21wYXJpc29uUG9zaXRpb24sIGZsaW5nRHVyYXRpb24sIGZsaW5nRGlzdGFuY2UsIGZsaW5nUG9zaXRpb24sIGJvdW5jZURlbGF5LCBib3VuY2VEaXN0YW5jZSwgYm91bmNlRHVyYXRpb24sIGJvdW5jZVRhcmdldCwgYm91bmRzQm91bmNlLCBtb2RpZmllZERpc3RhbmNlLCBmbGluZ0JlemllciwgdGltZVByb3BvcnRpb24sIGJvdW5kc0Nyb3NzRGVsYXksIGZsaW5nU3RhcnRTZWdtZW50LCBiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlLCBiYXNlRmxpbmdDb21wb25lbnQ7XHJcblx0XHRcdHZhciBtYXhBbmltYXRpb25UaW1lID0gMDtcclxuXHRcdFx0dmFyIG1vdmVSZXF1aXJlZCA9IGZhbHNlO1xyXG5cdFx0XHR2YXIgc2Nyb2xsUG9zaXRpb25zVG9BcHBseSA9IHt9O1xyXG5cclxuXHRcdFx0Ly8gSWYgd2Ugb25seSBoYXZlIHRoZSBzdGFydCBldmVudCBhdmFpbGFibGUsIG9yIGZsaW5naW5nIGlzIGRpc2FibGVkLFxyXG5cdFx0XHQvLyBvciB0aGUgc2Nyb2xsIHdhcyB0cmlnZ2VyZWQgYnkgYSBzY3JvbGx3aGVlbCwgbm8gYWN0aW9uIHJlcXVpcmVkLlxyXG5cdFx0XHRpZiAoX2V2ZW50SGlzdG9yeS5sZW5ndGggPT09IDEgfHwgIV9pbnN0YW5jZU9wdGlvbnMuZmxpbmdpbmcgfHwgX2lucHV0SWRlbnRpZmllciA9PT0gJ3Njcm9sbHdoZWVsJykge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdGJvdW5jZUR1cmF0aW9uID0gMzUwO1xyXG5cdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSAwO1xyXG5cdFx0XHRcdFx0Ym91bmRzQm91bmNlID0gZmFsc2U7XHJcblx0XHRcdFx0XHRib3VuY2VUYXJnZXQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdGJvdW5kc0Nyb3NzRGVsYXkgPSB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUmUtc2V0IGEgZGVmYXVsdCBiZXppZXIgY3VydmUgZm9yIHRoZSBhbmltYXRpb24gZm9yIHBvdGVudGlhbCBtb2RpZmljYXRpb25cclxuXHRcdFx0XHRcdGZsaW5nQmV6aWVyID0gX2luc3RhbmNlT3B0aW9ucy5mbGluZ0JlemllcjtcclxuXHJcblx0XHRcdFx0XHQvLyBHZXQgdGhlIGxhc3QgbW92ZW1lbnQgc3BlZWQsIGluIHBpeGVscyBwZXIgbWlsbGlzZWNvbmQuICBUbyBkbyB0aGlzLCBsb29rIGF0IHRoZSBldmVudHNcclxuXHRcdFx0XHRcdC8vIGluIHRoZSBsYXN0IDEwMG1zIGFuZCBhdmVyYWdlIG91dCB0aGUgc3BlZWQsIHVzaW5nIGEgbWluaW11bSBudW1iZXIgb2YgdHdvIHBvaW50cy5cclxuXHRcdFx0XHRcdGxhc3RQb3NpdGlvbiA9IF9ldmVudEhpc3RvcnlbX2V2ZW50SGlzdG9yeS5sZW5ndGggLSAxXTtcclxuXHRcdFx0XHRcdGNvbXBhcmlzb25Qb3NpdGlvbiA9IF9ldmVudEhpc3RvcnlbX2V2ZW50SGlzdG9yeS5sZW5ndGggLSAyXTtcclxuXHRcdFx0XHRcdGZvciAoaSA9IF9ldmVudEhpc3RvcnkubGVuZ3RoIC0gMzsgaSA+PSAwOyBpID0gaSAtIDEpIHtcclxuXHRcdFx0XHRcdFx0aWYgKGxhc3RQb3NpdGlvbi50IC0gX2V2ZW50SGlzdG9yeVtpXS50ID4gMTAwKSB7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Y29tcGFyaXNvblBvc2l0aW9uID0gX2V2ZW50SGlzdG9yeVtpXTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBHZXQgdGhlIGxhc3QgbW92ZW1lbnQgdGltZS4gIElmIHRoaXMgaXMgemVybyAtIGFzIGNhbiBoYXBwZW4gd2l0aFxyXG5cdFx0XHRcdFx0Ly8gc29tZSBzY3JvbGx3aGVlbCBldmVudHMgb24gc29tZSBwbGF0Zm9ybXMgLSBpbmNyZWFzZSBpdCB0byAxNm1zIGFzXHJcblx0XHRcdFx0XHQvLyBpZiB0aGUgbW92ZW1lbnQgb2NjdXJyZWQgb3ZlciBhIHNpbmdsZSBmcmFtZSBhdCA2MGZwcy5cclxuXHRcdFx0XHRcdG1vdmVtZW50VGltZSA9IGxhc3RQb3NpdGlvbi50IC0gY29tcGFyaXNvblBvc2l0aW9uLnQ7XHJcblx0XHRcdFx0XHRpZiAoIW1vdmVtZW50VGltZSkge1xyXG5cdFx0XHRcdFx0XHRtb3ZlbWVudFRpbWUgPSAxNjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBEZXJpdmUgdGhlIG1vdmVtZW50IHNwZWVkXHJcblx0XHRcdFx0XHRtb3ZlbWVudFNwZWVkID0gKGxhc3RQb3NpdGlvbltheGlzXSAtIGNvbXBhcmlzb25Qb3NpdGlvbltheGlzXSkgLyBtb3ZlbWVudFRpbWU7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgdGhlcmUgaXMgbGl0dGxlIHNwZWVkLCBubyBmdXJ0aGVyIGFjdGlvbiByZXF1aXJlZCBleGNlcHQgZm9yIGEgYm91bmNlYmFjaywgYmVsb3cuXHJcblx0XHRcdFx0XHRpZiAoTWF0aC5hYnMobW92ZW1lbnRTcGVlZCkgPCBfa01pbmltdW1TcGVlZCkge1xyXG5cdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gMDtcclxuXHRcdFx0XHRcdFx0ZmxpbmdEaXN0YW5jZSA9IDA7XHJcblxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHJcblxyXG5cdFx0XHRcdFx0XHQvKiBDYWxjdWxhdGUgdGhlIGZsaW5nIGR1cmF0aW9uLiAgQXMgcGVyIFRvdWNoU2Nyb2xsLCB0aGUgc3BlZWQgYXQgYW55IHBhcnRpY3VsYXJcclxuXHRcdFx0XHRcdFx0cG9pbnQgaW4gdGltZSBjYW4gYmUgY2FsY3VsYXRlZCBhczpcclxuXHRcdFx0XHRcdFx0XHR7IHNwZWVkIH0gPSB7IGluaXRpYWwgc3BlZWQgfSAqICh7IGZyaWN0aW9uIH0gdG8gdGhlIHBvd2VyIG9mIHsgZHVyYXRpb24gfSlcclxuXHRcdFx0XHRcdFx0Li4uYXNzdW1pbmcgYWxsIHZhbHVlcyBhcmUgaW4gZXF1YWwgcGl4ZWxzL21pbGxpc2Vjb25kIG1lYXN1cmVtZW50cy4gIEFzIHdlIGtub3cgdGhlXHJcblx0XHRcdFx0XHRcdG1pbmltdW0gdGFyZ2V0IHNwZWVkLCB0aGlzIGNhbiBiZSBhbHRlcmVkIHRvOlxyXG5cdFx0XHRcdFx0XHRcdHsgZHVyYXRpb24gfSA9IGxvZyggeyBzcGVlZCB9IC8geyBpbml0aWFsIHNwZWVkIH0gKSAvIGxvZyggeyBmcmljdGlvbiB9IClcclxuXHRcdFx0XHRcdFx0Ki9cclxuXHJcblx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBNYXRoLmxvZyhfa01pbmltdW1TcGVlZCAvIE1hdGguYWJzKG1vdmVtZW50U3BlZWQpKSAvIE1hdGgubG9nKF9rRnJpY3Rpb24pO1xyXG5cclxuXHJcblx0XHRcdFx0XHRcdC8qIENhbGN1bGF0ZSB0aGUgZmxpbmcgZGlzdGFuY2UgKGJlZm9yZSBhbnkgYm91bmNpbmcgb3Igc25hcHBpbmcpLiAgQXMgcGVyXHJcblx0XHRcdFx0XHRcdFRvdWNoU2Nyb2xsLCB0aGUgdG90YWwgZGlzdGFuY2UgY292ZXJlZCBjYW4gYmUgYXBwcm94aW1hdGVkIGJ5IHN1bW1pbmdcclxuXHRcdFx0XHRcdFx0dGhlIGRpc3RhbmNlIHBlciBtaWxsaXNlY29uZCwgcGVyIG1pbGxpc2Vjb25kIG9mIGR1cmF0aW9uIC0gYSBkaXZlcmdlbnQgc2VyaWVzLFxyXG5cdFx0XHRcdFx0XHRhbmQgc28gcmF0aGVyIHRyaWNreSB0byBtb2RlbCBvdGhlcndpc2UhXHJcblx0XHRcdFx0XHRcdFNvIHVzaW5nIHZhbHVlcyBpbiBwaXhlbHMgcGVyIG1pbGxpc2Vjb25kOlxyXG5cdFx0XHRcdFx0XHRcdHsgZGlzdGFuY2UgfSA9IHsgaW5pdGlhbCBzcGVlZCB9ICogKDEgLSAoeyBmcmljdGlvbiB9IHRvIHRoZSBwb3dlclxyXG5cdFx0XHRcdFx0XHRcdFx0b2YgeyBkdXJhdGlvbiArIDEgfSkgLyAoMSAtIHsgZnJpY3Rpb24gfSlcclxuXHRcdFx0XHRcdFx0Ki9cclxuXHJcblx0XHRcdFx0XHRcdGZsaW5nRGlzdGFuY2UgPSBtb3ZlbWVudFNwZWVkICogKDEgLSBNYXRoLnBvdyhfa0ZyaWN0aW9uLCBmbGluZ0R1cmF0aW9uICsgMSkpIC8gKDEgLSBfa0ZyaWN0aW9uKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBEZXRlcm1pbmUgYSB0YXJnZXQgZmxpbmcgcG9zaXRpb25cclxuXHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBNYXRoLmZsb29yKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKyBmbGluZ0Rpc3RhbmNlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiBib3VuY2luZyBpcyBkaXNhYmxlZCwgYW5kIHRoZSBsYXN0IHNjcm9sbCBwb3NpdGlvbiBhbmQgZmxpbmcgcG9zaXRpb24gYXJlIGJvdGggYXQgYSBib3VuZCxcclxuXHRcdFx0XHRcdC8vIHJlc2V0IHRoZSBmbGluZyBwb3NpdGlvbiB0byB0aGUgYm91bmRcclxuXHRcdFx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5ib3VuY2luZykge1xyXG5cdFx0XHRcdFx0XHRpZiAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA9PT0gMCAmJiBmbGluZ1Bvc2l0aW9uID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSAwO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPT09IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSAmJiBmbGluZ1Bvc2l0aW9uIDwgX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSW4gcGFnaW5hdGVkIHNuYXBwaW5nIG1vZGUsIGRldGVybWluZSB0aGUgcGFnZSB0byBzbmFwIHRvIC0gbWF4aW11bVxyXG5cdFx0XHRcdFx0Ly8gb25lIHBhZ2UgaW4gZWl0aGVyIGRpcmVjdGlvbiBmcm9tIHRoZSBjdXJyZW50IHBhZ2UuXHJcblx0XHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5wYWdpbmF0ZWRTbmFwICYmIF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcclxuXHRcdFx0XHRcdFx0ZmxpbmdTdGFydFNlZ21lbnQgPSAtX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc107XHJcblx0XHRcdFx0XHRcdGlmIChfYmFzZVNlZ21lbnRbYXhpc10gPCBmbGluZ1N0YXJ0U2VnbWVudCkge1xyXG5cdFx0XHRcdFx0XHRcdGZsaW5nU3RhcnRTZWdtZW50ID0gTWF0aC5mbG9vcihmbGluZ1N0YXJ0U2VnbWVudCk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdTdGFydFNlZ21lbnQgPSBNYXRoLmNlaWwoZmxpbmdTdGFydFNlZ21lbnQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgdGFyZ2V0IHBvc2l0aW9uIHdpbGwgZW5kIHVwIGJleW9uZCBhbm90aGVyIHBhZ2UsIHRhcmdldCB0aGF0IHBhZ2UgZWRnZVxyXG5cdFx0XHRcdFx0XHRpZiAoZmxpbmdQb3NpdGlvbiA+IC0oZmxpbmdTdGFydFNlZ21lbnQgLSAxKSAqIF9zbmFwR3JpZFNpemVbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb24gKyAoZmxpbmdTdGFydFNlZ21lbnQgLSAxKSAqIF9zbmFwR3JpZFNpemVbYXhpc107XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoZmxpbmdQb3NpdGlvbiA8IC0oZmxpbmdTdGFydFNlZ21lbnQgKyAxKSAqIF9zbmFwR3JpZFNpemVbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb24gKyAoZmxpbmdTdGFydFNlZ21lbnQgKyAxKSAqIF9zbmFwR3JpZFNpemVbYXhpc107XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIGlmIHRoZSBtb3ZlbWVudCBzcGVlZCB3YXMgYWJvdmUgdGhlIG1pbmltdW0gdmVsb2NpdHksIGNvbnRpbnVlXHJcblx0XHRcdFx0XHRcdC8vIGluIHRoZSBtb3ZlIGRpcmVjdGlvbi5cclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChNYXRoLmFicyhtb3ZlbWVudFNwZWVkKSA+IF9rTWluaW11bVNwZWVkKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIERldGVybWluZSB0aGUgdGFyZ2V0IHNlZ21lbnRcclxuXHRcdFx0XHRcdFx0XHRpZiAobW92ZW1lbnRTcGVlZCA8IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBNYXRoLmZsb29yKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdKSAqIF9zbmFwR3JpZFNpemVbYXhpc107XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBNYXRoLmNlaWwoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc10pICogX3NuYXBHcmlkU2l6ZVtheGlzXTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBNYXRoLm1pbihfaW5zdGFuY2VPcHRpb25zLm1heEZsaW5nRHVyYXRpb24sIGZsaW5nRHVyYXRpb24gKiAoZmxpbmdQb3NpdGlvbiAtIF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10pIC8gZmxpbmdEaXN0YW5jZSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBJbiBub24tcGFnaW5hdGVkIHNuYXBwaW5nIG1vZGUsIHNuYXAgdG8gdGhlIG5lYXJlc3QgZ3JpZCBsb2NhdGlvbiB0byB0aGUgdGFyZ2V0XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcclxuXHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uIC0gKE1hdGgucm91bmQoZmxpbmdQb3NpdGlvbiAvIF9zbmFwR3JpZFNpemVbYXhpc10pICogX3NuYXBHcmlkU2l6ZVtheGlzXSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gRGVhbCB3aXRoIGNhc2VzIHdoZXJlIHRoZSB0YXJnZXQgaXMgYmV5b25kIHRoZSBib3VuZHNcclxuXHRcdFx0XHRcdGlmIChmbGluZ1Bvc2l0aW9uIC0gYm91bmNlRGlzdGFuY2UgPiAwKSB7XHJcblx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbjtcclxuXHRcdFx0XHRcdFx0Ym91bmRzQm91bmNlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoZmxpbmdQb3NpdGlvbiAtIGJvdW5jZURpc3RhbmNlIDwgX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiAtIF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXTtcclxuXHRcdFx0XHRcdFx0Ym91bmRzQm91bmNlID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBBbWVuZCB0aGUgcG9zaXRpb25zIGFuZCBiZXppZXIgY3VydmUgaWYgbmVjZXNzYXJ5XHJcblx0XHRcdFx0XHRpZiAoYm91bmNlRGlzdGFuY2UpIHtcclxuXHJcblx0XHRcdFx0XHRcdC8vIElmIHRoZSBmbGluZyBtb3ZlcyB0aGUgc2Nyb2xsZXIgYmV5b25kIHRoZSBub3JtYWwgc2Nyb2xsIGJvdW5kcywgYW5kXHJcblx0XHRcdFx0XHRcdC8vIHRoZSBib3VuY2UgaXMgc25hcHBpbmcgdGhlIHNjcm9sbCBiYWNrIGFmdGVyIHRoZSBmbGluZzpcclxuXHRcdFx0XHRcdFx0aWYgKGJvdW5kc0JvdW5jZSAmJiBfaW5zdGFuY2VPcHRpb25zLmJvdW5jaW5nICYmIGZsaW5nRGlzdGFuY2UpIHtcclxuXHRcdFx0XHRcdFx0XHRmbGluZ0Rpc3RhbmNlID0gTWF0aC5mbG9vcihmbGluZ0Rpc3RhbmNlKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPiAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiAtIE1hdGgubWF4KDAsIF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10pO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiAtIE1hdGgubWluKF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSwgX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGJhc2VGbGluZ0NvbXBvbmVudCA9IGZsaW5nRGlzdGFuY2UgLSBiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBEZXRlcm1pbmUgdGhlIHRpbWUgcHJvcG9ydGlvbiB0aGUgb3JpZ2luYWwgYm91bmQgaXMgYWxvbmcgdGhlIGZsaW5nIGN1cnZlXHJcblx0XHRcdFx0XHRcdFx0aWYgKCFmbGluZ0Rpc3RhbmNlIHx8ICFmbGluZ0R1cmF0aW9uKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aW1lUHJvcG9ydGlvbiA9IDA7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRpbWVQcm9wb3J0aW9uID0gZmxpbmdCZXppZXIuX2dldENvb3JkaW5hdGVGb3JUKGZsaW5nQmV6aWVyLmdldFRGb3JZKChmbGluZ0Rpc3RhbmNlIC0gYmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZSkgLyBmbGluZ0Rpc3RhbmNlLCAxIC8gZmxpbmdEdXJhdGlvbiksIGZsaW5nQmV6aWVyLl9wMS54LCBmbGluZ0Jlemllci5fcDIueCk7XHJcblx0XHRcdFx0XHRcdFx0XHRib3VuZHNDcm9zc0RlbGF5ID0gdGltZVByb3BvcnRpb24gKiBmbGluZ0R1cmF0aW9uO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gRWlnaHRoIHRoZSBkaXN0YW5jZSBiZXlvbmRzIHRoZSBib3VuZHNcclxuXHRcdFx0XHRcdFx0XHRtb2RpZmllZERpc3RhbmNlID0gTWF0aC5jZWlsKGJleW9uZEJvdW5kc0ZsaW5nRGlzdGFuY2UgLyA4KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gRnVydGhlciBsaW1pdCB0aGUgYm91bmNlIHRvIGhhbGYgdGhlIGNvbnRhaW5lciBkaW1lbnNpb25zXHJcblx0XHRcdFx0XHRcdFx0aWYgKE1hdGguYWJzKG1vZGlmaWVkRGlzdGFuY2UpID4gX21ldHJpY3MuY29udGFpbmVyW2F4aXNdIC8gMikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKG1vZGlmaWVkRGlzdGFuY2UgPCAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1vZGlmaWVkRGlzdGFuY2UgPSAtTWF0aC5mbG9vcihfbWV0cmljcy5jb250YWluZXJbYXhpc10gLyAyKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1vZGlmaWVkRGlzdGFuY2UgPSBNYXRoLmZsb29yKF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSAvIDIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPiAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRib3VuY2VUYXJnZXQgPSAwO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRib3VuY2VUYXJnZXQgPSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc107XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgZW50aXJlIGZsaW5nIGlzIGEgYm91bmNlLCBtb2RpZnkgYXBwcm9wcmlhdGVseVxyXG5cdFx0XHRcdFx0XHRcdGlmICh0aW1lUHJvcG9ydGlvbiA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IGZsaW5nRHVyYXRpb24gLyA2O1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKyBiYXNlRmxpbmdDb21wb25lbnQgKyBtb2RpZmllZERpc3RhbmNlO1xyXG5cdFx0XHRcdFx0XHRcdFx0Ym91bmNlRGVsYXkgPSBmbGluZ0R1cmF0aW9uO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIHRha2UgYSBuZXcgY3VydmUgYW5kIGFkZCBpdCB0byB0aGUgdGltZW91dCBzdGFjayBmb3IgdGhlIGJvdW5jZVxyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gVGhlIG5ldyBib3VuY2UgZGVsYXkgaXMgdGhlIHByZS1ib3VuZGFyeSBmbGluZyBkdXJhdGlvbiwgcGx1cyBhXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBzaXh0aCBvZiB0aGUgcG9zdC1ib3VuZGFyeSBmbGluZy5cclxuXHRcdFx0XHRcdFx0XHRcdGJvdW5jZURlbGF5ID0gKHRpbWVQcm9wb3J0aW9uICsgKCgxIC0gdGltZVByb3BvcnRpb24pIC8gNikpICogZmxpbmdEdXJhdGlvbjtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRfc2NoZWR1bGVBeGlzUG9zaXRpb24oYXhpcywgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKyBiYXNlRmxpbmdDb21wb25lbnQgKyBtb2RpZmllZERpc3RhbmNlKSwgKCgxIC0gdGltZVByb3BvcnRpb24pICogZmxpbmdEdXJhdGlvbiAvIDYpLCBfaW5zdGFuY2VPcHRpb25zLmJvdW5jZURlY2VsZXJhdGlvbkJlemllciwgYm91bmRzQ3Jvc3NEZWxheSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gTW9kaWZ5IHRoZSBmbGluZyB0byBtYXRjaCwgY2xpcHBpbmcgdG8gcHJldmVudCBvdmVyLWZsaW5nXHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0JlemllciA9IGZsaW5nQmV6aWVyLmRpdmlkZUF0WChib3VuY2VEZWxheSAvIGZsaW5nRHVyYXRpb24sIDEgLyBmbGluZ0R1cmF0aW9uKVswXTtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBib3VuY2VEZWxheTtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSArIGJhc2VGbGluZ0NvbXBvbmVudCArIG1vZGlmaWVkRGlzdGFuY2UpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIElmIHRoZSBmbGluZyByZXF1aXJlcyBzbmFwcGluZyB0byBhIHNuYXAgbG9jYXRpb24sIGFuZCB0aGUgYm91bmNlIG5lZWRzIHRvXHJcblx0XHRcdFx0XHRcdC8vIHJldmVyc2UgdGhlIGZsaW5nIGRpcmVjdGlvbiBhZnRlciB0aGUgZmxpbmcgY29tcGxldGVzOlxyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKChmbGluZ0Rpc3RhbmNlIDwgMCAmJiBib3VuY2VEaXN0YW5jZSA8IGZsaW5nRGlzdGFuY2UpIHx8IChmbGluZ0Rpc3RhbmNlID4gMCAmJiBib3VuY2VEaXN0YW5jZSA+IGZsaW5nRGlzdGFuY2UpKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIFNob3J0ZW4gdGhlIG9yaWdpbmFsIGZsaW5nIGR1cmF0aW9uIHRvIHJlZmxlY3QgdGhlIGJvdW5jZVxyXG5cdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBmbGluZ1Bvc2l0aW9uIC0gTWF0aC5mbG9vcihmbGluZ0Rpc3RhbmNlIC8gMik7XHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBib3VuY2VEaXN0YW5jZSAtIE1hdGguZmxvb3IoZmxpbmdEaXN0YW5jZSAvIDIpO1xyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZUR1cmF0aW9uID0gTWF0aC5zcXJ0KE1hdGguYWJzKGJvdW5jZURpc3RhbmNlKSkgKiA1MDtcclxuXHRcdFx0XHRcdFx0XHRib3VuY2VUYXJnZXQgPSBmbGluZ1Bvc2l0aW9uIC0gYm91bmNlRGlzdGFuY2U7XHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IDM1MDtcclxuXHRcdFx0XHRcdFx0XHRib3VuY2VEZWxheSA9IGZsaW5nRHVyYXRpb24gKiAwLjk3O1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhlIGJvdW5jZSBpcyB0cnVuY2F0aW5nIHRoZSBmbGluZywgb3IgY29udGludWluZyB0aGUgZmxpbmcgb24gaW4gdGhlIHNhbWVcclxuXHRcdFx0XHRcdFx0Ly8gZGlyZWN0aW9uIHRvIGhpdCB0aGUgbmV4dCBib3VuZGFyeTpcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gZmxpbmdQb3NpdGlvbiAtIGJvdW5jZURpc3RhbmNlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBJZiB0aGVyZSB3YXMgbm8gZmxpbmcgZGlzdGFuY2Ugb3JpZ2luYWxseSwgdXNlIHRoZSBib3VuY2UgZGV0YWlsc1xyXG5cdFx0XHRcdFx0XHRcdGlmICghZmxpbmdEaXN0YW5jZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IGJvdW5jZUR1cmF0aW9uO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBJZiB0cnVuY2F0aW5nIHRoZSBmbGluZyBhdCBhIHNuYXBwaW5nIGVkZ2U6XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICgoZmxpbmdEaXN0YW5jZSA8IDAgJiYgYm91bmNlRGlzdGFuY2UgPCAwKSB8fCAoZmxpbmdEaXN0YW5jZSA+IDAgJiYgYm91bmNlRGlzdGFuY2UgPiAwKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGltZVByb3BvcnRpb24gPSBmbGluZ0Jlemllci5fZ2V0Q29vcmRpbmF0ZUZvclQoZmxpbmdCZXppZXIuZ2V0VEZvclkoKE1hdGguYWJzKGZsaW5nRGlzdGFuY2UpIC0gTWF0aC5hYnMoYm91bmNlRGlzdGFuY2UpKSAvIE1hdGguYWJzKGZsaW5nRGlzdGFuY2UpLCAxIC8gZmxpbmdEdXJhdGlvbiksIGZsaW5nQmV6aWVyLl9wMS54LCBmbGluZ0Jlemllci5fcDIueCk7XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0JlemllciA9IGZsaW5nQmV6aWVyLmRpdmlkZUF0WCh0aW1lUHJvcG9ydGlvbiwgMSAvIGZsaW5nRHVyYXRpb24pWzBdO1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IE1hdGgucm91bmQoZmxpbmdEdXJhdGlvbiAqIHRpbWVQcm9wb3J0aW9uKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gSWYgZXh0ZW5kaW5nIHRoZSBmbGluZyB0byByZWFjaCB0aGUgbmV4dCBzbmFwcGluZyBib3VuZGFyeSwgbm8gZnVydGhlclxyXG5cdFx0XHRcdFx0XHRcdC8vIGFjdGlvbiBpcyByZXF1aXJlZC5cclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gMDtcclxuXHRcdFx0XHRcdFx0XHRib3VuY2VEdXJhdGlvbiA9IDA7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBJZiBubyBmbGluZyBvciBib3VuY2UgaXMgcmVxdWlyZWQsIGNvbnRpbnVlXHJcblx0XHRcdFx0XHRpZiAoZmxpbmdQb3NpdGlvbiA9PT0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAmJiAhYm91bmNlRGlzdGFuY2UpIHtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRtb3ZlUmVxdWlyZWQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdC8vIFBlcmZvcm0gdGhlIGZsaW5nXHJcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIGZsaW5nUG9zaXRpb24sIGZsaW5nRHVyYXRpb24sIGZsaW5nQmV6aWVyLCBib3VuZHNDcm9zc0RlbGF5KTtcclxuXHJcblx0XHRcdFx0XHQvLyBTY2hlZHVsZSBhIGJvdW5jZSBpZiBhcHByb3ByaWF0ZVxyXG5cdFx0XHRcdFx0aWYgKGJvdW5jZURpc3RhbmNlICYmIGJvdW5jZUR1cmF0aW9uKSB7XHJcblx0XHRcdFx0XHRcdF9zY2hlZHVsZUF4aXNQb3NpdGlvbihheGlzLCBib3VuY2VUYXJnZXQsIGJvdW5jZUR1cmF0aW9uLCBfaW5zdGFuY2VPcHRpb25zLmJvdW5jZUJlemllciwgYm91bmNlRGVsYXkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdG1heEFuaW1hdGlvblRpbWUgPSBNYXRoLm1heChtYXhBbmltYXRpb25UaW1lLCBib3VuY2VEaXN0YW5jZSA/IChib3VuY2VEZWxheSArIGJvdW5jZUR1cmF0aW9uKSA6IGZsaW5nRHVyYXRpb24pO1xyXG5cdFx0XHRcdFx0c2Nyb2xsUG9zaXRpb25zVG9BcHBseVtheGlzXSA9IChib3VuY2VUYXJnZXQgPT09IGZhbHNlKSA/IGZsaW5nUG9zaXRpb24gOiBib3VuY2VUYXJnZXQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAobW92ZVJlcXVpcmVkICYmIG1heEFuaW1hdGlvblRpbWUpIHtcclxuXHRcdFx0XHRfdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHZhciBhbkF4aXM7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBzdG9yZWQgc2Nyb2xsIHBvc2l0aW9uIHJlYWR5IGZvciBmaW5hbGlzaW5nXHJcblx0XHRcdFx0XHRmb3IgKGFuQXhpcyBpbiBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5KSB7XHJcblx0XHRcdFx0XHRcdGlmIChzY3JvbGxQb3NpdGlvbnNUb0FwcGx5Lmhhc093blByb3BlcnR5KGFuQXhpcykpIHtcclxuXHRcdFx0XHRcdFx0XHRfbGFzdFNjcm9sbFBvc2l0aW9uW2FuQXhpc10gPSBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5W2FuQXhpc107XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRfZmluYWxpemVTY3JvbGwoKTtcclxuXHRcdFx0XHR9LCBtYXhBbmltYXRpb25UaW1lKSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBtb3ZlUmVxdWlyZWQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQm91bmNlIGJhY2sgaW50byBib3VuZHMgaWYgbmVjZXNzYXJ5LCBvciBzbmFwIHRvIGEgZ3JpZCBsb2NhdGlvbi5cclxuXHRcdCAqL1xyXG5cdFx0X3NuYXBTY3JvbGwgPSBmdW5jdGlvbiBfc25hcFNjcm9sbChzY3JvbGxDYW5jZWxsZWQpIHtcclxuXHRcdFx0dmFyIGF4aXM7XHJcblx0XHRcdHZhciBzbmFwRHVyYXRpb24gPSBzY3JvbGxDYW5jZWxsZWQgPyAxMDAgOiAzNTA7XHJcblx0XHRcdHZhciB0YXJnZXRQb3NpdGlvbiA9IF9sYXN0U2Nyb2xsUG9zaXRpb247XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIHNlZSBpZiBhIHNuYXAgaXMgcmVxdWlyZWRcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcclxuXHJcblx0XHRcdFx0Ly8gU3RvcmUgY3VycmVudCBzbmFwIGluZGV4XHJcblx0XHRcdFx0X3NuYXBJbmRleCA9IF9nZXRTbmFwSW5kZXhGb3JQb3NpdGlvbih0YXJnZXRQb3NpdGlvbik7XHJcblx0XHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBfZ2V0U25hcFBvc2l0aW9uRm9ySW5kZXhlcyhfc25hcEluZGV4LCB0YXJnZXRQb3NpdGlvbik7XHJcblx0XHRcdH1cclxuXHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBfbGltaXRUb0JvdW5kcyh0YXJnZXRQb3NpdGlvbik7XHJcblxyXG5cdFx0XHR2YXIgc25hcFJlcXVpcmVkID0gZmFsc2U7XHJcblx0XHRcdGZvciAoYXhpcyBpbiBfYmFzZVNjcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9iYXNlU2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdGlmICh0YXJnZXRQb3NpdGlvbltheGlzXSAhPT0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRzbmFwUmVxdWlyZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIXNuYXBSZXF1aXJlZCkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUGVyZm9ybSB0aGUgc25hcFxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX2Jhc2VTY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfYmFzZVNjcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIHRhcmdldFBvc2l0aW9uW2F4aXNdLCBzbmFwRHVyYXRpb24pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X3RpbWVvdXRzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblxyXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc3RvcmVkIHNjcm9sbCBwb3NpdGlvbiByZWFkeSBmb3IgZmluYWxpemluZ1xyXG5cdFx0XHRcdF9sYXN0U2Nyb2xsUG9zaXRpb24gPSB0YXJnZXRQb3NpdGlvbjtcclxuXHJcblx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKHNjcm9sbENhbmNlbGxlZCk7XHJcblx0XHRcdH0sIHNuYXBEdXJhdGlvbikpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogR2V0IGFuIGFwcHJvcHJpYXRlIHNuYXAgaW5kZXggZm9yIGEgc3VwcGxpZWQgcG9pbnQuXHJcblx0XHQgKi9cclxuXHRcdF9nZXRTbmFwSW5kZXhGb3JQb3NpdGlvbiA9IGZ1bmN0aW9uIF9nZXRTbmFwSW5kZXhGb3JQb3NpdGlvbihjb29yZGluYXRlcykge1xyXG5cdFx0XHR2YXIgYXhpcztcclxuXHRcdFx0dmFyIGluZGV4ZXMgPSB7eDogMCwgeTogMH07XHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpICYmIF9zbmFwR3JpZFNpemVbYXhpc10pIHtcclxuXHRcdFx0XHRcdGluZGV4ZXNbYXhpc10gPSBNYXRoLnJvdW5kKGNvb3JkaW5hdGVzW2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBpbmRleGVzO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEdldCBhbiBhcHByb3ByaWF0ZSBzbmFwIHBvaW50IGZvciBhIHN1cHBsaWVkIGluZGV4LlxyXG5cdFx0ICovXHJcblx0XHRfZ2V0U25hcFBvc2l0aW9uRm9ySW5kZXhlcyA9IGZ1bmN0aW9uIF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzKGluZGV4ZXMsIGN1cnJlbnRDb29yZGluYXRlcykge1xyXG5cdFx0XHR2YXIgYXhpcztcclxuXHRcdFx0dmFyIGNvb3JkaW5hdGVzVG9SZXR1cm4gPSB7XHJcblx0XHRcdFx0eDogY3VycmVudENvb3JkaW5hdGVzLngsXHJcblx0XHRcdFx0eTogY3VycmVudENvb3JkaW5hdGVzLnlcclxuXHRcdFx0fTtcclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdGNvb3JkaW5hdGVzVG9SZXR1cm5bYXhpc10gPSBpbmRleGVzW2F4aXNdICogX3NuYXBHcmlkU2l6ZVtheGlzXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGNvb3JkaW5hdGVzVG9SZXR1cm47XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogTGltaXQgY29vcmRpbmF0ZXMgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIHNjcm9sbGFibGUgdmlld3BvcnQuXHJcblx0XHQgKi9cclxuXHRcdF9saW1pdFRvQm91bmRzID0gZnVuY3Rpb24gX2xpbWl0VG9Cb3VuZHMoY29vcmRpbmF0ZXMpIHtcclxuXHRcdFx0dmFyIGF4aXM7XHJcblx0XHRcdHZhciBjb29yZGluYXRlc1RvUmV0dXJuID0geyB4OiBjb29yZGluYXRlcy54LCB5OiBjb29yZGluYXRlcy55IH07XHJcblxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIHRoZSBjb29yZGluYXRlIGlzIGJleW9uZCB0aGUgZWRnZXMgb2YgdGhlIHNjcm9sbGVyLCB1c2UgdGhlIGNsb3Nlc3QgZWRnZVxyXG5cdFx0XHRcdFx0aWYgKGNvb3JkaW5hdGVzW2F4aXNdID4gMCkge1xyXG5cdFx0XHRcdFx0XHRjb29yZGluYXRlc1RvUmV0dXJuW2F4aXNdID0gMDtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoY29vcmRpbmF0ZXNbYXhpc10gPCBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0Y29vcmRpbmF0ZXNUb1JldHVybltheGlzXSA9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXTtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gY29vcmRpbmF0ZXNUb1JldHVybjtcclxuXHRcdH07XHJcblxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogU2V0cyB1cCB0aGUgRE9NIGFyb3VuZCB0aGUgbm9kZSB0byBiZSBzY3JvbGxlZC5cclxuXHRcdCAqL1xyXG5cdFx0X2luaXRpYWxpemVET00gPSBmdW5jdGlvbiBfaW5pdGlhbGl6ZURPTSgpIHtcclxuXHRcdFx0dmFyIG9mZnNjcmVlbkZyYWdtZW50LCBvZmZzY3JlZW5Ob2RlLCBzY3JvbGxZUGFyZW50O1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgd2hldGhlciB0aGUgRE9NIGlzIGFscmVhZHkgcHJlc2VudCBhbmQgdmFsaWQgLSBpZiBzbywgbm8gZnVydGhlciBhY3Rpb24gcmVxdWlyZWQuXHJcblx0XHRcdGlmIChfZXhpc3RpbmdET01WYWxpZCgpKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBPdGhlcndpc2UsIHRoZSBET00gbmVlZHMgdG8gYmUgY3JlYXRlZCBpbnNpZGUgdGhlIG9yaWdpbmFsbHkgc3VwcGxpZWQgbm9kZS4gIFRoZSBub2RlXHJcblx0XHRcdC8vIGhhcyBhIGNvbnRhaW5lciBpbnNlcnRlZCBpbnNpZGUgaXQgLSB3aGljaCBhY3RzIGFzIGFuIGFuY2hvciBlbGVtZW50IHdpdGggY29uc3RyYWludHMgLVxyXG5cdFx0XHQvLyBhbmQgdGhlbiB0aGUgc2Nyb2xsYWJsZSBsYXllcnMgYXMgYXBwcm9wcmlhdGUuXHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgYSBuZXcgZG9jdW1lbnQgZnJhZ21lbnQgdG8gdGVtcG9yYXJpbHkgaG9sZCB0aGUgc2Nyb2xsYWJsZSBjb250ZW50XHJcblx0XHRcdG9mZnNjcmVlbkZyYWdtZW50ID0gX3Njcm9sbGFibGVNYXN0ZXJOb2RlLm93bmVyRG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cdFx0XHRvZmZzY3JlZW5Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnRElWJyk7XHJcblx0XHRcdG9mZnNjcmVlbkZyYWdtZW50LmFwcGVuZENoaWxkKG9mZnNjcmVlbk5vZGUpO1xyXG5cclxuXHRcdFx0Ly8gRHJvcCBpbiB0aGUgd3JhcHBpbmcgSFRNTFxyXG5cdFx0XHRvZmZzY3JlZW5Ob2RlLmlubmVySFRNTCA9IEZUU2Nyb2xsZXIucHJvdG90eXBlLmdldFByZXBlbmRlZEhUTUwoIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCwgIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSwgX2luc3RhbmNlT3B0aW9ucy5od0FjY2VsZXJhdGlvbkNsYXNzKSArIEZUU2Nyb2xsZXIucHJvdG90eXBlLmdldEFwcGVuZGVkSFRNTCghX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYLCAhX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZLCBfaW5zdGFuY2VPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3MsIF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycyk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgcmVmZXJlbmNlcyBhcyBhcHByb3ByaWF0ZVxyXG5cdFx0XHRfY29udGFpbmVyTm9kZSA9IG9mZnNjcmVlbk5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcblx0XHRcdHNjcm9sbFlQYXJlbnQgPSBfY29udGFpbmVyTm9kZTtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCkge1xyXG5cdFx0XHRcdF9zY3JvbGxOb2Rlcy54ID0gX2NvbnRhaW5lck5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcblx0XHRcdFx0c2Nyb2xsWVBhcmVudCA9IF9zY3JvbGxOb2Rlcy54O1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy54ID0gX2NvbnRhaW5lck5vZGUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZnRzY3JvbGxlcl9zY3JvbGxiYXJ4JylbMF07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kpIHtcclxuXHRcdFx0XHRfc2Nyb2xsTm9kZXMueSA9IHNjcm9sbFlQYXJlbnQuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnkgPSBfY29udGFpbmVyTm9kZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdmdHNjcm9sbGVyX3Njcm9sbGJhcnknKVswXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlID0gX3Njcm9sbE5vZGVzLnk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlID0gX3Njcm9sbE5vZGVzLng7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRha2UgdGhlIGNvbnRlbnRzIG9mIHRoZSBzY3JvbGxhYmxlIGVsZW1lbnQsIGFuZCBjb3B5IHRoZW0gaW50byB0aGUgbmV3IGNvbnRhaW5lclxyXG5cdFx0XHR3aGlsZSAoX3Njcm9sbGFibGVNYXN0ZXJOb2RlLmZpcnN0Q2hpbGQpIHtcclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoX3Njcm9sbGFibGVNYXN0ZXJOb2RlLmZpcnN0Q2hpbGQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBNb3ZlIHRoZSB3cmFwcGVkIGVsZW1lbnRzIGJhY2sgaW50byB0aGUgZG9jdW1lbnRcclxuXHRcdFx0X3Njcm9sbGFibGVNYXN0ZXJOb2RlLmFwcGVuZENoaWxkKF9jb250YWluZXJOb2RlKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBBdHRlbXB0cyB0byB1c2UgYW55IGV4aXN0aW5nIERPTSBzY3JvbGxlciBub2RlcyBpZiBwb3NzaWJsZSwgcmV0dXJuaW5nIHRydWUgaWYgc287XHJcblx0XHQgKiB1cGRhdGVzIGFsbCBpbnRlcm5hbCBlbGVtZW50IHJlZmVyZW5jZXMuXHJcblx0XHQgKi9cclxuXHRcdF9leGlzdGluZ0RPTVZhbGlkID0gZnVuY3Rpb24gX2V4aXN0aW5nRE9NVmFsaWQoKSB7XHJcblx0XHRcdHZhciBzY3JvbGxlckNvbnRhaW5lciwgbGF5ZXJYLCBsYXllclksIHlQYXJlbnQsIHNjcm9sbGVyWCwgc2Nyb2xsZXJZLCBjYW5kaWRhdGVzLCBpLCBsO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdGhhdCB0aGVyZSdzIGFuIGluaXRpYWwgY2hpbGQgbm9kZSwgYW5kIG1ha2Ugc3VyZSBpdCdzIHRoZSBjb250YWluZXIgY2xhc3NcclxuXHRcdFx0c2Nyb2xsZXJDb250YWluZXIgPSBfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcblx0XHRcdGlmICghc2Nyb2xsZXJDb250YWluZXIgfHwgc2Nyb2xsZXJDb250YWluZXIuY2xhc3NOYW1lLmluZGV4T2YoJ2Z0c2Nyb2xsZXJfY29udGFpbmVyJykgPT09IC0xKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB4LWF4aXMgc2Nyb2xsaW5nIGlzIGVuYWJsZWQsIGZpbmQgYW5kIHZlcmlmeSB0aGUgeCBzY3JvbGxlciBsYXllclxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XHJcblxyXG5cdFx0XHRcdC8vIEZpbmQgYW5kIHZlcmlmeSB0aGUgeCBzY3JvbGxlciBsYXllclxyXG5cdFx0XHRcdGxheWVyWCA9IHNjcm9sbGVyQ29udGFpbmVyLmZpcnN0RWxlbWVudENoaWxkO1xyXG5cdFx0XHRcdGlmICghbGF5ZXJYIHx8IGxheWVyWC5jbGFzc05hbWUuaW5kZXhPZignZnRzY3JvbGxlcl94JykgPT09IC0xKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHlQYXJlbnQgPSBsYXllclg7XHJcblxyXG5cdFx0XHRcdC8vIEZpbmQgYW5kIHZlcmlmeSB0aGUgeCBzY3JvbGxiYXIgaWYgZW5hYmxlZFxyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRcdGNhbmRpZGF0ZXMgPSBzY3JvbGxlckNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdmdHNjcm9sbGVyX3Njcm9sbGJhcngnKTtcclxuXHRcdFx0XHRcdGlmIChjYW5kaWRhdGVzKSB7XHJcblx0XHRcdFx0XHRcdGZvciAoaSA9IDAsIGwgPSBjYW5kaWRhdGVzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChjYW5kaWRhdGVzW2ldLnBhcmVudE5vZGUgPT09IHNjcm9sbGVyQ29udGFpbmVyKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzY3JvbGxlclggPSBjYW5kaWRhdGVzW2ldO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoIXNjcm9sbGVyWCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHlQYXJlbnQgPSBzY3JvbGxlckNvbnRhaW5lcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgeS1heGlzIHNjcm9sbGluZyBpcyBlbmFibGVkLCBmaW5kIGFuZCB2ZXJpZnkgdGhlIHkgc2Nyb2xsZXIgbGF5ZXJcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSkge1xyXG5cclxuXHRcdFx0XHQvLyBGaW5kIGFuZCB2ZXJpZnkgdGhlIHggc2Nyb2xsZXIgbGF5ZXJcclxuXHRcdFx0XHRsYXllclkgPSB5UGFyZW50LmZpcnN0RWxlbWVudENoaWxkO1xyXG5cdFx0XHRcdGlmICghbGF5ZXJZIHx8IGxheWVyWS5jbGFzc05hbWUuaW5kZXhPZignZnRzY3JvbGxlcl95JykgPT09IC0xKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBGaW5kIGFuZCB2ZXJpZnkgdGhlIHkgc2Nyb2xsYmFyIGlmIGVuYWJsZWRcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0XHRjYW5kaWRhdGVzID0gc2Nyb2xsZXJDb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZnRzY3JvbGxlcl9zY3JvbGxiYXJ5Jyk7XHJcblx0XHRcdFx0XHRpZiAoY2FuZGlkYXRlcykge1xyXG5cdFx0XHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gY2FuZGlkYXRlcy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoY2FuZGlkYXRlc1tpXS5wYXJlbnROb2RlID09PSBzY3JvbGxlckNvbnRhaW5lcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2Nyb2xsZXJZID0gY2FuZGlkYXRlc1tpXTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKCFzY3JvbGxlclkpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRWxlbWVudHMgZm91bmQgYW5kIHZlcmlmaWVkIC0gdXBkYXRlIHRoZSByZWZlcmVuY2VzIGFuZCByZXR1cm4gc3VjY2Vzc1xyXG5cdFx0XHRfY29udGFpbmVyTm9kZSA9IHNjcm9sbGVyQ29udGFpbmVyO1xyXG5cdFx0XHRpZiAobGF5ZXJYKSB7XHJcblx0XHRcdFx0X3Njcm9sbE5vZGVzLnggPSBsYXllclg7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGxheWVyWSkge1xyXG5cdFx0XHRcdF9zY3JvbGxOb2Rlcy55ID0gbGF5ZXJZO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChzY3JvbGxlclgpIHtcclxuXHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXMueCA9IHNjcm9sbGVyWDtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoc2Nyb2xsZXJZKSB7XHJcblx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnkgPSBzY3JvbGxlclk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSkge1xyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IGxheWVyWTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUgPSBsYXllclg7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdF9kb21DaGFuZ2VkID0gZnVuY3Rpb24gX2RvbUNoYW5nZWQoZSkge1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIHRpbWVyIGlzIGFjdGl2ZSwgY2xlYXIgaXRcclxuXHRcdFx0aWYgKF9kb21DaGFuZ2VEZWJvdW5jZXIpIHtcclxuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF9kb21DaGFuZ2VEZWJvdW5jZXIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFjdCB0byByZXNpemVzIGF0IG9uY2VcclxuXHRcdFx0aWYgKGUgJiYgZS50eXBlID09PSAncmVzaXplJykge1xyXG5cdFx0XHRcdF91cGRhdGVEaW1lbnNpb25zKCk7XHJcblxyXG5cdFx0XHQvLyBGb3Igb3RoZXIgY2hhbmdlcywgd2hpY2ggbWF5IG9jY3VyIGluIGdyb3Vwcywgc2V0IHVwIHRoZSBET00gY2hhbmdlZCB0aW1lclxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdF9kb21DaGFuZ2VEZWJvdW5jZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdF91cGRhdGVEaW1lbnNpb25zKCk7XHJcblx0XHRcdFx0fSwgMTAwKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRfdXBkYXRlRGltZW5zaW9ucyA9IGZ1bmN0aW9uIF91cGRhdGVEaW1lbnNpb25zKGlnbm9yZVNuYXBTY3JvbGwpIHtcclxuXHRcdFx0dmFyIGF4aXM7XHJcblxyXG5cdFx0XHQvLyBPbmx5IHVwZGF0ZSBkaW1lbnNpb25zIGlmIHRoZSBjb250YWluZXIgbm9kZSBleGlzdHMgKERPTSBlbGVtZW50cyBjYW4gZ28gYXdheSBpZlxyXG5cdFx0XHQvLyB0aGUgc2Nyb2xsZXIgaW5zdGFuY2UgaXMgbm90IGRlc3Ryb3llZCBjb3JyZWN0bHkpXHJcblx0XHRcdGlmICghX2NvbnRhaW5lck5vZGUgfHwgIV9jb250ZW50UGFyZW50Tm9kZSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKF9kb21DaGFuZ2VEZWJvdW5jZXIpIHtcclxuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF9kb21DaGFuZ2VEZWJvdW5jZXIpO1xyXG5cdFx0XHRcdF9kb21DaGFuZ2VEZWJvdW5jZXIgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgY29udGFpbmVyV2lkdGgsIGNvbnRhaW5lckhlaWdodCwgc3RhcnRBbGlnbm1lbnRzO1xyXG5cclxuXHRcdFx0Ly8gSWYgYSBtYW51YWwgc2Nyb2xsIGlzIGluIHByb2dyZXNzLCBjYW5jZWwgaXRcclxuXHRcdFx0X2VuZFNjcm9sbChEYXRlLm5vdygpKTtcclxuXHJcblx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgc3RhcnRpbmcgYWxpZ25tZW50IGZvciBjb21wYXJpc29uIGxhdGVyXHJcblx0XHRcdHN0YXJ0QWxpZ25tZW50cyA9IHsgeDogZmFsc2UsIHk6IGZhbHNlIH07XHJcblx0XHRcdGZvciAoYXhpcyBpbiBzdGFydEFsaWdubWVudHMpIHtcclxuXHRcdFx0XHRpZiAoc3RhcnRBbGlnbm1lbnRzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRpZiAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRzdGFydEFsaWdubWVudHNbYXhpc10gPSAtMTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA8PSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0c3RhcnRBbGlnbm1lbnRzW2F4aXNdID0gMTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAqIDIgPD0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdICsgNSAmJiBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICogMiA+PSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10gLSA1KSB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0QWxpZ25tZW50c1theGlzXSA9IDA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb250YWluZXJXaWR0aCA9IF9jb250YWluZXJOb2RlLm9mZnNldFdpZHRoO1xyXG5cdFx0XHRjb250YWluZXJIZWlnaHQgPSBfY29udGFpbmVyTm9kZS5vZmZzZXRIZWlnaHQ7XHJcblxyXG5cdFx0XHQvLyBHcmFiIHRoZSBkaW1lbnNpb25zXHJcblx0XHRcdHZhciByYXdTY3JvbGxXaWR0aCA9IG9wdGlvbnMuY29udGVudFdpZHRoIHx8IF9jb250ZW50UGFyZW50Tm9kZS5vZmZzZXRXaWR0aDtcclxuXHRcdFx0dmFyIHJhd1Njcm9sbEhlaWdodCA9IG9wdGlvbnMuY29udGVudEhlaWdodCB8fCBfY29udGVudFBhcmVudE5vZGUub2Zmc2V0SGVpZ2h0O1xyXG5cdFx0XHR2YXIgc2Nyb2xsV2lkdGggPSByYXdTY3JvbGxXaWR0aDtcclxuXHRcdFx0dmFyIHNjcm9sbEhlaWdodCA9IHJhd1Njcm9sbEhlaWdodDtcclxuXHRcdFx0dmFyIHRhcmdldFBvc2l0aW9uID0geyB4OiBmYWxzZSwgeTogZmFsc2UgfTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBzbmFwIGdyaWRcclxuXHRcdFx0aWYgKCFfc25hcEdyaWRTaXplLnVzZXJYKSB7XHJcblx0XHRcdFx0X3NuYXBHcmlkU2l6ZS54ID0gY29udGFpbmVyV2lkdGg7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFfc25hcEdyaWRTaXplLnVzZXJZKSB7XHJcblx0XHRcdFx0X3NuYXBHcmlkU2l6ZS55ID0gY29udGFpbmVySGVpZ2h0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB0aGVyZSBpcyBhIGdyaWQsIGNvbmZvcm0gdG8gdGhlIGdyaWRcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcclxuXHRcdFx0XHRpZiAoX3NuYXBHcmlkU2l6ZS51c2VyWCkge1xyXG5cdFx0XHRcdFx0c2Nyb2xsV2lkdGggPSBNYXRoLmNlaWwoc2Nyb2xsV2lkdGggLyBfc25hcEdyaWRTaXplLnVzZXJYKSAqIF9zbmFwR3JpZFNpemUudXNlclg7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNjcm9sbFdpZHRoID0gTWF0aC5jZWlsKHNjcm9sbFdpZHRoIC8gX3NuYXBHcmlkU2l6ZS54KSAqIF9zbmFwR3JpZFNpemUueDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKF9zbmFwR3JpZFNpemUudXNlclkpIHtcclxuXHRcdFx0XHRcdHNjcm9sbEhlaWdodCA9IE1hdGguY2VpbChzY3JvbGxIZWlnaHQgLyBfc25hcEdyaWRTaXplLnVzZXJZKSAqIF9zbmFwR3JpZFNpemUudXNlclk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNjcm9sbEhlaWdodCA9IE1hdGguY2VpbChzY3JvbGxIZWlnaHQgLyBfc25hcEdyaWRTaXplLnkpICogX3NuYXBHcmlkU2l6ZS55O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgbm8gZGV0YWlscyBoYXZlIGNoYW5nZWQsIHJldHVybi5cclxuXHRcdFx0aWYgKF9tZXRyaWNzLmNvbnRhaW5lci54ID09PSBjb250YWluZXJXaWR0aCAmJiBfbWV0cmljcy5jb250YWluZXIueSA9PT0gY29udGFpbmVySGVpZ2h0ICYmIF9tZXRyaWNzLmNvbnRlbnQueCA9PT0gc2Nyb2xsV2lkdGggJiYgX21ldHJpY3MuY29udGVudC55ID09PSBzY3JvbGxIZWlnaHQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgc2l6ZXNcclxuXHRcdFx0X21ldHJpY3MuY29udGFpbmVyLnggPSBjb250YWluZXJXaWR0aDtcclxuXHRcdFx0X21ldHJpY3MuY29udGFpbmVyLnkgPSBjb250YWluZXJIZWlnaHQ7XHJcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQueCA9IHNjcm9sbFdpZHRoO1xyXG5cdFx0XHRfbWV0cmljcy5jb250ZW50LnJhd1ggPSByYXdTY3JvbGxXaWR0aDtcclxuXHRcdFx0X21ldHJpY3MuY29udGVudC55ID0gc2Nyb2xsSGVpZ2h0O1xyXG5cdFx0XHRfbWV0cmljcy5jb250ZW50LnJhd1kgPSByYXdTY3JvbGxIZWlnaHQ7XHJcblx0XHRcdF9tZXRyaWNzLnNjcm9sbEVuZC54ID0gY29udGFpbmVyV2lkdGggLSBzY3JvbGxXaWR0aDtcclxuXHRcdFx0X21ldHJpY3Muc2Nyb2xsRW5kLnkgPSBjb250YWluZXJIZWlnaHQgLSBzY3JvbGxIZWlnaHQ7XHJcblxyXG5cdFx0XHRfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpO1xyXG5cclxuXHRcdFx0aWYgKCFpZ25vcmVTbmFwU2Nyb2xsICYmIF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcclxuXHJcblx0XHQgICAgICAgIC8vIEVuc3VyZSBib3VuZHMgYXJlIGNvcnJlY3RcclxuXHRcdFx0XHRfdXBkYXRlU2VnbWVudHMoKTtcclxuXHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzKF9zbmFwSW5kZXgsIF9sYXN0U2Nyb2xsUG9zaXRpb24pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBcHBseSBiYXNlIGFsaWdubWVudCBpZiBhcHByb3ByaWF0ZVxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gdGFyZ2V0UG9zaXRpb24pIHtcclxuXHRcdFx0XHRpZiAodGFyZ2V0UG9zaXRpb24uaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGUgY29udGFpbmVyIGlzIHNtYWxsZXIgdGhhbiB0aGUgY29udGVudCwgZGV0ZXJtaW5lIHdoZXRoZXIgdG8gYXBwbHkgdGhlXHJcblx0XHRcdFx0XHQvLyBhbGlnbm1lbnQuICBUaGlzIG9jY3VycyBpZiBhIHNjcm9sbCBoYXMgbmV2ZXIgdGFrZW4gcGxhY2UsIG9yIGlmIHRoZSBwb3NpdGlvblxyXG5cdFx0XHRcdFx0Ly8gd2FzIHByZXZpb3VzbHkgYXQgdGhlIGNvcnJlY3QgXCJlbmRcIiBhbmQgY2FuIGJlIG1haW50YWluZWQuXHJcblx0XHRcdFx0XHRpZiAoX21ldHJpY3MuY29udGFpbmVyW2F4aXNdIDwgX21ldHJpY3MuY29udGVudFtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRpZiAoX2hhc0JlZW5TY3JvbGxlZCAmJiBfaW5zdGFuY2VPcHRpb25zLmJhc2VBbGlnbm1lbnRzW2F4aXNdICE9PSBzdGFydEFsaWdubWVudHNbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEFwcGx5IHRoZSBhbGlnbm1lbnRcclxuXHRcdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLmJhc2VBbGlnbm1lbnRzW2F4aXNdID09PSAxKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uW2F4aXNdID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfaW5zdGFuY2VPcHRpb25zLmJhc2VBbGlnbm1lbnRzW2F4aXNdID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uW2F4aXNdID0gTWF0aC5mbG9vcihfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10gLyAyKTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy5iYXNlQWxpZ25tZW50c1theGlzXSA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb25bYXhpc10gPSAwO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYICYmIHRhcmdldFBvc2l0aW9uLnggIT09IGZhbHNlKSB7XHJcblx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbigneCcsIHRhcmdldFBvc2l0aW9uLngsIDApO1xyXG5cdFx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb24ueCA9IHRhcmdldFBvc2l0aW9uLng7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSAmJiB0YXJnZXRQb3NpdGlvbi55ICE9PSBmYWxzZSkge1xyXG5cdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oJ3knLCB0YXJnZXRQb3NpdGlvbi55LCAwKTtcclxuXHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uLnkgPSB0YXJnZXRQb3NpdGlvbi55O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0fTtcclxuXHJcblx0XHRfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucyA9IGZ1bmN0aW9uIF91cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zKCkge1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHNjcm9sbGJhciBzaXplc1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCkge1xyXG5cdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnguc3R5bGUud2lkdGggPSBNYXRoLm1heCg2LCBNYXRoLnJvdW5kKF9tZXRyaWNzLmNvbnRhaW5lci54ICogKF9tZXRyaWNzLmNvbnRhaW5lci54IC8gX21ldHJpY3MuY29udGVudC54KSAtIDQpKSArICdweCc7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kpIHtcclxuXHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy55LnN0eWxlLmhlaWdodCA9IE1hdGgubWF4KDYsIE1hdGgucm91bmQoX21ldHJpY3MuY29udGFpbmVyLnkgKiAoX21ldHJpY3MuY29udGFpbmVyLnkgLyBfbWV0cmljcy5jb250ZW50LnkpIC0gNCkpICsgJ3B4JztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBzY3JvbGwgY2FjaGVzXHJcblx0XHRcdF9zY3JvbGxhYmxlQXhlcyA9IHt9O1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYICYmIChfbWV0cmljcy5jb250ZW50LnggPiBfbWV0cmljcy5jb250YWluZXIueCB8fCBfaW5zdGFuY2VPcHRpb25zLmFsd2F5c1Njcm9sbCkpIHtcclxuXHRcdFx0XHRfc2Nyb2xsYWJsZUF4ZXMueCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSAmJiAoX21ldHJpY3MuY29udGVudC55ID4gX21ldHJpY3MuY29udGFpbmVyLnkgfHwgX2luc3RhbmNlT3B0aW9ucy5hbHdheXNTY3JvbGwpKSB7XHJcblx0XHRcdFx0X3Njcm9sbGFibGVBeGVzLnkgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdF91cGRhdGVFbGVtZW50UG9zaXRpb24gPSBmdW5jdGlvbiBfdXBkYXRlRWxlbWVudFBvc2l0aW9uKCkge1xyXG5cdFx0XHR2YXIgYXhpcywgY29tcHV0ZWRTdHlsZSwgc3BsaXRTdHlsZTtcclxuXHJcblx0XHRcdC8vIFJldHJpZXZlIHRoZSBjdXJyZW50IHBvc2l0aW9uIG9mIGVhY2ggYWN0aXZlIGF4aXMuXHJcblx0XHRcdC8vIEN1c3RvbSBwYXJzaW5nIGlzIHVzZWQgaW5zdGVhZCBvZiBuYXRpdmUgbWF0cml4IHN1cHBvcnQgZm9yIHNwZWVkIGFuZCBmb3JcclxuXHRcdFx0Ly8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoX3Njcm9sbE5vZGVzW2F4aXNdLCBudWxsKVtfdmVuZG9yVHJhbnNmb3JtTG9va3VwXTtcclxuXHRcdFx0XHRcdHNwbGl0U3R5bGUgPSBjb21wdXRlZFN0eWxlLnNwbGl0KCcsICcpO1xyXG5cclxuXHRcdFx0XHRcdC8vIEZvciAyZC1zdHlsZSB0cmFuc2Zvcm1zLCBwdWxsIG91dCBlbGVtZW50cyBmb3VyIG9yIGZpdmVcclxuXHRcdFx0XHRcdGlmIChzcGxpdFN0eWxlLmxlbmd0aCA9PT0gNikge1xyXG5cdFx0XHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdID0gcGFyc2VJbnQoc3BsaXRTdHlsZVsoYXhpcyA9PT0gJ3knKSA/IDUgOiA0XSwgMTApO1xyXG5cclxuXHRcdFx0XHRcdC8vIEZvciAzZC1zdHlsZSB0cmFuc2Zvcm1zLCBwdWxsIG91dCBlbGVtZW50cyB0d2VsdmUgb3IgdGhpcnRlZW5cclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb25bYXhpc10gPSBwYXJzZUludChzcGxpdFN0eWxlWyhheGlzID09PSAneScpID8gMTMgOiAxMl0sIDEwKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPSBfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRfdXBkYXRlU2VnbWVudHMgPSBmdW5jdGlvbiBfdXBkYXRlU2VnbWVudHMoc2Nyb2xsRmluYWxpc2VkKSB7XHJcblx0XHRcdHZhciBheGlzO1xyXG5cdFx0XHR2YXIgbmV3U2VnbWVudCA9IHsgeDogMCwgeTogMCB9O1xyXG5cclxuXHRcdFx0Ly8gSWYgc25hcHBpbmcgaXMgZGlzYWJsZWQsIHJldHVybiB3aXRob3V0IGFueSBmdXJ0aGVyIGFjdGlvbiByZXF1aXJlZFxyXG5cdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgbmV3IHNlZ21lbnRzXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRuZXdTZWdtZW50W2F4aXNdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oTWF0aC5jZWlsKF9tZXRyaWNzLmNvbnRlbnRbYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdKSAtIDEsIE1hdGgucm91bmQoLV9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdKSkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSW4gYWxsIGNhc2VzIHVwZGF0ZSB0aGUgYWN0aXZlIHNlZ21lbnQgaWYgYXBwcm9wcmlhdGVcclxuXHRcdFx0aWYgKG5ld1NlZ21lbnQueCAhPT0gX2FjdGl2ZVNlZ21lbnQueCB8fCBuZXdTZWdtZW50LnkgIT09IF9hY3RpdmVTZWdtZW50LnkpIHtcclxuXHRcdFx0XHRfYWN0aXZlU2VnbWVudC54ID0gbmV3U2VnbWVudC54O1xyXG5cdFx0XHRcdF9hY3RpdmVTZWdtZW50LnkgPSBuZXdTZWdtZW50Lnk7XHJcblx0XHRcdFx0X2ZpcmVFdmVudCgnc2VnbWVudHdpbGxjaGFuZ2UnLCB7IHNlZ21lbnRYOiBuZXdTZWdtZW50LngsIHNlZ21lbnRZOiBuZXdTZWdtZW50LnkgfSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHRoZSBzY3JvbGwgaGFzIGJlZW4gZmluYWxpc2VkLCBhbHNvIHVwZGF0ZSB0aGUgYmFzZSBzZWdtZW50XHJcblx0XHRcdGlmIChzY3JvbGxGaW5hbGlzZWQpIHtcclxuXHRcdFx0XHRpZiAobmV3U2VnbWVudC54ICE9PSBfYmFzZVNlZ21lbnQueCB8fCBuZXdTZWdtZW50LnkgIT09IF9iYXNlU2VnbWVudC55KSB7XHJcblx0XHRcdFx0XHRfYmFzZVNlZ21lbnQueCA9IG5ld1NlZ21lbnQueDtcclxuXHRcdFx0XHRcdF9iYXNlU2VnbWVudC55ID0gbmV3U2VnbWVudC55O1xyXG5cdFx0XHRcdFx0X2ZpcmVFdmVudCgnc2VnbWVudGRpZGNoYW5nZScsIHsgc2VnbWVudFg6IG5ld1NlZ21lbnQueCwgc2VnbWVudFk6IG5ld1NlZ21lbnQueSB9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0X3NldEF4aXNQb3NpdGlvbiA9IGZ1bmN0aW9uIF9zZXRBeGlzUG9zaXRpb24oYXhpcywgcG9zaXRpb24sIGFuaW1hdGlvbkR1cmF0aW9uLCBhbmltYXRpb25CZXppZXIsIGJvdW5kc0Nyb3NzRGVsYXkpIHtcclxuXHRcdFx0dmFyIHRyYW5zaXRpb25DU1NTdHJpbmcsIG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgPSBudWxsO1xyXG5cclxuXHRcdFx0Ly8gT25seSB1cGRhdGUgcG9zaXRpb24gaWYgdGhlIGF4aXMgbm9kZSBleGlzdHMgKERPTSBlbGVtZW50cyBjYW4gZ28gYXdheSBpZlxyXG5cdFx0XHQvLyB0aGUgc2Nyb2xsZXIgaW5zdGFuY2UgaXMgbm90IGRlc3Ryb3llZCBjb3JyZWN0bHkpXHJcblx0XHRcdGlmICghX3Njcm9sbE5vZGVzW2F4aXNdKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBEZXRlcm1pbmUgdGhlIHRyYW5zaXRpb24gcHJvcGVydHkgdG8gYXBwbHkgdG8gYm90aCB0aGUgc2Nyb2xsIGVsZW1lbnQgYW5kIHRoZSBzY3JvbGxiYXJcclxuXHRcdFx0aWYgKGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcblx0XHRcdFx0aWYgKCFhbmltYXRpb25CZXppZXIpIHtcclxuXHRcdFx0XHRcdGFuaW1hdGlvbkJlemllciA9IF9pbnN0YW5jZU9wdGlvbnMuZmxpbmdCZXppZXI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0cmFuc2l0aW9uQ1NTU3RyaW5nID0gX3ZlbmRvckNTU1ByZWZpeCArICd0cmFuc2Zvcm0gJyArIGFuaW1hdGlvbkR1cmF0aW9uICsgJ21zICcgKyBhbmltYXRpb25CZXppZXIudG9TdHJpbmcoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0cmFuc2l0aW9uQ1NTU3RyaW5nID0gJyc7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFwcGx5IHRoZSB0cmFuc2l0aW9uIHByb3BlcnR5IHRvIGVsZW1lbnRzXHJcblx0XHRcdF9zY3JvbGxOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNpdGlvblByb3BlcnR5XSA9IHRyYW5zaXRpb25DU1NTdHJpbmc7XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXNbYXhpc10uc3R5bGVbX3RyYW5zaXRpb25Qcm9wZXJ0eV0gPSB0cmFuc2l0aW9uQ1NTU3RyaW5nO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHBvc2l0aW9uc1xyXG5cdFx0XHRfc2Nyb2xsTm9kZXNbYXhpc10uc3R5bGVbX3RyYW5zZm9ybVByb3BlcnR5XSA9IF90cmFuc2xhdGVSdWxlUHJlZml4ICsgX3RyYW5zZm9ybVByZWZpeGVzW2F4aXNdICsgcG9zaXRpb24gKyAncHgnICsgX3RyYW5zZm9ybVN1ZmZpeGVzW2F4aXNdO1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2Zvcm1Qcm9wZXJ0eV0gPSBfdHJhbnNsYXRlUnVsZVByZWZpeCArIF90cmFuc2Zvcm1QcmVmaXhlc1theGlzXSArICgtcG9zaXRpb24gKiBfbWV0cmljcy5jb250YWluZXJbYXhpc10gLyBfbWV0cmljcy5jb250ZW50W2F4aXNdKSArICdweCcgKyBfdHJhbnNmb3JtU3VmZml4ZXNbYXhpc107XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIERldGVybWluZSB3aGV0aGVyIHRoZSBzY3JvbGwgaXMgYXQgYW4gZXh0cmVtaXR5LlxyXG5cdFx0XHRpZiAocG9zaXRpb24gPj0gMCkge1xyXG5cdFx0XHRcdG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgPSAnc3RhcnQnO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHBvc2l0aW9uIDw9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xyXG5cdFx0XHRcdG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgPSAnZW5kJztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIGV4dHJlbWl0eSBzdGF0dXMgaGFzIGNoYW5nZWQsIGZpcmUgYW4gYXBwcm9wcmlhdGUgZXZlbnRcclxuXHRcdFx0aWYgKG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgIT09IF9zY3JvbGxBdEV4dHJlbWl0eVtheGlzXSkge1xyXG5cdFx0XHRcdGlmIChuZXdQb3NpdGlvbkF0RXh0cmVtaXR5ICE9PSBudWxsKSB7XHJcblx0XHRcdFx0XHRpZiAoYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0X3RpbWVvdXRzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdFx0XHRfZmlyZUV2ZW50KCdyZWFjaGVkJyArIG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHksIHsgYXhpczogYXhpcyB9KTtcclxuXHRcdFx0XHRcdFx0fSwgYm91bmRzQ3Jvc3NEZWxheSB8fCBhbmltYXRpb25EdXJhdGlvbikpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0X2ZpcmVFdmVudCgncmVhY2hlZCcgKyBuZXdQb3NpdGlvbkF0RXh0cmVtaXR5LCB7IGF4aXM6IGF4aXMgfSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdF9zY3JvbGxBdEV4dHJlbWl0eVtheGlzXSA9IG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgcmVjb3JkZWQgcG9zaXRpb24gaWYgdGhlcmUncyBubyBkdXJhdGlvblxyXG5cdFx0XHRpZiAoIWFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcblx0XHRcdFx0X2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA9IHBvc2l0aW9uO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUmV0cmlldmUgdGhlIGN1cnJlbnQgcG9zaXRpb24gYXMgYW4gb2JqZWN0IHdpdGggc2Nyb2xsTGVmdCBhbmQgc2Nyb2xsVG9wXHJcblx0XHQgKiBwcm9wZXJ0aWVzLlxyXG5cdFx0ICovXHJcblx0XHRfZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiBfZ2V0UG9zaXRpb24oKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c2Nyb2xsTGVmdDogLV9sYXN0U2Nyb2xsUG9zaXRpb24ueCxcclxuXHRcdFx0XHRzY3JvbGxUb3A6IC1fbGFzdFNjcm9sbFBvc2l0aW9uLnlcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0X3NjaGVkdWxlQXhpc1Bvc2l0aW9uID0gZnVuY3Rpb24gX3NjaGVkdWxlQXhpc1Bvc2l0aW9uKGF4aXMsIHBvc2l0aW9uLCBhbmltYXRpb25EdXJhdGlvbiwgYW5pbWF0aW9uQmV6aWVyLCBhZnRlckRlbGF5KSB7XHJcblx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oYXhpcywgcG9zaXRpb24sIGFuaW1hdGlvbkR1cmF0aW9uLCBhbmltYXRpb25CZXppZXIpO1xyXG5cdFx0XHR9LCBhZnRlckRlbGF5KSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdF9maXJlRXZlbnQgPSBmdW5jdGlvbiBfZmlyZUV2ZW50KGV2ZW50TmFtZSwgZXZlbnRPYmplY3QpIHtcclxuXHRcdFx0dmFyIGksIGw7XHJcblx0XHRcdGV2ZW50T2JqZWN0LnNyY09iamVjdCA9IF9wdWJsaWNTZWxmO1xyXG5cclxuXHRcdFx0Ly8gSXRlcmF0ZSB0aHJvdWdoIGFueSBsaXN0ZW5lcnNcclxuXHRcdFx0Zm9yIChpID0gMCwgbCA9IF9ldmVudExpc3RlbmVyc1tldmVudE5hbWVdLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cclxuXHRcdFx0XHQvLyBFeGVjdXRlIGVhY2ggaW4gYSB0cnkvY2F0Y2hcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0X2V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1baV0oZXZlbnRPYmplY3QpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRpZiAod2luZG93LmNvbnNvbGUgJiYgd2luZG93LmNvbnNvbGUuZXJyb3IpIHtcclxuXHRcdFx0XHRcdFx0d2luZG93LmNvbnNvbGUuZXJyb3IoZXJyb3IubWVzc2FnZSArICcgKCcgKyBlcnJvci5zb3VyY2VVUkwgKyAnLCBsaW5lICcgKyBlcnJvci5saW5lICsgJyknKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBVcGRhdGUgdGhlIHNjcm9sbCBwb3NpdGlvbiBzbyB0aGF0IHRoZSBjaGlsZCBlbGVtZW50IGlzIGluIHZpZXcuXHJcblx0XHQgKi9cclxuXHRcdF9jaGlsZEZvY3VzZWQgPSBmdW5jdGlvbiBfY2hpbGRGb2N1c2VkKGV2ZW50KSB7XHJcblx0XHRcdHZhciBvZmZzZXQsIGF4aXMsIHZpc2libGVDaGlsZFBvcnRpb247XHJcblx0XHRcdHZhciBmb2N1c2VkTm9kZVJlY3QgPSBfZ2V0Qm91bmRpbmdSZWN0KGV2ZW50LnRhcmdldCk7XHJcblx0XHRcdHZhciBjb250YWluZXJSZWN0ID0gX2dldEJvdW5kaW5nUmVjdChfY29udGFpbmVyTm9kZSk7XHJcblx0XHRcdHZhciBlZGdlTWFwID0geyB4OiAnbGVmdCcsIHk6ICd0b3AnIH07XHJcblx0XHRcdHZhciBvcEVkZ2VNYXAgPSB7IHg6ICdyaWdodCcsIHk6ICdib3R0b20nIH07XHJcblx0XHRcdHZhciBkaW1lbnNpb25NYXAgPSB7IHg6ICd3aWR0aCcsIHk6ICdoZWlnaHQnIH07XHJcblxyXG5cdFx0XHQvLyBJZiBhbiBpbnB1dCBpcyBjdXJyZW50bHkgYmVpbmcgdHJhY2tlZCwgaWdub3JlIHRoZSBmb2N1cyBldmVudFxyXG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciAhPT0gZmFsc2UpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGZvY3Vzc2VkIG5vZGUgaXMgZW50aXJlbHkgaW4gdmlldywgdGhlcmUgaXMgbm8gbmVlZCB0byBjZW50ZXIgaXRcclxuXHRcdFx0XHRcdGlmIChmb2N1c2VkTm9kZVJlY3RbZWRnZU1hcFtheGlzXV0gPj0gY29udGFpbmVyUmVjdFtlZGdlTWFwW2F4aXNdXSAmJiBmb2N1c2VkTm9kZVJlY3Rbb3BFZGdlTWFwW2F4aXNdXSA8PSBjb250YWluZXJSZWN0W29wRWRnZU1hcFtheGlzXV0pIHtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGZvY3Vzc2VkIG5vZGUgaXMgbGFyZ2VyIHRoYW4gdGhlIGNvbnRhaW5lci4uLlxyXG5cdFx0XHRcdFx0aWYgKGZvY3VzZWROb2RlUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dID4gY29udGFpbmVyUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dKSB7XHJcblxyXG5cdFx0XHRcdFx0XHR2aXNpYmxlQ2hpbGRQb3J0aW9uID0gZm9jdXNlZE5vZGVSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0gLSBNYXRoLm1heCgwLCBjb250YWluZXJSZWN0W2VkZ2VNYXBbYXhpc11dIC0gZm9jdXNlZE5vZGVSZWN0W2VkZ2VNYXBbYXhpc11dKSAtIE1hdGgubWF4KDAsIGZvY3VzZWROb2RlUmVjdFtvcEVkZ2VNYXBbYXhpc11dIC0gY29udGFpbmVyUmVjdFtvcEVkZ2VNYXBbYXhpc11dKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIElmIG1vcmUgdGhhbiBoYWxmIGEgY29udGFpbmVyJ3MgcG9ydGlvbiBvZiB0aGUgZm9jdXNzZWQgbm9kZSBpcyB2aXNpYmxlLCB0aGVyZSdzIG5vIG5lZWQgdG8gY2VudGVyIGl0XHJcblx0XHRcdFx0XHRcdGlmICh2aXNpYmxlQ2hpbGRQb3J0aW9uID49IChjb250YWluZXJSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0gLyAyKSkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gU2V0IHRoZSB0YXJnZXQgb2Zmc2V0IHRvIGJlIGluIHRoZSBtaWRkbGUgb2YgdGhlIGNvbnRhaW5lciwgb3IgYXMgY2xvc2UgYXMgYm91bmRzIHBlcm1pdFxyXG5cdFx0XHRcdFx0b2Zmc2V0ID0gLU1hdGgucm91bmQoKGZvY3VzZWROb2RlUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dIC8gMikgLSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICsgZm9jdXNlZE5vZGVSZWN0W2VkZ2VNYXBbYXhpc11dIC0gY29udGFpbmVyUmVjdFtlZGdlTWFwW2F4aXNdXSAgLSAoY29udGFpbmVyUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dIC8gMikpO1xyXG5cdFx0XHRcdFx0b2Zmc2V0ID0gTWF0aC5taW4oMCwgTWF0aC5tYXgoX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdLCBvZmZzZXQpKTtcclxuXHJcblx0XHRcdFx0XHQvLyBQZXJmb3JtIHRoZSBzY3JvbGxcclxuXHRcdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oYXhpcywgb2Zmc2V0LCAwKTtcclxuXHRcdFx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb25bYXhpc10gPSBvZmZzZXQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGwnLCBfZ2V0UG9zaXRpb24oKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogR2l2ZW4gYSByZWxhdGl2ZSBkaXN0YW5jZSBiZXlvbmQgdGhlIGVsZW1lbnQgYm91bmRzLCByZXR1cm5zIGEgbW9kaWZpZWQgdmVyc2lvbiB0b1xyXG5cdFx0ICogc2ltdWxhdGUgYm91bmN5L3NwcmluZ3kgZWRnZXMuXHJcblx0XHQgKi9cclxuXHRcdF9tb2RpZnlEaXN0YW5jZUJleW9uZEJvdW5kcyA9IGZ1bmN0aW9uIF9tb2RpZnlEaXN0YW5jZUJleW9uZEJvdW5kcyhkaXN0YW5jZSwgYXhpcykge1xyXG5cdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuYm91bmNpbmcpIHtcclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgZSA9IE1hdGguZXhwKGRpc3RhbmNlIC8gX21ldHJpY3MuY29udGFpbmVyW2F4aXNdKTtcclxuXHRcdFx0cmV0dXJuIE1hdGgucm91bmQoX21ldHJpY3MuY29udGFpbmVyW2F4aXNdICogMC42ICogKGUgLSAxKSAvIChlICsgMSkpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEdpdmVuIHBvc2l0aW9ucyBmb3IgZWFjaCBlbmFibGVkIGF4aXMsIHJldHVybnMgYW4gb2JqZWN0IHNob3dpbmcgaG93IGZhciBlYWNoIGF4aXMgaXMgYmV5b25kXHJcblx0XHQgKiBib3VuZHMuIElmIHdpdGhpbiBib3VuZHMsIC0xIGlzIHJldHVybmVkOyBpZiBhdCB0aGUgYm91bmRzLCAwIGlzIHJldHVybmVkLlxyXG5cdFx0ICovXHJcblx0XHRfZGlzdGFuY2VzQmV5b25kQm91bmRzID0gZnVuY3Rpb24gX2Rpc3RhbmNlc0JleW9uZEJvdW5kcyhwb3NpdGlvbnMpIHtcclxuXHRcdFx0dmFyIGF4aXMsIHBvc2l0aW9uO1xyXG5cdFx0XHR2YXIgZGlzdGFuY2VzID0ge307XHJcblx0XHRcdGZvciAoYXhpcyBpbiBwb3NpdGlvbnMpIHtcclxuXHRcdFx0XHRpZiAocG9zaXRpb25zLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRwb3NpdGlvbiA9IHBvc2l0aW9uc1theGlzXTtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGUgcG9zaXRpb24gaXMgdG8gdGhlIGxlZnQvdG9wLCBubyBmdXJ0aGVyIG1vZGlmaWNhdGlvbiByZXF1aXJlZFxyXG5cdFx0XHRcdFx0aWYgKHBvc2l0aW9uID49IDApIHtcclxuXHRcdFx0XHRcdFx0ZGlzdGFuY2VzW2F4aXNdID0gcG9zaXRpb247XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgaXQncyB3aXRoaW4gdGhlIGJvdW5kcywgdXNlIC0xXHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHBvc2l0aW9uID4gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdGRpc3RhbmNlc1theGlzXSA9IC0xO1xyXG5cclxuXHRcdFx0XHRcdC8vIE90aGVyd2lzZSwgYW1lbmQgYnkgdGhlIGRpc3RhbmNlIG9mIHRoZSBtYXhpbXVtIGVkZ2VcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGRpc3RhbmNlc1theGlzXSA9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSAtIHBvc2l0aW9uO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZGlzdGFuY2VzO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIE9uIHBsYXRmb3JtcyB3aGljaCBzdXBwb3J0IGl0LCB1c2UgUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHRvIGdyb3VwXHJcblx0XHQgKiBwb3NpdGlvbiB1cGRhdGVzIGZvciBzcGVlZC4gIFN0YXJ0cyB0aGUgcmVuZGVyIHByb2Nlc3MuXHJcblx0XHQgKi9cclxuXHRcdF9zdGFydEFuaW1hdGlvbiA9IGZ1bmN0aW9uIF9zdGFydEFuaW1hdGlvbigpIHtcclxuXHRcdFx0aWYgKF9yZXFBbmltYXRpb25GcmFtZSkge1xyXG5cdFx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcclxuXHRcdFx0XHRfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gX3JlcUFuaW1hdGlvbkZyYW1lKF9zY2hlZHVsZVJlbmRlcik7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBPbiBwbGF0Zm9ybXMgd2hpY2ggc3VwcG9ydCBSZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHByb3ZpZGUgdGhlIHJlbmRlcmluZyBsb29wLlxyXG5cdFx0ICogVGFrZXMgdHdvIGFyZ3VtZW50czsgdGhlIGZpcnN0IGlzIHRoZSByZW5kZXIvcG9zaXRpb24gdXBkYXRlIGZ1bmN0aW9uIHRvXHJcblx0XHQgKiBiZSBjYWxsZWQsIGFuZCB0aGUgc2Vjb25kIGlzIGEgc3RyaW5nIGNvbnRyb2xsaW5nIHRoZSByZW5kZXIgdHlwZSB0b1xyXG5cdFx0ICogYWxsb3cgcHJldmlvdXMgY2hhbmdlcyB0byBiZSBjYW5jZWxsZWQgLSBzaG91bGQgYmUgJ3Bhbicgb3IgJ3Njcm9sbCcuXHJcblx0XHQgKi9cclxuXHRcdF9zY2hlZHVsZVJlbmRlciA9IGZ1bmN0aW9uIF9zY2hlZHVsZVJlbmRlcigpIHtcclxuXHRcdFx0dmFyIGF4aXMsIHBvc2l0aW9uVXBkYXRlZDtcclxuXHJcblx0XHRcdC8vIElmIHVzaW5nIHJlcXVlc3RBbmltYXRpb25GcmFtZSBzY2hlZHVsZSB0aGUgbmV4dCB1cGRhdGUgYXQgb25jZVxyXG5cdFx0XHRpZiAoX3JlcUFuaW1hdGlvbkZyYW1lKSB7XHJcblx0XHRcdFx0X2FuaW1hdGlvbkZyYW1lUmVxdWVzdCA9IF9yZXFBbmltYXRpb25GcmFtZShfc2NoZWR1bGVSZW5kZXIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQZXJmb3JtIHRoZSBkcmF3LlxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSAmJiBfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gIT09IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10pIHtcclxuXHRcdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oYXhpcywgX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdKTtcclxuXHRcdFx0XHRcdHBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBmdWxsLCBsb2NrZWQgc2Nyb2xsaW5nIGhhcyBlbmFibGVkLCBmaXJlIGFueSBzY3JvbGwgYW5kIHNlZ21lbnQgY2hhbmdlIGV2ZW50c1xyXG5cdFx0XHRpZiAoX2lzU2Nyb2xsaW5nICYmIHBvc2l0aW9uVXBkYXRlZCkge1xyXG5cdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbCcsIF9nZXRQb3NpdGlvbigpKTtcclxuXHRcdFx0XHRfdXBkYXRlU2VnbWVudHMoZmFsc2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogU3RvcHMgdGhlIGFuaW1hdGlvbiBwcm9jZXNzLlxyXG5cdFx0ICovXHJcblx0XHRfY2FuY2VsQW5pbWF0aW9uID0gZnVuY3Rpb24gX2NhbmNlbEFuaW1hdGlvbigpIHtcclxuXHRcdFx0aWYgKF9hbmltYXRpb25GcmFtZVJlcXVlc3QgPT09IGZhbHNlIHx8ICFfY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF9jYW5jZWxBbmltYXRpb25GcmFtZShfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0KTtcclxuXHRcdFx0X2FuaW1hdGlvbkZyYW1lUmVxdWVzdCA9IGZhbHNlO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFJlZ2lzdGVyIG9yIHVucmVnaXN0ZXIgZXZlbnQgaGFuZGxlcnMgYXMgYXBwcm9wcmlhdGVcclxuXHRcdCAqL1xyXG5cdFx0X3RvZ2dsZUV2ZW50SGFuZGxlcnMgPSBmdW5jdGlvbiBfdG9nZ2xlRXZlbnRIYW5kbGVycyhlbmFibGUpIHtcclxuXHRcdFx0dmFyIE11dGF0aW9uT2JzZXJ2ZXI7XHJcblxyXG5cdFx0XHQvLyBPbmx5IHJlbW92ZSB0aGUgZXZlbnQgaWYgdGhlIG5vZGUgZXhpc3RzIChET00gZWxlbWVudHMgY2FuIGdvIGF3YXkpXHJcblx0XHRcdGlmICghX2NvbnRhaW5lck5vZGUpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChlbmFibGUpIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSA9IF9jb250YWluZXJOb2RlLmFkZEV2ZW50TGlzdGVuZXI7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUgPSBfY29udGFpbmVyTm9kZS5yZW1vdmVFdmVudExpc3RlbmVyO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoX3RyYWNrUG9pbnRlckV2ZW50cykge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdNU1BvaW50ZXJEb3duJywgX29uUG9pbnRlckRvd24sIHRydWUpO1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdNU1BvaW50ZXJNb3ZlJywgX29uUG9pbnRlck1vdmUsIHRydWUpO1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdNU1BvaW50ZXJVcCcsIF9vblBvaW50ZXJVcCwgdHJ1ZSk7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ01TUG9pbnRlckNhbmNlbCcsIF9vblBvaW50ZXJDYW5jZWwsIHRydWUpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmIChfdHJhY2tUb3VjaEV2ZW50cyAmJiAhX2luc3RhbmNlT3B0aW9ucy5kaXNhYmxlZElucHV0TWV0aG9kcy50b3VjaCkge1xyXG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ3RvdWNoc3RhcnQnLCBfb25Ub3VjaFN0YXJ0LCB0cnVlKTtcclxuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCd0b3VjaG1vdmUnLCBfb25Ub3VjaE1vdmUsIHRydWUpO1xyXG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ3RvdWNoZW5kJywgX29uVG91Y2hFbmQsIHRydWUpO1xyXG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ3RvdWNoY2FuY2VsJywgX29uVG91Y2hFbmQsIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMubW91c2UpIHtcclxuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdtb3VzZWRvd24nLCBfb25Nb3VzZURvd24sIHRydWUpO1xyXG5cdFx0XHRcdFx0aWYgKCFlbmFibGUpIHtcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgX29uTW91c2VNb3ZlLCB0cnVlKTtcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIF9vbk1vdXNlVXAsIHRydWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMuc2Nyb2xsKSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ0RPTU1vdXNlU2Nyb2xsJywgX29uTW91c2VTY3JvbGwsIGZhbHNlKTtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnbW91c2V3aGVlbCcsIF9vbk1vdXNlU2Nyb2xsLCBmYWxzZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBhIGNsaWNrIGxpc3RlbmVyLiAgT24gSUUsIGFkZCB0aGUgbGlzdGVuZXIgdG8gdGhlIGRvY3VtZW50LCB0byBhbGxvd1xyXG5cdFx0XHQvLyBjbGlja3MgdG8gYmUgY2FuY2VsbGVkIGlmIGEgc2Nyb2xsIGVuZHMgb3V0c2lkZSB0aGUgYm91bmRzIG9mIHRoZSBjb250YWluZXI7IG9uXHJcblx0XHRcdC8vIG90aGVyIHBsYXRmb3JtcywgYWRkIHRvIHRoZSBjb250YWluZXIgbm9kZS5cclxuXHRcdFx0aWYgKF90cmFja1BvaW50ZXJFdmVudHMpIHtcclxuXHRcdFx0XHRpZiAoZW5hYmxlKSB7XHJcblx0XHRcdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIF9vbkNsaWNrLCB0cnVlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBfb25DbGljaywgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdjbGljaycsIF9vbkNsaWNrLCB0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gV2F0Y2ggZm9yIGNoYW5nZXMgaW5zaWRlIHRoZSBjb250YWluZWQgZWxlbWVudCB0byB1cGRhdGUgYm91bmRzIC0gZGUtYm91bmNlZCBzbGlnaHRseS5cclxuXHRcdFx0aWYgKGVuYWJsZSkge1xyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIF9jaGlsZEZvY3VzZWQsIHRydWUpO1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnVwZGF0ZU9uQ2hhbmdlcykge1xyXG5cclxuXHRcdFx0XHRcdC8vIFRyeSBhbmQgcmV1c2UgdGhlIG9sZCwgZGlzY29ubmVjdGVkIG9ic2VydmVyIGluc3RhbmNlIGlmIGF2YWlsYWJsZVxyXG5cdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCBjaGVjayBmb3Igc3VwcG9ydCBiZWZvcmUgcHJvY2VlZGluZ1xyXG5cdFx0XHRcdFx0aWYgKCFfbXV0YXRpb25PYnNlcnZlcikge1xyXG5cdFx0XHRcdFx0XHRNdXRhdGlvbk9ic2VydmVyID0gd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIgfHwgd2luZG93LldlYktpdE11dGF0aW9uT2JzZXJ2ZXIgfHwgd2luZG93W192ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ICsgJ011dGF0aW9uT2JzZXJ2ZXInXTtcclxuXHRcdFx0XHRcdFx0aWYgKE11dGF0aW9uT2JzZXJ2ZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRfbXV0YXRpb25PYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKF9kb21DaGFuZ2VkKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChfbXV0YXRpb25PYnNlcnZlcikge1xyXG5cdFx0XHRcdFx0XHRfbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKF9jb250ZW50UGFyZW50Tm9kZSwge1xyXG5cdFx0XHRcdFx0XHRcdGNoaWxkTGlzdDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRjaGFyYWN0ZXJEYXRhOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdHN1YnRyZWU6IHRydWVcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUuYWRkRXZlbnRMaXN0ZW5lcignRE9NU3VidHJlZU1vZGlmaWVkJywgZnVuY3Rpb24gKGUpIHtcclxuXHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIElnbm9yZSBjaGFuZ2VzIHRvIG5lc3RlZCBGVCBTY3JvbGxlcnMgLSBldmVuIHVwZGF0aW5nIGEgdHJhbnNmb3JtIHN0eWxlXHJcblx0XHRcdFx0XHRcdFx0Ly8gY2FuIHRyaWdnZXIgYSBET01TdWJ0cmVlTW9kaWZpZWQgaW4gSUUsIGNhdXNpbmcgbmVzdGVkIHNjcm9sbGVycyB0byBhbHdheXNcclxuXHRcdFx0XHRcdFx0XHQvLyBmYXZvdXIgdGhlIGRlZXBlc3Qgc2Nyb2xsZXIgYXMgcGFyZW50IHNjcm9sbGVycyAncmVzaXplJy9lbmQgc2Nyb2xsaW5nLlxyXG5cdFx0XHRcdFx0XHRcdGlmIChlICYmIChlLnNyY0VsZW1lbnQgPT09IF9jb250ZW50UGFyZW50Tm9kZSB8fCBlLnNyY0VsZW1lbnQuY2xhc3NOYW1lLmluZGV4T2YoJ2Z0c2Nyb2xsZXJfJykgIT09IC0xKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0X2RvbUNoYW5nZWQoKTtcclxuXHRcdFx0XHRcdFx0fSwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIF9kb21DaGFuZ2VkLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMudXBkYXRlT25XaW5kb3dSZXNpemUpIHtcclxuXHRcdFx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdmb2N1cycsIF9jaGlsZEZvY3VzZWQsIHRydWUpO1xyXG5cdFx0XHRcdGlmIChfbXV0YXRpb25PYnNlcnZlcikge1xyXG5cdFx0XHRcdFx0X211dGF0aW9uT2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignRE9NU3VidHJlZU1vZGlmaWVkJywgX2RvbUNoYW5nZWQsIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZCcsIF9kb21DaGFuZ2VkLCB0cnVlKTtcclxuXHRcdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgX2RvbUNoYW5nZWQsIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRkZWxldGUgX2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGU7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogVG91Y2ggZXZlbnQgaGFuZGxlcnNcclxuXHRcdCAqL1xyXG5cdFx0X29uVG91Y2hTdGFydCA9IGZ1bmN0aW9uIF9vblRvdWNoU3RhcnQoc3RhcnRFdmVudCkge1xyXG5cdFx0XHR2YXIgaSwgbCwgdG91Y2hFdmVudDtcclxuXHJcblx0XHRcdC8vIElmIGEgdG91Y2ggaXMgYWxyZWFkeSBhY3RpdmUsIGVuc3VyZSB0aGF0IHRoZSBpbmRleFxyXG5cdFx0XHQvLyBpcyBtYXBwZWQgdG8gdGhlIGNvcnJlY3QgZmluZ2VyLCBhbmQgcmV0dXJuLlxyXG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdGZvciAoaSA9IDAsIGwgPSBzdGFydEV2ZW50LnRvdWNoZXMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdFx0XHRpZiAoc3RhcnRFdmVudC50b3VjaGVzW2ldLmlkZW50aWZpZXIgPT09IF9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRcdFx0X2lucHV0SW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRyYWNrIHRoZSBuZXcgdG91Y2gncyBpZGVudGlmaWVyLCByZXNldCBpbmRleCwgYW5kIHBhc3NcclxuXHRcdFx0Ly8gdGhlIGNvb3JkaW5hdGVzIHRvIHRoZSBzY3JvbGwgc3RhcnQgZnVuY3Rpb24uXHJcblx0XHRcdHRvdWNoRXZlbnQgPSBzdGFydEV2ZW50LnRvdWNoZXNbMF07XHJcblx0XHRcdF9pbnB1dElkZW50aWZpZXIgPSB0b3VjaEV2ZW50LmlkZW50aWZpZXI7XHJcblx0XHRcdF9pbnB1dEluZGV4ID0gMDtcclxuXHRcdFx0X3N0YXJ0U2Nyb2xsKHRvdWNoRXZlbnQuY2xpZW50WCwgdG91Y2hFdmVudC5jbGllbnRZLCBzdGFydEV2ZW50LnRpbWVTdGFtcCwgc3RhcnRFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uVG91Y2hNb3ZlID0gZnVuY3Rpb24gX29uVG91Y2hNb3ZlKG1vdmVFdmVudCkge1xyXG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciA9PT0gZmFsc2UpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEdldCB0aGUgY29vcmRpbmF0ZXMgZnJvbSB0aGUgYXBwcm9wcmlhdGUgdG91Y2ggZXZlbnQgYW5kXHJcblx0XHRcdC8vIHBhc3MgdGhlbSBvbiB0byB0aGUgc2Nyb2xsIGhhbmRsZXJcclxuXHRcdFx0dmFyIHRvdWNoRXZlbnQgPSBtb3ZlRXZlbnQudG91Y2hlc1tfaW5wdXRJbmRleF07XHJcblx0XHRcdF91cGRhdGVTY3JvbGwodG91Y2hFdmVudC5jbGllbnRYLCB0b3VjaEV2ZW50LmNsaWVudFksIG1vdmVFdmVudC50aW1lU3RhbXAsIG1vdmVFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uVG91Y2hFbmQgPSBmdW5jdGlvbiBfb25Ub3VjaEVuZChlbmRFdmVudCkge1xyXG5cdFx0XHR2YXIgaSwgbDtcclxuXHJcblx0XHRcdC8vIENoZWNrIHdoZXRoZXIgdGhlIG9yaWdpbmFsIHRvdWNoIGV2ZW50IGlzIHN0aWxsIGFjdGl2ZSxcclxuXHRcdFx0Ly8gaWYgaXQgaXMsIHVwZGF0ZSB0aGUgaW5kZXggYW5kIHJldHVybi5cclxuXHRcdFx0aWYgKGVuZEV2ZW50LnRvdWNoZXMpIHtcclxuXHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gZW5kRXZlbnQudG91Y2hlcy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHRcdFx0XHRcdGlmIChlbmRFdmVudC50b3VjaGVzW2ldLmlkZW50aWZpZXIgPT09IF9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRcdFx0X2lucHV0SW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDb21wbGV0ZSB0aGUgc2Nyb2xsLiAgTm90ZSB0aGF0IHRvdWNoIGVuZCBldmVudHNcclxuXHRcdFx0Ly8gZG9uJ3QgY2FwdHVyZSBjb29yZGluYXRlcy5cclxuXHRcdFx0X2VuZFNjcm9sbChlbmRFdmVudC50aW1lU3RhbXAsIGVuZEV2ZW50KTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBNb3VzZSBldmVudCBoYW5kbGVyc1xyXG5cdFx0ICovXHJcblx0XHRfb25Nb3VzZURvd24gPSBmdW5jdGlvbiBfb25Nb3VzZURvd24oc3RhcnRFdmVudCkge1xyXG5cclxuXHRcdFx0Ly8gRG9uJ3QgdHJhY2sgdGhlIHJpZ2h0IG1vdXNlIGJ1dHRvbnMsIG9yIGEgY29udGV4dCBtZW51XHJcblx0XHRcdGlmICgoc3RhcnRFdmVudC5idXR0b24gJiYgc3RhcnRFdmVudC5idXR0b24gPT09IDIpIHx8IHN0YXJ0RXZlbnQuY3RybEtleSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2FwdHVyZSBpZiBwb3NzaWJsZVxyXG5cdFx0XHRpZiAoX2NvbnRhaW5lck5vZGUuc2V0Q2FwdHVyZSkge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLnNldENhcHR1cmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIG1vdmUgJiB1cCBoYW5kbGVycyB0byB0aGUgKmRvY3VtZW50KiB0byBhbGxvdyBoYW5kbGluZyBvdXRzaWRlIHRoZSBlbGVtZW50XHJcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIF9vbk1vdXNlTW92ZSwgdHJ1ZSk7XHJcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBfb25Nb3VzZVVwLCB0cnVlKTtcclxuXHJcblx0XHRcdF9pbnB1dElkZW50aWZpZXIgPSBzdGFydEV2ZW50LmJ1dHRvbiB8fCAxO1xyXG5cdFx0XHRfaW5wdXRJbmRleCA9IDA7XHJcblx0XHRcdF9zdGFydFNjcm9sbChzdGFydEV2ZW50LmNsaWVudFgsIHN0YXJ0RXZlbnQuY2xpZW50WSwgc3RhcnRFdmVudC50aW1lU3RhbXAsIHN0YXJ0RXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vbk1vdXNlTW92ZSA9IGZ1bmN0aW9uIF9vbk1vdXNlTW92ZShtb3ZlRXZlbnQpIHtcclxuXHRcdFx0aWYgKCFfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfdXBkYXRlU2Nyb2xsKG1vdmVFdmVudC5jbGllbnRYLCBtb3ZlRXZlbnQuY2xpZW50WSwgbW92ZUV2ZW50LnRpbWVTdGFtcCwgbW92ZUV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Nb3VzZVVwID0gZnVuY3Rpb24gX29uTW91c2VVcChlbmRFdmVudCkge1xyXG5cdFx0XHRpZiAoZW5kRXZlbnQuYnV0dG9uICYmIGVuZEV2ZW50LmJ1dHRvbiAhPT0gX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgX29uTW91c2VNb3ZlLCB0cnVlKTtcclxuXHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIF9vbk1vdXNlVXAsIHRydWUpO1xyXG5cclxuXHRcdFx0Ly8gUmVsZWFzZSBjYXB0dXJlIGlmIHBvc3NpYmxlXHJcblx0XHRcdGlmIChfY29udGFpbmVyTm9kZS5yZWxlYXNlQ2FwdHVyZSkge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLnJlbGVhc2VDYXB0dXJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF9lbmRTY3JvbGwoZW5kRXZlbnQudGltZVN0YW1wLCBlbmRFdmVudCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUG9pbnRlciBldmVudCBoYW5kbGVyc1xyXG5cdFx0ICovXHJcblx0XHRfb25Qb2ludGVyRG93biA9IGZ1bmN0aW9uIF9vblBvaW50ZXJEb3duKHN0YXJ0RXZlbnQpIHtcclxuXHJcblx0XHRcdC8vIElmIHRoZXJlIGlzIGFscmVhZHkgYSBwb2ludGVyIGV2ZW50IGJlaW5nIHRyYWNrZWQsIGlnbm9yZSBzdWJzZXF1ZW50LlxyXG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRGlzYWJsZSBzcGVjaWZpYyBpbnB1dCB0eXBlcyBpZiBzcGVjaWZpZWQgaW4gdGhlIGNvbmZpZy4gIFNlcGFyYXRlXHJcblx0XHRcdC8vIG91dCB0b3VjaCBhbmQgb3RoZXIgZXZlbnRzIChlZyB0cmVhdCBib3RoIHBlbiBhbmQgbW91c2UgYXMgXCJtb3VzZVwiKVxyXG5cdFx0XHRpZiAoc3RhcnRFdmVudC5wb2ludGVyVHlwZSA9PT0gc3RhcnRFdmVudC5NU1BPSU5URVJfVFlQRV9UT1VDSCkge1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLmRpc2FibGVkSW5wdXRNZXRob2RzLnRvdWNoKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKF9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMubW91c2UpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF9pbnB1dElkZW50aWZpZXIgPSBzdGFydEV2ZW50LnBvaW50ZXJJZDtcclxuXHRcdFx0X2NhcHR1cmVJbnB1dCgpO1xyXG5cdFx0XHRfc3RhcnRTY3JvbGwoc3RhcnRFdmVudC5jbGllbnRYLCBzdGFydEV2ZW50LmNsaWVudFksIHN0YXJ0RXZlbnQudGltZVN0YW1wLCBzdGFydEV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Qb2ludGVyTW92ZSA9IGZ1bmN0aW9uIF9vblBvaW50ZXJNb3ZlKG1vdmVFdmVudCkge1xyXG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciAhPT0gbW92ZUV2ZW50LnBvaW50ZXJJZCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRfdXBkYXRlU2Nyb2xsKG1vdmVFdmVudC5jbGllbnRYLCBtb3ZlRXZlbnQuY2xpZW50WSwgbW92ZUV2ZW50LnRpbWVTdGFtcCwgbW92ZUV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Qb2ludGVyVXAgPSBmdW5jdGlvbiBfb25Qb2ludGVyVXAoZW5kRXZlbnQpIHtcclxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09IGVuZEV2ZW50LnBvaW50ZXJJZCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X2VuZFNjcm9sbChlbmRFdmVudC50aW1lU3RhbXAsIGVuZEV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Qb2ludGVyQ2FuY2VsID0gZnVuY3Rpb24gX29uUG9pbnRlckNhbmNlbChlbmRFdmVudCkge1xyXG5cdFx0XHRfZW5kU2Nyb2xsKGVuZEV2ZW50LnRpbWVTdGFtcCwgZW5kRXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vblBvaW50ZXJDYXB0dXJlRW5kID0gZnVuY3Rpb24gX29uUG9pbnRlckNhcHR1cmVFbmQoZXZlbnQpIHtcclxuXHRcdFx0X2VuZFNjcm9sbChldmVudC50aW1lU3RhbXAsIGV2ZW50KTtcclxuXHRcdH07XHJcblxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUHJldmVudHMgY2xpY2sgYWN0aW9ucyBpZiBhcHByb3ByaWF0ZVxyXG5cdFx0ICovXHJcblx0XHRfb25DbGljayA9IGZ1bmN0aW9uIF9vbkNsaWNrKGNsaWNrRXZlbnQpIHtcclxuXHJcblx0XHRcdC8vIElmIGEgc2Nyb2xsIGFjdGlvbiBoYXNuJ3QgcmVzdWx0ZWQgaW4gdGhlIG5leHQgc2Nyb2xsIGJlaW5nIHByZXZlbnRlZCwgYW5kIGEgc2Nyb2xsXHJcblx0XHRcdC8vIGlzbid0IGN1cnJlbnRseSBpbiBwcm9ncmVzcyB3aXRoIGEgZGlmZmVyZW50IGlkZW50aWZpZXIsIGFsbG93IHRoZSBjbGlja1xyXG5cdFx0XHRpZiAoIV9wcmV2ZW50Q2xpY2sgJiYgIV9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUHJldmVudCBjbGlja3MgdXNpbmcgdGhlIHByZXZlbnREZWZhdWx0KCkgYW5kIHN0b3BQcm9wYWdhdGlvbigpIGhhbmRsZXJzIG9uIHRoZSBldmVudDtcclxuXHRcdFx0Ly8gdGhpcyBpcyBzYWZlIGV2ZW4gaW4gSUUxMCBhcyB0aGlzIGlzIGFsd2F5cyBhIFwidHJ1ZVwiIGV2ZW50LCBuZXZlciBhIHdpbmRvdy5ldmVudC5cclxuXHRcdFx0Y2xpY2tFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRjbGlja0V2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRpZiAoIV9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRfcHJldmVudENsaWNrID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fTtcclxuXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBQcm9jZXNzIHNjcm9sbCB3aGVlbC9pbnB1dCBhY3Rpb25zIGFzIHNjcm9sbGVyIHNjcm9sbHNcclxuXHRcdCAqL1xyXG5cdFx0X29uTW91c2VTY3JvbGwgPSBmdW5jdGlvbiBfb25Nb3VzZVNjcm9sbChldmVudCkge1xyXG5cdFx0XHR2YXIgc2Nyb2xsRGVsdGFYLCBzY3JvbGxEZWx0YVk7XHJcblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyICE9PSAnc2Nyb2xsd2hlZWwnKSB7XHJcblx0XHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09IGZhbHNlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0X2lucHV0SWRlbnRpZmllciA9ICdzY3JvbGx3aGVlbCc7XHJcblx0XHRcdFx0X2N1bXVsYXRpdmVTY3JvbGwueCA9IDA7XHJcblx0XHRcdFx0X2N1bXVsYXRpdmVTY3JvbGwueSA9IDA7XHJcblxyXG5cdFx0XHRcdC8vIFN0YXJ0IGEgc2Nyb2xsIGV2ZW50XHJcblx0XHRcdFx0aWYgKCFfc3RhcnRTY3JvbGwoZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSwgRGF0ZS5ub3coKSwgZXZlbnQpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDb252ZXJ0IHRoZSBzY3JvbGx3aGVlbCB2YWx1ZXMgdG8gYSBzY3JvbGwgdmFsdWVcclxuXHRcdFx0aWYgKGV2ZW50LndoZWVsRGVsdGEpIHtcclxuXHRcdFx0XHRpZiAoZXZlbnQud2hlZWxEZWx0YVgpIHtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWCA9IGV2ZW50LndoZWVsRGVsdGFYIC8gMjtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWSA9IGV2ZW50LndoZWVsRGVsdGFZIC8gMjtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFYID0gMDtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWSA9IGV2ZW50LndoZWVsRGVsdGEgLyAyO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAoZXZlbnQuYXhpcyAmJiBldmVudC5heGlzID09PSBldmVudC5IT1JJWk9OVEFMX0FYSVMpIHtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWCA9IGV2ZW50LmRldGFpbCAqIC0xMDtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWSA9IDA7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWCA9IDA7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVkgPSBldmVudC5kZXRhaWwgKiAtMTA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB0aGUgc2Nyb2xsZXIgaXMgY29uc3RyYWluZWQgdG8gYW4geCBheGlzLCBjb252ZXJ0IHkgc2Nyb2xsIHRvIGFsbG93IHNpbmdsZS1heGlzIHNjcm9sbFxyXG5cdFx0XHQvLyB3aGVlbHMgdG8gc2Nyb2xsIGNvbnN0cmFpbmVkIGNvbnRlbnQuXHJcblx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZICYmICFzY3JvbGxEZWx0YVgpIHtcclxuXHRcdFx0XHRzY3JvbGxEZWx0YVggPSBzY3JvbGxEZWx0YVk7XHJcblx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gMDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X2N1bXVsYXRpdmVTY3JvbGwueCA9IE1hdGgucm91bmQoX2N1bXVsYXRpdmVTY3JvbGwueCArIHNjcm9sbERlbHRhWCk7XHJcblx0XHRcdF9jdW11bGF0aXZlU2Nyb2xsLnkgPSBNYXRoLnJvdW5kKF9jdW11bGF0aXZlU2Nyb2xsLnkgKyBzY3JvbGxEZWx0YVkpO1xyXG5cclxuXHRcdFx0X3VwZGF0ZVNjcm9sbChfZ2VzdHVyZVN0YXJ0LnggKyBfY3VtdWxhdGl2ZVNjcm9sbC54LCBfZ2VzdHVyZVN0YXJ0LnkgKyBfY3VtdWxhdGl2ZVNjcm9sbC55LCBldmVudC50aW1lU3RhbXAsIGV2ZW50KTtcclxuXHJcblx0XHRcdC8vIEVuZCBzY3JvbGxpbmcgc3RhdGVcclxuXHRcdFx0aWYgKF9zY3JvbGxXaGVlbEVuZERlYm91bmNlcikge1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChfc2Nyb2xsV2hlZWxFbmREZWJvdW5jZXIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdF9zY3JvbGxXaGVlbEVuZERlYm91bmNlciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdF9pbnB1dElkZW50aWZpZXIgPSBmYWxzZTtcclxuXHRcdFx0XHRfcmVsZWFzZUlucHV0Q2FwdHVyZSgpO1xyXG5cdFx0XHRcdF9pc1Njcm9sbGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdF9pc0Rpc3BsYXlpbmdTY3JvbGwgPSBmYWxzZTtcclxuXHRcdFx0XHRfZnRzY3JvbGxlck1vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcpIHtcclxuXHRcdFx0XHRcdHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcclxuXHRcdFx0XHRpZiAoIV9zbmFwU2Nyb2xsKCkpIHtcclxuXHRcdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSwgMzAwKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDYXB0dXJlIGFuZCByZWxlYXNlIGlucHV0IHN1cHBvcnQsIHBhcnRpY3VsYXJseSBhbGxvd2luZyB0cmFja2luZ1xyXG5cdFx0ICogb2YgTWV0cm8gcG9pbnRlcnMgb3V0c2lkZSB0aGUgZG9ja2VkIHZpZXcuXHJcblx0XHQgKi9cclxuXHRcdF9jYXB0dXJlSW5wdXQgPSBmdW5jdGlvbiBfY2FwdHVyZUlucHV0KCkge1xyXG5cdFx0XHRpZiAoX2lucHV0Q2FwdHVyZWQgfHwgX2lucHV0SWRlbnRpZmllciA9PT0gZmFsc2UgfHwgX2lucHV0SWRlbnRpZmllciA9PT0gJ3Njcm9sbHdoZWVsJykge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX3RyYWNrUG9pbnRlckV2ZW50cykge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLm1zU2V0UG9pbnRlckNhcHR1cmUoX2lucHV0SWRlbnRpZmllcik7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuYWRkRXZlbnRMaXN0ZW5lcignTVNMb3N0UG9pbnRlckNhcHR1cmUnLCBfb25Qb2ludGVyQ2FwdHVyZUVuZCwgZmFsc2UpO1xyXG5cdFx0XHR9XHJcblx0XHRcdF9pbnB1dENhcHR1cmVkID0gdHJ1ZTtcclxuXHRcdH07XHJcblx0XHRfcmVsZWFzZUlucHV0Q2FwdHVyZSA9IGZ1bmN0aW9uIF9yZWxlYXNlSW5wdXRDYXB0dXJlKCkge1xyXG5cdFx0XHRpZiAoIV9pbnB1dENhcHR1cmVkKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfdHJhY2tQb2ludGVyRXZlbnRzKSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignTVNMb3N0UG9pbnRlckNhcHR1cmUnLCBfb25Qb2ludGVyQ2FwdHVyZUVuZCwgZmFsc2UpO1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLm1zUmVsZWFzZVBvaW50ZXJDYXB0dXJlKF9pbnB1dElkZW50aWZpZXIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdF9pbnB1dENhcHR1cmVkID0gZmFsc2U7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogVXRpbGl0eSBmdW5jdGlvbiBhY3RpbmcgYXMgYSBnZXRCb3VuZGluZ0NsaWVudFJlY3QgcG9seWZpbGwuXHJcblx0XHQgKi9cclxuXHRcdF9nZXRCb3VuZGluZ1JlY3QgPSBmdW5jdGlvbiBfZ2V0Qm91bmRpbmdSZWN0KGFuRWxlbWVudCkge1xyXG5cdFx0XHRpZiAoYW5FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCkge1xyXG5cdFx0XHRcdHJldHVybiBhbkVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB4ID0gMCwgeSA9IDAsIGVhY2hFbGVtZW50ID0gYW5FbGVtZW50O1xyXG5cdFx0XHR3aGlsZSAoZWFjaEVsZW1lbnQpIHtcclxuXHRcdFx0XHR4ID0geCArIGVhY2hFbGVtZW50Lm9mZnNldExlZnQgLSBlYWNoRWxlbWVudC5zY3JvbGxMZWZ0O1xyXG5cdFx0XHRcdHkgPSB5ICsgZWFjaEVsZW1lbnQub2Zmc2V0VG9wIC0gZWFjaEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG5cdFx0XHRcdGVhY2hFbGVtZW50ID0gZWFjaEVsZW1lbnQub2Zmc2V0UGFyZW50O1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB7IGxlZnQ6IHgsIHRvcDogeSwgd2lkdGg6IGFuRWxlbWVudC5vZmZzZXRXaWR0aCwgaGVpZ2h0OiBhbkVsZW1lbnQub2Zmc2V0SGVpZ2h0IH07XHJcblx0XHR9O1xyXG5cclxuXHJcblx0XHQvKiAgICAgICAgICAgICAgICAgICAgIEluc3RhbnRpYXRpb24gICAgICAgICAgICAgICAgICAgICAqL1xyXG5cclxuXHRcdC8vIFNldCB1cCB0aGUgRE9NIG5vZGUgaWYgYXBwcm9wcmlhdGVcclxuXHRcdF9pbml0aWFsaXplRE9NKCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHNpemVzXHJcblx0XHRfdXBkYXRlRGltZW5zaW9ucygpO1xyXG5cclxuXHRcdC8vIFNldCB1cCB0aGUgZXZlbnQgaGFuZGxlcnNcclxuXHRcdF90b2dnbGVFdmVudEhhbmRsZXJzKHRydWUpO1xyXG5cclxuXHRcdC8vIERlZmluZSBhIHB1YmxpYyBBUEkgdG8gYmUgcmV0dXJuZWQgYXQgdGhlIGJvdHRvbSAtIHRoaXMgaXMgdGhlIHB1YmxpYy1mYWNpbmcgaW50ZXJmYWNlLlxyXG5cdFx0X3B1YmxpY1NlbGYgPSB7XHJcblx0XHRcdGRlc3Ryb3k6IGRlc3Ryb3ksXHJcblx0XHRcdHNldFNuYXBTaXplOiBzZXRTbmFwU2l6ZSxcclxuXHRcdFx0c2Nyb2xsVG86IHNjcm9sbFRvLFxyXG5cdFx0XHRzY3JvbGxCeTogc2Nyb2xsQnksXHJcblx0XHRcdHVwZGF0ZURpbWVuc2lvbnM6IHVwZGF0ZURpbWVuc2lvbnMsXHJcblx0XHRcdGFkZEV2ZW50TGlzdGVuZXI6IGFkZEV2ZW50TGlzdGVuZXIsXHJcblx0XHRcdHJlbW92ZUV2ZW50TGlzdGVuZXI6IHJlbW92ZUV2ZW50TGlzdGVuZXJcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGlmIChPYmplY3QuZGVmaW5lUHJvcGVydGllcykge1xyXG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhfcHVibGljU2VsZiwge1xyXG5cdFx0XHRcdCdzY3JvbGxIZWlnaHQnOiB7XHJcblx0XHRcdFx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gX21ldHJpY3MuY29udGVudC55OyB9LFxyXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ3Njcm9sbEhlaWdodCBpcyBjdXJyZW50bHkgcmVhZC1vbmx5IC0gaWdub3JpbmcgJyArIHZhbHVlKTsgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0J3Njcm9sbExlZnQnOiB7XHJcblx0XHRcdFx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gLV9sYXN0U2Nyb2xsUG9zaXRpb24ueDsgfSxcclxuXHRcdFx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHsgc2Nyb2xsVG8odmFsdWUsIGZhbHNlLCBmYWxzZSk7IHJldHVybiAtX2xhc3RTY3JvbGxQb3NpdGlvbi54OyB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQnc2Nyb2xsVG9wJzoge1xyXG5cdFx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIC1fbGFzdFNjcm9sbFBvc2l0aW9uLnk7IH0sXHJcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHNjcm9sbFRvKGZhbHNlLCB2YWx1ZSwgZmFsc2UpOyByZXR1cm4gLV9sYXN0U2Nyb2xsUG9zaXRpb24ueTsgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0J3Njcm9sbFdpZHRoJzoge1xyXG5cdFx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIF9tZXRyaWNzLmNvbnRlbnQueDsgfSxcclxuXHRcdFx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdzY3JvbGxXaWR0aCBpcyBjdXJyZW50bHkgcmVhZC1vbmx5IC0gaWdub3JpbmcgJyArIHZhbHVlKTsgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0J3NlZ21lbnRDb3VudCc6IHtcclxuXHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB7IHg6IE5hTiwgeTogTmFOIH07XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHR4OiBNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudC54IC8gX3NuYXBHcmlkU2l6ZS54KSxcclxuXHRcdFx0XHRcdFx0XHR5OiBNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudC55IC8gX3NuYXBHcmlkU2l6ZS55KVxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdzZWdtZW50Q291bnQgaXMgY3VycmVudGx5IHJlYWQtb25seSAtIGlnbm9yaW5nICcgKyB2YWx1ZSk7IH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdCdjdXJyZW50U2VnbWVudCc6IHtcclxuXHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB7IHg6IF9hY3RpdmVTZWdtZW50LngsIHk6IF9hY3RpdmVTZWdtZW50LnkgfTsgfSxcclxuXHRcdFx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdjdXJyZW50U2VnbWVudCBpcyBjdXJyZW50bHkgcmVhZC1vbmx5IC0gaWdub3JpbmcgJyArIHZhbHVlKTsgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0J2NvbnRlbnRDb250YWluZXJOb2RlJzoge1xyXG5cdFx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIF9jb250ZW50UGFyZW50Tm9kZTsgfSxcclxuXHRcdFx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdjb250ZW50Q29udGFpbmVyTm9kZSBpcyBjdXJyZW50bHkgcmVhZC1vbmx5IC0gaWdub3JpbmcgJyArIHZhbHVlKTsgfVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHQvLyBSZXR1cm4gdGhlIHB1YmxpYyBpbnRlcmZhY2UuXHJcblx0XHRyZXR1cm4gX3B1YmxpY1NlbGY7XHJcblx0fTtcclxuXHJcblxyXG5cdC8qICAgICAgICAgIFByb3RvdHlwZSBGdW5jdGlvbnMgYW5kIFByb3BlcnRpZXMgICAgICAgICAgICovXHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBIVE1MIHRvIHByZXBlbmQgdG8gdGhlIHNjcm9sbGFibGUgY29udGVudCB0byB3cmFwIGl0LiBVc2VkIGludGVybmFsbHksXHJcblx0ICogYW5kIG1heSBiZSB1c2VkIHRvIHByZS13cmFwIHNjcm9sbGFibGUgY29udGVudC4gIEF4ZXMgY2FuIG9wdGlvbmFsbHlcclxuXHQgKiBiZSBleGNsdWRlZCBmb3Igc3BlZWQgaW1wcm92ZW1lbnRzLlxyXG5cdCAqL1xyXG5cdEZUU2Nyb2xsZXIucHJvdG90eXBlLmdldFByZXBlbmRlZEhUTUwgPSBmdW5jdGlvbiAoZXhjbHVkZVhBeGlzLCBleGNsdWRlWUF4aXMsIGh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcclxuXHRcdGlmICghaHdBY2NlbGVyYXRpb25DbGFzcykge1xyXG5cdFx0XHRpZiAodHlwZW9mIEZUU2Nyb2xsZXJPcHRpb25zID09PSAnb2JqZWN0JyAmJiBGVFNjcm9sbGVyT3B0aW9ucy5od0FjY2VsZXJhdGlvbkNsYXNzKSB7XHJcblx0XHRcdFx0aHdBY2NlbGVyYXRpb25DbGFzcyA9IEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3M7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aHdBY2NlbGVyYXRpb25DbGFzcyA9ICdmdHNjcm9sbGVyX2h3YWNjZWxlcmF0ZWQnO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIG91dHB1dCA9ICc8ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl9jb250YWluZXJcIj4nO1xyXG5cdFx0aWYgKCFleGNsdWRlWEF4aXMpIHtcclxuXHRcdFx0b3V0cHV0ICs9ICc8ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl94ICcgKyBod0FjY2VsZXJhdGlvbkNsYXNzICsgJ1wiPic7XHJcblx0XHR9XHJcblx0XHRpZiAoIWV4Y2x1ZGVZQXhpcykge1xyXG5cdFx0XHRvdXRwdXQgKz0gJzxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3kgJyArIGh3QWNjZWxlcmF0aW9uQ2xhc3MgKyAnXCI+JztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBIVE1MIHRvIGFwcGVuZCB0byB0aGUgc2Nyb2xsYWJsZSBjb250ZW50IHRvIHdyYXAgaXQ7IGFnYWluLCB1c2VkIGludGVybmFsbHksXHJcblx0ICogYW5kIG1heSBiZSB1c2VkIHRvIHByZS13cmFwIHNjcm9sbGFibGUgY29udGVudC5cclxuXHQgKi9cclxuXHRGVFNjcm9sbGVyLnByb3RvdHlwZS5nZXRBcHBlbmRlZEhUTUwgPSBmdW5jdGlvbiAoZXhjbHVkZVhBeGlzLCBleGNsdWRlWUF4aXMsIGh3QWNjZWxlcmF0aW9uQ2xhc3MsIHNjcm9sbGJhcnMpIHtcclxuXHRcdGlmICghaHdBY2NlbGVyYXRpb25DbGFzcykge1xyXG5cdFx0XHRpZiAodHlwZW9mIEZUU2Nyb2xsZXJPcHRpb25zID09PSAnb2JqZWN0JyAmJiBGVFNjcm9sbGVyT3B0aW9ucy5od0FjY2VsZXJhdGlvbkNsYXNzKSB7XHJcblx0XHRcdFx0aHdBY2NlbGVyYXRpb25DbGFzcyA9IEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3M7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aHdBY2NlbGVyYXRpb25DbGFzcyA9ICdmdHNjcm9sbGVyX2h3YWNjZWxlcmF0ZWQnO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIG91dHB1dCA9ICcnO1xyXG5cdFx0aWYgKCFleGNsdWRlWEF4aXMpIHtcclxuXHRcdFx0b3V0cHV0ICs9ICc8L2Rpdj4nO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCFleGNsdWRlWUF4aXMpIHtcclxuXHRcdFx0b3V0cHV0ICs9ICc8L2Rpdj4nO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHNjcm9sbGJhcnMpIHtcclxuXHRcdFx0aWYgKCFleGNsdWRlWEF4aXMpIHtcclxuXHRcdFx0XHRvdXRwdXQgKz0gJzxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3Njcm9sbGJhciBmdHNjcm9sbGVyX3Njcm9sbGJhcnggJyArIGh3QWNjZWxlcmF0aW9uQ2xhc3MgKyAnXCI+PGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfc2Nyb2xsYmFyaW5uZXJcIj48L2Rpdj48L2Rpdj4nO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICghZXhjbHVkZVlBeGlzKSB7XHJcblx0XHRcdFx0b3V0cHV0ICs9ICc8ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl9zY3JvbGxiYXIgZnRzY3JvbGxlcl9zY3JvbGxiYXJ5ICcgKyBod0FjY2VsZXJhdGlvbkNsYXNzICsgJ1wiPjxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3Njcm9sbGJhcmlubmVyXCI+PC9kaXY+PC9kaXY+JztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0b3V0cHV0ICs9ICc8L2Rpdj4nO1xyXG5cclxuXHRcdHJldHVybiBvdXRwdXQ7XHJcblx0fTtcclxufSgpKTtcclxuXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHJcblx0ZnVuY3Rpb24gX3Rocm93UmFuZ2VFcnJvcihuYW1lLCB2YWx1ZSkge1xyXG5cdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wiJyArIG5hbWUgKyAnXCIgbXVzdCBiZSBhIG51bWJlciBiZXR3ZWVuIDAgYW5kIDEuICcgKyAnR290ICcgKyB2YWx1ZSArICcgaW5zdGVhZC4nKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlcHJlc2VudHMgYSB0d28tZGltZW5zaW9uYWwgY3ViaWMgYmV6aWVyIGN1cnZlIHdpdGggdGhlIHN0YXJ0aW5nXHJcblx0ICogcG9pbnQgKDAsIDApIGFuZCB0aGUgZW5kIHBvaW50ICgxLCAxKS4gVGhlIHR3byBjb250cm9sIHBvaW50cyBwMSBhbmQgcDJcclxuXHQgKiBoYXZlIHggYW5kIHkgY29vcmRpbmF0ZXMgYmV0d2VlbiAwIGFuZCAxLlxyXG5cdCAqXHJcblx0ICogVGhpcyB0eXBlIG9mIGJlemllciBjdXJ2ZXMgY2FuIGJlIHVzZWQgYXMgQ1NTIHRyYW5zZm9ybSB0aW1pbmcgZnVuY3Rpb25zLlxyXG5cdCAqL1xyXG5cdEN1YmljQmV6aWVyID0gZnVuY3Rpb24gKHAxeCwgcDF5LCBwMngsIHAyeSkge1xyXG5cdFx0aWYgKCEocDF4ID49IDAgJiYgcDF4IDw9IDEpKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3AxeCcsIHAxeCk7XHJcblx0XHR9XHJcblx0XHRpZiAoIShwMXkgPj0gMCAmJiBwMXkgPD0gMSkpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigncDF5JywgcDF5KTtcclxuXHRcdH1cclxuXHRcdGlmICghKHAyeCA+PSAwICYmIHAyeCA8PSAxKSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCdwMngnLCBwMngpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCEocDJ5ID49IDAgJiYgcDJ5IDw9IDEpKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3AyeScsIHAyeSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29udHJvbCBwb2ludHNcclxuXHRcdHRoaXMuX3AxID0geyB4OiBwMXgsIHk6IHAxeSB9O1xyXG5cdFx0dGhpcy5fcDIgPSB7IHg6IHAyeCwgeTogcDJ5IH07XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLl9nZXRDb29yZGluYXRlRm9yVCA9IGZ1bmN0aW9uICh0LCBwMSwgcDIpIHtcclxuXHRcdHZhciBjID0gMyAqIHAxLFxyXG5cdFx0XHRiID0gMyAqIChwMiAtIHAxKSAtIGMsXHJcblx0XHRcdGEgPSAxIC0gYyAtIGI7XHJcblxyXG5cdFx0cmV0dXJuICgoYSAqIHQgKyBiKSAqIHQgKyBjKSAqIHQ7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLl9nZXRDb29yZGluYXRlRGVyaXZhdGVGb3JUID0gZnVuY3Rpb24gKHQsIHAxLCBwMikge1xyXG5cdFx0dmFyIGMgPSAzICogcDEsXHJcblx0XHRcdGIgPSAzICogKHAyIC0gcDEpIC0gYyxcclxuXHRcdFx0YSA9IDEgLSBjIC0gYjtcclxuXHJcblx0XHRyZXR1cm4gKDMgKiBhICogdCArIDIgKiBiKSAqIHQgKyBjO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5fZ2V0VEZvckNvb3JkaW5hdGUgPSBmdW5jdGlvbiAoYywgcDEsIHAyLCBlcHNpbG9uKSB7XHJcblx0XHRpZiAoIWlzRmluaXRlKGVwc2lsb24pIHx8IGVwc2lsb24gPD0gMCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJlcHNpbG9uXCIgbXVzdCBiZSBhIG51bWJlciBncmVhdGVyIHRoYW4gMC4nKTtcclxuXHRcdH1cclxuXHRcdHZhciB0MiwgaSwgYzIsIGQyO1xyXG5cclxuXHRcdC8vIEZpcnN0IHRyeSBhIGZldyBpdGVyYXRpb25zIG9mIE5ld3RvbidzIG1ldGhvZCAtLSBub3JtYWxseSB2ZXJ5IGZhc3QuXHJcblx0XHRmb3IgKHQyID0gYywgaSA9IDA7IGkgPCA4OyBpID0gaSArIDEpIHtcclxuXHRcdFx0YzIgPSB0aGlzLl9nZXRDb29yZGluYXRlRm9yVCh0MiwgcDEsIHAyKSAtIGM7XHJcblx0XHRcdGlmIChNYXRoLmFicyhjMikgPCBlcHNpbG9uKSB7XHJcblx0XHRcdFx0cmV0dXJuIHQyO1xyXG5cdFx0XHR9XHJcblx0XHRcdGQyID0gdGhpcy5fZ2V0Q29vcmRpbmF0ZURlcml2YXRlRm9yVCh0MiwgcDEsIHAyKTtcclxuXHRcdFx0aWYgKE1hdGguYWJzKGQyKSA8IDFlLTYpIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHR0MiA9IHQyIC0gYzIgLyBkMjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWxsIGJhY2sgdG8gdGhlIGJpc2VjdGlvbiBtZXRob2QgZm9yIHJlbGlhYmlsaXR5LlxyXG5cdFx0dDIgPSBjO1xyXG5cdFx0dmFyIHQwID0gMCxcclxuXHRcdFx0dDEgPSAxO1xyXG5cclxuXHRcdGlmICh0MiA8IHQwKSB7XHJcblx0XHRcdHJldHVybiB0MDtcclxuXHRcdH1cclxuXHRcdGlmICh0MiA+IHQxKSB7XHJcblx0XHRcdHJldHVybiB0MTtcclxuXHRcdH1cclxuXHJcblx0XHR3aGlsZSAodDAgPCB0MSkge1xyXG5cdFx0XHRjMiA9IHRoaXMuX2dldENvb3JkaW5hdGVGb3JUKHQyLCBwMSwgcDIpO1xyXG5cdFx0XHRpZiAoTWF0aC5hYnMoYzIgLSBjKSA8IGVwc2lsb24pIHtcclxuXHRcdFx0XHRyZXR1cm4gdDI7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGMgPiBjMikge1xyXG5cdFx0XHRcdHQwID0gdDI7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dDEgPSB0MjtcclxuXHRcdFx0fVxyXG5cdFx0XHR0MiA9ICh0MSAtIHQwKSAqIDAuNSArIHQwO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhaWx1cmUuXHJcblx0XHRyZXR1cm4gdDI7XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ29tcHV0ZXMgdGhlIHBvaW50IGZvciBhIGdpdmVuIHQgdmFsdWUuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge251bWJlcn0gdFxyXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYW4gb2JqZWN0IHdpdGggeCBhbmQgeSBwcm9wZXJ0aWVzXHJcblx0ICovXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmdldFBvaW50Rm9yVCA9IGZ1bmN0aW9uICh0KSB7XHJcblxyXG5cdFx0Ly8gU3BlY2lhbCBjYXNlczogc3RhcnRpbmcgYW5kIGVuZGluZyBwb2ludHNcclxuXHRcdGlmICh0ID09PSAwIHx8IHQgPT09IDEpIHtcclxuXHRcdFx0cmV0dXJuIHsgeDogdCwgeTogdCB9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGZvciBjb3JyZWN0IHQgdmFsdWUgKG11c3QgYmUgYmV0d2VlbiAwIGFuZCAxKVxyXG5cdFx0aWYgKHQgPCAwIHx8IHQgPiAxKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3QnLCB0KTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR4OiB0aGlzLl9nZXRDb29yZGluYXRlRm9yVCh0LCB0aGlzLl9wMS54LCB0aGlzLl9wMi54KSxcclxuXHRcdFx0eTogdGhpcy5fZ2V0Q29vcmRpbmF0ZUZvclQodCwgdGhpcy5fcDEueSwgdGhpcy5fcDIueSlcclxuXHRcdH07XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmdldFRGb3JYID0gZnVuY3Rpb24gKHgsIGVwc2lsb24pIHtcclxuXHRcdHJldHVybiB0aGlzLl9nZXRURm9yQ29vcmRpbmF0ZSh4LCB0aGlzLl9wMS54LCB0aGlzLl9wMi54LCBlcHNpbG9uKTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZ2V0VEZvclkgPSBmdW5jdGlvbiAoeSwgZXBzaWxvbikge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2dldFRGb3JDb29yZGluYXRlKHksIHRoaXMuX3AxLnksIHRoaXMuX3AyLnksIGVwc2lsb24pO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXB1dGVzIGF1eGlsaWFyeSBwb2ludHMgdXNpbmcgRGUgQ2FzdGVsamF1J3MgYWxnb3JpdGhtLlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtudW1iZXJ9IHQgbXVzdCBiZSBncmVhdGVyIHRoYW4gMCBhbmQgbG93ZXIgdGhhbiAxLlxyXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IHdpdGggbWVtYmVycyBpMCwgaTEsIGkyIChmaXJzdCBpdGVyYXRpb24pLFxyXG5cdCAqICAgIGoxLCBqMiAoc2Vjb25kIGl0ZXJhdGlvbikgYW5kIGsgKHRoZSBleGFjdCBwb2ludCBmb3IgdClcclxuXHQgKi9cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuX2dldEF1eFBvaW50cyA9IGZ1bmN0aW9uICh0KSB7XHJcblx0XHRpZiAodCA8PSAwIHx8IHQgPj0gMSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCd0JywgdCk7XHJcblx0XHR9XHJcblxyXG5cclxuXHRcdC8qIEZpcnN0IHNlcmllcyBvZiBhdXhpbGlhcnkgcG9pbnRzICovXHJcblxyXG5cdFx0Ly8gRmlyc3QgY29udHJvbCBwb2ludCBvZiB0aGUgbGVmdCBjdXJ2ZVxyXG5cdFx0dmFyIGkwID0ge1xyXG5cdFx0XHRcdHg6IHQgKiB0aGlzLl9wMS54LFxyXG5cdFx0XHRcdHk6IHQgKiB0aGlzLl9wMS55XHJcblx0XHRcdH0sXHJcblx0XHRcdGkxID0ge1xyXG5cdFx0XHRcdHg6IHRoaXMuX3AxLnggKyB0ICogKHRoaXMuX3AyLnggLSB0aGlzLl9wMS54KSxcclxuXHRcdFx0XHR5OiB0aGlzLl9wMS55ICsgdCAqICh0aGlzLl9wMi55IC0gdGhpcy5fcDEueSlcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcdC8vIFNlY29uZCBjb250cm9sIHBvaW50IG9mIHRoZSByaWdodCBjdXJ2ZVxyXG5cdFx0XHRpMiAgPSB7XHJcblx0XHRcdFx0eDogdGhpcy5fcDIueCArIHQgKiAoMSAtIHRoaXMuX3AyLngpLFxyXG5cdFx0XHRcdHk6IHRoaXMuX3AyLnkgKyB0ICogKDEgLSB0aGlzLl9wMi55KVxyXG5cdFx0XHR9O1xyXG5cclxuXHJcblx0XHQvKiBTZWNvbmQgc2VyaWVzIG9mIGF1eGlsaWFyeSBwb2ludHMgKi9cclxuXHJcblx0XHQvLyBTZWNvbmQgY29udHJvbCBwb2ludCBvZiB0aGUgbGVmdCBjdXJ2ZVxyXG5cdFx0dmFyIGowID0ge1xyXG5cdFx0XHRcdHg6IGkwLnggKyB0ICogKGkxLnggLSBpMC54KSxcclxuXHRcdFx0XHR5OiBpMC55ICsgdCAqIChpMS55IC0gaTAueSlcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcdC8vIEZpcnN0IGNvbnRyb2wgcG9pbnQgb2YgdGhlIHJpZ2h0IGN1cnZlXHJcblx0XHRcdGoxID0ge1xyXG5cdFx0XHRcdHg6IGkxLnggKyB0ICogKGkyLnggLSBpMS54KSxcclxuXHRcdFx0XHR5OiBpMS55ICsgdCAqIChpMi55IC0gaTEueSlcclxuXHRcdFx0fTtcclxuXHJcblx0XHQvLyBUaGUgZGl2aXNpb24gcG9pbnQgKGVuZGluZyBwb2ludCBvZiBsZWZ0IGN1cnZlLCBzdGFydGluZyBwb2ludCBvZiByaWdodCBjdXJ2ZSlcclxuXHRcdHZhciBrID0ge1xyXG5cdFx0XHRcdHg6IGowLnggKyB0ICogKGoxLnggLSBqMC54KSxcclxuXHRcdFx0XHR5OiBqMC55ICsgdCAqIChqMS55IC0gajAueSlcclxuXHRcdFx0fTtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRpMDogaTAsXHJcblx0XHRcdGkxOiBpMSxcclxuXHRcdFx0aTI6IGkyLFxyXG5cdFx0XHRqMDogajAsXHJcblx0XHRcdGoxOiBqMSxcclxuXHRcdFx0azoga1xyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBEaXZpZGVzIHRoZSBiZXppZXIgY3VydmUgaW50byB0d28gYmV6aWVyIGZ1bmN0aW9ucy5cclxuXHQgKlxyXG5cdCAqIERlIENhc3RlbGphdSdzIGFsZ29yaXRobSBpcyB1c2VkIHRvIGNvbXB1dGUgdGhlIG5ldyBzdGFydGluZywgZW5kaW5nLCBhbmRcclxuXHQgKiBjb250cm9sIHBvaW50cy5cclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDAgYW5kIGxvd2VyIHRoYW4gMS5cclxuXHQgKiAgICAgdCA9PT0gMSBvciB0ID09PSAwIGFyZSB0aGUgc3RhcnRpbmcvZW5kaW5nIHBvaW50cyBvZiB0aGUgY3VydmUsIHNvIG5vXHJcblx0ICogICAgIGRpdmlzaW9uIGlzIG5lZWRlZC5cclxuXHQgKlxyXG5cdCAqIEByZXR1cm5zIHtDdWJpY0JlemllcltdfSBSZXR1cm5zIGFuIGFycmF5IGNvbnRhaW5pbmcgdHdvIGJlemllciBjdXJ2ZXNcclxuXHQgKiAgICAgdG8gdGhlIGxlZnQgYW5kIHRoZSByaWdodCBvZiB0LlxyXG5cdCAqL1xyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5kaXZpZGVBdFQgPSBmdW5jdGlvbiAodCkge1xyXG5cdFx0aWYgKHQgPCAwIHx8IHQgPiAxKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3QnLCB0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTcGVjaWFsIGNhc2VzIHQgPSAwLCB0ID0gMTogQ3VydmUgY2FuIGJlIGNsb25lZCBmb3Igb25lIHNpZGUsIHRoZSBvdGhlclxyXG5cdFx0Ly8gc2lkZSBpcyBhIGxpbmVhciBjdXJ2ZSAod2l0aCBkdXJhdGlvbiAwKVxyXG5cdFx0aWYgKHQgPT09IDAgfHwgdCA9PT0gMSkge1xyXG5cdFx0XHR2YXIgY3VydmVzID0gW107XHJcblx0XHRcdGN1cnZlc1t0XSA9IEN1YmljQmV6aWVyLmxpbmVhcigpO1xyXG5cdFx0XHRjdXJ2ZXNbMSAtIHRdID0gdGhpcy5jbG9uZSgpO1xyXG5cdFx0XHRyZXR1cm4gY3VydmVzO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBsZWZ0ID0ge30sXHJcblx0XHRcdHJpZ2h0ID0ge30sXHJcblx0XHRcdHBvaW50cyA9IHRoaXMuX2dldEF1eFBvaW50cyh0KTtcclxuXHJcblx0XHR2YXIgaTAgPSBwb2ludHMuaTAsXHJcblx0XHRcdGkyID0gcG9pbnRzLmkyLFxyXG5cdFx0XHRqMCA9IHBvaW50cy5qMCxcclxuXHRcdFx0ajEgPSBwb2ludHMuajEsXHJcblx0XHRcdGsgPSBwb2ludHMuaztcclxuXHJcblx0XHQvLyBOb3JtYWxpemUgZGVyaXZlZCBwb2ludHMsIHNvIHRoYXQgdGhlIG5ldyBjdXJ2ZXMgc3RhcnRpbmcvZW5kaW5nIHBvaW50XHJcblx0XHQvLyBjb29yZGluYXRlcyBhcmUgKDAsIDApIHJlc3BlY3RpdmVseSAoMSwgMSlcclxuXHRcdHZhciBmYWN0b3JYID0gay54LFxyXG5cdFx0XHRmYWN0b3JZID0gay55O1xyXG5cclxuXHRcdGxlZnQucDEgPSB7XHJcblx0XHRcdHg6IGkwLnggLyBmYWN0b3JYLFxyXG5cdFx0XHR5OiBpMC55IC8gZmFjdG9yWVxyXG5cdFx0fTtcclxuXHRcdGxlZnQucDIgPSB7XHJcblx0XHRcdHg6IGowLnggLyBmYWN0b3JYLFxyXG5cdFx0XHR5OiBqMC55IC8gZmFjdG9yWVxyXG5cdFx0fTtcclxuXHJcblx0XHRyaWdodC5wMSA9IHtcclxuXHRcdFx0eDogKGoxLnggLSBmYWN0b3JYKSAvICgxIC0gZmFjdG9yWCksXHJcblx0XHRcdHk6IChqMS55IC0gZmFjdG9yWSkgLyAoMSAtIGZhY3RvclkpXHJcblx0XHR9O1xyXG5cclxuXHRcdHJpZ2h0LnAyID0ge1xyXG5cdFx0XHR4OiAoaTIueCAtIGZhY3RvclgpIC8gKDEgLSBmYWN0b3JYKSxcclxuXHRcdFx0eTogKGkyLnkgLSBmYWN0b3JZKSAvICgxIC0gZmFjdG9yWSlcclxuXHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0bmV3IEN1YmljQmV6aWVyKGxlZnQucDEueCwgbGVmdC5wMS55LCBsZWZ0LnAyLngsIGxlZnQucDIueSksXHJcblx0XHRcdG5ldyBDdWJpY0JlemllcihyaWdodC5wMS54LCByaWdodC5wMS55LCByaWdodC5wMi54LCByaWdodC5wMi55KVxyXG5cdFx0XTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZGl2aWRlQXRYID0gZnVuY3Rpb24gKHgsIGVwc2lsb24pIHtcclxuXHRcdGlmICh4IDwgMCB8fCB4ID4gMSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCd4JywgeCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHQgPSB0aGlzLmdldFRGb3JYKHgsIGVwc2lsb24pO1xyXG5cdFx0cmV0dXJuIHRoaXMuZGl2aWRlQXRUKHQpO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5kaXZpZGVBdFkgPSBmdW5jdGlvbiAoeSwgZXBzaWxvbikge1xyXG5cdFx0aWYgKHkgPCAwIHx8IHkgPiAxKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3knLCB5KTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgdCA9IHRoaXMuZ2V0VEZvclkoeSwgZXBzaWxvbik7XHJcblx0XHRyZXR1cm4gdGhpcy5kaXZpZGVBdFQodCk7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBDdWJpY0Jlemllcih0aGlzLl9wMS54LCB0aGlzLl9wMS55LCB0aGlzLl9wMi54LCB0aGlzLl9wMi55KTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gXCJjdWJpYy1iZXppZXIoXCIgKyBbXHJcblx0XHRcdHRoaXMuX3AxLngsXHJcblx0XHRcdHRoaXMuX3AxLnksXHJcblx0XHRcdHRoaXMuX3AyLngsXHJcblx0XHRcdHRoaXMuX3AyLnlcclxuXHRcdF0uam9pbihcIiwgXCIpICsgXCIpXCI7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIubGluZWFyID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigpO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLmVhc2UgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAuMjUsIDAuMSwgMC4yNSwgMS4wKTtcclxuXHR9O1xyXG5cdEN1YmljQmV6aWVyLmxpbmVhciA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgQ3ViaWNCZXppZXIoMC4wLCAwLjAsIDEuMCwgMS4wKTtcclxuXHR9O1xyXG5cdEN1YmljQmV6aWVyLmVhc2VJbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgQ3ViaWNCZXppZXIoMC40MiwgMCwgMS4wLCAxLjApO1xyXG5cdH07XHJcblx0Q3ViaWNCZXppZXIuZWFzZU91dCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgQ3ViaWNCZXppZXIoMCwgMCwgMC41OCwgMS4wKTtcclxuXHR9O1xyXG5cdEN1YmljQmV6aWVyLmVhc2VJbk91dCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgQ3ViaWNCZXppZXIoMC40MiwgMCwgMC41OCwgMS4wKTtcclxuXHR9O1xyXG59KCkpO1xyXG5cclxuLy8gSWYgYSBDb21tb25KUyBlbnZpcm9ubWVudCBpcyBwcmVzZW50LCBhZGQgb3VyIGV4cG9ydHM7IG1ha2UgdGhlIGNoZWNrIGluIGEganNsaW50LWNvbXBhdGlibGUgbWV0aG9kLlxyXG52YXIgbW9kdWxlO1xyXG5pZiAobW9kdWxlICE9PSB1bmRlZmluZWQgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRvbU5vZGUsIG9wdGlvbnMpIHtcclxuXHRcdCd1c2Ugc3RyaWN0JztcclxuXHRcdHJldHVybiBuZXcgRlRTY3JvbGxlcihkb21Ob2RlLCBvcHRpb25zKTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cy5GVFNjcm9sbGVyID0gRlRTY3JvbGxlcjtcclxuXHRtb2R1bGUuZXhwb3J0cy5DdWJpY0JlemllciA9IEN1YmljQmV6aWVyO1xyXG59IiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cblxudmFyIGdhbGxlcnlET00gPSByZXF1aXJlKCcuL2dhbGxlcnlET00nKSxcbiAgICBGVFNjcm9sbGVyID0gcmVxdWlyZSgnRlRTY3JvbGxlcicpLFxuICAgIFNpbXBsZVNjcm9sbGVyID0gcmVxdWlyZSgnLi9TaW1wbGVTY3JvbGxlcicpO1xuXG5mdW5jdGlvbiBHYWxsZXJ5KGNvbnRhaW5lckVsLCBjb25maWcpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGlmICghZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHZpZXdwb3J0RWwsXG4gICAgICAgIGFsbEl0ZW1zRWwsXG4gICAgICAgIGl0ZW1FbHMsXG4gICAgICAgIHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICBzaG93bkl0ZW1JbmRleCxcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSxcbiAgICAgICAgc2Nyb2xsZXIsXG4gICAgICAgIGRlYm91bmNlU2Nyb2xsLFxuICAgICAgICB0cmFuc2l0aW9uSW5Qcm9ncmVzcyA9IGZhbHNlLFxuICAgICAgICBwcmV2Q29udHJvbERpdixcbiAgICAgICAgbmV4dENvbnRyb2xEaXYsXG4gICAgICAgIHByb3BlcnR5QXR0cmlidXRlTWFwID0ge1xuICAgICAgICAgICAgY29tcG9uZW50OiBcImRhdGEtby1jb21wb25lbnRcIixcbiAgICAgICAgICAgIHZlcnNpb246IFwiZGF0YS1vLXZlcnNpb25cIixcbiAgICAgICAgICAgIHN5bmNJRDogXCJkYXRhLW8tZ2FsbGVyeS1zeW5jaWRcIixcbiAgICAgICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlOiBcImRhdGEtby1nYWxsZXJ5LW11bHRpcGxlaXRlbXNwZXJwYWdlXCIsXG4gICAgICAgICAgICB0b3VjaDogXCJkYXRhLW8tZ2FsbGVyeS10b3VjaFwiLFxuICAgICAgICAgICAgY2FwdGlvbnM6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbnNcIixcbiAgICAgICAgICAgIGNhcHRpb25NaW5IZWlnaHQ6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1pbmhlaWdodFwiLFxuICAgICAgICAgICAgY2FwdGlvbk1heEhlaWdodDogXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCIsXG4gICAgICAgICAgICB3aW5kb3dSZXNpemU6IFwiZGF0YS1vLWdhbGxlcnktd2luZG93cmVzaXplXCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdENvbmZpZyA9IHtcbiAgICAgICAgICAgIGNvbXBvbmVudDogXCJvLWdhbGxlcnlcIixcbiAgICAgICAgICAgIHZlcnNpb246IFwiMC4wLjBcIixcbiAgICAgICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlOiBmYWxzZSxcbiAgICAgICAgICAgIGNhcHRpb25zOiB0cnVlLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogMjQsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiA1MixcbiAgICAgICAgICAgIHRvdWNoOiBmYWxzZSxcbiAgICAgICAgICAgIHN5bmNJRDogXCJvLWdhbGxlcnktXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgICAgICAgIHdpbmRvd1Jlc2l6ZTogdHJ1ZVxuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gc3VwcG9ydHNDc3NUcmFuc2Zvcm1zKCkge1xuICAgICAgICB2YXIgaHRtbEVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2h0bWwnKVswXTtcbiAgICAgICAgcmV0dXJuIGdhbGxlcnlET00uaGFzQ2xhc3MoaHRtbEVsLCBcImNzc3RyYW5zZm9ybXNcIikgfHwgZ2FsbGVyeURPTS5oYXNDbGFzcyhodG1sRWwsIFwiY3NzdHJhbnNmb3JtczNkXCIpIHx8IGdhbGxlcnlET00uaGFzQ2xhc3MoaHRtbEVsLCBcImNzc3RyYW5zaXRpb25zXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRGF0YVNvdXJjZSgpIHtcbiAgICAgICAgcmV0dXJuIChjb25maWcuaXRlbXMgJiYgY29uZmlnLml0ZW1zLmxlbmd0aCA+IDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFdpZHRocygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBsLFxuICAgICAgICAgICAgdG90YWxXaWR0aCA9IDAsXG4gICAgICAgICAgICBpdGVtV2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aDtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgaXRlbVdpZHRoID0gcGFyc2VJbnQoaXRlbUVsc1tzZWxlY3RlZEl0ZW1JbmRleF0uY2xpZW50V2lkdGgsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW1FbHNbaV0uc3R5bGUud2lkdGggPSBpdGVtV2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICB0b3RhbFdpZHRoICs9IGl0ZW1XaWR0aDtcbiAgICAgICAgfVxuICAgICAgICBhbGxJdGVtc0VsLnN0eWxlLndpZHRoID0gdG90YWxXaWR0aCArIFwicHhcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkSXRlbShuKSB7XG4gICAgICAgIHJldHVybiAodHlwZW9mIG4gPT09IFwibnVtYmVyXCIgJiYgbiA+IC0xICYmIG4gPCBpdGVtRWxzLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0ZWRJdGVtKCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gMCwgYywgbDtcbiAgICAgICAgZm9yIChjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoZ2FsbGVyeURPTS5oYXNDbGFzcyhpdGVtRWxzW2NdLCBcIm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIikpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSBjO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxlY3RlZEl0ZW07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkVWlDb250cm9scygpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1wcmV2XCIpO1xuICAgICAgICBuZXh0Q29udHJvbERpdiA9IGdhbGxlcnlET00uY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIlwiLCBcIm8tZ2FsbGVyeV9fY29udHJvbCBvLWdhbGxlcnlfX2NvbnRyb2wtLW5leHRcIik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQobmV4dENvbnRyb2xEaXYpO1xuICAgICAgICBnYWxsZXJ5RE9NLmxpc3RlbkZvckV2ZW50KHByZXZDb250cm9sRGl2LCBcImNsaWNrXCIsIHByZXYpO1xuICAgICAgICBnYWxsZXJ5RE9NLmxpc3RlbkZvckV2ZW50KG5leHRDb250cm9sRGl2LCBcImNsaWNrXCIsIG5leHQpO1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBnYWxsZXJ5RE9NLmxpc3RlbkZvckV2ZW50KHZpZXdwb3J0RWwsIFwiY2xpY2tcIiwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgICAgIHZhciBjbGlja2VkSXRlbU51bSA9IGdhbGxlcnlET00uZ2V0RWxlbWVudEluZGV4KGdhbGxlcnlET00uZ2V0Q2xvc2VzdChldnQuc3JjRWxlbWVudCwgXCJvLWdhbGxlcnlfX2l0ZW1cIikpO1xuICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oY2xpY2tlZEl0ZW1OdW0sIHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0Q2FwdGlvblNpemVzKCkge1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbUVsID0gaXRlbUVsc1tjXTtcbiAgICAgICAgICAgIGl0ZW1FbC5zdHlsZS5wYWRkaW5nQm90dG9tID0gY29uZmlnLmNhcHRpb25NaW5IZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB2YXIgY2FwdGlvbkVsID0gaXRlbUVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtX19jYXB0aW9uXCIpO1xuICAgICAgICAgICAgaWYgKGNhcHRpb25FbCkge1xuICAgICAgICAgICAgICAgIGNhcHRpb25FbC5zdHlsZS5taW5IZWlnaHQgPSBjb25maWcuY2FwdGlvbk1pbkhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgICAgICBjYXB0aW9uRWwuc3R5bGUubWF4SGVpZ2h0ID0gY29uZmlnLmNhcHRpb25NYXhIZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChuKSB7XG4gICAgICAgIHZhciBpdGVtTnVtcyA9IChuIGluc3RhbmNlb2YgQXJyYXkpID8gbiA6IFtuXTtcbiAgICAgICAgaWYgKGNvbmZpZy5pdGVtcykge1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtTnVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbU51bSA9IGl0ZW1OdW1zW2NdO1xuICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSXRlbShpdGVtTnVtKSAmJiAhY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBjb25maWcuaXRlbXNbaXRlbU51bV0sIGl0ZW1FbHNbaXRlbU51bV0pO1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzZXRDYXB0aW9uU2l6ZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1dob2xlSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ICsgaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCA8PSByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gKGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsIC0gaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPD0gcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SXRlbXNJblBhZ2VWaWV3KGwsIHIsIHdob2xlKSB7XG4gICAgICAgIHZhciBpdGVtc0luVmlldyA9IFtdLFxuICAgICAgICAgICAgb25seVdob2xlID0gKHR5cGVvZiB3aG9sZSAhPT0gXCJib29sZWFuXCIpID8gdHJ1ZSA6IHdob2xlO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGl0ZW1FbHMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGlmICgob25seVdob2xlICYmIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkgfHwgKCFvbmx5V2hvbGUgJiYgaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtc0luVmlldy5wdXNoKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpdGVtc0luVmlldztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkdhbGxlcnlDdXN0b21FdmVudChldnQpIHtcbiAgICAgICAgaWYgKGV2dC5zcmNFbGVtZW50ICE9PSBjb250YWluZXJFbCAmJiBldnQuc3luY0lEID09PSBjb25maWcuc3luY0lEICYmIGV2dC5vR2FsbGVyeVNvdXJjZSA9PT0gXCJ1c2VyXCIpIHtcbiAgICAgICAgICAgIHNlbGVjdEl0ZW0oZXZ0Lml0ZW1JRCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5Gb3JTeW5jRXZlbnRzKCkge1xuICAgICAgICBpZiAoZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyaWdnZXJFdmVudChuYW1lLCBkYXRhKSB7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCAmJiBjb250YWluZXJFbC5kaXNwYXRjaEV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudChuYW1lLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICAgIGV2ZW50LnN5bmNJRCA9IGNvbmZpZy5zeW5jSUQ7XG4gICAgICAgICAgICBldmVudC5nYWxsZXJ5ID0gZGF0YS5nYWxsZXJ5O1xuICAgICAgICAgICAgZXZlbnQuaXRlbUlEID0gZGF0YS5pdGVtSUQ7XG4gICAgICAgICAgICBldmVudC5vR2FsbGVyeVNvdXJjZSA9IGRhdGEuc291cmNlO1xuICAgICAgICAgICAgY29udGFpbmVyRWwuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3ZlVmlld3BvcnQobGVmdCwgdHJhbnNpdGlvbikge1xuICAgICAgICBzY3JvbGxlci5zY3JvbGxUbyhsZWZ0LCAwLCB0cmFuc2l0aW9uICE9PSBmYWxzZSk7XG4gICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhsZWZ0LCBsZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1MZWZ0KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgbW92ZVZpZXdwb3J0KGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCwgdHJhbnNpdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxpZ25JdGVtUmlnaHQobiwgdHJhbnNpdGlvbikge1xuICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCAtICh2aWV3cG9ydEVsLmNsaWVudFdpZHRoIC0gaXRlbUVsc1tuXS5jbGllbnRXaWR0aCk7XG4gICAgICAgIG1vdmVWaWV3cG9ydChuZXdTY3JvbGxMZWZ0LCB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBicmluZ0l0ZW1JbnRvVmlldyhuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmICghaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmlld3BvcnRMID0gc2Nyb2xsZXIuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIHZpZXdwb3J0UiA9IHZpZXdwb3J0TCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICBpdGVtTCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCxcbiAgICAgICAgICAgIGl0ZW1SID0gaXRlbUwgKyBpdGVtRWxzW25dLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoaXRlbUwgPiB2aWV3cG9ydEwgJiYgaXRlbVIgPCB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXRlbUwgPCB2aWV3cG9ydEwpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobiwgdHJhbnNpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbVIgPiB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbVJpZ2h0KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0l0ZW0obiwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGJyaW5nSXRlbUludG9WaWV3KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICAgICAgc2hvd25JdGVtSW5kZXggPSBuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZJdGVtKCkge1xuICAgICAgICB2YXIgcHJldiA9IChzaG93bkl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzaG93bkl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNob3dJdGVtKHByZXYpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0SXRlbSgpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2hvd25JdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2hvd25JdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2hvd0l0ZW0obmV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZQYWdlKCkge1xuICAgICAgICBpZiAoc2Nyb2xsZXIuc2Nyb2xsTGVmdCA9PT0gMCkge1xuICAgICAgICAgICAgc2hvd0l0ZW0oaXRlbUVscy5sZW5ndGggLSAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmV2UGFnZVdob2xlSXRlbXMgPSBnZXRJdGVtc0luUGFnZVZpZXcoc2Nyb2xsZXIuc2Nyb2xsTGVmdCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIHNjcm9sbGVyLnNjcm9sbExlZnQpLFxuICAgICAgICAgICAgICAgIHByZXZQYWdlSXRlbSA9IHByZXZQYWdlV2hvbGVJdGVtcy5wb3AoKSB8fCAwO1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQocHJldlBhZ2VJdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0UGFnZSgpIHtcbiAgICAgICAgaWYgKHNjcm9sbGVyLnNjcm9sbExlZnQgPT09IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzaG93SXRlbSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50V2hvbGVJdGVtc0luVmlldyA9IGdldEl0ZW1zSW5QYWdlVmlldyhzY3JvbGxlci5zY3JvbGxMZWZ0LCBzY3JvbGxlci5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCksXG4gICAgICAgICAgICAgICAgbGFzdFdob2xlSXRlbUluVmlldyA9IGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3LnBvcCgpIHx8IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobGFzdFdob2xlSXRlbUluVmlldyArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0SXRlbShuLCBzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IFwiYXBpXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgICAgIHNob3dJdGVtKG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG4gIT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBuO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGl0ZW1FbHNbY10sIFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00ucmVtb3ZlQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUlEOiBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdFByZXZJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgcHJldiA9IChzZWxlY3RlZEl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzZWxlY3RlZEl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNlbGVjdEl0ZW0ocHJldiwgc2hvdywgc291cmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3ROZXh0SXRlbShzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2VsZWN0SXRlbShuZXh0LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uSW5Qcm9ncmVzcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dQcmV2UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0UHJldkl0ZW0odHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgaWYgKHRyYW5zaXRpb25JblByb2dyZXNzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd05leHRQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3ROZXh0SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7IC8vIGNvcnJlY3QgdGhlIGFsaWdubWVudCBvZiBpdGVtIGluIHZpZXdcbiAgICAgICAgICAgIHNob3dJdGVtKHNob3duSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IHNjcm9sbGVyLnNjcm9sbExlZnQ7XG4gICAgICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcobmV3U2Nyb2xsTGVmdCwgbmV3U2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNpemVIYW5kbGVyKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoZGVib3VuY2VPblJlc2l6ZSk7XG4gICAgICAgIGRlYm91bmNlT25SZXNpemUgPSBzZXRUaW1lb3V0KG9uUmVzaXplLCA1MDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4dGVuZE9iamVjdHMob2Jqcykge1xuICAgICAgICB2YXIgbmV3T2JqID0ge307XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gb2Jqcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBvYmpzW2NdO1xuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld09ialtwcm9wXSA9IG9ialtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld09iajtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVEYXRhQXR0cmlidXRlcygpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5zZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXMoY29udGFpbmVyRWwsIGNvbmZpZywgcHJvcGVydHlBdHRyaWJ1dGVNYXAsIFtcIml0ZW1zXCJdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRTeW5jSUQoaWQpIHtcbiAgICAgICAgY29uZmlnLnN5bmNJRCA9IGlkO1xuICAgICAgICB1cGRhdGVEYXRhQXR0cmlidXRlcygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFN5bmNJRCgpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5zeW5jSUQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3luY1dpdGgoZ2FsbGVyeUluc3RhbmNlKSB7XG4gICAgICAgIHNldFN5bmNJRChnYWxsZXJ5SW5zdGFuY2UuZ2V0U3luY0lEKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uU2Nyb2xsKGV2dCkge1xuICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcoZXZ0LnNjcm9sbExlZnQsIGV2dC5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgICBwcmV2Q29udHJvbERpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYgPSBudWxsO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYgPSBudWxsO1xuICAgICAgICBzY3JvbGxlci5kZXN0cm95KHRydWUpO1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHByb3BlcnR5QXR0cmlidXRlTWFwKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydHlBdHRyaWJ1dGVNYXAuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXJFbC5yZW1vdmVBdHRyaWJ1dGUocHJvcGVydHlBdHRyaWJ1dGVNYXBbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwgb25HYWxsZXJ5Q3VzdG9tRXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcud2luZG93UmVzaXplKSB7XG4gICAgICAgICAgICBnYWxsZXJ5RE9NLnVubGlzdGVuRm9yRXZlbnQod2luZG93LCBcInJlc2l6ZVwiLCByZXNpemVIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdhbGxlcnlET00uYWRkQ2xhc3MoY29udGFpbmVyRWwsIFwiby1nYWxsZXJ5LS1qc1wiKTtcbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5lbXB0eUVsZW1lbnQoY29udGFpbmVyRWwpO1xuICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGNvbnRhaW5lckVsLCBcIm8tZ2FsbGVyeVwiKTtcbiAgICAgICAgYWxsSXRlbXNFbCA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKTtcbiAgICAgICAgaXRlbUVscyA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXMoYWxsSXRlbXNFbCwgY29uZmlnLml0ZW1zKTtcbiAgICB9XG4gICAgY29uZmlnID0gZXh0ZW5kT2JqZWN0cyhbZGVmYXVsdENvbmZpZywgZ2FsbGVyeURPTS5nZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXMoY29udGFpbmVyRWwsIHByb3BlcnR5QXR0cmlidXRlTWFwKSwgY29uZmlnXSk7XG4gICAgdXBkYXRlRGF0YUF0dHJpYnV0ZXMoKTtcbiAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIGl0ZW1FbHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbiAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgIHNob3duSXRlbUluZGV4ID0gc2VsZWN0ZWRJdGVtSW5kZXg7XG4gICAgaWYgKGNvbmZpZy53aW5kb3dSZXNpemUpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudCh3aW5kb3csIFwicmVzaXplXCIsIHJlc2l6ZUhhbmRsZXIpO1xuICAgIH1cbiAgICBpbnNlcnRJdGVtQ29udGVudChzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgc2V0V2lkdGhzKCk7XG4gICAgc2V0Q2FwdGlvblNpemVzKCk7XG4gICAgaWYgKHN1cHBvcnRzQ3NzVHJhbnNmb3JtcygpKSB7XG4gICAgICAgIHNjcm9sbGVyID0gbmV3IEZUU2Nyb2xsZXIoY29udGFpbmVyRWwsIHtcbiAgICAgICAgICAgIHNjcm9sbGJhcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2Nyb2xsaW5nWTogZmFsc2UsXG4gICAgICAgICAgICB1cGRhdGVPbldpbmRvd1Jlc2l6ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNuYXBwaW5nOiAhY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlLFxuICAgICAgICAgICAgLyogQ2FuJ3QgdXNlIGZsaW5nL2luZXJ0aWFsIHNjcm9sbCBhcyBhZnRlciB1c2VyIGlucHV0IGlzIGZpbmlzaGVkIGFuZCBzY3JvbGwgY29udGludWVzLCBzY3JvbGwgZXZlbnRzIGFyZSBub1xuICAgICAgICAgICAgIGxvbmdlciBmaXJlZCwgYW5kIHZhbHVlIG9mIHNjcm9sbExlZnQgZG9lc24ndCBjaGFuZ2UgdW50aWwgc2Nyb2xsZW5kLiAqL1xuICAgICAgICAgICAgZmxpbmdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZUlucHV0TWV0aG9kczoge1xuICAgICAgICAgICAgICAgIHRvdWNoOiAhY29uZmlnLnRvdWNoLFxuICAgICAgICAgICAgICAgIHNjcm9sbDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgc2Nyb2xsZXIuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbHN0YXJ0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdHJhbnNpdGlvbkluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgc2Nyb2xsZXIuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChkZWJvdW5jZVNjcm9sbCk7XG4gICAgICAgICAgICBkZWJvdW5jZVNjcm9sbCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG9uU2Nyb2xsKGV2dCk7XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzY3JvbGxlci5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsZW5kXCIsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdHJhbnNpdGlvbkluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIG9uU2Nyb2xsKGV2dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzY3JvbGxlci5hZGRFdmVudExpc3RlbmVyKFwic2VnbWVudHdpbGxjaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oc2Nyb2xsZXIuY3VycmVudFNlZ21lbnQueCwgZmFsc2UsIFwidXNlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsZXIgPSBuZXcgU2ltcGxlU2Nyb2xsZXIoY29udGFpbmVyRWwsIHt9KTtcbiAgICB9XG4gICAgdmlld3BvcnRFbCA9IHNjcm9sbGVyLmNvbnRlbnRDb250YWluZXJOb2RlLnBhcmVudE5vZGU7XG4gICAgZ2FsbGVyeURPTS5hZGRDbGFzcyh2aWV3cG9ydEVsLCBcIm8tZ2FsbGVyeV9fdmlld3BvcnRcIik7XG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KHNjcm9sbGVyLnNjcm9sbExlZnQsIHNjcm9sbGVyLnNjcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgIHNob3dJdGVtKHNlbGVjdGVkSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgYWRkVWlDb250cm9scygpO1xuICAgIGxpc3RlbkZvclN5bmNFdmVudHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuICAgIHRoaXMuZ2V0U3luY0lEID0gZ2V0U3luY0lEO1xuICAgIHRoaXMuc3luY1dpdGggPSBzeW5jV2l0aDtcbiAgICB0aGlzLm9uUmVzaXplID0gb25SZXNpemU7XG4gICAgdGhpcy5kZXN0cm95ID0gZGVzdHJveTtcblxuICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5UmVhZHlcIiwge1xuICAgICAgICBnYWxsZXJ5OiB0aGlzXG4gICAgfSk7XG5cbn1cblxuR2FsbGVyeS5jcmVhdGVBbGxJbiA9IGZ1bmN0aW9uKGVsLCBjb25maWcpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgY29uZiA9IGNvbmZpZyB8fCB7fSxcbiAgICAgICAgZ0VscyxcbiAgICAgICAgZ2FsbGVyaWVzID0gW107XG4gICAgaWYgKGVsLnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICAgICAgZ0VscyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1vLWNvbXBvbmVudD1vLWdhbGxlcnldXCIpO1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGdFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBnYWxsZXJpZXMucHVzaChuZXcgR2FsbGVyeShnRWxzW2NdLCBjb25mKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGdhbGxlcmllcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR2FsbGVyeTsiLCIvKiBnbG9iYWwgcmVxdWlyZSwgbW9kdWxlICovXG5cbnZhciBnYWxsZXJ5RE9NID0gcmVxdWlyZSgnLi9nYWxsZXJ5RE9NJyk7XG5cbi8qKlxuICogTWltaWNzIEZUU2Nyb2xsZXIgaW4gc2ltcGxlc3QgcG9zc2libGUgd2F5ICh3aXRob3V0IHRvdWNoIGludGVyZmFjZSwgdHJhbnNpdGlvbnMgb3IgZXZlbnRzKVxuICogSW50ZW5kZWQgZm9yIElFOCBwYXJ0aWN1bGFybHkuXG4gKi9cblxuZnVuY3Rpb24gU2ltcGxlU2Nyb2xsZXIoY29udGFpbmVyRWwsIGNvbmZpZykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgYWxsSXRlbXNFbCxcbiAgICAgICAgdmlld3BvcnRFbDtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVByb3BlcnRpZXMoKSB7XG4gICAgICAgIHNlbGYuc2Nyb2xsTGVmdCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY3JvbGxUbyhuKSB7XG4gICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IG47XG4gICAgICAgIHVwZGF0ZVByb3BlcnRpZXMoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgICBnYWxsZXJ5RE9NLnVud3JhcEVsZW1lbnQodmlld3BvcnRFbCk7XG4gICAgfVxuXG4gICAgYWxsSXRlbXNFbCA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJy5vLWdhbGxlcnlfX2l0ZW1zJyk7XG4gICAgdmlld3BvcnRFbCA9IGdhbGxlcnlET00uY3JlYXRlRWxlbWVudCgnZGl2JywgJycsICdvLWdhbGxlcnlfX3ZpZXdwb3J0Jyk7XG4gICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQodmlld3BvcnRFbCk7XG4gICAgZ2FsbGVyeURPTS53cmFwRWxlbWVudChhbGxJdGVtc0VsLCB2aWV3cG9ydEVsKTtcbiAgICB1cGRhdGVQcm9wZXJ0aWVzKCk7XG5cbiAgICB0aGlzLmNvbnRlbnRDb250YWluZXJOb2RlID0gYWxsSXRlbXNFbDtcbiAgICB0aGlzLnNjcm9sbFRvID0gc2Nyb2xsVG87XG4gICAgdGhpcy5kZXN0cm95ID0gZGVzdHJveTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXBsZVNjcm9sbGVyOyIsIi8qZ2xvYmFsIG1vZHVsZSovXG5cblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBlbXB0eUVsZW1lbnQodGFyZ2V0RWwpIHtcbiAgICB3aGlsZSAodGFyZ2V0RWwuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YXJnZXRFbC5yZW1vdmVDaGlsZCh0YXJnZXRFbC5maXJzdENoaWxkKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQobm9kZU5hbWUsIGNvbnRlbnQsIGNsYXNzZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICBlbC5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMpO1xuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gd3JhcEVsZW1lbnQodGFyZ2V0RWwsIHdyYXBFbCkge1xuICAgIHZhciBwYXJlbnRFbCA9IHRhcmdldEVsLnBhcmVudE5vZGU7XG4gICAgd3JhcEVsLmFwcGVuZENoaWxkKHRhcmdldEVsKTtcbiAgICBwYXJlbnRFbC5hcHBlbmRDaGlsZCh3cmFwRWwpO1xufVxuXG5mdW5jdGlvbiB1bndyYXBFbGVtZW50KHRhcmdldEVsKSB7XG4gICAgdmFyIHdyYXBwaW5nRWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB3cmFwcGluZ0VsUGFyZW50ID0gd3JhcHBpbmdFbC5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh3cmFwcGluZ0VsLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB3cmFwcGluZ0VsUGFyZW50LmFwcGVuZENoaWxkKHdyYXBwaW5nRWwuY2hpbGROb2Rlc1swXSk7XG4gICAgfVxuICAgIHdyYXBwaW5nRWxQYXJlbnQucmVtb3ZlQ2hpbGQod3JhcHBpbmdFbCk7XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjKSB7XG4gICAgcmV0dXJuICgnICcgKyBlbC5jbGFzc05hbWUgKyAnICcpLmluZGV4T2YoJyAnICsgYyArICcgJykgPiAtMTtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGMpIHtcbiAgICBpZiAoIWhhc0NsYXNzKGVsLCBjKSkge1xuICAgICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUgKyBcIiBcIiArIGM7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgYykge1xuICAgIGlmIChoYXNDbGFzcyhlbCwgYykpIHtcbiAgICAgICAgdmFyIHJlZyA9IG5ldyBSZWdFeHAoJyhcXFxcc3xeKScgKyBjICsgJyhcXFxcc3wkKScpO1xuICAgICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShyZWcsJyAnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCkge1xuICAgIHZhciBpdGVtc0xpc3QgPSBjcmVhdGVFbGVtZW50KFwib2xcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGl0ZW1zTGlzdCk7XG4gICAgcmV0dXJuIGl0ZW1zTGlzdDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXMoY29udGFpbmVyRWwsIGl0ZW1zKSB7XG4gICAgdmFyIGl0ZW1DbGFzcztcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBpdGVtQ2xhc3MgPSBcIm8tZ2FsbGVyeV9faXRlbVwiICsgKChpdGVtc1tjXS5zZWxlY3RlZCkgPyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIgOiBcIlwiICk7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBcIiZuYnNwO1wiLCBpdGVtQ2xhc3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChjb25maWcsIGl0ZW0sIGl0ZW1FbCkge1xuICAgIGVtcHR5RWxlbWVudChpdGVtRWwpO1xuICAgIHZhciBjb250ZW50RWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uY29udGVudCwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NvbnRlbnRcIik7XG4gICAgaXRlbUVsLmFwcGVuZENoaWxkKGNvbnRlbnRFbCk7XG4gICAgaWYgKGNvbmZpZy5jYXB0aW9ucykge1xuICAgICAgICB2YXIgY2FwdGlvbkVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLmNhcHRpb24gfHwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgIGl0ZW1FbC5hcHBlbmRDaGlsZChjYXB0aW9uRWwpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3BOYW1lLCBlbCwgYXR0ck5hbWUpIHtcbiAgICB2YXIgdiA9IGVsLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgaWYgKHYgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKHYgPT09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICB2ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2ID09PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgIHYgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBvYmpbcHJvcE5hbWVdID0gdjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlcyhlbCwgbWFwKSB7XG4gICAgdmFyIG9iaiA9IHt9LFxuICAgICAgICBwcm9wO1xuICAgIGZvciAocHJvcCBpbiBtYXApIHtcbiAgICAgICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3AsIGVsLCBtYXBbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZihhLCB2KSB7XG4gICAgdmFyIGkgPSAtMTtcbiAgICBpZiAoQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcbiAgICAgICAgcmV0dXJuIGEuaW5kZXhPZih2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGEubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoYVtjXSA9PT0gdikge1xuICAgICAgICAgICAgICAgIGkgPSBjO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXMoZWwsIG9iaiwgbWFwLCBleGNsKSB7XG4gICAgdmFyIGV4Y2x1ZGUgPSBleGNsIHx8IFtdO1xuICAgIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkgJiYgYXJyYXlJbmRleE9mKGV4Y2x1ZGUsIHByb3ApIDwgMCkge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG1hcFtwcm9wXSwgb2JqW3Byb3BdKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0Q2xvc2VzdChlbCwgYykge1xuICAgIHdoaWxlICghaGFzQ2xhc3MoZWwsIGMpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRJbmRleChlbCkge1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoZWwgPSBlbC5wcmV2aW91c1NpYmxpbmcpIHtcbiAgICAgICAgaWYgKGVsLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgICAgICArK2k7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIGxpc3RlbkZvckV2ZW50KGVsLCBuYW1lLCBoYW5kbGVyKSB7XG4gICAgaWYgKGVsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBoYW5kbGVyLCBmYWxzZSk7XG4gICAgfSBlbHNlIGlmIChlbC5hdHRhY2hFdmVudCkge1xuICAgICAgICBlbC5hdHRhY2hFdmVudChcIm9uXCIgKyBuYW1lLCBoYW5kbGVyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHVubGlzdGVuRm9yRXZlbnQoZWwsIG5hbWUsIGhhbmRsZXIpIHtcbiAgICBpZiAoZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGhhbmRsZXIsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKGVsLmRldGFjaEV2ZW50KSB7XG4gICAgICAgIGVsLmRldGFjaEV2ZW50KFwib25cIiArIG5hbWUsIGhhbmRsZXIpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW1wdHlFbGVtZW50OiBlbXB0eUVsZW1lbnQsXG4gICAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgICB3cmFwRWxlbWVudDogd3JhcEVsZW1lbnQsXG4gICAgdW53cmFwRWxlbWVudDogdW53cmFwRWxlbWVudCxcbiAgICBoYXNDbGFzczogaGFzQ2xhc3MsXG4gICAgYWRkQ2xhc3M6IGFkZENsYXNzLFxuICAgIHJlbW92ZUNsYXNzOiByZW1vdmVDbGFzcyxcbiAgICBjcmVhdGVJdGVtc0xpc3Q6IGNyZWF0ZUl0ZW1zTGlzdCxcbiAgICBjcmVhdGVJdGVtczogY3JlYXRlSXRlbXMsXG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQ6IGluc2VydEl0ZW1Db250ZW50LFxuICAgIHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllczogc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzLFxuICAgIGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlczogZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzLFxuICAgIGdldENsb3Nlc3Q6IGdldENsb3Nlc3QsXG4gICAgZ2V0RWxlbWVudEluZGV4OiBnZXRFbGVtZW50SW5kZXgsXG4gICAgbGlzdGVuRm9yRXZlbnQ6IGxpc3RlbkZvckV2ZW50LFxuICAgIHVubGlzdGVuRm9yRXZlbnQ6IHVubGlzdGVuRm9yRXZlbnRcbn07Il19
