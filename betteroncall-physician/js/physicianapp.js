/*
app.config(['$routeProvider',
            function($routeProvider) {
                $routeProvider.
                when('/', {
                    templateUrl: 'templates/main.html',
                    controller: 'main'
                }).
                when('/main', {
                    templateUrl: 'templates/main.html',
                    controller: 'main'
                }).
                when('/current-appointment/:patient/:appointment', {
                    templateUrl: 'templates/current-appointment.html',
                    controller: 'currentAppointment'
                }).
                when('/login', {
                    templateUrl: 'templates/login.html',
                    controller: 'boc-login'
                }).
                when('/current-appointment/:patient', {
                    templateUrl: 'templates/current-appointment.html',
                    controller: 'currentAppointment'
                }).
                when('/myaccount', {
                    templateUrl: 'templates/my-account.html',
                    //controller: 'currentapointment'
                }).
                when('/contact', {
                    templateUrl: 'templates/contact-us.html',
                    //controller: 'currentapointment'
                }).
                when('/review-request/:request', {
                    templateUrl: 'templates/review-request.html',
                    controller: 'reviewRequest'
                }).
                when('/event/:event_id', {
                    templateUrl: 'templates/event.html',
                    controller: 'event'
                }).
                when('/event_ehr/:event_id', {
                    templateUrl: 'templates/systems-checks.html',
                    controller: 'event'
                }).
                otherwise({
                    redirectTo: '/'
                });
            }]);
*/


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


app.filter('timeTo',function(){
    function timeTo(date) {

        console.log('Converting '+date+' to human-readable date')
        var seconds = Math.floor((date - new Date()) / 1000);

        var interval = Math.floor(seconds / 31536000);

        if (interval < 1) {
            return interval + " years";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval < 1) {
            return interval + " months";
        }
        interval = Math.floor(seconds / 86400);
        if (interval < 1) {
            return interval + " days";
        }
        interval = Math.floor(seconds / 3600);
        if (interval < 1) {
            return interval + " hours";
        }
        interval = Math.floor(seconds / 60);
        if (interval < 1) {
            return interval + " minutes";
        }
        return Math.floor(seconds) + " seconds";
    }

});

app.controller("boc-login", function($kinvey,$scope,$rootScope,$location, $ionicPopup) {

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
                $location.path("/main");
                //$("#login-modal").modal('hide');
                window.location.reload();
            }, function(err) {
                console.log(err);
                $scope.msg = err.description;
                if(err.name!='AlreadyLoggedIn')
                {
                    console.log('Requesting credentials... ');
                    $location.path("/login");
                    //$("#login-modal").modal('show');
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

    $scope.passwordReset = function() {
        console.log("Requesting a password reset");
        $kinvey.User.resetPassword($scope.user). 
        then(function(o){
            console.log(o);
            $ionicPopup.alert({
                title: 'Password reset',
                template: 'An email has been sent to you. You can discard it if you remember your current password. '
            }).
            then(function(res) {
                console.log('Password reset popup flies away.');
            });
        }, function(err){
            console.log("Could not load Password Reset ");
        });
    }

});

app.controller("boc-navbar", function($kinvey,$scope,$rootScope,$location) {

    $scope.msg = "Click me to ping Kinvey. This wont appear in production stage. ";

    $rootScope.pingMe = function(){
        $scope.msg = "Pinging... ";
        console.log('Pinging... ');
        var promise = $kinvey.ping();
        promise.then(function(response) {
            $scope.msg = 'Kinvey Ping Success. Kinvey Service is alive, version: ' + response.version + ', response: ' + response.kinvey;
        }, function(error) {
            $scope.msg = 'Kinvey Ping Failed. Response: ' + error.description;
        });
    }

    $scope.logout = function() {
        $kinvey.User.logout()
            .then(function() {
            localStorage.setItem('boc-user','');
            localStorage.setItem('boc-pass','');
            //if($("#login-modal").length)
            //$("#login-modal").modal('show');
            //else
            $location.path("/login");
        });
    }

});

app.controller("main", function($kinvey,$scope,$rootScope,$timeout) {

    console.log('Loaded main screen');
    // A date helper function$scope.formatDate = function(date){
    $scope.strToDate = function (date) {
        var dateOut = new Date(date);
        //console.log(dateOut,date,typeof date);
        return dateOut;
    }

    //
    $scope.calendar = {
        eventSource: Array(),
        currentDate: new Date(),
        mode: 'day',
        allDaySlot: false,
        step: 60,
        minTime: "08:00:00",
        maxTime: "20:00:00"
    };
    $scope.onEventSelected = function (event) {
        console.log('Event selected:' + event.id );
        $scope.setAppointment(event.id);
    };
    $scope.onViewTitleChanged = function (title) {
        $scope.viewTitle = title;
    };
    $scope.today = function () {
        $scope.calendar.currentDate = new Date();
    };
    $scope.isToday = function () {
        var today = new Date(),
            currentCalendarDate = new Date($scope.calendar.currentDate);

        today.setHours(0, 0, 0, 0);
        currentCalendarDate.setHours(0, 0, 0, 0);
        return today.getTime() === currentCalendarDate.getTime();
    };
    $scope.onTimeSelected = function (selectedTime) {
        console.log('Selected time: ' + selectedTime);
    };
    $scope.changeMode = function(mode) {
        $scope.calendar.mode = mode;
    }

    // Title
    $scope.username = localStorage.getItem('boc-user');

    // Patient view
    $rootScope.patient_id = '';
    $rootScope.getPatient = function(id){
        console.log('Fecthing patient '+id+'...');
        $kinvey.ping()
            .then(function(){
            // getUrlVars() wont resolve patient ID until some time has passed. Turns out that Kinvey changes URL on the browser/viewport while loading the page. 
            setTimeout(function(){
                if( typeof id === undefined || id=='' || id==0 || !id )
                {
                    id = getUrlVars()['patient'];
                    console.log('Patient ID resolved to be '+id);
                }
                if(!id)
                    console.log('No patient specified. ');
                $rootScope.patient_id = id;
                $kinvey.DataStore.get('Patients',''+id)
                    .then(function(p){
                    $scope.patient = p;
                })
                    .then(function(){
                    console.log($scope.patient)
                });
            },300);
        })
    }

    // Lists
    $scope.getAppointments = function()
    {
        console.log('Getting Appointments');
        $kinvey.ping()
            .then(function(){
            var query = new $kinvey.Query();
            //query.equalTo('approved', false);// Append query to match physician
            query.equalTo('physicianId',$rootScope.userDetails._id);
            $kinvey.DataStore.find('Appointments',query)
                .then(function(requests){
                $scope.requests = requests;
                $scope.requests.forEach(function(o,i){
                    $kinvey.DataStore.get('Physicians',o.physicianId)
                        .then(function(physician){
                        $scope.requests[i]['physician'] = physician;
                    });
                    $kinvey.DataStore.get('Patients',o.patientId)
                        .then(function(physician){
                        $scope.requests[i]['patient'] = physician;
                    });
                })
            })
                .then(function(){
                console.log($scope.requests);
            });
        });
        $("#next-appointment").accordion({active: false});
    }
    $scope.getUpcoming = function()
    {
        $scope.upcoming = Array();
        console.log('Getting Upcoming Appointments');
        $kinvey.ping()
            .then(function(){
            var query = new $kinvey.Query();
            query
                .equalTo('physicianId',$rootScope.userDetails.physician._id)
                .greaterThanOrEqualTo('dateStart',Math.floor(Date.now()/1000))
                .ascending('dateStart');
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
                            $scope.$broadcast('eventSourceChanged',$scope.calendar.eventSource);
                        }
                    });
                });
                $timeout(function(){
                    $scope.appt = $scope.upcoming[0];
                },1000);
                console.log($scope.upcoming);
            });
        });
        $("#next-appointment").accordion({active: false});
    }

    $scope.setAppointment = function(id) {
        console.log(id);
        $scope.upcoming.forEach(function(o,i){
            console.log(o);
            if(o._id==id) {
                $scope.appt = o;
                console.log("View updated");
            }
        });
        //console.log($scope.requests);
        $('#next-appointment').accordion({
            active:1
        });
        console.log('Route to patient now is displayed on the map');
    }

    $timeout(function(){
        $rootScope.getPatient();
        $scope.getAppointments();
        $scope.getUpcoming();
        console.log($scope.calendar);
    },1000);

    // Next Appt
    $rootScope.getNextAppointment = function(patient_id)
    {
        console.log('Getting Next Appointment from '+patient_id);
        $kinvey.ping()
            .then(function(){
            var query = new $kinvey.Query();
            query
                .greaterThanOrEqualTo('dateStart',Math.floor(Date.now()/1000))
                .ascending('dateStart')
                .limit(1);
            //query.equalTo('approved', true).descending('date').limit(1); // Append query to match physician
            $kinvey.DataStore.find('Appointments',query)
                .then(function(appt){
                $scope.next_appt = appt;
                $scope.next_appt.forEach(function(o,i){
                    $kinvey.DataStore.get('Physicians',o.physicianId)
                        .then(function(physician){
                        $scope.next_appt[i]['physician'] = physician;
                    });
                    $kinvey.DataStore.get('Patients',o.patientId)
                        .then(function(physician){
                        $scope.next_appt[i]['patient'] = physician;
                    })
                })
            }).
            then(function(){
                console.log('Got next appt');
                console.log($scope.next_appt[0]);
                $scope.appt = $scope.next_appt[0];
            });
        });
    }
    $scope.onMyWay = function(patient){
        alert('On my way! \nPatient has been advised. ');
        $kinvey.ping()
            .then(function(){
            $kinvey.DataStore.save('notifications',{
                to: patient,
                message: 'A physician ('+patient+') is on its way'
            });
        });
    }
    $rootScope.getNextAppointment();

    // Calendar
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    $scope.eventSources = [
        {title: 'All Day Event',start: new Date(y, m, 1)},
        {title: 'Long Event',start: new Date(y, m, d - 5),end: new Date(y, m, d - 2)},
        {id: 999,title: 'Repeating Event',start: new Date(y, m, d - 3, 16, 0),allDay: false},
        {id: 999,title: 'Repeating Event',start: new Date(y, m, d + 4, 16, 0),allDay: false},
        {title: 'Birthday Party',start: new Date(y, m, d + 1, 19, 0),end: new Date(y, m, d + 1, 22, 30),allDay: false},
        //{title: 'Click for Google',start: new Date(y, m, 28),end: new Date(y, m, 29),url: 'http://google.com/'}
    ];
    $scope.uiConfig = {
        calendar:{
            lang: 'en-us',
            height: '50%',
            editable: true,
            minTime: "09:00:00",
            maxTime: "21:00:00",
            header:{
                left: 'title',
                center: '',
                right: 'month,agendaWeek,agendaDay today prev,next',
            },
            views: {
                week: {
                    titleFormat: 'MM/DD YYYY'
                }  
            },
            defaultView: 'agendaWeek',
            allDaySlot: false,
            eventClick: $scope.alertOnEventClick,
            eventDrop: $scope.alertOnDrop,
            eventResize: $scope.alertOnResize,
            eventRender: $scope.eventRender
        }
    };

});

app.controller("currentAppointment", function($kinvey,$scope,$rootScope,$routeParams,$location,ehrFactory) {

    $scope.patient_id = $routeParams.patient;
    $scope.request_id = $routeParams.appointment;
    console.log("patient: ",$scope.patient_id);
    console.log("request: ",$scope.request_id);


    // Events
    $scope.eventTypes = [];
    $scope.events = [];
    $scope.request_id = '';
    $scope.getEventTypes = function() {
        $kinvey.ping()
            .then(function(){        
            $kinvey.DataStore.find('EventTypes')
                .then(function(types){
                $scope.eventTypes = types;
                console.log($scope.eventTypes);
            })
        })
    }
    $scope.getEventType = function(id) {
        if(!id || typeof id === undefined)
            id = $scope.currenttype;
        console.log(id);
        $kinvey.ping()
            .then(function(){
            var query = new $kinvey.Query();
            query.equalTo('name', id).limit(1); // Append query to match physician
            $kinvey.DataStore.find('EventTypes',query).
            then(function(type){
                $scope.eventType = type[Object.keys(type)[0]];
                console.log(type);
                console.log('Fecthing event type '+id)
                console.log($scope.eventType);
            })
        })
    }
    $scope.getAllEventsData = function()
    {
        console.log("Current event type selected is "+$scope.currenttype);
        $scope.getEventTypes();
        $scope.getEventType($scope.currenttype);
    }
    $scope.getEvents = function()
    {
        $scope.ev = [];
        var tmp = [];
        $scope.request_id = $routeParams.appointment;
        $kinvey.ping().
        then(function(){
            ehrFactory.getEHR($scope.patient_id).
            then(function(ehr){
                console.log("Fetched EHR for patient "+$scope.patient_id);
                $scope.ehr = ehr;
                console.log($scope.ehr);
            });
        });
    }
    $scope.saveEvent = function() {
        $.fn.form = function() {
            var formData = {};
            this.find('[name]').each(function() {
                formData[this.name] = this.value;  
            })
            return formData;
        };
        var eventToSave = {};
        eventToSave.patient_id = $rootScope.patient_id;
        eventToSave.data = JSON.stringify($("#event-form").form());
        eventToSave.request_id = $scope.request_id;
        eventToSave.eventtype = $scope.eventType._id;
        console.log(eventToSave);
        $kinvey.User.me()
            .then(function(oo){
            eventToSave.physician_id = oo._id;
            $kinvey.DataStore.save('Events',eventToSave)
                .then(function(o){
                console.log('Event saved');
                console.log(o);
                $scope.getEvents();
                $('#modal-form').modal('hide');
                $scope.modal_error = "";
            }, function(error){
                console.log(error);
                $scope.modal_error = error.description;
            });
        })
    }
    // Patient    
    $rootScope.patient_id = '';
    $rootScope.getPatient = function(id){
        console.log('Fecthing patient '+id+'...');
        $kinvey.ping()
            .then(function(){
            // getUrlVars() wont resolve patient ID until some time has passed. Turns out that Kinvey changes URL on the browser/viewport while loading the page. 
            setTimeout(function(){
                if( typeof id === undefined || id=='' || id==0 || !id )
                {
                    id = $scope.patient_id;
                    console.log('Patient ID resolved to be '+id);
                }
                if(!id)
                    console.log('No patient specified. ');
                $rootScope.patient_id = id;
                $kinvey.DataStore.get('Patients',''+id)
                    .then(function(p){
                    $rootScope.patient = p;
                })
                    .then(function(){
                    console.log($scope.patient);
                });
            },300);
        })
    }

    // Request
    if($routeParams.appointment) {
        console.log('Looking for appointment '+$routeParams.appointment);
        $scope.getCurrentAppointment = function() {
            $kinvey.DataStore.get('Appointments',$routeParams.appointment).
            then(function(o){
                console.log(o);
                $rootScope.appt = o;
            })
        }
    }

    $scope.getEventTypes();
    $scope.getEventType('SOAP'); // Default
    $scope.getEvents();
    $scope.getCurrentAppointment();

    $scope.finishAppointment = function() {
        console.log("Appointment finished");
        $kinvey.DataStore.get('Appointments',$scope.request_id).
        then(function(o){
            o.status = "Finished";
            o.dateFinish = Math.floor(Date.now() / 1000);
            $kinvey.DataStore.update('Appointments',o).
            then(function(u){
                console.log(u);
                $location.path('/');
            },function(err){
                console.log(err);
                alert('There was an error updating the request. Try again later. ');
            });
        });
    }

    $rootScope.getPatient();

    // Refering to another physician
    $scope.refer = function() {
        $("#modal-form").modal('hide');
        $("#modal-refer").modal('show');
    }

    $scope.form_selector_disable = false;

    // Getting current event so it can be modified/viewed
    $scope.getCurrentEvent = function(event_id){
        ehrFactory.getEvent(event_id).
        then(function(o){
            $scope.event = o;
            q = new $kinvey.Query();
            $kinvey.DataStore.get('EventTypes',$scope.event.eventtype).
            then(function(o){
                $scope.getEventType(o.name);
            });
        });
        $scope.form_selector_disable = true;
        //$('#modal-form').modal('show');
        //$location.path($location.url("#/event/"+event_id));
    }

    $scope.openModalForm = function() {
        $scope.form_selector_disable = false;
        $('#modal-form').modal('show');
    }

});

app.controller("reviewRequest", function($kinvey,$scope,$rootScope,$routeParams,requestsFactory) {

    $scope.getRequest = function(id) {
        requestsFactory.getRequest(id).
        then(function(o) {
            $scope.request = o;
            console.log(o);
        })
    }
    $scope.getRequest($routeParams.request);

});

app.controller("event", function($kinvey,$scope,$rootScope,$routeParams,ehrFactory,$location) {

    $scope.event_id = $routeParams.event_id;

    $scope.getEvent = function(event_id){
        console.log($rootScope.appt);
        if(event_id==0) {
            $scope.event = {'data':{'subjective':$rootScope.appt.comment}};
            //$scope.event.data.subjective = $rootScope.appt.comment;
            console.log("Default 'subjective' value changed");
        }
        ehrFactory.getEvent(event_id).
        then(function(o){
            $scope.event = o;
            $scope.currenttype = $scope.event.constructor.name;
            // Change "Subjective" field
            console.log($scope.event);
            q = new $kinvey.Query();
            $kinvey.DataStore.get('EventTypes',$scope.event.eventTypeId).
            then(function(o){
                $scope.getEventType(o.name);
            });
        });
    }
    $scope.getEventTypes = function() {
        $kinvey.ping()
            .then(function(){        
            $kinvey.DataStore.find('EventTypes')
                .then(function(types){
                $scope.eventTypes = types;
                console.log($scope.eventTypes);
            })
        })
    }
    $scope.getEventType = function(id) {
        if(!id || typeof id === undefined)
            id = $scope.currenttype;
        console.log(id);
        $kinvey.ping()
            .then(function(){
            var query = new $kinvey.Query();
            query.equalTo('name', id).limit(1); // Append query to match physician
            $kinvey.DataStore.find('EventTypes',query).
            then(function(type){
                $scope.eventType = type[Object.keys(type)[0]];
                $scope.eventType.model = JSON.parse($scope.eventType.model);
                console.log('Fecthed event type '+id)
                console.log($scope.eventType);
            })
        })
    }

    $scope.openExtendedForm = function() {
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
        //$location.path("/event_ehr/"+$rootScope.event_id);
        $("#extendedForm").modal('show');
    }

    $scope.addToSOAP = function(str) {
        console.log(str);
        $scope.event.data.objective += "\n-------\n"+str.toUpperCase()+"\n ";
    }

    $scope.saveEvent = function() {
        $.fn.form = function() {
            var formData = {};
            this.find('[name]').each(function() {
                formData[this.name] = this.value;  
            })
            return formData;
        };
        var eventToSave = {};
        eventToSave.patientId = $rootScope.patient_id;
        eventToSave.data = JSON.stringify($("#event-form").form());
        eventToSave.requestId = $scope.request_id;
        eventToSave.eventTypeId = $scope.eventType._id;
        eventToSave.physicianId = $rootScope.userDetails.physician._id;
        console.log(eventToSave);
        $kinvey.DataStore.save('Events',eventToSave).
        then(function(o) {
            console.log('Event saved');
            console.log(o);
            $('#modal-saved').modal('show');
            $scope.modal_error = "";
        });
    }
    $scope.getBackToEvent = function() {
        $('#modal-saved').modal('hide');
        $location.path("/current-appointment/"+$scope.event.patientId+"/"+$scope.event.requestId);
    }
    $scope.getAllEventsData = function()
    {
        console.log("Current event type selected is "+$scope.currenttype);
        $scope.getEventTypes();
        $scope.getEventType($scope.currenttype);
        $scope.getEvent($scope.event_id);
    }

    $scope.getAllEventsData();

});

