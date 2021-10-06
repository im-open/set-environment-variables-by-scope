const core = require('@actions/core');
const { action_library } = require('./action_library');

let library = new action_library();

let input_scope = core.getInput('scope');
let createOutputVariables = core.getBooleanInput('create-output-variables');

let inputFilePath = core.getInput('input-file');
let inputYaml = inputFilePath.length > 0 ? library.getFileYaml(inputFilePath) : {};

let errorOnNoMatch = core.getBooleanInput('error-on-no-match');
let customErrorMessage = core.getInput('custom-error-message');
if (!errorOnNoMatch && customErrorMessage) {
  core.info('custom-error-message is specified, but error-on-no-match is not.');
}

let environmentYaml = library.getCurrentEnvironmentVars();
let environmentDictionary = library.buildEnvironmentDictionary(input_scope, inputYaml, environmentYaml, errorOnNoMatch);

console.log('Scoped Variables:', environmentDictionary);
for (envVar in environmentDictionary) {
  library.setEnvironmentVar(envVar, environmentDictionary[envVar]);
  if (createOutputVariables) {
    library.setOutputVar(envVar, environmentDictionary[envVar]);
  }
}

if (errorOnNoMatch && Object.keys(environmentDictionary).length == 0) {
  core.setFailed(customErrorMessage.length > 0 ? customErrorMessage : 'No variable scope matches.');
}
