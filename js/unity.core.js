//
// Optiscroll
//

;(function ( window, document, Math, undefined ) {
  'use strict';



/**
 * Optiscroll, use this to create instances
 * ```
 * var scrolltime = new Optiscroll(element);
 * ```
 */
var Optiscroll = function Optiscroll(element, options) {
  return new Optiscroll.Instance(element, options || {});
};



var GS = Optiscroll.globalSettings = {
  scrollMinUpdateInterval: 1000 / 40, // 40 FPS
  checkFrequency: 1000,
  pauseCheck: false,
};

Optiscroll.defaults = {
  preventParentScroll: false,
  forceScrollbars: false,
  scrollStopDelay: 300,
  maxTrackSize: 95,
  minTrackSize: 5,
  draggableTracks: true,
  autoUpdate: true,
  classPrefix: 'optiscroll-',
  wrapContent: true,
  rtl: false,
};



Optiscroll.Instance = function (element, options) {
  // instance variables
  this.element = element;
  this.settings = _extend(_extend({}, Optiscroll.defaults), options || {});
  if (typeof options.rtl !== 'boolean') {
    this.settings.rtl = window.getComputedStyle(element).direction === 'rtl';
  }
  this.cache = {};

  this.init();
};



Optiscroll.Instance.prototype = {


  init: function () {
    var element = this.element,
        settings = this.settings,
        shouldCreateScrollbars = false;

    var scrollEl = this.scrollEl = settings.wrapContent
      ? Utils.createWrapper(element)
      : element.firstElementChild;

    toggleClass(scrollEl, settings.classPrefix + 'content', true);
    toggleClass(element, 'is-enabled' + (settings.rtl ? ' is-rtl' : ''), true);

    // initialize scrollbars
    this.scrollbars = {
      v: Scrollbar('v', this),
      h: Scrollbar('h', this),
    };

    // create DOM scrollbars only if they have size or if it's forced
    if(G.scrollbarSpec.width || settings.forceScrollbars) {
      shouldCreateScrollbars = Utils.hideNativeScrollbars(scrollEl, settings.rtl);
    }

    if(shouldCreateScrollbars) {
      _invoke(this.scrollbars, 'create');
    }

    if(G.isTouch && settings.preventParentScroll) {
      toggleClass(element, settings.classPrefix + 'prevent', true);
    }

    // calculate scrollbars
    this.update();

    // bind container events
    this.bind();

    // add instance to global array for timed check
    if(settings.autoUpdate) {
      G.instances.push(this);
    }

    // start the timed check if it is not already running
    if(settings.autoUpdate && !G.checkTimer) {
      Utils.checkLoop();
    }

  },



  bind: function () {
    var listeners = this.listeners = {},
        scrollEl = this.scrollEl;

    // scroll event binding
    listeners.scroll = _throttle(Events.scroll.bind(this), GS.scrollMinUpdateInterval);

    if(G.isTouch) {
      listeners.touchstart = Events.touchstart.bind(this);
      listeners.touchend = Events.touchend.bind(this);
    }

    // Safari does not support wheel event
    listeners.mousewheel = listeners.wheel = Events.wheel.bind(this);

    for (var ev in listeners) {
      scrollEl.addEventListener(ev, listeners[ev], G.passiveEvent);
    }

  },




  update: function () {
    var scrollEl = this.scrollEl,
        cache = this.cache,
        oldcH = cache.clientH,
        sH = scrollEl.scrollHeight,
        cH = scrollEl.clientHeight,
        sW = scrollEl.scrollWidth,
        cW = scrollEl.clientWidth;

    if(sH !== cache.scrollH || cH !== cache.clientH ||
      sW !== cache.scrollW || cW !== cache.clientW) {

      cache.scrollH = sH;
      cache.clientH = cH;
      cache.scrollW = sW;
      cache.clientW = cW;

      // only fire if cache was defined
      if(oldcH !== undefined) {

        // if the element is no more in the DOM
        if(sH === 0 && cH === 0 && !document.body.contains(this.element)) {
          this.destroy();
          return false;
        }

        this.fireCustomEvent('sizechange');
      }

      // this will update the scrollbar
      // and check if bottom is reached
      _invoke(this.scrollbars, 'update');
    }
  },




  /**
   * Animate scrollTo
   */
  scrollTo: function (destX, destY, duration) {
    var cache = this.cache,
        startX, startY, endX, endY;

    G.pauseCheck = true;
    // force update
    this.update();

    startX = this.scrollEl.scrollLeft;
    startY = this.scrollEl.scrollTop;

    endX = +destX;
    if(destX === 'left') { endX = 0; }
    if(destX === 'right') { endX = cache.scrollW - cache.clientW; }
    if(destX === false) { endX = startX; }

    endY = +destY;
    if(destY === 'top') { endY = 0; }
    if(destY === 'bottom') { endY = cache.scrollH - cache.clientH; }
    if(destY === false) { endY = startY; }

    // animate
    this.animateScroll(startX, endX, startY, endY, +duration);

  },



  scrollIntoView: function (elem, duration, delta) {
    var scrollEl = this.scrollEl,
        eDim, sDim,
        leftEdge, topEdge, rightEdge, bottomEdge,
        offsetX, offsetY,
        startX, startY, endX, endY;

    G.pauseCheck = true;
    // force update
    this.update();

    if(typeof elem === 'string') { // selector
      elem = scrollEl.querySelector(elem);
    } else if(elem.length && elem.jquery) { // jquery element
      elem = elem[0];
    }

    if(typeof delta === 'number') { // same delta for all
      delta = { top: delta, right: delta, bottom: delta, left: delta };
    }

    delta = delta || {};
    eDim = elem.getBoundingClientRect();
    sDim = scrollEl.getBoundingClientRect();

    startX = endX = scrollEl.scrollLeft;
    startY = endY = scrollEl.scrollTop;
    offsetX = startX + eDim.left - sDim.left;
    offsetY = startY + eDim.top - sDim.top;

    leftEdge = offsetX - (delta.left || 0);
    topEdge = offsetY - (delta.top || 0);
    rightEdge = offsetX + eDim.width - this.cache.clientW + (delta.right || 0);
    bottomEdge = offsetY + eDim.height - this.cache.clientH + (delta.bottom || 0);

    if(leftEdge < startX) { endX = leftEdge; }
    if(rightEdge > startX) { endX = rightEdge; }

    if(topEdge < startY) { endY = topEdge; }
    if(bottomEdge > startY) { endY = bottomEdge; }

    // animate
    this.animateScroll(startX, endX, startY, endY, +duration);
  },




  animateScroll: function (startX, endX, startY, endY, duration) {
    var self = this,
        scrollEl = this.scrollEl,
        startTime = Date.now();

    if(endX === startX && endY === startY) {
      return;
    }

    if(duration === 0) {
      scrollEl.scrollLeft = endX;
      scrollEl.scrollTop = endY;
      return;
    }

    if(isNaN(duration)) { // undefined or auto
      // 500px in 430ms, 1000px in 625ms, 2000px in 910ms
      duration = Math.pow(Math.max(Math.abs(endX - startX), Math.abs(endY - startY)), 0.54) * 15;
    }

    (function animate () {
      var time = Math.min(1, ((Date.now() - startTime) / duration)),
          easedTime = Utils.easingFunction(time);

      if(endY !== startY) {
        scrollEl.scrollTop = ~~(easedTime * (endY - startY)) + startY;
      }
      if(endX !== startX) {
        scrollEl.scrollLeft = ~~(easedTime * (endX - startX)) + startX;
      }

      self.scrollAnimation = time < 1 ? window.requestAnimationFrame(animate) : null;
    }());
  },




  destroy: function () {
    var self = this,
        element = this.element,
        scrollEl = this.scrollEl,
        listeners = this.listeners,
        child;

    if(!this.scrollEl) { return; }

    // unbind events
    for (var ev in listeners) {
      scrollEl.removeEventListener(ev, listeners[ev]);
    }

    // remove scrollbars elements
    _invoke(this.scrollbars, 'remove');

    // unwrap content
    if (!this.settings.contentElement) {
      while(child = scrollEl.childNodes[0]) {
        element.insertBefore(child, scrollEl);
      }
      element.removeChild(scrollEl);
      this.scrollEl = null;
    }

    // remove classes
    toggleClass(element, this.settings.classPrefix + 'prevent', false);
    toggleClass(element, 'is-enabled', false);

    // defer instance removal from global array
    // to not affect checkLoop _invoke
    window.requestAnimationFrame(function () {
      var index = G.instances.indexOf(self);
      if (index > -1) {
        G.instances.splice(index, 1);
      }
    });
  },




  fireCustomEvent: function (eventName) {
    var cache = this.cache,
        sH = cache.scrollH, sW = cache.scrollW,
        eventData;

    eventData = {
      // scrollbars data
      scrollbarV: _extend({}, cache.v),
      scrollbarH: _extend({}, cache.h),

      // scroll position
      scrollTop: cache.v.position * sH,
      scrollLeft: cache.h.position * sW,
      scrollBottom: (1 - cache.v.position - cache.v.size) * sH,
      scrollRight: (1 - cache.h.position - cache.h.size) * sW,

      // element size
      scrollWidth: sW,
      scrollHeight: sH,
      clientWidth: cache.clientW,
      clientHeight: cache.clientH,
    };

    var event;
    if (typeof CustomEvent === 'function') {
      event = new CustomEvent(eventName, { detail: eventData });
    } else { // IE does not support CustomEvent
      event = document.createEvent('CustomEvent');
      event.initCustomEvent(eventName, false, false, eventData);
    }
    this.element.dispatchEvent(event);
  },

};




var Events = {

  scroll: function (ev) {

    if (!G.pauseCheck) {
      this.fireCustomEvent('scrollstart');
    }
    G.pauseCheck = true;

    this.scrollbars.v.update();
    this.scrollbars.h.update();

    this.fireCustomEvent('scroll');

    clearTimeout(this.cache.timerStop);
    this.cache.timerStop = setTimeout(Events.scrollStop.bind(this), this.settings.scrollStopDelay);
  },


  touchstart: function (ev) {
    G.pauseCheck = false;
    this.scrollbars.v.update();
    this.scrollbars.h.update();

    Events.wheel.call(this, ev);
  },


  touchend: function (ev) {
    // prevents touchmove generate scroll event to call
    // scrollstop  while the page is still momentum scrolling
    clearTimeout(this.cache.timerStop);
  },


  scrollStop: function () {
    this.fireCustomEvent('scrollstop');
    G.pauseCheck = false;
  },


  wheel: function (ev) {
    var cache = this.cache,
        cacheV = cache.v,
        cacheH = cache.h,
        preventScroll = this.settings.preventParentScroll && G.isTouch;

    window.cancelAnimationFrame(this.scrollAnimation);

    if(preventScroll && cacheV.enabled && cacheV.percent % 100 === 0) {
      this.scrollEl.scrollTop = cacheV.percent ? (cache.scrollH - cache.clientH - 1) : 1;
    }
    if(preventScroll && cacheH.enabled && cacheH.percent % 100 === 0) {
      this.scrollEl.scrollLeft = cacheH.percent ? (cache.scrollW - cache.clientW - 1) : 1;
    }
  },


};


var Scrollbar = function (which, instance) {

  var isVertical = (which === 'v'),
      parentEl = instance.element,
      scrollEl = instance.scrollEl,
      settings = instance.settings,
      cache = instance.cache,
      scrollbarCache = cache[which] = {},

      sizeProp = isVertical ? 'H' : 'W',
      clientSize = 'client' + sizeProp,
      scrollSize = 'scroll' + sizeProp,
      scrollProp = isVertical ? 'scrollTop' : 'scrollLeft',
      evSuffixes = isVertical ? ['top','bottom'] : ['left','right'],
      evTypesMatcher = /^(mouse|touch|pointer)/,

      rtlMode = G.scrollbarSpec.rtl,
      enabled = false,
      scrollbarEl = null,
      trackEl = null;

  var events = {
    dragData: null,

    dragStart: function (ev) {
      ev.preventDefault();
      var evData = ev.touches ? ev.touches[0] : ev;
      events.dragData = { x: evData.pageX, y: evData.pageY, scroll: scrollEl[scrollProp] };
      events.bind(true, ev.type.match(evTypesMatcher)[1]);
    },

    dragMove: function (ev) {
      var evData = ev.touches ? ev.touches[0] : ev,
          dragMode = settings.rtl && rtlMode === 1 && !isVertical ? -1 : 1,
          delta, deltaRatio;

      ev.preventDefault();
      delta = isVertical ? evData.pageY - events.dragData.y : evData.pageX - events.dragData.x;
      deltaRatio = delta / cache[clientSize];

      scrollEl[scrollProp] = events.dragData.scroll + deltaRatio * cache[scrollSize] * dragMode;
    },

    dragEnd: function (ev) {
      events.dragData = null;
      events.bind(false, ev.type.match(evTypesMatcher)[1]);
    },

    bind: function (on, type) {
      var method = (on ? 'add' : 'remove') + 'EventListener',
          moveEv = type + 'move',
          upEv = type + (type === 'touch' ? 'end' : 'up');

      document[method](moveEv, events.dragMove);
      document[method](upEv, events.dragEnd);
      document[method](type + 'cancel', events.dragEnd);
    },

  };

  return {


    toggle: function (bool) {
      enabled = bool;

      if(trackEl) {
        toggleClass(parentEl, 'has-' + which + 'track', enabled);
      }

      // expose enabled
      scrollbarCache.enabled = enabled;
    },


    create: function () {
      scrollbarEl = document.createElement('div');
      trackEl = document.createElement('b');

      scrollbarEl.className = settings.classPrefix + which;
      trackEl.className = settings.classPrefix + which + 'track';
      scrollbarEl.appendChild(trackEl);
      parentEl.appendChild(scrollbarEl);

      if(settings.draggableTracks) {
        var evTypes = window.PointerEvent ? ['pointerdown'] : ['touchstart', 'mousedown'];
        evTypes.forEach(function (evType) {
          trackEl.addEventListener(evType, events.dragStart);
        });
      }
    },


    update: function () {
      var newSize, oldSize,
          newDim, newRelPos, deltaPos;

      // if scrollbar is disabled and no scroll
      if(!enabled && cache[clientSize] === cache[scrollSize]) {
        return;
      }

      newDim = this.calc();
      newSize = newDim.size;
      oldSize = scrollbarCache.size;
      newRelPos = (1 / newSize) * newDim.position * 100;
      deltaPos = Math.abs(newDim.position - (scrollbarCache.position || 0)) * cache[clientSize];

      if(newSize === 1 && enabled) {
        this.toggle(false);
      }

      if(newSize < 1 && !enabled) {
        this.toggle(true);
      }

      if(trackEl && enabled) {
        this.style(newRelPos, deltaPos, newSize, oldSize);
      }

      // update cache values
      scrollbarCache = _extend(scrollbarCache, newDim);

      if(enabled) {
        this.fireEdgeEv();
      }

    },


    style: function (newRelPos, deltaPos, newSize, oldSize) {
      if(newSize !== oldSize) {
        trackEl.style[ isVertical ? 'height' : 'width' ] = newSize * 100 + '%';
        if (settings.rtl && !isVertical) {
          trackEl.style.marginRight = (1 - newSize) * 100 + '%';
        }
      }
      trackEl.style[G.cssTransform] = 'translate(' +
        (isVertical ? '0%,' + newRelPos + '%' : newRelPos + '%' + ',0%')
        + ')';
    },


    calc: function () {
      var position = scrollEl[scrollProp],
          viewS = cache[clientSize],
          scrollS = cache[scrollSize],
          sizeRatio = viewS / scrollS,
          sizeDiff = scrollS - viewS,
          positionRatio, percent;

      if(sizeRatio >= 1 || !scrollS) { // no scrollbars needed
        return { position: 0, size: 1, percent: 0 };
      }
      if (!isVertical && settings.rtl && rtlMode) {
        position = sizeDiff - position * rtlMode;
      }

      percent = 100 * position / sizeDiff;

      // prevent overscroll effetcs (negative percent)
      // and keep 1px tolerance near the edges
      if(position <= 1) { percent = 0; }
      if(position >= sizeDiff - 1) { percent = 100; }

      // Capped size based on min/max track percentage
      sizeRatio = Math.max(sizeRatio, settings.minTrackSize / 100);
      sizeRatio = Math.min(sizeRatio, settings.maxTrackSize / 100);

      positionRatio = (1 - sizeRatio) * (percent / 100);

      return { position: positionRatio, size: sizeRatio, percent: percent };
    },


    fireEdgeEv: function () {
      var percent = scrollbarCache.percent;

      if(scrollbarCache.was !== percent && percent % 100 === 0) {
        instance.fireCustomEvent('scrollreachedge');
        instance.fireCustomEvent('scrollreach' + evSuffixes[percent / 100]);
      }

      scrollbarCache.was = percent;
    },


    remove: function () {
      // remove parent custom classes
      this.toggle(false);
      // remove elements
      if(scrollbarEl) {
        scrollbarEl.parentNode.removeChild(scrollbarEl);
        scrollbarEl = null;
      }
    },

  };

};


var Utils = {

  hideNativeScrollbars: function (scrollEl, isRtl) {
    var size = G.scrollbarSpec.width,
        scrollElStyle = scrollEl.style;
    if(size === 0) {
      // hide Webkit/touch scrollbars
      var time = Date.now();
      scrollEl.setAttribute('data-scroll', time);
      return Utils.addCssRule('[data-scroll="' + time + '"]::-webkit-scrollbar', 'display:none;width:0;height:0;');
    } else {
      scrollElStyle[isRtl ? 'left' : 'right'] = -size + 'px';
      scrollElStyle.bottom = -size + 'px';
      return true;
    }
  },


  addCssRule: function (selector, rules) {
    var styleSheet = document.getElementById('scroll-sheet');
    if(!styleSheet) {
      styleSheet = document.createElement('style');
      styleSheet.id = 'scroll-sheet';
      styleSheet.appendChild(document.createTextNode('')); // WebKit hack
      document.head.appendChild(styleSheet);
    }
    try {
      styleSheet.sheet.insertRule(selector + ' {' + rules + '}', 0);
      return true;
    } catch (e) { return; }
  },


  createWrapper: function (element, className) {
    var wrapper = document.createElement('div'),
        child;
    while(child = element.childNodes[0]) {
      wrapper.appendChild(child);
    }
    return element.appendChild(wrapper);
  },


  // Global height checker
  // looped to listen element changes
  checkLoop: function () {

    if(!G.instances.length) {
      G.checkTimer = null;
      return;
    }

    if(!G.pauseCheck) { // check size only if not scrolling
      _invoke(G.instances, 'update');
    }

    if(GS.checkFrequency) {
      G.checkTimer = setTimeout(function () {
        Utils.checkLoop();
      }, GS.checkFrequency);
    }
  },


  // easeOutCubic function
  easingFunction: function (t) {
    return (--t) * t * t + 1;
  },


};



// Global variables
var G = Optiscroll.G = {
  isTouch: 'ontouchstart' in window,
  cssTransition: cssTest('transition'),
  cssTransform: cssTest('transform'),
  scrollbarSpec: getScrollbarSpec(),
  passiveEvent: getPassiveSupport(),

  instances: [],
  checkTimer: null,
  pauseCheck: false,
};


// Get scrollbars width, thanks Google Closure Library
function getScrollbarSpec () {
  var htmlEl = document.documentElement,
      outerEl, innerEl, width = 0, rtl = 1; // IE is reverse

  outerEl = document.createElement('div');
  outerEl.style.cssText = 'overflow:scroll;width:50px;height:50px;position:absolute;left:-100px;direction:rtl';

  innerEl = document.createElement('div');
  innerEl.style.cssText = 'width:100px;height:100px';

  outerEl.appendChild(innerEl);
  htmlEl.appendChild(outerEl);
  width = outerEl.offsetWidth - outerEl.clientWidth;
  if (outerEl.scrollLeft > 0) {
    rtl = 0; // webkit is default
  } else {
    outerEl.scrollLeft = 1;
    if (outerEl.scrollLeft === 0) {
      rtl = -1; // firefox is negative
    }
  }
  htmlEl.removeChild(outerEl);

  return { width: width, rtl: rtl };
}


function getPassiveSupport () {
  var passive = false;
  var options = Object.defineProperty({}, 'passive', {
    get: function () { passive = true; },
  });
  window.addEventListener('test', null, options);
  return passive ? { capture: false, passive: true } : false;
}


// Detect css3 support, thanks Modernizr
function cssTest (prop) {
  var ucProp = prop.charAt(0).toUpperCase() + prop.slice(1),
      el = document.createElement('test'),
      props = [prop, 'Webkit' + ucProp];

  for (var i in props) {
    if(el.style[props[i]] !== undefined) { return props[i]; }
  }
  return '';
}



function toggleClass (el, value, bool) {
  var classes = el.className.split(/\s+/),
      index = classes.indexOf(value);

  if(bool) {
    ~index || classes.push(value);
  } else {
    ~index && classes.splice(index, 1);
  }

  el.className = classes.join(' ');
}




function _extend (dest, src, merge) {
  for(var key in src) {
    if(!src.hasOwnProperty(key) || dest[key] !== undefined && merge) {
      continue;
    }
    dest[key] = src[key];
  }
  return dest;
}


function _invoke (collection, fn, args) {
  var i, j;
  if(collection.length) {
    for(i = 0, j = collection.length; i < j; i++) {
      collection[i][fn].apply(collection[i], args);
    }
  } else {
    for (i in collection) {
      collection[i][fn].apply(collection[i], args);
    }
  }
}

function _throttle(fn, threshhold) {
  var last, deferTimer;
  return function () {
    var context = this,
        now = Date.now(),
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}



  // AMD export
  if(typeof define == 'function' && define.amd) {
    define(function(){
      return Optiscroll;
    });
  }

  // commonjs export
  if(typeof module !== 'undefined' && module.exports) {
    module.exports = Optiscroll;
  }

  window.Optiscroll = Optiscroll;

})(window, document, Math);


/**
 * jQuery plugin
 * create instance of Optiscroll
 * and when called again you can call functions
 * or change instance settings
 *
 * ```
 * $(el).optiscroll({ options })
 * $(el).optiscroll('method', arg)
 * ```
 */

(function ($) {

  var pluginName = 'optiscroll';

  $.fn[pluginName] = function(options) {
    var method, args;

    if(typeof options === 'string') {
      args = Array.prototype.slice.call(arguments);
      method = args.shift();
    }

    return this.each(function() {
      var $el = $(this);
      var inst = $el.data(pluginName);

      // start new optiscroll instance
      if(!inst) {
        inst = new window.Optiscroll(this, options || {});
        $el.data(pluginName, inst);
      }
      // allow exec method on instance
      else if(inst && typeof method === 'string') {
        inst[method].apply(inst, args);
        if(method === 'destroy') {
          $el.removeData(pluginName);
        }
      }
    });
  };

}(jQuery || Zepto));

//
// Notifications
//

(function($) {

    $.notify = function(options) {

        // Default settings
        // [string] type: success, info, warning & danger. Default is default.
        var settings = $.extend({
            type: 'default',
            iconClass: null,
            header: null,
            message: null,
            delay: 5000, // 5 seconds
            sticky: false,
            wrapperWidth: 320,
            container: 'body'
        }, options);

        // Loop through and return
        //return this.each( function() {

            // Variables
            var markup,
                iconMarkup,
                headerMarkup,
                messageMarkup,
                closeButton,
                formatType;

            // Include an icon if the icon class is set
            if(settings.iconClass) {
                iconMarkup = '<div class="alert-icon"><i class="' + settings.iconClass + '"></i></div>';
            }else{
                iconMarkup = '';
            }

            // Include the header if the headerText is set
            if(settings.header) {
                headerMarkup = '<h6>' + settings.header + '</h6>';
            }else{
                headerMarkup = '';
            }

            // Include the message if is set
            if(settings.message) {
                messageMarkup = '<p>' + settings.message + '</p>';
            }else{
                messageMarkup = 'Error: Message not defined.';
            }

            // Include the close button if sticky is set to TRUE
            if(settings.sticky) {

                closeButton = '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';

                // Increase delay time if sticky is set to TRUE
                settings.delay = 300000; // 5 minutes

            }else{
                closeButton = '';
            }

            // Format type to match the alert class
            formatType = 'alert-' + settings.type;

            // Notification HTML markup
            markup = $('<div class="alert ' + formatType + ' alert-dismissible mb-3" role="alert" style="right:-' + settings.wrapperWidth + 'px">' + iconMarkup + '<div class="alert-content">' + headerMarkup + messageMarkup +  closeButton + '</div></div>');

            // Append markup and animate
            function showNotification(selector, markup, delay, width) {

                $(selector).append(markup),
            		markup.animate(
            			{
            				right: 5
            			}, 500)
            		.animate(
            			{
            				right: 0
            			}, 200)
            		.delay(delay)
            		.animate(
            			{
            				right: 5
            			}, 200)
            		.animate(
            			{
            				right: -width
            			}, 500,
            			function() {
                    		$(this).remove()
                		}
            		)
            }

            // Add the wrapper element if it is not already and show notification
            if($('.notify').length) {

                showNotification('.notify', markup, settings.delay, settings.wrapperWidth);

            }else{

                $(settings.container).append('<div class="notify" style="position:fixed;width:' + settings.wrapperWidth + 'px;right:0px;bottom:20px;z-index:1000;"></div>');

                showNotification('.notify', markup, settings.delay, settings.wrapperWidth);

            }

        //});

    }

}(jQuery));

//
// Priority Nav Scroller
//

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var _priorityNavScroller = require('./priority-nav-scroller.js');

var _priorityNavScroller2 = _interopRequireDefault(_priorityNavScroller);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// // Init with default setup
// const priorityNavScrollerDefault = PriorityNavScroller();

// // Init with all options at default setting
// const priorityNavScrollerDefault = PriorityNavScroller({
//   selector: '.nav-scroller',
//   navSelector: '.ns-nav',
//   contentSelector: '.ns-content',
//   itemSelector: '.ns-item',
//   buttonLeftSelector: '.ns-btn-left',
//   buttonRightSelector: '.ns-btn-right',
//   scrollStep: 75
// });

// Init multiple nav scrollers with the same options
var navScrollers = document.querySelectorAll('.nav-scroller');

navScrollers.forEach(function (currentValue, currentIndex) {
  (0, _priorityNavScroller2.default)({
    selector: currentValue
  });
});

},{"./priority-nav-scroller.js":2}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
  Priority+ horizontal scrolling menu.

  @param {Object} object - Container for all options.
  @param {string || DOM node} selector - Element selector.
  @param {string} navSelector - Nav element selector.
  @param {string} contentSelector - Content element selector.
  @param {string} itemSelector - Items selector.
  @param {string} buttonLeftSelector - Left button selector.
  @param {string} buttonRightSelector - Right button selector.
  @param {integer || string} scrollStep - Amount to scroll on button click.

**/

var PriorityNavScroller = function PriorityNavScroller() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$selector = _ref.selector,
      selector = _ref$selector === undefined ? '.nav-scroller' : _ref$selector,
      _ref$navSelector = _ref.navSelector,
      navSelector = _ref$navSelector === undefined ? '.ns-nav' : _ref$navSelector,
      _ref$contentSelector = _ref.contentSelector,
      contentSelector = _ref$contentSelector === undefined ? '.ns-content' : _ref$contentSelector,
      _ref$itemSelector = _ref.itemSelector,
      itemSelector = _ref$itemSelector === undefined ? '.ns-item' : _ref$itemSelector,
      _ref$buttonLeftSelect = _ref.buttonLeftSelector,
      buttonLeftSelector = _ref$buttonLeftSelect === undefined ? '.ns-btn-left' : _ref$buttonLeftSelect,
      _ref$buttonRightSelec = _ref.buttonRightSelector,
      buttonRightSelector = _ref$buttonRightSelec === undefined ? '.ns-btn-right' : _ref$buttonRightSelec,
      _ref$scrollStep = _ref.scrollStep,
      scrollStep = _ref$scrollStep === undefined ? 100 : _ref$scrollStep;

  var navScroller = typeof selector === 'string' ? document.querySelector(selector) : selector;

  var validateScrollStep = function validateScrollStep() {
    return Number.isInteger(scrollStep) || scrollStep === 'average';
  };

  if (navScroller === undefined || navScroller === null || !validateScrollStep()) {
    throw new Error('There is something wrong with your selector.');
    return;
  }

  var navScrollerNav = navScroller.querySelector(navSelector);
  var navScrollerContent = navScroller.querySelector(contentSelector);
  var navScrollerContentItems = navScrollerContent.querySelectorAll(itemSelector);
  var navScrollerLeft = navScroller.querySelector(buttonLeftSelector);
  var navScrollerRight = navScroller.querySelector(buttonRightSelector);

  var scrolling = false;
  var scrollAvailableLeft = 0;
  var scrollAvailableRight = 0;
  var scrollingDirection = '';
  var scrollOverflow = '';
  var timeout = void 0;

  // Sets overflow and toggle buttons accordingly
  var setOverflow = function setOverflow() {
    scrollOverflow = getOverflow();
    toggleButtons(scrollOverflow);
    calculateScrollStep();
  };

  // Debounce setting the overflow with requestAnimationFrame
  var requestSetOverflow = function requestSetOverflow() {
    if (timeout) window.cancelAnimationFrame(timeout);

    timeout = window.requestAnimationFrame(function () {
      setOverflow();
    });
  };

  // Gets the overflow on the nav scroller (left, right or both)
  var getOverflow = function getOverflow() {
    var scrollWidth = navScrollerNav.scrollWidth;
    var scrollViewport = navScrollerNav.clientWidth;
    var scrollLeft = navScrollerNav.scrollLeft;

    scrollAvailableLeft = scrollLeft;
    scrollAvailableRight = scrollWidth - (scrollViewport + scrollLeft);

    // 1 instead of 0 to compensate for rounding errors from the browser
    var scrollLeftCondition = scrollAvailableLeft > 1;
    var scrollRightCondition = scrollAvailableRight > 1;

    // console.log(scrollWidth, scrollViewport, scrollAvailableLeft, scrollAvailableRight);

    if (scrollLeftCondition && scrollRightCondition) {
      return 'both';
    } else if (scrollLeftCondition) {
      return 'left';
    } else if (scrollRightCondition) {
      return 'right';
    } else {
      return 'none';
    }
  };

  // Calculates the scroll step based on the width of the scroller and the number of links
  var calculateScrollStep = function calculateScrollStep() {
    if (scrollStep === 'average') {
      var scrollViewportNoPadding = navScrollerNav.scrollWidth - (parseInt(getComputedStyle(navScrollerContent, null).getPropertyValue('padding-left'), 10) + parseInt(getComputedStyle(navScrollerContent, null).getPropertyValue('padding-right'), 10));

      var scrollStepAverage = Math.floor(scrollViewportNoPadding / navScrollerContentItems.length);

      scrollStep = scrollStepAverage;
    }
  };

  // Move the scroller with a transform
  var moveScroller = function moveScroller(direction) {

    if (scrolling === true || scrollOverflow !== direction && scrollOverflow !== 'both') return;

    var scrollDistance = scrollStep;
    var scrollAvailable = direction === 'left' ? scrollAvailableLeft : scrollAvailableRight;

    // If there is less that 1.75 steps available then scroll the full way
    if (scrollAvailable < scrollStep * 1.75) {
      scrollDistance = scrollAvailable;
    }

    if (direction === 'right') {
      scrollDistance *= -1;
    }

    navScrollerContent.classList.remove('no-transition');
    navScrollerContent.style.transform = 'translateX(' + scrollDistance + 'px)';

    scrollingDirection = direction;
    scrolling = true;
  };

  // Set the scroller position and removes transform, called after moveScroller()
  var setScrollerPosition = function setScrollerPosition() {
    var style = window.getComputedStyle(navScrollerContent, null);
    var transform = style.getPropertyValue('transform');
    var transformValue = Math.abs(parseInt(transform.split(',')[4]) || 0);

    if (scrollingDirection === 'left') {
      transformValue *= -1;
    }

    navScrollerContent.classList.add('no-transition');
    navScrollerContent.style.transform = '';
    navScrollerNav.scrollLeft = navScrollerNav.scrollLeft + transformValue;
    navScrollerContent.classList.remove('no-transition');

    scrolling = false;
  };

  // Toggle buttons depending on overflow
  var toggleButtons = function toggleButtons(overflow) {
    if (overflow === 'both' || overflow === 'left') {
      navScrollerLeft.classList.add('active');
    } else {
      navScrollerLeft.classList.remove('active');
    }

    if (overflow === 'both' || overflow === 'right') {
      navScrollerRight.classList.add('active');
    } else {
      navScrollerRight.classList.remove('active');
    }
  };

  // Init plugin
  var init = function init() {
    setOverflow();

    window.addEventListener('resize', function () {
      requestSetOverflow();
    });

    navScrollerNav.addEventListener('scroll', function () {
      requestSetOverflow();
    });

    navScrollerContent.addEventListener('transitionend', function () {
      setScrollerPosition();
    });

    navScrollerLeft.addEventListener('click', function () {
      moveScroller('left');
    });

    navScrollerRight.addEventListener('click', function () {
      moveScroller('right');
    });
  };

  // Init is called by default
  init();

  // Reveal API
  return {
    init: init
  };
};

exports.default = PriorityNavScroller;

},{}]},{},[1])

//
// Custom File Upload Input
//

+function ($) { "use strict";

  var isIE = window.navigator.appName == 'Microsoft Internet Explorer'

  // FILEUPLOAD PUBLIC CLASS DEFINITION
  // =================================

  var Fileinput = function (element, options) {
    this.$element = $(element)

    this.$input = this.$element.find(':file')
    if (this.$input.length === 0) return

    this.name = this.$input.attr('name') || options.name

    this.$hidden = this.$element.find('input[type=hidden][name="' + this.name + '"]')
    if (this.$hidden.length === 0) {
      this.$hidden = $('<input type="hidden">').insertBefore(this.$input)
    }

    this.$preview = this.$element.find('.fileinput-preview')
    var height = this.$preview.css('height')
    if (this.$preview.css('display') !== 'inline' && height !== '0px' && height !== 'none') {
      //this.$preview.css('line-height', height)
    }

    this.original = {
      exists: this.$element.hasClass('fileinput-exists'),
      preview: this.$preview.html(),
      hiddenVal: this.$hidden.val()
    }

    this.listen()
  }

  Fileinput.prototype.listen = function() {
    this.$input.on('change.bs.fileinput', $.proxy(this.change, this))
    $(this.$input[0].form).on('reset.bs.fileinput', $.proxy(this.reset, this))

    this.$element.find('[data-trigger="fileinput"]').on('click.bs.fileinput', $.proxy(this.trigger, this))
    this.$element.find('[data-dismiss="fileinput"]').on('click.bs.fileinput', $.proxy(this.clear, this))
  },

  Fileinput.prototype.change = function(e) {
    var files = e.target.files === undefined ? (e.target && e.target.value ? [{ name: e.target.value.replace(/^.+\\/, '')}] : []) : e.target.files

    e.stopPropagation()

    if (files.length === 0) {
      this.clear()
      return
    }

    this.$hidden.val('')
    this.$hidden.attr('name', '')
    this.$input.attr('name', this.name)

    var file = files[0]

    if (this.$preview.length > 0 && (typeof file.type !== "undefined" ? file.type.match(/^image\/(gif|png|jpeg)$/) : file.name.match(/\.(gif|png|jpe?g)$/i)) && typeof FileReader !== "undefined") {
      var reader = new FileReader()
      var preview = this.$preview
      var element = this.$element

      reader.onload = function(re) {
        var $img = $('<img>')
        $img[0].src = re.target.result
        files[0].result = re.target.result

        element.find('.fileinput-filename').text(file.name)

        // if parent has max-height, using `(max-)height: 100%` on child doesn't take padding and border into account
        if (preview.css('max-height') != 'none') $img.css('max-height', parseInt(preview.css('max-height'), 10) - parseInt(preview.css('padding-top'), 10) - parseInt(preview.css('padding-bottom'), 10)  - parseInt(preview.css('border-top'), 10) - parseInt(preview.css('border-bottom'), 10))

        preview.html($img)
        element.addClass('fileinput-exists').removeClass('fileinput-new')

        element.trigger('change.bs.fileinput', files)
      }

      reader.readAsDataURL(file)
    } else {
      this.$element.find('.fileinput-filename').text(file.name)
      this.$preview.text(file.name)

      this.$element.addClass('fileinput-exists').removeClass('fileinput-new')

      this.$element.trigger('change.bs.fileinput')
    }
  },

  Fileinput.prototype.clear = function(e) {
    if (e) e.preventDefault()

    this.$hidden.val('')
    this.$hidden.attr('name', this.name)
    this.$input.attr('name', '')

    //ie8+ doesn't support changing the value of input with type=file so clone instead
    if (isIE) {
      var inputClone = this.$input.clone(true);
      this.$input.after(inputClone);
      this.$input.remove();
      this.$input = inputClone;
    } else {
      this.$input.val('')
    }

    this.$preview.html('')
    this.$element.find('.fileinput-filename').text('')
    this.$element.addClass('fileinput-new').removeClass('fileinput-exists')

    if (e !== undefined) {
      this.$input.trigger('change')
      this.$element.trigger('clear.bs.fileinput')
    }
  },

  Fileinput.prototype.reset = function() {
    this.clear()

    this.$hidden.val(this.original.hiddenVal)
    this.$preview.html(this.original.preview)
    this.$element.find('.fileinput-filename').text('')

    if (this.original.exists) this.$element.addClass('fileinput-exists').removeClass('fileinput-new')
     else this.$element.addClass('fileinput-new').removeClass('fileinput-exists')

    this.$element.trigger('reset.bs.fileinput')
  },

  Fileinput.prototype.trigger = function(e) {
    this.$input.trigger('click')
    e.preventDefault()
  }


  // FILEUPLOAD PLUGIN DEFINITION
  // ===========================

  var old = $.fn.fileinput

  $.fn.fileinput = function (options) {
    return this.each(function () {
      var $this = $(this),
          data = $this.data('bs.fileinput')
      if (!data) $this.data('bs.fileinput', (data = new Fileinput(this, options)))
      if (typeof options == 'string') data[options]()
    })
  }

  $.fn.fileinput.Constructor = Fileinput


  // FILEINPUT NO CONFLICT
  // ====================

  $.fn.fileinput.noConflict = function () {
    $.fn.fileinput = old
    return this
  }


  // FILEUPLOAD DATA-API
  // ==================

  $(document).on('click.fileinput.data-api', '[data-provides="fileinput"]', function (e) {
    var $this = $(this)
    if ($this.data('bs.fileinput')) return
    $this.fileinput($this.data())

    var $target = $(e.target).closest('[data-dismiss="fileinput"],[data-trigger="fileinput"]');
    if ($target.length > 0) {
      e.preventDefault()
      $target.trigger('click.bs.fileinput')
    }
  })

}(window.jQuery);

//
// Bootstrap Fileselect
//

(function (window, $) {

    var Fileselect = function (fileInput, options) {
        this.$fileInput = $(fileInput);
        this.options = options;
        this.userLanguage = 'en';
        this.$fileselect = $(this);
        this.metadata = this.$fileInput.data();
        this.$inputGroup = $('<div>').addClass('input-group');
        this.$inputGroupBtn = $('<label>').addClass('input-group-append');
        this.$browseBtn = $('<span>');
        this.$labelInput = $('<input>').attr('type', 'text').attr('readonly', true).addClass('form-control').css('background-color', '#fff');
        this.translations = {
            'en': {
                'browse': 'Browse',
                'rules': {
                    'numberOfFiles': 'The number of uploadable files is limited to [num] file(s)',
                    'fileExtensions': 'The files are restricted to the following file extensions: [ext]',
                    'fileSize': 'The file size is limited to [size]',
                }
            },
            'de': {
                'browse': 'Durchsuchen',
                'rules': {
                    'numberOfFiles': 'Die Anzahl der hochladbaren Dateien ist limitiert auf [num] Datei(en)',
                    'fileExtensions': 'Die Dateien sind eingeschränkt auf folgende Dateierweiterungen: [ext]',
                    'fileSize': 'Die Grösse ist eingeschränkt auf [size] pro Datei',
                }
            }
        };
        this.init();
    };
    Fileselect.prototype = {
        defaults: {
            browseBtnClass: 'btn btn-default',
            browseBtnText: '',
            browserBtnPosition: 'right',
            limit: false,
            extensions: false,
            allowedFileSize: false,
            allowedFileExtensions: false,
            allowedNumberOfFiles: false,
            language: 'en',
            validationCallback: function (message, instance) {
                alert(message);
            }
        },
        init: function () {
            this.config = this.loadConfig();
            this.translations = this.loadTranslation();

            this.$fileInput
                    .hide()
                    .after(this.$inputGroup);

            if (this.config.browseBtnPosition === 'left') {
                this.$inputGroup.append(this.$inputGroupBtn, this.$labelInput);
            } else {
                this.$inputGroup.append(this.$labelInput, this.$inputGroupBtn);
            }

            this.$inputGroupBtn
                    .append(this.$fileInput)
                    .append(this.$browseBtn)
                    .css('margin-bottom', 0);

            this.$browseBtn
                    .addClass(this.config.browseBtnClass)
                    .text((this.config.browseBtnText === '') ? this.translations.browse : this.config.browseBtnText);

            this.$fileInput.on('change', $.proxy(this.changeEvent, this));

            return $(this);
        },
        changeEvent: function (e) {
            this.$fileInput.trigger('bs.fs.change', [this]);

            var files = this.$fileInput[0].files,
                    label = $.map(files, function (file) {
                        return file.name;
                    }).join(', ');

            var result = false;
            if (this.validateNumberOfFiles(files) && this.valiateFileExtensions(files) && this.validateFileSize(files)) {
                this.$labelInput.val(label);
                result = true;
            } else {
                this.$fileInput.val(null);
            }

            this.$fileInput.trigger('bs.fs.changed', [this]);

            return result;
        },
        loadConfig: function () {
            var config = $.extend({}, this.defaults, this.options, this.metadata);
            if (typeof config.allowedFileExtensions === 'string') {
                config.allowedFileExtensions = config.allowedFileExtensions.split(',');
            }
            return config;
        },
        loadTranslation: function () {
            var userLanguage = this.config.language || navigator.language || navigator.userLanguage,
                    translatedLanguages = $.map(this.translations, function (translations, key) {
                        return key;
                    });

            if ($.inArray(userLanguage, translatedLanguages) >= 0) {
                this.userLanguage = userLanguage;
            } else {
                console.warn('Current user language has no translation. Switched to english as default language.')
            }

            return this.translations[userLanguage];
        },
        validateNumberOfFiles: function (files) {
            this.$fileInput
                    .trigger('bs.fs.validate', [this])
                    .trigger('bs.fs.number-of-files-validate', [this]);

            var result = true;
            if (this.config.allowedNumberOfFiles && files.length > parseInt(this.config.allowedNumberOfFiles)) {
                this.config.validationCallback(this.translations.rules.numberOfFiles.replace('[num]', this.config.allowedNumberOfFiles), 'allowedNumberOfFiles', this);
                result = false;
            }

            this.$fileInput
                    .trigger('bs.fs.validated', [this])
                    .trigger('bs.fs.number-of-files-validated', [this]);

            return result;
        },
        valiateFileExtensions: function (files) {
            this.$fileInput
                    .trigger('bs.fs.validate', [this])
                    .trigger('bs.fs.file-extensions-validate', [this]);

            var result = true;
            if (this.config.allowedFileExtensions) {
                $.each(files, $.proxy(function (i, file) {
                    var fileExtension = file.name.replace(/^.*\./, '').toLowerCase();
                    if ($.inArray(fileExtension, this.config.allowedFileExtensions) === -1) {
                        this.config.validationCallback(this.translations.rules.fileExtensions.replace('[ext]', this.config.allowedFileExtensions.join(', ')), 'allowedFileExtensions', this);
                        result = false;
                        return;
                    }
                }, this));
            }

            this.$fileInput
                    .trigger('bs.fs.validated', [this])
                    .trigger('bs.fs.file-extensions-validated', [this]);

            return result;
        },
        validateFileSize: function (files) {
            this.$fileInput
                    .trigger('bs.fs.validate', [this])
                    .trigger('bs.fs.file-size-validate', [this]);

            var result = true;
            if (this.config.allowedFileSize) {
                $.each(files, $.proxy(function (i, file) {
                    if (file.size > this.config.allowedFileSize) {
                        this.config.validationCallback(this.translations.rules.fileSize.replace('[size]', Math.round(this.config.allowedFileSize / 1024 / 1024) + 'MB'), 'allowedFileSize', this);
                        result = false;
                        return;
                    }
                }, this));
            }

            this.$fileInput
                    .trigger('bs.fs.validated', [this])
                    .trigger('bs.fs.file-size-validated', [this]);

            return result;
        },

    };


    Fileselect.defaults = Fileselect.prototype.defaults;

    $.fn.fileselect = function (options) {
        this.each(function () {
            new Fileselect(this, options);
        });
        return this;
    };

    window.Fileselect = Fileselect;
})(window, jQuery);

//
// jQuery Number Spinner
//

'use strict';

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module
    define(['jquery'], factory);
  }
  else if (typeof exports === 'object') {
    // Node/CommonJS
    module.exports = factory(require('jquery'));
  }
  else {
    // Browser globals
    factory(jQuery);
  }
})(function($) {
  var spinningTimer;
  var Spinner;
  var Spinning = function($element, options) {
    this.$el = $element;
    this.options = $.extend({}, Spinning.rules.defaults, Spinning.rules[options.rule] || {}, options);
    this.min = Number(this.options.min) || 0;
    this.max = Number(this.options.max) || 0;

    this.$el.on({
      'focus.spinner': $.proxy(function(e) {
        e.preventDefault();
        $(document).trigger('mouseup.spinner');
        this.oldValue = this.value();
      }, this),
      'change.spinner': $.proxy(function(e) {
        e.preventDefault();
        this.value(this.$el.val());
      }, this),
      'keydown.spinner': $.proxy(function(e) {
        var dir = {
          38: 'up',
          40: 'down'
        }[e.which];

        if (dir) {
          e.preventDefault();
          this.spin(dir);
        }
      }, this)
    });

    //init input value
    this.oldValue = this.value();
    this.value(this.$el.val());
    return this;
  };

  Spinning.rules = {
    defaults: { min: null, max: null, step: 1, precision: 0 },
    currency: { min: 0.00, max: null, step: 0.01, precision: 2 },
    quantity: { min: 1, max: 999, step: 1, precision: 0 },
    percent:  { min: 1, max: 100, step: 1, precision: 0 },
    month:    { min: 1, max: 12, step: 1, precision: 0 },
    day:      { min: 1, max: 31, step: 1, precision: 0 },
    hour:     { min: 0, max: 23, step: 1, precision: 0 },
    minute:   { min: 1, max: 59, step: 1, precision: 0 },
    second:   { min: 1, max: 59, step: 1, precision: 0 }
  };

  Spinning.prototype = {
    spin: function(dir) {
      if (this.$el.prop('disabled')) {
        return;
      }

      this.oldValue = this.value();
      var step = $.isFunction(this.options.step) ? this.options.step.call(this, dir) : this.options.step;
      var multipler = dir === 'up' ? 1 : -1;

      this.value(this.oldValue + Number(step) * multipler);
    },

    value: function(v) {
      if (v === null || v === undefined) {
        return this.numeric(this.$el.val());
      }
      v = this.numeric(v);

      var valid = this.validate(v);
      if (valid !== 0) {
        v = (valid === -1) ? this.min : this.max;
      }
      this.$el.val(v.toFixed(this.options.precision));

      if (this.oldValue !== this.value()) {
        // changing.spinner
        this.$el.trigger('changing.spinner', [this.value(), this.oldValue]);

        // lazy changed.spinner
        clearTimeout(spinningTimer);
        spinningTimer = setTimeout($.proxy(function() {
          this.$el.trigger('changed.spinner', [this.value(), this.oldValue]);
        }, this), Spinner.delay);
      }
    },

    numeric: function(v) {
      v = this.options.precision > 0 ? parseFloat(v, 10) : parseInt(v, 10);

      // If the variable is a number
      if (isFinite(v)) {
        return v;
      }

      return v || this.options.min || 0;
    },

    validate: function(val) {
      if (this.options.min !== null && val < this.min) {
        return -1;
      }

      if (this.options.max !== null && val > this.max) {
        return 1;
      }

      return 0;
    }
  };

  Spinner = function(element, options) {
    this.$el = $(element);
    this.$spinning = this.$el.find('[data-spin="spinner"]');

    if (this.$spinning.length === 0) {
      this.$spinning = this.$el.find(':input[type="text"]');
    }

    options = $.extend({}, options, this.$spinning.data());

    this.spinning = new Spinning(this.$spinning, options);

    this.$el
      .on('click.spinner', '[data-spin="up"], [data-spin="down"]', $.proxy(this, 'spin'))
      .on('mousedown.spinner', '[data-spin="up"], [data-spin="down"]', $.proxy(this, 'spin'));

    $(document).on('mouseup.spinner', $.proxy(function() {
      clearTimeout(this.spinTimeout);
      clearInterval(this.spinInterval);
    }, this));

    if (options.delay) {
      this.delay(options.delay);
    }

    if (options.changed) {
      this.changed(options.changed);
    }

    if (options.changing) {
      this.changing(options.changing);
    }
  };

  Spinner.delay = 500;

  Spinner.prototype = {
    constructor: Spinner,

    spin: function(e) {
      var dir = $(e.currentTarget).data('spin');

      switch (e.type) {
        case 'click':
          e.preventDefault();
          this.spinning.spin(dir);
          break;
        case 'mousedown':
          if (e.which === 1) {
            this.spinTimeout = setTimeout($.proxy(this, 'beginSpin', dir), 300);
          }
          break;
      }
    },

    delay: function(ms) {
      var delay = Number(ms);

      if (delay >= 0) {
        this.constructor.delay = delay + 100;
      }
    },

    value: function() {
      return this.spinning.value();
    },

    changed: function(fn) {
      this.bindHandler('changed.spinner', fn);
    },

    changing: function(fn) {
      this.bindHandler('changing.spinner', fn);
    },

    bindHandler: function(t, fn) {
      if ($.isFunction(fn)) {
        this.$spinning.on(t, fn);
      }
      else {
        this.$spinning.off(t);
      }
    },

    beginSpin: function(dir) {
      this.spinInterval = setInterval($.proxy(this.spinning, 'spin', dir), 100);
    }
  };

  var old = $.fn.spinner;

  $.fn.spinner = function(options, value) {
    return this.each(function() {
      var data = $.data(this, 'spinner');

      if (!data) {
        data = new Spinner(this, options);

        $.data(this, 'spinner', data);
      }
      if (options === 'delay' || options === 'changed' || options === 'changing') {
        data[options](value);
      }
      else if (options === 'step' && value) {
        data.spinning.step = value;
      }
      else if (options === 'spin' && value) {
        data.spinning.spin(value);
      }
    });
  };

  $.fn.spinner.Constructor = Spinner;
  $.fn.spinner.noConflict = function() {
    $.fn.spinner = old;
    return this;
  };

  $(function() {
    $('[data-trigger="spinner"]').spinner();
  });

  return $.fn.spinner;
});

//
// Bootstrap Confirm
//

;
( function ( $, window, document, undefined )
{
		var bootstrap_confirm = function ( element, options )
		{
				this.element = $( element );
				this.settings = $.extend(
						{
								debug: false,
								heading: 'Confirm', //Delete
								message: 'Are you sure you want to continue?',
								icon: '<i class="icon-trash-alt text-danger"></i>',
								btn_ok_label: 'Yes',
								btn_cancel_label: 'Cancel',
								data_type: null,
								callback: null,
								delete_callback: null,
								cancel_callback: null
						}, options || {}
				);

				this.onDelete = function ( event )
				{
						event.preventDefault();

						var plugin = $( this ).data( 'bootstrap_confirm' );

						if ( undefined !== $( this ).attr( 'data-type' ) )
						{
								var name = $( this ).attr( 'data-type' );

								plugin.settings.heading = 'Confirm';
								plugin.settings.message = 'Are you sure you want to delete "' + name + '"?';
						}

						if ( null === document.getElementById( 'bootstrap-confirm-container' ) )
						{
								$( 'body' ).append( '<div id="bootstrap-confirm-container" class="bootstrap-confirm"><div id="bootstrap-confirm-dialog" class="modal zoom"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h5 class="modal-title" id="bootstrap-confirm-dialog-heading"></h5><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button></div><div class="modal-body d-flex align-items-center"><div id="bootstrap-confirm-dialog-icon" class="ml-2 mr-4" style="font-size:3rem"></div><div id="bootstrap-confirm-dialog-text"></div></div><div class="modal-footer"><button id="bootstrap-confirm-dialog-cancel-btn" type="button" class="btn btn-default mr-auto" data-dismiss="modal">Cancel</button><a id="bootstrap-confirm-dialog-btn" href="#" class="btn btn-success">Delete</a></div></div></div></div></div>' );
						}

						$( '#bootstrap-confirm-dialog-heading' ).html( plugin.settings.heading );
						$( '#bootstrap-confirm-dialog-text' ).html( plugin.settings.message );
						$( '#bootstrap-confirm-dialog-icon' ).html( plugin.settings.icon );
						$( '#bootstrap-confirm-dialog-btn' ).html( plugin.settings.btn_ok_label );
						$( '#bootstrap-confirm-dialog-cancel-btn' ).html( plugin.settings.btn_cancel_label );
						$( '#bootstrap-confirm-dialog' ).modal( 'toggle' );
						$('#bootstrap-confirm-dialog').on('hide.bs.modal', function (e) {
							$(this).toggleClass('zoomed');
						})
						$('#bootstrap-confirm-dialog').on('hidden.bs.modal', function (e) {
                            setTimeout( function(){$("#bootstrap-confirm-container").remove();}, 200);
						})

						var deleteBtn = $( 'a#bootstrap-confirm-dialog-btn' );
						var cancelBtn = $( 'a#bootstrap-confirm-dialog-cancel-btn' );
						var hasCallback = false;

						if ( null !== plugin.settings.callback )
						{
								if ( $.isFunction( plugin.settings.callback ) )
								{
										deleteBtn.attr( 'data-dismiss', 'modal' ).off('.bs-confirm-delete').on( 'click.bs-confirm-delete', { originalObject: $( this ) }, plugin.settings.callback );
										hasCallback = true;
								}
								else
								{
										console.log( plugin.settings.callback + ' is not a valid callback' );
								}
						}
						if ( null !== plugin.settings.delete_callback )
						{
								if ( $.isFunction( plugin.settings.delete_callback ) )
								{
										deleteBtn.attr( 'data-dismiss', 'modal' ).off('.bs-confirm-delete').on( 'click.bs-confirm-delete', { originalObject: $( this ) }, plugin.settings.delete_callback );
										hasCallback = true;
								}
								else
								{
										console.log( plugin.settings.delete_callback + ' is not a valid callback' );
								}
						}
						if ( !hasCallback &&  '' !== event.currentTarget.href )
						{
								deleteBtn.attr( 'href', event.currentTarget.href );
						}

						if ( null !== plugin.settings.cancel_callback )
						{
								cancelBtn.off('.bs-confirm-delete').on( 'click.bs-confirm-delete', { originalObject: $( this ) }, plugin.settings.cancel_callback );
						}
				};
		};

		$.fn.bootstrap_confirm = function ( options )
		{
				return this.each( function ()
				{
						var element = $( this );

						if ( element.data( 'bootstrap_confirm' ) )
						{
								return element.data( 'bootstrap_confirm' );
						}

						var plugin = new bootstrap_confirm( this, options );

						element.data( 'bootstrap_confirm', plugin );
						element.off('.bs-confirm-delete').on( 'click.bs-confirm-delete', plugin.onDelete );

						return plugin;
				} );
		};
}( jQuery, window, document, undefined ));

//
// jQuery Number Format
//

!function(e){"use strict";function t(e,t){if(this.createTextRange){var a=this.createTextRange();a.collapse(!0),a.moveStart("character",e),a.moveEnd("character",t-e),a.select()}else this.setSelectionRange&&(this.focus(),this.setSelectionRange(e,t))}function a(e){var t=this.value.length;if(e="start"==e.toLowerCase()?"Start":"End",document.selection){var a,i,n,l=document.selection.createRange();return a=l.duplicate(),a.expand("textedit"),a.setEndPoint("EndToEnd",l),i=a.text.length-l.text.length,n=i+l.text.length,"Start"==e?i:n}return"undefined"!=typeof this["selection"+e]&&(t=this["selection"+e]),t}var i={codes:{46:127,188:44,109:45,190:46,191:47,192:96,220:92,222:39,221:93,219:91,173:45,187:61,186:59,189:45,110:46},shifts:{96:"~",49:"!",50:"@",51:"#",52:"$",53:"%",54:"^",55:"&",56:"*",57:"(",48:")",45:"_",61:"+",91:"{",93:"}",92:"|",59:":",39:'"',44:"<",46:">",47:"?"}};e.fn.number=function(n,l,s,r){r="undefined"==typeof r?",":r,s="undefined"==typeof s?".":s,l="undefined"==typeof l?0:l;var u="\\u"+("0000"+s.charCodeAt(0).toString(16)).slice(-4),h=new RegExp("[^"+u+"0-9]","g"),o=new RegExp(u,"g");return n===!0?this.is("input:text")?this.on({"keydown.format":function(n){var u=e(this),h=u.data("numFormat"),o=n.keyCode?n.keyCode:n.which,c="",v=a.apply(this,["start"]),d=a.apply(this,["end"]),p="",f=!1;if(i.codes.hasOwnProperty(o)&&(o=i.codes[o]),!n.shiftKey&&o>=65&&90>=o?o+=32:!n.shiftKey&&o>=69&&105>=o?o-=48:n.shiftKey&&i.shifts.hasOwnProperty(o)&&(c=i.shifts[o]),""==c&&(c=String.fromCharCode(o)),8!=o&&45!=o&&127!=o&&c!=s&&!c.match(/[0-9]/)){var g=n.keyCode?n.keyCode:n.which;if(46==g||8==g||127==g||9==g||27==g||13==g||(65==g||82==g||80==g||83==g||70==g||72==g||66==g||74==g||84==g||90==g||61==g||173==g||48==g)&&(n.ctrlKey||n.metaKey)===!0||(86==g||67==g||88==g)&&(n.ctrlKey||n.metaKey)===!0||g>=35&&39>=g||g>=112&&123>=g)return;return n.preventDefault(),!1}if(0==v&&d==this.value.length?8==o?(v=d=1,this.value="",h.init=l>0?-1:0,h.c=l>0?-(l+1):0,t.apply(this,[0,0])):c==s?(v=d=1,this.value="0"+s+new Array(l+1).join("0"),h.init=l>0?1:0,h.c=l>0?-(l+1):0):45==o?(v=d=2,this.value="-0"+s+new Array(l+1).join("0"),h.init=l>0?1:0,h.c=l>0?-(l+1):0,t.apply(this,[2,2])):(h.init=l>0?-1:0,h.c=l>0?-l:0):h.c=d-this.value.length,h.isPartialSelection=v==d?!1:!0,l>0&&c==s&&v==this.value.length-l-1)h.c++,h.init=Math.max(0,h.init),n.preventDefault(),f=this.value.length+h.c;else if(45!=o||0==v&&0!=this.value.indexOf("-"))if(c==s)h.init=Math.max(0,h.init),n.preventDefault();else if(l>0&&127==o&&v==this.value.length-l-1)n.preventDefault();else if(l>0&&8==o&&v==this.value.length-l)n.preventDefault(),h.c--,f=this.value.length+h.c;else if(l>0&&127==o&&v>this.value.length-l-1){if(""===this.value)return;"0"!=this.value.slice(v,v+1)&&(p=this.value.slice(0,v)+"0"+this.value.slice(v+1),u.val(p)),n.preventDefault(),f=this.value.length+h.c}else if(l>0&&8==o&&v>this.value.length-l){if(""===this.value)return;"0"!=this.value.slice(v-1,v)&&(p=this.value.slice(0,v-1)+"0"+this.value.slice(v),u.val(p)),n.preventDefault(),h.c--,f=this.value.length+h.c}else 127==o&&this.value.slice(v,v+1)==r?n.preventDefault():8==o&&this.value.slice(v-1,v)==r?(n.preventDefault(),h.c--,f=this.value.length+h.c):l>0&&v==d&&this.value.length>l+1&&v>this.value.length-l-1&&isFinite(+c)&&!n.metaKey&&!n.ctrlKey&&!n.altKey&&1===c.length&&(p=d===this.value.length?this.value.slice(0,v-1):this.value.slice(0,v)+this.value.slice(v+1),this.value=p,f=v);else n.preventDefault();f!==!1&&t.apply(this,[f,f]),u.data("numFormat",h)},"keyup.format":function(i){var n,s=e(this),r=s.data("numFormat"),u=i.keyCode?i.keyCode:i.which,h=a.apply(this,["start"]),o=a.apply(this,["end"]);0!==h||0!==o||189!==u&&109!==u||(s.val("-"+s.val()),h=1,r.c=1-this.value.length,r.init=1,s.data("numFormat",r),n=this.value.length+r.c,t.apply(this,[n,n])),""===this.value||(48>u||u>57)&&(96>u||u>105)&&8!==u&&46!==u&&110!==u||(s.val(s.val()),l>0&&(r.init<1?(h=this.value.length-l-(r.init<0?1:0),r.c=h-this.value.length,r.init=1,s.data("numFormat",r)):h>this.value.length-l&&8!=u&&(r.c++,s.data("numFormat",r))),46!=u||r.isPartialSelection||(r.c++,s.data("numFormat",r)),n=this.value.length+r.c,t.apply(this,[n,n]))},"paste.format":function(t){var a=e(this),i=t.originalEvent,n=null;return window.clipboardData&&window.clipboardData.getData?n=window.clipboardData.getData("Text"):i.clipboardData&&i.clipboardData.getData&&(n=i.clipboardData.getData("text/plain")),a.val(n),t.preventDefault(),!1}}).each(function(){var t=e(this).data("numFormat",{c:-(l+1),decimals:l,thousands_sep:r,dec_point:s,regex_dec_num:h,regex_dec:o,init:this.value.indexOf(".")?!0:!1});""!==this.value&&t.val(t.val())}):this.each(function(){var t=e(this),a=+t.text().replace(h,"").replace(o,".");t.number(isFinite(a)?+a:0,l,s,r)}):this.text(e.number.apply(window,arguments))};var n=null,l=null;e.isPlainObject(e.valHooks.text)?(e.isFunction(e.valHooks.text.get)&&(n=e.valHooks.text.get),e.isFunction(e.valHooks.text.set)&&(l=e.valHooks.text.set)):e.valHooks.text={},e.valHooks.text.get=function(t){var a,i=e(t),l=i.data("numFormat");return l?""===t.value?"":(a=+t.value.replace(l.regex_dec_num,"").replace(l.regex_dec,"."),(0===t.value.indexOf("-")?"-":"")+(isFinite(a)?a:0)):e.isFunction(n)?n(t):void 0},e.valHooks.text.set=function(t,a){var i=e(t),n=i.data("numFormat");if(n){var s=e.number(a,n.decimals,n.dec_point,n.thousands_sep);return e.isFunction(l)?l(t,s):t.value=s}return e.isFunction(l)?l(t,a):void 0},e.number=function(e,t,a,i){i="undefined"==typeof i?"1000"!==new Number(1e3).toLocaleString()?new Number(1e3).toLocaleString().charAt(1):"":i,a="undefined"==typeof a?new Number(.1).toLocaleString().charAt(1):a,t=isFinite(+t)?Math.abs(t):0;var n="\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4),l="\\u"+("0000"+i.charCodeAt(0).toString(16)).slice(-4);e=(e+"").replace(".",a).replace(new RegExp(l,"g"),"").replace(new RegExp(n,"g"),".").replace(new RegExp("[^0-9+-Ee.]","g"),"");var s=isFinite(+e)?+e:0,r="",u=function(e,t){return""+ +(Math.round((""+e).indexOf("e")>0?e:e+"e+"+t)+"e-"+t)};return r=(t?u(s,t):""+Math.round(s)).split("."),r[0].length>3&&(r[0]=r[0].replace(/\B(?=(?:\d{3})+(?!\d))/g,i)),(r[1]||"").length<t&&(r[1]=r[1]||"",r[1]+=new Array(t-r[1].length+1).join("0")),r.join(a)}}(jQuery);

//
// Circle Statistics
//

"use strict";

(function ($) {

    $.fn.circleStats = function (options, callback) {

        var settings = $.extend({
            // These are the defaults.
            foregroundColor: "#2094f3",
            backgroundColor: "#eee",
            pointColor: "none",
            fillColor: 'none',
            foregroundBorderWidth: 15,
            backgroundBorderWidth: 15,
            pointSize: 28.5,
            fontColor: '#aaa',
            percent: 75,
            animation: 1,
            animationStep: 5,
            icon: 'none',
            iconSize: '30',
            iconColor: '#ccc',
            iconPosition: 'top',
            iconDecoration: true,
            target: 0,
            start: 0,
            showPercent: 1,
            percentageTextSize: 22,
            percentageX: 100,
            percentageY: 113,
            textAdditionalCss: '',
            targetPercent: 0,
            targetTextSize: 17,
            targetColor: '#2980B9',
            text: null,
            textStyle: null,
            textColor: '#666',
            textY: null,
            textX: null,
            multiPercentage: 0, //Todo: Deprecate setting. This should be detected when perctentages-length is >1 All initialized objects must subsequently use the percentages-array(!)
            percentages: [],
            multiPercentageLegend: 0,
            textBelow: false,
            noPercentageSign: false,
            replacePercentageByText: null,
            halfCircle: false,
            animateInView: false,//Todo: Deprecate setting. This should be done by default if animate=1
            decimals: 0,
            alwaysDecimals: false,
            title: 'Circle Chart',
            description: '',
            progressColor: null
        }, options);

        return this.each(function () {
            var circleContainer = $(this);

            mergeDataAttributes(settings, circleContainer.data());

            var percent = settings.percent;
            var iconY = 83;
            var iconX = 100;
            var percentageY = settings.percentageY;
            var percentageX = settings.percentageX;
            var additionalCss;
            var elements;
            var icon;
            var backgroundBorderWidth = settings.backgroundBorderWidth;
            var progressColor = settings.progressColor

            if (settings.halfCircle) {
                if (settings.iconPosition === 'left') {
                    iconX = 80;
                    iconY = 100;
                    percentageX = 117;
                    percentageY = 100;
                } else if (settings.halfCircle) {
                    iconY = 80;
                    percentageY = 100;
                }
            } else {
                if (settings.iconPosition === 'bottom') {
                    iconY = 124;
                    percentageY = 95;
                } else if (settings.iconPosition === 'left') {
                    iconX = 80;
                    iconY = 110;
                    percentageX = 117;
                } else if (settings.iconPosition === 'middle') {
                    if (settings.multiPercentage !== 1) {
                        if (settings.iconDecoration) {
                          elements = '<g stroke="' + (settings.backgroundColor !== 'none' ? settings.backgroundColor : '#ccc') + '" ><line x1="133" y1="50" x2="140" y2="40" stroke-width="2"  /></g>';
                          elements += '<g stroke="' + (settings.backgroundColor !== 'none' ? settings.backgroundColor : '#ccc') + '" ><line x1="140" y1="40" x2="200" y2="40" stroke-width="2"  /></g>';
                        }
                        percentageX = 170; // To center the percentage exactly in the center.
                        percentageY = 35;
                    }
                    iconY = 110;
                } else if (settings.iconPosition === 'right') {
                    iconX = 120;
                    iconY = 110;
                    percentageX = 80;
                } else if (settings.iconPosition === 'top' && settings.icon !== 'none') {
                    percentageY = 120;
                }
            }

            if (settings.targetPercent > 0 && settings.halfCircle !== true) {
                percentageY = 95;
                elements = '<g stroke="' + (settings.backgroundColor !== 'none' ? settings.backgroundColor : '#ccc') + '" ><line x1="75" y1="101" x2="125" y2="101" stroke-width="1"  /></g>';
                elements += '<text text-anchor="middle" x="' + percentageX + '" y="120" style="font-size: ' + settings.targetTextSize + 'px;" fill="' + settings.targetColor + '">' + settings.targetPercent + (settings.noPercentageSign && settings.replacePercentageByText === null ? '' : '%') + '</text>';
                elements += '<circle cx="100" cy="100" r="69" fill="none" stroke="' + settings.backgroundColor + '" stroke-width="3" stroke-dasharray="450" transform="rotate(-90,100,100)" />';
                elements += '<circle cx="100" cy="100" r="69" fill="none" stroke="' + settings.targetColor + '" stroke-width="3" stroke-dasharray="' + (435 / 100 * settings.targetPercent) + ', 20000" transform="rotate(-90,100,100)" />';
            }

            if (settings.text !== null) {
                if (settings.halfCircle) {
                    if (settings.textBelow) {
                        elements += '<text text-anchor="middle" x="' + (settings.textX !== null ? settings.textX : '100') + '" y="' + (settings.textY !== null ? settings.textY : '64%') + '" style="' + settings.textStyle + '" fill="' + settings.textColor + '">' + settings.text + '</text>';
                    }
                    else {
                        elements += '<text text-anchor="middle" x="' + (settings.textX !== null ? settings.textX : '100' ) + '" y="' + (settings.textY !== null ? settings.textY : '115') + '" style="' + settings.textStyle + '" fill="' + settings.textColor + '">' + settings.text + '</text>';
                    }
                } else {
                    if (settings.textBelow) {
                        elements += '<text text-anchor="middle" x="' + (settings.textX !== null ? settings.textX : '100' ) + '" y="' + (settings.textY !== null ? settings.textY : '99%') + '" style="' + settings.textStyle + '" fill="' + settings.textColor + '">' + settings.text + '</text>';
                    }
                    else {
                        elements += '<text text-anchor="middle" x="' + (settings.textX !== null ? settings.textX : '100' ) + '" y="' + (settings.textY !== null ? settings.textY : '115') + '" style="' + settings.textStyle + '" fill="' + settings.textColor + '">' + settings.text + '</text>';
                    }
                }
            }

            if (settings.icon !== 'none') {
                icon = '<text text-anchor="middle" x="' + iconX + '" y="' + iconY + '" class="icon" style="font-size: ' + settings.iconSize + 'px" fill="' + settings.iconColor + '">&#x' + settings.icon + '</text>';
            } else {
                icon = '';
            }

            if (settings.halfCircle) {
                var rotate = 'transform="rotate(-180,100,100)"';
                circleContainer
                    .addClass('svg-container')
                    .append(
                        $('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="37 12 126 126" class="circle-stats-svg">' +
                            (typeof elements !== 'undefined' ? elements : '') +
                            '<clipPath id="cut-off-bottom"> <rect x="100" y="0" width="100" height="200" /> </clipPath>' +
                            '<circle cx="100" cy="100" r="57" class="border" fill="' + settings.fillColor + '" stroke="' + settings.backgroundColor + '" stroke-width="' + backgroundBorderWidth + '" stroke-dasharray="360" clip-path="url(#cut-off-bottom)" transform="rotate(-90,100,100)" />' +
                            '<circle class="circle" cx="100" cy="100" r="57" class="border" fill="none" stroke="' + settings.foregroundColor + '" stroke-width="' + settings.foregroundBorderWidth + '" stroke-dasharray="0,20000" ' + rotate + ' />' +
                            '<circle cx="100" cy="100" r="' + settings.pointSize + '" fill="' + settings.pointColor + '" clip-path="url(#cut-off-bottom)" transform="rotate(-90,100,100)" />' +
                            icon +
                            '<text class="timer" text-anchor="middle" x="' + percentageX + '" y="' + percentageY + '" style="font-size: ' + settings.percentageTextSize + 'px; ' + additionalCss + ';' + settings.textAdditionalCss + '" fill="' + settings.fontColor + '"><tspan class="number">' + (settings.replacePercentageByText === null ? 0 : settings.replacePercentageByText) + '</tspan><tspan class="percent">' + (settings.noPercentageSign || settings.replacePercentageByText !== null ? '' : '%') + '</tspan></text>')
                    );
            } else {
                drawCircles();
            }

            var circle = circleContainer.find('.circle');
            var myTimer = circleContainer.find('.timer');
            var interval = 30;
            var angle = 0;
            var angleIncrement = settings.animationStep;
            var last = 0;
            var summary = 0;
            var oneStep = 0;
            var text = percent;
            var calculateFill = (360 / 100 * percent);

            if (settings.halfCircle) {
                calculateFill = (360 / 100 * percent) / 2;
            }

            if (settings.replacePercentageByText !== null) {
                text = settings.replacePercentageByText;
            }

            if (settings.start > 0 && settings.target > 0) {
                percent = settings.start / (settings.target / 100);
                oneStep = settings.target / 100;
            }

            if (settings.animation === 1) {
                if (settings.animateInView) {
                    checkAnimation(); //This will initially check after drawing for each element with
                    //animateInVIew set to true.
                    $(window).scroll(function () {
                        checkAnimation(); //This will recheck viewport positioning, when the page gets scrolled
                    });
                } else {
                    animate();
                }
            } else {
                if (settings.multiPercentage !== 1) {
                    circle
                        .attr("stroke-dasharray", calculateFill + ", 20000");

                    if (settings.showPercent === 1) {
                        myTimer
                            .find('.number')
                            .text(text);
                    } else {
                        myTimer
                            .find('.number')
                            .text(settings.target);
                        myTimer
                            .find('.percent')
                            .text('');
                    }
                } else {
                    if (settings.replacePercentageByText !== null) {
                        myTimer
                            .find('.number')
                            .text(settings.replacePercentageByText);
                        myTimer
                            .find('.percent')
                            .text('');
                    }
                }
            }

            function animate() {
                var currentCircle = circle;
                var currentCalculateFill = calculateFill;

                if (settings.multiPercentage === 1) {
                    var index;
                    var percentages = settings.percentages;
                    var circleRadius = 360;
                    for (index = 0; index < percentages.length; ++index) {
                        percent = percentages[index].percent;
                        currentCalculateFill = (circleRadius / 100 * percent);
                        currentCircle = circleContainer.find('#circle' + (index + 1));

                        if (index > 0) {
                            circleRadius = circleRadius + 62.5;
                            currentCalculateFill = (circleRadius / 100 * percent);
                        }

                        animateCircle(currentCircle, currentCalculateFill, circleRadius, percent);
                    }
                } else {
                    animateCircle(currentCircle, currentCalculateFill, 360, percent);
                }
            }

            function animateCircle(currentCircle, currentCalculateFill, circleRadius, percent) {
                var timer = window.setInterval(function () {
                    if ((angle) >= currentCalculateFill) {
                        window.clearInterval(timer);
                        last = 1;
                        if (typeof callback === 'function') {
                            callback.call(this);
                        }
                    } else {
                        angle += angleIncrement;
                        summary += oneStep;
                    }
                    if (settings.halfCircle) {
                        if (angle * 2 / (circleRadius / 100) >= percent && last === 1) {
                            angle = ((circleRadius / 100) * percent) / 2
                        }
                    } else {
                        if (angle / (circleRadius / 100) >= percent && last === 1) {
                            angle = (circleRadius / 100) * percent;
                        }
                    }

                    if (summary > settings.target && last === 1) {
                        summary = settings.target;
                    }

                    if (settings.replacePercentageByText === null) {
                        if (settings.halfCircle) {
                            text = parseFloat((100 * angle / circleRadius) * 2);
                        } else {
                            text = parseFloat((100 * angle / circleRadius));
                        }
                        text = Math.floor(text);
                        if (!settings.alwaysDecimals && (percent === 0 || (percent > 1 && last !== 1))) {
                            text = parseInt(text);
                        }
                    }

                    currentCircle
                        .attr("stroke-dasharray", angle + ", 20000");

                    if (settings.multiPercentage !== 1) {
                        if (settings.showPercent === 1) {
                            myTimer
                                .find('.number')
                                .text(text);
                        } else {

                            myTimer
                                .find('.number')
                                .text(summary);
                            myTimer
                                .find('.percent')
                                .text('');
                        }
                    } else {
                        myTimer
                            .find('.number')
                            .text('');
                        myTimer
                            .find('.percent')
                            .text('');
                    }

                    if (progressColor !== null) {
                        $.each(progressColor, function (key, color) {
                            if (settings.halfCircle) {
                                key /= 2
                            }
                            if (angle >= key * (circleRadius / 100)) {
                                currentCircle.css({
                                    stroke: color,
                                    transition: 'stroke 0.1s linear'
                                });
                            }
                        });
                    }
                }.bind(currentCircle), interval);
            }

            function isElementInViewport() {
                // Get the scroll position of the page.
                var viewportTop = $(window).scrollTop();
                var viewportBottom = viewportTop + $(window).height();

                // Get the position of the element on the page.
                var elemTop = Math.round(circle.offset().top);
                var elemBottom = elemTop + circle.height();

                return ((elemTop < viewportBottom) && (elemBottom > viewportTop));
            }

            function checkAnimation() {
                // If the animation has already been started
                if (circle.hasClass('start')) return;

                if (isElementInViewport(circle)) {
                    // Start the animation
                    circle.addClass('start');
                    setTimeout(animate, 250)
                }
            }

            function mergeDataAttributes(settings, dataAttributes) {
                $.each(settings, function (key, value) {
                    if (key.toLowerCase() in dataAttributes) {
                        settings[key] = dataAttributes[key.toLowerCase()];
                    }
                });
            }

            /**
             * Draws the initial circles before animate gets called
             */
            function drawCircles() {
                if (settings.multiPercentage === 1) {
                    var index, calculateFillMulti, percent, color, circles;
                    var percentages = settings.percentages;
                    var radius = 47;
                    var circleRadius = 360;
                    var rotate = -90;
                    for (index = 0; index < percentages.length; ++index) {
                        percent = percentages[index].percent;
                        color = percentages[index].color;
                        calculateFillMulti = (circleRadius / 100 * percent);
                        if (index > 0) {
                            circleRadius = circleRadius + 62.5;
                            calculateFillMulti = (circleRadius / 100 * percent);
                        }
                        radius += 10;
                        circles += '<circle cx="100" cy="100" r="' + radius + '" class="border" fill="' + settings.fillColor + '" stroke="' + settings.backgroundColor + '" stroke-width="' + backgroundBorderWidth + '" stroke-dasharray="' + circleRadius + '" transform="rotate(' + rotate + ',100,100)" />' +
                            '<circle class="circle" id="circle' + (index + 1) + '" data-percent="' + percent + '" cx="100" cy="100" r="' + radius + '" class="border" fill="none" stroke="' + color + '" stroke-width="' + settings.foregroundBorderWidth + '" stroke-dasharray="' + calculateFillMulti + ',20000" transform="rotate(' + rotate + ',100,100)" />';
                    }

                    circleContainer
                        .addClass('svg-container')
                        .append(
                            $('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="37 36.5 126 126" class="circle-stats-svg">' +
                                (typeof elements !== 'undefined' ? elements : '') +
                                circles +
                                icon +
                                '<text class="timer" text-anchor="middle" x="' + percentageX + '" y="' + percentageY + '" style="font-size: ' + settings.percentageTextSize + 'px; ' + additionalCss + ';' + settings.textAdditionalCss + '" fill="' + settings.fontColor + '">' +
                                '<tspan class="number">' + (settings.replacePercentageByText === null ? 0 : settings.replacePercentageByText) + '</tspan>' +
                                '<tspan class="percent">' + (settings.noPercentageSign || settings.replacePercentageByText !== null ? '' : '%') + '</tspan>' +
                                '</text>')
                        );

                    if (settings.multiPercentageLegend === 1) {
                        showLegend();
                    }
                } else {
                    circleContainer
                        .addClass('svg-container')
                        .append(
                            $('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="37 36.5 126 126" class="circle-stats-svg">' +
                                (typeof elements !== 'undefined' ? elements : '') +
                                '<circle cx="100" cy="100" r="57" class="border" fill="' + settings.fillColor + '" stroke="' + settings.backgroundColor + '" stroke-width="' + backgroundBorderWidth + '" stroke-dasharray="360" transform="rotate(-90,100,100)" />' +
                                '<circle class="circle" cx="100" cy="100" r="57" class="border" fill="none" stroke="' + settings.foregroundColor + '" stroke-width="' + settings.foregroundBorderWidth + '" stroke-dasharray="0,20000" transform="rotate(-90,100,100)" />' +
                                '<circle cx="100" cy="100" r="' + settings.pointSize + '" fill="' + settings.pointColor + '" />' +
                                icon +
                                '<text class="timer" text-anchor="middle" x="' + percentageX + '" y="' + percentageY + '" style="font-size: ' + settings.percentageTextSize + 'px; ' + additionalCss + ';' + settings.textAdditionalCss + '" fill="' + settings.fontColor + '">' +
                                '<tspan class="number">' + (settings.replacePercentageByText === null ? 0 : settings.replacePercentageByText) + '</tspan>' +
                                '<tspan class="percent">' + (settings.noPercentageSign || settings.replacePercentageByText !== null ? '' : '%') + '</tspan>' +
                                '</text>')
                        );
                }
            }

            /**
             * Show the legend only for multi percentage circles
             */
            function showLegend() {
                var height = circleContainer.height();
                var width = circleContainer.width();
                var percentages = settings.percentages;
                var index;
                var lines = '';
                for (index = 0; index < percentages.length; ++index) {
                    var title = percentages[index].title;
                    var color = percentages[index].color;
                    var percent = percentages[index].percent;

                    lines += '<div><span class="color-box" style="background: ' + color + '"></span>' + title + ', ' + percent + '%</div>';
                }

                circleContainer.append(
                    $('<div/>')
                        .append(lines)
                        .attr('style', 'position:absolute;top:' + height / 3 + 'px;left:' + (width + 20) + 'px')
                        .attr('class', 'legend-line')
                );
            }
        });
    }
}(jQuery));

//
// Bootbox
//

/**
 * bootbox.js 5.0.0
 *
 * http://bootboxjs.com/license.txt
 */
 (function (root, factory) {
   'use strict';
   if (typeof define === 'function' && define.amd) {
     // AMD
     define(['jquery'], factory);
   } else if (typeof exports === 'object') {
     // Node, CommonJS-like
     module.exports = factory(require('jquery'));
   } else {
     // Browser globals (root is window)
     root.bootbox = factory(root.jQuery);
   }
 }(this, function init($, undefined) {
   'use strict';

   //  Polyfills Object.keys, if necessary.
   //  @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
   if (!Object.keys) {
     Object.keys = (function () {
       var hasOwnProperty = Object.prototype.hasOwnProperty,
         hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
         dontEnums = [
           'toString',
           'toLocaleString',
           'valueOf',
           'hasOwnProperty',
           'isPrototypeOf',
           'propertyIsEnumerable',
           'constructor'
         ],
         dontEnumsLength = dontEnums.length;

       return function (obj) {
         if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
           throw new TypeError('Object.keys called on non-object');
         }

         var result = [], prop, i;

         for (prop in obj) {
           if (hasOwnProperty.call(obj, prop)) {
             result.push(prop);
           }
         }

         if (hasDontEnumBug) {
           for (i = 0; i < dontEnumsLength; i++) {
             if (hasOwnProperty.call(obj, dontEnums[i])) {
               result.push(dontEnums[i]);
             }
           }
         }

         return result;
       };
     }());
   }

   var exports = {};

   var VERSION = '5.0.0';
   exports.VERSION = VERSION;

   var locales = {};

   var templates = {
     dialog:
     '<div class="bootbox modal" tabindex="-1" role="dialog" aria-hidden="true">' +
     '<div class="modal-dialog">' +
     '<div class="modal-content">' +
     '<div class="modal-body"><div class="bootbox-body"></div></div>' +
     '</div>' +
     '</div>' +
     '</div>',
     header:
     '<div class="modal-header">' +
     '<h5 class="modal-title"></h5>' +
     '</div>',
     footer:
     '<div class="modal-footer"></div>',
     closeButton:
     '<button type="button" class="bootbox-close-button close" aria-hidden="true">&times;</button>',
     form:
     '<form class="bootbox-form"></form>',
     button:
     '<button type="button" class="btn"></button>',
     option:
     '<option></option>',
     promptMessage:
     '<div class="bootbox-prompt-message"></div>',
     inputs: {
       text:
       '<input class="bootbox-input bootbox-input-text form-control" autocomplete="off" type="text" />',
       textarea:
       '<textarea class="bootbox-input bootbox-input-textarea form-control"></textarea>',
       email:
       '<input class="bootbox-input bootbox-input-email form-control" autocomplete="off" type="email" />',
       select:
       '<select class="bootbox-input bootbox-input-select form-control"></select>',
       checkbox:
       '<div class="form-check checkbox"><label class="form-check-label"><input class="form-check-input bootbox-input bootbox-input-checkbox" type="checkbox" /></label></div>',
       radio:
       '<div class="form-check radio"><label class="form-check-label"><input class="form-check-input bootbox-input bootbox-input-radio" type="radio" name="bootbox-radio" /></label></div>',
       date:
       '<input class="bootbox-input bootbox-input-date form-control" autocomplete="off" type="date" />',
       time:
       '<input class="bootbox-input bootbox-input-time form-control" autocomplete="off" type="time" />',
       number:
       '<input class="bootbox-input bootbox-input-number form-control" autocomplete="off" type="number" />',
       password:
       '<input class="bootbox-input bootbox-input-password form-control" autocomplete="off" type="password" />',
       range:
       '<input class="bootbox-input bootbox-input-range form-control-range" autocomplete="off" type="range" />'
     }
   };


   var defaults = {
     // default language
     locale: 'en',
     // show backdrop or not. Default to static so user has to interact with dialog
     backdrop: 'static',
     // animate the modal in/out
     animate: true,
     // additional class string applied to the top level dialog
     className: null,
     // whether or not to include a close button
     closeButton: true,
     // show the dialog immediately by default
     show: true,
     // dialog container
     container: 'body',
     // default value (used by the prompt helper)
     value: '',
     // default input type (used by the prompt helper)
     inputType: 'text',
     // switch button order from cancel/confirm (default) to confirm/cancel
     swapButtonOrder: false,
     // center modal vertically in page
     centerVertical: false,
     // Append "multiple" property to the select when using the "prompt" helper
     multiple: false
   };


   // PUBLIC FUNCTIONS
   // *************************************************************************************************************

   // Return all currently registered locales, or a specific locale if "name" is defined
   exports.locales = function (name) {
     return name ? locales[name] : locales;
   };


   // Register localized strings for the OK, Confirm, and Cancel buttons
   exports.addLocale = function (name, values) {
     $.each(['OK', 'CANCEL', 'CONFIRM'], function (_, v) {
       if (!values[v]) {
         throw new Error('Please supply a translation for "' + v + '"');
       }
     });

     locales[name] = {
       OK: values.OK,
       CANCEL: values.CANCEL,
       CONFIRM: values.CONFIRM
     };

     return exports;
   };


   // Remove a previously-registered locale
   exports.removeLocale = function (name) {
     if (name !== 'en') {
       delete locales[name];
     }
     else {
       throw new Error('"en" is used as the default and fallback locale and cannot be removed.');
     }

     return exports;
   };


   // Set the default locale
   exports.setLocale = function (name) {
     return exports.setDefaults('locale', name);
   };


   // Override default value(s) of Bootbox.
   exports.setDefaults = function () {
     var values = {};

     if (arguments.length === 2) {
       // allow passing of single key/value...
       values[arguments[0]] = arguments[1];
     } else {
       // ... and as an object too
       values = arguments[0];
     }

     $.extend(defaults, values);

     return exports;
   };


   // Hides all currently active Bootbox modals
   exports.hideAll = function () {
     $('.bootbox').modal('hide');

     return exports;
   };


   // Allows the base init() function to be overridden
   exports.init = function (_$) {
     return init(_$ || $);
   };


   // CORE HELPER FUNCTIONS
   // *************************************************************************************************************

   // Core dialog function
   exports.dialog = function (options) {
     if ($.fn.modal === undefined) {
       throw new Error(
         '"$.fn.modal" is not defined; please double check you have included ' +
         'the Bootstrap JavaScript library. See http://getbootstrap.com/javascript/ ' +
         'for more details.'
       );
     }

     options = sanitize(options);

     if ($.fn.modal.Constructor.VERSION) {
       options.fullBootstrapVersion = $.fn.modal.Constructor.VERSION;
       var i = options.fullBootstrapVersion.indexOf('.');
       options.bootstrap = options.fullBootstrapVersion.substring(0, i);
     }
     else {
       // Assuming version 2.3.2, as that was the last "supported" 2.x version
       options.bootstrap = '2';
       options.fullBootstrapVersion = '2.3.2';
       console.warn('Bootbox will *mostly* work with Bootstrap 2, but we do not officially support it. Please upgrade, if possible.');
     }

     var dialog = $(templates.dialog);
     var innerDialog = dialog.find('.modal-dialog');
     var body = dialog.find('.modal-body');
     var header = $(templates.header);
     var footer = $(templates.footer);
     var buttons = options.buttons;

     var callbacks = {
       onEscape: options.onEscape
     };

     body.find('.bootbox-body').html(options.message);

     // Only attempt to create buttons if at least one has
     // been defined in the options object
     if (getKeyLength(options.buttons) > 0) {
       each(buttons, function (key, b) {
         var button = $(templates.button);
         button.data('bb-handler', key);
         button.addClass(b.className);

         switch(key)
         {
           case 'ok':
           case 'confirm':
             button.addClass('bootbox-accept');
             break;

           case 'cancel':
             button.addClass('bootbox-cancel');
             break;
         }

         button.html(b.label);
         footer.append(button);

         callbacks[key] = b.callback;
       });

       body.after(footer);
     }

     if (options.animate === true) {
       dialog.addClass('fade');
     }

     if (options.className) {
       dialog.addClass(options.className);
     }

     if (options.size) {
       // Requires Bootstrap 3.1.0 or higher
       if (options.fullBootstrapVersion.substring(0, 3) < '3.1') {
         console.warn('"size" requires Bootstrap 3.1.0 or higher. You appear to be using ' + options.fullBootstrapVersion + '. Please upgrade to use this option.');
       }

       if (options.size === 'large') {
         innerDialog.addClass('modal-lg');
       } else if (options.size === 'small') {
         innerDialog.addClass('modal-sm');
       }
     }

     if (options.title) {
       body.before(header);
       dialog.find('.modal-title').html(options.title);
     }

     if (options.closeButton) {
       var closeButton = $(templates.closeButton);

       if (options.title) {
         if (options.bootstrap > 3) {
           dialog.find('.modal-header').append(closeButton);
         }
         else {
           dialog.find('.modal-header').prepend(closeButton);
         }
       } else {
         closeButton.prependTo(body);
       }
     }

     if(options.centerVertical){
       // Requires Bootstrap 4.0.0-beta.3 or higher
       if (options.fullBootstrapVersion < '4.0.0') {
         console.warn('"centerVertical" requires Bootstrap 4.0.0-beta.3 or higher. You appear to be using ' + options.fullBootstrapVersion + '. Please upgrade to use this option.');
       }

       innerDialog.addClass('modal-dialog-centered');
     }

     // Bootstrap event listeners; these handle extra
     // setup & teardown required after the underlying
     // modal has performed certain actions.

     // make sure we unbind any listeners once the dialog has definitively been dismissed
       dialog.one('hide.bs.modal', function (e) {
         if (e.target === this) {
           dialog.off('escape.close.bb');
           dialog.off('click');
         }
     });

     dialog.one('hidden.bs.modal', function (e) {
       // ensure we don't accidentally intercept hidden events triggered
       // by children of the current dialog. We shouldn't need to handle this anymore,
       // now that Bootstrap namespaces its events, but still worth doing.
       if (e.target === this) {
         dialog.remove();
       }
     });

     dialog.one('shown.bs.modal', function () {
       dialog.find('.bootbox-accept:first').trigger('focus');
     });

     // Bootbox event listeners; used to decouple some
     // behaviours from their respective triggers

     if (options.backdrop !== 'static') {
       // A boolean true/false according to the Bootstrap docs
       // should show a dialog the user can dismiss by clicking on
       // the background.
       // We always only ever pass static/false to the actual
       // $.modal function because with "true" we can't trap
       // this event (the .modal-backdrop swallows it)
       // However, we still want to sort of respect true
       // and invoke the escape mechanism instead
       dialog.on('click.dismiss.bs.modal', function (e) {
         // @NOTE: the target varies in >= 3.3.x releases since the modal backdrop
         // moved *inside* the outer dialog rather than *alongside* it
         if (dialog.children('.modal-backdrop').length) {
           e.currentTarget = dialog.children('.modal-backdrop').get(0);
         }

         if (e.target !== e.currentTarget) {
           return;
         }

         dialog.trigger('escape.close.bb');
       });
     }

     dialog.on('escape.close.bb', function (e) {
       // the if statement looks redundant but it isn't; without it
       // if we *didn't* have an onEscape handler then processCallback
       // would automatically dismiss the dialog
       if (callbacks.onEscape) {
         processCallback(e, dialog, callbacks.onEscape);
       }
     });


     dialog.on('click', '.modal-footer button:not(.disabled)', function (e) {
       var callbackKey = $(this).data('bb-handler');

       processCallback(e, dialog, callbacks[callbackKey]);
     });

     dialog.on('click', '.bootbox-close-button', function (e) {
       // onEscape might be falsy but that's fine; the fact is
       // if the user has managed to click the close button we
       // have to close the dialog, callback or not
       processCallback(e, dialog, callbacks.onEscape);
     });

     dialog.on('keyup', function (e) {
       if (e.which === 27) {
         dialog.trigger('escape.close.bb');
       }
     });

     // the remainder of this method simply deals with adding our
     // dialogent to the DOM, augmenting it with Bootstrap's modal
     // functionality and then giving the resulting object back
     // to our caller

     $(options.container).append(dialog);

     dialog.modal({
       backdrop: options.backdrop ? 'static' : false,
       keyboard: false,
       show: false
     });

     if (options.show) {
       dialog.modal('show');
     }

     return dialog;
   };


   // Helper function to simulate the native alert() behavior. **NOTE**: This is non-blocking, so any
   // code that must happen after the alert is dismissed should be placed within the callback function
   // for this alert.
   exports.alert = function () {
     var options;

     options = mergeDialogOptions('alert', ['ok'], ['message', 'callback'], arguments);

     // @TODO: can this move inside exports.dialog when we're iterating over each
     // button and checking its button.callback value instead?
     if (options.callback && !$.isFunction(options.callback)) {
       throw new Error('alert requires the "callback" property to be a function when provided');
     }

     // override the ok and escape callback to make sure they just invoke
     // the single user-supplied one (if provided)
     options.buttons.ok.callback = options.onEscape = function () {
       if ($.isFunction(options.callback)) {
         return options.callback.call(this);
       }

       return true;
     };

     return exports.dialog(options);
   };


   // Helper function to simulate the native confirm() behavior. **NOTE**: This is non-blocking, so any
   // code that must happen after the confirm is dismissed should be placed within the callback function
   // for this confirm.
   exports.confirm = function () {
     var options;

     options = mergeDialogOptions('confirm', ['cancel', 'confirm'], ['message', 'callback'], arguments);

     // confirm specific validation; they don't make sense without a callback so make
     // sure it's present
     if (!$.isFunction(options.callback)) {
       throw new Error('confirm requires a callback');
     }

     // overrides; undo anything the user tried to set they shouldn't have
     options.buttons.cancel.callback = options.onEscape = function () {
       return options.callback.call(this, false);
     };

     options.buttons.confirm.callback = function () {
       return options.callback.call(this, true);
     };

     return exports.dialog(options);
   };


   // Helper function to simulate the native prompt() behavior. **NOTE**: This is non-blocking, so any
   // code that must happen after the prompt is dismissed should be placed within the callback function
   // for this prompt.
   exports.prompt = function () {
     var options;
     var promptDialog;
     var form;
     var input;
     var shouldShow;
     var inputOptions;

     // we have to create our form first otherwise
     // its value is undefined when gearing up our options
     // @TODO this could be solved by allowing message to
     // be a function instead...
     form = $(templates.form);

     // prompt defaults are more complex than others in that
     // users can override more defaults
     options = mergeDialogOptions('prompt', ['cancel', 'confirm'], ['title', 'callback'], arguments);

     if (!options.value) {
       options.value = defaults.value;
     }

     if (!options.inputType) {
       options.inputType = defaults.inputType;
     }

     // capture the user's show value; we always set this to false before
     // spawning the dialog to give us a chance to attach some handlers to
     // it, but we need to make sure we respect a preference not to show it
     shouldShow = (options.show === undefined) ? defaults.show : options.show;
     // This is required prior to calling the dialog builder below - we need to
     // add an event handler just before the prompt is shown
     options.show = false;

     // Handles the 'cancel' action
     options.buttons.cancel.callback = options.onEscape = function () {
       return options.callback.call(this, null);
     };

     // Prompt submitted - extract the prompt value. This requires a bit of work,
     // given the different input types available.
     options.buttons.confirm.callback = function () {
       var value;

       if (options.inputType === 'checkbox') {
         value = input.find('input:checked').map(function () {
           return $(this).val();
         }).get();
       } else if (options.inputType === 'radio') {
         value = input.find('input:checked').val();
       }
       else {
         if (input[0].checkValidity && !input[0].checkValidity()) {
           // prevents button callback from being called
           return false;
         } else {
           if (options.inputType === 'select' && options.multiple === true) {
             value = input.find('option:selected').map(function () {
               return $(this).val();
             }).get();
           }
           else{
             value = input.val();
           }
         }
       }

       return options.callback.call(this, value);
     };

     // prompt-specific validation
     if (!options.title) {
       throw new Error('prompt requires a title');
     }

     if (!$.isFunction(options.callback)) {
       throw new Error('prompt requires a callback');
     }

     if (!templates.inputs[options.inputType]) {
       throw new Error('Invalid prompt type');
     }

     // create the input based on the supplied type
     input = $(templates.inputs[options.inputType]);

     switch (options.inputType) {
       case 'text':
       case 'textarea':
       case 'email':
       case 'password':
         input.val(options.value);

         if (options.placeholder) {
           input.attr('placeholder', options.placeholder);
         }

         if (options.pattern) {
           input.attr('pattern', options.pattern);
         }

         if (options.maxlength) {
           input.attr('maxlength', options.maxlength);
         }

         if (options.required) {
           input.prop({ 'required': true });
         }

         break;


       case 'date':
       case 'time':
       case 'number':
       case 'range':
         input.val(options.value);

         if (options.placeholder) {
           input.attr('placeholder', options.placeholder);
         }

         if (options.pattern) {
           input.attr('pattern', options.pattern);
         }

         if (options.required) {
           input.prop({ 'required': true });
         }

         // These input types have extra attributes which affect their input validation.
         // Warning: For most browsers, date inputs are buggy in their implementation of 'step', so
         // this attribute will have no effect. Therefore, we don't set the attribute for date inputs.
         // @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date#Setting_maximum_and_minimum_dates
         if (options.inputType !== 'date') {
           if (options.step) {
             if (options.step === 'any' || (!isNaN(options.step) && parseInt(options.step) > 0)) {
               input.attr('step', options.step);
             }
             else {
               throw new Error('"step" must be a valid positive number or the value "any". See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-step for more information.');
             }
           }
         }

         if(minAndMaxAreValid(options.inputType, options.min, options.max)){
           if(options.min !== undefined){
             input.attr('min', options.min);
           }
           if(options.max !== undefined){
             input.attr('max', options.max);
           }
         }

         break;


       case 'select':
         var groups = {};
         inputOptions = options.inputOptions || [];

         if (!$.isArray(inputOptions)) {
           throw new Error('Please pass an array of input options');
         }

         if (!inputOptions.length) {
           throw new Error('prompt with "inputType" set to "select" requires at least one option');
         }

         // placeholder is not actually a valid attribute for select,
         // but we'll allow it, assuming it might be used for a plugin
         if (options.placeholder) {
           input.attr('placeholder', options.placeholder);
         }

         if (options.required) {
           input.prop({ 'required': true });
         }

         if (options.multiple) {
           input.prop({ 'multiple': true });
         }

         each(inputOptions, function (_, option) {
           // assume the element to attach to is the input...
           var elem = input;

           if (option.value === undefined || option.text === undefined) {
             throw new Error('each option needs a "value" property and a "text" property');
           }

           // ... but override that element if this option sits in a group

           if (option.group) {
             // initialise group if necessary
             if (!groups[option.group]) {
               groups[option.group] = $('<optgroup />').attr('label', option.group);
             }

             elem = groups[option.group];
           }

           var o = $(templates.option);
           o.attr('value', option.value).text(option.text);
           elem.append(o);
         });

         each(groups, function (_, group) {
           input.append(group);
         });

         // safe to set a select's value as per a normal input
         input.val(options.value);

         break;


       case 'checkbox':
         var checkboxValues = $.isArray(options.value) ? options.value : [options.value];
         inputOptions = options.inputOptions || [];

         if (!inputOptions.length) {
           throw new Error('prompt with "inputType" set to "checkbox" requires at least one option');
         }

         // checkboxes have to nest within a containing element, so
         // they break the rules a bit and we end up re-assigning
         // our 'input' element to this container instead
         input = $('<div class="bootbox-checkbox-list"></div>');

         each(inputOptions, function (_, option) {
           if (option.value === undefined || option.text === undefined) {
             throw new Error('each option needs a "value" property and a "text" property');
           }

           var checkbox = $(templates.inputs[options.inputType]);

           checkbox.find('input').attr('value', option.value);
           checkbox.find('label').append('\n' + option.text);

           // we've ensured values is an array so we can always iterate over it
           each(checkboxValues, function (_, value) {
             if (value === option.value) {
               checkbox.find('input').prop('checked', true);
             }
           });

           input.append(checkbox);
         });
         break;


       case 'radio':
         // Make sure that value is not an array (only a single radio can ever be checked)
         if (options.value !== undefined && $.isArray(options.value)) {
           throw new Error('prompt with "inputType" set to "radio" requires a single, non-array value for "value"');
         }

         inputOptions = options.inputOptions || [];

         if (!inputOptions.length) {
           throw new Error('prompt with "inputType" set to "radio" requires at least one option');
         }

         // Radiobuttons have to nest within a containing element, so
         // they break the rules a bit and we end up re-assigning
         // our 'input' element to this container instead
         input = $('<div class="bootbox-radiobutton-list"></div>');

         // Radiobuttons should always have an initial checked input checked in a "group".
         // If value is undefined or doesn't match an input option, select the first radiobutton
         var checkFirstRadio = true;

         each(inputOptions, function (_, option) {
           if (option.value === undefined || option.text === undefined) {
             throw new Error('each option needs a "value" property and a "text" property');
           }

           var radio = $(templates.inputs[options.inputType]);

           radio.find('input').attr('value', option.value);
           radio.find('label').append('\n' + option.text);

           if (options.value !== undefined) {
             if (option.value === options.value) {
               radio.find('input').prop('checked', true);
               checkFirstRadio = false;
             }
           }

           input.append(radio);
         });

         if (checkFirstRadio) {
           input.find('input[type="radio"]').first().prop('checked', true);
         }
         break;
     }

     // now place it in our form
     form.append(input);

     form.on('submit', function (e) {
       e.preventDefault();
       // Fix for SammyJS (or similar JS routing library) hijacking the form post.
       e.stopPropagation();

       // @TODO can we actually click *the* button object instead?
       // e.g. buttons.confirm.click() or similar
       promptDialog.find('.bootbox-accept').trigger('click');
     });

     if ($.trim(options.message) !== '') {
       // Add the form to whatever content the user may have added.
       var message = $(templates.promptMessage).html(options.message);
       form.prepend(message);
       options.message = form;
     }
     else {
       options.message = form;
     }

     // Generate the dialog
     promptDialog = exports.dialog(options);

     // clear the existing handler focusing the submit button...
     promptDialog.off('shown.bs.modal');

     // ...and replace it with one focusing our input, if possible
     promptDialog.on('shown.bs.modal', function () {
       // need the closure here since input isn't
       // an object otherwise
       input.focus();
     });

     if (shouldShow === true) {
       promptDialog.modal('show');
     }

     return promptDialog;
   };


   // INTERNAL FUNCTIONS
   // *************************************************************************************************************

   // Map a flexible set of arguments into a single returned object
   // If args.length is already one just return it, otherwise
   // use the properties argument to map the unnamed args to
   // object properties.
   // So in the latter case:
   //  mapArguments(["foo", $.noop], ["message", "callback"])
   //  -> { message: "foo", callback: $.noop }
   function mapArguments(args, properties) {
     var argn = args.length;
     var options = {};

     if (argn < 1 || argn > 2) {
       throw new Error('Invalid argument length');
     }

     if (argn === 2 || typeof args[0] === 'string') {
       options[properties[0]] = args[0];
       options[properties[1]] = args[1];
     } else {
       options = args[0];
     }

     return options;
   }


   //  Merge a set of default dialog options with user supplied arguments
   function mergeArguments(defaults, args, properties) {
     return $.extend(
       // deep merge
       true,
       // ensure the target is an empty, unreferenced object
       {},
       // the base options object for this type of dialog (often just buttons)
       defaults,
       // args could be an object or array; if it's an array properties will
       // map it to a proper options object
       mapArguments(
         args,
         properties
       )
     );
   }


   //  This entry-level method makes heavy use of composition to take a simple
   //  range of inputs and return valid options suitable for passing to bootbox.dialog
   function mergeDialogOptions(className, labels, properties, args) {
     var locale;
     if(args && args[0]){
       locale = args[0].locale || defaults.locale;
       var swapButtons = args[0].swapButtonOrder || defaults.swapButtonOrder;

       if(swapButtons){
         labels = labels.reverse();
       }
     }

     //  build up a base set of dialog properties
     var baseOptions = {
       className: 'bootbox-' + className,
       buttons: createLabels(labels, locale)
     };

     // Ensure the buttons properties generated, *after* merging
     // with user args are still valid against the supplied labels
     return validateButtons(
       // merge the generated base properties with user supplied arguments
       mergeArguments(
         baseOptions,
         args,
         // if args.length > 1, properties specify how each arg maps to an object key
         properties
       ),
       labels
     );
   }


   //  Checks each button object to see if key is valid.
   //  This function will only be called by the alert, confirm, and prompt helpers.
   function validateButtons(options, buttons) {
     var allowedButtons = {};
     each(buttons, function (key, value) {
       allowedButtons[value] = true;
     });

     each(options.buttons, function (key) {
       if (allowedButtons[key] === undefined) {
         throw new Error('button key "' + key + '" is not allowed (options are ' + buttons.join(' ') + ')');
       }
     });

     return options;
   }



   //  From a given list of arguments, return a suitable object of button labels.
   //  All this does is normalise the given labels and translate them where possible.
   //  e.g. "ok", "confirm" -> { ok: "OK", cancel: "Annuleren" }
   function createLabels(labels, locale) {
     var buttons = {};

     for (var i = 0, j = labels.length; i < j; i++) {
       var argument = labels[i];
       var key = argument.toLowerCase();
       var value = argument.toUpperCase();

       buttons[key] = {
         label: getText(value, locale)
       };
     }

     return buttons;
   }



   //  Get localized text from a locale. Defaults to 'en' locale if no locale
   //  provided or a non-registered locale is requested
   function getText(key, locale) {
     var labels = locales[locale];

     return labels ? labels[key] : locales.en[key];
   }



   //  Filter and tidy up any user supplied parameters to this dialog.
   //  Also looks for any shorthands used and ensures that the options
   //  which are returned are all normalized properly
   function sanitize(options) {
     var buttons;
     var total;

     if (typeof options !== 'object') {
       throw new Error('Please supply an object of options');
     }

     if (!options.message) {
       throw new Error('"message" option must not be null or an empty string.');
     }

     // make sure any supplied options take precedence over defaults
     options = $.extend({}, defaults, options);

     // no buttons is still a valid dialog but it's cleaner to always have
     // a buttons object to iterate over, even if it's empty
     if (!options.buttons) {
       options.buttons = {};
     }

     buttons = options.buttons;

     total = getKeyLength(buttons);

     each(buttons, function (key, button, index) {
       if ($.isFunction(button)) {
         // short form, assume value is our callback. Since button
         // isn't an object it isn't a reference either so re-assign it
         button = buttons[key] = {
           callback: button
         };
       }

       // before any further checks make sure by now button is the correct type
       if ($.type(button) !== 'object') {
         throw new Error('button with key "' + key + '" must be an object');
       }

       if (!button.label) {
         // the lack of an explicit label means we'll assume the key is good enough
         button.label = key;
       }

       if (!button.className) {
         var isPrimary = false;
         if(options.swapButtonOrder){
           isPrimary = index === 0;
         }
         else{
           isPrimary = index === total-1;
         }

         if (total <= 2 && isPrimary) {
           // always add a primary to the main option in a one or two-button dialog
           button.className = 'btn-primary';
         } else {
           // adding both classes allows us to target both BS3 and BS4 without needing to check the version
           button.className = 'btn-default';
         }
       }
     });

     return options;
   }


   //  Returns a count of the properties defined on the object
   function getKeyLength(obj) {
     return Object.keys(obj).length;
   }


   //  Tiny wrapper function around jQuery.each; just adds index as the third parameter
   function each(collection, iterator) {
     var index = 0;
     $.each(collection, function (key, value) {
       iterator(key, value, index++);
     });
   }


   //  Handle the invoked dialog callback
   function processCallback(e, dialog, callback) {
     e.stopPropagation();
     e.preventDefault();

     // by default we assume a callback will get rid of the dialog,
     // although it is given the opportunity to override this

     // so, if the callback can be invoked and it *explicitly returns false*
     // then we'll set a flag to keep the dialog active...
     var preserveDialog = $.isFunction(callback) && callback.call(dialog, e) === false;

     // ... otherwise we'll bin it
     if (!preserveDialog) {
       dialog.modal('hide');
     }
   }

   // Validate `min` and `max` values based on the current `inputType` value
   function minAndMaxAreValid(type, min, max){
     var result = false;
     var minValid = true;
     var maxValid = true;

     if (type === 'date') {
       if (min !== undefined && !(minValid = dateIsValid(min))) {
         console.warn('Browsers which natively support the "date" input type expect date values to be of the form "YYYY-MM-DD" (see ISO-8601 https://www.iso.org/iso-8601-date-and-time-format.html). Bootbox does not enforce this rule, but your min value may not be enforced by this browser.');
       }
       else if (max !== undefined && !(maxValid = dateIsValid(max))) {
         console.warn('Browsers which natively support the "date" input type expect date values to be of the form "YYYY-MM-DD" (see ISO-8601 https://www.iso.org/iso-8601-date-and-time-format.html). Bootbox does not enforce this rule, but your max value may not be enforced by this browser.');
       }
     }
     else if (type === 'time') {
       if (min !== undefined && !(minValid = timeIsValid(min))) {
         throw new Error('"min" is not a valid time. See https://www.w3.org/TR/2012/WD-html-markup-20120315/datatypes.html#form.data.time for more information.');
       }
       else if (max !== undefined && !(maxValid = timeIsValid(max))) {
         throw new Error('"max" is not a valid time. See https://www.w3.org/TR/2012/WD-html-markup-20120315/datatypes.html#form.data.time for more information.');
       }
     }
     else {
       if (min !== undefined && isNaN(min)) {
         throw new Error('"min" must be a valid number. See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-min for more information.');
       }

       if (max !== undefined && isNaN(max)) {
         throw new Error('"max" must be a valid number. See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-max for more information.');
       }
     }

     if(minValid && maxValid){
       if(max <= min){
         throw new Error('"max" must be greater than "min". See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-max for more information.');
       }
       else{
         result = true;
       }
     }

     return result;
   }

   function timeIsValid(value){
     return /([01][0-9]|2[0-3]):[0-5][0-9]?:[0-5][0-9]/.test(value);
   }

   function dateIsValid(value){
     return /(\d{4})-(\d{2})-(\d{2})/.test(value);
   }


   //  Register the default locale
   exports.addLocale('en', {
     OK: 'OK',
     CANCEL: 'Cancel',
     CONFIRM: 'OK'
   });


   //  The Bootbox object
   return exports;
 }));
