var app = angular.module("prismata-replays", []);

app.config(function($sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
    "self",
    "http://play.prismata.net/**"
  ]); 
});
  
