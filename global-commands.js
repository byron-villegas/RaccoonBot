const { ApplicationCommandOptionType } = require('discord.js');

const globalCommands = [
    {
        name: 'play',
        description: 'Play a song by name or link',
        options: [
            {
                name: 'query',
                type: ApplicationCommandOptionType.String,
                description: 'The name of the song you want to play or the youtube/spotify link',
                required: true
            }
        ]
    },
    {
        name: 'pause',
        description: 'Pause the current song'
    },
    {
        name: 'resume',
        description: 'Resume the current song'
    },
    {
        name: 'skip',
        description: 'Skip the current song'
    },
    {
        name: 'stop',
        description: 'Stop song and clear the queue'
    },
    {
        name: 'queue',
        description: 'See the queue'
    },
    {
        name: 'roulette',
        description: 'Select a number from 1 to 6, if you lose you are kicked from the voice channel',
        options: [
            {
                name: 'number',
                type: ApplicationCommandOptionType.Integer,
                description: 'Number from 1 to 6',
                required: true
            }
        ]
    }
]

module.exports = globalCommands;