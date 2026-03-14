
const delay = (ms) => new Promise(res => setTimeout(res, ms))

export async function getCompanySetup() {
  await delay(250)
  return {
    companyInfo: {
      companyName: 'Be Souhola',
      industry: 'Real Estate',
      address: '123 Example St, Cairo',
      phone: '+20 111 222 3333',
      logoUrl: '',
    },
    subscription: {
      plan: 'Pro',
      features: ['settings', 'leads', 'clients', 'deals', 'reservations', 'contracts', 'operations', 'matching', 'billing', 'reports', 'notifications', 'integrations'],
    },
    enabledModules: ['settings', 'leads', 'clients', 'deals', 'reservations', 'contracts', 'operations', 'matching', 'billing', 'reports', 'notifications', 'integrations'],
    departments: [
      { id: 'dept-sales', name: 'Sales', role: 'Sales', users: 12 },
      { id: 'dept-ops', name: 'Operations', role: 'Ops', users: 9 },
      { id: 'dept-fin', name: 'Finance', role: 'Finance', users: 5 },
    ],
    visibility: {
      Sales: ['settings', 'leads', 'deals', 'reports'],
      Operations: ['settings', 'contracts', 'matching', 'reservations', 'operations'],
      Finance: ['settings', 'billing', 'contracts', 'reports'],
    },
  }
}

export async function saveCompanyInfo(payload) {
  await delay(200)
  return { status: 200, data: { ok: true, companyInfo: payload } }
}

export async function saveModules(mods) {
  await delay(200)
  return { status: 200, data: { ok: true, enabledModules: mods } }
}

export async function saveDepartments(depts) {
  await delay(200)
  return { status: 200, data: { ok: true, departments: depts } }
}

export async function saveVisibility(visibility) {
  await delay(200)
  return { status: 200, data: { ok: true, visibility } }
}