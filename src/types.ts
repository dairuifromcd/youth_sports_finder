export type Sport = 'Basketball'

export interface Club {
  id: string
  name: string
  sport: Sport
  latitude: number
  longitude: number
  address: string
  juniorProgram: boolean
  website?: string
}
