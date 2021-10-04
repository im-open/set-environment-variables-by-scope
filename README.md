# Set Environment Variables by Scope

This action takes specially formatted environment variables and/or an input file to emit scoped environment variables.

## Index <!-- omit in toc -->

- [Inputs](#inputs)
- [Outputs](#outputs)
- [Usage Examples](#usage-examples)
  - [Usage Instructions](#usage-instructions)
    - [`key-name`](#key-name)
    - [`scope-array`](#scope-array)
    - [`key-value`](#key-value)
- [Recompiling](#recompiling)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

## Inputs

| Parameter                 | Is Required | Description                                                                                                                               |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`                   | true        | The selection filter of the vars to be set                                                                                                |
| `input-file`              | false       | A file containing possible environment variable candidates with their associated scopes                                                   |
| `create-output-variables` | false       | Create output variables (in addiction to environment variables) for use in other steps and jobs, accepts true or false, defaults to false |

## Outputs

Varies by usage, but is based on [`key-name`](#key-name) specified in environment variables and the `input-file` specified.

## Usage Examples

```yml
...
input:
  environment:
    description: The environment to deploy to.
    required: true

jobs:
  setup:
    runs-on: ubuntu-20.04
    output:
      env-scope: ${{ steps.env-scope.output.ENVIRONMENT }}

    steps:
      - name: Set environment scope
        id: env-scope
        uses: im-open/set-environment-variables-by-scope@v1.0.0
        with:
          scope: ${{ workflow.inputs.environment }}
          create-output-variables: true
        env:
          ENVIRONMENT@dev d development: dev
          ENVIRONMENT@qa a: qa
          ENVIRONMENT@stage s stg: stage
          ENVIRONMENT@prod p production: prod

      - run: echo "The current environment is ${{ env.ENVIRONMENT }}.

    build:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Build Workflow Environment Variables
        uses: im-open/set-environment-variables-by-scope@v1.0.0
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

### Usage Instructions

The format of the `env` variable and the `input-file` contents are the same and follows this format:

`[key-name]@[scope-array]: [key-value]`

#### `key-name`

The resulting environment variable name. It does accept a wide variety of name convention formats including spaces, dashes, periods, and underscores. While it's been tested and found to be fairly flexible, it is possible to make environment variable names that aren't usable by one or more of the target action runner operating systems.

**_Key names intended for use as output variables for in workflow references can only contain letters, numbers, dashes and underscores._** Any other punctuation or space characters cannot processed and will cause errors when attempting to reference them later in a workflow.

#### `scope-array`

A space delimited array of scope strings that the environment variable could be valid for.  The filter for which keys/values will be select from is the `scope` action input.

#### `key-value`

The value that the environment variable will be set to if it's found to meet the scope criteria.

This set environment variable or input file entries:

```yml
env:
  db_server@dev qa: lower-env.db-server.domain.com
  db_server@stage prod: db-server.domain.com
```

Produces an environment variable, `${{ env.db_server }}`, with a value of `db-server.domain.com`, if the action `scope` is set to `stage`.

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
