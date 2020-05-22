# secret-manager-action

a github action for secret management with encryption

## Why?

Because:

- it's super hard to use github secrets, especially when we have lots of env vars to be added/updated
- all the github secrets are masked, however, sometimes we want to unmask some values, it is
  impossible with the current github secrets
- We have to specify all the secrets to be used on the github actions files, this is not dynamic and flexible
- We want to pick secrets for different branches, different jobs, different types, etc. This is impossible
  with github secrets
- We want to automate it all

That's the reason why we build this.

## How it works

- Intial setup:
  + a random passphrase to be used for encryption/decryption with OpenPGP (`gpg`)
  + all .env files must be encypted and accessible
  + an encrypted accessible location config file to specify the type of .env files to be proccessed
    for each type

- How to encrypt files:

```bash
$ # generate a random passphrase
$ gpg --gen-random --armor 1 12 > .passphrase
$ # encrypt files
$ cat .passphrase | gpg --symmetric --cipher-algo AES256 --batch --passphrase-fd 0 --armor <file>
```

- How to decrypt files:

```bash
# --batch to prevent interactive command --yes to assume "yes" for questions
$ cat .passphrase | gpg --quiet --batch --yes --decrypt --passphrase-fd=0 \
--output <file> <file>.asc
# or send the result to the standard output
$ cat .passphrase | gpg --quiet --batch --yes --decrypt --passphrase-fd=0 <file>.asc
```

- File formats:
  + .env file format `KEY=value`, for example:
  ```
  FOO=bar
  ```
  + .env-type-config file format `:type=:.env file location`, for example:

  ```
  develop=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-common.asc
  develop=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-develop.asc

  staging=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-common.asc
  staging=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-staging-0.asc
  staging=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-staging-1.asc
  ```

  You can see the `hack/fixture/.env-type-config` file and this gist https://gist.github.com/hoatle/e7e06874c5a7b84d220ff5faf0a2c3a5 for more details.

  It's recommended that you should use github gist to store those encrypted files.


### Supported location protocols

- `gist://:gist_id#:file_name` or `gist://:gist_id/:sha#:file_name`

- `file://:relative_location_to_github_action_workspace` (Not yet implemented)

- `http://:domain/:path` or `https://:domain/:path` (Not yet implemented)


## Inputs

### `config_file_path`

**Required** The http path of the configuration file.

### `passphrase`

**Required** The passphrase to decrypt the encrypted files.

### `type`

**Required** The type to fetch the right encrypted files.

### `masked_keys`

**Optional** All the values are unmasked by default. You need to specify the keys to be masked,
             keys are separated by a common (,) character.

### `exported_keys`

**Optional**  Specify the keys to be exported as env vars, keys are separated by a comma (,) character.
              Set to "\*" to export all key-values as env vars.

## Outputs

All the secret values with be outputs as: `outputs.KEY`.


## Example usage

```yaml
    - name: Configure for the secret-manager
      id: secret-manager-config
      run: |
        set -e
        GIT_BRANCH=$(echo ${GITHUB_REF} | sed -e "s/refs\/heads\///g" | sed -e "s/refs\/tags\///g" \
        | sed -e "s/refs\/pull\///g" | sed -e "s/=/-/g")

        # allow to override
        if [ -z "${SM_MASKED_KEYS}" ]; then
          SM_MASKED_KEYS="FOO"
        fi

        SM_EXPORTED_KEYS="ENV"

        # false by default
        echo "::set-output name=sm_enabled::false"
        # enable secret-manager only when CONFIG_FILE_PATH and PASSPHRASE are configured
        if [ "${CONFIG_FILE_PATH}" != "" ] && [ "${PASSPHRASE}" != "" ]; then
          echo "::debug::SM_CONFIG_FILE_PATH and SM_PASSPHRASE are configured"
          echo "::set-output name=sm_enabled::true"
        fi

        echo "::set-output name=sm_type::$GIT_BRANCH"
        echo "::set-output name=sm_masked_keys::$SM_MASKED_KEYS"
        echo "::set-output name=sm_exported_keys::$SM_EXPORTED_KEYS"

      env:
        CONFIG_FILE_PATH: ${{ secrets.SM_CONFIG_FILE_PATH }}
        PASSPHRASE: ${{ secrets.SM_PASSPHRASE }}
        SM_MASKED_KEYS: ${{ secrets.SM_MASKED_KEYS }}

    - uses: teracyhq-incubator/secret-manager-action@develop
      if: steps.secret-manager-config.outputs.sm_enabled == 'true'
      id: secret-manager
      with:
        config_file_path: ${{ secrets.SM_CONFIG_FILE_PATH }}
        passphrase: ${{ secrets.SM_PASSPHRASE }}
        type: ${{ steps.secret-manager-config.outputs.sm_type }}
        masked_keys: ${{ steps.secret-manager-config.outputs.sm_masked_keys }}
        exported_keys: ${{ steps.secret-manager-config.outputs.sm_exported_keys }}
      env:
        GITHUB_TOKEN: ${{ secrets.SM_GH_PAT }} # if gist:// protocol is used
```

For example, to use this https://gist.github.com/hoatle/e7e06874c5a7b84d220ff5faf0a2c3a5#file-env-type-config,
you need to set github secrets with:

```
CONFIG_FILE_PATH=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-type-config
PASSPHRASE=ixsTMwBVW+QZGsdf
```


## How to develop

```bash
$ docker-compose up -d && docker-compose logs -f
```

```bash
$ docker-compose exec secret-manager sh
/opt/app # npm outdated
```

```bash
$ docker-compose run --rm secret-manager npm run format
$ docker-compose run --rm secret-manager npm run lint
$ docker-compose run --rm secret-manager npm run build
```

## LICENSE

MIT License
