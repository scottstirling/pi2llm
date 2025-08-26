// see: https://pixinsight.com/forum/index.php?threads/new-stardetector-javascript-object.5599/

#define __PJSR_USE_STAR_DETECTOR_V2 1
#include <pjsr/StarDetector.jsh>

var S = new StarDetector;
S.maxDistortion = 0.2;
S.test( ImageWindow.activeWindow.mainView.image, false/*createMaskImage*/ );
