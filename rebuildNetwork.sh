clear
rm dist/networkadmin.card

composer card delete -c admin@ticketing-network
composer card list

../../fabric-tools/teardownFabric.sh
../../fabric-tools/stopFabric.sh

docker kill $(docker ps -q)
docker rm $(docker ps -aq)
docker rmi $(docker images dev-* -q)

../../fabric-tools/startFabric.sh
../../fabric-tools/createPeerAdminCard.sh

./create_bna.sh ticketing-network.bna
composer network install -a dist/ticketing-network.bna -c PeerAdmin@hlfv1
composer network start -n ticketing-network -V 0.0.1 -c PeerAdmin@hlfv1 -A admin -S adminpw -f dist/networkadmin.card
composer card import -f dist/networkadmin.card
composer card list
