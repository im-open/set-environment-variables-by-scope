# Set Environment Variables by Scope

This action takes specially formatted environment variables and/or an input file to emit scoped environment variables.

## Index <!-- omit in toc -->

- [Inputs](#inputs)
  - [Environment Variables](#environment-variables)
- [Outputs](#outputs)
- [Usage Examples](#usage-examples)
  - [Usage Instructions](#usage-instructions)
    - [`key-name`](#key-name)
    - [`scope-array`](#scope-array)
    - [`key-value`](#key-value)
    - [Input File Format](#input-file-format)
    - [`error-on-no-match`](#error-on-no-match)
    - [Repository Secrets](#repository-secrets)
- [Recompiling](#recompiling)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

## Inputs

| Parameter                 | Is Required | Description                                                                                                                                          |
| ------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`                   | true        | The scope is used to select key names and values to be set as environment vars, key names that do not contain the scope will not be exported         |
| `input-file`              | false       | A specially formatted YAML file containing possible environment variable candidates with their associated scopes                                     |
| `create-output-variables` | false       | Create output variables (in addiction to environment variables) for use in other steps and jobs, accepts true or false, defaults to false            |
| `error-on-no-match`       | false       | An error will be thrown if no env or output variables are created, a warning will appear for all keys that don't provide a value for the input scope |
| `custom-error-meesage`    | false       | The error message that will be displayed if no environment or output variables are created, `error_on_no_match` must be set to true                  |

### Environment Variables

This action relies heavily on environment variables as part of its inputs. _Any_ environment variable with an [`@` in it's key name](#key-name) is used as a possible candidate for scoped output.  More information is included in the [usage instructions](#usage-instructions) section.

## Outputs

Varies by usage, but is based on [`key-name`](#key-name) specified in environment variables and the `input-file` specified.

## Usage Examples

```yml
...

on:
  workflow_dispatch:
    inputs:
      environment:
        description: The environment to deploy to.
        required: true

jobs:
  setup:
    runs-on: [ubuntu-20.04]
    output:
      env-scope: ${{ steps.env-scope.output.ENVIRONMENT }}

    steps:
      - name: Set environment scope
        id: env-scope
        uses: im-open/set-environment-variables-by-scope@v1.0.2
        with:
          scope: ${{ workflow.inputs.environment }}
          create-output-variables: true
          error_on_no_match: true
          custom_error_message: 'The environment must be Dev, QA, Stage or Prod'
        env:
          ENVIRONMENT@dev d development: dev
          ENVIRONMENT@qa a: qa
          ENVIRONMENT@stage s stg: stage
          ENVIRONMENT@prod p production: prod

      - run: echo "The current environment is ${{ env.ENVIRONMENT }}."

  build:
    runs-on: [ubuntu-20.04]
    needs: [setup]
      steps:
      - name: Checkout
        uses: actions/checkout@v2

      # The set-environment-variables-by-scope action uses both the input-file and
      # the supplied env variables to create the resulting environment and output vars
      - name: Build Workflow Environment Variables
        uses: im-open/set-environment-variables-by-scope@v1.0.2
        with:
          scope: ${{ needs.setup.outputs.env-scope }}
          input-file: ./env-vars.yml
        env:
          keyName1@dev qa stage prod: 'key value 1'
          keyName2@dev qa: 'key value 2 lower'
          keyName2@stage prod: 'key value 2 upper'

      - name: Display Env Var
        uses: actions/github-script@v5
        with:
          script: |
            console.log("Env", ${{ needs.setup.outputs.env-scope }})
            console.log("keyName1", ${{ env.keyName1 }})
            console.log("keyName2", ${{ env.keyName2 }})
            console.log("inFileName1", ${{ env.inFileName1 }})
            console.log("inFileName2", ${{ env.inFileName2 }})
...
```

```yaml
# Example env-vars.yml file

inFileName1@dev qa stage: 'lower env file value'
inFileName1@prod demo: 'release env file value'
inFileName2@dev qa stage prod demo: 'file value for all environments'
```

### Usage Instructions

The format of the `env` variable and the `input-file` contents are the same and follows this format:

`[key-name]@[scope-array]: [key-value]`

#### `key-name`

The resulting environment variable name. It does accept a wide variety of name convention formats including spaces, dashes, periods, and underscores. While it's been tested and found to be fairly flexible, it is possible to make environment variable names that aren't usable by one or more of the target action runner operating systems.

**_Key names intended for use as output variables that are referenced in the workflow can only contain letters, numbers, dashes and underscores._** Any other punctuation or space characters cannot be processed and will cause errors when attempting to reference them later in a workflow.

#### `scope-array`

A space delimited array of scope strings that the environment variable could be valid for.  The filter by which keys/values will be selected is the `scope` action input. The scope value comparison is _not_ case sensitive.

#### `key-value`

The value that the environment variable will be set to if it's found to meet the scope criteria.

This set of environment variable or input file entries:

```yml
env:
  db_server@dev qa: lower-env.db-server.domain.com
  db_server@stage prod: db-server.domain.com
```

Produces an environment variable, `${{ env.db_server }}`, with a value of `db-server.domain.com`, if the action `scope` is set to `stage`.

#### Input File Format
The contents of an `input-file` is YAML based and has all the elements at the root level.  It's contents would be formatted like this:

```yaml
db_server@dev qa: lower-env.db-server.domain.com
db_server@stage: stage.db-server.domain.com
db_server@prod: db-server.domain.com
public_endpoint@dev: dev.app-end.com
public_endpoint@qa: qa.app-end.com
public_endpoint@stage: stage.app-end.com
public_endpoint@prod: prod.app-end.com
something.used.in.build@dev: dev-value
something.used.in.build@qa: qa-value
something.used.in.build@stage: stage-value
something.used.in.build@prod: prod-value
```

#### `error-on-no-match`

`error-on-no-match` is intended to alert that no env or output variable has been found based on the input scope. This is beneficial in troubleshooting if a scope *should* product some form of output. Also a warning will show for any keys that have been included but doesn't provide a value for the input scope criteria.

#### Repository Secrets

Repository secrets can be used with the environment variable creation action, but only through environment vars.  This is because the input file does not receive any secret replacement parsing during the action execution.

An example of this would be the inclusion of a secret and user id in a SQL connection string:

```yaml

jobs:
  deploy-db:
    runs-on: [ubuntu-20.04]
    environment: ${{ needs.setup.outputs.env-scope }}

    steps:
      - name: Build DB Connection
        uses: im-open/set-environment-variables-by-scope@v1.0.0
        with:
          scope: ${{ needs.setup.outputs.env-scope }}
        env:
          SQL_CONNECTION_STRING@dev: 'Data Source=dev.sql-server.domain.com;Initial Catalog=dev-demo-db;User Id=dev-db-sa-user;Password=${{ env.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@qa: 'Data Source=qa.sql-server.domain.com;Initial Catalog=qa-demo-db;User Id=qa-db-sa-user;Password=${{ env.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@stage: 'Data Source=stage.sql-server.domain.com;Initial Catalog=stage-demo-db;User Id=stage-db-sa-user;Password=${{ env.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@prod: 'Data Source=sql-server.domain.com;Initial Catalog=demo-db;User Id=db-sa-user;Password=${{ env.SQL_USER_SECRET }};'
```

If the scope of `QA` were specified, an environment variable `SQL_CONNECTION_STRING` with the specified value containing a replacement for the `SQL_USER_SECRET` from GitHub Repository's `QA` secret environment.

## Recompiling

If changes are made to the action's code in this repository, or its dependencies, you will need to re-compile the action.

```sh
# Installs dependencies and bundles the code
npm run build

# Bundle the code (if dependencies are already installed)
npm run bundle
```

These commands utilize [esbuild](https://esbuild.github.io/getting-started/#bundling-for-node) to bundle the action and
its dependencies into a single file located in the `dist` folder.

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/master/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2021, Extend Health, LLC. Code released under the [MIT license](LICENSE).
