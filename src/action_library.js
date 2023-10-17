const core = require('@actions/core');
const fs = require('fs');
const { env } = require('process');
const yaml = require('yaml');

class action_library {
  getFileYaml = path => {
    const fileData = fs.readFileSync(path, 'utf8');
    const fileYaml = yaml.parse(fileData);
    return fileYaml;
  };

  filterObjectProperties = (filterObject, filterFunction, keyTransform) =>
    Object.keys(filterObject)
      .filter(k => filterFunction(k))
      .reduce((scoped, key) => {
        const returnKey = keyTransform ? keyTransform(key) : key;
        return {
          ...scoped,
          [returnKey]: filterObject[key]
        };
      }, {});

  getCurrentEnvironmentVars = () => this.filterObjectProperties(process.env, k => k.includes('@'));

  keyName = key => key.split('@')[0];

  keyIsPartOfScope = (scope, key) => {
    const scopes = key
      .split('@')[1]
      .split(' ')
      .map(s => s.toUpperCase());
    return scopes.includes(scope.toUpperCase());
  };

  buildAllKeysUsed = newItems =>
    Object.keys(newItems).reduce((keys, key) => {
      return {
        ...keys,
        [this.keyName(key)]: false
      };
    }, {});

  errorOnNoMatchProcessUnusedKeys(inputItems, environmentItems, scopedItems) {
    const allKeys = { ...this.buildAllKeysUsed(inputItems), ...this.buildAllKeysUsed(environmentItems) };

    Object.keys(scopedItems).forEach(key => {
      allKeys[key] = true;
    });

    const unused = this.filterObjectProperties(allKeys, f => !allKeys[f]);
    const unusedKeys = Object.keys(unused);
    for (let u in unusedKeys) {
      core.warning(`<<${unusedKeys[u]}>>: env/input key unused by scope specified.`);
    }
  }

  buildEnvironmentDictionary = (input_scope, inputItems, environmentItems, errorOnNoMatch) => {
    const scopedItems = {};
    const inputScoped = this.filterObjectProperties(inputItems, k => this.keyIsPartOfScope(input_scope, k), this.keyName);
    const environmentScoped = this.filterObjectProperties(environmentItems, k => this.keyIsPartOfScope(input_scope, k), this.keyName);

    for (let i in inputScoped) {
      scopedItems[i] = inputScoped[i];
    }
    for (let e in environmentScoped) {
      if (scopedItems[e]) {
        core.warning(`<<${e}>>:  was specified by both environment variable and input file. Environment variable will be used.`);
      }
      scopedItems[e] = environmentScoped[e];
    }

    if (errorOnNoMatch) {
      this.errorOnNoMatchProcessUnusedKeys(inputItems, environmentItems, scopedItems);
    }
    return scopedItems;
  };

  setEnvironmentVar = (key, value) => {
    core.exportVariable(key, value);
    core.info(`Set env var: ${key} = ${value}`);
  };

  setOutputVar = (key, value) => {
    core.setOutput(key, value);
    core.info(`Set output var: ${key} = ${value}`);
  };
}

module.exports = { action_library };
