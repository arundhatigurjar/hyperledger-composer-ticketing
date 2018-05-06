var generateToken = function (user, id) {
    if (user != null) {
        return user.id + ':' + id;
    }
    else {
        return id.toString();
    }
}
/**
 * This is the logic for all the transactions -  placeholder function
 * @param {org.deakin.ticketing.app.CreateTickets} createTickets
 * @transaction
*/
async function createTickets(createTickets) {

    var eventManager = getCurrentParticipant();
    var factory = getFactory();
    let ticketAssetRegistry = await getAssetRegistry('org.deakin.ticketing.app.Ticket');
    let eventAssetRegistry = await getAssetRegistry('org.deakin.ticketing.app.EEvent')
    let event = await eventAssetRegistry.get(createTickets.event.$identifier);

    for (var i = 0; i < createTickets.numberOfTickets; i++) {
        var id = i + event.id;
        newTicket = factory.newResource('org.deakin.ticketing.app', 'Ticket', id);
        newTicket.token = generateToken(null, id);
        newTicket.price = event.price;
        newTicket.event = createTickets.event;
        newTicket.state = 'NEW';
        newTicket.owner = createTickets.event.eventManager;

        event.tickets.push(newTicket);

        await ticketAssetRegistry.add(newTicket);

    }
    return eventAssetRegistry.update(event);
}

/**
 * This is the logic for all the transactions -  placeholder function
 * @param {org.deakin.ticketing.app.SellTicket} sellTicket
 * @transaction
 *
*/
async function sellTicket(sellTicket) {
    //Add more security to this
    let ticketAssetRegistry = await getAssetRegistry('org.deakin.ticketing.app.Ticket');
    let ticket = await ticketAssetRegistry.get(sellTicket.ticket.id);
    //const ticket = sellTicket.ticket;
    ticket.state = 'UP_FOR_SALE';
    return ticketAssetRegistry.update(ticket);
}

/**
 * This is the logic for all the transactions -  placeholder function
 * @param {org.deakin.ticketing.app.BuyTicket} buyTicket
 * @transaction
 *
*/
async function buyTicket(buyTicket) {

    let ticketAssetRegistry = await getAssetRegistry('org.deakin.ticketing.app.Ticket');
    let ticket = await ticketAssetRegistry.get(buyTicket.ticket.id);
    // const ticket = buyTicket.ticket;
    if (ticket.state == 'UP_FOR_SALE' || ticket.state == 'NEW') {
        ticket.owner = buyTicket.buyer;
        ticket.token = generateToken(buyTicket.buyer, ticket.id);
        ticket.state = 'BOUGHT';
        ticket.message = 'Ticket successfully bought.';
        return ticketAssetRegistry.update(ticket);
    }
    else {
        ticket.message = 'You cannot buy this ticket.';
        return ticketAssetRegistry.update(ticket);
    }

}
/**
 * This is the logic for all the transactions -  placeholder function
 * @param {org.deakin.ticketing.app.ValidateTicket} validateTicket
 * @transaction
 *
*/
async function validateTicket(validateTicket) {
    let ticketAssetRegistry = await getAssetRegistry('org.deakin.ticketing.app.Ticket');
    let ticket = await ticketAssetRegistry.get(validateTicket.ticket.id);

    let attendeeRegistry = await getParticipantRegistry('org.deakin.ticketing.app.Attendee');
    let ticketOwner = await attendeeRegistry.get(ticket.owner.$identifier);
    let validator = await attendeeRegistry.get(validateTicket.validator.$identifier); //getCurrentParticipant();
    
    if (ticketOwner.email == validator.email) {
        //Need to add more to this
        const newToken = generateToken(validator, ticket.id);
        if (newToken == ticket.token) {
            ticket.message = "This is a valid ticket.";
        }
        else {
            ticket.message = "This is an invalid ticket or it does not belong to you.";
        }
    }
    else {
        ticket.message = "This is an invalid ticket or it does not belong to you.";
    }
    return ticketAssetRegistry.update(ticket);;
}
