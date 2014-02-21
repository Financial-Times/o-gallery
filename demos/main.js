require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"hjDe2K":[function(require,module,exports){
/*global require, module*/
module.exports = require('./src/js/Gallery');
},{"./src/js/Gallery":4}],"o-gallery":[function(require,module,exports){
module.exports=require('hjDe2K');
},{}],3:[function(require,module,exports){
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
	var _trackTouchEvents = !_trackPointerEvents && (window.propertyIsEnumerable('ontouchstart') || window.document.hasOwnProperty('ontouchstart'));

	// Determine whether to use modern hardware acceleration rules or dynamic/toggleable rules.
	// Certain older browsers - particularly Android browsers - have problems with hardware
	// acceleration, so being able to toggle the behaviour dynamically via a CSS cascade is desirable.
	var _useToggleableHardwareAcceleration = !window.hasOwnProperty('ArrayBuffer');

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
			removeEventListener: removeEventListener,
			get scrollHeight () { return _metrics.content.y; },
			set scrollHeight (value) { throw new SyntaxError('scrollHeight is currently read-only - ignoring ' + value); },
			get scrollLeft () { return -_lastScrollPosition.x; },
			set scrollLeft (value) { scrollTo(value, false, false); return -_lastScrollPosition.x; },
			get scrollTop () { return -_lastScrollPosition.y; },
			set scrollTop (value) { scrollTo(false, value, false); return -_lastScrollPosition.y; },
			get scrollWidth () { return _metrics.content.x; },
			set scrollWidth (value) { throw new SyntaxError('scrollWidth is currently read-only - ignoring ' + value); },
			get segmentCount () {
				if (!_instanceOptions.snapping) {
					return { x: NaN, y: NaN };
				}
				return {
					x: Math.ceil(_metrics.content.x / _snapGridSize.x),
					y: Math.ceil(_metrics.content.y / _snapGridSize.y)
				};
			},
			set segmentCount (value) { throw new SyntaxError('segmentCount is currently read-only - ignoring ' + value); },
			get currentSegment () { return { x: _activeSegment.x, y: _activeSegment.y }; },
			set currentSegment (value) { throw new SyntaxError('currentSegment is currently read-only - ignoring ' + value); },
			get contentContainerNode () { return _contentParentNode; },
			set contentContainerNode (value) { throw new SyntaxError('contentContainerNode is currently read-only - ignoring ' + value); }
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

},{}],4:[function(require,module,exports){
/*global require, module*/

var galleryDOM = require('./galleryDOM'),
    FTScroller = require('FTScroller');

function Gallery(containerEl, config) {
    "use strict";

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
            captionMaxHeight: "data-o-gallery-captionmaxheight"
        },
        defaultConfig = {
            component: "o-gallery",
            version: "0.0.0",
            multipleItemsPerPage: false,
            captions: true,
            captionMinHeight: 24,
            captionMaxHeight: 52,
            touch: false,
            syncID: "o-gallery-" + new Date().getTime()
        };

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
        prevControlDiv = galleryDOM.createElement("div", "PREV", "o-gallery__control o-gallery__control--prev");
        nextControlDiv = galleryDOM.createElement("div", "NEXT", "o-gallery__control o-gallery__control--next");
        containerEl.appendChild(prevControlDiv);
        containerEl.appendChild(nextControlDiv);
        prevControlDiv.addEventListener("click", prev);
        nextControlDiv.addEventListener("click", next);

        if (config.multipleItemsPerPage) {
            viewportEl.addEventListener("click", function (evt) {
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
        if (evt.srcElement !== containerEl && evt.detail.syncID === config.syncID && evt.detail.source === "user") {
            selectItem(evt.detail.itemID, true);
        }
    }

    function listenForSyncEvents() {
        document.addEventListener("oGalleryItemSelected", onGalleryCustomEvent);
    }

    function triggerEvent(name, data) {
        data = data || {};
        data.syncID = config.syncID;
        var event = new CustomEvent(name, {
            bubbles: true,
            cancelable: false,
            detail: data
        });
        containerEl.dispatchEvent(event);
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
        transitionInProgress = false;
        insertItemContent(getItemsInPageView(evt.scrollLeft, evt.scrollLeft + viewportEl.clientWidth, false));
    }

    function destroy() {
        prevControlDiv.parentNode.removeChild(prevControlDiv);
        nextControlDiv.parentNode.removeChild(nextControlDiv);
        scroller.destroy(true);
        for (var prop in propertyAttributeMap) {
            if (propertyAttributeMap.hasOwnProperty(prop)) {
                containerEl.removeAttribute(propertyAttributeMap[prop]);
            }
        }
        document.removeEventListener("oGalleryItemSelected", onGalleryCustomEvent);
        window.removeEventListener("resize", resizeHandler);
    }

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
    window.addEventListener("resize", resizeHandler);
    insertItemContent(selectedItemIndex);
    setWidths();
    setCaptionSizes();
    scroller = new FTScroller(containerEl, {
        scrollbars: false,
        scrollingY: false,
        updateOnWindowResize: true,
        snapping: !config.multipleItemsPerPage,
        /* Can't use fling/inertial scroll as after user input is finished and scroll continues, scroll events are no
         longer fired, and value of scrollLeft doesn't change until scrollend. */
        flinging: false,
        disableInputMethods: {
            touch: !config.touch
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
    scroller.addEventListener("scrollend", onScroll);
    scroller.addEventListener("segmentwillchange", function() {
        if (!config.multipleItemsPerPage) {
            selectItem(scroller.currentSegment.x, false, "user");
        }
    });
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
    this.destroy = destroy;

    triggerEvent("oGalleryReady", {
        gallery: this
    });

}

Gallery.createAllIn = function(el, config) {
    "use strict";
    var conf = config || {},
        gEls = el.querySelectorAll("[data-o-component=o-gallery]"),
        galleries = [];
    for (var c = 0, l = gEls.length; c < l; c++) {
        galleries.push(new Gallery(gEls[c], conf));
    }
    return galleries;
};

module.exports = Gallery;
},{"./galleryDOM":5,"FTScroller":3}],5:[function(require,module,exports){
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
    var contentEl = createElement("div", item.itemContent, "o-gallery__item__content");
    itemEl.appendChild(contentEl);
    if (config.captions) {
        var captionEl = createElement("div", item.itemCaption || "", "o-gallery__item__caption");
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

function setAttributesFromProperties(el, obj, map, excl) {
    var exclude = excl || [];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop) && exclude.indexOf(prop) < 0) {
            el.setAttribute(map[prop], obj[prop]);
        }
    }
}

function getClosest(el, c) {
    while (!hasClass(el, c)) {
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

module.exports = {
    emptyElement: emptyElement,
    createElement: createElement,
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    createItemsList: createItemsList,
    createItems: createItems,
    insertItemContent: insertItemContent,
    setAttributesFromProperties: setAttributesFromProperties,
    getPropertiesFromAttributes: getPropertiesFromAttributes,
    getClosest: getClosest,
    getElementIndex: getElementIndex
};
},{}]},{},["hjDe2K"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvbWFpbi5qcyIsIi9Vc2Vycy9kYW5zZWFybGUvV29ya3NwYWNlL0ZUL09yaWdhbWkvby1nYWxsZXJ5L25vZGVfbW9kdWxlcy9GVFNjcm9sbGVyL2xpYi9mdHNjcm9sbGVyLmpzIiwiL1VzZXJzL2RhbnNlYXJsZS9Xb3Jrc3BhY2UvRlQvT3JpZ2FtaS9vLWdhbGxlcnkvc3JjL2pzL0dhbGxlcnkuanMiLCIvVXNlcnMvZGFuc2VhcmxlL1dvcmtzcGFjZS9GVC9PcmlnYW1pL28tZ2FsbGVyeS9zcmMvanMvZ2FsbGVyeURPTS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7Ozs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3cUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM2FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qZ2xvYmFsIHJlcXVpcmUsIG1vZHVsZSovXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2pzL0dhbGxlcnknKTsiLCIvKipcbiAqIEZUU2Nyb2xsZXI6IHRvdWNoIGFuZCBtb3VzZS1iYXNlZCBzY3JvbGxpbmcgZm9yIERPTSBlbGVtZW50cyBsYXJnZXIgdGhhbiB0aGVpciBjb250YWluZXJzLlxuICpcbiAqIFdoaWxlIHRoaXMgaXMgYSByZXdyaXRlLCBpdCBpcyBoZWF2aWx5IGluc3BpcmVkIGJ5IHR3byBwcm9qZWN0czpcbiAqIDEpIFV4ZWJ1IFRvdWNoU2Nyb2xsIChodHRwczovL2dpdGh1Yi5jb20vZGF2aWRhdXJlbGlvL1RvdWNoU2Nyb2xsKSwgQlNEIGxpY2Vuc2VkOlxuICogICAgQ29weXJpZ2h0IChjKSAyMDEwIHV4ZWJ1IENvbnN1bHRpbmcgTHRkLiAmIENvLiBLR1xuICogICAgQ29weXJpZ2h0IChjKSAyMDEwIERhdmlkIEF1cmVsaW9cbiAqIDIpIFp5bmdhIFNjcm9sbGVyIChodHRwczovL2dpdGh1Yi5jb20venluZ2Evc2Nyb2xsZXIpLCBNSVQgbGljZW5zZWQ6XG4gKiAgICBDb3B5cmlnaHQgMjAxMSwgWnluZ2EgSW5jLlxuICogICAgQ29weXJpZ2h0IDIwMTEsIERldXRzY2hlIFRlbGVrb20gQUdcbiAqXG4gKiBJbmNsdWRlcyBDdWJpY0JlemllcjpcbiAqXG4gKiBDb3B5cmlnaHQgKEMpIDIwMDggQXBwbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogQ29weXJpZ2h0IChDKSAyMDEwIERhdmlkIEF1cmVsaW8uIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTAgdXhlYnUgQ29uc3VsdGluZyBMdGQuICYgQ28uIEtHLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICogbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zXG4gKiBhcmUgbWV0OlxuICogMS4gUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAqICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAqIDIuIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gKiAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gKiAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuICpcbiAqIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgQVBQTEUgSU5DLiwgREFWSUQgQVVSRUxJTywgQU5EIFVYRUJVXG4gKiBDT05TVUxUSU5HIExURC4gJiBDTy4gS0cgYGBBUyBJUycnIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEXG4gKiBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRlxuICogTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC5cbiAqIElOIE5PIEVWRU5UIFNIQUxMIEFQUExFIElOQy4gT1IgQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCxcbiAqIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICogKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SXG4gKiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTilcbiAqIEhPV0VWRVIgQ0FVU0VEIEFORCBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCxcbiAqIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lOR1xuICogSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFXG4gKiBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiAqXG4gKiBAY29weXJpZ2h0IFRoZSBGaW5hbmNpYWwgVGltZXMgTHRkIFtBbGwgcmlnaHRzIHJlc2VydmVkXVxuICogQGNvZGluZ3N0YW5kYXJkIGZ0bGFicy1qc2xpbnRcbiAqIEB2ZXJzaW9uIDAuMy4wXG4gKi9cbi8qKlxuICogQGxpY2Vuc2UgRlRTY3JvbGxlciBpcyAoYykgMjAxMiBUaGUgRmluYW5jaWFsIFRpbWVzIEx0ZCBbQWxsIHJpZ2h0cyByZXNlcnZlZF0gYW5kIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqXG4gKiBJbnNwaXJlZCBieSBVeGVidSBUb3VjaFNjcm9sbCwgKGMpIDIwMTAgdXhlYnUgQ29uc3VsdGluZyBMdGQuICYgQ28uIEtHIGFuZCBEYXZpZCBBdXJlbGlvLCB3aGljaCBpcyBCU0QgbGljZW5zZWQgKGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGF1cmVsaW8vVG91Y2hTY3JvbGwpXG4gKiBJbnNwaXJlZCBieSBaeW5nYSBTY3JvbGxlciwgKGMpIDIwMTEgWnluZ2EgSW5jIGFuZCBEZXV0c2NoZSBUZWxla29tIEFHLCB3aGljaCBpcyBNSVQgbGljZW5zZWQgKGh0dHBzOi8vZ2l0aHViLmNvbS96eW5nYS9zY3JvbGxlcilcbiAqIEluY2x1ZGVzIEN1YmljQmV6aWVyLCAoYykgMjAwOCBBcHBsZSBJbmMgW0FsbCByaWdodHMgcmVzZXJ2ZWRdLCAoYykgMjAxMCBEYXZpZCBBdXJlbGlvIGFuZCB1eGVidSBDb25zdWx0aW5nIEx0ZC4gJiBDby4gS0cuIFtBbGwgcmlnaHRzIHJlc2VydmVkXSwgd2hpY2ggaXMgMi1jbGF1c2UgQlNEIGxpY2Vuc2VkIChzZWUgYWJvdmUgb3IgaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkYXVyZWxpby9Ub3VjaFNjcm9sbCkuXG4gKi9cblxuLypqc2xpbnQgbm9tZW46IHRydWUsIHZhcnM6IHRydWUsIGJyb3dzZXI6IHRydWUsIGNvbnRpbnVlOiB0cnVlLCB3aGl0ZTogdHJ1ZSovXG4vKmdsb2JhbHMgRlRTY3JvbGxlck9wdGlvbnMqL1xuXG52YXIgRlRTY3JvbGxlciwgQ3ViaWNCZXppZXI7XG5cbihmdW5jdGlvbiAoKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHQvLyBHbG9iYWwgZmxhZyB0byBkZXRlcm1pbmUgaWYgYW55IHNjcm9sbCBpcyBjdXJyZW50bHkgYWN0aXZlLiAgVGhpcyBwcmV2ZW50c1xuXHQvLyBpc3N1ZXMgd2hlbiB1c2luZyBtdWx0aXBsZSBzY3JvbGxlcnMsIHBhcnRpY3VsYXJseSB3aGVuIHRoZXkncmUgbmVzdGVkLlxuXHR2YXIgX2Z0c2Nyb2xsZXJNb3ZpbmcgPSBmYWxzZTtcblxuXHQvLyBEZXRlcm1pbmUgd2hldGhlciBwb2ludGVyIGV2ZW50cyBvciB0b3VjaCBldmVudHMgY2FuIGJlIHVzZWRcblx0dmFyIF90cmFja1BvaW50ZXJFdmVudHMgPSB3aW5kb3cubmF2aWdhdG9yLm1zUG9pbnRlckVuYWJsZWQ7XG5cdHZhciBfdHJhY2tUb3VjaEV2ZW50cyA9ICFfdHJhY2tQb2ludGVyRXZlbnRzICYmICh3aW5kb3cucHJvcGVydHlJc0VudW1lcmFibGUoJ29udG91Y2hzdGFydCcpIHx8IHdpbmRvdy5kb2N1bWVudC5oYXNPd25Qcm9wZXJ0eSgnb250b3VjaHN0YXJ0JykpO1xuXG5cdC8vIERldGVybWluZSB3aGV0aGVyIHRvIHVzZSBtb2Rlcm4gaGFyZHdhcmUgYWNjZWxlcmF0aW9uIHJ1bGVzIG9yIGR5bmFtaWMvdG9nZ2xlYWJsZSBydWxlcy5cblx0Ly8gQ2VydGFpbiBvbGRlciBicm93c2VycyAtIHBhcnRpY3VsYXJseSBBbmRyb2lkIGJyb3dzZXJzIC0gaGF2ZSBwcm9ibGVtcyB3aXRoIGhhcmR3YXJlXG5cdC8vIGFjY2VsZXJhdGlvbiwgc28gYmVpbmcgYWJsZSB0byB0b2dnbGUgdGhlIGJlaGF2aW91ciBkeW5hbWljYWxseSB2aWEgYSBDU1MgY2FzY2FkZSBpcyBkZXNpcmFibGUuXG5cdHZhciBfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID0gIXdpbmRvdy5oYXNPd25Qcm9wZXJ0eSgnQXJyYXlCdWZmZXInKTtcblxuXHQvLyBGZWF0dXJlIGRldGVjdGlvblxuXHR2YXIgX2NhbkNsZWFyU2VsZWN0aW9uID0gKHdpbmRvdy5TZWxlY3Rpb24gJiYgd2luZG93LlNlbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQWxsUmFuZ2VzKTtcblxuXHQvLyBEZXRlcm1pbmUgdGhlIGJyb3dzZXIgZW5naW5lIGFuZCBwcmVmaXgsIHRyeWluZyB0byB1c2UgdGhlIHVucHJlZml4ZWQgdmVyc2lvbiB3aGVyZSBhdmFpbGFibGUuXG5cdHZhciBfdmVuZG9yQ1NTUHJlZml4LCBfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCwgX3ZlbmRvclRyYW5zZm9ybUxvb2t1cDtcblx0aWYgKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlLnRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0X3ZlbmRvckNTU1ByZWZpeCA9ICcnO1xuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJyc7XG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICd0cmFuc2Zvcm0nO1xuXHR9IGVsc2UgaWYgKHdpbmRvdy5vcGVyYSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93Lm9wZXJhKSA9PT0gJ1tvYmplY3QgT3BlcmFdJykge1xuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnLW8tJztcblx0XHRfdmVuZG9yU3R5bGVQcm9wZXJ0eVByZWZpeCA9ICdPJztcblx0XHRfdmVuZG9yVHJhbnNmb3JtTG9va3VwID0gJ09UcmFuc2Zvcm0nO1xuXHR9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5Nb3pUcmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnLW1vei0nO1xuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJ01veic7XG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICdNb3pUcmFuc2Zvcm0nO1xuXHR9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS53ZWJraXRUcmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xuXHRcdF92ZW5kb3JDU1NQcmVmaXggPSAnLXdlYmtpdC0nO1xuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJ3dlYmtpdCc7XG5cdFx0X3ZlbmRvclRyYW5zZm9ybUxvb2t1cCA9ICctd2Via2l0LXRyYW5zZm9ybSc7XG5cdH0gZWxzZSBpZiAodHlwZW9mIG5hdmlnYXRvci5jcHVDbGFzcyA9PT0gJ3N0cmluZycpIHtcblx0XHRfdmVuZG9yQ1NTUHJlZml4ID0gJy1tcy0nO1xuXHRcdF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID0gJ21zJztcblx0XHRfdmVuZG9yVHJhbnNmb3JtTG9va3VwID0gJy1tcy10cmFuc2Zvcm0nO1xuXHR9XG5cblx0Ly8gSWYgaGFyZHdhcmUgYWNjZWxlcmF0aW9uIGlzIHVzaW5nIHRoZSBzdGFuZGFyZCBwYXRoLCBidXQgcGVyc3BlY3RpdmUgZG9lc24ndCBzZWVtIHRvIGJlIHN1cHBvcnRlZCxcblx0Ly8gM0QgdHJhbnNmb3JtcyBsaWtlbHkgYXJlbid0IHN1cHBvcnRlZCBlaXRoZXJcblx0aWYgKCFfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uICYmIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlW192ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ICsgKF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID8gJ1AnIDogJ3AnKSArICdlcnNwZWN0aXZlJ10gPT09IHVuZGVmaW5lZCkge1xuXHRcdF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPSB0cnVlO1xuXHR9XG5cblx0Ly8gU3R5bGUgcHJlZml4ZXNcblx0dmFyIF90cmFuc2Zvcm1Qcm9wZXJ0eSA9IF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ICsgKF92ZW5kb3JTdHlsZVByb3BlcnR5UHJlZml4ID8gJ1QnIDogJ3QnKSArICdyYW5zZm9ybSc7XG5cdHZhciBfdHJhbnNpdGlvblByb3BlcnR5ID0gX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggKyAoX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggPyAnVCcgOiAndCcpICsgJ3JhbnNpdGlvbic7XG5cdHZhciBfdHJhbnNsYXRlUnVsZVByZWZpeCA9IF91c2VUb2dnbGVhYmxlSGFyZHdhcmVBY2NlbGVyYXRpb24gPyAndHJhbnNsYXRlKCcgOiAndHJhbnNsYXRlM2QoJztcblx0dmFyIF90cmFuc2Zvcm1QcmVmaXhlcyA9IHsgeDogJycsIHk6ICcwLCcgfTtcblx0dmFyIF90cmFuc2Zvcm1TdWZmaXhlcyA9IHsgeDogJywwJyArIChfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uID8gJyknIDogJywwKScpLCB5OiAoX3VzZVRvZ2dsZWFibGVIYXJkd2FyZUFjY2VsZXJhdGlvbiA/ICcpJyA6ICcsMCknKSB9O1xuXG5cdC8vIENvbnN0YW50cy4gIE5vdGUgdGhhdCB0aGUgYmV6aWVyIGN1cnZlIHNob3VsZCBiZSBjaGFuZ2VkIGFsb25nIHdpdGggdGhlIGZyaWN0aW9uIVxuXHR2YXIgX2tGcmljdGlvbiA9IDAuOTk4O1xuXHR2YXIgX2tNaW5pbXVtU3BlZWQgPSAwLjAxO1xuXG5cdC8vIENyZWF0ZSBhIGdsb2JhbCBzdHlsZXNoZWV0IHRvIHNldCB1cCBzdHlsZXNoZWV0IHJ1bGVzIGFuZCB0cmFjayBkeW5hbWljIGVudHJpZXNcblx0KGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgc3R5bGVzaGVldENvbnRhaW5lck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblx0XHR2YXIgbmV3U3R5bGVOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblx0XHR2YXIgaGFyZHdhcmVBY2NlbGVyYXRpb25SdWxlO1xuXHRcdHZhciBfc3R5bGVUZXh0O1xuXHRcdG5ld1N0eWxlTm9kZS50eXBlID0gJ3RleHQvY3NzJztcblxuXHRcdC8vIERldGVybWluZSB0aGUgaGFyZHdhcmUgYWNjZWxlcmF0aW9uIGxvZ2ljIHRvIHVzZVxuXHRcdGlmIChfdXNlVG9nZ2xlYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uKSB7XG5cdFx0XHRoYXJkd2FyZUFjY2VsZXJhdGlvblJ1bGUgPSBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zZm9ybS1zdHlsZTogcHJlc2VydmUtM2Q7Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0aGFyZHdhcmVBY2NlbGVyYXRpb25SdWxlID0gX3ZlbmRvckNTU1ByZWZpeCArICd0cmFuc2Zvcm06IHRyYW5zbGF0ZVooMCk7Jztcblx0XHR9XG5cblx0XHQvLyBBZGQgb3VyIHJ1bGVzXG5cdFx0X3N0eWxlVGV4dCA9IFtcblx0XHRcdCcuZnRzY3JvbGxlcl9jb250YWluZXIgeyBvdmVyZmxvdzogaGlkZGVuOyBwb3NpdGlvbjogcmVsYXRpdmU7IG1heC1oZWlnaHQ6IDEwMCU7IC13ZWJraXQtdGFwLWhpZ2hsaWdodC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwKTsgLW1zLXRvdWNoLWFjdGlvbjogbm9uZSB9Jyxcblx0XHRcdCcuZnRzY3JvbGxlcl9od2FjY2VsZXJhdGVkIHsgJyArIGhhcmR3YXJlQWNjZWxlcmF0aW9uUnVsZSAgKyAnIH0nLFxuXHRcdFx0Jy5mdHNjcm9sbGVyX3gsIC5mdHNjcm9sbGVyX3kgeyBwb3NpdGlvbjogcmVsYXRpdmU7IG1pbi13aWR0aDogMTAwJTsgbWluLWhlaWdodDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbiB9Jyxcblx0XHRcdCcuZnRzY3JvbGxlcl94IHsgZGlzcGxheTogaW5saW5lLWJsb2NrIH0nLFxuXHRcdFx0Jy5mdHNjcm9sbGVyX3Njcm9sbGJhciB7IHBvaW50ZXItZXZlbnRzOiBub25lOyBwb3NpdGlvbjogYWJzb2x1dGU7IHdpZHRoOiA1cHg7IGhlaWdodDogNXB4OyBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpOyAtd2Via2l0LWJvcmRlci1yYWRpdXM6IDNweDsgYm9yZGVyLXJhZGl1czogNnB4OyBvcGFjaXR5OiAwOyAnICsgX3ZlbmRvckNTU1ByZWZpeCArICd0cmFuc2l0aW9uOiBvcGFjaXR5IDM1MG1zOyB6LWluZGV4OiAxMDsgLXdlYmtpdC1ib3gtc2l6aW5nOiBjb250ZW50LWJveDsgLW1vei1ib3gtc2l6aW5nOiBjb250ZW50LWJveDsgYm94LXNpemluZzogY29udGVudC1ib3ggfScsXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyeCB7IGJvdHRvbTogMnB4OyBsZWZ0OiAycHggfScsXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyeSB7IHJpZ2h0OiAycHg7IHRvcDogMnB4IH0nLFxuXHRcdFx0Jy5mdHNjcm9sbGVyX3Njcm9sbGJhcmlubmVyIHsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLDAuNSk7IC13ZWJraXQtYm9yZGVyLXJhZGl1czogMnB4OyBib3JkZXItcmFkaXVzOiA0cHggLyA2cHggfScsXG5cdFx0XHQnLmZ0c2Nyb2xsZXJfc2Nyb2xsYmFyLmFjdGl2ZSB7IG9wYWNpdHk6IDE7ICcgKyBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zaXRpb246IG5vbmU7IC1vLXRyYW5zaXRpb246IGFsbCAwIG5vbmUgfSdcblx0XHRdO1xuXG5cdFx0aWYgKG5ld1N0eWxlTm9kZS5zdHlsZVNoZWV0KSB7XG5cdFx0XHRuZXdTdHlsZU5vZGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gX3N0eWxlVGV4dC5qb2luKCdcXG4nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bmV3U3R5bGVOb2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKF9zdHlsZVRleHQuam9pbignXFxuJykpKTtcblx0XHR9XG5cblx0XHQvLyBBZGQgdGhlIHN0eWxlc2hlZXRcblx0XHRzdHlsZXNoZWV0Q29udGFpbmVyTm9kZS5pbnNlcnRCZWZvcmUobmV3U3R5bGVOb2RlLCBzdHlsZXNoZWV0Q29udGFpbmVyTm9kZS5maXJzdENoaWxkKTtcblx0fSgpKTtcblxuXHQvKipcblx0ICogTWFzdGVyIGNvbnN0cnVjdG9yIGZvciB0aGUgc2Nyb2xsaW5nIGZ1bmN0aW9uLCBpbmNsdWRpbmcgd2hpY2ggZWxlbWVudCB0b1xuXHQgKiBjb25zdHJ1Y3QgdGhlIHNjcm9sbGVyIGluLCBhbmQgYW55IHNjcm9sbGluZyBvcHRpb25zLlxuXHQgKiBOb3RlIHRoYXQgYXBwLXdpZGUgb3B0aW9ucyBjYW4gYWxzbyBiZSBzZXQgdXNpbmcgYSBnbG9iYWwgRlRTY3JvbGxlck9wdGlvbnNcblx0ICogb2JqZWN0LlxuXHQgKi9cblx0RlRTY3JvbGxlciA9IGZ1bmN0aW9uIChkb21Ob2RlLCBvcHRpb25zKSB7XG5cdFx0dmFyIGtleTtcblx0XHR2YXIgZGVzdHJveSwgc2V0U25hcFNpemUsIHNjcm9sbFRvLCBzY3JvbGxCeSwgdXBkYXRlRGltZW5zaW9ucywgYWRkRXZlbnRMaXN0ZW5lciwgcmVtb3ZlRXZlbnRMaXN0ZW5lciwgX3N0YXJ0U2Nyb2xsLCBfdXBkYXRlU2Nyb2xsLCBfZW5kU2Nyb2xsLCBfZmluYWxpemVTY3JvbGwsIF9pbnRlcnJ1cHRTY3JvbGwsIF9mbGluZ1Njcm9sbCwgX3NuYXBTY3JvbGwsIF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzLCBfZ2V0U25hcEluZGV4Rm9yUG9zaXRpb24sIF9saW1pdFRvQm91bmRzLCBfaW5pdGlhbGl6ZURPTSwgX2V4aXN0aW5nRE9NVmFsaWQsIF9kb21DaGFuZ2VkLCBfdXBkYXRlRGltZW5zaW9ucywgX3VwZGF0ZVNjcm9sbGJhckRpbWVuc2lvbnMsIF91cGRhdGVFbGVtZW50UG9zaXRpb24sIF91cGRhdGVTZWdtZW50cywgX3NldEF4aXNQb3NpdGlvbiwgX2dldFBvc2l0aW9uLCBfc2NoZWR1bGVBeGlzUG9zaXRpb24sIF9maXJlRXZlbnQsIF9jaGlsZEZvY3VzZWQsIF9tb2RpZnlEaXN0YW5jZUJleW9uZEJvdW5kcywgX2Rpc3RhbmNlc0JleW9uZEJvdW5kcywgX3N0YXJ0QW5pbWF0aW9uLCBfc2NoZWR1bGVSZW5kZXIsIF9jYW5jZWxBbmltYXRpb24sIF90b2dnbGVFdmVudEhhbmRsZXJzLCBfb25Ub3VjaFN0YXJ0LCBfb25Ub3VjaE1vdmUsIF9vblRvdWNoRW5kLCBfb25Nb3VzZURvd24sIF9vbk1vdXNlTW92ZSwgX29uTW91c2VVcCwgX29uUG9pbnRlckRvd24sIF9vblBvaW50ZXJNb3ZlLCBfb25Qb2ludGVyVXAsIF9vblBvaW50ZXJDYW5jZWwsIF9vblBvaW50ZXJDYXB0dXJlRW5kLCBfb25DbGljaywgX29uTW91c2VTY3JvbGwsIF9jYXB0dXJlSW5wdXQsIF9yZWxlYXNlSW5wdXRDYXB0dXJlLCBfZ2V0Qm91bmRpbmdSZWN0O1xuXG5cblx0XHQvKiBOb3RlIHRoYXQgYWN0dWFsIG9iamVjdCBpbnN0YW50aWF0aW9uIG9jY3VycyBhdCB0aGUgZW5kIG9mIHRoZSBjbG9zdXJlIHRvIGF2b2lkIGpzbGludCBlcnJvcnMgKi9cblxuXG5cdFx0LyogICAgICAgICAgICAgICAgICAgICAgICAgT3B0aW9ucyAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuXHRcdHZhciBfaW5zdGFuY2VPcHRpb25zID0ge1xuXG5cdFx0XHQvLyBXaGV0aGVyIHRvIGRpc3BsYXkgc2Nyb2xsYmFycyBhcyBhcHByb3ByaWF0ZVxuXHRcdFx0c2Nyb2xsYmFyczogdHJ1ZSxcblxuXHRcdFx0Ly8gRW5hYmxlIHNjcm9sbGluZyBvbiB0aGUgWCBheGlzIGlmIGNvbnRlbnQgaXMgYXZhaWxhYmxlXG5cdFx0XHRzY3JvbGxpbmdYOiB0cnVlLFxuXG5cdFx0XHQvLyBFbmFibGUgc2Nyb2xsaW5nIG9uIHRoZSBZIGF4aXMgaWYgY29udGVudCBpcyBhdmFpbGFibGVcblx0XHRcdHNjcm9sbGluZ1k6IHRydWUsXG5cblx0XHRcdC8vIFRoZSBpbml0aWFsIG1vdmVtZW50IHJlcXVpcmVkIHRvIHRyaWdnZXIgYSBzY3JvbGwsIGluIHBpeGVsczsgdGhpcyBpcyB0aGUgcG9pbnQgYXQgd2hpY2hcblx0XHRcdC8vIHRoZSBzY3JvbGwgaXMgZXhjbHVzaXZlIHRvIHRoaXMgcGFydGljdWxhciBGVFNjcm9sbGVyIGluc3RhbmNlLlxuXHRcdFx0c2Nyb2xsQm91bmRhcnk6IDEsXG5cblx0XHRcdC8vIFRoZSBpbml0aWFsIG1vdmVtZW50IHJlcXVpcmVkIHRvIHRyaWdnZXIgYSB2aXN1YWwgaW5kaWNhdGlvbiB0aGF0IHNjcm9sbGluZyBpcyBvY2N1cnJpbmcsXG5cdFx0XHQvLyBpbiBwaXhlbHMuICBUaGlzIGlzIGVuZm9yY2VkIHRvIGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB0aGUgc2Nyb2xsQm91bmRhcnksIGFuZCBpcyB1c2VkIHRvXG5cdFx0XHQvLyBkZWZpbmUgd2hlbiB0aGUgc2Nyb2xsZXIgc3RhcnRzIGRyYXdpbmcgY2hhbmdlcyBpbiByZXNwb25zZSB0byBhbiBpbnB1dCwgZXZlbiBpZiB0aGUgc2Nyb2xsXG5cdFx0XHQvLyBpcyBub3QgdHJlYXRlZCBhcyBoYXZpbmcgYmVndW4vbG9ja2VkIHlldC5cblx0XHRcdHNjcm9sbFJlc3BvbnNlQm91bmRhcnk6IDEsXG5cblx0XHRcdC8vIFdoZXRoZXIgdG8gYWx3YXlzIGVuYWJsZSBzY3JvbGxpbmcsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgb2YgdGhlIHNjcm9sbGVyIGRvZXMgbm90XG5cdFx0XHQvLyByZXF1aXJlIHRoZSBzY3JvbGxlciB0byBmdW5jdGlvbi4gIFRoaXMgbWFrZXMgdGhlIHNjcm9sbGVyIGJlaGF2ZSBtb3JlIGxpa2UgYW5cblx0XHRcdC8vIGVsZW1lbnQgc2V0IHRvIFwib3ZlcmZsb3c6IHNjcm9sbFwiLCB3aXRoIGJvdW5jaW5nIGFsd2F5cyBvY2N1cnJpbmcgaWYgZW5hYmxlZC5cblx0XHRcdGFsd2F5c1Njcm9sbDogZmFsc2UsXG5cblx0XHRcdC8vIFRoZSBjb250ZW50IHdpZHRoIHRvIHVzZSB3aGVuIGRldGVybWluaW5nIHNjcm9sbGVyIGRpbWVuc2lvbnMuICBJZiB0aGlzXG5cdFx0XHQvLyBpcyBmYWxzZSwgdGhlIHdpZHRoIHdpbGwgYmUgZGV0ZWN0ZWQgYmFzZWQgb24gdGhlIGFjdHVhbCBjb250ZW50LlxuXHRcdFx0Y29udGVudFdpZHRoOiB1bmRlZmluZWQsXG5cblx0XHRcdC8vIFRoZSBjb250ZW50IGhlaWdodCB0byB1c2Ugd2hlbiBkZXRlcm1pbmluZyBzY3JvbGxlciBkaW1lbnNpb25zLiAgSWYgdGhpc1xuXHRcdFx0Ly8gaXMgZmFsc2UsIHRoZSBoZWlnaHQgd2lsbCBiZSBkZXRlY3RlZCBiYXNlZCBvbiB0aGUgYWN0dWFsIGNvbnRlbnQuXG5cdFx0XHRjb250ZW50SGVpZ2h0OiB1bmRlZmluZWQsXG5cblx0XHRcdC8vIEVuYWJsZSBzbmFwcGluZyBvZiBjb250ZW50IHRvICdwYWdlcycgb3IgYSBwaXhlbCBncmlkXG5cdFx0XHRzbmFwcGluZzogZmFsc2UsXG5cblx0XHRcdC8vIERlZmluZSB0aGUgaG9yaXpvbnRhbCBpbnRlcnZhbCBvZiB0aGUgcGl4ZWwgZ3JpZDsgc25hcHBpbmcgbXVzdCBiZSBlbmFibGVkIGZvciB0aGlzIHRvXG5cdFx0XHQvLyB0YWtlIGVmZmVjdC4gIElmIHRoaXMgaXMgbm90IGRlZmluZWQsIHNuYXBwaW5nIHdpbGwgdXNlIGludGVydmFscyBiYXNlZCBvbiBjb250YWluZXIgc2l6ZS5cblx0XHRcdHNuYXBTaXplWDogdW5kZWZpbmVkLFxuXG5cdFx0XHQvLyBEZWZpbmUgdGhlIHZlcnRpY2FsIGludGVydmFsIG9mIHRoZSBwaXhlbCBncmlkOyBzbmFwcGluZyBtdXN0IGJlIGVuYWJsZWQgZm9yIHRoaXMgdG9cblx0XHRcdC8vIHRha2UgZWZmZWN0LiAgSWYgdGhpcyBpcyBub3QgZGVmaW5lZCwgc25hcHBpbmcgd2lsbCB1c2UgaW50ZXJ2YWxzIGJhc2VkIG9uIGNvbnRhaW5lciBzaXplLlxuXHRcdFx0c25hcFNpemVZOiB1bmRlZmluZWQsXG5cblx0XHRcdC8vIENvbnRyb2wgd2hldGhlciBzbmFwcGluZyBzaG91bGQgYmUgZnVsbHkgcGFnaW5hdGVkLCBvbmx5IGV2ZXIgZmxpY2tpbmcgdG8gdGhlIG5leHQgcGFnZVxuXHRcdFx0Ly8gYW5kIG5vdCBiZXlvbmQuICBTbmFwcGluZyBuZWVkcyB0byBiZSBlbmFibGVkIGZvciB0aGlzIHRvIHRha2UgZWZmZWN0LlxuXHRcdFx0cGFnaW5hdGVkU25hcDogZmFsc2UsXG5cblx0XHRcdC8vIEFsbG93IHNjcm9sbCBib3VuY2luZyBhbmQgZWxhc3RpY2l0eSBuZWFyIHRoZSBlbmRzIGFuZCBncmlkXG5cdFx0XHRib3VuY2luZzogdHJ1ZSxcblxuXHRcdFx0Ly8gQWxsb3cgYSBmYXN0IHNjcm9sbCB0byBjb250aW51ZSB3aXRoIG1vbWVudHVtIHdoZW4gcmVsZWFzZWRcblx0XHRcdGZsaW5naW5nOiB0cnVlLFxuXG5cdFx0XHQvLyBBdXRvbWF0aWNhbGx5IGRldGVjdHMgY2hhbmdlcyB0byB0aGUgY29udGFpbmVkIG1hcmt1cCBhbmRcblx0XHRcdC8vIHVwZGF0ZXMgaXRzIGRpbWVuc2lvbnMgd2hlbmV2ZXIgdGhlIGNvbnRlbnQgY2hhbmdlcy4gVGhpcyBpc1xuXHRcdFx0Ly8gc2V0IHRvIGZhbHNlIGlmIGEgY29udGVudFdpZHRoIG9yIGNvbnRlbnRIZWlnaHQgYXJlIHN1cHBsaWVkLlxuXHRcdFx0dXBkYXRlT25DaGFuZ2VzOiB0cnVlLFxuXG5cdFx0XHQvLyBBdXRvbWF0aWNhbGx5IGNhdGNoZXMgY2hhbmdlcyB0byB0aGUgd2luZG93IHNpemUgYW5kIHVwZGF0ZXNcblx0XHRcdC8vIGl0cyBkaW1lbnNpb25zLlxuXHRcdFx0dXBkYXRlT25XaW5kb3dSZXNpemU6IGZhbHNlLFxuXG5cdFx0XHQvLyBUaGUgYWxpZ25tZW50IHRvIHVzZSBpZiB0aGUgY29udGVudCBpcyBzbWFsbGVyIHRoYW4gdGhlIGNvbnRhaW5lcjtcblx0XHRcdC8vIHRoaXMgYWxzbyBhcHBsaWVzIHRvIGluaXRpYWwgcG9zaXRpb25pbmcgb2Ygc2Nyb2xsYWJsZSBjb250ZW50LlxuXHRcdFx0Ly8gVmFsaWQgYWxpZ25tZW50cyBhcmUgLTEgKHRvcCBvciBsZWZ0KSwgMCAoY2VudGVyKSwgYW5kIDEgKGJvdHRvbSBvciByaWdodCkuXG5cdFx0XHRiYXNlQWxpZ25tZW50czogeyB4OiAtMSwgeTogLTEgfSxcblxuXHRcdFx0Ly8gV2hldGhlciB0byB1c2UgYSB3aW5kb3cgc2Nyb2xsIGZsYWcsIGVnIHdpbmRvdy5mb28sIHRvIGNvbnRyb2wgd2hldGhlclxuXHRcdFx0Ly8gdG8gYWxsb3cgc2Nyb2xsaW5nIHRvIHN0YXJ0IG9yIG5vdy4gIElmIHRoZSB3aW5kb3cgZmxhZyBpcyBzZXQgdG8gdHJ1ZSxcblx0XHRcdC8vIHRoaXMgZWxlbWVudCB3aWxsIG5vdCBzdGFydCBzY3JvbGxpbmc7IHRoaXMgZWxlbWVudCB3aWxsIGFsc28gdG9nZ2xlXG5cdFx0XHQvLyB0aGUgdmFyaWFibGUgd2hpbGUgc2Nyb2xsaW5nXG5cdFx0XHR3aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnOiB1bmRlZmluZWQsXG5cblx0XHRcdC8vIEluc3RlYWQgb2YgYWx3YXlzIHVzaW5nIHRyYW5zbGF0ZTNkIGZvciB0cmFuc2Zvcm1zLCBhIG1peCBvZiB0cmFuc2xhdGUzZFxuXHRcdFx0Ly8gYW5kIHRyYW5zbGF0ZSB3aXRoIGEgaGFyZHdhcmUgYWNjZWxlcmF0aW9uIGNsYXNzIHVzZWQgdG8gdHJpZ2dlciBhY2NlbGVyYXRpb25cblx0XHRcdC8vIGlzIHVzZWQ7IHRoaXMgaXMgdG8gYWxsb3cgQ1NTIGluaGVyaXRhbmNlIHRvIGJlIHVzZWQgdG8gYWxsb3cgZHluYW1pY1xuXHRcdFx0Ly8gZGlzYWJsaW5nIG9mIGJhY2tpbmcgbGF5ZXJzIG9uIG9sZGVyIHBsYXRmb3Jtcy5cblx0XHRcdGh3QWNjZWxlcmF0aW9uQ2xhc3M6ICdmdHNjcm9sbGVyX2h3YWNjZWxlcmF0ZWQnLFxuXG5cdFx0XHQvLyBXaGlsZSB1c2Ugb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGlzIGhpZ2hseSByZWNvbW1lbmRlZCBvbiBwbGF0Zm9ybXNcblx0XHRcdC8vIHdoaWNoIHN1cHBvcnQgaXQsIGl0IGNhbiByZXN1bHQgaW4gdGhlIGFuaW1hdGlvbiBiZWluZyBhIGZ1cnRoZXIgaGFsZi1mcmFtZVxuXHRcdFx0Ly8gYmVoaW5kIHRoZSBpbnB1dCBtZXRob2QsIGluY3JlYXNpbmcgcGVyY2VpdmVkIGxhZyBzbGlnaHRseS4gIFRvIGRpc2FibGUgdGhpcyxcblx0XHRcdC8vIHNldCB0aGlzIHByb3BlcnR5IHRvIGZhbHNlLlxuXHRcdFx0ZW5hYmxlUmVxdWVzdEFuaW1hdGlvbkZyYW1lU3VwcG9ydDogdHJ1ZSxcblxuXHRcdFx0Ly8gU2V0IHRoZSBtYXhpbXVtIHRpbWUgKG1zKSB0aGF0IGEgZmxpbmcgY2FuIHRha2UgdG8gY29tcGxldGU7IGlmXG5cdFx0XHQvLyB0aGlzIGlzIG5vdCBzZXQsIGZsaW5ncyB3aWxsIGNvbXBsZXRlIGluc3RhbnRseVxuXHRcdFx0bWF4RmxpbmdEdXJhdGlvbjogMTAwMCxcblxuXHRcdFx0Ly8gV2hldGhlciB0byBkaXNhYmxlIGFueSBpbnB1dCBtZXRob2RzOyBvbiBzb21lIG11bHRpLWlucHV0IGRldmljZXNcblx0XHRcdC8vIGN1c3RvbSBiZWhhdmlvdXIgbWF5IGJlIGRlc2lyZWQgZm9yIHNvbWUgc2Nyb2xsZXJzLiAgVXNlIHdpdGggY2FyZSFcblx0XHRcdGRpc2FibGVkSW5wdXRNZXRob2RzOiB7XG5cdFx0XHRcdG1vdXNlOiBmYWxzZSxcblx0XHRcdFx0dG91Y2g6IGZhbHNlLFxuXHRcdFx0XHRzY3JvbGw6IGZhbHNlXG5cdFx0XHR9LFxuXG5cdFx0XHQvLyBEZWZpbmUgYSBzY3JvbGxpbmcgY2xhc3MgdG8gYmUgYWRkZWQgdG8gdGhlIHNjcm9sbGVyIGNvbnRhaW5lclxuXHRcdFx0Ly8gd2hlbiBzY3JvbGxpbmcgaXMgYWN0aXZlLiAgTm90ZSB0aGF0IHRoaXMgY2FuIGNhdXNlIGEgcmVsYXlvdXQgb25cblx0XHRcdC8vIHNjcm9sbCBzdGFydCBpZiBkZWZpbmVkLCBidXQgYWxsb3dzIGN1c3RvbSBzdHlsaW5nIGluIHJlc3BvbnNlIHRvIHNjcm9sbHNcblx0XHRcdHNjcm9sbGluZ0NsYXNzTmFtZTogdW5kZWZpbmVkLFxuXG5cdFx0XHQvLyBCZXppZXIgY3VydmVzIGRlZmluaW5nIHRoZSBmZWVsIG9mIHRoZSBmbGluZyAobW9tZW50dW0pIGRlY2VsZXJhdGlvbixcblx0XHRcdC8vIHRoZSBib3VuY2UgZGVjbGVyYXRpb24gZGVjZWxlcmF0aW9uIChhcyBhIGZsaW5nIGV4Y2VlZHMgdGhlIGJvdW5kcyksXG5cdFx0XHQvLyBhbmQgdGhlIGJvdW5jZSBiZXppZXIgKHVzZWQgZm9yIGJvdW5jaW5nIGJhY2spLlxuXHRcdFx0ZmxpbmdCZXppZXI6IG5ldyBDdWJpY0JlemllcigwLjEwMywgMC4zODksIDAuMzA3LCAwLjk2NiksXG5cdFx0XHRib3VuY2VEZWNlbGVyYXRpb25CZXppZXI6IG5ldyBDdWJpY0JlemllcigwLCAwLjUsIDAuNSwgMSksXG5cdFx0XHRib3VuY2VCZXppZXI6IG5ldyBDdWJpY0JlemllcigwLjcsIDAsIDAuOSwgMC42KVxuXHRcdH07XG5cblxuXHRcdC8qICAgICAgICAgICAgICAgICAgICAgTG9jYWwgdmFyaWFibGVzICAgICAgICAgICAgICAgICAgICovXG5cblx0XHQvLyBDYWNoZSB0aGUgRE9NIG5vZGUgYW5kIHNldCB1cCB2YXJpYWJsZXMgZm9yIG90aGVyIG5vZGVzXG5cdFx0dmFyIF9wdWJsaWNTZWxmO1xuXHRcdHZhciBfc2VsZiA9IHRoaXM7XG5cdFx0dmFyIF9zY3JvbGxhYmxlTWFzdGVyTm9kZSA9IGRvbU5vZGU7XG5cdFx0dmFyIF9jb250YWluZXJOb2RlO1xuXHRcdHZhciBfY29udGVudFBhcmVudE5vZGU7XG5cdFx0dmFyIF9zY3JvbGxOb2RlcyA9IHsgeDogbnVsbCwgeTogbnVsbCB9O1xuXHRcdHZhciBfc2Nyb2xsYmFyTm9kZXMgPSB7IHg6IG51bGwsIHk6IG51bGwgfTtcblxuXHRcdC8vIERpbWVuc2lvbnMgb2YgdGhlIGNvbnRhaW5lciBlbGVtZW50IGFuZCB0aGUgY29udGVudCBlbGVtZW50XG5cdFx0dmFyIF9tZXRyaWNzID0ge1xuXHRcdFx0Y29udGFpbmVyOiB7IHg6IG51bGwsIHk6IG51bGwgfSxcblx0XHRcdGNvbnRlbnQ6IHsgeDogbnVsbCwgeTogbnVsbCwgcmF3WDogbnVsbCwgcmF3WTogbnVsbCB9LFxuXHRcdFx0c2Nyb2xsRW5kOiB7IHg6IG51bGwsIHk6IG51bGwgfVxuXHRcdH07XG5cblx0XHQvLyBTbmFwcGluZyBkZXRhaWxzXG5cdFx0dmFyIF9zbmFwR3JpZFNpemUgPSB7XG5cdFx0XHR4OiBmYWxzZSxcblx0XHRcdHk6IGZhbHNlLFxuXHRcdFx0dXNlclg6IGZhbHNlLFxuXHRcdFx0dXNlclk6IGZhbHNlXG5cdFx0fTtcblx0XHR2YXIgX3NuYXBJbmRleCA9IHtcblx0XHRcdHg6IDAsXG5cdFx0XHR5OiAwXG5cdFx0fTtcblx0XHR2YXIgX2Jhc2VTZWdtZW50ID0geyB4OiAwLCB5OiAwIH07XG5cdFx0dmFyIF9hY3RpdmVTZWdtZW50ID0geyB4OiAwLCB5OiAwIH07XG5cblx0XHQvLyBUcmFjayB0aGUgaWRlbnRpZmllciBvZiBhbnkgaW5wdXQgYmVpbmcgdHJhY2tlZFxuXHRcdHZhciBfaW5wdXRJZGVudGlmaWVyID0gZmFsc2U7XG5cdFx0dmFyIF9pbnB1dEluZGV4ID0gMDtcblx0XHR2YXIgX2lucHV0Q2FwdHVyZWQgPSBmYWxzZTtcblxuXHRcdC8vIEN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9ucyBhbmQgdHJhY2tpbmdcblx0XHR2YXIgX2lzU2Nyb2xsaW5nID0gZmFsc2U7XG5cdFx0dmFyIF9pc0Rpc3BsYXlpbmdTY3JvbGwgPSBmYWxzZTtcblx0XHR2YXIgX2lzQW5pbWF0aW5nID0gZmFsc2U7XG5cdFx0dmFyIF9iYXNlU2Nyb2xsUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfTtcblx0XHR2YXIgX2xhc3RTY3JvbGxQb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xuXHRcdHZhciBfdGFyZ2V0U2Nyb2xsUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfTtcblx0XHR2YXIgX3Njcm9sbEF0RXh0cmVtaXR5ID0geyB4OiBudWxsLCB5OiBudWxsIH07XG5cdFx0dmFyIF9wcmV2ZW50Q2xpY2sgPSBmYWxzZTtcblx0XHR2YXIgX3RpbWVvdXRzID0gW107XG5cdFx0dmFyIF9oYXNCZWVuU2Nyb2xsZWQgPSBmYWxzZTtcblxuXHRcdC8vIEdlc3R1cmUgZGV0YWlsc1xuXHRcdHZhciBfYmFzZVNjcm9sbGFibGVBeGVzID0ge307XG5cdFx0dmFyIF9zY3JvbGxhYmxlQXhlcyA9IHsgeDogdHJ1ZSwgeTogdHJ1ZSB9O1xuXHRcdHZhciBfZ2VzdHVyZVN0YXJ0ID0geyB4OiAwLCB5OiAwLCB0OiAwIH07XG5cdFx0dmFyIF9jdW11bGF0aXZlU2Nyb2xsID0geyB4OiAwLCB5OiAwIH07XG5cdFx0dmFyIF9ldmVudEhpc3RvcnkgPSBbXTtcblxuXHRcdC8vIEFsbG93IGNlcnRhaW4gZXZlbnRzIHRvIGJlIGRlYm91bmNlZFxuXHRcdHZhciBfZG9tQ2hhbmdlRGVib3VuY2VyID0gZmFsc2U7XG5cdFx0dmFyIF9zY3JvbGxXaGVlbEVuZERlYm91bmNlciA9IGZhbHNlO1xuXG5cdFx0Ly8gUGVyZm9ybWFuY2Ugc3dpdGNoZXMgb24gYnJvd3NlcnMgc3VwcG9ydGluZyByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblx0XHR2YXIgX2FuaW1hdGlvbkZyYW1lUmVxdWVzdCA9IGZhbHNlO1xuXHRcdHZhciBfcmVxQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgZmFsc2U7XG5cdFx0dmFyIF9jYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cuY2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubW96Q2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0Q2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBmYWxzZTtcblxuXHRcdC8vIEV2ZW50IGxpc3RlbmVyc1xuXHRcdHZhciBfZXZlbnRMaXN0ZW5lcnMgPSB7XG5cdFx0XHQnc2Nyb2xsc3RhcnQnOiBbXSxcblx0XHRcdCdzY3JvbGwnOiBbXSxcblx0XHRcdCdzY3JvbGxlbmQnOiBbXSxcblx0XHRcdCdzZWdtZW50d2lsbGNoYW5nZSc6IFtdLFxuXHRcdFx0J3NlZ21lbnRkaWRjaGFuZ2UnOiBbXSxcblx0XHRcdCdyZWFjaGVkc3RhcnQnOiBbXSxcblx0XHRcdCdyZWFjaGVkZW5kJzogW10sXG5cdFx0XHQnc2Nyb2xsaW50ZXJhY3Rpb25lbmQnOiBbXVxuXHRcdH07XG5cblx0XHQvLyBNdXRhdGlvbk9ic2VydmVyIGluc3RhbmNlLCB3aGVuIHN1cHBvcnRlZCBhbmQgaWYgRE9NIGNoYW5nZSBzbmlmZmluZyBpcyBlbmFibGVkXG5cdFx0dmFyIF9tdXRhdGlvbk9ic2VydmVyO1xuXG5cblx0XHQvKiBQYXJzaW5nIHN1cHBsaWVkIG9wdGlvbnMgKi9cblxuXHRcdC8vIE92ZXJyaWRlIGRlZmF1bHQgaW5zdGFuY2Ugb3B0aW9ucyB3aXRoIGdsb2JhbCAtIG9yIGNsb3N1cmUnZCAtIG9wdGlvbnNcblx0XHRpZiAodHlwZW9mIEZUU2Nyb2xsZXJPcHRpb25zID09PSAnb2JqZWN0JyAmJiBGVFNjcm9sbGVyT3B0aW9ucykge1xuXHRcdFx0Zm9yIChrZXkgaW4gRlRTY3JvbGxlck9wdGlvbnMpIHtcblx0XHRcdFx0aWYgKEZUU2Nyb2xsZXJPcHRpb25zLmhhc093blByb3BlcnR5KGtleSkgJiYgX2luc3RhbmNlT3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0X2luc3RhbmNlT3B0aW9uc1trZXldID0gRlRTY3JvbGxlck9wdGlvbnNba2V5XTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIE92ZXJyaWRlIGRlZmF1bHQgYW5kIGdsb2JhbCBvcHRpb25zIHdpdGggc3VwcGxpZWQgb3B0aW9uc1xuXHRcdGlmIChvcHRpb25zKSB7XG5cdFx0XHRmb3IgKGtleSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KGtleSkgJiYgX2luc3RhbmNlT3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0X2luc3RhbmNlT3B0aW9uc1trZXldID0gb3B0aW9uc1trZXldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIHNuYXAgZ3JpZCBzaXplIG9wdGlvbnMgd2VyZSBzdXBwbGllZCwgc3RvcmUgdGhlbVxuXHRcdFx0aWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ3NuYXBTaXplWCcpICYmICFpc05hTihvcHRpb25zLnNuYXBTaXplWCkpIHtcblx0XHRcdFx0X3NuYXBHcmlkU2l6ZS51c2VyWCA9IF9zbmFwR3JpZFNpemUueCA9IG9wdGlvbnMuc25hcFNpemVYO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ3NuYXBTaXplWScpICYmICFpc05hTihvcHRpb25zLnNuYXBTaXplWSkpIHtcblx0XHRcdFx0X3NuYXBHcmlkU2l6ZS51c2VyWSA9IF9zbmFwR3JpZFNpemUueSA9IG9wdGlvbnMuc25hcFNpemVZO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiBjb250ZW50IHdpZHRoIGFuZCBoZWlnaHQgd2VyZSBkZWZpbmVkLCBkaXNhYmxlIHVwZGF0ZU9uQ2hhbmdlcyBmb3IgcGVyZm9ybWFuY2Vcblx0XHRcdGlmIChvcHRpb25zLmNvbnRlbnRXaWR0aCAmJiBvcHRpb25zLmNvbnRlbnRIZWlnaHQpIHtcblx0XHRcdFx0b3B0aW9ucy51cGRhdGVPbkNoYW5nZXMgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBWYWxpZGF0ZSB0aGUgc2Nyb2xsIHJlc3BvbnNlIHBhcmFtZXRlclxuXHRcdF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsUmVzcG9uc2VCb3VuZGFyeSA9IE1hdGgubWluKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsQm91bmRhcnksIF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsUmVzcG9uc2VCb3VuZGFyeSk7XG5cblx0XHQvLyBVcGRhdGUgYmFzZSBzY3JvbGxhYmxlIGF4ZXNcblx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XG5cdFx0XHRfYmFzZVNjcm9sbGFibGVBeGVzLnggPSB0cnVlO1xuXHRcdH1cblx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XG5cdFx0XHRfYmFzZVNjcm9sbGFibGVBeGVzLnkgPSB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIE9ubHkgZW5hYmxlIGFuaW1hdGlvbiBmcmFtZSBzdXBwb3J0IGlmIHRoZSBpbnN0YW5jZSBvcHRpb25zIHBlcm1pdCBpdFxuXHRcdF9yZXFBbmltYXRpb25GcmFtZSA9IF9pbnN0YW5jZU9wdGlvbnMuZW5hYmxlUmVxdWVzdEFuaW1hdGlvbkZyYW1lU3VwcG9ydCAmJiBfcmVxQW5pbWF0aW9uRnJhbWU7XG5cdFx0X2NhbmNlbEFuaW1hdGlvbkZyYW1lID0gX3JlcUFuaW1hdGlvbkZyYW1lICYmIF9jYW5jZWxBbmltYXRpb25GcmFtZTtcblxuXG5cdFx0LyogICAgICAgICAgICAgICAgICAgIFNjb3BlZCBGdW5jdGlvbnMgICAgICAgICAgICAgICAgICAgKi9cblxuXHRcdC8qKlxuXHRcdCAqIFVuYmluZHMgYWxsIGV2ZW50IGxpc3RlbmVycyB0byBwcmV2ZW50IGNpcmN1bGFyIHJlZmVyZW5jZXMgcHJldmVudGluZyBpdGVtc1xuXHRcdCAqIGZyb20gYmVpbmcgZGVhbGxvY2F0ZWQsIGFuZCBjbGVhbiB1cCByZWZlcmVuY2VzIHRvIGRvbSBlbGVtZW50cy4gUGFzcyBpblxuXHRcdCAqIFwicmVtb3ZlRWxlbWVudHNcIiB0byBhbHNvIHJlbW92ZSBGVFNjcm9sbGVyIERPTSBlbGVtZW50cyBmb3Igc3BlY2lhbCByZXVzZSBjYXNlcy5cblx0XHQgKi9cblx0XHRkZXN0cm95ID0gZnVuY3Rpb24gZGVzdHJveShyZW1vdmVFbGVtZW50cykge1xuXHRcdFx0dmFyIGksIGw7XG5cblx0XHRcdF90b2dnbGVFdmVudEhhbmRsZXJzKGZhbHNlKTtcblx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcblx0XHRcdGlmIChfZG9tQ2hhbmdlRGVib3VuY2VyKSB7XG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX2RvbUNoYW5nZURlYm91bmNlcik7XG5cdFx0XHRcdF9kb21DaGFuZ2VEZWJvdW5jZXIgPSBmYWxzZTtcblx0XHRcdH1cblx0XHRcdGZvciAoaSA9IDAsIGwgPSBfdGltZW91dHMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX3RpbWVvdXRzW2ldKTtcblx0XHRcdH1cblx0XHRcdF90aW1lb3V0cy5sZW5ndGggPSAwO1xuXG5cdFx0XHQvLyBEZXN0cm95IERPTSBlbGVtZW50cyBpZiByZXF1aXJlZFxuXHRcdFx0aWYgKHJlbW92ZUVsZW1lbnRzICYmIF9zY3JvbGxhYmxlTWFzdGVyTm9kZSkge1xuXHRcdFx0XHR3aGlsZSAoX2NvbnRlbnRQYXJlbnROb2RlLmZpcnN0Q2hpbGQpIHtcblx0XHRcdFx0XHRfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuYXBwZW5kQ2hpbGQoX2NvbnRlbnRQYXJlbnROb2RlLmZpcnN0Q2hpbGQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5yZW1vdmVDaGlsZChfY29udGFpbmVyTm9kZSk7XG5cdFx0XHR9XG5cblx0XHRcdF9zY3JvbGxhYmxlTWFzdGVyTm9kZSA9IG51bGw7XG5cdFx0XHRfY29udGFpbmVyTm9kZSA9IG51bGw7XG5cdFx0XHRfY29udGVudFBhcmVudE5vZGUgPSBudWxsO1xuXHRcdFx0X3Njcm9sbE5vZGVzLnggPSBudWxsO1xuXHRcdFx0X3Njcm9sbE5vZGVzLnkgPSBudWxsO1xuXHRcdFx0X3Njcm9sbGJhck5vZGVzLnggPSBudWxsO1xuXHRcdFx0X3Njcm9sbGJhck5vZGVzLnkgPSBudWxsO1xuXHRcdFx0Zm9yIChpIGluIF9ldmVudExpc3RlbmVycykge1xuXHRcdFx0XHRpZiAoX2V2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRcdFx0X2V2ZW50TGlzdGVuZXJzW2ldLmxlbmd0aCA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgdGhpcyBpcyBjdXJyZW50bHkgdHJhY2tlZCBhcyBhIHNjcm9sbGluZyBpbnN0YW5jZSwgY2xlYXIgdGhlIGZsYWdcblx0XHRcdGlmIChfZnRzY3JvbGxlck1vdmluZyAmJiBfZnRzY3JvbGxlck1vdmluZyA9PT0gX3NlbGYpIHtcblx0XHRcdFx0X2Z0c2Nyb2xsZXJNb3ZpbmcgPSBmYWxzZTtcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZykge1xuXHRcdFx0XHRcdHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQ29uZmlndXJlcyB0aGUgc25hcHBpbmcgYm91bmRhcmllcyB3aXRoaW4gdGhlIHNjcm9sbGluZyBlbGVtZW50IGlmXG5cdFx0ICogc25hcHBpbmcgaXMgYWN0aXZlLiAgSWYgdGhpcyBpcyBuZXZlciBjYWxsZWQsIHNuYXBwaW5nIGRlZmF1bHRzIHRvXG5cdFx0ICogdXNpbmcgdGhlIGJvdW5kaW5nIGJveCwgZWcgcGFnZS1hdC1hLXRpbWUuXG5cdFx0ICovXG5cdFx0c2V0U25hcFNpemUgPSBmdW5jdGlvbiBzZXRTbmFwU2l6ZSh3aWR0aCwgaGVpZ2h0KSB7XG5cdFx0XHRfc25hcEdyaWRTaXplLnVzZXJYID0gd2lkdGg7XG5cdFx0XHRfc25hcEdyaWRTaXplLnVzZXJZID0gaGVpZ2h0O1xuXHRcdFx0X3NuYXBHcmlkU2l6ZS54ID0gd2lkdGg7XG5cdFx0XHRfc25hcEdyaWRTaXplLnkgPSBoZWlnaHQ7XG5cblx0XHRcdC8vIEVuc3VyZSB0aGUgY29udGVudCBkaW1lbnNpb25zIGNvbmZvcm0gdG8gdGhlIGdyaWRcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQueCA9IE1hdGguY2VpbChfbWV0cmljcy5jb250ZW50LnJhd1ggLyB3aWR0aCkgKiB3aWR0aDtcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQueSA9IE1hdGguY2VpbChfbWV0cmljcy5jb250ZW50LnJhd1kgLyBoZWlnaHQpICogaGVpZ2h0O1xuXHRcdFx0X21ldHJpY3Muc2Nyb2xsRW5kLnggPSBfbWV0cmljcy5jb250YWluZXIueCAtIF9tZXRyaWNzLmNvbnRlbnQueDtcblx0XHRcdF9tZXRyaWNzLnNjcm9sbEVuZC55ID0gX21ldHJpY3MuY29udGFpbmVyLnkgLSBfbWV0cmljcy5jb250ZW50Lnk7XG5cdFx0XHRfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpO1xuXG5cdFx0XHQvLyBTbmFwIHRvIHRoZSBuZXcgZ3JpZCBpZiBuZWNlc3Nhcnlcblx0XHRcdF9zbmFwU2Nyb2xsKCk7XG5cdFx0XHRfdXBkYXRlU2VnbWVudHModHJ1ZSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFNjcm9sbCB0byBhIHN1cHBsaWVkIHBvc2l0aW9uLCBpbmNsdWRpbmcgd2hldGhlciBvciBub3QgdG8gYW5pbWF0ZSB0aGVcblx0XHQgKiBzY3JvbGwgYW5kIGhvdyBmYXN0IHRvIHBlcmZvcm0gdGhlIGFuaW1hdGlvbiAocGFzcyBpbiB0cnVlIHRvIHNlbGVjdCBhXG5cdFx0ICogZHluYW1pYyBkdXJhdGlvbikuICBUaGUgaW5wdXRzIHdpbGwgYmUgY29uc3RyYWluZWQgdG8gYm91bmRzIGFuZCBzbmFwcGVkLlxuXHRcdCAqIElmIGZhbHNlIGlzIHN1cHBsaWVkIGZvciBhIHBvc2l0aW9uLCB0aGF0IGF4aXMgd2lsbCBub3QgYmUgc2Nyb2xsZWQuXG5cdFx0ICovXG5cdFx0c2Nyb2xsVG8gPSBmdW5jdGlvbiBzY3JvbGxUbyhsZWZ0LCB0b3AsIGFuaW1hdGlvbkR1cmF0aW9uKSB7XG5cdFx0XHR2YXIgdGFyZ2V0UG9zaXRpb24sIGR1cmF0aW9uLCBwb3NpdGlvbnMsIGF4aXMsIG1heER1cmF0aW9uID0gMCwgc2Nyb2xsUG9zaXRpb25zVG9BcHBseSA9IHt9O1xuXG5cdFx0XHQvLyBJZiBhIG1hbnVhbCBzY3JvbGwgaXMgaW4gcHJvZ3Jlc3MsIGNhbmNlbCBpdFxuXHRcdFx0X2VuZFNjcm9sbChEYXRlLm5vdygpKTtcblxuXHRcdFx0Ly8gTW92ZSBzdXBwbGllZCBjb29yZGluYXRlcyBpbnRvIGFuIG9iamVjdCBmb3IgaXRlcmF0aW9uLCBhbHNvIGludmVydGluZyB0aGUgdmFsdWVzIGludG9cblx0XHRcdC8vIG91ciBjb29yZGluYXRlIHN5c3RlbVxuXHRcdFx0cG9zaXRpb25zID0ge1xuXHRcdFx0XHR4OiAtbGVmdCxcblx0XHRcdFx0eTogLXRvcFxuXHRcdFx0fTtcblxuXHRcdFx0Zm9yIChheGlzIGluIF9iYXNlU2Nyb2xsYWJsZUF4ZXMpIHtcblx0XHRcdFx0aWYgKF9iYXNlU2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcblx0XHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IHBvc2l0aW9uc1theGlzXTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0UG9zaXRpb24gPT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBDb25zdHJhaW4gdG8gYm91bmRzXG5cdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBNYXRoLm1pbigwLCBNYXRoLm1heChfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10sIHRhcmdldFBvc2l0aW9uKSk7XG5cblx0XHRcdFx0XHQvLyBTbmFwIGlmIGFwcHJvcHJpYXRlXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcgJiYgX3NuYXBHcmlkU2l6ZVtheGlzXSkge1xuXHRcdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb24gPSBNYXRoLnJvdW5kKHRhcmdldFBvc2l0aW9uIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIEdldCBhIGR1cmF0aW9uXG5cdFx0XHRcdFx0ZHVyYXRpb24gPSBhbmltYXRpb25EdXJhdGlvbiB8fCAwO1xuXHRcdFx0XHRcdGlmIChkdXJhdGlvbiA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0ZHVyYXRpb24gPSBNYXRoLnNxcnQoTWF0aC5hYnMoX2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXSAtIHRhcmdldFBvc2l0aW9uKSkgKiAyMDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBUcmlnZ2VyIHRoZSBwb3NpdGlvbiBjaGFuZ2Vcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIHRhcmdldFBvc2l0aW9uLCBkdXJhdGlvbik7XG5cdFx0XHRcdFx0c2Nyb2xsUG9zaXRpb25zVG9BcHBseVtheGlzXSA9IHRhcmdldFBvc2l0aW9uO1xuXHRcdFx0XHRcdG1heER1cmF0aW9uID0gTWF0aC5tYXgobWF4RHVyYXRpb24sIGR1cmF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiB0aGUgc2Nyb2xsIGhhZCByZXN1bHRlZCBpbiBhIGNoYW5nZSBpbiBwb3NpdGlvbiwgcGVyZm9ybSBzb21lIGFkZGl0aW9uYWwgYWN0aW9uczpcblx0XHRcdGlmIChfYmFzZVNjcm9sbFBvc2l0aW9uLnggIT09IHBvc2l0aW9ucy54IHx8IF9iYXNlU2Nyb2xsUG9zaXRpb24ueSAhPT0gcG9zaXRpb25zLnkpIHtcblxuXHRcdFx0XHQvLyBNYXJrIGEgc2Nyb2xsIGFzIGhhdmluZyBldmVyIG9jY3VycmVkXG5cdFx0XHRcdF9oYXNCZWVuU2Nyb2xsZWQgPSB0cnVlO1xuXG5cdFx0XHRcdC8vIElmIGFuIGFuaW1hdGlvbiBkdXJhdGlvbiBpcyBwcmVzZW50LCBmaXJlIGEgc2Nyb2xsIHN0YXJ0IGV2ZW50IGFuZCBhXG5cdFx0XHRcdC8vIHNjcm9sbCBldmVudCBmb3IgYW55IGxpc3RlbmVycyB0byBhY3Qgb25cblx0XHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsc3RhcnQnLCBfZ2V0UG9zaXRpb24oKSk7XG5cdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbCcsIF9nZXRQb3NpdGlvbigpKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG1heER1cmF0aW9uKSB7XG5cdFx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBhbkF4aXM7XG5cdFx0XHRcdFx0Zm9yIChhbkF4aXMgaW4gc2Nyb2xsUG9zaXRpb25zVG9BcHBseSkge1xuXHRcdFx0XHRcdFx0aWYgKHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkuaGFzT3duUHJvcGVydHkoYW5BeGlzKSkge1xuXHRcdFx0XHRcdFx0XHRfbGFzdFNjcm9sbFBvc2l0aW9uW2FuQXhpc10gPSBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5W2FuQXhpc107XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCgpO1xuXHRcdFx0XHR9LCBtYXhEdXJhdGlvbikpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEFsdGVyIHRoZSBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbiwgaW5jbHVkaW5nIHdoZXRoZXIgb3Igbm90IHRvIGFuaW1hdGVcblx0XHQgKiB0aGUgc2Nyb2xsIGFuZCBob3cgZmFzdCB0byBwZXJmb3JtIHRoZSBhbmltYXRpb24gKHBhc3MgaW4gdHJ1ZSB0b1xuXHRcdCAqIHNlbGVjdCBhIGR5bmFtaWMgZHVyYXRpb24pLiAgVGhlIGlucHV0cyB3aWxsIGJlIGNoZWNrZWQgYWdhaW5zdCB0aGVcblx0XHQgKiBjdXJyZW50IHBvc2l0aW9uLlxuXHRcdCAqL1xuXHRcdHNjcm9sbEJ5ID0gZnVuY3Rpb24gc2Nyb2xsQnkoaG9yaXpvbnRhbCwgdmVydGljYWwsIGFuaW1hdGlvbkR1cmF0aW9uKSB7XG5cblx0XHRcdC8vIFdyYXAgdGhlIHNjcm9sbFRvIGZ1bmN0aW9uIGZvciBzaW1wbGljaXR5XG5cdFx0XHRzY3JvbGxUbyhwYXJzZUZsb2F0KGhvcml6b250YWwpIC0gX2Jhc2VTY3JvbGxQb3NpdGlvbi54LCBwYXJzZUZsb2F0KHZlcnRpY2FsKSAtIF9iYXNlU2Nyb2xsUG9zaXRpb24ueSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBQcm92aWRlIGEgcHVibGljIG1ldGhvZCB0byBkZXRlY3QgY2hhbmdlcyBpbiBkaW1lbnNpb25zIGZvciBlaXRoZXIgdGhlIGNvbnRlbnQgb3IgdGhlXG5cdFx0ICogY29udGFpbmVyLlxuXHRcdCAqL1xuXHRcdHVwZGF0ZURpbWVuc2lvbnMgPSBmdW5jdGlvbiB1cGRhdGVEaW1lbnNpb25zKGNvbnRlbnRXaWR0aCwgY29udGVudEhlaWdodCwgaWdub3JlU25hcFNjcm9sbCkge1xuXHRcdFx0b3B0aW9ucy5jb250ZW50V2lkdGggPSBjb250ZW50V2lkdGggfHwgb3B0aW9ucy5jb250ZW50V2lkdGg7XG5cdFx0XHRvcHRpb25zLmNvbnRlbnRIZWlnaHQgPSBjb250ZW50SGVpZ2h0IHx8IG9wdGlvbnMuY29udGVudEhlaWdodDtcblxuXHRcdFx0Ly8gQ3VycmVudGx5IGp1c3Qgd3JhcCB0aGUgcHJpdmF0ZSBBUElcblx0XHRcdF91cGRhdGVEaW1lbnNpb25zKCEhaWdub3JlU25hcFNjcm9sbCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEFkZCBhbiBldmVudCBoYW5kbGVyIGZvciBhIHN1cHBvcnRlZCBldmVudC4gIEN1cnJlbnQgZXZlbnRzIGluY2x1ZGU6XG5cdFx0ICogc2Nyb2xsIC0gZmlyZWQgd2hlbmV2ZXIgdGhlIHNjcm9sbCBwb3NpdGlvbiBjaGFuZ2VzXG5cdFx0ICogc2Nyb2xsc3RhcnQgLSBmaXJlZCB3aGVuIGEgc2Nyb2xsIG1vdmVtZW50IHN0YXJ0c1xuXHRcdCAqIHNjcm9sbGVuZCAtIGZpcmVkIHdoZW4gYSBzY3JvbGwgbW92ZW1lbnQgZW5kc1xuXHRcdCAqIHNlZ21lbnR3aWxsY2hhbmdlIC0gZmlyZWQgd2hlbmV2ZXIgdGhlIHNlZ21lbnQgY2hhbmdlcywgaW5jbHVkaW5nIGR1cmluZyBzY3JvbGxpbmdcblx0XHQgKiBzZWdtZW50ZGlkY2hhbmdlIC0gZmlyZWQgd2hlbiBhIHNlZ21lbnQgaGFzIGNvbmNsdXNpdmVseSBjaGFuZ2VkLCBhZnRlciBzY3JvbGxpbmcuXG5cdFx0ICovXG5cdFx0YWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIoZXZlbnRuYW1lLCBldmVudGxpc3RlbmVyKSB7XG5cblx0XHRcdC8vIEVuc3VyZSB0aGlzIGlzIGEgdmFsaWQgZXZlbnRcblx0XHRcdGlmICghX2V2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KGV2ZW50bmFtZSkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgdGhlIGxpc3RlbmVyXG5cdFx0XHRfZXZlbnRMaXN0ZW5lcnNbZXZlbnRuYW1lXS5wdXNoKGV2ZW50bGlzdGVuZXIpO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZSBhbiBldmVudCBoYW5kbGVyIGZvciBhIHN1cHBvcnRlZCBldmVudC4gIFRoZSBsaXN0ZW5lciBtdXN0IGJlIGV4YWN0bHkgdGhlIHNhbWUgYXNcblx0XHQgKiBhbiBhZGRlZCBsaXN0ZW5lciB0byBiZSByZW1vdmVkLlxuXHRcdCAqL1xuXHRcdHJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50bmFtZSwgZXZlbnRsaXN0ZW5lcikge1xuXHRcdFx0dmFyIGk7XG5cblx0XHRcdC8vIEVuc3VyZSB0aGlzIGlzIGEgdmFsaWQgZXZlbnRcblx0XHRcdGlmICghX2V2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KGV2ZW50bmFtZSkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKGkgPSBfZXZlbnRMaXN0ZW5lcnNbZXZlbnRuYW1lXS5sZW5ndGg7IGkgPj0gMDsgaSA9IGkgLSAxKSB7XG5cdFx0XHRcdGlmIChfZXZlbnRMaXN0ZW5lcnNbZXZlbnRuYW1lXVtpXSA9PT0gZXZlbnRsaXN0ZW5lcikge1xuXHRcdFx0XHRcdF9ldmVudExpc3RlbmVyc1tldmVudG5hbWVdLnNwbGljZShpLCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFN0YXJ0IGEgc2Nyb2xsIHRyYWNraW5nIGlucHV0IC0gdGhpcyBjb3VsZCBiZSBtb3VzZSwgd2Via2l0LXN0eWxlIHRvdWNoLFxuXHRcdCAqIG9yIG1zLXN0eWxlIHBvaW50ZXIgZXZlbnRzLlxuXHRcdCAqL1xuXHRcdF9zdGFydFNjcm9sbCA9IGZ1bmN0aW9uIF9zdGFydFNjcm9sbChpbnB1dFgsIGlucHV0WSwgaW5wdXRUaW1lLCByYXdFdmVudCkge1xuXHRcdFx0dmFyIHRyaWdnZXJTY3JvbGxJbnRlcnJ1cHQgPSBfaXNBbmltYXRpbmc7XG5cblx0XHRcdC8vIE9wZXJhIGZpeFxuXHRcdFx0aWYgKGlucHV0VGltZSA8PSAwKSB7XG5cdFx0XHRcdGlucHV0VGltZSA9IERhdGUubm93KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIGEgd2luZG93IHNjcm9sbGluZyBmbGFnIGlzIHNldCwgYW5kIGV2YWx1YXRlcyB0byB0cnVlLCBkb24ndCBzdGFydCBjaGVja2luZyB0b3VjaGVzXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnICYmIHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgYW4gYW5pbWF0aW9uIGlzIGluIHByb2dyZXNzLCBzdG9wIHRoZSBzY3JvbGwuXG5cdFx0XHRpZiAodHJpZ2dlclNjcm9sbEludGVycnVwdCkge1xuXHRcdFx0XHRfaW50ZXJydXB0U2Nyb2xsKCk7XG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdC8vIEFsbG93IGNsaWNrcyBhZ2FpbiwgYnV0IG9ubHkgaWYgYSBzY3JvbGwgd2FzIG5vdCBpbnRlcnJ1cHRlZFxuXHRcdFx0XHRfcHJldmVudENsaWNrID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFN0b3JlIHRoZSBpbml0aWFsIGV2ZW50IGNvb3JkaW5hdGVzXG5cdFx0XHRfZ2VzdHVyZVN0YXJ0LnggPSBpbnB1dFg7XG5cdFx0XHRfZ2VzdHVyZVN0YXJ0LnkgPSBpbnB1dFk7XG5cdFx0XHRfZ2VzdHVyZVN0YXJ0LnQgPSBpbnB1dFRpbWU7XG5cdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb24ueCA9IF9sYXN0U2Nyb2xsUG9zaXRpb24ueDtcblx0XHRcdF90YXJnZXRTY3JvbGxQb3NpdGlvbi55ID0gX2xhc3RTY3JvbGxQb3NpdGlvbi55O1xuXG5cdFx0XHQvLyBDbGVhciBldmVudCBoaXN0b3J5IGFuZCBhZGQgdGhlIHN0YXJ0IHRvdWNoXG5cdFx0XHRfZXZlbnRIaXN0b3J5Lmxlbmd0aCA9IDA7XG5cdFx0XHRfZXZlbnRIaXN0b3J5LnB1c2goeyB4OiBpbnB1dFgsIHk6IGlucHV0WSwgdDogaW5wdXRUaW1lIH0pO1xuXG5cdFx0XHRpZiAodHJpZ2dlclNjcm9sbEludGVycnVwdCkge1xuXHRcdFx0XHRfdXBkYXRlU2Nyb2xsKGlucHV0WCwgaW5wdXRZLCBpbnB1dFRpbWUsIHJhd0V2ZW50LCB0cmlnZ2VyU2Nyb2xsSW50ZXJydXB0KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENvbnRpbnVlIGEgc2Nyb2xsIGFzIGEgcmVzdWx0IG9mIGFuIHVwZGF0ZWQgcG9zaXRpb25cblx0XHQgKi9cblx0XHRfdXBkYXRlU2Nyb2xsID0gZnVuY3Rpb24gX3VwZGF0ZVNjcm9sbChpbnB1dFgsIGlucHV0WSwgaW5wdXRUaW1lLCByYXdFdmVudCwgc2Nyb2xsSW50ZXJydXB0KSB7XG5cdFx0XHR2YXIgYXhpcywgb3RoZXJTY3JvbGxlckFjdGl2ZSwgZGlzdGFuY2VzQmV5b25kQm91bmRzO1xuXHRcdFx0dmFyIGluaXRpYWxTY3JvbGwgPSBmYWxzZTtcblx0XHRcdHZhciBnZXN0dXJlID0ge1xuXHRcdFx0XHR4OiBpbnB1dFggLSBfZ2VzdHVyZVN0YXJ0LngsXG5cdFx0XHRcdHk6IGlucHV0WSAtIF9nZXN0dXJlU3RhcnQueVxuXHRcdFx0fTtcblxuXHRcdFx0Ly8gT3BlcmEgZml4XG5cdFx0XHRpZiAoaW5wdXRUaW1lIDw9IDApIHtcblx0XHRcdFx0aW5wdXRUaW1lID0gRGF0ZS5ub3coKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIGJhc2UgdGFyZ2V0IHBvc2l0aW9uc1xuXHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uLnggPSBfYmFzZVNjcm9sbFBvc2l0aW9uLnggKyBnZXN0dXJlLng7XG5cdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb24ueSA9IF9iYXNlU2Nyb2xsUG9zaXRpb24ueSArIGdlc3R1cmUueTtcblxuXHRcdFx0Ly8gSWYgc2Nyb2xsaW5nIGhhcyBub3QgeWV0IGxvY2tlZCB0byB0aGlzIHNjcm9sbGVyLCBjaGVjayB3aGV0aGVyIHRvIHN0b3Agc2Nyb2xsaW5nXG5cdFx0XHRpZiAoIV9pc1Njcm9sbGluZykge1xuXG5cdFx0XHRcdC8vIENoZWNrIHRoZSBpbnRlcm5hbCBmbGFnIHRvIGRldGVybWluZSBpZiBhbm90aGVyIEZUU2Nyb2xsZXIgaXMgc2Nyb2xsaW5nXG5cdFx0XHRcdGlmIChfZnRzY3JvbGxlck1vdmluZyAmJiBfZnRzY3JvbGxlck1vdmluZyAhPT0gX3NlbGYpIHtcblx0XHRcdFx0XHRvdGhlclNjcm9sbGVyQWN0aXZlID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIE90aGVyd2lzZSwgY2hlY2sgdGhlIHdpbmRvdyBzY3JvbGxpbmcgZmxhZyB0byBzZWUgaWYgYW55dGhpbmcgZWxzZSBoYXMgY2xhaW1lZCBzY3JvbGxpbmdcblx0XHRcdFx0ZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnICYmIHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddKSB7XG5cdFx0XHRcdFx0b3RoZXJTY3JvbGxlckFjdGl2ZSA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBJZiBhbm90aGVyIHNjcm9sbGVyIHdhcyBhY3RpdmUsIGNsZWFuIHVwIGFuZCBzdG9wIHByb2Nlc3NpbmcuXG5cdFx0XHRcdGlmIChvdGhlclNjcm9sbGVyQWN0aXZlKSB7XG5cdFx0XHRcdFx0X2lucHV0SWRlbnRpZmllciA9IGZhbHNlO1xuXHRcdFx0XHRcdF9yZWxlYXNlSW5wdXRDYXB0dXJlKCk7XG5cdFx0XHRcdFx0aWYgKF9pc0Rpc3BsYXlpbmdTY3JvbGwpIHtcblx0XHRcdFx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcblx0XHRcdFx0XHRcdGlmICghX3NuYXBTY3JvbGwodHJ1ZSkpIHtcblx0XHRcdFx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKHRydWUpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgbm90IHlldCBkaXNwbGF5aW5nIGEgc2Nyb2xsLCBkZXRlcm1pbmUgd2hldGhlciB0aGF0IHRyaWdnZXJpbmcgYm91bmRhcnlcblx0XHRcdC8vIGhhcyBiZWVuIGV4Y2VlZGVkXG5cdFx0XHRpZiAoIV9pc0Rpc3BsYXlpbmdTY3JvbGwpIHtcblxuXHRcdFx0XHQvLyBEZXRlcm1pbmUgc2Nyb2xsIGRpc3RhbmNlIGJleW9uZCBib3VuZHNcblx0XHRcdFx0ZGlzdGFuY2VzQmV5b25kQm91bmRzID0gX2Rpc3RhbmNlc0JleW9uZEJvdW5kcyhfdGFyZ2V0U2Nyb2xsUG9zaXRpb24pO1xuXG5cdFx0XHRcdC8vIERldGVybWluZSB3aGV0aGVyIHRvIHByZXZlbnQgdGhlIGRlZmF1bHQgc2Nyb2xsIGV2ZW50IC0gaWYgdGhlIHNjcm9sbCBjb3VsZCBzdGlsbFxuXHRcdFx0XHQvLyBiZSB0cmlnZ2VyZWQsIHByZXZlbnQgdGhlIGRlZmF1bHQgdG8gYXZvaWQgcHJvYmxlbXMgKHBhcnRpY3VsYXJseSBvbiBQbGF5Qm9vaylcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuYm91bmNpbmcgfHwgc2Nyb2xsSW50ZXJydXB0IHx8IChfc2Nyb2xsYWJsZUF4ZXMueCAmJiBnZXN0dXJlLnggJiYgZGlzdGFuY2VzQmV5b25kQm91bmRzLnggPCAwKSB8fCAoX3Njcm9sbGFibGVBeGVzLnkgJiYgZ2VzdHVyZS55ICYmIGRpc3RhbmNlc0JleW9uZEJvdW5kcy55IDwgMCkpIHtcblx0XHRcdFx0XHRyYXdFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ2hlY2sgc2Nyb2xsZWQgZGlzdGFuY2UgYWdhaW5zdCB0aGUgYm91bmRhcnkgbGltaXQgdG8gc2VlIGlmIHNjcm9sbGluZyBjYW4gYmUgdHJpZ2dlcmVkLlxuXHRcdFx0XHQvLyBJZiB0aGUgc2Nyb2xsIGhhcyBiZWVuIGludGVycnVwdGVkLCB0cmlnZ2VyIGF0IG9uY2Vcblx0XHRcdFx0aWYgKCFzY3JvbGxJbnRlcnJ1cHQgJiYgKCFfc2Nyb2xsYWJsZUF4ZXMueCB8fCBNYXRoLmFicyhnZXN0dXJlLngpIDwgX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxSZXNwb25zZUJvdW5kYXJ5KSAmJiAoIV9zY3JvbGxhYmxlQXhlcy55IHx8IE1hdGguYWJzKGdlc3R1cmUueSkgPCBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbFJlc3BvbnNlQm91bmRhcnkpKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gSWYgYm91bmNpbmcgaXMgZGlzYWJsZWQsIGFuZCBhbHJlYWR5IGF0IGFuIGVkZ2UgYW5kIHNjcm9sbGluZyBiZXlvbmQgdGhlIGVkZ2UsIGlnbm9yZSB0aGUgc2Nyb2xsIGZvclxuXHRcdFx0XHQvLyBub3cgLSB0aGlzIGFsbG93cyBvdGhlciBzY3JvbGxlcnMgdG8gY2xhaW0gaWYgYXBwcm9wcmlhdGUsIGFsbG93aW5nIG5pY2VyIG5lc3RlZCBzY3JvbGxzLlxuXHRcdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuYm91bmNpbmcgJiYgIXNjcm9sbEludGVycnVwdCAmJiAoIV9zY3JvbGxhYmxlQXhlcy54IHx8ICFnZXN0dXJlLnggfHwgZGlzdGFuY2VzQmV5b25kQm91bmRzLnggPiAwKSAmJiAoIV9zY3JvbGxhYmxlQXhlcy55IHx8ICFnZXN0dXJlLnkgfHwgZGlzdGFuY2VzQmV5b25kQm91bmRzLnkgPiAwKSkge1xuXG5cdFx0XHRcdFx0Ly8gUHJldmVudCB0aGUgb3JpZ2luYWwgY2xpY2sgbm93IHRoYXQgc2Nyb2xsaW5nIHdvdWxkIGJlIHRyaWdnZXJlZFxuXHRcdFx0XHRcdF9wcmV2ZW50Q2xpY2sgPSB0cnVlO1xuXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gVHJpZ2dlciB0aGUgc3RhcnQgb2YgdmlzdWFsIHNjcm9sbGluZ1xuXHRcdFx0XHRfc3RhcnRBbmltYXRpb24oKTtcblx0XHRcdFx0X2lzRGlzcGxheWluZ1Njcm9sbCA9IHRydWU7XG5cdFx0XHRcdF9oYXNCZWVuU2Nyb2xsZWQgPSB0cnVlO1xuXHRcdFx0XHRfaXNBbmltYXRpbmcgPSB0cnVlO1xuXHRcdFx0XHRpbml0aWFsU2Nyb2xsID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0Ly8gUHJldmVudCB0aGUgZXZlbnQgZGVmYXVsdC4gIEl0IGlzIHNhZmUgdG8gY2FsbCB0aGlzIGluIElFMTAgYmVjYXVzZSB0aGUgZXZlbnQgaXMgbmV2ZXJcblx0XHRcdFx0Ly8gYSB3aW5kb3cuZXZlbnQsIGFsd2F5cyBhIFwidHJ1ZVwiIGV2ZW50LlxuXHRcdFx0XHRyYXdFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiBub3QgeWV0IGxvY2tlZCB0byBhIHNjcm9sbCwgZGV0ZXJtaW5lIHdoZXRoZXIgdG8gZG8gc29cblx0XHRcdGlmICghX2lzU2Nyb2xsaW5nKSB7XG5cblx0XHRcdFx0Ly8gSWYgdGhlIGdlc3R1cmUgZGlzdGFuY2UgaGFzIGV4Y2VlZGVkIHRoZSBzY3JvbGwgbG9jayBkaXN0YW5jZSwgb3Igc25hcHBpbmcgaXMgYWN0aXZlXG5cdFx0XHRcdC8vIGFuZCB0aGUgc2Nyb2xsIGhhcyBiZWVuIGludGVycnVwdGVkLCBlbnRlciBleGNsdXNpdmUgc2Nyb2xsaW5nLlxuXHRcdFx0XHRpZiAoKHNjcm9sbEludGVycnVwdCAmJiBfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB8fCAoX3Njcm9sbGFibGVBeGVzLnggJiYgTWF0aC5hYnMoZ2VzdHVyZS54KSA+PSBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbEJvdW5kYXJ5KSB8fCAoX3Njcm9sbGFibGVBeGVzLnkgJiYgTWF0aC5hYnMoZ2VzdHVyZS55KSA+PSBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbEJvdW5kYXJ5KSkge1xuXG5cdFx0XHRcdFx0X2lzU2Nyb2xsaW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRfZnRzY3JvbGxlck1vdmluZyA9IF9zZWxmO1xuXHRcdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcpIHtcblx0XHRcdFx0XHRcdHdpbmRvd1tfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWddID0gX3NlbGY7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbHN0YXJ0JywgX2dldFBvc2l0aW9uKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIENhbmNlbCB0ZXh0IHNlbGVjdGlvbnMgd2hpbGUgZHJhZ2dpbmcgYSBjdXJzb3Jcblx0XHRcdGlmIChfY2FuQ2xlYXJTZWxlY3Rpb24pIHtcblx0XHRcdFx0d2luZG93LmdldFNlbGVjdGlvbigpLnJlbW92ZUFsbFJhbmdlcygpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBVcGRhdGUgYXhlcyB0YXJnZXQgcG9zaXRpb25zIGlmIGJleW9uZCBib3VuZHNcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xuXHRcdFx0XHRcdGlmIChfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gPiAwKSB7XG5cdFx0XHRcdFx0XHRfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10gPSBfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMoX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdLCBheGlzKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSA8IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xuXHRcdFx0XHRcdFx0X3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdICsgX21vZGlmeURpc3RhbmNlQmV5b25kQm91bmRzKF90YXJnZXRTY3JvbGxQb3NpdGlvbltheGlzXSAtIF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSwgYXhpcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRyaWdnZXIgYSBzY3JvbGwgcG9zaXRpb24gdXBkYXRlIGZvciBwbGF0Zm9ybXMgbm90IHVzaW5nIHJlcXVlc3RBbmltYXRpb25GcmFtZXNcblx0XHRcdGlmICghX3JlcUFuaW1hdGlvbkZyYW1lKSB7XG5cdFx0XHRcdF9zY2hlZHVsZVJlbmRlcigpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUbyBhaWQgcmVuZGVyL2RyYXcgY29hbGVzY2luZywgcGVyZm9ybSBvdGhlciBvbmUtb2ZmIGFjdGlvbnMgaGVyZVxuXHRcdFx0aWYgKGluaXRpYWxTY3JvbGwpIHtcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nQ2xhc3NOYW1lKSB7XG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuY2xhc3NOYW1lICs9ICcgJyArIF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nQ2xhc3NOYW1lO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcblx0XHRcdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XG5cdFx0XHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XG5cdFx0XHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlc1theGlzXS5jbGFzc05hbWUgKz0gJyBhY3RpdmUnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgYW4gZXZlbnQgdG8gdGhlIGV2ZW50IGhpc3RvcnksIGtlZXBpbmcgaXQgYXJvdW5kIHR3ZW50eSBldmVudHMgbG9uZ1xuXHRcdFx0X2V2ZW50SGlzdG9yeS5wdXNoKHsgeDogaW5wdXRYLCB5OiBpbnB1dFksIHQ6IGlucHV0VGltZSB9KTtcblx0XHRcdGlmIChfZXZlbnRIaXN0b3J5Lmxlbmd0aCA+IDMwKSB7XG5cdFx0XHRcdF9ldmVudEhpc3Rvcnkuc3BsaWNlKDAsIDE1KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQ29tcGxldGUgYSBzY3JvbGwgd2l0aCBhIGZpbmFsIGV2ZW50IHRpbWUgaWYgYXZhaWxhYmxlIChpdCBtYXlcblx0XHQgKiBub3QgYmUsIGRlcGVuZGluZyBvbiB0aGUgaW5wdXQgdHlwZSk7IHRoaXMgbWF5IGNvbnRpbnVlIHRoZSBzY3JvbGxcblx0XHQgKiB3aXRoIGEgZmxpbmcgYW5kL29yIGJvdW5jZWJhY2sgZGVwZW5kaW5nIG9uIG9wdGlvbnMuXG5cdFx0ICovXG5cdFx0X2VuZFNjcm9sbCA9IGZ1bmN0aW9uIF9lbmRTY3JvbGwoaW5wdXRUaW1lLCByYXdFdmVudCkge1xuXHRcdFx0X2lucHV0SWRlbnRpZmllciA9IGZhbHNlO1xuXHRcdFx0X3JlbGVhc2VJbnB1dENhcHR1cmUoKTtcblx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcblxuXHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsaW50ZXJhY3Rpb25lbmQnLCB7fSk7XG5cblx0XHRcdGlmICghX2lzU2Nyb2xsaW5nKSB7XG5cdFx0XHRcdGlmICghX3NuYXBTY3JvbGwodHJ1ZSkgJiYgX2lzRGlzcGxheWluZ1Njcm9sbCkge1xuXHRcdFx0XHRcdF9maW5hbGl6ZVNjcm9sbCh0cnVlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIE1vZGlmeSB0aGUgbGFzdCBtb3ZlbWVudCBldmVudCB0byBpbmNsdWRlIHRoZSBlbmQgZXZlbnQgdGltZVxuXHRcdFx0X2V2ZW50SGlzdG9yeVtfZXZlbnRIaXN0b3J5Lmxlbmd0aCAtIDFdLnQgPSBpbnB1dFRpbWU7XG5cblx0XHRcdC8vIFVwZGF0ZSBmbGFnc1xuXHRcdFx0X2lzU2Nyb2xsaW5nID0gZmFsc2U7XG5cdFx0XHRfaXNEaXNwbGF5aW5nU2Nyb2xsID0gZmFsc2U7XG5cdFx0XHRfZnRzY3JvbGxlck1vdmluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMud2luZG93U2Nyb2xsaW5nQWN0aXZlRmxhZykge1xuXHRcdFx0XHR3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBQcmV2ZW50IGNsaWNrcyBhbmQgc3RvcCB0aGUgZXZlbnQgZGVmYXVsdC4gIEl0IGlzIHNhZmUgdG8gY2FsbCB0aGlzIGluIElFMTAgYmVjYXVzZVxuXHRcdFx0Ly8gdGhlIGV2ZW50IGlzIG5ldmVyIGEgd2luZG93LmV2ZW50LCBhbHdheXMgYSBcInRydWVcIiBldmVudC5cblx0XHRcdF9wcmV2ZW50Q2xpY2sgPSB0cnVlO1xuXHRcdFx0aWYgKHJhd0V2ZW50KSB7XG5cdFx0XHRcdHJhd0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRyaWdnZXIgYSBmbGluZyBvciBib3VuY2ViYWNrIGlmIG5lY2Vzc2FyeVxuXHRcdFx0aWYgKCFfZmxpbmdTY3JvbGwoKSAmJiAhX3NuYXBTY3JvbGwoKSkge1xuXHRcdFx0XHRfZmluYWxpemVTY3JvbGwoKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlIHRoZSBzY3JvbGxpbmcgY2xhc3MsIGNsZWFuaW5nIHVwIGRpc3BsYXkuXG5cdFx0ICovXG5cdFx0X2ZpbmFsaXplU2Nyb2xsID0gZnVuY3Rpb24gX2ZpbmFsaXplU2Nyb2xsKHNjcm9sbENhbmNlbGxlZCkge1xuXHRcdFx0dmFyIGksIGwsIGF4aXMsIHNjcm9sbEV2ZW50LCBzY3JvbGxSZWdleDtcblxuXHRcdFx0X2lzQW5pbWF0aW5nID0gZmFsc2U7XG5cdFx0XHRfaXNEaXNwbGF5aW5nU2Nyb2xsID0gZmFsc2U7XG5cblx0XHRcdC8vIFJlbW92ZSBzY3JvbGxpbmcgY2xhc3MgaWYgc2V0XG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdDbGFzc05hbWUpIHtcblx0XHRcdFx0c2Nyb2xsUmVnZXggPSBuZXcgUmVnRXhwKCcoPzpefFxcXFxzKScgKyBfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ0NsYXNzTmFtZSArICcoPyFcXFxcUyknLCAnZycpO1xuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5jbGFzc05hbWUgPSBfY29udGFpbmVyTm9kZS5jbGFzc05hbWUucmVwbGFjZShzY3JvbGxSZWdleCwgJycpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xuXHRcdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XG5cdFx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xuXHRcdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLmNsYXNzTmFtZSA9IF9zY3JvbGxiYXJOb2Rlc1theGlzXS5jbGFzc05hbWUucmVwbGFjZSgvID9hY3RpdmUvZywgJycpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBTdG9yZSBmaW5hbCBwb3NpdGlvbiBpZiBzY3JvbGxpbmcgb2NjdXJyZWRcblx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb24ueCA9IF9sYXN0U2Nyb2xsUG9zaXRpb24ueDtcblx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb24ueSA9IF9sYXN0U2Nyb2xsUG9zaXRpb24ueTtcblxuXHRcdFx0c2Nyb2xsRXZlbnQgPSBfZ2V0UG9zaXRpb24oKTtcblxuXHRcdFx0aWYgKCFzY3JvbGxDYW5jZWxsZWQpIHtcblx0XHRcdFx0X2ZpcmVFdmVudCgnc2Nyb2xsJywgc2Nyb2xsRXZlbnQpO1xuXHRcdFx0XHRfdXBkYXRlU2VnbWVudHModHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFsd2F5cyBmaXJlIHRoZSBzY3JvbGwgZW5kIGV2ZW50LCBpbmNsdWRpbmcgYW4gYXJndW1lbnQgaW5kaWNhdGluZyB3aGV0aGVyXG5cdFx0XHQvLyB0aGUgc2Nyb2xsIHdhcyBjYW5jZWxsZWRcblx0XHRcdHNjcm9sbEV2ZW50LmNhbmNlbGxlZCA9IHNjcm9sbENhbmNlbGxlZDtcblx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbGVuZCcsIHNjcm9sbEV2ZW50KTtcblxuXHRcdFx0Ly8gUmVzdG9yZSB0cmFuc2l0aW9uc1xuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XG5cdFx0XHRcdFx0X3Njcm9sbE5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gJyc7XG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xuXHRcdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gJyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIENsZWFyIGFueSByZW1haW5pbmcgdGltZW91dHNcblx0XHRcdGZvciAoaSA9IDAsIGwgPSBfdGltZW91dHMubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX3RpbWVvdXRzW2ldKTtcblx0XHRcdH1cblx0XHRcdF90aW1lb3V0cy5sZW5ndGggPSAwO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBJbnRlcnJ1cHQgYSBjdXJyZW50IHNjcm9sbCwgYWxsb3dpbmcgYSBzdGFydCBzY3JvbGwgZHVyaW5nIGFuaW1hdGlvbiB0byB0cmlnZ2VyIGEgbmV3IHNjcm9sbFxuXHRcdCAqL1xuXHRcdF9pbnRlcnJ1cHRTY3JvbGwgPSBmdW5jdGlvbiBfaW50ZXJydXB0U2Nyb2xsKCkge1xuXHRcdFx0dmFyIGF4aXMsIGksIGw7XG5cblx0XHRcdF9pc0FuaW1hdGluZyA9IGZhbHNlO1xuXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHN0b3JlZCBiYXNlIHBvc2l0aW9uXG5cdFx0XHRfdXBkYXRlRWxlbWVudFBvc2l0aW9uKCk7XG5cblx0XHRcdC8vIEVuc3VyZSB0aGUgcGFyc2VkIHBvc2l0aW9ucyBhcmUgc2V0LCBhbHNvIGNsZWFyaW5nIHRyYW5zaXRpb25zXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIF9iYXNlU2Nyb2xsUG9zaXRpb25bYXhpc10sIDE2LCBfaW5zdGFuY2VPcHRpb25zLmJvdW5jZURlY2VsZXJhdGlvbkJlemllcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIHNlZ21lbnQgdHJhY2tpbmcgaWYgc25hcHBpbmcgaXMgYWN0aXZlXG5cdFx0XHRfdXBkYXRlU2VnbWVudHMoZmFsc2UpO1xuXG5cdFx0XHQvLyBDbGVhciBhbnkgcmVtYWluaW5nIHRpbWVvdXRzXG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gX3RpbWVvdXRzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF90aW1lb3V0c1tpXSk7XG5cdFx0XHR9XG5cdFx0XHRfdGltZW91dHMubGVuZ3RoID0gMDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogRGV0ZXJtaW5lIHdoZXRoZXIgYSBzY3JvbGwgZmxpbmcgb3IgYm91bmNlYmFjayBpcyByZXF1aXJlZCwgYW5kIHNldCB1cCB0aGUgc3R5bGVzIGFuZFxuXHRcdCAqIHRpbWVvdXRzIHJlcXVpcmVkLlxuXHRcdCAqL1xuXHRcdF9mbGluZ1Njcm9sbCA9IGZ1bmN0aW9uIF9mbGluZ1Njcm9sbCgpIHtcblx0XHRcdHZhciBpLCBheGlzLCBtb3ZlbWVudFRpbWUsIG1vdmVtZW50U3BlZWQsIGxhc3RQb3NpdGlvbiwgY29tcGFyaXNvblBvc2l0aW9uLCBmbGluZ0R1cmF0aW9uLCBmbGluZ0Rpc3RhbmNlLCBmbGluZ1Bvc2l0aW9uLCBib3VuY2VEZWxheSwgYm91bmNlRGlzdGFuY2UsIGJvdW5jZUR1cmF0aW9uLCBib3VuY2VUYXJnZXQsIGJvdW5kc0JvdW5jZSwgbW9kaWZpZWREaXN0YW5jZSwgZmxpbmdCZXppZXIsIHRpbWVQcm9wb3J0aW9uLCBib3VuZHNDcm9zc0RlbGF5LCBmbGluZ1N0YXJ0U2VnbWVudCwgYmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZSwgYmFzZUZsaW5nQ29tcG9uZW50O1xuXHRcdFx0dmFyIG1heEFuaW1hdGlvblRpbWUgPSAwO1xuXHRcdFx0dmFyIG1vdmVSZXF1aXJlZCA9IGZhbHNlO1xuXHRcdFx0dmFyIHNjcm9sbFBvc2l0aW9uc1RvQXBwbHkgPSB7fTtcblxuXHRcdFx0Ly8gSWYgd2Ugb25seSBoYXZlIHRoZSBzdGFydCBldmVudCBhdmFpbGFibGUsIG9yIGZsaW5naW5nIGlzIGRpc2FibGVkLFxuXHRcdFx0Ly8gb3IgdGhlIHNjcm9sbCB3YXMgdHJpZ2dlcmVkIGJ5IGEgc2Nyb2xsd2hlZWwsIG5vIGFjdGlvbiByZXF1aXJlZC5cblx0XHRcdGlmIChfZXZlbnRIaXN0b3J5Lmxlbmd0aCA9PT0gMSB8fCAhX2luc3RhbmNlT3B0aW9ucy5mbGluZ2luZyB8fCBfaW5wdXRJZGVudGlmaWVyID09PSAnc2Nyb2xsd2hlZWwnKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XG5cdFx0XHRcdFx0Ym91bmNlRHVyYXRpb24gPSAzNTA7XG5cdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSAwO1xuXHRcdFx0XHRcdGJvdW5kc0JvdW5jZSA9IGZhbHNlO1xuXHRcdFx0XHRcdGJvdW5jZVRhcmdldCA9IGZhbHNlO1xuXHRcdFx0XHRcdGJvdW5kc0Nyb3NzRGVsYXkgPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0XHQvLyBSZS1zZXQgYSBkZWZhdWx0IGJlemllciBjdXJ2ZSBmb3IgdGhlIGFuaW1hdGlvbiBmb3IgcG90ZW50aWFsIG1vZGlmaWNhdGlvblxuXHRcdFx0XHRcdGZsaW5nQmV6aWVyID0gX2luc3RhbmNlT3B0aW9ucy5mbGluZ0JlemllcjtcblxuXHRcdFx0XHRcdC8vIEdldCB0aGUgbGFzdCBtb3ZlbWVudCBzcGVlZCwgaW4gcGl4ZWxzIHBlciBtaWxsaXNlY29uZC4gIFRvIGRvIHRoaXMsIGxvb2sgYXQgdGhlIGV2ZW50c1xuXHRcdFx0XHRcdC8vIGluIHRoZSBsYXN0IDEwMG1zIGFuZCBhdmVyYWdlIG91dCB0aGUgc3BlZWQsIHVzaW5nIGEgbWluaW11bSBudW1iZXIgb2YgdHdvIHBvaW50cy5cblx0XHRcdFx0XHRsYXN0UG9zaXRpb24gPSBfZXZlbnRIaXN0b3J5W19ldmVudEhpc3RvcnkubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0Y29tcGFyaXNvblBvc2l0aW9uID0gX2V2ZW50SGlzdG9yeVtfZXZlbnRIaXN0b3J5Lmxlbmd0aCAtIDJdO1xuXHRcdFx0XHRcdGZvciAoaSA9IF9ldmVudEhpc3RvcnkubGVuZ3RoIC0gMzsgaSA+PSAwOyBpID0gaSAtIDEpIHtcblx0XHRcdFx0XHRcdGlmIChsYXN0UG9zaXRpb24udCAtIF9ldmVudEhpc3RvcnlbaV0udCA+IDEwMCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNvbXBhcmlzb25Qb3NpdGlvbiA9IF9ldmVudEhpc3RvcnlbaV07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gR2V0IHRoZSBsYXN0IG1vdmVtZW50IHRpbWUuICBJZiB0aGlzIGlzIHplcm8gLSBhcyBjYW4gaGFwcGVuIHdpdGhcblx0XHRcdFx0XHQvLyBzb21lIHNjcm9sbHdoZWVsIGV2ZW50cyBvbiBzb21lIHBsYXRmb3JtcyAtIGluY3JlYXNlIGl0IHRvIDE2bXMgYXNcblx0XHRcdFx0XHQvLyBpZiB0aGUgbW92ZW1lbnQgb2NjdXJyZWQgb3ZlciBhIHNpbmdsZSBmcmFtZSBhdCA2MGZwcy5cblx0XHRcdFx0XHRtb3ZlbWVudFRpbWUgPSBsYXN0UG9zaXRpb24udCAtIGNvbXBhcmlzb25Qb3NpdGlvbi50O1xuXHRcdFx0XHRcdGlmICghbW92ZW1lbnRUaW1lKSB7XG5cdFx0XHRcdFx0XHRtb3ZlbWVudFRpbWUgPSAxNjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBEZXJpdmUgdGhlIG1vdmVtZW50IHNwZWVkXG5cdFx0XHRcdFx0bW92ZW1lbnRTcGVlZCA9IChsYXN0UG9zaXRpb25bYXhpc10gLSBjb21wYXJpc29uUG9zaXRpb25bYXhpc10pIC8gbW92ZW1lbnRUaW1lO1xuXG5cdFx0XHRcdFx0Ly8gSWYgdGhlcmUgaXMgbGl0dGxlIHNwZWVkLCBubyBmdXJ0aGVyIGFjdGlvbiByZXF1aXJlZCBleGNlcHQgZm9yIGEgYm91bmNlYmFjaywgYmVsb3cuXG5cdFx0XHRcdFx0aWYgKE1hdGguYWJzKG1vdmVtZW50U3BlZWQpIDwgX2tNaW5pbXVtU3BlZWQpIHtcblx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSAwO1xuXHRcdFx0XHRcdFx0ZmxpbmdEaXN0YW5jZSA9IDA7XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXG5cblx0XHRcdFx0XHRcdC8qIENhbGN1bGF0ZSB0aGUgZmxpbmcgZHVyYXRpb24uICBBcyBwZXIgVG91Y2hTY3JvbGwsIHRoZSBzcGVlZCBhdCBhbnkgcGFydGljdWxhclxuXHRcdFx0XHRcdFx0cG9pbnQgaW4gdGltZSBjYW4gYmUgY2FsY3VsYXRlZCBhczpcblx0XHRcdFx0XHRcdFx0eyBzcGVlZCB9ID0geyBpbml0aWFsIHNwZWVkIH0gKiAoeyBmcmljdGlvbiB9IHRvIHRoZSBwb3dlciBvZiB7IGR1cmF0aW9uIH0pXG5cdFx0XHRcdFx0XHQuLi5hc3N1bWluZyBhbGwgdmFsdWVzIGFyZSBpbiBlcXVhbCBwaXhlbHMvbWlsbGlzZWNvbmQgbWVhc3VyZW1lbnRzLiAgQXMgd2Uga25vdyB0aGVcblx0XHRcdFx0XHRcdG1pbmltdW0gdGFyZ2V0IHNwZWVkLCB0aGlzIGNhbiBiZSBhbHRlcmVkIHRvOlxuXHRcdFx0XHRcdFx0XHR7IGR1cmF0aW9uIH0gPSBsb2coIHsgc3BlZWQgfSAvIHsgaW5pdGlhbCBzcGVlZCB9ICkgLyBsb2coIHsgZnJpY3Rpb24gfSApXG5cdFx0XHRcdFx0XHQqL1xuXG5cdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gTWF0aC5sb2coX2tNaW5pbXVtU3BlZWQgLyBNYXRoLmFicyhtb3ZlbWVudFNwZWVkKSkgLyBNYXRoLmxvZyhfa0ZyaWN0aW9uKTtcblxuXG5cdFx0XHRcdFx0XHQvKiBDYWxjdWxhdGUgdGhlIGZsaW5nIGRpc3RhbmNlIChiZWZvcmUgYW55IGJvdW5jaW5nIG9yIHNuYXBwaW5nKS4gIEFzIHBlclxuXHRcdFx0XHRcdFx0VG91Y2hTY3JvbGwsIHRoZSB0b3RhbCBkaXN0YW5jZSBjb3ZlcmVkIGNhbiBiZSBhcHByb3hpbWF0ZWQgYnkgc3VtbWluZ1xuXHRcdFx0XHRcdFx0dGhlIGRpc3RhbmNlIHBlciBtaWxsaXNlY29uZCwgcGVyIG1pbGxpc2Vjb25kIG9mIGR1cmF0aW9uIC0gYSBkaXZlcmdlbnQgc2VyaWVzLFxuXHRcdFx0XHRcdFx0YW5kIHNvIHJhdGhlciB0cmlja3kgdG8gbW9kZWwgb3RoZXJ3aXNlIVxuXHRcdFx0XHRcdFx0U28gdXNpbmcgdmFsdWVzIGluIHBpeGVscyBwZXIgbWlsbGlzZWNvbmQ6XG5cdFx0XHRcdFx0XHRcdHsgZGlzdGFuY2UgfSA9IHsgaW5pdGlhbCBzcGVlZCB9ICogKDEgLSAoeyBmcmljdGlvbiB9IHRvIHRoZSBwb3dlclxuXHRcdFx0XHRcdFx0XHRcdG9mIHsgZHVyYXRpb24gKyAxIH0pIC8gKDEgLSB7IGZyaWN0aW9uIH0pXG5cdFx0XHRcdFx0XHQqL1xuXG5cdFx0XHRcdFx0XHRmbGluZ0Rpc3RhbmNlID0gbW92ZW1lbnRTcGVlZCAqICgxIC0gTWF0aC5wb3coX2tGcmljdGlvbiwgZmxpbmdEdXJhdGlvbiArIDEpKSAvICgxIC0gX2tGcmljdGlvbik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIGEgdGFyZ2V0IGZsaW5nIHBvc2l0aW9uXG5cdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IE1hdGguZmxvb3IoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSArIGZsaW5nRGlzdGFuY2UpO1xuXG5cdFx0XHRcdFx0Ly8gSWYgYm91bmNpbmcgaXMgZGlzYWJsZWQsIGFuZCB0aGUgbGFzdCBzY3JvbGwgcG9zaXRpb24gYW5kIGZsaW5nIHBvc2l0aW9uIGFyZSBib3RoIGF0IGEgYm91bmQsXG5cdFx0XHRcdFx0Ly8gcmVzZXQgdGhlIGZsaW5nIHBvc2l0aW9uIHRvIHRoZSBib3VuZFxuXHRcdFx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5ib3VuY2luZykge1xuXHRcdFx0XHRcdFx0aWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPT09IDAgJiYgZmxpbmdQb3NpdGlvbiA+IDApIHtcblx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IDA7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPT09IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSAmJiBmbGluZ1Bvc2l0aW9uIDwgX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSkge1xuXHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBJbiBwYWdpbmF0ZWQgc25hcHBpbmcgbW9kZSwgZGV0ZXJtaW5lIHRoZSBwYWdlIHRvIHNuYXAgdG8gLSBtYXhpbXVtXG5cdFx0XHRcdFx0Ly8gb25lIHBhZ2UgaW4gZWl0aGVyIGRpcmVjdGlvbiBmcm9tIHRoZSBjdXJyZW50IHBhZ2UuXG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMucGFnaW5hdGVkU25hcCAmJiBfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XG5cdFx0XHRcdFx0XHRmbGluZ1N0YXJ0U2VnbWVudCA9IC1fbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXTtcblx0XHRcdFx0XHRcdGlmIChfYmFzZVNlZ21lbnRbYXhpc10gPCBmbGluZ1N0YXJ0U2VnbWVudCkge1xuXHRcdFx0XHRcdFx0XHRmbGluZ1N0YXJ0U2VnbWVudCA9IE1hdGguZmxvb3IoZmxpbmdTdGFydFNlZ21lbnQpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZmxpbmdTdGFydFNlZ21lbnQgPSBNYXRoLmNlaWwoZmxpbmdTdGFydFNlZ21lbnQpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgdGFyZ2V0IHBvc2l0aW9uIHdpbGwgZW5kIHVwIGJleW9uZCBhbm90aGVyIHBhZ2UsIHRhcmdldCB0aGF0IHBhZ2UgZWRnZVxuXHRcdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPiAtKGZsaW5nU3RhcnRTZWdtZW50IC0gMSkgKiBfc25hcEdyaWRTaXplW2F4aXNdKSB7XG5cdFx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiArIChmbGluZ1N0YXJ0U2VnbWVudCAtIDEpICogX3NuYXBHcmlkU2l6ZVtheGlzXTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoZmxpbmdQb3NpdGlvbiA8IC0oZmxpbmdTdGFydFNlZ21lbnQgKyAxKSAqIF9zbmFwR3JpZFNpemVbYXhpc10pIHtcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBmbGluZ1Bvc2l0aW9uICsgKGZsaW5nU3RhcnRTZWdtZW50ICsgMSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xuXG5cdFx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIGlmIHRoZSBtb3ZlbWVudCBzcGVlZCB3YXMgYWJvdmUgdGhlIG1pbmltdW0gdmVsb2NpdHksIGNvbnRpbnVlXG5cdFx0XHRcdFx0XHQvLyBpbiB0aGUgbW92ZSBkaXJlY3Rpb24uXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKE1hdGguYWJzKG1vdmVtZW50U3BlZWQpID4gX2tNaW5pbXVtU3BlZWQpIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBEZXRlcm1pbmUgdGhlIHRhcmdldCBzZWdtZW50XG5cdFx0XHRcdFx0XHRcdGlmIChtb3ZlbWVudFNwZWVkIDwgMCkge1xuXHRcdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSBNYXRoLmZsb29yKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdKSAqIF9zbmFwR3JpZFNpemVbYXhpc107XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IE1hdGguY2VpbChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIC8gX3NuYXBHcmlkU2l6ZVtheGlzXSkgKiBfc25hcEdyaWRTaXplW2F4aXNdO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IE1hdGgubWluKF9pbnN0YW5jZU9wdGlvbnMubWF4RmxpbmdEdXJhdGlvbiwgZmxpbmdEdXJhdGlvbiAqIChmbGluZ1Bvc2l0aW9uIC0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSkgLyBmbGluZ0Rpc3RhbmNlKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIEluIG5vbi1wYWdpbmF0ZWQgc25hcHBpbmcgbW9kZSwgc25hcCB0byB0aGUgbmVhcmVzdCBncmlkIGxvY2F0aW9uIHRvIHRoZSB0YXJnZXRcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9pbnN0YW5jZU9wdGlvbnMuc25hcHBpbmcpIHtcblx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiAtIChNYXRoLnJvdW5kKGZsaW5nUG9zaXRpb24gLyBfc25hcEdyaWRTaXplW2F4aXNdKSAqIF9zbmFwR3JpZFNpemVbYXhpc10pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIERlYWwgd2l0aCBjYXNlcyB3aGVyZSB0aGUgdGFyZ2V0IGlzIGJleW9uZCB0aGUgYm91bmRzXG5cdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gLSBib3VuY2VEaXN0YW5jZSA+IDApIHtcblx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbjtcblx0XHRcdFx0XHRcdGJvdW5kc0JvdW5jZSA9IHRydWU7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChmbGluZ1Bvc2l0aW9uIC0gYm91bmNlRGlzdGFuY2UgPCBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcblx0XHRcdFx0XHRcdGJvdW5jZURpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiAtIF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXTtcblx0XHRcdFx0XHRcdGJvdW5kc0JvdW5jZSA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gQW1lbmQgdGhlIHBvc2l0aW9ucyBhbmQgYmV6aWVyIGN1cnZlIGlmIG5lY2Vzc2FyeVxuXHRcdFx0XHRcdGlmIChib3VuY2VEaXN0YW5jZSkge1xuXG5cdFx0XHRcdFx0XHQvLyBJZiB0aGUgZmxpbmcgbW92ZXMgdGhlIHNjcm9sbGVyIGJleW9uZCB0aGUgbm9ybWFsIHNjcm9sbCBib3VuZHMsIGFuZFxuXHRcdFx0XHRcdFx0Ly8gdGhlIGJvdW5jZSBpcyBzbmFwcGluZyB0aGUgc2Nyb2xsIGJhY2sgYWZ0ZXIgdGhlIGZsaW5nOlxuXHRcdFx0XHRcdFx0aWYgKGJvdW5kc0JvdW5jZSAmJiBfaW5zdGFuY2VPcHRpb25zLmJvdW5jaW5nICYmIGZsaW5nRGlzdGFuY2UpIHtcblx0XHRcdFx0XHRcdFx0ZmxpbmdEaXN0YW5jZSA9IE1hdGguZmxvb3IoZmxpbmdEaXN0YW5jZSk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPiAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0YmV5b25kQm91bmRzRmxpbmdEaXN0YW5jZSA9IGZsaW5nUG9zaXRpb24gLSBNYXRoLm1heCgwLCBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlID0gZmxpbmdQb3NpdGlvbiAtIE1hdGgubWluKF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSwgX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YmFzZUZsaW5nQ29tcG9uZW50ID0gZmxpbmdEaXN0YW5jZSAtIGJleW9uZEJvdW5kc0ZsaW5nRGlzdGFuY2U7XG5cblx0XHRcdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHRoZSB0aW1lIHByb3BvcnRpb24gdGhlIG9yaWdpbmFsIGJvdW5kIGlzIGFsb25nIHRoZSBmbGluZyBjdXJ2ZVxuXHRcdFx0XHRcdFx0XHRpZiAoIWZsaW5nRGlzdGFuY2UgfHwgIWZsaW5nRHVyYXRpb24pIHtcblx0XHRcdFx0XHRcdFx0XHR0aW1lUHJvcG9ydGlvbiA9IDA7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGltZVByb3BvcnRpb24gPSBmbGluZ0Jlemllci5fZ2V0Q29vcmRpbmF0ZUZvclQoZmxpbmdCZXppZXIuZ2V0VEZvclkoKGZsaW5nRGlzdGFuY2UgLSBiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlKSAvIGZsaW5nRGlzdGFuY2UsIDEgLyBmbGluZ0R1cmF0aW9uKSwgZmxpbmdCZXppZXIuX3AxLngsIGZsaW5nQmV6aWVyLl9wMi54KTtcblx0XHRcdFx0XHRcdFx0XHRib3VuZHNDcm9zc0RlbGF5ID0gdGltZVByb3BvcnRpb24gKiBmbGluZ0R1cmF0aW9uO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gRWlnaHRoIHRoZSBkaXN0YW5jZSBiZXlvbmRzIHRoZSBib3VuZHNcblx0XHRcdFx0XHRcdFx0bW9kaWZpZWREaXN0YW5jZSA9IE1hdGguY2VpbChiZXlvbmRCb3VuZHNGbGluZ0Rpc3RhbmNlIC8gOCk7XG5cblx0XHRcdFx0XHRcdFx0Ly8gRnVydGhlciBsaW1pdCB0aGUgYm91bmNlIHRvIGhhbGYgdGhlIGNvbnRhaW5lciBkaW1lbnNpb25zXG5cdFx0XHRcdFx0XHRcdGlmIChNYXRoLmFicyhtb2RpZmllZERpc3RhbmNlKSA+IF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSAvIDIpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAobW9kaWZpZWREaXN0YW5jZSA8IDApIHtcblx0XHRcdFx0XHRcdFx0XHRcdG1vZGlmaWVkRGlzdGFuY2UgPSAtTWF0aC5mbG9vcihfbWV0cmljcy5jb250YWluZXJbYXhpc10gLyAyKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bW9kaWZpZWREaXN0YW5jZSA9IE1hdGguZmxvb3IoX21ldHJpY3MuY29udGFpbmVyW2F4aXNdIC8gMik7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPiAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ym91bmNlVGFyZ2V0ID0gMDtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRib3VuY2VUYXJnZXQgPSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc107XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgZW50aXJlIGZsaW5nIGlzIGEgYm91bmNlLCBtb2RpZnkgYXBwcm9wcmlhdGVseVxuXHRcdFx0XHRcdFx0XHRpZiAodGltZVByb3BvcnRpb24gPT09IDApIHtcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0R1cmF0aW9uID0gZmxpbmdEdXJhdGlvbiAvIDY7XG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKyBiYXNlRmxpbmdDb21wb25lbnQgKyBtb2RpZmllZERpc3RhbmNlO1xuXHRcdFx0XHRcdFx0XHRcdGJvdW5jZURlbGF5ID0gZmxpbmdEdXJhdGlvbjtcblxuXHRcdFx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIHRha2UgYSBuZXcgY3VydmUgYW5kIGFkZCBpdCB0byB0aGUgdGltZW91dCBzdGFjayBmb3IgdGhlIGJvdW5jZVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gVGhlIG5ldyBib3VuY2UgZGVsYXkgaXMgdGhlIHByZS1ib3VuZGFyeSBmbGluZyBkdXJhdGlvbiwgcGx1cyBhXG5cdFx0XHRcdFx0XHRcdFx0Ly8gc2l4dGggb2YgdGhlIHBvc3QtYm91bmRhcnkgZmxpbmcuXG5cdFx0XHRcdFx0XHRcdFx0Ym91bmNlRGVsYXkgPSAodGltZVByb3BvcnRpb24gKyAoKDEgLSB0aW1lUHJvcG9ydGlvbikgLyA2KSkgKiBmbGluZ0R1cmF0aW9uO1xuXG5cdFx0XHRcdFx0XHRcdFx0X3NjaGVkdWxlQXhpc1Bvc2l0aW9uKGF4aXMsIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICsgYmFzZUZsaW5nQ29tcG9uZW50ICsgbW9kaWZpZWREaXN0YW5jZSksICgoMSAtIHRpbWVQcm9wb3J0aW9uKSAqIGZsaW5nRHVyYXRpb24gLyA2KSwgX2luc3RhbmNlT3B0aW9ucy5ib3VuY2VEZWNlbGVyYXRpb25CZXppZXIsIGJvdW5kc0Nyb3NzRGVsYXkpO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gTW9kaWZ5IHRoZSBmbGluZyB0byBtYXRjaCwgY2xpcHBpbmcgdG8gcHJldmVudCBvdmVyLWZsaW5nXG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdCZXppZXIgPSBmbGluZ0Jlemllci5kaXZpZGVBdFgoYm91bmNlRGVsYXkgLyBmbGluZ0R1cmF0aW9uLCAxIC8gZmxpbmdEdXJhdGlvbilbMF07XG5cdFx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IGJvdW5jZURlbGF5O1xuXHRcdFx0XHRcdFx0XHRcdGZsaW5nUG9zaXRpb24gPSAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSArIGJhc2VGbGluZ0NvbXBvbmVudCArIG1vZGlmaWVkRGlzdGFuY2UpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIElmIHRoZSBmbGluZyByZXF1aXJlcyBzbmFwcGluZyB0byBhIHNuYXAgbG9jYXRpb24sIGFuZCB0aGUgYm91bmNlIG5lZWRzIHRvXG5cdFx0XHRcdFx0XHQvLyByZXZlcnNlIHRoZSBmbGluZyBkaXJlY3Rpb24gYWZ0ZXIgdGhlIGZsaW5nIGNvbXBsZXRlczpcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoKGZsaW5nRGlzdGFuY2UgPCAwICYmIGJvdW5jZURpc3RhbmNlIDwgZmxpbmdEaXN0YW5jZSkgfHwgKGZsaW5nRGlzdGFuY2UgPiAwICYmIGJvdW5jZURpc3RhbmNlID4gZmxpbmdEaXN0YW5jZSkpIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBTaG9ydGVuIHRoZSBvcmlnaW5hbCBmbGluZyBkdXJhdGlvbiB0byByZWZsZWN0IHRoZSBib3VuY2Vcblx0XHRcdFx0XHRcdFx0ZmxpbmdQb3NpdGlvbiA9IGZsaW5nUG9zaXRpb24gLSBNYXRoLmZsb29yKGZsaW5nRGlzdGFuY2UgLyAyKTtcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGlzdGFuY2UgPSBib3VuY2VEaXN0YW5jZSAtIE1hdGguZmxvb3IoZmxpbmdEaXN0YW5jZSAvIDIpO1xuXHRcdFx0XHRcdFx0XHRib3VuY2VEdXJhdGlvbiA9IE1hdGguc3FydChNYXRoLmFicyhib3VuY2VEaXN0YW5jZSkpICogNTA7XG5cdFx0XHRcdFx0XHRcdGJvdW5jZVRhcmdldCA9IGZsaW5nUG9zaXRpb24gLSBib3VuY2VEaXN0YW5jZTtcblx0XHRcdFx0XHRcdFx0ZmxpbmdEdXJhdGlvbiA9IDM1MDtcblx0XHRcdFx0XHRcdFx0Ym91bmNlRGVsYXkgPSBmbGluZ0R1cmF0aW9uICogMC45NztcblxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhlIGJvdW5jZSBpcyB0cnVuY2F0aW5nIHRoZSBmbGluZywgb3IgY29udGludWluZyB0aGUgZmxpbmcgb24gaW4gdGhlIHNhbWVcblx0XHRcdFx0XHRcdC8vIGRpcmVjdGlvbiB0byBoaXQgdGhlIG5leHQgYm91bmRhcnk6XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmbGluZ1Bvc2l0aW9uID0gZmxpbmdQb3NpdGlvbiAtIGJvdW5jZURpc3RhbmNlO1xuXG5cdFx0XHRcdFx0XHRcdC8vIElmIHRoZXJlIHdhcyBubyBmbGluZyBkaXN0YW5jZSBvcmlnaW5hbGx5LCB1c2UgdGhlIGJvdW5jZSBkZXRhaWxzXG5cdFx0XHRcdFx0XHRcdGlmICghZmxpbmdEaXN0YW5jZSkge1xuXHRcdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBib3VuY2VEdXJhdGlvbjtcblxuXHRcdFx0XHRcdFx0XHQvLyBJZiB0cnVuY2F0aW5nIHRoZSBmbGluZyBhdCBhIHNuYXBwaW5nIGVkZ2U6XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoKGZsaW5nRGlzdGFuY2UgPCAwICYmIGJvdW5jZURpc3RhbmNlIDwgMCkgfHwgKGZsaW5nRGlzdGFuY2UgPiAwICYmIGJvdW5jZURpc3RhbmNlID4gMCkpIHtcblx0XHRcdFx0XHRcdFx0XHR0aW1lUHJvcG9ydGlvbiA9IGZsaW5nQmV6aWVyLl9nZXRDb29yZGluYXRlRm9yVChmbGluZ0Jlemllci5nZXRURm9yWSgoTWF0aC5hYnMoZmxpbmdEaXN0YW5jZSkgLSBNYXRoLmFicyhib3VuY2VEaXN0YW5jZSkpIC8gTWF0aC5hYnMoZmxpbmdEaXN0YW5jZSksIDEgLyBmbGluZ0R1cmF0aW9uKSwgZmxpbmdCZXppZXIuX3AxLngsIGZsaW5nQmV6aWVyLl9wMi54KTtcblx0XHRcdFx0XHRcdFx0XHRmbGluZ0JlemllciA9IGZsaW5nQmV6aWVyLmRpdmlkZUF0WCh0aW1lUHJvcG9ydGlvbiwgMSAvIGZsaW5nRHVyYXRpb24pWzBdO1xuXHRcdFx0XHRcdFx0XHRcdGZsaW5nRHVyYXRpb24gPSBNYXRoLnJvdW5kKGZsaW5nRHVyYXRpb24gKiB0aW1lUHJvcG9ydGlvbik7XG5cblx0XHRcdFx0XHRcdFx0Ly8gSWYgZXh0ZW5kaW5nIHRoZSBmbGluZyB0byByZWFjaCB0aGUgbmV4dCBzbmFwcGluZyBib3VuZGFyeSwgbm8gZnVydGhlclxuXHRcdFx0XHRcdFx0XHQvLyBhY3Rpb24gaXMgcmVxdWlyZWQuXG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRib3VuY2VEaXN0YW5jZSA9IDA7XG5cdFx0XHRcdFx0XHRcdGJvdW5jZUR1cmF0aW9uID0gMDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBJZiBubyBmbGluZyBvciBib3VuY2UgaXMgcmVxdWlyZWQsIGNvbnRpbnVlXG5cdFx0XHRcdFx0aWYgKGZsaW5nUG9zaXRpb24gPT09IF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gJiYgIWJvdW5jZURpc3RhbmNlKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bW92ZVJlcXVpcmVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdC8vIFBlcmZvcm0gdGhlIGZsaW5nXG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBmbGluZ1Bvc2l0aW9uLCBmbGluZ0R1cmF0aW9uLCBmbGluZ0JlemllciwgYm91bmRzQ3Jvc3NEZWxheSk7XG5cblx0XHRcdFx0XHQvLyBTY2hlZHVsZSBhIGJvdW5jZSBpZiBhcHByb3ByaWF0ZVxuXHRcdFx0XHRcdGlmIChib3VuY2VEaXN0YW5jZSAmJiBib3VuY2VEdXJhdGlvbikge1xuXHRcdFx0XHRcdFx0X3NjaGVkdWxlQXhpc1Bvc2l0aW9uKGF4aXMsIGJvdW5jZVRhcmdldCwgYm91bmNlRHVyYXRpb24sIF9pbnN0YW5jZU9wdGlvbnMuYm91bmNlQmV6aWVyLCBib3VuY2VEZWxheSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0bWF4QW5pbWF0aW9uVGltZSA9IE1hdGgubWF4KG1heEFuaW1hdGlvblRpbWUsIGJvdW5jZURpc3RhbmNlID8gKGJvdW5jZURlbGF5ICsgYm91bmNlRHVyYXRpb24pIDogZmxpbmdEdXJhdGlvbik7XG5cdFx0XHRcdFx0c2Nyb2xsUG9zaXRpb25zVG9BcHBseVtheGlzXSA9IChib3VuY2VUYXJnZXQgPT09IGZhbHNlKSA/IGZsaW5nUG9zaXRpb24gOiBib3VuY2VUYXJnZXQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKG1vdmVSZXF1aXJlZCAmJiBtYXhBbmltYXRpb25UaW1lKSB7XG5cdFx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBhbkF4aXM7XG5cblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIHN0b3JlZCBzY3JvbGwgcG9zaXRpb24gcmVhZHkgZm9yIGZpbmFsaXNpbmdcblx0XHRcdFx0XHRmb3IgKGFuQXhpcyBpbiBzY3JvbGxQb3NpdGlvbnNUb0FwcGx5KSB7XG5cdFx0XHRcdFx0XHRpZiAoc2Nyb2xsUG9zaXRpb25zVG9BcHBseS5oYXNPd25Qcm9wZXJ0eShhbkF4aXMpKSB7XG5cdFx0XHRcdFx0XHRcdF9sYXN0U2Nyb2xsUG9zaXRpb25bYW5BeGlzXSA9IHNjcm9sbFBvc2l0aW9uc1RvQXBwbHlbYW5BeGlzXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRfZmluYWxpemVTY3JvbGwoKTtcblx0XHRcdFx0fSwgbWF4QW5pbWF0aW9uVGltZSkpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbW92ZVJlcXVpcmVkO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBCb3VuY2UgYmFjayBpbnRvIGJvdW5kcyBpZiBuZWNlc3NhcnksIG9yIHNuYXAgdG8gYSBncmlkIGxvY2F0aW9uLlxuXHRcdCAqL1xuXHRcdF9zbmFwU2Nyb2xsID0gZnVuY3Rpb24gX3NuYXBTY3JvbGwoc2Nyb2xsQ2FuY2VsbGVkKSB7XG5cdFx0XHR2YXIgYXhpcztcblx0XHRcdHZhciBzbmFwRHVyYXRpb24gPSBzY3JvbGxDYW5jZWxsZWQgPyAxMDAgOiAzNTA7XG5cdFx0XHR2YXIgdGFyZ2V0UG9zaXRpb24gPSBfbGFzdFNjcm9sbFBvc2l0aW9uO1xuXG5cdFx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIHNlZSBpZiBhIHNuYXAgaXMgcmVxdWlyZWRcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XG5cblx0XHRcdFx0Ly8gU3RvcmUgY3VycmVudCBzbmFwIGluZGV4XG5cdFx0XHRcdF9zbmFwSW5kZXggPSBfZ2V0U25hcEluZGV4Rm9yUG9zaXRpb24odGFyZ2V0UG9zaXRpb24pO1xuXHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzKF9zbmFwSW5kZXgsIHRhcmdldFBvc2l0aW9uKTtcblx0XHRcdH1cblx0XHRcdHRhcmdldFBvc2l0aW9uID0gX2xpbWl0VG9Cb3VuZHModGFyZ2V0UG9zaXRpb24pO1xuXG5cdFx0XHR2YXIgc25hcFJlcXVpcmVkID0gZmFsc2U7XG5cdFx0XHRmb3IgKGF4aXMgaW4gX2Jhc2VTY3JvbGxhYmxlQXhlcykge1xuXHRcdFx0XHRpZiAoX2Jhc2VTY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xuXHRcdFx0XHRcdGlmICh0YXJnZXRQb3NpdGlvbltheGlzXSAhPT0gX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSkge1xuXHRcdFx0XHRcdFx0c25hcFJlcXVpcmVkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICghc25hcFJlcXVpcmVkKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUGVyZm9ybSB0aGUgc25hcFxuXHRcdFx0Zm9yIChheGlzIGluIF9iYXNlU2Nyb2xsYWJsZUF4ZXMpIHtcblx0XHRcdFx0aWYgKF9iYXNlU2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIHRhcmdldFBvc2l0aW9uW2F4aXNdLCBzbmFwRHVyYXRpb24pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdF90aW1lb3V0cy5wdXNoKHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc3RvcmVkIHNjcm9sbCBwb3NpdGlvbiByZWFkeSBmb3IgZmluYWxpemluZ1xuXHRcdFx0XHRfbGFzdFNjcm9sbFBvc2l0aW9uID0gdGFyZ2V0UG9zaXRpb247XG5cblx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKHNjcm9sbENhbmNlbGxlZCk7XG5cdFx0XHR9LCBzbmFwRHVyYXRpb24pKTtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCBhbiBhcHByb3ByaWF0ZSBzbmFwIGluZGV4IGZvciBhIHN1cHBsaWVkIHBvaW50LlxuXHRcdCAqL1xuXHRcdF9nZXRTbmFwSW5kZXhGb3JQb3NpdGlvbiA9IGZ1bmN0aW9uIF9nZXRTbmFwSW5kZXhGb3JQb3NpdGlvbihjb29yZGluYXRlcykge1xuXHRcdFx0dmFyIGF4aXM7XG5cdFx0XHR2YXIgaW5kZXhlcyA9IHt4OiAwLCB5OiAwfTtcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSAmJiBfc25hcEdyaWRTaXplW2F4aXNdKSB7XG5cdFx0XHRcdFx0aW5kZXhlc1theGlzXSA9IE1hdGgucm91bmQoY29vcmRpbmF0ZXNbYXhpc10gLyBfc25hcEdyaWRTaXplW2F4aXNdKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGluZGV4ZXM7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCBhbiBhcHByb3ByaWF0ZSBzbmFwIHBvaW50IGZvciBhIHN1cHBsaWVkIGluZGV4LlxuXHRcdCAqL1xuXHRcdF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzID0gZnVuY3Rpb24gX2dldFNuYXBQb3NpdGlvbkZvckluZGV4ZXMoaW5kZXhlcywgY3VycmVudENvb3JkaW5hdGVzKSB7XG5cdFx0XHR2YXIgYXhpcztcblx0XHRcdHZhciBjb29yZGluYXRlc1RvUmV0dXJuID0ge1xuXHRcdFx0XHR4OiBjdXJyZW50Q29vcmRpbmF0ZXMueCxcblx0XHRcdFx0eTogY3VycmVudENvb3JkaW5hdGVzLnlcblx0XHRcdH07XG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcblx0XHRcdFx0XHRjb29yZGluYXRlc1RvUmV0dXJuW2F4aXNdID0gaW5kZXhlc1theGlzXSAqIF9zbmFwR3JpZFNpemVbYXhpc107XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBjb29yZGluYXRlc1RvUmV0dXJuO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBMaW1pdCBjb29yZGluYXRlcyB3aXRoaW4gdGhlIGJvdW5kcyBvZiB0aGUgc2Nyb2xsYWJsZSB2aWV3cG9ydC5cblx0XHQgKi9cblx0XHRfbGltaXRUb0JvdW5kcyA9IGZ1bmN0aW9uIF9saW1pdFRvQm91bmRzKGNvb3JkaW5hdGVzKSB7XG5cdFx0XHR2YXIgYXhpcztcblx0XHRcdHZhciBjb29yZGluYXRlc1RvUmV0dXJuID0geyB4OiBjb29yZGluYXRlcy54LCB5OiBjb29yZGluYXRlcy55IH07XG5cblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xuXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGNvb3JkaW5hdGUgaXMgYmV5b25kIHRoZSBlZGdlcyBvZiB0aGUgc2Nyb2xsZXIsIHVzZSB0aGUgY2xvc2VzdCBlZGdlXG5cdFx0XHRcdFx0aWYgKGNvb3JkaW5hdGVzW2F4aXNdID4gMCkge1xuXHRcdFx0XHRcdFx0Y29vcmRpbmF0ZXNUb1JldHVybltheGlzXSA9IDA7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGNvb3JkaW5hdGVzW2F4aXNdIDwgX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdKSB7XG5cdFx0XHRcdFx0XHRjb29yZGluYXRlc1RvUmV0dXJuW2F4aXNdID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdO1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBjb29yZGluYXRlc1RvUmV0dXJuO1xuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIFNldHMgdXAgdGhlIERPTSBhcm91bmQgdGhlIG5vZGUgdG8gYmUgc2Nyb2xsZWQuXG5cdFx0ICovXG5cdFx0X2luaXRpYWxpemVET00gPSBmdW5jdGlvbiBfaW5pdGlhbGl6ZURPTSgpIHtcblx0XHRcdHZhciBvZmZzY3JlZW5GcmFnbWVudCwgb2Zmc2NyZWVuTm9kZSwgc2Nyb2xsWVBhcmVudDtcblxuXHRcdFx0Ly8gQ2hlY2sgd2hldGhlciB0aGUgRE9NIGlzIGFscmVhZHkgcHJlc2VudCBhbmQgdmFsaWQgLSBpZiBzbywgbm8gZnVydGhlciBhY3Rpb24gcmVxdWlyZWQuXG5cdFx0XHRpZiAoX2V4aXN0aW5nRE9NVmFsaWQoKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIE90aGVyd2lzZSwgdGhlIERPTSBuZWVkcyB0byBiZSBjcmVhdGVkIGluc2lkZSB0aGUgb3JpZ2luYWxseSBzdXBwbGllZCBub2RlLiAgVGhlIG5vZGVcblx0XHRcdC8vIGhhcyBhIGNvbnRhaW5lciBpbnNlcnRlZCBpbnNpZGUgaXQgLSB3aGljaCBhY3RzIGFzIGFuIGFuY2hvciBlbGVtZW50IHdpdGggY29uc3RyYWludHMgLVxuXHRcdFx0Ly8gYW5kIHRoZW4gdGhlIHNjcm9sbGFibGUgbGF5ZXJzIGFzIGFwcHJvcHJpYXRlLlxuXG5cdFx0XHQvLyBDcmVhdGUgYSBuZXcgZG9jdW1lbnQgZnJhZ21lbnQgdG8gdGVtcG9yYXJpbHkgaG9sZCB0aGUgc2Nyb2xsYWJsZSBjb250ZW50XG5cdFx0XHRvZmZzY3JlZW5GcmFnbWVudCA9IF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5vd25lckRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblx0XHRcdG9mZnNjcmVlbk5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdESVYnKTtcblx0XHRcdG9mZnNjcmVlbkZyYWdtZW50LmFwcGVuZENoaWxkKG9mZnNjcmVlbk5vZGUpO1xuXG5cdFx0XHQvLyBEcm9wIGluIHRoZSB3cmFwcGluZyBIVE1MXG5cdFx0XHRvZmZzY3JlZW5Ob2RlLmlubmVySFRNTCA9IEZUU2Nyb2xsZXIucHJvdG90eXBlLmdldFByZXBlbmRlZEhUTUwoIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWCwgIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSwgX2luc3RhbmNlT3B0aW9ucy5od0FjY2VsZXJhdGlvbkNsYXNzKSArIEZUU2Nyb2xsZXIucHJvdG90eXBlLmdldEFwcGVuZGVkSFRNTCghX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYLCAhX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZLCBfaW5zdGFuY2VPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3MsIF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycyk7XG5cblx0XHRcdC8vIFVwZGF0ZSByZWZlcmVuY2VzIGFzIGFwcHJvcHJpYXRlXG5cdFx0XHRfY29udGFpbmVyTm9kZSA9IG9mZnNjcmVlbk5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cdFx0XHRzY3JvbGxZUGFyZW50ID0gX2NvbnRhaW5lck5vZGU7XG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XG5cdFx0XHRcdF9zY3JvbGxOb2Rlcy54ID0gX2NvbnRhaW5lck5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cdFx0XHRcdHNjcm9sbFlQYXJlbnQgPSBfc2Nyb2xsTm9kZXMueDtcblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xuXHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy54ID0gX2NvbnRhaW5lck5vZGUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZnRzY3JvbGxlcl9zY3JvbGxiYXJ4JylbMF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1kpIHtcblx0XHRcdFx0X3Njcm9sbE5vZGVzLnkgPSBzY3JvbGxZUGFyZW50LmZpcnN0RWxlbWVudENoaWxkO1xuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XG5cdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnkgPSBfY29udGFpbmVyTm9kZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdmdHNjcm9sbGVyX3Njcm9sbGJhcnknKVswXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUgPSBfc2Nyb2xsTm9kZXMueTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IF9zY3JvbGxOb2Rlcy54O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUYWtlIHRoZSBjb250ZW50cyBvZiB0aGUgc2Nyb2xsYWJsZSBlbGVtZW50LCBhbmQgY29weSB0aGVtIGludG8gdGhlIG5ldyBjb250YWluZXJcblx0XHRcdHdoaWxlIChfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuZmlyc3RDaGlsZCkge1xuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoX3Njcm9sbGFibGVNYXN0ZXJOb2RlLmZpcnN0Q2hpbGQpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBNb3ZlIHRoZSB3cmFwcGVkIGVsZW1lbnRzIGJhY2sgaW50byB0aGUgZG9jdW1lbnRcblx0XHRcdF9zY3JvbGxhYmxlTWFzdGVyTm9kZS5hcHBlbmRDaGlsZChfY29udGFpbmVyTm9kZSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEF0dGVtcHRzIHRvIHVzZSBhbnkgZXhpc3RpbmcgRE9NIHNjcm9sbGVyIG5vZGVzIGlmIHBvc3NpYmxlLCByZXR1cm5pbmcgdHJ1ZSBpZiBzbztcblx0XHQgKiB1cGRhdGVzIGFsbCBpbnRlcm5hbCBlbGVtZW50IHJlZmVyZW5jZXMuXG5cdFx0ICovXG5cdFx0X2V4aXN0aW5nRE9NVmFsaWQgPSBmdW5jdGlvbiBfZXhpc3RpbmdET01WYWxpZCgpIHtcblx0XHRcdHZhciBzY3JvbGxlckNvbnRhaW5lciwgbGF5ZXJYLCBsYXllclksIHlQYXJlbnQsIHNjcm9sbGVyWCwgc2Nyb2xsZXJZLCBjYW5kaWRhdGVzLCBpLCBsO1xuXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZXJlJ3MgYW4gaW5pdGlhbCBjaGlsZCBub2RlLCBhbmQgbWFrZSBzdXJlIGl0J3MgdGhlIGNvbnRhaW5lciBjbGFzc1xuXHRcdFx0c2Nyb2xsZXJDb250YWluZXIgPSBfc2Nyb2xsYWJsZU1hc3Rlck5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cdFx0XHRpZiAoIXNjcm9sbGVyQ29udGFpbmVyIHx8IHNjcm9sbGVyQ29udGFpbmVyLmNsYXNzTmFtZS5pbmRleE9mKCdmdHNjcm9sbGVyX2NvbnRhaW5lcicpID09PSAtMSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIHgtYXhpcyBzY3JvbGxpbmcgaXMgZW5hYmxlZCwgZmluZCBhbmQgdmVyaWZ5IHRoZSB4IHNjcm9sbGVyIGxheWVyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XG5cblx0XHRcdFx0Ly8gRmluZCBhbmQgdmVyaWZ5IHRoZSB4IHNjcm9sbGVyIGxheWVyXG5cdFx0XHRcdGxheWVyWCA9IHNjcm9sbGVyQ29udGFpbmVyLmZpcnN0RWxlbWVudENoaWxkO1xuXHRcdFx0XHRpZiAoIWxheWVyWCB8fCBsYXllclguY2xhc3NOYW1lLmluZGV4T2YoJ2Z0c2Nyb2xsZXJfeCcpID09PSAtMSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR5UGFyZW50ID0gbGF5ZXJYO1xuXG5cdFx0XHRcdC8vIEZpbmQgYW5kIHZlcmlmeSB0aGUgeCBzY3JvbGxiYXIgaWYgZW5hYmxlZFxuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XG5cdFx0XHRcdFx0Y2FuZGlkYXRlcyA9IHNjcm9sbGVyQ29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2Z0c2Nyb2xsZXJfc2Nyb2xsYmFyeCcpO1xuXHRcdFx0XHRcdGlmIChjYW5kaWRhdGVzKSB7XG5cdFx0XHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gY2FuZGlkYXRlcy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGNhbmRpZGF0ZXNbaV0ucGFyZW50Tm9kZSA9PT0gc2Nyb2xsZXJDb250YWluZXIpIHtcblx0XHRcdFx0XHRcdFx0XHRzY3JvbGxlclggPSBjYW5kaWRhdGVzW2ldO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghc2Nyb2xsZXJYKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR5UGFyZW50ID0gc2Nyb2xsZXJDb250YWluZXI7XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIHktYXhpcyBzY3JvbGxpbmcgaXMgZW5hYmxlZCwgZmluZCBhbmQgdmVyaWZ5IHRoZSB5IHNjcm9sbGVyIGxheWVyXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XG5cblx0XHRcdFx0Ly8gRmluZCBhbmQgdmVyaWZ5IHRoZSB4IHNjcm9sbGVyIGxheWVyXG5cdFx0XHRcdGxheWVyWSA9IHlQYXJlbnQuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cdFx0XHRcdGlmICghbGF5ZXJZIHx8IGxheWVyWS5jbGFzc05hbWUuaW5kZXhPZignZnRzY3JvbGxlcl95JykgPT09IC0xKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRmluZCBhbmQgdmVyaWZ5IHRoZSB5IHNjcm9sbGJhciBpZiBlbmFibGVkXG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcblx0XHRcdFx0XHRjYW5kaWRhdGVzID0gc2Nyb2xsZXJDb250YWluZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZnRzY3JvbGxlcl9zY3JvbGxiYXJ5Jyk7XG5cdFx0XHRcdFx0aWYgKGNhbmRpZGF0ZXMpIHtcblx0XHRcdFx0XHRcdGZvciAoaSA9IDAsIGwgPSBjYW5kaWRhdGVzLmxlbmd0aDsgaSA8IGw7IGkgPSBpICsgMSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoY2FuZGlkYXRlc1tpXS5wYXJlbnROb2RlID09PSBzY3JvbGxlckNvbnRhaW5lcikge1xuXHRcdFx0XHRcdFx0XHRcdHNjcm9sbGVyWSA9IGNhbmRpZGF0ZXNbaV07XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCFzY3JvbGxlclkpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gRWxlbWVudHMgZm91bmQgYW5kIHZlcmlmaWVkIC0gdXBkYXRlIHRoZSByZWZlcmVuY2VzIGFuZCByZXR1cm4gc3VjY2Vzc1xuXHRcdFx0X2NvbnRhaW5lck5vZGUgPSBzY3JvbGxlckNvbnRhaW5lcjtcblx0XHRcdGlmIChsYXllclgpIHtcblx0XHRcdFx0X3Njcm9sbE5vZGVzLnggPSBsYXllclg7XG5cdFx0XHR9XG5cdFx0XHRpZiAobGF5ZXJZKSB7XG5cdFx0XHRcdF9zY3JvbGxOb2Rlcy55ID0gbGF5ZXJZO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNjcm9sbGVyWCkge1xuXHRcdFx0XHRfc2Nyb2xsYmFyTm9kZXMueCA9IHNjcm9sbGVyWDtcblx0XHRcdH1cblx0XHRcdGlmIChzY3JvbGxlclkpIHtcblx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnkgPSBzY3JvbGxlclk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdZKSB7XG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IGxheWVyWTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZSA9IGxheWVyWDtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH07XG5cblx0XHRfZG9tQ2hhbmdlZCA9IGZ1bmN0aW9uIF9kb21DaGFuZ2VkKGUpIHtcblxuXHRcdFx0Ly8gSWYgdGhlIHRpbWVyIGlzIGFjdGl2ZSwgY2xlYXIgaXRcblx0XHRcdGlmIChfZG9tQ2hhbmdlRGVib3VuY2VyKSB7XG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoX2RvbUNoYW5nZURlYm91bmNlcik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlYWN0IHRvIHJlc2l6ZXMgYXQgb25jZVxuXHRcdFx0aWYgKGUgJiYgZS50eXBlID09PSAncmVzaXplJykge1xuXHRcdFx0XHRfdXBkYXRlRGltZW5zaW9ucygpO1xuXG5cdFx0XHQvLyBGb3Igb3RoZXIgY2hhbmdlcywgd2hpY2ggbWF5IG9jY3VyIGluIGdyb3Vwcywgc2V0IHVwIHRoZSBET00gY2hhbmdlZCB0aW1lclxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0X2RvbUNoYW5nZURlYm91bmNlciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdF91cGRhdGVEaW1lbnNpb25zKCk7XG5cdFx0XHRcdH0sIDEwMCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdF91cGRhdGVEaW1lbnNpb25zID0gZnVuY3Rpb24gX3VwZGF0ZURpbWVuc2lvbnMoaWdub3JlU25hcFNjcm9sbCkge1xuXHRcdFx0dmFyIGF4aXM7XG5cblx0XHRcdC8vIE9ubHkgdXBkYXRlIGRpbWVuc2lvbnMgaWYgdGhlIGNvbnRhaW5lciBub2RlIGV4aXN0cyAoRE9NIGVsZW1lbnRzIGNhbiBnbyBhd2F5IGlmXG5cdFx0XHQvLyB0aGUgc2Nyb2xsZXIgaW5zdGFuY2UgaXMgbm90IGRlc3Ryb3llZCBjb3JyZWN0bHkpXG5cdFx0XHRpZiAoIV9jb250YWluZXJOb2RlIHx8ICFfY29udGVudFBhcmVudE5vZGUpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoX2RvbUNoYW5nZURlYm91bmNlcikge1xuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KF9kb21DaGFuZ2VEZWJvdW5jZXIpO1xuXHRcdFx0XHRfZG9tQ2hhbmdlRGVib3VuY2VyID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHR2YXIgY29udGFpbmVyV2lkdGgsIGNvbnRhaW5lckhlaWdodCwgc3RhcnRBbGlnbm1lbnRzO1xuXG5cdFx0XHQvLyBJZiBhIG1hbnVhbCBzY3JvbGwgaXMgaW4gcHJvZ3Jlc3MsIGNhbmNlbCBpdFxuXHRcdFx0X2VuZFNjcm9sbChEYXRlLm5vdygpKTtcblxuXHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSBzdGFydGluZyBhbGlnbm1lbnQgZm9yIGNvbXBhcmlzb24gbGF0ZXJcblx0XHRcdHN0YXJ0QWxpZ25tZW50cyA9IHsgeDogZmFsc2UsIHk6IGZhbHNlIH07XG5cdFx0XHRmb3IgKGF4aXMgaW4gc3RhcnRBbGlnbm1lbnRzKSB7XG5cdFx0XHRcdGlmIChzdGFydEFsaWdubWVudHMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcblx0XHRcdFx0XHRpZiAoX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0c3RhcnRBbGlnbm1lbnRzW2F4aXNdID0gLTE7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdIDw9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xuXHRcdFx0XHRcdFx0c3RhcnRBbGlnbm1lbnRzW2F4aXNdID0gMTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gKiAyIDw9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSArIDUgJiYgX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAqIDIgPj0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdIC0gNSkge1xuXHRcdFx0XHRcdFx0c3RhcnRBbGlnbm1lbnRzW2F4aXNdID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y29udGFpbmVyV2lkdGggPSBfY29udGFpbmVyTm9kZS5vZmZzZXRXaWR0aDtcblx0XHRcdGNvbnRhaW5lckhlaWdodCA9IF9jb250YWluZXJOb2RlLm9mZnNldEhlaWdodDtcblxuXHRcdFx0Ly8gR3JhYiB0aGUgZGltZW5zaW9uc1xuXHRcdFx0dmFyIHJhd1Njcm9sbFdpZHRoID0gb3B0aW9ucy5jb250ZW50V2lkdGggfHwgX2NvbnRlbnRQYXJlbnROb2RlLm9mZnNldFdpZHRoO1xuXHRcdFx0dmFyIHJhd1Njcm9sbEhlaWdodCA9IG9wdGlvbnMuY29udGVudEhlaWdodCB8fCBfY29udGVudFBhcmVudE5vZGUub2Zmc2V0SGVpZ2h0O1xuXHRcdFx0dmFyIHNjcm9sbFdpZHRoID0gcmF3U2Nyb2xsV2lkdGg7XG5cdFx0XHR2YXIgc2Nyb2xsSGVpZ2h0ID0gcmF3U2Nyb2xsSGVpZ2h0O1xuXHRcdFx0dmFyIHRhcmdldFBvc2l0aW9uID0geyB4OiBmYWxzZSwgeTogZmFsc2UgfTtcblxuXHRcdFx0Ly8gVXBkYXRlIHNuYXAgZ3JpZFxuXHRcdFx0aWYgKCFfc25hcEdyaWRTaXplLnVzZXJYKSB7XG5cdFx0XHRcdF9zbmFwR3JpZFNpemUueCA9IGNvbnRhaW5lcldpZHRoO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCFfc25hcEdyaWRTaXplLnVzZXJZKSB7XG5cdFx0XHRcdF9zbmFwR3JpZFNpemUueSA9IGNvbnRhaW5lckhlaWdodDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgdGhlcmUgaXMgYSBncmlkLCBjb25mb3JtIHRvIHRoZSBncmlkXG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xuXHRcdFx0XHRpZiAoX3NuYXBHcmlkU2l6ZS51c2VyWCkge1xuXHRcdFx0XHRcdHNjcm9sbFdpZHRoID0gTWF0aC5jZWlsKHNjcm9sbFdpZHRoIC8gX3NuYXBHcmlkU2l6ZS51c2VyWCkgKiBfc25hcEdyaWRTaXplLnVzZXJYO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNjcm9sbFdpZHRoID0gTWF0aC5jZWlsKHNjcm9sbFdpZHRoIC8gX3NuYXBHcmlkU2l6ZS54KSAqIF9zbmFwR3JpZFNpemUueDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoX3NuYXBHcmlkU2l6ZS51c2VyWSkge1xuXHRcdFx0XHRcdHNjcm9sbEhlaWdodCA9IE1hdGguY2VpbChzY3JvbGxIZWlnaHQgLyBfc25hcEdyaWRTaXplLnVzZXJZKSAqIF9zbmFwR3JpZFNpemUudXNlclk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2Nyb2xsSGVpZ2h0ID0gTWF0aC5jZWlsKHNjcm9sbEhlaWdodCAvIF9zbmFwR3JpZFNpemUueSkgKiBfc25hcEdyaWRTaXplLnk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgbm8gZGV0YWlscyBoYXZlIGNoYW5nZWQsIHJldHVybi5cblx0XHRcdGlmIChfbWV0cmljcy5jb250YWluZXIueCA9PT0gY29udGFpbmVyV2lkdGggJiYgX21ldHJpY3MuY29udGFpbmVyLnkgPT09IGNvbnRhaW5lckhlaWdodCAmJiBfbWV0cmljcy5jb250ZW50LnggPT09IHNjcm9sbFdpZHRoICYmIF9tZXRyaWNzLmNvbnRlbnQueSA9PT0gc2Nyb2xsSGVpZ2h0KSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBzaXplc1xuXHRcdFx0X21ldHJpY3MuY29udGFpbmVyLnggPSBjb250YWluZXJXaWR0aDtcblx0XHRcdF9tZXRyaWNzLmNvbnRhaW5lci55ID0gY29udGFpbmVySGVpZ2h0O1xuXHRcdFx0X21ldHJpY3MuY29udGVudC54ID0gc2Nyb2xsV2lkdGg7XG5cdFx0XHRfbWV0cmljcy5jb250ZW50LnJhd1ggPSByYXdTY3JvbGxXaWR0aDtcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQueSA9IHNjcm9sbEhlaWdodDtcblx0XHRcdF9tZXRyaWNzLmNvbnRlbnQucmF3WSA9IHJhd1Njcm9sbEhlaWdodDtcblx0XHRcdF9tZXRyaWNzLnNjcm9sbEVuZC54ID0gY29udGFpbmVyV2lkdGggLSBzY3JvbGxXaWR0aDtcblx0XHRcdF9tZXRyaWNzLnNjcm9sbEVuZC55ID0gY29udGFpbmVySGVpZ2h0IC0gc2Nyb2xsSGVpZ2h0O1xuXG5cdFx0XHRfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpO1xuXG5cdFx0XHRpZiAoIWlnbm9yZVNuYXBTY3JvbGwgJiYgX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xuXG5cdFx0ICAgICAgICAvLyBFbnN1cmUgYm91bmRzIGFyZSBjb3JyZWN0XG5cdFx0XHRcdF91cGRhdGVTZWdtZW50cygpO1xuXHRcdFx0XHR0YXJnZXRQb3NpdGlvbiA9IF9nZXRTbmFwUG9zaXRpb25Gb3JJbmRleGVzKF9zbmFwSW5kZXgsIF9sYXN0U2Nyb2xsUG9zaXRpb24pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBcHBseSBiYXNlIGFsaWdubWVudCBpZiBhcHByb3ByaWF0ZVxuXHRcdFx0Zm9yIChheGlzIGluIHRhcmdldFBvc2l0aW9uKSB7XG5cdFx0XHRcdGlmICh0YXJnZXRQb3NpdGlvbi5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xuXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGNvbnRhaW5lciBpcyBzbWFsbGVyIHRoYW4gdGhlIGNvbnRlbnQsIGRldGVybWluZSB3aGV0aGVyIHRvIGFwcGx5IHRoZVxuXHRcdFx0XHRcdC8vIGFsaWdubWVudC4gIFRoaXMgb2NjdXJzIGlmIGEgc2Nyb2xsIGhhcyBuZXZlciB0YWtlbiBwbGFjZSwgb3IgaWYgdGhlIHBvc2l0aW9uXG5cdFx0XHRcdFx0Ly8gd2FzIHByZXZpb3VzbHkgYXQgdGhlIGNvcnJlY3QgXCJlbmRcIiBhbmQgY2FuIGJlIG1haW50YWluZWQuXG5cdFx0XHRcdFx0aWYgKF9tZXRyaWNzLmNvbnRhaW5lcltheGlzXSA8IF9tZXRyaWNzLmNvbnRlbnRbYXhpc10pIHtcblx0XHRcdFx0XHRcdGlmIChfaGFzQmVlblNjcm9sbGVkICYmIF9pbnN0YW5jZU9wdGlvbnMuYmFzZUFsaWdubWVudHNbYXhpc10gIT09IHN0YXJ0QWxpZ25tZW50c1theGlzXSkge1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBBcHBseSB0aGUgYWxpZ25tZW50XG5cdFx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuYmFzZUFsaWdubWVudHNbYXhpc10gPT09IDEpIHtcblx0XHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uW2F4aXNdID0gX21ldHJpY3Muc2Nyb2xsRW5kW2F4aXNdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy5iYXNlQWxpZ25tZW50c1theGlzXSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0dGFyZ2V0UG9zaXRpb25bYXhpc10gPSBNYXRoLmZsb29yKF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSAvIDIpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoX2luc3RhbmNlT3B0aW9ucy5iYXNlQWxpZ25tZW50c1theGlzXSA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdHRhcmdldFBvc2l0aW9uW2F4aXNdID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGluZ1ggJiYgdGFyZ2V0UG9zaXRpb24ueCAhPT0gZmFsc2UpIHtcblx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbigneCcsIHRhcmdldFBvc2l0aW9uLngsIDApO1xuXHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uLnggPSB0YXJnZXRQb3NpdGlvbi54O1xuXHRcdFx0fVxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSAmJiB0YXJnZXRQb3NpdGlvbi55ICE9PSBmYWxzZSkge1xuXHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKCd5JywgdGFyZ2V0UG9zaXRpb24ueSwgMCk7XG5cdFx0XHRcdF9iYXNlU2Nyb2xsUG9zaXRpb24ueSA9IHRhcmdldFBvc2l0aW9uLnk7XG5cdFx0XHR9XG5cblx0XHR9O1xuXG5cdFx0X3VwZGF0ZVNjcm9sbGJhckRpbWVuc2lvbnMgPSBmdW5jdGlvbiBfdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpIHtcblxuXHRcdFx0Ly8gVXBkYXRlIHNjcm9sbGJhciBzaXplc1xuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsYmFycykge1xuXHRcdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYKSB7XG5cdFx0XHRcdFx0X3Njcm9sbGJhck5vZGVzLnguc3R5bGUud2lkdGggPSBNYXRoLm1heCg2LCBNYXRoLnJvdW5kKF9tZXRyaWNzLmNvbnRhaW5lci54ICogKF9tZXRyaWNzLmNvbnRhaW5lci54IC8gX21ldHJpY3MuY29udGVudC54KSAtIDQpKSArICdweCc7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSkge1xuXHRcdFx0XHRcdF9zY3JvbGxiYXJOb2Rlcy55LnN0eWxlLmhlaWdodCA9IE1hdGgubWF4KDYsIE1hdGgucm91bmQoX21ldHJpY3MuY29udGFpbmVyLnkgKiAoX21ldHJpY3MuY29udGFpbmVyLnkgLyBfbWV0cmljcy5jb250ZW50LnkpIC0gNCkpICsgJ3B4Jztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBVcGRhdGUgc2Nyb2xsIGNhY2hlc1xuXHRcdFx0X3Njcm9sbGFibGVBeGVzID0ge307XG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxpbmdYICYmIChfbWV0cmljcy5jb250ZW50LnggPiBfbWV0cmljcy5jb250YWluZXIueCB8fCBfaW5zdGFuY2VPcHRpb25zLmFsd2F5c1Njcm9sbCkpIHtcblx0XHRcdFx0X3Njcm9sbGFibGVBeGVzLnggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSAmJiAoX21ldHJpY3MuY29udGVudC55ID4gX21ldHJpY3MuY29udGFpbmVyLnkgfHwgX2luc3RhbmNlT3B0aW9ucy5hbHdheXNTY3JvbGwpKSB7XG5cdFx0XHRcdF9zY3JvbGxhYmxlQXhlcy55ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0X3VwZGF0ZUVsZW1lbnRQb3NpdGlvbiA9IGZ1bmN0aW9uIF91cGRhdGVFbGVtZW50UG9zaXRpb24oKSB7XG5cdFx0XHR2YXIgYXhpcywgY29tcHV0ZWRTdHlsZSwgc3BsaXRTdHlsZTtcblxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGN1cnJlbnQgcG9zaXRpb24gb2YgZWFjaCBhY3RpdmUgYXhpcy5cblx0XHRcdC8vIEN1c3RvbSBwYXJzaW5nIGlzIHVzZWQgaW5zdGVhZCBvZiBuYXRpdmUgbWF0cml4IHN1cHBvcnQgZm9yIHNwZWVkIGFuZCBmb3Jcblx0XHRcdC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuXHRcdFx0Zm9yIChheGlzIGluIF9zY3JvbGxhYmxlQXhlcykge1xuXHRcdFx0XHRpZiAoX3Njcm9sbGFibGVBeGVzLmhhc093blByb3BlcnR5KGF4aXMpKSB7XG5cdFx0XHRcdFx0Y29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKF9zY3JvbGxOb2Rlc1theGlzXSwgbnVsbClbX3ZlbmRvclRyYW5zZm9ybUxvb2t1cF07XG5cdFx0XHRcdFx0c3BsaXRTdHlsZSA9IGNvbXB1dGVkU3R5bGUuc3BsaXQoJywgJyk7XG5cblx0XHRcdFx0XHQvLyBGb3IgMmQtc3R5bGUgdHJhbnNmb3JtcywgcHVsbCBvdXQgZWxlbWVudHMgZm91ciBvciBmaXZlXG5cdFx0XHRcdFx0aWYgKHNwbGl0U3R5bGUubGVuZ3RoID09PSA2KSB7XG5cdFx0XHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdID0gcGFyc2VJbnQoc3BsaXRTdHlsZVsoYXhpcyA9PT0gJ3knKSA/IDUgOiA0XSwgMTApO1xuXG5cdFx0XHRcdFx0Ly8gRm9yIDNkLXN0eWxlIHRyYW5zZm9ybXMsIHB1bGwgb3V0IGVsZW1lbnRzIHR3ZWx2ZSBvciB0aGlydGVlblxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdID0gcGFyc2VJbnQoc3BsaXRTdHlsZVsoYXhpcyA9PT0gJ3knKSA/IDEzIDogMTJdLCAxMCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9sYXN0U2Nyb2xsUG9zaXRpb25bYXhpc10gPSBfYmFzZVNjcm9sbFBvc2l0aW9uW2F4aXNdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdF91cGRhdGVTZWdtZW50cyA9IGZ1bmN0aW9uIF91cGRhdGVTZWdtZW50cyhzY3JvbGxGaW5hbGlzZWQpIHtcblx0XHRcdHZhciBheGlzO1xuXHRcdFx0dmFyIG5ld1NlZ21lbnQgPSB7IHg6IDAsIHk6IDAgfTtcblxuXHRcdFx0Ly8gSWYgc25hcHBpbmcgaXMgZGlzYWJsZWQsIHJldHVybiB3aXRob3V0IGFueSBmdXJ0aGVyIGFjdGlvbiByZXF1aXJlZFxuXHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLnNuYXBwaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2FsY3VsYXRlIHRoZSBuZXcgc2VnbWVudHNcblx0XHRcdGZvciAoYXhpcyBpbiBfc2Nyb2xsYWJsZUF4ZXMpIHtcblx0XHRcdFx0aWYgKF9zY3JvbGxhYmxlQXhlcy5oYXNPd25Qcm9wZXJ0eShheGlzKSkge1xuXHRcdFx0XHRcdG5ld1NlZ21lbnRbYXhpc10gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudFtheGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc10pIC0gMSwgTWF0aC5yb3VuZCgtX2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSAvIF9zbmFwR3JpZFNpemVbYXhpc10pKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW4gYWxsIGNhc2VzIHVwZGF0ZSB0aGUgYWN0aXZlIHNlZ21lbnQgaWYgYXBwcm9wcmlhdGVcblx0XHRcdGlmIChuZXdTZWdtZW50LnggIT09IF9hY3RpdmVTZWdtZW50LnggfHwgbmV3U2VnbWVudC55ICE9PSBfYWN0aXZlU2VnbWVudC55KSB7XG5cdFx0XHRcdF9hY3RpdmVTZWdtZW50LnggPSBuZXdTZWdtZW50Lng7XG5cdFx0XHRcdF9hY3RpdmVTZWdtZW50LnkgPSBuZXdTZWdtZW50Lnk7XG5cdFx0XHRcdF9maXJlRXZlbnQoJ3NlZ21lbnR3aWxsY2hhbmdlJywgeyBzZWdtZW50WDogbmV3U2VnbWVudC54LCBzZWdtZW50WTogbmV3U2VnbWVudC55IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiB0aGUgc2Nyb2xsIGhhcyBiZWVuIGZpbmFsaXNlZCwgYWxzbyB1cGRhdGUgdGhlIGJhc2Ugc2VnbWVudFxuXHRcdFx0aWYgKHNjcm9sbEZpbmFsaXNlZCkge1xuXHRcdFx0XHRpZiAobmV3U2VnbWVudC54ICE9PSBfYmFzZVNlZ21lbnQueCB8fCBuZXdTZWdtZW50LnkgIT09IF9iYXNlU2VnbWVudC55KSB7XG5cdFx0XHRcdFx0X2Jhc2VTZWdtZW50LnggPSBuZXdTZWdtZW50Lng7XG5cdFx0XHRcdFx0X2Jhc2VTZWdtZW50LnkgPSBuZXdTZWdtZW50Lnk7XG5cdFx0XHRcdFx0X2ZpcmVFdmVudCgnc2VnbWVudGRpZGNoYW5nZScsIHsgc2VnbWVudFg6IG5ld1NlZ21lbnQueCwgc2VnbWVudFk6IG5ld1NlZ21lbnQueSB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRfc2V0QXhpc1Bvc2l0aW9uID0gZnVuY3Rpb24gX3NldEF4aXNQb3NpdGlvbihheGlzLCBwb3NpdGlvbiwgYW5pbWF0aW9uRHVyYXRpb24sIGFuaW1hdGlvbkJlemllciwgYm91bmRzQ3Jvc3NEZWxheSkge1xuXHRcdFx0dmFyIHRyYW5zaXRpb25DU1NTdHJpbmcsIG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgPSBudWxsO1xuXG5cdFx0XHQvLyBPbmx5IHVwZGF0ZSBwb3NpdGlvbiBpZiB0aGUgYXhpcyBub2RlIGV4aXN0cyAoRE9NIGVsZW1lbnRzIGNhbiBnbyBhd2F5IGlmXG5cdFx0XHQvLyB0aGUgc2Nyb2xsZXIgaW5zdGFuY2UgaXMgbm90IGRlc3Ryb3llZCBjb3JyZWN0bHkpXG5cdFx0XHRpZiAoIV9zY3JvbGxOb2Rlc1theGlzXSkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIERldGVybWluZSB0aGUgdHJhbnNpdGlvbiBwcm9wZXJ0eSB0byBhcHBseSB0byBib3RoIHRoZSBzY3JvbGwgZWxlbWVudCBhbmQgdGhlIHNjcm9sbGJhclxuXHRcdFx0aWYgKGFuaW1hdGlvbkR1cmF0aW9uKSB7XG5cdFx0XHRcdGlmICghYW5pbWF0aW9uQmV6aWVyKSB7XG5cdFx0XHRcdFx0YW5pbWF0aW9uQmV6aWVyID0gX2luc3RhbmNlT3B0aW9ucy5mbGluZ0Jlemllcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRyYW5zaXRpb25DU1NTdHJpbmcgPSBfdmVuZG9yQ1NTUHJlZml4ICsgJ3RyYW5zZm9ybSAnICsgYW5pbWF0aW9uRHVyYXRpb24gKyAnbXMgJyArIGFuaW1hdGlvbkJlemllci50b1N0cmluZygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dHJhbnNpdGlvbkNTU1N0cmluZyA9ICcnO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBcHBseSB0aGUgdHJhbnNpdGlvbiBwcm9wZXJ0eSB0byBlbGVtZW50c1xuXHRcdFx0X3Njcm9sbE5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gdHJhbnNpdGlvbkNTU1N0cmluZztcblx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnNjcm9sbGJhcnMpIHtcblx0XHRcdFx0X3Njcm9sbGJhck5vZGVzW2F4aXNdLnN0eWxlW190cmFuc2l0aW9uUHJvcGVydHldID0gdHJhbnNpdGlvbkNTU1N0cmluZztcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBwb3NpdGlvbnNcblx0XHRcdF9zY3JvbGxOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNmb3JtUHJvcGVydHldID0gX3RyYW5zbGF0ZVJ1bGVQcmVmaXggKyBfdHJhbnNmb3JtUHJlZml4ZXNbYXhpc10gKyBwb3NpdGlvbiArICdweCcgKyBfdHJhbnNmb3JtU3VmZml4ZXNbYXhpc107XG5cdFx0XHRpZiAoX2luc3RhbmNlT3B0aW9ucy5zY3JvbGxiYXJzKSB7XG5cdFx0XHRcdF9zY3JvbGxiYXJOb2Rlc1theGlzXS5zdHlsZVtfdHJhbnNmb3JtUHJvcGVydHldID0gX3RyYW5zbGF0ZVJ1bGVQcmVmaXggKyBfdHJhbnNmb3JtUHJlZml4ZXNbYXhpc10gKyAoLXBvc2l0aW9uICogX21ldHJpY3MuY29udGFpbmVyW2F4aXNdIC8gX21ldHJpY3MuY29udGVudFtheGlzXSkgKyAncHgnICsgX3RyYW5zZm9ybVN1ZmZpeGVzW2F4aXNdO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEZXRlcm1pbmUgd2hldGhlciB0aGUgc2Nyb2xsIGlzIGF0IGFuIGV4dHJlbWl0eS5cblx0XHRcdGlmIChwb3NpdGlvbiA+PSAwKSB7XG5cdFx0XHRcdG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgPSAnc3RhcnQnO1xuXHRcdFx0fSBlbHNlIGlmIChwb3NpdGlvbiA8PSBfbWV0cmljcy5zY3JvbGxFbmRbYXhpc10pIHtcblx0XHRcdFx0bmV3UG9zaXRpb25BdEV4dHJlbWl0eSA9ICdlbmQnO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiB0aGUgZXh0cmVtaXR5IHN0YXR1cyBoYXMgY2hhbmdlZCwgZmlyZSBhbiBhcHByb3ByaWF0ZSBldmVudFxuXHRcdFx0aWYgKG5ld1Bvc2l0aW9uQXRFeHRyZW1pdHkgIT09IF9zY3JvbGxBdEV4dHJlbWl0eVtheGlzXSkge1xuXHRcdFx0XHRpZiAobmV3UG9zaXRpb25BdEV4dHJlbWl0eSAhPT0gbnVsbCkge1xuXHRcdFx0XHRcdGlmIChhbmltYXRpb25EdXJhdGlvbikge1xuXHRcdFx0XHRcdFx0X3RpbWVvdXRzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0X2ZpcmVFdmVudCgncmVhY2hlZCcgKyBuZXdQb3NpdGlvbkF0RXh0cmVtaXR5LCB7IGF4aXM6IGF4aXMgfSk7XG5cdFx0XHRcdFx0XHR9LCBib3VuZHNDcm9zc0RlbGF5IHx8IGFuaW1hdGlvbkR1cmF0aW9uKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdF9maXJlRXZlbnQoJ3JlYWNoZWQnICsgbmV3UG9zaXRpb25BdEV4dHJlbWl0eSwgeyBheGlzOiBheGlzIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRfc2Nyb2xsQXRFeHRyZW1pdHlbYXhpc10gPSBuZXdQb3NpdGlvbkF0RXh0cmVtaXR5O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHJlY29yZGVkIHBvc2l0aW9uIGlmIHRoZXJlJ3Mgbm8gZHVyYXRpb25cblx0XHRcdGlmICghYW5pbWF0aW9uRHVyYXRpb24pIHtcblx0XHRcdFx0X2xhc3RTY3JvbGxQb3NpdGlvbltheGlzXSA9IHBvc2l0aW9uO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXRyaWV2ZSB0aGUgY3VycmVudCBwb3NpdGlvbiBhcyBhbiBvYmplY3Qgd2l0aCBzY3JvbGxMZWZ0IGFuZCBzY3JvbGxUb3Bcblx0XHQgKiBwcm9wZXJ0aWVzLlxuXHRcdCAqL1xuXHRcdF9nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uIF9nZXRQb3NpdGlvbigpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHNjcm9sbExlZnQ6IC1fbGFzdFNjcm9sbFBvc2l0aW9uLngsXG5cdFx0XHRcdHNjcm9sbFRvcDogLV9sYXN0U2Nyb2xsUG9zaXRpb24ueVxuXHRcdFx0fTtcblx0XHR9O1xuXG5cdFx0X3NjaGVkdWxlQXhpc1Bvc2l0aW9uID0gZnVuY3Rpb24gX3NjaGVkdWxlQXhpc1Bvc2l0aW9uKGF4aXMsIHBvc2l0aW9uLCBhbmltYXRpb25EdXJhdGlvbiwgYW5pbWF0aW9uQmV6aWVyLCBhZnRlckRlbGF5KSB7XG5cdFx0XHRfdGltZW91dHMucHVzaChzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBwb3NpdGlvbiwgYW5pbWF0aW9uRHVyYXRpb24sIGFuaW1hdGlvbkJlemllcik7XG5cdFx0XHR9LCBhZnRlckRlbGF5KSk7XG5cdFx0fTtcblxuXHRcdF9maXJlRXZlbnQgPSBmdW5jdGlvbiBfZmlyZUV2ZW50KGV2ZW50TmFtZSwgZXZlbnRPYmplY3QpIHtcblx0XHRcdHZhciBpLCBsO1xuXHRcdFx0ZXZlbnRPYmplY3Quc3JjT2JqZWN0ID0gX3B1YmxpY1NlbGY7XG5cblx0XHRcdC8vIEl0ZXJhdGUgdGhyb3VnaCBhbnkgbGlzdGVuZXJzXG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gX2V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0ubGVuZ3RoOyBpIDwgbDsgaSA9IGkgKyAxKSB7XG5cblx0XHRcdFx0Ly8gRXhlY3V0ZSBlYWNoIGluIGEgdHJ5L2NhdGNoXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0X2V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1baV0oZXZlbnRPYmplY3QpO1xuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdGlmICh3aW5kb3cuY29uc29sZSAmJiB3aW5kb3cuY29uc29sZS5lcnJvcikge1xuXHRcdFx0XHRcdFx0d2luZG93LmNvbnNvbGUuZXJyb3IoZXJyb3IubWVzc2FnZSArICcgKCcgKyBlcnJvci5zb3VyY2VVUkwgKyAnLCBsaW5lICcgKyBlcnJvci5saW5lICsgJyknKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlIHRoZSBzY3JvbGwgcG9zaXRpb24gc28gdGhhdCB0aGUgY2hpbGQgZWxlbWVudCBpcyBpbiB2aWV3LlxuXHRcdCAqL1xuXHRcdF9jaGlsZEZvY3VzZWQgPSBmdW5jdGlvbiBfY2hpbGRGb2N1c2VkKGV2ZW50KSB7XG5cdFx0XHR2YXIgb2Zmc2V0LCBheGlzLCB2aXNpYmxlQ2hpbGRQb3J0aW9uO1xuXHRcdFx0dmFyIGZvY3VzZWROb2RlUmVjdCA9IF9nZXRCb3VuZGluZ1JlY3QoZXZlbnQudGFyZ2V0KTtcblx0XHRcdHZhciBjb250YWluZXJSZWN0ID0gX2dldEJvdW5kaW5nUmVjdChfY29udGFpbmVyTm9kZSk7XG5cdFx0XHR2YXIgZWRnZU1hcCA9IHsgeDogJ2xlZnQnLCB5OiAndG9wJyB9O1xuXHRcdFx0dmFyIG9wRWRnZU1hcCA9IHsgeDogJ3JpZ2h0JywgeTogJ2JvdHRvbScgfTtcblx0XHRcdHZhciBkaW1lbnNpb25NYXAgPSB7IHg6ICd3aWR0aCcsIHk6ICdoZWlnaHQnIH07XG5cblx0XHRcdC8vIElmIGFuIGlucHV0IGlzIGN1cnJlbnRseSBiZWluZyB0cmFja2VkLCBpZ25vcmUgdGhlIGZvY3VzIGV2ZW50XG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciAhPT0gZmFsc2UpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcblxuXHRcdFx0XHRcdC8vIElmIHRoZSBmb2N1c3NlZCBub2RlIGlzIGVudGlyZWx5IGluIHZpZXcsIHRoZXJlIGlzIG5vIG5lZWQgdG8gY2VudGVyIGl0XG5cdFx0XHRcdFx0aWYgKGZvY3VzZWROb2RlUmVjdFtlZGdlTWFwW2F4aXNdXSA+PSBjb250YWluZXJSZWN0W2VkZ2VNYXBbYXhpc11dICYmIGZvY3VzZWROb2RlUmVjdFtvcEVkZ2VNYXBbYXhpc11dIDw9IGNvbnRhaW5lclJlY3Rbb3BFZGdlTWFwW2F4aXNdXSkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gSWYgdGhlIGZvY3Vzc2VkIG5vZGUgaXMgbGFyZ2VyIHRoYW4gdGhlIGNvbnRhaW5lci4uLlxuXHRcdFx0XHRcdGlmIChmb2N1c2VkTm9kZVJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSA+IGNvbnRhaW5lclJlY3RbZGltZW5zaW9uTWFwW2F4aXNdXSkge1xuXG5cdFx0XHRcdFx0XHR2aXNpYmxlQ2hpbGRQb3J0aW9uID0gZm9jdXNlZE5vZGVSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0gLSBNYXRoLm1heCgwLCBjb250YWluZXJSZWN0W2VkZ2VNYXBbYXhpc11dIC0gZm9jdXNlZE5vZGVSZWN0W2VkZ2VNYXBbYXhpc11dKSAtIE1hdGgubWF4KDAsIGZvY3VzZWROb2RlUmVjdFtvcEVkZ2VNYXBbYXhpc11dIC0gY29udGFpbmVyUmVjdFtvcEVkZ2VNYXBbYXhpc11dKTtcblxuXHRcdFx0XHRcdFx0Ly8gSWYgbW9yZSB0aGFuIGhhbGYgYSBjb250YWluZXIncyBwb3J0aW9uIG9mIHRoZSBmb2N1c3NlZCBub2RlIGlzIHZpc2libGUsIHRoZXJlJ3Mgbm8gbmVlZCB0byBjZW50ZXIgaXRcblx0XHRcdFx0XHRcdGlmICh2aXNpYmxlQ2hpbGRQb3J0aW9uID49IChjb250YWluZXJSZWN0W2RpbWVuc2lvbk1hcFtheGlzXV0gLyAyKSkge1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBTZXQgdGhlIHRhcmdldCBvZmZzZXQgdG8gYmUgaW4gdGhlIG1pZGRsZSBvZiB0aGUgY29udGFpbmVyLCBvciBhcyBjbG9zZSBhcyBib3VuZHMgcGVybWl0XG5cdFx0XHRcdFx0b2Zmc2V0ID0gLU1hdGgucm91bmQoKGZvY3VzZWROb2RlUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dIC8gMikgLSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdICsgZm9jdXNlZE5vZGVSZWN0W2VkZ2VNYXBbYXhpc11dIC0gY29udGFpbmVyUmVjdFtlZGdlTWFwW2F4aXNdXSAgLSAoY29udGFpbmVyUmVjdFtkaW1lbnNpb25NYXBbYXhpc11dIC8gMikpO1xuXHRcdFx0XHRcdG9mZnNldCA9IE1hdGgubWluKDAsIE1hdGgubWF4KF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSwgb2Zmc2V0KSk7XG5cblx0XHRcdFx0XHQvLyBQZXJmb3JtIHRoZSBzY3JvbGxcblx0XHRcdFx0XHRfc2V0QXhpc1Bvc2l0aW9uKGF4aXMsIG9mZnNldCwgMCk7XG5cdFx0XHRcdFx0X2Jhc2VTY3JvbGxQb3NpdGlvbltheGlzXSA9IG9mZnNldDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRfZmlyZUV2ZW50KCdzY3JvbGwnLCBfZ2V0UG9zaXRpb24oKSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdpdmVuIGEgcmVsYXRpdmUgZGlzdGFuY2UgYmV5b25kIHRoZSBlbGVtZW50IGJvdW5kcywgcmV0dXJucyBhIG1vZGlmaWVkIHZlcnNpb24gdG9cblx0XHQgKiBzaW11bGF0ZSBib3VuY3kvc3ByaW5neSBlZGdlcy5cblx0XHQgKi9cblx0XHRfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMgPSBmdW5jdGlvbiBfbW9kaWZ5RGlzdGFuY2VCZXlvbmRCb3VuZHMoZGlzdGFuY2UsIGF4aXMpIHtcblx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5ib3VuY2luZykge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblx0XHRcdHZhciBlID0gTWF0aC5leHAoZGlzdGFuY2UgLyBfbWV0cmljcy5jb250YWluZXJbYXhpc10pO1xuXHRcdFx0cmV0dXJuIE1hdGgucm91bmQoX21ldHJpY3MuY29udGFpbmVyW2F4aXNdICogMC42ICogKGUgLSAxKSAvIChlICsgMSkpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBHaXZlbiBwb3NpdGlvbnMgZm9yIGVhY2ggZW5hYmxlZCBheGlzLCByZXR1cm5zIGFuIG9iamVjdCBzaG93aW5nIGhvdyBmYXIgZWFjaCBheGlzIGlzIGJleW9uZFxuXHRcdCAqIGJvdW5kcy4gSWYgd2l0aGluIGJvdW5kcywgLTEgaXMgcmV0dXJuZWQ7IGlmIGF0IHRoZSBib3VuZHMsIDAgaXMgcmV0dXJuZWQuXG5cdFx0ICovXG5cdFx0X2Rpc3RhbmNlc0JleW9uZEJvdW5kcyA9IGZ1bmN0aW9uIF9kaXN0YW5jZXNCZXlvbmRCb3VuZHMocG9zaXRpb25zKSB7XG5cdFx0XHR2YXIgYXhpcywgcG9zaXRpb247XG5cdFx0XHR2YXIgZGlzdGFuY2VzID0ge307XG5cdFx0XHRmb3IgKGF4aXMgaW4gcG9zaXRpb25zKSB7XG5cdFx0XHRcdGlmIChwb3NpdGlvbnMuaGFzT3duUHJvcGVydHkoYXhpcykpIHtcblx0XHRcdFx0XHRwb3NpdGlvbiA9IHBvc2l0aW9uc1theGlzXTtcblxuXHRcdFx0XHRcdC8vIElmIHRoZSBwb3NpdGlvbiBpcyB0byB0aGUgbGVmdC90b3AsIG5vIGZ1cnRoZXIgbW9kaWZpY2F0aW9uIHJlcXVpcmVkXG5cdFx0XHRcdFx0aWYgKHBvc2l0aW9uID49IDApIHtcblx0XHRcdFx0XHRcdGRpc3RhbmNlc1theGlzXSA9IHBvc2l0aW9uO1xuXG5cdFx0XHRcdFx0Ly8gSWYgaXQncyB3aXRoaW4gdGhlIGJvdW5kcywgdXNlIC0xXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChwb3NpdGlvbiA+IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSkge1xuXHRcdFx0XHRcdFx0ZGlzdGFuY2VzW2F4aXNdID0gLTE7XG5cblx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIGFtZW5kIGJ5IHRoZSBkaXN0YW5jZSBvZiB0aGUgbWF4aW11bSBlZGdlXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGRpc3RhbmNlc1theGlzXSA9IF9tZXRyaWNzLnNjcm9sbEVuZFtheGlzXSAtIHBvc2l0aW9uO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGRpc3RhbmNlcztcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogT24gcGxhdGZvcm1zIHdoaWNoIHN1cHBvcnQgaXQsIHVzZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgdG8gZ3JvdXBcblx0XHQgKiBwb3NpdGlvbiB1cGRhdGVzIGZvciBzcGVlZC4gIFN0YXJ0cyB0aGUgcmVuZGVyIHByb2Nlc3MuXG5cdFx0ICovXG5cdFx0X3N0YXJ0QW5pbWF0aW9uID0gZnVuY3Rpb24gX3N0YXJ0QW5pbWF0aW9uKCkge1xuXHRcdFx0aWYgKF9yZXFBbmltYXRpb25GcmFtZSkge1xuXHRcdFx0XHRfY2FuY2VsQW5pbWF0aW9uKCk7XG5cdFx0XHRcdF9hbmltYXRpb25GcmFtZVJlcXVlc3QgPSBfcmVxQW5pbWF0aW9uRnJhbWUoX3NjaGVkdWxlUmVuZGVyKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogT24gcGxhdGZvcm1zIHdoaWNoIHN1cHBvcnQgUmVxdWVzdEFuaW1hdGlvbkZyYW1lLCBwcm92aWRlIHRoZSByZW5kZXJpbmcgbG9vcC5cblx0XHQgKiBUYWtlcyB0d28gYXJndW1lbnRzOyB0aGUgZmlyc3QgaXMgdGhlIHJlbmRlci9wb3NpdGlvbiB1cGRhdGUgZnVuY3Rpb24gdG9cblx0XHQgKiBiZSBjYWxsZWQsIGFuZCB0aGUgc2Vjb25kIGlzIGEgc3RyaW5nIGNvbnRyb2xsaW5nIHRoZSByZW5kZXIgdHlwZSB0b1xuXHRcdCAqIGFsbG93IHByZXZpb3VzIGNoYW5nZXMgdG8gYmUgY2FuY2VsbGVkIC0gc2hvdWxkIGJlICdwYW4nIG9yICdzY3JvbGwnLlxuXHRcdCAqL1xuXHRcdF9zY2hlZHVsZVJlbmRlciA9IGZ1bmN0aW9uIF9zY2hlZHVsZVJlbmRlcigpIHtcblx0XHRcdHZhciBheGlzLCBwb3NpdGlvblVwZGF0ZWQ7XG5cblx0XHRcdC8vIElmIHVzaW5nIHJlcXVlc3RBbmltYXRpb25GcmFtZSBzY2hlZHVsZSB0aGUgbmV4dCB1cGRhdGUgYXQgb25jZVxuXHRcdFx0aWYgKF9yZXFBbmltYXRpb25GcmFtZSkge1xuXHRcdFx0XHRfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gX3JlcUFuaW1hdGlvbkZyYW1lKF9zY2hlZHVsZVJlbmRlcik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFBlcmZvcm0gdGhlIGRyYXcuXG5cdFx0XHRmb3IgKGF4aXMgaW4gX3Njcm9sbGFibGVBeGVzKSB7XG5cdFx0XHRcdGlmIChfc2Nyb2xsYWJsZUF4ZXMuaGFzT3duUHJvcGVydHkoYXhpcykgJiYgX3RhcmdldFNjcm9sbFBvc2l0aW9uW2F4aXNdICE9PSBfbGFzdFNjcm9sbFBvc2l0aW9uW2F4aXNdKSB7XG5cdFx0XHRcdFx0X3NldEF4aXNQb3NpdGlvbihheGlzLCBfdGFyZ2V0U2Nyb2xsUG9zaXRpb25bYXhpc10pO1xuXHRcdFx0XHRcdHBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgZnVsbCwgbG9ja2VkIHNjcm9sbGluZyBoYXMgZW5hYmxlZCwgZmlyZSBhbnkgc2Nyb2xsIGFuZCBzZWdtZW50IGNoYW5nZSBldmVudHNcblx0XHRcdGlmIChfaXNTY3JvbGxpbmcgJiYgcG9zaXRpb25VcGRhdGVkKSB7XG5cdFx0XHRcdF9maXJlRXZlbnQoJ3Njcm9sbCcsIF9nZXRQb3NpdGlvbigpKTtcblx0XHRcdFx0X3VwZGF0ZVNlZ21lbnRzKGZhbHNlKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogU3RvcHMgdGhlIGFuaW1hdGlvbiBwcm9jZXNzLlxuXHRcdCAqL1xuXHRcdF9jYW5jZWxBbmltYXRpb24gPSBmdW5jdGlvbiBfY2FuY2VsQW5pbWF0aW9uKCkge1xuXHRcdFx0aWYgKF9hbmltYXRpb25GcmFtZVJlcXVlc3QgPT09IGZhbHNlIHx8ICFfY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRfY2FuY2VsQW5pbWF0aW9uRnJhbWUoX2FuaW1hdGlvbkZyYW1lUmVxdWVzdCk7XG5cdFx0XHRfYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gZmFsc2U7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlZ2lzdGVyIG9yIHVucmVnaXN0ZXIgZXZlbnQgaGFuZGxlcnMgYXMgYXBwcm9wcmlhdGVcblx0XHQgKi9cblx0XHRfdG9nZ2xlRXZlbnRIYW5kbGVycyA9IGZ1bmN0aW9uIF90b2dnbGVFdmVudEhhbmRsZXJzKGVuYWJsZSkge1xuXHRcdFx0dmFyIE11dGF0aW9uT2JzZXJ2ZXI7XG5cblx0XHRcdC8vIE9ubHkgcmVtb3ZlIHRoZSBldmVudCBpZiB0aGUgbm9kZSBleGlzdHMgKERPTSBlbGVtZW50cyBjYW4gZ28gYXdheSlcblx0XHRcdGlmICghX2NvbnRhaW5lck5vZGUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZW5hYmxlKSB7XG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlID0gX2NvbnRhaW5lck5vZGUuYWRkRXZlbnRMaXN0ZW5lcjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlID0gX2NvbnRhaW5lck5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKF90cmFja1BvaW50ZXJFdmVudHMpIHtcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ01TUG9pbnRlckRvd24nLCBfb25Qb2ludGVyRG93biwgdHJ1ZSk7XG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdNU1BvaW50ZXJNb3ZlJywgX29uUG9pbnRlck1vdmUsIHRydWUpO1xuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnTVNQb2ludGVyVXAnLCBfb25Qb2ludGVyVXAsIHRydWUpO1xuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgnTVNQb2ludGVyQ2FuY2VsJywgX29uUG9pbnRlckNhbmNlbCwgdHJ1ZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAoX3RyYWNrVG91Y2hFdmVudHMgJiYgIV9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMudG91Y2gpIHtcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgndG91Y2hzdGFydCcsIF9vblRvdWNoU3RhcnQsIHRydWUpO1xuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCd0b3VjaG1vdmUnLCBfb25Ub3VjaE1vdmUsIHRydWUpO1xuXHRcdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCd0b3VjaGVuZCcsIF9vblRvdWNoRW5kLCB0cnVlKTtcblx0XHRcdFx0XHRfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZSgndG91Y2hjYW5jZWwnLCBfb25Ub3VjaEVuZCwgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFfaW5zdGFuY2VPcHRpb25zLmRpc2FibGVkSW5wdXRNZXRob2RzLm1vdXNlKSB7XG5cdFx0XHRcdFx0X2NvbnRhaW5lck5vZGUuX2Z0c2Nyb2xsZXJUb2dnbGUoJ21vdXNlZG93bicsIF9vbk1vdXNlRG93biwgdHJ1ZSk7XG5cdFx0XHRcdFx0aWYgKCFlbmFibGUpIHtcblx0XHRcdFx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIF9vbk1vdXNlTW92ZSwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgX29uTW91c2VVcCwgdHJ1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMuc2Nyb2xsKSB7XG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdET01Nb3VzZVNjcm9sbCcsIF9vbk1vdXNlU2Nyb2xsLCBmYWxzZSk7XG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdtb3VzZXdoZWVsJywgX29uTW91c2VTY3JvbGwsIGZhbHNlKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQWRkIGEgY2xpY2sgbGlzdGVuZXIuICBPbiBJRSwgYWRkIHRoZSBsaXN0ZW5lciB0byB0aGUgZG9jdW1lbnQsIHRvIGFsbG93XG5cdFx0XHQvLyBjbGlja3MgdG8gYmUgY2FuY2VsbGVkIGlmIGEgc2Nyb2xsIGVuZHMgb3V0c2lkZSB0aGUgYm91bmRzIG9mIHRoZSBjb250YWluZXI7IG9uXG5cdFx0XHQvLyBvdGhlciBwbGF0Zm9ybXMsIGFkZCB0byB0aGUgY29udGFpbmVyIG5vZGUuXG5cdFx0XHRpZiAoX3RyYWNrUG9pbnRlckV2ZW50cykge1xuXHRcdFx0XHRpZiAoZW5hYmxlKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBfb25DbGljaywgdHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBfb25DbGljaywgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdF9jb250YWluZXJOb2RlLl9mdHNjcm9sbGVyVG9nZ2xlKCdjbGljaycsIF9vbkNsaWNrLCB0cnVlKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gV2F0Y2ggZm9yIGNoYW5nZXMgaW5zaWRlIHRoZSBjb250YWluZWQgZWxlbWVudCB0byB1cGRhdGUgYm91bmRzIC0gZGUtYm91bmNlZCBzbGlnaHRseS5cblx0XHRcdGlmIChlbmFibGUpIHtcblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgX2NoaWxkRm9jdXNlZCwgdHJ1ZSk7XG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLnVwZGF0ZU9uQ2hhbmdlcykge1xuXG5cdFx0XHRcdFx0Ly8gVHJ5IGFuZCByZXVzZSB0aGUgb2xkLCBkaXNjb25uZWN0ZWQgb2JzZXJ2ZXIgaW5zdGFuY2UgaWYgYXZhaWxhYmxlXG5cdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCBjaGVjayBmb3Igc3VwcG9ydCBiZWZvcmUgcHJvY2VlZGluZ1xuXHRcdFx0XHRcdGlmICghX211dGF0aW9uT2JzZXJ2ZXIpIHtcblx0XHRcdFx0XHRcdE11dGF0aW9uT2JzZXJ2ZXIgPSB3aW5kb3cuTXV0YXRpb25PYnNlcnZlciB8fCB3aW5kb3cuV2ViS2l0TXV0YXRpb25PYnNlcnZlciB8fCB3aW5kb3dbX3ZlbmRvclN0eWxlUHJvcGVydHlQcmVmaXggKyAnTXV0YXRpb25PYnNlcnZlciddO1xuXHRcdFx0XHRcdFx0aWYgKE11dGF0aW9uT2JzZXJ2ZXIpIHtcblx0XHRcdFx0XHRcdFx0X211dGF0aW9uT2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihfZG9tQ2hhbmdlZCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKF9tdXRhdGlvbk9ic2VydmVyKSB7XG5cdFx0XHRcdFx0XHRfbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKF9jb250ZW50UGFyZW50Tm9kZSwge1xuXHRcdFx0XHRcdFx0XHRjaGlsZExpc3Q6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGNoYXJhY3RlckRhdGE6IHRydWUsXG5cdFx0XHRcdFx0XHRcdHN1YnRyZWU6IHRydWVcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUuYWRkRXZlbnRMaXN0ZW5lcignRE9NU3VidHJlZU1vZGlmaWVkJywgZnVuY3Rpb24gKGUpIHtcblxuXG5cdFx0XHRcdFx0XHRcdC8vIElnbm9yZSBjaGFuZ2VzIHRvIG5lc3RlZCBGVCBTY3JvbGxlcnMgLSBldmVuIHVwZGF0aW5nIGEgdHJhbnNmb3JtIHN0eWxlXG5cdFx0XHRcdFx0XHRcdC8vIGNhbiB0cmlnZ2VyIGEgRE9NU3VidHJlZU1vZGlmaWVkIGluIElFLCBjYXVzaW5nIG5lc3RlZCBzY3JvbGxlcnMgdG8gYWx3YXlzXG5cdFx0XHRcdFx0XHRcdC8vIGZhdm91ciB0aGUgZGVlcGVzdCBzY3JvbGxlciBhcyBwYXJlbnQgc2Nyb2xsZXJzICdyZXNpemUnL2VuZCBzY3JvbGxpbmcuXG5cdFx0XHRcdFx0XHRcdGlmIChlICYmIChlLnNyY0VsZW1lbnQgPT09IF9jb250ZW50UGFyZW50Tm9kZSB8fCBlLnNyY0VsZW1lbnQuY2xhc3NOYW1lLmluZGV4T2YoJ2Z0c2Nyb2xsZXJfJykgIT09IC0xKSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdF9kb21DaGFuZ2VkKCk7XG5cdFx0XHRcdFx0XHR9LCB0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKF9pbnN0YW5jZU9wdGlvbnMudXBkYXRlT25XaW5kb3dSZXNpemUpIHtcblx0XHRcdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgX2RvbUNoYW5nZWQsIHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRfY29udGVudFBhcmVudE5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBfY2hpbGRGb2N1c2VkLCB0cnVlKTtcblx0XHRcdFx0aWYgKF9tdXRhdGlvbk9ic2VydmVyKSB7XG5cdFx0XHRcdFx0X211dGF0aW9uT2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdF9jb250ZW50UGFyZW50Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdET01TdWJ0cmVlTW9kaWZpZWQnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0X2NvbnRlbnRQYXJlbnROb2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XG5cdFx0XHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBfZG9tQ2hhbmdlZCwgdHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbGV0ZSBfY29udGFpbmVyTm9kZS5fZnRzY3JvbGxlclRvZ2dsZTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVG91Y2ggZXZlbnQgaGFuZGxlcnNcblx0XHQgKi9cblx0XHRfb25Ub3VjaFN0YXJ0ID0gZnVuY3Rpb24gX29uVG91Y2hTdGFydChzdGFydEV2ZW50KSB7XG5cdFx0XHR2YXIgaSwgbCwgdG91Y2hFdmVudDtcblxuXHRcdFx0Ly8gSWYgYSB0b3VjaCBpcyBhbHJlYWR5IGFjdGl2ZSwgZW5zdXJlIHRoYXQgdGhlIGluZGV4XG5cdFx0XHQvLyBpcyBtYXBwZWQgdG8gdGhlIGNvcnJlY3QgZmluZ2VyLCBhbmQgcmV0dXJuLlxuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIpIHtcblx0XHRcdFx0Zm9yIChpID0gMCwgbCA9IHN0YXJ0RXZlbnQudG91Y2hlcy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcblx0XHRcdFx0XHRpZiAoc3RhcnRFdmVudC50b3VjaGVzW2ldLmlkZW50aWZpZXIgPT09IF9pbnB1dElkZW50aWZpZXIpIHtcblx0XHRcdFx0XHRcdF9pbnB1dEluZGV4ID0gaTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUcmFjayB0aGUgbmV3IHRvdWNoJ3MgaWRlbnRpZmllciwgcmVzZXQgaW5kZXgsIGFuZCBwYXNzXG5cdFx0XHQvLyB0aGUgY29vcmRpbmF0ZXMgdG8gdGhlIHNjcm9sbCBzdGFydCBmdW5jdGlvbi5cblx0XHRcdHRvdWNoRXZlbnQgPSBzdGFydEV2ZW50LnRvdWNoZXNbMF07XG5cdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gdG91Y2hFdmVudC5pZGVudGlmaWVyO1xuXHRcdFx0X2lucHV0SW5kZXggPSAwO1xuXHRcdFx0X3N0YXJ0U2Nyb2xsKHRvdWNoRXZlbnQuY2xpZW50WCwgdG91Y2hFdmVudC5jbGllbnRZLCBzdGFydEV2ZW50LnRpbWVTdGFtcCwgc3RhcnRFdmVudCk7XG5cdFx0fTtcblx0XHRfb25Ub3VjaE1vdmUgPSBmdW5jdGlvbiBfb25Ub3VjaE1vdmUobW92ZUV2ZW50KSB7XG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciA9PT0gZmFsc2UpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBHZXQgdGhlIGNvb3JkaW5hdGVzIGZyb20gdGhlIGFwcHJvcHJpYXRlIHRvdWNoIGV2ZW50IGFuZFxuXHRcdFx0Ly8gcGFzcyB0aGVtIG9uIHRvIHRoZSBzY3JvbGwgaGFuZGxlclxuXHRcdFx0dmFyIHRvdWNoRXZlbnQgPSBtb3ZlRXZlbnQudG91Y2hlc1tfaW5wdXRJbmRleF07XG5cdFx0XHRfdXBkYXRlU2Nyb2xsKHRvdWNoRXZlbnQuY2xpZW50WCwgdG91Y2hFdmVudC5jbGllbnRZLCBtb3ZlRXZlbnQudGltZVN0YW1wLCBtb3ZlRXZlbnQpO1xuXHRcdH07XG5cdFx0X29uVG91Y2hFbmQgPSBmdW5jdGlvbiBfb25Ub3VjaEVuZChlbmRFdmVudCkge1xuXHRcdFx0dmFyIGksIGw7XG5cblx0XHRcdC8vIENoZWNrIHdoZXRoZXIgdGhlIG9yaWdpbmFsIHRvdWNoIGV2ZW50IGlzIHN0aWxsIGFjdGl2ZSxcblx0XHRcdC8vIGlmIGl0IGlzLCB1cGRhdGUgdGhlIGluZGV4IGFuZCByZXR1cm4uXG5cdFx0XHRpZiAoZW5kRXZlbnQudG91Y2hlcykge1xuXHRcdFx0XHRmb3IgKGkgPSAwLCBsID0gZW5kRXZlbnQudG91Y2hlcy5sZW5ndGg7IGkgPCBsOyBpID0gaSArIDEpIHtcblx0XHRcdFx0XHRpZiAoZW5kRXZlbnQudG91Y2hlc1tpXS5pZGVudGlmaWVyID09PSBfaW5wdXRJZGVudGlmaWVyKSB7XG5cdFx0XHRcdFx0XHRfaW5wdXRJbmRleCA9IGk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIENvbXBsZXRlIHRoZSBzY3JvbGwuICBOb3RlIHRoYXQgdG91Y2ggZW5kIGV2ZW50c1xuXHRcdFx0Ly8gZG9uJ3QgY2FwdHVyZSBjb29yZGluYXRlcy5cblx0XHRcdF9lbmRTY3JvbGwoZW5kRXZlbnQudGltZVN0YW1wLCBlbmRFdmVudCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIE1vdXNlIGV2ZW50IGhhbmRsZXJzXG5cdFx0ICovXG5cdFx0X29uTW91c2VEb3duID0gZnVuY3Rpb24gX29uTW91c2VEb3duKHN0YXJ0RXZlbnQpIHtcblxuXHRcdFx0Ly8gRG9uJ3QgdHJhY2sgdGhlIHJpZ2h0IG1vdXNlIGJ1dHRvbnMsIG9yIGEgY29udGV4dCBtZW51XG5cdFx0XHRpZiAoKHN0YXJ0RXZlbnQuYnV0dG9uICYmIHN0YXJ0RXZlbnQuYnV0dG9uID09PSAyKSB8fCBzdGFydEV2ZW50LmN0cmxLZXkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDYXB0dXJlIGlmIHBvc3NpYmxlXG5cdFx0XHRpZiAoX2NvbnRhaW5lck5vZGUuc2V0Q2FwdHVyZSkge1xuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5zZXRDYXB0dXJlKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFkZCBtb3ZlICYgdXAgaGFuZGxlcnMgdG8gdGhlICpkb2N1bWVudCogdG8gYWxsb3cgaGFuZGxpbmcgb3V0c2lkZSB0aGUgZWxlbWVudFxuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgX29uTW91c2VNb3ZlLCB0cnVlKTtcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBfb25Nb3VzZVVwLCB0cnVlKTtcblxuXHRcdFx0X2lucHV0SWRlbnRpZmllciA9IHN0YXJ0RXZlbnQuYnV0dG9uIHx8IDE7XG5cdFx0XHRfaW5wdXRJbmRleCA9IDA7XG5cdFx0XHRfc3RhcnRTY3JvbGwoc3RhcnRFdmVudC5jbGllbnRYLCBzdGFydEV2ZW50LmNsaWVudFksIHN0YXJ0RXZlbnQudGltZVN0YW1wLCBzdGFydEV2ZW50KTtcblx0XHR9O1xuXHRcdF9vbk1vdXNlTW92ZSA9IGZ1bmN0aW9uIF9vbk1vdXNlTW92ZShtb3ZlRXZlbnQpIHtcblx0XHRcdGlmICghX2lucHV0SWRlbnRpZmllcikge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdF91cGRhdGVTY3JvbGwobW92ZUV2ZW50LmNsaWVudFgsIG1vdmVFdmVudC5jbGllbnRZLCBtb3ZlRXZlbnQudGltZVN0YW1wLCBtb3ZlRXZlbnQpO1xuXHRcdH07XG5cdFx0X29uTW91c2VVcCA9IGZ1bmN0aW9uIF9vbk1vdXNlVXAoZW5kRXZlbnQpIHtcblx0XHRcdGlmIChlbmRFdmVudC5idXR0b24gJiYgZW5kRXZlbnQuYnV0dG9uICE9PSBfaW5wdXRJZGVudGlmaWVyKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgX29uTW91c2VNb3ZlLCB0cnVlKTtcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBfb25Nb3VzZVVwLCB0cnVlKTtcblxuXHRcdFx0Ly8gUmVsZWFzZSBjYXB0dXJlIGlmIHBvc3NpYmxlXG5cdFx0XHRpZiAoX2NvbnRhaW5lck5vZGUucmVsZWFzZUNhcHR1cmUpIHtcblx0XHRcdFx0X2NvbnRhaW5lck5vZGUucmVsZWFzZUNhcHR1cmUoKTtcblx0XHRcdH1cblxuXHRcdFx0X2VuZFNjcm9sbChlbmRFdmVudC50aW1lU3RhbXAsIGVuZEV2ZW50KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUG9pbnRlciBldmVudCBoYW5kbGVyc1xuXHRcdCAqL1xuXHRcdF9vblBvaW50ZXJEb3duID0gZnVuY3Rpb24gX29uUG9pbnRlckRvd24oc3RhcnRFdmVudCkge1xuXG5cdFx0XHQvLyBJZiB0aGVyZSBpcyBhbHJlYWR5IGEgcG9pbnRlciBldmVudCBiZWluZyB0cmFja2VkLCBpZ25vcmUgc3Vic2VxdWVudC5cblx0XHRcdGlmIChfaW5wdXRJZGVudGlmaWVyKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRGlzYWJsZSBzcGVjaWZpYyBpbnB1dCB0eXBlcyBpZiBzcGVjaWZpZWQgaW4gdGhlIGNvbmZpZy4gIFNlcGFyYXRlXG5cdFx0XHQvLyBvdXQgdG91Y2ggYW5kIG90aGVyIGV2ZW50cyAoZWcgdHJlYXQgYm90aCBwZW4gYW5kIG1vdXNlIGFzIFwibW91c2VcIilcblx0XHRcdGlmIChzdGFydEV2ZW50LnBvaW50ZXJUeXBlID09PSBzdGFydEV2ZW50Lk1TUE9JTlRFUl9UWVBFX1RPVUNIKSB7XG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLmRpc2FibGVkSW5wdXRNZXRob2RzLnRvdWNoKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKF9pbnN0YW5jZU9wdGlvbnMuZGlzYWJsZWRJbnB1dE1ldGhvZHMubW91c2UpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gc3RhcnRFdmVudC5wb2ludGVySWQ7XG5cdFx0XHRfY2FwdHVyZUlucHV0KCk7XG5cdFx0XHRfc3RhcnRTY3JvbGwoc3RhcnRFdmVudC5jbGllbnRYLCBzdGFydEV2ZW50LmNsaWVudFksIHN0YXJ0RXZlbnQudGltZVN0YW1wLCBzdGFydEV2ZW50KTtcblx0XHR9O1xuXHRcdF9vblBvaW50ZXJNb3ZlID0gZnVuY3Rpb24gX29uUG9pbnRlck1vdmUobW92ZUV2ZW50KSB7XG5cdFx0XHRpZiAoX2lucHV0SWRlbnRpZmllciAhPT0gbW92ZUV2ZW50LnBvaW50ZXJJZCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRfdXBkYXRlU2Nyb2xsKG1vdmVFdmVudC5jbGllbnRYLCBtb3ZlRXZlbnQuY2xpZW50WSwgbW92ZUV2ZW50LnRpbWVTdGFtcCwgbW92ZUV2ZW50KTtcblx0XHR9O1xuXHRcdF9vblBvaW50ZXJVcCA9IGZ1bmN0aW9uIF9vblBvaW50ZXJVcChlbmRFdmVudCkge1xuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09IGVuZEV2ZW50LnBvaW50ZXJJZCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdF9lbmRTY3JvbGwoZW5kRXZlbnQudGltZVN0YW1wLCBlbmRFdmVudCk7XG5cdFx0fTtcblx0XHRfb25Qb2ludGVyQ2FuY2VsID0gZnVuY3Rpb24gX29uUG9pbnRlckNhbmNlbChlbmRFdmVudCkge1xuXHRcdFx0X2VuZFNjcm9sbChlbmRFdmVudC50aW1lU3RhbXAsIGVuZEV2ZW50KTtcblx0XHR9O1xuXHRcdF9vblBvaW50ZXJDYXB0dXJlRW5kID0gZnVuY3Rpb24gX29uUG9pbnRlckNhcHR1cmVFbmQoZXZlbnQpIHtcblx0XHRcdF9lbmRTY3JvbGwoZXZlbnQudGltZVN0YW1wLCBldmVudCk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogUHJldmVudHMgY2xpY2sgYWN0aW9ucyBpZiBhcHByb3ByaWF0ZVxuXHRcdCAqL1xuXHRcdF9vbkNsaWNrID0gZnVuY3Rpb24gX29uQ2xpY2soY2xpY2tFdmVudCkge1xuXG5cdFx0XHQvLyBJZiBhIHNjcm9sbCBhY3Rpb24gaGFzbid0IHJlc3VsdGVkIGluIHRoZSBuZXh0IHNjcm9sbCBiZWluZyBwcmV2ZW50ZWQsIGFuZCBhIHNjcm9sbFxuXHRcdFx0Ly8gaXNuJ3QgY3VycmVudGx5IGluIHByb2dyZXNzIHdpdGggYSBkaWZmZXJlbnQgaWRlbnRpZmllciwgYWxsb3cgdGhlIGNsaWNrXG5cdFx0XHRpZiAoIV9wcmV2ZW50Q2xpY2sgJiYgIV9pbnB1dElkZW50aWZpZXIpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFByZXZlbnQgY2xpY2tzIHVzaW5nIHRoZSBwcmV2ZW50RGVmYXVsdCgpIGFuZCBzdG9wUHJvcGFnYXRpb24oKSBoYW5kbGVycyBvbiB0aGUgZXZlbnQ7XG5cdFx0XHQvLyB0aGlzIGlzIHNhZmUgZXZlbiBpbiBJRTEwIGFzIHRoaXMgaXMgYWx3YXlzIGEgXCJ0cnVlXCIgZXZlbnQsIG5ldmVyIGEgd2luZG93LmV2ZW50LlxuXHRcdFx0Y2xpY2tFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y2xpY2tFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdGlmICghX2lucHV0SWRlbnRpZmllcikge1xuXHRcdFx0XHRfcHJldmVudENsaWNrID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogUHJvY2VzcyBzY3JvbGwgd2hlZWwvaW5wdXQgYWN0aW9ucyBhcyBzY3JvbGxlciBzY3JvbGxzXG5cdFx0ICovXG5cdFx0X29uTW91c2VTY3JvbGwgPSBmdW5jdGlvbiBfb25Nb3VzZVNjcm9sbChldmVudCkge1xuXHRcdFx0dmFyIHNjcm9sbERlbHRhWCwgc2Nyb2xsRGVsdGFZO1xuXHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09ICdzY3JvbGx3aGVlbCcpIHtcblx0XHRcdFx0aWYgKF9pbnB1dElkZW50aWZpZXIgIT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0X2lucHV0SWRlbnRpZmllciA9ICdzY3JvbGx3aGVlbCc7XG5cdFx0XHRcdF9jdW11bGF0aXZlU2Nyb2xsLnggPSAwO1xuXHRcdFx0XHRfY3VtdWxhdGl2ZVNjcm9sbC55ID0gMDtcblxuXHRcdFx0XHQvLyBTdGFydCBhIHNjcm9sbCBldmVudFxuXHRcdFx0XHRpZiAoIV9zdGFydFNjcm9sbChldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZLCBEYXRlLm5vdygpLCBldmVudCkpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gQ29udmVydCB0aGUgc2Nyb2xsd2hlZWwgdmFsdWVzIHRvIGEgc2Nyb2xsIHZhbHVlXG5cdFx0XHRpZiAoZXZlbnQud2hlZWxEZWx0YSkge1xuXHRcdFx0XHRpZiAoZXZlbnQud2hlZWxEZWx0YVgpIHtcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVggPSBldmVudC53aGVlbERlbHRhWCAvIDI7XG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gZXZlbnQud2hlZWxEZWx0YVkgLyAyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNjcm9sbERlbHRhWCA9IDA7XG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gZXZlbnQud2hlZWxEZWx0YSAvIDI7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChldmVudC5heGlzICYmIGV2ZW50LmF4aXMgPT09IGV2ZW50LkhPUklaT05UQUxfQVhJUykge1xuXHRcdFx0XHRcdHNjcm9sbERlbHRhWCA9IGV2ZW50LmRldGFpbCAqIC0xMDtcblx0XHRcdFx0XHRzY3JvbGxEZWx0YVkgPSAwO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNjcm9sbERlbHRhWCA9IDA7XG5cdFx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gZXZlbnQuZGV0YWlsICogLTEwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIHRoZSBzY3JvbGxlciBpcyBjb25zdHJhaW5lZCB0byBhbiB4IGF4aXMsIGNvbnZlcnQgeSBzY3JvbGwgdG8gYWxsb3cgc2luZ2xlLWF4aXMgc2Nyb2xsXG5cdFx0XHQvLyB3aGVlbHMgdG8gc2Nyb2xsIGNvbnN0cmFpbmVkIGNvbnRlbnQuXG5cdFx0XHRpZiAoIV9pbnN0YW5jZU9wdGlvbnMuc2Nyb2xsaW5nWSAmJiAhc2Nyb2xsRGVsdGFYKSB7XG5cdFx0XHRcdHNjcm9sbERlbHRhWCA9IHNjcm9sbERlbHRhWTtcblx0XHRcdFx0c2Nyb2xsRGVsdGFZID0gMDtcblx0XHRcdH1cblxuXHRcdFx0X2N1bXVsYXRpdmVTY3JvbGwueCA9IE1hdGgucm91bmQoX2N1bXVsYXRpdmVTY3JvbGwueCArIHNjcm9sbERlbHRhWCk7XG5cdFx0XHRfY3VtdWxhdGl2ZVNjcm9sbC55ID0gTWF0aC5yb3VuZChfY3VtdWxhdGl2ZVNjcm9sbC55ICsgc2Nyb2xsRGVsdGFZKTtcblxuXHRcdFx0X3VwZGF0ZVNjcm9sbChfZ2VzdHVyZVN0YXJ0LnggKyBfY3VtdWxhdGl2ZVNjcm9sbC54LCBfZ2VzdHVyZVN0YXJ0LnkgKyBfY3VtdWxhdGl2ZVNjcm9sbC55LCBldmVudC50aW1lU3RhbXAsIGV2ZW50KTtcblxuXHRcdFx0Ly8gRW5kIHNjcm9sbGluZyBzdGF0ZVxuXHRcdFx0aWYgKF9zY3JvbGxXaGVlbEVuZERlYm91bmNlcikge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQoX3Njcm9sbFdoZWVsRW5kRGVib3VuY2VyKTtcblx0XHRcdH1cblx0XHRcdF9zY3JvbGxXaGVlbEVuZERlYm91bmNlciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRfaW5wdXRJZGVudGlmaWVyID0gZmFsc2U7XG5cdFx0XHRcdF9yZWxlYXNlSW5wdXRDYXB0dXJlKCk7XG5cdFx0XHRcdF9pc1Njcm9sbGluZyA9IGZhbHNlO1xuXHRcdFx0XHRfaXNEaXNwbGF5aW5nU2Nyb2xsID0gZmFsc2U7XG5cdFx0XHRcdF9mdHNjcm9sbGVyTW92aW5nID0gZmFsc2U7XG5cdFx0XHRcdGlmIChfaW5zdGFuY2VPcHRpb25zLndpbmRvd1Njcm9sbGluZ0FjdGl2ZUZsYWcpIHtcblx0XHRcdFx0XHR3aW5kb3dbX2luc3RhbmNlT3B0aW9ucy53aW5kb3dTY3JvbGxpbmdBY3RpdmVGbGFnXSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF9jYW5jZWxBbmltYXRpb24oKTtcblx0XHRcdFx0aWYgKCFfc25hcFNjcm9sbCgpKSB7XG5cdFx0XHRcdFx0X2ZpbmFsaXplU2Nyb2xsKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIDMwMCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENhcHR1cmUgYW5kIHJlbGVhc2UgaW5wdXQgc3VwcG9ydCwgcGFydGljdWxhcmx5IGFsbG93aW5nIHRyYWNraW5nXG5cdFx0ICogb2YgTWV0cm8gcG9pbnRlcnMgb3V0c2lkZSB0aGUgZG9ja2VkIHZpZXcuXG5cdFx0ICovXG5cdFx0X2NhcHR1cmVJbnB1dCA9IGZ1bmN0aW9uIF9jYXB0dXJlSW5wdXQoKSB7XG5cdFx0XHRpZiAoX2lucHV0Q2FwdHVyZWQgfHwgX2lucHV0SWRlbnRpZmllciA9PT0gZmFsc2UgfHwgX2lucHV0SWRlbnRpZmllciA9PT0gJ3Njcm9sbHdoZWVsJykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAoX3RyYWNrUG9pbnRlckV2ZW50cykge1xuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5tc1NldFBvaW50ZXJDYXB0dXJlKF9pbnB1dElkZW50aWZpZXIpO1xuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5hZGRFdmVudExpc3RlbmVyKCdNU0xvc3RQb2ludGVyQ2FwdHVyZScsIF9vblBvaW50ZXJDYXB0dXJlRW5kLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0XHRfaW5wdXRDYXB0dXJlZCA9IHRydWU7XG5cdFx0fTtcblx0XHRfcmVsZWFzZUlucHV0Q2FwdHVyZSA9IGZ1bmN0aW9uIF9yZWxlYXNlSW5wdXRDYXB0dXJlKCkge1xuXHRcdFx0aWYgKCFfaW5wdXRDYXB0dXJlZCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAoX3RyYWNrUG9pbnRlckV2ZW50cykge1xuXHRcdFx0XHRfY29udGFpbmVyTm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKCdNU0xvc3RQb2ludGVyQ2FwdHVyZScsIF9vblBvaW50ZXJDYXB0dXJlRW5kLCBmYWxzZSk7XG5cdFx0XHRcdF9jb250YWluZXJOb2RlLm1zUmVsZWFzZVBvaW50ZXJDYXB0dXJlKF9pbnB1dElkZW50aWZpZXIpO1xuXHRcdFx0fVxuXHRcdFx0X2lucHV0Q2FwdHVyZWQgPSBmYWxzZTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogVXRpbGl0eSBmdW5jdGlvbiBhY3RpbmcgYXMgYSBnZXRCb3VuZGluZ0NsaWVudFJlY3QgcG9seWZpbGwuXG5cdFx0ICovXG5cdFx0X2dldEJvdW5kaW5nUmVjdCA9IGZ1bmN0aW9uIF9nZXRCb3VuZGluZ1JlY3QoYW5FbGVtZW50KSB7XG5cdFx0XHRpZiAoYW5FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCkge1xuXHRcdFx0XHRyZXR1cm4gYW5FbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgeCA9IDAsIHkgPSAwLCBlYWNoRWxlbWVudCA9IGFuRWxlbWVudDtcblx0XHRcdHdoaWxlIChlYWNoRWxlbWVudCkge1xuXHRcdFx0XHR4ID0geCArIGVhY2hFbGVtZW50Lm9mZnNldExlZnQgLSBlYWNoRWxlbWVudC5zY3JvbGxMZWZ0O1xuXHRcdFx0XHR5ID0geSArIGVhY2hFbGVtZW50Lm9mZnNldFRvcCAtIGVhY2hFbGVtZW50LnNjcm9sbFRvcDtcblx0XHRcdFx0ZWFjaEVsZW1lbnQgPSBlYWNoRWxlbWVudC5vZmZzZXRQYXJlbnQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4geyBsZWZ0OiB4LCB0b3A6IHksIHdpZHRoOiBhbkVsZW1lbnQub2Zmc2V0V2lkdGgsIGhlaWdodDogYW5FbGVtZW50Lm9mZnNldEhlaWdodCB9O1xuXHRcdH07XG5cblxuXHRcdC8qICAgICAgICAgICAgICAgICAgICAgSW5zdGFudGlhdGlvbiAgICAgICAgICAgICAgICAgICAgICovXG5cblx0XHQvLyBTZXQgdXAgdGhlIERPTSBub2RlIGlmIGFwcHJvcHJpYXRlXG5cdFx0X2luaXRpYWxpemVET00oKTtcblxuXHRcdC8vIFVwZGF0ZSBzaXplc1xuXHRcdF91cGRhdGVEaW1lbnNpb25zKCk7XG5cblx0XHQvLyBTZXQgdXAgdGhlIGV2ZW50IGhhbmRsZXJzXG5cdFx0X3RvZ2dsZUV2ZW50SGFuZGxlcnModHJ1ZSk7XG5cblx0XHQvLyBEZWZpbmUgYSBwdWJsaWMgQVBJIHRvIGJlIHJldHVybmVkIGF0IHRoZSBib3R0b20gLSB0aGlzIGlzIHRoZSBwdWJsaWMtZmFjaW5nIGludGVyZmFjZS5cblx0XHRfcHVibGljU2VsZiA9IHtcblx0XHRcdGRlc3Ryb3k6IGRlc3Ryb3ksXG5cdFx0XHRzZXRTbmFwU2l6ZTogc2V0U25hcFNpemUsXG5cdFx0XHRzY3JvbGxUbzogc2Nyb2xsVG8sXG5cdFx0XHRzY3JvbGxCeTogc2Nyb2xsQnksXG5cdFx0XHR1cGRhdGVEaW1lbnNpb25zOiB1cGRhdGVEaW1lbnNpb25zLFxuXHRcdFx0YWRkRXZlbnRMaXN0ZW5lcjogYWRkRXZlbnRMaXN0ZW5lcixcblx0XHRcdHJlbW92ZUV2ZW50TGlzdGVuZXI6IHJlbW92ZUV2ZW50TGlzdGVuZXIsXG5cdFx0XHRnZXQgc2Nyb2xsSGVpZ2h0ICgpIHsgcmV0dXJuIF9tZXRyaWNzLmNvbnRlbnQueTsgfSxcblx0XHRcdHNldCBzY3JvbGxIZWlnaHQgKHZhbHVlKSB7IHRocm93IG5ldyBTeW50YXhFcnJvcignc2Nyb2xsSGVpZ2h0IGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9LFxuXHRcdFx0Z2V0IHNjcm9sbExlZnQgKCkgeyByZXR1cm4gLV9sYXN0U2Nyb2xsUG9zaXRpb24ueDsgfSxcblx0XHRcdHNldCBzY3JvbGxMZWZ0ICh2YWx1ZSkgeyBzY3JvbGxUbyh2YWx1ZSwgZmFsc2UsIGZhbHNlKTsgcmV0dXJuIC1fbGFzdFNjcm9sbFBvc2l0aW9uLng7IH0sXG5cdFx0XHRnZXQgc2Nyb2xsVG9wICgpIHsgcmV0dXJuIC1fbGFzdFNjcm9sbFBvc2l0aW9uLnk7IH0sXG5cdFx0XHRzZXQgc2Nyb2xsVG9wICh2YWx1ZSkgeyBzY3JvbGxUbyhmYWxzZSwgdmFsdWUsIGZhbHNlKTsgcmV0dXJuIC1fbGFzdFNjcm9sbFBvc2l0aW9uLnk7IH0sXG5cdFx0XHRnZXQgc2Nyb2xsV2lkdGggKCkgeyByZXR1cm4gX21ldHJpY3MuY29udGVudC54OyB9LFxuXHRcdFx0c2V0IHNjcm9sbFdpZHRoICh2YWx1ZSkgeyB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ3Njcm9sbFdpZHRoIGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9LFxuXHRcdFx0Z2V0IHNlZ21lbnRDb3VudCAoKSB7XG5cdFx0XHRcdGlmICghX2luc3RhbmNlT3B0aW9ucy5zbmFwcGluZykge1xuXHRcdFx0XHRcdHJldHVybiB7IHg6IE5hTiwgeTogTmFOIH07XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHR4OiBNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudC54IC8gX3NuYXBHcmlkU2l6ZS54KSxcblx0XHRcdFx0XHR5OiBNYXRoLmNlaWwoX21ldHJpY3MuY29udGVudC55IC8gX3NuYXBHcmlkU2l6ZS55KVxuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblx0XHRcdHNldCBzZWdtZW50Q291bnQgKHZhbHVlKSB7IHRocm93IG5ldyBTeW50YXhFcnJvcignc2VnbWVudENvdW50IGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9LFxuXHRcdFx0Z2V0IGN1cnJlbnRTZWdtZW50ICgpIHsgcmV0dXJuIHsgeDogX2FjdGl2ZVNlZ21lbnQueCwgeTogX2FjdGl2ZVNlZ21lbnQueSB9OyB9LFxuXHRcdFx0c2V0IGN1cnJlbnRTZWdtZW50ICh2YWx1ZSkgeyB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2N1cnJlbnRTZWdtZW50IGlzIGN1cnJlbnRseSByZWFkLW9ubHkgLSBpZ25vcmluZyAnICsgdmFsdWUpOyB9LFxuXHRcdFx0Z2V0IGNvbnRlbnRDb250YWluZXJOb2RlICgpIHsgcmV0dXJuIF9jb250ZW50UGFyZW50Tm9kZTsgfSxcblx0XHRcdHNldCBjb250ZW50Q29udGFpbmVyTm9kZSAodmFsdWUpIHsgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdjb250ZW50Q29udGFpbmVyTm9kZSBpcyBjdXJyZW50bHkgcmVhZC1vbmx5IC0gaWdub3JpbmcgJyArIHZhbHVlKTsgfVxuXHRcdH07XG5cblx0XHQvLyBSZXR1cm4gdGhlIHB1YmxpYyBpbnRlcmZhY2UuXG5cdFx0cmV0dXJuIF9wdWJsaWNTZWxmO1xuXHR9O1xuXG5cblx0LyogICAgICAgICAgUHJvdG90eXBlIEZ1bmN0aW9ucyBhbmQgUHJvcGVydGllcyAgICAgICAgICAgKi9cblxuXHQvKipcblx0ICogVGhlIEhUTUwgdG8gcHJlcGVuZCB0byB0aGUgc2Nyb2xsYWJsZSBjb250ZW50IHRvIHdyYXAgaXQuIFVzZWQgaW50ZXJuYWxseSxcblx0ICogYW5kIG1heSBiZSB1c2VkIHRvIHByZS13cmFwIHNjcm9sbGFibGUgY29udGVudC4gIEF4ZXMgY2FuIG9wdGlvbmFsbHlcblx0ICogYmUgZXhjbHVkZWQgZm9yIHNwZWVkIGltcHJvdmVtZW50cy5cblx0ICovXG5cdEZUU2Nyb2xsZXIucHJvdG90eXBlLmdldFByZXBlbmRlZEhUTUwgPSBmdW5jdGlvbiAoZXhjbHVkZVhBeGlzLCBleGNsdWRlWUF4aXMsIGh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcblx0XHRpZiAoIWh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcblx0XHRcdGlmICh0eXBlb2YgRlRTY3JvbGxlck9wdGlvbnMgPT09ICdvYmplY3QnICYmIEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcblx0XHRcdFx0aHdBY2NlbGVyYXRpb25DbGFzcyA9IEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3M7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRod0FjY2VsZXJhdGlvbkNsYXNzID0gJ2Z0c2Nyb2xsZXJfaHdhY2NlbGVyYXRlZCc7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIG91dHB1dCA9ICc8ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl9jb250YWluZXJcIj4nO1xuXHRcdGlmICghZXhjbHVkZVhBeGlzKSB7XG5cdFx0XHRvdXRwdXQgKz0gJzxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3ggJyArIGh3QWNjZWxlcmF0aW9uQ2xhc3MgKyAnXCI+Jztcblx0XHR9XG5cdFx0aWYgKCFleGNsdWRlWUF4aXMpIHtcblx0XHRcdG91dHB1dCArPSAnPGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfeSAnICsgaHdBY2NlbGVyYXRpb25DbGFzcyArICdcIj4nO1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH07XG5cblx0LyoqXG5cdCAqIFRoZSBIVE1MIHRvIGFwcGVuZCB0byB0aGUgc2Nyb2xsYWJsZSBjb250ZW50IHRvIHdyYXAgaXQ7IGFnYWluLCB1c2VkIGludGVybmFsbHksXG5cdCAqIGFuZCBtYXkgYmUgdXNlZCB0byBwcmUtd3JhcCBzY3JvbGxhYmxlIGNvbnRlbnQuXG5cdCAqL1xuXHRGVFNjcm9sbGVyLnByb3RvdHlwZS5nZXRBcHBlbmRlZEhUTUwgPSBmdW5jdGlvbiAoZXhjbHVkZVhBeGlzLCBleGNsdWRlWUF4aXMsIGh3QWNjZWxlcmF0aW9uQ2xhc3MsIHNjcm9sbGJhcnMpIHtcblx0XHRpZiAoIWh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcblx0XHRcdGlmICh0eXBlb2YgRlRTY3JvbGxlck9wdGlvbnMgPT09ICdvYmplY3QnICYmIEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3MpIHtcblx0XHRcdFx0aHdBY2NlbGVyYXRpb25DbGFzcyA9IEZUU2Nyb2xsZXJPcHRpb25zLmh3QWNjZWxlcmF0aW9uQ2xhc3M7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRod0FjY2VsZXJhdGlvbkNsYXNzID0gJ2Z0c2Nyb2xsZXJfaHdhY2NlbGVyYXRlZCc7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdGlmICghZXhjbHVkZVhBeGlzKSB7XG5cdFx0XHRvdXRwdXQgKz0gJzwvZGl2Pic7XG5cdFx0fVxuXHRcdGlmICghZXhjbHVkZVlBeGlzKSB7XG5cdFx0XHRvdXRwdXQgKz0gJzwvZGl2Pic7XG5cdFx0fVxuXHRcdGlmIChzY3JvbGxiYXJzKSB7XG5cdFx0XHRpZiAoIWV4Y2x1ZGVYQXhpcykge1xuXHRcdFx0XHRvdXRwdXQgKz0gJzxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3Njcm9sbGJhciBmdHNjcm9sbGVyX3Njcm9sbGJhcnggJyArIGh3QWNjZWxlcmF0aW9uQ2xhc3MgKyAnXCI+PGRpdiBjbGFzcz1cImZ0c2Nyb2xsZXJfc2Nyb2xsYmFyaW5uZXJcIj48L2Rpdj48L2Rpdj4nO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCFleGNsdWRlWUF4aXMpIHtcblx0XHRcdFx0b3V0cHV0ICs9ICc8ZGl2IGNsYXNzPVwiZnRzY3JvbGxlcl9zY3JvbGxiYXIgZnRzY3JvbGxlcl9zY3JvbGxiYXJ5ICcgKyBod0FjY2VsZXJhdGlvbkNsYXNzICsgJ1wiPjxkaXYgY2xhc3M9XCJmdHNjcm9sbGVyX3Njcm9sbGJhcmlubmVyXCI+PC9kaXY+PC9kaXY+Jztcblx0XHRcdH1cblx0XHR9XG5cdFx0b3V0cHV0ICs9ICc8L2Rpdj4nO1xuXG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fTtcbn0oKSk7XG5cblxuKGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGZ1bmN0aW9uIF90aHJvd1JhbmdlRXJyb3IobmFtZSwgdmFsdWUpIHtcblx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCInICsgbmFtZSArICdcIiBtdXN0IGJlIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMS4gJyArICdHb3QgJyArIHZhbHVlICsgJyBpbnN0ZWFkLicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlcHJlc2VudHMgYSB0d28tZGltZW5zaW9uYWwgY3ViaWMgYmV6aWVyIGN1cnZlIHdpdGggdGhlIHN0YXJ0aW5nXG5cdCAqIHBvaW50ICgwLCAwKSBhbmQgdGhlIGVuZCBwb2ludCAoMSwgMSkuIFRoZSB0d28gY29udHJvbCBwb2ludHMgcDEgYW5kIHAyXG5cdCAqIGhhdmUgeCBhbmQgeSBjb29yZGluYXRlcyBiZXR3ZWVuIDAgYW5kIDEuXG5cdCAqXG5cdCAqIFRoaXMgdHlwZSBvZiBiZXppZXIgY3VydmVzIGNhbiBiZSB1c2VkIGFzIENTUyB0cmFuc2Zvcm0gdGltaW5nIGZ1bmN0aW9ucy5cblx0ICovXG5cdEN1YmljQmV6aWVyID0gZnVuY3Rpb24gKHAxeCwgcDF5LCBwMngsIHAyeSkge1xuXHRcdGlmICghKHAxeCA+PSAwICYmIHAxeCA8PSAxKSkge1xuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigncDF4JywgcDF4KTtcblx0XHR9XG5cdFx0aWYgKCEocDF5ID49IDAgJiYgcDF5IDw9IDEpKSB7XG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCdwMXknLCBwMXkpO1xuXHRcdH1cblx0XHRpZiAoIShwMnggPj0gMCAmJiBwMnggPD0gMSkpIHtcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3AyeCcsIHAyeCk7XG5cdFx0fVxuXHRcdGlmICghKHAyeSA+PSAwICYmIHAyeSA8PSAxKSkge1xuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigncDJ5JywgcDJ5KTtcblx0XHR9XG5cblx0XHQvLyBDb250cm9sIHBvaW50c1xuXHRcdHRoaXMuX3AxID0geyB4OiBwMXgsIHk6IHAxeSB9O1xuXHRcdHRoaXMuX3AyID0geyB4OiBwMngsIHk6IHAyeSB9O1xuXHR9O1xuXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5fZ2V0Q29vcmRpbmF0ZUZvclQgPSBmdW5jdGlvbiAodCwgcDEsIHAyKSB7XG5cdFx0dmFyIGMgPSAzICogcDEsXG5cdFx0XHRiID0gMyAqIChwMiAtIHAxKSAtIGMsXG5cdFx0XHRhID0gMSAtIGMgLSBiO1xuXG5cdFx0cmV0dXJuICgoYSAqIHQgKyBiKSAqIHQgKyBjKSAqIHQ7XG5cdH07XG5cblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLl9nZXRDb29yZGluYXRlRGVyaXZhdGVGb3JUID0gZnVuY3Rpb24gKHQsIHAxLCBwMikge1xuXHRcdHZhciBjID0gMyAqIHAxLFxuXHRcdFx0YiA9IDMgKiAocDIgLSBwMSkgLSBjLFxuXHRcdFx0YSA9IDEgLSBjIC0gYjtcblxuXHRcdHJldHVybiAoMyAqIGEgKiB0ICsgMiAqIGIpICogdCArIGM7XG5cdH07XG5cblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLl9nZXRURm9yQ29vcmRpbmF0ZSA9IGZ1bmN0aW9uIChjLCBwMSwgcDIsIGVwc2lsb24pIHtcblx0XHRpZiAoIWlzRmluaXRlKGVwc2lsb24pIHx8IGVwc2lsb24gPD0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wiZXBzaWxvblwiIG11c3QgYmUgYSBudW1iZXIgZ3JlYXRlciB0aGFuIDAuJyk7XG5cdFx0fVxuXHRcdHZhciB0MiwgaSwgYzIsIGQyO1xuXG5cdFx0Ly8gRmlyc3QgdHJ5IGEgZmV3IGl0ZXJhdGlvbnMgb2YgTmV3dG9uJ3MgbWV0aG9kIC0tIG5vcm1hbGx5IHZlcnkgZmFzdC5cblx0XHRmb3IgKHQyID0gYywgaSA9IDA7IGkgPCA4OyBpID0gaSArIDEpIHtcblx0XHRcdGMyID0gdGhpcy5fZ2V0Q29vcmRpbmF0ZUZvclQodDIsIHAxLCBwMikgLSBjO1xuXHRcdFx0aWYgKE1hdGguYWJzKGMyKSA8IGVwc2lsb24pIHtcblx0XHRcdFx0cmV0dXJuIHQyO1xuXHRcdFx0fVxuXHRcdFx0ZDIgPSB0aGlzLl9nZXRDb29yZGluYXRlRGVyaXZhdGVGb3JUKHQyLCBwMSwgcDIpO1xuXHRcdFx0aWYgKE1hdGguYWJzKGQyKSA8IDFlLTYpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHR0MiA9IHQyIC0gYzIgLyBkMjtcblx0XHR9XG5cblx0XHQvLyBGYWxsIGJhY2sgdG8gdGhlIGJpc2VjdGlvbiBtZXRob2QgZm9yIHJlbGlhYmlsaXR5LlxuXHRcdHQyID0gYztcblx0XHR2YXIgdDAgPSAwLFxuXHRcdFx0dDEgPSAxO1xuXG5cdFx0aWYgKHQyIDwgdDApIHtcblx0XHRcdHJldHVybiB0MDtcblx0XHR9XG5cdFx0aWYgKHQyID4gdDEpIHtcblx0XHRcdHJldHVybiB0MTtcblx0XHR9XG5cblx0XHR3aGlsZSAodDAgPCB0MSkge1xuXHRcdFx0YzIgPSB0aGlzLl9nZXRDb29yZGluYXRlRm9yVCh0MiwgcDEsIHAyKTtcblx0XHRcdGlmIChNYXRoLmFicyhjMiAtIGMpIDwgZXBzaWxvbikge1xuXHRcdFx0XHRyZXR1cm4gdDI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoYyA+IGMyKSB7XG5cdFx0XHRcdHQwID0gdDI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0MSA9IHQyO1xuXHRcdFx0fVxuXHRcdFx0dDIgPSAodDEgLSB0MCkgKiAwLjUgKyB0MDtcblx0XHR9XG5cblx0XHQvLyBGYWlsdXJlLlxuXHRcdHJldHVybiB0Mjtcblx0fTtcblxuXHQvKipcblx0ICogQ29tcHV0ZXMgdGhlIHBvaW50IGZvciBhIGdpdmVuIHQgdmFsdWUuXG5cdCAqXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB0XG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYW4gb2JqZWN0IHdpdGggeCBhbmQgeSBwcm9wZXJ0aWVzXG5cdCAqL1xuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZ2V0UG9pbnRGb3JUID0gZnVuY3Rpb24gKHQpIHtcblxuXHRcdC8vIFNwZWNpYWwgY2FzZXM6IHN0YXJ0aW5nIGFuZCBlbmRpbmcgcG9pbnRzXG5cdFx0aWYgKHQgPT09IDAgfHwgdCA9PT0gMSkge1xuXHRcdFx0cmV0dXJuIHsgeDogdCwgeTogdCB9O1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIGZvciBjb3JyZWN0IHQgdmFsdWUgKG11c3QgYmUgYmV0d2VlbiAwIGFuZCAxKVxuXHRcdGlmICh0IDwgMCB8fCB0ID4gMSkge1xuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigndCcsIHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR4OiB0aGlzLl9nZXRDb29yZGluYXRlRm9yVCh0LCB0aGlzLl9wMS54LCB0aGlzLl9wMi54KSxcblx0XHRcdHk6IHRoaXMuX2dldENvb3JkaW5hdGVGb3JUKHQsIHRoaXMuX3AxLnksIHRoaXMuX3AyLnkpXG5cdFx0fTtcblx0fTtcblxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZ2V0VEZvclggPSBmdW5jdGlvbiAoeCwgZXBzaWxvbikge1xuXHRcdHJldHVybiB0aGlzLl9nZXRURm9yQ29vcmRpbmF0ZSh4LCB0aGlzLl9wMS54LCB0aGlzLl9wMi54LCBlcHNpbG9uKTtcblx0fTtcblxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZ2V0VEZvclkgPSBmdW5jdGlvbiAoeSwgZXBzaWxvbikge1xuXHRcdHJldHVybiB0aGlzLl9nZXRURm9yQ29vcmRpbmF0ZSh5LCB0aGlzLl9wMS55LCB0aGlzLl9wMi55LCBlcHNpbG9uKTtcblx0fTtcblxuXHQvKipcblx0ICogQ29tcHV0ZXMgYXV4aWxpYXJ5IHBvaW50cyB1c2luZyBEZSBDYXN0ZWxqYXUncyBhbGdvcml0aG0uXG5cdCAqXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDAgYW5kIGxvd2VyIHRoYW4gMS5cblx0ICogQHJldHVybnMge09iamVjdH0gd2l0aCBtZW1iZXJzIGkwLCBpMSwgaTIgKGZpcnN0IGl0ZXJhdGlvbiksXG5cdCAqICAgIGoxLCBqMiAoc2Vjb25kIGl0ZXJhdGlvbikgYW5kIGsgKHRoZSBleGFjdCBwb2ludCBmb3IgdClcblx0ICovXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5fZ2V0QXV4UG9pbnRzID0gZnVuY3Rpb24gKHQpIHtcblx0XHRpZiAodCA8PSAwIHx8IHQgPj0gMSkge1xuXHRcdFx0X3Rocm93UmFuZ2VFcnJvcigndCcsIHQpO1xuXHRcdH1cblxuXG5cdFx0LyogRmlyc3Qgc2VyaWVzIG9mIGF1eGlsaWFyeSBwb2ludHMgKi9cblxuXHRcdC8vIEZpcnN0IGNvbnRyb2wgcG9pbnQgb2YgdGhlIGxlZnQgY3VydmVcblx0XHR2YXIgaTAgPSB7XG5cdFx0XHRcdHg6IHQgKiB0aGlzLl9wMS54LFxuXHRcdFx0XHR5OiB0ICogdGhpcy5fcDEueVxuXHRcdFx0fSxcblx0XHRcdGkxID0ge1xuXHRcdFx0XHR4OiB0aGlzLl9wMS54ICsgdCAqICh0aGlzLl9wMi54IC0gdGhpcy5fcDEueCksXG5cdFx0XHRcdHk6IHRoaXMuX3AxLnkgKyB0ICogKHRoaXMuX3AyLnkgLSB0aGlzLl9wMS55KVxuXHRcdFx0fSxcblxuXHRcdFx0Ly8gU2Vjb25kIGNvbnRyb2wgcG9pbnQgb2YgdGhlIHJpZ2h0IGN1cnZlXG5cdFx0XHRpMiAgPSB7XG5cdFx0XHRcdHg6IHRoaXMuX3AyLnggKyB0ICogKDEgLSB0aGlzLl9wMi54KSxcblx0XHRcdFx0eTogdGhpcy5fcDIueSArIHQgKiAoMSAtIHRoaXMuX3AyLnkpXG5cdFx0XHR9O1xuXG5cblx0XHQvKiBTZWNvbmQgc2VyaWVzIG9mIGF1eGlsaWFyeSBwb2ludHMgKi9cblxuXHRcdC8vIFNlY29uZCBjb250cm9sIHBvaW50IG9mIHRoZSBsZWZ0IGN1cnZlXG5cdFx0dmFyIGowID0ge1xuXHRcdFx0XHR4OiBpMC54ICsgdCAqIChpMS54IC0gaTAueCksXG5cdFx0XHRcdHk6IGkwLnkgKyB0ICogKGkxLnkgLSBpMC55KVxuXHRcdFx0fSxcblxuXHRcdFx0Ly8gRmlyc3QgY29udHJvbCBwb2ludCBvZiB0aGUgcmlnaHQgY3VydmVcblx0XHRcdGoxID0ge1xuXHRcdFx0XHR4OiBpMS54ICsgdCAqIChpMi54IC0gaTEueCksXG5cdFx0XHRcdHk6IGkxLnkgKyB0ICogKGkyLnkgLSBpMS55KVxuXHRcdFx0fTtcblxuXHRcdC8vIFRoZSBkaXZpc2lvbiBwb2ludCAoZW5kaW5nIHBvaW50IG9mIGxlZnQgY3VydmUsIHN0YXJ0aW5nIHBvaW50IG9mIHJpZ2h0IGN1cnZlKVxuXHRcdHZhciBrID0ge1xuXHRcdFx0XHR4OiBqMC54ICsgdCAqIChqMS54IC0gajAueCksXG5cdFx0XHRcdHk6IGowLnkgKyB0ICogKGoxLnkgLSBqMC55KVxuXHRcdFx0fTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRpMDogaTAsXG5cdFx0XHRpMTogaTEsXG5cdFx0XHRpMjogaTIsXG5cdFx0XHRqMDogajAsXG5cdFx0XHRqMTogajEsXG5cdFx0XHRrOiBrXG5cdFx0fTtcblx0fTtcblxuXHQvKipcblx0ICogRGl2aWRlcyB0aGUgYmV6aWVyIGN1cnZlIGludG8gdHdvIGJlemllciBmdW5jdGlvbnMuXG5cdCAqXG5cdCAqIERlIENhc3RlbGphdSdzIGFsZ29yaXRobSBpcyB1c2VkIHRvIGNvbXB1dGUgdGhlIG5ldyBzdGFydGluZywgZW5kaW5nLCBhbmRcblx0ICogY29udHJvbCBwb2ludHMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDAgYW5kIGxvd2VyIHRoYW4gMS5cblx0ICogICAgIHQgPT09IDEgb3IgdCA9PT0gMCBhcmUgdGhlIHN0YXJ0aW5nL2VuZGluZyBwb2ludHMgb2YgdGhlIGN1cnZlLCBzbyBub1xuXHQgKiAgICAgZGl2aXNpb24gaXMgbmVlZGVkLlxuXHQgKlxuXHQgKiBAcmV0dXJucyB7Q3ViaWNCZXppZXJbXX0gUmV0dXJucyBhbiBhcnJheSBjb250YWluaW5nIHR3byBiZXppZXIgY3VydmVzXG5cdCAqICAgICB0byB0aGUgbGVmdCBhbmQgdGhlIHJpZ2h0IG9mIHQuXG5cdCAqL1xuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZGl2aWRlQXRUID0gZnVuY3Rpb24gKHQpIHtcblx0XHRpZiAodCA8IDAgfHwgdCA+IDEpIHtcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3QnLCB0KTtcblx0XHR9XG5cblx0XHQvLyBTcGVjaWFsIGNhc2VzIHQgPSAwLCB0ID0gMTogQ3VydmUgY2FuIGJlIGNsb25lZCBmb3Igb25lIHNpZGUsIHRoZSBvdGhlclxuXHRcdC8vIHNpZGUgaXMgYSBsaW5lYXIgY3VydmUgKHdpdGggZHVyYXRpb24gMClcblx0XHRpZiAodCA9PT0gMCB8fCB0ID09PSAxKSB7XG5cdFx0XHR2YXIgY3VydmVzID0gW107XG5cdFx0XHRjdXJ2ZXNbdF0gPSBDdWJpY0Jlemllci5saW5lYXIoKTtcblx0XHRcdGN1cnZlc1sxIC0gdF0gPSB0aGlzLmNsb25lKCk7XG5cdFx0XHRyZXR1cm4gY3VydmVzO1xuXHRcdH1cblxuXHRcdHZhciBsZWZ0ID0ge30sXG5cdFx0XHRyaWdodCA9IHt9LFxuXHRcdFx0cG9pbnRzID0gdGhpcy5fZ2V0QXV4UG9pbnRzKHQpO1xuXG5cdFx0dmFyIGkwID0gcG9pbnRzLmkwLFxuXHRcdFx0aTIgPSBwb2ludHMuaTIsXG5cdFx0XHRqMCA9IHBvaW50cy5qMCxcblx0XHRcdGoxID0gcG9pbnRzLmoxLFxuXHRcdFx0ayA9IHBvaW50cy5rO1xuXG5cdFx0Ly8gTm9ybWFsaXplIGRlcml2ZWQgcG9pbnRzLCBzbyB0aGF0IHRoZSBuZXcgY3VydmVzIHN0YXJ0aW5nL2VuZGluZyBwb2ludFxuXHRcdC8vIGNvb3JkaW5hdGVzIGFyZSAoMCwgMCkgcmVzcGVjdGl2ZWx5ICgxLCAxKVxuXHRcdHZhciBmYWN0b3JYID0gay54LFxuXHRcdFx0ZmFjdG9yWSA9IGsueTtcblxuXHRcdGxlZnQucDEgPSB7XG5cdFx0XHR4OiBpMC54IC8gZmFjdG9yWCxcblx0XHRcdHk6IGkwLnkgLyBmYWN0b3JZXG5cdFx0fTtcblx0XHRsZWZ0LnAyID0ge1xuXHRcdFx0eDogajAueCAvIGZhY3RvclgsXG5cdFx0XHR5OiBqMC55IC8gZmFjdG9yWVxuXHRcdH07XG5cblx0XHRyaWdodC5wMSA9IHtcblx0XHRcdHg6IChqMS54IC0gZmFjdG9yWCkgLyAoMSAtIGZhY3RvclgpLFxuXHRcdFx0eTogKGoxLnkgLSBmYWN0b3JZKSAvICgxIC0gZmFjdG9yWSlcblx0XHR9O1xuXG5cdFx0cmlnaHQucDIgPSB7XG5cdFx0XHR4OiAoaTIueCAtIGZhY3RvclgpIC8gKDEgLSBmYWN0b3JYKSxcblx0XHRcdHk6IChpMi55IC0gZmFjdG9yWSkgLyAoMSAtIGZhY3RvclkpXG5cdFx0fTtcblxuXHRcdHJldHVybiBbXG5cdFx0XHRuZXcgQ3ViaWNCZXppZXIobGVmdC5wMS54LCBsZWZ0LnAxLnksIGxlZnQucDIueCwgbGVmdC5wMi55KSxcblx0XHRcdG5ldyBDdWJpY0JlemllcihyaWdodC5wMS54LCByaWdodC5wMS55LCByaWdodC5wMi54LCByaWdodC5wMi55KVxuXHRcdF07XG5cdH07XG5cblx0Q3ViaWNCZXppZXIucHJvdG90eXBlLmRpdmlkZUF0WCA9IGZ1bmN0aW9uICh4LCBlcHNpbG9uKSB7XG5cdFx0aWYgKHggPCAwIHx8IHggPiAxKSB7XG5cdFx0XHRfdGhyb3dSYW5nZUVycm9yKCd4JywgeCk7XG5cdFx0fVxuXG5cdFx0dmFyIHQgPSB0aGlzLmdldFRGb3JYKHgsIGVwc2lsb24pO1xuXHRcdHJldHVybiB0aGlzLmRpdmlkZUF0VCh0KTtcblx0fTtcblxuXHRDdWJpY0Jlemllci5wcm90b3R5cGUuZGl2aWRlQXRZID0gZnVuY3Rpb24gKHksIGVwc2lsb24pIHtcblx0XHRpZiAoeSA8IDAgfHwgeSA+IDEpIHtcblx0XHRcdF90aHJvd1JhbmdlRXJyb3IoJ3knLCB5KTtcblx0XHR9XG5cblx0XHR2YXIgdCA9IHRoaXMuZ2V0VEZvclkoeSwgZXBzaWxvbik7XG5cdFx0cmV0dXJuIHRoaXMuZGl2aWRlQXRUKHQpO1xuXHR9O1xuXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKHRoaXMuX3AxLngsIHRoaXMuX3AxLnksIHRoaXMuX3AyLngsIHRoaXMuX3AyLnkpO1xuXHR9O1xuXG5cdEN1YmljQmV6aWVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gXCJjdWJpYy1iZXppZXIoXCIgKyBbXG5cdFx0XHR0aGlzLl9wMS54LFxuXHRcdFx0dGhpcy5fcDEueSxcblx0XHRcdHRoaXMuX3AyLngsXG5cdFx0XHR0aGlzLl9wMi55XG5cdFx0XS5qb2luKFwiLCBcIikgKyBcIilcIjtcblx0fTtcblxuXHRDdWJpY0Jlemllci5saW5lYXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigpO1xuXHR9O1xuXG5cdEN1YmljQmV6aWVyLmVhc2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIG5ldyBDdWJpY0JlemllcigwLjI1LCAwLjEsIDAuMjUsIDEuMCk7XG5cdH07XG5cdEN1YmljQmV6aWVyLmxpbmVhciA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAuMCwgMC4wLCAxLjAsIDEuMCk7XG5cdH07XG5cdEN1YmljQmV6aWVyLmVhc2VJbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAuNDIsIDAsIDEuMCwgMS4wKTtcblx0fTtcblx0Q3ViaWNCZXppZXIuZWFzZU91dCA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAsIDAsIDAuNTgsIDEuMCk7XG5cdH07XG5cdEN1YmljQmV6aWVyLmVhc2VJbk91dCA9IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gbmV3IEN1YmljQmV6aWVyKDAuNDIsIDAsIDAuNTgsIDEuMCk7XG5cdH07XG59KCkpO1xuXG4vLyBJZiBhIENvbW1vbkpTIGVudmlyb25tZW50IGlzIHByZXNlbnQsIGFkZCBvdXIgZXhwb3J0czsgbWFrZSB0aGUgY2hlY2sgaW4gYSBqc2xpbnQtY29tcGF0aWJsZSBtZXRob2QuXG52YXIgbW9kdWxlO1xuaWYgKG1vZHVsZSAhPT0gdW5kZWZpbmVkICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZG9tTm9kZSwgb3B0aW9ucykge1xuXHRcdCd1c2Ugc3RyaWN0Jztcblx0XHRyZXR1cm4gbmV3IEZUU2Nyb2xsZXIoZG9tTm9kZSwgb3B0aW9ucyk7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMuRlRTY3JvbGxlciA9IEZUU2Nyb2xsZXI7XG5cdG1vZHVsZS5leHBvcnRzLkN1YmljQmV6aWVyID0gQ3ViaWNCZXppZXI7XG59XG4iLCIvKmdsb2JhbCByZXF1aXJlLCBtb2R1bGUqL1xuXG52YXIgZ2FsbGVyeURPTSA9IHJlcXVpcmUoJy4vZ2FsbGVyeURPTScpLFxuICAgIEZUU2Nyb2xsZXIgPSByZXF1aXJlKCdGVFNjcm9sbGVyJyk7XG5cbmZ1bmN0aW9uIEdhbGxlcnkoY29udGFpbmVyRWwsIGNvbmZpZykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHZpZXdwb3J0RWwsXG4gICAgICAgIGFsbEl0ZW1zRWwsXG4gICAgICAgIGl0ZW1FbHMsXG4gICAgICAgIHNlbGVjdGVkSXRlbUluZGV4LFxuICAgICAgICBzaG93bkl0ZW1JbmRleCxcbiAgICAgICAgZGVib3VuY2VPblJlc2l6ZSxcbiAgICAgICAgc2Nyb2xsZXIsXG4gICAgICAgIGRlYm91bmNlU2Nyb2xsLFxuICAgICAgICB0cmFuc2l0aW9uSW5Qcm9ncmVzcyA9IGZhbHNlLFxuICAgICAgICBwcmV2Q29udHJvbERpdixcbiAgICAgICAgbmV4dENvbnRyb2xEaXYsXG4gICAgICAgIHByb3BlcnR5QXR0cmlidXRlTWFwID0ge1xuICAgICAgICAgICAgY29tcG9uZW50OiBcImRhdGEtby1jb21wb25lbnRcIixcbiAgICAgICAgICAgIHZlcnNpb246IFwiZGF0YS1vLXZlcnNpb25cIixcbiAgICAgICAgICAgIHN5bmNJRDogXCJkYXRhLW8tZ2FsbGVyeS1zeW5jaWRcIixcbiAgICAgICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlOiBcImRhdGEtby1nYWxsZXJ5LW11bHRpcGxlaXRlbXNwZXJwYWdlXCIsXG4gICAgICAgICAgICB0b3VjaDogXCJkYXRhLW8tZ2FsbGVyeS10b3VjaFwiLFxuICAgICAgICAgICAgY2FwdGlvbnM6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbnNcIixcbiAgICAgICAgICAgIGNhcHRpb25NaW5IZWlnaHQ6IFwiZGF0YS1vLWdhbGxlcnktY2FwdGlvbm1pbmhlaWdodFwiLFxuICAgICAgICAgICAgY2FwdGlvbk1heEhlaWdodDogXCJkYXRhLW8tZ2FsbGVyeS1jYXB0aW9ubWF4aGVpZ2h0XCJcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdENvbmZpZyA9IHtcbiAgICAgICAgICAgIGNvbXBvbmVudDogXCJvLWdhbGxlcnlcIixcbiAgICAgICAgICAgIHZlcnNpb246IFwiMC4wLjBcIixcbiAgICAgICAgICAgIG11bHRpcGxlSXRlbXNQZXJQYWdlOiBmYWxzZSxcbiAgICAgICAgICAgIGNhcHRpb25zOiB0cnVlLFxuICAgICAgICAgICAgY2FwdGlvbk1pbkhlaWdodDogMjQsXG4gICAgICAgICAgICBjYXB0aW9uTWF4SGVpZ2h0OiA1MixcbiAgICAgICAgICAgIHRvdWNoOiBmYWxzZSxcbiAgICAgICAgICAgIHN5bmNJRDogXCJvLWdhbGxlcnktXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNEYXRhU291cmNlKCkge1xuICAgICAgICByZXR1cm4gKGNvbmZpZy5pdGVtcyAmJiBjb25maWcuaXRlbXMubGVuZ3RoID4gMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0V2lkdGhzKCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIGwsXG4gICAgICAgICAgICB0b3RhbFdpZHRoID0gMCxcbiAgICAgICAgICAgIGl0ZW1XaWR0aCA9IGNvbnRhaW5lckVsLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBpdGVtV2lkdGggPSBwYXJzZUludChpdGVtRWxzW3NlbGVjdGVkSXRlbUluZGV4XS5jbGllbnRXaWR0aCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBpdGVtRWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaXRlbUVsc1tpXS5zdHlsZS53aWR0aCA9IGl0ZW1XaWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggKz0gaXRlbVdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGFsbEl0ZW1zRWwuc3R5bGUud2lkdGggPSB0b3RhbFdpZHRoICsgXCJweFwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWRJdGVtKG4pIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgbiA9PT0gXCJudW1iZXJcIiAmJiBuID4gLTEgJiYgbiA8IGl0ZW1FbHMubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RlZEl0ZW0oKSB7XG4gICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSAwLCBjLCBsO1xuICAgICAgICBmb3IgKGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIGlmIChnYWxsZXJ5RE9NLmhhc0NsYXNzKGl0ZW1FbHNbY10sIFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKSkge1xuICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9IGM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkSXRlbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRVaUNvbnRyb2xzKCkge1xuICAgICAgICBwcmV2Q29udHJvbERpdiA9IGdhbGxlcnlET00uY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIlBSRVZcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1wcmV2XCIpO1xuICAgICAgICBuZXh0Q29udHJvbERpdiA9IGdhbGxlcnlET00uY3JlYXRlRWxlbWVudChcImRpdlwiLCBcIk5FWFRcIiwgXCJvLWdhbGxlcnlfX2NvbnRyb2wgby1nYWxsZXJ5X19jb250cm9sLS1uZXh0XCIpO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChwcmV2Q29udHJvbERpdik7XG4gICAgICAgIGNvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5leHRDb250cm9sRGl2KTtcbiAgICAgICAgcHJldkNvbnRyb2xEaXYuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHByZXYpO1xuICAgICAgICBuZXh0Q29udHJvbERpdi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgbmV4dCk7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgdmlld3BvcnRFbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgICAgIHZhciBjbGlja2VkSXRlbU51bSA9IGdhbGxlcnlET00uZ2V0RWxlbWVudEluZGV4KGdhbGxlcnlET00uZ2V0Q2xvc2VzdChldnQuc3JjRWxlbWVudCwgXCJvLWdhbGxlcnlfX2l0ZW1cIikpO1xuICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oY2xpY2tlZEl0ZW1OdW0sIHRydWUsIFwidXNlclwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0Q2FwdGlvblNpemVzKCkge1xuICAgICAgICBmb3IgKHZhciBjID0gMCwgbCA9IGl0ZW1FbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbUVsID0gaXRlbUVsc1tjXTtcbiAgICAgICAgICAgIGl0ZW1FbC5zdHlsZS5wYWRkaW5nQm90dG9tID0gY29uZmlnLmNhcHRpb25NaW5IZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB2YXIgY2FwdGlvbkVsID0gaXRlbUVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtX19jYXB0aW9uXCIpO1xuICAgICAgICAgICAgaWYgKGNhcHRpb25FbCkge1xuICAgICAgICAgICAgICAgIGNhcHRpb25FbC5zdHlsZS5taW5IZWlnaHQgPSBjb25maWcuY2FwdGlvbk1pbkhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgICAgICBjYXB0aW9uRWwuc3R5bGUubWF4SGVpZ2h0ID0gY29uZmlnLmNhcHRpb25NYXhIZWlnaHQgKyBcInB4XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRJdGVtQ29udGVudChuKSB7XG4gICAgICAgIHZhciBpdGVtTnVtcyA9IChuIGluc3RhbmNlb2YgQXJyYXkpID8gbiA6IFtuXTtcbiAgICAgICAgaWYgKGNvbmZpZy5pdGVtcykge1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtTnVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbU51bSA9IGl0ZW1OdW1zW2NdO1xuICAgICAgICAgICAgICAgIGlmIChpc1ZhbGlkSXRlbShpdGVtTnVtKSAmJiAhY29uZmlnLml0ZW1zW2l0ZW1OdW1dLmluc2VydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00uaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBjb25maWcuaXRlbXNbaXRlbU51bV0sIGl0ZW1FbHNbaXRlbU51bV0pO1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuaXRlbXNbaXRlbU51bV0uaW5zZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzZXRDYXB0aW9uU2l6ZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1dob2xlSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ID49IGwgJiYgaXRlbUVsc1tpdGVtTnVtXS5vZmZzZXRMZWZ0ICsgaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCA8PSByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQW55UGFydE9mSXRlbUluUGFnZVZpZXcoaXRlbU51bSwgbCwgcikge1xuICAgICAgICByZXR1cm4gKGl0ZW1FbHNbaXRlbU51bV0ub2Zmc2V0TGVmdCA+PSBsIC0gaXRlbUVsc1tpdGVtTnVtXS5jbGllbnRXaWR0aCAmJiBpdGVtRWxzW2l0ZW1OdW1dLm9mZnNldExlZnQgPD0gcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SXRlbXNJblBhZ2VWaWV3KGwsIHIsIHdob2xlKSB7XG4gICAgICAgIHZhciBpdGVtc0luVmlldyA9IFtdLFxuICAgICAgICAgICAgb25seVdob2xlID0gKHR5cGVvZiB3aG9sZSAhPT0gXCJib29sZWFuXCIpID8gdHJ1ZSA6IHdob2xlO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGl0ZW1FbHMubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgICAgIGlmICgob25seVdob2xlICYmIGlzV2hvbGVJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkgfHwgKCFvbmx5V2hvbGUgJiYgaXNBbnlQYXJ0T2ZJdGVtSW5QYWdlVmlldyhjLCBsLCByKSkpIHtcbiAgICAgICAgICAgICAgICBpdGVtc0luVmlldy5wdXNoKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpdGVtc0luVmlldztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkdhbGxlcnlDdXN0b21FdmVudChldnQpIHtcbiAgICAgICAgaWYgKGV2dC5zcmNFbGVtZW50ICE9PSBjb250YWluZXJFbCAmJiBldnQuZGV0YWlsLnN5bmNJRCA9PT0gY29uZmlnLnN5bmNJRCAmJiBldnQuZGV0YWlsLnNvdXJjZSA9PT0gXCJ1c2VyXCIpIHtcbiAgICAgICAgICAgIHNlbGVjdEl0ZW0oZXZ0LmRldGFpbC5pdGVtSUQsIHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuRm9yU3luY0V2ZW50cygpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmlnZ2VyRXZlbnQobmFtZSwgZGF0YSkge1xuICAgICAgICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgICAgICAgZGF0YS5zeW5jSUQgPSBjb25maWcuc3luY0lEO1xuICAgICAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQobmFtZSwge1xuICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgZGV0YWlsOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICBjb250YWluZXJFbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3ZlVmlld3BvcnQobGVmdCwgdHJhbnNpdGlvbikge1xuICAgICAgICBzY3JvbGxlci5zY3JvbGxUbyhsZWZ0LCAwLCB0cmFuc2l0aW9uICE9PSBmYWxzZSk7XG4gICAgICAgIGluc2VydEl0ZW1Db250ZW50KGdldEl0ZW1zSW5QYWdlVmlldyhsZWZ0LCBsZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbGlnbkl0ZW1MZWZ0KG4sIHRyYW5zaXRpb24pIHtcbiAgICAgICAgbW92ZVZpZXdwb3J0KGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCwgdHJhbnNpdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxpZ25JdGVtUmlnaHQobiwgdHJhbnNpdGlvbikge1xuICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCAtICh2aWV3cG9ydEVsLmNsaWVudFdpZHRoIC0gaXRlbUVsc1tuXS5jbGllbnRXaWR0aCk7XG4gICAgICAgIG1vdmVWaWV3cG9ydChuZXdTY3JvbGxMZWZ0LCB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBicmluZ0l0ZW1JbnRvVmlldyhuLCB0cmFuc2l0aW9uKSB7XG4gICAgICAgIGlmICghaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmlld3BvcnRMID0gc2Nyb2xsZXIuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIHZpZXdwb3J0UiA9IHZpZXdwb3J0TCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsXG4gICAgICAgICAgICBpdGVtTCA9IGl0ZW1FbHNbbl0ub2Zmc2V0TGVmdCxcbiAgICAgICAgICAgIGl0ZW1SID0gaXRlbUwgKyBpdGVtRWxzW25dLmNsaWVudFdpZHRoO1xuICAgICAgICBpZiAoaXRlbUwgPiB2aWV3cG9ydEwgJiYgaXRlbVIgPCB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXRlbUwgPCB2aWV3cG9ydEwpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobiwgdHJhbnNpdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbVIgPiB2aWV3cG9ydFIpIHtcbiAgICAgICAgICAgIGFsaWduSXRlbVJpZ2h0KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0l0ZW0obiwgdHJhbnNpdGlvbikge1xuICAgICAgICBpZiAoaXNWYWxpZEl0ZW0obikpIHtcbiAgICAgICAgICAgIGJyaW5nSXRlbUludG9WaWV3KG4sIHRyYW5zaXRpb24pO1xuICAgICAgICAgICAgc2hvd25JdGVtSW5kZXggPSBuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZJdGVtKCkge1xuICAgICAgICB2YXIgcHJldiA9IChzaG93bkl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzaG93bkl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNob3dJdGVtKHByZXYpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0SXRlbSgpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2hvd25JdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2hvd25JdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2hvd0l0ZW0obmV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd1ByZXZQYWdlKCkge1xuICAgICAgICBpZiAoc2Nyb2xsZXIuc2Nyb2xsTGVmdCA9PT0gMCkge1xuICAgICAgICAgICAgc2hvd0l0ZW0oaXRlbUVscy5sZW5ndGggLSAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmV2UGFnZVdob2xlSXRlbXMgPSBnZXRJdGVtc0luUGFnZVZpZXcoc2Nyb2xsZXIuc2Nyb2xsTGVmdCAtIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIHNjcm9sbGVyLnNjcm9sbExlZnQpLFxuICAgICAgICAgICAgICAgIHByZXZQYWdlSXRlbSA9IHByZXZQYWdlV2hvbGVJdGVtcy5wb3AoKSB8fCAwO1xuICAgICAgICAgICAgYWxpZ25JdGVtUmlnaHQocHJldlBhZ2VJdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3dOZXh0UGFnZSgpIHtcbiAgICAgICAgaWYgKHNjcm9sbGVyLnNjcm9sbExlZnQgPT09IGFsbEl0ZW1zRWwuY2xpZW50V2lkdGggLSB2aWV3cG9ydEVsLmNsaWVudFdpZHRoKSB7XG4gICAgICAgICAgICBzaG93SXRlbSgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50V2hvbGVJdGVtc0luVmlldyA9IGdldEl0ZW1zSW5QYWdlVmlldyhzY3JvbGxlci5zY3JvbGxMZWZ0LCBzY3JvbGxlci5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCksXG4gICAgICAgICAgICAgICAgbGFzdFdob2xlSXRlbUluVmlldyA9IGN1cnJlbnRXaG9sZUl0ZW1zSW5WaWV3LnBvcCgpIHx8IGl0ZW1FbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIGFsaWduSXRlbUxlZnQobGFzdFdob2xlSXRlbUluVmlldyArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VsZWN0SXRlbShuLCBzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IFwiYXBpXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzVmFsaWRJdGVtKG4pKSB7XG4gICAgICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgICAgIHNob3dJdGVtKG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG4gIT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBuO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gaXRlbUVscy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09IHNlbGVjdGVkSXRlbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKGl0ZW1FbHNbY10sIFwiby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbGxlcnlET00ucmVtb3ZlQ2xhc3MoaXRlbUVsc1tjXSwgXCJvLWdhbGxlcnlfX2l0ZW0tLXNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRyaWdnZXJFdmVudChcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbUlEOiBzZWxlY3RlZEl0ZW1JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbGVjdFByZXZJdGVtKHNob3csIHNvdXJjZSkge1xuICAgICAgICB2YXIgcHJldiA9IChzZWxlY3RlZEl0ZW1JbmRleCAtIDEgPj0gMCkgPyBzZWxlY3RlZEl0ZW1JbmRleCAtIDEgOiBpdGVtRWxzLmxlbmd0aCAtIDE7XG4gICAgICAgIHNlbGVjdEl0ZW0ocHJldiwgc2hvdywgc291cmNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWxlY3ROZXh0SXRlbShzaG93LCBzb3VyY2UpIHtcbiAgICAgICAgdmFyIG5leHQgPSAoc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDwgaXRlbUVscy5sZW5ndGgpID8gc2VsZWN0ZWRJdGVtSW5kZXggKyAxIDogMDtcbiAgICAgICAgc2VsZWN0SXRlbShuZXh0LCBzaG93LCBzb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uSW5Qcm9ncmVzcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcubXVsdGlwbGVJdGVtc1BlclBhZ2UpIHtcbiAgICAgICAgICAgIHNob3dQcmV2UGFnZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0UHJldkl0ZW0odHJ1ZSwgXCJ1c2VyXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgaWYgKHRyYW5zaXRpb25JblByb2dyZXNzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbmZpZy5tdWx0aXBsZUl0ZW1zUGVyUGFnZSkge1xuICAgICAgICAgICAgc2hvd05leHRQYWdlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3ROZXh0SXRlbSh0cnVlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgc2V0V2lkdGhzKCk7XG4gICAgICAgIGlmICghY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7IC8vIGNvcnJlY3QgdGhlIGFsaWdubWVudCBvZiBpdGVtIGluIHZpZXdcbiAgICAgICAgICAgIHNob3dJdGVtKHNob3duSXRlbUluZGV4LCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3U2Nyb2xsTGVmdCA9IHNjcm9sbGVyLnNjcm9sbExlZnQ7XG4gICAgICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcobmV3U2Nyb2xsTGVmdCwgbmV3U2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNpemVIYW5kbGVyKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoZGVib3VuY2VPblJlc2l6ZSk7XG4gICAgICAgIGRlYm91bmNlT25SZXNpemUgPSBzZXRUaW1lb3V0KG9uUmVzaXplLCA1MDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4dGVuZE9iamVjdHMob2Jqcykge1xuICAgICAgICB2YXIgbmV3T2JqID0ge307XG4gICAgICAgIGZvciAodmFyIGMgPSAwLCBsID0gb2Jqcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBvYmpzW2NdO1xuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld09ialtwcm9wXSA9IG9ialtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld09iajtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVEYXRhQXR0cmlidXRlcygpIHtcbiAgICAgICAgZ2FsbGVyeURPTS5zZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXMoY29udGFpbmVyRWwsIGNvbmZpZywgcHJvcGVydHlBdHRyaWJ1dGVNYXAsIFtcIml0ZW1zXCJdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRTeW5jSUQoaWQpIHtcbiAgICAgICAgY29uZmlnLnN5bmNJRCA9IGlkO1xuICAgICAgICB1cGRhdGVEYXRhQXR0cmlidXRlcygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFN5bmNJRCgpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5zeW5jSUQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3luY1dpdGgoZ2FsbGVyeUluc3RhbmNlKSB7XG4gICAgICAgIHNldFN5bmNJRChnYWxsZXJ5SW5zdGFuY2UuZ2V0U3luY0lEKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uU2Nyb2xsKGV2dCkge1xuICAgICAgICB0cmFuc2l0aW9uSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcoZXZ0LnNjcm9sbExlZnQsIGV2dC5zY3JvbGxMZWZ0ICsgdmlld3BvcnRFbC5jbGllbnRXaWR0aCwgZmFsc2UpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgICBwcmV2Q29udHJvbERpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHByZXZDb250cm9sRGl2KTtcbiAgICAgICAgbmV4dENvbnRyb2xEaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChuZXh0Q29udHJvbERpdik7XG4gICAgICAgIHNjcm9sbGVyLmRlc3Ryb3kodHJ1ZSk7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gcHJvcGVydHlBdHRyaWJ1dGVNYXApIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eUF0dHJpYnV0ZU1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lckVsLnJlbW92ZUF0dHJpYnV0ZShwcm9wZXJ0eUF0dHJpYnV0ZU1hcFtwcm9wXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm9HYWxsZXJ5SXRlbVNlbGVjdGVkXCIsIG9uR2FsbGVyeUN1c3RvbUV2ZW50KTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgcmVzaXplSGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKGlzRGF0YVNvdXJjZSgpKSB7XG4gICAgICAgIGdhbGxlcnlET00uZW1wdHlFbGVtZW50KGNvbnRhaW5lckVsKTtcbiAgICAgICAgZ2FsbGVyeURPTS5hZGRDbGFzcyhjb250YWluZXJFbCwgXCJvLWdhbGxlcnlcIik7XG4gICAgICAgIGFsbEl0ZW1zRWwgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zTGlzdChjb250YWluZXJFbCk7XG4gICAgICAgIGl0ZW1FbHMgPSBnYWxsZXJ5RE9NLmNyZWF0ZUl0ZW1zKGFsbEl0ZW1zRWwsIGNvbmZpZy5pdGVtcyk7XG4gICAgfVxuICAgIGNvbmZpZyA9IGV4dGVuZE9iamVjdHMoW2RlZmF1bHRDb25maWcsIGdhbGxlcnlET00uZ2V0UHJvcGVydGllc0Zyb21BdHRyaWJ1dGVzKGNvbnRhaW5lckVsLCBwcm9wZXJ0eUF0dHJpYnV0ZU1hcCksIGNvbmZpZ10pO1xuICAgIHVwZGF0ZURhdGFBdHRyaWJ1dGVzKCk7XG4gICAgYWxsSXRlbXNFbCA9IGNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICBpdGVtRWxzID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5vLWdhbGxlcnlfX2l0ZW1cIik7XG4gICAgc2VsZWN0ZWRJdGVtSW5kZXggPSBnZXRTZWxlY3RlZEl0ZW0oKTtcbiAgICBzaG93bkl0ZW1JbmRleCA9IHNlbGVjdGVkSXRlbUluZGV4O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHJlc2l6ZUhhbmRsZXIpO1xuICAgIGluc2VydEl0ZW1Db250ZW50KHNlbGVjdGVkSXRlbUluZGV4KTtcbiAgICBzZXRXaWR0aHMoKTtcbiAgICBzZXRDYXB0aW9uU2l6ZXMoKTtcbiAgICBzY3JvbGxlciA9IG5ldyBGVFNjcm9sbGVyKGNvbnRhaW5lckVsLCB7XG4gICAgICAgIHNjcm9sbGJhcnM6IGZhbHNlLFxuICAgICAgICBzY3JvbGxpbmdZOiBmYWxzZSxcbiAgICAgICAgdXBkYXRlT25XaW5kb3dSZXNpemU6IHRydWUsXG4gICAgICAgIHNuYXBwaW5nOiAhY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlLFxuICAgICAgICAvKiBDYW4ndCB1c2UgZmxpbmcvaW5lcnRpYWwgc2Nyb2xsIGFzIGFmdGVyIHVzZXIgaW5wdXQgaXMgZmluaXNoZWQgYW5kIHNjcm9sbCBjb250aW51ZXMsIHNjcm9sbCBldmVudHMgYXJlIG5vXG4gICAgICAgICBsb25nZXIgZmlyZWQsIGFuZCB2YWx1ZSBvZiBzY3JvbGxMZWZ0IGRvZXNuJ3QgY2hhbmdlIHVudGlsIHNjcm9sbGVuZC4gKi9cbiAgICAgICAgZmxpbmdpbmc6IGZhbHNlLFxuICAgICAgICBkaXNhYmxlSW5wdXRNZXRob2RzOiB7XG4gICAgICAgICAgICB0b3VjaDogIWNvbmZpZy50b3VjaFxuICAgICAgICB9XG4gICAgfSk7XG4gICAgc2Nyb2xsZXIuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbHN0YXJ0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0cmFuc2l0aW9uSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgfSk7XG4gICAgc2Nyb2xsZXIuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlYm91bmNlU2Nyb2xsKTtcbiAgICAgICAgZGVib3VuY2VTY3JvbGwgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG9uU2Nyb2xsKGV2dCk7XG4gICAgICAgIH0sIDUwKTtcbiAgICB9KTtcbiAgICBzY3JvbGxlci5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsZW5kXCIsIG9uU2Nyb2xsKTtcbiAgICBzY3JvbGxlci5hZGRFdmVudExpc3RlbmVyKFwic2VnbWVudHdpbGxjaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghY29uZmlnLm11bHRpcGxlSXRlbXNQZXJQYWdlKSB7XG4gICAgICAgICAgICBzZWxlY3RJdGVtKHNjcm9sbGVyLmN1cnJlbnRTZWdtZW50LngsIGZhbHNlLCBcInVzZXJcIik7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2aWV3cG9ydEVsID0gc2Nyb2xsZXIuY29udGVudENvbnRhaW5lck5vZGUucGFyZW50Tm9kZTtcbiAgICBnYWxsZXJ5RE9NLmFkZENsYXNzKHZpZXdwb3J0RWwsIFwiby1nYWxsZXJ5X192aWV3cG9ydFwiKTtcbiAgICBpbnNlcnRJdGVtQ29udGVudChnZXRJdGVtc0luUGFnZVZpZXcoc2Nyb2xsZXIuc2Nyb2xsTGVmdCwgc2Nyb2xsZXIuc2Nyb2xsTGVmdCArIHZpZXdwb3J0RWwuY2xpZW50V2lkdGgsIGZhbHNlKSk7XG4gICAgc2hvd0l0ZW0oc2VsZWN0ZWRJdGVtSW5kZXgsIGZhbHNlKTtcbiAgICBhZGRVaUNvbnRyb2xzKCk7XG4gICAgbGlzdGVuRm9yU3luY0V2ZW50cygpO1xuXG4gICAgdGhpcy5zaG93SXRlbSA9IHNob3dJdGVtO1xuICAgIHRoaXMuZ2V0U2VsZWN0ZWRJdGVtID0gZ2V0U2VsZWN0ZWRJdGVtO1xuICAgIHRoaXMuc2hvd1ByZXZJdGVtID0gc2hvd1ByZXZJdGVtO1xuICAgIHRoaXMuc2hvd05leHRJdGVtID0gc2hvd05leHRJdGVtO1xuICAgIHRoaXMuc2hvd1ByZXZQYWdlID0gc2hvd1ByZXZQYWdlO1xuICAgIHRoaXMuc2hvd05leHRQYWdlID0gc2hvd05leHRQYWdlO1xuICAgIHRoaXMuc2VsZWN0SXRlbSA9IHNlbGVjdEl0ZW07XG4gICAgdGhpcy5zZWxlY3RQcmV2SXRlbSA9IHNlbGVjdFByZXZJdGVtO1xuICAgIHRoaXMuc2VsZWN0TmV4dEl0ZW0gPSBzZWxlY3ROZXh0SXRlbTtcbiAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIHRoaXMucHJldiA9IHByZXY7XG4gICAgdGhpcy5nZXRTeW5jSUQgPSBnZXRTeW5jSUQ7XG4gICAgdGhpcy5zeW5jV2l0aCA9IHN5bmNXaXRoO1xuICAgIHRoaXMuZGVzdHJveSA9IGRlc3Ryb3k7XG5cbiAgICB0cmlnZ2VyRXZlbnQoXCJvR2FsbGVyeVJlYWR5XCIsIHtcbiAgICAgICAgZ2FsbGVyeTogdGhpc1xuICAgIH0pO1xuXG59XG5cbkdhbGxlcnkuY3JlYXRlQWxsSW4gPSBmdW5jdGlvbihlbCwgY29uZmlnKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIGNvbmYgPSBjb25maWcgfHwge30sXG4gICAgICAgIGdFbHMgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtby1jb21wb25lbnQ9by1nYWxsZXJ5XVwiKSxcbiAgICAgICAgZ2FsbGVyaWVzID0gW107XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBnRWxzLmxlbmd0aDsgYyA8IGw7IGMrKykge1xuICAgICAgICBnYWxsZXJpZXMucHVzaChuZXcgR2FsbGVyeShnRWxzW2NdLCBjb25mKSk7XG4gICAgfVxuICAgIHJldHVybiBnYWxsZXJpZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdhbGxlcnk7IiwiLypnbG9iYWwgbW9kdWxlKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGVtcHR5RWxlbWVudCh0YXJnZXRFbCkge1xuICAgIHdoaWxlICh0YXJnZXRFbC5maXJzdENoaWxkKSB7XG4gICAgICAgIHRhcmdldEVsLnJlbW92ZUNoaWxkKHRhcmdldEVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudChub2RlTmFtZSwgY29udGVudCwgY2xhc3Nlcykge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobm9kZU5hbWUpO1xuICAgIGVsLmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgY2xhc3Nlcyk7XG4gICAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBoYXNDbGFzcyhlbCwgYykge1xuICAgIHJldHVybiAoJyAnICsgZWwuY2xhc3NOYW1lICsgJyAnKS5pbmRleE9mKCcgJyArIGMgKyAnICcpID4gLTE7XG59XG5cbmZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjKSB7XG4gICAgaWYgKCFoYXNDbGFzcyhlbCwgYykpIHtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lICsgXCIgXCIgKyBjO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoZWwsIGMpIHtcbiAgICBpZiAoaGFzQ2xhc3MoZWwsIGMpKSB7XG4gICAgICAgIHZhciByZWcgPSBuZXcgUmVnRXhwKCcoXFxcXHN8XiknICsgYyArICcoXFxcXHN8JCknKTtcbiAgICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UocmVnLCcgJyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVJdGVtc0xpc3QoY29udGFpbmVyRWwpIHtcbiAgICB2YXIgaXRlbXNMaXN0ID0gY3JlYXRlRWxlbWVudChcIm9sXCIsIFwiXCIsIFwiby1nYWxsZXJ5X19pdGVtc1wiKTtcbiAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChpdGVtc0xpc3QpO1xuICAgIHJldHVybiBpdGVtc0xpc3Q7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUl0ZW1zKGNvbnRhaW5lckVsLCBpdGVtcykge1xuICAgIHZhciBpdGVtQ2xhc3M7XG4gICAgZm9yICh2YXIgYyA9IDAsIGwgPSBpdGVtcy5sZW5ndGg7IGMgPCBsOyBjKyspIHtcbiAgICAgICAgaXRlbUNsYXNzID0gXCJvLWdhbGxlcnlfX2l0ZW1cIiArICgoaXRlbXNbY10uc2VsZWN0ZWQpID8gXCIgby1nYWxsZXJ5X19pdGVtLS1zZWxlY3RlZFwiIDogXCJcIiApO1xuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChjcmVhdGVFbGVtZW50KFwibGlcIiwgXCImbmJzcDtcIiwgaXRlbUNsYXNzKSk7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm8tZ2FsbGVyeV9faXRlbVwiKTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0SXRlbUNvbnRlbnQoY29uZmlnLCBpdGVtLCBpdGVtRWwpIHtcbiAgICBlbXB0eUVsZW1lbnQoaXRlbUVsKTtcbiAgICB2YXIgY29udGVudEVsID0gY3JlYXRlRWxlbWVudChcImRpdlwiLCBpdGVtLml0ZW1Db250ZW50LCBcIm8tZ2FsbGVyeV9faXRlbV9fY29udGVudFwiKTtcbiAgICBpdGVtRWwuYXBwZW5kQ2hpbGQoY29udGVudEVsKTtcbiAgICBpZiAoY29uZmlnLmNhcHRpb25zKSB7XG4gICAgICAgIHZhciBjYXB0aW9uRWwgPSBjcmVhdGVFbGVtZW50KFwiZGl2XCIsIGl0ZW0uaXRlbUNhcHRpb24gfHwgXCJcIiwgXCJvLWdhbGxlcnlfX2l0ZW1fX2NhcHRpb25cIik7XG4gICAgICAgIGl0ZW1FbC5hcHBlbmRDaGlsZChjYXB0aW9uRWwpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3BOYW1lLCBlbCwgYXR0ck5hbWUpIHtcbiAgICB2YXIgdiA9IGVsLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgaWYgKHYgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKHYgPT09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICB2ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2ID09PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgIHYgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBvYmpbcHJvcE5hbWVdID0gdjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlcyhlbCwgbWFwKSB7XG4gICAgdmFyIG9iaiA9IHt9LFxuICAgICAgICBwcm9wO1xuICAgIGZvciAocHJvcCBpbiBtYXApIHtcbiAgICAgICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHlJZkF0dHJpYnV0ZUV4aXN0cyhvYmosIHByb3AsIGVsLCBtYXBbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyhlbCwgb2JqLCBtYXAsIGV4Y2wpIHtcbiAgICB2YXIgZXhjbHVkZSA9IGV4Y2wgfHwgW107XG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSAmJiBleGNsdWRlLmluZGV4T2YocHJvcCkgPCAwKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobWFwW3Byb3BdLCBvYmpbcHJvcF0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRDbG9zZXN0KGVsLCBjKSB7XG4gICAgd2hpbGUgKCFoYXNDbGFzcyhlbCwgYykpIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRJbmRleChlbCkge1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoZWwgPSBlbC5wcmV2aW91c1NpYmxpbmcpIHtcbiAgICAgICAgaWYgKGVsLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgICAgICArK2k7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGVtcHR5RWxlbWVudDogZW1wdHlFbGVtZW50LFxuICAgIGNyZWF0ZUVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnQsXG4gICAgaGFzQ2xhc3M6IGhhc0NsYXNzLFxuICAgIGFkZENsYXNzOiBhZGRDbGFzcyxcbiAgICByZW1vdmVDbGFzczogcmVtb3ZlQ2xhc3MsXG4gICAgY3JlYXRlSXRlbXNMaXN0OiBjcmVhdGVJdGVtc0xpc3QsXG4gICAgY3JlYXRlSXRlbXM6IGNyZWF0ZUl0ZW1zLFxuICAgIGluc2VydEl0ZW1Db250ZW50OiBpbnNlcnRJdGVtQ29udGVudCxcbiAgICBzZXRBdHRyaWJ1dGVzRnJvbVByb3BlcnRpZXM6IHNldEF0dHJpYnV0ZXNGcm9tUHJvcGVydGllcyxcbiAgICBnZXRQcm9wZXJ0aWVzRnJvbUF0dHJpYnV0ZXM6IGdldFByb3BlcnRpZXNGcm9tQXR0cmlidXRlcyxcbiAgICBnZXRDbG9zZXN0OiBnZXRDbG9zZXN0LFxuICAgIGdldEVsZW1lbnRJbmRleDogZ2V0RWxlbWVudEluZGV4XG59OyJdfQ==
