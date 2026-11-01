export type Sport = 'Basketball'

export interface ViewportBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface Club {
  id: string
  name: string
  sport: Sport
  latitude: number
  longitude: number
  address?: string
  juniorProgram: boolean | null
  website?: string
}
