//
// Optiscroll
//

!function(E,y,C,o){"use strict";var i=function t(e,i){return new t.Instance(e,i||{})},c=i.globalSettings={scrollMinUpdateInterval:25,checkFrequency:1e3,pauseCheck:!1};i.defaults={preventParentScroll:!1,forceScrollbars:!1,scrollStopDelay:300,maxTrackSize:95,minTrackSize:5,draggableTracks:!0,autoUpdate:!0,classPrefix:"optiscroll-",wrapContent:!0,rtl:!1},(i.Instance=function(t,e){this.element=t,this.settings=S(S({},i.defaults),e||{}),"boolean"!=typeof e.rtl&&(this.settings.rtl="rtl"===E.getComputedStyle(t).direction),this.cache={},this.init()}).prototype={init:function(){var t=this.element,e=this.settings,i=!1,l=this.scrollEl=e.wrapContent?u.createWrapper(t):t.firstElementChild;T(l,e.classPrefix+"content",!0),T(t,"is-enabled"+(e.rtl?" is-rtl":""),!0),this.scrollbars={v:s("v",this),h:s("h",this)},(w.scrollbarSpec.width||e.forceScrollbars)&&(i=u.hideNativeScrollbars(l,e.rtl)),i&&h(this.scrollbars,"create"),w.isTouch&&e.preventParentScroll&&T(t,e.classPrefix+"prevent",!0),this.update(),this.bind(),e.autoUpdate&&w.instances.push(this),e.autoUpdate&&!w.checkTimer&&u.checkLoop()},bind:function(){var l,s,n,r,t=this.listeners={},e=this.scrollEl;for(var i in t.scroll=(l=a.scroll.bind(this),s=c.scrollMinUpdateInterval,function(){var t=this,e=Date.now(),i=arguments;n&&e<n+s?(clearTimeout(r),r=setTimeout(function(){n=e,l.apply(t,i)},s)):(n=e,l.apply(t,i))}),w.isTouch&&(t.touchstart=a.touchstart.bind(this),t.touchend=a.touchend.bind(this)),t.mousewheel=t.wheel=a.wheel.bind(this),t)e.addEventListener(i,t[i],w.passiveEvent)},update:function(){var t=this.scrollEl,e=this.cache,i=e.clientH,l=t.scrollHeight,s=t.clientHeight,n=t.scrollWidth,r=t.clientWidth;if(l!==e.scrollH||s!==e.clientH||n!==e.scrollW||r!==e.clientW){if(e.scrollH=l,e.clientH=s,e.scrollW=n,e.clientW=r,i!==o){if(0===l&&0===s&&!y.body.contains(this.element))return this.destroy(),!1;this.fireCustomEvent("sizechange")}h(this.scrollbars,"update")}},scrollTo:function(t,e,i){var l,s,n,r,o=this.cache;w.pauseCheck=!0,this.update(),l=this.scrollEl.scrollLeft,s=this.scrollEl.scrollTop,n=+t,"left"===t&&(n=0),"right"===t&&(n=o.scrollW-o.clientW),!1===t&&(n=l),r=+e,"top"===e&&(r=0),"bottom"===e&&(r=o.scrollH-o.clientH),!1===e&&(r=s),this.animateScroll(l,n,s,r,+i)},scrollIntoView:function(t,e,i){var l,s,n,r,o,c,a,h,u,p,d,f,v=this.scrollEl;w.pauseCheck=!0,this.update(),"string"==typeof t?t=v.querySelector(t):t.length&&t.jquery&&(t=t[0]),"number"==typeof i&&(i={top:i,right:i,bottom:i,left:i}),i=i||{},l=t.getBoundingClientRect(),s=v.getBoundingClientRect(),u=d=v.scrollLeft,p=f=v.scrollTop,a=u+l.left-s.left,h=p+l.top-s.top,n=a-(i.left||0),r=h-(i.top||0),n<u&&(d=n),u<(o=a+l.width-this.cache.clientW+(i.right||0))&&(d=o),r<p&&(f=r),p<(c=h+l.height-this.cache.clientH+(i.bottom||0))&&(f=c),this.animateScroll(u,d,p,f,+e)},animateScroll:function(l,s,n,r,o){var c=this,a=this.scrollEl,h=Date.now();if(s!==l||r!==n){if(0===o)return a.scrollLeft=s,void(a.scrollTop=r);isNaN(o)&&(o=15*C.pow(C.max(C.abs(s-l),C.abs(r-n)),.54)),function t(){var e=C.min(1,(Date.now()-h)/o),i=u.easingFunction(e);r!==n&&(a.scrollTop=~~(i*(r-n))+n),s!==l&&(a.scrollLeft=~~(i*(s-l))+l),c.scrollAnimation=e<1?E.requestAnimationFrame(t):null}()}},destroy:function(){var t,e=this,i=this.element,l=this.scrollEl,s=this.listeners;if(this.scrollEl){for(var n in s)l.removeEventListener(n,s[n]);if(h(this.scrollbars,"remove"),!this.settings.contentElement){for(;t=l.childNodes[0];)i.insertBefore(t,l);i.removeChild(l),this.scrollEl=null}T(i,this.settings.classPrefix+"prevent",!1),T(i,"is-enabled",!1),E.requestAnimationFrame(function(){var t=w.instances.indexOf(e);-1<t&&w.instances.splice(t,1)})}},fireCustomEvent:function(t){var e,i,l=this.cache,s=l.scrollH,n=l.scrollW;e={scrollbarV:S({},l.v),scrollbarH:S({},l.h),scrollTop:l.v.position*s,scrollLeft:l.h.position*n,scrollBottom:(1-l.v.position-l.v.size)*s,scrollRight:(1-l.h.position-l.h.size)*n,scrollWidth:n,scrollHeight:s,clientWidth:l.clientW,clientHeight:l.clientH},"function"==typeof CustomEvent?i=new CustomEvent(t,{detail:e}):(i=y.createEvent("CustomEvent")).initCustomEvent(t,!1,!1,e),this.element.dispatchEvent(i)}};var t,e,a={scroll:function(t){w.pauseCheck||this.fireCustomEvent("scrollstart"),w.pauseCheck=!0,this.scrollbars.v.update(),this.scrollbars.h.update(),this.fireCustomEvent("scroll"),clearTimeout(this.cache.timerStop),this.cache.timerStop=setTimeout(a.scrollStop.bind(this),this.settings.scrollStopDelay)},touchstart:function(t){w.pauseCheck=!1,this.scrollbars.v.update(),this.scrollbars.h.update(),a.wheel.call(this,t)},touchend:function(t){clearTimeout(this.cache.timerStop)},scrollStop:function(){this.fireCustomEvent("scrollstop"),w.pauseCheck=!1},wheel:function(t){var e=this.cache,i=e.v,l=e.h,s=this.settings.preventParentScroll&&w.isTouch;E.cancelAnimationFrame(this.scrollAnimation),s&&i.enabled&&i.percent%100==0&&(this.scrollEl.scrollTop=i.percent?e.scrollH-e.clientH-1:1),s&&l.enabled&&l.percent%100==0&&(this.scrollEl.scrollLeft=l.percent?e.scrollW-e.clientW-1:1)}},s=function(e,i){var r="v"===e,l=i.element,o=i.scrollEl,c=i.settings,a=i.cache,n=a[e]={},t=r?"H":"W",h="client"+t,u="scroll"+t,p=r?"scrollTop":"scrollLeft",s=r?["top","bottom"]:["left","right"],d=/^(mouse|touch|pointer)/,f=w.scrollbarSpec.rtl,v=!1,m=null,g=null,b={dragData:null,dragStart:function(t){t.preventDefault();var e=t.touches?t.touches[0]:t;b.dragData={x:e.pageX,y:e.pageY,scroll:o[p]},b.bind(!0,t.type.match(d)[1])},dragMove:function(t){var e,i=t.touches?t.touches[0]:t,l=c.rtl&&1===f&&!r?-1:1;t.preventDefault(),e=(r?i.pageY-b.dragData.y:i.pageX-b.dragData.x)/a[h],o[p]=b.dragData.scroll+e*a[u]*l},dragEnd:function(t){b.dragData=null,b.bind(!1,t.type.match(d)[1])},bind:function(t,e){var i=(t?"add":"remove")+"EventListener",l=e+"move",s=e+("touch"===e?"end":"up");y[i](l,b.dragMove),y[i](s,b.dragEnd),y[i](e+"cancel",b.dragEnd)}};return{toggle:function(t){v=t,g&&T(l,"has-"+e+"track",v),n.enabled=v},create:function(){(m=y.createElement("div"),g=y.createElement("b"),m.className=c.classPrefix+e,g.className=c.classPrefix+e+"track",m.appendChild(g),l.appendChild(m),c.draggableTracks)&&(E.PointerEvent?["pointerdown"]:["touchstart","mousedown"]).forEach(function(t){g.addEventListener(t,b.dragStart)})},update:function(){var t,e,i,l,s;(v||a[h]!==a[u])&&(t=(i=this.calc()).size,e=n.size,l=1/t*i.position*100,s=C.abs(i.position-(n.position||0))*a[h],1===t&&v&&this.toggle(!1),t<1&&!v&&this.toggle(!0),g&&v&&this.style(l,s,t,e),n=S(n,i),v&&this.fireEdgeEv())},style:function(t,e,i,l){i!==l&&(g.style[r?"height":"width"]=100*i+"%",c.rtl&&!r&&(g.style.marginRight=100*(1-i)+"%")),g.style[w.cssTransform]="translate("+(r?"0%,"+t+"%":t+"%,0%")+")"},calc:function(){var t,e=o[p],i=a[h],l=a[u],s=i/l,n=l-i;return 1<=s||!l?{position:0,size:1,percent:0}:(!r&&c.rtl&&f&&(e=n-e*f),t=100*e/n,e<=1&&(t=0),n-1<=e&&(t=100),s=C.max(s,c.minTrackSize/100),{position:t/100*(1-(s=C.min(s,c.maxTrackSize/100))),size:s,percent:t})},fireEdgeEv:function(){var t=n.percent;n.was!==t&&t%100==0&&(i.fireCustomEvent("scrollreachedge"),i.fireCustomEvent("scrollreach"+s[t/100])),n.was=t},remove:function(){this.toggle(!1),m&&(m.parentNode.removeChild(m),m=null)}}},u={hideNativeScrollbars:function(t,e){var i=w.scrollbarSpec.width,l=t.style;if(0===i){var s=Date.now();return t.setAttribute("data-scroll",s),u.addCssRule('[data-scroll="'+s+'"]::-webkit-scrollbar',"display:none;width:0;height:0;")}return l[e?"left":"right"]=-i+"px",l.bottom=-i+"px",!0},addCssRule:function(t,e){var i=y.getElementById("scroll-sheet");i||((i=y.createElement("style")).id="scroll-sheet",i.appendChild(y.createTextNode("")),y.head.appendChild(i));try{return i.sheet.insertRule(t+" {"+e+"}",0),!0}catch(t){return}},createWrapper:function(t,e){for(var i,l=y.createElement("div");i=t.childNodes[0];)l.appendChild(i);return t.appendChild(l)},checkLoop:function(){w.instances.length?(w.pauseCheck||h(w.instances,"update"),c.checkFrequency&&(w.checkTimer=setTimeout(function(){u.checkLoop()},c.checkFrequency))):w.checkTimer=null},easingFunction:function(t){return--t*t*t+1}},w=i.G={isTouch:"ontouchstart"in E,cssTransition:l("transition"),cssTransform:l("transform"),scrollbarSpec:function(){var t,e,i=y.documentElement,l=0,s=1;(t=y.createElement("div")).style.cssText="overflow:scroll;width:50px;height:50px;position:absolute;left:-100px;direction:rtl",(e=y.createElement("div")).style.cssText="width:100px;height:100px",t.appendChild(e),i.appendChild(t),l=t.offsetWidth-t.clientWidth,0<t.scrollLeft?s=0:(t.scrollLeft=1,0===t.scrollLeft&&(s=-1));return i.removeChild(t),{width:l,rtl:s}}(),passiveEvent:(t=!1,e=Object.defineProperty({},"passive",{get:function(){t=!0}}),E.addEventListener("test",null,e),!!t&&{capture:!1,passive:!0}),instances:[],checkTimer:null,pauseCheck:!1};function l(t){var e=t.charAt(0).toUpperCase()+t.slice(1),i=y.createElement("test"),l=[t,"Webkit"+e];for(var s in l)if(i.style[l[s]]!==o)return l[s];return""}function T(t,e,i){var l=t.className.split(/\s+/),s=l.indexOf(e);i?~s||l.push(e):~s&&l.splice(s,1),t.className=l.join(" ")}function S(t,e,i){for(var l in e)!e.hasOwnProperty(l)||t[l]!==o&&i||(t[l]=e[l]);return t}function h(t,e,i){var l,s;if(t.length)for(l=0,s=t.length;l<s;l++)t[l][e].apply(t[l],i);else for(l in t)t[l][e].apply(t[l],i)}"function"==typeof define&&define.amd&&define(function(){return i}),"undefined"!=typeof module&&module.exports&&(module.exports=i),E.Optiscroll=i}(window,document,Math),function(n){var r="optiscroll";n.fn[r]=function(i){var l,s;return"string"==typeof i&&(s=Array.prototype.slice.call(arguments),l=s.shift()),this.each(function(){var t=n(this),e=t.data(r);e?e&&"string"==typeof l&&(e[l].apply(e,s),"destroy"===l&&t.removeData(r)):(e=new window.Optiscroll(this,i||{}),t.data(r,e))})}}(jQuery||Zepto);

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
//   navSelector: '.nav-scroller-nav',
//   contentSelector: '.nav-scroller-content',
//   itemSelector: '.nav-scroller-item',
//   buttonLeftSelector: '.nav-scroller-btn-left',
//   buttonRightSelector: '.nav-scroller-btn-right',
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
      navSelector = _ref$navSelector === undefined ? '.nav-scroller-nav' : _ref$navSelector,
      _ref$contentSelector = _ref.contentSelector,
      contentSelector = _ref$contentSelector === undefined ? '.nav-scroller-content' : _ref$contentSelector,
      _ref$itemSelector = _ref.itemSelector,
      itemSelector = _ref$itemSelector === undefined ? '.nav-scroller-item' : _ref$itemSelector,
      _ref$buttonLeftSelect = _ref.buttonLeftSelector,
      buttonLeftSelector = _ref$buttonLeftSelect === undefined ? '.nav-scroller-btn-left' : _ref$buttonLeftSelect,
      _ref$buttonRightSelec = _ref.buttonRightSelector,
      buttonRightSelector = _ref$buttonRightSelec === undefined ? '.nav-scroller-btn-right' : _ref$buttonRightSelec,
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
