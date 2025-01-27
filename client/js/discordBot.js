import { Client, IntentsBitField, SlashCommandBuilder } from 'discord.js';
import { createCanvas } from 'canvas';
import { Chart } from 'chart.js/auto';
import { displayAverageEventTimes } from '../components/displayAverageEventTimes.js';
import { LOCAL_TESTING } from "../config/constants.js";

class StatsBot {
    constructor() {
        this.client = new Client({
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMessages
            ]
        });
        
        this.setupEventHandlers();
        this.registerCommands();
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`Bot is ready! Logged in as ${this.client.user.tag}`);
        });

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isCommand()) return;
            await this.handleCommand(interaction);
        });
    }

    async registerCommands() {
        const commands = [
            new SlashCommandBuilder()
                .setName('stats')
                .setDescription('Get player statistics chart')
                .addStringOption(option =>
                    option.setName('summoner')
                        .setDescription('Summoner Name')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('tagline')
                        .setDescription('Tagline (e.g., NA1)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('gamemode')
                        .setDescription('Game Mode to analyze')
                        .setRequired(true)
                        .addChoices(
                            { name: 'All Games', value: 'all' },
                            { name: 'Ranked Solo/Duo', value: 'ranked' },
                            { name: 'Normal Draft', value: 'draft' },
                            { name: 'ARAM', value: 'aram' },
                            { name: 'Arena', value: 'arena' }
                        ))
                .addStringOption(option =>
                    option.setName('stat')
                        .setDescription('Stat to display')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Kills', value: 'kills' },
                            { name: 'Deaths', value: 'deaths' },
                            { name: 'Assists', value: 'assists' },
                            { name: 'KDA', value: 'kda' },
                            { name: 'Item Purchases', value: 'itemPurchases' },
                            { name: 'Turrets', value: 'turrets' },
                            { name: 'Dragons', value: 'dragons' },
                            { name: 'Barons', value: 'barons' },
                            { name: 'Elders', value: 'elders' },
                            { name: 'Inhibitors', value: 'inhibitors' },
                            { name: 'Death Timers', value: 'deathTimers' }
                        ))
        ];
    
        try {
            await this.client.application?.commands.set(commands);
            console.log('Discord commands registered successfully!');
        } catch (error) {
            console.error('Error registering Discord commands:', error);
        }
    }

    async handleCommand(interaction) {
        if (!interaction.commandName === 'stats') return;

        await interaction.deferReply();

        try {
            const summoner = interaction.options.getString('summoner');
            const tagline = interaction.options.getString('tagline');
            const gameMode = interaction.options.getString('gamemode');
            const statType = interaction.options.getString('stat');

            // Use your existing API endpoint
            const prodURL = 'https://shouldiffserver-test.onrender.com/api/stats';
            const localURL = 'http://127.0.0.1:3000/api/stats';
            
            const response = await fetch(LOCAL_TESTING ? localURL : prodURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summonerName: summoner,
                    tagLine: tagline,
                    gameMode: 'all'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch player data');
            }

            const data = await response.json();
            const chartImage = await this.generateChart(data, statType);
            
            await interaction.editReply({
                files: [{
                    attachment: chartImage,
                    name: 'stats-chart.png'
                }]
            });
        } catch (error) {
            await interaction.editReply({
                content: `Error: ${error.message}`,
                ephemeral: true
            });
        }
    }

    async generateChart(data, statType) {
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Use your existing chart generation logic through displayAverageEventTimes
        const result = await displayAverageEventTimes(data.averageEventTimes, data.liveStats);
        
        // Convert the chart to an image buffer
        const buffer = canvas.toBuffer('image/png');
        
        // Clean up
        if (result.cleanup) {
            result.cleanup();
        }

        return buffer;
    }

    start(token) {
        this.client.login(token);
    }
}

export default StatsBot;