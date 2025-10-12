const test = require('tap').test;
const BlockType = require('../../src/extension-support/block-type');

test('BlockType has required types', t => {
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

test('BlockType is an object', t => {
    t.type(BlockType, 'object', 'BlockType is an object');
    t.end();
});

test('BlockType values are strings', t => {
    const keys = Object.keys(BlockType);
    keys.forEach(key => {
        t.type(BlockType[key], 'string', `${key} value is a string`);
    });
    t.end();
});

test('BlockType has no duplicate values', t => {
    const values = Object.values(BlockType);
    const uniqueValues = [...new Set(values)];
    t.equal(values.length, uniqueValues.length, 'No duplicate values');
    t.end();
});

test('BlockType formatting is correct', t => {
    // Check that there are no extra blank lines or formatting issues
    const source = require('fs').readFileSync('./src/extension-support/block-type.js', 'utf8');
    t.notOk(source.includes('\n\n\n'), 'No triple blank lines');
    t.ok(source.endsWith('module.exports = BlockType;\n'), 'Ends with proper export');
    t.end();
});