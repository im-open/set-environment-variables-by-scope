const core = require('@actions/core');
const { action_library } = require('./action_library');

let library = new action_library();

let scope = core.getInput('scope');

let inputFilePath = core.getInput('input-file');
let inputYaml = library.getFileYaml(inputFilePath);

let environmentYaml = library.getCurrentEnvironmentVars();
let environmentDictionary = library.buildEnvironmentDictionary(scope, inputYaml, environmentYaml);

console.log('Scoped Variables:', environmentDictionary);
for (envVar in environmentDictionary) {
  library.setEnvironmentVar(`${envVar}`, environmentDictionary[envVar]);
}
