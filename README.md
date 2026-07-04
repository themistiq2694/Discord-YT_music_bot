## README.md for YT Music Bot 

## 1. YT Music Bot - Description

A lightweight, stable, and easy-to-use Discord music bot designed to stream high-quality audio from YouTube Music using discord.js, @discordjs/voice, and yt-dlp. Built for simplicity, reliability, and fast playback. 

## 2. Overview 

**YT Music Bot** provides seamless music playback from YouTube Music with minimal configuration. It uses a straightforward command system (!play) and requires only essential Discord permissions. Ideal for personal servers, gaming groups, and small communities. 

## 3. Features 

- High-quality audio streaming from YouTube Music 

- Simple !play command for songs and playlists 

- Automatic queue handling 

- Stable voice-channel connection 

- Minimal permissions required 

- Beginner-friendly setup 

- Works on Windows, Linux, and VPS environments 

## 4. Installation 

### A. Clone the repository 

git clone https://github.com/themistiq2694/YT-Music-Bot.git cd YT-Music-Bot 

### B. Install dependencies 

npm install 

### C. Add your bot token 

Open index.js and replace: client.login("YOUR_BOT_TOKEN"); 

with your actual token from the Discord Developer Portal.  

## 5. Required Discord Settings 

### OAuth2 Scopes 

- bot 

- applications.commands 

### Bot Permissions 

- View Channels 

- Send Messages 

- Connect 

- Speak 

### Privileged Gateway Intents 

Enable these in Developer Portal → Bot: 

- Message Content Intent 

- Server Members Intent 

## 6. Running the Bot 

From your bot folder: 

node index.js 

Your bot will appear **online** in your Discord server. 

## 7. Commands 

### !play <url> 

Plays a YouTube Music track or playlist. 

Examples: 

!play https://music.youtube.com/watch?v=XXXXXXXX !play https://music.youtube.com/playlist?list=PLXXXXXXXX 

## 8. Project Structure 

YT-Music-Bot/

│
├── LICENSE.md              # MIT License for your project
├── PrivacyPolicy.md        # Privacy Policy required for Discord verification
├── README.md               # Main documentation for your bot
├── TOS.md                  # Terms of Service required for Discord verification
├── index.js                # Main bot logic (Discord.js + yt-dlp)
├── package.json            # Project metadata + dependencies list
├── package-lock.json       # Exact dependency versions for reproducibility

## 9. Invite Link 

Generate your bot invite link using OAuth2 URL Generator with the scopes and permissions listed above. 

## 10. Terms of Service 

Read the full Terms of Service here:  
https://github.com/themistiq2694/YT-Music-Bot/blob/main/TOS.md

## 11. Requirements 

- Node.js 18+ 

- FFmpeg (via ffmpeg-static) 

- yt-dlp 

- Discord bot token 

## 12.Support 

For issues, questions, or feature requests, open a GitHub issue or contact the developer. **Developer:** Mihail-Petre Dragutoiu (Mistiq / Mike) **GitHub:** https://github.com/themistiq2694 
