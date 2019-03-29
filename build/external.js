"use strict";
var _loadExternalScript = function external(state) {
    "use strict";
    var context = state.parentWindow;
    var channel = state.channel;
    var bhstatic = state.bhstatic;
    var moduleIds = state.moduleIds;
    var secretToken = state.secretToken;
    var sendMessage = state.sendMessage;
    var log = state.log;
    var logError = state.logError;
    // FIXME
    var jsSHA = state["jsSHA"];
    var isShutdown = false;
    var resignedToBloodshed = false;
    var sentHeartbeat = false;
    var flipsville = false;
    var NoSettings = Object.create(null), currentSettings = NoSettings;
    var waitingForSettings = [];
    var lastVmInput = 0;
    var inputWindow = 5000;
    var heartbeatToken = 0;
    var initialHeartbeatDelay = 400;
    var heartbeatDelayBackoffRate = 400;
    var currentHeartbeatDelay = initialHeartbeatDelay;
    var currentHeartbeatTimeout = null;
    var liveXhrs = new Set();
    var raidLoadStartObservedWhen = null, raidLoadEndObservedWhen = null;
    var raidLoadTimingInterval = null;
    var replacedMethods = [];
    var falsifyToString = function (target, original) {
        target.toString = function toString() {
            return original.toString();
        };
        target.toString.toString = function toString() {
            return original.toString().toString();
        };
    };
    var replaceMethod = function (target, name, newValue) {
        var oldValue = target[name];
        if (!oldValue)
            return oldValue;
        replacedMethods.push([target, name, oldValue, newValue]);
        falsifyToString(newValue, oldValue);
        target[name] = newValue;
        return oldValue;
    };
    (function () {
        var reduce = Function.bind.call(Function.call, Array.prototype.reduce);
        var isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
        var concat = Function.bind.call(Function.call, Array.prototype.concat);
        var keys = Reflect.ownKeys;
        if (!Object.values) {
            Object.values = function values(O) {
                return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
            };
        }
        if (!Object.entries) {
            Object.entries = function entries(O) {
                return reduce(keys(O), (e, k) => concat(e, typeof k === 'string' && isEnumerable(O, k) ? [[k, O[k]]] : []), []);
            };
        }
    })();
    var setTimeout_original, setInterval_original, clearTimeout_original, clearInterval_original;
    var internal_setTimeout = function (callback, delay) {
        return setTimeout_original.call(context, callback, delay);
    };
    var internal_clearTimeout = function (handle) {
        return clearTimeout_original.call(context, handle);
    };
    var internal_setInterval = function (callback, delay) {
        return setInterval_original.call(context, callback, delay);
    };
    var internal_clearInterval = function (handle) {
        return clearInterval_original.call(context, handle);
    };
    try {
        setTimeout_original = context.setTimeout;
        setInterval_original = context.setInterval;
        clearTimeout_original = context.clearTimeout;
        clearInterval_original = context.clearInterval;
        var RAF_original = context.requestAnimationFrame;
        var isLagWorkaroundActive = false;
        var isPerformanceStatsActive = false;
        var targetFrameInterval = 1000 / 60;
        var resetThreshold = 100;
        var lastFrameTimestamp = null, lastFrameWallTimestamp = null;
        var queuedFrameCallbacks = [];
        var rafCallbackPending = false;
        var rafCallback = function (timestamp) {
            rafCallbackPending = false;
            if (isLagWorkaroundActive)
                return;
            try {
                frameDispatcher(timestamp);
            }
            catch (exc) {
                logError("error in rafCallback", exc);
            }
        };
        var lastFrameWhen = null;
        var requestAnimationFrameCounter = 0;
        var lastRequestAnimationFrameCounter = -1;
        var actualFrameCounter = 0, skippedFrameCounter = 0;
        var lastFrameskipRatio = -1;
        var isSkippingFrame = true;
        var frameIntervalHandle = null;
        var updateFrameskip = function (canvasContext) {
            // There are other canvases on the page, we only want to skip the main stage one
            var doesContextMatch = (canvasContext && canvasContext.canvas &&
                (canvasContext.canvas.id === "canvas") &&
                (canvasContext.canvas.parentNode.className.indexOf("prt-stage-wrapper") >= 0));
            if (requestAnimationFrameCounter == lastRequestAnimationFrameCounter)
                return isSkippingFrame && doesContextMatch;
            actualFrameCounter++;
            lastRequestAnimationFrameCounter = requestAnimationFrameCounter;
            isSkippingFrame = false;
            if (currentSettings) {
                if (currentSettings.frameskipRatio !== lastFrameskipRatio) {
                    lastFrameskipRatio = currentSettings.frameskipRatio;
                    skippedFrameCounter = 0;
                    actualFrameCounter = 0;
                }
                if (currentSettings.frameskipRatio > 1)
                    isSkippingFrame = (actualFrameCounter % currentSettings.frameskipRatio) != 0;
            }
            if (isSkippingFrame)
                skippedFrameCounter++;
            return isSkippingFrame && doesContextMatch;
        };
        var lagWorkaroundCallback = function () {
            if (!isLagWorkaroundActive) {
                if (frameIntervalHandle !== null) {
                    internal_clearInterval(frameIntervalHandle);
                    frameIntervalHandle = null;
                }
                return;
            }
            var now = performance.now();
            var targetFrameTime, elapsed;
            try {
                if (lastFrameWhen == null) {
                    lastFrameWhen = now;
                    targetFrameTime = now;
                }
                else {
                    targetFrameTime = lastFrameWhen + targetFrameInterval;
                    elapsed = now - lastFrameWhen;
                    if (elapsed < 0)
                        lastFrameWhen = now;
                }
                if (now >= targetFrameTime) {
                    frameDispatcher(targetFrameTime);
                    lastFrameWhen = targetFrameTime;
                    now = performance.now();
                }
                if (elapsed >= resetThreshold)
                    lastFrameWhen = now;
            }
            catch (exc) {
            }
            if (frameIntervalHandle === null)
                frameIntervalHandle = internal_setInterval(lagWorkaroundCallback, 1);
        };
        lastFrameWhen = null;
        var frameDispatcher = function (timestamp) {
            var now = performance.now();
            var elapsed, elapsedWallClock;
            if (lastFrameTimestamp !== null) {
                elapsed = timestamp - lastFrameTimestamp;
                // Don't freak out if we stop getting frames for a while.
                if (elapsed > 2000)
                    elapsed = targetFrameInterval;
            }
            else
                elapsed = targetFrameInterval;
            if (lastFrameWallTimestamp != null) {
                elapsedWallClock = now - lastFrameWallTimestamp;
                if (elapsedWallClock > 2000)
                    elapsedWallClock = targetFrameInterval;
            }
            else
                elapsedWallClock = targetFrameInterval;
            // TODO: Frameskip
            var qfc = queuedFrameCallbacks;
            queuedFrameCallbacks = [];
            var callbacksStarted = performance.now();
            for (var i = 0, l = qfc.length; i < l; i++) {
                var callback = qfc[i];
                if (!callback)
                    continue;
                try {
                    callback(timestamp);
                }
                catch (exc) {
                    logError("Unhandled error in raf callback", exc.stack);
                }
            }
            var callbacksEnded = performance.now();
            if (isPushGameStatusEnabled)
                pushGameStatus();
            var pgsEnded = performance.now();
            var callbacksElapsed = callbacksEnded - callbacksStarted;
            var pgsElapsed = pgsEnded - callbacksEnded;
            if ((qfc.length > 0) || isPushGameStatusEnabled) {
                var unskippedPercent = (actualFrameCounter - skippedFrameCounter) / actualFrameCounter * 100;
                sendMessage({
                    type: "frameStats",
                    lastFrameTimestamp: lastFrameTimestamp,
                    timestamp: timestamp,
                    timeSinceLastFrame: elapsed,
                    realTimeSinceLastFrame: elapsedWallClock,
                    callbackDuration: callbacksElapsed,
                    pgsDuration: pgsElapsed,
                    unskippedPercent: unskippedPercent
                });
            }
            lastFrameTimestamp = timestamp;
            lastFrameWallTimestamp = now;
        };
        frameDispatcher.toString = function () { return ""; };
        var blacklistCache = new WeakMap();
        function isCallerBlacklisted(callback) {
            if (!callback)
                return true;
            var result = blacklistCache.get(callback);
            if (typeof (result) === "boolean")
                return result;
            var stack = (new Error()).stack;
            result = (stack.indexOf("platform.twitter.com") >= 0);
            blacklistCache.set(callback, result);
            return result;
        }
        ;
        var newRAF = function requestAnimationFrame(callback) {
            var result;
            if (isShutdown || isCallerBlacklisted(callback))
                return RAF_original.call(context, callback);
            requestAnimationFrameCounter++;
            if (!isPerformanceStatsActive && !isLagWorkaroundActive) {
                result = RAF_original.call(context, callback);
                if (isPushGameStatusEnabled)
                    RAF_original.call(context, pushGameStatus);
                return result;
            }
            result = queuedFrameCallbacks.length;
            queuedFrameCallbacks.push(callback);
            if (isLagWorkaroundActive) {
                if (frameIntervalHandle === null)
                    frameIntervalHandle = internal_setInterval(lagWorkaroundCallback, 1);
            }
            else if (!rafCallbackPending) {
                if (frameIntervalHandle !== null) {
                    internal_clearInterval(frameIntervalHandle);
                    frameIntervalHandle = null;
                }
                rafCallbackPending = true;
                RAF_original.call(context, rafCallback);
            }
            return result;
        };
        falsifyToString(newRAF, RAF_original);
        var makeNewRAFThunk = new context.Function("original", "wrapped", "return function (callback) { if (wrapped && wrapped.enabled) return wrapped.call(this, callback); else return original.call(this, callback); }");
        var newRAFThunk = makeNewRAFThunk(RAF_original, newRAF);
        var isTickCache = new WeakMap();
        var wrappedCallbackCache = new WeakMap();
        function wrapCallbackWithPushGameStatus(callback) {
            var result = wrappedCallbackCache.get(callback);
            if (!result) {
                result = function () {
                    callback.apply(this, arguments);
                    if (isPushGameStatusEnabled)
                        pushGameStatus();
                };
                falsifyToString(result, callback);
                wrappedCallbackCache.set(callback, result);
            }
            return result;
        }
        ;
        var newSetTimeout = function setTimeout(callback, timeout) {
            var isTick = false;
            if (isPushGameStatusEnabled) {
                try {
                    if ((timeout > 41) && (timeout < 42)) {
                        isTick = isTickCache.get(callback);
                        if (typeof (isTick) !== "boolean") {
                            var stack = (new Error()).stack;
                            isTick = stack.indexOf("._setupTick") >= 0;
                            isTickCache.set(callback, isTick);
                        }
                    }
                    if (isTick) {
                        var result = setTimeout_original.apply(context, arguments);
                        setTimeout_original.call(context, pushGameStatus, timeout);
                        return result;
                    }
                }
                catch (exc) {
                }
            }
            return setTimeout_original.apply(context, arguments);
        };
        var newSetInterval = function setInterval(callback, interval) {
            try {
                if (interval === 33) {
                    var stack = (new Error()).stack;
                    if ((stack.indexOf("raid/setup.js") >= 0) &&
                        (stack.indexOf("addEventListener") >= 0)) {
                        callback = wrapCallbackWithPushGameStatus(callback);
                    }
                }
            }
            catch (exc) {
            }
            return setInterval_original.apply(context, arguments);
        };
        newRAF.enabled = true;
        var viramateElementTable = new WeakMap();
        /*
    
        var dQS_original = context.Document.prototype.querySelector;
        var dQSA_original = context.Document.prototype.querySelectorAll;
        var eQS_original = context.Element.prototype.querySelector;
        var eQSA_original = context.Element.prototype.querySelectorAll;
    
        replaceMethod(context.Document.prototype, "querySelector", makeQuerySelector(dQS_original));
        replaceMethod(context.Element.prototype, "querySelector", makeQuerySelector(eQS_original));
        replaceMethod(context.Document.prototype, "querySelectorAll", makeQuerySelectorAll(dQSA_original));
        replaceMethod(context.Element.prototype, "querySelectorAll", makeQuerySelectorAll(eQSA_original));
    
        function isViramateElement (elt) {
            var result = elt && (viramateElementTable.has(elt) || elt.hasAttribute("_vm"));
            return result;
        };
    
        function makeQuerySelector (original) {
            return function querySelector (selector) {
                var result = original.call(this, selector);
                try {
                    if (isViramateElement(result))
                        return null;
                } catch (exc) {
                    logError(exc);
                }
                return result;
            };
        };
    
        function makeQuerySelectorAll (original) {
            return function querySelectorAll (selector) {
                var result = original.call(this, selector);
                try {
                    var toRemove : Set<Element> = null;
                    for (var elt of result) {
                        if (isViramateElement(elt)) {
                            if (!toRemove)
                                toRemove = new Set();
                            toRemove.add(elt);
                        }
                    }
    
                    if (toRemove && toRemove.size) {
                        var newResult = [];
                        for (var elt of result) {
                            if (toRemove.has(elt))
                                continue;
                            newResult.push(elt);
                        }
    
                        return newResult;
                    }
                } catch (exc) {
                    logError(exc);
                }
                return result;
            };
        };
    
        */
        replaceMethod(context, "requestAnimationFrame", newRAFThunk);
        replaceMethod(context, "webkitRequestAnimationFrame", newRAFThunk);
        replaceMethod(context, "setTimeout", newSetTimeout);
        replaceMethod(context, "setInterval", newSetInterval);
        var WebSocket_original = context.WebSocket;
        var nextWebSocketId = 1;
        // Intercept web socket construction so we can snoop on messages
        // This allows us to find out when other players do stuff in raids
        var newWebSocket = function WebSocket() {
            var gluedArguments = Array.prototype.concat.apply([null], arguments);
            var boundConstructor = Function.prototype.bind.apply(WebSocket_original, gluedArguments);
            var id = nextWebSocketId++;
            sendMessage({ type: 'webSocketCreated', id: id });
            var result = new boundConstructor();
            result.addEventListener("close", function (evt) {
                sendMessage({ type: 'webSocketClosed', data: evt.data, id: id });
            }, true);
            result.addEventListener("message", function (evt) {
                sendMessage({ type: 'webSocketMessageReceived', data: evt.data, id: id });
            }, true);
            result.addEventListener("error", function (evt) {
                logError("WebSocket error occurred", evt, evt.error);
                sendMessage({ type: 'webSocketError', data: String(evt.error), id: id });
            }, true);
            return result;
        };
        for (var k in WebSocket_original) {
            if (!WebSocket_original.hasOwnProperty(k))
                continue;
            var v = WebSocket_original[k];
            newWebSocket[k] = v;
        }
        newWebSocket.prototype = WebSocket_original.prototype;
        newWebSocket.prototype.constructor = newWebSocket;
        replaceMethod(context, "WebSocket", newWebSocket);
        var document_addEventListener = context.Document.prototype.addEventListener;
        var element_addEventListener = context.Element.prototype.addEventListener;
        var filterMouseEvents = false;
        var lastMouseDownEvent = null;
        var lastMouseDownEventIsFiltered = false;
        var snoopedEvents = [
            "mousedown", "mousemove", "mouseup", "click",
            "touchstart", "touchend", "touchmove", "touchcancel",
            "mouseover", "mouseout", "mouseleave", "mouseenter"
        ];
        var nonTransferableProperties = [
            "isTrusted", "path", "type", "which",
            "button", "buttons", "timeStamp", "returnValue",
            "eventPhase", "defaultPrevented",
            "target", "relatedTarget", "fromElement", "toElement"
        ];
        var swipeSuppressClasses = ["lis-ability"];
        function findElementAncestorWithClass(elt, classNames) {
            while (elt) {
                for (var i = 0, l = classNames.length; i < l; i++) {
                    var className = classNames[i];
                    if (elt.className.indexOf(className) >= 0)
                        return elt;
                }
                elt = elt.parentElement;
            }
            return null;
        }
        ;
        function transferProperty(src, dest, name) {
            if (nonTransferableProperties.indexOf(name) >= 0)
                return;
            Object.defineProperty(dest, name, {
                value: src[name]
            });
        }
        ;
        function looseElementComparison(a, b, classNames) {
            var aa = findElementAncestorWithClass(a, classNames);
            var ba = findElementAncestorWithClass(b, classNames);
            return aa && ba && (aa == ba);
        }
        ;
        function makeCustomMouseEvent(proxiedEvent, originalEvent, customProperties) {
            var handler = new filteredMouseEventProxyHandler(originalEvent);
            var result = new Proxy(proxiedEvent, handler);
            return result;
        }
        ;
        function filteredMouseEventProxyHandler(originalEvent, customProperties) {
            this.originalEvent = originalEvent;
            var cp = new Map(customProperties);
            cp.set("isTrusted", true);
            this.customProperties = cp;
            /*
            for (var k in lastMouseDownEvent)
                transferProperty(lastMouseDownEvent, evt, k);
    
            Object.defineProperty(evt, "movementX", { value: 0 });
            Object.defineProperty(evt, "movementY", { value: 0 });
            */
        }
        ;
        filteredMouseEventProxyHandler.prototype.get = function (target, property, receiver) {
            try {
                if (this.customProperties.has(property))
                    return this.customProperties.get(property);
                var result = target[property];
                switch (typeof (result)) {
                    case "function":
                        return result.bind(target);
                }
                if (this.originalEvent) {
                    if (nonTransferableProperties.indexOf(property) < 0)
                        result = this.originalEvent[property];
                }
            }
            catch (exc) {
                logError(exc);
            }
            return result;
        };
        function reallyFilterMouseEvents() {
            return filterMouseEvents && isCombatPage(context.location.hash);
        }
        ;
        function wrapMouseEventListener(type, listener) {
            if (!listener.apply) {
                // wtf cygames
                return listener;
            }
            switch (type) {
                case "touchstart":
                    return function filterTouchStart(evt) {
                        if (reallyFilterMouseEvents())
                            return;
                        return listener.apply(this, arguments);
                    };
                case "touchmove":
                case "touchend":
                case "touchcancel":
                    return function filterMouseMove(evt) {
                        if (reallyFilterMouseEvents())
                            return;
                        return listener.apply(this, arguments);
                    };
                case "mouseover":
                case "mouseout":
                case "mouseleave":
                case "mouseenter":
                    return function filterMisc(evt) {
                        if (reallyFilterMouseEvents()) {
                            if (evt.buttons != 0)
                                return;
                        }
                        return listener.apply(this, arguments);
                    };
                case "mousedown":
                    return function filterMouseDown(evt) {
                        if (reallyFilterMouseEvents())
                            try {
                                lastMouseDownEvent = evt;
                                lastMouseDownEventIsFiltered = !!findElementAncestorWithClass(evt.target, swipeSuppressClasses);
                            }
                            catch (exc) {
                                logError(exc);
                            }
                        return listener.apply(this, arguments);
                    };
                case "mousemove":
                    return function filterMouseMove(evt) {
                        if (reallyFilterMouseEvents())
                            try {
                                if ((evt.buttons !== 0) &&
                                    lastMouseDownEvent &&
                                    (lastMouseDownEventIsFiltered &&
                                        findElementAncestorWithClass(evt.target, swipeSuppressClasses))) {
                                    // log("filtered mousemove");
                                    // TODO: Instead, modify the coordinates and only update them if the event
                                    //  leaves the button, so mouse-out works as expected
                                    return;
                                }
                            }
                            catch (exc) {
                                logError(exc);
                            }
                        return listener.apply(this, arguments);
                    };
                case "mouseup":
                    return function filterMouseUp(evt) {
                        if (reallyFilterMouseEvents())
                            try {
                                if (lastMouseDownEvent &&
                                    looseElementComparison(evt.target, lastMouseDownEvent.target, swipeSuppressClasses) &&
                                    (lastMouseDownEventIsFiltered &&
                                        findElementAncestorWithClass(evt.target, swipeSuppressClasses))) {
                                    // log("filtered mouseup");
                                    evt = makeCustomMouseEvent(evt, lastMouseDownEvent, undefined);
                                }
                            }
                            catch (exc) {
                                logError(exc);
                            }
                        return listener.call(this, evt);
                    };
            }
            return listener;
        }
        ;
        var newDocumentAddEventListener = function (type, _listener, options) {
            var listener = _listener;
            try {
                if (snoopedEvents.indexOf(type) >= 0)
                    listener = wrapMouseEventListener(type, _listener);
            }
            catch (exc) {
            }
            var result = document_addEventListener.call(this, type, listener, options);
            // log("document", type, listener);
            return result;
        };
        var newElementAddEventListener = function (type, _listener, options) {
            var listener = _listener;
            try {
                if (snoopedEvents.indexOf(type) >= 0)
                    listener = wrapMouseEventListener(type, _listener);
            }
            catch (exc) {
            }
            var result = element_addEventListener.call(this, type, listener, options);
            // log(name, type, listener);
            return result;
        };
        replaceMethod(context.Document.prototype, "addEventListener", newDocumentAddEventListener);
        replaceMethod(context.Element.prototype, "addEventListener", newElementAddEventListener);
        var XHR = context.XMLHttpRequest;
        var open_original = XHR.prototype.open;
        var send_original = XHR.prototype.send;
        var xhr_addEventListener_original = XHR.prototype.addEventListener;
        var doResultFiltering = true;
        var xhrStateTable = new WeakMap();
        function getXhrState(xhr) {
            var result = xhrStateTable.get(xhr);
            if (!result) {
                result = {};
                xhrStateTable.set(xhr, result);
            }
            if (!result.readyStateListeners)
                result.readyStateListeners = [];
            return result;
        }
        ;
        var invalidTableKeys = [
            1001, 8001,
            // temporary reprieve        
            7001, 7002
        ];
        function tryPreprocessXhr(xhr, state) {
            if (state.url.indexOf(atob("L29iLw==")) >= 0) {
                var obj = JSON.parse(state.data);
                if (obj.c[4001] && !sentHeartbeat) {
                    for (var key in obj.c) {
                        if (invalidTableKeys.indexOf(Number(key)) >= 0) {
                            log("Removing " + key + " from ob");
                            delete obj.c[key];
                        }
                    }
                    state.data = JSON.stringify(obj);
                    sentHeartbeat = true;
                }
                else {
                    log("Squelched");
                    state.overrideUrl = bhstatic;
                    state.noHeaders = true;
                    open_original.call(xhr, state.method, state.overrideUrl, state.async);
                }
            }
            else if (state.url.indexOf(atob("Z2MvZ2M=")) >= 0) {
                var obj = JSON.parse(state.data);
                for (var key in obj.c) {
                    if (invalidTableKeys.indexOf(Number(key)) >= 0) {
                        log("Removing " + key + " from gc/gc");
                        delete obj.c[key];
                    }
                }
                state.data = JSON.stringify(obj);
            }
            else if (state.url.indexOf(atob("ZXJyb3IvanM=")) >= 0) {
                log("Squelched");
                state.overrideUrl = bhstatic;
                state.noHeaders = true;
                open_original.call(xhr, state.method, state.overrideUrl, state.async);
            }
        }
        ;
        var customOnReadyStateChange = function () {
            try {
                var state = getXhrState(this);
                if (this.readyState == XHR.HEADERS_RECEIVED)
                    state.headersReceived = performance.now();
                else if ((this.readyState == XHR.LOADING) && (state.loadingStarted <= 0))
                    state.loadingStarted = performance.now();
                else if (this.readyState == XHR.DONE) {
                    // HACK: This *should* always happen before 'load' is fired,
                    //  allowing us to replace the result
                    state.onComplete.call(this, state);
                }
            }
            catch (exc) {
                logError(exc);
            }
            try {
                if (doResultFiltering) {
                    for (var i = 0, l = state.readyStateListeners.length; i < l; i++) {
                        try {
                            state.readyStateListeners[i].apply(this, arguments);
                        }
                        catch (exc) {
                            logError(exc);
                        }
                    }
                }
            }
            catch (exc) {
                logError(exc);
            }
        };
        function customOnComplete(state) {
            if (state.done)
                return;
            liveXhrs.delete(state.url);
            state.done = performance.now();
            state.result = this.response || this.responseText;
            state.response = this.response;
            state.responseType = this.responseType;
            if ((state.responseType === "") || (state.responseType === "text"))
                state.responseText = this.responseText;
            state.status = this.status;
            state.statusText = this.statusText;
            state.contentType = this.getResponseHeader('content-type');
            if (state.noHeaders) {
                var grh_original = this.getResponseHeader;
                var grh = function () {
                    return;
                };
                falsifyToString(grh, grh_original);
                // FIXME :(
                // Object.defineProperty(this, "getResponseHeader", { value: grh });
            }
            if (state.resultFilter) {
                var didFilter = false;
                try {
                    didFilter = state.resultFilter.call(this, state);
                }
                catch (exc) {
                }
                if (didFilter) {
                    Object.defineProperty(this, "response", { value: state.response });
                    Object.defineProperty(this, "responseText", { value: state.responseText });
                    Object.defineProperty(this, "responseType", { value: state.responseType });
                    Object.defineProperty(this, "status", { value: state.status });
                    Object.defineProperty(this, "statusText", { value: state.statusText });
                }
            }
            afterAjax(state);
        }
        ;
        var newXhrOpen = function open(method, url, async, user, password) {
            try {
                var state = getXhrState(this);
                state.method = method;
                state.url = url;
                state.async = async;
                state.opened = performance.now();
                state.loadingStarted = 0;
                state.headersReceived = 0;
                state.custom = false;
                state.overrideUrl = null;
                // FIXME: state.targetXhr?
                xhr_addEventListener_original.call(this, "readystatechange", customOnReadyStateChange, false);
            }
            catch (exc) {
                logError(exc);
            }
            var result = open_original.apply(this, arguments);
            return result;
        };
        var newXhrAddEventListener = function addEventListener(eventName, listener, useCapture) {
            try {
                var state = getXhrState(this);
                if (doResultFiltering &&
                    (eventName === "readystatechange")) {
                    state.readyStateListeners.push(listener);
                    return true;
                }
            }
            catch (exc) {
                logError(exc);
            }
            var result = xhr_addEventListener_original.apply(this, arguments);
            return result;
        };
        function issueXhrSend(xhr, state, data) {
            liveXhrs.add(state.url);
            if (state && state.custom) {
                try {
                    send_original.call(xhr, state.data);
                }
                catch (exc) {
                    logError(exc);
                }
            }
            else if (state) {
                send_original.call(xhr, state.data);
            }
            else {
                send_original.call(xhr, data);
            }
            try {
                if (!state.async)
                    customOnComplete.call(xhr, state);
            }
            catch (exc) {
                logError(exc);
            }
            finally {
                if (!currentHeartbeatTimeout)
                    currentHeartbeatTimeout = internal_setTimeout(proxyHeartbeat, currentHeartbeatDelay);
            }
        }
        ;
        var newXhrSend = function send(data) {
            var state = null;
            try {
                state = getXhrState(this);
                if (state.url) {
                    state.sent = performance.now();
                    state.data = data;
                    state.onComplete = customOnComplete;
                    state.resultFilter = pickResultFilter(state);
                    tryPreprocessXhr(this, state);
                    beforeAjax(state.url, state.data, this, context.Game.userId);
                }
                else {
                    // ???
                    log("Xhr with no state", this);
                }
            }
            catch (exc) {
                logError(exc);
            }
            issueXhrSend(this, state, data);
        };
        replaceMethod(XHR.prototype, "open", newXhrOpen);
        replaceMethod(XHR.prototype, "send", newXhrSend);
        replaceMethod(XHR.prototype, "addEventListener", newXhrAddEventListener);
        function pickResultFilter(state) {
            if ((state.url.indexOf("ability_result.json") >= 0) ||
                (state.url.indexOf("summon_result.json") >= 0) ||
                (state.url.indexOf("normal_attack_result.json") >= 0)) {
                if (flipsville)
                    return filter_drop;
            }
            return null;
        }
        ;
        function removeDuplicates(list) {
            var previous = null;
            for (var i = 0, l = list.length; i < l; i++) {
                var item = list[i];
                // HACK :(
                var current = JSON.stringify(item);
                if (current === previous) {
                    list.splice(i, 1);
                    i--;
                    l--;
                }
                previous = current;
            }
        }
        ;
        function filter_drop(state) {
            var original = JSON.parse(state.result);
            var result = null;
            var data = state.data;
            if (typeof (data) === "string")
                data = JSON.parse(data);
            var scenario = original.scenario;
            var changed = false;
            if (original && original.scenario) {
                for (var i = 0, l = scenario.length; i < l; i++) {
                    var s = scenario[i];
                    if (!s)
                        continue;
                    switch (s.cmd) {
                        case "drop": {
                            if (flipsville) {
                                s.get = [10, 10, 10, 10, 10, 10, 10];
                                changed = true;
                            }
                            break;
                        }
                    }
                }
                if (changed)
                    result = original;
            }
            if (result) {
                state.response =
                    state.responseText =
                        JSON.stringify(result);
                return true;
            }
            return false;
        }
        ;
        function isCombatPage(hash) {
            // FIXME: More prefixes
            return hash.startsWith("#raid/") ||
                hash.startsWith("#raid_multi/") ||
                hash.startsWith("#raid_semi/");
        }
        ;
        var gameStatusMessage = {};
        var gameStatusEnemies = [];
        var gameStatusParty = [];
        var gameStatusCharacterIds = [];
        var isPushGameStatusEnabled = true;
        context.addEventListener("hashchange", schedulePushGameStatus, false);
        schedulePushGameStatus();
        function schedulePushGameStatus() {
            isPushGameStatusEnabled = true;
        }
        ;
        function pushGameStatusInner() {
            if (!context["stage"])
                return;
            var stage = context.stage;
            var gs = stage.gGameStatus;
            if (!gs)
                return;
            var enemies = gameStatusEnemies;
            var party = gameStatusParty;
            var characterIds = gameStatusCharacterIds;
            enemies.length = 0;
            party.length = 0;
            var conditions;
            for (var i = 0, l = gs.boss.param.length; i < l; i++) {
                var enemy = gs.boss.param[i];
                conditions = [];
                var cl = stage.gEnemyStatus[i].condition;
                if (cl)
                    cl = cl.conditions;
                if (cl)
                    for (var j = 0, l2 = cl.length; j < l2; j++)
                        conditions.push(cl[j].status);
                var enemyObj = {
                    id: Number(enemy.enemy_id),
                    name: enemy.name,
                    cjs: enemy.cjs,
                    hp: Number(enemy.hp),
                    hpMax: Number(enemy.hpmax),
                    recast: Number(enemy.recast),
                    recastMax: Number(enemy.recastmax),
                    conditions: conditions,
                    mode: gs.bossmode.looks.mode[i],
                    gauge: gs.bossmode.looks.gauge[i],
                    hasModeGauge: enemy.modeflag
                };
                enemies.push(enemyObj);
            }
            for (var i = 0, l = gs.player.param.length; i < l; i++) {
                var player = gs.player.param[i];
                if (!player)
                    continue;
                var buffs = [];
                var debuffs = [];
                var pc = player.condition;
                if (pc) {
                    if (pc.buff)
                        for (var j = 0; j < pc.buff.length; j++)
                            buffs.push(pc.buff[j].status);
                    if (pc.debuff)
                        for (var j = 0; j < pc.debuff.length; j++)
                            debuffs.push(pc.debuff[j].status);
                }
                var playerObj = {
                    name: player.name,
                    cjs: player.cjs,
                    pid: player.pid,
                    attr: Number(player.attr),
                    alive: !!player.alive,
                    leader: !!player.leader,
                    hp: Number(player.hp),
                    hpMax: Number(player.hpmax),
                    ougi: Number(player.recast),
                    ougiMax: Number(player.recastmax),
                    buffs: buffs,
                    debuffs: debuffs,
                    condition: {},
                    skillsAvailable: Object.values(pc.ability_available_list || {}),
                    absoluteIndex: context.stage.pJsnData.formation[i]
                };
                party.push(playerObj);
            }
            var state = gameStatusMessage;
            state.btn_lock = gs.btn_lock;
            state.lock = gs.lock;
            state.target = gs.target;
            state.attacking = gs.attacking;
            state.usingAbility = gs.usingAbility;
            state.finish = gs.finish;
            state.turn = gs.turn;
            state.auto_attack = gs.auto_attack;
            state.enemies = enemies;
            state.party = party;
            state.characterIds = characterIds;
            state.hasFieldEffect = gs.field.hasFieldEffect;
            if (stage && stage.gFieldCondition && stage.gFieldCondition.fieldConditionList)
                state.fieldEffectCount = stage.gFieldCondition.fieldConditionList.length;
            else
                state.fieldEffectCount = 0;
            var aq = gs.attackQueue;
            if (aq) {
                state.attackButtonPushed = aq.attackButtonPushed;
                state.summonButtonPushed = aq.summonButtonPushed;
            }
            else {
                state.attackButtonPushed = state.summonButtonPushed = false;
            }
            state.skillQueue = [];
            try {
                if (aq && aq.queue)
                    state.skillQueue = aq.queue.map(unpackSkillQueueItem);
            }
            catch (exc) {
                sendMessage({
                    type: 'error',
                    stack: exc.stack
                });
            }
            if (stage.pJsnData) {
                var pjd = stage.pJsnData;
                state.summon_enable = pjd.summon_enable;
                state.raid_id = pjd.raid_id;
                state.is_multi = pjd.is_multi;
                state.is_semi = pjd.is_semi;
                state.is_defendorder = pjd.is_defendorder;
                state.is_coopraid = pjd.is_coopraid;
                if (pjd.twitter && pjd.is_allowed_to_requesting_assistance)
                    state.raidCode = pjd.twitter.battle_id;
                if (pjd.multi_raid_member_info)
                    state.player_count = pjd.multi_raid_member_info.length;
                var characterInfo = pjd.player.param;
                characterIds.length = characterInfo.length;
                for (var i = 0, l = characterInfo.length; i < l; i++) {
                    var ci = characterInfo[i];
                    characterIds[i] = ci.pid;
                }
            }
            sendMessage({
                type: 'stageTick',
                state: state
            });
        }
        ;
        function pushGameStatus() {
            try {
                if (isShutdown)
                    return;
                var _isCombatPage = isCombatPage(context.location.hash);
                if (!_isCombatPage) {
                    isPushGameStatusEnabled = false;
                    return;
                }
                // HACK: Moving the body of the try block into a function lets v8 optimize it
                pushGameStatusInner();
            }
            catch (exc) {
                sendMessage({
                    type: 'error',
                    stack: exc.stack
                });
            }
        }
        ;
        function generateClick(target, asClick, resultId) {
            var result = false;
            if (!isShutdown && target) {
                lastVmInput = Date.now();
                var elt = target;
                // log("generateClick", elt);
                var rect = elt.getBoundingClientRect();
                var randomX = 1 + (Math.random() * (rect.width - 2));
                var randomY = 1 + (Math.random() * (rect.height - 2));
                if (randomX < 0)
                    randomX = 0;
                if (randomY < 0)
                    randomY = 0;
                randomX = randomX | 0;
                randomY = randomY | 0;
                var clientX = rect.left + randomX, clientY = rect.top + randomY;
                var mouseProps = {
                    view: context,
                    bubbles: true,
                    cancelable: true,
                    // finger uses page(x|y), which are defined as
                    //  window.scroll(x|y) + evt.client(x|y)
                    clientX: clientX,
                    clientY: clientY,
                    button: 0,
                    buttons: 1
                };
                var mouseDownEvt = new MouseEvent("mousedown", mouseProps);
                var clickEvt = new MouseEvent("click", mouseProps);
                mouseProps.buttons = 0;
                var mouseUpEvt = new MouseEvent("mouseup", mouseProps);
                // HACK: Browsers simply are not capable of computing these values correctly, so fuck it
                var evts = [mouseDownEvt, clickEvt, mouseUpEvt];
                for (var i = 0; i < evts.length; i++) {
                    var evt = evts[i];
                    Object.defineProperty(evt, "offsetX", { value: randomX });
                    Object.defineProperty(evt, "offsetY", { value: randomY });
                }
                // log(elt, rect.left, rect.top, clientX, clientY);
                var downOk = elt.dispatchEvent(mouseDownEvt);
                var upOk = elt.dispatchEvent(mouseUpEvt);
                if (downOk && upOk) {
                    elt.dispatchEvent(clickEvt);
                }
                // elt.trigger(asClick ? "click" : "tap");
                result = true;
            }
            if (resultId) {
                var data = {
                    type: "result",
                    id: resultId,
                    result: result
                };
                if (remoteSocket)
                    remoteSocket.send(JSON.stringify(data));
            }
            return result;
        }
        function manufactureEvent(currentTarget, target) {
            var evt = Object.create(null);
            evt.type = "tap";
            // FIXME
            evt.x = (Math.random() * 256) | 0;
            evt.y = (Math.random() * 256) | 0;
            evt.delegateTarget = context.document.querySelector("div.contents");
            evt.currentTarget = currentTarget;
            evt.target = target;
            evt.timestamp = Date.now();
            return evt;
        }
        function finishSelectCharacterPortrait(data, result) {
            if (!result) {
                logError("Failed to select character portrait", data.number);
            }
            if (data.resultId) {
                if (remoteSocket)
                    remoteSocket.send(JSON.stringify({
                        type: "result",
                        id: data.resultId,
                        result: result
                    }));
            }
        }
        ;
        function awaitElementState(element, timeout, predicate, onComplete) {
            var isComplete = false;
            var timeoutHandle = null;
            var check = function () {
                try {
                    if (isComplete)
                        return;
                    if (predicate(element)) {
                        isComplete = true;
                        ob.disconnect();
                        if (timeoutHandle)
                            internal_clearTimeout(timeoutHandle);
                        onComplete(true);
                    }
                }
                catch (exc) {
                    logError(exc);
                }
            };
            var ob = new MutationObserver(check);
            if (timeout)
                timeoutHandle = internal_setTimeout(function () {
                    check();
                    if (!isComplete) {
                        isComplete = true;
                        ob.disconnect();
                        onComplete(false);
                    }
                }, timeout);
            check();
            if (!isComplete)
                ob.observe(element, { attributes: true });
        }
        ;
        var isBackButtonPressPending = false;
        var pendingPanelAnimation = null;
        function doSelectCharacterPortrait(data) {
            try {
                var portraitSelector = 'div.btn-command-character[pos="' + (data.number - 1) + '"]';
                var panelSelector = 'div.prt-command-chara[pos="' + data.number + '"]';
                var backButton = context.document.querySelector("div.btn-command-back");
                var portrait = context.document.querySelector(portraitSelector);
                var panel = context.document.querySelector(panelSelector);
                var commandTop = context.document.querySelector("div.prt-command-top");
                var isPanelDoneAnimating = function (elt) {
                    // Wait for the animation classname to go away
                    return (elt.style.display === "block") &&
                        (elt.classList.length === 2);
                };
                if (backButton && portrait && commandTop && panel) {
                    var clickPortraitAndWait = function (ok) {
                        isBackButtonPressPending = false;
                        if (!ok) {
                            logError("Failed waiting for back button");
                            finishSelectCharacterPortrait(data, false);
                            return;
                        }
                        if (pendingPanelAnimation !== panel) {
                            pendingPanelAnimation = panel;
                            // log("Clicking portrait", data.number);
                            generateClick(portrait, false, null);
                        }
                        // log("Waiting for portrait", data.number);
                        awaitElementState(panel, 600, isPanelDoneAnimating, function (ok) {
                            pendingPanelAnimation = null;
                            finishSelectCharacterPortrait(data, ok);
                        });
                    };
                    var maybeClickBackButtonAndWait = function (ok) {
                        if (!ok) {
                            logError("Failed waiting for existing animation");
                            finishSelectCharacterPortrait(data, false);
                            return;
                        }
                        // FIXME: This sucks ass
                        if ((commandTop.style.display === "none") || isBackButtonPressPending) {
                            if (!isBackButtonPressPending) {
                                isBackButtonPressPending = true;
                                // log("Clicking back", data.number);
                                generateClick(backButton, false, null);
                            }
                            // log("Waiting for back", data.number);
                            awaitElementState(commandTop, 600, function (elt) {
                                return elt.style.display !== "none";
                            }, clickPortraitAndWait);
                        }
                        else {
                            clickPortraitAndWait(true);
                        }
                    };
                    if (pendingPanelAnimation !== null) {
                        log("Waiting for existing panel animation before showing", data.number);
                        awaitElementState(pendingPanelAnimation, 1500, isPanelDoneAnimating, maybeClickBackButtonAndWait);
                    }
                    else {
                        maybeClickBackButtonAndWait(true);
                    }
                }
                else {
                    logError("Failed to set up to open character panel");
                    finishSelectCharacterPortrait(data, false);
                }
            }
            catch (exc) {
                logError(exc);
                finishSelectCharacterPortrait(data, false);
            }
        }
        ;
        function doTrySelectSummon(data) {
            var selector;
            if (data.pos) {
                selector = 'div.lis-summon[pos="' + data.pos + '"]';
            }
            else if (data.name) {
                selector = 'div.lis-summon.btn-summon-available[summon-name="' + data.name + '"]';
            }
            else {
                return false;
            }
            var elt = context.document.querySelector(selector);
            if (!elt)
                return false;
            generateClick(context.document.querySelector("div.btn-command-back.display-on"), false, null);
            currentRaidView.CommandChangeSummon();
            var fakeEvent = manufactureEvent(elt, elt.querySelector("img"));
            currentRaidView.popShowSummon(fakeEvent);
            return true;
        }
        ;
        state.onIncomingMessage = function onMessageFromContentScript(evt) {
            if (!evt.data.type)
                return;
            try {
                var fakeEvent = null;
                switch (evt.data.type) {
                    case "log":
                        log(evt.data.text);
                        return;
                    case "click":
                        if (isShutdown)
                            return;
                        var name = evt.data.name;
                        var token = evt.data.token;
                        var tokenAttribute = evt.data.tokenAttribute;
                        var element = context.document.querySelector(name + "[" + tokenAttribute + "='" + token + "']");
                        if (element) {
                            if (!evt.data.ignoreHitTest && !isReallyClickable(element)) {
                                log("Refusing to click element due to hit test failure", element);
                            }
                            else {
                                generateClick(element, evt.data.asClick, evt.data.resultId);
                            }
                        }
                        return;
                    case "selectCharacterPortrait":
                        if (isShutdown)
                            return;
                        doSelectCharacterPortrait(evt.data);
                        return;
                    /*
                    case "clearMaskAttributes":
                        var elts = dQSA_original.call(context.document, "*[_vm]");
                        for (var elt of elts) {
                            viramateElementTable.set(elt, true);
                            elt.removeAttribute("_vm");
                        }
    
                        return;
                    */
                    case "trySelectMark":
                        if (isShutdown)
                            return;
                        var mark = evt.data.mark;
                        var elt = context.document.querySelector('div.prt-ability-mark div.lis-ability-frame[mark="' + mark + '"]');
                        if (!elt)
                            return;
                        fakeEvent = manufactureEvent(elt, elt);
                        currentRaidView.setAbilityMark(fakeEvent);
                        return;
                    case "trySelectSummon":
                        if (isShutdown)
                            return;
                        doTrySelectSummon(evt.data);
                        return;
                    case "tryClickSummonUseButton":
                        if (isShutdown)
                            return;
                        return;
                    case "navigating":
                        if (remoteSocket)
                            remoteSocket.send(JSON.stringify(evt.data));
                        return;
                    case "socketResult":
                        if (remoteSocket) {
                            evt.data.type = "result";
                            remoteSocket.send(JSON.stringify(evt.data));
                        }
                        return;
                    case "sendToRemote":
                        if (remoteSocket)
                            remoteSocket.send(JSON.stringify(evt.data.data));
                        return;
                    case "settingsChanged":
                        currentSettings = JSON.parse(evt.data.settings);
                        isLagWorkaroundActive = !!currentSettings.lagWorkaround;
                        isPerformanceStatsActive = (currentSettings.showPerformanceHud || currentSettings.lagWorkaround);
                        var wfs = waitingForSettings;
                        if (wfs.length) {
                            waitingForSettings = [];
                            for (var i = 0, l = wfs.length | 0; i < l; i++)
                                wfs[i](currentSettings);
                        }
                        filterMouseEvents = !!currentSettings.buttonSwipeFix;
                        return;
                    case "it's my lucky day":
                        flipsville = true;
                        return;
                    case "setResigned":
                        var wasResigned = resignedToBloodshed;
                        resignedToBloodshed = (evt.data.secretToken === secretToken);
                        if (resignedToBloodshed && !wasResigned)
                            maybeInitWebSocket();
                        return;
                    case "tryConnect":
                        if (resignedToBloodshed)
                            maybeInitWebSocket();
                        return;
                    case "compatibilityShutdown":
                        doShutdown();
                        return;
                    case "doAjax":
                        doAjaxInternal(evt.data);
                        return;
                    case "doPopup":
                        var popupData = evt.data.data;
                        popupData.className = null;
                        popupData.okCallBackName = "popRemove";
                        popupData.cancelCallBackName = null;
                        popupData.exceptionFlag = false;
                        context.Game.view.trigger("popup_error", { data: popupData });
                        return;
                    case "getUserId":
                        tryGetUserId(evt.data.token);
                        return;
                    case "clearSkillQueue":
                        var queue = context.stage.gGameStatus.attackQueue;
                        if (queue.length <= 1) {
                            return;
                        }
                        var mappedQueue = queue.queue.map(function (e) {
                            if (e === "NormalAttack") {
                                return e;
                            }
                            if (e[0] && (e[0].className.indexOf("summon") >= 0)) {
                                return "Summon";
                            }
                            return null;
                        });
                        // > 0 because we want to check whether they
                        //  are being cleared from the queue
                        if (mappedQueue.indexOf("NormalAttack") > 0) {
                            queue.attackButtonPushed = false;
                        }
                        if (mappedQueue.indexOf("Summon") > 0) {
                            queue.summonButtonPushed = false;
                        }
                        queue.queue.splice(1);
                        queue.index.splice(1);
                        queue.param.splice(1);
                        queue.abilityRailUI.e.e.splice(2);
                        queue.abilityRailUI.gIconPaths.splice(1);
                        queue.abilityRailUI.icons.splice(1);
                        return;
                }
            }
            catch (exc) {
                sendMessage({
                    type: 'error',
                    stack: exc.stack
                });
            }
        };
        function doAjaxInternal(evtData) {
            if (isShutdown)
                return;
            if (currentSettings.disableGameAjax)
                return;
            if (currentSettings.allowGameAjax === false)
                return;
            var jquery = context["$"];
            if (!jquery) {
                internal_setTimeout(function () {
                    doAjaxInternal(evtData);
                }, 500);
                return;
            }
            var url = evtData.url;
            var token = evtData.token;
            var data = evtData.data;
            var callback = evtData.callback;
            if (!callback && !token)
                log("Invalid ajax request", evtData);
            var options = {
                cache: false,
                global: false
            };
            if (data) {
                options.processData = false;
                options.contentType = "application/json";
                options.data = data;
                options.method = "POST";
                // HACK
                if (url.indexOf("_=") < 0) {
                    if (url.indexOf("?") >= 0)
                        url += "&_=" + (new Date).getTime();
                    else
                        url += "?_=" + (new Date).getTime();
                }
            }
            options.success = function (result) {
                if (callback)
                    callback(url, result, null, false);
                else if (token)
                    sendMessage({ type: 'doAjaxResult', url: url, token: token, result: result, error: null, failed: false });
            };
            options.error = function (jqXHR, exception) {
                if (callback)
                    callback(url, null, jqXHR.status + " -- " + String(exception), true);
                else if (token)
                    sendMessage({ type: 'doAjaxResult', url: url, token: token, error: jqXHR.status + " -- " + String(exception), failed: true });
            };
            jquery.ajax(url, options);
        }
        ;
        function beforeAjax(url, requestData, xhr, uid) {
            if (isShutdown)
                return;
            sendMessage({ type: 'ajaxBegin', url: url, requestData: requestData, uid });
        }
        ;
        function afterAjax(state) {
            if (isShutdown)
                return;
            // HACK: Don't forward response data for non-json bodies.
            // Otherwise, we end up sending a LOT of data over the message channel,
            //  which causes it to be cloned.
            var responseData = state.result;
            if (state.contentType &&
                (state.contentType.indexOf("application/json") < 0) &&
                (state.url.indexOf(".json") < 0)) {
                responseData = null;
            }
            else {
                // log("done", url, contentType, requestData);
            }
            sendMessage({
                type: 'ajaxComplete',
                url: state.url,
                requestData: state.data,
                responseData: responseData,
                contentType: state.contentType,
                status: state.status,
                duration: state.done - state.opened,
                delay: state.done - (state.loadingStarted || state.headersReceived || state.sent),
                uid: context.Game.userId
            });
        }
        ;
        function tryGetUserId(token) {
            if (!context.Game) {
                log("tryGetUserId operation pending", document.readyState);
                internal_setTimeout(function () { tryGetUserId(token); }, 1);
                return;
            }
            else {
                sendMessage({
                    type: "gotUserId",
                    token: token,
                    uid: context.Game.userId
                });
            }
        }
        ;
        var moduleHooks = {};
        moduleHooks["view/raid/setup"] = function (name) {
            var vrs = context.require("view/raid/setup");
            hookRaidView(vrs);
        };
        moduleHooks["view/popup"] = function (name) {
            getSettingsAsync(hookPopup);
        };
        var currentRaidView = null;
        var original_initialize_raidView;
        function hookRaidView(ctor) {
            var p = ctor.prototype;
            original_initialize_raidView = p.initialize;
            var newInitialize = function () {
                var result = original_initialize_raidView.apply(this, arguments);
                currentRaidView = result || this;
                return result;
            };
            replaceMethod(p, "initialize", newInitialize);
        }
        ;
        var original_popShow, original_popClose, original_onPushOk;
        function getSettingsAsync(callback) {
            if (currentSettings !== NoSettings)
                callback(currentSettings);
            else
                waitingForSettings.push(callback);
        }
        ;
        function hookPopup(currentSettings) {
            if (!currentSettings.autoHidePopups)
                return;
            var popup = context.require("view/popup");
            var api = popup.prototype;
            original_popShow = replaceMethod(api, "popShow", hook_popShow);
            original_popClose = replaceMethod(api, "popClose", hook_popClose);
            original_onPushOk = replaceMethod(api, "onPushOk", hook_onPushOk);
        }
        ;
        var isAutoCloseInProgress = false;
        var abortAutoClose = null;
        function doAutoClose(a, b) {
            isAutoCloseInProgress = true;
            // log("Auto-closing popup");
            var mask;
            if (this.options.maskSubMenu)
                mask = context.document.querySelector("div.mask_submenu");
            else
                mask = context.document.querySelector("div.mask");
            mask.style.display = "none";
            var elt = this.el.querySelector("div");
            elt.className += " auto-hiding";
            var footer = elt.querySelector(".prt-popup-footer");
            if (footer)
                footer.style.display = "none";
            var body = elt.querySelector(".prt-popup-body");
            if (body)
                body.style.paddingBottom = "20px";
            var btn = context.$(elt).find(".btn-usual-ok");
            var startedWhen = performance.now();
            var minimumWait = currentSettings.minimumPopupWait;
            var maximumWait = currentSettings.maximumPopupWait;
            if (!minimumWait)
                minimumWait = 350;
            if (!maximumWait)
                maximumWait = 1750;
            var holdDuration = ((elt.innerHTML.trim().length * 0.225) +
                (elt.textContent.trim().length * 6) +
                minimumWait);
            if (holdDuration > maximumWait)
                holdDuration = maximumWait;
            if (this.options.className === "pop-trialbattle-notice")
                holdDuration = 250;
            var fadeDuration = 150;
            var fadeInterval;
            abortAutoClose = function () {
                abortAutoClose = null;
                isAutoCloseInProgress = false;
                internal_clearInterval(fadeInterval);
            };
            var completeAutoClose = (function () {
                // FIXME: Why???
                btn.trigger("tap");
                elt.style.opacity = "0.0";
                elt.style.pointerEvents = "none";
                elt.className = elt.className.replace("pop-show", "pop-hide");
                elt.style.display = "none";
                abortAutoClose = null;
                isAutoCloseInProgress = false;
                internal_clearInterval(fadeInterval);
                fadeInterval = null;
            }).bind(this);
            elt.addEventListener("click", completeAutoClose, true);
            var onFadeTick = (function () {
                try {
                    var elapsed = performance.now() - startedWhen;
                    var opacity = 1.0;
                    if (elapsed <= holdDuration) {
                    }
                    else {
                        elapsed -= holdDuration;
                        opacity = Math.max(1.0 - (elapsed / fadeDuration), 0);
                        if (elapsed > fadeDuration)
                            completeAutoClose();
                    }
                    elt.style.opacity = opacity.toFixed(3);
                }
                catch (exc) {
                    logError(exc);
                }
            }).bind(this);
            fadeInterval = internal_setInterval(onFadeTick, 33);
        }
        ;
        function hook_popShow(a, b) {
            try {
                // HACK: Kill the previous auto-closing popup first.
                if (abortAutoClose) {
                    // log("An auto-close is in progress, making room for new popup");
                    abortAutoClose();
                }
            }
            catch (exc) {
                logError(exc);
            }
            var result = original_popShow.apply(this, arguments);
            try {
                if (!currentSettings.autoHidePopups)
                    return;
                var opts = this.options;
                if (opts.className === "pop-trialbattle-notice") {
                }
                else {
                    // No OK button
                    if (!opts.flagBtnOk)
                        return;
                    // Has close or cancel button(s)
                    if (opts.flagBtnClose || opts.flagBtnCancel)
                        return;
                    var exemptClassNames = [
                        "pop-ability-effect", "pop-bonus",
                        "pop-skill", "lyria-deformed",
                        "prt-bookmark-register", "prt-reward-info"
                    ];
                    var divs = this.el.querySelectorAll("div");
                    for (var i = 0, l = divs.length; i < l; i++) {
                        var div = divs[i];
                        if (div.className.indexOf("btn-usual-ok") >= 0)
                            continue;
                        for (var j = 0; j < exemptClassNames.length; j++) {
                            var ecn = exemptClassNames[j];
                            if ((this.el.className.indexOf(ecn) >= 0) || (div.className.indexOf(ecn) >= 0))
                                return;
                        }
                        // Has a button other than OK
                        if (div.className.startsWith("btn-"))
                            return;
                    }
                    // No standard OK button
                    if (!this.el.querySelector(".btn-usual-ok"))
                        return;
                }
                // If an auto-close is already in progress we don't
                //  auto-close the new popup, so that mashing doesn't
                //  make the game explode.
                if (isAutoCloseInProgress)
                    return;
                doAutoClose.call(this, a, b);
            }
            catch (exc) {
                logError(exc);
            }
            finally {
                return result;
            }
        }
        ;
        function hook_popClose() {
            isAutoCloseInProgress = false;
            return original_popClose.apply(this, arguments);
        }
        ;
        function hook_onPushOk() {
            isAutoCloseInProgress = false;
            return original_onPushOk.apply(this, arguments);
        }
        ;
        var remoteSocket = null;
        var tickIsPending = false;
        var retryCount = 3;
        function maybeInitWebSocket() {
            if (remoteSocket) {
                if ((remoteSocket.readyState === WebSocket.CLOSING) ||
                    (remoteSocket.readyState === WebSocket.CLOSED))
                    remoteSocket = null;
                else
                    return;
            }
            var interval = -1, wasConnected = false;
            remoteSocket = new WebSocket_original("ws://vm:vm@127.0.0.1:8677/socket/viramate");
            remoteSocket.addEventListener("open", function () {
                log("ws connected");
                interval = internal_setInterval(tickWebSocket, 200);
                wasConnected = true;
                sendMessage({ type: "connectionStatusChanged", connected: true });
            });
            remoteSocket.addEventListener("close", function () {
                tickIsPending = false;
                if (wasConnected)
                    log("ws disconnected");
                internal_clearInterval(interval);
                wasConnected = false;
                interval = -1;
                sendMessage({ type: "connectionStatusChanged", connected: false });
            });
            remoteSocket.addEventListener("message", function (evt) {
                var response, msg;
                try {
                    msg = JSON.parse(evt.data);
                }
                catch (exc) {
                    log("error parsing websocket message");
                    return;
                }
                try {
                    response = handleWebSocketMessage(msg);
                }
                catch (exc) {
                    log("error handling websocket message", msg, exc);
                    response = "error: " + exc.toString();
                }
                if ((response !== undefined) && ("id" in msg)) {
                    remoteSocket.send(JSON.stringify({
                        type: "result",
                        id: msg.id,
                        result: response
                    }));
                }
            });
            remoteSocket.addEventListener("error", function (e) {
                tickIsPending = false;
                if (retryCount > 0) {
                    // log("ws connection failed, retrying", e);
                    retryCount--;
                    internal_setTimeout(maybeInitWebSocket, 1750);
                }
            });
        }
        ;
        function tickWebSocket() {
            if (tickIsPending)
                return;
            tickIsPending = true;
            remoteSocket.send(JSON.stringify({
                type: "tick",
                url: context.location.href
            }));
        }
        ;
        var nextSocketToken = 1;
        var previousWindowTitle = null;
        function isReallyClickable(elt) {
            // argh
            return true;
            var rect = getRealElementRect(elt);
            return (rect[4] === 1);
        }
        ;
        function getRealElementRect(elt) {
            // The game container's zoom needs to be applied to the client rect
            var gc = context.document.querySelector("div.mobage-game-container") ||
                context.document.querySelector("div.gree-game-container");
            var computedStyle = context.getComputedStyle(gc);
            var zoom = parseFloat(computedStyle.getPropertyValue("zoom"));
            // Browser DPI also matters
            var dpi = context.devicePixelRatio;
            var ratio = zoom * dpi;
            var pr = gc.getBoundingClientRect();
            var cr = elt.getBoundingClientRect();
            // The client rect of the element has the container's native-res left/top added to it
            // var offsetLeft = cr.left - pr.left;
            // var offsetTop = cr.top - pr.top;                    
            // Then we finally scale the element's (relative to container) size and offset by ratio
            var result = [
                cr.left * ratio,
                cr.top * ratio,
                cr.width * ratio,
                cr.height * ratio,
                0
            ];
            result[4] = 1;
            // holy fuck why is html a complete disaster?
            // so in the first place getBoundingClientRect uses an absolutely batshit insane
            //  coordinate space that makes no sense, but the coordinate space elementFromPoint
            //  uses is equally batshit insane AND ALSO not documented AND ALSO not the same
            //  as getBoundingClientRect's coordinate space, anyway Chrome sucks and I need a nap.
            /*
            var testX = result[0] + 2,
                testY = result[1] + 2;
            var elementFromPoint = context.document.elementFromPoint(testX, testY);
            var isTopmost = elementFromPoint && elt.isSameNode(elementFromPoint);
            result[4] = isTopmost ? 1 : 0;
            if (!isTopmost)
                log("Hit test failed at ", testX, testY, elt, elementFromPoint);
            */
            return result;
        }
        ;
        function handleWebSocketMessage(msg) {
            var response = undefined;
            switch (msg.type) {
                case "hello":
                    log("ws handshake from " + msg.s);
                    break;
                case "pushWindowTitle":
                    if (previousWindowTitle === null)
                        previousWindowTitle = context.document.title;
                    context.document.title = msg.title;
                    response = true;
                    break;
                case "popWindowTitle":
                    if (previousWindowTitle !== null)
                        context.document.title = previousWindowTitle;
                    previousWindowTitle = null;
                    response = true;
                    break;
                case "tickOk":
                    tickIsPending = false;
                    break;
                case "navigate":
                    if (msg.url)
                        context.location.href = msg.url;
                    if (msg.reload) {
                        internal_setTimeout(function () {
                            context.location.reload();
                        }, 200);
                    }
                    response = true;
                    break;
                case "getCombatState":
                    response = getCombatState();
                    break;
                case "querySelectorAll":
                    response = [];
                    var buildResponse = function (selector) {
                        var elements = context.document.querySelectorAll(selector);
                        for (var i = 0, l = elements.length; i < l; i++) {
                            var elt = elements[i];
                            var obj = {
                                tagName: elt.tagName,
                                id: elt.id,
                                name: elt.name,
                                text: elt.innerText,
                                attributes: {},
                                classNames: Array.from(elt.classList)
                            };
                            for (var a = elt.attributes, j = 0; j < a.length; j++)
                                obj.attributes[a[j].name] = a[j].value;
                            if (msg.mark) {
                                if (elt.hasAttribute("token"))
                                    obj.token = elt.getAttribute("token");
                                else
                                    elt.setAttribute("token", obj.token = (nextSocketToken++).toString(16));
                            }
                            response.push(obj);
                        }
                    };
                    if (typeof (msg.selector) === "string")
                        buildResponse(msg.selector);
                    else {
                        for (var i = 0, l = msg.selector.length; i < l; i++)
                            buildResponse(msg.selector[i]);
                    }
                    break;
                case "getElementRect":
                    var element = context.document.querySelector(msg.selector);
                    if (element) {
                        response = getRealElementRect(element);
                    }
                    else {
                        response = [];
                    }
                    break;
                case "scrollElementIntoView":
                    var element = context.document.querySelector(msg.selector);
                    if (element) {
                        element.scrollIntoView({ behavior: "instant" });
                        response = "ok";
                    }
                    else {
                        response = "not found";
                    }
                    break;
                case "trySelectSummon":
                    response = doTrySelectSummon(msg);
                    break;
                case "tryClickElement":
                    var element = context.document.querySelector(msg.selector);
                    if (element) {
                        if (!isReallyClickable(element)) {
                            log("Element not clickable", element);
                            response = false;
                            break;
                        }
                        response = generateClick(element, false, null);
                    }
                    else {
                        response = false;
                    }
                    break;
                case "trySetTarget":
                    var element = context.document.querySelector("a.btn-targeting.enemy-" + msg.index);
                    if (element && context.stage && context.stage.gGameStatus) {
                        if (context.stage.gGameStatus.target !== msg.index)
                            response = generateClick(element, false, null);
                        else
                            response = true;
                    }
                    else {
                        response = false;
                    }
                    break;
                case "trySetOugiStatus":
                    var element = context.document.querySelector("div.btn-lock");
                    if (element && context.stage && context.stage.gGameStatus) {
                        var isActive = context.stage.gGameStatus.lock === 0;
                        if (isActive !== msg.active)
                            response = generateClick(element, false, null);
                        else
                            response = true;
                    }
                    else {
                        response = false;
                    }
                    break;
                case "xhr":
                    var xhrCallback = function (url, result, error, failed) {
                        remoteSocket.send(JSON.stringify({
                            type: "result",
                            id: msg.id,
                            result: {
                                url: url,
                                result: result,
                                error: error,
                                failed: failed
                            }
                        }));
                    };
                    doAjaxInternal({
                        url: msg.url,
                        data: msg.data,
                        callback: xhrCallback
                    });
                    break;
                case "waitForSkillQueueItem":
                    registerSkillWait(msg.id, msg.abilityName, msg.abilityId, Math.max(msg.timeout, 100));
                    break;
                case "waitForIdle":
                    registerIdleWait(msg.id);
                    break;
                default:
                    sendMessage(msg);
                    break;
            }
            return response;
        }
        ;
        function canAct(gsm) {
            return !gsm.btn_lock &&
                !gsm.attacking &&
                !gsm.usingAbility &&
                !gsm.finish &&
                !!context.document.querySelector("div.btn-attack-start.display-on");
        }
        function unpackSkillQueueItemForGet(e) {
            if (typeof (e) === "string")
                return e;
            var ua = e.$useAbility;
            if (ua) {
                if (ua[0] && (ua[0].className.indexOf("btn-summon") >= 0))
                    return "Summon";
                var elt = ua[0].querySelector("div[ability-id]");
                if (elt)
                    return elt.getAttribute("ability-id");
            }
            // FIXME: ???
            return null;
        }
        ;
        function unpackSkillQueueItem(e) {
            if (typeof (e) === "string")
                return e;
            var ua = e.$useAbility;
            if (ua) {
                if (ua[0] && (ua[0].className.indexOf("btn-summon") >= 0))
                    return "Summon";
                var elt = ua[0].querySelector("div[ability-id]");
                if (elt)
                    return "div." + elt.className.replace(/ /g, ".");
            }
            // FIXME: ???
            return null;
        }
        ;
        function getCombatState() {
            var response = gameStatusMessage;
            if (response) {
                response = JSON.parse(JSON.stringify(response));
                if (context.stage && context.stage.gGameStatus)
                    response.skillQueue = context.stage.gGameStatus.attackQueue.queue.map(unpackSkillQueueItemForGet);
                else
                    response.skillQueue = [];
                var elt = context.document.querySelector("div.prt-battle-num div.txt-info-num");
                if (elt && elt.firstChild) {
                    response.currentBattle = parseInt(elt.firstChild.className.replace("num-info", ""));
                    response.totalBattles = parseInt(elt.lastChild.className.replace("num-info", ""));
                }
                response.canAct = canAct(response);
            }
            return response;
        }
        function registerIdleWait(id) {
            var interval = -1;
            var initialUrl = context.location.href;
            var didNavigate = false;
            var callback = function () {
                try {
                    var cs = getCombatState();
                    var isIdle = (cs.canAct ||
                        cs.finish) &&
                        ((cs.currentBattle === undefined) ||
                            (cs.currentBattle > 0)) &&
                        (cs.skillQueue.length < 1);
                    if (!isCombatPage(context.location.hash)) {
                        isIdle = true;
                        didNavigate = true;
                    }
                    // HACK
                    if (context.location.href !== initialUrl) {
                        isIdle = true;
                        didNavigate = true;
                    }
                    if (isIdle && (interval >= 0)) {
                        internal_clearInterval(interval);
                        interval = -1;
                        remoteSocket.send(JSON.stringify({
                            type: "result",
                            id: id,
                            result: gameStatusMessage.finish || didNavigate
                        }));
                    }
                }
                catch (exc) {
                    log(exc);
                }
            };
            interval = internal_setInterval(callback, 20);
        }
        ;
        function registerSkillWait(id, abilityName, abilityId, timeout) {
            var interval = -1;
            var initialUrl = context.location.href;
            var didNavigate = false;
            var waitStarted = context.performance.now();
            var waitExpiresWhen = waitStarted + timeout;
            if (abilityName != null)
                abilityName = abilityName.toLowerCase().trim();
            if (abilityId != null)
                abilityId = Number(abilityId) | 0;
            else
                abilityId = -9999;
            var callback = function () {
                try {
                    if (!isCombatPage(context.location.hash))
                        didNavigate = true;
                    if (context.location.href !== initialUrl)
                        didNavigate = true;
                    var selectPopup = context.document.querySelector("div.pop-select-member");
                    var resultPopup = context.document.querySelector("div.pop-usual.pop-show");
                    var isPopupOpen = (resultPopup && resultPopup.style.display !== "none") ||
                        (selectPopup && selectPopup.style.display === "block");
                    var isInQueue = false;
                    var gs = context.stage.gGameStatus;
                    if (gs && gs.attackQueue && gs.attackQueue.queue) {
                        isInQueue = gs.attackQueue.queue.some(function (elt) {
                            if (!elt)
                                return false;
                            if (!elt.$useAbility)
                                return false;
                            var ua = elt.$useAbility[0];
                            if (!ua)
                                return false;
                            var fc = ua.firstElementChild;
                            if (!fc)
                                return false;
                            var an = (fc.getAttribute("ability-name") || "").trim().toLowerCase();
                            if (abilityName && an.indexOf(abilityName) >= 0)
                                return true;
                            var ai = Number(fc.getAttribute("ability-id") || "-1") | 0;
                            if (ai === abilityId)
                                log("found in queue", abilityId, ai, ua, fc);
                            return false;
                        });
                    }
                    var timedOut = context.performance.now() > waitExpiresWhen;
                    if ((didNavigate || isInQueue || timedOut || isPopupOpen) && (interval >= 0)) {
                        internal_clearInterval(interval);
                        interval = -1;
                        var ok = isInQueue || isPopupOpen;
                        if (isPopupOpen) {
                            if (resultPopup.className.indexOf("error") >= 0)
                                ok = false;
                        }
                        remoteSocket.send(JSON.stringify({
                            type: "result",
                            id: id,
                            result: ok
                        }));
                    }
                }
                catch (exc) {
                    log(exc);
                }
            };
            interval = internal_setInterval(callback, 10);
        }
        ;
        var actualDefine = undefined;
        var anonymousModule = null;
        function hashString(text) {
            var hasher = new jsSHA("SHA-256", "TEXT");
            hasher.update(text);
            return hasher.getHash("HEX");
        }
        ;
        function maybeHashModule(name, obj) {
            if (!name)
                return;
            var moduleId = btoa(name.trim().toLowerCase());
            if (moduleIds.indexOf(moduleId) < 0)
                return;
            var hash, body;
            try {
                if (!obj)
                    body = "<<<null>>>";
                else if (obj.call &&
                    obj.apply &&
                    ({}.toString.call(obj) === '[object Function]')) {
                    body = obj.toString();
                    body = body.replace(/function \(/g, "function(");
                }
                else {
                    body = JSON.stringify(obj);
                }
                hash = hashString(body);
            }
            catch (exc) {
                logError(exc);
                hash = "error";
            }
            sendMessage({
                type: "moduleLoaded",
                id: moduleId,
                hash: hash,
                body: body
            });
        }
        ;
        var hook_onResourceLoad = function (context, map, depArray) {
            try {
                var name = map.name;
                var hook = moduleHooks[name];
                if (hook)
                    hook(name);
            }
            catch (exc) {
            }
        };
        hook_onResourceLoad.toString = function () {
            return "function () {}";
        };
        var installRequireHook = function () {
            var rjs = context.requirejs;
            if (rjs.onResourceLoad)
                return;
            Object.defineProperty(rjs, "onResourceLoad", {
                enumerable: false,
                value: hook_onResourceLoad
            });
        };
        function processObjectModuleDefinition(name, dict) {
            maybeHashModule(name, dict);
        }
        ;
        function processDependencyResolve(arr) {
        }
        ;
        function processFunctionModuleDefinition(name, fn) {
            maybeHashModule(name, fn);
        }
        ;
        function processModuleDefinition(args) {
            switch (args.length) {
                case 1:
                    {
                        var arg = args[0];
                        var ta = typeof (arg);
                        if (ta === "object") {
                            if (Array.isArray(arg))
                                return processDependencyResolve(arg);
                            else
                                return processObjectModuleDefinition(null, arg);
                        }
                        else if (ta === "function") {
                            return processFunctionModuleDefinition(null, arg);
                        }
                    }
                    break;
                case 2:
                    {
                        var arg0 = args[0];
                        var arg1 = args[1];
                        if (Array.isArray(arg0)) {
                            processDependencyResolve(arg0);
                            arg0 = anonymousModule;
                        }
                        if (typeof (arg1) === "function")
                            return processFunctionModuleDefinition(arg0, arg1);
                        else if (typeof (arg1) === "object")
                            return processObjectModuleDefinition(arg0, arg1);
                    }
                    break;
                case 3:
                    {
                        var arg0 = args[0];
                        var arg1 = args[1];
                        var arg2 = args[2];
                        if (!arg0)
                            arg0 = anonymousModule;
                        if (Array.isArray(arg1))
                            processDependencyResolve(arg1);
                        if (typeof (arg2) === "function")
                            return processFunctionModuleDefinition(arg0, arg2);
                        else if (typeof (arg2) === "object")
                            return processObjectModuleDefinition(arg0, arg2);
                    }
                    break;
            }
        }
        ;
        var actualFinger = null;
        function hook_finger(a, b) {
            var result = actualFinger(a, b);
            a.Finger.motionThreshold = 15;
            a.Finger.pressDuration = 750;
            a.Finger.doubleTapInterval = 1;
            a.Finger.flickDuration = 500;
            return result;
        }
        ;
        function beforeDefine(args) {
            installRequireHook();
            var maybeModuleName = args[0];
            switch (maybeModuleName) {
                case "finger":
                    actualFinger = args[2];
                    if (currentSettings && currentSettings.tranquilizeFinger)
                        return state.actualDefine.call(this, args[0], args[1], hook_finger);
                default:
                    return;
            }
        }
        ;
        function afterDefine(args) {
            if (!isShutdown)
                processModuleDefinition(args);
        }
        ;
        state.beforeDefine = beforeDefine;
        state.afterDefine = afterDefine;
        function restoreReplacedMethods() {
            for (var i = 0; i < replacedMethods.length; i++) {
                var rm = replacedMethods[i];
                try {
                    var target = rm[0];
                    var name = rm[1];
                    var oldValue = rm[2];
                    target[name] = oldValue;
                }
                catch (exc) {
                    logError("Failed restore of method '" + name + "'", exc);
                }
            }
        }
        ;
        function doShutdown() {
            log("Performing shutdown");
            isShutdown = true;
            try {
                newRAF.enabled = false;
                restoreReplacedMethods();
                isLagWorkaroundActive = false;
                isPerformanceStatsActive = false;
                for (var i = 0, l = queuedFrameCallbacks.length; i < l; i++)
                    context.requestAnimationFrame(queuedFrameCallbacks[i]);
            }
            catch (exc) {
                logError("Error during shutdown", exc);
            }
            if (true)
                sendMessage({
                    type: "shutdownOk"
                });
        }
        ;
        // Chrome's proxy implementation is broken such that XHRs will randomly 
        //  stall forever unless another request is issued through the proxy.
        // So, if any XHRs are in progress we fire off a garbage request to wake
        //  up the proxy.
        function proxyHeartbeat() {
            currentHeartbeatTimeout = null;
            if (!currentSettings.proxyHeartbeat)
                return;
            if (!resignedToBloodshed)
                return;
            if (liveXhrs.size < 1) {
                currentHeartbeatDelay = initialHeartbeatDelay;
                return;
            }
            var params = {
                method: "GET",
                mode: "cors",
                cache: "no-store",
                referrer: "no-referrer",
                credentials: "omit"
            };
            var req = new Request("http://luminance.org/hi?_=" + (heartbeatToken++));
            fetch(req);
            currentHeartbeatDelay += heartbeatDelayBackoffRate;
            currentHeartbeatTimeout = internal_setTimeout(proxyHeartbeat, currentHeartbeatDelay);
        }
        ;
        var canvasPrototype = context.CanvasRenderingContext2D.prototype;
        var original_drawImage = canvasPrototype.drawImage;
        var newDrawImage = function drawImage() {
            if (updateFrameskip(this))
                return;
            var wasEnabled = this.imageSmoothingEnabled;
            var result, started, ended;
            if (currentSettings && currentSettings.imageSmoothingHack)
                this.imageSmoothingEnabled = false;
            try {
                result = original_drawImage.apply(this, arguments);
            }
            finally {
                if (wasEnabled && currentSettings && currentSettings.imageSmoothingHack)
                    this.imageSmoothingEnabled = wasEnabled;
                return result;
            }
        };
        replaceMethod(canvasPrototype, "drawImage", newDrawImage);
        var wrapWithFrameskipper = function (methodName) {
            var original = canvasPrototype[methodName];
            var replacement = function () {
                if (updateFrameskip(this))
                    return;
                return original.apply(this, arguments);
            };
            replaceMethod(canvasPrototype, methodName, replacement);
        };
        var canvasMethodNames = [
            "clearRect", "fillRect", "drawImage",
            "fill", "fillText", "stroke", "strokeRect", "strokeText"
        ];
        canvasMethodNames.forEach(wrapWithFrameskipper);
        function checkForFinishedRaidLoad() {
            var elt = context.document.querySelector("div#opaque-mask");
            if (!elt)
                return;
            if (elt.style.display !== "none")
                return;
            raidLoadEndObservedWhen = performance.now();
            internal_clearInterval(raidLoadTimingInterval);
            raidLoadTimingInterval = null;
            log("Raid finished loading after " + ((raidLoadEndObservedWhen - raidLoadStartObservedWhen) / 1000).toFixed(2) + "secs.");
        }
        ;
        function startRaidLoadTimer() {
            if (context.location.host !== "game.granbluefantasy.jp")
                return;
            if (context.location.hash.indexOf("#raid/") < 0)
                return;
            if (!raidLoadTimingInterval) {
                raidLoadStartObservedWhen = performance.now();
                raidLoadTimingInterval = internal_setInterval(checkForFinishedRaidLoad, 10);
            }
        }
        ;
        getSettingsAsync(function (settings) {
            startRaidLoadTimer();
        });
    }
    catch (exc) {
        logError("Unhandled exception in external.js", exc);
    }
};
//# sourceMappingURL=external.js.map