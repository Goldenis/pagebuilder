(function() {
     'use strict';

     angular
          .module('pages')
          .directive('sidebar', sidebar);

     sidebar.$inject = ['cardData', '$rootScope'];

     function sidebar (cardData, $rootScope) {
          return {
               restrict: 'A',
               templateUrl: 'modules/pages/directives/side-bar.html',
               scope:{},
               link: function (scope, element, attrs, ctrs) {
                    scope.card = cardData.getActiveCard;
                    scope.setValue = function(shortCode, value){
                         for (var i = 0; i < scope.card().actions.length; i += 1) {
                              if(scope.card().actions[i][shortCode]){
                                   scope.card().actions[i][shortCode] = value;
                              }
                         }
                         console.log(shortCode + ":" + value);
                         $rootScope.$emit('updateCardHtml');
                    };

                    scope.$on('resetOpts', function() {
                         scope.dropOpts=[]; scope.inputOpts=[]; scope.areaOpts=[]; scope.checkOpts=[]; scope.fileOpts = []; scope.videoOpts = [];
                    });

                    scope.$watch(function () {
                         return cardData.getActiveCard()
                    }, function (newValue) {
                         if(newValue){
                              scope.cardFile = newValue;
                              listVariables(scope, newValue);
                         }
                    });
               }
          }
     }

     function removeKeys(scope) {
          for (var key in scope) {
               if (key.substr(0,1)!='$' && key!='this')
                    delete scope[key];
          }
     }


     function listVariables(scope, card) {
          scope.dropOpts=[]; scope.inputOpts=[]; scope.areaOpts=[]; scope.checkOpts=[]; scope.fileOpts = []; scope.videoOpts = [];
          //if (typeof scope.card().variables == 'undefined')
          //     scope.card().variables = [];
          for (var i = 0; i < card.variables.length; i += 1) {
               var val = jQuery.extend(true, {}, card.variables[i]);
               var action = jQuery.extend(true, {}, card.actions[i]);
               
               var kind = val.kind.replace(/\s+/g, '').toLocaleLowerCase();
               switch (kind) {
                    case 'dropdown':
                         var p_val = val;
                         for ( var j = 0; j< val.value.length; j++) {
                              if (!val.value[j].value) {
                                   var value_array = val.value[j].split("/");
                                   if (value_array.length > 1) {
                                        p_val.value[j] = {
                                             name: value_array[0],
                                             value: value_array[1]
                                        }
                                   } else {
                                       p_val.value[j] = {
                                             name: value_array[0],
                                             value: value_array[0]
                                        } 
                                   }
                              }
                              
                         }
                         scope.dropOpts.push(p_val);
                         break;
                    case 'textinput':
                         scope.inputOpts.push(val);
                         break;
                    case 'textarea':
                         scope.areaOpts.push(val);
                         break;
                    case 'checkbox':
                         val['valueTrue'] = val.value || false; 
                         val.value = action[val.shortCode] || false;
                         val['checked'] = (val.value == val.valueTrue) ? true : false;
                         scope.checkOpts.push(val);
                         break;
                    case 'file':
                         scope.fileOpts.push(val);
                         break;
                    case 'video':
                         scope.videoOpts.push(val);
                         break;
               }
          }
     }


}());
