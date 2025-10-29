import fs from 'fs';
import path from 'path';

interface TicketSetup {
    panelChannel: string;
    staffRole: string;
    categoryParent: string;
    logChannel: string;
}

interface ActiveTicket {
    channelId: string;
    userId: string;
    category: string;
    active: boolean;
}

interface GuildData {
    setup?: TicketSetup;
    activeTickets: ActiveTicket[];
}

interface TicketSystemData {
    [guildId: string]: GuildData;
}

const DATA_FILE = path.join(process.cwd(), 'ticket_system.json');

export class TicketSystemManager {
    private data: TicketSystemData = {};

    constructor() {
        this.loadData();
    }

    private loadData(): void {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
                this.data = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('Error loading ticket system data:', error);
            this.data = {};
        }
    }

    private saveData(): void {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Error saving ticket system data:', error);
        }
    }

    private ensureGuildData(guildId: string): void {
        if (!this.data[guildId]) {
            this.data[guildId] = {
                activeTickets: []
            };
        }
    }

    public setSetup(guildId: string, setup: TicketSetup): void {
        this.ensureGuildData(guildId);
        this.data[guildId].setup = setup;
        this.saveData();
    }

    public getSetup(guildId: string): TicketSetup | undefined {
        return this.data[guildId]?.setup;
    }

    public addTicket(guildId: string, ticket: ActiveTicket): void {
        this.ensureGuildData(guildId);
        this.data[guildId].activeTickets.push(ticket);
        this.saveData();
    }

    public hasActiveTicket(guildId: string, userId: string): boolean {
        const guildData = this.data[guildId];
        if (!guildData) return false;
        
        return guildData.activeTickets.some(
            ticket => ticket.userId === userId && ticket.active
        );
    }

    public getTicketByChannel(guildId: string, channelId: string): ActiveTicket | undefined {
        const guildData = this.data[guildId];
        if (!guildData) return undefined;
        
        return guildData.activeTickets.find(
            ticket => ticket.channelId === channelId
        );
    }

    public closeTicket(guildId: string, channelId: string): void {
        const guildData = this.data[guildId];
        if (!guildData) return;
        
        const ticketIndex = guildData.activeTickets.findIndex(
            ticket => ticket.channelId === channelId
        );
        
        if (ticketIndex !== -1) {
            guildData.activeTickets[ticketIndex].active = false;
            this.saveData();
        }
    }
}

export const ticketSystem = new TicketSystemManager();
