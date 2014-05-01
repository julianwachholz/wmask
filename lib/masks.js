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

    var Mask = w.Mask || {}, rgba;

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
     * Xor mask XORs image data with a value from 0x00 to 0xff.
     *
     * @param {Number} mask XOR mask to use.
     */
    Mask.Xor = function (mask) {
        if (mask < 0x00 || mask > 0xff) {
            throw new Error('Xor Mask expects argument between 0x00 and 0xff, got %x instead.', mask);
        }

        /**
         * @param {ImageData[]} Array of imagedata chunks that need to be masked.
         * @param {Function} Callback gets passed the processed array of chunks.
         */
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
        /**
         * @param {ImageData[]} Array of imagedata chunks that need to be masked.
         * @param {Function} Callback gets passed the processed array of chunks.
         */
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
        'neg': Mask.Xor(0xff),
        'xor': Mask.Xor(0x80),
        'rgb': Mask.RGB(),
    };

    w.Mask = Mask;
}(window));
