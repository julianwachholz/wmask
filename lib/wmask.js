/**
 * wmask.js
 *
 * Web based image masking application.
 */

/*jslint devel: true, todo: true, regexp: true */
/*global Point: true, Rectangle: true, Mask: true, ga: true, Whammy: true,
         requestAnimationFrame: true, cancelAnimationFrame: true, URL: true,
         Event: true, MouseEvent: true, CustomEvent: true, FileReader: true
*/

(function (w, d) {
    'use strict';

    var WMask, WMaskHistory, id;

    id = document.getElementById.bind(document);

    /**
     * WMask application
     *
     * @param {CanvasElement} canvas
     * @param {CanvasRenderingContext2D} context
     */
    WMask = function (canvas, context) {
        this.canvas = canvas;
        this.ctx = context;
        this.showStartScreen();
        this.acceptMedia();
    };

    /**
     * Filename to get the basename of an image without extension.
     */
    WMask.RE_FILENAME = /^.*?([^\/]*?)\.(jpe?g|png|gif|bmp|webm)$/i;

    /**
     * @type {Number}
     */
    WMask.prototype.width = 800;

    /**
     * @type {Number}
     */
    WMask.prototype.height = 600;

    /**
     * requestAnimationFrame ID.
     */
    WMask.prototype.animationID = null;

    /**
     * Timeout ID for the current processing function.
     */
    WMask.prototype.processID = null;

    /**
     * @type {Image|HTMLVideoElement}
     */
    WMask.prototype.media = null;

    /**
     * @type {Boolean}
     */
    WMask.prototype.isVideo = false;

    /**
     * @type {Number}
     */
    WMask.prototype.frameRate = 1 / 23.97;

    /**
     * @type {Array} ImageData frames.
     */
    WMask.prototype.frames = null;

    /**
     * @type {String}
     */
    WMask.prototype.filename = null;

    /**
     * @type {Canvas} The frame to draw without any other UI elements.
     */
    WMask.prototype.frameCanvas = null;

    /**
     * @type {CanvasRenderingContext2D}
     */
    WMask.prototype.frameCtx = null;

    /**
     * @type {Point}
     */
    WMask.prototype.cursor = null;

    /**
     * @type {Boolean}
     */
    WMask.prototype.mouseDown = false;

    /**
     * @type {Point}
     */
    WMask.prototype.selectionStart = null;

    /**
     * @type {Point}
     */
    WMask.prototype.selectionEnd = null;

    /**
     * @type {Rectangle}
     */
    WMask.prototype.selection = null;

    /**
     * @type {WMaskHistory}
     */
    WMask.prototype.history = null;

    /**
     * @type {Number} Current zoom level, percentage of image size.
     */
    WMask.prototype.zoomLevel = 1;

    /**
     * Show a prompt to load an image.
     */
    WMask.prototype.showStartScreen = function () {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.font = 'bold 30px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Drag image or video here or click to select.', this.width / 2, this.height / 2);
    };

    /**
     * Show a progress bar with some text.
     *
     * @param {String} text Display this above a progress bar.
     * @param {Number} progress Current percentage in progress (0-1).
     * @param {ImageData} background Optional background image data.
     */
    WMask.prototype.showProgress = function (text, progress, background) {
        var margin, percent;
        this.ctx.save();

        if (!!background) {
            this.ctx.putImageData(background, 0, 0);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.66)';
        } else {
            this.ctx.fillStyle = '#fff';
        }
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#333';
        this.ctx.font = 'normal 15px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, this.width / 2, this.height / 2);

        if (progress !== -1) {
            margin = this.width / 20;
            this.ctx.strokeStyle = '#333';
            this.ctx.strokeRect(margin, (this.height / 2) + margin, this.width - 2 * margin, margin);
            this.ctx.fillRect(margin, (this.height / 2) + margin, progress * (this.width - 2 * margin), margin);

            percent = Math.round(progress * 100) + '%';
            this.ctx.fillStyle = '#333';
            this.ctx.fillText(percent, this.width / 2, (this.height / 2) + margin * 1.5);

            this.ctx.beginPath();
            this.ctx.rect(margin, (this.height / 2) + margin, progress * (this.width - 2 * margin), margin);
            this.ctx.clip();

            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(percent, this.width / 2, (this.height / 2) + margin * 1.5);
        }
        this.ctx.restore();
    };

    /**
     * Repaint the canvas with an error message.
     *
     * @param {String} error Message to display.
     * @param {String} error More detailed error explanation.
     */
    WMask.prototype.showErrorScreen = function (error, message) {
        var cw = this.width / 2,
            ch = this.height / 2;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#f33';
        this.ctx.font = 'bold 30px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(error, cw, ch - (!!message ? 25 : 0));

        if (!!message) {
            this.ctx.font = 'normal 20px sans-serif';
            this.ctx.fillText(message, cw, ch + 25);
        }
    };

    /**
     * Setup the canvas to accept loading media.
     */
    WMask.prototype.acceptMedia = function () {
        var showError, setFilename, loadImage, loadVideo, readFile, drop, click, gaLoadFunction;

        this.canvas.addEventListener('dragover', function (event) {
            event.preventDefault();
        }, false);

        showError = this.showErrorScreen.bind(this);

        setFilename = function (filename) {
            this.filename = filename;
        }.bind(this);

        loadImage = function (src) {
            var img = new Image(), c;

            c = this.canvas;
            img.addEventListener('load', function () {
                c.removeEventListener('click', click);
                c.removeEventListener('drop', drop);
                c.addEventListener('drop', function (event) {
                    event.preventDefault();
                });

                ga('send', 'event', 'image', 'load', gaLoadFunction);
            });
            img.addEventListener('load', this.startEditor.bind(this, img));

            img.addEventListener('error', function () {
                showError(
                    'Failed loading image, please try again.',
                    'The server probably does not allow cross-origin requests to this image.'
                );
                ga('send', 'event', 'image', 'error', gaLoadFunction);
            }.bind(this));

            if (/^https?:\/\//i.test(src)) {
                img.crossOrigin = 'anonymous';
            }
            img.src = src;
        }.bind(this);

        loadVideo = function (src) {
            var canplaythrough, v = d.createElement('video'), c;

            c = this.canvas;
            canplaythrough = function() {
                v.removeEventListener('canplaythrough', canplaythrough);
                c.removeEventListener('click', click);
                c.removeEventListener('drop', drop);
                c.addEventListener('drop', function (event) {
                    event.preventDefault();
                });
                this.isVideo = true;
                this.captureFrames(v);
                ga('send', 'event', 'video', 'load', gaLoadFunction);
            }.bind(this);
            v.addEventListener('canplaythrough', canplaythrough, false);
            v.addEventListener('error', console.error);
            v.muted = true;
            v.src = src;
        }.bind(this);

        readFile = function (file) {
            var reader = new FileReader();
            reader.addEventListener('load', function (event) {
                if (/video\//.test(file.type)) {
                    loadVideo(event.target.result);
                } else {
                    loadImage(event.target.result);
                }
            });
            reader.readAsDataURL(file);
        };

        drop = function (event) {
            var tx = event.dataTransfer;
            event.preventDefault();

            if (tx.items.length < 1) {
                console.info('Nothing dropped.');
                return;
            }

            if (tx.getData('text/uri-list') !== '') {
                gaLoadFunction = 'dnd-cors';
                setFilename(tx.getData('text/uri-list').replace(WMask.RE_FILENAME, '$1'));
                loadImage(tx.getData('text/uri-list'));
            } else if (/^(image|video)\//.test(tx.files[0].type)) {
                gaLoadFunction = 'dnd';
                setFilename(tx.files[0].name.replace(WMask.RE_FILENAME, '$1'));
                readFile(tx.files[0]);
            } else {
                showError('No media dropped. :(');
            }
        };

        click = function () {
            var fileInput = d.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*,video/*';

            fileInput.addEventListener('change', function () {
                if (this.files.length < 1 || !/^(image|video)\//.test(this.files[0].type)) {
                    showError('No media selected. :(');
                    return false;
                }
                gaLoadFunction = 'input';
                setFilename(this.files[0].name.replace(WMask.RE_FILENAME, '$1'));
                readFile(this.files[0]);
            });
            fileInput.dispatchEvent(new MouseEvent('click'));
        };

        this.canvas.addEventListener('drop', drop, false);
        this.canvas.addEventListener('click', click, false);
    };

    /**
     * Once we have an image loaded we'll start the editor.
     *
     * @param {Image|HTMLVideoElement} media
     * @param {Boolean} isVideo
     */
    WMask.prototype.startEditor = function (media) {
        if (!this.isVideo) {
            this.setMedia(media);
        }
        this.addEventListeners();
        this.initMenu();
        this.initHistory();
        this.canvas.style.cursor = 'none';
        this.draw();
    };

    /**
     * Set the media to work on.
     *
     * @param {Image|HTMLVideoElement} media
     */
    WMask.prototype.setMedia = function (media) {
        this.media = media;

        if (this.isVideo) {
            this.width = media.videoWidth;
            this.height = media.videoHeight;
        } else {
            this.frames = [];
            this.width = media.width;
            this.height = media.height;
        }

        this.frameCanvas = d.createElement('canvas');
        this.frameCanvas.width = this.width;
        this.frameCanvas.height = this.height;
        this.frameCtx = this.frameCanvas.getContext('2d');
        this.frameCtx.drawImage(media, 0, 0);

        this.setCanvasSize(this.width, this.height);

        if (!this.isVideo) {
            this.frames.push(this.frameCtx.getImageData(0, 0, this.width, this.height));
        }
    };

    /**
     * Capture individual frames of a video.
     *
     * @param {HTMLVideoElement} media
     */
    WMask.prototype.captureFrames = function (media) {
        var totalFrames, currentFrame;
        this.frames = [];
        this.setMedia(media);
        this.canvas.style.cursor = 'wait';

        currentFrame = 0;
        totalFrames = media.duration / this.frameRate;

        /**
         * Capture frames one by one, asynchronously.
         * After adjusting currentTime we always have to wait
         * for the element to stop seeking.
         */
        setTimeout(function capture() {
            var frame;
            if (media.ended) {
                this.startEditor();
                return;
            }
            if (!media.seeking) {
                this.frameCtx.drawImage(media, 0, 0);
                frame = this.frameCtx.getImageData(0, 0, this.width, this.height);
                this.frames.push(frame);
                media.currentTime += this.frameRate;
                currentFrame += 1;
                this.showProgress('Capturing video frames...', currentFrame / totalFrames, frame);
            }
            setTimeout(capture.bind(this));
        }.bind(this));
    };

    /**
     * Set the canvas size.
     *
     * @param {Number} width
     * @param {Number} height
     */
    WMask.prototype.setCanvasSize = function (width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.cursor = 'none';
        this.canvas.style.margin = '-' + (height / 2) + 'px 0 0 -' + (width / 2) + 'px';

        if (this.zoomLevel < 1) {
            this.ctx.webkitImageSmoothingEnabled = true;
            this.ctx.mozImageSmoothingEnabled = true;
            this.ctx.imageSmoothingEnabled = true;
        } else {
            this.ctx.webkitImageSmoothingEnabled = false;
            this.ctx.mozImageSmoothingEnabled = false;
            this.ctx.imageSmoothingEnabled = false;
        }
    };

    /**
     * Cursor event listeners for selection making.
     */
    WMask.prototype.addEventListeners = function () {
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    };

    /**
     * Setup menu buttons.
     *
     * TODO add keyboard event listeners for quick actions
     */
    WMask.prototype.initMenu = function () {
        var maskButtons = [], mask, actions, action;
        id('menu').style.display = 'block';

        for (mask in Mask.Actions) {
            if (Mask.Actions.hasOwnProperty(mask)) {
                id('mask-' + mask).addEventListener('click', this.applyMask.bind(this, mask));
                maskButtons.push(id('mask-' + mask));
            }
        }

        actions = {
            save: {call: 'save', arg: null},
            undo: {call: 'history', arg: 'undo'},
            redo: {call: 'history', arg: 'redo'},
            zoomin: {call: 'zoom', arg: +1},
            zoomout: {call: 'zoom', arg: -1}
        };

        for (action in actions) {
            if (actions.hasOwnProperty(action)) {
                id('action-' + action).addEventListener('click', this[actions[action].call + 'Action'].bind(this, actions[action].arg));
            }
        }

        id('action-cancel').addEventListener('click', this.resumeDrawing.bind(this));

        this.canvas.addEventListener('selectionEnd', function () {
            maskButtons.forEach(function (button) {
                button.disabled = false;
            });
        });
        this.canvas.addEventListener('selectionClear', function () {
            maskButtons.forEach(function (button) {
                button.disabled = true;
            });
        });
    };

    /**
     * Initialize the history for this image.
     */
    WMask.prototype.initHistory = function () {
        var history;

        history = new WMaskHistory();
        history.enableUndo = function () {
            id('action-undo').disabled = false;
        };
        history.disableUndo = function () {
            id('action-undo').disabled = true;
        };
        history.enableRedo = function () {
            id('action-redo').disabled = false;
        };
        history.disableRedo = function () {
            id('action-redo').disabled = true;
        };
        this.history = history;
    };

    /**
     * Apply a mask to the current selection.
     *
     * @param {String} maskName
     */
    WMask.prototype.applyMask = function (maskName) {
        var selection, cpCode;

        if (maskName === 'cp') {
            cpCode = Mask.CP.getCode();
        }

        selection = this.selection;
        this.history.add({
            mask: maskName,
            selection: selection,
            cpCode: cpCode
        });

        this.processFrames(this.history.forward());
        ga('send', 'event', this.isVideo ? 'video' : 'image', 'mask', maskName);
    };

    /**
     * Go through all frames and apply the mask function to them.
     *
     * TODO make this work again with simple images.
     *
     * @param {Object} historyEntry
     * @param {Boolean} undo Wether to use the reverse action.
     */
    WMask.prototype.processFrames = function (historyEntry, undo) {
        var selection, newFrames, totalFrames, maskFunc;
        selection = historyEntry.selection;

        newFrames = [];
        totalFrames = this.frames.length;

        if (undo) {
            maskFunc = Mask.ReverseActions[historyEntry.mask];
        } else {
            maskFunc = Mask.Actions[historyEntry.mask];
        }
        if (!!historyEntry.cpCode) {
            maskFunc = maskFunc(historyEntry.cpCode);
        }

        this.stopDrawing();
        this.processID = setTimeout(function renderFrame(frameIndex) {
            var completeFrame;
            completeFrame = this.frames[frameIndex];

            newFrames[frameIndex] = maskFunc(completeFrame, selection);
            this.showProgress('Masking, please wait...', frameIndex / totalFrames, newFrames[frameIndex]);

            if (frameIndex + 1 === totalFrames) {
                this.frames = newFrames;
                this.resumeDrawing();
            } else {
                this.processID = setTimeout(renderFrame.bind(this, frameIndex + 1));
            }
        }.bind(this, 0));
    };

    /**
     * Save the image on the user's device.
     */
    WMask.prototype.saveAction = function () {
        var link, image;
        if (this.isVideo) {
            this.saveVideo();
        } else {
            image = this.frameCanvas.toDataURL();
            link = d.createElement('a');
            link.download = this.filename + '.png';
            link.href = image;
            link.click();
        }
    };

    /**
     * Save the video as a webm file.
     *
     * TODO would be nice if we had some sort of progress here.
     */
    WMask.prototype.saveVideo = function () {
        var encoder, frameCount, link, canvas, context;
        frameCount = this.frames.length;

        encoder = new Whammy.Video(1 / this.frameRate, 0.99);

        this.stopDrawing(true);
        setTimeout(function () {
            this.frames.forEach(function (frame, i) {
                encoder.frames.push({
                    image: frame,
                    duration: encoder.duration,
                });
                if (i + 1 === frameCount) {
                    link = d.createElement('a');
                    link.download = this.filename + '.webm';
                    encoder.compile(false, function (result) {
                        link.href = URL.createObjectURL(result);
                        link.click();
                        this.resumeDrawing();
                    }.bind(this), function (progress) {
                        this.showProgress('Compiling video, please be patient...', progress / frameCount, frame);
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this), 10);
    };

    /**
     * Revert or redo the last action.
     *
     * @param {String} direction Either 'undo' or 'redo'.
     */
    WMask.prototype.historyAction = function (direction) {
        if (direction === 'undo') {
            this.processFrames(this.history.backward(), 'backward');
        }
        if (direction === 'redo') {
            this.processFrames(this.history.forward(), 'forward');
        }
    };

    /**
     * Zoom the viewport canvas in or out.
     *
     * @param {Number} zoom Positive zooms in, negative zooms out.
     */
    WMask.prototype.zoomAction = function (zoom) {
        if (zoom === 0) {
            this.zoomLevel = 1;
        } else {
            this.zoomLevel += zoom / 10;
        }

        console.log('zoomLevel', this.zoomLevel);
        this.setCanvasSize(this.media.width * this.zoomLevel, this.media.height * this.zoomLevel);
    };

    /**
     * Stop the drawing loop and let something else draw.
     */
    WMask.prototype.stopDrawing = function (hideCancel) {
        cancelAnimationFrame(this.animationID);
        id('menu').style.display = 'none';
        if (!hideCancel) {
            id('cancelmenu').style.display = 'block';
        }
        this.canvas.style.cursor = 'wait';
    };

    /**
     * Cancel the current action and resume drawing the normal editor.
     */
    WMask.prototype.resumeDrawing = function () {
        if (!!this.processID) {
            clearTimeout(this.processID);
        }
        id('menu').style.display = 'block';
        id('cancelmenu').style.display = 'none';
        this.canvas.style.cursor = 'none';
        this.draw();
    };

    /**
     * Mouse movement sets the cursor position to the nearest
     * point on the image grid.
     *
     * @param {MouseEvent} event
     */
    WMask.prototype.onMouseMove = function (event) {
        if (!this.cursor) {
            this.cursor = new Point(event.layerX, event.layerY);
        } else {
            this.cursor.x = event.layerX;
            this.cursor.y = event.layerY;
        }

        if (this.mouseDown) {
            this.selectionEnd = this.snapToGrid(new Point(event.layerX, event.layerY));
            this.selection = Rectangle.fromPoints(this.selectionStart, this.selectionEnd);
        }
    };

    /**
     * Start a new selection.
     */
    WMask.prototype.onMouseDown = function (event) {
        this.mouseDown = true;
        this.selectionStart = this.snapToGrid(new Point(event.layerX, event.layerY));
    };

    /**
     * Selection finished, if the cursor hasn't moved we'll clear
     * the selection completely.
     */
    WMask.prototype.onMouseUp = function (event) {
        var trigger = 'selectionClear';

        this.selectionEnd = this.snapToGrid(new Point(event.layerX, event.layerY));
        this.mouseDown = false;

        if (this.selectionStart.equals(this.selectionEnd) || !this.selection.hasArea()) {
            this.selection = null;
        } else {
            trigger = 'selectionEnd';
        }
        this.canvas.dispatchEvent(new CustomEvent(trigger));
    };

    /**
     * Avoid the weird mouse following after leaving the canvas.
     */
    WMask.prototype.onMouseLeave = function (event) {
        this.cursor = null;
        if (this.mouseDown) {
            this.onMouseUp(event);
        }
    };

    /**
     * Draw the interface, which consists of our image and the current selection.
     */
    WMask.prototype.draw = function () {
        var frameTiming, frameCount, currentFrame, animationFrame;

        frameCount = this.frames.length;
        currentFrame = 0;
        frameTiming = this.frameRate * 1000;

        if (this.isVideo) {
            setTimeout(function fps() {
                currentFrame += 1;
                currentFrame %= frameCount;
                setTimeout(fps, frameTiming);
            }, frameTiming);
        }

        animationFrame = function () {
            this.animationID = requestAnimationFrame(animationFrame.bind(this));
            this.ctx.save();
            this.ctx.scale(this.zoomLevel, this.zoomLevel);
            this.ctx.putImageData(this.frames[currentFrame], 0, 0);
            this.ctx.restore();

            this.drawCursor();
            this.drawSelection();
        };
        animationFrame.apply(this);
    };

    /**
     * Draw a 10×10 crosshair at the cursor position.
     */
    WMask.prototype.drawCursor = function () {
        var x, y, rgb;

        if (!this.cursor) {
            return;
        }

        x = this.cursor.x;
        y = this.cursor.y;

        rgb = this.ctx.getImageData(x, y, 1, 1).data;
        this.ctx.strokeStyle = 'rgb(' + (255 - rgb[0]) + ',' + (255 - rgb[1]) + ',' + (255 - rgb[2]) + ')';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(x - 4.5, y + 0.5);
        this.ctx.lineTo(x + 5.5, y + 0.5);
        this.ctx.moveTo(x + 0.5, y - 4.5);
        this.ctx.lineTo(x + 0.5, y + 5.5);
        this.ctx.stroke();
        this.ctx.closePath();
    };

    /**
     * Snap a point to the main 8×8 grid.
     *
     * @param {Point} p The point to snap to the grid.
     * @return {Point}
     */
    WMask.prototype.snapToGrid = function (p) {
        var x0, y0, halfGrid;
        halfGrid = Mask.GRID_SIZE / 2;

        x0 = p.x % Mask.GRID_SIZE;
        p.x += x0 > halfGrid ? Mask.GRID_SIZE - x0 : -x0;

        y0 = p.y % Mask.GRID_SIZE;
        p.y += y0 > halfGrid ? Mask.GRID_SIZE - y0 : -y0;

        return p;
    };

    /**
     * Draw the current selection.
     */
    WMask.prototype.drawSelection = function () {
        if (!this.selection) {
            return;
        }
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.75)';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.selection.drawLines(this.ctx);
        this.ctx.stroke();
        this.ctx.closePath();
    };

    /**
     * Simple history management.
     */
    WMaskHistory = function () {
        this.entries = [];
        this.position = -1;
    };

    WMaskHistory.prototype.enableUndo = null;
    WMaskHistory.prototype.disableUndo = null;
    WMaskHistory.prototype.enableRedo = null;
    WMaskHistory.prototype.disableRedo = null;

    /**
     * Add a new entry to the history.
     *
     * @param {Object} entry containing forward and backward functions.
     */
    WMaskHistory.prototype.add = function (entry) {
        if (this.position + 1 < this.entries.length) {
            this.entries = this.entries.slice(0, this.position + 1);
            this.disableRedo();
        }
        this.entries.push(entry);
        this.enableUndo();
    };

    /**
     * Go one step further in this history.
     *
     * @return {Function} the callback to be applied for this history entry.
     */
    WMaskHistory.prototype.forward = function () {
        this.position += 1;
        this.enableUndo();
        if (this.position + 1 >= this.entries.length) {
            this.disableRedo();
        }
        return this.entries[this.position];
    };

    /**
     * Go one step back in this history.
     *
     * @return {Function} the callback to be applied for this history entry.
     */
    WMaskHistory.prototype.backward = function () {
        var entry = this.entries[this.position];
        this.position -= 1;

        this.enableRedo();
        if (this.position === -1) {
            this.disableUndo();
        }
        return entry;
    };


    d.addEventListener('DOMContentLoaded', function () {
        var context, canvas = id('c');
        context = canvas.getContext('2d');
        w.WMask = new WMask(canvas, context);
    });

}(window, document));
