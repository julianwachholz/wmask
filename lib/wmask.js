/**
 * wmask.js
 *
 * Web based image masking application.
 */

/*jslint devel: true, todo: true */
/*global Point: true, Rectangle: true, Mask: true,
         requestAnimationFrame: true, Event: true, FileReader: true
*/

(function (w, d) {
    "use strict";

    var WMask, id;

    id = document.getElementById.bind(document);

    /**
     * WMask application
     */
    WMask = function (canvas, context) {
        this.canvas = canvas;
        this.ctx = context;
        this.startscreen();
        this.acceptImage();
    };

    /**
     * @type {CanvasRenderingContext2D}
     */
    WMask.prototype.ctx = null;

    /**
     * @type {Number}
     */
    WMask.prototype.width = 800;

    /**
     * @type {Number}
     */
    WMask.prototype.height = 600;

    /**
     * @type {Image}
     */
    WMask.prototype.image = null;

    /**
     * @type {Canvas}
     */
    WMask.prototype.imageCanvas = null;

    /**
     * @type {CanvasRenderingContext2D}
     */
    WMask.prototype.imageCtx = null;

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
    //WMask.prototype.history = null;

    /**
     * Show a prompt to load an image.
     */
    WMask.prototype.startscreen = function () {
        this.ctx.fillStyle = '#ccc';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 30px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Drag image here.', this.width / 2, this.height / 2);
    };

    /**
     * Setup the canvas to accept loading an image via drag'n'drop.
     */
    WMask.prototype.acceptImage = function () {
        var img;

        img = new Image();
        img.crossOrigin = 'anonymous';
        img.addEventListener('load', this.startEditor.bind(this, img));

        img.addEventListener('error', function () {
            var cw, ch;
            this.ctx.fillStyle = '#ccc';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.font = 'bold 30px sans-serif';
            this.ctx.fillStyle = '#f33';
            cw = this.width / 2;
            ch = this.height / 2;
            this.ctx.fillText('Failed loading image, please try again.', cw, ch);
            this.ctx.font = 'normal 20px sans-serif';
            this.ctx.fillText('The server probably does not allow cross-origin requests to this image.', cw, ch + 50);
        }.bind(this));

        this.canvas.addEventListener('dragover', function (event) {
            event.preventDefault();
        }, false);

        this.canvas.addEventListener('drop', function (event) {
            var reader, type, tx = event.dataTransfer;
            event.preventDefault();

            if (tx.items.length < 1) {
                console.info('Nothing dropped.');
                return;
            }

            type = tx.items[0].type;

            if (type === 'text/uri-list') {
                img.src = tx.getData('text/uri-list');
            } else if (type.indexOf('image') !== -1) {
                reader = new FileReader();
                reader.addEventListener('load', function (event) {
                    img.removeAttribute('crossorigin');
                    img.src = event.target.result;
                });
                reader.readAsDataURL(tx.files[0]);
            }
        }, false);
    };

    /**
     * Once we have an image loaded we'll start the editor.
     *
     * @param {Image} img The actual image we're going to work with.
     */
    WMask.prototype.startEditor = function (img) {
        this.setImage(img);
        this.addEventListeners();
        this.initMenu();
        this.draw();
    };

    /**
     * Set the image to work on.
     *
     * @param {Image} img
     */
    WMask.prototype.setImage = function (img) {
        this.image = img;

        this.width = img.width;
        this.height = img.height;
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.canvas.style.cursor = 'none';
        this.canvas.style.margin = '-' + (img.height / 2) + 'px 0 0 -' + (img.width / 2) + 'px';

        this.imageCanvas = d.createElement('canvas');
        this.imageCanvas.width = img.width;
        this.imageCanvas.height = img.height;
        this.imageCtx = this.imageCanvas.getContext('2d');
        this.imageCtx.drawImage(img, 0, 0);
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
     * Setup Mask buttons.
     *
     * TODO add keyboard event listeners for quick actions
     */
    WMask.prototype.initMenu = function () {
        var buttons = [], mask;
        id('menu').style.display = 'block';

        for (mask in Mask.Actions) {
            if (Mask.Actions.hasOwnProperty(mask)) {
                id('mask-' + mask).addEventListener('click', this.applyMask.bind(this, Mask.Actions[mask]));
                buttons.push(id('mask-' + mask));
            }
        }

        this.canvas.addEventListener('selectionEnd', function () {
            buttons.forEach(function (button) {
                button.disabled = false;
            });
        });
        this.canvas.addEventListener('selectionClear', function () {
            buttons.forEach(function (button) {
                button.disabled = true;
            });
        });
    };

    /**
     * Apply a mask to the current selection.
     *
     * @param {Function} maskFunc
     */
    WMask.prototype.applyMask = function (maskFunc) {
        var canvas = document.createElement('canvas'), context, mask;

        canvas.width = this.selection.w;
        canvas.height = this.selection.h;
        context = canvas.getContext('2d');
        context.drawImage(this.imageCanvas, this.selection.x, this.selection.y, this.selection.w, this.selection.h, 0, 0, this.selection.w, this.selection.h);

        // TODO put history entry origin
        mask = new Mask.Mask(maskFunc, this.selection, context);
        mask.applyMask(function (imageData, w, h) {
            // TODO put history entry outcome
            if (w && h) {
                this.imageCtx.putImageData(imageData, this.selection.x, this.selection.y, 0, 0, w, h);
            } else {
                this.imageCtx.putImageData(imageData, this.selection.x, this.selection.y);
            }
        }.bind(this));
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
        this.canvas.dispatchEvent(new Event(trigger));
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
        var that = this, draw;

        draw = function () {
            that.ctx.drawImage(that.imageCanvas, 0, 0);
            that.drawCursor();
            that.drawSelection();
            requestAnimationFrame(draw);
        };
        draw();
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

    d.addEventListener('DOMContentLoaded', function () {
        var context, canvas = id('c');
        context = canvas.getContext('2d');
        w.WMask = new WMask(canvas, context);
    });

}(window, document));
