"use strict";
var nextInstallerMessageId = 1;
function sendInstallerNativeMessage(message, onResult) {
    var ple = chrome.runtime.lastError;
    chrome.runtime.sendNativeMessage("com.viramate.installer", message, function (result) {
        if (arguments.length === 0)
            onResult(null, chrome.runtime.lastError);
        else
            onResult(result, null);
    });
    var le = chrome.runtime.lastError;
    if (le && (le !== ple))
        onResult(null, le);
}
;
var hostsList = ["http://127.0.0.1:8678/vm", "http://localhost:8678/vm"];
function sendInstallerCommand(name, onComplete) {
    var hasRetriedYet = false;
    var xhr;
    var id = nextInstallerMessageId++;
    var message = {
        type: name,
        id: id
    };
    if (!onComplete)
        onComplete = function (r, e) { };
    var onXhrError, onXhrLoad, attemptInit, attemptSend;
    attemptInit = function () {
        sendInstallerNativeMessage({ type: "init" }, function (result, error) {
            if (!result || error)
                console.log("Installer message send failed", error);
        });
    };
    var currentHostIndex = 0;
    attemptSend = function () {
        xhr = new XMLHttpRequest();
        xhr.addEventListener("error", onXhrError);
        xhr.addEventListener("load", onXhrLoad);
        xhr.responseType = "json";
        xhr.open("POST", hostsList[currentHostIndex], true);
        var json = JSON.stringify(message);
        xhr.send(json);
    };
    onXhrError = function (e) {
        if (hasRetriedYet && (currentHostIndex >= hostsList.length)) {
            console.log("Installer xhr failed, giving up", e);
            onComplete(null, "xhr failed too many times");
        }
        else {
            currentHostIndex++;
            console.log("Installer xhr failed, trying", hostsList[currentHostIndex], e);
            hasRetriedYet = true;
            window.setTimeout(attemptSend, 1000);
            attemptInit();
        }
    };
    onXhrLoad = function (e) {
        console.log("Installer xhr success", e, xhr.response);
        if (xhr.response && xhr.response.result)
            onComplete(xhr.response.result, null);
        else
            onComplete(xhr.response, null);
    };
    attemptSend();
}
;
//# sourceMappingURL=installer.js.map