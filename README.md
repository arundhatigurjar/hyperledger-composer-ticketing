# Ticketing network 

This is a very simple POC of a ticketing system using hyperledger-composer.

## Getting Started
Follow these instructions to setup the roject on you local. All the instructions are for Mac OS X.

### Pre-requisites
Please ensure that you have the following installed before proceeding:

#### Basic
1. Node.js - v9.11.1, npm 5.6.0
2. Node Version Manager(nvm) - Follow the steps given here: https://github.com/creationix/nvm
3. Docker: Download and install Docker from here: https://docs.docker.com/docker-for-mac/install/
4. Visual Studio Code : Download and install from here: https://code.visualstudio.com/download. Once you have installed it, install the hyperledger composer extension.
5.  Git - you should have this installed

#### Hyperledger
Download and install hyperledger client and related tools to develop and test the app.

```
npm install -g composer-cli@0.19.0
npm install -g generator-hyperledger-composer
npm install -g composer-rest-server
npm install -g composer-playground
npm install -g yo

``` 
All the commands are based on the composer-cli v0.19.0. If you are using a different version please change the commands accordingly.

Download the Hyperleder Fabric:
```
mkdir fabric-tools
cd fabric-tools
curl -O https://raw.githubusercontent.com/hyperledger/composer-tools/master/packages/fabric-dev-servers/fabric-dev-servers.zip
unzip fabric-dev-servers.zip
./downloadFabric.sh

```


### Local Setup
Checkout the project from this repo then run the following commands:

```
docker kill $(docker ps -q)
docker rm $(docker ps -aq)
docker rmi $(docker images dev-* -q)

cd fabric-tools
./startFabric.sh
./createPeerAdminCard.sh

#Navigate to the 'dist' folder project directory
./create_bna.sh <network-name>.bna
cd..
composer network install -a dist/ticketing-network.bna -c PeerAdmin@hlfv1
composer network start -n ticketing-network -V 0.0.1 -c PeerAdmin@hlfv1 -A admin -S adminpw -f dist/networkadmin.card
composer card import -f dist/networkadmin.card
composer card list

The following Business Network Cards are available:

Connection Profile: hlfv1
┌─────────────────────────┬───────────┬───────────────────┐
│ Card Name               │ UserId    │ Business Network  │
├─────────────────────────┼───────────┼───────────────────┤
│ admin@ticketing-network │ admin     │ ticketing-network │
├─────────────────────────┼───────────┼───────────────────┤
│ PeerAdmin@hlfv1         │ PeerAdmin │                   │
└─────────────────────────┴───────────┴───────────────────┘


Issue composer card list --card <Card Name> to get details a specific card

Command succeeded

Arundhatis-MacBook-Air:ticketing-network arundhati$ composer-rest-server
? Enter the name of the business network card to use: admin@ticketing-network
? Specify if you want namespaces in the generated REST API: always use namespaces
? Specify if you want to enable authentication for the REST API using Passport: No
? Specify if you want to enable event publication over WebSockets: No
? Specify if you want to enable TLS security for the REST API: No

```
Navigate to http://localhost:3000/explorer to test the REST services.

