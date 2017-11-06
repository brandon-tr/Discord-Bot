const Discord = require('discord.js');
const client = new Discord.Client();
const Crawler = require("crawler");
var owjs = require('overwatch-js');
const Pageres = require('pageres');
var fs = require('fs');
var request = require('request');


var c = new Crawler({
    maxConnections : 25,
    // This will be called for each crawled page 
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
        }
        done();
    }
});

const curseWords = ['fuck', 'shit', 'fu-ck', 'nigger', 'nig-ger']

client.on('ready', () => {
  console.log('I am ready!');
});
 
client.on('message', message => {
    if(message.content.includes('!wow')) {
        var server = message.content.split(' ')[1];
        var character = message.content.split(' ')[2]
        c.queue([{
            uri: 'https://worldofwarcraft.com/en-us/character/'+server+'/'+character,
            retries: 0,
            jQuery: true,

            callback: function (error, res, done) {
                if(error){
                    message.reply('Invalid Url')
                }else if(res.statusCode === 404) {
                    message.reply('Invalid Page')
                }else {
                    var character = new Discord.RichEmbed({image:res.$("a[class='Link Link--text']").attr('href')})
                    message.reply('Character is  ' + res.$("title").text())
                    message.reply(res.$("body [class='Link CharacterHeader-ilvl']").text())
                    message.reply(res.$("body [class='CharacterHeader-detail']").text())
                    message.reply(character.image)
                }
                done();
            }
        }]);
    }
    if(message.content.includes('!league')) {
        var character = message.content.split(' ')[1]
        c.queue([{
            uri: 'http://na.op.gg/summoner/userName='+character,
            retries: 0,
            jQuery: true,
            jQuery: {
                name: 'cheerio',
                options: {
                    normalizeWhitespace: true,
                }
            },

            callback: function (error, res, done) {
                if(error){
                    message.reply('Invalid Url')
                }else if(res.statusCode === 404) {
                    message.reply('Invalid Page')
                }else {
                //    message.reply(res.$('title').text())
                //    message.reply('Wins and Losses'+'\n'+res.$("body [class='WinRatioTitle']").text())
                //    var test = res.$("td [class='KDA']").contents().text()
                //    test = test.split('KDA')[3]
                //    message.reply('KDA' + test)
                //    message.reply(res.$("span[class='tierRank']").text())
                const pageres = new Pageres({delay: 0})
                .src(this.uri, ['640x480'])
                .dest(__dirname)
                .run()
                .then(() => 
                        message.reply({
                            file: __dirname+ `/na.op.gg!summoner!userName=${character}`+'-640x480.png'
                        })
                        .then(
                            setTimeout(function(){
                                fs.unlink(__dirname+ `/na.op.gg!summoner!userName=${character}`+'-640x480.png')
                            }, 500) 
                        )
                    )
                }
                done();
            }
        }]);
    }
    if(message.content.includes('!overwatch')) {
        var playerName = message.content.split(' ')[1]
        var platform;
        var region;
        var name;
        owjs.search(playerName).then((data) => {
            for (var index = 0; index < data.length; index++) {
                platform = data[index].platform
                region = data[index].region
                name = data[index].careerLink
                name = name.split('/')[4]
            }
            c.queue([{
                uri: `https://overwatchtracker.com/profile/${platform}/${region}/${name}`,
                retries: 0,
                jQuery: true,
                jQuery: {
                    name: 'cheerio',
                    options: {
                        normalizeWhitespace: true,
                        xmlMode: true
                    }
                },
                callback: function (error, res, done) {
                    if(error){
                        message.reply('Invalid Url')
                    }else if(res.statusCode === 404) {
                        message.reply('Invalid Page')
                    }else {
                       message.reply(res.$("div[class='profile-info']").text().trim())
                       message.reply(res.$("div[class='stats-large']").text().trim())
                    }
                    done();
                }
            }]);
        })
    }
    if(message.content.includes('!bot')) {
        var content = message.content.split('!bot ')[1];
        request('http://www.cleverbot.com/getreply?key=CC4viggn6cxF07Ccm7uCzxPnHXQ&input='+content, function (error, response, body) {
            var output = JSON.parse(body)
            message.reply(output.output)
        })
    }
    for (var index = 0; index < curseWords.length; index++) {
            if(message.content.includes(curseWords[index])) {
                message.delete()
                .then(msg => msg.reply(`That type of language is not allowed`))
            }
        }
    });
client.on('guildMemberAdd', member => {
    member.guild.defaultChannel.send(`Welcome ${member}`)
})

 
client.login('MzY2MzY1NTgzODM2NDQ2NzMx.DLxVXA.vNMgonLH364IRiJhpTfx4NAYVxg');