require('dotenv').config(); // Load .env file

const { Client, GatewayIntentBits } = require('discord.js');
const { Player, useTimeline, useQueue } = require('discord-player');
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const globalCommands = require('./global-commands');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

client.login(process.env.DISCORD_TOKEN);

const bot = process.env.BOT;

const player = new Player(client);

const playlist = player.createPlaylist({
    id: 'playlist',
    title: 'Playlist',
    description: 'Playlist of the songs to play',
    type: 'playlist',
    tracks: []
});

client.once('ready', async () => {
    console.log(`Logged as ${client.user.tag}`);
    try {
        await client.application.commands.set(globalCommands);
        console.log('Global commands registered successfully');
    } catch (error) {
        console.error('Error registering global commands', error);
    }
});

client.on('error', error => {
    console.error('Client have an error', error);
});
client.on('warn', warn => {
    console.warn('Client have an warn', warn);
});

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isCommand()) {
        return;
    }

    const { commandName, options } = interaction;

    const channel = interaction.member.voice.channel;

    const timeline = useTimeline({
        node: interaction.guild.id
    });

    switch (commandName) {
        case 'play':
            const query = options.getString('query');

            console.log(`Song link ${query}`);

            if (!channel) {
                interaction.reply('> `⚠️ You need to be in a voice channel to play music.`');
                break;
            }

            if (playlist.tracks.filter(track => track.url == query).length > 0) {
                interaction.reply('> ⚠️ The song is already in the playlist.');
                break;
            }

            ytdl.getBasicInfo(query).then(info => {
                console.log(`Song title ${info.videoDetails.title}`);

                const videoStream = ytdl(query, {
                    format: 'mp3',
                    highWaterMark: 1 << 62,
                    liveBuffer: 1 << 62,
                    dlChunkSize: 0,
                    bitrate: 128,
                    quality: 'lowest'
                });

                const audioResource = createAudioResource(videoStream);

                playlist.tracks.push({
                    title: info.videoDetails.title,
                    url: query,
                    resource: audioResource
                });

                interaction.reply(`>✅ Added **[${info.videoDetails.title}](${query})** to the queue!!`);

                playlist.play(channel);
            });

            break;
        case 'pause':
            if (!timeline) {
                interaction.reply('>⚠️ This server does not have an active player session.');
                break;
            }

            if (timeline.paused) {
                interaction.reply('>⚠️ The player is already paused.');
            }

            timeline.pause();

            interaction.reply('>⏸️ The player is now paused.');
            break;
        case 'resume':
            if (!timeline) {
                interaction.reply('>⚠️ This server does not have an active player session.');
                break;
            }

            if (!timeline.paused) {
                interaction.reply('>⚠️ The player is already playing.');
            }

            timeline.resume();

            interaction.reply('>▶️ The player has been resumed!!');
            break;
        case 'skip':
            const queue = useQueue(interaction.guild);

            if (!queue) {
                return interaction.reply(
                    'This server does not have an active player session.',
                );
            }

            if (!queue.isPlaying()) {
                return interaction.reply('There is no track playing.');
            }

            // Skip the current track
            queue.node.skip();

            // Send a confirmation message
            return interaction.reply('The current song has been skipped.');
            break;
        case 'stop':
            // Stop the song and clear the queue
            break;
        case 'queue':
            // See the queue
            break;
        case 'roulette':
            if (!channel) {
                await interaction.reply('> You need to be in a voice channel to play roulette.');
                return;
            }

            const selectedNumber = options.getInteger('number');

            if (selectedNumber > 6 || selectedNumber < 1) {
                await interaction.reply('> You need to select a number between 1 and 6.');
                return;
            }

            const number = Math.floor(Math.random() * 6) + 1;

            if (selectedNumber == number) {

                await interaction.reply(`> See you later <@${interaction.member.id}>!!`);

                interaction.member.voice.disconnect();
                return;
            }

            await interaction.reply('> You have been lucky.');

            break;
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) {
        return;
    }

    if(!message.mentions.users.has(bot)) {
        return;
    };

    const channel = message.member.voice.channel;

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
    });

    const sounds = [
        'Ahora Me Ves Ahora No Me Ves.mp3',
        'Ay Dios Mio.mp3',
        'Callate Vo Vieja Culia.mp3',
        'El Lado Misterioso De La Isla.mp3',
        'El Tamaño No Lo Es Todo.mp3',
        'Empanadas.mp3',
        'Piano.mp3',
        'Coño.mp3',
        'Verga.mp3',
        'Ustedes Son Imbeciles.mp3',
        'Te Ha Hablado Dross.mp3',
        'HA HOI AAEAHHHH.mp3',
        'Omae Wa Mou Shindeiru.mp3',
        'Oye Aweonao.mp3',
        'Se Escucha Alla Atras.mp3',
        'Y Me Le Ocurrio Otra Idea.mp3'
    ];

    let randomSound = sounds[Math.floor(Math.random() * sounds.length)];

    if (message.content.toLowerCase().includes('empanadas') || message.content.toLowerCase().includes('empanada')) {
        randomSound = 'Empanadas.mp3';
    }

    const resource = createAudioResource(path.join(__dirname, 'sounds/' + randomSound));
    const audioPlayer = createAudioPlayer();

    audioPlayer.on('error', error => {
        console.error(`Error: ${error.message}`);
    });

    connection.subscribe(audioPlayer);
    audioPlayer.play(resource);

    // Desconectar el bot después de 5 minutos de inactividad
    setTimeout(() => {
        connection.destroy();
        console.log('Disconnected due to inactivity');
    }, 5000); // 5 minutos en milisegundos
});