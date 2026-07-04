require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials
} = require("discord.js");

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    VoiceConnectionStatus,
    entersState
} = require("@discordjs/voice");

const { exec } = require("yt-dlp-exec");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel]
});

// Map of guildId → queue object
const queues = new Map();

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            songs: [],
            player: createAudioPlayer(),
            connection: null,
            playing: false
        });
    }
    return queues.get(guildId);
}

// --- YT-DLP helpers ---

async function getPlaylistItems(url) {
    try {
        const info = await exec(url, {
            dumpSingleJson: true,
            flatPlaylist: true
        });
        if (!info.entries || info.entries.length === 0) return [];
        return info.entries.map(e => e.url);
    } catch (err) {
        console.error("Failed to fetch playlist items:", err);
        return [];
    }
}

async function createStream(url) {
    try {
        const proc = exec(url, {
            output: "-",
            format: "bestaudio"
        });

        return proc.stdout;
    } catch (err) {
        console.error("Failed to create stream:", err);
        return null;
    }
}

// --- Playback logic ---

async function playNext(guildId) {
    const queue = getQueue(guildId);

    if (queue.songs.length === 0) {
        queue.playing = false;
        return;
    }

    const song = queue.songs[0];
    console.log(`Now playing: ${song}`);

    const stream = await createStream(song);
    if (!stream) {
        console.error("Stream is undefined, skipping song.");
        queue.songs.shift();
        return playNext(guildId);
    }

    const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary
    });

    queue.player.play(resource);
    queue.playing = true;
}

async function ensureConnection(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        await message.reply("You need to be in a voice channel to use this command.");
        return null;
    }

    const queue = getQueue(message.guild.id);

    if (!queue.connection) {
        queue.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        });

        queue.connection.on("error", (err) => {
            console.error("Voice connection error:", err);
        });

        try {
            await entersState(queue.connection, VoiceConnectionStatus.Ready, 30_000);
        } catch (err) {
            console.error("Failed to connect to voice channel:", err);
            await message.reply("Failed to join voice channel.");
            return null;
        }

        queue.connection.subscribe(queue.player);

        queue.player.on(AudioPlayerStatus.Idle, () => {
            const q = getQueue(message.guild.id);
            q.songs.shift();
            playNext(message.guild.id);
        });

        queue.player.on("error", (err) => {
            console.error("Audio player error:", err);
            const q = getQueue(message.guild.id);
            q.songs.shift();
            playNext(message.guild.id);
        });
    }

    return queue.connection;
}

// --- Command handling ---

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!")) return;

    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();

    if (command === "!play") {
        const url = args[1];
        if (!url) {
            return message.reply("Please provide a YouTube Music or YouTube URL.");
        }

        const connection = await ensureConnection(message);
        if (!connection) return;

        const queue = getQueue(message.guild.id);

        // Detect playlist by query param "list="
        if (url.includes("list=")) {
            await message.reply("Loading playlist, please wait...");
            const items = await getPlaylistItems(url);

            if (items.length === 0) {
                return message.reply("Could not load playlist or playlist is empty.");
            }

            queue.songs.push(...items);
            await message.reply(`Added **${items.length}** tracks from playlist to the queue.`);
        } else {
            queue.songs.push(url);
            await message.reply("Added track to the queue.");
        }

        if (!queue.playing) {
            playNext(message.guild.id);
        }
    }

    if (command === "!skip") {
        const queue = getQueue(message.guild.id);
        if (!queue.playing || queue.songs.length === 0) {
            return message.reply("Nothing is playing right now.");
        }
        message.reply("Skipping current track...");
        queue.player.stop(true);
    }

    if (command === "!stop") {
        const queue = getQueue(message.guild.id);
        queue.songs = [];
        queue.player.stop(true);
        if (queue.connection) {
            queue.connection.destroy();
            queue.connection = null;
        }
        queue.playing = false;
        message.reply("Stopped playback and cleared the queue.");
    }

    if (command === "!pause") {
        const queue = getQueue(message.guild.id);
        if (!queue.playing) {
            return message.reply("Nothing is playing.");
        }
        queue.player.pause(true);
        message.reply("Paused playback.");
    }

    if (command === "!resume") {
        const queue = getQueue(message.guild.id);
        queue.player.unpause();
        message.reply("Resumed playback.");
    }

    if (command === "!queue") {
        const queue = getQueue(message.guild.id);
        if (queue.songs.length === 0) {
            return message.reply("The queue is empty.");
        }
        const list = queue.songs
            .map((s, i) => `${i === 0 ? "**▶**" : `${i}.`} ${s}`)
            .join("\n");
        message.reply(`Current queue:\n${list}`);
    }
});

// --- Login ---

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);
