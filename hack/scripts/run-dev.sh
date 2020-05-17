#!/bin/sh

if ! [ -x "$(command -v ggp)" ]; then
  apk add gnupg
fi

npm install
npm run dev
