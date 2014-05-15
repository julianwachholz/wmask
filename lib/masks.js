/**
 * masks.js
 *
 * Masks take image data and process them in some way.
 * Simple, right?
 */

/*jslint devel: true, bitwise: true */
/*global Point: true, Rectangle: true, Uint8ClampedArray: true, prompt: true */

(function (w) {
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
     * If a full selection is given the coordinates will be offset by the
     * selection's x and y coordinates.
     *
     * @param {Number} width Width of the image data.
     * @param {Number} x X coordinate
     * @param {Number} y Y coordinate
     * @param {Rectangle} selection Selection in the data or just a width.
     * @return {Number}
     */
    at = function (width, x, y, selection) {
        if (!!selection) {
            return 4 * (((y + selection.y) * width) + x + selection.x);
        }
        return 4 * ((y * width) + x);
    };

    /**
     * Swap pixel data at two places.
     *
     * @param {Array} data
     * @param {Number} pos1
     * @param {Number} pos2
     */
    swap = function (data, pos1, pos2, srcData) {
        var temp;

        if (!srcData) {
            srcData = data;
        }

        temp = [
            srcData[pos1],
            srcData[pos1 + 1],
            srcData[pos1 + 2],
            srcData[pos1 + 3]
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
     * @param {Number} xorMask XOR mask to use.
     */
    Mask.Xor = function (xorMask) {
        return function (imageData, selection) {
            var data, x, y, width, pos;
            data = imageData.data;
            width = imageData.width;

            for (x = selection.x; x < selection.x + selection.w; x += 1) {
                for (y = selection.y; y < selection.y + selection.h; y += 1) {
                    pos = at(width, x, y);
                    data[pos] ^= xorMask;
                    data[pos + 1] ^= xorMask;
                    data[pos + 2] ^= xorMask;
                }
            }

            return imageData;
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
        return function (imageData, selection) {
            var data, width, x, y, pos, pixel;
            data = imageData.data;
            width = imageData.width;

            for (x = selection.x; x < selection.x + selection.w; x += 1) {
                for (y = selection.y; y < selection.y + selection.h; y += 1) {
                    pos = at(width, x, y);
                    pixel = getPixel(data, pos);
                    data[pos] = pixel[channels.r];
                    data[pos + 1] = pixel[channels.g];
                    data[pos + 2] = pixel[channels.b];
                }
            }

            return imageData;
        };
    };

    /**
     * Flip the selection horizontally or vertically.
     *
     * @param {String} direction Either "h" or "v" for horizontal or vertical flips respectively.
     */
    Mask.Flip = function (direction) {
        var horizontal = direction === 'h';

        return function (imageData, selection) {
            var data, width, selectionWidth, selectionHeight, x, y, swapPos;
            data = imageData.data;
            width = imageData.width;
            selectionWidth = selection.w;
            selectionHeight = selection.h;

            for (x = 0; x < (horizontal ? selectionWidth / 2 : selectionWidth); x += 1) {
                for (y = 0; y < (horizontal ? selectionHeight : selectionHeight / 2); y += 1) {
                    if (horizontal) {
                        swapPos = at(width, selectionWidth - x - 1, y, selection);
                    } else {
                        swapPos = at(width, x, selectionHeight - y - 1, selection);
                    }
                    swap(data, at(width, x, y, selection), swapPos);
                }
            }

            return imageData;
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
        var horizontal = direction === 'h';

        return function (imageData, selection) {
            var data, width, x, y, k, pos1, pos2;
            data = imageData.data;
            width = imageData.width;

            for (x = 0; x < selection.w; x += horizontal ? 1 : Mask.GRID_SIZE) {
                for (y = 0; y < selection.h; y += horizontal ? Mask.GRID_SIZE : 1) {
                    for (k = 0; k < Mask.GRID_SIZE / 2; k += 1) {
                        if (horizontal) {
                            pos1 = at(width, x, y + k, selection);
                            pos2 = at(width, x, y + ((Mask.GRID_SIZE - 1) - k), selection);
                        } else {
                            pos1 = at(width, x + k, y, selection);
                            pos2 = at(width, x + ((Mask.GRID_SIZE - 1) - k), y, selection);
                        }
                        swap(data, pos1, pos2);
                    }
                }
            }

            return imageData;
        };
    };

    /**
     * Win mask.
     *
     * Scrambles the vertical lines in the selection.
     */
    Mask.Win = function () {
        var xflength = Mask.WIN_XFORM.length;

        return function (imageData, selection) {
            var data, width, x, y, k, pos1, pos2;
            data = imageData.data;
            width = imageData.width;

            for (x = 0; x / Mask.GRID_SIZE_DOUBLE < selection.w / Mask.GRID_SIZE_DOUBLE; x += Mask.GRID_SIZE_DOUBLE) {
                for (y = 0; y < selection.h; y += 1) {
                    for (k = 0; k < xflength; k += 1) {
                        pos1 = at(width, x + k, y, selection);
                        pos2 = at(width, x + Mask.WIN_XFORM[k], y, selection);
                        swap(data, pos1, pos2);
                    }
                }
            }

            return imageData;
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
        getSpiral = function (width, height, blockSize) {
            var total, min, max, x, y, xfPos, i, spiral;

            total = width * height;
            min = {x: 0, y: 0};
            max = {x: width - 1, y: height - 2};
            x = 0;
            y = height - 1;
            xfPos = 0;

            spiral = [];
            for (i = 0; i < total; i += 1) {
                spiral.push({x: x * blockSize, y: y * blockSize});

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

        return function (imageData, selection) {
            var data, width, spiral, length, blocksX, blocksY, i, src, dst, x, y;
            data = imageData.data;
            width = imageData.width;

            blocksX = selection.w / Mask.GRID_SIZE;
            blocksY = selection.h / Mask.GRID_SIZE;
            spiral = getSpiral(blocksX, blocksY, Mask.GRID_SIZE);
            length = spiral.length;

            for (i = 0; i < length / 2; i += 1) {
                src = spiral[i];
                dst = spiral[length - i - 1];

                for (x = 0; x < Mask.GRID_SIZE; x += 1) {
                    for (y = 0; y < Mask.GRID_SIZE; y += 1) {
                        swap(data,
                            at(width, src.x + x, src.y + y, selection),
                            at(width, dst.x + x, dst.y + y, selection));
                    }
                }
            }

            return imageData;
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
        var Meko, mekoPlus = direction === '+';

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

        return function (imageData, selection) {
            var data, srcData, width, meko, blocksX, blocksY, x, y, point, src, dst, xx, yy;
            data = imageData.data;
            width = imageData.width;
            srcData = new Uint8ClampedArray(data);

            blocksX = Math.floor(selection.w / Mask.MEKO_CELL_SIZE);
            blocksY = Math.floor(selection.h / Mask.MEKO_CELL_SIZE);
            meko = new Meko(blocksX, blocksY);

            for (x = 0; x < blocksX; x += 1) {
                for (y = 0; y < blocksY; y += 1) {
                    point = meko.transform(x, y);
                    for (xx = 0; xx < Mask.MEKO_CELL_SIZE; xx += 1) {
                        for (yy = 0; yy < Mask.MEKO_CELL_SIZE; yy += 1) {
                            dst = at(width, xx + x * Mask.MEKO_CELL_SIZE, yy + y * Mask.MEKO_CELL_SIZE, selection);
                            src = at(width, xx + point.x * Mask.MEKO_CELL_SIZE, yy + point.y * Mask.MEKO_CELL_SIZE, selection);

                            if (mekoPlus) {
                                data[dst] = srcData[src];
                                data[dst + 1] = srcData[src + 1];
                                data[dst + 2] = srcData[src + 2];
                                data[dst + 3] = srcData[src + 3];
                            } else {
                                data[src] = srcData[dst];
                                data[src + 1] = srcData[dst + 1];
                                data[src + 2] = srcData[dst + 2];
                                data[src + 3] = srcData[dst + 3];
                            }
                        }
                    }
                }
            }

            return imageData;
        };
    };

    /**
     * CP Mask uses some sort of password protection to mask an image.
     *
     * @param {String} code The password to use.
     */
    Mask.CP = function (code) {
        var CP;

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

        return function (imageData, selection) {
            var data, srcData, width, cp, blocksX, blocksY, x, y, transform, point, rotate, src, dst, xx, yy;

            if (code === null) {
                console.info('CP mask canceled.');
                return;
            }
            data = imageData.data;
            width = imageData.width;
            srcData = new Uint8ClampedArray(data);

            cp = new CP();
            blocksX = Math.floor(selection.w / Mask.CP_CELL_SIZE);
            blocksY = Math.floor(selection.h / Mask.CP_CELL_SIZE);
            cp.init(blocksX, blocksY);

            for (x = 0; x < blocksX; x += 1) {
                for (y = 0; y < blocksY; y += 1) {
                    transform = cp.transform(x, y);
                    point = transform[0];
                    rotate = transform[1];

                    for (xx = 0; xx < Mask.CP_CELL_SIZE; xx += 1) {
                        for (yy = 0; yy < Mask.CP_CELL_SIZE; yy += 1) {
                            dst = at(width, xx + x * Mask.CP_CELL_SIZE, yy + y * Mask.CP_CELL_SIZE, selection);
                            src = at(width, xx + point.x * Mask.CP_CELL_SIZE, yy + point.y * Mask.CP_CELL_SIZE, selection);

                            data[dst] = srcData[src];
                            data[dst + 1] = srcData[src + 1];
                            data[dst + 2] = srcData[src + 2];
                            data[dst + 3] = srcData[src + 3];

                            if (rotate && xx > yy) {
                                swap(data,
                                    at(width, xx + x * Mask.CP_CELL_SIZE, yy + y * Mask.CP_CELL_SIZE, selection),
                                    at(width, yy + x * Mask.CP_CELL_SIZE, xx + y * Mask.CP_CELL_SIZE, selection));
                            }
                        }
                    }
                }
            }

            return imageData;
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
     * @param {Number} gridSize optionally limit the selection to a grid.
     * @return {Function} new mask function that will apply all masks in order.
     */
    Mask.Chain = function (masks, gridSize) {
        var length;
        length = masks.length;

        return function (imageData, selection) {
            var i, oWidth, oHeight;

            if (!!gridSize) {
                oWidth = selection.w;
                oHeight = selection.h;
                selection.w = Math.floor(selection.w / gridSize) * gridSize;
                selection.h = Math.floor(selection.h / gridSize) * gridSize;
            }

            for (i = 0; i < length; i += 1) {
                imageData = masks[i](imageData, selection);
            }

            if (!!gridSize) {
                selection.w = oWidth;
                selection.h = oHeight;
            }
            return imageData;
        };
    };

    /**
     * Mask actions that may be used on an image.
     */
    Mask.Actions = {
        'neg': Mask.Xor(Mask.NEG),
        'xor': Mask.Xor(Mask.XOR),
        'rgb': Mask.RGB({r: 'b', g: 'r', b: 'g'}),
        'hflip': Mask.Flip('h'),
        'vflip': Mask.Flip('v'),
        'hglass': Mask.Glass('h'),
        'vglass': Mask.Glass('v'),
        'win': Mask.Win(),
        'mekom': Mask.Chain([Mask.Meko('-'), Mask.Xor(Mask.NEG)], Mask.MEKO_CELL_SIZE),
        'mekop': Mask.Chain([Mask.Meko('+'), Mask.Xor(Mask.NEG)], Mask.MEKO_CELL_SIZE),
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
}(this));
