(function() {
     'use strict';

     angular
          .module('pages')
          .directive('newCard', newCard);

     newCard.$inject = ['cardsHelper', 'cardData', 'pagesHelper', 'editorService', '$compile', 'clientHelper', '$timeout', 'logger'];

     function newCard (cardsHelper, cardData, pagesHelper, editorService, $compile, clientHelper, $timeout, logger) {
          return {
               restrict: 'A',
               templateUrl:'modules/pages/directives/new-card.html',
               scope: {
                    card:'=',
                    rendered: '&'
               },
               transclude:true,
               //replace:true,
               link: function (scope, element, attrs) {
                    scope.uniqueID = function() {
                         var text     = "";
                         var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                         for( var i=0; i < 8; i++ ) {
                            text += possible.charAt(Math.floor(Math.random() * possible.length));
                         }
                         return text;
                    }

                    var classId = scope.uniqueID();

                    scope.index = attrs.index;
                    scope.html = scope.card.html;

                    scope.css = scope.card.css;
                    scope.js = scope.card.js;
                    scope.variables = scope.card.variables; //user card variables
                    scope.actions = scope.card.actions; //user set actions
                    scope.less = '';

                    var less_content = ".card-" + classId + "{ " + scope.css + " }";
                    less.render(less_content).then(function(output) {
                         var content = '';                        
                         if (scope.card.original_html === '') {
                              var ori_content = '';
                              ori_content += '<div medium-editor-model ng-model="card.html">' + scope.card.html + '</div>';                         
                              ori_content += '<style parse-style dynamic-css-binding="">' + scope.css + '</style><div style="clear:both"></div>';
                              var ori_compiledContent = $compile(ori_content)(scope);
                              scope.card.original_html = $(ori_compiledContent[0]).html();
                         }
                         if (scope.js !== '') {
                              if (typeof jQuery(scope.card.html).find('#masterslider') != 'undefined') {
                                   var dom_element = jQuery(scope.card.html);
                                   var ms_container = jQuery(dom_element).find(".ms-slide");
                                   jQuery(dom_element).find("#masterslider").empty();
                                   jQuery(dom_element).find("#masterslider").append(ms_container);
                                   scope.card.html = jQuery(dom_element).get(0).outerHTML;  
                              }
                         }

                         scope.js = scope.js.replace(/\$\(\'/g, "$('.card-" + classId + " ");
                         content += '<div class="card-' + classId + '"><div medium-editor-model ng-model="card.html">' + scope.card.html + '</div></div>';
                         content += '<script>setTimeout(function() { ' + scope.js + ' }, 1)</script>';
                         content += '<style parse-style dynamic-css-binding="">' + output.css + '</style><div style="clear:both"></div>';
                         var compiledContent = $compile(content)(scope);
                        element.append(compiledContent);

                        $timeout(function() {
                            scope.$root.$emit('updateCardHtml');
                        });

                        $timeout(scope.rendered, 100);

                         scope.bindVariablesToScope = function() {
                              scope.actions.forEach(function (action) {
                                   try { 
                                        var key = Object.keys(action)[0];
                                        scope[key] = action[key];
                                   } catch(err) {}
                              });
                         };

                         scope.removeCard = function(){  
                              element.find('#deleteCardModal').modal2('hide');
                              $timeout(function() {
                                   //angular.element(document.querySelector('.buildPage')).removeClass('hidden');
                                   //angular.element(document.querySelector('.editCard')).addClass('hidden');
                                   scope.$parent.toggleCardSettings(false);
                                   cardData.removeCard(scope.$parent.newPage.cards, scope.card);
                                   scope.$parent.isPageDirty = true;
                              },300);
                              
                         };
                    
                         scope.setActiveCard = function () {
                              cardData.setActiveCard(scope.card);
                              //angular.element(document.querySelector('.buildPage')).addClass('hidden');
                              //angular.element(document.querySelector('.editCard')).removeClass('hidden');
                              scope.$parent.openCardSettingsSidebar();
                         };

                         scope.$watch(function() {
                              return scope.actions
                         }, function () {
                              if(scope.actions){
                                   scope.bindVariablesToScope();
                              }
                         }, true);
                         
                         scope.openDeleteModal = function () {
                              element.find('#deleteCardModal').modal2('show');
                         };

                         if(scope.$parent.client)editorService.renderEditor(scope.$parent.client, scope);
                         
                    }).catch(function(err){
                         logger.error('Error with LESS');
                         logger.error(err.message);
                    });
               }

          };
     }
}());
