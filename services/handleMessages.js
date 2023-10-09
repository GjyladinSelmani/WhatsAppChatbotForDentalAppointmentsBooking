const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
const axios = require('axios');
const { processEvents } = require('./handleReminderMessages');

// File of connection with meta
const Whatsapp = require('../connections/connectionMeta')

// First Message Function
async function handleIncomingTextMessage({ recipientPhone, recipientName, langData }) {
  await Whatsapp.sendSimpleButtons({
    message: `${langData.dear} *${recipientName}*, \n${langData.welcome_message}`,
    recipientPhone: recipientPhone,
    listOfButtons: [
      {
        title: langData.button_title_set_a_dental_appointment,
        id: 'view_services',
      },
      {
        title: langData.button_title_view_our_location,
        id: 'view_our_location',
      },
      {
        title: 'Raport Personal',
        id: 'speak_to_human',
      },
    ],
  });
}

// Speak to a Human Function
async function handleSpeakToHuman(recipientPhone, langData) {
  await Whatsapp.sendText({
      recipientPhone: recipientPhone,
      message: `${langData.speak_to_a_human_text}`,
  });
  await Whatsapp.sendContact({
      recipientPhone: recipientPhone,
      contact_profile: {
          addresses: [
              {
                  city: 'Albania',
                  country: 'Albania',
              },
          ],
          name: {
              first_name: 'Doctor',
              last_name: 'Name',
          },
          org: {
              company: 'Dental Clinic Name',
          },
          phones: [
              {
                  phone: '+355 12 345 6789',
              },
          ],
      },
  });
}

// Buttons with options after selecting the dental service
async function handleServiceSelection(recipientPhone, langData, incomingMessage) {
  await Whatsapp.sendSimpleButtons({
    message: `${langData.selected_service}\n*${incomingMessage.list_reply.title}*\n\n${langData.selected_service_body}`,
    recipientPhone: recipientPhone,
    listOfButtons: [
      {
        title: langData.button_title_set_time,
        id: 'set_appointment',
      },
      {
        title: langData.button_title_speak_to_a_human,
        id: 'speak_to_human',
      },
      {
        title: langData.button_title_view_our_location,
        id: 'view_our_location',
      },
    ],
  });
}

// Reschedule Event Function
function handleRescheduleTextMessage(langData, recipientName, recipientPhone, personalEvent) {
  const description = personalEvent[0].description;

  // Regular expression for date in different languages
  const dateRegex = /Date: (\d{1,2} \w+ \d{4})|Data: (\d{1,2} de \w+ de \d{4})|Data: (\d{1,2} \w+ \d{4})/;
  const timeRegex = /Time: (.+)|Koha: (.+)|Tempo: (.+)/;
  const appointmentTypeRegex = /Appointment Type: (.+)|Tipo di appuntamento: (.+)|Lloji I Takimit: (.+)/;

  // Extracting date
  let date = '';
  const match = personalEvent[0].description.match(dateRegex);
  if (match) {
    date = match[1] || match[2] || match[3];
  }

  // Extracting appointment type
  let time = '';
  const timeMatch = personalEvent[0].description.match(timeRegex);
  if (timeMatch) {
    time = timeMatch[1] || timeMatch[2] || timeMatch[3];
    time = time.replace(/(2023|023)/, '');
  }

  // Extracting appointment type
  let appointmentType = '';
  const appointmentTypeMatch = personalEvent[0].description.match(appointmentTypeRegex);
  if (appointmentTypeMatch) {
    appointmentType = appointmentTypeMatch[1] || appointmentTypeMatch[2] || appointmentTypeMatch[3];
  }

  Whatsapp.sendSimpleButtons({
    message: `${langData.dear} *${recipientName}*, \n*${langData.already_have_appointment}*\n\n*${langData.name}* ${recipientName}\n*${langData.phone}* ${recipientPhone}\n*${langData.appointment_type}* ${appointmentType}\n\n📅 *${langData.date}* ${date}\n⏱ *${langData.time}* ${time}\n📍 *${langData.location}* TIRANE`,
    recipientPhone: recipientPhone,
    listOfButtons: [
      {
        title: langData.reschedule_appointment,
        id: 'view_services_reschedule',
      },
      {
        title: langData.cancel_appointment,
        id: 'cancel_appointment',
      },
    ],
  });
}

// Delete an event Function
function deletePersonalEvent(calendar, auth, calendarId, recipientPhone, langData, adminNumber) {
  const now = new Date();
  const minTime = now.toISOString();
  calendar.events.list({
    calendarId: calendarId,
    q: recipientPhone,
    timeMin: minTime
  }, (err, res) => {
    if (err) return console.error('The API returned an error:', err.message);
    const personalEvents = res.data.items;
    if (personalEvents.length === 0) {
      console.log("No relevant events found.");
      return;
    }

    personalEvents.forEach(event => {
      const eventId = event.id;
      calendar.events.delete({
        auth: auth,
        calendarId: calendarId,
        eventId: eventId
      }, (err) => {
        if (err) {
          console.error('Error deleting event:', err);
        } else {
          processEvents(event, 'delete');
          const messageBody = `${langData.admin_appointment_canceled_text} ${recipientPhone}.\n\n${event.description}`;
          const data = JSON.stringify({
              "messaging_product": "whatsapp",
              "preview_url": false,
              "recipient_type": "individual",
              "to": adminNumber,
              "type": "text",
              "text": {
                  "body": messageBody
              }
          });

          const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://graph.facebook.com/v17.0/117553451225848/messages',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': 'Bearer EAAJGS89SuJoBO1iBnDkNuJegTf8zrNdPFEMZCRTi8yYynIZBMYsVded7HiMEPAHJrkMZC8MZBCZB2zTbzKpTxnntopcPWRjbxFgbWNnJUEJZBMNUt94KT6dtXUcIRVAZA0mOEQfCbDJOOn2OHkEdbxHRyUvpwOdArDz3XZCCCuoZAUhKcQSN7ZBn06CsDJJLyGXLZAeFMqhEsyV1RsF'
            },
            data: data
        };

          try {
            axios.request(config);
          } catch (error) {
            console.log(error);
          }
          Whatsapp.sendText({
            recipientPhone: recipientPhone,
            message: `*${langData.cancelled_appointment_text}*`
          });
        }
      });
    });
  });
}

// Function where Admin deletes the event of the client and sends a message to that client to inform that his event is canceled
function deleteEvent(calendar, auth, langData, calendarId, adminNumber, eventId) {
  calendar.events.get({
    auth: auth,
    calendarId: calendarId,
    eventId: eventId
  }, (err, res) => {
    if (err) return console.error('The API returned an error:', err.message);
    const event = res.data;
    const phoneNumberRegex = /Phone:\s*(\d+)/;
    const match = phoneNumberRegex.exec(event.description);
    let clientPhoneNumber

    if(match){
      clientPhoneNumber = match[1]

      calendar.events.delete({
        auth: auth,
        calendarId: calendarId,
        eventId: eventId
      }, (err) => {
        if (err) {
          console.error('Error deleting event:', err);
        } else {
          processEvents(event, 'delete');
        }
      });
  
      //  Send message
      Whatsapp.sendText({
        recipientPhone: clientPhoneNumber,
        message: `${langData.client_message_admin_canceled_appointment}`
      });
    }else{
      Whatsapp.sendText({
        recipientPhone: adminNumber,
        message: "This number does not exists"
      });
    }

  });
}

// Function where admin writes message to client after the client creates an event
function adminMessagesClient(calendar, auth, langData, calendarId, eventId, incomingMessage, adminNumber){
  // Get the event that matches with the event ID
  calendar.events.get({
    auth: auth,
    calendarId: calendarId,
    eventId: eventId
  }, (err, res) => {
    if (err) return console.error('The API returned an error:', err.message);

    // From the event get only the phone number
    const event = res.data;
    // const phoneNumberRegex = /Phone:\s*(\d+)/;
    const phoneNumberRegex = /(?:Phone|Telefoni|Telefono):\s*(\d+)/i;
    const match = phoneNumberRegex.exec(event.description);
    const clientPhoneNumber = match ? match[1] : null;

    //  Send the message to client
    Whatsapp.sendText({
      recipientPhone: clientPhoneNumber,
      message: `${langData.message_from_admin}` + incomingMessage + `\n\n\n${langData.do_not_reply}`
    });

    //  Send confiramtion to admin that message has been sent
    Whatsapp.sendText({
      recipientPhone: adminNumber,
      message: `${langData.message_sent_successfully}`
    });
  });
}

async function seeAllEvents(calendar, calendarId, recipientPhone) {
  return new Promise((resolve, reject) => {
    const eventArray = []; // Array variable to store events
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    calendar.events.list(
      {
        calendarId: calendarId,
        q: recipientPhone,
      },
      (err, res) => {
        if (err) {
          console.error('Error retrieving events:', err);
          reject(err);
          return;
        }
        const events = res.data.items;

        events.forEach((event) => {
          const description = event.description;
          const lines = description.split('\n');

          // Extract relevant details from each event
          const dateLine = lines.find((line) => line.includes('Date:') || line.includes('Data:') || line.includes('Data:'));
          const timeLine = lines.find((line) => line.includes('Time:') || line.includes('Koha:') || line.includes('Tempo:'));
          const appointmentTypeLine = lines.find((line) => line.includes('Appointment Type:') || line.includes('Lloji I Takimit:') || line.includes('Tipo di appuntamento:'));

          const date = dateLine ? dateLine.split(': ')[1].trim() : '';
          // const time = timeLine ? timeLine.split(': ')[1].trim().replace('2023 ', '') : ''; // Extract time portion and remove prefix
          const time = timeLine ? timeLine.split(': ')[1].trim().replace(/2023|023/g, '') : '';

          const appointmentType = appointmentTypeLine ? appointmentTypeLine.split(': ')[1].trim() : '';

          const formattedEventDetails = `${date},` +
            `${time},\n` +
            `${appointmentType}\n`+
            `---\n\n`; // Add an extra newline character

          eventArray.push(formattedEventDetails);
        });
        const formattedEventArray = eventArray.join('\n'); // Join events with a single newline character
        console.log('Past events:', formattedEventArray);
        resolve(eventArray);
      }
    );
  });
}

async function getAllEventsForAdmin(calendar, calendarId) {
  return new Promise((resolve, reject) => {
    calendar.events.list(
      {
        calendarId: calendarId,
      },
      (err, res) => {
        if (err) {
          console.error('Error retrieving events:', err);
          reject(err);
          return;
        }
        const events = res.data.items;
        const descriptions = events.map(event => event.description);
        console.log('Descriptions:', descriptions);
        resolve(events);
      }
    );
  });
}

// New Functions:
// Function to Get Daily Events:
async function getDailyEvents(calendar, calendarId, date) {
  const events = await getAllEventsForAdmin(calendar, calendarId);
  const dailyEvents = events.filter(event => {
    const eventDate = new Date(event.start.dateTime).toISOString().slice(0, 10);
    return eventDate === date;
  });
  return dailyEvents;
}

// Function to Get Weekly Events:
async function getWeeklyEvents(calendar, calendarId, startDate, endDate) {
  const events = await getAllEventsForAdmin(calendar, calendarId);
  const weeklyEvents = events.filter(event => {
    const eventDate = new Date(event.start.dateTime).toISOString().slice(0, 10);
    return eventDate >= startDate && eventDate <= endDate;
  });
  return weeklyEvents;
}

// Function to Get Monthly Events:
async function getMonthlyEvents(calendar, calendarId, month, year) {
  const events = await getAllEventsForAdmin(calendar, calendarId);
  const monthlyEvents = events.filter(event => {
    const eventDate = new Date(event.start.dateTime);
    return eventDate.getMonth() === month && eventDate.getFullYear() === year;
  });
  return monthlyEvents;
}

// Function to format a date to 'YYYY-MM-DD' format
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
  
}

// Function to get the Range dates events
async function getEventsInRange(calendar, calendarId, startRangeDate, endRangeDate) {
  const events = await getAllEventsForAdmin(calendar, calendarId);
  const eventsInRange = events.filter(event => {
    const eventDate = new Date(event.start.dateTime).toISOString().slice(0, 10);
    return eventDate >= startRangeDate && eventDate <= endRangeDate;
  });
  return eventsInRange;
}

// Function confirmation appointment message to user
function confirmationAppointmentMessage(calendar, auth, calendarId, langData, recipientName, recipientPhone) {
  const now = new Date();
  const minTime = now.toISOString();

  calendar.events.list({
    auth: auth,
    calendarId: calendarId,
    q: recipientPhone,
    timeMin: minTime
  }, (err, res) => {
    if (err) {
      console.error('The API returned an error:', err.message);
      return;
    }
    const personalEvent = res.data.items;
    if (personalEvent && personalEvent.length > 0) {
      const description = personalEvent[0].description;

      // Regular expression for date in different languages
      const dateRegex = /Date: (\d{1,2} \w+ \d{4})|Data: (\d{1,2} de \w+ de \d{4})|Data: (\d{1,2} \w+ \d{4})/;
      const timeRegex = /Time: (.+)|Koha: (.+)|Tempo: (.+)/;
      const appointmentTypeRegex = /Appointment Type: (.+)|Tipo di appuntamento: (.+)|Lloji I Takimit: (.+)/;

      // Extracting date
      let date = '';
      const match = personalEvent[0].description.match(dateRegex);
      if (match) {
        date = match[1] || match[2] || match[3];
      }

      // Extracting time
      let time = '';
      const timeMatch = personalEvent[0].description.match(timeRegex);
      if (timeMatch) {
        time = timeMatch[1] || timeMatch[2] || timeMatch[3];
        time = time.replace(/(2023|023)/, '');
      }

      // Extracting appointment type
      let appointmentType = '';
      const appointmentTypeMatch = personalEvent[0].description.match(appointmentTypeRegex);
      if (appointmentTypeMatch) {
        appointmentType = appointmentTypeMatch[1] || appointmentTypeMatch[2] || appointmentTypeMatch[3];
      }

      Whatsapp.sendText({
        recipientPhone: recipientPhone,
        // message: `${langData.appointment_has_been_set}.\n\n*${langData.name}* ${recipientName}\n*${langData.phone}* ${recipientPhone}\n\n${description}\n\n📅 *${langData.date}* ${hourDate.slice(0, 2)} ${monthDate}\n⏱ *${langData.time}* ${hourDate.slice(-12)}\n📍 *${langData.location}*  TIRANE: 200 metra mbi Restorant “Fresku”, Tirane`
         message: `${langData.appointment_has_been_set}.\n\n*${langData.name}* ${recipientName}\n*${langData.phone}* ${recipientPhone}\n*${langData.appointment_type}* ${appointmentType}\n\n📅 *${langData.date}* ${date}\n⏱ *${langData.time}* ${time}\n📍 *${langData.location}* TIRANE`
      });
    }
  });
}

module.exports = {
  handleIncomingTextMessage,
  handleSpeakToHuman,
  handleServiceSelection,
  handleRescheduleTextMessage,
  deletePersonalEvent,
  deleteEvent,
  adminMessagesClient,
  seeAllEvents,
  getAllEventsForAdmin,
  getDailyEvents,
  getWeeklyEvents,
  getMonthlyEvents,
  formatDate,
  getEventsInRange,
  confirmationAppointmentMessage
};