const test = require('tap').test;
const VirtualMachine = require('../../src/virtual-machine');
const ArgumentType = require('../../src/extension-support/argument-type');
const BlockType = require('../../src/extension-support/block-type');
const BlockShape = require('../../src/extension-support/tw-block-shape');
const ScratchBlocksConstants = require('../../src/engine/scratch-blocks-constants');
const {InputOpcode} = require('../../src/compiler/enums');

test('Architecture changes - Overall validation', t => {
    // Test 1: Operators module changes
    const Operators = require('../../src/blocks/scratch3_operators');
    const blocks = new Operators(null);
    const primitives = blocks.getPrimitives();
    
    // Verify new operators exist
    t.ok(primitives.operator_ltoreq, 'ltoreq operator exists');
    t.ok(primitives.operator_gtoreq, 'gtoreq operator exists');
    
    // Verify standard operators still exist
    t.ok(primitives.operator_lt, 'lt operator still exists');
    t.ok(primitives.operator_gt, 'gt operator still exists');
    t.ok(primitives.operator_equals, 'equals operator still exists');
    
    // Test 2: ArgumentType cleanup
    t.notOk(ArgumentType.POLYGON, 'POLYGON removed from ArgumentType');
    t.notOk(ArgumentType.CUSTOM, 'CUSTOM removed from ArgumentType');
    t.notOk(ArgumentType.VARIABLE, 'VARIABLE removed from ArgumentType');
    t.notOk(ArgumentType.LIST, 'LIST removed from ArgumentType');
    t.notOk(ArgumentType.BROADCAST, 'BROADCAST removed from ArgumentType');
    t.notOk(ArgumentType.SEPERATOR, 'SEPERATOR removed from ArgumentType');
    t.ok(ArgumentType.COSTUME, 'COSTUME still exists');
    t.ok(ArgumentType.SOUND, 'SOUND still exists');
    
    // Test 3: BlockShape uses ScratchBlocksConstants
    t.equal(BlockShape.HEXAGONAL, ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL,
        'BlockShape uses constants');
    t.notOk(BlockShape.LEAF, 'LEAF removed from BlockShape');
    t.notOk(BlockShape.PLUS, 'PLUS removed from BlockShape');
    t.notOk(BlockShape.OCTAGONAL, 'OCTAGONAL removed from BlockShape');
    
    // Test 4: BlockType remains stable
    t.ok(BlockType.COMMAND, 'COMMAND block type exists');
    t.ok(BlockType.REPORTER, 'REPORTER block type exists');
    t.ok(BlockType.BOOLEAN, 'BOOLEAN block type exists');
    t.ok(BlockType.HAT, 'HAT block type exists');
    
    // Test 5: Compiler enums include new operators
    const opcodeValues = Object.values(InputOpcode);
    t.ok(opcodeValues.includes('op.gtoreq'), 'OP_GTOREQ in compiler');
    t.ok(opcodeValues.includes('op.ltoreq'), 'OP_LTOREQ in compiler');
    t.ok(opcodeValues.includes('op.greater'), 'OP_GREATER still in compiler');
    t.ok(opcodeValues.includes('op.less'), 'OP_LESS still in compiler');
    
    // Test 6: Extension manager cleanup
    const vm = new VirtualMachine();
    t.notOk(typeof vm.extensionManager.getCoreExtensionList === 'function',
        'getCoreExtensionList removed');
    t.notOk(vm.extensionManager.isBuiltinExtension('SPjavascriptV2'),
        'SPjavascriptV2 extension removed');
    t.ok(vm.extensionManager.isBuiltinExtension('tw'),
        'tw extension still available');
    
    t.end();
});

test('Architecture changes - Type consistency', t => {
    // Verify all ArgumentType values are strings
    Object.keys(ArgumentType).forEach(key => {
        t.type(ArgumentType[key], 'string', `ArgumentType.${key} is a string`);
    });
    
    // Verify all BlockType values are strings
    Object.keys(BlockType).forEach(key => {
        t.type(BlockType[key], 'string', `BlockType.${key} is a string`);
    });
    
    // Verify all BlockShape values are numbers
    Object.keys(BlockShape).forEach(key => {
        t.type(BlockShape[key], 'number', `BlockShape.${key} is a number`);
    });
    
    t.end();
});

test('Architecture changes - Backwards compatibility', t => {
    // Ensure core functionality still works
    const vm = new VirtualMachine();
    
    // Test basic operator functionality
    const Operators = require('../../src/blocks/scratch3_operators');
    const blocks = new Operators(null);
    
    t.equal(blocks.add({NUM1: 5, NUM2: 3}), 8, 'Addition works');
    t.equal(blocks.lt({OPERAND1: 1, OPERAND2: 2}), true, 'Less than works');
    t.equal(blocks.gt({OPERAND1: 2, OPERAND2: 1}), true, 'Greater than works');
    t.equal(blocks.equals({OPERAND1: 5, OPERAND2: 5}), true, 'Equals works');
    
    // Test extension registration
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testcompat',
            name: 'Test Compatibility',
            blocks: [
                {
                    opcode: 'testOp',
                    blockType: BlockType.REPORTER,
                    text: 'test',
                    arguments: {
                        ARG1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                }
            ]
        }),
        testOp: args => args.ARG1
    });
    
    t.ok(vm.extensionManager.isExtensionLoaded('testcompat'),
        'Extension loading still works');
    
    t.end();
});

test('Architecture changes - Code quality improvements', t => {
    // Test that BlockType has proper formatting
    const BlockTypeSource = require('fs').readFileSync(
        './src/extension-support/block-type.js', 'utf8'
    );
    t.notOk(BlockTypeSource.includes('\n\n\n'), 'No triple newlines in BlockType');
    
    // Test that ArgumentType has proper formatting
    const ArgumentTypeSource = require('fs').readFileSync(
        './src/extension-support/argument-type.js', 'utf8'
    );
    t.ok(ArgumentTypeSource.endsWith('module.exports = ArgumentType;\n'),
        'ArgumentType has proper export');
    
    // Test that tw-block-shape has proper imports
    const BlockShapeSource = require('fs').readFileSync(
        './src/extension-support/tw-block-shape.js', 'utf8'
    );
    t.ok(BlockShapeSource.includes('ScratchBlocksConstants'),
        'tw-block-shape imports constants');
    
    t.end();
});
