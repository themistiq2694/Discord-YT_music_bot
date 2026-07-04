## README.md for YT Music Bot 

## YT Music Bot 

A lightweight, stable, and easy-to-use Discord music bot designed to stream high-quality audio from YouTube Music using discord.js, @discordjs/voice, and yt-dlp. Built for simplicity, reliability, and fast playback. 

## Overview 

**YT Music Bot** provides seamless music playback from YouTube Music with minimal configuration. It uses a straightforward command system (!play) and requires only essential Discord permissions. Ideal for personal servers, gaming groups, and small communities. 

## Features 

- High-quality audio streaming from YouTube Music 

- Simple !play command for songs and playlists 

- Automatic queue handling 

- Stable voice-channel connection 

- Minimal permissions required 

- Beginner-friendly setup 

- Works on Windows, Linux, and VPS environments 

## Installation 

## 1. Clone the repository 

git clone https://github.com/themistiq2694/YT-Music-Bot.git cd YT-Music-Bot 

## 2. Install dependencies 

npm install 

## 3. Add your bot token 

Open index.js and replace: client.login("YOUR_BOT_TOKEN"); 

with your actual token from the Discord Developer Portal.  

## Required Discord Settings 

## OAuth2 Scopes 

- bot 

- applications.commands 

## Bot Permissions 

- View Channels 

- Send Messages 

- Connect 

- Speak 

## Privileged Gateway Intents 

Enable these in Developer Portal → Bot: 

- Message Content Intent 

- Server Members Intent 

## Running the Bot 

From your bot folder: 

node index.js 

Your bot will appear **online** in your Discord server. 

## Commands 

## !play <url> 

Plays a YouTube Music track or playlist. 

Examples: 

!play https://music.youtube.com/watch?v=XXXXXXXX !play https://music.youtube.com/playlist?list=PLXXXXXXXX 

## Project Structure 

YT-Music-Bot/ │ ├── index.js # Main bot logic ├── package.json # Dependencies & metadata ├── README.md # Documentation └── node_modules/ # Installed packages 

## Invite Link 

Generate your bot invite link using OAuth2 URL Generator with the scopes and permissions listed above. 

## Terms of Service 

A Terms of Service page is required for Discord bot listings. You may host it on Google Docs, GitHub Pages, or Pastebin. 

## Requirements 

- Node.js 18+ 

- FFmpeg (via ffmpeg-static) 

- yt-dlp 

- Discord bot token 

## Support 

For issues, questions, or feature requests, open a GitHub issue or contact the developer. **Developer:** Mihail-Petre Dragutoiu (Mistiq / Mike) **GitHub:** https://github.com/themistiq2694 
