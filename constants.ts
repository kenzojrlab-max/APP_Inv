

import { AppConfig } from './types';

export const INITIAL_CONFIG: AppConfig = {
  companyName: "Electricity Development Corporation",
  companyLogo: "https://ui-avatars.com/api/?name=EDC&background=003366&color=FF6600&size=128",
  locations: [
    "ALP", "BLP", "AMB", "BMB", "AMP", "BM", "AMV","BMV", "ARE", "ARS", "EDC"
  ],
  states: [
    "Bon état", "Défectueux", "Déprécié", "En maintenance", "Retiré"
  ],
  holderPresences: [
    "Présent", "Absent", "Non applicable"
  ],
  categoriesDescriptions: {
    "AA": "Matériel de bureau",
    "BB": "Matériel bureautique",
    "CC": "Matériel informatique",
    "DD": "Mobilier de bureau",
    "EE": "Matériel et Mobilier de bureau logement du personnel",
    "FF": "Matériel de transport",
    "GG": "Autres Matériels de transport",
    "II": "Outillage agricole",
    "JJ": "Outillage industriel",
    "KK": "Matériel industriel",
    "QQ": "Autres immobilisations corporelles"
  },
  categories: {
    "AA": [
      "Agrafeuse géante", "Amplificateur micro", "Amplificateur sonore", "Aspirateur", "Autres", 
      "Cafetière", "Calculatrice électrique", "Coffre-fort", "Console", "Cuisinière", 
      "Décodeur numérique", "Enregistreur", "Frigo de chambre", "Micro (microphone)", "Micro-ondes", 
      "Perforatrice géante", "Relieuse", "Split (systèmes de climatisation)", "Ventilateur"
    ],
    "BB": [
      "Autres", "Copieur", "Destructeur de papier", "Enregistreur (dictaphone)", 
      "Fax", "Imprimantes", "Imprimantes bureautiques et multifonctions", "Massicots / machines de finition", 
      "Onduleur petit modèle bureautique", "Relieuse", "Scanners", "Scanners", "Téléphone fixe"
    ],
    "CC": [
      "Autres", "Baie de brassage", "Console jeu de lumière", "Logiciels", "Modem", 
      "Ordinateurs de bureau UC", "Ordinateurs de bureau écran", "Ordinateurs portables", "Pager system", 
      "Parasurtenseur", "Rail électrique", "Routeurs", 
      "Serveurs", "Sites internet", "Supports pour écrans", "Switch", "Système de contrôle et d'automatisation", 
      "Systèmes d'onduleurs", "Systèmes de drainage", "Table de contrôle", "Vidéoprojecteur"
    ],
    "DD": [
      "Armoire", "Armoires à dossiers suspendus", "Armoires à portes battantes ou coulissantes", "Armoires à rideaux", 
      "Autres", "Bureaux avec retour ou extensions", "Bureaux de direction", "Bureaux sans retour", "Caisson", 
      "Caissons mobiles ou fixes", "Canapés", "Chaises", "Chaises assorties", "Chaises de travail réglables", 
      "Chaises ergonomiques", "Chaises pour salle d'attente", "Chaises pour visiteurs", "Charriot", "Classeurs à tiroirs", 
      "Commodes et chiffonniers", "Fauteuils de direction", "Fauteuils ergonomiques avec accoudoirs", 
      "Fauteuils individuels pour les salons", "Fauteuils à haut dossier", "Retour bureau", "Salon", 
      "Supports pour écrans", "Table", "Tables basses", "Tables d'accueil modulaires", "Tables d'appoint", 
      "Tables de conférence", "Tables de réunion", "Tables de salle à manger", "Étagères ouvertes ou fermées"
    ],
    "EE": [
      "Armoire", "Armoires à portes battantes ou coulissantes", "Armoires pour le rangement des vêtements", 
      "Autres", "Bureaux sans retour", "Cafetière", "Caisson", "Caissons mobiles ou fixes", "Chaises", 
      "Chaises assorties", "Chaises pour salle d'attente", "Chaises pour visiteurs", "Charriot", 
      "Chauffages d'appoint", "Congélateur", "Cuisinière", "Décodeur numérique", "Extincteur", 
      "Fauteuils de direction", "Fauteuils ergonomiques avec accoudoirs", "Fauteuils individuels pour les salons", 
      "Flip chart", "Frigo de chambre", "Friteuse", "Lits simples ou doubles", "Machine à laver", 
      "Matelas associés", "Micro-ondes", "Onduleur", 
      "Réfrigérateur", "Régulateur de tension", "Salon", "Split (systèmes de climatisation)", 
      "Supports pour écrans", "Table", "Tables basses", "Tables de chevet", "Tables de conférence", 
      "Tables de réunion", "Tables de salle à manger", "Téléviseur"
    ],
    "FF": [
      "Autobus", "Autres", "Camionnettes", "Fourgonnettes", "Moto", "Tricycles motorisés", 
      "Utilitaire", "Voitures de service", "Véhicules pick-up", "minibus"
    ],
    "GG": [
      "Autres", "Chariot", "Cuve à gasoil mobile (pour transport interne du carburant)", 
      "Extracteurs de roulements si destinés manutention"
    ],
    "II": [
      "Autres", "Désherbeuses mécaniques"
    ],
    "JJ": [
      "Autres", "Caisses à outils", "Meuleuses", "Outillage mécanique (clés dynamométriques)", 
      "Postes à souder", "Scies électriques"
    ],
    "KK": [
      "Autres", "Chambre froide", "Chaudières industrielles", "Cuve à gasoil", 
      "Extracteurs de roulements", "Four professionnel", "Groupe électrogène", "Générateurs", 
      "Piano cuisinière professionnelle", "Pompes industrielles", "Pompes industrielles", 
      "Stations de pompage industrielles", "Transformateurs", "équipements d'énergie internes"
    ],
    "QQ": [
      "Autres", "Extincteur", "Paravents ou séparateurs de bureau"
    ]
  },
  customFields: [],
  coreFields: [
    { key: 'door', label: 'Porte', type: 'Texte', isVisible: true },
    { key: 'holder', label: 'Détenteur', type: 'Texte', isVisible: true },
    { key: 'description', label: 'Description', type: 'Texte Long', isVisible: true },
    { key: 'observation', label: 'Observation', type: 'Texte Long', isVisible: true },
    { key: 'photoUrl', label: 'Photo', type: 'Image', isVisible: true },
    { key: 'registrationDate', label: 'Date d\'enregistrement', type: 'Date', isVisible: true }
  ]
};