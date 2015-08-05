(function () {
     "use strict";

     angular
          .module('pages')
          .controller('PagesController', PagesController);

          PagesController.$Inject = ['$scope', '$state', '$stateParams', '$location', 'Authentication', 'Pages', 'logger', 'appConfig', 'pagesHelper', 'cardData', '$q'];

          function PagesController($scope, $state, $stateParams, $location, Authentication, Pages, logger, appConfig, pagesHelper, cardData, $q) {
               var vm = this;
               vm.me = Authentication.user;
               vm.pageStatuses = appConfig.pageStatuses;
               Pages.query().$promise.then(function (pages) {
                    if(vm.me.role === 'admin')vm.pages = pages;
                    if(vm.me.role === 'client')vm.pages = pagesHelper.filterOnlyClientPages(pages, vm.me.client);
               });

               $scope.authentication = Authentication;

               vm.openDeleteModal = function (page) {
                    vm.selectedPage = page;
                    $('#deletePageModal').modal2('show');
               };

               vm.duplicatePage = function(oriPage) {
                    var page = new Pages (oriPage);
                    delete page._id;
                    page.name = "COPY - " + page.name;
                    page.status = "Draft";
                    page.$save(function (page) {
                         logger.success('Duplicated page.');
                         $state.reload();
                    }, function () {
                         logger.error('Error while adding page');
                    });
               }

               vm.deletePage = function () {
                    var index = vm.pages.indexOf(vm.selectedPage);
                    vm.selectedPage.$remove({pageId:vm.selectedPage._id});
                    vm.pages.splice(index, 1);
                    $('#deletePageModal').modal2('hide');
                    logger.success('Page deleted');
               };

               vm.updateStatus = function (page) {
                    Pages.update({pageId:page._id}, page)
                         .$promise
                         .then(function (updatedPage) {
                              logger.info('Status set to: ' + updatedPage.status);
                              if (updatedPage.status == "Live" || updatedPage.status == "Preview") {
                                   cardData.getPage(page._id).$promise.then(function(res) {
                                        $scope.newPage = res;
                                        pagesHelper.exportListPage($scope, updatedPage.status);
                                   });
                                   
                              }
                         })
                         .catch(function () {
                              logger.info('Error updating page status');
                         })
               };

               // Create new Page
               $scope.create = function() {
                    // Create new Page object
                    var page = new Pages ({
                         name: this.name,
                         content: this.content
                    });

                    // Redirect after save
                    page.$save(function(response) {
                         $location.path('pages/' + response._id);

                         // Clear form fields
                         $scope.name = '';
                    }, function(errorResponse) {
                         $scope.error = errorResponse.data.message;
                    });
               };

               // Remove existing Page
               $scope.remove = function(page) {
                    if ( page ) {
                         page.$remove();

                         for (var i in $scope.pages) {
                              if ($scope.pages [i] === page) {
                                   $scope.pages.splice(i, 1);
                              }
                         }
                    } else {
                         $scope.page.$remove(function() {
                              $location.path('pages');
                         });
                    }
               };

               // Update existing Page
               $scope.update = function() {
                    var page = $scope.page;

                    page.$update(function() {
                         $location.path('pages/' + page._id);
                    }, function(errorResponse) {
                         $scope.error = errorResponse.data.message;
                    });
               };

               // Find existing Page
               $scope.findOne = function() {
                    $scope.page = Pages.get({
                         pageId: $stateParams.pageId
                    });
               };
          }



}());

