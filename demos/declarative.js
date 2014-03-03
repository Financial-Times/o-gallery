require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"pqw3SN":[function(require,module,exports){
/*global require, console */
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

window.galleries = Gallery.createAllIn(document.body);

},{"./../main.js":3}],"o-gallery":[function(require,module,exports){
module.exports=require('pqw3SN');
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

    function updateControlStates() {
        prevControlDiv.style.display = (scroller.scrollLeft > 0) ? "block" : "none";
        nextControlDiv.style.display = (scroller.scrollLeft < allItemsEl.clientWidth - viewportEl.clientWidth) ? "block" : "none";
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
        scroller.scrollTo(left, 0, config.multipleItemsPerPage);
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
        if (config.multipleItemsPerPage) {
            showPrevPage();
        } else {
            selectPrevItem(true, "user");
        }
    }

    function next() {
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
        updateControlStates();
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
            disabledInputMethods: {
                touch: !config.touch,
                scroll: true
            }
        });
        scroller.addEventListener("scroll", function(evt) {
            clearTimeout(debounceScroll);
            debounceScroll = setTimeout(function () {
                onScroll(evt);
            }, 50);
        });
        scroller.addEventListener("scrollend", function(evt) {
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
    updateControlStates();
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
},{}]},{},["pqw3SN"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvZGVtby1zcmMvZGVjbGFyYXRpdmUuanMiLCIvVXNlcnMvZGFuc2VhcmxlL1dvcmtzcGFjZS9GVC9PcmlnYW1pL28tZ2FsbGVyeS9tYWluLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbm9kZV9tb2R1bGVzL0ZUU2Nyb2xsZXIvbGliL2Z0c2Nyb2xsZXIuanMiLCIvVXNlcnMvZGFuc2VhcmxlL1dvcmtzcGFjZS9GVC9PcmlnYW1pL28tZ2FsbGVyeS9zcmMvanMvR2FsbGVyeS5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9TaW1wbGVTY3JvbGxlci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdnNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypnbG9iYWwgcmVxdWlyZSwgY29uc29sZSAqL1xudmFyIEdhbGxlcnkgPSByZXF1aXJlKCcuLy4uL21haW4uanMnKTtcblxuaWYgKGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwib0dhbGxlcnlSZWFkeVwiLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIGNvbnNvbGUubG9nID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2FsbGVyeSByZWFkeVwiLCBldnQuZ2FsbGVyeSk7XG4gICAgICAgICAgICBwYXJlbnQgJiYgcGFyZW50LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVzaXplJyxcbiAgICAgICAgICAgICAgICB1cmw6IGxvY2F0aW9uLmhyZWYsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodFxuICAgICAgICAgICAgfSksICcqJyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxud2luZG93LmdhbGxlcmllcyA9IEdhbGxlcnkuY3JlYXRlQWxsSW4oZG9jdW1lbnQuYm9keSk7XG4iLCIvKmdsb2JhbCByZXF1aXJlLCBtb2R1bGUqL1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9qcy9HYWxsZXJ5Jyk7IiwiLyoqXHJcbiAqIEZUU2Nyb2xsZXI6IHRvdWNoIGFuZCBtb3VzZS1iYXNlZCBzY3JvbGxpbmcgZm9yIERPTSBlbGVtZW50cyBsYXJnZXIgdGhhbiB0aGVpciBjb250YWluZXJzLlxyXG4gKlxyXG4gKiBXaGlsZSB0aGlzIGlzIGEgcmV3cml0ZSwgaXQgaXMgaGVhdmlseSBpbnNwaXJlZCBieSB0d28gcHJvamVjdHM6XHJcbiAqIDEpIFV4ZWJ1IFRvdWNoU2Nyb2xsIChodHRwczovL2dpdGh1Yi5jb20vZGF2aWRhdXJlbGlvL1RvdWNoU2Nyb2xsKSwgQlNEIGxpY2Vuc2VkOlxyXG4gKiAgICBDb3B5cmlnaHQgKGMpIDIwMTAgdXhlYnUgQ29uc3VsdGluZyBMdGQuICYgQ28uIEtHXHJcbiAqICAgIENvcHlyaWdodCAoYykgMjAxMCBEYXZpZCBBdXJlbGlvXHJcbiAqIDIpIFp5bmdhIFNjcm9sbGVyIChodHRwczovL2dpdGh1Yi5jb20venluZ2Evc2Nyb2xsZXIpLCBNSVQgbGljZW5zZWQ6XHJcbiAqICAgIENvcHlyaWdodCAyMDExLCBaeW5nYSBJbmMuXHJcbiAqICAgIENvcHlyaWdodCAyMDExLCBEZXV0c2NoZSBUZWxla29tIEFHXHJcbiAqXHJcbiAqIEluY2x1ZGVzIEN1YmljQmV6aWVyOlxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgKEMpIDIwMDggQXBwbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTAgRGF2aWQgQXVyZWxpby4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cclxuICogQ29weXJpZ2h0IChDKSAyMDEwIHV4ZWJ1IENvbnN1bHRpbmcgTHRkLiAmIENvLiBLRy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cclxuICpcclxuICogUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XHJcbiAqIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uc1xyXG4gKiBhcmUgbWV0OlxyXG4gKiAxLiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxyXG4gKiAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXHJcbiAqIDIuIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XHJcbiAqICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcclxuICogICAgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cclxuICpcclxuICogVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBBUFBMRSBJTkMuLCBEQVZJRCBBVVJFTElPLCBBTkQgVVhFQlVcclxuICogQ09OU1VMVElORyBMVEQuICYgQ08uIEtHIGBgQVMgSVMnJyBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRFxyXG4gKiBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRlxyXG4gKiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRSBESVNDTEFJTUVELlxyXG4gKiBJTiBOTyBFVkVOVCBTSEFMTCBBUFBMRSBJTkMuIE9SIENPTlRSSUJVVE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBESVJFQ1QsXHJcbiAqIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xyXG4gKiAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1JcclxuICogU0VSVklDRVM7IExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pXHJcbiAqIEhPV0VWRVIgQ0FVU0VEIEFORCBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCxcclxuICogU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVCAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HXHJcbiAqIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0YgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRVxyXG4gKiBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cclxuICpcclxuICogQGNvcHlyaWdodCBUaGUgRmluYW5jaWFsIFRpbWVzIEx0ZCBbQWxsIHJpZ2h0cyByZXNlcnZlZF1cclxuICogQGNvZGluZ3N0YW5kYXJkIGZ0bGFicy1qc2xpbnRcclxuICogQHZlcnNpb24gMC4zLjBcclxuICovXHJcbi8qKlxyXG4gKiBAbGljZW5zZSBGVFNjcm9sbGVyIGlzIChjKSAyMDEyIFRoZSBGaW5hbmNpYWwgVGltZXMgTHRkIFtBbGwgcmlnaHRzIHJlc2VydmVkXSBhbmQgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxyXG4gKlxyXG4gKiBJbnNwaXJlZCBieSBVeGVidSBUb3VjaFNjcm9sbCwgKGMpIDIwMTAgdXhlYnUgQ29uc3VsdGluZyBMdGQuICYgQ28uIEtHIGFuZCBEYXZpZCBBdXJlbGlvLCB3aGljaCBpcyBCU0QgbGljZW5zZWQgKGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGF1cmVsaW8vVG91Y2hTY3JvbGwpXHJcbiAqIEluc3BpcmVkIGJ5IFp5bmdhIFNjcm9sbGVyLCAoYykgMjAxMSBaeW5nYSBJbmMgYW5kIERldXRzY2hlIFRlbGVrb20gQUcsIHdoaWNoIGlzIE1JVCBsaWNlbnNlZCAoaHR0cHM6Ly9naXRodWIuY29tL3p5bmdhL3Njcm9sbGVyKVxyXG4gKiBJbmNsdWRlcyBDdWJpY0JlemllciwgKGMpIDIwMDggQXBwbGUgSW5jIFtBbGwgcmlnaHRzIHJlc2VydmVkXSwgKGMpIDIwMTAgRGF2aWQgQXVyZWxpbyBhbmQgdXhlYnUgQ29uc3VsdGluZyBMdGQuICYgQ28uIEtHLiBbQWxsIHJpZ2h0cyByZXNlcnZlZF0sIHdoaWNoIGlzIDItY2xhdXNlIEJTRCBsaWNlbnNlZCAoc2VlIGFib3ZlIG9yIGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGF1cmVsaW8vVG91Y2hTY3JvbGwpLlxyXG4gKi9cclxuXHJcbi8qanNsaW50IG5vbWVuOiB0cnVlLCB2YXJzOiB0cnVlLCBicm93c2VyOiB0cnVlLCBjb250aW51ZTogdHJ1ZSwgd2hpdGU6IHRydWUqL1xyXG4vKmdsb2JhbHMgRlRTY3JvbGxlck9wdGlvbnMqL1xyXG5cclxudmFyIEZUU2Nyb2xsZXIsIEN1YmljQmV6aWVyO1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdC8vIEdsb2JhbCBmbGFnIHRvIGRldGVybWluZSBpZiBhbnkgc2Nyb2xsIGlzIGN1cnJlbnRseSBhY3RpdmUuICBUaGlzIHByZXZlbnRzXHJcblx0Ly8gaXNzdWVzIHdoZW4gdXNpbmcgbXVsdGlwbGUgc2Nyb2xsZXJzLCBwYXJ0aWN1bGFybHkgd2hlbiB0aGV5J3JlIG5lc3RlZC5cclxuXHR2YXIgX2Z0c2Nyb2xsZXJNb3ZpbmcgPSBmYWxzZTtcclxuXHJcblx0Ly8gRGV0ZXJtaW5lIHdoZXRoZXIgcG9pbnRlciBldmVudHMgb3IgdG91Y2ggZXZlbnRzIGNhbiBiZSB1c2VkXHJcblx0dmFyIF90cmFja1BvaW50ZXJFdmVudHMgPSB3aW5kb3cubmF2aWdhdG9yLm1zUG9pbnRlckVuYWJsZWQ7XHJcblx0aWYgKCdwcm9wZXJ0eUlzRW51bWVyYWJsZScgaW4gd2luZG93IHx8ICdoYXNPd25Qcm9wZXJ0eScgaW4gd2luZG93LmRvY3VtZW50KSB7XHJcblx0XHR2YXIgX3RyYWNrVG91Y2hFdmVudHMgPSAhX3RyYWNrUG9pbnRlckV2ZW50cyAmJiAod2luZG93LnByb3BlcnR5SXNFbnVtZXJhYmxlKCdvbnRvdWNoc3RhcnQnKSB8fCB3aW5kb3cuZG9jdW1lbnQuaGFzT3duUHJvcGVydHkoJ29udG91Y2hzdGFydCcpKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0dmFyIF90cmFja1RvdWNoRXZlbnRzID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBEZXRlcm1pbmUgd2hldGhlciB0byB1c2UgbW9kZXJuIGhhcmR3YXJlIGFjY2VsZXJhdGlvbiBydWxlcyBvciBkeW5hbWljL3RvZ2dsZWFibGUgcnVsZXMuXHJcblx0Ly8gQ2VydGFpbiBvbGRlciBicm93c2VycyAtIHBhcnRpY3VsYXJseSBBbmRyb2lkIGJyb3dzZXJzIC0gaGF2ZSBwcm9ibGVtcyB3aXRoIGhhcmR3YXJlXHJcblx0Ly8gYWNjZWxlcmF0aW9uLCBzbyBiZWluZyBhYmxlIHRvIHRvZ2dsZSB0aGUgYmVoYXZpb3VyIGR5bmFtaWNhbGx5IHZpYSBhIENTUyBjYXNjYWRlIGlzIGRlc2lyYWJsZS5cclxuXHRpZiAoJ2hhc093blByb3BlcnR5JyBpbiB3aW5kb3cpIHtcclxuXHRcdHZhciBfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID0gIXdpbmRvdy5oYXNPd25Qcm9wZXJ0eSgnQXJyYXlCdWZmZXInKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0dmFyIF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPSBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vIEZlYXR1cmUgZGV0ZWN0aW9uXHJcblx0dmFyIF9jYW5DbGVhclNlbGVjdGlvbiA9ICh3aW5kb3cuU2VsZWN0aW9uICYmIHdpbmRvdy5TZWxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZUFsbFJhbmdlcyk7XHJcblxyXG5cdC8vIERldGVybWluZSB0aGUgYnJvd3NlciBlbmdpbmUgYW5kIHByZWZpeCwgdHJ5aW5nIHRvIHVzZSB0aGUgdW5wcmVmaXhlZCB2ZXJzaW9uIHdoZXJlIGF2YWlsYWJsZS5cclxuXHR2YXIgX3ZlbmRvckNTU1ByZWZpeCwgX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXgsIF92ZW5kb3JUcmFuc2Zvcm1Mb29rdXA7XHJcblx0aWYgKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlLnRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRfdmVuZG9yQ1NTUHJlZml4ID0gJyc7XHJcblx0XHRfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA9ICcnO1xyXG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICd0cmFuc2Zvcm0nO1xyXG5cdH0gZWxzZSBpZiAod2luZG93Lm9wZXJhICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cub3BlcmEpID09PSAnW29iamVjdCBPcGVyYV0nKSB7XHJcblx0XHRfdmVuZG9yQ1NTUHJlZml4ID0gJy1vLSc7XHJcblx0XHRfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA9ICdPJztcclxuXHRcdF92ZW5kb3JUcmFuc2Zvcm1Mb29rdXAgPSAnT1RyYW5zZm9ybSc7XHJcblx0fSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuTW96VHJhbnNmb3JtICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnLW1vei0nO1xyXG5cdFx0X3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPSAnTW96JztcclxuXHRcdF92ZW5kb3JUcmFuc2Zvcm1Mb29rdXAgPSAnTW96VHJhbnNmb3JtJztcclxuXHR9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS53ZWJraXRUcmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0X3ZlbmRvckNTU1ByZWZpeCA9ICctd2Via2l0LSc7XHJcblx0XHRfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA9ICd3ZWJraXQnO1xyXG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICctd2Via2l0LXRyYW5zZm9ybSc7XHJcblx0fSBlbHNlIGlmICh0eXBlb2YgbmF2aWdhdG9yLmNwdUNsYXNzID09PSAnc3RyaW5nJykge1xyXG5cdFx0X3ZlbmRvckNTU1ByZWZpeCA9ICctbXMtJztcclxuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJ21zJztcclxuXHRcdF92ZW5kb3JUcmFuc2Zvcm1Mb29rdXAgPSAnLW1zLXRyYW5zZm9ybSc7XHJcblx0fVxyXG5cclxuXHQvLyBJZiBoYXJkd2FyZSBhY2NlbGVyYXRpb24gaXMgdXNpbmcgdGhlIHN0YW5kYXJkIHBhdGgsIGJ1dCBwZXJzcGVjdGl2ZSBkb2Vzbid0IHNlZW0gdG8gYmUgc3VwcG9ydGVkLFxyXG5cdC8vIDNEIHRyYW5zZm9ybXMgbGlrZWx5IGFyZW4ndCBzdXBwb3J0ZWQgZWl0aGVyXHJcblx0aWYgKCFfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uICYmIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlW192ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ICsgKF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID8gJ1AnIDogJ3AnKSArICdlcnNwZWN0aXZlJ10gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0X3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiA9IHRydWU7XHJcblx0fVxyXG5cclxuXHQvLyBTdHlsZSBwcmVmaXhlc1xyXG5cdHZhciBfdHJhbnNmb3JtUHJvcGVydHkgPSBfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCArIChfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA/ICdUJyA6ICd0JykgKyAncmFuc2Zvcm0nO1xyXG5cdHZhciBfdHJhbnNpdGlvblByb3BlcnR5ID0gX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggKyAoX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPyAnVCcgOiAndCcpICsgJ3JhbnNpdGlvbic7XHJcblx0dmFyIF90cmFuc2xhdGVSdWxlUHJlZml4ID0gX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiA/ICd0cmFuc2xhdGUoJyA6ICd0cmFuc2xhdGUzZCgnO1xyXG5cdHZhciBfdHJhbnNmb3JtUHJlZml4ZXMgPSB7IHg6ICcnLCB5OiAnMCwnIH07XHJcblx0dmFyIF90cmFuc2Zvcm1TdWZmaXhlcyA9IHsgeDogJywwJyArIChfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID8gJyknIDogJywwKScpLCB5OiAoX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiA/ICcpJyA6ICcsMCknKSB9O1xyXG5cclxuXHQvLyBDb25zdGFudHMuICBOb3RlIHRoYXQgdGhlIGJlemllciBjdXJ2ZSBzaG91bGQgYmUgY2hhbmdlZCBhbG9uZyB3aXRoIHRoZSBmcmljdGlvbiFcclxuXHR2YXIgX2tGcmljdGlvbiA9IDAuOTk4O1xyXG5cdHZhciBfa01pbmltdW1TcGVlZCA9IDAuMDE7XHJcblxyXG5cdC8vIENyZWF0ZSBhIGdsb2JhbCBzdHlsZXNoZWV0IHRvIHNldCB1cCBzdHlsZXNoZWV0IHJ1bGVzIGFuZCB0cmFjayBkeW5hbWljIGVudHJpZXNcclxuXHQoZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIHN0eWxlc2hlZXRDb250YWluZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XHJcblx0XHR2YXIgbmV3U3R5bGVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuXHRcdHZhciBoYXJkd2FyZUFjY2VsZXJhdGlvblJ1bGU7XHJcblx0XHR2YXIgX3N0eWxlVGV4dDtcclxuXHRcdG5ld1N0eWxlTm9kZS50eXBlID0gJ3RleHQvY3NzJztcclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgdGhlIGhhcmR3YXJlIGFjY2VsZXJhdGlvbiBsb2dpYyB0byB1c2VcclxuXHRcdGlmIChfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uKSB7XHJcblx0XHRcdGhhcmR3YXJlQWNjZWxlcmF0aW9uUnVsZSA9IF92ZW5kb3JDU1NQcmVmaXggKyAndHJhbnNmb3JtLXN0eWxlOiBwcmVzZXJ2ZS0zZDsnO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aGFyZHdhcmVBY2NlbGVyYXRpb25SdWxlID0gX3ZlbmRvckNTU1ByZWZpeCArICd0cmFuc2Zvcm06IHRyYW5zbGF0ZVooMCk7JztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgb3VyIHJ1bGVzXHJcblx0XHRfc3R5bGVUZXh0ID0gW1xyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfY29udGFpbmVyIHsgb3ZlcmZsb3c6IGhpZGRlbjsgcG9zaXRpb246IHJlbGF0aXZlOyBtYXgtaGVpZ2h0OiAxMDAlOyAtd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMCk7IC1tcy10b3VjaC1hY3Rpb246IG5vbmUgfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl9od2FjY2VsZXJhdGVkIHsgJyArIGhhcmR3YXJlQWNjZWxlcmF0aW9uUnVsZSAgKyAnIH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfeCwgLmZ0c2Nyb2xsZXJfeSB7IHBvc2l0aW9uOiByZWxhdGl2ZTsgbWluLXdpZHRoOiAxMDAlOyBtaW4taGVpZ2h0OiAxMDAlOyBvdmVyZmxvdzogaGlkZGVuIH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfeCB7IGRpc3BsYXk6IGlubGluZS1ibG9jayB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX3Njcm9sbGJhciB7IHBvaW50ZXItZXZlbnRzOiBub25lOyBwb3NpdGlvbjogYWJzb2x1dGU7IHdpZHRoOiA1cHg7IGhlaWdodDogNXB4OyBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpOyAtd2Via2l0LWJvcmRlci1yYWRpdXM6IDNweDsgYm9yZGVyLXJhZGl1czogNnB4OyBvcGFjaXR5OiAwOyAnICsgX3ZlbmRvckNTU1ByZWZpeCArICd0cmFuc2l0aW9uOiBvcGFjaXR5IDM1MG1zOyB6LWluZGV4OiAxMDsgLXdlYmtpdC1ib3gtc2l6aW5nOiBjb250ZW50LWJveDsgLW1vei1ib3gtc2l6aW5nOiBjb250ZW50LWJveDsgYm94LXNpemluZzogY29udGVudC1ib3ggfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl9zY3JvbGxiYXJ4IHsgYm90dG9tOiAycHg7IGxlZnQ6IDJweCB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX3Njcm9sbGJhcnkgeyByaWdodDogMnB4OyB0b3A6IDJweCB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX3Njcm9sbGJhcmlubmVyIHsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLDAuNSk7IC13ZWJraXQtYm9yZGVyLXJhZGl1czogMnB4OyBib3JkZXItcmFkaXVzOiA0cHggLyA2cHggfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl9zY3JvbGxiYXIuYWN0aXZlIHsgb3BhY2l0eTogMTsgJyArIF92ZW5kb3JDU1NQcmVmaXggKyAndHJhbnNpdGlvbjogbm9uZTsgLW8tdHJhbnNpdGlvbjogYWxsIDAgbm9uZSB9J1xyXG5cdFx0XTtcclxuXHJcblx0XHRpZiAobmV3U3R5bGVOb2RlLnN0eWxlU2hlZXQpIHtcclxuXHRcdFx0bmV3U3R5bGVOb2RlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IF9zdHlsZVRleHQuam9pbignXFxuJyk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRuZXdTdHlsZU5vZGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoX3N0eWxlVGV4dC5qb2luKCdcXG4nKSkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB0aGUgc3R5bGVzaGVldFxyXG5cdFx0c3R5bGVzaGVldENvbnRhaW5lck5vZGUuaW5zZXJ0QmVmb3JlKG5ld1N0eWxlTm9kZSwgc3R5bGVzaGVldENvbnRhaW5lck5vZGUuZmlyc3RDaGlsZCk7XHJcblx0fSgpKTtcclxuXHJcblx0LyoqXHJcblx0ICogTWFzdGVyIGNvbnN0cnVjdG9yIGZvciB0aGUgc2Nyb2xsaW5nIGZ1bmN0aW9uLCBpbmNsdWRpbmcgd2hpY2ggZWxlbWVudCB0b1xyXG5cdCAqIGNvbnN0cnVjdCB0aGUgc2Nyb2xsZXIgaW4sIGFuZCBhbnkgc2Nyb2xsaW5nIG9wdGlvbnMuXHJcblx0ICogTm90ZSB0aGF0IGFwcC13aWRlIG9wdGlvbnMgY2FuIGFsc28gYmUgc2V0IHVzaW5nIGEgZ2xvYmFsIEZUU2Nyb2xsZXJPcHRpb25zXHJcblx0ICogb2JqZWN0LlxyXG5cdCAqL1xyXG5cdEZUU2Nyb2xsZXIgPSBmdW5jdGlvbiAoZG9tTm9kZSwgb3B0aW9ucykge1xyXG5cdFx0dmFyIGtleTtcclxuXHRcdHZhciBkZXN0cm95LCBzZXRTbmFwU2l6ZSwgc2Nyb2xsVG8sIHNjcm9sbEJ5LCB1cGRhdGVEaW1lbnNpb25zLCBhZGRFdmVudExpc3RlbmVyLCByZW1vdmVFdmVudExpc3RlbmVyLCBfc3RhcnRTY3JvbGwsIF91cGRhdGVTY3JvbGwsIF9lbmRTY3JvbGwsIF9maW5hbGl6ZVNjcm9sbCwgX2ludGVycnVwdFNjcm9sbCwgX2ZsaW5nU2Nyb2xsLCBfc25hcFNjcm9sbCwgX2dldFNuYXBQb3NpdGlvbkZvckluZGV4ZXMsIF9nZXRTbmFwSW5kZXhGb3JQb3NpdGlvbiwgX2xpbWl0VG9Cb3VuZHMsIF9pbml0aWFsaXplRE9NLCBfZXhpc3RpbmdET01WYWxpZCwgX2RvbUNoYW5nZWQsIF91cGRhdGVEaW1lbnNpb25zLCBfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucywgX3VwZGF0ZUVsZW1lbnRQb3NpdGlvbiwgX3VwZGF0ZVNlZ21lbnRzLCBfc2V0QXhpc1Bvc2l0aW9uLCBfZ2V0UG9zaXRpb24sIF9zY2hlZHVsZUF4aXNQb3NpdGlvbiwgX2ZpcmVFdmVudCwgX2NoaWxkRm9jdXNlZCwgX21vZGlmeURpc3RhbmNlQmV5b25kQm91bmRzLCBfZGlzdGFuY2VzQmV5b25kQm91bmRzLCBfc3RhcnRBbmltYXRpb24sIF9zY2hlZHVsZVJlbmRlciwgX2NhbmNlbEFuaW1hdGlvbiwgX3RvZ2dsZUV2ZW50SGFuZGxlcnMsIF9vblRvdWNoU3RhcnQsIF9vblRvdWNoTW92ZSwgX29uVG91Y2hFbmQsIF9vbk1vdXNlRG93biwgX29uTW91c2VNb3ZlLCBfb25Nb3VzZVVwLCBfb25Qb2ludGVyRG93biwgX29uUG9pbnRlck1vdmUsIF9vblBvaW50ZXJVcCwgX29uUG9pbnRlckNhbmNlbCwgX29uUG9pbnRlckNhcHR1cmVFbmQsIF9vbkNsaWNrLCBfb25Nb3VzZVNjcm9sbCwgX2NhcHR1cmVJbnB1dCwgX3JlbGVhc2VJbnB1dENhcHR1cmUsIF9nZXRCb3VuZGluZ1JlY3Q7XHJcblxyXG5cclxuXHRcdC8qIE5vdGUgdGhhdCBhY3R1YWwgb2JqZWN0IGluc3RhbnRpYXRpb24gb2NjdXJzIGF0IHRoZSBlbmQgb2YgdGhlIGNsb3N1cmUgdG8gYXZvaWQganNsaW50IGVycm9ycyAqL1xyXG5cclxuXHJcblx0XHQvKiAgICAgICAgICAgICAgICAgICAgICAgICBPcHRpb25zICAgICAgICAgICAgICAgICAgICAgICAqL1xyXG5cclxuXHRcdHZhciBfaW5zdGFuY2VPcHRpb25zID0ge1xyXG5cclxuXHRcdFx0Ly8gV2hldGhlciB0byBkaXNwbGF5IHNjcm9sbGJhcnMgYXMgYXBwcm9wcmlhdGVcclxuXHRcdFx0c2Nyb2xsYmFyczogdHJ1ZSxcclxuXHJcblx0XHRcdC8vIEVuYWJsZSBzY3JvbGxpbmcgb24gdGhlIFggYXhpcyBpZiBjb250ZW50IGlzIGF2YWlsYWJsZVxyXG5cdFx0XHRzY3JvbGxpbmdYOiB0cnVlLFxyXG5cclxuXHRcdFx0Ly8gRW5hYmxlIHNjcm9sbGluZyBvbiB0aGUgWSBheGlzIGlmIGNvbnRlbnQgaXMgYXZhaWxhYmxlXHJcblx0XHRcdHNjcm9sbGluZ1k6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBUaGUgaW5pdGlhbCBtb3ZlbWVudCByZXF1aXJlZCB0byB0cmlnZ2VyIGEgc2Nyb2xsLCBpbiBwaXhlbHM7IHRoaXMgaXMgdGhlIHBvaW50IGF0IHdoaWNoXHJcblx0XHRcdC8vIHRoZSBzY3JvbGwgaXMgZXhjbHVzaXZlIHRvIHRoaXMgcGFydGljdWxhciBGVFNjcm9sbGVyIGluc3RhbmNlLlxyXG5cdFx0XHRzY3JvbGxCb3VuZGFyeTogMSxcclxuXHJcblx0XHRcdC8vIFRoZSBpbml0aWFsIG1vdmVtZW50IHJlcXVpcmVkIHRvIHRyaWdnZXIgYSB2aXN1YWwgaW5kaWNhdGlvbiB0aGF0IHNjcm9sbGluZyBpcyBvY2N1cnJpbmcsXHJcblx0XHRcdC8vIGluIHBpeGVscy4gIFRoaXMgaXMgZW5mb3JjZWQgdG8gYmUgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIHRoZSBzY3JvbGxCb3VuZGFyeSwgYW5kIGlzIHVzZWQgdG9cclxuXHRcdFx0Ly8gZGVmaW5lIHdoZW4gdGhlIHNjcm9sbGVyIHN0YXJ0cyBkcmF3aW5nIGNoYW5nZXMgaW4gcmVzcG9uc2UgdG8gYW4gaW5wdXQsIGV2ZW4gaWYgdGhlIHNjcm9sbFxyXG5cdFx0XHQvLyBpcyBub3QgdHJlYXRlZCBhcyBoYXZpbmcgYmVndW4vbG9ja2VkIHlldC5cclxuXHRcdFx0c2Nyb2xsUmVzcG9uc2VCb3VuZGFyeTogMSxcclxuXHJcblx0XHRcdC8vIFdoZXRoZXIgdG8gYWx3YXlzIGVuYWJsZSBzY3JvbGxpbmcsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgb2YgdGhlIHNjcm9sbGVyIGRvZXMgbm90XHJcblx0XHRcdC8vIHJlcXVpcmUgdGhlIHNjcm9sbGVyIHRvIGZ1bmN0aW9uLiAgVGhpcyBtYWtlcyB0aGUgc2Nyb2xsZXIgYmVoYXZlIG1vcmUgbGlrZSBhblxyXG5cdFx0XHQvLyBlbGVtZW50IHNldCB0byBcIm92ZXJmbG93OiBzY3JvbGxcIiwgd2l0aCBib3VuY2luZyBhbHdheXMgb2NjdXJyaW5nIGlmIGVuYWJsZWQuXHJcblx0XHRcdGFsd2F5c1Njcm9sbDogZmFsc2UsXHJcblxyXG5cdFx0XHQvLyBUaGUgY29udGVudCB3aWR0aCB0byB1c2Ugd2hlbiBkZXRlcm1pbmluZyBzY3JvbGxlciBkaW1lbnNpb25zLiAgSWYgdGhpc1xyXG5cdFx0XHQvLyBpcyBmYWxzZSwgdGhlIHdpZHRoIHdpbGwgYmUgZGV0ZWN0ZWQgYmFzZWQgb24gdGhlIGFjdHVhbCBjb250ZW50LlxyXG5cdFx0XHRjb250ZW50V2lkdGg6IHVuZGVmaW5lZCxcclxuXHJcblx0XHRcdC8vIFRoZSBjb250ZW50IGhlaWdodCB0byB1c2Ugd2hlbiBkZXRlcm1pbmluZyBzY3JvbGxlciBkaW1lbnNpb25zLiAgSWYgdGhpc1xyXG5cdFx0XHQvLyBpcyBmYWxzZSwgdGhlIGhlaWdodCB3aWxsIGJlIGRldGVjdGVkIGJhc2VkIG9uIHRoZSBhY3R1YWwgY29udGVudC5cclxuXHRcdFx0Y29udGVudEhlaWdodDogdW5kZWZpbmVkLFxyXG5cclxuXHRcdFx0Ly8gRW5hYmxlIHNuYXBwaW5nIG9mIGNvbnRlbnQgdG8gJ3BhZ2VzJyBvciBhIHBpeGVsIGdyaWRcclxuXHRcdFx0c25hcHBpbmc6IGZhbHNlLFxyXG5cclxuXHRcdFx0Ly8gRGVmaW5lIHRoZSBob3Jpem9udGFsIGludGVydmFsIG9mIHRoZSBwaXhlbCBncmlkOyBzbmFwcGluZyBtdXN0IGJlIGVuYWJsZWQgZm9yIHRoaXMgdG9cclxuXHRcdFx0Ly8gdGFrZSBlZmZlY3QuICBJZiB0aGlzIGlzIG5vdCBkZWZpbmVkLCBzbmFwcGluZyB3aWxsIHVzZSBpbnRlcnZhbHMgYmFzZWQgb24gY29udGFpbmVyIHNpemUuXHJcblx0XHRcdHNuYXBTaXplWDogdW5kZWZpbmVkLFxyXG5cclxuXHRcdFx0Ly8gRGVmaW5lIHRoZSB2ZXJ0aWNhbCBpbnRlcnZhbCBvZiB0aGUgcGl4ZWwgZ3JpZDsgc25hcHBpbmcgbXVzdCBiZSBlbmFibGVkIGZvciB0aGlzIHRvXHJcblx0XHRcdC8vIHRha2UgZWZmZWN0LiAgSWYgdGhpcyBpcyBub3QgZGVmaW5lZCwgc25hcHBpbmcgd2lsbCB1c2UgaW50ZXJ2YWxzIGJhc2VkIG9uIGNvbnRhaW5lciBzaXplLlxyXG5cdFx0XHRzbmFwU2l6ZVk6IHVuZGVmaW5lZCxcclxuXHJcblx0XHRcdC8vIENvbnRyb2wgd2hldGhlciBzbmFwcGluZyBzaG91bGQgYmUgZnVsbHkgcGFnaW5hdGVkLCBvbmx5IGV2ZXIgZmxpY2tpbmcgdG8gdGhlIG5leHQgcGFnZVxyXG5cdFx0XHQvLyBhbmQgbm90IGJleW9uZC4gIFNuYXBwaW5nIG5lZWRzIHRvIGJlIGVuYWJsZWQgZm9yIHRoaXMgdG8gdGFrZSBlZmZlY3QuXHJcblx0XHRcdHBhZ2luYXRlZFNuYXA6IGZhbHNlLFxyXG5cclxuXHRcdFx0Ly8gQWxsb3cgc2Nyb2xsIGJvdW5jaW5nIGFuZCBlbGFzdGljaXR5IG5lYXIgdGhlIGVuZHMgYW5kIGdyaWRcclxuXHRcdFx0Ym91bmNpbmc6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBBbGxvdyBhIGZhc3Qgc2Nyb2xsIHRvIGNvbnRpbnVlIHdpdGggbW9tZW50dW0gd2hlbiByZWxlYXNlZFxyXG5cdFx0XHRmbGluZ2luZzogdHJ1ZSxcclxuXHJcblx0XHRcdC8vIEF1dG9tYXRpY2FsbHkgZGV0ZWN0cyBjaGFuZ2VzIHRvIHRoZSBjb250YWluZWQgbWFya3VwIGFuZFxyXG5cdFx0XHQvLyB1cGRhdGVzIGl0cyBkaW1lbnNpb25zIHdoZW5ldmVyIHRoZSBjb250ZW50IGNoYW5nZXMuIFRoaXMgaXNcclxuXHRcdFx0Ly8gc2V0IHRvIGZhbHNlIGlmIGEgY29udGVudFdpZHRoIG9yIGNvbnRlbnRIZWlnaHQgYXJlIHN1cHBsaWVkLlxyXG5cdFx0XHR1cGRhdGVPbkNoYW5nZXM6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBBdXRvbWF0aWNhbGx5IGNhdGNoZXMgY2hhbmdlcyB0byB0aGUgd2luZG93IHNpemUgYW5kIHVwZGF0ZXNcclxuXHRcdFx0Ly8gaXRzIGRpbWVuc2lvbnMuXHJcblx0XHRcdHVwZGF0ZU9uV2luZG93UmVzaXplOiBmYWxzZSxcclxuXHJcblx0XHRcdC8vIFRoZSBhbGlnbm1lbnQgdG8gdXNlIGlmIHRoZSBjb250ZW50IGlzIHNtYWxsZXIgdGhhbiB0aGUgY29udGFpbmVyO1xyXG5cdFx0XHQvLyB0aGlzIGFsc28gYXBwbGllcyB0byBpbml0aWFsIHBvc2l0aW9uaW5nIG9mIHNjcm9sbGFibGUgY29udGVudC5cclxuXHRcdFx0Ly8gVmFsaWQgYWxpZ25tZW50cyBhcmUgLTEgKHRvcCBvciBsZWZ0KSwgMCAoY2VudGVyKSwgYW5kIDEgKGJvdHRvbSBvciByaWdodCkuXHJcblx0XHRcdGJhc2VBbGlnbm1lbnRzOiB7IHg6IC0xLCB5OiAtMSB9LFxyXG5cclxuXHRcdFx0Ly8gV2hldGhlciB0byB1c2UgYSB3aW5kb3cgc2Nyb2xsIGZsYWcsIGVnIHdpbmRvdy5mb28sIHRvIGNvbnRyb2wgd2hldGhlclxyXG5cdFx0XHQvLyB0byBhbGxvdyBzY3JvbGxpbmcgdG8gc3RhcnQgb3Igbm93LiAgSWYgdGhlIHdpbmRvdyBmbGFnIGlzIHNldCB0byB0cnVlLFxyXG5cdFx0XHQvLyB0aGlzIGVsZW1lbnQgd2lsbCBub3Qgc3RhcnQgc2Nyb2xsaW5nOyB0aGlzIGVsZW1lbnQgd2lsbCBhbHNvIHRvZ2dsZVxyXG5cdFx0XHQvLyB0aGUgdmFyaWFibGUgd2hpbGUgc2Nyb2xsaW5nXHJcblx0XHRcdHdpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWc6IHVuZGVmaW5lZCxcclxuXHJcblx0XHRcdC8vIEluc3RlYWQgb2YgYWx3YXlzIHVzaW5nIHRyYW5zbGF0ZTNkIGZvciB0cmFuc2Zvcm1zLCBhIG1peCBvZiB0cmFuc2xhdGUzZFxyXG5cdFx0XHQvLyBhbmQgdHJhbnNsYXRlIHdpdGggYSBoYXJkd2FyZSBhY2NlbGVyYXRpb24gY2xhc3MgdXNlZCB0byB0cmlnZ2VyIGFjY2VsZXJhdGlvblxyXG5cdFx0XHQvLyBpcyB1c2VkOyB0aGlzIGlzIHRvIGFsbG93IENTUyBpbmhlcml0YW5jZSB0byBiZSB1c2VkIHRvIGFsbG93IGR5bmFtaWNcclxuXHRcdFx0Ly8gZGlzYWJsaW5nIG9mIGJhY2tpbmcgbGF5ZXJzIG9uIG9sZGVyIHBsYXRmb3Jtcy5cclxuXHRcdFx0aHdBY2NlbGVyYXRpb25DbGFzczogJ2Z0c2Nyb2xsZXJfaHdhY2NlbGVyYXRlZCcsXHJcblxyXG5cdFx0XHQvLyBXaGlsZSB1c2Ugb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGlzIGhpZ2hseSByZWNvbW1lbmRlZCBvbiBwbGF0Zm9ybXNcclxuXHRcdFx0Ly8gd2hpY2ggc3VwcG9ydCBpdCwgaXQgY2FuIHJlc3VsdCBpbiB0aGUgYW5pbWF0aW9uIGJlaW5nIGEgZnVydGhlciBoYWxmLWZyYW1lXHJcblx0XHRcdC8vIGJlaGluZCB0aGUgaW5wdXQgbWV0aG9kLCBpbmNyZWFzaW5nIHBlcmNlaXZlZCBsYWcgc2xpZ2h0bHkuICBUbyBkaXNhYmxlIHRoaXMsXHJcblx0XHRcdC8vIHNldCB0aGlzIHByb3BlcnR5IHRvIGZhbHNlLlxyXG5cdFx0XHRlbmFibGVSZXF1ZXN0QW5pbWF0aW9uRnJhbWVTdXBwb3J0OiB0cnVlLFxyXG5cclxuXHRcdFx0Ly8gU2V0IHRoZSBtYXhpbXVtIHRpbWUgKG1zKSB0aGF0IGEgZmxpbmcgY2FuIHRha2UgdG8gY29tcGxldGU7IGlmXHJcblx0XHRcdC8vIHRoaXMgaXMgbm90IHNldCwgZmxpbmdzIHdpbGwgY29tcGxldGUgaW5zdGFudGx5XHJcblx0XHRcdG1heEZsaW5nRHVyYXRpb246IDEwMDAsXHJcblxyXG5cdFx0XHQvLyBXaGV0aGVyIHRvIGRpc2FibGUgYW55IGlucHV0IG1ldGhvZHM7IG9uIHNvbWUgbXVsdGktaW5wdXQgZGV2aWNlc1xyXG5cdFx0XHQvLyBjdXN0b20gYmVoYXZpb3VyIG1heSBiZSBkZXNpcmVkIGZvciBzb21lIHNjcm9sbGVycy4gIFVzZSB3aXRoIGNhcmUhXHJcblx0XHRcdGRpc2FibGVkSW5wdXRNZXRob2RzOiB7XHJcblx0XHRcdFx0bW91c2U6IGZhbHNlLFxyXG5cdFx0XHRcdHRvdWNoOiBmYWxzZSxcclxuXHRcdFx0XHRzY3JvbGw6IGZhbHNlXHJcblx0XHRcdH0sXHJcblxyXG5cdFx0XHQvLyBEZWZpbmUgYSBzY3JvbGxpbmcgY2xhc3MgdG8gYmUgYWRkZWQgdG8gdGhlIHNjcm9sbGVyIGNvbnRhaW5lclxyXG5cdFx0XHQvLyB3aGVuIHNjcm9sbGluZyBpcyBhY3RpdmUuICBOb3RlIHRoYXQgdGhpcyBjYW4gY2F1c2UgYSByZWxheW91dCBvblxyXG5cdFx0XHQvLyBzY3JvbGwgc3RhcnQgaWYgZGVmaW5lZCwgYnV0IGFsbG93cyBjdXN0b20gc3R5bGluZyBpbiByZXNwb25zZSB0byBzY3JvbGxzXHJcblx0XHRcdHNjcm9sbGluZ0NsYXNzTmFtZTogdW5kZWZpbmVkLFxyXG5cclxuXHRcdFx0Ly8gQmV6aWVyIGN1cnZlcyBkZWZpbmluZyB0aGUgZmVlbCBvZiB0aGUgZmxpbmcgKG1vbWVudHVtKSBkZWNlbGVyYXRpb24sXHJcblx0XHRcdC8vIHRoZSBib3VuY2UgZGVjbGVyYXRpb24gZGVjZWxlcmF0aW9uIChhcyBhIGZsaW5nIGV4Y2VlZHMgdGhlIGJvdW5kcyksXHJcblx0XHRcdC8vIGFuZCB0aGUgYm91bmNlIGJlemllciAodXNlZCBmb3IgYm91bmNpbmcgYmFjaykuXHJcblx0XHRcdGZsaW5nQmV6aWVyOiBuZXcgQ3ViaWNCZXppZXIoMC4xMDMsIDAuMzg5LCAwLjMwNywgMC45NjYpLFxyXG5cdFx0XHRib3VuY2VEZWNlbGVyYXRpb25CZXppZXI6IG5ldyBDdWJpY0JlemllcigwLCAwLjUsIDAuNSwgMSksXHJcblx0XHRcdGJvdW5jZUJlemllcjogbmV3IEN1YmljQmV6aWVyKDAuNywgMCwgMC45LCAwLjYpXHJcblx0XHR9O1xyXG5cclxuXHJcblx0XHQvKiAgICAgICAgICAgICAgICAgICAgIExvY2FsIHZhcmlhYmxlcyAgICAgICAgICAgICAgICAgICAqL1xyXG5cclxuXHRcdC8vIENhY2hlIHRoZSBET00gbm9kZSBhbmQgc2V0IHVwIHZhcmlhYmxlcyBmb3Igb3RoZXIgbm9kZXNcclxuXHRcdHZhciBfcHVibGljU2VsZjtcclxuXHRcdHZhciBfc2VsZiA9IHRoaXM7XHJcblx0XHR2YXIgX3Njcm9sbGFibGVNYXN0ZXJOb2RlID0gZG9tTm9kZTtcclxuXHRcdHZhciBfY29udGFpbmVyTm9kZTtcclxuXHRcdHZhciBfY29udGVudFBhcmVudE5vZGU7XHJcblx0XHR2YXIgX3Njcm9sbE5vZGVzID0geyB4OiBudWxsLCB5OiBudWxsIH07XHJcblx0XHR2YXIgX3Njcm9sbGJhck5vZGVzID0geyB4OiBudWxsLCB5OiBudWxsIH07XHJcblxyXG5cdFx0Ly8gRGltZW5zaW9ucyBvZiB0aGUgY29udGFpbmVyIGVsZW1lbnQgYW5kIHRoZSBjb250ZW50IGVsZW1lbnRcclxuXHRcdHZhciBfbWV0cmljcyA9IHtcclxuXHRcdFx0Y29udGFpbmVyOiB7IHg6IG51bGwsIHk6IG51bGwgfSxcclxuXHRcdFx0Y29udGVudDogeyB4OiBudWxsLCB5OiBudWxsLCByYXdYOiBudWxsLCByYXdZOiBudWxsIH0sXHJcblx0XHRcdHNjcm9sbEVuZDogeyB4OiBudWxsLCB5OiBudWxsIH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gU25hcHBpbmcgZGV0YWlsc1xyXG5cdFx0dmFyIF9zbmFwR3JpZFNpemUgPSB7XHJcblx0XHRcdHg6IGZhbHNlLFxyXG5cdFx0XHR5OiBmYWxzZSxcclxuXHRcdFx0dXNlclg6IGZhbHNlLFxyXG5cdFx0XHR1c2VyWTogZmFsc2VcclxuXHRcdH07XHJcblx0XHR2YXIgX3NuYXBJbmRleCA9IHtcclxuXHRcdFx0eDogMCxcclxuXHRcdFx0eTogMFxyXG5cdFx0fTtcclxuXHRcdHZhciBfYmFzZVNlZ21lbnQgPSB7IHg6IDAsIHk6IDAgfTtcclxuXHRcdHZhciBfYWN0aXZlU2VnbWVudCA9IHsgeDogMCwgeTogMCB9O1xyXG5cclxuXHRcdC8vIFRyYWNrIHRoZSBpZGVudGlmaWVyIG9mIGFueSBpbnB1dCBiZWluZyB0cmFja2VkXHJcblx0XHR2YXIgX2lucHV0SWRlbnRpZmllciA9IGZhbHNlO1xyXG5cdFx0dmFyIF9pbnB1dEluZGV4ID0gMDtcclxuXHRcdHZhciBfaW5wdXRDYXB0dXJlZCA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIEN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9ucyBhbmQgdHJhY2tpbmdcclxuXHRcdHZhciBfaXNTY3JvbGxpbmcgPSBmYWxzZTtcclxuXHRcdHZhciBfaXNEaXNwbGF5aW5nU2Nyb2xsID0gZmFsc2U7XHJcblx0XHR2YXIgX2lzQW5pbWF0aW5nID0gZmFsc2U7XHJcblx0XHR2YXIgX2Jhc2VTY3JvbGxQb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xyXG5cdFx0dmFyIF9sYXN0U2Nyb2xsUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfTtcclxuXHRcdHZhciBfdGFyZ2V0U2Nyb2xsUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfTtcclxuXHRcdHZhciBfc2Nyb2xsQXRFeHRyZW1pdHkgPSB7IHg6IG51bGwsIHk6IG51bGwgfTtcclxuXHRcdHZhciBfcHJldmVudENsaWNrID0gZmFsc2U7XHJcblx0XHR2YXIgX3RpbWVvdXRzID0gW107XHJcblx0XHR2YXIgX2hhc0JlZW5TY3JvbGxlZCA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIEdlc3R1cmUgZGV0YWlsc1xyXG5cdFx0dmFyIF9iYXNlU2Nyb2xsYWJsZUF4ZXMgPSB7fTtcclxuXHRcdHZhciBfc2Nyb2xsYWJsZUF4ZXMgPSB7IHg6IHRydWUsIHk6IHRydWUgfTtcclxuXHRcdHZhciBfZ2VzdHVyZVN0YXJ0ID0geyB4OiAwLCB5OiAwLCB0OiAwIH07XHJcblx0XHR2YXIgX2N1bXVsYXRpdmVTY3JvbGwgPSB7IHg6IDAsIHk6IDAgfTtcclxuXHRcdHZhciBfZXZlbnRIaXN0b3J5ID0gW107XHJcblxyXG5cdFx0Ly8gQWxsb3cgY2VydGFpbiBldmVudHMgdG8gYmUgZGVib3VuY2VkXHJcblx0XHR2YXIgX2RvbUNoYW5nZURlYm91bmNlciA9IGZhbHNlO1xyXG5cdFx0dmFyIF9zY3JvbGxXaGVlbEVuZERlYm91bmNlciA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIFBlcmZvcm1hbmNlIHN3aXRjaGVzIG9uIGJyb3dzZXJzIHN1cHBvcnRpbmcgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXHJcblx0XHR2YXIgX2FuaW1hdGlvbkZyYW1lUmVxdWVzdCA9IGZhbHNlO1xyXG5cdFx0dmFyIF9yZXFBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBmYWxzZTtcclxuXHRcdHZhciBfY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LmNhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdENhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgZmFsc2U7XHJcblxyXG5cdFx0Ly8gRXZlbnQgbGlzdGVuZXJzXHJcblx0XHR2YXIgX2V2ZW50TGlzdGVuZXJzID0ge1xyXG5cdFx0XHQnc2Nyb2xsc3RhcnQnOiBbXSxcclxuXHRcdFx0J3Njcm9sbCc6IFtdLFxyXG5cdFx0XHQnc2Nyb2xsZW5kJzogW10sXHJcblx0XHRcdCdzZWdtZW50d2lsbGNoYW5nZSc6IFtdLFxyXG5cdFx0XHQnc2VnbWVudGRpZGNoYW5nZSc6IFtdLFxyXG5cdFx0XHQncmVhY2hlZHN0YXJ0JzogW10sXHJcblx0XHRcdCdyZWFjaGVkZW5kJzogW10sXHJcblx0XHRcdCdzY3JvbGxpbnRlcmFjdGlvbmVuZCc6IFtdXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIE11dGF0aW9uT2JzZXJ2ZXIgaW5zdGFuY2UsIHdoZW4gc3VwcG9ydGVkIGFuZCBpZiBET00gY2hhbmdlIHNuaWZmaW5nIGlzIGVuYWJsZWRcclxuXHRcdHZhciBfbXV0YXRpb25PYnNlcnZlcjtcclxuXHJcblxyXG5cdFx0LyogUGFyc2luZyBzdXBwbGllZCBvcHRpb25zICovXHJcblxyXG5cdFx0Ly8gT3ZlcnJpZGUgZGVmYXVsdCBpbnN0YW5jZSBvcHRpb25zIHdpdGggZ2xvYmFsIC0gb3IgY2xvc3VyZSdkIC0gb3B0aW9uc1xyXG5cdFx0aWYgKHR5cGVvZiBGVFNjcm9sbGVyT3B0aW9ucyA9PT0gJ29iamVjdCcgJiYgRlRTY3JvbGxlck9wdGlvbnMpIHtcclxuXHRcdFx0Zm9yIChrZXkgaW4gRlRTY3JvbGxlck9wdGlvbnMpIHtcclxuXHRcdFx0XHRpZiAoRlRTY3JvbGxlck9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBfaW5zdGFuY2VPcHRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHRcdF9pbnN0YW5jZU9wdGlvbnNba2V5XSA9IEZUU2Nyb2xsZXJPcHRpb25zW2tleV07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT3ZlcnJpZGUgZGVmYXVsdCBhbmQgZ2xvYmFsIG9wdGlvbnMgd2l0aCBzdXBwbGllZCBvcHRpb25zXHJcblx0XHRpZiAob3B0aW9ucykge1xyXG5cdFx0XHRmb3IgKGtleSBpbiBvcHRpb25zKSB7XHJcblx0XHRcdFx0aWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBfaW5zdGFuY2VPcHRpb25zLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHRcdF9pbnN0YW5jZU9wdGlvbnNba2V5XSA9IG9wdGlvbnNba2V5XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHNuYXAgZ3JpZCBzaXplIG9wdGlvbnMgd2VyZSBzdXBwbGllZCwgc3RvcmUgdGhlbVxyXG5cdFx0XHRpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnc25hcFNpemVYJykgJiYgIWlzTmFOKG9wdGlvbnMuc25hcFNpemVYKSkge1xyXG5cdFx0XHRcdF9zbmFwR3JpZFNpemUudXNlclggPSBfc25hcEdyaWRTaXplLnggPSBvcHRpb25zLnNuYXBTaXplWDtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnc25hcFNpemVZJykgJiYgIWlzTmFOKG9wdGlvbnMuc25hcFNpemVZKSkge1xyXG5cdFx0XHRcdF9zbmFwR3JpZFNpemUudXNlclkgPSBfc25hcEdyaWRTaXplLnkgPSBvcHRpb25zLnNuYXBTaXplWTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgY29udGVudCB3aWR0aCBhbmQgaGVpZ2h0IHdlcmUgZGVmaW5lZCwgZGlzYWJsZSB1cGRhdGVPbkNoYW5nZXMgZm9yIHBlcmZvcm1hbmNlXHJcblx0XHRcdGlmIChvcHRpb25zLmNvbnRlbnRXaWR0aCAmJiBvcHRpb25zLmNvbnRlbnRIZWlnaHQpIHtcclxuXHRcdFx0XHRvcHRpb25zLnVwZGF0ZU9uQ2hhbmdlcyA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVmFsaWRhdGUgdGhlIHNjcm9sbCByZXNwb25zZSBwYXJhbWV0ZXJcclxuXHRcdF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsUmVzcG9uc2VCb3VuZGFyeSA9IE1hdGgubWluKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsQm91bmRhcnksIF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsUmVzcG9uc2VCb3VuZGFyeSk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGJhc2Ugc2Nyb2xsYWJsZSBheGVzXHJcblx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XHJcblx0XHRcdF9iYXNlU2Nyb2xsYWJsZUF4ZXMueCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XHJcblx0XHRcdF9iYXNlU2Nyb2xsYWJsZUF4ZXMueSA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gT25seSBlbmFibGUgYW5pbWF0aW9uIGZyYW1lIHN1cHBvcnQgaWYgdGhlIGluc3RhbmNlIG9wdGlvbnMgcGVybWl0IGl0XHJcblx0XHRfcmVxQW5pbWF0aW9uRnJhbWUgPSBfaW5zdGFuY2VPcHRpb25zLmVuYWJsZVJlcXVlc3RBbmltYXRpb25GcmFtZVN1cHBvcnQgJiYgX3JlcUFuaW1hdGlvbkZyYW1lO1xyXG5cdFx0X2NhbmNlbEFuaW1hdGlvbkZyYW1lID0gX3JlcUFuaW1hdGlvbkZyYW1lICYmIF9jYW5jZWxBbmltYXRpb25GcmFtZTtcclxuXHJcblxyXG5cdFx0LyogICAgICAgICAgICAgICAgICAgIFNjb3BlZCBGdW5jdGlvbnMgICAgICAgICAgICAgICAgICAgKi9cclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFVuYmluZHMgYWxsIGV2ZW50IGxpc3RlbmVycyB0byBwcmV2ZW50IGNpcmN1bGFyIHJlZmVyZW5jZXMgcHJldmVudGluZyBpdGVtc1xyXG5cdFx0ICogZnJvbSBiZWluZyBkZWFsbG9jYXRlZCwgYW5kIGNsZWFuIHVwIHJlZmVyZW5jZXMgdG8gZG9tIGVsZW1lbnRzLiBQYXNzIGluXHJcblx0XHQgKiBcInJlbW92ZUVsZW1lbnRzXCIgdG8gYWxzbyByZW1vdmUgRlRTY3JvbGxlciBET00gZWxlbWVudHMgZm9yIHNwZWNpYWwgcmV1c2UgY2FzZXMuXHJcblx0XHQgKi9cclxuXHRcdGRlc3Ryb3kgPSBmdW5jdGlvbiBkZXN0cm95KHJlbW92ZUVsZW1lbnRzKSB7XHJcblx0XHRcdHZhciBpLCBsO1xyXG5cclxuXHRcdFx0X3RvZ2dsZUV2ZW50SGFuZGxlcnMoZmFsc2UpO1xyXG5cdFx0XHRfY2FuY2VsQW5pbWF0aW9uKCk7XHJcblx0XHRcdGlmIChfZG9tQ2hhbmdlRGVib3VuY2VyKSB7XHJcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChfZG9tQ2hhbmdlRGVib3VuY2VyKTtcclxuXHRcdFx0XHRfZG9tQ2hhbmdlRGVib3VuY2VyID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0Zm9yIChpID0gMCwgbCA9IF90aW1lb3V0cy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF90aW1lb3V0c1tpXSk7XHJcblx0XHRcdH1cclxuXHRcdFx0X3RpbWVvdXRzLmxlbmd0aCA9IDA7XHJcblxyXG5cdFx0XHQvLyBEZXN0cm95IERPTSBlbGVtZW50cyBpZiByZXF1aXJlZFxyXG5cdFx0XHRpZiAocmVtb3ZlRWxlbWVudHMgJiYgX3Njcm9sbGFibGVNYXN0ZXJOb2RlKSB7XHJcblx0XHRcdFx0d2hpbGUgKF9jb250ZW50UGFyZW50Tm9kZS5maXJzdENoaWxkKSB7XHJcblx0XHRcdFx0XHRfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuYXBwZW5kQ2hpbGQoX2NvbnRlbnRQYXJlbnROb2RlLmZpcnN0Q2hpbGQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRfc2Nyb2xsYWJsZU1hc3Rlck5vZGUucmVtb3ZlQ2hpbGQoX2NvbnRhaW5lck5vZGUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfc2Nyb2xsYWJsZU1hc3Rlck5vZGUgPSBudWxsO1xyXG5cdFx0XHRfY29udGFpbmVyTm9kZSA9IG51bGw7XHJcblx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IG51bGw7XHJcblx0XHRcdF9zY3JvbGxOb2Rlcy54ID0gbnVsbDtcclxuXHRcdFx0X3Njcm9sbE5vZGVzLnkgPSBudWxsO1xyXG5cdFx0XHRfc2Nyb2xsYmFyTm9kZXMueCA9IG51bGw7XHJcblx0XHRcdF9zY3JvbGxiYXJOb2Rlcy55ID0gbnVsbDtcclxuXHRcdFx0Zm9yIChpIGluIF9ldmVudExpc3RlbmVycykge1xyXG5cdFx0XHRcdGlmIChfZXZlbnRMaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkoaSkpIHtcclxuXHRcdFx0XHRcdF9ldmVudExpc3RlbmVyc1tpXS5sZW5ndGggPSAwO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgdGhpcyBpcyBjdXJyZW50bHkgdHJhY2tlZCBhcyBhIHNjcm9sbGluZyBpbnN0YW5jZSwgY2xlYXIgdGhlIGZsYWdcclxuXHRcdFx0aWYgKF9mdHNjcm9sbGVyTW92aW5nICYmIF9mdHNjcm9sbGVyTW92aW5nID09PSBfc2VsZikge1xyXG5cdFx0XHRcdF9mdHNjcm9sbGVyTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZykge1xyXG5cdFx0XHRcdFx0d2luZG93W19pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZ10gPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDb25maWd1cmVzIHRoZSBzbmFwcGluZyBib3VuZGFyaWVzIHdpdGhpbiB0aGUgc2Nyb2xsaW5nIGVsZW1lbnQgaWZcclxuXHRcdCAqIHNuYXBwaW5nIGlzIGFjdGl2ZS4gIElmIHRoaXMgaXMgbmV2ZXIgY2FsbGVkLCBzbmFwcGluZyBkZWZhdWx0cyB0b1xyXG5cdFx0ICogdXNpbmcgdGhlIGJvdW5kaW5nIGJveCwgZWcgcGFnZS1hdC1hLXRpbWUuXHJcblx0XHQgKi9cclxuXHRcdHNldFNuYXBTaXplID0gZnVuY3Rpb24gc2V0U25hcFNpemUod2lkdGgsIGhlaWdodCkge1xyXG5cdFx0XHRfc25hcEdyaWRTaXplLnVzZXJYID0gd2lkdGg7XHJcblx0XHRcdF9zbmFwR3JpZFNpemUudXNlclkgPSBoZWlnaHQ7XHJcblx0XHRcdF9zbmFwR3JpZFNpemUueCA9IHdpZHRoO1xyXG5cdFx0XHRfc25hcEdyaWRTaXplLnkgPSBoZWlnaHQ7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgdGhlIGNvbnRlbnQgZGltZW5zaW9ucyBjb25mb3JtIHRvIHRoZSBncmlkXHJcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQueCA9IE1hdGguY2VpbChfbWV0cmljcy5jb250ZW50LnJhd1ggLyB3aWR0aCkgKiB3aWR0aDtcclxuXHRcdFx0X21ldHJpY3MuY29udGVudC55ID0gTWF0aC5jZWlsKF9tZXRyaWNzLmNvbnRlbnQucmF3WSAvIGhlaWdodCkgKiBoZWlnaHQ7XHJcblx0XHRcdF9tZXRyaWNzLnNjcm9sbEVuZC54ID0gX21ldHJpY3MuY29udGFpbmVyLnggLSBfbWV0cmljcy5jb250ZW50Lng7XHJcblx0XHRcdF9tZXRyaWNzLnNjcm9sbEVuZC55ID0gX21ldHJpY3MuY29udGFpbmVyLnkgLSBfbWV0cmljcy5jb250ZW50Lnk7XHJcblx0XHRcdF91cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zKCk7XHJcblxyXG5cdFx0XHQvLyBTbmFwIHRvIHRoZSBuZXcgZ3JpZCBpZiBuZWNlc3NhcnlcclxuXHRcdFx0X3NuYXBTY3JvbGwoKTtcclxuXHRcdFx0X3VwZGF0ZVNlZ21lbnRzKHRydWUpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFNjcm9sbCB0byBhIHN1cHBsaWVkIHBvc2l0aW9uLCBpbmNsdWRpbmcgd2hldGhlciBvciBub3QgdG8gYW5pbWF0ZSB0aGVcclxuXHRcdCAqIHNjcm9sbCBhbmQgaG93IGZhc3QgdG8gcGVyZm9ybSB0aGUgYW5pbWF0aW9uIChwYXNzIGluIHRydWUgdG8gc2VsZWN0IGFcclxuXHRcdCAqIGR5bmFtaWMgZHVyYXRpb24pLiAgVGhlIGlucHV0cyB3aWxsIGJlIGNvbnN0cmFpbmVkIHRvIGJvdW5kcyBhbmQgc25hcHBlZC5cclxuXHRcdCAqIElmIGZhbHNlIGlzIHN1cHBsaWVkIGZvciBhIHBvc2l0aW9uLCB0aGF0IGF4aXMgd2lsbCBub3QgYmUgc2Nyb2xsZWQuXHJcblx0XHQgKi9cclxuXHRcdHNjcm9sbFRvID0gZnVuY3Rpb24gc2Nyb2xsVG8obGVmdCwgdG9wLCBhbmltYXRpb25EdXJhdGlvbikge1xyXG5cdFx0XHR2YXIgdGFyZ2V0UG9zaXRpb24sIGR1cmF0aW9uLCBwb3NpdGlvbnMsIGF4aXMsIG1heER1cmF0aW9uID0gMCwgc2Nyb2xsUG9zaXRpb25zVG9BcHBseSA9IHt9O1xyXG5cclxuXHRcdFx0Ly8gSWYgYSBtYW51YWwgc2Nyb2xsIGlzIGluIHByb2dyZXNzLCBjYW5jZWwgaXRcclxuXHRcdFx0X2VuZFNjcm9sbChEYXRlLm5vdygpKTtcclxuXHJcblx0XHRcdC8vIE1vdmUgc3VwcGxpZWQgY29vcmRpbmF0ZXMgaW50byBhbiBvYmplY3QgZm9yIGl0ZXJhdGlvbiwgYWxzbyBpbnZlcnRpbmcgdGhlIHZhbHVlcyBpbnRvXHJcblx0XHRcdC8vIG91ciBjb29yZGluYXRlIHN5c3RlbVxyXG5cdFx0XHRwb3NpdGlvbnMgPSB7XHJcblx0XHRcdFx0eDogLWxlZnQsXHJcblx0XHRcdFx0eTogLXRvcFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Zm9yIChheGlzIGluIF9iYXNlU2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX2Jhc2VTY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBwb3NpdGlvbnNbYXhpc107XHJcblx0XHRcdFx0XHRpZiAodGFyZ2V0UG9zaXRpb24gPT09IGZhbHNlKSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIENvbnN0cmFpbiB0byBib3VuZHNcclxuXHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uID0gTWF0aC5taW4oMCwgTWF0aC5tYXgoX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdLCB0YXJnZXRQb3NpdGlvbikpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFNuYXAgaWYgYXBwcm9wcmlhdGVcclxuXHRcdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nICYmIF9zbmFwR3JpZFNpemVbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBNYXRoLnJvdW5kKHRhcmdldFBvc2l0aW9uIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEdldCBhIGR1cmF0aW9uXHJcblx0XHRcdFx0XHRkdXJhdGlvbiA9IGFuaW1hdGlvbkR1cmF0aW9uIHx8IDA7XHJcblx0XHRcdFx0XHRpZiAoZHVyYXRpb24gPT09IHRydWUpIHtcclxuXHRcdFx0XHRcdFx0ZHVyYXRpb24gPSBNYXRoLnNxcnQoTWF0aC5hYnMoX2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXSAtIHRhcmdldFBvc2l0aW9uKSkgKiAyMDtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBUcmlnZ2VyIHRoZSBwb3NpdGlvbiBjaGFuZ2VcclxuXHRcdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oYXhpcywgdGFyZ2V0UG9zaXRpb24sIGR1cmF0aW9uKTtcclxuXHRcdFx0XHRcdHNjcm9sbFBvc2l0aW9uc1RvQXBwbHlbYXhpc10gPSB0YXJnZXRQb3NpdGlvbjtcclxuXHRcdFx0XHRcdG1heER1cmF0aW9uID0gTWF0aC5tYXgobWF4RHVyYXRpb24sIGR1cmF0aW9uKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHRoZSBzY3JvbGwgaGFkIHJlc3VsdGVkIGluIGEgY2hhbmdlIGluIHBvc2l0aW9uLCBwZXJmb3JtIHNvbWUgYWRkaXRpb25hbCBhY3Rpb25zOlxyXG5cdFx0XHRpZiAoX2Jhc2VTY3JvbGxQb3NpdGlvbi54ICE9PSBwb3NpdGlvbnMueCB8fCBfYmFzZVNjcm9sbFBvc2l0aW9uLnkgIT09IHBvc2l0aW9ucy55KSB7XHJcblxyXG5cdFx0XHRcdC8vIE1hcmsgYSBzY3JvbGwgYXMgaGF2aW5nIGV2ZXIgb2NjdXJyZWRcclxuXHRcdFx0XHRfaGFzQmVlblNjcm9sbGVkID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0Ly8gSWYgYW4gYW5pbWF0aW9uIGR1cmF0aW9uIGlzIHByZXNlbnQsIGZpcmUgYSBzY3JvbGwgc3RhcnQgZXZlbnQgYW5kIGFcclxuXHRcdFx0XHQvLyBzY3JvbGwgZXZlbnQgZm9yIGFueSBsaXN0ZW5lcnMgdG8gYWN0IG9uXHJcblx0XHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsc3RhcnQnLCBfZ2V0UG9zaXRpb24oKSk7XHJcblx0XHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsJywgX2dldFBvc2l0aW9uKCkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAobWF4RHVyYXRpb24pIHtcclxuXHRcdFx0XHRfdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHZhciBhbkF4aXM7XHJcblx0XHRcdFx0XHRmb3IgKGFuQXhpcyBpbiBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5KSB7XHJcblx0XHRcdFx0XHRcdGlmIChzY3JvbGxQb3NpdGlvbnNUb0FwcGx5Lmhhc093blByb3BlcnR5KGFuQXhpcykpIHtcclxuXHRcdFx0XHRcdFx0XHRfbGFzdFNjcm9sbFBvc2l0aW9uW2FuQXhpc10gPSBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5W2FuQXhpc107XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCgpO1xyXG5cdFx0XHRcdH0sIG1heER1cmF0aW9uKSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBBbHRlciB0aGUgY3VycmVudCBzY3JvbGwgcG9zaXRpb24sIGluY2x1ZGluZyB3aGV0aGVyIG9yIG5vdCB0byBhbmltYXRlXHJcblx0XHQgKiB0aGUgc2Nyb2xsIGFuZCBob3cgZmFzdCB0byBwZXJmb3JtIHRoZSBhbmltYXRpb24gKHBhc3MgaW4gdHJ1ZSB0b1xyXG5cdFx0ICogc2VsZWN0IGEgZHluYW1pYyBkdXJhdGlvbikuICBUaGUgaW5wdXRzIHdpbGwgYmUgY2hlY2tlZCBhZ2FpbnN0IHRoZVxyXG5cdFx0ICogY3VycmVudCBwb3NpdGlvbi5cclxuXHRcdCAqL1xyXG5cdFx0c2Nyb2xsQnkgPSBmdW5jdGlvbiBzY3JvbGxCeShob3Jpem9udGFsLCB2ZXJ0aWNhbCwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuXHJcblx0XHRcdC8vIFdyYXAgdGhlIHNjcm9sbFRvIGZ1bmN0aW9uIGZvciBzaW1wbGljaXR5XHJcblx0XHRcdHNjcm9sbFRvKHBhcnNlRmxvYXQoaG9yaXpvbnRhbCkgLSBfYmFzZVNjcm9sbFBvc2l0aW9uLngsIHBhcnNlRmxvYXQodmVydGljYWwpIC0gX2Jhc2VTY3JvbGxQb3NpdGlvbi55LCBhbmltYXRpb25EdXJhdGlvbik7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUHJvdmlkZSBhIHB1YmxpYyBtZXRob2QgdG8gZGV0ZWN0IGNoYW5nZXMgaW4gZGltZW5zaW9ucyBmb3IgZWl0aGVyIHRoZSBjb250ZW50IG9yIHRoZVxyXG5cdFx0ICogY29udGFpbmVyLlxyXG5cdFx0ICovXHJcblx0XHR1cGRhdGVEaW1lbnNpb25zID0gZnVuY3Rpb24gdXBkYXRlRGltZW5zaW9ucyhjb250ZW50V2lkdGgsIGNvbnRlbnRIZWlnaHQsIGlnbm9yZVNuYXBTY3JvbGwpIHtcclxuXHRcdFx0b3B0aW9ucy5jb250ZW50V2lkdGggPSBjb250ZW50V2lkdGggfHwgb3B0aW9ucy5jb250ZW50V2lkdGg7XHJcblx0XHRcdG9wdGlvbnMuY29udGVudEhlaWdodCA9IGNvbnRlbnRIZWlnaHQgfHwgb3B0aW9ucy5jb250ZW50SGVpZ2h0O1xyXG5cclxuXHRcdFx0Ly8gQ3VycmVudGx5IGp1c3Qgd3JhcCB0aGUgcHJpdmF0ZSBBUElcclxuXHRcdFx0X3VwZGF0ZURpbWVuc2lvbnMoISFpZ25vcmVTbmFwU2Nyb2xsKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBBZGQgYW4gZXZlbnQgaGFuZGxlciBmb3IgYSBzdXBwb3J0ZWQgZXZlbnQuICBDdXJyZW50IGV2ZW50cyBpbmNsdWRlOlxyXG5cdFx0ICogc2Nyb2xsIC0gZmlyZWQgd2hlbmV2ZXIgdGhlIHNjcm9sbCBwb3NpdGlvbiBjaGFuZ2VzXHJcblx0XHQgKiBzY3JvbGxzdGFydCAtIGZpcmVkIHdoZW4gYSBzY3JvbGwgbW92ZW1lbnQgc3RhcnRzXHJcblx0XHQgKiBzY3JvbGxlbmQgLSBmaXJlZCB3aGVuIGEgc2Nyb2xsIG1vdmVtZW50IGVuZHNcclxuXHRcdCAqIHNlZ21lbnR3aWxsY2hhbmdlIC0gZmlyZWQgd2hlbmV2ZXIgdGhlIHNlZ21lbnQgY2hhbmdlcywgaW5jbHVkaW5nIGR1cmluZyBzY3JvbGxpbmdcclxuXHRcdCAqIHNlZ21lbnRkaWRjaGFuZ2UgLSBmaXJlZCB3aGVuIGEgc2VnbWVudCBoYXMgY29uY2x1c2l2ZWx5IGNoYW5nZWQsIGFmdGVyIHNjcm9sbGluZy5cclxuXHRcdCAqL1xyXG5cdFx0YWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIoZXZlbnRuYW1lLCBldmVudGxpc3RlbmVyKSB7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgdGhpcyBpcyBhIHZhbGlkIGV2ZW50XHJcblx0XHRcdGlmICghX2V2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KGV2ZW50bmFtZSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0X2V2ZW50TGlzdGVuZXJzW2V2ZW50bmFtZV0ucHVzaChldmVudGxpc3RlbmVyKTtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUmVtb3ZlIGFuIGV2ZW50IGhhbmRsZXIgZm9yIGEgc3VwcG9ydGVkIGV2ZW50LiAgVGhlIGxpc3RlbmVyIG11c3QgYmUgZXhhY3RseSB0aGUgc2FtZSBhc1xyXG5cdFx0ICogYW4gYWRkZWQgbGlzdGVuZXIgdG8gYmUgcmVtb3ZlZC5cclxuXHRcdCAqL1xyXG5cdFx0cmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRuYW1lLCBldmVudGxpc3RlbmVyKSB7XHJcblx0XHRcdHZhciBpO1xyXG5cclxuXHRcdFx0Ly8gRW5zdXJlIHRoaXMgaXMgYSB2YWxpZCBldmVudFxyXG5cdFx0XHRpZiAoIV9ldmVudExpc3RlbmVycy5oYXNPd25Qcm9wZXJ0eShldmVudG5hbWUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmb3IgKGkgPSBfZXZlbnRMaXN0ZW5lcnNbZXZlbnRuYW1lXS5sZW5ndGg7IGkgPj0gMDsgaSA9IGkgLSAxKSB7XHJcblx0XHRcdFx0aWYgKF9ldmVudExpc3RlbmVyc1tldmVudG5hbWVdW2ldID09PSBldmVudGxpc3RlbmVyKSB7XHJcblx0XHRcdFx0XHRfZXZlbnRMaXN0ZW5lcnNbZXZlbnRuYW1lXS5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFN0YXJ0IGEgc2Nyb2xsIHRyYWNraW5nIGlucHV0IC0gdGhpcyBjb3VsZCBiZSBtb3VzZSwgd2Via2l0LXN0eWxlIHRvdWNoLFxyXG5cdFx0ICogb3IgbXMtc3R5bGUgcG9pbnRlciBldmVudHMuXHJcblx0XHQgKi9cclxuXHRcdF9zdGFydFNjcm9sbCA9IGZ1bmN0aW9uIF9zdGFydFNjcm9sbChpbnB1dFgsIGlucHV0WSwgaW5wdXRUaW1lLCByYXdFdmVudCkge1xyXG5cdFx0XHR2YXIgdHJpZ2dlclNjcm9sbEludGVycnVwdCA9IF9pc0FuaW1hdGluZztcclxuXHJcblx0XHRcdC8vIE9wZXJhIGZpeFxyXG5cdFx0XHRpZiAoaW5wdXRUaW1lIDw9IDApIHtcclxuXHRcdFx0XHRpbnB1dFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBhIHdpbmRvdyBzY3JvbGxpbmcgZmxhZyBpcyBzZXQsIGFuZCBldmFsdWF0ZXMgdG8gdHJ1ZSwgZG9uJ3Qgc3RhcnQgY2hlY2tpbmcgdG91Y2hlc1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnICYmIHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBhbiBhbmltYXRpb24gaXMgaW4gcHJvZ3Jlc3MsIHN0b3AgdGhlIHNjcm9sbC5cclxuXHRcdFx0aWYgKHRyaWdnZXJTY3JvbGxJbnRlcnJ1cHQpIHtcclxuXHRcdFx0XHRfaW50ZXJydXB0U2Nyb2xsKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdC8vIEFsbG93IGNsaWNrcyBhZ2FpbiwgYnV0IG9ubHkgaWYgYSBzY3JvbGwgd2FzIG5vdCBpbnRlcnJ1cHRlZFxyXG5cdFx0XHRcdF9wcmV2ZW50Q2xpY2sgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3RvcmUgdGhlIGluaXRpYWwgZXZlbnQgY29vcmRpbmF0ZXNcclxuXHRcdFx0X2dlc3R1cmVTdGFydC54ID0gaW5wdXRYO1xyXG5cdFx0XHRfZ2VzdHVyZVN0YXJ0LnkgPSBpbnB1dFk7XHJcblx0XHRcdF9nZXN0dXJlU3RhcnQudCA9IGlucHV0VGltZTtcclxuXHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uLnggPSBfbGFzdFNjcm9sbFBvc2l0aW9uLng7XHJcblx0XHRcdF90YXJnZXRTY3JvbGxQb3NpdGlvbi55ID0gX2xhc3RTY3JvbGxQb3NpdGlvbi55O1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgZXZlbnQgaGlzdG9yeSBhbmQgYWRkIHRoZSBzdGFydCB0b3VjaFxyXG5cdFx0XHRfZXZlbnRIaXN0b3J5Lmxlbmd0aCA9IDA7XHJcblx0XHRcdF9ldmVudEhpc3RvcnkucHVzaCh7IHg6IGlucHV0WCwgeTogaW5wdXRZLCB0OiBpbnB1dFRpbWUgfSk7XHJcblxyXG5cdFx0XHRpZiAodHJpZ2dlclNjcm9sbEludGVycnVwdCkge1xyXG5cdFx0XHRcdF91cGRhdGVTY3JvbGwoaW5wdXRYLCBpbnB1dFksIGlucHV0VGltZSwgcmF3RXZlbnQsIHRyaWdnZXJTY3JvbGxJbnRlcnJ1cHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDb250aW51ZSBhIHNjcm9sbCBhcyBhIHJlc3VsdCBvZiBhbiB1cGRhdGVkIHBvc2l0aW9uXHJcblx0XHQgKi9cclxuXHRcdF91cGRhdGVTY3JvbGwgPSBmdW5jdGlvbiBfdXBkYXRlU2Nyb2xsKGlucHV0WCwgaW5wdXRZLCBpbnB1dFRpbWUsIHJhd0V2ZW50LCBzY3JvbGxJbnRlcnJ1cHQpIHtcclxuXHRcdFx0dmFyIGF4aXMsIG90aGVyU2Nyb2xsZXJBY3RpdmUsIGRpc3RhbmNlc0JleW9uZEJvdW5kcztcclxuXHRcdFx0dmFyIGluaXRpYWxTY3JvbGwgPSBmYWxzZTtcclxuXHRcdFx0dmFyIGdlc3R1cmUgPSB7XHJcblx0XHRcdFx0eDogaW5wdXRYIC0gX2dlc3R1cmVTdGFydC54LFxyXG5cdFx0XHRcdHk6IGlucHV0WSAtIF9nZXN0dXJlU3RhcnQueVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gT3BlcmEgZml4XHJcblx0XHRcdGlmIChpbnB1dFRpbWUgPD0gMCkge1xyXG5cdFx0XHRcdGlucHV0VGltZSA9IERhdGUubm93KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBiYXNlIHRhcmdldCBwb3NpdGlvbnNcclxuXHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uLnggPSBfYmFzZVNjcm9sbFBvc2l0aW9uLnggKyBnZXN0dXJlLng7XHJcblx0XHRcdF90YXJnZXRTY3JvbGxQb3NpdGlvbi55ID0gX2Jhc2VTY3JvbGxQb3NpdGlvbi55ICsgZ2VzdHVyZS55O1xyXG5cclxuXHRcdFx0Ly8gSWYgc2Nyb2xsaW5nIGhhcyBub3QgeWV0IGxvY2tlZCB0byB0aGlzIHNjcm9sbGVyLCBjaGVjayB3aGV0aGVyIHRvIHN0b3Agc2Nyb2xsaW5nXHJcblx0XHRcdGlmICghX2lzU2Nyb2xsaW5nKSB7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIHRoZSBpbnRlcm5hbCBmbGFnIHRvIGRldGVybWluZSBpZiBhbm90aGVyIEZUU2Nyb2xsZXIgaXMgc2Nyb2xsaW5nXHJcblx0XHRcdFx0aWYgKF9mdHNjcm9sbGVyTW92aW5nICYmIF9mdHNjcm9sbGVyTW92aW5nICE9PSBfc2VsZikge1xyXG5cdFx0XHRcdFx0b3RoZXJTY3JvbGxlckFjdGl2ZSA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBPdGhlcndpc2UsIGNoZWNrIHRoZSB3aW5kb3cgc2Nyb2xsaW5nIGZsYWcgdG8gc2VlIGlmIGFueXRoaW5nIGVsc2UgaGFzIGNsYWltZWQgc2Nyb2xsaW5nXHJcblx0XHRcdFx0ZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnICYmIHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddKSB7XHJcblx0XHRcdFx0XHRvdGhlclNjcm9sbGVyQWN0aXZlID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIGFub3RoZXIgc2Nyb2xsZXIgd2FzIGFjdGl2ZSwgY2xlYW4gdXAgYW5kIHN0b3AgcHJvY2Vzc2luZy5cclxuXHRcdFx0XHRpZiAob3RoZXJTY3JvbGxlckFjdGl2ZSkge1xyXG5cdFx0XHRcdFx0X2lucHV0SWRlbnRpZmllciA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0X3JlbGVhc2VJbnB1dENhcHR1cmUoKTtcclxuXHRcdFx0XHRcdGlmIChfaXNEaXNwbGF5aW5nU2Nyb2xsKSB7XHJcblx0XHRcdFx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcclxuXHRcdFx0XHRcdFx0aWYgKCFfc25hcFNjcm9sbCh0cnVlKSkge1xyXG5cdFx0XHRcdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCh0cnVlKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgbm90IHlldCBkaXNwbGF5aW5nIGEgc2Nyb2xsLCBkZXRlcm1pbmUgd2hldGhlciB0aGF0IHRyaWdnZXJpbmcgYm91bmRhcnlcclxuXHRcdFx0Ly8gaGFzIGJlZW4gZXhjZWVkZWRcclxuXHRcdFx0aWYgKCFfaXNEaXNwbGF5aW5nU2Nyb2xsKSB7XHJcblxyXG5cdFx0XHRcdC8vIERldGVybWluZSBzY3JvbGwgZGlzdGFuY2UgYmV5b25kIGJvdW5kc1xyXG5cdFx0XHRcdGRpc3RhbmNlc0JleW9uZEJvdW5kcyA9IF9kaXN0YW5jZXNCZXlvbmRCb3VuZHMoX3RhcmdldFNjcm9sbFBvc2l0aW9uKTtcclxuXHJcblx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHdoZXRoZXIgdG8gcHJldmVudCB0aGUgZGVmYXVsdCBzY3JvbGwgZXZlbnQgLSBpZiB0aGUgc2Nyb2xsIGNvdWxkIHN0aWxsXHJcblx0XHRcdFx0Ly8gYmUgdHJpZ2dlcmVkLCBwcmV2ZW50IHRoZSBkZWZhdWx0IHRvIGF2b2lkIHByb2JsZW1zIChwYXJ0aWN1bGFybHkgb24gUGxheUJvb2spXHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuYm91bmNpbmcgfHwgc2Nyb2xsSW50ZXJydXB0IHx8IChfc2Nyb2xsYWJsZUF4ZXMueCAmJiBnZXN0dXJlLnggJiYgZGlzdGFuY2VzQmV5b25kQm91bmRzLnggPCAwKSB8fCAoX3Njcm9sbGFibGVBeGVzLnkgJiYgZ2VzdHVyZS55ICYmIGRpc3RhbmNlc0JleW9uZEJvdW5kcy55IDwgMCkpIHtcclxuXHRcdFx0XHRcdHJhd0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBzY3JvbGxlZCBkaXN0YW5jZSBhZ2FpbnN0IHRoZSBib3VuZGFyeSBsaW1pdCB0byBzZWUgaWYgc2Nyb2xsaW5nIGNhbiBiZSB0cmlnZ2VyZWQuXHJcblx0XHRcdFx0Ly8gSWYgdGhlIHNjcm9sbCBoYXMgYmVlbiBpbnRlcnJ1cHRlZCwgdHJpZ2dlciBhdCBvbmNlXHJcblx0XHRcdFx0aWYgKCFzY3JvbGxJbnRlcnJ1cHQgJiYgKCFfc2Nyb2xsYWJsZUF4ZXMueCB8fCBNYXRoLmFicyhnZXN0dXJlLngpIDwgX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxSZXNwb25zZUJvdW5kYXJ5KSAmJiAoIV9zY3JvbGxhYmxlQXhlcy55IHx8IE1hdGguYWJzKGdlc3R1cmUueSkgPCBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbFJlc3BvbnNlQm91bmRhcnkpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBJZiBib3VuY2luZyBpcyBkaXNhYmxlZCwgYW5kIGFscmVhZHkgYXQgYW4gZWRnZSBhbmQgc2Nyb2xsaW5nIGJleW9uZCB0aGUgZWRnZSwgaWdub3JlIHRoZSBzY3JvbGwgZm9yXHJcblx0XHRcdFx0Ly8gbm93IC0gdGhpcyBhbGxvd3Mgb3RoZXIgc2Nyb2xsZXJzIHRvIGNsYWltIGlmIGFwcHJvcHJpYXRlLCBhbGxvd2luZyBuaWNlciBuZXN0ZWQgc2Nyb2xscy5cclxuXHRcdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuYm91bmNpbmcgJiYgIXNjcm9sbEludGVycnVwdCAmJiAoIV9zY3JvbGxhYmxlQXhlcy54IHx8ICFnZXN0dXJlLnggfHwgZGlzdGFuY2VzQmV5b25kQm91bmRzLnggPiAwKSAmJiAoIV9zY3JvbGxhYmxlQXhlcy55IHx8ICFnZXN0dXJlLnkgfHwgZGlzdGFuY2VzQmV5b25kQm91bmRzLnkgPiAwKSkge1xyXG5cclxuXHRcdFx0XHRcdC8vIFByZXZlbnQgdGhlIG9yaWdpbmFsIGNsaWNrIG5vdyB0aGF0IHNjcm9sbGluZyB3b3VsZCBiZSB0cmlnZ2VyZWRcclxuXHRcdFx0XHRcdF9wcmV2ZW50Q2xpY2sgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFRyaWdnZXIgdGhlIHN0YXJ0IG9mIHZpc3VhbCBzY3JvbGxpbmdcclxuXHRcdFx0XHRfc3RhcnRBbmltYXRpb24oKTtcclxuXHRcdFx0XHRfaXNEaXNwbGF5aW5nU2Nyb2xsID0gdHJ1ZTtcclxuXHRcdFx0XHRfaGFzQmVlblNjcm9sbGVkID0gdHJ1ZTtcclxuXHRcdFx0XHRfaXNBbmltYXRpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdGluaXRpYWxTY3JvbGwgPSB0cnVlO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHQvLyBQcmV2ZW50IHRoZSBldmVudCBkZWZhdWx0LiAgSXQgaXMgc2FmZSB0byBjYWxsIHRoaXMgaW4gSUUxMCBiZWNhdXNlIHRoZSBldmVudCBpcyBuZXZlclxyXG5cdFx0XHRcdC8vIGEgd2luZG93LmV2ZW50LCBhbHdheXMgYSBcInRydWVcIiBldmVudC5cclxuXHRcdFx0XHRyYXdFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBub3QgeWV0IGxvY2tlZCB0byBhIHNjcm9sbCwgZGV0ZXJtaW5lIHdoZXRoZXIgdG8gZG8gc29cclxuXHRcdFx0aWYgKCFfaXNTY3JvbGxpbmcpIHtcclxuXHJcblx0XHRcdFx0Ly8gSWYgdGhlIGdlc3R1cmUgZGlzdGFuY2UgaGFzIGV4Y2VlZGVkIHRoZSBzY3JvbGwgbG9jayBkaXN0YW5jZSwgb3Igc25hcHBpbmcgaXMgYWN0aXZlXHJcblx0XHRcdFx0Ly8gYW5kIHRoZSBzY3JvbGwgaGFzIGJlZW4gaW50ZXJydXB0ZWQsIGVudGVyIGV4Y2x1c2l2ZSBzY3JvbGxpbmcuXHJcblx0XHRcdFx0aWYgKChzY3JvbGxJbnRlcnJ1cHQgJiYgX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykgfHwgKF9zY3JvbGxhYmxlQXhlcy54ICYmIE1hdGguYWJzKGdlc3R1cmUueCkgPj0gX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxCb3VuZGFyeSkgfHwgKF9zY3JvbGxhYmxlQXhlcy55ICYmIE1hdGguYWJzKGdlc3R1cmUueSkgPj0gX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxCb3VuZGFyeSkpIHtcclxuXHJcblx0XHRcdFx0XHRfaXNTY3JvbGxpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdFx0X2Z0c2Nyb2xsZXJNb3ZpbmcgPSBfc2VsZjtcclxuXHRcdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcpIHtcclxuXHRcdFx0XHRcdFx0d2luZG93W19pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZ10gPSBfc2VsZjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbHN0YXJ0JywgX2dldFBvc2l0aW9uKCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2FuY2VsIHRleHQgc2VsZWN0aW9ucyB3aGlsZSBkcmFnZ2luZyBhIGN1cnNvclxyXG5cdFx0XHRpZiAoX2NhbkNsZWFyU2VsZWN0aW9uKSB7XHJcblx0XHRcdFx0d2luZG93LmdldFNlbGVjdGlvbigpLnJlbW92ZUFsbFJhbmdlcygpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgYXhlcyB0YXJnZXQgcG9zaXRpb25zIGlmIGJleW9uZCBib3VuZHNcclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdGlmIChfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gPiAwKSB7XHJcblx0XHRcdFx0XHRcdF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSA9IF9tb2RpZnlEaXN0YW5jZUJleW9uZEJvdW5kcyhfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10sIGF4aXMpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gPCBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdICsgX21vZGlmeURpc3RhbmNlQmV5b25kQm91bmRzKF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSAtIF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSwgYXhpcyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUcmlnZ2VyIGEgc2Nyb2xsIHBvc2l0aW9uIHVwZGF0ZSBmb3IgcGxhdGZvcm1zIG5vdCB1c2luZyByZXF1ZXN0QW5pbWF0aW9uRnJhbWVzXHJcblx0XHRcdGlmICghX3JlcUFuaW1hdGlvbkZyYW1lKSB7XHJcblx0XHRcdFx0X3NjaGVkdWxlUmVuZGVyKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRvIGFpZCByZW5kZXIvZHJhdyBjb2FsZXNjaW5nLCBwZXJmb3JtIG90aGVyIG9uZS1vZmYgYWN0aW9ucyBoZXJlXHJcblx0XHRcdGlmIChpbml0aWFsU2Nyb2xsKSB7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nQ2xhc3NOYW1lKSB7XHJcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5jbGFzc05hbWUgKz0gJyAnICsgX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdDbGFzc05hbWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlc1theGlzXS5jbGFzc05hbWUgKz0gJyBhY3RpdmUnO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgYW4gZXZlbnQgdG8gdGhlIGV2ZW50IGhpc3RvcnksIGtlZXBpbmcgaXQgYXJvdW5kIHR3ZW50eSBldmVudHMgbG9uZ1xyXG5cdFx0XHRfZXZlbnRIaXN0b3J5LnB1c2goeyB4OiBpbnB1dFgsIHk6IGlucHV0WSwgdDogaW5wdXRUaW1lIH0pO1xyXG5cdFx0XHRpZiAoX2V2ZW50SGlzdG9yeS5sZW5ndGggPiAzMCkge1xyXG5cdFx0XHRcdF9ldmVudEhpc3Rvcnkuc3BsaWNlKDAsIDE1KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIENvbXBsZXRlIGEgc2Nyb2xsIHdpdGggYSBmaW5hbCBldmVudCB0aW1lIGlmIGF2YWlsYWJsZSAoaXQgbWF5XHJcblx0XHQgKiBub3QgYmUsIGRlcGVuZGluZyBvbiB0aGUgaW5wdXQgdHlwZSk7IHRoaXMgbWF5IGNvbnRpbnVlIHRoZSBzY3JvbGxcclxuXHRcdCAqIHdpdGggYSBmbGluZyBhbmQvb3IgYm91bmNlYmFjayBkZXBlbmRpbmcgb24gb3B0aW9ucy5cclxuXHRcdCAqL1xyXG5cdFx0X2VuZFNjcm9sbCA9IGZ1bmN0aW9uIF9lbmRTY3JvbGwoaW5wdXRUaW1lLCByYXdFdmVudCkge1xyXG5cdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gZmFsc2U7XHJcblx0XHRcdF9yZWxlYXNlSW5wdXRDYXB0dXJlKCk7XHJcblx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcclxuXHJcblx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbGludGVyYWN0aW9uZW5kJywge30pO1xyXG5cclxuXHRcdFx0aWYgKCFfaXNTY3JvbGxpbmcpIHtcclxuXHRcdFx0XHRpZiAoIV9zbmFwU2Nyb2xsKHRydWUpICYmIF9pc0Rpc3BsYXlpbmdTY3JvbGwpIHtcclxuXHRcdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCh0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBNb2RpZnkgdGhlIGxhc3QgbW92ZW1lbnQgZXZlbnQgdG8gaW5jbHVkZSB0aGUgZW5kIGV2ZW50IHRpbWVcclxuXHRcdFx0X2V2ZW50SGlzdG9yeVtfZXZlbnRIaXN0b3J5Lmxlbmd0aCAtIDFdLnQgPSBpbnB1dFRpbWU7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgZmxhZ3NcclxuXHRcdFx0X2lzU2Nyb2xsaW5nID0gZmFsc2U7XHJcblx0XHRcdF9pc0Rpc3BsYXlpbmdTY3JvbGwgPSBmYWxzZTtcclxuXHRcdFx0X2Z0c2Nyb2xsZXJNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZykge1xyXG5cdFx0XHRcdHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFByZXZlbnQgY2xpY2tzIGFuZCBzdG9wIHRoZSBldmVudCBkZWZhdWx0LiAgSXQgaXMgc2FmZSB0byBjYWxsIHRoaXMgaW4gSUUxMCBiZWNhdXNlXHJcblx0XHRcdC8vIHRoZSBldmVudCBpcyBuZXZlciBhIHdpbmRvdy5ldmVudCwgYWx3YXlzIGEgXCJ0cnVlXCIgZXZlbnQuXHJcblx0XHRcdF9wcmV2ZW50Q2xpY2sgPSB0cnVlO1xyXG5cdFx0XHRpZiAocmF3RXZlbnQpIHtcclxuXHRcdFx0XHRyYXdFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUcmlnZ2VyIGEgZmxpbmcgb3IgYm91bmNlYmFjayBpZiBuZWNlc3NhcnlcclxuXHRcdFx0aWYgKCFfZmxpbmdTY3JvbGwoKSAmJiAhX3NuYXBTY3JvbGwoKSkge1xyXG5cdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUmVtb3ZlIHRoZSBzY3JvbGxpbmcgY2xhc3MsIGNsZWFuaW5nIHVwIGRpc3BsYXkuXHJcblx0XHQgKi9cclxuXHRcdF9maW5hbGl6ZVNjcm9sbCA9IGZ1bmN0aW9uIF9maW5hbGl6ZVNjcm9sbChzY3JvbGxDYW5jZWxsZWQpIHtcclxuXHRcdFx0dmFyIGksIGwsIGF4aXMsIHNjcm9sbEV2ZW50LCBzY3JvbGxSZWdleDtcclxuXHJcblx0XHRcdF9pc0FuaW1hdGluZyA9IGZhbHNlO1xyXG5cdFx0XHRfaXNEaXNwbGF5aW5nU2Nyb2xsID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgc2Nyb2xsaW5nIGNsYXNzIGlmIHNldFxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdDbGFzc05hbWUpIHtcclxuXHRcdFx0XHRzY3JvbGxSZWdleCA9IG5ldyBSZWdFeHAoJyg/Ol58XFxcXHMpJyArIF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nQ2xhc3NOYW1lICsgJyg/IVxcXFxTKScsICdnJyk7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuY2xhc3NOYW1lID0gX2NvbnRhaW5lck5vZGUuY2xhc3NOYW1lLnJlcGxhY2Uoc2Nyb2xsUmVnZXgsICcnKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXNbYXhpc10uY2xhc3NOYW1lID0gX3Njcm9sbGJhck5vZGVzW2F4aXNdLmNsYXNzTmFtZS5yZXBsYWNlKC8gP2FjdGl2ZS9nLCAnJyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTdG9yZSBmaW5hbCBwb3NpdGlvbiBpZiBzY3JvbGxpbmcgb2NjdXJyZWRcclxuXHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbi54ID0gX2xhc3RTY3JvbGxQb3NpdGlvbi54O1xyXG5cdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uLnkgPSBfbGFzdFNjcm9sbFBvc2l0aW9uLnk7XHJcblxyXG5cdFx0XHRzY3JvbGxFdmVudCA9IF9nZXRQb3NpdGlvbigpO1xyXG5cclxuXHRcdFx0aWYgKCFzY3JvbGxDYW5jZWxsZWQpIHtcclxuXHRcdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGwnLCBzY3JvbGxFdmVudCk7XHJcblx0XHRcdFx0X3VwZGF0ZVNlZ21lbnRzKHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBbHdheXMgZmlyZSB0aGUgc2Nyb2xsIGVuZCBldmVudCwgaW5jbHVkaW5nIGFuIGFyZ3VtZW50IGluZGljYXRpbmcgd2hldGhlclxyXG5cdFx0XHQvLyB0aGUgc2Nyb2xsIHdhcyBjYW5jZWxsZWRcclxuXHRcdFx0c2Nyb2xsRXZlbnQuY2FuY2VsbGVkID0gc2Nyb2xsQ2FuY2VsbGVkO1xyXG5cdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGxlbmQnLCBzY3JvbGxFdmVudCk7XHJcblxyXG5cdFx0XHQvLyBSZXN0b3JlIHRyYW5zaXRpb25zXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRfc2Nyb2xsTm9kZXNbYXhpc10uc3R5bGVbX3RyYW5zaXRpb25Qcm9wZXJ0eV0gPSAnJztcclxuXHRcdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gJyc7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDbGVhciBhbnkgcmVtYWluaW5nIHRpbWVvdXRzXHJcblx0XHRcdGZvciAoaSA9IDAsIGwgPSBfdGltZW91dHMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChfdGltZW91dHNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdF90aW1lb3V0cy5sZW5ndGggPSAwO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEludGVycnVwdCBhIGN1cnJlbnQgc2Nyb2xsLCBhbGxvd2luZyBhIHN0YXJ0IHNjcm9sbCBkdXJpbmcgYW5pbWF0aW9uIHRvIHRyaWdnZXIgYSBuZXcgc2Nyb2xsXHJcblx0XHQgKi9cclxuXHRcdF9pbnRlcnJ1cHRTY3JvbGwgPSBmdW5jdGlvbiBfaW50ZXJydXB0U2Nyb2xsKCkge1xyXG5cdFx0XHR2YXIgYXhpcywgaSwgbDtcclxuXHJcblx0XHRcdF9pc0FuaW1hdGluZyA9IGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBzdG9yZWQgYmFzZSBwb3NpdGlvblxyXG5cdFx0XHRfdXBkYXRlRWxlbWVudFBvc2l0aW9uKCk7XHJcblxyXG5cdFx0XHQvLyBFbnN1cmUgdGhlIHBhcnNlZCBwb3NpdGlvbnMgYXJlIHNldCwgYWxzbyBjbGVhcmluZyB0cmFuc2l0aW9uc1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdLCAxNiwgX2luc3RhbmNlT3B0aW9ucy5ib3VuY2VEZWNlbGVyYXRpb25CZXppZXIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHNlZ21lbnQgdHJhY2tpbmcgaWYgc25hcHBpbmcgaXMgYWN0aXZlXHJcblx0XHRcdF91cGRhdGVTZWdtZW50cyhmYWxzZSk7XHJcblxyXG5cdFx0XHQvLyBDbGVhciBhbnkgcmVtYWluaW5nIHRpbWVvdXRzXHJcblx0XHRcdGZvciAoaSA9IDAsIGwgPSBfdGltZW91dHMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChfdGltZW91dHNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdF90aW1lb3V0cy5sZW5ndGggPSAwO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIERldGVybWluZSB3aGV0aGVyIGEgc2Nyb2xsIGZsaW5nIG9yIGJvdW5jZWJhY2sgaXMgcmVxdWlyZWQsIGFuZCBzZXQgdXAgdGhlIHN0eWxlcyBhbmRcclxuXHRcdCAqIHRpbWVvdXRzIHJlcXVpcmVkLlxyXG5cdFx0ICovXHJcblx0XHRfZmxpbmdTY3JvbGwgPSBmdW5jdGlvbiBfZmxpbmdTY3JvbGwoKSB7XHJcblx0XHRcdHZhciBpLCBheGlzLCBtb3ZlbWVudFRpbWUsIG1vdmVtZW50U3BlZWQsIGxhc3RQb3NpdGlvbiwgY29tcGFyaXNvblBvc2l0aW9uLCBmbGluZ0R1cmF0aW9uLCBmbGluZ0Rpc3RhbmNlLCBmbGluZ1Bvc2l0aW9uLCBib3VuY2VEZWxheSwgYm91bmNlRGlzdGFuY2UsIGJvdW5jZUR1cmF0aW9uLCBib3VuY2VUYXJnZXQsIGJvdW5kc0JvdW5jZSwgbW9kaWZpZWREaXN0YW5jZSwgZmxpbmdCZXppZXIsIHRpbWVQcm9wb3J0aW9uLCBib3VuZHNDcm9zc0RlbGF5LCBmbGluZ1N0YXJ0U2VnbWVudCwgYmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZSwgYmFzZUZsaW5nQ29tcG9uZW50O1xyXG5cdFx0XHR2YXIgbWF4QW5pbWF0aW9uVGltZSA9IDA7XHJcblx0XHRcdHZhciBtb3ZlUmVxdWlyZWQgPSBmYWxzZTtcclxuXHRcdFx0dmFyIHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkgPSB7fTtcclxuXHJcblx0XHRcdC8vIElmIHdlIG9ubHkgaGF2ZSB0aGUgc3RhcnQgZXZlbnQgYXZhaWxhYmxlLCBvciBmbGluZ2luZyBpcyBkaXNhYmxlZCxcclxuXHRcdFx0Ly8gb3IgdGhlIHNjcm9sbCB3YXMgdHJpZ2dlcmVkIGJ5IGEgc2Nyb2xsd2hlZWwsIG5vIGFjdGlvbiByZXF1aXJlZC5cclxuXHRcdFx0aWYgKF9ldmVudEhpc3RvcnkubGVuZ3RoID09PSAxIHx8ICFfaW5zdGFuY2VPcHRpb25zLmZsaW5naW5nIHx8IF9pbnB1dElkZW50aWZpZXIgPT09ICdzY3JvbGx3aGVlbCcpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRib3VuY2VEdXJhdGlvbiA9IDM1MDtcclxuXHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gMDtcclxuXHRcdFx0XHRcdGJvdW5kc0JvdW5jZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0Ym91bmNlVGFyZ2V0ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRib3VuZHNDcm9zc0RlbGF5ID0gdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0XHRcdC8vIFJlLXNldCBhIGRlZmF1bHQgYmV6aWVyIGN1cnZlIGZvciB0aGUgYW5pbWF0aW9uIGZvciBwb3RlbnRpYWwgbW9kaWZpY2F0aW9uXHJcblx0XHRcdFx0XHRmbGluZ0JlemllciA9IF9pbnN0YW5jZU9wdGlvbnMuZmxpbmdCZXppZXI7XHJcblxyXG5cdFx0XHRcdFx0Ly8gR2V0IHRoZSBsYXN0IG1vdmVtZW50IHNwZWVkLCBpbiBwaXhlbHMgcGVyIG1pbGxpc2Vjb25kLiAgVG8gZG8gdGhpcywgbG9vayBhdCB0aGUgZXZlbnRzXHJcblx0XHRcdFx0XHQvLyBpbiB0aGUgbGFzdCAxMDBtcyBhbmQgYXZlcmFnZSBvdXQgdGhlIHNwZWVkLCB1c2luZyBhIG1pbmltdW0gbnVtYmVyIG9mIHR3byBwb2ludHMuXHJcblx0XHRcdFx0XHRsYXN0UG9zaXRpb24gPSBfZXZlbnRIaXN0b3J5W19ldmVudEhpc3RvcnkubGVuZ3RoIC0gMV07XHJcblx0XHRcdFx0XHRjb21wYXJpc29uUG9zaXRpb24gPSBfZXZlbnRIaXN0b3J5W19ldmVudEhpc3RvcnkubGVuZ3RoIC0gMl07XHJcblx0XHRcdFx0XHRmb3IgKGkgPSBfZXZlbnRIaXN0b3J5Lmxlbmd0aCAtIDM7IGkgPj0gMDsgaSA9IGkgLSAxKSB7XHJcblx0XHRcdFx0XHRcdGlmIChsYXN0UG9zaXRpb24udCAtIF9ldmVudEhpc3RvcnlbaV0udCA+IDEwMCkge1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGNvbXBhcmlzb25Qb3NpdGlvbiA9IF9ldmVudEhpc3RvcnlbaV07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gR2V0IHRoZSBsYXN0IG1vdmVtZW50IHRpbWUuICBJZiB0aGlzIGlzIHplcm8gLSBhcyBjYW4gaGFwcGVuIHdpdGhcclxuXHRcdFx0XHRcdC8vIHNvbWUgc2Nyb2xsd2hlZWwgZXZlbnRzIG9uIHNvbWUgcGxhdGZvcm1zIC0gaW5jcmVhc2UgaXQgdG8gMTZtcyBhc1xyXG5cdFx0XHRcdFx0Ly8gaWYgdGhlIG1vdmVtZW50IG9jY3VycmVkIG92ZXIgYSBzaW5nbGUgZnJhbWUgYXQgNjBmcHMuXHJcblx0XHRcdFx0XHRtb3ZlbWVudFRpbWUgPSBsYXN0UG9zaXRpb24udCAtIGNvbXBhcmlzb25Qb3NpdGlvbi50O1xyXG5cdFx0XHRcdFx0aWYgKCFtb3ZlbWVudFRpbWUpIHtcclxuXHRcdFx0XHRcdFx0bW92ZW1lbnRUaW1lID0gMTY7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gRGVyaXZlIHRoZSBtb3ZlbWVudCBzcGVlZFxyXG5cdFx0XHRcdFx0bW92ZW1lbnRTcGVlZCA9IChsYXN0UG9zaXRpb25bYXhpc10gLSBjb21wYXJpc29uUG9zaXRpb25bYXhpc10pIC8gbW92ZW1lbnRUaW1lO1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIHRoZXJlIGlzIGxpdHRsZSBzcGVlZCwgbm8gZnVydGhlciBhY3Rpb24gcmVxdWlyZWQgZXhjZXB0IGZvciBhIGJvdW5jZWJhY2ssIGJlbG93LlxyXG5cdFx0XHRcdFx0aWYgKE1hdGguYWJzKG1vdmVtZW50U3BlZWQpIDwgX2tNaW5pbXVtU3BlZWQpIHtcclxuXHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IDA7XHJcblx0XHRcdFx0XHRcdGZsaW5nRGlzdGFuY2UgPSAwO1xyXG5cclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblxyXG5cclxuXHRcdFx0XHRcdFx0LyogQ2FsY3VsYXRlIHRoZSBmbGluZyBkdXJhdGlvbi4gIEFzIHBlciBUb3VjaFNjcm9sbCwgdGhlIHNwZWVkIGF0IGFueSBwYXJ0aWN1bGFyXHJcblx0XHRcdFx0XHRcdHBvaW50IGluIHRpbWUgY2FuIGJlIGNhbGN1bGF0ZWQgYXM6XHJcblx0XHRcdFx0XHRcdFx0eyBzcGVlZCB9ID0geyBpbml0aWFsIHNwZWVkIH0gKiAoeyBmcmljdGlvbiB9IHRvIHRoZSBwb3dlciBvZiB7IGR1cmF0aW9uIH0pXHJcblx0XHRcdFx0XHRcdC4uLmFzc3VtaW5nIGFsbCB2YWx1ZXMgYXJlIGluIGVxdWFsIHBpeGVscy9taWxsaXNlY29uZCBtZWFzdXJlbWVudHMuICBBcyB3ZSBrbm93IHRoZVxyXG5cdFx0XHRcdFx0XHRtaW5pbXVtIHRhcmdldCBzcGVlZCwgdGhpcyBjYW4gYmUgYWx0ZXJlZCB0bzpcclxuXHRcdFx0XHRcdFx0XHR7IGR1cmF0aW9uIH0gPSBsb2coIHsgc3BlZWQgfSAvIHsgaW5pdGlhbCBzcGVlZCB9ICkgLyBsb2coIHsgZnJpY3Rpb24gfSApXHJcblx0XHRcdFx0XHRcdCovXHJcblxyXG5cdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gTWF0aC5sb2coX2tNaW5pbXVtU3BlZWQgLyBNYXRoLmFicyhtb3ZlbWVudFNwZWVkKSkgLyBNYXRoLmxvZyhfa0ZyaWN0aW9uKTtcclxuXHJcblxyXG5cdFx0XHRcdFx0XHQvKiBDYWxjdWxhdGUgdGhlIGZsaW5nIGRpc3RhbmNlIChiZWZvcmUgYW55IGJvdW5jaW5nIG9yIHNuYXBwaW5nKS4gIEFzIHBlclxyXG5cdFx0XHRcdFx0XHRUb3VjaFNjcm9sbCwgdGhlIHRvdGFsIGRpc3RhbmNlIGNvdmVyZWQgY2FuIGJlIGFwcHJveGltYXRlZCBieSBzdW1taW5nXHJcblx0XHRcdFx0XHRcdHRoZSBkaXN0YW5jZSBwZXIgbWlsbGlzZWNvbmQsIHBlciBtaWxsaXNlY29uZCBvZiBkdXJhdGlvbiAtIGEgZGl2ZXJnZW50IHNlcmllcyxcclxuXHRcdFx0XHRcdFx0YW5kIHNvIHJhdGhlciB0cmlja3kgdG8gbW9kZWwgb3RoZXJ3aXNlIVxyXG5cdFx0XHRcdFx0XHRTbyB1c2luZyB2YWx1ZXMgaW4gcGl4ZWxzIHBlciBtaWxsaXNlY29uZDpcclxuXHRcdFx0XHRcdFx0XHR7IGRpc3RhbmNlIH0gPSB7IGluaXRpYWwgc3BlZWQgfSAqICgxIC0gKHsgZnJpY3Rpb24gfSB0byB0aGUgcG93ZXJcclxuXHRcdFx0XHRcdFx0XHRcdG9mIHsgZHVyYXRpb24gKyAxIH0pIC8gKDEgLSB7IGZyaWN0aW9uIH0pXHJcblx0XHRcdFx0XHRcdCovXHJcblxyXG5cdFx0XHRcdFx0XHRmbGluZ0Rpc3RhbmNlID0gbW92ZW1lbnRTcGVlZCAqICgxIC0gTWF0aC5wb3coX2tGcmljdGlvbiwgZmxpbmdEdXJhdGlvbiArIDEpKSAvICgxIC0gX2tGcmljdGlvbik7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIGEgdGFyZ2V0IGZsaW5nIHBvc2l0aW9uXHJcblx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gTWF0aC5mbG9vcihfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICsgZmxpbmdEaXN0YW5jZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgYm91bmNpbmcgaXMgZGlzYWJsZWQsIGFuZCB0aGUgbGFzdCBzY3JvbGwgcG9zaXRpb24gYW5kIGZsaW5nIHBvc2l0aW9uIGFyZSBib3RoIGF0IGEgYm91bmQsXHJcblx0XHRcdFx0XHQvLyByZXNldCB0aGUgZmxpbmcgcG9zaXRpb24gdG8gdGhlIGJvdW5kXHJcblx0XHRcdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuYm91bmNpbmcpIHtcclxuXHRcdFx0XHRcdFx0aWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPT09IDAgJiYgZmxpbmdQb3NpdGlvbiA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gMDtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdID09PSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10gJiYgZmxpbmdQb3NpdGlvbiA8IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEluIHBhZ2luYXRlZCBzbmFwcGluZyBtb2RlLCBkZXRlcm1pbmUgdGhlIHBhZ2UgdG8gc25hcCB0byAtIG1heGltdW1cclxuXHRcdFx0XHRcdC8vIG9uZSBwYWdlIGluIGVpdGhlciBkaXJlY3Rpb24gZnJvbSB0aGUgY3VycmVudCBwYWdlLlxyXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMucGFnaW5hdGVkU25hcCAmJiBfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XHJcblx0XHRcdFx0XHRcdGZsaW5nU3RhcnRTZWdtZW50ID0gLV9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHRpZiAoX2Jhc2VTZWdtZW50W2F4aXNdIDwgZmxpbmdTdGFydFNlZ21lbnQpIHtcclxuXHRcdFx0XHRcdFx0XHRmbGluZ1N0YXJ0U2VnbWVudCA9IE1hdGguZmxvb3IoZmxpbmdTdGFydFNlZ21lbnQpO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGZsaW5nU3RhcnRTZWdtZW50ID0gTWF0aC5jZWlsKGZsaW5nU3RhcnRTZWdtZW50KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhlIHRhcmdldCBwb3NpdGlvbiB3aWxsIGVuZCB1cCBiZXlvbmQgYW5vdGhlciBwYWdlLCB0YXJnZXQgdGhhdCBwYWdlIGVkZ2VcclxuXHRcdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPiAtKGZsaW5nU3RhcnRTZWdtZW50IC0gMSkgKiBfc25hcEdyaWRTaXplW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uICsgKGZsaW5nU3RhcnRTZWdtZW50IC0gMSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZsaW5nUG9zaXRpb24gPCAtKGZsaW5nU3RhcnRTZWdtZW50ICsgMSkgKiBfc25hcEdyaWRTaXplW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uICsgKGZsaW5nU3RhcnRTZWdtZW50ICsgMSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCBpZiB0aGUgbW92ZW1lbnQgc3BlZWQgd2FzIGFib3ZlIHRoZSBtaW5pbXVtIHZlbG9jaXR5LCBjb250aW51ZVxyXG5cdFx0XHRcdFx0XHQvLyBpbiB0aGUgbW92ZSBkaXJlY3Rpb24uXHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoTWF0aC5hYnMobW92ZW1lbnRTcGVlZCkgPiBfa01pbmltdW1TcGVlZCkge1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBEZXRlcm1pbmUgdGhlIHRhcmdldCBzZWdtZW50XHJcblx0XHRcdFx0XHRcdFx0aWYgKG1vdmVtZW50U3BlZWQgPCAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gTWF0aC5mbG9vcihfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gTWF0aC5jZWlsKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdKSAqIF9zbmFwR3JpZFNpemVbYXhpc107XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gTWF0aC5taW4oX2luc3RhbmNlT3B0aW9ucy5tYXhGbGluZ0R1cmF0aW9uLCBmbGluZ0R1cmF0aW9uICogKGZsaW5nUG9zaXRpb24gLSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKSAvIGZsaW5nRGlzdGFuY2UpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSW4gbm9uLXBhZ2luYXRlZCBzbmFwcGluZyBtb2RlLCBzbmFwIHRvIHRoZSBuZWFyZXN0IGdyaWQgbG9jYXRpb24gdG8gdGhlIHRhcmdldFxyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XHJcblx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiAtIChNYXRoLnJvdW5kKGZsaW5nUG9zaXRpb24gLyBfc25hcEdyaWRTaXplW2F4aXNdKSAqIF9zbmFwR3JpZFNpemVbYXhpc10pO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIERlYWwgd2l0aCBjYXNlcyB3aGVyZSB0aGUgdGFyZ2V0IGlzIGJleW9uZCB0aGUgYm91bmRzXHJcblx0XHRcdFx0XHRpZiAoZmxpbmdQb3NpdGlvbiAtIGJvdW5jZURpc3RhbmNlID4gMCkge1xyXG5cdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb247XHJcblx0XHRcdFx0XHRcdGJvdW5kc0JvdW5jZSA9IHRydWU7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGZsaW5nUG9zaXRpb24gLSBib3VuY2VEaXN0YW5jZSA8IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb24gLSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc107XHJcblx0XHRcdFx0XHRcdGJvdW5kc0JvdW5jZSA9IHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gQW1lbmQgdGhlIHBvc2l0aW9ucyBhbmQgYmV6aWVyIGN1cnZlIGlmIG5lY2Vzc2FyeVxyXG5cdFx0XHRcdFx0aWYgKGJvdW5jZURpc3RhbmNlKSB7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgZmxpbmcgbW92ZXMgdGhlIHNjcm9sbGVyIGJleW9uZCB0aGUgbm9ybWFsIHNjcm9sbCBib3VuZHMsIGFuZFxyXG5cdFx0XHRcdFx0XHQvLyB0aGUgYm91bmNlIGlzIHNuYXBwaW5nIHRoZSBzY3JvbGwgYmFjayBhZnRlciB0aGUgZmxpbmc6XHJcblx0XHRcdFx0XHRcdGlmIChib3VuZHNCb3VuY2UgJiYgX2luc3RhbmNlT3B0aW9ucy5ib3VuY2luZyAmJiBmbGluZ0Rpc3RhbmNlKSB7XHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdEaXN0YW5jZSA9IE1hdGguZmxvb3IoZmxpbmdEaXN0YW5jZSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmIChmbGluZ1Bvc2l0aW9uID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0YmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb24gLSBNYXRoLm1heCgwLCBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0YmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb24gLSBNYXRoLm1pbihfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10sIF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10pO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRiYXNlRmxpbmdDb21wb25lbnQgPSBmbGluZ0Rpc3RhbmNlIC0gYmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHRoZSB0aW1lIHByb3BvcnRpb24gdGhlIG9yaWdpbmFsIGJvdW5kIGlzIGFsb25nIHRoZSBmbGluZyBjdXJ2ZVxyXG5cdFx0XHRcdFx0XHRcdGlmICghZmxpbmdEaXN0YW5jZSB8fCAhZmxpbmdEdXJhdGlvbikge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGltZVByb3BvcnRpb24gPSAwO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aW1lUHJvcG9ydGlvbiA9IGZsaW5nQmV6aWVyLl9nZXRDb29yZGluYXRlRm9yVChmbGluZ0Jlemllci5nZXRURm9yWSgoZmxpbmdEaXN0YW5jZSAtIGJleW9uZEJvdW5kc0ZsaW5nRGlzdGFuY2UpIC8gZmxpbmdEaXN0YW5jZSwgMSAvIGZsaW5nRHVyYXRpb24pLCBmbGluZ0Jlemllci5fcDEueCwgZmxpbmdCZXppZXIuX3AyLngpO1xyXG5cdFx0XHRcdFx0XHRcdFx0Ym91bmRzQ3Jvc3NEZWxheSA9IHRpbWVQcm9wb3J0aW9uICogZmxpbmdEdXJhdGlvbjtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIEVpZ2h0aCB0aGUgZGlzdGFuY2UgYmV5b25kcyB0aGUgYm91bmRzXHJcblx0XHRcdFx0XHRcdFx0bW9kaWZpZWREaXN0YW5jZSA9IE1hdGguY2VpbChiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlIC8gOCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIEZ1cnRoZXIgbGltaXQgdGhlIGJvdW5jZSB0byBoYWxmIHRoZSBjb250YWluZXIgZGltZW5zaW9uc1xyXG5cdFx0XHRcdFx0XHRcdGlmIChNYXRoLmFicyhtb2RpZmllZERpc3RhbmNlKSA+IF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSAvIDIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChtb2RpZmllZERpc3RhbmNlIDwgMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRtb2RpZmllZERpc3RhbmNlID0gLU1hdGguZmxvb3IoX21ldHJpY3MuY29udGFpbmVyW2F4aXNdIC8gMik7XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRtb2RpZmllZERpc3RhbmNlID0gTWF0aC5mbG9vcihfbWV0cmljcy5jb250YWluZXJbYXhpc10gLyAyKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmIChmbGluZ1Bvc2l0aW9uID4gMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ym91bmNlVGFyZ2V0ID0gMDtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ym91bmNlVGFyZ2V0ID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gSWYgdGhlIGVudGlyZSBmbGluZyBpcyBhIGJvdW5jZSwgbW9kaWZ5IGFwcHJvcHJpYXRlbHlcclxuXHRcdFx0XHRcdFx0XHRpZiAodGltZVByb3BvcnRpb24gPT09IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBmbGluZ0R1cmF0aW9uIC8gNjtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICsgYmFzZUZsaW5nQ29tcG9uZW50ICsgbW9kaWZpZWREaXN0YW5jZTtcclxuXHRcdFx0XHRcdFx0XHRcdGJvdW5jZURlbGF5ID0gZmxpbmdEdXJhdGlvbjtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCB0YWtlIGEgbmV3IGN1cnZlIGFuZCBhZGQgaXQgdG8gdGhlIHRpbWVvdXQgc3RhY2sgZm9yIHRoZSBib3VuY2VcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIFRoZSBuZXcgYm91bmNlIGRlbGF5IGlzIHRoZSBwcmUtYm91bmRhcnkgZmxpbmcgZHVyYXRpb24sIHBsdXMgYVxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gc2l4dGggb2YgdGhlIHBvc3QtYm91bmRhcnkgZmxpbmcuXHJcblx0XHRcdFx0XHRcdFx0XHRib3VuY2VEZWxheSA9ICh0aW1lUHJvcG9ydGlvbiArICgoMSAtIHRpbWVQcm9wb3J0aW9uKSAvIDYpKSAqIGZsaW5nRHVyYXRpb247XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0X3NjaGVkdWxlQXhpc1Bvc2l0aW9uKGF4aXMsIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICsgYmFzZUZsaW5nQ29tcG9uZW50ICsgbW9kaWZpZWREaXN0YW5jZSksICgoMSAtIHRpbWVQcm9wb3J0aW9uKSAqIGZsaW5nRHVyYXRpb24gLyA2KSwgX2luc3RhbmNlT3B0aW9ucy5ib3VuY2VEZWNlbGVyYXRpb25CZXppZXIsIGJvdW5kc0Nyb3NzRGVsYXkpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIE1vZGlmeSB0aGUgZmxpbmcgdG8gbWF0Y2gsIGNsaXBwaW5nIHRvIHByZXZlbnQgb3Zlci1mbGluZ1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdCZXppZXIgPSBmbGluZ0Jlemllci5kaXZpZGVBdFgoYm91bmNlRGVsYXkgLyBmbGluZ0R1cmF0aW9uLCAxIC8gZmxpbmdEdXJhdGlvbilbMF07XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gYm91bmNlRGVsYXk7XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKyBiYXNlRmxpbmdDb21wb25lbnQgKyBtb2RpZmllZERpc3RhbmNlKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgZmxpbmcgcmVxdWlyZXMgc25hcHBpbmcgdG8gYSBzbmFwIGxvY2F0aW9uLCBhbmQgdGhlIGJvdW5jZSBuZWVkcyB0b1xyXG5cdFx0XHRcdFx0XHQvLyByZXZlcnNlIHRoZSBmbGluZyBkaXJlY3Rpb24gYWZ0ZXIgdGhlIGZsaW5nIGNvbXBsZXRlczpcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICgoZmxpbmdEaXN0YW5jZSA8IDAgJiYgYm91bmNlRGlzdGFuY2UgPCBmbGluZ0Rpc3RhbmNlKSB8fCAoZmxpbmdEaXN0YW5jZSA+IDAgJiYgYm91bmNlRGlzdGFuY2UgPiBmbGluZ0Rpc3RhbmNlKSkge1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBTaG9ydGVuIHRoZSBvcmlnaW5hbCBmbGluZyBkdXJhdGlvbiB0byByZWZsZWN0IHRoZSBib3VuY2VcclxuXHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gZmxpbmdQb3NpdGlvbiAtIE1hdGguZmxvb3IoZmxpbmdEaXN0YW5jZSAvIDIpO1xyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gYm91bmNlRGlzdGFuY2UgLSBNYXRoLmZsb29yKGZsaW5nRGlzdGFuY2UgLyAyKTtcclxuXHRcdFx0XHRcdFx0XHRib3VuY2VEdXJhdGlvbiA9IE1hdGguc3FydChNYXRoLmFicyhib3VuY2VEaXN0YW5jZSkpICogNTA7XHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlVGFyZ2V0ID0gZmxpbmdQb3NpdGlvbiAtIGJvdW5jZURpc3RhbmNlO1xyXG5cdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSAzNTA7XHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGVsYXkgPSBmbGluZ0R1cmF0aW9uICogMC45NztcclxuXHJcblx0XHRcdFx0XHRcdC8vIElmIHRoZSBib3VuY2UgaXMgdHJ1bmNhdGluZyB0aGUgZmxpbmcsIG9yIGNvbnRpbnVpbmcgdGhlIGZsaW5nIG9uIGluIHRoZSBzYW1lXHJcblx0XHRcdFx0XHRcdC8vIGRpcmVjdGlvbiB0byBoaXQgdGhlIG5leHQgYm91bmRhcnk6XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IGZsaW5nUG9zaXRpb24gLSBib3VuY2VEaXN0YW5jZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gSWYgdGhlcmUgd2FzIG5vIGZsaW5nIGRpc3RhbmNlIG9yaWdpbmFsbHksIHVzZSB0aGUgYm91bmNlIGRldGFpbHNcclxuXHRcdFx0XHRcdFx0XHRpZiAoIWZsaW5nRGlzdGFuY2UpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBib3VuY2VEdXJhdGlvbjtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gSWYgdHJ1bmNhdGluZyB0aGUgZmxpbmcgYXQgYSBzbmFwcGluZyBlZGdlOlxyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoKGZsaW5nRGlzdGFuY2UgPCAwICYmIGJvdW5jZURpc3RhbmNlIDwgMCkgfHwgKGZsaW5nRGlzdGFuY2UgPiAwICYmIGJvdW5jZURpc3RhbmNlID4gMCkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRpbWVQcm9wb3J0aW9uID0gZmxpbmdCZXppZXIuX2dldENvb3JkaW5hdGVGb3JUKGZsaW5nQmV6aWVyLmdldFRGb3JZKChNYXRoLmFicyhmbGluZ0Rpc3RhbmNlKSAtIE1hdGguYWJzKGJvdW5jZURpc3RhbmNlKSkgLyBNYXRoLmFicyhmbGluZ0Rpc3RhbmNlKSwgMSAvIGZsaW5nRHVyYXRpb24pLCBmbGluZ0Jlemllci5fcDEueCwgZmxpbmdCZXppZXIuX3AyLngpO1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdCZXppZXIgPSBmbGluZ0Jlemllci5kaXZpZGVBdFgodGltZVByb3BvcnRpb24sIDEgLyBmbGluZ0R1cmF0aW9uKVswXTtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBNYXRoLnJvdW5kKGZsaW5nRHVyYXRpb24gKiB0aW1lUHJvcG9ydGlvbik7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIElmIGV4dGVuZGluZyB0aGUgZmxpbmcgdG8gcmVhY2ggdGhlIG5leHQgc25hcHBpbmcgYm91bmRhcnksIG5vIGZ1cnRoZXJcclxuXHRcdFx0XHRcdFx0XHQvLyBhY3Rpb24gaXMgcmVxdWlyZWQuXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IDA7XHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlRHVyYXRpb24gPSAwO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgbm8gZmxpbmcgb3IgYm91bmNlIGlzIHJlcXVpcmVkLCBjb250aW51ZVxyXG5cdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPT09IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gJiYgIWJvdW5jZURpc3RhbmNlKSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0bW92ZVJlcXVpcmVkID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0XHQvLyBQZXJmb3JtIHRoZSBmbGluZ1xyXG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBmbGluZ1Bvc2l0aW9uLCBmbGluZ0R1cmF0aW9uLCBmbGluZ0JlemllciwgYm91bmRzQ3Jvc3NEZWxheSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gU2NoZWR1bGUgYSBib3VuY2UgaWYgYXBwcm9wcmlhdGVcclxuXHRcdFx0XHRcdGlmIChib3VuY2VEaXN0YW5jZSAmJiBib3VuY2VEdXJhdGlvbikge1xyXG5cdFx0XHRcdFx0XHRfc2NoZWR1bGVBeGlzUG9zaXRpb24oYXhpcywgYm91bmNlVGFyZ2V0LCBib3VuY2VEdXJhdGlvbiwgX2luc3RhbmNlT3B0aW9ucy5ib3VuY2VCZXppZXIsIGJvdW5jZURlbGF5KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRtYXhBbmltYXRpb25UaW1lID0gTWF0aC5tYXgobWF4QW5pbWF0aW9uVGltZSwgYm91bmNlRGlzdGFuY2UgPyAoYm91bmNlRGVsYXkgKyBib3VuY2VEdXJhdGlvbikgOiBmbGluZ0R1cmF0aW9uKTtcclxuXHRcdFx0XHRcdHNjcm9sbFBvc2l0aW9uc1RvQXBwbHlbYXhpc10gPSAoYm91bmNlVGFyZ2V0ID09PSBmYWxzZSkgPyBmbGluZ1Bvc2l0aW9uIDogYm91bmNlVGFyZ2V0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKG1vdmVSZXF1aXJlZCAmJiBtYXhBbmltYXRpb25UaW1lKSB7XHJcblx0XHRcdFx0X3RpbWVvdXRzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHR2YXIgYW5BeGlzO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc3RvcmVkIHNjcm9sbCBwb3NpdGlvbiByZWFkeSBmb3IgZmluYWxpc2luZ1xyXG5cdFx0XHRcdFx0Zm9yIChhbkF4aXMgaW4gc2Nyb2xsUG9zaXRpb25zVG9BcHBseSkge1xyXG5cdFx0XHRcdFx0XHRpZiAoc2Nyb2xsUG9zaXRpb25zVG9BcHBseS5oYXNPd25Qcm9wZXJ0eShhbkF4aXMpKSB7XHJcblx0XHRcdFx0XHRcdFx0X2xhc3RTY3JvbGxQb3NpdGlvblthbkF4aXNdID0gc2Nyb2xsUG9zaXRpb25zVG9BcHBseVthbkF4aXNdO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKCk7XHJcblx0XHRcdFx0fSwgbWF4QW5pbWF0aW9uVGltZSkpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gbW92ZVJlcXVpcmVkO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEJvdW5jZSBiYWNrIGludG8gYm91bmRzIGlmIG5lY2Vzc2FyeSwgb3Igc25hcCB0byBhIGdyaWQgbG9jYXRpb24uXHJcblx0XHQgKi9cclxuXHRcdF9zbmFwU2Nyb2xsID0gZnVuY3Rpb24gX3NuYXBTY3JvbGwoc2Nyb2xsQ2FuY2VsbGVkKSB7XHJcblx0XHRcdHZhciBheGlzO1xyXG5cdFx0XHR2YXIgc25hcER1cmF0aW9uID0gc2Nyb2xsQ2FuY2VsbGVkID8gMTAwIDogMzUwO1xyXG5cdFx0XHR2YXIgdGFyZ2V0UG9zaXRpb24gPSBfbGFzdFNjcm9sbFBvc2l0aW9uO1xyXG5cclxuXHRcdFx0Ly8gR2V0IHRoZSBjdXJyZW50IHBvc2l0aW9uIGFuZCBzZWUgaWYgYSBzbmFwIGlzIHJlcXVpcmVkXHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XHJcblxyXG5cdFx0XHRcdC8vIFN0b3JlIGN1cnJlbnQgc25hcCBpbmRleFxyXG5cdFx0XHRcdF9zbmFwSW5kZXggPSBfZ2V0U25hcEluZGV4Rm9yUG9zaXRpb24odGFyZ2V0UG9zaXRpb24pO1xyXG5cdFx0XHRcdHRhcmdldFBvc2l0aW9uID0gX2dldFNuYXBQb3NpdGlvbkZvckluZGV4ZXMoX3NuYXBJbmRleCwgdGFyZ2V0UG9zaXRpb24pO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRhcmdldFBvc2l0aW9uID0gX2xpbWl0VG9Cb3VuZHModGFyZ2V0UG9zaXRpb24pO1xyXG5cclxuXHRcdFx0dmFyIHNuYXBSZXF1aXJlZCA9IGZhbHNlO1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX2Jhc2VTY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfYmFzZVNjcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRpZiAodGFyZ2V0UG9zaXRpb25bYXhpc10gIT09IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0c25hcFJlcXVpcmVkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFzbmFwUmVxdWlyZWQpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFBlcmZvcm0gdGhlIHNuYXBcclxuXHRcdFx0Zm9yIChheGlzIGluIF9iYXNlU2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX2Jhc2VTY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCB0YXJnZXRQb3NpdGlvbltheGlzXSwgc25hcER1cmF0aW9uKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHN0b3JlZCBzY3JvbGwgcG9zaXRpb24gcmVhZHkgZm9yIGZpbmFsaXppbmdcclxuXHRcdFx0XHRfbGFzdFNjcm9sbFBvc2l0aW9uID0gdGFyZ2V0UG9zaXRpb247XHJcblxyXG5cdFx0XHRcdF9maW5hbGl6ZVNjcm9sbChzY3JvbGxDYW5jZWxsZWQpO1xyXG5cdFx0XHR9LCBzbmFwRHVyYXRpb24pKTtcclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEdldCBhbiBhcHByb3ByaWF0ZSBzbmFwIGluZGV4IGZvciBhIHN1cHBsaWVkIHBvaW50LlxyXG5cdFx0ICovXHJcblx0XHRfZ2V0U25hcEluZGV4Rm9yUG9zaXRpb24gPSBmdW5jdGlvbiBfZ2V0U25hcEluZGV4Rm9yUG9zaXRpb24oY29vcmRpbmF0ZXMpIHtcclxuXHRcdFx0dmFyIGF4aXM7XHJcblx0XHRcdHZhciBpbmRleGVzID0ge3g6IDAsIHk6IDB9O1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSAmJiBfc25hcEdyaWRTaXplW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRpbmRleGVzW2F4aXNdID0gTWF0aC5yb3VuZChjb29yZGluYXRlc1theGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc10pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gaW5kZXhlcztcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBHZXQgYW4gYXBwcm9wcmlhdGUgc25hcCBwb2ludCBmb3IgYSBzdXBwbGllZCBpbmRleC5cclxuXHRcdCAqL1xyXG5cdFx0X2dldFNuYXBQb3NpdGlvbkZvckluZGV4ZXMgPSBmdW5jdGlvbiBfZ2V0U25hcFBvc2l0aW9uRm9ySW5kZXhlcyhpbmRleGVzLCBjdXJyZW50Q29vcmRpbmF0ZXMpIHtcclxuXHRcdFx0dmFyIGF4aXM7XHJcblx0XHRcdHZhciBjb29yZGluYXRlc1RvUmV0dXJuID0ge1xyXG5cdFx0XHRcdHg6IGN1cnJlbnRDb29yZGluYXRlcy54LFxyXG5cdFx0XHRcdHk6IGN1cnJlbnRDb29yZGluYXRlcy55XHJcblx0XHRcdH07XHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRjb29yZGluYXRlc1RvUmV0dXJuW2F4aXNdID0gaW5kZXhlc1theGlzXSAqIF9zbmFwR3JpZFNpemVbYXhpc107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBjb29yZGluYXRlc1RvUmV0dXJuO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIExpbWl0IGNvb3JkaW5hdGVzIHdpdGhpbiB0aGUgYm91bmRzIG9mIHRoZSBzY3JvbGxhYmxlIHZpZXdwb3J0LlxyXG5cdFx0ICovXHJcblx0XHRfbGltaXRUb0JvdW5kcyA9IGZ1bmN0aW9uIF9saW1pdFRvQm91bmRzKGNvb3JkaW5hdGVzKSB7XHJcblx0XHRcdHZhciBheGlzO1xyXG5cdFx0XHR2YXIgY29vcmRpbmF0ZXNUb1JldHVybiA9IHsgeDogY29vcmRpbmF0ZXMueCwgeTogY29vcmRpbmF0ZXMueSB9O1xyXG5cclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGUgY29vcmRpbmF0ZSBpcyBiZXlvbmQgdGhlIGVkZ2VzIG9mIHRoZSBzY3JvbGxlciwgdXNlIHRoZSBjbG9zZXN0IGVkZ2VcclxuXHRcdFx0XHRcdGlmIChjb29yZGluYXRlc1theGlzXSA+IDApIHtcclxuXHRcdFx0XHRcdFx0Y29vcmRpbmF0ZXNUb1JldHVybltheGlzXSA9IDA7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKGNvb3JkaW5hdGVzW2F4aXNdIDwgX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdGNvb3JkaW5hdGVzVG9SZXR1cm5bYXhpc10gPSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc107XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGNvb3JkaW5hdGVzVG9SZXR1cm47XHJcblx0XHR9O1xyXG5cclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFNldHMgdXAgdGhlIERPTSBhcm91bmQgdGhlIG5vZGUgdG8gYmUgc2Nyb2xsZWQuXHJcblx0XHQgKi9cclxuXHRcdF9pbml0aWFsaXplRE9NID0gZnVuY3Rpb24gX2luaXRpYWxpemVET00oKSB7XHJcblx0XHRcdHZhciBvZmZzY3JlZW5GcmFnbWVudCwgb2Zmc2NyZWVuTm9kZSwgc2Nyb2xsWVBhcmVudDtcclxuXHJcblx0XHRcdC8vIENoZWNrIHdoZXRoZXIgdGhlIERPTSBpcyBhbHJlYWR5IHByZXNlbnQgYW5kIHZhbGlkIC0gaWYgc28sIG5vIGZ1cnRoZXIgYWN0aW9uIHJlcXVpcmVkLlxyXG5cdFx0XHRpZiAoX2V4aXN0aW5nRE9NVmFsaWQoKSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gT3RoZXJ3aXNlLCB0aGUgRE9NIG5lZWRzIHRvIGJlIGNyZWF0ZWQgaW5zaWRlIHRoZSBvcmlnaW5hbGx5IHN1cHBsaWVkIG5vZGUuICBUaGUgbm9kZVxyXG5cdFx0XHQvLyBoYXMgYSBjb250YWluZXIgaW5zZXJ0ZWQgaW5zaWRlIGl0IC0gd2hpY2ggYWN0cyBhcyBhbiBhbmNob3IgZWxlbWVudCB3aXRoIGNvbnN0cmFpbnRzIC1cclxuXHRcdFx0Ly8gYW5kIHRoZW4gdGhlIHNjcm9sbGFibGUgbGF5ZXJzIGFzIGFwcHJvcHJpYXRlLlxyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGEgbmV3IGRvY3VtZW50IGZyYWdtZW50IHRvIHRlbXBvcmFyaWx5IGhvbGQgdGhlIHNjcm9sbGFibGUgY29udGVudFxyXG5cdFx0XHRvZmZzY3JlZW5GcmFnbWVudCA9IF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5vd25lckRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcclxuXHRcdFx0b2Zmc2NyZWVuTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0RJVicpO1xyXG5cdFx0XHRvZmZzY3JlZW5GcmFnbWVudC5hcHBlbmRDaGlsZChvZmZzY3JlZW5Ob2RlKTtcclxuXHJcblx0XHRcdC8vIERyb3AgaW4gdGhlIHdyYXBwaW5nIEhUTUxcclxuXHRcdFx0b2Zmc2NyZWVuTm9kZS5pbm5lckhUTUwgPSBGVFNjcm9sbGVyLnByb3RvdHlwZS5nZXRQcmVwZW5kZWRIVE1MKCFfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1gsICFfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1ksIF9pbnN0YW5jZU9wdGlvbnMuaHdBY2NlbGVyYXRpb25DbGFzcykgKyBGVFNjcm9sbGVyLnByb3RvdHlwZS5nZXRBcHBlbmRlZEhUTUwoIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCwgIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSwgX2luc3RhbmNlT3B0aW9ucy5od0FjY2VsZXJhdGlvbkNsYXNzLCBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHJlZmVyZW5jZXMgYXMgYXBwcm9wcmlhdGVcclxuXHRcdFx0X2NvbnRhaW5lck5vZGUgPSBvZmZzY3JlZW5Ob2RlLmZpcnN0RWxlbWVudENoaWxkO1xyXG5cdFx0XHRzY3JvbGxZUGFyZW50ID0gX2NvbnRhaW5lck5vZGU7XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1gpIHtcclxuXHRcdFx0XHRfc2Nyb2xsTm9kZXMueCA9IF9jb250YWluZXJOb2RlLmZpcnN0RWxlbWVudENoaWxkO1xyXG5cdFx0XHRcdHNjcm9sbFlQYXJlbnQgPSBfc2Nyb2xsTm9kZXMueDtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXMueCA9IF9jb250YWluZXJOb2RlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2Z0c2Nyb2xsZXJfc2Nyb2xsYmFyeCcpWzBdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XHJcblx0XHRcdFx0X3Njcm9sbE5vZGVzLnkgPSBzY3JvbGxZUGFyZW50LmZpcnN0RWxlbWVudENoaWxkO1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy55ID0gX2NvbnRhaW5lck5vZGUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZnRzY3JvbGxlcl9zY3JvbGxiYXJ5JylbMF07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IF9zY3JvbGxOb2Rlcy55O1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IF9zY3JvbGxOb2Rlcy54O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUYWtlIHRoZSBjb250ZW50cyBvZiB0aGUgc2Nyb2xsYWJsZSBlbGVtZW50LCBhbmQgY29weSB0aGVtIGludG8gdGhlIG5ldyBjb250YWluZXJcclxuXHRcdFx0d2hpbGUgKF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5maXJzdENoaWxkKSB7XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLmFwcGVuZENoaWxkKF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5maXJzdENoaWxkKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTW92ZSB0aGUgd3JhcHBlZCBlbGVtZW50cyBiYWNrIGludG8gdGhlIGRvY3VtZW50XHJcblx0XHRcdF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5hcHBlbmRDaGlsZChfY29udGFpbmVyTm9kZSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQXR0ZW1wdHMgdG8gdXNlIGFueSBleGlzdGluZyBET00gc2Nyb2xsZXIgbm9kZXMgaWYgcG9zc2libGUsIHJldHVybmluZyB0cnVlIGlmIHNvO1xyXG5cdFx0ICogdXBkYXRlcyBhbGwgaW50ZXJuYWwgZWxlbWVudCByZWZlcmVuY2VzLlxyXG5cdFx0ICovXHJcblx0XHRfZXhpc3RpbmdET01WYWxpZCA9IGZ1bmN0aW9uIF9leGlzdGluZ0RPTVZhbGlkKCkge1xyXG5cdFx0XHR2YXIgc2Nyb2xsZXJDb250YWluZXIsIGxheWVyWCwgbGF5ZXJZLCB5UGFyZW50LCBzY3JvbGxlclgsIHNjcm9sbGVyWSwgY2FuZGlkYXRlcywgaSwgbDtcclxuXHJcblx0XHRcdC8vIENoZWNrIHRoYXQgdGhlcmUncyBhbiBpbml0aWFsIGNoaWxkIG5vZGUsIGFuZCBtYWtlIHN1cmUgaXQncyB0aGUgY29udGFpbmVyIGNsYXNzXHJcblx0XHRcdHNjcm9sbGVyQ29udGFpbmVyID0gX3Njcm9sbGFibGVNYXN0ZXJOb2RlLmZpcnN0RWxlbWVudENoaWxkO1xyXG5cdFx0XHRpZiAoIXNjcm9sbGVyQ29udGFpbmVyIHx8IHNjcm9sbGVyQ29udGFpbmVyLmNsYXNzTmFtZS5pbmRleE9mKCdmdHNjcm9sbGVyX2NvbnRhaW5lcicpID09PSAtMSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgeC1heGlzIHNjcm9sbGluZyBpcyBlbmFibGVkLCBmaW5kIGFuZCB2ZXJpZnkgdGhlIHggc2Nyb2xsZXIgbGF5ZXJcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCkge1xyXG5cclxuXHRcdFx0XHQvLyBGaW5kIGFuZCB2ZXJpZnkgdGhlIHggc2Nyb2xsZXIgbGF5ZXJcclxuXHRcdFx0XHRsYXllclggPSBzY3JvbGxlckNvbnRhaW5lci5maXJzdEVsZW1lbnRDaGlsZDtcclxuXHRcdFx0XHRpZiAoIWxheWVyWCB8fCBsYXllclguY2xhc3NOYW1lLmluZGV4T2YoJ2Z0c2Nyb2xsZXJfeCcpID09PSAtMSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR5UGFyZW50ID0gbGF5ZXJYO1xyXG5cclxuXHRcdFx0XHQvLyBGaW5kIGFuZCB2ZXJpZnkgdGhlIHggc2Nyb2xsYmFyIGlmIGVuYWJsZWRcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0XHRjYW5kaWRhdGVzID0gc2Nyb2xsZXJDb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZnRzY3JvbGxlcl9zY3JvbGxiYXJ4Jyk7XHJcblx0XHRcdFx0XHRpZiAoY2FuZGlkYXRlcykge1xyXG5cdFx0XHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gY2FuZGlkYXRlcy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoY2FuZGlkYXRlc1tpXS5wYXJlbnROb2RlID09PSBzY3JvbGxlckNvbnRhaW5lcikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2Nyb2xsZXJYID0gY2FuZGlkYXRlc1tpXTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYgKCFzY3JvbGxlclgpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR5UGFyZW50ID0gc2Nyb2xsZXJDb250YWluZXI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHktYXhpcyBzY3JvbGxpbmcgaXMgZW5hYmxlZCwgZmluZCBhbmQgdmVyaWZ5IHRoZSB5IHNjcm9sbGVyIGxheWVyXHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kpIHtcclxuXHJcblx0XHRcdFx0Ly8gRmluZCBhbmQgdmVyaWZ5IHRoZSB4IHNjcm9sbGVyIGxheWVyXHJcblx0XHRcdFx0bGF5ZXJZID0geVBhcmVudC5maXJzdEVsZW1lbnRDaGlsZDtcclxuXHRcdFx0XHRpZiAoIWxheWVyWSB8fCBsYXllclkuY2xhc3NOYW1lLmluZGV4T2YoJ2Z0c2Nyb2xsZXJfeScpID09PSAtMSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gRmluZCBhbmQgdmVyaWZ5IHRoZSB5IHNjcm9sbGJhciBpZiBlbmFibGVkXHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdFx0Y2FuZGlkYXRlcyA9IHNjcm9sbGVyQ29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2Z0c2Nyb2xsZXJfc2Nyb2xsYmFyeScpO1xyXG5cdFx0XHRcdFx0aWYgKGNhbmRpZGF0ZXMpIHtcclxuXHRcdFx0XHRcdFx0Zm9yIChpID0gMCwgbCA9IGNhbmRpZGF0ZXMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGNhbmRpZGF0ZXNbaV0ucGFyZW50Tm9kZSA9PT0gc2Nyb2xsZXJDb250YWluZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNjcm9sbGVyWSA9IGNhbmRpZGF0ZXNbaV07XHJcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICghc2Nyb2xsZXJZKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEVsZW1lbnRzIGZvdW5kIGFuZCB2ZXJpZmllZCAtIHVwZGF0ZSB0aGUgcmVmZXJlbmNlcyBhbmQgcmV0dXJuIHN1Y2Nlc3NcclxuXHRcdFx0X2NvbnRhaW5lck5vZGUgPSBzY3JvbGxlckNvbnRhaW5lcjtcclxuXHRcdFx0aWYgKGxheWVyWCkge1xyXG5cdFx0XHRcdF9zY3JvbGxOb2Rlcy54ID0gbGF5ZXJYO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChsYXllclkpIHtcclxuXHRcdFx0XHRfc2Nyb2xsTm9kZXMueSA9IGxheWVyWTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoc2Nyb2xsZXJYKSB7XHJcblx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnggPSBzY3JvbGxlclg7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHNjcm9sbGVyWSkge1xyXG5cdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy55ID0gc2Nyb2xsZXJZO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kpIHtcclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUgPSBsYXllclk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlID0gbGF5ZXJYO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHRfZG9tQ2hhbmdlZCA9IGZ1bmN0aW9uIF9kb21DaGFuZ2VkKGUpIHtcclxuXHJcblx0XHRcdC8vIElmIHRoZSB0aW1lciBpcyBhY3RpdmUsIGNsZWFyIGl0XHJcblx0XHRcdGlmIChfZG9tQ2hhbmdlRGVib3VuY2VyKSB7XHJcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChfZG9tQ2hhbmdlRGVib3VuY2VyKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVhY3QgdG8gcmVzaXplcyBhdCBvbmNlXHJcblx0XHRcdGlmIChlICYmIGUudHlwZSA9PT0gJ3Jlc2l6ZScpIHtcclxuXHRcdFx0XHRfdXBkYXRlRGltZW5zaW9ucygpO1xyXG5cclxuXHRcdFx0Ly8gRm9yIG90aGVyIGNoYW5nZXMsIHdoaWNoIG1heSBvY2N1ciBpbiBncm91cHMsIHNldCB1cCB0aGUgRE9NIGNoYW5nZWQgdGltZXJcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRfZG9tQ2hhbmdlRGVib3VuY2VyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHRfdXBkYXRlRGltZW5zaW9ucygpO1xyXG5cdFx0XHRcdH0sIDEwMCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0X3VwZGF0ZURpbWVuc2lvbnMgPSBmdW5jdGlvbiBfdXBkYXRlRGltZW5zaW9ucyhpZ25vcmVTbmFwU2Nyb2xsKSB7XHJcblx0XHRcdHZhciBheGlzO1xyXG5cclxuXHRcdFx0Ly8gT25seSB1cGRhdGUgZGltZW5zaW9ucyBpZiB0aGUgY29udGFpbmVyIG5vZGUgZXhpc3RzIChET00gZWxlbWVudHMgY2FuIGdvIGF3YXkgaWZcclxuXHRcdFx0Ly8gdGhlIHNjcm9sbGVyIGluc3RhbmNlIGlzIG5vdCBkZXN0cm95ZWQgY29ycmVjdGx5KVxyXG5cdFx0XHRpZiAoIV9jb250YWluZXJOb2RlIHx8ICFfY29udGVudFBhcmVudE5vZGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChfZG9tQ2hhbmdlRGVib3VuY2VyKSB7XHJcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChfZG9tQ2hhbmdlRGVib3VuY2VyKTtcclxuXHRcdFx0XHRfZG9tQ2hhbmdlRGVib3VuY2VyID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIGNvbnRhaW5lcldpZHRoLCBjb250YWluZXJIZWlnaHQsIHN0YXJ0QWxpZ25tZW50cztcclxuXHJcblx0XHRcdC8vIElmIGEgbWFudWFsIHNjcm9sbCBpcyBpbiBwcm9ncmVzcywgY2FuY2VsIGl0XHJcblx0XHRcdF9lbmRTY3JvbGwoRGF0ZS5ub3coKSk7XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGUgdGhlIHN0YXJ0aW5nIGFsaWdubWVudCBmb3IgY29tcGFyaXNvbiBsYXRlclxyXG5cdFx0XHRzdGFydEFsaWdubWVudHMgPSB7IHg6IGZhbHNlLCB5OiBmYWxzZSB9O1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gc3RhcnRBbGlnbm1lbnRzKSB7XHJcblx0XHRcdFx0aWYgKHN0YXJ0QWxpZ25tZW50cy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0aWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPT09IDApIHtcclxuXHRcdFx0XHRcdFx0c3RhcnRBbGlnbm1lbnRzW2F4aXNdID0gLTE7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPD0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0QWxpZ25tZW50c1theGlzXSA9IDE7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKiAyIDw9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSArIDUgJiYgX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAqIDIgPj0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdIC0gNSkge1xyXG5cdFx0XHRcdFx0XHRzdGFydEFsaWdubWVudHNbYXhpc10gPSAwO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29udGFpbmVyV2lkdGggPSBfY29udGFpbmVyTm9kZS5vZmZzZXRXaWR0aDtcclxuXHRcdFx0Y29udGFpbmVySGVpZ2h0ID0gX2NvbnRhaW5lck5vZGUub2Zmc2V0SGVpZ2h0O1xyXG5cclxuXHRcdFx0Ly8gR3JhYiB0aGUgZGltZW5zaW9uc1xyXG5cdFx0XHR2YXIgcmF3U2Nyb2xsV2lkdGggPSBvcHRpb25zLmNvbnRlbnRXaWR0aCB8fCBfY29udGVudFBhcmVudE5vZGUub2Zmc2V0V2lkdGg7XHJcblx0XHRcdHZhciByYXdTY3JvbGxIZWlnaHQgPSBvcHRpb25zLmNvbnRlbnRIZWlnaHQgfHwgX2NvbnRlbnRQYXJlbnROb2RlLm9mZnNldEhlaWdodDtcclxuXHRcdFx0dmFyIHNjcm9sbFdpZHRoID0gcmF3U2Nyb2xsV2lkdGg7XHJcblx0XHRcdHZhciBzY3JvbGxIZWlnaHQgPSByYXdTY3JvbGxIZWlnaHQ7XHJcblx0XHRcdHZhciB0YXJnZXRQb3NpdGlvbiA9IHsgeDogZmFsc2UsIHk6IGZhbHNlIH07XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgc25hcCBncmlkXHJcblx0XHRcdGlmICghX3NuYXBHcmlkU2l6ZS51c2VyWCkge1xyXG5cdFx0XHRcdF9zbmFwR3JpZFNpemUueCA9IGNvbnRhaW5lcldpZHRoO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICghX3NuYXBHcmlkU2l6ZS51c2VyWSkge1xyXG5cdFx0XHRcdF9zbmFwR3JpZFNpemUueSA9IGNvbnRhaW5lckhlaWdodDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgdGhlcmUgaXMgYSBncmlkLCBjb25mb3JtIHRvIHRoZSBncmlkXHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XHJcblx0XHRcdFx0aWYgKF9zbmFwR3JpZFNpemUudXNlclgpIHtcclxuXHRcdFx0XHRcdHNjcm9sbFdpZHRoID0gTWF0aC5jZWlsKHNjcm9sbFdpZHRoIC8gX3NuYXBHcmlkU2l6ZS51c2VyWCkgKiBfc25hcEdyaWRTaXplLnVzZXJYO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzY3JvbGxXaWR0aCA9IE1hdGguY2VpbChzY3JvbGxXaWR0aCAvIF9zbmFwR3JpZFNpemUueCkgKiBfc25hcEdyaWRTaXplLng7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChfc25hcEdyaWRTaXplLnVzZXJZKSB7XHJcblx0XHRcdFx0XHRzY3JvbGxIZWlnaHQgPSBNYXRoLmNlaWwoc2Nyb2xsSGVpZ2h0IC8gX3NuYXBHcmlkU2l6ZS51c2VyWSkgKiBfc25hcEdyaWRTaXplLnVzZXJZO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzY3JvbGxIZWlnaHQgPSBNYXRoLmNlaWwoc2Nyb2xsSGVpZ2h0IC8gX3NuYXBHcmlkU2l6ZS55KSAqIF9zbmFwR3JpZFNpemUueTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIG5vIGRldGFpbHMgaGF2ZSBjaGFuZ2VkLCByZXR1cm4uXHJcblx0XHRcdGlmIChfbWV0cmljcy5jb250YWluZXIueCA9PT0gY29udGFpbmVyV2lkdGggJiYgX21ldHJpY3MuY29udGFpbmVyLnkgPT09IGNvbnRhaW5lckhlaWdodCAmJiBfbWV0cmljcy5jb250ZW50LnggPT09IHNjcm9sbFdpZHRoICYmIF9tZXRyaWNzLmNvbnRlbnQueSA9PT0gc2Nyb2xsSGVpZ2h0KSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHNpemVzXHJcblx0XHRcdF9tZXRyaWNzLmNvbnRhaW5lci54ID0gY29udGFpbmVyV2lkdGg7XHJcblx0XHRcdF9tZXRyaWNzLmNvbnRhaW5lci55ID0gY29udGFpbmVySGVpZ2h0O1xyXG5cdFx0XHRfbWV0cmljcy5jb250ZW50LnggPSBzY3JvbGxXaWR0aDtcclxuXHRcdFx0X21ldHJpY3MuY29udGVudC5yYXdYID0gcmF3U2Nyb2xsV2lkdGg7XHJcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQueSA9IHNjcm9sbEhlaWdodDtcclxuXHRcdFx0X21ldHJpY3MuY29udGVudC5yYXdZID0gcmF3U2Nyb2xsSGVpZ2h0O1xyXG5cdFx0XHRfbWV0cmljcy5zY3JvbGxFbmQueCA9IGNvbnRhaW5lcldpZHRoIC0gc2Nyb2xsV2lkdGg7XHJcblx0XHRcdF9tZXRyaWNzLnNjcm9sbEVuZC55ID0gY29udGFpbmVySGVpZ2h0IC0gc2Nyb2xsSGVpZ2h0O1xyXG5cclxuXHRcdFx0X3VwZGF0ZVNjcm9sbGJhckRpbWVuc2lvbnMoKTtcclxuXHJcblx0XHRcdGlmICghaWdub3JlU25hcFNjcm9sbCAmJiBfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XHJcblxyXG5cdFx0ICAgICAgICAvLyBFbnN1cmUgYm91bmRzIGFyZSBjb3JyZWN0XHJcblx0XHRcdFx0X3VwZGF0ZVNlZ21lbnRzKCk7XHJcblx0XHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBfZ2V0U25hcFBvc2l0aW9uRm9ySW5kZXhlcyhfc25hcEluZGV4LCBfbGFzdFNjcm9sbFBvc2l0aW9uKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQXBwbHkgYmFzZSBhbGlnbm1lbnQgaWYgYXBwcm9wcmlhdGVcclxuXHRcdFx0Zm9yIChheGlzIGluIHRhcmdldFBvc2l0aW9uKSB7XHJcblx0XHRcdFx0aWYgKHRhcmdldFBvc2l0aW9uLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGNvbnRhaW5lciBpcyBzbWFsbGVyIHRoYW4gdGhlIGNvbnRlbnQsIGRldGVybWluZSB3aGV0aGVyIHRvIGFwcGx5IHRoZVxyXG5cdFx0XHRcdFx0Ly8gYWxpZ25tZW50LiAgVGhpcyBvY2N1cnMgaWYgYSBzY3JvbGwgaGFzIG5ldmVyIHRha2VuIHBsYWNlLCBvciBpZiB0aGUgcG9zaXRpb25cclxuXHRcdFx0XHRcdC8vIHdhcyBwcmV2aW91c2x5IGF0IHRoZSBjb3JyZWN0IFwiZW5kXCIgYW5kIGNhbiBiZSBtYWludGFpbmVkLlxyXG5cdFx0XHRcdFx0aWYgKF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSA8IF9tZXRyaWNzLmNvbnRlbnRbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0aWYgKF9oYXNCZWVuU2Nyb2xsZWQgJiYgX2luc3RhbmNlT3B0aW9ucy5iYXNlQWxpZ25tZW50c1theGlzXSAhPT0gc3RhcnRBbGlnbm1lbnRzW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBBcHBseSB0aGUgYWxpZ25tZW50XHJcblx0XHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5iYXNlQWxpZ25tZW50c1theGlzXSA9PT0gMSkge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXRQb3NpdGlvbltheGlzXSA9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy5iYXNlQWxpZ25tZW50c1theGlzXSA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXRQb3NpdGlvbltheGlzXSA9IE1hdGguZmxvb3IoX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdIC8gMik7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9pbnN0YW5jZU9wdGlvbnMuYmFzZUFsaWdubWVudHNbYXhpc10gPT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uW2F4aXNdID0gMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCAmJiB0YXJnZXRQb3NpdGlvbi54ICE9PSBmYWxzZSkge1xyXG5cdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oJ3gnLCB0YXJnZXRQb3NpdGlvbi54LCAwKTtcclxuXHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uLnggPSB0YXJnZXRQb3NpdGlvbi54O1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kgJiYgdGFyZ2V0UG9zaXRpb24ueSAhPT0gZmFsc2UpIHtcclxuXHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKCd5JywgdGFyZ2V0UG9zaXRpb24ueSwgMCk7XHJcblx0XHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbi55ID0gdGFyZ2V0UG9zaXRpb24ueTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdH07XHJcblxyXG5cdFx0X3VwZGF0ZVNjcm9sbGJhckRpbWVuc2lvbnMgPSBmdW5jdGlvbiBfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpIHtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBzY3JvbGxiYXIgc2l6ZXNcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1gpIHtcclxuXHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy54LnN0eWxlLndpZHRoID0gTWF0aC5tYXgoNiwgTWF0aC5yb3VuZChfbWV0cmljcy5jb250YWluZXIueCAqIChfbWV0cmljcy5jb250YWluZXIueCAvIF9tZXRyaWNzLmNvbnRlbnQueCkgLSA0KSkgKyAncHgnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XHJcblx0XHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXMueS5zdHlsZS5oZWlnaHQgPSBNYXRoLm1heCg2LCBNYXRoLnJvdW5kKF9tZXRyaWNzLmNvbnRhaW5lci55ICogKF9tZXRyaWNzLmNvbnRhaW5lci55IC8gX21ldHJpY3MuY29udGVudC55KSAtIDQpKSArICdweCc7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgc2Nyb2xsIGNhY2hlc1xyXG5cdFx0XHRfc2Nyb2xsYWJsZUF4ZXMgPSB7fTtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCAmJiAoX21ldHJpY3MuY29udGVudC54ID4gX21ldHJpY3MuY29udGFpbmVyLnggfHwgX2luc3RhbmNlT3B0aW9ucy5hbHdheXNTY3JvbGwpKSB7XHJcblx0XHRcdFx0X3Njcm9sbGFibGVBeGVzLnggPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kgJiYgKF9tZXRyaWNzLmNvbnRlbnQueSA+IF9tZXRyaWNzLmNvbnRhaW5lci55IHx8IF9pbnN0YW5jZU9wdGlvbnMuYWx3YXlzU2Nyb2xsKSkge1xyXG5cdFx0XHRcdF9zY3JvbGxhYmxlQXhlcy55ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRfdXBkYXRlRWxlbWVudFBvc2l0aW9uID0gZnVuY3Rpb24gX3VwZGF0ZUVsZW1lbnRQb3NpdGlvbigpIHtcclxuXHRcdFx0dmFyIGF4aXMsIGNvbXB1dGVkU3R5bGUsIHNwbGl0U3R5bGU7XHJcblxyXG5cdFx0XHQvLyBSZXRyaWV2ZSB0aGUgY3VycmVudCBwb3NpdGlvbiBvZiBlYWNoIGFjdGl2ZSBheGlzLlxyXG5cdFx0XHQvLyBDdXN0b20gcGFyc2luZyBpcyB1c2VkIGluc3RlYWQgb2YgbmF0aXZlIG1hdHJpeCBzdXBwb3J0IGZvciBzcGVlZCBhbmQgZm9yXHJcblx0XHRcdC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0Y29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKF9zY3JvbGxOb2Rlc1theGlzXSwgbnVsbClbX3ZlbmRvclRyYW5zZm9ybUxvb2t1cF07XHJcblx0XHRcdFx0XHRzcGxpdFN0eWxlID0gY29tcHV0ZWRTdHlsZS5zcGxpdCgnLCAnKTtcclxuXHJcblx0XHRcdFx0XHQvLyBGb3IgMmQtc3R5bGUgdHJhbnNmb3JtcywgcHVsbCBvdXQgZWxlbWVudHMgZm91ciBvciBmaXZlXHJcblx0XHRcdFx0XHRpZiAoc3BsaXRTdHlsZS5sZW5ndGggPT09IDYpIHtcclxuXHRcdFx0XHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXSA9IHBhcnNlSW50KHNwbGl0U3R5bGVbKGF4aXMgPT09ICd5JykgPyA1IDogNF0sIDEwKTtcclxuXHJcblx0XHRcdFx0XHQvLyBGb3IgM2Qtc3R5bGUgdHJhbnNmb3JtcywgcHVsbCBvdXQgZWxlbWVudHMgdHdlbHZlIG9yIHRoaXJ0ZWVuXHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdID0gcGFyc2VJbnQoc3BsaXRTdHlsZVsoYXhpcyA9PT0gJ3knKSA/IDEzIDogMTJdLCAxMCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdID0gX2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0X3VwZGF0ZVNlZ21lbnRzID0gZnVuY3Rpb24gX3VwZGF0ZVNlZ21lbnRzKHNjcm9sbEZpbmFsaXNlZCkge1xyXG5cdFx0XHR2YXIgYXhpcztcclxuXHRcdFx0dmFyIG5ld1NlZ21lbnQgPSB7IHg6IDAsIHk6IDAgfTtcclxuXHJcblx0XHRcdC8vIElmIHNuYXBwaW5nIGlzIGRpc2FibGVkLCByZXR1cm4gd2l0aG91dCBhbnkgZnVydGhlciBhY3Rpb24gcmVxdWlyZWRcclxuXHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDYWxjdWxhdGUgdGhlIG5ldyBzZWdtZW50c1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0bmV3U2VnbWVudFtheGlzXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKE1hdGguY2VpbChfbWV0cmljcy5jb250ZW50W2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkgLSAxLCBNYXRoLnJvdW5kKC1fbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEluIGFsbCBjYXNlcyB1cGRhdGUgdGhlIGFjdGl2ZSBzZWdtZW50IGlmIGFwcHJvcHJpYXRlXHJcblx0XHRcdGlmIChuZXdTZWdtZW50LnggIT09IF9hY3RpdmVTZWdtZW50LnggfHwgbmV3U2VnbWVudC55ICE9PSBfYWN0aXZlU2VnbWVudC55KSB7XHJcblx0XHRcdFx0X2FjdGl2ZVNlZ21lbnQueCA9IG5ld1NlZ21lbnQueDtcclxuXHRcdFx0XHRfYWN0aXZlU2VnbWVudC55ID0gbmV3U2VnbWVudC55O1xyXG5cdFx0XHRcdF9maXJlRXZlbnQoJ3NlZ21lbnR3aWxsY2hhbmdlJywgeyBzZWdtZW50WDogbmV3U2VnbWVudC54LCBzZWdtZW50WTogbmV3U2VnbWVudC55IH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB0aGUgc2Nyb2xsIGhhcyBiZWVuIGZpbmFsaXNlZCwgYWxzbyB1cGRhdGUgdGhlIGJhc2Ugc2VnbWVudFxyXG5cdFx0XHRpZiAoc2Nyb2xsRmluYWxpc2VkKSB7XHJcblx0XHRcdFx0aWYgKG5ld1NlZ21lbnQueCAhPT0gX2Jhc2VTZWdtZW50LnggfHwgbmV3U2VnbWVudC55ICE9PSBfYmFzZVNlZ21lbnQueSkge1xyXG5cdFx0XHRcdFx0X2Jhc2VTZWdtZW50LnggPSBuZXdTZWdtZW50Lng7XHJcblx0XHRcdFx0XHRfYmFzZVNlZ21lbnQueSA9IG5ld1NlZ21lbnQueTtcclxuXHRcdFx0XHRcdF9maXJlRXZlbnQoJ3NlZ21lbnRkaWRjaGFuZ2UnLCB7IHNlZ21lbnRYOiBuZXdTZWdtZW50LngsIHNlZ21lbnRZOiBuZXdTZWdtZW50LnkgfSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdF9zZXRBeGlzUG9zaXRpb24gPSBmdW5jdGlvbiBfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIHBvc2l0aW9uLCBhbmltYXRpb25EdXJhdGlvbiwgYW5pbWF0aW9uQmV6aWVyLCBib3VuZHNDcm9zc0RlbGF5KSB7XHJcblx0XHRcdHZhciB0cmFuc2l0aW9uQ1NTU3RyaW5nLCBuZXdQb3NpdGlvbkF0RXh0cmVtaXR5ID0gbnVsbDtcclxuXHJcblx0XHRcdC8vIE9ubHkgdXBkYXRlIHBvc2l0aW9uIGlmIHRoZSBheGlzIG5vZGUgZXhpc3RzIChET00gZWxlbWVudHMgY2FuIGdvIGF3YXkgaWZcclxuXHRcdFx0Ly8gdGhlIHNjcm9sbGVyIGluc3RhbmNlIGlzIG5vdCBkZXN0cm95ZWQgY29ycmVjdGx5KVxyXG5cdFx0XHRpZiAoIV9zY3JvbGxOb2Rlc1theGlzXSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHRoZSB0cmFuc2l0aW9uIHByb3BlcnR5IHRvIGFwcGx5IHRvIGJvdGggdGhlIHNjcm9sbCBlbGVtZW50IGFuZCB0aGUgc2Nyb2xsYmFyXHJcblx0XHRcdGlmIChhbmltYXRpb25EdXJhdGlvbikge1xyXG5cdFx0XHRcdGlmICghYW5pbWF0aW9uQmV6aWVyKSB7XHJcblx0XHRcdFx0XHRhbmltYXRpb25CZXppZXIgPSBfaW5zdGFuY2VPcHRpb25zLmZsaW5nQmV6aWVyO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dHJhbnNpdGlvbkNTU1N0cmluZyA9IF92ZW5kb3JDU1NQcmVmaXggKyAndHJhbnNmb3JtICcgKyBhbmltYXRpb25EdXJhdGlvbiArICdtcyAnICsgYW5pbWF0aW9uQmV6aWVyLnRvU3RyaW5nKCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dHJhbnNpdGlvbkNTU1N0cmluZyA9ICcnO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBcHBseSB0aGUgdHJhbnNpdGlvbiBwcm9wZXJ0eSB0byBlbGVtZW50c1xyXG5cdFx0XHRfc2Nyb2xsTm9kZXNbYXhpc10uc3R5bGVbX3RyYW5zaXRpb25Qcm9wZXJ0eV0gPSB0cmFuc2l0aW9uQ1NTU3RyaW5nO1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gdHJhbnNpdGlvbkNTU1N0cmluZztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBwb3NpdGlvbnNcclxuXHRcdFx0X3Njcm9sbE5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2Zvcm1Qcm9wZXJ0eV0gPSBfdHJhbnNsYXRlUnVsZVByZWZpeCArIF90cmFuc2Zvcm1QcmVmaXhlc1theGlzXSArIHBvc2l0aW9uICsgJ3B4JyArIF90cmFuc2Zvcm1TdWZmaXhlc1theGlzXTtcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdF9zY3JvbGxiYXJOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNmb3JtUHJvcGVydHldID0gX3RyYW5zbGF0ZVJ1bGVQcmVmaXggKyBfdHJhbnNmb3JtUHJlZml4ZXNbYXhpc10gKyAoLXBvc2l0aW9uICogX21ldHJpY3MuY29udGFpbmVyW2F4aXNdIC8gX21ldHJpY3MuY29udGVudFtheGlzXSkgKyAncHgnICsgX3RyYW5zZm9ybVN1ZmZpeGVzW2F4aXNdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBEZXRlcm1pbmUgd2hldGhlciB0aGUgc2Nyb2xsIGlzIGF0IGFuIGV4dHJlbWl0eS5cclxuXHRcdFx0aWYgKHBvc2l0aW9uID49IDApIHtcclxuXHRcdFx0XHRuZXdQb3NpdGlvbkF0RXh0cmVtaXR5ID0gJ3N0YXJ0JztcclxuXHRcdFx0fSBlbHNlIGlmIChwb3NpdGlvbiA8PSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcclxuXHRcdFx0XHRuZXdQb3NpdGlvbkF0RXh0cmVtaXR5ID0gJ2VuZCc7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHRoZSBleHRyZW1pdHkgc3RhdHVzIGhhcyBjaGFuZ2VkLCBmaXJlIGFuIGFwcHJvcHJpYXRlIGV2ZW50XHJcblx0XHRcdGlmIChuZXdQb3NpdGlvbkF0RXh0cmVtaXR5ICE9PSBfc2Nyb2xsQXRFeHRyZW1pdHlbYXhpc10pIHtcclxuXHRcdFx0XHRpZiAobmV3UG9zaXRpb25BdEV4dHJlbWl0eSAhPT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0aWYgKGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcblx0XHRcdFx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRcdFx0X2ZpcmVFdmVudCgncmVhY2hlZCcgKyBuZXdQb3NpdGlvbkF0RXh0cmVtaXR5LCB7IGF4aXM6IGF4aXMgfSk7XHJcblx0XHRcdFx0XHRcdH0sIGJvdW5kc0Nyb3NzRGVsYXkgfHwgYW5pbWF0aW9uRHVyYXRpb24pKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdF9maXJlRXZlbnQoJ3JlYWNoZWQnICsgbmV3UG9zaXRpb25BdEV4dHJlbWl0eSwgeyBheGlzOiBheGlzIH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRfc2Nyb2xsQXRFeHRyZW1pdHlbYXhpc10gPSBuZXdQb3NpdGlvbkF0RXh0cmVtaXR5O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHJlY29yZGVkIHBvc2l0aW9uIGlmIHRoZXJlJ3Mgbm8gZHVyYXRpb25cclxuXHRcdFx0aWYgKCFhbmltYXRpb25EdXJhdGlvbikge1xyXG5cdFx0XHRcdF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPSBwb3NpdGlvbjtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFJldHJpZXZlIHRoZSBjdXJyZW50IHBvc2l0aW9uIGFzIGFuIG9iamVjdCB3aXRoIHNjcm9sbExlZnQgYW5kIHNjcm9sbFRvcFxyXG5cdFx0ICogcHJvcGVydGllcy5cclxuXHRcdCAqL1xyXG5cdFx0X2dldFBvc2l0aW9uID0gZnVuY3Rpb24gX2dldFBvc2l0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHNjcm9sbExlZnQ6IC1fbGFzdFNjcm9sbFBvc2l0aW9uLngsXHJcblx0XHRcdFx0c2Nyb2xsVG9wOiAtX2xhc3RTY3JvbGxQb3NpdGlvbi55XHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdF9zY2hlZHVsZUF4aXNQb3NpdGlvbiA9IGZ1bmN0aW9uIF9zY2hlZHVsZUF4aXNQb3NpdGlvbihheGlzLCBwb3NpdGlvbiwgYW5pbWF0aW9uRHVyYXRpb24sIGFuaW1hdGlvbkJlemllciwgYWZ0ZXJEZWxheSkge1xyXG5cdFx0XHRfdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIHBvc2l0aW9uLCBhbmltYXRpb25EdXJhdGlvbiwgYW5pbWF0aW9uQmV6aWVyKTtcclxuXHRcdFx0fSwgYWZ0ZXJEZWxheSkpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRfZmlyZUV2ZW50ID0gZnVuY3Rpb24gX2ZpcmVFdmVudChldmVudE5hbWUsIGV2ZW50T2JqZWN0KSB7XHJcblx0XHRcdHZhciBpLCBsO1xyXG5cdFx0XHRldmVudE9iamVjdC5zcmNPYmplY3QgPSBfcHVibGljU2VsZjtcclxuXHJcblx0XHRcdC8vIEl0ZXJhdGUgdGhyb3VnaCBhbnkgbGlzdGVuZXJzXHJcblx0XHRcdGZvciAoaSA9IDAsIGwgPSBfZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXS5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHJcblx0XHRcdFx0Ly8gRXhlY3V0ZSBlYWNoIGluIGEgdHJ5L2NhdGNoXHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdF9ldmVudExpc3RlbmVyc1tldmVudE5hbWVdW2ldKGV2ZW50T2JqZWN0KTtcclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0aWYgKHdpbmRvdy5jb25zb2xlICYmIHdpbmRvdy5jb25zb2xlLmVycm9yKSB7XHJcblx0XHRcdFx0XHRcdHdpbmRvdy5jb25zb2xlLmVycm9yKGVycm9yLm1lc3NhZ2UgKyAnICgnICsgZXJyb3Iuc291cmNlVVJMICsgJywgbGluZSAnICsgZXJyb3IubGluZSArICcpJyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogVXBkYXRlIHRoZSBzY3JvbGwgcG9zaXRpb24gc28gdGhhdCB0aGUgY2hpbGQgZWxlbWVudCBpcyBpbiB2aWV3LlxyXG5cdFx0ICovXHJcblx0XHRfY2hpbGRGb2N1c2VkID0gZnVuY3Rpb24gX2NoaWxkRm9jdXNlZChldmVudCkge1xyXG5cdFx0XHR2YXIgb2Zmc2V0LCBheGlzLCB2aXNpYmxlQ2hpbGRQb3J0aW9uO1xyXG5cdFx0XHR2YXIgZm9jdXNlZE5vZGVSZWN0ID0gX2dldEJvdW5kaW5nUmVjdChldmVudC50YXJnZXQpO1xyXG5cdFx0XHR2YXIgY29udGFpbmVyUmVjdCA9IF9nZXRCb3VuZGluZ1JlY3QoX2NvbnRhaW5lck5vZGUpO1xyXG5cdFx0XHR2YXIgZWRnZU1hcCA9IHsgeDogJ2xlZnQnLCB5OiAndG9wJyB9O1xyXG5cdFx0XHR2YXIgb3BFZGdlTWFwID0geyB4OiAncmlnaHQnLCB5OiAnYm90dG9tJyB9O1xyXG5cdFx0XHR2YXIgZGltZW5zaW9uTWFwID0geyB4OiAnd2lkdGgnLCB5OiAnaGVpZ2h0JyB9O1xyXG5cclxuXHRcdFx0Ly8gSWYgYW4gaW5wdXQgaXMgY3VycmVudGx5IGJlaW5nIHRyYWNrZWQsIGlnbm9yZSB0aGUgZm9jdXMgZXZlbnRcclxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09IGZhbHNlKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIHRoZSBmb2N1c3NlZCBub2RlIGlzIGVudGlyZWx5IGluIHZpZXcsIHRoZXJlIGlzIG5vIG5lZWQgdG8gY2VudGVyIGl0XHJcblx0XHRcdFx0XHRpZiAoZm9jdXNlZE5vZGVSZWN0W2VkZ2VNYXBbYXhpc11dID49IGNvbnRhaW5lclJlY3RbZWRnZU1hcFtheGlzXV0gJiYgZm9jdXNlZE5vZGVSZWN0W29wRWRnZU1hcFtheGlzXV0gPD0gY29udGFpbmVyUmVjdFtvcEVkZ2VNYXBbYXhpc11dKSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIElmIHRoZSBmb2N1c3NlZCBub2RlIGlzIGxhcmdlciB0aGFuIHRoZSBjb250YWluZXIuLi5cclxuXHRcdFx0XHRcdGlmIChmb2N1c2VkTm9kZVJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSA+IGNvbnRhaW5lclJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSkge1xyXG5cclxuXHRcdFx0XHRcdFx0dmlzaWJsZUNoaWxkUG9ydGlvbiA9IGZvY3VzZWROb2RlUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dIC0gTWF0aC5tYXgoMCwgY29udGFpbmVyUmVjdFtlZGdlTWFwW2F4aXNdXSAtIGZvY3VzZWROb2RlUmVjdFtlZGdlTWFwW2F4aXNdXSkgLSBNYXRoLm1heCgwLCBmb2N1c2VkTm9kZVJlY3Rbb3BFZGdlTWFwW2F4aXNdXSAtIGNvbnRhaW5lclJlY3Rbb3BFZGdlTWFwW2F4aXNdXSk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBJZiBtb3JlIHRoYW4gaGFsZiBhIGNvbnRhaW5lcidzIHBvcnRpb24gb2YgdGhlIGZvY3Vzc2VkIG5vZGUgaXMgdmlzaWJsZSwgdGhlcmUncyBubyBuZWVkIHRvIGNlbnRlciBpdFxyXG5cdFx0XHRcdFx0XHRpZiAodmlzaWJsZUNoaWxkUG9ydGlvbiA+PSAoY29udGFpbmVyUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dIC8gMikpIHtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFNldCB0aGUgdGFyZ2V0IG9mZnNldCB0byBiZSBpbiB0aGUgbWlkZGxlIG9mIHRoZSBjb250YWluZXIsIG9yIGFzIGNsb3NlIGFzIGJvdW5kcyBwZXJtaXRcclxuXHRcdFx0XHRcdG9mZnNldCA9IC1NYXRoLnJvdW5kKChmb2N1c2VkTm9kZVJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSAvIDIpIC0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSArIGZvY3VzZWROb2RlUmVjdFtlZGdlTWFwW2F4aXNdXSAtIGNvbnRhaW5lclJlY3RbZWRnZU1hcFtheGlzXV0gIC0gKGNvbnRhaW5lclJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSAvIDIpKTtcclxuXHRcdFx0XHRcdG9mZnNldCA9IE1hdGgubWluKDAsIE1hdGgubWF4KF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSwgb2Zmc2V0KSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUGVyZm9ybSB0aGUgc2Nyb2xsXHJcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIG9mZnNldCwgMCk7XHJcblx0XHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdID0gb2Zmc2V0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsJywgX2dldFBvc2l0aW9uKCkpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEdpdmVuIGEgcmVsYXRpdmUgZGlzdGFuY2UgYmV5b25kIHRoZSBlbGVtZW50IGJvdW5kcywgcmV0dXJucyBhIG1vZGlmaWVkIHZlcnNpb24gdG9cclxuXHRcdCAqIHNpbXVsYXRlIGJvdW5jeS9zcHJpbmd5IGVkZ2VzLlxyXG5cdFx0ICovXHJcblx0XHRfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMgPSBmdW5jdGlvbiBfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMoZGlzdGFuY2UsIGF4aXMpIHtcclxuXHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLmJvdW5jaW5nKSB7XHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIGUgPSBNYXRoLmV4cChkaXN0YW5jZSAvIF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSk7XHJcblx0XHRcdHJldHVybiBNYXRoLnJvdW5kKF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSAqIDAuNiAqIChlIC0gMSkgLyAoZSArIDEpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBHaXZlbiBwb3NpdGlvbnMgZm9yIGVhY2ggZW5hYmxlZCBheGlzLCByZXR1cm5zIGFuIG9iamVjdCBzaG93aW5nIGhvdyBmYXIgZWFjaCBheGlzIGlzIGJleW9uZFxyXG5cdFx0ICogYm91bmRzLiBJZiB3aXRoaW4gYm91bmRzLCAtMSBpcyByZXR1cm5lZDsgaWYgYXQgdGhlIGJvdW5kcywgMCBpcyByZXR1cm5lZC5cclxuXHRcdCAqL1xyXG5cdFx0X2Rpc3RhbmNlc0JleW9uZEJvdW5kcyA9IGZ1bmN0aW9uIF9kaXN0YW5jZXNCZXlvbmRCb3VuZHMocG9zaXRpb25zKSB7XHJcblx0XHRcdHZhciBheGlzLCBwb3NpdGlvbjtcclxuXHRcdFx0dmFyIGRpc3RhbmNlcyA9IHt9O1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gcG9zaXRpb25zKSB7XHJcblx0XHRcdFx0aWYgKHBvc2l0aW9ucy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbnNbYXhpc107XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIHBvc2l0aW9uIGlzIHRvIHRoZSBsZWZ0L3RvcCwgbm8gZnVydGhlciBtb2RpZmljYXRpb24gcmVxdWlyZWRcclxuXHRcdFx0XHRcdGlmIChwb3NpdGlvbiA+PSAwKSB7XHJcblx0XHRcdFx0XHRcdGRpc3RhbmNlc1theGlzXSA9IHBvc2l0aW9uO1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIGl0J3Mgd2l0aGluIHRoZSBib3VuZHMsIHVzZSAtMVxyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChwb3NpdGlvbiA+IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRkaXN0YW5jZXNbYXhpc10gPSAtMTtcclxuXHJcblx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIGFtZW5kIGJ5IHRoZSBkaXN0YW5jZSBvZiB0aGUgbWF4aW11bSBlZGdlXHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRkaXN0YW5jZXNbYXhpc10gPSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10gLSBwb3NpdGlvbjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGRpc3RhbmNlcztcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBPbiBwbGF0Zm9ybXMgd2hpY2ggc3VwcG9ydCBpdCwgdXNlIFJlcXVlc3RBbmltYXRpb25GcmFtZSB0byBncm91cFxyXG5cdFx0ICogcG9zaXRpb24gdXBkYXRlcyBmb3Igc3BlZWQuICBTdGFydHMgdGhlIHJlbmRlciBwcm9jZXNzLlxyXG5cdFx0ICovXHJcblx0XHRfc3RhcnRBbmltYXRpb24gPSBmdW5jdGlvbiBfc3RhcnRBbmltYXRpb24oKSB7XHJcblx0XHRcdGlmIChfcmVxQW5pbWF0aW9uRnJhbWUpIHtcclxuXHRcdFx0XHRfY2FuY2VsQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0X2FuaW1hdGlvbkZyYW1lUmVxdWVzdCA9IF9yZXFBbmltYXRpb25GcmFtZShfc2NoZWR1bGVSZW5kZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogT24gcGxhdGZvcm1zIHdoaWNoIHN1cHBvcnQgUmVxdWVzdEFuaW1hdGlvbkZyYW1lLCBwcm92aWRlIHRoZSByZW5kZXJpbmcgbG9vcC5cclxuXHRcdCAqIFRha2VzIHR3byBhcmd1bWVudHM7IHRoZSBmaXJzdCBpcyB0aGUgcmVuZGVyL3Bvc2l0aW9uIHVwZGF0ZSBmdW5jdGlvbiB0b1xyXG5cdFx0ICogYmUgY2FsbGVkLCBhbmQgdGhlIHNlY29uZCBpcyBhIHN0cmluZyBjb250cm9sbGluZyB0aGUgcmVuZGVyIHR5cGUgdG9cclxuXHRcdCAqIGFsbG93IHByZXZpb3VzIGNoYW5nZXMgdG8gYmUgY2FuY2VsbGVkIC0gc2hvdWxkIGJlICdwYW4nIG9yICdzY3JvbGwnLlxyXG5cdFx0ICovXHJcblx0XHRfc2NoZWR1bGVSZW5kZXIgPSBmdW5jdGlvbiBfc2NoZWR1bGVSZW5kZXIoKSB7XHJcblx0XHRcdHZhciBheGlzLCBwb3NpdGlvblVwZGF0ZWQ7XHJcblxyXG5cdFx0XHQvLyBJZiB1c2luZyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgc2NoZWR1bGUgdGhlIG5leHQgdXBkYXRlIGF0IG9uY2VcclxuXHRcdFx0aWYgKF9yZXFBbmltYXRpb25GcmFtZSkge1xyXG5cdFx0XHRcdF9hbmltYXRpb25GcmFtZVJlcXVlc3QgPSBfcmVxQW5pbWF0aW9uRnJhbWUoX3NjaGVkdWxlUmVuZGVyKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUGVyZm9ybSB0aGUgZHJhdy5cclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykgJiYgX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdICE9PSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSk7XHJcblx0XHRcdFx0XHRwb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgZnVsbCwgbG9ja2VkIHNjcm9sbGluZyBoYXMgZW5hYmxlZCwgZmlyZSBhbnkgc2Nyb2xsIGFuZCBzZWdtZW50IGNoYW5nZSBldmVudHNcclxuXHRcdFx0aWYgKF9pc1Njcm9sbGluZyAmJiBwb3NpdGlvblVwZGF0ZWQpIHtcclxuXHRcdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGwnLCBfZ2V0UG9zaXRpb24oKSk7XHJcblx0XHRcdFx0X3VwZGF0ZVNlZ21lbnRzKGZhbHNlKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFN0b3BzIHRoZSBhbmltYXRpb24gcHJvY2Vzcy5cclxuXHRcdCAqL1xyXG5cdFx0X2NhbmNlbEFuaW1hdGlvbiA9IGZ1bmN0aW9uIF9jYW5jZWxBbmltYXRpb24oKSB7XHJcblx0XHRcdGlmIChfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID09PSBmYWxzZSB8fCAhX2NhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfY2FuY2VsQW5pbWF0aW9uRnJhbWUoX2FuaW1hdGlvbkZyYW1lUmVxdWVzdCk7XHJcblx0XHRcdF9hbmltYXRpb25GcmFtZVJlcXVlc3QgPSBmYWxzZTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBSZWdpc3RlciBvciB1bnJlZ2lzdGVyIGV2ZW50IGhhbmRsZXJzIGFzIGFwcHJvcHJpYXRlXHJcblx0XHQgKi9cclxuXHRcdF90b2dnbGVFdmVudEhhbmRsZXJzID0gZnVuY3Rpb24gX3RvZ2dsZUV2ZW50SGFuZGxlcnMoZW5hYmxlKSB7XHJcblx0XHRcdHZhciBNdXRhdGlvbk9ic2VydmVyO1xyXG5cclxuXHRcdFx0Ly8gT25seSByZW1vdmUgdGhlIGV2ZW50IGlmIHRoZSBub2RlIGV4aXN0cyAoRE9NIGVsZW1lbnRzIGNhbiBnbyBhd2F5KVxyXG5cdFx0XHRpZiAoIV9jb250YWluZXJOb2RlKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoZW5hYmxlKSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUgPSBfY29udGFpbmVyTm9kZS5hZGRFdmVudExpc3RlbmVyO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlID0gX2NvbnRhaW5lck5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKF90cmFja1BvaW50ZXJFdmVudHMpIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnTVNQb2ludGVyRG93bicsIF9vblBvaW50ZXJEb3duLCB0cnVlKTtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnTVNQb2ludGVyTW92ZScsIF9vblBvaW50ZXJNb3ZlLCB0cnVlKTtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnTVNQb2ludGVyVXAnLCBfb25Qb2ludGVyVXAsIHRydWUpO1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdNU1BvaW50ZXJDYW5jZWwnLCBfb25Qb2ludGVyQ2FuY2VsLCB0cnVlKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAoX3RyYWNrVG91Y2hFdmVudHMgJiYgIV9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMudG91Y2gpIHtcclxuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCd0b3VjaHN0YXJ0JywgX29uVG91Y2hTdGFydCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgndG91Y2htb3ZlJywgX29uVG91Y2hNb3ZlLCB0cnVlKTtcclxuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCd0b3VjaGVuZCcsIF9vblRvdWNoRW5kLCB0cnVlKTtcclxuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCd0b3VjaGNhbmNlbCcsIF9vblRvdWNoRW5kLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLmRpc2FibGVkSW5wdXRNZXRob2RzLm1vdXNlKSB7XHJcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnbW91c2Vkb3duJywgX29uTW91c2VEb3duLCB0cnVlKTtcclxuXHRcdFx0XHRcdGlmICghZW5hYmxlKSB7XHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIF9vbk1vdXNlTW92ZSwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBfb25Nb3VzZVVwLCB0cnVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLmRpc2FibGVkSW5wdXRNZXRob2RzLnNjcm9sbCkge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdET01Nb3VzZVNjcm9sbCcsIF9vbk1vdXNlU2Nyb2xsLCBmYWxzZSk7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ21vdXNld2hlZWwnLCBfb25Nb3VzZVNjcm9sbCwgZmFsc2UpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgYSBjbGljayBsaXN0ZW5lci4gIE9uIElFLCBhZGQgdGhlIGxpc3RlbmVyIHRvIHRoZSBkb2N1bWVudCwgdG8gYWxsb3dcclxuXHRcdFx0Ly8gY2xpY2tzIHRvIGJlIGNhbmNlbGxlZCBpZiBhIHNjcm9sbCBlbmRzIG91dHNpZGUgdGhlIGJvdW5kcyBvZiB0aGUgY29udGFpbmVyOyBvblxyXG5cdFx0XHQvLyBvdGhlciBwbGF0Zm9ybXMsIGFkZCB0byB0aGUgY29udGFpbmVyIG5vZGUuXHJcblx0XHRcdGlmIChfdHJhY2tQb2ludGVyRXZlbnRzKSB7XHJcblx0XHRcdFx0aWYgKGVuYWJsZSkge1xyXG5cdFx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBfb25DbGljaywgdHJ1ZSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgX29uQ2xpY2ssIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnY2xpY2snLCBfb25DbGljaywgdHJ1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFdhdGNoIGZvciBjaGFuZ2VzIGluc2lkZSB0aGUgY29udGFpbmVkIGVsZW1lbnQgdG8gdXBkYXRlIGJvdW5kcyAtIGRlLWJvdW5jZWQgc2xpZ2h0bHkuXHJcblx0XHRcdGlmIChlbmFibGUpIHtcclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBfY2hpbGRGb2N1c2VkLCB0cnVlKTtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy51cGRhdGVPbkNoYW5nZXMpIHtcclxuXHJcblx0XHRcdFx0XHQvLyBUcnkgYW5kIHJldXNlIHRoZSBvbGQsIGRpc2Nvbm5lY3RlZCBvYnNlcnZlciBpbnN0YW5jZSBpZiBhdmFpbGFibGVcclxuXHRcdFx0XHRcdC8vIE90aGVyd2lzZSwgY2hlY2sgZm9yIHN1cHBvcnQgYmVmb3JlIHByb2NlZWRpbmdcclxuXHRcdFx0XHRcdGlmICghX211dGF0aW9uT2JzZXJ2ZXIpIHtcclxuXHRcdFx0XHRcdFx0TXV0YXRpb25PYnNlcnZlciA9IHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyIHx8IHdpbmRvdy5XZWJLaXRNdXRhdGlvbk9ic2VydmVyIHx8IHdpbmRvd1tfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCArICdNdXRhdGlvbk9ic2VydmVyJ107XHJcblx0XHRcdFx0XHRcdGlmIChNdXRhdGlvbk9ic2VydmVyKSB7XHJcblx0XHRcdFx0XHRcdFx0X211dGF0aW9uT2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihfZG9tQ2hhbmdlZCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAoX211dGF0aW9uT2JzZXJ2ZXIpIHtcclxuXHRcdFx0XHRcdFx0X211dGF0aW9uT2JzZXJ2ZXIub2JzZXJ2ZShfY29udGVudFBhcmVudE5vZGUsIHtcclxuXHRcdFx0XHRcdFx0XHRjaGlsZExpc3Q6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0Y2hhcmFjdGVyRGF0YTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRzdWJ0cmVlOiB0cnVlXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ0RPTVN1YnRyZWVNb2RpZmllZCcsIGZ1bmN0aW9uIChlKSB7XHJcblxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBJZ25vcmUgY2hhbmdlcyB0byBuZXN0ZWQgRlQgU2Nyb2xsZXJzIC0gZXZlbiB1cGRhdGluZyBhIHRyYW5zZm9ybSBzdHlsZVxyXG5cdFx0XHRcdFx0XHRcdC8vIGNhbiB0cmlnZ2VyIGEgRE9NU3VidHJlZU1vZGlmaWVkIGluIElFLCBjYXVzaW5nIG5lc3RlZCBzY3JvbGxlcnMgdG8gYWx3YXlzXHJcblx0XHRcdFx0XHRcdFx0Ly8gZmF2b3VyIHRoZSBkZWVwZXN0IHNjcm9sbGVyIGFzIHBhcmVudCBzY3JvbGxlcnMgJ3Jlc2l6ZScvZW5kIHNjcm9sbGluZy5cclxuXHRcdFx0XHRcdFx0XHRpZiAoZSAmJiAoZS5zcmNFbGVtZW50ID09PSBfY29udGVudFBhcmVudE5vZGUgfHwgZS5zcmNFbGVtZW50LmNsYXNzTmFtZS5pbmRleE9mKCdmdHNjcm9sbGVyXycpICE9PSAtMSkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdF9kb21DaGFuZ2VkKCk7XHJcblx0XHRcdFx0XHRcdH0sIHRydWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnVwZGF0ZU9uV2luZG93UmVzaXplKSB7XHJcblx0XHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgX2RvbUNoYW5nZWQsIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBfY2hpbGRGb2N1c2VkLCB0cnVlKTtcclxuXHRcdFx0XHRpZiAoX211dGF0aW9uT2JzZXJ2ZXIpIHtcclxuXHRcdFx0XHRcdF9tdXRhdGlvbk9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ0RPTVN1YnRyZWVNb2RpZmllZCcsIF9kb21DaGFuZ2VkLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XHJcblx0XHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIF9kb21DaGFuZ2VkLCB0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZGVsZXRlIF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFRvdWNoIGV2ZW50IGhhbmRsZXJzXHJcblx0XHQgKi9cclxuXHRcdF9vblRvdWNoU3RhcnQgPSBmdW5jdGlvbiBfb25Ub3VjaFN0YXJ0KHN0YXJ0RXZlbnQpIHtcclxuXHRcdFx0dmFyIGksIGwsIHRvdWNoRXZlbnQ7XHJcblxyXG5cdFx0XHQvLyBJZiBhIHRvdWNoIGlzIGFscmVhZHkgYWN0aXZlLCBlbnN1cmUgdGhhdCB0aGUgaW5kZXhcclxuXHRcdFx0Ly8gaXMgbWFwcGVkIHRvIHRoZSBjb3JyZWN0IGZpbmdlciwgYW5kIHJldHVybi5cclxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gc3RhcnRFdmVudC50b3VjaGVzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRcdFx0aWYgKHN0YXJ0RXZlbnQudG91Y2hlc1tpXS5pZGVudGlmaWVyID09PSBfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0XHRcdF9pbnB1dEluZGV4ID0gaTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUcmFjayB0aGUgbmV3IHRvdWNoJ3MgaWRlbnRpZmllciwgcmVzZXQgaW5kZXgsIGFuZCBwYXNzXHJcblx0XHRcdC8vIHRoZSBjb29yZGluYXRlcyB0byB0aGUgc2Nyb2xsIHN0YXJ0IGZ1bmN0aW9uLlxyXG5cdFx0XHR0b3VjaEV2ZW50ID0gc3RhcnRFdmVudC50b3VjaGVzWzBdO1xyXG5cdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gdG91Y2hFdmVudC5pZGVudGlmaWVyO1xyXG5cdFx0XHRfaW5wdXRJbmRleCA9IDA7XHJcblx0XHRcdF9zdGFydFNjcm9sbCh0b3VjaEV2ZW50LmNsaWVudFgsIHRvdWNoRXZlbnQuY2xpZW50WSwgc3RhcnRFdmVudC50aW1lU3RhbXAsIHN0YXJ0RXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vblRvdWNoTW92ZSA9IGZ1bmN0aW9uIF9vblRvdWNoTW92ZShtb3ZlRXZlbnQpIHtcclxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgPT09IGZhbHNlKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIGNvb3JkaW5hdGVzIGZyb20gdGhlIGFwcHJvcHJpYXRlIHRvdWNoIGV2ZW50IGFuZFxyXG5cdFx0XHQvLyBwYXNzIHRoZW0gb24gdG8gdGhlIHNjcm9sbCBoYW5kbGVyXHJcblx0XHRcdHZhciB0b3VjaEV2ZW50ID0gbW92ZUV2ZW50LnRvdWNoZXNbX2lucHV0SW5kZXhdO1xyXG5cdFx0XHRfdXBkYXRlU2Nyb2xsKHRvdWNoRXZlbnQuY2xpZW50WCwgdG91Y2hFdmVudC5jbGllbnRZLCBtb3ZlRXZlbnQudGltZVN0YW1wLCBtb3ZlRXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vblRvdWNoRW5kID0gZnVuY3Rpb24gX29uVG91Y2hFbmQoZW5kRXZlbnQpIHtcclxuXHRcdFx0dmFyIGksIGw7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB3aGV0aGVyIHRoZSBvcmlnaW5hbCB0b3VjaCBldmVudCBpcyBzdGlsbCBhY3RpdmUsXHJcblx0XHRcdC8vIGlmIGl0IGlzLCB1cGRhdGUgdGhlIGluZGV4IGFuZCByZXR1cm4uXHJcblx0XHRcdGlmIChlbmRFdmVudC50b3VjaGVzKSB7XHJcblx0XHRcdFx0Zm9yIChpID0gMCwgbCA9IGVuZEV2ZW50LnRvdWNoZXMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdFx0XHRpZiAoZW5kRXZlbnQudG91Y2hlc1tpXS5pZGVudGlmaWVyID09PSBfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0XHRcdF9pbnB1dEluZGV4ID0gaTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ29tcGxldGUgdGhlIHNjcm9sbC4gIE5vdGUgdGhhdCB0b3VjaCBlbmQgZXZlbnRzXHJcblx0XHRcdC8vIGRvbid0IGNhcHR1cmUgY29vcmRpbmF0ZXMuXHJcblx0XHRcdF9lbmRTY3JvbGwoZW5kRXZlbnQudGltZVN0YW1wLCBlbmRFdmVudCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogTW91c2UgZXZlbnQgaGFuZGxlcnNcclxuXHRcdCAqL1xyXG5cdFx0X29uTW91c2VEb3duID0gZnVuY3Rpb24gX29uTW91c2VEb3duKHN0YXJ0RXZlbnQpIHtcclxuXHJcblx0XHRcdC8vIERvbid0IHRyYWNrIHRoZSByaWdodCBtb3VzZSBidXR0b25zLCBvciBhIGNvbnRleHQgbWVudVxyXG5cdFx0XHRpZiAoKHN0YXJ0RXZlbnQuYnV0dG9uICYmIHN0YXJ0RXZlbnQuYnV0dG9uID09PSAyKSB8fCBzdGFydEV2ZW50LmN0cmxLZXkpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENhcHR1cmUgaWYgcG9zc2libGVcclxuXHRcdFx0aWYgKF9jb250YWluZXJOb2RlLnNldENhcHR1cmUpIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5zZXRDYXB0dXJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBtb3ZlICYgdXAgaGFuZGxlcnMgdG8gdGhlICpkb2N1bWVudCogdG8gYWxsb3cgaGFuZGxpbmcgb3V0c2lkZSB0aGUgZWxlbWVudFxyXG5cdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBfb25Nb3VzZU1vdmUsIHRydWUpO1xyXG5cdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgX29uTW91c2VVcCwgdHJ1ZSk7XHJcblxyXG5cdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gc3RhcnRFdmVudC5idXR0b24gfHwgMTtcclxuXHRcdFx0X2lucHV0SW5kZXggPSAwO1xyXG5cdFx0XHRfc3RhcnRTY3JvbGwoc3RhcnRFdmVudC5jbGllbnRYLCBzdGFydEV2ZW50LmNsaWVudFksIHN0YXJ0RXZlbnQudGltZVN0YW1wLCBzdGFydEV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Nb3VzZU1vdmUgPSBmdW5jdGlvbiBfb25Nb3VzZU1vdmUobW92ZUV2ZW50KSB7XHJcblx0XHRcdGlmICghX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X3VwZGF0ZVNjcm9sbChtb3ZlRXZlbnQuY2xpZW50WCwgbW92ZUV2ZW50LmNsaWVudFksIG1vdmVFdmVudC50aW1lU3RhbXAsIG1vdmVFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uTW91c2VVcCA9IGZ1bmN0aW9uIF9vbk1vdXNlVXAoZW5kRXZlbnQpIHtcclxuXHRcdFx0aWYgKGVuZEV2ZW50LmJ1dHRvbiAmJiBlbmRFdmVudC5idXR0b24gIT09IF9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIF9vbk1vdXNlTW92ZSwgdHJ1ZSk7XHJcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBfb25Nb3VzZVVwLCB0cnVlKTtcclxuXHJcblx0XHRcdC8vIFJlbGVhc2UgY2FwdHVyZSBpZiBwb3NzaWJsZVxyXG5cdFx0XHRpZiAoX2NvbnRhaW5lck5vZGUucmVsZWFzZUNhcHR1cmUpIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5yZWxlYXNlQ2FwdHVyZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfZW5kU2Nyb2xsKGVuZEV2ZW50LnRpbWVTdGFtcCwgZW5kRXZlbnQpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFBvaW50ZXIgZXZlbnQgaGFuZGxlcnNcclxuXHRcdCAqL1xyXG5cdFx0X29uUG9pbnRlckRvd24gPSBmdW5jdGlvbiBfb25Qb2ludGVyRG93bihzdGFydEV2ZW50KSB7XHJcblxyXG5cdFx0XHQvLyBJZiB0aGVyZSBpcyBhbHJlYWR5IGEgcG9pbnRlciBldmVudCBiZWluZyB0cmFja2VkLCBpZ25vcmUgc3Vic2VxdWVudC5cclxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIERpc2FibGUgc3BlY2lmaWMgaW5wdXQgdHlwZXMgaWYgc3BlY2lmaWVkIGluIHRoZSBjb25maWcuICBTZXBhcmF0ZVxyXG5cdFx0XHQvLyBvdXQgdG91Y2ggYW5kIG90aGVyIGV2ZW50cyAoZWcgdHJlYXQgYm90aCBwZW4gYW5kIG1vdXNlIGFzIFwibW91c2VcIilcclxuXHRcdFx0aWYgKHN0YXJ0RXZlbnQucG9pbnRlclR5cGUgPT09IHN0YXJ0RXZlbnQuTVNQT0lOVEVSX1RZUEVfVE9VQ0gpIHtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5kaXNhYmxlZElucHV0TWV0aG9kcy50b3VjaCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmIChfaW5zdGFuY2VPcHRpb25zLmRpc2FibGVkSW5wdXRNZXRob2RzLm1vdXNlKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gc3RhcnRFdmVudC5wb2ludGVySWQ7XHJcblx0XHRcdF9jYXB0dXJlSW5wdXQoKTtcclxuXHRcdFx0X3N0YXJ0U2Nyb2xsKHN0YXJ0RXZlbnQuY2xpZW50WCwgc3RhcnRFdmVudC5jbGllbnRZLCBzdGFydEV2ZW50LnRpbWVTdGFtcCwgc3RhcnRFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uUG9pbnRlck1vdmUgPSBmdW5jdGlvbiBfb25Qb2ludGVyTW92ZShtb3ZlRXZlbnQpIHtcclxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09IG1vdmVFdmVudC5wb2ludGVySWQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0X3VwZGF0ZVNjcm9sbChtb3ZlRXZlbnQuY2xpZW50WCwgbW92ZUV2ZW50LmNsaWVudFksIG1vdmVFdmVudC50aW1lU3RhbXAsIG1vdmVFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uUG9pbnRlclVwID0gZnVuY3Rpb24gX29uUG9pbnRlclVwKGVuZEV2ZW50KSB7XHJcblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyICE9PSBlbmRFdmVudC5wb2ludGVySWQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF9lbmRTY3JvbGwoZW5kRXZlbnQudGltZVN0YW1wLCBlbmRFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uUG9pbnRlckNhbmNlbCA9IGZ1bmN0aW9uIF9vblBvaW50ZXJDYW5jZWwoZW5kRXZlbnQpIHtcclxuXHRcdFx0X2VuZFNjcm9sbChlbmRFdmVudC50aW1lU3RhbXAsIGVuZEV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Qb2ludGVyQ2FwdHVyZUVuZCA9IGZ1bmN0aW9uIF9vblBvaW50ZXJDYXB0dXJlRW5kKGV2ZW50KSB7XHJcblx0XHRcdF9lbmRTY3JvbGwoZXZlbnQudGltZVN0YW1wLCBldmVudCk7XHJcblx0XHR9O1xyXG5cclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFByZXZlbnRzIGNsaWNrIGFjdGlvbnMgaWYgYXBwcm9wcmlhdGVcclxuXHRcdCAqL1xyXG5cdFx0X29uQ2xpY2sgPSBmdW5jdGlvbiBfb25DbGljayhjbGlja0V2ZW50KSB7XHJcblxyXG5cdFx0XHQvLyBJZiBhIHNjcm9sbCBhY3Rpb24gaGFzbid0IHJlc3VsdGVkIGluIHRoZSBuZXh0IHNjcm9sbCBiZWluZyBwcmV2ZW50ZWQsIGFuZCBhIHNjcm9sbFxyXG5cdFx0XHQvLyBpc24ndCBjdXJyZW50bHkgaW4gcHJvZ3Jlc3Mgd2l0aCBhIGRpZmZlcmVudCBpZGVudGlmaWVyLCBhbGxvdyB0aGUgY2xpY2tcclxuXHRcdFx0aWYgKCFfcHJldmVudENsaWNrICYmICFfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFByZXZlbnQgY2xpY2tzIHVzaW5nIHRoZSBwcmV2ZW50RGVmYXVsdCgpIGFuZCBzdG9wUHJvcGFnYXRpb24oKSBoYW5kbGVycyBvbiB0aGUgZXZlbnQ7XHJcblx0XHRcdC8vIHRoaXMgaXMgc2FmZSBldmVuIGluIElFMTAgYXMgdGhpcyBpcyBhbHdheXMgYSBcInRydWVcIiBldmVudCwgbmV2ZXIgYSB3aW5kb3cuZXZlbnQuXHJcblx0XHRcdGNsaWNrRXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0Y2xpY2tFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0aWYgKCFfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0X3ByZXZlbnRDbGljayA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH07XHJcblxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUHJvY2VzcyBzY3JvbGwgd2hlZWwvaW5wdXQgYWN0aW9ucyBhcyBzY3JvbGxlciBzY3JvbGxzXHJcblx0XHQgKi9cclxuXHRcdF9vbk1vdXNlU2Nyb2xsID0gZnVuY3Rpb24gX29uTW91c2VTY3JvbGwoZXZlbnQpIHtcclxuXHRcdFx0dmFyIHNjcm9sbERlbHRhWCwgc2Nyb2xsRGVsdGFZO1xyXG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciAhPT0gJ3Njcm9sbHdoZWVsJykge1xyXG5cdFx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyICE9PSBmYWxzZSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdF9pbnB1dElkZW50aWZpZXIgPSAnc2Nyb2xsd2hlZWwnO1xyXG5cdFx0XHRcdF9jdW11bGF0aXZlU2Nyb2xsLnggPSAwO1xyXG5cdFx0XHRcdF9jdW11bGF0aXZlU2Nyb2xsLnkgPSAwO1xyXG5cclxuXHRcdFx0XHQvLyBTdGFydCBhIHNjcm9sbCBldmVudFxyXG5cdFx0XHRcdGlmICghX3N0YXJ0U2Nyb2xsKGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFksIERhdGUubm93KCksIGV2ZW50KSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ29udmVydCB0aGUgc2Nyb2xsd2hlZWwgdmFsdWVzIHRvIGEgc2Nyb2xsIHZhbHVlXHJcblx0XHRcdGlmIChldmVudC53aGVlbERlbHRhKSB7XHJcblx0XHRcdFx0aWYgKGV2ZW50LndoZWVsRGVsdGFYKSB7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVggPSBldmVudC53aGVlbERlbHRhWCAvIDI7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVkgPSBldmVudC53aGVlbERlbHRhWSAvIDI7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWCA9IDA7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVkgPSBldmVudC53aGVlbERlbHRhIC8gMjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKGV2ZW50LmF4aXMgJiYgZXZlbnQuYXhpcyA9PT0gZXZlbnQuSE9SSVpPTlRBTF9BWElTKSB7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVggPSBldmVudC5kZXRhaWwgKiAtMTA7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVkgPSAwO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVggPSAwO1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gZXZlbnQuZGV0YWlsICogLTEwO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIHNjcm9sbGVyIGlzIGNvbnN0cmFpbmVkIHRvIGFuIHggYXhpcywgY29udmVydCB5IHNjcm9sbCB0byBhbGxvdyBzaW5nbGUtYXhpcyBzY3JvbGxcclxuXHRcdFx0Ly8gd2hlZWxzIHRvIHNjcm9sbCBjb25zdHJhaW5lZCBjb250ZW50LlxyXG5cdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSAmJiAhc2Nyb2xsRGVsdGFYKSB7XHJcblx0XHRcdFx0c2Nyb2xsRGVsdGFYID0gc2Nyb2xsRGVsdGFZO1xyXG5cdFx0XHRcdHNjcm9sbERlbHRhWSA9IDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF9jdW11bGF0aXZlU2Nyb2xsLnggPSBNYXRoLnJvdW5kKF9jdW11bGF0aXZlU2Nyb2xsLnggKyBzY3JvbGxEZWx0YVgpO1xyXG5cdFx0XHRfY3VtdWxhdGl2ZVNjcm9sbC55ID0gTWF0aC5yb3VuZChfY3VtdWxhdGl2ZVNjcm9sbC55ICsgc2Nyb2xsRGVsdGFZKTtcclxuXHJcblx0XHRcdF91cGRhdGVTY3JvbGwoX2dlc3R1cmVTdGFydC54ICsgX2N1bXVsYXRpdmVTY3JvbGwueCwgX2dlc3R1cmVTdGFydC55ICsgX2N1bXVsYXRpdmVTY3JvbGwueSwgZXZlbnQudGltZVN0YW1wLCBldmVudCk7XHJcblxyXG5cdFx0XHQvLyBFbmQgc2Nyb2xsaW5nIHN0YXRlXHJcblx0XHRcdGlmIChfc2Nyb2xsV2hlZWxFbmREZWJvdW5jZXIpIHtcclxuXHRcdFx0XHRjbGVhclRpbWVvdXQoX3Njcm9sbFdoZWVsRW5kRGVib3VuY2VyKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRfc2Nyb2xsV2hlZWxFbmREZWJvdW5jZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gZmFsc2U7XHJcblx0XHRcdFx0X3JlbGVhc2VJbnB1dENhcHR1cmUoKTtcclxuXHRcdFx0XHRfaXNTY3JvbGxpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRfaXNEaXNwbGF5aW5nU2Nyb2xsID0gZmFsc2U7XHJcblx0XHRcdFx0X2Z0c2Nyb2xsZXJNb3ZpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnKSB7XHJcblx0XHRcdFx0XHR3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRfY2FuY2VsQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0aWYgKCFfc25hcFNjcm9sbCgpKSB7XHJcblx0XHRcdFx0XHRfZmluYWxpemVTY3JvbGwoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIDMwMCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQ2FwdHVyZSBhbmQgcmVsZWFzZSBpbnB1dCBzdXBwb3J0LCBwYXJ0aWN1bGFybHkgYWxsb3dpbmcgdHJhY2tpbmdcclxuXHRcdCAqIG9mIE1ldHJvIHBvaW50ZXJzIG91dHNpZGUgdGhlIGRvY2tlZCB2aWV3LlxyXG5cdFx0ICovXHJcblx0XHRfY2FwdHVyZUlucHV0ID0gZnVuY3Rpb24gX2NhcHR1cmVJbnB1dCgpIHtcclxuXHRcdFx0aWYgKF9pbnB1dENhcHR1cmVkIHx8IF9pbnB1dElkZW50aWZpZXIgPT09IGZhbHNlIHx8IF9pbnB1dElkZW50aWZpZXIgPT09ICdzY3JvbGx3aGVlbCcpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF90cmFja1BvaW50ZXJFdmVudHMpIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5tc1NldFBvaW50ZXJDYXB0dXJlKF9pbnB1dElkZW50aWZpZXIpO1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ01TTG9zdFBvaW50ZXJDYXB0dXJlJywgX29uUG9pbnRlckNhcHR1cmVFbmQsIGZhbHNlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRfaW5wdXRDYXB0dXJlZCA9IHRydWU7XHJcblx0XHR9O1xyXG5cdFx0X3JlbGVhc2VJbnB1dENhcHR1cmUgPSBmdW5jdGlvbiBfcmVsZWFzZUlucHV0Q2FwdHVyZSgpIHtcclxuXHRcdFx0aWYgKCFfaW5wdXRDYXB0dXJlZCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX3RyYWNrUG9pbnRlckV2ZW50cykge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ01TTG9zdFBvaW50ZXJDYXB0dXJlJywgX29uUG9pbnRlckNhcHR1cmVFbmQsIGZhbHNlKTtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5tc1JlbGVhc2VQb2ludGVyQ2FwdHVyZShfaW5wdXRJZGVudGlmaWVyKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRfaW5wdXRDYXB0dXJlZCA9IGZhbHNlO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFV0aWxpdHkgZnVuY3Rpb24gYWN0aW5nIGFzIGEgZ2V0Qm91bmRpbmdDbGllbnRSZWN0IHBvbHlmaWxsLlxyXG5cdFx0ICovXHJcblx0XHRfZ2V0Qm91bmRpbmdSZWN0ID0gZnVuY3Rpb24gX2dldEJvdW5kaW5nUmVjdChhbkVsZW1lbnQpIHtcclxuXHRcdFx0aWYgKGFuRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QpIHtcclxuXHRcdFx0XHRyZXR1cm4gYW5FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgeCA9IDAsIHkgPSAwLCBlYWNoRWxlbWVudCA9IGFuRWxlbWVudDtcclxuXHRcdFx0d2hpbGUgKGVhY2hFbGVtZW50KSB7XHJcblx0XHRcdFx0eCA9IHggKyBlYWNoRWxlbWVudC5vZmZzZXRMZWZ0IC0gZWFjaEVsZW1lbnQuc2Nyb2xsTGVmdDtcclxuXHRcdFx0XHR5ID0geSArIGVhY2hFbGVtZW50Lm9mZnNldFRvcCAtIGVhY2hFbGVtZW50LnNjcm9sbFRvcDtcclxuXHRcdFx0XHRlYWNoRWxlbWVudCA9IGVhY2hFbGVtZW50Lm9mZnNldFBhcmVudDtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4geyBsZWZ0OiB4LCB0b3A6IHksIHdpZHRoOiBhbkVsZW1lbnQub2Zmc2V0V2lkdGgsIGhlaWdodDogYW5FbGVtZW50Lm9mZnNldEhlaWdodCB9O1xyXG5cdFx0fTtcclxuXHJcblxyXG5cdFx0LyogICAgICAgICAgICAgICAgICAgICBJbnN0YW50aWF0aW9uICAgICAgICAgICAgICAgICAgICAgKi9cclxuXHJcblx0XHQvLyBTZXQgdXAgdGhlIERPTSBub2RlIGlmIGFwcHJvcHJpYXRlXHJcblx0XHRfaW5pdGlhbGl6ZURPTSgpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBzaXplc1xyXG5cdFx0X3VwZGF0ZURpbWVuc2lvbnMoKTtcclxuXHJcblx0XHQvLyBTZXQgdXAgdGhlIGV2ZW50IGhhbmRsZXJzXHJcblx0XHRfdG9nZ2xlRXZlbnRIYW5kbGVycyh0cnVlKTtcclxuXHJcblx0XHQvLyBEZWZpbmUgYSBwdWJsaWMgQVBJIHRvIGJlIHJldHVybmVkIGF0IHRoZSBib3R0b20gLSB0aGlzIGlzIHRoZSBwdWJsaWMtZmFjaW5nIGludGVyZmFjZS5cclxuXHRcdF9wdWJsaWNTZWxmID0ge1xyXG5cdFx0XHRkZXN0cm95OiBkZXN0cm95LFxyXG5cdFx0XHRzZXRTbmFwU2l6ZTogc2V0U25hcFNpemUsXHJcblx0XHRcdHNjcm9sbFRvOiBzY3JvbGxUbyxcclxuXHRcdFx0c2Nyb2xsQnk6IHNjcm9sbEJ5LFxyXG5cdFx0XHR1cGRhdGVEaW1lbnNpb25zOiB1cGRhdGVEaW1lbnNpb25zLFxyXG5cdFx0XHRhZGRFdmVudExpc3RlbmVyOiBhZGRFdmVudExpc3RlbmVyLFxyXG5cdFx0XHRyZW1vdmVFdmVudExpc3RlbmVyOiByZW1vdmVFdmVudExpc3RlbmVyXHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRpZiAoT2JqZWN0LmRlZmluZVByb3BlcnRpZXMpIHtcclxuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoX3B1YmxpY1NlbGYsIHtcclxuXHRcdFx0XHQnc2Nyb2xsSGVpZ2h0Jzoge1xyXG5cdFx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIF9tZXRyaWNzLmNvbnRlbnQueTsgfSxcclxuXHRcdFx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdzY3JvbGxIZWlnaHQgaXMgY3VycmVudGx5IHJlYWQtb25seSAtIGlnbm9yaW5nICcgKyB2YWx1ZSk7IH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdCdzY3JvbGxMZWZ0Jzoge1xyXG5cdFx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIC1fbGFzdFNjcm9sbFBvc2l0aW9uLng7IH0sXHJcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHNjcm9sbFRvKHZhbHVlLCBmYWxzZSwgZmFsc2UpOyByZXR1cm4gLV9sYXN0U2Nyb2xsUG9zaXRpb24ueDsgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0J3Njcm9sbFRvcCc6IHtcclxuXHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiAtX2xhc3RTY3JvbGxQb3NpdGlvbi55OyB9LFxyXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBzY3JvbGxUbyhmYWxzZSwgdmFsdWUsIGZhbHNlKTsgcmV0dXJuIC1fbGFzdFNjcm9sbFBvc2l0aW9uLnk7IH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdCdzY3JvbGxXaWR0aCc6IHtcclxuXHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBfbWV0cmljcy5jb250ZW50Lng7IH0sXHJcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRocm93IG5ldyBTeW50YXhFcnJvcignc2Nyb2xsV2lkdGggaXMgY3VycmVudGx5IHJlYWQtb25seSAtIGlnbm9yaW5nICcgKyB2YWx1ZSk7IH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdCdzZWdtZW50Q291bnQnOiB7XHJcblx0XHRcdFx0XHRnZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4geyB4OiBOYU4sIHk6IE5hTiB9O1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0eDogTWF0aC5jZWlsKF9tZXRyaWNzLmNvbnRlbnQueCAvIF9zbmFwR3JpZFNpemUueCksXHJcblx0XHRcdFx0XHRcdFx0eTogTWF0aC5jZWlsKF9tZXRyaWNzLmNvbnRlbnQueSAvIF9zbmFwR3JpZFNpemUueSlcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRocm93IG5ldyBTeW50YXhFcnJvcignc2VnbWVudENvdW50IGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQnY3VycmVudFNlZ21lbnQnOiB7XHJcblx0XHRcdFx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4geyB4OiBfYWN0aXZlU2VnbWVudC54LCB5OiBfYWN0aXZlU2VnbWVudC55IH07IH0sXHJcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRocm93IG5ldyBTeW50YXhFcnJvcignY3VycmVudFNlZ21lbnQgaXMgY3VycmVudGx5IHJlYWQtb25seSAtIGlnbm9yaW5nICcgKyB2YWx1ZSk7IH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdCdjb250ZW50Q29udGFpbmVyTm9kZSc6IHtcclxuXHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBfY29udGVudFBhcmVudE5vZGU7IH0sXHJcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRocm93IG5ldyBTeW50YXhFcnJvcignY29udGVudENvbnRhaW5lck5vZGUgaXMgY3VycmVudGx5IHJlYWQtb25seSAtIGlnbm9yaW5nICcgKyB2YWx1ZSk7IH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0Ly8gUmV0dXJuIHRoZSBwdWJsaWMgaW50ZXJmYWNlLlxyXG5cdFx0cmV0dXJuIF9wdWJsaWNTZWxmO1xyXG5cdH07XHJcblxyXG5cclxuXHQvKiAgICAgICAgICBQcm90b3R5cGUgRnVuY3Rpb25zIGFuZCBQcm9wZXJ0aWVzICAgICAgICAgICAqL1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgSFRNTCB0byBwcmVwZW5kIHRvIHRoZSBzY3JvbGxhYmxlIGNvbnRlbnQgdG8gd3JhcCBpdC4gVXNlZCBpbnRlcm5hbGx5LFxyXG5cdCAqIGFuZCBtYXkgYmUgdXNlZCB0byBwcmUtd3JhcCBzY3JvbGxhYmxlIGNvbnRlbnQuICBBeGVzIGNhbiBvcHRpb25hbGx5XHJcblx0ICogYmUgZXhjbHVkZWQgZm9yIHNwZWVkIGltcHJvdmVtZW50cy5cclxuXHQgKi9cclxuXHRGVFNjcm9sbGVyLnByb3RvdHlwZS5nZXRQcmVwZW5kZWRIVE1MID0gZnVuY3Rpb24gKGV4Y2x1ZGVYQXhpcywgZXhjbHVkZVlBeGlzLCBod0FjY2VsZXJhdGlvbkNsYXNzKSB7XHJcblx0XHRpZiAoIWh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcclxuXHRcdFx0aWYgKHR5cGVvZiBGVFNjcm9sbGVyT3B0aW9ucyA9PT0gJ29iamVjdCcgJiYgRlRTY3JvbGxlck9wdGlvbnMuaHdBY2NlbGVyYXRpb25DbGFzcykge1xyXG5cdFx0XHRcdGh3QWNjZWxlcmF0aW9uQ2xhc3MgPSBGVFNjcm9sbGVyT3B0aW9ucy5od0FjY2VsZXJhdGlvbkNsYXNzO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGh3QWNjZWxlcmF0aW9uQ2xhc3MgPSAnZnRzY3JvbGxlcl9od2FjY2VsZXJhdGVkJztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBvdXRwdXQgPSAnPGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfY29udGFpbmVyXCI+JztcclxuXHRcdGlmICghZXhjbHVkZVhBeGlzKSB7XHJcblx0XHRcdG91dHB1dCArPSAnPGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfeCAnICsgaHdBY2NlbGVyYXRpb25DbGFzcyArICdcIj4nO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCFleGNsdWRlWUF4aXMpIHtcclxuXHRcdFx0b3V0cHV0ICs9ICc8ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl95ICcgKyBod0FjY2VsZXJhdGlvbkNsYXNzICsgJ1wiPic7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG91dHB1dDtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgSFRNTCB0byBhcHBlbmQgdG8gdGhlIHNjcm9sbGFibGUgY29udGVudCB0byB3cmFwIGl0OyBhZ2FpbiwgdXNlZCBpbnRlcm5hbGx5LFxyXG5cdCAqIGFuZCBtYXkgYmUgdXNlZCB0byBwcmUtd3JhcCBzY3JvbGxhYmxlIGNvbnRlbnQuXHJcblx0ICovXHJcblx0RlRTY3JvbGxlci5wcm90b3R5cGUuZ2V0QXBwZW5kZWRIVE1MID0gZnVuY3Rpb24gKGV4Y2x1ZGVYQXhpcywgZXhjbHVkZVlBeGlzLCBod0FjY2VsZXJhdGlvbkNsYXNzLCBzY3JvbGxiYXJzKSB7XHJcblx0XHRpZiAoIWh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcclxuXHRcdFx0aWYgKHR5cGVvZiBGVFNjcm9sbGVyT3B0aW9ucyA9PT0gJ29iamVjdCcgJiYgRlRTY3JvbGxlck9wdGlvbnMuaHdBY2NlbGVyYXRpb25DbGFzcykge1xyXG5cdFx0XHRcdGh3QWNjZWxlcmF0aW9uQ2xhc3MgPSBGVFNjcm9sbGVyT3B0aW9ucy5od0FjY2VsZXJhdGlvbkNsYXNzO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGh3QWNjZWxlcmF0aW9uQ2xhc3MgPSAnZnRzY3JvbGxlcl9od2FjY2VsZXJhdGVkJztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBvdXRwdXQgPSAnJztcclxuXHRcdGlmICghZXhjbHVkZVhBeGlzKSB7XHJcblx0XHRcdG91dHB1dCArPSAnPC9kaXY+JztcclxuXHRcdH1cclxuXHRcdGlmICghZXhjbHVkZVlBeGlzKSB7XHJcblx0XHRcdG91dHB1dCArPSAnPC9kaXY+JztcclxuXHRcdH1cclxuXHRcdGlmIChzY3JvbGxiYXJzKSB7XHJcblx0XHRcdGlmICghZXhjbHVkZVhBeGlzKSB7XHJcblx0XHRcdFx0b3V0cHV0ICs9ICc8ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl9zY3JvbGxiYXIgZnRzY3JvbGxlcl9zY3JvbGxiYXJ4ICcgKyBod0FjY2VsZXJhdGlvbkNsYXNzICsgJ1wiPjxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3Njcm9sbGJhcmlubmVyXCI+PC9kaXY+PC9kaXY+JztcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIWV4Y2x1ZGVZQXhpcykge1xyXG5cdFx0XHRcdG91dHB1dCArPSAnPGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfc2Nyb2xsYmFyIGZ0c2Nyb2xsZXJfc2Nyb2xsYmFyeSAnICsgaHdBY2NlbGVyYXRpb25DbGFzcyArICdcIj48ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl9zY3JvbGxiYXJpbm5lclwiPjwvZGl2PjwvZGl2Pic7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdG91dHB1dCArPSAnPC9kaXY+JztcclxuXHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cdH07XHJcbn0oKSk7XHJcblxyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuXHQndXNlIHN0cmljdCc7XHJcblxyXG5cdGZ1bmN0aW9uIF90aHJvd1JhbmdlRXJyb3IobmFtZSwgdmFsdWUpIHtcclxuXHRcdHRocm93IG5ldyBSYW5nZUVycm9yKCdcIicgKyBuYW1lICsgJ1wiIG11c3QgYmUgYSBudW1iZXIgYmV0d2VlbiAwIGFuZCAxLiAnICsgJ0dvdCAnICsgdmFsdWUgKyAnIGluc3RlYWQuJyk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXByZXNlbnRzIGEgdHdvLWRpbWVuc2lvbmFsIGN1YmljIGJlemllciBjdXJ2ZSB3aXRoIHRoZSBzdGFydGluZ1xyXG5cdCAqIHBvaW50ICgwLCAwKSBhbmQgdGhlIGVuZCBwb2ludCAoMSwgMSkuIFRoZSB0d28gY29udHJvbCBwb2ludHMgcDEgYW5kIHAyXHJcblx0ICogaGF2ZSB4IGFuZCB5IGNvb3JkaW5hdGVzIGJldHdlZW4gMCBhbmQgMS5cclxuXHQgKlxyXG5cdCAqIFRoaXMgdHlwZSBvZiBiZXppZXIgY3VydmVzIGNhbiBiZSB1c2VkIGFzIENTUyB0cmFuc2Zvcm0gdGltaW5nIGZ1bmN0aW9ucy5cclxuXHQgKi9cclxuXHRDdWJpY0JlemllciA9IGZ1bmN0aW9uIChwMXgsIHAxeSwgcDJ4LCBwMnkpIHtcclxuXHRcdGlmICghKHAxeCA+PSAwICYmIHAxeCA8PSAxKSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCdwMXgnLCBwMXgpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCEocDF5ID49IDAgJiYgcDF5IDw9IDEpKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3AxeScsIHAxeSk7XHJcblx0XHR9XHJcblx0XHRpZiAoIShwMnggPj0gMCAmJiBwMnggPD0gMSkpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigncDJ4JywgcDJ4KTtcclxuXHRcdH1cclxuXHRcdGlmICghKHAyeSA+PSAwICYmIHAyeSA8PSAxKSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCdwMnknLCBwMnkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENvbnRyb2wgcG9pbnRzXHJcblx0XHR0aGlzLl9wMSA9IHsgeDogcDF4LCB5OiBwMXkgfTtcclxuXHRcdHRoaXMuX3AyID0geyB4OiBwMngsIHk6IHAyeSB9O1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5fZ2V0Q29vcmRpbmF0ZUZvclQgPSBmdW5jdGlvbiAodCwgcDEsIHAyKSB7XHJcblx0XHR2YXIgYyA9IDMgKiBwMSxcclxuXHRcdFx0YiA9IDMgKiAocDIgLSBwMSkgLSBjLFxyXG5cdFx0XHRhID0gMSAtIGMgLSBiO1xyXG5cclxuXHRcdHJldHVybiAoKGEgKiB0ICsgYikgKiB0ICsgYykgKiB0O1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5fZ2V0Q29vcmRpbmF0ZURlcml2YXRlRm9yVCA9IGZ1bmN0aW9uICh0LCBwMSwgcDIpIHtcclxuXHRcdHZhciBjID0gMyAqIHAxLFxyXG5cdFx0XHRiID0gMyAqIChwMiAtIHAxKSAtIGMsXHJcblx0XHRcdGEgPSAxIC0gYyAtIGI7XHJcblxyXG5cdFx0cmV0dXJuICgzICogYSAqIHQgKyAyICogYikgKiB0ICsgYztcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuX2dldFRGb3JDb29yZGluYXRlID0gZnVuY3Rpb24gKGMsIHAxLCBwMiwgZXBzaWxvbikge1xyXG5cdFx0aWYgKCFpc0Zpbml0ZShlcHNpbG9uKSB8fCBlcHNpbG9uIDw9IDApIHtcclxuXHRcdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wiZXBzaWxvblwiIG11c3QgYmUgYSBudW1iZXIgZ3JlYXRlciB0aGFuIDAuJyk7XHJcblx0XHR9XHJcblx0XHR2YXIgdDIsIGksIGMyLCBkMjtcclxuXHJcblx0XHQvLyBGaXJzdCB0cnkgYSBmZXcgaXRlcmF0aW9ucyBvZiBOZXd0b24ncyBtZXRob2QgLS0gbm9ybWFsbHkgdmVyeSBmYXN0LlxyXG5cdFx0Zm9yICh0MiA9IGMsIGkgPSAwOyBpIDwgODsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdGMyID0gdGhpcy5fZ2V0Q29vcmRpbmF0ZUZvclQodDIsIHAxLCBwMikgLSBjO1xyXG5cdFx0XHRpZiAoTWF0aC5hYnMoYzIpIDwgZXBzaWxvbikge1xyXG5cdFx0XHRcdHJldHVybiB0MjtcclxuXHRcdFx0fVxyXG5cdFx0XHRkMiA9IHRoaXMuX2dldENvb3JkaW5hdGVEZXJpdmF0ZUZvclQodDIsIHAxLCBwMik7XHJcblx0XHRcdGlmIChNYXRoLmFicyhkMikgPCAxZS02KSB7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0dDIgPSB0MiAtIGMyIC8gZDI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFsbCBiYWNrIHRvIHRoZSBiaXNlY3Rpb24gbWV0aG9kIGZvciByZWxpYWJpbGl0eS5cclxuXHRcdHQyID0gYztcclxuXHRcdHZhciB0MCA9IDAsXHJcblx0XHRcdHQxID0gMTtcclxuXHJcblx0XHRpZiAodDIgPCB0MCkge1xyXG5cdFx0XHRyZXR1cm4gdDA7XHJcblx0XHR9XHJcblx0XHRpZiAodDIgPiB0MSkge1xyXG5cdFx0XHRyZXR1cm4gdDE7XHJcblx0XHR9XHJcblxyXG5cdFx0d2hpbGUgKHQwIDwgdDEpIHtcclxuXHRcdFx0YzIgPSB0aGlzLl9nZXRDb29yZGluYXRlRm9yVCh0MiwgcDEsIHAyKTtcclxuXHRcdFx0aWYgKE1hdGguYWJzKGMyIC0gYykgPCBlcHNpbG9uKSB7XHJcblx0XHRcdFx0cmV0dXJuIHQyO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChjID4gYzIpIHtcclxuXHRcdFx0XHR0MCA9IHQyO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHQxID0gdDI7XHJcblx0XHRcdH1cclxuXHRcdFx0dDIgPSAodDEgLSB0MCkgKiAwLjUgKyB0MDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWlsdXJlLlxyXG5cdFx0cmV0dXJuIHQyO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXB1dGVzIHRoZSBwb2ludCBmb3IgYSBnaXZlbiB0IHZhbHVlLlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtudW1iZXJ9IHRcclxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHggYW5kIHkgcHJvcGVydGllc1xyXG5cdCAqL1xyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5nZXRQb2ludEZvclQgPSBmdW5jdGlvbiAodCkge1xyXG5cclxuXHRcdC8vIFNwZWNpYWwgY2FzZXM6IHN0YXJ0aW5nIGFuZCBlbmRpbmcgcG9pbnRzXHJcblx0XHRpZiAodCA9PT0gMCB8fCB0ID09PSAxKSB7XHJcblx0XHRcdHJldHVybiB7IHg6IHQsIHk6IHQgfTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBmb3IgY29ycmVjdCB0IHZhbHVlIChtdXN0IGJlIGJldHdlZW4gMCBhbmQgMSlcclxuXHRcdGlmICh0IDwgMCB8fCB0ID4gMSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCd0JywgdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0eDogdGhpcy5fZ2V0Q29vcmRpbmF0ZUZvclQodCwgdGhpcy5fcDEueCwgdGhpcy5fcDIueCksXHJcblx0XHRcdHk6IHRoaXMuX2dldENvb3JkaW5hdGVGb3JUKHQsIHRoaXMuX3AxLnksIHRoaXMuX3AyLnkpXHJcblx0XHR9O1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5nZXRURm9yWCA9IGZ1bmN0aW9uICh4LCBlcHNpbG9uKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fZ2V0VEZvckNvb3JkaW5hdGUoeCwgdGhpcy5fcDEueCwgdGhpcy5fcDIueCwgZXBzaWxvbik7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmdldFRGb3JZID0gZnVuY3Rpb24gKHksIGVwc2lsb24pIHtcclxuXHRcdHJldHVybiB0aGlzLl9nZXRURm9yQ29vcmRpbmF0ZSh5LCB0aGlzLl9wMS55LCB0aGlzLl9wMi55LCBlcHNpbG9uKTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDb21wdXRlcyBhdXhpbGlhcnkgcG9pbnRzIHVzaW5nIERlIENhc3RlbGphdSdzIGFsZ29yaXRobS5cclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDAgYW5kIGxvd2VyIHRoYW4gMS5cclxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSB3aXRoIG1lbWJlcnMgaTAsIGkxLCBpMiAoZmlyc3QgaXRlcmF0aW9uKSxcclxuXHQgKiAgICBqMSwgajIgKHNlY29uZCBpdGVyYXRpb24pIGFuZCBrICh0aGUgZXhhY3QgcG9pbnQgZm9yIHQpXHJcblx0ICovXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLl9nZXRBdXhQb2ludHMgPSBmdW5jdGlvbiAodCkge1xyXG5cdFx0aWYgKHQgPD0gMCB8fCB0ID49IDEpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigndCcsIHQpO1xyXG5cdFx0fVxyXG5cclxuXHJcblx0XHQvKiBGaXJzdCBzZXJpZXMgb2YgYXV4aWxpYXJ5IHBvaW50cyAqL1xyXG5cclxuXHRcdC8vIEZpcnN0IGNvbnRyb2wgcG9pbnQgb2YgdGhlIGxlZnQgY3VydmVcclxuXHRcdHZhciBpMCA9IHtcclxuXHRcdFx0XHR4OiB0ICogdGhpcy5fcDEueCxcclxuXHRcdFx0XHR5OiB0ICogdGhpcy5fcDEueVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRpMSA9IHtcclxuXHRcdFx0XHR4OiB0aGlzLl9wMS54ICsgdCAqICh0aGlzLl9wMi54IC0gdGhpcy5fcDEueCksXHJcblx0XHRcdFx0eTogdGhpcy5fcDEueSArIHQgKiAodGhpcy5fcDIueSAtIHRoaXMuX3AxLnkpXHJcblx0XHRcdH0sXHJcblxyXG5cdFx0XHQvLyBTZWNvbmQgY29udHJvbCBwb2ludCBvZiB0aGUgcmlnaHQgY3VydmVcclxuXHRcdFx0aTIgID0ge1xyXG5cdFx0XHRcdHg6IHRoaXMuX3AyLnggKyB0ICogKDEgLSB0aGlzLl9wMi54KSxcclxuXHRcdFx0XHR5OiB0aGlzLl9wMi55ICsgdCAqICgxIC0gdGhpcy5fcDIueSlcclxuXHRcdFx0fTtcclxuXHJcblxyXG5cdFx0LyogU2Vjb25kIHNlcmllcyBvZiBhdXhpbGlhcnkgcG9pbnRzICovXHJcblxyXG5cdFx0Ly8gU2Vjb25kIGNvbnRyb2wgcG9pbnQgb2YgdGhlIGxlZnQgY3VydmVcclxuXHRcdHZhciBqMCA9IHtcclxuXHRcdFx0XHR4OiBpMC54ICsgdCAqIChpMS54IC0gaTAueCksXHJcblx0XHRcdFx0eTogaTAueSArIHQgKiAoaTEueSAtIGkwLnkpXHJcblx0XHRcdH0sXHJcblxyXG5cdFx0XHQvLyBGaXJzdCBjb250cm9sIHBvaW50IG9mIHRoZSByaWdodCBjdXJ2ZVxyXG5cdFx0XHRqMSA9IHtcclxuXHRcdFx0XHR4OiBpMS54ICsgdCAqIChpMi54IC0gaTEueCksXHJcblx0XHRcdFx0eTogaTEueSArIHQgKiAoaTIueSAtIGkxLnkpXHJcblx0XHRcdH07XHJcblxyXG5cdFx0Ly8gVGhlIGRpdmlzaW9uIHBvaW50IChlbmRpbmcgcG9pbnQgb2YgbGVmdCBjdXJ2ZSwgc3RhcnRpbmcgcG9pbnQgb2YgcmlnaHQgY3VydmUpXHJcblx0XHR2YXIgayA9IHtcclxuXHRcdFx0XHR4OiBqMC54ICsgdCAqIChqMS54IC0gajAueCksXHJcblx0XHRcdFx0eTogajAueSArIHQgKiAoajEueSAtIGowLnkpXHJcblx0XHRcdH07XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aTA6IGkwLFxyXG5cdFx0XHRpMTogaTEsXHJcblx0XHRcdGkyOiBpMixcclxuXHRcdFx0ajA6IGowLFxyXG5cdFx0XHRqMTogajEsXHJcblx0XHRcdGs6IGtcclxuXHRcdH07XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogRGl2aWRlcyB0aGUgYmV6aWVyIGN1cnZlIGludG8gdHdvIGJlemllciBmdW5jdGlvbnMuXHJcblx0ICpcclxuXHQgKiBEZSBDYXN0ZWxqYXUncyBhbGdvcml0aG0gaXMgdXNlZCB0byBjb21wdXRlIHRoZSBuZXcgc3RhcnRpbmcsIGVuZGluZywgYW5kXHJcblx0ICogY29udHJvbCBwb2ludHMuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge251bWJlcn0gdCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwIGFuZCBsb3dlciB0aGFuIDEuXHJcblx0ICogICAgIHQgPT09IDEgb3IgdCA9PT0gMCBhcmUgdGhlIHN0YXJ0aW5nL2VuZGluZyBwb2ludHMgb2YgdGhlIGN1cnZlLCBzbyBub1xyXG5cdCAqICAgICBkaXZpc2lvbiBpcyBuZWVkZWQuXHJcblx0ICpcclxuXHQgKiBAcmV0dXJucyB7Q3ViaWNCZXppZXJbXX0gUmV0dXJucyBhbiBhcnJheSBjb250YWluaW5nIHR3byBiZXppZXIgY3VydmVzXHJcblx0ICogICAgIHRvIHRoZSBsZWZ0IGFuZCB0aGUgcmlnaHQgb2YgdC5cclxuXHQgKi9cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZGl2aWRlQXRUID0gZnVuY3Rpb24gKHQpIHtcclxuXHRcdGlmICh0IDwgMCB8fCB0ID4gMSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCd0JywgdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3BlY2lhbCBjYXNlcyB0ID0gMCwgdCA9IDE6IEN1cnZlIGNhbiBiZSBjbG9uZWQgZm9yIG9uZSBzaWRlLCB0aGUgb3RoZXJcclxuXHRcdC8vIHNpZGUgaXMgYSBsaW5lYXIgY3VydmUgKHdpdGggZHVyYXRpb24gMClcclxuXHRcdGlmICh0ID09PSAwIHx8IHQgPT09IDEpIHtcclxuXHRcdFx0dmFyIGN1cnZlcyA9IFtdO1xyXG5cdFx0XHRjdXJ2ZXNbdF0gPSBDdWJpY0Jlemllci5saW5lYXIoKTtcclxuXHRcdFx0Y3VydmVzWzEgLSB0XSA9IHRoaXMuY2xvbmUoKTtcclxuXHRcdFx0cmV0dXJuIGN1cnZlcztcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbGVmdCA9IHt9LFxyXG5cdFx0XHRyaWdodCA9IHt9LFxyXG5cdFx0XHRwb2ludHMgPSB0aGlzLl9nZXRBdXhQb2ludHModCk7XHJcblxyXG5cdFx0dmFyIGkwID0gcG9pbnRzLmkwLFxyXG5cdFx0XHRpMiA9IHBvaW50cy5pMixcclxuXHRcdFx0ajAgPSBwb2ludHMuajAsXHJcblx0XHRcdGoxID0gcG9pbnRzLmoxLFxyXG5cdFx0XHRrID0gcG9pbnRzLms7XHJcblxyXG5cdFx0Ly8gTm9ybWFsaXplIGRlcml2ZWQgcG9pbnRzLCBzbyB0aGF0IHRoZSBuZXcgY3VydmVzIHN0YXJ0aW5nL2VuZGluZyBwb2ludFxyXG5cdFx0Ly8gY29vcmRpbmF0ZXMgYXJlICgwLCAwKSByZXNwZWN0aXZlbHkgKDEsIDEpXHJcblx0XHR2YXIgZmFjdG9yWCA9IGsueCxcclxuXHRcdFx0ZmFjdG9yWSA9IGsueTtcclxuXHJcblx0XHRsZWZ0LnAxID0ge1xyXG5cdFx0XHR4OiBpMC54IC8gZmFjdG9yWCxcclxuXHRcdFx0eTogaTAueSAvIGZhY3RvcllcclxuXHRcdH07XHJcblx0XHRsZWZ0LnAyID0ge1xyXG5cdFx0XHR4OiBqMC54IC8gZmFjdG9yWCxcclxuXHRcdFx0eTogajAueSAvIGZhY3RvcllcclxuXHRcdH07XHJcblxyXG5cdFx0cmlnaHQucDEgPSB7XHJcblx0XHRcdHg6IChqMS54IC0gZmFjdG9yWCkgLyAoMSAtIGZhY3RvclgpLFxyXG5cdFx0XHR5OiAoajEueSAtIGZhY3RvclkpIC8gKDEgLSBmYWN0b3JZKVxyXG5cdFx0fTtcclxuXHJcblx0XHRyaWdodC5wMiA9IHtcclxuXHRcdFx0eDogKGkyLnggLSBmYWN0b3JYKSAvICgxIC0gZmFjdG9yWCksXHJcblx0XHRcdHk6IChpMi55IC0gZmFjdG9yWSkgLyAoMSAtIGZhY3RvclkpXHJcblx0XHR9O1xyXG5cclxuXHRcdHJldHVybiBbXHJcblx0XHRcdG5ldyBDdWJpY0JlemllcihsZWZ0LnAxLngsIGxlZnQucDEueSwgbGVmdC5wMi54LCBsZWZ0LnAyLnkpLFxyXG5cdFx0XHRuZXcgQ3ViaWNCZXppZXIocmlnaHQucDEueCwgcmlnaHQucDEueSwgcmlnaHQucDIueCwgcmlnaHQucDIueSlcclxuXHRcdF07XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmRpdmlkZUF0WCA9IGZ1bmN0aW9uICh4LCBlcHNpbG9uKSB7XHJcblx0XHRpZiAoeCA8IDAgfHwgeCA+IDEpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigneCcsIHgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciB0ID0gdGhpcy5nZXRURm9yWCh4LCBlcHNpbG9uKTtcclxuXHRcdHJldHVybiB0aGlzLmRpdmlkZUF0VCh0KTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZGl2aWRlQXRZID0gZnVuY3Rpb24gKHksIGVwc2lsb24pIHtcclxuXHRcdGlmICh5IDwgMCB8fCB5ID4gMSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCd5JywgeSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIHQgPSB0aGlzLmdldFRGb3JZKHksIGVwc2lsb24pO1xyXG5cdFx0cmV0dXJuIHRoaXMuZGl2aWRlQXRUKHQpO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgQ3ViaWNCZXppZXIodGhpcy5fcDEueCwgdGhpcy5fcDEueSwgdGhpcy5fcDIueCwgdGhpcy5fcDIueSk7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIFwiY3ViaWMtYmV6aWVyKFwiICsgW1xyXG5cdFx0XHR0aGlzLl9wMS54LFxyXG5cdFx0XHR0aGlzLl9wMS55LFxyXG5cdFx0XHR0aGlzLl9wMi54LFxyXG5cdFx0XHR0aGlzLl9wMi55XHJcblx0XHRdLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLmxpbmVhciA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgQ3ViaWNCZXppZXIoKTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5lYXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigwLjI1LCAwLjEsIDAuMjUsIDEuMCk7XHJcblx0fTtcclxuXHRDdWJpY0Jlemllci5saW5lYXIgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAuMCwgMC4wLCAxLjAsIDEuMCk7XHJcblx0fTtcclxuXHRDdWJpY0Jlemllci5lYXNlSW4gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAuNDIsIDAsIDEuMCwgMS4wKTtcclxuXHR9O1xyXG5cdEN1YmljQmV6aWVyLmVhc2VPdXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAsIDAsIDAuNTgsIDEuMCk7XHJcblx0fTtcclxuXHRDdWJpY0Jlemllci5lYXNlSW5PdXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAuNDIsIDAsIDAuNTgsIDEuMCk7XHJcblx0fTtcclxufSgpKTtcclxuXHJcbi8vIElmIGEgQ29tbW9uSlMgZW52aXJvbm1lbnQgaXMgcHJlc2VudCwgYWRkIG91ciBleHBvcnRzOyBtYWtlIHRoZSBjaGVjayBpbiBhIGpzbGludC1jb21wYXRpYmxlIG1ldGhvZC5cclxudmFyIG1vZHVsZTtcclxuaWYgKG1vZHVsZSAhPT0gdW5kZWZpbmVkICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkb21Ob2RlLCBvcHRpb25zKSB7XHJcblx0XHQndXNlIHN0cmljdCc7XHJcblx0XHRyZXR1cm4gbmV3IEZUU2Nyb2xsZXIoZG9tTm9kZSwgb3B0aW9ucyk7XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMuRlRTY3JvbGxlciA9IEZUU2Nyb2xsZXI7XHJcblx0bW9kdWxlLmV4cG9ydHMuQ3ViaWNCZXppZXIgPSBDdWJpY0JlemllcjtcclxufSIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5cbnZhciBnYWxsZXJ5RE9NID0gcmVxdWlyZSgnLi9nYWxsZXJ5RE9NJyksXG4gICAgRlRTY3JvbGxlciA9IHJlcXVpcmUoJ0ZUU2Nyb2xsZXInKSxcbiAgICBTaW1wbGVTY3JvbGxlciA9IHJlcXVpcmUoJy4vU2ltcGxlU2Nyb2xsZXInKTtcblxuZnVuY3Rpb24gR2FsbGVyeShjb250YWluZXJFbCwgY29uZmlnKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBpZiAoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB2aWV3cG9ydEVsLFxuICAgICAgICBhbGxJdGVtc0VsLFxuICAgICAgICBpdGVtRWxzLFxuICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgc2hvd25JdGVtSW5kZXgsXG4gICAgICAgIGRlYm91bmNlT25SZXNpemUsXG4gICAgICAgIHNjcm9sbGVyLFxuICAgICAgICBkZWJvdW5jZVNjcm9sbCxcbiAgICAgICAgcHJldkNvbnRyb2xEaXYsXG4gICAgICAgIG5leHRDb250cm9sRGl2LFxuICAgICAgICBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCA9IHtcbiAgICAgICAgICAgIGNvbXBvbmVudDogXCJkYXRhLW8tY29tcG9uZW50XCIsXG4gICAgICAgICAgICB2ZXJzaW9uOiBcImRhdGEtby12ZXJzaW9uXCIsXG4gICAgICAgICAgICBzeW5jSUQ6IFwiZGF0YS1vLWdhbGxlcnktc3luY2lkXCIsXG4gICAgICAgICAgICBtdWx0aXBsZUl0ZW1zUGVyUGFnZTogXCJkYXRhLW8tZ2FsbGVyeS1tdWx0aXBsZWl0ZW1zcGVycGFnZVwiLFxuICAgICAgICAgICAgdG91Y2g6IFwiZGF0YS1vLWdhbGxlcnktdG91Y2hcIixcbiAgICAgICAgICAgIGNhcHRpb25zOiBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25zXCIsXG4gICAgICAgICAgICBjYXB0aW9uTWluSGVpZ2h0OiBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25taW5oZWlnaHRcIixcbiAgICAgICAgICAgIGNhcHRpb25NYXhIZWlnaHQ6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1heGhlaWdodFwiLFxuICAgICAgICAgICAgd2luZG93UmVzaXplOiBcImRhdGEtby1nYWxsZXJ5LXdpbmRvd3Jlc2l6ZVwiXG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRDb25maWcgPSB7XG4gICAgICAgICAgICBjb21wb25lbnQ6IFwiby1nYWxsZXJ5XCIsXG4gICAgICAgICAgICB2ZXJzaW9uOiBcIjAuMC4wXCIsXG4gICAgICAgICAgICBtdWx0aXBsZUl0ZW1zUGVyUGFnZTogZmFsc2UsXG4gICAgICAgICAgICBjYXB0aW9uczogdHJ1ZSxcbiAgICAgICAgICAgIGNhcHRpb25NaW5IZWlnaHQ6IDI0LFxuICAgICAgICAgICAgY2FwdGlvbk1heEhlaWdodDogNTIsXG4gICAgICAgICAgICB0b3VjaDogZmFsc2UsXG4gICAgICAgICAgICBzeW5jSUQ6IFwiby1nYWxsZXJ5LVwiICsgbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgICAgICB3aW5kb3dSZXNpemU6IHRydWVcbiAgICAgICAgfTtcblxuICAgIGZ1bmN0aW9uIHN1cHBvcnRzQ3NzVHJhbnNmb3JtcygpIHtcbiAgICAgICAgdmFyIGh0bWxFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdodG1sJylbMF07XG4gICAgICAgIHJldHVybiBnYWxsZXJ5RE9NLmhhc0NsYXNzKGh0bWxFbCwgXCJjc3N0cmFuc2Zvcm1zXCIpIHx8IGdhbGxlcnlET00uaGFzQ2xhc3MoaHRtbEVsLCBcImNzc3RyYW5zZm9ybXMzZFwiKSB8fCBnYWxsZXJ5RE9NLmhhc0NsYXNzKGh0bWxFbCwgXCJjc3N0cmFuc2l0aW9uc1wiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RhdGFTb3VyY2UoKSB7XG4gICAgICAgIHJldHVybiAoY29uZmlnLml0ZW1zICYmIGNvbmZpZy5pdGVtcy5sZW5ndGggPiAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRXaWR0aHMoKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgICAgbCxcbiAgICAgICAgICAgIHRvdGFsV2lkdGggPSAwLFxuICAgICAgICAgICAgaXRlbVdpZHRoID0gY29udGFpbmVyRWwuY2xpZW50V2lkdGg7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIGl0ZW1XaWR0aCA9IHBhcnNlSW50KGl0ZW1FbHNbc2VsZWN0ZWRJdGVtSW5kZXhdLmNsaWVudFdpZHRoLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtRWxzW2ldLnN0eWxlLndpZHRoID0gaXRlbVdpZHRoICsgXCJweFwiO1xuICAgICAgICAgICAgdG90YWxXaWR0aCArPSBpdGVtV2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgYWxsSXRlbXNFbC5zdHlsZS53aWR0aCA9IHRvdGFsV2lkdGggKyBcInB4XCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNWYWxpZEl0ZW0obikge1xuICAgICAgICByZXR1cm4gKHR5cGVvZiBuID09PSBcIm51bWJlclwiICYmIG4gPiAtMSAmJiBuIDwgaXRlbUVscy5sZW5ndGgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdGVkSXRlbSgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkSXRlbSA9IDAsIGMsIGw7XG4gICAgICAgIGZvciAoYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgaWYgKGdhbGxlcnlET00uaGFzQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gYztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFVpQ29udHJvbHMoKSB7XG4gICAgICAgIHByZXZDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tcHJldlwiKTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1uZXh0XCIpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudChwcmV2Q29udHJvbERpdiwgXCJjbGlja1wiLCBwcmV2KTtcbiAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudChuZXh0Q29udHJvbERpdiwgXCJjbGlja1wiLCBuZXh0KTtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudCh2aWV3cG9ydEVsLCBcImNsaWNrXCIsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2xpY2tlZEl0ZW1OdW0gPSBnYWxsZXJ5RE9NLmdldEVsZW1lbnRJbmRleChnYWxsZXJ5RE9NLmdldENsb3Nlc3QoZXZ0LnNyY0VsZW1lbnQsIFwiby1nYWxsZXJ5X19pdGVtXCIpKTtcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKGNsaWNrZWRJdGVtTnVtLCB0cnVlLCBcInVzZXJcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUNvbnRyb2xTdGF0ZXMoKSB7XG4gICAgICAgIHByZXZDb250cm9sRGl2LnN0eWxlLmRpc3BsYXkgPSAoc2Nyb2xsZXIuc2Nyb2xsTGVmdCA+IDApID8gXCJibG9ja1wiIDogXCJub25lXCI7XG4gICAgICAgIG5leHRDb250cm9sRGl2LnN0eWxlLmRpc3BsYXkgPSAoc2Nyb2xsZXIuc2Nyb2xsTGVmdCA8IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSA/IFwiYmxvY2tcIiA6IFwibm9uZVwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldENhcHRpb25TaXplcygpIHtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW1FbCA9IGl0ZW1FbHNbY107XG4gICAgICAgICAgICBpdGVtRWwuc3R5bGUucGFkZGluZ0JvdHRvbSA9IGNvbmZpZy5jYXB0aW9uTWluSGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgdmFyIGNhcHRpb25FbCA9IGl0ZW1FbC5xdWVyeVNlbGVjdG9yKFwiLm8tZ2FsbGVyeV9faXRlbV9fY2FwdGlvblwiKTtcbiAgICAgICAgICAgIGlmIChjYXB0aW9uRWwpIHtcbiAgICAgICAgICAgICAgICBjYXB0aW9uRWwuc3R5bGUubWluSGVpZ2h0ID0gY29uZmlnLmNhcHRpb25NaW5IZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICAgICAgY2FwdGlvbkVsLnN0eWxlLm1heEhlaWdodCA9IGNvbmZpZy5jYXB0aW9uTWF4SGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zZXJ0SXRlbUNvbnRlbnQobikge1xuICAgICAgICB2YXIgaXRlbU51bXMgPSAobiBpbnN0YW5jZW9mIEFycmF5KSA/IG4gOiBbbl07XG4gICAgICAgIGlmIChjb25maWcuaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbU51bXMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW1OdW0gPSBpdGVtTnVtc1tjXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNWYWxpZEl0ZW0oaXRlbU51bSkgJiYgIWNvbmZpZy5pdGVtc1tpdGVtTnVtXS5pbnNlcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLmluc2VydEl0ZW1Db250ZW50KGNvbmZpZywgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLCBpdGVtRWxzW2l0ZW1OdW1dKTtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc2V0Q2FwdGlvblNpemVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNXaG9sZUl0ZW1JblBhZ2VWaWV3KGl0ZW1OdW0sIGwsIHIpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsICYmIGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCArIGl0ZW1FbHNbaXRlbU51bV0uY2xpZW50V2lkdGggPD0gcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0FueVBhcnRPZkl0ZW1JblBhZ2VWaWV3KGl0ZW1OdW0sIGwsIHIpIHtcbiAgICAgICAgcmV0dXJuIChpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPj0gbCAtIGl0ZW1FbHNbaXRlbU51bV0uY2xpZW50V2lkdGggJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0IDw9IHIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEl0ZW1zSW5QYWdlVmlldyhsLCByLCB3aG9sZSkge1xuICAgICAgICB2YXIgaXRlbXNJblZpZXcgPSBbXSxcbiAgICAgICAgICAgIG9ubHlXaG9sZSA9ICh0eXBlb2Ygd2hvbGUgIT09IFwiYm9vbGVhblwiKSA/IHRydWUgOiB3aG9sZTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBpdGVtRWxzLmxlbmd0aDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoKG9ubHlXaG9sZSAmJiBpc1dob2xlSXRlbUluUGFnZVZpZXcoYywgbCwgcikpIHx8ICghb25seVdob2xlICYmIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoYywgbCwgcikpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXNJblZpZXcucHVzaChjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXRlbXNJblZpZXc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25HYWxsZXJ5Q3VzdG9tRXZlbnQoZXZ0KSB7XG4gICAgICAgIGlmIChldnQuc3JjRWxlbWVudCAhPT0gY29udGFpbmVyRWwgJiYgZXZ0LnN5bmNJRCA9PT0gY29uZmlnLnN5bmNJRCAmJiBldnQub0dhbGxlcnlTb3VyY2UgPT09IFwidXNlclwiKSB7XG4gICAgICAgICAgICBzZWxlY3RJdGVtKGV2dC5pdGVtSUQsIHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuRm9yU3luY0V2ZW50cygpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJvR2FsbGVyeUl0ZW1TZWxlY3RlZFwiLCBvbkdhbGxlcnlDdXN0b21FdmVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmlnZ2VyRXZlbnQobmFtZSwgZGF0YSkge1xuICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQgJiYgY29udGFpbmVyRWwuZGlzcGF0Y2hFdmVudCkge1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQobmFtZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICBldmVudC5zeW5jSUQgPSBjb25maWcuc3luY0lEO1xuICAgICAgICAgICAgZXZlbnQuZ2FsbGVyeSA9IGRhdGEuZ2FsbGVyeTtcbiAgICAgICAgICAgIGV2ZW50Lml0ZW1JRCA9IGRhdGEuaXRlbUlEO1xuICAgICAgICAgICAgZXZlbnQub0dhbGxlcnlTb3VyY2UgPSBkYXRhLnNvdXJjZTtcbiAgICAgICAgICAgIGNvbnRhaW5lckVsLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW92ZVZpZXdwb3J0KGxlZnQsIHRyYW5zaXRpb24pIHtcbiAgICAgICAgc2Nyb2xsZXIuc2Nyb2xsVG8obGVmdCwgMCwgY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKTtcbiAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KGxlZnQsIGxlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFsaWduSXRlbUxlZnQobiwgdHJhbnNpdGlvbikge1xuICAgICAgICBtb3ZlVmlld3BvcnQoaXRlbUVsc1tuXS5vZmZzZXRMZWZ0LCB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1SaWdodChuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIHZhciBuZXdTY3JvbGxMZWZ0ID0gaXRlbUVsc1tuXS5vZmZzZXRMZWZ0IC0gKHZpZXdwb3J0RWwuY2xpZW50V2lkdGggLSBpdGVtRWxzW25dLmNsaWVudFdpZHRoKTtcbiAgICAgICAgbW92ZVZpZXdwb3J0KG5ld1Njcm9sbExlZnQsIHRyYW5zaXRpb24pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJyaW5nSXRlbUludG9WaWV3KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgaWYgKCFpc1ZhbGlkSXRlbShuKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2aWV3cG9ydEwgPSBzY3JvbGxlci5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgdmlld3BvcnRSID0gdmlld3BvcnRMICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgIGl0ZW1MID0gaXRlbUVsc1tuXS5vZmZzZXRMZWZ0LFxuICAgICAgICAgICAgaXRlbVIgPSBpdGVtTCArIGl0ZW1FbHNbbl0uY2xpZW50V2lkdGg7XG4gICAgICAgIGlmIChpdGVtTCA+IHZpZXdwb3J0TCAmJiBpdGVtUiA8IHZpZXdwb3J0Uikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdGVtTCA8IHZpZXdwb3J0TCkge1xuICAgICAgICAgICAgYWxpZ25JdGVtTGVmdChuLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtUiA+IHZpZXdwb3J0Uikge1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQobiwgdHJhbnNpdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93SXRlbShuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmIChpc1ZhbGlkSXRlbShuKSkge1xuICAgICAgICAgICAgYnJpbmdJdGVtSW50b1ZpZXcobiwgdHJhbnNpdGlvbik7XG4gICAgICAgICAgICBzaG93bkl0ZW1JbmRleCA9IG47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldkl0ZW0oKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNob3duSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNob3duSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2hvd0l0ZW0ocHJldik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRJdGVtKCkge1xuICAgICAgICB2YXIgbmV4dCA9IChzaG93bkl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzaG93bkl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzaG93SXRlbShuZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93UHJldlBhZ2UoKSB7XG4gICAgICAgIGlmIChzY3JvbGxlci5zY3JvbGxMZWZ0ID09PSAwKSB7XG4gICAgICAgICAgICBzaG93SXRlbShpdGVtRWxzLmxlbmd0aCAtIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByZXZQYWdlV2hvbGVJdGVtcyA9IGdldEl0ZW1zSW5QYWdlVmlldyhzY3JvbGxlci5zY3JvbGxMZWZ0IC0gdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgc2Nyb2xsZXIuc2Nyb2xsTGVmdCksXG4gICAgICAgICAgICAgICAgcHJldlBhZ2VJdGVtID0gcHJldlBhZ2VXaG9sZUl0ZW1zLnBvcCgpIHx8IDA7XG4gICAgICAgICAgICBhbGlnbkl0ZW1SaWdodChwcmV2UGFnZUl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd05leHRQYWdlKCkge1xuICAgICAgICBpZiAoc2Nyb2xsZXIuc2Nyb2xsTGVmdCA9PT0gYWxsSXRlbXNFbC5jbGllbnRXaWR0aCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgpIHtcbiAgICAgICAgICAgIHNob3dJdGVtKDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3ID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHNjcm9sbGVyLnNjcm9sbExlZnQsIHNjcm9sbGVyLnNjcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSxcbiAgICAgICAgICAgICAgICBsYXN0V2hvbGVJdGVtSW5WaWV3ID0gY3VycmVudFdob2xlSXRlbXNJblZpZXcucG9wKCkgfHwgaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgYWxpZ25JdGVtTGVmdChsYXN0V2hvbGVJdGVtSW5WaWV3ICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKG4sIHNob3csIHNvdXJjZSkge1xuICAgICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICAgICAgc291cmNlID0gXCJhcGlcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGlmIChzaG93KSB7XG4gICAgICAgICAgICAgICAgc2hvd0l0ZW0obik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiAhPT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uYWRkQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2FsbGVyeURPTS5yZW1vdmVDbGFzcyhpdGVtRWxzW2NdLCBcIm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwge1xuICAgICAgICAgICAgICAgICAgICBpdGVtSUQ6IHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHNvdXJjZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0UHJldkl0ZW0oc2hvdywgc291cmNlKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNlbGVjdGVkSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNlbGVjdGVkSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2VsZWN0SXRlbShwcmV2LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdE5leHRJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgbmV4dCA9IChzZWxlY3RlZEl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzZWxlY3RlZEl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzZWxlY3RJdGVtKG5leHQsIHNob3csIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJldigpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd1ByZXZQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RQcmV2SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzaG93TmV4dFBhZ2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdE5leHRJdGVtKHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzaXplKCkge1xuICAgICAgICBzZXRXaWR0aHMoKTtcbiAgICAgICAgaWYgKCFjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHsgLy8gY29ycmVjdCB0aGUgYWxpZ25tZW50IG9mIGl0ZW0gaW4gdmlld1xuICAgICAgICAgICAgc2hvd0l0ZW0oc2hvd25JdGVtSW5kZXgsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdTY3JvbGxMZWZ0ID0gc2Nyb2xsZXIuc2Nyb2xsTGVmdDtcbiAgICAgICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhuZXdTY3JvbGxMZWZ0LCBuZXdTY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUhhbmRsZXIoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWJvdW5jZU9uUmVzaXplKTtcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSA9IHNldFRpbWVvdXQob25SZXNpemUsIDUwMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kT2JqZWN0cyhvYmpzKSB7XG4gICAgICAgIHZhciBuZXdPYmogPSB7fTtcbiAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBvYmpzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG9ianNbY107XG4gICAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3T2JqW3Byb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3T2JqO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCkge1xuICAgICAgICBnYWxsZXJ5RE9NLnNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyhjb250YWluZXJFbCwgY29uZmlnLCBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCwgW1wiaXRlbXNcIl0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFN5bmNJRChpZCkge1xuICAgICAgICBjb25maWcuc3luY0lEID0gaWQ7XG4gICAgICAgIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3luY0lEKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLnN5bmNJRDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzeW5jV2l0aChnYWxsZXJ5SW5zdGFuY2UpIHtcbiAgICAgICAgc2V0U3luY0lEKGdhbGxlcnlJbnN0YW5jZS5nZXRTeW5jSUQoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25TY3JvbGwoZXZ0KSB7XG4gICAgICAgIHVwZGF0ZUNvbnRyb2xTdGF0ZXMoKTtcbiAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KGV2dC5zY3JvbGxMZWZ0LCBldnQuc2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIHByZXZDb250cm9sRGl2ID0gbnVsbDtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChuZXh0Q29udHJvbERpdik7XG4gICAgICAgIG5leHRDb250cm9sRGl2ID0gbnVsbDtcbiAgICAgICAgc2Nyb2xsZXIuZGVzdHJveSh0cnVlKTtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCkge1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5QXR0cmlidXRlTWFwLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyRWwucmVtb3ZlQXR0cmlidXRlKHByb3BlcnR5QXR0cmlidXRlTWFwW3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZmlnLndpbmRvd1Jlc2l6ZSkge1xuICAgICAgICAgICAgZ2FsbGVyeURPTS51bmxpc3RlbkZvckV2ZW50KHdpbmRvdywgXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGNvbnRhaW5lckVsLCBcIm8tZ2FsbGVyeS0tanNcIik7XG4gICAgaWYgKGlzRGF0YVNvdXJjZSgpKSB7XG4gICAgICAgIGdhbGxlcnlET00uZW1wdHlFbGVtZW50KGNvbnRhaW5lckVsKTtcbiAgICAgICAgZ2FsbGVyeURPTS5hZGRDbGFzcyhjb250YWluZXJFbCwgXCJvLWdhbGxlcnlcIik7XG4gICAgICAgIGFsbEl0ZW1zRWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCk7XG4gICAgICAgIGl0ZW1FbHMgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zKGFsbEl0ZW1zRWwsIGNvbmZpZy5pdGVtcyk7XG4gICAgfVxuICAgIGNvbmZpZyA9IGV4dGVuZE9iamVjdHMoW2RlZmF1bHRDb25maWcsIGdhbGxlcnlET00uZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzKGNvbnRhaW5lckVsLCBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCksIGNvbmZpZ10pO1xuICAgIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCk7XG4gICAgYWxsSXRlbXNFbCA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICBpdGVtRWxzID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG4gICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBnZXRTZWxlY3RlZEl0ZW0oKTtcbiAgICBzaG93bkl0ZW1JbmRleCA9IHNlbGVjdGVkSXRlbUluZGV4O1xuICAgIGlmIChjb25maWcud2luZG93UmVzaXplKSB7XG4gICAgICAgIGdhbGxlcnlET00ubGlzdGVuRm9yRXZlbnQod2luZG93LCBcInJlc2l6ZVwiLCByZXNpemVIYW5kbGVyKTtcbiAgICB9XG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQoc2VsZWN0ZWRJdGVtSW5kZXgpO1xuICAgIHNldFdpZHRocygpO1xuICAgIHNldENhcHRpb25TaXplcygpO1xuICAgIGlmIChzdXBwb3J0c0Nzc1RyYW5zZm9ybXMoKSkge1xuICAgICAgICBzY3JvbGxlciA9IG5ldyBGVFNjcm9sbGVyKGNvbnRhaW5lckVsLCB7XG4gICAgICAgICAgICBzY3JvbGxiYXJzOiBmYWxzZSxcbiAgICAgICAgICAgIHNjcm9sbGluZ1k6IGZhbHNlLFxuICAgICAgICAgICAgdXBkYXRlT25XaW5kb3dSZXNpemU6IHRydWUsXG4gICAgICAgICAgICBzbmFwcGluZzogIWNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSxcbiAgICAgICAgICAgIC8qIENhbid0IHVzZSBmbGluZy9pbmVydGlhbCBzY3JvbGwgYXMgYWZ0ZXIgdXNlciBpbnB1dCBpcyBmaW5pc2hlZCBhbmQgc2Nyb2xsIGNvbnRpbnVlcywgc2Nyb2xsIGV2ZW50cyBhcmUgbm9cbiAgICAgICAgICAgICBsb25nZXIgZmlyZWQsIGFuZCB2YWx1ZSBvZiBzY3JvbGxMZWZ0IGRvZXNuJ3QgY2hhbmdlIHVudGlsIHNjcm9sbGVuZC4gKi9cbiAgICAgICAgICAgIGZsaW5naW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGRpc2FibGVkSW5wdXRNZXRob2RzOiB7XG4gICAgICAgICAgICAgICAgdG91Y2g6ICFjb25maWcudG91Y2gsXG4gICAgICAgICAgICAgICAgc2Nyb2xsOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBzY3JvbGxlci5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlU2Nyb2xsKTtcbiAgICAgICAgICAgIGRlYm91bmNlU2Nyb2xsID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgb25TY3JvbGwoZXZ0KTtcbiAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNjcm9sbGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxlbmRcIiwgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBvblNjcm9sbChldnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2Nyb2xsZXIuYWRkRXZlbnRMaXN0ZW5lcihcInNlZ21lbnR3aWxsY2hhbmdlXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCFjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHNjcm9sbGVyLmN1cnJlbnRTZWdtZW50LngsIGZhbHNlLCBcInVzZXJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNjcm9sbGVyID0gbmV3IFNpbXBsZVNjcm9sbGVyKGNvbnRhaW5lckVsLCB7fSk7XG4gICAgfVxuICAgIHZpZXdwb3J0RWwgPSBzY3JvbGxlci5jb250ZW50Q29udGFpbmVyTm9kZS5wYXJlbnROb2RlO1xuICAgIGdhbGxlcnlET00uYWRkQ2xhc3Modmlld3BvcnRFbCwgXCJvLWdhbGxlcnlfX3ZpZXdwb3J0XCIpO1xuICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhzY3JvbGxlci5zY3JvbGxMZWZ0LCBzY3JvbGxlci5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICBzaG93SXRlbShzZWxlY3RlZEl0ZW1JbmRleCwgZmFsc2UpO1xuICAgIGFkZFVpQ29udHJvbHMoKTtcbiAgICB1cGRhdGVDb250cm9sU3RhdGVzKCk7XG4gICAgbGlzdGVuRm9yU3luY0V2ZW50cygpO1xuXG4gICAgdGhpcy5zaG93SXRlbSA9IHNob3dJdGVtO1xuICAgIHRoaXMuZ2V0U2VsZWN0ZWRJdGVtID0gZ2V0U2VsZWN0ZWRJdGVtO1xuICAgIHRoaXMuc2hvd1ByZXZJdGVtID0gc2hvd1ByZXZJdGVtO1xuICAgIHRoaXMuc2hvd05leHRJdGVtID0gc2hvd05leHRJdGVtO1xuICAgIHRoaXMuc2hvd1ByZXZQYWdlID0gc2hvd1ByZXZQYWdlO1xuICAgIHRoaXMuc2hvd05leHRQYWdlID0gc2hvd05leHRQYWdlO1xuICAgIHRoaXMuc2VsZWN0SXRlbSA9IHNlbGVjdEl0ZW07XG4gICAgdGhpcy5zZWxlY3RQcmV2SXRlbSA9IHNlbGVjdFByZXZJdGVtO1xuICAgIHRoaXMuc2VsZWN0TmV4dEl0ZW0gPSBzZWxlY3ROZXh0SXRlbTtcbiAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIHRoaXMucHJldiA9IHByZXY7XG4gICAgdGhpcy5nZXRTeW5jSUQgPSBnZXRTeW5jSUQ7XG4gICAgdGhpcy5zeW5jV2l0aCA9IHN5bmNXaXRoO1xuICAgIHRoaXMub25SZXNpemUgPSBvblJlc2l6ZTtcbiAgICB0aGlzLmRlc3Ryb3kgPSBkZXN0cm95O1xuXG4gICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlSZWFkeVwiLCB7XG4gICAgICAgIGdhbGxlcnk6IHRoaXNcbiAgICB9KTtcblxufVxuXG5HYWxsZXJ5LmNyZWF0ZUFsbEluID0gZnVuY3Rpb24oZWwsIGNvbmZpZykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBjb25mID0gY29uZmlnIHx8IHt9LFxuICAgICAgICBnRWxzLFxuICAgICAgICBnYWxsZXJpZXMgPSBbXTtcbiAgICBpZiAoZWwucXVlcnlTZWxlY3RvckFsbCkge1xuICAgICAgICBnRWxzID0gZWwucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLW8tY29tcG9uZW50PW8tZ2FsbGVyeV1cIik7XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gZ0Vscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGdhbGxlcmllcy5wdXNoKG5ldyBHYWxsZXJ5KGdFbHNbY10sIGNvbmYpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZ2FsbGVyaWVzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHYWxsZXJ5OyIsIi8qIGdsb2JhbCByZXF1aXJlLCBtb2R1bGUgKi9cblxudmFyIGdhbGxlcnlET00gPSByZXF1aXJlKCcuL2dhbGxlcnlET00nKTtcblxuLyoqXG4gKiBNaW1pY3MgRlRTY3JvbGxlciBpbiBzaW1wbGVzdCBwb3NzaWJsZSB3YXkgKHdpdGhvdXQgdG91Y2ggaW50ZXJmYWNlLCB0cmFuc2l0aW9ucyBvciBldmVudHMpXG4gKiBJbnRlbmRlZCBmb3IgSUU4IHBhcnRpY3VsYXJseS5cbiAqL1xuXG5mdW5jdGlvbiBTaW1wbGVTY3JvbGxlcihjb250YWluZXJFbCwgY29uZmlnKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBhbGxJdGVtc0VsLFxuICAgICAgICB2aWV3cG9ydEVsO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlUHJvcGVydGllcygpIHtcbiAgICAgICAgc2VsZi5zY3JvbGxMZWZ0ID0gdmlld3BvcnRFbC5zY3JvbGxMZWZ0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjcm9sbFRvKG4pIHtcbiAgICAgICAgdmlld3BvcnRFbC5zY3JvbGxMZWZ0ID0gbjtcbiAgICAgICAgdXBkYXRlUHJvcGVydGllcygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gICAgICAgIGdhbGxlcnlET00udW53cmFwRWxlbWVudCh2aWV3cG9ydEVsKTtcbiAgICB9XG5cbiAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignLm8tZ2FsbGVyeV9faXRlbXMnKTtcbiAgICB2aWV3cG9ydEVsID0gZ2FsbGVyeURPTS5jcmVhdGVFbGVtZW50KCdkaXYnLCAnJywgJ28tZ2FsbGVyeV9fdmlld3BvcnQnKTtcbiAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZCh2aWV3cG9ydEVsKTtcbiAgICBnYWxsZXJ5RE9NLndyYXBFbGVtZW50KGFsbEl0ZW1zRWwsIHZpZXdwb3J0RWwpO1xuICAgIHVwZGF0ZVByb3BlcnRpZXMoKTtcblxuICAgIHRoaXMuY29udGVudENvbnRhaW5lck5vZGUgPSBhbGxJdGVtc0VsO1xuICAgIHRoaXMuc2Nyb2xsVG8gPSBzY3JvbGxUbztcbiAgICB0aGlzLmRlc3Ryb3kgPSBkZXN0cm95O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2ltcGxlU2Nyb2xsZXI7IiwiLypnbG9iYWwgbW9kdWxlKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGVtcHR5RWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHdoaWxlICh0YXJnZXRFbC5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhcmdldEVsLnJlbW92ZUNoaWxkKHRhcmdldEVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudChub2RlTmFtZSwgY29udGVudCwgY2xhc3Nlcykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZU5hbWUpO1xuICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgY2xhc3Nlcyk7XG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiB3cmFwRWxlbWVudCh0YXJnZXRFbCwgd3JhcEVsKSB7XG4gICAgdmFyIHBhcmVudEVsID0gdGFyZ2V0RWwucGFyZW50Tm9kZTtcbiAgICB3cmFwRWwuYXBwZW5kQ2hpbGQodGFyZ2V0RWwpO1xuICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKHdyYXBFbCk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcEVsZW1lbnQodGFyZ2V0RWwpIHtcbiAgICB2YXIgd3JhcHBpbmdFbCA9IHRhcmdldEVsLnBhcmVudE5vZGUsXG4gICAgICAgIHdyYXBwaW5nRWxQYXJlbnQgPSB3cmFwcGluZ0VsLnBhcmVudE5vZGU7XG4gICAgd2hpbGUgKHdyYXBwaW5nRWwuY2hpbGROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHdyYXBwaW5nRWxQYXJlbnQuYXBwZW5kQ2hpbGQod3JhcHBpbmdFbC5jaGlsZE5vZGVzWzBdKTtcbiAgICB9XG4gICAgd3JhcHBpbmdFbFBhcmVudC5yZW1vdmVDaGlsZCh3cmFwcGluZ0VsKTtcbn1cblxuZnVuY3Rpb24gaGFzQ2xhc3MoZWwsIGMpIHtcbiAgICByZXR1cm4gKCcgJyArIGVsLmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignICcgKyBjICsgJyAnKSA+IC0xO1xufVxuXG5mdW5jdGlvbiBhZGRDbGFzcyhlbCwgYykge1xuICAgIGlmICghaGFzQ2xhc3MoZWwsIGMpKSB7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZSArIFwiIFwiICsgYztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNsYXNzKGVsLCBjKSB7XG4gICAgaWYgKGhhc0NsYXNzKGVsLCBjKSkge1xuICAgICAgICB2YXIgcmVnID0gbmV3IFJlZ0V4cCgnKFxcXFxzfF4pJyArIGMgKyAnKFxcXFxzfCQpJyk7XG4gICAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKHJlZywnICcpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKSB7XG4gICAgdmFyIGl0ZW1zTGlzdCA9IGNyZWF0ZUVsZW1lbnQoXCJvbFwiLCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbXNcIik7XG4gICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoaXRlbXNMaXN0KTtcbiAgICByZXR1cm4gaXRlbXNMaXN0O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtcyhjb250YWluZXJFbCwgaXRlbXMpIHtcbiAgICB2YXIgaXRlbUNsYXNzO1xuICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbXMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgIGl0ZW1DbGFzcyA9IFwiby1nYWxsZXJ5X19pdGVtXCIgKyAoKGl0ZW1zW2NdLnNlbGVjdGVkKSA/IFwiIG8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIiA6IFwiXCIgKTtcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoY3JlYXRlRWxlbWVudChcImxpXCIsIFwiJm5ic3A7XCIsIGl0ZW1DbGFzcykpO1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG59XG5cbmZ1bmN0aW9uIGluc2VydEl0ZW1Db250ZW50KGNvbmZpZywgaXRlbSwgaXRlbUVsKSB7XG4gICAgZW1wdHlFbGVtZW50KGl0ZW1FbCk7XG4gICAgdmFyIGNvbnRlbnRFbCA9IGNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgaXRlbS5jb250ZW50LCBcIm8tZ2FsbGVyeV9faXRlbV9fY29udGVudFwiKTtcbiAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKTtcbiAgICBpZiAoY29uZmlnLmNhcHRpb25zKSB7XG4gICAgICAgIHZhciBjYXB0aW9uRWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uY2FwdGlvbiB8fCBcIlwiLCBcIm8tZ2FsbGVyeV9faXRlbV9fY2FwdGlvblwiKTtcbiAgICAgICAgaXRlbUVsLmFwcGVuZENoaWxkKGNhcHRpb25FbCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKG9iaiwgcHJvcE5hbWUsIGVsLCBhdHRyTmFtZSkge1xuICAgIHZhciB2ID0gZWwuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICBpZiAodiAhPT0gbnVsbCkge1xuICAgICAgICBpZiAodiA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgIHYgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgPT09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgdiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIG9ialtwcm9wTmFtZV0gPSB2O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzKGVsLCBtYXApIHtcbiAgICB2YXIgb2JqID0ge30sXG4gICAgICAgIHByb3A7XG4gICAgZm9yIChwcm9wIGluIG1hcCkge1xuICAgICAgICBpZiAobWFwLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBzZXRQcm9wZXJ0eUlmQXR0cmlidXRlRXhpc3RzKG9iaiwgcHJvcCwgZWwsIG1hcFtwcm9wXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mKGEsIHYpIHtcbiAgICB2YXIgaSA9IC0xO1xuICAgIGlmIChBcnJheS5wcm90b3R5cGUuaW5kZXhPZikge1xuICAgICAgICByZXR1cm4gYS5pbmRleE9mKHYpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gYS5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGlmIChhW2NdID09PSB2KSB7XG4gICAgICAgICAgICAgICAgaSA9IGM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyhlbCwgb2JqLCBtYXAsIGV4Y2wpIHtcbiAgICB2YXIgZXhjbHVkZSA9IGV4Y2wgfHwgW107XG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSAmJiBhcnJheUluZGV4T2YoZXhjbHVkZSwgcHJvcCkgPCAwKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobWFwW3Byb3BdLCBvYmpbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRDbG9zZXN0KGVsLCBjKSB7XG4gICAgd2hpbGUgKCFoYXNDbGFzcyhlbCwgYykgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gZ2V0RWxlbWVudEluZGV4KGVsKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlIChlbCA9IGVsLnByZXZpb3VzU2libGluZykge1xuICAgICAgICBpZiAoZWwubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICsraTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gbGlzdGVuRm9yRXZlbnQoZWwsIG5hbWUsIGhhbmRsZXIpIHtcbiAgICBpZiAoZWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGhhbmRsZXIsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKGVsLmF0dGFjaEV2ZW50KSB7XG4gICAgICAgIGVsLmF0dGFjaEV2ZW50KFwib25cIiArIG5hbWUsIGhhbmRsZXIpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdW5saXN0ZW5Gb3JFdmVudChlbCwgbmFtZSwgaGFuZGxlcikge1xuICAgIGlmIChlbC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgaGFuZGxlciwgZmFsc2UpO1xuICAgIH0gZWxzZSBpZiAoZWwuZGV0YWNoRXZlbnQpIHtcbiAgICAgICAgZWwuZGV0YWNoRXZlbnQoXCJvblwiICsgbmFtZSwgaGFuZGxlcik7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBlbXB0eUVsZW1lbnQ6IGVtcHR5RWxlbWVudCxcbiAgICBjcmVhdGVFbGVtZW50OiBjcmVhdGVFbGVtZW50LFxuICAgIHdyYXBFbGVtZW50OiB3cmFwRWxlbWVudCxcbiAgICB1bndyYXBFbGVtZW50OiB1bndyYXBFbGVtZW50LFxuICAgIGhhc0NsYXNzOiBoYXNDbGFzcyxcbiAgICBhZGRDbGFzczogYWRkQ2xhc3MsXG4gICAgcmVtb3ZlQ2xhc3M6IHJlbW92ZUNsYXNzLFxuICAgIGNyZWF0ZUl0ZW1zTGlzdDogY3JlYXRlSXRlbXNMaXN0LFxuICAgIGNyZWF0ZUl0ZW1zOiBjcmVhdGVJdGVtcyxcbiAgICBpbnNlcnRJdGVtQ29udGVudDogaW5zZXJ0SXRlbUNvbnRlbnQsXG4gICAgc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzOiBzZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXMsXG4gICAgZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzOiBnZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXMsXG4gICAgZ2V0Q2xvc2VzdDogZ2V0Q2xvc2VzdCxcbiAgICBnZXRFbGVtZW50SW5kZXg6IGdldEVsZW1lbnRJbmRleCxcbiAgICBsaXN0ZW5Gb3JFdmVudDogbGlzdGVuRm9yRXZlbnQsXG4gICAgdW5saXN0ZW5Gb3JFdmVudDogdW5saXN0ZW5Gb3JFdmVudFxufTsiXX0=
