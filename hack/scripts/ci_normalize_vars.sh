#!/bin/sh

contains() {
  string="$1"
  substring="$2"
  if test "${string#*$substring}" != "$string"
  then
    return 0    # $substring is in $string
  else
    return 1    # $substring is not in $string
  fi
}

normalize_image_tag() {
  echo "$1" | awk '{print tolower($0)}' | sed -e 's/[\/]/-/g' | sed -e 's/[\#]//g';
}


GIT_BRANCH=$(echo ${GITHUB_REF} | sed -e "s/refs\/heads\///g" | sed -e "s/refs\/tags\///g" \
  | sed -e "s/refs\/pull\///g")


# allow to set IMG_TAG, useful for skip building docker image and deploying the built tags
if [ -z "${IMG_TAG}" ]; then

  if contains "$GITHUB_REF" "refs/tags/"; then
    IMG_TAG=$(normalize_image_tag $GIT_BRANCH)
  else
    CI_COMMIT_SHORT_SHA=$(git rev-parse --short HEAD)
    IMG_TAG=$(normalize_image_tag $GIT_BRANCH-$CI_COMMIT_SHORT_SHA)
  fi
fi

# push to the develop branch by default if env var not defined
if [ -z "${DOCKER_PUSH_ENABLED}" ]; then

  if [ "$BRANCH_NAME" == "develop" ]; then
    DOCKER_PUSH_ENABLED=true
  else
    DOCKER_PUSH_ENABLED=false
  fi
fi


# if CI_REGISTRY_IMAGE is not defined, use the github package
if [ -z "${CI_REGISTRY_IMAGE}" ]; then
  # not defined => set default
  export GITHUB_REPOSITORY=$(echo "${GITHUB_REPOSITORY}" | awk '{print tolower($0)}')
  export CI_REGISTRY_IMAGE=docker.pkg.github.com/$GITHUB_REPOSITORY
  echo "CI_REGISTRY_IMAGE env var not defined, set default to: $CI_REGISTRY_IMAGE"

  if [ -z "$DOCKER_USERNAME" ] && [ -z "$DOCKER_PASSWORD" ] ; then
    export DOCKER_USERNAME=$(echo "${GITHUB_REPOSITORY}" | cut -d'/' -f1)
    export DOCKER_PASSWORD=${GITHUB_TOKEN}
    # disable DOCKER_PUSH_ENABLED by default if username, password not defined in this case
    # set this to true on secrets to enable
    if [ "$GITHUB_REGISTRY_ENABLED" != "true" ] ; then
      export DOCKER_PUSH_ENABLED=false
    fi
  fi

fi


if contains "$CI_REGISTRY_IMAGE" "gcr.io" ; then
  export PUSH_TO_GCR=true;
  echo "push_to_gcr=true" >> $GITHUB_OUTPUT
fi


if contains "$CI_REGISTRY_IMAGE" "." ; then
  echo "docker_login_server=$CI_REGISTRY_IMAGE" >> $GITHUB_OUTPUT
else
  echo "docker_login_server=https://index.docker.io/v1/" >> $GITHUB_OUTPUT
fi


echo "img_tag=$IMG_TAG" >> $GITHUB_OUTPUT
echo "ci_registry_image=$CI_REGISTRY_IMAGE" >> $GITHUB_OUTPUT
echo "docker_username=$DOCKER_USERNAME" >> $GITHUB_OUTPUT
echo "docker_password=$DOCKER_PASSWORD" >> $GITHUB_OUTPUT
echo "docker_push_enabled=$DOCKER_PUSH_ENABLED" >> $GITHUB_OUTPUT


if [ "${BUILD_ENABLED}" == "false" ]; then
  echo "build_enabled=false" >> $GITHUB_OUTPUT
else
  export BUILD_ENABLED=true;
  echo "build_enabled=true" >> $GITHUB_OUTPUT
fi

# login docker registry with username and password
echo "login_docker_registry_username_password_enabled=false" >> $GITHUB_OUTPUT
if [ "$BUILD_ENABLED" == "true" ] && [ "$DOCKER_PUSH_ENABLED" == "true" ] && \
   [ "$DOCKER_USERNAME" != "" ] && [ "$DOCKER_PASSWORD" != "" ] && [ "$PUSH_TO_GCR" != "true" ] ; then
   echo "login_docker_registry_username_password_enabled=true" >> $GITHUB_OUTPUT
fi

# login gcloud
echo "login_gcloud=false" >> $GITHUB_OUTPUT
if [ "$BUILD_ENABLED" == "true" ] && [ "$DOCKER_PUSH_ENABLED" == "true" ] && \
   [ "$PUSH_TO_GCR" == "true" ] && [ "$GCP_KEY_FILE_BASE64" != "" ]; then
   echo "login_gcloud_enabled=true" >> $GITHUB_OUTPUT
fi

# publish
echo "publish_enabled=false" >> $GITHUB_OUTPUT
if [ "$BUILD_ENABLED" == "true" ] && [ "$DOCKER_PUSH_ENABLED" == "true" ]; then
  echo "publish_enabled=true" >> $GITHUB_OUTPUT
fi
