// /scripts/gemini/test_settings.js
// A minimal script to test the core Settings API.

function testSettingsApi() {
    console.show();
    console.clear();
    console.writeln("--- Starting Settings API Test ---");

    try {
        let testKey = "MyTestApp/testValue";

        // Test 1: Check if the Settings object exists.
        if (typeof Settings === 'undefined') {
            console.criticalln("FATAL: The 'Settings' object does not exist.");
            return;
        }
        console.writeln("OK: The 'Settings' object exists.");

        // Test 2: Check if the '.has' method exists on the object.
        if (typeof Settings.has !== 'function') {
            console.criticalln("FATAL: 'Settings.has' is not a function.");
            console.writeln("Available properties on Settings object are: ", Object.keys(Settings).join(", "));
            return;
        }
        console.writeln("OK: 'Settings.has' is a function.");

        // Test 3: Attempt to call the function.
        let hasIt = Settings.has(testKey);
        console.writeln("OK: Settings.has('", testKey, "') executed successfully.");
        console.writeln("Result: ", hasIt);

    } catch (e) {
        console.criticalln("An unexpected error occurred: ", e);
    }

    console.writeln("--- Settings API Test Finished ---");
}

testSettingsApi(); 
