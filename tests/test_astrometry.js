#include <pjsr/DataType.jsh>


function main() {
    console.show();
    console.clear();
    console.writeln("--- Astrometry Test Script ---");

    let window = ImageWindow.activeWindow;
    if (window.isNull) {
        console.criticalln("No active image window found. Please open a solved image.");
        return;
    }
    console.writeln("Found active window: ", window.mainView.id);
    console.writeln("-----------------------------------------");

    console.writeln("Creating and executing ImageMetadata object...");
    let metadata = new ImageMetadata();
    metadata.ExtractMetadata(window);

    console.writeln("Testing 'metadata.astrometricSolution.isValid'...");
    let isValid = metadata.astrometricSolution.isValid;
    console.writeln("  Result: ", isValid);

    if (isValid) {
        console.writeln("  SUCCESS: Got a valid solution object.");
        console.writeln("    RA:  ", metadata.astrometricSolution.ra.toString());
        console.writeln("    Dec: ", metadata.astrometricSolution.dec.toString());
        console.writeln("    Scale: ", metadata.astrometricSolution.scale);
    } else {
        console.writeln("  ImageMetadata reports no astrometric solution.");
    }

    console.writeln("\n--- Test Finished ---");
}

main();
