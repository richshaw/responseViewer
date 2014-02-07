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
          //endpoint : 'http://www.response.io.php54-1.ord1-1.websitetestlink.com/experiment/',
          endpoint : 'http://localhost/responseApi/public/experiment/',
          id: null
      }, options);

      var element = $(this);

      var saved = false;

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
              element.html(data.data.body);
              element.data('experiment',data.data);
              var fingerprint = new Fingerprint().get();
              element.data('participantId',fingerprint);
              element.data('sessionId',newGuid());
              element.data('response',[]);

              if (data.data.meta == 1) {
                element.data('meta',urlVars());
              }

              init();

          }).fail(function() {
              // An error occurred
              console.log('Failed to load experiment from API');
              element.html('Failed to load experiment from API');
          });
      }


      /**
      Init experiment
      */
      function init() {

          /**
          Setup global vars
          */
          var experiment = element.data('experiment');
          //Split accepted inputs into array
          var input = experiment.input.split(',');
          var random = experiment.random.split(',');

          //Setup slides
          var slides = element.children('.slide');

          //Setup start time
          var startTime = getTimestamp();

          //slideNumber = the slidenumber the participant sees not the experiment slide number
          var slideNumber = 1;

          /*
          @End global vars
          **/

          //Give each slide a slide number so we know which one is which after we randomise them
          slides.each( function( index, ele){
              $(ele).data('number',index+1);
              //Hide slides because we're only going to show one at a time
              $(ele).hide();
          });


          /**
          * Randomise blocks of slides
          */

          //Detach slides from DOM so we can randomise them inpdendento of the dom
          slides.detach();

          //Randomise each block of randomised slides
          $(random).each( function( index, ele){
            //Get start and stop slide numbers from array
            var startStop = ele.split('-');
            //Start on smallest number
            var start = Math.min.apply(null, startStop);
            //Stop on largest
            var stop = Math.max.apply(null, startStop);
            //Create array of indexes to randomise from start & stop values
            var slidesToRandomise = [];
            for (var i = start; i <= stop; i++) {
                slidesToRandomise.push(i-1); //-1 because we're shuffling by index not slide numebr
            }

            var randomiseMe = [];

            //Get slides to randomise
            $(slidesToRandomise).each( function( index, ele){
              randomiseMe[index] = slides[ele];
            });

            //Randomise the slides
            randomiseMe = $(randomiseMe).sort(function() {
                return Math.round(Math.random())-0.5;
            });

            //Add randomised slides back to main slides obj
            $(slidesToRandomise).each( function( index, ele){
               slides[ele] = randomiseMe[index];
            });
          });

          //Add slides back to DOM
          element.append(slides);

          //Show first slide
          slides.first().addClass('current').show();

          /**
          * Apply rules to slides
          */

          var rules = experiment.rules;
          //For each rule in experiment
          $(rules).each( function(index, ele) {

            var rule = ele;
            //Get block of slides to rule
            var slidesGroup = rule.for.split(',');

            //For each slide group create array of slides
            //Apply rule to each slide
            $(slidesGroup).each( function(index, ele){
              var startStop = ele.for.split('-');

              //Start on smallest number
              var start = Math.min.apply(null, startStop);
              //Stop on largest
              var stop = Math.max.apply(null, startStop);
              //Create array of indexes to randomise from start & stop values
              var slidesToRuleIndex = [];
              for (var i = start; i <= stop; i++) {
                //Get slide to apply
                var s = slides[i-1]; //-1 because we're working with index not slide number

                switch (rule.type)
                {
                case 'ClickEvent':

                  $(s).on( "click",{
                    slide: s,
                    action: rule.action,
                  }, triggerEventRule);

                  break;
                case 'KeyPressEvent':

                  $(s).on( "keypress",{
                    slide: s,
                    action: rule.action,
                  }, triggerEventRule);

                  break;
                case 'TimeEvent':
                  //TODO
                  break;
                }
              }

            });

          }); //End rules each

          //Trigger event rules
          function triggerEventRule(event) {

            switch (event.data.action)
            {
            case 'nextSlide':

              var currentSlide = slides.siblings('.current');

              var userInput = '';
              var userError = 0;

              if(event.type == 'click') {
                userInput = 'click';
              }
              else if (event.type == 'keypress') {
                userInput = String.fromCharCode( event.which );
                userError = (input.indexOf(String.fromCharCode( e.which )) < 0);
              }

              nextSlide(currentSlide,userInput,userError);

              break;
            case 'error':
              //TODO
              break;
            }

          }

          /*
          * @End of rules
          **/


          //Bind unload function
          $(window).unload(function(){
            if(!saved) {
              //On close attempt to post partial data
              saveResponses(false);
            }
          });


          //Create response obj and store in experiments data
          //startTime and element are global vars
          function createResponse(participantInput,participantId,sessionId,slide,time,error,participantSlide) {
            var response = {};
            response.input = participantInput;
            response.participantId = participantId;
            response.sessionId = sessionId;
            response.slide = slide;
            response.participantSlide = participantSlide;
            response.time = getTimestamp() - startTime;
            response.error = error;

            if(element.data('meta')) {
              response.meta = element.data('meta');
            }

            console.log(response);
            var responses = element.data('response');
            responses.push(response);
            element.data('response',responses);
          }

          //Saves responses to API
          function saveResponses(async) {
            var jqXHR = $.ajax({
              url: settings.endpoint + settings.id + '/response/batch',
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

          //Displays next slide
          //slides, slideNumber and startTime are global vars
          function nextSlide(currentSlide,input,error) {

            //Store response data each slide
            if(slideNumber <= slides.length) {
              var responseTime = getTimestamp() - startTime;
              createResponse(input,element.data('participantId'),element.data('sessionId'),currentSlide.data('number'),responseTime,error,slideNumber);
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
      }
    /**
    * @ End of Init
    */


    /**
    * Helper functions
    */

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

    //Generates uuid
    function newGuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
    };

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

  /**
  @End helper functions
  */

  /**
  Start experiment on div
  */
  var id = $( "#response-experiment" ).data( "id");
  $( "#response-experiment" ).response({id : id});



});
