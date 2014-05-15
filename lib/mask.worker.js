/**
 * mask.worker.js
 *
 * Web worker to process frames with a mask.
 */

/*jslint devel: true, todo: true */
/*global self: true, importScripts: true, Mask: true */

"use strict";

importScripts('constants.js', 'geometry.js', 'masks.js');

var procid, processFrames;


processFrames = function (frames, selection, maskFunc) {
    var newFrames, totalFrames, currentFrame, progress, prevProgress;
    currentFrame = 0;
    totalFrames = frames.length;
    newFrames = [];

    prevProgress = 0;
    procid = setTimeout(function renderFrame() {
        newFrames[currentFrame] = maskFunc(frames[currentFrame], selection);

        if (currentFrame + 1 === totalFrames) {
            self.postMessage({
                status: 'done',
                frames: newFrames
            });
        } else {
            progress = Math.round(currentFrame / totalFrames * 100);
            if (progress > prevProgress) {
                self.postMessage({
                    status: 'progress',
                    progress: progress / 100,
                    frame: newFrames[currentFrame],
                });
                prevProgress = progress;
            }
            currentFrame += 1;
            procid = setTimeout(renderFrame);
        }
    });
};

self.addEventListener('message', function (e) {
    var maskFunc;

    if (e.data.action === 'processFrames') {
        if (!!e.data.undo) {
            maskFunc = Mask.ReverseActions[e.data.entry.mask];
        } else {
            maskFunc = Mask.Actions[e.data.entry.mask];
        }
        if (!!e.data.entry.args) {
            maskFunc = maskFunc(e.data.entry.args);
        }

        processFrames(
            e.data.frames,
            e.data.entry.selection,
            maskFunc
        );
    }
}, false);
