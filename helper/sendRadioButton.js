const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
// File of connection with meta
const Whatsapp = require('../connections/connectionMeta')

class SendRadioButton {
    static async sendRadioButton({
      recipientPhone,
      headerText,
      bodyText,
      footerText,
      listOfSections,
      buttonText
    }) {
      if (!bodyText) {
        throw new Error('"bodyText" is required in making a request');
      }
      if (!headerText) {
        throw new Error('"headerText" is required in making a request');
      }
      if (!footerText) {
        throw new Error('"footerText" is required in making a request');
      }
  
      let totalNumberOfItems = 0;
      let validSections = listOfSections
        .map((section) => {
          let title = section.title;
          let rows = section.rows?.map((row) => {
            if (!row.id) {
              throw new Error(
                '"row.id" of an item is required in list of radio buttons.'
              );
            }
            if (row.id.length > 200) {
              throw new Error(
                'The row id must be between 1 and 200 characters long.'
              );
            }
            if (!row.title) {
              throw new Error(
                '"row.title" of an item is required in list of radio buttons.'
              );
            }
            if (row.title.length > 24) {
              throw new Error(
                'The row title must be between 1 and 24 characters long.'
              );
            }
            if (!row.description) {
              throw new Error(
                '"row.description" of an item is required in list of radio buttons.'
              );
            }
            if (row.description.length > 72) {
              throw new Error(
                'The row description must be between 1 and 72 characters long.'
              );
            }
  
            totalNumberOfItems += 1;
  
            return {
              id: row.id,
              title: row.title,
              description: row.description,
            };
          });
          if (!title) {
            throw new Error(
              '"title" of a section is required in list of radio buttons.'
            );
          }
          return {
            title,
            rows,
          };
        })
        .filter(Boolean);
  
      if (totalNumberOfItems > 10) {
        throw new Error(
          'The total number of items in the rows must be equal or less than 10.'
        );
      }
  
      let samples = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: {
            type: 'text',
            text: headerText,
          },
          body: {
            text: bodyText,
          },
          footer: {
            text: footerText,
          },
          action: {
            button: buttonText,
            sections: validSections,
          },
        },
      };
  
      if (validSections.length === 0) {
        throw new Error('"listOfSections" is required in making a request');
      }
  
      let response = await Whatsapp._fetchAssistant({
        url: '/messages',
        method: 'POST',
        body: samples,
      });
    }
  }
  module.exports = SendRadioButton;