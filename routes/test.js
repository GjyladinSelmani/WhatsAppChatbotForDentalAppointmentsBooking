'use strict';
const router = require('express').Router();
const moment = require('moment');
const momentTz = require('moment-timezone')
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const pdfMake = require('pdfmake');
const SendRadioButton = require('./../helper/sendRadioButton')
var cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
// File of connection with meta
const Whatsapp = require('../connectionMeta')

// File of connection with Google Calendar
const { auth, calendar, calendarId } = require('../connectionGoogleCalendar');

// Files with Functions
const EcommerceStore = require('./../utils/ecommerce_store.js');
const handleMessages = require('../services/handleMessages');
const handleTime = require('../services/handleTime');
const { handleServices } = require('../services/handleServices');
const { demoPDF } = require('../services/generatePDF');
const { appointmentsReport } = require('../services/generateReport');

const file_path = './invoice.pdf'
// Trying the schedule reminder code:
const schedule = require('node-schedule');
const { scheduleReminderMessages, processEvents, initializeEvents } = require('../services/handleReminderMessages');

router.get("/", function (req, res) {
  res.send("<html><body><h1>Hello World!</h1><p>Click <a href='https://wa.me/355698134463'>here</a> to open WhatsApp</p></body></html>");
});

let appointment_type = null;
let monthDate = null;
let dayDate = null;
let hourDate = null;
let allData = []
let Store = new EcommerceStore();
const CustomerSession = new Map();
let reschedule = false;
let msgToClient = false;
let admin_report_start_range_date = false;
let admin_report_end_range_date = false;
let startRangeDate = '';
let endRangeDate = '';
let currentEventId = ''; // Declare a variable to store the event ID
let allIncomingMessages = [];
// Get the current date
const currentDate = new Date();
const eventArray = []; // Array variable to store events
const allEventLists = [];

// Add one day
currentDate.setDate(currentDate.getDate() + 1);

// Format the date to the desired format
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`;

const job = cron.schedule('* * * * *', () => {
   scheduleReminderMessages();
});

initializeEvents();

router.get('/meta_wa_callbackurl', async (req, res) => {
    try {
        console.log('GET: Someone is pinging me!');

        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];
        console.log(process.env.Meta_WA_VerifyToken)
        return res.status(200).send(challenge);
        if (
            mode &&
            token &&
            mode == 'subscribe' &&
            process.env.Meta_WA_VerifyToken == token
        ) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.error({error})
        return res.sendStatus(500);
    }
});

// Function for saving an appointment
async function saveAppointment(recipientName, recipientPhone, appointment_type, appointmentDate, note){
    let data = JSON.stringify({
    "user": {
        "name": recipientName,
        "phone": recipientPhone,
        "email": "null",
        "address": "null"
    },
    "date": appointmentDate,
    "notes": note
    });
    let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://dentalleadsapi-d4zg8.ondigitalocean.app/appointments',
    headers: { 
        'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGluaWMiOnsiX2lkIjoiNjQ2YzlkZjMxODE4NDVkNTY2MTU3ZDcwIiwibmFtZSI6IlRlc3QgQ2xpbmljIiwicGhvbmUiOiIzODk3MTQyMzgzOSIsImVtYWlsIjoidGVzdGNsaW5pY0BtYWlsLmNvbSIsImFkZHJlc3MiOiJUZXN0IENsaW5pYyBUZXN0U3RyZWV0IEFwMSIsImNyZWF0ZWRBdCI6IjIwMjMtMDUtMjNUMTE6MDU6MjMuODIxWiIsInVwZGF0ZWRBdCI6IjIwMjMtMDUtMjNUMTE6MDU6MjMuODIxWiIsIl9fdiI6MH0sImlhdCI6MTY4NDgzOTkzOX0.kFV6ECwGJeuK7tUzJG8bNKDLqgp5Hmt--Kr7sPZwwGc', 
        'Content-Type': 'application/json'
    },
    data : data
    };
    axios.request(config)
    .then((response) => {
    console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
    console.log(error);
    });
}
// Function for saving message logs
async function saveAllMessages(recipientName, recipientPhone, incomingMessage) {
    let allMessages = null;
    if (incomingMessage.text && (incomingMessage.text.body != undefined || incomingMessage.text.body > 0)) {
        allMessages = incomingMessage.text.body;
    } else if (incomingMessage.button_reply && (incomingMessage.button_reply.title != undefined || incomingMessage.button_reply.title > 0)) {
        allMessages = incomingMessage.button_reply.title;
    } else if (incomingMessage.list_reply && (incomingMessage.list_reply.id != undefined || incomingMessage.list_reply.id > 0)) {
        allMessages = incomingMessage.list_reply.id;
    }
    const payload = {
      tel: recipientPhone,
      name: recipientName,
      message: allMessages
    };
    try {
      const response = await axios.post('https://mangosoft.mk/api/saveMsg', payload);
      console.log(JSON.stringify(response.data));
    } catch (error) {
      console.log("Error:", error);
    }
}

// Importing the OpenAI API
const openai = require('openai');
// OpenAI API key - from TDB
openai.api_key = "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";
router.post('/meta_wa_callbackurl', async (req, res) => {
    try {
        let data = Whatsapp.parseMessage(req.body);
        if (data?.isMessage) {
            let incomingMessage = data.message;
            let recipientPhone = incomingMessage.from.phone; // extract the phone number of sender
            let recipientName = incomingMessage.from.name; // extract the phone number of sender
            let typeOfMsg = incomingMessage.type; // extract the type of message (some are text, others are images, others are responses to buttons etc...)
            let message_id = incomingMessage.message_id; // extract the message id
            allData[recipientPhone] = {
                monthDate : '',
                dayDate : '',
                hourDate : '',
                appointment_type : ''
            } 
            const recipientPrefix = recipientPhone.substring(0, 2); // Extract the prefix from the recipient's phone number
            // const adminNumber = "38971423838";  // Admin Number
            const adminNumber = "355693943528";  // Admin - Doctor Number
            let lang = 'en'; // Determine the language to be used based on the prefix // Default language is English
            if (recipientPrefix === '35') {
                lang = 'al'; // Albanian language
            } else if (recipientPrefix === '39') { 
                lang = 'it'; // Italian language
            }
            const langData = require(`../languages/${lang}.json`); // Load the appropriate language file
            
            // handleMessages.seeAllEvents(calendar, calendarId, recipientPhone, eventArray)
            // Set the minimum time to the current time
            const now = new Date();
            const minTime = now.toISOString();
            let personalEvent = null;
            let personalListEvents = null;

            // Calling the google calendar events list
            calendar.events.list({
                calendarId: calendarId,
                q: recipientPhone, // This filters events with the given phone number in any text field
                timeMin: minTime
            }, (err, res) => {
                if (err) return console.error('The API returned an error:', err.message);
                personalEvent = res.data.items;
                console.log("personalEvents", personalEvent)

                // Entering the first message
                if (typeOfMsg === 'text_message' && msgToClient == false) {
                    if (personalEvent && personalEvent.length > 0) {
                        // If there is already an existing event
                        const description = personalEvent[0].description;
                        handleMessages.handleRescheduleTextMessage(langData, recipientName, recipientPhone, personalEvent);
                    } 

                    // Part that is used by admin to start a chat
                    // else if (recipientPhone == adminNumber && admin_report_start_range_date == false && admin_report_end_range_date == false) {
                    //     let listOfSections = [
                    //         {
                    //             title: `Generate Report`.substring(0,24),
                    //             rows: [
                    //                 {
                    //                     id: `get_daily_events`.substring(0,256),
                    //                     title: `Daily Report:`.substring(0,21),
                    //                     description: `This report summarizes the appointments for a specific day`.substring(0,68),
                    //                 },
                    //                 {
                    //                     id: `get_weekly_events`.substring(0,256),
                    //                     title: `Weekly Report:`.substring(0,21),
                    //                     description: `This report provides an overview of the week's appointments`.substring(0,68),
                    //                 },
                    //                 {
                    //                     id: `get_monthly_events`.substring(0,256),
                    //                     title: `Monthly Report:`.substring(0,21),
                    //                     description: `This report presents a comprehensive analysis of the month's appts`.substring(0,68),
                    //                 },
                    //                 {
                    //                     id: `get_custom_date_events`.substring(0,256),
                    //                     title: `Custom Date Range`.substring(0,21),
                    //                     description: `Specify a specific range of dates to generate a report`.substring(0,68),
                    //                 },
                    //             ]
                    //         },
                    //     ];
                    //     let headerText = `Generate Report`;
                    //     let bodyText = `Generate report that summarizes the appointments for a specific day or period of time, including the number of appointments scheduled, the types of procedures performed.`;
                    //     let footerText = 'Powered by: DentLeads.com';
                    //     let buttonText = `Generate`;
                    
                    //     SendRadioButton.sendRadioButton({
                    //         recipientPhone,
                    //         headerText,
                    //         bodyText,
                    //         footerText,
                    //         listOfSections,
                    //         buttonText
                    //     });
                    // } 
                    else if (recipientPhone == adminNumber && admin_report_start_range_date == true){
                        startRangeDate = incomingMessage.text.body;
                        Whatsapp.sendText({
                            recipientPhone: adminNumber,
                            message: `Enter end date \n(YYYY-MM-DD format) \n\nExample: 2023-06-01`,
                        });
                        admin_report_start_range_date = false;
                        admin_report_end_range_date = true;
                    }
                    // Admin Enters the End Date for Range Dates PDF Generate and the PDF is Generated
                    else if (recipientPhone == adminNumber && admin_report_end_range_date == true) {
                        endRangeDate = incomingMessage.text.body;
                        handleMessages.getEventsInRange(calendar, calendarId, startRangeDate, endRangeDate)
                        .then(events => {
                            const descriptions = events.map(event => event.description);
                            return appointmentsReport(events, descriptions);
                        })
                        .then(() => {
                            Whatsapp.sendDocument({
                                recipientPhone: recipientPhone,
                                caption: `Keol Dent Report PDF`,
                                file_path: 'pdf-folder/report.pdf',
                            });
                        })
                        .catch(error => {
                            console.error("Error generating PDF:", error);
                        });
                        admin_report_end_range_date = false;
                    }
                    else {
                        // To set up new event
                        handleMessages.handleIncomingTextMessage({ recipientPhone, recipientName, langData });
                        const imageFilePath = './assets/koelDentLogo.png';
                        const imageBanner = './assets/dentBanner.png'
                        const pdfFilePath = `./dent_${recipientName}.pdf`;
                        Store.generatePDF({
                            patient_name: incomingMessage.from.name,
                            patient_phone: incomingMessage.from.phone,
                            file_path: pdfFilePath,
                            image_path: imageFilePath,
                            image_banner: imageBanner,
                        });
                    }
                }
                if (typeOfMsg === 'text_message' && msgToClient == true){
                    handleMessages.adminMessagesClient(calendar, auth, langData, calendarId, currentEventId, incomingMessage.text.body, adminNumber);
                    msgToClient = false;
                } 
            });
            // Starting the chat with bot
            if (typeOfMsg === 'simple_button_message') {
                let button_id = incomingMessage.button_reply.id;
                moment.locale('en') // set default to english
                if (recipientPrefix === '35') {
                    moment.locale('sq'); // set locale to albanian
                } else if (recipientPrefix === '39') {
                    moment.locale('it'); // set locale to italian
                }

                // Speak To Human Part
                if (button_id === 'speak_to_human') {
                    const eventArray = await handleMessages.seeAllEvents(calendar, calendarId, recipientPhone);
                    console.log("at index list of events is: ", eventArray);
                    // Generate the PDF invoice
                    // await demoPDF({ recipientPhone, recipientName, langData, eventArray });
                    // await handleMessages.handleSpeakToHuman(recipientPhone, langData);
                    
                    await demoPDF({ recipientPhone, recipientName, langData, eventArray });

                    // calendar.events.list({
                    //     calendarId: calendarId,
                    //     q: recipientPhone, // This filters events with the given phone number in any text field
                    //     timeMin: new Date().toISOString(),
                    // }, (err, res) => {
                    //     if (err) return console.error('The API returned an error:', err.message);
                    //     personalListEvents = res.data.items;
                    //     console.log("personalListEvents", personalListEvents)
                    // })
                
                    // Send the PDF invoice as a document
                    // await Whatsapp.sendDocument({
                    //     recipientPhone: recipientPhone,
                    //     caption: `Keol Dent PDF for #${recipientName}`,
                    //     file_path: 'pdf-folder/test.pdf',
                    // });
                }

                // View Location
                if (button_id === 'view_our_location') {
                    let warehouse = Store.generateRandomGeoLocation();
                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: `${langData.view_location_text}`,
                    });
                    await Whatsapp.sendLocation({
                        recipientPhone,
                        latitude: warehouse.latitude,
                        longitude: warehouse.longitude,
                        address: warehouse.address,
                        name: 'DentLeads',
                    });
                }

                // View Dental Services List
                if (button_id === 'view_services') {
                    reschedule = false;
                    await handleServices(recipientPhone, langData);
                }

                // View Dental Services List - Update
                if (button_id === 'view_services_reschedule') {
                    reschedule = true;
                    await handleServices(recipientPhone, langData);
                }

                // Admin part for canceling the appointment
                if(button_id.includes('admin_appointment_cancel')){
                    Whatsapp.sendText({
                        recipientPhone: adminNumber,
                        message: `${langData.admin_message_canceled_client_appointment}`,
                    });
                    handleMessages.deleteEvent(calendar, auth, langData, calendarId, adminNumber, button_id.split('-')[1]);
                }

                // Admin Part that asks the admin to write a message to client
                if(button_id.includes('write_to_client')){
                    currentEventId = button_id.split('-')[1]; // Extract the event ID from the button ID
                    Whatsapp.sendText({
                        recipientPhone: adminNumber,
                        message: `${langData.admin_message_write_to_client}`,
                    });
                    msgToClient = true;
                }

                // After selecting the appointment type, choose the month for the appointment
                if (button_id === 'set_appointment') {
                    await handleTime.sendMonthButtons(recipientPhone, langData);
                }

                // Delete event from calendar
                if (button_id.includes('cancel_appointment')) {
                    handleMessages.deletePersonalEvent(calendar, auth, calendarId, recipientPhone, langData, adminNumber);
                }

                // List of upcomming 10 days from the selected month above
                if (button_id.includes('select_month')) {
                    //get the date from buton id
                    let selectedDate = button_id.split('|');
                    monthDate = incomingMessage.button_reply.title;
                    /////////////////////////////////////
                    allData[recipientPhone].month = monthDate;
                    /////////////////////////////////////
                    selectedDate = moment(selectedDate[1], "MM-YYYY");
                    let startDate = moment(selectedDate, "MM-YYYY").startOf("month");
                    let endDate = moment(selectedDate, "MM-YYYY").endOf("month");
                    let mydate = startDate;

                    //get all days for the selected date from the date above
                    let days = [];
                    while(mydate.isBefore(endDate) && days.length < 10){
                        if(mydate.isAfter(moment.now())){
                            //filter out weekends and full dates
                            if(mydate.isoWeekday() !== 6 && mydate.isoWeekday() !== 7){
                                days.push(mydate);
                            }   
                        }
                        mydate = mydate.clone().add(1, 'day');
                    }
                    let listOfSections = [{  
                        title: `${langData.working_days} `,
                        rows: []
                    }];

                    days.forEach(function(day,index){
                        listOfSections[0].rows.push({
                            title: moment(day).format('dddd Do'),
                            id: 'show_days|'+ moment(day).format('DD-MM-YYYY'),
                            description: `` + selectedDate.format('MMMM YYYY')
                        })
                    });

                    let headerText = `#${langData.you_selected} ` +selectedDate.format('MMMM YYYY');
                    let bodyText = `${langData.available_days_text}`;
                    let footerText = 'Powered by: DentLeads.com';
                    let buttonText = `${langData.select_a_day}`;

                    await SendRadioButton.sendRadioButton({
                        recipientPhone,
                        headerText,
                        bodyText,
                        footerText,
                        listOfSections,
                        buttonText
                    });
                }
                await Whatsapp.markMessageAsRead({ message_id });
            };
            if (typeOfMsg === 'radio_button_message'){
                let button_id = incomingMessage.list_reply.id;
                /////////////////////////////////////
                // allData[recipientPhone].month = monthDate;
                /////////////////////////////////////
                // Save the event in the google calendar
                if (button_id.includes('selected_hour')){
                    let selectedHourFinal = button_id.split('|');
                    hourDate = incomingMessage.list_reply.title;
                    selectedHourFinal = moment(selectedHourFinal[1], 'DD-MM-YYYY H:mm A');
                
                    calendar.events.list({
                        calendarId: calendarId,
                        timeMin: selectedHourFinal.toISOString(),
                        timeMax: selectedHourFinal.clone().add(30, 'minutes').toISOString(),
                        singleEvents: true,
                        orderBy: 'startTime',
                    }, async (err, clendarListResponse) => {
                        if (err) return console.log('The Google Calendar API returned an error: ' + err);
                        const events = clendarListResponse.data.items;
                        if (events.length > 0) {
                            console.log('There is already an event scheduled at this time');
                        } else {
                            console.log('No conflicting events found');
                            let from = selectedHourFinal.format('YYYY-MM-DDTHH:mm:ss');
                            let to = selectedHourFinal.add(30, 'minutes').format('YYYY-MM-DDTHH:mm:ss');

                            // Convert to UTC
                            from = moment(from).format('YYYY-MM-DDTHH:mm:ss.SS[Z]');
                            to = moment(to).format('YYYY-MM-DDTHH:mm:ss.SS[Z]');
                            // from = moment(from).subtract(2, 'hours').format('YYYY-MM-DDTHH:mm:ss.SS[Z]');
                            // to = moment(to).subtract(2, 'hours').format('YYYY-MM-DDTHH:mm:ss.SS[Z]');
                            let event = {
                                'summary': `${langData.appointment_for} ${appointment_type} / ${recipientName} / ${recipientPhone}`,
                                'description': `${langData.this_is_the_description}\n${langData.name} ${recipientName}\n${langData.phone} ${recipientPhone}\n\n${langData.date} ${hourDate.slice(0, 2)} ${monthDate} \n${langData.time} ${hourDate.slice(-12)}\n\n${langData.appointment_type} ${appointment_type}`,
                                'start': { 'dateTime': from, },
                                'end': { 'dateTime': to }
                            };
                            if (reschedule){
                                // Set the minimum time to the current time
                                const now = new Date();
                                const minTime = now.toISOString();
                        
                                let personalEvent = null;
                                calendar.events.list({
                                    calendarId: calendarId,
                                    q: recipientPhone, // This filters events with the given phone number in any text field
                                    timeMin: minTime
                                }, (err, res) => {
                                    if (err) return console.error('The API returned an error:', err.message);
                                    personalEvent = res.data.items;
                        
                                    if (personalEvent.length === 0) {
                                        console.log("No relevant events found.");
                                        return;
                                    }
                                    const eventIdToUpdate = personalEvent[0].id; // set the eventId to the ID of the first relevant event
                                    const description = personalEvent[0].description;
                                    // Update the event
                                    calendar.events.update({
                                        auth: auth,
                                        calendarId: calendarId,
                                        eventId: eventIdToUpdate,
                                        resource: event
                                    }, async  (err,calendarInsert) => {
                                        if (err) {
                                            console.error('Error in updating event:', err);
                                        } else {
                                            processEvents(event, 'update',calendarInsert.data.id);
                                            Whatsapp.sendText({
                                                recipientPhone: recipientPhone,
                                                message: `*${langData.appointment_updated_text}*\n\n${event.description}`
                                            });
                                            
                                            const messageBody = `${langData.admin_appointment_updated_text}\n\n${event.description}`;
                                            const data = JSON.stringify({
                                                messaging_product: "whatsapp",
                                                preview_url: false,
                                                recipient_type: "individual",
                                                to: adminNumber,
                                                type: "text",
                                                text: {
                                                    body: messageBody
                                                }
                                            });
                                            const config = {
                                                method: 'post',
                                                maxBodyLength: Infinity,
                                                url: 'https://graph.facebook.com/v17.0/117909914692067/messages',
                                                headers: { 
                                                    'Content-Type': 'application/json', 
                                                    'Authorization': 'Bearer EAARvJYTOQUwBAJCIQROMwhJW792g2iBXRNHqlZAJm1AZCX1djChg5FZAMglvP68lqiwo9nM2lZATZBtc5YqFBfzBTH4FYs2SrxL3PyM7ZCZBadX5uwsXtpC6ux0w6409sXAsoQlSwMWFRZBOhmsxmU0wIeK2ZAkFcRVcGwXDz3NhSaQPLaNdMVFsd'
                                                },
                                                data: data
                                            };
                                            axios(config)
                                            .then((response) => {
                                                console.log('Message sent to admin:', messageBody);
                                            })
                                            .catch((error) => {
                                                console.log('Error sending message to admin:', error);
                                            });
                                        }
                                    });
                                    
                                })
                            } else {
                                // Create an event
                                const eventId = uuidv4();
                                calendar.events.insert({
                                    auth: auth,
                                    calendarId: calendarId,
                                    resource: event,
                                    id: eventId
                                }, async (err, calendarInsert) => {
                                    console.log("Error inserting event:", err)
                                    if (err) return res.sendStatus(calendarInsert['status']);
                                    processEvents(event, 'insert',calendarInsert.data.id);

                                    // Send a message to the admin
                                    const timeRegex = /Time: (.+)|Koha: (.+)|Tempo: (.+)/;

                                    let apttime = '';
                                    const timeMatch = event.description.match(timeRegex);
                                    if (timeMatch) {
                                        apttime = timeMatch[1] || timeMatch[2] || timeMatch[3];
                                        apttime = apttime.replace(/(2023|023)/, '');
                                    }
                                    const messageBody = `${langData.admin_appointment_created_text}\n\n*${langData.name}* ${recipientName}\n*${langData.phone}* ${recipientPhone}\n*${langData.appointment_type}* _${appointment_type}_\n\n📅 *${langData.date}* ${hourDate.slice(0, 2)} ${monthDate}\n⏱ *${langData.time}* ${apttime}`;

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
                                        url: 'https://graph.facebook.com/v17.0/117909914692067/messages',
                                        headers: { 
                                            'Content-Type': 'application/json', 
                                            'Authorization': 'Bearer EAARvJYTOQUwBAJCIQROMwhJW792g2iBXRNHqlZAJm1AZCX1djChg5FZAMglvP68lqiwo9nM2lZATZBtc5YqFBfzBTH4FYs2SrxL3PyM7ZCZBadX5uwsXtpC6ux0w6409sXAsoQlSwMWFRZBOhmsxmU0wIeK2ZAkFcRVcGwXDz3NhSaQPLaNdMVFsd'
                                        },
                                        data : data
                                    };

                                    try {
                                        await axios.request(config);
                                        console.log(`Message sent to admin with phone number ${adminNumber}`);
                                    } catch (error) {
                                        console.log(error);
                                    }

                                    // Message to admin
                                    await Whatsapp.sendSimpleButtons({
                                        message: `${langData.admin_communicate_client_text}`,
                                        recipientPhone: adminNumber,
                                        listOfButtons: [
                                            {
                                                title: langData.admin_communicate_client_button,
                                                id: 'write_to_client-'+event.id,
                                            },
                                            {
                                                title: langData.cancel_appointment,
                                                id: 'admin_appointment_cancel-'+event.id,
                                            },
                                        ],
                                    });
                                    // Send a confirmation message to the user
                                    const theTime = hourDate.split(' ')[1];
                                    await handleMessages.confirmationAppointmentMessage(calendar, auth, calendarId, langData, recipientName, recipientPhone);

                                    // Extract the date part
                                    var datePart = hourDate.split(' ')[0];
                                    // Split the date part at hyphen
                                    var dateParts = datePart.split('-');
                                    // Rearrange the parts in the desired format
                                    var appointmentDate = dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
                                    const note = allIncomingMessages.join('\n');
                                    saveAppointment(recipientName, recipientPhone, appointment_type, appointmentDate, note)
                                    
                                    // Empty the array
                                    allIncomingMessages = [];
                                });
                            }
                        }
                    });  
                }
                // Select the hour from the selected day above
                if (button_id.includes('show_days')){
                    moment.locale('en')
                    let selectedDay = button_id.split('|');
                    dayDate = incomingMessage.list_reply.title;
                    /////////////////////////////////////
                    allData[recipientPhone].dayDate = monthDate;
                    /////////////////////////////////////
                    selectedDay = moment(selectedDay[1], 'DD-MM-YYYY');
                    let showHours = () => {
                        return Array.from({length: 18}, (_,i) => i).reduce((r,hour) => {
                            if (hour >= 9 && hour < 20) {
                                r.push(selectedDay.format('DD-MM-YYYY') + ' '+ moment({hour, minute: 0}).format('h:mm A'));
                                r.push(selectedDay.format('DD-MM-YYYY') + ' '+ moment({hour, minute: 30}).format('h:mm A'));
                            }
                            return r;
                        }, []);
                    }
                    let hours = [];
                    hours = showHours();
                    let listOfSections = [{  
                        title: `${langData.available_hours}`,
                        rows: []
                    }];
                    let promises = [];

                    // loop through the hours array and create a Promise for each hour
                    hours.forEach(function(hour, index) {
                        let promise = new Promise(function(resolve, reject) {
                            let hour1 = moment(hour, 'DD-MM-YYYY H:mm A');

                            calendar.events.list({
                                calendarId: calendarId,
                                timeMin: hour1.toISOString(),
                                timeMax: hour1.clone().add(30, 'minutes').toISOString(),
                                singleEvents: true,
                                orderBy: 'startTime',
                            }, (err, clendarListResponse) => {
                                if (err) {
                                    reject('The Google Calendar API returned an error: ' + err);
                                } else {
                                    const events = clendarListResponse.data.items;
                                    if (events.length > 0) {              
                                        events.forEach(event => {
                                            console.log('Event:', event);
                                        });
                                    } else {
                                        listOfSections[0].rows.push({
                                            title: hour,
                                            id: 'selected_hour|'+hour,
                                            description: ` `
                                        })
                                    }   
                                    resolve();
                                }
                            });  
                        });
                        promises.push(promise);
                    });

                    // wait for all the Promises to resolve before executing the code outside the loop
                    Promise.all(promises)
                    .then(function() {
                        // sort the available hours in ascending order
                        listOfSections[0].rows.sort(function(a, b) {
                            var titleA = new Date( a.title);
                            var titleB = new Date( b.title);
                            if (titleA < titleB) {
                                return -1;
                            }
                            if (titleA > titleB) {
                                return 1;
                            }
                            return 0;
                        });
                        listOfSections[0].rows = listOfSections[0].rows.slice(0,10);
                        let headerText = `${langData.select_hour_title}`;
                        let bodyText = `${langData.select_hour_body}`;
                        let footerText = 'Powered by: DentLeads.com';
                        let buttonText = `${langData.select_hour}`;
                        return SendRadioButton.sendRadioButton({
                            recipientPhone,
                            headerText,
                            bodyText,
                            footerText,
                            listOfSections,
                            buttonText
                        });
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
                }
                // After selection of service, choose option what to do next
                if (button_id.includes('dental_')){
                    appointment_type = incomingMessage.list_reply.title;
                    /////////////////////////////////////
                    allData[recipientPhone].appointment_type = appointment_type;
                    /////////////////////////////////////
                    if (reschedule){
                        await handleMessages.handleServiceSelection(recipientPhone, langData, incomingMessage);
                    } else {
                        await handleTime.sendMonthButtons(recipientPhone, langData);
                    }
                }
                // Admin Reports
                if (button_id === 'generate_appt_report') {
                    Whatsapp.sendText({
                        recipientPhone: adminNumber,
                        message: "Here are reports from appointments",
                    });
                    handleMessages.getAllEventsForAdmin(calendar, calendarId)
                    .then((allEventLists) => {
                        const descriptions = allEventLists.map((event) => event.description);
                        return appointmentsReport(allEventLists, descriptions);
                    })
                    .then(() => {
                        Whatsapp.sendDocument({
                            recipientPhone: recipientPhone,
                            caption: `Keol Dent Report PDF`,
                            file_path: 'pdf-folder/report.pdf',
                        });
                    })
                    .catch((error) => {
                        console.error("Error retrieving events: ", error);
                    });
                }                
                else if (button_id === 'get_daily_events') {
                    const currentDate = new Date();
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth() + 1;
                    const day = currentDate.getDate();
                    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

                    handleMessages.getDailyEvents(calendar, calendarId, date)
                    .then((dailyEvents) => {
                        const descriptions = dailyEvents.map(event => event.description);
                        return appointmentsReport(dailyEvents, descriptions);
                    })
                    .then(() => {
                        Whatsapp.sendDocument({
                            recipientPhone: recipientPhone,
                            caption: `Keol Dent Report PDF`,
                            file_path: 'pdf-folder/report.pdf',
                        });
                    })
                    .catch((error) => {
                        console.error("Error retrieving daily events: ", error);
                    });
                }
                else if (button_id === 'get_weekly_events') {
                    const currentDate = new Date();
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth() + 1;
                    const day = currentDate.getDate();
                    const currentDayOfWeek = currentDate.getDay();
                  
                    // Calculate the start date of the week (Sunday)
                    const startDayOfWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
                    const startDate = new Date(year, month - 1, day - startDayOfWeek);
                  
                    // Calculate the end date of the week (Saturday)
                    const endDayOfWeek = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
                    const endDate = new Date(year, month - 1, day + endDayOfWeek);
                  
                    // Format the start and end dates using the imported formatDate function
                    const formattedStartDate = handleMessages.formatDate(startDate);
                    const formattedEndDate = handleMessages.formatDate(endDate);
                    
                    handleMessages.getWeeklyEvents(calendar, calendarId, formattedStartDate, formattedEndDate)
                    .then((weeklyEvents) => {
                        const descriptions = weeklyEvents.map(event => event.description);
                        return appointmentsReport(weeklyEvents, descriptions);
                    })
                    .then(() => {
                    Whatsapp.sendDocument({
                        recipientPhone: recipientPhone,
                        caption: `Keol Dent Report PDF`,
                        file_path: 'pdf-folder/report.pdf',
                    });
                    })
                    .catch((error) => {
                    console.error("Error retrieving weekly events: ", error);
                    });
                }
                else if (button_id === 'get_monthly_events') {
                    const currentDate = new Date();
                    const month = currentDate.getMonth(); // Get the current month (0 for January, 1 for February, etc.)
                    const year = currentDate.getFullYear(); // Get the current year
                  
                    handleMessages.getMonthlyEvents(calendar, calendarId, month, year)
                    .then((monthlyEvents) => {
                    const descriptions = monthlyEvents.map(event => event.description);
                    return appointmentsReport(monthlyEvents, descriptions);
                    })
                    .then(() => {
                    Whatsapp.sendDocument({
                        recipientPhone: recipientPhone,
                        caption: `Keol Dent Report PDF`,
                        file_path: 'pdf-folder/report.pdf',
                    });
                    })
                    .catch((error) => {
                    console.error("Error retrieving monthly events: ", error);
                    });
                }
                else if(button_id === 'get_custom_date_events' && recipientPhone == adminNumber && admin_report_start_range_date == false){
                    await Whatsapp.sendText({
                        recipientPhone: adminNumber,
                        message: `Enter start date \n(YYYY-MM-DD format) \n\nExample: 2023-06-15`,
                    });
                    admin_report_start_range_date = true;     
                } 
            }
            if (incomingMessage.text && (incomingMessage.text.body != undefined || incomingMessage.text.body > 0)) {
                allIncomingMessages.push(`${recipientPhone} ${recipientName} ${incomingMessage.text.body}`);
              } else if (incomingMessage.button_reply && (incomingMessage.button_reply.title != undefined || incomingMessage.button_reply.title > 0)) {
                allIncomingMessages.push(`${recipientPhone} ${recipientName} ${incomingMessage.button_reply.title}`);
              } else if (incomingMessage.list_reply && (incomingMessage.list_reply.id != undefined || incomingMessage.list_reply.id > 0)) {
                allIncomingMessages.push(`${recipientPhone} ${recipientName} ${incomingMessage.list_reply.id}`);
              }
            console.log("Message is:", incomingMessage);
            await saveAllMessages(recipientName, recipientPhone, incomingMessage);
            await Whatsapp.markMessageAsRead({ message_id });
        }
        console.log('POST: Someone is pinging me!');
        return res.sendStatus(200);
    } catch (error) {
        console.error({error})
        return res.sendStatus(500);
    }
});
module.exports = router;