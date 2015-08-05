(function () {
     'use strict';

     angular
          .module('pages')
          .factory('pagesHelper', pagesHelper);

     pagesHelper.$inject = ['$http', 'logger', '$parse', '$compile', '$state', 'cardData', '$rootScope', '$timeout', 'Pages', 'Authentication'];

     function pagesHelper($http, logger, $parse, $compile, $state, cardData, $rootScope, $timeout, Pages, Authentication) {
          var service = {
               setHeaderFooter: setHeaderFooter,
               getCardByName: getCardByName,
               getActions: getActions,
               adoptPageDataStructure:adoptPageDataStructure,
               filterOnlyClientPages: filterOnlyClientPages, //(@param1: ARRAY of pages,  @params2: client name STRING )
               adoptPagesDataStructure: adoptPagesDataStructure,
               updatePageBuilder: updatePageBuilder,
               exportPageBuilder: exportPageBuilder,
               exportListPage: exportListPage,
          };

          return service;

          function updatePageBuilder(scope) {
               if (scope.page.status == 'Live') {
                   scope.exportPage();
                   return;
               }
               scope.vleavePage = true;
               $('#sortable2').empty();
               scope.newPage.cards.forEach(function (card) {
                    cardData.resetScopeVariables(card);
               });
               $rootScope.$emit('updateCardHtml');
               $timeout(function () {
                    scope.savingPage = true;
                    scope.newPage.client = scope.selectedClient || scope.client;
                    scope.newPage.name = scope.updatedName;
                    if (!scope.newPage.updateHistory)scope.newPage.updateHistory = [];
                    scope.newPage.updateHistory.push({date: new Date(), user: scope.me.displayName});
                    var page = new Pages(scope.newPage);
                    for (var i = 0; i < page.cards.length; i += 1) {
                         page.cards[i].actions = scope.newPage.cards[i].tempActions;
                    }
                    page.$update({pageId: scope.page._id}/*, scope.newPage*/, function (page) {
                         logger.success("Page updated successfully");
                         $state.reload();
                    })/*.$promise.then(function (page) {
                         scope.savingPage = false;
                         scope.newPage.cards = page.cards;
                         logger.success('Pages updated successfully');
                    }).catch(function () {
                         logger.error('Error updating page');
                    })*/
               })
          }

          function bindVariablesToScope(scope, actions) {
               if (actions != undefined) {
                    actions.forEach(function (action) {
                         try {     // Added by Patrick
                              var key = Object.keys(action)[0];
                              scope[key] = action[key];
                         } catch(err) {}
                    });
               }
          };

          function exportListPage(scope) {
               var html_dom = document.createElement("ul");
               html_dom.setAttribute("id", "export_sortable2");
               html_dom.setAttribute("class", "connectedSortable page-builder-preview ui-sortable");

               scope.clonedPage = jQuery.extend(true, {}, scope.newPage);
               var compiledContent = [];
               var count = 0;
               for ( var i = 0; i < scope.clonedPage.cards.length; i++) {
                    var content = '<div new-card="" card="clonedPage.cards[' + i + ']" index="' + i + '"></div>';
                    compiledContent.push($compile(angular.element(content))(scope));
                    $timeout(function() {
                         var li_dom = document.createElement('li');
                         li_dom.setAttribute("style", "display: list-item");
                         var dom = jQuery(compiledContent[count]);                         
                         jQuery(dom).find('.controls_wrapper').remove();
                         jQuery(dom).find('custom-modal').remove();
                         $(li_dom).html(jQuery(dom).html());
                         html_dom.appendChild(li_dom);
                         count++;
                         if ( count == scope.clonedPage.cards.length) {
                              jQuery(html_dom).find('[contenteditable="true"]').each(function() {
                                   $(this).attr('contenteditable', 'false');
                              });

                              jQuery(html_dom).each(function(index) {
                                   $(this).attr('value', $(this).val());
                              });
                              jQuery(html_dom).each(function(index) {
                                   $(this).val($(this).val());
                              });
                              var exportCSS = '<style>#export_sortable2{padding:0px;float:left;width:100%;margin:0px;}li{list-style: outside none none;border: 0px none;}</style>';
                              var exportHead = '<!doctype html><head><meta charset="utf-8"></meta><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css"><script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script><script type="text/javascript" src = "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script>'+exportCSS+'</head><body><div id="body">';

                              var exportClientHeader = scope.clonedPage.client.header;
                              var exportClientFooter = scope.clonedPage.client.footer;

                              var exportString = html_dom.outerHTML;               

                              var exportFoot = '</div></body>';

                              exportString = exportHead + exportClientHeader + exportString + exportClientFooter + exportFoot;
                                                          
                              scope.newPage.sourceCode = exportString;

                              scope.vleavePage = true;
                              //$('#sortable2').empty();
                              scope.newPage.cards.forEach(function (card) {
                                   cardData.resetScopeVariables(card);
                              });
                              $rootScope.$emit('updateCardHtml');
                              $timeout(function () {
                                   scope.savingPage = true;
                                   /*scope.newPage.client = scope.selectedClient || scope.client;
                                   scope.newPage.name = scope.updatedName;*/
                                   scope.newPage.sourceCode = exportString;  
                                   if (!scope.newPage.updateHistory)scope.newPage.updateHistory = [];
                                   scope.newPage.updateHistory.push({date: new Date(), user: Authentication.user.displayName});
                                   var page = new Pages(scope.newPage);
                                   for (var i = 0; i < page.cards.length; i += 1) {
                                        page.cards[i].actions = scope.newPage.cards[i].tempActions;
                                   }
                                   page.$update({pageId: scope.newPage._id}, function (page) {
                                        logger.success("Page exported successfully");
                                        if (scope.newPage.client.production_refresh_url != undefined) {
                                             $http.post(scope.newPage.client.production_refresh_url).then(function(res) { console.log(res); logger.success('Production CMS refreshed');});
                                        } else {
                                            logger.success("Production CMS URL doeesn't exist."); 
                                        }
                                        $state.reload();
                                   })
                              })

                         }
                    }, 1000);
                    
               }
               console.log(compiledContent);
               
          }

          function exportPageBuilder(scope) {
               var html_dom = document.createElement("ul");
               html_dom.setAttribute("id", "export_sortable2");
               html_dom.setAttribute("class", "connectedSortable page-builder-preview ui-sortable");
               var count = 0;
               var compiledContent = [];
               scope.clonedPage = jQuery.extend(true, {}, scope.newPage);
               for ( var i = 0; i < scope.clonedPage.cards.length; i++) {
                    var content = '<div new-card="" card="clonedPage.cards[' + i + ']" index="' + i + '"></div>';
                    compiledContent.push($compile(angular.element(content))(scope));

                    $timeout(function(){
                         var li_dom = document.createElement('li');
                         li_dom.setAttribute("style", "display: list-item");

                         var dom = jQuery(compiledContent[count][0]);                         
                         jQuery(dom).find('.controls_wrapper').remove();
                         jQuery(dom).find('custom-modal').remove();
                         $(li_dom).html(jQuery(dom).html());                         
                         count++;
                         html_dom.appendChild(li_dom);
                         if ( count == scope.clonedPage.cards.length) {
                              jQuery(html_dom).find('[contenteditable="true"]').each(function() {
                                   $(this).attr('contenteditable', 'false');
                              });

                              jQuery(html_dom).each(function(index) {
                                   $(this).attr('value', $(this).val());
                              });
                              jQuery(html_dom).each(function(index) {
                                   $(this).val($(this).val());
                              });
                              var exportCSS = '<style>#export_sortable2{padding:0px;float:left;width:100%;margin:0px;}li{list-style: outside none none;border: 0px none;}</style>';
                              var exportHead = '<!doctype html><head><meta charset="utf-8"></meta><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css"><script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script><script type="text/javascript" src = "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script>'+exportCSS+'</head><body><div id="body">';

                              var exportClientHeader = document.getElementById('clientHeader').outerHTML;
                              var exportClientFooter = document.getElementById('clientFooter').outerHTML;

                              var exportString = html_dom.outerHTML;               

                              var exportFoot = '</div></body>';

                              exportString = exportHead + exportClientHeader + exportString + exportClientFooter + exportFoot;
                              //console.log(exportString);                                   
                              scope.newPage.sourceCode = exportString;

                              scope.vleavePage = true;
                              $('#sortable2').empty();
                              scope.newPage.cards.forEach(function (card) {
                                   cardData.resetScopeVariables(card);
                              });
                              $rootScope.$emit('updateCardHtml');
                              $timeout(function () {
                                   scope.savingPage = true;
                                   scope.newPage.client = scope.selectedClient || scope.client;
                                   scope.newPage.name = scope.updatedName;
                                   scope.newPage.sourceCode = exportString;  
                                   if (!scope.newPage.updateHistory)scope.newPage.updateHistory = [];
                                   scope.newPage.updateHistory.push({date: new Date(), user: scope.me.displayName});
                                   var page = new Pages(scope.newPage);
                                   for (var i = 0; i < page.cards.length; i += 1) {
                                        page.cards[i].actions = scope.newPage.cards[i].tempActions;
                                   }
                                   page.$update({pageId: scope.page._id}, function (page) {
                                        logger.success("Page exported successfully");
                                        if (scope.newPage.client.production_refresh_url != undefined) {
                                             $http.post(scope.newPage.client.production_refresh_url).then(function(res) { console.log(res); logger.success('Production CMS refreshed');});
                                        } else {
                                            logger.success("Production CMS URL doeesn't exist."); 
                                        }
                                        $state.reload();
                                   })
                              })
                         }
                    }, 1000);
                    
               }
          }

          function filterOnlyClientPages(allPages, clientName) {
               var filteredPages = _.filter(allPages, function (n) {
                    return n.client.companyName === clientName;
               });
               return filteredPages || [];
          }

          function getActions(variables) {
               var actions = [];
               if (variables == undefined)
                    return;
               for (var i = 0; i < variables.length; i += 1) {
                    var temp = {};
                    if(variables[i].kind !== 'File') {
                         if(variables[i].value)var valuesLength = variables[i].value.length;
                         valuesLength > 1 ? temp[variables[i].shortCode] = '{{' + variables[i].shortCode + '}}' : temp[variables[i].shortCode] = variables[i].value;
                    }
                    else {
                         //temp[variables[i].shortCode] = variables[i].value || 'https://placeholdit.imgix.net/~text?txtsize=30&txt=height%20%C3%97%20width%20&w=200&h=150';
                         temp[variables[i].shortCode] = variables[i].value || '';
                    }
                    actions.push(temp);
               }
               return actions;
          }

          /*
          adopting data for saving pages, removing unnecessary things from card object, adding actions
           */
          function adoptPageDataStructure(card) {
               delete card.__v; delete card.activeImage; delete card.cardStatus; delete card.claimedBy;
               delete card.timelog; delete card.less; delete card.notes; delete card.user; delete card.cardsOrder;
               if (card.images.length){ var image = card.images[0].url}
               card.displayImage = image || 'http://developer-agent.com/wp-content/uploads/2015/05/images_no_image_jpg3.jpg';
               card.actions = getActions(card.variables);
               return card;
          }

     function adoptPagesDataStructure(cards) {
          for (var i = 0; i < cards.length; i += 1) {
               cards[i] = adoptPageDataStructure(cards[i]);
          }
               return cards;
          }

          function getCardByName(cards, name) {
               for (var i in cards) {
                    if (cards[i] && cards[i].cardName === name) {
                         var result = [cards[i], i];
                         return result;
                    }
               }
               return false;
          }

          function setHeaderFooter(clients, admin) {
               var appended = false;
               if (clients) {
                    if (admin && appended) {
                         $('#clientFooter').empty();
                         $('#clientHeader').empty();
                         $('#clientFooter').append(clients.footer);
                         $('#clientHeader').append(clients.header);
                         logger.info('Setting ' + clients.companyName + ' header & footer');
                    }
                    if (!appended) {
                         $('#clientFooter').append(clients.footer);
                         $('#clientHeader').append(clients.header);
                         logger.info('Setting ' + clients.companyName + ' header & footer');
                         appended = true;
                    }
               } else {
                    $('#clientFooter').empty();
                    $('#clientHeader').empty();
                    logger.info('Removing header & footer');
               }
          }


     }
})();
