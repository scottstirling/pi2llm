// /lib/extractors.js

#include <pjsr/DataType.jsh>

// This provides the ImageMetadata class.
// This path is for your Linux system. Users on other OSes may need to adjust it
// in the configuration dialog if their installation is non-standard.
#define SETTINGS_MODULE "SOLVER"
#include "/opt/PixInsight/src/scripts/AdP/WCSmetadata.jsh"

/*
 * ProcessingHistoryExtractor: A new, powerful extractor that gets both live
 * session history (from View.processing) and file-based history (from FITS keywords).
 */
function ProcessingHistoryExtractor(view, keywords) {
    this.view = view;
    this.keywords = keywords;

    this.extract = function() {
        let liveHistory = [];
        let fileHistory = [];

        // --- 1. Extract Live Session History ---
        if (this.view.processing && this.view.processing.length > 0) {
            console.writeln("Found " + this.view.processing.length + " steps in live session history.");
            for (let i = 0; i < this.view.processing.length; ++i) {
                let historyItem = this.view.processing[i];
                // The historyItem is a ProcessInstance, we can get its ID.
                liveHistory.push({
                    step: i + 1,
                    process: historyItem.processId
                    // Note: We could extract full parameters here in a future version if needed.
                });
            }
        }

        // --- 2. Extract File-Based History (The fallback method) ---
        if (this.keywords) {
            for (let i = 0; i < this.keywords.length; ++i) {
                if (this.keywords[i][0] === 'HISTORY') {
                    fileHistory.push(this.keywords[i][1]);
                }
            }
        }

        return {
            liveSessionHistory: liveHistory,
            fileHistory: fileHistory
        };
    };
}


/*
 * createFocusedImageProfile: The main orchestrator, now updated.
 */
function createFocusedImageProfile(window) {
    if (!window || window.isNull) {
        return null;
    }

    let view = window.mainView;
    let config = new Configuration(); // Assuming config is loaded in the main script
    config.load();


    // --- 1. Environment Profile ---
    const environment = {
        pixinsightVersion: CoreApplication.programName,
        platform: CoreApplication.platform,
        installPath: CoreApplication.baseDirPath
    };

    // --- 2. Image Profile ---
    let imageProfile = {
        id: view.id,
        filePath: window.filePath || "In-memory view",
        dimensions: view.image.width + "x" + view.image.height,
        isColor: view.image.isColor,
        colorSpace: view.image.colorSpace.toString()
    };

    // --- 3. ImageMetadata Extraction (Proven to work) ---
    let metadata = new ImageMetadata();
    metadata.ExtractMetadata(window);

    // --- 4. Get Comprehensive History using our new extractor ---
    let processingHistory = new ProcessingHistoryExtractor(view, metadata.keywords).extract();

    // --- 5. Parse Verified Metadata Properties ---
    let isSolved = (typeof metadata.ra === 'number');
    let astrometry = {
        isPlateSolved: isSolved,
        RA: isSolved ? metadata.ra.toString() : null,
        Dec: isSolved ? metadata.dec.toString() : null,
        resolution: isSolved ? metadata.resolution : null,
        focalLength: isSolved ? metadata.focal : null
    };

    let sensor = {
        pixelSize: isSolved ? metadata.xpixsz : null
    };

    let rawKeywords = [];
    if (metadata.keywords) {
        for (let i = 0; i < metadata.keywords.length; ++i) {
            rawKeywords.push({ name: metadata.keywords[i][0], value: metadata.keywords[i][1], comment: metadata.keywords[i][2] });
        }
    }

    // --- 4. Get Comprehensive History using our new extractor ---
    let processingHistory = new ProcessingHistoryExtractor(view, metadata.keywords).extract();


    // --- 5. Assemble the Final DTO ---
    const finalDTO = {
        environment: environment,
        image: imageProfile,
        astrometry: astrometry,
        sensor: sensor,
        processingHistory: processingHistory, // <-- The new, rich history object
        fitsKeywords: rawKeywords
        // We are removing Quality/Statistics for now to focus on the core data, as requested.
    };

    return finalDTO;
}
