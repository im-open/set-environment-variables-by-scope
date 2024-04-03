# Set Environment Variables by Scope

This action sets environment variables, (and optionally step outputs), to different values determined by a provided `scope`. The values for each variable and scope can be provided in specially-named environment variables or an input file.

## Index <!-- omit in toc -->

- [Set Environment Variables by Scope](#set-environment-variables-by-scope)
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
    - [Incrementing the Version](#incrementing-the-version)
    - [Source Code Changes](#source-code-changes)
    - [Recompiling Manually](#recompiling-manually)
    - [Updating the README.md](#updating-the-readmemd)
    - [Tests](#tests)
  - [Code of Conduct](#code-of-conduct)
  - [License](#license)

## Inputs

| Parameter                 | Is Required | Description                                                                                                                                                    |
|---------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `scope`                   | true        | The scope is used to identify which value to select for each key name. See the usage instructions below.                                                       |
| `input-file`              | false       | A specially formatted YAML file containing possible environment variable candidates with their associated scopes.                                              |
| `create-output-variables` | false       | Create output variables (in addition to environment variables) for use in other steps and jobs. Accepts true or false. Defaults to false.                     |
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
        uses: im-open/set-environment-variables-by-scope@v1.2.0
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
        uses: im-open/set-environment-variables-by-scope@v1.2.0
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
        uses: im-open/set-environment-variables-by-scope@v1.2.0
        with:
          scope: ${{ needs.setup.outputs.env-scope }}
        env:
          SQL_CONNECTION_STRING@dev: 'Data Source=dev.sql-server.domain.com;Initial Catalog=dev-demo-db;User Id=dev-db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@qa: 'Data Source=qa.sql-server.domain.com;Initial Catalog=qa-demo-db;User Id=qa-db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@stage: 'Data Source=stage.sql-server.domain.com;Initial Catalog=stage-demo-db;User Id=stage-db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
          SQL_CONNECTION_STRING@prod: 'Data Source=sql-server.domain.com;Initial Catalog=demo-db;User Id=db-sa-user;Password=${{ secrets.SQL_USER_SECRET }};'
```

**Note the resulting environment variables this step will set aren't yet available to expressions in the step's own `env` block.** The resulting environment variables are not available until the next step in the job. If you need scoped variable values to be based on the values of other scoped variables you can use this action in consecutive steps.

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

**Note that _`key-value`_\s in input files do _not_ support GitHub action expressions, unlike environment variables described previously.**

#### `error-on-no-match`

`error-on-no-match` is intended to alert that no env or output variable has been found based on the input scope. This is beneficial in troubleshooting if a scope *should* produce some form of output. Also a warning will show for any keys that have been included but doesn't provide a value for the input scope criteria.

## Contributing

When creating PRs, please review the following guidelines:

- [ ] The action code does not contain sensitive information.
- [ ] At least one of the commit messages contains the appropriate `+semver:` keywords listed under [Incrementing the Version] for major and minor increments.
- [ ] The action has been recompiled.  See [Recompiling Manually] for details.
- [ ] The README.md has been updated with the latest version of the action.  See [Updating the README.md] for details.
- [ ] Any tests in the [build-and-review-pr] workflow are passing

### Incrementing the Version

This repo uses [git-version-lite] in its workflows to examine commit messages to determine whether to perform a major, minor or patch increment on merge if [source code] changes have been made.  The following table provides the fragment that should be included in a commit message to active different increment strategies.

| Increment Type | Commit Message Fragment                     |
|----------------|---------------------------------------------|
| major          | +semver:breaking                            |
| major          | +semver:major                               |
| minor          | +semver:feature                             |
| minor          | +semver:minor                               |
| patch          | _default increment type, no comment needed_ |

### Source Code Changes

The files and directories that are considered source code are listed in the `files-with-code` and `dirs-with-code` arguments in both the [build-and-review-pr] and [increment-version-on-merge] workflows.  

If a PR contains source code changes, the README.md should be updated with the latest action version and the action should be recompiled.  The [build-and-review-pr] workflow will ensure these steps are performed when they are required.  The workflow will provide instructions for completing these steps if the PR Author does not initially complete them.

If a PR consists solely of non-source code changes like changes to the `README.md` or workflows under `./.github/workflows`, version updates and recompiles do not need to be performed.

### Recompiling Manually

This command utilizes [esbuild] to bundle the action and its dependencies into a single file located in the `dist` folder.  If changes are made to the action's [source code], the action must be recompiled by running the following command:

```sh
# Installs dependencies and bundles the code
npm run build
```

### Updating the README.md

If changes are made to the action's [source code], the [usage examples] section of this file should be updated with the next version of the action.  Each instance of this action should be updated.  This helps users know what the latest tag is without having to navigate to the Tags page of the repository.  See [Incrementing the Version] for details on how to determine what the next version will be or consult the first workflow run for the PR which will also calculate the next version.

### Tests

The build and review PR workflow includes tests which are linked to a status check. That status check needs to succeed before a PR is merged to the default branch.  The tests do not need special permissions, so they should succeed whether they come from a branch or a fork.

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/main/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2023, Extend Health, LLC. Code released under the [MIT license](LICENSE).

<!-- Links -->
[Incrementing the Version]: #incrementing-the-version
[Recompiling Manually]: #recompiling-manually
[Updating the README.md]: #updating-the-readmemd
[source code]: #source-code-changes
[usage examples]: #usage-examples
[build-and-review-pr]: ./.github/workflows/build-and-review-pr.yml
[increment-version-on-merge]: ./.github/workflows/increment-version-on-merge.yml
[esbuild]: https://esbuild.github.io/getting-started/#bundling-for-node
[git-version-lite]: https://github.com/im-open/git-version-lite
