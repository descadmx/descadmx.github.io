app.controller('physicians', function($kinvey,$scope,$rootScope,peopleFactory,$timeout){

    $scope.physicians = [{'first_name':'Click on title to load list'}];

    $scope.getPhysicians = function() {
        peopleFactory.getPhysicians()
            .then(function(p){
            $scope.physicians = p;
            $rootScope.physicians = p;
            $timeout(function(){
                $(".datatables").DataTable({pageLength:5});
            },1000);
        });
    };

})

app.controller('requests', function($kinvey,$scope,$rootScope,requestsFactory,peopleFactory,$timeout,$interval,$filter){

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

    $rootScope.map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 32.1558328, lng: -111.02389},
        zoom: 10
    });

    $scope.getAppointments = function() {
        window.Polymer = {dom: 'shadow'};
        console.log("Time is now",Date.now());
        var q = new $kinvey.Query();
        q.greaterThanOrEqualTo('dateRequested',new Date()/1000);
        $kinvey.DataStore.find('Appointments',q). 
        //$kinvey.DataStore.get('Appointments'). 
        then(function(p){
            $scope.requests = p;
            $scope.requests.forEach(function(o){
                $kinvey.DataStore.get("Patients",o.patientId). 
                then(function(x){ o.patient=x });
                $kinvey.DataStore.get("Physicians",o.physicianId). 
                then(function(x){ o.physician=x });
                $rootScope.geocodeAddress(o.locationRequested). 
                then(function(u){
                    o.location = u;
                    var marker = new google.maps.Marker({
                        position: o.location,
                        map: $rootScope.map,
                        title: o.locationRequested
                    });
                    marker.addListener('click',function(){
                        new google.maps.InfoWindow({
                            content: o.locationRequested+" @ "+$filter('date')(o.dateRequested,'medium')
                        }).open($rootScope.map,marker);
                    })
                    console.log($rootScope.map);
                });
            });
            $scope.requests = p;
            if(typeof $scope.requestsTable !=='undefined')
            {
                //console.log("Destroying previous datatable...");
                $scope.requestsTable.destroy();
            }
            $timeout(function(){
                if($scope.requests.length)
                    $scope.requestsTable = $("#requestsTable").DataTable({pageLength:5});
            },1000);
        })
    }

    $scope.getPhysicians = function() {
        $kinvey.DataStore.get('Physicians'). 
        then(function(o){
            $scope.physicians = o;
            console.log("Physicians retrieved");
        })
    }

    $scope.getPatients = function() {
        $kinvey.DataStore.get('Patients'). 
        then(function(o){
            $scope.patients = o;
            console.log("Patients retrieved");
        });
    }

    $scope.handleRequest = function(id) {
        if(!id)
            $scope.currentRequest = Object();
        else {
            $scope.requests.forEach(function(o) {
                if(o._id==id) 
                    $scope.setCurrentRequest(id);
            });
        }
        $scope.getPhysicians();
        $("#modal-request").modal('show');
    }

    $scope.getPatientLocation = function() {
        console.log("Getting location from patient selected");
        $scope.requests.forEach(function(r){
            if(typeof r.patient !=='undefined' && $scope.currentRequest.patientId==r.patient._id)
                $scope.locationRequested = r.patient.address+", "+r.patient.city+", "+r.patient.state+", "+r.patient.zipCode;
        })
    }

    $scope.saveRequest = function() {
        $scope.saveButton = "Saving...";
        console.log("Saving request/appointment...");
        newRequest = $scope.currentRequest;
        newRequest.dateRequested = Date.parse($scope.dateRequested);
        newRequest.dateRequested/=1000;
        newRequest.dateStart = Date.parse($scope.dateStart);
        newRequest.dateStart/=1000;
        newRequest.locationRequested = $scope.locationRequested;
        newRequest.patient = null;
        newRequest.physician = null;
        console.log("Attempting to save ",newRequest);
        $kinvey.DataStore.save('Appointments',newRequest). 
        then(function(o){
            $scope.saveButton = "Saved";
            $scope.updateAll();
            $timeout(function(){
                $("#modal-request").modal('hide');
            },500);
        }, function(e){
            console.log(e);
            alert('Couldn\'t save the appointment');
        })
    }

    $scope.setCurrentRequest = function(index) {
        $scope.requests.forEach(function(o,i){
            if(o._id==index){
                $scope.currentRequest = o;
                console.log("Current request is now",$scope.currentRequest);
                $scope.dateRequested =new Date($scope.currentRequest.dateRequested);
                $scope.dateStart =new Date($scope.currentRequest.dateStart);
            }
        });
    }

    $scope.updateAll = function() {
        $scope.saveButton = "Save";
        $scope.getAppointments();
        $scope.getPhysicians();
        $scope.getPatients();
        console.log("Updating all");
    }

    $interval(function(){
        $scope.getAppointments();
        console.log("Periodic update");
    },30000);

    $timeout($scope.updateAll,2000);

});

app.controller('transactions',function($scope,$kinvey){
    $scope.getTransactions = function() {
        if(typeof $scope.transactionsTable !=='undefined')
            $scope.transactionsTable.destroy();
        console.log("Getting transactions...");
        var q = new $kinvey.Query();
        q.descending('created');
        $kinvey.DataStore.find('StripeTransactions',q). 
        then(function(o){
            $scope.transactions = o;
            $scope.transactionsTable = $("#transactionsTable").DataTable({pageLength:5});
        })
    }
    $scope.viewTransaction = function(id) {
        console.log("Reviewing transaction",id)
        $scope.transactions.forEach(function(t){
            if(t._id==id) {
                $scope.currentTransaction = t;
            }
        });
        console.log($scope.currentTransaction);
    }
    $scope.getTransactions();
});
