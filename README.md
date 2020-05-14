# secret-manager-action

a github action for secret management with encrypted secrets

## Why?

Because:

- it's super hard to use github secrets, especially when we have a lots of env vars to be added/updated
- all the github secrets are masked, but I want to unmask some values, this is impossible with github secrets
- We have to specify all the secrets on the github actions files, this is not dynamic and flexible
- We want to use some secrets for different branches, different jobs, this is impossible with github secrets
- We want to automate it all

That's the reason why we build this.

## How it works

- Intial setup:
  + a random passphrase to be used for encryption/decryption with OpenPGP (`gpg`)
  + all .env files must be encypted and accessible
  + an encrypted accessible location config file to specify the type of .env files to be proccessed for each config

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
  + .location_config file format `type=.env file location`, for example:

  ```
  develop=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-common.asc
  develop=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-develop.asc

  staging=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-common.asc
  staging=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-staging-0.asc
  staging=gist://e7e06874c5a7b84d220ff5faf0a2c3a5#.env-staging-1.asc
  ```

  It's recommended that you should use github gist to store those encrypted files.


- Configure this github action:

```yaml
- uses: teracyhq-incubator/secret-manager-action
  id: secret-manager
  with:
    config_file_path: ${{ secrets.CONFIG_FILE_PATH }}
    passphrase: ${{ secrets.PASSPHRASE }}
    type: ${{ env.branch }}
    unmasked_keys: 'FOO, HELLO'
    exported_keys: 'FOO'
```

### Supported location protocols

- `gist://:gist_id#:file_name` or `gist://:gist_id/:sha#:file_name`

- `file://:relative_location_to_github_action_workspace`

- `http://:domain/:path` or `https://:domain/:path`


## Inputs

### `config_file_path`

**Required** The http path of the configuration file.

### `passphrase`

**Required** The passphrase to decrypt the encrypted files.

### `type`

**Required** The type to fetch the right encrypted files.

### `unmasked_keys`

**Optional** All the values are masked by default. You need to specify the keys to be unmasked,
             keys are separated by common (,) character.

### `exported_keys`

**Optional**  Specify the keys to be exported as env vars, keys are separated by comma (,) character.


## Outputs

All the secret values with be outputs as: `outputs.KEY`.


## Example usage

```yaml
- uses: teracyhq-incubator/secret-manager-action@v1
  id: secret-manager
  with:
    config_file_path: ${{ secrets.CONFIG_FILE_PATH }}
    passphrase: ${{ secrets.PASSPHRASE }}
    type: ${{ env.branch }}
    unmasked_keys: 'FOO, HELLO'
    exported_keys: 'FOO'
  env:
    GITHUB_TOKEN: ${{ secrets.GH_PAT }} # if gist:// protocol is used
```

## How to develop

```bash
$ docker-compose up -d && docker-compose logs -f
```

```bash
$ docker-compose run --rm secret-manager npm run format
$ docker-compose run --rm secret-manager npm run lint
$ docker-compose run --rm secret-manager npm run build
```

```bash
$ docker-compose exec secret-manager sh
/opt/app # npm outdated
```

## LICENSE

MIT License
