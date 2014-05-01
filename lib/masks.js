/**
 * masks.js
 *
 * Masks take image data and process them in some way.
 * Simple, right?
 */

/*jslint bitwise: true, devel: true, todo: true */
/*global Point: true, Rectangle: true */

(function (w) {
    "use strict";

    var Mask = {}, rgba;

    /**
     * Return an RGBA object for the pixel specified at index.
     *
     * @param {ImageData} chunk
     * @param {Number} index
     * @return {Object}
     */
    rgba = function (chunk, index) {
        var pixel = {};
        pixel.r = chunk[index];
        pixel.g = chunk[index + 1];
        pixel.b = chunk[index + 2];
        pixel.a = chunk[index + 3];
        return pixel;
    };


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

    /**
     * Dummy no-op mask.
     */
    Mask.Noop = function () {
        /**
         * @param {ImageData[]} Array of imagedata chunks that need to be masked.
         * @param {Function} Callback gets passed the processed array of chunks.
         */
        return function (chunks, callback) {
            callback(chunks);
        };
    };

    /**
     * Xor mask XORs image data with a value from 0x00 to 0xff.
     *
     * @param {Number} mask XOR mask to use.
     */
    Mask.Xor = function (mask) {
        if (mask < 0x00 || mask > 0xff) {
            throw new Error('Xor Mask expects argument between 0x00 and 0xff, got %x instead.', mask);
        }

        return function (chunks, callback) {
            var chunkLength, processedChunks = [];
            chunkLength = chunks.length;

            chunks.forEach(function (chunk, chunkIndex) {
                var i, count = chunk.data.length;
                for (i = 0; i < count; i += 4) {
                    chunk.data[i] ^= mask;
                    chunk.data[i + 1] ^= mask;
                    chunk.data[i + 2] ^= mask;
                }
                processedChunks.push(chunk);

                if (chunkIndex + 1 === chunkLength) {
                    callback(processedChunks);
                }
            });
        };
    };

    /**
     * This mask rotates the RGB channels.
     */
    Mask.RGB = function () {
        return function (chunks, callback) {
            var chunkLength, processedChunks = [];
            chunkLength = chunks.length;

            chunks.forEach(function (chunk, chunkIndex) {
                var count = chunk.data.length, i, p;

                for (i = 0; i < count; i += 4) {
                    p = rgba(chunk.data, i);
                    chunk.data[i] = p.b;
                    chunk.data[i + 1] = p.r;
                    chunk.data[i + 2] = p.g;
                }
                processedChunks.push(chunk);

                if (chunkIndex + 1 === chunkLength) {
                    callback(processedChunks);
                }
            });
        };
    };

    Mask.Buttons = {
        'noop': Mask.Noop(),
        'neg': Mask.Xor(0xff),
        'xor': Mask.Xor(0x80),
        'rgb': Mask.RGB(),
    };

    w.Mask = Mask;

}(window));
