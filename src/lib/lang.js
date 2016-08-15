'use strict'

const languages = [  
  {  
    name: 'afrikaans',
    code: 'af'
  },
  {  
    name: 'albanian',
    code: 'sq'
  },
  {  
    name: 'arabic',
    code: 'ar'
  },
  {  
    name: 'armenian',
    code: 'hy'
  },
  {  
    name: 'azerbaijani',
    code: 'az'
  },
  {  
    name: 'basque',
    code: 'eu'
  },
  {  
    name: 'belarusian',
    code: 'be'
  },
  {  
    name: 'bengali',
    code: 'bn'
  },
  {  
    name: 'bosnian',
    code: 'bs'
  },
  {  
    name: 'bulgarian',
    code: 'bg'
  },
  {  
    name: 'catalan',
    code: 'ca'
  },
  {  
    name: 'cebuano',
    code: 'ceb'
  },
  {  
    name: 'chichewa',
    code: 'ny'
  },
  {  
    name: 'croatian',
    code: 'hr'
  },
  {  
    name: 'czech',
    code: 'cs'
  },
  {  
    name: 'danish',
    code: 'da'
  },
  {  
    name: 'dutch',
    code: 'nl'
  },
  {  
    name: 'english',
    code: 'en'
  },
  {  
    name: 'esperanto',
    code: 'eo'
  },
  {  
    name: 'estonian',
    code: 'et'
  },
  {  
    name: 'filipino',
    code: 'tl'
  },
  {  
    name: 'finnish',
    code: 'fi'
  },
  {  
    name: 'french',
    code: 'fr'
  },
  {  
    name: 'galician',
    code: 'gl'
  },
  {  
    name: 'georgian',
    code: 'ka'
  },
  {  
    name: 'german',
    code: 'de'
  },
  {  
    name: 'greek',
    code: 'el'
  },
  {  
    name: 'gujarati',
    code: 'gu'
  },
  {  
    name: 'haitian creole',
    code: 'ht'
  },
  {  
    name: 'hausa',
    code: 'ha'
  },
  {  
    name: 'hebrew',
    code: 'iw'
  },
  {  
    name: 'hindi',
    code: 'hi'
  },
  {  
    name: 'hmong',
    code: 'hmn'
  },
  {  
    name: 'hungarian',
    code: 'hu'
  },
  {  
    name: 'icelandic',
    code: 'is'
  },
  {  
    name: 'igbo',
    code: 'ig'
  },
  {  
    name: 'indonesian',
    code: 'id'
  },
  {  
    name: 'irish',
    code: 'ga'
  },
  {  
    name: 'italian',
    code: 'it'
  },
  {  
    name: 'japanese',
    code: 'ja'
  },
  {  
    name: 'javanese',
    code: 'jw'
  },
  {  
    name: 'kannada',
    code: 'kn'
  },
  {  
    name: 'kazakh',
    code: 'kk'
  },
  {  
    name: 'khmer',
    code: 'km'
  },
  {  
    name: 'korean',
    code: 'ko'
  },
  {  
    name: 'lao',
    code: 'lo'
  },
  {  
    name: 'latin',
    code: 'la'
  },
  {  
    name: 'latvian',
    code: 'lv'
  },
  {  
    name: 'lithuanian',
    code: 'lt'
  },
  {  
    name: 'macedonian',
    code: 'mk'
  },
  {  
    name: 'malagasy',
    code: 'mg'
  },
  {  
    name: 'malay',
    code: 'ms'
  },
  {  
    name: 'malayalam',
    code: 'ml'
  },
  {  
    name: 'maltese',
    code: 'mt'
  },
  {  
    name: 'mandarin',
    code: 'zh-CN'
  },
  {  
    name: 'maori',
    code: 'mi'
  },
  {  
    name: 'marathi',
    code: 'mr'
  },
  {  
    name: 'mongolian',
    code: 'mn'
  },
  {  
    name: 'burmese',
    code: 'my'
  },
  {  
    name: 'nepali',
    code: 'ne'
  },
  {  
    name: 'norwegian',
    code: 'no'
  },
  {  
    name: 'persian',
    code: 'fa'
  },
  {  
    name: 'polish',
    code: 'pl'
  },
  {  
    name: 'portuguese',
    code: 'pt'
  },
  {  
    name: 'punjabi',
    code: 'ma'
  },
  {  
    name: 'romanian',
    code: 'ro'
  },
  {  
    name: 'russian',
    code: 'ru'
  },
  {  
    name: 'serbian',
    code: 'sr'
  },
  {  
    name: 'sesotho',
    code: 'st'
  },
  {  
    name: 'sinhala',
    code: 'si'
  },
  {  
    name: 'slovak',
    code: 'sk'
  },
  {  
    name: 'slovenian',
    code: 'sl'
  },
  {  
    name: 'somali',
    code: 'so'
  },
  {  
    name: 'spanish',
    code: 'es'
  },
  {  
    name: 'sudanese',
    code: 'su'
  },
  {  
    name: 'swahili',
    code: 'sw'
  },
  {  
    name: 'swedish',
    code: 'sv'
  },
  {  
    name: 'tajik',
    code: 'tg'
  },
  {  
    name: 'tamil',
    code: 'ta'
  },
  {  
    name: 'telugu',
    code: 'te'
  },
  {  
    name: 'thai',
    code: 'th'
  },
  {  
    name: 'turkish',
    code: 'tr'
  },
  {  
    name: 'ukrainian',
    code: 'uk'
  },
  {  
    name: 'urdu',
    code: 'ur'
  },
  {  
    name: 'uzbek',
    code: 'uz'
  },
  {  
    name: 'vietnamese',
    code: 'vi'
  },
  {  
    name: 'welsh',
    code: 'cy'
  },
  {  
    name: 'yiddish',
    code: 'yi'
  },
  {  
    name: 'yoruba',
    code: 'yo'
  },
  {  
    name: 'zulu',
    code: 'zu'
  }
]

module.exports = languages