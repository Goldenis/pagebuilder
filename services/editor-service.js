(function () {
     'use strict';

     angular
          .module('pages')
          .factory('editorService', editorService);

     editorService.$inject = ['logger', '$timeout', '$compile', 'appConfig', 'cardsHelper'];

     function editorService(logger, $timeout, $compile, appConfig, cardsHelper) {
          var service = {
               renderEditor: renderEditor
          };

          return service;

          function renderEditor(client, scope) {
               $('[id^=medium-editor-toolbar]').remove();
               scope.myEditor = new MediumEditor('.editable', buildMediumEditorOptions(scope));

               $('.medium-editor-action-justifyFull').empty().append('<i class="fa fa-align-justify"></i>');
               $('.medium-editor-action-justifyRight').empty().append('<i class="fa fa-align-right"></i>');
               $('.medium-editor-action-justifyLeft').empty().append('<i class="fa fa-align-left"></i>');
               $('.medium-editor-action-justifyCenter').empty().append('<i class="fa fa-align-center"></i>');
               $('.medium-editor-action-anchor').empty().append('<i class="fa fa-link"></i>');
               $('.medium-editor-action-bold').empty().append('<i class="fa fa-bold"></i>');
               $('.medium-editor-action-italic').empty().append('<i class="fa fa-italic"></i>');
               $('.medium-editor-action-unorderedlist').empty().append('<i class="fa fa-list-ul"></i>');
               $('.medium-editor-action-removeFormat').empty().append('<i class="fa fa-eraser"></i>');
               $('.medium-editor-action-quote').empty().hide();

              scope.myEditor.subscribe('editableClick', function () {
                  scope.headerModel = getEditableHeader(scope.myEditor.getSelectedParentElement());
                  $('#headerDD').val(scope.headerModel);
              });

              scope.myEditor.subscribe('editableInput', function () {
                  scope.isPageDirty = true;
              });

               if (client) {
                    render(scope.myEditor, client, scope);
               }
          }

         function buildMediumEditorOptions(scope) {
             return {
                 buttons: ['quote', 'bold', 'italic', 'unorderedlist', 'anchor', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'removeFormat', 'colors', 'clientFonts', 'headerDropDown'],
                 imageDragging: false,
                 hideToolbar: function () {
                     scope.$apply();
                 },
                 extensions: {
                     'colors': new MediumButton({
                         label: '<span id="colorpicker"></span>',
                         action: function (html, mark) {
                             ensure(cleanupEmptyTags);
                             var content = stripTags(html, 'span.color');
                             return '<span class="color" style="color:' + scope.colorChoice + '">' + content + '</span>';
                         }
                     }),
                     'clientFonts': new MediumButton({
                         label: '<span id="customFonts"></span>',
                         action: function (html, mark) {
                             ensure(cleanupEmptyTags);
                             var content = stripTags(html, 'span.font');
                             return '<span class="font" style="font-family:\'' + scope.selectedFont + '\'">' + content + '</span>';
                         }
                     }),
                     'headerDropDown': new MediumButton({
                         label: '<span id="dropdown"></span>',
                         action: function (html, mark) {
                             ensure(cleanupEmptyTags);
                             scope.myEditor.execAction('append-p');
                             $(scope.myEditor.getSelectedParentElement()).attr('class', scope.selectedHeader);
                             var content = stripTags(html, 'p');
                             return content;
                             //var text = extractText(html);
                             //return text;
                         }
                     }),
                     's3-image-uploader': new MediumS3ImageUploader({
                         credentials: appConfig.credentialsAWS,
                         filepath: function(file, container) {
                             var client = resolveClient(container);
                             return cardsHelper.generateUniqueName(file.name, client);
                         }
                     })
                 }
             };
         }

          function render(editor, client, scope) {
                    var color = 0,font = 0;
                    for (var i in client.variables) {
                         if (client.variables[i].kind === 'Color') {
                              color++;
                              var xx = '<span class="colorblock" style="background-color: ' + client.variables[i].value + ';" ng-click="setColor(\'' + client.variables[i].value + '\')"></span>';
                              var cxx = $compile(xx)(scope);
                              $('#colorpicker').append(cxx);
                         }
                         if (client.variables[i].kind === 'Font') {
                              font++;
                              var yy = '<li><button title=' + client.variables[i].value + ' ng-click="setFont(\'' + client.variables[i].value + '\')" style="display:table-cell; padding:0;">'+ client.variables[i].variable + '</button></li>';
                              var cyy = $compile(yy)(scope);
                              $('#customFonts').append(cyy);
                         }
                    }
                    color === 0 ? $('#colorpicker').closest('li').hide() : $('#colorpicker').closest('li').show();
                    font === 0 ? $('#customFonts').closest('li').hide() : $('#customFonts').closest('li').show();

                    $('#headerDD').closest('li').remove();
                    var bb = '<li><select id="headerDD" style="display:inherit;color:white;background-color:#242424;height:50px;border-radius: 8px; border: none;" ng-model="headerModel" ng-change="setHeaderValue(headerModel)">' +
                         '<option value="" disabled selected style="display:none;">Select heading</option>' +
                         '<option value="h1">Header 1</option>' +
                         '<option value="h2">Header 2</option>' +
                         '<option value="h3">Header 3</option>' +
                         '<option value="h4">Header 4</option>' +
                         '<option value="caption">Caption</option>' +
                         '<option value="p">Body</option>' +
                         '<option value="p-large">Paragraph Large</option>' +
                         '<option value="pull-quotes">Pull Quotes</option>' +
                         '<option value="footnote">Footnote</option></select></li>';
                    var cbb = $compile(bb)(scope);
                    $('#medium-editor-toolbar-actions1').prepend(cbb);
                    /****** override MediumButton defaults for dropdowns ******/
                    $('#headerDD').click(function(event){
                         event.stopPropagation();
                    });

                    scope.setColor = function(e) {
                         if(e){scope.colorChoice = e;}
                         $('[medium-editor-model]').trigger('input');
                    };
                    scope.setFont = function(e) {
                         if (e) {scope.selectedFont = e;}
                         $('[medium-editor-model]').trigger('input');
                    };
                    scope.setHeaderValue = function(e) {
                         scope.selectedHeader = e;
                         if(e==='blockquote'){$('.medium-editor-action-quote').trigger('click');} else {
                              $('.medium-editor-button-last').trigger('click');
                         }
                         $('[medium-editor-model]').trigger('input');
                    };
               }

         function extractText(html) {
             return $('<p>').html(html).text();
         }

         function getEditableHeader(element) {
             var isEditable = $(element).is('.editable');
             if (isEditable && element.tagName.toLowerCase() !== 'p') return;
             var header = isEditable ? 'p' : $(element).attr('class') || 'p';
             return header;
         }

         function ensure(callback) {
             callback();
             $timeout(function () { callback(); })
         }

         function cleanupEmptyTags() {
             var blanks = $('.editable :not(img):empty');
             if (!blanks.length) return;
             blanks.remove();
             cleanupEmptyTags();
         }

         function stripTags(html, tagSelector) {
             var $content = $('<p>').html(html);
             $content.find(tagSelector).contents().unwrap();
             return $content.html();
         }

         function resolveClient(container) {
             var client = $(container).closest('[data-client-name]').data('client-name');
             return client;
         }
     }
})();
