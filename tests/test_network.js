// /scripts/gemini/test_network.js
// A minimal script to find the correct API for NetworkTransfer, definitively.

function testNetworkApi() {
    console.show();
    console.clear();
    console.writeln("--- Starting Network API Test ---");

    try {
        // Test 1: Create the object.
        let transfer = new NetworkTransfer();
        console.writeln("OK: new NetworkTransfer() created.");

        // Test 2: Dump every single property and method available on the object.
        console.writeln("--- DUMPING ALL NetworkTransfer PROPERTIES ---");
        for (let prop in transfer) {
            console.writeln(prop + " : " + typeof transfer[prop]);
        }
        console.writeln("--- END OF DUMP ---");

    } catch (e) {
        console.criticalln("An unexpected error occurred: ", e);
    }

    console.writeln("--- Network API Test Finished ---");
}

testNetworkApi();
