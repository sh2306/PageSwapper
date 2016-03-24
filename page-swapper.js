/************************************
 * Author: Sascha Hennemann
 * Last change: 24.03.2016 09:53
 *
 *
 * Requrires: $, modernizr, owl.carousel2
 *
 * License: GPL v3
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 ************************************/


var PageSwapper = function(args) {
    var win = window,
      doc = win.document,
      self = this,

      defaultArgs = {
          disableCache: false,
          debug: false,
          owlConfig: {},
          owlVersion: 2,
      },

      owlDefaultArgs = {
          margin: 20,
          mouseDrag: false,
          touchDrag: false,
      },
    // private vars
      container = null,
      host = 'http://' + win.location.host,
      currentUrl = win.location.href,
      hash = '',

    // private functions
      debug,
      loadComplete,
      checkHash,
      changeUrl,
      addIdPrefixes,
      removeIdPrefixes,
      finish,
      initFailed = false,
      init;


    init = function() {
        if (!win.$) {
            win.$ = $;
        }

        args = $.extend(defaultArgs, args);
        args.id = 'page-swapper';

        container = $($(args.container)[0]);

        if (container.is('body')) {
            // wrap all if container is body
            container.wrapInner('<div class="psw-body"></div>');
            container = container.find('> .psw-body');
        }

        // wrap current content with item
        container.wrapInner('<div class="tab psw-starttab psw-tab"></div>');


        // Set Click-Events to all <a>
        $('body').on('click', 'a:not(a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".gif"], a[href*=".JPG"], a[href*=".GIF"], a[href*=".PNG"], a[href*=".JPEG"])', self.linkClick);

        // pushstatechange -> backbutton
        $(win).on('popstate', function() {
            self.open(doc.location.href);
        });

        // arguments for owl
        var owlArgs = $.extend(owlDefaultArgs, args.owlConfig);
        owlArgs = $.extend(owlArgs, {
            items: 1,
            singleItem: true, // for owl 1
            autoHeight: true,
        });

        container.addClass('psw-container');

        // init owl
        try {
            container.owlCarousel(owlArgs);
        } catch(e) {
            initFailed = true;
            console.info('psw-init-error', e, container, owlArgs);
            return;
        }

        // add css and classes to first item
        var curTab = container.find('.psw-starttab');
        curTab.attr('data-url', win.location.href);
        curTab.data('title', doc.title);
        curTab.data('bodyclass', $('body').prop('class').replace('no-js', ''));

        debug('psw init', self, container, args);

        if (container.data('owl.carousel') && container.data('owl.carousel')._plugins &&
          container.data('owl.carousel')._plugins.autoHeight) {
            setInterval(function() {
                container.data('owl.carousel')._plugins.autoHeight.update();
            }, 300);
        }

        self.setClasses();
    };

    self.linkClick = function(event) {
        if (!event || !event.target || initFailed) {
            return;
        }

        // Find <a> from clicked element
        var clickedElement = $(event.target);
        if (!clickedElement.is('a')) {
            clickedElement = clickedElement.closest('a');
        }
        if (!clickedElement.prop('href')) {
            return;
        }
        if (clickedElement.hasClass('no-ajax')) {
            return;
        }

        var url = clickedElement.prop('href');
        if (url.indexOf(host) === -1) {
            // external -> return
            return;
        }
        if (url.indexOf('mailto:') !== -1) {
            return;
        }

        // Check for file-endings
        var filteredFileEndings = ['zip', 'exe', 'rar', 'pdf', 'doc', 'gif', 'png', 'jpg', 'jpeg', 'bmp', 'mp4', 'mp3'],
          fileEnding = url.split('.');
        fileEnding = fileEnding[fileEnding.length - 1];
        if ($.inArray(fileEnding, filteredFileEndings) !== -1) {
            return;
        }

        // Start Opening
        event.preventDefault();
        self.open(url, event);
    };

    /**
     * Opens a Url
     *
     * @param {type} url
     * @returns {undefined}
     */
    self.open = function(url, event) {
        var splittedUrl = url.split('#');
        hash = '';
        url = splittedUrl[0];
        if (typeof(splittedUrl[1]) !== 'undefined') {
            hash = splittedUrl[1];
        }

        // callback
        container.trigger('psw-beforeopen', {
            'container': container,
            'url': url,
            'hash': hash,
            'currentUrl': currentUrl,
            'clickEvent': event,
        });
        debug('psw beforeOpen', self, container, args, url, hash, currentUrl);

        if (currentUrl === url) {
            checkHash();
            return;
        }

        var cacheElement = container.find('.psw-tab[data-url="' + url + '"]');
        if (cacheElement.length > 0) {
            self.openFromCache(cacheElement, url);
            return;
        }

        $('body').removeClass('psw-finish-loading').addClass('psw-loading');

        $.ajax({
            dataType: 'text',
            type: 'GET',
            url: url,
            data: null,
            success: function(data, textStatus, jqXHR) {
                loadComplete(data, textStatus, url, jqXHR);
            },
            error: function() {
                $('body').removeClass('psw-loading');
                $('body').addClass('psw-loaderror');
                errorTimeout = setTimeout(function() {
                    $('body').removeClass('psw-loaderror');
                }, 1000);
            }
        });

        // callback
        container.trigger('psw-loadstart', {
            'container': container,
            'url': url,
            'hash': hash,
            'currentUrl': currentUrl
        });
        debug('psw loadstart', self, container, args, url, hash, currentUrl);
    };

    /**
     * Loading of page is complete
     *
     * @param {type} data
     * @param {type} textStatus
     * @param {type} url
     * @returns {undefined}
     */
    loadComplete = function(data, textStatus, url, jqXHR) {
        $('body').removeClass('psw-loading').addClass('psw-finish-loading');

        var newTab = $('<div class="tab psw-tab" />'),
          bodyClass = '';

        if (!jqXHR) {
            return false;
        }
        var contentHeader = jqXHR.getResponseHeader('Content-Type');
        if (contentHeader.indexOf('text/html') === -1) {
            return false;
        }

        debug('psw loadComplete', self, container, args, url, hash, currentUrl, jqXHR);


        var currentTab = self.getCurrent(),
          title = data.match(/<title>(.*?)<\/title>/);

        if (title && title[1]) {
            title = title[1];
        } else {
            title = '';
        }

        // Parse data
        data = data.replace('<body', '<body><div id="psw-body"').replace('</body>', '</div></body');
        var newHtml = $.parseHTML(data, true);
        newHtml = $(newHtml);

        if (newHtml.filter('#psw-body').length > 0) {
            // Add new class to body
            bodyClass = newHtml.filter('#psw-body').prop('class').replace('no-js', '');
            var oldClasses = $('body').prop('class');

            if (args.selector === 'body') {
                bodyClass += ' page-swapper ';
            }
            $('body').removeClass(oldClasses)
              .addClass(bodyClass);
        }

        var content = newHtml.find(args.selector);
        if (content.length === 0) {
            content = newHtml.filter('#psw-body');
        }

        // add tab to swapper
        if (args.owlVersion == 1) {
            // owl carousel 1
            container.data('owlCarousel').addItem(newTab);
            // owl1 removes all classes and data from items
            self.setClasses();
        } else {
            // owl carousel 2
            container.trigger('add.owl.carousel', newTab);
            container.trigger('refresh.owl.carousel');
        }

        // set new ids for prevent mulitple ids
        addIdPrefixes(currentTab);

        // add html to tab
        try {
            newTab.html(content.html());
        } catch(e) {
            content.find('script').remove();
            newTab.html(content.html());
        }

        changeUrl(url, title);

        // set url and title to data
        newTab.attr('data-url', url).data('title', title);
        newTab.data('bodyclass', bodyClass);
        newTab.parent().addClass('psw-item');

        // jump to tab on owl
        self.jumpTo(newTab.parent().index());

        finish(newTab.parent(), {
            'container': container,
            'oldTab': currentTab,
            'newTab': newTab.parent(),
            'url': url,
            'currentUrl': currentUrl
        });
    };

    /**
     * Jump to item that already exists
     *
     * @param element
     * @param url
     */
    self.openFromCache = function(element, url) {
        // remove-id-prefixes from newtab and add to oldtab
        var currentItem = self.getCurrent();
        addIdPrefixes(currentItem);
        removeIdPrefixes(element.parent());

        var oldHtml = element.html();
        element.empty().html(oldHtml); // for new js-parsing

        changeUrl(url, element.data('title'));

        debug('psw openFromCache', url, element);

        var bodyClass = element.data('bodyclass');
        if (args.selector === 'body') {
            bodyClass += ' page-swapper ';
        }
        $('body').removeClass($('body').prop('class'))
          .addClass(bodyClass);


        // callback
        finish(element.parent(), {
            'container': container,
            'oldTab': self.getCurrent(),
            'newTab': element.parent(),
            'url': url,
        });
    };

    /**
     * Finish all and change item in owlCarousel
     *
     * @param owlItem
     * @param callbackArgs
     */
    finish = function(owlItem, callbackArgs) {
        // callback
        container.trigger('psw-loadcomplete', callbackArgs);

        // jump to tab on owl
        self.jumpTo(owlItem.index());

        /**
         * Track ajax
         */
        if (typeof _gaq !== "undefined" && _gaq !== null) {
            _gaq.push(['_trackPageview', args.url]);
        }
        if (typeof(ga) !== 'undefined' && ga !== null) {
            ga('send', 'pageview', location.pathname);
        }
    };

    /**
     * Jumps to index in owl
     *
     * @param index
     */
    self.jumpTo = function(index) {
        if (args.owlVersion == 1) {
            container.data('owlCarousel').goTo(index); // v1
        } else {
            container.trigger('to.owl.carousel', index); // v2
        }
    };

    /**
     * Checks hash and scroll to hash-offset
     */
    checkHash = function() {
        debug('psw checkHash', self, container, args, hash, currentUrl);
        if (hash && $('#' + hash).length > 0) {
            $('html,body').animate({scrollTop: $('#' + hash).offset().top}, 600);
            hash = '';
        }
    };


    /**
     *  set new ids for prevent mulitple ids
     *
     * @param {type} tab
     * @returns {undefined}
     */
    addIdPrefixes = function(tab) {
        tab.find('*').each(function(index, element) {
            if (element.id.length > 0) {
                element.id = 'psw-rm-' + element.id;
            }
        });
    };

    /**
     *  remove new ids for prevent mulitple ids
     *
     * @param {type} tab
     * @returns {undefined}
     */
    removeIdPrefixes = function(tab) {
        tab.find('*').each(function(index, element) {
            if (element.id.length > 0) {
                element.id = element.id.replace('psw-rm-', '');
            }
        });
    };


    /**
     * Set classes for container and items
     */
    self.setClasses = function() {
        // add psw-classes
        container.addClass('psw-container');
        container.addClass('owl-carousel');
        container.find('> .owl-stage-outer, > .owl-wrapper-outer').addClass('psw-stage-outer');
        container.find('> .owl-stage-outer > .owl-stage, > .owl-wrapper-outer > .owl-wrapper').addClass('psw-stage');

        // add element classes
        container.find('.psw-stage > .owl-item').addClass('psw-item');
    };

    /**
     * return the current element
     *
     * @returns {*}
     */
    self.getCurrent = function() {
        var curTab;
        if (args.owlVersion == 1) {
            curTab = container.find('.psw-item:nth-child(' + container.data('owlCarousel').currentItem + ')');
        } else {
            curTab = container.find('.psw-item.active')
        }

        return curTab;
    };

    changeUrl = function(url, title) {
        currentUrl = url;
        // change pushstate
        if (win.history && typeof(win.history.pushState) !== 'undefined') {
            // pushState({  Params }, Title, Path);
            win.history.pushState({}, title, url);
            doc.title = title;
        }
    };

    /**
     * Use only of you know what you do
     *
     * @param url
     */
    self.changeCurrentUrl = function(url) {
        currentUrl = url;
    };

    debug = function() {
        if (args.debug) {
            console.info(arguments);
        }
    };

    /**
     * Sets debug-mode
     *
     * @returns {undefined}
     */
    self._debug = function(debug) {
        args.debug = debug;
    };

    init();
};

$.fn.pageSwapper = function(args) {
    if (typeof(args) === 'undefined') {
        args = {};
    }
    args.selector = this.selector;
    this.each(function(index, element) {
        if (typeof(document.pageSwapperInstance) === 'undefined') {
            args.container = $(element);
            document.pageSwapperInstance = new PageSwapper(args);
        }
    });
};