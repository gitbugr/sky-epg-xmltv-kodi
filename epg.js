const Gist = require('gist.js');
const gist = Gist('846c041ad313a511e03cbe2ad8890329')
  .token('1ecaecc0cb80facd91cdf7484e1d117d64d5f023')

const builder = require('xmlbuilder');
const request = require('request');

var channels = {};
var programmeInfo = {};

var date = new Date().toISOString().split("T")[0];


function getChannels(){
  var headers = {
      'User-Agent': 'Super Agent/0.0.1',
      'Content-Type': 'application/x-www-form-urlencoded'
  }
  var options = {
      url: 'http://tv.sky.com/channel/index/4101-1',
      method: 'GET',
      headers: headers
  }
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var x = JSON.parse(body).init.channels;
      for(i=0;i<x.length;i++){
        channels[x[i].c[0]] = {title:x[i].lcn || x[i].t}
      }
      getProgrammeInfo(0,0);
    }
  });
}

function getProgrammeInfo(channelId, requestId){
  if(requestId==0){
    programmeInfo[Object.keys(channels)[channelId]] = [];
  }
  if(requestId<4){
    var headers = {
        'User-Agent': 'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    var options = {
        url: 'http://tv.sky.com/programme/channel/' + Object.keys(channels)[channelId] + '/' + date + '/'+requestId+'.json',
        method: 'GET',
        headers: headers
    };
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("[+] Adding "+channels[Object.keys(channels)[this.channelId]].title + ", Request: " + this.requestId);
        var listings = JSON.parse(body).listings[Object.keys(channels)[this.channelId]];
        for(j=0;j<listings.length;j++){
          programmeInfo[Object.keys(channels)[this.channelId]].push({
            startTime: dateTimeFormatXMLTV(new Date(listings[j].s * 1000)),
            endTime: dateTimeFormatXMLTV(new Date(new Date(listings[j].s * 1000).getTime() + (listings[j].m[1] / 60) * 60000)),
            runTime: listings[j].m[1] / 60,
            title: listings[j].t,
            description: listings[j].d
          });
        }
        getProgrammeInfo(this.channelId, this.requestId+1);
      }
    }.bind({channelId:channelId, requestId:requestId}));
  }
  else if(channelId+1<Object.keys(channels).length){
    getProgrammeInfo(channelId+1, 0);
  }
  else{
    console.log("[+] Creating XML File");
    createXMLTVfile();
  }
}

function dateTimeFormatXMLTV(date){
  var yearS = date.getFullYear().toString();
  var monthS= (date.getMonth()<10?"0"+date.getMonth():date.getMonth().toString());
  var dateS = (date.getDate()<10?"0"+date.getDate():date.getDate().toString());
  var hoursS = (date.getHours()<10?"0"+date.getHours():date.getHours().toString());
  var minutesS = (date.getMinutes()<10?"0"+date.getMinutes():date.getMinutes().toString());
  var secondsS = (date.getSeconds()<10?"0"+date.getSeconds():date.getSeconds().toString());
  return(yearS+monthS+dateS+hoursS+minutesS+secondsS+" +0000");
}

function createXMLTVfile(){
  var xml = builder.create('tv', {updated:new Date()});
  for(i=0;i<Object.keys(channels).length;i++){
    xml.ele('channel', {'id': channels[Object.keys(channels)[i]].title || 0})
      .ele('display-name', channels[Object.keys(channels)[i]].title);
  }
  for(i=0;i<Object.keys(programmeInfo).length;i++){
    for(j=0;j<programmeInfo[Object.keys(programmeInfo)[i]].length;j++){
      var pr = xml.ele('programme', {
        start:programmeInfo[Object.keys(programmeInfo)[i]][j].startTime,
        stop:programmeInfo[Object.keys(programmeInfo)[i]][j].endTime,
        channel:channels[Object.keys(programmeInfo)[i]].title,
      });
      pr.ele('title', {
        lang:"en"
      }, programmeInfo[Object.keys(programmeInfo)[i]][j].title);
      pr.ele('desc', {
        lang:"en"
      }, programmeInfo[Object.keys(programmeInfo)[i]][j].description);
    }
  }
  console.log("[+] Uploading to Gist");
  gist.file('epg.xml')
    .write(xml.end({pretty:true}));
  gist.save(function(err, json) {
  console.log("[+] ----------------");
  console.log("[+] ----: DONE :----");
  console.log("[+] ----------------");
})
}
console.log("[START]: "+new Date().toISOString().split("T")[0]);
console.log(" ");
try{
  date = new Date().toISOString().split("T")[0];
  getChannels();
  console.log("[+] UPDATING @ "+new Date());
}
catch(err){
  console.log("[ERROR]");
}

setInterval(function(){
  try{
    date = new Date().toISOString().split("T")[0];
    getChannels();
    setTimeout(function(){
    createXMLTVfile();},30000);
    console.log("[+]"+new Date());
  }
  catch(err){
    console.log("[ERROR]");
  }
}, 10800000);
