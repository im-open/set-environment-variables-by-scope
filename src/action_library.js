const core = require('@actions/core');
const fs = require('fs');
const { env } = require('process');
const yaml = require('yaml');

class action_library {
  getFileYaml = path => {
    let fileData = fs.readFileSync(path, 'utf8');
    let fileYaml = yaml.parse(fileData);
    return fileYaml;
  };

  filterObjectProperties = (filterObject, filterFunction, keyTransform) =>
    Object.keys(filterObject)
      .filter(k => filterFunction(k))
      .reduce((scoped, key) => {
        let returnKey = keyTransform ? keyTransform(key) : key;
        return {
          ...scoped,
          [returnKey]: filterObject[key]
        };
      }, {});

  getCurrentEnvironmentVars = () => this.filterObjectProperties(process.env, k => k.includes('@'));

  keyName = key => key.split('@')[0];

  keyIsPartOfScope = (scope, key) => {
    let scopes = key
      .split('@')[1]
      .split(' ')
      .map(s => s.toUpperCase());
    return scopes.includes(scope.toUpperCase());
  };

  buildAllKeysUsed = (oldItems, newItems) => {
    let keys = Object.keys(newItems);
    let items = {};
    for (let key in newItems) {
      items[this.keyName(key)] = false;
    }
    return {
      ...oldItems,
      ...items
    };
  };

  errorOnNoMatchProcessUnusedKeys(inputItems, environmentItems, scopedItems) {
    let allKeys = this.buildAllKeysUsed({}, inputItems);
    allKeys = this.buildAllKeysUsed(allKeys, environmentItems);

    Object.keys(scopedItems).forEach(key => {
      allKeys[key] = true;
    });

    let unused = this.filterObjectProperties(allKeys, f => !allKeys[f]);
    let unusedKeys = Object.keys(unused);
    for (let u in unusedKeys) {
      core.warning(`<<${unusedKeys[u]}>>: env/input key unused by scope specified.`);
    }
  }

  buildEnvironmentDictionary = (input_scope, inputItems, environmentItems, errorOnNoMatch) => {
    let scopedItems = {};
    let inputScoped = this.filterObjectProperties(inputItems, k => this.keyIsPartOfScope(input_scope, k), this.keyName);
    let environmentScoped = this.filterObjectProperties(environmentItems, k => this.keyIsPartOfScope(input_scope, k), this.keyName);

    for (let i in inputScoped) {
      scopedItems[i] = inputScoped[i];
    }
    for (let e in environmentScoped) {
      if (scopedItems[e]) {
        core.warning(`<<${e}>>: key and scope specified as env and input file var, env var will be used.`);
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
