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
        },
        allowTransitions = false;

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
        if (scroller.scrollLeft > 0) {
            galleryDOM.addClass(prevControlDiv, "o-gallery__control--show");
        } else {
            galleryDOM.removeClass(prevControlDiv, "o-gallery__control--show");
        }
        if (scroller.scrollLeft < allItemsEl.clientWidth - viewportEl.clientWidth) {
            galleryDOM.addClass(nextControlDiv, "o-gallery__control--show");
        } else {
            galleryDOM.removeClass(nextControlDiv, "o-gallery__control--show");
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

    function moveViewport(left) {
        scroller.scrollTo(left, 0, (allowTransitions) ? true : 0);
        insertItemContent(getItemsInPageView(left, left + viewportEl.clientWidth, false));
    }

    function alignItemLeft(n) {
        moveViewport(itemEls[n].offsetLeft);
    }

    function alignItemRight(n) {
        var newScrollLeft = itemEls[n].offsetLeft - (viewportEl.clientWidth - itemEls[n].clientWidth);
        moveViewport(newScrollLeft);
    }

    function bringItemIntoView(n) {
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
            alignItemLeft(n);
        } else if (itemR > viewportR) {
            alignItemRight(n);
        }
    }

    function showItem(n) {
        if (isValidItem(n)) {
            bringItemIntoView(n);
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
        if (scroller.scrollLeft > 0) {
            var prevPageWholeItems = getItemsInPageView(scroller.scrollLeft - viewportEl.clientWidth, scroller.scrollLeft),
                prevPageItem = prevPageWholeItems.pop() || 0;
            alignItemRight(prevPageItem);
        }
    }

    function showNextPage() {
        if (scroller.scrollLeft < allItemsEl.clientWidth - viewportEl.clientWidth) {
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
            showItem(shownItemIndex);
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
    addUiControls();
    showItem(selectedItemIndex);
    if (config.multipleItemsPerPage === true) {
        allowTransitions = true;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvZGVtby1zcmMvZGVjbGFyYXRpdmUuanMiLCIvVXNlcnMvZGFuc2VhcmxlL1dvcmtzcGFjZS9GVC9PcmlnYW1pL28tZ2FsbGVyeS9tYWluLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbm9kZV9tb2R1bGVzL0ZUU2Nyb2xsZXIvbGliL2Z0c2Nyb2xsZXIuanMiLCIvVXNlcnMvZGFuc2VhcmxlL1dvcmtzcGFjZS9GVC9PcmlnYW1pL28tZ2FsbGVyeS9zcmMvanMvR2FsbGVyeS5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9TaW1wbGVTY3JvbGxlci5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L3NyYy9qcy9nYWxsZXJ5RE9NLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdnNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qZ2xvYmFsIHJlcXVpcmUsIGNvbnNvbGUgKi9cbnZhciBHYWxsZXJ5ID0gcmVxdWlyZSgnLi8uLi9tYWluLmpzJyk7XG5cbmlmIChkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5UmVhZHlcIiwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBjb25zb2xlLmxvZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdhbGxlcnkgcmVhZHlcIiwgZXZ0LmdhbGxlcnkpO1xuICAgICAgICAgICAgcGFyZW50ICYmIHBhcmVudC5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Jlc2l6ZScsXG4gICAgICAgICAgICAgICAgdXJsOiBsb2NhdGlvbi5ocmVmLFxuICAgICAgICAgICAgICAgIGhlaWdodDogZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHRcbiAgICAgICAgICAgIH0pLCAnKicpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbndpbmRvdy5nYWxsZXJpZXMgPSBHYWxsZXJ5LmNyZWF0ZUFsbEluKGRvY3VtZW50LmJvZHkpO1xuIiwiLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvanMvR2FsbGVyeScpOyIsIi8qKlxyXG4gKiBGVFNjcm9sbGVyOiB0b3VjaCBhbmQgbW91c2UtYmFzZWQgc2Nyb2xsaW5nIGZvciBET00gZWxlbWVudHMgbGFyZ2VyIHRoYW4gdGhlaXIgY29udGFpbmVycy5cclxuICpcclxuICogV2hpbGUgdGhpcyBpcyBhIHJld3JpdGUsIGl0IGlzIGhlYXZpbHkgaW5zcGlyZWQgYnkgdHdvIHByb2plY3RzOlxyXG4gKiAxKSBVeGVidSBUb3VjaFNjcm9sbCAoaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkYXVyZWxpby9Ub3VjaFNjcm9sbCksIEJTRCBsaWNlbnNlZDpcclxuICogICAgQ29weXJpZ2h0IChjKSAyMDEwIHV4ZWJ1IENvbnN1bHRpbmcgTHRkLiAmIENvLiBLR1xyXG4gKiAgICBDb3B5cmlnaHQgKGMpIDIwMTAgRGF2aWQgQXVyZWxpb1xyXG4gKiAyKSBaeW5nYSBTY3JvbGxlciAoaHR0cHM6Ly9naXRodWIuY29tL3p5bmdhL3Njcm9sbGVyKSwgTUlUIGxpY2Vuc2VkOlxyXG4gKiAgICBDb3B5cmlnaHQgMjAxMSwgWnluZ2EgSW5jLlxyXG4gKiAgICBDb3B5cmlnaHQgMjAxMSwgRGV1dHNjaGUgVGVsZWtvbSBBR1xyXG4gKlxyXG4gKiBJbmNsdWRlcyBDdWJpY0JlemllcjpcclxuICpcclxuICogQ29weXJpZ2h0IChDKSAyMDA4IEFwcGxlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cclxuICogQ29weXJpZ2h0IChDKSAyMDEwIERhdmlkIEF1cmVsaW8uIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXHJcbiAqIENvcHlyaWdodCAoQykgMjAxMCB1eGVidSBDb25zdWx0aW5nIEx0ZC4gJiBDby4gS0cuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXHJcbiAqXHJcbiAqIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxyXG4gKiBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnNcclxuICogYXJlIG1ldDpcclxuICogMS4gUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcclxuICogICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxyXG4gKiAyLiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodFxyXG4gKiAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXHJcbiAqICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXHJcbiAqXHJcbiAqIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgQVBQTEUgSU5DLiwgREFWSUQgQVVSRUxJTywgQU5EIFVYRUJVXHJcbiAqIENPTlNVTFRJTkcgTFRELiAmIENPLiBLRyBgYEFTIElTJycgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRURcclxuICogV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRSBJTVBMSUVEIFdBUlJBTlRJRVMgT0ZcclxuICogTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC5cclxuICogSU4gTk8gRVZFTlQgU0hBTEwgQVBQTEUgSU5DLiBPUiBDT05UUklCVVRPUlMgQkUgTElBQkxFIEZPUiBBTlkgRElSRUNULFxyXG4gKiBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcclxuICogKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SXHJcbiAqIFNFUlZJQ0VTOyBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKVxyXG4gKiBIT1dFVkVSIENBVVNFRCBBTkQgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsXHJcbiAqIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lOR1xyXG4gKiBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GIFRISVMgU09GVFdBUkUsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEVcclxuICogUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXHJcbiAqXHJcbiAqIEBjb3B5cmlnaHQgVGhlIEZpbmFuY2lhbCBUaW1lcyBMdGQgW0FsbCByaWdodHMgcmVzZXJ2ZWRdXHJcbiAqIEBjb2RpbmdzdGFuZGFyZCBmdGxhYnMtanNsaW50XHJcbiAqIEB2ZXJzaW9uIDAuMy4wXHJcbiAqL1xyXG4vKipcclxuICogQGxpY2Vuc2UgRlRTY3JvbGxlciBpcyAoYykgMjAxMiBUaGUgRmluYW5jaWFsIFRpbWVzIEx0ZCBbQWxsIHJpZ2h0cyByZXNlcnZlZF0gYW5kIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cclxuICpcclxuICogSW5zcGlyZWQgYnkgVXhlYnUgVG91Y2hTY3JvbGwsIChjKSAyMDEwIHV4ZWJ1IENvbnN1bHRpbmcgTHRkLiAmIENvLiBLRyBhbmQgRGF2aWQgQXVyZWxpbywgd2hpY2ggaXMgQlNEIGxpY2Vuc2VkIChodHRwczovL2dpdGh1Yi5jb20vZGF2aWRhdXJlbGlvL1RvdWNoU2Nyb2xsKVxyXG4gKiBJbnNwaXJlZCBieSBaeW5nYSBTY3JvbGxlciwgKGMpIDIwMTEgWnluZ2EgSW5jIGFuZCBEZXV0c2NoZSBUZWxla29tIEFHLCB3aGljaCBpcyBNSVQgbGljZW5zZWQgKGh0dHBzOi8vZ2l0aHViLmNvbS96eW5nYS9zY3JvbGxlcilcclxuICogSW5jbHVkZXMgQ3ViaWNCZXppZXIsIChjKSAyMDA4IEFwcGxlIEluYyBbQWxsIHJpZ2h0cyByZXNlcnZlZF0sIChjKSAyMDEwIERhdmlkIEF1cmVsaW8gYW5kIHV4ZWJ1IENvbnN1bHRpbmcgTHRkLiAmIENvLiBLRy4gW0FsbCByaWdodHMgcmVzZXJ2ZWRdLCB3aGljaCBpcyAyLWNsYXVzZSBCU0QgbGljZW5zZWQgKHNlZSBhYm92ZSBvciBodHRwczovL2dpdGh1Yi5jb20vZGF2aWRhdXJlbGlvL1RvdWNoU2Nyb2xsKS5cclxuICovXHJcblxyXG4vKmpzbGludCBub21lbjogdHJ1ZSwgdmFyczogdHJ1ZSwgYnJvd3NlcjogdHJ1ZSwgY29udGludWU6IHRydWUsIHdoaXRlOiB0cnVlKi9cclxuLypnbG9iYWxzIEZUU2Nyb2xsZXJPcHRpb25zKi9cclxuXHJcbnZhciBGVFNjcm9sbGVyLCBDdWJpY0JlemllcjtcclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHQvLyBHbG9iYWwgZmxhZyB0byBkZXRlcm1pbmUgaWYgYW55IHNjcm9sbCBpcyBjdXJyZW50bHkgYWN0aXZlLiAgVGhpcyBwcmV2ZW50c1xyXG5cdC8vIGlzc3VlcyB3aGVuIHVzaW5nIG11bHRpcGxlIHNjcm9sbGVycywgcGFydGljdWxhcmx5IHdoZW4gdGhleSdyZSBuZXN0ZWQuXHJcblx0dmFyIF9mdHNjcm9sbGVyTW92aW5nID0gZmFsc2U7XHJcblxyXG5cdC8vIERldGVybWluZSB3aGV0aGVyIHBvaW50ZXIgZXZlbnRzIG9yIHRvdWNoIGV2ZW50cyBjYW4gYmUgdXNlZFxyXG5cdHZhciBfdHJhY2tQb2ludGVyRXZlbnRzID0gd2luZG93Lm5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkO1xyXG5cdGlmICgncHJvcGVydHlJc0VudW1lcmFibGUnIGluIHdpbmRvdyB8fCAnaGFzT3duUHJvcGVydHknIGluIHdpbmRvdy5kb2N1bWVudCkge1xyXG5cdFx0dmFyIF90cmFja1RvdWNoRXZlbnRzID0gIV90cmFja1BvaW50ZXJFdmVudHMgJiYgKHdpbmRvdy5wcm9wZXJ0eUlzRW51bWVyYWJsZSgnb250b3VjaHN0YXJ0JykgfHwgd2luZG93LmRvY3VtZW50Lmhhc093blByb3BlcnR5KCdvbnRvdWNoc3RhcnQnKSk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHZhciBfdHJhY2tUb3VjaEV2ZW50cyA9IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gRGV0ZXJtaW5lIHdoZXRoZXIgdG8gdXNlIG1vZGVybiBoYXJkd2FyZSBhY2NlbGVyYXRpb24gcnVsZXMgb3IgZHluYW1pYy90b2dnbGVhYmxlIHJ1bGVzLlxyXG5cdC8vIENlcnRhaW4gb2xkZXIgYnJvd3NlcnMgLSBwYXJ0aWN1bGFybHkgQW5kcm9pZCBicm93c2VycyAtIGhhdmUgcHJvYmxlbXMgd2l0aCBoYXJkd2FyZVxyXG5cdC8vIGFjY2VsZXJhdGlvbiwgc28gYmVpbmcgYWJsZSB0byB0b2dnbGUgdGhlIGJlaGF2aW91ciBkeW5hbWljYWxseSB2aWEgYSBDU1MgY2FzY2FkZSBpcyBkZXNpcmFibGUuXHJcblx0aWYgKCdoYXNPd25Qcm9wZXJ0eScgaW4gd2luZG93KSB7XHJcblx0XHR2YXIgX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiA9ICF3aW5kb3cuaGFzT3duUHJvcGVydHkoJ0FycmF5QnVmZmVyJyk7XHJcblx0fSBlbHNlIHtcclxuXHRcdHZhciBfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHQvLyBGZWF0dXJlIGRldGVjdGlvblxyXG5cdHZhciBfY2FuQ2xlYXJTZWxlY3Rpb24gPSAod2luZG93LlNlbGVjdGlvbiAmJiB3aW5kb3cuU2VsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVBbGxSYW5nZXMpO1xyXG5cclxuXHQvLyBEZXRlcm1pbmUgdGhlIGJyb3dzZXIgZW5naW5lIGFuZCBwcmVmaXgsIHRyeWluZyB0byB1c2UgdGhlIHVucHJlZml4ZWQgdmVyc2lvbiB3aGVyZSBhdmFpbGFibGUuXHJcblx0dmFyIF92ZW5kb3JDU1NQcmVmaXgsIF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4LCBfdmVuZG9yVHJhbnNmb3JtTG9va3VwO1xyXG5cdGlmIChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZS50cmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0X3ZlbmRvckNTU1ByZWZpeCA9ICcnO1xyXG5cdFx0X3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPSAnJztcclxuXHRcdF92ZW5kb3JUcmFuc2Zvcm1Mb29rdXAgPSAndHJhbnNmb3JtJztcclxuXHR9IGVsc2UgaWYgKHdpbmRvdy5vcGVyYSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93Lm9wZXJhKSA9PT0gJ1tvYmplY3QgT3BlcmFdJykge1xyXG5cdFx0X3ZlbmRvckNTU1ByZWZpeCA9ICctby0nO1xyXG5cdFx0X3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPSAnTyc7XHJcblx0XHRfdmVuZG9yVHJhbnNmb3JtTG9va3VwID0gJ09UcmFuc2Zvcm0nO1xyXG5cdH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLk1velRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRfdmVuZG9yQ1NTUHJlZml4ID0gJy1tb3otJztcclxuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJ01veic7XHJcblx0XHRfdmVuZG9yVHJhbnNmb3JtTG9va3VwID0gJ01velRyYW5zZm9ybSc7XHJcblx0fSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUud2Via2l0VHJhbnNmb3JtICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnLXdlYmtpdC0nO1xyXG5cdFx0X3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPSAnd2Via2l0JztcclxuXHRcdF92ZW5kb3JUcmFuc2Zvcm1Mb29rdXAgPSAnLXdlYmtpdC10cmFuc2Zvcm0nO1xyXG5cdH0gZWxzZSBpZiAodHlwZW9mIG5hdmlnYXRvci5jcHVDbGFzcyA9PT0gJ3N0cmluZycpIHtcclxuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnLW1zLSc7XHJcblx0XHRfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA9ICdtcyc7XHJcblx0XHRfdmVuZG9yVHJhbnNmb3JtTG9va3VwID0gJy1tcy10cmFuc2Zvcm0nO1xyXG5cdH1cclxuXHJcblx0Ly8gSWYgaGFyZHdhcmUgYWNjZWxlcmF0aW9uIGlzIHVzaW5nIHRoZSBzdGFuZGFyZCBwYXRoLCBidXQgcGVyc3BlY3RpdmUgZG9lc24ndCBzZWVtIHRvIGJlIHN1cHBvcnRlZCxcclxuXHQvLyAzRCB0cmFuc2Zvcm1zIGxpa2VseSBhcmVuJ3Qgc3VwcG9ydGVkIGVpdGhlclxyXG5cdGlmICghX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiAmJiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKS5zdHlsZVtfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCArIChfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA/ICdQJyA6ICdwJykgKyAnZXJzcGVjdGl2ZSddID09PSB1bmRlZmluZWQpIHtcclxuXHRcdF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPSB0cnVlO1xyXG5cdH1cclxuXHJcblx0Ly8gU3R5bGUgcHJlZml4ZXNcclxuXHR2YXIgX3RyYW5zZm9ybVByb3BlcnR5ID0gX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggKyAoX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPyAnVCcgOiAndCcpICsgJ3JhbnNmb3JtJztcclxuXHR2YXIgX3RyYW5zaXRpb25Qcm9wZXJ0eSA9IF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ICsgKF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID8gJ1QnIDogJ3QnKSArICdyYW5zaXRpb24nO1xyXG5cdHZhciBfdHJhbnNsYXRlUnVsZVByZWZpeCA9IF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPyAndHJhbnNsYXRlKCcgOiAndHJhbnNsYXRlM2QoJztcclxuXHR2YXIgX3RyYW5zZm9ybVByZWZpeGVzID0geyB4OiAnJywgeTogJzAsJyB9O1xyXG5cdHZhciBfdHJhbnNmb3JtU3VmZml4ZXMgPSB7IHg6ICcsMCcgKyAoX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiA/ICcpJyA6ICcsMCknKSwgeTogKF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPyAnKScgOiAnLDApJykgfTtcclxuXHJcblx0Ly8gQ29uc3RhbnRzLiAgTm90ZSB0aGF0IHRoZSBiZXppZXIgY3VydmUgc2hvdWxkIGJlIGNoYW5nZWQgYWxvbmcgd2l0aCB0aGUgZnJpY3Rpb24hXHJcblx0dmFyIF9rRnJpY3Rpb24gPSAwLjk5ODtcclxuXHR2YXIgX2tNaW5pbXVtU3BlZWQgPSAwLjAxO1xyXG5cclxuXHQvLyBDcmVhdGUgYSBnbG9iYWwgc3R5bGVzaGVldCB0byBzZXQgdXAgc3R5bGVzaGVldCBydWxlcyBhbmQgdHJhY2sgZHluYW1pYyBlbnRyaWVzXHJcblx0KGZ1bmN0aW9uICgpIHtcclxuXHRcdHZhciBzdHlsZXNoZWV0Q29udGFpbmVyTm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xyXG5cdFx0dmFyIG5ld1N0eWxlTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcblx0XHR2YXIgaGFyZHdhcmVBY2NlbGVyYXRpb25SdWxlO1xyXG5cdFx0dmFyIF9zdHlsZVRleHQ7XHJcblx0XHRuZXdTdHlsZU5vZGUudHlwZSA9ICd0ZXh0L2Nzcyc7XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIHRoZSBoYXJkd2FyZSBhY2NlbGVyYXRpb24gbG9naWMgdG8gdXNlXHJcblx0XHRpZiAoX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbikge1xyXG5cdFx0XHRoYXJkd2FyZUFjY2VsZXJhdGlvblJ1bGUgPSBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7JztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGhhcmR3YXJlQWNjZWxlcmF0aW9uUnVsZSA9IF92ZW5kb3JDU1NQcmVmaXggKyAndHJhbnNmb3JtOiB0cmFuc2xhdGVaKDApOyc7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIG91ciBydWxlc1xyXG5cdFx0X3N0eWxlVGV4dCA9IFtcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX2NvbnRhaW5lciB7IG92ZXJmbG93OiBoaWRkZW47IHBvc2l0aW9uOiByZWxhdGl2ZTsgbWF4LWhlaWdodDogMTAwJTsgLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOiByZ2JhKDAsIDAsIDAsIDApOyAtbXMtdG91Y2gtYWN0aW9uOiBub25lIH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfaHdhY2NlbGVyYXRlZCB7ICcgKyBoYXJkd2FyZUFjY2VsZXJhdGlvblJ1bGUgICsgJyB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX3gsIC5mdHNjcm9sbGVyX3kgeyBwb3NpdGlvbjogcmVsYXRpdmU7IG1pbi13aWR0aDogMTAwJTsgbWluLWhlaWdodDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbiB9JyxcclxuXHRcdFx0Jy5mdHNjcm9sbGVyX3ggeyBkaXNwbGF5OiBpbmxpbmUtYmxvY2sgfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl9zY3JvbGxiYXIgeyBwb2ludGVyLWV2ZW50czogbm9uZTsgcG9zaXRpb246IGFic29sdXRlOyB3aWR0aDogNXB4OyBoZWlnaHQ6IDVweDsgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KTsgLXdlYmtpdC1ib3JkZXItcmFkaXVzOiAzcHg7IGJvcmRlci1yYWRpdXM6IDZweDsgb3BhY2l0eTogMDsgJyArIF92ZW5kb3JDU1NQcmVmaXggKyAndHJhbnNpdGlvbjogb3BhY2l0eSAzNTBtczsgei1pbmRleDogMTA7IC13ZWJraXQtYm94LXNpemluZzogY29udGVudC1ib3g7IC1tb3otYm94LXNpemluZzogY29udGVudC1ib3g7IGJveC1zaXppbmc6IGNvbnRlbnQtYm94IH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyeCB7IGJvdHRvbTogMnB4OyBsZWZ0OiAycHggfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl9zY3JvbGxiYXJ5IHsgcmlnaHQ6IDJweDsgdG9wOiAycHggfScsXHJcblx0XHRcdCcuZnRzY3JvbGxlcl9zY3JvbGxiYXJpbm5lciB7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwwLjUpOyAtd2Via2l0LWJvcmRlci1yYWRpdXM6IDJweDsgYm9yZGVyLXJhZGl1czogNHB4IC8gNnB4IH0nLFxyXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyLmFjdGl2ZSB7IG9wYWNpdHk6IDE7ICcgKyBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zaXRpb246IG5vbmU7IC1vLXRyYW5zaXRpb246IGFsbCAwIG5vbmUgfSdcclxuXHRcdF07XHJcblxyXG5cdFx0aWYgKG5ld1N0eWxlTm9kZS5zdHlsZVNoZWV0KSB7XHJcblx0XHRcdG5ld1N0eWxlTm9kZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBfc3R5bGVUZXh0LmpvaW4oJ1xcbicpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bmV3U3R5bGVOb2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKF9zdHlsZVRleHQuam9pbignXFxuJykpKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgdGhlIHN0eWxlc2hlZXRcclxuXHRcdHN0eWxlc2hlZXRDb250YWluZXJOb2RlLmluc2VydEJlZm9yZShuZXdTdHlsZU5vZGUsIHN0eWxlc2hlZXRDb250YWluZXJOb2RlLmZpcnN0Q2hpbGQpO1xyXG5cdH0oKSk7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1hc3RlciBjb25zdHJ1Y3RvciBmb3IgdGhlIHNjcm9sbGluZyBmdW5jdGlvbiwgaW5jbHVkaW5nIHdoaWNoIGVsZW1lbnQgdG9cclxuXHQgKiBjb25zdHJ1Y3QgdGhlIHNjcm9sbGVyIGluLCBhbmQgYW55IHNjcm9sbGluZyBvcHRpb25zLlxyXG5cdCAqIE5vdGUgdGhhdCBhcHAtd2lkZSBvcHRpb25zIGNhbiBhbHNvIGJlIHNldCB1c2luZyBhIGdsb2JhbCBGVFNjcm9sbGVyT3B0aW9uc1xyXG5cdCAqIG9iamVjdC5cclxuXHQgKi9cclxuXHRGVFNjcm9sbGVyID0gZnVuY3Rpb24gKGRvbU5vZGUsIG9wdGlvbnMpIHtcclxuXHRcdHZhciBrZXk7XHJcblx0XHR2YXIgZGVzdHJveSwgc2V0U25hcFNpemUsIHNjcm9sbFRvLCBzY3JvbGxCeSwgdXBkYXRlRGltZW5zaW9ucywgYWRkRXZlbnRMaXN0ZW5lciwgcmVtb3ZlRXZlbnRMaXN0ZW5lciwgX3N0YXJ0U2Nyb2xsLCBfdXBkYXRlU2Nyb2xsLCBfZW5kU2Nyb2xsLCBfZmluYWxpemVTY3JvbGwsIF9pbnRlcnJ1cHRTY3JvbGwsIF9mbGluZ1Njcm9sbCwgX3NuYXBTY3JvbGwsIF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzLCBfZ2V0U25hcEluZGV4Rm9yUG9zaXRpb24sIF9saW1pdFRvQm91bmRzLCBfaW5pdGlhbGl6ZURPTSwgX2V4aXN0aW5nRE9NVmFsaWQsIF9kb21DaGFuZ2VkLCBfdXBkYXRlRGltZW5zaW9ucywgX3VwZGF0ZVNjcm9sbGJhckRpbWVuc2lvbnMsIF91cGRhdGVFbGVtZW50UG9zaXRpb24sIF91cGRhdGVTZWdtZW50cywgX3NldEF4aXNQb3NpdGlvbiwgX2dldFBvc2l0aW9uLCBfc2NoZWR1bGVBeGlzUG9zaXRpb24sIF9maXJlRXZlbnQsIF9jaGlsZEZvY3VzZWQsIF9tb2RpZnlEaXN0YW5jZUJleW9uZEJvdW5kcywgX2Rpc3RhbmNlc0JleW9uZEJvdW5kcywgX3N0YXJ0QW5pbWF0aW9uLCBfc2NoZWR1bGVSZW5kZXIsIF9jYW5jZWxBbmltYXRpb24sIF90b2dnbGVFdmVudEhhbmRsZXJzLCBfb25Ub3VjaFN0YXJ0LCBfb25Ub3VjaE1vdmUsIF9vblRvdWNoRW5kLCBfb25Nb3VzZURvd24sIF9vbk1vdXNlTW92ZSwgX29uTW91c2VVcCwgX29uUG9pbnRlckRvd24sIF9vblBvaW50ZXJNb3ZlLCBfb25Qb2ludGVyVXAsIF9vblBvaW50ZXJDYW5jZWwsIF9vblBvaW50ZXJDYXB0dXJlRW5kLCBfb25DbGljaywgX29uTW91c2VTY3JvbGwsIF9jYXB0dXJlSW5wdXQsIF9yZWxlYXNlSW5wdXRDYXB0dXJlLCBfZ2V0Qm91bmRpbmdSZWN0O1xyXG5cclxuXHJcblx0XHQvKiBOb3RlIHRoYXQgYWN0dWFsIG9iamVjdCBpbnN0YW50aWF0aW9uIG9jY3VycyBhdCB0aGUgZW5kIG9mIHRoZSBjbG9zdXJlIHRvIGF2b2lkIGpzbGludCBlcnJvcnMgKi9cclxuXHJcblxyXG5cdFx0LyogICAgICAgICAgICAgICAgICAgICAgICAgT3B0aW9ucyAgICAgICAgICAgICAgICAgICAgICAgKi9cclxuXHJcblx0XHR2YXIgX2luc3RhbmNlT3B0aW9ucyA9IHtcclxuXHJcblx0XHRcdC8vIFdoZXRoZXIgdG8gZGlzcGxheSBzY3JvbGxiYXJzIGFzIGFwcHJvcHJpYXRlXHJcblx0XHRcdHNjcm9sbGJhcnM6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBFbmFibGUgc2Nyb2xsaW5nIG9uIHRoZSBYIGF4aXMgaWYgY29udGVudCBpcyBhdmFpbGFibGVcclxuXHRcdFx0c2Nyb2xsaW5nWDogdHJ1ZSxcclxuXHJcblx0XHRcdC8vIEVuYWJsZSBzY3JvbGxpbmcgb24gdGhlIFkgYXhpcyBpZiBjb250ZW50IGlzIGF2YWlsYWJsZVxyXG5cdFx0XHRzY3JvbGxpbmdZOiB0cnVlLFxyXG5cclxuXHRcdFx0Ly8gVGhlIGluaXRpYWwgbW92ZW1lbnQgcmVxdWlyZWQgdG8gdHJpZ2dlciBhIHNjcm9sbCwgaW4gcGl4ZWxzOyB0aGlzIGlzIHRoZSBwb2ludCBhdCB3aGljaFxyXG5cdFx0XHQvLyB0aGUgc2Nyb2xsIGlzIGV4Y2x1c2l2ZSB0byB0aGlzIHBhcnRpY3VsYXIgRlRTY3JvbGxlciBpbnN0YW5jZS5cclxuXHRcdFx0c2Nyb2xsQm91bmRhcnk6IDEsXHJcblxyXG5cdFx0XHQvLyBUaGUgaW5pdGlhbCBtb3ZlbWVudCByZXF1aXJlZCB0byB0cmlnZ2VyIGEgdmlzdWFsIGluZGljYXRpb24gdGhhdCBzY3JvbGxpbmcgaXMgb2NjdXJyaW5nLFxyXG5cdFx0XHQvLyBpbiBwaXhlbHMuICBUaGlzIGlzIGVuZm9yY2VkIHRvIGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB0aGUgc2Nyb2xsQm91bmRhcnksIGFuZCBpcyB1c2VkIHRvXHJcblx0XHRcdC8vIGRlZmluZSB3aGVuIHRoZSBzY3JvbGxlciBzdGFydHMgZHJhd2luZyBjaGFuZ2VzIGluIHJlc3BvbnNlIHRvIGFuIGlucHV0LCBldmVuIGlmIHRoZSBzY3JvbGxcclxuXHRcdFx0Ly8gaXMgbm90IHRyZWF0ZWQgYXMgaGF2aW5nIGJlZ3VuL2xvY2tlZCB5ZXQuXHJcblx0XHRcdHNjcm9sbFJlc3BvbnNlQm91bmRhcnk6IDEsXHJcblxyXG5cdFx0XHQvLyBXaGV0aGVyIHRvIGFsd2F5cyBlbmFibGUgc2Nyb2xsaW5nLCBldmVuIGlmIHRoZSBjb250ZW50IG9mIHRoZSBzY3JvbGxlciBkb2VzIG5vdFxyXG5cdFx0XHQvLyByZXF1aXJlIHRoZSBzY3JvbGxlciB0byBmdW5jdGlvbi4gIFRoaXMgbWFrZXMgdGhlIHNjcm9sbGVyIGJlaGF2ZSBtb3JlIGxpa2UgYW5cclxuXHRcdFx0Ly8gZWxlbWVudCBzZXQgdG8gXCJvdmVyZmxvdzogc2Nyb2xsXCIsIHdpdGggYm91bmNpbmcgYWx3YXlzIG9jY3VycmluZyBpZiBlbmFibGVkLlxyXG5cdFx0XHRhbHdheXNTY3JvbGw6IGZhbHNlLFxyXG5cclxuXHRcdFx0Ly8gVGhlIGNvbnRlbnQgd2lkdGggdG8gdXNlIHdoZW4gZGV0ZXJtaW5pbmcgc2Nyb2xsZXIgZGltZW5zaW9ucy4gIElmIHRoaXNcclxuXHRcdFx0Ly8gaXMgZmFsc2UsIHRoZSB3aWR0aCB3aWxsIGJlIGRldGVjdGVkIGJhc2VkIG9uIHRoZSBhY3R1YWwgY29udGVudC5cclxuXHRcdFx0Y29udGVudFdpZHRoOiB1bmRlZmluZWQsXHJcblxyXG5cdFx0XHQvLyBUaGUgY29udGVudCBoZWlnaHQgdG8gdXNlIHdoZW4gZGV0ZXJtaW5pbmcgc2Nyb2xsZXIgZGltZW5zaW9ucy4gIElmIHRoaXNcclxuXHRcdFx0Ly8gaXMgZmFsc2UsIHRoZSBoZWlnaHQgd2lsbCBiZSBkZXRlY3RlZCBiYXNlZCBvbiB0aGUgYWN0dWFsIGNvbnRlbnQuXHJcblx0XHRcdGNvbnRlbnRIZWlnaHQ6IHVuZGVmaW5lZCxcclxuXHJcblx0XHRcdC8vIEVuYWJsZSBzbmFwcGluZyBvZiBjb250ZW50IHRvICdwYWdlcycgb3IgYSBwaXhlbCBncmlkXHJcblx0XHRcdHNuYXBwaW5nOiBmYWxzZSxcclxuXHJcblx0XHRcdC8vIERlZmluZSB0aGUgaG9yaXpvbnRhbCBpbnRlcnZhbCBvZiB0aGUgcGl4ZWwgZ3JpZDsgc25hcHBpbmcgbXVzdCBiZSBlbmFibGVkIGZvciB0aGlzIHRvXHJcblx0XHRcdC8vIHRha2UgZWZmZWN0LiAgSWYgdGhpcyBpcyBub3QgZGVmaW5lZCwgc25hcHBpbmcgd2lsbCB1c2UgaW50ZXJ2YWxzIGJhc2VkIG9uIGNvbnRhaW5lciBzaXplLlxyXG5cdFx0XHRzbmFwU2l6ZVg6IHVuZGVmaW5lZCxcclxuXHJcblx0XHRcdC8vIERlZmluZSB0aGUgdmVydGljYWwgaW50ZXJ2YWwgb2YgdGhlIHBpeGVsIGdyaWQ7IHNuYXBwaW5nIG11c3QgYmUgZW5hYmxlZCBmb3IgdGhpcyB0b1xyXG5cdFx0XHQvLyB0YWtlIGVmZmVjdC4gIElmIHRoaXMgaXMgbm90IGRlZmluZWQsIHNuYXBwaW5nIHdpbGwgdXNlIGludGVydmFscyBiYXNlZCBvbiBjb250YWluZXIgc2l6ZS5cclxuXHRcdFx0c25hcFNpemVZOiB1bmRlZmluZWQsXHJcblxyXG5cdFx0XHQvLyBDb250cm9sIHdoZXRoZXIgc25hcHBpbmcgc2hvdWxkIGJlIGZ1bGx5IHBhZ2luYXRlZCwgb25seSBldmVyIGZsaWNraW5nIHRvIHRoZSBuZXh0IHBhZ2VcclxuXHRcdFx0Ly8gYW5kIG5vdCBiZXlvbmQuICBTbmFwcGluZyBuZWVkcyB0byBiZSBlbmFibGVkIGZvciB0aGlzIHRvIHRha2UgZWZmZWN0LlxyXG5cdFx0XHRwYWdpbmF0ZWRTbmFwOiBmYWxzZSxcclxuXHJcblx0XHRcdC8vIEFsbG93IHNjcm9sbCBib3VuY2luZyBhbmQgZWxhc3RpY2l0eSBuZWFyIHRoZSBlbmRzIGFuZCBncmlkXHJcblx0XHRcdGJvdW5jaW5nOiB0cnVlLFxyXG5cclxuXHRcdFx0Ly8gQWxsb3cgYSBmYXN0IHNjcm9sbCB0byBjb250aW51ZSB3aXRoIG1vbWVudHVtIHdoZW4gcmVsZWFzZWRcclxuXHRcdFx0Zmxpbmdpbmc6IHRydWUsXHJcblxyXG5cdFx0XHQvLyBBdXRvbWF0aWNhbGx5IGRldGVjdHMgY2hhbmdlcyB0byB0aGUgY29udGFpbmVkIG1hcmt1cCBhbmRcclxuXHRcdFx0Ly8gdXBkYXRlcyBpdHMgZGltZW5zaW9ucyB3aGVuZXZlciB0aGUgY29udGVudCBjaGFuZ2VzLiBUaGlzIGlzXHJcblx0XHRcdC8vIHNldCB0byBmYWxzZSBpZiBhIGNvbnRlbnRXaWR0aCBvciBjb250ZW50SGVpZ2h0IGFyZSBzdXBwbGllZC5cclxuXHRcdFx0dXBkYXRlT25DaGFuZ2VzOiB0cnVlLFxyXG5cclxuXHRcdFx0Ly8gQXV0b21hdGljYWxseSBjYXRjaGVzIGNoYW5nZXMgdG8gdGhlIHdpbmRvdyBzaXplIGFuZCB1cGRhdGVzXHJcblx0XHRcdC8vIGl0cyBkaW1lbnNpb25zLlxyXG5cdFx0XHR1cGRhdGVPbldpbmRvd1Jlc2l6ZTogZmFsc2UsXHJcblxyXG5cdFx0XHQvLyBUaGUgYWxpZ25tZW50IHRvIHVzZSBpZiB0aGUgY29udGVudCBpcyBzbWFsbGVyIHRoYW4gdGhlIGNvbnRhaW5lcjtcclxuXHRcdFx0Ly8gdGhpcyBhbHNvIGFwcGxpZXMgdG8gaW5pdGlhbCBwb3NpdGlvbmluZyBvZiBzY3JvbGxhYmxlIGNvbnRlbnQuXHJcblx0XHRcdC8vIFZhbGlkIGFsaWdubWVudHMgYXJlIC0xICh0b3Agb3IgbGVmdCksIDAgKGNlbnRlciksIGFuZCAxIChib3R0b20gb3IgcmlnaHQpLlxyXG5cdFx0XHRiYXNlQWxpZ25tZW50czogeyB4OiAtMSwgeTogLTEgfSxcclxuXHJcblx0XHRcdC8vIFdoZXRoZXIgdG8gdXNlIGEgd2luZG93IHNjcm9sbCBmbGFnLCBlZyB3aW5kb3cuZm9vLCB0byBjb250cm9sIHdoZXRoZXJcclxuXHRcdFx0Ly8gdG8gYWxsb3cgc2Nyb2xsaW5nIHRvIHN0YXJ0IG9yIG5vdy4gIElmIHRoZSB3aW5kb3cgZmxhZyBpcyBzZXQgdG8gdHJ1ZSxcclxuXHRcdFx0Ly8gdGhpcyBlbGVtZW50IHdpbGwgbm90IHN0YXJ0IHNjcm9sbGluZzsgdGhpcyBlbGVtZW50IHdpbGwgYWxzbyB0b2dnbGVcclxuXHRcdFx0Ly8gdGhlIHZhcmlhYmxlIHdoaWxlIHNjcm9sbGluZ1xyXG5cdFx0XHR3aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnOiB1bmRlZmluZWQsXHJcblxyXG5cdFx0XHQvLyBJbnN0ZWFkIG9mIGFsd2F5cyB1c2luZyB0cmFuc2xhdGUzZCBmb3IgdHJhbnNmb3JtcywgYSBtaXggb2YgdHJhbnNsYXRlM2RcclxuXHRcdFx0Ly8gYW5kIHRyYW5zbGF0ZSB3aXRoIGEgaGFyZHdhcmUgYWNjZWxlcmF0aW9uIGNsYXNzIHVzZWQgdG8gdHJpZ2dlciBhY2NlbGVyYXRpb25cclxuXHRcdFx0Ly8gaXMgdXNlZDsgdGhpcyBpcyB0byBhbGxvdyBDU1MgaW5oZXJpdGFuY2UgdG8gYmUgdXNlZCB0byBhbGxvdyBkeW5hbWljXHJcblx0XHRcdC8vIGRpc2FibGluZyBvZiBiYWNraW5nIGxheWVycyBvbiBvbGRlciBwbGF0Zm9ybXMuXHJcblx0XHRcdGh3QWNjZWxlcmF0aW9uQ2xhc3M6ICdmdHNjcm9sbGVyX2h3YWNjZWxlcmF0ZWQnLFxyXG5cclxuXHRcdFx0Ly8gV2hpbGUgdXNlIG9mIHJlcXVlc3RBbmltYXRpb25GcmFtZSBpcyBoaWdobHkgcmVjb21tZW5kZWQgb24gcGxhdGZvcm1zXHJcblx0XHRcdC8vIHdoaWNoIHN1cHBvcnQgaXQsIGl0IGNhbiByZXN1bHQgaW4gdGhlIGFuaW1hdGlvbiBiZWluZyBhIGZ1cnRoZXIgaGFsZi1mcmFtZVxyXG5cdFx0XHQvLyBiZWhpbmQgdGhlIGlucHV0IG1ldGhvZCwgaW5jcmVhc2luZyBwZXJjZWl2ZWQgbGFnIHNsaWdodGx5LiAgVG8gZGlzYWJsZSB0aGlzLFxyXG5cdFx0XHQvLyBzZXQgdGhpcyBwcm9wZXJ0eSB0byBmYWxzZS5cclxuXHRcdFx0ZW5hYmxlUmVxdWVzdEFuaW1hdGlvbkZyYW1lU3VwcG9ydDogdHJ1ZSxcclxuXHJcblx0XHRcdC8vIFNldCB0aGUgbWF4aW11bSB0aW1lIChtcykgdGhhdCBhIGZsaW5nIGNhbiB0YWtlIHRvIGNvbXBsZXRlOyBpZlxyXG5cdFx0XHQvLyB0aGlzIGlzIG5vdCBzZXQsIGZsaW5ncyB3aWxsIGNvbXBsZXRlIGluc3RhbnRseVxyXG5cdFx0XHRtYXhGbGluZ0R1cmF0aW9uOiAxMDAwLFxyXG5cclxuXHRcdFx0Ly8gV2hldGhlciB0byBkaXNhYmxlIGFueSBpbnB1dCBtZXRob2RzOyBvbiBzb21lIG11bHRpLWlucHV0IGRldmljZXNcclxuXHRcdFx0Ly8gY3VzdG9tIGJlaGF2aW91ciBtYXkgYmUgZGVzaXJlZCBmb3Igc29tZSBzY3JvbGxlcnMuICBVc2Ugd2l0aCBjYXJlIVxyXG5cdFx0XHRkaXNhYmxlZElucHV0TWV0aG9kczoge1xyXG5cdFx0XHRcdG1vdXNlOiBmYWxzZSxcclxuXHRcdFx0XHR0b3VjaDogZmFsc2UsXHJcblx0XHRcdFx0c2Nyb2xsOiBmYWxzZVxyXG5cdFx0XHR9LFxyXG5cclxuXHRcdFx0Ly8gRGVmaW5lIGEgc2Nyb2xsaW5nIGNsYXNzIHRvIGJlIGFkZGVkIHRvIHRoZSBzY3JvbGxlciBjb250YWluZXJcclxuXHRcdFx0Ly8gd2hlbiBzY3JvbGxpbmcgaXMgYWN0aXZlLiAgTm90ZSB0aGF0IHRoaXMgY2FuIGNhdXNlIGEgcmVsYXlvdXQgb25cclxuXHRcdFx0Ly8gc2Nyb2xsIHN0YXJ0IGlmIGRlZmluZWQsIGJ1dCBhbGxvd3MgY3VzdG9tIHN0eWxpbmcgaW4gcmVzcG9uc2UgdG8gc2Nyb2xsc1xyXG5cdFx0XHRzY3JvbGxpbmdDbGFzc05hbWU6IHVuZGVmaW5lZCxcclxuXHJcblx0XHRcdC8vIEJlemllciBjdXJ2ZXMgZGVmaW5pbmcgdGhlIGZlZWwgb2YgdGhlIGZsaW5nIChtb21lbnR1bSkgZGVjZWxlcmF0aW9uLFxyXG5cdFx0XHQvLyB0aGUgYm91bmNlIGRlY2xlcmF0aW9uIGRlY2VsZXJhdGlvbiAoYXMgYSBmbGluZyBleGNlZWRzIHRoZSBib3VuZHMpLFxyXG5cdFx0XHQvLyBhbmQgdGhlIGJvdW5jZSBiZXppZXIgKHVzZWQgZm9yIGJvdW5jaW5nIGJhY2spLlxyXG5cdFx0XHRmbGluZ0JlemllcjogbmV3IEN1YmljQmV6aWVyKDAuMTAzLCAwLjM4OSwgMC4zMDcsIDAuOTY2KSxcclxuXHRcdFx0Ym91bmNlRGVjZWxlcmF0aW9uQmV6aWVyOiBuZXcgQ3ViaWNCZXppZXIoMCwgMC41LCAwLjUsIDEpLFxyXG5cdFx0XHRib3VuY2VCZXppZXI6IG5ldyBDdWJpY0JlemllcigwLjcsIDAsIDAuOSwgMC42KVxyXG5cdFx0fTtcclxuXHJcblxyXG5cdFx0LyogICAgICAgICAgICAgICAgICAgICBMb2NhbCB2YXJpYWJsZXMgICAgICAgICAgICAgICAgICAgKi9cclxuXHJcblx0XHQvLyBDYWNoZSB0aGUgRE9NIG5vZGUgYW5kIHNldCB1cCB2YXJpYWJsZXMgZm9yIG90aGVyIG5vZGVzXHJcblx0XHR2YXIgX3B1YmxpY1NlbGY7XHJcblx0XHR2YXIgX3NlbGYgPSB0aGlzO1xyXG5cdFx0dmFyIF9zY3JvbGxhYmxlTWFzdGVyTm9kZSA9IGRvbU5vZGU7XHJcblx0XHR2YXIgX2NvbnRhaW5lck5vZGU7XHJcblx0XHR2YXIgX2NvbnRlbnRQYXJlbnROb2RlO1xyXG5cdFx0dmFyIF9zY3JvbGxOb2RlcyA9IHsgeDogbnVsbCwgeTogbnVsbCB9O1xyXG5cdFx0dmFyIF9zY3JvbGxiYXJOb2RlcyA9IHsgeDogbnVsbCwgeTogbnVsbCB9O1xyXG5cclxuXHRcdC8vIERpbWVuc2lvbnMgb2YgdGhlIGNvbnRhaW5lciBlbGVtZW50IGFuZCB0aGUgY29udGVudCBlbGVtZW50XHJcblx0XHR2YXIgX21ldHJpY3MgPSB7XHJcblx0XHRcdGNvbnRhaW5lcjogeyB4OiBudWxsLCB5OiBudWxsIH0sXHJcblx0XHRcdGNvbnRlbnQ6IHsgeDogbnVsbCwgeTogbnVsbCwgcmF3WDogbnVsbCwgcmF3WTogbnVsbCB9LFxyXG5cdFx0XHRzY3JvbGxFbmQ6IHsgeDogbnVsbCwgeTogbnVsbCB9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFNuYXBwaW5nIGRldGFpbHNcclxuXHRcdHZhciBfc25hcEdyaWRTaXplID0ge1xyXG5cdFx0XHR4OiBmYWxzZSxcclxuXHRcdFx0eTogZmFsc2UsXHJcblx0XHRcdHVzZXJYOiBmYWxzZSxcclxuXHRcdFx0dXNlclk6IGZhbHNlXHJcblx0XHR9O1xyXG5cdFx0dmFyIF9zbmFwSW5kZXggPSB7XHJcblx0XHRcdHg6IDAsXHJcblx0XHRcdHk6IDBcclxuXHRcdH07XHJcblx0XHR2YXIgX2Jhc2VTZWdtZW50ID0geyB4OiAwLCB5OiAwIH07XHJcblx0XHR2YXIgX2FjdGl2ZVNlZ21lbnQgPSB7IHg6IDAsIHk6IDAgfTtcclxuXHJcblx0XHQvLyBUcmFjayB0aGUgaWRlbnRpZmllciBvZiBhbnkgaW5wdXQgYmVpbmcgdHJhY2tlZFxyXG5cdFx0dmFyIF9pbnB1dElkZW50aWZpZXIgPSBmYWxzZTtcclxuXHRcdHZhciBfaW5wdXRJbmRleCA9IDA7XHJcblx0XHR2YXIgX2lucHV0Q2FwdHVyZWQgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBDdXJyZW50IHNjcm9sbCBwb3NpdGlvbnMgYW5kIHRyYWNraW5nXHJcblx0XHR2YXIgX2lzU2Nyb2xsaW5nID0gZmFsc2U7XHJcblx0XHR2YXIgX2lzRGlzcGxheWluZ1Njcm9sbCA9IGZhbHNlO1xyXG5cdFx0dmFyIF9pc0FuaW1hdGluZyA9IGZhbHNlO1xyXG5cdFx0dmFyIF9iYXNlU2Nyb2xsUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfTtcclxuXHRcdHZhciBfbGFzdFNjcm9sbFBvc2l0aW9uID0geyB4OiAwLCB5OiAwIH07XHJcblx0XHR2YXIgX3RhcmdldFNjcm9sbFBvc2l0aW9uID0geyB4OiAwLCB5OiAwIH07XHJcblx0XHR2YXIgX3Njcm9sbEF0RXh0cmVtaXR5ID0geyB4OiBudWxsLCB5OiBudWxsIH07XHJcblx0XHR2YXIgX3ByZXZlbnRDbGljayA9IGZhbHNlO1xyXG5cdFx0dmFyIF90aW1lb3V0cyA9IFtdO1xyXG5cdFx0dmFyIF9oYXNCZWVuU2Nyb2xsZWQgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBHZXN0dXJlIGRldGFpbHNcclxuXHRcdHZhciBfYmFzZVNjcm9sbGFibGVBeGVzID0ge307XHJcblx0XHR2YXIgX3Njcm9sbGFibGVBeGVzID0geyB4OiB0cnVlLCB5OiB0cnVlIH07XHJcblx0XHR2YXIgX2dlc3R1cmVTdGFydCA9IHsgeDogMCwgeTogMCwgdDogMCB9O1xyXG5cdFx0dmFyIF9jdW11bGF0aXZlU2Nyb2xsID0geyB4OiAwLCB5OiAwIH07XHJcblx0XHR2YXIgX2V2ZW50SGlzdG9yeSA9IFtdO1xyXG5cclxuXHRcdC8vIEFsbG93IGNlcnRhaW4gZXZlbnRzIHRvIGJlIGRlYm91bmNlZFxyXG5cdFx0dmFyIF9kb21DaGFuZ2VEZWJvdW5jZXIgPSBmYWxzZTtcclxuXHRcdHZhciBfc2Nyb2xsV2hlZWxFbmREZWJvdW5jZXIgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBQZXJmb3JtYW5jZSBzd2l0Y2hlcyBvbiBicm93c2VycyBzdXBwb3J0aW5nIHJlcXVlc3RBbmltYXRpb25GcmFtZVxyXG5cdFx0dmFyIF9hbmltYXRpb25GcmFtZVJlcXVlc3QgPSBmYWxzZTtcclxuXHRcdHZhciBfcmVxQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgZmFsc2U7XHJcblx0XHR2YXIgX2NhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5jYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1zQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IGZhbHNlO1xyXG5cclxuXHRcdC8vIEV2ZW50IGxpc3RlbmVyc1xyXG5cdFx0dmFyIF9ldmVudExpc3RlbmVycyA9IHtcclxuXHRcdFx0J3Njcm9sbHN0YXJ0JzogW10sXHJcblx0XHRcdCdzY3JvbGwnOiBbXSxcclxuXHRcdFx0J3Njcm9sbGVuZCc6IFtdLFxyXG5cdFx0XHQnc2VnbWVudHdpbGxjaGFuZ2UnOiBbXSxcclxuXHRcdFx0J3NlZ21lbnRkaWRjaGFuZ2UnOiBbXSxcclxuXHRcdFx0J3JlYWNoZWRzdGFydCc6IFtdLFxyXG5cdFx0XHQncmVhY2hlZGVuZCc6IFtdLFxyXG5cdFx0XHQnc2Nyb2xsaW50ZXJhY3Rpb25lbmQnOiBbXVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBNdXRhdGlvbk9ic2VydmVyIGluc3RhbmNlLCB3aGVuIHN1cHBvcnRlZCBhbmQgaWYgRE9NIGNoYW5nZSBzbmlmZmluZyBpcyBlbmFibGVkXHJcblx0XHR2YXIgX211dGF0aW9uT2JzZXJ2ZXI7XHJcblxyXG5cclxuXHRcdC8qIFBhcnNpbmcgc3VwcGxpZWQgb3B0aW9ucyAqL1xyXG5cclxuXHRcdC8vIE92ZXJyaWRlIGRlZmF1bHQgaW5zdGFuY2Ugb3B0aW9ucyB3aXRoIGdsb2JhbCAtIG9yIGNsb3N1cmUnZCAtIG9wdGlvbnNcclxuXHRcdGlmICh0eXBlb2YgRlRTY3JvbGxlck9wdGlvbnMgPT09ICdvYmplY3QnICYmIEZUU2Nyb2xsZXJPcHRpb25zKSB7XHJcblx0XHRcdGZvciAoa2V5IGluIEZUU2Nyb2xsZXJPcHRpb25zKSB7XHJcblx0XHRcdFx0aWYgKEZUU2Nyb2xsZXJPcHRpb25zLmhhc093blByb3BlcnR5KGtleSkgJiYgX2luc3RhbmNlT3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdFx0XHRfaW5zdGFuY2VPcHRpb25zW2tleV0gPSBGVFNjcm9sbGVyT3B0aW9uc1trZXldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE92ZXJyaWRlIGRlZmF1bHQgYW5kIGdsb2JhbCBvcHRpb25zIHdpdGggc3VwcGxpZWQgb3B0aW9uc1xyXG5cdFx0aWYgKG9wdGlvbnMpIHtcclxuXHRcdFx0Zm9yIChrZXkgaW4gb3B0aW9ucykge1xyXG5cdFx0XHRcdGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KGtleSkgJiYgX2luc3RhbmNlT3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdFx0XHRfaW5zdGFuY2VPcHRpb25zW2tleV0gPSBvcHRpb25zW2tleV07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBzbmFwIGdyaWQgc2l6ZSBvcHRpb25zIHdlcmUgc3VwcGxpZWQsIHN0b3JlIHRoZW1cclxuXHRcdFx0aWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ3NuYXBTaXplWCcpICYmICFpc05hTihvcHRpb25zLnNuYXBTaXplWCkpIHtcclxuXHRcdFx0XHRfc25hcEdyaWRTaXplLnVzZXJYID0gX3NuYXBHcmlkU2l6ZS54ID0gb3B0aW9ucy5zbmFwU2l6ZVg7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ3NuYXBTaXplWScpICYmICFpc05hTihvcHRpb25zLnNuYXBTaXplWSkpIHtcclxuXHRcdFx0XHRfc25hcEdyaWRTaXplLnVzZXJZID0gX3NuYXBHcmlkU2l6ZS55ID0gb3B0aW9ucy5zbmFwU2l6ZVk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIGNvbnRlbnQgd2lkdGggYW5kIGhlaWdodCB3ZXJlIGRlZmluZWQsIGRpc2FibGUgdXBkYXRlT25DaGFuZ2VzIGZvciBwZXJmb3JtYW5jZVxyXG5cdFx0XHRpZiAob3B0aW9ucy5jb250ZW50V2lkdGggJiYgb3B0aW9ucy5jb250ZW50SGVpZ2h0KSB7XHJcblx0XHRcdFx0b3B0aW9ucy51cGRhdGVPbkNoYW5nZXMgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFZhbGlkYXRlIHRoZSBzY3JvbGwgcmVzcG9uc2UgcGFyYW1ldGVyXHJcblx0XHRfaW5zdGFuY2VPcHRpb25zLnNjcm9sbFJlc3BvbnNlQm91bmRhcnkgPSBNYXRoLm1pbihfaW5zdGFuY2VPcHRpb25zLnNjcm9sbEJvdW5kYXJ5LCBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbFJlc3BvbnNlQm91bmRhcnkpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBiYXNlIHNjcm9sbGFibGUgYXhlc1xyXG5cdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCkge1xyXG5cdFx0XHRfYmFzZVNjcm9sbGFibGVBeGVzLnggPSB0cnVlO1xyXG5cdFx0fVxyXG5cdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSkge1xyXG5cdFx0XHRfYmFzZVNjcm9sbGFibGVBeGVzLnkgPSB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9ubHkgZW5hYmxlIGFuaW1hdGlvbiBmcmFtZSBzdXBwb3J0IGlmIHRoZSBpbnN0YW5jZSBvcHRpb25zIHBlcm1pdCBpdFxyXG5cdFx0X3JlcUFuaW1hdGlvbkZyYW1lID0gX2luc3RhbmNlT3B0aW9ucy5lbmFibGVSZXF1ZXN0QW5pbWF0aW9uRnJhbWVTdXBwb3J0ICYmIF9yZXFBbmltYXRpb25GcmFtZTtcclxuXHRcdF9jYW5jZWxBbmltYXRpb25GcmFtZSA9IF9yZXFBbmltYXRpb25GcmFtZSAmJiBfY2FuY2VsQW5pbWF0aW9uRnJhbWU7XHJcblxyXG5cclxuXHRcdC8qICAgICAgICAgICAgICAgICAgICBTY29wZWQgRnVuY3Rpb25zICAgICAgICAgICAgICAgICAgICovXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBVbmJpbmRzIGFsbCBldmVudCBsaXN0ZW5lcnMgdG8gcHJldmVudCBjaXJjdWxhciByZWZlcmVuY2VzIHByZXZlbnRpbmcgaXRlbXNcclxuXHRcdCAqIGZyb20gYmVpbmcgZGVhbGxvY2F0ZWQsIGFuZCBjbGVhbiB1cCByZWZlcmVuY2VzIHRvIGRvbSBlbGVtZW50cy4gUGFzcyBpblxyXG5cdFx0ICogXCJyZW1vdmVFbGVtZW50c1wiIHRvIGFsc28gcmVtb3ZlIEZUU2Nyb2xsZXIgRE9NIGVsZW1lbnRzIGZvciBzcGVjaWFsIHJldXNlIGNhc2VzLlxyXG5cdFx0ICovXHJcblx0XHRkZXN0cm95ID0gZnVuY3Rpb24gZGVzdHJveShyZW1vdmVFbGVtZW50cykge1xyXG5cdFx0XHR2YXIgaSwgbDtcclxuXHJcblx0XHRcdF90b2dnbGVFdmVudEhhbmRsZXJzKGZhbHNlKTtcclxuXHRcdFx0X2NhbmNlbEFuaW1hdGlvbigpO1xyXG5cdFx0XHRpZiAoX2RvbUNoYW5nZURlYm91bmNlcikge1xyXG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX2RvbUNoYW5nZURlYm91bmNlcik7XHJcblx0XHRcdFx0X2RvbUNoYW5nZURlYm91bmNlciA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGZvciAoaSA9IDAsIGwgPSBfdGltZW91dHMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChfdGltZW91dHNbaV0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdF90aW1lb3V0cy5sZW5ndGggPSAwO1xyXG5cclxuXHRcdFx0Ly8gRGVzdHJveSBET00gZWxlbWVudHMgaWYgcmVxdWlyZWRcclxuXHRcdFx0aWYgKHJlbW92ZUVsZW1lbnRzICYmIF9zY3JvbGxhYmxlTWFzdGVyTm9kZSkge1xyXG5cdFx0XHRcdHdoaWxlIChfY29udGVudFBhcmVudE5vZGUuZmlyc3RDaGlsZCkge1xyXG5cdFx0XHRcdFx0X3Njcm9sbGFibGVNYXN0ZXJOb2RlLmFwcGVuZENoaWxkKF9jb250ZW50UGFyZW50Tm9kZS5maXJzdENoaWxkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0X3Njcm9sbGFibGVNYXN0ZXJOb2RlLnJlbW92ZUNoaWxkKF9jb250YWluZXJOb2RlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X3Njcm9sbGFibGVNYXN0ZXJOb2RlID0gbnVsbDtcclxuXHRcdFx0X2NvbnRhaW5lck5vZGUgPSBudWxsO1xyXG5cdFx0XHRfY29udGVudFBhcmVudE5vZGUgPSBudWxsO1xyXG5cdFx0XHRfc2Nyb2xsTm9kZXMueCA9IG51bGw7XHJcblx0XHRcdF9zY3JvbGxOb2Rlcy55ID0gbnVsbDtcclxuXHRcdFx0X3Njcm9sbGJhck5vZGVzLnggPSBudWxsO1xyXG5cdFx0XHRfc2Nyb2xsYmFyTm9kZXMueSA9IG51bGw7XHJcblx0XHRcdGZvciAoaSBpbiBfZXZlbnRMaXN0ZW5lcnMpIHtcclxuXHRcdFx0XHRpZiAoX2V2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KGkpKSB7XHJcblx0XHRcdFx0XHRfZXZlbnRMaXN0ZW5lcnNbaV0ubGVuZ3RoID0gMDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHRoaXMgaXMgY3VycmVudGx5IHRyYWNrZWQgYXMgYSBzY3JvbGxpbmcgaW5zdGFuY2UsIGNsZWFyIHRoZSBmbGFnXHJcblx0XHRcdGlmIChfZnRzY3JvbGxlck1vdmluZyAmJiBfZnRzY3JvbGxlck1vdmluZyA9PT0gX3NlbGYpIHtcclxuXHRcdFx0XHRfZnRzY3JvbGxlck1vdmluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcpIHtcclxuXHRcdFx0XHRcdHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQ29uZmlndXJlcyB0aGUgc25hcHBpbmcgYm91bmRhcmllcyB3aXRoaW4gdGhlIHNjcm9sbGluZyBlbGVtZW50IGlmXHJcblx0XHQgKiBzbmFwcGluZyBpcyBhY3RpdmUuICBJZiB0aGlzIGlzIG5ldmVyIGNhbGxlZCwgc25hcHBpbmcgZGVmYXVsdHMgdG9cclxuXHRcdCAqIHVzaW5nIHRoZSBib3VuZGluZyBib3gsIGVnIHBhZ2UtYXQtYS10aW1lLlxyXG5cdFx0ICovXHJcblx0XHRzZXRTbmFwU2l6ZSA9IGZ1bmN0aW9uIHNldFNuYXBTaXplKHdpZHRoLCBoZWlnaHQpIHtcclxuXHRcdFx0X3NuYXBHcmlkU2l6ZS51c2VyWCA9IHdpZHRoO1xyXG5cdFx0XHRfc25hcEdyaWRTaXplLnVzZXJZID0gaGVpZ2h0O1xyXG5cdFx0XHRfc25hcEdyaWRTaXplLnggPSB3aWR0aDtcclxuXHRcdFx0X3NuYXBHcmlkU2l6ZS55ID0gaGVpZ2h0O1xyXG5cclxuXHRcdFx0Ly8gRW5zdXJlIHRoZSBjb250ZW50IGRpbWVuc2lvbnMgY29uZm9ybSB0byB0aGUgZ3JpZFxyXG5cdFx0XHRfbWV0cmljcy5jb250ZW50LnggPSBNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudC5yYXdYIC8gd2lkdGgpICogd2lkdGg7XHJcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQueSA9IE1hdGguY2VpbChfbWV0cmljcy5jb250ZW50LnJhd1kgLyBoZWlnaHQpICogaGVpZ2h0O1xyXG5cdFx0XHRfbWV0cmljcy5zY3JvbGxFbmQueCA9IF9tZXRyaWNzLmNvbnRhaW5lci54IC0gX21ldHJpY3MuY29udGVudC54O1xyXG5cdFx0XHRfbWV0cmljcy5zY3JvbGxFbmQueSA9IF9tZXRyaWNzLmNvbnRhaW5lci55IC0gX21ldHJpY3MuY29udGVudC55O1xyXG5cdFx0XHRfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpO1xyXG5cclxuXHRcdFx0Ly8gU25hcCB0byB0aGUgbmV3IGdyaWQgaWYgbmVjZXNzYXJ5XHJcblx0XHRcdF9zbmFwU2Nyb2xsKCk7XHJcblx0XHRcdF91cGRhdGVTZWdtZW50cyh0cnVlKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBTY3JvbGwgdG8gYSBzdXBwbGllZCBwb3NpdGlvbiwgaW5jbHVkaW5nIHdoZXRoZXIgb3Igbm90IHRvIGFuaW1hdGUgdGhlXHJcblx0XHQgKiBzY3JvbGwgYW5kIGhvdyBmYXN0IHRvIHBlcmZvcm0gdGhlIGFuaW1hdGlvbiAocGFzcyBpbiB0cnVlIHRvIHNlbGVjdCBhXHJcblx0XHQgKiBkeW5hbWljIGR1cmF0aW9uKS4gIFRoZSBpbnB1dHMgd2lsbCBiZSBjb25zdHJhaW5lZCB0byBib3VuZHMgYW5kIHNuYXBwZWQuXHJcblx0XHQgKiBJZiBmYWxzZSBpcyBzdXBwbGllZCBmb3IgYSBwb3NpdGlvbiwgdGhhdCBheGlzIHdpbGwgbm90IGJlIHNjcm9sbGVkLlxyXG5cdFx0ICovXHJcblx0XHRzY3JvbGxUbyA9IGZ1bmN0aW9uIHNjcm9sbFRvKGxlZnQsIHRvcCwgYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuXHRcdFx0dmFyIHRhcmdldFBvc2l0aW9uLCBkdXJhdGlvbiwgcG9zaXRpb25zLCBheGlzLCBtYXhEdXJhdGlvbiA9IDAsIHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkgPSB7fTtcclxuXHJcblx0XHRcdC8vIElmIGEgbWFudWFsIHNjcm9sbCBpcyBpbiBwcm9ncmVzcywgY2FuY2VsIGl0XHJcblx0XHRcdF9lbmRTY3JvbGwoRGF0ZS5ub3coKSk7XHJcblxyXG5cdFx0XHQvLyBNb3ZlIHN1cHBsaWVkIGNvb3JkaW5hdGVzIGludG8gYW4gb2JqZWN0IGZvciBpdGVyYXRpb24sIGFsc28gaW52ZXJ0aW5nIHRoZSB2YWx1ZXMgaW50b1xyXG5cdFx0XHQvLyBvdXIgY29vcmRpbmF0ZSBzeXN0ZW1cclxuXHRcdFx0cG9zaXRpb25zID0ge1xyXG5cdFx0XHRcdHg6IC1sZWZ0LFxyXG5cdFx0XHRcdHk6IC10b3BcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfYmFzZVNjcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9iYXNlU2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uID0gcG9zaXRpb25zW2F4aXNdO1xyXG5cdFx0XHRcdFx0aWYgKHRhcmdldFBvc2l0aW9uID09PSBmYWxzZSkge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBDb25zdHJhaW4gdG8gYm91bmRzXHJcblx0XHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IE1hdGgubWluKDAsIE1hdGgubWF4KF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSwgdGFyZ2V0UG9zaXRpb24pKTtcclxuXHJcblx0XHRcdFx0XHQvLyBTbmFwIGlmIGFwcHJvcHJpYXRlXHJcblx0XHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZyAmJiBfc25hcEdyaWRTaXplW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uID0gTWF0aC5yb3VuZCh0YXJnZXRQb3NpdGlvbiAvIF9zbmFwR3JpZFNpemVbYXhpc10pICogX3NuYXBHcmlkU2l6ZVtheGlzXTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBHZXQgYSBkdXJhdGlvblxyXG5cdFx0XHRcdFx0ZHVyYXRpb24gPSBhbmltYXRpb25EdXJhdGlvbiB8fCAwO1xyXG5cdFx0XHRcdFx0aWYgKGR1cmF0aW9uID09PSB0cnVlKSB7XHJcblx0XHRcdFx0XHRcdGR1cmF0aW9uID0gTWF0aC5zcXJ0KE1hdGguYWJzKF9iYXNlU2Nyb2xsUG9zaXRpb25bYXhpc10gLSB0YXJnZXRQb3NpdGlvbikpICogMjA7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gVHJpZ2dlciB0aGUgcG9zaXRpb24gY2hhbmdlXHJcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIHRhcmdldFBvc2l0aW9uLCBkdXJhdGlvbik7XHJcblx0XHRcdFx0XHRzY3JvbGxQb3NpdGlvbnNUb0FwcGx5W2F4aXNdID0gdGFyZ2V0UG9zaXRpb247XHJcblx0XHRcdFx0XHRtYXhEdXJhdGlvbiA9IE1hdGgubWF4KG1heER1cmF0aW9uLCBkdXJhdGlvbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB0aGUgc2Nyb2xsIGhhZCByZXN1bHRlZCBpbiBhIGNoYW5nZSBpbiBwb3NpdGlvbiwgcGVyZm9ybSBzb21lIGFkZGl0aW9uYWwgYWN0aW9uczpcclxuXHRcdFx0aWYgKF9iYXNlU2Nyb2xsUG9zaXRpb24ueCAhPT0gcG9zaXRpb25zLnggfHwgX2Jhc2VTY3JvbGxQb3NpdGlvbi55ICE9PSBwb3NpdGlvbnMueSkge1xyXG5cclxuXHRcdFx0XHQvLyBNYXJrIGEgc2Nyb2xsIGFzIGhhdmluZyBldmVyIG9jY3VycmVkXHJcblx0XHRcdFx0X2hhc0JlZW5TY3JvbGxlZCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdC8vIElmIGFuIGFuaW1hdGlvbiBkdXJhdGlvbiBpcyBwcmVzZW50LCBmaXJlIGEgc2Nyb2xsIHN0YXJ0IGV2ZW50IGFuZCBhXHJcblx0XHRcdFx0Ly8gc2Nyb2xsIGV2ZW50IGZvciBhbnkgbGlzdGVuZXJzIHRvIGFjdCBvblxyXG5cdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbHN0YXJ0JywgX2dldFBvc2l0aW9uKCkpO1xyXG5cdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbCcsIF9nZXRQb3NpdGlvbigpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKG1heER1cmF0aW9uKSB7XHJcblx0XHRcdFx0X3RpbWVvdXRzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0XHR2YXIgYW5BeGlzO1xyXG5cdFx0XHRcdFx0Zm9yIChhbkF4aXMgaW4gc2Nyb2xsUG9zaXRpb25zVG9BcHBseSkge1xyXG5cdFx0XHRcdFx0XHRpZiAoc2Nyb2xsUG9zaXRpb25zVG9BcHBseS5oYXNPd25Qcm9wZXJ0eShhbkF4aXMpKSB7XHJcblx0XHRcdFx0XHRcdFx0X2xhc3RTY3JvbGxQb3NpdGlvblthbkF4aXNdID0gc2Nyb2xsUG9zaXRpb25zVG9BcHBseVthbkF4aXNdO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRfZmluYWxpemVTY3JvbGwoKTtcclxuXHRcdFx0XHR9LCBtYXhEdXJhdGlvbikpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQWx0ZXIgdGhlIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uLCBpbmNsdWRpbmcgd2hldGhlciBvciBub3QgdG8gYW5pbWF0ZVxyXG5cdFx0ICogdGhlIHNjcm9sbCBhbmQgaG93IGZhc3QgdG8gcGVyZm9ybSB0aGUgYW5pbWF0aW9uIChwYXNzIGluIHRydWUgdG9cclxuXHRcdCAqIHNlbGVjdCBhIGR5bmFtaWMgZHVyYXRpb24pLiAgVGhlIGlucHV0cyB3aWxsIGJlIGNoZWNrZWQgYWdhaW5zdCB0aGVcclxuXHRcdCAqIGN1cnJlbnQgcG9zaXRpb24uXHJcblx0XHQgKi9cclxuXHRcdHNjcm9sbEJ5ID0gZnVuY3Rpb24gc2Nyb2xsQnkoaG9yaXpvbnRhbCwgdmVydGljYWwsIGFuaW1hdGlvbkR1cmF0aW9uKSB7XHJcblxyXG5cdFx0XHQvLyBXcmFwIHRoZSBzY3JvbGxUbyBmdW5jdGlvbiBmb3Igc2ltcGxpY2l0eVxyXG5cdFx0XHRzY3JvbGxUbyhwYXJzZUZsb2F0KGhvcml6b250YWwpIC0gX2Jhc2VTY3JvbGxQb3NpdGlvbi54LCBwYXJzZUZsb2F0KHZlcnRpY2FsKSAtIF9iYXNlU2Nyb2xsUG9zaXRpb24ueSwgYW5pbWF0aW9uRHVyYXRpb24pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFByb3ZpZGUgYSBwdWJsaWMgbWV0aG9kIHRvIGRldGVjdCBjaGFuZ2VzIGluIGRpbWVuc2lvbnMgZm9yIGVpdGhlciB0aGUgY29udGVudCBvciB0aGVcclxuXHRcdCAqIGNvbnRhaW5lci5cclxuXHRcdCAqL1xyXG5cdFx0dXBkYXRlRGltZW5zaW9ucyA9IGZ1bmN0aW9uIHVwZGF0ZURpbWVuc2lvbnMoY29udGVudFdpZHRoLCBjb250ZW50SGVpZ2h0LCBpZ25vcmVTbmFwU2Nyb2xsKSB7XHJcblx0XHRcdG9wdGlvbnMuY29udGVudFdpZHRoID0gY29udGVudFdpZHRoIHx8IG9wdGlvbnMuY29udGVudFdpZHRoO1xyXG5cdFx0XHRvcHRpb25zLmNvbnRlbnRIZWlnaHQgPSBjb250ZW50SGVpZ2h0IHx8IG9wdGlvbnMuY29udGVudEhlaWdodDtcclxuXHJcblx0XHRcdC8vIEN1cnJlbnRseSBqdXN0IHdyYXAgdGhlIHByaXZhdGUgQVBJXHJcblx0XHRcdF91cGRhdGVEaW1lbnNpb25zKCEhaWdub3JlU25hcFNjcm9sbCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQWRkIGFuIGV2ZW50IGhhbmRsZXIgZm9yIGEgc3VwcG9ydGVkIGV2ZW50LiAgQ3VycmVudCBldmVudHMgaW5jbHVkZTpcclxuXHRcdCAqIHNjcm9sbCAtIGZpcmVkIHdoZW5ldmVyIHRoZSBzY3JvbGwgcG9zaXRpb24gY2hhbmdlc1xyXG5cdFx0ICogc2Nyb2xsc3RhcnQgLSBmaXJlZCB3aGVuIGEgc2Nyb2xsIG1vdmVtZW50IHN0YXJ0c1xyXG5cdFx0ICogc2Nyb2xsZW5kIC0gZmlyZWQgd2hlbiBhIHNjcm9sbCBtb3ZlbWVudCBlbmRzXHJcblx0XHQgKiBzZWdtZW50d2lsbGNoYW5nZSAtIGZpcmVkIHdoZW5ldmVyIHRoZSBzZWdtZW50IGNoYW5nZXMsIGluY2x1ZGluZyBkdXJpbmcgc2Nyb2xsaW5nXHJcblx0XHQgKiBzZWdtZW50ZGlkY2hhbmdlIC0gZmlyZWQgd2hlbiBhIHNlZ21lbnQgaGFzIGNvbmNsdXNpdmVseSBjaGFuZ2VkLCBhZnRlciBzY3JvbGxpbmcuXHJcblx0XHQgKi9cclxuXHRcdGFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRFdmVudExpc3RlbmVyKGV2ZW50bmFtZSwgZXZlbnRsaXN0ZW5lcikge1xyXG5cclxuXHRcdFx0Ly8gRW5zdXJlIHRoaXMgaXMgYSB2YWxpZCBldmVudFxyXG5cdFx0XHRpZiAoIV9ldmVudExpc3RlbmVycy5oYXNPd25Qcm9wZXJ0eShldmVudG5hbWUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgdGhlIGxpc3RlbmVyXHJcblx0XHRcdF9ldmVudExpc3RlbmVyc1tldmVudG5hbWVdLnB1c2goZXZlbnRsaXN0ZW5lcik7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFJlbW92ZSBhbiBldmVudCBoYW5kbGVyIGZvciBhIHN1cHBvcnRlZCBldmVudC4gIFRoZSBsaXN0ZW5lciBtdXN0IGJlIGV4YWN0bHkgdGhlIHNhbWUgYXNcclxuXHRcdCAqIGFuIGFkZGVkIGxpc3RlbmVyIHRvIGJlIHJlbW92ZWQuXHJcblx0XHQgKi9cclxuXHRcdHJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50bmFtZSwgZXZlbnRsaXN0ZW5lcikge1xyXG5cdFx0XHR2YXIgaTtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSB0aGlzIGlzIGEgdmFsaWQgZXZlbnRcclxuXHRcdFx0aWYgKCFfZXZlbnRMaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkoZXZlbnRuYW1lKSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Zm9yIChpID0gX2V2ZW50TGlzdGVuZXJzW2V2ZW50bmFtZV0ubGVuZ3RoOyBpID49IDA7IGkgPSBpIC0gMSkge1xyXG5cdFx0XHRcdGlmIChfZXZlbnRMaXN0ZW5lcnNbZXZlbnRuYW1lXVtpXSA9PT0gZXZlbnRsaXN0ZW5lcikge1xyXG5cdFx0XHRcdFx0X2V2ZW50TGlzdGVuZXJzW2V2ZW50bmFtZV0uc3BsaWNlKGksIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBTdGFydCBhIHNjcm9sbCB0cmFja2luZyBpbnB1dCAtIHRoaXMgY291bGQgYmUgbW91c2UsIHdlYmtpdC1zdHlsZSB0b3VjaCxcclxuXHRcdCAqIG9yIG1zLXN0eWxlIHBvaW50ZXIgZXZlbnRzLlxyXG5cdFx0ICovXHJcblx0XHRfc3RhcnRTY3JvbGwgPSBmdW5jdGlvbiBfc3RhcnRTY3JvbGwoaW5wdXRYLCBpbnB1dFksIGlucHV0VGltZSwgcmF3RXZlbnQpIHtcclxuXHRcdFx0dmFyIHRyaWdnZXJTY3JvbGxJbnRlcnJ1cHQgPSBfaXNBbmltYXRpbmc7XHJcblxyXG5cdFx0XHQvLyBPcGVyYSBmaXhcclxuXHRcdFx0aWYgKGlucHV0VGltZSA8PSAwKSB7XHJcblx0XHRcdFx0aW5wdXRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgYSB3aW5kb3cgc2Nyb2xsaW5nIGZsYWcgaXMgc2V0LCBhbmQgZXZhbHVhdGVzIHRvIHRydWUsIGRvbid0IHN0YXJ0IGNoZWNraW5nIHRvdWNoZXNcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZyAmJiB3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgYW4gYW5pbWF0aW9uIGlzIGluIHByb2dyZXNzLCBzdG9wIHRoZSBzY3JvbGwuXHJcblx0XHRcdGlmICh0cmlnZ2VyU2Nyb2xsSW50ZXJydXB0KSB7XHJcblx0XHRcdFx0X2ludGVycnVwdFNjcm9sbCgpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHQvLyBBbGxvdyBjbGlja3MgYWdhaW4sIGJ1dCBvbmx5IGlmIGEgc2Nyb2xsIHdhcyBub3QgaW50ZXJydXB0ZWRcclxuXHRcdFx0XHRfcHJldmVudENsaWNrID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0b3JlIHRoZSBpbml0aWFsIGV2ZW50IGNvb3JkaW5hdGVzXHJcblx0XHRcdF9nZXN0dXJlU3RhcnQueCA9IGlucHV0WDtcclxuXHRcdFx0X2dlc3R1cmVTdGFydC55ID0gaW5wdXRZO1xyXG5cdFx0XHRfZ2VzdHVyZVN0YXJ0LnQgPSBpbnB1dFRpbWU7XHJcblx0XHRcdF90YXJnZXRTY3JvbGxQb3NpdGlvbi54ID0gX2xhc3RTY3JvbGxQb3NpdGlvbi54O1xyXG5cdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb24ueSA9IF9sYXN0U2Nyb2xsUG9zaXRpb24ueTtcclxuXHJcblx0XHRcdC8vIENsZWFyIGV2ZW50IGhpc3RvcnkgYW5kIGFkZCB0aGUgc3RhcnQgdG91Y2hcclxuXHRcdFx0X2V2ZW50SGlzdG9yeS5sZW5ndGggPSAwO1xyXG5cdFx0XHRfZXZlbnRIaXN0b3J5LnB1c2goeyB4OiBpbnB1dFgsIHk6IGlucHV0WSwgdDogaW5wdXRUaW1lIH0pO1xyXG5cclxuXHRcdFx0aWYgKHRyaWdnZXJTY3JvbGxJbnRlcnJ1cHQpIHtcclxuXHRcdFx0XHRfdXBkYXRlU2Nyb2xsKGlucHV0WCwgaW5wdXRZLCBpbnB1dFRpbWUsIHJhd0V2ZW50LCB0cmlnZ2VyU2Nyb2xsSW50ZXJydXB0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQ29udGludWUgYSBzY3JvbGwgYXMgYSByZXN1bHQgb2YgYW4gdXBkYXRlZCBwb3NpdGlvblxyXG5cdFx0ICovXHJcblx0XHRfdXBkYXRlU2Nyb2xsID0gZnVuY3Rpb24gX3VwZGF0ZVNjcm9sbChpbnB1dFgsIGlucHV0WSwgaW5wdXRUaW1lLCByYXdFdmVudCwgc2Nyb2xsSW50ZXJydXB0KSB7XHJcblx0XHRcdHZhciBheGlzLCBvdGhlclNjcm9sbGVyQWN0aXZlLCBkaXN0YW5jZXNCZXlvbmRCb3VuZHM7XHJcblx0XHRcdHZhciBpbml0aWFsU2Nyb2xsID0gZmFsc2U7XHJcblx0XHRcdHZhciBnZXN0dXJlID0ge1xyXG5cdFx0XHRcdHg6IGlucHV0WCAtIF9nZXN0dXJlU3RhcnQueCxcclxuXHRcdFx0XHR5OiBpbnB1dFkgLSBfZ2VzdHVyZVN0YXJ0LnlcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE9wZXJhIGZpeFxyXG5cdFx0XHRpZiAoaW5wdXRUaW1lIDw9IDApIHtcclxuXHRcdFx0XHRpbnB1dFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgYmFzZSB0YXJnZXQgcG9zaXRpb25zXHJcblx0XHRcdF90YXJnZXRTY3JvbGxQb3NpdGlvbi54ID0gX2Jhc2VTY3JvbGxQb3NpdGlvbi54ICsgZ2VzdHVyZS54O1xyXG5cdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb24ueSA9IF9iYXNlU2Nyb2xsUG9zaXRpb24ueSArIGdlc3R1cmUueTtcclxuXHJcblx0XHRcdC8vIElmIHNjcm9sbGluZyBoYXMgbm90IHlldCBsb2NrZWQgdG8gdGhpcyBzY3JvbGxlciwgY2hlY2sgd2hldGhlciB0byBzdG9wIHNjcm9sbGluZ1xyXG5cdFx0XHRpZiAoIV9pc1Njcm9sbGluZykge1xyXG5cclxuXHRcdFx0XHQvLyBDaGVjayB0aGUgaW50ZXJuYWwgZmxhZyB0byBkZXRlcm1pbmUgaWYgYW5vdGhlciBGVFNjcm9sbGVyIGlzIHNjcm9sbGluZ1xyXG5cdFx0XHRcdGlmIChfZnRzY3JvbGxlck1vdmluZyAmJiBfZnRzY3JvbGxlck1vdmluZyAhPT0gX3NlbGYpIHtcclxuXHRcdFx0XHRcdG90aGVyU2Nyb2xsZXJBY3RpdmUgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCBjaGVjayB0aGUgd2luZG93IHNjcm9sbGluZyBmbGFnIHRvIHNlZSBpZiBhbnl0aGluZyBlbHNlIGhhcyBjbGFpbWVkIHNjcm9sbGluZ1xyXG5cdFx0XHRcdGVsc2UgaWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZyAmJiB3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSkge1xyXG5cdFx0XHRcdFx0b3RoZXJTY3JvbGxlckFjdGl2ZSA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBJZiBhbm90aGVyIHNjcm9sbGVyIHdhcyBhY3RpdmUsIGNsZWFuIHVwIGFuZCBzdG9wIHByb2Nlc3NpbmcuXHJcblx0XHRcdFx0aWYgKG90aGVyU2Nyb2xsZXJBY3RpdmUpIHtcclxuXHRcdFx0XHRcdF9pbnB1dElkZW50aWZpZXIgPSBmYWxzZTtcclxuXHRcdFx0XHRcdF9yZWxlYXNlSW5wdXRDYXB0dXJlKCk7XHJcblx0XHRcdFx0XHRpZiAoX2lzRGlzcGxheWluZ1Njcm9sbCkge1xyXG5cdFx0XHRcdFx0XHRfY2FuY2VsQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0XHRcdGlmICghX3NuYXBTY3JvbGwodHJ1ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRfZmluYWxpemVTY3JvbGwodHJ1ZSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIG5vdCB5ZXQgZGlzcGxheWluZyBhIHNjcm9sbCwgZGV0ZXJtaW5lIHdoZXRoZXIgdGhhdCB0cmlnZ2VyaW5nIGJvdW5kYXJ5XHJcblx0XHRcdC8vIGhhcyBiZWVuIGV4Y2VlZGVkXHJcblx0XHRcdGlmICghX2lzRGlzcGxheWluZ1Njcm9sbCkge1xyXG5cclxuXHRcdFx0XHQvLyBEZXRlcm1pbmUgc2Nyb2xsIGRpc3RhbmNlIGJleW9uZCBib3VuZHNcclxuXHRcdFx0XHRkaXN0YW5jZXNCZXlvbmRCb3VuZHMgPSBfZGlzdGFuY2VzQmV5b25kQm91bmRzKF90YXJnZXRTY3JvbGxQb3NpdGlvbik7XHJcblxyXG5cdFx0XHRcdC8vIERldGVybWluZSB3aGV0aGVyIHRvIHByZXZlbnQgdGhlIGRlZmF1bHQgc2Nyb2xsIGV2ZW50IC0gaWYgdGhlIHNjcm9sbCBjb3VsZCBzdGlsbFxyXG5cdFx0XHRcdC8vIGJlIHRyaWdnZXJlZCwgcHJldmVudCB0aGUgZGVmYXVsdCB0byBhdm9pZCBwcm9ibGVtcyAocGFydGljdWxhcmx5IG9uIFBsYXlCb29rKVxyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLmJvdW5jaW5nIHx8IHNjcm9sbEludGVycnVwdCB8fCAoX3Njcm9sbGFibGVBeGVzLnggJiYgZ2VzdHVyZS54ICYmIGRpc3RhbmNlc0JleW9uZEJvdW5kcy54IDwgMCkgfHwgKF9zY3JvbGxhYmxlQXhlcy55ICYmIGdlc3R1cmUueSAmJiBkaXN0YW5jZXNCZXlvbmRCb3VuZHMueSA8IDApKSB7XHJcblx0XHRcdFx0XHRyYXdFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgc2Nyb2xsZWQgZGlzdGFuY2UgYWdhaW5zdCB0aGUgYm91bmRhcnkgbGltaXQgdG8gc2VlIGlmIHNjcm9sbGluZyBjYW4gYmUgdHJpZ2dlcmVkLlxyXG5cdFx0XHRcdC8vIElmIHRoZSBzY3JvbGwgaGFzIGJlZW4gaW50ZXJydXB0ZWQsIHRyaWdnZXIgYXQgb25jZVxyXG5cdFx0XHRcdGlmICghc2Nyb2xsSW50ZXJydXB0ICYmICghX3Njcm9sbGFibGVBeGVzLnggfHwgTWF0aC5hYnMoZ2VzdHVyZS54KSA8IF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsUmVzcG9uc2VCb3VuZGFyeSkgJiYgKCFfc2Nyb2xsYWJsZUF4ZXMueSB8fCBNYXRoLmFicyhnZXN0dXJlLnkpIDwgX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxSZXNwb25zZUJvdW5kYXJ5KSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gSWYgYm91bmNpbmcgaXMgZGlzYWJsZWQsIGFuZCBhbHJlYWR5IGF0IGFuIGVkZ2UgYW5kIHNjcm9sbGluZyBiZXlvbmQgdGhlIGVkZ2UsIGlnbm9yZSB0aGUgc2Nyb2xsIGZvclxyXG5cdFx0XHRcdC8vIG5vdyAtIHRoaXMgYWxsb3dzIG90aGVyIHNjcm9sbGVycyB0byBjbGFpbSBpZiBhcHByb3ByaWF0ZSwgYWxsb3dpbmcgbmljZXIgbmVzdGVkIHNjcm9sbHMuXHJcblx0XHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLmJvdW5jaW5nICYmICFzY3JvbGxJbnRlcnJ1cHQgJiYgKCFfc2Nyb2xsYWJsZUF4ZXMueCB8fCAhZ2VzdHVyZS54IHx8IGRpc3RhbmNlc0JleW9uZEJvdW5kcy54ID4gMCkgJiYgKCFfc2Nyb2xsYWJsZUF4ZXMueSB8fCAhZ2VzdHVyZS55IHx8IGRpc3RhbmNlc0JleW9uZEJvdW5kcy55ID4gMCkpIHtcclxuXHJcblx0XHRcdFx0XHQvLyBQcmV2ZW50IHRoZSBvcmlnaW5hbCBjbGljayBub3cgdGhhdCBzY3JvbGxpbmcgd291bGQgYmUgdHJpZ2dlcmVkXHJcblx0XHRcdFx0XHRfcHJldmVudENsaWNrID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBUcmlnZ2VyIHRoZSBzdGFydCBvZiB2aXN1YWwgc2Nyb2xsaW5nXHJcblx0XHRcdFx0X3N0YXJ0QW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0X2lzRGlzcGxheWluZ1Njcm9sbCA9IHRydWU7XHJcblx0XHRcdFx0X2hhc0JlZW5TY3JvbGxlZCA9IHRydWU7XHJcblx0XHRcdFx0X2lzQW5pbWF0aW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRpbml0aWFsU2Nyb2xsID0gdHJ1ZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0Ly8gUHJldmVudCB0aGUgZXZlbnQgZGVmYXVsdC4gIEl0IGlzIHNhZmUgdG8gY2FsbCB0aGlzIGluIElFMTAgYmVjYXVzZSB0aGUgZXZlbnQgaXMgbmV2ZXJcclxuXHRcdFx0XHQvLyBhIHdpbmRvdy5ldmVudCwgYWx3YXlzIGEgXCJ0cnVlXCIgZXZlbnQuXHJcblx0XHRcdFx0cmF3RXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgbm90IHlldCBsb2NrZWQgdG8gYSBzY3JvbGwsIGRldGVybWluZSB3aGV0aGVyIHRvIGRvIHNvXHJcblx0XHRcdGlmICghX2lzU2Nyb2xsaW5nKSB7XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoZSBnZXN0dXJlIGRpc3RhbmNlIGhhcyBleGNlZWRlZCB0aGUgc2Nyb2xsIGxvY2sgZGlzdGFuY2UsIG9yIHNuYXBwaW5nIGlzIGFjdGl2ZVxyXG5cdFx0XHRcdC8vIGFuZCB0aGUgc2Nyb2xsIGhhcyBiZWVuIGludGVycnVwdGVkLCBlbnRlciBleGNsdXNpdmUgc2Nyb2xsaW5nLlxyXG5cdFx0XHRcdGlmICgoc2Nyb2xsSW50ZXJydXB0ICYmIF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHx8IChfc2Nyb2xsYWJsZUF4ZXMueCAmJiBNYXRoLmFicyhnZXN0dXJlLngpID49IF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsQm91bmRhcnkpIHx8IChfc2Nyb2xsYWJsZUF4ZXMueSAmJiBNYXRoLmFicyhnZXN0dXJlLnkpID49IF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsQm91bmRhcnkpKSB7XHJcblxyXG5cdFx0XHRcdFx0X2lzU2Nyb2xsaW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRcdF9mdHNjcm9sbGVyTW92aW5nID0gX3NlbGY7XHJcblx0XHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnKSB7XHJcblx0XHRcdFx0XHRcdHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddID0gX3NlbGY7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGxzdGFydCcsIF9nZXRQb3NpdGlvbigpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENhbmNlbCB0ZXh0IHNlbGVjdGlvbnMgd2hpbGUgZHJhZ2dpbmcgYSBjdXJzb3JcclxuXHRcdFx0aWYgKF9jYW5DbGVhclNlbGVjdGlvbikge1xyXG5cdFx0XHRcdHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5yZW1vdmVBbGxSYW5nZXMoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGF4ZXMgdGFyZ2V0IHBvc2l0aW9ucyBpZiBiZXlvbmQgYm91bmRzXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblx0XHRcdFx0XHRpZiAoX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdID4gMCkge1xyXG5cdFx0XHRcdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gPSBfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMoX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdLCBheGlzKTtcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdIDwgX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSA9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSArIF9tb2RpZnlEaXN0YW5jZUJleW9uZEJvdW5kcyhfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gLSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10sIGF4aXMpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVHJpZ2dlciBhIHNjcm9sbCBwb3NpdGlvbiB1cGRhdGUgZm9yIHBsYXRmb3JtcyBub3QgdXNpbmcgcmVxdWVzdEFuaW1hdGlvbkZyYW1lc1xyXG5cdFx0XHRpZiAoIV9yZXFBbmltYXRpb25GcmFtZSkge1xyXG5cdFx0XHRcdF9zY2hlZHVsZVJlbmRlcigpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUbyBhaWQgcmVuZGVyL2RyYXcgY29hbGVzY2luZywgcGVyZm9ybSBvdGhlciBvbmUtb2ZmIGFjdGlvbnMgaGVyZVxyXG5cdFx0XHRpZiAoaW5pdGlhbFNjcm9sbCkge1xyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ0NsYXNzTmFtZSkge1xyXG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuY2xhc3NOYW1lICs9ICcgJyArIF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nQ2xhc3NOYW1lO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXNbYXhpc10uY2xhc3NOYW1lICs9ICcgYWN0aXZlJztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIGFuIGV2ZW50IHRvIHRoZSBldmVudCBoaXN0b3J5LCBrZWVwaW5nIGl0IGFyb3VuZCB0d2VudHkgZXZlbnRzIGxvbmdcclxuXHRcdFx0X2V2ZW50SGlzdG9yeS5wdXNoKHsgeDogaW5wdXRYLCB5OiBpbnB1dFksIHQ6IGlucHV0VGltZSB9KTtcclxuXHRcdFx0aWYgKF9ldmVudEhpc3RvcnkubGVuZ3RoID4gMzApIHtcclxuXHRcdFx0XHRfZXZlbnRIaXN0b3J5LnNwbGljZSgwLCAxNSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDb21wbGV0ZSBhIHNjcm9sbCB3aXRoIGEgZmluYWwgZXZlbnQgdGltZSBpZiBhdmFpbGFibGUgKGl0IG1heVxyXG5cdFx0ICogbm90IGJlLCBkZXBlbmRpbmcgb24gdGhlIGlucHV0IHR5cGUpOyB0aGlzIG1heSBjb250aW51ZSB0aGUgc2Nyb2xsXHJcblx0XHQgKiB3aXRoIGEgZmxpbmcgYW5kL29yIGJvdW5jZWJhY2sgZGVwZW5kaW5nIG9uIG9wdGlvbnMuXHJcblx0XHQgKi9cclxuXHRcdF9lbmRTY3JvbGwgPSBmdW5jdGlvbiBfZW5kU2Nyb2xsKGlucHV0VGltZSwgcmF3RXZlbnQpIHtcclxuXHRcdFx0X2lucHV0SWRlbnRpZmllciA9IGZhbHNlO1xyXG5cdFx0XHRfcmVsZWFzZUlucHV0Q2FwdHVyZSgpO1xyXG5cdFx0XHRfY2FuY2VsQW5pbWF0aW9uKCk7XHJcblxyXG5cdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGxpbnRlcmFjdGlvbmVuZCcsIHt9KTtcclxuXHJcblx0XHRcdGlmICghX2lzU2Nyb2xsaW5nKSB7XHJcblx0XHRcdFx0aWYgKCFfc25hcFNjcm9sbCh0cnVlKSAmJiBfaXNEaXNwbGF5aW5nU2Nyb2xsKSB7XHJcblx0XHRcdFx0XHRfZmluYWxpemVTY3JvbGwodHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTW9kaWZ5IHRoZSBsYXN0IG1vdmVtZW50IGV2ZW50IHRvIGluY2x1ZGUgdGhlIGVuZCBldmVudCB0aW1lXHJcblx0XHRcdF9ldmVudEhpc3RvcnlbX2V2ZW50SGlzdG9yeS5sZW5ndGggLSAxXS50ID0gaW5wdXRUaW1lO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGZsYWdzXHJcblx0XHRcdF9pc1Njcm9sbGluZyA9IGZhbHNlO1xyXG5cdFx0XHRfaXNEaXNwbGF5aW5nU2Nyb2xsID0gZmFsc2U7XHJcblx0XHRcdF9mdHNjcm9sbGVyTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcpIHtcclxuXHRcdFx0XHR3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQcmV2ZW50IGNsaWNrcyBhbmQgc3RvcCB0aGUgZXZlbnQgZGVmYXVsdC4gIEl0IGlzIHNhZmUgdG8gY2FsbCB0aGlzIGluIElFMTAgYmVjYXVzZVxyXG5cdFx0XHQvLyB0aGUgZXZlbnQgaXMgbmV2ZXIgYSB3aW5kb3cuZXZlbnQsIGFsd2F5cyBhIFwidHJ1ZVwiIGV2ZW50LlxyXG5cdFx0XHRfcHJldmVudENsaWNrID0gdHJ1ZTtcclxuXHRcdFx0aWYgKHJhd0V2ZW50KSB7XHJcblx0XHRcdFx0cmF3RXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVHJpZ2dlciBhIGZsaW5nIG9yIGJvdW5jZWJhY2sgaWYgbmVjZXNzYXJ5XHJcblx0XHRcdGlmICghX2ZsaW5nU2Nyb2xsKCkgJiYgIV9zbmFwU2Nyb2xsKCkpIHtcclxuXHRcdFx0XHRfZmluYWxpemVTY3JvbGwoKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFJlbW92ZSB0aGUgc2Nyb2xsaW5nIGNsYXNzLCBjbGVhbmluZyB1cCBkaXNwbGF5LlxyXG5cdFx0ICovXHJcblx0XHRfZmluYWxpemVTY3JvbGwgPSBmdW5jdGlvbiBfZmluYWxpemVTY3JvbGwoc2Nyb2xsQ2FuY2VsbGVkKSB7XHJcblx0XHRcdHZhciBpLCBsLCBheGlzLCBzY3JvbGxFdmVudCwgc2Nyb2xsUmVnZXg7XHJcblxyXG5cdFx0XHRfaXNBbmltYXRpbmcgPSBmYWxzZTtcclxuXHRcdFx0X2lzRGlzcGxheWluZ1Njcm9sbCA9IGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIHNjcm9sbGluZyBjbGFzcyBpZiBzZXRcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nQ2xhc3NOYW1lKSB7XHJcblx0XHRcdFx0c2Nyb2xsUmVnZXggPSBuZXcgUmVnRXhwKCcoPzpefFxcXFxzKScgKyBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ0NsYXNzTmFtZSArICcoPyFcXFxcUyknLCAnZycpO1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLmNsYXNzTmFtZSA9IF9jb250YWluZXJOb2RlLmNsYXNzTmFtZS5yZXBsYWNlKHNjcm9sbFJlZ2V4LCAnJyk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLmNsYXNzTmFtZSA9IF9zY3JvbGxiYXJOb2Rlc1theGlzXS5jbGFzc05hbWUucmVwbGFjZSgvID9hY3RpdmUvZywgJycpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3RvcmUgZmluYWwgcG9zaXRpb24gaWYgc2Nyb2xsaW5nIG9jY3VycmVkXHJcblx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb24ueCA9IF9sYXN0U2Nyb2xsUG9zaXRpb24ueDtcclxuXHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbi55ID0gX2xhc3RTY3JvbGxQb3NpdGlvbi55O1xyXG5cclxuXHRcdFx0c2Nyb2xsRXZlbnQgPSBfZ2V0UG9zaXRpb24oKTtcclxuXHJcblx0XHRcdGlmICghc2Nyb2xsQ2FuY2VsbGVkKSB7XHJcblx0XHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsJywgc2Nyb2xsRXZlbnQpO1xyXG5cdFx0XHRcdF91cGRhdGVTZWdtZW50cyh0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWx3YXlzIGZpcmUgdGhlIHNjcm9sbCBlbmQgZXZlbnQsIGluY2x1ZGluZyBhbiBhcmd1bWVudCBpbmRpY2F0aW5nIHdoZXRoZXJcclxuXHRcdFx0Ly8gdGhlIHNjcm9sbCB3YXMgY2FuY2VsbGVkXHJcblx0XHRcdHNjcm9sbEV2ZW50LmNhbmNlbGxlZCA9IHNjcm9sbENhbmNlbGxlZDtcclxuXHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsZW5kJywgc2Nyb2xsRXZlbnQpO1xyXG5cclxuXHRcdFx0Ly8gUmVzdG9yZSB0cmFuc2l0aW9uc1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0X3Njcm9sbE5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gJyc7XHJcblx0XHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNpdGlvblByb3BlcnR5XSA9ICcnO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgYW55IHJlbWFpbmluZyB0aW1lb3V0c1xyXG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gX3RpbWVvdXRzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX3RpbWVvdXRzW2ldKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRfdGltZW91dHMubGVuZ3RoID0gMDtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBJbnRlcnJ1cHQgYSBjdXJyZW50IHNjcm9sbCwgYWxsb3dpbmcgYSBzdGFydCBzY3JvbGwgZHVyaW5nIGFuaW1hdGlvbiB0byB0cmlnZ2VyIGEgbmV3IHNjcm9sbFxyXG5cdFx0ICovXHJcblx0XHRfaW50ZXJydXB0U2Nyb2xsID0gZnVuY3Rpb24gX2ludGVycnVwdFNjcm9sbCgpIHtcclxuXHRcdFx0dmFyIGF4aXMsIGksIGw7XHJcblxyXG5cdFx0XHRfaXNBbmltYXRpbmcgPSBmYWxzZTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgc3RvcmVkIGJhc2UgcG9zaXRpb25cclxuXHRcdFx0X3VwZGF0ZUVsZW1lbnRQb3NpdGlvbigpO1xyXG5cclxuXHRcdFx0Ly8gRW5zdXJlIHRoZSBwYXJzZWQgcG9zaXRpb25zIGFyZSBzZXQsIGFsc28gY2xlYXJpbmcgdHJhbnNpdGlvbnNcclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oYXhpcywgX2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXSwgMTYsIF9pbnN0YW5jZU9wdGlvbnMuYm91bmNlRGVjZWxlcmF0aW9uQmV6aWVyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBzZWdtZW50IHRyYWNraW5nIGlmIHNuYXBwaW5nIGlzIGFjdGl2ZVxyXG5cdFx0XHRfdXBkYXRlU2VnbWVudHMoZmFsc2UpO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYXIgYW55IHJlbWFpbmluZyB0aW1lb3V0c1xyXG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gX3RpbWVvdXRzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX3RpbWVvdXRzW2ldKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRfdGltZW91dHMubGVuZ3RoID0gMDtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBEZXRlcm1pbmUgd2hldGhlciBhIHNjcm9sbCBmbGluZyBvciBib3VuY2ViYWNrIGlzIHJlcXVpcmVkLCBhbmQgc2V0IHVwIHRoZSBzdHlsZXMgYW5kXHJcblx0XHQgKiB0aW1lb3V0cyByZXF1aXJlZC5cclxuXHRcdCAqL1xyXG5cdFx0X2ZsaW5nU2Nyb2xsID0gZnVuY3Rpb24gX2ZsaW5nU2Nyb2xsKCkge1xyXG5cdFx0XHR2YXIgaSwgYXhpcywgbW92ZW1lbnRUaW1lLCBtb3ZlbWVudFNwZWVkLCBsYXN0UG9zaXRpb24sIGNvbXBhcmlzb25Qb3NpdGlvbiwgZmxpbmdEdXJhdGlvbiwgZmxpbmdEaXN0YW5jZSwgZmxpbmdQb3NpdGlvbiwgYm91bmNlRGVsYXksIGJvdW5jZURpc3RhbmNlLCBib3VuY2VEdXJhdGlvbiwgYm91bmNlVGFyZ2V0LCBib3VuZHNCb3VuY2UsIG1vZGlmaWVkRGlzdGFuY2UsIGZsaW5nQmV6aWVyLCB0aW1lUHJvcG9ydGlvbiwgYm91bmRzQ3Jvc3NEZWxheSwgZmxpbmdTdGFydFNlZ21lbnQsIGJleW9uZEJvdW5kc0ZsaW5nRGlzdGFuY2UsIGJhc2VGbGluZ0NvbXBvbmVudDtcclxuXHRcdFx0dmFyIG1heEFuaW1hdGlvblRpbWUgPSAwO1xyXG5cdFx0XHR2YXIgbW92ZVJlcXVpcmVkID0gZmFsc2U7XHJcblx0XHRcdHZhciBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5ID0ge307XHJcblxyXG5cdFx0XHQvLyBJZiB3ZSBvbmx5IGhhdmUgdGhlIHN0YXJ0IGV2ZW50IGF2YWlsYWJsZSwgb3IgZmxpbmdpbmcgaXMgZGlzYWJsZWQsXHJcblx0XHRcdC8vIG9yIHRoZSBzY3JvbGwgd2FzIHRyaWdnZXJlZCBieSBhIHNjcm9sbHdoZWVsLCBubyBhY3Rpb24gcmVxdWlyZWQuXHJcblx0XHRcdGlmIChfZXZlbnRIaXN0b3J5Lmxlbmd0aCA9PT0gMSB8fCAhX2luc3RhbmNlT3B0aW9ucy5mbGluZ2luZyB8fCBfaW5wdXRJZGVudGlmaWVyID09PSAnc2Nyb2xsd2hlZWwnKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0Ym91bmNlRHVyYXRpb24gPSAzNTA7XHJcblx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IDA7XHJcblx0XHRcdFx0XHRib3VuZHNCb3VuY2UgPSBmYWxzZTtcclxuXHRcdFx0XHRcdGJvdW5jZVRhcmdldCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0Ym91bmRzQ3Jvc3NEZWxheSA9IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdFx0XHQvLyBSZS1zZXQgYSBkZWZhdWx0IGJlemllciBjdXJ2ZSBmb3IgdGhlIGFuaW1hdGlvbiBmb3IgcG90ZW50aWFsIG1vZGlmaWNhdGlvblxyXG5cdFx0XHRcdFx0ZmxpbmdCZXppZXIgPSBfaW5zdGFuY2VPcHRpb25zLmZsaW5nQmV6aWVyO1xyXG5cclxuXHRcdFx0XHRcdC8vIEdldCB0aGUgbGFzdCBtb3ZlbWVudCBzcGVlZCwgaW4gcGl4ZWxzIHBlciBtaWxsaXNlY29uZC4gIFRvIGRvIHRoaXMsIGxvb2sgYXQgdGhlIGV2ZW50c1xyXG5cdFx0XHRcdFx0Ly8gaW4gdGhlIGxhc3QgMTAwbXMgYW5kIGF2ZXJhZ2Ugb3V0IHRoZSBzcGVlZCwgdXNpbmcgYSBtaW5pbXVtIG51bWJlciBvZiB0d28gcG9pbnRzLlxyXG5cdFx0XHRcdFx0bGFzdFBvc2l0aW9uID0gX2V2ZW50SGlzdG9yeVtfZXZlbnRIaXN0b3J5Lmxlbmd0aCAtIDFdO1xyXG5cdFx0XHRcdFx0Y29tcGFyaXNvblBvc2l0aW9uID0gX2V2ZW50SGlzdG9yeVtfZXZlbnRIaXN0b3J5Lmxlbmd0aCAtIDJdO1xyXG5cdFx0XHRcdFx0Zm9yIChpID0gX2V2ZW50SGlzdG9yeS5sZW5ndGggLSAzOyBpID49IDA7IGkgPSBpIC0gMSkge1xyXG5cdFx0XHRcdFx0XHRpZiAobGFzdFBvc2l0aW9uLnQgLSBfZXZlbnRIaXN0b3J5W2ldLnQgPiAxMDApIHtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRjb21wYXJpc29uUG9zaXRpb24gPSBfZXZlbnRIaXN0b3J5W2ldO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEdldCB0aGUgbGFzdCBtb3ZlbWVudCB0aW1lLiAgSWYgdGhpcyBpcyB6ZXJvIC0gYXMgY2FuIGhhcHBlbiB3aXRoXHJcblx0XHRcdFx0XHQvLyBzb21lIHNjcm9sbHdoZWVsIGV2ZW50cyBvbiBzb21lIHBsYXRmb3JtcyAtIGluY3JlYXNlIGl0IHRvIDE2bXMgYXNcclxuXHRcdFx0XHRcdC8vIGlmIHRoZSBtb3ZlbWVudCBvY2N1cnJlZCBvdmVyIGEgc2luZ2xlIGZyYW1lIGF0IDYwZnBzLlxyXG5cdFx0XHRcdFx0bW92ZW1lbnRUaW1lID0gbGFzdFBvc2l0aW9uLnQgLSBjb21wYXJpc29uUG9zaXRpb24udDtcclxuXHRcdFx0XHRcdGlmICghbW92ZW1lbnRUaW1lKSB7XHJcblx0XHRcdFx0XHRcdG1vdmVtZW50VGltZSA9IDE2O1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIERlcml2ZSB0aGUgbW92ZW1lbnQgc3BlZWRcclxuXHRcdFx0XHRcdG1vdmVtZW50U3BlZWQgPSAobGFzdFBvc2l0aW9uW2F4aXNdIC0gY29tcGFyaXNvblBvc2l0aW9uW2F4aXNdKSAvIG1vdmVtZW50VGltZTtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGVyZSBpcyBsaXR0bGUgc3BlZWQsIG5vIGZ1cnRoZXIgYWN0aW9uIHJlcXVpcmVkIGV4Y2VwdCBmb3IgYSBib3VuY2ViYWNrLCBiZWxvdy5cclxuXHRcdFx0XHRcdGlmIChNYXRoLmFicyhtb3ZlbWVudFNwZWVkKSA8IF9rTWluaW11bVNwZWVkKSB7XHJcblx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSAwO1xyXG5cdFx0XHRcdFx0XHRmbGluZ0Rpc3RhbmNlID0gMDtcclxuXHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cclxuXHJcblx0XHRcdFx0XHRcdC8qIENhbGN1bGF0ZSB0aGUgZmxpbmcgZHVyYXRpb24uICBBcyBwZXIgVG91Y2hTY3JvbGwsIHRoZSBzcGVlZCBhdCBhbnkgcGFydGljdWxhclxyXG5cdFx0XHRcdFx0XHRwb2ludCBpbiB0aW1lIGNhbiBiZSBjYWxjdWxhdGVkIGFzOlxyXG5cdFx0XHRcdFx0XHRcdHsgc3BlZWQgfSA9IHsgaW5pdGlhbCBzcGVlZCB9ICogKHsgZnJpY3Rpb24gfSB0byB0aGUgcG93ZXIgb2YgeyBkdXJhdGlvbiB9KVxyXG5cdFx0XHRcdFx0XHQuLi5hc3N1bWluZyBhbGwgdmFsdWVzIGFyZSBpbiBlcXVhbCBwaXhlbHMvbWlsbGlzZWNvbmQgbWVhc3VyZW1lbnRzLiAgQXMgd2Uga25vdyB0aGVcclxuXHRcdFx0XHRcdFx0bWluaW11bSB0YXJnZXQgc3BlZWQsIHRoaXMgY2FuIGJlIGFsdGVyZWQgdG86XHJcblx0XHRcdFx0XHRcdFx0eyBkdXJhdGlvbiB9ID0gbG9nKCB7IHNwZWVkIH0gLyB7IGluaXRpYWwgc3BlZWQgfSApIC8gbG9nKCB7IGZyaWN0aW9uIH0gKVxyXG5cdFx0XHRcdFx0XHQqL1xyXG5cclxuXHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IE1hdGgubG9nKF9rTWluaW11bVNwZWVkIC8gTWF0aC5hYnMobW92ZW1lbnRTcGVlZCkpIC8gTWF0aC5sb2coX2tGcmljdGlvbik7XHJcblxyXG5cclxuXHRcdFx0XHRcdFx0LyogQ2FsY3VsYXRlIHRoZSBmbGluZyBkaXN0YW5jZSAoYmVmb3JlIGFueSBib3VuY2luZyBvciBzbmFwcGluZykuICBBcyBwZXJcclxuXHRcdFx0XHRcdFx0VG91Y2hTY3JvbGwsIHRoZSB0b3RhbCBkaXN0YW5jZSBjb3ZlcmVkIGNhbiBiZSBhcHByb3hpbWF0ZWQgYnkgc3VtbWluZ1xyXG5cdFx0XHRcdFx0XHR0aGUgZGlzdGFuY2UgcGVyIG1pbGxpc2Vjb25kLCBwZXIgbWlsbGlzZWNvbmQgb2YgZHVyYXRpb24gLSBhIGRpdmVyZ2VudCBzZXJpZXMsXHJcblx0XHRcdFx0XHRcdGFuZCBzbyByYXRoZXIgdHJpY2t5IHRvIG1vZGVsIG90aGVyd2lzZSFcclxuXHRcdFx0XHRcdFx0U28gdXNpbmcgdmFsdWVzIGluIHBpeGVscyBwZXIgbWlsbGlzZWNvbmQ6XHJcblx0XHRcdFx0XHRcdFx0eyBkaXN0YW5jZSB9ID0geyBpbml0aWFsIHNwZWVkIH0gKiAoMSAtICh7IGZyaWN0aW9uIH0gdG8gdGhlIHBvd2VyXHJcblx0XHRcdFx0XHRcdFx0XHRvZiB7IGR1cmF0aW9uICsgMSB9KSAvICgxIC0geyBmcmljdGlvbiB9KVxyXG5cdFx0XHRcdFx0XHQqL1xyXG5cclxuXHRcdFx0XHRcdFx0ZmxpbmdEaXN0YW5jZSA9IG1vdmVtZW50U3BlZWQgKiAoMSAtIE1hdGgucG93KF9rRnJpY3Rpb24sIGZsaW5nRHVyYXRpb24gKyAxKSkgLyAoMSAtIF9rRnJpY3Rpb24pO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIERldGVybWluZSBhIHRhcmdldCBmbGluZyBwb3NpdGlvblxyXG5cdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IE1hdGguZmxvb3IoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSArIGZsaW5nRGlzdGFuY2UpO1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIGJvdW5jaW5nIGlzIGRpc2FibGVkLCBhbmQgdGhlIGxhc3Qgc2Nyb2xsIHBvc2l0aW9uIGFuZCBmbGluZyBwb3NpdGlvbiBhcmUgYm90aCBhdCBhIGJvdW5kLFxyXG5cdFx0XHRcdFx0Ly8gcmVzZXQgdGhlIGZsaW5nIHBvc2l0aW9uIHRvIHRoZSBib3VuZFxyXG5cdFx0XHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLmJvdW5jaW5nKSB7XHJcblx0XHRcdFx0XHRcdGlmIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdID09PSAwICYmIGZsaW5nUG9zaXRpb24gPiAwKSB7XHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IDA7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA9PT0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdICYmIGZsaW5nUG9zaXRpb24gPCBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc107XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBJbiBwYWdpbmF0ZWQgc25hcHBpbmcgbW9kZSwgZGV0ZXJtaW5lIHRoZSBwYWdlIHRvIHNuYXAgdG8gLSBtYXhpbXVtXHJcblx0XHRcdFx0XHQvLyBvbmUgcGFnZSBpbiBlaXRoZXIgZGlyZWN0aW9uIGZyb20gdGhlIGN1cnJlbnQgcGFnZS5cclxuXHRcdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnBhZ2luYXRlZFNuYXAgJiYgX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xyXG5cdFx0XHRcdFx0XHRmbGluZ1N0YXJ0U2VnbWVudCA9IC1fbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXTtcclxuXHRcdFx0XHRcdFx0aWYgKF9iYXNlU2VnbWVudFtheGlzXSA8IGZsaW5nU3RhcnRTZWdtZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdTdGFydFNlZ21lbnQgPSBNYXRoLmZsb29yKGZsaW5nU3RhcnRTZWdtZW50KTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRmbGluZ1N0YXJ0U2VnbWVudCA9IE1hdGguY2VpbChmbGluZ1N0YXJ0U2VnbWVudCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIElmIHRoZSB0YXJnZXQgcG9zaXRpb24gd2lsbCBlbmQgdXAgYmV5b25kIGFub3RoZXIgcGFnZSwgdGFyZ2V0IHRoYXQgcGFnZSBlZGdlXHJcblx0XHRcdFx0XHRcdGlmIChmbGluZ1Bvc2l0aW9uID4gLShmbGluZ1N0YXJ0U2VnbWVudCAtIDEpICogX3NuYXBHcmlkU2l6ZVtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiArIChmbGluZ1N0YXJ0U2VnbWVudCAtIDEpICogX3NuYXBHcmlkU2l6ZVtheGlzXTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChmbGluZ1Bvc2l0aW9uIDwgLShmbGluZ1N0YXJ0U2VnbWVudCArIDEpICogX3NuYXBHcmlkU2l6ZVtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiArIChmbGluZ1N0YXJ0U2VnbWVudCArIDEpICogX3NuYXBHcmlkU2l6ZVtheGlzXTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIE90aGVyd2lzZSwgaWYgdGhlIG1vdmVtZW50IHNwZWVkIHdhcyBhYm92ZSB0aGUgbWluaW11bSB2ZWxvY2l0eSwgY29udGludWVcclxuXHRcdFx0XHRcdFx0Ly8gaW4gdGhlIG1vdmUgZGlyZWN0aW9uLlxyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKE1hdGguYWJzKG1vdmVtZW50U3BlZWQpID4gX2tNaW5pbXVtU3BlZWQpIHtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHRoZSB0YXJnZXQgc2VnbWVudFxyXG5cdFx0XHRcdFx0XHRcdGlmIChtb3ZlbWVudFNwZWVkIDwgMCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IE1hdGguZmxvb3IoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc10pICogX3NuYXBHcmlkU2l6ZVtheGlzXTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IE1hdGguY2VpbChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IE1hdGgubWluKF9pbnN0YW5jZU9wdGlvbnMubWF4RmxpbmdEdXJhdGlvbiwgZmxpbmdEdXJhdGlvbiAqIChmbGluZ1Bvc2l0aW9uIC0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSkgLyBmbGluZ0Rpc3RhbmNlKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEluIG5vbi1wYWdpbmF0ZWQgc25hcHBpbmcgbW9kZSwgc25hcCB0byB0aGUgbmVhcmVzdCBncmlkIGxvY2F0aW9uIHRvIHRoZSB0YXJnZXRcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xyXG5cdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb24gLSAoTWF0aC5yb3VuZChmbGluZ1Bvc2l0aW9uIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkgKiBfc25hcEdyaWRTaXplW2F4aXNdKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBEZWFsIHdpdGggY2FzZXMgd2hlcmUgdGhlIHRhcmdldCBpcyBiZXlvbmQgdGhlIGJvdW5kc1xyXG5cdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gLSBib3VuY2VEaXN0YW5jZSA+IDApIHtcclxuXHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uO1xyXG5cdFx0XHRcdFx0XHRib3VuZHNCb3VuY2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChmbGluZ1Bvc2l0aW9uIC0gYm91bmNlRGlzdGFuY2UgPCBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uIC0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHRib3VuZHNCb3VuY2UgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEFtZW5kIHRoZSBwb3NpdGlvbnMgYW5kIGJlemllciBjdXJ2ZSBpZiBuZWNlc3NhcnlcclxuXHRcdFx0XHRcdGlmIChib3VuY2VEaXN0YW5jZSkge1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhlIGZsaW5nIG1vdmVzIHRoZSBzY3JvbGxlciBiZXlvbmQgdGhlIG5vcm1hbCBzY3JvbGwgYm91bmRzLCBhbmRcclxuXHRcdFx0XHRcdFx0Ly8gdGhlIGJvdW5jZSBpcyBzbmFwcGluZyB0aGUgc2Nyb2xsIGJhY2sgYWZ0ZXIgdGhlIGZsaW5nOlxyXG5cdFx0XHRcdFx0XHRpZiAoYm91bmRzQm91bmNlICYmIF9pbnN0YW5jZU9wdGlvbnMuYm91bmNpbmcgJiYgZmxpbmdEaXN0YW5jZSkge1xyXG5cdFx0XHRcdFx0XHRcdGZsaW5nRGlzdGFuY2UgPSBNYXRoLmZsb29yKGZsaW5nRGlzdGFuY2UpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRpZiAoZmxpbmdQb3NpdGlvbiA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGJleW9uZEJvdW5kc0ZsaW5nRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uIC0gTWF0aC5tYXgoMCwgX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSk7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdGJleW9uZEJvdW5kc0ZsaW5nRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uIC0gTWF0aC5taW4oX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdLCBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0YmFzZUZsaW5nQ29tcG9uZW50ID0gZmxpbmdEaXN0YW5jZSAtIGJleW9uZEJvdW5kc0ZsaW5nRGlzdGFuY2U7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIERldGVybWluZSB0aGUgdGltZSBwcm9wb3J0aW9uIHRoZSBvcmlnaW5hbCBib3VuZCBpcyBhbG9uZyB0aGUgZmxpbmcgY3VydmVcclxuXHRcdFx0XHRcdFx0XHRpZiAoIWZsaW5nRGlzdGFuY2UgfHwgIWZsaW5nRHVyYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0XHRcdHRpbWVQcm9wb3J0aW9uID0gMDtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0dGltZVByb3BvcnRpb24gPSBmbGluZ0Jlemllci5fZ2V0Q29vcmRpbmF0ZUZvclQoZmxpbmdCZXppZXIuZ2V0VEZvclkoKGZsaW5nRGlzdGFuY2UgLSBiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlKSAvIGZsaW5nRGlzdGFuY2UsIDEgLyBmbGluZ0R1cmF0aW9uKSwgZmxpbmdCZXppZXIuX3AxLngsIGZsaW5nQmV6aWVyLl9wMi54KTtcclxuXHRcdFx0XHRcdFx0XHRcdGJvdW5kc0Nyb3NzRGVsYXkgPSB0aW1lUHJvcG9ydGlvbiAqIGZsaW5nRHVyYXRpb247XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBFaWdodGggdGhlIGRpc3RhbmNlIGJleW9uZHMgdGhlIGJvdW5kc1xyXG5cdFx0XHRcdFx0XHRcdG1vZGlmaWVkRGlzdGFuY2UgPSBNYXRoLmNlaWwoYmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZSAvIDgpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBGdXJ0aGVyIGxpbWl0IHRoZSBib3VuY2UgdG8gaGFsZiB0aGUgY29udGFpbmVyIGRpbWVuc2lvbnNcclxuXHRcdFx0XHRcdFx0XHRpZiAoTWF0aC5hYnMobW9kaWZpZWREaXN0YW5jZSkgPiBfbWV0cmljcy5jb250YWluZXJbYXhpc10gLyAyKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAobW9kaWZpZWREaXN0YW5jZSA8IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bW9kaWZpZWREaXN0YW5jZSA9IC1NYXRoLmZsb29yKF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSAvIDIpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bW9kaWZpZWREaXN0YW5jZSA9IE1hdGguZmxvb3IoX21ldHJpY3MuY29udGFpbmVyW2F4aXNdIC8gMik7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRpZiAoZmxpbmdQb3NpdGlvbiA+IDApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGJvdW5jZVRhcmdldCA9IDA7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdGJvdW5jZVRhcmdldCA9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIElmIHRoZSBlbnRpcmUgZmxpbmcgaXMgYSBib3VuY2UsIG1vZGlmeSBhcHByb3ByaWF0ZWx5XHJcblx0XHRcdFx0XHRcdFx0aWYgKHRpbWVQcm9wb3J0aW9uID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gZmxpbmdEdXJhdGlvbiAvIDY7XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSArIGJhc2VGbGluZ0NvbXBvbmVudCArIG1vZGlmaWVkRGlzdGFuY2U7XHJcblx0XHRcdFx0XHRcdFx0XHRib3VuY2VEZWxheSA9IGZsaW5nRHVyYXRpb247XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIE90aGVyd2lzZSwgdGFrZSBhIG5ldyBjdXJ2ZSBhbmQgYWRkIGl0IHRvIHRoZSB0aW1lb3V0IHN0YWNrIGZvciB0aGUgYm91bmNlXHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBUaGUgbmV3IGJvdW5jZSBkZWxheSBpcyB0aGUgcHJlLWJvdW5kYXJ5IGZsaW5nIGR1cmF0aW9uLCBwbHVzIGFcclxuXHRcdFx0XHRcdFx0XHRcdC8vIHNpeHRoIG9mIHRoZSBwb3N0LWJvdW5kYXJ5IGZsaW5nLlxyXG5cdFx0XHRcdFx0XHRcdFx0Ym91bmNlRGVsYXkgPSAodGltZVByb3BvcnRpb24gKyAoKDEgLSB0aW1lUHJvcG9ydGlvbikgLyA2KSkgKiBmbGluZ0R1cmF0aW9uO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdF9zY2hlZHVsZUF4aXNQb3NpdGlvbihheGlzLCAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSArIGJhc2VGbGluZ0NvbXBvbmVudCArIG1vZGlmaWVkRGlzdGFuY2UpLCAoKDEgLSB0aW1lUHJvcG9ydGlvbikgKiBmbGluZ0R1cmF0aW9uIC8gNiksIF9pbnN0YW5jZU9wdGlvbnMuYm91bmNlRGVjZWxlcmF0aW9uQmV6aWVyLCBib3VuZHNDcm9zc0RlbGF5KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBNb2RpZnkgdGhlIGZsaW5nIHRvIG1hdGNoLCBjbGlwcGluZyB0byBwcmV2ZW50IG92ZXItZmxpbmdcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nQmV6aWVyID0gZmxpbmdCZXppZXIuZGl2aWRlQXRYKGJvdW5jZURlbGF5IC8gZmxpbmdEdXJhdGlvbiwgMSAvIGZsaW5nRHVyYXRpb24pWzBdO1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IGJvdW5jZURlbGF5O1xyXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICsgYmFzZUZsaW5nQ29tcG9uZW50ICsgbW9kaWZpZWREaXN0YW5jZSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhlIGZsaW5nIHJlcXVpcmVzIHNuYXBwaW5nIHRvIGEgc25hcCBsb2NhdGlvbiwgYW5kIHRoZSBib3VuY2UgbmVlZHMgdG9cclxuXHRcdFx0XHRcdFx0Ly8gcmV2ZXJzZSB0aGUgZmxpbmcgZGlyZWN0aW9uIGFmdGVyIHRoZSBmbGluZyBjb21wbGV0ZXM6XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoKGZsaW5nRGlzdGFuY2UgPCAwICYmIGJvdW5jZURpc3RhbmNlIDwgZmxpbmdEaXN0YW5jZSkgfHwgKGZsaW5nRGlzdGFuY2UgPiAwICYmIGJvdW5jZURpc3RhbmNlID4gZmxpbmdEaXN0YW5jZSkpIHtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gU2hvcnRlbiB0aGUgb3JpZ2luYWwgZmxpbmcgZHVyYXRpb24gdG8gcmVmbGVjdCB0aGUgYm91bmNlXHJcblx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IGZsaW5nUG9zaXRpb24gLSBNYXRoLmZsb29yKGZsaW5nRGlzdGFuY2UgLyAyKTtcclxuXHRcdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IGJvdW5jZURpc3RhbmNlIC0gTWF0aC5mbG9vcihmbGluZ0Rpc3RhbmNlIC8gMik7XHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlRHVyYXRpb24gPSBNYXRoLnNxcnQoTWF0aC5hYnMoYm91bmNlRGlzdGFuY2UpKSAqIDUwO1xyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZVRhcmdldCA9IGZsaW5nUG9zaXRpb24gLSBib3VuY2VEaXN0YW5jZTtcclxuXHRcdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gMzUwO1xyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZURlbGF5ID0gZmxpbmdEdXJhdGlvbiAqIDAuOTc7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgYm91bmNlIGlzIHRydW5jYXRpbmcgdGhlIGZsaW5nLCBvciBjb250aW51aW5nIHRoZSBmbGluZyBvbiBpbiB0aGUgc2FtZVxyXG5cdFx0XHRcdFx0XHQvLyBkaXJlY3Rpb24gdG8gaGl0IHRoZSBuZXh0IGJvdW5kYXJ5OlxyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBmbGluZ1Bvc2l0aW9uIC0gYm91bmNlRGlzdGFuY2U7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIElmIHRoZXJlIHdhcyBubyBmbGluZyBkaXN0YW5jZSBvcmlnaW5hbGx5LCB1c2UgdGhlIGJvdW5jZSBkZXRhaWxzXHJcblx0XHRcdFx0XHRcdFx0aWYgKCFmbGluZ0Rpc3RhbmNlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gYm91bmNlRHVyYXRpb247XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIElmIHRydW5jYXRpbmcgdGhlIGZsaW5nIGF0IGEgc25hcHBpbmcgZWRnZTpcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKChmbGluZ0Rpc3RhbmNlIDwgMCAmJiBib3VuY2VEaXN0YW5jZSA8IDApIHx8IChmbGluZ0Rpc3RhbmNlID4gMCAmJiBib3VuY2VEaXN0YW5jZSA+IDApKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0aW1lUHJvcG9ydGlvbiA9IGZsaW5nQmV6aWVyLl9nZXRDb29yZGluYXRlRm9yVChmbGluZ0Jlemllci5nZXRURm9yWSgoTWF0aC5hYnMoZmxpbmdEaXN0YW5jZSkgLSBNYXRoLmFicyhib3VuY2VEaXN0YW5jZSkpIC8gTWF0aC5hYnMoZmxpbmdEaXN0YW5jZSksIDEgLyBmbGluZ0R1cmF0aW9uKSwgZmxpbmdCZXppZXIuX3AxLngsIGZsaW5nQmV6aWVyLl9wMi54KTtcclxuXHRcdFx0XHRcdFx0XHRcdGZsaW5nQmV6aWVyID0gZmxpbmdCZXppZXIuZGl2aWRlQXRYKHRpbWVQcm9wb3J0aW9uLCAxIC8gZmxpbmdEdXJhdGlvbilbMF07XHJcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gTWF0aC5yb3VuZChmbGluZ0R1cmF0aW9uICogdGltZVByb3BvcnRpb24pO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBJZiBleHRlbmRpbmcgdGhlIGZsaW5nIHRvIHJlYWNoIHRoZSBuZXh0IHNuYXBwaW5nIGJvdW5kYXJ5LCBubyBmdXJ0aGVyXHJcblx0XHRcdFx0XHRcdFx0Ly8gYWN0aW9uIGlzIHJlcXVpcmVkLlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSAwO1xyXG5cdFx0XHRcdFx0XHRcdGJvdW5jZUR1cmF0aW9uID0gMDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIElmIG5vIGZsaW5nIG9yIGJvdW5jZSBpcyByZXF1aXJlZCwgY29udGludWVcclxuXHRcdFx0XHRcdGlmIChmbGluZ1Bvc2l0aW9uID09PSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICYmICFib3VuY2VEaXN0YW5jZSkge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdG1vdmVSZXF1aXJlZCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdFx0Ly8gUGVyZm9ybSB0aGUgZmxpbmdcclxuXHRcdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oYXhpcywgZmxpbmdQb3NpdGlvbiwgZmxpbmdEdXJhdGlvbiwgZmxpbmdCZXppZXIsIGJvdW5kc0Nyb3NzRGVsYXkpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFNjaGVkdWxlIGEgYm91bmNlIGlmIGFwcHJvcHJpYXRlXHJcblx0XHRcdFx0XHRpZiAoYm91bmNlRGlzdGFuY2UgJiYgYm91bmNlRHVyYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0X3NjaGVkdWxlQXhpc1Bvc2l0aW9uKGF4aXMsIGJvdW5jZVRhcmdldCwgYm91bmNlRHVyYXRpb24sIF9pbnN0YW5jZU9wdGlvbnMuYm91bmNlQmV6aWVyLCBib3VuY2VEZWxheSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0bWF4QW5pbWF0aW9uVGltZSA9IE1hdGgubWF4KG1heEFuaW1hdGlvblRpbWUsIGJvdW5jZURpc3RhbmNlID8gKGJvdW5jZURlbGF5ICsgYm91bmNlRHVyYXRpb24pIDogZmxpbmdEdXJhdGlvbik7XHJcblx0XHRcdFx0XHRzY3JvbGxQb3NpdGlvbnNUb0FwcGx5W2F4aXNdID0gKGJvdW5jZVRhcmdldCA9PT0gZmFsc2UpID8gZmxpbmdQb3NpdGlvbiA6IGJvdW5jZVRhcmdldDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChtb3ZlUmVxdWlyZWQgJiYgbWF4QW5pbWF0aW9uVGltZSkge1xyXG5cdFx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0dmFyIGFuQXhpcztcclxuXHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIHN0b3JlZCBzY3JvbGwgcG9zaXRpb24gcmVhZHkgZm9yIGZpbmFsaXNpbmdcclxuXHRcdFx0XHRcdGZvciAoYW5BeGlzIGluIHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkpIHtcclxuXHRcdFx0XHRcdFx0aWYgKHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkuaGFzT3duUHJvcGVydHkoYW5BeGlzKSkge1xyXG5cdFx0XHRcdFx0XHRcdF9sYXN0U2Nyb2xsUG9zaXRpb25bYW5BeGlzXSA9IHNjcm9sbFBvc2l0aW9uc1RvQXBwbHlbYW5BeGlzXTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCgpO1xyXG5cdFx0XHRcdH0sIG1heEFuaW1hdGlvblRpbWUpKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG1vdmVSZXF1aXJlZDtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBCb3VuY2UgYmFjayBpbnRvIGJvdW5kcyBpZiBuZWNlc3NhcnksIG9yIHNuYXAgdG8gYSBncmlkIGxvY2F0aW9uLlxyXG5cdFx0ICovXHJcblx0XHRfc25hcFNjcm9sbCA9IGZ1bmN0aW9uIF9zbmFwU2Nyb2xsKHNjcm9sbENhbmNlbGxlZCkge1xyXG5cdFx0XHR2YXIgYXhpcztcclxuXHRcdFx0dmFyIHNuYXBEdXJhdGlvbiA9IHNjcm9sbENhbmNlbGxlZCA/IDEwMCA6IDM1MDtcclxuXHRcdFx0dmFyIHRhcmdldFBvc2l0aW9uID0gX2xhc3RTY3JvbGxQb3NpdGlvbjtcclxuXHJcblx0XHRcdC8vIEdldCB0aGUgY3VycmVudCBwb3NpdGlvbiBhbmQgc2VlIGlmIGEgc25hcCBpcyByZXF1aXJlZFxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xyXG5cclxuXHRcdFx0XHQvLyBTdG9yZSBjdXJyZW50IHNuYXAgaW5kZXhcclxuXHRcdFx0XHRfc25hcEluZGV4ID0gX2dldFNuYXBJbmRleEZvclBvc2l0aW9uKHRhcmdldFBvc2l0aW9uKTtcclxuXHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzKF9zbmFwSW5kZXgsIHRhcmdldFBvc2l0aW9uKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0YXJnZXRQb3NpdGlvbiA9IF9saW1pdFRvQm91bmRzKHRhcmdldFBvc2l0aW9uKTtcclxuXHJcblx0XHRcdHZhciBzbmFwUmVxdWlyZWQgPSBmYWxzZTtcclxuXHRcdFx0Zm9yIChheGlzIGluIF9iYXNlU2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX2Jhc2VTY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0aWYgKHRhcmdldFBvc2l0aW9uW2F4aXNdICE9PSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdHNuYXBSZXF1aXJlZCA9IHRydWU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICghc25hcFJlcXVpcmVkKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQZXJmb3JtIHRoZSBzbmFwXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfYmFzZVNjcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9iYXNlU2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdF9zZXRBeGlzUG9zaXRpb24oYXhpcywgdGFyZ2V0UG9zaXRpb25bYXhpc10sIHNuYXBEdXJhdGlvbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuXHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBzdG9yZWQgc2Nyb2xsIHBvc2l0aW9uIHJlYWR5IGZvciBmaW5hbGl6aW5nXHJcblx0XHRcdFx0X2xhc3RTY3JvbGxQb3NpdGlvbiA9IHRhcmdldFBvc2l0aW9uO1xyXG5cclxuXHRcdFx0XHRfZmluYWxpemVTY3JvbGwoc2Nyb2xsQ2FuY2VsbGVkKTtcclxuXHRcdFx0fSwgc25hcER1cmF0aW9uKSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBHZXQgYW4gYXBwcm9wcmlhdGUgc25hcCBpbmRleCBmb3IgYSBzdXBwbGllZCBwb2ludC5cclxuXHRcdCAqL1xyXG5cdFx0X2dldFNuYXBJbmRleEZvclBvc2l0aW9uID0gZnVuY3Rpb24gX2dldFNuYXBJbmRleEZvclBvc2l0aW9uKGNvb3JkaW5hdGVzKSB7XHJcblx0XHRcdHZhciBheGlzO1xyXG5cdFx0XHR2YXIgaW5kZXhlcyA9IHt4OiAwLCB5OiAwfTtcclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykgJiYgX3NuYXBHcmlkU2l6ZVtheGlzXSkge1xyXG5cdFx0XHRcdFx0aW5kZXhlc1theGlzXSA9IE1hdGgucm91bmQoY29vcmRpbmF0ZXNbYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGluZGV4ZXM7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogR2V0IGFuIGFwcHJvcHJpYXRlIHNuYXAgcG9pbnQgZm9yIGEgc3VwcGxpZWQgaW5kZXguXHJcblx0XHQgKi9cclxuXHRcdF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzID0gZnVuY3Rpb24gX2dldFNuYXBQb3NpdGlvbkZvckluZGV4ZXMoaW5kZXhlcywgY3VycmVudENvb3JkaW5hdGVzKSB7XHJcblx0XHRcdHZhciBheGlzO1xyXG5cdFx0XHR2YXIgY29vcmRpbmF0ZXNUb1JldHVybiA9IHtcclxuXHRcdFx0XHR4OiBjdXJyZW50Q29vcmRpbmF0ZXMueCxcclxuXHRcdFx0XHR5OiBjdXJyZW50Q29vcmRpbmF0ZXMueVxyXG5cdFx0XHR9O1xyXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XHJcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cdFx0XHRcdFx0Y29vcmRpbmF0ZXNUb1JldHVybltheGlzXSA9IGluZGV4ZXNbYXhpc10gKiBfc25hcEdyaWRTaXplW2F4aXNdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gY29vcmRpbmF0ZXNUb1JldHVybjtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBMaW1pdCBjb29yZGluYXRlcyB3aXRoaW4gdGhlIGJvdW5kcyBvZiB0aGUgc2Nyb2xsYWJsZSB2aWV3cG9ydC5cclxuXHRcdCAqL1xyXG5cdFx0X2xpbWl0VG9Cb3VuZHMgPSBmdW5jdGlvbiBfbGltaXRUb0JvdW5kcyhjb29yZGluYXRlcykge1xyXG5cdFx0XHR2YXIgYXhpcztcclxuXHRcdFx0dmFyIGNvb3JkaW5hdGVzVG9SZXR1cm4gPSB7IHg6IGNvb3JkaW5hdGVzLngsIHk6IGNvb3JkaW5hdGVzLnkgfTtcclxuXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGNvb3JkaW5hdGUgaXMgYmV5b25kIHRoZSBlZGdlcyBvZiB0aGUgc2Nyb2xsZXIsIHVzZSB0aGUgY2xvc2VzdCBlZGdlXHJcblx0XHRcdFx0XHRpZiAoY29vcmRpbmF0ZXNbYXhpc10gPiAwKSB7XHJcblx0XHRcdFx0XHRcdGNvb3JkaW5hdGVzVG9SZXR1cm5bYXhpc10gPSAwO1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChjb29yZGluYXRlc1theGlzXSA8IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRjb29yZGluYXRlc1RvUmV0dXJuW2F4aXNdID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdO1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBjb29yZGluYXRlc1RvUmV0dXJuO1xyXG5cdFx0fTtcclxuXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBTZXRzIHVwIHRoZSBET00gYXJvdW5kIHRoZSBub2RlIHRvIGJlIHNjcm9sbGVkLlxyXG5cdFx0ICovXHJcblx0XHRfaW5pdGlhbGl6ZURPTSA9IGZ1bmN0aW9uIF9pbml0aWFsaXplRE9NKCkge1xyXG5cdFx0XHR2YXIgb2Zmc2NyZWVuRnJhZ21lbnQsIG9mZnNjcmVlbk5vZGUsIHNjcm9sbFlQYXJlbnQ7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB3aGV0aGVyIHRoZSBET00gaXMgYWxyZWFkeSBwcmVzZW50IGFuZCB2YWxpZCAtIGlmIHNvLCBubyBmdXJ0aGVyIGFjdGlvbiByZXF1aXJlZC5cclxuXHRcdFx0aWYgKF9leGlzdGluZ0RPTVZhbGlkKCkpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE90aGVyd2lzZSwgdGhlIERPTSBuZWVkcyB0byBiZSBjcmVhdGVkIGluc2lkZSB0aGUgb3JpZ2luYWxseSBzdXBwbGllZCBub2RlLiAgVGhlIG5vZGVcclxuXHRcdFx0Ly8gaGFzIGEgY29udGFpbmVyIGluc2VydGVkIGluc2lkZSBpdCAtIHdoaWNoIGFjdHMgYXMgYW4gYW5jaG9yIGVsZW1lbnQgd2l0aCBjb25zdHJhaW50cyAtXHJcblx0XHRcdC8vIGFuZCB0aGVuIHRoZSBzY3JvbGxhYmxlIGxheWVycyBhcyBhcHByb3ByaWF0ZS5cclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIG5ldyBkb2N1bWVudCBmcmFnbWVudCB0byB0ZW1wb3JhcmlseSBob2xkIHRoZSBzY3JvbGxhYmxlIGNvbnRlbnRcclxuXHRcdFx0b2Zmc2NyZWVuRnJhZ21lbnQgPSBfc2Nyb2xsYWJsZU1hc3Rlck5vZGUub3duZXJEb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XHJcblx0XHRcdG9mZnNjcmVlbk5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdESVYnKTtcclxuXHRcdFx0b2Zmc2NyZWVuRnJhZ21lbnQuYXBwZW5kQ2hpbGQob2Zmc2NyZWVuTm9kZSk7XHJcblxyXG5cdFx0XHQvLyBEcm9wIGluIHRoZSB3cmFwcGluZyBIVE1MXHJcblx0XHRcdG9mZnNjcmVlbk5vZGUuaW5uZXJIVE1MID0gRlRTY3JvbGxlci5wcm90b3R5cGUuZ2V0UHJlcGVuZGVkSFRNTCghX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYLCAhX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZLCBfaW5zdGFuY2VPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3MpICsgRlRTY3JvbGxlci5wcm90b3R5cGUuZ2V0QXBwZW5kZWRIVE1MKCFfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1gsICFfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1ksIF9pbnN0YW5jZU9wdGlvbnMuaHdBY2NlbGVyYXRpb25DbGFzcywgX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSByZWZlcmVuY2VzIGFzIGFwcHJvcHJpYXRlXHJcblx0XHRcdF9jb250YWluZXJOb2RlID0gb2Zmc2NyZWVuTm9kZS5maXJzdEVsZW1lbnRDaGlsZDtcclxuXHRcdFx0c2Nyb2xsWVBhcmVudCA9IF9jb250YWluZXJOb2RlO1xyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XHJcblx0XHRcdFx0X3Njcm9sbE5vZGVzLnggPSBfY29udGFpbmVyTm9kZS5maXJzdEVsZW1lbnRDaGlsZDtcclxuXHRcdFx0XHRzY3JvbGxZUGFyZW50ID0gX3Njcm9sbE5vZGVzLng7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnggPSBfY29udGFpbmVyTm9kZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdmdHNjcm9sbGVyX3Njcm9sbGJhcngnKVswXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSkge1xyXG5cdFx0XHRcdF9zY3JvbGxOb2Rlcy55ID0gc2Nyb2xsWVBhcmVudC5maXJzdEVsZW1lbnRDaGlsZDtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XHJcblx0XHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXMueSA9IF9jb250YWluZXJOb2RlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2Z0c2Nyb2xsZXJfc2Nyb2xsYmFyeScpWzBdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUgPSBfc2Nyb2xsTm9kZXMueTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUgPSBfc2Nyb2xsTm9kZXMueDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVGFrZSB0aGUgY29udGVudHMgb2YgdGhlIHNjcm9sbGFibGUgZWxlbWVudCwgYW5kIGNvcHkgdGhlbSBpbnRvIHRoZSBuZXcgY29udGFpbmVyXHJcblx0XHRcdHdoaWxlIChfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuZmlyc3RDaGlsZCkge1xyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5hcHBlbmRDaGlsZChfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuZmlyc3RDaGlsZCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE1vdmUgdGhlIHdyYXBwZWQgZWxlbWVudHMgYmFjayBpbnRvIHRoZSBkb2N1bWVudFxyXG5cdFx0XHRfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuYXBwZW5kQ2hpbGQoX2NvbnRhaW5lck5vZGUpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEF0dGVtcHRzIHRvIHVzZSBhbnkgZXhpc3RpbmcgRE9NIHNjcm9sbGVyIG5vZGVzIGlmIHBvc3NpYmxlLCByZXR1cm5pbmcgdHJ1ZSBpZiBzbztcclxuXHRcdCAqIHVwZGF0ZXMgYWxsIGludGVybmFsIGVsZW1lbnQgcmVmZXJlbmNlcy5cclxuXHRcdCAqL1xyXG5cdFx0X2V4aXN0aW5nRE9NVmFsaWQgPSBmdW5jdGlvbiBfZXhpc3RpbmdET01WYWxpZCgpIHtcclxuXHRcdFx0dmFyIHNjcm9sbGVyQ29udGFpbmVyLCBsYXllclgsIGxheWVyWSwgeVBhcmVudCwgc2Nyb2xsZXJYLCBzY3JvbGxlclksIGNhbmRpZGF0ZXMsIGksIGw7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZXJlJ3MgYW4gaW5pdGlhbCBjaGlsZCBub2RlLCBhbmQgbWFrZSBzdXJlIGl0J3MgdGhlIGNvbnRhaW5lciBjbGFzc1xyXG5cdFx0XHRzY3JvbGxlckNvbnRhaW5lciA9IF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5maXJzdEVsZW1lbnRDaGlsZDtcclxuXHRcdFx0aWYgKCFzY3JvbGxlckNvbnRhaW5lciB8fCBzY3JvbGxlckNvbnRhaW5lci5jbGFzc05hbWUuaW5kZXhPZignZnRzY3JvbGxlcl9jb250YWluZXInKSA9PT0gLTEpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHgtYXhpcyBzY3JvbGxpbmcgaXMgZW5hYmxlZCwgZmluZCBhbmQgdmVyaWZ5IHRoZSB4IHNjcm9sbGVyIGxheWVyXHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1gpIHtcclxuXHJcblx0XHRcdFx0Ly8gRmluZCBhbmQgdmVyaWZ5IHRoZSB4IHNjcm9sbGVyIGxheWVyXHJcblx0XHRcdFx0bGF5ZXJYID0gc2Nyb2xsZXJDb250YWluZXIuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcblx0XHRcdFx0aWYgKCFsYXllclggfHwgbGF5ZXJYLmNsYXNzTmFtZS5pbmRleE9mKCdmdHNjcm9sbGVyX3gnKSA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0eVBhcmVudCA9IGxheWVyWDtcclxuXHJcblx0XHRcdFx0Ly8gRmluZCBhbmQgdmVyaWZ5IHRoZSB4IHNjcm9sbGJhciBpZiBlbmFibGVkXHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdFx0Y2FuZGlkYXRlcyA9IHNjcm9sbGVyQ29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2Z0c2Nyb2xsZXJfc2Nyb2xsYmFyeCcpO1xyXG5cdFx0XHRcdFx0aWYgKGNhbmRpZGF0ZXMpIHtcclxuXHRcdFx0XHRcdFx0Zm9yIChpID0gMCwgbCA9IGNhbmRpZGF0ZXMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGNhbmRpZGF0ZXNbaV0ucGFyZW50Tm9kZSA9PT0gc2Nyb2xsZXJDb250YWluZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNjcm9sbGVyWCA9IGNhbmRpZGF0ZXNbaV07XHJcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmICghc2Nyb2xsZXJYKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0eVBhcmVudCA9IHNjcm9sbGVyQ29udGFpbmVyO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB5LWF4aXMgc2Nyb2xsaW5nIGlzIGVuYWJsZWQsIGZpbmQgYW5kIHZlcmlmeSB0aGUgeSBzY3JvbGxlciBsYXllclxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XHJcblxyXG5cdFx0XHRcdC8vIEZpbmQgYW5kIHZlcmlmeSB0aGUgeCBzY3JvbGxlciBsYXllclxyXG5cdFx0XHRcdGxheWVyWSA9IHlQYXJlbnQuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcblx0XHRcdFx0aWYgKCFsYXllclkgfHwgbGF5ZXJZLmNsYXNzTmFtZS5pbmRleE9mKCdmdHNjcm9sbGVyX3knKSA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEZpbmQgYW5kIHZlcmlmeSB0aGUgeSBzY3JvbGxiYXIgaWYgZW5hYmxlZFxyXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRcdGNhbmRpZGF0ZXMgPSBzY3JvbGxlckNvbnRhaW5lci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdmdHNjcm9sbGVyX3Njcm9sbGJhcnknKTtcclxuXHRcdFx0XHRcdGlmIChjYW5kaWRhdGVzKSB7XHJcblx0XHRcdFx0XHRcdGZvciAoaSA9IDAsIGwgPSBjYW5kaWRhdGVzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChjYW5kaWRhdGVzW2ldLnBhcmVudE5vZGUgPT09IHNjcm9sbGVyQ29udGFpbmVyKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzY3JvbGxlclkgPSBjYW5kaWRhdGVzW2ldO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRpZiAoIXNjcm9sbGVyWSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBFbGVtZW50cyBmb3VuZCBhbmQgdmVyaWZpZWQgLSB1cGRhdGUgdGhlIHJlZmVyZW5jZXMgYW5kIHJldHVybiBzdWNjZXNzXHJcblx0XHRcdF9jb250YWluZXJOb2RlID0gc2Nyb2xsZXJDb250YWluZXI7XHJcblx0XHRcdGlmIChsYXllclgpIHtcclxuXHRcdFx0XHRfc2Nyb2xsTm9kZXMueCA9IGxheWVyWDtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAobGF5ZXJZKSB7XHJcblx0XHRcdFx0X3Njcm9sbE5vZGVzLnkgPSBsYXllclk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHNjcm9sbGVyWCkge1xyXG5cdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy54ID0gc2Nyb2xsZXJYO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChzY3JvbGxlclkpIHtcclxuXHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXMueSA9IHNjcm9sbGVyWTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlID0gbGF5ZXJZO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IGxheWVyWDtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0X2RvbUNoYW5nZWQgPSBmdW5jdGlvbiBfZG9tQ2hhbmdlZChlKSB7XHJcblxyXG5cdFx0XHQvLyBJZiB0aGUgdGltZXIgaXMgYWN0aXZlLCBjbGVhciBpdFxyXG5cdFx0XHRpZiAoX2RvbUNoYW5nZURlYm91bmNlcikge1xyXG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX2RvbUNoYW5nZURlYm91bmNlcik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJlYWN0IHRvIHJlc2l6ZXMgYXQgb25jZVxyXG5cdFx0XHRpZiAoZSAmJiBlLnR5cGUgPT09ICdyZXNpemUnKSB7XHJcblx0XHRcdFx0X3VwZGF0ZURpbWVuc2lvbnMoKTtcclxuXHJcblx0XHRcdC8vIEZvciBvdGhlciBjaGFuZ2VzLCB3aGljaCBtYXkgb2NjdXIgaW4gZ3JvdXBzLCBzZXQgdXAgdGhlIERPTSBjaGFuZ2VkIHRpbWVyXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0X2RvbUNoYW5nZURlYm91bmNlciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0X3VwZGF0ZURpbWVuc2lvbnMoKTtcclxuXHRcdFx0XHR9LCAxMDApO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdF91cGRhdGVEaW1lbnNpb25zID0gZnVuY3Rpb24gX3VwZGF0ZURpbWVuc2lvbnMoaWdub3JlU25hcFNjcm9sbCkge1xyXG5cdFx0XHR2YXIgYXhpcztcclxuXHJcblx0XHRcdC8vIE9ubHkgdXBkYXRlIGRpbWVuc2lvbnMgaWYgdGhlIGNvbnRhaW5lciBub2RlIGV4aXN0cyAoRE9NIGVsZW1lbnRzIGNhbiBnbyBhd2F5IGlmXHJcblx0XHRcdC8vIHRoZSBzY3JvbGxlciBpbnN0YW5jZSBpcyBub3QgZGVzdHJveWVkIGNvcnJlY3RseSlcclxuXHRcdFx0aWYgKCFfY29udGFpbmVyTm9kZSB8fCAhX2NvbnRlbnRQYXJlbnROb2RlKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoX2RvbUNoYW5nZURlYm91bmNlcikge1xyXG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX2RvbUNoYW5nZURlYm91bmNlcik7XHJcblx0XHRcdFx0X2RvbUNoYW5nZURlYm91bmNlciA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHZhciBjb250YWluZXJXaWR0aCwgY29udGFpbmVySGVpZ2h0LCBzdGFydEFsaWdubWVudHM7XHJcblxyXG5cdFx0XHQvLyBJZiBhIG1hbnVhbCBzY3JvbGwgaXMgaW4gcHJvZ3Jlc3MsIGNhbmNlbCBpdFxyXG5cdFx0XHRfZW5kU2Nyb2xsKERhdGUubm93KCkpO1xyXG5cclxuXHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSBzdGFydGluZyBhbGlnbm1lbnQgZm9yIGNvbXBhcmlzb24gbGF0ZXJcclxuXHRcdFx0c3RhcnRBbGlnbm1lbnRzID0geyB4OiBmYWxzZSwgeTogZmFsc2UgfTtcclxuXHRcdFx0Zm9yIChheGlzIGluIHN0YXJ0QWxpZ25tZW50cykge1xyXG5cdFx0XHRcdGlmIChzdGFydEFsaWdubWVudHMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdGlmIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0QWxpZ25tZW50c1theGlzXSA9IC0xO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIDw9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xyXG5cdFx0XHRcdFx0XHRzdGFydEFsaWdubWVudHNbYXhpc10gPSAxO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICogMiA8PSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10gKyA1ICYmIF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKiAyID49IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSAtIDUpIHtcclxuXHRcdFx0XHRcdFx0c3RhcnRBbGlnbm1lbnRzW2F4aXNdID0gMDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnRhaW5lcldpZHRoID0gX2NvbnRhaW5lck5vZGUub2Zmc2V0V2lkdGg7XHJcblx0XHRcdGNvbnRhaW5lckhlaWdodCA9IF9jb250YWluZXJOb2RlLm9mZnNldEhlaWdodDtcclxuXHJcblx0XHRcdC8vIEdyYWIgdGhlIGRpbWVuc2lvbnNcclxuXHRcdFx0dmFyIHJhd1Njcm9sbFdpZHRoID0gb3B0aW9ucy5jb250ZW50V2lkdGggfHwgX2NvbnRlbnRQYXJlbnROb2RlLm9mZnNldFdpZHRoO1xyXG5cdFx0XHR2YXIgcmF3U2Nyb2xsSGVpZ2h0ID0gb3B0aW9ucy5jb250ZW50SGVpZ2h0IHx8IF9jb250ZW50UGFyZW50Tm9kZS5vZmZzZXRIZWlnaHQ7XHJcblx0XHRcdHZhciBzY3JvbGxXaWR0aCA9IHJhd1Njcm9sbFdpZHRoO1xyXG5cdFx0XHR2YXIgc2Nyb2xsSGVpZ2h0ID0gcmF3U2Nyb2xsSGVpZ2h0O1xyXG5cdFx0XHR2YXIgdGFyZ2V0UG9zaXRpb24gPSB7IHg6IGZhbHNlLCB5OiBmYWxzZSB9O1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHNuYXAgZ3JpZFxyXG5cdFx0XHRpZiAoIV9zbmFwR3JpZFNpemUudXNlclgpIHtcclxuXHRcdFx0XHRfc25hcEdyaWRTaXplLnggPSBjb250YWluZXJXaWR0aDtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIV9zbmFwR3JpZFNpemUudXNlclkpIHtcclxuXHRcdFx0XHRfc25hcEdyaWRTaXplLnkgPSBjb250YWluZXJIZWlnaHQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHRoZXJlIGlzIGEgZ3JpZCwgY29uZm9ybSB0byB0aGUgZ3JpZFxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xyXG5cdFx0XHRcdGlmIChfc25hcEdyaWRTaXplLnVzZXJYKSB7XHJcblx0XHRcdFx0XHRzY3JvbGxXaWR0aCA9IE1hdGguY2VpbChzY3JvbGxXaWR0aCAvIF9zbmFwR3JpZFNpemUudXNlclgpICogX3NuYXBHcmlkU2l6ZS51c2VyWDtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c2Nyb2xsV2lkdGggPSBNYXRoLmNlaWwoc2Nyb2xsV2lkdGggLyBfc25hcEdyaWRTaXplLngpICogX3NuYXBHcmlkU2l6ZS54O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoX3NuYXBHcmlkU2l6ZS51c2VyWSkge1xyXG5cdFx0XHRcdFx0c2Nyb2xsSGVpZ2h0ID0gTWF0aC5jZWlsKHNjcm9sbEhlaWdodCAvIF9zbmFwR3JpZFNpemUudXNlclkpICogX3NuYXBHcmlkU2l6ZS51c2VyWTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c2Nyb2xsSGVpZ2h0ID0gTWF0aC5jZWlsKHNjcm9sbEhlaWdodCAvIF9zbmFwR3JpZFNpemUueSkgKiBfc25hcEdyaWRTaXplLnk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiBubyBkZXRhaWxzIGhhdmUgY2hhbmdlZCwgcmV0dXJuLlxyXG5cdFx0XHRpZiAoX21ldHJpY3MuY29udGFpbmVyLnggPT09IGNvbnRhaW5lcldpZHRoICYmIF9tZXRyaWNzLmNvbnRhaW5lci55ID09PSBjb250YWluZXJIZWlnaHQgJiYgX21ldHJpY3MuY29udGVudC54ID09PSBzY3JvbGxXaWR0aCAmJiBfbWV0cmljcy5jb250ZW50LnkgPT09IHNjcm9sbEhlaWdodCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBzaXplc1xyXG5cdFx0XHRfbWV0cmljcy5jb250YWluZXIueCA9IGNvbnRhaW5lcldpZHRoO1xyXG5cdFx0XHRfbWV0cmljcy5jb250YWluZXIueSA9IGNvbnRhaW5lckhlaWdodDtcclxuXHRcdFx0X21ldHJpY3MuY29udGVudC54ID0gc2Nyb2xsV2lkdGg7XHJcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQucmF3WCA9IHJhd1Njcm9sbFdpZHRoO1xyXG5cdFx0XHRfbWV0cmljcy5jb250ZW50LnkgPSBzY3JvbGxIZWlnaHQ7XHJcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQucmF3WSA9IHJhd1Njcm9sbEhlaWdodDtcclxuXHRcdFx0X21ldHJpY3Muc2Nyb2xsRW5kLnggPSBjb250YWluZXJXaWR0aCAtIHNjcm9sbFdpZHRoO1xyXG5cdFx0XHRfbWV0cmljcy5zY3JvbGxFbmQueSA9IGNvbnRhaW5lckhlaWdodCAtIHNjcm9sbEhlaWdodDtcclxuXHJcblx0XHRcdF91cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zKCk7XHJcblxyXG5cdFx0XHRpZiAoIWlnbm9yZVNuYXBTY3JvbGwgJiYgX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xyXG5cclxuXHRcdCAgICAgICAgLy8gRW5zdXJlIGJvdW5kcyBhcmUgY29ycmVjdFxyXG5cdFx0XHRcdF91cGRhdGVTZWdtZW50cygpO1xyXG5cdFx0XHRcdHRhcmdldFBvc2l0aW9uID0gX2dldFNuYXBQb3NpdGlvbkZvckluZGV4ZXMoX3NuYXBJbmRleCwgX2xhc3RTY3JvbGxQb3NpdGlvbik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFwcGx5IGJhc2UgYWxpZ25tZW50IGlmIGFwcHJvcHJpYXRlXHJcblx0XHRcdGZvciAoYXhpcyBpbiB0YXJnZXRQb3NpdGlvbikge1xyXG5cdFx0XHRcdGlmICh0YXJnZXRQb3NpdGlvbi5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIHRoZSBjb250YWluZXIgaXMgc21hbGxlciB0aGFuIHRoZSBjb250ZW50LCBkZXRlcm1pbmUgd2hldGhlciB0byBhcHBseSB0aGVcclxuXHRcdFx0XHRcdC8vIGFsaWdubWVudC4gIFRoaXMgb2NjdXJzIGlmIGEgc2Nyb2xsIGhhcyBuZXZlciB0YWtlbiBwbGFjZSwgb3IgaWYgdGhlIHBvc2l0aW9uXHJcblx0XHRcdFx0XHQvLyB3YXMgcHJldmlvdXNseSBhdCB0aGUgY29ycmVjdCBcImVuZFwiIGFuZCBjYW4gYmUgbWFpbnRhaW5lZC5cclxuXHRcdFx0XHRcdGlmIChfbWV0cmljcy5jb250YWluZXJbYXhpc10gPCBfbWV0cmljcy5jb250ZW50W2F4aXNdKSB7XHJcblx0XHRcdFx0XHRcdGlmIChfaGFzQmVlblNjcm9sbGVkICYmIF9pbnN0YW5jZU9wdGlvbnMuYmFzZUFsaWdubWVudHNbYXhpc10gIT09IHN0YXJ0QWxpZ25tZW50c1theGlzXSkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gQXBwbHkgdGhlIGFsaWdubWVudFxyXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuYmFzZUFsaWdubWVudHNbYXhpc10gPT09IDEpIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb25bYXhpc10gPSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc107XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9pbnN0YW5jZU9wdGlvbnMuYmFzZUFsaWdubWVudHNbYXhpc10gPT09IDApIHtcclxuXHRcdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb25bYXhpc10gPSBNYXRoLmZsb29yKF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSAvIDIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfaW5zdGFuY2VPcHRpb25zLmJhc2VBbGlnbm1lbnRzW2F4aXNdID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXRQb3NpdGlvbltheGlzXSA9IDA7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1ggJiYgdGFyZ2V0UG9zaXRpb24ueCAhPT0gZmFsc2UpIHtcclxuXHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKCd4JywgdGFyZ2V0UG9zaXRpb24ueCwgMCk7XHJcblx0XHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbi54ID0gdGFyZ2V0UG9zaXRpb24ueDtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZICYmIHRhcmdldFBvc2l0aW9uLnkgIT09IGZhbHNlKSB7XHJcblx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbigneScsIHRhcmdldFBvc2l0aW9uLnksIDApO1xyXG5cdFx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb24ueSA9IHRhcmdldFBvc2l0aW9uLnk7XHJcblx0XHRcdH1cclxuXHJcblx0XHR9O1xyXG5cclxuXHRcdF91cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zID0gZnVuY3Rpb24gX3VwZGF0ZVNjcm9sbGJhckRpbWVuc2lvbnMoKSB7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgc2Nyb2xsYmFyIHNpemVzXHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XHJcblx0XHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXMueC5zdHlsZS53aWR0aCA9IE1hdGgubWF4KDYsIE1hdGgucm91bmQoX21ldHJpY3MuY29udGFpbmVyLnggKiAoX21ldHJpY3MuY29udGFpbmVyLnggLyBfbWV0cmljcy5jb250ZW50LngpIC0gNCkpICsgJ3B4JztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSkge1xyXG5cdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnkuc3R5bGUuaGVpZ2h0ID0gTWF0aC5tYXgoNiwgTWF0aC5yb3VuZChfbWV0cmljcy5jb250YWluZXIueSAqIChfbWV0cmljcy5jb250YWluZXIueSAvIF9tZXRyaWNzLmNvbnRlbnQueSkgLSA0KSkgKyAncHgnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHNjcm9sbCBjYWNoZXNcclxuXHRcdFx0X3Njcm9sbGFibGVBeGVzID0ge307XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1ggJiYgKF9tZXRyaWNzLmNvbnRlbnQueCA+IF9tZXRyaWNzLmNvbnRhaW5lci54IHx8IF9pbnN0YW5jZU9wdGlvbnMuYWx3YXlzU2Nyb2xsKSkge1xyXG5cdFx0XHRcdF9zY3JvbGxhYmxlQXhlcy54ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZICYmIChfbWV0cmljcy5jb250ZW50LnkgPiBfbWV0cmljcy5jb250YWluZXIueSB8fCBfaW5zdGFuY2VPcHRpb25zLmFsd2F5c1Njcm9sbCkpIHtcclxuXHRcdFx0XHRfc2Nyb2xsYWJsZUF4ZXMueSA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0X3VwZGF0ZUVsZW1lbnRQb3NpdGlvbiA9IGZ1bmN0aW9uIF91cGRhdGVFbGVtZW50UG9zaXRpb24oKSB7XHJcblx0XHRcdHZhciBheGlzLCBjb21wdXRlZFN0eWxlLCBzcGxpdFN0eWxlO1xyXG5cclxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGN1cnJlbnQgcG9zaXRpb24gb2YgZWFjaCBhY3RpdmUgYXhpcy5cclxuXHRcdFx0Ly8gQ3VzdG9tIHBhcnNpbmcgaXMgdXNlZCBpbnN0ZWFkIG9mIG5hdGl2ZSBtYXRyaXggc3VwcG9ydCBmb3Igc3BlZWQgYW5kIGZvclxyXG5cdFx0XHQvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdGNvbXB1dGVkU3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShfc2Nyb2xsTm9kZXNbYXhpc10sIG51bGwpW192ZW5kb3JUcmFuc2Zvcm1Mb29rdXBdO1xyXG5cdFx0XHRcdFx0c3BsaXRTdHlsZSA9IGNvbXB1dGVkU3R5bGUuc3BsaXQoJywgJyk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRm9yIDJkLXN0eWxlIHRyYW5zZm9ybXMsIHB1bGwgb3V0IGVsZW1lbnRzIGZvdXIgb3IgZml2ZVxyXG5cdFx0XHRcdFx0aWYgKHNwbGl0U3R5bGUubGVuZ3RoID09PSA2KSB7XHJcblx0XHRcdFx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb25bYXhpc10gPSBwYXJzZUludChzcGxpdFN0eWxlWyhheGlzID09PSAneScpID8gNSA6IDRdLCAxMCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRm9yIDNkLXN0eWxlIHRyYW5zZm9ybXMsIHB1bGwgb3V0IGVsZW1lbnRzIHR3ZWx2ZSBvciB0aGlydGVlblxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXSA9IHBhcnNlSW50KHNwbGl0U3R5bGVbKGF4aXMgPT09ICd5JykgPyAxMyA6IDEyXSwgMTApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0X2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA9IF9iYXNlU2Nyb2xsUG9zaXRpb25bYXhpc107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdF91cGRhdGVTZWdtZW50cyA9IGZ1bmN0aW9uIF91cGRhdGVTZWdtZW50cyhzY3JvbGxGaW5hbGlzZWQpIHtcclxuXHRcdFx0dmFyIGF4aXM7XHJcblx0XHRcdHZhciBuZXdTZWdtZW50ID0geyB4OiAwLCB5OiAwIH07XHJcblxyXG5cdFx0XHQvLyBJZiBzbmFwcGluZyBpcyBkaXNhYmxlZCwgcmV0dXJuIHdpdGhvdXQgYW55IGZ1cnRoZXIgYWN0aW9uIHJlcXVpcmVkXHJcblx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSBuZXcgc2VnbWVudHNcclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdG5ld1NlZ21lbnRbYXhpc10gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudFtheGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc10pIC0gMSwgTWF0aC5yb3VuZCgtX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc10pKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJbiBhbGwgY2FzZXMgdXBkYXRlIHRoZSBhY3RpdmUgc2VnbWVudCBpZiBhcHByb3ByaWF0ZVxyXG5cdFx0XHRpZiAobmV3U2VnbWVudC54ICE9PSBfYWN0aXZlU2VnbWVudC54IHx8IG5ld1NlZ21lbnQueSAhPT0gX2FjdGl2ZVNlZ21lbnQueSkge1xyXG5cdFx0XHRcdF9hY3RpdmVTZWdtZW50LnggPSBuZXdTZWdtZW50Lng7XHJcblx0XHRcdFx0X2FjdGl2ZVNlZ21lbnQueSA9IG5ld1NlZ21lbnQueTtcclxuXHRcdFx0XHRfZmlyZUV2ZW50KCdzZWdtZW50d2lsbGNoYW5nZScsIHsgc2VnbWVudFg6IG5ld1NlZ21lbnQueCwgc2VnbWVudFk6IG5ld1NlZ21lbnQueSB9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIHNjcm9sbCBoYXMgYmVlbiBmaW5hbGlzZWQsIGFsc28gdXBkYXRlIHRoZSBiYXNlIHNlZ21lbnRcclxuXHRcdFx0aWYgKHNjcm9sbEZpbmFsaXNlZCkge1xyXG5cdFx0XHRcdGlmIChuZXdTZWdtZW50LnggIT09IF9iYXNlU2VnbWVudC54IHx8IG5ld1NlZ21lbnQueSAhPT0gX2Jhc2VTZWdtZW50LnkpIHtcclxuXHRcdFx0XHRcdF9iYXNlU2VnbWVudC54ID0gbmV3U2VnbWVudC54O1xyXG5cdFx0XHRcdFx0X2Jhc2VTZWdtZW50LnkgPSBuZXdTZWdtZW50Lnk7XHJcblx0XHRcdFx0XHRfZmlyZUV2ZW50KCdzZWdtZW50ZGlkY2hhbmdlJywgeyBzZWdtZW50WDogbmV3U2VnbWVudC54LCBzZWdtZW50WTogbmV3U2VnbWVudC55IH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHRfc2V0QXhpc1Bvc2l0aW9uID0gZnVuY3Rpb24gX3NldEF4aXNQb3NpdGlvbihheGlzLCBwb3NpdGlvbiwgYW5pbWF0aW9uRHVyYXRpb24sIGFuaW1hdGlvbkJlemllciwgYm91bmRzQ3Jvc3NEZWxheSkge1xyXG5cdFx0XHR2YXIgdHJhbnNpdGlvbkNTU1N0cmluZywgbmV3UG9zaXRpb25BdEV4dHJlbWl0eSA9IG51bGw7XHJcblxyXG5cdFx0XHQvLyBPbmx5IHVwZGF0ZSBwb3NpdGlvbiBpZiB0aGUgYXhpcyBub2RlIGV4aXN0cyAoRE9NIGVsZW1lbnRzIGNhbiBnbyBhd2F5IGlmXHJcblx0XHRcdC8vIHRoZSBzY3JvbGxlciBpbnN0YW5jZSBpcyBub3QgZGVzdHJveWVkIGNvcnJlY3RseSlcclxuXHRcdFx0aWYgKCFfc2Nyb2xsTm9kZXNbYXhpc10pIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIERldGVybWluZSB0aGUgdHJhbnNpdGlvbiBwcm9wZXJ0eSB0byBhcHBseSB0byBib3RoIHRoZSBzY3JvbGwgZWxlbWVudCBhbmQgdGhlIHNjcm9sbGJhclxyXG5cdFx0XHRpZiAoYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuXHRcdFx0XHRpZiAoIWFuaW1hdGlvbkJlemllcikge1xyXG5cdFx0XHRcdFx0YW5pbWF0aW9uQmV6aWVyID0gX2luc3RhbmNlT3B0aW9ucy5mbGluZ0JlemllcjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRyYW5zaXRpb25DU1NTdHJpbmcgPSBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zZm9ybSAnICsgYW5pbWF0aW9uRHVyYXRpb24gKyAnbXMgJyArIGFuaW1hdGlvbkJlemllci50b1N0cmluZygpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRyYW5zaXRpb25DU1NTdHJpbmcgPSAnJztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQXBwbHkgdGhlIHRyYW5zaXRpb24gcHJvcGVydHkgdG8gZWxlbWVudHNcclxuXHRcdFx0X3Njcm9sbE5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gdHJhbnNpdGlvbkNTU1N0cmluZztcclxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xyXG5cdFx0XHRcdF9zY3JvbGxiYXJOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNpdGlvblByb3BlcnR5XSA9IHRyYW5zaXRpb25DU1NTdHJpbmc7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgcG9zaXRpb25zXHJcblx0XHRcdF9zY3JvbGxOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNmb3JtUHJvcGVydHldID0gX3RyYW5zbGF0ZVJ1bGVQcmVmaXggKyBfdHJhbnNmb3JtUHJlZml4ZXNbYXhpc10gKyBwb3NpdGlvbiArICdweCcgKyBfdHJhbnNmb3JtU3VmZml4ZXNbYXhpc107XHJcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcclxuXHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXNbYXhpc10uc3R5bGVbX3RyYW5zZm9ybVByb3BlcnR5XSA9IF90cmFuc2xhdGVSdWxlUHJlZml4ICsgX3RyYW5zZm9ybVByZWZpeGVzW2F4aXNdICsgKC1wb3NpdGlvbiAqIF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSAvIF9tZXRyaWNzLmNvbnRlbnRbYXhpc10pICsgJ3B4JyArIF90cmFuc2Zvcm1TdWZmaXhlc1theGlzXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIHNjcm9sbCBpcyBhdCBhbiBleHRyZW1pdHkuXHJcblx0XHRcdGlmIChwb3NpdGlvbiA+PSAwKSB7XHJcblx0XHRcdFx0bmV3UG9zaXRpb25BdEV4dHJlbWl0eSA9ICdzdGFydCc7XHJcblx0XHRcdH0gZWxzZSBpZiAocG9zaXRpb24gPD0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdKSB7XHJcblx0XHRcdFx0bmV3UG9zaXRpb25BdEV4dHJlbWl0eSA9ICdlbmQnO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB0aGUgZXh0cmVtaXR5IHN0YXR1cyBoYXMgY2hhbmdlZCwgZmlyZSBhbiBhcHByb3ByaWF0ZSBldmVudFxyXG5cdFx0XHRpZiAobmV3UG9zaXRpb25BdEV4dHJlbWl0eSAhPT0gX3Njcm9sbEF0RXh0cmVtaXR5W2F4aXNdKSB7XHJcblx0XHRcdFx0aWYgKG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgIT09IG51bGwpIHtcclxuXHRcdFx0XHRcdGlmIChhbmltYXRpb25EdXJhdGlvbikge1xyXG5cdFx0XHRcdFx0XHRfdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0XHRcdF9maXJlRXZlbnQoJ3JlYWNoZWQnICsgbmV3UG9zaXRpb25BdEV4dHJlbWl0eSwgeyBheGlzOiBheGlzIH0pO1xyXG5cdFx0XHRcdFx0XHR9LCBib3VuZHNDcm9zc0RlbGF5IHx8IGFuaW1hdGlvbkR1cmF0aW9uKSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRfZmlyZUV2ZW50KCdyZWFjaGVkJyArIG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHksIHsgYXhpczogYXhpcyB9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0X3Njcm9sbEF0RXh0cmVtaXR5W2F4aXNdID0gbmV3UG9zaXRpb25BdEV4dHJlbWl0eTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSByZWNvcmRlZCBwb3NpdGlvbiBpZiB0aGVyZSdzIG5vIGR1cmF0aW9uXHJcblx0XHRcdGlmICghYW5pbWF0aW9uRHVyYXRpb24pIHtcclxuXHRcdFx0XHRfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdID0gcG9zaXRpb247XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBSZXRyaWV2ZSB0aGUgY3VycmVudCBwb3NpdGlvbiBhcyBhbiBvYmplY3Qgd2l0aCBzY3JvbGxMZWZ0IGFuZCBzY3JvbGxUb3BcclxuXHRcdCAqIHByb3BlcnRpZXMuXHJcblx0XHQgKi9cclxuXHRcdF9nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uIF9nZXRQb3NpdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzY3JvbGxMZWZ0OiAtX2xhc3RTY3JvbGxQb3NpdGlvbi54LFxyXG5cdFx0XHRcdHNjcm9sbFRvcDogLV9sYXN0U2Nyb2xsUG9zaXRpb24ueVxyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHJcblx0XHRfc2NoZWR1bGVBeGlzUG9zaXRpb24gPSBmdW5jdGlvbiBfc2NoZWR1bGVBeGlzUG9zaXRpb24oYXhpcywgcG9zaXRpb24sIGFuaW1hdGlvbkR1cmF0aW9uLCBhbmltYXRpb25CZXppZXIsIGFmdGVyRGVsYXkpIHtcclxuXHRcdFx0X3RpbWVvdXRzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBwb3NpdGlvbiwgYW5pbWF0aW9uRHVyYXRpb24sIGFuaW1hdGlvbkJlemllcik7XHJcblx0XHRcdH0sIGFmdGVyRGVsYXkpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0X2ZpcmVFdmVudCA9IGZ1bmN0aW9uIF9maXJlRXZlbnQoZXZlbnROYW1lLCBldmVudE9iamVjdCkge1xyXG5cdFx0XHR2YXIgaSwgbDtcclxuXHRcdFx0ZXZlbnRPYmplY3Quc3JjT2JqZWN0ID0gX3B1YmxpY1NlbGY7XHJcblxyXG5cdFx0XHQvLyBJdGVyYXRlIHRocm91Z2ggYW55IGxpc3RlbmVyc1xyXG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gX2V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0ubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XHJcblxyXG5cdFx0XHRcdC8vIEV4ZWN1dGUgZWFjaCBpbiBhIHRyeS9jYXRjaFxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRfZXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXVtpXShldmVudE9iamVjdCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGlmICh3aW5kb3cuY29uc29sZSAmJiB3aW5kb3cuY29uc29sZS5lcnJvcikge1xyXG5cdFx0XHRcdFx0XHR3aW5kb3cuY29uc29sZS5lcnJvcihlcnJvci5tZXNzYWdlICsgJyAoJyArIGVycm9yLnNvdXJjZVVSTCArICcsIGxpbmUgJyArIGVycm9yLmxpbmUgKyAnKScpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFVwZGF0ZSB0aGUgc2Nyb2xsIHBvc2l0aW9uIHNvIHRoYXQgdGhlIGNoaWxkIGVsZW1lbnQgaXMgaW4gdmlldy5cclxuXHRcdCAqL1xyXG5cdFx0X2NoaWxkRm9jdXNlZCA9IGZ1bmN0aW9uIF9jaGlsZEZvY3VzZWQoZXZlbnQpIHtcclxuXHRcdFx0dmFyIG9mZnNldCwgYXhpcywgdmlzaWJsZUNoaWxkUG9ydGlvbjtcclxuXHRcdFx0dmFyIGZvY3VzZWROb2RlUmVjdCA9IF9nZXRCb3VuZGluZ1JlY3QoZXZlbnQudGFyZ2V0KTtcclxuXHRcdFx0dmFyIGNvbnRhaW5lclJlY3QgPSBfZ2V0Qm91bmRpbmdSZWN0KF9jb250YWluZXJOb2RlKTtcclxuXHRcdFx0dmFyIGVkZ2VNYXAgPSB7IHg6ICdsZWZ0JywgeTogJ3RvcCcgfTtcclxuXHRcdFx0dmFyIG9wRWRnZU1hcCA9IHsgeDogJ3JpZ2h0JywgeTogJ2JvdHRvbScgfTtcclxuXHRcdFx0dmFyIGRpbWVuc2lvbk1hcCA9IHsgeDogJ3dpZHRoJywgeTogJ2hlaWdodCcgfTtcclxuXHJcblx0XHRcdC8vIElmIGFuIGlucHV0IGlzIGN1cnJlbnRseSBiZWluZyB0cmFja2VkLCBpZ25vcmUgdGhlIGZvY3VzIGV2ZW50XHJcblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyICE9PSBmYWxzZSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xyXG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGUgZm9jdXNzZWQgbm9kZSBpcyBlbnRpcmVseSBpbiB2aWV3LCB0aGVyZSBpcyBubyBuZWVkIHRvIGNlbnRlciBpdFxyXG5cdFx0XHRcdFx0aWYgKGZvY3VzZWROb2RlUmVjdFtlZGdlTWFwW2F4aXNdXSA+PSBjb250YWluZXJSZWN0W2VkZ2VNYXBbYXhpc11dICYmIGZvY3VzZWROb2RlUmVjdFtvcEVkZ2VNYXBbYXhpc11dIDw9IGNvbnRhaW5lclJlY3Rbb3BFZGdlTWFwW2F4aXNdXSkge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBJZiB0aGUgZm9jdXNzZWQgbm9kZSBpcyBsYXJnZXIgdGhhbiB0aGUgY29udGFpbmVyLi4uXHJcblx0XHRcdFx0XHRpZiAoZm9jdXNlZE5vZGVSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0gPiBjb250YWluZXJSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0pIHtcclxuXHJcblx0XHRcdFx0XHRcdHZpc2libGVDaGlsZFBvcnRpb24gPSBmb2N1c2VkTm9kZVJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSAtIE1hdGgubWF4KDAsIGNvbnRhaW5lclJlY3RbZWRnZU1hcFtheGlzXV0gLSBmb2N1c2VkTm9kZVJlY3RbZWRnZU1hcFtheGlzXV0pIC0gTWF0aC5tYXgoMCwgZm9jdXNlZE5vZGVSZWN0W29wRWRnZU1hcFtheGlzXV0gLSBjb250YWluZXJSZWN0W29wRWRnZU1hcFtheGlzXV0pO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgbW9yZSB0aGFuIGhhbGYgYSBjb250YWluZXIncyBwb3J0aW9uIG9mIHRoZSBmb2N1c3NlZCBub2RlIGlzIHZpc2libGUsIHRoZXJlJ3Mgbm8gbmVlZCB0byBjZW50ZXIgaXRcclxuXHRcdFx0XHRcdFx0aWYgKHZpc2libGVDaGlsZFBvcnRpb24gPj0gKGNvbnRhaW5lclJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSAvIDIpKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBTZXQgdGhlIHRhcmdldCBvZmZzZXQgdG8gYmUgaW4gdGhlIG1pZGRsZSBvZiB0aGUgY29udGFpbmVyLCBvciBhcyBjbG9zZSBhcyBib3VuZHMgcGVybWl0XHJcblx0XHRcdFx0XHRvZmZzZXQgPSAtTWF0aC5yb3VuZCgoZm9jdXNlZE5vZGVSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0gLyAyKSAtIF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKyBmb2N1c2VkTm9kZVJlY3RbZWRnZU1hcFtheGlzXV0gLSBjb250YWluZXJSZWN0W2VkZ2VNYXBbYXhpc11dICAtIChjb250YWluZXJSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0gLyAyKSk7XHJcblx0XHRcdFx0XHRvZmZzZXQgPSBNYXRoLm1pbigwLCBNYXRoLm1heChfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10sIG9mZnNldCkpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFBlcmZvcm0gdGhlIHNjcm9sbFxyXG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBvZmZzZXQsIDApO1xyXG5cdFx0XHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXSA9IG9mZnNldDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbCcsIF9nZXRQb3NpdGlvbigpKTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBHaXZlbiBhIHJlbGF0aXZlIGRpc3RhbmNlIGJleW9uZCB0aGUgZWxlbWVudCBib3VuZHMsIHJldHVybnMgYSBtb2RpZmllZCB2ZXJzaW9uIHRvXHJcblx0XHQgKiBzaW11bGF0ZSBib3VuY3kvc3ByaW5neSBlZGdlcy5cclxuXHRcdCAqL1xyXG5cdFx0X21vZGlmeURpc3RhbmNlQmV5b25kQm91bmRzID0gZnVuY3Rpb24gX21vZGlmeURpc3RhbmNlQmV5b25kQm91bmRzKGRpc3RhbmNlLCBheGlzKSB7XHJcblx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5ib3VuY2luZykge1xyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdHZhciBlID0gTWF0aC5leHAoZGlzdGFuY2UgLyBfbWV0cmljcy5jb250YWluZXJbYXhpc10pO1xyXG5cdFx0XHRyZXR1cm4gTWF0aC5yb3VuZChfbWV0cmljcy5jb250YWluZXJbYXhpc10gKiAwLjYgKiAoZSAtIDEpIC8gKGUgKyAxKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogR2l2ZW4gcG9zaXRpb25zIGZvciBlYWNoIGVuYWJsZWQgYXhpcywgcmV0dXJucyBhbiBvYmplY3Qgc2hvd2luZyBob3cgZmFyIGVhY2ggYXhpcyBpcyBiZXlvbmRcclxuXHRcdCAqIGJvdW5kcy4gSWYgd2l0aGluIGJvdW5kcywgLTEgaXMgcmV0dXJuZWQ7IGlmIGF0IHRoZSBib3VuZHMsIDAgaXMgcmV0dXJuZWQuXHJcblx0XHQgKi9cclxuXHRcdF9kaXN0YW5jZXNCZXlvbmRCb3VuZHMgPSBmdW5jdGlvbiBfZGlzdGFuY2VzQmV5b25kQm91bmRzKHBvc2l0aW9ucykge1xyXG5cdFx0XHR2YXIgYXhpcywgcG9zaXRpb247XHJcblx0XHRcdHZhciBkaXN0YW5jZXMgPSB7fTtcclxuXHRcdFx0Zm9yIChheGlzIGluIHBvc2l0aW9ucykge1xyXG5cdFx0XHRcdGlmIChwb3NpdGlvbnMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcclxuXHRcdFx0XHRcdHBvc2l0aW9uID0gcG9zaXRpb25zW2F4aXNdO1xyXG5cclxuXHRcdFx0XHRcdC8vIElmIHRoZSBwb3NpdGlvbiBpcyB0byB0aGUgbGVmdC90b3AsIG5vIGZ1cnRoZXIgbW9kaWZpY2F0aW9uIHJlcXVpcmVkXHJcblx0XHRcdFx0XHRpZiAocG9zaXRpb24gPj0gMCkge1xyXG5cdFx0XHRcdFx0XHRkaXN0YW5jZXNbYXhpc10gPSBwb3NpdGlvbjtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiBpdCdzIHdpdGhpbiB0aGUgYm91bmRzLCB1c2UgLTFcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAocG9zaXRpb24gPiBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcclxuXHRcdFx0XHRcdFx0ZGlzdGFuY2VzW2F4aXNdID0gLTE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCBhbWVuZCBieSB0aGUgZGlzdGFuY2Ugb2YgdGhlIG1heGltdW0gZWRnZVxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0ZGlzdGFuY2VzW2F4aXNdID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdIC0gcG9zaXRpb247XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBkaXN0YW5jZXM7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogT24gcGxhdGZvcm1zIHdoaWNoIHN1cHBvcnQgaXQsIHVzZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgdG8gZ3JvdXBcclxuXHRcdCAqIHBvc2l0aW9uIHVwZGF0ZXMgZm9yIHNwZWVkLiAgU3RhcnRzIHRoZSByZW5kZXIgcHJvY2Vzcy5cclxuXHRcdCAqL1xyXG5cdFx0X3N0YXJ0QW5pbWF0aW9uID0gZnVuY3Rpb24gX3N0YXJ0QW5pbWF0aW9uKCkge1xyXG5cdFx0XHRpZiAoX3JlcUFuaW1hdGlvbkZyYW1lKSB7XHJcblx0XHRcdFx0X2NhbmNlbEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdF9hbmltYXRpb25GcmFtZVJlcXVlc3QgPSBfcmVxQW5pbWF0aW9uRnJhbWUoX3NjaGVkdWxlUmVuZGVyKTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIE9uIHBsYXRmb3JtcyB3aGljaCBzdXBwb3J0IFJlcXVlc3RBbmltYXRpb25GcmFtZSwgcHJvdmlkZSB0aGUgcmVuZGVyaW5nIGxvb3AuXHJcblx0XHQgKiBUYWtlcyB0d28gYXJndW1lbnRzOyB0aGUgZmlyc3QgaXMgdGhlIHJlbmRlci9wb3NpdGlvbiB1cGRhdGUgZnVuY3Rpb24gdG9cclxuXHRcdCAqIGJlIGNhbGxlZCwgYW5kIHRoZSBzZWNvbmQgaXMgYSBzdHJpbmcgY29udHJvbGxpbmcgdGhlIHJlbmRlciB0eXBlIHRvXHJcblx0XHQgKiBhbGxvdyBwcmV2aW91cyBjaGFuZ2VzIHRvIGJlIGNhbmNlbGxlZCAtIHNob3VsZCBiZSAncGFuJyBvciAnc2Nyb2xsJy5cclxuXHRcdCAqL1xyXG5cdFx0X3NjaGVkdWxlUmVuZGVyID0gZnVuY3Rpb24gX3NjaGVkdWxlUmVuZGVyKCkge1xyXG5cdFx0XHR2YXIgYXhpcywgcG9zaXRpb25VcGRhdGVkO1xyXG5cclxuXHRcdFx0Ly8gSWYgdXNpbmcgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHNjaGVkdWxlIHRoZSBuZXh0IHVwZGF0ZSBhdCBvbmNlXHJcblx0XHRcdGlmIChfcmVxQW5pbWF0aW9uRnJhbWUpIHtcclxuXHRcdFx0XHRfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gX3JlcUFuaW1hdGlvbkZyYW1lKF9zY2hlZHVsZVJlbmRlcik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFBlcmZvcm0gdGhlIGRyYXcuXHJcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcclxuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpICYmIF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSAhPT0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSkge1xyXG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10pO1xyXG5cdFx0XHRcdFx0cG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIGZ1bGwsIGxvY2tlZCBzY3JvbGxpbmcgaGFzIGVuYWJsZWQsIGZpcmUgYW55IHNjcm9sbCBhbmQgc2VnbWVudCBjaGFuZ2UgZXZlbnRzXHJcblx0XHRcdGlmIChfaXNTY3JvbGxpbmcgJiYgcG9zaXRpb25VcGRhdGVkKSB7XHJcblx0XHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsJywgX2dldFBvc2l0aW9uKCkpO1xyXG5cdFx0XHRcdF91cGRhdGVTZWdtZW50cyhmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBTdG9wcyB0aGUgYW5pbWF0aW9uIHByb2Nlc3MuXHJcblx0XHQgKi9cclxuXHRcdF9jYW5jZWxBbmltYXRpb24gPSBmdW5jdGlvbiBfY2FuY2VsQW5pbWF0aW9uKCkge1xyXG5cdFx0XHRpZiAoX2FuaW1hdGlvbkZyYW1lUmVxdWVzdCA9PT0gZmFsc2UgfHwgIV9jYW5jZWxBbmltYXRpb25GcmFtZSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X2NhbmNlbEFuaW1hdGlvbkZyYW1lKF9hbmltYXRpb25GcmFtZVJlcXVlc3QpO1xyXG5cdFx0XHRfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gZmFsc2U7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUmVnaXN0ZXIgb3IgdW5yZWdpc3RlciBldmVudCBoYW5kbGVycyBhcyBhcHByb3ByaWF0ZVxyXG5cdFx0ICovXHJcblx0XHRfdG9nZ2xlRXZlbnRIYW5kbGVycyA9IGZ1bmN0aW9uIF90b2dnbGVFdmVudEhhbmRsZXJzKGVuYWJsZSkge1xyXG5cdFx0XHR2YXIgTXV0YXRpb25PYnNlcnZlcjtcclxuXHJcblx0XHRcdC8vIE9ubHkgcmVtb3ZlIHRoZSBldmVudCBpZiB0aGUgbm9kZSBleGlzdHMgKERPTSBlbGVtZW50cyBjYW4gZ28gYXdheSlcclxuXHRcdFx0aWYgKCFfY29udGFpbmVyTm9kZSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGVuYWJsZSkge1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlID0gX2NvbnRhaW5lck5vZGUuYWRkRXZlbnRMaXN0ZW5lcjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSA9IF9jb250YWluZXJOb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChfdHJhY2tQb2ludGVyRXZlbnRzKSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ01TUG9pbnRlckRvd24nLCBfb25Qb2ludGVyRG93biwgdHJ1ZSk7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ01TUG9pbnRlck1vdmUnLCBfb25Qb2ludGVyTW92ZSwgdHJ1ZSk7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ01TUG9pbnRlclVwJywgX29uUG9pbnRlclVwLCB0cnVlKTtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnTVNQb2ludGVyQ2FuY2VsJywgX29uUG9pbnRlckNhbmNlbCwgdHJ1ZSk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0aWYgKF90cmFja1RvdWNoRXZlbnRzICYmICFfaW5zdGFuY2VPcHRpb25zLmRpc2FibGVkSW5wdXRNZXRob2RzLnRvdWNoKSB7XHJcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgndG91Y2hzdGFydCcsIF9vblRvdWNoU3RhcnQsIHRydWUpO1xyXG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ3RvdWNobW92ZScsIF9vblRvdWNoTW92ZSwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgndG91Y2hlbmQnLCBfb25Ub3VjaEVuZCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgndG91Y2hjYW5jZWwnLCBfb25Ub3VjaEVuZCwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5kaXNhYmxlZElucHV0TWV0aG9kcy5tb3VzZSkge1xyXG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ21vdXNlZG93bicsIF9vbk1vdXNlRG93biwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRpZiAoIWVuYWJsZSkge1xyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBfb25Nb3VzZU1vdmUsIHRydWUpO1xyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgX29uTW91c2VVcCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5kaXNhYmxlZElucHV0TWV0aG9kcy5zY3JvbGwpIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnRE9NTW91c2VTY3JvbGwnLCBfb25Nb3VzZVNjcm9sbCwgZmFsc2UpO1xyXG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdtb3VzZXdoZWVsJywgX29uTW91c2VTY3JvbGwsIGZhbHNlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIGEgY2xpY2sgbGlzdGVuZXIuICBPbiBJRSwgYWRkIHRoZSBsaXN0ZW5lciB0byB0aGUgZG9jdW1lbnQsIHRvIGFsbG93XHJcblx0XHRcdC8vIGNsaWNrcyB0byBiZSBjYW5jZWxsZWQgaWYgYSBzY3JvbGwgZW5kcyBvdXRzaWRlIHRoZSBib3VuZHMgb2YgdGhlIGNvbnRhaW5lcjsgb25cclxuXHRcdFx0Ly8gb3RoZXIgcGxhdGZvcm1zLCBhZGQgdG8gdGhlIGNvbnRhaW5lciBub2RlLlxyXG5cdFx0XHRpZiAoX3RyYWNrUG9pbnRlckV2ZW50cykge1xyXG5cdFx0XHRcdGlmIChlbmFibGUpIHtcclxuXHRcdFx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgX29uQ2xpY2ssIHRydWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIF9vbkNsaWNrLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ2NsaWNrJywgX29uQ2xpY2ssIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBXYXRjaCBmb3IgY2hhbmdlcyBpbnNpZGUgdGhlIGNvbnRhaW5lZCBlbGVtZW50IHRvIHVwZGF0ZSBib3VuZHMgLSBkZS1ib3VuY2VkIHNsaWdodGx5LlxyXG5cdFx0XHRpZiAoZW5hYmxlKSB7XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgX2NoaWxkRm9jdXNlZCwgdHJ1ZSk7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMudXBkYXRlT25DaGFuZ2VzKSB7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVHJ5IGFuZCByZXVzZSB0aGUgb2xkLCBkaXNjb25uZWN0ZWQgb2JzZXJ2ZXIgaW5zdGFuY2UgaWYgYXZhaWxhYmxlXHJcblx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIGNoZWNrIGZvciBzdXBwb3J0IGJlZm9yZSBwcm9jZWVkaW5nXHJcblx0XHRcdFx0XHRpZiAoIV9tdXRhdGlvbk9ic2VydmVyKSB7XHJcblx0XHRcdFx0XHRcdE11dGF0aW9uT2JzZXJ2ZXIgPSB3aW5kb3cuTXV0YXRpb25PYnNlcnZlciB8fCB3aW5kb3cuV2ViS2l0TXV0YXRpb25PYnNlcnZlciB8fCB3aW5kb3dbX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggKyAnTXV0YXRpb25PYnNlcnZlciddO1xyXG5cdFx0XHRcdFx0XHRpZiAoTXV0YXRpb25PYnNlcnZlcikge1xyXG5cdFx0XHRcdFx0XHRcdF9tdXRhdGlvbk9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoX2RvbUNoYW5nZWQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKF9tdXRhdGlvbk9ic2VydmVyKSB7XHJcblx0XHRcdFx0XHRcdF9tdXRhdGlvbk9ic2VydmVyLm9ic2VydmUoX2NvbnRlbnRQYXJlbnROb2RlLCB7XHJcblx0XHRcdFx0XHRcdFx0Y2hpbGRMaXN0OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdGNoYXJhY3RlckRhdGE6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0c3VidHJlZTogdHJ1ZVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5hZGRFdmVudExpc3RlbmVyKCdET01TdWJ0cmVlTW9kaWZpZWQnLCBmdW5jdGlvbiAoZSkge1xyXG5cclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gSWdub3JlIGNoYW5nZXMgdG8gbmVzdGVkIEZUIFNjcm9sbGVycyAtIGV2ZW4gdXBkYXRpbmcgYSB0cmFuc2Zvcm0gc3R5bGVcclxuXHRcdFx0XHRcdFx0XHQvLyBjYW4gdHJpZ2dlciBhIERPTVN1YnRyZWVNb2RpZmllZCBpbiBJRSwgY2F1c2luZyBuZXN0ZWQgc2Nyb2xsZXJzIHRvIGFsd2F5c1xyXG5cdFx0XHRcdFx0XHRcdC8vIGZhdm91ciB0aGUgZGVlcGVzdCBzY3JvbGxlciBhcyBwYXJlbnQgc2Nyb2xsZXJzICdyZXNpemUnL2VuZCBzY3JvbGxpbmcuXHJcblx0XHRcdFx0XHRcdFx0aWYgKGUgJiYgKGUuc3JjRWxlbWVudCA9PT0gX2NvbnRlbnRQYXJlbnROb2RlIHx8IGUuc3JjRWxlbWVudC5jbGFzc05hbWUuaW5kZXhPZignZnRzY3JvbGxlcl8nKSAhPT0gLTEpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRfZG9tQ2hhbmdlZCgpO1xyXG5cdFx0XHRcdFx0XHR9LCB0cnVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgX2RvbUNoYW5nZWQsIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy51cGRhdGVPbldpbmRvd1Jlc2l6ZSkge1xyXG5cdFx0XHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIF9kb21DaGFuZ2VkLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgX2NoaWxkRm9jdXNlZCwgdHJ1ZSk7XHJcblx0XHRcdFx0aWYgKF9tdXRhdGlvbk9ic2VydmVyKSB7XHJcblx0XHRcdFx0XHRfbXV0YXRpb25PYnNlcnZlci5kaXNjb25uZWN0KCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdET01TdWJ0cmVlTW9kaWZpZWQnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkJywgX2RvbUNoYW5nZWQsIHRydWUpO1xyXG5cdFx0XHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGRlbGV0ZSBfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBUb3VjaCBldmVudCBoYW5kbGVyc1xyXG5cdFx0ICovXHJcblx0XHRfb25Ub3VjaFN0YXJ0ID0gZnVuY3Rpb24gX29uVG91Y2hTdGFydChzdGFydEV2ZW50KSB7XHJcblx0XHRcdHZhciBpLCBsLCB0b3VjaEV2ZW50O1xyXG5cclxuXHRcdFx0Ly8gSWYgYSB0b3VjaCBpcyBhbHJlYWR5IGFjdGl2ZSwgZW5zdXJlIHRoYXQgdGhlIGluZGV4XHJcblx0XHRcdC8vIGlzIG1hcHBlZCB0byB0aGUgY29ycmVjdCBmaW5nZXIsIGFuZCByZXR1cm4uXHJcblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0Zm9yIChpID0gMCwgbCA9IHN0YXJ0RXZlbnQudG91Y2hlcy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcclxuXHRcdFx0XHRcdGlmIChzdGFydEV2ZW50LnRvdWNoZXNbaV0uaWRlbnRpZmllciA9PT0gX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdFx0XHRfaW5wdXRJbmRleCA9IGk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVHJhY2sgdGhlIG5ldyB0b3VjaCdzIGlkZW50aWZpZXIsIHJlc2V0IGluZGV4LCBhbmQgcGFzc1xyXG5cdFx0XHQvLyB0aGUgY29vcmRpbmF0ZXMgdG8gdGhlIHNjcm9sbCBzdGFydCBmdW5jdGlvbi5cclxuXHRcdFx0dG91Y2hFdmVudCA9IHN0YXJ0RXZlbnQudG91Y2hlc1swXTtcclxuXHRcdFx0X2lucHV0SWRlbnRpZmllciA9IHRvdWNoRXZlbnQuaWRlbnRpZmllcjtcclxuXHRcdFx0X2lucHV0SW5kZXggPSAwO1xyXG5cdFx0XHRfc3RhcnRTY3JvbGwodG91Y2hFdmVudC5jbGllbnRYLCB0b3VjaEV2ZW50LmNsaWVudFksIHN0YXJ0RXZlbnQudGltZVN0YW1wLCBzdGFydEV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Ub3VjaE1vdmUgPSBmdW5jdGlvbiBfb25Ub3VjaE1vdmUobW92ZUV2ZW50KSB7XHJcblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyID09PSBmYWxzZSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gR2V0IHRoZSBjb29yZGluYXRlcyBmcm9tIHRoZSBhcHByb3ByaWF0ZSB0b3VjaCBldmVudCBhbmRcclxuXHRcdFx0Ly8gcGFzcyB0aGVtIG9uIHRvIHRoZSBzY3JvbGwgaGFuZGxlclxyXG5cdFx0XHR2YXIgdG91Y2hFdmVudCA9IG1vdmVFdmVudC50b3VjaGVzW19pbnB1dEluZGV4XTtcclxuXHRcdFx0X3VwZGF0ZVNjcm9sbCh0b3VjaEV2ZW50LmNsaWVudFgsIHRvdWNoRXZlbnQuY2xpZW50WSwgbW92ZUV2ZW50LnRpbWVTdGFtcCwgbW92ZUV2ZW50KTtcclxuXHRcdH07XHJcblx0XHRfb25Ub3VjaEVuZCA9IGZ1bmN0aW9uIF9vblRvdWNoRW5kKGVuZEV2ZW50KSB7XHJcblx0XHRcdHZhciBpLCBsO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgd2hldGhlciB0aGUgb3JpZ2luYWwgdG91Y2ggZXZlbnQgaXMgc3RpbGwgYWN0aXZlLFxyXG5cdFx0XHQvLyBpZiBpdCBpcywgdXBkYXRlIHRoZSBpbmRleCBhbmQgcmV0dXJuLlxyXG5cdFx0XHRpZiAoZW5kRXZlbnQudG91Y2hlcykge1xyXG5cdFx0XHRcdGZvciAoaSA9IDAsIGwgPSBlbmRFdmVudC50b3VjaGVzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRcdFx0aWYgKGVuZEV2ZW50LnRvdWNoZXNbaV0uaWRlbnRpZmllciA9PT0gX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdFx0XHRfaW5wdXRJbmRleCA9IGk7XHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvbXBsZXRlIHRoZSBzY3JvbGwuICBOb3RlIHRoYXQgdG91Y2ggZW5kIGV2ZW50c1xyXG5cdFx0XHQvLyBkb24ndCBjYXB0dXJlIGNvb3JkaW5hdGVzLlxyXG5cdFx0XHRfZW5kU2Nyb2xsKGVuZEV2ZW50LnRpbWVTdGFtcCwgZW5kRXZlbnQpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIE1vdXNlIGV2ZW50IGhhbmRsZXJzXHJcblx0XHQgKi9cclxuXHRcdF9vbk1vdXNlRG93biA9IGZ1bmN0aW9uIF9vbk1vdXNlRG93bihzdGFydEV2ZW50KSB7XHJcblxyXG5cdFx0XHQvLyBEb24ndCB0cmFjayB0aGUgcmlnaHQgbW91c2UgYnV0dG9ucywgb3IgYSBjb250ZXh0IG1lbnVcclxuXHRcdFx0aWYgKChzdGFydEV2ZW50LmJ1dHRvbiAmJiBzdGFydEV2ZW50LmJ1dHRvbiA9PT0gMikgfHwgc3RhcnRFdmVudC5jdHJsS2V5KSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDYXB0dXJlIGlmIHBvc3NpYmxlXHJcblx0XHRcdGlmIChfY29udGFpbmVyTm9kZS5zZXRDYXB0dXJlKSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuc2V0Q2FwdHVyZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgbW92ZSAmIHVwIGhhbmRsZXJzIHRvIHRoZSAqZG9jdW1lbnQqIHRvIGFsbG93IGhhbmRsaW5nIG91dHNpZGUgdGhlIGVsZW1lbnRcclxuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgX29uTW91c2VNb3ZlLCB0cnVlKTtcclxuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIF9vbk1vdXNlVXAsIHRydWUpO1xyXG5cclxuXHRcdFx0X2lucHV0SWRlbnRpZmllciA9IHN0YXJ0RXZlbnQuYnV0dG9uIHx8IDE7XHJcblx0XHRcdF9pbnB1dEluZGV4ID0gMDtcclxuXHRcdFx0X3N0YXJ0U2Nyb2xsKHN0YXJ0RXZlbnQuY2xpZW50WCwgc3RhcnRFdmVudC5jbGllbnRZLCBzdGFydEV2ZW50LnRpbWVTdGFtcCwgc3RhcnRFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uTW91c2VNb3ZlID0gZnVuY3Rpb24gX29uTW91c2VNb3ZlKG1vdmVFdmVudCkge1xyXG5cdFx0XHRpZiAoIV9pbnB1dElkZW50aWZpZXIpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdF91cGRhdGVTY3JvbGwobW92ZUV2ZW50LmNsaWVudFgsIG1vdmVFdmVudC5jbGllbnRZLCBtb3ZlRXZlbnQudGltZVN0YW1wLCBtb3ZlRXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vbk1vdXNlVXAgPSBmdW5jdGlvbiBfb25Nb3VzZVVwKGVuZEV2ZW50KSB7XHJcblx0XHRcdGlmIChlbmRFdmVudC5idXR0b24gJiYgZW5kRXZlbnQuYnV0dG9uICE9PSBfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBfb25Nb3VzZU1vdmUsIHRydWUpO1xyXG5cdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgX29uTW91c2VVcCwgdHJ1ZSk7XHJcblxyXG5cdFx0XHQvLyBSZWxlYXNlIGNhcHR1cmUgaWYgcG9zc2libGVcclxuXHRcdFx0aWYgKF9jb250YWluZXJOb2RlLnJlbGVhc2VDYXB0dXJlKSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUucmVsZWFzZUNhcHR1cmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X2VuZFNjcm9sbChlbmRFdmVudC50aW1lU3RhbXAsIGVuZEV2ZW50KTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBQb2ludGVyIGV2ZW50IGhhbmRsZXJzXHJcblx0XHQgKi9cclxuXHRcdF9vblBvaW50ZXJEb3duID0gZnVuY3Rpb24gX29uUG9pbnRlckRvd24oc3RhcnRFdmVudCkge1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlcmUgaXMgYWxyZWFkeSBhIHBvaW50ZXIgZXZlbnQgYmVpbmcgdHJhY2tlZCwgaWdub3JlIHN1YnNlcXVlbnQuXHJcblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBEaXNhYmxlIHNwZWNpZmljIGlucHV0IHR5cGVzIGlmIHNwZWNpZmllZCBpbiB0aGUgY29uZmlnLiAgU2VwYXJhdGVcclxuXHRcdFx0Ly8gb3V0IHRvdWNoIGFuZCBvdGhlciBldmVudHMgKGVnIHRyZWF0IGJvdGggcGVuIGFuZCBtb3VzZSBhcyBcIm1vdXNlXCIpXHJcblx0XHRcdGlmIChzdGFydEV2ZW50LnBvaW50ZXJUeXBlID09PSBzdGFydEV2ZW50Lk1TUE9JTlRFUl9UWVBFX1RPVUNIKSB7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMudG91Y2gpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy5kaXNhYmxlZElucHV0TWV0aG9kcy5tb3VzZSkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0X2lucHV0SWRlbnRpZmllciA9IHN0YXJ0RXZlbnQucG9pbnRlcklkO1xyXG5cdFx0XHRfY2FwdHVyZUlucHV0KCk7XHJcblx0XHRcdF9zdGFydFNjcm9sbChzdGFydEV2ZW50LmNsaWVudFgsIHN0YXJ0RXZlbnQuY2xpZW50WSwgc3RhcnRFdmVudC50aW1lU3RhbXAsIHN0YXJ0RXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vblBvaW50ZXJNb3ZlID0gZnVuY3Rpb24gX29uUG9pbnRlck1vdmUobW92ZUV2ZW50KSB7XHJcblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyICE9PSBtb3ZlRXZlbnQucG9pbnRlcklkKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdF91cGRhdGVTY3JvbGwobW92ZUV2ZW50LmNsaWVudFgsIG1vdmVFdmVudC5jbGllbnRZLCBtb3ZlRXZlbnQudGltZVN0YW1wLCBtb3ZlRXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vblBvaW50ZXJVcCA9IGZ1bmN0aW9uIF9vblBvaW50ZXJVcChlbmRFdmVudCkge1xyXG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciAhPT0gZW5kRXZlbnQucG9pbnRlcklkKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfZW5kU2Nyb2xsKGVuZEV2ZW50LnRpbWVTdGFtcCwgZW5kRXZlbnQpO1xyXG5cdFx0fTtcclxuXHRcdF9vblBvaW50ZXJDYW5jZWwgPSBmdW5jdGlvbiBfb25Qb2ludGVyQ2FuY2VsKGVuZEV2ZW50KSB7XHJcblx0XHRcdF9lbmRTY3JvbGwoZW5kRXZlbnQudGltZVN0YW1wLCBlbmRFdmVudCk7XHJcblx0XHR9O1xyXG5cdFx0X29uUG9pbnRlckNhcHR1cmVFbmQgPSBmdW5jdGlvbiBfb25Qb2ludGVyQ2FwdHVyZUVuZChldmVudCkge1xyXG5cdFx0XHRfZW5kU2Nyb2xsKGV2ZW50LnRpbWVTdGFtcCwgZXZlbnQpO1xyXG5cdFx0fTtcclxuXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBQcmV2ZW50cyBjbGljayBhY3Rpb25zIGlmIGFwcHJvcHJpYXRlXHJcblx0XHQgKi9cclxuXHRcdF9vbkNsaWNrID0gZnVuY3Rpb24gX29uQ2xpY2soY2xpY2tFdmVudCkge1xyXG5cclxuXHRcdFx0Ly8gSWYgYSBzY3JvbGwgYWN0aW9uIGhhc24ndCByZXN1bHRlZCBpbiB0aGUgbmV4dCBzY3JvbGwgYmVpbmcgcHJldmVudGVkLCBhbmQgYSBzY3JvbGxcclxuXHRcdFx0Ly8gaXNuJ3QgY3VycmVudGx5IGluIHByb2dyZXNzIHdpdGggYSBkaWZmZXJlbnQgaWRlbnRpZmllciwgYWxsb3cgdGhlIGNsaWNrXHJcblx0XHRcdGlmICghX3ByZXZlbnRDbGljayAmJiAhX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBQcmV2ZW50IGNsaWNrcyB1c2luZyB0aGUgcHJldmVudERlZmF1bHQoKSBhbmQgc3RvcFByb3BhZ2F0aW9uKCkgaGFuZGxlcnMgb24gdGhlIGV2ZW50O1xyXG5cdFx0XHQvLyB0aGlzIGlzIHNhZmUgZXZlbiBpbiBJRTEwIGFzIHRoaXMgaXMgYWx3YXlzIGEgXCJ0cnVlXCIgZXZlbnQsIG5ldmVyIGEgd2luZG93LmV2ZW50LlxyXG5cdFx0XHRjbGlja0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdGNsaWNrRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdGlmICghX2lucHV0SWRlbnRpZmllcikge1xyXG5cdFx0XHRcdF9wcmV2ZW50Q2xpY2sgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9O1xyXG5cclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFByb2Nlc3Mgc2Nyb2xsIHdoZWVsL2lucHV0IGFjdGlvbnMgYXMgc2Nyb2xsZXIgc2Nyb2xsc1xyXG5cdFx0ICovXHJcblx0XHRfb25Nb3VzZVNjcm9sbCA9IGZ1bmN0aW9uIF9vbk1vdXNlU2Nyb2xsKGV2ZW50KSB7XHJcblx0XHRcdHZhciBzY3JvbGxEZWx0YVgsIHNjcm9sbERlbHRhWTtcclxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09ICdzY3JvbGx3aGVlbCcpIHtcclxuXHRcdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciAhPT0gZmFsc2UpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gJ3Njcm9sbHdoZWVsJztcclxuXHRcdFx0XHRfY3VtdWxhdGl2ZVNjcm9sbC54ID0gMDtcclxuXHRcdFx0XHRfY3VtdWxhdGl2ZVNjcm9sbC55ID0gMDtcclxuXHJcblx0XHRcdFx0Ly8gU3RhcnQgYSBzY3JvbGwgZXZlbnRcclxuXHRcdFx0XHRpZiAoIV9zdGFydFNjcm9sbChldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZLCBEYXRlLm5vdygpLCBldmVudCkpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENvbnZlcnQgdGhlIHNjcm9sbHdoZWVsIHZhbHVlcyB0byBhIHNjcm9sbCB2YWx1ZVxyXG5cdFx0XHRpZiAoZXZlbnQud2hlZWxEZWx0YSkge1xyXG5cdFx0XHRcdGlmIChldmVudC53aGVlbERlbHRhWCkge1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFYID0gZXZlbnQud2hlZWxEZWx0YVggLyAyO1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gZXZlbnQud2hlZWxEZWx0YVkgLyAyO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVggPSAwO1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gZXZlbnQud2hlZWxEZWx0YSAvIDI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGlmIChldmVudC5heGlzICYmIGV2ZW50LmF4aXMgPT09IGV2ZW50LkhPUklaT05UQUxfQVhJUykge1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFYID0gZXZlbnQuZGV0YWlsICogLTEwO1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gMDtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFYID0gMDtcclxuXHRcdFx0XHRcdHNjcm9sbERlbHRhWSA9IGV2ZW50LmRldGFpbCAqIC0xMDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHRoZSBzY3JvbGxlciBpcyBjb25zdHJhaW5lZCB0byBhbiB4IGF4aXMsIGNvbnZlcnQgeSBzY3JvbGwgdG8gYWxsb3cgc2luZ2xlLWF4aXMgc2Nyb2xsXHJcblx0XHRcdC8vIHdoZWVscyB0byBzY3JvbGwgY29uc3RyYWluZWQgY29udGVudC5cclxuXHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kgJiYgIXNjcm9sbERlbHRhWCkge1xyXG5cdFx0XHRcdHNjcm9sbERlbHRhWCA9IHNjcm9sbERlbHRhWTtcclxuXHRcdFx0XHRzY3JvbGxEZWx0YVkgPSAwO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRfY3VtdWxhdGl2ZVNjcm9sbC54ID0gTWF0aC5yb3VuZChfY3VtdWxhdGl2ZVNjcm9sbC54ICsgc2Nyb2xsRGVsdGFYKTtcclxuXHRcdFx0X2N1bXVsYXRpdmVTY3JvbGwueSA9IE1hdGgucm91bmQoX2N1bXVsYXRpdmVTY3JvbGwueSArIHNjcm9sbERlbHRhWSk7XHJcblxyXG5cdFx0XHRfdXBkYXRlU2Nyb2xsKF9nZXN0dXJlU3RhcnQueCArIF9jdW11bGF0aXZlU2Nyb2xsLngsIF9nZXN0dXJlU3RhcnQueSArIF9jdW11bGF0aXZlU2Nyb2xsLnksIGV2ZW50LnRpbWVTdGFtcCwgZXZlbnQpO1xyXG5cclxuXHRcdFx0Ly8gRW5kIHNjcm9sbGluZyBzdGF0ZVxyXG5cdFx0XHRpZiAoX3Njcm9sbFdoZWVsRW5kRGVib3VuY2VyKSB7XHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KF9zY3JvbGxXaGVlbEVuZERlYm91bmNlcik7XHJcblx0XHRcdH1cclxuXHRcdFx0X3Njcm9sbFdoZWVsRW5kRGVib3VuY2VyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcblx0XHRcdFx0X2lucHV0SWRlbnRpZmllciA9IGZhbHNlO1xyXG5cdFx0XHRcdF9yZWxlYXNlSW5wdXRDYXB0dXJlKCk7XHJcblx0XHRcdFx0X2lzU2Nyb2xsaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0X2lzRGlzcGxheWluZ1Njcm9sbCA9IGZhbHNlO1xyXG5cdFx0XHRcdF9mdHNjcm9sbGVyTW92aW5nID0gZmFsc2U7XHJcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZykge1xyXG5cdFx0XHRcdFx0d2luZG93W19pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZ10gPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0X2NhbmNlbEFuaW1hdGlvbigpO1xyXG5cdFx0XHRcdGlmICghX3NuYXBTY3JvbGwoKSkge1xyXG5cdFx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCAzMDApO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIENhcHR1cmUgYW5kIHJlbGVhc2UgaW5wdXQgc3VwcG9ydCwgcGFydGljdWxhcmx5IGFsbG93aW5nIHRyYWNraW5nXHJcblx0XHQgKiBvZiBNZXRybyBwb2ludGVycyBvdXRzaWRlIHRoZSBkb2NrZWQgdmlldy5cclxuXHRcdCAqL1xyXG5cdFx0X2NhcHR1cmVJbnB1dCA9IGZ1bmN0aW9uIF9jYXB0dXJlSW5wdXQoKSB7XHJcblx0XHRcdGlmIChfaW5wdXRDYXB0dXJlZCB8fCBfaW5wdXRJZGVudGlmaWVyID09PSBmYWxzZSB8fCBfaW5wdXRJZGVudGlmaWVyID09PSAnc2Nyb2xsd2hlZWwnKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChfdHJhY2tQb2ludGVyRXZlbnRzKSB7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUubXNTZXRQb2ludGVyQ2FwdHVyZShfaW5wdXRJZGVudGlmaWVyKTtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5hZGRFdmVudExpc3RlbmVyKCdNU0xvc3RQb2ludGVyQ2FwdHVyZScsIF9vblBvaW50ZXJDYXB0dXJlRW5kLCBmYWxzZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0X2lucHV0Q2FwdHVyZWQgPSB0cnVlO1xyXG5cdFx0fTtcclxuXHRcdF9yZWxlYXNlSW5wdXRDYXB0dXJlID0gZnVuY3Rpb24gX3JlbGVhc2VJbnB1dENhcHR1cmUoKSB7XHJcblx0XHRcdGlmICghX2lucHV0Q2FwdHVyZWQpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKF90cmFja1BvaW50ZXJFdmVudHMpIHtcclxuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdNU0xvc3RQb2ludGVyQ2FwdHVyZScsIF9vblBvaW50ZXJDYXB0dXJlRW5kLCBmYWxzZSk7XHJcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUubXNSZWxlYXNlUG9pbnRlckNhcHR1cmUoX2lucHV0SWRlbnRpZmllcik7XHJcblx0XHRcdH1cclxuXHRcdFx0X2lucHV0Q2FwdHVyZWQgPSBmYWxzZTtcclxuXHRcdH07XHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBVdGlsaXR5IGZ1bmN0aW9uIGFjdGluZyBhcyBhIGdldEJvdW5kaW5nQ2xpZW50UmVjdCBwb2x5ZmlsbC5cclxuXHRcdCAqL1xyXG5cdFx0X2dldEJvdW5kaW5nUmVjdCA9IGZ1bmN0aW9uIF9nZXRCb3VuZGluZ1JlY3QoYW5FbGVtZW50KSB7XHJcblx0XHRcdGlmIChhbkVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KSB7XHJcblx0XHRcdFx0cmV0dXJuIGFuRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHggPSAwLCB5ID0gMCwgZWFjaEVsZW1lbnQgPSBhbkVsZW1lbnQ7XHJcblx0XHRcdHdoaWxlIChlYWNoRWxlbWVudCkge1xyXG5cdFx0XHRcdHggPSB4ICsgZWFjaEVsZW1lbnQub2Zmc2V0TGVmdCAtIGVhY2hFbGVtZW50LnNjcm9sbExlZnQ7XHJcblx0XHRcdFx0eSA9IHkgKyBlYWNoRWxlbWVudC5vZmZzZXRUb3AgLSBlYWNoRWxlbWVudC5zY3JvbGxUb3A7XHJcblx0XHRcdFx0ZWFjaEVsZW1lbnQgPSBlYWNoRWxlbWVudC5vZmZzZXRQYXJlbnQ7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHsgbGVmdDogeCwgdG9wOiB5LCB3aWR0aDogYW5FbGVtZW50Lm9mZnNldFdpZHRoLCBoZWlnaHQ6IGFuRWxlbWVudC5vZmZzZXRIZWlnaHQgfTtcclxuXHRcdH07XHJcblxyXG5cclxuXHRcdC8qICAgICAgICAgICAgICAgICAgICAgSW5zdGFudGlhdGlvbiAgICAgICAgICAgICAgICAgICAgICovXHJcblxyXG5cdFx0Ly8gU2V0IHVwIHRoZSBET00gbm9kZSBpZiBhcHByb3ByaWF0ZVxyXG5cdFx0X2luaXRpYWxpemVET00oKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgc2l6ZXNcclxuXHRcdF91cGRhdGVEaW1lbnNpb25zKCk7XHJcblxyXG5cdFx0Ly8gU2V0IHVwIHRoZSBldmVudCBoYW5kbGVyc1xyXG5cdFx0X3RvZ2dsZUV2ZW50SGFuZGxlcnModHJ1ZSk7XHJcblxyXG5cdFx0Ly8gRGVmaW5lIGEgcHVibGljIEFQSSB0byBiZSByZXR1cm5lZCBhdCB0aGUgYm90dG9tIC0gdGhpcyBpcyB0aGUgcHVibGljLWZhY2luZyBpbnRlcmZhY2UuXHJcblx0XHRfcHVibGljU2VsZiA9IHtcclxuXHRcdFx0ZGVzdHJveTogZGVzdHJveSxcclxuXHRcdFx0c2V0U25hcFNpemU6IHNldFNuYXBTaXplLFxyXG5cdFx0XHRzY3JvbGxUbzogc2Nyb2xsVG8sXHJcblx0XHRcdHNjcm9sbEJ5OiBzY3JvbGxCeSxcclxuXHRcdFx0dXBkYXRlRGltZW5zaW9uczogdXBkYXRlRGltZW5zaW9ucyxcclxuXHRcdFx0YWRkRXZlbnRMaXN0ZW5lcjogYWRkRXZlbnRMaXN0ZW5lcixcclxuXHRcdFx0cmVtb3ZlRXZlbnRMaXN0ZW5lcjogcmVtb3ZlRXZlbnRMaXN0ZW5lclxyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0aWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKSB7XHJcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKF9wdWJsaWNTZWxmLCB7XHJcblx0XHRcdFx0J3Njcm9sbEhlaWdodCc6IHtcclxuXHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBfbWV0cmljcy5jb250ZW50Lnk7IH0sXHJcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRocm93IG5ldyBTeW50YXhFcnJvcignc2Nyb2xsSGVpZ2h0IGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQnc2Nyb2xsTGVmdCc6IHtcclxuXHRcdFx0XHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiAtX2xhc3RTY3JvbGxQb3NpdGlvbi54OyB9LFxyXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBzY3JvbGxUbyh2YWx1ZSwgZmFsc2UsIGZhbHNlKTsgcmV0dXJuIC1fbGFzdFNjcm9sbFBvc2l0aW9uLng7IH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdCdzY3JvbGxUb3AnOiB7XHJcblx0XHRcdFx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gLV9sYXN0U2Nyb2xsUG9zaXRpb24ueTsgfSxcclxuXHRcdFx0XHRcdHNldDogZnVuY3Rpb24odmFsdWUpIHsgc2Nyb2xsVG8oZmFsc2UsIHZhbHVlLCBmYWxzZSk7IHJldHVybiAtX2xhc3RTY3JvbGxQb3NpdGlvbi55OyB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQnc2Nyb2xsV2lkdGgnOiB7XHJcblx0XHRcdFx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gX21ldHJpY3MuY29udGVudC54OyB9LFxyXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ3Njcm9sbFdpZHRoIGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQnc2VnbWVudENvdW50Jzoge1xyXG5cdFx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHsgeDogTmFOLCB5OiBOYU4gfTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRcdHg6IE1hdGguY2VpbChfbWV0cmljcy5jb250ZW50LnggLyBfc25hcEdyaWRTaXplLngpLFxyXG5cdFx0XHRcdFx0XHRcdHk6IE1hdGguY2VpbChfbWV0cmljcy5jb250ZW50LnkgLyBfc25hcEdyaWRTaXplLnkpXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ3NlZ21lbnRDb3VudCBpcyBjdXJyZW50bHkgcmVhZC1vbmx5IC0gaWdub3JpbmcgJyArIHZhbHVlKTsgfVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0J2N1cnJlbnRTZWdtZW50Jzoge1xyXG5cdFx0XHRcdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgeDogX2FjdGl2ZVNlZ21lbnQueCwgeTogX2FjdGl2ZVNlZ21lbnQueSB9OyB9LFxyXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2N1cnJlbnRTZWdtZW50IGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHQnY29udGVudENvbnRhaW5lck5vZGUnOiB7XHJcblx0XHRcdFx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gX2NvbnRlbnRQYXJlbnROb2RlOyB9LFxyXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2NvbnRlbnRDb250YWluZXJOb2RlIGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdC8vIFJldHVybiB0aGUgcHVibGljIGludGVyZmFjZS5cclxuXHRcdHJldHVybiBfcHVibGljU2VsZjtcclxuXHR9O1xyXG5cclxuXHJcblx0LyogICAgICAgICAgUHJvdG90eXBlIEZ1bmN0aW9ucyBhbmQgUHJvcGVydGllcyAgICAgICAgICAgKi9cclxuXHJcblx0LyoqXHJcblx0ICogVGhlIEhUTUwgdG8gcHJlcGVuZCB0byB0aGUgc2Nyb2xsYWJsZSBjb250ZW50IHRvIHdyYXAgaXQuIFVzZWQgaW50ZXJuYWxseSxcclxuXHQgKiBhbmQgbWF5IGJlIHVzZWQgdG8gcHJlLXdyYXAgc2Nyb2xsYWJsZSBjb250ZW50LiAgQXhlcyBjYW4gb3B0aW9uYWxseVxyXG5cdCAqIGJlIGV4Y2x1ZGVkIGZvciBzcGVlZCBpbXByb3ZlbWVudHMuXHJcblx0ICovXHJcblx0RlRTY3JvbGxlci5wcm90b3R5cGUuZ2V0UHJlcGVuZGVkSFRNTCA9IGZ1bmN0aW9uIChleGNsdWRlWEF4aXMsIGV4Y2x1ZGVZQXhpcywgaHdBY2NlbGVyYXRpb25DbGFzcykge1xyXG5cdFx0aWYgKCFod0FjY2VsZXJhdGlvbkNsYXNzKSB7XHJcblx0XHRcdGlmICh0eXBlb2YgRlRTY3JvbGxlck9wdGlvbnMgPT09ICdvYmplY3QnICYmIEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcclxuXHRcdFx0XHRod0FjY2VsZXJhdGlvbkNsYXNzID0gRlRTY3JvbGxlck9wdGlvbnMuaHdBY2NlbGVyYXRpb25DbGFzcztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRod0FjY2VsZXJhdGlvbkNsYXNzID0gJ2Z0c2Nyb2xsZXJfaHdhY2NlbGVyYXRlZCc7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR2YXIgb3V0cHV0ID0gJzxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX2NvbnRhaW5lclwiPic7XHJcblx0XHRpZiAoIWV4Y2x1ZGVYQXhpcykge1xyXG5cdFx0XHRvdXRwdXQgKz0gJzxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3ggJyArIGh3QWNjZWxlcmF0aW9uQ2xhc3MgKyAnXCI+JztcclxuXHRcdH1cclxuXHRcdGlmICghZXhjbHVkZVlBeGlzKSB7XHJcblx0XHRcdG91dHB1dCArPSAnPGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfeSAnICsgaHdBY2NlbGVyYXRpb25DbGFzcyArICdcIj4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvdXRwdXQ7XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIEhUTUwgdG8gYXBwZW5kIHRvIHRoZSBzY3JvbGxhYmxlIGNvbnRlbnQgdG8gd3JhcCBpdDsgYWdhaW4sIHVzZWQgaW50ZXJuYWxseSxcclxuXHQgKiBhbmQgbWF5IGJlIHVzZWQgdG8gcHJlLXdyYXAgc2Nyb2xsYWJsZSBjb250ZW50LlxyXG5cdCAqL1xyXG5cdEZUU2Nyb2xsZXIucHJvdG90eXBlLmdldEFwcGVuZGVkSFRNTCA9IGZ1bmN0aW9uIChleGNsdWRlWEF4aXMsIGV4Y2x1ZGVZQXhpcywgaHdBY2NlbGVyYXRpb25DbGFzcywgc2Nyb2xsYmFycykge1xyXG5cdFx0aWYgKCFod0FjY2VsZXJhdGlvbkNsYXNzKSB7XHJcblx0XHRcdGlmICh0eXBlb2YgRlRTY3JvbGxlck9wdGlvbnMgPT09ICdvYmplY3QnICYmIEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcclxuXHRcdFx0XHRod0FjY2VsZXJhdGlvbkNsYXNzID0gRlRTY3JvbGxlck9wdGlvbnMuaHdBY2NlbGVyYXRpb25DbGFzcztcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRod0FjY2VsZXJhdGlvbkNsYXNzID0gJ2Z0c2Nyb2xsZXJfaHdhY2NlbGVyYXRlZCc7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR2YXIgb3V0cHV0ID0gJyc7XHJcblx0XHRpZiAoIWV4Y2x1ZGVYQXhpcykge1xyXG5cdFx0XHRvdXRwdXQgKz0gJzwvZGl2Pic7XHJcblx0XHR9XHJcblx0XHRpZiAoIWV4Y2x1ZGVZQXhpcykge1xyXG5cdFx0XHRvdXRwdXQgKz0gJzwvZGl2Pic7XHJcblx0XHR9XHJcblx0XHRpZiAoc2Nyb2xsYmFycykge1xyXG5cdFx0XHRpZiAoIWV4Y2x1ZGVYQXhpcykge1xyXG5cdFx0XHRcdG91dHB1dCArPSAnPGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfc2Nyb2xsYmFyIGZ0c2Nyb2xsZXJfc2Nyb2xsYmFyeCAnICsgaHdBY2NlbGVyYXRpb25DbGFzcyArICdcIj48ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl9zY3JvbGxiYXJpbm5lclwiPjwvZGl2PjwvZGl2Pic7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFleGNsdWRlWUF4aXMpIHtcclxuXHRcdFx0XHRvdXRwdXQgKz0gJzxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3Njcm9sbGJhciBmdHNjcm9sbGVyX3Njcm9sbGJhcnkgJyArIGh3QWNjZWxlcmF0aW9uQ2xhc3MgKyAnXCI+PGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfc2Nyb2xsYmFyaW5uZXJcIj48L2Rpdj48L2Rpdj4nO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRvdXRwdXQgKz0gJzwvZGl2Pic7XHJcblxyXG5cdFx0cmV0dXJuIG91dHB1dDtcclxuXHR9O1xyXG59KCkpO1xyXG5cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRmdW5jdGlvbiBfdGhyb3dSYW5nZUVycm9yKG5hbWUsIHZhbHVlKSB7XHJcblx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCInICsgbmFtZSArICdcIiBtdXN0IGJlIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMS4gJyArICdHb3QgJyArIHZhbHVlICsgJyBpbnN0ZWFkLicpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVwcmVzZW50cyBhIHR3by1kaW1lbnNpb25hbCBjdWJpYyBiZXppZXIgY3VydmUgd2l0aCB0aGUgc3RhcnRpbmdcclxuXHQgKiBwb2ludCAoMCwgMCkgYW5kIHRoZSBlbmQgcG9pbnQgKDEsIDEpLiBUaGUgdHdvIGNvbnRyb2wgcG9pbnRzIHAxIGFuZCBwMlxyXG5cdCAqIGhhdmUgeCBhbmQgeSBjb29yZGluYXRlcyBiZXR3ZWVuIDAgYW5kIDEuXHJcblx0ICpcclxuXHQgKiBUaGlzIHR5cGUgb2YgYmV6aWVyIGN1cnZlcyBjYW4gYmUgdXNlZCBhcyBDU1MgdHJhbnNmb3JtIHRpbWluZyBmdW5jdGlvbnMuXHJcblx0ICovXHJcblx0Q3ViaWNCZXppZXIgPSBmdW5jdGlvbiAocDF4LCBwMXksIHAyeCwgcDJ5KSB7XHJcblx0XHRpZiAoIShwMXggPj0gMCAmJiBwMXggPD0gMSkpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigncDF4JywgcDF4KTtcclxuXHRcdH1cclxuXHRcdGlmICghKHAxeSA+PSAwICYmIHAxeSA8PSAxKSkge1xyXG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCdwMXknLCBwMXkpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCEocDJ4ID49IDAgJiYgcDJ4IDw9IDEpKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3AyeCcsIHAyeCk7XHJcblx0XHR9XHJcblx0XHRpZiAoIShwMnkgPj0gMCAmJiBwMnkgPD0gMSkpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigncDJ5JywgcDJ5KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb250cm9sIHBvaW50c1xyXG5cdFx0dGhpcy5fcDEgPSB7IHg6IHAxeCwgeTogcDF5IH07XHJcblx0XHR0aGlzLl9wMiA9IHsgeDogcDJ4LCB5OiBwMnkgfTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuX2dldENvb3JkaW5hdGVGb3JUID0gZnVuY3Rpb24gKHQsIHAxLCBwMikge1xyXG5cdFx0dmFyIGMgPSAzICogcDEsXHJcblx0XHRcdGIgPSAzICogKHAyIC0gcDEpIC0gYyxcclxuXHRcdFx0YSA9IDEgLSBjIC0gYjtcclxuXHJcblx0XHRyZXR1cm4gKChhICogdCArIGIpICogdCArIGMpICogdDtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuX2dldENvb3JkaW5hdGVEZXJpdmF0ZUZvclQgPSBmdW5jdGlvbiAodCwgcDEsIHAyKSB7XHJcblx0XHR2YXIgYyA9IDMgKiBwMSxcclxuXHRcdFx0YiA9IDMgKiAocDIgLSBwMSkgLSBjLFxyXG5cdFx0XHRhID0gMSAtIGMgLSBiO1xyXG5cclxuXHRcdHJldHVybiAoMyAqIGEgKiB0ICsgMiAqIGIpICogdCArIGM7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLl9nZXRURm9yQ29vcmRpbmF0ZSA9IGZ1bmN0aW9uIChjLCBwMSwgcDIsIGVwc2lsb24pIHtcclxuXHRcdGlmICghaXNGaW5pdGUoZXBzaWxvbikgfHwgZXBzaWxvbiA8PSAwKSB7XHJcblx0XHRcdHRocm93IG5ldyBSYW5nZUVycm9yKCdcImVwc2lsb25cIiBtdXN0IGJlIGEgbnVtYmVyIGdyZWF0ZXIgdGhhbiAwLicpO1xyXG5cdFx0fVxyXG5cdFx0dmFyIHQyLCBpLCBjMiwgZDI7XHJcblxyXG5cdFx0Ly8gRmlyc3QgdHJ5IGEgZmV3IGl0ZXJhdGlvbnMgb2YgTmV3dG9uJ3MgbWV0aG9kIC0tIG5vcm1hbGx5IHZlcnkgZmFzdC5cclxuXHRcdGZvciAodDIgPSBjLCBpID0gMDsgaSA8IDg7IGkgPSBpICsgMSkge1xyXG5cdFx0XHRjMiA9IHRoaXMuX2dldENvb3JkaW5hdGVGb3JUKHQyLCBwMSwgcDIpIC0gYztcclxuXHRcdFx0aWYgKE1hdGguYWJzKGMyKSA8IGVwc2lsb24pIHtcclxuXHRcdFx0XHRyZXR1cm4gdDI7XHJcblx0XHRcdH1cclxuXHRcdFx0ZDIgPSB0aGlzLl9nZXRDb29yZGluYXRlRGVyaXZhdGVGb3JUKHQyLCBwMSwgcDIpO1xyXG5cdFx0XHRpZiAoTWF0aC5hYnMoZDIpIDwgMWUtNikge1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHRcdHQyID0gdDIgLSBjMiAvIGQyO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhbGwgYmFjayB0byB0aGUgYmlzZWN0aW9uIG1ldGhvZCBmb3IgcmVsaWFiaWxpdHkuXHJcblx0XHR0MiA9IGM7XHJcblx0XHR2YXIgdDAgPSAwLFxyXG5cdFx0XHR0MSA9IDE7XHJcblxyXG5cdFx0aWYgKHQyIDwgdDApIHtcclxuXHRcdFx0cmV0dXJuIHQwO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHQyID4gdDEpIHtcclxuXHRcdFx0cmV0dXJuIHQxO1xyXG5cdFx0fVxyXG5cclxuXHRcdHdoaWxlICh0MCA8IHQxKSB7XHJcblx0XHRcdGMyID0gdGhpcy5fZ2V0Q29vcmRpbmF0ZUZvclQodDIsIHAxLCBwMik7XHJcblx0XHRcdGlmIChNYXRoLmFicyhjMiAtIGMpIDwgZXBzaWxvbikge1xyXG5cdFx0XHRcdHJldHVybiB0MjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoYyA+IGMyKSB7XHJcblx0XHRcdFx0dDAgPSB0MjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0MSA9IHQyO1xyXG5cdFx0XHR9XHJcblx0XHRcdHQyID0gKHQxIC0gdDApICogMC41ICsgdDA7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFpbHVyZS5cclxuXHRcdHJldHVybiB0MjtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDb21wdXRlcyB0aGUgcG9pbnQgZm9yIGEgZ2l2ZW4gdCB2YWx1ZS5cclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB0XHJcblx0ICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB4IGFuZCB5IHByb3BlcnRpZXNcclxuXHQgKi9cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZ2V0UG9pbnRGb3JUID0gZnVuY3Rpb24gKHQpIHtcclxuXHJcblx0XHQvLyBTcGVjaWFsIGNhc2VzOiBzdGFydGluZyBhbmQgZW5kaW5nIHBvaW50c1xyXG5cdFx0aWYgKHQgPT09IDAgfHwgdCA9PT0gMSkge1xyXG5cdFx0XHRyZXR1cm4geyB4OiB0LCB5OiB0IH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgZm9yIGNvcnJlY3QgdCB2YWx1ZSAobXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDEpXHJcblx0XHRpZiAodCA8IDAgfHwgdCA+IDEpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigndCcsIHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHg6IHRoaXMuX2dldENvb3JkaW5hdGVGb3JUKHQsIHRoaXMuX3AxLngsIHRoaXMuX3AyLngpLFxyXG5cdFx0XHR5OiB0aGlzLl9nZXRDb29yZGluYXRlRm9yVCh0LCB0aGlzLl9wMS55LCB0aGlzLl9wMi55KVxyXG5cdFx0fTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZ2V0VEZvclggPSBmdW5jdGlvbiAoeCwgZXBzaWxvbikge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2dldFRGb3JDb29yZGluYXRlKHgsIHRoaXMuX3AxLngsIHRoaXMuX3AyLngsIGVwc2lsb24pO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5nZXRURm9yWSA9IGZ1bmN0aW9uICh5LCBlcHNpbG9uKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fZ2V0VEZvckNvb3JkaW5hdGUoeSwgdGhpcy5fcDEueSwgdGhpcy5fcDIueSwgZXBzaWxvbik7XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ29tcHV0ZXMgYXV4aWxpYXJ5IHBvaW50cyB1c2luZyBEZSBDYXN0ZWxqYXUncyBhbGdvcml0aG0uXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge251bWJlcn0gdCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwIGFuZCBsb3dlciB0aGFuIDEuXHJcblx0ICogQHJldHVybnMge09iamVjdH0gd2l0aCBtZW1iZXJzIGkwLCBpMSwgaTIgKGZpcnN0IGl0ZXJhdGlvbiksXHJcblx0ICogICAgajEsIGoyIChzZWNvbmQgaXRlcmF0aW9uKSBhbmQgayAodGhlIGV4YWN0IHBvaW50IGZvciB0KVxyXG5cdCAqL1xyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5fZ2V0QXV4UG9pbnRzID0gZnVuY3Rpb24gKHQpIHtcclxuXHRcdGlmICh0IDw9IDAgfHwgdCA+PSAxKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3QnLCB0KTtcclxuXHRcdH1cclxuXHJcblxyXG5cdFx0LyogRmlyc3Qgc2VyaWVzIG9mIGF1eGlsaWFyeSBwb2ludHMgKi9cclxuXHJcblx0XHQvLyBGaXJzdCBjb250cm9sIHBvaW50IG9mIHRoZSBsZWZ0IGN1cnZlXHJcblx0XHR2YXIgaTAgPSB7XHJcblx0XHRcdFx0eDogdCAqIHRoaXMuX3AxLngsXHJcblx0XHRcdFx0eTogdCAqIHRoaXMuX3AxLnlcclxuXHRcdFx0fSxcclxuXHRcdFx0aTEgPSB7XHJcblx0XHRcdFx0eDogdGhpcy5fcDEueCArIHQgKiAodGhpcy5fcDIueCAtIHRoaXMuX3AxLngpLFxyXG5cdFx0XHRcdHk6IHRoaXMuX3AxLnkgKyB0ICogKHRoaXMuX3AyLnkgLSB0aGlzLl9wMS55KVxyXG5cdFx0XHR9LFxyXG5cclxuXHRcdFx0Ly8gU2Vjb25kIGNvbnRyb2wgcG9pbnQgb2YgdGhlIHJpZ2h0IGN1cnZlXHJcblx0XHRcdGkyICA9IHtcclxuXHRcdFx0XHR4OiB0aGlzLl9wMi54ICsgdCAqICgxIC0gdGhpcy5fcDIueCksXHJcblx0XHRcdFx0eTogdGhpcy5fcDIueSArIHQgKiAoMSAtIHRoaXMuX3AyLnkpXHJcblx0XHRcdH07XHJcblxyXG5cclxuXHRcdC8qIFNlY29uZCBzZXJpZXMgb2YgYXV4aWxpYXJ5IHBvaW50cyAqL1xyXG5cclxuXHRcdC8vIFNlY29uZCBjb250cm9sIHBvaW50IG9mIHRoZSBsZWZ0IGN1cnZlXHJcblx0XHR2YXIgajAgPSB7XHJcblx0XHRcdFx0eDogaTAueCArIHQgKiAoaTEueCAtIGkwLngpLFxyXG5cdFx0XHRcdHk6IGkwLnkgKyB0ICogKGkxLnkgLSBpMC55KVxyXG5cdFx0XHR9LFxyXG5cclxuXHRcdFx0Ly8gRmlyc3QgY29udHJvbCBwb2ludCBvZiB0aGUgcmlnaHQgY3VydmVcclxuXHRcdFx0ajEgPSB7XHJcblx0XHRcdFx0eDogaTEueCArIHQgKiAoaTIueCAtIGkxLngpLFxyXG5cdFx0XHRcdHk6IGkxLnkgKyB0ICogKGkyLnkgLSBpMS55KVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdC8vIFRoZSBkaXZpc2lvbiBwb2ludCAoZW5kaW5nIHBvaW50IG9mIGxlZnQgY3VydmUsIHN0YXJ0aW5nIHBvaW50IG9mIHJpZ2h0IGN1cnZlKVxyXG5cdFx0dmFyIGsgPSB7XHJcblx0XHRcdFx0eDogajAueCArIHQgKiAoajEueCAtIGowLngpLFxyXG5cdFx0XHRcdHk6IGowLnkgKyB0ICogKGoxLnkgLSBqMC55KVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGkwOiBpMCxcclxuXHRcdFx0aTE6IGkxLFxyXG5cdFx0XHRpMjogaTIsXHJcblx0XHRcdGowOiBqMCxcclxuXHRcdFx0ajE6IGoxLFxyXG5cdFx0XHRrOiBrXHJcblx0XHR9O1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIERpdmlkZXMgdGhlIGJlemllciBjdXJ2ZSBpbnRvIHR3byBiZXppZXIgZnVuY3Rpb25zLlxyXG5cdCAqXHJcblx0ICogRGUgQ2FzdGVsamF1J3MgYWxnb3JpdGhtIGlzIHVzZWQgdG8gY29tcHV0ZSB0aGUgbmV3IHN0YXJ0aW5nLCBlbmRpbmcsIGFuZFxyXG5cdCAqIGNvbnRyb2wgcG9pbnRzLlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtudW1iZXJ9IHQgbXVzdCBiZSBncmVhdGVyIHRoYW4gMCBhbmQgbG93ZXIgdGhhbiAxLlxyXG5cdCAqICAgICB0ID09PSAxIG9yIHQgPT09IDAgYXJlIHRoZSBzdGFydGluZy9lbmRpbmcgcG9pbnRzIG9mIHRoZSBjdXJ2ZSwgc28gbm9cclxuXHQgKiAgICAgZGl2aXNpb24gaXMgbmVlZGVkLlxyXG5cdCAqXHJcblx0ICogQHJldHVybnMge0N1YmljQmV6aWVyW119IFJldHVybnMgYW4gYXJyYXkgY29udGFpbmluZyB0d28gYmV6aWVyIGN1cnZlc1xyXG5cdCAqICAgICB0byB0aGUgbGVmdCBhbmQgdGhlIHJpZ2h0IG9mIHQuXHJcblx0ICovXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmRpdmlkZUF0VCA9IGZ1bmN0aW9uICh0KSB7XHJcblx0XHRpZiAodCA8IDAgfHwgdCA+IDEpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigndCcsIHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNwZWNpYWwgY2FzZXMgdCA9IDAsIHQgPSAxOiBDdXJ2ZSBjYW4gYmUgY2xvbmVkIGZvciBvbmUgc2lkZSwgdGhlIG90aGVyXHJcblx0XHQvLyBzaWRlIGlzIGEgbGluZWFyIGN1cnZlICh3aXRoIGR1cmF0aW9uIDApXHJcblx0XHRpZiAodCA9PT0gMCB8fCB0ID09PSAxKSB7XHJcblx0XHRcdHZhciBjdXJ2ZXMgPSBbXTtcclxuXHRcdFx0Y3VydmVzW3RdID0gQ3ViaWNCZXppZXIubGluZWFyKCk7XHJcblx0XHRcdGN1cnZlc1sxIC0gdF0gPSB0aGlzLmNsb25lKCk7XHJcblx0XHRcdHJldHVybiBjdXJ2ZXM7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGxlZnQgPSB7fSxcclxuXHRcdFx0cmlnaHQgPSB7fSxcclxuXHRcdFx0cG9pbnRzID0gdGhpcy5fZ2V0QXV4UG9pbnRzKHQpO1xyXG5cclxuXHRcdHZhciBpMCA9IHBvaW50cy5pMCxcclxuXHRcdFx0aTIgPSBwb2ludHMuaTIsXHJcblx0XHRcdGowID0gcG9pbnRzLmowLFxyXG5cdFx0XHRqMSA9IHBvaW50cy5qMSxcclxuXHRcdFx0ayA9IHBvaW50cy5rO1xyXG5cclxuXHRcdC8vIE5vcm1hbGl6ZSBkZXJpdmVkIHBvaW50cywgc28gdGhhdCB0aGUgbmV3IGN1cnZlcyBzdGFydGluZy9lbmRpbmcgcG9pbnRcclxuXHRcdC8vIGNvb3JkaW5hdGVzIGFyZSAoMCwgMCkgcmVzcGVjdGl2ZWx5ICgxLCAxKVxyXG5cdFx0dmFyIGZhY3RvclggPSBrLngsXHJcblx0XHRcdGZhY3RvclkgPSBrLnk7XHJcblxyXG5cdFx0bGVmdC5wMSA9IHtcclxuXHRcdFx0eDogaTAueCAvIGZhY3RvclgsXHJcblx0XHRcdHk6IGkwLnkgLyBmYWN0b3JZXHJcblx0XHR9O1xyXG5cdFx0bGVmdC5wMiA9IHtcclxuXHRcdFx0eDogajAueCAvIGZhY3RvclgsXHJcblx0XHRcdHk6IGowLnkgLyBmYWN0b3JZXHJcblx0XHR9O1xyXG5cclxuXHRcdHJpZ2h0LnAxID0ge1xyXG5cdFx0XHR4OiAoajEueCAtIGZhY3RvclgpIC8gKDEgLSBmYWN0b3JYKSxcclxuXHRcdFx0eTogKGoxLnkgLSBmYWN0b3JZKSAvICgxIC0gZmFjdG9yWSlcclxuXHRcdH07XHJcblxyXG5cdFx0cmlnaHQucDIgPSB7XHJcblx0XHRcdHg6IChpMi54IC0gZmFjdG9yWCkgLyAoMSAtIGZhY3RvclgpLFxyXG5cdFx0XHR5OiAoaTIueSAtIGZhY3RvclkpIC8gKDEgLSBmYWN0b3JZKVxyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHRuZXcgQ3ViaWNCZXppZXIobGVmdC5wMS54LCBsZWZ0LnAxLnksIGxlZnQucDIueCwgbGVmdC5wMi55KSxcclxuXHRcdFx0bmV3IEN1YmljQmV6aWVyKHJpZ2h0LnAxLngsIHJpZ2h0LnAxLnksIHJpZ2h0LnAyLngsIHJpZ2h0LnAyLnkpXHJcblx0XHRdO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5kaXZpZGVBdFggPSBmdW5jdGlvbiAoeCwgZXBzaWxvbikge1xyXG5cdFx0aWYgKHggPCAwIHx8IHggPiAxKSB7XHJcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3gnLCB4KTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgdCA9IHRoaXMuZ2V0VEZvclgoeCwgZXBzaWxvbik7XHJcblx0XHRyZXR1cm4gdGhpcy5kaXZpZGVBdFQodCk7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmRpdmlkZUF0WSA9IGZ1bmN0aW9uICh5LCBlcHNpbG9uKSB7XHJcblx0XHRpZiAoeSA8IDAgfHwgeSA+IDEpIHtcclxuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigneScsIHkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciB0ID0gdGhpcy5nZXRURm9yWSh5LCBlcHNpbG9uKTtcclxuXHRcdHJldHVybiB0aGlzLmRpdmlkZUF0VCh0KTtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKHRoaXMuX3AxLngsIHRoaXMuX3AxLnksIHRoaXMuX3AyLngsIHRoaXMuX3AyLnkpO1xyXG5cdH07XHJcblxyXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBcImN1YmljLWJlemllcihcIiArIFtcclxuXHRcdFx0dGhpcy5fcDEueCxcclxuXHRcdFx0dGhpcy5fcDEueSxcclxuXHRcdFx0dGhpcy5fcDIueCxcclxuXHRcdFx0dGhpcy5fcDIueVxyXG5cdFx0XS5qb2luKFwiLCBcIikgKyBcIilcIjtcclxuXHR9O1xyXG5cclxuXHRDdWJpY0Jlemllci5saW5lYXIgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKCk7XHJcblx0fTtcclxuXHJcblx0Q3ViaWNCZXppZXIuZWFzZSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBuZXcgQ3ViaWNCZXppZXIoMC4yNSwgMC4xLCAwLjI1LCAxLjApO1xyXG5cdH07XHJcblx0Q3ViaWNCZXppZXIubGluZWFyID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigwLjAsIDAuMCwgMS4wLCAxLjApO1xyXG5cdH07XHJcblx0Q3ViaWNCZXppZXIuZWFzZUluID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigwLjQyLCAwLCAxLjAsIDEuMCk7XHJcblx0fTtcclxuXHRDdWJpY0Jlemllci5lYXNlT3V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigwLCAwLCAwLjU4LCAxLjApO1xyXG5cdH07XHJcblx0Q3ViaWNCZXppZXIuZWFzZUluT3V0ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigwLjQyLCAwLCAwLjU4LCAxLjApO1xyXG5cdH07XHJcbn0oKSk7XHJcblxyXG4vLyBJZiBhIENvbW1vbkpTIGVudmlyb25tZW50IGlzIHByZXNlbnQsIGFkZCBvdXIgZXhwb3J0czsgbWFrZSB0aGUgY2hlY2sgaW4gYSBqc2xpbnQtY29tcGF0aWJsZSBtZXRob2QuXHJcbnZhciBtb2R1bGU7XHJcbmlmIChtb2R1bGUgIT09IHVuZGVmaW5lZCAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZG9tTm9kZSwgb3B0aW9ucykge1xyXG5cdFx0J3VzZSBzdHJpY3QnO1xyXG5cdFx0cmV0dXJuIG5ldyBGVFNjcm9sbGVyKGRvbU5vZGUsIG9wdGlvbnMpO1xyXG5cdH07XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzLkZUU2Nyb2xsZXIgPSBGVFNjcm9sbGVyO1xyXG5cdG1vZHVsZS5leHBvcnRzLkN1YmljQmV6aWVyID0gQ3ViaWNCZXppZXI7XHJcbn0iLCIvKmdsb2JhbCByZXF1aXJlLCBtb2R1bGUqL1xuXG52YXIgZ2FsbGVyeURPTSA9IHJlcXVpcmUoJy4vZ2FsbGVyeURPTScpLFxuICAgIEZUU2Nyb2xsZXIgPSByZXF1aXJlKCdGVFNjcm9sbGVyJyksXG4gICAgU2ltcGxlU2Nyb2xsZXIgPSByZXF1aXJlKCcuL1NpbXBsZVNjcm9sbGVyJyk7XG5cbmZ1bmN0aW9uIEdhbGxlcnkoY29udGFpbmVyRWwsIGNvbmZpZykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgaWYgKCFkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgdmlld3BvcnRFbCxcbiAgICAgICAgYWxsSXRlbXNFbCxcbiAgICAgICAgaXRlbUVscyxcbiAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXgsXG4gICAgICAgIHNob3duSXRlbUluZGV4LFxuICAgICAgICBkZWJvdW5jZU9uUmVzaXplLFxuICAgICAgICBzY3JvbGxlcixcbiAgICAgICAgZGVib3VuY2VTY3JvbGwsXG4gICAgICAgIHByZXZDb250cm9sRGl2LFxuICAgICAgICBuZXh0Q29udHJvbERpdixcbiAgICAgICAgcHJvcGVydHlBdHRyaWJ1dGVNYXAgPSB7XG4gICAgICAgICAgICBjb21wb25lbnQ6IFwiZGF0YS1vLWNvbXBvbmVudFwiLFxuICAgICAgICAgICAgdmVyc2lvbjogXCJkYXRhLW8tdmVyc2lvblwiLFxuICAgICAgICAgICAgc3luY0lEOiBcImRhdGEtby1nYWxsZXJ5LXN5bmNpZFwiLFxuICAgICAgICAgICAgbXVsdGlwbGVJdGVtc1BlclBhZ2U6IFwiZGF0YS1vLWdhbGxlcnktbXVsdGlwbGVpdGVtc3BlcnBhZ2VcIixcbiAgICAgICAgICAgIHRvdWNoOiBcImRhdGEtby1nYWxsZXJ5LXRvdWNoXCIsXG4gICAgICAgICAgICBjYXB0aW9uczogXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9uc1wiLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWluaGVpZ2h0XCIsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiBcImRhdGEtby1nYWxsZXJ5LWNhcHRpb25tYXhoZWlnaHRcIixcbiAgICAgICAgICAgIHdpbmRvd1Jlc2l6ZTogXCJkYXRhLW8tZ2FsbGVyeS13aW5kb3dyZXNpemVcIlxuICAgICAgICB9LFxuICAgICAgICBkZWZhdWx0Q29uZmlnID0ge1xuICAgICAgICAgICAgY29tcG9uZW50OiBcIm8tZ2FsbGVyeVwiLFxuICAgICAgICAgICAgdmVyc2lvbjogXCIwLjAuMFwiLFxuICAgICAgICAgICAgbXVsdGlwbGVJdGVtc1BlclBhZ2U6IGZhbHNlLFxuICAgICAgICAgICAgY2FwdGlvbnM6IHRydWUsXG4gICAgICAgICAgICBjYXB0aW9uTWluSGVpZ2h0OiAyNCxcbiAgICAgICAgICAgIGNhcHRpb25NYXhIZWlnaHQ6IDUyLFxuICAgICAgICAgICAgdG91Y2g6IGZhbHNlLFxuICAgICAgICAgICAgc3luY0lEOiBcIm8tZ2FsbGVyeS1cIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgd2luZG93UmVzaXplOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGFsbG93VHJhbnNpdGlvbnMgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIHN1cHBvcnRzQ3NzVHJhbnNmb3JtcygpIHtcbiAgICAgICAgdmFyIGh0bWxFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdodG1sJylbMF07XG4gICAgICAgIHJldHVybiBnYWxsZXJ5RE9NLmhhc0NsYXNzKGh0bWxFbCwgXCJjc3N0cmFuc2Zvcm1zXCIpIHx8IGdhbGxlcnlET00uaGFzQ2xhc3MoaHRtbEVsLCBcImNzc3RyYW5zZm9ybXMzZFwiKSB8fCBnYWxsZXJ5RE9NLmhhc0NsYXNzKGh0bWxFbCwgXCJjc3N0cmFuc2l0aW9uc1wiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RhdGFTb3VyY2UoKSB7XG4gICAgICAgIHJldHVybiAoY29uZmlnLml0ZW1zICYmIGNvbmZpZy5pdGVtcy5sZW5ndGggPiAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRXaWR0aHMoKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgICAgbCxcbiAgICAgICAgICAgIHRvdGFsV2lkdGggPSAwLFxuICAgICAgICAgICAgaXRlbVdpZHRoID0gY29udGFpbmVyRWwuY2xpZW50V2lkdGg7XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIGl0ZW1XaWR0aCA9IHBhcnNlSW50KGl0ZW1FbHNbc2VsZWN0ZWRJdGVtSW5kZXhdLmNsaWVudFdpZHRoLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtRWxzW2ldLnN0eWxlLndpZHRoID0gaXRlbVdpZHRoICsgXCJweFwiO1xuICAgICAgICAgICAgdG90YWxXaWR0aCArPSBpdGVtV2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgYWxsSXRlbXNFbC5zdHlsZS53aWR0aCA9IHRvdGFsV2lkdGggKyBcInB4XCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNWYWxpZEl0ZW0obikge1xuICAgICAgICByZXR1cm4gKHR5cGVvZiBuID09PSBcIm51bWJlclwiICYmIG4gPiAtMSAmJiBuIDwgaXRlbUVscy5sZW5ndGgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdGVkSXRlbSgpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkSXRlbSA9IDAsIGMsIGw7XG4gICAgICAgIGZvciAoYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgaWYgKGdhbGxlcnlET00uaGFzQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gYztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRJdGVtO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFVpQ29udHJvbHMoKSB7XG4gICAgICAgIHByZXZDb250cm9sRGl2ID0gZ2FsbGVyeURPTS5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIFwiXCIsIFwiby1nYWxsZXJ5X19jb250cm9sIG8tZ2FsbGVyeV9fY29udHJvbC0tcHJldlwiKTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYgPSBnYWxsZXJ5RE9NLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1uZXh0XCIpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudChwcmV2Q29udHJvbERpdiwgXCJjbGlja1wiLCBwcmV2KTtcbiAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudChuZXh0Q29udHJvbERpdiwgXCJjbGlja1wiLCBuZXh0KTtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudCh2aWV3cG9ydEVsLCBcImNsaWNrXCIsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2xpY2tlZEl0ZW1OdW0gPSBnYWxsZXJ5RE9NLmdldEVsZW1lbnRJbmRleChnYWxsZXJ5RE9NLmdldENsb3Nlc3QoZXZ0LnNyY0VsZW1lbnQsIFwiby1nYWxsZXJ5X19pdGVtXCIpKTtcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKGNsaWNrZWRJdGVtTnVtLCB0cnVlLCBcInVzZXJcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUNvbnRyb2xTdGF0ZXMoKSB7XG4gICAgICAgIGlmIChzY3JvbGxlci5zY3JvbGxMZWZ0ID4gMCkge1xuICAgICAgICAgICAgZ2FsbGVyeURPTS5hZGRDbGFzcyhwcmV2Q29udHJvbERpdiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wtLXNob3dcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnYWxsZXJ5RE9NLnJlbW92ZUNsYXNzKHByZXZDb250cm9sRGl2LCBcIm8tZ2FsbGVyeV9fY29udHJvbC0tc2hvd1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2Nyb2xsZXIuc2Nyb2xsTGVmdCA8IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKG5leHRDb250cm9sRGl2LCBcIm8tZ2FsbGVyeV9fY29udHJvbC0tc2hvd1wiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdhbGxlcnlET00ucmVtb3ZlQ2xhc3MobmV4dENvbnRyb2xEaXYsIFwiby1nYWxsZXJ5X19jb250cm9sLS1zaG93XCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0Q2FwdGlvblNpemVzKCkge1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbUVsID0gaXRlbUVsc1tjXTtcbiAgICAgICAgICAgIGl0ZW1FbC5zdHlsZS5wYWRkaW5nQm90dG9tID0gY29uZmlnLmNhcHRpb25NaW5IZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB2YXIgY2FwdGlvbkVsID0gaXRlbUVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtX19jYXB0aW9uXCIpO1xuICAgICAgICAgICAgaWYgKGNhcHRpb25FbCkge1xuICAgICAgICAgICAgICAgIGNhcHRpb25FbC5zdHlsZS5taW5IZWlnaHQgPSBjb25maWcuY2FwdGlvbk1pbkhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgICAgICBjYXB0aW9uRWwuc3R5bGUubWF4SGVpZ2h0ID0gY29uZmlnLmNhcHRpb25NYXhIZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChuKSB7XG4gICAgICAgIHZhciBpdGVtTnVtcyA9IChuIGluc3RhbmNlb2YgQXJyYXkpID8gbiA6IFtuXTtcbiAgICAgICAgaWYgKGNvbmZpZy5pdGVtcykge1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtTnVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbU51bSA9IGl0ZW1OdW1zW2NdO1xuICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSXRlbShpdGVtTnVtKSAmJiAhY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBjb25maWcuaXRlbXNbaXRlbU51bV0sIGl0ZW1FbHNbaXRlbU51bV0pO1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzZXRDYXB0aW9uU2l6ZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1dob2xlSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ICsgaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCA8PSByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gKGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsIC0gaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPD0gcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SXRlbXNJblBhZ2VWaWV3KGwsIHIsIHdob2xlKSB7XG4gICAgICAgIHZhciBpdGVtc0luVmlldyA9IFtdLFxuICAgICAgICAgICAgb25seVdob2xlID0gKHR5cGVvZiB3aG9sZSAhPT0gXCJib29sZWFuXCIpID8gdHJ1ZSA6IHdob2xlO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGl0ZW1FbHMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGlmICgob25seVdob2xlICYmIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkgfHwgKCFvbmx5V2hvbGUgJiYgaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtc0luVmlldy5wdXNoKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpdGVtc0luVmlldztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkdhbGxlcnlDdXN0b21FdmVudChldnQpIHtcbiAgICAgICAgaWYgKGV2dC5zcmNFbGVtZW50ICE9PSBjb250YWluZXJFbCAmJiBldnQuc3luY0lEID09PSBjb25maWcuc3luY0lEICYmIGV2dC5vR2FsbGVyeVNvdXJjZSA9PT0gXCJ1c2VyXCIpIHtcbiAgICAgICAgICAgIHNlbGVjdEl0ZW0oZXZ0Lml0ZW1JRCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaXN0ZW5Gb3JTeW5jRXZlbnRzKCkge1xuICAgICAgICBpZiAoZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyaWdnZXJFdmVudChuYW1lLCBkYXRhKSB7XG4gICAgICAgIGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCAmJiBjb250YWluZXJFbC5kaXNwYXRjaEV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudChuYW1lLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICAgIGV2ZW50LnN5bmNJRCA9IGNvbmZpZy5zeW5jSUQ7XG4gICAgICAgICAgICBldmVudC5nYWxsZXJ5ID0gZGF0YS5nYWxsZXJ5O1xuICAgICAgICAgICAgZXZlbnQuaXRlbUlEID0gZGF0YS5pdGVtSUQ7XG4gICAgICAgICAgICBldmVudC5vR2FsbGVyeVNvdXJjZSA9IGRhdGEuc291cmNlO1xuICAgICAgICAgICAgY29udGFpbmVyRWwuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3ZlVmlld3BvcnQobGVmdCkge1xuICAgICAgICBzY3JvbGxlci5zY3JvbGxUbyhsZWZ0LCAwLCAoYWxsb3dUcmFuc2l0aW9ucykgPyB0cnVlIDogMCk7XG4gICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhsZWZ0LCBsZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1MZWZ0KG4pIHtcbiAgICAgICAgbW92ZVZpZXdwb3J0KGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxpZ25JdGVtUmlnaHQobikge1xuICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCAtICh2aWV3cG9ydEVsLmNsaWVudFdpZHRoIC0gaXRlbUVsc1tuXS5jbGllbnRXaWR0aCk7XG4gICAgICAgIG1vdmVWaWV3cG9ydChuZXdTY3JvbGxMZWZ0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBicmluZ0l0ZW1JbnRvVmlldyhuKSB7XG4gICAgICAgIGlmICghaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmlld3BvcnRMID0gc2Nyb2xsZXIuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIHZpZXdwb3J0UiA9IHZpZXdwb3J0TCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICBpdGVtTCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCxcbiAgICAgICAgICAgIGl0ZW1SID0gaXRlbUwgKyBpdGVtRWxzW25dLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoaXRlbUwgPiB2aWV3cG9ydEwgJiYgaXRlbVIgPCB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXRlbUwgPCB2aWV3cG9ydEwpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobik7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbVIgPiB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbVJpZ2h0KG4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0l0ZW0obikge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGJyaW5nSXRlbUludG9WaWV3KG4pO1xuICAgICAgICAgICAgc2hvd25JdGVtSW5kZXggPSBuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZJdGVtKCkge1xuICAgICAgICB2YXIgcHJldiA9IChzaG93bkl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzaG93bkl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNob3dJdGVtKHByZXYpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0SXRlbSgpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2hvd25JdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2hvd25JdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2hvd0l0ZW0obmV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZQYWdlKCkge1xuICAgICAgICBpZiAoc2Nyb2xsZXIuc2Nyb2xsTGVmdCA+IDApIHtcbiAgICAgICAgICAgIHZhciBwcmV2UGFnZVdob2xlSXRlbXMgPSBnZXRJdGVtc0luUGFnZVZpZXcoc2Nyb2xsZXIuc2Nyb2xsTGVmdCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIHNjcm9sbGVyLnNjcm9sbExlZnQpLFxuICAgICAgICAgICAgICAgIHByZXZQYWdlSXRlbSA9IHByZXZQYWdlV2hvbGVJdGVtcy5wb3AoKSB8fCAwO1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQocHJldlBhZ2VJdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0UGFnZSgpIHtcbiAgICAgICAgaWYgKHNjcm9sbGVyLnNjcm9sbExlZnQgPCBhbGxJdGVtc0VsLmNsaWVudFdpZHRoIC0gdmlld3BvcnRFbC5jbGllbnRXaWR0aCkge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3ID0gZ2V0SXRlbXNJblBhZ2VWaWV3KHNjcm9sbGVyLnNjcm9sbExlZnQsIHNjcm9sbGVyLnNjcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSxcbiAgICAgICAgICAgICAgICBsYXN0V2hvbGVJdGVtSW5WaWV3ID0gY3VycmVudFdob2xlSXRlbXNJblZpZXcucG9wKCkgfHwgaXRlbUVscy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgYWxpZ25JdGVtTGVmdChsYXN0V2hvbGVJdGVtSW5WaWV3ICsgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKG4sIHNob3csIHNvdXJjZSkge1xuICAgICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICAgICAgc291cmNlID0gXCJhcGlcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGlmIChzaG93KSB7XG4gICAgICAgICAgICAgICAgc2hvd0l0ZW0obik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobiAhPT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IG47XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gc2VsZWN0ZWRJdGVtSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uYWRkQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2FsbGVyeURPTS5yZW1vdmVDbGFzcyhpdGVtRWxzW2NdLCBcIm8tZ2FsbGVyeV9faXRlbS0tc2VsZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHJpZ2dlckV2ZW50KFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwge1xuICAgICAgICAgICAgICAgICAgICBpdGVtSUQ6IHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHNvdXJjZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0UHJldkl0ZW0oc2hvdywgc291cmNlKSB7XG4gICAgICAgIHZhciBwcmV2ID0gKHNlbGVjdGVkSXRlbUluZGV4IC0gMSA+PSAwKSA/IHNlbGVjdGVkSXRlbUluZGV4IC0gMSA6IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgc2VsZWN0SXRlbShwcmV2LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdE5leHRJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgbmV4dCA9IChzZWxlY3RlZEl0ZW1JbmRleCArIDEgPCBpdGVtRWxzLmxlbmd0aCkgPyBzZWxlY3RlZEl0ZW1JbmRleCArIDEgOiAwO1xuICAgICAgICBzZWxlY3RJdGVtKG5leHQsIHNob3csIHNvdXJjZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJldigpIHtcbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd1ByZXZQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RQcmV2SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzaG93TmV4dFBhZ2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdE5leHRJdGVtKHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzaXplKCkge1xuICAgICAgICBzZXRXaWR0aHMoKTtcbiAgICAgICAgaWYgKCFjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHsgLy8gY29ycmVjdCB0aGUgYWxpZ25tZW50IG9mIGl0ZW0gaW4gdmlld1xuICAgICAgICAgICAgc2hvd0l0ZW0oc2hvd25JdGVtSW5kZXgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld1Njcm9sbExlZnQgPSBzY3JvbGxlci5zY3JvbGxMZWZ0O1xuICAgICAgICAgICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KG5ld1Njcm9sbExlZnQsIG5ld1Njcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzaXplSGFuZGxlcigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlT25SZXNpemUpO1xuICAgICAgICBkZWJvdW5jZU9uUmVzaXplID0gc2V0VGltZW91dChvblJlc2l6ZSwgNTAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHRlbmRPYmplY3RzKG9ianMpIHtcbiAgICAgICAgdmFyIG5ld09iaiA9IHt9O1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IG9ianMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gb2Jqc1tjXTtcbiAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdPYmpbcHJvcF0gPSBvYmpbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdPYmo7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlRGF0YUF0dHJpYnV0ZXMoKSB7XG4gICAgICAgIGdhbGxlcnlET00uc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzKGNvbnRhaW5lckVsLCBjb25maWcsIHByb3BlcnR5QXR0cmlidXRlTWFwLCBbXCJpdGVtc1wiXSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0U3luY0lEKGlkKSB7XG4gICAgICAgIGNvbmZpZy5zeW5jSUQgPSBpZDtcbiAgICAgICAgdXBkYXRlRGF0YUF0dHJpYnV0ZXMoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTeW5jSUQoKSB7XG4gICAgICAgIHJldHVybiBjb25maWcuc3luY0lEO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN5bmNXaXRoKGdhbGxlcnlJbnN0YW5jZSkge1xuICAgICAgICBzZXRTeW5jSUQoZ2FsbGVyeUluc3RhbmNlLmdldFN5bmNJRCgpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblNjcm9sbChldnQpIHtcbiAgICAgICAgdXBkYXRlQ29udHJvbFN0YXRlcygpO1xuICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcoZXZ0LnNjcm9sbExlZnQsIGV2dC5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgICBwcmV2Q29udHJvbERpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYgPSBudWxsO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYgPSBudWxsO1xuICAgICAgICBzY3JvbGxlci5kZXN0cm95KHRydWUpO1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHByb3BlcnR5QXR0cmlidXRlTWFwKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydHlBdHRyaWJ1dGVNYXAuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXJFbC5yZW1vdmVBdHRyaWJ1dGUocHJvcGVydHlBdHRyaWJ1dGVNYXBbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwib0dhbGxlcnlJdGVtU2VsZWN0ZWRcIiwgb25HYWxsZXJ5Q3VzdG9tRXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcud2luZG93UmVzaXplKSB7XG4gICAgICAgICAgICBnYWxsZXJ5RE9NLnVubGlzdGVuRm9yRXZlbnQod2luZG93LCBcInJlc2l6ZVwiLCByZXNpemVIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdhbGxlcnlET00uYWRkQ2xhc3MoY29udGFpbmVyRWwsIFwiby1nYWxsZXJ5LS1qc1wiKTtcbiAgICBpZiAoaXNEYXRhU291cmNlKCkpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5lbXB0eUVsZW1lbnQoY29udGFpbmVyRWwpO1xuICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGNvbnRhaW5lckVsLCBcIm8tZ2FsbGVyeVwiKTtcbiAgICAgICAgYWxsSXRlbXNFbCA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXNMaXN0KGNvbnRhaW5lckVsKTtcbiAgICAgICAgaXRlbUVscyA9IGdhbGxlcnlET00uY3JlYXRlSXRlbXMoYWxsSXRlbXNFbCwgY29uZmlnLml0ZW1zKTtcbiAgICB9XG4gICAgY29uZmlnID0gZXh0ZW5kT2JqZWN0cyhbZGVmYXVsdENvbmZpZywgZ2FsbGVyeURPTS5nZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXMoY29udGFpbmVyRWwsIHByb3BlcnR5QXR0cmlidXRlTWFwKSwgY29uZmlnXSk7XG4gICAgdXBkYXRlRGF0YUF0dHJpYnV0ZXMoKTtcbiAgICBhbGxJdGVtc0VsID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5vLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIGl0ZW1FbHMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbiAgICBzZWxlY3RlZEl0ZW1JbmRleCA9IGdldFNlbGVjdGVkSXRlbSgpO1xuICAgIHNob3duSXRlbUluZGV4ID0gc2VsZWN0ZWRJdGVtSW5kZXg7XG4gICAgaWYgKGNvbmZpZy53aW5kb3dSZXNpemUpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5saXN0ZW5Gb3JFdmVudCh3aW5kb3csIFwicmVzaXplXCIsIHJlc2l6ZUhhbmRsZXIpO1xuICAgIH1cbiAgICBpbnNlcnRJdGVtQ29udGVudChzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgc2V0V2lkdGhzKCk7XG4gICAgc2V0Q2FwdGlvblNpemVzKCk7XG4gICAgaWYgKHN1cHBvcnRzQ3NzVHJhbnNmb3JtcygpKSB7XG4gICAgICAgIHNjcm9sbGVyID0gbmV3IEZUU2Nyb2xsZXIoY29udGFpbmVyRWwsIHtcbiAgICAgICAgICAgIHNjcm9sbGJhcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2Nyb2xsaW5nWTogZmFsc2UsXG4gICAgICAgICAgICB1cGRhdGVPbldpbmRvd1Jlc2l6ZTogdHJ1ZSxcbiAgICAgICAgICAgIHNuYXBwaW5nOiAhY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlLFxuICAgICAgICAgICAgLyogQ2FuJ3QgdXNlIGZsaW5nL2luZXJ0aWFsIHNjcm9sbCBhcyBhZnRlciB1c2VyIGlucHV0IGlzIGZpbmlzaGVkIGFuZCBzY3JvbGwgY29udGludWVzLCBzY3JvbGwgZXZlbnRzIGFyZSBub1xuICAgICAgICAgICAgIGxvbmdlciBmaXJlZCwgYW5kIHZhbHVlIG9mIHNjcm9sbExlZnQgZG9lc24ndCBjaGFuZ2UgdW50aWwgc2Nyb2xsZW5kLiAqL1xuICAgICAgICAgICAgZmxpbmdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZWRJbnB1dE1ldGhvZHM6IHtcbiAgICAgICAgICAgICAgICB0b3VjaDogIWNvbmZpZy50b3VjaCxcbiAgICAgICAgICAgICAgICBzY3JvbGw6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHNjcm9sbGVyLmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoZGVib3VuY2VTY3JvbGwpO1xuICAgICAgICAgICAgZGVib3VuY2VTY3JvbGwgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBvblNjcm9sbChldnQpO1xuICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICB9KTtcbiAgICAgICAgc2Nyb2xsZXIuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbGVuZFwiLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIG9uU2Nyb2xsKGV2dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzY3JvbGxlci5hZGRFdmVudExpc3RlbmVyKFwic2VnbWVudHdpbGxjaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oc2Nyb2xsZXIuY3VycmVudFNlZ21lbnQueCwgZmFsc2UsIFwidXNlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsZXIgPSBuZXcgU2ltcGxlU2Nyb2xsZXIoY29udGFpbmVyRWwsIHt9KTtcbiAgICB9XG4gICAgdmlld3BvcnRFbCA9IHNjcm9sbGVyLmNvbnRlbnRDb250YWluZXJOb2RlLnBhcmVudE5vZGU7XG4gICAgZ2FsbGVyeURPTS5hZGRDbGFzcyh2aWV3cG9ydEVsLCBcIm8tZ2FsbGVyeV9fdmlld3BvcnRcIik7XG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQoZ2V0SXRlbXNJblBhZ2VWaWV3KHNjcm9sbGVyLnNjcm9sbExlZnQsIHNjcm9sbGVyLnNjcm9sbExlZnQgKyB2aWV3cG9ydEVsLmNsaWVudFdpZHRoLCBmYWxzZSkpO1xuICAgIGFkZFVpQ29udHJvbHMoKTtcbiAgICBzaG93SXRlbShzZWxlY3RlZEl0ZW1JbmRleCk7XG4gICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSA9PT0gdHJ1ZSkge1xuICAgICAgICBhbGxvd1RyYW5zaXRpb25zID0gdHJ1ZTtcbiAgICB9XG4gICAgdXBkYXRlQ29udHJvbFN0YXRlcygpO1xuICAgIGxpc3RlbkZvclN5bmNFdmVudHMoKTtcblxuICAgIHRoaXMuc2hvd0l0ZW0gPSBzaG93SXRlbTtcbiAgICB0aGlzLmdldFNlbGVjdGVkSXRlbSA9IGdldFNlbGVjdGVkSXRlbTtcbiAgICB0aGlzLnNob3dQcmV2SXRlbSA9IHNob3dQcmV2SXRlbTtcbiAgICB0aGlzLnNob3dOZXh0SXRlbSA9IHNob3dOZXh0SXRlbTtcbiAgICB0aGlzLnNob3dQcmV2UGFnZSA9IHNob3dQcmV2UGFnZTtcbiAgICB0aGlzLnNob3dOZXh0UGFnZSA9IHNob3dOZXh0UGFnZTtcbiAgICB0aGlzLnNlbGVjdEl0ZW0gPSBzZWxlY3RJdGVtO1xuICAgIHRoaXMuc2VsZWN0UHJldkl0ZW0gPSBzZWxlY3RQcmV2SXRlbTtcbiAgICB0aGlzLnNlbGVjdE5leHRJdGVtID0gc2VsZWN0TmV4dEl0ZW07XG4gICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuICAgIHRoaXMuZ2V0U3luY0lEID0gZ2V0U3luY0lEO1xuICAgIHRoaXMuc3luY1dpdGggPSBzeW5jV2l0aDtcbiAgICB0aGlzLm9uUmVzaXplID0gb25SZXNpemU7XG4gICAgdGhpcy5kZXN0cm95ID0gZGVzdHJveTtcblxuICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5UmVhZHlcIiwge1xuICAgICAgICBnYWxsZXJ5OiB0aGlzXG4gICAgfSk7XG5cbn1cblxuR2FsbGVyeS5jcmVhdGVBbGxJbiA9IGZ1bmN0aW9uKGVsLCBjb25maWcpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgY29uZiA9IGNvbmZpZyB8fCB7fSxcbiAgICAgICAgZ0VscyxcbiAgICAgICAgZ2FsbGVyaWVzID0gW107XG4gICAgaWYgKGVsLnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICAgICAgZ0VscyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1vLWNvbXBvbmVudD1vLWdhbGxlcnldXCIpO1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGdFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBnYWxsZXJpZXMucHVzaChuZXcgR2FsbGVyeShnRWxzW2NdLCBjb25mKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGdhbGxlcmllcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR2FsbGVyeTsiLCIvKiBnbG9iYWwgcmVxdWlyZSwgbW9kdWxlICovXG5cbnZhciBnYWxsZXJ5RE9NID0gcmVxdWlyZSgnLi9nYWxsZXJ5RE9NJyk7XG5cbi8qKlxuICogTWltaWNzIEZUU2Nyb2xsZXIgaW4gc2ltcGxlc3QgcG9zc2libGUgd2F5ICh3aXRob3V0IHRvdWNoIGludGVyZmFjZSwgdHJhbnNpdGlvbnMgb3IgZXZlbnRzKVxuICogSW50ZW5kZWQgZm9yIElFOCBwYXJ0aWN1bGFybHkuXG4gKi9cblxuZnVuY3Rpb24gU2ltcGxlU2Nyb2xsZXIoY29udGFpbmVyRWwsIGNvbmZpZykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgYWxsSXRlbXNFbCxcbiAgICAgICAgdmlld3BvcnRFbDtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVByb3BlcnRpZXMoKSB7XG4gICAgICAgIHNlbGYuc2Nyb2xsTGVmdCA9IHZpZXdwb3J0RWwuc2Nyb2xsTGVmdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY3JvbGxUbyhuKSB7XG4gICAgICAgIHZpZXdwb3J0RWwuc2Nyb2xsTGVmdCA9IG47XG4gICAgICAgIHVwZGF0ZVByb3BlcnRpZXMoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgICBnYWxsZXJ5RE9NLnVud3JhcEVsZW1lbnQodmlld3BvcnRFbCk7XG4gICAgfVxuXG4gICAgYWxsSXRlbXNFbCA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJy5vLWdhbGxlcnlfX2l0ZW1zJyk7XG4gICAgdmlld3BvcnRFbCA9IGdhbGxlcnlET00uY3JlYXRlRWxlbWVudCgnZGl2JywgJycsICdvLWdhbGxlcnlfX3ZpZXdwb3J0Jyk7XG4gICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQodmlld3BvcnRFbCk7XG4gICAgZ2FsbGVyeURPTS53cmFwRWxlbWVudChhbGxJdGVtc0VsLCB2aWV3cG9ydEVsKTtcbiAgICB1cGRhdGVQcm9wZXJ0aWVzKCk7XG5cbiAgICB0aGlzLmNvbnRlbnRDb250YWluZXJOb2RlID0gYWxsSXRlbXNFbDtcbiAgICB0aGlzLnNjcm9sbFRvID0gc2Nyb2xsVG87XG4gICAgdGhpcy5kZXN0cm95ID0gZGVzdHJveTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXBsZVNjcm9sbGVyOyIsIi8qZ2xvYmFsIG1vZHVsZSovXG5cblwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBlbXB0eUVsZW1lbnQodGFyZ2V0RWwpIHtcbiAgICB3aGlsZSAodGFyZ2V0RWwuZmlyc3RDaGlsZCkge1xuICAgICAgICB0YXJnZXRFbC5yZW1vdmVDaGlsZCh0YXJnZXRFbC5maXJzdENoaWxkKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQobm9kZU5hbWUsIGNvbnRlbnQsIGNsYXNzZXMpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICBlbC5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgIGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzZXMpO1xuICAgIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gd3JhcEVsZW1lbnQodGFyZ2V0RWwsIHdyYXBFbCkge1xuICAgIHZhciBwYXJlbnRFbCA9IHRhcmdldEVsLnBhcmVudE5vZGU7XG4gICAgd3JhcEVsLmFwcGVuZENoaWxkKHRhcmdldEVsKTtcbiAgICBwYXJlbnRFbC5hcHBlbmRDaGlsZCh3cmFwRWwpO1xufVxuXG5mdW5jdGlvbiB1bndyYXBFbGVtZW50KHRhcmdldEVsKSB7XG4gICAgdmFyIHdyYXBwaW5nRWwgPSB0YXJnZXRFbC5wYXJlbnROb2RlLFxuICAgICAgICB3cmFwcGluZ0VsUGFyZW50ID0gd3JhcHBpbmdFbC5wYXJlbnROb2RlO1xuICAgIHdoaWxlICh3cmFwcGluZ0VsLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB3cmFwcGluZ0VsUGFyZW50LmFwcGVuZENoaWxkKHdyYXBwaW5nRWwuY2hpbGROb2Rlc1swXSk7XG4gICAgfVxuICAgIHdyYXBwaW5nRWxQYXJlbnQucmVtb3ZlQ2hpbGQod3JhcHBpbmdFbCk7XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBjKSB7XG4gICAgcmV0dXJuICgnICcgKyBlbC5jbGFzc05hbWUgKyAnICcpLmluZGV4T2YoJyAnICsgYyArICcgJykgPiAtMTtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MoZWwsIGMpIHtcbiAgICBpZiAoIWhhc0NsYXNzKGVsLCBjKSkge1xuICAgICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUgKyBcIiBcIiArIGM7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgYykge1xuICAgIGlmIChoYXNDbGFzcyhlbCwgYykpIHtcbiAgICAgICAgdmFyIHJlZyA9IG5ldyBSZWdFeHAoJyhcXFxcc3xeKScgKyBjICsgJyhcXFxcc3wkKScpO1xuICAgICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShyZWcsJyAnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCkge1xuICAgIHZhciBpdGVtc0xpc3QgPSBjcmVhdGVFbGVtZW50KFwib2xcIiwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1zXCIpO1xuICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGl0ZW1zTGlzdCk7XG4gICAgcmV0dXJuIGl0ZW1zTGlzdDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlSXRlbXMoY29udGFpbmVyRWwsIGl0ZW1zKSB7XG4gICAgdmFyIGl0ZW1DbGFzcztcbiAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBpdGVtQ2xhc3MgPSBcIm8tZ2FsbGVyeV9faXRlbVwiICsgKChpdGVtc1tjXS5zZWxlY3RlZCkgPyBcIiBvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIgOiBcIlwiICk7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKGNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBcIiZuYnNwO1wiLCBpdGVtQ2xhc3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuby1nYWxsZXJ5X19pdGVtXCIpO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChjb25maWcsIGl0ZW0sIGl0ZW1FbCkge1xuICAgIGVtcHR5RWxlbWVudChpdGVtRWwpO1xuICAgIHZhciBjb250ZW50RWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uY29udGVudCwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NvbnRlbnRcIik7XG4gICAgaXRlbUVsLmFwcGVuZENoaWxkKGNvbnRlbnRFbCk7XG4gICAgaWYgKGNvbmZpZy5jYXB0aW9ucykge1xuICAgICAgICB2YXIgY2FwdGlvbkVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLmNhcHRpb24gfHwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgIGl0ZW1FbC5hcHBlbmRDaGlsZChjYXB0aW9uRWwpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3BOYW1lLCBlbCwgYXR0ck5hbWUpIHtcbiAgICB2YXIgdiA9IGVsLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgaWYgKHYgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKHYgPT09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICB2ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2ID09PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgIHYgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBvYmpbcHJvcE5hbWVdID0gdjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlcyhlbCwgbWFwKSB7XG4gICAgdmFyIG9iaiA9IHt9LFxuICAgICAgICBwcm9wO1xuICAgIGZvciAocHJvcCBpbiBtYXApIHtcbiAgICAgICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3AsIGVsLCBtYXBbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZihhLCB2KSB7XG4gICAgdmFyIGkgPSAtMTtcbiAgICBpZiAoQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcbiAgICAgICAgcmV0dXJuIGEuaW5kZXhPZih2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGEubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICBpZiAoYVtjXSA9PT0gdikge1xuICAgICAgICAgICAgICAgIGkgPSBjO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXMoZWwsIG9iaiwgbWFwLCBleGNsKSB7XG4gICAgdmFyIGV4Y2x1ZGUgPSBleGNsIHx8IFtdO1xuICAgIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkgJiYgYXJyYXlJbmRleE9mKGV4Y2x1ZGUsIHByb3ApIDwgMCkge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG1hcFtwcm9wXSwgb2JqW3Byb3BdKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0Q2xvc2VzdChlbCwgYykge1xuICAgIHdoaWxlICghaGFzQ2xhc3MoZWwsIGMpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRJbmRleChlbCkge1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoZWwgPSBlbC5wcmV2aW91c1NpYmxpbmcpIHtcbiAgICAgICAgaWYgKGVsLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgICAgICArK2k7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIGxpc3RlbkZvckV2ZW50KGVsLCBuYW1lLCBoYW5kbGVyKSB7XG4gICAgaWYgKGVsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBoYW5kbGVyLCBmYWxzZSk7XG4gICAgfSBlbHNlIGlmIChlbC5hdHRhY2hFdmVudCkge1xuICAgICAgICBlbC5hdHRhY2hFdmVudChcIm9uXCIgKyBuYW1lLCBoYW5kbGVyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHVubGlzdGVuRm9yRXZlbnQoZWwsIG5hbWUsIGhhbmRsZXIpIHtcbiAgICBpZiAoZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGhhbmRsZXIsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKGVsLmRldGFjaEV2ZW50KSB7XG4gICAgICAgIGVsLmRldGFjaEV2ZW50KFwib25cIiArIG5hbWUsIGhhbmRsZXIpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW1wdHlFbGVtZW50OiBlbXB0eUVsZW1lbnQsXG4gICAgY3JlYXRlRWxlbWVudDogY3JlYXRlRWxlbWVudCxcbiAgICB3cmFwRWxlbWVudDogd3JhcEVsZW1lbnQsXG4gICAgdW53cmFwRWxlbWVudDogdW53cmFwRWxlbWVudCxcbiAgICBoYXNDbGFzczogaGFzQ2xhc3MsXG4gICAgYWRkQ2xhc3M6IGFkZENsYXNzLFxuICAgIHJlbW92ZUNsYXNzOiByZW1vdmVDbGFzcyxcbiAgICBjcmVhdGVJdGVtc0xpc3Q6IGNyZWF0ZUl0ZW1zTGlzdCxcbiAgICBjcmVhdGVJdGVtczogY3JlYXRlSXRlbXMsXG4gICAgaW5zZXJ0SXRlbUNvbnRlbnQ6IGluc2VydEl0ZW1Db250ZW50LFxuICAgIHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllczogc2V0QXR0cmlidXRlc0Zyb21Qcm9wZXJ0aWVzLFxuICAgIGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlczogZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzLFxuICAgIGdldENsb3Nlc3Q6IGdldENsb3Nlc3QsXG4gICAgZ2V0RWxlbWVudEluZGV4OiBnZXRFbGVtZW50SW5kZXgsXG4gICAgbGlzdGVuRm9yRXZlbnQ6IGxpc3RlbkZvckV2ZW50LFxuICAgIHVubGlzdGVuRm9yRXZlbnQ6IHVubGlzdGVuRm9yRXZlbnRcbn07Il19
