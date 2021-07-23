const Discord = require("discord.js");
const config = require("./config.json");
const ytdl = require("ytdl-core");
const ytSearch = require('yt-search');

const client = new Discord.Client();
const prefix = "!";

var queue = {}
var voiceclients = {}


client.on('ready', () => {
  console.info(`Logged in as ${client.user.tag}!`);
});


client.on('message', message => {
  if (message.content.startsWith(`${prefix}ping`)) {  
    ping(message);
    return;
  }else if (message.content.startsWith(`${prefix}join`)){
    join(message);
    return;
  }else if (message.content.startsWith(`${prefix}play`)){
    play(message);
    return;
  }else if (message.content.startsWith(`${prefix}np`)){
    now_playing(message);
    return;
  }else if (message.content.startsWith(`${prefix}queue`)){
    get_queue(message);
    return;
  }else if (message.content.startsWith(`${prefix}loop`)){
    loop(message);
    return;
  }else if (message.content.startsWith(`${prefix}volume`)){
    volume(message);
    return;
  }else if (message.content.startsWith(`${prefix}stop`)){
    stop(message);
    return;
  }else if (message.content.startsWith(`${prefix}pause`)){
    pause(message);
    return;
  }else if (message.content.startsWith(`${prefix}resume`)){
    resume(message);
    return;
  }
});

async function join(message){
  let voicechannel = message.member.voice.channel;
  let connection = await voicechannel.join()
    .catch(e => { console.log(e) });
  voiceclients[message.guild.id] = connection
}

function leave(message){
  let voicechannel = message.member.voice.channel;
  delete voiceclients[message.guild.id]
  return voicechannel.leave();
}

function ping(message){
  message.channel.send(`Hello rajesh here from tech support! Latency is ${Math.round(client.ws.ping)}ms`);
  return;
}

const video_finder = async (query) =>{
  const video_result = await ytSearch(query);
  return (video_result.videos.length > 1) ? video_result.videos[0] : null;
}

async function play(message){
  const query = message.content.replace(`${prefix}play`, '');
  const video = await video_finder(query);
  if (video){
    song = { title: video.title, url: video.url }
  } else {
    message.channel.send('kant find vidio');
  }
  let stream = ytdl(song.url, { filter: 'audioonly' });


  if (message.guild.id in queue){
    queue[message.guild.id].streams.push(stream)
    queue[message.guild.id].songs.push(song)
    message.channel.send(`Added to queue: ${song.title}`)
  }else{
    queue[message.guild.id] = {
      now_playing: song.title,
      streams: [stream],
      songs: [song],
      volume: 0.1,
      loop: false,
      dispatcher: null
    }
    check_queue(message)
  }
  
}

function check_queue(message){
  
  const connection = voiceclients[message.guild.id];
  message.channel.send(`Now Playing: ${queue[message.guild.id].songs[0].title}`)
  const dispatcher = connection.play(queue[message.guild.id].streams[0], {volume: queue[message.guild.id].volume})
  .on('finish', () => {
    if (queue[message.guild.id].loop === false){
    queue[message.guild.id].streams.shift()
    queue[message.guild.id].songs.shift()
    }else{
      let songurl = queue[message.guild.id].songs[0].url
      let stream = ytdl(songurl, { filter: 'audioonly' });
      queue[message.guild.id].streams[0] = stream
    }
    check_queue(message)
  })
  queue[message.guild.id].dispatcher = dispatcher;
  queue[message.guild.id].now_playing = queue[message.guild.id].songs[0].title
}

function now_playing(message){
  const now_playing = queue[message.guild.id].now_playing
  return message.channel.send(`Currently Playing: ${now_playing}`)
}

function get_queue(message){
  const q = queue[message.guild.id].songs
  const embed = new Discord.MessageEmbed()
  embed.setTitle("Queue")
  if (q.length < 25){
    for (const song in q){
      embed.addField(`${parseInt(song) + 1}`, `${q[song].title}`, false)
    }
  }
  message.channel.send(embed)
}

function loop(message){
  if (queue[message.guild.id].loop === false){
    queue[message.guild.id].loop = true
  }else{
    queue[message.guild.id].loop = false
  }
  return message.channel.send(`Loop toggled to ${queue[message.guild.id].loop}`)

}

function pause(message){
  let dispatcher = queue[message.guild.id].dispatcher
  dispatcher.pause();
}

function resume(message){
  let dispatcher = queue[message.guild.id].dispatcher
  dispatcher.resume();
}

function volume(message){
  let dispatcher = queue[message.guild.id].dispatcher
  let arg = message.content.replace(`${prefix}volume`, '')
  let vol = parseInt(arg)
  dispatcher.setVolume(vol / 100)
  return message.channel.send(`Volume set to ${dispatcher.getVolume() * 100}%`)

}

function stop(message){
  let dispatcher = queue[message.guild.id].dispatcher;
  dispatcher.destroy()
  return message.channel.send("Voice connection destroyed sucessfully!")
}

client.login(config.BOT_TOKEN);