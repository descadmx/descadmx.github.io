angular.module('starter.controllers', [])

    .controller('AppCtrl', function($scope,$rootScope,$ionicModal,$ionicPopup,$timeout,$kinvey,$cordovaGeolocation,$q,$state,$ionicHistory) {

    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:
    //$scope.$on('$ionicView.enter', function(e) {
    //});

    // Form data for the login modal
    $scope.loginData = {};
    $scope.loginData.username = localStorage.getItem('boc-user') 
    $scope.loginData.password = localStorage.getItem('boc-pass') 

    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $scope
    }).then(function(modal) {
        $rootScope.modalLogin = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeLogin = function() {
        $rootScope.modalLogin.hide();
    };

    // Open the login modal
    $scope.logout = function() {
        console.log("Well, it's on you, pal.");
        $kinvey.User.logout({force:true}).
        then(function(e){
            localStorage.removeItem('boc-pass');
            $scope.loginData.password = "";
            $rootScope.userDetails = Array();
            $rootScope.modalLogin.show();
        });
    };

    // Reset password
    $scope.passwordReset = function() {
        console.log("Requesting password reset");
        $kinvey.User.resetPassword($scope.loginData.username). 
        then(function(){
            $ionicPopup.alert({
                title: 'Password reset',
                template: 'An email has been sent to you. You can discard it if you remember your current password. '
            }).
            then(function(res) {
                console.log('Password reset popup flies away.');
            }); 
        }, function(err){
            console.log(err);
        });
    }

    // Geolocation
    $rootScope.myPosition = Object();
    $rootScope.whereAmI = function() {
        var parsePosition = function(o) {
            $rootScope.myPosition = o.coords;
        }
        $cordovaGeolocation.getCurrentPosition({timeout: 10000, enableHighAccuracy: false}).
        then(function (position) {
            $rootScope.myPosition = position.coords;
        }, function(err) {
            console.warn("Geolocation is not supported by your device. Attempting to use browser geolocation.");
            navigator.geolocation.getCurrentPosition(parsePosition);    
        }). 
        then(function(){
            if(typeof $rootScope.map !== 'undefined' && typeof $rootScope.myPosition.latitude !== 'undefined')
            {
                console.log("Attempting to relocate map center to",$rootScope.myPosition.latitude,$rootScope.myPosition.longitude);
                var center = new google.maps.LatLng($rootScope.myPosition.latitude, $rootScope.myPosition.longitude);
                $rootScope.map.panTo(center);
                var marker = new google.maps.Marker({
                    position: {lat:$rootScope.myPosition.latitude, lng:$rootScope.myPosition.longitude},
                    map: $rootScope.map,
                    title: 'Me'
                });
            }
        });
    }

    // Geocoding 
    $rootScope.geocodeAddress = function(address) {
        address = address || "";
        //var deferred = $q.defer();
        var deferred = $.Deferred();
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({'address': address}, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                //coords = results[0].geometry.location; 
                coords = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                }
                console.log(address,"resolved to be at",coords);
                deferred.resolve(coords);
            } else {
                deferred.reject('Geocode was not successful for the following reason: ' + status);
            }
        });
        return deferred;
    }

    // Quick set status 
    $rootScope.setStatus = function(str) {
        physician = $rootScope.userDetails.physician;
        physician.status = str;
        $kinvey.DataStore.save("Physicians",physician).
        then(function(e){
            console.log("Status changed to "+str);
        }, function(e){
            console.warn("Couldn't update your status. ");
        });
    }

    // Detect IOS
    $rootScope.isIOS = function() {
        isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        //console.log("Testing if this system has iOS...",isIOS);
        return isIOS;
    }

    // 
    $rootScope.goBack = function() {
        window.history.go(-1);
    }

    // Go back to main state
    $rootScope.goToMain = function() {
        console.log("Going home");
        $ionicHistory.nextViewOptions({
            //disableAnimate: true,
            disableBack: true,
            historyRoot: true
        });
        $rootScope.$emit('resetAppointments',true);
        $state.go('app.main',{},{reload:true,inherit:false,notify:true});
        //window.location.reload();
    }

    $scope.doLogin = function() {
        $scope.msg = "";
        $kinvey.User.logout({force:true})
            .then(function(){
            console.log('Got out of any pre-existent session');
            $kinvey.User.login({
                username : $scope.loginData.username,
                password : $scope.loginData.password
            }).
            then(function(loggedin) {
                localStorage.setItem('boc-user',$scope.loginData.username);
                localStorage.setItem('boc-pass',$scope.loginData.password);
                $scope.msg = "Login successful";
                $rootScope.modalLogin.hide();
                $rootScope.userDetails = loggedin;
                query = new $kinvey.Query();
                query.equalTo('userId',$rootScope.userDetails._id).limit(1);
                $kinvey.DataStore.find('Physicians',query).
                then(function(p){
                    $rootScope.userDetails.physician = p[0];
                    console.log("Logged in new user ",$rootScope.userDetails);
                    if(typeof $rootScope.userDetails.physician == 'undefined')// || !$rootScope.userDetails.physician.length)
                        $state.go('app.myaccount');
                    $rootScope.$emit('resetAppointments',true);
                },function(e){
                    console.log(e);
                    alert("No se pudo encontrar el perfil");
                });
            }, function(err) { 
                console.log(err);
                $scope.msg = "";
                $scope.msg = err.description;
                if(!$scope.msg)
                    $scope.msg = err.message;
                if(err.name!='AlreadyLoggedIn')
                {
                    console.log('Password deleted. Requesting credentials... ');
                    localStorage.removeItem("boc-pass");
                    $rootScope.modalLogin.show();
                }
            });
        });
    }

    $scope.signUp = function() {
        console.log($scope.loginData);
        $scope.msg = "";
        $kinvey.User.logout({force:true}).
        then(function(){
            //console.log("Destroying Cache...");
            //$kinvey.Sync.destruct();
            console.log("Sign out users, if any...");
            $kinvey.User.signup({
                username: $scope.loginData.username,
                email: $scope.loginData.username,
                password: $scope.loginData.password
            }).
            then(function(o){
                console.log(o);
                $scope.msg = "Almost done! Check your email to verify yout account ";
            }, function(err){
                console.log(err);
                //$scope.msg = "Oops! There was an error signing you up. ";
                $scope.msg = err.description;
                //$scope.msg += "<span class='text-muted small'>"+err.description+"</span>";
            })
        });
    }

    $scope.availability = {
        checked: true
    }

    $rootScope.checkAvailability = function() {
        av = $scope.userDetails.physician.status=="Active";
        console.log("Switch ",$scope.availability.checked,", db ",av);
        newStatus = $rootScope.userDetails.physician;
        newStatus.status = (av) ? 'Unavailable' : 'Active';
        $kinvey.DataStore.save('Physicians',newStatus). 
        then(function(o){ 
            $rootScope.userDetails.physician = o;
            $scope.availability.checked = !av;
        }, function(err){
            console.log(err);
            alert("Couldnt change your availability");
        });
    }

    // Geoboundary
    $rootScope.geoboundary ={
        checked: false
    }

    $rootScope.redrawMap = function() {
        console.log("Redrawing map and refetching appointments");
        $rootScope.$emit('resetAppointments',true);
        google.maps.event.trigger($rootScope.map, 'resize');
    }

    // A clone helper. Don't forget that JS pass objects by reference. 
    $rootScope.cloneObject = function(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        var temp = obj.constructor(); // give temp the original obj's constructor
        for (var key in obj) {
            temp[key] = $rootScope.cloneObject(obj[key]);
        }
        return temp;
    }

    $scope.reload = function() {
        console.log("Resetting the whole app");
        window.location.assign('index.html');
    }

    $scope.doRefresh = function() {
        $scope.doLogin();
        $scope.$broadcast('scroll.refreshComplete');
    }

})

    .controller('dashboard', function($scope,$rootScope,$timeout,$interval,$kinvey,$cordovaGeolocation,$state,$ionicNavBarDelegate,$ionicSideMenuDelegate,$ionicSlideBoxDelegate,$filter) {

    $scope.showEverything = function() {
        console.log(($scope));
        console.log($rootScope);
        google.maps.event.trigger($rootScope.map, 'resize');
    }

    $scope.viewHistory = function(id) {
        console.log("Retrieving history patient",id);
        //$state.go("app.history","/history/"+id);
        $state.go('app.history',"/app/history/"+id);
    }

    $scope.sortAppointments = function() {
        sortedAppointments = Object();
        $scope.upcoming.forEach(function(appointment){
            if(appointment.dateStart) 
                dateIndex = $filter('date')(appointment.dateStart*1000,'MMM dd');
            else
                dateIndex = $filter('date')(appointment.dateRequested*1000,'MMM dd');
            if( typeof sortedAppointments[dateIndex] == 'undefined' )
                sortedAppointments[dateIndex] = {
                    date: dateIndex,
                    appointments: Array()
                };
            if(!$scope.useInteractiveMap)
                $rootScope.geocodeAddress(appointment.locationRequested). 
                then(function(o){
                    console.log(appointment.locationRequested,", for ",appointment.patient.firstName,"located at",o);
                    appointment.mapSrc = "https://maps.googleapis.com/maps/api/staticmap?" + $.param({
                        key: "AIzaSyD5Q5wesLy7GtLkI_a3YlPGqpSVnVHw-b8",
                        //center: $scope.appt.locationRequested,
                        //zoom: 16,
                        scale: 2,
                        size: "362x362",
                        markers: "color:blue|label:P|"+appointment.locationRequested,
                        style: "element:labels|visibility:on",
                        style: "element:geometry.stroke|visibility:off",
                        style: "feature:landscape|element:geometry|saturation:-100"
                    });
                    appointment.mapSrc += "&markers=color:yellow|label:M|"+o.latitude+","+o.longitude;
                    appointment.coords = o;
                })
                sortedAppointments[dateIndex].appointments.push(appointment);        
        })
        $scope.groupedAppts = sortedAppointments;
        $scope.msg = "";
        console.log("Sorted appointments",$scope.groupedAppts);
    }

    $scope.getAppointments = function() {
        if(!$rootScope.gettingAppointments){
            $rootScope.gettingAppointments = true;

            // Prevent previous markers for staying in the map. 
            // You should be able to delete them, but Google decided just to make it possible by assigning them to "no map". Duh. 
            if(typeof $rootScope.mapMarkers != 'undefined') {
                $.each($rootScope.mapMarkers, function(index,marker){
                    marker.setMap(null);
                });
            }
            $rootScope.mapMarkers = Array();
            //
            $scope.upcoming = Array();
            console.log('Getting Upcoming Appointments');
            if(typeof $rootScope.userDetails == 'undefined')
                console.warn("No user found in the environment. Yet. ");
            else
                $kinvey.ping().then(function(){
                    var query = new $kinvey.Query();
                    query
                        .equalTo('physicianId',$rootScope.userDetails.physician._id)
                        .equalTo('dateFinish',null)
                        .greaterThanOrEqualTo('dateRequested',Math.floor(Date.now()/1000))
                        .ascending('dateRequested');
                    $kinvey.DataStore.find('Appointments',query). 
                    then(function(requests){
                        requests.forEach(function(request,i){
                            // Assign metadata
                            $kinvey.DataStore.get('Physicians',request.physicianId).
                            then(function(physician){
                                request.physician = physician;
                            });
                            $kinvey.DataStore.get('Patients',request.patientId).
                            then(function(p){
                                if(p.firstName) {
                                    request.patient = p;
                                    $scope.upcoming.push(request);

                                    // Geocoding (address to LatLong)
                                    $rootScope.geocodeAddress(request.locationRequested). 
                                    then(function(o){
                                        if($scope.useInteractiveMap) {

                                            // Some marker style
                                            var pinColor = "CCCCCC";
                                            var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,
                                                                                       new google.maps.Size(21, 34),
                                                                                       new google.maps.Point(0,0),
                                                                                       new google.maps.Point(10, 34));
                                            var pinShadow = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_shadow",
                                                                                        new google.maps.Size(40, 37),
                                                                                        new google.maps.Point(0, 0),
                                                                                        new google.maps.Point(12, 35));
                                            // Add map marker
                                            var m = new google.maps.Marker({
                                                position: o,
                                                map: $rootScope.map,
                                                title: p.firstName+" "+p.lastName+", "+request.comment,
                                                icon: pinImage,
                                                shadow: pinShadow,
                                                appointmentId: request._id
                                            })
                                            $rootScope.mapMarkers.push(m);
                                            // Center map when click
                                            $rootScope.mapMarkers[$rootScope.mapMarkers.length-1].addListener('click', function() {
                                                $rootScope.map.setCenter(this.getPosition()); 
                                                $rootScope.map.setZoom(15);
                                                $scope.setCurrentAppointment(this.get('appointmentId'));
                                            });
                                            // Add the info window by default
                                            var infoWindow = new google.maps.InfoWindow({
                                                content: $rootScope.mapMarkers[$rootScope.mapMarkers.length-1].title,
                                                //maxWidth: 100
                                            });
                                            infoWindow.open($rootScope.mapMarkers[$rootScope.mapMarkers.length-1].get('map'), $rootScope.mapMarkers[$rootScope.mapMarkers.length-1]);
                                            $scope.setCurrentAppointment(request._id);
                                            // Reset everything. Because we are cool. 
                                            m = null;
                                            infoWindow = null;
                                        }
                                    }). 
                                    then(function(){
                                        $scope.appt = $scope.upcoming[0];
                                        $scope.setCurrentAppointment($scope.appt._id);
                                        console.log('Fetched upcoming appointments: ',$scope.upcoming);
                                        // Center map
                                        if($scope.useInteractiveMap) {
                                            var bounds = new google.maps.LatLngBounds();
                                            for (var i = 0; i < $rootScope.mapMarkers.length; i++) {
                                                bounds.extend($rootScope.mapMarkers[i].getPosition());
                                            }
                                            $rootScope.map.fitBounds(bounds);
                                        }

                                        // Make sure we alert the user if there are no appointments
                                        if(!$scope.upcoming.length)
                                            $scope.msg = "There are no appointments pending. Tap here to update. ";

                                        $scope.sortAppointments();

                                    });
                                }
                            });
                        });
                    });
                });

            $timeout(function(){
                //$scope.sortAppointments();                                
                $ionicSlideBoxDelegate.update();
                $rootScope.gettingAppointments = false;
                $scope.msg = "";
            },2000);
        }
        else
            console.warn("Already getting appointments");
    }

    $scope.repeatDone = function() {
        $ionicSlideBoxDelegate.update();
        console.log("Slider updated");
        //$ionicSlideBoxDelegate.slide($scope.week.length - 1, 1);
    };

    $scope.setCurrentAppointment = function(id) {
        $scope.acceptButtonText = "Accept";
        $scope.declineButtonText = "Decline";
        $scope.acceptAppointmentButtonText = "Start appt";
        $scope.upcoming.forEach(function(appt,index){
            if(appt._id==id) {
                $scope.appt = appt;
                now = Date();
                dob = $scope.appt.patient.dob.replace(",","");
                then = Date(dob);
                var ageDifMs = now - then;
                console.log("Age in ms is ", ageDifMs, now, then, dob);
                var ageDate = new Date(ageDifMs); // miliseconds from epoch
                $scope.appt.patient.age = Math.abs(ageDate.getUTCFullYear() - 1970);
            }
        });
        console.log("Current appointment",$scope.appt._id,$scope.appt.patient.firstName);
        $scope.locationRequested = ($scope.appt.locationRequested)
        // Set Google Maps Static API img source
        if(!$scope.useInteractiveMap)
        {    
            $scope.mapSrc = "https://maps.googleapis.com/maps/api/staticmap?" + $.param({
                key: "AIzaSyD5Q5wesLy7GtLkI_a3YlPGqpSVnVHw-b8",
                //center: $scope.appt.locationRequested,
                //zoom: 16,
                scale: 2,
                size: "350x350",
                markers: "color:blue|label:P|"+$scope.appt.locationRequested,
                style: "element:labels|visibility:on",
                style: "element:geometry.stroke|visibility:off",
                style: "feature:landscape|element:geometry|saturation:-100"
            });
            $scope.mapSrc += "&markers=color:yellow|label:M|"+$scope.myPosition.latitude+","+$scope.myPosition.longitude;
        }
    }

    $scope.onMyWay = function() {
        $scope.onMyWayButtonText = "Updating... ";
        console.log($rootScope.userDetails.physician);
        $rootScope.userDetails.physician.status = "Enroute";
        $scope.appt.status = 'enroute';
        $kinvey.DataStore.save("Appointments",$scope.appt);
        $kinvey.DataStore.save("Physicians",$rootScope.userDetails.physician). 
        then(function(e){
            $scope.onMyWayButtonText = "Enroute...";
            $kinvey.DataStore.save("Notifications", {
                from: $rootScope.userDetails.physician._id,
                to: $scope.appt.patient._id,
                message: "Physician "+$rootScope.userDetails.physician.firstName+" "+$rootScope.userDetails.physician.lastName+" is enroute. "
            }). 
            then(function(e){
                console.log("Notification successful");
                $scope.onMyWayButtonText = "Enroute";
            }, function(e){
                $scope.onMyWayButtonText = ":( try again";
                alert("Couldnt send notification")
            })
        }, function(e){
            $scope.onMyWayButtonText = ":( try again";
            alert("Couldnt update profile")
        })
    }

    $scope.doRefresh = function() {
        $scope.msg = "Getting your appointments... ";
        $scope.getAppointments();
        $scope.$broadcast('scroll.refreshComplete');
    }

    $scope.drawMap = function() {
        if($scope.useInteractiveMap) {
            console.log("Drawing map. Default location: Arizona");
            $rootScope.map = new google.maps.Map(document.getElementById('map_canvas'), {
                center: {lat: 35.0204724, lng: -115.0525297},
                zoom: 11
            });
            // Bounds for Tucson
            var strictBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(32.790723, -111.638683),
                new google.maps.LatLng(31.694873, -110.215975) 
            );
            // Listen for the dragend event
            google.maps.event.addListener($rootScope.map, 'dragend', function() {
                if (strictBounds.contains($rootScope.map.getCenter()) || !$rootScope.geoboundary.checked) return;
                // We're out of bounds - Move the map back within the bounds
                var c = $rootScope.map.getCenter(),
                    x = c.lng(),
                    y = c.lat(),
                    maxX = strictBounds.getNorthEast().lng(),
                    maxY = strictBounds.getNorthEast().lat(),
                    minX = strictBounds.getSouthWest().lng(),
                    minY = strictBounds.getSouthWest().lat();
                if (x < minX) x = minX;
                if (x > maxX) x = maxX;
                if (y < minY) y = minY;
                if (y > maxY) y = maxY;
                alert('Sorry, but this service is only available in Tucson for now.');
                $rootScope.map.setCenter(new google.maps.LatLng(y, x));
            });

        }
    }

    $scope.startAppointment = function(id) {
        if(!billAfterAppointment) {
            $scope.acceptAppointmentButtonText = "Billing...";
            // Find the customer ID
            //var qU = new $kinvey.Query();
            //qU.equalTo('_id',$scope.patient.userId).limit(1);
            console.log("Looking for user ",$scope.appt.patient.userId);
            //
            //$scope.appt.patient.userId = "57a660ad25cb6c6d53ddde37";
            $kinvey.User.get($scope.appt.patient.userId). 
            then(function(user){
                alert("Dev note: charging to 57a660ad25cb6c6d53ddde37 (Kris) card. ");
                console.log(user);
                customerId = user.stripeCustomer;
                if(!customerId) {
                    alert("This patient has no credit card associated. Taking customer fallback.");
                    customerId = "cus_8xd1qTwiveYIvw";
                }
                console.log("Stripe customer",customerId);
                // Charge to credit card
                $kinvey.execute('oneTimeStripeCharge',{
                    amount: 20000,
                    currency: 'usd',
                    customer: customerId,
                    description: 'BetterOnCall appt '+$scope.appt._id+", "+$scope.appt.dateStart
                }). 
                then(function(o){
                    $rootScope.chargeDetails = o.stripe_charge;
                    console.log("Stripe Charge info: ",$scope.chargeDetails);
                    $kinvey.DataStore.save("StripeTransactions",$rootScope.chargeDetails). 
                    then(function(t){
                        console.log("Transaction saved to Kinvey");
                    });
                    $scope.acceptAppointmentButtonText = "Done";
                    $rootScope.setStatus("Appointment");
                    $timeout(function(){
                        $scope.acceptButtonText = "Start appt";
                        $state.go('app.appointment',{id:id});
                    });
                }, function(t){
                    console.log(t);
                    if(typeof t.stripe_charge!='undefined')
                        $scope.error = t.stripe_charge.error.message;
                    else
                        $scope.error = "Could not complete the billing process. ";
                });
            }, function(err){
                console.error(err);
                alert('Could not retrieve user');
            });
        }
        else
            $state.go("app.appointment",{id:id});
        $scope.acceptAppointmentButtonText = "Start appt";
    }

    // Set listener to login success
    $rootScope.$on('authHasSucceded',function(e,success){
        if(success) {
            console.log("authHasSucceded event",e);
            $scope.getAppointments();
            $rootScope.checkAvailability();
        }
    });

    // Set listener to Tap on "My appointments"
    $rootScope.$on('resetAppointments',function(e){
        console.log("Resetting appointments (broadcast directive)",e);
        $scope.getAppointments();
    });

    // Geoboundary
    $scope.switchGeoboundary = function() {
        console.log("Switching geoboundary to",!$rootScope.geoboundary.checked);
        $rootScope.geoboundary.checked = !$rootScope.geoboundary.checked;
    }

    // Slider stuff
    $scope.showCurrentSlide = function() {
        console.log($scope.appointmentSlide);
    }

    // Accept-decline routine
    $scope.acceptCurrentAppointment = function() {
        var newStatus = $rootScope.cloneObject($scope.appt);
        newStatus.patient = "";
        newStatus.physician = "";
        newStatus.dateStart = newStatus.dateRequested;
        $scope.acceptButtonText = "Updating...";
        $kinvey.DataStore.save('Appointments',newStatus). 
        then(function(o){
            $scope.acceptButtonText = "Accepted";
            // Let the user see for half a sec that his appointment status has been updated
            $timeout(function(){        
                $scope.appt = o;
                $scope.getAppointments();
            },500);
        });
    }

    $scope.declineCurrentAppointment = function() {
        var newStatus = $rootScope.cloneObject($scope.appt);
        newStatus.patient = null;
        newStatus.physician = null;
        newStatus.status = "rejected";
        $scope.declineButtonText = "Updating...";
        $kinvey.DataStore.save('Appointments',newStatus). 
        then(function(o){
            $scope.declineButtonText = "Declined";
            // Let the user see for a sec that his appointment status has been updated. Then, update the whole list. 
            $timeout(function(){        
                $scope.appt = o;
                $scope.getAppointments();
            },1000);
            var notification = Object();
            notification.from = $rootScope.userDetails.physician._id;
            notification.to = newStatus.patientId;
            notification.message = "The physician can't attend this appointment. Sorry for the inconvenience. ";
            $kinvey.DataStore.save('Notifications', notification). 
            then(function(o){
                console.log("Notification has been pushed",o);
            });
        });
    }

    $interval(function(){
        google.maps.event.trigger($rootScope.map, 'resize');
        console.log("Map redrawed");
    },googleMapRedrawInterval);

    // Initialize
    $scope.useInteractiveMap = true;
    $scope.mapTapDisabled = false;
    $scope.onMyWayButtonText = "On My Way";
    $scope.acceptButtonText = "Accept";
    $scope.declineButtonText = "Decline";
    $scope.acceptAppointmentButtonText = "Start appt";
    $scope.msg = "This list is empty. Tap here to update.";
    $rootScope.mapMarkers = Object();
    $timeout(function(){
        if($scope.useInteractiveMap)
            $scope.drawMap();
        $scope.whereAmI();
        $scope.getAppointments();
        // Login modal, if no session acquired
        if(!localStorage.getItem('boc-pass'))
            $rootScope.modalLogin.show();
    },500);
    //$ionicNavBarDelegate.showBackButton(false);
    $("#sidemenus").hidden = false;
    //console.log($ionicSideMenuDelegate);


})

    .controller('calendar', function($scope,$rootScope,$timeout,$kinvey,$ionicNavBarDelegate) {

    $scope.calendar = {
        eventSource: Array(),
        currentDate: new Date(),
        mode: 'week',
        allDaySlot: false,
        step: 60,
        minTime: "08:00:00",
        maxTime: "20:00:00"
    };

    $scope.setMode = function(mode) {
        $scope.calendar.mode = mode;
    }

    $scope.getAppointments = function() {
        $scope.upcoming = Array();
        console.log('Getting Upcoming Appointments');
        $kinvey.ping().
        then(function(){
            var query = new $kinvey.Query();
            query
                .equalTo('physicianId',$rootScope.userDetails.physician._id)
                .greaterThanOrEqualTo('dateStart',Math.floor(Date.now()/1000))
                .ascending('dateStart')
            //.limit(5)
            //$kinvey.DataStore.get('Appointments'). 
            $kinvey.DataStore.find('Appointments',query).
            then(function(requests){
                console.log("Appointments found: ",requests.length);
                requests.forEach(function(request,i){
                    // Assign metadata
                    $kinvey.DataStore.get('Physicians',request.physicianId).
                    then(function(physician){
                        request.physician = physician;
                    });
                    $kinvey.DataStore.get('Patients',request.patientId).
                    then(function(p){
                        if(p.firstName) {
                            request.patient = p;
                            // Create array for calendar
                            newEvent = {
                                title: p.firstName+" "+p.lastName+", "+p.comment,
                                startTime: new Date(request.dateStart),
                                endTime: new Date(request.dateStart + (60*60)),
                                id: request._id
                            };
                            $scope.calendar.eventSource.push(newEvent);
                            // Ad to upcoming requests list
                            $scope.upcoming.push(request);
                            // Tell the calendar that an event has ben added
                            $rootScope.$emit('eventSourceChanged',$scope.calendar.eventSource);
                        }
                    });
                });
                $timeout(function(){
                    $scope.appt = $scope.upcoming[0];
                    console.log('Fetched upcoming appointments: ',$scope.upcoming);
                },1500);
            });
        });
    }

    $scope.doRefresh = function() {
        $scope.getAppointments();
        $scope.$broadcast('scroll.refreshComplete');
    }

    // Initialize
    $timeout($scope.getAppointments,500);
    $ionicNavBarDelegate.showBackButton(true);

})

    .controller('history',function($scope,$stateParams,$kinvey,$rootScope,$ionicNavBarDelegate){

    $scope.getPatient = function(id) {
        $kinvey.DataStore.get('Patients',id). 
        then(function(o){
            $scope.patient = o;
        });
    }

    $scope.getHistory = function(id) {
        q = new $kinvey.Query();
        q.equalTo('patientId',id).descending('dateStart');
        $kinvey.DataStore.find('Events',q).
        then(function(events){
            $scope.events = events;
            $scope.events.forEach(function(event,index){
                $kinvey.DataStore.get('EventTypes',event.eventTypeId). 
                then(function(type){
                    $scope.events[index].constructor = type;
                    if($scope.events[index].data.length>5)
                        $scope.events[index].data = JSON.parse($scope.events[index].data);
                    else
                        $scope.events[index].data = {};
                })
            })
        })
    }

    $scope.doRefresh = function() {
        console.log("Updating this view");
        $scope.getHistory(id);
        $scope.getPatient(id);
        $scope.$broadcast('scroll.refreshComplete');
    }

    var id = $stateParams.id
    console.log("Request for history: patient",id);
    $scope.getPatient(id);
    $scope.getHistory(id);
    $ionicNavBarDelegate.showBackButton(true);

})

    .controller('appointment', function($scope,$rootScope,$timeout,$kinvey,$stateParams,$ionicModal,$filter,$location,$state,$ionicHistory,$http) {

    $scope.getAppointment = function(id) {
        //$kinvey.ping().then(function() {
        console.log("Retrieving appointment "+id);
        $kinvey.DataStore.get('Appointments',id).
        then(function(o) {
            $scope.appt = o;
            console.log("Appointment retrieved. Retrieving patient... ");
            q = new $kinvey.Query();
            q.equalTo('patientId',o.patientId).descending('_id');
            $kinvey.DataStore.find('Events',q).
            then(function(events){
                $scope.events = events;
                $scope.events.forEach(function(event,index){
                    console.log(event);
                    $kinvey.DataStore.get('EventTypes',event.eventTypeId). 
                    then(function(type){
                        $scope.events[index].constructor = type;
                        if($scope.events[index].data.length>5)
                            $scope.events[index].data = JSON.parse($scope.events[index].data);
                        else
                            $scope.events[index].data = {};
                    })
                })
            });
            $kinvey.DataStore.get('Patients',o.patientId). 
            then(function(p) {
                $scope.patient = p;
                $scope.physician = $rootScope.userDetails.physician;
                console.log("Patient retrieved");
            }). 
            then(function(){
                console.log('Appointment',$scope.appt);
                console.log('Patient',$scope.patient);
                console.log('Physician',$scope.physician);
                console.log('Events',$scope.events);
                $rootScope.historyEvents = $scope.events;
            });
        }) 
        //})
    }

    $scope.getTypes = function() {
        $kinvey.ping().
        then(function(){
            $kinvey.DataStore.get('EventTypes').
            then(function(types){
                $scope.types = types;
                $scope.types.forEach(function(type,index){
                    if($scope.types[index].data.length > 5)
                        $scope.types[index].data = JSON.parse(data);
                    else
                        $scope.types[index].data = {};
                })
                console.log('Event types',$scope.types);
            })
        })
    }

    $scope.setModel = function(id) {
        $scope.types.forEach(function(type){
            if(id==type._id)
                $scope.constructor = type;
        });
        console.log("Model set to "+$scope.constructor.name);
        console.log($scope.constructor);
        $scope.new = Object();
        $scope.new.subjective = $scope.appt.comment;
        $scope.saveButton = "Save";
    }

    $scope.finishAppointment = function() {
        $scope.finishButton = "Finishing";
        appointment = $scope.appt;
        appointment.dateFinish = Math.floor(Date.now()/1000);
        appointment.status = 'finished';
        console.log("New appointment",appointment);
        // Update Database
        $kinvey.DataStore.save("Appointments",appointment). 
        then(function(r){
            $scope.appt = r;
            $scope.finishButton = "Finishing... ";
            if(billAfterAppointment) {
                $scope.finishButton = "Billing...";
                // Find the customer ID
                //var qU = new $kinvey.Query();
                //qU.equalTo('_id',$scope.patient.userId).limit(1);
                console.log("Looking for user ",$scope.patient.userId);
                //
                //$scope.patient.userId = "57a660ad25cb6c6d53ddde37";
                $kinvey.User.get($scope.patient.userId). 
                then(function(user){
                    alert("Dev note: charging to 57a660ad25cb6c6d53ddde37 (Kris) card. ");
                    console.log(user);
                    customerId = user.stripeCustomer;
                    if(!customerId) {
                        alert("This patient has no credit card associated. Taking customer fallback.");
                        customerId = "cus_8xd1qTwiveYIvw";
                    }
                    console.log("Stripe customer",customerId);
                    // Charge to credit card
                    $kinvey.execute('oneTimeStripeCharge',{
                        amount: 20000,
                        currency: 'usd',
                        customer: customerId,
                        description: 'BetterOnCall appt '+appointment._id+", "+appointment.dateFinish
                    }). 
                    then(function(o){
                        $scope.chargeDetails = o.stripe_charge;
                        console.log("Stripe Charge info: ",$scope.chargeDetails);
                        $kinvey.DataStore.save("StripeTransactions",$scope.chargeDetails). 
                        then(function(t){
                            console.log("Transaction saved to Kinvey");
                        });
                        $scope.finishButton = "Done";
                        $rootScope.setStatus("Available");
                        $state.go('app.appointmentfinished',{id:r._id,charge:$scope.chargeDetails.id});
                    }, function(t){
                        console.log(t);
                        if(typeof t.stripe_charge!='undefined')
                            $scope.error = t.stripe_charge.error.message;
                        else
                            $scope.error = "Could not complete the billing process. ";
                    });
                }, function(err){
                    console.error(err);
                    alert('Could not retrieve user');
                });
            }
            else {
                $scope.finishButton = "Done";
                $rootScope.setStatus("Available");
                $state.go('app.appointmentfinished',{id:$scope.appt._id,charge:$rootScope.chargeDetails.id});
                $rootScope.chargeDetails = null; // Clean environment for next appointment
            }
        });
    }

    // Special forms 
    $scope.showDynamicConstructor = function(constructor) {
        $scope.dynamicConstructor = !(constructor=="Vitals"); // || constructor=="SOAP")
        return (constructor==$scope.constructor.name && $scope.dynamicConstructor);
    }

    // EHR modal related functions
    $ionicModal.fromTemplateUrl('templates/ehr.html', {scope: $scope}).
    then(function(modal) {
        $scope.modal = modal;
        $scope.objectiveFormElements = [
            {
                name: 'General',
                data: [
                    'fever','chills','night sweats','weight loss','poor appetite','insomnia','fatigued','depressed','hyperactive','exposure to foreign countries'
                ]
            },
            {
                name: 'Skin',
                data: [
                    'rashes','infections','ulcerations','pemphigus','herpes'
                ]
            },
            {
                name: 'Heent',
                data: [
                    'cataracts','glaucoma','double vision','blurred vision','poor hearing','headaches','ringing in ears','bloody nose','sinusitis','dry mouth','strep throat','tonsillectomy','swollen lymph nodes','throat cancer'
                ]
            },
            {
                name: 'Cardiovascular',
                data: [
                    'heart attack','irregular heartbeat','chest pains','shortness of breath','high blood pressure','poor circulation','catheterization','coronary artery bypass'
                ]
            },
            {
                name: 'Endochrine',
                data: [
                    'insulin dependent diabetes','non insulin dependent diabetes','hyperhyroidism','hipothyroidism','cushing','addison'
                ]
            },
            {
                name: 'Pulmonary',
                data: [
                    'emphysema','chronic bronchitis','shortness of breath','lung cancer','pheumothorax'
                ]
            },
            {
                name: 'Genitourinary',
                data: [
                    'kidney failure','kidney stones','kidney cancer','kidney infections','bladder cancer','bladder infections','prostate problems','prostate cancer','STD','burning with urination','discharge from urethra'
                ]
            },
            {
                name: 'Gastrointestinal',
                data: [
                    'Stomach pains','peptic ulcer disease','gastritis','endoscopy','polyms','colonoscopy','colon cancer','ulcerative colitis','chrohn','appendicectpmy','diverticulitis','gail stones','cholecystectomy','hepatitis','cirrhosis','splenectomy'
                ]
            },
            {
                name: 'musculoeskeletal',
                data: [
                    'osteoarthritis','rheumotoid arthritis','lupus','swollen joints','stiff joints','broken bones','neck problems','back problems','scollosis','herniated disc','shoulder problems','elbow problems','wrist problems','hand problems','hip problems','knee problems','ankle problems','foot problems'
                ]
            }
        ];

        function chunk(arr, size) {
            var newArr = [];
            for (var i=0; i<arr.length; i+=size) {
                newArr.push(arr.slice(i, i+size));
            }
            return newArr;
        }

        $scope.objectiveFormElements = chunk($scope.objectiveFormElements, 3);

    });

    $scope.closeExtendedEHR = function() {
        $scope.modal.hide();
    };
    $scope.openExtendedEHR = function(l) {
        console.log("Attempting to open modal for ",l);
        if(l=='objective')
            $scope.modal.show();
    };
    $scope.addToObjective = function(str) {
        strToAdd = $filter('camelcase')("---"+str+"\n");
        if(typeof $scope.new.objective == 'undefined')
            $scope.new.objective = "";
        $scope.new.objective += strToAdd;
        console.log("Added",str,"to objective");
    }

    // History modal related functions
    $scope.openHistory = function() {
        console.log("Attempting to open history modal");
        $ionicModal.fromTemplateUrl('templates/history.html', {scope: $scope}).
        then(function(m) {
            $scope.modalHistory = m;
            $scope.modalHistory.show();
            console.log("History modal created",$scope);
        });
    };
    $scope.closeHistory = function() {
        console.log("Closing history modal");
        $scope.modalHistory.hide();
    };


    $scope.watchMe = function() {
        console.log($scope.new);
    }

    // Here comes the action
    $scope.saveEvent = function() {
        console.log($scope.new);
        $scope.saveButton = "Saving...";
        event = {
            patientId: $scope.patient._id,
            physicianId: $scope.physician._id,
            eventTypeId: $scope.constructor._id,
            data: JSON.stringify($scope.new),
            //data: $scope.new,
            dateStart: Math.floor(Date.now()) // Remember, now() gets miliseconds
        }
        $kinvey.DataStore.save('Events',event).
        then(function(e){
            console.log(e);
            $scope.saveButton = "Saved";
        });
    }

    $scope.doRefresh = function() {
        $scope.getAppointment();
        $scope.getTypes();
        $timeout(function(){        
            $scope.$broadcast('scroll.refreshComplete');
        },500);
    }

    // Initialize
    $scope.saveButton = "Save";
    $scope.finishButton = "Finish appointment";
    $scope.new = Object();
    console.log($scope.appt);
    if($stateParams.charge)
        $scope.getStripeCharge($stateParams.charge);
    $timeout(function(){
        $scope.getTypes();
        $scope.getAppointment($stateParams.id);
        $rootScope.setStatus("Appointment");
    },1000);
    //$ionicNavBarDelegate.showBackButton(false);

})

    .controller('appointmentFinished',function($scope,$stateParams,$kinvey){
    $scope.getStripeCharge = function(id) {
        console.log("Getting charge ",id);
        var q = new $kinvey.Query();
        q.equalTo("id",id);
        $kinvey.DataStore.find('StripeTransactions',q). 
        then(function(o){
            $scope.charge = o;
            console.log($scope.charge);
        })
    }

    $scope.getAppointmentDetails = function(id) {
        console.log("Getting appointment ",id);
        $kinvey.DataStore.get('Appointments',id). 
        then(function(o){
            $scope.appointment = o;
            $kinvey.DataStore.get('Patients',$scope.appointment.patientId). 
            then(function(p){
                $scope.appointment.patient = p;
                console.log($scope.appointment);
            })
        })
    }

    $scope.rateAppointment = function(stars) {
        $scope.appointment.rate = stars;
        $scope.appointment.patient = null;
        $kinvey.DataStore.save('Appointments',$scope.appointment). 
        then(function(o){
            console.log("Appointment rated to",stars,"stars");
            $scope.getAppointmentDetails($stateParams.id);
            for(r=1;r<=5;r++)
                $scope.stars[r].ok = false;
            for(r=1;r<=stars;r++)
                $scope.stars[r].ok = true;
        });
    }

    $scope.stars = Object();
    $scope.stars[1] = {rate:1, ok:false};
    $scope.stars[2] = {rate:2, ok:false};
    $scope.stars[3] = {rate:3, ok:false};
    $scope.stars[4] = {rate:4, ok:false};
    $scope.stars[5] = {rate:5, ok:false};
    console.log($scope.stars);
    $scope.chargeId = $stateParams.charge;
    $scope.getAppointmentDetails($stateParams.id);
    $scope.getStripeCharge($stateParams.charge);
    console.log($stateParams);
})

    .controller('PlaylistCtrl', function($scope, $rootScope, $stateParams) {
    console.log($stateParams);
    $rootScope.playlists.forEach(function(o){
        if(o.id==$stateParams.playlistId) 
            $scope.thisPlaylist = o.title;
    });
})

    .controller('PatientsCtrl', function($scope, $rootScope, $stateParams, $kinvey) {

    $scope.doRefresh = function() {
        console.log("Loading patients...");
        $kinvey.DataStore.find('Patients').
        then(function(o){
            $scope.patients = o;
        }, function(err){
            console.log(err);
            $scope.patients = [
                {
                    firstName: err.name,
                    lastName: err.description
                }
            ];
        });
        $scope.$broadcast('scroll.refreshComplete');
    }
    $scope.doRefresh();

})

    .controller('MyAccountCtrl', function($scope, $rootScope, $stateParams, $kinvey, $cordovaCamera, $ionicPopup, $timeout, $state) {

    $scope.askForFillUp = function() {
        //alert("Fill up your profile so you can be reached by patients!");
        var alertPopup = $ionicPopup.alert({
            title: 'Edit profile',
            template: 'Fill up your profile so you can be reached by patients'
        });

        alertPopup.then(function(res) {
            console.log('Thank you for eating my delicious ice cream cone. Maybe. ');
        });
    }

    $scope.getProfile = function() {
        if($rootScope.userDetails.physician)
        {
            console.log("Fetching profile ",$rootScope.userDetails.physician._id);
            $kinvey.DataStore.get('Physicians',$rootScope.userDetails.physician._id).
            then(function(o) {
                $scope.profile = o;
                if($scope.profile.firstName)
                { 
                    $("#myAccountForms :input").prop("disabled", true);
                    $("#myAccountForms :input[type=file]").prop("disabled", false);
                }
                else
                    $scope.askForFillUp();
            });
        }
        else
            $scope.askForFillUp();
    }

    $scope.dashThisNumber = function() {
        console.log("Inserting dashes to this phone number");
        r = $scope.profile.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
        console.log(r);
        $scope.profile.phone = r;
    }

    $scope.saveProfile = function() {
        $scope.editButton = "Saving... ";
        // Save profile itself
        console.log($scope.profile);
        $kinvey.DataStore.save('Physicians',$scope.profile). 
        then(function(e){
            newUser = $rootScope.userDetails;
            $rootScope.userDetails.physician = e;
            newUser.first_name = $rootScope.userDetails.physician.firstName;
            newUser.last_name = $rootScope.userDetails.physician.lastName;
            newUser.phone = $rootScope.userDetails.physician.phone;
            $kinvey.User.update(newUser). 
            then(function(e){
                $rootScope.userDetails = newUser;
                $rootScope.userDetails.physician = $scope.profile;
                $scope.editButton = "Done";
                $timeout(function(){
                    $scope.editButton=="Edit";
                },1000);
            });
        },function(e){
            $scope.saveButtonText = ":( Try again";    
        });
    }

    $scope.upperButton = function() {
        if($scope.editButton=="Edit") {
            //if(confirm("Changing your personal data may cause your patients not to find you easily. Take that on consideration.\nDo you want to proceed? ")) {
            $("#myAccountForms :input").prop("disabled", false);
            $scope.editButton = "Save";
            //}
        }
        else if($scope.editButton=="Save") {
            $scope.saveProfile();
            $timeout(function(){
                $scope.editButton = "Edit";
                $rootScope.goToMain();
            },1000);
        }
    }

    $scope.popupUpload = function() {
        var myPopup = $ionicPopup.show({
            title: 'Change Avatar',
            subTitle: 'Select camera or your photo galleries',
            scope: $scope,
            buttons: [
                {
                    text: '<b>Camera</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                        $scope.avatarSource = 'camera'    
                    }
                },
                {
                    text: '<b>Gallery</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                        $scope.avatarSource = 'gallery'
                    }
                }
            ]
        });

        myPopup.then(function(res) {
            console.log("hey");
            $scope.upload($scope.avatarSource);
        });
    }

    $scope.upload = function(source) {
        if(source=='camera' || !source)
            codedSource = Camera.PictureSourceType.CAMERA;
        else if(source=='gallery' || source=='album')
            codedSource = Camera.PictureSourceType.PHOTOLIBRARY; 
        console.log("Attempting to upload photo from device camera... ");
        var options = {
            quality : 75,
            destinationType : Camera.DestinationType.DATA_URL, // Sets format to base64
            sourceType : codedSource,
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            popoverOptions: CameraPopoverOptions,
            targetWidth: 300,
            targetHeight: 300,
            saveToPhotoAlbum: false
        };
        $cordovaCamera.getPicture(options).
        then(function(imageData) {
            console.log(imageData);
            $scope.changeAvatarButtonText = "Changing... ";
            $scope.avatar = imageData;
            // Update profile
            newUser = $rootScope.userDetails;
            // We hold Physician data so we dont have to fetch it again
            tempPhysician = $rootScope.userDetails.physician; 
            newUser.physician = "";
            // Save user avatar
            newUser.profilePicture = imageData;
            $kinvey.User.update(newUser).
            then(function(e){
                $rootScope.userDetails = e;
                $rootScope.userDetails.physician = tempPhysician;
            });
            // Save public avatar. We could do just one. But which? Meanwhile, this is the important one. 
            tempPhysician.profilePicture = imageData;
            $kinvey.DataStore.save("Physicians",tempPhysician). 
            then(function(o) {
                $rootScope.userDetails.physician = o;
                $scope.changeAvatarButtonText = "Picture changed";
            })
        }, function(error) {
            console.error(error);
        });
    }

    $scope.savePhoto = function() {
        alert("Saving photo");
    }

    $scope.doRefresh = function() {
        $scope.$broadcast('scroll.refreshComplete');
    }

    // Initialize
    $scope.profile = Object();
    $scope.profile.profilePicture = "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cCaR6Iq+7Bsvm6QqsIdIKLUPrMSaAY2Yq0ZyJY9jbzkd3jBOgLQ6O5VC7ad5RfijQt9WfkKHZMAC5ikmMZbCjugkQlRJwbToUN48J3B3M9qlvvZgrnFoaDwhmbOTsmJC8CsbiyhY0wlcmV3DFJ2CNj3WRycJEQzURk6QLYHsIZEJSCC4Ni8y5E5BPomjRVD9w17HIdjUJrcXBsJSg/O64eUVKW9BsBdGoH3LfcRJnxb1dea0Yj4/s681oxHx/Z15rRiPj+zrzWjEfH9nXmtGI+P7OvNaMR8f2dea0Yj4/s69XU4O1xS4qlxVLiqXFUuKpcVS4qlxVLiqXFUuKpcVS4qlxVLiqXFUuKpcVS4qlxVLiqXFUuKpcVS4qlxVLiqXFUuKpcVS4qlxVLiqXFUuKpcVS4qlxVLiqXFUuKpcVS4qlxVLiqXFUuKpcVUvTuHe8/1Ef//aAAwDAQACAAMAAAAQ8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888842/v/20888888888888888888888888l/8A/wD/AP8A/wDnzzzzzzzzzzzzzzzzzzzzzzX/AP8A/wD/AP8A/wC/zzzzzzzzzzzzzzzzzzzzzzf/AP8A/wD/AP8A/wD+7zzzzzzzzzzzzzzzzzzzyx//AP8A/wD/AP8A/wD/AP8APPPPPPPPPPPPPPPPPPPLf/8A/wD/AP8A/wD/AP71PPPPPPPPPPPPPPPPPPPPf/8A/wD/AP8A/wD/AP8A/wA888888888888888888883/wD/AP8A/wD/AP8A/v8APPPPPPPPPPPPPPPPPPPPFv8A/wD/AP8A/wD/AP1fPPPPPPPPPPPPPPPPPPPPLG//AP8A/wD/AP8A+c8888888888888888888888s2//AP8A/wD+88888888888888888888888888ctO9M888888888888888888888888888888888888888888888888888888888888888888888888888888888888885xO+fPPf/feKz9088888888888884lP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";
    $scope.avatar = Array(); // This holds whichever picture user uploads
    $scope.profile.userId = $rootScope.userDetails._id;
    $scope.saveButtonText = "Save";
    $scope.changeAvatarButtonText = "Change";
    $scope.editButton = "Edit";
    $scope.getProfile();
    $scope.doRefresh();

})

    .controller('schedule',function($scope,$rootScope,$kinvey,$ionicModal,$timeout,$filter){

    $scope.getTimeSlots = function() {
        q = new $kinvey.Query();
        q.equalTo('physicianId',$rootScope.userDetails.physician._id);
        q.greaterThanOrEqualTo('from', Date.now()/1000);
        q.ascending('from');
        $kinvey.DataStore.find('AvailabilitySlots', q). 
        then(function(o){
            $scope.slots = o;
            $scope.slots2 = Object();
            $scope.slots.forEach(function(slot){
                dateIndex = $filter('date')(slot.from*1000,'MMM dd, yyyy');
                if( typeof $scope.slots2[dateIndex] == 'undefined' )
                    $scope.slots2[dateIndex] = {
                        date: dateIndex,
                        slots: Array()
                    }
                    $scope.slots2[dateIndex].slots.push(slot);
            })
            console.log("Sorted slots",$scope.slots2);
        })

    }

    $scope.popupAddSlot = function() {
        console.log(new Date());
        $scope.newSlot = Object();
        $ionicModal.fromTemplateUrl('templates/slots-modal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }). 
        then(function(o){
            $scope.slotModal = o;
            $scope.slotModal.show();
        })
    }

    $scope.closePopupAddSlot = function() {
        $scope.slotModal.hide();
    }

    $scope.addSlot = function() {
        $scope.slotOverlapped = null;
        console.log("Current date is ",new Date());
        $scope.saveButton = "Adding...";
        $scope.slotToSave = Object();
        if(!$scope.newSlot.to_date)
            $scope.newSlot.to_date=$scope.newSlot.from_date;
        //$scope.slotToSave.from = Date.parse($scope.newSlot.from)/1000;
        //$scope.slotToSave.to = Date.parse($scope.newSlot.to)/1000;
        offset = new Date().getTimezoneOffset();
        offset = offset / 60 * 3600; // Maybe we need to sum one hour to this. I can't understand the fucking difference in timezone systems.
        offset = 0; // Because fuck you, that's why
        console.log("Offset is",offset);
        //
        $scope.newSlot.from_date = Date.parse($scope.newSlot.from_date)/1000;
        $scope.newSlot.from_time = parseInt($scope.newSlot.from_time);
        $scope.newSlot.to_date = Date.parse($scope.newSlot.to_date)/1000;
        $scope.newSlot.to_time = parseInt($scope.newSlot.to_time);
        console.log("Retrieved slot",$scope.newSlot);
        //
        $scope.slotToSave.from = $scope.newSlot.from_date+$scope.newSlot.from_time+offset;
        $scope.slotToSave.to = $scope.newSlot.to_date+$scope.newSlot.to_time+offset;
        $scope.slotToSave.physicianId = $scope.userDetails.physician._id;
        console.log("Formatted slot",$scope.slotToSave);
        // Before inserting, check if it overlaps with another time slot
        allowInsert = true;
        $scope.slots.forEach(function(slot){
            if( $scope.slotToSave.to >slot.from || slot.to > slotToSave.from ) {
                allowInsert = false;
                $scope.slotOverlapped = slot;
            }
        });
        if(allowInsert)
            $kinvey.DataStore.save('AvailabilitySlots',$scope.slotToSave). 
            then(function(o) {
                $scope.saveButton = "Added";
                $scope.getTimeSlots();
                $timeout(function(){
                    $scope.slotModal.hide();
                    $scope.saveButton = "Add";
                },500);
            });
    }

    // Init
    $scope.hoursStart = 7;
    $scope.hoursEnd = 19;
    $scope.hoursAvailable = Array();
    for(a=$scope.hoursStart; a<=$scope.hoursEnd; a++) {
        $scope.hoursAvailable.push({
            show: ""+a+":00",
            value: a*3600
        });
        $scope.hoursAvailable.push({
            show: ""+a+":30",
            value: a*3600+1800
        });
    }
    $scope.getTimeSlots();
    $scope.saveButton = "Add";
})

    .controller('statistics',function($scope,$rootScope,$kinvey){

    console.log("Statistics");

    $scope.getStatistics = function() {
        $scope.stats = {
            ratings: 0,
            count_raters: 0,
            appointments_completed: 0,
            time_invested: 0,
            income_earned: 0,
            soaps: 0
        };
        $scope.stats.genders = Array();
        $scope.graph = [{ y: Date.now() }];
        $scope.stats.services = Array();
        var q = new $kinvey.Query();
        q.equalTo('physicianId',$rootScope.userDetails.physician._id);
        $kinvey.DataStore.find('Appointments',q). 
        then(function(appointments){
            appointments.forEach(function(appointment){
                $kinvey.DataStore.get('Patients',appointment.patientId). 
                then(function(patient){
                    // Ratings by gender
                    if(patient.gender==null || patient.gender=="")
                        genderIndex = "Other";
                    else
                        genderIndex = patient.gender;
                    myRate = (appointment.rate)
                        ? appointment.rate : 5;
                    if(typeof $scope.stats.genders[genderIndex] == 'undefined') {
                        $scope.stats.genders[genderIndex] = {gender:genderIndex,count:1,rate:myRate};
                    }
                    else {
                        $scope.stats.genders[genderIndex].count += 1;
                        $scope.stats.genders[genderIndex].rate += myRate;
                    }
                    $scope.graph[0][genderIndex] = $scope.stats.genders[genderIndex].rate/$scope.stats.genders[genderIndex].count
                    // Rating general
                    if(myRate) {
                        $scope.stats.ratings+=myRate;
                        $scope.stats.count_raters++;
                    }
                    // Service
                    myService = (appointment.service)
                        ? appointment.service : "Wellness";
                    if(typeof $scope.stats.services[myService] == 'undefined') {
                        $scope.stats.services[myService] = {service:myService,count:1};
                    }
                    else {
                        $scope.stats.services[myService].count += 1;
                    }

                    $scope.stats.appointments_completed++;
                    if(appointment.dateFinish!=null && appointment.dateFinish<1000000000000) {
                        $scope.stats.time_invested += (appointment.dateFinish-appointment.dateStart);
                    }
                    $scope.stats.income_earned += 150;
                    //
                    console.log("Stats",$scope.stats);
                    console.log("Graph",$scope.graph);
                });
            });
        });
        q.equalTo("eventTypeId",'576aba001860c111787faf4f');
        $kinvey.DataStore.count('Events',q). 
        then(function(c){
            $scope.stats.soaps = c;
            console.log("Fetched SOAPs",c);
        });
    }

    $scope.getStatistics();
})

    .controller('MyHistory',function($scope,$rootScope,$kinvey,$q){

    $scope.getAppointments = function() {
        q = new $kinvey.Query(); 
        q.equalTo("physicianId",$rootScope.userDetails.physician._id);
        q.descending('dateStart');
        $kinvey.DataStore.find('Appointments',q). 
        then(function(o){
            $scope.appointments = o;
            $scope.appointments.forEach(function(appointment){
                $kinvey.DataStore.get('Patients',appointment.patientId). 
                then(function(patient){
                    appointment.patient = patient;
                    appointment.physician = null;
                });
            });
        });
    }

    $scope.selectAppointment = function(id) {
        console.log("Reviewing appointment",id);
        $scope.appointments.forEach(function(a){
            if(a._id==id)
                $scope.currentAppointment = a;
        });
    }

    $scope.getAppointments();

})
