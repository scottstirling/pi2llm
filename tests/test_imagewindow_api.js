// /scripts/gemini/test_imagewindow_api.js
// A "kitchen sink" diagnostic tool to call every available method on the
// active ImageWindow object and log the results.

function main() {
    console.show();
    console.clear();
    console.writeln("--- ImageWindow API Probe Initialized ---");

    // Get the active window.
    let window = ImageWindow.activeWindow;
    if (window.isNull) {
        console.criticalln("No active image window found. Please open an image to test.");
        return;
    }
    console.writeln("Probing active window for view: ", window.mainView.id);
    console.writeln("==================================================");

    // Get a list of all properties on the ImageWindow object.
    let props = [];
    for (let p in window) {
        props.push(p);
    }
    props.sort(); // Sort alphabetically for a clean report.

    // Iterate through each property.
    for (let i = 0; i < props.length; ++i) {
        let propName = props[i];
        let propValue;
        let propType;

        try {
            propValue = window[propName];
            propType = typeof propValue;
        } catch (e) {
            console.criticalln("ERROR reading property '", propName, "': ", e);
            continue;
        }

        // We are only interested in methods (functions).
        if (propType === 'function') {
            console.writeln("\n>>> Testing Method: window." + propName + "()");

            // We need to figure out how many arguments the function expects.
            // This is a bit of a hack, but it's the best we can do in PJSR.
            // We'll try calling it with zero arguments first.
            try {
                // Call the method and capture the result.
                let result = window[propName]();

                console.writeln("  - Called with 0 arguments.");

                // Log the result in a readable way.
                if (result === null) {
                    console.writeln("  - Result: null");
                } else if (result === undefined) {
                    console.writeln("  - Result: undefined");
                } else if (typeof result.toString === 'function' && typeof result !== 'object') {
                    console.writeln("  - Result: ", result.toString());
                } else {
                    // For complex objects, just log the type.
                    console.writeln("  - Result Type: ", typeof result);
                    // Try to see if it has properties we can list.
                    let resultProps = Object.keys(result);
                    if (resultProps.length > 0) {
                        console.writeln("  - Result Properties: ", resultProps.join(", "));
                    }
                }

            } catch (e) {
                // If the call fails, it probably needed arguments.
                // We log this as a warning instead of a crash.
                console.warning("  - WARN: Calling with 0 arguments failed. Method likely requires parameters.");
                console.warning("  - Error: ", e.message);
            }

        } else {
            // If it's not a function, just log the property and its value.
            // console.writeln("\n* Property: " + propName + " (" + propType + ")");
            // console.writeln("  - Value: ", propValue);
        }
    }

    console.writeln("\n==================================================");
    console.writeln("--- ImageWindow API Probe Finished ---");
}

main();
