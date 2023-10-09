const { google } = require('googleapis');
const CREDENTIALS = {
    "type": "service_account",
    "project_id": "dentalcalendar-397013",
    "private_key_id": "f2755603189c45d393df452de9a773477b865a39",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDU4iSCWts0zkxt\nc5QOsC1RG4J8iKnEynVzOUExyenAHA4Siw0CndD41mP08f9w4cTb91ExWHqw7T9A\nJcdTeIqO/7Iw/6NUq0UzH2120oaVuKPfQQ6+ttIb0Bt/XhPENQH/eer2sreTmI9+\nEf2pkBTwOroREGfjvHcE0mY5qBe4Az65dkcJDlK0rO/Heszoy/nvzXlzU1SfFkni\nU9yfEGSZa9kpt4Ai/4IxS2WzNh7M2HacEJ1u9o9aBBy2HjucNLsPAvXMueQilroe\nzQs6aI0f39qSaTOCNKyZKafDKLjHW5AU6eGlFQH34HEUFdukvy+Xsy4Rz4VihWrY\nw3nst0wjAgMBAAECggEABhsWw5UtVil+meF0dl4v01sDIv6pqkb8sTML5b/HtqaQ\n8fY1oTgU9ZyMkTEQGKHZGBs5VtcVucjF0iZJpJRZNDqTcIIi7whBVVlW6RwNSr9y\nr8usmEq9FWaI8cSPs5NDo4GD/Dk3BU9p+jDNtW6emYW0FYFpDjUD6UoxlWcqIWRx\n17rYvpUW51xvAtZLKKNnXwmzBL/2DeXjTqROOTHMrvlpI7fmlXY2/T8VunFeU9lW\nhWFyTI1fs7Ue83YgIFAMRDBCpsL273oXa7d1hCdDRQZO3Cpzqi8gDXFILMr7yeGL\nCXt/2HoZMa7lqlWtsIKSKVtjZ5TBiIclHN+Cx6gKFQKBgQDq0gTwLIkD+MBTJJh2\n8uCsUJThrF8ay4hVYifK5Xpplr3uIngunR1tiy7Jb8jEA9UrFjUVL6HPVh0u0/8q\nW1PW91leQOJ/17lGL2tJ2ZMZtb6+pPeFZ0AGxlL2/A9OZ4PRHxMEyu6Lk6Hb4d2N\n9aSsDt7iyq2ZuPkZDwtuVDYGbQKBgQDoFZmBfEvnj9H5/Hh18qDffdEzrtnN2Gkr\nPuu8pVS745nlX1SvyVpRTOjY5+gYR8H+vD5Qo/CS0NA30wVXqNLdtrQrLOLcClVp\nOrLhZTHeGG5KiTSGl1PXR373iGpwSjmK/GmUFoghMUFhuZM8SznNDA6aYd9SG6qT\nZxzcaOBCzwKBgQDioELn0PODg8WJ+J203v77DuJBUuyOnbQ8Q3kIFqUn1rYDZ/z5\nb+UA3f0Pp/TpSJGo/cvJYKkXw5JyqWNwa6fkpd/4WULAA2DqXcV8BqIzg/ZNZEUG\n2PkwEKPtfqL/FmRfpU/jpj7HMnpaDgiXg2WkMM3nr5gP7jdqedycZGWnmQKBgEDw\nmk1zHEIlKhoLHSHTzFP8/qa5jFRe876YEppsoLMaUput+yJc8xrArH7VFUqF+bBv\nt/gUh2Jtb3XPZDVNFgPX9b4HB0uO0KtrM1aCXFvK9kGA9uOaQGmCpfJZh374JfXP\n/zLiwyCWibbwmFRMsFXBw+xK6pQtDaPFPHwoFGhdAoGAcyiMQngpKh9v+fxPFANd\nApU+yIYfG275bV8bro7sOKScRm1GKY/6dJ8JVYADHQ47Dy7CHrUr+Ow4g+ms5TSD\nk3iNTqq/E8xyjW+uFigasosrufEVDK0xz1NKRWhNYwFT+mCtKT2iEg6kNfrqICK3\nyUV5+5/MMonOke3TU/vs5kM=\n-----END PRIVATE KEY-----\n",
    "client_email": "dentalcalendar@dentalcalendar-397013.iam.gserviceaccount.com",
    "client_id": "104822257218207915024",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/dentalcalendar%40dentalcalendar-397013.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
} 
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);
const calendar = google.calendar({ version: 'v3', auth: auth });
const calendarId = '185396e2e5efc9592c8985fe4500760792056ff56bde6e7034ce3159b1701b93@group.calendar.google.com';
module.exports = {
    auth, 
    calendar, 
    calendarId 
};