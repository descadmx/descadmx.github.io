/*

BetterOnCall Physician
Alberto Herrera <alherrera42@gmail.com>

*/

var initialized = false;
var googleMapRedrawInterval = 5000;
var billAfterAppointment = false; // If set to false, Stripe will charge when physician taps "Start appt" button.

Stripe.setPublishableKey('pk_test_UdEpWNVQdBi5oVcyxHWfvtRb');
//Stripe.setPublishableKey('pk_live_WUsIsX5bzbREC2i7joVvOzPh');

var app = angular.module('starter', ['ionic','starter.controllers','BetterOnCall','kinvey','ui.rCalendar','angular.morris-chart','ngCordova'])//,'ionic-native-transitions'])

.constant('kinveyConfig', {
    appKey: 'kid_byJYNc2lQ-',
    appSecret: 'ee19337d701440ccaddfa17dbeb86880',
    //sync: { enable : true, online : navigator.onLine }
})

.run(['$ionicPlatform','$kinvey','$rootScope','$location','kinveyConfig','$cordovaPush','$timeout','$state', function($ionicPlatform,$kinvey,$rootScope,$location,kinveyConfig,$cordovaPush,$timeout,$state) {

    // iOS push notifications configuration
    var iosConfig = {
        "badge": true,
        "sound": true,
        "alert": true,
    };

    // Android push notifications configuration
    var androidConfig = {
        "senderID": "AIzaSyAKTiI20q2wWrTbmBA-6HzLNevT3PnAvAQ",
    };

    $rootScope.$on('$locationChangeStart', function(event, newUrl) {
        if (!initialized) {
            event.preventDefault(); // Stop the location change
            console.log('Kinvey initialized');
            // Initialize Kinvey
            $kinvey.init(kinveyConfig).
            then(function() {
                user = localStorage.getItem('boc-user') 
                pass = localStorage.getItem('boc-pass') 
                initialized = true;
                $kinvey.User.login({
                    username : user,
                    password : pass
                }).
                then(function(loggedin) {
                    console.log("Session initiated. ",loggedin);
                    $timeout(function(){
                        $rootScope.$emit('resetAppointments',true);
                    },1000);
                }, function(err) {
                    if(err.name!='AlreadyLoggedIn')
                    {
                        console.log('Requesting credentials... ');
                        $rootScope.modalLogin.show();
                    }
                }). 
                then(function(){
                    $kinvey.User.me().
                    then(function(o){
                        $rootScope.userDetails = o;
                        query = new $kinvey.Query();
                        query.equalTo('userId',$rootScope.userDetails._id).limit(1);
                        $kinvey.DataStore.find('Physicians',query).
                        then(function(p){
                            $rootScope.userDetails.physician = p[0];
                            console.log($rootScope.userDetails.physician,typeof $rootScope.userDetails.physician);
                            if(typeof $rootScope.userDetails.physician == 'undefined')
                                $state.go('app.myaccount');
                        });
                    });        
                });

                // Always go to Home
                $location.path($location.url(newUrl).hash); 
            }, function(err) {
                console.err(err);
            });
        }
    });

    // Using $(document) rather than $ionicPlatform guarantees that a Kinvey ping() is successful
    //$ionicPlatform.ready(function() {
    $(document).ready(function() {
        // Interface tweaks
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            //StatusBar.styleDefault();
            //StatusBar,styleHex("#somecolor");
            StatusBar.style(1);
        }

        // iOS push
        $cordovaPush.register(iosConfig).
        then(function(deviceToken) {
            // Success -- send deviceToken to server, and store for future use
            console.log("deviceToken: " + deviceToken)
            $http.post("http://server.co/", {user: "Bob", tokenID: deviceToken})
        }, function(err) {
            alert("Registration error: " + err)
        });
        // Android push
        $cordovaPush.register(androidConfig).
        then(function(result) {
            console.log(result);
        }, function(err) {
            // Error
            console.error(err);
        })
    });

    $rootScope.$on('$cordovaPush:notificationReceived', function(event, notification) {
        if (notification.alert) {
            navigator.notification.alert(notification.alert);
        }
        if (notification.sound) {
            var snd = new Media(event.sound);
            snd.play();
        }
        if (notification.badge) {
            $cordovaPush.setBadgeNumber(notification.badge).then(function(result) {
                // Success!
            }, function(err) {
                // An error occurred. Show a message to the user
            });
        }
        switch(notification.event) {
            case 'registered':
                if (notification.regid.length > 0 ) {
                    alert('registration ID = ' + notification.regid);
                }
                break;
            case 'message':
                // this is the actual push notification. its format depends on the data model from the push server
                alert('message = ' + notification.message + ' msgCount = ' + notification.msgcnt);
                break;
            case 'error':
                alert('GCM error = ' + notification.msg);
                break;
            default:
                //alert('An unknown GCM event has occurred');
                console.warn("Event not received. I may assume you have an iOS device?");
                break;
        }
    });

    // Verify that a profile exists at every page so app doesnt crash and user gets verified
    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
        $timeout(function(){
            if(toState.name.startsWith('app.') && typeof $rootScope.userDetails.physician == 'undefined')
                $state.go('app.myaccount');
        });
    });

}])

.filter('camelcase', function() {
    return function(input) {
        input = input || '';
        return input.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };
})

.filter('replace', function() {
    return function(str,what,what2) {
        str = str || "";
        return str.replace(what,what2);
    };
})

.filter('capitalize', function() {
    return function(input) {
        return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
})

.directive('repeatDone', function () {
    return function (scope, element, attrs) {
        if (scope.$last) { // all are rendered
            scope.$eval(attrs.repeatDone);
        }
    }
})

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

        .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html',
        controller: 'AppCtrl'
    })

        .state('app.main', {
        url: '/main',
        views: {
            'menuContent': {
                templateUrl: 'templates/dashboard.html',
                controller: 'dashboard'
            }
        }
    })

        .state('app.static', {
        url: '/static/:page',
        views: {
            'menuContent': {
                templateUrl: function(urlattr) {
                    return "templates/"+urlattr.page+".html";
                },
                controller: 'dashboard'
            }
        }
    })

        .state('app.calendar', {
        url: '/calendar',
        views: {
            'menuContent': {
                templateUrl: 'templates/calendar.html',
                controller: 'calendar'
            }
        }
    })

        .state('app.history', {
        url: '/history/:id',
        views: {
            'menuContent': {
                templateUrl: 'templates/history.html',
                controller: 'history'
            }
        }
    })

        .state('app.schedule', {
        url: '/schedule',
        views: {
            'menuContent': {
                templateUrl: 'templates/schedule.html',
                controller: 'schedule'
            }
        }
    })

        .state('app.appointment', {
        url: '/appointment/:id',
        views: {
            'menuContent': {
                templateUrl: 'templates/appointment.html',
                controller: 'appointment'
            }
        }
    })

        .state('app.appointmentfinished', {
        url: '/appointmentfinished/:id/:charge',
        views: {
            'menuContent': {
                templateUrl: 'templates/appointment-finish.html',
                controller: 'appointmentFinished'
            }
        }
    })

        .state('app.search', {
        url: '/search',
        views: {
            'menuContent': {
                templateUrl: 'templates/search.html'
            }
        }
    })

        .state('app.patientslist', {
        url: '/patients',
        views: {
            'menuContent': {
                templateUrl: 'templates/patients.html',
                controller: 'PatientsCtrl'
            }
        }
    })

        .state('app.myhistory', {
        url: '/myhistory',
        views: {
            'menuContent': {
                templateUrl: 'templates/myhistory.html',
                controller: 'MyHistory'
            }
        }
    })

        .state('app.browse', {
        url: '/browse',
        views: {
            'menuContent': {
                templateUrl: 'templates/browse.html'
            }
        }
    })

        .state('app.myaccount', {
        url: '/myaccount',
        views: {
            'menuContent': {
                templateUrl: 'templates/my-account.html',
                controller: "MyAccountCtrl"
            }
        }
    })

        .state('app.statistics', {
        url: '/statistics',
        views: {
            'menuContent': {
                templateUrl: 'templates/statistics.html',
                controller: "statistics"
            }
        }
    })

        .state('app.playlists', {
        url: '/playlists',
        views: {
            'menuContent': {
                templateUrl: 'templates/playlists.html',
                controller: 'PlaylistsCtrl'
            }
        }
    })

        .state('app.single', {
        url: '/playlists/:playlistId',
        views: {
            'menuContent': {
                templateUrl: 'templates/playlist.html',
                controller: 'PlaylistCtrl'
            }
        }
    });
    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/main');
});
