// index.js
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { version } = require('./package.json');

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Needed for kick functionality and welcome messages
  ],
});

// File path for storing user data
const userDataFile = path.resolve('user_data.json');

// Load user data from file
function loadUserData() {
  try {
    if (fs.existsSync(userDataFile)) {
      const data = fs.readFileSync(userDataFile, 'utf8');
      return new Map(Object.entries(JSON.parse(data)));
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
  return new Map();
}

// Save user data to file
function saveUserData(data) {
  try {
    const obj = Object.fromEntries(data);
    fs.writeFileSync(userDataFile, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

// In-memory data structure to store user XP and levels
let userLevels = loadUserData();
// In-memory data structure to store welcome channel IDs
const welcomeChannels = new Map();
// In-memory data structure to store moderator role IDs
const moderatorRoles = new Map();
// Track bot's start time
const startTime = Date.now();
// Cooldown for XP (5 minutes)
const xpCooldown = 5 * 60 * 1000;
// Daily bonus (100 XP for active users)
const dailyBonus = 100;

client.once('ready', () => {
  console.log('orangeBOT is online!');
  // Save user data every 5 minutes
  setInterval(() => {
    saveUserData(userLevels);
  }, 5 * 60 * 1000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Award XP for non-command messages
  if (!message.content.startsWith('!')) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const key = `${guildId}-${userId}`;
    
    // Initialize user data if not present
    if (!userLevels.has(key)) {
      userLevels.set(key, { xp: 0, level: 1, lastXP: 0, dailyBonusClaimed: false });
    }
    
    const userData = userLevels.get(key);
    const now = Date.now();
    
    // Check if cooldown has passed
    if (now - userData.lastXP > xpCooldown) {
      // Calculate XP based on message length
      const xpGained = Math.min(Math.floor(message.content.length / 10) + 1, 10);
      userData.xp += xpGained;
      userData.lastXP = now;
      
      // Check for level up
      const requiredXP = Math.floor(10 * Math.pow(1.5, userData.level - 1)); // Exponential XP requirement
      if (userData.xp >= requiredXP) {
        userData.level += 1;
        userData.xp = 0;
        
        const levelUpEmbed = {
          color: 0x00ff00,
          title: '🎉 Level Up!',
          description: `Congratulations ${message.author.username}, you've leveled up to level ${userData.level}!`,
          timestamp: new Date(),
          footer: {
            text: 'orangeBOT',
          },
        };
        
        message.channel.send({ embeds: [levelUpEmbed] });
      }
    }
    
    // Check if daily bonus should be awarded
    const today = new Date().toDateString();
    if (!userData.dailyBonusClaimed || userData.lastDaily !== today) {
      userData.xp += dailyBonus;
      userData.dailyBonusClaimed = true;
      userData.lastDaily = today;
      
      const dailyBonusEmbed = {
        color: 0x0099ff,
        title: '🎁 Daily Bonus!',
        description: `You've received ${dailyBonus} XP as your daily bonus!`,
        timestamp: new Date(),
        footer: {
          text: 'orangeBOT',
        },
      };
      
      message.channel.send({ embeds: [dailyBonusEmbed] });
    }
  }
  
  // Handle commands
  if (message.content.startsWith('!')) {
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'level') {
      const userId = message.author.id;
      const guildId = message.guild.id;
      const key = `${guildId}-${userId}`;
      
      if (userLevels.has(key)) {
        const userData = userLevels.get(key);
        const requiredXP = Math.floor(10 * Math.pow(1.5, userData.level - 1)); // Exponential XP requirement
        const levelEmbed = {
          color: 0x0099ff,
          title: `${message.author.username}'s Level`,
          fields: [
            {
              name: 'Level',
              value: `${userData.level}`,
              inline: true,
            },
            {
              name: 'XP',
              value: `${userData.xp}/${requiredXP}`,
              inline: true,
            },
          ],
          timestamp: new Date(),
          footer: {
            text: 'orangeBOT',
          },
        };
        message.channel.send({ embeds: [levelEmbed] });
      } else {
        message.channel.send(`${message.author.username}, you haven't earned any XP yet!`);
      }
    }
    
    // Kick command
    if (command === 'kick') {
      // Check if the user has the necessary permissions
      if (!message.member.permissions.has('KICK_MEMBERS')) {
        return message.channel.send('You do not have permission to kick members.');
      }
      
      // Get the user to kick
      const user = message.mentions.users.first();
      if (!user) {
        return message.channel.send('You need to mention a user to kick.');
      }
      
      // Get the member object
      const member = message.guild.members.cache.get(user.id);
      if (!member) {
        return message.channel.send('That user is not in this guild.');
      }
      
      // Check if the user is kickable
      if (!member.kickable) {
        return message.channel.send('I cannot kick this user.');
      }
      
      // Kick the user
      try {
        await member.kick();
        message.channel.send(`Successfully kicked ${user.tag}`);
      } catch (error) {
        console.error(error);
        message.channel.send('There was an error trying to kick that user.');
      }
    }
    
    // Ban command
    if (command === 'ban') {
      // Check if the user has the necessary permissions
      if (!message.member.permissions.has('BAN_MEMBERS')) {
        return message.channel.send('You do not have permission to ban members.');
      }
      
      // Get the user to ban
      const user = message.mentions.users.first();
      if (!user) {
        return message.channel.send('You need to mention a user to ban.');
      }
      
      // Get the member object
      const member = message.guild.members.cache.get(user.id);
      if (!member) {
        return message.channel.send('That user is not in this guild.');
      }
      
      // Check if the user is bannable
      if (!member.bannable) {
        return message.channel.send('I cannot ban this user.');
      }
      
      // Ban the user
      try {
        await member.ban();
        message.channel.send(`Successfully banned ${user.tag}`);
      } catch (error) {
        console.error(error);
        message.channel.send('There was an error trying to ban that user.');
      }
    }
    
    // Mute command
    if (command === 'mute') {
      // Check if the user has the necessary permissions
      if (!message.member.permissions.has('MODERATE_MEMBERS')) {
        return message.channel.send('You do not have permission to mute members.');
      }
      
      // Get the user to mute
      const user = message.mentions.users.first();
      if (!user) {
        return message.channel.send('You need to mention a user to mute.');
      }
      
      // Get the member object
      const member = message.guild.members.cache.get(user.id);
      if (!member) {
        return message.channel.send('That user is not in this guild.');
      }
      
      // Mute the user
      try {
        await member.timeout(60000); // Mute for 1 minute
        message.channel.send(`Successfully muted ${user.tag}`);
      } catch (error) {
        console.error(error);
        message.channel.send('There was an error trying to mute that user.');
      }
    }
    
    // Set welcome channel command
    if (command === 'setwelcome') {
      // Check if the user has the necessary permissions
      if (!message.member.permissions.has('MANAGE_CHANNELS')) {
        return message.channel.send('You do not have permission to set the welcome channel.');
      }
      
      // Get the channel
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.channel.send('You need to mention a channel to set as the welcome channel.');
      }
      
      // Store the welcome channel ID
      welcomeChannels.set(message.guild.id, channel.id);
      message.channel.send(`Welcome channel set to ${channel.name}`);
    }
    
    // Set moderator role command
    if (command === 'setmodrole') {
      // Check if the user has the necessary permissions
      if (!message.member.permissions.has('MANAGE_ROLES')) {
        return message.channel.send('You do not have permission to set the moderator role.');
      }
      
      // Get the role
      const role = message.mentions.roles.first();
      if (!role) {
        return message.channel.send('You need to mention a role to set as the moderator role.');
      }
      
      // Store the moderator role ID
      moderatorRoles.set(message.guild.id, role.id);
      message.channel.send(`Moderator role set to ${role.name}`);
    }
    
    // Help command
    if (command === 'help') {
      const helpEmbed = {
        color: 0x0099ff,
        title: 'orangeBOT Commands',
        description: 'Here are the available commands:',
        fields: [
          {
            name: '📊 Leveling',
            value: '`!level` - Check your current level and XP.',
            inline: false,
          },
          {
            name: '🛡️ Moderation',
            value: '`!kick <user>` - Kick a user from the server (requires kick permissions).\n`!ban <user>` - Ban a user from the server (requires ban permissions).\n`!mute <user>` - Mute a user for 1 minute (requires moderate members permissions).',
            inline: false,
          },
          {
            name: '⚙️ Configuration',
            value: '`!setwelcome <channel>` - Set the welcome channel (requires manage channels permissions).\n`!setmodrole <role>` - Set the moderator role (requires manage roles permissions).',
            inline: false,
          },
          {
            name: '📈 Information',
            value: '`!leaderboard` - Display the top 10 users by XP.\n`!info` - Display bot information.\n`!ping` - Display the bot\'s ping.\n`!uptime` - Display the bot\'s uptime.\n`!servercount` - Display the number of servers the bot is in.\n`!usercount` - Display the number of users the bot is serving.',
            inline: false,
          },
          {
            name: '🛠️ Utility',
            value: '`!resetxp` - Reset your XP to 0 (requires manage messages permissions).',
            inline: false,
          },
        ],
        timestamp: new Date(),
        footer: {
          text: 'orangeBOT',
        },
      };
      
      message.channel.send({ embeds: [helpEmbed] });
    }
    
    // Leaderboard command
    if (command === 'leaderboard') {
      // Convert map to array and sort by XP
      const sortedUsers = Array.from(userLevels.entries())
        .filter(([key, data]) => key.startsWith(`${message.guild.id}-`))
        .sort((a, b) => b[1].xp - a[1].xp)
        .slice(0, 10);
      
      if (sortedUsers.length === 0) {
        return message.channel.send('No users have earned XP yet!');
      }
      
      let leaderboard = '';
      for (let i = 0; i < sortedUsers.length; i++) {
        const [key, data] = sortedUsers[i];
        const userId = key.split('-')[1];
        const user = await client.users.fetch(userId);
        leaderboard += `${i + 1}. ${user.username} - Level ${data.level}, XP: ${data.xp}
`;
      }
      
      const leaderboardEmbed = {
        color: 0x0099ff,
        title: '🏆 Leaderboard',
        description: leaderboard,
        timestamp: new Date(),
        footer: {
          text: 'orangeBOT',
        },
      };
      
      message.channel.send({ embeds: [leaderboardEmbed] });
    }
    
    // Reset XP command
    if (command === 'resetxp') {
      // Check if the user has the necessary permissions
      if (!message.member.permissions.has('MANAGE_MESSAGES')) {
        return message.channel.send('You do not have permission to reset XP.');
      }
      
      const userId = message.author.id;
      const guildId = message.guild.id;
      const key = `${guildId}-${userId}`;
      
      if (userLevels.has(key)) {
        const userData = userLevels.get(key);
        userData.xp = 0;
        userData.level = 1;
        message.channel.send(`${message.author.username}, your XP has been reset.`);
      } else {
        message.channel.send(`${message.author.username}, you haven't earned any XP yet!`);
      }
    }
    
    // Uptime command
    if (command === 'uptime') {
      const uptime = Date.now() - startTime;
      const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((uptime / (1000 * 60)) % 60);
      const seconds = Math.floor((uptime / 1000) % 60);
      
      message.channel.send(`Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`);
    }
    
    // Info command
    if (command === 'info') {
      const uptime = Date.now() - startTime;
      const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((uptime / (1000 * 60)) % 60);
      const seconds = Math.floor((uptime / 1000) % 60);
      
      const infoEmbed = {
        color: 0x0099ff,
        title: '🤖 orangeBOT Information',
        fields: [
          {
            name: 'Version',
            value: `${version}`,
            inline: true,
          },
          {
            name: 'Uptime',
            value: `${days}d ${hours}h ${minutes}m ${seconds}s`,
            inline: true,
          },
          {
            name: 'Servers',
            value: `${client.guilds.cache.size}`,
            inline: true,
          },
          {
            name: 'Users',
            value: `${client.users.cache.size}`,
            inline: true,
          },
        ],
        timestamp: new Date(),
        footer: {
          text: 'orangeBOT',
        },
      };
      
      message.channel.send({ embeds: [infoEmbed] });
    }
    
    // Ping command
    if (command === 'ping') {
      const ping = client.ws.ping;
      message.channel.send(`Pong! Ping: ${ping}ms`);
    }
    
    // Server count command
    if (command === 'servercount') {
      const serverCount = client.guilds.cache.size;
      message.channel.send(`I am currently in ${serverCount} servers.`);
    }
    
    // User count command
    if (command === 'usercount') {
      const userCount = client.users.cache.size;
      message.channel.send(`I am currently serving ${userCount} users.`);
    }
  }
});

// Welcome message event
client.on('guildMemberAdd', (member) => {
  const guildId = member.guild.id;
  const channelId = welcomeChannels.get(guildId);
  
  if (channelId) {
    const channel = member.guild.channels.cache.get(channelId);
    if (channel) {
      channel.send(`Welcome to the server, ${member.user.username}!`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

