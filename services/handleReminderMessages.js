// Import required libraries and modules
const { google } = require('googleapis');
var cron = require('node-cron');
const moment = require('moment');
const momentTz = require('moment-timezone');

// File of connection with meta
const Whatsapp = require('../connections/connectionMeta')

// File of connection with Google Calendar
const { auth, calendar, calendarId } = require('../connections/connectionGoogleCalendar');
let myevents = [];
let myEventsList = [];

// Define a function to retrieve upcoming events from Google Calendar and schedule reminder messages
async function scheduleReminderMessages() {
  myevents.forEach(event => {
    console.log("Event in reminder function",event);
  });
  console.log("myEventsList:", myEventsList);
  myEventsList.forEach(event => {
    console.log("Here is the loop for myevents", myevents)
    console.log("Number of events:", myEventsList.length);
    console.log("Event in reminder function2", event);
    let fromWithoutUTC = moment(event.start.dateTime);
    let offsetHours = parseInt(moment.parseZone(event.start.dateTime).utcOffset());
    if(offsetHours>0){
      offsetHours = offsetHours/60;
    }else if(offsetHours<0){
      offsetHours = (offsetHours*-1)/60;
      offsetHours = (offsetHours*-1);
    }
    let from = new Date(event.start.dateTime);
    let fromUTC = Date.UTC(from.getUTCFullYear(),from.getUTCMonth(), from.getUTCDate() , (from.getUTCHours()-offsetHours), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds());
    let now = new Date();
    let nowUTC = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate() , now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());

    let diffInMilliseconds = fromUTC - nowUTC;
    let diffInMinutes = diffInMilliseconds / 60000;
    console.log('UTC Offset', from.getUTCHours(),from.getHours(),from.getTimezoneOffset(),moment.parseZone(event.start.dateTime).utcOffset());
    console.log('fromUTC:', event.start.dateTime,fromWithoutUTC, new Date(fromUTC).toISOString());
    console.log('nowUTC:', now, new Date(nowUTC).toISOString());
    console.log('Difference in minutes:', diffInMinutes);
  
    if(parseInt(diffInMinutes)==120){
      // if(parseInt(diffInMinutes)==240){
      // extract phone number from the description
      const regex = /Telefoni|Telefono|Phone:\s*([+\d\s]*)/i;
      const match = event.description.match(regex);
      const recipientPhone = match ? match[1] : null;
      console.log("recipientPhone", recipientPhone);
      console.log("This is the event description in event reminder message", event.description)
      const recipientPrefix = recipientPhone.substring(0, 2); // Extract the prefix from the recipient's phone number
      let lang = 'en'; // Determine the language to be used based on the prefix // Default language is English
      if (recipientPrefix === '35') {
          lang = 'al'; // Albanian language
      } else if (recipientPrefix === '39') { 
          lang = 'it'; // Italian language
      }
      const langData = require(`../languages/${lang}.json`); // Load the appropriate language file

      //send notification
      Whatsapp.sendText({
        recipientPhone: recipientPhone,
        message: `${langData.remind_message_text}`
      });
    } 


    
    else if (parseInt(diffInMinutes) == -1440) {
      // else if (parseInt(diffInMinutes) == -1320) {
      // extract phone number from the description
      const regex = /Telefoni|Telefono|Phone:\s*([+\d\s]*)/i;
      const match = event.description.match(regex);
      const recipientPhone = match ? match[1] : null;
      console.log("recipientPhone", recipientPhone);

      const nameregex = /(?:Name|Emri|Nome):\s*([^(\n|$)]+)/i;
      const namematch = event.description.match(nameregex);
      const name = namematch ? namematch[1].trim() : null;
      console.log("Name:", name);

      console.log("This is the event description in event reminder message", event.description)
      const recipientPrefix = recipientPhone.substring(0, 2); // Extract the prefix from the recipient's phone number
      let lang = 'en'; // Determine the language to be used based on the prefix // Default language is English
      if (recipientPrefix === '35') {
          lang = 'al'; // Albanian language
      } else if (recipientPrefix === '39') { 
          lang = 'it'; // Italian language
      }
      const langData = require(`../languages/${lang}.json`); // Load the appropriate language file

      //send notification
      Whatsapp.sendText({
        recipientPhone: recipientPhone,
        message: `${langData.dear} ${name}, \n${langData.follow_up_message_to_client} \n${langData.regards_text}`
      });
    }
  });
}

async function processEvents(eventToProcess, type,eventToProcessID) {
  console.log(eventToProcess)
  if (type == 'insert') {
    console.log("Insertt");
    eventToProcess.id = eventToProcessID
    myEventsList.push(eventToProcess);
    console.log("Inserted myEventsList", myEventsList);
  } else if (type == 'delete') {
    console.log("Delete");
    const index = myEventsList.findIndex((event => event.id == eventToProcess.id));
    console.log('findIndex',index)
    console.log('myLEventsList',myEventsList)
    if (index > -1) {
      console.log('beforeDelete',myEventsList)
      myEventsList.splice(index, 1);
    }
    console.log("Deleted myEventsList", myEventsList);
  } else if (type == 'update') {
    console.log("Update");
    let index = myEventsList.findIndex((event => event.id == eventToProcessID));
    eventToProcess.id = eventToProcessID
    myEventsList[index] = eventToProcess;
    console.log("Updated myEventsList", myEventsList);
  }
}

async function initializeEvents() {
  const now = new Date();
  console.log('initialize events');
  const res = await calendar.events.list({
    calendarId: calendarId,
    timeMin: now.toISOString()
  });
  myEventsList = res.data.items;
  console.log("Hello this is the list of my events", myEventsList);
}

module.exports = {
  scheduleReminderMessages,
  processEvents, 
  initializeEvents
};
