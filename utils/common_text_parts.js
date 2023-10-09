'use strict';
const request = require('request');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const router = require('express').Router();
var axios = require('axios');
const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
const Whatsapp = new WhatsappCloudAPI({
    accessToken:'EAAJGS89SuJoBO1iBnDkNuJegTf8zrNdPFEMZCRTi8yYynIZBMYsVded7HiMEPAHJrkMZC8MZBCZB2zTbzKpTxnntopcPWRjbxFgbWNnJUEJZBMNUt94KT6dtXUcIRVAZA0mOEQfCbDJOOn2OHkEdbxHRyUvpwOdArDz3XZCCCuoZAUhKcQSN7ZBn06CsDJJLyGXLZAeFMqhEsyV1RsF',
    senderPhoneNumberId: '116249438019475',
    WABA_ID: '115956674715330',
    graphAPIVersion: 'v15.0',
});

const EcommerceStore = require('./ecommerce_store');
let Store = new EcommerceStore();

module.exports = class CommonTextParts {
    constructor() {}
    
    // Location Part
    async locationPart(req) {
        let warehouse = Store.generateRandomGeoLocation();
        await Whatsapp.sendText({
            recipientPhone: recipientPhone,
            message: `Controlla la nostra posizione`,
        });
        await Whatsapp.sendLocation({
            recipientPhone,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            address: warehouse.address,
            name: 'Autodemolizione Minello',
        });
    }
};