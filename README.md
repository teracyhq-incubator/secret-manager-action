# secret-manager-action

a github action for secret management with encryption

## Why?

Because:

- it's super hard to use github secrets, especially when we have lots of env vars to be added/updated
- all the github secrets are masked, however, we sometimes want to unmask some values, it is
  impossible with the current github secrets
- We have to specify all the secrets to be used on the github actions files, this is not dynamic and flexible
- We want to use some secrets for different branches, different jobs, different types; this is impossible
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

- `file://:relative_location_to_github_action_workspace`

- `http://:domain/:path` or `https://:domain/:path`


## Inputs

### `config_file_path`

**Optional when skip_allowed=true** The http path of the configuration file.

**Required when skip_allowed=false** The http path of the configuration file.

### `passphrase`

**Optional when skip_allowed=true** The passphrase to decrypt the encrypted files.

**Required when skip_allowed=false** The passphrase to decrypt the encrypted files.

### `type`

**Optional when skip_allowed=true** The type to fetch the right encrypted files.

**Required when skip_allowed=false** The type to fetch the right encrypted files.

### `unmasked_keys`

**Optional** All the values are masked by default. You need to specify the keys to be unmasked,
             keys are separated by common (,) character.

### `exported_keys`

**Optional**  Specify the keys to be exported as env vars, keys are separated by comma (,) character.


### `skip_allowed`

**Optional** if true:  when all the required inputs are not configured, skip the run step.
             if false: when required input are not configured, the run step get failed.
**Default** true


## Outputs

All the secret values with be outputs as: `outputs.KEY`.


## Example usage

```yaml
      - name: Configure for secret-manager
        run: |
          export GIT_BRANCH=$(echo ${GITHUB_REF} | sed -e "s/refs\/heads\///g" | sed -e "s/refs\/tags\///g" \
          | sed -e "s/refs\/pull\///g" | sed -e "s/=/-/g")
          echo "::set-env name=GIT_BRANCH::$GIT_BRANCH"
          export SM_UNMASKED_KEYS='FOO, HELLO'
          echo "::set-env name=SM_UNMASKED_KEYS::$SM_UNMASKED_KEYS"
          export SM_EXPORTED_KEYS='FOO'
          echo "::set-env name=SM_EXPORTED_KEYS::$SM_EXPORTED_KEYS"

      - uses: ./
        id: secret-manager
        with:
          config_file_path: ${{ secrets.CONFIG_FILE_PATH }}
          passphrase: ${{ secrets.PASSPHRASE }}
          type: ${{ env.GIT_BRANCH }}
          unmasked_keys: ${{ env.SM_UNMASKED_KEYS }}
          exported_keys: ${{ env.SM_EXPORTED_KEYS }}
        env:
          GITHUB_TOKEN: ${{ secrets.GH_PAT }} # if gist:// protocol is used
```

For example, to use this https://gist.github.com/hoatle/e7e06874c5a7b84d220ff5faf0a2c3a5#file-env-type-config,
you need to set github secrets with:

```
CONFIG_FILE_PATH=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-type-config
PASSPHRASE=ixsTMwBVW+QZGsdf
```


## How to develop

```bash
# execute this command again if the hack/env/.dev-env file is updated
$ docker-compose up -d && docker-compose logs -f
```

```bash
# ssh into the running container
$ docker-compose exec secret-manager sh
/opt/app # npm outdated
```

```bash
# some commands can be used to run
$ docker-compose run --rm secret-manager npm run format
$ docker-compose run --rm secret-manager npm run lint
$ docker-compose run --rm secret-manager npm run build
$ docker-compose run --rm secret-manager npm install boolean --save # for example to install a npm package
```

- github action debugging: https://github.com/actions/toolkit/blob/master/docs/action-debugging.md

## LICENSE

MIT License
