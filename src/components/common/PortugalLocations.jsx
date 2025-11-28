// Distritos e Concelhos de Portugal
export const DISTRICTS_MUNICIPALITIES = {
  "Aveiro": [
    "Águeda", "Albergaria-a-Velha", "Anadia", "Arouca", "Aveiro", 
    "Castelo de Paiva", "Espinho", "Estarreja", "Ílhavo", "Mealhada",
    "Murtosa", "Oliveira de Azeméis", "Oliveira do Bairro", "Ovar", 
    "Santa Maria da Feira", "São João da Madeira", "Sever do Vouga", 
    "Vagos", "Vale de Cambra"
  ],
  "Lisboa": [
    "Alenquer", "Amadora", "Arruda dos Vinhos", "Azambuja", "Cadaval",
    "Cascais", "Lisboa", "Loures", "Lourinhã", "Mafra", "Odivelas",
    "Oeiras", "Sintra", "Sobral de Monte Agraço", "Torres Vedras", 
    "Vila Franca de Xira"
  ],
  "Porto": [
    "Amarante", "Baião", "Felgueiras", "Gondomar", "Lousada", "Maia",
    "Marco de Canaveses", "Matosinhos", "Paços de Ferreira", "Paredes",
    "Penafiel", "Porto", "Póvoa de Varzim", "Santo Tirso", "Trofa",
    "Valongo", "Vila do Conde", "Vila Nova de Gaia"
  ]
};

export const ALL_DISTRICTS = Object.keys(DISTRICTS_MUNICIPALITIES).sort();

export const getMunicipalitiesByDistrict = (district) => {
  return DISTRICTS_MUNICIPALITIES[district] || [];
};

export const getAllMunicipalities = () => {
  const all = [];
  Object.values(DISTRICTS_MUNICIPALITIES).forEach(municipalities => {
    all.push(...municipalities);
  });
  return [...new Set(all)].sort();
};