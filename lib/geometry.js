/**
 * geometry.js
 *
 * Geometry helper classes.
 */

/*jslint devel: true, todo: true */

(function (w) {
    "use strict";

    var Point, Rectangle;

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
     * Returns true if this rectangle actually captures some area.
     */
    Rectangle.prototype.hasArea = function () {
        return this.w * this.h > 0;
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

    w.Point = Point;
    w.Rectangle = Rectangle;

}(window));
