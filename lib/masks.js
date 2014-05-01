/**
 * masks.js
 *
 * Masks take image data and process them in some way.
 * Simple, right?
 */

/*jslint bitwise: true, devel: true, todo: true */
/*global Point: true, Rectangle: true */

(function (w, d) {
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
     * Legacy XOR function using chunks.
     */
    Mask.OldXor = function (mask) {
        if (mask < 0x00 || mask > 0xff) {
            throw new Error('Xor Mask expects argument between 0x00 and 0xff, got %x instead.', mask);
        }

        /**
         * @param {Function} callback gets passed the processed array of chunks.
         */
        return function (callback) {
            var chunks, chunkLength, processedChunks = [];
            chunks = this.getChunks(Mask.GRID_SIZE);
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
                    this.putChunks(processedChunks, Mask.GRID_SIZE, callback);
                }
            }.bind(this));
        };
    };

    /**
     * Xor mask XORs image data with a value from 0x00 to 0xff.
     *
     * @param {Number} mask XOR mask to use.
     */
    Mask.Xor = function (mask) {
        if (mask < 0x00 || mask > 0xff) {
            throw new Error('Xor Mask expects argument between 0x00 and 0xff, got 0x' + mask.toString(16) + ' instead.');
        }

        /**
         * @param {Function} Callback gets passed the processed array of chunks.
         */
        return function (callback) {
            var image, length, i;
            image = this.getImageData();
            length = image.data.length;

            for (i = 0; i < length; i += 4) {
                image.data[i] ^= mask;
                image.data[i + 1] ^= mask;
                image.data[i + 2] ^= mask;
            }

            callback(image);
        };
    };

    /**
     * This mask rotates the RGB channels.
     */
    Mask.RGB = function () {
        /**
         * @param {Function} Callback gets passed the processed array of chunks.
         */
        return function (callback) {
            var image, length, i, p;
            image = this.getImageData();
            length = image.data.length;

            for (i = 0; i < length; i += 4) {
                p = rgba(image.data, i);
                image.data[i] = p.b;
                image.data[i + 1] = p.r;
                image.data[i + 2] = p.g;
            }

            callback(image);
        };
    };

    /**
     * Flip the selection horizontally or vertically.
     *
     * @param {Bool} flipH Horizontal flip?
     * @param {Bool} flipH Vertical flip?
     */
    Mask.Flip = function (flipH, flipV) {
        var newCanvas, newCtx, scaleX, scaleY;

        newCanvas = d.createElement('canvas');
        newCtx = newCanvas.getContext('2d');
        scaleX = flipH ? -1 : 1;
        scaleY = flipV ? -1 : 1;

        /**
         * @param {Function} Callback gets passed the processed array of chunks.
         */
        return function (callback) {
            var image = this.getImageData(), dx, dy;

            newCanvas.width = image.width;
            newCanvas.height = image.height;
            newCtx.putImageData(image, 0, 0);

            dx = flipH ? image.width * -1 : 0;
            dy = flipV ? image.height * -1 : 0;
            this.ctx.scale(scaleX, scaleY);
            this.ctx.drawImage(newCanvas, dx, dy, image.width, image.height);

            callback(this.getImageData());
        };
    };


    Mask.Buttons = {
        'neg': Mask.Xor(0xff),
        'xor': Mask.Xor(0x80),
        'rgb': Mask.RGB(),
        'hflip': Mask.Flip(true, false),
        'vflip': Mask.Flip(false, true),
    };

    w.Mask = Mask;
}(window, document));
