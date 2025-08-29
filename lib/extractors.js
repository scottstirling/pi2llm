// /lib/extractors.js

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
