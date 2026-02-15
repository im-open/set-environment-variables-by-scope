const core = require('@actions/core');
const path = require('path');

jest.mock('@actions/core');

describe('main', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.spyOn(core, 'exportVariable').mockImplementation(() => {});
  });

  it('should export the variables from the operative system and from the yaml file', async () => {
    process.env['pi@dev qa stage prod'] = '3.14';
    process.env['database_host@dev qa'] = 'localhost';
    process.env['database_host@stage prod'] = '10.20.30.40';

    core.getInput.mockReturnValueOnce('prod');
    core.getBooleanInput.mockReturnValueOnce(true);
    const mockFilePath = path.join(__dirname, 'config_02.yml');
    core.getInput.mockReturnValueOnce(mockFilePath);

    require('../src/main');

    let exportedVariablesDuringActionExecution = convertJestCallsToSimpleObject(core.exportVariable.mock.calls);
    console.log('variables exported by the library:', exportedVariablesDuringActionExecution);

    expect(exportedVariablesDuringActionExecution.LOG_FILE_PATH).toEqual('/var/logs/bar.log');
    expect(exportedVariablesDuringActionExecution.pi).toEqual('3.14');
    expect(exportedVariablesDuringActionExecution.database_host).toEqual('10.20.30.40');
  });

  function convertJestCallsToSimpleObject(calls) {
    let exportVariables = {};
    calls.filter(call => {
      exportVariables[call[0]] = call[1];
    });
    return exportVariables;
  }
});
