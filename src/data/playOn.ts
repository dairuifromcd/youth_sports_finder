import validated from '../../data/benchmarks/qld-geocoder/stage-b/validated.json'
import { adaptPlayOnDataset } from '../playOnProviders'

function loadPilot() {
  try {
    return { dataset: adaptPlayOnDataset(validated), error: undefined }
  } catch {
    return { dataset: undefined, error: 'The fixed Play On pilot dataset is invalid. Provider results cannot be displayed. Please report this data error.' }
  }
}

export const playOnPilot = loadPilot()
