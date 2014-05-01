/**
 * filters.js
 *
 * Filters take image data and return image data.
 * Simple, right?
 */

/*jslint devel: true, todo: true */
/*global Point: true, Rectangle: true */

(function (w) {
    "use strict";

    var Filter, Filters = {};

    /**
     * Chunk the provided image data into 8×8px chunks.
     *
     * @param {Function} filterFunc The filter method to use.
     * @param {Number} gridSize The grid size in pixels.
     * @param {Rectangle} selection Selection size.
     * @param {CanvasRenderingContext2D} ctx 2D canvas context to get image data.
     */
    Filter = function (filterFunc, gridSize, selection, ctx) {
        var x, y, xs, ys;

        this.filterFunc = filterFunc;
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
    Filter.prototype.filterFunc = null;

    /**
     * @type {CanvasRenderingContext2D}
     */
    Filter.prototype.ctx = null;

    /**
     * @type {Number}
     */
    Filter.prototype.gridSize = 0;

    /**
     * @type {Rectangle}
     */
    Filter.prototype.selection = null;

    /**
     * @type {Number}
     */
    Filter.prototype.chunkLen = 0;

    /**
     * @type {ImageData[]}
     */
    Filter.prototype.chunks = null;

    /**
     * @type {ImageData[]}
     */
    Filter.prototype.filteredChunks = null;

    /**
     * Apply the filter function.
     *
     * @param {Function} callback
     */
    Filter.prototype.applyFilter = function (callback) {
        this.filterFunc(this.chunks, this.draw.bind(this, callback));
    };

    /**
     * Draw the filtered chunks to a canvas.
     *
     * @param {Function} callback Called when we're done drawing all chunks.
     * @param {ImageData[]} Filtered imagedata chunks.
     */
    Filter.prototype.draw = function (callback, filteredChunks) {
        var x, y, xs, ys;
        xs = this.selection.w / this.gridSize;
        ys = this.selection.h / this.gridSize;

        filteredChunks.forEach(function (chunk, i) {
            x = i % xs;
            y = Math.floor(i / xs);
            this.ctx.putImageData(chunk, x * this.gridSize, y * this.gridSize);

            if (i + 1 === this.chunkLen) {
                callback(this.getFilteredImageData());
            }
        }, this);
    };

    /**
     * Get the finished and filtered image data.
     *
     * @return {ImageData}
     */
    Filter.prototype.getFilteredImageData = function () {
        return this.ctx.getImageData(0, 0, this.selection.w, this.selection.h);
    };

    /**
     * Noop filter.
     *
     * @param {ImageData[]} Array of imagedata chunks that need to be filtered.
     * @param {Function} Callback gets passed the filtered array of chunks.
     */
    Filters.Noop = function (chunks, callback) {
        callback(chunks);
    };

    /**
     * Negate filter.
     *
     * @param {ImageData[]} Array of imagedata chunks that need to be filtered.
     * @param {Function} Callback gets passed the filtered array of chunks.
     */
    Filters.Negate = function (chunks, callback) {
        var chunkLength, filteredChunks = [];
        chunkLength = chunks.length;

        chunks.forEach(function (chunk, chunkIndex) {
            var i, count = chunk.data.length;
            for (i = 0; i < count; i += 1) {
                if ((i + 1) % 4 !== 0) {
                    chunk.data[i] = 255 - chunk.data[i];
                }
            }
            filteredChunks.push(chunk);

            if (chunkIndex + 1 === chunkLength) {
                callback(filteredChunks);
            }
        });
    };

    w.Filter = Filter;
    w.Filters = Filters;

}(window));
