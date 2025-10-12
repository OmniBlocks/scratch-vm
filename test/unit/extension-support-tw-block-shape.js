const test = require('tap').test;
const BlockShape = require('../../src/extension-support/tw-block-shape');
const ScratchBlocksConstants = require('../../src/engine/scratch-blocks-constants');

test('BlockShape uses ScratchBlocksConstants', t => {
    t.equal(BlockShape.HEXAGONAL, ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL, 
        'HEXAGONAL matches ScratchBlocksConstants');
    t.equal(BlockShape.ROUND, ScratchBlocksConstants.OUTPUT_SHAPE_ROUND, 
        'ROUND matches ScratchBlocksConstants');
    t.equal(BlockShape.SQUARE, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE, 
        'SQUARE matches ScratchBlocksConstants');
    t.end();
});

test('BlockShape has correct numeric values', t => {
    t.equal(BlockShape.HEXAGONAL, 1, 'HEXAGONAL is 1');
    t.equal(BlockShape.ROUND, 2, 'ROUND is 2');
    t.equal(BlockShape.SQUARE, 3, 'SQUARE is 3');
    t.end();
});

test('BlockShape removed deprecated shapes', t => {
    t.notOk(BlockShape.hasOwnProperty('LEAF'), 'LEAF should not exist');
    t.notOk(BlockShape.hasOwnProperty('PLUS'), 'PLUS should not exist');
    t.notOk(BlockShape.hasOwnProperty('OCTAGONAL'), 'OCTAGONAL should not exist');
    t.notOk(BlockShape.hasOwnProperty('BUMPED'), 'BUMPED should not exist');
    t.notOk(BlockShape.hasOwnProperty('INDENTED'), 'INDENTED should not exist');
    t.notOk(BlockShape.hasOwnProperty('SCRAPPED'), 'SCRAPPED should not exist');
    t.notOk(BlockShape.hasOwnProperty('ARROW'), 'ARROW should not exist');
    t.notOk(BlockShape.hasOwnProperty('TICKET'), 'TICKET should not exist');
    t.end();
});

test('BlockShape is an object', t => {
    t.type(BlockShape, 'object', 'BlockShape is an object');
    t.end();
});

test('BlockShape values are numbers', t => {
    const keys = Object.keys(BlockShape);
    keys.forEach(key => {
        t.type(BlockShape[key], 'number', `${key} value is a number`);
    });
    t.end();
});

test('BlockShape has exactly three shapes', t => {
    const keys = Object.keys(BlockShape);
    t.equal(keys.length, 3, 'BlockShape has exactly 3 shapes');
    t.end();
});