(function() {
     'use strict';

     angular
          .module('pages')
          .directive('cardVariableFile', cardVariableFile);

     cardVariableFile.$inject = ['cardsHelper', 'appConfig', 'cardData', 'logger', '$rootScope', '$sce'];

     function cardVariableFile (cardsHelper, appConfig, cardData, logger, $rootScope, $sce) {
          return {
               restrict: 'A',
               templateUrl:'modules/pages/directives/card-variable-file.html',
               scope:true,
               link: function (scope, element, attrs, ctrls) {
                    scope.kind = attrs.cardVariableFile;
                    scope.displayKind = (scope.kind == 'video' ? 'Video' : 'Image');

                    scope.card = cardData.getActiveCard;
                    scope.AWS = appConfig.credentialsAWS;
                    scope.variableName = attrs.name;
                    scope.shortCode = attrs.shortcode;

                    scope.$watch(function () {
                         return cardData.getActiveCard()
                    }, function (newValue) {
                         console.log(newValue);
                         if(newValue){
                              angular.forEach(newValue.actions, function (item, index) {
                                   var key = Object.keys(item)[0];
                                   if(scope.shortCode === key){
                                        scope.currentImage = item[key];
                                        //scope.variableValue = scope.currentImage || attrs.value || appConfig.defaultImg;
                                        scope.variableValue = scope.currentImage || attrs.value || '';
                                        scope.renderme = scope.variableValue ? 'renderme' : '';

                                        scope.variableValue = $sce.trustAsResourceUrl(scope.variableValue);
                                   }
                              });
                         }
                    });

                    scope.renderme = attrs.render;
                    scope.client = attrs.client;

                    function setValue(shortCode, value, deleteLink){
                         for (var i = 0; i < scope.card().actions.length; i += 1) {
                              if(typeof scope.card().actions[i][shortCode] != 'undefined'){
                                   scope.card().actions[i][shortCode] = encodeURI(value);
                                   scope.variableValue = encodeURI(value);
                                   scope.variableValue = $sce.trustAsResourceUrl(scope.variableValue);
                                   if(!deleteLink) {scope.$apply();}
                              }
                         }
                         $rootScope.$emit('updateCardHtml');
                    }


                    scope.upload = function (files) {
                         console.log('upload');
                         var client = scope.client;
                         var uniqName = cardsHelper.generateUniqueName(files[0].name, client);
                         AWS.config.update({ accessKeyId: scope.AWS.access_key, secretAccessKey: scope.AWS.secret_key });
                         AWS.config.region = scope.AWS.region;
                         var bucket = new AWS.S3({ params: { Bucket: scope.AWS.bucket } });
                         var params = { Key: uniqName, ContentType: files[0].type, Body: files[0], ServerSideEncryption: 'AES256', ACL:'public-read' };
                         bucket.putObject(params, function(err,data) {
                              if(err) {
                                   logger.error('Error uploading image');
                              } else {
                                   scope.s3link = "https://s3.amazonaws.com/" + scope.AWS.bucket + "/" + uniqName;
                                   setValue(scope.shortCode, scope.s3link);
                                   logger.success(scope.displayKind + ' uploaded successfully');
                              }
                         }).on('httpUploadProgress',function(progress) {
                              scope.uploadProgress = Math.round(progress.loaded / progress.total * 100);
                              scope.$digest();
                         });
                    };

                    scope.deleteSelectedImage = function (event, short) {
                         //var reset = '{{' + short + '}}';
                         var reset = '';
                         setValue(short, reset, 'delete');
                         scope.uploadProgress = undefined;
                         $(event.target).closest('.fileUploadForm')[0].reset();
                        scope.$emit('updateCardHtml');
                    };
               }
          };
     }
}());
