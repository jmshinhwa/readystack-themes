// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Mapping personal data in this file", "done": "Personal-data columns found - the panel lists each line and its GDPR article.", "nothing_found": "No personal-data columns matched in this file.", "paste": "Paste a migration, Prisma schema, Django model or TypeORM entity here", "check": "Map this schema", "extra_rules": "Extra rules of your own, checked alongside the 13 GDPR schema rules that ship inside.", "need_key": "Full version: map every migration and model in the repository, export the map as CSV, JSON or HTML, and fail CI on a finding - not just this open file. $29 once, one licence key per person or team seat, 7-day full refund. An independent EU privacy consultant bills EUR 100-200/hour and one manual DSAR averages about $1,524 in staff time.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "key_ok": "Licence accepted. Repository map, export and CI output are open.", "key_bad": "That key did not validate. Check it in your Polar receipt, or buy a licence."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Personal Data Map');
  return out._c;
}

// ★무료 — ★열린 파일 하나를 ★끝까지 본다. ⛔키를 묻지 않는다.
async function runCurrent() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText();
  const hits = scan(text, ed.document.fileName);
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

function report(rows) {
  const c = out(); c.clear();
  let n = 0;
  // ★설정을 읽는다 — min_severity. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  const _ORD = { info: 0, warn: 1, error: 2 };
  const _min = _ORD[String(vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('min_severity')
    || 'info').toLowerCase()] || 0;
  for (const r of rows) {
    const _hits = r.hits.filter(function (h) {
      return (_ORD[String(h.sev || 'info').toLowerCase()] || 0) >= _min;
    });
    if (!_hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of _hits) { c.appendLine('  ' + h.line + ': ' + h.msg); n++; }
  }
  c.appendLine('—— ' + n + ' ——');
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:SEXUAL_ORIENTATION|sexual-orientation|sexual_orientation|POLITICAL_OPINION|political-opinion|political_opinion|sexualOrientation|politicalOpinion|CRIMINAL_RECORD|criminal-record|criminal_record|POLITICAL_VIEW|criminalRecord|political-view|political_view|politicalView|UNION_MEMBER|union-member|union_member|TRADE_UNION|trade-union|trade_union|unionMember|CONVICTION|conviction|tradeUnion|BIOMETRIC|DISABILIT|ETHNICITY|RELIGIOUS|biometric|disabilit|ethnicity|religious|RELIGION|SEX_LIFE|religion|sex-life|sex_life|DIAGNOS|GENETIC|MEDICAL|diagnos|genetic|medical|sexLife|ETHNIC|HEALTH|RACIAL|ethnic|health|racial)|(?<=[a-z0-9])(?:SexualOrientation|PoliticalOpinion|CriminalRecord|PoliticalView|UnionMember|Conviction|TradeUnion|Biometric|Disabilit|Ethnicity|Religious|Religion|Diagnos|Genetic|Medical|SexLife|Ethnic|Health|Racial))[A-Za-z0-9_]{0,24})(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Art. 9 special-category data. It needs an Art. 9(2) condition on top of your Art. 6 legal basis, and it pushes this table over the Art. 35 DPIA threshold.", "sev": "error", "fix": "Record the Art. 9(2) condition beside this column and run a DPIA."}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:NATIONAL_INSURANCE|national-insurance|national_insurance|nationalInsurance|DRIVERS_LICENCE|DRIVERS_LICENSE|SOCIAL_SECURITY|TAX_FILE_NUMBER|drivers-licence|drivers-license|drivers_licence|drivers_license|social-security|social_security|tax-file-number|tax_file_number|DRIVER_LICENCE|DRIVER_LICENSE|driver-licence|driver-license|driver_licence|driver_license|driversLicence|driversLicense|socialSecurity|driverLicence|driverLicense|taxFileNumber|NATIONAL_ID|national-id|national_id|nationalId|PASSPORT|passport)|(?<=[a-z0-9])(?:NationalInsurance|DriversLicence|DriversLicense|SocialSecurity|DriverLicence|DriverLicense|TaxFileNumber|NationalId|Passport))[A-Za-z0-9_]{0,24}|(?:(?<![A-Za-z0-9_])(?:NINO|nino|SSN|ssn)|(?<=[a-z0-9])(?:Nino|Ssn))(?:[_-]?(?:id|no|num|number|code|value)|Id|No|Num|Number|Code|Value)?)(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "National identifier. Art. 87 lets each Member State restrict its processing, and a breach of it raises the Art. 34 duty to tell the person directly.", "sev": "error", "fix": "Store a salted hash or an internal id, and keep the raw number out of joins."}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:CLIENT_SECRET|REFRESH_TOKEN|SESSION_TOKEN|client-secret|client_secret|refresh-token|refresh_token|session-token|session_token|ACCESS_TOKEN|access-token|access_token|clientSecret|refreshToken|sessionToken|PRIVATE_KEY|accessToken|private-key|private_key|privateKey|PASSWORD|password|API_KEY|api-key|api_key|PASSWD|SECRET|apiKey|passwd|secret)|(?<=[a-z0-9])(?:ClientSecret|RefreshToken|SessionToken|AccessToken|PrivateKey|Password|ApiKey|Passwd|Secret))(?![_-]?(?:[Hh]ash|HASH|[Dd]igest|[Bb]crypt|[Aa]rgon|[Ss]crypt|sha\\d|[Ee]ncrypted|[Ee]nc|[Kk]ms|KMS|[Vv]ault)\\b)[A-Za-z0-9_]{0,24}|(?:(?<![A-Za-z0-9_])(?:APIKEY|apikey|PWD|pwd)|(?<=[a-z0-9])(?:Apikey|Pwd))(?![_-]?(?:[Hh]ash|HASH|[Dd]igest|[Bb]crypt|[Aa]rgon|[Ss]crypt|sha\\d|[Ee]ncrypted|[Ee]nc|[Kk]ms|KMS|[Vv]ault)\\b)(?:[_-]?(?:id|no|num|number|code|value)|Id|No|Num|Number|Code|Value)?)(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Credential under a plain name. Art. 32 requires state-of-the-art protection, and a DSAR export under Art. 15 must never return this column.", "sev": "error", "fix": "Rename to <name>_hash and store a derived value, or move it to a secret store."}, {"pattern": "(?:[Cc][Rr][Ee][Aa][Tt][Ee]\\s+(?:[Oo][Rr]\\s+[Rr][Ee][Pp][Ll][Aa][Cc][Ee]\\s+)?[Tt][Aa][Bb][Ll][Ee]|^\\s*[Mm][Oo][Dd][Ee][Ll]\\s+|^\\s*[Cc][Ll][Aa][Ss][Ss]\\s+)[^\\n]*(?:[Aa][Uu][Dd][Ii][Tt]|[Hh][Ii][Ss][Tt][Oo][Rr][Yy]|[Aa][Rr][Cc][Hh][Ii][Vv][Ee]|[Bb][Aa][Cc][Kk][Uu][Pp]|[Ss][Hh][Aa][Dd][Oo][Ww]|[Ss][Nn][Aa][Pp][Ss][Hh][Oo][Tt]|[Jj][Oo][Uu][Rr][Nn][Aa][Ll]|[Ee][Vv][Ee][Nn][Tt][Ll][Oo][Gg]|_[Oo][Ll][Dd]|_[Cc][Oo][Pp][Yy]|_[Ll][Oo][Gg])", "flags": "", "message": "Copy table. Art. 17 erasure and Art. 15 access have to reach the copies too - this is where most incomplete DSARs are found, not in the main table.", "sev": "error"}, {"pattern": "[Rr][Ee][Ff][Ee][Rr][Ee][Nn][Cc][Ee][Ss]\\s+[`\"\\[]?\\w*(?:[Uu][Ss][Ee][Rr]|[Cc][Uu][Ss][Tt][Oo][Mm][Ee][Rr]|[Pp][Ee][Rr][Ss][Oo][Nn]|[Pp][Aa][Tt][Ii][Ee][Nn][Tt]|[Ee][Mm][Pp][Ll][Oo][Yy][Ee][Ee]|[Mm][Ee][Mm][Bb][Ee][Rr]|[Cc][Ll][Ii][Ee][Nn][Tt]|[Ss][Uu][Bb][Ss][Cc][Rr][Ii][Bb][Ee][Rr]|[Cc][Oo][Nn][Tt][Aa][Cc][Tt])\\w*[`\"\\]]?\\s*\\([^)]*\\)(?![^\\n]*[Oo][Nn]\\s+[Dd][Ee][Ll][Ee][Tt][Ee])", "flags": "", "message": "Foreign key to the subject table with no ON DELETE rule on this line. Erase the person and this row survives, so the Art. 17 erasure is incomplete.", "sev": "warn"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:MOBILE_NUMBER|mobile-number|mobile_number|ADDRESS_LINE|address-line|address_line|mobileNumber|MAIDEN_NAME|POSTAL_CODE|addressLine|maiden-name|maiden_name|postal-code|postal_code|FIRST_NAME|GIVEN_NAME|first-name|first_name|given-name|given_name|maidenName|postalCode|FULL_NAME|LAST_NAME|TELEPHONE|firstName|full-name|full_name|givenName|last-name|last_name|telephone|POSTCODE|ZIP_CODE|fullName|lastName|postcode|zip-code|zip_code|SURNAME|surname|zipCode|E_MAIL|MSISDN|STREET|e-mail|e_mail|msisdn|street|EMAIL|PHONE|eMail|email|phone)|(?<=[a-z0-9])(?:MobileNumber|AddressLine|MaidenName|PostalCode|FirstName|GivenName|Telephone|FullName|LastName|Postcode|Surname|ZipCode|Msisdn|Street|EMail|Email|Phone))[A-Za-z0-9_]{0,24})(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Direct identifier. Every Art. 15 export and every Art. 17 erasure has to reach this column, so the table belongs in your Art. 30 record.", "sev": "info"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:DATE_OF_BIRTH|date-of-birth|date_of_birth|dateOfBirth|BIRTH_DATE|birth-date|birth_date|AGE_GROUP|AGE_YEARS|BIRTHDATE|age-group|age-years|age_group|age_years|birthDate|birthdate|AGE_BAND|GUARDIAN|IS_MINOR|age-band|ageGroup|ageYears|age_band|guardian|is-minor|is_minor|ageBand|isMinor)|(?<=[a-z0-9])(?:DateOfBirth|BirthDate|Birthdate|AgeGroup|AgeYears|Guardian|AgeBand|IsMinor))[A-Za-z0-9_]{0,24}|(?:(?<![A-Za-z0-9_])(?:AGE|DOB|age|dob)|(?<=[a-z0-9])(?:Age|Dob))(?:[_-]?(?:id|no|num|number|code|value)|Id|No|Num|Number|Code|Value)?)(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Age data. If a user can be under 16 (Art. 8; several Member States set 13), the child cannot give valid consent alone and a parental-consent path has to exist.", "sev": "warn"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:ADVERTISING_ID|advertising-id|advertising_id|advertisingId|FINGERPRINT|REMOTE_ADDR|fingerprint|remote-addr|remote_addr|IP_ADDRESS|USER_AGENT|VISITOR_ID|ip-address|ip_address|remoteAddr|user-agent|user_agent|visitor-id|visitor_id|COOKIE_ID|DEVICE_ID|cookie-id|cookie_id|device-id|device_id|ipAddress|userAgent|visitorId|cookieId|deviceId|IP_ADDR|ip-addr|ip_addr|ipAddr)|(?<=[a-z0-9])(?:AdvertisingId|Fingerprint|RemoteAddr|IpAddress|UserAgent|VisitorId|CookieId|DeviceId|IpAddr))[A-Za-z0-9_]{0,24}|(?:(?<![A-Za-z0-9_])(?:GAID|IDFA|gaid|idfa)|(?<=[a-z0-9])(?:Gaid|Idfa))(?:[_-]?(?:id|no|num|number|code|value)|Id|No|Num|Number|Code|Value)?)(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Online identifier. Recital 30 and CJEU C-582/14 (Breyer) make a dynamic IP personal data when you can identify the user - these are the columns teams leave out of the Art. 30 record.", "sev": "warn"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:COORDINATES|GEOLOCATION|coordinates|geolocation|GEO_POINT|LONGITUDE|geo-point|geo_point|longitude|GEO_HASH|LATITUDE|geo-hash|geoPoint|geo_hash|latitude|GEOHASH|geoHash|geohash|GPS|gps)|(?<=[a-z0-9])(?:Coordinates|Geolocation|Longitude|GeoPoint|Latitude|GeoHash|Geohash|Gps))[A-Za-z0-9_]{0,24}|(?:(?<![A-Za-z0-9_])(?:LAT|LNG|LON|lat|lng|lon)|(?<=[a-z0-9])(?:Lat|Lng|Lon))(?:[_-]?(?:id|no|num|number|code|value)|Id|No|Num|Number|Code|Value)?)(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Precise location. Continuous location tied to an identified person is systematic monitoring and counts toward the Art. 35 DPIA threshold.", "sev": "warn"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:MESSAGE_BODY|message-body|message_body|DESCRIPTION|description|messageBody|BIOGRAPHY|FREE_TEXT|biography|free-text|free_text|FEEDBACK|feedback|freeText|COMMENT|REMARKS|comment|remarks|REASON|reason|NOTES|notes)|(?<=[a-z0-9])(?:Description|MessageBody|Biography|Feedback|FreeText|Comment|Remarks|Reason|Notes))[A-Za-z0-9_]{0,24}|(?:(?<![A-Za-z0-9_])(?:NOTE|note|BIO|bio)|(?<=[a-z0-9])(?:Note|Bio))(?:[_-]?(?:id|no|num|number|code|value)|Id|No|Num|Number|Code|Value)?)(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Free-text column. An Art. 15 request covers whatever a colleague typed here and you cannot predict it, so this field has to be searched rather than skipped.", "sev": "info"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:STRIPE_CUSTOMER|stripe-customer|stripe_customer|stripeCustomer|EXTERNAL_CRM|external-crm|external_crm|externalCrm|SALESFORCE|SEGMENT_ID|salesforce|segment-id|segment_id|AMPLITUDE|MAILCHIMP|amplitude|mailchimp|segmentId|INTERCOM|MIXPANEL|intercom|mixpanel|HUBSPOT|KLAVIYO|POSTHOG|ZENDESK|hubspot|klaviyo|posthog|zendesk|BRAZE|braze)|(?<=[a-z0-9])(?:StripeCustomer|ExternalCrm|Salesforce|Amplitude|Mailchimp|SegmentId|Intercom|Mixpanel|Hubspot|Klaviyo|Posthog|Zendesk|Braze))[A-Za-z0-9_]{0,24})(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "This column proves personal data left for a processor. That processor has to be named in your Art. 30(1) record and covered by an Art. 28 contract.", "sev": "warn"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:DELETED_FLAG|deleted-flag|deleted_flag|ARCHIVED_AT|IS_ARCHIVED|SOFT_DELETE|archived-at|archived_at|deletedFlag|is-archived|is_archived|soft-delete|soft_delete|DELETED_AT|IS_DELETED|IS_REMOVED|archivedAt|deleted-at|deleted_at|is-deleted|is-removed|isArchived|is_deleted|is_removed|softDelete|deletedAt|isDeleted|isRemoved)|(?<=[a-z0-9])(?:DeletedFlag|ArchivedAt|IsArchived|SoftDelete|DeletedAt|IsDeleted|IsRemoved))[A-Za-z0-9_]{0,24})(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Soft delete. Art. 17 erasure is not a flag - the row still holds the person and read replicas still serve it. Name the hard-delete or anonymise job that follows.", "sev": "warn"}, {"pattern": "(?:(?:(?<![A-Za-z0-9_])(?:ACCOUNT_NUMBER|ROUTING_NUMBER|account-number|account_number|routing-number|routing_number|accountNumber|routingNumber|BANK_ACCOUNT|bank-account|bank_account|CARD_NUMBER|bankAccount|card-number|card_number|CARDHOLDER|cardNumber|cardholder|SORT_CODE|sort-code|sort_code|sortCode)|(?<=[a-z0-9])(?:AccountNumber|RoutingNumber|BankAccount|CardNumber|Cardholder|SortCode))[A-Za-z0-9_]{0,24}|(?:(?<![A-Za-z0-9_])(?:SWIFT|swift|IBAN|iban|BIC|CVC|CVV|bic|cvc|cvv)|(?<=[a-z0-9])(?:Swift|Iban|Bic|Cvc|Cvv))(?:[_-]?(?:id|no|num|number|code|value)|Id|No|Num|Number|Code|Value)?)(?:\\s*:\\s*[A-Za-z_$\\[]|\\s*=\\s*(?:models\\.|db\\.Column|Column\\(|sa\\.Column|mapped_column)|\\s*@Column|\\s+[A-Za-z_]*(?:[Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Nn][Vv][Aa][Rr][Cc][Hh][Aa][Rr]|[Tt][Ee][Xx][Tt]|[Cc][Hh][Aa][Rr]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Jj][Ss][Oo][Nn]|[Bb][Oo][Oo][Ll]|[Ii][Nn][Tt]|[Ss][Ee][Rr][Ii][Aa][Ll]|[Dd][Aa][Tt][Ee]|[Tt][Ii][Mm][Ee]|[Dd][Ee][Cc][Ii][Mm][Aa][Ll]|[Nn][Uu][Mm][Ee][Rr][Ii][Cc]|[Uu][Uu][Ii][Dd]|[Bb][Ll][Oo][Bb]|[Bb][Yy][Tt][Ee][Aa]|[Ee][Nn][Uu][Mm]|[Ii][Nn][Ee][Tt]|[Cc][Ii][Tt][Ee][Xx][Tt]|[Mm][Oo][Nn][Ee][Yy]|[Ff][Ll][Oo][Aa][Tt]|[Rr][Ee][Aa][Ll]))", "flags": "", "message": "Payment data. PCI DSS forbids storing CVV at all, and card data widens both the Art. 32 duty and what you must report within 72 hours under Art. 33.", "sev": "warn"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('personal-data-map-dsar-audit');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      // ★s126 — ★심각도를 실어 보낸다. ⛔없으면 min_severity 가 ★전부를 지운다 (내가 만들 뻔한 거짓말)
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null,
                                         sev: r.sev || 'warn' });
    }
  }
  return hits;
}

const SNIPPETS = {};

// ★무료 — ★고른 줄만 본다 (⛔파일 전체가 아니다. 명세가 그렇게 약속하면 ★이것을 찍는다)
async function runSelection() {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.selection.isEmpty) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText(ed.selection);
  const base = ed.selection.start.line;
  const hits = scan(text, ed.document.fileName).map(function (h) {
    return { line: h.line + base, msg: h.msg, fix: h.fix };
  });
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('personal-data-map-dsar-audit');
  const _max = Number(_c.get('max_files')) || 2000;
  const _skip = String(_c.get('exclude_glob') || '**/node_modules/**');
  const files = await vscode.workspace.findFiles('**/*', _skip, _max);
  const rows = [];
  for (const f of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(f);
      rows.push({ file: f.fsPath, hits: scan(doc.getText(), f.fsPath) });
    } catch (e) { /* 열 수 없는 파일은 건너뛴다 */ }
  }
  report(rows);
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const rows = ed ? [{ file: ed.document.fileName, hits: scan(ed.document.getText(), ed.document.fileName) }] : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const flat = [];
  for (const r of rows) for (const h of r.hits) flat.push({ file: r.file, line: h.line, message: h.msg });
  const csv = ['file,line,message'].concat(
    flat.map(function (h) { return [h.file, h.line, String(h.message).replace(/,/g, ' ')].join(','); })
  ).join('\n');
  const esc = function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const html = ['<!doctype html><meta charset="utf-8"><title>report</title>',
    '<table border="1" cellpadding="4"><tr><th>file</th><th>line</th><th>message</th></tr>'
  ].concat(flat.map(function (h) {
    return '<tr><td>' + esc(h.file) + '</td><td>' + h.line + '</td><td>' + esc(h.message) + '</td></tr>';
  })).concat(['</table>']).join('\n');
  // ★설정을 ★먼저 읽는다 (report_format). ⛔기본값이 없을 때만 물어본다.
  const cfgFmt = String(vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'personal-data-map-dsar-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'personal-data-map-dsar-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "personal-data-map-dsar-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('personal-data-map-dsar-audit.audit_file', runCurrent);
  reg('personal-data-map-dsar-audit.audit_selection', runSelection);
  reg('personal-data-map-dsar-audit.list_rules', listRules);
  reg('personal-data-map-dsar-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('personal-data-map-dsar-audit.export_report', function () { return exportReport(ctx); });
  reg('personal-data-map-dsar-audit.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('personal-data-map-dsar-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
