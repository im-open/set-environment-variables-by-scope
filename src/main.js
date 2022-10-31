const core = require('@actions/core');
const { action_library } = require('./action_library');

const library = new action_library();

const input_scope = core.getInput('scope', { required: true });
const createOutputVariables = core.getBooleanInput('create-output-variables');

const inputFilePath = core.getInput('input-file');
const inputYaml = inputFilePath.length > 0 ? library.getFileYaml(inputFilePath) : {};

const errorOnNoMatch = core.getBooleanInput('error-on-no-match');
const customErrorMessage = core.getInput('custom-error-message');
if (!errorOnNoMatch && customErrorMessage) {
  core.info('custom-error-message is specified, but error-on-no-match is not.');
}

const environmentYaml = library.getCurrentEnvironmentVars();
const environmentDictionary = library.buildEnvironmentDictionary(input_scope, inputYaml, environmentYaml, errorOnNoMatch);

console.log('Scoped Variables:', environmentDictionary); // This doesn't print right with JSON.stringify()
for (let envVar in environmentDictionary) {
  library.setEnvironmentVar(envVar, environmentDictionary[envVar]);
  if (createOutputVariables) {
    library.setOutputVar(envVar, environmentDictionary[envVar]);
  }
}

if (errorOnNoMatch && Object.keys(environmentDictionary).length == 0) {
  core.setFailed(customErrorMessage.length > 0 ? customErrorMessage : 'No variable scope matches.');
}
