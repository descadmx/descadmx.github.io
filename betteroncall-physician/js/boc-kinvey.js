var initialized = false;

// Is localStorage available?
var test = 'test';
try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
} catch(e) {
    alert('This app wont be available in your device. Try opening BOC Physician Web App on an HTML5 browser. ');
}

// For the sake of this test
//localStorage.setItem('boc-user','alherrera42@gmail.com');
//localStorage.setItem('boc-pass','pass!word2888');

var app = angular.module('BetterOnCall', ['kinvey']);//,'ui.calendar']);

app.constant('kinveyConfig', {
    // Old keys, used on alherrera42@gmail.com account
    //appKey: 'kid_Zkj9R6jZm-',
    //appSecret: '09721f5a996144e291e7cb12c33f3e7c'

    // Keys for jp@betteroncall.com
    appKey: 'kid_byJYNc2lQ-',
    appSecret: 'ee19337d701440ccaddfa17dbeb86880'
});

app.filter('urlencode',function(){
    return function(str) {
        return encodeURIComponent(str);
    }
});

/*
app.run(['$kinvey', '$rootScope', '$location', 'kinveyConfig','$location', function($kinvey, $rootScope, $location, kinveyConfig, $location) {
    $rootScope.$on('$locationChangeStart', function(event, newUrl) {
        if (!initialized) {
            event.preventDefault(); // Stop the location change
            // Initialize Kinvey
            $kinvey.init(kinveyConfig).then(function() {
                user = localStorage.getItem('boc-user') 
                //? localStorage.getItem('boc-user') : 'alherrera42@gmail.com';
                pass = localStorage.getItem('boc-pass') 
                //? localStorage.getItem('boc-pass') : 'pass!word290';
                initialized = true;
                var promise = $kinvey.User.login({
                    username : user,
                    password : pass
                });
                promise.then(function(loggedin) {
                    console.log(loggedin);
                    //loadAbsolutelyEverything();
                }, function(err) {
                    console.log(err);
                    if(err.name!='AlreadyLoggedIn')
                    {
                        console.log('Requesting credentials... ');
                        //$("#login-modal").modal('show');
                        $location.path('/login');
                    }
                });
                $location.path($location.url(newUrl).hash); // Go to the page
            }, function(err) {
                console.err(err);
            });
        }
    });
    //var user = $kinvey.getActiveUser();
    $kinvey.ping().
    then(function(){
        $kinvey.User.me().
        then(function(o){
            $rootScope.userDetails = o;
            query = new $kinvey.Query();
            query.equalTo('userId',$rootScope.userDetails._id).limit(1);
            $kinvey.DataStore.find('Physicians',query).
            then(function(p){
                $rootScope.userDetails.physician = p[0];
                console.log($rootScope.userDetails);
            });
        });        
    })

}]);
*/

app.controller("boc-login", function($kinvey,$scope,$rootScope,$timeout) {

    $scope.user = localStorage.getItem('boc-user') 
    //? localStorage.getItem('boc-user') : 'alherrera42@gmail.com';
    $scope.pass = localStorage.getItem('boc-pass') 
    //? localStorage.getItem('boc-pass') : 'pass!word290';

    $scope.signIn = function() {
        $scope.msg = "";
        $kinvey.User.logout({force:true})
            .then(function(){
            console.log('Got out of any pre-existent session');
            $kinvey.User.login({
                username : $scope.user,
                password : $scope.pass
            })
                .then(function(loggedin) {
                console.log(loggedin);
                localStorage.setItem('boc-user',$scope.user);
                localStorage.setItem('boc-pass',$scope.pass);
                $scope.msg = "Login successful";
                $timeout(function(){
                    $scope.msg = "";
                    $("#login-modal").modal('hide');
                },500);
            }, function(err) {
                console.log(err);
                $scope.msg = err.description;
                if(err.name!='AlreadyLoggedIn')
                {
                    console.log('Requesting credentials... ');
                    $("#login-modal").modal('show');
                }
            });
        });
    }

    $scope.signUp = function() {
        $scope.msg = "";
        $kinvey.User.logout({force:true})
            .then(function(){
            console.log("Sign out users, if any");
            $kinvey.User.signup({
                username: $scope.user,
                email: $scope.user,
                password: $scope.pass
            })
                .then(function(o){
                console.log(o);
                $scope.msg = "ONE STEP MORE! Please verify your email address. Check your inbox, follow the instructions and try to login. ";
            }, function(err){
                console.log(err);
                $scope.msg = "Oops! There was an error signing you up. ";
                $scope.msg += err.description;
                //$scope.msg += "<span class='text-muted small'>"+err.description+"</span>";
            })
        });
    }

});

app.factory('arrayProvider',function(){
    return {
        getSimpleArray: function() {
            return ['one','two','twoandahalf','three']
        }
    }
})

app.factory('peopleFactory', ['$q', '$kinvey', function($q, $kinvey) {

    var peopleFactory = { 

        getPhysicians: function(options) {
            var deferred;
            options = options || {};
            if (!deferred || options.force) {
                deferred = $q.defer();
                $kinvey.DataStore.find('Physicians').then(function(response) {
                    employees = response;
                    console.log(employees)
                    deferred.resolve(employees);
                }, function(error) {
                    deferred.reject(error);
                });  
            }
            return deferred.promise;
        },

        getPhysician: function(id) {
            var deferred;
            options = options || {};
            if (!deferred || options.force) {
                deferred = $q.defer();
                $kinvey.DataStore.get('Physicians',id).then(function(response) {
                    employees = response;
                    deferred.resolve(employees);
                }, function(error) {
                    deferred.reject(error);
                });  
            }
            return deferred.promise;
        },

        getPatients: function(options) {
            var deferred;
            options = options || {};
            if (!deferred || options.force) {
                deferred = $q.defer();
                $kinvey.DataStore.find('Patients').then(function(response) {
                    employees = response;
                    deferred.resolve(employees);
                }, function(error) {
                    deferred.reject(error);
                });  
            }
            return deferred.promise;
        }

    };

    return peopleFactory;

}])

app.factory('requestsFactory', ['$q', '$kinvey', function($q, $kinvey) {

    var requestsFactory = { 

        getAppointments: function(options) {
            var deferred;
            console.log("Fetching requests");
            options = options || {};
            if (!deferred || options.force) {
                deferred = $q.defer();
                $kinvey.DataStore.find('Appointments').then(function(response) {
                    r = response;
                    r.forEach(function(o,i){
                        $kinvey.DataStore.get('Patients',o.patientId)
                            .then(function(o){
                            r[i].patient = o;
                        })
                        $kinvey.DataStore.get('Physicians',o.physicianId)
                            .then(function(o){
                            r[i].physician = o;
                        })
                    })
                    console.log(r);
                    deferred.resolve(r);
                }, function(error) {
                    deferred.reject(error);
                });  
            }
            return deferred.promise;
        },

        createRequest: function(patient,reason,date,approved) {
            var deferred;
            if( typeof approved === undefined )
                approved = 'Request';
            console.log("Creating new request for patient "+patient);
            if (!deferred) {
                deferred = $q.defer();
                $kinvey.DataStore.save('Appointments',{
                    'patientId' : patient,
                    'dateRequested' : date,
                    'comment' : reason,
                    'state' : approved // All new requests have to get trough approval
                })
                    .then(function(o){
                    console.log(o);
                    deferred.resolve(o);
                }, function(error) {
                    deferred.reject(error);
                });
            }
            return deferred.promise;
        },

        assignRequestToPhysician: function(request,physician,date) {
            var deferred;
            console.log("Assigning request "+request+" to physician "+physician);
            if (!deferred) {
                deferred = $q.defer();
                // Just found out that if you want to update, you have to set the WHOLE object again
                $kinvey.DataStore.get('Appointments',request)
                    .then(function(o){
                    var req = o;
                    req.physicianId = physician;
                    req.dateStart = date;
                    $kinvey.DataStore.update('Appointments',req)
                        .then(function(o){
                        console.log(o);
                        deferred.resolve(o);
                    }, function(error) {
                        deferred.reject(error);
                    });
                })
            }
            return deferred.promise;
        }

    };

    return requestsFactory;

}]);

app.factory('ehrFactory', ['$q', '$kinvey', function($q, $kinvey) {

    var ehrFactory = { 

        getEHR: function(patient_id) {
            var deferred;
            var ehr = {};
            console.log("Fetching EHR from patient "+patient_id);
            options = typeof options !== undefined || {};
            if (!deferred || options.force) {
                deferred = $q.defer();
                $kinvey.DataStore.get('Patients',patient_id)
                    .then(function(o){
                    ehr.patient = o;
                    q = new $kinvey.Query();
                    q.equalTo('patientId',patient_id);
                    q.descending('_id');
                    $kinvey.DataStore.find('Events',q)
                        .then(function(evts){
                        ehr.events = evts;
                        ehr.events.forEach(function(o,i){
                            // Convert event data to JSON. I thought it was made by Kinvey Library already :(
                            o.data = JSON.parse(o.data);
                            // Format data in Object "displaydata" so it can be accesed easily by views
                            o.displaydata = [];
                            for(var k in o.data) 
                                o.displaydata.push({
                                    'key' : k,
                                    'value' : o.data[k]
                                });
                            // Get physician that erogated this service
                            $kinvey.DataStore.get('Physicians',o.physicianId)
                                .then(function(p){
                                ehr.events[i].physician = p; 
                            });
                            // Get constructor model
                            if(o.eventTypeId)
                                $kinvey.DataStore.get('EventTypes',o.eventTypeId)
                                    .then(function(constructor){
                                    ehr.events[i].constructor = constructor;
                                })
                                    .then(function(){});
                            else
                                ehr.events[i].constructor = {
                                    'name' : '-- Not associated --'
                                };
                        });
                    })
                        .then(function(){});

                })
                    .then(function(){
                    deferred.resolve(ehr);
                }, function(err){
                    deferred.reject(err);
                });
                return deferred.promise;
            }
        },
        getEvent: function(id) {
            var deferred;
            var event = {};
            console.log("Fetching event "+id);
            options = typeof options !== undefined || {};
            if (!deferred || options.force) {
                deferred = $q.defer();
                $kinvey.DataStore.get('Events',id)
                    .then(function(e){
                    event = e;
                    if(event.eventTypeId)
                        $kinvey.DataStore.get('EventTypes',event.eventTypeId).
                        then(function(o){
                            event.constructor = o;
                            event.constructor.model = JSON.parse(event.constructor.model);
                        });
                    if(event.appointmentId)
                        $kinvey.DataStore.get('Appointments',event.appointmentId).
                        then(function(o){
                            event.appointment = o;
                        });
                    if(event.patientId)
                        $kinvey.DataStore.get('Patients',event.patientId).
                        then(function(o){
                            event.patient = o;
                        });
                    if(event.physician)
                        $kinvey.DataStore.get('Physicians',event.physicianId).
                        then(function(o){
                            event.physician = o;
                        });
                    event.data = JSON.parse(event.data);
                })   
                    .then(function(){
                    deferred.resolve(event);
                }, function(err){
                    deferred.reject(err);
                });
                return deferred.promise;
            }
        }
    }
    return ehrFactory;

}]);