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

    var Mask = w.Mask || {}, getPixel, at, swap;

    /**
     * Return an RGBA object for the pixel specified at pos.
     *
     * @param {Array} data
     * @param {Number} pos
     * @return {Object}
     */
    getPixel = function (data, pos) {
        var pixel = {};
        pixel.r = data[pos];
        pixel.g = data[pos + 1];
        pixel.b = data[pos + 2];
        pixel.a = data[pos + 3];
        return pixel;
    };

    /**
     * Get the first index of a pixel as position x, y, given the width.
     *
     * @param {Number} width Width of image
     * @param {Number} x X coordinate
     * @param {Number} y Y coordinate
     * @return {Number}
     */
    at = function (width, x, y) {
        return 4 * ((y * width) + x);
    };

    /**
     * Swap pixel data at two places.
     *
     * @param {Array} data
     * @param {Number} pos1
     * @param {Number} pos2
     */
    swap = function (data, pos1, pos2) {
        var temp;

        temp = [
            data[pos1],
            data[pos1 + 1],
            data[pos1 + 2],
            data[pos1 + 3],
        ];

        data[pos1] = data[pos2];
        data[pos1 + 1] = data[pos2 + 1];
        data[pos1 + 2] = data[pos2 + 2];
        data[pos1 + 3] = data[pos2 + 3];

        data[pos2] = temp[0];
        data[pos2 + 1] = temp[1];
        data[pos2 + 2] = temp[2];
        data[pos2 + 3] = temp[3];
    };


    /**
     * Old XOR function using chunks.
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
                p = getPixel(image.data, i);
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
     * @param {String} direction Either "h" or "v" for horizontal or vertical flips respectively.
     */
    Mask.Flip = function (direction) {
        var newCanvas, newCtx, scaleX, scaleY;

        newCanvas = d.createElement('canvas');
        newCtx = newCanvas.getContext('2d');
        scaleX = direction === 'h' ? -1 : 1;
        scaleY = direction === 'v' ? -1 : 1;

        /**
         * @param {Function} Callback gets passed the processed array of chunks.
         */
        return function (callback) {
            var image = this.getImageData(), dx, dy;

            newCanvas.width = image.width;
            newCanvas.height = image.height;
            newCtx.putImageData(image, 0, 0);

            dx = direction === 'h' ? image.width * -1 : 0;
            dy = direction === 'v' ? image.height * -1 : 0;
            this.ctx.scale(scaleX, scaleY);
            this.ctx.drawImage(newCanvas, dx, dy, image.width, image.height);

            callback(this.getImageData());
        };
    };

    /**
     * Glass blocks mask.
     *
     * Glass blocks split the selection in
     * grid sized strips and flip them individually.
     *
     * @param {String} direction Either "h" or "v" for horizontal or vertical glass blocks respectively.
     */
    Mask.Glass = function (direction) {
        var hglass;

        hglass = direction === 'h';

        /**
         * @param {Function} Callback gets passed the processed array of chunks.
         */
        return function (callback) {
            var image, data, width, height, i, j, k, pos1, pos2;

            image = this.getImageData();
            data = image.data;
            width = image.width;
            height = image.height;

            for (i = 0; i < height; i += hglass ? Mask.GRID_SIZE : 1) {
                for (j = 0; j < width; j += hglass ? 1 : Mask.GRID_SIZE) {
                    for (k = 0; k < Mask.GRID_SIZE / 2; k += 1) {
                        if (hglass) {
                            pos1 = at(width, j, i + k);
                            pos2 = at(width, j, i + ((Mask.GRID_SIZE - 1) - k));
                        } else {
                            pos1 = at(width, j + k, i);
                            pos2 = at(width, j + ((Mask.GRID_SIZE - 1) - k), i);
                        }
                        swap(data, pos1, pos2);
                    }
                }
            }
            callback(image);
        };
    };

    /**
     * Win mask.
     *
     * Scrambles the vertical lines in the selection.
     */
    Mask.Win = function () {
        /**
         * @param {Function} Callback gets passed the processed array of chunks.
         */
        return function (callback) {
            var image, data, width, height, i, j, k, pos1, pos2, xflength;

            image = this.getImageData();
            data = image.data;
            width = image.width;
            height = image.height;

            xflength = Mask.WIN_XFORM.length;

            for (i = 0; i < height; i += 1) {
                for (j = 0; j / Mask.GRID_SIZE_DOUBLE < width / Mask.GRID_SIZE_DOUBLE; j += Mask.GRID_SIZE_DOUBLE) {
                    for (k = 0; k < xflength; k += 1) {
                        pos1 = at(width, j + k, i);
                        pos2 = at(width, j + Mask.WIN_XFORM[k], i);
                        swap(data, pos1, pos2);
                    }
                }
            }
            callback(image);
        };
    };

    Mask.Buttons = {
        'neg': Mask.Xor(Mask.NEG),
        'xor': Mask.Xor(Mask.XOR),
        'rgb': Mask.RGB(),
        'hflip': Mask.Flip('h'),
        'vflip': Mask.Flip('v'),
        'hglass': Mask.Glass('h'),
        'vglass': Mask.Glass('v'),
        'win': Mask.Win(),
    };

    w.Mask = Mask;
}(window, document));
