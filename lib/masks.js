/**
 * masks.js
 *
 * Masks take image data and process them in some way.
 * Simple, right?
 */

/*jslint bitwise: true, todo: true */
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
     * Xor mask XORs image data with a value from 0x00 to 0xff.
     *
     * @param {Number} mask XOR mask to use.
     */
    Mask.Xor = function (mask) {
        /**
         * @param {Function} callback Should take the finished imagedata as argument.
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
         * @param {Function} callback Should take the finished imagedata as argument.
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
         * @param {Function} callback Should take the finished imagedata as argument.
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
         * @param {Function} callback Should take the finished imagedata as argument.
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
         * @param {Function} callback Should take the finished imagedata as argument.
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

    /**
     * FL mask.
     *
     * Beginning at the bottom left corner of the selection, the FL
     * Mask divides the region into a counterclockwise spiral of
     * 8×8 blocks that continues to the center of the image.
     *
     * The order is then simply reversed.
     */
    Mask.FL = function () {
        var xform, getSpiral;

        xform = [1, 0, -1, 0, 0, -1, 0, 1];

        /**
         * Get a list of coordinates in a grid, forming a spiral starting on
         * the bottom left and going counterclockwise.
         */
        getSpiral = function (width, height) {
            var total, min, max, x, y, xfPos, i, spiral;

            total = width * height;
            min = {x: 0, y: 0};
            max = {x: width - 1, y: height - 2};
            x = 0;
            y = height - 1;
            xfPos = 0;

            spiral = [];
            for (i = 0; i < total; i += 1) {
                spiral.push({x: x, y: y});

                x += xform[xfPos];
                y += xform[xfPos + 4];

                if (y === min.y && xfPos === 1) {
                    min.y += 1;
                    xfPos += 1;
                }
                if (x === min.x && xfPos === 2) {
                    min.x += 1;
                    xfPos += 1;
                }
                if (y === max.y && xfPos === 3) {
                    max.y -= 1;
                    xfPos = 0;
                }
                if (x === max.x && xfPos === 0) {
                    max.x -= 1;
                    xfPos += 1;
                }
            }

            return spiral;
        };

        /**
         * @param {Function} callback Should take the finished imagedata as argument.
         */
        return function (callback) {
            var chunks, spiral, length, i, temp;
            chunks = this.getChunks(Mask.GRID_SIZE);

            spiral = getSpiral(chunks[0].length, chunks.length);
            length = spiral.length;

            for (i = 0; i < length / 2; i += 1) {
                temp = chunks[spiral[i].y][spiral[i].x];
                chunks[spiral[i].y][spiral[i].x] = chunks[spiral[length - i - 1].y][spiral[length - i - 1].x];
                chunks[spiral[length - i - 1].y][spiral[length - i - 1].x] = temp;
            }

            callback(this.putChunks(chunks, Mask.GRID_SIZE));
        };
    };

    /**
     * Mask actions that may be used on an image.
     */
    Mask.Actions = {
        'neg': Mask.Xor(Mask.NEG),
        'xor': Mask.Xor(Mask.XOR),
        'rgb': Mask.RGB(),
        'hflip': Mask.Flip('h'),
        'vflip': Mask.Flip('v'),
        'hglass': Mask.Glass('h'),
        'vglass': Mask.Glass('v'),
        'win': Mask.Win(),
        'fl': Mask.FL(),
    };

    w.Mask = Mask;
}(window, document));
