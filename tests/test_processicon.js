// /scripts/gemini/test_processicon.js
// A minimal script to find the correct API for accessing process icons.

function findProcessIconApi() {
    console.show();
    console.clear();
    console.writeln("--- Starting ProcessIcon API Test ---");

    try {
        // Test 1: Check for a global 'ProcessIcon' object (uppercase P)
        if (typeof ProcessIcon !== 'undefined') {
            console.writeln("SUCCESS: Found a global object named 'ProcessIcon'.");
            if (typeof ProcessIcon.icons !== 'undefined') {
                console.writeln("--> SUCCESS: It has a '.icons' property.");
                console.writeln("--> Type of .icons:", typeof ProcessIcon.icons);
                console.writeln("--> Number of icons:", ProcessIcon.icons.length);
            } else {
                console.criticalln("--> FAILURE: It does NOT have a '.icons' property.");
            }
            return;
        }

        // Test 2: Check for a global 'processIcon' object (lowercase p)
        if (typeof processIcon !== 'undefined') {
            console.writeln("SUCCESS: Found a global object named 'processIcon'.");
            if (typeof processIcon.icons !== 'undefined') {
                console.writeln("--> SUCCESS: It has a '.icons' property.");
            } else {
                console.criticalln("--> FAILURE: It does NOT have a '.icons' property.");
            }
            return;
        }

        // Test 3: If both fail, dump the entire global namespace to find the right name.
        console.criticalln("FAILURE: No object named 'ProcessIcon' or 'processIcon' was found.");
        console.writeln("--- DUMPING GLOBAL NAMESPACE TO FIND CORRECT OBJECT ---");
        let globalKeys = Object.keys(this).sort();
        for (let i = 0; i < globalKeys.length; ++i) {
            // Print keys that might be relevant
            if (globalKeys[i].toLowerCase().includes("process")) {
                console.writeln(globalKeys[i]);
            }
        }
        console.writeln("--- END OF DUMP ---");

    } catch (e) {
        console.criticalln("An unexpected error occurred: ", e);
    }

    console.writeln("--- ProcessIcon API Test Finished ---");
}

findProcessIconApi();
