// test case for Unicode character handling in JSON.stringify() and JSON.parse()

let jsonStringWithUnicodeChars = "{ \"test\":\"A few Unicode: 😊 👍 🚀 µ é ° 天体写真\240509みずがき湖\" }";

let jsonObjectWithUnicodeChars = {
        test:"😊 👍 🚀 µ é °",
        kanji:"こんにちは世界",
        mixed:"天体写真\240509みずがき湖"
    };


function unicodeEscape(jsonString) {
    return jsonString.replace(/[\u007F-\uFFFF]/g, function(chr) {
        return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
    });
}

function testStringifyWithUnicode() {
    console.show();

    let byteArray = new ByteArray( JSON.stringify(jsonStringWithUnicodeChars) ).toBase64();

    console.writeln("ByteArray Base64: " + byteArray.toString());

    let secondByteArray = ByteArray.fromBase64( byteArray.toString());
    let jsonString = secondByteArray.utf8ToString();

    console.writeln("From ByteArray.utf8ToString(): " + jsonString.toString());

    jsonString = unicodeEscape(jsonString.toString());

    console.writeln("From ByteArray.utf8ToString() after unicodeEscape(): " + jsonString);

    let thirdByteArray = new ByteArray( JSON.stringify( unicodeEscape( jsonStringWithUnicodeChars ) ) ).toBase64();

    let fourthByteArray = ByteArray.fromBase64( thirdByteArray.toString());

    let jsonStringThree = fourthByteArray.utf8ToString();

    console.writeln("From ByteArray.utf8ToString() when unicodeEscape() called first: " + jsonStringThree.toString());

    let jsObject = JSON.stringify(jsonObjectWithUnicodeChars);

    console.writeln(jsObject.toString());

    let stringifiedJSON = JSON.stringify(jsObject);

    console.writeln(stringifiedJSON);

    let escapedStringifiedJSON = unicodeEscape(stringifiedJSON);

    console.writeln(escapedStringifiedJSON);
}

// Define the main dialog object
function TextDialog() {

    const unicodeObject = {
       language: "Español",
       greeting: "你好世界", // "Hello, World" in Chinese
       emojis: "👋😊🚀✨",
       mixed:"天体写真\240509みずがき湖"
    };

    this.__base__ = Dialog;
    this.__base__();

    var titleObjectJson = JSON.stringify(unicodeObject);

    // this.windowTitle = "😊 👍 🚀 µ é °";
    this.windowTitle = titleObjectJson;

    this.infoLabel = new Label(this);
    this.infoLabel.text = kanji_string.toString();
    this.infoLabel.margin = 8;

    this.infoLabel2 = new Label(this);
    this.infoLabel2.text = jsonWithUnicodeChars.toString();
    this.infoLabel2.margin = 8;

    this.infoLabel3 = new Label(this);
    this.infoLabel3.text = unicodeEscape(jsonWithUnicodeChars);
    this.infoLabel3.margin = 8;

    this.okButton = new PushButton(this);
    this.okButton.text = "OK";
    this.okButton.onClick = function() {
        this.dialog.ok();
    };

    this.textBox = new TextBox(this);
    this.textBox.readOnly = true;
    this.textBox.wordWrapping = true;
    this.textBox.useRichText = true; // TODO see if this makes any difference
    this.textBox.setFixedHeight(100);
    this.textBox.text = jsonWithUnicodeChars;
    this.textBox.text += unicodeEscape(jsonWithUnicodeChars);


    this.sizer = new VerticalSizer;
    this.sizer.margin = 8;
    this.sizer.add(this.infoLabel);
    this.sizer.add(this.infoLabel2);
    this.sizer.add(this.infoLabel3);
    this.sizer.add(this.textBox); // add text box
    this.sizer.addStretch();
    this.sizer.add(this.okButton);
}

// Inherit from the Dialog object.
TextDialog.prototype = new Dialog;

// Create and execute the dialog.
function mainTest() {
    let dialog = new TextDialog();
    dialog.execute();
}

mainTest();

testStringifyWithUnicode();

