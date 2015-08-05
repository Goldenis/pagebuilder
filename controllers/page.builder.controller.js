(function () {
     "use strict";

     angular
          .module('pages')
          .controller('PageBuilderController', PageBuilderController);

     PageBuilderController.$inject = ['cardData', 'editorService', 'pagesHelper', '$q', 'Pages', '$scope', '$rootScope', 'Authentication', 'logger', 'cardsHelper', 'clientHelper', '$timeout', '$stateParams', '$state', '$compile', '$location', '$mdUtil', '$mdSidenav', '$log', '$cookieStore'];

     function PageBuilderController(cardData, editorService, pagesHelper, $q, Pages, $scope, $rootScope, Authentication, logger, cardsHelper, clientHelper, $timeout, $stateParams, $state, $compile, $location, $mdUtil, $mdSidenav, $log, $cookieStore) {
          $scope.me = Authentication.user;
          $scope.pageId = $stateParams.pageId;
          $scope.leaveUrl = '';
          $scope.vleavePage = false;
          $scope.isPageDirty = false;
          

          $scope.$watch(function() { return cardData.getActiveCard(); }, function() {$scope.selectedCard = cardData.getActiveCard(); });

         $scope.replaceLayoutHeader = function () {
             $rootScope.hideNavbar = true;
         };

          var promises = [cardData.getClients(), cardData.getAllCards()];
          if($scope.pageId) promises.push(cardData.getPage($scope.pageId));
          $q.all(promises).then(function (results) {
               $scope.clients = results[0];
               $scope.allCards = results[1];
               if($scope.pageId){$scope.page = results[2];}
               console.log(results[2]);
               initializeController();
          });

          $scope.$on('$stateChangeStart', function(event, newUrl, oldUrl) {
               $rootScope.hideNavbar = false;
               if ($scope.vleavePage == false && $scope.isPageDirty) {
                    $('#leavePageModal').modal2('show');
                    event.preventDefault();
                    $scope.leaveUrl = newUrl;
               }
          });

          function initializeController() {
               $scope.newPage = {};
               $scope.canSaveOrEdit = $scope.me.role === 'admin' || $scope.me.role === 'client';
               $scope.canChangeClient = $scope.me.role === 'admin';
               console.log("pageId:" + $scope.pageId);
               if($scope.pageId && $scope.page.cards && ($scope.page.cards.length != undefined)) {
                    //$scope.newPage = $scope.page;
                    $timeout(function() {
                         for ( var i = 0; i< $scope.page.cards.length; i++ ) {
                              cardData.addCardToPage($scope.page.cards[i]);
                         }
                         $scope.newPage.cards = $scope.page.cards;
                         $scope.updatedName = $scope.page.name;
                    }, 4000);
               } else {
                    $scope.newPage.cards = [];
               }
               

               $scope.client = clientHelper.getClientByName($scope.clients, $scope.me.client);

               $scope.leavePage = function (argument) {
                    $('#leavePageModal').modal2('hide');
                    $timeout(function() {
                         $scope.vleavePage = true;
                         $scope.isPageDirty = false;
                         $location.path($scope.leaveUrl.url);                         
                    },300);
               }

               $scope.resetSidebar = function() {
                    console.log("resetSidebar");
                    $scope.$broadcast('resetOpts');
               }

              var deferLoaded = $q.defer();
              $scope.loaded = deferLoaded.promise;
              $scope.loadingCompleted = function (card) {
                  if (card) { card.loaded = true; }
                  if (_.every(_.pluck($scope.newPage.cards, 'loaded'))) {
                      $scope.loadingDone = true;
                      deferLoaded.resolve();
                  }
              };

               $scope.getCards = function (specificClient) {
                    //specificClient = specificClient || $scope.client || $scope.clients[0];
                    $scope.client = specificClient || $scope.client || $scope.clients[0];
                    $scope.client.client = $scope.client.companyName;
                    $scope.cards = cardsHelper.clientLiveCards($scope.allCards, $scope.client || $scope.me, $scope.me.role);
                    $scope.cards.length ? logger.info(($scope.cards[0].client || $scope.me.client) + ' cards fetched') : logger.info('There is no available cards');
                    try { 
                      pagesHelper.setHeaderFooter($scope.client || $scope.client, 'admin');
                    }
                    catch(error) {
                      console.log(error);
                    }
                    $scope.sourceScreens = sortCards(pagesHelper.adoptPagesDataStructure(JSON.parse(JSON.stringify($scope.cards.slice()))));

                   $scope.loaded.then(function () {
                       editorService.renderEditor($scope.selectedClient || $scope.client, $scope);
                   });
               };

               init();

               $rootScope.saveChanges = function() {
                   if ($scope.pageId) { $scope.updatePage(); }
                   else { $scope.savePage(); }
               };

              $rootScope.discardChanges = function (force) {
                  if (!force) {
                      $('#discardPageModal').modal2('show');
                  }
                  else {
                      pagesHelper.resetPageBuilder($scope);
                      $scope.isPageDirty = false;
                      $('#discardPageModal').modal2('hide');
                  }
              };

              $scope.validatePage = function (page) {
                  //var pageName = page && page.name;
                  var pageName = $scope.pageId ? $scope.updatedName : $scope.newPage.name;
                  if (!pageName || pageName.trim() == '') return 'Error: Enter page name';
                  return null;
              };

               $scope.savePage = function () {
                   var errorMessage = $scope.validatePage($scope.newPage);
                   if (errorMessage) {
                       return logger.error(errorMessage);
                   }

                   $scope.isPageDirty = false;
                   $scope.vleavePage = true;
                    $('#sortable2').empty();
                    $scope.newPage.cards.forEach(function (card) {
                         cardData.resetScopeVariables(card);
                    });
                    $rootScope.$emit('updateCardHtml');
                    $timeout(function () {
                         $scope.savingPage = true;
                         $scope.newPage.client = $scope.selectedClient || $scope.client;
                         $scope.newPage.user = $scope.me;
                         $scope.newPage.created = new Date();
                         var page = new Pages ($scope.newPage);
                         for (var i = 0; i < page.cards.length; i += 1) {
                              page.cards[i].actions = $scope.newPage.cards[i].tempActions;
                         }

                         page.$save(function (page) {
                              $scope.savingPage = false;
                              logger.success('Added page.');
                              $state.go('listPages');
                         }, function () {
                              logger.error('Error while adding page');
                         });
                    });
               };

               $scope.updatePage = function () {
                   var errorMessage = $scope.validatePage($scope.page);
                   if (errorMessage) {
                       return logger.error(errorMessage);
                   }

                   $scope.isPageDirty = false;
                   pagesHelper.updatePageBuilder($scope);
               };

              
               $scope.exportPage = function() {
                    pagesHelper.exportPageBuilder($scope);
               };

               $scope.sortableOptions = {
                    connectWith: ".connected-apps-container",
                    'ui-floating': false,
                    start: function (e, ui) {
                        $(ui.item).addClass('dragging');
                    },
                    stop: function (e, ui) {
                        $(ui.item).removeClass('dragging');
                        $(ui.placeholder).remove();

                         if ($(e.target).hasClass('first') &&
                              ui.item.sortable.droptarget &&
                              e.target != ui.item.sortable.droptarget[0]) {
                              //$scope.sourceScreens = pagesHelper.adoptPagesDataStructure(JSON.parse(JSON.stringify($scope.cards.slice())));
                              $scope.sourceScreens = sortCards(pagesHelper.adoptPagesDataStructure(JSON.parse(JSON.stringify($scope.cards.slice()))));
                              $scope.isPageDirty = true;
                         }
                    }
               };
               $scope.sortableOptions1 = {
                   connectWith: ".connected-apps-container",
                   scroll: true,
                   'ui-floating': false,
                   handle: '.myAngularHandle',
                   update: function (event, ui) {
                       $scope.isPageDirty = true;
                   }
               };

              $scope.togglePage = buildToggler('pageSettings');
              $scope.toggleCards = buildToggler('cardLibrary');
              $scope.toggleCardSettings = $mdUtil.debounce(function (show) {
                  $scope.csopen = show;
              }, 350);

              $scope.openCardSettingsSidebar = function () {
                  $scope.togglePage(false);
                  $scope.toggleCards(false);
                  $scope.toggleCardSettings(true);
              };

              //
              // PRIVATE FUNCTIONS
              //

              function init() {
                  /*********     getting current client. Priority 1. page client 2.current user client   ***********/
                  $scope.pageId ? $scope.getCards($scope.page.client):$scope.getCards();
                  $scope.pageId ? $scope.selectedClient = $scope.clients[$scope.clients.indexOf(clientHelper.getClientByName($scope.clients, $scope.page.client.companyName))]
                      :$scope.selectedClient = $scope.clients[$scope.clients.indexOf($scope.client)];

                  if (!$scope.page || !($scope.page.cards || []).length) {
                      $scope.loadingCompleted();
                  }

                  if (!$cookieStore.get('page-builder-introduced')) {
                      $scope.introduction = true;
                      $timeout(function () {
                          $scope.introduction = false;
                      }, 120 * 1000);
                      $cookieStore.put('page-builder-introduced', true);
                  }

                  $scope.loaded.then(function () {
                      $(document).on('change input', function() {
                          $scope.isPageDirty = true;
                      });

                      $rootScope.$on('updateCardHtml', function () {
                          $scope.isPageDirty = true;
                          $timeout(function () {
                            enablePlugins($('.page.content'));
                          });
                      });
                  });
              }

              function enablePlugins(element) {
                  // background video plugin
                  if ($.fn.vide) {
                      $(element).find('[data-vide-bg]').each(function(i, element) {
                          var $element = $(element);
                          var options = $element.attr('data-vide-options');
                          var path = compactPairs($element.attr('data-vide-bg').split(','));
                          $element.vide(path, options);
                      });
                  }
              }

              function compactPairs(strPairs) {
                  var pairs = strPairs.map(function(keyValueStr) {
                      var arr = keyValueStr.split(':').map(function (str) { return str.trim(); });
                      return [arr[0], arr.slice(1).join(':')];
                  });

                  var result = _.filter(pairs, function(pair) { return pair[1] != ''; })
                      .map(function (pair) { return pair.join(': '); })
                      .join(', ');

                  return result;
              }

              function buildToggler(navID) {
                  var debounceFn = $mdUtil.debounce(function (show) {
                      var sidenav = $mdSidenav(navID);
                      if (sidenav.isOpen() === show) return;
                      $scope.$apply(function () {
                          $scope.csopen = false;
                          sidenav.toggle().then(function () {
                              $log.debug('toggle ' + navID + ' is done');
                          });
                      });
                  }, 300);
                  return debounceFn;
              }

              function sortCards(cards) {
                  return cards.sort(function (card1, card2) {
                      var int1 = parseInt(card1.name, 10) || 0;
                      var int2 = parseInt(card2.name, 10) || 0;
                      if (int1 != int2) return int1 - int2;
                      return card1.name - card2.name;
                  });
              }
     }
}
}());
