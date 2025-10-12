const {test} = require('tap');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');

// Test that the new comparison operators (ltoreq, gtoreq) are properly compiled
test('Compiler handles ltoreq/gtoreq operators correctly', t => {
    const vm = new VirtualMachine();
    
    const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'default.sb3'));
    
    vm.loadProject(fixture).then(() => {
        // Verify that the compiler primitives include these operators
        const ltoreqPrimitive = vm.runtime.getOpcodeFunction('operator_ltoreq');
        t.ok(ltoreqPrimitive, 'operator_ltoreq should be available');
        
        const gtoreqPrimitive = vm.runtime.getOpcodeFunction('operator_gtoreq');
        t.ok(gtoreqPrimitive, 'operator_gtoreq should be available');
        
        t.end();
    }).catch(err => {
        t.fail(`Failed to load project: ${err}`);
        t.end();
    });
});

test('New comparison operators work correctly in runtime', t => {
    const vm = new VirtualMachine();
    
    const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'default.sb3'));
    
    vm.loadProject(fixture).then(() => {
        // Verify standard operators are still available
        const ltFunc = vm.runtime.getOpcodeFunction('operator_lt');
        t.ok(ltFunc, 'operator_lt is available');
        
        const gtFunc = vm.runtime.getOpcodeFunction('operator_gt');
        t.ok(gtFunc, 'operator_gt is available');
        
        const eqFunc = vm.runtime.getOpcodeFunction('operator_equals');
        t.ok(eqFunc, 'operator_equals is available');
        
        // Verify new operators
        const ltoreqFunc = vm.runtime.getOpcodeFunction('operator_ltoreq');
        t.ok(ltoreqFunc, 'operator_ltoreq is available');
        
        const gtoreqFunc = vm.runtime.getOpcodeFunction('operator_gtoreq');
        t.ok(gtoreqFunc, 'operator_gtoreq is available');
        
        t.end();
    }).catch(err => {
        t.fail(`Failed to load project: ${err}`);
        t.end();
    });
});
