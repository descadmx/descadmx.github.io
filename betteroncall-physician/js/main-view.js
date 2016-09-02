/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Facebook SDK
window.fbAsyncInit = function() {
    FB.init({
        appId      : '1146095968744160',
        xfbml      : true,
        version    : 'v2.6'
    });
};

(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

app.initialize();

// Detect iOS and treat it like a king
var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if(iOS)
    $(".navbar").css('padding-top','20px');

// Detect if we can safely use the browser/webview Storage API
function localStorageTest(){
    var test = 'test';
    try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

if( ! localStorageTest() ) 
    alert('This device is incompatible with BetterOnCall Physician App. ');


function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.substring(0, window.location.href.indexOf('#')).slice(window.location.href.indexOf('?') + 1).split('&');
    //var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');

        if($.inArray(hash[0], vars)>-1)
        {
            vars[hash[0]]+=","+hash[1];
        }
        else
        {
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
    }

    return vars;
}

$(document).ready(function(){
    if($("#fullcalendar").length)
        $("#fullcalendar").fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,basicWeek,basicDay'
            },
            defaultView: 'agendaWeek'
        });
});

$("#availability").click(function(){
    $("#availability-icon").toggleClass("fa-check-square-o").toggleClass("fa-square-o");
    $(this).closest('.panel').fadeOut(200).toggleClass("panel-success").toggleClass("panel-danger").fadeIn(200);
    alert('Your availability has changed. To switch it back, just tap the button again. ');
});

var modalRequest = function(){
    $("#modal-request").modal('show');
}

var acceptRequest = function(){
    alert('Appointment accepted. We will alert you with anticipation when the time comes. ');
    $("#modal-request").modal('hide');
}

requests = JSON.stringify([
    {
        'patient_name' : 'John Doe 1',
        'eta' : 'In 5 minutes'
    },
    {
        'patient_name' : 'John Doe 2',
        'eta' : 'In 5 minutes'
    }
]);

$("#request-list").accordion({
    collapsible: true,
    active: true
});

$("#appointment-list").accordion({
    collapsible: true,
    active: true
});

$("#main-accordion").accordion({
    collapsible: true,
    active: 0,
    heightStyle: 'content'
})

//
setTimeout(function(){
    $("#main-accordion")
        .accordion({
        active: false,
    });
},500);
//*/

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}
function showPosition(position) {
    console.log("I'm at \nLatitude: " + position.coords.latitude + 
                "'\nLongitude': " + position.coords.longitude); 
}

$(document).ready(function(){
    getLocation();
});

$("[name='availability']").bootstrapSwitch();

var map;
function initMap() {
    map = new google.maps.Map(document.getElementById('google-map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 8
    });
}

// Collapse navbar when selected a link 
$(document).ready(function () {
    $(".navbar-nav li a").click(function(event) {
        $(".navbar-collapse").collapse('hide');
    });
});