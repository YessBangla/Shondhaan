export interface District {
  name: string;
  nameBn: string;
  thanas?: string[];
  thanasEn?: string[];
}

// English-to-Bangla thana name mapping for search
export const thanaEnMap: Record<string, string> = {
  // Dhaka district
  "gulshan": "গুলশান", "banani": "বনানী", "uttara": "উত্তরা", "mirpur": "মিরপুর",
  "mohammadpur": "মোহাম্মদপুর", "dhanmondi": "ধানমন্ডি", "lalbag": "লালবাগ", "lalbagh": "লালবাগ",
  "motijheel": "মতিঝিল", "ramna": "রমনা", "tejgaon": "তেজগাঁও", "shahbag": "শাহবাগ",
  "paltan": "পল্টন", "newmarket": "নিউমার্কেট", "jatrabari": "যাত্রাবাড়ী",
  "kadamtali": "কদমতলী", "shyampur": "শ্যামপুর", "hazaribag": "হাজারীবাগ", "hazaribagh": "হাজারীবাগ",
  "kamrangirchar": "কামরাঙ্গীরচর", "badda": "বাড্ডা", "khilgaon": "খিলগাঁও",
  "rampura": "রামপুরা", "adabor": "আদাবর", "kafrul": "কাফরুল", "turag": "তুরাগ",
  "dakshinkhan": "দক্ষিণখান", "uttarkhan": "উত্তরখান", "pallabi": "পল্লবী",
  "shah ali": "শাহ আলী", "cantonment": "ক্যান্টনমেন্ট", "demra": "ডেমরা",
  "sutrapur": "সূত্রাপুর", "wari": "ওয়ারী", "kotwali": "কোতোয়ালী",
  "chawkbazar": "চকবাজার", "bangshal": "বংশাল", "gendaria": "গেন্ডারিয়া",
  "sabujbag": "সবুজবাগ", "khilkhet": "খিলক্ষেত", "vatara": "ভাটারা",
  "darus salam": "দারুস সালাম", "sher e bangla nagar": "শেরেবাংলা নগর",
  // Gazipur
  "gazipur sadar": "গাজীপুর সদর", "kaliakair": "কালিয়াকৈর", "kaliganj": "কালীগঞ্জ",
  "kapasia": "কাপাসিয়া", "sreepur": "শ্রীপুর", "tongi": "টঙ্গী",
  // Narayanganj
  "narayanganj sadar": "নারায়ণগঞ্জ সদর", "araihazar": "আড়াইহাজার", "bandar": "বন্দর",
  "rupganj": "রূপগঞ্জ", "sonargaon": "সোনারগাঁও",
  // Tangail
  "tangail sadar": "টাঙ্গাইল সদর", "basail": "বাসাইল", "bhuapur": "ভুয়াপুর",
  "delduar": "দেলদুয়ার", "dhanbari": "ধনবাড়ী", "ghatail": "ঘাটাইল",
  "gopalpur": "গোপালপুর", "kalihati": "কালিহাতি", "madhupur": "মধুপুর",
  "mirzapur": "মির্জাপুর", "nagarpur": "নাগরপুর", "sakhipur": "সখিপুর",
  // Kishoreganj
  "kishoreganj sadar": "কিশোরগঞ্জ সদর", "austagram": "অষ্টগ্রাম", "bajitpur": "বাজিতপুর",
  "bhairab": "ভৈরব", "hossainpur": "হোসেনপুর", "itna": "ইটনা", "karimganj": "করিমগঞ্জ",
  "katiadi": "কটিয়াদী", "kuliarchar": "কুলিয়ারচর", "mithamain": "মিঠামইন",
  "nikli": "নিকলী", "pakundia": "পাকুন্দিয়া", "tarail": "তাড়াইল",
  // Manikganj
  "manikganj sadar": "মানিকগঞ্জ সদর", "ghior": "ঘিওর", "harirampur": "হরিরামপুর",
  "saturia": "সাটুরিয়া", "shibalaya": "শিবালয়", "singair": "সিংগাইর", "daulatpur": "দৌলতপুর",
  // Munshiganj
  "munshiganj sadar": "মুন্সিগঞ্জ সদর", "gazaria": "গজারিয়া", "louhajang": "লৌহজং",
  "sirajdikhan": "সিরাজদিখান", "srinagar": "শ্রীনগর", "tongibari": "টঙ্গীবাড়ী",
  // Narsingdi
  "narsingdi sadar": "নরসিংদী সদর", "belabo": "বেলাবো", "monohardi": "মনোহরদী",
  "palash": "পলাশ", "raipura": "রায়পুরা", "shibpur": "শিবপুর",
  // Faridpur
  "faridpur sadar": "ফরিদপুর সদর", "alfadanga": "আলফাডাঙ্গা", "bhanga": "ভাঙ্গা",
  "boalmari": "বোয়ালমারী", "charbhadrasan": "চরভদ্রাসন", "madhukhali": "মধুখালী",
  "nagarkanda": "নগরকান্দা", "sadarpur": "সদরপুর", "saltha": "সালথা",
  // Gopalganj
  "gopalganj sadar": "গোপালগঞ্জ সদর", "kashiani": "কাশিয়ানী", "kotalipara": "কোটালীপাড়া",
  "muksudpur": "মুকসুদপুর", "tungipara": "টুঙ্গিপাড়া",
  // Madaripur
  "madaripur sadar": "মাদারীপুর সদর", "kalkini": "কালকিনি", "rajoir": "রাজৈর", "shibchar": "শিবচর",
  // Rajbari
  "rajbari sadar": "রাজবাড়ী সদর", "baliakandi": "বালিয়াকান্দি", "goalanda": "গোয়ালন্দ",
  "pangsha": "পাংশা", "kalukhali": "কালুখালী",
  // Shariatpur
  "shariatpur sadar": "শরীয়তপুর সদর", "bhedarganj": "ভেদরগঞ্জ", "damudya": "ডামুড্যা",
  "gosairhat": "গোসাইরহাট", "naria": "নড়িয়া", "zajira": "জাজিরা", "jajira": "জাজিরা",
  // Chittagong
  "pahartali": "পাহাড়তলী", "panchlaish": "পাঁচলাইশ", "bayezid": "বায়েজিদ",
  "chandgaon": "চান্দগাঁও", "double mooring": "ডবলমুরিং", "bakalia": "বাকলিয়া",
  "halishahar": "হালিশহর", "patenga": "পতেঙ্গা", "akbar shah": "আকবর শাহ",
  "karnaphuli": "কর্ণফুলী", "sandwip": "সন্দ্বীপ", "sitakunda": "সীতাকুণ্ড",
  "mirsharai": "মীরসরাই", "fatikchhari": "ফটিকছড়ি", "raozan": "রাউজান",
  "rangunia": "রাঙ্গুনিয়া", "boalkhali": "বোয়ালখালী", "anowara": "আনোয়ারা",
  "patiya": "পটিয়া", "chandanaish": "চন্দনাইশ", "satkania": "সাতকানিয়া",
  "lohagara": "লোহাগাড়া", "banshkhali": "বাঁশখালী", "hathazari": "হাটহাজারী",
  // Comilla
  "comilla sadar": "কুমিল্লা সদর", "comilla sadar dakshin": "কুমিল্লা সদর দক্ষিণ",
  "barura": "বরুড়া", "brahmanpara": "ব্রাহ্মণপাড়া", "burichang": "বুড়িচং",
  "chandina": "চান্দিনা", "chauddagram": "চৌদ্দগ্রাম", "daudkandi": "দাউদকান্দি",
  "debidwar": "দেবিদ্বার", "homna": "হোমনা", "laksam": "লাকসাম", "meghna": "মেঘনা",
  "monohargonj": "মনোহরগঞ্জ", "muradnagar": "মুরাদনগর", "nangalkot": "নাঙ্গলকোট", "titas": "তিতাস",
  // Cox's Bazar
  "cox's bazar sadar": "কক্সবাজার সদর", "coxs bazar": "কক্সবাজার সদর", "chakaria": "চকরিয়া",
  "kutubdia": "কুতুবদিয়া", "moheshkhali": "মহেশখালী", "pekua": "পেকুয়া",
  "ramu": "রামু", "teknaf": "টেকনাফ", "ukhia": "উখিয়া",
  // Feni
  "feni sadar": "ফেনী সদর", "chhagalnaiya": "ছাগলনাইয়া", "daganbhuiyan": "দাগনভূঞা",
  "parshuram": "পরশুরাম", "sonagazi": "সোনাগাজী", "fulgazi": "ফুলগাজী",
  // Lakshmipur
  "lakshmipur sadar": "লক্ষ্মীপুর সদর", "kamalnagar": "কমলনগর", "raipur": "রায়পুর",
  "ramganj": "রামগঞ্জ", "ramgati": "রামগতি",
  // Noakhali
  "noakhali sadar": "নোয়াখালী সদর", "begumganj": "বেগমগঞ্জ", "chatkhil": "চাটখিল",
  "companiganj": "কোম্পানীগঞ্জ", "hatiya": "হাতিয়া", "kabirhat": "কবিরহাট",
  "senbag": "সেনবাগ", "sonaimuri": "সোনাইমুড়ী", "subarnachar": "সুবর্ণচর",
  // Brahmanbaria
  "brahmanbaria sadar": "ব্রাহ্মণবাড়িয়া সদর", "akhaura": "আখাউড়া", "ashuganj": "আশুগঞ্জ",
  "banchharampur": "বাঞ্ছারামপুর", "kasba": "কসবা", "nabinagar": "নবীনগর",
  "nasirnagar": "নাসিরনগর", "sarail": "সরাইল", "bijoynagar": "বিজয়নগর",
  // Chandpur
  "chandpur sadar": "চাঁদপুর সদর", "faridganj": "ফরিদগঞ্জ", "haimchar": "হাইমচর",
  "hajiganj": "হাজীগঞ্জ", "kachua": "কচুয়া", "matlab uttar": "মতলব উত্তর",
  "matlab dakshin": "মতলব দক্ষিণ", "shahrasti": "শাহরাস্তি",
  // Rangamati
  "rangamati sadar": "রাঙামাটি সদর", "kaptai": "কাপ্তাই", "kaukhali": "কাউখালী",
  "baghaichhari": "বাঘাইছড়ি", "barkal": "বরকল", "langadu": "লংগদু",
  "rajasthali": "রাজস্থলী", "bilaichhari": "বিলাইছড়ি", "juraichhari": "জুরাছড়ি",
  "naniarchar": "নানিয়ারচর",
  // Bandarban
  "bandarban sadar": "বান্দরবান সদর", "alikadam": "আলীকদম", "lama": "লামা",
  "naikhyongchhari": "নাইক্ষ্যংছড়ি", "rowangchhari": "রোয়াংছড়ি", "ruma": "রুমা", "thanchi": "থানচি",
  // Khagrachhari
  "khagrachhari sadar": "খাগড়াছড়ি সদর", "dighinala": "দীঘিনালা", "laxmichhari": "লক্ষ্মীছড়ি",
  "mahalchhari": "মহালছড়ি", "manikchhari": "মানিকছড়ি", "matiranga": "মাটিরাঙ্গা",
  "panchhari": "পানছড়ি", "ramgarh": "রামগড়", "guimara": "গুইমারা",
  // Rajshahi
  "rajshahi sadar": "রাজশাহী সদর", "bagmara": "বাগমারা", "boalia": "বোয়ালিয়া",
  "charghat": "চারঘাট", "durgapur": "দুর্গাপুর", "godagari": "গোদাগাড়ী",
  "mohanpur": "মোহনপুর", "paba": "পবা", "puthia": "পুঠিয়া", "tanore": "তানোর",
  // Bogra
  "bogra sadar": "বগুড়া সদর", "adamdighi": "আদমদিঘি", "dupchanchia": "দুপচাঁচিয়া",
  "gabtali": "গাবতলী", "kahalu": "কাহালু", "nandigram": "নন্দীগ্রাম",
  "sariakandi": "সারিয়াকান্দি", "shajahanpur": "শাজাহানপুর", "sherpur": "শেরপুর",
  "shibganj": "শিবগঞ্জ", "sonatala": "সোনাতলা", "dhunat": "ধুনট",
  // Pabna
  "pabna sadar": "পাবনা সদর", "atghoria": "আটঘরিয়া", "bera": "বেড়া",
  "bhangura": "ভাঙ্গুড়া", "chatmohar": "চাটমোহর", "ishwardi": "ঈশ্বরদী",
  "santhia": "সাঁথিয়া", "sujanagar": "সুজানগর",
  // Sirajganj
  "sirajganj sadar": "সিরাজগঞ্জ সদর", "belkuchi": "বেলকুচি", "chauhali": "চৌহালী",
  "kamarkhanda": "কামারখন্দ", "kazipur": "কাজীপুর", "raiganj": "রায়গঞ্জ",
  "shahzadpur": "শাহজাদপুর", "tarash": "তাড়াশ", "ullapara": "উল্লাপাড়া",
  // Natore
  "natore sadar": "নাটোর সদর", "bagatipara": "বাগাতিপাড়া", "baraigram": "বড়াইগ্রাম",
  "gurudaspur": "গুরুদাসপুর", "lalpur": "লালপুর", "singra": "সিংড়া", "naldanga": "নলডাঙ্গা",
  // Chapainawabganj
  "chapainawabganj sadar": "চাঁপাইনবাবগঞ্জ সদর", "bholahat": "ভোলাহাট",
  "gomastapur": "গোমস্তাপুর", "nachole": "নাচোল",
  // Naogaon
  "naogaon sadar": "নওগাঁ সদর", "atrai": "আত্রাই", "badalgachhi": "বদলগাছী",
  "dhamoirhat": "ধামইরহাট", "manda": "মান্দা", "mahadebpur": "মহাদেবপুর",
  "niamatpur": "নিয়ামতপুর", "patnitala": "পত্নীতলা", "porsha": "পোরশা",
  "raninagar": "রাণীনগর", "sapahar": "সাপাহার",
  // Joypurhat
  "joypurhat sadar": "জয়পুরহাট সদর", "akkelpur": "আক্কেলপুর", "kalai": "কালাই",
  "khetlal": "ক্ষেতলাল", "panchbibi": "পাঁচবিবি",
  // Khulna
  "khulna sadar": "খুলনা সদর", "batiaghata": "বটিয়াঘাটা", "dacope": "দাকোপ",
  "dumuria": "ডুমুরিয়া", "dighalia": "দিঘলিয়া", "koyra": "কয়রা",
  "paikgachha": "পাইকগাছা", "phultala": "ফুলতলা", "rupsa": "রূপসা",
  "terakhada": "তেরখাদা", "sonadanga": "সোনাডাঙ্গা", "khalishpur": "খালিশপুর",
  // Jessore
  "jessore sadar": "যশোর সদর", "abhaynagar": "অভয়নগর", "bagharpara": "বাঘারপাড়া",
  "chaugachha": "চৌগাছা", "jhikargachha": "ঝিকরগাছা", "keshabpur": "কেশবপুর",
  "manirampur": "মণিরামপুর", "sharsha": "শার্শা",
  // Satkhira
  "satkhira sadar": "সাতক্ষীরা সদর", "assasuni": "আশাশুনি", "debhata": "দেবহাটা",
  "kalaroa": "কলারোয়া", "shyamnagar": "শ্যামনগর", "tala": "তালা",
  // Bagerhat
  "bagerhat sadar": "বাগেরহাট সদর", "chitalmari": "চিতলমারী", "fakirhat": "ফকিরহাট",
  "mollahat": "মোল্লাহাট", "mongla": "মংলা", "morrelganj": "মোরেলগঞ্জ",
  "rampal": "রামপাল", "sarankhola": "শরণখোলা",
  // Narail
  "narail sadar": "নড়াইল সদর", "kalia": "কালিয়া",
  // Magura
  "magura sadar": "মাগুরা সদর", "shalikha": "শালিখা",
  // Kushtia
  "kushtia sadar": "কুষ্টিয়া সদর", "bheramara": "ভেড়ামারা", "khoksa": "খোকসা",
  "kumarkhali": "কুমারখালী",
  // Meherpur
  "meherpur sadar": "মেহেরপুর সদর", "gangni": "গাংনী", "mujibnagar": "মুজিবনগর",
  // Chuadanga
  "chuadanga sadar": "চুয়াডাঙ্গা সদর", "alamdanga": "আলমডাঙ্গা",
  "damurhuda": "দামুড়হুদা", "jibannagar": "জীবননগর",
  // Jhenaidah
  "jhenaidah sadar": "ঝিনাইদহ সদর", "harinakunda": "হরিণাকুণ্ডু",
  "kotchandpur": "কোটচাঁদপুর", "maheshpur": "মহেশপুর", "shailkupa": "শৈলকুপা",
  // Barisal
  "barisal sadar": "বরিশাল সদর", "agailjhara": "আগৈলঝাড়া", "babuganj": "বাবুগঞ্জ",
  "bakerganj": "বাকেরগঞ্জ", "banaripara": "বানারীপাড়া", "gournadi": "গৌরনদী",
  "hijla": "হিজলা", "mehendiganj": "মেহেন্দিগঞ্জ", "muladi": "মুলাদী", "uzirpur": "উজিরপুর",
  // Patuakhali
  "patuakhali sadar": "পটুয়াখালী সদর", "bauphal": "বাউফল", "dashmina": "দশমিনা",
  "dumki": "দুমকি", "galachipa": "গলাচিপা", "kalapara": "কলাপাড়া",
  "mirzaganj": "মির্জাগঞ্জ", "rangabali": "রাঙ্গাবালী",
  // Bhola
  "bhola sadar": "ভোলা সদর", "borhanuddin": "বোরহানউদ্দিন", "charfashion": "চরফ্যাশন",
  "daulatkhan": "দৌলতখান", "lalmohan": "লালমোহন", "manpura": "মনপুরা", "tajumuddin": "তজুমদ্দিন",
  // Pirojpur
  "pirojpur sadar": "পিরোজপুর সদর", "bhandaria": "ভাণ্ডারিয়া",
  "mathbaria": "মঠবাড়িয়া", "nazirpur": "নাজিরপুর", "nesarabad": "নেছারাবাদ", "zianagar": "জিয়ানগর",
  // Barguna
  "barguna sadar": "বরগুনা সদর", "amtali": "আমতলী", "bamna": "বামনা",
  "betagi": "বেতাগী", "pathorghata": "পাথরঘাটা", "taltali": "তালতলী",
  // Jhalokati
  "jhalokati sadar": "ঝালকাঠি সদর", "kathalia": "কাঠালিয়া", "nalchiti": "নলছিটি", "rajapur": "রাজাপুর",
  // Sylhet
  "sylhet sadar": "সিলেট সদর", "balaganj": "বালাগঞ্জ", "bishwanath": "বিশ্বনাথ",
  "fenchuganj": "ফেঞ্চুগঞ্জ", "golapganj": "গোলাপগঞ্জ", "gowainghat": "গোয়াইনঘাট",
  "jaintapur": "জৈন্তাপুর", "kanaighat": "কানাইঘাট", "zakiganj": "জকিগঞ্জ",
  "south surma": "দক্ষিণ সুরমা", "osmani nagar": "ওসমানীনগর",
  // Moulvibazar
  "moulvibazar sadar": "মৌলভীবাজার সদর", "barlekha": "বড়লেখা", "juri": "জুড়ী",
  "kamalganj": "কমলগঞ্জ", "kulaura": "কুলাউড়া", "rajnagar": "রাজনগর", "sreemangal": "শ্রীমঙ্গল",
  // Habiganj
  "habiganj sadar": "হবিগঞ্জ সদর", "ajmiriganj": "আজমিরীগঞ্জ", "bahubal": "বাহুবল",
  "baniachang": "বানিয়াচং", "chunarughat": "চুনারুঘাট", "lakhai": "লাখাই",
  "madhabpur": "মাধবপুর", "nabiganj": "নবীগঞ্জ", "shayestaganj": "শায়েস্তাগঞ্জ",
  // Sunamganj
  "sunamganj sadar": "সুনামগঞ্জ সদর", "chhatak": "ছাতক", "dirai": "দিরাই",
  "dharmapasha": "ধর্মপাশা", "dowarabazar": "দোয়ারাবাজার", "jagannathpur": "জগন্নাথপুর",
  "jamalganj": "জামালগঞ্জ", "shalla": "শাল্লা", "tahirpur": "তাহিরপুর",
  "bishwambarpur": "বিশ্বম্ভরপুর", "dakshin sunamganj": "দক্ষিণ সুনামগঞ্জ",
  // Rangpur
  "rangpur sadar": "রংপুর সদর", "badarganj": "বদরগঞ্জ", "gangachara": "গঙ্গাচড়া",
  "kaunia": "কাউনিয়া", "mithapukur": "মিঠাপুকুর", "pirganj": "পীরগঞ্জ",
  "pirgachha": "পীরগাছা", "taraganj": "তারাগঞ্জ",
  // Dinajpur
  "dinajpur sadar": "দিনাজপুর সদর", "birampur": "বিরামপুর", "biral": "বিরল",
  "birganj": "বীরগঞ্জ", "bochaganj": "বোচাগঞ্জ", "chirirbandar": "চিরিরবন্দর",
  "phulbari": "ফুলবাড়ী", "ghoraghat": "ঘোড়াঘাট", "hakimpur": "হাকিমপুর",
  "khansama": "খানসামা", "nawabganj": "নবাবগঞ্জ", "parbatipur": "পার্বতীপুর",
  // Kurigram
  "kurigram sadar": "কুড়িগ্রাম সদর", "bhurungamari": "ভুরুঙ্গামারী", "chilmari": "চিলমারী",
  "nageshwari": "নাগেশ্বরী", "rajarhat": "রাজারহাট", "rowmari": "রৌমারী",
  "ulipur": "উলিপুর", "rajibpur": "রাজিবপুর",
  // Gaibandha
  "gaibandha sadar": "গাইবান্ধা সদর", "fulchhari": "ফুলছড়ি", "gobindaganj": "গোবিন্দগঞ্জ",
  "palashbari": "পলাশবাড়ী", "sadullapur": "সাদুল্যাপুর", "saghata": "সাঘাটা", "sundarganj": "সুন্দরগঞ্জ",
  // Lalmonirhat
  "lalmonirhat sadar": "লালমনিরহাট সদর", "aditmari": "আদিতমারী", "hatibandha": "হাতীবান্ধা",
  "patgram": "পাটগ্রাম",
  // Nilphamari
  "nilphamari sadar": "নীলফামারী সদর", "dimla": "ডিমলা", "domar": "ডোমার",
  "jaldhaka": "জলঢাকা", "saidpur": "সৈয়দপুর",
  // Panchagarh
  "panchagarh sadar": "পঞ্চগড় সদর", "atwari": "আটোয়ারী", "boda": "বোদা",
  "debiganj": "দেবীগঞ্জ", "tetulia": "তেঁতুলিয়া",
  // Thakurgaon
  "thakurgaon sadar": "ঠাকুরগাঁও সদর", "baliadangi": "বালিয়াডাঙ্গী", "haripur": "হরিপুর",
  "ranisankail": "রাণীশংকৈল",
  // Mymensingh
  "mymensingh sadar": "ময়মনসিংহ সদর", "bhaluka": "ভালুকা", "dhobaura": "ধোবাউড়া",
  "fulbaria": "ফুলবাড়িয়া", "gafargaon": "গফরগাঁও", "gouripur": "গৌরীপুর",
  "haluaghat": "হালুয়াঘাট", "ishwarganj": "ঈশ্বরগঞ্জ", "muktagachha": "মুক্তাগাছা",
  "nandail": "নান্দাইল", "fulpur": "ফুলপুর", "trishal": "ত্রিশাল", "tarakanda": "তারাকান্দা",
  // Netrokona
  "netrokona sadar": "নেত্রকোনা সদর", "atpara": "আটপাড়া", "barhatta": "বারহাট্টা",
  "kalmakanda": "কলমাকান্দা", "kendua": "কেন্দুয়া", "khaliajuri": "খালিয়াজুরী",
  "madan": "মদন", "mohanganj": "মোহনগঞ্জ", "purbadhala": "পূর্বধলা",
  // Jamalpur
  "jamalpur sadar": "জামালপুর সদর", "bakshiganj": "বকশীগঞ্জ", "dewanganj": "দেওয়ানগঞ্জ",
  "islampur": "ইসলামপুর", "madarganj": "মাদারগঞ্জ", "melandah": "মেলান্দহ", "sarishabari": "সরিষাবাড়ী",
  // Sherpur
  "sherpur sadar": "শেরপুর সদর", "jhenaigati": "ঝিনাইগাতী", "nakla": "নকলা",
  "nalitabari": "নালিতাবাড়ী", "sribardi": "শ্রীবরদী",
};

export interface Division {
  name: string;
  nameBn: string;
  districts: District[];
}

export const divisions: Division[] = [
  {
    name: "Dhaka",
    nameBn: "ঢাকা",
    districts: [
      {
        name: "Dhaka", nameBn: "ঢাকা",
        thanas: [
          "গুলশান", "বনানী", "উত্তরা", "মিরপুর", "মোহাম্মদপুর", "ধানমন্ডি", "লালবাগ", "মতিঝিল",
          "রমনা", "তেজগাঁও", "শাহবাগ", "পল্টন", "নিউমার্কেট", "যাত্রাবাড়ী", "কদমতলী", "শ্যামপুর",
          "হাজারীবাগ", "কামরাঙ্গীরচর", "বাড্ডা", "খিলগাঁও", "রামপুরা", "আদাবর", "কাফরুল", "তুরাগ",
          "দক্ষিণখান", "উত্তরখান", "পল্লবী", "শাহ আলী", "ক্যান্টনমেন্ট", "ডেমরা", "সূত্রাপুর",
          "ওয়ারী", "কোতোয়ালী", "চকবাজার", "বংশাল", "গেন্ডারিয়া", "সবুজবাগ", "খিলক্ষেত",
          "ভাটারা", "দারুস সালাম", "শেরেবাংলা নগর"
        ],
      },
      {
        name: "Gazipur", nameBn: "গাজীপুর",
        thanas: ["গাজীপুর সদর", "কালীগঞ্জ", "কালিয়াকৈর", "কাপাসিয়া", "শ্রীপুর", "টঙ্গী"],
      },
      {
        name: "Narayanganj", nameBn: "নারায়ণগঞ্জ",
        thanas: ["নারায়ণগঞ্জ সদর", "আড়াইহাজার", "বন্দর", "রূপগঞ্জ", "সোনারগাঁও"],
      },
      {
        name: "Tangail", nameBn: "টাঙ্গাইল",
        thanas: ["টাঙ্গাইল সদর", "বাসাইল", "ভুয়াপুর", "দেলদুয়ার", "ধনবাড়ী", "ঘাটাইল", "গোপালপুর", "কালিহাতি", "মধুপুর", "মির্জাপুর", "নাগরপুর", "সখিপুর"],
      },
      {
        name: "Kishoreganj", nameBn: "কিশোরগঞ্জ",
        thanas: ["কিশোরগঞ্জ সদর", "অষ্টগ্রাম", "বাজিতপুর", "ভৈরব", "হোসেনপুর", "ইটনা", "করিমগঞ্জ", "কটিয়াদী", "কুলিয়ারচর", "মিঠামইন", "নিকলী", "পাকুন্দিয়া", "তাড়াইল"],
      },
      {
        name: "Manikganj", nameBn: "মানিকগঞ্জ",
        thanas: ["মানিকগঞ্জ সদর", "ঘিওর", "হরিরামপুর", "সাটুরিয়া", "শিবালয়", "সিংগাইর", "দৌলতপুর"],
      },
      {
        name: "Munshiganj", nameBn: "মুন্সিগঞ্জ",
        thanas: ["মুন্সিগঞ্জ সদর", "গজারিয়া", "লৌহজং", "সিরাজদিখান", "শ্রীনগর", "টঙ্গীবাড়ী"],
      },
      {
        name: "Narsingdi", nameBn: "নরসিংদী",
        thanas: ["নরসিংদী সদর", "বেলাবো", "মনোহরদী", "পলাশ", "রায়পুরা", "শিবপুর"],
      },
      {
        name: "Faridpur", nameBn: "ফরিদপুর",
        thanas: ["ফরিদপুর সদর", "আলফাডাঙ্গা", "ভাঙ্গা", "বোয়ালমারী", "চরভদ্রাসন", "মধুখালী", "নগরকান্দা", "সদরপুর", "সালথা"],
      },
      {
        name: "Gopalganj", nameBn: "গোপালগঞ্জ",
        thanas: ["গোপালগঞ্জ সদর", "কাশিয়ানী", "কোটালীপাড়া", "মুকসুদপুর", "টুঙ্গিপাড়া"],
      },
      {
        name: "Madaripur", nameBn: "মাদারীপুর",
        thanas: ["মাদারীপুর সদর", "কালকিনি", "রাজৈর", "শিবচর"],
      },
      {
        name: "Rajbari", nameBn: "রাজবাড়ী",
        thanas: ["রাজবাড়ী সদর", "বালিয়াকান্দি", "গোয়ালন্দ", "পাংশা", "কালুখালী"],
      },
      {
        name: "Shariatpur", nameBn: "শরীয়তপুর",
        thanas: ["শরীয়তপুর সদর", "ভেদরগঞ্জ", "ডামুড্যা", "গোসাইরহাট", "নড়িয়া", "জাজিরা"],
      },
    ],
  },
  {
    name: "Chittagong",
    nameBn: "চট্টগ্রাম",
    districts: [
      {
        name: "Chittagong", nameBn: "চট্টগ্রাম",
        thanas: [
          "কোতোয়ালী", "পাহাড়তলী", "পাঁচলাইশ", "বায়েজিদ", "চান্দগাঁও", "ডবলমুরিং", "বাকলিয়া",
          "হালিশহর", "পতেঙ্গা", "বন্দর", "আকবর শাহ", "কর্ণফুলী", "সন্দ্বীপ", "সীতাকুণ্ড",
          "মীরসরাই", "ফটিকছড়ি", "রাউজান", "রাঙ্গুনিয়া", "বোয়ালখালী", "আনোয়ারা",
          "পটিয়া", "চন্দনাইশ", "সাতকানিয়া", "লোহাগাড়া", "বাঁশখালী", "হাটহাজারী"
        ],
      },
      {
        name: "Comilla", nameBn: "কুমিল্লা",
        thanas: ["কুমিল্লা সদর", "কুমিল্লা সদর দক্ষিণ", "বরুড়া", "ব্রাহ্মণপাড়া", "বুড়িচং", "চান্দিনা", "চৌদ্দগ্রাম", "দাউদকান্দি", "দেবিদ্বার", "হোমনা", "লাকসাম", "মেঘনা", "মনোহরগঞ্জ", "মুরাদনগর", "নাঙ্গলকোট", "তিতাস"],
      },
      {
        name: "Cox's Bazar", nameBn: "কক্সবাজার",
        thanas: ["কক্সবাজার সদর", "চকরিয়া", "কুতুবদিয়া", "মহেশখালী", "পেকুয়া", "রামু", "টেকনাফ", "উখিয়া"],
      },
      {
        name: "Feni", nameBn: "ফেনী",
        thanas: ["ফেনী সদর", "ছাগলনাইয়া", "দাগনভূঞা", "পরশুরাম", "সোনাগাজী", "ফুলগাজী"],
      },
      {
        name: "Lakshmipur", nameBn: "লক্ষ্মীপুর",
        thanas: ["লক্ষ্মীপুর সদর", "কমলনগর", "রায়পুর", "রামগঞ্জ", "রামগতি"],
      },
      {
        name: "Noakhali", nameBn: "নোয়াখালী",
        thanas: ["নোয়াখালী সদর", "বেগমগঞ্জ", "চাটখিল", "কোম্পানীগঞ্জ", "হাতিয়া", "কবিরহাট", "সেনবাগ", "সোনাইমুড়ী", "সুবর্ণচর"],
      },
      {
        name: "Brahmanbaria", nameBn: "ব্রাহ্মণবাড়িয়া",
        thanas: ["ব্রাহ্মণবাড়িয়া সদর", "আখাউড়া", "আশুগঞ্জ", "বাঞ্ছারামপুর", "কসবা", "নবীনগর", "নাসিরনগর", "সরাইল", "বিজয়নগর"],
      },
      {
        name: "Chandpur", nameBn: "চাঁদপুর",
        thanas: ["চাঁদপুর সদর", "ফরিদগঞ্জ", "হাইমচর", "হাজীগঞ্জ", "কচুয়া", "মতলব উত্তর", "মতলব দক্ষিণ", "শাহরাস্তি"],
      },
      {
        name: "Rangamati", nameBn: "রাঙামাটি",
        thanas: ["রাঙামাটি সদর", "কাপ্তাই", "কাউখালী", "বাঘাইছড়ি", "বরকল", "লংগদু", "রাজস্থলী", "বিলাইছড়ি", "জুরাছড়ি", "নানিয়ারচর"],
      },
      {
        name: "Bandarban", nameBn: "বান্দরবান",
        thanas: ["বান্দরবান সদর", "আলীকদম", "লামা", "নাইক্ষ্যংছড়ি", "রোয়াংছড়ি", "রুমা", "থানচি"],
      },
      {
        name: "Khagrachhari", nameBn: "খাগড়াছড়ি",
        thanas: ["খাগড়াছড়ি সদর", "দীঘিনালা", "লক্ষ্মীছড়ি", "মহালছড়ি", "মানিকছড়ি", "মাটিরাঙ্গা", "পানছড়ি", "রামগড়", "গুইমারা"],
      },
    ],
  },
  {
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    districts: [
      {
        name: "Rajshahi", nameBn: "রাজশাহী",
        thanas: ["রাজশাহী সদর", "বাগমারা", "বোয়ালিয়া", "চারঘাট", "দুর্গাপুর", "গোদাগাড়ী", "মোহনপুর", "পবা", "পুঠিয়া", "তানোর"],
      },
      {
        name: "Bogra", nameBn: "বগুড়া",
        thanas: ["বগুড়া সদর", "আদমদিঘি", "দুপচাঁচিয়া", "গাবতলী", "কাহালু", "নন্দীগ্রাম", "সারিয়াকান্দি", "শাজাহানপুর", "শেরপুর", "শিবগঞ্জ", "সোনাতলা", "ধুনট"],
      },
      {
        name: "Pabna", nameBn: "পাবনা",
        thanas: ["পাবনা সদর", "আটঘরিয়া", "বেড়া", "ভাঙ্গুড়া", "চাটমোহর", "ফরিদপুর", "ঈশ্বরদী", "সাঁথিয়া", "সুজানগর"],
      },
      {
        name: "Sirajganj", nameBn: "সিরাজগঞ্জ",
        thanas: ["সিরাজগঞ্জ সদর", "বেলকুচি", "চৌহালী", "কামারখন্দ", "কাজীপুর", "রায়গঞ্জ", "শাহজাদপুর", "তাড়াশ", "উল্লাপাড়া"],
      },
      {
        name: "Natore", nameBn: "নাটোর",
        thanas: ["নাটোর সদর", "বাগাতিপাড়া", "বড়াইগ্রাম", "গুরুদাসপুর", "লালপুর", "সিংড়া", "নলডাঙ্গা"],
      },
      {
        name: "Nawabganj", nameBn: "চাঁপাইনবাবগঞ্জ",
        thanas: ["চাঁপাইনবাবগঞ্জ সদর", "ভোলাহাট", "গোমস্তাপুর", "নাচোল", "শিবগঞ্জ"],
      },
      {
        name: "Naogaon", nameBn: "নওগাঁ",
        thanas: ["নওগাঁ সদর", "আত্রাই", "বদলগাছী", "ধামইরহাট", "মান্দা", "মহাদেবপুর", "নিয়ামতপুর", "পত্নীতলা", "পোরশা", "রাণীনগর", "সাপাহার"],
      },
      {
        name: "Joypurhat", nameBn: "জয়পুরহাট",
        thanas: ["জয়পুরহাট সদর", "আক্কেলপুর", "কালাই", "ক্ষেতলাল", "পাঁচবিবি"],
      },
    ],
  },
  {
    name: "Khulna",
    nameBn: "খুলনা",
    districts: [
      {
        name: "Khulna", nameBn: "খুলনা",
        thanas: ["খুলনা সদর", "বটিয়াঘাটা", "দাকোপ", "ডুমুরিয়া", "দিঘলিয়া", "কয়রা", "পাইকগাছা", "ফুলতলা", "রূপসা", "তেরখাদা", "সোনাডাঙ্গা", "খালিশপুর"],
      },
      {
        name: "Jessore", nameBn: "যশোর",
        thanas: ["যশোর সদর", "অভয়নগর", "বাঘারপাড়া", "চৌগাছা", "ঝিকরগাছা", "কেশবপুর", "মণিরামপুর", "শার্শা"],
      },
      {
        name: "Satkhira", nameBn: "সাতক্ষীরা",
        thanas: ["সাতক্ষীরা সদর", "আশাশুনি", "দেবহাটা", "কলারোয়া", "কালীগঞ্জ", "শ্যামনগর", "তালা"],
      },
      {
        name: "Bagerhat", nameBn: "বাগেরহাট",
        thanas: ["বাগেরহাট সদর", "চিতলমারী", "ফকিরহাট", "কচুয়া", "মোল্লাহাট", "মংলা", "মোরেলগঞ্জ", "রামপাল", "শরণখোলা"],
      },
      {
        name: "Narail", nameBn: "নড়াইল",
        thanas: ["নড়াইল সদর", "কালিয়া", "লোহাগড়া"],
      },
      {
        name: "Magura", nameBn: "মাগুরা",
        thanas: ["মাগুরা সদর", "মোহাম্মদপুর", "শালিখা", "শ্রীপুর"],
      },
      {
        name: "Kushtia", nameBn: "কুষ্টিয়া",
        thanas: ["কুষ্টিয়া সদর", "ভেড়ামারা", "দৌলতপুর", "খোকসা", "কুমারখালী", "মিরপুর"],
      },
      {
        name: "Meherpur", nameBn: "মেহেরপুর",
        thanas: ["মেহেরপুর সদর", "গাংনী", "মুজিবনগর"],
      },
      {
        name: "Chuadanga", nameBn: "চুয়াডাঙ্গা",
        thanas: ["চুয়াডাঙ্গা সদর", "আলমডাঙ্গা", "দামুড়হুদা", "জীবননগর"],
      },
      {
        name: "Jhenaidah", nameBn: "ঝিনাইদহ",
        thanas: ["ঝিনাইদহ সদর", "হরিণাকুণ্ডু", "কালীগঞ্জ", "কোটচাঁদপুর", "মহেশপুর", "শৈলকুপা"],
      },
    ],
  },
  {
    name: "Barisal",
    nameBn: "বরিশাল",
    districts: [
      {
        name: "Barisal", nameBn: "বরিশাল",
        thanas: ["বরিশাল সদর", "আগৈলঝাড়া", "বাবুগঞ্জ", "বাকেরগঞ্জ", "বানারীপাড়া", "গৌরনদী", "হিজলা", "মেহেন্দিগঞ্জ", "মুলাদী", "উজিরপুর"],
      },
      {
        name: "Patuakhali", nameBn: "পটুয়াখালী",
        thanas: ["পটুয়াখালী সদর", "বাউফল", "দশমিনা", "দুমকি", "গলাচিপা", "কলাপাড়া", "মির্জাগঞ্জ", "রাঙ্গাবালী"],
      },
      {
        name: "Bhola", nameBn: "ভোলা",
        thanas: ["ভোলা সদর", "বোরহানউদ্দিন", "চরফ্যাশন", "দৌলতখান", "লালমোহন", "মনপুরা", "তজুমদ্দিন"],
      },
      {
        name: "Pirojpur", nameBn: "পিরোজপুর",
        thanas: ["পিরোজপুর সদর", "ভাণ্ডারিয়া", "কাউখালী", "মঠবাড়িয়া", "নাজিরপুর", "নেছারাবাদ", "জিয়ানগর"],
      },
      {
        name: "Barguna", nameBn: "বরগুনা",
        thanas: ["বরগুনা সদর", "আমতলী", "বামনা", "বেতাগী", "পাথরঘাটা", "তালতলী"],
      },
      {
        name: "Jhalokati", nameBn: "ঝালকাঠি",
        thanas: ["ঝালকাঠি সদর", "কাঠালিয়া", "নলছিটি", "রাজাপুর"],
      },
    ],
  },
  {
    name: "Sylhet",
    nameBn: "সিলেট",
    districts: [
      {
        name: "Sylhet", nameBn: "সিলেট",
        thanas: ["সিলেট সদর", "বালাগঞ্জ", "বিশ্বনাথ", "কোম্পানীগঞ্জ", "ফেঞ্চুগঞ্জ", "গোলাপগঞ্জ", "গোয়াইনঘাট", "জৈন্তাপুর", "কানাইঘাট", "জকিগঞ্জ", "দক্ষিণ সুরমা", "ওসমানীনগর"],
      },
      {
        name: "Moulvibazar", nameBn: "মৌলভীবাজার",
        thanas: ["মৌলভীবাজার সদর", "বড়লেখা", "জুড়ী", "কমলগঞ্জ", "কুলাউড়া", "রাজনগর", "শ্রীমঙ্গল"],
      },
      {
        name: "Habiganj", nameBn: "হবিগঞ্জ",
        thanas: ["হবিগঞ্জ সদর", "আজমিরীগঞ্জ", "বাহুবল", "বানিয়াচং", "চুনারুঘাট", "লাখাই", "মাধবপুর", "নবীগঞ্জ", "শায়েস্তাগঞ্জ"],
      },
      {
        name: "Sunamganj", nameBn: "সুনামগঞ্জ",
        thanas: ["সুনামগঞ্জ সদর", "ছাতক", "দিরাই", "ধর্মপাশা", "দোয়ারাবাজার", "জগন্নাথপুর", "জামালগঞ্জ", "শাল্লা", "তাহিরপুর", "বিশ্বম্ভরপুর", "দক্ষিণ সুনামগঞ্জ"],
      },
    ],
  },
  {
    name: "Rangpur",
    nameBn: "রংপুর",
    districts: [
      {
        name: "Rangpur", nameBn: "রংপুর",
        thanas: ["রংপুর সদর", "বদরগঞ্জ", "গঙ্গাচড়া", "কাউনিয়া", "মিঠাপুকুর", "পীরগঞ্জ", "পীরগাছা", "তারাগঞ্জ"],
      },
      {
        name: "Dinajpur", nameBn: "দিনাজপুর",
        thanas: ["দিনাজপুর সদর", "বিরামপুর", "বিরল", "বীরগঞ্জ", "বোচাগঞ্জ", "চিরিরবন্দর", "ফুলবাড়ী", "ঘোড়াঘাট", "হাকিমপুর", "খানসামা", "নবাবগঞ্জ", "পার্বতীপুর"],
      },
      {
        name: "Kurigram", nameBn: "কুড়িগ্রাম",
        thanas: ["কুড়িগ্রাম সদর", "ভুরুঙ্গামারী", "চিলমারী", "ফুলবাড়ী", "নাগেশ্বরী", "রাজারহাট", "রৌমারী", "উলিপুর", "রাজিবপুর"],
      },
      {
        name: "Gaibandha", nameBn: "গাইবান্ধা",
        thanas: ["গাইবান্ধা সদর", "ফুলছড়ি", "গোবিন্দগঞ্জ", "পলাশবাড়ী", "সাদুল্যাপুর", "সাঘাটা", "সুন্দরগঞ্জ"],
      },
      {
        name: "Lalmonirhat", nameBn: "লালমনিরহাট",
        thanas: ["লালমনিরহাট সদর", "আদিতমারী", "হাতীবান্ধা", "কালীগঞ্জ", "পাটগ্রাম"],
      },
      {
        name: "Nilphamari", nameBn: "নীলফামারী",
        thanas: ["নীলফামারী সদর", "ডিমলা", "ডোমার", "জলঢাকা", "কিশোরগঞ্জ", "সৈয়দপুর"],
      },
      {
        name: "Panchagarh", nameBn: "পঞ্চগড়",
        thanas: ["পঞ্চগড় সদর", "আটোয়ারী", "বোদা", "দেবীগঞ্জ", "তেঁতুলিয়া"],
      },
      {
        name: "Thakurgaon", nameBn: "ঠাকুরগাঁও",
        thanas: ["ঠাকুরগাঁও সদর", "বালিয়াডাঙ্গী", "হরিপুর", "পীরগঞ্জ", "রাণীশংকৈল"],
      },
    ],
  },
  {
    name: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    districts: [
      {
        name: "Mymensingh", nameBn: "ময়মনসিংহ",
        thanas: ["ময়মনসিংহ সদর", "ভালুকা", "ধোবাউড়া", "ফুলবাড়িয়া", "গফরগাঁও", "গৌরীপুর", "হালুয়াঘাট", "ঈশ্বরগঞ্জ", "মুক্তাগাছা", "নান্দাইল", "ফুলপুর", "ত্রিশাল", "তারাকান্দা"],
      },
      {
        name: "Netrokona", nameBn: "নেত্রকোনা",
        thanas: ["নেত্রকোনা সদর", "আটপাড়া", "বারহাট্টা", "দুর্গাপুর", "কলমাকান্দা", "কেন্দুয়া", "খালিয়াজুরী", "মদন", "মোহনগঞ্জ", "পূর্বধলা"],
      },
      {
        name: "Jamalpur", nameBn: "জামালপুর",
        thanas: ["জামালপুর সদর", "বকশীগঞ্জ", "দেওয়ানগঞ্জ", "ইসলামপুর", "মাদারগঞ্জ", "মেলান্দহ", "সরিষাবাড়ী"],
      },
      {
        name: "Sherpur", nameBn: "শেরপুর",
        thanas: ["শেরপুর সদর", "ঝিনাইগাতী", "নকলা", "নালিতাবাড়ী", "শ্রীবরদী"],
      },
    ],
  },
];

export const allDistricts = divisions.flatMap((d) => d.districts);
