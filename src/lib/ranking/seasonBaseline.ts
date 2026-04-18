export type BaselineRankingRow = {
  rank: number;
  name: string;
  team: string;
  points: number;
  wins?: number;
  age?: number;
  categoryLabel?: string;
};

export type BaselineIndividualRankings = {
  pro: BaselineRankingRow[];
  u25: BaselineRankingRow[];
  u21: BaselineRankingRow[];
};

export const BASELINE_EFFECTIVE_DATE = "2026-04-18";

function parseBaselineRanking(rawText: string): BaselineRankingRow[] {
  const lines = rawText
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split("\t").map((header) => header.trim().toLowerCase());
  const rankIdx = headers.findIndex((header) => header === "#");
  const nameIdx = headers.findIndex((header) => header.includes("nom") || header.includes("coureur"));
  const teamIdx = headers.findIndex((header) => header.includes("equipe"));
  const pointsIdx = headers.findIndex((header) => header.includes("point"));
  const winsIdx = headers.findIndex((header) => header.includes("victoire"));
  const ageIdx = headers.findIndex((header) => header === "age");
  const categoryIdx = headers.findIndex((header) => header === "cat");

  if (rankIdx === -1 || nameIdx === -1 || teamIdx === -1 || pointsIdx === -1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => line.split("\t"))
    .map((cells) => {
      const rank = Number.parseInt(cells[rankIdx]?.replace(/[^\d]/g, "") ?? "", 10);
      const points = Number.parseInt(cells[pointsIdx]?.replace(/[^\d]/g, "") ?? "", 10);
      const wins = winsIdx >= 0
        ? Number.parseInt(cells[winsIdx]?.replace(/[^\d]/g, "") ?? "", 10)
        : undefined;
      const age = ageIdx >= 0
        ? Number.parseInt(cells[ageIdx]?.replace(/[^\d]/g, "") ?? "", 10)
        : undefined;

      return {
        rank,
        name: cells[nameIdx]?.trim() ?? "",
        team: cells[teamIdx]?.trim() ?? "",
        points,
        wins: wins !== undefined && !Number.isNaN(wins) ? wins : undefined,
        age: age !== undefined && !Number.isNaN(age) ? age : undefined,
        categoryLabel: categoryIdx >= 0 ? cells[categoryIdx]?.trim() || undefined : undefined,
      };
    })
    .filter(
      (row) =>
        !Number.isNaN(row.rank) &&
        !Number.isNaN(row.points) &&
        row.name.length > 0 &&
        row.team.length > 0
    );
}

const PRO_BASELINE_RAW = `#\tCoureur\tEquipe\tVictoires\tAge\tCat\tPoints
1\tBogoss Thierry\tCC La Foudre\t6\t32\t\t1280
2\tMachemy Jean-Laurent\tNordOfWorlds\t3\t29\t\t1056
3\tKalf Thierry\tLes winners\t3\t32\t\t930
4\tMarinot Gavin\tSnooptrot-Flandria\t1\t30\t\t723
5\tMace Jean\tCC La Foudre\t0\t28\t\t635
6\tWeber Xavier\tSnooptrot-Flandria\t1\t27\t\t606
7\tRabert Felix\tNordOfWorlds\t1\t32\t\t599
8\tHaber Ivan\tLes winners\t0\t32\t\t548
9\tDuarte Kenn\tder ailleurs\t0\t31\t\t544
10\tEbel Manfred\tSnooptrot-Flandria\t0\t31\t\t538
11\tLoneur Remy\tder ailleurs\t0\t32\t\t527
12\tStoickov James\tVC VB\t0\t31\t\t517
13\tMarcout Anthony\tVC VB\t0\t30\t\t502
14\tNavarre Ivan\tVC VB\t0\t31\t\t488
15\tAtchoum Stan\tVC VB\t0\t28\t\t468
16\tUdall Russell\tSnooptrot-Flandria\t0\t33\t\t438
17\tWhisky Joe\tMattack-On\t0\t30\t\t395
18\tObiol Thierry\tSnooptrot-Flandria\t0\t30\t\t378
19\tRonconi Simon\tCC La Foudre\t0\t26\t\t373
20\tArbus Heinz\tder ailleurs\t1\t33\t\t371
21\tWeber Marc\tCC La Foudre\t0\t26\t\t355
22\tLupin Romain\tles oufs du bitume\t0\t25\tU25\t351
23\tSubra Emile\tder ailleurs\t1\t32\t\t339
24\tRodde Eduardo\tVC VB\t0\t25\t\t339
25\tAygon Matthew\tNordOfWorlds\t0\t24\tU25\t308
26\tNagatis Boris\tles oufs du bitume\t0\t25\t\t304
27\tMaby Serge\tder ailleurs\t0\t25\tU25\t304
28\tWeston Ioan\tles oufs du bitume\t0\t23\tU25\t301
29\tAntti Romuald\tvvrvrgdhdhddhdhhd\t0\t31\t\t297
30\tTourte Ian\tNordOfWorlds\t0\t27\t\t277
31\tObe Bernardo\tLes winners\t0\t30\t\t277
32\tDagoreau Noel\tMattack-On\t0\t29\t\t274
33\tHiepe Claudio\tMattack-On\t0\t32\t\t266
34\tLabomne Kim\tLes winners\t0\t29\t\t258
35\tCade Amaël\tmarcelo\t0\t28\t\t257
36\tSorge Nikolaos\tVC VB\t0\t28\t\t250
37\tJaquemot Timothée\tmarcelo\t0\t31\t\t247
38\tAyers Tim\tLes winners\t0\t25\tU25\t244
39\tPolo Ziad\tNordOfWorlds\t0\t31\t\t242
40\tSubrin Shakar\tSnooptrot-Flandria\t0\t34\t\t218
41\tGodard Javier\tmarcelo\t0\t30\t\t216
42\tManieri Philipe\tder ailleurs\t0\t29\t\t215
43\tNatif Fabien\tder ailleurs\t0\t28\t\t213
44\tMaciet Jens\tCC La Foudre\t0\t23\tU25\t207
45\tTurc Yvan\tCC La Foudre\t0\t23\tU25\t202
46\tLameco Joyson\tSnooptrot-Flandria\t0\t26\t\t198
47\tTaisal Stefan\tSnooptrot-Flandria\t0\t25\tU25\t192
48\tBordeau Gaëtan\tder ailleurs\t0\t22\tU25\t190
49\tAvril Célestin\tMattack-On\t0\t26\t\t184
50\tCalas Alfred\tmarcelo\t0\t30\t\t173
51\tTuquet Steevy\tles oufs du bitume\t0\t23\tU25\t170
52\tRutabaga Norbert\tNordOfWorlds\t0\t30\t\t151
53\tVrille Thibaud\tder ailleurs\t0\t21\tU25\t146
54\tGiuseppe Darren\tmarcelo\t0\t32\t\t141
55\tObuch Antoine\tCC La Foudre\t0\t23\tU25\t138
56\tEl Juli Clement\tVC VB\t0\t24\tU25\t137
57\tHibos José Ángel\tder ailleurs\t0\t21\tU25\t132
58\tSarko David\tles oufs du bitume\t0\t24\tU25\t127
59\tNadir Russell\tles oufs du bitume\t0\t25\t\t127
60\tLage Momadou\tPogiTeam\t0\t31\t\t124
61\tSkvortsov Alfredo\tvvrvrgdhdhddhdhhd\t0\t29\t\t120
62\tGeli Terry\tNordOfWorlds\t0\t31\t\t118
63\tVink Florent\tNordOfWorlds\t0\t29\t\t117
64\tAurelle Rudy\tmarcelo\t0\t27\t\t117
65\tLutkin Salvatore\tvvrvrgdhdhddhdhhd\t0\t27\t\t116
66\tAntti Stefan\tVC VB\t0\t28\t\t116
67\tHiesgen Jose-Manuel\tNordOfWorlds\t0\t23\tU25\t111
68\tDaems Alejandro\tder ailleurs\t0\t23\tU25\t107
69\tOberto Yves-Marie\tLes winners\t0\t26\t\t107
70\tSexage André\tMattack-On\t0\t28\t\t104
71\tTivadar Felipe\tSnooptrot-Flandria\t0\t34\t\t102
72\tMuhede Philipe\tmarcelo\t0\t25\t\t101
73\tThorstensson Dennis\tLes winners\t0\t27\t\t96
74\tVernier Fernand\tles oufs du bitume\t0\t22\tU25\t90
75\tLahtela Jacques\tGasc Team\t0\t30\t\t90
76\tDemailly Miguel\tMattack-On\t0\t29\t\t89
77\tMudry Thibaut\tNordOfWorlds\t0\t27\t\t88
78\tJackel Pascal\tPogiTeam\t0\t30\t\t87
79\tPagnot Stewart\tMattack-On\t0\t23\tU25\t84
80\tTachon Alfonso\tLes winners\t0\t25\tU25\t83
81\tJorrand Yaseen\tNordOfWorlds\t0\t21\tU25\t79
82\tCrepin Christiano\tSalutCestFrankLeboeuf\t0\t29\t\t76
83\tSaltiel Rolf\tSalutCestFrankLeboeuf\t0\t31\t\t71
84\tPacker Mousni\tvvrvrgdhdhddhdhhd\t0\t29\t\t67
85\tRadin Josef\tSalutCestFrankLeboeuf\t0\t31\t\t65
86\tLiron Florent\tles oufs du bitume\t0\t25\t\t61
87\tJohnson Richie\tmarcelo\t0\t24\tU25\t61
88\tRage Oscar\tSnooptrot-Flandria\t0\t24\tU25\t57
89\tVegalafonte Fernand\tPogiTeam\t0\t27\t\t55
90\tCaraso Theodor\tGasc Team\t0\t28\t\t54
91\tCauet Hossam\tSalutCestFrankLeboeuf\t0\t30\t\t54
92\tKarembeu Yacine\tles oufs du bitume\t0\t27\t\t53
93\tManley Ludovic\tPogiTeam\t0\t29\t\t51
94\tBrochet Louis-Claude\tvvrvrgdhdhddhdhhd\t0\t24\tU25\t51
95\tChirigu Richie\tGasc Team\t0\t29\t\t48
96\tHein Romuald\tvvrvrgdhdhddhdhhd\t0\t30\t\t42
97\tTossot Johann\tVC VB\t0\t21\tU25\t41
98\tDusse Ambrósio\tMattack-On\t0\t22\tU25\t41
99\tDuboe Ziad\tKritoff Team\t0\t31\t\t40
100\tSkvortsov Rudy\tvvrvrgdhdhddhdhhd\t0\t26\t\t38
101\tReboul Thomas\tPogiTeam\t0\t27\t\t37
102\tJack Henry\tPogiTeam\t0\t28\t\t37
103\tThiel Hubert\tles oufs du bitume\t0\t22\tU25\t31
104\tKhao Sok\tCC La Foudre\t0\t23\tU25\t31
105\tRabe Timothy\tles oufs du bitume\t0\t22\tU25\t30
106\tSamson Stewart\tGasc Team\t0\t24\tU25\t27
107\tBertholet Guillaume\tSalutCestFrankLeboeuf\t0\t28\t\t27
108\tTurnet Josh\tSnooptrot-Flandria\t0\t23\tU25\t26
109\tBiasio Joel\tPogiTeam\t0\t24\tU25\t26
110\tTixier Omar\tGasc Team\t0\t28\t\t25
111\tBiassani Meriem\tKritoff Team\t0\t28\t\t25
112\tLafoy Alfredo\tGasc Team\t0\t31\t\t24
113\tNagy Yann\tKritoff Team\t0\t28\t\t24
114\tPopper Karl-Heinz\tSnooptrot-Flandria\t0\t21\tU25\t23
115\tSamli Guillaume\tNordOfWorlds\t0\t26\t\t21
116\tWaught Nikolaos\tGasc Team\t0\t26\t\t20
117\tNielsen Nokos\tvvrvrgdhdhddhdhhd\t0\t22\tU25\t20
118\tMorales Marcos\tKritoff Team\t0\t26\t\t15
119\tTufo Morris\tKritoff Team\t0\t30\t\t15
120\tTiget Ziad\tKritoff Team\t0\t26\t\t14
121\tYoung Stan\tSalutCestFrankLeboeuf\t0\t24\tU25\t14
122\tMontenegro Jean-Guy\tles oufs du bitume\t0\t25\tU25\t13
123\tLéon Daniel\tKritoff Team\t0\t24\tU25\t13
124\tTacita Ivan\tPogiTeam\t0\t22\tU25\t12
125\tTambourin Mike\tNordOfWorlds\t0\t26\t\t11
126\tTurroques Omar\tGasc Team\t0\t22\tU25\t11
127\tSurat Thani\tVC VB\t0\t23\tU25\t11
128\tWaught Phil\tNordOfWorlds\t0\t24\tU25\t8
129\tFabry Raimundo\tSalutCestFrankLeboeuf\t0\t23\tU25\t7`;

const U25_BASELINE_RAW = `#\tNom\tEquipe\tVictoires\tAge\tPoints
1\tKorsk Sven\tAppletex\t2\t22\t530
2\tDaban Jean-François\tLos Galacticos\t1\t22\t369
3\tChasman Phet\tAC BdV2\t0\t25\t366
4\tKadiri Gilles\tLes dérailleurs enrayés\t1\t23\t352
5\tFache Miguel\tLos Galacticos\t0\t22\t304
6\tWalden Edward\tAppletex\t0\t22\t274
7\tRoumanov Siguei\tBaksu Chyeo\t0\t23\t239
8\tTunkel Robin\tLos Galacticos\t0\t21\t230
9\tPiemontesi Alessio\tBaksu Chyeo\t0\t23\t230
10\tQuellet Joachim\tLos Galacticos\t0\t22\t226
11\tTiberio Javier\tLos Galacticos\t0\t22\t218
12\tKhao Sok\tCC La Foudre\t0\t23\t215
13\tBastien Eduardo\tGros Braquets\t0\t25\t202
14\tBrochard Ghislain\tLes Best d'UAE\t0\t22\t199
15\tAyache Blaise\tCyclo-path Team\t0\t24\t193
16\tWyxhon Raoul\tLes Best d'UAE\t0\t25\t183
17\tKalocsay Andras\tAppletex\t0\t23\t181
18\tDirk Jean\tAppletex\t0\t23\t179
19\tArmindo Kim\tLes Best d'UAE\t0\t24\t165
20\tO Brien Charles\tTulisia Tuliszków\t0\t24\t161
21\tCampbell Seamus\tLes dérailleurs enrayés\t0\t25\t160
22\tValin Ricardo\tTulisia Tuliszków\t0\t23\t155
23\tMaciet Jens\tCC La Foudre\t0\t23\t151
24\tEuillet Charles\tvc fôret d'orient\t0\t24\t150
25\tArgot Luis\tLos Galacticos\t0\t22\t149
26\tParve Constantin\tGros Braquets\t0\t23\t146
27\tBreu Beat\tvc fôret d'orient\t0\t22\t142
28\tBrahms\tTulisia Tuliszków\t0\t23\t142
29\tHearsey Anastasio\tLes Best d'UAE\t0\t23\t141
30\tPolyn Ingo\tLes dérailleurs enrayés\t0\t23\t138
31\tJens Nicolas\tvc fôret d'orient\t0\t25\t135
32\tDidelot Théophile\tLos Galacticos\t0\t21\t133
33\tTurc Yvan\tCC La Foudre\t0\t23\t133
34\tPlanus Elio\tvc fôret d'orient\t0\t22\t130
35\tRaab Henri\tTeam PxL - Bianchi\t0\t20\t127
36\tDelaporte Ian\tEcc_49\t0\t22\t123
37\tSzabo Andras\tAppletex\t0\t22\t122
38\tJean-Guile Marc\tCC La Foudre\t0\t21\t119
39\tRonconi Youssef\tBaksu Chyeo\t0\t21\t116
40\tArmindo Manfred\tLes dérailleurs enrayés\t0\t22\t111
41\tViktous Joe\tLes Best d'UAE\t0\t21\t106
42\tAygon Victor-Manuel\tTeam PxL - Bianchi\t0\t23\t103
43\tNaessens Basile\tTeam PxL - Bianchi\t0\t23\t103
44\tLippner Edgard\tBaksu Chyeo\t0\t20\t102
45\tvan Looy Rik\tNew team raymond\t0\t24\t101
46\tFrenkel Francis\tEcc_49\t0\t23\t99
47\tVigneron Jaime\tCyclo-path Team\t0\t20\t94
48\tHappö Arvo\tAppletex\t0\t21\t90
49\tTalan Lionel\tEcc_49\t0\t20\t88
50\tKratochvil Jarousek\tAppletex\t0\t20\t87
51\tPonpom Edouard\tvc fôret d'orient\t0\t21\t86
52\tMontenegro Denis\tTeam PxL - Bianchi\t0\t20\t80
53\tIngemarsson Hossam\tGros Braquets\t0\t22\t78
54\tDe Fabritiis Gabriele\tNew team raymond\t0\t19\t74
55\tCadeau Gregory\tLes dérailleurs enrayés\t0\t20\t74
56\tTahir Xavier\tBaksu Chyeo\t0\t19\t67
57\tTeles Benjamin\tKritoff Team\t0\t22\t60
58\tSalomons Alfie\tvc fôret d'orient\t0\t21\t58
59\tPaganeli Hervé\tLes Best d'UAE\t0\t20\t53
60\tDusse Jean\tLes dérailleurs enrayés\t0\t20\t53
61\tObuch Antoine\tCC La Foudre\t0\t23\t52
62\tTwiggs Luka\tvc fôret d'orient\t0\t19\t51
63\tCigarito Alvaro\tvc fôret d'orient\t0\t19\t51
64\tLaplegue Dries\tColobo V4\t0\t19\t47
65\tBach\tNew team raymond\t0\t23\t46
66\tDaborn Eduardo\tBaksu Chyeo\t0\t25\t43
67\tPaes Connor\tEcc_49\t0\t20\t41
68\tSeixas Paulo\tCC La Foudre\t0\t19\t40
69\tRademacker André\tLes dérailleurs enrayés\t0\t19\t40
70\tRodde Bryan\tNew team raymond\t0\t19\t38
71\tRintaboot Jasper\tLes dérailleurs enrayés\t0\t20\t38
72\tOnikki Jaime\tmelbourne76\t0\t19\t38
73\tTulars Bernardo\tLes Best d'UAE\t0\t20\t37
74\tLéon Daniel\tKritoff Team\t0\t24\t37
75\tMoulu Ernesto\tBaksu Chyeo\t0\t18\t36
76\tSombers Gareth\tmelbourne76\t0\t20\t34
77\tWhisky Daniel\tmelbourne76\t0\t19\t34
78\tSuarez Jeremie\tmelbourne76\t0\t19\t32
79\tGros Andy\tvc fôret d'orient\t0\t18\t29
80\tMarsulin Bill\tColobo V4\t0\t21\t25
81\tLahoud Peter\tAC BdV2\t0\t22\t25
82\tArive Nikolaus\tmelbourne76\t0\t18\t23
83\tNadry Edmond\tmelbourne76\t0\t18\t23
84\tIngemarsson Jonson\tmelbourne76\t0\t18\t22
85\tIler Miloud\tmelbourne76\t0\t22\t21
86\tBleck Chris\tmelbourne76\t0\t19\t21
87\tBascoul Colleen\tArsenal FC\t0\t23\t20
88\tPogy Fernando-Jose\tAC BdV2\t0\t20\t20
89\tValin Jean-Marc\tNew team raymond\t0\t18\t19
90\tTabbert Kenn\tNew team raymond\t0\t20\t18
91\tSaoulard Florin\tmelbourne76\t0\t19\t10
92\tEscobar Edmond\tTulisia Tuliszków\t0\t18\t9
93\tLopez Ralph\tGros Braquets\t0\t18\t8`;

const U21_BASELINE_RAW = `#\tNom\tEquipe\tVictoires\tAge\tPoints
1\tMueh Renaud\tOL CLUB\t2\t20\t600
2\tRaab Henri\tTeam PxL - Bianchi\t1\t20\t486
3\tLaisney Pedro\tMattack-On\t0\t20\t338
4\tVigneron Jaime\tCyclo-path Team\t0\t20\t336
5\tTalan Lionel\tEcc_49\t0\t20\t298
6\tHumbert Luka\tla pédale guyanaise\t1\t20\t298
7\tAllain Volver\tFuzion\t0\t21\t262
8\tRage Jean-Louis\tmarcelo\t0\t21\t260
9\tDalby Simon\tUltinam Besac Cycling\t0\t18\t232
10\tLadeveze Hermès\tVC VB\t0\t20\t222
11\tValdivieso Pierre-André\tKaiku\t0\t21\t220
12\tHibbos Lucius\tNordOfWorlds\t0\t20\t219
13\tPaes Connor\tEcc_49\t0\t20\t206
14\tHaber Terry\tmarcelo\t0\t19\t206
15\tHeale Javier\tLes Rockets\t0\t19\t200
16\tMontenegro Denis\tTeam PxL - Bianchi\t0\t20\t188
17\tTumbarello Pablo\tMattack-On\t0\t20\t184
18\tIsidore Noa\tUltinam Besac Cycling\t0\t20\t178
19\tEveno Judas\tLa Chartraine\t0\t19\t171
20\tLagauche Florent\tLa Chartraine\t0\t18\t160
21\tBaldato Fabio\tUltinam Besac Cycling\t0\t19\t151
22\tPartouche Tiago\tGCpowaaaa\t0\t19\t150
23\tTimmins Cyril\tOL CLUB\t0\t20\t146
24\tSparfel Aubin\tUltinam Besac Cycling\t0\t21\t145
25\tJacobs Jason\tla pédale guyanaise\t0\t20\t144
26\tPolyzarini Maximilian\tla pédale guyanaise\t0\t20\t138
27\tExchange Javier\tla pédale guyanaise\t0\t21\t133
28\tWeston Stefan\tla pédale guyanaise\t0\t19\t126
29\tValdo Mathieu\tLa Chartraine\t0\t18\t125
30\tVernet Harold\tla pédale guyanaise\t0\t19\t123
31\tMartes Emile\tGCpowaaaa\t0\t21\t118
32\tFlecha Juan Antonio\tUltinam Besac Cycling\t0\t18\t112
33\tMancebo Fabio\tDennemont78\t0\t20\t112
34\tLebley Ioan\tKaiku\t0\t18\t107
35\tPoissel Hong\tGCpowaaaa\t0\t20\t105
36\tObyrne Blaise\tDennemont78\t0\t20\t93
37\tManfred Michel-Denis\tFuzion\t0\t18\t91
38\tCoache Jean-Denis\tDennemont78\t0\t20\t87
39\tPier Olivier\tFuzion\t0\t19\t87
40\tGianetti Mauro\tUltinam Besac Cycling\t0\t19\t85
41\tLitoux Matheo\tDennemont78\t0\t19\t80
42\tQuero Tom\tGCpowaaaa\t0\t20\t74
43\tBeng Luis\tDennemont78\t0\t19\t69
44\tZoulou Kenn\tDennemont78\t0\t17\t64
45\tSombrero Pedro\tDennemont78\t0\t20\t58
46\tCharre Vassili\tDennemont78\t0\t20\t53
47\tMeca Timothy\tFuzion\t0\t18\t51
48\tBoogerd Michael\tUltinam Besac Cycling\t0\t17\t48
49\tDa conceicao Thiebault\tFuzion\t0\t18\t45
50\tHealy Fritz\tFuzion\t0\t20\t36
51\tPicollet Bertrand\tOytak\t0\t18\t35
52\tHallyday Roberto\tOytak\t0\t18\t34
53\tGonzales Bryan\tOytak\t0\t17\t33
54\tPiebel Maike\tla pédale guyanaise\t0\t18\t28
55\tRoberton Antonin\tDennemont78\t0\t19\t26
56\tSamochin Jeremie\tDennemont78\t0\t21\t25
57\tTaillard Kenn\tDennemont78\t0\t18\t25
58\tJorgensen Alessio\tFuzion\t0\t20\t23
59\tEl Gourch Mohamed\tUltinam Besac Cycling\t0\t18\t15`;

export const BASELINE_INDIVIDUAL_RANKINGS: BaselineIndividualRankings = {
  pro: parseBaselineRanking(PRO_BASELINE_RAW),
  u25: parseBaselineRanking(U25_BASELINE_RAW),
  u21: parseBaselineRanking(U21_BASELINE_RAW),
};