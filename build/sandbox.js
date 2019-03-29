"use strict";
// see sandbox design.txt
// also, sorry in advance
// You'll want to set this to false when debugging sandbox issues or trying to set content script breakpoints.
var detachSandbox = true;
var detachSandboxImmediately = true;
var trace = false;
class ContentToSandboxChannel {
    constructor(port) {
        this.port = port;
    }
    addListener(listener) {
        this.port.addEventListener("message", listener);
    }
    postMessage(msg) {
        if (trace)
            log("content -> sandbox", msg);
        this.port.postMessage(msg);
    }
}
;
;
var _sandboxInit = function sandbox() {
    "use strict";
    var sandboxWindow = window;
    var parentWindow = window.parent;
    var _ = {
        trace: false,
        sandboxWindow: sandboxWindow,
        parentWindow: parentWindow,
        channel: null,
        console: parentWindow.console,
        consoleLog: parentWindow.console.log,
        consoleError: parentWindow.console.error,
        JSON: JSON,
        pendingMessages: [],
        onIncomingMessage: null,
        log: log,
        logError: logError,
        executionEnvironment: null,
        secretToken: 0,
        sendMessage: sendMessage,
        actualDefine: null,
        beforeDefine: null,
        afterDefine: null,
        bhstatic: "//127.0.0.1/bhstatic",
        moduleIds: [],
    };
    class SandboxToContentChannel {
        constructor(port, secretToken) {
            // Chrome decided to stop implementing the MessagePort and BroadcastChannel
            //  specs correctly. Hooray!
            this.port = port;
            var magicKey = String.fromCharCode(Math.floor(Math.random() * 26) + 'a'.charCodeAt(0)) + secretToken;
            if (_.trace)
                log(magicKey);
            this.magicDict = parentWindow[magicKey] = { port: port, listeners: [] };
            // So what's going on here is for some reason the event listener function
            //  needs to have been both created and added by code running in the parent
            //  window context, otherwise it silently gets GC'd even though it should
            //  still be alive and both sides of the channel are still alive.
            // If we don't go through this elaborate song and dance, the port will
            //  be able to send but not receive, because that makes sense
            parentWindow.eval("(function () { var d = " + magicKey + "; " +
                "var messageThunk = function (evt) { for (var l of d.listeners) l(evt); }; " +
                "d.port.addEventListener('message', messageThunk); " +
                "})();");
            // Yeah, the object doesn't even need to be rooted in the other window.
            // Chrome's lifetime management here is just completely hosed.
            delete parentWindow[magicKey];
        }
        addListener(listener) {
            this.magicDict.listeners.push(listener);
        }
        postMessage(msg) {
            if (_.trace)
                log("sandbox -> content", msg);
            this.port.postMessage(msg);
        }
    }
    sandboxWindow.onerror = function (evt) {
        logError(evt);
    };
    function makeExecutionEnvironment(state) {
        var evalInContext = function evalInContext(js) {
            // IMPORTANT: If we use our new Function, the function is implicitly attached
            //  to the iframe's lifetime instead of the parent window, for some incomprehensible
            //  goddamn reason, so everything goes to shit
            var fn = new parentWindow.Function("state", js);
            try {
                var evalResult = fn.call(state.sandboxWindow, state);
                return evalResult;
            }
            catch (exc) {
                logError(exc);
                return exc;
            }
        };
        var result = {
            evalInContext: evalInContext
        };
        return result;
    }
    ;
    function inboundMessageHandler(evt) {
        if (_.trace)
            log("executionContext in", evt.data.type);
        if (evt.data.type === "evalInContext") {
            var result = undefined;
            try {
                result = _.executionEnvironment.evalInContext(evt.data.js);
            }
            catch (exc) {
                logError(exc);
            }
            if (evt.data.token)
                _.channel.postMessage({ type: "evalInContextResult", token: evt.data.token, result: result });
        }
        else if (_.onIncomingMessage)
            _.onIncomingMessage(evt);
        else
            throw new Error("No handler for inbound message");
    }
    function channelSetup(evt) {
        if (evt.data.type !== "vmInit")
            return;
        try {
            // FIXME
            Object.assign(_, evt.data);
            delete _["type"];
            var secretToken = _.secretToken = evt.data.secretToken;
            var port = evt.ports[0];
            port.start();
            _.channel = new SandboxToContentChannel(port, secretToken);
            _.channel.addListener(inboundMessageHandler);
            parentWindow.removeEventListener("message", channelSetup, true);
            _.executionEnvironment = makeExecutionEnvironment(_);
            evt.preventDefault();
            evt.stopImmediatePropagation();
            port.postMessage({ type: "vmHello", secretToken: _.secretToken });
            var pm = _.pendingMessages;
            for (var i = 0, l = pm.length; i < l; i++)
                _.channel.postMessage(pm[i]);
            pm.length = 0;
            log("External channel established");
        }
        catch (exc) {
            logError("Error setting up channel", exc);
        }
    }
    ;
    parentWindow.addEventListener("message", channelSetup, true);
    function log(...args) {
        try {
            if (typeof (args[0]) === "string")
                args[0] = "vms> " + args[0];
            else
                args.unshift("vms>");
            return _.consoleLog.apply(_.console, args);
        }
        catch (exc) {
            // :-(
        }
    }
    ;
    function logError(...args) {
        try {
            if (typeof (args[0]) === "string")
                args[0] = "vms> " + args[0];
            else
                args.unshift("vms>");
            return _.consoleError.apply(_.console, args);
        }
        catch (exc) {
            // :-(
        }
    }
    ;
    function sendMessage(msg) {
        if (_.channel) {
            _.channel.postMessage(msg);
        }
        else
            _.pendingMessages.push(msg);
    }
    ;
    var define = function define() {
        if (_.beforeDefine) {
            var hookResult;
            try {
                hookResult = _.beforeDefine.call(this, Array.from(arguments));
                if (hookResult)
                    return hookResult;
            }
            catch (exc) {
                logError("beforeDefine error", exc);
            }
        }
        var result = _.actualDefine.apply(this, arguments);
        try {
            if (_.afterDefine)
                _.afterDefine.call(this, Array.from(arguments));
        }
        catch (exc) {
            logError("afterDefine error", exc);
        }
        return result;
    };
    var set_define = function (value) {
        log("require.js loaded");
        if (value)
            define.toString = value.toString.bind(value);
        _.actualDefine = value;
    };
    var get_define = function () {
        if (_.actualDefine)
            return define;
        else
            return undefined;
    };
    Object.defineProperty(parentWindow, "define", {
        enumerable: true,
        configurable: false,
        get: get_define,
        set: set_define
    });
};
var hasStartedSandboxInitialization = false, hasCompletedFirstStageSandboxInitialization = false;
class ExecutionEnvironmentProxy {
    constructor(channel, messageHandler) {
        this.channel = channel;
        this.nextToken = 1;
        this.tokens = {};
        this.messageHandler = messageHandler;
        channel.addListener(this.onPortMessage.bind(this));
    }
    onPortMessage(evt) {
        if (evt.data.type === "evalInContextResult") {
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            if (evt.data.token) {
                var callback = this.tokens[evt.data.token];
                if (callback)
                    callback(evt.data.result);
                delete this.tokens[evt.data.token];
            }
        }
        else {
            if (trace)
                log("Content script in", evt.data.type);
            return this.messageHandler(evt);
        }
    }
    evalInContext(js, callback) {
        var token = callback ? this.nextToken++ : null;
        if (callback)
            this.tokens[token] = callback;
        this.channel.postMessage({ type: "evalInContext", js: js, token: token });
    }
    dispose() {
        // FIXME
    }
}
function initExternalSandbox(callback, initData, messageHandler) {
    if (hasStartedSandboxInitialization) {
        log("Already started initializing sandbox, request ignored");
        return;
    }
    hasStartedSandboxInitialization = true;
    var sandboxParent = document.createElement("div");
    sandboxParent.style.display = "none";
    document.documentElement.appendChild(sandboxParent);
    var scriptSandbox = document.createElement("iframe");
    sandboxParent.appendChild(scriptSandbox);
    var sandboxWindow = scriptSandbox.contentWindow;
    var sandboxDocument = scriptSandbox.contentDocument;
    var elt = sandboxDocument.createElement("script");
    elt.type = "text/javascript";
    elt.textContent = jsFromClosure(_sandboxInit);
    sandboxDocument.documentElement.appendChild(elt);
    var doDetachSandbox = function () {
        log("detaching sandbox");
        document.documentElement.removeChild(sandboxParent);
    };
    initMessageChannel(sandboxWindow, initData, function (channel, secretToken) {
        var ee = new ExecutionEnvironmentProxy(channel, messageHandler);
        hasCompletedFirstStageSandboxInitialization = true;
        var readyToDetach = function () {
            if (detachSandbox) {
                if (detachSandboxImmediately)
                    window.setTimeout(doDetachSandbox, 1);
                else
                    window.setTimeout(doDetachSandbox, 10000);
            }
        };
        callback(ee, secretToken, readyToDetach);
    });
}
;
function initMessageChannel(sandboxWindow, initData, callback) {
    var mc = new MessageChannel();
    var vmHelloListener = function (evt) {
        if (evt.data.type === "vmHello") {
            mc.port1.removeEventListener("message", vmHelloListener);
            if (callback) {
                var c = new ContentToSandboxChannel(mc.port1);
                callback(c, evt.data.secretToken);
            }
        }
        else {
            logError("Unhandled message while waiting for vmhello", evt.data.type);
        }
    };
    mc.port1.addEventListener("message", vmHelloListener);
    var secretToken = (Math.random() * 8192000) | 0;
    initData.type = "vmInit";
    initData.secretToken = secretToken;
    mc.port1.start();
    mc.port2.start();
    sandboxWindow.parent.postMessage(initData, "*", [mc.port2]);
}
;
function jsFromClosure(closure) {
    var prologue = "//# sourceURL=chrome-extension://" + chrome.runtime.id + "/injected/" + closure.name + "\n";
    var rawBody = closure.toString().trim();
    var headerEraser = /function( *)([a-zA-Z0-9_]*)( *)\((.*)\)( *)\{(.*)/;
    var filteredBody = rawBody.replace(headerEraser, "").replace(/\r\n/g, "\n").trim();
    if (!filteredBody.endsWith("}"))
        throw new Error();
    return prologue + filteredBody.substr(0, filteredBody.length - 1).trim();
}
;
//# sourceMappingURL=sandbox.js.map