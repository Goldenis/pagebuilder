(function () {
     "use strict";

     angular
          .module('pages')
          .factory('Pages', Pages);

     Pages.$inject = ['$resource'];

     function Pages($resource) {
          return $resource('pages/:pageId', {
               pageId: '@pageId'
          }, {
               update: {
                    method: 'PUT'
               }
          });
     }

}());

