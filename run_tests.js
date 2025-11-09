// Simple test runner to verify our extensionRuntimeOptions fix
const Runtime = require('./src/engine/runtime');

console.log('=== Testing extensionRuntimeOptions Fix ===\n');

// Test 1: Basic Runtime instantiation
console.log('Test 1: Runtime instantiation');
try {
    const runtime = new Runtime();
    console.log('✓ Runtime created successfully');
    
    // Test 2: extensionRuntimeOptions exists
    if (runtime.extensionRuntimeOptions !== undefined) {
        console.log('✓ extensionRuntimeOptions is defined');
    } else {
        console.log('✗ extensionRuntimeOptions is undefined');
        process.exit(1);
    }
    
    // Test 3: extensionRuntimeOptions is an object
    if (typeof runtime.extensionRuntimeOptions === 'object' && runtime.extensionRuntimeOptions !== null) {
        console.log('✓ extensionRuntimeOptions is an object');
    } else {
        console.log('✗ extensionRuntimeOptions is not an object');
        process.exit(1);
    }
    
    // Test 4: Can access javascriptUnsandboxed without error (the original issue)
    try {
        const unsandboxed = runtime.extensionRuntimeOptions.javascriptUnsandboxed;
        console.log('✓ Can access javascriptUnsandboxed property without error');
        console.log(`  Value: ${unsandboxed} (should be undefined initially)`);
    } catch (error) {
        console.log('✗ Error accessing javascriptUnsandboxed:', error.message);
        process.exit(1);
    }
    
    // Test 5: Can evaluate the condition from the JavaScript extension
    try {
        const condition = runtime.extensionRuntimeOptions.javascriptUnsandboxed === true;
        console.log('✓ Can evaluate condition without error');
        console.log(`  Condition result: ${condition} (should be false initially)`);
    } catch (error) {
        console.log('✗ Error evaluating condition:', error.message);
        process.exit(1);
    }
    
    // Test 6: Can set and read the property
    try {
        runtime.extensionRuntimeOptions.javascriptUnsandboxed = true;
        const condition = runtime.extensionRuntimeOptions.javascriptUnsandboxed === true;
        console.log('✓ Can set and read javascriptUnsandboxed property');
        console.log(`  Condition result after setting to true: ${condition}`);
    } catch (error) {
        console.log('✗ Error setting/reading property:', error.message);
        process.exit(1);
    }
    
    // Test 7: Multiple Runtime instances have separate extensionRuntimeOptions
    try {
        const runtime2 = new Runtime();
        runtime.extensionRuntimeOptions.test1 = 'value1';
        runtime2.extensionRuntimeOptions.test2 = 'value2';
        
        if (runtime.extensionRuntimeOptions.test1 === 'value1' && 
            runtime2.extensionRuntimeOptions.test2 === 'value2' &&
            runtime.extensionRuntimeOptions.test2 === undefined &&
            runtime2.extensionRuntimeOptions.test1 === undefined) {
            console.log('✓ Multiple Runtime instances have separate extensionRuntimeOptions');
        } else {
            console.log('✗ Runtime instances share extensionRuntimeOptions (unexpected)');
            process.exit(1);
        }
    } catch (error) {
        console.log('✗ Error testing multiple instances:', error.message);
        process.exit(1);
    }
    
} catch (error) {
    console.log('✗ Error creating Runtime:', error.message);
    process.exit(1);
}

console.log('\n=== All Tests Passed! ===');
console.log('The extensionRuntimeOptions fix is working correctly.');
console.log('The JavaScript extension should no longer throw TypeError when accessing extensionRuntimeOptions.javascriptUnsandboxed');