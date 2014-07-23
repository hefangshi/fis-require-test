var esprima = require('esprima');
var parse = require('./vendor/parse.js');

function transform(moduleName, path, contents){
    var astRoot, contentLines, modLine,
        foundAnon,
        scanCount = 0,
        scanReset = false,
        defineInfos = [];

    try {
        astRoot = esprima.parse(contents, {
            loc: true
        });
    } catch (e) {
        logger.trace('toTransport skipping ' + path + ': ' +
                     e.toString());
        return contents;
    }

    //Find the define calls and their position in the files.
    parse.traverse(astRoot, function (node) {
        var args, firstArg, firstArgLoc, factoryNode,
            needsId, depAction, foundId, init,
            sourceUrlData, range;

        // If a bundle script with a define declaration, do not
        // parse any further at this level. Likely a built layer
        // by some other tool.
        if (node.type === 'VariableDeclarator' &&
            node.id && node.id.name === 'define' &&
            node.id.type === 'Identifier') {
            init = node.init;
            if (init && init.callee &&
                init.callee.type === 'CallExpression' &&
                init.callee.callee &&
                init.callee.callee.type === 'Identifier' &&
                init.callee.callee.name === 'require' &&
                init.callee.arguments && init.callee.arguments.length === 1 &&
                init.callee.arguments[0].type === 'Literal' &&
                init.callee.arguments[0].value &&
                init.callee.arguments[0].value.indexOf('amdefine') !== -1) {
                // the var define = require('amdefine')(module) case,
                // keep going in that case.
            } else {
                return false;
            }
        }

        if (parse.isDefineNodeWithArgs(node)) {
            //The arguments are where its at.
            args = node.arguments;
            if (!args || !args.length) {
                return;
            }

            firstArg = args[0];
            firstArgLoc = firstArg.loc;

            if (args.length === 1) {
                if (firstArg.type === 'Identifier') {
                    //The define(factory) case, but
                    //only allow it if one Identifier arg,
                    //to limit impact of false positives.
                    needsId = true;
                    depAction = 'empty';
                } else if (firstArg.type === 'FunctionExpression') {
                    //define(function(){})
                    factoryNode = firstArg;
                    needsId = true;
                    depAction = 'scan';
                } else if (firstArg.type === 'ObjectExpression') {
                    //define({});
                    needsId = true;
                    depAction = 'skip';
                } else if (firstArg.type === 'Literal' &&
                           typeof firstArg.value === 'number') {
                    //define('12345');
                    needsId = true;
                    depAction = 'skip';
                } else if (firstArg.type === 'UnaryExpression' &&
                           firstArg.operator === '-' &&
                           firstArg.argument &&
                           firstArg.argument.type === 'Literal' &&
                           typeof firstArg.argument.value === 'number') {
                    //define('-12345');
                    needsId = true;
                    depAction = 'skip';
                } else if (firstArg.type === 'MemberExpression' &&
                           firstArg.object &&
                           firstArg.property &&
                           firstArg.property.type === 'Identifier') {
                    //define(this.key);
                    needsId = true;
                    depAction = 'empty';
                }
            } else if (firstArg.type === 'ArrayExpression') {
                //define([], ...);
                needsId = true;
                depAction = 'skip';
            } else if (firstArg.type === 'Literal' &&
                       typeof firstArg.value === 'string') {
                //define('string', ....)
                //Already has an ID.
                needsId = false;
                if (args.length === 2 &&
                    args[1].type === 'FunctionExpression') {
                    //Needs dependency scanning.
                    factoryNode = args[1];
                    depAction = 'scan';
                } else {
                    depAction = 'skip';
                }
            } else {
                //Unknown define entity, keep looking, even
                //in the subtree for this node.
                return;
            }

            range = {
                foundId: foundId,
                needsId: needsId,
                depAction: depAction,
                node: node,
                defineLoc: node.loc,
                firstArgLoc: firstArgLoc,
                factoryNode: factoryNode,
                sourceUrlData: sourceUrlData
            };

            //Only transform ones that do not have IDs. If it has an
            //ID but no dependency array, assume it is something like
            //a phonegap implementation, that has its own internal
            //define that cannot handle dependency array constructs,
            //and if it is a named module, then it means it has been
            //set for transport form.
            if (range.needsId) {
                if (foundAnon) {
                    logger.trace(path + ' has more than one anonymous ' +
                        'define. May be a built file from another ' +
                        'build system like, Ender. Skipping normalization.');
                    defineInfos = [];
                    return false;
                } else {
                    foundAnon = range;
                    defineInfos.push(range);
                }
            } else if (depAction === 'scan') {
                scanCount += 1;
                if (scanCount > 1) {
                    //Just go back to an array that just has the
                    //anon one, since this is an already optimized
                    //file like the phonegap one.
                    if (!scanReset) {
                        defineInfos =  foundAnon ? [foundAnon] : [];
                        scanReset = true;
                    }
                } else {
                    defineInfos.push(range);
                }
            }
        }
    });


    if (!defineInfos.length) {
        return contents;
    }

    //Reverse the matches, need to start from the bottom of
    //the file to modify it, so that the ranges are still true
    //further up.
    defineInfos.reverse();

    contentLines = contents.split('\n');

    modLine = function (loc, contentInsertion) {
        var startIndex = loc.start.column,
        //start.line is 1-based, not 0 based.
        lineIndex = loc.start.line - 1,
        line = contentLines[lineIndex];
        contentLines[lineIndex] = line.substring(0, startIndex) +
                                   contentInsertion +
                                   line.substring(startIndex,
                                                      line.length);
    };

    defineInfos.forEach(function (info) {
        var deps,
            contentInsertion = '',
            depString = '';

        //Do the modifications "backwards", in other words, start with the
        //one that is farthest down and work up, so that the ranges in the
        //defineInfos still apply. So that means deps, id, then namespace.
        if (info.needsId && moduleName) {
            contentInsertion += "'" + moduleName + "',";
        }

        if (info.depAction === 'scan') {
            deps = parse.getAnonDepsFromNode(info.factoryNode);

            if (deps.length) {
                depString = '[' + deps.map(function (dep) {
                    return "'" + dep + "'";
                }) + ']';
            } else {
                depString = '[]';
            }
            depString +=  ',';

            if (info.factoryNode) {
                //Already have a named module, need to insert the
                //dependencies after the name.
                modLine(info.factoryNode.loc, depString);
            } else {
                contentInsertion += depString;
            }
        }

        if (contentInsertion) {
            modLine(info.firstArgLoc, contentInsertion);
        }
    });

    contents = contentLines.join('\n');

    return contents;
}

module.exports = transform;