# Set Environment Variables by Scope

This action sets environment variables, (and optionally step outputs), to different values determined by a provided `scope`. The values for each variable and scope can be provided in specially-named environment variables or an input file.

## Index <!-- omit in toc -->

- [Inputs](#inputs)
- [Outputs](#outputs)
- [Usage Examples](#usage-examples)
  - [Usage Instructions](#usage-instructions)
    - [_`key-name`_](#key-name)
    - [_`scope-array`_](#scope-array)
    - [_`key-value`_](#key-value)
    - [Input Environment Variables](#input-environment-variables)
    - [Input File Format](#input-file-format)
    - [`error-on-no-match`](#error-on-no-match)
- [Contributing](#contributing)
  - [Recompiling](#recompiling)
  - [Incrementing the Version](#incrementing-the-version)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

## Inputs

| Parameter                 | Is Required | Description                                                                                                                                                    |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`                   | true        | The scope is used to identify which value to select for each key name. See the usage instructions below.                                                       |
| `input-file`              | false       | A specially formatted YAML file containing possible environment variable candidates with their associated scopes.                                              |
| `create-output-variables` | false       | Create output variables (in addiction to environment variables) for use in other steps and jobs. Accepts true or false. Defaults to false.                     |
| `error-on-no-match`       | false       | An error will be thrown if no environment variables or outputs are created, a warning will appear for all keys that don't provide a value for the input scope. |
| `custom-error-message`    | false       | The error message that will be displayed if no environment or output variables are created. `error_on_no_match` must be set to true                            |

## Outputs

Varies by usage, but is based on the [`key-name`](#key-name)s supplied in environment variables and the `input-file`.

## Usage Examples

```yml
...

on:
  workflow_dispatch:
    inputs:
      destination:
        description: The destination to deploy to.
        required: true
        options:
          - dev
          - qa
          - stage
          - stage-secondary
          - prod
          - prod-secondary

jobs:
  setup:
    runs-on: [ubuntu-20.04]
    output:
      env-scope: ${{ steps.env-scope.output.ENVIRONMENT }}

    steps:
      - name: Set environment
        id: env-scope
        uses: im-open/set-environment-variables-by-scope@v1.1.4
        with:
          scope: ${{ workflow.inputs.environment }}
          create-output-variables: true
          error_on_no_match: true
          custom_error_message: 'The environment must be Dev, QA, Stage or Prod'
        env:
          ENVIRONMENT@dev: dev
          ENVIRONMENT@qa: qa
          ENVIRONMENT@stage stage-secondary: stage
          ENVIRONMENT@prod prod-secondary: prod

      - run: echo "The current environment is ${{ env.ENVIRONMENT }}."

  build:
    runs-on: [ubuntu-20.04]
    needs: [setup]
      steps:
      - name: Checkout
        uses: actions/checkout@v3

      # The set-environment-variables-by-scope action uses both the input-file and
      # the supplied env variables to create the resulting environment and output vars
      - name: Build Workflow Environment Variables
        # You may also reference just the major or major.minor version
        uses: im-open/set-environment-variables-by-scope@v1.1.4
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

The format of each input environment variable and each entry in the `input-file` are the same and follows this format:

`[key-name]@[scope-array]: [key-value]`

#### _`key-name`_

The resulting environment variable and output name. It can contain practically any 'printable' characters including spaces, dashes, colons, periods, and underscores. While it's been tested and found to be fairly flexible, it is possible to make environment variable names that aren't usable by one or more of the target action runner operating systems.

**_Key names intended for use as output variables can only contain letters, numbers, dashes and underscores._** Any other punctuation or space characters cannot be processed and will cause errors when attempting to reference them later in a workflow.

#### _`scope-array`_

A space delimited array of scope strings. When the value of the `scope` input matches one of these strings, the _`key-name`_ environment variable and output will be set to _`key-value`_. The scope value comparison is _not_ case sensitive.

#### _`key-value`_

The value that the environment variable and output will be set to if the scope is found in the _`scope-array`_.

This set of environment variable or input file entries:

```yml
env:
  db_server@dev qa: lower-env.db-server.domain.com
  db_server@stage prod: db-server.domain.com
```

Produces an environment variable, `${{ env.db_server }}`, with a value of `db-server.domain.com`, if the action's `scope` is set to `stage` or `prod`.

#### Input Environment Variables

When using environment variables for input, this action looks at all current environment variables. They could have been exported by a previous step, or set for the job or workflow. _Any_ environment variable with an `@` in it's name is used as a possible candidate for scoped output.

GitHub actions expressions can be used in the _`key-value`_ when supplying input environment variables in the step's `env` block as in the following example:

```yaml
      - name: Build DB Connection
        uses: im-open/set-environment-variables-by-scope@v1.1.4
        with:
          scope: ${{ needs.setup.outputs.env-scope }}
        env:
          SQL_CONNECTION_STRING@dev: 'Data Source=dev.sql-server.domain.com;Initial Catalog=dev-demo-db;User Id=dev-db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@qa: 'Data Source=qa.sql-server.domain.com;Initial Catalog=qa-demo-db;User Id=qa-db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@stage: 'Data Source=stage.sql-server.domain.com;Initial Catalog=stage-demo-db;User Id=stage-db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@prod: 'Data Source=sql-server.domain.com;Initial Catalog=demo-db;User Id=db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
```

** Note the resulting environment variables this step will set aren't yet available to expressions in the step's own `env` block.** The resulting environment variables are not available until the next step in the job. If you need scoped variable values to be based on the values of other scoped variables you can use this action in consecutive steps.

#### Input File Format
The `input-file` must be YAML format and has all the elements at the root level.  It's contents would be formatted like this:

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

**Note that _`key-value`_\s in input files do _not_ support GitHub action expressions, unlike envrionment variables described previously.**

#### `error-on-no-match`

`error-on-no-match` is intended to alert that no env or output variable has been found based on the input scope. This is beneficial in troubleshooting if a scope *should* produce some form of output. Also a warning will show for any keys that have been included but doesn't provide a value for the input scope criteria.

## Contributing

When creating new PRs please ensure:

1. For major or minor changes, at least one of the commit messages contains the appropriate `+semver:` keywords listed under [Incrementing the Version](#incrementing-the-version).
1. The action code does not contain sensitive information.

When a pull request is created and there are changes to code-specific files and folders, the build workflow will run and it will recompile the action and push a commit to the branch if the PR author has not done so. The usage examples in the README.md will also be updated with the next version if they have not been updated manually. The following files and folders contain action code and will trigger the automatic updates:

- action.yml
- package.json
- package-lock.json
- src/\*\*
- dist/\*\*

There may be some instances where the bot does not have permission to push changes back to the branch though so these steps should be done manually for those branches. See [Recompiling Manually](#recompiling-manually) and [Incrementing the Version](#incrementing-the-version) for more details.

### Recompiling Manually

If changes are made to the action's code in this repository, or its dependencies, the action can be re-compiled by running the following command:

```sh
# Installs dependencies and bundles the code
npm run build

# Bundle the code (if dependencies are already installed)
npm run bundle
```

These commands utilize [esbuild](https://esbuild.github.io/getting-started/#bundling-for-node) to bundle the action and
its dependencies into a single file located in the `dist` folder.

### Incrementing the Version

Both the build and PR merge workflows will use the strategies below to determine what the next version will be.  If the build workflow was not able to automatically update the README.md action examples with the next version, the README.md should be updated manually as part of the PR using that calculated version.

This action uses [git-version-lite] to examine commit messages to determine whether to perform a major, minor or patch increment on merge.  The following table provides the fragment that should be included in a commit message to active different increment strategies.
| Increment Type | Commit Message Fragment                     |
| -------------- | ------------------------------------------- |
| major          | +semver:breaking                            |
| major          | +semver:major                               |
| minor          | +semver:feature                             |
| minor          | +semver:minor                               |
| patch          | *default increment type, no comment needed* |

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/master/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2023, Extend Health, LLC. Code released under the [MIT license](LICENSE).

[git-version-lite]: https://github.com/im-open/git-version-lite
