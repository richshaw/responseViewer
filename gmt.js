(function(window, document, version, callback) {
    var j, d;
    var loaded = false;
    if (!(j = window.jQuery) || version > j.fn.jquery || callback(j, loaded)) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "http://ajax.googleapis.com/ajax/libs/jquery/" + version + "/jquery.min.js";
        script.onload = script.onreadystatechange = function() {
            if (!loaded && (!(d = this.readyState) || d == "loaded" || d == "complete")) {
                callback((j = window.jQuery).noConflict(1), loaded = true);
                j(script).remove();
            }
        };
        (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script);
    }
})(window, document, "1.10.2", function($, jquery_loaded) {

    /**
    JQuery plugin
    */
    $.fn.response = function(options) {

      //Establish our default settings
      var settings = $.extend({
          endpoint : 'http://localhost/gmtApi/public/experiment/',
          id: null
      }, options);

      //Save copy of element plugin is attached to
      var element = $(this);
      //Has experiment data been saved
      var saved = false;

      var height = 500;
      var width = 960;

      /**
      Load experiment
      */
      //Prevent duplicate loading on experiment data into element
      if(!element.data('experiment')) {
          element.html('Loading experiment <progress>working...</progress>');
          //Load experiment from API
          var jqXHR = $.ajax({
            url: settings.endpoint + settings.id,
            //crossDomain: true,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
          }).done(function(data) {
              var b = drawExperiment(20, height,width);
              element.html(b);
              element.data('experiment',data.data);
              var fingerprint = new Fingerprint().get();
              element.data('participantId',fingerprint);
              element.data('sessionId',newGuid());
              element.data('response',[]);

              if (data.data.meta == 1) {
                element.data('meta',urlVars());
              }

              //Unleash the beast
              init();

          }).fail(function() {
              //An error occurred
              console.log('Failed to load experiment from API');
              element.html('Failed to load experiment from API');
          });
      }
      /**
      @End load experiment
      */

      /**
      Init experiment
      */

      //Create global vars
      var experiment; //Experiment object
      var slides; //Slide elements
      var startTime; //Start time for current slides
      var slideNumber; //Slide number the participant sees not the experiment slide number

      function init() {
          //Setup global vars
          experiment = element.data('experiment');
          slides = element.children('.slide');
          startTime = getTimestamp();
          slideNumber = 1;

          //Hide slides
          slides.hide();

          //But show the first
          slides.first().addClass('current').show();

          //Add click event
          $( ".slide" ).on( "click", function() {
              var currentSlide = slides.siblings('.current');
              var userInput = 'click';
              nextSlide(currentSlide,userInput);
          });

          //Add touch event
          $( ".slide" ).on( "touchstart", function() {
              var currentSlide = slides.siblings('.current');
              var userInput = 'touch';
              nextSlide(currentSlide,userInput);
          });

      }
      /**
      @End init
      */

      /**
      Create response object
      startTime and element are global vars
      */
      function createResponse(participantInput,participantId,sessionId,slide,time) {
        var response = {};
        response.input = participantInput;
        response.participantId = participantId;
        response.sessionId = sessionId;
        response.slide = slide;
        response.time = getTimestamp() - startTime;

        if(element.data('meta')) {
          response.meta = element.data('meta');
        }

        var responses = element.data('response');
        responses.push(response);
        element.data('response',responses);
      }
      /**
      @End createResponse
      */

      /**
      Send response to API endpoint
      */
      function saveResponses(async) {
        var jqXHR = $.ajax({
          url: settings.endpoint + settings.id + '/response/batch', //TODO shouldn't need to add stuff on end of string
          type: 'POST',
          data: JSON.stringify(element.data('response')),
          crossDomain: true,
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          async: async,
        }).done(function(data) {
            //console.log(data);
            saved = true;
        }).fail(function() {
            console.log('Failed to save responses');
        });
      }
      /**
      @End of save
      */

      /**
      Displays next slide
      slides, slideNumber and startTime are global vars
      */
      function nextSlide(currentSlide,input) {

        //Store response data each slide
        if(slideNumber <= slides.length) {
          var responseTime = getTimestamp() - startTime;
          createResponse(input,element.data('participantId'),element.data('sessionId'),slideNumber,responseTime);
        }

        if(slideNumber < slides.length) {
          currentSlide.removeClass('current').hide().next().addClass('current').show();
          startTime = getTimestamp();
          slideNumber++;
        }
        else if(slideNumber == slides.length) {
          currentSlide.removeClass('current');
          startTime = getTimestamp();
          slideNumber++;
        }

        if(slideNumber == (slides.length)) {
          saveResponses(true);
        }
      }
      /**
      @End of nextSlide
      */

      /**
      Binds unload function
      Saves on window close
      */
      $(window).unload(function(){
        if(!saved) {
          //On close attempt to post partial data
          saveResponses(false);
        }
      });
      /**
      @End unload
      */



    };
    /**
    @End Jquery plugin
    */

    /**
    Helper functions
    */

    //Draw experiment body
    function drawExperiment(slides, height,width) {
      var s = '';

      for (var i=0;i<slides;i++) {
        s = s + drawSlide(height,width);
      }

      return s;
    }

    //Draws a slide
    function drawSlide(height,width) {
      var s = drawRandomPoly(height,width);
      return '<div class="slide">' + s + '</div>';
    }

    //Draws random SVG polygon
    function drawRandomPoly(height,width) {
        var p = getRandomInt(7, 14);
        var polystring  = '';

        for (var i=0; i<p; i++)
        {
            polystring = polystring + getRandomInt(0, width) + "," + getRandomInt(0, height) + " ";
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + width + '" height="' + height +'" xmlns:xlink="http://www.w3.org/1999/xlink"><polygon points="' + polystring + '"></polygon></svg>';
    }

    //Returns random int between min and max values
    function getRandomInt (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }


    // Checks if browser supports SVG
    function supportsSvg() {
      return document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
    }


   //High resolution timer polyfil
    (function() {

        if(window.performance && window.performance.now) {
          console.log('Using high resolution timer.');
          return;
        }

        if(!window.performance) window.performance = {};

        var methods = ['webkitNow', 'msNow', 'mozNow'];

        for(var i = 0; i < methods.length; i++) {
            if(window.performance[methods[i]]) {
                window.performance.now = window.performance[methods[i]];
                console.log('Using high resolution ' + methods[i] + ' timer.');
                return;
            }
        }

        if(Date.now) {
            console.log('Using low resolution timer.');
            window.performance.now = function() {

                return Date.now();
            };
            return;
        }
           console.log('Using low resolution timer.');
        window.performance.now = function() {
            return +(new Date());
        };

    })();

    getTimestamp = function() { return window.performance.now(); };

    //Gets URL GET params
    function urlVars() {

      var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

      urlParams = {};
      while (match = search.exec(query)) {
        urlParams[decode(match[1])] = decode(match[2]);
      }

      return urlParams;
    }

    //Generates uuid
    function newGuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }


    //CORS polyfil support for IE in JQuery
    if ( window.XDomainRequest ) {
        jQuery.ajaxTransport(function( s ) {
          if ( s.crossDomain && s.async ) {
            if ( s.timeout ) {
              s.xdrTimeout = s.timeout;
              delete s.timeout;
            }
            var xdr;
            return {
              send: function( _, complete ) {
                function callback( status, statusText, responses, responseHeaders ) {
                  xdr.onload = xdr.onerror = xdr.ontimeout = jQuery.noop;
                  xdr = undefined;
                  complete( status, statusText, responses, responseHeaders );
                }
                xdr = new window.XDomainRequest();
                xdr.onload = function() {
                  callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
                };
                xdr.onerror = function() {
                  callback( 404, "Not Found" );
                };
                xdr.onprogress = function() {};
                if ( s.xdrTimeout ) {
                  xdr.ontimeout = function() {
                    callback( 0, "timeout" );
                  };
                  xdr.timeout = s.xdrTimeout;
                }

                xdr.open( s.type, s.url, true );
                xdr.send( ( s.hasContent && s.data ) || null );
              },
              abort: function() {
                if ( xdr ) {
                  xdr.onerror = jQuery.noop();
                  xdr.abort();
                }
              }
            };
          }
        });
    }


    /**
    @End helper functions
    */

    //////// GO, GO, G0 ///////
    var id = $( "#response-experiment" ).data( "id");
    $( "#response-experiment" ).response({id : id});

});


