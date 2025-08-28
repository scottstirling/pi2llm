// test image processing history
//
// See thread at https://pixinsight.com/forum/index.php?threads/pjsr-any-access-to-the-history.6349/post-44518

/**
 * From obj.toString(): "[object ProcessName]"
 *             To name:  "ProcessName"
 */
function getName(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function printProcessContainer(processContainer) {
    var process;
    var ordinal = 1;

    for (let i = 0; i < processContainer.length; i++) {

        process = processContainer.at(i);

        /**
         * Script processes show up named as "Script" but typically contain a filePath to the actual script.
         * Some scripts have information (ImageSolver), some do not (Delinear).
         */
        if (process instanceof Script) {

            let processName = process.filePath.split('/').pop();

            console.writeln( ( ordinal++ ) + ". Script " + processName + ", at " + process.filePath );

        } else {
            console.writeln( ( ordinal++ ) + ". " + this.getName( process ) );
        }
    }
}

function main() {

    const testViewName = "orion_347x_08_21_2025_drz_ADBE"; // "orion_347x_08_21_2025_drz"

    var v = View.viewById( testViewName );

    // ordered set of process instances executed creating the view in PixInsight, either loaded
    // from XISF image file when opened, or executed during processing to create a new view
    let initialProcessContainer = v.initialProcessing;

    // process instances that have been executed on a view after its initialization or file opening in PixInsight
    let postProcessContainer = v.processing;

    // DEBUG details with all parameter settings, including every image path in DrizzleIntegration, e.g.
    // console.writeln("processContainer.toSource(): " + processContainer.toSource() );

    // DEBUG how many processes in this processContainer
    // console.writeln("processContainer.length: " + processContainer.length);

    console.show();

    console.writeln("View processing history (initial): ");

    printProcessContainer(initialProcessContainer);

    console.writeln("View processing history (since initial): ");

    printProcessContainer(postProcessContainer);
}

main();
