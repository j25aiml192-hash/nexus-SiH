import csv
import io
import json


# Paste your copied Excel rows between these triple quotes.
RAW_DATA = """
20025	Kasaiyakasaiya,-1,Deoghar,Jharkhand,815353	86.695976	24.502518	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20057	Dighi,Noni,Deoghar,Jharkhanddighi,Noni,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,815351	86.6918	24.484615	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20291	Ghiyamo,Pghiyamo,Palojori,Deoghar,Jharkhandalojori,Deoghar,Jharkhandghiyamo,Palojori,Deoghar,Jharkha…	86.686481	24.50133	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20319	Pokhnatilha,Deoghar,Deoghar,Jharkhandpokhnatilha,Deoghar,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,8141…	86.692487	24.499611	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20357	Pachrukhi,Karanjo,Deoghar,Jharkhandpachrukhi,Karanjo,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,815353	86.58178	24.16573	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20408	Kanki,Kanki,Deoghar,Jharkhandkanki,Kanki,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,815351	86.722171	24.501642	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20417	Pipra,Margomunda,Deoghar,Jharkhandpipra,Margomunda,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,815353	86.58178	24.16573	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20450	Jamro,Jhalar,Deoghar,Jharkhandjamro,Jhalar,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,814120	86.84082	24.42529	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20716	Mandir Deoghar Deogharcq5Mgw, Harladih, Jharkhand 814120, India Harladih Near Hanuman,-1,Deoghar,Jha…	86.784142	24.411257	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Deoghar
20749	Kendbariya,Ranidih,Deoghar,Jharkhandkendbariya,Ranidih,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,815357	86.680877	24.505252	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
20815	Pitanjiya,Pathrol,Madhupur,Jharkhandpitanjiya,Pathrol,Madhupur,Jharkhand,-1,Deoghar,Jharkhand,815353	86.688432	24.465832	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22085	Baswariyabaswariya,-1,Deoghar,Jharkhand,814150	86.750436	24.502821	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22088	Rampur,Bilasi Town,Mohanpur,Deoghar,Jharkhandrampur,Bilasi Town,Mohanpur,Deoghar,Jharkhand,-1,Deogha…	86.715651	24.498518	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22095	Bahrabank,Burhai,Devipur,Deoghar,Jharkhandbahrabank,Burhai,Devipur,Deoghar,Jharkhand,-1,Deoghar,Jhar…	86.666062	24.517105	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22106	Basha,Basha,Palojori,Deoghar,Jharkhandbasha,Basha,Palojori,Deoghar,Jharkhand,-1,Deoghar,Jharkhand,81…	86.69366	24.499082	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22113	Barabara,-1,Deoghar,Jharkhand,814150	86.891486	24.364881	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22116	Dahijor,Dahijor,Mohanpur,Deoghar,Jharkhanddahijor,Dahijor,Mohanpur,Deoghar,Jharkhand,-1,Deoghar,Jhar…	86.84149	24.44879	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22121	Kolhariyakolhariya,-1,Deoghar,Jharkhand,814149	86.909816	24.305821	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22760	Manjhtarasha Kumari,-1,Deoghar,Jharkhand,815353	86.74436	24.12532	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
22761	Devipurthariyari,-1,Deoghar,Jharkhand,814152	86.526179	24.438515	Public Sector Banks	State Bank Of India	Jharkhand	Deoghar
323	Gurgaonq4R6+4P6, Dhondal, Haryana 122508, India Dondal Near Masjid Nuh Mewat,-1,Mewat,Haryana,122508	77.119932	27.794919	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
1275	Mewatindri More Sohna,-1,Mewat,Haryana,122103	77.05644	28.01077	Public Sector Banks	State Bank Of India	Haryana	Nuh
1436	Gurgaonx3C6R43, Umra, Haryana 122108, India Near Masjid Nuh,-1,Mewat,Haryana,122108	77.060224	27.972039	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
2849	Nuhvillage Kanwarsika Tehsil-Nuh Dist. Mewat Haryana-122107,-1,Mewat,Haryana,122107	76.972829	28.151382	Public Sector Banks	State Bank Of India	Haryana	Nuh
3658	Mewatvillage Singar Tirwara Road Tehsil-Punhana Dist. Mewat Haryana-122508,-1,Mewat,Haryana,122508	77.2485	27.865405	Public Sector Banks	State Bank Of India	Haryana	Nuh
3664	Mewatvillage Lohinga Kalan P.O. Tehsil -Punehana Dist. Mewat Haryana-122508,-1,Mewat,Haryana,122508	77.132145	27.832596	Public Sector Banks	State Bank Of India	Haryana	Nuh
3671	Mewatnear Sbi Pinangawan Tehsil Punhena Dist. Mewat Haryana,-1,Mewat,Haryana,122508	77.193787	27.872359	Public Sector Banks	State Bank Of India	Haryana	Nuh
3716	Mewatvillage Padheni P.O. Taoru Dist.Nuh Mewat Haryana-122105,-1,Mewat,Haryana,122105	76.941306	28.210379	Public Sector Banks	State Bank Of India	Haryana	Nuh
3729	Mewatvillage Bhopawali Nuh P.O. Ujina Tehsil-Nuh Dist. Mewat Haryana-122107,-1,Mewat,Haryana,122107	77.125993	27.98742	Public Sector Banks	State Bank Of India	Haryana	Nuh
4209	Mewatmain Bazar Nuh Near Hdfc Atm Nuh Tehsil-Nuh Dist Mewat Haryana-122107,-1,Mewat,Haryana,122508	76.87175	28.24238	Public Sector Banks	State Bank Of India	Haryana	Nuh
6751	Masjid Nuh Mewat Gurgaonqxx3P3J, Firozpur Jhirka, Haryana 122104, India Ferozpur Jhirka Near,-1,Mewa…	76.952678	27.799458	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
6776	Mewat Gurgaonqw3Vxh8, Maholi, Haryana 122104, India Maholi Near Masjid Nuh,-1,Mewat,Haryana,122104	76.943973	27.754938	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
6777	Near Masjid Gurgaon303, Rehna, Haryana 122103, India,-1,Mewat,Haryana,122103	76.992243	28.156942	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
6956	Nuhmustafa Computers Badkali Chowk Tehsil- Nagina Dist. Nuh Haryana-122108,-1,Mewat,Haryana,122108	77.000419	27.913773	Public Sector Banks	State Bank Of India	Haryana	Nuh
25056	Nuh Mewat Gurgaonv5J4Mjg, Khorishah Chokha, Haryana 122508, India Chokha Near Masjid,-1,Mewat,Haryan…	77.156638	27.88185	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
28251	Gurgaonwx9M8Wr, Nagina, Haryana 122108, India Near Masjid Nuh,-1,Mewat,Haryana,122108	76.985428	27.917841	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
30313	Gurgaonvxp7Vm3, Nawli, Haryana 122108, India Near Masjid Nuh,-1,Mewat,Haryana,122108	76.984288	27.871288	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
37070	Mewatvpo Tapkan , Tehsil-Nuh(Mewat) Haryana-122107,-1,Mewat,Haryana,122107	76.981458	28.10093	Public Sector Banks	State Bank Of India	Haryana	Nuh
37779	Mewaatbajhera Ujina Nuh,-1,Mewat,Haryana,122107	77.030091	28.04614	Public Sector Banks	State Bank Of India	Haryana	Nuh
37874	Gurgaonpxh56H8, Agon, Haryana 122104, India Agon Near Masjid Nuh Mewat,-1,Mewat,Haryana,122104	76.959331	27.727327	Payments Banks	Airtel Payments Bank Limited	Haryana	Nuh
4278	Mathurasanti Market Sonkh Tehsil & Dist. Mathura Uttar Pradesh-281502,-1,Mathura,Uttar Pradesh,…	77.492536	27.655266	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
4314	Mathuranetrapal Cyber Café Infront Of Goyal Market Near Gramin Bank Shop No-3 Dist. Mathura Uttar Pr…	77.731574	27.646749	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
4322	Mathuravillage Mat Bijoli Tehsil-Mat Dist. Mathura Uttar Pradesh-281202,-1,Mathura,Uttar Pradesh,281…	77.85483	27.52845	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
4334	Mathurashree Ji Puram Near Saraswati Sishu Mandir Post Kosi Kalan Tehisl-Chhata Dist. Mathura Uttar…	77.422156	27.788439	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
4360	Mathuravillage Ajijpur Tehsil-Chhata Dist. Mathura Uttar Pradesh-281401,-1,Mathura,Uttar Pradesh,281…	77.445945	27.779316	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
4364	Mathuragurukul Road Parikrama Marg Rajpur Vrindavan Tehsil & Dist. Mathura Uttar Pradesh-281121,…	77.697815	27.56855	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
4370	Mathuravpo Tarauli Tehsil Chhata Dist. Mathura Uttar Pradesh-281001,-1,Mathura,Uttar Pradesh,281001	77.600786	27.59569	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
4377	Mathura83 Ram Nagar Krishan Nagar Mathura Tehsil Dist. Mathura Uttar Pradesh-281004,-1,Mathura,Uttar…	77.645882	27.45508	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
9535	Mathura Uttar Pradeshhouse No. 11A, Mant Raja,In Front Of Sba Inter College Mant,-1,Mathura,Uttar Pr…	77.7142	27.633	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
12325	Vardhan Mathuravill Julendhi Post Jikhan Gaon Govardhan Mathura,-1,Mathura,Uttar Pradesh,281504	77.489899	27.523199	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
12697	Badhonvill Barhaunteh-Mat Mathura Up,-1,Mathura,Uttar Pradesh,281204	77.768095	27.54584	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
12707	Lrausinga Mantsidharnagar Daharuwa Mathura Villrausinga Mant,-1,Mathura,Uttar Pradesh,281204	77.6934	27.47622	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
19906	Vihar Mathurashop At 27.476220Vihar Mathura 15/177 Ashok Vihar Mathura,-1,Mathura,Uttar Pradesh,2810…	77.6934	27.47622	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
21821	Nautanga Mathura Mathura Mathuragrv4W3M, Sadabad Rd, Chhikara, Uttar Pradesh 281204, India,-1,Mathur…	77.805742	27.543079	Payments Banks	Airtel Payments Bank Limited	Uttar Pradesh	Mathura
21864	Mathura Mathurar87Vp2Q, Kamar, Uttar Pradesh 281403, India Near Holi Chok Kamar,-1,Mathura,Uttar Pra…	77.342622	27.814317	Payments Banks	Airtel Payments Bank Limited	Uttar Pradesh	Mathura
25062	Dahgaon Mathura Mathurar9Mcvp5, Dahgaon, Uttar Pradesh 281403, India Near Kutha Mandir,-1,Mathura,Ut…	77.371741	27.834197	Payments Banks	Airtel Payments Bank Limited	Uttar Pradesh	Mathura
25102	Mathura Mathura1, Tentigaon, Uttar Pradesh 281202, India Tentigaon Road Ramlila Ground,-1,Mathura,Ut…	77.736088	27.72687	Payments Banks	Airtel Payments Bank Limited	Uttar Pradesh	Mathura
26874	Mathuramathura,-1,Mathura,Uttar Pradesh,281003	77.673676	27.492413	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
31634	Mathuras/O-Geetam Singh,Vill-Bhankerpur Basela Post-Bhaurasani Mathura,-1,Mathura,Uttar Pradesh,2812…	77.768167	27.545847	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
32043	Mathuravill-Karahari.Post-Karahari. Tehsil-Mat.Mathura Mathura,-1,Mathura,Uttar Pradesh,281205	77.768167	27.776872	Public Sector Banks	State Bank Of India	Uttar Pradesh	Mathura
389	Giridh63Wchmq, Kumharpitni, Jharkhand 815316, India Mahzid Giridih,-1,Giridih,Jharkhand,815316	86.071771	24.247048	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
1433	Near Pond Giridih Giridhpalganj - Khetadabar Marg, Masnutanr, Jharkhand 825108, India,-1,Giridih,Jha…	86.240466	24.052986	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
4671	Near Bal Vikash High School Giridhchano,Birni,Giridih,825324 Do,-1,Giridih,Jharkhand,825324	85.930193	24.283411	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
8892	Near Durga Mandir Giridhbanshidih Leda Giridih Near Durga Mandir,-1,Giridih,Jharkhand,815316	86.148292	24.185761	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
11063	Jharkhand 815301, India Near Giridh48Vwcj7, Kodarma - Giridih - Tundi - Gobindpur Rd, Gadi Sri Ram P…	86.346264	24.143608	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
12186	Giridih Giridh7V3H87V, Bangra Kalan, Jharkhand 815302, India Do Near Durga Mandir,-1,Giridih,Jharkha…	85.878233	24.25343	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
12198	Giridih Giridh98Hgw8C, Khurchuta, Jharkhand 815312, India Lalpur Lalpur,-1,Giridih,Jharkhand,815312	86.336884	24.374924	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
13198	Giridih Giridh635F3Px, Khurjio, Jharkhand 825324, India Khurjio Khurjio,-1,Giridih,Jharkhand,825324	86.068094	24.211727	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
16373	Giridih Giridh5Fvpf8, Khamhartanr, Jharkhand 815312, India Khamhartarn Ganday,-1,Giridih,Jharkhand,8…	86.485239	24.193258	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Giridih
17030	Kenduakendua,-1,Giridih,Jharkhand,825408	85.927235	24.365678	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
17379	Bengabadgamtaria,-1,Giridih,Jharkhand,815312	86.360486	24.299644	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
17411	Giridihgardih,-1,Giridih,Jharkhand,825412	85.98409	24.40884	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
17718	Kisutandkisutand,-1,Giridih,Jharkhand,815317	85.96431	24.54823	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
17988	Pachrukhipachrukhi,-1,Giridih,Jharkhand,825412	85.944479	24.425403	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
18302	Bermokodwadih,-1,Giridih,Jharkhand,825418	86.300411	24.186311	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
18411	Nawadih,Giridh,Jharkhand,Nawadih,Giridh,Jharkhand,,-1,Giridih,Jharkhand,815316	86.255713	24.23503	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
18428	Baidadihbaidadih,-1,Giridih,Jharkhand,815302	85.969006	24.225271	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
18442	Birnipalaunjia,-1,Giridih,Jharkhand,825324	85.942586	24.315799	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
18473	Tisritisri,-1,Giridih,Jharkhand,815317	86.05175	24.61984	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
18660	Sariyaparasia,-1,Giridih,Jharkhand,825320	86.309683	24.189807	Public Sector Banks	State Bank Of India	Jharkhand	Giridih
946	Narharpur Narharpurnarharpur Narharpur,-1,Bharatpur,Rajasthan,321408	77.171521	26.983129	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
948	Nithar Weri Bharatpurnithar Weri Bharatpur,-1,Bharatpur,Rajasthan,321409	77.10993	26.99597	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
951	Vill-Singhrawali Post&Block-Bayana Dist-Bharatpur Rajasthanvill-Singhrawali Post&Block-Bayan…	77.030899	27.011339	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
953	Vill-Guhana Post&Block-Paramdara Dist-Bharatpur Rajasthanvill-Guhana Post&Block-Paramdara Di…	77.303688	26.845949	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
2571	Urki Dallagp- Urki Dalla - Tehsil - Nagar District - Bharatpur,-1,Bharatpur,Rajasthan,301001	77.156425	27.498035	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
3695	Bharatpurvpo-Gopalgarh,The-Pahari,Dist-Bharatpur-321001,-1,Bharatpur,Rajasthan,321001	77.05947	27.649639	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
4320	Vp.Jotri Pipal ,Tehsil-Pahari, -321024Vp.Seekri,Tehsil-Nagar,Dist-Bharatpur-321024,-1,Bharatpur,Raja…	77.082347	27.710812	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
4396	Bharatpurvillage-Pahari,Tehsil-Pahari,Distt.-Bharatpur-321204,-1,Bharatpur,Rajasthan,321204	77.082348	27.710898	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
4424	Bharatpurvillage-Singhara ,Tehsil-Bayana ,Distt-Bharatpur-321401,-1,Bharatpur,Rajasthan,321401	77.289361	26.915809	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
4449	Bharatpurvillage-Baroda ,Tehsil-Bayana ,Distt.-Bharatpur,-1,Bharatpur,Rajasthan,321410	77.382298	26.97389	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
9431	Bharatpurrudawal Road Uchchain Bharatpur,-1,Bharatpur,Rajasthan,321302	77.2881	26.9151	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
9469	Bharatpurbehind City School, Nagar,-1,Bharatpur,Rajasthan,321205	77.09585	27.425399	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
9583	Bharatpurjawahar Market Bus Stand Near Sbi Bank Nagar,-1,Bharatpur,Rajasthan,321205	77.09585	27.425399	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
9591	Bharatpurbanke Bihari Market Roopwas,-1,Bharatpur,Rajasthan,321024	77.528789	27.000709	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
9784	Bahratpururki Mohammada Padal Was,-1,Bharatpur,Rajasthan,321024	77.067959	27.424121	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
10000	Bharatpurnear Paridhan Showroom Anah Gate Bajriya,-1,Bharatpur,Rajasthan,321001	77.56575	27.23034	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
10010	Bharatpurtamana Emitra Near Sbi Bank Collactry Campus,-1,Bharatpur,Rajasthan,321001	77.56575	27.23034	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
10517	Bharatpurnear Laxmi Palace Hotel Yaduraj Nagar,-1,Bharatpur,Rajasthan,321001	77.56575	27.23034	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
10524	Bharatpurgodha Emitra Near Bijligarh Choraha,-1,Bharatpur,Rajasthan,321001	77.327269	27.479035	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
10552	Bharatpurtuhiya Sewar,-1,Bharatpur,Rajasthan,321001	77.48824	27.260859	Public Sector Banks	State Bank Of India	Rajasthan	Bharatpur
373	Dhanbad 826001 Tiwari Gali Dhanbad Dhanbadtiwari Market Bank More Dhanbad 826001 Tiwari Market Bank…	86.419105	23.788201	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Dhanbad
1428	Mandir Dhanbad Dhanbadkeliasole Bus Stop, Kaliasole, Jharkhand 828201, India Near Shib,-1,Dhanbad,Jh…	86.656759	23.746509	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Dhanbad
16360	Bartand More Lahardih Dhanbadsarkardih, Jharkhand 828109, India Lahardih Sahabganj Road,-1,Dhanbad,J…	86.554425	23.861925	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Dhanbad
17522	Nirsanirsa,-1,Dhanbad,Jharkhand,828205	86.73236	23.771077	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
17607	Kotaldihkotaldih,-1,Dhanbad,Jharkhand,828109	86.428146	23.793355	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
17646	Pandnitanrpandnitanr,-1,Dhanbad,Jharkhand,828109	86.567832	23.912535	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
17819	Nawadih Bhuli Roadtulika Nimaiyar,-1,Dhanbad,Jharkhand,828125	86.439873	23.795602	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
17977	Khakudikhakudi,-1,Dhanbad,Jharkhand,828109	86.51214	23.66214	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
18350	Baghmarakenduadih,-1,Dhanbad,Jharkhand,828116	86.14152	23.87765	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
18518	Bhawan Dhanbad Dhanbadqmm6324, Jitpur, Jharkhand 828205, India Vill- Belkupa Near Panchayat,-1,Dhanb…	86.661465	23.783053	Payments Banks	Airtel Payments Bank Limited	Jharkhand	Dhanbad
18640	Topchanchitantri,-1,Dhanbad,Jharkhand,828402	86.21712	23.88801	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
18675	Jaypurjaypur,-1,Dhanbad,Jharkhand,828205	86.710314	23.821443	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
18681	Baghmarabaghmara,-1,Dhanbad,Jharkhand,828113	86.2777	23.8028	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
18784	Tantriharendra Singh Chaudhry,-1,Dhanbad,Jharkhand,828402	86.195	23.9046	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
19033	Dhanbadtantri,-1,Dhanbad,Jharkhand,828402	86.195	23.9046	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
19103	Sindrirangamati,-1,Dhanbad,Jharkhand,828122	86.78688	23.747887	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
20169	Dhanbadmanaitand,-1,Dhanbad,Jharkhand,826001	86.41378	23.809464	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
20839	Muraidihbastimuraidihbasti,-1,Dhanbad,Jharkhand,828306	86.213309	23.791395	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
21031	Kaliasol,Urma,Dhanbad,Jharkhandkaliasol,Urma,Dhanbad,Jharkhand,-1,Dhanbad,Jharkhand,828204	86.7618	23.72649	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
22097	Koiridihkoiridih,-1,Dhanbad,Jharkhand,828125	86.277702	23.802517	Public Sector Banks	State Bank Of India	Jharkhand	Dhanbad
"""


def format_data(raw):
    records = []

    # Excel copies cells separated by tabs
    rows = csv.reader(
        io.StringIO(raw.strip()),
        delimiter="\t"
    )

    for row in rows:
        if not row:
            continue

        # We expect:
        # id, address, longitude, latitude,
        # bank_group, bank, state, district

        if len(row) < 8:
            print("Skipping malformed row:")
            print(row)
            continue

        records.append({
            "atm_id": row[0].strip(),
            "bank_name": row[5].strip(),
            "address": row[1].strip(),
            "district": row[7].strip(),
            "state": row[6].strip(),
            "lat": float(row[3]),
            "lng": float(row[2]),
        })

    return records


records = format_data(RAW_DATA)

print("ATM_DATA = [")

for record in records:
    print("    " + repr(record) + ",")

print("]")