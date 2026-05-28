#!/bin/bash

NAME=LLMAssistant
BUILD_DIR=./build
DATE=`date +%F` # yyyy-mm-dd
TGZ_FILENAME="${DATE}-pi2llm.tar.gz"

mkdir -vp $BUILD_DIR/doc/scripts/$NAME
mkdir -vp $BUILD_DIR/src/scripts/$NAME

cp -v pi2llm-main.js pi2llm-main.xsgn AGENTS.md README.md LICENSE $BUILD_DIR/src/scripts/$NAME/
cp -rv lib $BUILD_DIR/src/scripts/$NAME/
cp -rv doc/scripts/$NAME/*.html $BUILD_DIR/doc/scripts/$NAME/

tar -C $BUILD_DIR -czvf $TGZ_FILENAME doc/ src/

sha1sum $TGZ_FILENAME
