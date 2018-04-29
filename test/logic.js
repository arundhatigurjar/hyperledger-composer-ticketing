/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
/**
 * Write the unit tests for your transction processor functions here
 */

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const { BusinessNetworkDefinition, CertificateUtil, IdCard } = require('composer-common');
const path = require('path');

const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));

const namespace = 'org.deakin.ticketing.app';

const eventAssetType = 'EEvent';
const eventNS = namespace + '.' + eventAssetType;

const ticketAssetType = 'Ticket';
const ticketNS = namespace + '.' + ticketAssetType;

const participantEM = 'EventManager';
const eventManagerNS = namespace + '.' + participantEM;

const participantAttendee = 'Attendee';
const attendeeNS = namespace + '.' + participantAttendee;

describe('#' + namespace, () => {
    // In-memory card store for testing so cards are not persisted to the file system
    const cardStore = require('composer-common').NetworkCardStoreManager.getCardStore({ type: 'composer-wallet-inmemory' });

    // Embedded connection used for local testing
    const connectionProfile = {
        name: 'embedded',
        'x-type': 'embedded'
    };

    // Name of the business network card containing the administrative identity for the business network
    const adminCardName = 'networkadmin.card';

    // Admin connection to the blockchain, used to deploy the business network
    let adminConnection;

    // This is the business network connection the tests will use.
    let businessNetworkConnection;

    // This is the factory for creating instances of types.
    let factory;

    // These are the identities for Alice and Bob.
    const creatorCardName = 'manager';

    // These are a list of receieved events.
    let events;

    let businessNetworkName;

    before(async () => {
        // Generate certificates for use with the embedded connection
        const credentials = CertificateUtil.generate({ commonName: 'admin' });

        // Identity used with the admin connection to deploy business networks
        const deployerMetadata = {
            version: 1,
            userName: 'PeerAdmin',
            roles: ['PeerAdmin', 'ChannelAdmin']
        };
        const deployerCard = new IdCard(deployerMetadata, connectionProfile);
        deployerCard.setCredentials(credentials);
        const deployerCardName = 'PeerAdmin';

        adminConnection = new AdminConnection({ cardStore: cardStore });

        await adminConnection.importCard(deployerCardName, deployerCard);
        await adminConnection.connect(deployerCardName);
    });

    /**
     *
     * @param {String} cardName The card name to use for this identity
     * @param {Object} identity The identity details
     */
    async function importCardForIdentity(cardName, identity) {
        const metadata = {
            userName: identity.userID,
            version: 1,
            enrollmentSecret: identity.userSecret,
            businessNetwork: businessNetworkName
        };
        const card = new IdCard(metadata, connectionProfile);
        await adminConnection.importCard(cardName, card);
    }

    // This is called before each test is executed.
    beforeEach(async () => {
        // Generate a business network definition from the project directory.
        let businessNetworkDefinition = await BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..'));
        businessNetworkName = businessNetworkDefinition.getName();
        await adminConnection.install(businessNetworkDefinition);
        const startOptions = {
            networkAdmins: [
                {
                    userName: 'admin',
                    enrollmentSecret: 'adminpw'
                }
            ]
        };
        const adminCards = await adminConnection.start(businessNetworkName, businessNetworkDefinition.getVersion(), startOptions);
        await adminConnection.importCard(adminCardName, adminCards.get('admin'));

        // Create and establish a business network connection
        businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });
        events = [];
        businessNetworkConnection.on('event', event => {
            events.push(event);
        });
        await businessNetworkConnection.connect(adminCardName);

        // Get the factory for the business network.
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();

        // Create the participants.
        const eventManagerRegistry = await businessNetworkConnection.getParticipantRegistry(eventManagerNS);
        const eventManager = factory.newResource(namespace, participantEM, 'aru@email.com');
        eventManager.name = 'Event Manager';
        eventManager.id = 'aru@email.com';

        eventManagerRegistry.addAll([eventManager]);

        const attendeeRegistry = await businessNetworkConnection.getParticipantRegistry(attendeeNS);
        const attendee1 = factory.newResource(namespace, participantAttendee, 'user@email.com');
        attendee1.name = 'User';
        attendee1.id = 'user@email.com';

        const attendee2 = factory.newResource(namespace, participantAttendee, 'user2@email.com');
        attendee2.name = 'User2';
        attendee2.id = 'user2@email.com';

        attendeeRegistry.addAll([attendee1, attendee2]);

        const eventRegistry = await businessNetworkConnection.getAssetRegistry(eventNS);
        // Create the assets.
        const assetEvent = factory.newResource(namespace, eventAssetType, 'EVENT_1');
        //assetEvent.owner = factory.newRelationship(namespace, participantEM, 'alice@email.com');
        assetEvent.numberOfTickets = 5;
        assetEvent.venue = 'Melbourne';
        assetEvent.time = new Date();
        assetEvent.eventManager = factory.newRelationship(namespace, 'EventManager', 'aru@email.com');;
        assetEvent.tickets = [];

        eventRegistry.addAll([assetEvent]);

        const ticketRegistry = await businessNetworkConnection.getAssetRegistry(ticketNS);
        const ticket1 = factory.newResource('org.deakin.ticketing.app', 'Ticket', '10');
        ticket1.token = 'user@email.com:10';
        ticket1.price = 10;
        ticket1.event = factory.newRelationship(namespace, 'EEvent', 'EVENT_1');
        ticket1.state = 'NEW';
        ticket1.owner = factory.newRelationship(namespace, 'Attendee', 'user@email.com');

        const ticket2 = factory.newResource('org.deakin.ticketing.app', 'Ticket', '11');
        ticket2.token = 'user@email.com:11';
        ticket2.price = 10;
        ticket2.event = factory.newRelationship(namespace, 'EEvent', 'EVENT_1');
        ticket2.state = 'NOT_AVAILABLE';
        ticket2.owner = factory.newRelationship(namespace, 'Attendee', 'user@email.com');

        const ticket3 = factory.newResource('org.deakin.ticketing.app', 'Ticket', '12');
        ticket3.token = 'user@email.com:12';
        ticket3.price = 10;
        ticket3.event = factory.newRelationship(namespace, 'EEvent', 'EVENT_1');
        ticket3.state = 'UP_FOR_SALE';
        ticket3.owner = factory.newRelationship(namespace, 'Attendee', 'user@email.com');

        ticketRegistry.addAll([ticket1, ticket2, ticket3]);

        // Issue the identities.
        let identity = await businessNetworkConnection.issueIdentity(eventManagerNS + '#aru@email.com', 'aru');
        await importCardForIdentity(creatorCardName, identity);

    });

    /**
     * Reconnect using a different identity.
     * @param {String} cardName The name of the card for the identity to use
     */
    async function useIdentity(cardName) {
        await businessNetworkConnection.disconnect();
        businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });
        events = [];
        businessNetworkConnection.on('event', (event) => {
            events.push(event);
        });
        await businessNetworkConnection.connect(cardName);
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();
    }

    it('Create tickets for an event', async () => {
        // Use the identity for manager.
        await useIdentity(creatorCardName);

        //Get the event reference
        const eventRegistry = await businessNetworkConnection.getAssetRegistry(eventNS);
        // const event = await eventRegistry.get('EVENT_1');

        // submit the transaction
        const createTickets = factory.newTransaction(namespace, 'CreateTickets');
        createTickets.event = factory.newRelationship(namespace, 'EEvent', 'EVENT_1');
        createTickets.price = 10;
        await businessNetworkConnection.submitTransaction(createTickets);

        //Check if the correct number of tickets are generated
        const ticketRegistry = await businessNetworkConnection.getAssetRegistry(ticketNS);
        const tickets = await ticketRegistry.getAll();

        // Validate the assets.
        const event = await eventRegistry.get(createTickets.event.$identifier);
        tickets.should.have.lengthOf(event.numberOfTickets + 3);

        for (var i = 0; i < event.numberOfTickets; i++) {
            var ticket = tickets[i];
            //ticket.owner.getFullyQualifiedIdentifier().should.equal(eventManagerNS + '#aru@email.com');
            ticket.event.getFullyQualifiedIdentifier().should.equal(eventNS + '#EVENT_1');
            ticket.price.should.equal(createTickets.price);
            ticket.state.should.equal('NEW');
        }
    });

    it('Sell a ticket', async () => {

        const ticketRegistry = await businessNetworkConnection.getAssetRegistry(ticketNS);
        // Validate the ticket state.
        let ticket = await ticketRegistry.get('10');

        // submit the transaction
        const sellTicket = factory.newTransaction(namespace, 'SellTicket');
        sellTicket.ticket = ticket;
        await businessNetworkConnection.submitTransaction(sellTicket);
        ticket = await ticketRegistry.get('10');
        ticket.state.should.equal('UP_FOR_SALE');
    });

    it('User buys a ticket successfully', async () => {

        const ticketRegistry = await businessNetworkConnection.getAssetRegistry(ticketNS);
        // Validate the ticket state.
        let ticket = await ticketRegistry.get('12');

        // submit the transaction
        const buyTicket = factory.newTransaction(namespace, 'BuyTicket');
        buyTicket.ticket = ticket;
        buyTicket.buyer = factory.newRelationship(namespace, 'Attendee', 'user2@email.com');
        await businessNetworkConnection.submitTransaction(buyTicket);
        ticket = await ticketRegistry.get('12');
        ticket.state.should.equal('BOUGHT');
    });

    it('User is not able to buy a ticket', async () => {

        const ticketRegistry = await businessNetworkConnection.getAssetRegistry(ticketNS);
        // Validate the ticket state.
        let ticket = await ticketRegistry.get('11');

        // submit the transaction
        const buyTicket = factory.newTransaction(namespace, 'BuyTicket');
        buyTicket.ticket = ticket;
        buyTicket.buyer = factory.newRelationship(namespace, 'Attendee', 'user2@email.com');
        await businessNetworkConnection.submitTransaction(buyTicket);
        ticket = await ticketRegistry.get('11');
        ticket.state.should.equal('NOT_AVAILABLE');
    });

    it('Validate ticket - Failure', async () => {
        const ticketRegistry = await businessNetworkConnection.getAssetRegistry(ticketNS);
        let ticket = await ticketRegistry.get('12');

        const participantRegistry = await businessNetworkConnection.getParticipantRegistry(attendeeNS);
        const validateTicket = factory.newTransaction(namespace, 'ValidateTicket');
        validateTicket.ticket = ticket;
        validateTicket.validator = factory.newRelationship(namespace, 'Attendee', 'user2@email.com');
        await businessNetworkConnection.submitTransaction(validateTicket);

        ticket = await ticketRegistry.get('12');
        ticket.message.should.equal('This is an invalid ticket or it does not belong to you.');
    });

    it('Validate ticket - Success', async () => {
        const ticketRegistry = await businessNetworkConnection.getAssetRegistry(ticketNS);
        let ticket = await ticketRegistry.get('12');

        const participantRegistry = await businessNetworkConnection.getParticipantRegistry(attendeeNS);
        const validateTicket = factory.newTransaction(namespace, 'ValidateTicket');
        validateTicket.ticket = ticket;
        validateTicket.validator = factory.newRelationship(namespace, 'Attendee', 'user@email.com');
        await businessNetworkConnection.submitTransaction(validateTicket);

        ticket = await ticketRegistry.get('12');
        ticket.message.should.equal('This is a valid ticket.');
    });

    it('Get history', async () => {
        let historian = await businessNetworkConnection.getHistorian();
        let historianRecords = await historian.getAll();
        //console.log(historianRecords);

    })

});
