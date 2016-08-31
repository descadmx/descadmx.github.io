app.controller('lists', function($kinvey,$scope,$rootScope,$timeout){

    $scope.message = "Hello world";

    $kinvey.ping().
    then(function(){
        $kinvey.User.get().
        then(function(o){
            $scope.users = o;
        });
        $kinvey.DataStore.get('Patients').
        then(function(o){
            $scope.patients = o;
        });
        $kinvey.DataStore.get('Physicians').
        then(function(o){
            $scope.physicians = o;
        });
    }).
    then(function(){
        if($(".datatables").length)
            $(".datatabless").DataTable();
        else
            console.log("No datatables found");
        console.log($scope);
    });
    /*
    $timeout(function(){
        $scope.patients.forEach(function(o,i){
            $scope.users.forEach(function(p,q){
                if(o.userId==p._id) {
                    console.log('Coincidence');
                    $scope.patients[i].user = p;
                }
            })
        });
        console.log($scope.patients);
    },2000);
*/

});
