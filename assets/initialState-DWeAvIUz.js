function e(e){let t=e.replace(/[^\d-]/g,``);return t?Number.parseInt(t,10):0}function t(e){return new Intl.NumberFormat(`fr-FR`).format(e)}function n(e){return new Intl.NumberFormat(`fr-FR`,{style:`currency`,currency:`EUR`,maximumFractionDigits:0}).format(e)}var r={Equipe:`currentTeam`,Valeur:`value`,Salaire:`salaryWeekly`,Nationalité:`nationality`,Age:`age`,Forme:`form`,Blessure:`injury`,Catégorie:`category`,Endurance:`endurance`,Résistance:`resistance`,Récupération:`recovery`,Plaine:`flat`,Vallon:`hill`,Sprint:`sprint`,Pavé:`cobble`,Agilité:`agility`,Baroudeur:`breakaway`,Montagne:`mountain`,Descente:`downhill`,"Contre-la-montre":`timeTrial`,"Course à étapes":`stageRace`,Expérience:`experience`,Total:`total`};function i(e){return e.normalize(`NFD`).replace(/[\u0300-\u036f]/g,``).toLowerCase().replace(/[^a-z0-9]+/g,`-`).replace(/^-+|-+$/g,``)}function a(e){return e.replace(/\s*-\s*Informations générales\s*$/i,``).trim()}function o(e){let t=a(e);return{id:i(t),name:t,currentTeam:``,value:0,salaryWeekly:0,nationality:``,ageYears:0,ageWeeks:0,form:0,injury:``,category:`Pro`,endurance:0,resistance:0,recovery:0,flat:0,hill:0,sprint:0,cobble:0,agility:0,breakaway:0,mountain:0,downhill:0,timeTrial:0,stageRace:0,experience:0,total:0,updatedAt:new Date().toISOString()}}function s(e){let t=e.match(/(\d+)\s+ans?\s+(\d+)\s+semaines?/i);return t?{ageYears:Number.parseInt(t[1],10),ageWeeks:Number.parseInt(t[2],10)}:{ageYears:0,ageWeeks:0}}function c(e){return e.includes(`U21`)?`U21`:e.includes(`U25`)?`U25`:`Pro`}function l(e){return!(!e.trim()||e.includes(`	`)||Object.keys(r).some(t=>e.startsWith(t))||/^Informations générales$/i.test(e.trim()))}function u(e){let t=e.replace(/\r/g,``).split(`
`),n=[],r=[];for(let e of t){let t=e.trim();if(!t){r.length>0&&r.push(``);continue}if(l(t)&&r.length>0){n.push(r.join(`
`).trim()),r=[t];continue}r.push(t)}return r.length>0&&n.push(r.join(`
`).trim()),n.filter(Boolean)}function d(e){let t=e.replace(/\r/g,``).split(`
`).map(e=>e.trim()).filter(Boolean),n=[];for(let e of t){if(l(e)){n.push([`__NAME__`,e]);continue}let t=e.split(`	`).map(e=>e.trim()).filter(Boolean);if(t.length>=2){for(let e=0;e<t.length;e+=2){let r=t[e],i=t[e+1];r&&i&&n.push([r,i])}continue}let r=e.match(/^(Valeur|Salaire|Nationalité|Age|Forme|Blessure|Catégorie|Endurance|Résistance|Récupération|Plaine|Vallon|Sprint|Pavé|Agilité|Baroudeur|Montagne|Descente|Contre-la-montre|Course à étapes|Expérience|Total)\s+(.+)$/);r&&n.push([r[1],r[2].trim()])}return n}function f(t,n){let i=d(t),a=i.find(([e])=>e===`__NAME__`);if(!a)return null;let l=o(a[1]);for(let[t,n]of i){if(t===`__NAME__`)continue;let i=r[t];if(i){if(i===`age`){let e=s(n);l.ageYears=e.ageYears,l.ageWeeks=e.ageWeeks;continue}if(i===`category`){l.category=c(n);continue}if(i===`currentTeam`||i===`nationality`||i===`injury`){l[i]=n;continue}if(i===`value`||i===`salaryWeekly`){l[i]=e(n);continue}i===`name`||i===`ignore`||(l[i]=e(n))}}return l.updatedAt=new Date().toISOString(),l.id||=`rider-${n+1}`,l}function p(e){let t=e.trim();if(!t)return{riders:[],errors:[`Le texte collé est vide.`]};let n=u(t),r=[],i=[];return n.forEach((e,t)=>{let n=f(e,t);if(!n){i.push(`Bloc ${t+1} ignoré : nom de coureur introuvable.`);return}r.push(n)}),{riders:r,errors:i}}function m(e,t){let n=new Map;for(let t of e)n.set(t.id,t);for(let e of t)n.set(e.id,e);return Array.from(n.values()).sort((e,t)=>e.name.localeCompare(t.name,`fr`))}var h=p(`
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
`).riders;export{t as a,n as i,m as n,e as o,p as r,h as t};