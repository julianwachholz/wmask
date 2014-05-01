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
     * GMask grid sizes in pixel.
     */
    Mask.GRID_SIZE = 8;
    Mask.GRID_SIZE_DOUBLE = 16;


    /**
     * Chunk the provided image data into 8×8px chunks.
     *
     * @param {Function} maskFunc The Mask to use.
     * @param {Rectangle} selection Selection size.
     * @param {CanvasRenderingContext2D} ctx 2D canvas context to get image data.
     */
    Mask.Mask = function (maskFunc, selection, ctx) {
        this.maskFunc = maskFunc;
        this.ctx = ctx;
        this.selection = selection;
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
     * @type {Rectangle}
     */
    Mask.Mask.prototype.selection = null;

    /**
     * Split up the selection into chunks of gridSize.
     *
     * TODO: leave out parts of the selection that do not fit within the grid.
     *
     * @param {Number} gridSize
     * @return {ImageData[]}
     */
    Mask.Mask.prototype.getChunks = function (gridSize) {
        var chunks, x, y, xs, ys;

        xs = this.selection.w / gridSize;
        ys = this.selection.h / gridSize;
        chunks = [];

        for (y = 0; y < ys; y += 1) {
            for (x = 0; x < xs; x += 1) {
                chunks.push(this.ctx.getImageData(x * gridSize, y * gridSize, gridSize, gridSize));
            }
        }
        return chunks;
    };

    /**
     * Put the chunks back together onto the drawing context.
     *
     * @param {ImageData[]} chunks Processed ImageData chunks.
     * @param {Number} gridSize
     * @param {Function} callback Function to call with the put together imagedata.
     */
    Mask.Mask.prototype.putChunks = function (chunks, gridSize, callback) {
        var x, y, xs, chunkLen;
        chunkLen = chunks.length;
        xs = this.selection.w / gridSize;

        chunks.forEach(function (chunk, i) {
            x = i % xs;
            y = Math.floor(i / xs);
            this.ctx.putImageData(chunk, x * gridSize, y * gridSize);

            if (i + 1 === chunkLen) {
                callback(this.getImageData());
            }
        }, this);
    };

    /**
     * Get the current complete image data.
     *
     * @return {ImageData}
     */
    Mask.Mask.prototype.getImageData = function () {
        return this.ctx.getImageData(0, 0, this.selection.w, this.selection.h);
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
