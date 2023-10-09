const moment = require('moment');
const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
const SendRadioButton = require('../helper/sendRadioButton')

// File of connection with meta
const Whatsapp = require('../connections/connectionMeta');
const { auth, calendar, calendarId } = require('../connections/connectionGoogleCalendar');

// Function for getting 2 upcomming months
function generateMonthButtons(langData) {
  return [
    {
      title: moment().format('MMMM YYYY'),
      id: 'select_month|'+moment().format('MM-YYYY'),
    },
    {
      title: moment().add(1, 'month').format('MMMM YYYY'),
      id: 'select_month|'+moment().add(1, 'month').format('MM-YYYY'),
    }
  ];
}

// Function for displaying the upcomming months 
async function sendMonthButtons(recipientPhone, langData) {
  await Whatsapp.sendSimpleButtons({
    message: `${langData.select_month_text}`,
    recipientPhone: recipientPhone,
    listOfButtons: generateMonthButtons(langData),
  });
}

// Function to get available hours only
async function getAvailableHours(selectedDay) {
  const startHour = 9;
  const endHour = 19;
  const hours = [];

  for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute <= 30; minute += 30) {
          const time = moment(selectedDay)
              .set({ hour, minute })
              .format('DD-MM-YYYY h:mm A');

          const events = await getEventsForTimeRange(time);
          if (events.length === 0) {
              hours.push(time);
          }
      }
  }
  return hours.slice(0, 10);
}

// Function for checking the daily events in hours
async function getEventsForTimeRange(time) {
  const start = moment(time, 'DD-MM-YYYY h:mm A');
  const end = moment(start).add(30, 'minutes');

  const response = await calendar.events.list({
      calendarId,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
  });

  return response.data.items || [];
}

// Function to show the list with available hours
async function sendAvailableHours(recipientPhone, langData, selectedDay) {
  const availableHours = await getAvailableHours(selectedDay);
  const listOfSections = [{
      title: langData.available_hours,
      rows: availableHours.map(hour => ({
        title: hour,
        id: `selected_hour|${hour}`,
        description: ` `,
    })),
  }];

  const headerText = langData.select_hour_title;
  const bodyText = langData.select_hour_body;
  const footerText = 'Powered by: Dental Clinic';
  const buttonText = langData.select_hour;

  try {
      await SendRadioButton.sendRadioButton({
        recipientPhone,
        headerText,
        bodyText,
        footerText,
        listOfSections,
        buttonText,
      });
  } catch (error) {
    console.error(error);
  }
}

  module.exports = {
    sendMonthButtons,
    sendAvailableHours
  };