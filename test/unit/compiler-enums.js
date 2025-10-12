const test = require('tap').test;
const {InputOpcode} = require('../../src/compiler/enums');

test('InputOpcode has new comparison operators', t => {
    // Verify new opcodes exist
    t.ok(Object.values(InputOpcode).includes('op.gtoreq'), 'OP_GTOREQ exists');
    t.ok(Object.values(InputOpcode).includes('op.ltoreq'), 'OP_LTOREQ exists');
    t.end();
});

test('InputOpcode has all comparison operators', t => {
    t.ok(Object.values(InputOpcode).includes('op.equals'), 'OP_EQUALS exists');
    t.ok(Object.values(InputOpcode).includes('op.greater'), 'OP_GREATER exists');
    t.ok(Object.values(InputOpcode).includes('op.less'), 'OP_LESS exists');
    t.ok(Object.values(InputOpcode).includes('op.gtoreq'), 'OP_GTOREQ exists');
    t.ok(Object.values(InputOpcode).includes('op.ltoreq'), 'OP_LTOREQ exists');
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
