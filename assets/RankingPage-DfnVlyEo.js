import{a as e,n as t,t as n}from"./jsx-runtime-DWSWI4JT.js";import{S as r,_ as i,g as a,n as o,x as s}from"./settingsStorage-DmGAPOE5.js";import{S as c,t as l,v as u,x as d}from"./todoStorage-BswHUB7j.js";import{n as f,t as p}from"./PageTitle-BLlm28oy.js";import{t as m}from"./tourGCResults-CkWCxlUk.js";var h=e(t(),1),g=`2026-04-18`;function _(e){let t=e.trim().split(/\r?\n/).map(e=>e.trim()).filter(Boolean);if(t.length<2)return[];let n=t[0].split(`	`).map(e=>e.trim().toLowerCase()),r=n.findIndex(e=>e===`#`),i=n.findIndex(e=>e.includes(`nom`)||e.includes(`coureur`)),a=n.findIndex(e=>e.includes(`equipe`)),o=n.findIndex(e=>e.includes(`point`)),s=n.findIndex(e=>e.includes(`victoire`)),c=n.findIndex(e=>e===`age`),l=n.findIndex(e=>e===`cat`);return r===-1||i===-1||a===-1||o===-1?[]:t.slice(1).map(e=>e.split(`	`)).map(e=>{let t=Number.parseInt(e[r]?.replace(/[^\d]/g,``)??``,10),n=Number.parseInt(e[o]?.replace(/[^\d]/g,``)??``,10),u=s>=0?Number.parseInt(e[s]?.replace(/[^\d]/g,``)??``,10):void 0,d=c>=0?Number.parseInt(e[c]?.replace(/[^\d]/g,``)??``,10):void 0;return{rank:t,name:e[i]?.trim()??``,team:e[a]?.trim()??``,points:n,wins:u!==void 0&&!Number.isNaN(u)?u:void 0,age:d!==void 0&&!Number.isNaN(d)?d:void 0,categoryLabel:l>=0&&e[l]?.trim()||void 0}}).filter(e=>!Number.isNaN(e.rank)&&!Number.isNaN(e.points)&&e.name.length>0&&e.team.length>0)}var v={pro:_(`#	Coureur	Equipe	Victoires	Age	Cat	Points
1	Bogoss Thierry	CC La Foudre	6	32		1280
2	Machemy Jean-Laurent	NordOfWorlds	3	29		1056
3	Kalf Thierry	Les winners	3	32		930
4	Marinot Gavin	Snooptrot-Flandria	1	30		723
5	Mace Jean	CC La Foudre	0	28		635
6	Weber Xavier	Snooptrot-Flandria	1	27		606
7	Rabert Felix	NordOfWorlds	1	32		599
8	Haber Ivan	Les winners	0	32		548
9	Duarte Kenn	der ailleurs	0	31		544
10	Ebel Manfred	Snooptrot-Flandria	0	31		538
11	Loneur Remy	der ailleurs	0	32		527
12	Stoickov James	VC VB	0	31		517
13	Marcout Anthony	VC VB	0	30		502
14	Navarre Ivan	VC VB	0	31		488
15	Atchoum Stan	VC VB	0	28		468
16	Udall Russell	Snooptrot-Flandria	0	33		438
17	Whisky Joe	Mattack-On	0	30		395
18	Obiol Thierry	Snooptrot-Flandria	0	30		378
19	Ronconi Simon	CC La Foudre	0	26		373
20	Arbus Heinz	der ailleurs	1	33		371
21	Weber Marc	CC La Foudre	0	26		355
22	Lupin Romain	les oufs du bitume	0	25	U25	351
23	Subra Emile	der ailleurs	1	32		339
24	Rodde Eduardo	VC VB	0	25		339
25	Aygon Matthew	NordOfWorlds	0	24	U25	308
26	Nagatis Boris	les oufs du bitume	0	25		304
27	Maby Serge	der ailleurs	0	25	U25	304
28	Weston Ioan	les oufs du bitume	0	23	U25	301
29	Antti Romuald	vvrvrgdhdhddhdhhd	0	31		297
30	Tourte Ian	NordOfWorlds	0	27		277
31	Obe Bernardo	Les winners	0	30		277
32	Dagoreau Noel	Mattack-On	0	29		274
33	Hiepe Claudio	Mattack-On	0	32		266
34	Labomne Kim	Les winners	0	29		258
35	Cade Amaël	marcelo	0	28		257
36	Sorge Nikolaos	VC VB	0	28		250
37	Jaquemot Timothée	marcelo	0	31		247
38	Ayers Tim	Les winners	0	25	U25	244
39	Polo Ziad	NordOfWorlds	0	31		242
40	Subrin Shakar	Snooptrot-Flandria	0	34		218
41	Godard Javier	marcelo	0	30		216
42	Manieri Philipe	der ailleurs	0	29		215
43	Natif Fabien	der ailleurs	0	28		213
44	Maciet Jens	CC La Foudre	0	23	U25	207
45	Turc Yvan	CC La Foudre	0	23	U25	202
46	Lameco Joyson	Snooptrot-Flandria	0	26		198
47	Taisal Stefan	Snooptrot-Flandria	0	25	U25	192
48	Bordeau Gaëtan	der ailleurs	0	22	U25	190
49	Avril Célestin	Mattack-On	0	26		184
50	Calas Alfred	marcelo	0	30		173
51	Tuquet Steevy	les oufs du bitume	0	23	U25	170
52	Rutabaga Norbert	NordOfWorlds	0	30		151
53	Vrille Thibaud	der ailleurs	0	21	U25	146
54	Giuseppe Darren	marcelo	0	32		141
55	Obuch Antoine	CC La Foudre	0	23	U25	138
56	El Juli Clement	VC VB	0	24	U25	137
57	Hibos José Ángel	der ailleurs	0	21	U25	132
58	Sarko David	les oufs du bitume	0	24	U25	127
59	Nadir Russell	les oufs du bitume	0	25		127
60	Lage Momadou	PogiTeam	0	31		124
61	Skvortsov Alfredo	vvrvrgdhdhddhdhhd	0	29		120
62	Geli Terry	NordOfWorlds	0	31		118
63	Vink Florent	NordOfWorlds	0	29		117
64	Aurelle Rudy	marcelo	0	27		117
65	Lutkin Salvatore	vvrvrgdhdhddhdhhd	0	27		116
66	Antti Stefan	VC VB	0	28		116
67	Hiesgen Jose-Manuel	NordOfWorlds	0	23	U25	111
68	Daems Alejandro	der ailleurs	0	23	U25	107
69	Oberto Yves-Marie	Les winners	0	26		107
70	Sexage André	Mattack-On	0	28		104
71	Tivadar Felipe	Snooptrot-Flandria	0	34		102
72	Muhede Philipe	marcelo	0	25		101
73	Thorstensson Dennis	Les winners	0	27		96
74	Vernier Fernand	les oufs du bitume	0	22	U25	90
75	Lahtela Jacques	Gasc Team	0	30		90
76	Demailly Miguel	Mattack-On	0	29		89
77	Mudry Thibaut	NordOfWorlds	0	27		88
78	Jackel Pascal	PogiTeam	0	30		87
79	Pagnot Stewart	Mattack-On	0	23	U25	84
80	Tachon Alfonso	Les winners	0	25	U25	83
81	Jorrand Yaseen	NordOfWorlds	0	21	U25	79
82	Crepin Christiano	SalutCestFrankLeboeuf	0	29		76
83	Saltiel Rolf	SalutCestFrankLeboeuf	0	31		71
84	Packer Mousni	vvrvrgdhdhddhdhhd	0	29		67
85	Radin Josef	SalutCestFrankLeboeuf	0	31		65
86	Liron Florent	les oufs du bitume	0	25		61
87	Johnson Richie	marcelo	0	24	U25	61
88	Rage Oscar	Snooptrot-Flandria	0	24	U25	57
89	Vegalafonte Fernand	PogiTeam	0	27		55
90	Caraso Theodor	Gasc Team	0	28		54
91	Cauet Hossam	SalutCestFrankLeboeuf	0	30		54
92	Karembeu Yacine	les oufs du bitume	0	27		53
93	Manley Ludovic	PogiTeam	0	29		51
94	Brochet Louis-Claude	vvrvrgdhdhddhdhhd	0	24	U25	51
95	Chirigu Richie	Gasc Team	0	29		48
96	Hein Romuald	vvrvrgdhdhddhdhhd	0	30		42
97	Tossot Johann	VC VB	0	21	U25	41
98	Dusse Ambrósio	Mattack-On	0	22	U25	41
99	Duboe Ziad	Kritoff Team	0	31		40
100	Skvortsov Rudy	vvrvrgdhdhddhdhhd	0	26		38
101	Reboul Thomas	PogiTeam	0	27		37
102	Jack Henry	PogiTeam	0	28		37
103	Thiel Hubert	les oufs du bitume	0	22	U25	31
104	Khao Sok	CC La Foudre	0	23	U25	31
105	Rabe Timothy	les oufs du bitume	0	22	U25	30
106	Samson Stewart	Gasc Team	0	24	U25	27
107	Bertholet Guillaume	SalutCestFrankLeboeuf	0	28		27
108	Turnet Josh	Snooptrot-Flandria	0	23	U25	26
109	Biasio Joel	PogiTeam	0	24	U25	26
110	Tixier Omar	Gasc Team	0	28		25
111	Biassani Meriem	Kritoff Team	0	28		25
112	Lafoy Alfredo	Gasc Team	0	31		24
113	Nagy Yann	Kritoff Team	0	28		24
114	Popper Karl-Heinz	Snooptrot-Flandria	0	21	U25	23
115	Samli Guillaume	NordOfWorlds	0	26		21
116	Waught Nikolaos	Gasc Team	0	26		20
117	Nielsen Nokos	vvrvrgdhdhddhdhhd	0	22	U25	20
118	Morales Marcos	Kritoff Team	0	26		15
119	Tufo Morris	Kritoff Team	0	30		15
120	Tiget Ziad	Kritoff Team	0	26		14
121	Young Stan	SalutCestFrankLeboeuf	0	24	U25	14
122	Montenegro Jean-Guy	les oufs du bitume	0	25	U25	13
123	Léon Daniel	Kritoff Team	0	24	U25	13
124	Tacita Ivan	PogiTeam	0	22	U25	12
125	Tambourin Mike	NordOfWorlds	0	26		11
126	Turroques Omar	Gasc Team	0	22	U25	11
127	Surat Thani	VC VB	0	23	U25	11
128	Waught Phil	NordOfWorlds	0	24	U25	8
129	Fabry Raimundo	SalutCestFrankLeboeuf	0	23	U25	7`),u25:_(`#	Nom	Equipe	Victoires	Age	Points
1	Korsk Sven	Appletex	2	22	530
2	Daban Jean-François	Los Galacticos	1	22	369
3	Chasman Phet	AC BdV2	0	25	366
4	Kadiri Gilles	Les dérailleurs enrayés	1	23	352
5	Fache Miguel	Los Galacticos	0	22	304
6	Walden Edward	Appletex	0	22	274
7	Roumanov Siguei	Baksu Chyeo	0	23	239
8	Tunkel Robin	Los Galacticos	0	21	230
9	Piemontesi Alessio	Baksu Chyeo	0	23	230
10	Quellet Joachim	Los Galacticos	0	22	226
11	Tiberio Javier	Los Galacticos	0	22	218
12	Khao Sok	CC La Foudre	0	23	215
13	Bastien Eduardo	Gros Braquets	0	25	202
14	Brochard Ghislain	Les Best d'UAE	0	22	199
15	Ayache Blaise	Cyclo-path Team	0	24	193
16	Wyxhon Raoul	Les Best d'UAE	0	25	183
17	Kalocsay Andras	Appletex	0	23	181
18	Dirk Jean	Appletex	0	23	179
19	Armindo Kim	Les Best d'UAE	0	24	165
20	O Brien Charles	Tulisia Tuliszków	0	24	161
21	Campbell Seamus	Les dérailleurs enrayés	0	25	160
22	Valin Ricardo	Tulisia Tuliszków	0	23	155
23	Maciet Jens	CC La Foudre	0	23	151
24	Euillet Charles	vc fôret d'orient	0	24	150
25	Argot Luis	Los Galacticos	0	22	149
26	Parve Constantin	Gros Braquets	0	23	146
27	Breu Beat	vc fôret d'orient	0	22	142
28	Brahms	Tulisia Tuliszków	0	23	142
29	Hearsey Anastasio	Les Best d'UAE	0	23	141
30	Polyn Ingo	Les dérailleurs enrayés	0	23	138
31	Jens Nicolas	vc fôret d'orient	0	25	135
32	Didelot Théophile	Los Galacticos	0	21	133
33	Turc Yvan	CC La Foudre	0	23	133
34	Planus Elio	vc fôret d'orient	0	22	130
35	Raab Henri	Team PxL - Bianchi	0	20	127
36	Delaporte Ian	Ecc_49	0	22	123
37	Szabo Andras	Appletex	0	22	122
38	Jean-Guile Marc	CC La Foudre	0	21	119
39	Ronconi Youssef	Baksu Chyeo	0	21	116
40	Armindo Manfred	Les dérailleurs enrayés	0	22	111
41	Viktous Joe	Les Best d'UAE	0	21	106
42	Aygon Victor-Manuel	Team PxL - Bianchi	0	23	103
43	Naessens Basile	Team PxL - Bianchi	0	23	103
44	Lippner Edgard	Baksu Chyeo	0	20	102
45	van Looy Rik	New team raymond	0	24	101
46	Frenkel Francis	Ecc_49	0	23	99
47	Vigneron Jaime	Cyclo-path Team	0	20	94
48	Happö Arvo	Appletex	0	21	90
49	Talan Lionel	Ecc_49	0	20	88
50	Kratochvil Jarousek	Appletex	0	20	87
51	Ponpom Edouard	vc fôret d'orient	0	21	86
52	Montenegro Denis	Team PxL - Bianchi	0	20	80
53	Ingemarsson Hossam	Gros Braquets	0	22	78
54	De Fabritiis Gabriele	New team raymond	0	19	74
55	Cadeau Gregory	Les dérailleurs enrayés	0	20	74
56	Tahir Xavier	Baksu Chyeo	0	19	67
57	Teles Benjamin	Kritoff Team	0	22	60
58	Salomons Alfie	vc fôret d'orient	0	21	58
59	Paganeli Hervé	Les Best d'UAE	0	20	53
60	Dusse Jean	Les dérailleurs enrayés	0	20	53
61	Obuch Antoine	CC La Foudre	0	23	52
62	Twiggs Luka	vc fôret d'orient	0	19	51
63	Cigarito Alvaro	vc fôret d'orient	0	19	51
64	Laplegue Dries	Colobo V4	0	19	47
65	Bach	New team raymond	0	23	46
66	Daborn Eduardo	Baksu Chyeo	0	25	43
67	Paes Connor	Ecc_49	0	20	41
68	Seixas Paulo	CC La Foudre	0	19	40
69	Rademacker André	Les dérailleurs enrayés	0	19	40
70	Rodde Bryan	New team raymond	0	19	38
71	Rintaboot Jasper	Les dérailleurs enrayés	0	20	38
72	Onikki Jaime	melbourne76	0	19	38
73	Tulars Bernardo	Les Best d'UAE	0	20	37
74	Léon Daniel	Kritoff Team	0	24	37
75	Moulu Ernesto	Baksu Chyeo	0	18	36
76	Sombers Gareth	melbourne76	0	20	34
77	Whisky Daniel	melbourne76	0	19	34
78	Suarez Jeremie	melbourne76	0	19	32
79	Gros Andy	vc fôret d'orient	0	18	29
80	Marsulin Bill	Colobo V4	0	21	25
81	Lahoud Peter	AC BdV2	0	22	25
82	Arive Nikolaus	melbourne76	0	18	23
83	Nadry Edmond	melbourne76	0	18	23
84	Ingemarsson Jonson	melbourne76	0	18	22
85	Iler Miloud	melbourne76	0	22	21
86	Bleck Chris	melbourne76	0	19	21
87	Bascoul Colleen	Arsenal FC	0	23	20
88	Pogy Fernando-Jose	AC BdV2	0	20	20
89	Valin Jean-Marc	New team raymond	0	18	19
90	Tabbert Kenn	New team raymond	0	20	18
91	Saoulard Florin	melbourne76	0	19	10
92	Escobar Edmond	Tulisia Tuliszków	0	18	9
93	Lopez Ralph	Gros Braquets	0	18	8`),u21:_(`#	Nom	Equipe	Victoires	Age	Points
1	Mueh Renaud	OL CLUB	2	20	600
2	Raab Henri	Team PxL - Bianchi	1	20	486
3	Laisney Pedro	Mattack-On	0	20	338
4	Vigneron Jaime	Cyclo-path Team	0	20	336
5	Talan Lionel	Ecc_49	0	20	298
6	Humbert Luka	la pédale guyanaise	1	20	298
7	Allain Volver	Fuzion	0	21	262
8	Rage Jean-Louis	marcelo	0	21	260
9	Dalby Simon	Ultinam Besac Cycling	0	18	232
10	Ladeveze Hermès	VC VB	0	20	222
11	Valdivieso Pierre-André	Kaiku	0	21	220
12	Hibbos Lucius	NordOfWorlds	0	20	219
13	Paes Connor	Ecc_49	0	20	206
14	Haber Terry	marcelo	0	19	206
15	Heale Javier	Les Rockets	0	19	200
16	Montenegro Denis	Team PxL - Bianchi	0	20	188
17	Tumbarello Pablo	Mattack-On	0	20	184
18	Isidore Noa	Ultinam Besac Cycling	0	20	178
19	Eveno Judas	La Chartraine	0	19	171
20	Lagauche Florent	La Chartraine	0	18	160
21	Baldato Fabio	Ultinam Besac Cycling	0	19	151
22	Partouche Tiago	GCpowaaaa	0	19	150
23	Timmins Cyril	OL CLUB	0	20	146
24	Sparfel Aubin	Ultinam Besac Cycling	0	21	145
25	Jacobs Jason	la pédale guyanaise	0	20	144
26	Polyzarini Maximilian	la pédale guyanaise	0	20	138
27	Exchange Javier	la pédale guyanaise	0	21	133
28	Weston Stefan	la pédale guyanaise	0	19	126
29	Valdo Mathieu	La Chartraine	0	18	125
30	Vernet Harold	la pédale guyanaise	0	19	123
31	Martes Emile	GCpowaaaa	0	21	118
32	Flecha Juan Antonio	Ultinam Besac Cycling	0	18	112
33	Mancebo Fabio	Dennemont78	0	20	112
34	Lebley Ioan	Kaiku	0	18	107
35	Poissel Hong	GCpowaaaa	0	20	105
36	Obyrne Blaise	Dennemont78	0	20	93
37	Manfred Michel-Denis	Fuzion	0	18	91
38	Coache Jean-Denis	Dennemont78	0	20	87
39	Pier Olivier	Fuzion	0	19	87
40	Gianetti Mauro	Ultinam Besac Cycling	0	19	85
41	Litoux Matheo	Dennemont78	0	19	80
42	Quero Tom	GCpowaaaa	0	20	74
43	Beng Luis	Dennemont78	0	19	69
44	Zoulou Kenn	Dennemont78	0	17	64
45	Sombrero Pedro	Dennemont78	0	20	58
46	Charre Vassili	Dennemont78	0	20	53
47	Meca Timothy	Fuzion	0	18	51
48	Boogerd Michael	Ultinam Besac Cycling	0	17	48
49	Da conceicao Thiebault	Fuzion	0	18	45
50	Healy Fritz	Fuzion	0	20	36
51	Picollet Bertrand	Oytak	0	18	35
52	Hallyday Roberto	Oytak	0	18	34
53	Gonzales Bryan	Oytak	0	17	33
54	Piebel Maike	la pédale guyanaise	0	18	28
55	Roberton Antonin	Dennemont78	0	19	26
56	Samochin Jeremie	Dennemont78	0	21	25
57	Taillard Kenn	Dennemont78	0	18	25
58	Jorgensen Alessio	Fuzion	0	20	23
59	El Gourch Mohamed	Ultinam Besac Cycling	0	18	15`)},y=n();function b(e){if(!e)return!1;let t=u(e);if(!t)return!1;let n=new Date(t);if(Number.isNaN(n.getTime()))return!1;let r=new Date(`${g}T23:59:59`);return n.getTime()>r.getTime()}function x(e,t){let n=new Map;return e.forEach(e=>{n.set(e.name,{...e})}),t.forEach(e=>{let t=n.get(e.name);if(t){n.set(e.name,{...t,team:e.team||t.team,points:t.points+e.points});return}n.set(e.name,{rank:2**53-1,name:e.name,team:e.team,points:e.points})}),Array.from(n.values()).sort((e,t)=>t.points===e.points?e.rank===t.rank?e.name.localeCompare(t.name,`fr`):e.rank-t.rank:t.points-e.points).map((e,t)=>({...e,rank:t+1}))}function S(e){r(e)}function C(e){let t=new Map;return e.forEach(({team:e,points:n})=>{e&&t.set(e,(t.get(e)||0)+n)}),Array.from(t.entries()).map(([e,t])=>({team:e,points:t})).sort((e,t)=>t.points-e.points)}function w(e){return e===1?`1er`:e===2?`2nd`:e===3?`3eme`:`${e}eme`}function T(e){return e===`u25`?`U25`:e===`u21`?`U21`:`Pro`}function E(e,t){return t===`u25`?e.u25:t===`u21`?e.u21:e.pro}function D(e){return[{value:`pro`,label:`Pro (Division ${e.pro||`-`})`},{value:`u25`,label:`U25 (Division ${e.u25||`-`})`},{value:`u21`,label:`U21 (Division ${e.u21||`-`})`}]}function O(){let e=i(),t=o(),n={pro:t.divisionPro,u25:t.divisionU25,u21:t.divisionU21},r=l().filter(e=>e.id.startsWith(`calendar-`)),u=!1;Object.keys(e).forEach(t=>{r.some(e=>e.id===t)||(delete e[t],u=!0)}),Object.entries(e).forEach(([t,n])=>{typeof n==`string`&&(e[t]={result:n,category:d(n,r.find(e=>e.id===t))},u=!0)}),u&&S(s(e,r).results);let f=new Map,p=new Map,h=new Map,g=new Map,_=new Map,y=new Map;Object.entries(e).forEach(([e,t])=>{let n=d(t,r.find(t=>t.id===e)),i=t;typeof t==`object`&&t&&`result`in t&&`category`in t&&(i=t.result);let o=a({[e]:i}),s=n===`u25`?p:n===`u21`?h:f,c=n===`u25`?_:n===`u21`?y:g,l=b(r.find(t=>t.id===e));o.forEach(({name:e,team:t,points:n})=>{if(!s.has(e))s.set(e,{name:e,team:t,points:n});else{let t=s.get(e);s.set(e,{...t,points:t.points+n})}if(!l)return;if(!c.has(e)){c.set(e,{name:e,team:t,points:n});return}let r=c.get(e);c.set(e,{...r,points:r.points+n})})});let C=m();return Object.entries(C).forEach(([e,t])=>{let n=r.filter(t=>t.tourKey===e);if(n.length===0)return;let i=c(n[0]),o=[...n].sort((e,t)=>(e.stageNumber??0)-(t.stageNumber??0)),s=o[o.length-1],l=a({[`gc-${e}`]:t}),u=i===`u25`?p:i===`u21`?h:f,d=i===`u25`?_:i===`u21`?y:g,m=b(s);l.forEach(({name:e,team:t,points:n})=>{if(!u.has(e))u.set(e,{name:e,team:t,points:n});else{let t=u.get(e);u.set(e,{...t,points:t.points+n})}if(!m)return;if(!d.has(e)){d.set(e,{name:e,team:t,points:n});return}let r=d.get(e);d.set(e,{...r,points:r.points+n})})}),{divisions:n,pro:Array.from(f.values()).sort((e,t)=>t.points-e.points),u25:Array.from(p.values()).sort((e,t)=>t.points-e.points),u21:Array.from(h.values()).sort((e,t)=>t.points-e.points),proTeams:[],u25Teams:[],u21Teams:[],mergedIndividuals:{pro:x(v.pro,Array.from(g.values())),u25:x(v.u25,Array.from(_.values())),u21:x(v.u21,Array.from(y.values()))}}}function k(){let[e,t]=(0,h.useState)(`individuel`),[n,r]=(0,h.useState)(`pro`),[i,a]=(0,h.useState)(`pro`),{divisions:o,pro:s,u25:c,u21:l,mergedIndividuals:u}=(0,h.useMemo)(()=>O(),[]),d=(0,h.useMemo)(()=>D(o),[o]),m={pro:s,u25:c,u21:l},g=u[n],_={pro:C(u.pro),u25:C(u.u25),u21:C(u.u21)},v=m[n],b=_[i],x=`Equipe ${T(n)} (Division ${E(o,n)||`-`})`,S=`Classement par equipe ${T(i)} (Division ${E(o,i)||`-`})`;return(0,y.jsxs)(`div`,{className:`page-stack page-stack-narrow`,children:[(0,y.jsx)(p,{title:`Classement`,subtitle:`Consultez les classements des equipes Pro, U25 et U21.`}),(0,y.jsxs)(`div`,{className:`ranking-tabs-row`,children:[(0,y.jsx)(`button`,{className:e===`individuel`?`tab-btn tab-btn-active`:`tab-btn`,onClick:()=>t(`individuel`),type:`button`,children:`Classement individuel`}),(0,y.jsx)(`button`,{className:e===`equipes`?`tab-btn tab-btn-active`:`tab-btn`,onClick:()=>t(`equipes`),type:`button`,children:`Classement par equipe`})]}),e===`individuel`&&(0,y.jsxs)(`div`,{className:`page-stack`,children:[(0,y.jsxs)(`div`,{className:`select-row ranking-filter-row`,children:[(0,y.jsx)(`label`,{htmlFor:`individual-ranking-category`,className:`select-label`,children:`Type d'equipe :`}),(0,y.jsx)(`select`,{id:`individual-ranking-category`,className:`input select-input`,value:n,onChange:e=>r(e.target.value),children:d.map(e=>(0,y.jsx)(`option`,{value:e.value,children:e.label},e.value))})]}),(0,y.jsx)(f,{title:`Base ${T(n)} intégrée`,children:(0,y.jsx)(`div`,{className:`message-box`,children:(0,y.jsxs)(`p`,{className:`muted`,children:[`Classement de départ intégré au `,`2026-04-18`,`. A partir de la prochaine course enregistrée après cette date, les points seront ajoutés automatiquement à cette base.`]})})}),(0,y.jsx)(f,{title:x,children:g.length>0?(0,y.jsx)(`div`,{className:`table-container`,children:(0,y.jsxs)(`table`,{className:`data-table styled-table`,children:[(0,y.jsx)(`thead`,{children:(0,y.jsxs)(`tr`,{children:[(0,y.jsx)(`th`,{children:`Cl.`}),(0,y.jsx)(`th`,{children:`Nom`}),(0,y.jsx)(`th`,{children:`Equipe`}),(0,y.jsx)(`th`,{children:`Victoires`}),(0,y.jsx)(`th`,{children:`Age`}),(0,y.jsx)(`th`,{children:`Cat.`}),(0,y.jsx)(`th`,{children:`Points`})]})}),(0,y.jsx)(`tbody`,{children:g.map(e=>(0,y.jsxs)(`tr`,{className:e.team===`Kritoff Team`?`highlight-row`:void 0,children:[(0,y.jsx)(`td`,{children:w(e.rank)}),(0,y.jsx)(`td`,{children:e.name}),(0,y.jsx)(`td`,{children:e.team}),(0,y.jsx)(`td`,{children:e.wins??`-`}),(0,y.jsx)(`td`,{children:e.age??`-`}),(0,y.jsx)(`td`,{children:e.categoryLabel||`-`}),(0,y.jsx)(`td`,{children:e.points})]},`${e.rank}-${e.name}`))})]})}):v.length===0?(0,y.jsx)(`div`,{children:`Aucun classement disponible.`}):(0,y.jsx)(`div`,{className:`table-container`,children:(0,y.jsxs)(`table`,{className:`data-table styled-table`,children:[(0,y.jsx)(`thead`,{children:(0,y.jsxs)(`tr`,{children:[(0,y.jsx)(`th`,{children:`Cl.`}),(0,y.jsx)(`th`,{children:`Nom`}),(0,y.jsx)(`th`,{children:`Equipe`}),(0,y.jsx)(`th`,{children:`Points`})]})}),(0,y.jsx)(`tbody`,{children:v.map((e,t)=>(0,y.jsxs)(`tr`,{className:e.team===`Kritoff Team`?`highlight-row`:void 0,children:[(0,y.jsx)(`td`,{children:w(t+1)}),(0,y.jsx)(`td`,{children:e.name}),(0,y.jsx)(`td`,{children:e.team}),(0,y.jsx)(`td`,{children:e.points})]},`${e.name}-${t}`))})]})})})]}),e===`equipes`&&(0,y.jsxs)(`div`,{className:`page-stack`,children:[(0,y.jsx)(`div`,{className:`message-box`,children:(0,y.jsx)(`p`,{className:`muted`,children:`Le classement par equipe reste pour l'instant base sur les resultats locaux sauvegardes. L'import global des equipes sera raccorde ensuite.`})}),(0,y.jsxs)(`div`,{className:`select-row ranking-filter-row`,children:[(0,y.jsx)(`label`,{htmlFor:`team-ranking-category`,className:`select-label`,children:`Type d'equipe :`}),(0,y.jsx)(`select`,{id:`team-ranking-category`,className:`input select-input`,value:i,onChange:e=>a(e.target.value),children:d.map(e=>(0,y.jsx)(`option`,{value:e.value,children:e.label},e.value))})]}),(0,y.jsx)(f,{title:S,children:b.length===0?(0,y.jsx)(`div`,{children:`Aucun classement disponible.`}):(0,y.jsx)(`div`,{className:`table-container`,children:(0,y.jsxs)(`table`,{className:`data-table styled-table`,children:[(0,y.jsx)(`thead`,{children:(0,y.jsxs)(`tr`,{children:[(0,y.jsx)(`th`,{children:`Cl.`}),(0,y.jsx)(`th`,{children:`Equipe`}),(0,y.jsx)(`th`,{children:`Points`})]})}),(0,y.jsx)(`tbody`,{children:b.map((e,t)=>(0,y.jsxs)(`tr`,{className:e.team===`Kritoff Team`?`highlight-row`:void 0,children:[(0,y.jsx)(`td`,{children:w(t+1)}),(0,y.jsx)(`td`,{children:e.team}),(0,y.jsx)(`td`,{children:e.points})]},`${e.team}-${t}`))})]})})})]})]})}export{k as default};