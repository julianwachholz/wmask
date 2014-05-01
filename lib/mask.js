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
     * @param {Number} gridSize The grid size in pixels.
     * @param {Rectangle} selection Selection size.
     * @param {CanvasRenderingContext2D} ctx 2D canvas context to get image data.
     */
    Mask.Mask = function (maskFunc, gridSize, selection, ctx) {
        var x, y, xs, ys;

        this.maskFunc = maskFunc;
        this.ctx = ctx;

        this.gridSize = gridSize;
        this.selection = selection;
        xs = selection.w / gridSize;
        ys = selection.h / gridSize;

        this.chunkLen = xs * ys;
        this.chunks = [];
        for (y = 0; y < ys; y += 1) {
            for (x = 0; x < xs; x += 1) {
                this.chunks.push(ctx.getImageData(x * gridSize, y * gridSize, gridSize, gridSize));
            }
        }
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
    Mask.Mask.prototype.gridSize = 0;

    /**
     * @type {Rectangle}
     */
    Mask.Mask.prototype.selection = null;

    /**
     * @type {Number}
     */
    Mask.Mask.prototype.chunkLen = 0;

    /**
     * @type {ImageData[]}
     */
    Mask.Mask.prototype.chunks = null;

    /**
     * @type {ImageData[]}
     */
    Mask.Mask.prototype.processedChunks = null;

    /**
     * Apply the mask.
     *
     * @param {Function} callback
     */
    Mask.Mask.prototype.applyMask = function (callback) {
        this.maskFunc(this.chunks, this.draw.bind(this, callback));
    };

    /**
     * Put the processed chunks back together in one canvas.
     *
     * @param {Function} callback Called when we're done drawing all chunks.
     * @param {ImageData[]} processedChunks Processed imagedata chunks.
     */
    Mask.Mask.prototype.draw = function (callback, processedChunks) {
        var x, y, xs;
        xs = this.selection.w / this.gridSize;

        processedChunks.forEach(function (chunk, i) {
            x = i % xs;
            y = Math.floor(i / xs);
            this.ctx.putImageData(chunk, x * this.gridSize, y * this.gridSize);

            if (i + 1 === this.chunkLen) {
                callback(this.ctx.getImageData(0, 0, this.selection.w, this.selection.h));
            }
        }, this);
    };

    w.Mask = Mask;
}(window));
