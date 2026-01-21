type RdwDatasetRecord = Record<string, any>

const RDW_BASE_DATASET = 'm9d7-ebf2'
const RDW_FUEL_DATASET = '8ys7-d773'

export const normalizeRdwPlate = (value: string) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

const fetchRdwDataset = async (datasetId: string, plate: string) => {
  const url = new URL(`https://opendata.rdw.nl/resource/${datasetId}.json`)
  url.searchParams.set('$where', `kenteken='${plate}'`)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (process.env.RDW_APP_TOKEN) {
    headers['X-App-Token'] = process.env.RDW_APP_TOKEN
  }
  const response = await fetch(url.toString(), { headers })
  if (!response.ok) {
    throw new Error(`RDW lookup failed (${response.status})`)
  }
  return (await response.json()) as RdwDatasetRecord[]
}

const pickFirst = (value: any) => {
  if (Array.isArray(value)) return value[0]
  return value
}

const toNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const toStringOrNull = (value: any) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

const toYearFromDate = (value: any) => {
  const text = toStringOrNull(value)
  if (!text) return null
  const year = Number(text.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

export const getRdwData = async (plate: string) => {
  const base = await fetchRdwDataset(RDW_BASE_DATASET, plate)
  const fuel = await fetchRdwDataset(RDW_FUEL_DATASET, plate)
  return {
    base,
    fuel,
    sources: [RDW_BASE_DATASET, RDW_FUEL_DATASET]
  }
}

export const mapRdwFields = (baseRecord: RdwDatasetRecord | null, fuelRecords: RdwDatasetRecord[]) => {
  const fuelDescriptions = Array.isArray(fuelRecords)
    ? fuelRecords
        .map((record) => toStringOrNull(record.brandstof_omschrijving))
        .filter(Boolean)
    : []
  const fuelLabel = fuelDescriptions.length ? Array.from(new Set(fuelDescriptions)).join(', ') : null

  const main = baseRecord || {}
  return {
    rdwChassisNumber: toStringOrNull(main.vin || main.chassisnummer),
    rdwColor: toStringOrNull(main.eerste_kleur || main.kleur || null),
    rdwVehicleType: toStringOrNull(main.voertuigsoort),
    rdwEngineCode: toStringOrNull(main.motorcode || null),
    rdwBuildYear:
      toNumber(main.jaar_eerste_toelating) ??
      toYearFromDate(main.datum_eerste_toelating) ??
      toYearFromDate(main.datum_eerste_afgifte_nederland) ??
      null,
    rdwRegistrationDatePart1:
      toStringOrNull(main.datum_eerste_toelating) ||
      toStringOrNull(main.datum_eerste_afgifte_nederland),
    rdwOwnerSince:
      toStringOrNull(main.datum_eerste_tenaamstelling_in_nederland) ||
      toStringOrNull(main.datum_tenaamstelling),
    rdwOwnerCount: toNumber(main.aantal_houders),
    rdwApkDueDate: toStringOrNull(main.vervaldatum_apk),
    rdwOdometer: toNumber(main.tellerstand),
    rdwOdometerJudgement: toStringOrNull(main.tellerstandoordeel),
    rdwFuelType: fuelLabel || toStringOrNull(main.brandstof_omschrijving),
    rdwEmptyWeight: toNumber(main.massa_ledig_voertuig),
    rdwMaxTowWeightBraked: toNumber(main.maximale_massa_trekken_geremd),
    rdwMaxTowWeightUnbraked: toNumber(main.maximale_massa_trekken_ongeremd),
    rdwMaxMass: toNumber(main.maximale_massa_voertuig)
  }
}
