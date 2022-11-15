#!/bin/sh

GIT_BRANCH=$(echo ${GITHUB_REF} | sed -e "s/refs\/heads\///g" | sed -e "s/refs\/tags\///g" \
| sed -e "s/refs\/pull\///g" | sed -e "s/=/-/g")

# allow to override
if [ -z "${SM_MASKED_KEYS}" ]; then
  SM_MASKED_KEYS="DOCKER_PASSWORD"
fi

SM_EXPORTED_KEYS=""

# false by default
echo "sm_enabled=false" >> $GITHUB_OUTPUT
# enable secret-manager only when CONFIG_FILE_PATH and PASSPHRASE are configured
if [ "${CONFIG_FILE_PATH}" != "" ] && [ "${PASSPHRASE}" != "" ]; then
  echo "::debug::SM_CONFIG_FILE_PATH and SM_PASSPHRASE are configured"
  echo "sm_enabled=true" >> $GITHUB_OUTPUT
fi

echo "sm_type=$GIT_BRANCH" >> $GITHUB_OUTPUT
echo "sm_masked_keys=$SM_MASKED_KEYS" >> $GITHUB_OUTPUT
echo "sm_exported_keys=$SM_EXPORTED_KEYS" >> $GITHUB_OUTPUT
