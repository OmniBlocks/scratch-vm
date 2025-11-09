// Test script to verify the extensionRuntimeOptions fix
const Runtime = require('./src/engine/runtime');

// Create a new runtime instance
const runtime = new Runtime();

// Test that extensionRuntimeOptions is initialized
console.log('Testing extensionRuntimeOptions initialization...');

// Check if the property exists
if (runtime.extensionRuntimeOptions !== undefined) {
    console.log('✓ extensionRuntimeOptions is initialized');
} else {
    console.log('✗ extensionRuntimeOptions is undefined');
    process.exit(1);
}

// Check if it's an object
if (typeof runtime.extensionRuntimeOptions === 'object') {
    console.log('✓ extensionRuntimeOptions is an object');
} else {
    console.log('✗ extensionRuntimeOptions is not an object');
    process.exit(1);
}

// Test accessing javascriptUnsandboxed property (should not throw)
try {
    const unsandboxed = runtime.extensionRuntimeOptions.javascriptUnsandboxed;
    console.log('✓ Can safely access javascriptUnsandboxed property:', unsandboxed);
} catch (error) {
    console.log('✗ Error accessing javascriptUnsandboxed:', error.message);
    process.exit(1);
}

// Test the specific condition from the JavaScript extension
try {
    const condition = runtime.extensionRuntimeOptions.javascriptUnsandboxed === true;
    console.log('✓ Can safely evaluate condition:', condition);
} catch (error) {
    console.log('✗ Error evaluating condition:', error.message);
    process.exit(1);
}

console.log('All tests passed! The fix is working correctly.');