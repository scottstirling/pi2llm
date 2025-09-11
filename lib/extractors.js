// /lib/extractors.js

#include <pjsr/Interpolation.jsh>
#include <pjsr/ResizeMode.jsh>

/**
 * A class to prepare an image view for submission to a visual LLM.
 * Handles stretching, resizing, JPEG compression and base64-encoded byte array.
 */
function ImagePreparer(view) {

    this.view = view;

    const newViewBaseId = "_llmscript";
    let tmpJpgFilename = newViewBaseId + this.view.id + ".jpg";

    // TODO add option to produce and send other visual LLM supported file types such as png and webp
    let tmpWebpFilename = newViewBaseId + this.view.id + ".webp";
    let tmpPngFilename = newViewBaseId + this.view.id + ".png";

    this.prepare = function(maxDimension) {
        if (!this.view || this.view.isNull) {
            return null;
        }
        console.writeln("Preparing image for visual LLM...");

        // --- 1. Create a memory clone to work on ---
        let workingImage = cloneView(this.view, newViewBaseId, maxDimension);

        // DEBUG
        console.writeln("workingImage: "+ workingImage);
        console.writeln("tmpJpgFilename: "+ tmpJpgFilename);

        // TODO: figure out how to reliably determine whether an image is linear or stretched, or expose an option to AutoSTF it

        // --- 4. In-Memory JPEG Compression ---
        console.writeln("Performing in-memory JPEG compression...");
        let jpgFormat = new FileFormat(".jpg", false, true); // (ext, isRead, isWrite)
        let jpgInstance = new FileFormatInstance(jpgFormat);
        let compressedData = new ByteArray();

        let outputFilePath = File.systemTempDirectory + '/' + tmpJpgFilename;

       if (jpgInstance.create(outputFilePath)) {
            if (jpgInstance.writeImage(workingImage.image)) {

                // DEBUG
                 console.writeln("Compression successful. Byte array length: ", compressedData.length, " bytes.");

            } else {
                 console.criticalln("Failed to write image data to in-memory JPEG instance.");
                 return null;
            }
            jpgInstance.close();

            let file = new File();
            file.openForReading(outputFilePath);
            compressedData = File.readFile(outputFilePath);
            file.close();

            // Delete the temporary file.
            File.remove(outputFilePath);

        } else {
            console.criticalln("Failed to create in-memory JPEG instance.");
            return null;
        }

        // --- 5. Base64 Encode and Format ---
        let base64String = compressedData.toBase64();
        // DEBUG
        console.writeln("Base64 encoded image completed.");

        return "data:image/jpeg;base64," + base64String;
    };
}

/**
 * cloneView()
 * See https://pixinsight.com/forum/index.php?threads/unable-to-copy-and-resample-image.274/ for more details.
 */
function cloneView(sourceView, newId, maxDimension) {

   // Create a new ImageWindow with the same properties as the source.
   // The 'newId' parameter provides a unique identifier for the new window.
   var newWindow = new ImageWindow(
      1, // Placeholder width, will be updated by image.assign
      1, // Placeholder height, will be updated by image.assign
      1, // Placeholder number of channels, will be updated by image.assign
      sourceView.image.bitsPerSample,
      sourceView.image.sampleType == SampleType_Real,
      // sourceView.image.colorSpace != ColorSpace_Gray, // True if RGB, false if grayscale
      false,
      newId // Unique identifier for the new image window
   );

   // Get the main view of the newly created window.
   var newView = newWindow.mainView;

with (newView) {
   // Begin a process on the new view to prevent swap file usage during assignment.
   beginProcess(UndoFlag_NoSwapFile);

   // Assign the image data from the source view to the new view.
   image.assign(sourceView.image);
   // End the process.
  // endProcess();

        // --- 2. Resize if Necessary ---
        let width = image.width;
        let height = image.height;

        console.writeln("config maxDimension: " + maxDimension);
        console.writeln("working image width: " + width);
        console.writeln("working image height: " + height);

        if (width > maxDimension || height > maxDimension) {
            console.writeln("Resizing image from ", width, "x", height, " to max dimension ", maxDimension);
            let newWidth, newHeight;
            if (width > height) {
                newWidth = maxDimension;
                newHeight = Math.round(height * (maxDimension / width));
            } else {
                newWidth = Math.round(width * (maxDimension / height));
                newHeight = maxDimension;
            }

            //beginProcess( UndoFlag_NoSwapFile );
            // TODO: test and apply max dimensions from configuration
            image.resample( newWidth, newHeight, ResizeMode_AbsolutePixels);
            endProcess();

            console.writeln("Resized to ", image.width, " x ", image.height);
        }
}
        // --- 3. Auto-Stretch if Linear ---
        /* if (workingImage.image.isLinear) {
            console.writeln("Image is linear, applying auto-stretch...");
            // TODO

        } */

   // DEBUG: Show the new image window.
   newWindow.show(); // uncomment for DEBUG
   // Zoom to optimal fit for better viewing.
   newWindow.zoomToOptimalFit(); // uncomment for DEBUG
   // newWindow.forceClose(); // comment out for DEBUG

    return newView;
}

/**
 * An extractor for reading the FITS keyword list from an image.
 * @param {ImageWindow} window The window whose file will be read.
 */
function FitsKeywordExtractor(window) {
    this.window = window;

    this.extract = function() {
        let keywords = [];
        // This process only works if the image has a file path.
        if (!this.window.filePath || this.window.filePath.length === 0) {
            console.writeln("Image has no file path; skipping raw FITS keyword extraction.");
            return keywords; // Return empty array for in-memory images
        }

        console.writeln("Performing raw FITS keyword extraction from file: ", this.window.filePath);
        let file = new FileFormat(File.extractExtension(this.window.filePath), true, false);
        if (file.isNull) {
            console.criticalln("Unable to instantiate FileFormat for keyword extraction.");
            return keywords;
        }

        let instance = new FileFormatInstance(file);
        if (instance.isNull) {
            console.criticalln("Unable to instantiate FileFormatInstance for keyword extraction.");
            return keywords;
        }

        // Open the file to read its properties, but not the full image data.
        if (instance.open(this.window.filePath, "verbosity 0")) {
            if (instance.keywords.length > 0) {
                // Convert the raw keyword objects into our clean DTO format.
                keywords = instance.keywords.map(function(keyword) {
                    return {
                        name: keyword.name,
                        value: keyword.value.trim(),
                        comment: keyword.comment.trim()
                    };
                });
            }
            instance.close();
        } else {
            console.criticalln("Failed to open the image file to read keywords.");
        }

        console.writeln("Found " + keywords.length + " raw FITS keywords.");
        return keywords;
    };
}
