const test = require('tap').test;
const Operators = require('../../src/blocks/scratch3_operators');

const blocks = new Operators(null);

test('getPrimitives', t => {
    t.type(blocks.getPrimitives(), 'object');
    t.end();
});

test('add', t => {
    t.strictEqual(blocks.add({NUM1: '1', NUM2: '1'}), 2);
    t.strictEqual(blocks.add({NUM1: 'foo', NUM2: 'bar'}), 0);
    t.end();
});

test('subtract', t => {
    t.strictEqual(blocks.subtract({NUM1: '1', NUM2: '1'}), 0);
    t.strictEqual(blocks.subtract({NUM1: 'foo', NUM2: 'bar'}), 0);
    t.end();
});

test('multiply', t => {
    t.strictEqual(blocks.multiply({NUM1: '2', NUM2: '2'}), 4);
    t.strictEqual(blocks.multiply({NUM1: 'foo', NUM2: 'bar'}), 0);
    t.end();
});

test('divide', t => {
    t.strictEqual(blocks.divide({NUM1: '2', NUM2: '2'}), 1);
    t.ok(isNaN(blocks.divide({NUM1: 'foo', NUM2: 'bar'}))); // @todo
    t.end();
});

test('lt', t => {
    t.strictEqual(blocks.lt({OPERAND1: '1', OPERAND2: '2'}), true);
    t.strictEqual(blocks.lt({OPERAND1: '2', OPERAND2: '1'}), false);
    t.strictEqual(blocks.lt({OPERAND1: '1', OPERAND2: '1'}), false);
    t.strictEqual(blocks.lt({OPERAND1: '10', OPERAND2: '2'}), false);
    t.strictEqual(blocks.lt({OPERAND1: 'a', OPERAND2: 'z'}), true);
    t.end();
});

test('equals', t => {
    t.strictEqual(blocks.equals({OPERAND1: '1', OPERAND2: '2'}), false);
    t.strictEqual(blocks.equals({OPERAND1: '2', OPERAND2: '1'}), false);
    t.strictEqual(blocks.equals({OPERAND1: '1', OPERAND2: '1'}), true);
    t.strictEqual(blocks.equals({OPERAND1: 'あ', OPERAND2: 'ア'}), false);
    t.end();
});

test('gt', t => {
    t.strictEqual(blocks.gt({OPERAND1: '1', OPERAND2: '2'}), false);
    t.strictEqual(blocks.gt({OPERAND1: '2', OPERAND2: '1'}), true);
    t.strictEqual(blocks.gt({OPERAND1: '1', OPERAND2: '1'}), false);
    t.end();
});

test('and', t => {
    t.strictEqual(blocks.and({OPERAND1: true, OPERAND2: true}), true);
    t.strictEqual(blocks.and({OPERAND1: true, OPERAND2: false}), false);
    t.strictEqual(blocks.and({OPERAND1: false, OPERAND2: false}), false);
    t.end();
});

test('or', t => {
    t.strictEqual(blocks.or({OPERAND1: true, OPERAND2: true}), true);
    t.strictEqual(blocks.or({OPERAND1: true, OPERAND2: false}), true);
    t.strictEqual(blocks.or({OPERAND1: false, OPERAND2: false}), false);
    t.end();
});

test('not', t => {
    t.strictEqual(blocks.not({OPERAND: true}), false);
    t.strictEqual(blocks.not({OPERAND: false}), true);
    t.end();
});

test('random', t => {
    const min = 0;
    const max = 100;
    const result = blocks.random({FROM: min, TO: max});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('random - equal', t => {
    const min = 1;
    const max = 1;
    t.strictEqual(blocks.random({FROM: min, TO: max}), min);
    t.end();
});

test('random - decimal', t => {
    const min = 0.1;
    const max = 10;
    const result = blocks.random({FROM: min, TO: max});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('random - int', t => {
    const min = 0;
    const max = 10;
    const result = blocks.random({FROM: min, TO: max});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('random - reverse', t => {
    const min = 0;
    const max = 10;
    const result = blocks.random({FROM: max, TO: min});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('join', t => {
    t.strictEqual(blocks.join({STRING1: 'foo', STRING2: 'bar'}), 'foobar');
    t.strictEqual(blocks.join({STRING1: '1', STRING2: '2'}), '12');
    t.end();
});

test('letterOf', t => {
    t.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 0}), '');
    t.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 1}), 'f');
    t.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 2}), 'o');
    t.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 3}), 'o');
    t.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 4}), '');
    t.strictEqual(blocks.letterOf({STRING: 'foo', LETTER: 'bar'}), '');
    t.end();
});

test('length', t => {
    t.strictEqual(blocks.length({STRING: ''}), 0);
    t.strictEqual(blocks.length({STRING: 'foo'}), 3);
    t.strictEqual(blocks.length({STRING: '1'}), 1);
    t.strictEqual(blocks.length({STRING: '100'}), 3);
    t.end();
});

test('contains', t => {
    t.strictEqual(blocks.contains({STRING1: 'hello world', STRING2: 'hello'}), true);
    t.strictEqual(blocks.contains({STRING1: 'foo', STRING2: 'bar'}), false);
    t.strictEqual(blocks.contains({STRING1: 'HeLLo world', STRING2: 'hello'}), true);
    t.end();
});

test('mod', t => {
    t.strictEqual(blocks.mod({NUM1: 1, NUM2: 1}), 0);
    t.strictEqual(blocks.mod({NUM1: 3, NUM2: 6}), 3);
    t.strictEqual(blocks.mod({NUM1: -3, NUM2: 6}), 3);
    t.end();
});

test('round', t => {
    t.strictEqual(blocks.round({NUM: 1}), 1);
    t.strictEqual(blocks.round({NUM: 1.1}), 1);
    t.strictEqual(blocks.round({NUM: 1.5}), 2);
    t.end();
});

test('mathop', t => {
    t.strictEqual(blocks.mathop({OPERATOR: 'abs', NUM: -1}), 1);
    t.strictEqual(blocks.mathop({OPERATOR: 'floor', NUM: 1.5}), 1);
    t.strictEqual(blocks.mathop({OPERATOR: 'ceiling', NUM: 0.1}), 1);
    t.strictEqual(blocks.mathop({OPERATOR: 'sqrt', NUM: 1}), 1);
    t.strictEqual(blocks.mathop({OPERATOR: 'sin', NUM: 1}), 0.0174524064);
    t.strictEqual(blocks.mathop({OPERATOR: 'sin', NUM: 90}), 1);
    t.strictEqual(blocks.mathop({OPERATOR: 'cos', NUM: 1}), 0.9998476952);
    t.strictEqual(blocks.mathop({OPERATOR: 'cos', NUM: 180}), -1);
    t.strictEqual(blocks.mathop({OPERATOR: 'tan', NUM: 1}), 0.0174550649);
    t.strictEqual(blocks.mathop({OPERATOR: 'tan', NUM: 90}), Infinity);
    t.strictEqual(blocks.mathop({OPERATOR: 'tan', NUM: 180}), 0);
    t.strictEqual(blocks.mathop({OPERATOR: 'asin', NUM: 1}), 90);
    t.strictEqual(blocks.mathop({OPERATOR: 'acos', NUM: 1}), 0);
    t.strictEqual(blocks.mathop({OPERATOR: 'atan', NUM: 1}), 45);
    t.strictEqual(blocks.mathop({OPERATOR: 'ln', NUM: 1}), 0);
    t.strictEqual(blocks.mathop({OPERATOR: 'log', NUM: 1}), 0);
    t.strictEqual(blocks.mathop({OPERATOR: 'e ^', NUM: 1}), 2.718281828459045);
    t.strictEqual(blocks.mathop({OPERATOR: '10 ^', NUM: 1}), 10);
    t.strictEqual(blocks.mathop({OPERATOR: 'undefined', NUM: 1}), 0);
    t.end();
});

// Tests for removed operator functions (ltoreq and gtoreq)
test('ltoreq should not exist', t => {
    t.notOk(blocks.ltoreq, 'ltoreq method should not exist');
    t.notOk(blocks.getPrimitives().operator_ltoreq, 'operator_ltoreq should not be in primitives');
    t.end();
});

test('gtoreq should not exist', t => {
    t.notOk(blocks.gtoreq, 'gtoreq method should not exist');
    t.notOk(blocks.getPrimitives().operator_gtoreq, 'operator_gtoreq should not be in primitives');
    t.end();
});

// Comprehensive tests for comparison operators to ensure they work correctly
test('lt - comprehensive edge cases', t => {
    // Numbers
    t.strictEqual(blocks.lt({OPERAND1: 0, OPERAND2: 1}), true);
    t.strictEqual(blocks.lt({OPERAND1: -1, OPERAND2: 0}), true);
    t.strictEqual(blocks.lt({OPERAND1: -10, OPERAND2: -5}), true);
    t.strictEqual(blocks.lt({OPERAND1: 0.5, OPERAND2: 1.5}), true);
    
    // String numbers
    t.strictEqual(blocks.lt({OPERAND1: '5', OPERAND2: '10'}), true);
    t.strictEqual(blocks.lt({OPERAND1: '10', OPERAND2: '5'}), false);
    
    // Mixed types
    t.strictEqual(blocks.lt({OPERAND1: 5, OPERAND2: '10'}), true);
    t.strictEqual(blocks.lt({OPERAND1: '5', OPERAND2: 10}), true);
    
    // Strings
    t.strictEqual(blocks.lt({OPERAND1: 'abc', OPERAND2: 'def'}), true);
    t.strictEqual(blocks.lt({OPERAND1: 'xyz', OPERAND2: 'abc'}), false);
    
    // Special values
    t.strictEqual(blocks.lt({OPERAND1: NaN, OPERAND2: 5}), false);
    t.strictEqual(blocks.lt({OPERAND1: 5, OPERAND2: NaN}), false);
    t.strictEqual(blocks.lt({OPERAND1: Infinity, OPERAND2: 100}), false);
    t.strictEqual(blocks.lt({OPERAND1: -Infinity, OPERAND2: 0}), true);
    
    t.end();
});

test('equals - comprehensive edge cases', t => {
    // Numbers
    t.strictEqual(blocks.equals({OPERAND1: 1, OPERAND2: 1}), true);
    t.strictEqual(blocks.equals({OPERAND1: 0, OPERAND2: 0}), true);
    t.strictEqual(blocks.equals({OPERAND1: -5, OPERAND2: -5}), true);
    
    // String numbers
    t.strictEqual(blocks.equals({OPERAND1: '5', OPERAND2: '5'}), true);
    t.strictEqual(blocks.equals({OPERAND1: '0', OPERAND2: '0'}), true);
    
    // Mixed types - string number and number
    t.strictEqual(blocks.equals({OPERAND1: 5, OPERAND2: '5'}), true);
    t.strictEqual(blocks.equals({OPERAND1: '5', OPERAND2: 5}), true);
    
    // Strings
    t.strictEqual(blocks.equals({OPERAND1: 'hello', OPERAND2: 'hello'}), true);
    t.strictEqual(blocks.equals({OPERAND1: 'hello', OPERAND2: 'world'}), false);
    
    // Case sensitivity
    t.strictEqual(blocks.equals({OPERAND1: 'Hello', OPERAND2: 'hello'}), false);
    
    // Empty strings
    t.strictEqual(blocks.equals({OPERAND1: '', OPERAND2: ''}), true);
    
    // Special values
    t.strictEqual(blocks.equals({OPERAND1: NaN, OPERAND2: NaN}), false);
    
    t.end();
});

test('gt - comprehensive edge cases', t => {
    // Numbers
    t.strictEqual(blocks.gt({OPERAND1: 10, OPERAND2: 5}), true);
    t.strictEqual(blocks.gt({OPERAND1: 0, OPERAND2: -1}), true);
    t.strictEqual(blocks.gt({OPERAND1: -5, OPERAND2: -10}), true);
    
    // String numbers
    t.strictEqual(blocks.gt({OPERAND1: '20', OPERAND2: '10'}), true);
    t.strictEqual(blocks.gt({OPERAND1: '5', OPERAND2: '10'}), false);
    
    // Mixed types
    t.strictEqual(blocks.gt({OPERAND1: 10, OPERAND2: '5'}), true);
    t.strictEqual(blocks.gt({OPERAND1: '10', OPERAND2: 5}), true);
    
    // Strings
    t.strictEqual(blocks.gt({OPERAND1: 'xyz', OPERAND2: 'abc'}), true);
    t.strictEqual(blocks.gt({OPERAND1: 'abc', OPERAND2: 'xyz'}), false);
    
    // Special values
    t.strictEqual(blocks.gt({OPERAND1: Infinity, OPERAND2: 100}), true);
    t.strictEqual(blocks.gt({OPERAND1: 0, OPERAND2: -Infinity}), true);
    
    t.end();
});

test('getPrimitives - verify correct primitives exist', t => {
    const primitives = blocks.getPrimitives();
    
    // Verify expected primitives exist
    t.ok(primitives.operator_add, 'operator_add exists');
    t.ok(primitives.operator_subtract, 'operator_subtract exists');
    t.ok(primitives.operator_multiply, 'operator_multiply exists');
    t.ok(primitives.operator_divide, 'operator_divide exists');
    t.ok(primitives.operator_lt, 'operator_lt exists');
    t.ok(primitives.operator_equals, 'operator_equals exists');
    t.ok(primitives.operator_gt, 'operator_gt exists');
    t.ok(primitives.operator_and, 'operator_and exists');
    t.ok(primitives.operator_or, 'operator_or exists');
    t.ok(primitives.operator_not, 'operator_not exists');
    t.ok(primitives.operator_random, 'operator_random exists');
    t.ok(primitives.operator_join, 'operator_join exists');
    t.ok(primitives.operator_letter_of, 'operator_letter_of exists');
    t.ok(primitives.operator_length, 'operator_length exists');
    t.ok(primitives.operator_contains, 'operator_contains exists');
    t.ok(primitives.operator_mod, 'operator_mod exists');
    t.ok(primitives.operator_round, 'operator_round exists');
    t.ok(primitives.operator_mathop, 'operator_mathop exists');
    
    // Verify removed primitives don't exist
    t.notOk(primitives.operator_ltoreq, 'operator_ltoreq does not exist');
    t.notOk(primitives.operator_gtoreq, 'operator_gtoreq does not exist');
    
    t.end();
});