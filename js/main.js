// define global variables
var locations = [
    {
        lat : 52.5223199,
        lng : 13.413083899999947,
        address : 'Alexanderpl., 10178 Berlin, Germany',
        title : 'Alexanderplatz'
    },
    {
        lat : 52.5169328,
        lng : 13.401899700000058,
        address : 'Museum Island, Berlin, Germany',
        title : 'Museumsinsel'
    },
    {
        lat : 52.5185999,
        lng : 13.37611430000004,
        address : 'Platz der Republik 1, 11011 Berlin, Germany',
        title : 'Reichstag Building'
    },
    {
        lat : 52.52020650000001,
        lng : 13.369136099999992,
        address : 'Willy-Brandt-Straße 1, 10557 Berlin',
        title : 'German Chancellery'
    },
    {
        lat : 52.5135406,
        lng : 13.4147107,
        address : 'Am Köllnischen Park 5, 10179 Berlin, Germany',
        title : 'Märkisches Museum'
    }
];
var infoWindow;
var map;

var Location = function(location) {
    var self = this;

    // create knockout observables
    self.lat = ko.observable(location.lat);
    self.lng = ko.observable(location.lng);
    self.title = ko.observable(location.title);
    self.active = ko.observable(false);
    self.address = ko.observable(location.address);

    self.getContent = function(callback) {
        if (self.content){
            return self.content();
        }
        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + self.title() + '&format=json&callback=wikiCallback';
        // AJAX call to Wikipedia API
        jQuery.ajax({
            url: wikiUrl,
            dataType: 'jsonp',
        })
        .done(function(response) {
            var wikiContent = '';
            if (response){
                if (typeof response[1] !=="undefined" && typeof response[3] !=="undefined"){
                    for (var i = 0; i < 3; i++) {
                        if (typeof response[1][i] !=="undefined" && typeof response[3][i] !=="undefined"){
                            wikiContent += '<a href="' + response[3][i] + '" target"_blank">' + response[1][i] + '</a><br>';
                        }
                    }
                }
            }
            if (wikiContent !== '') {
                self.content = ko.observable('<h4>Wiki results for "' + self.title() + '"</h4><p>' + wikiContent + '</p>');
            } else {
                self.content = ko.observable('<h4>Wiki results for "' + self.title() + '"</h4><p>There was a problem reaching wikipedia, sorry =/</p>');
            }
        })
        .fail(function() {
            console.log("Wikipedia API couldn't provide AJAX call");
            self.content = ko.observable('<h4>Wikipedia results for "' + self.title() + '"</h4><p>There was a problem reaching wikipedia, sorry =/</p>');
        })
        .always(function() {
            if (typeof callback !== "undefined"){
                callback(self);
            }
        });
        return '<h4>Wiki results for "' + self.title() + '"</h4><p><span class="spin"></span></p>';
    };
    self.createMarker = (function() {
        self.marker = new google.maps.Marker({
            position: {lat: self.lat(), lng: self.lng()},
            map: map,
            title: self.title()
        });
        map.bounds.extend(self.marker.position);
        self.marker.addListener('click', function() {
            selectLocation(self);
        });
    })();
};

// Google Maps
function initMap() {
    // initialize map
    map = new google.maps.Map(document.getElementById('map'));

    // initialize bounds variable
    map.bounds = new google.maps.LatLngBounds();

    // initialize infoWindow
    infoWindow = new google.maps.InfoWindow({
        content: ''
    });

    google.maps.event.addListener(infoWindow, 'closeclick', function(){
        resetActiveState();
    });

    // eventListener for responsive map at different window sizes
    google.maps.event.addDomListener(window, 'resize', function() {
        map.fitBounds(map.bounds);
    });
}

// Error handler for Google Maps Api
function mapsApiErrorHandler(){
    console.log('Problem With Loading Google Maps API');
    $('body').prepend('<h2>Trying to connect to Google Maps API. Please try again later.</h2>');
}

var ViewModel = function() {
    var self = this;

    // show ui if map loaded properly
    this.mapLoadFail = ko.observable(false);

    // initialize locationsList observableArray
    this.locationsList = ko.observableArray([]);

    // add location objects to the locationsList
    locations.forEach(function(location) {
        self.locationsList.push( new Location(location));
    });

    // fit map to new bounds
    map.fitBounds(map.bounds);

    // initialize current location
    this.currentLocation = ko.observable(locationsList()[0]);

    // initialize searchTerm which is used to filter the list of locations displayed
    this.searchTerm = ko.observable('');

    // this function is used to reset any active state that may be set
    this.resetActiveState = function() {
        self.currentLocation().active(false);
        self.currentLocation().marker.setAnimation(null);
        infoWindow.close();
    };

    // compute the list of locations filtered by the searchTerm
    this.filteredLocations = ko.computed(function() {
        // reset any active state
        resetActiveState();

        // return a list of locations filtered by the searchTerm
        return self.locationsList().filter(function (location) {
            var display = true;
            if (self.searchTerm() !== ''){
                // check if the location title contains the searchTerm
                if (location.title().toLowerCase().indexOf(self.searchTerm().toLowerCase()) !== -1){
                    display = true;
                }else {
                    display = false;
                }
            }

            // toggle map marker based on the filter
            location.marker.setVisible(display);

            return display;
        });
    });

    // click handler for when a location is clicked
    this.selectLocation = function(clickedLocation) {
        if (self.currentLocation() == clickedLocation && self.currentLocation().active() === true) {
            resetActiveState();
            return;
        }

        // reset any active state
        resetActiveState();

        // update currentLocation
        self.currentLocation(clickedLocation);

        // activate new currentLocation
        self.currentLocation().active(true);

        // bounce marker
        self.currentLocation().marker.setAnimation(google.maps.Animation.BOUNCE);

        // open infoWindow for the current location
        infoWindow.setContent('<h1>' + self.currentLocation().title() + '</h1>' + self.currentLocation().getContent(function(l){
            // This is a call back function passed to Location.getContent()
            // When Location has finished getting info from external API it will call this function
            // check if infoWindow is still open for the location calling this call back function
            if (self.currentLocation() == l){
                infoWindow.setContent('<h1>' + self.currentLocation().title() + '</h1>' + l.content());
            }
        }));
        infoWindow.open(map, self.currentLocation().marker);



        // center map on current marker
        map.panTo(self.currentLocation().marker.position);
    };

    // hide nav initially on mobile
    this.hideNav = ko.observable( window.innerWidth < 640 );

    this.toggleNav = function() {
        self.hideNav(! self.hideNav());
        google.maps.event.trigger(map, 'resize');
        map.fitBounds(map.bounds);
    };
    this.streetviewUrl = ko.computed(function(){
        return 'https://maps.googleapis.com/maps/api/streetview?size=300x350&location=' + self.currentLocation().address();
    },this);
};
// Callback for Google Maps API
var initialize = function() {
    initMap();
    ko.applyBindings(ViewModel);
};

