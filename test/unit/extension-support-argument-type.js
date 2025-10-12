const test = require('tap').test;
const ArgumentType = require('../../src/extension-support/argument-type');

test('ArgumentType has required types', t => {
    t.equal(ArgumentType.ANGLE, 'angle', 'ANGLE type exists');
    t.equal(ArgumentType.BOOLEAN, 'Boolean', 'BOOLEAN type exists');
    t.equal(ArgumentType.COLOR, 'color', 'COLOR type exists');
    t.equal(ArgumentType.NUMBER, 'number', 'NUMBER type exists');
    t.equal(ArgumentType.STRING, 'string', 'STRING type exists');
    t.equal(ArgumentType.MATRIX, 'matrix', 'MATRIX type exists');
    t.equal(ArgumentType.NOTE, 'note', 'NOTE type exists');
    t.equal(ArgumentType.IMAGE, 'image', 'IMAGE type exists');
    t.end();
});

test('ArgumentType has extension types', t => {
    t.equal(ArgumentType.COSTUME, 'costume', 'COSTUME type exists');
    t.equal(ArgumentType.SOUND, 'sound', 'SOUND type exists');
    t.end();
});

test('ArgumentType removed deprecated types', t => {
    t.notOk(ArgumentType.hasOwnProperty('POLYGON'), 'POLYGON should not exist');
    t.notOk(ArgumentType.hasOwnProperty('CUSTOM'), 'CUSTOM should not exist');
    t.notOk(ArgumentType.hasOwnProperty('VARIABLE'), 'VARIABLE should not exist');
    t.notOk(ArgumentType.hasOwnProperty('LIST'), 'LIST should not exist');
    t.notOk(ArgumentType.hasOwnProperty('BROADCAST'), 'BROADCAST should not exist');
    t.notOk(ArgumentType.hasOwnProperty('SEPERATOR'), 'SEPERATOR should not exist');
    t.end();
});

test('ArgumentType is an object', t => {
    t.type(ArgumentType, 'object', 'ArgumentType is an object');
    t.end();
});

test('ArgumentType values are strings', t => {
    const keys = Object.keys(ArgumentType);
    keys.forEach(key => {
        t.type(ArgumentType[key], 'string', `${key} value is a string`);
    });
    t.end();
});

test('ArgumentType has no duplicate values', t => {
    const values = Object.values(ArgumentType);
    const uniqueValues = [...new Set(values)];
    t.equal(values.length, uniqueValues.length, 'No duplicate values');
    t.end();
});