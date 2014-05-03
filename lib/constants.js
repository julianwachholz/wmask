/**
 * constants.js
 *
 * Masking constants used by the original GMask.
 */

(function (w) {
    "use strict";

    var Mask = w.Mask || {};

    /**
     * GMask grid sizes in pixel.
     */
    Mask.GRID_SIZE = 8;
    Mask.GRID_SIZE_DOUBLE = 16;

    /**
     * XOR values used.
     */
    Mask.XOR = 0x80;
    Mask.NEG = 0xff;

    /**
     * Transform table used by the Win mask.
     */
    Mask.WIN_XFORM = [12, 8, 6, 15, 9, 13, 6, 11, 8, 9, 14];


    w.Mask = Mask;
}(window));
