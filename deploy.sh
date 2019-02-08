#! /usr/bin/env bash

set -e

PREFIX=$1
IMAGE=storyteller-ui

if [[ -z "$PREFIX" ]]; then
  >&2 echo Please specify a unique prefix as the first argument to this script
  exit 1
fi

source ./.deploy-params

# CREATE RESOURCE GROUP
echo Creating resource group $RESOURCE_GROUP in $LOCATION
az group create \
  --location $LOCATION \
  --name $RESOURCE_GROUP

# CREATE CONTAINER REGISTRY
echo Creating container registry $ACR
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR \
  --sku Standard \
  --admin-enabled

# CREATE SPEECH SERVICE
echo Creating speech service $SPEECH
az cognitiveservices account create \
  --resource-group $RESOURCE_GROUP \
  --name $SPEECH \
  --location $LOCATION \
  --kind SpeechServices \
  --sku S0 \
  --yes

# CREATE APP SERVICE PLAN
echo Creating Linux app service plan $APP_SERVICE_PLAN
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_PLAN \
  --is-linux

# CREATE WEB APP
echo Creating web app $WEB_APP on $APP_SERVICE_PLAN
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEB_APP \
  --runtime "node|8.11"

# CREATE SEARCH SERVICE
echo Creating search service $SEARCH
az search service create \
    --resource-group $RESOURCE_GROUP \
    --name $SEARCH \
    --sku Basic

# CREATE TEXT ANALYTICS SERVICE
echo Creating text analytics service $TEXT
az cognitiveservices account create \
  --resource-group $RESOURCE_GROUP \
  --name $TEXT \
  --location $LOCATION \
  --kind TextAnalytics \
  --sku S \
  --yes

# BUILD APP
echo Building Node.js application
npm install
./configure.sh

# BUILD IMAGE
echo Building Docker image $IMAGE and pushing to $ACR
az acr build \
  --registry $ACR \
  --image $IMAGE .

# DEPLOY IMAGE TO WEB APP
echo Retrieving container registry credential for $ACR
ACR_PASSWORD=$(az acr credential show \
  --name $ACR \
  --query passwords[0].value \
  --output tsv)
echo Deploying image $IMAGE to web app $WEB_APP
az webapp config container set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP \
  --docker-custom-image-name $ACR.azurecr.io/$IMAGE \
  --docker-registry-server-url https://$ACR.azurecr.io \
  --docker-registry-server-user $ACR \
  --docker-registry-server-password $ACR_PASSWORD

# INDEX ARTWORK DOCUMENTS
echo Creating search index
SEARCH_KEY=$(az search admin-key show \
  --resource-group $RESOURCE_GROUP \
  --service-name $SEARCH \
  --query primaryKey \
  --output tsv)
curl -X POST "https://$SEARCH.search.windows.net/indexes?api-version=2017-11-11" \
  -H "api-key: $SEARCH_KEY" \
  -H 'content-type: application/json' \
  -d @data/index-artworks.json
echo Indexing artworks into search service $SEARCH (this could take a while)
pushd data
npm install
npm start -- $SEARCH $SEARCH_KEY
popd