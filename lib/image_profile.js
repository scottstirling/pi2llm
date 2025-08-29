// /lib/image_profile.js
// This file defines the core data structure for our application: the ImageProfile class.

// This provides the ImageMetadata class.
// This path is for your Linux system. Users on other OSes may need to adjust it
// in the configuration dialog if their installation is non-standard.
#define SETTINGS_MODULE "SOLVER"

// #include "/opt/PixInsight/src/scripts/AdP/WCSmetadata.jsh"
#include <../src/scripts/AdP/WCSmetadata.jsh>

/**
 * A comprehensive data profile for a single PixInsight image view.
 *
 * This class encapsulates information about the PixInsight environment and a
 * specific image, providing a data structure to be used throughout the
 * application and for serialization to the LLM.
 *
 * @param {ImageWindow} window The PixInsight ImageWindow object to be profiled.
 */
function ImageProfile(window) {
    // --- Private Properties ---
    this._window = window;
    this._view = window.mainView;
    this._isExtracted = false; // Flag to ensure extraction only runs once.

    // --- Public Data Properties (will be populated by .extract()) ---
    this.environment = {};
    this.image = {};
    this.astrometry = {};
    this.sensor = {};
    this.processingHistory = {};
    this.fitsKeywords = [];


    /**
     * Performs the data and metadata extraction from the PixInsight environment and
     * the associated ImageWindow. This is the primary "workhorse" method.
     */
    this.extract = function() {
        if (this._isExtracted) {
            return;
        }

        console.writeln("--- Extracting image profile for view: ", this._view.id, " ---");

        // --- Environment Profile ---
        this.environment = {
            pixinsightVersion: CoreApplication.programName + " " + CoreApplication.versionMajor + "." + CoreApplication.versionMinor,
            platform: CoreApplication.platform
        };

        // --- Image Profile ---
        this.image = {
            id: this._view.id,
            filePath: this._window.filePath || "In-memory view",
            dimensions: this._view.image.width + "x" + this._view.image.height,
            isColor: this._view.image.isColor,
            colorSpace: this._view.image.colorSpace.toString()
        };

        // --- ImageMetadata Extraction ---
        let metadata = new ImageMetadata();
        metadata.ExtractMetadata(this._window);

        // --- FITSKeywordExtractor ---
        this.fitsKeywords = new FitsKeywordExtractor(this._window).extract();

        // --- Astrometry and Sensor Parsing ---
        let isSolved = (typeof metadata.ra === 'number');
        this.astrometry = {
            isPlateSolved: isSolved,
            RA: isSolved ? metadata.ra.toString() : null,
            Dec: isSolved ? metadata.dec.toString() : null,
            resolution: isSolved ? metadata.resolution : null,
            focalLength: isSolved ? metadata.focal : null
        };
        this.sensor = {
            pixelSize: isSolved ? metadata.xpixsz : null
        };

        // --- FITS Keywords and History Parsing ---
        if (metadata.keywords) {
            for (let i = 0; i < metadata.keywords.length; ++i) {
                let k = metadata.keywords[i];
                this.fitsKeywords.push({ name: k[0], value: k[1], comment: k[2] });
                if (k[0] === 'HISTORY') {
                    if (!this.processingHistory.fileHistory) this.processingHistory.fileHistory = [];
                    this.processingHistory.fileHistory.push(k[1]);
                }
            }
        }

        // --- Live History (from View.initialProcessing and View.processing) ---
        let initialProcessing = this._view.initialProcessing;
        let initialProcessingHistory = [];
        var process;
        var processName;

        if (initialProcessing && initialProcessing.length > 0) {
            for (let i = 0; i < initialProcessing.length; ++i) {

                process = initialProcessing.at(i);

                if (process instanceof Script) {
                    processName = process.filePath.split('/').pop();
                    initialProcessingHistory.push({
                        step: i + 1,
                        script: processName
                    });
                } else {
                    processName = this.getName( process );
                    initialProcessingHistory.push({
                        step: i + 1,
                        process: processName
                    });
                }
            }
            this.processingHistory.initialProcesssing = initialProcessingHistory;
        }


        let processing = this._view.processing;
        let liveHistory = [];

        if (processing && processing.length > 0) {
            for (let i = 0; i < processing.length; ++i) {

                process = processing.at(i);

                if (process instanceof Script) {
                    processName = process.filePath.split('/').pop();
                    liveHistory.push({
                        step: i + 1,
                        script: processName
                    });
                } else {
                    processName = this.getName( process );
                    liveHistory.push({
                        step: i + 1,
                        process: processName
                    });
                }
            }
            this.processingHistory.liveSession = liveHistory;
        }

        this._isExtracted = true;

        console.writeln("--- Image profile extraction complete. ---");
        // DEBUG
        // console.writeln("--- this.toString() ---");
        // console.writeln( this );
        // console.writeln("--- JSON.stringify( this.toJSON() ) ---");
        // console.writeln( JSON.stringify( this ) );
    };

    /**
     * Overrides the default toString() method to provide a human-readable
     * summary of the image profile. Useful for console logging.
     * @returns {string} A formatted string summary.
     */
    this.toString = function() {
        this.extract(); // Ensure data is extracted
        let s = "ImageProfile for View '" + this.image.id + "'\n";
        s += "  - Dimensions: " + this.image.dimensions + (this.image.isColor ? " (Color)\n" : " (Grayscale)\n");
        s += "  - Plate Solved: " + this.astrometry.isPlateSolved + "\n";
        if (this.astrometry.isPlateSolved) {
            s += "    - RA: " + this.astrometry.RA + "\n";
            s += "    - Dec: " + this.astrometry.Dec + "\n";
        }
        s += "  - Live History Steps: " + this.processingHistory.liveSession.length + "\n";
        s += "  - FITS Keywords: " + this.fitsKeywords.length;
        return s;
    };

    /**
     * Returns a JSON-serializable representation of the profile.
     * This method is automatically called by JSON.stringify().
     * @returns {object} A DTO suitable for sending to the LLM.
     */
    this.toJSON = function() {
        this.extract(); // Ensure data is extracted
        return {
            environment: this.environment,
            image: this.image,
            astrometry: this.astrometry,
            sensor: this.sensor,
            processingHistory: this.processingHistory,
            fitsKeywords: this.fitsKeywords,
        };
    };

    /**
     * From obj.toString(): "[object ProcessName]"
     *             To name:  "ProcessName"
     */
    this.getName = function(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
    }
}
