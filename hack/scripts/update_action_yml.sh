#!/bin/sh

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     machine=Linux;;
    Darwin*)    machine=Mac;;
    CYGWIN*)    machine=Cygwin;;
    MINGW*)     machine=MinGw;;
    *)          machine="UNKNOWN:${unameOut}"
esac

if [ "$machine" = 'Mac' ]; then
  sed -i '' "/image:/c\\
    \\  image: 'docker://$CI_REGISTRY_IMAGE/secret-manager-action:$IMG_TAG'\\
    " action.yml
else
  # suppose Linux only
  sed -i "/image:/c\\  image: 'docker://$CI_REGISTRY_IMAGE/secret-manager-action:$IMG_TAG'" action.yml
fi
