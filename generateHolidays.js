import Holidays from 'date-holidays';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const countries = [
    { code: 'US', language: 'en', dateFormat: 'MM/dd/yyyy' },
    { code: 'JP', language: 'ja', dateFormat: 'yyyy/MM/dd' },
    { code: 'DE', language: 'de', dateFormat: 'dd/MM/yyyy' },
    { code: 'FR', language: 'fr', dateFormat: 'dd/MM/yyyy' },
    { code: 'CN', language: 'zh', dateFormat: 'yyyy-MM-dd' },
    { code: 'KR', language: 'ko', dateFormat: 'yyyy-MM-dd' },
    { code: 'CA', language: 'en', dateFormat: 'yyyy-MM-dd' }
];

function formatHoliday(country, holiday) {
    const date = new Date(holiday.date);
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    const formatter = new Intl.DateTimeFormat(country.language, options);
    const parts = formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    const year = parts.year;
    const month = parts.month.padStart(2, '0');
    const day = parts.day.padStart(2, '0');
    const weekday = parts.weekday;
    let formattedDate;

    switch (country.dateFormat) {
        case 'MM/dd/yyyy':
            formattedDate = `${month}/${day}/${year}`;
            break;
        case 'yyyy/MM/dd':
            formattedDate = `${year}/${month}/${day}`;
            break;
        case 'dd/MM/yyyy':
            formattedDate = `${day}/${month}/${year}`;
            break;
        case 'dd-MM-yyyy':
            formattedDate = `${day}-${month}-${year}`;
            break;
        case 'yyyy-MM-dd':
            formattedDate = `${year}-${month}-${day}`;
            break;
    }

    return `${formattedDate} ${weekday} ${holiday.name}`;
}

const outputDir = './public/i18n/holidays';
if (!existsSync(outputDir)) {
    mkdirSync(outputDir);
}

const currentYear = new Date().getFullYear();
for (let country of countries) {
    const hd = new Holidays(country.code, country.region || '');
    hd.setLanguages(country.language);
    let allHolidays = [];

    for (let year = currentYear - 2; year <= currentYear + 5; year++) {
        allHolidays = allHolidays.concat(hd.getHolidays(year).filter(h => h.type !== 'observance'));
    }

    const formattedHolidays = allHolidays.map(holiday => formatHoliday(country, holiday)).join('\n');
    writeFileSync(join(outputDir, `${country.code}.txt`), formattedHolidays, { encoding: 'utf8' });
}
