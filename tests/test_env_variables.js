// copied from /opt/PixInsight/src/scripts/MakefileGenerator/MakGenGlobal.js

/*
 * PCL build environment variables.
 */
#ifeq __PI_PLATFORM__ MSWINDOWS
var PCLDIR       = File.windowsPathToUnix( getEnvironmentVariable( "PCLDIR" ) );
var PCLSRCDIR    = File.windowsPathToUnix( getEnvironmentVariable( "PCLSRCDIR" ) );
var PCLINCDIR    = File.windowsPathToUnix( getEnvironmentVariable( "PCLINCDIR" ) );
var PCLLIBDIR32  = File.windowsPathToUnix( getEnvironmentVariable( "PCLLIBDIR32" ) );
var PCLLIBDIR64  = File.windowsPathToUnix( getEnvironmentVariable( "PCLLIBDIR64" ) );
var PCLLIBDIR64C = File.windowsPathToUnix( getEnvironmentVariable( "PCLLIBDIR64C" ) );
var PCLBINDIR32  = File.windowsPathToUnix( getEnvironmentVariable( "PCLBINDIR32" ) );
var PCLBINDIR64  = File.windowsPathToUnix( getEnvironmentVariable( "PCLBINDIR64" ) );
var PCLBINDIR64C = File.windowsPathToUnix( getEnvironmentVariable( "PCLBINDIR64C" ) );
#else
var PCLDIR       = getEnvironmentVariable( "PCLDIR" );
var PCLSRCDIR    = getEnvironmentVariable( "PCLSRCDIR" );
var PCLINCDIR    = getEnvironmentVariable( "PCLINCDIR" );
var PCLLIBDIR32  = getEnvironmentVariable( "PCLLIBDIR32" );
var PCLLIBDIR64  = getEnvironmentVariable( "PCLLIBDIR64" );
var PCLLIBDIR64C = getEnvironmentVariable( "PCLLIBDIR64C" );
var PCLBINDIR32  = getEnvironmentVariable( "PCLBINDIR32" );
var PCLBINDIR64  = getEnvironmentVariable( "PCLBINDIR64" );
var PCLBINDIR64C = getEnvironmentVariable( "PCLBINDIR64C" );
#endif

var PXI_SRCDIR = getEnvironmentVariable( "PXI_SRCDIR" );
var PXI_DIR = getEnvironmentVariable( "PXI_DIR" );
var PXI_DOCDIR = getEnvironmentVariable( "PXI_DOCDIR" );
var PXI_INCDIR = getEnvironmentVariable( "PXI_INCDIR" );


function printEnvVariables() {
    console.show();

    console.writeln( "PCLDIR: " + PCLDIR );
    console.writeln( "PCLSRCDIR: " +  PCLSRCDIR );
    console.writeln( "PCLINCDIR: " + PCLINCDIR );
    console.writeln( "PCLLIBDIR64: " + PCLLIBDIR64 );
    console.writeln( "PCLLIBDIR64C: " + PCLLIBDIR64C );
    console.writeln("PCLBINDIR32: " + PCLBINDIR32 );
    console.writeln( "PCLBINDIR64: " + PCLBINDIR64 );
    console.writeln( "PCLBINDIR64C: " + PCLBINDIR64C );
    console.writeln( "PXI_DOCDIR:" + PXI_DOCDIR );
    console.writeln( "PXI_SRCDIR:" + PXI_SRCDIR );
    console.writeln( "PXI_DIR:" + PXI_DIR );
    console.writeln( "PXI_INCDIR:" + PXI_INCDIR );
    /* console.writeln(  );
    console.writeln(  );
    console.writeln(  );
    console.writeln(  );
    console.writeln(  ); */
}


function main() {
    printEnvVariables();
};

main();
