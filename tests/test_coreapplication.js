// /scripts/gemini/test_core_static_api.js
// A definitive diagnostic tool to probe the static properties and methods
// of the CoreApplication class, written with full compatibility for PJSR.

function main() {
    console.show();
    console.clear();
    console.writeln("--- CoreApplication Static API Probe ---");
    console.writeln("========================================");

    // --- HELPER FUNCTIONS ---

    // A simple, compatible polyfill for the missing padEnd function.
    function padEnd(str, targetLength, padString) {
        str = String(str);
        targetLength = targetLength >> 0; //floor it
        padString = String((typeof padString !== 'undefined' ? padString : ' '));
        if (str.length > targetLength) {
            return str;
        } else {
            targetLength = targetLength - str.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }
            return str + padString.slice(0, targetLength);
        }
    }

    // Helper function to test and print a property
    function probeProperty(propertyName) {
        let output = "  - " + padEnd(propertyName, 30) + ": ";
        try {
            let value = CoreApplication[propertyName];
            let type = typeof value;
            if (value === undefined) {
                output += "[undefined]";
            } else if (value === null) {
                output += "[null]";
            } else {
                output += value.toString() + " (" + type + ")";
            }
            console.writeln(output);
        } catch (e) {
            console.criticalln("  - ERROR accessing " + propertyName + ": " + e.message);
        }
    }

    // Helper function to test a method
    function probeMethod(methodName) {
        let output = "  - " + padEnd(methodName, 30) + ": ";
        try {
            if (typeof CoreApplication[methodName] === 'function') {
                output += "[Function exists]";
                console.writeln(output);
            } else {
                output += "[NOT a function]";
                console.warning(output);
            }
        } catch (e) {
            console.criticalln("  - ERROR accessing " + methodName + ": " + e.message);
        }
    }


    console.writeln("\n--- Probing Static Properties ---");
    // This is a comprehensive list based on documentation
    probeProperty("acceleratedWebView");
    probeProperty("agentName");
    probeProperty("appDirPath");
    probeProperty("baseDirPath");
    probeProperty("binDirPath");
    probeProperty("caBundleFilePath");
    probeProperty("colorDirPath");
    probeProperty("dirPath");
    probeProperty("docDirPath");
    probeProperty("etcDirPath");
    probeProperty("filePath");
    probeProperty("hasPendingMessages");
    probeProperty("includeDirPath");
    probeProperty("instance");
    probeProperty("language");
    probeProperty("libDirPath");
    probeProperty("libraryDirPath");
    probeProperty("numberOfPendingMessages");
    probeProperty("pid");
    probeProperty("platform");
    probeProperty("programName");
    probeProperty("rscDirPath");
    probeProperty("srcDirPath");
    probeProperty("startTime");
    probeProperty("versionMajor");
    probeProperty("versionBeta");
    probeProperty("versionBuild");
    probeProperty("versionCodename");
    probeProperty("versionLE");
    probeProperty("versionMajor");
    probeProperty("versionMinor");
    probeProperty("versionRelease");
    probeProperty("versionRevision");


    console.writeln("\n--- Probing Static Methods ---");
    probeMethod("activateInstance");
    probeMethod("clearPendingMessages");
    probeMethod("continueAutoSaveTasks");
    probeMethod("firstInstanceAlive");
    probeMethod("instancePID");
    probeMethod("isInstanceAlive");
    probeMethod("isInstanceRunning");
    probeMethod("launchInstance");
    probeMethod("otherInstancesRunning");
    probeMethod("pauseAutoSaveTasks");
    probeMethod("processPendingMessages");
    probeMethod("sendMessage");
    probeMethod("terminateInstance");

    console.writeln("\n========================================");
    console.writeln("--- CoreApplication Static API Probe Finished ---");
}

main();
