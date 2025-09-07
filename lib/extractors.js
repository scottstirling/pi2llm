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

    // TODO add option to produce and send visual LLM supported file types such as png and webp
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

       if (jpgInstance.create("/tmp/" + tmpJpgFilename)) { // TODO: is this OK with empty string? No.  Need a OS-neutral way to create a temp file. TODO
            if (jpgInstance.writeImage(workingImage.image)) {

                // DEBUG
                 console.writeln("Compression successful. Byte array length: ", compressedData.length, " bytes.");

            } else {
                 console.criticalln("Failed to write image data to in-memory JPEG instance.");
                 return null;
            }
            jpgInstance.close();

            let file = new File();
            file.openForReading("/tmp/" + tmpJpgFilename); // TODO hardcoded tmp dir
            compressedData = File.readFile("/tmp/" + tmpJpgFilename);
            file.close();

            // Delete the temporary file.
            File.remove("/tmp/" + tmpJpgFilename); // TODO hardcoded tmp dir

        } else {
            console.criticalln("Failed to create in-memory JPEG instance.");
            return null;
        }

        // --- 5. Base64 Encode and Format ---
        let base64String = compressedData.toBase64();
        // DEBUG
        console.writeln("Base64 encoded image completed."); // outputs a LOT of data

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
        // if (workingImage.image.isLinear) {
        if (true) { // TODO: make condtional on whether the image is already nonlinear

            console.writeln("Image is linear, applying auto-stretch...");

            let stf = newView.stf;

            // TODO: not sure why these are needed but copied from Blend.js
   var low = (stf[0][1] + stf[1][1] + stf[2][1]) / 3;
   var mtf = (stf[0][0] + stf[1][0] + stf[2][0]) / 3;
   var hgh = (stf[0][2] + stf[1][2] + stf[2][2]) / 3;

   if (low > 0 || mtf != 0.5 || hgh != 1) {// if not an identity transformation
            // Use HistogramTransformation to apply the stretch
            let ht = new HistogramTransformation;
            // see https://pixinsight.com/forum/index.php?threads/pjsr-drawing-image-into-graphics-with-stf.1289/post-7368
      ht.H = [
         [  0, 0.5, 1, 0, 1],
         [  0, 0.5, 1, 0, 1],
         [  0, 0.5, 1, 0, 1],
         [low, mtf, hgh, 0, 1],
         [  0, 0.5, 1, 0, 1]
      ];
      ht.executeOn(newView, false);
   }
        }

/*            var wtmp = new ImageWindow( 1, 1, 1, newView.image.bitsPerSample, newView.image.sampleType == SampleType_Real, false, "STFWindow" );
            var v = wtmp.mainView;

            v.beginProcess( UndoFlag_NoSwapFile );
            v.image.assign( newView.image );
            v.endProcess();

           with (newView) {
           beginProcess( UndoFlag_NoSwapFile );
           ht.executeOn(v, false);
           image.assign( v.image );
           endProcess();
           wtmp.show(); // DEBUG
           }
          // wtmp.forceClose();
        }
*/
   // Show the new image window.
   newWindow.show(); // for DEBUG
   // Zoom to optimal fit for better viewing.
   newWindow.zoomToOptimalFit(); // for DEBUG

   // newWindow.forceClose(); // comment out for DEBUG

    return newView; // Return the new ImageView object
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
