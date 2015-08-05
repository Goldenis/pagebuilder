(function () {
     "use strict";

     angular
          .module('pages')
          .controller('PageBuilderController', PageBuilderController);

     PageBuilderController.$inject = ['appConfig', 'pagesHelper', '$q', 'Pages', '$parse', '$scope','Authentication', 'Cards', 'logger', 'cardsHelper', 'clientHelper', 'Clients', '$compile', '$stateParams', '$state', '$timeout'];

     function PageBuilderController(appConfig, pagesHelper, $q, Pages, $parse, $scope, Authentication, Cards, logger, cardsHelper, clientHelper, Clients, $compile, $stateParams, $state, $timeout) {
     var promises = [];
     $scope.AWS = appConfig.credentialsAWS;
     $scope.me = Authentication.user;
     $scope.pageId = $stateParams.pageId;
     $scope.newPage = {};
     $scope.firstCard = false;
     if(!$scope.pageId && !$scope.me.client)logger.warning('You need client to be linked with your account !');

     if($scope.pageId) {$scope.page = Pages.get({pageId: $scope.pageId});}
     $scope.clients = Clients.query();
     $scope.allCards = Cards.query();

     promises = [$scope.clients.$promise,  $scope.allCards.$promise];
     if($scope.pageId) {promises = [$scope.page.$promise, $scope.clients.$promise,  $scope.allCards.$promise];}
     $q.all(promises).then(function () {
          initializeController();
     });

     function initializeController() {
          $scope.client = clientHelper.getClientByName($scope.clients, $scope.me.client);
          $scope.cards = cardsHelper.clientCards($scope.allCards, $scope.client);
          /*********     setting initial default values   ***********/
          $scope.newPage = {cards:[],client:{},user:{},created:new Date(),cardsOrder:[]};

          $scope.alo = function (value) {
               $scope.selectedHeader = value;
               $('.medium-editor-button-last').trigger('click');
          };

          $scope.getCards = function (specificClient) {
               specificClient = specificClient || $scope.client || $scope.clients[0];
               specificClient.client = specificClient.companyName;
                    var clientCards = cardsHelper.clientLiveCards($scope.allCards, specificClient || $scope.me);
                    for (var i in clientCards) {
                         clientCards[i]['options'] = clientCards[i].variables;
                         if(clientCards[i].images.length)clientCards[i]['image'] = clientCards[i].images[0].url;
                    }
                    $scope.cards = clientCards;
                    $scope.cards.length ? logger.info(($scope.cards[0].client || $scope.me.client) + ' cards fetched') : logger.info('There is no available cards');
                    pagesHelper.setHeaderFooter(specificClient || $scope.client, 'admin');
                    pagesHelper.renderEditor($scope.myEditor, specificClient);
                    buildList();
          };

          /*********     getting current client. Priority 1. page client 2.current user client   ***********/
          $scope.pageId ? $scope.getCards($scope.page.client):$scope.getCards();
          $scope.pageId ? $scope.selectedClient = $scope.clients[$scope.clients.indexOf(clientHelper.getClientByName($scope.clients, $scope.page.client.companyName))]
                         :$scope.selectedClient = $scope.clients[$scope.clients.indexOf($scope.client)];


          //$scope.reset= function () {
          //     $scope.bgc = '{{bgc}}';
          //}

          $scope.savePage = function () {
               $scope = pagesHelper.resetValues($scope);
               $timeout(function () {
               $scope.newPage.cardsOrder = pagesHelper.recalculateCardsOrder($scope.newPage.cards)[0];
               $scope.newPage.cards = pagesHelper.recalculateCardsOrder($scope.newPage.cards)[1];
               $scope.newPage.client = $scope.selectedClient || $scope.client;
               $scope.newPage.user = $scope.me;
               var page = new Pages ($scope.newPage);
               page.$save(function (page) {
                    logger.success('Added page.');
                    $state.go('listPages');
               }, function () {
                    logger.error('Error while adding page');
               })})
          };

          $scope.updatePage = function (updatedName) {
               $scope = pagesHelper.resetValues($scope);
               $timeout(function () {
               $scope.newPage.cardsOrder = pagesHelper.recalculateCardsOrder($scope.newPage.cards)[0];
               $scope.newPage.cards = pagesHelper.recalculateCardsOrder($scope.newPage.cards)[1];
               $scope.newPage.client = $scope.selectedClient || $scope.client;
               $scope.newPage.name = updatedName;
               if(!$scope.newPage.updateHistory)$scope.newPage.updateHistory = [];
               $scope.newPage.updateHistory.push({date:new Date(), user:$scope.me.displayName});
                    console.log('iz update', $scope.newPage);
               Pages.update({pageId:$scope.page._id}, $scope.newPage).$promise.then(function (page) {
                    logger.success('Pages updated successfully');
                    $state.reload();
               }).catch(function () {logger.error('Error updating page');})})
          };

          $(document).ready(function () {

               buildList();
               $('body').on('click', 'a.modal-launcher', function () {
                    var e = $(this).data('reveal-id');
               });

               $("#sortable1").sortable({
                    connectWith: ".connectedSortable",
                    helper: function (e, li) {
                         $scope.currentIndex = li.index();
                         var copyHelper = li.clone().insertAfter(li);
                         return li.clone();
                    },
                    stop: function (event, ui) {
                         buildList();
                    }
               }).disableSelection();
//injected by Patrick
               $("#sortable2, #export_sortable2").sortable({
                    connectWith: ".connectedSortable",
                    handle: ".handle",
                    receive: function (event, ui) {
                         $scope.editing = true;
                         console.log($(ui.item[0]).data("html"));
                         $scope.addSection(ui.item.index(), $(ui.item[0]).data("html"));
                         $scope.$apply();
                    }
               });

               $scope.addSection = function(e, y, html) {
                    if($scope.pageId && html){$scope.currentIndex=e;$scope.$apply()};
                    console.log('e', e);
                    console.log('y', y);
                    if(!$scope.pageId && !html){$scope.currentIndex=e;$scope.$apply();e++}
                    if($scope.pageId && $scope.editing && !html){$scope.currentIndex=e;$scope.$apply();e++}
                    console.log('$scope.currentIndex kad postavljan', $scope.currentIndex);
                         console.log('$scope.newPage', $scope.newPage);
                    for (var i in $scope.cards) {
                         if ($scope.cards[i].name == y) {
                              console.log('i', i);
                              if(!html){
                                   $scope.newPage.cards[i]={cardId:$scope.cards[i]._id, cardName:$scope.cards[i].name, actions:{}};
                                   for (var o in $scope.cards[i].variables) {
                                        //$scope.newPage.cards[$scope.currentIndex].actions[$scope.cards[i].variables[o].shortCode]='{{'+$scope.cards[i].variables[o].shortCode+'}}';
                                        $scope.newPage.cards[i].actions[$scope.cards[i].variables[o].shortCode]='';
                                   }
                              }
                              var controls = '<div class="controls"><i class="fa fa-bars handle"></i><i class="fa fa-cog" onclick="var t = this.id; angular.element(this).scope().loadSB(t,\'' + i + '\',\'' + $scope.cards[i].name + '\');"></i><i class="fa fa-times" onclick="var t = this.id; angular.element(this).scope().removeSection(t,\'' + $scope.cards[i]._id + '\');"></i></div>';

                              for (var l = 0; l < $scope.cards[i].variables.length; l += 1) {
                                   if($scope.cards[i].variables[l].kind==='Button'){
                                        var link = $scope.newPage.cards[i].actions[$scope.cards[i].variables[l].shortCode];
                                        var str = '{{' + $scope.cards[i].variables[l].shortCode + '}}'
                                        var regex = new RegExp(str,"g");   
                                       if(link)$scope.cards[i].css = $scope.cards[i].css.replace(regex, '"'+link+'"');
                                   }
                              }


                              //console.log('$scope.cards[i].css', $scope.cards[i].css);
                              //var temp = $scope.cards[i].css.replace('{{imag}}', $scope.newPage.cards[i].actions.imag);
                              //$scope.cards[i].css = temp;

                              html? $scope.compiledHtml=$compile(html)($scope) : $scope.compiledHtml = $compile($scope.cards[i].html)($scope);
                              console.log("patrick");
                              if(html){
                                   console.log("p1");
                                   $("#sortable2").find("[data-html='" + $scope.cards[i].name + "']").html($scope.compiledHtml);
                                   $("#sortable2").find("[data-html='" + $scope.cards[i].name + "']").append('<style parse-style>'+$scope.cards[i].css+'</style>');
                                   $("#sortable2").find("[data-html='" + $scope.cards[i].name + "']").prepend('<script>'+$scope.cards[i].js+'</script>');
                                   $("#sortable2").find("[data-html='" + $scope.cards[i].name + "']").prepend(controls);
                                   $("#sortable2").find("[data-html='" + $scope.cards[i].name + " .controls .fa']").uniqueId();

                                   // Patrick : only for export
                                   $("#export_sortable2").find("[data-html='" + $scope.cards[i].name + "']").html(html);
                                   $("#export_sortable2").find("[data-html='" + $scope.cards[i].name + "']").append('<style parse-style>'+$scope.cards[i].css+'</style>');
                                   $("#export_sortable2").find("[data-html='" + $scope.cards[i].name + "']").prepend('<script>'+$scope.cards[i].js+'</script>');
                                   $("#export_sortable2").find("[data-html='" + $scope.cards[i].name + "']").prepend(controls);
                                   $("#export_sortable2").find("[data-html='" + $scope.cards[i].name + " .controls .fa']").uniqueId();

                              } else {
                                   console.log("p2");
                                   $('#sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').html($scope.compiledHtml);
                                   $('#sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').append('<style parse-style>'+$scope.cards[i].css+'</style>');
                                   $('#sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').prepend('<script>'+$scope.cards[i].js+'</script>');
                                   $('#sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').prepend(controls);
                                   $('#sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ') .controls .fa').uniqueId();

                                   // Patrick : only for export
                                   $('#export_sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').html(html);
                                   $('#export_sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').append('<style parse-style>'+$scope.cards[i].css+'</style>');
                                   $('#export_sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').prepend('<script>'+$scope.cards[i].js+'</script>');
                                   $('#export_sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ')').prepend(controls);
                                   $('#export_sortable2 li.ui-state-default:nth-child(' + ($scope.currentIndex +1)+ ') .controls .fa').uniqueId();
                              }
                              $('.medium-editor-toolbar').remove();
                              $('.medium-editor-anchor-preview').remove();
                              $scope.myEditor = new MediumEditor('.editable', {
                                   buttons: ['bold', 'italic', 'unorderedlist', 'anchor', 'justifyLeft', 'justifyCenter', 'justifyRight', 'colors', 'clientFonts', 'headerDropDown'],
                                   onShowToolbar: function () {},
                                   extensions: {
                                        'colors': new MediumButton({
                                             label: '<span id="colorpicker"></span>',
                                             action: function (html, mark) {
                                                  var regex = /(<([^>]+)>)/ig,
                                                       result = html.replace(regex, "");
                                                  $('#sortable2, #export_sortable2').filter("span").end().filter(function()
                                                  {return $.trim($(this).html()).length < 1;}).remove();
                                                  return '<span style="color:' + $scope.colorChoice + '">' + result + '</span>';
                                             }
                                        }),
                                        'clientFonts': new MediumButton({
                                             label: '<span id="customFonts"></span>',
                                             action: function (html, mark) {
                                                  var regex = /(<([^>]+)>)/ig,
                                                       result = html.replace(regex, "");
                                                  return '<span style="font-family:\''+$scope.selectedFont+'\'">' + result + '</span>';
                                             }
                                        }),
                                        'headerDropDown': new MediumButton({
                                             label: '<span id="dropdown"></span>',
                                             action: function (html, mark) {
                                                  //var regex1 = /(<([h\d>]+)>)/ig;
                                                  //var regex = /(<span(?=[^>]*class="h\d")[^>]*>)/ig;
                                                  var regex = /(<span(?=[^>]*class="h\d")[^>]*>)|(<h\d>)/ig;
                                                  //var result1 = html.replace(regex1, "");
                                                  var result = html.replace(regex, '');

                                                  return '<span class="'+$scope.selectedHeader+'">' + result + '<span>';
                                             }
                                        })
                                   }
                              });
                              pagesHelper.renderEditor($scope.myEditor, $scope.selectedClient || $scope.client);
                              //editor.subscribe('editableInput', function (event, editable) {
                              //     fires when type,paste...
                              //})
                              break;
                         }
                    }
               }
          });

          $scope.loadSB = function (q, e, name) {
               $scope.currentCardName = name;
               $timeout(function () {$scope.currentIndex = e;
               console.log('postavljan na', $scope.currentIndex);
               console.log('q', q);
               console.log('e', e);
               $('.buildPage').addClass('hidden');
               $('.editCard').removeClass('hidden');
               $('#cardOptions').html('');
               var option = '';
               jQuery.each($scope.cards[e].options, function (i, val) {
                    $scope.shortCode = val.shortCode;
                    $scope.variableName = val.name;
                    $scope.variableID = val.name.replace(/\s+/g, '').toLocaleLowerCase().replace(/\W/g, '');
                    var adjustedVal = val.kind.replace(/\s+/g, '').toLocaleLowerCase();
                    switch (adjustedVal) {
                         case 'dropdown':
                              var selectOptions = val.value.split(",");
                              option = '<li><button class="btn toggler" onclick="angular.element(this).toggleClass(\'fa-chevron-down\').toggleClass(\'fa-chevron-up\')" type="button" data-toggle="collapse" data-target="#'+$scope.variableID+'">' +
                              $scope.variableName +
                              '<i class="fa fa-chevron-down"></i></button>' +
                              '<div class="collapse" id="'+$scope.variableID+'">' +
                              '<div class="well"><ul>';
                              if($scope.newPage.cards[$scope.currentIndex].cardName === $scope.currentCardName){
                                   if($scope.pageId){$scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = $scope.page.cards[$scope.currentIndex].actions[val.shortCode] || ''}else {
                                        $scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = ''}}
                                   jQuery.each(selectOptions, function (i, val) {
                                   $scope.elem = '<li style="font-size:15px !important;" ng-click="setValue(\''+val+'\',\''+$scope.shortCode+ '\')"><a>'+val+'</a></li>';
                                   $scope.elem1 = $compile($scope.elem)($scope);
                                   option += $scope.elem1[0].outerHTML;
                              });
                              option += '</ul></div>' +
                              '</div></li>';
                              break;
                         case 'textinput':
                              if($scope.newPage.cards[$scope.currentIndex].name === $scope.currentCardName){
                                   if($scope.pageId){$scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = $scope.page.cards[$scope.currentIndex].actions[val.shortCode] || ''}else {
                                        $scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = ''}}
                              option = '';
                              $scope.textField = '<li>' + val.name + '<br><input type="text" ng-model="'+ val.shortCode+'" data-ng-change="updateText(\''+$scope.shortCode+'\')"></li>';
                              $scope.compiledTextField = $compile($scope.textField)($scope);
                              option += $scope.compiledTextField[0].outerHTML;
                              break;
                         case 'textarea':
                              if($scope.newPage.cards[$scope.currentIndex].name === $scope.currentCardName){
                              if($scope.pageId){$scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = $scope.page.cards[$scope.currentIndex].actions[val.shortCode] || ''}else {
                                   $scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = ''}}
                              option = '';
                              $scope.textArea = '<li>' + val.name + '<br><textarea data-ng-model="'+val.shortCode+'" data-ng-change="updateTextArea(\''+$scope.shortCode+'\')"></textarea></li>';
                              $scope.compiledTextArea = $compile($scope.textArea)($scope);
                              option += $scope.compiledTextArea[0].outerHTML;
                              break;
                         case 'checkbox':
                              if($scope.newPage.cards[$scope.currentIndex].name === $scope.currentCardName){
                                   if($scope.pageId){$scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = $scope.page.cards[$scope.currentIndex].actions[val.shortCode] || ''}else {
                                        $scope.newPage.cards[$scope.currentIndex].actions[val.shortCode] = ''}}
                              option = '';
                              $scope.checkbox = '<li>' + val.name + '<input type="checkbox" ng-true-value="'+val.value+'" ng-false-value="\'\'" ng-model="'+ $scope.shortCode+'" ng-change="updateCheckbox(\''+val.value+'\', '+$scope.shortCode+',\''+$scope.shortCode+'\')"></li>';
                              $scope.compiledCheckbox = $compile($scope.checkbox)($scope);
                              option += $scope.compiledCheckbox[0].outerHTML;
                              break;
                         case 'button':
                              console.log('val.value', val.value);
                              console.log('$scope.shortCode', $scope.shortCode);
                              option = '';
                              option = '<li><br/>' +
                              '<img ng-if="'+$scope.shortCode+'&&!uploadingImage" ng-src="{{'+$scope.shortCode+'}}" style="border: 1px solid white;border-radius: 5px;padding: 10px 10px;min-height:100px;min-width:150px;margin-bottom:10px;">' +
                              '<div ng-if="!'+$scope.shortCode+'" style="color:white; border: 1px solid white;border-radius: 5px;min-height:150px;min-width:150px;padding-top: 30px;">' +
                              '<i ng-if="uploadingImage && !'+$scope.shortCode+'" style="position: relative;top: 23px;" class="fa fa-spinner fa-pulse fa-2x"></i>' +
                              '<h5 ng-if="!'+$scope.shortCode+'&& !uploadingImage" style="margin-top: 23x;position: relative;">No selected image</h5></div>' +
                              '<br/><button style="width: 180px;border-radius:5px; height:45px; left:70px;" class="btn btn-success">' +
                              '<i ng-if="!'+$scope.shortCode+'" style="font-size:20px" class="fa fa-file-image-o">&nbsp;&nbsp;&nbsp;Add Image</i>' +
                              '<i ng-if="'+$scope.shortCode+'" style="font-size:20px" class="fa fa-cog">&nbsp;&nbsp;&nbsp;Change image</i>' +
                              '</button>' +
                              '<input style="opacity: 0;text-indent: 9999px;width: 200px;height: 40px;position: relative;bottom: 43px;" type="file" class="fileUpload" onchange="angular.element(this).scope().upload(this.files'+','+val.value+',\''+$scope.shortCode+'\')"></li>';//onchange="alert( $(\'.fileUpload\').val() )"
                              break;
                    }
                    var compiledOption = $compile(option)($scope);
                    $('#cardOptions').append(compiledOption);
               });
               })};

          $scope.removeSection = function (e,i) {
               var card = cardsHelper.getCardById($scope.cards, i);
               var index = $scope.cards.indexOf(card);
               $scope.newPage.cards[index] = null;
               $("#sortable2, #export_sortable2").find("[data-html='" + card.name + "']").remove();
          };

          $scope.exportPage = function () {

               /*jQuery('input').each(function(index) {
                    $(this).attr('value', $(this).val());
               });
               jQuery('textarea').each(function(index) {
                    $(this).val($(this).val());
               });
               jQuery('.editable').each(function() {
                    $(this).attr('contenteditable', 'false');
               });
               jQuery("*").each(function() {
                    $(this).attr('style', '');
               });
               */
               var exportCSS = '<style>li{list-style: outside none none;border: 0px none;}</style>';
               var exportHead = '<!doctype html><head><meta charset="utf-8"></meta><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css"><script type="text/javascript" src = "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script>'+exportCSS+'</head><body>';

               var exportString = '';

               exportString = document.getElementById('body').outerHTML;               

               var exportFoot = '</body>';

               exportString = exportHead + exportString + exportFoot;
               
               $scope.newPage.sourceCode = exportString;    
               Pages.update({pageId:$scope.page._id}, $scope.newPage).$promise.then(function (page) {
                    logger.success('Pages exported successfully');
               }).catch(function () {logger.error('Error updating page');})

          };

          function buildList() {
               $('#sortable1').html('');
               jQuery.each($scope.cards, function (i, val) {
                    //default image
                    this.image = this.image || 'https://lh5.googleusercontent.com/-qJ5VVlQsLfY/VOBUcH3BV_I/AAAAAAAAGsA/ZhRwNytZLlE/w220-h150-no/noimage.png';
                    $('#sortable1').append('<li class="ui-state-default" data-html="' + this.name + '"><img src="' + this.image + '"></li>');
               });
          }

          $scope.upload = function (files,val,short) {
               $scope[short] = undefined;
               $scope.uploadingImage = true;
               $timeout(function () {$scope.imageUploading = true});
               var uniqName = cardsHelper.generateUniqueName(files[0].name);
               AWS.config.update({ accessKeyId: $scope.AWS.access_key, secretAccessKey: $scope.AWS.secret_key });
               AWS.config.region = $scope.AWS.region;
               var bucket = new AWS.S3({ params: { Bucket: $scope.AWS.bucket } });
               var params = { Key: uniqName, ContentType: files[0].type, Body: files[0], ServerSideEncryption: 'AES256' };
               bucket.putObject(params, function(err) {
                    if(err) {
                         logger.error('Error uploading image');
                    } else {
                         var s3link = "https://s3.amazonaws.com/" + $scope.AWS.bucket + "/" + /*scope.newPage.client.companyName || $scope.client.companyName) "/" +*/ uniqName;
                         var input = $("#sortable2, #export_sortable2").find("style").text();
                         var res;
                         if($scope.page || $scope.onceUploaded){
                              var strEd;
                              if($scope.page)strEd = $scope.page.cards[$scope.currentIndex].actions[short] || '{{' + short + '}}';
                              if($scope.onceUploaded)strEd = $scope.newPage.cards[$scope.currentIndex].actions[short];
                              var regexEd = new RegExp(strEd,"g");
                              console.log('trazim', strEd);
                              res = input.replace(regexEd, s3link);
                         } else {
                              var str = '{{' + short + '}}';
                              var regex = new RegExp(str,"g");
                              res =  input.replace(regex, '"'+s3link+'"');
                              $scope.onceUploaded = true;
                         }
                         $("#sortable2, #export_sortable2").find("style").html(res);
                         var model = $parse(String(short));
                         model.assign($scope, s3link);
                         var temp = {};
                         temp[short] = s3link;
                         $scope.newPage.cards[$scope.currentIndex].actions = _.extend($scope.newPage.cards[$scope.currentIndex].actions, temp );
                         if($scope.pageId)$scope.newPage.cards[$scope.currentIndex].actions = _.extend($scope.page.cards[$scope.currentIndex].actions, temp );
                         $scope.uploadingImage = false;
                         $scope.$apply();
                    }
               })
          };

          $scope.setColor = function (e) {
                    if(e){$scope.colorChoice = e;}
                    $scope.$apply();
          };
          $scope.setFont = function (e) {
                    if(e){$scope.selectedFont = e;}
          };
          $scope.setValue = function (value, rule) {
               var model = $parse(String(rule));
               model.assign($scope, value || undefined);
               var temp = {};
               temp[rule] = value;
               $scope.newPage.cards[$scope.currentIndex].actions = _.extend($scope.newPage.cards[$scope.currentIndex].actions, temp );
               if($scope.pageId)$scope.newPage.cards[$scope.currentIndex].actions = _.extend($scope.page.cards[$scope.currentIndex].actions, temp );
          };

          $scope.updateTextArea = function (rule) {
               $scope.newPage.cards[$scope.currentIndex].actions[rule] = $scope[rule];
          };

          $scope.updateCheckbox = function (value, state, shortCode) {
               var model = $parse(String(shortCode));
               model.assign($scope, state);
               var temp = {};
               temp[shortCode] = state;
               $scope.newPage.cards[$scope.currentIndex].actions = _.extend($scope.newPage.cards[$scope.currentIndex].actions, temp );
               if($scope.pageId)$scope.newPage.cards[$scope.currentIndex].actions = _.extend($scope.page.cards[$scope.currentIndex].actions, temp );
          };

          $scope.updateText = function (rule) {
               $scope.newPage.cards[$scope.currentIndex].actions[rule] = $scope[rule];
          };

          if($scope.pageId && !$scope.initialized) {
               $timeout(function () {
               $scope.newPage = $scope.page;
               if(!$scope.editing){
               for (var i = 0; i < $scope.page.cardsOrder.length; i+=1) {
                    var cardInfo = pagesHelper.getCardByName($scope.page.cards, $scope.page.cardsOrder[i]);
                    var currentCard = cardInfo[0];
                    var index = cardInfo[1];
                    angular.element(document.querySelector('#sortable2, #export_sortable2')).append('<li class="ui-state-default ui-sortable-handle" data-html="'+currentCard.cardName+'" style="display: list-item"></li>');
                    var card = cardsHelper.getCardById($scope.cards, currentCard.cardId);
                    card.html = currentCard.content;
                    $scope.addSection(index, card.name, card.html);
                    if($scope.page.cards[index]){
                    for (var key in $scope.page.cards[index].actions) {
                         if ($scope.page.cards[index].actions.hasOwnProperty(key)) {
                              $scope[key] = $scope.page.cards[index].actions[key];
                         }
                    }
               }
               }
               }
               if(i ===$scope.page.cardsOrder.length)$scope.initialized = true;
               $scope.updatedName = $scope.page.name;
                    $scope.$apply();
               });
          }

     }
}

}());
