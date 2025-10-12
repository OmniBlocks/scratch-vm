const test = require('tap').test;
const ArgumentType = require('../../src/extension-support/argument-type');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('ArgumentType values work in actual extension', t => {
    const vm = new VirtualMachine();
    
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testargumenttypes',
            name: 'Test Argument Types',
            blocks: [
                {
                    opcode: 'testAngle',
                    blockType: BlockType.REPORTER,
                    text: 'angle [ANGLE]',
                    arguments: {
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                },
                {
                    opcode: 'testNumber',
                    blockType: BlockType.REPORTER,
                    text: 'number [NUM]',
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'testString',
                    blockType: BlockType.REPORTER,
                    text: 'string [STR]',
                    arguments: {
                        STR: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello'
                        }
                    }
                },
                {
                    opcode: 'testColor',
                    blockType: BlockType.REPORTER,
                    text: 'color [COLOR]',
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR,
                            defaultValue: '#FF0000'
                        }
                    }
                },
                {
                    opcode: 'testCostume',
                    blockType: BlockType.REPORTER,
                    text: 'costume [COSTUME]',
                    arguments: {
                        COSTUME: {
                            type: ArgumentType.COSTUME
                        }
                    }
                },
                {
                    opcode: 'testSound',
                    blockType: BlockType.REPORTER,
                    text: 'sound [SOUND]',
                    arguments: {
                        SOUND: {
                            type: ArgumentType.SOUND
                        }
                    }
                }
            ]
        }),
        testAngle: args => args.ANGLE,
        testNumber: args => args.NUM,
        testString: args => args.STR,
        testColor: args => args.COLOR,
        testCostume: args => args.COSTUME,
        testSound: args => args.SOUND
    });
    
    t.ok(vm.extensionManager.isExtensionLoaded('testargumenttypes'), 
        'Extension with various argument types loaded successfully');
    
    t.end();
});

test('ArgumentType COSTUME and SOUND are properly defined', t => {
    t.equal(typeof ArgumentType.COSTUME, 'string', 'COSTUME is a string');
    t.equal(typeof ArgumentType.SOUND, 'string', 'SOUND is a string');
    t.equal(ArgumentType.COSTUME, 'costume', 'COSTUME has correct value');
    t.equal(ArgumentType.SOUND, 'sound', 'SOUND has correct value');
    t.end();
});

test('ArgumentType does not contain deprecated types', t => {
    const allKeys = Object.keys(ArgumentType);
    
    // Check that no deprecated types are present
    const deprecatedTypes = ['POLYGON', 'CUSTOM', 'VARIABLE', 'LIST', 'BROADCAST', 'SEPERATOR'];
    deprecatedTypes.forEach(deprecated => {
        t.notOk(allKeys.includes(deprecated), `${deprecated} should not be in ArgumentType`);
    });
    
    t.end();
});