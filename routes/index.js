'use strict';
// Packages
const fs = require('fs');
const router = require('express').Router();
const moment = require('moment');
const momentTz = require('moment-timezone')
var axios = require('axios');
const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
const { v4: uuidv4 } = require('uuid');
var cron = require('node-cron');

// Connections
const Whatsapp = require('../connections/connectionMeta')
const { auth, calendar, calendarId } = require('../connections/connectionGoogleCalendar');

// Services
const { handleServices } = require('../services/handleServices');
const handleMessages = require('../services/handleMessages');
const handleTime = require('../services/handleTime');
const { scheduleReminderMessages, processEvents, initializeEvents } = require('../services/handleReminderMessages');
const { demoPDF } = require('../services/generatePDF');

// Helpers
const SendRadioButton = require('../helper/sendRadioButton')

router.get('/', function (req, res) {
    res.send('hello world');
});

// Utils
const EcommerceStore = require('./../utils/ecommerce_store.js');
let Store = new EcommerceStore();
const CommonTextParts = require('./../utils/common_text_parts.js');
let CommonText = new CommonTextParts();
const CustomerSession = new Map();

// Variables
let reschedule = false; // Flag for reschedule the appointment
let appointment_type = null; // Variable to keep the appointment type value
let monthDate = null; // Variable to keep the month value
let dayDate = null; // Variable to keep day value
let hourDate = null; // Variable to keep hour calue

let msgToClient = false;
let admin_report_start_range_date = false;
let currentEventId = ''; // Declare a variable to store the event ID

// Get the current date
const currentDate = new Date();
const eventArray = []; // Array variable to store events
const allEventLists = [];

let admin_report_end_range_date = false;
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
        console.log(process.env.Meta_WA_VerifyToken);
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
        console.error({ error });
        return res.sendStatus(500);
    }
});

router.post('/meta_wa_callbackurl', async (req, res) => {
    try {
        let data = Whatsapp.parseMessage(req.body);
        if (data?.isMessage) {
            let incomingMessage = data.message;
            let recipientPhone = incomingMessage.from.phone; // extract the phone number of sender
            let recipientName = incomingMessage.from.name; // extract the phone number of sender
            let typeOfMsg = incomingMessage.type; // extract the type of message (some are text, others are images, others are responses to buttons etc...)
            let message_id = incomingMessage.message_id; // extract the message id
            const recipientPrefix = recipientPhone.substring(0, 2); // Extract the prefix from the recipient's phone number
            const adminNumber = "38971423838";  // Admin Number
            // const adminNumber = "355693943528";  // Admin - Doctor Number
            let lang = 'en'; // Determine the language to be used based on the prefix // Default language is English
            if (recipientPrefix === '35') {
                lang = 'al'; // Albanian language
            } else if (recipientPrefix === '39') { 
                lang = 'it'; // Italian language
            }
            const langData = require(`../languages/${lang}.json`); // Load the appropriate language file
            
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
                    //     let footerText = 'Powered by: Klinika Dentare';
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
                    else {
                        // To set up new event
                        handleMessages.handleIncomingTextMessage({ recipientPhone, recipientName, langData });
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
                    // const eventArray = await handleMessages.seeAllEvents(calendar, calendarId, recipientPhone);
                    // console.log("at index list of events is: ", eventArray);
                     // Generate the PDF invoice
                     await demoPDF({ recipientPhone, recipientName, langData, eventArray });
                    //  Send the PDF invoice as a document
                    await Whatsapp.sendDocument({
                        recipientPhone: recipientPhone,
                        caption: `Isufi Royal Dental PDF for #${recipientName}`,
                        file_path: 'pdf-folder/test.pdf',
                    });
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
                        name: 'Dental Clinic',
                    });

                    //  // Generate the PDF invoice
                    //  await demoPDF({ recipientPhone, recipientName, langData, eventArray });
                    // //  Send the PDF invoice as a document
                    // await Whatsapp.sendDocument({
                    //     recipientPhone: recipientPhone,
                    //     caption: `Isufi Royal Dental PDF for #${recipientName}`,
                    //     file_path: 'pdf-folder/test.pdf',
                    // });
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
                    let footerText = 'Powered by: Dental Clinic';
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
                                                url: 'https://graph.facebook.com/v17.0/117553451225848/messages',
                                                headers: { 
                                                    'Content-Type': 'application/json', 
                                                    'Authorization': 'Bearer EAAJGS89SuJoBO1iBnDkNuJegTf8zrNdPFEMZCRTi8yYynIZBMYsVded7HiMEPAHJrkMZC8MZBCZB2zTbzKpTxnntopcPWRjbxFgbWNnJUEJZBMNUt94KT6dtXUcIRVAZA0mOEQfCbDJOOn2OHkEdbxHRyUvpwOdArDz3XZCCCuoZAUhKcQSN7ZBn06CsDJJLyGXLZAeFMqhEsyV1RsF'
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
                                        url: 'https://graph.facebook.com/v17.0/117553451225848/messages',
                                        headers: { 
                                            'Content-Type': 'application/json', 
                                            'Authorization': 'Bearer EAAJGS89SuJoBO1iBnDkNuJegTf8zrNdPFEMZCRTi8yYynIZBMYsVded7HiMEPAHJrkMZC8MZBCZB2zTbzKpTxnntopcPWRjbxFgbWNnJUEJZBMNUt94KT6dtXUcIRVAZA0mOEQfCbDJOOn2OHkEdbxHRyUvpwOdArDz3XZCCCuoZAUhKcQSN7ZBn06CsDJJLyGXLZAeFMqhEsyV1RsF'
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
                                });
                            }
                        }
                    });  
                }

                // Select the hour from the selected day above
                if (button_id.includes('show_days')) {
                    moment.locale('en');
                    const selectedDay = moment(button_id.split('|')[1], 'DD-MM-YYYY');
                    await handleTime.sendAvailableHours(recipientPhone, langData, selectedDay);
                }

                // After selection of service, choose option what to do next
                if (button_id.includes('dental_')){
                    appointment_type = incomingMessage.list_reply.title;
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
                            caption: `Dental Clinic Report PDF`,
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
                            caption: `Dental Clinic Report PDF`,
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
                        caption: `Dental Clinic Report PDF`,
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
                        caption: `Dental Clinic Report PDF`,
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
            // await saveAllMessages(recipientName, recipientPhone, incomingMessage);
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