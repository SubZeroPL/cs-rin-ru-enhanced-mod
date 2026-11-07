// Load production functions and their real dependencies without running page startup.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const espree = require('espree');
const eslintScope = require('eslint-scope');
const source = fs.readFileSync(path.join(__dirname, '../cs-rin-ru-enhanced-mod.user.js'), 'utf8');
const ast = espree.parse(source, { ecmaVersion: 2021, sourceType: 'script', range: true });
const scopes = eslintScope.analyze(ast, { ecmaVersion: 2021, sourceType: 'script' });
const definitions = new Map();
for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') definitions.set(node.id.name, { node, code: source.slice(node.start, node.end) });
    if (node.type === 'VariableDeclaration') {
        for (const declaration of node.declarations) {
            if (declaration.id.type === 'Identifier') definitions.set(declaration.id.name,
                { node: declaration, code: `${node.kind} ${source.slice(declaration.start, declaration.end)};` });
        }
    }
}

function loadFunctions(context, names) {
    const chosen = new Set();
    const statements = [];
    function visit(name, force = false) {
        if (chosen.has(name) || (!force && Object.hasOwn(context, name))) return;
        const definition = definitions.get(name);
        if (!definition) {
            if (force) throw new Error(`Production declaration not found: ${name}`);
            return;
        }
        chosen.add(name);
        const { node } = definition;
        const references = scopes.scopes.flatMap(scope => scope.references).filter(ref =>
            ref.identifier.start >= node.start && ref.identifier.end <= node.end &&
            (!ref.resolved || ref.resolved.scope.type === 'global'));
        for (const ref of references) if (ref.identifier.name !== name) visit(ref.identifier.name);
        statements.push(definition.code);
    }
    names.forEach(name => visit(name, true));
    if (!vm.isContext(context)) vm.createContext(context);
    vm.runInContext(statements.join('\n'), context, { filename: 'production-userscript-functions.js' });
    return context;
}

module.exports = { loadFunctions };
