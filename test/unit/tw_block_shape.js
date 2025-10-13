const {test} = require('tap');
const Runtime = require('../../src/engine/runtime');
const Scratch = require('../../src/extension-support/tw-extension-api-common');

test('blockShape', t => {
    const rt = new Runtime();
    rt._registerExtensionPrimitives({
        id: 'shapetest',
        name: 'shapetest',
        blocks: [
            {
                blockType: Scratch.BlockType.REPORTER,
                blockShape: Scratch.BlockShape.HEXAGONAL,
                opcode: 'hexagonal',
                text: 'hexagonal'
            },
            {
                blockType: Scratch.BlockType.BOOLEAN,
                blockShape: Scratch.BlockShape.ROUND,
                opcode: 'round',
                text: 'round'
            },
            {
                blockType: Scratch.BlockType.REPORTER,
                blockShape: Scratch.BlockShape.SQUARE,
                opcode: 'square',
                text: 'square'
            }
        ]
    });

    const json = rt.getBlocksJSON();
    t.equal(json.length, 3);
    t.equal(json[0].outputShape, 1);
    t.equal(json[1].outputShape, 2);
    t.equal(json[2].outputShape, 3);
    t.end();
});

test('blockShape - constants match ScratchBlocksConstants', t => {
    const ScratchBlocksConstants = require('../../src/engine/scratch-blocks-constants');
    const BlockShape = require('../../src/extension-support/tw-block-shape');
    
    t.equal(BlockShape.HEXAGONAL, ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL, 
        'HEXAGONAL matches constant');
    t.equal(BlockShape.ROUND, ScratchBlocksConstants.OUTPUT_SHAPE_ROUND, 
        'ROUND matches constant');
    t.equal(BlockShape.SQUARE, ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE, 
        'SQUARE matches constant');
    
    t.end();
});

test('blockShape - correct numeric values', t => {
    const BlockShape = require('../../src/extension-support/tw-block-shape');
    
    t.equal(BlockShape.HEXAGONAL, 1, 'HEXAGONAL is 1');
    t.equal(BlockShape.ROUND, 2, 'ROUND is 2');
    t.equal(BlockShape.SQUARE, 3, 'SQUARE is 3');
    
    t.end();
});

test('blockShape - removed shapes do not exist', t => {
    const BlockShape = require('../../src/extension-support/tw-block-shape');
    
    t.notOk(BlockShape.LEAF, 'LEAF shape should not exist');
    t.notOk(BlockShape.PLUS, 'PLUS shape should not exist');
    t.notOk(BlockShape.OCTAGONAL, 'OCTAGONAL shape should not exist');
    t.notOk(BlockShape.BUMPED, 'BUMPED shape should not exist');
    t.notOk(BlockShape.INDENTED, 'INDENTED shape should not exist');
    t.notOk(BlockShape.SCRAPPED, 'SCRAPPED shape should not exist');
    t.notOk(BlockShape.ARROW, 'ARROW shape should not exist');
    t.notOk(BlockShape.TICKET, 'TICKET shape should not exist');
    
    t.end();
});

test('blockShape - only three shapes exist', t => {
    const BlockShape = require('../../src/extension-support/tw-block-shape');
    const keys = Object.keys(BlockShape);
    
    t.equal(keys.length, 3, 'Only three block shapes exist');
    t.ok(keys.includes('HEXAGONAL'), 'HEXAGONAL exists');
    t.ok(keys.includes('ROUND'), 'ROUND exists');
    t.ok(keys.includes('SQUARE'), 'SQUARE exists');
    
    t.end();
});