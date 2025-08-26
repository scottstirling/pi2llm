// test image processing history


function main() {
    console.show();

    var v = View.viewById( "orion_347x_08_21_2025_drz" );

    let pc = v.initialProcessing;

    console.writeln("pc.toSource(): " + pc.toSource() );

    let pc2 = v.processing;

    console.writeln("pc2.toSource(): " + pc2.toSource() );

    for (let i = 0; i < pc.length; i++) {
        var p = pc.at(i);
        console.writeln( p.description() );
    }
    console.writeln(pc.length);
}

main();
