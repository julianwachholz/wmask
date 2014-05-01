/**
 * masks.js
 *
 * Masks take image data and process them in some way.
 * Simple, right?
 */

/*jslint devel: true, todo: true */
/*global Point: true, Rectangle: true */

(function (w) {
    "use strict";

    var Mask, Masks = {};

    /**
     * Chunk the provided image data into 8×8px chunks.
     *
     * @param {Function} maskFunc The Mask to use.
     * @param {Number} gridSize The grid size in pixels.
     * @param {Rectangle} selection Selection size.
     * @param {CanvasRenderingContext2D} ctx 2D canvas context to get image data.
     */
    Mask = function (maskFunc, gridSize, selection, ctx) {
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
    Mask.prototype.maskFunc = null;

    /**
     * @type {CanvasRenderingContext2D}
     */
    Mask.prototype.ctx = null;

    /**
     * @type {Number}
     */
    Mask.prototype.gridSize = 0;

    /**
     * @type {Rectangle}
     */
    Mask.prototype.selection = null;

    /**
     * @type {Number}
     */
    Mask.prototype.chunkLen = 0;

    /**
     * @type {ImageData[]}
     */
    Mask.prototype.chunks = null;

    /**
     * @type {ImageData[]}
     */
    Mask.prototype.processedChunks = null;

    /**
     * Apply the mask.
     *
     * @param {Function} callback
     */
    Mask.prototype.applyMask = function (callback) {
        this.maskFunc(this.chunks, this.draw.bind(this, callback));
    };

    /**
     * Put the processed chunks back together in one canvas.
     *
     * @param {Function} callback Called when we're done drawing all chunks.
     * @param {ImageData[]} processedChunks Processed imagedata chunks.
     */
    Mask.prototype.draw = function (callback, processedChunks) {
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

    /**
     * Noop mask.
     *
     * @param {ImageData[]} Array of imagedata chunks that need to be masked.
     * @param {Function} Callback gets passed the processed array of chunks.
     */
    Masks.Noop = function (chunks, callback) {
        callback(chunks);
    };

    /**
     * Negate mask.
     *
     * @param {ImageData[]} Array of imagedata chunks that need to be masked.
     * @param {Function} Callback gets passed the processed array of chunks.
     */
    Masks.Neg = function (chunks, callback) {
        var chunkLength, processedChunks = [];
        chunkLength = chunks.length;

        chunks.forEach(function (chunk, chunkIndex) {
            var i, count = chunk.data.length;
            for (i = 0; i < count; i += 1) {
                if ((i + 1) % 4 !== 0) {
                    chunk.data[i] = 255 - chunk.data[i];
                }
            }
            processedChunks.push(chunk);

            if (chunkIndex + 1 === chunkLength) {
                callback(processedChunks);
            }
        });
    };

    w.Mask = Mask;
    w.Masks = Masks;

}(window));
