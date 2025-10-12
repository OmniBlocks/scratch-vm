const {test} = require('tap');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');

// Test that removed comparison operators (ltoreq, gtoreq) are not compiled
test('Compiler does not handle removed ltoreq/gtoreq operators', t => {
    const vm = new VM();
    
    // Try to load a project that would have used these operators
    // Since they're removed, the compiler should not try to compile them
    const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'default.sb3'));
    
    vm.loadProject(fixture).then(() => {
        // Verify that the compiler primitives don't include these operators
        const operatorsPrimitives = vm.runtime.getOpcodeFunction('operator_ltoreq');
        t.notOk(operatorsPrimitives, 'operator_ltoreq should not be available');
        
        const operatorsPrimitives2 = vm.runtime.getOpcodeFunction('operator_gtoreq');
        t.notOk(operatorsPrimitives2, 'operator_gtoreq should not be available');
        
        t.end();
    }).catch(err => {
        t.fail(`Failed to load project: ${err}`);
        t.end();
    });
});

test('Standard comparison operators still work', t => {
    const vm = new VM();
    
    const fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'default.sb3'));
    
    vm.loadProject(fixture).then(() => {
        // Verify standard operators are still available
        const ltFunc = vm.runtime.getOpcodeFunction('operator_lt');
        t.ok(ltFunc, 'operator_lt is available');
        
        const gtFunc = vm.runtime.getOpcodeFunction('operator_gt');
        t.ok(gtFunc, 'operator_gt is available');
        
        const eqFunc = vm.runtime.getOpcodeFunction('operator_equals');
        t.ok(eqFunc, 'operator_equals is available');
        
        t.end();
    }).catch(err => {
        t.fail(`Failed to load project: ${err}`);
        t.end();
    });
});

const VM = VirtualMachine;