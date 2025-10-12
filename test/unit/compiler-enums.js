const test = require('tap').test;
const {InputOpcode} = require('../../src/compiler/enums');

test('InputOpcode removed deprecated comparison operators', t => {
    // Verify removed opcodes don't exist
    t.notOk(Object.values(InputOpcode).includes('op.gtoreq'), 'OP_GTOREQ should not exist');
    t.notOk(Object.values(InputOpcode).includes('op.ltoreq'), 'OP_LTOREQ should not exist');
    t.end();
});

test('InputOpcode has standard comparison operators', t => {
    t.ok(Object.values(InputOpcode).includes('op.equals'), 'OP_EQUALS exists');
    t.ok(Object.values(InputOpcode).includes('op.greater'), 'OP_GREATER exists');
    t.ok(Object.values(InputOpcode).includes('op.less'), 'OP_LESS exists');
    t.end();
});

test('InputOpcode has arithmetic operators', t => {
    t.ok(Object.values(InputOpcode).includes('op.add'), 'OP_ADD exists');
    t.ok(Object.values(InputOpcode).includes('op.subtract'), 'OP_SUBTRACT exists');
    t.ok(Object.values(InputOpcode).includes('op.multiply'), 'OP_MULTIPLY exists');
    t.ok(Object.values(InputOpcode).includes('op.divide'), 'OP_DIVIDE exists');
    t.end();
});

test('InputOpcode has string operators', t => {
    t.ok(Object.values(InputOpcode).includes('op.join'), 'OP_JOIN exists');
    t.ok(Object.values(InputOpcode).includes('op.length'), 'OP_LENGTH exists');
    t.end();
});