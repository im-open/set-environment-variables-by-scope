const core = require('@actions/core');
const fs = require('fs');
const { env } = require('process');
const yaml = require('yaml');

class action_library {
  constructor() {
    this.currentEnvironmentPath = process.env['GITHUB_ENV'];
  }

  getFileYaml = path => {
    let fileData = fs.readFileSync(path, 'utf8');
    let fileYaml = yaml.parse(fileData);
    return fileYaml;
  };

  filterObjectByKeyPart = (filterObject, filterFunction, keyTransform) =>
    Object.keys(filterObject)
      .filter(k => filterFunction(k))
      .reduce((scoped, key) => {
        let returnKey = keyTransform ? keyTransform(key) : key;
        return {
          ...scoped,
          [returnKey]: filterObject[key]
        };
      }, {});

  getCurrentEnvironmentVars = () => this.filterObjectByKeyPart(process.env, k => k.includes('@'));

  keyName = key => key.split('@')[0];

  keyIsPartOfScope = (scope, key) => {
    let scopes = key.split('@')[1].split(' ');
    return scopes.includes(scope);
  };

  buildEnvironmentDictionary = (scope, input, environment) => {
    let environmentDictionary = {};
    let inputScoped = this.filterObjectByKeyPart(input, k => this.keyIsPartOfScope(scope, k), this.keyName);
    let environmentScoped = this.filterObjectByKeyPart(environment, k => this.keyIsPartOfScope(scope, k), this.keyName);

    for (let i in inputScoped) {
      environmentDictionary[i] = inputScoped[i];
    }

    for (let e in environmentScoped) {
      if (environmentDictionary[e]) {
        core.warning(`<<${e}>>: key and scope specified specifed as env and input file var. env var will be used.`);
      }
      environmentDictionary[e] = environmentScoped[e];
    }

    return environmentDictionary;
  };

  setEnvironmentVar = (key, value) => {
    core.exportVariable(key, value);
    core.info(`Set ${key} = ${value}`);
  };
}

module.exports = { action_library };
