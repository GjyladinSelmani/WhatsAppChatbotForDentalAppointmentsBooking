'use strict';
const request = require('request');
const PDFDocument = require('pdfkit');
const fs = require('fs');

module.exports = class EcommerceStore {
    constructor() {}
    async _fetchAssistant(endpoint) {
        return new Promise((resolve, reject) => {
            request.get(
                // `https://fakestoreapi.com${endpoint ? endpoint : '/'}`,
                `https://devapi.lekotech.com/chatbot${endpoint ? endpoint : '/'}`,
                (error, res, body) => {
                    try {
                        if (error) {
                            reject(error);
                        } else {
                            resolve({
                                status: 'success',
                                data: JSON.parse(body),
                            });
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    async getProductById(productId) {
        return await this._fetchAssistant(`/products/${productId}`);
    }
    async getAllCategories() {
        return await this._fetchAssistant('/products/categories?limit=100');
    }
    async getProductsInCategory(categoryId) {
        return await this._fetchAssistant(
            `/products/category/${categoryId}?limit=10`
        );
    }

    generatePDFInvoice({ order_details, file_path }) {
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(file_path));
        doc.fontSize(25);
        doc.text(order_details, 100, 100);
        doc.end();
        return;
    }

    generateRandomGeoLocation() {
        let storeLocations = [
            {
                latitude: 45.727641,
                longitude: 12.150895,
                address: 'Via Postumia Romana Ovest, 14, 31040 Cava Sartor TV, Italia',
            },
            {
                latitude: 45.727641,
                longitude: 12.150895,
                address: 'Via Postumia Romana Ovest, 14, 31040 Cava Sartor TV, Italia',
            },
            {
                latitude: 45.727641,
                longitude: 12.150895,
                address: 'Via Postumia Romana Ovest, 14, 31040 Cava Sartor TV, Italia',
            },
        ];
        return storeLocations[
            Math.floor(Math.random() * storeLocations.length)
        ];
    }


    // Functions:
    
    // Function for finding parts with oem
    async findPart(req) {
        console.log("Request tecode:", req);
        let parts = [];
        var axios = require('axios');
        var config = {
            method: 'get',
            url: `https://api.lekotech.com/chatbot/whatsapp/parts/5fdffcc24d8c6204adc27e4e?code=${req}`,
            headers: {},
        };
        await axios(config)
            .then(function (response) {
                parts = response.data.filter((i) => i.infoCar.oemCode == req);
                console.log("FOUND in api Cars:", parts)
            })
            .catch(function (error) {
                console.log(error);
            });
        return parts;
    }

    // function for finding the plates
    async findPlate(req, recipientPhone) {
        console.log("Request plate code:", req);
        var axios = require('axios');
        var config = {
            method: 'get',
            url: `https://api.lekotech.com/chatbot/whatsapp/license-plate/${req}`,
            headers: {},
        };
        await axios(config)
            .then(function (response) {
                recepient[recipientPhone].plate = response.data;
                recepient[recipientPhone].brandCode = response.data.brandCode;
                recepient[recipientPhone].modelCode = response.data.modelCode;
                recepient[recipientPhone].versionCode = response.data.versionCode;
            })
            .catch(function (error) {
                console.log(error);
            });
        return true;
    }

    // Function for finding the keys
    async findProductByKeyWord(req, recipientPhone){
        var axios = require('axios');
        let brandCode = recepient[recipientPhone].brandCode;
        let modelCode = recepient[recipientPhone].modelCode;
        let versionCode = recepient[recipientPhone].versionCode;

        var config = {
            method: 'get',
            url: `https://api.lekotech.com/chatbot/whatsapp/parts/5fdffcc24d8c6204adc27e4e/${req}?brand=${brandCode}&model=${modelCode}&version=${versionCode}`,
            headers: {},
        };
        await axios(config)
            .then(function (response){
                recepient[recipientPhone].parts = response.data;
            })
            .catch(function (error){
                console.log(error);
            });
        return true;
    }
};