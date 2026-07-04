const { Client, GatewayIntentBits } = require("discord.js");
const { 
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus
} = require("@discordjs/voice");
const ytdlp = require("yt-dlp-exec");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const queue = new Map();

client.on("messageCreate", async (msg) => {
    if (!msg.content.startsWith("!play")) return;

    const url = msg.content.split(" ")[1];
    if (!url) return msg.reply("Please provide a YouTube Music link.");

    const voiceChannel = msg.member.voice.channel;
    if (!voiceChannel) return msg.reply("Join a voice channel first.");

    let serverQueue = queue.get(msg.guild.id);

    if (!serverQueue) {
        const player = createAudioPlayer();
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: msg.guild.id,
            adapterCreator: msg.guild.voiceAdapterCreator
        });

        serverQueue = {
            connection,
            player,
            songs: []
        };

        queue.set(msg.guild.id, serverQueue);

        player.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            if (serverQueue.songs.length > 0) playSong(msg.guild.id);
        });
    }

    serverQueue.songs.push(url);
    msg.reply(`Added to queue: ${url}`);

    if (serverQueue.songs.length === 1) playSong(msg.guild.id);
});

async function playSong(guildId) {
    const serverQueue = queue.get(guildId);
    const url = serverQueue.songs[0];

    const stream = ytdlp(url, {
        output: "-",
        format: "bestaudio"
    });

    const resource = createAudioResource(stream.stdout);
    serverQueue.player.play(resource);
    serverQueue.connection.subscribe(serverQueue.player);
}

client.login("YOUR_BOT_TOKEN");
