// /lib/extractors.js

// --- Extractor Class Definitions ---

/*
 * HistoryExtractor: Gathers the processing history of a view.
 * CORRECTED to use the proper ImageWindow.history() method.
 */
function HistoryExtractor(window, view) {
    this.window = window;
    this.view = view;

    this.extract = function() {
        // The correct method: call .history() on the window, passing the view.
        let history = this.window.history(this.view);

        // The check for an undefined value, which caused the error.
        if (typeof history === 'undefined' || history === null) {
            console.writeln("Could not retrieve history for view: ", this.view.id);
            return []; // Return an empty array to prevent crashes
        }

        let historySteps = [];
        for (let i = 0; i < history.length; ++i) {
            let state = history.state(i);
            historySteps.push({
                process: state.processId,
                timestamp: state.timestamp.toISOString(),
            });
        }
        return historySteps;
    };
}

function MetadataExtractor(window) {
    this.window = window;
    this.extract = function() {
        if (this.window.filePath.length === 0) {
            console.writeln("Image window is not associated with a file. Cannot read FITS header.");
            return null;
        }
        let file = new FileFormat(File.extractExtension(this.window.filePath), true, false);
        if (file.isNull) return null;
        let instance = new FileFormatInstance(file);
        if (instance.isNull) return null;
        let keywords = [];
        if (instance.open(this.window.filePath, "verbosity 0")) {
            if (instance.keywords.length > 0) {
                keywords = instance.keywords.map(function(k) {
                    return { name: k.name, value: k.value.trim(), comment: k.comment.trim() };
                });
            }
            instance.close();
        }
        return keywords;
    };
}

/*
 * AstrometryParser: Intelligently parses astrometric data from a list of
 * FITS keywords. It does not crash if the data is not present.
 */
function AstrometryParser(keywords) {
    this.keywords = keywords;

    // Internal helper to find a keyword's value safely.
    this._findValue = function(name) {
        if (!this.keywords) return null;
        for (let i = 0; i < this.keywords.length; ++i) {
            if (this.keywords[i].name.toUpperCase() === name) {
                return this.keywords[i].value;
            }
        }
        return null;
    };

    this.extract = function() {
        // The CTYPE1 keyword is a good indicator of a WCS solution.
        // If it doesn't exist, we can be confident there's no solution.
        if (this._findValue('CTYPE1') === null) {
            return { isPlateSolved: false }; // Gracefully return "not solved"
        }

        // If it exists, then we can try to get the other values.
        let ra = this._findValue('CRVAL1');
        let dec = this._findValue('CRVAL2');

        // We can add more keywords here as needed (e.g., from the CD matrix for scale)

        return {
            RA: ra,
            Dec: dec,
            // We can parse scale, resolution, etc. in a future version.
            isPlateSolved: true
        };
    };
}

/*
 * AstrometryExtractor:
 * It tries but fails to handle both solved FITS files (from metadata) and
 * solved non-FITS files like JPG/PNG (from the live View object).
 *
 * TODO: fix someday
 */
function AstrometryExtractor(view, keywords) {

    this.view = view;
    this.keywords = keywords;

    // Internal helper to find a keyword's value safely.
    this._findValue = function(name) {
        if (!this.keywords) return null;
        for (let i = 0; i < this.keywords.length; ++i) {
            if (this.keywords[i].name.toUpperCase() === name) return this.keywords[i].value;
        }
        return null;
    };

    this.extract = function() {
        // --- PRIMARY METHOD: Check for a live, in-memory solution on the View. ---
        // This is the one that works for images solved in the current session.
        // This is the correct API that AnnotateImage uses.

        //let solution = this.view.astrometricSolution();
        let solution = this.view.getAstrometricSolution();

        if (solution !== null) {
            console.writeln("Found live astrometric solution on the View object.");
            return {
                RA: solution.ra.toString(),
                Dec: solution.dec.toString(),
                scale: solution.scale,
                resolution: solution.resolution,
                focalLength: solution.focal,
                pixelSize: solution.pixelSize,
                isPlateSolved: true,
                source: "Live View WCS"
            };
        }

        // --- FALLBACK METHOD: Parse FITS/XISF keywords from the file. ---
        // This is for images loaded from disk that were already solved.
        if (this._findValue('CTYPE1') !== null) {
            console.writeln("Found WCS keywords in file metadata.");
            return {
                RA: this._findValue('CRVAL1'),
                Dec: this._findValue('CRVAL2'),
                isPlateSolved: true,
                source: "File Keywords"
            };
        }

        // If both methods fail, there is no solution available.
        console.writeln("No astrometric solution found, either live or in file keywords.");
        return { isPlateSolved: false };
    };
}


/*
 * AcquisitionInfoExtractor: Intelligently finds key acquisition data
 * from the metadata keywords.
 */
function AcquisitionInfoExtractor(keywords) {
    this.keywords = keywords;

    // Helper function to search for a value using a list of possible keyword names
    this._findValue = function(keyNames) {
        if (!this.keywords) {
            return null;
        }
        // Replace .find() with a traditional for loop for compatibility.
        for (let i = 0; i < this.keywords.length; ++i) {
            let keyword = this.keywords[i];
            for (let j = 0; j < keyNames.length; ++j) {
                if (keyword.name.toUpperCase() === keyNames[j]) {
                    return keyword.value; // Return the value as soon as we find a match
                }
            }
        }
        return null; // Return null if no match is found after checking all keywords
    };

    this.extract = function() {
        if (!this.keywords) {
            return null;
        }

        let camera = this._findValue(['INSTRUME', 'CAMERA', 'CAMERANAME']);
        let exposure = this._findValue(['EXPTIME', 'EXPOSURE']);
        let gain = this._findValue(['GAIN', 'EGAIN', 'ISOSPEED', 'ISO']);

        return {
            cameraModel: camera,
            exposureDuration: exposure ? parseFloat(exposure) : null,
            gain_iso: gain ? parseInt(gain, 10) : null
        };
    };
}


// --- Main Data Provider ---
/*
 * ImageDataProvider: The final, correct version.
 * This uses the high-level ImageMetadata object and accesses its properties
 * using the correct, verified, flat structure.
 */
function ImageDataProvider(window, config) {
    this.window = window;
    this.view = window.mainView;
    this.config = config;
    this._dto = null;

    this.runAnalysis = function() {
        console.writeln("--- Running analysis for view: ", this.view.id, " ---");

        let metadata = new ImageMetadata();
        metadata.ExtractMetadata(this.window);

        // A robust way to check if a solution is valid is to see if 'ra' has a value.
        let isSolved = (typeof metadata.ra === 'number');

        // Now, we parse the data from the verified, flat metadata object.
        let acquisitionInfo = {
            // Note: I am removing .camera.id as it's not in your log.
            // Using .instrument seems more reliable.
            cameraModel: metadata.instrument,
            exposureDuration: metadata.camera ? metadata.camera.exposure : null,
            gain_iso: metadata.camera ? metadata.camera.gain : null
        };

        let astrometry = {
            isPlateSolved: isSolved,
            // Only populate these if a solution exists.
            RA: isSolved ? metadata.ra.toString() : null,
            Dec: isSolved ? metadata.dec.toString() : null,
            scale: metadata.resolution, // Your log shows scale is named 'resolution'
            resolution: metadata.resolution,
            focalLength: metadata.focal,
            pixelSize: metadata.xpixsz // Your log shows pixel size is 'xpixsz'
        };

        let sensorData = {
            pixelSize: metadata.xpixsz
        };

        // Convert the raw keyword list for the LLM
        let rawKeywords = [];
        if (metadata.keywords) {
           for(let i = 0; i < metadata.keywords.length; ++i) {
               let k = metadata.keywords[i];
               rawKeywords.push({name: k[0], value: k[1], comment: k[2]});
           }
        }


        this._dto = {
            id: this.view.id,
            filePath: this.window.filePath,
            isColor: this.view.image.isColor,
            width: this.view.image.width,
            height: this.view.image.height,
            acquisition: acquisitionInfo,
            astrometry: astrometry,
            sensor: sensorData,
            // quality: new QualityExtractor(this.view, this.config).extract(),
            // statistics: new StatisticsExtractor(this.view, this.config).extract(),
            history: [],
            metadata: rawKeywords
        };
        console.writeln("--- Analysis complete for view: ", this.view.id, " ---");
    };

    this.getDTO = function() {
        if (this._dto === null) {
            this.runAnalysis();
        }
        return this._dto;
    };
}
