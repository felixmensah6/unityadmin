(function() {

  "use strict";

//
// Show or Hide Sidebar
//

$(".navbar-toggler").click(function() {
  	$(".sidebar").toggleClass("toggle-sidebar");
});


//
// Optiscroll
//

var $sidebarCont = $('.sidebar-content'),
    $element = $('.sidebar-nav .active'),
    $sidebarHeight = $(window).height() / 2;
$sidebarCont.optiscroll();
$sidebarCont.optiscroll('scrollIntoView', $element, 'auto', $sidebarHeight);


//
// Priority Nav Scroller
//

function showActiveNav(){
    if($("#page-nav").hasClass("nav-scroller")) {
        var activeElem = $('.ns-content .active'),
            activeElemoffSet = activeElem.position(),
            totalElementPadding = 50,
            currentPosition = activeElemoffSet + totalElementPadding;

        $('.ns-nav').animate({scrollLeft: activeElemoffSet.left-48}, 1000);
    }
}

// Initialize function on page load
showActiveNav();

// Initialize function on window resize
var resizeId;
$(window).resize(function() {
    clearTimeout(resizeId);
    resizeId = setTimeout(showActiveNav, 500);
});


//
// Fixed Page Nav on Scroll
//

$(document).on('scroll', function() {
	var $scrollPosition = $(document).scrollTop(),
        $pageHeader = $(".page-header"),
        $pageHeaderHeight = $pageHeader.height(),
        $navbarHeight = $(".navbar").height(),
        $pageTitleHeight = $(".page-title").outerHeight(),
        $contentDiv = $(".content"),
        $pageNav = $("#page-nav");
	if($pageNav.hasClass("nav-scroller") && $scrollPosition > ($pageTitleHeight - 2)) {
		$pageHeader.addClass("fixed-header");
        $contentDiv.css({'margin-top' : ($pageHeaderHeight + $navbarHeight + 24) + 'px'});
	}else{
		$pageHeader.removeClass("fixed-header");
        $contentDiv.css({'margin-top' : '0px'});
	}
});

//
// Show or Hide Password
//

$(".password-toggle").click(function() {
    var passwordInput = $('[data-toggle="password"]').closest('input'),
        toggleIcon = $('.password-toggle i'),
        showIconClass = 'line-icon-eye',
        hideIconClass = 'line-icon-eye-slash';

    if (passwordInput.attr('type') === 'password') {
        toggleIcon.removeClass(showIconClass).addClass(hideIconClass).attr('title', 'Hide Password');
        passwordInput.attr('type', 'text');
    } else {
        toggleIcon.removeClass(hideIconClass).addClass(showIconClass).attr('title', 'Show Password');
        passwordInput.attr('type', 'password');
    }
});

//
// Tooltips & Popovers
//

$('[data-toggle="tooltip"]').tooltip({
    container: '.wrapper'
});

$('[data-toggle="popover"]').popover({
    container: '.wrapper'
});

//
// Bootsrap Modals
// Fix navbar shifting when modal is fired
//

var modal = $('.modal'),
    navbar = $('.navbar'),
    zoomed = $('.modal.zoom');

modal.on('show.bs.modal', function (e) {
    navbar.toggleClass('modal-fix');
})

modal.on('hide.bs.modal', function (e) {
    zoomed.toggleClass('zoomed');
})

modal.on('hidden.bs.modal', function (e) {
    navbar.toggleClass('modal-fix');
    setTimeout( () => zoomed.toggleClass('zoomed'), 200);
})

//
// Auto SlideUp & Close
//

setInterval(function(){
    var target = $('[data-auto-close]'),
        targetValue = target.attr('data-auto-close'),
        delay = targetValue * 1000;
	target.delay(delay).slideUp("slow", function(){
		$(this).remove();
	});
}, 5000);

//
// Check For Changes in Columns
//

$('.columns').on("DOMSubtreeModified",function(){
    var twoColumnCount = $(".column-sm-2 .column-item, .column-md-2 .column-item, .column-lg-2 .column-item, .column-xl-2   .column-item").length,
        threeColumnCount = $(".column-sm-3 .column-item, .column-md-3 .column-item, .column-lg-3 .column-item, .column-xl-3 .column-item").length,
        parentColumn = $(".column-item").parent();

    if(twoColumnCount === 1 || threeColumnCount === 1){
        parentColumn.addClass('column-reset-1');
        parentColumn.removeClass('column-reset-2');
    }else if(threeColumnCount === 2){
        parentColumn.addClass('column-reset-2');
        parentColumn.removeClass('column-reset-1');
    }else{
        parentColumn.removeClass('column-reset-1 column-reset-2');
    }
});



})();
