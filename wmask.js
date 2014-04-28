/**
 * wmask.js
 *
 * Web based image masking application.
 */

/*jslint devel: true, todo: true */
/*global requestAnimationFrame: true, FileReader: true */

(function (w, d) {
    "use strict";

    var WMask, Point, Rectangle;

    /**
     * Just a simple point in 2D space.
     *
     * @param {Number} x X-Coordinate
     * @param {Number} y Y-Coordinate
     */
    Point = function (x, y) {
        this.x = x;
        this.y = y;
    };

    /**
     * Compare two points.
     *
     * @return {Boolean}
     */
    Point.prototype.equals = function (other) {
        return this.x === other.x && this.y === other.y;
    };

    Point.prototype.toString = function () {
        return 'Point(' + this.x + ', ' + this.y + ')';
    };


    /**
     * A rectangular selection.
     *
     * @param {Point} topLeft
     * @param {Point} bottomRight
     */
    Rectangle = function (topLeft, bottomRight) {
        this.x = topLeft.x;
        this.y = topLeft.y;
        this.w = bottomRight.x - topLeft.x;
        this.h = bottomRight.y - topLeft.y;
        this.calcCorners();
    };

    /**
     * Create a Rectangle from two points.
     *
     * @param {Point} p1 First point
     * @param {Point} p2 Second point
     * @return {Rectangle}
     */
    Rectangle.fromPoints = function (p1, p2) {
        var topLeft, bottomRight;

        topLeft = new Point(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
        bottomRight = new Point(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));

        return new Rectangle(topLeft, bottomRight);
    };

    Rectangle.prototype.toString = function () {
        return 'Rectangle(topLeft=' + this.topLeft() + ', bottomRight=' + this.bottomRight() + ')';
    };

    /**
     * Cache and calculate the corners.
     */
    Rectangle.prototype.calcCorners = function () {
        this.tl = new Point(this.x, this.y);
        this.tr = new Point(this.x + this.w, this.y);
        this.br = new Point(this.x + this.w, this.y + this.h);
        this.bl = new Point(this.x, this.y + this.h);
    };

    /**
     * Get the top left position.
     * @return {Point}
     */
    Rectangle.prototype.topLeft = function () {
        return this.tl;
    };

    /**
     * Get the top right position.
     * @return {Point}
     */
    Rectangle.prototype.topRight = function () {
        return this.tr;
    };

    /**
     * Get the bottom right position.
     * @return {Point}
     */
    Rectangle.prototype.bottomRight = function () {
        return this.br;
    };

    /**
     * Get the bottom left position.
     * @return {Point}
     */
    Rectangle.prototype.bottomLeft = function () {
        return this.bl;
    };

    /**
     * Draw the lines of this rectangle on a canvas.
     * Only creates the lines, beginPath etc has to be done outside of this.
     *
     * @param {CanvasRenderingContext2D}
     */
    Rectangle.prototype.drawLines = function (c) {
        var tl, tr, bl, br;
        tl = this.topLeft();
        tr = this.topRight();
        bl = this.bottomLeft();
        br = this.bottomRight();

        c.moveTo(tl.x - 0.5, tl.y - 0.5);
        c.lineTo(tr.x + 0.5, tr.y - 0.5);
        c.lineTo(br.x + 0.5, br.y + 0.5);
        c.lineTo(bl.x - 0.5, bl.y - 0.5);
        c.lineTo(tl.x - 0.5, tl.y - 0.5);
    };


    /**
     * WMask application
     */
    WMask = function (canvas, context) {
        this.canvas = canvas;
        this.c = context;
        this.startscreen();
        this.acceptImage();
    };

    /**
     * {CanvasRenderingContext2D}
     */
    WMask.prototype.c = null;

    /**
     * {Number}
     */
    WMask.prototype.width = 800;

    /**
     * {Number}
     */
    WMask.prototype.height = 600;

    /**
     * {Number}
     */
    WMask.prototype.gridSize = 8;

    /**
     * {Image}
     */
    WMask.prototype.image = null;

    /**
     * {Point}
     */
    WMask.prototype.cursor = null;

    /**
     * {Boolean}
     */
    WMask.prototype.mouseDown = false;


    /**
     * {Point}
     */
    WMask.prototype.selectionStart = null;

    /**
     * {Point}
     */
    WMask.prototype.selectionEnd = null;

    /**
     * {Rectangle}
     */
    WMask.prototype.selection = null;

    /**
     * Once we have an image loaded we'll start the editor.
     *
     * @param {Image} img The actual image we're going to work with.
     */
    WMask.prototype.startEditor = function (img) {
        this.image = img;
        this.addEventListeners();
        this.draw();
    };

    /**
     * Snap a point to the grid.
     *
     * TODO snap to grid relative to a starting point.
     *
     * @param {Point} p
     * @return {Point}
     */
    WMask.prototype.snapToGrid = function (p) {
        var snapped, x0, y0, halfGrid;

        snapped = new Point(p.x, p.y);
        halfGrid = this.gridSize / 2;

        x0 = p.x % this.gridSize;
        snapped.x += x0 > halfGrid ? this.gridSize - x0 : -x0;

        y0 = p.y % this.gridSize;
        snapped.y += y0 > halfGrid ? this.gridSize - y0 : -y0;

        return snapped;
    };

    /**
     * Attach our event listeners.
     *
     * TODO add keyboard event listeners for quick actions
     */
    WMask.prototype.addEventListeners = function () {
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
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
            this.selectionEnd = new Point(event.layerX, event.layerY);
            this.selection = Rectangle.fromPoints(this.selectionStart, this.selectionEnd);
        }
    };

    /**
     * Mouse down handler
     */
    WMask.prototype.onMouseDown = function (event) {
        this.mouseDown = true;
        this.selectionStart = new Point(event.layerX, event.layerY);
    };

    /**
     * Mouse up handler
     */
    WMask.prototype.onMouseUp = function () {
        this.selectionEnd = new Point(event.layerX, event.layerY);
        this.mouseDown = false;

        if (this.selectionStart.equals(this.selectionEnd)) {
            this.selection = null;
        }
    };

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
            that.c.drawImage(that.image, 0, 0);
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

        rgb = this.c.getImageData(x, y, 1, 1).data;
        this.c.strokeStyle = 'rgb(' + (255 - rgb[0]) + ',' + (255 - rgb[1]) + ',' + (255 - rgb[2]) + ')';
        this.c.lineWidth = 1;

        this.c.beginPath();
        this.c.moveTo(x - 4.5, y + 0.5);
        this.c.lineTo(x + 5.5, y + 0.5);
        this.c.moveTo(x + 0.5, y - 4.5);
        this.c.lineTo(x + 0.5, y + 5.5);
        this.c.stroke();
        this.c.closePath();
    };

    /**
     * Draw the current selection.
     */
    WMask.prototype.drawSelection = function () {
        if (!this.selection) {
            return;
        }
        this.c.strokeStyle = 'rgba(255, 0, 0, 0.75)';
        this.c.lineWidth = 1;

        this.c.beginPath();
        this.selection.drawLines(this.c);
        this.c.stroke();
        this.c.closePath();

        document.getElementById('l').innerHTML = this.selection.toString();
    };

    /**
     * Show a prompt to load an image.
     */
    WMask.prototype.startscreen = function () {
        this.c.fillStyle = '#ccc';
        this.c.fillRect(0, 0, this.width, this.height);

        this.c.fillStyle = '#333';
        this.c.font = 'bold 30px sans-serif';
        this.c.textAlign = 'center';
        this.c.fillText('Drag image here.', this.width / 2, this.height / 2);
    };

    /**
     * Setup the canvas to accept loading an image from Drag'n'Drop
     */
    WMask.prototype.acceptImage = function () {
        var that = this, img;

        img = d.createElement('img');
        img.addEventListener('load', function () {
            that.width = img.width;
            that.height = img.height;
            that.canvas.width = img.width;
            that.canvas.height = img.height;
            that.canvas.style.cursor = 'none';
            that.canvas.style.margin = '-' + (img.height / 2) + 'px 0 0 -' + (img.width / 2) + 'px';
            that.startEditor(img);
        });

        this.canvas.addEventListener('dragover', function (event) {
            event.preventDefault();
        }, false);
        this.canvas.addEventListener('drop', function (event) {
            var reader, files = event.dataTransfer.files;
            event.preventDefault();

            if (files.length > 0 && files[0].type.indexOf('image') !== -1) {
                reader = new FileReader();
                reader.addEventListener('load', function (event) {
                    img.src = event.target.result;
                });
                reader.readAsDataURL(files[0]);
            } else {
                alert('Something went wrong.');
            }
        }, false);
    };

    d.addEventListener('DOMContentLoaded', function () {
        var context, canvas = d.getElementById('c');
        context = canvas.getContext('2d');
        w.WMask = new WMask(canvas, context);
    });

}(window, document));
