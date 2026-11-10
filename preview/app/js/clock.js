// TimePeace time math and formatting. No DOM here.

// Curated list: [IANA zone, City, Country, State (US only)]. The first entry for a zone names it.
export const CURATED = [
  ['America/New_York','New York','United States','New York'],['America/Chicago','Chicago','United States','Illinois'],
  ['America/Denver','Denver','United States','Colorado'],['America/Los_Angeles','Los Angeles','United States','California'],
  ['America/Anchorage','Anchorage','United States','Alaska'],['Pacific/Honolulu','Honolulu','United States','Hawaii'],
  // Every state capital (Denver and Honolulu are above) and Washington, D.C.
  ['America/New_York','Washington','United States','District of Columbia'],['America/Chicago','Montgomery','United States','Alabama'],
  ['America/Juneau','Juneau','United States','Alaska'],['America/Phoenix','Phoenix','United States','Arizona'],
  ['America/Chicago','Little Rock','United States','Arkansas'],['America/Los_Angeles','Sacramento','United States','California'],
  ['America/New_York','Hartford','United States','Connecticut'],['America/New_York','Dover','United States','Delaware'],
  ['America/New_York','Tallahassee','United States','Florida'],['America/New_York','Atlanta','United States','Georgia'],
  ['America/Boise','Boise','United States','Idaho'],['America/Chicago','Springfield','United States','Illinois'],
  ['America/Indiana/Indianapolis','Indianapolis','United States','Indiana'],['America/Chicago','Des Moines','United States','Iowa'],
  ['America/Chicago','Topeka','United States','Kansas'],['America/New_York','Frankfort','United States','Kentucky'],
  ['America/Chicago','Baton Rouge','United States','Louisiana'],['America/New_York','Augusta','United States','Maine'],
  ['America/New_York','Annapolis','United States','Maryland'],['America/New_York','Boston','United States','Massachusetts'],
  ['America/Detroit','Lansing','United States','Michigan'],['America/Chicago','Saint Paul','United States','Minnesota'],
  ['America/Chicago','Jackson','United States','Mississippi'],['America/Chicago','Jefferson City','United States','Missouri'],
  ['America/Denver','Helena','United States','Montana'],['America/Chicago','Lincoln','United States','Nebraska'],
  ['America/Los_Angeles','Carson City','United States','Nevada'],['America/New_York','Concord','United States','New Hampshire'],
  ['America/New_York','Trenton','United States','New Jersey'],['America/Denver','Santa Fe','United States','New Mexico'],
  ['America/New_York','Albany','United States','New York'],['America/New_York','Raleigh','United States','North Carolina'],
  ['America/Chicago','Bismarck','United States','North Dakota'],['America/New_York','Columbus','United States','Ohio'],
  ['America/Chicago','Oklahoma City','United States','Oklahoma'],['America/Los_Angeles','Salem','United States','Oregon'],
  ['America/New_York','Harrisburg','United States','Pennsylvania'],['America/New_York','Providence','United States','Rhode Island'],
  ['America/New_York','Columbia','United States','South Carolina'],['America/Chicago','Pierre','United States','South Dakota'],
  ['America/Chicago','Nashville','United States','Tennessee'],['America/Chicago','Austin','United States','Texas'],
  ['America/Denver','Salt Lake City','United States','Utah'],['America/New_York','Montpelier','United States','Vermont'],
  ['America/New_York','Richmond','United States','Virginia'],['America/Los_Angeles','Olympia','United States','Washington'],
  ['America/New_York','Charleston','United States','West Virginia'],['America/Chicago','Madison','United States','Wisconsin'],
  ['America/Denver','Cheyenne','United States','Wyoming'],
  ['America/Toronto','Toronto','Canada'],['America/Vancouver','Vancouver','Canada'],
  ['America/Mexico_City','Mexico City','Mexico'],['America/Bogota','Bogotá','Colombia'],
  ['America/Lima','Lima','Peru'],['America/Santiago','Santiago','Chile'],
  ['America/Sao_Paulo','São Paulo','Brazil'],['America/Argentina/Buenos_Aires','Buenos Aires','Argentina'],
  ['America/Caracas','Caracas','Venezuela'],['America/Havana','Havana','Cuba'],
  ['America/Panama','Panama City','Panama'],['America/Guatemala','Guatemala City','Guatemala'],
  ['Europe/London','London','United Kingdom'],['Europe/Dublin','Dublin','Ireland'],
  ['Europe/Lisbon','Lisbon','Portugal'],['Europe/Madrid','Madrid','Spain'],
  ['Europe/Paris','Paris','France'],['Europe/Brussels','Brussels','Belgium'],
  ['Europe/Amsterdam','Amsterdam','Netherlands'],['Europe/Berlin','Berlin','Germany'],
  ['Europe/Zurich','Zurich','Switzerland'],['Europe/Rome','Rome','Italy'],
  ['Europe/Vienna','Vienna','Austria'],['Europe/Prague','Prague','Czechia'],
  ['Europe/Warsaw','Warsaw','Poland'],['Europe/Stockholm','Stockholm','Sweden'],
  ['Europe/Oslo','Oslo','Norway'],['Europe/Copenhagen','Copenhagen','Denmark'],
  ['Europe/Helsinki','Helsinki','Finland'],['Europe/Athens','Athens','Greece'],
  ['Europe/Istanbul','Istanbul','Turkey'],['Europe/Kyiv','Kyiv','Ukraine'],
  ['Europe/Moscow','Moscow','Russia'],['Africa/Cairo','Cairo','Egypt'],
  ['Africa/Lagos','Lagos','Nigeria'],['Africa/Accra','Accra','Ghana'],
  ['Africa/Nairobi','Nairobi','Kenya'],['Africa/Addis_Ababa','Addis Ababa','Ethiopia'],
  ['Africa/Johannesburg','Johannesburg','South Africa'],['Africa/Casablanca','Casablanca','Morocco'],
  ['Asia/Jerusalem','Jerusalem','Israel'],['Asia/Riyadh','Riyadh','Saudi Arabia'],
  ['Asia/Dubai','Dubai','United Arab Emirates'],['Asia/Tehran','Tehran','Iran'],
  ['Asia/Karachi','Karachi','Pakistan'],['Asia/Kolkata','Mumbai','India'],
  ['Asia/Kolkata','New Delhi','India'],['Asia/Dhaka','Dhaka','Bangladesh'],
  ['Asia/Kathmandu','Kathmandu','Nepal'],['Asia/Colombo','Colombo','Sri Lanka'],
  ['Asia/Bangkok','Bangkok','Thailand'],['Asia/Ho_Chi_Minh','Ho Chi Minh City','Vietnam'],
  ['Asia/Jakarta','Jakarta','Indonesia'],['Asia/Kuala_Lumpur','Kuala Lumpur','Malaysia'],
  ['Asia/Singapore','Singapore','Singapore'],['Asia/Manila','Manila','Philippines'],
  ['Asia/Hong_Kong','Hong Kong','Hong Kong'],['Asia/Taipei','Taipei','Taiwan'],
  ['Asia/Shanghai','Shanghai','China'],['Asia/Shanghai','Beijing','China'],
  ['Asia/Seoul','Seoul','South Korea'],['Asia/Tokyo','Tokyo','Japan'],
  ['Australia/Perth','Perth','Australia'],['Australia/Adelaide','Adelaide','Australia'],
  ['Australia/Brisbane','Brisbane','Australia'],['Australia/Sydney','Sydney','Australia'],
  ['Australia/Melbourne','Melbourne','Australia'],['Pacific/Auckland','Auckland','New Zealand'],
  ['Pacific/Fiji','Suva','Fiji'],['Atlantic/Reykjavik','Reykjavik','Iceland'],
  ['UTC','UTC','Coordinated Universal Time']
];

// All zones the browser knows, merged with curated labels.
export const ALL = (() => {
  let ids = [];
  try { ids = Intl.supportedValuesOf('timeZone'); } catch (e) { ids = CURATED.map(c => c[0]); }
  const map = new Map();
  CURATED.forEach(([tz, city, country, state]) => map.set(city + '|' + tz, state ? { tz, city, country, state } : { tz, city, country }));
  ids.forEach(tz => {
    const city = tz.split('/').pop().replace(/_/g, ' ');
    const region = tz.includes('/') ? tz.split('/')[0].replace(/_/g, ' ') : '';
    const key = city + '|' + tz;
    if (!map.has(key)) map.set(key, { tz, city, country: region });
  });
  return [...map.values()];
})();

// The clock every view reads: real time plus the whole hour offset of the scrubber.
let offsetHours = 0;
export function setOffsetHours(h) { offsetHours = h; }
export function getOffsetHours() { return offsetHours; }
export function appNow() { return new Date(Date.now() + offsetHours * 3600000); }

export function localZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
}

// Friendly label for the local zone, for example "Chicago" from America/Chicago.
export function localCityLabel() {
  const tz = localZone();
  const hit = CURATED.find(c => c[0] === tz);
  return hit ? hit[1] : tz.split('/').pop().replace(/_/g, ' ');
}

const partCache = new Map();
function fmt(tz, opts) {
  const key = tz + JSON.stringify(opts);
  let f = partCache.get(key);
  if (!f) { f = new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, opts)); partCache.set(key, f); }
  return f;
}

export function parts(tz, d, opts) {
  const p = fmt(tz, opts).formatToParts(d);
  const m = {}; p.forEach(x => m[x.type] = x.value);
  return m;
}

export function zoneOffsetMin(tz, d) {
  try {
    const m = parts(tz, d, { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
    return Math.round((asUTC - d.getTime()) / 60000);
  } catch (e) { return null; }
}

export function fmtDiff(mins) {
  if (mins === 0) return 'same time';
  const sign = mins > 0 ? '+' : '-';
  const a = Math.abs(mins);
  const h = Math.floor(a / 60), mm = a % 60;
  return sign + h + (mm ? ':' + String(mm).padStart(2, '0') : '') + 'h';
}

// The two date formatters are kept per zone: building them each second was the costliest part of the tick.
const dayCache = new Map();
function dayFmt(tz) {
  const key = tz || 'local';
  let f = dayCache.get(key);
  if (!f) { f = new Intl.DateTimeFormat('en-CA', Object.assign({ year: 'numeric', month: '2-digit', day: '2-digit' }, tz ? { timeZone: tz } : {})); dayCache.set(key, f); }
  return f;
}
export function dayRelation(tz, d) {
  try {
    const there = dayFmt(tz).format(d);
    const here = dayFmt(null).format(d);
    if (there > here) return 'Tomorrow';
    if (there < here) return 'Yesterday';
    return '';
  } catch (e) { return ''; }
}

// Hour (0 to 23) and minute in a zone at a given instant.
export function hourMinuteIn(tz, d) {
  const m = parts(tz, d, { hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
  return { h: +m.hour % 24, m: +m.minute };
}

// The one label people read as text follows their own locale; the parts machinery above stays on
// en-US because the tick does arithmetic on its digits.
const dateCache = new Map();
export function dateLabelIn(tz, d) {
  try {
    let f = dateCache.get(tz);
    if (!f) { f = new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }); dateCache.set(tz, f); }
    return f.format(d);
  } catch (e) { return ''; }
}

// Search text: lower case, no diacritics, plus the older or other language name people still type.
const ALIASES = { 'Kyiv': 'Kiev', 'Mumbai': 'Bombay', 'Kolkata': 'Calcutta', 'Chennai': 'Madras', 'Beijing': 'Peking', 'Ho Chi Minh City': 'Saigon', 'Yangon': 'Rangoon',
  'Zurich': 'Zürich', 'Vienna': 'Wien', 'Munich': 'München', 'Cologne': 'Köln', 'Prague': 'Praha', 'Warsaw': 'Warszawa', 'Lisbon': 'Lisboa', 'Rome': 'Roma', 'Copenhagen': 'København',
  'Moscow': 'Moskva', 'Athens': 'Athina', 'Bangkok': 'Krung Thep', 'Seoul': 'Soul', 'Tokyo': 'Tokio', 'Mexico City': 'Ciudad de Mexico', 'Cairo': 'Al Qahirah', 'Jakarta': 'Djakarta', 'Casablanca': 'Dar el Beida' };
// Country names people type instead of the one on the list.
const COUNTRY_ALIASES = { 'United States': 'USA US America', 'United Kingdom': 'UK Britain England', 'United Arab Emirates': 'UAE', 'Czechia': 'Czech Republic', 'South Korea': 'Korea', 'Netherlands': 'Holland', 'Coordinated Universal Time': 'GMT Zulu' };
export function fold(text) { return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function searchText(z) { return fold(z.city + ' ' + (ALIASES[z.city] || '') + ' ' + (z.state || '') + ' ' + z.country + ' ' + (COUNTRY_ALIASES[z.country] || '') + ' ' + z.tz.replace(/_/g, ' ')); }
// The line under a city: "Texas, United States" for a state capital, the country otherwise.
export function regionLabel(z) { return z.state ? z.state + ', ' + (z.country || '') : (z.country || ''); }

// Three letter country codes for the ticker. Falls back to the first three letters.
const CC = { 'United States': 'USA', 'Canada': 'CAN', 'Mexico': 'MEX', 'Colombia': 'COL', 'Peru': 'PER', 'Chile': 'CHL', 'Brazil': 'BRA', 'Argentina': 'ARG', 'Venezuela': 'VEN', 'Cuba': 'CUB', 'Panama': 'PAN', 'Guatemala': 'GTM',
  'United Kingdom': 'GBR', 'Ireland': 'IRL', 'Portugal': 'PRT', 'Spain': 'ESP', 'France': 'FRA', 'Belgium': 'BEL', 'Netherlands': 'NLD', 'Germany': 'DEU', 'Switzerland': 'CHE', 'Italy': 'ITA', 'Austria': 'AUT', 'Czechia': 'CZE', 'Poland': 'POL', 'Sweden': 'SWE', 'Norway': 'NOR', 'Denmark': 'DNK', 'Finland': 'FIN', 'Greece': 'GRC', 'Turkey': 'TUR', 'Ukraine': 'UKR', 'Russia': 'RUS',
  'Egypt': 'EGY', 'Nigeria': 'NGA', 'Ghana': 'GHA', 'Kenya': 'KEN', 'Ethiopia': 'ETH', 'South Africa': 'ZAF', 'Morocco': 'MAR', 'Israel': 'ISR', 'Saudi Arabia': 'SAU', 'United Arab Emirates': 'UAE', 'Iran': 'IRN', 'Pakistan': 'PAK', 'India': 'IND', 'Bangladesh': 'BGD', 'Nepal': 'NPL', 'Sri Lanka': 'LKA', 'Thailand': 'THA', 'Vietnam': 'VNM', 'Indonesia': 'IDN', 'Malaysia': 'MYS', 'Singapore': 'SGP', 'Philippines': 'PHL', 'Hong Kong': 'HKG', 'Taiwan': 'TWN', 'China': 'CHN', 'South Korea': 'KOR', 'Japan': 'JPN', 'Australia': 'AUS', 'New Zealand': 'NZL', 'Fiji': 'FJI', 'Iceland': 'ISL', 'Coordinated Universal Time': 'UTC' };
// Countries outside the table get their code from the city data (which carries ISO codes) when a
// caller passes one; a bare name falls back to its first three letters without diacritics.
export function countryCode(country, iso) {
  if (iso && /^[A-Z]{2,3}$/i.test(iso)) return iso.toUpperCase();
  if (!country) return '';
  if (CC[country]) return CC[country];
  return fold(country).replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();
}

export function pad2(n) { return String(n).padStart(2, '0'); }

export function toMilitary(h, m) { return pad2(h) + pad2(m); }

export function to12h(h, m) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ':' + pad2(m) + ' ' + (h < 12 ? 'AM' : 'PM');
}

// Format a time in the user's clock mode. mode is '12', '24', or 'both'.
export function formatMode(h, m, mode) {
  if (mode === '24') return pad2(h) + ':' + pad2(m);
  if (mode === 'both') return to12h(h, m) + ' (' + toMilitary(h, m) + ')';
  return to12h(h, m);
}

// Loose parse of a typed time. Returns { h, m, hadMeridiem } or null.
// Accepts 1430, 14:30, 2:30 PM, 2:30pm, 230pm, 2 pm, 0000, 12:00 am, and similar.
export function parseTimeInput(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  if (!s) return null;
  let mer = null;
  const mm = s.match(/(am|pm|a|p)$/);
  if (mm) { mer = mm[1][0]; s = s.slice(0, -mm[1].length); }
  if (!s) return null;
  let h, m;
  const colon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) { h = +colon[1]; m = +colon[2]; }
  else if (/^\d{1,2}$/.test(s)) { h = +s; m = 0; }
  else if (/^\d{3}$/.test(s)) { h = +s[0]; m = +s.slice(1); }
  else if (/^\d{4}$/.test(s)) { h = +s.slice(0, 2); m = +s.slice(2); }
  else return null;
  if (m > 59) return null;
  if (mer) {
    if (h < 1 || h > 12) return null;
    if (mer === 'a') h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  } else if (h > 23) return null;
  return { h, m, hadMeridiem: !!mer };
}
