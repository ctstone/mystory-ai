#! /usr/bin/env bash

set -e

PREFIX=$1

if [[ -z "$PREFIX" ]]; then
  >&2 echo Please specify a unique prefix as the first argument to this script
  exit 1
fi

source ./.deploy-params

# GET CREDENTIALS FOR APP
SEARCH_KEY=$(az search admin-key show \
  --resource-group $RESOURCE_GROUP \
  --service-name $SEARCH \
  --query primaryKey \
  --output tsv)
SPEECH_KEY=$(az cognitiveservices account keys list \
  --resource-group $RESOURCE_GROUP \
  --name $SPEECH \
  --query key1 \
  --output tsv)
TEXT_KEY=$(az cognitiveservices account keys list \
  --resource-group $RESOURCE_GROUP \
  --name $TEXT \
  --query key1 \
  --output tsv)

npm run configure -- \
  $SEARCH \
  $SEARCH_KEY \
  artworks \
  $LOCATION \
  $SPEECH_KEY \
  $LOCATION \
  $TEXT_KEY \
  '' \
  src/assets/conf.json
