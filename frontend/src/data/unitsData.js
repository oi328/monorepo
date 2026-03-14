export const unitsData = {
  'Nile Tower Residences': [
    { unitNo: 'A-101', price: 5000000, type: 'Apartment', area: 150 },
    { unitNo: 'A-102', price: 5200000, type: 'Apartment', area: 155 },
    { unitNo: 'B-201', price: 6000000, type: 'Duplex', area: 200 },
    { unitNo: 'C-305', price: 4500000, type: 'Apartment', area: 130 },
  ],
  'Nasr City Medical Hub': [
    { unitNo: 'C-101', price: 1500000, type: 'Clinic', area: 40 },
    { unitNo: 'C-102', price: 1800000, type: 'Clinic', area: 50 },
    { unitNo: 'L-205', price: 3000000, type: 'Lab', area: 80 },
  ],
  'River Walk': [
    { unitNo: 'RW-10', price: 8000000, type: 'Apartment', area: 180 },
    { unitNo: 'RW-22', price: 9500000, type: 'Penthouse', area: 250 },
  ],
  'Capital Business Hub': [
    { unitNo: 'OFF-303', price: 2500000, type: 'Office', area: 60 },
    { unitNo: 'RET-001', price: 5500000, type: 'Retail', area: 100 },
  ],
  'Palm Hills Extension': [
    { unitNo: 'PH-101', price: 6000000, type: 'Apartment', area: 160 },
    { unitNo: 'PH-102', price: 6200000, type: 'Apartment', area: 165 },
  ],
  'Sky Mall': [
    { unitNo: 'SK-01', price: 4000000, type: 'Shop', area: 70 },
  ]
};

// Helper to get units for a project
export const getUnitsForProject = (projectName) => {
  return unitsData[projectName] || [];
};
