/*
=========================================================
Project    : YT Music Bot
Version    : 1.0.0 Stable
Created    : 2026 July 05
Author     : Dragutoiu Mihail-Petre
Discord ID : themistiq2694
=========================================================
This version features the following:
--------
✓ Play single YouTube videos
✓ Play YouTube Music links
✓ Play playlists
✓ Queue system
✓ Skip
✓ Pause
✓ Resume
✓ Stop
✓ Auto-disconnect after 3 minutes
✓ Per-server queues
✓ "Now Playing" embed
✓ Editable "Now Playing" message (no chat spam)
✓ Correct artist
✓ Correct duration
✓ Correct thumbnails
✓ Metadata caching
✓ Better startup stability

Known limitation:
• Large playlists currently load ~100 entries (yt-dlp limitation)
=========================================================
to be tested:

Test with single songs.
Test with small playlists.
Test with skipping, pausing, resuming, and stopping.
Let it play for an hour or so to see if there are any stability issues.
Then, in the next session, focus only on fixing the "437 songs → 104 songs" limitation.
=========================================================
Future updates
I also have a few ideas for a polished v1.1 roadmap that would make the bot feel much more professional without making the code significantly more complex:

Addressing the yt-dlp limitation
!np (show current song)
!shuffle
!remove <number>
!clear
!loop
!volume
Better queue formatting with pages for long queues
Resume after reconnect if Discord briefly disconnects
=========================================================
*/

require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
	EmbedBuilder
} = require("discord.js");

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
	StreamType
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
            playing: false,
			startedPlaying: false,
			textChannel: null,
			nowPlayingMessage: null,
			disconnectTimer: null
        });
    }
    return queues.get(guildId);
}

// --- YT-DLP helpers ---
async function getPlaylistItems(url) {
    try {
        const result = await exec(url, {
            flatPlaylist: true,
            dumpSingleJson: true,
            skipDownload: true,
            noWarnings: true,
			noCheckCertificates: true
        });

        const info =
            typeof result.stdout === "string"
                ? JSON.parse(result.stdout)
                : result;
				console.log("Playlist count:", info.playlist_count);
				console.log("Entries returned:", info.entries.length);

        if (!info.entries)
            return [];


		return info.entries
			.filter(entry => entry && entry.id)
			.map(entry => ({
				url: entry.url,
				title: entry.title || "Unknown title",
					uploader: null,
					duration: entry.duration || 0,
					thumbnail: entry.thumbnails?.[0]?.url || null,
					metadataLoaded: false
			}));
			
    } catch (err) {
        console.error(err);
        return [];
    }
}

//Before adding the song, ask yt-dlp for the video's metadata.
async function getVideoInfo(url) {
	try {
		const result = await exec(url, {
			dumpSingleJson: true,
			skipDownload: true,
			noWarnings: true,
			noPlaylist: true
		});

		const info =
			typeof result.stdout === "string"
				? JSON.parse(result.stdout)
				: result;
				
		return {
			url,
			title: info.title || "Unknown title",
			uploader:
				info.artist ||
				info.album_artist ||
				info.creator ||
				info.uploader ||
				"Unknown",
			duration: info.duration || 0,
			thumbnail: info.thumbnail || null
		};
	} catch (err) {
		console.error("Failed to fetch video info:", err);

		return {
			url,
			title: url
		};
	}
}

async function createStream(url) {
    try {
        const proc = exec(url, {
			output: "-",
			format: "bestaudio",
			noPlaylist: true,
			quiet: true,
			noWarnings: true,
			bufferSize: "16K"
		});
		
        return proc.stdout;
    } catch (err) {
        console.error("Failed to create stream:", err);
        return null;
    }
}

//Add a duration formatter
function formatDuration(seconds) {
    if (!seconds) return "Unknown";

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// --- Playback logic ---

async function playNext(guildId) {
    const queue = getQueue(guildId);
	
	if (queue.songs.length === 0) {
		queue.playing = false;

		if (queue.disconnectTimer) {
			clearTimeout(queue.disconnectTimer);
			queue.disconnectTimer = null;
		}

		console.log("Queue finished.");

		if (queue.textChannel) {
			await queue.textChannel.send("✅ Queue finished.");
		}

		return;
	}

	const song = queue.songs[0];
	
	// Fetch full metadata if this song came from a playlist
	if (!song.metadataLoaded) { 
		console.log("Fetching full metadata...");

		const fullInfo = await getVideoInfo(song.url);

		song.title = fullInfo.title;
		song.uploader = fullInfo.uploader;
		song.duration = fullInfo.duration;
		song.thumbnail = fullInfo.thumbnail;
		song.metadataLoaded = true;
	}
	
	queue.startedPlaying = false;

	console.log(`[${guildId}] Now playing: ${song.title}`);

	if (queue.textChannel) {
		const embed = new EmbedBuilder()
			.setColor(0x19B2FF)
			.setTitle("🎶 Now Playing")
			.setDescription(`**${song.title}**`)
			.setThumbnail(song.thumbnail || null)
			.addFields(
				{
					name: "👤 Artist",
					value: song.uploader || "Unknown",
					inline: true
				},
				{
					name: "⏱️ Duration",
					value: formatDuration(song.duration),
					inline: true
				}
			);

		if (queue.nowPlayingMessage) {
			await queue.nowPlayingMessage.edit({
				embeds: [embed]
			});
		} else {
			queue.nowPlayingMessage = await queue.textChannel.send({
				embeds: [embed]
			});
		}
	}
	
	//NOW continue playing the song
	const stream = await createStream(song.url);

	if (!stream) {
		console.error("Stream is undefined > Skipping song");
		queue.songs.shift();
		return playNext(guildId);
	}

	const resource = createAudioResource(stream, {
		inputType: StreamType.Arbitrary
	});

	queue.player.play(resource);
}	

async function ensureConnection(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        await message.reply("You need to be in a voice channel to use this command.");
        return null;
    }

    const queue = getQueue(message.guild.id);
	queue.textChannel = message.channel;

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

		queue.player.on(AudioPlayerStatus.Playing, () => {
			const q = getQueue(message.guild.id);
			q.startedPlaying = true;
			console.log("Playback started.");
		});

		queue.player.on(AudioPlayerStatus.Idle, () => {
			const q = getQueue(message.guild.id);

			// Ignore fake Idle before playback starts
			if (!q.startedPlaying) {
				console.log("Ignoring premature Idle.");
				return;
			}

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
        let url = args[1];

		if (!url) {
			return message.reply("Please provide a YouTube URL.");
		}

		url = url.replace("music.youtube.com", "www.youtube.com");
		
        const connection = await ensureConnection(message);
        if (!connection) return;

        const queue = getQueue(message.guild.id);

        // Detect playlist by query param "list="
        if (url.includes("list=")) {
            await message.reply("Loading playlist, please wait...");
            const items = await getPlaylistItems(url);
			console.log("Playlist items:", items.length);
			
            if (items.length === 0) {
                return message.reply("Could not load playlist or playlist is empty.");
            }

            queue.songs.push(...items);
            await message.reply(
				`📃 Added **${items.length}** tracks from the playlist to the queue.`
			);
        } else {
            const song = await getVideoInfo(url);

			queue.songs.push(song);			
		
            await message.reply(
				`🎵 Added **${song.title}** to the queue.`
			);
        }

        if (!queue.playing) {
			queue.playing = true;
            await playNext(message.guild.id);
        }
    }

    if (command === "!skip") {
        const queue = getQueue(message.guild.id);
        if (!queue.playing || queue.songs.length === 0) {
            return message.reply("Nothing is playing right now.");
        }
        await message.reply("⏭️ Skipping current track...");
        queue.player.stop(true);
    }

	if (command === "!stop") {

		const queue = getQueue(message.guild.id);

		queue.songs.length = 0;

		queue.player.stop(true);

		if (queue.connection) {
			queue.connection.destroy();
			queue.connection = null;
		}

		// Reset the "Now Playing" message

		if (queue.nowPlayingMessage) {
			await queue.nowPlayingMessage.delete().catch(() => {});
			queue.nowPlayingMessage = null;
		}

		// Cancel the auto-disconnect timer if it's running
		if (queue.disconnectTimer) {
			clearTimeout(queue.disconnectTimer);
		}

		queue.playing = false;

		// Remove this guild's queue from memory
		queues.delete(message.guild.id);

		return message.reply("🛑 Playback stopped and the queue has been cleared.");
	}

    if (command === "!pause") {
        const queue = getQueue(message.guild.id);
        if (!queue.playing) {
            return message.reply("Nothing is playing.");
        }
        if (queue.player.pause(true)) {
			await message.reply("⏸️ Playback paused.");
		} else {
			await message.reply("Nothing is currently playing.");
		}
	}

    if (command === "!resume") {
        const queue = getQueue(message.guild.id);
        if (queue.player.unpause()) {
			await message.reply("▶️ Playback resumed.");
		} else {
			await message.reply("Nothing is paused.");
		}	
	}

    if (command === "!queue") {
        const queue = getQueue(message.guild.id);
        if (queue.songs.length === 0) {
            return message.reply("The queue is empty.");
        }
		const list = queue.songs
			.map((song, i) =>
				`${i === 0 ? "▶" : `${i}.`} ${song.title}`
			)
			.join("\n");
        message.reply(
			`📜 Queue:\n${list}`
		);				
    }
});

// --- Login ---

client.once("clientReady", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Auto-disconnect when the voice channel becomes empty
client.on("voiceStateUpdate", (oldState, newState) => {

    const guildId = oldState.guild.id;
    const queue = queues.get(guildId);

    if (!queue || !queue.connection) return;

    const botChannelId = queue.connection.joinConfig.channelId;

    if (!botChannelId) return;

    const channel = oldState.guild.channels.cache.get(botChannelId);

    if (!channel) return;

    const humans = channel.members.filter(member => !member.user.bot);

    // Someone is in the channel -> cancel disconnect timer
    if (humans.size > 0) {

        if (queue.disconnectTimer) {
            clearTimeout(queue.disconnectTimer);
            queue.disconnectTimer = null;

            console.log("A user rejoined. Disconnect cancelled.");
        }

        return;
    }

    // Timer already running
    if (queue.disconnectTimer) return;

    console.log("Voice channel empty. Starting 3-minute disconnect timer.");

    if (queue.textChannel) {
        queue.textChannel.send(
            "⏳ Everyone left the voice channel.\nI'll disconnect in **3 minutes** unless someone rejoins."
        );
    }

    queue.disconnectTimer = setTimeout(() => {

        const latestQueue = queues.get(guildId);

        if (!latestQueue || !latestQueue.connection) return;

        const latestChannel =
            oldState.guild.channels.cache.get(botChannelId);

        if (!latestChannel) return;

        const humansStillThere =
            latestChannel.members.filter(member => !member.user.bot);

        if (humansStillThere.size > 0) {

            latestQueue.disconnectTimer = null;
            return;
        }

        console.log("Disconnect timer expired.");

        latestQueue.songs.length = 0;
        latestQueue.player.stop(true);

        latestQueue.connection.destroy();

        queues.delete(guildId);

        if (latestQueue.textChannel) {
            latestQueue.textChannel.send(
                "👋 Nobody returned after 3 minutes. Disconnecting."
            );
        }

    }, 180000);
});

client.login(process.env.BOT_TOKEN);