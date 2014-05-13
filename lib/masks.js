/**
 * masks.js
 *
 * Masks take image data and process them in some way.
 * Simple, right?
 */

/*jslint devel: true, bitwise: true */
/*global Point: true, Rectangle: true, prompt: true */

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
            data[pos1 + 3]
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
     * This mask rotates the specified channels.
     *
     * Will rotate all channels by default.
     * Alpha channel is ignored.
     *
     * @param {Object} channels Channel swap mapping to apply.
     */
    Mask.RGB = function (channels) {
        if (!channels) {
            channels = {
                r: 'b',
                g: 'r',
                b: 'g'
            };
        }

        /**
         * @param {Function} callback Should take the finished imagedata as argument.
         */
        return function (callback) {
            var image, length, i, p;
            image = this.getImageData();
            length = image.data.length;

            for (i = 0; i < length; i += 4) {
                p = getPixel(image.data, i);
                image.data[i] = p[channels.r];
                image.data[i + 1] = p[channels.g];
                image.data[i + 2] = p[channels.b];
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
        var horizontal;

        horizontal = direction === 'h';

        /**
         * @param {Function} callback Should take the finished imagedata as argument.
         */
        return function (callback) {
            var image, data, width, height, i, j, swapPos;

            image = this.getImageData();
            data = image.data;
            width = image.width;
            height = image.height;

            for (i = 0; i < (horizontal ? height : height / 2); i += 1) {
                for (j = 0; j < (horizontal ? width / 2 : width); j += 1) {
                    if (horizontal) {
                        swapPos = at(width, width - j - 1, i);
                    } else {
                        swapPos = at(width, j, height - i - 1);
                    }
                    swap(data, at(width, j, i), swapPos);
                }
            }
            callback(image);
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

            image = this.getImageData(Mask.GRID_SIZE_DOUBLE);
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
        var xform, yform, getSpiral;

        xform = [1, 0, -1, 0];
        yform = [0, -1, 0, 1];

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
                y += yform[xfPos];

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
     * Meko mask.
     *
     * The selection is divided into 16×16 chunks and then scambled.
     *
     * @param {String} direction, either '+' or '-'.
     */
    Mask.Meko = function (direction) {
        var Meko, mekoPlus;

        mekoPlus = direction === '+';

        /**
         * Constructor for a new meko mask.
         */
        Meko = function (width, height) {
            this.width = width;
            this.height = height;
            this.init(width, height);
        };

        /**
         * @type {Array} The meko table for this mask.
         */
        Meko.prototype.table = null;

        /**
         * Initialize the meko table for the given dimensions.
         *
         * @param {Number} width
         * @param {Number} height
         */
        Meko.prototype.init = function (width, height) {
            var area, i;

            this.table = [];
            area = width * height;

            for (i = 0; i < area; i += 1) {
                this.table.push({
                    'n': i,
                    'key': Mask.MEKO_KEY[i]
                });
            }
            this.table.sort(function (a, b) {
                return a.key - b.key;
            });
        };

        /**
         * Get the transformed coordinates.
         *
         * @param {Number} x
         * @param {Number} y
         * @return {Point}
         */
        Meko.prototype.transform = function (x, y) {
            var n, dx, dy;

            n = this.table[y * this.width + x].n;
            dx = n % this.width;
            dy = Math.floor(n / this.width);

            return new Point(dx, dy);
        };

        /**
         * @param {Function} callback Should take the finished imagedata as argument.
         */
        return function (callback) {
            var srcChunks, destChunks, meko, x, y, p, result;

            srcChunks = this.getChunks(Mask.MEKO_CELL_SIZE);
            destChunks = [];

            meko = new Meko(srcChunks[0].length, srcChunks.length);

            for (y = 0; y < meko.height; y += 1) {
                for (x = 0; x < meko.width; x += 1) {
                    p = meko.transform(x, y);
                    if (mekoPlus) {
                        if (!destChunks[y]) {
                            destChunks[y] = [];
                        }
                        destChunks[y][x] = srcChunks[p.y][p.x];
                    } else {
                        if (!destChunks[p.y]) {
                            destChunks[p.y] = [];
                        }
                        destChunks[p.y][p.x] = srcChunks[y][x];
                    }
                }
            }

            result = this.putChunks(destChunks, Mask.MEKO_CELL_SIZE);
            callback(result,
                result.width - (result.width % Mask.MEKO_CELL_SIZE),
                result.height - (result.height % Mask.MEKO_CELL_SIZE));
        };
    };

    /**
     * CP Mask uses some sort of password protection to mask an image.
     *
     * @param {String} code The password to use.
     */
    Mask.CP = function (code) {
        var CP, rot;

        /**
         * Constructor
         */
        CP = function () {
            this.code = code;
        };

        /**
         * Charcode of upper case 'A'.
         */
        CP.CHARCODE_A = 'A'.charCodeAt(0);

        /**
         * Transform table to use.
         */
        CP.prototype.cpTable = [];

        /**
         * Initialize the CP transformation table.
         *
         * @param {Number} width Number of blocks in X direction
         * @param {Number} height Number of blocks in Y direction
         */
        CP.prototype.init = function (width, height) {
            var cells, i, j, table, x, y, len;

            this.width = width;
            this.height = height;
            cells = width * height;
            table = [];
            len = this.code.length;

            for (i = 0; i < cells; i += 1) {
                table[i] = -1;
                this.cpTable[i] = {
                    pair: i,
                    flag: false
                };
            }

            x = cells - 1;
            y = len + cells % len;

            for (i = 0; i < cells; i += 1) {
                x = Mask.CP_KEY[this.code.charCodeAt(i % len) - CP.CHARCODE_A] + x + y;

                if (x >= cells) {
                    x %= cells;
                }

                while (table[x] !== -1) {
                    if (i & 1) {
                        if (x === 0) {
                            x = cells;
                        }
                        x -= 1;
                    } else {
                        x += 1;
                        if (x >= cells) {
                            x = 0;
                        }
                    }
                }

                table[x] = i;
                y += 1;
            }

            for (i = 0, j = cells - 1; i < j; i += 1, j -= 1) {
                this.cpTable[table[i]].pair = table[j];
                this.cpTable[table[j]].pair = table[i];

                if ((table[i] ^ table[j]) & 0x01) {
                    this.cpTable[table[i]].flag = true;
                    this.cpTable[table[j]].flag = true;
                }
            }
        };

        /**
         * Get the transformed coordinates.
         *
         * @param {Number} x
         * @param {Number} y
         * @return [{Point}, {Boolean}]
         */
        CP.prototype.transform = function (x, y) {
            var src, dest, dx, dy;

            src = y * this.width + x;
            dest = this.cpTable[src].pair;

            dx = dest % this.width;
            dy = Math.floor(dest / this.width);

            return [new Point(dx, dy), this.cpTable[src].flag];
        };

        /**
         * "Rotate" a chunk by swapping the X and Y pixel coordinates.
         *
         * @param {ImageData} chunk
         * @return {ImageData}
         */
        rot = function (chunk) {
            var size = chunk.width, x, y;
            if (size !== chunk.height) {
                console.error('Cannot rotate non-square chunk.');
                return;
            }

            for (y = 0; y < size; y += 1) {
                for (x = 0; x < size; x += 1) {
                    if (x > y) {
                        swap(chunk.data, at(size, x, y), at(size, y, x));
                    }
                }
            }
            return chunk;
        };

        /**
         * @param {Function} callback Should take the finished imagedata as argument.
         */
        return function (callback) {
            var chunks, destChunks, cp, x, y, transform, p, rotate;

            cp = new CP();

            if (cp.code === null) {
                console.info('CP mask canceled.');
                return;
            }

            chunks = this.getChunks(Mask.CP_CELL_SIZE);
            cp.init(chunks[0].length, chunks.length);

            destChunks = [];
            for (y = 0; y < cp.height; y += 1) {
                for (x = 0; x < cp.width; x += 1) {
                    transform = cp.transform(x, y);
                    p = transform[0];
                    rotate = transform[1];

                    if (!destChunks[y]) {
                        destChunks[y] = [];
                    }

                    if (rotate) {
                        destChunks[y][x] = rot(chunks[p.y][p.x]);
                    } else {
                        destChunks[y][x] = chunks[p.y][p.x];
                    }
                }
            }

            callback(this.putChunks(destChunks, Mask.CP_CELL_SIZE));
        };
    };

    /**
     * Get a valid code for the CP mask.
     * Returns null if user cancels input.
     *
     * @return {String}
     */
    Mask.CP.getCode = function () {
        var input, CODE_RE;

        CODE_RE = new RegExp('^[a-z ]{1,' + Mask.CP_CODE_MAX_LENGTH + '}$', 'i');

        do {
            input = prompt('CP code');
        } while (input !== null && !CODE_RE.test(input));

        if (input === null) {
            return input;
        }
        return input.replace(' ', '').toUpperCase();
    };

    /**
     * Chain some masks together.
     *
     * @param {Array} masks List of mask functions.
     * @return {Function} new mask function that will apply all masks in order.
     */
    Mask.Chain = function (masks) {
        var applyNextMask;

        /**
         * @param {Function} callback
         * @param {Number} which mask to apply now.
         * @param {ImageData} imagedata Processed image data as returned by the previous mask.
         */
        applyNextMask = function (callback, num, imagedata) {
            var nextCallback;

            if (imagedata) {
                this.ctx.putImageData(imagedata, 0, 0);
            }

            if (num + 1 === masks.length) {
                nextCallback = callback;
            } else {
                nextCallback = applyNextMask.bind(this, callback, num + 1);
            }
            imagedata = masks[num].call(this, nextCallback);
        };

        /**
         * @param {Function} callback Should take the finished imagedata as argument.
         */
        return function (callback) {
            applyNextMask.call(this, callback, 0);
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
        'mekom': Mask.Chain([Mask.Xor(Mask.NEG), Mask.Meko('-')]),
        'mekop': Mask.Chain([Mask.Xor(Mask.NEG), Mask.Meko('+')]),
        'fl': Mask.Chain([Mask.Xor(Mask.NEG), Mask.FL()]),
        'q0': Mask.Chain([Mask.Xor(Mask.NEG), Mask.Glass('v'), Mask.Glass('h')]),
        'cp': function (code) {
            return Mask.Chain([Mask.Xor(Mask.NEG), Mask.RGB({r: 'g', g: 'r', b: 'b'}), Mask.CP(code)]);
        }
    };

    /**
     * Reverse actions.
     */
    Mask.ReverseActions = {
        'neg': Mask.Actions.neg,
        'xor': Mask.Actions.xor,
        'rgb': Mask.RGB({r: 'g', g: 'b', b: 'r'}),
        'hflip': Mask.Actions.hflip,
        'vflip': Mask.Actions.vflip,
        'hglass': Mask.Actions.hglass,
        'vglass': Mask.Actions.vglass,
        'win': Mask.Actions.win,
        'mekom': Mask.Actions.mekop,
        'mekop': Mask.Actions.mekom,
        'fl': Mask.Actions.fl,
        'q0': Mask.Actions.q0,
        'cp': Mask.Actions.cp
    };

    w.Mask = Mask;
}(window, document));
