/**
 * analytics.js
 *
 * Wrap GA and check for user consent before loading it.
 */

(function (w, d) {
    "use strict";

    var loadAnalytics, doNotTrack, ga;

    ga = function () {
        if (!ga.q) {
            ga.q = [];
        }
        ga.q.push(arguments);
    };

    ga.l = new Date().getTime();

    /**
     * Inject Google's analytics.js script.
     */
    loadAnalytics = function () {
        var s, n;
        s = d.createElement('script');
        n = d.getElementsByTagName('script')[0];
        s.async = 1;
        s.src = '//www.google-analytics.com/analytics.js';
        n.parentNode.insertBefore(s, n);
    };

    /**
     * Check wether people want to be tracked or not.
     *
     * @return {Boolean}
     */
    doNotTrack = function () {
        var button;

        if (!!w.navigator.doNotTrack || d.cookie.indexOf('dnt') !== -1) {
            return true;
        }
        if (d.location.hash.indexOf('dnt') !== -1) {
            button = d.createElement('button');
            button.className = 'dnt-button';
            button.innerHTML = 'Remember DNT preference by setting a cookie';
            button.addEventListener('click', function () {
                d.cookie = 'dnt=1; expires=Fri, 31 Dec 9999 23:59:59 GMT';
                d.body.removeChild(button);
            });
            d.body.appendChild(button);

            return true;
        }
        return false;
    };

    if (!doNotTrack()) {
        loadAnalytics();
    } else {
        console.info('Not loading analytics as per user preference.');
    }

    w.GoogleAnalyticsObject = 'ga';
    w.ga = ga;

    ga('create', 'UA-50657908-2', 'ju.io');
    ga('require', 'displayfeatures');
    ga('send', 'pageview');

}(window, document));
