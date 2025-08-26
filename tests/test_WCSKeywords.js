// /scripts/gemini/test_wcs.js
// A focused diagnostic tool to definitively test the availability and output
// of the WCSKeywords class in the PJSR environment.

//#include <pjsr/WCSKeywords.jsh> // Include the necessary header

function main() {
    console.show();
    console.clear();
    console.writeln("--- WCSKeywords API Test Initialized ---");

    // 1. Get the active window and view.
    let window = ImageWindow.activeWindow;
    if (window.isNull) {
        console.criticalln("FAILURE: No active image window found. Please open a solved image.");
        return;
    }
    let view = window.mainView;
    console.writeln("Found active view: ", view.id);
    console.writeln("========================================");

    // 2. Test if the WCSKeywords class exists.
    try {
        console.writeln("\n>>> PROBE 1: new WCSKeywords()");
        let wcs = new WCSKeywords;
        console.writeln("  - SUCCESS: The WCSKeywords object was created successfully.");

        // 3. Test the .extract() method.
        console.writeln("\n>>> PROBE 2: wcs.extract(view)");
        let success = wcs.extract(view);
        if (success) {
            console.writeln("  - SUCCESS: .extract(view) returned true.");

            // 4. Dump all discovered properties from the populated object.
            console.writeln("\n--- DUMPING all properties of the populated wcs object ---");
            let propertyCount = 0;
            for (let prop in wcs) {
                // We only care about non-function properties for the data dump.
                if (typeof wcs[prop] !== 'function') {
                    let value = wcs[prop];
                    let type = typeof value;
                    console.writeln("  - " + prop + " (" + type + "): " + value);
                    propertyCount++;
                }
            }
            if(propertyCount == 0){
                console.writeln("  - No readable properties found. This may be expected.");
            }
            console.writeln("--- END OF DUMP ---");

        } else {
            console.criticalln("  - FAILURE: .extract(view) returned false. No WCS solution could be extracted from this view.");
        }
    } catch (e) {
        console.criticalln("  - CRASH: An error occurred during the test: ", e);
        console.criticalln("  - DIAGNOSIS: The WCSKeywords object is likely not available in this context.");
    }

    console.writeln("\n========================================");
    console.writeln("--- WCSKeywords API Test Finished ---");
}

main();
