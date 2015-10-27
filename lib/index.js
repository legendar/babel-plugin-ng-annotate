'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

exports['default'] = function (_ref) {
  var Plugin = _ref.Plugin;
  var t = _ref.types;

  function rebuildConstructor(node, fromDecorator) {
    var insertIndex = 0;

    node.value.body.body.forEach(function (item, i) {
      if (t.isCallExpression(item.expression) && t.isSuper(item.expression.callee)) {
        insertIndex = i + 1;
      }
    });

    fromDecorator.forEach(function (p) {
      node.value.params.push(t.identifier(p));
      node.value.body.body.splice(insertIndex, 0, t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.thisExpression(), t.identifier(p)), t.identifier(p))));
      insertIndex++;
    });
    return node;
  }

  return new Plugin('ng-annotate', {
    visitor: {
      ClassDeclaration: function ClassDeclaration(node, parent, scope, file) {
        if (!node.decorators) {
          return;
        }

        var fromDecorator = [];
        var doInjection = false;
        var i = undefined,
            j = undefined;
        var hasConstructor = false;

        for (i = 0; i < node.decorators.length; i++) {
          var ex = node.decorators[i].expression;
          if (t.isCallExpression(ex) && t.isIdentifier(ex.callee, { name: 'Inject' })) {
            doInjection = true;
            for (j = 0; j < ex.arguments.length; j++) {
              fromDecorator.push(ex.arguments[j].value);
            }
          }
        }

        if (doInjection) {
          file.set('hasInject', true);
          node.body.body.forEach(function (child) {
            if (!hasConstructor && t.isMethodDefinition(child, { kind: 'constructor' })) {
              rebuildConstructor(child, fromDecorator);
            }
          });

          if (!hasConstructor) {
            var constructorNode = t.methodDefinition(t.identifier('constructor'), t.functionExpression(null, [], t.blockStatement([])), 'constructor', true);
            node.body.body.unshift(rebuildConstructor(constructorNode, fromDecorator));
          }
        }
      },

      Program: {
        enter: function enter(node, parent, scope, file) {
          file.set('hasInject', false);
        },

        exit: function exit(node, parent, scope, file) {
          if (file.get('hasInject') && !scope.hasBinding('Inject')) {
            node.body.unshift(t.variableDeclaration('let', [t.variableDeclarator(t.identifier('Inject'), t.callExpression(t.identifier('require'), [t.literal('babel-plugin-ng-annotate/lib/inject')]))]));
          }
        }
      }
    }
  });
};

module.exports = exports['default'];
