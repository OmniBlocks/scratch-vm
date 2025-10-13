const {test} = require('tap');
const ArgumentType = require('../../src/extension-support/argument-type');

test('ArgumentType - standard types exist', t => {
    t.equal(ArgumentType.ANGLE, 'angle', 'ANGLE type exists');
    t.equal(ArgumentType.BOOLEAN, 'Boolean', 'BOOLEAN type exists');
    t.equal(ArgumentType.COLOR, 'color', 'COLOR type exists');
    t.equal(ArgumentType.NUMBER, 'number', 'NUMBER type exists');
    t.equal(ArgumentType.STRING, 'string', 'STRING type exists');
    t.equal(ArgumentType.MATRIX, 'matrix', 'MATRIX type exists');
    t.equal(ArgumentType.NOTE, 'note', 'NOTE type exists');
    t.equal(ArgumentType.IMAGE, 'image', 'IMAGE type exists');
    t.equal(ArgumentType.COSTUME, 'costume', 'COSTUME type exists');
    t.equal(ArgumentType.SOUND, 'sound', 'SOUND type exists');
    t.end();
});

test('ArgumentType - removed custom types do not exist', t => {
    t.notOk(ArgumentType.POLYGON, 'POLYGON type should not exist');
    t.notOk(ArgumentType.CUSTOM, 'CUSTOM type should not exist');
    t.notOk(ArgumentType.VARIABLE, 'VARIABLE type should not exist');
    t.notOk(ArgumentType.LIST, 'LIST type should not exist');
    t.notOk(ArgumentType.BROADCAST, 'BROADCAST type should not exist');
    t.notOk(ArgumentType.SEPERATOR, 'SEPERATOR type should not exist');
    t.end();
});

test('ArgumentType - is exported correctly', t => {
    t.type(ArgumentType, 'object', 'ArgumentType is an object');
    const keys = Object.keys(ArgumentType);
    t.equal(keys.length, 10, 'ArgumentType has exactly 10 types');
    t.end();
});

test('ArgumentType - all values are strings', t => {
    for (const key in ArgumentType) {
        t.type(ArgumentType[key], 'string', `${key} is a string`);
    }
    t.end();
});

test('ArgumentType - no duplicate values', t => {
    const values = Object.values(ArgumentType);
    const uniqueValues = [...new Set(values)];
    t.equal(values.length, uniqueValues.length, 'All argument type values are unique');
    t.end();
});