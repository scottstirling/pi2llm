// /scripts/gemini/test_discover_metadata.js
// A final, definitive diagnostic tool to discover the true structure
// of the ImageMetadata object after extraction.

function main() {

    console.show();
    console.clear();
    console.writeln("--- ImageMetadata Structure Discovery ---");

    if (!ImageWindow.activeWindow) { // Check if there is an active window
       console.criticalln("FAILURE: No active image window found.");
       return;
    }

    if (!ImageWindow.activeWindow.hasAstrometricSolution) { // Check if active window has an astrometric solution
        console.writeln("active window has no astrometric solution");
    } else {
        console.writeln("active window has astrometric solution = true");
    }

    let window = ImageWindow.activeWindow;


    console.writeln("Found active window and mainView: ", window.mainView.id);
    console.writeln("=========================================");

    try {
        // Step 1:
        let metadata = new ImageMetadata();
        metadata.ExtractMetadata(window);
        console.writeln("SUCCESS: metadata.ExtractMetadata() was called.");

        // Step 2: Discover and dump all available properties on the result.
        // This makes NO assumptions about the structure.
        console.writeln("\n--- DUMPING all properties of the metadata object ---");
        for (let prop in metadata) {
            try {
                let value = metadata[prop];
                let type = typeof value;
                // For simple types, print the value. For objects, just print the type.
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    console.writeln("  - " + prop + " (" + type + "): " + value);
                } else {
                    console.writeln("  - " + prop + " (" + type + ")");
                }
            } catch (e) {
                // This will catch any errors if a property is not readable.
                console.warning("  - " + prop + " (unreadable): " + e.message);
            }
        }
        console.writeln("--- END OF DUMP ---");

    } catch (e) {
        console.criticalln("CRASH: An error occurred during the test: ", e);
    }

    console.writeln("\n========================================");
    console.writeln("--- Discovery Script Finished ---");
}

main();
