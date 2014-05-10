/**
 * mask.js
 *
 * Contains the bootstrap code that all masks require.
 */

/*jslint devel: true, todo: true */
/*global Point: true, Rectangle: true */

(function (w) {
    "use strict";

    var Mask = w.Mask || {};

    /**
     * Chunk the provided image data into 8×8px chunks.
     *
     * @param {Function} maskFunc The Mask to use.
     * @param {Number} width Mask width.
     * @param {Number} height Mask height.
     * @param {CanvasRenderingContext2D} ctx 2D canvas context to get image data.
     */
    Mask.Mask = function (maskFunc, width, height, ctx) {
        this.maskFunc = maskFunc;
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    };

    /**
     * @type {Function}
     */
    Mask.Mask.prototype.maskFunc = null;

    /**
     * @type {CanvasRenderingContext2D}
     */
    Mask.Mask.prototype.ctx = null;

    /**
     * @type {Number}
     */
    Mask.Mask.prototype.width = null;

    /**
     * @type {Number}
     */
    Mask.Mask.prototype.height = null;

    /**
     * Split up the selection into chunks of gridSize.
     * Returns a two dimensional array consisting of data[y][x] imagedata.
     *
     * TODO: leave out parts of the selection that do not fit within the grid.
     *
     * @param {Number} gridSize
     * @return {ImageData[][]}
     */
    Mask.Mask.prototype.getChunks = function (gridSize) {
        var chunks, x, y, xs, ys;

        xs = Math.floor(this.width / gridSize);
        ys = Math.floor(this.height / gridSize);
        chunks = [];

        for (y = 0; y < ys; y += 1) {
            chunks[y] = [];
            for (x = 0; x < xs; x += 1) {
                chunks[y][x] = this.ctx.getImageData(x * gridSize, y * gridSize, gridSize, gridSize);
            }
        }
        return chunks;
    };

    /**
     * Put the chunks back together onto the drawing context.
     *
     * @param {ImageData[][]} chunks Processed ImageData chunks.
     * @param {Number} gridSize
     * @return ImageData the completed imagedata glued back together.
     */
    Mask.Mask.prototype.putChunks = function (chunks, gridSize) {
        var x, y, xs, ys;
        ys = chunks.length;
        xs = chunks[0].length;

        for (y = 0; y < ys; y += 1) {
            for (x = 0; x < xs; x += 1) {
                this.ctx.putImageData(chunks[y][x], x * gridSize, y * gridSize);
            }
        }
        return this.getImageData();
    };

    /**
     * Get the current complete image data.
     *
     * @param {Number} gridSize Limit selection width to a multiple of the grid.
     * @return {ImageData}
     */
    Mask.Mask.prototype.getImageData = function (gridSize) {
        var width, halfGrid;

        if (!!gridSize) {
            halfGrid = gridSize / 2;
            width = this.width % gridSize;
            this.width += width > halfGrid ? gridSize - width : -width;
        }
        return this.ctx.getImageData(0, 0, this.width, this.height);
    };

    /**
     * Apply the mask.
     *
     * @param {Function} callback Function that gets passed the complete processed imagedata.
     */
    Mask.Mask.prototype.applyMask = function (callback) {
        this.maskFunc(callback);
    };

    w.Mask = Mask;
}(window));
