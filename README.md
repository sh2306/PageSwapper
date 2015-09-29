# PageSwapper

Requires jQuery and owlCarousel
http://jquery.com/
http://www.owlcarousel.owlgraphic.com/

Init
===
```
$('body').pageSwapper({
    owlConfig: {
        animateOut: 'zoomOut',
        animateIn: 'zoomIn',
    }
});
```
Creates a zoomIn/Out transition on every paging.
In animate the hole body, but you can use every class or id instead.
Make sure these element is available on every page.

OwlCarousel
---
You can use all options from owl-carousel, except autoHeight and items.
If you add animate.css, you have a lot more animations available:
http://daneden.github.io/animate.css/


Callbacks
===
```
	psw-beforeopen -> Before opening a new url
	psw-loadstart -> After begin of ajax-request (not fired if loading from cache)
	psw-loadcomplete -> After loading is complete (not fired if loading from cache)
```

Usage
---
```
	jQuery('.selector').on('callback-name', function(e, args) {
		console.info(args);
	});
```

args has the following information:
---
	'container' : container,
	'oldTab' : currentTab,
	'newTab' : newTab,
	'url': url
	'currentUrl' : currentUrl