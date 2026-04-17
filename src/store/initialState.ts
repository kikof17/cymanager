import type { Rider } from "../types/rider";
import { parseRosterText } from "../lib/parser/rosterParser";

const defaultRosterRaw = `
Biassani Meriem
Valeur	793 014€
Salaire	12 117 € par semaine
Nationalité	France France
Age	28 ans 5 semaines
Forme	100
Blessure	Aucune
Catégorie	Pro
Endurance	73	Résistance	83	Récupération	74
Plaine	72	Vallon	68	Sprint	68
Pavé	69	Agilité	67	Baroudeur	70
Montagne	66	Descente	65	Contre-la-montre	61
Course à étapes	60	Expérience	31	Total	927

Duboe Ziad
Valeur	1 087 631€
Salaire	48 880 € par semaine
Nationalité	France France
Age	31 ans 1 semaine
Forme	100
Blessure	Aucune
Catégorie	Pro
Endurance	75	Résistance	79	Récupération	88
Plaine	79	Vallon	88	Sprint	74
Pavé	28	Agilité	46	Baroudeur	69
Montagne	86	Descente	61	Contre-la-montre	81
Course à étapes	69	Expérience	47	Total	970

Haar Nikolaus
Valeur	142 041€
Salaire	2 151 € par semaine
Nationalité	France France
Age	19 ans 10 semaines
Forme	100
Blessure	Aucune
Catégorie	U21
Endurance	54	Résistance	62	Récupération	54
Plaine	54	Vallon	51	Sprint	50
Pavé	51	Agilité	37	Baroudeur	46
Montagne	48	Descente	44	Contre-la-montre	49
Course à étapes	51	Expérience	3	Total	654

Léon Daniel
Valeur	385 657€
Salaire	8 872 € par semaine
Nationalité	France France
Age	24 ans 2 semaines
Forme	100
Blessure	Aucune
Catégorie	U25
Endurance	67	Résistance	67	Récupération	70
Plaine	67	Vallon	63	Sprint	71
Pavé	38	Agilité	64	Baroudeur	58
Montagne	65	Descente	50	Contre-la-montre	63
Course à étapes	56	Expérience	7	Total	806

Morales Marcos
Valeur	546 885€
Salaire	10 284 € par semaine
Nationalité	France France
Age	26 ans 3 semaines
Forme	100
Blessure	Aucune
Catégorie	Pro
Endurance	70	Résistance	70	Récupération	72
Plaine	68	Vallon	62	Sprint	73
Pavé	39	Agilité	68	Baroudeur	59
Montagne	67	Descente	54	Contre-la-montre	63
Course à étapes	65	Expérience	22	Total	852

Nagy Yann
Valeur	806 823€
Salaire	14 701 € par semaine
Nationalité	France France
Age	28 ans 7 semaines
Forme	100
Blessure	Aucune
Catégorie	Pro
Endurance	75	Résistance	72	Récupération	80
Plaine	65	Vallon	69	Sprint	71
Pavé	41	Agilité	70	Baroudeur	64
Montagne	75	Descente	62	Contre-la-montre	75
Course à étapes	64	Expérience	38	Total	921

Teles Benjamin
Valeur	384 488€
Salaire	8 745 € par semaine
Nationalité	France France
Age	22 ans 3 semaines
Forme	100
Blessure	Aucune
Catégorie	U25
Endurance	67	Résistance	73	Récupération	64
Plaine	69	Vallon	63	Sprint	58
Pavé	65	Agilité	53	Baroudeur	55
Montagne	63	Descente	47	Contre-la-montre	54
Course à étapes	62	Expérience	8	Total	801

Tiget Ziad
Valeur	537 964€
Salaire	11 369 € par semaine
Nationalité	France France
Age	26 ans 5 semaines
Forme	100
Blessure	Aucune
Catégorie	Pro
Endurance	72	Résistance	71	Récupération	73
Plaine	71	Vallon	70	Sprint	73
Pavé	38	Agilité	66	Baroudeur	59
Montagne	68	Descente	45	Contre-la-montre	68
Course à étapes	59	Expérience	21	Total	854

Tufo Morris
Valeur	682 680€
Salaire	18 741 € par semaine
Nationalité	France France
Age	30 ans 4 semaines
Forme	100
Blessure	Aucune
Catégorie	Pro
Endurance	77	Résistance	79	Récupération	64
Plaine	73	Vallon	76	Sprint	80
Pavé	36	Agilité	72	Baroudeur	65
Montagne	58	Descente	50	Contre-la-montre	67
Course à étapes	73	Expérience	55	Total	925

Tuquet Jens
Valeur	177 355€
Salaire	4 211 € par semaine
Nationalité	France France
Age	20 ans 6 semaines
Forme	100
Blessure	Aucune
Catégorie	U21
Endurance	59	Résistance	66	Récupération	60
Plaine	57	Vallon	62	Sprint	58
Pavé	30	Agilité	43	Baroudeur	49
Montagne	55	Descente	42	Contre-la-montre	50
Course à étapes	50	Expérience	7	Total	688
`;

export const initialRiders: Rider[] = parseRosterText(defaultRosterRaw).riders;