// /lib/workspace_provider.js
function WorkspaceDataProvider(config) {
    this.config = config;

    // This is the icon extraction logic, moved here from the deleted file.
    this._extractIcons = function() {
        console.writeln("Scanning for process icons...");

        // This call will now work because it's being run at the correct time.
        let allIcons = ProcessIcon.icons;

        if (!allIcons || allIcons.length === 0) {
            return [];
        }

        let extractedIcons = [];
        for (let i = 0; i < allIcons.length; ++i) {
            let icon = allIcons[i];
            let process = new ProcessInstance(icon.process);
            if (process.isNull) continue;

            let params = [];
            let paramList = process.parameters;

            for (let j = 0; j < paramList.length; ++j) {
                let param = paramList[j];
                params.push({
                    id: param.id,
                    type: param.type,
                    value: process.parameterValue(param.id)
                });
            }

            extractedIcons.push({
                instanceId: icon.instanceId,
                processId: icon.processId,
                parameters: params
            });
        }

        console.writeln("Found " + extractedIcons.length + " process icons.");
        return extractedIcons;
    };


    this.createDTO = function() {
        console.writeln("=== Starting Workspace Census ===");
        let allWindows = ImageWindow.windows;
        let openImagesData = [];

        for (let i = 0; i < allWindows.length; ++i) {
            let window = allWindows[i];
            if (window.mainView.isPreview) {
                console.writeln("--> Skipping preview: ", window.mainView.id);
                continue;
            }
            let imageProvider = new ImageDataProvider(window, this.config);
            openImagesData.push(imageProvider.getDTO());
        }

        let activeWindowId = !ImageWindow.activeWindow.isNull ? ImageWindow.activeWindow.mainView.id : null;

        let workspaceDTO = {
            projectFilePath: null,
            activeViewId: activeWindowId,
            openImages: openImagesData,
            // We call our internal icon extractor here.
            // processIcons: this._extractIcons()
            processIcons: []
        };

        console.writeln("=== Workspace Census Complete. Processed ", openImagesData.length, " images. ===");
        return workspaceDTO;
    };
}
