const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
const SendRadioButton = require('../helper/sendRadioButton')


// File of connection with meta
const Whatsapp = require('../connections/connectionMeta')

async function handleServices(recipientPhone, langData) {
    let listOfSections = [
        {
            title: `${langData.top_services} `.substring(0,24),
            rows: [
                {
                    id: `dental_examination_control`.substring(0,256),
                    title: `${langData.examination_control_title}`.substring(0,21),
                    description: `${langData.examination_control_description}`.substring(0,68),
                },
                {
                    id: `dental_extraction_removal`.substring(0,256),
                    title: `${langData.extraction_removal_title}`.substring(0,21),
                    description: `${langData.extraction_removal_description}`.substring(0,68),
                },
                {
                    id: `dental_detartarzh_cleaning`.substring(0,256),
                    title: `${langData.detartarzh_cleaning_title}`.substring(0,21),
                    description: `${langData.detartarzh_cleaning_description}`.substring(0,68),
                },
                {
                    id: `dental_grade_1_filling`.substring(0,256),
                    title: `${langData.grade_1_filling_title}`.substring(0,21),
                    description: `${langData.grade_1_filling_description}`.substring(0,68),
                },
                {
                    id: `dental_grade_2_filling`.substring(0,256),
                    title: `${langData.grade_2_filling_title}`.substring(0,21),
                    description: `${langData.grade_2_filling_description}`.substring(0,68),
                },
                {
                    id: `dental_grade_34_treatment`.substring(0,256),
                    title: `${langData.grade_34_treatment_title}`.substring(0,21),
                    description: `${langData.grade_34_treatment_description}`.substring(0,68),
                },
                {
                    id: `dental_placement_of_1_implant`.substring(0,256),
                    title: `${langData.placement_of_1_implant_title}`.substring(0,21),
                    description: `${langData.placement_of_1_implant_description}`.substring(0,68),
                },
                {
                    id: `dental_apply_maskerina`.substring(0,256),
                    title: `${langData.apply_maskerina_title}`.substring(0,21),
                    description: `${langData.apply_maskerina_description}`.substring(0,68),
                },
                {
                    id: `dental_placement_of_piercing`.substring(0,256),
                    title: `${langData.placement_of_piercing_title}`.substring(0,21),
                    description: `${langData.placement_of_piercing_description}`.substring(0,68),
                },
                {
                    id: `dental_jaw_decortication`.substring(0,256),
                    title: `${langData.jaw_decortication_title}`.substring(0,21),
                    description: `${langData.jaw_decortication_description}`.substring(0,68),
                },
            ]
        },
    ];
    let headerText = `#${langData.we_provide_services_title}`;
    let bodyText = `${langData.we_provide_services_body}`;
    let footerText = 'Powered by: Dental Clinic';
    let buttonText = `${langData.we_provide_services_button}`;

    await SendRadioButton.sendRadioButton({
        recipientPhone,
        headerText,
        bodyText,
        footerText,
        listOfSections,
        buttonText
    });
}

module.exports = { handleServices };