import * as ping from "./ping";
import * as ticketSetup from "./ticket-setup";
import * as ticket from "./ticket";

export const commands = {
    ping,
    "ticket-setup": ticketSetup,
    ticket
};