// A minimal script to find the correct API for NetworkTransfer.
//
// for local testing, configure testURL for localhost and a free port > 1024, e.g.
// (Linux with netcat command):
//
// $ nc -l 4321
//
// The testURL path doesn't have to exist. We're just validating the network transfer one way.
//
// Refer to NetworkTransfer JSON post example in:
//  /opt/PixInsight/src/scripts/kkretzschmar/BatchFrameAcquisition/BatchFrameAcquisition.js

function testNetworkTransfer() {

    const testURL = "http://127.0.0.1:4321/foo";
    const requestData = "{\"foo\":\"bar\", \"baz\":\"bat\"}";
    let customHeaders = ["Content-Type: application/json; charset=utf-8",
                        "Accept: application/json"];

    let T = new NetworkTransfer;

    if ( testURL.indexOf( "https" ) != -1 ) {
        T.setSSL();
    }
    T.setURL( testURL );
    T.setCustomHTTPHeaders(customHeaders);
    //T.setURL( testURL );  // if you call setURL after setting headers, it blows away the custom headers.

    // callback function
    T.onDownloadDataAvailable = function( response ) {
        console.writeLn(response);
    };

    console.show();
    console.writeln("--- Start NetworkTransfer Test ---");

    let rc = T.post( requestData );

    console.writeln("--- T.post() return: "+ rc + " ---");
    console.writeln("--- Network API Test Done ---");
}

testNetworkTransfer();

// successful custom headers test output on `nc -l 4321` console looks like:
//
// POST /foo HTTP/1.1
// Host: 127.0.0.1:4321
// User-Agent: PixInsight-agent/1.9.3-0
// Content-Type: application/json; charset=utf-8
// Accept: application/json
// Content-Length: 26
//
// {"foo":"bar", "baz":"bat"
