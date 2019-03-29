"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var oppenheimerTracing = false;
function parseFunction(f) {
    return parseFunctionText(f.toString());
}
;
function parseFunctionText(functionDeclaration) {
    var program = esprima.parseScript("var _ = " + functionDeclaration + ";");
    var decl = program.body[0];
    var funcExpr = decl.declarations[0].init;
    return funcExpr;
}
;
class NodeInfo {
}
;
class NameInfo {
    constructor(depth, name, value, host, originalNode) {
        this.depth = depth;
        this.name = name;
        this.value = value;
        this.originalNode = originalNode;
        this.host = host;
        this.references = new Set();
        this.observedValues = [];
        switch (typeof (value)) {
            case "number":
            case "string":
            case "undefined":
                this.isLiteral = true;
                break;
            default:
                this.isLiteral = (value === null);
                break;
        }
        if (value)
            this.observedValues.push(value);
    }
}
;
class ScopeInfo {
    constructor(parent, name) {
        this.parent = parent;
        this.depth = parent ? parent.depth + 1 : 0;
        this.name = name;
        this.names = new Map();
        this._indices = parent ? null : { g: 0, f: 0, t: 0 };
    }
    get indices() {
        return this.parent ? this.parent.indices : this._indices;
    }
    log(...args) {
        if (!oppenheimerTracing)
            return;
        console.log("[" + this.depth + (this.name ? " " + this.name : "") + "]", ...args);
    }
    define(identifier, host, originalNode, value) {
        var prefix = (this.get(identifier) ? "local var " : "var ") + identifier.name + " =";
        this.log(prefix, value);
        var info = new NameInfo(this.depth, identifier.name, value, host, originalNode);
        this.names.set(identifier.name, info);
        return info;
    }
    get(identifier) {
        var key;
        if (typeof (identifier) === "string")
            key = identifier;
        else
            key = identifier.name;
        var result = this.names.get(key);
        if (!result && this.parent)
            result = this.parent.get(key);
        return result;
    }
    assign(identifier, newValue) {
        var name = this.get(identifier);
        if (!name)
            return false;
        if (name.value !== undefined) {
            name.value = undefined;
            this.log("[" + name.depth + "]" + name.name + " becomes indeterminate");
        }
        else {
            name.value = newValue;
            this.log("[" + name.depth + "]" + name.name + "=", newValue);
        }
        name.observedValues.push(newValue);
        return true;
    }
}
;
function deobfuscateFunction(f) {
    var result = JSON.parse(JSON.stringify(f));
    var topLevelScope = walkFunction(null, result);
    return result;
}
;
function walkFunction(parentScope, f) {
    var scope = new ScopeInfo(parentScope, f.id ? f.id.name : null);
    // scope.log(f);
    for (var p of f.params)
        scope.define(p, null, null);
    walkBlock(scope, f.body);
    fixupVariables(scope);
    return scope;
}
;
function walkBlock(scope, block) {
    for (var i = 0; i < block.body.length; i++)
        block.body[i] = walkStatement(scope, block.body[i]);
}
function walkStatement(scope, stmt) {
    switch (stmt.type) {
        case "VariableDeclaration":
            {
                for (var d of stmt.declarations) {
                    var evaluated = evaluateInScope(scope, d.init, true);
                    var defn = scope.define(d.id, stmt, d, evaluated);
                    if (d.init) {
                        defn.init = d.init;
                        if (evaluated === undefined)
                            walkExpression(scope, d.init);
                        else if (d.init.type !== "Literal")
                            d.init = makeLiteralOrReturn(scope, evaluated, d.init);
                    }
                }
            }
            break;
        case "ExpressionStatement":
            {
                walkExpression(scope, stmt.expression);
            }
            break;
        case "ReturnStatement":
            {
                if (stmt.argument)
                    walkExpression(scope, stmt.argument);
            }
            break;
        case "IfStatement":
            {
                var evaluated = evaluateInScope(scope, stmt.test, true);
                if (evaluated === undefined)
                    walkExpression(scope, stmt.test);
                else
                    stmt.test = makeLiteralOrReturn(scope, evaluated, stmt.test);
                if (stmt.consequent)
                    stmt.consequent = walkStatement(scope, stmt.consequent);
                if (stmt.alternate)
                    stmt.alternate = walkStatement(scope, stmt.alternate);
            }
            break;
        case "BlockStatement":
            {
                var blockScope = new ScopeInfo(scope, null);
                walkBlock(blockScope, stmt);
                fixupVariables(blockScope);
            }
            break;
        default:
            {
                if (oppenheimerTracing)
                    console.log("Unhandled statement type", stmt.type);
            }
            break;
    }
    return stmt;
}
var StringJoinFunction = "<<<makeArray(arguments).join('')>>>";
function makeLiteralNode(value) {
    if (value === StringJoinFunction)
        return null;
    switch (typeof (value)) {
        case "string":
        case "number":
            return { type: "Literal", value: value, raw: String(value) };
        default:
            return null;
    }
}
function evaluateInScope(scope, expr, expand, treatUnknownIdentifiersAsStrings) {
    if (!expr)
        return;
    switch (expr.type) {
        case "Literal":
            return expr.value;
        case "Identifier":
            {
                var name = scope.get(expr);
                if (!name) {
                    if (treatUnknownIdentifiersAsStrings)
                        return expr.name;
                    else
                        scope.log("reference to undefined name", expr.name);
                    return;
                }
                if (name.isLiteral && !!expand)
                    return name.value;
                else
                    return name;
            }
            break;
        case "FunctionExpression":
            {
                var functionScope = walkFunction(scope, expr);
                // Special-case detection for Array.from(arguments).join("")
                if (expr.params.length !== 0)
                    return;
                if (expr.body.type !== "BlockStatement")
                    return;
                if (expr.body.body.length !== 1)
                    return;
                var s = expr.body.body[0];
                if (s.type !== "ReturnStatement")
                    return;
                if (s.argument.type !== "CallExpression")
                    return;
                var c = s.argument;
                if (c.arguments.length !== 1)
                    return;
                if (evaluateInScope(scope, c.arguments[0], true) !== "")
                    return;
                if (c.callee.type !== "MemberExpression")
                    return;
                if (evaluateInScope(scope, c.callee.property, true, true) !== "join")
                    return;
                var cc = c.callee.object;
                if (cc.type !== "CallExpression")
                    return;
                if (cc.arguments.length !== 1)
                    return;
                if (evaluateInScope(scope, cc.arguments[0], true, true) !== "arguments")
                    return;
                if (cc.callee.type !== "MemberExpression")
                    return;
                if (evaluateInScope(scope, cc.callee.property, true, true) !== "makeArray")
                    return;
                scope.log("Identified stringjoin.");
                return StringJoinFunction;
            }
            break;
        case "LogicalExpression":
        case "BinaryExpression":
            {
                var lhs = evaluateInScope(scope, expr.left, true);
                var rhs = evaluateInScope(scope, expr.right, true);
                if ((lhs === undefined) && (rhs === undefined))
                    break;
                switch (expr.operator) {
                    case "+":
                        {
                            if ((lhs !== undefined) &&
                                (rhs !== undefined) &&
                                (typeof (lhs) !== "object") &&
                                (typeof (rhs) !== "object"))
                                return lhs + rhs;
                        }
                        break;
                    case "||":
                        {
                            if (lhs !== undefined)
                                return lhs;
                            else
                                return rhs;
                        }
                        break;
                }
                scope.log("Failed to inline eval operator", expr.operator, lhs, rhs);
            }
            break;
        case "UnaryExpression":
            {
                var lhs = evaluateInScope(scope, expr.argument, true);
                switch (expr.operator) {
                    case "!":
                        if ((lhs === false) || (lhs === 0))
                            return true;
                        else if ((lhs === true) || (lhs === 1))
                            return false;
                        else
                            return;
                }
            }
            break;
        case "CallExpression":
            {
                var callee = evaluateInScope(scope, expr.callee, true);
                if (callee === StringJoinFunction) {
                    var result = "";
                    for (var elt of expr.arguments) {
                        var value = evaluateInScope(scope, elt, true);
                        if (typeof (value) !== "string") {
                            scope.log("Mystery join arg", value);
                            return;
                        }
                        else {
                            result += value;
                        }
                    }
                    return result;
                }
                else {
                    return;
                }
            }
            break;
    }
}
function addRefAndReturn(scope, expr) {
    var _expr = expr;
    if (_expr.type === "Identifier") {
        var name = scope.get(_expr);
        if (name)
            name.references.add(_expr);
    }
    return expr;
}
function makeLiteralOrReturn(scope, evaluated, expr) {
    var literal = makeLiteralNode(evaluated);
    return literal || addRefAndReturn(scope, expr);
}
function walkExpression(scope, expr) {
    if (!expr)
        return expr;
    switch (expr.type) {
        case "FunctionExpression":
            {
                walkFunction(scope, expr);
            }
            break;
        case "LogicalExpression":
        case "BinaryExpression":
            {
                expr.left = walkExpression(scope, expr.left);
                expr.right = walkExpression(scope, expr.right);
            }
            break;
        case "UnaryExpression":
            {
                expr.argument = walkExpression(scope, expr.argument);
            }
            break;
        case "SequenceExpression":
            {
                for (var expr2 of expr.expressions)
                    walkExpression(scope, expr2);
            }
            break;
        case "ConditionalExpression":
            {
                expr.test = walkExpression(scope, expr.test);
                expr.consequent = walkExpression(scope, expr.consequent);
                expr.alternate = walkExpression(scope, expr.alternate);
            }
            break;
        case "AssignmentExpression":
            {
                var evaluated = evaluateInScope(scope, expr.right, true);
                if (expr.left.type === "Identifier") {
                    if (evaluated === undefined) {
                        scope.log("Unevaluated assignment to " + expr.left.name);
                        var leftNode = scope.get(expr.left);
                        if (leftNode && (leftNode.value !== undefined))
                            scope.assign(expr.left, undefined);
                        expr.right = walkExpression(scope, expr.right);
                    }
                    else {
                        scope.assign(expr.left, evaluated);
                        expr.right = makeLiteralOrReturn(scope, evaluated, expr.right);
                    }
                }
                else {
                    expr.left = walkExpression(scope, expr.left);
                    expr.right = makeLiteralNode(evaluated) || addRefAndReturn(scope, walkExpression(scope, expr.right));
                }
            }
            break;
        case "CallExpression":
            {
                expr.callee = walkExpression(scope, expr.callee);
                for (var i = 0; i < expr.arguments.length; i++) {
                    var arg = expr.arguments[i];
                    var evaluated = evaluateInScope(scope, arg, true);
                    if (evaluated !== undefined)
                        expr.arguments[i] = makeLiteralOrReturn(scope, evaluated, expr.arguments[i]);
                    else
                        expr.arguments[i] = walkExpression(scope, arg);
                }
            }
            break;
        case "MemberExpression":
            {
                expr.object = walkExpression(scope, expr.object);
                if (expr.computed) {
                    var propertyName = evaluateInScope(scope, expr.property, true);
                    if (propertyName === undefined)
                        expr.property = walkExpression(scope, expr.property);
                    else {
                        var literal = makeLiteralNode(propertyName);
                        if (literal && Number.isNaN(parseFloat(propertyName))) {
                            expr.property = { type: "Identifier", name: propertyName };
                            expr.computed = false;
                        }
                    }
                }
            }
            break;
        case "ObjectExpression":
            {
                for (var i = 0; i < expr.properties.length; i++) {
                    var prop = expr.properties[i];
                    prop.value = walkExpression(scope, prop.value);
                }
            }
            break;
        case "Identifier":
            {
                var value = evaluateInScope(scope, expr, true);
                if (value !== undefined) {
                    // RISKY: What about reassignment?
                    var literalNode = makeLiteralOrReturn(scope, value, expr);
                    return literalNode;
                }
            }
            break;
        case "ThisExpression":
        case "Literal":
            {
            }
            break;
        default:
            {
                if (oppenheimerTracing)
                    console.log("Unhandled expression type", expr.type);
            }
            break;
    }
    return addRefAndReturn(scope, expr);
}
function fixupVariables(scope) {
    var varsToRename = [];
    var listsToSort = new Set();
    for (var name of scope.names.values()) {
        var refCount = name.references.size;
        var host = name.host;
        if (!host)
            continue;
        if (host.type !== "VariableDeclaration")
            continue;
        var canEliminate = 
        // Don't eliminate empty variables or reassigned variables
        (name.observedValues.length === 1) &&
            // Only eliminate unused variables
            (refCount == 0);
        if (canEliminate) {
            var decls = host.declarations;
            var index = decls.indexOf(name.originalNode);
            if (index < 0)
                throw new Error("original node not found in host");
            else {
                if (decls.length > 1) {
                    decls.splice(index, 1);
                }
                else {
                    name.host.type = "EmptyStatement";
                }
                scope.log("eliminated", name.name);
            }
        }
        else if (name.isLiteral) {
            varsToRename.push(name);
            listsToSort.add(host);
        }
    }
    varsToRename.sort((lhs, rhs) => {
        var lhsText = JSON.stringify(lhs.init);
        var rhsText = JSON.stringify(rhs.init);
        if (lhsText < rhsText)
            return -1;
        else if (lhsText > rhsText)
            return 1;
        else
            return 0;
    });
    var index = 0;
    for (var name of varsToRename) {
        var id = name.originalNode.id;
        if (id.type !== "Identifier")
            continue;
        var newName;
        if (name.value === StringJoinFunction)
            newName = "stringJoin";
        else if (name.init.type === "FunctionExpression")
            newName = "f" + (scope.indices.f++);
        else if (name.init.type === "ThisExpression") {
            newName = "_window";
            if (scope.indices.t > 0)
                newName += scope.indices.t;
            scope.indices.t++;
        }
        else if (scope.depth === 0) {
            newName = "g" + (scope.indices.g++);
        }
        else {
            newName = "s" + scope.depth + "v" + (index++);
        }
        id.name = newName;
        for (var ref of name.references) {
            if ((ref.name !== name.name) && (ref.name !== newName))
                throw new Error("Expected " + name.name + " but was " + ref.name);
            ref.name = newName;
        }
        scope.log("renamed " + name.name + " to " + newName);
        name.name = newName;
    }
    for (var list of listsToSort)
        list.declarations.sort((lhs, rhs) => {
            var lhsText = lhs.id.name;
            var rhsText = rhs.id.name;
            if (lhsText < rhsText)
                return -1;
            else if (lhsText > rhsText)
                return 1;
            else
                return 0;
        });
}
//# sourceMappingURL=oppenheimer.js.map