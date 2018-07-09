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
        var activeElem = $('.nav-scroller-content .active'),
            activeElemoffSet = activeElem.offset(),
            activeElemelemWidth = activeElem.outerWidth(),
            activeElemelemPosition = activeElemoffSet.left - activeElemelemWidth;
        $('.nav-scroller-nav').animate({scrollLeft: activeElemelemPosition}, 1000);
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

$(document).bind('scroll', function() {
	var $scrollPosition = $(document).scrollTop(),
        $pageHeader = $(".page-header"),
        $pageHeaderHeight = $pageHeader.height(),
        $navbarHeight = $(".navbar").height(),
        $contentDiv = $(".content"),
        $pageNav = $("#page-nav");
	if($pageNav.hasClass("nav-scroller") && $scrollPosition > 50) {
		$pageHeader.addClass("fixed-header");
        $contentDiv.css({'margin-top' : ($pageHeaderHeight + $navbarHeight) + 'px'});
	}else{
		$pageHeader.removeClass("fixed-header");
        $contentDiv.css({'margin-top' : '0px'});
	}
});


})();
