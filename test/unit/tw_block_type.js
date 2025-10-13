const {test} = require('tap');
const BlockType = require('../../src/extension-support/block-type');

test('BlockType - all types exist', t => {
    t.equal(BlockType.BOOLEAN, 'Boolean', 'BOOLEAN type exists');
    t.equal(BlockType.BUTTON, 'button', 'BUTTON type exists');
    t.equal(BlockType.LABEL, 'label', 'LABEL type exists');
    t.equal(BlockType.COMMAND, 'command', 'COMMAND type exists');
    t.equal(BlockType.CONDITIONAL, 'conditional', 'CONDITIONAL type exists');
    t.equal(BlockType.EVENT, 'event', 'EVENT type exists');
    t.equal(BlockType.HAT, 'hat', 'HAT type exists');
    t.equal(BlockType.LOOP, 'loop', 'LOOP type exists');
    t.equal(BlockType.REPORTER, 'reporter', 'REPORTER type exists');
    t.equal(BlockType.XML, 'xml', 'XML type exists');
    t.end();
});

test('BlockType - is exported correctly', t => {
    t.type(BlockType, 'object', 'BlockType is an object');
    const keys = Object.keys(BlockType);
    t.equal(keys.length, 10, 'BlockType has exactly 10 types');
    t.end();
});

test('BlockType - all values are strings', t => {
    for (const key in BlockType) {
        t.type(BlockType[key], 'string', `${key} is a string`);
    }
    t.end();
});