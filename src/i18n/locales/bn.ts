// Bengali (বাংলা) — genuine partial locale.
// Only confident translations are included; missing keys fall back to English.
// This is a real, extensible i18n file — no invented/placeholder strings.
import type { LocaleDict } from '../index';

const bn: LocaleDict = {
  common: {
    appName: 'মেমোরিকেয়ার',
    continue: 'চালিয়ে যান',
    back: 'পিছনে',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ করুন',
    delete: 'মুছুন',
    edit: 'সম্পাদনা',
    close: 'বন্ধ করুন',
    add: 'যোগ করুন',
    done: 'সম্পন্ন',
    complete: 'সম্পূর্ণ',
    retry: 'আবার চেষ্টা করুন',
    readScreen: 'স্ক্রিন পড়ুন',
    listen: 'শুনুন',
    readAloud: 'জোরে পড়ুন',
    yes: 'হ্যাঁ',
    no: 'না',
  },
  nav: {
    home: 'হোম',
    games: 'খেলা',
    reminders: 'রিমাইন্ডার',
    progress: 'অগ্রগতি',
    settings: 'সেটিংস',
    overview: 'সারসংক্ষেপ',
    alerts: 'বিজ্ঞপ্তি',
    patient: 'রোগী',
  },
  welcome: {
    getStarted: 'শুরু করুন',
    iAmCaregiver: 'আমি একজন পরিচর্যাকারী',
    language: 'ভাষা',
    goodMorning: 'শুভ সকাল',
    goodAfternoon: 'শুভ অপরাহ্ন',
    goodEvening: 'শুভ সন্ধ্যা',
  },
  language: {
    title: 'আপনার ভাষা নির্বাচন করুন',
    selected: 'নির্বাচিত',
    select: 'নির্বাচন করুন',
  },
  games: {
    title: 'স্মৃতির খেলা',
    play: 'খেলুন',
    picturePairs: 'ছবির জোড়া',
    patternRecall: 'ক্রম মনে রাখা',
    dailyRoutine: 'দৈনন্দিন রুটিন',
  },
  reminders: {
    title: 'আজকের রিমাইন্ডার',
    addNew: 'নতুন রিমাইন্ডার যোগ করুন',
    completed: 'সম্পন্ন হয়েছে',
  },
  progress: {
    title: 'আপনার অগ্রগতি',
  },
  settings: {
    title: 'সেটিংস',
    on: 'চালু',
    off: 'বন্ধ',
  },
};

export default bn;
