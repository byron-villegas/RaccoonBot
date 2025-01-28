require('dotenv').config(); // Load .env file

const colors = require('colors');
const { Client, GatewayIntentBits } = require('discord.js');
const { Player, useTimeline, useQueue } = require('discord-player');
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const path = require('path');
const play = require('play-dl');
const SpotifyWebApi = require('spotify-web-api-node');
const ytdl = require('@distube/ytdl-core');
const globalCommands = require('./global-commands');

const APPLICATION = process.env.APPLICATION;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

client.login(process.env.DISCORD_TOKEN);

// Emitted when the client are ready
client.on('ready', async () => {
    console.log(colors.green(`Logged as ${colors.grey(client.user.tag)}`));
    try {
        await client.application.commands.set(globalCommands);
        console.log(colors.green('Global commands registered successfully'));
    } catch (error) {
        console.error(colors.red('Error registering global commands', error));
    }
});

const player = new Player(client);

const playlist = player.createPlaylist({
    id: 'playlist',
    title: 'Playlist',
    description: 'Playlist of the songs to play',
    type: 'playlist',
    tracks: []
});

// NOT USED
// Emitted when the player starts to play a song
player.events.on('playerStart', (queue, track) => {
    console.log(colors.blue(`Started playing ${track.title}`));
});

// NOT USED
// Emitted when the player adds a single song to its queue
player.events.on('audioTrackAdd', (queue, track) => {
    console.log(colors.blue(`Track ${track.title} queued`));
});

// NOT USED
// Emitted when the player adds multiple songs to its queue
player.events.on('audioTracksAdd', (queue, tracks) => {
    console.log(colors.blue(`Multiple Tracks ${tracks.length} queued`));
});

// NOT USED
// Emitted when the player remove a single song to its queue
player.events.on('audioTrackRemove', (queue, track) => {
    console.log(colors.gray(`Track ${track.title} removed`));
});

// NOT USED
// Emitted when the player remove various songs to its queue
player.events.on('audioTracksRemove', (queue, tracks) => {
    console.log(colors.gray(`Multiple Tracks ${tracks.length} removed`));
});

// Emitted when the player finalized the current song
player.events.on('playerFinish', async (queue, track) => {
    console.log(colors.blue(`Finished playing ${track.title}`));

    const index = playlist.tracks.findIndex(t => t.url == track.url);
    playlist.tracks.splice(index, 1);
});

// Emitted when the audio player fails to load the stream for a song
player.events.on('playerSkip', (queue, track) => {
    console.log(colors.blue(`Skipping **${track.title}** due to an issue!`));
});

// Emitted when the bot leaves the voice channel
player.events.on('disconnect', (queue) => {
    console.log(colors.gray('Looks like my job here is done, leaving now!'));
});

// Emitted when the voice channel has been empty for the set threshold
// Bot will automatically leave the voice channel with this event
player.events.on('emptyChannel', (queue) => {
    console.log(colors.gray(`Leaving because no vc activity for the past 5 minutes`));
});

// Emitted when the player queue has finished
player.events.on('emptyQueue', (queue) => {
    playlist.tracks = [];
    console.log(colors.blue('Queue finished!'));
});

// Emitted when the player queue encounters error
player.events.on('error', (queue, error) => {
    console.log(`General player error event: ${error.message}`);
    console.log(error);
});

// Emitted when the audio player errors while streaming audio track
player.events.on('playerError', (queue, error) => {
    console.log(`Player error event: ${error.message}`);
    console.log(error);
});

// Emitted when the client encounters error
client.on('error', error => {
    console.error('Client have an error', error);
});

// Emitted when the client encounters warn
client.on('warn', warn => {
    console.warn('Client have an warn', warn);
});

// Emitted when an interaction is created
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isCommand()) {
        return;
    }

    const { commandName, options } = interaction;

    const channel = interaction.member.voice.channel;

    const timeline = useTimeline({ node: interaction.guild.id });

    const queue = useQueue(interaction.guild);

    switch (commandName) {
        case 'play':
            const query = options.getString('query');

            if (!channel) {
                interaction.reply('> ⚠️ You need to be in a voice channel to play music.');
                break;
            }

            if (playlist.tracks.filter(track => track.url == query).length > 0) {
                interaction.reply('> ⚠️ The song is already in the playlist.');
                break;
            }

            console.log(`Song ${query}`);

            if (query.includes('www.youtube.com') || query.includes('youtu.be')) {
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
                        resource: audioResource,
                        duration: info.videoDetails.lengthSeconds
                    });

                    // Only play the song if there is no song playing
                    if(!queue || !queue.isPlaying()) {
                        playlist.play(channel, {
                            nodeOptions: {
                                metadata: interaction.channel
                            }
                        });
                    }

                    interaction.reply(`> ✅ Added **[${info.videoDetails.title}](${query})** to the queue!!`);
                });
                break;
            }

            if (query.includes('open.spotify.com')) {
                const trackId = query.split('track/')[1].split('?')[0];

                const data = await spotifyApi.clientCredentialsGrant();
                spotifyApi.setAccessToken(data.body['access_token']);

                const track = await spotifyApi.getTrack(trackId);

                const trackName = track.body.name + '-' + track.body.artists[0].name;

                playSongBySearch(trackName, interaction, channel, queue);

                break;
            }

            playSongBySearch(query, interaction, channel, queue);

            break;
        case 'pause':
            if (!timeline) {
                interaction.reply('> ⚠️ This server does not have an active player session.');
                break;
            }

            if (timeline.paused) {
                interaction.reply('> ⚠️ The player is already paused.');
                break;
            }

            timeline.pause();

            interaction.reply('> ⏸️ The player is now paused.');
            break;
        case 'resume':
            if (!timeline) {
                interaction.reply('>⚠️ This server does not have an active player session.');
                break;
            }

            if (!timeline.paused) {
                interaction.reply('>⚠️ The player is already playing.');
                break;
            }

            timeline.resume();

            interaction.reply('>▶️ The player has been resumed!!');
            break;
        case 'skip':
            if (!queue) {
                interaction.reply('> ⚠️ This server does not have an active player session.');
                break;
            }

            if (!queue.isPlaying()) {
                interaction.reply('> ⚠️ There is no song playing.');
                break;
            }

            // Skip the current track
            queue.node.skip();

            // Send a confirmation message
            interaction.reply('> ⏭️ The current song has been skipped.');
            break;
        case 'stop':
            queue.delete();

            interaction.reply('> ⏹️ The queue has been stopped.');
            break;
        case 'queue':
            if (!queue) {
                interaction.reply('> ⚠️ This server does not have an active player session.');
                break;
            }

            if (playlist.tracks.length == 0) {
                interaction.reply('> ⚠️ The queue is empty.');
                break;
            }

            const queueDurationInSeconds = playlist.tracks.map(track => parseInt(track.duration)).reduce((a, b) => a + b);

            const queueDuration = queueDurationInSeconds / 60;

            const queueList = '\n' + playlist.tracks
            .map((track, index) => `> ${index + 1}. **[${track.title}](${track.url})**`)
            .join('\n') + `\n\n> Total duration: ${queueDuration} minutes approx.`;

            interaction.reply(`> Queue List ${queueList}`);

            break;
        case 'roulette':
            if (!channel) {
                interaction.reply('> ⚠️ You need to be in a voice channel to play roulette.');
                return;
            }

            const selectedNumber = options.getInteger('number');

            if (selectedNumber > 6 || selectedNumber < 1) {
                interaction.reply('> ⚠️ You need to select a number between 1 and 6.');
                break;
            }

            const number = Math.floor(Math.random() * 6) + 1;

            if (selectedNumber == number) {
                interaction.reply(`> 👋 See you later <@${interaction.member.id}>.`);

                interaction.member.voice.disconnect();
                break;
            }

            interaction.reply('> 🍀 You have been lucky.');
            break;
    }
});

// Emitted whenever a message is created.
client.on('messageCreate', async (message) => {
    if (message.author.bot) {
        return;
    }

    if (!message.mentions.users.has(APPLICATION)) {
        return;
    };

    const channel = message.member.voice.channel;

    const words = [
        'wena',
        'hola',
        'dross',
        'empanada',
        'empanadas',
        'chile',
        'japon',
        'lol',
        'random'
    ];

    const foundWord = words.find(word => message.content.toLowerCase().includes(word));

    if(!foundWord) {
        message.channel.send('> ⚠️ I do not understand what you are saying.');
        return;
    }

    // Mapping of words to text responses
    const defaultTextResponseForWord = {
        'wena': ['Wena wena', 'Wena shoro', 'wena qlo'],
        'hola': ['Wena wena', 'Wena shoro', 'wena qlo']
    }

    // Iterate over the wordResponses mapping
    for (const [word, responses] of Object.entries(defaultTextResponseForWord)) {
        // Check if the message contains the word
        if (message.content.toLowerCase().includes(word)) {
            // Select a random response for the word
            const randomTextResponse = responses[Math.floor(Math.random() * responses.length)];

            // Send the random response
            message.channel.send(randomTextResponse);

            return; // Exit the loop after finding the first matching word
        }
    }

    // Mapping of words to audio responses
    const defaultSoundResponseForWord = {
        'dross': ['dross/Empanadas.mp3', 'dross/Piano.mp3', 'dross/Coño.mp3', 'dross/Verga.mp3', 'dross/Ustedes Son Imbeciles.mp3', 'dross/Te Ha Hablado Dross.mp3'],
        'empanada': ['dross/Empanadas.mp3'],
        'empanadas': ['dross/Empanadas.mp3'],
        'chile': ['chile/Callate Vo Vieja Culia.mp3', 'chile/Oye Aweonao.mp3', 'chile/Se Escucha Alla Atras.mp3', 'chile/Y Me Le Ocurrio Otra Idea.mp3'],
        'japon': ['japan/HA HOI AAEAHHHH.mp3', 'japan/Omae Wa Mou Shindeiru.mp3'],
        'lol': ['lol/Ahora Me Ves Ahora No Me Ves.mp3', 'lol/El Tamaño No Lo Es Todo.mp3'],
        'random': ['random/Ay Dios Mio.mp3', 'random/El Lado Misterioso De La Isla.mp3', 'random/Guatona Con Moño.mp3', 'random/Maraca Maraca.mp3', 'random/Me Electrocutaste Pedrito.mp3']
    }

    // Iterate over the wordResponses mapping
    for (const [word, responses] of Object.entries(defaultSoundResponseForWord)) {
        // Check if the message contains the word
        if (message.content.toLowerCase().includes(word)) {
            // Select a random audio for the word
            const randomAudioResponse = responses[Math.floor(Math.random() * responses.length)];
            
            // Connect to the voice channel
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            // Create an audio player and play the audio
            const resource = createAudioResource(path.join(__dirname, 'sounds/' + randomAudioResponse));
            const audioPlayer = createAudioPlayer();

            connection.subscribe(audioPlayer);
            audioPlayer.play(resource);

            // Disconnect the bot after 15 seconds of inactivity
            setTimeout(() => {
                connection.destroy();
                console.log(colors.gray('Disconnected due to inactivity'));
            }, 15000);

            return; // Exit the loop after finding the first matching word
        }
    }
});

playSongBySearch = (title, interaction, channel, queue) => {
    play.search(title, { limit: 1 }).then(videos => {
        const videoFound = videos[0];

        console.log(`Song title ${videoFound.title}`);

        const videoStream = ytdl(videoFound.url, {
            format: 'mp3',
            highWaterMark: 1 << 62,
            liveBuffer: 1 << 62,
            dlChunkSize: 0,
            bitrate: 128,
            quality: 'lowest'
        });

        const audioResource = createAudioResource(videoStream);

        playlist.tracks.push({
            title: videoFound.title,
            url: videoFound.url,
            resource: audioResource,
            duration: videoFound.durationInSec
        });

        interaction.reply(`> ✅ Added **[${videoFound.title}](${videoFound.url})** to the queue!!`);

        if(!queue || !queue.isPlaying()) {
            playlist.play(channel, {
                nodeOptions: {
                    metadata: interaction.channel
                }
            });
        }
    });
}