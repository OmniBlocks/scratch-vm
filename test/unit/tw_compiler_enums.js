const {test} = require('tap');
const {InputOpcode} = require('../../src/compiler/enums');

test('InputOpcode - removed opcodes do not exist', t => {
    t.notOk(InputOpcode.OP_GTOREQ, 'OP_GTOREQ should not exist');
    t.notOk(InputOpcode.OP_LTOREQ, 'OP_LTOREQ should not exist');
    t.end();
});

test('InputOpcode - standard comparison opcodes exist', t => {
    t.equal(InputOpcode.OP_EQUALS, 'op.equals', 'OP_EQUALS exists');
    t.equal(InputOpcode.OP_GREATER, 'op.greater', 'OP_GREATER exists');
    t.equal(InputOpcode.OP_LESS, 'op.less', 'OP_LESS exists');
    t.end();
});

test('InputOpcode - arithmetic opcodes exist', t => {
    t.equal(InputOpcode.OP_ADD, 'op.add', 'OP_ADD exists');
    t.equal(InputOpcode.OP_SUBTRACT, 'op.subtract', 'OP_SUBTRACT exists');
    t.equal(InputOpcode.OP_MULTIPLY, 'op.multiply', 'OP_MULTIPLY exists');
    t.equal(InputOpcode.OP_DIVIDE, 'op.divide', 'OP_DIVIDE exists');
    t.end();
});

test('InputOpcode - string opcodes exist', t => {
    t.equal(InputOpcode.OP_JOIN, 'op.join', 'OP_JOIN exists');
    t.equal(InputOpcode.OP_LENGTH, 'op.length', 'OP_LENGTH exists');
    t.ok(InputOpcode.OP_LETTER, 'OP_LETTER exists');
    t.end();
});