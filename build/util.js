"use strict";
var isShutdown = false;
var externalChannel = null, isChannelReady = false;
var sandboxEnvironment = null;
var overlayContainer = null, raidOverlayContainer = null;
var pendingExternalMessages = [];
var areModulesOk = true;
var applyPassword = null;
var luckyDay = false;
// ugh
var exports = {};
var releaseMode = true;
try {
    releaseMode = releaseMode || ('update_url' in chrome.runtime.getManifest());
}
catch (exc) {
}
var alwaysEncryptedClassNames = new Set([
    "quick-panels",
    "quick-panel",
    "quick-summon",
    "quick-summon-panel",
    "large-quick-panels",
    "focused",
    "faved",
    "fav-summon-button",
    "reorder-widget",
    "icon-supporter-type-f",
    "no-faves-message",
    "watch-button",
    "available",
    "unavailable",
    "quick-panels-visible",
    "quick-panels-invisible",
    "highlight-attribute-0",
    "highlight-attribute-1",
    "highlight-attribute-2",
    "highlight-attribute-3",
    "highlight-attribute-4",
    "highlight-attribute-5",
    "highlight-attribute-6",
    "highlight-attribute-7",
    "stamp-filter",
    "next-rank-xp"
]);
var classRegistry = new Map();
var actualShadowRoots = new WeakMap();
var injectedStylesheets = new Map();
var injectedElements = new Set();
var previousRandomNumbers = new Set();
var secretKey = "?" + generateRandomText();
sendExtensionMessage({ type: "registerSecretKey", key: secretKey });
function generateRandomText() {
    var x;
    do {
        x = (Math.random() * 0xFFFFFFE) | 0;
    } while (previousRandomNumbers.has(x));
    previousRandomNumbers.add(x);
    var result = "";
    while (x) {
        result += String.fromCharCode(97 + (x % 16));
        x = (x / 16) | 0;
    }
    result += previousRandomNumbers.size.toString(36);
    return result;
}
;
function encryptClassName(name) {
    if (!alwaysEncryptedClassNames.has(name))
        logError("Class name " + name + " is not in list");
    var result = classRegistry.get(name);
    if (!result) {
        result = generateRandomText();
        if (!releaseMode)
            result += "_" + name;
        classRegistry.set(name, result);
    }
    return result;
}
;
function addEncryptedClass(target, name) {
    var encrypted = encryptClassName(name);
    target.classList.add(encrypted);
}
;
function removeEncryptedClass(target, name) {
    var encrypted = encryptClassName(name);
    target.classList.remove(encrypted);
}
;
function encryptCssHandler(match, p1, offset, string) {
    var className = p1, encryptedClassName;
    if (alwaysEncryptedClassNames.has(className))
        encryptedClassName = encryptClassName(className);
    else
        encryptedClassName = classRegistry.get(className);
    if (encryptedClassName)
        return "." + encryptedClassName;
    else
        return match;
}
;
var encryptCssCache = new Map();
function encryptCss(cssText) {
    var result = encryptCssCache.get(cssText);
    if (!result) {
        var regex = /\.([A-Za-z_][A-Za-z0-9\-_]*)/gm;
        result = cssText.replace(regex, encryptCssHandler);
        encryptCssCache.set(cssText, result);
    }
    return result;
}
;
function queryEncrypted(elt, selector) {
    return elt.querySelector(encryptCss(selector));
}
;
function queryEncryptedAll(elt, selector) {
    return elt.querySelectorAll(encryptCss(selector));
}
;
// @ts-ignore
function log(...args) {
    var argc = args.length;
    if (argc <= 0)
        return;
    args.unshift((new Date()).toLocaleTimeString("en-US", { hour12: false }) + ">");
    console.log.apply(console, args);
}
;
// @ts-ignore
function logError(...args) {
    var argc = args.length;
    if (argc <= 0)
        return;
    args.unshift((new Date()).toLocaleTimeString("en-US", { hour12: false }) + ">");
    console.error.apply(console, args);
}
;
var extensionMessageFailureCount = 0;
function sendExtensionMessage(msg, callback) {
    if (isShutdown)
        return false;
    try {
        chrome.runtime.sendMessage(msg, callback);
        extensionMessageFailureCount--;
        if (extensionMessageFailureCount < 0)
            extensionMessageFailureCount = 0;
        return true;
    }
    catch (exc) {
        extensionMessageFailureCount++;
        if (extensionMessageFailureCount >= 3) {
            log("Failed to send extension message, shutting down", exc);
            compatibilityShutdown(true);
            return false;
        }
        else {
            log("Failed to send extension message");
            throw exc;
        }
    }
    finally {
        if (chrome.runtime.lastError)
            log(chrome.runtime.lastError);
    }
}
;
function getEffectiveZoom(element) {
    var computedStyle = window.getComputedStyle(element);
    return parseFloat(computedStyle.getPropertyValue("zoom"));
}
;
function getShadowRootForElement(elt) {
    if (isShutdown)
        return null;
    else if (!elt)
        throw new Error("Expected element");
    var result = actualShadowRoots.get(elt);
    if (!result) {
        if (elt.attachShadow) {
            result = elt.attachShadow({ mode: 'closed' });
        }
        else {
            // Fallback for old Chrome
            // FIXME: Mask it?
            log("Please upgrade Chrome 🤢");
            result = elt.createShadowRoot();
        }
        actualShadowRoots.set(elt, result);
    }
    return result;
}
;
function getOverlayContainer(allowCreate) {
    if (isShutdown)
        return null;
    if (!overlayContainer) {
        if (allowCreate === false)
            return null;
        var className = generateRandomText();
        overlayContainer = document.createElement("div");
        overlayContainer.className = className;
        if (maskElements)
            overlayContainer.setAttribute("_vm", "overlay");
    }
    if (document.body && (overlayContainer.parentNode !== document.body))
        document.body.appendChild(overlayContainer);
    return overlayContainer;
}
;
function getUiContainer() {
    return getShadowRootForElement(getOverlayContainer());
}
;
function getRaidOverlayContainer() {
    if (isShutdown)
        return null;
    if (raidOverlayContainer && !document.contains(raidOverlayContainer))
        raidOverlayContainer = null;
    if (!raidOverlayContainer) {
        var raidContainer = document.querySelector("div.cnt-raid");
        if (!raidContainer)
            return null;
        var className = generateRandomText();
        raidOverlayContainer = document.createElement("div");
        if (maskElements)
            raidOverlayContainer.setAttribute("_vm", "raid-overlay");
        raidOverlayContainer.className = className;
        raidOverlayContainer.style.zoom = 1;
        raidContainer.appendChild(raidOverlayContainer);
        // HACK: Inject our stylesheets on-demand so the overlay is ready
        injectStylesheetsIntoContainer(getShadowRootForElement(raidOverlayContainer));
    }
    return raidOverlayContainer;
}
;
function getRaidUiContainer() {
    return getShadowRootForElement(getRaidOverlayContainer());
}
;
function getResourceUrl(name) {
    return chrome.extension.getURL('content/' + name); // + secretKey;
}
;
function injectStylesheet(name, container) {
    if (isShutdown)
        return;
    var styleContainer = container || getOverlayContainer(false);
    var existing = injectedStylesheets.get(name);
    if (existing) {
        for (var elt of existing) {
            if (styleContainer.contains(elt)) {
                // log("Stylesheet already loaded", name);
                return;
            }
        }
    }
    // Content script CSS doesn't work right and is hell to debug, so
    var style = document.createElement("style");
    style.type = "text/css";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", getResourceUrl(name), true);
    xhr.onload = function () {
        var css = xhr.response;
        styleContainer = container || getOverlayContainer();
        var markerRe = /(['"])chrome-extension\:\/\/__MSG_@@extension_id__\/([^'"]*)/g;
        css = css.replace(markerRe, function (m, prefix, path) {
            return prefix + chrome.extension.getURL(path);
        });
        css = encryptCss(css);
        if (!releaseMode)
            css = "/* " + name + " */\r\n" + css;
        if (maskElements)
            style.setAttribute("_vm", "style");
        style.textContent = css;
        styleContainer.appendChild(style);
        if (existing)
            existing.push(style);
        else
            injectedStylesheets.set(name, [style]);
    };
    xhr.onerror = function (evt) {
        log("Loading stylesheet failed", name, evt);
    };
    xhr.send();
}
;
function onDOMContentLoaded(isRetrying) {
    if (!currentSettings) {
        if (isRetrying === true) {
            log("Couldn't inject css because settings weren't available");
        }
        else {
            window.setTimeout(function () { onDOMContentLoaded(true); }, 100);
        }
        return;
    }
    injectStylesheet("viramate.css", document.head);
    injectStylesheet("watch-button.css", document.head);
    if (currentSettings.singlePageStickers)
        injectStylesheet("single-page-stickers.css", document.head);
    if (currentSettings.smartSupports)
        injectStylesheet("smart-supports.css", document.head);
    if (currentSettings.buttonSwipeFix || currentSettings.disableButtonAnimations)
        injectStylesheet("skill-button-fix.css", document.head);
}
;
var nextElementIndex = 1;
var maskUpdateTimeout = null;
var maskElements = false;
function doMaskUpdate() {
    maskUpdateTimeout = null;
    sendExternalMessage({ type: "clearMaskAttributes" });
}
;
function injectElement(container, element, mask) {
    if (isShutdown)
        return;
    // Todo: Just register element some other way
    if ((mask !== false) && maskElements) {
        element.setAttribute("_vm", nextElementIndex++);
        if (maskUpdateTimeout)
            window.clearTimeout(maskUpdateTimeout);
        maskUpdateTimeout = window.setTimeout(doMaskUpdate, 1000);
    }
    container.appendChild(element);
    if (document.body.contains(element))
        injectedElements.add(element);
}
;
function uninjectElement(container, element) {
    injectedElements.delete(element);
    if (!container)
        return;
    // Page navigate/reload race condition
    if (!container.contains(element))
        return;
    container.removeChild(element);
}
;
function ohash(hash, body, callback) {
    var hash2 = null;
    if (currentSettings.ocache)
        hash2 = currentSettings.ocache[hash];
    if (!hash2) {
        ohashSlow(hash, body, callback, false);
    }
    else {
        log("Got result from ocache");
        callback(hash2);
    }
}
;
var esprima, escodegen, jsSHA;
var _loadEsprima, _loadEscodegen;
function ohashSlow(hash, body, callback, triedLoad) {
    try {
        if (!esprima || !escodegen || !jsSHA) {
            if (triedLoad) {
                log("Failed to load");
                callback(null);
            }
            else
                log("Loading...");
            ohashLoad(function () {
                var ctx = {};
                try {
                    ctx.esprima = _loadEsprima();
                    _loadEscodegen.call(ctx, ctx);
                    _loadShaScript(ctx);
                    esprima = ctx.esprima;
                    escodegen = ctx.escodegen;
                    jsSHA = ctx.jsSHA;
                    ohashSlow(hash, body, callback, true);
                }
                catch (exc) {
                    log(exc);
                    callback(null);
                }
            });
            return;
        }
        log("Hashing...");
        log(body);
        // FIXME: These two symbols are unknown to TS since we load them dynamically
        // @ts-ignore
        var parsed = parseFunctionText(body);
        // @ts-ignore
        var deobfuscated = deobfuscateFunction(parsed);
        var deobfuscatedText = escodegen.generate(deobfuscated);
        log(deobfuscatedText);
        var hasher = new jsSHA("SHA-256", "TEXT");
        hasher.update(deobfuscatedText);
        var hash2 = hasher.getHash("HEX");
        sendExtensionMessage({ type: "updateOcache", hash: hash, hash2: hash2 });
        log("... done");
        callback(hash2);
    }
    catch (exc) {
        log(exc);
        callback(null);
    }
}
;
function ohashLoad(callback) {
    sendExtensionMessage({ type: "pleaseInjectOhash" }, function (tabId) {
        callback();
    });
}
;
function validateModule(id, hash, body) {
    var hasFinalized = false, timeout = null;
    try {
        var tryPass = function (passHash) {
            var passResult = false;
            var check = function (table) {
                if (!hashes)
                    return false;
                if (passHash && hashes.indexOf(passHash) >= 0)
                    return true;
                return false;
            };
            // FIXME
            var testing = false;
            var hashes = moduleIds[id];
            passResult = check(hashes);
            if (!passResult) {
                log("module '" + id + "' failed local hash check:", passHash);
                if (!testing)
                    hashes = validHashesFromServer ? validHashesFromServer[id] : [];
                passResult = check(hashes);
            }
            if (!passResult && currentSettings && currentSettings.validHashes) {
                if (!testing)
                    hashes = currentSettings.validHashes[id];
                passResult = check(hashes);
            }
            return passResult;
        };
        var finalize = function (ok, hash2) {
            if (hasFinalized)
                return;
            if (timeout) {
                window.clearTimeout(timeout);
                timeout = null;
            }
            hasFinalized = true;
            if (!ok) {
                log("module '" + id + "' failed all hash checks:", hash, hash2);
                areModulesOk = false;
                compatibilityShutdown(false);
            }
            else {
                sendExtensionMessage({ type: "setCompatibility", state: areModulesOk });
            }
        };
        timeout = window.setTimeout(function () {
            finalize(false, "timed out");
        }, 3000);
        if (!tryPass(hash)) {
            ohash(hash, body, function (hash2) {
                finalize(tryPass(hash2), hash2);
            });
        }
        else {
            finalize(true, null);
        }
    }
    catch (exc) {
        log(exc);
    }
}
;
function finishChannelSetup(secretToken) {
    isChannelReady = true;
    for (var i = 0, l = pendingExternalMessages.length; i < l; i++)
        externalChannel.postMessage(pendingExternalMessages[i]);
    pendingExternalMessages.length = 0;
    _loadShaScript(window);
    applyPassword = function (password) {
        if (!password || password.trim().length === 0)
            return;
        var isValid = isValidPassword(password);
        sendExternalMessage({
            type: "setResigned",
            secretToken: isValid ? secretToken : 0
        });
        if (!isValid)
            log("Password verified");
    };
    areYouFeelingLucky();
}
;
function sendExternalMessage(msg) {
    if (!externalChannel || !isChannelReady) {
        pendingExternalMessages.push(msg);
        return;
    }
    else {
        externalChannel.postMessage(msg);
    }
}
;
function isVisibleElement(element) {
    var computedStyle = window.getComputedStyle(element);
    if (computedStyle.getPropertyValue("display") === "none")
        return false;
    if (element.getClientRects().length)
        return true;
    return false;
}
;
function findVisibleElementWithSelector(selector) {
    var buttons = document.querySelectorAll(selector);
    for (var i = 0, l = buttons.length; i < l; i++) {
        var button = buttons[i];
        if (isVisibleElement(button))
            return button;
    }
    return null;
}
;
var AbstractMutationObserver = function AbstractMutationObserver(autoDispose) {
    this._callback = this.callback.bind(this);
    this._check = this.check.bind(this);
    this._maybeDispose = this.maybeDispose.bind(this);
    this.observer = new MutationObserver(this._callback);
    this.pendingCheck = false;
    this.checkFunctions = new Set();
    this.isDisposed = false;
    this.autoDispose = autoDispose !== false;
    this.trace = false;
};
AbstractMutationObserver.prototype.maybeDispose = function () {
    if (!this.autoDispose)
        return;
    if (this.checkFunctions.size === 0) {
        this.dispose(true);
        return true;
    }
    return false;
};
AbstractMutationObserver.prototype.observe = function (element, options) {
    if (this.isDisposed)
        throw new Error("Observer disposed");
    if (this.trace)
        log("Observing", element, options);
    this.observer.observe(element, options);
};
AbstractMutationObserver.prototype.register = function (callback) {
    var cfs = this.checkFunctions;
    var maybeDispose = this._maybeDispose;
    cfs.add(callback);
    return (function unregister() {
        cfs.delete(callback);
        maybeDispose();
    });
};
AbstractMutationObserver.prototype.dispose = function (wasAutomatic) {
    if (this.isDisposed)
        return;
    if (this.trace)
        log("Disposing abstract observer", wasAutomatic ? "automatically" : "manually", this);
    this.isDisposed = true;
    if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
    }
    this.checkFunctions.length = 0;
};
AbstractMutationObserver.prototype.callback = function (mutations) {
    if (this.isDisposed)
        return;
    if (!mutations)
        return;
    var needCheck = false;
    for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (!m.addedNodes || !m.addedNodes.length)
            continue;
        needCheck = true;
        break;
    }
    if (needCheck && !this.pendingCheck) {
        this.pendingCheck = true;
        window.requestAnimationFrame(this._check);
    }
};
AbstractMutationObserver.prototype.check = function () {
    if (this.isDisposed)
        return;
    this.pendingCheck = false;
    this.checkFunctions.forEach(function (cf) {
        cf();
    });
};
AbstractMutationObserver.cache = new WeakMap();
AbstractMutationObserver.forElement = function (element, options) {
    var result = null;
    var trace = false;
    var resultDict = AbstractMutationObserver.cache.get(element);
    var optionsText = JSON.stringify(options);
    if (resultDict) {
        result = resultDict[optionsText];
    }
    else {
        resultDict = Object.create(null);
        AbstractMutationObserver.cache.set(element, resultDict);
    }
    if (result && result.isDisposed)
        result = null;
    if (!result) {
        if (trace)
            log("Cache miss for", element, options);
        result = new AbstractMutationObserver(true);
        result.observe(element, options);
        resultDict[optionsText] = result;
    }
    else {
        if (trace)
            log("Cache hit for", element, options);
    }
    return result;
};
var ListPanel = function ListPanel(container, makeItem) {
    this.container = container;
    this.makeItem = makeItem;
    this.items = new Set();
};
ListPanel.prototype.clear = function () {
    this.container.innerHTML = "";
};
ListPanel.cache = new WeakMap();
ListPanel.forContainer = function (container, makeItem) {
    var result = ListPanel.cache.get(container);
    if (!result) {
        result = new ListPanel(container, makeItem);
        ListPanel.cache.set(container, result);
    }
    return result;
};
function compatibilityShutdown(requestedByExtension) {
    if (isShutdown)
        return;
    if (!requestedByExtension)
        sendExtensionMessage({ type: "setCompatibility", state: false });
    isShutdown = true;
    sendExternalMessage({ type: "compatibilityShutdown" });
    log("Shutting down due to " + (requestedByExtension ? "extension request" : "incompatible game version"));
    // if (detachScriptSandbox)
    //    detachScriptSandbox();    
    // Finish shutdown happens after the OK message
}
;
function finishCompatibilityShutdown() {
    if (overlayContainer && overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
        overlayContainer = null;
    }
    if (sandboxEnvironment)
        sandboxEnvironment.dispose();
    for (var istyle of injectedStylesheets.values()) {
        for (var elt of istyle) {
            if (elt.parentNode)
                elt.parentNode.removeChild(elt);
        }
    }
    for (var elt of injectedElements) {
        if (elt.parentNode)
            elt.parentNode.removeChild(elt);
    }
    log("Shutdown complete");
}
;
var moduleIds = {
    "dXRpbC9vYg==": [
        "2d6e3f1e9fe7316874218af2ff5c95d0226525a706a510091fa955cd54c96804",
        "1a8072cb1e4f16619ede8a21af79a9e4a8f1c253f62fea45896d826b57712160",
        "bec39c184f9866d2a6241bb468e55bcd87a76cd5b012dddbde352d42c3aea172",
        "2d165b8988a533f31984f4ed9252e0cb5c9d8e893f9363bb7e771ff30c80adc4"
    ]
};
function areYouFeelingLucky() {
    luckyDay = (Math.random() > 0.999915);
    if (luckyDay) {
        log("Hooray!");
        sendExternalMessage({ type: "it's my lucky day" });
    }
}
;
//# sourceMappingURL=util.js.map