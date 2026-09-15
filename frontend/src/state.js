/**
 * DALOR SIGO-P | Estado Global Compartido
 */
export const State = {
    currentUser: null,
    authToken: null,
    exchangeRate: parseFloat(localStorage.getItem('dalor_exchange_rate')) || 842.21,
    bcvData: {
        rate: 842.21,
        date_value: '',
        source: 'BCV Oficial',
        source_tier: 'oficial_directo'
    },
    projects: [],
    materials: [],
    assets: [],
    personnel: [],
    clients: [],
    services: [],
    categories: [],
    selectedPersonnelIds: [],
    selectedVehicleIds: [],
    selectedToolIds: []
};
