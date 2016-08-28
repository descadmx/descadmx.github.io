app.filter('ucfirst', function() {
	return function(input,arg) {
		return input.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
	};
});

app.controller('ehr', function($kinvey, $scope, $rootScope, peopleFactory, ehrFactory){

    $scope.ehr = [];
    $scope.patient_panel_size = 9;
    $scope.event_tile_size = 4;
    $scope.event_view_hidden = "hidden";

    $scope.getPatients = function() {
        peopleFactory.getPatients()
            .then(function(o){
            $scope.patients = o;
            $scope.currentevent = {};
            $scope.ehr.events = {};
            $scope.patient_panel_size = 9;
            $scope.event_view_hidden = "hidden";
        });
    }

    $scope.setCurrentPatient = function(id) {
        $scope.patients.forEach(function(p,i){
            if(p._id==id)
                $scope.patient = p;
        });
        $scope.patient_panel_size = 9;
        $scope.event_tile_size = 4;
        $scope.event_view_hidden = "hidden";
        $scope.ehr.events = {};
        $("#display-ehr-button").show();
        console.log("Current patient set to "+id);
    }

    $scope.getEHR = function(patient) {
        if(confirm("You are about to fetch EHR from this patient. \nBad use of this information is prosecuted by law. "))
        {
            ehrFactory.getEHR(patient)
                .then(function(o){
                $scope.ehr = o;
                console.log($scope.ehr);
                console.log('EHR from patient '+patient+' fecthed. ');
                $("#display-ehr-button").hide();
            });
        }
    }

    $scope.setCurrentEvent = function(event) {
        console.log('Setting current event (and view) to '+event);
        $scope.ehr.events.forEach(function(o){
            if(o._id==event)
            {
                $scope.currentevent = o;
                // Configure view
                $scope.patient_panel_size = 5;
                $scope.event_tile_size = 6;
                $scope.event_view_hidden = "";
            }
        });
    }

});