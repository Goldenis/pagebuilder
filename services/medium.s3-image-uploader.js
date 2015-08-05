"use strict";

window.MediumS3ImageUploader = (function (MediumEditor) {
    return MediumEditor.Extension.extend({
        name: 'image-dropping-to-s3',
        init: function () {
            this.subscribe('editableDrag', this.handleDrag.bind(this));
            this.subscribe('editableDrop', this.handleDrop.bind(this));

            handleGlobalDragAndDrop(function (event) {
                var editor = $(this.base.getFocusedElement()).closest('.editable');
                if (editor.length) {
                    this.handleDrop(event, editor);
                    return true;
                }
            }.bind(this));
        },
        handleDrag: function (event) {
            var className = 'medium-editor-dragover';
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';

            if (event.type === 'dragover') {
                event.target.classList.add(className);
                this.base.selectElement(event.target);
            } else if (event.type === 'dragleave') {
                event.target.classList.remove(className);
            }
        },
        handleDrop: function (event, editor) {
            if (isProcessingDrop(editor)) {
                return;
            }

            var className = 'medium-editor-dragover',
                files;
            event.preventDefault();
            event.stopPropagation();

            // IE9 does not support the File API, so prevent file from opening in a new window
            // but also don't try to actually get the file
            if (event.dataTransfer.files) {
                files = Array.prototype.slice.call(event.dataTransfer.files, 0);
                files.some(function (file) {
                    if (file.type.match("image")) {
                        id = 'medium-img-' + (+new Date());

                        var fileReader, id;
                        fileReader = new FileReader();
                        fileReader.readAsDataURL(file);

                        event.target.classList.remove(className);
                        $(editor).find('.medium-editor-dragover').removeClass('medium-editor-dragover');

                        var focused = this.base.getFocusedElement();
                        if (focused && !isContentEmpty(focused)) {
                            var selection = this.base.exportSelection();
                            selection.start = selection.end;
                            this.base.importSelection(selection);
                        }

                        this.base.pasteHTML('<img class="medium-image-loading" id="' + id + '">');
                        $('#' + id).wrap('<p>').wrap('<span class="image">');

                        fileReader.onload = function () {
                            var img = this.base.options.ownerDocument.getElementById(id);
                            if (img) {
                                img.removeAttribute('id');
                                img.removeAttribute('class');
                                img.src = fileReader.result;
                                
                                var filepath = this.filepath(file, editor);
                                this.uploadFile(file, filepath, function (url) {
                                    img.src = url;
                                }.bind(this));
                            }
                        }.bind(this);
                    }
                }.bind(this));
            }
            event.target.classList.remove(className);
        },
        uploadFile: function (file, uniqName, success) {
            var credentials = this.credentials;
            AWS.config.update({ accessKeyId: credentials.access_key, secretAccessKey: credentials.secret_key });
            AWS.config.region = credentials.region;
            var bucket = new AWS.S3({ params: { Bucket: credentials.bucket } });
            var params = { Key: uniqName, ContentType: file.type, Body: file, ServerSideEncryption: 'AES256', ACL:'public-read' };
            bucket.putObject(params, function(err, data) {
                if(err) {
                    console.error('Error uploading image');
                } else {
                    var s3link = "https://s3.amazonaws.com/" + credentials.bucket + "/" + uniqName;
                    console.log('Image uploaded successfully', s3link);
                    (success || $.noop)(s3link);
                }
            });
        },
        filepath: function (file) {
            var salt = Math.floor(Math.random() * 100).toString();
            return 'app/medium-image-' + id + '-' + salt;
        }
    });

    function isProcessingDrop(editor) {
        var $editor = $(editor);
        if ($editor.data('drop-processing')) {
            setTimeout(function () {
                $editor.data('drop-processing', false);
            }, 100);
            return true;
        }

        $editor.data('drop-processing', true);
        return false;
    }

    function isContentEmpty(element) {
        var $element = $(element);
        return $element.length == 0
            || $element.text().trim() == '' && $element.find('img').length == 0;
    }

    function handleGlobalDragAndDrop(callback) {
        window.addEventListener('dragover', function(e){
            e = e || event;
            e.preventDefault();
        }, false);

        window.addEventListener('drop', function(e){
            e = e || event;
            e.preventDefault();

            var handled = (callback || $.noop)(event);
            if (handled) {
                e.stopPropagation();
            }
        }, false);
    }

})(MediumEditor);
