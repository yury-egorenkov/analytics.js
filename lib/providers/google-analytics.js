// https://developers.google.com/analytics/devguides/collection/gajs/

var Provider  = require('../provider');
var each = require('each');
var is = require('is');
var load = require('load-script');
var type = require('type');
var url = require('url');
var canonical = require('canonical');


module.exports = Provider.extend({

  name : 'Google Analytics',

  key : 'trackingId',

  defaults : {
    // Whether to anonymize the IP address collected for the user.
    anonymizeIp : false,
    // An optional domain setting, to restrict where events can originate from.
    domain : null,
    // Whether to enable GOogle's DoubleClick remarketing feature.
    doubleClick : false,
    // Whether to use Google Analytics's Enhanced Link Attribution feature:
    // http://support.google.com/analytics/bin/answer.py?hl=en&answer=2558867
    enhancedLinkAttribution : false,
    // A domain to ignore for referrers. Maps to _addIgnoredRef
    ignoreReferrer : null,
    // Whether or not to track and initial pageview when initialized.
    initialPageview : true,
    // The setting to use for Google Analytics's Site Speed Sample Rate feature:
    // https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiBasicConfiguration#_gat.GA_Tracker_._setSiteSpeedSampleRate
    siteSpeedSampleRate : null,
    // Your Google Analytics Tracking ID.
    trackingId : null,
    // Whether you're using the new Universal Analytics or not.
    universalClient: false
  },

  initialize : function (options, ready) {
    if (options.universalClient) this.initializeUniversal(options, ready);
    else this.initializeClassic(options, ready);
  },

  initializeClassic: function (options, ready) {
    window._gaq = window._gaq || [];
    window._gaq.push(['_setAccount', options.trackingId]);

    // Apply a bunch of optional settings.
    if (options.domain) {
      window._gaq.push(['_setDomainName', options.domain]);
    }
    if (options.enhancedLinkAttribution) {
      var protocol = 'https:' === document.location.protocol ? 'https:' : 'http:';
      var pluginUrl = protocol + '//www.google-analytics.com/plugins/ga/inpage_linkid.js';
      window._gaq.push(['_require', 'inpage_linkid', pluginUrl]);
    }
    if (type(options.siteSpeedSampleRate) === 'number') {
      window._gaq.push(['_setSiteSpeedSampleRate', options.siteSpeedSampleRate]);
    }
    if (options.anonymizeIp) {
      window._gaq.push(['_gat._anonymizeIp']);
    }
    var ignored = options.ignoreReferrer;
    if (ignored) {
      if (!is.array(ignored)) ignored = [ignored];
      each(ignored, function (domain) {
        window._gaq.push(['_addIgnoredRef', domain]);
      });
    }
    if (options.initialPageview) {
      var path, canon = canonical();
      if (canon) path = url.parse(canon).pathname;
      this.pageview(path);
    }

    // URLs change if DoubleClick is on. Even though Google Analytics makes a
    // queue, the `_gat` object isn't available until the library loads.
    if (options.doubleClick) {
      load('//stats.g.doubleclick.net/dc.js', ready);
    } else {
      load({
        http  : 'http://www.google-analytics.com/ga.js',
        https : 'https://ssl.google-analytics.com/ga.js'
      }, ready);
    }
  },

  initializeUniversal: function (options, ready) {

    // GA-universal lets you set your own queue name
    var global = this.global = 'ga';

    // and needs to know about this queue name in this special object
    // so that future plugins can also operate on the object
    window['GoogleAnalyticsObject'] = global;

    // setup the global variable
    window[global] = window[global] || function () {
      (window[global].q = window[global].q || []).push(arguments);
    };

    // GA also needs to know the current time (all from their snippet)
    window[global].l = 1 * new Date();

    var createOpts = {};

    // Apply a bunch of optional settings.
    if (options.domain)
      createOpts.cookieDomain = options.domain || 'none';
    if (type(options.siteSpeedSampleRate) === 'number')
      createOpts.siteSpeedSampleRate = options.siteSpeedSampleRate;
    if (options.anonymizeIp)
      ga('set', 'anonymizeIp', true);

    ga('create', options.trackingId, createOpts);

    if (options.initialPageview) {
      var path, canon = canonical();
      if (canon) path = url.parse(canon).pathname;
      this.pageview(path);
    }

    load('//www.google-analytics.com/analytics.js');

    // Google makes a queue so it's ready immediately.
    ready();
  },

  track : function (event, properties) {
    properties || (properties = {});

    var value;

    // Since value is a common property name, ensure it is a number and Google
    // requires that it be an integer.
    if (type(properties.value) === 'number') value = Math.round(properties.value);

    // Try to check for a `category` and `label`. A `category` is required,
    // so if it's not there we use `'All'` as a default. We can safely push
    // undefined if the special properties don't exist. Try using revenue
    // first, but fall back to a generic `value` as well.
    if (this.options.universalClient) {
      var opts = {};
      if (properties.noninteraction) opts.nonInteraction = properties.noninteraction;
      window[this.global](
        'send',
        'event',
        properties.category || 'All',
        event,
        properties.label,
        Math.round(properties.revenue) || value,
        opts
      );
    } else {
      window._gaq.push([
        '_trackEvent',
        properties.category || 'All',
        event,
        properties.label,
        Math.round(properties.revenue) || value,
        properties.noninteraction
      ]);
    }
  },

  pageview : function (url) {
    if (this.options.universalClient) {
      window[this.global]('send', 'pageview', url);
    } else {
      window._gaq.push(['_trackPageview', url]);
    }
  }

});