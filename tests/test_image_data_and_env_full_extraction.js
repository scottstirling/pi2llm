// /scripts/gemini/test_full_extraction.js
// A definitive diagnostic tool to extract a complete profile for a selected image.


#include <pjsr/DataType.jsh>

const PXI_SRCDIR = getEnvironmentVariable("PXI_SRCDIR");

// *** Error [001]: /opt/PixInsight/src/scripts/AdP/WCSmetadata.jsh, line 783: ReferenceError: SETTINGS_MODULE is not defined
#define SETTINGS_MODULE "SOLVER"
// #include "/opt/PixInsight/src/scripts/AdP/WCSmetadata.jsh"
// #include "../AdP/WCSmetadata.jsh"


// Compatible padEnd function
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

function main() {
    console.show();
    console.writeln("--- Definitive Data Extraction Probe ---");

    let window = ImageWindow.activeWindow;
    if (window.isNull) {
        console.criticalln("FAILURE: No active image window found.");
        return;
    }
    let view = window.mainView;

    // --- 1. Environment Data (CoreApplication) ---
    console.writeln("\n=== Environment Profile ===");
    console.writeln(padEnd("PI Version:", 20), CoreApplication.programName);
    console.writeln(padEnd("PI Base Path:", 20), CoreApplication.baseDirPath);
    console.writeln(padEnd("OS Platform:", 20), CoreApplication.platform);

    // --- 2. Window and View Data ---
    console.writeln("\n=== Window & View Profile ===");
    console.writeln(padEnd("View ID:", 20), view.id);
    console.writeln(padEnd("File Path:", 20), window.filePath || "(In-memory)");
    console.writeln(padEnd("Is Color:", 20), view.image.isColor);
    console.writeln(padEnd("Dimensions:", 20), view.image.width + "x" + view.image.height);

    // --- 3. ImageMetadata Object (The Powerhouse) ---
    console.writeln("\n=== ImageMetadata Profile ===");
    let metadata = new ImageMetadata();
    metadata.ExtractMetadata(window);

    console.writeln("  --- Astrometry ---");
    let isSolved = (typeof metadata.ra === 'number');
    console.writeln(padEnd("  Is Solved:", 20), isSolved);
    if (isSolved) {
        console.writeln(padEnd("  RA:", 20), metadata.ra.toString());
        console.writeln(padEnd("  Dec:", 20), metadata.dec.toString());
        console.writeln(padEnd("  Resolution:", 20), metadata.resolution + " arcsec/px");
        // console.writeln(padEnd("  Rotation:", 20), metadata.rotation + " deg");
        console.writeln(padEnd("  Focal Length:", 20), metadata.focal + " mm");
        console.writeln(padEnd("  Pixel Size:", 20), metadata.xpixsz + " um");
    }

    console.writeln("\n  --- Acquisition ---");
    console.writeln(padEnd("  Instrument:", 20), metadata.instrument);
    console.writeln(padEnd("  Exposure:", 20), metadata.camera ? metadata.camera.exposure : "N/A");
    console.writeln(padEnd("  Gain/ISO:", 20), metadata.camera ? (metadata.camera.gain || metadata.camera.isoSpeed) : "N/A");

    // --- 4. Processing History (The Only Known Way) ---
    console.writeln("\n=== Processing History (from Keywords) ===");
    let historyKeywords = metadata.keywords.filter(function(k) { return k[0] === 'HISTORY'; });
    if (historyKeywords.length > 0) {
        for (let i = 0; i < historyKeywords.length; ++i) {
            console.writeln("  - " + historyKeywords[i][1]);
        }
    } else {
        console.writeln("  No HISTORY keywords found in metadata.");
    }

    console.writeln("\n--- Probe Finished ---");
}

main();
