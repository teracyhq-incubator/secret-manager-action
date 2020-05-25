#!/bin/sh

GIT_BRANCH=$(echo ${GITHUB_REF} | sed -e "s/refs\/heads\///g" | sed -e "s/refs\/tags\///g" \
| sed -e "s/refs\/pull\///g" | sed -e "s/=/-/g")

# allow to override
if [ -z "${SM_MASKED_KEYS}" ]; then
  SM_MASKED_KEYS="DOCKER_PASSWORD"
fi

SM_EXPORTED_KEYS=""

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
